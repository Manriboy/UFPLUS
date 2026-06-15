'use client'
// src/components/admin/UsadosSearch.tsx
import { useState, useEffect, useMemo, useRef } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import {
  Search, X, ChevronDown, Map, MapPin,
  Bed, Bath, Car, Maximize2, Star, Home, ArrowRight, Archive,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const ProjectMap = dynamic(() => import('./ProjectMap'), { ssr: false })

// ─── Tipos ────────────────────────────────────────────

type UsadoCard = {
  id: string
  title: string | null
  commune: string | null
  region: string | null
  price: number | null
  currency: string | null
  bedrooms: number | null
  bathrooms: number | null
  parkingSpots: number | null
  storageRooms: number | null
  sqmTotal: number | null
  sqmTerrace: number | null
  lat: number | null
  lng: number | null
  images: string[]
  isFeatured: boolean
  propertyType: string | null
}

interface Rates { uf: number; dolar: number }

function toUF(price: number | null, currency: string | null, rates: Rates | null): string {
  if (!price) return 'Consultar'
  const curr = currency ?? 'UF'
  if (curr === 'UF') return `${Math.ceil(price).toLocaleString('es-CL')} UF`
  if (!rates) return `${price.toLocaleString('es-CL')} ${curr}`
  let uf: number
  if (curr === 'CLP$') {
    uf = price / rates.uf
  } else if (curr === 'USD$') {
    uf = (price * rates.dolar) / rates.uf
  } else {
    return `${price.toLocaleString('es-CL')} ${curr}`
  }
  return `${Math.ceil(uf).toLocaleString('es-CL')} UF`
}

// ─── Constantes ───────────────────────────────────────

const PRICE_MAX = 15000
const PRICE_STEP = 50
const TIPOLOGIAS = ['Estudio', '1D', '2D', '3D', '4D+']

function matchesTipologia(bedrooms: number | null, filter: string[]): boolean {
  if (filter.length === 0) return true
  if (bedrooms === null) return false
  if (bedrooms === 0) return filter.includes('Estudio')
  if (bedrooms >= 4) return filter.includes('4D+')
  return filter.includes(`${bedrooms}D`)
}

function bedroomsLabel(bedrooms: number | null): string {
  if (bedrooms === null) return ''
  if (bedrooms === 0) return 'Estudio'
  return `${bedrooms}D`
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
  options: string[]
  selected: string[]
  onChange: (v: string[]) => void
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

  const allSelected = options.length > 0 && options.every(o => selected.includes(o))
  const toggleAll = () => onChange(allSelected ? [] : [...options])
  const toggle = (o: string) =>
    onChange(selected.includes(o) ? selected.filter(x => x !== o) : [...selected, o])

  const label = disabled
    ? 'Selecciona una región primero'
    : allSelected
    ? 'Todas las comunas'
    : selected.length === 0
    ? 'Seleccionar comunas...'
    : selected.length === 1
    ? selected[0]
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

// ─── IconTooltip ──────────────────────────────────────

function IconTooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="relative flex items-center gap-1 group/tt">
      {children}
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5 text-[10px] font-medium bg-gray-900 text-white rounded whitespace-nowrap opacity-0 group-hover/tt:opacity-100 pointer-events-none transition-opacity z-20">
        {label}
      </span>
    </span>
  )
}

// ─── TerrazaIcon ──────────────────────────────────────

function TerrazaIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="2"  y1="20" x2="22" y2="20" />
      <line x1="2"  y1="13" x2="22" y2="13" />
      <line x1="5"  y1="13" x2="5"  y2="20" />
      <line x1="19" y1="13" x2="19" y2="20" />
      <line x1="10" y1="13" x2="10" y2="20" />
      <line x1="14" y1="13" x2="14" y2="20" />
      <line x1="12" y1="6"  x2="12" y2="13" />
      <line x1="8"  y1="9"  x2="12" y2="6"  />
      <line x1="16" y1="9"  x2="12" y2="6"  />
    </svg>
  )
}

// ─── PropertyCard ─────────────────────────────────────

