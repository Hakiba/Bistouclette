import {
  SCORING,
  averagePoints,
  gradeOf,
  isOpenForPronostics,
  outcomeOf,
  successRate,
} from 'App/domain/pronostics/pronostic-rules'
import type { MatchRecord, PlayerRow, PronosticRecord } from '../../drivers/five/five-repository'

/*
|--------------------------------------------------------------------------
| Sérialisation des réponses API
|--------------------------------------------------------------------------
|
| Un seul endroit décide de la forme des objets envoyés au front : dates en
| ISO, et informations dérivées (issue, ouverture des pronostics, taux de
| réussite) calculées côté serveur pour que toutes les vues s'accordent.
|
*/

export type MatchStats = { pronosticsCount: number; byOutcome: Record<string, number> }

export function serializeMatch(match: MatchRecord, stats?: MatchStats) {
  const hasScore = match.scoreHome !== null && match.scoreAway !== null

  return {
    id: match.id,
    kickoffAt: match.kickoffAt.toISOString(),
    home: match.home,
    away: match.away,
    venue: match.venue,
    coefficient: match.coefficient,
    status: match.status,
    score: hasScore ? { home: match.scoreHome, away: match.scoreAway } : null,
    outcome: hasScore ? outcomeOf(match.scoreHome!, match.scoreAway!) : null,
    open: isOpenForPronostics(match),
    stats: stats || { pronosticsCount: 0, byOutcome: { home: 0, draw: 0, away: 0 } },
  }
}

export function serializePronostic(pronostic: PronosticRecord) {
  return {
    id: pronostic.id,
    matchId: pronostic.matchId,
    scoreHome: pronostic.scoreHome,
    scoreAway: pronostic.scoreAway,
    outcome: outcomeOf(pronostic.scoreHome, pronostic.scoreAway),
    points: pronostic.points,
    grade: pronostic.points === null ? null : gradeOf(pronostic.points, pronostic.coefficient),
    createdAt: pronostic.createdAt.toISOString(),
    settledAt: pronostic.settledAt ? pronostic.settledAt.toISOString() : null,
  }
}

export function serializePlayer(row: PlayerRow, rank: number) {
  return {
    rank,
    userId: row.userId,
    username: row.username,
    displayName: row.displayName,
    points: row.points,
    played: row.played,
    exact: row.exact,
    outcome: row.outcome,
    missed: row.missed,
    pending: row.pending,
    successRate: successRate(row),
    averagePoints: averagePoints(row),
  }
}

export function serializeLeaderboard(board: PlayerRow[]) {
  return board.map((row, index) => serializePlayer(row, index + 1))
}

export function serializeRules() {
  return {
    exactScore: SCORING.exactScore,
    correctOutcome: SCORING.correctOutcome,
    maxGoals: SCORING.maxGoals,
    maxCoefficient: SCORING.maxCoefficient,
  }
}
