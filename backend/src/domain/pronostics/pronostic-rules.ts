/*
|--------------------------------------------------------------------------
| Règles du jeu de pronostics
|--------------------------------------------------------------------------
|
| Logique métier pure, sans accès base de données : barème, validation d'un
| pronostic et calcul des points. C'est la seule source de vérité du jeu ;
| le back l'applique, le front l'affiche.
|
| Le principe : tout le monde pronostique chaque rencontre, sans mise et sans
| capital à perdre. On marque des points, on ne peut jamais en perdre.
|
*/

export const SCORING = {
  /** Score exact trouvé. */
  exactScore: 3,
  /** Bon vainqueur (ou bon match nul) mais score différent. */
  correctOutcome: 1,
  /** Pronostic à côté. */
  missed: 0,
  /** Nombre de buts maximal accepté dans un pronostic. */
  maxGoals: 30,
  /** Coefficient maximal d'un match. */
  maxCoefficient: 100,
} as const

export type Outcome = 'home' | 'draw' | 'away'
export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'cancelled'

export const MATCH_STATUSES: MatchStatus[] = ['scheduled', 'live', 'finished', 'cancelled']

export class PronosticError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 400
  ) {
    super(message)
  }
}

export function isMatchStatus(value: unknown): value is MatchStatus {
  return MATCH_STATUSES.includes(value as MatchStatus)
}

/** Valide et normalise un coefficient décimal saisi par l'administration. */
export function assertCoefficientIsValid(rawCoefficient: unknown): number {
  const normalized = String(rawCoefficient ?? '')
    .trim()
    .replace(',', '.')
  const coefficient = Number(normalized)

  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized) || !Number.isFinite(coefficient)) {
    throw new PronosticError(
      'INVALID_COEFFICIENT',
      `Le coefficient doit être un nombre décimal compris entre 1 et ${SCORING.maxCoefficient}.`
    )
  }

  if (coefficient < 1 || coefficient > SCORING.maxCoefficient) {
    throw new PronosticError(
      'INVALID_COEFFICIENT',
      `Le coefficient doit être compris entre 1 et ${SCORING.maxCoefficient}.`
    )
  }

  return coefficient
}

/** Issue d'une rencontre à partir d'un score. */
export function outcomeOf(scoreHome: number, scoreAway: number): Outcome {
  if (scoreHome > scoreAway) {
    return 'home'
  }

  if (scoreHome < scoreAway) {
    return 'away'
  }

  return 'draw'
}

/**
 * Points rapportés par un pronostic face au score réel.
 * Score exact : 3 points. Bon résultat mais mauvais score : 1 point. Sinon 0.
 */
export function pointsFor(
  pronostic: { scoreHome: number; scoreAway: number },
  result: { scoreHome: number; scoreAway: number },
  coefficient: number = 1
): number {
  if (pronostic.scoreHome === result.scoreHome && pronostic.scoreAway === result.scoreAway) {
    return SCORING.exactScore * coefficient
  }

  if (
    outcomeOf(pronostic.scoreHome, pronostic.scoreAway) ===
    outcomeOf(result.scoreHome, result.scoreAway)
  ) {
    return SCORING.correctOutcome * coefficient
  }

  return SCORING.missed
}

/** Qualification d'un pronostic déjà réglé, pour l'affichage et les statistiques. */
export function gradeOf(points: number, coefficient: number = 1): 'exact' | 'outcome' | 'missed' {
  if (points >= SCORING.exactScore * coefficient) {
    return 'exact'
  }

  if (points >= SCORING.correctOutcome * coefficient) {
    return 'outcome'
  }

  return 'missed'
}

/**
 * Un match accepte les pronostics tant qu'il est programmé et que le coup
 * d'envoi n'est pas passé. Aucune autre condition : pas de capital, pas de
 * quota, tout le monde peut pronostiquer toutes les rencontres ouvertes.
 */
export function isOpenForPronostics(
  match: { status: MatchStatus; kickoffAt: Date },
  now: Date = new Date()
): boolean {
  return match.status === 'scheduled' && match.kickoffAt.getTime() > now.getTime()
}

/** Valide un nombre de buts saisi et le renvoie normalisé. */
export function assertGoalsAreValid(rawGoals: unknown, label: string): number {
  const goals = Number(rawGoals)

  if (!Number.isInteger(goals)) {
    throw new PronosticError('INVALID_SCORE', `Le score « ${label} » doit être un nombre entier.`)
  }

  if (goals < 0) {
    throw new PronosticError('INVALID_SCORE', `Le score « ${label} » ne peut pas être négatif.`)
  }

  if (goals > SCORING.maxGoals) {
    throw new PronosticError(
      'INVALID_SCORE',
      `Le score « ${label} » ne peut pas dépasser ${SCORING.maxGoals} buts.`
    )
  }

  return goals
}

export type PlayerTotals = {
  played: number
  exact: number
  outcome: number
  missed: number
  points: number
}

/** Taux de réussite : part des pronostics réglés ayant rapporté des points. */
export function successRate(totals: Pick<PlayerTotals, 'played' | 'exact' | 'outcome'>): number {
  if (totals.played === 0) {
    return 0
  }

  return Math.round(((totals.exact + totals.outcome) / totals.played) * 100)
}

/** Moyenne de points par pronostic réglé, arrondie au dixième. */
export function averagePoints(totals: Pick<PlayerTotals, 'played' | 'points'>): number {
  if (totals.played === 0) {
    return 0
  }

  return Math.round((totals.points / totals.played) * 10) / 10
}
