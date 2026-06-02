// src/scripts/regeocode-all.ts
// Run: npx tsx src/scripts/regeocode-all.ts
import { config } from 'dotenv'
config({ path: '.env.local' })
config({ path: '.env' })

import prisma from '../lib/prisma'

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

async function regeocodeSource(source: string) {
  const projects = await prisma.externalProject.findMany({
    where: { source, address: { not: null } },
    select: { id: true, address: true, commune: true, name: true },
  })

  console.log(`\n[${source}] ${projects.length} proyectos con dirección`)

  let success = 0
  for (let i = 0; i < projects.length; i++) {
    const p = projects[i]
    const result = await geocode(p.address!, p.commune)
    if (result) {
      if (result.score < 0.5) console.log(`  ⚠  Baja confianza (${result.score.toFixed(2)}): ${p.name}`)
      await prisma.externalProject.update({
        where: { id: p.id },
        data: { lat: result.lat, lng: result.lng, hereLat: result.lat, hereLng: result.lng },
      })
      success++
    } else {
      console.log(`  ✗  Sin resultado: ${p.name} (${p.address})`)
    }
    if ((i + 1) % 5 === 0 || i === projects.length - 1) console.log(`  ${i + 1}/${projects.length}`)
    await new Promise(r => setTimeout(r, 210))
  }
  console.log(`  → ${success}/${projects.length} actualizados`)
}

async function main() {
  if (!HERE_KEY) throw new Error('NEXT_PUBLIC_HERE_API_KEY no configurado')
  await regeocodeSource('jetbrokers')
  await regeocodeSource('brouk')
  console.log('\nRe-geocodificación completa.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
