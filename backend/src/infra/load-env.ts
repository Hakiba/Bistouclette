import { existsSync } from 'node:fs'
import { join } from 'node:path'
import dotenv from 'dotenv'

// Doit être importé avant tout module qui lit process.env à l'import (pool MySQL).
const root = join(__dirname, '..', '..')
const envPath = [join(root, '.env'), join(root, '..', '.env')].find(existsSync)
if (envPath) dotenv.config({ path: envPath })
