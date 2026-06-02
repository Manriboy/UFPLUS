// src/app/api/admin/external/cover/route.ts
// Proxy para imágenes de JetBrokers que requieren autenticación Bearer
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const JB_TOKEN = process.env.JETBROKERS_TOKEN ?? 'PtDBqd29'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse('Unauthorized', { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id || !/^[A-Za-z0-9_-]{4,20}$/.test(id)) {
    return new NextResponse('Invalid cover id', { status: 400 })
  }

  try {
    const res = await fetch(`https://app.jetbrokers.io/api/cover/${id}`, {
      headers: {
        Authorization: `Bearer ${JB_TOKEN}`,
        Accept: 'image/*,*/*',
        device: 'w',
        'jet-brokers-version': '7.42.2',
        Referer: `https://app.jetbrokers.io/marketplace/workview/${id}`,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    })

    if (!res.ok) return new NextResponse(null, { status: res.status })

    const contentType = res.headers.get('content-type') ?? 'image/jpeg'
    const buffer = await res.arrayBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch {
    return new NextResponse(null, { status: 502 })
  }
}
