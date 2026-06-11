// src/app/api/admin/usuarios/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { sendPasswordResetEmail } from '@/lib/email'
import type { Session } from 'next-auth'

function isSuperAdmin(session: Session | null) {
  return session?.user?.role === 'SUPERADMIN'
}

const USER_SELECT = {
  id: true, name: true, email: true, role: true,
  phone: true, brokerType: true, companyName: true,
  createdAt: true, updatedAt: true,
} as const

// GET — listar usuarios
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!isSuperAdmin(session)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const users = await prisma.user.findMany({
    select: { ...USER_SELECT, plainPassword: true },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json({ users })
}

// POST — crear usuario
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!isSuperAdmin(session)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { name, email: rawEmail, password, role, brokerType, companyName, phone } = await req.json()
  const email = (rawEmail ?? '').trim().toLowerCase()

  if (!email || !password) return NextResponse.json({ error: 'Email y contraseña son requeridos' }, { status: 400 })
  if (!['ADMIN', 'SUPERADMIN', 'EDITOR', 'PROPIETARIO', 'BROKER'].includes(role))
    return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
  if (password.length < 6) return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
  if (role === 'BROKER' && !companyName?.trim())
    return NextResponse.json({ error: 'El nombre del broker es requerido' }, { status: 400 })

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return NextResponse.json({ error: 'Ya existe un usuario con ese email' }, { status: 409 })

  const hashed = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: {
      name: name?.trim() || null, email, password: hashed,
      plainPassword: password,
      role,
      phone: phone?.trim() || null,
      brokerType: role === 'BROKER' ? (brokerType ?? 'PARTICULAR') : null,
      companyName: role === 'BROKER' ? companyName?.trim() || null : null,
    },
    select: { ...USER_SELECT, plainPassword: true },
  })
  return NextResponse.json({ user }, { status: 201 })
}

// PUT — editar usuario
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!isSuperAdmin(session)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { id, name, email: rawEmail, role, password, brokerType, companyName, phone } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

  const target = await prisma.user.findUnique({ where: { id } })
  if (!target) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  if (target.role === 'SUPERADMIN' && role && role !== 'SUPERADMIN') {
    const count = await prisma.user.count({ where: { role: 'SUPERADMIN' } })
    if (count <= 1) return NextResponse.json({ error: 'Debe existir al menos un superadmin' }, { status: 400 })
  }

  const effectiveRole = role ?? target.role
  if (effectiveRole === 'BROKER' && companyName !== undefined && !companyName?.trim())
    return NextResponse.json({ error: 'El nombre del broker es requerido' }, { status: 400 })

  const updateData: Record<string, unknown> = {}
  if (name !== undefined) updateData.name = name?.trim() || null
  if (rawEmail) updateData.email = rawEmail.trim().toLowerCase()
  if (phone !== undefined) updateData.phone = phone?.trim() || null
  if (role && ['ADMIN', 'SUPERADMIN', 'EDITOR', 'PROPIETARIO', 'BROKER'].includes(role)) {
    updateData.role = role
    updateData.brokerType = role === 'BROKER' ? (brokerType ?? 'PARTICULAR') : null
    updateData.companyName = role === 'BROKER' ? companyName?.trim() || null : null
  } else if (brokerType !== undefined && target.role === 'BROKER') {
    updateData.brokerType = brokerType
    updateData.companyName = companyName?.trim() || null
  }
  if (password) {
    if (password.length < 6) return NextResponse.json({ error: 'Mínimo 6 caracteres' }, { status: 400 })
    updateData.password = await bcrypt.hash(password, 12)
    updateData.plainPassword = password
  }

  const user = await prisma.user.update({
    where: { id }, data: updateData,
    select: { ...USER_SELECT, plainPassword: true },
  })
  return NextResponse.json({ user })
}

// DELETE — eliminar usuario
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!isSuperAdmin(session)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

  const target = await prisma.user.findUnique({ where: { id } })
  if (!target) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  if (target.id === session!.user.id) return NextResponse.json({ error: 'No puedes eliminarte a ti mismo' }, { status: 400 })
  if (target.role === 'SUPERADMIN') {
    const count = await prisma.user.count({ where: { role: 'SUPERADMIN' } })
    if (count <= 1) return NextResponse.json({ error: 'No se puede eliminar el único superadmin' }, { status: 400 })
  }

  await prisma.user.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

// PATCH — recuperar contraseña (superadmin → enviar email al usuario)
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!isSuperAdmin(session)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

  const target = await prisma.user.findUnique({ where: { id } })
  if (!target) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  try {
    // Invalidar sesiones activas del usuario
    await prisma.session.deleteMany({ where: { userId: id } })

    // Crear token de reset (expira en 2h)
    const token = randomBytes(32).toString('hex')
    await prisma.passwordResetToken.deleteMany({ where: { userId: id } })
    await prisma.passwordResetToken.create({
      data: { userId: id, token, expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000) },
    })

    await sendPasswordResetEmail(target.email, token, target.name)
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al enviar correo'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
