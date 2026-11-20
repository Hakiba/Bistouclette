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
  const title = typeof value === 'string' ? value.trim() : ''

  if (!title) {
    throw new GalleryError('ALBUM_TITLE_REQUIRED', 'Le titre est requis.')
  }
  if (title.length > GALLERY.maxTitleLength) {
    throw new GalleryError(
      'ALBUM_TITLE_TOO_LONG',
      `Le titre ne doit pas dépasser ${GALLERY.maxTitleLength} caractères.`
    )
  }
  return title
}

/**
 * Reconnaît le vrai format d'après les premiers octets, jamais d'après le nom ou le
 * type MIME envoyés par le client (falsifiables). Renvoie null si non autorisé.
 */
export function detectImageType(content: Buffer): ImageType | null {
  if (content[0] === 0xff && content[1] === 0xd8 && content[2] === 0xff) {
    return 'jpg'
  }

  if (content[0] === 0x89 && content[1] === 0x50 && content[2] === 0x4e && content[3] === 0x47) {
    return 'png'
  }

  // RIFF est aussi le conteneur des WAV et AVI : seul « WEBP » aux octets 8 à 11 désigne une image.
  if (
    content.length >= 12 &&
    content.subarray(0, 4).toString('ascii') === 'RIFF' &&
    content.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'webp'
  }

  return null
}
