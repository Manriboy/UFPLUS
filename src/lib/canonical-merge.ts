// src/lib/canonical-merge.ts
import prisma from './prisma'
import { ExternalProject } from '@prisma/client'

const SOURCE_PRIORITY = ['jetbrokers', 'iris', 'brouk']

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function mergeCanonical(sources: ExternalProject[]) {
  const sorted = [...sources].sort(
    (a, b) => SOURCE_PRIORITY.indexOf(a.source) - SOURCE_PRIORITY.indexOf(b.source)
  )

  const pick = <T>(field: keyof ExternalProject): T | null => {
    for (const s of sorted) {
      const v = s[field]
      if (v !== null && v !== undefined && v !== '') return v as T
    }
    return null
  }

  const prices = sources
    .map(s => s.priceFrom)
    .filter((v): v is number => v !== null && v > 0)
  const typologies = Array.from(new Set(sources.flatMap(s => s.typologies)))
  const tags = Array.from(new Set(sources.flatMap(s => s.tags)))
  const sourceNames = Array.from(
    new Set(
      sources
        .map(s => s.source)
        .sort((a, b) => SOURCE_PRIORITY.indexOf(a) - SOURCE_PRIORITY.indexOf(b))
    )
  )

  return {
    name: pick<string>('name') ?? '',
    commune: pick<string>('commune'),
    address: pick<string>('address'),
    lat: pick<number>('lat'),
    lng: pick<number>('lng'),
    hereLat: pick<number>('hereLat'),
    hereLng: pick<number>('hereLng'),
    deliveryPeriod: pick<string>('deliveryPeriod'),
    deliveryYear: pick<number>('deliveryYear'),
    stage: pick<string>('stage'),
    developerName: pick<string>('developerName'),
    priceFrom: prices.length > 0 ? Math.min(...prices) : null,
    imageUrl: pick<string>('imageUrl'),
    typologies,
    description: pick<string>('description'),
    commercialDesc: pick<string>('commercialDesc'),
    paymentMethodsHtml: pick<string>('paymentMethodsHtml'),
    condicionesUrl: pick<string>('condicionesUrl'),
    brochureUrl: pick<string>('brochureUrl'),
    notesHtml: pick<string>('notesHtml'),
    pie: pick<number>('pie'),
    reservaCLP: pick<number>('reservaCLP'),
    cuotasPreEntrega: pick<number>('cuotasPreEntrega'),
    tags,
    sources: sourceNames,
  }
}

export async function assignAndMergeCanonical(projectId: string): Promise<void> {
  const project = await prisma.externalProject.findUnique({ where: { id: projectId } })
  if (!project) return

  let canonicalId = project.canonicalId

  if (!canonicalId) {
    if (project.lat !== null && project.lng !== null) {
      // Bounding box pre-filter: ±0.001° lat ≈ ±111 m, ±0.0015° lng ≈ ±111 m at Santiago
      // Solo fusionar con canónicos que NO tengan ya un proyecto de la misma fuente:
      // evita mezclar Edificio A y Edificio B (ambos IRIS) en un solo canónico.
      const nearby = await prisma.canonicalProject.findMany({
        where: {
          lat: { gte: project.lat - 0.001, lte: project.lat + 0.001 },
          lng: { gte: project.lng - 0.0015, lte: project.lng + 0.0015 },
          externalProjects: { none: { source: project.source } },
        },
        select: { id: true, lat: true, lng: true },
      })
      for (const c of nearby) {
        if (haversine(project.lat, project.lng, c.lat!, c.lng!) <= 80) {
          canonicalId = c.id
          break
        }
      }
    }

    if (!canonicalId) {
      const data = mergeCanonical([project])
      const canonical = await prisma.canonicalProject.create({ data })
      canonicalId = canonical.id
    }

    await prisma.externalProject.update({ where: { id: projectId }, data: { canonicalId } })
  }

  // Re-merge canonical from all linked sources
  const siblings = await prisma.externalProject.findMany({ where: { canonicalId } })
  const merged = mergeCanonical(siblings)
  await prisma.canonicalProject.update({ where: { id: canonicalId }, data: merged })
}

/**
 * Separa canónicos que tienen más de un ExternalProject de la misma fuente
 * (consecuencia de la fusión incorrecta por proximidad).
 * Para cada duplicado, crea un nuevo canónico propio.
 * Debe llamarse una sola vez para limpiar datos históricos.
 */
export async function fixDuplicateSourceMerges(): Promise<number> {
  // Encontrar external projects que comparten fuente+canonical con otro
  const dupes = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT ep.id
    FROM "ExternalProject" ep
    WHERE ep."canonicalId" IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM "ExternalProject" ep2
        WHERE ep2."canonicalId" = ep."canonicalId"
          AND ep2.source = ep.source
          AND ep2.id < ep.id
      )
  `

  if (dupes.length === 0) return 0

  // Desligar los duplicados de su canónico actual
  const dupeIds = dupes.map(d => d.id)
  await prisma.externalProject.updateMany({
    where: { id: { in: dupeIds } },
    data: { canonicalId: null },
  })

  // Crear un nuevo canónico propio para cada uno
  for (const { id } of dupes) {
    await assignAndMergeCanonical(id)
  }

  return dupes.length
}
