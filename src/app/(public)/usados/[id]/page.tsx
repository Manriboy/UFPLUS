// src/app/(public)/usados/[id]/page.tsx
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import ContactForm from '@/components/public/ContactForm'
import ProjectCarousel from '@/components/public/ProjectCarousel'
import NearbyServices, { type NearbyServicesData } from '@/components/public/NearbyServices'
import { MapPin, ChevronRight, Bed, Bath, Car, Archive, Play, CheckCircle } from 'lucide-react'
import { getEmbedUrl } from '@/lib/utils'
import { getIndicadores } from '@/lib/indicadores'
import { fetchNearbyServices } from '@/lib/nearby-services'

interface Props {
  params: { id: string }
}

const PREVIEW_ROLES = ['ADMIN', 'SUPERADMIN', 'EDITOR', 'BROKER', 'PROPIETARIO']

async function canPreview() {
  const session = await getServerSession(authOptions)
  return PREVIEW_ROLES.includes((session?.user?.role as string) ?? '')
}

async function getProperty(id: string, allowPending = false) {
  return prisma.usedProperty.findFirst({
    where: {
      id,
      isArchived: false,
      ...(allowPending ? {} : { status: 'AVAILABLE' }),
    },
  })
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const preview = await canPreview()
  const property = await getProperty(params.id, preview)
  if (!property) return { title: 'Publicación no encontrada' }
  const title = property.title || `Departamento en ${property.commune ?? property.region ?? 'Chile'}`
  return {
    title: `${title} | UFPlus`,
    description: property.description?.slice(0, 160) || undefined,
    openGraph: {
      title,
      description: property.description?.slice(0, 160) || undefined,
      images: property.images[0] ? [property.images[0]] : [],
    },
  }
}

export const revalidate = false
export const dynamicParams = true

// ─── Nearby Services ──────────────────────────────────
// Los servicios se cachean en nearbyServicesJson al publicar la propiedad.
// Si el campo está vacío (propiedades antiguas), no se muestra la sección.

