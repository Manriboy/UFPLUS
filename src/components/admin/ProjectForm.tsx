'use client'
// src/components/admin/ProjectForm.tsx
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { projectSchema, type ProjectFormData } from '@/lib/validations'
import { slugify } from '@/lib/utils'
import { toast } from '@/components/ui/Toast'
import Button from '@/components/ui/Button'
import { Input, Textarea, Select, Toggle } from '@/components/ui/Input'
import { Plus, Trash2, ChevronDown, ChevronUp, Save, GripVertical, FileText, Upload, X, ExternalLink } from 'lucide-react'

interface Props {
  project?: any
}

const DELIVERY_OPTIONS = [
  { value: 'IMMEDIATE', label: 'Entrega inmediata' },
  { value: 'SOON', label: 'Pronta entrega' },
  { value: 'FUTURE', label: 'Entrega futura' },
  { value: 'IN_CONSTRUCTION', label: 'En construcción' },
]

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Borrador' },
  { value: 'PUBLISHED', label: 'Publicado' },
  { value: 'ARCHIVED', label: 'Archivado' },
]

const VIDEO_TYPE_OPTIONS = [
  { value: 'YOUTUBE', label: 'YouTube' },
  { value: 'VIMEO', label: 'Vimeo' },
  { value: 'OTHER', label: 'Otro' },
]

const COMMON_AMENITIES = [
  'Piscina', 'Quincho', 'Gimnasio', 'Sala de cowork', 'Lounge',
  'Sala de eventos', 'Business center', 'Terraza sky', 'Bicicletero',
  'Bodega', 'Estacionamiento', 'Sauna', 'Portería 24/7', 'Lavandería',
]

const COMMON_FINANCING = [
  'Crédito Hipotecario',
  'Pie en cuotas',
  'Apoyo al pie',
  'Entrega inmediata',
  'Inversión con renta garantizada',
  'Subsidio habitacional',
]

