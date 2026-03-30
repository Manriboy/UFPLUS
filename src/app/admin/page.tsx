// src/app/admin/page.tsx
import { Metadata } from 'next'
import Link from 'next/link'
import prisma from '@/lib/prisma'
import { formatPrice, DELIVERY_TYPE_LABELS, LEAD_STATUS_LABELS } from '@/lib/utils'
import {
  FolderOpen,
  CheckCircle,
  XCircle,
  Star,
  Archive,
  Inbox,
  AlertCircle,
  Plus,
  ArrowRight,
  TrendingUp,
} from 'lucide-react'

export const metadata: Metadata = { title: 'Dashboard — Admin UFPlus' }

async function getDashboardData() {
  const [
    totalProjects,
    activeProjects,
    inactiveProjects,
    featuredProjects,
    archivedProjects,
    totalLeads,
    newLeads,
    recentProjects,
    recentLeads,
  ] = await Promise.all([
    prisma.project.count({ where: { isArchived: false } }),
    prisma.project.count({ where: { isActive: true, isArchived: false } }),
    prisma.project.count({ where: { isActive: false, isArchived: false } }),
    prisma.project.count({ where: { isFeatured: true, isArchived: false } }),
    prisma.project.count({ where: { isArchived: true } }),
    prisma.lead.count(),
    prisma.lead.count({ where: { status: 'NEW' } }),
    prisma.project.findMany({
      where: { isArchived: false },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        commune: true,
        priceFrom: true,
        currency: true,
        deliveryType: true,
        isActive: true,
        isFeatured: true,
        createdAt: true,
      },
    }),
    prisma.lead.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { project: { select: { name: true } } },
    }),
  ])

  return {
    totalProjects,
    activeProjects,
    inactiveProjects,
    featuredProjects,
    archivedProjects,
    totalLeads,
    newLeads,
    recentProjects,
    recentLeads,
  }
}

export default async function AdminDashboard() {
  const data = await getDashboardData()

  const statCards = [
    {
      label: 'Proyectos totales',
      value: data.totalProjects,
      icon: FolderOpen,
      color: 'text-brand-primary',
      bg: 'bg-red-50',
      href: '/admin/proyectos',
    },
    {
      label: 'Activos',
      value: data.activeProjects,
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-50',
      href: '/admin/proyectos?filter=active',
    },
    {
      label: 'Inactivos',
      value: data.inactiveProjects,
      icon: XCircle,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      href: '/admin/proyectos?filter=inactive',
    },
    {
      label: 'Destacados',
      value: data.featuredProjects,
      icon: Star,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      href: '/admin/proyectos?filter=featured',
    },
    {
      label: 'Archivados',
      value: data.archivedProjects,
      icon: Archive,
      color: 'text-gray-500',
      bg: 'bg-gray-100',
      href: '/admin/proyectos?filter=archived',
    },
    {
      label: 'Leads nuevos',
      value: data.newLeads,
      icon: AlertCircle,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      href: '/admin/leads?status=NEW',
    },
    {
      label: 'Total consultas',
      value: data.totalLeads,
      icon: Inbox,
      color: 'text-brand-secondary',
      bg: 'bg-gray-50',
      href: '/admin/leads',
    },
  ]

  const leadStatusColors: Record<string, string> = {
    NEW: 'bg-blue-100 text-blue-700',
    CONTACTED: 'bg-amber-100 text-amber-700',
    QUALIFIED: 'bg-green-100 text-green-700',
    CLOSED: 'bg-gray-100 text-gray-600',
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-brand-text">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Resumen general del sistema</p>
        </div>
        <Link
          href="/admin/proyectos/nuevo"
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary text-white text-sm font-medium hover:bg-brand-primary-dark transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuevo proyecto
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Link
              key={card.label}
              href={card.href}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:border-brand-primary/40 hover:shadow-sm transition-all group"
            >
              <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center mb-3`}>
                <Icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <div className="text-2xl font-bold font-display text-brand-text">{card.value}</div>
              <div className="text-xs text-gray-500 mt-0.5 group-hover:text-brand-primary transition-colors">
                {card.label}
              </div>
            </Link>
          )
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-brand-text">Proyectos recientes</h2>
            <Link
              href="/admin/proyectos"
              className="text-xs text-brand-primary hover:underline flex items-center gap-1"
            >
              Ver todos <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {data.recentProjects.length === 0 ? (
              <p className="px-6 py-8 text-sm text-gray-500 text-center">Sin proyectos aún</p>
            ) : (
              data.recentProjects.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors">
                  <div className="min-w-0">
                    <Link
                      href={`/admin/proyectos/${p.id}`}
                      className="font-medium text-sm text-brand-text hover:text-brand-primary transition-colors truncate block"
                    >
                      {p.name}
                    </Link>
                    <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                      {p.commune && <span>{p.commune}</span>}
                      {p.priceFrom && <span>· {formatPrice(p.priceFrom, p.currency)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    {p.isFeatured && (
                      <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                    )}
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        p.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {p.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Leads */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-brand-text">Últimas consultas</h2>
            <Link
              href="/admin/leads"
              className="text-xs text-brand-primary hover:underline flex items-center gap-1"
            >
              Ver todas <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {data.recentLeads.length === 0 ? (
              <p className="px-6 py-8 text-sm text-gray-500 text-center">Sin consultas aún</p>
            ) : (
              data.recentLeads.map((lead) => (
                <div key={lead.id} className="px-6 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-brand-text">{lead.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{lead.email}</p>
                      {lead.project && (
                        <p className="text-xs text-brand-primary mt-0.5">
                          {lead.project.name}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          leadStatusColors[lead.status] || 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {LEAD_STATUS_LABELS[lead.status] || lead.status}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(lead.createdAt).toLocaleDateString('es-CL')}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
