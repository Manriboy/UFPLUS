// src/app/api/admin/iris/search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { IRIS_REGIONS } from '@/lib/iris-zones'

const IRIS_URL = 'https://iris-auth.infocasas.com.uy/api/projects/get-projects-search'
const PAGE_SIZE = 12

// ─── Tipos internos (Iris) ────────────────────────────

type IrisRawUnit = {
  id: number; description: string; tipology: string
  bedrooms: number; bathrooms: number; m2: number; m2_outdoor: number
  price: number; final_price: number; currency: string; floor: string
  orientation: string | null; has_balcony: boolean; garages: number
  bonus_pie: number | null; plan: string
}

type IrisRawProject = {
  id: number; title: string; address: string; handover_date_text: string
  pie_bonus: boolean; pie_bonus_conditions: string | null; deposit: string | null
  commercial_conditions_description: string | null; images: string[]
  brochure: string | null
  zone: { id: number; name: string } | null
  department: { id: number; name: string } | null
  status: { name: string } | null
  financial: { commission: { percent: number; full_value: string } | null } | null
  units: IrisRawUnit[]
}

type IrisResponse = {
  success: boolean; data: IrisRawProject[]; total: number; total_listed: number
}

// ─── Tipo unificado de resultado ──────────────────────

type MappedUnit = {
  id: string | number; description: string; tipology: string
  bedrooms: number; bathrooms: number; m2: number
  price: number; final_price: number; currency: string
  floor: string; orientation: string | null; has_balcony: boolean
  garages: number; bonus_pie: number | null; plan: string
}

type MappedProject = {
  id: string | number
  source: 'iris' | 'ufplus'
  title: string; address: string; handover_date_text: string
  pie_bonus: boolean; pie_bonus_conditions: string | null; deposit: string | null
  images: string[]; brochure: string | null
  zone: { id: number; name: string } | null
  department: string | null; status: string | null
  units: MappedUnit[]
}

// ─── Helpers de tipología ─────────────────────────────

function parseBedroomsFromString(t: string | null): number {
  if (!t) return -1
  const lower = t.toLowerCase()
  if (lower.includes('estudio') || lower.includes('studio') || lower === 'e') return 0
  const match = lower.match(/(\d+)\s*d/)
  return match ? parseInt(match[1]) : -1
}

function parseBathroomsFromString(t: string | null): number {
  if (!t) return -1
  const lower = t.toLowerCase()
  const match = lower.match(/\d+\s*d[^0-9]*(\d+)\s*b/)
  return match ? parseInt(match[1]) : -1
}

