import assert from 'node:assert/strict'
import test from 'node:test'
import { DeleteAlbum } from '../../src/application/use-cases/delete-album.use-case'
import { InMemoryFileStorage } from './fakes/in-memory-file-storage'
import { InMemoryGalleryRepository } from './fakes/in-memory-gallery-repository'

async function setup() {
  const repository = new InMemoryGalleryRepository()
  const storage = new InMemoryFileStorage()
  const album = await repository.createAlbum({ section: 'velo', title: 'Ventoux' })
  const other = await repository.createAlbum({ section: 'five', title: 'Finale' })
  for (const [albumId, filename] of [
    [album.id, 'a.jpg'],
    [album.id, 'b.jpg'],
    [album.id, 'c.jpg'],
    [other.id, 'd.jpg'],
  ] as const) {
    await repository.addPhoto({ albumId, filename, uploadedBy: 7 })
    storage.files.push(filename)
  }
  return { repository, storage, album, other, useCase: new DeleteAlbum(repository, storage) }
}

test('supprime l’album, ses photos en base et tous ses fichiers', async () => {
  const { repository, storage, album, other, useCase } = await setup()

  await useCase.execute(album.id)

  assert.deepEqual(
    repository.albums.map((item) => item.id),
    [other.id]
  )
  assert.deepEqual(
    repository.photos.map((photo) => photo.filename),
    ['d.jpg']
  )
  assert.deepEqual(storage.files, ['d.jpg'])
})

test('accepte un identifiant fourni en texte, comme dans une URL', async () => {
  const { repository, album, useCase } = await setup()

  await useCase.execute(String(album.id))

  assert.equal(repository.albums.length, 1)
})

test('supprime un album vide', async () => {
  const { repository, storage, useCase } = await setup()
  const empty = await repository.createAlbum({ section: 'velo', title: 'Vide' })

  await useCase.execute(empty.id)

  assert.equal(repository.albums.length, 2)
  assert.equal(storage.files.length, 4)
})

test('refuse un album inconnu ou un identifiant invalide sans rien toucher', async () => {
  const { repository, storage, useCase } = await setup()

  for (const id of [999, 'abc', '', undefined, 1.5]) {
    await assert.rejects(useCase.execute(id), { code: 'ALBUM_NOT_FOUND', status: 404 })
  }
  assert.equal(repository.albums.length, 2)
  assert.equal(storage.files.length, 4)
})

test('garde les fichiers si la suppression en base échoue', async () => {
  const { repository, storage, album, useCase } = await setup()
  repository.failOnDeleteAlbum = true

  await assert.rejects(useCase.execute(album.id), { message: 'base indisponible' })
  assert.equal(storage.files.length, 4)
})

test('réussit même si des fichiers ne peuvent pas être retirés du disque', async (t) => {
  const { repository, storage, album, useCase } = await setup()
  storage.failOnRemove = true
  t.mock.method(console, 'error', () => {})

  await useCase.execute(album.id)

  assert.equal(repository.albums.length, 1)
})

test('une panne sur un fichier n’empêche pas de retirer les suivants', async (t) => {
  const { storage, album, useCase } = await setup()
  const remove = storage.remove.bind(storage)
  t.mock.method(storage, 'remove', async (filename: string) => {
    if (filename === 'a.jpg') throw new Error('disque indisponible')
    return remove(filename)
  })
  t.mock.method(console, 'error', () => {})

  await useCase.execute(album.id)

  assert.deepEqual(storage.files, ['a.jpg', 'd.jpg'])
})
