// src/app/api/admin/external/sync/jetbrokers/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { assignAndMergeCanonical } from '@/lib/canonical-merge'

const JB_BASE = 'https://app.jetbrokers.io/api'
const JB_VERSION = '7.42.0'

const FACING_MAP: Record<string, string> = {
  west: 'Poniente', east: 'Oriente', north: 'Norte', south: 'Sur',
  northwest: 'Nor-Poniente', northeast: 'Nor-Oriente',
  southwest: 'Sur-Poniente', southeast: 'Sur-Oriente',
}

type StoreCard = { id: string; bestPrice?: string | null }

type SyncResult = {
  totalSlugs: number
  newProjects: number
  staleRemoved: number
  unitsSynced: number
}

// ── Token: leído desde BD en cada sync para evitar usar el token de módulo cacheado ──

async function getToken(): Promise<string> {
  const setting = await prisma.setting.findUnique({ where: { key: 'jetbrokers_token' } })
  return setting?.value ?? process.env.JETBROKERS_TOKEN ?? 'PtDBqd29'
}

function makeHeaders(token: string, extra?: Record<string, string>) {
  return { Authorization: `Bearer ${token}`, device: 'w', 'jet-brokers-version': JB_VERSION, ...extra }
}

// ── Fetchers ─────────────────────────────────────────────

async function fetchAllCards(token: string): Promise<StoreCard[]> {
  const res = await fetch(`${JB_BASE}/projectstore-card/projects`, { headers: makeHeaders(token) })
  if (!res.ok) throw new Error(`Store cards ${res.status}`)
  return res.json() as Promise<StoreCard[]>
}

async function fetchWorkview(slug: string, token: string) {
  const res = await fetch(`${JB_BASE}/marketplace/${slug}/workview`, { headers: makeHeaders(token) })
  if (!res.ok) return null
  return res.json().catch(() => null)
}

async function fetchNotes(slug: string, token: string): Promise<string | null> {
  const res = await fetch(`${JB_BASE}/marketplace/notes/${slug}`, {
    headers: makeHeaders(token, { Accept: 'text/html' }),
  })
  if (!res.ok) return null
  return res.text().catch(() => null)
}

async function fetchUnits(slug: string, token: string): Promise<unknown[] | null> {
  const res = await fetch(`${JB_BASE}/marketplace/units-search/${Date.now()}`, {
    method: 'POST',
    headers: makeHeaders(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      tipologies: [], type: null, order: 'ASC', models: [], facings: [],
      projectId: slug, availability: 'available', number: null, element: 0, elements: 9999,
    }),
  })
  if (res.status === 401) return null  // proyecto de otra organización
  if (!res.ok) return []
  const data = await res.json().catch(() => ({}))
  return data.apartments ?? []
}

// ── Retry helper ─────────────────────────────────────────

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 800): Promise<T> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try { return await fn() } catch (e) {
      if (attempt === retries - 1) throw e
      await new Promise(r => setTimeout(r, delay * (attempt + 1)))
    }
  }
  throw new Error('Max retries')
}

// ── Helpers de sync ──────────────────────────────────────

async function upsertNewProject(slug: string, bestPriceMap: Map<string, number | null>, token: string) {
  const [workview, notes] = await Promise.all([fetchWorkview(slug, token), fetchNotes(slug, token)])
  if (!workview) return

  const lat = workview.gpsLat ? parseFloat(workview.gpsLat) : null
  const lng = workview.gpsLon ? parseFloat(workview.gpsLon) : null
  const imageUrl = workview.cover ? `https://app.jetbrokers.io/api/file-unauthenticated/download/${workview.cover}` : null

  const base = {
    name: (workview.name ?? slug).trim(),
    commune: workview.locality ?? null,
    address: workview.address ?? null,
    lat, lng,
    deliveryPeriod: workview.dateOfDelivery?.trim() ?? null,
    deliveryYear: workview.yearOfDelivery ?? null,
    stage: workview.stage ?? null,
    developerName: workview.developerName ?? null,
    organizationName: workview.organization?.name ?? null,
    description: workview.description ?? null,
    pie: workview.pie ? parseFloat(workview.pie) : null,
    reservaCLP: workview.reservaCLP ? parseInt(workview.reservaCLP) : null,
    cuotasPreEntrega: workview.cuotasPreEntrega ?? null,
    tags: workview.tags ?? [],
    imageUrl,
    notesHtml: notes,
    rawData: workview as object,
  }

  await withRetry(() => prisma.externalProject.upsert({
    where: { source_sourceId: { source: 'jetbrokers', sourceId: slug } },
    create: { source: 'jetbrokers', sourceId: slug, ...base, priceFrom: bestPriceMap.get(slug) ?? null, typologies: [] },
    update: base,
  }))
}

