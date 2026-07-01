// src/app/api/admin/external/search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'

type SearchFilter = {
  q?: string
  commune?: string[]
  typologies?: string[]
  bonoPieMin?: number
  priceMin?: number
  priceMax?: number
  sources?: string[]    // ['iris','jetbrokers','brouk','ufplus'] — vacío = todas
  delivery?: 'immediate' | 'future'
}

const DELIVERY_STAGE: Record<string, string> = {
  IMMEDIATE:      'deliveryReady',
  SOON:           'green',
  FUTURE:         'green',
  IN_CONSTRUCTION:'white',
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const filter: SearchFilter = body.filter ?? {}

  const ALL_EXTERNAL = ['iris', 'jetbrokers', 'brouk']
  const activeSources = filter.sources && filter.sources.length > 0
    ? filter.sources
    : [...ALL_EXTERNAL, 'ufplus']

  const externalSources = activeSources.filter(s => s !== 'ufplus')
  const ufplusActive    = activeSources.includes('ufplus')

  // ── 1. External canonical query ─────────────────────────────────────────────
  const unitTrackedSources = externalSources.filter(s => s !== 'brouk')
  const broukActive        = externalSources.includes('brouk')

  const sourceConditions: Prisma.CanonicalProjectWhereInput[] = []
  if (unitTrackedSources.length > 0) {
    sourceConditions.push({
      externalProjects: {
        some: { source: { in: unitTrackedSources }, units: { some: { available: true } } },
      },
    })
  }
  if (broukActive) {
    sourceConditions.push({ externalProjects: { some: { source: 'brouk' } } })
  }

  const where: Prisma.CanonicalProjectWhereInput = sourceConditions.length > 0
    ? { OR: sourceConditions }
    : { id: { equals: '' } } // no external sources selected → empty result

  if (filter.q?.trim())                     where.name    = { contains: filter.q.trim(), mode: 'insensitive' }
  if (filter.commune && filter.commune.length > 0) where.commune = { in: filter.commune }

  const priceFilter: Prisma.FloatNullableFilter = {}
  if (filter.priceMin && filter.priceMin > 0) priceFilter.gte = filter.priceMin
  if (filter.priceMax && filter.priceMax > 0) priceFilter.lte = filter.priceMax
  if (Object.keys(priceFilter).length > 0)    where.priceFrom = priceFilter

  if (filter.typologies && filter.typologies.length > 0) {
    where.typologies = { hasSome: filter.typologies }
  }
  if (filter.bonoPieMin && filter.bonoPieMin > 0) {
    where.externalProjects = {
      some: { units: { some: { bonoPie: { gte: filter.bonoPieMin }, available: true } } },
    }
  }
  if (filter.delivery === 'immediate') where.stage = { in: ['deliveryReady', 'A estrenar'] }
  else if (filter.delivery === 'future') where.stage = { in: ['green', 'white', 'En pozo', 'En construcción'] }

  // ── 2. Internal projects query ───────────────────────────────────────────────
  const internalWhere: Prisma.ProjectWhereInput = { isArchived: false }
  if (filter.q?.trim())                              internalWhere.name    = { contains: filter.q.trim(), mode: 'insensitive' }
  if (filter.commune && filter.commune.length > 0)   internalWhere.commune = { in: filter.commune }
  if (filter.priceMin && filter.priceMin > 0)        internalWhere.priceFrom = { gte: filter.priceMin }
  if (filter.priceMax && filter.priceMax > 0)        internalWhere.priceFrom = { ...internalWhere.priceFrom as any, lte: filter.priceMax }
  if (filter.delivery === 'immediate')               internalWhere.deliveryType = { in: ['IMMEDIATE'] }
  else if (filter.delivery === 'future')             internalWhere.deliveryType = { in: ['SOON', 'FUTURE', 'IN_CONSTRUCTION'] }

  const [canonicalProjects, internalProjects, allCanonical] = await Promise.all([
    externalSources.length > 0 ? prisma.canonicalProject.findMany({
      where,
      orderBy: [{ priceFrom: 'asc' }, { name: 'asc' }],
      include: {
        externalProjects: {
          select: {
            id: true, source: true, sourceId: true,
            driveUrl: true, stockFileUrl: true, condicionesUrl: true,
            brochureUrl: true, notesHtml: true, paymentMethodsHtml: true,
            _count: { select: { units: { where: { available: true } } } },
          },
        },
      },
    }) : Promise.resolve([]),
    ufplusActive ? prisma.project.findMany({
      where: internalWhere,
      include: {
        typologies: { select: { name: true } },
        images:     { where: { isMain: true }, take: 1 },
      },
      orderBy: [{ priceFrom: 'asc' }, { name: 'asc' }],
    }) : Promise.resolve([]),
    prisma.canonicalProject.findMany({
      where: sourceConditions.length > 0 ? { OR: sourceConditions } : { id: '' },
      select: { commune: true, stage: true },
    }),
  ])

  // ── 3. BonoPie ──────────────────────────────────────────────────────────────
  const epIds = canonicalProjects.flatMap(p => p.externalProjects.map(ep => ep.id))
  const bonoPieByEpId = new Map<string, number>()

  if (epIds.length > 0) {
    const bonoPieGroups = await prisma.externalUnit.groupBy({
      by: ['projectId'],
      where: { projectId: { in: epIds }, available: true, bonoPie: { gt: 0 } },
      _max: { bonoPie: true },
    })
    for (const g of bonoPieGroups) bonoPieByEpId.set(g.projectId, g._max.bonoPie ?? 0)

    const irisEpIds = canonicalProjects
      .flatMap(p => p.externalProjects.filter(ep => ep.source === 'iris').map(ep => ep.id))
      .filter(id => !bonoPieByEpId.has(id))

    if (irisEpIds.length > 0) {
      const irisRaw = await prisma.$queryRaw<Array<{ id: string; cond: string | null }>>`
        SELECT id, "rawData"->>'pie_bonus_conditions' AS cond
        FROM "ExternalProject"
        WHERE id = ANY(${irisEpIds})
          AND "rawData"->>'pie_bonus' = 'true'
          AND "rawData"->>'pie_bonus_conditions' IS NOT NULL
      `
      for (const row of irisRaw) {
        const v = parseFloat(row.cond ?? '')
        if (!isNaN(v) && v > 0) bonoPieByEpId.set(row.id, v)
      }
    }
  }

  // ── 4. Build result list ─────────────────────────────────────────────────────
  // Map: canonical project name (lowercase) → index in results array
  const canonicalByName = new Map<string, number>()

  const results: any[] = canonicalProjects.map((p, idx) => {
    const maxBonoPie = p.externalProjects.reduce((max, ep) => {
      const v = bonoPieByEpId.get(ep.id) ?? 0
      return v > max ? v : max
    }, 0)
    canonicalByName.set(p.name.toLowerCase(), idx)
    return {
      ...p,
      unitCount:    p.externalProjects.reduce((sum, ep) => sum + ep._count.units, 0),
      maxBonoPie:   maxBonoPie > 0 ? maxBonoPie : null,
      externalProjects: p.externalProjects.map(({ _count: _c, id: _id, ...rest }) => rest),
    }
  })

  // Merge or add internal projects
  for (const ip of internalProjects) {
    const nameLower = ip.name.toLowerCase()
    const ufplusEp = {
      source:            'ufplus',
      sourceId:          ip.id,
      driveUrl:          ip.linkDrive ?? null,
      stockFileUrl:      ip.linkStock ?? null,
      condicionesUrl:    null,
      brochureUrl:       ip.brochureUrl ?? null,
      notesHtml:         null,
      paymentMethodsHtml:null,
    }

    if (canonicalByName.has(nameLower)) {
      // Merge: add ufplus links to existing canonical entry
      const idx = canonicalByName.get(nameLower)!
      results[idx].sources = Array.from(new Set([...results[idx].sources, 'ufplus']))
      results[idx].externalProjects.push(ufplusEp)
      // Use internal image if canonical has none
      if (!results[idx].imageUrl && ip.images[0]) results[idx].imageUrl = ip.images[0].url
    } else {
      // New entry: internal-only project
      const typologyNames = Array.from(new Set(ip.typologies.map(t => t.name)))
      results.push({
        id:             `ufplus-${ip.id}`,
        name:           ip.name,
        commune:        ip.commune ?? null,
        address:        ip.address ?? null,
        lat:            null, lng: null, hereLat: null, hereLng: null,
        deliveryPeriod: ip.deliveryType === 'IMMEDIATE' ? 'Entrega inmediata'
                      : ip.deliveryType === 'SOON'      ? 'Pronta entrega'
                      : ip.deliveryType === 'IN_CONSTRUCTION' ? 'En construcción'
                      : null,
        deliveryYear:   null,
        stage:          DELIVERY_STAGE[ip.deliveryType] ?? 'green',
        developerName:  null,
        priceFrom:      ip.priceFrom ?? null,
        imageUrl:       ip.images[0]?.url ?? null,
        typologies:     typologyNames,
        description:    ip.shortDescription ?? null,
        commercialDesc: null,
        condicionesUrl: null, brochureUrl: null, pie: null,
        reservaCLP:     null, cuotasPreEntrega: null,
        tags:           [],
        sources:        ['ufplus'],
        unitCount:      0,
        maxBonoPie:     null,
        externalProjects: [ufplusEp],
      })
    }
  }

  // ── 5. FilterOptions communes ────────────────────────────────────────────────
  const communeSet = new Set<string>()
  const stageSet   = new Set<string>()
  for (const p of allCanonical) {
    if (p.commune) communeSet.add(p.commune)
    if (p.stage)   stageSet.add(p.stage)
  }
  if (ufplusActive) {
    for (const ip of internalProjects) {
      if (ip.commune) communeSet.add(ip.commune)
    }
  }

  return NextResponse.json({
    projects: results,
    total:    results.length,
    filterOptions: {
      communes: Array.from(communeSet).sort(),
      stages:   Array.from(stageSet).sort(),
    },
  })
}
