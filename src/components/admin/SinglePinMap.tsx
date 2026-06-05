'use client'
import { useEffect, useRef } from 'react'
import type { Map as LMap, Marker as LMarker } from 'leaflet'

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
function loadCSS() {
  return new Promise<void>(r => {
    if (document.getElementById('leaflet-css')) { r(); return }
    const l = document.createElement('link')
    l.id = 'leaflet-css'; l.rel = 'stylesheet'; l.href = LEAFLET_CSS
    l.onload = () => r(); l.onerror = () => r()
    document.head.appendChild(l)
  })
}

export default function SinglePinMap({ lat, lng, label }: { lat: number; lng: number; label?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LMap | null>(null)
  const markerRef = useRef<LMarker | null>(null)

  useEffect(() => {
    loadCSS().then(() => import('leaflet')).then(L => {
      if (!ref.current) return
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      if (mapRef.current) {
        mapRef.current.setView([lat, lng], 16, { animate: true })
        markerRef.current?.setLatLng([lat, lng])
        return
      }

      const map = L.map(ref.current, { center: [lat, lng], zoom: 16, zoomControl: true, scrollWheelZoom: false })
      const key = process.env.NEXT_PUBLIC_HERE_API_KEY
      L.tileLayer(
        key ? `https://maps.hereapi.com/v3/base/mc/{z}/{x}/{y}/png8?style=explore.day&apiKey=${key}`
            : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        { maxZoom: key ? 20 : 19 }
      ).addTo(map)
      markerRef.current = L.marker([lat, lng]).addTo(map)
      if (label) markerRef.current.bindTooltip(label, { permanent: true, direction: 'top' })
      mapRef.current = map
      setTimeout(() => map.invalidateSize(), 100)
    })

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; markerRef.current = null }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng])

  return <div ref={ref} className="w-full h-52 rounded-lg border border-gray-200 overflow-hidden" />
}
