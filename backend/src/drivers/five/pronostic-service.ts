import Database from '../mysql/mysql'
import ensureFiveSchema from './five-schema'
import * as Repository from './five-repository'
import type { MatchRecord, PronosticRecord } from './five-repository'
import {
  MatchStatus,
  PronosticError,
  assertCoefficientIsValid,
  assertGoalsAreValid,
  isMatchStatus,
  isOpenForPronostics,
  pointsFor,
} from 'App/domain/pronostics/pronostic-rules'

/*
|--------------------------------------------------------------------------
| Service de pronostics
|--------------------------------------------------------------------------
|
| Enregistrement des pronostics des joueurs et gestion des matchs par le
| staff. Les points ne sont jamais stockés ailleurs que sur le pronostic
| lui-même : saisir ou corriger un résultat recalcule simplement la colonne
| `points`, ce qui rend l'opération rejouable sans effet de bord.
|
*/

/** Enregistre (ou remplace) le pronostic d'un joueur sur un match ouvert. */
export async function savePronostic(
  userId: number,
  input: { matchId: unknown; scoreHome: unknown; scoreAway: unknown }
): Promise<PronosticRecord> {
  await ensureFiveSchema()

  const matchId = String(input.matchId || '')

  if (!matchId) {
    throw new PronosticError('MATCH_REQUIRED', 'Le match est obligatoire.')
  }

  const scoreHome = assertGoalsAreValid(input.scoreHome, 'domicile')
  const scoreAway = assertGoalsAreValid(input.scoreAway, 'extérieur')

  const match = await Repository.findMatch(matchId)

  if (!match) {
    throw new PronosticError('MATCH_NOT_FOUND', 'Ce match est introuvable.', 404)
  }

  if (!isOpenForPronostics(match)) {
    throw new PronosticError(
      'MATCH_CLOSED',
      'Les pronostics sont fermés sur ce match : le coup d’envoi est passé.',
      409
    )
  }

  await Repository.savePronostic({ userId, matchId, scoreHome, scoreAway })
  const saved = await Repository.findPronosticForUserAndMatch(userId, matchId)

  if (!saved) {
    throw new PronosticError('NOT_SAVED', "Le pronostic n'a pas pu être enregistré.", 500)
  }

  return saved
}

/** Retire le pronostic d'un joueur tant que le match n'a pas commencé. */
export async function removePronostic(userId: number, pronosticId: number): Promise<void> {
  await ensureFiveSchema()

  const pronostic = await Repository.findPronostic(pronosticId)

  if (!pronostic || pronostic.userId !== userId) {
    throw new PronosticError('PRONOSTIC_NOT_FOUND', 'Ce pronostic est introuvable.', 404)
  }

  const match = await Repository.findMatch(pronostic.matchId)

  if (!match || !isOpenForPronostics(match)) {
    throw new PronosticError('MATCH_CLOSED', 'Les pronostics sont fermés sur ce match.', 409)
  }

  await Repository.deletePronostic(pronostic.id)
}

/**
 * Attribue les points de tous les pronostics d'un match à partir de son score.
 * Rejouable : une correction de score réécrit simplement les points.
 */
async function applyPoints(
  match: MatchRecord,
  result: { scoreHome: number; scoreAway: number },
  client?: Repository.Client
) {
  const pronostics = await Repository.listPronosticsForMatch(match.id, client)
  let exact = 0
  let outcome = 0

  for (const pronostic of pronostics) {
    const points = pointsFor(pronostic, result, match.coefficient)
    await Repository.setPronosticPoints(pronostic.id, points, client)

    if (points === 3 * match.coefficient) {
      exact++
    } else if (points === match.coefficient) {
      outcome++
    }
  }

  return { total: pronostics.length, exact, outcome }
}

/** Saisit le score définitif d'un match et attribue les points. */
export async function settleMatch(
  matchId: string,
  scoreHome: unknown,
  scoreAway: unknown
): Promise<{ match: MatchRecord; pronostics: number; exact: number; outcome: number }> {
  await ensureFiveSchema()

  const result = {
    scoreHome: assertGoalsAreValid(scoreHome, 'domicile'),
    scoreAway: assertGoalsAreValid(scoreAway, 'extérieur'),
  }

  return Database.transaction(async (trx) => {
    const match = await Repository.findMatch(matchId, trx, { forUpdate: true })

    if (!match) {
      throw new PronosticError('MATCH_NOT_FOUND', 'Ce match est introuvable.', 404)
    }

    const updated: MatchRecord = {
      ...match,
      scoreHome: result.scoreHome,
      scoreAway: result.scoreAway,
      status: 'finished',
    }

    await Repository.updateMatch(updated, trx)
    const counts = await applyPoints(match, result, trx)

    return {
      match: updated,
      pronostics: counts.total,
      exact: counts.exact,
      outcome: counts.outcome,
    }
  })
}

