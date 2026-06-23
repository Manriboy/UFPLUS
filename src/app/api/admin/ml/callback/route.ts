// src/app/api/admin/ml/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.redirect(new URL('/login', req.url))

  const code  = req.nextUrl.searchParams.get('code')
  const error = req.nextUrl.searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(new URL('/admin/arriendos/conectar?error=denied', req.url))
  }

  const clientId     = process.env.ML_CLIENT_ID!
  const clientSecret = process.env.ML_CLIENT_SECRET!
  const appUrl      = (process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? '').replace(/\/$/, '')
  const redirectUri = `${appUrl}/api/admin/ml/callback`

  try {
    const res = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'authorization_code',
        client_id:     clientId,
        client_secret: clientSecret,
        code,
        redirect_uri:  redirectUri,
      }),
    })

    if (!res.ok) {
      const detail = await res.text()
      console.error('[ml/callback] Token exchange failed:', res.status, detail)
      return NextResponse.redirect(new URL('/admin/arriendos/conectar?error=token', req.url))
    }

    const data = await res.json()
    const expiresAt = Date.now() + data.expires_in * 1000

    // Guardar en DB usando la tabla Setting existente
    await Promise.all([
      prisma.setting.upsert({
        where: { key: 'ml_access_token' },
        create: { key: 'ml_access_token', value: data.access_token },
        update: { value: data.access_token },
      }),
      prisma.setting.upsert({
        where: { key: 'ml_refresh_token' },
        create: { key: 'ml_refresh_token', value: data.refresh_token },
        update: { value: data.refresh_token },
      }),
      prisma.setting.upsert({
        where: { key: 'ml_token_expires_at' },
        create: { key: 'ml_token_expires_at', value: String(expiresAt) },
        update: { value: String(expiresAt) },
      }),
    ])

    return NextResponse.redirect(new URL('/admin/arriendos/conectar?success=1', req.url))
  } catch (e) {
    console.error('[ml/callback] Error:', e)
    return NextResponse.redirect(new URL('/admin/arriendos/conectar?error=server', req.url))
  }
}
