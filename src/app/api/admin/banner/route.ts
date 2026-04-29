// src/app/api/admin/banner/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import crypto from 'crypto'
import { revalidatePath } from 'next/cache'

const BANNER_PUBLIC_ID = 'ufplus/banner/main'

// ─── Cloudinary signed upload (permite fijar public_id y overwrite) ───

async function uploadBannerToCloudinary(file: File): Promise<{ url: string } | { error: string }> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET

  if (!cloudName || !apiKey || !apiSecret) {
    return { error: 'Cloudinary no configurado' }
  }

  const timestamp = Math.floor(Date.now() / 1000).toString()
  const paramsStr = `overwrite=true&public_id=${BANNER_PUBLIC_ID}&timestamp=${timestamp}`
  const signature = crypto.createHash('sha1').update(paramsStr + apiSecret).digest('hex')

  const form = new FormData()
  form.append('file', file)
  form.append('api_key', apiKey)
  form.append('timestamp', timestamp)
  form.append('public_id', BANNER_PUBLIC_ID)
  form.append('overwrite', 'true')
  form.append('signature', signature)

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: 'POST', body: form }
  )

  if (!res.ok) {
    const err = await res.json()
    console.error('Cloudinary banner upload error:', err)
    return { error: 'Error al subir imagen a Cloudinary' }
  }

  const data = await res.json()
  return { url: data.secure_url }
}

// ─── GET: devuelve config actual del banner ───────────

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const [active, imageUrl] = await Promise.all([
    prisma.setting.findUnique({ where: { key: 'banner_active' } }),
    prisma.setting.findUnique({ where: { key: 'banner_image_url' } }),
  ])

  return NextResponse.json({
    isActive: active?.value === 'true',
    imageUrl: imageUrl?.value ?? null,
  })
}

// ─── PUT: guarda config del banner ───────────────────

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const formData = await req.formData()
  const isActive = formData.get('isActive') === 'true'
  const file = formData.get('file') as File | null
  let imageUrl = formData.get('imageUrl') as string | null

  // Subir nueva imagen si se proporcionó
  if (file && file.size > 0) {
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      return NextResponse.json({ error: 'Solo se permiten imágenes JPG, PNG o WebP' }, { status: 400 })
    }
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: 'La imagen no puede superar 8MB' }, { status: 400 })
    }

    const result = await uploadBannerToCloudinary(file)
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: 500 })
    imageUrl = result.url
  }

  // Guardar en BD
  await Promise.all([
    prisma.setting.upsert({
      where: { key: 'banner_active' },
      update: { value: isActive ? 'true' : 'false' },
      create: { key: 'banner_active', value: isActive ? 'true' : 'false' },
    }),
    imageUrl
      ? prisma.setting.upsert({
          where: { key: 'banner_image_url' },
          update: { value: imageUrl },
          create: { key: 'banner_image_url', value: imageUrl },
        })
      : Promise.resolve(),
  ])

  // Revalidar homepage para que refleje el cambio inmediatamente
  revalidatePath('/')

  return NextResponse.json({ success: true, isActive, imageUrl })
}
