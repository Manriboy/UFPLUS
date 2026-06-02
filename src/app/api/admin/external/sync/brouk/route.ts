// src/app/api/admin/external/sync/brouk/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { assignAndMergeCanonical } from '@/lib/canonical-merge'

const APP_ID = 'e4f62324-96a7-44cd-9cb1-3350520dc92e'
const BROUK_BASE = `https://www.brouk.cl/v1/datasource/applications/${APP_ID}`
const LIST_URL = `${BROUK_BASE}/pages/2298f6cc-818f-4fd9-bc33-ef2e7d968886/blocks/aa858c9d-2cbb-4849-b8cc-3cf28dc7418e/datasources/89a2fee8-4edd-450c-8da8-e4ea3176a83a/records`
const DETAIL_BASE = `${BROUK_BASE}/pages/8fc7d073-ee38-42b1-8dc1-166b26e1b747/blocks/5752aca3-488d-46b4-9471-81b3840119b6/datasources/7a7b5528-3770-4139-99d9-e8eb39674df3/records`
const COND_BASE = `${BROUK_BASE}/pages/8fc7d073-ee38-42b1-8dc1-166b26e1b747/blocks/b415d6d2-0445-4956-a278-66a82892e6b5/datasources/a34ac882-2f63-4d8e-9762-95989bebd718/records`

type BroukAttachment = { id: string; url: string; filename: string }
type BroukSelect = { id: string; label: string }
type BroukListItem = {
  id: string
  fields: {
    'Nombre proyecto'?: string; 'Tipologia'?: BroukSelect[]; 'Comuna'?: BroukSelect[]
    'Bono pie'?: BroukSelect; 'Tipo de entrega'?: BroukSelect; 'Inmobiliarias'?: BroukSelect[]
    'Fachada Edificio'?: BroukAttachment[]
  }
}
type BroukListResponse = { total: number; items: BroukListItem[] }
type SyncResult = { totalProjects: number; newProjects: number; staleRemoved: number }

// ── Helpers ──────────────────────────────────────────────

function fixEncoding(str: string): string {
  try {
    const bytes = new Uint8Array(Array.from(str).map((c) => c.charCodeAt(0) & 0xff))
    const decoded = new TextDecoder('utf-8').decode(bytes)
    return decoded.includes('�') ? str : decoded
  } catch { return str }
}
const fix = (s?: string | null) => s ? fixEncoding(s) : ''

function broukHeaders(token: string, referer: string) {
  return { 'Content-Type': 'application/json', Cookie: `jwtToken=${token}; signInRedirectionUrl=%2F`, Origin: 'https://www.brouk.cl', Referer: referer, 'x-user-timezone': 'America/Santiago' }
}
const BROUK_BODY = JSON.stringify({ options: { timeZone: 'America/Santiago', userLocale: 'en-US' }, pageContext: null, filterCriteria: {} })

async function geocodeAddress(address: string, commune: string | null): Promise<{ lat: number; lng: number } | null> {
  try {
    const HERE_KEY = process.env.NEXT_PUBLIC_HERE_API_KEY
    if (!HERE_KEY) return null
    const q = [address, commune, 'Chile'].filter(Boolean).join(', ')
    const url = `https://geocode.search.hereapi.com/v1/geocode?q=${encodeURIComponent(q)}&in=countryCode:CHL&apiKey=${HERE_KEY}`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    const item = data.items?.[0]
    if (!item) return null
    return { lat: item.position.lat, lng: item.position.lng }
  } catch { return null }
}

// ── Lógica principal de sync ─────────────────────────────

