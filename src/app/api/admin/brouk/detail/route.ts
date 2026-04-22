// src/app/api/admin/brouk/detail/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const BROUK_DETAIL_URL =
  'https://www.brouk.cl/v1/datasource/applications/e4f62324-96a7-44cd-9cb1-3350520dc92e' +
  '/pages/8fc7d073-ee38-42b1-8dc1-166b26e1b747' +
  '/blocks/659a2519-3037-4160-ad77-114a963a0d21' +
  '/datasources/65e3df1a-7b41-4149-999c-a92a7ddcc040/records'

// ─── Fix encoding ────────────────────────────────────

function fixEncoding(str: string): string {
  try {
    const bytes = new Uint8Array([...str].map((c) => c.charCodeAt(0) & 0xff))
    const decoded = new TextDecoder('utf-8').decode(bytes)
    return decoded.includes('\uFFFD') ? str : decoded
  } catch {
    return str
  }
}

function fixField(s?: string | null): string {
  return s ? fixEncoding(s) : ''
}

// ─── Tipos raw ───────────────────────────────────────

type BroukAttachment = {
  id: string; url: string; filename: string; type: string; expiresAt: string
}

type BroukSelectField = { id: string; label: string }

type BroukDetailRaw = {
  id: string
  fields: {
    'Nombre proyecto'?: string
    'Status proyecto'?: BroukSelectField
    'Fachada Edificio'?: BroukAttachment[]
    'Imagenes proyecto'?: BroukAttachment[]
    'Proyecto'?: string
    'Tipo de Proyecto'?: BroukSelectField
    'Inmobiliarias'?: BroukSelectField[]
    'Logo inmb'?: BroukAttachment[]
    'Tipo de entrega'?: BroukSelectField
    'Comuna'?: BroukSelectField[]
    'Dirección'?: string
    'Espacios Comunes'?: BroukSelectField[]
    'carpeta a drive'?: string
    'archivo Stock'?: string
  }
}

export type BroukDetail = {
  id: string
  nombre: string
  statusProyecto: string | null
  imagen: string | null
  imagenesAdicionales: string[]
  descripcion: string | null
  tipoProyecto: string
  inmobiliarias: string[]
  logoInmobiliaria: string | null
  tipoEntrega: string
  comunas: string[]
  direccion: string | null
  espaciosComunes: string[]
  carpetaDrive: string | null
  archivoStock: string | null
}

// ─── POST handler ─────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const token = process.env.BROUK_JWT_TOKEN
  if (!token) return NextResponse.json({ error: 'Token de Brouk no configurado' }, { status: 500 })

  const { recordId } = await req.json()
  if (!recordId) return NextResponse.json({ error: 'recordId requerido' }, { status: 400 })

  const res = await fetch(BROUK_DETAIL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `jwtToken=${token}; signInRedirectionUrl=%2F`,
      'Origin': 'https://www.brouk.cl',
      'Referer': `https://www.brouk.cl/proyectosbrouk?recordId=${recordId}`,
      'x-user-timezone': 'America/Santiago',
    },
    body: JSON.stringify({
      options: { timeZone: 'America/Santiago', userLocale: 'en-US' },
      pageContext: { recordId },
      filterCriteria: {},
      pagingOption: { offset: null, count: 1 },
    }),
  })

  if (!res.ok) {
    return NextResponse.json({ error: `Brouk respondió ${res.status}` }, { status: 502 })
  }

  const data = await res.json()
  const item: BroukDetailRaw | undefined = data?.items?.[0]

  if (!item) {
    return NextResponse.json({ error: 'Proyecto no encontrado en Brouk' }, { status: 404 })
  }

  const f = item.fields
  const detail: BroukDetail = {
    id: item.id,
    nombre: fixField(f['Nombre proyecto']).trim(),
    statusProyecto: fixField(f['Status proyecto']?.label) || null,
    imagen: f['Fachada Edificio']?.[0]?.url ?? null,
    imagenesAdicionales: (f['Imagenes proyecto'] ?? []).map((a) => a.url),
    descripcion: fixField(f['Proyecto']) || null,
    tipoProyecto: fixField(f['Tipo de Proyecto']?.label).trim(),
    inmobiliarias: (f['Inmobiliarias'] ?? []).map((i) => fixEncoding(i.label)),
    logoInmobiliaria: f['Logo inmb']?.[0]?.url ?? null,
    tipoEntrega: fixField(f['Tipo de entrega']?.label),
    comunas: (f['Comuna'] ?? []).map((c) => fixEncoding(c.label)),
    direccion: fixField(f['Dirección']) || null,
    espaciosComunes: (f['Espacios Comunes'] ?? []).map((e) => fixEncoding(e.label)),
    carpetaDrive: f['carpeta a drive'] ?? null,
    archivoStock: f['archivo Stock'] ?? null,
  }

  return NextResponse.json({ detail })
}
