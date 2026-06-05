'use client'
// src/components/admin/NuevoProyectoSwitch.tsx
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Building2, Home } from 'lucide-react'
import { cn } from '@/lib/utils'
import ProjectForm from './ProjectForm'
import NuevoUsadoForm from './NuevoUsadoForm'

type Categoria = 'nuevos' | 'usados'

export default function NuevoProyectoSwitch() {
  const { data: session } = useSession()
  const role = session?.user?.role as string | undefined
  const isRestricted = role === 'PROPIETARIO' || role === 'BROKER'

  const [categoria, setCategoria] = useState<Categoria>(isRestricted ? 'usados' : 'nuevos')

  // PROPIETARIO y BROKER van directo al form de usado, sin switch
  if (isRestricted) return <NuevoUsadoForm />

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Tipo de proyecto</p>
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          <button type="button" onClick={() => setCategoria('nuevos')}
            className={cn('flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-colors',
              categoria === 'nuevos' ? 'bg-white text-brand-text shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <Building2 className="h-4 w-4" /> Nuevo
          </button>
          <button type="button" onClick={() => setCategoria('usados')}
            className={cn('flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-colors',
              categoria === 'usados' ? 'bg-white text-brand-text shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <Home className="h-4 w-4" /> Usado
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {categoria === 'nuevos' ? 'Proyecto de desarrollo inmobiliario — flujo actual.' : 'Departamento de segunda mano publicado por su propietario.'}
        </p>
      </div>

      {categoria === 'nuevos' ? <ProjectForm /> : <NuevoUsadoForm />}
    </div>
  )
}
