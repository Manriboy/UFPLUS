import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

const TT_SEO     = 'https://www.toctoc.com/gw-lista-seo/propiedades'
const PER_PAGE   = 20
const MAX_PAGES  = 40

const COMUNAS: Record<string, number> = {
  'Alhué':301,'Buin':309,'Calera de Tango':307,'Cerrillos':321,'Cerro Navia':318,
  'Conchalí':326,'El Bosque':333,'El Monte':303,'Estación Central':338,'Huechuraba':327,
  'Independencia':324,'Isla de Maipo':305,'La Cisterna':330,'La Florida':316,'La Granja':332,
  'La Pintana':334,'La Reina':314,'Las Condes':313,'Lo Barnechea':311,'Lo Espejo':328,
  'Lo Prado':319,'Macul':342,'Maipú':320,'Padre Hurtado':306,'Paine':310,
  'Pedro Aguirre Cerda':329,'Peñaflor':302,'Peñalolén':315,'Providencia':337,'Pudahuel':317,
  'Quilicura':323,'Quinta Normal':336,'Recoleta':325,'Renca':322,'San Bernardo':308,
  'San Joaquín':341,'San Miguel':335,'San Pedro':300,'San Ramón':331,'Santiago':339,
  'Talagante':304,'Valle Grande':345,'Vitacura':312,'Ñuñoa':340,
}

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
  'San Miguel':[-33.497,-70.652],'San Pedro':[-33.888,-71.459],'San Ramón':[-33.541,-70.644],
  'Santiago':[-33.449,-70.669],'Talagante':[-33.665,-70.928],'Valle Grande':[-33.606,-70.879],
  'Vitacura':[-33.393,-70.580],'Ñuñoa':[-33.457,-70.597],
}

function findComunaId(input: string): { id: number; label: string } | null {
  if (!input) return null
  const lower = input.trim().toLowerCase()
  for (const [name, id] of Object.entries(COMUNAS)) {
    if (name.toLowerCase() === lower) return { id, label: name }
  }
  for (const [name, id] of Object.entries(COMUNAS)) {
    if (name.toLowerCase().includes(lower) || lower.includes(name.toLowerCase())) return { id, label: name }
  }
  return null
}

function buildFilters(comunaId: number | null, comunaLabel: string | null) {
  const f: any[] = [
    { id: 'tipo-de-busqueda', type: 'radio', values: [{ id: 2, label: 'Arrendar', value: [3] }], selected: false, switch: false, buttons: [], mainFilter: true },
    { id: 'tipo-de-propiedad', type: 'check', values: [{ id: 2, label: 'Departamento', value: [2] }], selected: false, switch: false, buttons: [], mainFilter: true },
    { id: 'region', type: 'select', values: [{ id: 13, label: 'Metropolitana', value: [13] }], selected: false, switch: false, buttons: [] },
  ]
  if (comunaId && comunaLabel) {
    f.push({ id: 'comuna', type: 'select', values: [{ id: comunaId, label: comunaLabel, value: [comunaId] }], selected: false, switch: false, buttons: [] })
  }
  return f
}

function parsePrice(precios: any[]): { uf: number | null; clp: number | null } {
  let uf: number | null = null, clp: number | null = null
  for (const p of precios ?? []) {
    const raw = String(p.value ?? '').replace(/\./g, '').replace(',', '.')
    const num = parseFloat(raw)
    if (isNaN(num)) continue
    if (p.prefix === 'UF') uf = num
    else if (p.prefix === '$') clp = num
  }
  return { uf, clp }
}

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function parseResult(r: any, globalIndex: number) {
  const { uf, clp } = parsePrice(r.precios)
  const commune = r.comuna ?? null
  const coords  = commune ? COMUNA_COORDS[commune] : null
  const id      = r.idProperty ?? globalIndex
  // Uniform square distribution across commune (~4km spread)
  const SPREAD = 0.035
  const hashLat = seededRandom(id * 7 + 3) - 0.5
  const hashLng = seededRandom(id * 13 + 7) - 0.5

  return {
    id:        String(id),
    title:     r.titulo ?? null,
    commune,
    thumbnail: r.imagenPrincipal?.src ?? null,
    permalink: r.urlFicha ?? null,
    priceUF:   uf,
    priceCLP:  clp,
    area:      parseInt(r.superficie?.[0] ?? '') || null,
    bedrooms:  parseInt(r.dormitorios?.[0] ?? '') || null,
    bathrooms: parseInt(r.bannos?.[0] ?? '') || null,
    lat:       coords ? coords[0] + hashLat * SPREAD : null,
    lng:       coords ? coords[1] + hashLng * SPREAD : null,
  }
}

const HEADERS = {
  'Accept':     '*/*',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
  'Cookie':     'X-DATA=a1b2c3d4-e5f6-7890-abcd-ef1234567890',
}

async function fetchPage(baseUrl: string, page: number): Promise<any[]> {
  try {
    const res = await fetch(`${baseUrl}&page=${page}`, { headers: HEADERS })
    if (!res.ok) return []
    const data = await res.json()
    return data.results ?? []
  } catch { return [] }
}

export async function GET(req: NextRequest) {
  const sp   = req.nextUrl.searchParams
  const zona = sp.get('zona')?.trim() ?? ''

  const match   = findComunaId(zona)
  const filters = buildFilters(match?.id ?? null, match?.label ?? null)
  const encoded = encodeURIComponent(JSON.stringify(filters))
  const baseUrl = `${TT_SEO}?filtros=${encoded}&order=1`

  try {
    // 1. Load page 1 to get total
    const res1 = await fetch(`${baseUrl}&page=1`, { headers: HEADERS })
    const rawText = await res1.text()

    if (!res1.ok || !rawText) {
      return NextResponse.json({
        error: 'tt_error',
        detail: `HTTP ${res1.status} | ct: ${res1.headers.get('content-type')} | body(${rawText.length}): ${rawText.slice(0, 200)}`,
      }, { status: 502 })
    }

    let data1: any
    try { data1 = JSON.parse(rawText) } catch {
      return NextResponse.json({ error: 'parse_error', detail: rawText.slice(0, 200) }, { status: 502 })
    }

    const total     = data1.total ?? 0
    const page1     = data1.results ?? []
    const totalPages = Math.min(Math.ceil(total / PER_PAGE), MAX_PAGES)

    // 2. Load remaining pages in parallel
    let allResults = [...page1]
    if (totalPages > 1) {
      const pageNums = Array.from({ length: totalPages - 1 }, (_, i) => i + 2)
      const batches  = await Promise.all(pageNums.map(p => fetchPage(baseUrl, p)))
      for (const batch of batches) allResults.push(...batch)
    }

    return NextResponse.json({
      results:     allResults.map((r: any, i: number) => parseResult(r, i)),
      total,
      comunaMatch: match?.label ?? null,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: 'fetch_error', detail: msg }, { status: 500 })
  }
}
