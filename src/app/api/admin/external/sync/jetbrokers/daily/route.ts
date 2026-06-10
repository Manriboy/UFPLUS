// src/app/api/admin/external/sync/jetbrokers/daily/route.ts
// JetBrokers API no está disponible — sync deshabilitado.
import { NextResponse } from 'next/server'

export async function GET() {
  return new Response(
    `data: ${JSON.stringify({ error: true, message: 'JetBrokers sync deshabilitado', progress: 0 })}\n\n`,
    { headers: { 'Content-Type': 'text/event-stream' }, status: 200 }
  )
}

export async function POST() {
  return NextResponse.json({ error: 'JetBrokers sync deshabilitado' }, { status: 410 })
}
