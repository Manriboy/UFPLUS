// src/app/api/admin/ml/token/route.ts — entrega el token ML al cliente admin autenticado
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const [atRow, rtRow, expRow] = await Promise.all([
    prisma.setting.findUnique({ where: { key: 'ml_access_token' } }),
    prisma.setting.findUnique({ where: { key: 'ml_refresh_token' } }),
    prisma.setting.findUnique({ where: { key: 'ml_token_expires_at' } }),
  ])

  if (!atRow?.value) {
    return NextResponse.json({ error: 'not_connected' }, { status: 403 })
  }

  const expiresAt   = expRow ? Number(expRow.value) : 0
  const needsRefresh = Date.now() > expiresAt - 5 * 60 * 1000

  if (!needsRefresh || !rtRow?.value) {
    return NextResponse.json({ token: atRow.value })
  }

  // Refrescar token antes de devolverlo
  try {
    const res = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'refresh_token',
        client_id:     process.env.ML_CLIENT_ID ?? '',
        client_secret: process.env.ML_CLIENT_SECRET ?? '',
        refresh_token: rtRow.value,
      }),
    })
    if (!res.ok) return NextResponse.json({ token: atRow.value })

    const data       = await res.json()
    const newExpiry  = Date.now() + data.expires_in * 1000
    await Promise.all([
      prisma.setting.update({ where: { key: 'ml_access_token' },  data: { value: data.access_token } }),
      prisma.setting.update({ where: { key: 'ml_refresh_token' }, data: { value: data.refresh_token } }),
      prisma.setting.upsert({
        where:  { key: 'ml_token_expires_at' },
        create: { key: 'ml_token_expires_at', value: String(newExpiry) },
        update: { value: String(newExpiry) },
      }),
    ])
    return NextResponse.json({ token: data.access_token })
  } catch {
    return NextResponse.json({ token: atRow.value })
  }
}
