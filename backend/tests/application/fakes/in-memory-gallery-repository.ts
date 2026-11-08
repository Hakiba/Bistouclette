import type { GalleryRepository } from '../../../src/application/ports/gallery-repository'
import type { Album, NewAlbum, NewPhoto, Photo } from '../../../src/domain/gallery/types'

/** Faux port en mémoire : aucun SQL, aucun serveur. */
export class InMemoryGalleryRepository implements GalleryRepository {
  public albums: Album[] = []
  public photos: Photo[] = []
  /** Simule une panne de la base au moment d'enregistrer une photo. */
  public failOnAddPhoto = false

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
