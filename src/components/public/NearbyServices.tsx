'use client'
// src/components/public/NearbyServices.tsx
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Train, GraduationCap, Trees, ShoppingCart, HeartPulse, MapPin, Clock } from 'lucide-react'

export interface POI {
  title: string
  distance: number
  category?: string
}

export interface NearbyServicesData {
  transporte:  POI[]
  educacion:   POI[]
  areasVerdes: POI[]
  comercios:   POI[]
  salud:       POI[]
}

const TABS = [
  { key: 'transporte',  label: 'Transporte',    icon: Train },
  { key: 'educacion',   label: 'Educación',      icon: GraduationCap },
  { key: 'areasVerdes', label: 'Áreas verdes',   icon: Trees },
  { key: 'comercios',   label: 'Comercios',      icon: ShoppingCart },
  { key: 'salud',       label: 'Salud',          icon: HeartPulse },
] as const

type TabKey = (typeof TABS)[number]['key']

function walkingMinutes(meters: number): number {
  return Math.ceil(meters / 83) // 5 km/h ≈ 83 m/min
}

export default function NearbyServices({ data }: { data: NearbyServicesData }) {
  const [active, setActive] = useState<TabKey>('transporte')
  const items = data[active]

  return (
    <div className="container-section py-10 border-t border-gray-100">
      <h2 className="font-display text-xl font-semibold text-brand-text mb-6 flex items-center gap-2">
        <MapPin className="w-5 h-5 text-brand-primary" />
        Servicios básicos cercanos
      </h2>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap mb-6 border-b border-gray-200">
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActive(tab.key)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
                active === tab.key
                  ? 'border-brand-primary text-brand-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Items */}
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">
          Sin resultados en un radio de 1 km
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((poi, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-brand-surface border border-gray-100 rounded-lg">
              <MapPin className="w-4 h-4 text-brand-primary mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-brand-text truncate">{poi.title}</p>
                {poi.category && (
                  <p className="text-xs text-gray-400 mb-1">{poi.category}</p>
                )}
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {poi.distance} m
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {walkingMinutes(poi.distance)} min
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
