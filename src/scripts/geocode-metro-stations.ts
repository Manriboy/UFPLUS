/**
 * geocode-metro-stations.ts
 * Obtiene las estaciones del Metro de Santiago desde OpenStreetMap (Overpass API)
 * y genera src/lib/santiago-metro.ts con coordenadas exactas y polylines por línea.
 *
 * Uso:
 *   npx tsx src/scripts/geocode-metro-stations.ts
 */

import * as fs from 'fs'
import * as path from 'path'

// ── Orden oficial de estaciones por línea ─────────────
// Primera → última en dirección oeste/norte → este/sur
const LINE_ORDER: Record<string, string[]> = {
  L1: [
    'San Pablo', 'Neptuno', 'Pajaritos', 'Las Rejas', 'Ecuador',
    'San Alberto Hurtado', 'Universidad de Santiago', 'Estación Central',
    'Autopista', 'Moneda', 'Universidad de Chile', 'Santa Lucía',
    'Baquedano', 'Salvador', 'Manuel Montt', 'Pedro de Valdivia',
    'Los Leones', 'Tobalaba', 'El Golf', 'Alcántara', 'Escuela Militar',
    'Manquehue', 'Hernando de Magallanes', 'Los Dominicos',
  ],
  L2: [
    'Vespucio Norte', 'Cerro Blanco', 'Patronato', 'Puente Cal y Canto',
    'Baquedano', 'Parque Bustamante', 'Santa Isabel', 'Ñuble',
    'Rodrigo de Araya', 'Carlos Valdovinos', 'San Joaquín', 'Departamental',
    'Ciudad del Niño', 'Lo Ovalle', 'El Parrón', 'La Cisterna',
  ],
  L3: [
    'Quilicura', 'Barrancas', 'Cementerios', 'Vivaceta', 'Conchalí',
    'Einstein', 'Independencia', 'Baquedano', 'Matta', 'Irarrázaval',
    'Ñuble', 'Chile España', 'Quilín', 'Macul', 'Peñalolén',
    'Fernando Castillo Velasco',
  ],
  L4: [
    'Tobalaba', 'Cristóbal Colón', 'Francisco Bilbao', 'Príncipe de Gales',
    'Los Orientales', 'Grecia', 'Los Presidentes', 'Ñuñoa',
    'Plaza Egaña', 'La Unión Latinoamericana', 'Macul', 'Quilín',
    'San José de la Estrella', 'Los Quillayes', 'Elisa Correa',
    'Hospital Sótero del Río', 'Protectora de la Infancia',
    'Las Industrias', 'San Ramón', 'La Pintana', 'Bajos de Mena',
    'Protectora', 'Plaza de Puente Alto',
  ],
  L4A: [
    'Vicente Valdés', 'Rojas Magallanes', 'Trinidad', 'San Ramón', 'La Cisterna',
  ],
  L5: [
    'Plaza de Maipú', 'Santiago Bueras', 'Del Sol', 'Monte Tabor',
    'Pudahuel', 'Barrancas', 'Laguna Sur', 'Pudahuel Norte',
    'Blanqueado', 'Cerrillos', 'Lo Valledor', 'Pedro Aguirre Cerda',
    'Ñuble', 'Rodrigo de Araya', 'Carlos Valdovinos', 'Camino Agrícola',
    'San Joaquín', 'Parque Almagro', 'Almagro', 'Santa Ana',
    'Baquedano', 'Irarrazaval', 'Ñuñoa', 'Grecia',
    'Bellavista de La Florida', 'Vicente Valdés',
  ],
  L6: [
    'Cerrillos', 'Lo Valledor', 'Presidente Pedro Aguirre Cerda', 'Franklin',
    'Bío Bío', 'Ñuble', 'Estadio Nacional', 'Inés de Suárez',
    'Los Leones', 'Baquedano', 'Parque Bustamante', 'Santa Isabel',
  ],
}

// ── Normalizar nombre para matching ──────────────────

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // quitar acentos
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// ── Overpass API ──────────────────────────────────────

type OsmNode = {
  id: number
  lat: number
  lon: number
  tags: Record<string, string>
}

