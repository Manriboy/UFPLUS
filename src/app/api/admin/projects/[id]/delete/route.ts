// src/app/api/admin/projects/[id]/delete/route.ts
// Eliminación permanente de proyectos archivados — solo SUPERADMIN
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if ((session.user.role as string) !== 'SUPERADMIN')
    return NextResponse.json({ error: 'Requiere SUPERADMIN' }, { status: 403 })

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { isArchived: true, slug: true },
  })
  if (!project) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  if (!project.isArchived)
    return NextResponse.json({ error: 'Solo se pueden eliminar proyectos archivados' }, { status: 400 })

  await prisma.project.delete({ where: { id: params.id } })

  revalidatePath('/')
  revalidatePath('/proyectos')

  return NextResponse.json({ ok: true })
}
