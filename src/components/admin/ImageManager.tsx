'use client'
// src/components/admin/ImageManager.tsx
import { useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import { useDropzone } from 'react-dropzone'
import { toast } from '@/components/ui/Toast'
import { Upload, Trash2, Star, Loader2, ImageOff, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProjectImage {
  id: string
  url: string
  alt: string | null
  isMain: boolean
  sortOrder: number
  publicId?: string | null
}

interface Props {
  projectId: string
  initialImages: ProjectImage[]
}

export default function ImageManager({ projectId, initialImages }: Props) {
  const [images, setImages] = useState<ProjectImage[]>(initialImages)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [savingOrder, setSavingOrder] = useState(false)
  const dragIndexRef = useRef<number | null>(null)
  const dragOverIndexRef = useRef<number | null>(null)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return
    setUploading(true)

    // Capturamos el largo actual ANTES del loop para evitar stale closure
    const currentLength = images.length

    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i]
      try {
        const formData = new FormData()
        formData.append('file', file)

        const uploadRes = await fetch('/api/admin/upload', {
          method: 'POST',
          body: formData,
        })

        if (!uploadRes.ok) {
          const err = await uploadRes.json()
          toast(err.error || 'Error al subir imagen', 'error')
          continue
        }

        const { url, publicId } = await uploadRes.json()

        // Solo la primera imagen del batch es principal si no hay ninguna aún
        const isFirst = currentLength === 0 && i === 0

        const saveRes = await fetch(`/api/admin/projects/${projectId}/images`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url,
            publicId,
            alt: file.name.replace(/\.[^.]+$/, ''),
            isMain: isFirst,
          }),
        })

        if (!saveRes.ok) {
          toast('Error al guardar imagen', 'error')
          continue
        }

        const newImage = await saveRes.json()
        setImages((prev) => [...prev, newImage])
        toast(`Imagen "${file.name}" subida correctamente`, 'success')
      } catch {
        toast('Error inesperado al subir imagen', 'error')
      }
    }

    setUploading(false)
  }, [images.length, projectId])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxSize: 5 * 1024 * 1024,
    multiple: true,
  })

  const handleDelete = async (imageId: string) => {
    setDeletingId(imageId)
    try {
      const res = await fetch(`/api/admin/projects/${projectId}/images`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId }),
      })
      if (!res.ok) throw new Error()
      setImages((prev) => prev.filter((img) => img.id !== imageId))
      toast('Imagen eliminada', 'success')
    } catch {
      toast('Error al eliminar imagen', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  const handleSetMain = async (imageId: string) => {
    try {
      const res = await fetch(`/api/admin/projects/${projectId}/images`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId, isMain: true }),
      })
      if (!res.ok) throw new Error()
      setImages((prev) =>
        prev.map((img) => ({ ...img, isMain: img.id === imageId }))
      )
      toast('Imagen principal actualizada', 'success')
    } catch {
      toast('Error al actualizar imagen principal', 'error')
    }
  }

  // ─── Drag-and-drop reorder ────────────────────────────────────────────────

  const handleDragStart = (index: number) => {
    dragIndexRef.current = index
  }

  const handleDragEnter = (index: number) => {
    dragOverIndexRef.current = index
  }

  const handleDragEnd = async () => {
    const from = dragIndexRef.current
    const to = dragOverIndexRef.current

    dragIndexRef.current = null
    dragOverIndexRef.current = null

    if (from === null || to === null || from === to) return

    const reordered = [...images]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(to, 0, moved)

    // Asignar sortOrder consecutivo
    const withOrder = reordered.map((img, i) => ({ ...img, sortOrder: i + 1 }))
    setImages(withOrder)

    setSavingOrder(true)
    try {
      await Promise.all(
        withOrder.map((img) =>
          fetch(`/api/admin/projects/${projectId}/images`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageId: img.id, sortOrder: img.sortOrder }),
          })
        )
      )
      toast('Orden guardado', 'success')
    } catch {
      toast('Error al guardar el orden', 'error')
    } finally {
      setSavingOrder(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200',
          isDragActive
            ? 'border-brand-primary bg-red-50'
            : 'border-gray-300 hover:border-brand-primary hover:bg-gray-50'
        )}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 text-brand-primary animate-spin" />
            <p className="text-sm text-gray-600">Subiendo imágenes...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-gray-400" />
            <p className="text-sm font-medium text-brand-text">
              {isDragActive ? 'Suelta las imágenes aquí' : 'Arrastra imágenes o haz clic para seleccionar'}
            </p>
            <p className="text-xs text-gray-400">JPG, PNG, WebP · Máx 5MB por imagen</p>
          </div>
        )}
      </div>

      {/* Image Grid */}
      {images.length > 0 ? (
        <>
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <GripVertical className="h-3 w-3" />
            Arrastra las imágenes para cambiar el orden
            {savingOrder && <Loader2 className="h-3 w-3 animate-spin ml-1" />}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {images.map((img, index) => (
              <div
                key={img.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragEnter={() => handleDragEnter(index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
                className={cn(
                  'relative group aspect-[4/3] overflow-hidden border-2 rounded-lg bg-gray-100 cursor-grab active:cursor-grabbing select-none',
                  img.isMain ? 'border-brand-primary' : 'border-transparent hover:border-gray-300'
                )}
              >
                <Image
                  src={img.url}
                  alt={img.alt || 'Imagen del proyecto'}
                  fill
                  className="object-cover pointer-events-none"
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                />

                {/* Grip handle */}
                <div className="absolute top-1.5 right-1.5 bg-black/40 text-white rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical className="h-3.5 w-3.5" />
                </div>

                {/* Main badge */}
                {img.isMain && (
                  <div className="absolute top-1.5 left-1.5 bg-brand-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Principal
                  </div>
                )}

                {/* Actions overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center gap-2 pb-3">
                  {!img.isMain && (
                    <button
                      onClick={() => handleSetMain(img.id)}
                      title="Establecer como principal"
                      className="p-1.5 bg-white/90 text-amber-600 rounded-full hover:bg-white transition-colors"
                    >
                      <Star className="h-4 w-4" />
                    </button>
                  )}
                  {deletingId === img.id ? (
                    <div className="p-1.5 bg-white/90 rounded-full">
                      <Loader2 className="h-4 w-4 animate-spin text-red-600" />
                    </div>
                  ) : (
                    <button
                      onClick={() => handleDelete(img.id)}
                      title="Eliminar imagen"
                      className="p-1.5 bg-white/90 text-red-600 rounded-full hover:bg-white transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 border border-gray-200 rounded-lg text-gray-400">
          <ImageOff className="h-8 w-8 mb-2" />
          <p className="text-sm">Sin imágenes aún. Sube la primera imagen.</p>
        </div>
      )}

      <p className="text-xs text-gray-400">
        {images.length} imagen{images.length !== 1 ? 'es' : ''} ·
        Haz clic en la estrella para establecer como imagen principal.
      </p>
    </div>
  )
}
