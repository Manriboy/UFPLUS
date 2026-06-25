'use client'
import React, { useState, useCallback, useRef, useMemo } from 'react'
import dynamic from 'next/dynamic'
import {
  Search, MapPin, ExternalLink, BedDouble, Bath,
  Maximize2, ChevronLeft, ChevronRight, AlertCircle, Loader2,
  Map, LayoutGrid,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const ProjectMap = dynamic(() => import('./ProjectMap'), { ssr: false })

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
  const apiKey = process.env.NEXT_PUBLIC_HERE_API_KEY

  const fetchSuggestions = useCallback(async (q: string) => {
    if (!q.trim() || !apiKey) return
    setLoading(true)
    try {
      const url = `https://autocomplete.search.hereapi.com/v1/autocomplete?q=${encodeURIComponent(q)}&apiKey=${apiKey}&lang=es&limit=5&in=countryCode:CHL&types=city,area`
      const res  = await fetch(url)
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
    onChange(s.address.city ?? s.address.county ?? s.title)
    setSuggestions([])
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={value}
          onChange={e => handleInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { setSuggestions([]); onSearch() } if (e.key === 'Escape') setSuggestions([]) }}
          placeholder="Ej: Providencia, Las Condes, Santiago..."
          className="input-field pl-9 w-full text-sm"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-gray-400" />}
      </div>
      {suggestions.length > 0 && (
        <div className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {suggestions.map(s => (
            <button key={s.id} type="button" onClick={() => pick(s)}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 border-b last:border-0 border-gray-100 flex items-start gap-2"
            >
              <MapPin className="h-3.5 w-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-gray-800 truncate">{s.address.city ?? s.address.county ?? s.title}</p>
                <p className="text-xs text-gray-400 truncate">{s.address.state ?? s.address.label}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Tipos ─────────────────────────────────────────────────────────────────────
type Listing = {
  id: string; title: string | null; priceCLP: number | null; priceUF: number | null
  thumbnail: string | null; permalink: string | null; commune: string | null
  bedrooms: number | null; bathrooms: number | null; area: number | null
  lat: number | null; lng: number | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const PAGE_SIZE = 20

function fmtUF(v: number | null) {
  if (!v) return null
  return `UF ${v.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}
function fmtCLP(v: number | null) {
  if (!v) return null
  return v.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })
}

// ── MiniCard (sidebar del mapa) ──────────────────────────────────────────────
function MiniCard({ listing, selected, onClick }: { listing: Listing; selected: boolean; onClick: () => void }) {
  return (
    <div onClick={onClick} className={cn(
      'flex gap-3 p-2.5 rounded-lg cursor-pointer transition-all border',
      selected ? 'border-brand-primary bg-brand-primary/5 shadow-sm' : 'border-transparent hover:bg-gray-50'
    )}>
      {listing.thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={listing.thumbnail} alt="" className="w-20 h-16 rounded object-cover flex-shrink-0" loading="lazy" />
      ) : (
        <div className="w-20 h-16 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
          <MapPin className="h-5 w-5 text-gray-300" />
        </div>
      )}
      <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
        <p className="text-xs font-medium text-brand-text line-clamp-1">{listing.title}</p>
        <p className="text-sm font-bold text-brand-primary">{fmtUF(listing.priceUF) ?? fmtCLP(listing.priceCLP)}<span className="text-[10px] font-normal text-gray-400">/mes</span></p>
        <div className="flex gap-2 text-[10px] text-gray-400">
          {listing.bedrooms != null && <span>{listing.bedrooms}D</span>}
          {listing.bathrooms != null && <span>{listing.bathrooms}B</span>}
          {listing.area != null && <span>{listing.area}m²</span>}
          {listing.commune && <span className="ml-auto truncate">{listing.commune}</span>}
        </div>
      </div>
    </div>
  )
}

// ── ListingCard (vista grilla) ───────────────────────────────────────────────
function ListingCard({ listing, selected, onClick }: { listing: Listing; selected: boolean; onClick: () => void }) {
  return (
    <div onClick={onClick} className={cn(
      'bg-white border rounded-lg overflow-hidden cursor-pointer transition-all hover:shadow-md flex flex-col',
      selected ? 'border-brand-primary shadow-md ring-1 ring-brand-primary/30' : 'border-gray-200'
    )}>
      <div className="relative h-40 bg-gray-100 flex-shrink-0 overflow-hidden">
        {listing.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={listing.thumbnail} alt={listing.title ?? ''} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><MapPin className="h-8 w-8 text-gray-300" /></div>
        )}
        {listing.commune && (
          <div className="absolute bottom-2 left-2">
            <span className="bg-black/60 text-white text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
              <MapPin className="h-2.5 w-2.5" /> {listing.commune}
            </span>
          </div>
        )}
      </div>
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <p className="text-sm font-semibold text-brand-text line-clamp-2 leading-snug">{listing.title}</p>
        <div>
          {listing.priceUF != null && <p className="text-base font-bold text-brand-primary">{fmtUF(listing.priceUF)}<span className="text-xs font-normal text-gray-400">/mes</span></p>}
          {listing.priceCLP != null && <p className="text-xs text-gray-400">{fmtCLP(listing.priceCLP)}/mes</p>}
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-gray-500 mt-auto pt-1">
          {listing.bedrooms != null && <span className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" />{listing.bedrooms} dorm.</span>}
          {listing.bathrooms != null && <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" />{listing.bathrooms} baño{listing.bathrooms !== 1 ? 's' : ''}</span>}
          {listing.area != null && <span className="flex items-center gap-1"><Maximize2 className="h-3 w-3" />{listing.area} m²</span>}
        </div>
        {listing.permalink && (
          <a href={listing.permalink} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-xs text-brand-primary hover:underline mt-1">
            Ver en TocToc <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ArriendosSearch() {
  const [zona, setZona]               = useState('')
  const [results, setResults]         = useState<Listing[]>([])
  const [total, setTotal]             = useState(0)
  const [page, setPage]               = useState(1)
  const [loading, setLoading]         = useState(false)
  const [searched, setSearched]       = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [comunaMatch, setComunaMatch] = useState<string | null>(null)
  const [selectedId, setSelectedId]   = useState<string | null>(null)
  const [view, setView]               = useState<'map' | 'grid'>('map')
  const [activeZona, setActiveZona]   = useState('')

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const runSearch = useCallback(async (z: string, p: number) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ zona: z, page: String(p) })
      const res = await fetch(`/api/admin/arriendos?${params}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail ?? data.error ?? `Error ${res.status}`)
      }
      const data = await res.json()
      setResults(data.results ?? [])
      setTotal(data.total ?? 0)
      setComunaMatch(data.comunaMatch ?? null)
      setSearched(true)
    } catch (e: any) {
      setError(e.message ?? 'Error de conexión')
      setResults([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSearch = () => { setActiveZona(zona); setPage(1); setSelectedId(null); runSearch(zona, 1) }
  const handlePage = (p: number) => { setPage(p); setSelectedId(null); runSearch(activeZona, p); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  const mapProjects = useMemo(() =>
    results.filter(r => r.lat && r.lng).map(r => ({
      id: r.id, title: `${fmtUF(r.priceUF) ?? fmtCLP(r.priceCLP)} · ${r.bedrooms ?? '?'}D ${r.area ?? '?'}m²`,
      lat: r.lat!, lng: r.lng!, source: 'toctoc',
    })),
    [results]
  )

  const selectedListing = results.find(r => r.id === selectedId)

  return (
    <div className="flex flex-col gap-0">
      {/* ── Barra de búsqueda ────────────────────────────────────────── */}
      <div className="px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-medium text-gray-600 mb-1">Comuna</label>
            <ZonaAutocomplete value={zona} onChange={setZona} onSearch={handleSearch} />
          </div>
          <div className="flex items-end gap-2">
            <button onClick={handleSearch} disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-primary text-white text-sm font-medium hover:bg-brand-primary-dark transition-colors disabled:opacity-60 whitespace-nowrap h-[42px]">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Buscar
            </button>
            {searched && (
              <div className="flex border border-gray-200 rounded overflow-hidden h-[42px]">
                <button onClick={() => setView('map')} className={cn('px-3 flex items-center', view === 'map' ? 'bg-brand-primary text-white' : 'bg-white text-gray-500 hover:bg-gray-50')}>
                  <Map className="h-4 w-4" />
                </button>
                <button onClick={() => setView('grid')} className={cn('px-3 flex items-center', view === 'grid' ? 'bg-brand-primary text-white' : 'bg-white text-gray-500 hover:bg-gray-50')}>
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Estado inicial ───────────────────────────────────────────── */}
      {!searched && !loading && (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <Search className="h-10 w-10 mb-3 opacity-30" />
          <p className="text-sm font-medium">Ingresa una comuna y presiona Buscar</p>
          <p className="text-xs mt-1 opacity-70">Arriendos de departamentos en Región Metropolitana vía TocToc</p>
        </div>
      )}

      {/* ── Error ────────────────────────────────────────────────────── */}
      {error && (
        <div className="mx-6 mt-4 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Error de conexión</p>
            <p className="text-xs mt-0.5 font-mono break-all">{error}</p>
          </div>
        </div>
      )}

      {/* ── Resultados ───────────────────────────────────────────────── */}
      {searched && !error && (
        <>
          {/* Counter */}
          <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/50">
            <p className="text-sm text-gray-600">
              {loading ? (
                <span className="flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Buscando...</span>
              ) : (
                <><span className="font-semibold text-brand-text">{total.toLocaleString('es-CL')}</span> departamentos
                  {comunaMatch && <span className="text-gray-400"> en {comunaMatch}</span>}
                  {!comunaMatch && activeZona && <span className="text-gray-400"> en Región Metropolitana</span>}
                </>
              )}
            </p>
          </div>

          {/* ── MAP VIEW ─────────────────────────────────────────────── */}
          {view === 'map' && results.length > 0 && (
            <div className="flex flex-col lg:flex-row" style={{ height: 'calc(100vh - 220px)' }}>
              {/* Lista lateral */}
              <div className="w-full lg:w-80 xl:w-96 border-r border-gray-200 overflow-y-auto flex-shrink-0 bg-white">
                <div className="p-2 space-y-0.5">
                  {results.map(listing => (
                    <MiniCard
                      key={listing.id}
                      listing={listing}
                      selected={selectedId === listing.id}
                      onClick={() => setSelectedId(listing.id === selectedId ? null : listing.id)}
                    />
                  ))}
                </div>
                {/* Paginación en sidebar */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 py-3 border-t border-gray-100">
                    <button onClick={() => handlePage(page - 1)} disabled={page <= 1 || loading}
                      className="px-2 py-1 text-xs border rounded disabled:opacity-30"><ChevronLeft className="h-3 w-3" /></button>
                    <span className="text-xs text-gray-500">{page} / {totalPages}</span>
                    <button onClick={() => handlePage(page + 1)} disabled={page >= totalPages || loading}
                      className="px-2 py-1 text-xs border rounded disabled:opacity-30"><ChevronRight className="h-3 w-3" /></button>
                  </div>
                )}
                {/* Detalle del seleccionado */}
                {selectedListing?.permalink && (
                  <div className="p-3 border-t border-gray-100">
                    <a href={selectedListing.permalink} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 w-full justify-center px-4 py-2 bg-brand-primary text-white text-xs font-medium rounded hover:bg-brand-primary-dark transition-colors">
                      Ver en TocToc <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
              {/* Mapa */}
              <div className="flex-1 min-h-[400px]">
                <ProjectMap
                  projects={mapProjects}
                  selectedId={selectedId}
                  onSelect={id => setSelectedId(id === selectedId ? null : id)}
                />
              </div>
            </div>
          )}

          {/* ── GRID VIEW ────────────────────────────────────────────── */}
          {view === 'grid' && results.length > 0 && (
            <div className="px-6 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {results.map(listing => (
                  <ListingCard key={listing.id} listing={listing}
                    selected={selectedId === listing.id}
                    onClick={() => setSelectedId(listing.id === selectedId ? null : listing.id)} />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-8 pb-4">
                  <button onClick={() => handlePage(page - 1)} disabled={page <= 1 || loading}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 transition-colors">
                    <ChevronLeft className="h-4 w-4" /> Anterior
                  </button>
                  <span className="text-sm text-gray-600">Página <span className="font-semibold">{page}</span> de <span className="font-semibold">{totalPages}</span></span>
                  <button onClick={() => handlePage(page + 1)} disabled={page >= totalPages || loading}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 transition-colors">
                    Siguiente <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {results.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <MapPin className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">No se encontraron departamentos en esa comuna</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
