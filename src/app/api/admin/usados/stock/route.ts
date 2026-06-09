// src/app/api/admin/usados/stock/route.ts
// Devuelve todas las propiedades usadas AVAILABLE para la vista de Stock usados (brokers y staff)
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const items = await prisma.usedProperty.findMany({
    where: { status: 'AVAILABLE', isArchived: false },
    orderBy: [{ isFeatured: 'desc' }, { updatedAt: 'desc' }],
    select: {
      id: true, title: true, commune: true, region: true,
      price: true, currency: true,
      bedrooms: true, bathrooms: true, parkingSpots: true, sqmTotal: true,
      storageRooms: true, sqmTerrace: true,
      lat: true, lng: true,
      images: true, isFeatured: true, propertyType: true,
    },
  })

  return NextResponse.json(items)
}