function PropertyCard({ p, rates }: { p: UsadoCard; rates: Rates | null }) {
  const mainImage = p.images[0] ?? null
  const title = p.title || `Departamento en ${p.commune ?? p.region ?? 'Chile'}`

  return (
    <Link href={`/usados/${p.id}`} target="_blank" className="group block">
      <article className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full">
        <div className="relative h-44 bg-gray-100 flex-shrink-0">
          {mainImage ? (
            <Image
              src={mainImage}
              alt={title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Home className="h-10 w-10 text-gray-300" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

          {p.propertyType && (
            <div className="absolute top-2 left-2">
              <span className="text-xs font-semibold px-2.5 py-1 bg-white/90 text-gray-700 rounded-sm">
                {p.propertyType}
              </span>
            </div>
          )}
          {p.isFeatured && (
            <div className="absolute top-2 right-2">
              <span className="flex items-center gap-1 bg-brand-primary text-white text-xs font-semibold px-2.5 py-1 rounded-sm">
                <Star className="w-3 h-3 fill-current" />
                Destacado
              </span>
            </div>
          )}
        </div>

        <div className="p-4 flex flex-col flex-1">
          {(p.commune || p.region) && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
              <MapPin className="w-3.5 h-3.5 text-brand-primary shrink-0" />
              <span>{[p.commune, p.region].filter(Boolean).join(', ')}</span>
            </div>
          )}

          <h3 className="font-display text-sm font-bold text-brand-text mb-3 leading-snug group-hover:text-brand-primary transition-colors line-clamp-2">
            {title}
          </h3>

          <div className="flex items-center gap-3 text-xs text-gray-500 mb-3 flex-wrap">
            {p.bedrooms != null && (
              <IconTooltip label="Dormitorios">
                <Bed className="w-3.5 h-3.5" />
                {bedroomsLabel(p.bedrooms) || p.bedrooms}
              </IconTooltip>
            )}
            {p.bathrooms != null && (
              <IconTooltip label="Baños">
                <Bath className="w-3.5 h-3.5" /> {p.bathrooms}
              </IconTooltip>
            )}
            {p.parkingSpots != null && p.parkingSpots > 0 && (
              <IconTooltip label="Estacionamientos">
                <Car className="w-3.5 h-3.5" /> {p.parkingSpots}
              </IconTooltip>
            )}
            {p.storageRooms != null && p.storageRooms > 0 && (
              <IconTooltip label="Bodegas">
                <Archive className="w-3.5 h-3.5" /> {p.storageRooms}
              </IconTooltip>
            )}
            {p.sqmTotal != null && (
              <IconTooltip label="M² totales">
                <Maximize2 className="w-3.5 h-3.5" /> {p.sqmTotal} m²
              </IconTooltip>
            )}
            {p.sqmTerrace != null && p.sqmTerrace > 0 && (
              <IconTooltip label="M² terraza">
                <TerrazaIcon className="w-3.5 h-3.5" />
                {p.sqmTerrace} m²
              </IconTooltip>
            )}
          </div>

          <div className="mt-auto pt-3 border-t border-gray-100 flex items-end justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Precio</p>
              <p className="text-lg font-bold text-brand-primary font-display">
                {toUF(p.price, p.currency, rates)}
              </p>
            </div>
            <span className="flex items-center gap-1 text-xs font-medium text-brand-primary group-hover:gap-2 transition-all">
              Ver publicación
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </article>
    </Link>
  )
}

// ─── Skeleton ─────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
      <div className="h-44 bg-gray-200" />
      <div className="p-4 space-y-2.5">
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-2/3" />
        <div className="h-5 bg-gray-200 rounded w-1/3 mt-4" />
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────

export default function UsadosSearch() {
  const [all, setAll] = useState<UsadoCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rates, setRates] = useState<Rates | null>(null)

  // Filtros
  const [q, setQ] = useState('')
  const [region, setRegion] = useState('')
  const [communes, setCommunes] = useState<string[]>([])
  const [tipologias, setTipologias] = useState<string[]>([])
  const [priceRange, setPriceRange] = useState<[number, number]>([0, PRICE_MAX])
  const [showMap, setShowMap] = useState(true)
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null)

  // Cargar todo en mount
  useEffect(() => {
    Promise.all([
      fetch('/api/admin/usados/stock').then(r => r.json()),
      fetch('/api/indicadores').then(r => r.json()).catch(() => null),
    ]).then(([data, ind]) => {
      if (Array.isArray(data)) setAll(data)
      else setError(data.error ?? 'Error al cargar')
      if (ind?.uf?.valor && ind?.dolar?.valor) {
        setRates({ uf: ind.uf.valor, dolar: ind.dolar.valor })
      }
    }).catch(() => setError('Error de red'))
      .finally(() => setLoading(false))
  }, [])

  // Regiones y comunas derivadas de los datos
  const regions = useMemo(
    () => Array.from(new Set(all.map(p => p.region).filter(Boolean) as string[])).sort(),
    [all]
  )

  const communeOptions = useMemo(
    () => Array.from(new Set(
      all
        .filter(p => !region || p.region === region)
        .map(p => p.commune)
        .filter(Boolean) as string[]
    )).sort(),
    [all, region]
  )

  const handleRegionChange = (r: string) => {
    setRegion(r)
    setCommunes([])
  }

  // Filtrado client-side
  const filtered = useMemo(() => {
    return all.filter(p => {
      if (q.trim()) {
        const needle = q.toLowerCase()
        const haystack = [p.title, p.commune, p.region].filter(Boolean).join(' ').toLowerCase()
        if (!haystack.includes(needle)) return false
      }
      if (region && p.region !== region) return false
      if (communes.length > 0 && !communes.includes(p.commune ?? '')) return false
      if (!matchesTipologia(p.bedrooms, tipologias)) return false
      if (p.currency === 'UF' && p.price !== null) {
        if (p.price < priceRange[0]) return false
        if (priceRange[1] < PRICE_MAX && p.price > priceRange[1]) return false
      }
      return true
    })
  }, [all, q, region, communes, tipologias, priceRange])

  const mapProjects = useMemo(
    () => filtered.filter(p => p.lat !== null && p.lng !== null),
    [filtered]
  )

  const visibleCards = useMemo(
    () => selectedMapId ? filtered.filter(p => p.id === selectedMapId) : filtered,
    [filtered, selectedMapId]
  )

  const priceActive = priceRange[0] > 0 || priceRange[1] < PRICE_MAX
  const hasFilters = q || region || communes.length > 0 || tipologias.length > 0 || priceActive

  const handlePriceInput = (side: 'min' | 'max', raw: string) => {
    const v = Math.max(0, Math.min(PRICE_MAX, parseInt(raw) || 0))
    if (side === 'min') setPriceRange([Math.min(v, priceRange[1] - PRICE_STEP), priceRange[1]])
    else setPriceRange([priceRange[0], Math.max(v, priceRange[0] + PRICE_STEP)])
  }

  const clearFilters = () => {
    setQ('')
    setRegion('')
    setCommunes([])
    setTipologias([])
    setPriceRange([0, PRICE_MAX])
    setSelectedMapId(null)
  }

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Stock usados</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Departamentos publicados y disponibles en la plataforma
            {!loading && all.length > 0 && ` · ${all.length} publicaciones`}
          </p>
        </div>
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 hover:border-gray-300 transition-colors"
          >
            <X className="h-3.5 w-3.5" /> Limpiar filtros
          </button>
        )}
      </div>

      {/* Panel de filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">

        {/* Fila 1: texto */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Buscar</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Nombre, comuna, región..."
              className="input-field pl-9 text-sm w-full"
            />
          </div>
        </div>

        {/* Fila 2: región + comunas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Región</label>
            <select
              value={region}
              onChange={e => handleRegionChange(e.target.value)}
              className="input-field text-sm"
            >
              <option value="">Todas las regiones</option>
              {regions.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Comunas
              {communes.length > 0 && (
                <button type="button" onClick={() => setCommunes([])} className="ml-2 text-red-400 hover:text-red-600">
                  <X className="h-3 w-3 inline" />
                </button>
              )}
            </label>
            <ComunasSelect
              options={communeOptions}
              selected={communes}
              onChange={setCommunes}
              disabled={communeOptions.length === 0}
            />
          </div>
        </div>

        {/* Fila 3: tipología + precio texto */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Tipología</label>
            <TipologiaSelect selected={tipologias} onChange={setTipologias} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Rango precio (UF)</label>
            <div className="flex items-center gap-2">
              <input
                type="number" min={0} max={PRICE_MAX} step={PRICE_STEP}
                value={priceRange[0]}
                onChange={e => handlePriceInput('min', e.target.value)}
                placeholder="Mín."
                className="input-field text-sm w-full text-right"
              />
              <span className="text-gray-300 flex-shrink-0">—</span>
              <input
                type="number" min={0} max={PRICE_MAX} step={PRICE_STEP}
                value={priceRange[1]}
                onChange={e => handlePriceInput('max', e.target.value)}
                placeholder="Máx."
                className="input-field text-sm w-full text-right"
              />
              {priceActive && (
                <button type="button" onClick={() => setPriceRange([0, PRICE_MAX])} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Slider de precio */}
        <div className="px-1">
          <DualRangeSlider values={priceRange} onChange={setPriceRange} />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{priceRange[0] === 0 ? 'Sin mín.' : `${priceRange[0].toLocaleString('es-CL')} UF`}</span>
            <span>{priceRange[1] >= PRICE_MAX ? 'Sin máx.' : `${priceRange[1].toLocaleString('es-CL')} UF`}</span>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Resultados */}
      {!loading && !error && (
        <>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-gray-500">
              {filtered.length === 0
                ? 'Sin publicaciones con los filtros aplicados'
                : selectedMapId
                ? `1 seleccionada · ${filtered.length} encontradas`
                : `${filtered.length} publicación${filtered.length !== 1 ? 'es' : ''} encontrada${filtered.length !== 1 ? 's' : ''}`
              }
            </p>

            {filtered.length > 0 && mapProjects.length > 0 && (
              <div className="flex items-center gap-2">
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
              projects={mapProjects.map(p => ({
                id: p.id,
                title: p.title || `Depto. en ${p.commune ?? p.region ?? 'Chile'}`,
                lat: p.lat!,
                lng: p.lng!,
                hereLat: null,
                hereLng: null,
                source: 'usados',
              }))}
              selectedId={selectedMapId}
              onSelect={id => setSelectedMapId(id)}
            />
          )}

          {/* Grilla */}
          {visibleCards.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleCards.map(p => <PropertyCard key={p.id} p={p} rates={rates} />)}
            </div>
          ) : (
            !hasFilters && all.length === 0 && (
              <div className="py-20 text-center bg-white border border-gray-200 rounded-xl">
                <Home className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm font-semibold text-gray-600">Sin publicaciones disponibles</p>
                <p className="text-xs text-gray-400 mt-1">Aún no hay departamentos aprobados en la plataforma.</p>
              </div>
            )
          )}

          {hasFilters && filtered.length === 0 && (
            <div className="py-16 text-center">
              <Search className="h-10 w-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No se encontraron publicaciones con esos filtros</p>
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
    </div>
  )
}
