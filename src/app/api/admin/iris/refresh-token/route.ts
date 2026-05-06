// src/app/api/admin/iris/refresh-token/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { refreshIrisToken } from '@/lib/iris-token'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const token = await refreshIrisToken()
  if (!token) {
    return NextResponse.json(
      { error: 'No se pudo renovar el token. Verifica las credenciales de Iris en las variables de entorno.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
