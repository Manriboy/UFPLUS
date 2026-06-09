import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Paths que solo puede ver cada rol restringido
const ROLE_ALLOWED: Record<string, string[]> = {
  PROPIETARIO: ['/admin/mis-publicaciones', '/admin/proyectos/nuevo', '/admin/proyectos/usados', '/admin/perfil'],
  BROKER:      ['/admin/mis-publicaciones', '/admin/stock-usados', '/admin/proyectos/nuevo', '/admin/proyectos/usados', '/admin/perfil'],
}

// A dónde redirigir si el rol intenta acceder a algo no permitido
const ROLE_HOME: Record<string, string> = {
  PROPIETARIO: '/admin/mis-publicaciones',
  BROKER:      '/admin/stock-usados',
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rutas públicas dentro de /admin
  if (pathname.startsWith('/admin/login')) return NextResponse.next()

  // Solo aplica a rutas /admin
  if (!pathname.startsWith('/admin')) return NextResponse.next()

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })

  // Sin sesión → login
  if (!token) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  const role = token.role as string

  // Roles restringidos: solo pueden acceder a sus paths permitidos
  if (role in ROLE_ALLOWED) {
    const allowed = ROLE_ALLOWED[role]
    const isAllowed = allowed.some(p => pathname.startsWith(p))
    if (!isAllowed) {
      return NextResponse.redirect(new URL(ROLE_HOME[role], request.url))
    }
  }

  // Sección superadmin: solo SUPERADMIN
  if (pathname.startsWith('/admin/superadmin') && role !== 'SUPERADMIN') {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  // Gestión de usuarios: solo SUPERADMIN
  if (pathname.startsWith('/admin/usuarios') && role !== 'SUPERADMIN') {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
}
