// src/app/api/admin/projects/[id]/images/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const images = await prisma.projectImage.findMany({
      where: { projectId: params.id },
      orderBy: { sortOrder: 'asc' },
    })
    return NextResponse.json(images)
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener imágenes' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { url, publicId, alt, isMain } = await req.json()

    if (!url) {
      return NextResponse.json({ error: 'URL requerida' }, { status: 400 })
    }

    // If setting as main, unset all others
    if (isMain) {
      await prisma.projectImage.updateMany({
        where: { projectId: params.id },
        data: { isMain: false },
      })
    }

    // Get max sort order
    const maxSort = await prisma.projectImage.aggregate({
      where: { projectId: params.id },
      _max: { sortOrder: true },
    })

    const image = await prisma.projectImage.create({
      data: {
        projectId: params.id,
        url,
        publicId: publicId || null,
        alt: alt || null,
        isMain: isMain || false,
        sortOrder: (maxSort._max.sortOrder || 0) + 1,
      },
    })

    return NextResponse.json(image, { status: 201 })
  } catch (error) {
    console.error('Error creating image:', error)
    return NextResponse.json({ error: 'Error al guardar imagen' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { imageId } = await req.json()

    await prisma.projectImage.delete({
      where: { id: imageId, projectId: params.id },
    })

    return NextResponse.json({ message: 'Imagen eliminada' })
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar imagen' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { imageId, isMain, sortOrder } = await req.json()

    if (isMain) {
      // Unset all main images
      await prisma.projectImage.updateMany({
        where: { projectId: params.id },
        data: { isMain: false },
      })
    }

    const image = await prisma.projectImage.update({
      where: { id: imageId },
      data: {
        ...(isMain !== undefined && { isMain }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    })

    return NextResponse.json(image)
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar imagen' }, { status: 500 })
  }
}
