// src/app/api/admin/stock/preview/route.ts
// POST /api/admin/stock/preview
// Conecta al archivo, devuelve columnas detectadas + primeras filas de datos para verificación.

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { fetchHeaders, fetchPreviewRows } from '@/lib/stock-sync'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const { driveFileId, fileType, sheetName, headerRow } = body

  if (!driveFileId || !fileType) {
    return NextResponse.json({ error: 'driveFileId y fileType son requeridos' }, { status: 400 })
  }

  const row = headerRow ? parseInt(headerRow, 10) : 1

  try {
    const [columns, sampleRows] = await Promise.all([
      fetchHeaders(driveFileId, fileType, sheetName || null, row),
      fetchPreviewRows(driveFileId, fileType, sheetName || null, row, 3),
    ])
    return NextResponse.json({ columns, sampleRows })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al conectar con el archivo'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
