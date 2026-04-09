// src/app/(public)/proyectos/page.tsx
export const dynamic = 'force-dynamic'
import { Metadata } from 'next'
import ProjectsClient from './ProjectsClient'
import prisma from '@/lib/prisma'

export const metadata: Metadata = {
  title: 'Proyectos de Inversión',
  description: 'Explora nuestra selección de departamentos de inversión en Chile. Filtra por ubicación, precio y tipo de entrega.',
}

async function getInitialData() {
  const [projects, communes] = await Promise.all([
    prisma.project.findMany({
      where: { isActive: true, isArchived: false },
      select: {
        id: true, name: true, slug: true, commune: true, city: true,
        priceFrom: true, currency: true, deliveryType: true,
        shortDescription: true, isFeatured: true, isActive: true,
        images: { where: { isMain: true }, take: 1, select: { url: true, alt: true } },
        typologies: { select: { name: true }, orderBy: { sortOrder: 'asc' } },
      },
      orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { publishedAt: 'desc' }],
    }),
    prisma.project.findMany({
      where: { isActive: true, isArchived: false, commune: { not: null } },
      select: { commune: true },
      distinct: ['commune'],
      orderBy: { commune: 'asc' },
    }),
  ])

  return {
    projects,
    communes: communes.map((c) => c.commune).filter(Boolean) as string[],
  }
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined }
}) {
  const { projects, communes } = await getInitialData()
  return <ProjectsClient initialProjects={projects as any} communes={communes} searchParams={searchParams} />
}
