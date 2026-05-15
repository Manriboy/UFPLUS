'use client'
// src/components/admin/ProjectMap.tsx

import { useEffect, useRef } from 'react'
import type { Map as LMap, Marker as LMarker } from 'leaflet'

export interface MapProject {
  id: string | number
  title: string
  lat: number
  lng: number
  source: 'iris' | 'ufplus'
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
  const hash = String(id).split('').reduce((acc, c) => acc + c.charCodeAt(0), index * 31)
  const angle = (hash % 360) * (Math.PI / 180)
  const radius = 0.003 + (hash % 10) * 0.0004
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
        scrollWheelZoom: true,
        doubleClickZoom: true,
        touchZoom: true,
      })

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
      }).addTo(map)

      mapRef.current = map

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
    <div className="w-full h-[420px] rounded-xl border border-gray-200 overflow-hidden">
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', touchAction: 'none' }}
      />
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
    const key = coordKey(p.lat, p.lng)
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

    const pos: [number, number] = [p.lat + dlat, p.lng + dlng]
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
    const bounds = L.latLngBounds(projects.map((p) => [p.lat, p.lng]))
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 })
  }
}
