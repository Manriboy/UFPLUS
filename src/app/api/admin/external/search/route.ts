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
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const filter: SearchFilter = body.filter ?? {}

  // Base: solo proyectos con al menos una unidad disponible
  const where: Prisma.CanonicalProjectWhereInput = {
    externalProjects: { some: { units: { some: { available: true } } } },
  }

  if (filter.q?.trim()) {
    where.name = { contains: filter.q.trim(), mode: 'insensitive' }
  }
  if (filter.commune && filter.commune.length > 0) {
    where.commune = { in: filter.commune }
  }

  const priceFilter: Prisma.FloatNullableFilter = {}
  if (filter.priceMin !== undefined && filter.priceMin > 0) priceFilter.gte = filter.priceMin
  if (filter.priceMax !== undefined && filter.priceMax > 0) priceFilter.lte = filter.priceMax
  if (Object.keys(priceFilter).length > 0) where.priceFrom = priceFilter

  if (filter.typologies && filter.typologies.length > 0) {
    where.typologies = { hasSome: filter.typologies }
  }

  if (filter.bonoPieMin !== undefined && filter.bonoPieMin > 0) {
    where.externalProjects = {
      some: {
        units: { some: { bonoPie: { gte: filter.bonoPieMin }, available: true } },
      },
    }
  }

  // filterOptions: communes/stages solo de proyectos con unidades
  const [projects, allProjects] = await Promise.all([
    prisma.canonicalProject.findMany({
      where,
      orderBy: [{ priceFrom: 'asc' }, { name: 'asc' }],
      include: {
        externalProjects: {
          select: {
            id: true,
            source: true,
            sourceId: true,
            driveUrl: true,
            stockFileUrl: true,
            condicionesUrl: true,
            brochureUrl: true,
            notesHtml: true,
            paymentMethodsHtml: true,
            _count: { select: { units: { where: { available: true } } } },
          },
        },
      },
    }),
    prisma.canonicalProject.findMany({
      where: { externalProjects: { some: { units: { some: { available: true } } } } },
      select: { commune: true, stage: true },
    }),
  ])

  const epIds = projects.flatMap(p => p.externalProjects.map(ep => ep.id))

  // 1. Max bonoPie desde ExternalUnit (JetBrokers + IRIS unidades individuales)
  const bonoPieGroups = await prisma.externalUnit.groupBy({
    by: ['projectId'],
    where: { projectId: { in: epIds }, available: true, bonoPie: { gt: 0 } },
    _max: { bonoPie: true },
  })
  const bonoPieByEpId = new Map(bonoPieGroups.map(g => [g.projectId, g._max.bonoPie ?? 0]))

  // 2. Para EPs de IRIS sin bonoPie por unidad, leer pie_bonus_conditions del rawData (nivel proyecto)
  const irisEpIds = projects
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

  const communeSet = new Set<string>()
  const stageSet = new Set<string>()
  for (const p of allProjects) {
    if (p.commune) communeSet.add(p.commune)
    if (p.stage) stageSet.add(p.stage)
  }

  const projectsWithCount = projects.map(p => {
    const maxBonoPie = p.externalProjects.reduce((max, ep) => {
      const v = bonoPieByEpId.get(ep.id) ?? 0
      return v > max ? v : max
    }, 0)
    return {
      ...p,
      unitCount: p.externalProjects.reduce((sum, ep) => sum + ep._count.units, 0),
      maxBonoPie: maxBonoPie > 0 ? maxBonoPie : null,
      externalProjects: p.externalProjects.map(({ _count: _c, id: _id, ...rest }) => rest),
    }
  })

  return NextResponse.json({
    projects: projectsWithCount,
    total: projectsWithCount.length,
    filterOptions: {
      communes: Array.from(communeSet).sort(),
      stages: Array.from(stageSet).sort(),
    },
  })
}
