import type { GalleryRepository } from 'App/application/ports/gallery-repository'
import type { AlbumSummary } from 'App/domain/gallery/types'
import { assertSectionIsValid } from 'App/domain/gallery/gallery-rules'

/** Cas d'usage applicatif : les albums d'une section, pour la grille de la page. */
export class ListAlbums {
  constructor(private readonly repository: GalleryRepository) {}

  public async execute(section: unknown): Promise<AlbumSummary[]> {
    const sectionName = assertSectionIsValid(section)
    return await this.repository.listAlbums(sectionName)
  }
}
