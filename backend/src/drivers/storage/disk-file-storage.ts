import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import type { FileStorage } from 'App/application/ports/file-storage'

/** Dossier d'upload : hors de build/ et public/, que la CI vide à chaque déploiement. */
export function uploadDir() {
  return resolve(process.env.UPLOAD_DIR || './uploads')
}

export class DiskFileStorage implements FileStorage {
  constructor(private readonly dir = uploadDir()) {}

  /** Crée le dossier s'il n'existe pas ; à appeler au démarrage du serveur. */
  async ensureDir() {
    await mkdir(this.dir, { recursive: true })
  }

  async save(content: Buffer, extension: string) {
    const filename = `${randomUUID()}.${extension}`
    await writeFile(join(this.dir, filename), content)
    return filename
  }

  async remove(filename: string) {
    await unlink(join(this.dir, filename))
  }
}
