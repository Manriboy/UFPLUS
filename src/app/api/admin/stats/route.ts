// src/app/api/admin/stats/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const [
      totalProjects,
      activeProjects,
      inactiveProjects,
      featuredProjects,
      archivedProjects,
      totalLeads,
      newLeads,
    ] = await Promise.all([
      prisma.project.count({ where: { isArchived: false } }),
      prisma.project.count({ where: { isActive: true, isArchived: false } }),
      prisma.project.count({ where: { isActive: false, isArchived: false } }),
      prisma.project.count({ where: { isFeatured: true, isArchived: false } }),
      prisma.project.count({ where: { isArchived: true } }),
      prisma.lead.count(),
      prisma.lead.count({ where: { status: 'NEW' } }),
    ])

    return NextResponse.json({
      totalProjects,
      activeProjects,
      inactiveProjects,
      featuredProjects,
      archivedProjects,
      totalLeads,
      newLeads,
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 })
  }
}
