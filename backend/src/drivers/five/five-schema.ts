import Database from '../mysql/mysql'
import { pointsFor } from 'App/domain/pronostics/pronostic-rules'

/*
|--------------------------------------------------------------------------
| Schéma du Five
|--------------------------------------------------------------------------
|
| Le schéma est garanti au démarrage, de façon idempotente : création des tables
| manquantes, ajout des colonnes manquantes et reprise des anciennes données.
|
*/

let ensured: Promise<void> | null = null

const MONTHS_FR: Record<string, number> = {
  janv: 1,
  jan: 1,
  fevr: 2,
  fev: 2,
  mars: 3,
  avr: 4,
  mai: 5,
  juin: 6,
  juil: 7,
  aout: 8,
  sept: 9,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
}

function stripAccents(value: string) {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/**
 * Reprend les anciens libellés texte (« Mercredi 9 oct. » + « 18h30 », ou
 * « 2025-10-09 » + « 18:30 ») pour alimenter la colonne `kickoff_at`.
 * Renvoie `null` quand le libellé est illisible : l'appelant choisit alors
 * une date de repli que l'administrateur pourra corriger.
 */
export function parseLegacyKickoff(
  dateLabel: string | null,
  timeLabel: string | null,
  reference: Date = new Date()
): Date | null {
  if (!dateLabel) {
    return null
  }

  const time = String(timeLabel || '').match(/(\d{1,2})\s*[h:]\s*(\d{2})?/)
  const hours = time ? Number(time[1]) : 0
  const minutes = time && time[2] ? Number(time[2]) : 0

  const iso = dateLabel.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (iso) {
    return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), hours, minutes)
  }

  const french = stripAccents(dateLabel.toLowerCase()).match(/(\d{1,2})\s+([a-z]+)/)
  if (!french) {
    return null
  }

  const month = MONTHS_FR[french[2].slice(0, 4)] || MONTHS_FR[french[2].slice(0, 3)]
  if (!month) {
    return null
  }

  const day = Number(french[1])
  const candidate = new Date(reference.getFullYear(), month - 1, day, hours, minutes)

  // Un libellé sans année désigne la saison en cours : si la date tombe plus
  // de six mois en arrière, c'est qu'elle appartient à l'année suivante.
  if (candidate.getTime() < reference.getTime() - 182 * 24 * 3600 * 1000) {
    candidate.setFullYear(reference.getFullYear() + 1)
  }

  return candidate
}

async function rows(sql: string, bindings: any[] = []): Promise<any[]> {
  const result = await Database.rawQuery(sql, bindings)
  return (result[0] || result) as any[]
}

async function tableExists(table: string): Promise<boolean> {
  const found = await rows(
    `SELECT TABLE_NAME AS name FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [table]
  )

  return found.length > 0
}

async function existingColumns(table: string): Promise<Set<string>> {
  const found = await rows(
    `SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [table]
  )

  return new Set(found.map((row) => row.name))
}