export default async function UsadoDetailPage({ params }: Props) {
  const [preview, indicadores] = await Promise.all([canPreview(), getIndicadores()])
  const property = await getProperty(params.id, preview)
  if (!property) notFound()

  // Prioridad: caché en DB → búsqueda en vivo (para validar resultados durante discovery)
  const nearbyServices: NearbyServicesData | null =
    (property.nearbyServicesJson as NearbyServicesData | null) ??
    (property.lat && property.lng ? await fetchNearbyServices(property.lat, property.lng) : null)

  const title = property.title || `Departamento en ${property.commune ?? property.region ?? 'Chile'}`
  const carouselImages = property.images.map(url => ({ url, alt: title }))
  const embedUrl = property.videoUrl ? getEmbedUrl(property.videoUrl) : null

  // Precios en UF y CLP
  const ufRate  = indicadores?.uf.valor ?? null
  const usdRate = indicadores?.dolar.valor ?? null

  function toPrices(price: number | null, currency: string | null) {
    if (!price) return { uf: null, clp: null }
    const curr = currency ?? 'UF'
    if (curr === 'UF')   return { uf: price, clp: ufRate  ? Math.round(price * ufRate)  : null }
    if (curr === 'CLP$') return { uf: ufRate ? price / ufRate : null, clp: Math.round(price) }
    if (curr === 'USD$') {
      const clp = usdRate ? Math.round(price * usdRate) : null
      return { uf: clp && ufRate ? clp / ufRate : null, clp }
    }
    return { uf: price, clp: null }
  }

  const { uf: ufPrice, clp: clpPrice } = toPrices(property.price, property.currency)

  const mapUrl =
    property.lat && property.lng
      ? `https://www.google.com/maps?q=${property.lat},${property.lng}&output=embed`
      : null

  const specs = [
    { label: 'Dormitorios',      value: property.bedrooms,    icon: <Bed  className="w-4 h-4 text-brand-primary" /> },
    { label: 'Baños',            value: property.bathrooms,   icon: <Bath className="w-4 h-4 text-brand-primary" /> },
    { label: 'Estacionamientos', value: property.parkingSpots,icon: <Car  className="w-4 h-4 text-brand-primary" /> },
    { label: 'Bodegas',          value: property.storageRooms,icon: <Archive className="w-4 h-4 text-brand-primary" /> },
  ].filter(s => s.value != null && s.value > 0)

  const amenityGroups = [
    { label: 'Comodidades',          items: property.amenities    },
    { label: 'Seguridad',            items: property.security     },
    { label: 'Servicios',            items: property.services     },
    { label: 'Espacios interiores',  items: property.spaces       },
    { label: 'Especiales',           items: property.special      },
    { label: 'Espacios comunes',     items: property.commonSpaces },
  ].filter(g => g.items.length > 0)

  return (
    <div className="min-h-screen bg-white pt-20">
      {/* Breadcrumb */}
      <div className="bg-brand-surface border-b border-gray-200">
        <div className="container-section py-3">
          <nav className="flex items-center gap-2 text-sm text-brand-secondary">
            <Link href="/" className="hover:text-brand-primary transition-colors">Inicio</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href="/proyectos" className="hover:text-brand-primary transition-colors">Publicaciones</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-brand-text font-medium truncate max-w-[200px]">{title}</span>
          </nav>
        </div>
      </div>

      <div className="container-section py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-10">

            {/* Header */}
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-3">
                {property.propertyType && (
                  <span className="badge bg-brand-surface text-brand-text border border-gray-200 text-xs font-semibold px-2.5 py-1">
                    {property.propertyType}
                  </span>
                )}
                {property.isFeatured && (
                  <span className="badge bg-brand-primary text-white text-xs font-semibold px-2.5 py-1">
                    Destacado
                  </span>
                )}
                {property.antiquity != null && (
                  <span className="badge bg-brand-surface text-brand-secondary border border-gray-200 text-xs px-2.5 py-1">
                    {property.antiquity === 0 ? 'Nuevo' : `${property.antiquity} años de antigüedad`}
                  </span>
                )}
              </div>

              <h1 className="font-display text-4xl sm:text-5xl font-bold text-brand-text mb-3 leading-tight">
                {title}
              </h1>

              {(property.address || property.commune || property.region) && (
                <div className="flex items-center gap-2 text-brand-secondary">
                  <MapPin className="w-4 h-4 text-brand-primary shrink-0" />
                  <span>
                    {[property.address, property.commune, property.region]
                      .filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
            </div>

            {/* Carousel */}
            {carouselImages.length > 0 && (
              <ProjectCarousel images={carouselImages} projectName={title} />
            )}

            {/* Video */}
            {embedUrl && (
              <div>
                <h2 className="font-display text-xl font-semibold text-brand-text mb-4 flex items-center gap-2">
                  <Play className="w-5 h-5 text-brand-primary" /> Video
                </h2>
                <div className="relative aspect-video bg-black">
                  <iframe src={embedUrl} title={`Video ${title}`}
                    className="absolute inset-0 w-full h-full" allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                </div>
              </div>
            )}

            {/* Description */}
            {property.description && (
              <div>
                <h2 className="font-display text-xl font-semibold text-brand-text mb-4">Descripción</h2>
                <p className="text-brand-secondary leading-relaxed whitespace-pre-line">
                  {property.description}
                </p>
              </div>
            )}

            {/* Specs table */}
            <div>
              <h2 className="font-display text-xl font-semibold text-brand-text mb-4">Características</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {specs.map(s => (
                  <div key={s.label} className="flex flex-col items-center gap-1.5 p-4 bg-brand-surface border border-gray-100 text-center">
                    {s.icon}
                    <span className="text-2xl font-bold text-brand-text">{s.value}</span>
                    <span className="text-xs text-brand-secondary">{s.label}</span>
                  </div>
                ))}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-100">
                    {property.sqmTotal != null && (
                      <tr className="hover:bg-brand-surface transition-colors">
                        <td className="px-4 py-3 text-brand-secondary">Superficie total</td>
                        <td className="px-4 py-3 font-medium text-brand-text text-right">{property.sqmTotal} m²</td>
                      </tr>
                    )}
                    {property.sqmUsable != null && (
                      <tr className="hover:bg-brand-surface transition-colors">
                        <td className="px-4 py-3 text-brand-secondary">Superficie útil</td>
                        <td className="px-4 py-3 font-medium text-brand-text text-right">{property.sqmUsable} m²</td>
                      </tr>
                    )}
                    {property.sqmTerrace != null && property.sqmTerrace > 0 && (
                      <tr className="hover:bg-brand-surface transition-colors">
                        <td className="px-4 py-3 text-brand-secondary">Terraza</td>
                        <td className="px-4 py-3 font-medium text-brand-text text-right">{property.sqmTerrace} m²</td>
                      </tr>
                    )}
                    {property.floorNumber != null && (
                      <tr className="hover:bg-brand-surface transition-colors">
                        <td className="px-4 py-3 text-brand-secondary">Piso</td>
                        <td className="px-4 py-3 font-medium text-brand-text text-right">{property.floorNumber}</td>
                      </tr>
                    )}
                    {property.orientations.length > 0 && (
                      <tr className="hover:bg-brand-surface transition-colors">
                        <td className="px-4 py-3 text-brand-secondary">Orientación</td>
                        <td className="px-4 py-3 font-medium text-brand-text text-right">{property.orientations.join(', ')}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Amenities */}
            {amenityGroups.length > 0 && (
              <div>
                <h2 className="font-display text-xl font-semibold text-brand-text mb-6 flex items-center gap-2">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-brand-primary shrink-0">
                    <path d="M5 11a7 7 0 0 1 14 0" />
                    <line x1="4" y1="11" x2="20" y2="11" />
                    <line x1="8" y1="8" x2="8" y2="11" />
                    <line x1="12" y1="7" x2="12" y2="11" />
                    <line x1="16" y1="8" x2="16" y2="11" />
                    <line x1="9" y1="11" x2="7" y2="19" />
                    <line x1="15" y1="11" x2="17" y2="19" />
                    <line x1="7" y1="16" x2="17" y2="16" />
                  </svg>
                  Características adicionales
                </h2>
                <div className="space-y-6">
                  {amenityGroups.map(group => (
                    <div key={group.label}>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{group.label}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {group.items.map(a => (
                          <div key={a} className="flex items-center gap-2.5 p-3 bg-brand-surface">
                            <CheckCircle className="w-4 h-4 text-brand-primary shrink-0" />
                            <span className="text-sm text-brand-secondary">{a}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-6">
            <div className="bg-brand-surface text-gray-900 p-6 border border-gray-200">
              <p className="text-gray-500 text-xs mb-1 uppercase tracking-wider">Precio</p>
              <p className="font-display text-4xl font-bold text-brand-primary mb-1">
                {ufPrice != null
                  ? `${Math.ceil(ufPrice).toLocaleString('es-CL')} UF`
                  : 'Consultar'}
              </p>
              {clpPrice != null && (
                <p className="text-sm font-semibold text-gray-700 mb-1">
                  $ {clpPrice.toLocaleString('es-CL')}
                </p>
              )}
              {property.commonExpenses != null && (
                <p className="text-xs text-gray-400 mb-1">
                  Gastos comunes: ${property.commonExpenses.toLocaleString('es-CL')} / mes
                </p>
              )}
              {property.commune && (
                <p className="text-gray-600 text-sm flex items-center gap-1.5 mb-6">
                  <MapPin className="w-3.5 h-3.5" /> {property.commune}
                </p>
              )}

              {specs.length > 0 && (
                <div className="space-y-2 mb-6 border-t border-gray-200 pt-5">
                  {specs.map(s => (
                    <div key={s.label} className="flex justify-between text-sm">
                      <span className="text-gray-500">{s.label}</span>
                      <span className="font-medium text-gray-900">{s.value}</span>
                    </div>
                  ))}
                  {property.sqmTotal != null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Superficie</span>
                      <span className="font-medium text-gray-900">{property.sqmTotal} m²</span>
                    </div>
                  )}
                </div>
              )}

              <Link href="#formulario-proyecto" className="btn-primary w-full text-center block text-sm py-3.5">
                Solicitar información
              </Link>
            </div>

            <div id="formulario-proyecto" className="bg-brand-surface p-6">
              <ContactForm
                projectId={property.id}
                projectName={title}
                title="¿Te interesa este departamento?"
                subtitle="Déjanos tu consulta y te contactamos hoy."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Map */}
      {mapUrl && (
        <div className="container-section py-10 border-t border-gray-100">
          <h2 className="font-display text-xl font-semibold text-brand-text mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-brand-primary" /> Ubicación
          </h2>
          <div className="relative w-full h-80 sm:h-96">
            <iframe
              src={mapUrl}
              title={`Ubicación de ${title}`}
              className="absolute inset-0 w-full h-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      )}

      {/* Servicios básicos */}
      {nearbyServices && <NearbyServices data={nearbyServices} />}
    </div>
  )
}
