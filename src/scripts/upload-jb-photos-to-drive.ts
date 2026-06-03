/**
 * upload-jb-photos-to-drive.ts
 * Descarga las fotos de los proyectos GCP seleccionados y las guarda en disco.
 *
 * Estructura de salida:
 *   {OUTPUT_DIR}/GCP/{nombre proyecto}/{fileId}.jpg
 *
 * Uso:
 *   npx tsx src/scripts/upload-jb-photos-to-drive.ts              (descarga real)
 *   npx tsx src/scripts/upload-jb-photos-to-drive.ts --dry-run    (solo lista, no descarga)
 *
 * Luego arrastra la carpeta GCP a Google Drive Desktop para que sincronice.
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import prisma from '../lib/prisma'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

const JB_BASE = 'https://app.jetbrokers.io'
const PAGE_SIZE = 30
const DRY_RUN = process.argv.includes('--dry-run')

// Carpeta de salida — por defecto Desktop/GCP-Fotos
const OUTPUT_DIR = process.env.GCP_OUTPUT_DIR ?? path.join(os.homedir(), 'Desktop', 'GCP-Fotos')

// ── Proyectos seleccionados ───────────────────────────

const SELECTED_SLUGS = [
  'Ejoqol9P', // Almagro Hub
  'Nek4k8rJ', // Carrera IV
  '7APBqUib', // FRANKLIN 358
  'kk3PL5AS', // Independencia 847 Oficinas
  'tPdd0WGN', // Locales Nuevos
  'zMniImEN', // Rengo
  'H3uXKBii', // San Eugenio Etapa II
  'ZUTcafDi', // Santos Dumont 1070 B
  'mdvg21vl', // Santos Dumont 1070 C
  'KH3MGIg5', // Santos Dumont A2
  '94lqa3BT', // Serafin Zamora 22
  'FdxmDT5H', // USADOS ESTACION CENTRAL
  'dqRkmChY', // USADOS MACUL
  'GQ35sIsX', // Vicuña Mackenna 7244
]

// ── Tipos ─────────────────────────────────────────────

type JBFile = {
  id: string
  mime: string
  size: number
  type: string
  details: string | null
}

// ── JetBrokers helpers via curl ───────────────────────

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
  if (DRY_RUN) console.log('🔍  Modo DRY-RUN — no se descarga nada\n')

  // Token desde BD
  const setting = await prisma.setting.findUnique({ where: { key: 'jetbrokers_token' } })
  const token = setting?.value ?? process.env.JETBROKERS_TOKEN ?? ''
  if (!token) throw new Error('No hay token de JetBrokers. Actualiza jetbrokers_token en la BD.')
  console.log(`🔑  Token GCP: ${token.slice(0, 4)}****`)
  console.log(`📁  Salida: ${OUTPUT_DIR}\n`)

  // Verificar token
  const testResult = fetchFilePage('0TlaND3M', 0, token)
  if (testResult.status !== 200) {
    throw new Error(`Token inválido (HTTP ${testResult.status}). Actualiza jetbrokers_token en la BD.`)
  }
  console.log(`✓  Token válido\n`)

  // Proyectos desde BD
  const projects = await prisma.externalProject.findMany({
    where: { source: 'jetbrokers', sourceId: { in: SELECTED_SLUGS } },
    select: { sourceId: true, name: true },
    orderBy: { name: 'asc' },
  })
  console.log(`📦  ${projects.length} proyectos seleccionados\n`)

  if (!DRY_RUN) {
    fs.mkdirSync(path.join(OUTPUT_DIR, 'GCP'), { recursive: true })
  }

  let totalDownloaded = 0, totalSkipped = 0, totalErrors = 0

  for (const project of projects) {
    // Sanitizar nombre de carpeta (quitar caracteres inválidos en filesystem)
    const folderName = project.name.replace(/[/\\:*?"<>|]/g, '-').trim()
    const projectDir = path.join(OUTPUT_DIR, 'GCP', folderName)

    console.log(`\n📂  ${project.name}`)

    if (!DRY_RUN) {
      fs.mkdirSync(projectDir, { recursive: true })
    }

    // Obtener todos los archivos
    process.stdout.write('    Obteniendo lista...')
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
    console.log(`    ${images.length} imágenes`)

    if (DRY_RUN) continue

    for (const file of images) {
      const ext = file.mime.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg'
      const filename = `${file.id}.${ext}`
      const filePath = path.join(projectDir, filename)

      // Saltar si ya existe
      if (fs.existsSync(filePath)) {
        totalSkipped++
        continue
      }

      const buffer = downloadFile(file.id, token)
      if (!buffer || buffer.length === 0) {
        totalErrors++
        continue
      }

      fs.writeFileSync(filePath, buffer)
      totalDownloaded++
      process.stdout.write('.')
    }
    console.log()
  }

  console.log('\n✅  Completado:')
  console.log(`   ${totalDownloaded} imágenes descargadas`)
  console.log(`   ${totalSkipped} ya existían (saltadas)`)
  console.log(`   ${totalErrors} errores`)
  if (!DRY_RUN) {
    console.log(`\n📁  Carpeta: ${path.join(OUTPUT_DIR, 'GCP')}`)
    console.log('   Arrastra esa carpeta a Google Drive Desktop para sincronizar.')
  }
}

main().finally(() => prisma.$disconnect())
