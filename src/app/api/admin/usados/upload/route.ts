// src/app/api/admin/usados/upload/route.ts
// Sube imágenes de propiedades usadas a Cloudinary con upload firmado (no depende de preset unsigned)
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey    = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ error: 'Cloudinary no configurado' }, { status: 500 })
  }

  const body = await req.formData()
  const file = body.get('file') as Blob | null
  if (!file) return NextResponse.json({ error: 'Sin archivo' }, { status: 400 })

  const timestamp = Math.floor(Date.now() / 1000).toString()
  const folder    = 'ufplus/usados'
  const paramsStr = `folder=${folder}&timestamp=${timestamp}`
  const signature = crypto.createHash('sha1').update(paramsStr + apiSecret).digest('hex')

  const fd = new FormData()
  fd.append('file', file, 'photo.jpg')
  fd.append('api_key', apiKey)
  fd.append('timestamp', timestamp)
  fd.append('folder', folder)
  fd.append('signature', signature)

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: fd,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    return NextResponse.json({ error: err.error?.message ?? 'Error de Cloudinary' }, { status: 500 })
  }

  const data = await res.json()
  return NextResponse.json({ url: data.secure_url as string })
}
