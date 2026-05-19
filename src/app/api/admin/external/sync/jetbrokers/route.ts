// src/app/api/admin/external/sync/jetbrokers/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

const JETBROKERS_URL = 'https://app.jetbrokers.io/api/projectstore-card/projects'
const JETBROKERS_TOKEN = 'Bearer PtDBqd29'

type JetBrokersProject = {
  id: string | number
  name: string
  locality: string
  dateOfDelivery: string
  yearOfDelivery: number
  stage: string
  available: boolean
  bestPrice: string
  developerName?: string
  organization?: { name: string }
  cover?: string
}

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let rawProjects: JetBrokersProject[]
  try {
    const res = await fetch(JETBROKERS_URL, {
      headers: {
        Authorization: JETBROKERS_TOKEN,
        device: 'w',
        'jet-brokers-version': '7.42.0',
      },
    })
    if (!res.ok) {
      return NextResponse.json(
        { error: `JetBrokers respondió con error ${res.status}` },
        { status: 502 }
      )
    }
    rawProjects = await res.json()
  } catch {
    return NextResponse.json({ error: 'Error de conexión con JetBrokers' }, { status: 502 })
  }

  if (!Array.isArray(rawProjects)) {
    return NextResponse.json({ error: 'Respuesta inesperada de JetBrokers' }, { status: 502 })
  }

  let synced = 0
  for (const p of rawProjects) {
    const priceRaw = parseFloat(p.bestPrice)
    const priceFrom = !isNaN(priceRaw) && priceRaw > 0 ? priceRaw : null
    const imageUrl = p.cover
      ? `https://app.jetbrokers.io/api/cover/${p.cover}`
      : null

    await prisma.externalProject.upsert({
      where: { source_sourceId: { source: 'jetbrokers', sourceId: String(p.id) } },
      create: {
        source: 'jetbrokers',
        sourceId: String(p.id),
        name: p.name.trim(),
        commune: p.locality ?? null,
        deliveryPeriod: p.dateOfDelivery ?? null,
        deliveryYear: p.yearOfDelivery ?? null,
        stage: p.stage ?? null,
        developerName: p.developerName ?? p.organization?.name ?? null,
        organizationName: p.organization?.name ?? null,
        priceFrom,
        imageUrl,
        typologies: [],
        rawData: p as object,
      },
      update: {
        name: p.name.trim(),
        commune: p.locality ?? null,
        deliveryPeriod: p.dateOfDelivery ?? null,
        deliveryYear: p.yearOfDelivery ?? null,
        stage: p.stage ?? null,
        developerName: p.developerName ?? p.organization?.name ?? null,
        organizationName: p.organization?.name ?? null,
        priceFrom,
        imageUrl,
        rawData: p as object,
      },
    })
    synced++
  }

  return NextResponse.json({ synced, total: rawProjects.length })
}
