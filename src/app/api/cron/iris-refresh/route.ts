// src/app/api/cron/iris-refresh/route.ts
// Llamado diariamente por Vercel Cron para renovar el token de Iris antes de que expire.
import { NextRequest, NextResponse } from 'next/server'
import { refreshIrisToken } from '@/lib/iris-token'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = await refreshIrisToken()
  if (!token) {
    console.error('[cron/iris-refresh] Falló la renovación automática del token de Iris')
    return NextResponse.json({ error: 'No se pudo renovar el token de Iris' }, { status: 500 })
  }

  console.log('[cron/iris-refresh] Token de Iris renovado exitosamente')
  return NextResponse.json({ success: true })
}
