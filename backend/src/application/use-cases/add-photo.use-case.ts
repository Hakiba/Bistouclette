import type { FileStorage } from 'App/application/ports/file-storage'
import type { GalleryRepository } from 'App/application/ports/gallery-repository'
import type { Photo } from 'App/domain/gallery/types'
import { GalleryError, detectImageType } from 'App/domain/gallery/gallery-rules'

export type AddPhotoInput = {
  albumId: unknown
  content: Buffer
  uploadedBy: number
}

/** Cas d'usage applicatif : ajouter une photo à un album (fichier sur disque + ligne en base). */
export class AddPhoto {
  constructor(
    private readonly repository: GalleryRepository,
    private readonly storage: FileStorage
  ) {}

  public async execute(input: AddPhotoInput): Promise<Photo> {
    // Toutes les validations passent avant la première écriture.
    const albumId = Number(input.albumId)
    const album = Number.isInteger(albumId) ? await this.repository.findAlbum(albumId) : null
    if (!album) {
      throw new GalleryError('ALBUM_NOT_FOUND', 'L’album est introuvable.', 404)
    }

    const format = detectImageType(input.content)
    if (!format) {
      throw new GalleryError('IMAGE_INVALID', 'Le format de l’image n’est pas autorisé.', 415)
    }

    const filename = await this.storage.save(input.content, format)
    try {
      const photo = await this.repository.addPhoto({
        albumId,
        filename,
        uploadedBy: input.uploadedBy,
      })
      return photo
    } catch (error) {
      try {
        await this.storage.remove(filename)
      } catch (removeError) {
        console.error('Impossible de retirer le fichier après échec de addPhoto', removeError)
      }
      throw error
    }
  }
}
