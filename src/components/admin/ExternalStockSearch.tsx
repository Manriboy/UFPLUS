'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Search, RefreshCw, MapPin, Home, AlertCircle, ChevronDown,
  Database, CheckCircle2, X, Building2, Calendar,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Tipos ────────────────────────────────────────────

type ExternalProject = {
  id: string
  source: string
  sourceId: string
  name: string
  commune: string | null
  region: string | null
  deliveryPeriod: string | null
  deliveryYear: number | null
  stage: string | null
  developerName: string | null
  organizationName: string | null
  priceFrom: number | null
  imageUrl: string | null
  typologies: string[]
  syncedAt: string
  lastSeenAt: string
}

type FilterOptions = {
  communes: string[]
  stages: string[]
}

type SearchFilter = {
  q?: string
  commune?: string[]
  stage?: string[]
  source?: string[]
  priceMin?: number
  priceMax?: number
}

type JBUnit = {
  id: string
  number: string
  typology: string
  rooms: number
  bathrooms: number
  surfaceInterior: number
  surfaceTerrace: number
  surfaceTotal: number
  facing: string | null
  price: number
  finalPrice: number
  discountRate: number
  bonoPie: number
  available: boolean
  hasParking: boolean
  hasStorage: boolean
}

// ─── Helpers ──────────────────────────────────────────

const SOURCE_LABELS: Record<string, string> = {
  jetbrokers: 'JetBrokers',
  brouk: 'Brouk',
  iris: 'Iris',
}

const SOURCE_COLORS: Record<string, string> = {
  jetbrokers: 'bg-blue-600 text-white',
  brouk: 'bg-purple-600 text-white',
  iris: 'bg-emerald-600 text-white',
}

const STAGE_LABELS: Record<string, string> = {
  green: 'En construcción',
  deliveryReady: 'Entrega inmediata',
  white: 'Preventa',
}

const STAGE_COLORS: Record<string, string> = {
  green: 'bg-amber-100 text-amber-800',
  deliveryReady: 'bg-emerald-100 text-emerald-800',
  white: 'bg-blue-100 text-blue-800',
}

const FACING_LABELS: Record<string, string> = {
  west: 'Poniente',
  east: 'Oriente',
  north: 'Norte',
  south: 'Sur',
}

const SOURCES = ['jetbrokers', 'brouk', 'iris']

