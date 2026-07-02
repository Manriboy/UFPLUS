// src/app/api/admin/external/sync/iris/route.ts
export const maxDuration = 300 // Vercel Pro: hasta 5 min
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { recordSyncTimestamp } from '@/lib/sync-timestamps'
import { refreshIrisToken } from '@/lib/iris-token'
import { assignAndMergeCanonical, fixDuplicateSourceMerges } from '@/lib/canonical-merge'

const IRIS_SEARCH_URL = 'https://iris-auth.infocasas.com.uy/api/projects/get-projects-search'
const PAGE_SIZE = 18

type IrisUnit = {
  id: number; number: string | null; tipology: string
  bedrooms: number; bathrooms: number; m2: number; m2_outdoor: number
  price: number; final_price: number; max_discount: string | null
  floor: string; orientation: string | null; bonus_pie: unknown; plan: string
}

type IrisProject = {
  id: number; title: string; address: string
  latitude: number | string | null; longitude: number | string | null
  handover_date_text: string; commercial_conditions_description: string | null
  extra_file: string | null; brochure?: string | null; images: string[]
  zone: { id: number; name: string } | null
  department: { id: number; name: string } | null
  status: { name: string } | null
  financial: { payment_methods?: string | null } | null
  units: IrisUnit[]
}

type IrisSearchResponse = { success: boolean; data: IrisProject[]; total: number }

type SyncResult = { totalProjects: number; newProjects: number; staleRemoved: number; unitsSynced: number }

// ── Token ────────────────────────────────────────────────

async function getToken(): Promise<string | null> {
  const dbSetting = await prisma.setting.findUnique({ where: { key: 'iris_token' } })
  return dbSetting?.value || process.env.IRIS_BEARER_TOKEN || null
}

async function fetchPage(page: number, token: string): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 30_000)
  try {
    return await fetch(IRIS_SEARCH_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, Origin: 'https://iris.yapo.cl', Referer: 'https://iris.yapo.cl/' },
      body: JSON.stringify({ limit: PAGE_SIZE, page, filter: { country: [7], project_status: [1, 2, 3], operation_type: 'Venta', identifiers: [], level: '2' }, order: ['promos', 'popularity'] }),
    })
  } finally {
    clearTimeout(timer)
  }
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

// ── Helper paralelo en chunks ────────────────────────────

async function inChunks<T>(items: T[], fn: (item: T) => Promise<void>, size = 10): Promise<void> {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(fn))
  }
}

// ── Lógica principal de sync ─────────────────────────────

