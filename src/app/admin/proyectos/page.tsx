// src/app/admin/proyectos/page.tsx
import { Metadata } from 'next'
import Link from 'next/link'
import { Plus, Building2, Home } from 'lucide-react'
import ProjectsTable from '@/components/admin/ProjectsTable'
import UsadosTable from '@/components/admin/UsadosTable'
import IndicadoresWidget from '@/components/admin/IndicadoresWidget'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Proyectos — Admin UFPlus' }

interface Props {
  searchParams: { filter?: string; search?: string; categoria?: string }
}

export default async function AdminProjectsPage({ searchParams }: Props) {
  const categoria = searchParams.categoria === 'nuevos' ? 'nuevos' : 'usados'
  const filter = searchParams.filter || 'all'
  const search = searchParams.search || ''

  const filterTabs = [
    { key: 'all',      label: 'Todos' },
    { key: 'active',   label: 'Activos' },
    { key: 'inactive', label: 'Inactivos' },
    { key: 'featured', label: 'Destacados' },
    { key: 'archived', label: 'Archivados' },
  ]

  const baseHref = categoria === 'nuevos' ? '/admin/proyectos?categoria=nuevos' : '/admin/proyectos'
  const filterHref = (key: string) =>
    `${baseHref}${key !== 'all' ? `${baseHref.includes('?') ? '&' : '?'}filter=${key}` : ''}`

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-brand-text">Proyectos</h1>
          <p className="text-sm text-gray-500 mt-1">Gestión completa del portafolio</p>
        </div>
        <div className="flex items-center gap-5">
          <IndicadoresWidget />
          <Link
            href="/admin/proyectos/nuevo"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-primary text-white text-sm font-medium hover:bg-brand-primary-dark transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nuevo proyecto
          </Link>
        </div>
      </div>

      {/* Toggle Nuevos / Usados */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <Link
          href="/admin/proyectos"
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            categoria === 'usados'
              ? 'bg-white text-brand-text shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Home className="h-4 w-4" />
          Usados
        </Link>
        <Link
          href="/admin/proyectos?categoria=nuevos"
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            categoria === 'nuevos'
              ? 'bg-white text-brand-text shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Building2 className="h-4 w-4" />
          Nuevos
        </Link>
      </div>

      {/* Filter Tabs — compartidos entre ambas categorías */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {filterTabs.map(tab => (
            <Link
              key={tab.key}
              href={filterHref(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                filter === tab.key
                  ? 'border-brand-primary text-brand-primary'
                  : 'border-transparent text-gray-500 hover:text-brand-text hover:border-gray-300'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Tabla según categoría */}
      {categoria === 'nuevos'
        ? <ProjectsTable initialFilter={filter} initialSearch={search} />
        : <UsadosTable initialFilter={filter} />
      }
    </div>
  )
}
