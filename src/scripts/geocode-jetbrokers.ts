// src/scripts/geocode-jetbrokers.ts
// Llama workview por cada proyecto JetBrokers sin hereLat y pobla coordenadas.
// GPS directo si disponible, HERE geocoding si solo hay dirección.
// Run: npx tsx src/scripts/geocode-jetbrokers.ts
import { config } from 'dotenv'
config({ path: '.env.local' })
config({ path: '.env' })

import prisma from '../lib/prisma'
import { assignAndMergeCanonical } from '../lib/canonical-merge'

const JB_BASE = 'https://app.jetbrokers.io/api'
const JB_TOKEN = process.env.JETBROKERS_TOKEN ?? 'PtDBqd29'
const HERE_KEY = process.env.NEXT_PUBLIC_HERE_API_KEY

async function fetchWorkview(slug: string) {
  const res = await fetch(`${JB_BASE}/marketplace/${slug}/workview`, {
    headers: {
      Authorization: `Bearer ${JB_TOKEN}`,
      Accept: 'application/json',
      device: 'w',
      'jet-brokers-version': '7.42.2',
    },
  })
  if (!res.ok) return null
  return res.json().catch(() => null)
}

async function geocodeHere(address: string, commune: string | null): Promise<{ lat: number; lng: number } | null> {
  if (!HERE_KEY) return null
  const q = [address, commune, 'Chile'].filter(Boolean).join(', ')
  const url = `https://geocode.search.hereapi.com/v1/geocode?q=${encodeURIComponent(q)}&in=countryCode:CHL&apiKey=${HERE_KEY}`
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    const item = data.items?.[0]
    if (!item) return null
    return { lat: item.position.lat, lng: item.position.lng }
  } catch { return null }
}

async function main() {
  const projects = await prisma.externalProject.findMany({
    where: { source: 'jetbrokers', hereLat: null },
    select: { id: true, sourceId: true, name: true, address: true, commune: true },
    orderBy: { name: 'asc' },
  })

  console.log(`${projects.length} proyectos JetBrokers sin coordenadas HERE\n`)

  let gpsCount = 0
  let geocodedCount = 0
  let failCount = 0

  for (let i = 0; i < projects.length; i++) {
    const p = projects[i]
    const wv = await fetchWorkview(p.sourceId)

    let lat: number | null = null
    let lng: number | null = null
    let method = ''

    if (wv?.gpsLat && wv?.gpsLon) {
      lat = parseFloat(wv.gpsLat)
      lng = parseFloat(wv.gpsLon)
      method = 'GPS'
      gpsCount++
    } else {
      const address = wv?.address ?? p.address
      const commune = wv?.locality ?? p.commune
      if (address) {
        await new Promise(r => setTimeout(r, 210))
        const coords = await geocodeHere(address, commune)
        if (coords) {
          lat = coords.lat
          lng = coords.lng
          method = 'HERE'
          geocodedCount++
        }
      }
    }

    if (lat !== null && lng !== null) {
      await prisma.externalProject.update({
        where: { id: p.id },
        data: {
          lat, lng, hereLat: lat, hereLng: lng,
          // Actualizar address/commune si workview tiene datos frescos
          ...(wv?.address && { address: wv.address }),
          ...(wv?.locality && { commune: wv.locality }),
        },
      })
      await assignAndMergeCanonical(p.id)
      console.log(`  ✓ [${method}] ${p.name}`)
    } else {
      console.log(`  ✗ Sin coords: ${p.name}`)
      failCount++
    }

    if ((i + 1) % 20 === 0) console.log(`  — ${i + 1}/${projects.length}`)
    await new Promise(r => setTimeout(r, 100))
  }

  console.log(`\nListo: ${gpsCount} por GPS · ${geocodedCount} por HERE · ${failCount} sin resultado`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