async function runSync(send: (pct: number, msg: string) => void): Promise<SyncResult> {
  // Corregir fusiones incorrectas de proyectos de la misma fuente antes de sincronizar
  send(1, 'Verificando fusiones de proyectos...')
  const fixed = await fixDuplicateSourceMerges()
  if (fixed > 0) send(2, `${fixed} proyectos separados correctamente`)

  send(2, 'Conectando con la fuente...')

  let token = await getToken()
  if (!token) {
    const refreshed = await refreshIrisToken()
    if (!refreshed) throw new Error('Token no configurado')
    token = refreshed
  }

  let firstRes = await fetchPage(1, token)
  if (firstRes.status === 401) {
    const refreshed = await refreshIrisToken()
    if (!refreshed) throw new Error('Token expirado y no se pudo renovar')
    token = refreshed
    firstRes = await fetchPage(1, token)
    if (!firstRes.ok) throw new Error(`Error de conexión ${firstRes.status}`)
  } else if (!firstRes.ok) {
    throw new Error(`Error de conexión ${firstRes.status}`)
  }

  const firstData = await firstRes.json() as IrisSearchResponse
  const totalPages = Math.ceil((firstData.total ?? 0) / PAGE_SIZE)
  send(8, `${firstData.total} proyectos · ${totalPages} páginas`)

  // Páginas restantes en PARALELO
  const remainingPages = totalPages > 1
    ? await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, i) =>
          fetchPage(i + 2, token!).then(r => r.json() as Promise<IrisSearchResponse>).then(d => d.data ?? []).catch(() => [] as IrisProject[])
        )
      )
    : []

  const allProjects: IrisProject[] = [...(firstData.data ?? []), ...remainingPages.flat()]
  send(20, `${allProjects.length} proyectos. Comparando con BD...`)

  const existing = await prisma.externalProject.findMany({ where: { source: 'iris' }, select: { sourceId: true } })
  const existingIds = new Set(existing.map(e => e.sourceId))
  const currentIds = new Set(allProjects.map(p => String(p.id)))
  const staleIds = existing.filter(e => !currentIds.has(e.sourceId)).map(e => e.sourceId)
  if (staleIds.length > 0) {
    await prisma.externalProject.deleteMany({ where: { source: 'iris', sourceId: { in: staleIds } } })
  }

  let newProjectsCount = 0
  const toFloat = (v: unknown) => { const n = parseFloat(String(v ?? '')); return isNaN(n) ? null : n }

  // Upsert proyectos en chunks paralelos de 10: 22% → 40%
  send(22, 'Guardando proyectos...')
  await inChunks(allProjects, async (p) => {
    const sourceId = String(p.id)
    const isNew = !existingIds.has(sourceId)
    const lat = p.latitude ? parseFloat(String(p.latitude)) : null
    const lng = p.longitude ? parseFloat(String(p.longitude)) : null
    const base = {
      name: p.title.trim(), commune: p.zone?.name ?? p.department?.name ?? null,
      address: p.address ?? null, lat, lng, deliveryPeriod: p.handover_date_text ?? null,
      stage: p.status?.name ?? null, description: p.commercial_conditions_description ?? null,
      paymentMethodsHtml: p.financial?.payment_methods ?? null, condicionesUrl: p.extra_file ?? null,
      brochureUrl: p.brochure ?? null, imageUrl: p.images?.[0] ?? null,
    }
    await withRetry(() => prisma.externalProject.upsert({
      where: { source_sourceId: { source: 'iris', sourceId } },
      create: { source: 'iris', sourceId, ...base, typologies: [], rawData: p as object },
      // hereLat/hereLng no se incluyen en update — autoritativos para geocodificación HERE
      update: { ...base, rawData: p as object },
    }))
    if (isNew) newProjectsCount++
  }, 10)
  send(40, 'Proyectos guardados. Sincronizando unidades...')

  // Marcar TODAS las unidades IRIS como no disponibles en UNA sola query
  await prisma.$executeRaw`UPDATE "ExternalUnit" SET available = false WHERE source = 'iris'`

  // Obtener todos los IDs de proyecto en UNA sola query
  const projectRows = await prisma.externalProject.findMany({
    where: { source: 'iris' },
    select: { id: true, sourceId: true },
  })
  const projectIdMap = new Map(projectRows.map(r => [r.sourceId, r.id]))

  // Upsert unidades en chunks paralelos de 8 proyectos a la vez: 40% → 95%
  let unitsSynced = 0
  let processed = 0

  await inChunks(allProjects, async (p) => {
    const projectId = projectIdMap.get(String(p.id))
    if (!projectId) return

    const units = p.units ?? []

    // Batch upsert en una sola query SQL — evita saturar el connection pool
    // con Promise.all(N upserts) que en producción causa timeout a los 10s.
    if (units.length > 0) {
      const rows = units.map(u => ({
        sourceId: String(u.id),
        number: u.number ?? null, model: u.tipology ?? null,
        bedrooms: u.bedrooms ?? null, bathrooms: u.bathrooms ?? null,
        m2Interior: u.m2 > 0 ? u.m2 : null, m2Terrace: u.m2_outdoor > 0 ? u.m2_outdoor : null,
        floor: u.floor ?? null, facing: u.orientation ?? null,
        price: u.price > 0 ? u.price : null, finalPrice: u.final_price > 0 ? u.final_price : null,
        discountPct: toFloat(u.max_discount), bonoPie: toFloat(u.bonus_pie),
        planUrl: u.plan || null, rawData: u,
      }))
      await prisma.$executeRaw`
        INSERT INTO "ExternalUnit"
          (id, source, "sourceId", "projectId", number, model, bedrooms, bathrooms,
           "m2Interior", "m2Terrace", floor, facing, price, "finalPrice",
           "discountPct", "bonoPie", "planUrl", available, "rawData", "syncedAt")
        SELECT
          gen_random_uuid()::text, 'iris', x->>'sourceId', ${projectId},
          x->>'number', x->>'model',
          (x->>'bedrooms')::int, (x->>'bathrooms')::int,
          (x->>'m2Interior')::float, (x->>'m2Terrace')::float,
          x->>'floor', x->>'facing',
          (x->>'price')::float, (x->>'finalPrice')::float,
          (x->>'discountPct')::float, (x->>'bonoPie')::float,
          x->>'planUrl', true, x->'rawData', NOW()
        FROM jsonb_array_elements(${JSON.stringify(rows)}::jsonb) AS x
        ON CONFLICT (source, "sourceId") DO UPDATE SET
          available     = true,
          price         = EXCLUDED.price,
          "finalPrice"  = EXCLUDED."finalPrice",
          "discountPct" = EXCLUDED."discountPct",
          "bonoPie"     = EXCLUDED."bonoPie",
          "syncedAt"    = NOW()
      `
    }
    unitsSynced += units.length

    // Actualizar tipologías y precio mínimo del proyecto
    const av = await prisma.externalUnit.findMany({
      where: { projectId, available: true },
      select: { model: true, bedrooms: true, bathrooms: true, finalPrice: true },
    })
    const typologies = Array.from(new Set(av.map(u => {
      if (u.bedrooms === 0) return 'Estudio'
      if (u.bedrooms !== null && u.bathrooms !== null) return `${u.bedrooms}D${u.bathrooms}B`
      return u.model ?? null
    }).filter(Boolean))) as string[]
    const prices = av.map(u => u.finalPrice).filter((v): v is number => v !== null && v > 0)
    const priceFrom = prices.length > 0 ? Math.min(...prices) : null
    await prisma.externalProject.update({
      where: { id: projectId }, data: { typologies, ...(priceFrom !== null && { priceFrom }) },
    })
    await assignAndMergeCanonical(projectId)

    processed++
    const pct = 40 + Math.round((processed / allProjects.length) * 55)
    send(Math.min(pct, 95), `Unidades (${processed}/${allProjects.length} proyectos)...`)
  }, 8)

  return { totalProjects: allProjects.length, newProjects: newProjectsCount, staleRemoved: staleIds.length, unitsSynced }
}

// ── GET — SSE streaming ──────────────────────────────────

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return new Response('No autorizado', { status: 401 })

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const enq = (chunk: string) => { try { controller.enqueue(encoder.encode(chunk)) } catch {} }
      const send = (progress: number, message: string, extra?: object) => {
        enq(`data: ${JSON.stringify({ progress, message, ...extra })}\n\n`)
      }

      // Ping inicial para establecer conexión inmediatamente
      enq(': connected\n\n')

      // Keepalive cada 8s para evitar que proxies intermedios cierren la conexión
      const heartbeat = setInterval(() => enq(': ping\n\n'), 8_000)

      try {
        const result = await runSync(send)
        await recordSyncTimestamp('iris')
        send(100, `Listo · ${result.unitsSynced} unidades · ${result.newProjects} nuevos`, { done: true, result })
      } catch (e) {
        send(-1, e instanceof Error ? e.message : 'Error desconocido', { error: true })
      } finally {
        clearInterval(heartbeat)
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

// ── POST — sin streaming ─────────────────────────────────

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
