// src/app/api/admin/projects/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { projectSchema } from '@/lib/validations'
import { slugify } from '@/lib/utils'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const filter = searchParams.get('filter') || 'all'
    const search = searchParams.get('search') || ''

    const where: any = {
      ...(filter === 'active' && { isActive: true, isArchived: false }),
      ...(filter === 'inactive' && { isActive: false, isArchived: false }),
      ...(filter === 'featured' && { isFeatured: true, isArchived: false }),
      ...(filter === 'archived' && { isArchived: true }),
      ...(filter === 'all' && {}),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { commune: { contains: search, mode: 'insensitive' } },
        ],
      }),
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        images: { where: { isMain: true }, take: 1 },
        typologies: { orderBy: { sortOrder: 'asc' } },
        amenities: true,
        financingOptions: true,
        _count: { select: { leads: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json(projects)
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json({ error: 'Error al obtener proyectos' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const validated = projectSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const { typologies, amenities, financingOptions, ...data } = validated.data

    // Check slug uniqueness
    const existing = await prisma.project.findUnique({ where: { slug: data.slug } })
    if (existing) {
      return NextResponse.json(
        { error: 'El slug ya existe. Elige uno diferente.' },
        { status: 409 }
      )
    }

    const project = await prisma.project.create({
      data: {
        ...data,
        videoUrl: data.videoUrl || null,
        publishedAt: data.isActive ? new Date() : null,
        typologies: {
          create: typologies,
        },
        amenities: {
          create: amenities,
        },
        financingOptions: {
          create: financingOptions,
        },
      },
      include: {
        typologies: true,
        amenities: true,
        financingOptions: true,
        images: true,
      },
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json({ error: 'Error al crear proyecto' }, { status: 500 })
  }
}
