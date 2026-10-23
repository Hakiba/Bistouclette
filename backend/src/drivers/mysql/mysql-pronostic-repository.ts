import type { PronosticRepository } from 'App/application/ports/pronostic-repository'
import type { Match, NewPronostic, Pronostic } from 'App/domain/pronostics/types'
import * as repository from '../five/five-repository'

/** Adaptateur secondaire : traduit le port applicatif vers le dépôt SQL MySQL. */
export class MySqlPronosticRepository implements PronosticRepository {
  public async findMatch(id: string): Promise<Match | null> {
    return repository.findMatch(id)
  }

  public async savePronostic(input: NewPronostic): Promise<void> {
    await repository.savePronostic(input)
  }

  public async findPronosticForUserAndMatch(
    userId: number,
    matchId: string
  ): Promise<Pronostic | null> {
    return repository.findPronosticForUserAndMatch(userId, matchId)
  }
}
