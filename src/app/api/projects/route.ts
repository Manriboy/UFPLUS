// src/app/api/projects/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const commune = searchParams.get('commune') || ''
    const deliveryType = searchParams.get('deliveryType') || ''
    const priceMin = parseFloat(searchParams.get('priceMin') || '0')
    const priceMax = parseFloat(searchParams.get('priceMax') || '0')
    const featured = searchParams.get('featured') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const skip = (page - 1) * limit

    const where: any = {
      isActive: true,
      isArchived: false,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { commune: { contains: search, mode: 'insensitive' } },
          { address: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(commune && { commune: { contains: commune, mode: 'insensitive' } }),
      ...(deliveryType && { deliveryType }),
      ...(priceMin > 0 && { priceFrom: { gte: priceMin } }),
      ...(priceMax > 0 && { priceFrom: { lte: priceMax } }),
      ...(featured && { isFeatured: true }),
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          commune: true,
          city: true,
          priceFrom: true,
          currency: true,
          deliveryType: true,
          shortDescription: true,
          isFeatured: true,
          isActive: true,
          images: {
            where: { isMain: true },
            take: 1,
            select: { url: true, alt: true },
          },
          typologies: {
            select: { name: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { publishedAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.project.count({ where }),
    ])

    // Get available communes for filters
    const communes = await prisma.project.findMany({
      where: { isActive: true, isArchived: false },
      select: { commune: true },
      distinct: ['commune'],
      orderBy: { commune: 'asc' },
    })

    return NextResponse.json({
      projects,
      total,
      page,
      pages: Math.ceil(total / limit),
      communes: communes.map((c) => c.commune).filter(Boolean),
    })
  } catch (error) {
    console.error('Error fetching public projects:', error)
    return NextResponse.json({ error: 'Error al obtener proyectos' }, { status: 500 })
  }
}
