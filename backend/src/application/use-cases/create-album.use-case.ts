import type { GalleryRepository } from 'App/application/ports/gallery-repository'
import type { Album } from 'App/domain/gallery/types'
import { assertSectionIsValid, assertTitleIsValid } from 'App/domain/gallery/gallery-rules'

export type CreateAlbumInput = {
  section: unknown
  title: unknown
}

/** Cas d'usage applicatif : un album est un événement rattaché à une section. */
export class CreateAlbum {
  constructor(private readonly repository: GalleryRepository) {}

  public async execute(input: CreateAlbumInput): Promise<Album> {
    const section = assertSectionIsValid(input.section)
    const title = assertTitleIsValid(input.title)

    const album = await this.repository.createAlbum({ section, title })

    return album
  }
}
