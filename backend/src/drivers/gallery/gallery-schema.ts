import Database from '../mysql/mysql'

/*
|--------------------------------------------------------------------------
| Schéma de la galerie photos
|--------------------------------------------------------------------------
|
| Garanti au démarrage, de façon idempotente (la production ne peut pas lancer
| de migrations). Même principe que le schéma du Five.
|
*/

let ensured: Promise<void> | null = null

async function createTables() {
  // `section` vaut 'velo' ou 'five'. `cover_photo_id` n'a pas de clé étrangère :
  // elle créerait une dépendance circulaire avec gallery_photos.
  await Database.rawQuery(`
    CREATE TABLE IF NOT EXISTS gallery_albums (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      section VARCHAR(16) NOT NULL,
      title VARCHAR(255) NOT NULL,
      cover_photo_id INT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX gallery_albums_section_index (section)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)

  // La suppression d'un album efface ses lignes ici, mais pas les fichiers sur disque :
  // c'est au cas d'usage de les retirer via FileStorage.
  await Database.rawQuery(`
    CREATE TABLE IF NOT EXISTS gallery_photos (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      album_id INT NOT NULL,
      filename VARCHAR(255) NOT NULL,
      caption VARCHAR(255) NOT NULL DEFAULT '',
      uploaded_by INT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (album_id) REFERENCES gallery_albums(id) ON DELETE CASCADE,
      UNIQUE INDEX gallery_photos_filename_unique (filename),
      INDEX gallery_photos_album_index (album_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
}

/** Garantit le schéma une seule fois par processus. */
export default function ensureGallerySchema(): Promise<void> {
  if (!ensured) {
    ensured = createTables().catch((error) => {
      ensured = null
      throw error
    })
  }

  return ensured
}
