import type { GalleryGuards } from '../../../src/infra/http/gallery-routes'

/** Jetons de test : `Bearer admin` passe la garde, `Bearer player` est refusé, le reste n'est pas connecté. */
export const ADMIN = { authorization: 'Bearer admin' }
export const PLAYER = { authorization: 'Bearer player' }

/** Même contrat que requireAdmin de routes.ts (401 puis 403), sans base de données. */
export const fakeGuards: GalleryGuards = {
  async requireAdmin(request, reply) {
    if (!request.headers.authorization) {
      return reply
        .code(401)
        .send({ message: 'Authentification requise.', code: 'NOT_AUTHENTICATED' })
    }
    if (request.headers.authorization !== ADMIN.authorization) {
      return reply
        .code(403)
        .send({ message: 'Accès réservé aux administrateurs.', code: 'FORBIDDEN' })
    }
  },
}
