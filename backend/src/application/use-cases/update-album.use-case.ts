import type { GalleryRepository } from 'App/application/ports/gallery-repository'
import { GalleryError, assertTitleIsValid } from 'App/domain/gallery/gallery-rules'
import type { Album, AlbumChanges } from 'App/domain/gallery/types'

export type UpdateAlbumInput = {
  title?: unknown
  /** Identifiant d'une photo de l'album, ou `null` pour revenir à la couverture par défaut. */
  coverPhotoId?: unknown
}

/** Cas d'usage applicatif : renommer un album et/ou choisir sa photo de couverture. */
export class UpdateAlbum {
  constructor(private readonly repository: GalleryRepository) {}

  public async execute(albumId: unknown, input: UpdateAlbumInput): Promise<Album> {
    const id = Number(albumId)
    if (!Number.isInteger(id)) {
      throw new GalleryError('ALBUM_NOT_FOUND', 'album introuvable', 404)
    }
    const album = await this.repository.findAlbum(id)
    if (!album) {
      throw new GalleryError('ALBUM_NOT_FOUND', 'album introuvable', 404)
    }

    const changes: AlbumChanges = {}
    if (input.title !== undefined) {
      changes.title = assertTitleIsValid(input.title)
    }
    if (input.coverPhotoId !== undefined) {
      if (input.coverPhotoId === null) {
        changes.coverPhotoId = null
      } else {
        const coverPhotoId = Number(input.coverPhotoId)
        const photo = Number.isInteger(coverPhotoId)
          ? await this.repository.findPhoto(coverPhotoId)
          : null
        if (!photo || photo.albumId !== album.id) {
          throw new GalleryError('COVER_PHOTO_INVALID', 'photo de couverture invalide')
        }
        changes.coverPhotoId = coverPhotoId
      }
    }

    if (Object.keys(changes).length === 0) {
      throw new GalleryError('ALBUM_UPDATE_EMPTY', 'aucune modification')
    }

    return this.repository.updateAlbum(id, changes)
  }
}
