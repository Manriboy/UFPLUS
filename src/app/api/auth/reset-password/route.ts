// src/app/api/auth/reset-password/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const { token, password } = await req.json()

  if (!token || !password) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
  if (password.length < 6) return NextResponse.json({ error: 'Mínimo 6 caracteres' }, { status: 400 })

  const record = await prisma.passwordResetToken.findUnique({ where: { token } })
  if (!record || record.used || record.expiresAt < new Date())
    return NextResponse.json({ error: 'El enlace expiró o ya fue usado' }, { status: 400 })

  const hashed = await bcrypt.hash(password, 12)
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { password: hashed, plainPassword: null },
    }),
    prisma.passwordResetToken.update({
      where: { token },
      data: { used: true },
    }),
  ])

  return NextResponse.json({ ok: true, email: (await prisma.user.findUnique({ where: { id: record.userId }, select: { email: true } }))?.email })
}
