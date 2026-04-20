'use client'
// src/components/admin/IrisSearch.tsx

import { useState, useCallback } from 'react'
import {
  Search, RefreshCw, MapPin, Calendar, ChevronDown, ChevronUp,
  Home, AlertCircle, FileText, Percent,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────

interface IrisUnit {
  id: number
  description: string
  tipology: string
  bedrooms: number
  bathrooms: number
  m2: number
  m2_outdoor: number
  price: number
  final_price: number
  currency: string
  floor: string
  orientation: string | null
  has_balcony: boolean
  garages: number
  bonus_pie: number | null
  plan: string
}

interface IrisProject {
  id: number
  title: string
  address: string
  handover_date_text: string
  pie_bonus: boolean
  pie_bonus_conditions: string | null
  deposit: string | null
  commercial_conditions_description: string | null
  images: string[]
  brochure: string | null
  zone: string | null
  department: string | null
  status: string | null
  commission: { percent: number; full_value: string } | null
  units: IrisUnit[]
}

// ─── Helpers ──────────────────────────────────────────

function priceRange(units: IrisUnit[]) {
  const prices = units.map((u) => u.final_price || u.price).filter((p) => p > 0)
  if (!prices.length) return null
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  return min === max
    ? `${min.toLocaleString('es-CL')} UF`
    : `${min.toLocaleString('es-CL')} – ${max.toLocaleString('es-CL')} UF`
}

function bedroomTypes(units: IrisUnit[]) {
  return Array.from(new Set(units.map((u) => u.bedrooms))).sort((a, b) => a - b)
}

const STATUS_OPTIONS = [
  { label: 'Todos', value: [1, 2, 3] },
  { label: 'Entrega inmediata', value: [1] },
  { label: 'En construcción', value: [2] },
  { label: 'En planos', value: [3] },
]

// ─── Project Card ─────────────────────────────────────

function ProjectCard({ project }: { project: IrisProject }) {
  const [expanded, setExpanded] = useState(false)
  const range = priceRange(project.units)
  const bedTypes = bedroomTypes(project.units)

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">

      {/* Imagen */}
      <div className="relative h-44 bg-gray-100 flex-shrink-0">
        {project.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={project.images[0]} alt={project.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Home className="h-10 w-10 text-gray-300" />
          </div>
        )}
        <div className="absolute top-2 left-2 flex gap-1.5 flex-wrap">
          {project.pie_bonus && (
            <span className="bg-brand-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
              Bono Pie {project.pie_bonus_conditions}%
            </span>
          )}
          {project.status && (
            <span className="bg-white/90 backdrop-blur-sm text-gray-700 text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-sm">
              {project.status}
            </span>
          )}
        </div>
      </div>

      {/* Contenido */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-1">{project.title}</h3>

        <div className="flex items-start gap-1 text-xs text-gray-500 mb-1.5">
          <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <span>{project.address}{project.zone ? ` · ${project.zone}` : ''}</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
          <Calendar className="h-3 w-3 flex-shrink-0" />
          <span>{project.handover_date_text}</span>
        </div>

        {/* Tipologías */}
        <div className="flex gap-1.5 flex-wrap mb-3">
          {bedTypes.map((b) => (
            <span key={b} className="text-[10px] font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {b === 0 ? 'Estudio' : `${b} dorm.`}
            </span>
          ))}
        </div>

        {/* Precio */}
        {range && (
          <div className="text-sm font-bold text-brand-primary mb-3">{range}</div>
        )}

        {/* Comisión (solo admin) */}
        {project.commission && (
          <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-1.5 rounded-lg mb-3">
            <Percent className="h-3 w-3 flex-shrink-0" />
            <span className="font-medium">Comisión: {project.commission.full_value}</span>
          </div>
        )}

        {/* Links */}
        <div className="flex gap-3 mb-3">
          {project.brochure && (
            <a
              href={project.brochure}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-brand-primary hover:underline"
            >
              <FileText className="h-3 w-3" />
              Brochure
            </a>
          )}
        </div>

        {/* Expandir unidades */}
        {project.units.length > 0 && (
          <>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1.5 text-xs text-brand-primary hover:text-brand-primary/80 font-medium mt-auto"
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {expanded ? 'Ocultar unidades' : `Ver ${project.units.length} unidades`}
            </button>

            {expanded && (
              <div className="mt-3 border border-gray-100 rounded-lg overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 border-b border-gray-100">
                      <th className="px-3 py-2 text-left font-medium">Tipo</th>
                      <th className="px-3 py-2 text-left font-medium">D/B</th>
                      <th className="px-3 py-2 text-right font-medium">m²</th>
                      <th className="px-3 py-2 text-right font-medium">Precio UF</th>
                      <th className="px-3 py-2 text-left font-medium">Piso</th>
                      <th className="px-3 py-2 text-left font-medium">Orient.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {project.units.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-3 py-1.5 text-gray-700 font-medium">{u.description || u.tipology}</td>
                        <td className="px-3 py-1.5 text-gray-600">{u.bedrooms}D / {u.bathrooms}B</td>
                        <td className="px-3 py-1.5 text-right text-gray-600">{u.m2.toFixed(1)}</td>
                        <td className="px-3 py-1.5 text-right font-semibold text-brand-primary">
                          {(u.final_price || u.price).toLocaleString('es-CL')}
                        </td>
                        <td className="px-3 py-1.5 text-gray-500">{u.floor || '—'}</td>
                        <td className="px-3 py-1.5 text-gray-500">{u.orientation || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────

export default function IrisSearch() {
  const [projects, setProjects] = useState<IrisProject[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')

  // Filtros
  const [statusFilter, setStatusFilter] = useState([1, 2, 3])
  const [bonoPieFilter, setBonoPieFilter] = useState(false)

  const totalPages = Math.ceil(total / 12)

  const search = useCallback(async (p: number = 1) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/iris/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page: p,
          filter: {
            project_status: statusFilter,
            pie_bonus: bonoPieFilter || undefined,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Error al consultar Iris')
        return
      }
      setProjects(data.projects ?? [])
      setTotal(data.total ?? 0)
      setPage(p)
      setSearched(true)
    } catch {
      setError('Error de red al conectar con Iris')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, bonoPieFilter])

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Consulta Iris</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Stock disponible en iris.yapo.cl · {total > 0 && `${total} proyectos`}
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-4 flex-wrap">

          {/* Estado */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-600 whitespace-nowrap">Estado:</span>
            <div className="flex gap-1 flex-wrap">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => setStatusFilter(opt.value)}
                  className={cn(
                    'text-xs px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap',
                    JSON.stringify(statusFilter) === JSON.stringify(opt.value)
                      ? 'bg-brand-primary text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bono Pie */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={bonoPieFilter}
              onChange={(e) => setBonoPieFilter(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-brand-primary"
            />
            <span className="text-xs font-medium text-gray-600 whitespace-nowrap">Solo con Bono Pie</span>
          </label>

          {/* Botón */}
          <button
            onClick={() => search(1)}
            disabled={loading}
            className={cn(
              'ml-auto btn-primary flex items-center gap-2 text-sm',
              loading && 'opacity-70 cursor-not-allowed'
            )}
          >
            {loading
              ? <RefreshCw className="h-4 w-4 animate-spin" />
              : <Search className="h-4 w-4" />}
            {loading ? 'Consultando…' : 'Consultar'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Resultados */}
      {searched && !error && (
        <>
          {/* Paginación superior */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {projects.length === 0
                ? 'Sin resultados con los filtros aplicados'
                : `Página ${page} de ${totalPages} · ${total} proyectos en total`}
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => search(page - 1)}
                  disabled={page <= 1 || loading}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Anterior
                </button>
                <span className="text-xs text-gray-400">{page} / {totalPages}</span>
                <button
                  onClick={() => search(page + 1)}
                  disabled={page >= totalPages || loading}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Siguiente →
                </button>
              </div>
            )}
          </div>

          {/* Grid */}
          {projects.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Estado vacío inicial */}
      {!searched && !loading && (
        <div className="py-24 text-center">
          <Search className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Selecciona filtros y presiona Consultar</p>
        </div>
      )}
    </div>
  )
}
