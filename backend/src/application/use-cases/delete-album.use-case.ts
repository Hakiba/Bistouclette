import type { FileStorage } from 'App/application/ports/file-storage'
import type { GalleryRepository } from 'App/application/ports/gallery-repository'
import { GalleryError } from 'App/domain/gallery/gallery-rules'

/** Cas d'usage applicatif : supprimer un album, ses photos en base et leurs fichiers. */
export class DeleteAlbum {
  constructor(
    private readonly repository: GalleryRepository,
    private readonly storage: FileStorage
  ) {}

  public async execute(albumId: unknown): Promise<void> {
    const id = Number(albumId)
    if (!Number.isInteger(id)) {
      throw new GalleryError('ALBUM_NOT_FOUND', 'album introuvable', 404)
    }
    const album = await this.repository.findAlbum(id)
    if (!album) {
      throw new GalleryError('ALBUM_NOT_FOUND', 'album introuvable', 404)
    }
    // Les noms de fichiers doivent être lus avant le DELETE : la cascade efface les lignes.
    const photos = await this.repository.listPhotos(id)

    await this.repository.deleteAlbum(id)

    await Promise.all(
      photos.map((photo) =>
        this.storage.remove(photo.filename).catch((err) => {
          console.error('Erreur lors de la suppression du fichier :', err)
        })
      )
    )
  }
}
