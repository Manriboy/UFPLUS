// src/app/api/admin/iris/refresh-token/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

const IRIS_LOGIN_URL = 'https://iris-auth.infocasas.com.uy/api/auth/login'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const username = process.env.IRIS_USERNAME
  const password = process.env.IRIS_PASSWORD
  const clientId = process.env.IRIS_CLIENT_ID

  if (!username || !password || !clientId) {
    return NextResponse.json(
      { error: 'Credenciales de Iris no configuradas en el servidor' },
      { status: 500 }
    )
  }

  try {
    const res = await fetch(IRIS_LOGIN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': 'https://iris.yapo.cl',
        'Referer': 'https://iris.yapo.cl/',
      },
      body: new URLSearchParams({ username, password, client_id: clientId }).toString(),
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `Error al autenticar con Iris (${res.status})` },
        { status: 502 }
      )
    }

    const data = await res.json()
    const token: string = data.access_token

    if (!token) {
      return NextResponse.json({ error: 'Iris no devolvió un token válido' }, { status: 502 })
    }

    // Guardar el nuevo token en la BD (persiste en Vercel)
    await prisma.setting.upsert({
      where: { key: 'iris_token' },
      update: { value: token },
      create: { key: 'iris_token', value: token },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error de conexión con Iris' }, { status: 502 })
  }
}
