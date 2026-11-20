import type { FastifyInstance, FastifyReply } from 'fastify'
import { GalleryError } from 'App/domain/gallery/gallery-rules'
import type { GalleryUseCases } from 'App/infra/composition/gallery-use-cases'
import { serializeAlbumSummary, serializeAlbumWithPhotos } from 'App/infra/http/gallery-payload'

/** Fournit les cas d'usage à la demande : les tests y branchent des fakes, sans base ni disque. */
export type GalleryUseCasesProvider = () => Promise<GalleryUseCases>

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
  useCases: GalleryUseCasesProvider
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
}
