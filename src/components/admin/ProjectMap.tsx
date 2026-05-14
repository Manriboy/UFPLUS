'use client'
// src/components/admin/ProjectMap.tsx

import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'
import type * as Leaflet from 'leaflet'

interface MapProject {
  id: string | number
  title: string
  address: string
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

function pinSvg(color: string, size: number): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="${size}" height="${size * 1.5}">` +
    `<path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24C24 5.373 18.627 0 12 0z" fill="${color}"/>` +
    `<circle cx="12" cy="12" r="5" fill="white"/>` +
    `</svg>`
  )
}

function makeIcon(L: typeof Leaflet, color: string, size: number) {
  return L.divIcon({
    className: '',
    html: pinSvg(color, size),
    iconSize: [size, size * 1.5],
    iconAnchor: [size / 2, size * 1.5],
    popupAnchor: [0, -size * 1.5],
  })
}

// Jitter determinista para separar múltiples pines en la misma comuna
function jitter(id: string | number, index: number): [number, number] {
  const hash = String(id).split('').reduce((acc, c) => acc + c.charCodeAt(0), index * 31)
  const angle = (hash % 360) * (Math.PI / 180)
  const radius = 0.003 + (hash % 10) * 0.0004
  return [Math.sin(angle) * radius, Math.cos(angle) * radius]
}

type L = typeof Leaflet

export default function ProjectMap({ projects, selectedId, onSelect }: ProjectMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Leaflet.Map | null>(null)
  const lRef = useRef<L | null>(null)
  const markersRef = useRef<Map<string, Leaflet.Marker>>(new Map())
  const cancelRef = useRef(false)

  // ── Inicializar mapa (una sola vez) ──────────────────
  useEffect(() => {
    if (!containerRef.current) return
    cancelRef.current = false

    import('leaflet').then((L) => {
      // Cancelado si el efecto de limpieza corrió antes de resolver (StrictMode)
      if (cancelRef.current || !containerRef.current) return

      // Evitar doble inicialización si el DOM ya tiene un mapa de Leaflet
      const container = containerRef.current as HTMLElement & { _leaflet_id?: number }
      if (container._leaflet_id) {
        delete container._leaflet_id
      }

      lRef.current = L

      const map = L.map(containerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
        center: [-33.45, -70.67],
        zoom: 12,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map)

      mapRef.current = map

      // Invalidar tamaño para evitar mapa gris
      setTimeout(() => { map.invalidateSize() }, 50)

      // Re-invalidar si el contenedor cambia de tamaño
      const ro = new ResizeObserver(() => { map.invalidateSize() })
      ro.observe(containerRef.current)

      // Guardar ro en un ref auxiliar para cleanup
      roRef.current = ro

      // Renderizar marcadores iniciales si ya tenemos proyectos
      if (projects.length > 0) {
        renderMarkers(L, map, markersRef.current, projects, selectedId, onSelect)
      }
    })

    return () => {
      cancelRef.current = true
      roRef.current?.disconnect()
      roRef.current = null
      mapRef.current?.remove()
      mapRef.current = null
      lRef.current = null
      markersRef.current.clear()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const roRef = useRef<ResizeObserver | null>(null)

  // ── Actualizar marcadores cuando cambian proyectos ───
  useEffect(() => {
    const L = lRef.current
    const map = mapRef.current
    if (!L || !map) return
    renderMarkers(L, map, markersRef.current, projects, selectedId, onSelect)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects])

  // ── Actualizar colores al cambiar selección ──────────
  useEffect(() => {
    const L = lRef.current
    const map = mapRef.current
    if (!L || !map) return

    markersRef.current.forEach((marker, id) => {
      const isSelected = id === selectedId
      marker.setIcon(makeIcon(L, isSelected ? PIN_SELECTED : PIN_DEFAULT, isSelected ? 32 : 24))
    })

    if (selectedId) {
      const marker = markersRef.current.get(selectedId)
      if (marker) map.panTo(marker.getLatLng(), { animate: true })
    }
  }, [selectedId])

  return (
    <div
      ref={containerRef}
      className="w-full h-[420px] rounded-xl border border-gray-200 overflow-hidden"
      style={{ zIndex: 0 }}
    />
  )
}

// ── Función pura de renderizado de marcadores ─────────

function renderMarkers(
  L: L,
  map: Leaflet.Map,
  existing: Map<string, Leaflet.Marker>,
  projects: MapProject[],
  selectedId: string | null,
  onSelect: (id: string | null) => void,
) {
  const nextIds = new Set(projects.map((p) => String(p.id)))

  // Eliminar marcadores obsoletos
  existing.forEach((marker, id) => {
    if (!nextIds.has(id)) { marker.remove(); existing.delete(id) }
  })

  // Contar proyectos por coordenada base (para jitter)
  const coordGroups: Record<string, number> = {}
  const coordKey = (lat: number, lng: number) => `${lat.toFixed(4)},${lng.toFixed(4)}`

  projects.forEach((p) => {
    const key = coordKey(p.lat, p.lng)
    const idx = coordGroups[key] ?? 0
    coordGroups[key] = idx + 1

    const isSelected = String(p.id) === selectedId
    const [dlat, dlng] = jitter(p.id, idx)
    const lat = p.lat + dlat
    const lng = p.lng + dlng
    const size = isSelected ? 32 : 24
    const color = isSelected ? PIN_SELECTED : PIN_DEFAULT
    const icon = makeIcon(L, color, size)

    const existingMarker = existing.get(String(p.id))
    if (existingMarker) {
      existingMarker.setIcon(icon)
      existingMarker.setLatLng([lat, lng])
    } else {
      const marker = L.marker([lat, lng], { icon })
        .addTo(map)
        .bindTooltip(p.title, { direction: 'top', offset: [0, -size * 1.5] })

      marker.on('click', () => {
        onSelect(String(p.id) === selectedId ? null : String(p.id))
      })
      existing.set(String(p.id), marker)
    }
  })

  // Ajustar vista para mostrar todos los pines
  if (projects.length > 0) {
    const bounds = L.latLngBounds(projects.map((p) => [p.lat, p.lng]))
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 })
  }
}
