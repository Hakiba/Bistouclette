import type { GalleryRepository } from 'App/application/ports/gallery-repository'
import type { AlbumWithPhotos } from 'App/domain/gallery/types'
import { GalleryError } from 'App/domain/gallery/gallery-rules'

/** Cas d'usage applicatif : ouvrir un album avec ses photos. */
export class GetAlbum {
  constructor(private readonly repository: GalleryRepository) {}

  public async execute(albumId: unknown): Promise<AlbumWithPhotos> {
    const id = Number(albumId)
    if (!Number.isInteger(id)) {
      throw new GalleryError('ALBUM_NOT_FOUND', 'album introuvable', 404)
    }
    const album = await this.repository.findAlbum(id)
    if (!album) {
      throw new GalleryError('ALBUM_NOT_FOUND', 'album introuvable', 404)
    }
    const photos = await this.repository.listPhotos(id)
    return { ...album, photos }
  }
}
