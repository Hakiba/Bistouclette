import fastifyStatic from '@fastify/static'
import type { FastifyInstance } from 'fastify'
import { uploadDir } from 'App/drivers/storage/disk-file-storage'
import { UPLOADS_URL_PREFIX } from 'App/infra/http/gallery-payload'

/**
 * Sert les photos du dossier d'upload sous `/uploads/`. Les noms de fichier sont des UUID qui ne
 * changent jamais : le cache peut être très long.
 */
export async function registerUploads(app: FastifyInstance, dir = uploadDir()) {
  await app.register(fastifyStatic, {
    root: dir,
    prefix: UPLOADS_URL_PREFIX,
    decorateReply: false,
    maxAge: '1y',
    immutable: true,
    index: false,
    setHeaders: (reply) => {
      reply.header('X-Content-Type-Options', 'nosniff')
    },
  })
}
