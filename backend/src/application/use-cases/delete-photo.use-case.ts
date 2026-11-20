import type { FileStorage } from 'App/application/ports/file-storage'
import type { GalleryRepository } from 'App/application/ports/gallery-repository'
import { GalleryError } from 'App/domain/gallery/gallery-rules'

/** Cas d'usage applicatif : supprimer une photo (ligne en base + fichier sur disque). */
export class DeletePhoto {
  constructor(
    private readonly repository: GalleryRepository,
    private readonly storage: FileStorage
  ) {}

  public async execute(photoId: unknown): Promise<void> {
    const id = Number(photoId)
    if (!Number.isInteger(id)) {
      throw new GalleryError('PHOTO_NOT_FOUND', 'photo introuvable', 404)
    }
    const photo = await this.repository.findPhoto(id)
    if (!photo) {
      throw new GalleryError('PHOTO_NOT_FOUND', 'photo introuvable', 404)
    }

    await this.repository.deletePhoto(id)

    await this.storage.remove(photo.filename).catch((err) => {
      console.error('Erreur lors de la suppression du fichier :', err)
    })
  }
}
