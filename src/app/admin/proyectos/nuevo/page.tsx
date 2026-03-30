// src/app/admin/proyectos/nuevo/page.tsx
import { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import ProjectForm from '@/components/admin/ProjectForm'

export const metadata: Metadata = { title: 'Nuevo Proyecto — Admin UFPlus' }

export default function NewProjectPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/admin/proyectos" className="hover:text-brand-primary transition-colors">
          Proyectos
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-brand-text font-medium">Nuevo proyecto</span>
      </nav>

      <div>
        <h1 className="text-2xl font-display font-bold text-brand-text">Crear nuevo proyecto</h1>
        <p className="text-sm text-gray-500 mt-1">
          Completa la información del proyecto para publicarlo en el sitio.
        </p>
      </div>

      <ProjectForm />
    </div>
  )
}
