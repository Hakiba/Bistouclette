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

async function createAlbum(title = 'Test intégration', section: 'velo' | 'five' = 'velo') {
  const album = await repository.createAlbum({ section, title })
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

test('liste les albums avec compteur et couverture, le plus récent d’abord', { skip }, async () => {
  const withPhotos = await createAlbum('Avec photos')
  const empty = await createAlbum('Vide')
  // Le plus ancien ('z.jpg') n'est pas le premier par ordre alphabétique : un MIN(filename) échouerait.
  await repository.addPhoto({ albumId: withPhotos.id, filename: 'z.jpg', uploadedBy: 1 })
  await repository.addPhoto({ albumId: withPhotos.id, filename: 'a.jpg', uploadedBy: 1 })

  const ids = [withPhotos.id, empty.id]
  const mine = (await repository.listAlbums('velo')).filter((album) => ids.includes(album.id))

  assert.deepEqual(
    mine.map((album) => album.id),
    [empty.id, withPhotos.id]
  )
  const [vide, avec] = mine
  assert.equal(avec.photoCount, 2)
  assert.equal(avec.coverFilename, 'z.jpg')
  assert.equal(vide.photoCount, 0)
  assert.equal(vide.coverFilename, null)
})

test('la photo choisie comme couverture l’emporte sur la plus ancienne', { skip }, async () => {
  const album = await createAlbum()
  await repository.addPhoto({ albumId: album.id, filename: 'a.jpg', uploadedBy: 1 })
  const chosen = await repository.addPhoto({ albumId: album.id, filename: 'b.jpg', uploadedBy: 1 })
  await Database.rawQuery('UPDATE gallery_albums SET cover_photo_id = ? WHERE id = ?', [
    chosen.id,
    album.id,
  ])

  const found = (await repository.listAlbums('velo')).find((item) => item.id === album.id)

  assert.equal(found?.coverFilename, 'b.jpg')
})

test('retrouve une photo par son identifiant', { skip }, async () => {
  const album = await createAlbum()
  const added = await repository.addPhoto({ albumId: album.id, filename: 'p.jpg', uploadedBy: 3 })

  assert.deepEqual(await repository.findPhoto(added.id), added)
  assert.equal(await repository.findPhoto(2_000_000_000), null)
})

test('supprime la ligne de la photo', { skip }, async () => {
  const album = await createAlbum()
  const photo = await repository.addPhoto({ albumId: album.id, filename: 'p.jpg', uploadedBy: 3 })

  await repository.deletePhoto(photo.id)

  assert.equal(await repository.findPhoto(photo.id), null)
})

test('supprimer la photo de couverture remet la couverture par défaut', { skip }, async () => {
  const album = await createAlbum()
  await repository.addPhoto({ albumId: album.id, filename: 'a.jpg', uploadedBy: 1 })
  const chosen = await repository.addPhoto({ albumId: album.id, filename: 'b.jpg', uploadedBy: 1 })
  await Database.rawQuery('UPDATE gallery_albums SET cover_photo_id = ? WHERE id = ?', [
    chosen.id,
    album.id,
  ])

  await repository.deletePhoto(chosen.id)

  assert.equal((await repository.findAlbum(album.id))?.coverPhotoId, null)
  const found = (await repository.listAlbums('velo')).find((item) => item.id === album.id)
  assert.equal(found?.coverFilename, 'a.jpg')
})

test('supprimer une autre photo ne change pas la couverture choisie', { skip }, async () => {
  const album = await createAlbum()
  const other = await repository.addPhoto({ albumId: album.id, filename: 'a.jpg', uploadedBy: 1 })
  const chosen = await repository.addPhoto({ albumId: album.id, filename: 'b.jpg', uploadedBy: 1 })
  await Database.rawQuery('UPDATE gallery_albums SET cover_photo_id = ? WHERE id = ?', [
    chosen.id,
    album.id,
  ])

  await repository.deletePhoto(other.id)

  assert.equal((await repository.findAlbum(album.id))?.coverPhotoId, chosen.id)
})

test('ne liste pas les albums des autres sections', { skip }, async () => {
  const five = await createAlbum('Finale', 'five')

  const velo = await repository.listAlbums('velo')

  assert.equal(
    velo.some((album) => album.id === five.id),
    false
  )
})