async function syncUnitsForSlug(slug: string, bestPriceMap: Map<string, number | null>, token: string): Promise<number> {
  const project = await withRetry(() => prisma.externalProject.findUnique({
    where: { source_sourceId: { source: 'jetbrokers', sourceId: slug } },
    select: { id: true },
  }))
  if (!project) return 0

  const unitsRes = await fetchUnits(slug, token)
  if (unitsRes === null) {
    const best = bestPriceMap.get(slug)
    if (best != null) await withRetry(() => prisma.externalProject.update({ where: { id: project.id }, data: { priceFrom: best } }))
    await assignAndMergeCanonical(project.id)
    return 0
  }
  const apartments = unitsRes as Record<string, unknown>[]

  await withRetry(() => prisma.externalUnit.updateMany({ where: { projectId: project.id, source: 'jetbrokers' }, data: { available: false } }))

  const toFloat = (v: unknown): number | null => { const n = parseFloat(String(v)); return isNaN(n) ? null : n }

  for (const u of apartments) {
    const model = u.apartmentModel as Record<string, unknown> | null
    const facingRaw = u.facing as string | null | undefined
    const facingKey = facingRaw ? facingRaw.toLowerCase() : null
    const facing = facingKey ? (FACING_MAP[facingKey] ?? facingRaw) : null

    await withRetry(() => prisma.externalUnit.upsert({
      where: { source_sourceId: { source: 'jetbrokers', sourceId: String(u.id) } },
      create: {
        projectId: project.id, source: 'jetbrokers', sourceId: String(u.id),
        number: (u.number as string) ?? null, model: (model?.name as string) ?? null,
        bedrooms: (model?.rooms as number) ?? null, bathrooms: (model?.bathrooms as number) ?? null,
        m2Interior: toFloat(u.surfaceInterior), m2Terrace: toFloat(u.surfaceTerrace),
        facing, price: toFloat(u.price), finalPrice: toFloat(u.finalPrice),
        discountPct: toFloat(u.discountRate), bonoPie: toFloat(u.bonoPie),
        available: true, rawData: u as object,
      },
      update: {
        available: true, price: toFloat(u.price), finalPrice: toFloat(u.finalPrice),
        discountPct: toFloat(u.discountRate), bonoPie: toFloat(u.bonoPie),
      },
    }))
  }

  const units = await withRetry(() => prisma.externalUnit.findMany({
    where: { projectId: project.id, available: true },
    select: { model: true, bedrooms: true, bathrooms: true, finalPrice: true },
  }))
  const typologies = Array.from(new Set(units.map(u => {
    if (!u.bedrooms && u.bedrooms !== 0) return u.model ?? null
    if (u.bedrooms === 0) return 'Estudio'
    return `${u.bedrooms}D${u.bathrooms ?? 1}B`
  }).filter(Boolean))) as string[]
  const prices = units.map(u => u.finalPrice).filter((v): v is number => v !== null && v > 0)
  const priceFrom = prices.length > 0 ? Math.min(...prices) : null

  const notes = await fetchNotes(slug, token)
  await withRetry(() => prisma.externalProject.update({
    where: { id: project.id },
    data: {
      typologies,
      ...(priceFrom !== null && { priceFrom }),
      ...(notes !== null && { notesHtml: notes }),
    },
  }))
  await assignAndMergeCanonical(project.id)

  return apartments.length
}

