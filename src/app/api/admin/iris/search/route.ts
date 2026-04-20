// src/app/api/admin/iris/search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const IRIS_URL = 'https://iris-auth.infocasas.com.uy/api/projects/get-projects-search'
const PAGE_SIZE = 12

// ─── Raw Iris types ───────────────────────────────────

type IrisRawUnit = {
  id: number
  description: string
  tipology: string
  bedrooms: number
  bathrooms: number
  m2: number
  m2_outdoor: number
  price: number
  final_price: number
  currency: string
  floor: string
  orientation: string | null
  has_balcony: boolean
  garages: number
  bonus_pie: number | null
  plan: string
}

type IrisRawProject = {
  id: number
  title: string
  address: string
  handover_date_text: string
  pie_bonus: boolean
  pie_bonus_conditions: string | null
  deposit: string | null
  commercial_conditions_description: string | null
  images: string[]
  brochure: string | null
  zone: { id: number; name: string } | null
  department: { id: number; name: string } | null
  status: { name: string } | null
  financial: {
    commission: { percent: number; full_value: string } | null
  } | null
  units: IrisRawUnit[]
}

type IrisResponse = {
  success: boolean
  data: IrisRawProject[]
  total: number
  total_listed: number
}

// ─── Helpers ─────────────────────────────────────────

function matchesTipologia(unit: IrisRawUnit, tipologias: string[]): boolean {
  return tipologias.some((t) => {
    if (t === 'Oficina') return unit.tipology?.toLowerCase().includes('oficin')
    if (t === 'Estudio') return unit.bedrooms === 0
    if (t === '1D1B') return unit.bedrooms === 1 && unit.bathrooms === 1
    if (t === '2D1B') return unit.bedrooms === 2 && unit.bathrooms === 1
    if (t === '2D2B') return unit.bedrooms === 2 && unit.bathrooms === 2
    if (t === '3D1B') return unit.bedrooms === 3 && unit.bathrooms === 1
    if (t === '3D2B') return unit.bedrooms === 3 && unit.bathrooms === 2
    if (t === '3D3B') return unit.bedrooms === 3 && unit.bathrooms === 3
    return false
  })
}

async function fetchIrisPage(page: number, projectStatus: number[], token: string) {
  return fetch(IRIS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Origin': 'https://iris.yapo.cl',
      'Referer': 'https://iris.yapo.cl/',
    },
    body: JSON.stringify({
      limit: PAGE_SIZE,
      page,
      filter: {
        country: [7],
        project_status: projectStatus,
        operation_type: 'Venta',
        identifiers: [],
        level: '2',
      },
      order: ['promos', 'popularity'],
    }),
  })
}

function mapProject(p: IrisRawProject) {
  return {
    id: p.id,
    title: p.title,
    address: p.address,
    handover_date_text: p.handover_date_text,
    pie_bonus: p.pie_bonus,
    pie_bonus_conditions: p.pie_bonus_conditions,
    deposit: p.deposit,
    commercial_conditions_description: p.commercial_conditions_description,
    images: (p.images ?? []).slice(0, 3),
    brochure: p.brochure ?? null,
    zone: p.zone ? { id: p.zone.id, name: p.zone.name } : null,
    department: p.department?.name ?? null,
    status: p.status?.name ?? null,
    commission: p.financial?.commission
      ? { percent: p.financial.commission.percent, full_value: p.financial.commission.full_value }
      : null,
    units: (p.units ?? []).map((u) => ({
      id: u.id,
      description: u.description,
      tipology: u.tipology,
      bedrooms: u.bedrooms,
      bathrooms: u.bathrooms,
      m2: u.m2,
      m2_outdoor: u.m2_outdoor,
      price: u.price,
      final_price: u.final_price,
      currency: u.currency,
      floor: u.floor,
      orientation: u.orientation,
      has_balcony: u.has_balcony,
      garages: u.garages,
      bonus_pie: u.bonus_pie,
      plan: u.plan,
    })),
  }
}

// ─── POST handler ─────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const token = process.env.IRIS_BEARER_TOKEN
  if (!token) return NextResponse.json({ error: 'Token de Iris no configurado' }, { status: 500 })

  const body = await req.json()
  const page: number = body.page ?? 1
  const filter = body.filter ?? {}
  const projectStatus: number[] = filter.project_status ?? [1, 2, 3]

  // 1. Fetch primera página para saber el total
  let firstRes: Response
  try {
    firstRes = await fetchIrisPage(1, projectStatus, token)
  } catch {
    return NextResponse.json({ error: 'Error de conexión con Iris' }, { status: 502 })
  }

  if (firstRes.status === 401) {
    return NextResponse.json({ error: 'Token de Iris expirado — renuévalo desde DevTools en iris.yapo.cl' }, { status: 401 })
  }
  if (!firstRes.ok) {
    return NextResponse.json({ error: `Iris respondió con error ${firstRes.status}` }, { status: 502 })
  }

  const firstData = await firstRes.json() as IrisResponse
  const irisTotal = firstData.total ?? 0
  const totalIrisPages = Math.ceil(irisTotal / PAGE_SIZE)

  // 2. Fetch páginas restantes en paralelo para poder filtrar sobre el total
  let allRaw: IrisRawProject[] = [...(firstData.data ?? [])]
  if (totalIrisPages > 1) {
    const remainingPages = await Promise.all(
      Array.from({ length: totalIrisPages - 1 }, (_, i) =>
        fetchIrisPage(i + 2, projectStatus, token)
          .then((r) => r.json() as Promise<IrisResponse>)
          .then((d) => d.data ?? [])
          .catch(() => [] as IrisRawProject[])
      )
    )
    allRaw = [...allRaw, ...remainingPages.flat()]
  }

  // 3. Aplicar filtros server-side
  let filtered = allRaw

  // Filtro por zona/comuna
  const zoneIds: number[] = filter.zone_ids ?? []
  if (zoneIds.length > 0) {
    filtered = filtered.filter((p) => p.zone && zoneIds.includes(p.zone.id))
  }

  // Filtro por tipología (bedrooms/bathrooms)
  const tipologias: string[] = filter.tipologias ?? []
  if (tipologias.length > 0) {
    filtered = filtered.filter((p) =>
      p.units.some((u) => matchesTipologia(u, tipologias))
    )
  }

  // Filtro por precio (UF) — aplica si alguna unidad del proyecto está en rango
  const priceMin: number | null = filter.price_min ?? null
  const priceMax: number | null = filter.price_max ?? null
  const applyPrice = (priceMin !== null && priceMin > 0) || (priceMax !== null && priceMax < 15000)
  if (applyPrice) {
    filtered = filtered.filter((p) =>
      p.units.some((u) => {
        const price = u.final_price || u.price
        if (priceMin !== null && price < priceMin) return false
        if (priceMax !== null && price > priceMax) return false
        return true
      })
    )
  }

  // Filtro por % mínimo de bono pie
  const bonoPieMin: number = filter.pie_bonus_min ?? 0
  if (bonoPieMin > 0) {
    filtered = filtered.filter(
      (p) => p.pie_bonus && parseFloat(p.pie_bonus_conditions ?? '0') >= bonoPieMin
    )
  }

  // 4. Paginar resultados filtrados
  const totalFiltered = filtered.length
  const start = (page - 1) * PAGE_SIZE
  const paginated = filtered.slice(start, start + PAGE_SIZE)

  return NextResponse.json({
    projects: paginated.map(mapProject),
    total: totalFiltered,
    page,
  })
}
