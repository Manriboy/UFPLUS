'use client'
import React, { useState, useCallback, useRef, useMemo } from 'react'
import dynamic from 'next/dynamic'
import {
  Search, MapPin, ExternalLink, BedDouble, Bath,
  Maximize2, AlertCircle, Loader2,
  Map, LayoutGrid, RefreshCw, Train,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { METRO_STATIONS } from '@/lib/santiago-metro'

const ProjectMap = dynamic(() => import('./ProjectMap'), { ssr: false })

// ── Coordenadas centrales comunas RM (para "Buscar en esta zona") ─────────────
const COMUNA_COORDS: Record<string, [number, number]> = {
  'Alhué':[-34.028,-71.106],'Buin':[-33.733,-70.742],'Calera de Tango':[-33.637,-70.718],
  'Cerrillos':[-33.494,-70.714],'Cerro Navia':[-33.428,-70.733],'Conchalí':[-33.384,-70.649],
  'El Bosque':[-33.564,-70.670],'El Monte':[-33.683,-71.019],'Estación Central':[-33.467,-70.682],
  'Huechuraba':[-33.365,-70.634],'Independencia':[-33.416,-70.660],'Isla de Maipo':[-33.754,-70.883],
  'La Cisterna':[-33.530,-70.661],'La Florida':[-33.517,-70.588],'La Granja':[-33.537,-70.622],
  'La Pintana':[-33.583,-70.636],'La Reina':[-33.441,-70.541],'Las Condes':[-33.408,-70.567],
  'Lo Barnechea':[-33.352,-70.517],'Lo Espejo':[-33.519,-70.690],'Lo Prado':[-33.444,-70.726],
  'Macul':[-33.490,-70.599],'Maipú':[-33.509,-70.755],'Padre Hurtado':[-33.573,-70.831],
  'Paine':[-33.810,-70.740],'Pedro Aguirre Cerda':[-33.497,-70.679],'Peñaflor':[-33.612,-70.885],
  'Peñalolén':[-33.490,-70.528],'Providencia':[-33.426,-70.611],'Pudahuel':[-33.437,-70.750],
  'Quilicura':[-33.356,-70.730],'Quinta Normal':[-33.426,-70.699],'Recoleta':[-33.402,-70.640],
  'Renca':[-33.397,-70.720],'San Bernardo':[-33.593,-70.700],'San Joaquín':[-33.497,-70.632],
  'San Miguel':[-33.497,-70.652],'San Ramón':[-33.541,-70.644],
  'Santiago':[-33.449,-70.669],'Talagante':[-33.665,-70.928],'Vitacura':[-33.393,-70.580],
  'Ñuñoa':[-33.457,-70.597],
}

function findNearestComuna(lat: number, lng: number): string {
  let best = 'Santiago'
  let bestDist = Infinity
  for (const [name, [clat, clng]] of Object.entries(COMUNA_COORDS)) {
    const d = (clat - lat) ** 2 + (clng - lng) ** 2
    if (d < bestDist) { bestDist = d; best = name }
  }
  return best
}

// ── Autocomplete (comunas + barrios + metro) ──────────────────────────────────
type Suggestion = {
  id: string
  label: string
  sublabel: string
  type: 'comuna' | 'barrio' | 'metro'
  value: string // comuna name to search
}

function searchMetroStations(q: string): Suggestion[] {
  if (q.length < 2) return []
  const lower = q.toLowerCase()
  const seen = new Set<string>()
  return METRO_STATIONS
    .filter(s => s.name.toLowerCase().includes(lower))
    .filter(s => { if (seen.has(s.name)) return false; seen.add(s.name); return true })
    .slice(0, 4)
    .map(s => ({
      id:       `metro-${s.name}-${s.line}`,
      label:    `Metro ${s.name}`,
      sublabel: `${s.line} · ${findNearestComuna(s.lat, s.lng)}`,
      type:     'metro' as const,
      value:    findNearestComuna(s.lat, s.lng),
    }))
}

function ZonaAutocomplete({ value, onChange, onSearch }: {
  value: string; onChange: (v: string) => void; onSearch: () => void
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const apiKey = process.env.NEXT_PUBLIC_HERE_API_KEY

  const fetchSuggestions = useCallback(async (q: string) => {
    if (!q.trim()) return
    setLoading(true)
    try {
      const metroResults = searchMetroStations(q)

      let hereResults: Suggestion[] = []
      if (apiKey) {
        const url = `https://autocomplete.search.hereapi.com/v1/autocomplete?q=${encodeURIComponent(q)}&apiKey=${apiKey}&lang=es&limit=5&in=countryCode:CHL&types=city,area`
        const res = await fetch(url)
        const json = await res.json()
        hereResults = (json.items ?? []).map((s: any) => {
          const name = s.address.city ?? s.address.county ?? s.title
          const isComuna = Object.keys(COMUNA_COORDS).some(c => c.toLowerCase() === name.toLowerCase())
          return {
            id:       s.id,
            label:    name,
            sublabel: s.address.state ?? s.address.label,
            type:     isComuna ? 'comuna' as const : 'barrio' as const,
            value:    name,
          }
        })
      }

      const combined = [...metroResults, ...hereResults].slice(0, 7)
      setSuggestions(combined)
    } catch { setSuggestions([]) } finally { setLoading(false) }
  }, [apiKey])

  const handleInput = (v: string) => {
    onChange(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (v.length >= 2) debounceRef.current = setTimeout(() => fetchSuggestions(v), 350)
    else setSuggestions([])
  }

  const pick = (s: Suggestion) => {
    onChange(s.value)
    setSuggestions([])
  }

  const iconFor = (type: Suggestion['type']) => {
    if (type === 'metro') return <Train className="h-3.5 w-3.5 text-red-500 mt-0.5 flex-shrink-0" />
    if (type === 'barrio') return <MapPin className="h-3.5 w-3.5 text-blue-400 mt-0.5 flex-shrink-0" />
    return <MapPin className="h-3.5 w-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
  }

  const tagFor = (type: Suggestion['type']) => {
    if (type === 'metro') return <span className="text-[9px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">METRO</span>
    if (type === 'barrio') return <span className="text-[9px] font-bold bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">BARRIO</span>
    return null
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input type="text" value={value}
          onChange={e => handleInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { setSuggestions([]); onSearch() } if (e.key === 'Escape') setSuggestions([]) }}
          placeholder="Comuna, barrio o estación de metro..."
          className="input-field pl-9 w-full text-sm" />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-gray-400" />}
      </div>
      {suggestions.length > 0 && (
        <div className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {suggestions.map(s => (
            <button key={s.id} type="button" onClick={() => pick(s)}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 border-b last:border-0 border-gray-100 flex items-start gap-2">
              {iconFor(s.type)}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-800 truncate">{s.label}</p>
                  {tagFor(s.type)}
                </div>
                <p className="text-xs text-gray-400 truncate">{s.sublabel}</p>
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

function fmtCLP(v: number | null) {
  if (!v) return null
  return v.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })
}

const DORM_OPTIONS = [
  { value: 0, label: 'Todos' },
  { value: 1, label: '1+' },
  { value: 2, label: '2+' },
  { value: 3, label: '3+' },
  { value: 4, label: '4+' },
]
const BANO_OPTIONS = [
  { value: 0, label: 'Todos' },
  { value: 1, label: '1+' },
  { value: 2, label: '2+' },
  { value: 3, label: '3+' },
]

// ── MiniCard ──────────────────────────────────────────────────────────────────
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
        <p className="text-sm font-bold text-brand-primary">{fmtCLP(listing.priceCLP) ?? '—'}<span className="text-[10px] font-normal text-gray-400">/mes</span></p>
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

// ── ListingCard (grilla) ──────────────────────────────────────────────────────
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
        <p className="text-base font-bold text-brand-primary">{fmtCLP(listing.priceCLP) ?? '—'}<span className="text-xs font-normal text-gray-400">/mes</span></p>
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

// ── Bounds type ───────────────────────────────────────────────────────────────
type MapBounds = { north: number; south: number; east: number; west: number; centerLat: number; centerLng: number }

// ── Main Component ────────────────────────────────────────────────────────────
export default function ArriendosSearch() {
  const [zona, setZona]               = useState('')
  const [allResults, setAllResults]   = useState<Listing[]>([])
  const [total, setTotal]             = useState(0)
  const [loading, setLoading]         = useState(false)
  const [searched, setSearched]       = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [comunaMatch, setComunaMatch] = useState<string | null>(null)
  const [selectedId, setSelectedId]   = useState<string | null>(null)
  const [view, setView]               = useState<'map' | 'grid'>('map')
  const [dormFilter, setDormFilter]   = useState(0)
  const [banoFilter, setBanoFilter]   = useState(0)
  const [visibleBounds, setVisibleBounds] = useState<MapBounds | null>(null)
  const boundsRef = useRef<MapBounds | null>(null)

  const runSearch = useCallback(async (z: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ zona: z })
      const res = await fetch(`/api/admin/arriendos?${params}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail ?? data.error ?? `Error ${res.status}`)
      }
      const data = await res.json()
      setAllResults(data.results ?? [])
      setTotal(data.total ?? 0)
      setComunaMatch(data.comunaMatch ?? null)
      setVisibleBounds(null)
      setSearched(true)
    } catch (e: any) {
      setError(e.message ?? 'Error de conexión')
      setAllResults([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSearch = () => {
    setSelectedId(null)
    runSearch(zona)
  }

  // "Buscar en esta zona": filtra los resultados ya cargados por los bounds actuales del mapa
  const handleSearchInZone = () => {
    const b = boundsRef.current
    if (!b) return
    setVisibleBounds({ ...b })
    setSelectedId(null)

    // Si no hay resultados cargados para esta zona, carga la comuna del centro
    if (allResults.length === 0) {
      const nearest = findNearestComuna(b.centerLat, b.centerLng)
      setZona(nearest)
      runSearch(nearest)
    }
  }

  // Filter: dormitorios + baños + bounds del mapa
  const filtered = useMemo(() =>
    allResults.filter(r => {
      if (dormFilter > 0 && (r.bedrooms == null || r.bedrooms < dormFilter)) return false
      if (banoFilter > 0 && (r.bathrooms == null || r.bathrooms < banoFilter)) return false
      if (visibleBounds && r.lat != null && r.lng != null) {
        if (r.lat < visibleBounds.south || r.lat > visibleBounds.north) return false
        if (r.lng < visibleBounds.west  || r.lng > visibleBounds.east)  return false
      }
      return true
    }),
    [allResults, dormFilter, banoFilter, visibleBounds]
  )

  const avgPrice = useMemo(() => {
    const prices = filtered.filter(r => r.priceCLP != null).map(r => r.priceCLP!)
    if (prices.length === 0) return null
    return Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
  }, [filtered])

  const mapProjects = useMemo(() =>
    filtered.filter(r => r.lat && r.lng).map(r => ({
      id: r.id,
      title: `${fmtCLP(r.priceCLP) ?? '—'} · ${r.bedrooms ?? '?'}D ${r.area ?? '?'}m²`,
      lat: r.lat!, lng: r.lng!, source: 'toctoc',
    })),
    [filtered]
  )

  const selectedListing = filtered.find(r => r.id === selectedId)

  return (
    <div className="flex flex-col gap-0">
      {/* ── Precio promedio ──────────────────────────────────────────── */}
      {searched && avgPrice != null && (
        <div className="px-6 pt-3 pb-1">
          <div className="inline-flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-2.5 shadow-sm">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Precio promedio arriendo</p>
              <p className="text-lg font-bold text-brand-primary">{fmtCLP(avgPrice)}<span className="text-xs font-normal text-gray-400">/mes</span></p>
            </div>
            <div className="text-[10px] text-gray-400 border-l border-gray-200 pl-3">
              <p>{filtered.length} deptos. en mapa</p>
              {comunaMatch && <p className="font-medium text-gray-500">{comunaMatch}</p>}
            </div>
          </div>
        </div>
      )}

      {/* ── Barra de búsqueda + filtros ──────────────────────────────── */}
      <div className="px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-medium text-gray-600 mb-1">Comuna</label>
            <ZonaAutocomplete value={zona} onChange={setZona} onSearch={handleSearch} />
          </div>

          <div className="w-full lg:w-32">
            <label className="block text-xs font-medium text-gray-600 mb-1">Dormitorios</label>
            <select value={dormFilter} onChange={e => setDormFilter(Number(e.target.value))}
              className="input-field w-full text-sm">
              {DORM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className="w-full lg:w-28">
            <label className="block text-xs font-medium text-gray-600 mb-1">Baños</label>
            <select value={banoFilter} onChange={e => setBanoFilter(Number(e.target.value))}
              className="input-field w-full text-sm">
              {BANO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
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
          <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/50">
            <p className="text-sm text-gray-600">
              {loading ? (
                <span className="flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Buscando...</span>
              ) : (
                <>
                  <span className="font-semibold text-brand-text">{filtered.length}</span> departamentos
                  {filtered.length < allResults.length && <span className="text-gray-400"> (de {allResults.length} total)</span>}
                  {comunaMatch && <span className="text-gray-400"> en {comunaMatch}</span>}
                  {visibleBounds && <span className="text-gray-400"> · vista del mapa</span>}
                </>
              )}
            </p>
          </div>

          {/* ── MAP VIEW ─────────────────────────────────────────────── */}
          {view === 'map' && filtered.length > 0 && (
            <div className="flex flex-col lg:flex-row" style={{ height: 'calc(100vh - 260px)' }}>
              <div className="w-full lg:w-80 xl:w-96 border-r border-gray-200 overflow-y-auto flex-shrink-0 bg-white">
                <div className="p-2 space-y-0.5">
                  {filtered.map(listing => (
                    <MiniCard key={listing.id} listing={listing}
                      selected={selectedId === listing.id}
                      onClick={() => setSelectedId(listing.id === selectedId ? null : listing.id)} />
                  ))}
                </div>
                {selectedListing?.permalink && (
                  <div className="p-3 border-t border-gray-100">
                    <a href={selectedListing.permalink} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 w-full justify-center px-4 py-2 bg-brand-primary text-white text-xs font-medium rounded hover:bg-brand-primary-dark transition-colors">
                      Ver en TocToc <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>

              {/* Mapa con botón flotante */}
              <div className="flex-1 min-h-[400px] relative">
                <ProjectMap
                  projects={mapProjects}
                  selectedId={selectedId}
                  onSelect={id => setSelectedId(id === selectedId ? null : id)}
                  onBoundsChange={b => { boundsRef.current = b }}
                />
                {/* Botón flotante "Buscar en esta zona" */}
                <button
                  onClick={handleSearchInZone}
                  disabled={loading}
                  className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] inline-flex items-center gap-2 px-4 py-2 bg-white text-sm font-medium text-brand-text border border-gray-200 rounded-full shadow-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
                  Buscar en esta zona
                </button>
              </div>
            </div>
          )}

          {/* ── GRID VIEW ────────────────────────────────────────────── */}
          {view === 'grid' && filtered.length > 0 && (
            <div className="px-6 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filtered.map(listing => (
                  <ListingCard key={listing.id} listing={listing}
                    selected={selectedId === listing.id}
                    onClick={() => setSelectedId(listing.id === selectedId ? null : listing.id)} />
                ))}
              </div>
            </div>
          )}

          {filtered.length === 0 && !loading && (
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
