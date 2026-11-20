import assert from 'node:assert/strict'
import test from 'node:test'
import Fastify from 'fastify'
import { registerGalleryRoutes } from '../../src/infra/http/gallery-routes'
import { inMemoryGalleryUseCases } from '../application/fakes/in-memory-gallery-use-cases'

async function setup() {
  const { repository, useCases } = inMemoryGalleryUseCases()
  const app = Fastify()
  await registerGalleryRoutes(app, async () => useCases)

  const album = await repository.createAlbum({ section: 'velo', title: 'Ventoux' })
  const empty = await repository.createAlbum({ section: 'velo', title: 'Vide' })
  const five = await repository.createAlbum({ section: 'five', title: 'Finale' })
  const first = await repository.addPhoto({ albumId: album.id, filename: 'a.jpg', uploadedBy: 7 })
  const second = await repository.addPhoto({ albumId: album.id, filename: 'b.jpg', uploadedBy: 7 })
  await repository.addPhoto({ albumId: five.id, filename: 'c.jpg', uploadedBy: 7 })
  return { app, album, empty, five, first, second }
}

test('GET /api/gallery/:section liste les albums de la section, sans authentification', async () => {
  const { app, album, empty } = await setup()

  const response = await app.inject({ method: 'GET', url: '/api/gallery/velo' })

  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.json(), {
    albums: [
      {
        id: empty.id,
        section: 'velo',
        title: 'Vide',
        createdAt: empty.createdAt.toISOString(),
        photoCount: 0,
        coverUrl: null,
      },
      {
        id: album.id,
        section: 'velo',
        title: 'Ventoux',
        createdAt: album.createdAt.toISOString(),
        photoCount: 2,
        coverUrl: '/uploads/a.jpg',
      },
    ],
  })
})

test('GET /api/gallery/:section refuse une section inconnue', async () => {
  const { app } = await setup()

  const response = await app.inject({ method: 'GET', url: '/api/gallery/natation' })

  assert.equal(response.statusCode, 400)
  assert.equal(response.json().code, 'ALBUM_SECTION_INVALID')
  assert.equal(typeof response.json().message, 'string')
})

test('GET /api/gallery/albums/:id renvoie l’album et ses photos avec leur URL publique', async () => {
  const { app, album, first, second } = await setup()

  const response = await app.inject({ method: 'GET', url: `/api/gallery/albums/${album.id}` })

  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.json(), {
    album: {
      id: album.id,
      section: 'velo',
      title: 'Ventoux',
      createdAt: album.createdAt.toISOString(),
      coverPhotoId: null,
      photos: [
        {
          id: first.id,
          url: '/uploads/a.jpg',
          caption: '',
          createdAt: first.createdAt.toISOString(),
        },
        {
          id: second.id,
          url: '/uploads/b.jpg',
          caption: '',
          createdAt: second.createdAt.toISOString(),
        },
      ],
    },
  })
})

test('GET /api/gallery/albums/:id renvoie 404 pour un album inconnu ou un identifiant invalide', async () => {
  const { app } = await setup()

  for (const id of ['999', 'abc']) {
    const response = await app.inject({ method: 'GET', url: `/api/gallery/albums/${id}` })

    assert.equal(response.statusCode, 404)
    assert.equal(response.json().code, 'ALBUM_NOT_FOUND')
  }
})

test('une erreur inattendue donne un 500 sans détail interne', async (t) => {
  t.mock.method(console, 'error', () => {})
  const app = Fastify()
  await registerGalleryRoutes(app, async () => {
    throw new Error('mot de passe MySQL: secret')
  })

  const response = await app.inject({ method: 'GET', url: '/api/gallery/velo' })

  assert.equal(response.statusCode, 500)
  assert.equal(response.json().code, 'INTERNAL_ERROR')
  assert.ok(!response.body.includes('secret'))
})
