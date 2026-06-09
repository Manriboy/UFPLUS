// src/app/api/admin/external/sync/iris/route.ts
export const maxDuration = 300 // Vercel Pro: hasta 5 min
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { refreshIrisToken } from '@/lib/iris-token'
import { assignAndMergeCanonical } from '@/lib/canonical-merge'

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

// ── Lógica principal de sync ─────────────────────────────

async function runSync(send: (pct: number, msg: string) => void): Promise<SyncResult> {
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

  // Páginas restantes: 8% → 20%
  const remaining: IrisProject[][] = []
  for (let i = 2; i <= totalPages; i++) {
    const d = await fetchPage(i, token!).then(r => r.json() as Promise<IrisSearchResponse>).then(d => d.data ?? []).catch(() => [] as IrisProject[])
    remaining.push(d)
    const pct = 8 + Math.round(((i - 1) / Math.max(totalPages - 1, 1)) * 12)
    send(pct, `Página ${i}/${totalPages}...`)
  }

  const allProjects: IrisProject[] = [...(firstData.data ?? []), ...remaining.flat()]

  send(20, 'Comparando con base de datos...')
  const existing = await prisma.externalProject.findMany({ where: { source: 'iris' }, select: { sourceId: true } })
  const existingIds = new Set(existing.map(e => e.sourceId))
  const currentIds = new Set(allProjects.map(p => String(p.id)))
  const staleIds = existing.filter(e => !currentIds.has(e.sourceId)).map(e => e.sourceId)
  if (staleIds.length > 0) {
    await prisma.externalProject.deleteMany({ where: { source: 'iris', sourceId: { in: staleIds } } })
  }

  let newProjectsCount = 0

  // Upsert proyectos secuencial: 22% → 40%
  for (let i = 0; i < allProjects.length; i++) {
    const p = allProjects[i]
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
      // hereLat/hereLng no se incluyen en update — son autoritativos y solo los escribe el script de geocodificación HERE
      update: { ...base, rawData: p as object },
    }))
    if (isNew) newProjectsCount++
    if (i % 5 === 0 || i === allProjects.length - 1) {
      const pct = 22 + Math.round(((i + 1) / allProjects.length) * 18)
      send(pct, `Proyectos (${i + 1}/${allProjects.length})...`)
    }
  }

  // Unidades secuencial: 40% → 95%
  let unitsSynced = 0
  const toFloat = (v: unknown) => { const n = parseFloat(String(v ?? '')); return isNaN(n) ? null : n }

  for (let i = 0; i < allProjects.length; i++) {
    const p = allProjects[i]
    const project = await withRetry(() => prisma.externalProject.findUnique({
      where: { source_sourceId: { source: 'iris', sourceId: String(p.id) } }, select: { id: true },
    }))
    if (!project) continue

    await withRetry(() => prisma.$executeRaw`
      UPDATE "ExternalUnit" SET available = false
      WHERE "projectId" = ${project.id} AND source = 'iris'
    `)

    for (const u of p.units ?? []) {
      await withRetry(() => prisma.externalUnit.upsert({
        where: { source_sourceId: { source: 'iris', sourceId: String(u.id) } },
        create: {
          projectId: project.id, source: 'iris', sourceId: String(u.id),
          number: u.number ?? null, model: u.tipology ?? null,
          bedrooms: u.bedrooms ?? null, bathrooms: u.bathrooms ?? null,
          m2Interior: u.m2 > 0 ? u.m2 : null, m2Terrace: u.m2_outdoor > 0 ? u.m2_outdoor : null,
          floor: u.floor ?? null, facing: u.orientation ?? null,
          price: u.price > 0 ? u.price : null, finalPrice: u.final_price > 0 ? u.final_price : null,
          discountPct: toFloat(u.max_discount), bonoPie: toFloat(u.bonus_pie),
          planUrl: u.plan || null, available: true, rawData: u as object,
        },
        update: {
          available: true, price: u.price > 0 ? u.price : null, finalPrice: u.final_price > 0 ? u.final_price : null,
          discountPct: toFloat(u.max_discount), bonoPie: toFloat(u.bonus_pie),
        },
      }))
      unitsSynced++
    }

    const av = await withRetry(() => prisma.externalUnit.findMany({
      where: { projectId: project.id, available: true },
      select: { model: true, bedrooms: true, bathrooms: true, finalPrice: true },
    }))
    const typologies = Array.from(new Set(av.map(u => {
      if (u.bedrooms === 0) return 'Estudio'
      if (u.bedrooms !== null && u.bathrooms !== null) return `${u.bedrooms}D${u.bathrooms}B`
      return u.model ?? null
    }).filter(Boolean))) as string[]
    const prices = av.map(u => u.finalPrice).filter((v): v is number => v !== null && v > 0)
    const priceFrom = prices.length > 0 ? Math.min(...prices) : null
    await withRetry(() => prisma.externalProject.update({
      where: { id: project.id }, data: { typologies, ...(priceFrom !== null && { priceFrom }) },
    }))
    await assignAndMergeCanonical(project.id)

    if (i % 3 === 0 || i === allProjects.length - 1) {
      const pct = 40 + Math.round(((i + 1) / allProjects.length) * 55)
      send(pct, `Unidades (${i + 1}/${allProjects.length} proyectos)...`)
    }
  }

  return { totalProjects: allProjects.length, newProjects: newProjectsCount, staleRemoved: staleIds.length, unitsSynced }
}

// ── GET — SSE streaming ──────────────────────────────────

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return new Response('No autorizado', { status: 401 })

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (progress: number, message: string, extra?: object) => {
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify({ progress, message, ...extra })}\n\n`)) } catch {}
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
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' },
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
