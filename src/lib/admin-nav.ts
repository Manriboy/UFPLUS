// src/lib/admin-nav.ts
// Fuente única de verdad para los nav items del admin.
// Sin íconos (los agrega el sidebar); usada también por la página de Flags.

export type NavChild = {
  key: string
  label: string
  href: string
}

export type NavItemConfig = {
  key: string
  label: string
  href: string
  children?: NavChild[]
}

// Ítems controlables por flags (NO incluye el grupo Superadmin).
export const NAV_CONFIG: NavItemConfig[] = [
  {
    key: 'stock-usados',
    label: 'Stock usados (Broker)',
    href: '/admin/stock-usados',
  },
  {
    key: 'mis-publicaciones',
    label: 'Mis publicaciones',
    href: '/admin/mis-publicaciones',
  },
  {
    key: 'dashboard',
    label: 'Dashboard',
    href: '/admin',
  },
  {
    key: 'proyectos',
    label: 'Proyectos',
    href: '/admin/proyectos',
    children: [
      { key: 'proyectos.nuevos',       label: 'Departamentos', href: '/admin/proyectos' },
      { key: 'proyectos.aprobaciones', label: 'Aprobaciones',  href: '/admin/proyectos/aprobaciones' },
    ],
  },
  {
    key: 'leads',
    label: 'Leads / Consultas',
    href: '/admin/leads',
  },
  {
    key: 'sync_stock',
    label: 'Sync de Stock',
    href: '/admin/stock',
  },
  {
    key: 'stock_ufplus',
    label: 'Stock UFPLUS',
    href: '/admin/stock-unificado',
    children: [
      { key: 'stock_ufplus.nuevos',  label: 'Stock nuevos',   href: '/admin/stock-unificado' },
      { key: 'stock_ufplus.usados',  label: 'Stock usados',   href: '/admin/stock-usados' },
      { key: 'stock_ufplus.online',  label: 'Stock online',   href: '/admin/search' },
      { key: 'stock_ufplus.offline', label: 'Stock off-line', href: '/admin/search2' },
    ],
  },
  {
    key: 'arriendos',
    label: 'Arriendos',
    href: '/admin/arriendos',
    children: [
      { key: 'arriendos.buscar', label: 'Buscador',          href: '/admin/arriendos' },
      { key: 'arriendos.toctoc', label: 'Configurar TocToc', href: '/admin/arriendos/toctoc' },
    ],
  },
  {
    key: 'banner',
    label: 'Banner publicitario',
    href: '/admin/banner',
  },
]

// Todas las keys posibles (para inicializar flags en "todo activado")
export const ALL_NAV_KEYS: string[] = NAV_CONFIG.flatMap(item =>
  item.children ? [item.key, ...item.children.map(c => c.key)] : [item.key]
)