// ── Lógica principal de sync ─────────────────────────────

async function runSync(send: (pct: number, msg: string) => void): Promise<SyncResult> {
  // Leer token desde BD para evitar usar el valor cacheado del módulo
  const token = await getToken()
  send(2, 'Obteniendo lista de proyectos...')
  const allCards = await fetchAllCards(token)
  const allSlugs = allCards.map(c => c.id)
  const bestPriceMap = new Map(allCards.map(c => [c.id, c.bestPrice ? parseFloat(c.bestPrice) : null]))

  send(6, `${allSlugs.length} proyectos encontrados`)

  const existing = await prisma.externalProject.findMany({ where: { source: 'jetbrokers' }, select: { sourceId: true } })
  const existingIds = new Set(existing.map(e => e.sourceId))
  const currentSet = new Set(allSlugs)
  const staleIds = existing.filter(e => !currentSet.has(e.sourceId)).map(e => e.sourceId)
  if (staleIds.length > 0) {
    await prisma.externalProject.deleteMany({ where: { source: 'jetbrokers', sourceId: { in: staleIds } } })
  }

  const newSlugs = allSlugs.filter(s => !existingIds.has(s))
  send(10, `${newSlugs.length} nuevos · ${staleIds.length} eliminados`)

  // Nuevos proyectos secuencial: 10% → 20%
  let newProjectsCount = 0
  for (let i = 0; i < newSlugs.length; i++) {
    await upsertNewProject(newSlugs[i], bestPriceMap, token)
    newProjectsCount++
    if (i % 3 === 0 || i === newSlugs.length - 1) {
      const pct = 10 + Math.round(((i + 1) / Math.max(newSlugs.length, 1)) * 10)
      send(pct, `Importando nuevos (${i + 1}/${newSlugs.length})...`)
    }
  }

  // Proyectos existentes sin unidades = no compartidos → saltar sync de unidades.
  // Si en el futuro se comparte uno nuevo, llegará como slug nuevo y se intentará normalmente.
  const noUnitIds = new Set(
    (await prisma.externalProject.findMany({
      where: {
        source: 'jetbrokers',
        sourceId: { in: Array.from(existingIds) },
        units: { none: {} },
      },
      select: { sourceId: true },
    })).map(p => p.sourceId)
  )

  // Solo sincronizar unidades de proyectos nuevos o que ya tenían unidades
  const activeSlugs = allSlugs.filter(s => !noUnitIds.has(s))
  send(20, `${activeSlugs.length} proyectos con acceso · ${noUnitIds.size} sin acceso (omitidos)`)

  // Unidades secuencial: 20% → 95%
  let unitsSynced = 0
  for (let i = 0; i < activeSlugs.length; i++) {
    const count = await syncUnitsForSlug(activeSlugs[i], bestPriceMap, token)
    unitsSynced += count
    if (i % 5 === 0 || i === activeSlugs.length - 1) {
      const pct = 20 + Math.round(((i + 1) / activeSlugs.length) * 75)
      send(pct, `Unidades (${i + 1}/${activeSlugs.length} proyectos)...`)
    }
  }

  return { totalSlugs: allSlugs.length, newProjects: newProjectsCount, staleRemoved: staleIds.length, unitsSynced }
}

// ── GET — SSE streaming ──────────────────────────────────

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return new Response('No autorizado', { status: 401 })

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (progress: number, message: string, extra?: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ progress, message, ...extra })}\n\n`))
        } catch {}
      }
      try {
        const result = await runSync(send)
        send(100, `Listo · ${result.unitsSynced} unidades · ${result.newProjects} nuevos`, { done: true, result })
      } catch (e) {
        send(-1, e instanceof Error ? e.message : 'Error desconocido', { error: true })
      }
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

// ── POST — llamada directa (sin streaming) ───────────────

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  try {
    const result = await runSync(() => {})
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}
