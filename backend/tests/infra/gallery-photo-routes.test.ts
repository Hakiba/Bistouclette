import assert from 'node:assert/strict'
import test from 'node:test'
import multipartPlugin from '@fastify/multipart'
import Fastify from 'fastify'
import { registerGalleryRoutes } from '../../src/infra/http/gallery-routes'
import { inMemoryGalleryUseCases } from '../application/fakes/in-memory-gallery-use-cases'
import { ADMIN, ADMIN_USER, PLAYER, fakeGuards } from './fakes/fake-guards'
import { multipart } from './fakes/multipart'

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00])
const MAX_BYTES = 1024

async function setup() {
  const { repository, storage, useCases } = inMemoryGalleryUseCases()
  const app = Fastify()
  // Même réglage que server.ts, avec une limite minuscule pour tester le 413.
  await app.register(multipartPlugin, { limits: { fileSize: MAX_BYTES, files: 1 } })
  await registerGalleryRoutes(app, async () => useCases, fakeGuards)

  const album = await repository.createAlbum({ section: 'velo', title: 'Ventoux' })
  const photo = await repository.addPhoto({ albumId: album.id, filename: 'a.jpg', uploadedBy: 7 })
  storage.files.push('a.jpg')
  return { app, repository, storage, album, photo }
}

function upload(content: Buffer, filename = 'photo.png', contentType = 'image/png') {
  const { payload, contentType: header } = multipart([
    { name: 'file', filename, content, contentType },
  ])
  return { payload, headers: { ...ADMIN, 'content-type': header } }
}

test('POST envoie la photo : fichier stocké, ligne en base, auteur et URL publique', async () => {
  const { app, repository, storage, album } = await setup()

  const response = await app.inject({
    method: 'POST',
    url: `/api/admin/gallery/albums/${album.id}/photos`,
    ...upload(PNG),
  })

  assert.equal(response.statusCode, 201)
  const { message, photo } = response.json()
  assert.equal(message, 'Photo ajoutée.')
  assert.match(photo.url, /^\/uploads\/.+\.png$/)
  const stored = repository.photos.find((item) => item.id === photo.id)
  assert.equal(stored?.albumId, album.id)
  assert.equal(stored?.uploadedBy, ADMIN_USER.id)
  assert.ok(storage.files.includes(stored!.filename))
})

test('POST refuse un album inconnu (404) ou un fichier qui n’est pas une image (415)', async () => {
  const { app, repository, storage, album } = await setup()

  const unknown = await app.inject({
    method: 'POST',
    url: '/api/admin/gallery/albums/999/photos',
    ...upload(PNG),
  })
  const notImage = await app.inject({
    method: 'POST',
    url: `/api/admin/gallery/albums/${album.id}/photos`,
    ...upload(Buffer.from('ceci n’est pas une image'), 'note.txt', 'text/plain'),
  })

  assert.equal(unknown.statusCode, 404)
  assert.equal(unknown.json().code, 'ALBUM_NOT_FOUND')
  assert.equal(notImage.statusCode, 415)
  assert.equal(notImage.json().code, 'IMAGE_INVALID')
  assert.equal(repository.photos.length, 1)
  assert.deepEqual(storage.files, ['a.jpg'])
})

test('POST refuse un fichier trop gros avec 413', async () => {
  const { app, repository, storage, album } = await setup()
  const tooBig = Buffer.concat([PNG, Buffer.alloc(MAX_BYTES * 2)])

  const response = await app.inject({
    method: 'POST',
    url: `/api/admin/gallery/albums/${album.id}/photos`,
    ...upload(tooBig),
  })

  assert.equal(response.statusCode, 413)
  assert.equal(response.json().code, 'FILE_TOO_LARGE')
  assert.equal(typeof response.json().message, 'string')
  assert.equal(repository.photos.length, 1)
  assert.deepEqual(storage.files, ['a.jpg'])
})

test('POST sans fichier, ou sans multipart, renvoie 400 FILE_REQUIRED', async () => {
  const { app, album } = await setup()
  const fieldOnly = multipart([{ name: 'note', value: 'pas de fichier' }])

  const noFile = await app.inject({
    method: 'POST',
    url: `/api/admin/gallery/albums/${album.id}/photos`,
    payload: fieldOnly.payload,
    headers: { ...ADMIN, 'content-type': fieldOnly.contentType },
  })
  const notMultipart = await app.inject({
    method: 'POST',
    url: `/api/admin/gallery/albums/${album.id}/photos`,
    headers: ADMIN,
    payload: { file: 'abc' },
  })

  assert.equal(noFile.statusCode, 400)
  assert.equal(noFile.json().code, 'FILE_REQUIRED')
  assert.equal(notMultipart.statusCode, 400)
  assert.equal(notMultipart.json().code, 'FILE_REQUIRED')
})

test('DELETE supprime la photo et son fichier', async () => {
  const { app, repository, storage, photo } = await setup()

  const response = await app.inject({
    method: 'DELETE',
    url: `/api/admin/gallery/photos/${photo.id}`,
    headers: ADMIN,
  })

  assert.equal(response.statusCode, 200)
  assert.equal(response.json().message, 'Photo supprimée.')
  assert.equal(repository.photos.length, 0)
  assert.deepEqual(storage.files, [])
})

test('DELETE renvoie 404 pour une photo inconnue', async () => {
  const { app } = await setup()

  const response = await app.inject({
    method: 'DELETE',
    url: '/api/admin/gallery/photos/999',
    headers: ADMIN,
  })

  assert.equal(response.statusCode, 404)
  assert.equal(response.json().code, 'PHOTO_NOT_FOUND')
})

test('upload et suppression refusent un visiteur (401) et un joueur (403) sans rien modifier', async () => {
  const { app, repository, storage, album, photo } = await setup()
  const { payload, headers } = upload(PNG)
  const withoutAuth = { 'content-type': headers['content-type'] }
  const calls = [
    {
      method: 'POST',
      url: `/api/admin/gallery/albums/${album.id}/photos`,
      payload,
      headers: withoutAuth,
    },
    { method: 'DELETE', url: `/api/admin/gallery/photos/${photo.id}`, headers: {} },
  ] as const

  for (const call of calls) {
    const visitor = await app.inject(call)
    const player = await app.inject({ ...call, headers: { ...call.headers, ...PLAYER } })

    assert.equal(visitor.statusCode, 401, `${call.method} visiteur`)
    assert.equal(player.statusCode, 403, `${call.method} joueur`)
  }
  assert.equal(repository.photos.length, 1)
  assert.deepEqual(storage.files, ['a.jpg'])
})
