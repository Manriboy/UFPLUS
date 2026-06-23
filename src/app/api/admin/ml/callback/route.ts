// src/app/api/admin/ml/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.redirect(new URL('/admin/arriendos/conectar?error=no_session', req.url))

    const code  = req.nextUrl.searchParams.get('code')
    const error = req.nextUrl.searchParams.get('error')

    if (error || !code) {
      return NextResponse.redirect(new URL('/admin/arriendos/conectar?error=denied', req.url))
    }

    const clientId     = process.env.ML_CLIENT_ID ?? ''
    const clientSecret = process.env.ML_CLIENT_SECRET ?? ''
    const appUrl       = (process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? '').replace(/\/$/, '')
    const redirectUri  = `${appUrl}/api/admin/ml/callback`

    console.log('[ml/callback] clientId:', clientId ? `${clientId.slice(0, 6)}...` : 'EMPTY')
    console.log('[ml/callback] redirectUri:', redirectUri)

    // 1. Intercambiar code por tokens
    let tokenData: { access_token: string; refresh_token: string; expires_in: number }
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

      const body = await res.text()
      if (!res.ok) {
        console.error('[ml/callback] Token exchange failed:', res.status, body)
        return NextResponse.redirect(new URL(`/admin/arriendos/conectar?error=token&detail=${encodeURIComponent(body.slice(0, 100))}`, req.url))
      }
      tokenData = JSON.parse(body)
    } catch (e) {
      console.error('[ml/callback] Token fetch threw:', e)
      return NextResponse.redirect(new URL('/admin/arriendos/conectar?error=token_fetch', req.url))
    }

    // 2. Guardar tokens en DB
    try {
      const expiresAt = Date.now() + tokenData.expires_in * 1000
      await Promise.all([
        prisma.setting.upsert({
          where:  { key: 'ml_access_token' },
          create: { key: 'ml_access_token',  value: tokenData.access_token },
          update: { value: tokenData.access_token },
        }),
        prisma.setting.upsert({
          where:  { key: 'ml_refresh_token' },
          create: { key: 'ml_refresh_token', value: tokenData.refresh_token ?? '' },
          update: { value: tokenData.refresh_token ?? '' },
        }),
        prisma.setting.upsert({
          where:  { key: 'ml_token_expires_at' },
          create: { key: 'ml_token_expires_at', value: String(expiresAt) },
          update: { value: String(expiresAt) },
        }),
      ])
    } catch (e) {
      console.error('[ml/callback] DB save threw:', e)
      return NextResponse.redirect(new URL('/admin/arriendos/conectar?error=db', req.url))
    }

    return NextResponse.redirect(new URL('/admin/arriendos/conectar?success=1', req.url))
  } catch (e) {
    console.error('[ml/callback] Unexpected error:', e)
    return NextResponse.redirect(new URL('/admin/arriendos/conectar?error=server', req.url))
  }
}
