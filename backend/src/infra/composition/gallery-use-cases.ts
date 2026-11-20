import { AddPhoto } from 'App/application/use-cases/add-photo.use-case'
import { CreateAlbum } from 'App/application/use-cases/create-album.use-case'
import { DeleteAlbum } from 'App/application/use-cases/delete-album.use-case'
import { DeletePhoto } from 'App/application/use-cases/delete-photo.use-case'
import { GetAlbum } from 'App/application/use-cases/get-album.use-case'
import { ListAlbums } from 'App/application/use-cases/list-albums.use-case'
import { UpdateAlbum } from 'App/application/use-cases/update-album.use-case'
import ensureGallerySchema from 'App/drivers/gallery/gallery-schema'
import { MySqlGalleryRepository } from 'App/drivers/gallery/mysql-gallery-repository'
import { DiskFileStorage } from 'App/drivers/storage/disk-file-storage'

export type GalleryUseCases = {
  listAlbums: ListAlbums
  getAlbum: GetAlbum
  createAlbum: CreateAlbum
  updateAlbum: UpdateAlbum
  deleteAlbum: DeleteAlbum
  addPhoto: AddPhoto
  deletePhoto: DeletePhoto
}

/** Composition root de la galerie : les routes n'instancient jamais d'adaptateur elles-mêmes. */
export async function galleryUseCases(): Promise<GalleryUseCases> {
  await ensureGallerySchema()
  const repository = new MySqlGalleryRepository()
  const storage = new DiskFileStorage()
  return {
    listAlbums: new ListAlbums(repository),
    getAlbum: new GetAlbum(repository),
    createAlbum: new CreateAlbum(repository),
    updateAlbum: new UpdateAlbum(repository),
    deleteAlbum: new DeleteAlbum(repository, storage),
    addPhoto: new AddPhoto(repository, storage),
    deletePhoto: new DeletePhoto(repository, storage),
  }
}
