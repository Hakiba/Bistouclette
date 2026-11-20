import assert from 'node:assert/strict'
import test from 'node:test'
import { DeletePhoto } from '../../src/application/use-cases/delete-photo.use-case'
import { InMemoryFileStorage } from './fakes/in-memory-file-storage'
import { InMemoryGalleryRepository } from './fakes/in-memory-gallery-repository'

async function setup() {
  const repository = new InMemoryGalleryRepository()
  const storage = new InMemoryFileStorage()
  const album = await repository.createAlbum({ section: 'velo', title: 'Ventoux' })
  const photo = await repository.addPhoto({
    albumId: album.id,
    filename: 'abc.jpg',
    uploadedBy: 7,
  })
  storage.files.push('abc.jpg')
  return { repository, storage, photo, useCase: new DeletePhoto(repository, storage) }
}

test('supprime la ligne en base puis le fichier', async () => {
  const { repository, storage, photo, useCase } = await setup()

  await useCase.execute(photo.id)

  assert.equal(repository.photos.length, 0)
  assert.deepEqual(storage.files, [])
})

test('accepte un identifiant fourni en texte, comme dans une URL', async () => {
  const { repository, storage, photo, useCase } = await setup()

  await useCase.execute(String(photo.id))

  assert.equal(repository.photos.length, 0)
  assert.deepEqual(storage.files, [])
})

test('refuse une photo inconnue sans toucher aux fichiers', async () => {
  const { repository, storage, useCase } = await setup()

  await assert.rejects(useCase.execute(999), { code: 'PHOTO_NOT_FOUND', status: 404 })
  assert.equal(repository.photos.length, 1)
  assert.deepEqual(storage.files, ['abc.jpg'])
})

test('refuse un identifiant de photo invalide', async () => {
  const { storage, useCase } = await setup()

  for (const id of ['abc', '', undefined, 1.5]) {
    await assert.rejects(useCase.execute(id), { code: 'PHOTO_NOT_FOUND', status: 404 })
  }
  assert.deepEqual(storage.files, ['abc.jpg'])
})

test('garde le fichier si la suppression en base échoue', async () => {
  const { repository, storage, photo, useCase } = await setup()
  repository.failOnDeletePhoto = true

  await assert.rejects(useCase.execute(photo.id), { message: 'base indisponible' })
  assert.deepEqual(storage.files, ['abc.jpg'])
})

test('réussit même si le fichier ne peut pas être retiré du disque', async (t) => {
  const { repository, storage, photo, useCase } = await setup()
  storage.failOnRemove = true
  t.mock.method(console, 'error', () => {})

  await useCase.execute(photo.id)

  assert.equal(repository.photos.length, 0)
})
