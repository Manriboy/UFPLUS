// src/lib/iris-token.ts
import prisma from './prisma'

const IRIS_LOGIN_URL = 'https://iris-auth.infocasas.com.uy/api/auth/login'

export async function refreshIrisToken(): Promise<string | null> {
  const username = process.env.IRIS_USERNAME
  const password = process.env.IRIS_PASSWORD
  const clientId = process.env.IRIS_CLIENT_ID

  if (!username || !password || !clientId) return null

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

    if (!res.ok) return null

    const data = await res.json()
    const token: string = data.access_token
    if (!token) return null

    await prisma.setting.upsert({
      where: { key: 'iris_token' },
      update: { value: token },
      create: { key: 'iris_token', value: token },
    })

    return token
  } catch {
    return null
  }
}
