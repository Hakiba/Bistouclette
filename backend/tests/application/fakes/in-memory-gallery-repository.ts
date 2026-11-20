import type { GalleryRepository } from '../../../src/application/ports/gallery-repository'
import type { GallerySection } from '../../../src/domain/gallery/gallery-rules'
import type { Album, NewAlbum, NewPhoto, Photo } from '../../../src/domain/gallery/types'

/** Faux port en mémoire : aucun SQL, aucun serveur. */
export class InMemoryGalleryRepository implements GalleryRepository {
  public albums: Album[] = []
  public photos: Photo[] = []
  /** Simule une panne de la base au moment d'enregistrer une photo. */
  public failOnAddPhoto = false

  async listAlbums(section: GallerySection) {
    return this.albums
      .filter((album) => album.section === section)
      .sort((a, b) => b.id - a.id)
      .map((album) => {
        const photos = this.photos.filter((photo) => photo.albumId === album.id)
        const cover = photos.find((photo) => photo.id === album.coverPhotoId) ?? photos[0]
        return { ...album, photoCount: photos.length, coverFilename: cover?.filename ?? null }
      })
  }

  async createAlbum(input: NewAlbum) {
    const album: Album = {
      id: this.albums.length + 1,
      ...input,
      coverPhotoId: null,
      createdAt: new Date('2026-11-08T10:00:00'),
    }
    this.albums.push(album)
    return album
  }

  async findAlbum(id: number) {
    return this.albums.find((album) => album.id === id) ?? null
  }

  async addPhoto(input: NewPhoto) {
    if (this.failOnAddPhoto) {
      throw new Error('base indisponible')
    }
    const photo: Photo = {
      id: this.photos.length + 1,
      ...input,
      caption: '',
      createdAt: new Date('2026-11-08T10:00:00'),
    }
    this.photos.push(photo)
    return photo
  }
}
