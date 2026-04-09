// src/app/api/stock/sync/route.ts
// Protected admin endpoint to trigger a stock sync for a given StockSource.
// POST /api/stock/sync  { stockSourceId: string }

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { syncStock } from '@/lib/stock-sync'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  let stockSourceId: string
  try {
    const body = await req.json()
    stockSourceId = body?.stockSourceId
    if (!stockSourceId) throw new Error('stockSourceId requerido')
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  try {
    const result = await syncStock(stockSourceId)
    return NextResponse.json({ ok: true, result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
