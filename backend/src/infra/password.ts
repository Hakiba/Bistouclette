import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import bcrypt from 'bcryptjs'

// Format PHC identique au driver scrypt d'AdonisJS : $scrypt$n=..,r=..,p=..$sel$hash
const COST = 16384
const BLOCK_SIZE = 8
const PARALLELIZATION = 1
const SALT_SIZE = 16
const KEY_LENGTH = 64

const b64 = (value: Buffer) => value.toString('base64').replace(/=+$/, '')

function derive(
  password: string,
  salt: Buffer,
  keyLength: number,
  n: number,
  r: number,
  p: number
) {
  return new Promise<Buffer>((resolve, reject) =>
    scrypt(password, salt, keyLength, { N: n, r, p, maxmem: 128 * n * r * 2 }, (error, key) =>
      error ? reject(error) : resolve(key)
    )
  )
}

export async function hashPassword(password: string) {
  const salt = randomBytes(SALT_SIZE)
  const key = await derive(password, salt, KEY_LENGTH, COST, BLOCK_SIZE, PARALLELIZATION)
  return `$scrypt$n=${COST},r=${BLOCK_SIZE},p=${PARALLELIZATION}$${b64(salt)}$${b64(key)}`
}

export async function verifyPassword(stored: string, password: string) {
  if (/^\$2[abxy]\$/.test(stored)) return bcrypt.compare(password, stored)
  const [, id, params, salt, hash] = stored.split('$')
  if (id !== 'scrypt' || !params || !salt || !hash) return false
  const values = Object.fromEntries(params.split(',').map((part) => part.split('=')))
  const n = Number(values.n)
  const r = Number(values.r)
  const p = Number(values.p)
  if (![n, r, p].every(Number.isInteger)) return false
  const expected = Buffer.from(hash, 'base64')
  const key = await derive(password, Buffer.from(salt, 'base64'), expected.length, n, r, p)
  return timingSafeEqual(expected, key)
}
