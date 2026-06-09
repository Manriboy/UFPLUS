'use client'
// src/components/admin/UsadoAdminEdit.tsx
import { useState, useRef } from 'react'
import Link from 'next/link'
import {
  ChevronLeft, ExternalLink, Save, CheckCircle, X, Loader2, Camera,
  MapPin, Bed, Bath, Car, Maximize2, GripVertical, Star,
} from 'lucide-react'
import { cn, formatPrice } from '@/lib/utils'
import { toast } from '@/components/ui/Toast'

// ─── Tipos ────────────────────────────────────────────

type Status = 'DRAFT' | 'PENDING' | 'AVAILABLE' | 'BLOCKED' | 'SUSPENDED' | 'SOLD'

interface Owner {
  name: string | null
  email: string
  phone: string | null
  role: string
}

interface Property {
  id: string
  status: Status
  title: string | null
  description: string | null
  price: number | null
  currency: string | null
  commune: string | null
  region: string | null
  address: string | null
  bedrooms: number | null
  bathrooms: number | null
  parkingSpots: number | null
  storageRooms: number | null
  sqmTotal: number | null
  sqmTerrace: number | null
  sqmUsable: number | null
  floorNumber: number | null
  propertyType: string | null
  orientations: string[]
  images: string[]
  isFeatured: boolean
  isArchived: boolean
  owner: Owner
}

// ─── Constantes ───────────────────────────────────────

const STATUS_LABEL: Record<Status, string> = {
  DRAFT: 'Borrador', PENDING: 'Por aprobar', AVAILABLE: 'Disponible',
  BLOCKED: 'Bloqueado', SUSPENDED: 'Suspendido', SOLD: 'Vendido',
}

const STATUS_COLOR: Record<Status, string> = {
  DRAFT: 'bg-gray-100 text-gray-500',
  PENDING: 'bg-amber-100 text-amber-700',
  AVAILABLE: 'bg-green-100 text-green-700',
  BLOCKED: 'bg-red-100 text-red-700',
  SUSPENDED: 'bg-gray-100 text-gray-500',
  SOLD: 'bg-blue-100 text-blue-700',
}

// ─── Upload de imágenes ───────────────────────────────

async function resizeToJpeg(file: File, maxPx = 1920, quality = 0.85): Promise<Blob> {
  return new Promise(resolve => {
    const img = new window.Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const r = Math.min(maxPx / img.width, maxPx / img.height, 1)
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * r); c.height = Math.round(img.height * r)
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      c.toBlob(b => resolve(b!), 'image/jpeg', quality)
    }
    img.src = url
  })
}

async function uploadImage(blob: Blob): Promise<string> {
  const fd = new FormData()
  fd.append('file', blob, 'photo.jpg')
  const res = await fetch('/api/admin/usados/upload', { method: 'POST', body: fd })
  const json = await res.json()
  if (!json.url) throw new Error(json.error || 'Upload fallido')
  return json.url as string
}

// ─── Componente ───────────────────────────────────────

