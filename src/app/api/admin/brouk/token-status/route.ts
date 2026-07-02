import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function decodeJwtExp(token: string): number | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    return typeof payload.exp === 'number' ? payload.exp : null
  } catch { return null }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const [tokenRow, statusRow] = await Promise.all([
    prisma.setting.findUnique({ where: { key: 'brouk_token' } }),
    prisma.setting.findUnique({ where: { key: 'brouk_token_status' } }),
  ])

  const token    = tokenRow?.value || null
  const dbStatus = statusRow?.value as 'valid' | 'expired' | 'no_token' | null

  if (!token) {
    return NextResponse.json({ hasToken: false, status: 'no_token', daysLeft: null, expiresAt: null })
  }

  // Decodificar JWT para obtener expiración real
  const exp      = decodeJwtExp(token)
  const now      = Math.floor(Date.now() / 1000)
  const daysLeft = exp ? Math.floor((exp - now) / 86400) : null
  const isExpiredByJwt = daysLeft !== null && daysLeft < 0

  // El estado real: primero JWT (exacto), si no hay exp usamos el resultado del cron
  const status = isExpiredByJwt ? 'expired'
    : (daysLeft !== null ? 'valid' : (dbStatus ?? 'unknown'))

  return NextResponse.json({
    hasToken:  true,
    status,
    daysLeft,
    expiresAt: exp ? new Date(exp * 1000).toISOString() : null,
  })
}
