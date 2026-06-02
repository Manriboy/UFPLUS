import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

const JB_TOKEN = process.env.JETBROKERS_TOKEN ?? 'PtDBqd29'

type JBUnit = {
  id: string
  number: string
  typology: string
  rooms: number
  bathrooms: number
  surfaceInterior: number
  surfaceTerrace: number
  surfaceTotal: number
  facing: string | null
  price: number
  finalPrice: number
  discountRate: number
  bonoPie: number
  available: boolean
  hasParking: boolean
  hasStorage: boolean
}

async function getJetBrokersUnits(sourceId: string): Promise<JBUnit[]> {
  // Leer desde BD (la API de JetBrokers bloquea requests server-to-server)
  const ep = await prisma.externalProject.findUnique({
    where: { source_sourceId: { source: 'jetbrokers', sourceId } },
    select: { id: true },
  })
  if (!ep) return []
  const units = await prisma.externalUnit.findMany({
    where: { projectId: ep.id, available: true },
    orderBy: [{ model: 'asc' }, { finalPrice: 'asc' }],
  })
  return units.map(u => ({
    id: u.sourceId,
    number: u.number ?? '',
    typology: u.model ?? '',
    rooms: u.bedrooms ?? 0,
    bathrooms: u.bathrooms ?? 0,
    surfaceInterior: u.m2Interior ?? 0,
    surfaceTerrace: u.m2Terrace ?? 0,
    surfaceTotal: (u.m2Interior ?? 0) + (u.m2Terrace ?? 0),
    facing: u.facing ?? null,
    price: u.price ?? 0,
    finalPrice: u.finalPrice ?? u.price ?? 0,
    discountRate: u.discountPct ?? 0,
    bonoPie: u.bonoPie ?? 0,
    available: u.available,
    hasParking: false,
    hasStorage: false,
  }))
}

async function getIrisUnits(projectId: string): Promise<JBUnit[]> {
  const units = await prisma.externalUnit.findMany({
    where: { projectId, source: 'iris', available: true },
    orderBy: [{ model: 'asc' }, { finalPrice: 'asc' }],
  })
  return units.map(u => ({
    id: u.sourceId,
    number: u.number ?? '',
    typology: u.model ?? '',
    rooms: u.bedrooms ?? 0,
    bathrooms: u.bathrooms ?? 0,
    surfaceInterior: u.m2Interior ?? 0,
    surfaceTerrace: u.m2Terrace ?? 0,
    surfaceTotal: (u.m2Interior ?? 0) + (u.m2Terrace ?? 0),
    facing: u.facing ?? null,
    price: u.price ?? 0,
    finalPrice: u.finalPrice ?? u.price ?? 0,
    discountRate: u.discountPct ?? 0,
    bonoPie: u.bonoPie ?? 0,
    available: u.available,
    hasParking: false,
    hasStorage: false,
  }))
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const { projectId, sourceId, source } = body as { projectId: string; sourceId: string; source: string }

  if (!sourceId || !source) {
    return NextResponse.json({ error: 'sourceId y source son requeridos' }, { status: 400 })
  }

  try {
    let units: JBUnit[]
    if (source === 'jetbrokers') {
      units = await getJetBrokersUnits(sourceId)
    } else if (source === 'iris') {
      // projectId is the ExternalProject.id (canonical links to it)
      const ep = await prisma.externalProject.findUnique({
        where: { source_sourceId: { source: 'iris', sourceId } },
        select: { id: true }
      })
      units = ep ? await getIrisUnits(ep.id) : []
    } else {
      return NextResponse.json({ error: `Fuente no soportada: ${source}` }, { status: 400 })
    }
    return NextResponse.json({ units, total: units.length })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
