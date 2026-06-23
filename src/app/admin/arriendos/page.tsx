// src/app/admin/arriendos/page.tsx
import ArriendosSearch from '@/components/admin/ArriendosSearch'
import IndicadoresWidget from '@/components/admin/IndicadoresWidget'

export const metadata = { title: 'Arriendos — Admin UFPlus' }

export default function ArriendosPage() {
  return (
    <>
      <div className="px-6 pt-6 pb-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-brand-text">Arriendos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Busca valores de arriendo en Portal Inmobiliario</p>
        </div>
        <IndicadoresWidget />
      </div>
      <ArriendosSearch />
    </>
  )
}
