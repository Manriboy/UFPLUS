// src/app/(public)/proyectos/page.tsx
import { Metadata } from 'next'
import IrisSearchPublic from '@/components/public/IrisSearchPublic'

export const metadata: Metadata = {
  title: 'Proyectos de Inversión',
  description: 'Explora nuestra selección de departamentos de inversión en Chile. Filtra por ubicación, precio y tipo de entrega.',
}

export default function ProjectsPage() {
  return (
    <>
      {/* Hero negro */}
      <section className="bg-[#0D0D0D] pt-28 pb-16">
        <div className="container-section">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-px bg-brand-primary" />
            <span className="text-brand-primary text-sm font-medium tracking-widest uppercase">
              Portafolio
            </span>
          </div>
          <h1 className="font-sans text-4xl sm:text-5xl font-bold text-white mb-4">
            Proyectos de inversión
          </h1>
          <p className="text-gray-400 text-lg max-w-xl">
            Departamentos seleccionados por expertos en las mejores ubicaciones de Chile.
          </p>
        </div>
      </section>

      {/* Buscador Iris */}
      <IrisSearchPublic />
    </>
  )
}
