// src/app/admin/proyectos/usados/[id]/page.tsx
import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import UsadoAdminEdit from '@/components/admin/UsadoAdminEdit'

interface Props { params: { id: string } }

export const dynamic = 'force-dynamic'

export default async function UsadoAdminEditPage({ params }: Props) {
  const session = await getServerSession(authOptions)
  if (!session) notFound()

  const property = await prisma.usedProperty.findUnique({
    where: { id: params.id },
    include: { owner: { select: { name: true, email: true, phone: true, role: true } } },
  })
  if (!property) notFound()

  return <UsadoAdminEdit property={property} />
}
