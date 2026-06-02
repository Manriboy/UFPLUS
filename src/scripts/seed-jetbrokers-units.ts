// src/scripts/seed-jetbrokers-units.ts
// Siembra todas las unidades de JetBrokers usando Puppeteer (una sesión continua).
// IMPORTANTE: Cierra JetBrokers en tu navegador antes de correr este script.
// El script usa TU cuenta pero desde una ventana headless dedicada.
// Run: npx tsx src/scripts/seed-jetbrokers-units.ts
import { config } from 'dotenv'
config({ path: '.env.local' })

import prisma from '../lib/prisma'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const JB_BASE = 'https://app.jetbrokers.io'

async function main() {
  const email = process.env.JETBROKERS_EMAIL
  const password = process.env.JETBROKERS_PASSWORD
  if (!email || !password) {
    console.error('❌  Faltan JETBROKERS_EMAIL y JETBROKERS_PASSWORD en .env.local')
    process.exit(1)
  }

  const puppeteer = await import('puppeteer-core')
  const browser = await puppeteer.default.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  let token: string | null = null

  try {
    const page = await browser.newPage()
    console.log('🔐 Iniciando sesión en JetBrokers...')

    // Capturar token del login
    page.on('response', async res => {
      if (!res.url().includes('/api/auth/login')) return
      try {
        const b = await res.json()
        if (b?.token) token = b.token
      } catch {}
    })

    await page.goto(JB_BASE, { waitUntil: 'networkidle2', timeout: 25000 })
    await page.waitForSelector('input[type="text"]', { timeout: 10000 })

    await page.evaluate((em, pw) => {
      const inputs = document.querySelectorAll('input')
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
      setter.call(inputs[0], em); inputs[0].dispatchEvent(new Event('input', { bubbles: true }))
      setter.call(inputs[1], pw); inputs[1].dispatchEvent(new Event('input', { bubbles: true }))
    }, email, password)

    await (await page.$('button'))!.click()
    await new Promise(r => setTimeout(r, 5000))

    if (!token) {
      token = await page.evaluate(() => {
        const raw = localStorage.getItem('broker-storage_broker-user-token')
        try { return JSON.parse(raw ?? '') } catch { return raw }
      })
    }

    if (!token) throw new Error('No se pudo obtener el token de sesión')
    console.log(`✓  Sesión activa (token: ${token.slice(0, 4)}****)`)

    // Guardar token en BD
    await prisma.setting.upsert({
      where: { key: 'jetbrokers_token' },
      create: { key: 'jetbrokers_token', value: token },
      update: { value: token },
    })
    process.env.JETBROKERS_TOKEN = token

    // Fetch unidades desde la MISMA sesión de Puppeteer (evita multiLogin)
    const projects = await prisma.externalProject.findMany({
      where: { source: 'jetbrokers' },
      select: { id: true, sourceId: true, name: true },
      orderBy: { name: 'asc' },
    })

    console.log(`\n📦 Sembrando unidades para ${projects.length} proyectos...\n`)
    let ok = 0, empty = 0, errors = 0, totalUnits = 0

    for (let i = 0; i < projects.length; i++) {
      const ep = projects[i]

      try {
        // Usar la API directamente con el token activo de esta sesión
        const res = await fetch(`${JB_BASE}/api/marketplace/units-search/${Date.now()}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            device: 'w',
            'jet-brokers-version': '7.42.2',
          },
          body: JSON.stringify({
            tipologies: [], type: null, order: 'ASC', models: [], facings: [],
            projectId: ep.sourceId, availability: 'all', number: null, element: 0, elements: 9999,
          }),
          signal: AbortSignal.timeout(15000),
        })

        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as Record<string, unknown>
          const errMsg = (body?.error as Record<string, unknown>)?.message ?? res.status
          if (String(errMsg).includes('multiLogin')) {
            console.error('\n❌  multiLogin: alguien abrió JetBrokers en el navegador. Ciérralo y vuelve a correr el script.')
            break
          }
          console.log(`  ✗  ${ep.name} (${res.status})`)
          errors++
          continue
        }

        const data = await res.json()
        const apartments: unknown[] = Array.isArray(data.apartments) ? data.apartments : []

        if (apartments.length === 0) { empty++; continue }

        for (const apt of apartments) {
          const a = apt as Record<string, unknown>
          const model = (a.apartmentModel ?? {}) as Record<string, unknown>
          const sourceId = String(a.id ?? '')
          if (!sourceId) continue

          await prisma.externalUnit.upsert({
            where: { source_sourceId: { source: 'jetbrokers', sourceId } },
            create: {
              projectId: ep.id, source: 'jetbrokers', sourceId,
              number: String(a.number ?? ''), model: String(model.name ?? ''),
              bedrooms: Number(model.rooms ?? 0) || null,
              bathrooms: Number(model.bathrooms ?? 0) || null,
              m2Interior: parseFloat(String(a.surfaceInterior ?? '0')) || null,
              m2Terrace: parseFloat(String(a.surfaceTerrace ?? '0')) || null,
              facing: a.facing ? String(a.facing) : null,
              price: parseFloat(String(a.price ?? '0')) || null,
              finalPrice: parseFloat(String(a.finalPrice ?? '0')) || null,
              discountPct: parseFloat(String(a.discountRate ?? '0')) || null,
              bonoPie: a.bonoPie ? parseFloat(String(a.bonoPie)) || null : null,
              available: Boolean(a.available),
              rawData: a as object,
            },
            update: {
              model: String(model.name ?? ''),
              price: parseFloat(String(a.price ?? '0')) || null,
              finalPrice: parseFloat(String(a.finalPrice ?? '0')) || null,
              discountPct: parseFloat(String(a.discountRate ?? '0')) || null,
              bonoPie: a.bonoPie ? parseFloat(String(a.bonoPie)) || null : null,
              available: Boolean(a.available),
            },
          })
        }

        ok++
        totalUnits += apartments.length
        console.log(`  ✓  ${ep.name} (${apartments.length} unidades)`)
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        if (msg.includes('abort') || msg.includes('timeout')) {
          console.log(`  ⏱  ${ep.name} (timeout — se omite)`)
        } else {
          console.log(`  ✗  ${ep.name}: ${msg.slice(0, 60)}`)
        }
        errors++
      }

      if ((i + 1) % 20 === 0) console.log(`\n  ── ${i + 1}/${projects.length} ──\n`)
      await new Promise(r => setTimeout(r, 500))
    }

    console.log(`\n✅  Listo:`)
    console.log(`  ${ok} proyectos con unidades (${totalUnits} unidades totales)`)
    console.log(`  ${empty} proyectos sin unidades`)
    console.log(`  ${errors} errores/timeouts`)
    console.log('\n⚠️  Puedes volver a abrir JetBrokers en tu navegador.')

  } finally {
    await browser.close()
    await prisma.$disconnect()
  }
}

main().catch(e => { console.error('Error:', e.message); process.exit(1) })
