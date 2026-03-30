// src/components/public/ProjectCard.tsx
import Link from 'next/link'
import Image from 'next/image'
import { MapPin, ArrowRight, Star } from 'lucide-react'
import { formatPrice, DELIVERY_TYPE_LABELS, DELIVERY_TYPE_COLORS, cn } from '@/lib/utils'
import type { ProjectCard as ProjectCardType } from '@/types'

interface ProjectCardProps {
  project: ProjectCardType
  featured?: boolean
}

export default function ProjectCard({ project, featured = false }: ProjectCardProps) {
  const mainImage = project.images?.[0]
  const deliveryLabel = DELIVERY_TYPE_LABELS[project.deliveryType] || project.deliveryType
  const deliveryColor = DELIVERY_TYPE_COLORS[project.deliveryType] || 'bg-gray-100 text-gray-600'

  return (
    <Link href={`/proyectos/${project.slug}`} className="group block">
      <article
        className={cn(
          'bg-white overflow-hidden transition-all duration-300',
          'hover:-translate-y-1 hover:shadow-2xl shadow-md',
          featured && 'border-t-2 border-brand-primary'
        )}
      >
        {/* Image */}
        <div className="relative h-56 overflow-hidden bg-gray-100">
          {mainImage?.url ? (
            <Image
              src={mainImage.url}
              alt={mainImage.alt || project.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <span className="text-gray-400 text-sm">Sin imagen</span>
            </div>
          )}

          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-2">
            <span className={cn('badge text-xs font-semibold px-2.5 py-1', deliveryColor)}>
              {deliveryLabel}
            </span>
          </div>

          {project.isFeatured && (
            <div className="absolute top-3 right-3">
              <span className="flex items-center gap-1 bg-brand-primary text-white text-xs font-semibold px-2.5 py-1">
                <Star className="w-3 h-3 fill-current" />
                Destacado
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Location */}
          <div className="flex items-center gap-1.5 text-brand-secondary text-xs mb-2">
            <MapPin className="w-3.5 h-3.5 text-brand-primary shrink-0" />
            <span>{project.commune}{project.city ? `, ${project.city}` : ''}</span>
          </div>

          {/* Name */}
          <h3 className="font-display text-lg font-bold text-brand-text mb-2 leading-snug group-hover:text-brand-primary transition-colors">
            {project.name}
          </h3>

          {/* Description */}
          {project.shortDescription && (
            <p className="text-sm text-brand-secondary line-clamp-2 mb-4 leading-relaxed">
              {project.shortDescription}
            </p>
          )}

          {/* Typologies */}
          {project.typologies && project.typologies.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {project.typologies.slice(0, 4).map((t, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-0.5 bg-brand-surface text-brand-secondary font-medium"
                >
                  {t.name}
                </span>
              ))}
              {project.typologies.length > 4 && (
                <span className="text-xs px-2 py-0.5 bg-brand-surface text-brand-secondary">
                  +{project.typologies.length - 4}
                </span>
              )}
            </div>
          )}

          {/* Price + CTA */}
          <div className="flex items-end justify-between pt-4 border-t border-gray-100">
            <div>
              <p className="text-xs text-brand-secondary mb-0.5">Desde</p>
              <p className="text-xl font-bold text-brand-primary font-display">
                {project.priceFrom ? formatPrice(project.priceFrom, project.currency || 'UF') : 'Consultar'}
              </p>
            </div>
            <span className="flex items-center gap-1.5 text-sm font-medium text-brand-primary group-hover:gap-2.5 transition-all">
              Ver proyecto
              <ArrowRight className="w-4 h-4" />
            </span>
          </div>
        </div>
      </article>
    </Link>
  )
}
