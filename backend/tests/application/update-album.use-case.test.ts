import assert from 'node:assert/strict'
import test from 'node:test'
import { UpdateAlbum } from '../../src/application/use-cases/update-album.use-case'
import { InMemoryGalleryRepository } from './fakes/in-memory-gallery-repository'

async function setup() {
  const repository = new InMemoryGalleryRepository()
  const album = await repository.createAlbum({ section: 'velo', title: 'Ventoux' })
  const other = await repository.createAlbum({ section: 'five', title: 'Finale' })
  const photo = await repository.addPhoto({ albumId: album.id, filename: 'a.jpg', uploadedBy: 7 })
  const foreign = await repository.addPhoto({ albumId: other.id, filename: 'b.jpg', uploadedBy: 7 })
  return { repository, album, photo, foreign, useCase: new UpdateAlbum(repository) }
}

test('renomme un album en nettoyant les espaces', async () => {
  const { album, useCase } = await setup()

  const updated = await useCase.execute(album.id, { title: '  Tour du Mont Blanc  ' })

  assert.equal(updated.title, 'Tour du Mont Blanc')
  assert.equal(updated.coverPhotoId, null)
})

test('choisit la couverture parmi les photos de l’album', async () => {
  const { album, photo, useCase } = await setup()

  const updated = await useCase.execute(album.id, { coverPhotoId: photo.id })

  assert.equal(updated.coverPhotoId, photo.id)
  assert.equal(updated.title, 'Ventoux')
})

test('accepte un identifiant de photo en texte', async () => {
  const { album, photo, useCase } = await setup()

  const updated = await useCase.execute(album.id, { coverPhotoId: String(photo.id) })

  assert.equal(updated.coverPhotoId, photo.id)
})

test('null remet la couverture par défaut', async () => {
  const { album, photo, useCase } = await setup()
  await useCase.execute(album.id, { coverPhotoId: photo.id })

  const updated = await useCase.execute(album.id, { coverPhotoId: null })

  assert.equal(updated.coverPhotoId, null)
})

test('modifie titre et couverture ensemble', async () => {
  const { album, photo, useCase } = await setup()

  const updated = await useCase.execute(album.id, { title: 'Nouveau', coverPhotoId: photo.id })

  assert.equal(updated.title, 'Nouveau')
  assert.equal(updated.coverPhotoId, photo.id)
})

test('refuse une couverture qui n’appartient pas à l’album ou qui n’existe pas', async () => {
  const { album, foreign, useCase } = await setup()

  for (const coverPhotoId of [foreign.id, 999, 'abc', 1.5]) {
    await assert.rejects(useCase.execute(album.id, { coverPhotoId }), {
      code: 'COVER_PHOTO_INVALID',
      status: 400,
    })
  }
})

test('refuse un titre invalide', async () => {
  const { album, useCase } = await setup()

  await assert.rejects(useCase.execute(album.id, { title: '   ' }), {
    code: 'ALBUM_TITLE_REQUIRED',
  })
  await assert.rejects(useCase.execute(album.id, { title: 'x'.repeat(256) }), {
    code: 'ALBUM_TITLE_TOO_LONG',
  })
})

test('refuse une demande sans aucune modification', async () => {
  const { album, useCase } = await setup()

  await assert.rejects(useCase.execute(album.id, {}), { code: 'ALBUM_UPDATE_EMPTY', status: 400 })
})

test('refuse un album inconnu ou un identifiant invalide', async () => {
  const { useCase } = await setup()

  for (const id of [999, 'abc', '', undefined, 1.5]) {
    await assert.rejects(useCase.execute(id, { title: 'Nouveau' }), {
      code: 'ALBUM_NOT_FOUND',
      status: 404,
    })
  }
})

test('ne modifie rien si une des deux validations échoue', async () => {
  const { repository, album, foreign, useCase } = await setup()

  await assert.rejects(useCase.execute(album.id, { title: 'Nouveau', coverPhotoId: foreign.id }), {
    code: 'COVER_PHOTO_INVALID',
  })
  assert.equal((await repository.findAlbum(album.id))?.title, 'Ventoux')
})