async function addMissingColumns(table: string, columns: Record<string, string>) {
  const present = await existingColumns(table)

  for (const [name, definition] of Object.entries(columns)) {
    if (!present.has(name)) {
      await Database.rawQuery(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`)
    }
  }

  return present
}

async function createTables() {
  await Database.rawQuery(`
    CREATE TABLE IF NOT EXISTS five_matches (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      kickoff_at DATETIME NULL,
      home VARCHAR(128) NOT NULL,
      away VARCHAR(128) NOT NULL,
      venue VARCHAR(255) NOT NULL DEFAULT '',
      coefficient DECIMAL(5,2) NOT NULL DEFAULT 1,
      score_home INT NULL,
      score_away INT NULL,
      status VARCHAR(16) NOT NULL DEFAULT 'scheduled',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX five_matches_kickoff_index (kickoff_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)

  // Un pronostic par joueur et par match. `points` reste NULL tant que le
  // résultat n'a pas été saisi : on distingue « pas encore réglé » de « 0 point ».
  await Database.rawQuery(`
    CREATE TABLE IF NOT EXISTS five_pronostics (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      match_id VARCHAR(64) NOT NULL,
      score_home INT NOT NULL,
      score_away INT NOT NULL,
      points DECIMAL(10,2) NULL,
      settled_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY five_pronostics_user_match_unique (user_id, match_id),
      INDEX five_pronostics_match_index (match_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
}

async function migrateMatches() {
  const present = await addMissingColumns('five_matches', {
    kickoff_at: 'DATETIME NULL',
    venue: "VARCHAR(255) NOT NULL DEFAULT ''",
    coefficient: 'DECIMAL(5,2) NOT NULL DEFAULT 1',
    score_home: 'INT NULL',
    score_away: 'INT NULL',
    status: "VARCHAR(16) NOT NULL DEFAULT 'scheduled'",
    created_at: 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
    updated_at: 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
  })

  if (present.has('coefficient')) {
    await Database.rawQuery(
      'ALTER TABLE five_matches MODIFY coefficient DECIMAL(5,2) NOT NULL DEFAULT 1'
    )
  }

  if (present.has('points')) {
    await Database.rawQuery('ALTER TABLE five_pronostics MODIFY points DECIMAL(10,2) NULL')
  }

  if (present.has('date_label') || present.has('time_label')) {
    // Les libellés texte ne sont plus écrits : on les rend facultatifs pour que
    // les nouvelles insertions passent, puis on reprend leur contenu.
    for (const [column, definition] of [
      ['date_label', 'VARCHAR(128) NULL'],
      ['time_label', 'VARCHAR(64) NULL'],
    ]) {
      if (present.has(column)) {
        await Database.rawQuery(`ALTER TABLE five_matches MODIFY ${column} ${definition}`)
      }
    }

    const legacy = await rows(
      'SELECT id, date_label, time_label FROM five_matches WHERE kickoff_at IS NULL'
    )

    for (const row of legacy) {
      const kickoff = parseLegacyKickoff(row.date_label, row.time_label) || new Date()
      await Database.rawQuery('UPDATE five_matches SET kickoff_at = ? WHERE id = ?', [
        kickoff,
        row.id,
      ])
    }
  }

  // Filet de sécurité pour les lignes créées sans libellé exploitable, puis
  // la colonne devient obligatoire : plus aucun match sans coup d'envoi.
  await Database.rawQuery('UPDATE five_matches SET kickoff_at = NOW() WHERE kickoff_at IS NULL')
  await Database.rawQuery('ALTER TABLE five_matches MODIFY kickoff_at DATETIME NOT NULL')

  // Les anciens statuts ne connaissaient que « scheduled » et « played ».
  await Database.rawQuery(
    `UPDATE five_matches SET status = 'finished' WHERE status NOT IN ('scheduled','live','finished','cancelled')`
  )

  // Les cotes appartenaient au système de paris. Le jeu de pronostics n'en a
  // pas, et ces colonnes étaient NOT NULL : les garder bloquerait toute
  // nouvelle insertion.
  for (const column of ['odds_home', 'odds_draw', 'odds_away']) {
    if (present.has(column)) {
      await Database.rawQuery(`ALTER TABLE five_matches DROP COLUMN ${column}`)
    }
  }
}

/**
 * Reprend les paris de l'ancien système en pronostics : un pari « domicile »
 * devient un 1-0, un « nul » un 1-1, un « extérieur » un 0-1. Le joueur garde
 * une trace de sa participation, et le barème s'applique ensuite normalement.
 */
async function migrateLegacyBets() {
  if (!(await tableExists('five_bets'))) {
    return
  }

  const [{ total }] = await rows('SELECT COUNT(*) AS total FROM five_pronostics')

  if (Number(total) > 0) {
    return
  }

  await Database.rawQuery(`
    INSERT IGNORE INTO five_pronostics (user_id, match_id, score_home, score_away, created_at)
    SELECT user_id, match_id,
           CASE prediction WHEN 'home' THEN 1 WHEN 'draw' THEN 1 ELSE 0 END,
           CASE prediction WHEN 'home' THEN 0 WHEN 'draw' THEN 1 ELSE 1 END,
           created_at
    FROM five_bets
  `)
}

/**
 * Attribue les points des pronostics rattachés à un match déjà terminé mais
 * pas encore réglé (reprise de données, ou résultat saisi avant la mise à
 * jour). Le barème reste celui de `pronostic-rules`.
 */
async function settlePendingPoints() {
  const pending = await rows(`
    SELECT p.id, p.score_home, p.score_away, m.score_home AS result_home,
           m.score_away AS result_away, m.coefficient
    FROM five_pronostics p
    JOIN five_matches m ON m.id = p.match_id
    WHERE p.points IS NULL AND m.status = 'finished'
      AND m.score_home IS NOT NULL AND m.score_away IS NOT NULL
  `)

  for (const row of pending) {
    const points = pointsFor(
      { scoreHome: Number(row.score_home), scoreAway: Number(row.score_away) },
      { scoreHome: Number(row.result_home), scoreAway: Number(row.result_away) },
      Number(row.coefficient || 1)
    )

    await Database.rawQuery(
      'UPDATE five_pronostics SET points = ?, settled_at = NOW() WHERE id = ?',
      [points, row.id]
    )
  }
}

/** Garantit le schéma une seule fois par processus. */
export default function ensureFiveSchema(): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      await createTables()
      await migrateMatches()
      await migrateLegacyBets()
      await settlePendingPoints()
    })().catch((error) => {
      ensured = null
      throw error
    })
  }

  return ensured
}
