import '../../src/infra/load-env'
import assert from 'node:assert/strict'
import { access, mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, test } from 'node:test'
import Database from '../../src/drivers/mysql/mysql'
import { galleryUseCases } from '../../src/infra/composition/gallery-use-cases'

// Test d'intégration du câblage : vraie base (backend/.env) et vrai disque (dossier temporaire).
const skip = !process.env.MYSQL_DB_NAME && 'aucune base MySQL configurée'
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

let dir = ''
const createdAlbumIds: number[] = []

before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'bistouclette-uploads-'))
  process.env.UPLOAD_DIR = dir
})

after(async () => {
  if (!skip) {
    for (const id of createdAlbumIds) {
      await Database.rawQuery('DELETE FROM gallery_albums WHERE id = ?', [id])
    }
    await Database.close()
  }
  await rm(dir, { recursive: true, force: true })
})

test('le câblage relie les cas d’usage à la base et au disque', { skip }, async () => {
  const gallery = await galleryUseCases()

  const album = await gallery.createAlbum.execute({ section: 'velo', title: 'Câblage' })
  createdAlbumIds.push(album.id)
  const photo = await gallery.addPhoto.execute({
    albumId: album.id,
    content: PNG,
    uploadedBy: 1,
  })

  await access(join(dir, photo.filename))
  const opened = await gallery.getAlbum.execute(String(album.id))
  assert.deepEqual(
    opened.photos.map((item) => item.id),
    [photo.id]
  )

  const renamed = await gallery.updateAlbum.execute(album.id, { title: 'Renommé' })
  assert.equal(renamed.title, 'Renommé')
  const listed = (await gallery.listAlbums.execute('velo')).find((item) => item.id === album.id)
  assert.equal(listed?.photoCount, 1)

  await gallery.deleteAlbum.execute(album.id)
  assert.deepEqual(await readdir(dir), [])
  await assert.rejects(gallery.getAlbum.execute(album.id), { code: 'ALBUM_NOT_FOUND' })
})
