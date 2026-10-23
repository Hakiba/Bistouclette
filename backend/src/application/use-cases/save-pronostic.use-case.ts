import type { PronosticRepository } from 'App/application/ports/pronostic-repository'
import type { Pronostic } from 'App/domain/pronostics/types'
import {
  PronosticError,
  assertGoalsAreValid,
  isOpenForPronostics,
} from 'App/domain/pronostics/pronostic-rules'

export type SavePronosticInput = {
  matchId: unknown
  scoreHome: unknown
  scoreAway: unknown
}

/** Cas d'usage applicatif : une règle métier testable sans serveur ni base. */
export class SavePronostic {
  constructor(
    private readonly repository: PronosticRepository,
    private readonly now: () => Date = () => new Date()
  ) {}

  public async execute(userId: number, input: SavePronosticInput): Promise<Pronostic> {
    const matchId = String(input.matchId || '')
    if (!matchId) {
      throw new PronosticError('MATCH_REQUIRED', 'Le match est obligatoire.')
    }

    const scoreHome = assertGoalsAreValid(input.scoreHome, 'domicile')
    const scoreAway = assertGoalsAreValid(input.scoreAway, 'extérieur')
    const match = await this.repository.findMatch(matchId)

    if (!match) {
      throw new PronosticError('MATCH_NOT_FOUND', 'Ce match est introuvable.', 404)
    }
    if (!isOpenForPronostics(match, this.now())) {
      throw new PronosticError(
        'MATCH_CLOSED',
        'Les pronostics sont fermés sur ce match : le coup d’envoi est passé.',
        409
      )
    }

    await this.repository.savePronostic({ userId, matchId, scoreHome, scoreAway })
    const saved = await this.repository.findPronosticForUserAndMatch(userId, matchId)
    if (!saved) {
      throw new PronosticError('NOT_SAVED', "Le pronostic n'a pas pu être enregistré.", 500)
    }

    return saved
  }
}
