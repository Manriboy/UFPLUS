/**
 * Geocodifica los proyectos internos que no tienen lat/lng usando HERE.
 * Uso: npx tsx scripts/geocode-projects.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const HERE_KEY = process.env.NEXT_PUBLIC_HERE_API_KEY

async function geocode(address: string, commune: string | null, name: string): Promise<{ lat: number; lng: number } | null> {
  const query = [address, commune, 'Santiago', 'Chile'].filter(Boolean).join(', ')
  const url = `https://geocode.search.hereapi.com/v1/geocode?q=${encodeURIComponent(query)}&apiKey=${HERE_KEY}&limit=1`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = await res.json()
  const item = data.items?.[0]
  if (!item) return null
  return { lat: item.position.lat, lng: item.position.lng }
}

async function main() {
  if (!HERE_KEY) { console.error('ERROR: NEXT_PUBLIC_HERE_API_KEY no configurada en .env.local'); process.exit(1) }

  const projects = await prisma.project.findMany({
    where: { isArchived: false },
    select: { id: true, name: true, address: true, commune: true, lat: true, lng: true },
    orderBy: { name: 'asc' },
  })

  console.log(`\n📍 Total proyectos internos: ${projects.length}`)
  const withCoords = projects.filter(p => p.lat && p.lng).length
  const toGeocode  = projects.filter(p => !p.lat || !p.lng)
  console.log(`✅ Ya tienen coordenadas: ${withCoords}`)
  console.log(`🔍 A geocodificar: ${toGeocode.length}\n`)

  const ok: string[] = []
  const failed: { name: string; address: string | null; commune: string | null; reason: string }[] = []

  for (const p of toGeocode) {
    if (!p.address && !p.commune) {
      failed.push({ name: p.name, address: null, commune: null, reason: 'Sin dirección ni comuna' })
      continue
    }

    try {
      const coords = await geocode(p.address ?? '', p.commune, p.name)
      if (coords) {
        await prisma.project.update({
          where: { id: p.id },
          data: { lat: coords.lat, lng: coords.lng },
        })
        ok.push(`${p.name} → ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`)
        process.stdout.write(`  ✓ ${p.name}\n`)
      } else {
        failed.push({ name: p.name, address: p.address, commune: p.commune, reason: 'Sin resultado en HERE' })
        process.stdout.write(`  ✗ ${p.name} (sin resultado)\n`)
      }
    } catch (e: any) {
      failed.push({ name: p.name, address: p.address, commune: p.commune, reason: e.message })
      process.stdout.write(`  ✗ ${p.name} (error: ${e.message})\n`)
    }

    // Pequeña pausa para no saturar la API
    await new Promise(r => setTimeout(r, 150))
  }

  console.log(`\n─────────────────────────────────────────`)
  console.log(`✅ Geocodificados exitosamente: ${ok.length}`)
  ok.forEach(s => console.log(`   ${s}`))

  if (failed.length > 0) {
    console.log(`\n❌ Fallaron (${failed.length}):`)
    failed.forEach(f => {
      console.log(`   • ${f.name}`)
      console.log(`     Dirección: ${f.address ?? '(vacía)'}`)
      console.log(`     Comuna:    ${f.commune ?? '(vacía)'}`)
      console.log(`     Razón:     ${f.reason}`)
    })
  } else {
    console.log(`\n🎉 Todos los proyectos geocodificados correctamente.`)
  }

  console.log(`─────────────────────────────────────────\n`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
