import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Solo se permiten archivos PDF' }, { status: 400 })
    }
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'El PDF no puede superar 20MB' }, { status: 400 })
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const apiKey    = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({ error: 'Cloudinary no configurado' }, { status: 500 })
    }

    const timestamp  = Math.floor(Date.now() / 1000).toString()
    const folder     = 'ufplus/brochures'
    const paramsStr  = `folder=${folder}&resource_type=raw&timestamp=${timestamp}`
    const signature  = crypto.createHash('sha1').update(paramsStr + apiSecret).digest('hex')

    const cloudinaryForm = new FormData()
    cloudinaryForm.append('file', file)
    cloudinaryForm.append('api_key', apiKey)
    cloudinaryForm.append('timestamp', timestamp)
    cloudinaryForm.append('folder', folder)
    cloudinaryForm.append('signature', signature)

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`,
      { method: 'POST', body: cloudinaryForm }
    )

    if (!response.ok) {
      const err = await response.json()
      console.error('Cloudinary PDF error:', err)
      return NextResponse.json({ error: 'Error al subir PDF' }, { status: 500 })
    }

    const data = await response.json()
    return NextResponse.json({ url: data.secure_url, publicId: data.public_id })
  } catch (error) {
    console.error('PDF upload error:', error)
    return NextResponse.json({ error: 'Error al procesar PDF' }, { status: 500 })
  }
}
