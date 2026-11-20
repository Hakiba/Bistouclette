import type { FileStorage } from '../../../src/application/ports/file-storage'

/** Faux stockage en mémoire : `files` contient les noms des fichiers actuellement « sur disque ». */
export class InMemoryFileStorage implements FileStorage {
  public files: string[] = []
  /** Simule une panne du disque au moment de supprimer un fichier. */
  public failOnRemove = false

  async save(_content: Buffer, extension: string) {
    const filename = `fichier-${this.files.length + 1}.${extension}`
    this.files.push(filename)
    return filename
  }

  async remove(filename: string) {
    if (this.failOnRemove) {
      throw new Error('disque indisponible')
    }
    this.files = this.files.filter((file) => file !== filename)
  }
}
