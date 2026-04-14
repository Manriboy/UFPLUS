// src/app/api/admin/usuarios/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'

function isSuperAdmin(session: Awaited<ReturnType<typeof getServerSession>>) {
  return session?.user?.role === 'SUPERADMIN'
}

// GET — listar usuarios
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!isSuperAdmin(session)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json({ users })
}

// POST — crear usuario
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!isSuperAdmin(session)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { name, email, password, role } = await req.json()
  if (!email || !password) return NextResponse.json({ error: 'Email y contraseña son requeridos' }, { status: 400 })
  if (!['ADMIN', 'SUPERADMIN'].includes(role)) return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return NextResponse.json({ error: 'Ya existe un usuario con ese email' }, { status: 409 })

  const hashed = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: { name: name || null, email, password: hashed, role },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  })
  return NextResponse.json({ user }, { status: 201 })
}

// PUT — editar usuario (nombre, email, rol, contraseña)
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!isSuperAdmin(session)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { id, name, email, role, password } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

  const target = await prisma.user.findUnique({ where: { id } })
  if (!target) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  // Si se cambia el rol y el target era el único superadmin, bloquearlo
  if (target.role === 'SUPERADMIN' && role && role !== 'SUPERADMIN') {
    const superadminCount = await prisma.user.count({ where: { role: 'SUPERADMIN' } })
    if (superadminCount <= 1) {
      return NextResponse.json({ error: 'Debe existir al menos un superadmin' }, { status: 400 })
    }
  }

  const updateData: Record<string, unknown> = {}
  if (name !== undefined) updateData.name = name || null
  if (email) updateData.email = email
  if (role && ['ADMIN', 'SUPERADMIN'].includes(role)) updateData.role = role
  if (password) updateData.password = await bcrypt.hash(password, 12)

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, email: true, role: true, createdAt: true },
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

  // No eliminar el último superadmin
  if (target.role === 'SUPERADMIN') {
    const superadminCount = await prisma.user.count({ where: { role: 'SUPERADMIN' } })
    if (superadminCount <= 1) {
      return NextResponse.json({ error: 'No se puede eliminar el único superadmin' }, { status: 400 })
    }
  }

  // No eliminar a uno mismo
  if (target.id === session!.user.id) {
    return NextResponse.json({ error: 'No puedes eliminarte a ti mismo' }, { status: 400 })
  }

  await prisma.user.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
