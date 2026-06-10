// src/app/api/admin/external/sync/iris/daily/route.ts
// Sync diario: renueva token + upsert completo de unidades (precios, disponibilidad).
// No actualiza metadata de proyectos (eso es el sync semanal).
// Tiempo estimado: 1-3 min con paralelización.
export const maxDuration = 300
export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { refreshIrisToken } from '@/lib/iris-token'
import prisma from '@/lib/prisma'
import { assignAndMergeCanonical } from '@/lib/canonical-merge'

const IRIS_SEARCH_URL = 'https://iris-auth.infocasas.com.uy/api/projects/get-projects-search'
const PAGE_SIZE = 50

type IrisUnit = {
  id: number; number: string | null; tipology: string
  bedrooms: number; bathrooms: number; m2: number; m2_outdoor: number
  price: number; final_price: number; max_discount: string | null
  floor: string; orientation: string | null; bonus_pie: unknown; plan: string
}

type IrisProject = {
  id: number; units: IrisUnit[]
}

async function fetchPage(page: number, token: string) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 30_000)
  try {
    return await fetch(IRIS_SEARCH_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        Origin: 'https://iris.yapo.cl',
        Referer: 'https://iris.yapo.cl/',
      },
      body: JSON.stringify({
        limit: PAGE_SIZE, page,
        filter: { country: [7], project_status: [1, 2, 3], operation_type: 'Venta', identifiers: [], level: '2' },
        order: ['promos', 'popularity'],
      }),
    })
  } finally {
    clearTimeout(timer)
  }
}

async function inChunks<T>(items: T[], fn: (item: T) => Promise<void>, size = 8): Promise<void> {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(fn))
  }
}

const toFloat = (v: unknown) => { const n = parseFloat(String(v ?? '')); return isNaN(n) ? null : n }

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return new Response('Unauthorized', { status: 401 })

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const enq = (chunk: string) => { try { controller.enqueue(encoder.encode(chunk)) } catch {} }
      const send = (progress: number, message: string, extra: Record<string, unknown> = {}) => {
        enq(`data: ${JSON.stringify({ progress, message, ...extra })}\n\n`)
      }

      enq(': connected\n\n')
      const heartbeat = setInterval(() => enq(': ping\n\n'), 8_000)

      try {
        // 1. Renovar token
        send(5, 'Renovando token...')
        const token = await refreshIrisToken()
        if (!token) throw new Error('No se pudo renovar el token de Iris')
        send(15, 'Token renovado ✓')

        // 2. Descargar todos los proyectos con unidades en paralelo
        send(20, 'Descargando datos de Iris...')
        let firstRes = await fetchPage(1, token)
        if (!firstRes.ok) throw new Error(`Iris error ${firstRes.status}`)

        const firstData = await firstRes.json() as { total: number; data: IrisProject[] }
        const totalPages = Math.ceil((firstData.total ?? 0) / PAGE_SIZE)
        send(25, `${firstData.total} proyectos · ${totalPages} páginas`)

        const remainingPages = totalPages > 1
          ? await Promise.all(
              Array.from({ length: totalPages - 1 }, (_, i) =>
                fetchPage(i + 2, token)
                  .then(r => r.json() as Promise<{ data: IrisProject[] }>)
                  .then(d => d.data ?? [])
                  .catch(() => [] as IrisProject[])
              )
            )
          : []

        const allProjects: IrisProject[] = [...(firstData.data ?? []), ...remainingPages.flat()]
        send(45, `${allProjects.length} proyectos descargados. Sincronizando unidades...`)

        // 3. Marcar todas las unidades IRIS como no disponibles
        await prisma.$executeRaw`UPDATE "ExternalUnit" SET available = false WHERE source = 'iris'`

        // 4. Obtener mapa projectId en una sola query
        const projectRows = await prisma.externalProject.findMany({
          where: { source: 'iris' },
          select: { id: true, sourceId: true },
        })
        const projectIdMap = new Map(projectRows.map(r => [String(r.sourceId), r.id]))

        // 5. Upsert unidades en chunks paralelos
        let unitsSynced = 0
        let processed = 0

        await inChunks(allProjects, async (p) => {
          const projectId = projectIdMap.get(String(p.id))
          if (!projectId) return

          const units = p.units ?? []
          await Promise.all(units.map(u =>
            prisma.externalUnit.upsert({
              where: { source_sourceId: { source: 'iris', sourceId: String(u.id) } },
              create: {
                projectId, source: 'iris', sourceId: String(u.id),
                number: u.number ?? null, model: u.tipology ?? null,
                bedrooms: u.bedrooms ?? null, bathrooms: u.bathrooms ?? null,
                m2Interior: u.m2 > 0 ? u.m2 : null, m2Terrace: u.m2_outdoor > 0 ? u.m2_outdoor : null,
                floor: u.floor ?? null, facing: u.orientation ?? null,
                price: u.price > 0 ? u.price : null, finalPrice: u.final_price > 0 ? u.final_price : null,
                discountPct: toFloat(u.max_discount), bonoPie: toFloat(u.bonus_pie),
                planUrl: u.plan || null, available: true, rawData: u as object,
              },
              update: {
                available: true,
                price: u.price > 0 ? u.price : null,
                finalPrice: u.final_price > 0 ? u.final_price : null,
                discountPct: toFloat(u.max_discount), bonoPie: toFloat(u.bonus_pie),
              },
            })
          ))
          unitsSynced += units.length

          // Actualizar tipologías y precio mínimo
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
            where: { id: projectId },
            data: { typologies, ...(priceFrom !== null && { priceFrom }) },
          })
          await assignAndMergeCanonical(projectId)

          processed++
          const pct = 45 + Math.round((processed / allProjects.length) * 50)
          send(Math.min(pct, 95), `Unidades (${processed}/${allProjects.length} proyectos)...`)
        }, 8)

        send(100, `Listo · ${unitsSynced} unidades · ${allProjects.length} proyectos`, { done: true })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error desconocido'
        send(0, msg, { error: true })
      } finally {
        clearInterval(heartbeat)
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
