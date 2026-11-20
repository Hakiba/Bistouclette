import assert from 'node:assert/strict'
import test from 'node:test'
import { GetAlbum } from '../../src/application/use-cases/get-album.use-case'
import { InMemoryGalleryRepository } from './fakes/in-memory-gallery-repository'

async function setup() {
  const repository = new InMemoryGalleryRepository()
  const album = await repository.createAlbum({ section: 'velo', title: 'Ventoux' })
  const other = await repository.createAlbum({ section: 'five', title: 'Finale' })
  const first = await repository.addPhoto({ albumId: album.id, filename: 'a.jpg', uploadedBy: 7 })
  const second = await repository.addPhoto({ albumId: album.id, filename: 'b.jpg', uploadedBy: 7 })
  await repository.addPhoto({ albumId: other.id, filename: 'c.jpg', uploadedBy: 7 })
  return { album, first, second, useCase: new GetAlbum(repository) }
}

test('renvoie l’album avec ses seules photos', async () => {
  const { album, first, second, useCase } = await setup()

  assert.deepEqual(await useCase.execute(album.id), { ...album, photos: [first, second] })
})

test('renvoie une liste vide pour un album sans photo', async () => {
  const repository = new InMemoryGalleryRepository()
  const empty = await repository.createAlbum({ section: 'velo', title: 'Vide' })

  const result = await new GetAlbum(repository).execute(empty.id)

  assert.deepEqual(result.photos, [])
})

test('accepte un identifiant fourni en texte, comme dans une URL', async () => {
  const { album, useCase } = await setup()

  assert.equal((await useCase.execute(String(album.id))).id, album.id)
})

test('refuse un album inconnu ou un identifiant invalide', async () => {
  const { useCase } = await setup()

  for (const id of [999, 'abc', '', undefined, 1.5]) {
    await assert.rejects(useCase.execute(id), { code: 'ALBUM_NOT_FOUND', status: 404 })
  }
})
