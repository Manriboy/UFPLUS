// src/app/api/admin/iris/search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const IRIS_URL = 'https://iris-auth.infocasas.com.uy/api/projects/get-projects-search'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const token = process.env.IRIS_BEARER_TOKEN
  if (!token) return NextResponse.json({ error: 'Token de Iris no configurado' }, { status: 500 })

  const { page = 1, filter = {} } = await req.json()

  const irisBody = {
    limit: 12,
    page,
    filter: {
      country: [7],
      project_status: filter.project_status ?? [1, 2, 3],
      operation_type: 'Venta',
      identifiers: [],
      level: '2',
    },
    order: ['promos', 'popularity'],
  }

  let irisRes: Response
  try {
    irisRes = await fetch(IRIS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Origin': 'https://iris.yapo.cl',
        'Referer': 'https://iris.yapo.cl/',
      },
      body: JSON.stringify(irisBody),
    })
  } catch {
    return NextResponse.json({ error: 'Error de conexión con Iris' }, { status: 502 })
  }

  if (irisRes.status === 401) {
    return NextResponse.json({ error: 'Token de Iris expirado o inválido' }, { status: 401 })
  }
  if (!irisRes.ok) {
    return NextResponse.json({ error: `Iris respondió con error ${irisRes.status}` }, { status: 502 })
  }

  type IrisRawUnit = {
    id: number; description: string; tipology: string; bedrooms: number; bathrooms: number
    m2: number; m2_outdoor: number; price: number; final_price: number; currency: string
    floor: string; orientation: string | null; has_balcony: boolean; garages: number
    bonus_pie: number | null; plan: string
  }
  type IrisRawProject = {
    id: number; title: string; address: string; handover_date_text: string
    pie_bonus: boolean; pie_bonus_conditions: string | null; deposit: string | null
    commercial_conditions_description: string | null; images: string[]
    brochure: string | null; zone: { name: string } | null; department: { name: string } | null
    status: { name: string } | null; financial: { commission: { percent: number; full_value: string } | null } | null
    units: IrisRawUnit[]
  }
  type IrisResponse = { success: boolean; data: IrisRawProject[]; total: number; total_listed: number }

  const data = await irisRes.json() as IrisResponse

  // Filtramos bono pie si se solicitó (Iris no lo soporta como filtro nativo)
  let projects = data.data ?? []
  if (filter.pie_bonus === true) {
    projects = projects.filter((p) => p.pie_bonus === true)
  }

  // Mapeamos solo los campos que necesitamos — sin comisiones
  const mapped = projects.map((p) => ({
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
    zone: p.zone?.name ?? null,
    department: p.department?.name ?? null,
    status: p.status?.name ?? null,
    // Comisión — solo visible en panel admin
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
  }))

  return NextResponse.json({
    projects: mapped,
    total: data.total ?? mapped.length,
    page,
  })
}
