// src/scripts/regeocode-iris.ts
// Run: npx tsx src/scripts/regeocode-iris.ts
import { config } from 'dotenv'
config({ path: '.env.local' })
config({ path: '.env' })

import prisma from '../lib/prisma'
import { assignAndMergeCanonical } from '../lib/canonical-merge'

const HERE_KEY = process.env.NEXT_PUBLIC_HERE_API_KEY

async function geocode(address: string, commune: string | null): Promise<{ lat: number; lng: number; score: number } | null> {
  const q = [address, commune, 'Chile'].filter(Boolean).join(', ')
  const url = `https://geocode.search.hereapi.com/v1/geocode?q=${encodeURIComponent(q)}&in=countryCode:CHL&apiKey=${HERE_KEY}`
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    const item = data.items?.[0]
    if (!item) return null
    return { lat: item.position.lat, lng: item.position.lng, score: item.scoring?.queryScore ?? 0 }
  } catch {
    return null
  }
}

async function main() {
  if (!HERE_KEY) throw new Error('NEXT_PUBLIC_HERE_API_KEY no configurado')

  const projects = await prisma.externalProject.findMany({
    where: { source: 'iris' },
    select: { id: true, address: true, commune: true, name: true, lat: true, lng: true },
  })

  console.log(`Re-geocodificando ${projects.length} proyectos Iris con HERE...\n`)

  let success = 0
  let skipped = 0
  let lowConfidence = 0

  for (let i = 0; i < projects.length; i++) {
    const p = projects[i]

    if (!p.address) {
      skipped++
      continue
    }

    const result = await geocode(p.address, p.commune)

    if (result) {
      if (result.score < 0.5) {
        console.log(`  ⚠  Baja confianza (${result.score.toFixed(2)}): ${p.name}`)
        lowConfidence++
      }
      await prisma.externalProject.update({
        where: { id: p.id },
        data: { lat: result.lat, lng: result.lng, hereLat: result.lat, hereLng: result.lng },
      })
      await assignAndMergeCanonical(p.id)
      success++
    } else {
      console.log(`  ✗  Sin resultado: ${p.name} (${p.address})`)
    }

    if ((i + 1) % 10 === 0 || i === projects.length - 1) {
      console.log(`  ${i + 1}/${projects.length}`)
    }

    // 5 req/s máximo en HERE free tier
    await new Promise(r => setTimeout(r, 210))
  }

  console.log(`\nListo: ${success} actualizados · ${skipped} sin dirección · ${lowConfidence} baja confianza`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
