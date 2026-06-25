'use client'
// src/components/admin/ProjectMap.tsx

import { useEffect, useRef, useState } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'
import type { Map as LMap, Marker as LMarker, CircleMarker as LCircleMarker } from 'leaflet'
import { METRO_STATIONS, METRO_LINE_COLORS, METRO_POLYLINES, type MetroLine } from '@/lib/santiago-metro'
import { cn } from '@/lib/utils'

export interface MapProject {
  id: string | number
  title: string
  lat: number
  lng: number
  hereLat?: number | null
  hereLng?: number | null
  source: string
}

interface ProjectMapProps {
  projects: MapProject[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onBoundsChange?: (bounds: { north: number; south: number; east: number; west: number; centerLat: number; centerLng: number }) => void
}

const PIN_DEFAULT = '#4B4B4B'
const PIN_SELECTED = '#941914'
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'

function pinSvg(color: string, size: number) {
  const h = size * 1.5
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="${size}" height="${h}">` +
    `<path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24C24 5.373 18.627 0 12 0z" fill="${color}"/>` +
    `<circle cx="12" cy="12" r="5" fill="white"/>` +
    `</svg>`
  )
}

function jitter(id: string | number, index: number): [number, number] {
  if (index === 0) return [0, 0]
  const hash = String(id).split('').reduce((acc, c) => acc + c.charCodeAt(0), index * 31)
  const angle = (hash % 360) * (Math.PI / 180)
  const radius = 0.00008 + (hash % 5) * 0.00002
  return [Math.sin(angle) * radius, Math.cos(angle) * radius]
}

function loadLeafletCSS(): Promise<void> {
  return new Promise((resolve) => {
    if (document.getElementById('leaflet-css')) { resolve(); return }
    const link = document.createElement('link')
    link.id = 'leaflet-css'
    link.rel = 'stylesheet'
    link.href = LEAFLET_CSS
    link.onload = () => resolve()
    link.onerror = () => resolve()
    document.head.appendChild(link)
  })
}

