import assert from 'node:assert/strict'
import test from 'node:test'
import { CreateAlbum } from '../../src/application/use-cases/create-album.use-case'
import { InMemoryGalleryRepository } from './fakes/in-memory-gallery-repository'

test('crée un album avec un titre nettoyé et sa section', async () => {
  const repository = new InMemoryGalleryRepository()

  const album = await new CreateAlbum(repository).execute({ section: 'velo', title: '  Ventoux ' })

  assert.equal(album.title, 'Ventoux')
  assert.equal(album.section, 'velo')
  assert.equal(repository.albums.length, 1)
})

test('refuse un titre vide sans rien enregistrer', async () => {
  const repository = new InMemoryGalleryRepository()

  await assert.rejects(new CreateAlbum(repository).execute({ section: 'five', title: ' ' }), {
    code: 'ALBUM_TITLE_REQUIRED',
  })
  assert.equal(repository.albums.length, 0)
})

test('refuse une section inconnue sans rien enregistrer', async () => {
  const repository = new InMemoryGalleryRepository()

  await assert.rejects(new CreateAlbum(repository).execute({ section: 'foot', title: 'Finale' }), {
    code: 'ALBUM_SECTION_INVALID',
  })
  assert.equal(repository.albums.length, 0)
})
