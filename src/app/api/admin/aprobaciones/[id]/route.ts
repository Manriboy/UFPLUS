// src/app/api/admin/aprobaciones/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!['ADMIN', 'SUPERADMIN'].includes(session.user.role as string))
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const item = await prisma.usedProperty.findUnique({ where: { id: params.id } })
  if (!item) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const updated = await prisma.usedProperty.update({
    where: { id: params.id },
    data: { status: 'AVAILABLE' },
  })

  return NextResponse.json(updated)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!['ADMIN', 'SUPERADMIN'].includes(session.user.role as string))
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  await prisma.usedProperty.update({
    where: { id: params.id },
    data: { isArchived: true, status: 'SUSPENDED' },
  })

  return NextResponse.json({ ok: true })
}
