// src/app/api/admin/brouk/refresh-token/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { token } = await req.json()
  if (!token || typeof token !== 'string' || token.trim().length < 20) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 400 })
  }

  await prisma.setting.upsert({
    where: { key: 'brouk_token' },
    update: { value: token.trim() },
    create: { key: 'brouk_token', value: token.trim() },
  })

  return NextResponse.json({ success: true })
}
