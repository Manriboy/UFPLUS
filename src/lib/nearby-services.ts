// src/lib/nearby-services.ts
// Busca servicios cercanos usando Overpass API (OpenStreetMap). Se ejecuta una
// vez al publicar una propiedad; el resultado se guarda en nearbyServicesJson.
import type { NearbyServicesData, POI } from '@/components/public/NearbyServices'

const OVERPASS_URL = 'https://overpass.kumi.systems/api/interpreter'
const RADIUS = 1000 // metros

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000
  const toRad = (d: number) => d * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

interface OverpassElement {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

async function queryOverpass(query: string): Promise<OverpassElement[]> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 25_000)
  try {
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: ctrl.signal,
    })
    if (!res.ok) return []
    const json = await res.json() as { elements?: OverpassElement[] }
    return json.elements ?? []
  } catch {
    return []
  } finally {
    clearTimeout(timer)
  }
}

function toPOIs(elements: OverpassElement[], centerLat: number, centerLng: number, limit = 15): POI[] {
  const seen = new Set<string>()
  const pois: POI[] = []
  for (const el of elements) {
    const elLat = el.lat ?? el.center?.lat
    const elLng = el.lon ?? el.center?.lon
    if (elLat == null || elLng == null) continue
    const name = el.tags?.name ?? el.tags?.['name:es']
    if (!name) continue
    const key = `${name.toLowerCase()}-${Math.round(elLat * 500)}-${Math.round(elLng * 500)}`
    if (seen.has(key)) continue
    seen.add(key)
    const distance = Math.round(haversine(centerLat, centerLng, elLat, elLng))
    pois.push({ title: name, distance })
  }
  return pois.sort((a, b) => a.distance - b.distance).slice(0, limit)
}

const QUERIES: Record<keyof NearbyServicesData, (lat: number, lng: number) => string> = {
  transporte: (lat, lng) => `
[out:json][timeout:25];
(
  node["highway"="bus_stop"](around:${RADIUS},${lat},${lng});
  node["railway"~"station|subway_entrance"](around:${RADIUS},${lat},${lng});
  node["amenity"="bus_station"](around:${RADIUS},${lat},${lng});
  node["name"~"metro|terminal|paradero",i](around:${RADIUS},${lat},${lng});
);
out center;`,

  educacion: (lat, lng) => `
[out:json][timeout:25];
(
  nwr["amenity"~"school|university|kindergarten|college"](around:${RADIUS},${lat},${lng});
  nwr["name"~"liceo|jardín|jardin|colegio|universidad",i](around:${RADIUS},${lat},${lng});
);
out center;`,

  areasVerdes: (lat, lng) => `
[out:json][timeout:25];
(
  nwr["leisure"~"park|garden"](around:${RADIUS},${lat},${lng});
  nwr["landuse"="recreation_ground"](around:${RADIUS},${lat},${lng});
  nwr["name"~"plaza|parque",i](around:${RADIUS},${lat},${lng});
);
out center;`,

  comercios: (lat, lng) => `
[out:json][timeout:25];
(
  nwr["shop"~"supermarket|mall|department_store|convenience"](around:${RADIUS},${lat},${lng});
  nwr["amenity"="marketplace"](around:${RADIUS},${lat},${lng});
  nwr["name"~"supermercado|jumbo|lider|líder|santa isabel|unimarc|tottus|mall",i](around:${RADIUS},${lat},${lng});
);
out center;`,

  salud: (lat, lng) => `
[out:json][timeout:25];
(
  nwr["amenity"~"hospital|pharmacy|clinic|doctors|health_centre"](around:${RADIUS},${lat},${lng});
  nwr["name"~"farmacia|clínica|clinica|consultorio|cruz verde|salcobrand|ahumada|redfarma",i](around:${RADIUS},${lat},${lng});
);
out center;`,
}

export async function fetchNearbyServices(lat: number, lng: number): Promise<NearbyServicesData> {
  const tabs = Object.keys(QUERIES) as Array<keyof NearbyServicesData>
  const results = await Promise.all(
    tabs.map(tab => queryOverpass(QUERIES[tab](lat, lng)).then(els => toPOIs(els, lat, lng)))
  )
  return {
    transporte:  results[0],
    educacion:   results[1],
    areasVerdes: results[2],
    comercios:   results[3],
    salud:       results[4],
  }
}
