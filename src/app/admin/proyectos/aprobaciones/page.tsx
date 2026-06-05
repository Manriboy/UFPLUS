// src/app/admin/proyectos/aprobaciones/page.tsx
import { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import AprobacionesTable from '@/components/admin/AprobacionesTable'

export const metadata: Metadata = { title: 'Aprobaciones — Admin UFPlus' }

export default function AprobacionesPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">

      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/admin/proyectos" className="hover:text-brand-primary transition-colors">
          Departamentos
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-brand-text font-medium">Aprobaciones</span>
      </nav>

      <div>
        <h1 className="text-2xl font-display font-bold text-brand-text">Aprobaciones</h1>
        <p className="text-sm text-gray-500 mt-1">Publicaciones de propietarios y brokers pendientes de revisión</p>
      </div>

      <AprobacionesTable />
    </div>
  )
}
