// src/app/api/admin/superadmin/flags/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

const SETTING_KEY = 'admin_nav_flags'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const setting = await prisma.setting.findUnique({ where: { key: SETTING_KEY } })
  const flags: Record<string, boolean> = setting ? JSON.parse(setting.value) : {}
  return NextResponse.json({ flags })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body = await req.json() as { flags: Record<string, boolean> }
  await prisma.setting.upsert({
    where: { key: SETTING_KEY },
    create: { key: SETTING_KEY, value: JSON.stringify(body.flags) },
    update: { value: JSON.stringify(body.flags) },
  })
  return NextResponse.json({ ok: true })
}
