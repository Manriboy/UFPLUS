'use client'
// src/components/admin/IrisSearch.tsx

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  Search, RefreshCw, MapPin, Calendar, ChevronDown, ChevronUp,
  Home, AlertCircle, FileText, Percent, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { IRIS_REGIONS } from '@/lib/iris-zones'

// ─── Tipos ───────────────────────────────────────────

interface IrisUnit {
  id: number
  description: string
  tipology: string
  bedrooms: number
  bathrooms: number
  m2: number
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
  images: string[]
  brochure: string | null
  zone: { id: number; name: string } | null
  department: string | null
  status: string | null
  commission: { percent: number; full_value: string } | null
  units: IrisUnit[]
}

// ─── Constantes ──────────────────────────────────────

const TIPOLOGIAS = ['Oficina', 'Estudio', '1D1B', '2D1B', '2D2B', '3D1B', '3D2B', '3D3B']
const PRICE_MAX = 15000
const PRICE_STEP = 50

// ─── DualRangeSlider ─────────────────────────────────

function DualRangeSlider({ values, onChange }: {
  values: [number, number]
  onChange: (v: [number, number]) => void
}) {
  const [minVal, maxVal] = values
  const minPercent = (minVal / PRICE_MAX) * 100
  const maxPercent = (maxVal / PRICE_MAX) * 100

  return (
    <div className="relative h-6 flex items-center select-none">
      {/* Track */}
      <div className="absolute w-full h-1.5 bg-gray-200 rounded-full" />
      {/* Rango activo */}
      <div
        className="absolute h-1.5 bg-brand-primary rounded-full pointer-events-none"
        style={{ left: `${minPercent}%`, width: `${maxPercent - minPercent}%` }}
      />
      {/* Handle mínimo */}
      <input
        type="range"
        min={0}
        max={PRICE_MAX}
        step={PRICE_STEP}
        value={minVal}
        onChange={(e) => {
          const v = Math.min(Number(e.target.value), maxVal - PRICE_STEP)
          onChange([v, maxVal])
        }}
        className="absolute w-full h-1.5 appearance-none bg-transparent cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:pointer-events-auto
          [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
          [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2
          [&::-webkit-slider-thumb]:border-brand-primary [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-grab
          [&::-webkit-slider-thumb]:active:cursor-grabbing"
        style={{ zIndex: minVal > PRICE_MAX - 500 ? 5 : 3, pointerEvents: 'none' }}
      />
      {/* Handle máximo */}
      <input
        type="range"
        min={0}
        max={PRICE_MAX}
        step={PRICE_STEP}
        value={maxVal}
        onChange={(e) => {
          const v = Math.max(Number(e.target.value), minVal + PRICE_STEP)
          onChange([minVal, v])
        }}
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

// ─── MultiSelect genérico ─────────────────────────────

function MultiSelect({ options, selected, onChange, placeholder, disabled }: {
  options: { id: number; name: string }[]
  selected: number[]
  onChange: (ids: number[]) => void
  placeholder: string
  disabled?: boolean
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

  const toggle = (id: number) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])
  }

  const label = selected.length === 0
    ? placeholder
    : selected.length === 1
      ? options.find((o) => o.id === selected[0])?.name ?? `1 seleccionada`
      : `${selected.length} seleccionadas`

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full input-field flex items-center justify-between text-sm text-left transition-colors',
          disabled && 'opacity-50 cursor-not-allowed bg-gray-50',
          selected.length > 0 ? 'text-gray-900' : 'text-gray-400'
        )}
      >
        <span className="truncate">{label}</span>
        <ChevronDown className={cn('h-4 w-4 text-gray-400 flex-shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && !disabled && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {options.length === 0 ? (
            <p className="text-xs text-gray-400 px-3 py-2">Sin opciones</p>
          ) : (
            <>
              {selected.length > 0 && (
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-50 border-b border-gray-100"
                >
                  Limpiar selección
                </button>
              )}
              {options.map((opt) => (
                <label key={opt.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.includes(opt.id)}
                    onChange={() => toggle(opt.id)}
                    className="h-4 w-4 rounded border-gray-300 text-brand-primary flex-shrink-0"
                  />
                  <span className="text-sm text-gray-700">{opt.name}</span>
                </label>
              ))}
            </>
          )}
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
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const toggle = (t: string) => {
    onChange(selected.includes(t) ? selected.filter((x) => x !== t) : [...selected, t])
  }

  const label = selected.length === 0
    ? 'Todas las tipologías'
    : selected.length === 1
      ? selected[0]
      : `${selected.length} tipologías`

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full input-field flex items-center justify-between text-sm text-left',
          selected.length > 0 ? 'text-gray-900' : 'text-gray-400'
        )}
      >
        <span className="truncate">{label}</span>
        <ChevronDown className={cn('h-4 w-4 text-gray-400 flex-shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-50 border-b border-gray-100"
            >
              Limpiar selección
            </button>
          )}
          <div className="grid grid-cols-2 p-1">
            {TIPOLOGIAS.map((t) => (
              <label key={t} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.includes(t)}
                  onChange={() => toggle(t)}
                  className="h-3.5 w-3.5 rounded border-gray-300 text-brand-primary"
                />
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

function priceRange(units: IrisUnit[]) {
  const prices = units.map((u) => u.final_price || u.price).filter((p) => p > 0)
  if (!prices.length) return null
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  return min === max
    ? `${min.toLocaleString('es-CL')} UF`
    : `${min.toLocaleString('es-CL')} – ${max.toLocaleString('es-CL')} UF`
}

function bedroomTags(units: IrisUnit[]) {
  const types = Array.from(new Set(units.map((u) => u.bedrooms))).sort((a, b) => a - b)
  return types.map((b) => (b === 0 ? 'Estudio' : `${b} dorm.`))
}

function ProjectCard({ project }: { project: IrisProject }) {
  const [expanded, setExpanded] = useState(false)
  const range = priceRange(project.units)
  const tags = bedroomTags(project.units)

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
            <span className="bg-white/90 text-gray-700 text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-sm">
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
          <span>{project.address}{project.zone ? ` · ${project.zone.name}` : ''}</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
          <Calendar className="h-3 w-3 flex-shrink-0" />
          <span>{project.handover_date_text}</span>
        </div>

        <div className="flex gap-1.5 flex-wrap mb-3">
          {tags.map((t) => (
            <span key={t} className="text-[10px] font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {t}
            </span>
          ))}
        </div>

        {range && <div className="text-sm font-bold text-brand-primary mb-3">{range}</div>}

        {project.commission && (
          <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-1.5 rounded-lg mb-3">
            <Percent className="h-3 w-3 flex-shrink-0" />
            <span className="font-medium">Comisión: {project.commission.full_value}</span>
          </div>
        )}

        {project.brochure && (
          <a
            href={project.brochure}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-brand-primary hover:underline mb-3"
          >
            <FileText className="h-3 w-3" />
            Brochure
          </a>
        )}

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
                        <td className="px-3 py-1.5 text-gray-600">{u.bedrooms}D/{u.bathrooms}B</td>
                        <td className="px-3 py-1.5 text-right text-gray-600">{u.m2.toFixed(1)}</td>
                        <td className="px-3 py-1.5 text-right font-semibold text-brand-primary">
                          {(u.final_price || u.price).toLocaleString('es-CL')}
                        </td>
                        <td className="px-3 py-1.5 text-gray-500">{u.floor || '—'}</td>
                        <td className="px-3 py-1.5 text-gray-500 max-w-[80px] truncate">{u.orientation || '—'}</td>
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

// ─── Componente principal ─────────────────────────────

export default function IrisSearch() {
  // Resultados
  const [projects, setProjects] = useState<IrisProject[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')

  // Filtros
  const [regionId, setRegionId] = useState<number | ''>('')
  const [zoneIds, setZoneIds] = useState<number[]>([])
  const [tipologias, setTipologias] = useState<string[]>([])
  const [priceRange, setPriceRange] = useState<[number, number]>([0, PRICE_MAX])
  const [bonoPieMin, setBonoPieMin] = useState<string>('')

  const selectedRegion = IRIS_REGIONS.find((r) => r.id === regionId)
  const totalPages = Math.ceil(total / 12)
  const canSearch = regionId !== '' && zoneIds.length > 0

  // Al cambiar región, limpiar comunas seleccionadas
  const handleRegionChange = (id: number | '') => {
    setRegionId(id)
    setZoneIds([])
  }

  const search = useCallback(async (p: number = 1) => {
    if (!canSearch) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/iris/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page: p,
          filter: {
            project_status: [1, 2, 3],
            zone_ids: zoneIds,
            tipologias: tipologias.length > 0 ? tipologias : undefined,
            price_min: priceRange[0] > 0 ? priceRange[0] : undefined,
            price_max: priceRange[1] < PRICE_MAX ? priceRange[1] : undefined,
            pie_bonus_min: bonoPieMin ? parseFloat(bonoPieMin) : undefined,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al consultar Iris'); return }
      setProjects(data.projects ?? [])
      setTotal(data.total ?? 0)
      setPage(p)
      setSearched(true)
    } catch {
      setError('Error de red al conectar con Iris')
    } finally {
      setLoading(false)
    }
  }, [canSearch, zoneIds, tipologias, priceRange, bonoPieMin])

  const handlePriceInput = (side: 'min' | 'max', raw: string) => {
    const v = Math.max(0, Math.min(PRICE_MAX, parseInt(raw) || 0))
    if (side === 'min') setPriceRange([Math.min(v, priceRange[1] - PRICE_STEP), priceRange[1]])
    else setPriceRange([priceRange[0], Math.max(v, priceRange[0] + PRICE_STEP)])
  }

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Consulta Iris</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Stock disponible en iris.yapo.cl{total > 0 && ` · ${total} proyectos encontrados`}
        </p>
      </div>

      {/* Panel de filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">

        {/* Fila 1: Región + Comunas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Región <span className="text-red-400">*</span>
            </label>
            <select
              value={regionId}
              onChange={(e) => handleRegionChange(e.target.value === '' ? '' : Number(e.target.value))}
              className="input-field text-sm"
            >
              <option value="">Seleccionar región…</option>
              {IRIS_REGIONS.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Comunas <span className="text-red-400">*</span>
              {zoneIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setZoneIds([])}
                  className="ml-2 text-red-400 hover:text-red-600"
                >
                  <X className="h-3 w-3 inline" />
                </button>
              )}
            </label>
            <MultiSelect
              options={selectedRegion?.zones ?? []}
              selected={zoneIds}
              onChange={setZoneIds}
              placeholder={regionId === '' ? 'Selecciona una región primero' : 'Seleccionar comunas…'}
              disabled={regionId === ''}
            />
          </div>
        </div>

        {/* Fila 2: Tipología + Bono Pie */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Tipología</label>
            <TipologiaSelect selected={tipologias} onChange={setTipologias} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Bono pie mínimo (%)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={bonoPieMin}
                onChange={(e) => setBonoPieMin(e.target.value)}
                placeholder="Ej: 5"
                className="input-field text-sm w-28"
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

        {/* Fila 3: Precio */}
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
              <input
                type="number"
                min={0}
                max={PRICE_MAX}
                step={PRICE_STEP}
                value={priceRange[0]}
                onChange={(e) => handlePriceInput('min', e.target.value)}
                className="input-field text-sm text-right"
              />
              <span className="text-xs text-gray-400">UF</span>
            </div>
            <span className="text-gray-300">—</span>
            <div className="flex items-center gap-1.5 flex-1">
              <span className="text-xs text-gray-500 whitespace-nowrap">Máx.</span>
              <input
                type="number"
                min={0}
                max={PRICE_MAX}
                step={PRICE_STEP}
                value={priceRange[1]}
                onChange={(e) => handlePriceInput('max', e.target.value)}
                className="input-field text-sm text-right"
              />
              <span className="text-xs text-gray-400">UF</span>
            </div>
            {(priceRange[0] > 0 || priceRange[1] < PRICE_MAX) && (
              <button
                type="button"
                onClick={() => setPriceRange([0, PRICE_MAX])}
                className="text-gray-400 hover:text-gray-600"
                title="Limpiar precio"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Botón consultar */}
        <div className="flex items-center justify-between pt-1 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            {!canSearch ? (
              <span className="text-amber-600">Selecciona región y al menos una comuna para consultar</span>
            ) : (
              <span className="text-green-600">Listo para consultar</span>
            )}
          </p>
          <button
            onClick={() => search(1)}
            disabled={loading || !canSearch}
            className={cn(
              'btn-primary flex items-center gap-2 text-sm',
              (!canSearch || loading) && 'opacity-50 cursor-not-allowed'
            )}
          >
            {loading
              ? <RefreshCw className="h-4 w-4 animate-spin" />
              : <Search className="h-4 w-4" />}
            {loading ? 'Consultando Iris…' : 'Consultar'}
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
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {projects.length === 0
                ? 'Sin proyectos con los filtros aplicados'
                : `Página ${page} de ${totalPages} · ${total} proyectos encontrados`}
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

          {projects.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((p) => <ProjectCard key={p.id} project={p} />)}
            </div>
          )}
        </>
      )}

      {/* Estado inicial */}
      {!searched && !loading && (
        <div className="py-24 text-center">
          <Search className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Selecciona región y comunas, luego presiona Consultar</p>
        </div>
      )}
    </div>
  )
}
