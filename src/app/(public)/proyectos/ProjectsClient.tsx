'use client'
// src/app/(public)/proyectos/ProjectsClient.tsx
import { useState, useMemo } from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import ProjectCard from '@/components/public/ProjectCard'
import { DELIVERY_TYPE_LABELS } from '@/lib/utils'
import type { ProjectCard as ProjectCardType } from '@/types'

interface ProjectsClientProps {
  initialProjects: ProjectCardType[]
  communes: string[]
  searchParams?: { [key: string]: string | undefined }
}

const deliveryTypes = ['IMMEDIATE', 'SOON', 'FUTURE', 'IN_CONSTRUCTION']

export default function ProjectsClient({
  initialProjects,
  communes,
  searchParams,
}: ProjectsClientProps) {
  const [search, setSearch] = useState(searchParams?.search || '')
  const [commune, setCommune] = useState(searchParams?.commune || '')
  const [deliveryType, setDeliveryType] = useState(searchParams?.deliveryType || '')
  const [priceMin, setPriceMin] = useState(searchParams?.priceMin || '')
  const [priceMax, setPriceMax] = useState(searchParams?.priceMax || '')
  const [showFilters, setShowFilters] = useState(false)

  const filtered = useMemo(() => {
    return initialProjects.filter((p) => {
      const searchLower = search.toLowerCase()
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(searchLower) ||
        (p.commune || '').toLowerCase().includes(searchLower) ||
        (p.city || '').toLowerCase().includes(searchLower)

      const matchCommune = !commune || p.commune === commune
      const matchDelivery = !deliveryType || p.deliveryType === deliveryType
      const matchPriceMin =
        !priceMin || (p.priceFrom !== null && p.priceFrom >= parseFloat(priceMin))
      const matchPriceMax =
        !priceMax || (p.priceFrom !== null && p.priceFrom <= parseFloat(priceMax))

      return matchSearch && matchCommune && matchDelivery && matchPriceMin && matchPriceMax
    })
  }, [initialProjects, search, commune, deliveryType, priceMin, priceMax])

  const hasFilters = search || commune || deliveryType || priceMin || priceMax

  const clearFilters = () => {
    setSearch('')
    setCommune('')
    setDeliveryType('')
    setPriceMin('')
    setPriceMax('')
  }

  return (
    <div className="min-h-screen bg-brand-surface pt-20">
      {/* Page header */}
      <div className="bg-[#1A1A1A] py-16">
        <div className="container-section">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-px bg-brand-primary" />
            <span className="text-brand-primary text-sm font-medium tracking-widest uppercase">
              Portafolio
            </span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-white mb-3">
            Proyectos de inversión
          </h1>
          <p className="text-gray-400 text-lg max-w-xl">
            Departamentos seleccionados por expertos en las mejores ubicaciones de Chile.
          </p>
        </div>
      </div>

      <div className="container-section py-10">
        {/* Search + Filter bar */}
        <div className="bg-white p-4 shadow-sm mb-8">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, comuna o dirección..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter toggle (mobile) */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="sm:hidden flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-sm font-medium text-brand-secondary hover:border-brand-primary hover:text-brand-primary transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filtros {hasFilters ? '·' : ''}
            </button>

            {/* Desktop filters inline */}
            <div className="hidden sm:flex gap-3">
              <select
                value={commune}
                onChange={(e) => setCommune(e.target.value)}
                className="px-3 py-2.5 border border-gray-200 text-sm text-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-primary min-w-[160px]"
              >
                <option value="">Todas las comunas</option>
                {communes.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <select
                value={deliveryType}
                onChange={(e) => setDeliveryType(e.target.value)}
                className="px-3 py-2.5 border border-gray-200 text-sm text-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-primary min-w-[180px]"
              >
                <option value="">Tipo de entrega</option>
                {deliveryTypes.map((dt) => (
                  <option key={dt} value={dt}>{DELIVERY_TYPE_LABELS[dt]}</option>
                ))}
              </select>

              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-brand-primary hover:text-brand-primary-dark font-medium"
                >
                  <X className="w-4 h-4" /> Limpiar
                </button>
              )}
            </div>
          </div>

          {/* Mobile filters expanded */}
          {showFilters && (
            <div className="sm:hidden mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-3">
              <select
                value={commune}
                onChange={(e) => setCommune(e.target.value)}
                className="px-3 py-2.5 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                <option value="">Todas las comunas</option>
                {communes.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                value={deliveryType}
                onChange={(e) => setDeliveryType(e.target.value)}
                className="px-3 py-2.5 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                <option value="">Tipo de entrega</option>
                {deliveryTypes.map((dt) => (
                  <option key={dt} value={dt}>{DELIVERY_TYPE_LABELS[dt]}</option>
                ))}
              </select>
              <input
                type="number"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                placeholder="Precio mínimo (UF)"
                className="px-3 py-2.5 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
              <input
                type="number"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                placeholder="Precio máximo (UF)"
                className="px-3 py-2.5 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="col-span-2 flex items-center justify-center gap-1.5 py-2 text-sm text-brand-primary font-medium border border-brand-primary"
                >
                  <X className="w-4 h-4" /> Limpiar filtros
                </button>
              )}
            </div>
          )}
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-brand-secondary text-sm">
            <span className="font-semibold text-brand-text">{filtered.length}</span>{' '}
            {filtered.length === 1 ? 'proyecto encontrado' : 'proyectos encontrados'}
          </p>
          {hasFilters && (
            <div className="flex flex-wrap gap-2">
              {commune && (
                <span className="flex items-center gap-1 bg-red-50 text-brand-primary text-xs px-2.5 py-1 font-medium">
                  {commune}
                  <button onClick={() => setCommune('')}><X className="w-3 h-3" /></button>
                </span>
              )}
              {deliveryType && (
                <span className="flex items-center gap-1 bg-red-50 text-brand-primary text-xs px-2.5 py-1 font-medium">
                  {DELIVERY_TYPE_LABELS[deliveryType]}
                  <button onClick={() => setDeliveryType('')}><X className="w-3 h-3" /></button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Projects grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 bg-white">
            <div className="w-16 h-16 bg-brand-surface mx-auto flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="font-display text-xl font-semibold text-brand-text mb-2">
              No encontramos proyectos
            </h3>
            <p className="text-brand-secondary text-sm mb-6">
              Intenta con otros filtros o términos de búsqueda.
            </p>
            <button onClick={clearFilters} className="btn-outline text-sm">
              Ver todos los proyectos
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
