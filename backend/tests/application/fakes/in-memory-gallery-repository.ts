import type { GalleryRepository } from '../../../src/application/ports/gallery-repository'
import type { GallerySection } from '../../../src/domain/gallery/gallery-rules'
import type { Album, NewAlbum, NewPhoto, Photo } from '../../../src/domain/gallery/types'

/** Faux port en mémoire : aucun SQL, aucun serveur. */
export class InMemoryGalleryRepository implements GalleryRepository {
  public albums: Album[] = []
  public photos: Photo[] = []
  /** Simule une panne de la base au moment d'enregistrer une photo. */
  public failOnAddPhoto = false
  /** Simule une panne de la base au moment de supprimer une photo. */
  public failOnDeletePhoto = false
  private nextAlbumId = 1
  private nextPhotoId = 1

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
      id: this.nextAlbumId++,
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
      id: this.nextPhotoId++,
      ...input,
      caption: '',
      createdAt: new Date('2026-11-08T10:00:00'),
    }
    this.photos.push(photo)
    return photo
  }

  async findPhoto(id: number) {
    return this.photos.find((photo) => photo.id === id) ?? null
  }

  async deletePhoto(id: number) {
    if (this.failOnDeletePhoto) {
      throw new Error('base indisponible')
    }
    this.photos = this.photos.filter((photo) => photo.id !== id)
  }
}
