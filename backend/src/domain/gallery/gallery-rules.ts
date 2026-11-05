/*
|--------------------------------------------------------------------------
| Règles de la galerie photos
|--------------------------------------------------------------------------
|
| Logique métier pure : un album correspond à un événement (sortie vélo, match,
| compétition), rattaché à une section, et ne contient que des photos.
|
*/

export const GALLERY_SECTIONS = ['velo', 'five'] as const
export type GallerySection = (typeof GALLERY_SECTIONS)[number]

export const GALLERY = {
  maxTitleLength: 255,
} as const

export type ImageType = 'jpg' | 'png' | 'webp'

export class GalleryError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 400
  ) {
    super(message)
  }
}

export function assertSectionIsValid(value: unknown): GallerySection {
  if (!GALLERY_SECTIONS.includes(value as GallerySection)) {
    throw new GalleryError('ALBUM_SECTION_INVALID', 'La section doit être « velo » ou « five ».')
  }

  return value as GallerySection
}

export function assertTitleIsValid(value: unknown): string {
  // TODO(human): renvoyer le titre sans espaces autour. Lever une GalleryError
  // 'ALBUM_TITLE_REQUIRED' s'il est absent ou vide une fois nettoyé, et
  // 'ALBUM_TITLE_TOO_LONG' s'il dépasse GALLERY.maxTitleLength.
  throw new Error('à implémenter')
}

/**
 * Reconnaît le vrai format d'après les premiers octets, jamais d'après le nom ou le
 * type MIME envoyés par le client (falsifiables). Renvoie null si non autorisé.
 */
export function detectImageType(content: Buffer): ImageType | null {
  // TODO(human): 'jpg' si le fichier commence par FF D8 FF ; 'png' s'il commence par
  // 89 50 4E 47 0D 0A 1A 0A ; 'webp' s'il commence par "RIFF" et contient "WEBP" aux
  // octets 8 à 11. Sinon null. Pense à un buffer trop court.
  throw new Error('à implémenter')
}
