'use client'
// src/components/admin/ProjectMap.tsx

import { useEffect, useRef, useState } from 'react'
import type { Map as LMap, Marker as LMarker } from 'leaflet'

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
  const radius = 0.00008 + (hash % 5) * 0.00002  // máx ~18m
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

export default function ProjectMap({ projects, selectedId, onSelect }: ProjectMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LMap | null>(null)
  const markersRef = useRef<Map<string, LMarker>>(new Map())
  const onSelectRef = useRef(onSelect)
  const wheelCleanupRef = useRef<(() => void) | null>(null)
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [hint, setHint] = useState(false)
  onSelectRef.current = onSelect

  // Inicializar mapa
  useEffect(() => {
    let cancelled = false

    loadLeafletCSS().then(() => import('leaflet')).then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return

      // Fix webpack icon paths
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
        scrollWheelZoom: false,   // deshabilitado — usamos handler propio
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

      // Zoom con Ctrl/Cmd + scroll. Los navegadores sintetizan ctrlKey=true
      // en gestos de pinch en trackpad, por lo que el pinch sigue funcionando.
      const el = containerRef.current!
      const onWheel = (e: WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          map.setZoom(map.getZoom() + (e.deltaY < 0 ? 1 : -1))
        } else {
          // Mostrar hint brevemente
          setHint(true)
          if (hintTimerRef.current) clearTimeout(hintTimerRef.current)
          hintTimerRef.current = setTimeout(() => setHint(false), 1500)
        }
      }
      el.addEventListener('wheel', onWheel, { passive: false })
      wheelCleanupRef.current = () => el.removeEventListener('wheel', onWheel)

      // Recalcular tamaño después de que el DOM esté listo
      setTimeout(() => {
        if (!cancelled) {
          map.invalidateSize()
          updateMarkers(L, map, markersRef.current, projects, selectedId, onSelectRef)
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

  return (
    <div className="relative w-full h-[420px] rounded-xl border border-gray-200 overflow-hidden">
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', touchAction: 'none' }}
      />
      {/* Hint: usa Ctrl/Cmd + scroll */}
      {hint && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="bg-black/60 text-white text-sm font-medium px-4 py-2 rounded-lg">
            Usa <kbd className="font-mono bg-white/20 px-1.5 py-0.5 rounded text-xs">Ctrl</kbd> + scroll para hacer zoom
          </div>
        </div>
      )}
    </div>
  )
}

// ── Función de renderizado de marcadores ──────────────

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
