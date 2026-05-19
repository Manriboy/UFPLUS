import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

type JBUnit = {
  id: string
  number: string
  typology: string
  rooms: number
  bathrooms: number
  surfaceInterior: number
  surfaceTerrace: number
  surfaceTotal: number
  facing: string | null
  price: number
  finalPrice: number
  discountRate: number
  bonoPie: number
  available: boolean
  hasParking: boolean
  hasStorage: boolean
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const { sourceId, source } = body as { projectId: string; sourceId: string; source: string }

  if (!sourceId || !source) {
    return NextResponse.json({ error: 'sourceId y source son requeridos' }, { status: 400 })
  }

  if (source !== 'jetbrokers') {
    return NextResponse.json({ error: `Fuente no soportada: ${source}` }, { status: 400 })
  }

  const url = `https://app.jetbrokers.io/api/marketplace/units-search/${Date.now()}`

  const jbRes = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer PtDBqd29',
      'Content-Type': 'application/json',
      'device': 'w',
      'jet-brokers-version': '7.42.0',
    },
    body: JSON.stringify({
      tipologies: [],
      type: null,
      order: 'ASC',
      models: [],
      facings: [],
      projectId: sourceId,
      availability: 'available',
      number: null,
      element: 0,
      elements: 9999,
    }),
  })

  if (!jbRes.ok) {
    return NextResponse.json({ error: 'Error al consultar JetBrokers' }, { status: 502 })
  }

  const jbData = await jbRes.json()
  const apartments: unknown[] = Array.isArray(jbData.apartments) ? jbData.apartments : []

  const units: JBUnit[] = apartments.map((apt: unknown) => {
    const a = apt as Record<string, unknown>
    const model = (a.apartmentModel ?? {}) as Record<string, unknown>
    return {
      id: String(a.id ?? ''),
      number: String(a.number ?? ''),
      typology: String(model.name ?? ''),
      rooms: Number(model.rooms ?? 0),
      bathrooms: Number(model.bathrooms ?? 0),
      surfaceInterior: parseFloat(String(a.surfaceInterior ?? '0')),
      surfaceTerrace: parseFloat(String(a.surfaceTerrace ?? '0')),
      surfaceTotal: parseFloat(String(a.surfaceTotal ?? '0')),
      facing: a.facing ? String(a.facing) : null,
      price: parseFloat(String(a.price ?? '0')),
      finalPrice: parseFloat(String(a.finalPrice ?? '0')),
      discountRate: parseFloat(String(a.discountRate ?? '0')),
      bonoPie: parseFloat(String(a.bonoPie ?? '0')),
      available: Boolean(a.available),
      hasParking: a.parking !== null && a.parking !== undefined,
      hasStorage: a.store !== null && a.store !== undefined,
    }
  })

  return NextResponse.json({ units, total: units.length })
}