function PdfUploadField({ label, currentUrl, currentPubId, onUpload, onClear }: {
  label: string
  currentUrl?: string
  currentPubId?: string
  onUpload: (url: string, pubId: string) => void
  onClear: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleFile = async (file: File) => {
    if (file.type !== 'application/pdf') { toast('Solo se permiten archivos PDF', 'error'); return }
    if (file.size > 30 * 1024 * 1024) { toast('El PDF no puede superar 30MB', 'error'); return }
    setUploading(true)
    try {
      // 1. Obtener firma del servidor (petición pequeña, sin archivo)
      const signRes = await fetch('/api/admin/upload/pdf')
      if (!signRes.ok) { const e = await signRes.json(); throw new Error(e.error ?? 'Error al firmar') }
      const { cloudName, apiKey, timestamp, folder, signature } = await signRes.json()

      // 2. Subir directamente a Cloudinary desde el browser (sin pasar por Vercel)
      const fd = new FormData()
      fd.append('file', file)
      fd.append('api_key', apiKey)
      fd.append('timestamp', timestamp)
      fd.append('folder', folder)
      fd.append('signature', signature)

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`,
        { method: 'POST', body: fd }
      )
      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({}))
        throw new Error(err.error?.message ?? 'Error al subir a Cloudinary')
      }
      const data = await uploadRes.json()
      onUpload(data.secure_url, data.public_id)
      toast('PDF subido correctamente', 'success')
    } catch (e: any) {
      toast(e.message ?? 'Error al subir PDF', 'error')
    } finally { setUploading(false) }
  }

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {currentUrl ? (
        <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <FileText className="h-5 w-5 text-brand-primary flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-700 truncate">Brochure subido</p>
            <a href={currentUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs text-brand-primary hover:underline flex items-center gap-1">
              Ver PDF <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <button type="button" onClick={onClear}
            className="p-1 hover:bg-gray-200 rounded transition-colors">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-500 hover:border-brand-primary hover:text-brand-primary transition-colors disabled:opacity-50"
        >
          {uploading ? <><div className="h-4 w-4 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" /> Subiendo...</> : <><Upload className="h-4 w-4" /> Seleccionar PDF (máx. 20MB)</>}
        </button>
      )}
      <input ref={inputRef} type="file" accept=".pdf,application/pdf" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
    </div>
  )
}

function SectionCard({ title, children, defaultOpen = true }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <h3 className="font-semibold text-brand-text">{title}</h3>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>
      {open && <div className="px-6 pb-6 border-t border-gray-100">{children}</div>}
    </div>
  )
}

export default function ProjectForm({ project }: Props) {
  const router = useRouter()
  const isEdit = !!project
  const [saving, setSaving] = useState(false)
  const [nameChanged, setNameChanged] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: project
      ? {
          name: project.name,
          slug: project.slug,
          internalCode:  project.internalCode  ?? '',
          developerName: project.developerName ?? '',
          isActive: project.isActive,
          isFeatured: project.isFeatured,
          isArchived: project.isArchived,
          sortOrder: project.sortOrder,
          status: project.status,
          deliveryType: project.deliveryType,
          priceFrom: project.priceFrom ?? undefined,
          currency: project.currency ?? 'UF',
          shortDescription: project.shortDescription ?? '',
          longDescription: project.longDescription ?? '',
          ctaText: project.ctaText ?? '',
          address: project.address ?? '',
          commune: project.commune ?? '',
          city: project.city ?? '',
          region: project.region ?? '',
          metaTitle: project.metaTitle ?? '',
          metaDescription: project.metaDescription ?? '',
          videoUrl: project.videoUrl ?? '',
          videoType: project.videoType ?? undefined,
          linkDrive:     project.linkDrive     ?? '',
          linkStock:     project.linkStock     ?? '',
          brochureUrl:   project.brochureUrl   ?? null,
          brochurePubId: project.brochurePubId ?? null,
          typologies: project.typologies ?? [],
          amenities: project.amenities ?? [],
          financingOptions: project.financingOptions ?? [],
        }
      : {
          isActive: false,
          isFeatured: false,
          isArchived: false,
          sortOrder: 0,
          status: 'DRAFT',
          currency: 'UF',
          typologies: [],
          amenities: [],
          financingOptions: [],
        },
  })

  const { fields: typologyFields, append: appendTypology, remove: removeTypology } = useFieldArray({ control, name: 'typologies' })
  const { fields: amenityFields, append: appendAmenity, remove: removeAmenity } = useFieldArray({ control, name: 'amenities' })
  const { fields: financingFields, append: appendFinancing, remove: removeFinancing } = useFieldArray({ control, name: 'financingOptions' })

  // Auto-generate slug from name (only for new projects)
  const watchName = watch('name')
  useEffect(() => {
    if (!isEdit && watchName && !nameChanged) {
      setValue('slug', slugify(watchName))
    }
  }, [watchName, isEdit, nameChanged, setValue])

  const onSubmit = async (data: ProjectFormData) => {
    setSaving(true)
    try {
      const url = isEdit ? `/api/admin/projects/${project.id}` : '/api/admin/projects'
      const method = isEdit ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await res.json()

      if (!res.ok) {
        toast(result.error || 'Error al guardar proyecto', 'error')
        return
      }

      toast(isEdit ? 'Proyecto actualizado correctamente' : 'Proyecto creado correctamente', 'success')

      if (!isEdit) {
        router.push(`/admin/proyectos/${result.id}`)
      }
    } catch (err) {
      toast('Error inesperado. Intenta nuevamente.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const isActive = watch('isActive')
  const isFeatured = watch('isFeatured')
  const isArchived = watch('isArchived')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* ─── IDENTIFICATION ─────────────────────────────── */}
      <SectionCard title="Identificación">
        <div className="pt-4 grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Input
              label="Nombre del proyecto *"
              {...register('name')}
              error={errors.name?.message}
              placeholder="Ej: Parque Independencia"
            />
          </div>
          <div className="sm:col-span-2">
            <Input
              label="Nombre de inmobiliaria"
              {...register('developerName')}
              placeholder="Ej: Inmobiliaria Los Andes"
            />
          </div>
          <div>
            <Input
              label="Slug (URL amigable) *"
              {...register('slug')}
              error={errors.slug?.message}
              placeholder="parque-independencia"
              hint="Solo letras minúsculas, números y guiones"
              onChange={(e) => {
                setNameChanged(true)
                register('slug').onChange(e)
              }}
            />
          </div>
          <div>
            <Input
              label="Código interno (opcional)"
              {...register('internalCode')}
              placeholder="UFP-001"
            />
          </div>
        </div>
      </SectionCard>

      {/* ─── STATUS ─────────────────────────────────────── */}
      <SectionCard title="Estado y visibilidad">
        <div className="pt-4 space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="p-4 border border-gray-200 rounded-lg">
              <Toggle
                checked={isActive}
                onChange={(v) => setValue('isActive', v)}
                label="Activo"
                description="Visible en el sitio público"
              />
            </div>
            <div className="p-4 border border-gray-200 rounded-lg">
              <Toggle
                checked={isFeatured}
                onChange={(v) => setValue('isFeatured', v)}
                label="Destacado"
                description="Aparece en la home"
              />
            </div>
            <div className="p-4 border border-gray-200 rounded-lg">
              <Toggle
                checked={isArchived}
                onChange={(v) => setValue('isArchived', v)}
                label="Archivado"
                description="Oculto y desactivado"
              />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Select
              label="Estado"
              options={STATUS_OPTIONS}
              {...register('status')}
              error={errors.status?.message}
            />
            <Input
              label="Orden de visualización"
              type="number"
              {...register('sortOrder')}
              hint="Menor número = aparece primero"
            />
          </div>
        </div>
      </SectionCard>

      {/* ─── COMMERCIAL INFO ────────────────────────────── */}
      <SectionCard title="Información comercial">
        <div className="pt-4 grid sm:grid-cols-2 gap-4">
          <Select
            label="Tipo de entrega *"
            options={DELIVERY_OPTIONS}
            placeholder="Selecciona tipo de entrega"
            {...register('deliveryType')}
            error={errors.deliveryType?.message}
          />
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                label="Precio desde"
                type="number"
                step="0.01"
                {...register('priceFrom')}
                error={errors.priceFrom?.message}
                placeholder="2850"
              />
            </div>
            <div className="w-24">
              <Select
                label="Moneda"
                options={[{ value: 'UF', label: 'UF' }, { value: 'CLP', label: 'CLP' }, { value: 'USD', label: 'USD' }]}
                {...register('currency')}
              />
            </div>
          </div>
          <div className="sm:col-span-2">
            <Textarea
              label="Descripción corta"
              rows={2}
              {...register('shortDescription')}
              placeholder="Breve descripción que aparece en las tarjetas de proyecto"
            />
          </div>
          <div className="sm:col-span-2">
            <Textarea
              label="Descripción larga"
              rows={6}
              {...register('longDescription')}
              placeholder="Descripción completa del proyecto. Soporta saltos de línea."
            />
          </div>
          <div className="sm:col-span-2">
            <Input
              label="Texto del CTA (opcional)"
              {...register('ctaText')}
              placeholder="Ej: Solicita información del proyecto"
            />
          </div>
        </div>
      </SectionCard>

      {/* ─── LOCATION ───────────────────────────────────── */}
      <SectionCard title="Ubicación">
        <div className="pt-4 grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Input label="Dirección" {...register('address')} placeholder="Av. Independencia 1850" />
          </div>
          <Input label="Comuna" {...register('commune')} placeholder="Independencia" />
          <Input label="Ciudad" {...register('city')} placeholder="Santiago" />
          <div className="sm:col-span-2">
            <Input label="Región" {...register('region')} placeholder="Región Metropolitana" />
          </div>
        </div>
      </SectionCard>

      {/* ─── TYPOLOGIES ─────────────────────────────────── */}
      <SectionCard title="Tipologías">
        <div className="pt-4 space-y-3">
          {typologyFields.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4 border border-dashed border-gray-200 rounded">
              Sin tipologías. Agrega al menos una.
            </p>
          )}
          {typologyFields.map((field, idx) => (
            <div key={field.id} className="grid grid-cols-12 gap-2 items-start p-3 bg-gray-50 border border-gray-200 rounded">
              <div className="col-span-12 sm:col-span-3">
                <input
                  {...register(`typologies.${idx}.name`)}
                  placeholder="Ej: Studio, 1D/1B"
                  className="w-full px-3 py-2 text-sm border border-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
                {errors.typologies?.[idx]?.name && (
                  <p className="text-xs text-red-600 mt-1">{errors.typologies[idx]?.name?.message}</p>
                )}
              </div>
              <div className="col-span-6 sm:col-span-2">
                <input
                  {...register(`typologies.${idx}.usefulArea`)}
                  type="number" step="0.1"
                  placeholder="Sup. útil m²"
                  className="w-full px-3 py-2 text-sm border border-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
              </div>
              <div className="col-span-6 sm:col-span-2">
                <input
                  {...register(`typologies.${idx}.totalArea`)}
                  type="number" step="0.1"
                  placeholder="Sup. total m²"
                  className="w-full px-3 py-2 text-sm border border-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
              </div>
              <div className="col-span-6 sm:col-span-2">
                <input
                  {...register(`typologies.${idx}.priceFrom`)}
                  type="number" step="0.01"
                  placeholder="Precio UF"
                  className="w-full px-3 py-2 text-sm border border-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
              </div>
              <div className="col-span-5 sm:col-span-2">
                <input
                  {...register(`typologies.${idx}.observations`)}
                  placeholder="Observaciones"
                  className="w-full px-3 py-2 text-sm border border-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
              </div>
              <div className="col-span-1">
                <button
                  type="button"
                  onClick={() => removeTypology(idx)}
                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          <div className="flex gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendTypology({ name: '', sortOrder: typologyFields.length })}
            >
              <Plus className="h-3.5 w-3.5" />
              Agregar tipología
            </Button>
            {['Studio', '1D / 1B', '2D / 1B', '2D / 2B', '3D / 2B'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => appendTypology({ name: t, sortOrder: typologyFields.length })}
                className="px-3 py-1.5 text-xs border border-gray-300 text-gray-600 hover:border-brand-primary hover:text-brand-primary rounded-full transition-colors"
              >
                + {t}
              </button>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* ─── AMENITIES ──────────────────────────────────── */}
      <SectionCard title="Amenities" defaultOpen={false}>
        <div className="pt-4 space-y-3">
          {amenityFields.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {amenityFields.map((field, idx) => (
                <div key={field.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-surface border border-gray-200 rounded-full">
                  <input
                    {...register(`amenities.${idx}.name`)}
                    className="bg-transparent text-sm text-brand-secondary focus:outline-none w-32"
                  />
                  <button
                    type="button"
                    onClick={() => removeAmenity(idx)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendAmenity({ name: '' })}
            >
              <Plus className="h-3.5 w-3.5" />
              Amenity personalizado
            </Button>
            {COMMON_AMENITIES
              .filter((a) => !amenityFields.some((f: any) => f.name === a))
              .map((amenity) => (
                <button
                  key={amenity}
                  type="button"
                  onClick={() => appendAmenity({ name: amenity })}
                  className="px-3 py-1.5 text-xs border border-gray-300 text-gray-600 hover:border-brand-primary hover:text-brand-primary rounded-full transition-colors"
                >
                  + {amenity}
                </button>
              ))}
          </div>
        </div>
      </SectionCard>

      {/* ─── FINANCING ──────────────────────────────────── */}
      <SectionCard title="Opciones de financiamiento" defaultOpen={false}>
        <div className="pt-4 space-y-3">
          {financingFields.map((field, idx) => (
            <div key={field.id} className="flex items-start gap-2">
              <div className="flex-1 grid sm:grid-cols-2 gap-2">
                <input
                  {...register(`financingOptions.${idx}.name`)}
                  placeholder="Nombre de la opción"
                  className="px-3 py-2 text-sm border border-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
                <input
                  {...register(`financingOptions.${idx}.description`)}
                  placeholder="Descripción breve (opcional)"
                  className="px-3 py-2 text-sm border border-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
              </div>
              <button
                type="button"
                onClick={() => removeFinancing(idx)}
                className="p-2 text-red-400 hover:text-red-600 transition-colors mt-0.5"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <div className="flex gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendFinancing({ name: '' })}
            >
              <Plus className="h-3.5 w-3.5" />
              Agregar opción
            </Button>
            {COMMON_FINANCING
              .filter((f) => !financingFields.some((ff: any) => ff.name === f))
              .map((fin) => (
                <button
                  key={fin}
                  type="button"
                  onClick={() => appendFinancing({ name: fin })}
                  className="px-3 py-1.5 text-xs border border-gray-300 text-gray-600 hover:border-brand-primary hover:text-brand-primary rounded-full transition-colors"
                >
                  + {fin}
                </button>
              ))}
          </div>
        </div>
      </SectionCard>

      {/* ─── MULTIMEDIA ─────────────────────────────────── */}
      <SectionCard title="Video" defaultOpen={false}>
        <div className="pt-4 grid sm:grid-cols-2 gap-4">
          <Input
            label="URL del video"
            {...register('videoUrl')}
            error={errors.videoUrl?.message}
            placeholder="https://youtube.com/watch?v=..."
          />
          <Select
            label="Tipo de video"
            options={VIDEO_TYPE_OPTIONS}
            placeholder="Selecciona tipo"
            {...register('videoType')}
          />
        </div>
      </SectionCard>

      {/* ─── SEO ────────────────────────────────────────── */}
      <SectionCard title="SEO" defaultOpen={false}>
        <div className="pt-4 space-y-4">
          <Input
            label="Meta título"
            {...register('metaTitle')}
            placeholder="Título para motores de búsqueda (max 60 chars)"
            hint={`${watch('metaTitle')?.length || 0}/60 caracteres`}
          />
          <Textarea
            label="Meta descripción"
            rows={2}
            {...register('metaDescription')}
            placeholder="Descripción para motores de búsqueda (max 155 chars)"
            hint={`${watch('metaDescription')?.length || 0}/155 caracteres`}
          />
        </div>
      </SectionCard>

      {/* ─── LINKS Y DOCUMENTOS ─────────────────────────── */}
      <SectionCard title="Links y documentos" defaultOpen={false}>
        <div className="space-y-4">
          <p className="text-xs text-gray-500">
            Estos campos son exclusivos para proyectos internos y se muestran en el buscador de Stock UFPLUS.
          </p>

          <Input
            label="Link Drive"
            {...register('linkDrive')}
            placeholder="https://drive.google.com/..."
            hint="Carpeta de Google Drive del proyecto"
            error={errors.linkDrive?.message}
            type="url"
          />

          <Input
            label="Link Stock"
            {...register('linkStock')}
            placeholder="https://docs.google.com/spreadsheets/..."
            hint="Google Sheets con el inventario de unidades"
            error={errors.linkStock?.message}
            type="url"
          />

          {/* PDF Brochure */}
          <PdfUploadField
            label="Brochure (PDF)"
            currentUrl={watch('brochureUrl') ?? undefined}
            currentPubId={watch('brochurePubId') ?? undefined}
            onUpload={(url, pubId) => {
              setValue('brochureUrl', url)
              setValue('brochurePubId', pubId)
            }}
            onClear={() => {
              setValue('brochureUrl', null)
              setValue('brochurePubId', null)
            }}
          />
        </div>
      </SectionCard>

      {/* ─── SUBMIT ─────────────────────────────────────── */}
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-6 py-4 sticky bottom-0 shadow-lg">
        <p className="text-sm text-gray-500">
          {isEdit ? 'Los cambios se aplican inmediatamente al guardar.' : 'El proyecto se creará como borrador.'}
        </p>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push('/admin/proyectos')}
          >
            Cancelar
          </Button>
          <Button type="submit" loading={saving} size="lg">
            <Save className="h-4 w-4" />
            {isEdit ? 'Guardar cambios' : 'Crear proyecto'}
          </Button>
        </div>
      </div>
    </form>
  )
}
