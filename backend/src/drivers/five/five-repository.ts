import Database from '../mysql/mysql'
import type { QueryClientContract, TransactionClientContract } from '../mysql/mysql'
import type { MatchStatus } from 'App/domain/pronostics/pronostic-rules'

/*
|--------------------------------------------------------------------------
| Accès aux données du Five
|--------------------------------------------------------------------------
|
| Toutes les requêtes SQL du Five sont regroupées ici. Chaque fonction accepte
| un client (connexion ou transaction) pour que le service métier garde la
| main sur les transactions.
|
*/

export type Client = QueryClientContract | TransactionClientContract

export type MatchRecord = {
  id: string
  kickoffAt: Date
  home: string
  away: string
  venue: string
  coefficient: number
  scoreHome: number | null
  scoreAway: number | null
  status: MatchStatus
}

export type PronosticRecord = {
  id: number
  userId: number
  matchId: string
  coefficient: number
  scoreHome: number
  scoreAway: number
  points: number | null
  createdAt: Date
  settledAt: Date | null
}

export type PronosticWithPlayer = PronosticRecord & {
  username: string
  displayName: string
}

export type PlayerRow = {
  userId: number
  username: string
  displayName: string
  points: number
  played: number
  exact: number
  outcome: number
  missed: number
  pending: number
}

export type MatchStatsEntry = {
  pronosticsCount: number
  byOutcome: Record<string, number>
}

const MATCH_COLUMNS =
  'id, kickoff_at, home, away, venue, coefficient, score_home, score_away, status'
const PRONOSTIC_COLUMNS =
  'p.id, p.user_id, p.match_id, p.score_home, p.score_away, p.points, p.created_at, p.settled_at, m.coefficient'

/** Les liaisons SQL acceptent `null` : score non saisi, points non attribués. */
type Bindings = (string | number | Date | null)[]

function db(client?: Client): Client {
  return client || Database.connection()
}

async function rows(client: Client | undefined, sql: string, bindings: Bindings = []) {
  const result = await db(client).rawQuery(sql, bindings as any)
  return (result[0] || result) as any[]
}

async function execute(client: Client | undefined, sql: string, bindings: Bindings = []) {
  const result = await db(client).rawQuery(sql, bindings as any)
  return (result[0] || result) as any
}

function toDate(value: any): Date {
  return value instanceof Date ? value : new Date(value)
}

function mapMatch(row: any): MatchRecord {
  return {
    id: row.id,
    kickoffAt: toDate(row.kickoff_at),
    home: row.home,
    away: row.away,
    venue: row.venue || '',
    coefficient: Number(row.coefficient || 1),
    scoreHome: row.score_home === null ? null : Number(row.score_home),
    scoreAway: row.score_away === null ? null : Number(row.score_away),
    status: row.status as MatchStatus,
  }
}

function mapPronostic(row: any): PronosticRecord {
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    matchId: row.match_id,
    coefficient: Number(row.coefficient || 1),
    scoreHome: Number(row.score_home),
    scoreAway: Number(row.score_away),
    points: row.points === null ? null : Number(row.points),
    createdAt: toDate(row.created_at),
    settledAt: row.settled_at ? toDate(row.settled_at) : null,
  }
}

function displayName(row: { first_name?: string; last_name?: string; username?: string }) {
  const full = [row.first_name, row.last_name].filter(Boolean).join(' ').trim()
  return full || row.username || 'Joueur'
}

/*
|--------------------------------------------------------------------------
| Matchs
|--------------------------------------------------------------------------
*/

export async function listMatches(client?: Client): Promise<MatchRecord[]> {
  const result = await rows(
    client,
    `SELECT ${MATCH_COLUMNS} FROM five_matches ORDER BY kickoff_at ASC`
  )

  return result.map(mapMatch)
}

export async function findMatch(
  id: string,
  client?: Client,
  options: { forUpdate?: boolean } = {}
): Promise<MatchRecord | null> {
  const suffix = options.forUpdate ? ' FOR UPDATE' : ''
  const result = await rows(
    client,
    `SELECT ${MATCH_COLUMNS} FROM five_matches WHERE id = ? LIMIT 1${suffix}`,
    [id]
  )

  return result.length > 0 ? mapMatch(result[0]) : null
}

