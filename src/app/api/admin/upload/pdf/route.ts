// Retorna los parámetros firmados para que el browser suba el PDF
// directamente a Cloudinary — el archivo no pasa por Vercel.
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import crypto from 'crypto'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey    = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ error: 'Cloudinary no configurado' }, { status: 500 })
  }

  const timestamp = Math.floor(Date.now() / 1000).toString()
  const folder    = 'ufplus/brochures'
  const paramsStr = `folder=${folder}&timestamp=${timestamp}`
  const signature = crypto.createHash('sha1').update(paramsStr + apiSecret).digest('hex')

  return NextResponse.json({ cloudName, apiKey, timestamp, folder, signature })
}
