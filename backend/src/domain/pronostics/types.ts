/** Entités métier, indépendantes du framework et du stockage. */
import type { MatchStatus } from './pronostic-rules'

export type Match = {
  id: string
  kickoffAt: Date
  status: MatchStatus
}

export type Pronostic = {
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

export type NewPronostic = Pick<Pronostic, 'userId' | 'matchId' | 'scoreHome' | 'scoreAway'>
