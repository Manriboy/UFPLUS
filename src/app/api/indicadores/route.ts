// src/app/api/indicadores/route.ts
import { NextResponse } from 'next/server'
import { getIndicadores } from '@/lib/indicadores'

export const revalidate = 86400

export async function GET() {
  const data = await getIndicadores()
  if (!data) return NextResponse.json({ error: 'No disponible' }, { status: 503 })
  return NextResponse.json(data)
}
