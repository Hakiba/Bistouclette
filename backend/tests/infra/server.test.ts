import '../../src/infra/load-env'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, test } from 'node:test'
import type { FastifyInstance } from 'fastify'
import { buildServer } from '../../server'
import Database from '../../src/drivers/mysql/mysql'
import { galleryUseCases } from '../../src/infra/composition/gallery-use-cases'
import { multipart } from './fakes/multipart'

// Test d'intégration du serveur réel (buildServer) : vraie base (backend/.env), dossier d'upload
// temporaire. Sans MySQL, il s'ignore, comme les autres. Les tables des utilisateurs viennent de
// migrations hors de cette appli : on ne teste donc ici que ce qui n'exige pas de compte.
const skip = !process.env.MYSQL_DB_NAME && 'aucune base MySQL configurée'
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00])

let dir = ''
let app: FastifyInstance
const createdAlbumIds: number[] = []

before(async () => {
  if (skip) return
  dir = await mkdtemp(join(tmpdir(), 'bistouclette-server-'))
  process.env.UPLOAD_DIR = dir
  process.env.NODE_ENV = 'test'
  app = await buildServer()
})

after(async () => {
  if (skip) return
  await app.close()
  for (const id of createdAlbumIds) {
    await Database.rawQuery('DELETE FROM gallery_albums WHERE id = ?', [id])
  }
  await Database.close()
  await rm(dir, { recursive: true, force: true })
})

test('la galerie est publique en lecture : liste, album et photo servie', { skip }, async () => {
  const gallery = await galleryUseCases()
  const album = await gallery.createAlbum.execute({ section: 'five', title: 'Serveur réel' })
  createdAlbumIds.push(album.id)
  const photo = await gallery.addPhoto.execute({ albumId: album.id, content: PNG, uploadedBy: 1 })

  const list = await app.inject({ method: 'GET', url: '/api/gallery/five' })
  const opened = await app.inject({ method: 'GET', url: `/api/gallery/albums/${album.id}` })
  const url = opened.json().album.photos[0].url
  const file = await app.inject({ method: 'GET', url })

  assert.equal(list.statusCode, 200)
  assert.ok(list.json().albums.some((item: { id: number }) => item.id === album.id))
  assert.equal(opened.statusCode, 200)
  assert.equal(url, `/uploads/${photo.filename}`)
  assert.equal(file.statusCode, 200)
  assert.equal(file.headers['content-type'], 'image/png')
  assert.deepEqual(file.rawPayload, PNG)
})

test('les routes admin existent et exigent une authentification', { skip }, async () => {
  const form = multipart([
    { name: 'file', filename: 'p.png', content: PNG, contentType: 'image/png' },
  ])
  const calls = [
    { method: 'POST', url: '/api/admin/gallery/albums', payload: { section: 'velo', title: 'X' } },
    { method: 'PUT', url: '/api/admin/gallery/albums/1', payload: { title: 'X' } },
    { method: 'DELETE', url: '/api/admin/gallery/albums/1' },
    {
      method: 'POST',
      url: '/api/admin/gallery/albums/1/photos',
      payload: form.payload,
      headers: { 'content-type': form.contentType },
    },
    { method: 'DELETE', url: '/api/admin/gallery/photos/1' },
  ] as const

  for (const call of calls) {
    const response = await app.inject(call)

    assert.equal(response.statusCode, 401, `${call.method} ${call.url}`)
    assert.equal(response.json().code, 'NOT_AUTHENTICATED')
  }
})

test('un fichier absent de /uploads/ renvoie 404', { skip }, async () => {
  const response = await app.inject({ method: 'GET', url: '/uploads/absent.png' })

  assert.equal(response.statusCode, 404)
})
