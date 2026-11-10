import type { GallerySection } from 'App/domain/gallery/gallery-rules'
import type { Album, AlbumSummary, NewAlbum, NewPhoto, Photo } from 'App/domain/gallery/types'

export interface GalleryRepository {
  /** Albums d'une section, du plus récent au plus ancien. */
  listAlbums(section: GallerySection): Promise<AlbumSummary[]>
  createAlbum(input: NewAlbum): Promise<Album>
  findAlbum(id: number): Promise<Album | null>
  addPhoto(input: NewPhoto): Promise<Photo>
  findPhoto(id: number): Promise<Photo | null>
  /** Supprime la ligne de la photo ; le fichier sur disque reste à la charge de l'appelant. */
  deletePhoto(id: number): Promise<void>
}
