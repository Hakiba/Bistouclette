import { access, copyFile, cp, mkdir, rm } from 'node:fs/promises'
import { resolve } from 'node:path'

const source = resolve('backend/public')
const destination = resolve('backend/build/public')

await rm(destination, { recursive: true, force: true })
await mkdir(destination, { recursive: true })
await cp(source, destination, { recursive: true })

console.log(`Front prêt pour Passenger dans ${destination}`)

// Le build ne copie pas le .env : sans lui, le serveur échoue au démarrage et Passenger renvoie
// « Web application could not be started ».
const envSource = resolve('backend/.env')
const envDestination = resolve('backend/build/.env')

try {
  await access(envSource)
  await copyFile(envSource, envDestination)
  console.log(`Configuration copiée dans ${envDestination}`)
} catch {
  console.warn(
    `ATTENTION : ${envSource} est introuvable, ${envDestination} n'a pas été écrit.\n` +
      "Le serveur ne démarrera pas tant que ce fichier n'existe pas (cp backend/.env.example backend/.env).",
  )
}
