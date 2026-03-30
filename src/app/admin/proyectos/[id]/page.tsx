// src/app/admin/proyectos/[id]/page.tsx
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, ExternalLink } from 'lucide-react'
import prisma from '@/lib/prisma'
import ProjectForm from '@/components/admin/ProjectForm'
import ImageManager from '@/components/admin/ImageManager'

interface Props { params: { id: string } }

async function getProject(id: string) {
  return prisma.project.findUnique({
    where: { id },
    include: {
      typologies: { orderBy: { sortOrder: 'asc' } },
      amenities: true,
      financingOptions: true,
      images: { orderBy: [{ isMain: 'desc' }, { sortOrder: 'asc' }] },
    },
  })
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const project = await getProject(params.id)
  return { title: project ? `Editar: ${project.name}` : 'Proyecto no encontrado' }
}

export default async function EditProjectPage({ params }: Props) {
  const project = await getProject(params.id)
  if (!project) notFound()

  // Serialize for client component
  const projectData = {
    ...project,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    publishedAt: project.publishedAt?.toISOString() ?? null,
    images: project.images.map((img) => ({
      ...img,
      createdAt: img.createdAt.toISOString(),
    })),
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/admin/proyectos" className="hover:text-brand-primary transition-colors">
          Proyectos
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-brand-text font-medium truncate max-w-xs">{project.name}</span>
      </nav>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-brand-text">{project.name}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Editando proyecto · Slug:{' '}
            <code className="bg-gray-100 px-1 py-0.5 text-xs rounded">{project.slug}</code>
          </p>
        </div>
        {project.isActive && (
          <Link
            href={`/proyectos/${project.slug}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-brand-secondary border border-gray-300 hover:border-brand-primary hover:text-brand-primary transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Ver publicado
          </Link>
        )}
      </div>

      {/* Image Manager */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="font-semibold text-brand-text mb-4">Imágenes del proyecto</h2>
        <ImageManager projectId={project.id} initialImages={projectData.images} />
      </div>

      {/* Project Form */}
      <ProjectForm project={projectData as any} />
    </div>
  )
}
