import type { GalleryRepository } from 'App/application/ports/gallery-repository'
import type { Album, NewAlbum, NewPhoto, Photo } from 'App/domain/gallery/types'
import Database from '../mysql/mysql'

type AlbumRow = {
  id: number
  section: Album['section']
  title: string
  cover_photo_id: number | null
  created_at: Date
}

type PhotoRow = {
  id: number
  album_id: number
  filename: string
  caption: string
  uploaded_by: number | null
  created_at: Date
}

const ALBUM_COLUMNS = 'id, section, title, cover_photo_id, created_at'
const PHOTO_COLUMNS = 'id, album_id, filename, caption, uploaded_by, created_at'

async function select<T>(sql: string, bindings: unknown[] = []) {
  const [rows] = await Database.rawQuery(sql, bindings)
  return rows as T[]
}

async function insert(sql: string, bindings: unknown[] = []) {
  const [result] = await Database.rawQuery(sql, bindings)
  return (result as { insertId: number }).insertId
}

function mapAlbum(row: AlbumRow): Album {
  return {
    id: row.id,
    section: row.section,
    title: row.title,
    coverPhotoId: row.cover_photo_id,
    createdAt: row.created_at,
  }
}

function mapPhoto(row: PhotoRow): Photo {
  return {
    id: row.id,
    albumId: row.album_id,
    filename: row.filename,
    caption: row.caption,
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
  }
}

/** Adaptateur secondaire : traduit le port de la galerie vers MySQL. */
export class MySqlGalleryRepository implements GalleryRepository {
  public async createAlbum(input: NewAlbum): Promise<Album> {
    const id = await insert('INSERT INTO gallery_albums (section, title) VALUES (?, ?)', [
      input.section,
      input.title,
    ])
    const album = await this.findAlbum(id)
    if (!album) {
      throw new Error("L'album vient d'être créé mais reste introuvable.")
    }

    return album
  }

  public async findAlbum(id: number): Promise<Album | null> {
    const rows = await select<AlbumRow>(
      `SELECT ${ALBUM_COLUMNS} FROM gallery_albums WHERE id = ? LIMIT 1`,
      [id]
    )
    return rows.length > 0 ? mapAlbum(rows[0]) : null
  }

  public async addPhoto(input: NewPhoto): Promise<Photo> {
    const id = await insert(
      'INSERT INTO gallery_photos (album_id, filename, uploaded_by) VALUES (?, ?, ?)',
      [input.albumId, input.filename, input.uploadedBy]
    )
    const rows = await select<PhotoRow>(
      `SELECT ${PHOTO_COLUMNS} FROM gallery_photos WHERE id = ? LIMIT 1`,
      [id]
    )
    if (rows.length === 0) {
      throw new Error("La photo vient d'être créée mais reste introuvable.")
    }
    return mapPhoto(rows[0])
  }
}
