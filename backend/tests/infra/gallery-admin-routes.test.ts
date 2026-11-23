import assert from 'node:assert/strict'
import test from 'node:test'
import Fastify from 'fastify'
import { registerGalleryRoutes } from '../../src/infra/http/gallery-routes'
import { inMemoryGalleryUseCases } from '../application/fakes/in-memory-gallery-use-cases'
import { ADMIN, PLAYER, fakeGuards } from './fakes/fake-guards'

async function setup() {
  const { repository, storage, useCases } = inMemoryGalleryUseCases()
  const app = Fastify()
  await registerGalleryRoutes(app, async () => useCases, fakeGuards)

  const album = await repository.createAlbum({ section: 'velo', title: 'Ventoux' })
  const photo = await repository.addPhoto({ albumId: album.id, filename: 'a.jpg', uploadedBy: 7 })
  storage.files.push('a.jpg')
  return { app, repository, storage, album, photo }
}

test('POST crée un album et renvoie 201', async () => {
  const { app, repository } = await setup()

  const response = await app.inject({
    method: 'POST',
    url: '/api/admin/gallery/albums',
    headers: ADMIN,
    payload: { section: 'five', title: '  Finale 2026  ' },
  })

  assert.equal(response.statusCode, 201)
  const { album, message } = response.json()
  assert.equal(message, 'Album créé.')
  assert.equal(album.title, 'Finale 2026')
  assert.equal(album.section, 'five')
  assert.equal(album.coverPhotoId, null)
  assert.equal((await repository.findAlbum(album.id))?.title, 'Finale 2026')
})

test('POST refuse un corps invalide ou absent avec 400', async () => {
  const { app, repository } = await setup()

  const missingTitle = await app.inject({
    method: 'POST',
    url: '/api/admin/gallery/albums',
    headers: ADMIN,
    payload: { section: 'velo' },
  })
  const badSection = await app.inject({
    method: 'POST',
    url: '/api/admin/gallery/albums',
    headers: ADMIN,
    payload: { section: 'natation', title: 'Piscine' },
  })
  const noBody = await app.inject({
    method: 'POST',
    url: '/api/admin/gallery/albums',
    headers: ADMIN,
  })

  assert.equal(missingTitle.statusCode, 400)
  assert.equal(missingTitle.json().code, 'ALBUM_TITLE_REQUIRED')
  assert.equal(badSection.statusCode, 400)
  assert.equal(badSection.json().code, 'ALBUM_SECTION_INVALID')
  assert.equal(noBody.statusCode, 400)
  assert.equal(repository.albums.length, 1)
})

test('PUT renomme un album et choisit sa couverture', async () => {
  const { app, album, photo } = await setup()

  const response = await app.inject({
    method: 'PUT',
    url: `/api/admin/gallery/albums/${album.id}`,
    headers: ADMIN,
    payload: { title: 'Mont Ventoux', coverPhotoId: photo.id },
  })

  assert.equal(response.statusCode, 200)
  assert.equal(response.json().message, 'Album mis à jour.')
  assert.equal(response.json().album.title, 'Mont Ventoux')
  assert.equal(response.json().album.coverPhotoId, photo.id)
})

test('PUT sans corps, avec un album inconnu ou une couverture invalide', async () => {
  const { app, album } = await setup()

  const noBody = await app.inject({
    method: 'PUT',
    url: `/api/admin/gallery/albums/${album.id}`,
    headers: ADMIN,
  })
  const unknown = await app.inject({
    method: 'PUT',
    url: '/api/admin/gallery/albums/999',
    headers: ADMIN,
    payload: { title: 'Fantôme' },
  })
  const badCover = await app.inject({
    method: 'PUT',
    url: `/api/admin/gallery/albums/${album.id}`,
    headers: ADMIN,
    payload: { coverPhotoId: 999 },
  })

  assert.equal(noBody.statusCode, 400)
  assert.equal(noBody.json().code, 'ALBUM_UPDATE_EMPTY')
  assert.equal(unknown.statusCode, 404)
  assert.equal(unknown.json().code, 'ALBUM_NOT_FOUND')
  assert.equal(badCover.statusCode, 400)
  assert.equal(badCover.json().code, 'COVER_PHOTO_INVALID')
})

test('DELETE supprime l’album, ses photos et leurs fichiers', async () => {
  const { app, repository, storage, album } = await setup()

  const response = await app.inject({
    method: 'DELETE',
    url: `/api/admin/gallery/albums/${album.id}`,
    headers: ADMIN,
  })

  assert.equal(response.statusCode, 200)
  assert.equal(response.json().message, 'Album supprimé.')
  assert.equal(repository.albums.length, 0)
  assert.equal(repository.photos.length, 0)
  assert.deepEqual(storage.files, [])
})

test('DELETE renvoie 404 pour un album inconnu', async () => {
  const { app } = await setup()

  const response = await app.inject({
    method: 'DELETE',
    url: '/api/admin/gallery/albums/999',
    headers: ADMIN,
  })

  assert.equal(response.statusCode, 404)
  assert.equal(response.json().code, 'ALBUM_NOT_FOUND')
})

test('les routes admin refusent un visiteur (401) et un joueur (403) sans rien modifier', async () => {
  const { app, repository, storage, album } = await setup()
  const calls = [
    { method: 'POST', url: '/api/admin/gallery/albums', payload: { section: 'velo', title: 'X' } },
    { method: 'PUT', url: `/api/admin/gallery/albums/${album.id}`, payload: { title: 'X' } },
    { method: 'DELETE', url: `/api/admin/gallery/albums/${album.id}` },
  ] as const

  for (const call of calls) {
    const visitor = await app.inject(call)
    const player = await app.inject({ ...call, headers: PLAYER })

    assert.equal(visitor.statusCode, 401, `${call.method} visiteur`)
    assert.equal(visitor.json().code, 'NOT_AUTHENTICATED')
    assert.equal(player.statusCode, 403, `${call.method} joueur`)
    assert.equal(player.json().code, 'FORBIDDEN')
  }
  assert.equal(repository.albums.length, 1)
  assert.equal(repository.albums[0].title, 'Ventoux')
  assert.deepEqual(storage.files, ['a.jpg'])
})
