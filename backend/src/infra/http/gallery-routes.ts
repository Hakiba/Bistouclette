import type { FastifyInstance, FastifyReply, preHandlerAsyncHookHandler } from 'fastify'
import type { UpdateAlbumInput } from 'App/application/use-cases/update-album.use-case'
import { GalleryError } from 'App/domain/gallery/gallery-rules'
import type { GalleryUseCases } from 'App/infra/composition/gallery-use-cases'
import {
  serializeAlbum,
  serializeAlbumSummary,
  serializeAlbumWithPhotos,
} from 'App/infra/http/gallery-payload'

/** Fournit les cas d'usage à la demande : les tests y branchent des fakes, sans base ni disque. */
export type GalleryUseCasesProvider = () => Promise<GalleryUseCases>

/** Gardes d'accès fournies par l'appelant : les tests y branchent de fausses gardes, sans base. */
export type GalleryGuards = { requireAdmin: preHandlerAsyncHookHandler }

/** Traduit une erreur en réponse `{ message, code }` ; les erreurs inattendues ne fuient pas. */
export function sendGalleryError(reply: FastifyReply, cause: unknown) {
  if (cause instanceof GalleryError) {
    return reply.code(cause.status).send({ message: cause.message, code: cause.code })
  }
  console.error(cause)
  return reply.code(500).send({
    message: "Une erreur est survenue, l'opération n'a pas été enregistrée.",
    code: 'INTERNAL_ERROR',
  })
}

export async function registerGalleryRoutes(
  app: FastifyInstance,
  useCases: GalleryUseCasesProvider,
  guards: GalleryGuards
) {
  app.get('/api/gallery/:section', async (request, reply) => {
    try {
      const { section } = request.params as { section: string }
      const gallery = await useCases()
      const albums = await gallery.listAlbums.execute(section)
      return reply.code(200).send({ albums: albums.map(serializeAlbumSummary) })
    } catch (cause) {
      return sendGalleryError(reply, cause)
    }
  })

  app.get('/api/gallery/albums/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const gallery = await useCases()
      const album = await gallery.getAlbum.execute(id)
      return reply.code(200).send({ album: serializeAlbumWithPhotos(album) })
    } catch (cause) {
      return sendGalleryError(reply, cause)
    }
  })

  app.post(
    '/api/admin/gallery/albums',
    { preHandler: guards.requireAdmin },
    async (request, reply) => {
      try {
        const { section, title } = (request.body ?? {}) as { section?: unknown; title?: unknown }
        const gallery = await useCases()
        const album = await gallery.createAlbum.execute({ section, title })
        return reply.code(201).send({ message: 'Album créé.', album: serializeAlbum(album) })
      } catch (cause) {
        return sendGalleryError(reply, cause)
      }
    }
  )

  app.put(
    '/api/admin/gallery/albums/:id',
    { preHandler: guards.requireAdmin },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string }
        const changes = (request.body ?? {}) as UpdateAlbumInput
        const gallery = await useCases()
        const album = await gallery.updateAlbum.execute(id, changes)
        return reply.code(200).send({ message: 'Album mis à jour.', album: serializeAlbum(album) })
      } catch (cause) {
        return sendGalleryError(reply, cause)
      }
    }
  )

  app.delete(
    '/api/admin/gallery/albums/:id',
    { preHandler: guards.requireAdmin },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string }
        const gallery = await useCases()
        await gallery.deleteAlbum.execute(id)
        return reply.code(200).send({ message: 'Album supprimé.' })
      } catch (cause) {
        return sendGalleryError(reply, cause)
      }
    }
  )
}