async function runSync(send: (pct: number, msg: string) => void): Promise<SyncResult> {
  send(2, 'Conectando con la fuente...')

  const dbSetting = await prisma.setting.findUnique({ where: { key: 'brouk_token' } })
  const token = dbSetting?.value || process.env.BROUK_JWT_TOKEN
  if (!token) throw new Error('Token no configurado')

  const listRes = await fetch(LIST_URL, {
    method: 'POST',
    headers: broukHeaders(token, 'https://www.brouk.cl/showroom'),
    body: JSON.stringify({ options: { timeZone: 'America/Santiago', userLocale: 'en-US' }, pageContext: null, filterCriteria: {}, pagingOption: { offset: null, count: 100 } }),
  })
  if (listRes.status === 401 || listRes.status === 403) throw new Error('Token expirado · 401')
  if (!listRes.ok) throw new Error(`Error de conexión ${listRes.status}`)

  const listData = await listRes.json() as BroukListResponse
  const items = listData.items ?? []
  send(10, `${items.length} proyectos encontrados`)

  const existing = await prisma.externalProject.findMany({ where: { source: 'brouk' }, select: { sourceId: true, lat: true, lng: true } })
  const existingMap = new Map(existing.map(e => [e.sourceId, e]))
  const currentIds = new Set(items.map(i => i.id))
  const staleIds = existing.filter(e => !currentIds.has(e.sourceId)).map(e => e.sourceId)
  if (staleIds.length > 0) {
    await prisma.externalProject.deleteMany({ where: { source: 'brouk', sourceId: { in: staleIds } } })
  }

  let newCount = 0

  // Procesar proyectos de 3 en 3: 12% → 95%
  const BATCH = 3
  for (let i = 0; i < items.length; i += BATCH) {
    const chunk = items.slice(i, i + BATCH)

    for (const item of chunk) {
      const referer = `https://www.brouk.cl/proyectosbrouk?recordId=${item.id}`
      const [detRes, condRes] = await Promise.all([
        fetch(`${DETAIL_BASE}/${item.id}`, { method: 'POST', headers: broukHeaders(token, referer), body: BROUK_BODY }),
        fetch(`${COND_BASE}/${item.id}`, { method: 'POST', headers: broukHeaders(token, referer), body: BROUK_BODY }),
      ])

      const detRaw = detRes.ok ? await detRes.json().catch(() => null) : null
      const condRaw = condRes.ok ? await condRes.json().catch(() => null) : null
      const df = detRaw?.fields ? detRaw.fields : (detRaw?.items?.[0]?.fields ?? {})
      const lf = item.fields

      const name = fix(fix(df['Nombre proyecto']) || fix(lf['Nombre proyecto'])).trim()
      if (!name) continue

      const address = fix(df['Dirección']) || null
      const commune = (df['Comuna'] ?? lf['Comuna'] ?? []).map((c: BroukSelect) => fix(c.label))[0] ?? null
      const imageUrl = df['Fachada Edificio']?.[0]?.url ?? lf['Fachada Edificio']?.[0]?.url ?? null
      const isNew = !existingMap.has(item.id)
      const existingRecord = existingMap.get(item.id)

      let lat: number | null = existingRecord?.lat ?? null
      let lng: number | null = existingRecord?.lng ?? null
      if (isNew && address && lat === null) {
        const coords = await geocodeAddress(address, commune)
        if (coords) { lat = coords.lat; lng = coords.lng }
        await new Promise(r => setTimeout(r, 210))
      }

      let commercialDesc: string | null = null
      if (condRaw) {
        const cf = condRaw?.fields ? condRaw.fields : (condRaw?.items?.[0]?.fields ?? {})
        const parts = Object.entries(cf as Record<string, unknown>)
          .filter(([, v]) => typeof v === 'string' && (v as string).trim().length > 0)
          .map(([k, v]) => `**${fix(k)}**\n${fix(v as string)}`)
        if (parts.length > 0) commercialDesc = parts.join('\n\n')
      }

      const deliveryPeriod = fix(df['Tipo de entrega']?.label || lf['Tipo de entrega']?.label) || null
      const developerName = (df['Inmobiliarias'] ?? lf['Inmobiliarias'] ?? []).map((i: BroukSelect) => fix(i.label)).join(', ') || null

      const upserted = await prisma.externalProject.upsert({
        where: { source_sourceId: { source: 'brouk', sourceId: item.id } },
        create: {
          source: 'brouk', sourceId: item.id, name, commune, address, lat, lng,
          deliveryPeriod, developerName, imageUrl, description: fix(df['Proyecto']) || null,
          commercialDesc, driveUrl: df['carpeta a drive'] ?? null, stockFileUrl: df['archivo Stock'] ?? null,
          typologies: (lf['Tipologia'] ?? []).map((t: BroukSelect) => fix(t.label)),
          rawData: { list: lf, detail: df } as object,
        },
        update: {
          name, commune, address, lat, lng, deliveryPeriod, developerName, imageUrl,
          description: fix(df['Proyecto']) || null,
          ...(commercialDesc !== null && { commercialDesc }),
          driveUrl: df['carpeta a drive'] ?? null, stockFileUrl: df['archivo Stock'] ?? null,
          typologies: (lf['Tipologia'] ?? []).map((t: BroukSelect) => fix(t.label)),
          rawData: { list: lf, detail: df } as object,
        },
        select: { id: true },
      })
      await assignAndMergeCanonical(upserted.id)
      if (isNew) newCount++
    }

    const pct = 12 + Math.round((Math.min(i + BATCH, items.length) / items.length) * 83)
    send(pct, `Proyectos (${Math.min(i + BATCH, items.length)}/${items.length})...`)
  }

  return { totalProjects: items.length, newProjects: newCount, staleRemoved: staleIds.length }
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
        send(100, `Listo · ${result.totalProjects} proyectos · ${result.newProjects} nuevos`, { done: true, result })
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
