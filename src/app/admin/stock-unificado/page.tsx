// src/app/admin/stock-unificado/page.tsx
import { Suspense } from 'react'
import SyncPanel from '@/components/admin/SyncPanel'
import ExternalStockSearch from '@/components/admin/ExternalStockSearch'
import IndicadoresWidget from '@/components/admin/IndicadoresWidget'

export const metadata = { title: 'Stock Unificado' }

export default async function StockUnificadoPage() {
  return (
    <>
      <div className="px-6 pt-6 pb-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-brand-text">Stock UFPLUS</h1>
          <p className="text-sm text-gray-500 mt-0.5">Búsqueda unificada de inventario externo</p>
        </div>
        <Suspense fallback={<div className="h-[52px] w-[280px] bg-gray-100 rounded-lg animate-pulse" />}>
          <IndicadoresWidget />
        </Suspense>
      </div>
      <ExternalStockSearch />
      <div className="px-6 pb-6">
        <SyncPanel />
      </div>
    </>
  )
}
