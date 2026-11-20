import type { GallerySection } from 'App/domain/gallery/gallery-rules'
import type { Album, AlbumSummary, NewAlbum, NewPhoto, Photo } from 'App/domain/gallery/types'

export interface GalleryRepository {
  /** Albums d'une section, du plus récent au plus ancien. */
  listAlbums(section: GallerySection): Promise<AlbumSummary[]>
  createAlbum(input: NewAlbum): Promise<Album>
  findAlbum(id: number): Promise<Album | null>
  addPhoto(input: NewPhoto): Promise<Photo>
}
