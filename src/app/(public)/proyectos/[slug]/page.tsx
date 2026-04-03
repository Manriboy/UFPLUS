// src/app/(public)/proyectos/[slug]/page.tsx
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import prisma from '@/lib/prisma'
import ContactForm from '@/components/public/ContactForm'
import ProjectCard from '@/components/public/ProjectCard'
import {
  MapPin, CheckCircle, Play,
  Building2, BadgeDollarSign, ChevronRight,
} from 'lucide-react'
import {
  formatPrice, formatArea, DELIVERY_TYPE_LABELS, DELIVERY_TYPE_COLORS,
  getEmbedUrl, cn,
} from '@/lib/utils'

interface Props {
  params: { slug: string }
}

async function getProject(slug: string) {
  return prisma.project.findFirst({
    where: { slug, isActive: true, isArchived: false },
    include: {
      typologies: { orderBy: { sortOrder: 'asc' } },
      amenities: true,
      financingOptions: true,
      images: { orderBy: [{ isMain: 'desc' }, { sortOrder: 'asc' }] },
    },
  })
}

async function getRelated(commune: string | null, excludeId: string) {
  return prisma.project.findMany({
    where: {
      isActive: true, isArchived: false,
      commune: commune || undefined,
      NOT: { id: excludeId },
    },
    select: {
      id: true, name: true, slug: true, commune: true, city: true,
      priceFrom: true, currency: true, deliveryType: true,
      shortDescription: true, isFeatured: true, isActive: true,
      images: { where: { isMain: true }, take: 1, select: { url: true, alt: true } },
      typologies: { select: { name: true }, orderBy: { sortOrder: 'asc' } },
    },
    take: 3,
  })
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const project = await getProject(params.slug)
  if (!project) return { title: 'Proyecto no encontrado' }
  return {
    title: project.metaTitle || `${project.name} | UFPlus`,
    description: project.metaDescription || project.shortDescription || undefined,
    openGraph: {
      title: project.metaTitle || project.name,
      description: project.metaDescription || project.shortDescription || undefined,
      images: project.images[0]?.url ? [project.images[0].url] : [],
    },
  }
}

// Revalidar cada 60s para reflejar cambios del admin sin perder SSG
export const revalidate = 60

export async function generateStaticParams() {
  const projects = await prisma.project.findMany({
    where: { isActive: true, isArchived: false },
    select: { slug: true },
  })
  return projects.map((p) => ({ slug: p.slug }))
}

