// src/app/api/admin/external/sync/jetbrokers/refresh-token/route.ts
// JetBrokers API no está disponible — token refresh deshabilitado.
import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ error: 'JetBrokers no disponible' }, { status: 410 })
}
