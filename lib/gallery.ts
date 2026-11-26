import { API_BASE, api } from "./api";

/**
 * Contrat partagé avec l'API de la galerie.
 *
 * Les types décrivent ce que renvoie `backend/src/infra/http/gallery-payload.ts`.
 */

export type GallerySection = "velo" | "five";

export interface AlbumSummary {
  id: number;
  section: GallerySection;
  title: string;
  createdAt: string;
  photoCount: number;
  /** `null` pour un album vide. */
  coverUrl: string | null;
}

export interface Photo {
  id: number;
  url: string;
  caption: string;
  createdAt: string;
}

export interface AlbumWithPhotos {
  id: number;
  section: GallerySection;
  title: string;
  createdAt: string;
  coverPhotoId: number | null;
  photos: Photo[];
}

/**
 * Les URL de photos sont relatives au serveur (`/uploads/…`), pas à `/api` :
 * on retire le suffixe `/api` de la base pour retrouver l'origine du backend
 * (vide en production, `http://localhost:3333` en développement).
 */
const ASSET_BASE = API_BASE.replace(/\/api\/?$/, "");

export const assetUrl = (path: string) => `${ASSET_BASE}${path}`;

export const galleryApi = {
  albums: (section: GallerySection) => api.get<{ albums: AlbumSummary[] }>(`/gallery/${section}`),
  album: (id: number) => api.get<{ album: AlbumWithPhotos }>(`/gallery/albums/${id}`),
  createAlbum: (input: { section: GallerySection; title: string }) =>
    api.post<{ message: string }>("/admin/gallery/albums", input),
  updateAlbum: (id: number, changes: { title?: string; coverPhotoId?: number | null }) =>
    api.put<{ message: string }>(`/admin/gallery/albums/${id}`, changes),
  deleteAlbum: (id: number) => api.delete<{ message: string }>(`/admin/gallery/albums/${id}`),
  uploadPhoto: (albumId: number, file: Blob, filename: string) => {
    const form = new FormData();
    form.append("file", file, filename);
    return api.post<{ message: string; photo: Photo }>(`/admin/gallery/albums/${albumId}/photos`, form);
  },
  deletePhoto: (id: number) => api.delete<{ message: string }>(`/admin/gallery/photos/${id}`),
};

const MAX_SIDE = 1600;

/**
 * Réduit une photo à 1600 px max (JPEG) avant l'envoi : une photo de téléphone
 * pèse plusieurs Mo, inutiles pour un affichage web. En cas d'échec du
 * décodage (format exotique), le fichier d'origine est envoyé tel quel.
 */
export async function resizeImage(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const ratio = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * ratio);
    canvas.height = Math.round(bitmap.height * ratio);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return blob ?? file;
  } catch {
    return file;
  }
}
