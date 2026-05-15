'use client'
// src/components/admin/ProjectMap.tsx

import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'

// Fix default icon paths rotos por webpack
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

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

function pinSvg(color: string, size: number): string {
  const h = size * 1.5
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="${size}" height="${h}">` +
    `<path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24C24 5.373 18.627 0 12 0z" fill="${color}"/>` +
    `<circle cx="12" cy="12" r="5" fill="white"/>` +
    `</svg>`
  )
}

function makeIcon(color: string, size: number) {
  return L.divIcon({
    className: '',
    html: pinSvg(color, size),
    iconSize: [size, size * 1.5],
    iconAnchor: [size / 2, size * 1.5],
    popupAnchor: [0, -size * 1.5],
  })
}

// Jitter determinista para proyectos en la misma comuna
function jitter(id: string | number, index: number): [number, number] {
  const hash = String(id).split('').reduce((acc, c) => acc + c.charCodeAt(0), index * 31)
  const angle = (hash % 360) * (Math.PI / 180)
  const radius = 0.003 + (hash % 10) * 0.0004
  return [Math.sin(angle) * radius, Math.cos(angle) * radius]
}

// Encuadra el mapa para mostrar todos los pines
function FitBounds({ projects }: { projects: MapProject[] }) {
  const map = useMap()
  const prevCountRef = useRef(0)

  useEffect(() => {
    if (projects.length === 0) return
    if (projects.length === prevCountRef.current) return
    prevCountRef.current = projects.length

    const bounds = L.latLngBounds(projects.map((p) => [p.lat, p.lng]))
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 })
  }, [map, projects])

  return null
}

// Centra el mapa en el pin seleccionado
function PanToSelected({ selectedId, projects }: { selectedId: string | null; projects: MapProject[] }) {
  const map = useMap()

  useEffect(() => {
    if (!selectedId) return
    const p = projects.find((x) => String(x.id) === selectedId)
    if (p) map.panTo([p.lat, p.lng], { animate: true })
  }, [map, selectedId, projects])

  return null
}

export default function ProjectMap({ projects, selectedId, onSelect }: ProjectMapProps) {
  // Inyectar CSS de Leaflet desde CDN (no via import para no romper el bundler de Next.js)
  useEffect(() => {
    const id = 'leaflet-css'
    if (document.getElementById(id)) return
    const link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)
  }, [])

  // Contar proyectos por coordenada base para jitter
  const coordGroups: Record<string, number> = {}
  const coordKey = (lat: number, lng: number) => `${lat.toFixed(4)},${lng.toFixed(4)}`

  return (
    <div className="w-full h-[420px] rounded-xl border border-gray-200 overflow-hidden" style={{ zIndex: 0 }}>
      <MapContainer
        center={[-33.45, -70.67]}
        zoom={12}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom
        dragging
        zoomControl
        attributionControl
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/">CARTO</a>'
          subdomains="abcd"
          maxZoom={20}
        />

        <FitBounds projects={projects} />
        <PanToSelected selectedId={selectedId} projects={projects} />

        {projects.map((p) => {
          const key = coordKey(p.lat, p.lng)
          const idx = coordGroups[key] ?? 0
          coordGroups[key] = idx + 1

          const [dlat, dlng] = jitter(p.id, idx)
          const isSelected = String(p.id) === selectedId
          const size = isSelected ? 32 : 24
          const color = isSelected ? PIN_SELECTED : PIN_DEFAULT
          const icon = makeIcon(color, size)

          return (
            <Marker
              key={p.id}
              position={[p.lat + dlat, p.lng + dlng]}
              icon={icon}
              eventHandlers={{
                click: () => onSelect(String(p.id) === selectedId ? null : String(p.id)),
              }}
            >
              <Tooltip direction="top" offset={[0, -size * 1.5]}>
                {p.title}
              </Tooltip>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}
