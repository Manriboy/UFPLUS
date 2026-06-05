// src/app/api/admin/usados/[id]/toggle/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const item = await prisma.usedProperty.findUnique({ where: { id: params.id } })
  if (!item) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const isStaff = ['ADMIN', 'SUPERADMIN', 'EDITOR'].includes(session.user.role as string)
  if (!isStaff && item.ownerId !== session.user.id)
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { field } = await req.json()
  if (field !== 'isFeatured') return NextResponse.json({ error: 'Campo inválido' }, { status: 400 })

  const updated = await prisma.usedProperty.update({
    where: { id: params.id },
    data: { isFeatured: !item.isFeatured },
    select: { id: true, isFeatured: true },
  })
  return NextResponse.json(updated)
}
