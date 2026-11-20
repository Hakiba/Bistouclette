import { AddPhoto } from '../../../src/application/use-cases/add-photo.use-case'
import { CreateAlbum } from '../../../src/application/use-cases/create-album.use-case'
import { DeleteAlbum } from '../../../src/application/use-cases/delete-album.use-case'
import { DeletePhoto } from '../../../src/application/use-cases/delete-photo.use-case'
import { GetAlbum } from '../../../src/application/use-cases/get-album.use-case'
import { ListAlbums } from '../../../src/application/use-cases/list-albums.use-case'
import { UpdateAlbum } from '../../../src/application/use-cases/update-album.use-case'
import type { GalleryUseCases } from '../../../src/infra/composition/gallery-use-cases'
import { InMemoryFileStorage } from './in-memory-file-storage'
import { InMemoryGalleryRepository } from './in-memory-gallery-repository'

/** Mêmes cas d'usage que le composition root, branchés sur des fakes en mémoire. */
export function inMemoryGalleryUseCases() {
  const repository = new InMemoryGalleryRepository()
  const storage = new InMemoryFileStorage()
  const useCases: GalleryUseCases = {
    listAlbums: new ListAlbums(repository),
    getAlbum: new GetAlbum(repository),
    createAlbum: new CreateAlbum(repository),
    updateAlbum: new UpdateAlbum(repository),
    deleteAlbum: new DeleteAlbum(repository, storage),
    addPhoto: new AddPhoto(repository, storage),
    deletePhoto: new DeletePhoto(repository, storage),
  }
  return { repository, storage, useCases }
}
