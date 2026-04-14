// src/app/api/admin/usuarios/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import type { Session } from 'next-auth'

function isSuperAdmin(session: Session | null) {
  return session?.user?.role === 'SUPERADMIN'
}

// GET — listar usuarios
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!isSuperAdmin(session)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json({ users })
  } catch (err) {
    return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 })
  }
}

// POST — crear usuario
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!isSuperAdmin(session)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  try {
    const { name, email: rawEmail, password, role } = await req.json()
    const email = (rawEmail ?? '').trim().toLowerCase()

    if (!email || !password) return NextResponse.json({ error: 'Email y contraseña son requeridos' }, { status: 400 })
    if (!['ADMIN', 'SUPERADMIN'].includes(role)) return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
    if (password.length < 6) return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return NextResponse.json({ error: 'Ya existe un usuario con ese email' }, { status: 409 })

    const hashed = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: { name: name?.trim() || null, email, password: hashed, role },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    })
    return NextResponse.json({ user }, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al crear usuario'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// PUT — editar usuario (nombre, email, rol, contraseña)
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!isSuperAdmin(session)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  try {
    const { id, name, email: rawEmail, role, password } = await req.json()
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    const target = await prisma.user.findUnique({ where: { id } })
    if (!target) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

    // Si se degrada el único superadmin, bloquearlo
    if (target.role === 'SUPERADMIN' && role && role !== 'SUPERADMIN') {
      const superadminCount = await prisma.user.count({ where: { role: 'SUPERADMIN' } })
      if (superadminCount <= 1) {
        return NextResponse.json({ error: 'Debe existir al menos un superadmin' }, { status: 400 })
      }
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name?.trim() || null
    if (rawEmail) updateData.email = rawEmail.trim().toLowerCase()
    if (role && ['ADMIN', 'SUPERADMIN'].includes(role)) updateData.role = role
    if (password) {
      if (password.length < 6) return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
      updateData.password = await bcrypt.hash(password, 12)
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    })
    return NextResponse.json({ user })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al actualizar usuario'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// DELETE — eliminar usuario
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!isSuperAdmin(session)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    const target = await prisma.user.findUnique({ where: { id } })
    if (!target) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

    if (target.role === 'SUPERADMIN') {
      const superadminCount = await prisma.user.count({ where: { role: 'SUPERADMIN' } })
      if (superadminCount <= 1) {
        return NextResponse.json({ error: 'No se puede eliminar el único superadmin' }, { status: 400 })
      }
    }

    if (target.id === session!.user.id) {
      return NextResponse.json({ error: 'No puedes eliminarte a ti mismo' }, { status: 400 })
    }

    await prisma.user.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al eliminar usuario'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
