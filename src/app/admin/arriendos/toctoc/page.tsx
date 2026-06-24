import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import TocTocConfig from './TocTocConfig'

export const metadata = { title: 'Configurar TocToc — Admin UFPlus' }
export const dynamic  = 'force-dynamic'

function decodeExp(token: string): number | null {
  try {
    const payload = token.split('.')[1]
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString())
    return typeof decoded.exp === 'number' ? decoded.exp : null
  } catch { return null }
}

export default async function TocTocPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/admin/login')

  const [gAuthRow, accessRow] = await Promise.all([
    prisma.setting.findUnique({ where: { key: 'tt_jwt_gauth'    } }),
    prisma.setting.findUnique({ where: { key: 'tt_access_token' } }),
  ])

  return (
    <TocTocConfig
      gAuthConnected  = {!!gAuthRow?.value}
      accessConnected = {!!accessRow?.value}
      gAuthExp        = {gAuthRow?.value  ? decodeExp(gAuthRow.value)  : null}
      accessExp       = {accessRow?.value ? decodeExp(accessRow.value) : null}
    />
  )
}
