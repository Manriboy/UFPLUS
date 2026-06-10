// src/app/api/admin/external/sync/jetbrokers/route.ts
// JetBrokers API no está disponible — sync deshabilitado.
// Los datos existentes en BD se mantienen; solo se desactivó la extracción.
import { NextResponse } from 'next/server'

const DISABLED = { error: 'JetBrokers sync deshabilitado — fuente de datos no disponible' }

export async function GET() {
  return new Response(
    `data: ${JSON.stringify({ error: true, message: DISABLED.error, progress: 0 })}\n\n`,
    { headers: { 'Content-Type': 'text/event-stream' }, status: 200 }
  )
}

export async function POST() {
  return NextResponse.json(DISABLED, { status: 410 })
}
