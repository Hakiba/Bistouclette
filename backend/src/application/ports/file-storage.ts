export interface FileStorage {
  /** Écrit le fichier et renvoie le nom stocké (généré, jamais celui du client). */
  save(content: Buffer, extension: string): Promise<string>

  /** Supprime le fichier */
  remove(filename: string): Promise<void>
}
