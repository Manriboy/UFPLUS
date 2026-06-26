'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  CheckCircle, AlertCircle, RefreshCw, Database,
  MapPin, Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const COMUNAS = [
  'Cerrillos','Cerro Navia','Conchalí','El Bosque','Estación Central',
  'Huechuraba','Independencia','La Cisterna','La Florida','La Granja',
  'La Pintana','La Reina','Las Condes','Lo Barnechea','Lo Espejo',
  'Lo Prado','Macul','Maipú','Padre Hurtado','Pedro Aguirre Cerda',
  'Peñalolén','Providencia','Pudahuel','Quilicura','Quinta Normal',
  'Recoleta','Renca','San Bernardo','San Joaquín','San Miguel',
  'San Ramón','Santiago','Vitacura','Ñuñoa',
]

type DbStats = {
  communes: { commune: string | null; count: number }[]
  total: number
  lastSync: string | null
}

export default function TocTocConfig() {
  const [dbStats, setDbStats]         = useState<DbStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const [selectedComuna, setSelectedComuna] = useState('')
  const [syncing, setSyncing]         = useState(false)
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0, phase: '' })
  const [syncResult, setSyncResult]   = useState<string | null>(null)
  const [syncError, setSyncError]     = useState<string | null>(null)

  const loadStats = useCallback(async () => {
    setLoadingStats(true)
    try {
      const res = await fetch('/api/admin/arriendos/db')
      if (res.ok) {
        const data = await res.json()
        setDbStats({ communes: data.communes, total: data.total, lastSync: data.lastSync })
      }
    } catch {} finally { setLoadingStats(false) }
  }, [])

  useEffect(() => { loadStats() }, [loadStats])

  async function handleSync() {
    if (!selectedComuna || syncing) return
    setSyncing(true)
    setSyncResult(null)
    setSyncError(null)
    setSyncProgress({ current: 0, total: 0, phase: 'Cargando listado desde TocToc...' })

    try {
      // 1. Fetch listings from TocToc via Edge endpoint
      const listRes = await fetch(`/api/admin/arriendos?zona=${encodeURIComponent(selectedComuna)}`)
      if (!listRes.ok) throw new Error('Error cargando listado de TocToc')
      const listData = await listRes.json()
      const listings = listData.results ?? []

      if (listings.length === 0) {
        setSyncResult('No se encontraron arriendos en TocToc para esta comuna')
        setSyncing(false)
        return
      }

      setSyncProgress({ current: 0, total: listings.length, phase: 'Obteniendo coordenadas y guardando...' })

      // 2. Send batches to sync endpoint (10 at a time)
      const BATCH = 10
      let totalSaved = 0
      let totalSkipped = 0

      for (let i = 0; i < listings.length; i += BATCH) {
        const batch = listings.slice(i, i + BATCH)
        const res = await fetch('/api/admin/arriendos/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listings: batch }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error ?? `Error en batch ${i}`)
        }
        const result = await res.json()
        totalSaved += result.saved
        totalSkipped += result.alreadyExisted
        setSyncProgress({ current: Math.min(i + BATCH, listings.length), total: listings.length, phase: 'Obteniendo coordenadas y guardando...' })
      }

      setSyncResult(`Sincronización completada: ${totalSaved} nuevos, ${totalSkipped} ya existían`)
      loadStats()
    } catch (e: any) {
      setSyncError(e.message ?? 'Error desconocido')
    } finally {
      setSyncing(false)
    }
  }

  const lastSyncDate = dbStats?.lastSync
    ? new Date(dbStats.lastSync).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="max-w-2xl mx-auto py-10 px-6 space-y-6">
      {/* Encabezado */}
      <div className="flex items-center gap-3">
        <Database className="h-6 w-6 text-brand-primary" />
        <div>
          <h1 className="text-xl font-bold text-brand-text">Sincronizar Arriendos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Importa arriendos desde TocToc con coordenadas exactas</p>
        </div>
      </div>

      {/* Stats de BD */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Base de datos</p>
        {loadingStats ? (
          <div className="flex items-center gap-2 text-sm text-gray-400"><Loader2 className="h-4 w-4 animate-spin" /> Cargando...</div>
        ) : dbStats ? (
          <>
            <div className="flex items-center gap-6">
              <div>
                <p className="text-2xl font-bold text-brand-text">{dbStats.total.toLocaleString('es-CL')}</p>
                <p className="text-xs text-gray-500">arriendos guardados</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-brand-text">{dbStats.communes.length}</p>
                <p className="text-xs text-gray-500">comunas</p>
              </div>
              {lastSyncDate && (
                <div>
                  <p className="text-sm font-medium text-gray-700">{lastSyncDate}</p>
                  <p className="text-xs text-gray-500">última sincronización</p>
                </div>
              )}
            </div>
            {dbStats.communes.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {dbStats.communes.filter(c => c.commune).map(c => (
                  <span key={c.commune} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                    <MapPin className="h-2.5 w-2.5 inline mr-0.5" />{c.commune} ({c.count})
                  </span>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-400">Sin datos</p>
        )}
      </div>

      {/* Sincronizar */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sincronizar comuna</p>
        <p className="text-sm text-gray-600">
          Selecciona una comuna para importar todos sus arriendos desde TocToc. Se obtendrán las coordenadas exactas de cada propiedad.
        </p>

        <div className="flex gap-3">
          <select
            value={selectedComuna}
            onChange={e => setSelectedComuna(e.target.value)}
            disabled={syncing}
            className="input-field flex-1 text-sm"
          >
            <option value="">Selecciona una comuna...</option>
            {COMUNAS.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <button
            onClick={handleSync}
            disabled={!selectedComuna || syncing}
            className={cn(
              'inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-colors whitespace-nowrap',
              syncing
                ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                : 'bg-brand-primary text-white hover:bg-brand-primary-dark disabled:opacity-50'
            )}
          >
            <RefreshCw className={cn('h-4 w-4', syncing && 'animate-spin')} />
            {syncing ? 'Sincronizando...' : 'Sincronizar'}
          </button>
        </div>

        {/* Progress */}
        {syncing && syncProgress.total > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span>{syncProgress.phase}</span>
              <span>{syncProgress.current} / {syncProgress.total}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-brand-primary h-2 rounded-full transition-all"
                style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {syncResult && (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
            {syncResult}
          </div>
        )}

        {syncError && (
          <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {syncError}
          </div>
        )}
      </div>
    </div>
  )
}
