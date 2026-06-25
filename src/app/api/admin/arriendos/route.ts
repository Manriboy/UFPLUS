import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

const TT_SEO = 'https://www.toctoc.com/gw-lista-seo/propiedades'

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

function findComunaId(input: string): { id: number; label: string } | null {
  if (!input) return null
  const normalized = input.trim()
  if (COMUNAS[normalized]) return { id: COMUNAS[normalized], label: normalized }
  const lower = normalized.toLowerCase()
  for (const [name, id] of Object.entries(COMUNAS)) {
    if (name.toLowerCase() === lower) return { id, label: name }
  }
  for (const [name, id] of Object.entries(COMUNAS)) {
    if (name.toLowerCase().includes(lower) || lower.includes(name.toLowerCase())) {
      return { id, label: name }
    }
  }
  return null
}

function buildFilters(comunaId: number | null, comunaLabel: string | null) {
  const filters: any[] = [
    { id: 'tipo-de-busqueda', type: 'radio', values: [{ id: 2, label: 'Arrendar', value: [3] }], selected: false, switch: false, buttons: [], mainFilter: true },
    { id: 'tipo-de-propiedad', type: 'check', values: [{ id: 2, label: 'Departamento', value: [2] }], selected: false, switch: false, buttons: [], mainFilter: true },
    { id: 'region', type: 'select', values: [{ id: 13, label: 'Metropolitana', value: [13] }], selected: false, switch: false, buttons: [] },
  ]
  if (comunaId && comunaLabel) {
    filters.push({ id: 'comuna', type: 'select', values: [{ id: comunaId, label: comunaLabel, value: [comunaId] }], selected: false, switch: false, buttons: [] })
  }
  return filters
}

function parsePrice(precios: any[]): { uf: number | null; clp: number | null } {
  let uf: number | null = null
  let clp: number | null = null
  for (const p of precios ?? []) {
    const raw = String(p.value ?? '').replace(/\./g, '').replace(',', '.')
    const num = parseFloat(raw)
    if (isNaN(num)) continue
    if (p.prefix === 'UF') uf = num
    else if (p.prefix === '$') clp = num
  }
  return { uf, clp }
}

function parseResult(r: any) {
  const { uf, clp } = parsePrice(r.precios)
  return {
    id:        String(r.idProperty ?? ''),
    title:     r.titulo ?? null,
    commune:   r.comuna ?? null,
    thumbnail: r.imagenPrincipal?.src ?? null,
    permalink: r.urlFicha ?? null,
    priceUF:   uf,
    priceCLP:  clp,
    area:      parseInt(r.superficie?.[0] ?? '') || null,
    bedrooms:  parseInt(r.dormitorios?.[0] ?? '') || null,
    bathrooms: parseInt(r.bannos?.[0] ?? '') || null,
  }
}

export async function GET(req: NextRequest) {
  const sp   = req.nextUrl.searchParams
  const zona = sp.get('zona')?.trim() ?? ''
  const page = Math.max(1, parseInt(sp.get('page') ?? '1') || 1)

  const match   = findComunaId(zona)
  const filters = buildFilters(match?.id ?? null, match?.label ?? null)
  const encoded = encodeURIComponent(JSON.stringify(filters))
  const url     = `${TT_SEO}?filtros=${encoded}&order=1&page=${page}`

  try {
    const res = await fetch(url, {
      headers: {
        'Accept':     '*/*',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
        'Cookie':     'X-DATA=a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      },
    })

    const rawText = await res.text()

    if (!res.ok || !rawText) {
      return NextResponse.json({
        error: 'tt_error',
        detail: `HTTP ${res.status} | ct: ${res.headers.get('content-type')} | body(${rawText.length}): ${rawText.slice(0, 200)}`,
      }, { status: 502 })
    }

    let data: any
    try {
      data = JSON.parse(rawText)
    } catch {
      return NextResponse.json({
        error: 'parse_error',
        detail: `Not JSON (${rawText.length}b): ${rawText.slice(0, 200)}`,
      }, { status: 502 })
    }

    return NextResponse.json({
      results:     (data.results ?? []).map(parseResult),
      total:       data.total ?? 0,
      page:        data.page ?? page,
      pageSize:    20,
      comunaMatch: match?.label ?? null,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: 'fetch_error', detail: msg }, { status: 500 })
  }
}
