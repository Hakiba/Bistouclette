import assert from 'node:assert/strict'
import test from 'node:test'
import { AddPhoto } from '../../src/application/use-cases/add-photo.use-case'
import { InMemoryFileStorage } from './fakes/in-memory-file-storage'
import { InMemoryGalleryRepository } from './fakes/in-memory-gallery-repository'

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])

async function setup() {
  const repository = new InMemoryGalleryRepository()
  const storage = new InMemoryFileStorage()
  const album = await repository.createAlbum({ section: 'velo', title: 'Ventoux' })
  return { repository, storage, album, useCase: new AddPhoto(repository, storage) }
}

test('enregistre le fichier puis la photo, avec l’extension détectée', async () => {
  const { repository, storage, album, useCase } = await setup()

  const photo = await useCase.execute({ albumId: album.id, content: JPEG, uploadedBy: 7 })

  assert.equal(photo.albumId, album.id)
  assert.equal(photo.uploadedBy, 7)
  assert.match(photo.filename, /\.jpg$/)
  assert.deepEqual(storage.files, [photo.filename])
  assert.equal(repository.photos.length, 1)
})

test('refuse un album inconnu sans écrire de fichier', async () => {
  const { storage, useCase } = await setup()

  await assert.rejects(useCase.execute({ albumId: 999, content: JPEG, uploadedBy: 7 }), {
    code: 'ALBUM_NOT_FOUND',
    status: 404,
  })
  assert.deepEqual(storage.files, [])
})

test('refuse un identifiant d’album invalide sans écrire de fichier', async () => {
  const { storage, useCase } = await setup()

  for (const albumId of ['abc', '', undefined, 1.5]) {
    await assert.rejects(useCase.execute({ albumId, content: JPEG, uploadedBy: 7 }), {
      code: 'ALBUM_NOT_FOUND',
      status: 404,
    })
  }
  assert.deepEqual(storage.files, [])
})

test('refuse un fichier qui n’est pas une image autorisée, sans rien écrire', async () => {
  const { repository, storage, album, useCase } = await setup()

  await assert.rejects(
    useCase.execute({ albumId: album.id, content: Buffer.from('%PDF-1.7'), uploadedBy: 7 }),
    { code: 'IMAGE_INVALID', status: 415 }
  )
  assert.deepEqual(storage.files, [])
  assert.equal(repository.photos.length, 0)
})

test('retire le fichier du disque si l’enregistrement en base échoue', async () => {
  const { repository, storage, album, useCase } = await setup()
  repository.failOnAddPhoto = true

  await assert.rejects(useCase.execute({ albumId: album.id, content: JPEG, uploadedBy: 7 }), {
    message: 'base indisponible',
  })
  assert.deepEqual(storage.files, [])
})

test('relance l’erreur d’origine même si le retrait du fichier échoue', async (t) => {
  const { repository, storage, album, useCase } = await setup()
  repository.failOnAddPhoto = true
  storage.failOnRemove = true
  t.mock.method(console, 'error', () => {})

  await assert.rejects(useCase.execute({ albumId: album.id, content: JPEG, uploadedBy: 7 }), {
    message: 'base indisponible',
  })
})
