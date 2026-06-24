// src/app/api/admin/arriendos/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const ML_API      = 'https://api.mercadolibre.com'
const ML_CATEGORY = 'MLC1459'
const ML_PAGE_SIZE = 48

// ── Token de usuario (authorization_code) con refresh automático ──────────────
async function getUserToken(): Promise<string | null> {
  try {
    const [atRow, rtRow, expRow] = await Promise.all([
      prisma.setting.findUnique({ where: { key: 'ml_access_token' } }),
      prisma.setting.findUnique({ where: { key: 'ml_refresh_token' } }),
      prisma.setting.findUnique({ where: { key: 'ml_token_expires_at' } }),
    ])

    if (!atRow || !rtRow) return null

    const expiresAt = expRow ? Number(expRow.value) : 0
    const needsRefresh = Date.now() > expiresAt - 5 * 60 * 1000 // 5 min buffer

    if (!needsRefresh) return atRow.value

    // Refrescar token
    const res = await fetch(`${ML_API}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'refresh_token',
        client_id:     process.env.ML_CLIENT_ID!,
        client_secret: process.env.ML_CLIENT_SECRET!,
        refresh_token: rtRow.value,
      }),
    })

    if (!res.ok) {
      console.error('[arriendos] Refresh failed:', res.status, await res.text())
      return atRow.value // devolver el token viejo como fallback
    }

    const data = await res.json()
    const newExpiry = Date.now() + data.expires_in * 1000

    await Promise.all([
      prisma.setting.update({ where: { key: 'ml_access_token' }, data: { value: data.access_token } }),
      prisma.setting.update({ where: { key: 'ml_refresh_token' }, data: { value: data.refresh_token } }),
      prisma.setting.upsert({
        where: { key: 'ml_token_expires_at' },
        create: { key: 'ml_token_expires_at', value: String(newExpiry) },
        update: { value: String(newExpiry) },
      }),
    ])

    return data.access_token
  } catch (e) {
    console.error('[arriendos] getUserToken error:', e)
    return null
  }
}

// ── Normalizar resultado ML ───────────────────────────────────────────────────
type MlAttribute = { id: string; value_name: string | null }
type MlRawResult = {
  id: string
  title: string
  price: number
  currency_id: string
  thumbnail: string
  permalink: string
  location?: { latitude?: number; longitude?: number }
  address?: { neighborhood_name?: string; city_name?: string }
  attributes: MlAttribute[]
}

function getAttribute(attrs: MlAttribute[], id: string): string | null {
  return attrs.find(a => a.id === id)?.value_name ?? null
}

function parseArea(v: string | null): number | null {
  if (!v) return null
  const n = parseFloat(v.replace(/[^\d.]/g, ''))
  return isNaN(n) ? null : n
}

function normalize(item: MlRawResult) {
  const attrs = item.attributes ?? []
  return {
    id:          item.id,
    title:       item.title,
    price:       item.price,
    currencyId:  item.currency_id,
    thumbnail:   item.thumbnail,
    permalink:   item.permalink,
    commune:     item.address?.neighborhood_name ?? item.address?.city_name ?? null,
    bedrooms:    parseInt(getAttribute(attrs, 'BEDROOMS') ?? '') || null,
    bathrooms:   parseInt(getAttribute(attrs, 'BATHROOMS') ?? '') || null,
    coveredArea: parseArea(getAttribute(attrs, 'COVERED_AREA')),
    totalArea:   parseArea(getAttribute(attrs, 'TOTAL_AREA')),
    floor:       getAttribute(attrs, 'FLOOR'),
    lat:         item.location?.latitude ?? null,
    lng:         item.location?.longitude ?? null,
  }
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const sp          = req.nextUrl.searchParams
  const zona        = sp.get('zona')?.trim() ?? ''
  const dormitorios = parseInt(sp.get('dormitorios') ?? '0')
  const banos       = parseInt(sp.get('banos') ?? '0')
  const precioMin   = parseInt(sp.get('precioMin') ?? '0')
  const precioMax   = parseInt(sp.get('precioMax') ?? '0')
  const offset      = parseInt(sp.get('offset') ?? '0')

  // Verificar que la cuenta esté conectada (token en DB)
  const token = await getUserToken()
  if (!token) {
    return NextResponse.json({ error: 'not_connected', message: 'Conecta tu cuenta de Mercado Libre primero' }, { status: 403 })
  }

  // Construir query de texto para ML
  const queryParts = ['arriendo departamento']
  if (zona)            queryParts.push(zona)
  if (dormitorios > 0) queryParts.push(`${dormitorios} dormitorios`)
  if (banos > 0)       queryParts.push(`${banos} baños`)

  const params = new URLSearchParams({
    category: ML_CATEGORY,
    q:        queryParts.join(' '),
    limit:    String(ML_PAGE_SIZE),
    offset:   String(offset),
  })
  if (precioMin > 0) params.set('price_from', String(precioMin))
  if (precioMax > 0) params.set('price_to',   String(precioMax))

  try {
    const url = `${ML_API}/sites/MLC/search?${params}`
    console.log('[arriendos] search url:', url)

    // Intentar con token primero; si falla con 401/403, reintentar sin auth
    let res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })

    if (res.status === 401 || res.status === 403) {
      console.warn('[arriendos] token rejected, retrying without auth')
      res = await fetch(url)
    }

    if (!res.ok) {
      const err = await res.text()
      console.error('[arriendos] ML search error:', res.status, err)
      return NextResponse.json({ error: 'Error de conexión', mlStatus: res.status, mlDetail: err.slice(0, 300) }, { status: 502 })
    }

    const data = await res.json()
    return NextResponse.json({
      results:  (data.results ?? []).map(normalize),
      total:    data.paging?.total ?? 0,
      offset:   data.paging?.offset ?? 0,
      pageSize: ML_PAGE_SIZE,
    })
  } catch (e) {
    console.error('[arriendos] fetch error:', e)
    return NextResponse.json({ error: 'Error de conexión' }, { status: 500 })
  }
}
