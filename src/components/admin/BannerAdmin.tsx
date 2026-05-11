'use client'
// src/components/admin/BannerAdmin.tsx
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Upload, X, ImageIcon, Save, ToggleLeft, ToggleRight, ExternalLink } from 'lucide-react'

type BannerState = {
  isActive: boolean
  imageUrl: string | null
  isLinkEnabled: boolean
  linkUrl: string
}

export default function BannerAdmin() {
  const [banner, setBanner] = useState<BannerState>({
    isActive: false,
    imageUrl: null,
    isLinkEnabled: false,
    linkUrl: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/admin/banner')
      .then((r) => r.json())
      .then((data) => {
        setBanner({
          isActive: data.isActive ?? false,
          imageUrl: data.imageUrl ?? null,
          isLinkEnabled: data.isLinkEnabled ?? false,
          linkUrl: data.linkUrl ?? '',
        })
      })
      .finally(() => setLoading(false))
  }, [])

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  function handleFile(f: File) {
    if (!f.type.match(/^image\/(jpeg|png|webp)$/)) {
      showToast('Solo se permiten imágenes JPG, PNG o WebP', false)
      return
    }
    if (f.size > 8 * 1024 * 1024) {
      showToast('La imagen no puede superar 8MB', false)
      return
    }
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  function toggleActive() {
    setBanner((b) => ({
      ...b,
      isActive: !b.isActive,
      // Al desactivar el banner, el link externo también se desactiva
      isLinkEnabled: b.isActive ? false : b.isLinkEnabled,
    }))
  }

  function toggleLinkEnabled() {
    if (!banner.isActive) return
    setBanner((b) => ({ ...b, isLinkEnabled: !b.isLinkEnabled }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const form = new FormData()
      form.append('isActive', banner.isActive ? 'true' : 'false')
      form.append('isLinkEnabled', banner.isLinkEnabled ? 'true' : 'false')
      form.append('linkUrl', banner.linkUrl)
      if (file) form.append('file', file)
      if (banner.imageUrl && !file) form.append('imageUrl', banner.imageUrl)

      const res = await fetch('/api/admin/banner', { method: 'PUT', body: form })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error || 'Error al guardar', false)
        return
      }
      setBanner({
        isActive: data.isActive,
        imageUrl: data.imageUrl,
        isLinkEnabled: data.isLinkEnabled,
        linkUrl: data.linkUrl ?? '',
      })
      setFile(null)
      setPreview(null)
      showToast('Banner guardado correctamente', true)
    } catch {
      showToast('Error de red', false)
    } finally {
      setSaving(false)
    }
  }

  function removeImage() {
    setFile(null)
    setPreview(null)
    setBanner((b) => ({ ...b, imageUrl: null }))
    if (fileRef.current) fileRef.current.value = ''
  }

  const currentImage = preview ?? banner.imageUrl

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        Cargando configuración…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 px-5 py-3 rounded shadow-lg text-sm font-medium text-white transition-all ${
            toast.ok ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Toggle activo/inactivo */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-1">Estado del banner</h2>
        <p className="text-sm text-gray-500 mb-4">
          Cuando está activo, el banner aparece sobre el hero en la página principal.
        </p>
        <button
          type="button"
          onClick={toggleActive}
          className="flex items-center gap-3 group"
        >
          {banner.isActive ? (
            <ToggleRight className="w-10 h-10 text-brand-primary" />
          ) : (
            <ToggleLeft className="w-10 h-10 text-gray-300" />
          )}
          <span className={`text-sm font-medium ${banner.isActive ? 'text-brand-primary' : 'text-gray-400'}`}>
            {banner.isActive ? 'Activo — visible en el sitio' : 'Inactivo — oculto en el sitio'}
          </span>
        </button>
      </div>

      {/* Toggle link externo */}
      <div className={`bg-white border rounded-lg p-6 transition-opacity ${!banner.isActive ? 'opacity-50 pointer-events-none' : 'border-gray-200'}`}>
        <h2 className="text-base font-semibold text-gray-800 mb-1">Link externo</h2>
        <p className="text-sm text-gray-500 mb-4">
          Al activar esta opción, el banner abrirá un link externo en una nueva ventana en lugar de ir al formulario de contacto.
          {!banner.isActive && <span className="ml-1 text-amber-600 font-medium">Requiere que el banner esté activo.</span>}
        </p>

        <button
          type="button"
          onClick={toggleLinkEnabled}
          disabled={!banner.isActive}
          className="flex items-center gap-3 group disabled:cursor-not-allowed"
        >
          {banner.isLinkEnabled ? (
            <ToggleRight className="w-10 h-10 text-brand-primary" />
          ) : (
            <ToggleLeft className="w-10 h-10 text-gray-300" />
          )}
          <span className={`text-sm font-medium ${banner.isLinkEnabled ? 'text-brand-primary' : 'text-gray-400'}`}>
            {banner.isLinkEnabled ? 'Link externo activo' : 'Link externo inactivo — abre formulario de contacto'}
          </span>
        </button>

        {/* Input de URL — visible solo cuando el link externo está habilitado */}
        {banner.isLinkEnabled && (
          <div className="mt-4">
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              URL del link externo
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="url"
                  value={banner.linkUrl}
                  onChange={(e) => setBanner((b) => ({ ...b, linkUrl: e.target.value }))}
                  placeholder="https://ejemplo.com/formulario"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                />
              </div>
              {banner.linkUrl && (
                <a
                  href={banner.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-brand-primary hover:underline whitespace-nowrap"
                >
                  Probar link
                </a>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Al hacer click en el banner, el usuario será redirigido a esta URL en una nueva pestaña.
            </p>
          </div>
        )}
      </div>

      {/* Upload de imagen */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-1">Imagen del banner</h2>
        <p className="text-sm text-gray-500 mb-4">
          Tamaño recomendado: 1920×600 px — JPG, PNG o WebP — máx. 8 MB.
        </p>

        {currentImage ? (
          <div className="relative">
            <div className="relative w-full aspect-[16/5] overflow-hidden rounded border border-gray-200 bg-gray-50">
              <Image src={currentImage} alt="Banner preview" fill className="object-cover" unoptimized />
            </div>
            <button
              type="button"
              onClick={removeImage}
              className="absolute top-2 right-2 bg-white border border-gray-300 rounded-full p-1.5 shadow hover:bg-red-50 hover:border-red-300 transition-colors"
              title="Quitar imagen"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
            {file && (
              <p className="mt-2 text-xs text-amber-600">
                Nueva imagen seleccionada — guarda para aplicar los cambios.
              </p>
            )}
          </div>
        ) : (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center hover:border-brand-primary/50 transition-colors cursor-pointer"
            onClick={() => fileRef.current?.click()}
          >
            <ImageIcon className="mx-auto w-10 h-10 text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-600">
              Arrastra una imagen aquí o{' '}
              <span className="text-brand-primary underline">haz clic para seleccionar</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG o WebP — máx. 8 MB</p>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleFile(f)
          }}
        />

        {!currentImage && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="mt-3 flex items-center gap-2 text-sm text-brand-primary hover:underline"
          >
            <Upload className="w-4 h-4" /> Seleccionar imagen
          </button>
        )}
      </div>

      {/* Botón guardar */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-brand-primary text-white text-sm font-semibold rounded hover:bg-brand-primary/90 disabled:opacity-60 transition-colors"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}
