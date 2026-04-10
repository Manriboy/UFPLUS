// src/app/api/admin/stock/route.ts
// Admin CRUD for StockSource + read sync logs.
// GET    /api/admin/stock              → list all StockSources with project name + last log
// POST   /api/admin/stock              → create StockSource
// PUT    /api/admin/stock?id=          → update StockSource
// DELETE /api/admin/stock?id=          → delete StockSource

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

async function requireSession() {
  const session = await getServerSession(authOptions)
  if (!session) return null
  return session
}

export async function GET(req: NextRequest) {
  if (!(await requireSession())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const sources = await prisma.stockSource.findMany({
    include: {
      project: { select: { id: true, name: true, slug: true } },
      syncLogs: {
        orderBy: { startedAt: 'desc' },
        take: 1,
      },
      _count: { select: { units: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ sources })
}

export async function POST(req: NextRequest) {
  if (!(await requireSession())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const {
    projectId, driveFileId, sheetName, fileType, columnMapper, isActive,
    headerRow, precioEstacFijo, precioBodegaFijo,
    descuentoIndividual, descuentoValor, bonoPieIndividual, bonoPieValor,
  } = body

  if (!projectId || !driveFileId) {
    return NextResponse.json(
      { error: 'projectId y driveFileId son requeridos' },
      { status: 400 }
    )
  }

  const source = await prisma.stockSource.create({
    data: {
      projectId,
      driveFileId,
      sheetName: sheetName || null,
      fileType: fileType ?? 'GOOGLE_SHEETS',
      columnMapper: columnMapper ?? {},
      isActive: isActive ?? true,
      headerRow: headerRow ?? 1,
      precioEstacFijo: precioEstacFijo ?? null,
      precioBodegaFijo: precioBodegaFijo ?? null,
      descuentoIndividual: descuentoIndividual ?? false,
      descuentoValor: descuentoValor ?? null,
      bonoPieIndividual: bonoPieIndividual ?? false,
      bonoPieValor: bonoPieValor ?? null,
    },
  })

  return NextResponse.json({ source }, { status: 201 })
}

export async function PUT(req: NextRequest) {
  if (!(await requireSession())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  const body = await req.json()
  const {
    driveFileId, sheetName, fileType, columnMapper, isActive,
    headerRow, precioEstacFijo, precioBodegaFijo,
    descuentoIndividual, descuentoValor, bonoPieIndividual, bonoPieValor,
  } = body

  const source = await prisma.stockSource.update({
    where: { id },
    data: {
      ...(driveFileId !== undefined && { driveFileId }),
      ...(sheetName !== undefined && { sheetName: sheetName || null }),
      ...(fileType !== undefined && { fileType }),
      ...(columnMapper !== undefined && { columnMapper }),
      ...(isActive !== undefined && { isActive }),
      ...(headerRow !== undefined && { headerRow }),
      ...(precioEstacFijo !== undefined && { precioEstacFijo }),
      ...(precioBodegaFijo !== undefined && { precioBodegaFijo }),
      ...(descuentoIndividual !== undefined && { descuentoIndividual }),
      ...(descuentoValor !== undefined && { descuentoValor }),
      ...(bonoPieIndividual !== undefined && { bonoPieIndividual }),
      ...(bonoPieValor !== undefined && { bonoPieValor }),
    },
  })

  return NextResponse.json({ source })
}

export async function DELETE(req: NextRequest) {
  if (!(await requireSession())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  await prisma.stockSource.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
