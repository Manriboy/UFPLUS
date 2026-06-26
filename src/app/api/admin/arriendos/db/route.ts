import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const sp      = req.nextUrl.searchParams
  const commune = sp.get('commune')?.trim() || undefined

  const where = commune ? { commune } : {}
  const listings = await prisma.rentalListing.findMany({
    where,
    orderBy: { syncedAt: 'desc' },
  })

  const communes = await prisma.rentalListing.groupBy({
    by: ['commune'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  })

  const lastSync = listings.length > 0
    ? listings.reduce((max, l) => l.syncedAt > max ? l.syncedAt : max, listings[0].syncedAt)
    : null

  return NextResponse.json({
    results: listings.map(l => ({
      id:        l.id,
      title:     l.title,
      commune:   l.commune,
      address:   l.address,
      lat:       l.lat,
      lng:       l.lng,
      priceCLP:  l.priceCLP,
      priceUF:   l.priceUF,
      area:      l.area,
      bedrooms:  l.bedrooms,
      bathrooms: l.bathrooms,
      thumbnail: l.thumbnail,
      permalink: l.permalink,
    })),
    total: listings.length,
    communes: communes.map(c => ({ commune: c.commune, count: c._count.id })),
    lastSync: lastSync?.toISOString() ?? null,
  })
}
