// src/app/admin/stock-unificado/page.tsx
import SyncPanel from '@/components/admin/SyncPanel'
import ExternalStockSearch from '@/components/admin/ExternalStockSearch'

export const metadata = { title: 'Stock Unificado' }

export default function StockUnificadoPage() {
  return (
    <>
      <ExternalStockSearch />
      <div className="px-6 pb-6">
        <SyncPanel />
      </div>
    </>
  )
}
