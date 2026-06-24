import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function decodeExp(token: string): number | null {
  try {
    const payload = token.split('.')[1]
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString())
    return typeof decoded.exp === 'number' ? decoded.exp : null
  } catch { return null }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const [gAuthRow, accessRow] = await Promise.all([
    prisma.setting.findUnique({ where: { key: 'tt_jwt_gauth'    } }),
    prisma.setting.findUnique({ where: { key: 'tt_access_token' } }),
  ])

  return NextResponse.json({
    gAuthConnected:  !!gAuthRow?.value,
    accessConnected: !!accessRow?.value,
    gAuthExp:        gAuthRow?.value  ? decodeExp(gAuthRow.value)  : null,
    accessExp:       accessRow?.value ? decodeExp(accessRow.value) : null,
  })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const gAuth  = (body.ttJwtGauth    ?? '').trim()
  const access = (body.ttAccessToken ?? '').trim()

  if (!gAuth && !access) {
    return NextResponse.json({ error: 'No data' }, { status: 400 })
  }

  const ops = []
  if (gAuth) {
    ops.push(prisma.setting.upsert({
      where:  { key: 'tt_jwt_gauth' },
      create: { key: 'tt_jwt_gauth', value: gAuth },
      update: { value: gAuth },
    }))
  }
  if (access) {
    ops.push(prisma.setting.upsert({
      where:  { key: 'tt_access_token' },
      create: { key: 'tt_access_token', value: access },
      update: { value: access },
    }))
  }

  await Promise.all(ops)
  return NextResponse.json({ ok: true })
}
