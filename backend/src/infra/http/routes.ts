import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { hashPassword, verifyPassword } from 'App/infra/password'
import {
  createPasswordResetToken,
  ensurePasswordResetSchema,
  resetPassword,
  sendPasswordResetEmail,
} from 'App/infra/password-reset'
import Database from 'App/drivers/mysql/mysql'
import { findUserByToken, issueToken, revokeToken, type AuthUser } from 'App/infra/auth'
import ensureFiveSchema from 'App/drivers/five/five-schema'
import * as Repository from 'App/drivers/five/five-repository'
import * as Pronostics from 'App/drivers/five/pronostic-service'
import { savePronostic } from 'App/infra/composition/five-use-cases'
import { PronosticError } from 'App/domain/pronostics/pronostic-rules'
import {
  serializeLeaderboard,
  serializeMatch,
  serializePlayer,
  serializePronostic,
  serializeRules,
} from 'App/infra/http/five-payload'

type RequestWithUser = FastifyRequest & { user?: AuthUser }
const body = (request: FastifyRequest) => (request.body || {}) as Record<string, unknown>

function error(reply: FastifyReply, cause: unknown) {
  if (cause instanceof PronosticError)
    return reply.code(cause.status).send({ message: cause.message, code: cause.code })
  requestLog(cause)
  return reply.code(500).send({
    message: "Une erreur est survenue, l'opération n'a pas été enregistrée.",
    code: 'INTERNAL_ERROR',
  })
}
function requestLog(cause: unknown) {
  console.error(cause)
}
async function requireUser(request: RequestWithUser, reply: FastifyReply) {
  request.user = (await findUserByToken(request.headers.authorization)) || undefined
  if (!request.user)
    return reply.code(401).send({ message: 'Authentification requise.', code: 'NOT_AUTHENTICATED' })
}
async function requireAdmin(request: RequestWithUser, reply: FastifyReply) {
  await requireUser(request, reply)
  if (reply.sent) return
  if (request.user?.role !== 'admin')
    return reply
      .code(403)
      .send({ message: 'Accès réservé aux administrateurs.', code: 'FORBIDDEN' })
}
async function playerPayload(userId: number, board?: Repository.PlayerRow[]) {
  await ensureFiveSchema()
  const ranking = board || (await Repository.leaderboard())
  const index = ranking.findIndex((row) => row.userId === userId)
  const pronostics = await Repository.listPronosticsForUser(userId)
  const stats =
    index >= 0
      ? serializePlayer(ranking[index], index + 1)
      : serializePlayer(
          {
            userId,
            username: '',
            displayName: '',
            points: 0,
            played: 0,
            exact: 0,
            outcome: 0,
            missed: 0,
            pending: 0,
          },
          ranking.length + 1
        )
  return { userId, stats, pronostics: pronostics.map(serializePronostic) }
}