export default function UsadoAdminEdit({ property: initial }: { property: Property }) {
  const [data, setData] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dragSrcRef = useRef<number | null>(null)

  const patch = (updates: Partial<Property>) => setData(prev => ({ ...prev, ...updates }))

  const save = async (updates: Partial<Property> = {}) => {
    setSaving(true)
    try {
      const payload = { ...updates }
      const res = await fetch(`/api/admin/usados/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setData(prev => ({ ...prev, ...updated }))
      toast('Guardado correctamente', 'success')
    } catch {
      toast('Error al guardar', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleFiles = async (files: FileList) => {
    if (!files.length) return
    setUploading(true)
    const urls = [...data.images]
    for (let i = 0; i < files.length; i++) {
      try {
        const blob = await resizeToJpeg(files[i])
        const url = await uploadImage(blob)
        urls.push(url)
        patch({ images: [...urls] })
      } catch { /* skip */ }
    }
    await save({ images: urls })
    setUploading(false)
  }

  const removeImage = async (idx: number) => {
    const imgs = data.images.filter((_, i) => i !== idx)
    patch({ images: imgs })
    await save({ images: imgs })
  }

  const setPrincipal = async (idx: number) => {
    if (idx === 0) return
    const imgs = [...data.images]
    const [item] = imgs.splice(idx, 1)
    imgs.unshift(item)
    patch({ images: imgs })
    await save({ images: imgs })
  }

  const reorderImages = async (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return
    const imgs = [...data.images]
    const [item] = imgs.splice(fromIdx, 1)
    imgs.splice(toIdx, 0, item)
    patch({ images: imgs })
    await save({ images: imgs })
  }

  const handleStatusChange = async (status: Status) => {
    patch({ status })
    await save({ status })
  }

  const handleSaveFields = async () => {
    await save({
      title: data.title,
      description: data.description,
      price: data.price,
      currency: data.currency,
      isFeatured: data.isFeatured,
    })
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/proyectos?categoria=usados"
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand-primary mb-2 transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Volver a Departamentos
          </Link>
          <h1 className="text-2xl font-display font-bold text-brand-text">
            {data.title || 'Sin título'}
          </h1>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', STATUS_COLOR[data.status])}>
              {STATUS_LABEL[data.status]}
            </span>
            {(data.commune || data.region) && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <MapPin className="h-3 w-3" />
                {[data.commune, data.region].filter(Boolean).join(', ')}
              </span>
            )}
          </div>
        </div>
        <a
          href={`/usados/${data.id}`}
          target="_blank"
          className="flex items-center gap-1.5 text-xs font-medium text-brand-primary border border-brand-primary/30 rounded-lg px-3 py-1.5 hover:bg-brand-primary/5 transition-colors flex-shrink-0"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Ver publicación
        </a>
      </div>

      {/* Owner info */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Propietario / Broker</p>
        <div className="flex items-center gap-4 flex-wrap text-sm">
          <span className="font-medium text-gray-800">{data.owner.name ?? 'Sin nombre'}</span>
          <span className="text-gray-500">{data.owner.email}</span>
          {data.owner.phone && <span className="text-gray-500">{data.owner.phone}</span>}
          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', data.owner.role === 'BROKER' ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700')}>
            {data.owner.role === 'BROKER' ? 'Broker' : 'Propietario'}
          </span>
        </div>
      </div>

      {/* Estado */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <p className="text-sm font-semibold text-gray-800 mb-3">Estado de la publicación</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(STATUS_LABEL) as Status[]).map(s => (
            <button
              key={s}
              onClick={() => handleStatusChange(s)}
              disabled={saving}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
                data.status === s
                  ? `${STATUS_COLOR[s]} border-current`
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
              )}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
        {data.status === 'PENDING' && (
          <button
            onClick={() => handleStatusChange('AVAILABLE')}
            disabled={saving}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            <CheckCircle className="h-4 w-4" />
            Aprobar publicación
          </button>
        )}
      </div>

      {/* Specs (solo lectura) */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <p className="text-sm font-semibold text-gray-800 mb-3">Características</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          {data.bedrooms != null && (
            <div className="flex items-center gap-2 text-gray-600">
              <Bed className="h-4 w-4 text-brand-primary" /> {data.bedrooms} dorm.
            </div>
          )}
          {data.bathrooms != null && (
            <div className="flex items-center gap-2 text-gray-600">
              <Bath className="h-4 w-4 text-brand-primary" /> {data.bathrooms} baños
            </div>
          )}
          {data.parkingSpots != null && (
            <div className="flex items-center gap-2 text-gray-600">
              <Car className="h-4 w-4 text-brand-primary" /> {data.parkingSpots} estac.
            </div>
          )}
          {data.sqmTotal != null && (
            <div className="flex items-center gap-2 text-gray-600">
              <Maximize2 className="h-4 w-4 text-brand-primary" /> {data.sqmTotal} m²
            </div>
          )}
        </div>
        {data.address && (
          <p className="mt-3 text-xs text-gray-500 flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" /> {data.address}
          </p>
        )}
      </div>

      {/* Campos editables */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <p className="text-sm font-semibold text-gray-800">Información editable</p>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Título</label>
          <input
            type="text"
            value={data.title ?? ''}
            onChange={e => patch({ title: e.target.value })}
            className="input-field text-sm w-full"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
          <textarea
            rows={4}
            value={data.description ?? ''}
            onChange={e => patch({ description: e.target.value })}
            className="input-field text-sm w-full resize-y"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Precio</label>
            <input
              type="number" min={0}
              value={data.price ?? ''}
              onChange={e => patch({ price: e.target.value ? parseFloat(e.target.value) : null })}
              className="input-field text-sm w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Moneda</label>
            <select
              value={data.currency ?? 'UF'}
              onChange={e => patch({ currency: e.target.value })}
              className="input-field text-sm w-full"
            >
              {['UF', 'CLP$', 'USD$'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="featured"
            checked={data.isFeatured}
            onChange={e => patch({ isFeatured: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-brand-primary"
          />
          <label htmlFor="featured" className="text-sm text-gray-700">Destacar publicación</label>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleSaveFields}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar cambios
          </button>
        </div>
      </div>

      {/* Imágenes */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <p className="text-sm font-semibold text-gray-800">Fotos ({data.images.length})</p>

        {data.images.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {data.images.map((url, i) => (
              <div
                key={url}
                className="relative group aspect-square cursor-grab active:cursor-grabbing"
                draggable={true}
                onDragStart={() => { dragSrcRef.current = i }}
                onDragOver={e => e.preventDefault()}
                onDrop={() => reorderImages(dragSrcRef.current ?? i, i)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-full h-full object-cover rounded-lg pointer-events-none" />
                {/* Drag handle */}
                <div className="absolute top-1 left-1 bg-black/40 text-white rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
                  <GripVertical className="h-3 w-3" />
                </div>
                {/* Delete */}
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
                {/* Principal badge / set principal */}
                {i === 0 ? (
                  <span className="absolute bottom-1 left-1 text-[10px] bg-brand-primary text-white px-1.5 py-0.5 rounded font-semibold">
                    Principal
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPrincipal(i)}
                    title="Establecer como principal"
                    className="absolute bottom-1 left-1 bg-black/60 text-white rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-brand-primary"
                  >
                    <Star className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
          className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-brand-primary hover:bg-brand-primary/5 transition-colors"
        >
          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin text-brand-primary" /> Subiendo imágenes…
            </div>
          ) : (
            <>
              <Camera className="h-7 w-7 text-gray-300 mx-auto mb-1.5" />
              <p className="text-sm text-gray-500">Haz clic o arrastra fotos para agregar</p>
              <p className="text-xs text-gray-400 mt-0.5">JPG, PNG — múltiples archivos</p>
            </>
          )}
        </div>
        <input
          ref={inputRef} type="file" accept="image/*" multiple className="hidden"
          onChange={e => e.target.files && handleFiles(e.target.files)}
        />
      </div>
    </div>
  )
}
