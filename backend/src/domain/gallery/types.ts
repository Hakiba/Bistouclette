/** Entités de la galerie, indépendantes du framework et du stockage. */
import type { GallerySection } from './gallery-rules'

export type Album = {
  id: number
  section: GallerySection
  title: string
  coverPhotoId: number | null
  createdAt: Date
}

export type NewAlbum = Pick<Album, 'section' | 'title'>

export type Photo = {
  id: number
  albumId: number
  filename: string
  caption: string
  uploadedBy: number | null
  createdAt: Date
}

export type NewPhoto = Pick<Photo, 'albumId' | 'filename' | 'uploadedBy'>
