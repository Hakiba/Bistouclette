import { createHash, randomBytes } from 'node:crypto'
import nodemailer from 'nodemailer'
import Database from '../drivers/mysql/mysql'
import { hashPassword } from './password'

let schemaReady: Promise<void> | undefined

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

export function ensurePasswordResetSchema() {
  if (!schemaReady) {
    schemaReady = Database.rawQuery(
      `
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        token_hash CHAR(64) NOT NULL PRIMARY KEY,
        user_id INT NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX password_reset_tokens_user_index (user_id),
        INDEX password_reset_tokens_expiry_index (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `
    )
      .then(() => undefined)
      .catch((cause) => {
        schemaReady = undefined
        throw cause
      })
  }

  return schemaReady
}

export async function createPasswordResetToken(email: string) {
  const [rows] = await Database.rawQuery('SELECT id, email FROM users WHERE email = ? LIMIT 1', [
    email,
  ])
  const user = (rows as { id: number; email: string }[])[0]

  if (!user) return null

  const token = randomBytes(32).toString('base64url')
  await Database.transaction(async (transaction) => {
    await transaction.rawQuery('DELETE FROM password_reset_tokens WHERE user_id = ?', [user.id])
    await transaction.rawQuery(
      'INSERT INTO password_reset_tokens (token_hash, user_id, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))',
      [hashToken(token), user.id]
    )
  })

  return { email: user.email, token }
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const host = process.env.SMTP_HOST
  const from = process.env.MAIL_FROM
  const appUrl = process.env.APP_URL

  if (!host || !from || !appUrl) {
    throw new Error(
      'SMTP_HOST, MAIL_FROM et APP_URL doivent être configurés pour envoyer un email.'
    )
  }

  const url = new URL('/reset-password', appUrl)
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    (process.env.NODE_ENV === 'production' && url.protocol !== 'https:')
  ) {
    throw new Error('APP_URL doit être une URL HTTP valide, et HTTPS en production.')
  }

  url.searchParams.set('token', token)
  const port = Number(process.env.SMTP_PORT || 587)
  const secure = process.env.SMTP_SECURE === 'true'
  const user = process.env.SMTP_USER
  const password = process.env.SMTP_PASSWORD
  if ((user && !password) || (!user && password)) {
    throw new Error('SMTP_USER et SMTP_PASSWORD doivent être configurés ensemble.')
  }
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    ...(user && password ? { auth: { user, pass: password } } : {}),
  })

  await transporter.sendMail({
    from,
    to: email,
    subject: 'Réinitialisation de votre mot de passe Bistouclette',
    text: `Pour choisir un nouveau mot de passe, ouvrez ce lien (valable une heure) :\n\n${url.toString()}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet email.`,
  })
}

export async function resetPassword(token: string, password: string) {
  const tokenHash = hashToken(token)
  const [rows] = await Database.rawQuery(
    'SELECT user_id FROM password_reset_tokens WHERE token_hash = ? AND expires_at > NOW() LIMIT 1',
    [tokenHash]
  )

  if (!(rows as { user_id: number }[]).length) return false

  const passwordHash = await hashPassword(password)

  return Database.transaction(async (transaction) => {
    const [validTokens] = await transaction.rawQuery(
      'SELECT user_id FROM password_reset_tokens WHERE token_hash = ? AND expires_at > NOW() LIMIT 1 FOR UPDATE',
      [tokenHash]
    )
    const reset = (validTokens as { user_id: number }[])[0]

    if (!reset) return false

    await transaction.rawQuery('UPDATE users SET password = ? WHERE id = ?', [
      passwordHash,
      reset.user_id,
    ])
    await transaction.rawQuery('DELETE FROM password_reset_tokens WHERE user_id = ?', [
      reset.user_id,
    ])
    await transaction.rawQuery('DELETE FROM api_tokens WHERE user_id = ?', [reset.user_id])
    return true
  })
}
