import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const TT_API   = 'https://www.toctoc.com/api/mapa/GetProps'
const PAGE_SIZE = 20

function parseTtProp(row: any[]) {
  return {
    id:        String(row[1] ?? ''),
    lng:       typeof row[2]  === 'number' ? row[2]  : null,
    lat:       typeof row[3]  === 'number' ? row[3]  : null,
    bedrooms:  typeof row[4]  === 'number' ? row[4]  : null,
    commune:   typeof row[7]  === 'string' ? row[7]  : null,
    bathrooms: typeof row[8]  === 'number' ? row[8]  : null,
    thumbnail: typeof row[20] === 'string' ? row[20] : null,
    area:      typeof row[21] === 'number' ? row[21] : null,
    priceCLP:  typeof row[22] === 'number' ? row[22] : null,
    priceUF:   typeof row[24] === 'number' ? row[24] : null,
    title:     typeof row[39] === 'string' ? row[39] : null,
    permalink: typeof row[40] === 'string' ? row[40] : null,
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const sp             = req.nextUrl.searchParams
  const busqueda       = sp.get('zona')?.trim()      ?? ''
  const dormitorios    = parseInt(sp.get('dormitorios')  ?? '0') || 0
  const banos          = parseInt(sp.get('banos')        ?? '0') || 0
  const precioDesdeUF  = parseFloat(sp.get('precioMinUF') ?? '0') || 0
  const precioHastaUF  = parseFloat(sp.get('precioMaxUF') ?? '0') || 0
  const superfMin      = parseInt(sp.get('superfMin')    ?? '0') || 0
  const superfMax      = parseInt(sp.get('superfMax')    ?? '0') || 0
  const ordenarPor     = parseInt(sp.get('orden')        ?? '0') || 0
  const page           = Math.max(1, parseInt(sp.get('page') ?? '1') || 1)

  const [gAuthRow, accessRow] = await Promise.all([
    prisma.setting.findUnique({ where: { key: 'tt_jwt_gauth'    } }),
    prisma.setting.findUnique({ where: { key: 'tt_access_token' } }),
  ])

  if (!gAuthRow?.value || !accessRow?.value) {
    return NextResponse.json({ error: 'not_connected' }, { status: 403 })
  }

  const body = {
    region: '', comuna: '', barrio: '', poi: '',
    tipoVista:               'lista',
    operacion:               2,
    idPoligono:              0,
    moneda:                  2,
    precioDesde:             precioDesdeUF,
    precioHasta:             precioHastaUF,
    dormitoriosDesde:        dormitorios,
    dormitoriosHasta:        0,
    banosDesde:              banos,
    banosHasta:              0,
    tipoPropiedad:           'departamento',
    estado:                  0,
    disponibilidadEntrega:   '',
    numeroDeDiasTocToc:      0,
    superficieDesdeUtil:     superfMin,
    superficieHastaUtil:     superfMax,
    superficieDesdeConstruida: 0,
    superficieHastaConstruida: 0,
    superficieDesdeTerraza:  0,
    superficieHastaTerraza:  0,
    superficieDesdeTerreno:  0,
    superficieHastaTerreno:  0,
    ordenarPor,
    pagina:                  page,
    paginaInterna:           1,
    zoom:                    15,
    idZonaHomogenea:         0,
    busqueda,
    viewport:                '',
    atributos:               [],
    publicador:              0,
    temporalidad:            0,
    limite:                  PAGE_SIZE,
    cargaBanner:             false,
    primeraCarga:            false,
    santander:               false,
  }

  // 1. Fetch
  let res: Response
  try {
    res = await fetch(TT_API, {
      method: 'POST',
      headers: {
        'Accept':          'application/json',
        'Content-Type':    'application/json',
        'x-access-token':  accessRow.value,
        'Cookie':          `tt-jwt-gauth=${gAuthRow.value}`,
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e)
    const cause = e instanceof Error && e.cause ? String(e.cause) : ''
    console.error('[arriendos/tt] fetch threw:', msg, cause)
    return NextResponse.json({ error: 'fetch_error', detail: `${msg}${cause ? ` | cause: ${cause}` : ''}` }, { status: 500 })
  }

  // 2. Dump response headers for debugging
  const resHeaders: Record<string, string> = {}
  res.headers.forEach((v, k) => { resHeaders[k] = v })
  const ct = resHeaders['content-type'] ?? '(none)'

  // Read body — try arrayBuffer first for reliability
  let rawText = ''
  try {
    const buf = await res.arrayBuffer()
    rawText = new TextDecoder().decode(buf)
  } catch {
    rawText = ''
  }

  // Diagnostic mode: if not 200, return full debug info
  if (res.status === 401 || res.status === 403) {
    return NextResponse.json({ error: 'token_expired', detail: `HTTP ${res.status} | ${ct}`, headers: resHeaders }, { status: 401 })
  }

  if (!res.ok || !rawText || !ct.includes('json')) {
    return NextResponse.json({
      error: 'tt_error',
      detail: `HTTP ${res.status} | ct: ${ct} | body(${rawText.length}): ${rawText.slice(0, 300)}`,
      headers: resHeaders,
    }, { status: 502 })
  }

  // 3. Parse JSON
  let data: any
  try {
    data = JSON.parse(rawText)
  } catch {
    return NextResponse.json({ error: 'parse_error', detail: `HTTP ${res.status} ${ct}: ${rawText.slice(0, 200)}` }, { status: 502 })
  }

  // 4. Extract results
  try {
    const resultados = data.resultados ?? {}
    const props: any[] = resultados.Propiedades ?? []
    const total: number = resultados.Total ?? props.length

    return NextResponse.json({
      results:  props.map(parseTtProp),
      total,
      page,
      pageSize: PAGE_SIZE,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    const keys = Object.keys(data ?? {}).join(', ')
    console.error('[arriendos/tt] data error:', msg, 'top keys:', keys)
    return NextResponse.json({ error: 'data_error', detail: `${msg} | keys: ${keys}` }, { status: 500 })
  }
}