export default async function ProjectDetailPage({ params }: Props) {
  const project = await getProject(params.slug)
  if (!project) notFound()

  const related = await getRelated(project.commune, project.id)
  const mainImage = project.images.find((i) => i.isMain) || project.images[0]
  const galleryImages = project.images.filter((i) => i.id !== mainImage?.id)
  const deliveryLabel = DELIVERY_TYPE_LABELS[project.deliveryType]
  const deliveryColor = DELIVERY_TYPE_COLORS[project.deliveryType]
  const embedUrl = project.videoUrl ? getEmbedUrl(project.videoUrl, project.videoType) : null
  const mapAddress = [project.address, project.commune, project.city, project.region].filter(Boolean).join(', ')
  const mapUrl = mapAddress
    ? `https://www.google.com/maps?q=${encodeURIComponent(mapAddress)}&output=embed`
    : null

  return (
    <div className="min-h-screen bg-white pt-20">
      {/* Breadcrumb */}
      <div className="bg-brand-surface border-b border-gray-200">
        <div className="container-section py-3">
          <nav className="flex items-center gap-2 text-sm text-brand-secondary">
            <Link href="/" className="hover:text-brand-primary transition-colors">Inicio</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href="/proyectos" className="hover:text-brand-primary transition-colors">Proyectos</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-brand-text font-medium truncate max-w-[200px]">{project.name}</span>
          </nav>
        </div>
      </div>

      <div className="container-section py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-10">
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <span className={cn('badge text-xs font-semibold px-2.5 py-1', deliveryColor)}>
                  {deliveryLabel}
                </span>
                {project.isFeatured && (
                  <span className="badge bg-brand-primary text-white text-xs font-semibold px-2.5 py-1">
                    Proyecto destacado
                  </span>
                )}
              </div>
              <h1 className="font-display text-4xl sm:text-5xl font-bold text-brand-text mb-3 leading-tight">
                {project.name}
              </h1>
              <div className="flex items-center gap-2 text-brand-secondary">
                <MapPin className="w-4 h-4 text-brand-primary shrink-0" />
                <span>
                  {[project.address, project.commune, project.city, project.region]
                    .filter(Boolean).join(', ')}
                </span>
              </div>
            </div>

            {mainImage && (
              <div className="relative h-72 sm:h-96 overflow-hidden bg-gray-100">
                <Image
                  src={mainImage.url}
                  alt={mainImage.alt || project.name}
                  fill className="object-cover" priority
                  sizes="(max-width: 1024px) 100vw, 66vw"
                />
              </div>
            )}

            {galleryImages.length > 0 && (
              <div>
                <h2 className="font-display text-xl font-semibold text-brand-text mb-4">Galería</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {galleryImages.slice(0, 6).map((img, i) => (
                    <div key={img.id} className="relative h-40 overflow-hidden bg-gray-100">
                      <Image
                        src={img.url} alt={img.alt || `${project.name} - imagen ${i + 2}`}
                        fill className="object-cover hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 768px) 50vw, 33vw"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {embedUrl && (
              <div>
                <h2 className="font-display text-xl font-semibold text-brand-text mb-4 flex items-center gap-2">
                  <Play className="w-5 h-5 text-brand-primary" /> Video del proyecto
                </h2>
                <div className="relative aspect-video bg-black">
                  <iframe src={embedUrl} title={`Video ${project.name}`}
                    className="absolute inset-0 w-full h-full" allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                </div>
              </div>
            )}

            {(project.shortDescription || project.longDescription) && (
              <div>
                <h2 className="font-display text-xl font-semibold text-brand-text mb-4">Sobre el proyecto</h2>
                {project.shortDescription && (
                  <p className="text-brand-secondary text-lg leading-relaxed mb-4 font-medium">
                    {project.shortDescription}
                  </p>
                )}
                {project.longDescription && (
                  <p className="text-brand-secondary leading-relaxed whitespace-pre-line">
                    {project.longDescription}
                  </p>
                )}
              </div>
            )}

            {project.typologies.length > 0 && (
              <div>
                <h2 className="font-display text-xl font-semibold text-brand-text mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-brand-primary" /> Tipologías disponibles
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-brand-surface text-brand-secondary text-left">
                        <th className="px-4 py-3 font-medium">Tipología</th>
                        <th className="px-4 py-3 font-medium">Sup. útil</th>
                        <th className="px-4 py-3 font-medium hidden sm:table-cell">Sup. total</th>
                        <th className="px-4 py-3 font-medium">Precio desde</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {project.typologies.map((t) => (
                        <tr key={t.id} className="hover:bg-brand-surface transition-colors">
                          <td className="px-4 py-3 font-medium text-brand-text">{t.name}</td>
                          <td className="px-4 py-3 text-brand-secondary">{t.usefulArea ? formatArea(t.usefulArea) : '—'}</td>
                          <td className="px-4 py-3 text-brand-secondary hidden sm:table-cell">{t.totalArea ? formatArea(t.totalArea) : '—'}</td>
                          <td className="px-4 py-3 font-semibold text-brand-primary">
                            {t.priceFrom ? formatPrice(t.priceFrom, project.currency || 'UF') : 'Consultar'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {project.amenities.length > 0 && (
              <div>
                <h2 className="font-display text-xl font-semibold text-brand-text mb-4">Amenities</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {project.amenities.map((a) => (
                    <div key={a.id} className="flex items-center gap-2.5 p-3 bg-brand-surface">
                      <CheckCircle className="w-4 h-4 text-brand-primary shrink-0" />
                      <span className="text-sm text-brand-secondary">{a.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {project.financingOptions.length > 0 && (
              <div>
                <h2 className="font-display text-xl font-semibold text-brand-text mb-4 flex items-center gap-2">
                  <BadgeDollarSign className="w-5 h-5 text-brand-primary" /> Financiamiento
                </h2>
                <div className="space-y-3">
                  {project.financingOptions.map((f) => (
                    <div key={f.id} className="flex items-start gap-3 p-4 border border-gray-100 hover:border-brand-primary/30 transition-colors">
                      <CheckCircle className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-brand-text">{f.name}</p>
                        {f.description && <p className="text-sm text-brand-secondary mt-0.5">{f.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-6">
            <div className="bg-brand-surface text-gray-900 p-6 sticky top-24 border border-gray-200">
              <p className="text-gray-500 text-xs mb-1 uppercase tracking-wider">Precio desde</p>
              <p className="font-display text-4xl font-bold text-brand-primary mb-1">
                {project.priceFrom ? formatPrice(project.priceFrom, project.currency || 'UF') : 'Consultar'}
              </p>
              {project.commune && (
                <p className="text-gray-600 text-sm flex items-center gap-1.5 mb-6">
                  <MapPin className="w-3.5 h-3.5" /> {project.commune}
                </p>
              )}
              <div className="space-y-2 mb-6 border-t border-gray-200 pt-5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Entrega</span>
                  <span className="font-medium text-gray-900">{deliveryLabel}</span>
                </div>
                {project.typologies.length > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Tipologías</span>
                    <span className="font-medium text-gray-900">{project.typologies.length} tipos</span>
                  </div>
                )}
              </div>
              <Link href="#formulario-proyecto" className="btn-primary w-full text-center block text-sm py-3.5">
                {project.ctaText || 'Solicitar información'}
              </Link>
            </div>

            <div id="formulario-proyecto" className="bg-brand-surface p-6">
              <ContactForm
                projectId={project.id}
                projectName={project.name}
                title="¿Te interesa este proyecto?"
                subtitle="Déjanos tu consulta y te contactamos hoy."
              />
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <div className="mt-20 pt-10 border-t border-gray-100">
            <h2 className="font-display text-2xl font-bold text-brand-text mb-8">Proyectos relacionados</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {related.map((p) => <ProjectCard key={p.id} project={p as any} />)}
            </div>
          </div>
        )}
      </div>

      {mapUrl && (
        <div className="container-section py-10 border-t border-gray-100">
          <h2 className="font-display text-xl font-semibold text-brand-text mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-brand-primary" /> Ubicación
          </h2>
          <div className="relative w-full h-80 sm:h-96">
            <iframe
              src={mapUrl}
              title={`Ubicación de ${project.name}`}
              className="absolute inset-0 w-full h-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      )}
    </div>
  )
}
