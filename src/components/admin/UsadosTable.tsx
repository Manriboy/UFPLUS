'use client'
// src/components/admin/UsadosTable.tsx
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Edit, Archive, Star, Loader2, ExternalLink } from 'lucide-react'
import { toast } from '@/components/ui/Toast'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

type ListingStatus = 'DRAFT' | 'PENDING' | 'AVAILABLE' | 'BLOCKED' | 'SUSPENDED' | 'SOLD'

interface UsedProperty {
  id: string
  commune: string | null
  bedrooms: number | null
  bathrooms: number | null
  parkingSpots: number | null
  storageRooms: number | null
  sqmTotal: number | null
  sqmTerrace: number | null
  price: number | null
  status: ListingStatus
  isFeatured: boolean
  isArchived: boolean
  createdAt: string
}

interface Props {
  initialFilter: string
}

function formatUF(v: number | null) {
  if (!v) return '—'
  return `${v.toLocaleString('es-CL')} UF`
}

const STATUS_LABEL: Record<ListingStatus, string> = {
  DRAFT:     'Borrador',
  PENDING:   'Por aprobar',
  AVAILABLE: 'Disponible',
  BLOCKED:   'Bloqueado',
  SUSPENDED: 'Suspendido',
  SOLD:      'Vendido',
}

const STATUS_STYLE: Record<ListingStatus, string> = {
  DRAFT:     'bg-gray-100 text-gray-400',
  PENDING:   'bg-amber-100 text-amber-700',
  AVAILABLE: 'bg-green-100 text-green-700',
  BLOCKED:   'bg-red-100 text-red-700',
  SUSPENDED: 'bg-gray-100 text-gray-500',
  SOLD:      'bg-blue-100 text-blue-700',
}

const STATUS_DOT: Record<ListingStatus, string> = {
  DRAFT:     'bg-gray-300',
  PENDING:   'bg-amber-400',
  AVAILABLE: 'bg-green-500',
  BLOCKED:   'bg-red-500',
  SUSPENDED: 'bg-gray-400',
  SOLD:      'bg-blue-500',
}

export default function UsadosTable({ initialFilter }: Props) {
  const [items, setItems] = useState<UsedProperty[]>([])
  const [loading, setLoading] = useState(true)
  const [archiveTarget, setArchiveTarget] = useState<UsedProperty | null>(null)
  const [archiving, setArchiving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ filter: initialFilter })
      const res = await fetch(`/api/admin/usados?${params}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setItems(data)
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [initialFilter])

  useEffect(() => { fetchItems() }, [fetchItems])

  const handleToggleFeatured = async (item: UsedProperty) => {
    setTogglingId(item.id)
    try {
      const res = await fetch(`/api/admin/usados/${item.id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: 'isFeatured' }),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setItems(prev => prev.map(p => p.id === item.id ? { ...p, ...updated } : p))
      toast(`Publicación ${updated.isFeatured ? 'destacada' : 'quitada de destacados'}`, 'success')
    } catch {
      toast('Error al actualizar publicación', 'error')
    } finally {
      setTogglingId(null)
    }
  }

  const handleArchive = async () => {
    if (!archiveTarget) return
    setArchiving(true)
    try {
      const res = await fetch(`/api/admin/usados/${archiveTarget.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setItems(prev => prev.filter(p => p.id !== archiveTarget.id))
      toast('Publicación archivada correctamente', 'success')
      setArchiveTarget(null)
    } catch {
      toast('Error al archivar publicación', 'error')
    } finally {
      setArchiving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-sm">No hay departamentos usados en esta categoría</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    Comuna
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    # Dorm
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap hidden lg:table-cell">
                    # Baños
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap hidden lg:table-cell">
                    Estac
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap hidden lg:table-cell">
                    Bodega
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap hidden xl:table-cell">
                    M² Tot
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap hidden xl:table-cell">
                    M² Terr
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap hidden md:table-cell">
                    Precio
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    Estado
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap hidden md:table-cell">
                    Destacado
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap hidden xl:table-cell">
                    Creado
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map(item => {
                  const isToggling = togglingId === item.id

                  return (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        {item.commune || '—'}
                        {item.isArchived && (
                          <span className="ml-2 text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">
                            Archivado
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-700">
                        {item.bedrooms ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-700 hidden lg:table-cell">
                        {item.bathrooms ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-700 hidden lg:table-cell">
                        {item.parkingSpots ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-700 hidden lg:table-cell">
                        {item.storageRooms ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 hidden xl:table-cell">
                        {item.sqmTotal != null ? `${item.sqmTotal} m²` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500 hidden xl:table-cell">
                        {item.sqmTerrace != null && item.sqmTerrace > 0 ? `${item.sqmTerrace} m²` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        <span className="font-medium text-brand-primary">{formatUF(item.price)}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${STATUS_STYLE[item.status]}`}>
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[item.status]}`} />
                          {STATUS_LABEL[item.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center hidden md:table-cell">
                        <button
                          onClick={() => !item.isArchived && handleToggleFeatured(item)}
                          disabled={isToggling || item.isArchived}
                          title={item.isFeatured ? 'Quitar destacado' : 'Destacar'}
                          className="disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isToggling ? (
                            <Loader2 className="h-4 w-4 animate-spin text-gray-400 mx-auto" />
                          ) : item.isFeatured ? (
                            <Star className="h-4 w-4 text-amber-500 fill-amber-500 mx-auto hover:opacity-70 transition-opacity" />
                          ) : (
                            <Star className="h-4 w-4 text-gray-300 mx-auto hover:text-amber-400 transition-colors" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs hidden xl:table-cell whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleDateString('es-CL')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/admin/proyectos/usados/${item.id}`}
                            title="Editar"
                            className="p-1.5 text-gray-400 hover:text-brand-primary hover:bg-red-50 rounded transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          <Link
                            href={`/usados/${item.id}`}
                            target="_blank"
                            title="Ver en sitio público"
                            className="p-1.5 text-gray-400 hover:text-brand-secondary hover:bg-gray-100 rounded transition-colors"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                          {!item.isArchived && (
                            <button
                              onClick={() => setArchiveTarget(item)}
                              title="Archivar"
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            >
                              <Archive className="h-4 w-4" />
                            </button>
                          )}
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
        description={`¿Estás seguro de archivar este departamento en ${archiveTarget?.commune ?? 'esta comuna'}? Se desactivará y no será visible en el sitio.`}
        confirmLabel="Archivar"
        cancelLabel="Cancelar"
      />
    </div>
  )
}
