import type { Match, NewPronostic, Pronostic } from 'App/domain/pronostics/types'

export interface PronosticRepository {
  findMatch(id: string): Promise<Match | null>
  savePronostic(input: NewPronostic): Promise<void>
  findPronosticForUserAndMatch(userId: number, matchId: string): Promise<Pronostic | null>
}
