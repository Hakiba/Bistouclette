import assert from 'node:assert/strict'
import test from 'node:test'
import { ListAlbums } from '../../src/application/use-cases/list-albums.use-case'
import { InMemoryGalleryRepository } from './fakes/in-memory-gallery-repository'

test('ne renvoie que les albums de la section demandée', async () => {
  const repository = new InMemoryGalleryRepository()
  await repository.createAlbum({ section: 'velo', title: 'Ventoux' })
  await repository.createAlbum({ section: 'five', title: 'Finale' })

  const albums = await new ListAlbums(repository).execute('velo')

  assert.deepEqual(
    albums.map((album) => album.title),
    ['Ventoux']
  )
})

test('renvoie les albums du plus récent au plus ancien', async () => {
  const repository = new InMemoryGalleryRepository()
  await repository.createAlbum({ section: 'velo', title: 'Ancien' })
  await repository.createAlbum({ section: 'velo', title: 'Récent' })

  const albums = await new ListAlbums(repository).execute('velo')

  assert.deepEqual(
    albums.map((album) => album.title),
    ['Récent', 'Ancien']
  )
})

test('indique le nombre de photos et la couverture de chaque album', async () => {
  const repository = new InMemoryGalleryRepository()
  const album = await repository.createAlbum({ section: 'velo', title: 'Ventoux' })
  await repository.createAlbum({ section: 'velo', title: 'Vide' })
  await repository.addPhoto({ albumId: album.id, filename: 'a.jpg', uploadedBy: 1 })
  await repository.addPhoto({ albumId: album.id, filename: 'b.jpg', uploadedBy: 1 })

  const [vide, ventoux] = await new ListAlbums(repository).execute('velo')

  assert.equal(ventoux.photoCount, 2)
  assert.equal(ventoux.coverFilename, 'a.jpg')
  assert.equal(vide.photoCount, 0)
  assert.equal(vide.coverFilename, null)
})

test('refuse une section inconnue', async () => {
  const repository = new InMemoryGalleryRepository()

  await assert.rejects(new ListAlbums(repository).execute('foot'), {
    code: 'ALBUM_SECTION_INVALID',
  })
})
