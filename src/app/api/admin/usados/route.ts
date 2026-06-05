// src/app/api/admin/usados/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const filter = searchParams.get('filter') ?? 'all'
  const role = session.user.role as string
  const isStaff = ['ADMIN', 'SUPERADMIN', 'EDITOR'].includes(role)

  const where: Record<string, unknown> = {}
  if (!isStaff) where.ownerId = session.user.id  // propietario/broker only sees own
  if (filter === 'active')   { where.status = 'AVAILABLE'; where.isArchived = false }
  if (filter === 'inactive') { where.status = { in: ['DRAFT', 'PENDING', 'BLOCKED', 'SUSPENDED'] }; where.isArchived = false }
  if (filter === 'featured') { where.isFeatured = true; where.isArchived = false }
  if (filter === 'archived') { where.isArchived = true }
  else if (filter !== 'all') {} else { where.isArchived = false }

  const items = await prisma.usedProperty.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true, region: true, commune: true, bedrooms: true, bathrooms: true,
      parkingSpots: true, storageRooms: true, sqmTotal: true, sqmTerrace: true,
      price: true, status: true, isFeatured: true, isArchived: true, createdAt: true,
    },
  })

  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const item = await prisma.usedProperty.create({
    data: { ownerId: session.user.id, ...body },
  })
  return NextResponse.json(item, { status: 201 })
}
