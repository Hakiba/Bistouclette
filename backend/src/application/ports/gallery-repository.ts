import type { Album, NewAlbum, NewPhoto, Photo } from 'App/domain/gallery/types'

export interface GalleryRepository {
  createAlbum(input: NewAlbum): Promise<Album>
  findAlbum(id: number): Promise<Album | null>
  addPhoto(input: NewPhoto): Promise<Photo>
}
