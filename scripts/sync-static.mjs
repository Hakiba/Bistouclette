import { cp, mkdir, rm } from 'node:fs/promises'
import { resolve } from 'node:path'

const source = resolve('out')
const destination = resolve('backend/public')

await rm(destination, { recursive: true, force: true })
await mkdir(destination, { recursive: true })
await cp(source, destination, { recursive: true })

console.log(`Front statique copié dans ${destination}`)
