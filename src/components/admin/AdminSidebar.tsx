'use client'
// src/components/admin/AdminSidebar.tsx
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FolderOpen,
  PlusCircle,
  Inbox,
  Settings,
  ExternalLink,
  ChevronRight,
  RefreshCw,
} from 'lucide-react'

const nav = [
  {
    label: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    label: 'Proyectos',
    href: '/admin/proyectos',
    icon: FolderOpen,
    children: [
      { label: 'Todos los proyectos', href: '/admin/proyectos' },
      { label: 'Nuevo proyecto', href: '/admin/proyectos/nuevo' },
    ],
  },
  {
    label: 'Leads / Consultas',
    href: '/admin/leads',
    icon: Inbox,
  },
  {
    label: 'Sync de Stock',
    href: '/admin/stock',
    icon: RefreshCw,
  },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === '/admin' ? pathname === href : pathname.startsWith(href)

  return (
    <aside className="hidden lg:flex flex-col w-60 bg-white border-r border-gray-200 min-h-screen">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-gray-100">
        <Link href="/" className="flex items-center gap-0.5">
          <span className="font-display text-xl font-bold text-brand-primary">UF</span>
          <span className="font-display text-xl font-bold text-brand-secondary">Plus</span>
        </Link>
        <span className="ml-2 text-[10px] font-semibold text-white bg-brand-primary px-1.5 py-0.5 uppercase tracking-wide">
          Admin
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)

          return (
            <div key={item.href}>
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
                {item.children && (
                  <ChevronRight className={cn('h-3.5 w-3.5 ml-auto transition-transform', active && 'rotate-90')} />
                )}
              </Link>

              {/* Subnav */}
              {item.children && active && (
                <div className="ml-7 mt-0.5 space-y-0.5">
                  {item.children.map((child) => (
                    <Link
                      key={child.href}
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
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-gray-100">
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
