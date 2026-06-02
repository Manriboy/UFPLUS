'use client'
// src/components/admin/AdminSidebar.tsx
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FolderOpen,
  Inbox,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Users,
  UserCircle,
  Megaphone,
  Database,
  ShieldAlert,
  type LucideIcon,
} from 'lucide-react'

// ── Nav config (keys must match admin-nav.ts) ──────────

type Child = { key: string; label: string; href: string }
type NavItem = { key: string; label: string; href: string; icon: LucideIcon; children?: Child[] }

const nav: NavItem[] = [
  { key: 'dashboard',  label: 'Dashboard',          href: '/admin',               icon: LayoutDashboard },
  { key: 'proyectos',  label: 'Proyectos',           href: '/admin/proyectos',     icon: FolderOpen,
    children: [
      { key: 'proyectos.todos', label: 'Todos los proyectos', href: '/admin/proyectos' },
      { key: 'proyectos.nuevo', label: 'Nuevo proyecto',      href: '/admin/proyectos/nuevo' },
    ],
  },
  { key: 'leads',      label: 'Leads / Consultas',   href: '/admin/leads',         icon: Inbox },
  { key: 'sync_stock', label: 'Sync de Stock',        href: '/admin/stock',         icon: RefreshCw },
  { key: 'stock_ufplus', label: 'Stock UFPLUS',       href: '/admin/stock-unificado', icon: Database,
    children: [
      { key: 'stock_ufplus.unificado', label: 'Stock unificado', href: '/admin/stock-unificado' },
      { key: 'stock_ufplus.online',    label: 'Stock online',    href: '/admin/search' },
      { key: 'stock_ufplus.offline',   label: 'Stock off-line',  href: '/admin/search2' },
    ],
  },
  { key: 'banner',     label: 'Banner publicitario', href: '/admin/banner',        icon: Megaphone },
]

// ── Component ─────────────────────────────────────────

export default function AdminSidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isSuperAdmin = session?.user?.role === 'SUPERADMIN'

  const [flags, setFlags] = useState<Record<string, boolean> | null>(null)

  useEffect(() => {
    fetch('/api/admin/superadmin/flags')
      .then(r => r.json())
      .then(({ flags: loaded }: { flags: Record<string, boolean> }) => setFlags(loaded))
      .catch(() => setFlags({}))
  }, [])

  // Default: enabled when flags not yet loaded or key absent
  const isEnabled = (key: string) => flags === null || flags[key] !== false

  const isActive = (href: string) =>
    href === '/admin' ? pathname === href : pathname === href || pathname.startsWith(href + '/')

  const isGroupActive = (item: NavItem) =>
    isActive(item.href) ||
    (item.children?.some(c => pathname === c.href || pathname.startsWith(c.href + '/')) ?? false)

  const visibleNav = nav
    .filter(item => isEnabled(item.key))
    .map(item => ({
      ...item,
      children: item.children?.filter(c => isEnabled(c.key)),
    }))

  return (
    <aside className="hidden lg:flex flex-col w-60 bg-white border-r border-gray-200 min-h-screen overflow-hidden">
      {/* Logo */}
      <Link href="/" className="block bg-white px-5 py-4 border-b border-gray-100">
        <Image
          src="/logos/admin-logo.png"
          alt="UFPlus"
          width={216}
          height={92}
          className="w-full h-auto"
          priority
        />
        <p className="text-center text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">
          Admin
        </p>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visibleNav.map((item) => {
          const Icon = item.icon
          const active = isGroupActive(item)

          return (
            <div key={item.key}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors',
                  active
                    ? 'bg-brand-primary text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-brand-text'
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {item.label}
                {item.children && item.children.length > 0 && (
                  <ChevronRight className={cn('h-3.5 w-3.5 ml-auto transition-transform', active && 'rotate-90')} />
                )}
              </Link>

              {/* Subnav */}
              {item.children && item.children.length > 0 && active && (
                <div className="ml-7 mt-0.5 space-y-0.5">
                  {item.children.map((child) => (
                    <Link
                      key={child.key}
                      href={child.href}
                      className={cn(
                        'block px-3 py-2 text-xs rounded transition-colors',
                        pathname === child.href
                          ? 'text-brand-primary font-semibold'
                          : 'text-gray-500 hover:text-brand-text'
                      )}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {/* Superadmin group — solo visible para SUPERADMIN */}
        {isSuperAdmin && <SuperadminGroup pathname={pathname} isActive={isActive} />}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-gray-100 space-y-0.5">
        <Link
          href="/admin/perfil"
          className={cn(
            'flex items-center gap-2 px-3 py-2 text-xs rounded transition-colors',
            isActive('/admin/perfil') ? 'text-brand-primary font-semibold' : 'text-gray-500 hover:text-brand-primary'
          )}
        >
          <UserCircle className="h-3.5 w-3.5" />
          Mi perfil
        </Link>
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-2 px-3 py-2 text-xs text-gray-500 hover:text-brand-primary rounded transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Ver sitio público
        </Link>
      </div>
    </aside>
  )
}

// ── Superadmin group ───────────────────────────────────

const SUPERADMIN_CHILDREN = [
  { label: 'Flags de Admin',      href: '/admin/superadmin/flags' },
  { label: 'Control de usuarios', href: '/admin/usuarios' },
]

function SuperadminGroup({
  pathname,
  isActive,
}: {
  pathname: string
  isActive: (href: string) => boolean
}) {
  const active =
    isActive('/admin/superadmin') || isActive('/admin/usuarios')

  return (
    <div>
      <Link
        href="/admin/superadmin/flags"
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors',
          active
            ? 'bg-brand-primary text-white'
            : 'text-gray-600 hover:bg-gray-100 hover:text-brand-text'
        )}
      >
        <ShieldAlert className="h-4 w-4 flex-shrink-0" />
        Superadmin
        <ChevronRight className={cn('h-3.5 w-3.5 ml-auto transition-transform', active && 'rotate-90')} />
      </Link>

      {active && (
        <div className="ml-7 mt-0.5 space-y-0.5">
          {SUPERADMIN_CHILDREN.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              className={cn(
                'block px-3 py-2 text-xs rounded transition-colors',
                pathname === child.href || pathname.startsWith(child.href + '/')
                  ? 'text-brand-primary font-semibold'
                  : 'text-gray-500 hover:text-brand-text'
              )}
            >
              {child.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