export default function ProjectMap({ projects, selectedId, onSelect, onBoundsChange }: ProjectMapProps) {
  const outerRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LMap | null>(null)
  const markersRef = useRef<Map<string, LMarker>>(new Map())
  const metroMarkersRef = useRef<LCircleMarker[]>([])
  const metroLinesRef = useRef<import('leaflet').Polyline[]>([])
  const onSelectRef = useRef(onSelect)
  const onBoundsChangeRef = useRef(onBoundsChange)
  const wheelCleanupRef = useRef<(() => void) | null>(null)
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [hint, setHint] = useState(false)
  const [showStations, setShowStations] = useState(true)
  const [showLines, setShowLines] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)

  onSelectRef.current = onSelect
  onBoundsChangeRef.current = onBoundsChange

  // Líneas implican estaciones
  const toggleLines = () => {
    const next = !showLines
    setShowLines(next)
    if (next) setShowStations(true)
  }

  // Estaciones independientes solo cuando las líneas están apagadas
  const toggleStations = () => {
    if (showLines) return
    setShowStations(v => !v)
  }

  // Fullscreen via API nativa del browser (garantiza cobertura total del viewport)
  const toggleFullscreen = () => {
    if (!outerRef.current) return
    if (!document.fullscreenElement) {
      outerRef.current.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }

  // Inicializar mapa
  useEffect(() => {
    let cancelled = false

    loadLeafletCSS().then(() => import('leaflet')).then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return

      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(containerRef.current, {
        center: [-33.45, -70.67],
        zoom: 12,
        zoomControl: true,
        dragging: true,
        scrollWheelZoom: false,
        doubleClickZoom: true,
        touchZoom: true,
      })

      const hereKey = process.env.NEXT_PUBLIC_HERE_API_KEY
      L.tileLayer(
        hereKey
          ? `https://maps.hereapi.com/v3/base/mc/{z}/{x}/{y}/png8?style=explore.day&apiKey=${hereKey}`
          : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          attribution: hereKey
            ? '© <a href="https://www.here.com">HERE Maps</a>'
            : '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: hereKey ? 20 : 19,
        }
      ).addTo(map)

      mapRef.current = map

      const emitBounds = () => {
        const b = map.getBounds()
        const c = map.getCenter()
        onBoundsChangeRef.current?.({
          north: b.getNorth(), south: b.getSouth(),
          east: b.getEast(), west: b.getWest(),
          centerLat: c.lat, centerLng: c.lng,
        })
      }
      map.on('moveend', emitBounds)
      map.on('zoomend', emitBounds)

      const el = containerRef.current!
      const onWheel = (e: WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          map.setZoom(map.getZoom() + (e.deltaY < 0 ? 1 : -1))
        } else {
          setHint(true)
          if (hintTimerRef.current) clearTimeout(hintTimerRef.current)
          hintTimerRef.current = setTimeout(() => setHint(false), 1500)
        }
      }
      el.addEventListener('wheel', onWheel, { passive: false })
      wheelCleanupRef.current = () => el.removeEventListener('wheel', onWheel)

      setTimeout(() => {
        if (!cancelled) {
          map.invalidateSize()
          updateMarkers(L, map, markersRef.current, projects, selectedId, onSelectRef)
          const { markers, lines } = addMetroLayer(L, map)
          metroMarkersRef.current = markers
          metroLinesRef.current = lines
        }
      }, 100)
    })

    return () => {
      cancelled = true
      wheelCleanupRef.current?.()
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current)
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        markersRef.current.clear()
        metroMarkersRef.current = []
        metroLinesRef.current = []
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Actualizar marcadores al cambiar proyectos
  useEffect(() => {
    if (!mapRef.current) return
    import('leaflet').then((L) => {
      if (!mapRef.current) return
      updateMarkers(L, mapRef.current, markersRef.current, projects, selectedId, onSelectRef)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects])

  // Visibilidad de líneas
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    metroLinesRef.current.forEach(l => { if (showLines) l.addTo(map); else l.remove() })
  }, [showLines])

  // Visibilidad de estaciones (visible si stations O lines están activos)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const visible = showStations || showLines
    metroMarkersRef.current.forEach(m => { if (visible) m.addTo(map); else m.remove() })
  }, [showStations, showLines])

  // Sincronizar estado y tamaño del mapa con la API nativa de fullscreen
  useEffect(() => {
    const handler = () => {
      setIsFullscreen(document.fullscreenElement === outerRef.current)
      setTimeout(() => mapRef.current?.invalidateSize(), 100)
    }
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  // Actualizar colores y centrar al cambiar selección
  useEffect(() => {
    if (!mapRef.current) return
    import('leaflet').then((L) => {
      const map = mapRef.current
      if (!map) return
      markersRef.current.forEach((marker, id) => {
        const isSelected = id === selectedId
        const size = isSelected ? 32 : 24
        marker.setIcon(L.divIcon({
          className: '',
          html: pinSvg(isSelected ? PIN_SELECTED : PIN_DEFAULT, size),
          iconSize: [size, size * 1.5],
          iconAnchor: [size / 2, size * 1.5],
        }))
      })
      if (selectedId) {
        const marker = markersRef.current.get(selectedId)
        if (marker) map.panTo(marker.getLatLng(), { animate: true })
      }
    })
  }, [selectedId])

  const stationsActive = showStations || showLines

  return (
    <div
      ref={outerRef}
      className="relative z-0 w-full overflow-hidden bg-white rounded-xl border border-gray-200"
      style={{ height: isFullscreen ? '100%' : '420px' }}
    >
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', touchAction: 'none' }}
      />

      {/* Controles — top-right */}
      <div className="absolute top-2 right-2 z-[1000] flex items-center gap-1.5">

        {/* Estaciones */}
        <button
          onClick={toggleStations}
          title={stationsActive ? 'Ocultar estaciones de metro' : 'Mostrar estaciones de metro'}
          className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold shadow-md transition-colors select-none',
            stationsActive
              ? 'text-white'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50',
            showLines && 'cursor-default',
          )}
          style={stationsActive ? { background: '#EE2C2D', opacity: showLines ? 0.7 : 1 } : undefined}
        >
          <span className="text-[13px] leading-none font-bold">M</span>
          <span>Est.</span>
        </button>

        {/* Líneas */}
        <button
          onClick={toggleLines}
          title={showLines ? 'Ocultar líneas de metro' : 'Mostrar líneas de metro'}
          className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold shadow-md transition-colors select-none',
            showLines
              ? 'text-white'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50',
          )}
          style={showLines ? { background: '#EE2C2D' } : undefined}
        >
          <svg width="12" height="10" viewBox="0 0 12 10" fill="none" className="flex-shrink-0">
            <path d="M1 9L4 2L7.5 6.5L10 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Líneas</span>
        </button>

        {/* Pantalla completa */}
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Salir de pantalla completa (Esc)' : 'Pantalla completa'}
          className="flex items-center justify-center w-[26px] h-[26px] rounded-lg shadow-md bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          {isFullscreen
            ? <Minimize2 className="h-3.5 w-3.5" />
            : <Maximize2 className="h-3.5 w-3.5" />
          }
        </button>
      </div>

      {/* Leyenda líneas */}
      {showLines && (
        <div className="absolute bottom-6 left-2 z-[1000] bg-white/90 backdrop-blur-sm rounded-lg shadow-md px-2.5 py-2 space-y-1">
          {(['L1','L2','L3','L4','L5','L6'] as const).map(line => (
            <div key={line} className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-full border border-white/60 shadow-sm" style={{ background: METRO_LINE_COLORS[line] }} />
              <span className="text-[10px] font-semibold text-gray-700">{line}</span>
            </div>
          ))}
        </div>
      )}

      {/* Hint: Ctrl + scroll */}
      {hint && (
        <div className="pointer-events-none absolute inset-0 z-[1001] flex items-center justify-center">
          <div className="bg-black/60 text-white text-sm font-medium px-4 py-2 rounded-lg">
            Usa <kbd className="font-mono bg-white/20 px-1.5 py-0.5 rounded text-xs">Ctrl</kbd> + scroll para hacer zoom
          </div>
        </div>
      )}
    </div>
  )
}