function matchesTipologia(
  unit: { bedrooms: number; bathrooms: number; tipology: string },
  tipologias: string[]
): boolean {
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

function matchesTipologiaUFPlus(
  unit: { tipologia: string | null; precioUf: number | null },
  tipologias: string[]
): boolean {
  const bedrooms = parseBedroomsFromString(unit.tipologia)
  const bathrooms = parseBathroomsFromString(unit.tipologia)
  const tipology = unit.tipologia ?? ''

  return tipologias.some((t) => {
    if (t === 'Oficina') return tipology.toLowerCase().includes('oficin')
    if (t === 'Estudio') return bedrooms === 0
    if (t === '1D1B') return bedrooms === 1 && (bathrooms === 1 || bathrooms === -1)
    if (t === '2D1B') return bedrooms === 2 && bathrooms === 1
    if (t === '2D2B') return bedrooms === 2 && (bathrooms === 2 || bathrooms === -1)
    if (t === '3D1B') return bedrooms === 3 && bathrooms === 1
    if (t === '3D2B') return bedrooms === 3 && (bathrooms === 2 || bathrooms === -1)
    if (t === '3D3B') return bedrooms === 3 && bathrooms === 3
    return false
  })
}

// ─── Helpers de delivery type ─────────────────────────

function deliveryTypeToText(dt: string): string {
  const map: Record<string, string> = {
    IMMEDIATE: 'Entrega inmediata',
    IN_CONSTRUCTION: 'En construcción',
    SOON: 'Entrega próxima',
    FUTURE: 'En planos',
  }
  return map[dt] ?? dt
}

function deliveryTypeToStatus(dt: string): string {
  const map: Record<string, string> = {
    IMMEDIATE: 'A estrenar',
    IN_CONSTRUCTION: 'En construcción',
    SOON: 'En construcción',
    FUTURE: 'En planos',
  }
  return map[dt] ?? dt
}

// ─── Fetch a Iris ─────────────────────────────────────

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

// ─── Mapeo Iris → MappedProject ───────────────────────

function mapIrisProject(p: IrisRawProject): MappedProject {
  return {
    id: p.id,
    source: 'iris',
    title: p.title,
    address: p.address,
    handover_date_text: p.handover_date_text,
    pie_bonus: p.pie_bonus,
    pie_bonus_conditions: p.pie_bonus_conditions,
    deposit: p.deposit,
    images: (p.images ?? []).slice(0, 3),
    brochure: p.brochure ?? null,
    zone: p.zone ? { id: p.zone.id, name: p.zone.name } : null,
    department: p.department?.name ?? null,
    status: p.status?.name ?? null,
    // commission omitida intencionalmente — no se expone al cliente
    units: (p.units ?? []).map((u) => ({
      id: u.id,
      description: u.description,
      tipology: u.tipology,
      bedrooms: u.bedrooms,
      bathrooms: u.bathrooms,
      m2: u.m2,
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

// ─── Mapeo UFPlus → MappedProject ────────────────────

type UFPlusProject = Awaited<ReturnType<typeof fetchUFPlusProjects>>[number]

function mapUFPlusProject(p: UFPlusProject): MappedProject {
  const hasUnits = p.units.length > 0

  const bonoPieValues = p.units.map((u) => u.bonoPie ?? 0).filter((v) => v > 0)
  const hasBonoPie = bonoPieValues.length > 0
  const maxBonoPie = hasBonoPie ? Math.max(...bonoPieValues) : 0

  const unitsMapped: MappedUnit[] = hasUnits
    ? p.units.map((u) => ({
        id: u.id,
        description: u.tipologia ?? '',
        tipology: u.tipologia ?? '',
        bedrooms: parseBedroomsFromString(u.tipologia),
        bathrooms: parseBathroomsFromString(u.tipologia),
        m2: u.supTotal ?? u.supInterior ?? 0,
        price: u.precioUf ?? p.priceFrom ?? 0,
        final_price: u.precioUf
          ? u.descuento ? u.precioUf * (1 - u.descuento / 100) : u.precioUf
          : p.priceFrom ?? 0,
        currency: 'UF',
        floor: u.piso?.toString() ?? '',
        orientation: u.orientacion ?? null,
        has_balcony: false,
        garages: 0,
        bonus_pie: u.bonoPie ?? null,
        plan: '',
      }))
    : p.typologies.map((t) => ({
        id: t.id,
        description: t.name,
        tipology: t.name,
        bedrooms: parseBedroomsFromString(t.name),
        bathrooms: parseBathroomsFromString(t.name),
        m2: t.totalArea ?? t.usefulArea ?? 0,
        price: t.priceFrom ?? p.priceFrom ?? 0,
        final_price: t.priceFrom ?? p.priceFrom ?? 0,
        currency: 'UF',
        floor: '',
        orientation: null,
        has_balcony: false,
        garages: 0,
        bonus_pie: null,
        plan: '',
      }))

  return {
    id: `ufplus-${p.id}`,
    source: 'ufplus',
    title: p.name,
    address: p.address ?? '',
    handover_date_text: deliveryTypeToText(p.deliveryType),
    pie_bonus: hasBonoPie,
    pie_bonus_conditions: hasBonoPie ? maxBonoPie.toString() : null,
    deposit: null,
    images: p.images.map((img) => img.url),
    brochure: null,
    zone: p.commune ? { id: 0, name: p.commune } : null,
    department: p.region ?? null,
    status: deliveryTypeToStatus(p.deliveryType),
    units: unitsMapped,
  }
}

// ─── Fetch proyectos UFPlus ───────────────────────────

async function fetchUFPlusProjects(cleanZoneNames: string[]) {
  return prisma.project.findMany({
    where: {
      isActive: true,
      isArchived: false,
      ...(cleanZoneNames.length > 0 ? {
        OR: cleanZoneNames.map((name) => ({
          commune: { contains: name, mode: 'insensitive' as const },
        })),
      } : {}),
    },
    include: {
      images: { orderBy: [{ isMain: 'desc' }, { sortOrder: 'asc' }], take: 3 },
      typologies: { orderBy: { sortOrder: 'asc' } },
      units: { where: { disponible: true }, orderBy: { precioUf: 'asc' } },
    },
  })
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
  const zoneIds: number[] = filter.zone_ids ?? []
  const tipologias: string[] = filter.tipologias ?? []
  const priceMin: number | null = filter.price_min ?? null
  const priceMax: number | null = filter.price_max ?? null
  const bonoPieMin: number = filter.pie_bonus_min ?? 0
  const applyPrice = (priceMin !== null && priceMin > 0) || (priceMax !== null && priceMax < 15000)

  // Nombres de zonas seleccionadas (para filtrar UFPlus)
  const zoneNames = zoneIds
    .map((id) => {
      for (const region of IRIS_REGIONS) {
        const zone = region.zones.find((z) => z.id === id)
        if (zone) return zone.name
      }
      return null
    })
    .filter((n): n is string => n !== null)

  // Limpiar nombres: quitar " / Metropolitana" u otros sufijos
  const cleanZoneNames = zoneNames.map((n) => n.replace(/\s*\/.*$/, '').trim())

  // ── 1. Fetch Iris (primera página para saber total) ──
  let firstRes: Response
  try {
    firstRes = await fetchIrisPage(1, projectStatus, token)
  } catch {
    return NextResponse.json({ error: 'Error de conexión con Iris' }, { status: 502 })
  }

  if (firstRes.status === 401) {
    return NextResponse.json(
      { error: 'Token de Iris expirado — renuévalo desde DevTools en iris.yapo.cl' },
      { status: 401 }
    )
  }
  if (!firstRes.ok) {
    return NextResponse.json({ error: `Iris respondió con error ${firstRes.status}` }, { status: 502 })
  }

  const firstData = await firstRes.json() as IrisResponse
  const totalIrisPages = Math.ceil((firstData.total ?? 0) / PAGE_SIZE)

  // Fetch todas las páginas restantes en paralelo + UFPlus simultáneamente
  const [remainingPages, ufplusRaw] = await Promise.all([
    totalIrisPages > 1
      ? Promise.all(
          Array.from({ length: totalIrisPages - 1 }, (_, i) =>
            fetchIrisPage(i + 2, projectStatus, token)
              .then((r) => r.json() as Promise<IrisResponse>)
              .then((d) => d.data ?? [])
              .catch(() => [] as IrisRawProject[])
          )
        )
      : Promise.resolve([] as IrisRawProject[][]),
    fetchUFPlusProjects(cleanZoneNames),
  ])

  const allIrisRaw: IrisRawProject[] = [...(firstData.data ?? []), ...remainingPages.flat()]

  // ── 2. Filtrar Iris ───────────────────────────────────

  let filteredIris = allIrisRaw

  if (zoneIds.length > 0) {
    filteredIris = filteredIris.filter((p) => p.zone && zoneIds.includes(p.zone.id))
  }
  if (tipologias.length > 0) {
    filteredIris = filteredIris.filter((p) =>
      p.units.some((u) => matchesTipologia(u, tipologias))
    )
  }
  if (applyPrice) {
    filteredIris = filteredIris.filter((p) =>
      p.units.some((u) => {
        const price = u.final_price || u.price
        if (priceMin !== null && price < priceMin) return false
        if (priceMax !== null && price > priceMax) return false
        return true
      })
    )
  }
  if (bonoPieMin > 0) {
    filteredIris = filteredIris.filter(
      (p) => p.pie_bonus && parseFloat(p.pie_bonus_conditions ?? '0') >= bonoPieMin
    )
  }

  // ── 3. Filtrar UFPlus ─────────────────────────────────

  let filteredUFPlus = ufplusRaw

  if (tipologias.length > 0) {
    filteredUFPlus = filteredUFPlus.filter((p) => {
      const units = p.units.length > 0 ? p.units : []
      const typos = p.typologies
      return (
        units.some((u) => matchesTipologiaUFPlus(u, tipologias)) ||
        typos.some((t) => {
          const bed = parseBedroomsFromString(t.name)
          const bath = parseBathroomsFromString(t.name)
          return matchesTipologia({ bedrooms: bed, bathrooms: bath, tipology: t.name }, tipologias)
        })
      )
    })
  }
  if (applyPrice) {
    filteredUFPlus = filteredUFPlus.filter((p) => {
      const prices = [
        ...p.units.map((u) => u.precioUf).filter((v): v is number => v !== null),
        ...p.typologies.map((t) => t.priceFrom).filter((v): v is number => v !== null),
        p.priceFrom,
      ].filter((v): v is number => v !== null && v > 0)
      return prices.some((price) => {
        if (priceMin !== null && price < priceMin) return false
        if (priceMax !== null && price > priceMax) return false
        return true
      })
    })
  }
  if (bonoPieMin > 0) {
    filteredUFPlus = filteredUFPlus.filter((p) =>
      p.units.some((u) => (u.bonoPie ?? 0) >= bonoPieMin)
    )
  }

  // ── 4. Unificar y paginar (UFPlus primero) ────────────

  const combined: MappedProject[] = [
    ...filteredUFPlus.map(mapUFPlusProject),
    ...filteredIris.map(mapIrisProject),
  ]

  const totalCombined = combined.length
  const start = (page - 1) * PAGE_SIZE
  const paginated = combined.slice(start, start + PAGE_SIZE)

  return NextResponse.json({ projects: paginated, total: totalCombined, page })
}
