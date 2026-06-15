'use client'
// src/components/admin/ExternalStockSearch.tsx
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import {
  Search, RefreshCw, MapPin, Home, AlertCircle, ChevronDown, ChevronUp,
  Database, X, Building2, Calendar, Map, FolderOpen, FileText, ExternalLink, ScrollText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { IRIS_REGIONS } from '@/lib/iris-zones'

const ProjectMap = dynamic(() => import('./ProjectMap'), { ssr: false })

// ─── Tipos ────────────────────────────────────────────

type CanonicalProject = {
  id: string
  name: string
  commune: string | null
  address: string | null
  deliveryPeriod: string | null
  deliveryYear: number | null
  stage: string | null
  developerName: string | null
  priceFrom: number | null
  imageUrl: string | null
  typologies: string[]
  lat: number | null
  lng: number | null
  hereLat: number | null
  hereLng: number | null
  unitCount: number
  maxBonoPie: number | null
  sources: string[]
  externalProjects: Array<{
    source: string
    sourceId: string
    driveUrl: string | null
    stockFileUrl: string | null
    condicionesUrl: string | null
    brochureUrl: string | null
    notesHtml: string | null
    paymentMethodsHtml: string | null
  }>
}

type SearchFilter = {
  q?: string
  commune?: string[]
  typologies?: string[]
  bonoPieMin?: number
  priceMin?: number
  priceMax?: number
  sources?: string[]
  delivery?: 'immediate' | 'future'  // 'immediate'=deliveryReady|A estrenar; 'future'=green|white|En pozo|En construcción
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

// ─── Constantes ───────────────────────────────────────

const PRICE_MAX = 20000
const PRICE_STEP = 50
const TIPOLOGIAS = ['Estudio', '1D1B', '2D1B', '2D2B', '3D1B', '3D2B', '3D3B']

const SOURCE_LABELS: Record<string, string> = {
  jetbrokers: 'GCP',
  brouk: 'Drive',
  iris: 'AWS',
}

const SOURCE_COLORS: Record<string, string> = {
  jetbrokers: 'bg-sky-400 text-white',
  brouk: 'bg-blue-600 text-white',
  iris: 'bg-orange-500 text-white',
}

// Mapeo de todos los valores de stage existentes en BD
const STAGE_LABELS: Record<string, string> = {
  deliveryReady:   'Entrega inmediata',
  'A estrenar':    'Entrega inmediata',
  green:           'En construcción',
  'En construcción': 'En construcción',
  'En pozo':       'En pozo',
  white:           'Preventa',
}

// Verde para entrega inmediata; gris para entrega futura
const STAGE_COLORS: Record<string, string> = {
  deliveryReady:     'bg-emerald-100 text-emerald-800',
  'A estrenar':      'bg-emerald-100 text-emerald-800',
  green:             'bg-gray-100 text-gray-600',
  'En construcción': 'bg-gray-100 text-gray-600',
  'En pozo':         'bg-gray-100 text-gray-600',
  white:             'bg-gray-100 text-gray-600',
}

const FACING_LABELS: Record<string, string> = {
  west: 'Poniente', east: 'Oriente', north: 'Norte', south: 'Sur',
}

function formatUF(value: number): string {
  return value.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ─── DualRangeSlider ──────────────────────────────────

function DualRangeSlider({ values, onChange }: {
  values: [number, number]
  onChange: (v: [number, number]) => void
}) {
  const [minVal, maxVal] = values
  const minPct = (minVal / PRICE_MAX) * 100
  const maxPct = (maxVal / PRICE_MAX) * 100

  return (
    <div className="relative h-6 flex items-center select-none">
      <div className="absolute w-full h-1.5 bg-gray-200 rounded-full" />
      <div
        className="absolute h-1.5 bg-brand-primary rounded-full pointer-events-none"
        style={{ left: `${minPct}%`, width: `${maxPct - minPct}%` }}
      />
      <input
        type="range" min={0} max={PRICE_MAX} step={PRICE_STEP} value={minVal}
        onChange={e => onChange([Math.min(Number(e.target.value), maxVal - PRICE_STEP), maxVal])}
        className="absolute w-full h-1.5 appearance-none bg-transparent cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:pointer-events-auto
          [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
          [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2
          [&::-webkit-slider-thumb]:border-brand-primary [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-grab
          [&::-webkit-slider-thumb]:active:cursor-grabbing"
        style={{ zIndex: minVal > PRICE_MAX - 1000 ? 5 : 3, pointerEvents: 'none' }}
      />
      <input
        type="range" min={0} max={PRICE_MAX} step={PRICE_STEP} value={maxVal}
        onChange={e => onChange([minVal, Math.max(Number(e.target.value), minVal + PRICE_STEP)])}
        className="absolute w-full h-1.5 appearance-none bg-transparent cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:pointer-events-auto
          [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
          [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2
          [&::-webkit-slider-thumb]:border-brand-primary [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-grab
          [&::-webkit-slider-thumb]:active:cursor-grabbing"
        style={{ zIndex: 4, pointerEvents: 'none' }}
      />
    </div>
  )
}

// ─── ComunasSelect ────────────────────────────────────

function ComunasSelect({ options, selected, onChange, disabled }: {
  options: { id: number; name: string }[]
  selected: number[]
  onChange: (ids: number[]) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const allIds = options.map(o => o.id)
  const allSelected = options.length > 0 && allIds.every(id => selected.includes(id))
  const toggleAll = () => onChange(allSelected ? [] : allIds)
  const toggleOne = (id: number) =>
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id])

  const label = disabled
    ? 'Selecciona una región primero'
    : allSelected
    ? 'Todas las comunas'
    : selected.length === 0
    ? 'Seleccionar comunas...'
    : selected.length === 1
    ? options.find(o => o.id === selected[0])?.name ?? '1 seleccionada'
    : `${selected.length} comunas`

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(v => !v)}
        className={cn(
          'w-full input-field flex items-center justify-between text-sm text-left transition-colors',
          disabled && 'opacity-50 cursor-not-allowed bg-gray-50',
          !disabled && selected.length > 0 ? 'text-gray-900' : 'text-gray-400'
        )}
      >
        <span className="truncate">{label}</span>
        <ChevronDown className={cn('h-4 w-4 text-gray-400 flex-shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && !disabled && (
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
          {options.map(opt => (
            <label key={opt.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.includes(opt.id)}
                onChange={() => toggleOne(opt.id)}
                className="h-4 w-4 rounded border-gray-300 text-brand-primary flex-shrink-0"
              />
              <span className="text-sm text-gray-700">{opt.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── TipologiaSelect ──────────────────────────────────

function TipologiaSelect({ selected, onChange }: {
  selected: string[]
  onChange: (v: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = (t: string) =>
    onChange(selected.includes(t) ? selected.filter(x => x !== t) : [...selected, t])

  const label = selected.length === 0 ? 'Todas las tipologías'
    : selected.length === 1 ? selected[0]
    : `${selected.length} tipologías`

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={cn('w-full input-field flex items-center justify-between text-sm text-left', selected.length > 0 ? 'text-gray-900' : 'text-gray-400')}
      >
        <span className="truncate">{label}</span>
        <ChevronDown className={cn('h-4 w-4 text-gray-400 flex-shrink-0 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {selected.length > 0 && (
            <button type="button" onClick={() => onChange([])} className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-50 border-b border-gray-100">
              Limpiar selección
            </button>
          )}
          <div className="grid grid-cols-2 p-1">
            {TIPOLOGIAS.map(t => (
              <label key={t} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer">
                <input type="checkbox" checked={selected.includes(t)} onChange={() => toggle(t)} className="h-3.5 w-3.5 rounded border-gray-300 text-brand-primary" />
                <span className="text-sm text-gray-700">{t}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── ProjectCard ──────────────────────────────────────

function ExternalProjectCard({ project, onShowUnits, onShowCondiciones, onShowCondicionesPdf }: {
  project: CanonicalProject
  onShowUnits: (p: CanonicalProject) => void
  onShowCondiciones: (p: CanonicalProject) => void
  onShowCondicionesPdf: (url: string, name: string) => void
}) {
  const stageLabel = project.stage ? (STAGE_LABELS[project.stage] ?? project.stage) : null
  const stageColor = project.stage ? (STAGE_COLORS[project.stage] ?? 'bg-gray-100 text-gray-700') : null

  const irisEp         = project.externalProjects.find(ep => ep.source === 'iris')
  const broukEp        = project.externalProjects.find(ep => ep.source === 'brouk')
  const jbEp           = project.externalProjects.find(ep => ep.source === 'jetbrokers')
  const hasUnits       = !!(irisEp || jbEp)
  const hasCondiciones = !!(jbEp?.notesHtml || irisEp?.paymentMethodsHtml)

  // Las imágenes de JetBrokers requieren auth — las servimos via proxy
  const imageUrl = project.imageUrl?.includes('jetbrokers.io/api/cover/')
    ? `/api/admin/external/cover?id=${project.imageUrl.split('/api/cover/')[1]}`
    : project.imageUrl

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      <div className="relative h-44 bg-gray-100 flex-shrink-0">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={project.name}
            className="w-full h-full object-cover"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Home className="h-10 w-10 text-gray-300" />
          </div>
        )}
        <div className="absolute top-2 left-2 flex gap-1.5 flex-wrap">
          {project.sources.map(s => (
            <span key={s} className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm', SOURCE_COLORS[s] ?? 'bg-[#941914] text-white')}>
              {SOURCE_LABELS[s] ?? s}
            </span>
          ))}
          {stageLabel && stageColor && (
            <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-sm', stageColor)}>
              {stageLabel}
            </span>
          )}
          {project.maxBonoPie != null && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm bg-emerald-500 text-white">
              Bono pie {Number.isInteger(project.maxBonoPie) ? project.maxBonoPie : project.maxBonoPie.toFixed(1)}%
            </span>
          )}
        </div>
      </div>

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
            <span>{[project.deliveryPeriod, project.deliveryYear].filter(Boolean).join(' ')}</span>
          </div>
        )}

        {project.typologies.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mb-2">
            {project.typologies.map(t => (
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

        {/* Acciones por fuente */}
        {(broukEp || irisEp?.condicionesUrl || hasUnits || hasCondiciones) && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col gap-2">

            {/* Brouk: Drive + Ver Stock */}
            {broukEp && (broukEp.driveUrl || broukEp.stockFileUrl) && (
              <div className="flex gap-2">
                {broukEp.driveUrl && (
                  <a
                    href={broukEp.driveUrl} target="_blank" rel="noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium border border-gray-200 rounded-lg py-2 hover:bg-gray-50 transition-colors"
                    onClick={e => e.stopPropagation()}
                  >
                    <FolderOpen className="h-3.5 w-3.5" /> Drive
                  </a>
                )}
                {broukEp.stockFileUrl && (
                  <a
                    href={broukEp.stockFileUrl} target="_blank" rel="noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium border border-gray-200 rounded-lg py-2 hover:bg-gray-50 transition-colors"
                    onClick={e => e.stopPropagation()}
                  >
                    <FileText className="h-3.5 w-3.5" /> Ver Stock
                  </a>
                )}
              </div>
            )}

            {/* Brochure + Condiciones HTML + Condiciones PDF en la misma fila */}
            {(irisEp?.brochureUrl || hasCondiciones || irisEp?.condicionesUrl) && (
              <div className="flex items-center gap-4 flex-wrap">
                {irisEp?.brochureUrl && (
                  <a
                    href={irisEp.brochureUrl} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs font-medium text-brand-primary hover:underline"
                    onClick={e => e.stopPropagation()}
                  >
                    <FileText className="h-3.5 w-3.5" /> Brochure
                  </a>
                )}
                {hasCondiciones && (
                  <button
                    className="flex items-center gap-1.5 text-xs font-medium text-brand-primary hover:underline text-left"
                    onClick={e => { e.stopPropagation(); onShowCondiciones(project) }}
                  >
                    <ScrollText className="h-3.5 w-3.5" /> Condiciones
                  </button>
                )}
                {irisEp?.condicionesUrl && (
                  <button
                    className="flex items-center gap-1.5 text-xs font-medium text-brand-primary hover:underline text-left"
                    onClick={e => { e.stopPropagation(); onShowCondicionesPdf(irisEp.condicionesUrl!, project.name) }}
                  >
                    <FileText className="h-3.5 w-3.5" /> Condiciones PDF
                  </button>
                )}
              </div>
            )}

            {/* Iris / JetBrokers: Ver unidades */}
            {hasUnits && (
              <button
                className="flex items-center gap-1.5 text-xs font-medium text-brand-primary hover:underline text-left"
                onClick={e => { e.stopPropagation(); onShowUnits(project) }}
              >
                <ChevronDown className="h-3.5 w-3.5" />
                Ver unidades
                {project.unitCount > 0 && (
                  <span className="ml-0.5 text-[10px] font-bold bg-brand-primary text-white rounded-full px-1.5 py-0.5 leading-none">
                    {project.unitCount}
                  </span>
                )}
              </button>
            )}
          </div>
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

type SortField = 'number' | 'typology' | 'rooms' | 'surfaceInterior' | 'surfaceTerrace' | 'facing' | 'price' | 'discountRate' | 'finalPrice'

function UnitsModal({ project, units, loading, error, onClose }: {
  project: CanonicalProject
  units: JBUnit[]
  loading: boolean
  error: string | null
  onClose: () => void
}) {
  const stageLabel = project.stage ? (STAGE_LABELS[project.stage] ?? project.stage) : null
  const stageColor = project.stage ? (STAGE_COLORS[project.stage] ?? 'bg-gray-100 text-gray-700') : null

  const uniqueTypologies = Array.from(new Set(units.map(u => u.typology))).sort()
  const [activeTypology, setActiveTypology] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('finalPrice')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const effectiveDiscount = (u: JBUnit) =>
    u.discountRate > 0 ? u.discountRate : (project.maxBonoPie ?? 0)
  const effectiveFinalPrice = (u: JBUnit) => {
    const d = effectiveDiscount(u)
    return d > 0 ? u.price * (1 - d / 100) : u.finalPrice
  }

  const baseFiltered = activeTypology === 'all' ? units : units.filter(u => u.typology === activeTypology)
  const filtered = [...baseFiltered].sort((a, b) => {
    const getVal = (u: JBUnit) => {
      if (sortField === 'finalPrice') return effectiveFinalPrice(u)
      if (sortField === 'discountRate') return effectiveDiscount(u)
      return u[sortField] ?? ''
    }
    const av = getVal(a)
    const bv = getVal(b)
    const cmp = av < bv ? -1 : av > bv ? 1 : 0
    return sortDir === 'asc' ? cmp : -cmp
  })
  const priceFrom = units.length > 0 ? Math.min(...units.map(u => effectiveFinalPrice(u))) : null

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">

        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {project.sources.map(s => (
                <span key={s} className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', SOURCE_COLORS[s] ?? 'bg-gray-600 text-white')}>
                  {SOURCE_LABELS[s] ?? s}
                </span>
              ))}
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

        {!loading && !error && uniqueTypologies.length > 1 && (
          <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-100 flex-shrink-0 overflow-x-auto">
            <button
              onClick={() => setActiveTypology('all')}
              className={cn('px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors',
                activeTypology === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              Todas
            </button>
            {uniqueTypologies.map(typ => (
              <button
                key={typ}
                onClick={() => setActiveTypology(typ)}
                className={cn('px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors',
                  activeTypology === typ ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {typ}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-auto">
          {loading && (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                <tr>
                  {['N°', 'Modelo', 'Dorm/B', 'm² Int', 'm² Terraza', 'Orientación', 'Precio UF', 'Dto %', 'Precio Final UF'].map(col => (
                    <th key={col} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">{col}</th>
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
              <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
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
                  {([
                    ['N°', 'number'],
                    ['Modelo', 'typology'],
                    ['Dorm/B', 'rooms'],
                    ['m² Int', 'surfaceInterior'],
                    ['m² Terraza', 'surfaceTerrace'],
                    ['Orientación', 'facing'],
                    ['Precio UF', 'price'],
                    ['Dto %', 'discountRate'],
                    ['Precio Final UF', 'finalPrice'],
                  ] as [string, SortField][]).map(([label, field]) => (
                    <th
                      key={field}
                      onClick={() => handleSort(field)}
                      className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 whitespace-nowrap cursor-pointer select-none hover:text-gray-900 hover:bg-gray-100"
                    >
                      <span className="flex items-center gap-1">
                        {label}
                        {sortField === field
                          ? (sortDir === 'asc' ? ' ↑' : ' ↓')
                          : <span className="text-gray-300"> ↕</span>
                        }
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(unit => (
                  <tr key={unit.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2.5 font-mono text-xs text-gray-700">{unit.number}</td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{unit.typology}</span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-700">{unit.rooms}/{unit.bathrooms ?? '?'}</td>
                    <td className="px-3 py-2.5 text-gray-700">{unit.surfaceInterior.toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-gray-700">{unit.surfaceTerrace.toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-gray-500 text-xs">
                      {unit.facing ? (FACING_LABELS[unit.facing] ?? unit.facing) : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      {effectiveDiscount(unit) > 0
                        ? <span className="text-xs text-gray-400 line-through">{formatUF(unit.price)}</span>
                        : <span className="text-gray-700">{formatUF(unit.price)}</span>
                      }
                    </td>
                    <td className="px-3 py-2.5">
                      {effectiveDiscount(unit) > 0
                        ? <span className={cn('text-xs font-semibold text-emerald-600', unit.discountRate === 0 && 'opacity-70')}>
                            {effectiveDiscount(unit).toFixed(1)}%
                          </span>
                        : <span className="text-gray-400">—</span>
                      }
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn('font-semibold', effectiveDiscount(unit) > 0 ? 'text-emerald-600' : 'text-gray-900')}>
                        {formatUF(effectiveFinalPrice(unit))}
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

// ─── CondicionesModal ─────────────────────────────────

function CondicionesModal({ project, onClose }: {
  project: CanonicalProject
  onClose: () => void
}) {
  const jbEp   = project.externalProjects.find(ep => ep.source === 'jetbrokers')
  const irisEp = project.externalProjects.find(ep => ep.source === 'iris')

  const sections = [
    jbEp?.notesHtml   && { label: 'Condiciones GCP',  html: jbEp.notesHtml },
    irisEp?.paymentMethodsHtml && { label: 'Formas de pago AWS', html: irisEp.paymentMethodsHtml },
  ].filter(Boolean) as { label: string; html: string }[]

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {project.sources.map(s => (
                <span key={s} className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', SOURCE_COLORS[s] ?? 'bg-gray-600 text-white')}>
                  {SOURCE_LABELS[s] ?? s}
                </span>
              ))}
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

        {/* Contenido desplazable */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {sections.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              No hay condiciones comerciales disponibles para este proyecto.
            </p>
          ) : (
            sections.map((section, i) => (
              <div key={i}>
                {sections.length > 1 && (
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">
                    {section.label}
                  </p>
                )}
                <div
                  className="text-sm text-gray-700 leading-relaxed
                    [&_h1]:text-base [&_h1]:font-bold [&_h1]:mb-2 [&_h1]:mt-4
                    [&_h2]:text-sm [&_h2]:font-bold [&_h2]:mb-2 [&_h2]:mt-3
                    [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-1 [&_h3]:mt-3
                    [&_p]:mb-2 [&_p:last-child]:mb-0
                    [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 [&_ul]:space-y-0.5
                    [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2 [&_ol]:space-y-0.5
                    [&_li]:text-sm
                    [&_strong]:font-semibold
                    [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm [&_table]:mb-2
                    [&_th]:text-left [&_th]:px-3 [&_th]:py-2 [&_th]:bg-gray-50 [&_th]:font-semibold [&_th]:border [&_th]:border-gray-200
                    [&_td]:px-3 [&_td]:py-2 [&_td]:border [&_td]:border-gray-200
                    [&_a]:text-brand-primary [&_a]:underline"
                  dangerouslySetInnerHTML={{ __html: section.html }}
                />
                {i < sections.length - 1 && <div className="mt-6 border-t border-gray-100" />}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ─── PdfModal ─────────────────────────────────────────

function PdfModal({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[88vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 flex-shrink-0">
          <div className="min-w-0">
            <p className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">Condiciones comerciales</p>
            <h2 className="text-sm font-bold text-gray-900 truncate">{title}</h2>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs font-medium text-brand-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Abrir en nueva pestaña
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <iframe
          src={url}
          className="flex-1 w-full border-0"
          title={`Condiciones comerciales — ${title}`}
        />
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────

export default function ExternalStockSearch() {
  const [projects, setProjects] = useState<CanonicalProject[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')

  // Filtros
  const [q, setQ] = useState('')
  const [regionId, setRegionId] = useState<number | ''>('')
  const [zoneIds, setZoneIds] = useState<number[]>([])
  const [tipologias, setTipologias] = useState<string[]>([])
  const [bonoPieMin, setBonoPieMin] = useState('')
  const [priceRange, setPriceRange] = useState<[number, number]>([0, PRICE_MAX])
  const [srcAws, setSrcAws] = useState(true)
  const [srcDrive, setSrcDrive] = useState(true)
  const [srcGcp, setSrcGcp] = useState(true)
  const [delivery, setDelivery] = useState<'' | 'immediate' | 'future'>('')

  const handlePriceInput = (side: 'min' | 'max', raw: string) => {
    const v = Math.max(0, Math.min(PRICE_MAX, parseInt(raw) || 0))
    if (side === 'min') setPriceRange([Math.min(v, priceRange[1] - PRICE_STEP), priceRange[1]])
    else setPriceRange([priceRange[0], Math.max(v, priceRange[0] + PRICE_STEP)])
  }

  const [showMap, setShowMap] = useState(true)
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null)

  const [selectedProject, setSelectedProject] = useState<CanonicalProject | null>(null)
  const [units, setUnits] = useState<JBUnit[]>([])
  const [loadingUnits, setLoadingUnits] = useState(false)
  const [unitsError, setUnitsError] = useState<string | null>(null)

  const [condicionesProject, setCondicionesProject] = useState<CanonicalProject | null>(null)
  const [pdfModal, setPdfModal] = useState<{ url: string; name: string } | null>(null)

  const selectedRegion = useMemo(() => IRIS_REGIONS.find(r => r.id === regionId), [regionId])
  const canSearch = regionId !== '' || q.trim().length > 0

  const mapProjects = useMemo(
    () => projects.filter((p) =>
      (p.hereLat ?? p.lat) !== null && (p.hereLng ?? p.lng) !== null
    ),
    [projects]
  )

  const visibleProjects = useMemo(
    () => selectedMapId ? projects.filter(p => p.id === selectedMapId) : projects,
    [projects, selectedMapId]
  )

  const handleRegionChange = (id: number | '') => {
    setRegionId(id)
    if (id !== '') {
      const region = IRIS_REGIONS.find(r => r.id === id)
      setZoneIds(region?.zones.map(z => z.id) ?? [])
    } else {
      setZoneIds([])
    }
  }

  const buildFilter = useCallback((): SearchFilter => {
    const filter: SearchFilter = {}
    if (q.trim()) filter.q = q.trim()

    if (selectedRegion && zoneIds.length > 0) {
      const names = zoneIds
        .map(id => selectedRegion.zones.find(z => z.id === id)?.name)
        .filter((n): n is string => Boolean(n))
      if (names.length > 0) filter.commune = names
    }

    if (tipologias.length > 0) filter.typologies = tipologias
    if (bonoPieMin) filter.bonoPieMin = parseFloat(bonoPieMin)
    if (priceRange[0] > 0) filter.priceMin = priceRange[0]
    if (priceRange[1] < PRICE_MAX) filter.priceMax = priceRange[1]

    const sources = [
      ...(srcAws   ? ['iris']        : []),
      ...(srcDrive ? ['brouk']       : []),
      ...(srcGcp   ? ['jetbrokers']  : []),
    ]
    if (sources.length < 3) filter.sources = sources
    if (delivery) filter.delivery = delivery

    return filter
  }, [q, selectedRegion, zoneIds, tipologias, bonoPieMin, priceRange, srcAws, srcDrive, srcGcp, delivery])

  const search = useCallback(async () => {
    if (!canSearch) return
    setLoading(true)
    setError('')
    setSelectedMapId(null)
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000)
      const res = await fetch('/api/admin/external/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filter: buildFilter() }),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al buscar'); return }
      setProjects(data.projects ?? [])
      setSearched(true)
    } catch (e) {
      const err = e as Error
      setError(err.name === 'AbortError' ? 'La búsqueda tardó demasiado. Intenta de nuevo.' : 'Error de red al conectar')
    } finally {
      setLoading(false)
    }
  }, [canSearch, buildFilter])

  async function handleProjectClick(project: CanonicalProject) {
    setSelectedProject(project)
    setUnits([])
    setUnitsError(null)
    setLoadingUnits(true)
    try {
      // Pick best source for unit lookup: JetBrokers > Iris > Brouk
      const PRIO = ['iris', 'jetbrokers', 'brouk']
      const ep = PRIO.map(s => project.externalProjects.find(p => p.source === s)).find(Boolean)
      if (!ep) throw new Error('No hay fuente de datos disponible')
      const res = await fetch('/api/admin/external/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id, sourceId: ep.sourceId, source: ep.source }),
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

  const clearFilters = () => {
    setQ('')
    setRegionId('')
    setZoneIds([])
    setTipologias([])
    setBonoPieMin('')
    setPriceRange([0, PRICE_MAX])
    setSrcAws(true)
    setSrcDrive(true)
    setSrcGcp(true)
    setDelivery('')
  }

  const priceActive = priceRange[0] > 0 || priceRange[1] < PRICE_MAX
  const hasFilters = q || regionId !== '' || tipologias.length > 0 || bonoPieMin || priceActive

  return (
    <div className="p-6 space-y-6">

      {/* Switches de fuente */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Fuentes:</span>
        {([
          { key: 'aws',   label: 'AWS',   value: srcAws,   set: setSrcAws,   color: 'bg-orange-500' },
          { key: 'drive', label: 'Drive',  value: srcDrive, set: setSrcDrive, color: 'bg-blue-600' },
          { key: 'gcp',   label: 'GCP',   value: srcGcp,   set: setSrcGcp,   color: 'bg-sky-400' },
        ] as const).map(src => (
          <button
            key={src.key}
            type="button"
            onClick={() => src.set(v => !v)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border',
              src.value
                ? `${src.color} text-white border-transparent`
                : 'bg-white text-gray-400 border-gray-200'
            )}
          >
            <span className={cn(
              'inline-block w-3.5 h-3.5 rounded-full border-2 transition-colors',
              src.value ? 'bg-white border-white/60' : 'bg-gray-200 border-gray-300'
            )} />
            {src.label}
          </button>
        ))}
      </div>

      {/* Panel de filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">

        {/* Fila 1: nombre (ancho completo) */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Buscar proyecto</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && canSearch && search()}
              placeholder="Nombre del proyecto…"
              className="input-field pl-9 text-sm w-full"
            />
          </div>
        </div>

        {/* Fila 2: región + comunas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Región <span className="text-red-400">*</span>
            </label>
            <select
              value={regionId}
              onChange={e => handleRegionChange(e.target.value === '' ? '' : Number(e.target.value))}
              className="input-field text-sm"
            >
              <option value="">Seleccionar región…</option>
              {IRIS_REGIONS.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Comunas
              {zoneIds.length > 0 && (
                <button type="button" onClick={() => setZoneIds([])} className="ml-2 text-red-400 hover:text-red-600">
                  <X className="h-3 w-3 inline" />
                </button>
              )}
            </label>
            <ComunasSelect
              options={selectedRegion?.zones ?? []}
              selected={zoneIds}
              onChange={setZoneIds}
              disabled={!selectedRegion}
            />
          </div>
        </div>

        {/* Fila 3: tipología + bono pie */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Tipología</label>
            <TipologiaSelect selected={tipologias} onChange={setTipologias} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Bono pie mínimo (%)</label>
            <div className="flex items-center gap-2">
              <input
                type="number" min={0} max={100} step={1} value={bonoPieMin}
                onChange={e => setBonoPieMin(e.target.value)}
                placeholder="Ej: 5" className="input-field text-sm w-28"
              />
              <span className="text-sm text-gray-500">% mínimo</span>
              {bonoPieMin && (
                <button type="button" onClick={() => setBonoPieMin('')} className="text-gray-400 hover:text-gray-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Fila 4: precio (slider + inputs) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-semibold text-gray-700">Rango de precio (UF)</label>
            <span className="text-xs text-gray-500">
              {priceRange[0] === 0 && priceRange[1] === PRICE_MAX
                ? 'Sin límite'
                : `${priceRange[0].toLocaleString('es-CL')} – ${priceRange[1].toLocaleString('es-CL')} UF`}
            </span>
          </div>
          <div className="px-2 mb-4">
            <DualRangeSlider values={priceRange} onChange={setPriceRange} />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 flex-1">
              <span className="text-xs text-gray-500 whitespace-nowrap">Mín.</span>
              <input type="number" min={0} max={PRICE_MAX} step={PRICE_STEP} value={priceRange[0]}
                onChange={e => handlePriceInput('min', e.target.value)}
                className="input-field text-sm text-right" />
              <span className="text-xs text-gray-400">UF</span>
            </div>
            <span className="text-gray-300">—</span>
            <div className="flex items-center gap-1.5 flex-1">
              <span className="text-xs text-gray-500 whitespace-nowrap">Máx.</span>
              <input type="number" min={0} max={PRICE_MAX} step={PRICE_STEP} value={priceRange[1]}
                onChange={e => handlePriceInput('max', e.target.value)}
                className="input-field text-sm text-right" />
              <span className="text-xs text-gray-400">UF</span>
            </div>
            {priceActive && (
              <button type="button" onClick={() => setPriceRange([0, PRICE_MAX])} className="text-gray-400 hover:text-gray-600" title="Limpiar precio">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Fila 5: tipo de entrega */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-2">Tipo de entrega</label>
          <div className="flex gap-2">
            {([
              { value: '' as const,           label: 'Todos' },
              { value: 'immediate' as const,  label: 'Entrega inmediata' },
              { value: 'future' as const,     label: 'Entrega futura' },
            ]).map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDelivery(opt.value)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                  delivery === opt.value
                    ? 'bg-brand-primary text-white border-brand-primary'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-brand-primary'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-between pt-1 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            {!canSearch
              ? <span className="text-amber-600">Selecciona una región o busca por nombre para consultar</span>
              : <span className="text-green-600">Listo para consultar</span>}
          </p>
          <div className="flex items-center gap-3">
            {hasFilters && (
              <button type="button" onClick={clearFilters} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
                <X className="h-3.5 w-3.5" /> Limpiar filtros
              </button>
            )}
            <button
              onClick={search}
              disabled={!canSearch || loading}
              className={cn('btn-primary flex items-center gap-2 text-sm', (!canSearch || loading) && 'opacity-50 cursor-not-allowed')}
              title={!canSearch ? 'Selecciona una región primero' : undefined}
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {loading ? 'Buscando…' : 'Consultar'}
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
        </div>
      )}

      {/* Resultados */}
      {searched && !error && !loading && (
        <>
          {/* Cabecera de resultados */}
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              {projects.length === 0
                ? 'Sin proyectos con los filtros aplicados'
                : selectedMapId
                ? `1 proyecto seleccionado · ${projects.length} encontrados`
                : `${projects.length} proyecto${projects.length !== 1 ? 's' : ''} encontrado${projects.length !== 1 ? 's' : ''}`
              }
            </p>

            {projects.length > 0 && mapProjects.length > 0 && (
              <div className="flex items-center gap-2 flex-shrink-0">
                {selectedMapId && (
                  <button
                    onClick={() => setSelectedMapId(null)}
                    className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                  >
                    <X className="h-3 w-3" /> Limpiar selección
                  </button>
                )}
                <button
                  onClick={() => setShowMap(v => !v)}
                  className={cn(
                    'flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors',
                    showMap
                      ? 'bg-brand-primary text-white border-brand-primary'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-brand-primary hover:text-brand-primary'
                  )}
                >
                  <Map className="h-3.5 w-3.5" />
                  {showMap ? 'Ocultar mapa' : 'Ver mapa'}
                </button>
              </div>
            )}
          </div>

          {/* Mapa */}
          {showMap && mapProjects.length > 0 && (
            <ProjectMap
              projects={mapProjects.map(p => ({ id: p.id, title: p.name, lat: p.hereLat ?? p.lat ?? 0, lng: p.hereLng ?? p.lng ?? 0, hereLat: p.hereLat, hereLng: p.hereLng, source: p.sources[0] ?? '' }))}
              selectedId={selectedMapId}
              onSelect={id => { setSelectedMapId(id); }}
            />
          )}

          {/* Grilla de proyectos */}
          {visibleProjects.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleProjects.map(p => (
                <ExternalProjectCard
                  key={p.id}
                  project={p}
                  onShowUnits={handleProjectClick}
                  onShowCondiciones={setCondicionesProject}
                  onShowCondicionesPdf={(url, name) => setPdfModal({ url, name })}
                />
              ))}
            </div>
          )}

          {projects.length === 0 && (
            <div className="py-16 text-center">
              <Database className="h-10 w-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No se encontraron proyectos con esos filtros</p>
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
            Selecciona una región y presiona <strong>Consultar</strong> para ver proyectos
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
          onClose={() => { setSelectedProject(null); setUnits([]); setUnitsError(null) }}
        />
      )}

      {/* Modal de condiciones comerciales (HTML) */}
      {condicionesProject && (
        <CondicionesModal
          project={condicionesProject}
          onClose={() => setCondicionesProject(null)}
        />
      )}

      {/* Modal PDF de condiciones comerciales AWS */}
      {pdfModal && (
        <PdfModal
          url={pdfModal.url}
          title={pdfModal.name}
          onClose={() => setPdfModal(null)}
        />
      )}
    </div>
  )
}
