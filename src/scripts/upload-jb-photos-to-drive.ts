/**
 * upload-jb-photos-to-drive.ts
 * Descarga las fotos de los proyectos GCP (JetBrokers) y las sube a Google Drive.
 *
 * Estructura que crea en Drive:
 *   {DRIVE_PARENT_FOLDER_ID}/
 *     GCP/
 *       {nombre proyecto}/
 *         {fileId}.jpg
 *
 * Requisitos:
 *   - JETBROKERS_EMAIL + JETBROKERS_PASSWORD en .env.local
 *   - GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY (o GOOGLE_CREDENTIALS_BASE64)
 *   - DRIVE_PARENT_FOLDER_ID en .env.local (ID de la carpeta raíz en Drive, opcional — si no se indica se crea en My Drive)
 *   - Service Account con scope "drive" (no solo drive.readonly)
 *
 * Uso:
 *   npx tsx src/scripts/upload-jb-photos-to-drive.ts
 *   npx tsx src/scripts/upload-jb-photos-to-drive.ts --dry-run   (solo lista archivos, no sube)
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import prisma from '../lib/prisma'
import { google } from 'googleapis'
import { Readable } from 'stream'
import { execSync } from 'child_process'

const JB_BASE = 'https://app.jetbrokers.io'
const PAGE_SIZE = 30
const DRY_RUN = process.argv.includes('--dry-run')

// ── Tipos ─────────────────────────────────────────────

type JBFile = {
  id: string
  mime: string
  size: number
  type: string
  details: string | null
}

// ── Google Drive auth ─────────────────────────────────

function getDriveAuth() {
  const b64 = process.env.GOOGLE_CREDENTIALS_BASE64
  if (b64) {
    const credentials = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'))
    return new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/drive'] })
  }
  const raw = process.env.GOOGLE_PRIVATE_KEY
  if (!raw || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
    throw new Error('Faltan credenciales de Google. Define GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY en .env.local')
  }
  const privateKey = raw.replace(/\\n/g, '\n').replace(/\r\n/g, '\n').replace(/^["']|["']$/g, '')
  return new google.auth.GoogleAuth({
    credentials: { client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, private_key: privateKey },
    scopes: ['https://www.googleapis.com/auth/drive'],
  })
}

// ── Drive helpers ─────────────────────────────────────

async function findOrCreateFolder(drive: ReturnType<typeof google.drive>, name: string, parentId?: string): Promise<string> {
  const q = [
    `name = '${name.replace(/'/g, "\\'")}'`,
    `mimeType = 'application/vnd.google-apps.folder'`,
    `trashed = false`,
    parentId ? `'${parentId}' in parents` : `'root' in parents`,
  ].join(' and ')

  const list = await drive.files.list({ q, fields: 'files(id,name)', pageSize: 1 })
  if (list.data.files && list.data.files.length > 0) {
    return list.data.files[0].id!
  }

  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : undefined,
    },
    fields: 'id',
  })
  return created.data.id!
}

async function fileExistsInFolder(drive: ReturnType<typeof google.drive>, filename: string, folderId: string): Promise<boolean> {
  const q = `name = '${filename}' and '${folderId}' in parents and trashed = false`
  const list = await drive.files.list({ q, fields: 'files(id)', pageSize: 1 })
  return !!(list.data.files && list.data.files.length > 0)
}

async function uploadToDrive(
  drive: ReturnType<typeof google.drive>,
  buffer: Buffer,
  filename: string,
  mimeType: string,
  folderId: string
): Promise<void> {
  const stream = Readable.from(buffer)
  await drive.files.create({
    requestBody: { name: filename, parents: [folderId] },
    media: { mimeType, body: stream },
    fields: 'id',
  })
}

// ── JetBrokers helpers ────────────────────────────────

// File listing: usa curl (funciona server-side, probado con éxito)
function fetchFilePage(slug: string, pageNum: number, token: string): { files: JBFile[]; status: number } {
  try {
    const out = execSync(
      `curl -s -w "\\n%{http_code}" ` +
      `'${JB_BASE}/api/marketplace/files/${slug}/${pageNum}' ` +
      `-H 'Authorization: Bearer ${token}' ` +
      `-H 'device: w' ` +
      `-H 'jet-brokers-version: 7.43.1' ` +
      `-H 'Accept: application/json' ` +
      `-H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'`,
      { timeout: 15000 }
    ).toString()
    const lines = out.trim().split('\n')
    const statusCode = parseInt(lines.pop() ?? '0', 10)
    const body = lines.join('\n')
    if (statusCode !== 200) return { files: [], status: statusCode }
    const d = JSON.parse(body) as { files?: JBFile[] }
    return { files: d.files ?? [], status: 200 }
  } catch {
    return { files: [], status: 0 }
  }
}

// File download: usa curl también
function downloadFile(fileId: string, token: string): Buffer | null {
  try {
    const buf = execSync(
      `curl -s --max-time 30 ` +
      `'${JB_BASE}/api/marketplace/file/${fileId}' ` +
      `-H 'Authorization: Bearer ${token}' ` +
      `-H 'device: w' ` +
      `-H 'jet-brokers-version: 7.43.1' ` +
      `-H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'`,
      { timeout: 35000, maxBuffer: 20 * 1024 * 1024 }
    )
    return buf.length > 0 ? buf : null
  } catch {
    return null
  }
}

// ── Main ──────────────────────────────────────────────

async function main() {
  if (DRY_RUN) console.log('🔍  Modo DRY-RUN — no se sube nada a Drive\n')

  // 1. Token desde BD (no usamos login Puppeteer — JetBrokers bloquea headless)
  const setting = await prisma.setting.findUnique({ where: { key: 'jetbrokers_token' } })
  const token = setting?.value ?? process.env.JETBROKERS_TOKEN ?? ''
  if (!token) throw new Error('No hay token de JetBrokers. Corre primero el daily sync de GCP.')
  console.log(`🔑  Token GCP: ${token.slice(0, 4)}****\n`)

  // 2. Proyectos GCP con acceso (los que tienen unidades)
  const projects = await prisma.externalProject.findMany({
    where: { source: 'jetbrokers', units: { some: { available: true } } },
    select: { sourceId: true, name: true },
    orderBy: { name: 'asc' },
  })
  console.log(`📦  ${projects.length} proyectos GCP con acceso\n`)

  // 3. Google Drive
  let drive: ReturnType<typeof google.drive> | null = null
  let gcpFolderId = ''

  if (!DRY_RUN) {
    const auth = getDriveAuth()
    drive = google.drive({ version: 'v3', auth })
    const parentId = process.env.DRIVE_PARENT_FOLDER_ID ?? undefined
    console.log('📁  Creando/localizando carpeta GCP en Drive...')
    gcpFolderId = await findOrCreateFolder(drive, 'GCP', parentId)
    console.log(`    Carpeta GCP: ${gcpFolderId}\n`)
  }

  // 4. Verificar token con curl
  console.log('🌐  Verificando acceso a JetBrokers...')
  const testResult = fetchFilePage('0TlaND3M', 0, token)
  console.log(`    HTTP ${testResult.status} · ${testResult.files.length} archivos en proyecto de prueba\n`)
  if (testResult.status !== 200) {
    throw new Error(`Token inválido (HTTP ${testResult.status}). Actualiza jetbrokers_token en la BD.`)
  }

  try {
    // 5. Procesar cada proyecto
    let totalUploaded = 0, totalSkipped = 0, totalErrors = 0

    for (const project of projects) {
      console.log(`\n📂  ${project.name} (${project.sourceId})`)

      // Crear carpeta del proyecto en Drive
      let projectFolderId = ''
      if (!DRY_RUN && drive) {
        projectFolderId = await findOrCreateFolder(drive, project.name, gcpFolderId)
      }

      // Obtener todas las páginas de archivos (desde browser Puppeteer)
      process.stdout.write('    Obteniendo lista de archivos...')
      const allFiles: JBFile[] = []
      let pageNum = 0
      while (true) {
        const { files, status } = fetchFilePage(project.sourceId, pageNum, token)
        if (files.length === 0) {
          if (pageNum === 0 && status !== 200) process.stdout.write(` [HTTP ${status}]`)
          break
        }
        allFiles.push(...files)
        process.stdout.write(` ${allFiles.length}`)
        if (files.length < PAGE_SIZE) break
        pageNum++
      }
      console.log()

      const images = allFiles.filter(f => f.mime.startsWith('image/'))
      console.log(`    ${images.length} imágenes (de ${allFiles.length} archivos totales)`)

      if (DRY_RUN) {
        const byType: Record<string, number> = {}
        for (const f of allFiles) byType[f.type] = (byType[f.type] ?? 0) + 1
        console.log('    Tipos:', JSON.stringify(byType))
        continue
      }

      // Descargar (browser) y subir (Drive) cada imagen
      for (const file of images) {
        const ext = file.mime.split('/')[1] ?? 'jpg'
        const filename = `${file.id}.${ext}`

        if (await fileExistsInFolder(drive!, filename, projectFolderId)) {
          totalSkipped++
          continue
        }

        const buffer = downloadFile(file.id, token)
        if (!buffer || buffer.length === 0) {
          console.log(`    ✗ Error descargando ${file.id}`)
          totalErrors++
          continue
        }

        try {
          await uploadToDrive(drive!, buffer, filename, file.mime, projectFolderId)
          totalUploaded++
          process.stdout.write('.')
        } catch (e) {
          console.log(`\n    ✗ Error subiendo ${filename}: ${(e as Error).message}`)
          totalErrors++
        }

        await new Promise(r => setTimeout(r, 200))
      }
      if (!DRY_RUN) console.log()
    }

    console.log('\n✅  Completado:')
    console.log(`   ${totalUploaded} imágenes subidas`)
    console.log(`   ${totalSkipped} ya existían (saltadas)`)
    console.log(`   ${totalErrors} errores`)
    if (!DRY_RUN) console.log(`\n   Carpeta Drive: https://drive.google.com/drive/folders/${gcpFolderId}`)

  } finally {
    await prisma.$disconnect()
  }
}

main().catch(e => { console.error('\n❌ Error:', e.message); process.exit(1) })