// ── Estaciones de metro ───────────────────────────────

function addMetroLayer(L: typeof import('leaflet'), map: LMap): {
  markers: LCircleMarker[]
  lines: import('leaflet').Polyline[]
} {
  const lines: import('leaflet').Polyline[] = []
  const markers: LCircleMarker[] = []

  for (const [line, points] of Object.entries(METRO_POLYLINES) as [string, [number, number][]][]) {
    if (points.length < 2) continue
    const color = METRO_LINE_COLORS[line as MetroLine]
    const polyline = L.polyline(points, { color, weight: 2.5, opacity: 0.85 }).addTo(map)
    lines.push(polyline)
  }

  for (const station of METRO_STATIONS) {
    const color = METRO_LINE_COLORS[station.line]
    const marker = L.circleMarker([station.lat, station.lng], {
      radius: 5,
      color: '#fff',
      weight: 1.5,
      fillColor: color,
      fillOpacity: 1,
    })
      .addTo(map)
      .bindTooltip(`${station.name} · ${station.line}`, { direction: 'top', offset: [0, -6] })
    markers.push(marker)
  }

  return { markers, lines }
}

// ── Renderizado de marcadores ──────────────────────────

function updateMarkers(
  L: typeof import('leaflet'),
  map: LMap,
  existing: Map<string, LMarker>,
  projects: MapProject[],
  selectedId: string | null,
  onSelectRef: React.MutableRefObject<(id: string | null) => void>,
) {
  const nextIds = new Set(projects.map((p) => String(p.id)))
  existing.forEach((m, id) => { if (!nextIds.has(id)) { m.remove(); existing.delete(id) } })

  const coordGroups: Record<string, number> = {}
  const coordKey = (lat: number, lng: number) => `${lat.toFixed(4)},${lng.toFixed(4)}`

  projects.forEach((p) => {
    const baseLat = (p.hereLat != null) ? p.hereLat : p.lat
    const baseLng = (p.hereLng != null) ? p.hereLng : p.lng
    const key = coordKey(baseLat, baseLng)
    const idx = coordGroups[key] ?? 0
    coordGroups[key] = idx + 1

    const isSelected = String(p.id) === selectedId
    const [dlat, dlng] = jitter(p.id, idx)
    const size = isSelected ? 32 : 24
    const color = isSelected ? PIN_SELECTED : PIN_DEFAULT

    const icon = L.divIcon({
      className: '',
      html: pinSvg(color, size),
      iconSize: [size, size * 1.5],
      iconAnchor: [size / 2, size * 1.5],
      popupAnchor: [0, -size * 1.5],
    })

    const pos: [number, number] = [baseLat + dlat, baseLng + dlng]
    const existingMarker = existing.get(String(p.id))

    if (existingMarker) {
      existingMarker.setIcon(icon)
      existingMarker.setLatLng(pos)
    } else {
      const marker = L.marker(pos, { icon })
        .addTo(map)
        .bindTooltip(p.title, { direction: 'top', offset: [0, -size * 1.5] })
      marker.on('click', () => {
        onSelectRef.current(String(p.id) === selectedId ? null : String(p.id))
      })
      existing.set(String(p.id), marker)
    }
  })

  if (projects.length > 0) {
    const bounds = L.latLngBounds(projects.map((p) => [p.hereLat ?? p.lat, p.hereLng ?? p.lng]))
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 })
  }
}
