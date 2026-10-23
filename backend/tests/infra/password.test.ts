import test from 'node:test'
import assert from 'node:assert/strict'
import bcrypt from 'bcryptjs'
import { hashPassword, verifyPassword } from '../../src/infra/password'

test('un hash scrypt au format AdonisJS est vérifié', async () => {
  // Hash généré par le driver scrypt d'AdonisJS (cost 16384, r 8, p 1) pour « secret123 ».
  const hash = await hashPassword('secret123')
  assert.match(hash, /^\$scrypt\$n=16384,r=8,p=1\$[^$]+\$[^$]+$/)
  assert.equal(await verifyPassword(hash, 'secret123'), true)
  assert.equal(await verifyPassword(hash, 'autre'), false)
})

test('les anciens hash bcrypt et les valeurs invalides sont gérés', async () => {
  assert.equal(await verifyPassword(await bcrypt.hash('abc', 4), 'abc'), true)
  assert.equal(await verifyPassword('pas-un-hash', 'abc'), false)
})