function formatUF(value: number): string {
  return value.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ─── MultiSelect comunas ──────────────────────────────

function ComunaMultiSelect({ options, selected, onChange }: {
  options: string[]
  selected: string[]
  onChange: (v: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v])

  const allSelected = options.length > 0 && options.every((o) => selected.includes(o))
  const toggleAll = () => onChange(allSelected ? [] : [...options])

  const label =
    options.length === 0 ? 'Sin datos aún'
    : allSelected ? 'Todas las comunas'
    : selected.length === 0 ? 'Todas las comunas'
    : selected.length === 1 ? selected[0]
    : `${selected.length} comunas`

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={options.length === 0}
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full input-field flex items-center justify-between text-sm text-left',
          options.length === 0 ? 'opacity-50 cursor-not-allowed' : '',
          selected.length > 0 && !allSelected ? 'text-gray-900' : 'text-gray-400'
        )}
      >
        <span className="truncate">{label}</span>
        <ChevronDown className={cn('h-4 w-4 text-gray-400 flex-shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && options.length > 0 && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          <label className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-100 bg-gray-50/50">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="h-4 w-4 rounded border-gray-300 text-brand-primary flex-shrink-0"
            />
            <span className="text-sm font-semibold text-gray-800">Todas las comunas</span>
          </label>
          {options.map((opt) => (
            <label key={opt} className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
                className="h-4 w-4 rounded border-gray-300 text-brand-primary flex-shrink-0"
              />
              <span className="text-sm text-gray-700">{opt}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── ProjectCard ──────────────────────────────────────

function ExternalProjectCard({
  project,
  onClick,
}: {
  project: ExternalProject
  onClick: (project: ExternalProject) => void
}) {
  const sourceLabel = SOURCE_LABELS[project.source] ?? project.source
  const sourceColor = SOURCE_COLORS[project.source] ?? 'bg-gray-600 text-white'
  const stageLabel = project.stage ? (STAGE_LABELS[project.stage] ?? project.stage) : null
  const stageColor = project.stage ? (STAGE_COLORS[project.stage] ?? 'bg-gray-100 text-gray-700') : null

  return (
    <div
      className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col cursor-pointer"
      onClick={() => onClick(project)}
    >
      {/* Imagen */}
      <div className="relative h-44 bg-gray-100 flex-shrink-0">
        {project.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.imageUrl}
            alt={project.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none'
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Home className="h-10 w-10 text-gray-300" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1.5 flex-wrap">
          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm', sourceColor)}>
            {sourceLabel}
          </span>
          {stageLabel && stageColor && (
            <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-sm', stageColor)}>
              {stageLabel}
            </span>
          )}
        </div>
      </div>

      {/* Contenido */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-1">{project.name}</h3>

        {project.commune && (
          <div className="flex items-start gap-1 text-xs text-gray-500 mb-1">
            <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>{project.commune}</span>
          </div>
        )}

        {project.developerName && (
          <div className="flex items-start gap-1 text-xs text-gray-500 mb-1.5">
            <Building2 className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span className="truncate">{project.developerName}</span>
          </div>
        )}

        {(project.deliveryYear || project.deliveryPeriod) && (
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
            <Calendar className="h-3 w-3 flex-shrink-0" />
            <span>
              {[project.deliveryPeriod, project.deliveryYear].filter(Boolean).join(' ')}
            </span>
          </div>
        )}

        {project.typologies.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mb-2">
            {project.typologies.map((t) => (
              <span key={t} className="text-[10px] font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {t}
              </span>
            ))}
          </div>
        )}

        {project.priceFrom && project.priceFrom > 0 ? (
          <div className="mt-auto pt-2 text-sm font-bold text-brand-primary">
            Desde {project.priceFrom.toLocaleString('es-CL')} UF
          </div>
        ) : (
          <div className="mt-auto pt-2 text-sm text-gray-400">Precio a consultar</div>
        )}
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
      <div className="h-44 bg-gray-200" />
      <div className="p-4 space-y-2.5">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
        <div className="h-3 bg-gray-100 rounded w-2/3" />
        <div className="h-4 bg-gray-200 rounded w-1/3 mt-4" />
      </div>
    </div>
  )
}

// ─── SkeletonRow ──────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 9 }).map((_, i) => (
        <td key={i} className="px-3 py-3">
          <div className="h-3 bg-gray-200 rounded w-full" />
        </td>
      ))}
    </tr>
  )
}

// ─── UnitsModal ───────────────────────────────────────

function UnitsModal({
  project,
  units,
  loading,
  error,
  onClose,
}: {
  project: ExternalProject
  units: JBUnit[]
  loading: boolean
  error: string | null
  onClose: () => void
}) {
  const sourceLabel = SOURCE_LABELS[project.source] ?? project.source
  const sourceColor = SOURCE_COLORS[project.source] ?? 'bg-gray-600 text-white'
  const stageLabel = project.stage ? (STAGE_LABELS[project.stage] ?? project.stage) : null
  const stageColor = project.stage ? (STAGE_COLORS[project.stage] ?? 'bg-gray-100 text-gray-700') : null

  const uniqueTypologies = Array.from(new Set(units.map((u) => u.typology))).sort()
  const [activeTypology, setActiveTypology] = useState<string>('all')

  const filtered = activeTypology === 'all' ? units : units.filter((u) => u.typology === activeTypology)

  const priceFrom = units.length > 0 ? Math.min(...units.map((u) => u.finalPrice)) : null

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', sourceColor)}>
                {sourceLabel}
              </span>
              {stageLabel && stageColor && (
                <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', stageColor)}>
                  {stageLabel}
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-gray-900 leading-tight">{project.name}</h2>
            {project.commune && (
              <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span>{project.commune}</span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Subheader */}
        <div className="flex items-center gap-6 px-6 py-3 bg-gray-50 border-b border-gray-100 flex-shrink-0 flex-wrap">
          {priceFrom !== null && (
            <div>
              <span className="text-xs text-gray-500">Precio desde</span>
              <p className="text-sm font-bold text-brand-primary">{formatUF(priceFrom)} UF</p>
            </div>
          )}
          {project.developerName && (
            <div>
              <span className="text-xs text-gray-500">Inmobiliaria</span>
              <p className="text-sm font-semibold text-gray-800">{project.developerName}</p>
            </div>
          )}
          {(project.deliveryYear || project.deliveryPeriod) && (
            <div>
              <span className="text-xs text-gray-500">Entrega</span>
              <p className="text-sm font-semibold text-gray-800">
                {[project.deliveryPeriod, project.deliveryYear].filter(Boolean).join(' ')}
              </p>
            </div>
          )}
          {!loading && (
            <div className="ml-auto">
              <span className="text-xs text-gray-500">{units.length} unidades disponibles</span>
            </div>
          )}
        </div>

        {/* Filtro por tipología */}
        {!loading && !error && uniqueTypologies.length > 1 && (
          <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-100 flex-shrink-0 overflow-x-auto">
            <button
              onClick={() => setActiveTypology('all')}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors',
                activeTypology === 'all'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              Todas
            </button>
            {uniqueTypologies.map((typ) => (
              <button
                key={typ}
                onClick={() => setActiveTypology(typ)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors',
                  activeTypology === typ
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {typ}
              </button>
            ))}
          </div>
        )}

        {/* Contenido */}
        <div className="flex-1 overflow-auto">
          {loading && (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                <tr>
                  {['N°', 'Modelo', 'Dorms', 'm² Int', 'm² Terraza', 'Orientación', 'Precio UF', 'Dto %', 'Precio Final UF'].map((col) => (
                    <th key={col} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
              </tbody>
            </table>
          )}

          {!loading && error && (
            <div className="flex items-center gap-2 m-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="py-20 text-center">
              <Home className="h-10 w-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No hay unidades disponibles</p>
            </div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                <tr>
                  {['N°', 'Modelo', 'Dorms', 'm² Int', 'm² Terraza', 'Orientación', 'Precio UF', 'Dto %', 'Precio Final UF'].map((col) => (
                    <th key={col} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((unit) => (
                  <tr key={unit.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2.5 font-mono text-xs text-gray-700">{unit.number}</td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                        {unit.typology}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-700">{unit.rooms}</td>
                    <td className="px-3 py-2.5 text-gray-700">{unit.surfaceInterior.toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-gray-700">{unit.surfaceTerrace.toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-gray-500 text-xs">
                      {unit.facing ? (FACING_LABELS[unit.facing] ?? unit.facing) : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      {unit.discountRate > 0 ? (
                        <span className="text-xs text-gray-400 line-through">
                          {formatUF(unit.price)}
                        </span>
                      ) : (
                        <span className="text-gray-700">{formatUF(unit.price)}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {unit.discountRate > 0 ? (
                        <span className="text-xs font-semibold text-emerald-600">
                          {unit.discountRate.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn(
                        'font-semibold',
                        unit.discountRate > 0 ? 'text-emerald-600' : 'text-gray-900'
                      )}>
                        {formatUF(unit.finalPrice)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────

export default function ExternalStockSearch() {
  const [projects, setProjects] = useState<ExternalProject[]>([])
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ communes: [], stages: [] })
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')

  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ synced: number } | null>(null)
  const [syncError, setSyncError] = useState('')

  const [q, setQ] = useState('')
  const [selectedCommunas, setSelectedCommunas] = useState<string[]>([])
  const [selectedSources, setSelectedSources] = useState<string[]>([])
  const [selectedStage, setSelectedStage] = useState('')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')

  const [selectedProject, setSelectedProject] = useState<ExternalProject | null>(null)
  const [units, setUnits] = useState<JBUnit[]>([])
  const [loadingUnits, setLoadingUnits] = useState(false)
  const [unitsError, setUnitsError] = useState<string | null>(null)

  const buildFilter = useCallback((): SearchFilter => {
    const filter: SearchFilter = {}
    if (q.trim()) filter.q = q.trim()
    if (selectedCommunas.length > 0) filter.commune = selectedCommunas
    if (selectedSources.length > 0) filter.source = selectedSources
    if (selectedStage) filter.stage = [selectedStage]
    if (priceMin) filter.priceMin = parseFloat(priceMin)
    if (priceMax) filter.priceMax = parseFloat(priceMax)
    return filter
  }, [q, selectedCommunas, selectedSources, selectedStage, priceMin, priceMax])

  const search = useCallback(async (overrideFilter?: SearchFilter) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/external/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filter: overrideFilter ?? buildFilter() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Error al buscar')
        return
      }
      setProjects(data.projects ?? [])
      if (data.filterOptions) setFilterOptions(data.filterOptions)
      setSearched(true)
    } catch {
      setError('Error de red al conectar')
    } finally {
      setLoading(false)
    }
  }, [buildFilter])

  const handleSync = async () => {
    setSyncing(true)
    setSyncResult(null)
    setSyncError('')
    try {
      const res = await fetch('/api/admin/external/sync/jetbrokers', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setSyncError(data.error ?? 'Error al sincronizar')
        return
      }
      setSyncResult({ synced: data.synced })
      await search({ })
    } catch {
      setSyncError('Error de red al sincronizar')
    } finally {
      setSyncing(false)
    }
  }

  async function handleProjectClick(project: ExternalProject) {
    setSelectedProject(project)
    setUnits([])
    setUnitsError(null)
    setLoadingUnits(true)
    try {
      const res = await fetch('/api/admin/external/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id, sourceId: project.sourceId, source: project.source }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error cargando unidades')
      setUnits(data.units)
    } catch (e) {
      setUnitsError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoadingUnits(false)
    }
  }

  const handleSearch = () => search()

  const toggleSource = (src: string) =>
    setSelectedSources((prev) =>
      prev.includes(src) ? prev.filter((x) => x !== src) : [...prev, src]
    )

  const clearFilters = () => {
    setQ('')
    setSelectedCommunas([])
    setSelectedSources([])
    setSelectedStage('')
    setPriceMin('')
    setPriceMax('')
  }

  const hasFilters = q || selectedCommunas.length > 0 || selectedSources.length > 0 || selectedStage || priceMin || priceMax

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Stock Unificado</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Proyectos sincronizados desde fuentes externas
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {syncResult && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {syncResult.synced} proyectos sincronizados
            </span>
          )}
          {syncError && (
            <span className="text-xs text-red-600">{syncError}</span>
          )}
          <button
            onClick={handleSync}
            disabled={syncing}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors',
              syncing
                ? 'opacity-60 cursor-not-allowed border-gray-200 text-gray-400'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
            )}
          >
            <Database className={cn('h-4 w-4', syncing && 'animate-pulse')} />
            {syncing ? 'Sincronizando…' : 'Sincronizar JetBrokers'}
          </button>
        </div>
      </div>

      {/* Panel de filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">

        {/* Fila 1: texto + comunas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Buscar proyecto</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Nombre del proyecto…"
                className="input-field pl-9 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Comunas</label>
            <ComunaMultiSelect
              options={filterOptions.communes}
              selected={selectedCommunas}
              onChange={setSelectedCommunas}
            />
          </div>
        </div>

        {/* Fila 2: fuente + stage */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">Fuente</label>
            <div className="flex flex-wrap gap-3">
              {SOURCES.map((src) => (
                <label key={src} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSources.includes(src)}
                    onChange={() => toggleSource(src)}
                    className="h-4 w-4 rounded border-gray-300 text-brand-primary"
                  />
                  <span className="text-sm text-gray-700">{SOURCE_LABELS[src]}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Estado</label>
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="input-field text-sm"
            >
              <option value="">Todos</option>
              <option value="green">En construcción</option>
              <option value="deliveryReady">Entrega inmediata</option>
              <option value="white">Preventa</option>
            </select>
          </div>
        </div>

        {/* Fila 3: precio */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-2">Rango de precio (UF)</label>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500 whitespace-nowrap">Mín.</span>
              <input
                type="number"
                min={0}
                step={50}
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                placeholder="0"
                className="input-field text-sm w-28 text-right"
              />
              <span className="text-xs text-gray-400">UF</span>
            </div>
            <span className="text-gray-300">—</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500 whitespace-nowrap">Máx.</span>
              <input
                type="number"
                min={0}
                step={50}
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                placeholder="Sin límite"
                className="input-field text-sm w-28 text-right"
              />
              <span className="text-xs text-gray-400">UF</span>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-between pt-1 border-t border-gray-100">
          {hasFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
            >
              <X className="h-3.5 w-3.5" /> Limpiar filtros
            </button>
          ) : (
            <span />
          )}
          <button
            onClick={handleSearch}
            disabled={loading}
            className={cn('btn-primary flex items-center gap-2 text-sm', loading && 'opacity-60 cursor-not-allowed')}
          >
            {loading
              ? <RefreshCw className="h-4 w-4 animate-spin" />
              : <Search className="h-4 w-4" />
            }
            {loading ? 'Buscando…' : 'Buscar'}
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
          <p className="text-sm text-gray-500">
            {projects.length === 0
              ? 'Sin proyectos con los filtros aplicados'
              : `${projects.length} proyecto${projects.length !== 1 ? 's' : ''} encontrado${projects.length !== 1 ? 's' : ''}`}
          </p>

          {projects.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((p) => (
                <ExternalProjectCard key={p.id} project={p} onClick={handleProjectClick} />
              ))}
            </div>
          )}

          {projects.length === 0 && (
            <div className="py-16 text-center">
              <Database className="h-10 w-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No se encontraron proyectos con esos filtros</p>
              <p className="text-xs text-gray-300 mt-1">
                Prueba sincronizando primero con el botón de arriba
              </p>
            </div>
          )}
        </>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Estado inicial */}
      {!searched && !loading && (
        <div className="py-24 text-center">
          <Database className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">
            Sincroniza los datos y luego presiona Buscar para ver proyectos
          </p>
        </div>
      )}

      {/* Modal de unidades */}
      {selectedProject && (
        <UnitsModal
          project={selectedProject}
          units={units}
          loading={loadingUnits}
          error={unitsError}
          onClose={() => {
            setSelectedProject(null)
            setUnits([])
            setUnitsError(null)
          }}
        />
      )}
    </div>
  )
}
