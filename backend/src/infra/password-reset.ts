import { createHash, randomBytes } from 'node:crypto'
import nodemailer from 'nodemailer'
import Database from '../drivers/mysql/mysql'
import { hashPassword } from './password'

let schemaReady: Promise<void> | undefined

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }

    return entities[character]
  })

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

  const safeUrl = escapeHtml(url.toString())
  const logoUrl = escapeHtml(new URL('/logo-email.png', appUrl).toString())

  await transporter.sendMail({
    from,
    to: email,
    subject: 'Réinitialisation de votre mot de passe Bistouclette',
    text: `Pour choisir un nouveau mot de passe, ouvrez ce lien (valable une heure) :\n\n${url.toString()}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet email.`,
    html: `
      <!DOCTYPE html>
      <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Réinitialisation de votre mot de passe</title>
        </head>
        <body style="margin: 0; padding: 32px 16px; background-color: #edf2ff; font-family: Arial, Helvetica, sans-serif; color: #1a2748;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px; margin: 0 auto;">
            <tr>
              <td style="padding: 0 0 18px; text-align: center;">
                <img src="${logoUrl}" width="56" alt="Bistouclette" style="display: inline-block; width: 56px; height: auto; border: 0;">
              </td>
            </tr>
            <tr>
              <td style="overflow: hidden; border: 1px solid #e3e9f5; border-radius: 20px; background-color: #ffffff; box-shadow: 0 12px 32px rgba(26, 39, 72, 0.08);">
                <div style="height: 6px; background: linear-gradient(90deg, #2d5bd9, #e36fb0);"></div>
                <div style="padding: 36px 32px 32px;">
                  <p style="margin: 0 0 10px; color: #5c7df5; font-size: 12px; font-weight: bold; letter-spacing: 1.5px; text-transform: uppercase;">Sécurité du compte</p>
                  <p style="margin: 0 0 26px; color: #52617d; font-size: 16px; line-height: 1.6;">Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.</p>
                  <p style="margin: 0 0 24px; text-align: center;">
                    <a href="${safeUrl}" style="display: inline-block; padding: 14px 26px; border-radius: 999px; background: linear-gradient(135deg, #2d5bd9, #5c7df5); color: #ffffff; font-size: 16px; font-weight: bold; text-decoration: none;">Réinitialiser votre mot de passe</a>
                  </p>
                  <p style="margin: 0 0 8px; color: #6b7891; font-size: 13px; line-height: 1.5;">Ce lien est valable pendant <strong style="color: #1a2748;">une heure</strong>.</p>
                  <p style="margin: 0; color: #6b7891; font-size: 13px; line-height: 1.5;">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :</p>
                  <p style="margin: 8px 0 0; overflow-wrap: anywhere; font-size: 13px; line-height: 1.5;"><a href="${safeUrl}" style="color: #2d5bd9;">${safeUrl}</a></p>
                </div>
                <div style="padding: 20px 32px; border-top: 1px solid #edf0f7; background-color: #f8faff;">
                  <p style="margin: 0; color: #6b7891; font-size: 13px; line-height: 1.6;">Vous n'êtes pas à l'origine de cette demande ? Ignorez simplement cet email. Votre mot de passe restera inchangé.</p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding: 20px 8px 0; color: #8792a8; font-size: 12px; line-height: 1.5; text-align: center;">Bistouclette</td>
            </tr>
          </table>
        </body>
      </html>
    `,
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
