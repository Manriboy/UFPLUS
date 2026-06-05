// src/app/api/admin/aprobaciones/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!['ADMIN', 'SUPERADMIN'].includes(session.user.role as string))
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const items = await prisma.usedProperty.findMany({
    where: { status: 'PENDING', isArchived: false },
    orderBy: { updatedAt: 'asc' },
    select: {
      id: true, region: true, commune: true,
      bedrooms: true, bathrooms: true, parkingSpots: true, storageRooms: true,
      sqmTotal: true, sqmTerrace: true, price: true, currency: true,
      updatedAt: true,
      owner: { select: { id: true, name: true, email: true, phone: true, role: true } },
    },
  })

  return NextResponse.json(items)
}
