import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import Database from '../drivers/mysql/mysql'

export type AuthUser = {
  id: number
  username: string
  firstName: string
  lastName: string
  email: string
  role: string
}

const safeEqual = (a: string, b: string) =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))

const hash = (token: string) => createHash('sha256').update(token).digest('hex')

// Même format et même table (api_tokens) que le driver « oat » d'AdonisJS :
// jeton public « base64url(id).secret », seul le sha256 du secret est stocké.
const TOKEN_LENGTH = 60
const TOKEN_TYPE = 'api'
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

function randomSecret(): string {
  const bytes = randomBytes(TOKEN_LENGTH * 2)
  let secret = ''
  for (const byte of bytes) {
    if (byte < 248 && secret.length < TOKEN_LENGTH) secret += ALPHABET[byte % ALPHABET.length]
  }
  return secret.length === TOKEN_LENGTH ? secret : randomSecret()
}

function parseToken(header?: string) {
  const token = header?.replace(/^Bearer\s+/i, '').trim()
  const parts = token?.split('.')
  if (!parts || parts.length !== 2 || parts[1].length !== TOKEN_LENGTH) return null
  const id = Buffer.from(parts[0], 'base64url').toString()
  return /^\d+$/.test(id) ? { id, hash: hash(parts[1]) } : null
}

export async function issueToken(userId: number) {
  const secret = randomSecret()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const [result] = await Database.rawQuery(
    `INSERT INTO api_tokens (user_id, name, type, token, expires_at, created_at)
    VALUES (?, 'Opaque Access Token', ?, ?, ?, NOW())`,
    [userId, TOKEN_TYPE, hash(secret), expiresAt]
  )
  const id = String((result as { insertId: number }).insertId)
  return {
    type: 'bearer',
    token: `${Buffer.from(id).toString('base64url')}.${secret}`,
    expires_at: expiresAt.toISOString(),
  }
}

export async function findUserByToken(header?: string): Promise<AuthUser | null> {
  const parsed = parseToken(header)
  if (!parsed) return null
  const [rows] = await Database.rawQuery(
    `SELECT u.id, u.username, u.first_name, u.last_name, u.email, u.role, t.token, t.expires_at
    FROM api_tokens t JOIN users u ON u.id = t.user_id
    WHERE t.id = ? AND t.type = ? LIMIT 1`,
    [parsed.id, TOKEN_TYPE]
  )
  const row = (rows as any[])[0]
  if (!row || !safeEqual(String(row.token), parsed.hash)) return null
  if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) return null
  return {
    id: Number(row.id),
    username: row.username || '',
    firstName: row.first_name || '',
    lastName: row.last_name || '',
    email: row.email || '',
    role: row.role || 'user',
  }
}

export async function revokeToken(header?: string) {
  const parsed = parseToken(header)
  if (!parsed) return
  await Database.rawQuery('DELETE FROM api_tokens WHERE id = ? AND type = ? AND token = ?', [
    parsed.id,
    TOKEN_TYPE,
    parsed.hash,
  ])
}
