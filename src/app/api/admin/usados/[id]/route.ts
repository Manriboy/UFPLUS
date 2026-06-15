// src/app/api/admin/usados/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { fetchNearbyServices } from '@/lib/nearby-services'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const item = await prisma.usedProperty.findUnique({ where: { id: params.id } })
  if (!item) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const isStaff = ['ADMIN', 'SUPERADMIN', 'EDITOR'].includes(session.user.role as string)
  if (!isStaff && item.ownerId !== session.user.id)
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  return NextResponse.json(item)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const item = await prisma.usedProperty.findUnique({ where: { id: params.id } })
  if (!item) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const isStaff = ['ADMIN', 'SUPERADMIN', 'EDITOR'].includes(session.user.role as string)
  if (!isStaff && item.ownerId !== session.user.id)
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const body = await req.json()

  // Cachear servicios cercanos la primera vez que se publica (PENDING)
  if (
    body.status === 'PENDING' &&
    !item.nearbyServicesJson &&
    item.lat != null && item.lng != null
  ) {
    try {
      body.nearbyServicesJson = await fetchNearbyServices(item.lat, item.lng)
    } catch {
      // no bloqueamos la publicación si falla
    }
  }

  const updated = await prisma.usedProperty.update({ where: { id: params.id }, data: body })
  return NextResponse.json(updated)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const item = await prisma.usedProperty.findUnique({ where: { id: params.id } })
  if (!item) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const isStaff = ['ADMIN', 'SUPERADMIN', 'EDITOR'].includes(session.user.role as string)
  if (!isStaff && item.ownerId !== session.user.id)
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  await prisma.usedProperty.update({ where: { id: params.id }, data: { isArchived: true } })
  return NextResponse.json({ ok: true })
}
