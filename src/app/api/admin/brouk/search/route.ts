// src/app/api/admin/brouk/search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

const BROUK_LIST_URL =
  'https://www.brouk.cl/v1/datasource/applications/e4f62324-96a7-44cd-9cb1-3350520dc92e' +
  '/pages/2298f6cc-818f-4fd9-bc33-ef2e7d968886' +
  '/blocks/aa858c9d-2cbb-4849-b8cc-3cf28dc7418e' +
  '/datasources/89a2fee8-4edd-450c-8da8-e4ea3176a83a/records'

// ─── Tipos raw ────────────────────────────────────────

type BroukAttachment = {
  id: string; url: string; filename: string; type: string; expiresAt: string
}

type BroukSelectField = { id: string; label: string }

type BroukRawItem = {
  id: string
  fields: {
    'Nombre proyecto'?: string
    'Tipologia'?: BroukSelectField[]
    'Comuna'?: BroukSelectField[]
    'Estacion de metro'?: BroukSelectField[]
    'Copia de % Bono pie'?: BroukSelectField[]
    'Tipo de Proyecto'?: BroukSelectField
    'Fachada Edificio'?: BroukAttachment[]
    'Bono pie'?: BroukSelectField
    'Tipo de entrega'?: BroukSelectField
    'Inmobiliarias'?: BroukSelectField[]
  }
}

type BroukListResponse = {
  total: number; limit: number; offset: string | null
  items: BroukRawItem[]; empty: boolean; complete: boolean
}

// ─── Tipo mapeado ────────────────────────────────────

export type BroukProject = {
  id: string
  nombre: string
  imagen: string | null
  comunas: string[]
  tipologias: string[]
  bonoPie: string
  porcentajeBonoPie: string | null
  tipoEntrega: string
  inmobiliarias: string[]
  estacionesMetro: string[]
  tipoProyecto: string
}

// ─── Fix encoding (Brouk sirve UTF-8 como Latin-1) ───

function fixEncoding(str: string): string {
  try {
    const bytes = new Uint8Array(Array.from(str).map((c) => c.charCodeAt(0) & 0xff))
    const decoded = new TextDecoder('utf-8').decode(bytes)
    // Si el decoded tiene caracteres extraños, devolver el original
    return decoded.includes('\uFFFD') ? str : decoded
  } catch {
    return str
  }
}

function fixField(s?: string): string {
  return s ? fixEncoding(s) : ''
}

// ─── Mapeo ───────────────────────────────────────────

function mapItem(item: BroukRawItem): BroukProject {
  const f = item.fields
  return {
    id: item.id,
    nombre: fixField(f['Nombre proyecto']).trim(),
    imagen: f['Fachada Edificio']?.[0]?.url ?? null,
    comunas: (f['Comuna'] ?? []).map((c) => fixEncoding(c.label)),
    tipologias: (f['Tipologia'] ?? []).map((t) => fixEncoding(t.label)),
    bonoPie: fixField(f['Bono pie']?.label),
    porcentajeBonoPie: f['Copia de % Bono pie']?.[0]?.label ?? null,
    tipoEntrega: fixField(f['Tipo de entrega']?.label),
    inmobiliarias: (f['Inmobiliarias'] ?? []).map((i) => fixEncoding(i.label)),
    estacionesMetro: (f['Estacion de metro'] ?? []).map((m) => fixEncoding(m.label)),
    tipoProyecto: fixField(f['Tipo de Proyecto']?.label).trim(),
  }
}

// ─── Fetch Brouk ─────────────────────────────────────

async function fetchAllBrouk(token: string): Promise<BroukRawItem[]> {
  const all: BroukRawItem[] = []
  let offset: string | null = null

  // Brouk tiene ~30 proyectos; con count=100 entra en un solo request
  const res = await fetch(BROUK_LIST_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `jwtToken=${token}; signInRedirectionUrl=%2F`,
      'Origin': 'https://www.brouk.cl',
      'Referer': 'https://www.brouk.cl/showroom',
      'x-user-timezone': 'America/Santiago',
    },
    body: JSON.stringify({
      options: { timeZone: 'America/Santiago', userLocale: 'en-US' },
      pageContext: null,
      filterCriteria: {},
      pagingOption: { offset, count: 100 },
    }),
  })

  if (res.status === 401 || res.status === 403) throw new Error(`401`)
  if (!res.ok) throw new Error(`Brouk respondió ${res.status}`)
  const data = await res.json() as BroukListResponse
  all.push(...(data.items ?? []))
  return all
}

// ─── POST handler ─────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Leer token desde BD primero; fallback a variable de entorno
  const dbSetting = await prisma.setting.findUnique({ where: { key: 'brouk_token' } })
  const token = dbSetting?.value || process.env.BROUK_JWT_TOKEN
  if (!token) return NextResponse.json({ error: 'Token de Brouk no configurado' }, { status: 500 })

  const body = await req.json()
  const filter = body.filter ?? {}
  const filterComunas: string[] = filter.comunas ?? []
  const filterTipologias: string[] = filter.tipologias ?? []
  const filterBonoPie: string | null = filter.bonoPie ?? null        // 'Si' | 'No' | null
  const filterEntrega: string | null = filter.tipoEntrega ?? null    // 'Inmediata' | 'Futura' | null

  let items: BroukRawItem[]
  try {
    items = await fetchAllBrouk(token)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido'
    if (msg.includes('401') || msg.includes('403')) {
      return NextResponse.json(
        { error: 'Token de Brouk expirado', tokenExpired: true },
        { status: 401 }
      )
    }
    return NextResponse.json({ error: `Error conectando con Brouk: ${msg}` }, { status: 502 })
  }

  let mapped = items.map(mapItem)

  // Filtrar
  if (filterComunas.length > 0) {
    mapped = mapped.filter((p) =>
      p.comunas.some((c) => filterComunas.includes(c))
    )
  }
  if (filterTipologias.length > 0) {
    mapped = mapped.filter((p) =>
      p.tipologias.some((t) => filterTipologias.includes(t))
    )
  }
  if (filterBonoPie) {
    mapped = mapped.filter((p) => p.bonoPie === filterBonoPie)
  }
  if (filterEntrega) {
    mapped = mapped.filter((p) => p.tipoEntrega === filterEntrega)
  }

  // Extraer opciones únicas para los filtros del cliente
  const allItems = items.map(mapItem)
  const comunasOpts = Array.from(new Set(allItems.flatMap((p) => p.comunas))).sort()
  const tipologiasOpts = Array.from(new Set(allItems.flatMap((p) => p.tipologias))).sort()

  return NextResponse.json({
    projects: mapped,
    total: mapped.length,
    filterOptions: { comunas: comunasOpts, tipologias: tipologiasOpts },
  })
}
