// src/app/api/stock/query/route.ts
// Public(ish) endpoint to query units with filters.
// GET /api/stock/query?projectId=&tipologia=&disponible=true&precioMin=&precioMax=&pisoMin=&pisoMax=

import { NextRequest, NextResponse } from 'next/server'
import { queryUnits } from '@/lib/stock-sync'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl

  const filters = {
    projectId: searchParams.get('projectId') ?? undefined,
    tipologia: searchParams.get('tipologia') ?? undefined,
    disponible:
      searchParams.has('disponible')
        ? searchParams.get('disponible') === 'true'
        : undefined,
    precioMin: searchParams.has('precioMin')
      ? parseFloat(searchParams.get('precioMin')!)
      : undefined,
    precioMax: searchParams.has('precioMax')
      ? parseFloat(searchParams.get('precioMax')!)
      : undefined,
    pisoMin: searchParams.has('pisoMin')
      ? parseInt(searchParams.get('pisoMin')!, 10)
      : undefined,
    pisoMax: searchParams.has('pisoMax')
      ? parseInt(searchParams.get('pisoMax')!, 10)
      : undefined,
  }

  try {
    const units = await queryUnits(filters)
    return NextResponse.json({ units })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
