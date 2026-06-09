// src/app/admin/stock-usados/page.tsx
import { Metadata } from 'next'
import UsadosSearch from '@/components/admin/UsadosSearch'

export const metadata: Metadata = { title: 'Stock usados — UFPlus' }

export default function StockUsadosPage() {
  return <UsadosSearch />
}
