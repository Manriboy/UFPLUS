// src/app/api/admin/external/search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'

type SearchFilter = {
  q?: string
  commune?: string[]
  stage?: string[]
  source?: string[]
  priceMin?: number
  priceMax?: number
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const filter: SearchFilter = body.filter ?? {}

  const where: Prisma.ExternalProjectWhereInput = {}

  if (filter.q?.trim()) {
    where.name = { contains: filter.q.trim(), mode: 'insensitive' }
  }
  if (filter.commune && filter.commune.length > 0) {
    where.commune = { in: filter.commune }
  }
  if (filter.stage && filter.stage.length > 0) {
    where.stage = { in: filter.stage }
  }
  if (filter.source && filter.source.length > 0) {
    where.source = { in: filter.source }
  }

  const priceFilter: Prisma.FloatNullableFilter = {}
  if (filter.priceMin !== undefined && filter.priceMin > 0) priceFilter.gte = filter.priceMin
  if (filter.priceMax !== undefined && filter.priceMax > 0) priceFilter.lte = filter.priceMax
  if (Object.keys(priceFilter).length > 0) where.priceFrom = priceFilter

  const [projects, allProjects] = await Promise.all([
    prisma.externalProject.findMany({
      where,
      orderBy: [{ priceFrom: 'asc' }, { name: 'asc' }],
    }),
    prisma.externalProject.findMany({
      select: { commune: true, stage: true },
    }),
  ])

  const communeSet = new Set<string>()
  const stageSet = new Set<string>()
  for (const p of allProjects) {
    if (p.commune) communeSet.add(p.commune)
    if (p.stage) stageSet.add(p.stage)
  }

  return NextResponse.json({
    projects,
    total: projects.length,
    filterOptions: {
      communes: Array.from(communeSet).sort(),
      stages: Array.from(stageSet).sort(),
    },
  })
}
