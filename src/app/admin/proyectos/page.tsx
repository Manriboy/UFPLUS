// src/app/admin/proyectos/page.tsx
import { Metadata } from 'next'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import ProjectsTable from '@/components/admin/ProjectsTable'

export const metadata: Metadata = { title: 'Proyectos — Admin UFPlus' }

interface Props {
  searchParams: { filter?: string; search?: string }
}

export default function AdminProjectsPage({ searchParams }: Props) {
  const filter = searchParams.filter || 'all'
  const search = searchParams.search || ''

  const filterTabs = [
    { key: 'all', label: 'Todos' },
    { key: 'active', label: 'Activos' },
    { key: 'inactive', label: 'Inactivos' },
    { key: 'featured', label: 'Destacados' },
    { key: 'archived', label: 'Archivados' },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-brand-text">Proyectos</h1>
          <p className="text-sm text-gray-500 mt-1">Gestión completa del portafolio</p>
        </div>
        <Link
          href="/admin/proyectos/nuevo"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-primary text-white text-sm font-medium hover:bg-brand-primary-dark transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuevo proyecto
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {filterTabs.map((tab) => (
            <Link
              key={tab.key}
              href={`/admin/proyectos?filter=${tab.key}${search ? `&search=${search}` : ''}`}
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

      {/* Projects Table (Client Component for interactivity) */}
      <ProjectsTable initialFilter={filter} initialSearch={search} />
    </div>
  )
}
