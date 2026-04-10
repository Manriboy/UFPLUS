// src/app/api/admin/stock/preview/route.ts
// Conecta al archivo y devuelve la lista de columnas detectadas en la fila indicada.
// POST /api/admin/stock/preview
// Body: { driveFileId, fileType, sheetName?, headerRow? }

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { fetchHeaders } from '@/lib/stock-sync'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const { driveFileId, fileType, sheetName, headerRow } = body

  if (!driveFileId || !fileType) {
    return NextResponse.json({ error: 'driveFileId y fileType son requeridos' }, { status: 400 })
  }

  try {
    const columns = await fetchHeaders(
      driveFileId,
      fileType,
      sheetName || null,
      headerRow ? parseInt(headerRow, 10) : 1
    )
    return NextResponse.json({ columns })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al conectar con el archivo'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
