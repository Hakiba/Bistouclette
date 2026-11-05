import './src/infra/load-env'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import { registerRoutes } from './src/infra/http/routes'
import { DiskFileStorage } from './src/drivers/storage/disk-file-storage'

export async function buildServer() {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' })
  await app.register(cors, { origin: process.env.NODE_ENV === 'production' ? false : true })
  await new DiskFileStorage().ensureDir()
  // Limite l'import à un fichier par un et 10Mo par fichier par requête, fileSize est en octets.
  await app.register(multipart, {
    limits: {
      fileSize: Number(process.env.MAX_UPLOAD_MB || 10) * 1024 * 1024,
      files: 1,
    },
  })
  await registerRoutes(app)
  const publicPath = [join(__dirname, 'public'), join(__dirname, '..', 'public')].find(existsSync)
  if (publicPath) await app.register(fastifyStatic, { root: publicPath, wildcard: false })
  if (publicPath) {
    // Export statique Next : /admin doit servir admin.html, sinon 404.html.
    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api')) return reply.code(404).send({ message: 'Not Found' })
      const path = request.url.split('?')[0].replace(/\/+$/, '')
      if (request.method === 'GET' && !path.startsWith('/api') && /^\/[\w-]+$/.test(path)) {
        if (existsSync(join(publicPath, `${path}.html`))) return reply.sendFile(`${path}.html`)
      }
      return reply.code(404).type('text/html').sendFile('404.html')
    })
  }
  return app
}

export async function start() {
  const app = await buildServer()
  await app.listen({ port: Number(process.env.PORT || 3333), host: process.env.HOST || '0.0.0.0' })
  return app
}

// Sous Passenger, require.main n'est pas ce module : le démarrage passe par ../server.js.
if (require.main === module) void start()