async function fetchOsmStations(): Promise<OsmNode[]> {
  // Bounding box generosa para el Gran Santiago: S,W,N,E
  const bbox = '-34.1,-71.1,-33.1,-70.3'
  const query = `
[out:json][timeout:30];
(
  node["railway"="station"]["station"="subway"](${bbox});
  node["railway"="station"]["network"~"Metro de Santiago",i](${bbox});
  node["station"="subway"](${bbox});
);
out body;
  `.trim()

  console.log('🌐  Consultando OpenStreetMap (Overpass)...')
  const res = await fetch('https://overpass.kumi.systems/api/interpreter', {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`)
  const data = await res.json() as { elements: OsmNode[] }
  return data.elements.filter(e => e.tags?.name)
}

// ── Matching estación OSM → nombre canónico ───────────

function findOsmStation(
  name: string,
  osmNodes: OsmNode[]
): OsmNode | null {
  const target = norm(name)

  // 1. Coincidencia exacta
  let match = osmNodes.find(n => norm(n.tags.name ?? '') === target)
  if (match) return match

  // 2. Coincidencia parcial (el nombre del OSM contiene el nuestro o viceversa)
  match = osmNodes.find(n => {
    const osmName = norm(n.tags.name ?? '')
    return osmName.includes(target) || target.includes(osmName)
  })
  if (match) return match

  // 3. Nombre alternativo (alt_name, name:es)
  match = osmNodes.find(n => {
    const alt = norm(n.tags['alt_name'] ?? n.tags['name:es'] ?? '')
    return alt && (alt === target || alt.includes(target) || target.includes(alt))
  })
  return match ?? null
}

// ── Main ──────────────────────────────────────────────

async function main() {
  const osmNodes = await fetchOsmStations()
  console.log(`   ${osmNodes.length} nodos encontrados en OSM\n`)

  // Debug: mostrar todos los nombres OSM encontrados
  const osmNames = osmNodes.map(n => n.tags.name).filter(Boolean).sort()
  console.log('Estaciones OSM encontradas:')
  osmNames.forEach(n => console.log(`  · ${n}`))
  console.log()

  const coordMap = new Map<string, { lat: number; lng: number }>()
  const notFound: string[] = []

  // Resolver coordenadas para cada estación en nuestras listas
  const allNames = new Set(Object.values(LINE_ORDER).flat())

  for (const name of allNames) {
    const node = findOsmStation(name, osmNodes)
    if (node) {
      coordMap.set(name, { lat: node.lat, lng: node.lon })
    } else {
      notFound.push(name)
    }
  }

  if (notFound.length > 0) {
    console.log('⚠️  No encontradas en OSM:')
    notFound.forEach(n => console.log(`  ✗ ${n}`))
    console.log()
  }

  // ── Generar contenido del archivo ─────────────────

  const stationLines: string[] = []
  const polylineLines: string[] = []

  for (const [line, names] of Object.entries(LINE_ORDER)) {
    const resolved = names
      .map(name => ({ name, coords: coordMap.get(name) }))
      .filter((s): s is { name: string; coords: { lat: number; lng: number } } => !!s.coords)

    // Stations
    for (const { name, coords } of resolved) {
      stationLines.push(
        `  { line: '${line}', name: ${JSON.stringify(name)}, lat: ${coords.lat.toFixed(6)}, lng: ${coords.lng.toFixed(6)} },`
      )
    }

    // Polyline
    const points = resolved.map(s => `[${s.coords.lat.toFixed(6)}, ${s.coords.lng.toFixed(6)}]`).join(', ')
    polylineLines.push(`  ${line}: [${points}],`)
  }

  const output = `// src/lib/santiago-metro.ts
// Generado automáticamente por geocode-metro-stations.ts (fuente: OpenStreetMap Overpass API).
// NO editar manualmente — corre el script para actualizar.

export type MetroLine = 'L1' | 'L2' | 'L3' | 'L4' | 'L4A' | 'L5' | 'L6'

export type MetroStation = {
  name: string
  line: MetroLine
  lat: number
  lng: number
}

// Puntos por línea en orden para dibujar polylines
export const METRO_POLYLINES: Record<MetroLine, [number, number][]> = {
${polylineLines.join('\n')}
}

export const METRO_LINE_COLORS: Record<MetroLine, string> = {
  L1:  '#EE2C2D',
  L2:  '#FAA61A',
  L3:  '#6D5A30',
  L4:  '#1B50A2',
  L4A: '#1B50A2',
  L5:  '#3F9A3C',
  L6:  '#8A2BE2',
}

export const METRO_STATIONS: MetroStation[] = [
${stationLines.join('\n')}
]
`

  const outPath = path.join(process.cwd(), 'src', 'lib', 'santiago-metro.ts')
  fs.writeFileSync(outPath, output, 'utf8')

  const found = Object.values(LINE_ORDER).flat().length - notFound.length
  console.log(`✅  Generado: ${outPath}`)
  console.log(`   ${found} estaciones con coordenadas OSM`)
  console.log(`   ${notFound.length} sin resolver`)
}

main().catch(e => { console.error('Error:', e.message); process.exit(1) })
