// src/app/api/projects/[slug]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const project = await prisma.project.findFirst({
      where: {
        slug: params.slug,
        isActive: true,
        isArchived: false,
      },
      include: {
        typologies: { orderBy: { sortOrder: 'asc' } },
        amenities: true,
        financingOptions: true,
        images: { orderBy: [{ isMain: 'desc' }, { sortOrder: 'asc' }] },
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    // Related projects (same commune, different slug)
    const related = await prisma.project.findMany({
      where: {
        isActive: true,
        isArchived: false,
        commune: project.commune,
        NOT: { id: project.id },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        commune: true,
        priceFrom: true,
        currency: true,
        deliveryType: true,
        images: { where: { isMain: true }, take: 1, select: { url: true, alt: true } },
        typologies: { select: { name: true }, take: 3 },
      },
      take: 3,
    })

    return NextResponse.json({ project, related })
  } catch (error) {
    console.error('Error fetching project detail:', error)
    return NextResponse.json({ error: 'Error al obtener proyecto' }, { status: 500 })
  }
}
