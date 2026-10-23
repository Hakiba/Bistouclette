import { SavePronostic } from 'App/application/use-cases/save-pronostic.use-case'
import { MySqlPronosticRepository } from 'App/drivers/mysql/mysql-pronostic-repository'
import ensureFiveSchema from 'App/drivers/five/five-schema'

/** Composition root : les dépendances techniques restent à la frontière. */
export async function savePronostic(
  userId: number,
  input: Parameters<SavePronostic['execute']>[1]
) {
  await ensureFiveSchema()
  return new SavePronostic(new MySqlPronosticRepository()).execute(userId, input)
}
