'use client'
// src/components/admin/ProjectsTable.tsx
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Edit,
  Eye,
  Archive,
  Power,
  Star,
  StarOff,
  Search,
  Loader2,
  ChevronUp,
  ChevronDown,
  ExternalLink,
} from 'lucide-react'
import { toast } from '@/components/ui/Toast'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { formatPrice, DELIVERY_TYPE_LABELS } from '@/lib/utils'

interface Project {
  id: string
  name: string
  slug: string
  commune: string | null
  priceFrom: number | null
  currency: string
  deliveryType: string
  isActive: boolean
  isFeatured: boolean
  isArchived: boolean
  createdAt: string
  _count?: { leads: number }
}

interface Props {
  initialFilter: string
  initialSearch: string
}

export default function ProjectsTable({ initialFilter, initialSearch }: Props) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(initialSearch)
  const [searchInput, setSearchInput] = useState(initialSearch)
  const [filter] = useState(initialFilter)
  const [archiveTarget, setArchiveTarget] = useState<Project | null>(null)
  const [archiving, setArchiving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ filter })
      if (search) params.set('search', search)
      const res = await fetch(`/api/admin/projects?${params}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setProjects(data)
    } catch {
      toast('Error al cargar proyectos', 'error')
    } finally {
      setLoading(false)
    }
  }, [filter, search])

  useEffect(() => { fetchProjects() }, [fetchProjects])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
  }

  const handleToggle = async (project: Project, field: 'isActive' | 'isFeatured') => {
    setTogglingId(`${project.id}-${field}`)
    try {
      const res = await fetch(`/api/admin/projects/${project.id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field }),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setProjects((prev) => prev.map((p) => (p.id === project.id ? { ...p, ...updated } : p)))
      const action = field === 'isActive'
        ? (updated.isActive ? 'activado' : 'desactivado')
        : (updated.isFeatured ? 'destacado' : 'quitado de destacados')
      toast(`Proyecto ${action} correctamente`, 'success')
    } catch {
      toast('Error al actualizar proyecto', 'error')
    } finally {
      setTogglingId(null)
    }
  }

  const handleArchive = async () => {
    if (!archiveTarget) return
    setArchiving(true)
    try {
      const res = await fetch(`/api/admin/projects/${archiveTarget.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setProjects((prev) => prev.filter((p) => p.id !== archiveTarget.id))
      toast('Proyecto archivado correctamente', 'success')
      setArchiveTarget(null)
    } catch {
      toast('Error al archivar proyecto', 'error')
    } finally {
      setArchiving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por nombre o comuna..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-brand-secondary text-white text-sm font-medium hover:bg-brand-secondary-light transition-colors"
        >
          Buscar
        </button>
      </form>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-sm">No se encontraron proyectos</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Proyecto
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">
                    Comuna
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">
                    Precio desde
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">
                    Entrega
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Estado
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">
                    Destacado
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden xl:table-cell">
                    Creado
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {projects.map((project) => {
                  const isTogglingActive = togglingId === `${project.id}-isActive`
                  const isTogglingFeatured = togglingId === `${project.id}-isFeatured`

                  return (
                    <tr key={project.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-4 py-3">
                        <div>
                          <Link
                            href={`/admin/proyectos/${project.id}`}
                            className="font-medium text-brand-text hover:text-brand-primary transition-colors"
                          >
                            {project.name}
                          </Link>
                          {project._count && project._count.leads > 0 && (
                            <span className="ml-2 text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">
                              {project._count.leads} leads
                            </span>
                          )}
                          {project.isArchived && (
                            <span className="ml-2 text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">
                              Archivado
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                        {project.commune || '—'}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {project.priceFrom
                          ? <span className="font-medium text-brand-primary">{formatPrice(project.priceFrom, project.currency)}</span>
                          : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">
                        <span className="text-xs">
                          {DELIVERY_TYPE_LABELS[project.deliveryType] || project.deliveryType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => !project.isArchived && handleToggle(project, 'isActive')}
                          disabled={isTogglingActive || project.isArchived}
                          title={project.isActive ? 'Desactivar' : 'Activar'}
                          className="inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isTogglingActive ? (
                            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full transition-colors ${
                                project.isActive
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${project.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                              {project.isActive ? 'Activo' : 'Inactivo'}
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center hidden md:table-cell">
                        <button
                          onClick={() => !project.isArchived && handleToggle(project, 'isFeatured')}
                          disabled={isTogglingFeatured || project.isArchived}
                          title={project.isFeatured ? 'Quitar destacado' : 'Destacar'}
                          className="disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isTogglingFeatured ? (
                            <Loader2 className="h-4 w-4 animate-spin text-gray-400 mx-auto" />
                          ) : project.isFeatured ? (
                            <Star className="h-4 w-4 text-amber-500 fill-amber-500 mx-auto hover:opacity-70 transition-opacity" />
                          ) : (
                            <Star className="h-4 w-4 text-gray-300 mx-auto hover:text-amber-400 transition-colors" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs hidden xl:table-cell">
                        {new Date(project.createdAt).toLocaleDateString('es-CL')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/admin/proyectos/${project.id}`}
                            title="Editar"
                            className="p-1.5 text-gray-400 hover:text-brand-primary hover:bg-red-50 rounded transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          <Link
                            href={`/proyectos/${project.slug}`}
                            target="_blank"
                            title="Ver en sitio público"
                            className="p-1.5 text-gray-400 hover:text-brand-secondary hover:bg-gray-100 rounded transition-colors"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                          {!project.isArchived && (
                            <button
                              onClick={() => setArchiveTarget(project)}
                              title="Archivar"
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            >
                              <Archive className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Archive Confirm */}
      <ConfirmDialog
        isOpen={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleArchive}
        loading={archiving}
        title="Archivar proyecto"
        description={`¿Estás seguro de archivar "${archiveTarget?.name}"? El proyecto se desactivará y no será visible en el sitio. Puedes restaurarlo más adelante.`}
        confirmLabel="Archivar proyecto"
        cancelLabel="Cancelar"
      />
    </div>
  )
}
