'use client'
// src/components/admin/ProjectMap.tsx

import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'
import type { Map as LeafletMap } from 'leaflet'

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
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="${size}" height="${size * 1.5}">
    <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24C24 5.373 18.627 0 12 0z" fill="${color}"/>
    <circle cx="12" cy="12" r="5" fill="white"/>
  </svg>`
}

function makeIcon(L: typeof import('leaflet'), color: string, size: number) {
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

export default function ProjectMap({ projects, selectedId, onSelect }: ProjectMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const markersRef = useRef<Map<string, import('leaflet').Marker>>(new Map())

  // Inicializar mapa
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    import('leaflet').then((L) => {
      // Fix default icon paths broken by webpack
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(containerRef.current!, {
        zoomControl: true,
        scrollWheelZoom: true,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map)

      mapRef.current = map

      // Forzar recálculo de tamaño para evitar mapa gris en primer render
      requestAnimationFrame(() => map.invalidateSize())

      // Re-invalidar si el contenedor cambia de tamaño (ej: toggle visibilidad)
      const ro = new ResizeObserver(() => map.invalidateSize())
      ro.observe(containerRef.current!)
      ;(map as unknown as Record<string, unknown>).__ro = ro
    })

    return () => {
      const map = mapRef.current
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const markers = markersRef.current
      const ro = map ? (map as unknown as Record<string, unknown>).__ro as ResizeObserver | undefined : undefined
      ro?.disconnect()
      map?.remove()
      mapRef.current = null
      markers.clear()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Actualizar marcadores cuando cambian los proyectos
  useEffect(() => {
    if (!mapRef.current) return

    import('leaflet').then((L) => {
      const map = mapRef.current!
      const existing = markersRef.current
      const nextIds = new Set(projects.map((p) => String(p.id)))

      // Eliminar marcadores que ya no están
      existing.forEach((marker, id) => {
        if (!nextIds.has(id)) {
          marker.remove()
          existing.delete(id)
        }
      })

      // Agrupar proyectos por coordenada base (para jitter)
      const coordKey = (lat: number, lng: number) =>
        `${lat.toFixed(4)},${lng.toFixed(4)}`
      const coordGroups: Record<string, number> = {}

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
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects])

  // Actualizar colores/tamaños al cambiar selección (sin redibujar todo)
  useEffect(() => {
    if (!mapRef.current) return

    import('leaflet').then((L) => {
      markersRef.current.forEach((marker, id) => {
        const isSelected = id === selectedId
        const size = isSelected ? 32 : 24
        const color = isSelected ? PIN_SELECTED : PIN_DEFAULT
        marker.setIcon(makeIcon(L, color, size))
      })

      // Centrar en el pin seleccionado
      if (selectedId) {
        const marker = markersRef.current.get(selectedId)
        if (marker) {
          mapRef.current?.panTo(marker.getLatLng(), { animate: true })
        }
      }
    })
  }, [selectedId])

  return (
    <div
      ref={containerRef}
      className="w-full h-[420px] rounded-xl border border-gray-200 overflow-hidden z-0"
    />
  )
}