export async function registerRoutes(app: FastifyInstance) {
  app.get('/api', async () => ({ hello: 'world' }))
  app.post('/api/password/forgot', async (request, reply) => {
    try {
      await ensurePasswordResetSchema()
      const email = String(body(request).email || '')
        .trim()
        .toLowerCase()
      const reset = email ? await createPasswordResetToken(email) : null

      if (reset) {
        try {
          await sendPasswordResetEmail(reset.email, reset.token)
        } catch (cause) {
          // La réponse reste identique même si l'envoi échoue, pour ne pas révéler
          // si l'adresse correspond à un compte.
          requestLog(cause)
        }
      }

      return reply.code(202).send({
        message:
          'Si un compte correspond à cette adresse, un lien de réinitialisation a été envoyé.',
      })
    } catch (cause) {
      return error(reply, cause)
    }
  })
  app.post('/api/password/reset', async (request, reply) => {
    try {
      await ensurePasswordResetSchema()
      const input = body(request)
      const token = String(input.token || '')
      const password = String(input.password || '')

      if (!/^[A-Za-z0-9_-]{43}$/.test(token))
        return reply
          .code(400)
          .send({ message: 'Ce lien de réinitialisation est invalide ou expiré.' })
      if (password.length < 8)
        return reply
          .code(400)
          .send({ message: 'Le mot de passe doit contenir au moins 8 caractères.' })

      const updated = await resetPassword(token, password)

      if (!updated)
        return reply
          .code(400)
          .send({ message: 'Ce lien de réinitialisation est invalide ou expiré.' })

      return { message: 'Mot de passe modifié. Vous pouvez vous connecter.' }
    } catch (cause) {
      return error(reply, cause)
    }
  })
  app.post('/api/create_user', async (request, reply) => {
    try {
      const input = body(request)
      const email = String(input.email || '')
        .trim()
        .toLowerCase()
      const [existing] = await Database.rawQuery('SELECT id FROM users WHERE email = ? LIMIT 1', [
        email,
      ])
      if ((existing as any[]).length)
        return reply.code(400).send({ message: 'Un utilisateur avec cet email existe déjà.' })
      const password = String(input.password || '')
      if (!email || !password)
        return reply.code(400).send({ message: 'Email et mot de passe requis.' })
      const passwordHash = await hashPassword(password)
      const [result] = await Database.rawQuery(
        'INSERT INTO users (username, first_name, last_name, email, password, role) VALUES (?, ?, ?, ?, ?, ?)',
        [
          String(input.username || ''),
          String(input.firstName || ''),
          String(input.lastName || ''),
          email,
          passwordHash,
          'user',
        ]
      )
      const user = {
        id: Number((result as any).insertId),
        username: String(input.username || ''),
        firstName: String(input.firstName || ''),
        lastName: String(input.lastName || ''),
        email,
        role: 'user',
      }
      return reply.code(201).send({ user, token: await issueToken(user.id) })
    } catch (cause) {
      return error(reply, cause)
    }
  })
  app.post('/api/login', async (request, reply) => {
    try {
      const input = body(request)
      const [rows] = await Database.rawQuery(
        'SELECT id, username, first_name, last_name, email, password, strava_id, role FROM users WHERE email = ? LIMIT 1',
        [
          String(input.email || '')
            .trim()
            .toLowerCase(),
        ]
      )
      const row = (rows as any[])[0]
      if (!row || !(await verifyPassword(String(row.password || ''), String(input.password || ''))))
        return reply.code(400).send({ message: 'Identifiants invalides' })
      const user = {
        id: Number(row.id),
        username: row.username || '',
        firstName: row.first_name || '',
        lastName: row.last_name || '',
        email: row.email,
        stravaId: row.strava_id,
        role: row.role === 'admin' ? 'admin' : 'user',
      }
      return { message: 'Connexion réussie', token: await issueToken(user.id), user }
    } catch (cause) {
      return error(reply, cause)
    }
  })
  app.post('/api/logout', { preHandler: requireUser }, async (request) => {
    await revokeToken(request.headers.authorization)
    return { message: 'Déconnexion réussie' }
  })
  app.get('/api/five', async (request: RequestWithUser, reply) => {
    try {
      await ensureFiveSchema()
      const user = await findUserByToken(request.headers.authorization)
      const [matches, stats, board] = await Promise.all([
        Repository.listMatches(),
        Repository.matchStats(),
        Repository.leaderboard(),
      ])
      return {
        rules: serializeRules(),
        matches: matches.map((match) => serializeMatch(match, stats.get(match.id))),
        leaderboard: serializeLeaderboard(board),
        me: user ? await playerPayload(user.id, board) : null,
      }
    } catch (cause) {
      return error(reply, cause)
    }
  })
  app.get('/api/five/leaderboard', async (_request, reply) => {
    try {
      await ensureFiveSchema()
      return { leaderboard: serializeLeaderboard(await Repository.leaderboard()) }
    } catch (cause) {
      return error(reply, cause)
    }
  })
  app.get('/api/five/me', { preHandler: requireUser }, async (request: RequestWithUser, reply) => {
    try {
      return await playerPayload(request.user!.id)
    } catch (cause) {
      return error(reply, cause)
    }
  })
  app.post(
    '/api/five/pronostics',
    { preHandler: requireUser },
    async (request: RequestWithUser, reply) => {
      try {
        const value = body(request)
        const pronostic = await savePronostic(request.user!.id, value as any)
        return {
          message: 'Pronostic enregistré.',
          pronostic: serializePronostic(pronostic),
          me: await playerPayload(request.user!.id),
        }
      } catch (cause) {
        return error(reply, cause)
      }
    }
  )
  app.delete(
    '/api/five/pronostics/:id',
    { preHandler: requireUser },
    async (request: RequestWithUser, reply) => {
      try {
        const id = Number((request.params as { id: string }).id)
        if (!Number.isInteger(id) || id <= 0)
          throw new PronosticError('PRONOSTIC_NOT_FOUND', 'Ce pronostic est introuvable.', 404)
        await Pronostics.removePronostic(request.user!.id, id)
        return { message: 'Pronostic retiré.', me: await playerPayload(request.user!.id) }
      } catch (cause) {
        return error(reply, cause)
      }
    }
  )
  app.get('/api/admin/overview', { preHandler: requireAdmin }, async (_request, reply) => {
    try {
      await ensureFiveSchema()
      const [matches, stats, pronostics, board] = await Promise.all([
        Repository.listMatches(),
        Repository.matchStats(),
        Repository.listPronosticsWithPlayers({ limit: 300 }),
        Repository.leaderboard(),
      ])
      const serialized = matches.map((match) => serializeMatch(match, stats.get(match.id)))
      return {
        matches: serialized,
        pronostics: pronostics.map((item) => ({
          ...serializePronostic(item),
          userId: item.userId,
          player: item.displayName,
          username: item.username,
        })),
        leaderboard: serializeLeaderboard(board),
        stats: {
          matchesCount: matches.length,
          openCount: serialized.filter((item) => item.open).length,
          finishedCount: serialized.filter((item) => item.status === 'finished').length,
          pronosticsCount: pronostics.length,
          pendingCount: pronostics.filter((item) => item.points === null).length,
          playersCount: board.length,
        },
      }
    } catch (cause) {
      return error(reply, cause)
    }
  })
  app.get('/api/admin/players', { preHandler: requireAdmin }, async (_request, reply) => {
    try {
      await ensureFiveSchema()
      const [users, board] = await Promise.all([Repository.listUsers(), Repository.leaderboard()])
      const ranking = new Map(board.map((row, index) => [row.userId, { row, rank: index + 1 }]))
      return {
        players: users.map((user) => ({
          ...user,
          rank: ranking.get(user.id)?.rank ?? null,
          points: ranking.get(user.id)?.row.points ?? 0,
          played: ranking.get(user.id)?.row.played ?? 0,
          exact: ranking.get(user.id)?.row.exact ?? 0,
          pending: ranking.get(user.id)?.row.pending ?? 0,
        })),
      }
    } catch (cause) {
      return error(reply, cause)
    }
  })
  app.post('/api/admin/matches', { preHandler: requireAdmin }, async (request, reply) => {
    try {
      const result = await Pronostics.saveMatch(body(request) as any)
      return reply.code(result.created ? 201 : 200).send({
        message: result.created ? 'Match créé.' : 'Match mis à jour.',
        match: serializeMatch(result.match),
      })
    } catch (cause) {
      return error(reply, cause)
    }
  })
  app.put('/api/admin/matches/:id', { preHandler: requireAdmin }, async (request, reply) => {
    try {
      const result = await Pronostics.saveMatch({
        ...body(request),
        id: (request.params as { id: string }).id,
      } as any)
      return { message: 'Match mis à jour.', match: serializeMatch(result.match) }
    } catch (cause) {
      return error(reply, cause)
    }
  })
  app.delete('/api/admin/matches/:id', { preHandler: requireAdmin }, async (request, reply) => {
    try {
      const result = await Pronostics.removeMatch((request.params as { id: string }).id)
      return { message: `Match supprimé, ainsi que ses ${result.pronostics} pronostic(s).` }
    } catch (cause) {
      return error(reply, cause)
    }
  })
  app.post(
    '/api/admin/matches/:id/settle',
    { preHandler: requireAdmin },
    async (request, reply) => {
      try {
        const value = body(request)
        const result = await Pronostics.settleMatch(
          (request.params as { id: string }).id,
          value.scoreHome,
          value.scoreAway
        )
        return {
          message: `Résultat enregistré : ${result.pronostics} pronostic(s) départagé(s), ${result.exact} score(s) exact(s) et ${result.outcome} bon(s) résultat(s).`,
          match: serializeMatch(result.match),
        }
      } catch (cause) {
        return error(reply, cause)
      }
    }
  )
  app.post(
    '/api/admin/matches/:id/cancel',
    { preHandler: requireAdmin },
    async (request, reply) => {
      try {
        const result = await Pronostics.cancelMatch((request.params as { id: string }).id)
        return {
          message: 'Match annulé : il ne rapporte aucun point.',
          match: serializeMatch(result.match),
        }
      } catch (cause) {
        return error(reply, cause)
      }
    }
  )
  app.post(
    '/api/admin/matches/:id/reopen',
    { preHandler: requireAdmin },
    async (request, reply) => {
      try {
        const result = await Pronostics.reopenMatch((request.params as { id: string }).id)
        return {
          message: 'Pronostics rouverts : le résultat et les points ont été effacés.',
          match: serializeMatch(result.match),
        }
      } catch (cause) {
        return error(reply, cause)
      }
    }
  )
}
