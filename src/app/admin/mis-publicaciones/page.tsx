// src/app/admin/mis-publicaciones/page.tsx
import { Metadata } from 'next'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import UsadosTable from '@/components/admin/UsadosTable'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Mis publicaciones — UFPlus' }

interface Props {
  searchParams: { filter?: string }
}

export default function MisPublicacionesPage({ searchParams }: Props) {
  const filter = searchParams.filter || 'all'

  const filterTabs = [
    { key: 'all',      label: 'Todos' },
    { key: 'active',   label: 'Disponibles' },
    { key: 'inactive', label: 'En revisión' },
    { key: 'archived', label: 'Archivados' },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-brand-text">Mis publicaciones</h1>
          <p className="text-sm text-gray-500 mt-1">Departamentos que has publicado en la plataforma</p>
        </div>
        <Link
          href="/admin/proyectos/nuevo"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-primary text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          Publicar departamento
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {filterTabs.map(tab => (
          <Link
            key={tab.key}
            href={tab.key === 'all' ? '/admin/mis-publicaciones' : `/admin/mis-publicaciones?filter=${tab.key}`}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === tab.key
                ? 'bg-white text-brand-text shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <UsadosTable initialFilter={filter} />
    </div>
  )
}
