// src/app/api/admin/projects/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { projectSchema } from '@/lib/validations'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        typologies: { orderBy: { sortOrder: 'asc' } },
        amenities: true,
        financingOptions: true,
        images: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { leads: true } },
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error('Error fetching project:', error)
    return NextResponse.json({ error: 'Error al obtener proyecto' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Check slug uniqueness (excluding current project)
    const existing = await prisma.project.findFirst({
      where: { slug: data.slug, NOT: { id: params.id } },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'El slug ya está en uso por otro proyecto.' },
        { status: 409 }
      )
    }

    // Get current project to check if it was already active
    const current = await prisma.project.findUnique({ where: { id: params.id } })

    const project = await prisma.$transaction(async (tx) => {
      // Delete existing related records
      await tx.typology.deleteMany({ where: { projectId: params.id } })
      await tx.projectAmenity.deleteMany({ where: { projectId: params.id } })
      await tx.financingOption.deleteMany({ where: { projectId: params.id } })

      // Update project
      return tx.project.update({
        where: { id: params.id },
        data: {
          ...data,
          videoUrl: data.videoUrl || null,
          publishedAt:
            data.isActive && !current?.publishedAt ? new Date() : current?.publishedAt,
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
          typologies: { orderBy: { sortOrder: 'asc' } },
          amenities: true,
          financingOptions: true,
          images: { orderBy: { sortOrder: 'asc' } },
        },
      })
    })

    return NextResponse.json(project)
  } catch (error) {
    console.error('Error updating project:', error)
    return NextResponse.json({ error: 'Error al actualizar proyecto' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Soft delete: archive the project instead of physical deletion
    const project = await prisma.project.update({
      where: { id: params.id },
      data: {
        isArchived: true,
        isActive: false,
        isFeatured: false,
      },
    })

    return NextResponse.json({ message: 'Proyecto archivado correctamente', project })
  } catch (error) {
    console.error('Error archiving project:', error)
    return NextResponse.json({ error: 'Error al archivar proyecto' }, { status: 500 })
  }
}