/** Rouvre les pronostics d'un match : le résultat et les points sont effacés. */
export async function reopenMatch(matchId: string): Promise<{ match: MatchRecord }> {
  await ensureFiveSchema()

  return Database.transaction(async (trx) => {
    const match = await Repository.findMatch(matchId, trx, { forUpdate: true })

    if (!match) {
      throw new PronosticError('MATCH_NOT_FOUND', 'Ce match est introuvable.', 404)
    }

    const updated: MatchRecord = { ...match, scoreHome: null, scoreAway: null, status: 'scheduled' }
    await Repository.updateMatch(updated, trx)
    await Repository.clearPointsForMatch(matchId, trx)

    return { match: updated }
  })
}

/** Annule un match : il ne rapporte aucun point et sort du jeu. */
export async function cancelMatch(matchId: string): Promise<{ match: MatchRecord }> {
  await ensureFiveSchema()

  return Database.transaction(async (trx) => {
    const match = await Repository.findMatch(matchId, trx, { forUpdate: true })

    if (!match) {
      throw new PronosticError('MATCH_NOT_FOUND', 'Ce match est introuvable.', 404)
    }

    const updated: MatchRecord = { ...match, scoreHome: null, scoreAway: null, status: 'cancelled' }
    await Repository.updateMatch(updated, trx)
    await Repository.clearPointsForMatch(matchId, trx)

    return { match: updated }
  })
}

export async function removeMatch(matchId: string): Promise<{ pronostics: number }> {
  await ensureFiveSchema()

  return Database.transaction(async (trx) => {
    const match = await Repository.findMatch(matchId, trx, { forUpdate: true })

    if (!match) {
      throw new PronosticError('MATCH_NOT_FOUND', 'Ce match est introuvable.', 404)
    }

    const pronostics = await Repository.listPronosticsForMatch(matchId, trx)
    await Repository.deletePronosticsForMatch(matchId, trx)
    await Repository.deleteMatch(matchId, trx)

    return { pronostics: pronostics.length }
  })
}

function parseKickoff(value: unknown): Date {
  const raw = String(value || '').trim()
  // `datetime-local` renvoie « 2025-10-09T18:30 » : on le lit en heure locale
  // serveur plutôt qu'en UTC pour rester cohérent avec l'affichage.
  const local = raw.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/)

  const date = local
    ? new Date(
        Number(local[1]),
        Number(local[2]) - 1,
        Number(local[3]),
        Number(local[4]),
        Number(local[5])
      )
    : new Date(raw)

  if (Number.isNaN(date.getTime())) {
    throw new PronosticError('INVALID_KICKOFF', 'La date du match est invalide.')
  }

  return date
}

function parseOptionalScore(value: unknown, label: string): number | null {
  if (value === null || value === undefined || value === '') {
    return null
  }

  return assertGoalsAreValid(value, label)
}

export type MatchInput = {
  id?: unknown
  kickoffAt: unknown
  home: unknown
  away: unknown
  venue?: unknown
  coefficient?: unknown
  status?: unknown
  scoreHome?: unknown
  scoreAway?: unknown
}

/**
 * Création ou mise à jour d'un match depuis l'espace d'administration.
 * Si un score est fourni avec le statut « terminé », les points suivent.
 */
export async function saveMatch(
  input: MatchInput
): Promise<{ match: MatchRecord; created: boolean }> {
  await ensureFiveSchema()

  const home = String(input.home || '').trim()
  const away = String(input.away || '').trim()

  if (!home || !away) {
    throw new PronosticError('TEAMS_REQUIRED', 'Les deux équipes sont obligatoires.')
  }

  const kickoffAt = parseKickoff(input.kickoffAt)
  const status: MatchStatus = isMatchStatus(input.status) ? input.status : 'scheduled'
  const scoreHome = parseOptionalScore(input.scoreHome, 'domicile')
  const scoreAway = parseOptionalScore(input.scoreAway, 'extérieur')
  const coefficientInput = input.coefficient
  const id = String(input.id || '').trim()

  return Database.transaction(async (trx) => {
    const existing = id ? await Repository.findMatch(id, trx, { forUpdate: true }) : null

    if (id && !existing) {
      throw new PronosticError('MATCH_NOT_FOUND', 'Ce match est introuvable.', 404)
    }

    const coefficient =
      coefficientInput === undefined
        ? existing?.coefficient || 1
        : assertCoefficientIsValid(coefficientInput)

    const record: MatchRecord = {
      id: existing?.id || `match-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      kickoffAt,
      home,
      away,
      venue: String(input.venue || '').trim(),
      coefficient,
      scoreHome,
      scoreAway,
      status,
    }

    if (!existing) {
      await Repository.insertMatch(record, trx)
      return { match: record, created: true }
    }

    await Repository.updateMatch(record, trx)

    // Le statut et le score peuvent changer depuis le formulaire : les points
    // sont recalculés (ou effacés) pour rester cohérents avec la fiche.
    if (record.status === 'finished' && record.scoreHome !== null && record.scoreAway !== null) {
      await applyPoints(record, { scoreHome: record.scoreHome, scoreAway: record.scoreAway }, trx)
    } else {
      await Repository.clearPointsForMatch(record.id, trx)
    }

    return { match: record, created: false }
  })
}

export { PronosticError }
