import type { FastifyRequest } from 'fastify'
import type { AuthUser } from '../../../src/infra/auth'
import type { GalleryGuards } from '../../../src/infra/http/gallery-routes'

/** Jetons de test : `Bearer admin` passe la garde, `Bearer player` est refusé, le reste n'est pas connecté. */
export const ADMIN = { authorization: 'Bearer admin' }
export const PLAYER = { authorization: 'Bearer player' }
export const ADMIN_USER: AuthUser = {
  id: 42,
  username: 'admin',
  firstName: 'Ad',
  lastName: 'Min',
  email: 'admin@example.test',
  role: 'admin',
}

/** Même contrat que requireAdmin de routes.ts (401, 403, puis `request.user`), sans base de données. */
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
    ;(request as FastifyRequest & { user?: AuthUser }).user = ADMIN_USER
  },
}
