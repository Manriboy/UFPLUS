// Ejecutado diariamente por Vercel Cron para verificar si el token de Brouk sigue válido.
// No puede renovarlo automáticamente (Brouk no expone endpoint de login programático),
// pero actualiza el estado en BD para que el admin muestre alertas proactivas.
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

const APP_ID    = 'e4f62324-96a7-44cd-9cb1-3350520dc92e'
const PROBE_URL = `https://www.brouk.cl/v1/datasource/applications/${APP_ID}/pages/2298f6cc-818f-4fd9-bc33-ef2e7d968886/blocks/aa858c9d-2cbb-4849-b8cc-3cf28dc7418e/datasources/89a2fee8-4edd-450c-8da8-e4ea3176a83a/records`

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const setting = await prisma.setting.findUnique({ where: { key: 'brouk_token' } })
  const token   = setting?.value || process.env.BROUK_JWT_TOKEN

  if (!token) {
    await setStatus('no_token')
    return NextResponse.json({ status: 'no_token' })
  }

  try {
    const ctrl  = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 20_000)
    const res   = await fetch(PROBE_URL, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `jwtToken=${token}; signInRedirectionUrl=%2F`,
        'Origin': 'https://www.brouk.cl',
        'Referer': 'https://www.brouk.cl/showroom',
        'x-user-timezone': 'America/Santiago',
      },
      body: JSON.stringify({
        options: { timeZone: 'America/Santiago', userLocale: 'en-US' },
        pageContext: null, filterCriteria: {},
        pagingOption: { offset: null, count: 1 },
      }),
    }).finally(() => clearTimeout(timer))

    if (res.status === 401 || res.status === 403) {
      await setStatus('expired')
      console.error('[cron/brouk-check] Token expirado')
      return NextResponse.json({ status: 'expired' })
    }

    await setStatus('valid')
    console.log('[cron/brouk-check] Token válido')
    return NextResponse.json({ status: 'valid' })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[cron/brouk-check] Error al verificar:', msg)
    // No marcamos como expirado si fue error de red — puede ser transitorio
    return NextResponse.json({ status: 'check_error', detail: msg })
  }
}

async function setStatus(status: 'valid' | 'expired' | 'no_token') {
  await prisma.setting.upsert({
    where:  { key: 'brouk_token_status' },
    create: { key: 'brouk_token_status', value: status },
    update: { value: status },
  })
}
