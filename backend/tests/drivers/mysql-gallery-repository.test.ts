import '../../src/infra/load-env'
import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import Database from '../../src/drivers/mysql/mysql'
import ensureGallerySchema from '../../src/drivers/gallery/gallery-schema'
import { MySqlGalleryRepository } from '../../src/drivers/gallery/mysql-gallery-repository'

// Test d'intégration : il a besoin d'une vraie base (backend/.env). La CI n'en a pas, il s'ignore.
const skip = !process.env.MYSQL_DB_NAME && 'aucune base MySQL configurée'

const repository = new MySqlGalleryRepository()
const createdAlbumIds: number[] = []

async function createAlbum(title = 'Test intégration') {
  const album = await repository.createAlbum({ section: 'velo', title })
  createdAlbumIds.push(album.id)
  return album
}

before(async () => {
  if (!skip) await ensureGallerySchema()
})

// Les photos disparaissent avec leur album (ON DELETE CASCADE).
after(async () => {
  if (skip) return
  for (const id of createdAlbumIds) {
    await Database.rawQuery('DELETE FROM gallery_albums WHERE id = ?', [id])
  }
  await Database.close()
})

test('crée un album et le relit avec ses valeurs par défaut', { skip }, async () => {
  const album = await createAlbum('Ventoux')

  assert.ok(album.id > 0)
  assert.equal(album.title, 'Ventoux')
  assert.equal(album.section, 'velo')
  assert.equal(album.coverPhotoId, null)
  assert.ok(album.createdAt instanceof Date)
  assert.deepEqual(await repository.findAlbum(album.id), album)
})

test('findAlbum renvoie null pour un album inconnu', { skip }, async () => {
  assert.equal(await repository.findAlbum(2_000_000_000), null)
})

test('ajoute une photo à un album', { skip }, async () => {
  const album = await createAlbum()

  const photo = await repository.addPhoto({
    albumId: album.id,
    filename: 'abc.jpg',
    uploadedBy: 7,
  })

  assert.ok(photo.id > 0)
  assert.equal(photo.albumId, album.id)
  assert.equal(photo.filename, 'abc.jpg')
  assert.equal(photo.caption, '')
  assert.equal(photo.uploadedBy, 7)
})

test('supprimer un album supprime ses photos en cascade', { skip }, async () => {
  const album = await createAlbum()
  const photo = await repository.addPhoto({
    albumId: album.id,
    filename: 'x.png',
    uploadedBy: null,
  })

  await Database.rawQuery('DELETE FROM gallery_albums WHERE id = ?', [album.id])

  const [remaining] = (await Database.rawQuery('SELECT id FROM gallery_photos WHERE id = ?', [
    photo.id,
  ])) as [unknown[]]
  assert.equal(remaining.length, 0)
})
