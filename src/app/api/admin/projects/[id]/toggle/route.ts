// src/app/api/admin/projects/[id]/toggle/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { field } = await req.json()

    if (!['isActive', 'isFeatured', 'isArchived'].includes(field)) {
      return NextResponse.json({ error: 'Campo inválido' }, { status: 400 })
    }

    const current = await prisma.project.findUnique({
      where: { id: params.id },
      select: { isActive: true, isFeatured: true, isArchived: true, publishedAt: true },
    })

    if (!current) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    const newValue = !current[field as keyof typeof current]
    
    const updateData: any = { [field]: newValue }
    
    // If activating, set publishedAt if not already set
    if (field === 'isActive' && newValue && !current.publishedAt) {
      updateData.publishedAt = new Date()
    }
    
    // If archiving, deactivate and unfeature
    if (field === 'isArchived' && newValue) {
      updateData.isActive = false
      updateData.isFeatured = false
    }

    const project = await prisma.project.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json(project)
  } catch (error) {
    console.error('Error toggling project:', error)
    return NextResponse.json({ error: 'Error al actualizar proyecto' }, { status: 500 })
  }
}
