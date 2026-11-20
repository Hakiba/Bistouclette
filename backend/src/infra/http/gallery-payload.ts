import type { AlbumSummary, AlbumWithPhotos, Photo } from 'App/domain/gallery/types'

/*
|--------------------------------------------------------------------------
| Sérialisation des réponses de la galerie
|--------------------------------------------------------------------------
|
| Un seul endroit décide de la forme des objets envoyés au front : dates en
| ISO, et URL publique des photos construite ici (le front ne voit jamais un
| nom de fichier ni le dossier d'upload).
|
*/

/** Préfixe public sous lequel le serveur expose les fichiers du dossier d'upload. */
export const UPLOADS_URL_PREFIX = '/uploads/'

const photoUrl = (filename: string) => `${UPLOADS_URL_PREFIX}${filename}`

export function serializePhoto(photo: Photo) {
  return {
    id: photo.id,
    url: photoUrl(photo.filename),
    caption: photo.caption,
    createdAt: photo.createdAt.toISOString(),
  }
}

export function serializeAlbumSummary(album: AlbumSummary) {
  return {
    id: album.id,
    section: album.section,
    title: album.title,
    createdAt: album.createdAt.toISOString(),
    photoCount: album.photoCount,
    coverUrl: album.coverFilename === null ? null : photoUrl(album.coverFilename),
  }
}

export function serializeAlbumWithPhotos(album: AlbumWithPhotos) {
  return {
    id: album.id,
    section: album.section,
    title: album.title,
    createdAt: album.createdAt.toISOString(),
    coverPhotoId: album.coverPhotoId,
    photos: album.photos.map(serializePhoto),
  }
}
