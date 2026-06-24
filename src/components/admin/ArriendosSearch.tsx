'use client'
// src/components/admin/ArriendosSearch.tsx
import { useState, useCallback, useMemo, useRef } from 'react'
import dynamic from 'next/dynamic'
import {
  Search, MapPin, ExternalLink, Map, BedDouble, Bath,
  Maximize2, ChevronLeft, ChevronRight, AlertCircle, Loader2, KeyRound,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

// ── HERE Autocomplete ─────────────────────────────────────────────────────────
type HereSuggestion = {
  id: string
  title: string
  address: { label: string; city?: string; county?: string; state?: string }
}

function ZonaAutocomplete({ value, onChange, onSearch }: {
  value: string
  onChange: (v: string) => void
  onSearch: () => void
}) {
  const [suggestions, setSuggestions] = useState<HereSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const apiKey = process.env.NEXT_PUBLIC_HERE_API_KEY

  const fetchSuggestions = useCallback(async (q: string) => {
    if (!q.trim() || !apiKey) return
    setLoading(true)
    try {
      const url = `https://autocomplete.search.hereapi.com/v1/autocomplete?q=${encodeURIComponent(q)}&apiKey=${apiKey}&lang=es&limit=5&in=countryCode:CHL&types=city,area`
      const res = await fetch(url)
      const json = await res.json()
      setSuggestions(json.items ?? [])
    } catch { setSuggestions([]) } finally { setLoading(false) }
  }, [apiKey])

  const handleInput = (v: string) => {
    onChange(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (v.length >= 2) debounceRef.current = setTimeout(() => fetchSuggestions(v), 350)
    else setSuggestions([])
  }

  const pick = (s: HereSuggestion) => {
    // Usar el nombre de la ciudad/commune, no el título completo de HERE ("Chile, 7550000, Las Condes")
    const cleanName = s.address.city ?? s.address.county ?? s.title
    onChange(cleanName)
    setSuggestions([])
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { setSuggestions([]); onSearch() }
    if (e.key === 'Escape') setSuggestions([])
  }

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={value}
          onChange={e => handleInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ej: Providencia, Las Condes..."
          className="input-field pl-9 w-full text-sm"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-gray-400" />}
      </div>

      {suggestions.length > 0 && (
        <div className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {suggestions.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => pick(s)}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 border-b last:border-0 border-gray-100 flex items-start gap-2"
            >
              <MapPin className="h-3.5 w-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-gray-800 truncate">
                  {s.address.city ?? s.address.county ?? s.title}
                </p>
                <p className="text-xs text-gray-400 truncate">{s.address.state ?? s.address.label}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const ProjectMap = dynamic(() => import('./ProjectMap'), { ssr: false })

// ── Normalizar resultados ML ──────────────────────────────────────────────────
type MlAttribute = { id: string; value_name: string | null }
type MlRawResult = {
  id: string; title: string; price: number; currency_id: string
  thumbnail: string; permalink: string
  location?: { latitude?: number; longitude?: number }
  address?: { neighborhood_name?: string; city_name?: string }
  attributes: MlAttribute[]
}

function getAttribute(attrs: MlAttribute[], id: string) {
  return attrs.find(a => a.id === id)?.value_name ?? null
}
function parseArea(v: string | null): number | null {
  if (!v) return null
  const n = parseFloat(v.replace(/[^\d.]/g, ''))
  return isNaN(n) ? null : n
}
function normalizeListing(item: MlRawResult): Listing {
  const attrs = item.attributes ?? []
  return {
    id: item.id, title: item.title, price: item.price, currencyId: item.currency_id,
    thumbnail: item.thumbnail, permalink: item.permalink,
    commune:     item.address?.neighborhood_name ?? item.address?.city_name ?? null,
    bedrooms:    parseInt(getAttribute(attrs, 'BEDROOMS') ?? '') || null,
    bathrooms:   parseInt(getAttribute(attrs, 'BATHROOMS') ?? '') || null,
    coveredArea: parseArea(getAttribute(attrs, 'COVERED_AREA')),
    totalArea:   parseArea(getAttribute(attrs, 'TOTAL_AREA')),
    floor:       getAttribute(attrs, 'FLOOR'),
    lat:         item.location?.latitude ?? null,
    lng:         item.location?.longitude ?? null,
  }
}

// ── Tipos ─────────────────────────────────────────────────────────────────────
type Listing = {
  id: string
  title: string
  price: number
  currencyId: string
  thumbnail: string
  permalink: string
  commune: string | null
  bedrooms: number | null
  bathrooms: number | null
  coveredArea: number | null
  totalArea: number | null
  floor: string | null
  lat: number | null
  lng: number | null
}

type SearchState = {
  zona: string
  dormitorios: number
  banos: number
  precioMin: number
  precioMax: number
}

// ── Constantes ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 48
const PRECIO_MAX = 3_000_000
const PRECIO_STEP = 50_000

const DORMITORIOS_OPTIONS = [
  { value: 0, label: 'Todos' },
  { value: 1, label: '1+' },
  { value: 2, label: '2+' },
  { value: 3, label: '3+' },
  { value: 4, label: '4+' },
]

const BANOS_OPTIONS = [
  { value: 0, label: 'Todos' },
  { value: 1, label: '1+' },
  { value: 2, label: '2+' },
  { value: 3, label: '3+' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatCLP(value: number) {
  return value.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })
}

function formatArea(m2: number | null) {
  if (!m2) return null
  return `${Math.round(m2)} m²`
}

// ── DualRangeSlider ───────────────────────────────────────────────────────────
function DualRangeSlider({ values, onChange }: {
  values: [number, number]
  onChange: (v: [number, number]) => void
}) {
  const [minVal, maxVal] = values
  const minPct = (minVal / PRECIO_MAX) * 100
  const maxPct = (maxVal / PRECIO_MAX) * 100

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-gray-500">
        <span>{minVal === 0 ? 'Sin mín.' : formatCLP(minVal)}</span>
        <span>{maxVal === PRECIO_MAX ? 'Sin máx.' : formatCLP(maxVal)}</span>
      </div>
      <div className="relative h-6 flex items-center select-none">
        <div className="absolute w-full h-1.5 bg-gray-200 rounded-full" />
        <div
          className="absolute h-1.5 bg-brand-primary rounded-full pointer-events-none"
          style={{ left: `${minPct}%`, width: `${maxPct - minPct}%` }}
        />
        <input
          type="range" min={0} max={PRECIO_MAX} step={PRECIO_STEP} value={minVal}
          onChange={e => onChange([Math.min(Number(e.target.value), maxVal - PRECIO_STEP), maxVal])}
          className="absolute w-full h-1.5 appearance-none bg-transparent cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:pointer-events-auto
            [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2
            [&::-webkit-slider-thumb]:border-brand-primary [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-grab"
          style={{ zIndex: minVal > PRECIO_MAX - 100_000 ? 5 : 3, pointerEvents: 'none' }}
        />
        <input
          type="range" min={0} max={PRECIO_MAX} step={PRECIO_STEP} value={maxVal}
          onChange={e => onChange([minVal, Math.max(Number(e.target.value), minVal + PRECIO_STEP)])}
          className="absolute w-full h-1.5 appearance-none bg-transparent cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:pointer-events-auto
            [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2
            [&::-webkit-slider-thumb]:border-brand-primary [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-grab"
          style={{ zIndex: 4, pointerEvents: 'none' }}
        />
      </div>
    </div>
  )
}

// ── ListingCard ───────────────────────────────────────────────────────────────
function ListingCard({ listing, selected, onClick }: {
  listing: Listing
  selected: boolean
  onClick: () => void
}) {
  const isCLF = listing.currencyId === 'CLF'
  const priceLabel = isCLF
    ? `UF ${listing.price.toLocaleString('es-CL', { maximumFractionDigits: 2 })}`
    : formatCLP(listing.price)

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white border rounded-lg overflow-hidden cursor-pointer transition-all hover:shadow-md flex flex-col',
        selected ? 'border-brand-primary shadow-md ring-1 ring-brand-primary/30' : 'border-gray-200'
      )}
    >
      {/* Imagen */}
      <div className="relative h-40 bg-gray-100 flex-shrink-0 overflow-hidden">
        {listing.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.thumbnail}
            alt={listing.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MapPin className="h-8 w-8 text-gray-300" />
          </div>
        )}
        {listing.commune && (
          <div className="absolute bottom-2 left-2">
            <span className="bg-black/60 text-white text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
              <MapPin className="h-2.5 w-2.5" /> {listing.commune}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <p className="text-sm font-semibold text-brand-text line-clamp-2 leading-snug">{listing.title}</p>

        <p className="text-base font-bold text-brand-primary">{priceLabel}</p>

        {/* Atributos */}
        <div className="flex flex-wrap gap-2 text-xs text-gray-500 mt-auto pt-1">
          {listing.bedrooms != null && (
            <span className="flex items-center gap-1">
              <BedDouble className="h-3.5 w-3.5" /> {listing.bedrooms} dorm.
            </span>
          )}
          {listing.bathrooms != null && (
            <span className="flex items-center gap-1">
              <Bath className="h-3.5 w-3.5" /> {listing.bathrooms} baño{listing.bathrooms !== 1 ? 's' : ''}
            </span>
          )}
          {listing.coveredArea && (
            <span className="flex items-center gap-1">
              <Maximize2 className="h-3 w-3" /> {formatArea(listing.coveredArea)}
            </span>
          )}
          {listing.floor && (
            <span>Piso {listing.floor}</span>
          )}
        </div>

        {/* Link */}
        <a
          href={listing.permalink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="inline-flex items-center gap-1 text-xs text-brand-primary hover:underline mt-1"
        >
          Ver en Portal Inmobiliario <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ArriendosSearch() {
  const INITIAL: SearchState = { zona: '', dormitorios: 0, banos: 0, precioMin: 0, precioMax: PRECIO_MAX }
  const [filters, setFilters] = useState<SearchState>(INITIAL)
  const [pendingFilters, setPendingFilters] = useState<SearchState>(INITIAL)
  const [results, setResults] = useState<Listing[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notConnected, setNotConnected] = useState(false)
  const [showMap, setShowMap] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const mlTokenRef = useRef<string | null>(null)

  const totalPages = Math.ceil(total / PAGE_SIZE)

  // Obtiene el token ML desde nuestro backend (con refresh automático)
  const getToken = useCallback(async (): Promise<string | null> => {
    if (mlTokenRef.current) return mlTokenRef.current
    const res = await fetch('/api/admin/ml/token')
    if (res.status === 403) { setNotConnected(true); return null }
    if (!res.ok) return null
    const data = await res.json()
    mlTokenRef.current = data.token
    return data.token
  }, [])

  // La búsqueda va directo al browser → ML (servidor bloqueado por ML)
  const runSearch = useCallback(async (f: SearchState, p: number) => {
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) return

      const queryParts = ['arriendo departamento']
      if (f.zona)            queryParts.push(f.zona)
      if (f.dormitorios > 0) queryParts.push(`${f.dormitorios} dormitorios`)
      if (f.banos > 0)       queryParts.push(`${f.banos} baños`)

      const params = new URLSearchParams({
        category: 'MLC1459',
        q:        queryParts.join(' '),
        limit:    String(PAGE_SIZE),
        offset:   String(p * PAGE_SIZE),
      })
      if (f.precioMin > 0)          params.set('price_from', String(f.precioMin))
      if (f.precioMax < PRECIO_MAX) params.set('price_to',   String(f.precioMax))

      const res = await fetch(`https://api.mercadolibre.com/sites/MLC/search?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        const detail = await res.text().catch(() => '')
        console.error('[arriendos] ML search error:', res.status, detail)
        throw new Error(`ML ${res.status}: ${detail.slice(0, 120)}`)
      }

      const data = await res.json()
      setNotConnected(false)
      setResults((data.results ?? []).map(normalizeListing))
      setTotal(data.paging?.total ?? 0)
      setSearched(true)
    } catch (e: any) {
      setError(e.message ?? 'Error de conexión')
      setResults([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [getToken])

  const handleSearch = () => {
    setFilters(pendingFilters)
    setPage(0)
    setSelectedId(null)
    runSearch(pendingFilters, 0)
  }

  const handlePage = (newPage: number) => {
    setPage(newPage)
    setSelectedId(null)
    runSearch(filters, newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const mapProjects = useMemo(() =>
    results
      .filter(r => r.lat && r.lng)
      .map(r => ({
        id: r.id,
        title: r.title,
        lat: r.lat!,
        lng: r.lng!,
        source: 'ml',
      })),
    [results]
  )

  return (
    <div className="flex flex-col gap-0">
      {/* ── Barra de filtros ─────────────────────────────────────────────────── */}
      <div className="px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Zona */}
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-medium text-gray-600 mb-1">Zona / Comuna</label>
            <ZonaAutocomplete
              value={pendingFilters.zona}
              onChange={v => setPendingFilters(p => ({ ...p, zona: v }))}
              onSearch={handleSearch}
            />
          </div>

          {/* Dormitorios */}
          <div className="w-full lg:w-36">
            <label className="block text-xs font-medium text-gray-600 mb-1">Dormitorios</label>
            <select
              value={pendingFilters.dormitorios}
              onChange={e => setPendingFilters(p => ({ ...p, dormitorios: Number(e.target.value) }))}
              className="input-field w-full text-sm"
            >
              {DORMITORIOS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Baños */}
          <div className="w-full lg:w-32">
            <label className="block text-xs font-medium text-gray-600 mb-1">Baños</label>
            <select
              value={pendingFilters.banos}
              onChange={e => setPendingFilters(p => ({ ...p, banos: Number(e.target.value) }))}
              className="input-field w-full text-sm"
            >
              {BANOS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Precio */}
          <div className="w-full lg:w-64">
            <label className="block text-xs font-medium text-gray-600 mb-1">Precio mensual (CLP)</label>
            <DualRangeSlider
              values={[pendingFilters.precioMin, pendingFilters.precioMax]}
              onChange={([min, max]) => setPendingFilters(p => ({ ...p, precioMin: min, precioMax: max }))}
            />
          </div>

          {/* Botón buscar */}
          <div className="flex items-end">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-primary text-white text-sm font-medium hover:bg-brand-primary-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap h-[42px]"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Buscar
            </button>
          </div>
        </div>
      </div>

      {/* ── Cuenta no conectada ──────────────────────────────────────────────── */}
      {notConnected && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-6">
          <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center">
            <KeyRound className="h-7 w-7 text-amber-500" />
          </div>
          <div>
            <p className="font-semibold text-brand-text">Cuenta de Mercado Libre no conectada</p>
            <p className="text-sm text-gray-500 mt-1">Necesitas autorizar el acceso una sola vez para poder buscar arriendos.</p>
          </div>
          <Link
            href="/admin/arriendos/conectar"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-primary text-white text-sm font-medium hover:bg-brand-primary-dark transition-colors"
          >
            <KeyRound className="h-4 w-4" /> Conectar cuenta
          </Link>
        </div>
      )}

      {/* ── Estado inicial ───────────────────────────────────────────────────── */}
      {!notConnected && !searched && !loading && (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <Search className="h-10 w-10 mb-3 opacity-30" />
          <p className="text-sm font-medium">Ingresa una zona y presiona Buscar</p>
          <p className="text-xs mt-1">Los resultados se obtienen en tiempo real desde Portal Inmobiliario</p>
        </div>
      )}

      {/* ── Error ────────────────────────────────────────────────────────────── */}
      {error && (
        <div className="mx-6 mt-4 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Error de conexión</p>
            <p className="text-xs mt-0.5 font-mono break-all">{error}</p>
          </div>
        </div>
      )}

      {/* ── Resultados + mapa ────────────────────────────────────────────────── */}
      {!notConnected && searched && !error && (
        <>
          {/* Barra de resultados */}
          <div className="px-6 py-3 flex items-center justify-between border-b border-gray-100 bg-gray-50/50">
            <p className="text-sm text-gray-600">
              {loading ? (
                <span className="flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Buscando...</span>
              ) : (
                <><span className="font-semibold text-brand-text">{total.toLocaleString('es-CL')}</span> departamentos encontrados</>
              )}
            </p>
            {mapProjects.length > 0 && (
              <button
                onClick={() => setShowMap(v => !v)}
                className="flex items-center gap-1.5 text-xs text-brand-primary hover:underline"
              >
                <Map className="h-3.5 w-3.5" />
                {showMap ? 'Ocultar mapa' : 'Ver mapa'}
              </button>
            )}
          </div>

          {/* Mapa */}
          {showMap && mapProjects.length > 0 && (
            <div className="px-6 pt-4 pb-2">
              <div className="rounded-lg overflow-hidden border border-gray-200 h-72">
                <ProjectMap
                  projects={mapProjects}
                  selectedId={selectedId}
                  onSelect={id => setSelectedId(id === selectedId ? null : id)}
                />
              </div>
            </div>
          )}

          {/* Grid de resultados */}
          {results.length > 0 ? (
            <div className="px-6 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {results.map(listing => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    selected={selectedId === listing.id}
                    onClick={() => setSelectedId(listing.id === selectedId ? null : listing.id)}
                  />
                ))}
              </div>

              {/* Paginación */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-8 pb-4">
                  <button
                    onClick={() => handlePage(page - 1)}
                    disabled={page === 0 || loading}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" /> Anterior
                  </button>
                  <span className="text-sm text-gray-600">
                    Página <span className="font-semibold">{page + 1}</span> de <span className="font-semibold">{totalPages}</span>
                  </span>
                  <button
                    onClick={() => handlePage(page + 1)}
                    disabled={page >= totalPages - 1 || loading}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Siguiente <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ) : !loading && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <MapPin className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">No se encontraron departamentos con esos filtros</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