export async function insertMatch(match: MatchRecord, client?: Client): Promise<void> {
  await execute(
    client,
    `INSERT INTO five_matches (id, kickoff_at, home, away, venue, coefficient, score_home, score_away, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      match.id,
      match.kickoffAt,
      match.home,
      match.away,
      match.venue,
      match.coefficient,
      match.scoreHome,
      match.scoreAway,
      match.status,
    ]
  )
}

export async function updateMatch(match: MatchRecord, client?: Client): Promise<void> {
  await execute(
    client,
    `UPDATE five_matches SET kickoff_at = ?, home = ?, away = ?, venue = ?, coefficient = ?, score_home = ?,
     score_away = ?, status = ? WHERE id = ?`,
    [
      match.kickoffAt,
      match.home,
      match.away,
      match.venue,
      match.coefficient,
      match.scoreHome,
      match.scoreAway,
      match.status,
      match.id,
    ]
  )
}

export async function deleteMatch(id: string, client?: Client): Promise<void> {
  await execute(client, 'DELETE FROM five_matches WHERE id = ?', [id])
}

/*
|--------------------------------------------------------------------------
| Pronostics
|--------------------------------------------------------------------------
*/

export async function listPronosticsForUser(
  userId: number,
  client?: Client
): Promise<PronosticRecord[]> {
  const result = await rows(
    client,
    `SELECT ${PRONOSTIC_COLUMNS} FROM five_pronostics p
     JOIN five_matches m ON m.id = p.match_id
     WHERE p.user_id = ? ORDER BY p.id DESC`,
    [userId]
  )

  return result.map(mapPronostic)
}

export async function listPronosticsForMatch(
  matchId: string,
  client?: Client
): Promise<PronosticRecord[]> {
  const result = await rows(
    client,
    `SELECT ${PRONOSTIC_COLUMNS} FROM five_pronostics p
     JOIN five_matches m ON m.id = p.match_id
     WHERE p.match_id = ? ORDER BY p.id ASC`,
    [matchId]
  )

  return result.map(mapPronostic)
}

export async function findPronostic(id: number, client?: Client): Promise<PronosticRecord | null> {
  const result = await rows(
    client,
    `SELECT ${PRONOSTIC_COLUMNS} FROM five_pronostics p
     JOIN five_matches m ON m.id = p.match_id
     WHERE p.id = ? LIMIT 1`,
    [id]
  )

  return result.length > 0 ? mapPronostic(result[0]) : null
}

/** Enregistre ou remplace le pronostic d'un joueur sur un match. */
export async function savePronostic(
  pronostic: { userId: number; matchId: string; scoreHome: number; scoreAway: number },
  client?: Client
): Promise<void> {
  await execute(
    client,
    `INSERT INTO five_pronostics (user_id, match_id, score_home, score_away)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE score_home = VALUES(score_home), score_away = VALUES(score_away),
       points = NULL, settled_at = NULL`,
    [pronostic.userId, pronostic.matchId, pronostic.scoreHome, pronostic.scoreAway]
  )
}

export async function findPronosticForUserAndMatch(
  userId: number,
  matchId: string,
  client?: Client
): Promise<PronosticRecord | null> {
  const result = await rows(
    client,
    `SELECT ${PRONOSTIC_COLUMNS} FROM five_pronostics p
     JOIN five_matches m ON m.id = p.match_id
     WHERE p.user_id = ? AND p.match_id = ? LIMIT 1`,
    [userId, matchId]
  )

  return result.length > 0 ? mapPronostic(result[0]) : null
}

export async function deletePronostic(id: number, client?: Client): Promise<void> {
  await execute(client, 'DELETE FROM five_pronostics WHERE id = ?', [id])
}

export async function deletePronosticsForMatch(matchId: string, client?: Client): Promise<void> {
  await execute(client, 'DELETE FROM five_pronostics WHERE match_id = ?', [matchId])
}

export async function setPronosticPoints(
  id: number,
  points: number | null,
  client?: Client
): Promise<void> {
  await execute(
    client,
    `UPDATE five_pronostics SET points = ?, settled_at = ${points === null ? 'NULL' : 'NOW()'}
     WHERE id = ?`,
    [points, id]
  )
}

/** Remet à « non réglés » tous les pronostics d'un match. */
export async function clearPointsForMatch(matchId: string, client?: Client): Promise<void> {
  await execute(
    client,
    'UPDATE five_pronostics SET points = NULL, settled_at = NULL WHERE match_id = ?',
    [matchId]
  )
}

/*
|--------------------------------------------------------------------------
| Classement et statistiques
|--------------------------------------------------------------------------
*/

/**
 * Classement de tous les joueurs ayant pronostiqué au moins une fois.
 * Tri : points, puis scores exacts, puis pseudo pour rester déterministe.
 */
export async function leaderboard(client?: Client): Promise<PlayerRow[]> {
  const result = await rows(
    client,
    `SELECT u.id AS user_id, u.username, u.first_name, u.last_name,
            COALESCE(SUM(p.points), 0) AS points,
            COALESCE(SUM(p.points IS NOT NULL), 0) AS played,
            COALESCE(SUM(p.points = 3 * m.coefficient), 0) AS exact_count,
            COALESCE(SUM(p.points = m.coefficient), 0) AS outcome_count,
            COALESCE(SUM(p.points = 0), 0) AS missed_count,
            COALESCE(SUM(p.points IS NULL), 0) AS pending_count
     FROM five_pronostics p
     JOIN users u ON u.id = p.user_id
            JOIN five_matches m ON m.id = p.match_id
     GROUP BY u.id, u.username, u.first_name, u.last_name
     ORDER BY points DESC, exact_count DESC, u.username ASC`
  )

  return result.map((row) => ({
    userId: Number(row.user_id),
    username: row.username || '',
    displayName: displayName(row),
    points: Number(row.points),
    played: Number(row.played),
    exact: Number(row.exact_count),
    outcome: Number(row.outcome_count),
    missed: Number(row.missed_count),
    pending: Number(row.pending_count),
  }))
}

export async function listPronosticsWithPlayers(
  options: { matchId?: string; limit?: number } = {},
  client?: Client
): Promise<PronosticWithPlayer[]> {
  const limit = Math.max(1, Math.min(500, Number(options.limit) || 300))
  const filter = options.matchId ? 'WHERE p.match_id = ?' : ''

  const result = await rows(
    client,
    `SELECT p.id, p.user_id, p.match_id, p.score_home, p.score_away, p.points, p.created_at,
        p.settled_at, m.coefficient, u.username, u.first_name, u.last_name
     FROM five_pronostics p
     JOIN users u ON u.id = p.user_id
         JOIN five_matches m ON m.id = p.match_id
     ${filter}
     ORDER BY p.id DESC
     LIMIT ${limit}`,
    options.matchId ? [options.matchId] : []
  )

  return result.map((row) => ({
    ...mapPronostic(row),
    username: row.username || '',
    displayName: displayName(row),
  }))
}

/** Nombre de pronostics par match, et répartition des issues pronostiquées. */
export async function matchStats(client?: Client): Promise<Map<string, MatchStatsEntry>> {
  const result = await rows(
    client,
    `SELECT match_id,
            COUNT(*) AS total,
            SUM(score_home > score_away) AS home_count,
            SUM(score_home = score_away) AS draw_count,
            SUM(score_home < score_away) AS away_count
     FROM five_pronostics GROUP BY match_id`
  )

  const stats = new Map<string, MatchStatsEntry>()

  for (const row of result) {
    stats.set(row.match_id, {
      pronosticsCount: Number(row.total),
      byOutcome: {
        home: Number(row.home_count),
        draw: Number(row.draw_count),
        away: Number(row.away_count),
      },
    })
  }

  return stats
}

/** Comptes du club, pour la vue d'administration. */
export async function listUsers(client?: Client) {
  const result = await rows(
    client,
    `SELECT id, username, first_name, last_name, email, role FROM users ORDER BY id ASC`
  )

  return result.map((row) => ({
    id: Number(row.id),
    username: row.username || '',
    displayName: displayName(row),
    email: row.email || '',
    role: row.role === 'admin' ? ('admin' as const) : ('user' as const),
  }))
}
