import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const TT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
  'Cookie': 'X-DATA=a1b2c3d4-e5f6-7890-abcd-ef1234567890',
}

type ListingInput = {
  id: string
  title: string | null
  commune: string | null
  thumbnail: string | null
  permalink: string | null
  priceCLP: number | null
  priceUF: number | null
  area: number | null
  bedrooms: number | null
  bathrooms: number | null
}

async function scrapeCoords(url: string): Promise<{ lat: number | null; lng: number | null; address: string | null }> {
  try {
    const res = await fetch(url, { headers: TT_HEADERS })
    if (!res.ok) return { lat: null, lng: null, address: null }
    const html = await res.text()

    let lat: number | null = null
    let lng: number | null = null
    let address: string | null = null

    const coordMatch = html.match(/"coordenadas":\[(-?\d+\.?\d*),\s*(-?\d+\.?\d*)\]/)
    if (coordMatch) {
      lat = parseFloat(coordMatch[1])
      lng = parseFloat(coordMatch[2])
    }

    const addrMatch = html.match(/"direccion":"([^"]+)"/)
    if (addrMatch) {
      address = addrMatch[1].trim() || null
    }

    return { lat, lng, address }
  } catch {
    return { lat: null, lng: null, address: null }
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const listings: ListingInput[] = body.listings ?? []

  if (!listings.length) {
    return NextResponse.json({ error: 'No listings' }, { status: 400 })
  }

  const existingIds = new Set(
    (await prisma.rentalListing.findMany({
      where: { id: { in: listings.map(l => l.id) } },
      select: { id: true },
    })).map(r => r.id)
  )

  const newListings = listings.filter(l => !existingIds.has(l.id))
  let scraped = 0
  let saved = 0

  const BATCH_SIZE = 5
  for (let i = 0; i < newListings.length; i += BATCH_SIZE) {
    const batch = newListings.slice(i, i + BATCH_SIZE)
    const results = await Promise.all(
      batch.map(async (l) => {
        if (!l.permalink) return { ...l, lat: null, lng: null, address: null }
        const coords = await scrapeCoords(l.permalink)
        scraped++
        return { ...l, ...coords }
      })
    )

    const data = results.map(r => ({
      id:        r.id,
      title:     r.title,
      commune:   r.commune,
      address:   r.address,
      lat:       r.lat,
      lng:       r.lng,
      priceCLP:  r.priceCLP ? Math.round(r.priceCLP) : null,
      priceUF:   r.priceUF,
      area:      r.area,
      bedrooms:  r.bedrooms,
      bathrooms: r.bathrooms,
      thumbnail: r.thumbnail,
      permalink: r.permalink,
      syncedAt:  new Date(),
    }))

    for (const d of data) {
      await prisma.rentalListing.upsert({
        where: { id: d.id },
        create: d,
        update: d,
      })
      saved++
    }
  }

  return NextResponse.json({
    total: listings.length,
    alreadyExisted: existingIds.size,
    scraped,
    saved,
  })
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const sp = req.nextUrl.searchParams
  const commune = sp.get('commune')

  if (commune) {
    const { count } = await prisma.rentalListing.deleteMany({ where: { commune } })
    return NextResponse.json({ deleted: count })
  }

  const { count } = await prisma.rentalListing.deleteMany()
  return NextResponse.json({ deleted: count })
}
