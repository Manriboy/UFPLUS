// src/app/admin/stock-usados/page.tsx
import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Bed, Bath, Car, Archive, Star, ArrowRight } from 'lucide-react'
import prisma from '@/lib/prisma'
import { formatPrice } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Stock usados — UFPlus' }

async function getStock() {
  return prisma.usedProperty.findMany({
    where: { status: 'AVAILABLE', isArchived: false },
    orderBy: [{ isFeatured: 'desc' }, { updatedAt: 'desc' }],
    select: {
      id: true, title: true, commune: true, region: true,
      price: true, currency: true,
      bedrooms: true, bathrooms: true, parkingSpots: true, sqmTotal: true,
      images: true, isFeatured: true, propertyType: true,
    },
  })
}

export default async function StockUsadosPage() {
  const properties = await getStock()

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-brand-text">Stock usados</h1>
        <p className="text-sm text-gray-500 mt-1">
          Departamentos publicados y disponibles en la plataforma
          {properties.length > 0 && ` — ${properties.length} publicaciones`}
        </p>
      </div>

      {properties.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white border border-gray-200 rounded-xl text-center">
          <p className="text-lg font-semibold text-gray-700 mb-1">Sin publicaciones disponibles</p>
          <p className="text-sm text-gray-400">Aún no hay departamentos aprobados en la plataforma.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map(p => {
            const mainImage = p.images[0] ?? null
            const title = p.title || `Departamento en ${p.commune ?? p.region ?? 'Chile'}`

            return (
              <Link key={p.id} href={`/usados/${p.id}`} target="_blank" className="group block">
                <article className="bg-white overflow-hidden shadow-md hover:-translate-y-1 hover:shadow-2xl transition-all duration-300">
                  {/* Image */}
                  <div className="relative h-52 overflow-hidden bg-gray-100">
                    {mainImage ? (
                      <Image
                        src={mainImage}
                        alt={title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <span className="text-gray-400 text-sm">Sin imagen</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

                    {p.propertyType && (
                      <div className="absolute top-3 left-3">
                        <span className="text-xs font-semibold px-2.5 py-1 bg-white/90 text-gray-700">
                          {p.propertyType}
                        </span>
                      </div>
                    )}
                    {p.isFeatured && (
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
                    {(p.commune || p.region) && (
                      <div className="flex items-center gap-1.5 text-brand-secondary text-xs mb-2">
                        <MapPin className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                        <span>{[p.commune, p.region].filter(Boolean).join(', ')}</span>
                      </div>
                    )}

                    <h3 className="font-display text-base font-bold text-brand-text mb-3 leading-snug group-hover:text-brand-primary transition-colors line-clamp-2">
                      {title}
                    </h3>

                    {/* Specs */}
                    <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
                      {p.bedrooms != null && (
                        <span className="flex items-center gap-1">
                          <Bed className="w-3.5 h-3.5" /> {p.bedrooms}
                        </span>
                      )}
                      {p.bathrooms != null && (
                        <span className="flex items-center gap-1">
                          <Bath className="w-3.5 h-3.5" /> {p.bathrooms}
                        </span>
                      )}
                      {p.parkingSpots != null && p.parkingSpots > 0 && (
                        <span className="flex items-center gap-1">
                          <Car className="w-3.5 h-3.5" /> {p.parkingSpots}
                        </span>
                      )}
                      {p.sqmTotal != null && (
                        <span className="flex items-center gap-1">
                          <Archive className="w-3.5 h-3.5" /> {p.sqmTotal} m²
                        </span>
                      )}
                    </div>

                    {/* Price + CTA */}
                    <div className="flex items-end justify-between pt-4 border-t border-gray-100">
                      <div>
                        <p className="text-xs text-brand-secondary mb-0.5">Precio</p>
                        <p className="text-xl font-bold text-brand-primary font-display">
                          {p.price ? formatPrice(p.price, p.currency || 'UF') : 'Consultar'}
                        </p>
                      </div>
                      <span className="flex items-center gap-1.5 text-sm font-medium text-brand-primary group-hover:gap-2.5 transition-all">
                        Ver publicación
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
