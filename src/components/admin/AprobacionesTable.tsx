'use client'
// src/components/admin/AprobacionesTable.tsx
import { useState, useEffect } from 'react'
import { CheckCircle, Archive, ExternalLink, Loader2 } from 'lucide-react'
import { toast } from '@/components/ui/Toast'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

interface Owner { id: string; name: string | null; email: string; phone: string | null; role: string }

interface PendingProperty {
  id: string
  region: string | null
  commune: string | null
  bedrooms: number | null
  bathrooms: number | null
  parkingSpots: number | null
  storageRooms: number | null
  sqmTotal: number | null
  sqmTerrace: number | null
  price: number | null
  currency: string | null
  updatedAt: string
  owner: Owner
}

function dias(updatedAt: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86_400_000))
}

function DiasBadge({ n }: { n: number }) {
  const color = n <= 2 ? 'bg-green-100 text-green-700' : n <= 7 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
  return <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${color}`}>{n}d</span>
}

export default function AprobacionesTable() {
  const [items, setItems]           = useState<PendingProperty[]>([])
  const [loading, setLoading]       = useState(true)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<PendingProperty | null>(null)
  const [archiving, setArchiving]   = useState(false)

  useEffect(() => {
    fetch('/api/admin/aprobaciones')
      .then(r => r.json())
      .then(data => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  const handleApprove = async (item: PendingProperty) => {
    setApprovingId(item.id)
    try {
      const res = await fetch(`/api/admin/aprobaciones/${item.id}`, { method: 'POST' })
      if (!res.ok) throw new Error()
      setItems(prev => prev.filter(p => p.id !== item.id))
      toast('Publicación aprobada y disponible', 'success')
    } catch {
      toast('Error al aprobar', 'error')
    } finally {
      setApprovingId(null)
    }
  }

  const handleArchive = async () => {
    if (!archiveTarget) return
    setArchiving(true)
    try {
      const res = await fetch(`/api/admin/aprobaciones/${archiveTarget.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setItems(prev => prev.filter(p => p.id !== archiveTarget.id))
      toast('Publicación archivada', 'success')
      setArchiveTarget(null)
    } catch {
      toast('Error al archivar', 'error')
    } finally {
      setArchiving(false)
    }
  }

  function formatPrice(item: PendingProperty) {
    if (!item.price) return '—'
    return `${item.price.toLocaleString('es-CL')} ${item.currency ?? 'UF'}`
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <CheckCircle className="h-8 w-8 text-emerald-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No hay publicaciones pendientes de aprobación</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Usuario','Contacto','Región','Comuna','# Dorm','# Baños','Estac','Bodega','M² Tot','M² Terr','Precio','Días','Acciones'].map(col => (
                    <th key={col} className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map(item => {
                  const approving = approvingId === item.id
                  const d = dias(item.updatedAt)
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-3">
                        <p className="font-medium text-gray-800 text-xs">{item.owner.name ?? '—'}</p>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${item.owner.role === 'BROKER' ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {item.owner.role === 'BROKER' ? 'Broker' : 'Propietario'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-500">
                        {item.owner.phone ?? item.owner.email}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600">{item.region ?? '—'}</td>
                      <td className="px-3 py-3 text-xs text-gray-600">{item.commune ?? '—'}</td>
                      <td className="px-3 py-3 text-center text-gray-700">{item.bedrooms ?? '—'}</td>
                      <td className="px-3 py-3 text-center text-gray-700">{item.bathrooms ?? '—'}</td>
                      <td className="px-3 py-3 text-center text-gray-700">{item.parkingSpots ?? '—'}</td>
                      <td className="px-3 py-3 text-center text-gray-700">{item.storageRooms ?? '—'}</td>
                      <td className="px-3 py-3 text-right text-gray-700">{item.sqmTotal != null ? `${item.sqmTotal} m²` : '—'}</td>
                      <td className="px-3 py-3 text-right text-gray-500">{item.sqmTerrace != null && item.sqmTerrace > 0 ? `${item.sqmTerrace} m²` : '—'}</td>
                      <td className="px-3 py-3 text-right font-medium text-brand-primary whitespace-nowrap">{formatPrice(item)}</td>
                      <td className="px-3 py-3 text-center"><DiasBadge n={d} /></td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleApprove(item)}
                            disabled={approving}
                            title="Aprobar"
                            className="p-1.5 rounded text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                          >
                            {approving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                          </button>
                          <a
                            href={`/usados/${item.id}`}
                            target="_blank"
                            title="Ver publicación"
                            className="p-1.5 rounded text-gray-400 hover:text-brand-secondary hover:bg-gray-100 transition-colors"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                          <button
                            onClick={() => setArchiveTarget(item)}
                            title="Archivar"
                            className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Archive className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleArchive}
        loading={archiving}
        title="Archivar publicación"
        description={`¿Archivar el departamento de ${archiveTarget?.owner.name ?? 'este propietario'} en ${archiveTarget?.commune ?? 'esta comuna'}? Quedará suspendido y no visible.`}
        confirmLabel="Archivar"
        cancelLabel="Cancelar"
      />
    </div>
  )
}
