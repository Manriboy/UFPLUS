// src/app/admin/leads/page.tsx
import { Metadata } from 'next'
import { Prisma, LeadStatus } from '@prisma/client'
import prisma from '@/lib/prisma'
import { LEAD_STATUS_LABELS } from '@/lib/utils'
import { Inbox, Mail, Phone, Calendar, Building2 } from 'lucide-react'

export const metadata: Metadata = { title: 'Leads — Admin UFPlus' }

interface Props {
  searchParams: { status?: string; page?: string }
}

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-700 border-blue-200',
  CONTACTED: 'bg-amber-100 text-amber-700 border-amber-200',
  QUALIFIED: 'bg-green-100 text-green-700 border-green-200',
  CLOSED: 'bg-gray-100 text-gray-600 border-gray-200',
}

function isValidLeadStatus(value: string): value is LeadStatus {
  return Object.values(LeadStatus).includes(value as LeadStatus)
}

async function getLeads(status?: string, page = 1) {
  const limit = 20

  const where: Prisma.LeadWhereInput =
    typeof status === 'string' && isValidLeadStatus(status) ? { status } : {}

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      include: { project: { select: { name: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.lead.count({ where }),
  ])

  return { leads, total, pages: Math.ceil(total / limit) }
}

export default async function AdminLeadsPage({ searchParams }: Props) {
  const status = searchParams.status
  const page = parseInt(searchParams.page || '1')
  const { leads, total, pages } = await getLeads(status, page)

  const filterTabs = [
    { key: '', label: 'Todos', count: null },
    { key: 'NEW', label: 'Nuevos', count: null },
    { key: 'CONTACTED', label: 'Contactados', count: null },
    { key: 'QUALIFIED', label: 'Calificados', count: null },
    { key: 'CLOSED', label: 'Cerrados', count: null },
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-brand-text">Leads y Consultas</h1>
        <p className="text-sm text-gray-500 mt-1">
          {total} consulta{total !== 1 ? 's' : ''} en total
        </p>
      </div>

      {/* Filter tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {filterTabs.map((tab) => {
            const isActive = (status || '') === tab.key
            return (
              <a
                key={tab.key}
                href={tab.key ? `/admin/leads?status=${tab.key}` : '/admin/leads'}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-brand-primary text-brand-primary'
                    : 'border-transparent text-gray-500 hover:text-brand-text hover:border-gray-300'
                }`}
              >
                {tab.label}
              </a>
            )
          })}
        </nav>
      </div>

      {/* Leads */}
      {leads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Inbox className="h-10 w-10 mb-3" />
          <p className="text-sm">Sin leads en esta categoría</p>
        </div>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => (
            <div
              key={lead.id}
              className="bg-white border border-gray-200 rounded-lg p-5 hover:border-brand-primary/30 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-semibold text-brand-text">{lead.name}</h3>
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                        STATUS_COLORS[lead.status] || 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {LEAD_STATUS_LABELS[lead.status] || lead.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    <a
                      href={`mailto:${lead.email}`}
                      className="flex items-center gap-1.5 hover:text-brand-primary transition-colors"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      {lead.email}
                    </a>
                    {lead.phone && (
                      <a
                        href={`tel:${lead.phone}`}
                        className="flex items-center gap-1.5 hover:text-brand-primary transition-colors"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        {lead.phone}
                      </a>
                    )}
                    {lead.project && (
                      <span className="flex items-center gap-1.5 text-brand-primary">
                        <Building2 className="h-3.5 w-3.5" />
                        {lead.project.name}
                      </span>
                    )}
                  </div>

                  {lead.message && (
                    <p className="text-sm text-gray-600 bg-gray-50 rounded p-3 border-l-2 border-brand-primary/30">
                      {lead.message}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2 sm:min-w-[120px]">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(lead.createdAt).toLocaleDateString('es-CL', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </div>
                  <a
                    href={`mailto:${lead.email}?subject=Consulta UFPlus${
                      lead.project ? ` - ${lead.project.name}` : ''
                    }`}
                    className="text-xs px-3 py-1.5 bg-brand-primary text-white hover:bg-brand-primary-dark transition-colors rounded"
                  >
                    Responder
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <a
              key={p}
              href={`/admin/leads?${status ? `status=${status}&` : ''}page=${p}`}
              className={`w-9 h-9 flex items-center justify-center text-sm rounded transition-colors ${
                p === page
                  ? 'bg-brand-primary text-white'
                  : 'border border-gray-300 text-gray-600 hover:border-brand-primary'
              }`}
            >
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}