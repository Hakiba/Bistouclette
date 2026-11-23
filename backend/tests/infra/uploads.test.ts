import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test, { after, before } from 'node:test'
import fastifyStatic from '@fastify/static'
import Fastify from 'fastify'
import { registerUploads } from '../../src/infra/http/uploads'

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00])

let root = ''
let uploads = ''
let site = ''

before(async () => {
  root = await mkdtemp(join(tmpdir(), 'bistouclette-static-'))
  uploads = join(root, 'uploads')
  site = join(root, 'site')
  await mkdir(uploads)
  await mkdir(site)
  await writeFile(join(uploads, 'abc.png'), PNG)
  await writeFile(join(root, 'secret.txt'), 'mot de passe')
  await writeFile(join(site, 'index.html'), '<h1>site</h1>')
})

after(async () => {
  await rm(root, { recursive: true, force: true })
})

/** Même ordre que server.ts : l'export statique du site d'abord, les uploads ensuite. */
async function setup() {
  const app = Fastify()
  await app.register(fastifyStatic, { root: site, wildcard: false })
  await registerUploads(app, uploads)
  return app
}

test('sert une photo avec son type, un cache d’un an et nosniff', async () => {
  const app = await setup()

  const response = await app.inject({ method: 'GET', url: '/uploads/abc.png' })

  assert.equal(response.statusCode, 200)
  assert.equal(response.headers['content-type'], 'image/png')
  assert.deepEqual(response.rawPayload, PNG)
  assert.match(String(response.headers['cache-control']), /max-age=31536000/)
  assert.match(String(response.headers['cache-control']), /immutable/)
  assert.equal(response.headers['x-content-type-options'], 'nosniff')
})

test('renvoie 404 pour un fichier inconnu et ne liste pas le dossier', async () => {
  const app = await setup()

  const missing = await app.inject({ method: 'GET', url: '/uploads/absent.png' })
  const folder = await app.inject({ method: 'GET', url: '/uploads/' })

  assert.equal(missing.statusCode, 404)
  // 403 : le dossier existe mais n'est pas servi (index: false) ; 404 serait tout aussi acceptable.
  assert.ok([403, 404].includes(folder.statusCode))
  assert.ok(!folder.body.includes('abc.png'))
})

test('ne sort jamais du dossier d’upload', async () => {
  const app = await setup()

  for (const url of [
    '/uploads/../secret.txt',
    '/uploads/..%2Fsecret.txt',
    '/uploads/%2e%2e/secret.txt',
  ]) {
    const response = await app.inject({ method: 'GET', url })

    assert.notEqual(response.statusCode, 200, url)
    assert.ok(!response.body.includes('mot de passe'), url)
  }
})

test('cohabite avec le site statique déjà enregistré', async () => {
  const app = await setup()

  const page = await app.inject({ method: 'GET', url: '/index.html' })
  const photo = await app.inject({ method: 'GET', url: '/uploads/abc.png' })

  assert.equal(page.statusCode, 200)
  assert.match(page.body, /site/)
  assert.equal(photo.statusCode, 200)
})
