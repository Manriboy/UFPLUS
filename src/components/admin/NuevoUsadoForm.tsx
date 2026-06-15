'use client'
// src/components/admin/NuevoUsadoForm.tsx
import { useState, useRef, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { CheckCircle2, ChevronRight, Loader2, MapPin, Home, Sparkles, Camera, ImagePlus, X, GripVertical, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

const SinglePinMap = dynamic(() => import('./SinglePinMap'), { ssr: false })

// ─── Tipos ────────────────────────────────────────────

type FormData = {
  // Paso 1
  address: string; lat: number | null; lng: number | null; region: string | null; commune: string | null
  // Paso 2
  sqmTotal: string; sqmUsable: string; sqmTerrace: string
  bedrooms: string; bathrooms: string; parkingSpots: string; storageRooms: string
  totalFloors: string; aptNumber: string; unitsPerFloor: string; floorNumber: string
  towerNumber: string; propertyType: string; orientations: string[]; antiquity: string
  // Paso 3
  amenities: string[]; security: string[]; securityType: string
  services: string[]; spaces: string[]; special: string[]; commonSpaces: string[]
  // Paso 4
  title: string; description: string; videoUrl: string
  // Paso 5
  price: string; currency: string; commonExpenses: string
  // Paso 6
  images: string[]
}

const empty: FormData = {
  address: '', lat: null, lng: null, region: null, commune: null,
  sqmTotal: '', sqmUsable: '', sqmTerrace: '',
  bedrooms: '', bathrooms: '', parkingSpots: '', storageRooms: '',
  totalFloors: '', aptNumber: '', unitsPerFloor: '', floorNumber: '',
  towerNumber: '', propertyType: '', orientations: [], antiquity: '',
  amenities: [], security: [], securityType: '',
  services: [], spaces: [], special: [], commonSpaces: [],
  title: '', description: '', videoUrl: '',
  price: '', currency: 'UF', commonExpenses: '',
  images: [],
}

// ─── Opciones ─────────────────────────────────────────

const PROPERTY_TYPES = ['Departamento', 'Duplex', 'Triplex', 'Loft', 'Penthouse', 'Monoambiente']
const ORIENTATIONS   = ['N', 'NO', 'O', 'SO', 'S', 'SP', 'P', 'NP']
const SECURITY_TYPES = ['24 horas', 'Diurno', 'Nocturno', 'Virtual']

const AMENITIES_OPT  = ['Rampa para silla de ruedas','Chimenea','Ascensor','Estacionamiento de visitas','Gimnasio','Con área verde','Cancha de básquetbol','Cancha de paddle','Canchas de usos múltiples','Sauna','Refrigerador','Con cancha de fútbol','Recepción','Área de cine','Área de juegos infantiles','Cowork','Cancha de tenis']
const SECURITY_OPT   = ['En condominio cerrado','Con conexión para lavandería','Conserjería']
const SERVICES_OPT   = ['Acceso a internet','Agua corriente','Gas natural','Línea telefónica','Aire acondicionado','Caldera','Calefacción','Cisterna','Generador eléctrico','Con energía solar']
const SPACES_OPT     = ['Balcón','Cocina','Comedor','Comedor de diario','Dormitorio en suite','Homeoffice','Jacuzzi','Con logia','Living','Patio','Closets','Walk-in clóset','Playroom','Dormitorio y baño de servicio','Jardín','Terraza','Baño de visitas','Parrilla']
const SPECIAL_OPT    = ['Admite mascotas','Amoblado','Uso comercial']
const COMMON_OPT     = ['Lavandería','Salón de fiestas','Salón multiuso','Azotea','Quinchos','Sala ecommerce','Piscina']

// ─── Helpers ──────────────────────────────────────────

function toggle(arr: string[], val: string) {
  return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]
}

function NumInput({ label, value, onChange, required }: {
  label: string; value: string
  onChange: (v: string) => void; required?: boolean
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        type="number" min={0} step={1} value={value}
        onChange={e => onChange(e.target.value)}
        className="input-field text-sm w-full"
      />
    </div>
  )
}

function MultiSelect({ options, selected, onChange, max }: {
  options: string[]; selected: string[]
  onChange: (v: string[]) => void; max?: number
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const on = selected.includes(opt)
        const disabled = !on && max !== undefined && selected.length >= max
        return (
          <button
            key={opt} type="button"
            disabled={disabled}
            onClick={() => onChange(toggle(selected, opt))}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              on ? 'bg-brand-primary text-white border-brand-primary'
                 : disabled ? 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-brand-primary hover:text-brand-primary'
            )}
          >{opt}</button>
        )
      })}
    </div>
  )
}

// ─── StepCard ─────────────────────────────────────────

function StepCard({ number, title, done, children }: {
  number: number; title: string; done?: boolean; children: React.ReactNode
}) {
  return (
    <div className={cn(
      'bg-white rounded-xl border overflow-hidden transition-colors',
      done ? 'border-emerald-200' : 'border-gray-200'
    )}>
      <div className={cn('flex items-center gap-3 px-5 py-4 border-b', done ? 'border-emerald-100 bg-emerald-50/40' : 'border-gray-100 bg-gray-50/40')}>
        <span className={cn(
          'flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold flex-shrink-0',
          done ? 'bg-emerald-500 text-white' : 'bg-brand-primary text-white'
        )}>
          {done ? <CheckCircle2 className="h-4 w-4" /> : number}
        </span>
        <span className="text-sm font-semibold text-gray-800">{title}</span>
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  )
}

// ─── Paso 1: Dirección ────────────────────────────────

type Suggestion = { id: string; title: string; address: { label: string; state?: string; county?: string; city?: string } }
type SelectedAddr = { lat: number; lng: number; label: string; region: string | null; commune: string | null }

function AddressStep({ data, onDone }: { data: FormData; onDone: (patch: Partial<FormData>) => void }) {
  const [q, setQ]                   = useState(data.address)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [selected, setSelected]     = useState<SelectedAddr | null>(
    data.lat && data.lng ? { lat: data.lat, lng: data.lng, label: data.address, region: data.region, commune: data.commune } : null
  )
  const [loading, setLoading]       = useState(false)
  const [fetching, setFetching]     = useState(false)
  const debounceRef                 = useRef<ReturnType<typeof setTimeout> | null>(null)
  const apiKey                      = process.env.NEXT_PUBLIC_HERE_API_KEY

  const search = useCallback(async (query: string) => {
    if (!query.trim() || !apiKey) return
    setLoading(true)
    try {
      const url = `https://autocomplete.search.hereapi.com/v1/autocomplete?q=${encodeURIComponent(query)}&apiKey=${apiKey}&lang=es&limit=3&in=countryCode:CHL&types=address`
      const res = await fetch(url)
      const json = await res.json()
      setSuggestions(json.items ?? [])
    } catch { setSuggestions([]) } finally { setLoading(false) }
  }, [apiKey])

  const handleInput = (v: string) => {
    setQ(v)
    setSelected(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (v.length >= 3) debounceRef.current = setTimeout(() => search(v), 400)
    else setSuggestions([])
  }

  const pick = async (s: Suggestion) => {
    setSuggestions([])
    setQ(s.title)
    setFetching(true)
    try {
      const url = `https://lookup.search.hereapi.com/v1/lookup?id=${s.id}&apiKey=${apiKey}`
      const res  = await fetch(url)
      const json = await res.json()
      const lat  = json.position?.lat
      const lng  = json.position?.lng
      if (lat && lng) {
        setSelected({
          lat, lng, label: s.title,
          region:  s.address.state  ?? json.address?.state  ?? null,
          commune: s.address.city   ?? json.address?.city   ?? s.address.county ?? null,
        })
      }
    } catch {} finally { setFetching(false) }
  }

  const confirm = () => {
    if (!selected) return
    onDone({ address: q, lat: selected.lat, lng: selected.lng, region: selected.region, commune: selected.commune })
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text" value={q} onChange={e => handleInput(e.target.value)}
            placeholder="Escribe la dirección del departamento…"
            className="input-field pl-9 text-sm w-full"
          />
          {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />}
        </div>

        {suggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
            {suggestions.map(s => (
              <button
                key={s.id} type="button"
                onClick={() => pick(s)}
                className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 border-b last:border-0 border-gray-100"
              >
                <p className="font-medium text-gray-800 truncate">{s.title}</p>
                <p className="text-xs text-gray-400 truncate mt-0.5">{s.address.label}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {fetching && (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando ubicación…
        </div>
      )}

      {selected && !fetching && (
        <SinglePinMap lat={selected.lat} lng={selected.lng} label={selected.label} />
      )}

      <div className="flex justify-end pt-1">
        <button
          type="button" onClick={confirm}
          disabled={!selected}
          className={cn('flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg transition-colors', selected ? 'bg-brand-primary text-white hover:opacity-90' : 'bg-gray-100 text-gray-400 cursor-not-allowed')}
        >
          Confirmar dirección <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function AddressSummary({ data, onEdit }: { data: FormData; onEdit: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-gray-700">
        <MapPin className="h-4 w-4 text-emerald-500 flex-shrink-0" />
        <span>{data.address}</span>
      </div>
      <button type="button" onClick={onEdit} className="text-xs text-brand-primary hover:underline">Editar</button>
    </div>
  )
}

// ─── Paso 2: Características ──────────────────────────

function FeaturesStep({ data, onChange, onDone }: {
  data: FormData; onChange: (k: keyof FormData, v: string | string[]) => void; onDone: () => void
}) {
  const set = (k: keyof FormData) => (v: string) => onChange(k, v)

  const required = ['sqmTotal', 'sqmUsable', 'bedrooms', 'bathrooms', 'parkingSpots', 'storageRooms'] as (keyof FormData)[]
  const canContinue = required.every(k => String(data[k]).trim() !== '')

  const toggleOrientation = (o: string) => {
    const cur = data.orientations
    if (cur.includes(o)) onChange('orientations', cur.filter(x => x !== o))
    else if (cur.length < 2) onChange('orientations', [...cur, o])
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <NumInput label="Superficie total m²"   value={data.sqmTotal}    onChange={set('sqmTotal')}    required />
        <NumInput label="Superficie útil m²"    value={data.sqmUsable}   onChange={set('sqmUsable')}   required />
        <NumInput label="Superficie terraza m²" value={data.sqmTerrace}  onChange={set('sqmTerrace')}  />
        <NumInput label="Dormitorios"           value={data.bedrooms}    onChange={set('bedrooms')}    required />
        <NumInput label="Baños"                 value={data.bathrooms}   onChange={set('bathrooms')}   required />
        <NumInput label="Estacionamientos"      value={data.parkingSpots} onChange={set('parkingSpots')} required />
        <NumInput label="Bodegas"               value={data.storageRooms} onChange={set('storageRooms')} required />
        <NumInput label="Cantidad de pisos"     value={data.totalFloors} onChange={set('totalFloors')} />
        <NumInput label="N° departamento"       value={data.aptNumber}   onChange={set('aptNumber')}   />
        <NumInput label="Deptos por piso"       value={data.unitsPerFloor} onChange={set('unitsPerFloor')} />
        <NumInput label="Piso de la unidad"     value={data.floorNumber} onChange={set('floorNumber')} />
        <NumInput label="Antigüedad (años)"     value={data.antiquity}   onChange={set('antiquity')}   />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">N° de torre</label>
          <input type="text" value={data.towerNumber} onChange={e => onChange('towerNumber', e.target.value)} className="input-field text-sm w-full" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
          <select value={data.propertyType} onChange={e => onChange('propertyType', e.target.value)} className="input-field text-sm w-full">
            <option value="">Seleccionar…</option>
            {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">
          Orientación <span className="text-gray-400 font-normal">(máx. 2)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {ORIENTATIONS.map(o => (
            <button key={o} type="button"
              onClick={() => toggleOrientation(o)}
              disabled={!data.orientations.includes(o) && data.orientations.length >= 2}
              className={cn(
                'w-12 h-12 rounded-lg border text-xs font-bold transition-colors',
                data.orientations.includes(o) ? 'bg-brand-primary text-white border-brand-primary'
                  : data.orientations.length >= 2 ? 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed'
                                                  : 'bg-white text-gray-600 border-gray-200 hover:border-brand-primary'
              )}
            >{o}</button>
          ))}
        </div>
      </div>

      <div className="flex justify-end pt-1">
        <button type="button" onClick={onDone} disabled={!canContinue}
          className={cn('flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg transition-colors', canContinue ? 'bg-brand-primary text-white hover:opacity-90' : 'bg-gray-100 text-gray-400 cursor-not-allowed')}
        >
          Continuar <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function FeaturesSummary({ data, onEdit }: { data: FormData; onEdit: () => void }) {
  const parts = [
    data.bedrooms && `${data.bedrooms}D`, data.bathrooms && `${data.bathrooms}B`,
    data.sqmTotal && `${data.sqmTotal}m²`,
    data.propertyType,
  ].filter(Boolean)
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-gray-700">
        <Home className="h-4 w-4 text-emerald-500 flex-shrink-0" />
        <span>{parts.join(' · ')}</span>
      </div>
      <button type="button" onClick={onEdit} className="text-xs text-brand-primary hover:underline">Editar</button>
    </div>
  )
}

// ─── Paso 3: Otras características ───────────────────

function AmenitiesStep({ data, onChange, onDone }: {
  data: FormData; onChange: (k: keyof FormData, v: string | string[]) => void
  onDone: () => void
}) {
  const arr = (k: keyof FormData) => (v: string[]) => onChange(k, v)

  return (
    <div className="space-y-6">
      <Section title="Comodidades">
        <MultiSelect options={AMENITIES_OPT} selected={data.amenities} onChange={arr('amenities')} />
      </Section>
      <Section title="Seguridad">
        <MultiSelect options={SECURITY_OPT} selected={data.security} onChange={arr('security')} />
        {data.security.length > 0 && (
          <div className="mt-3">
            <label className="block text-xs font-medium text-gray-600 mb-2">Tipo de seguridad</label>
            <div className="flex flex-wrap gap-2">
              {SECURITY_TYPES.map(t => (
                <button key={t} type="button"
                  onClick={() => onChange('securityType', data.securityType === t ? '' : t)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                    data.securityType === t ? 'bg-brand-primary text-white border-brand-primary'
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-brand-primary'
                  )}
                >{t}</button>
              ))}
            </div>
          </div>
        )}
      </Section>
      <Section title="Servicios">
        <MultiSelect options={SERVICES_OPT} selected={data.services} onChange={arr('services')} />
      </Section>
      <Section title="Espacios interiores">
        <MultiSelect options={SPACES_OPT} selected={data.spaces} onChange={arr('spaces')} />
      </Section>
      <Section title="Especiales">
        <MultiSelect options={SPECIAL_OPT} selected={data.special} onChange={arr('special')} />
      </Section>
      <Section title="Espacios comunes">
        <MultiSelect options={COMMON_OPT} selected={data.commonSpaces} onChange={arr('commonSpaces')} />
      </Section>

      <div className="flex justify-end pt-1">
        <button type="button" onClick={onDone}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-brand-primary text-white hover:opacity-90"
        >
          Continuar <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

// ─── Paso 4: Título, descripción y video ─────────────

function ContentStep({ data, onChange, onDone }: {
  data: FormData; onChange: (k: keyof FormData, v: string) => void; onDone: () => void
}) {
  const canContinue = data.title.trim().length > 0

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-gray-600">
            Título <span className="text-red-400">*</span>
          </label>
          <span className={`text-xs tabular-nums ${data.title.length > 60 ? 'text-red-500' : 'text-gray-400'}`}>
            {data.title.length}/60
          </span>
        </div>
        <input
          type="text" maxLength={60} value={data.title}
          onChange={e => onChange('title', e.target.value)}
          placeholder="Ej: Departamento remodelado muy bien ubicado"
          className="input-field text-sm w-full"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-gray-600">Descripción <span className="text-gray-400 font-normal">(opcional)</span></label>
          <span className="text-xs text-gray-400 tabular-nums">{data.description.length}/50000</span>
        </div>
        <textarea
          maxLength={50000} value={data.description}
          onChange={e => onChange('description', e.target.value)}
          rows={5}
          placeholder="Describe el departamento, sus características destacadas, el entorno, acceso a transporte, etc."
          className="input-field text-sm w-full resize-y min-h-[100px]"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Video <span className="text-gray-400 font-normal">(opcional)</span>
        </label>
        <input
          type="url" value={data.videoUrl}
          onChange={e => onChange('videoUrl', e.target.value)}
          placeholder="Ej: www.youtube.com/watch?"
          className="input-field text-sm w-full"
        />
      </div>

      <div className="flex justify-end pt-1">
        <button type="button" onClick={onDone} disabled={!canContinue}
          className={cn('flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg transition-colors',
            canContinue ? 'bg-brand-primary text-white hover:opacity-90' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          )}
        >
          Continuar <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function ContentSummary({ data, onEdit }: { data: FormData; onEdit: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-gray-700 truncate max-w-sm">{data.title}</p>
      <button type="button" onClick={onEdit} className="text-xs text-brand-primary hover:underline flex-shrink-0 ml-3">Editar</button>
    </div>
  )
}

// ─── Paso 5: Precio y gastos comunes ─────────────────

const CURRENCIES = ['UF', 'CLP$', 'USD$']

function PriceStep({ data, onChange, onDone, saving }: {
  data: FormData; onChange: (k: keyof FormData, v: string) => void
  onDone: () => void; saving: boolean
}) {
  const canPublish = data.price.trim() !== ''

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">
          Precio <span className="text-red-400">*</span>
        </label>
        <div className="flex items-center gap-2">
          {/* Selector de moneda */}
          <div className="flex items-center bg-gray-100 p-0.5 rounded-lg flex-shrink-0">
            {CURRENCIES.map(c => (
              <button
                key={c} type="button"
                onClick={() => onChange('currency', c)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-semibold transition-colors',
                  data.currency === c ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                )}
              >{c}</button>
            ))}
          </div>
          <input
            type="number" min={0} step={1} value={data.price}
            onChange={e => onChange('price', e.target.value)}
            placeholder={data.currency === 'UF' ? 'Ej: 3500' : data.currency === 'USD$' ? 'Ej: 120000' : 'Ej: 120000000'}
            className="input-field text-sm flex-1"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Gastos comunes CLP$ <span className="text-gray-400 font-normal">(opcional)</span>
        </label>
        <input
          type="number" min={0} step={1} value={data.commonExpenses}
          onChange={e => onChange('commonExpenses', e.target.value)}
          placeholder="Ej: 85000"
          className="input-field text-sm w-full"
        />
      </div>

      <div className="flex justify-end pt-1">
        <button type="button" onClick={onDone} disabled={!canPublish}
          className={cn('flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg transition-colors',
            canPublish ? 'bg-brand-primary text-white hover:opacity-90' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          )}
        >
          Continuar <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

// ─── Utilidades de imagen ─────────────────────────────

// Comprime y redimensiona a JPEG. Reduce calidad si el resultado supera 600 KB.
async function resizeToJpeg(file: File, maxPx = 1600): Promise<Blob> {
  return new Promise(resolve => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const r = Math.min(maxPx / img.width, maxPx / img.height, 1)
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * r); c.height = Math.round(img.height * r)
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      // Intenta 0.82; si supera 600 KB baja a 0.70; último recurso 0.55
      const encode = (q: number) =>
        c.toBlob(b => {
          if (b && b.size > 600_000 && q > 0.55) encode(q - 0.12)
          else resolve(b!)
        }, 'image/jpeg', q)
      encode(0.82)
    }
    img.src = url
  })
}

async function uploadToCloudinary(blob: Blob): Promise<string> {
  const fd = new FormData()
  fd.append('file', blob, 'photo.jpg')
  const res = await fetch('/api/admin/usados/upload', { method: 'POST', body: fd })
  const json = await res.json()
  if (!json.url) throw new Error(json.error || 'Upload fallido')
  return json.url as string
}

// ─── Paso 6: Fotos ────────────────────────────────────

function PhotosStep({ images, onImagesChange, onDone, saving }: {
  images: string[]
  onImagesChange: (urls: string[]) => void
  onDone: () => void
  saving: boolean
}) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState('')
  const galleryRef = useRef<HTMLInputElement>(null)
  const cameraRef  = useRef<HTMLInputElement>(null)
  const dragSrc = useRef<number | null>(null)

  const handleFiles = async (files: FileList) => {
    if (!files.length) return
    setUploading(true)
    const urls: string[] = [...images]
    for (let i = 0; i < files.length; i++) {
      setProgress(`Subiendo ${i + 1} de ${files.length}…`)
      try {
        const blob = await resizeToJpeg(files[i])
        const url  = await uploadToCloudinary(blob)
        urls.push(url)
        onImagesChange([...urls])
      } catch { /* skip failed */ }
    }
    setUploading(false)
    setProgress('')
  }

  const remove = (idx: number) => {
    onImagesChange(images.filter((_, i) => i !== idx))
  }

  const setPrincipal = (idx: number) => {
    if (idx === 0) return
    const arr = [...images]
    const [item] = arr.splice(idx, 1)
    arr.unshift(item)
    onImagesChange(arr)
  }

  const handleDrop = (targetIdx: number) => {
    const src = dragSrc.current
    if (src === null || src === targetIdx) return
    const arr = [...images]
    const [item] = arr.splice(src, 1)
    arr.splice(targetIdx, 0, item)
    onImagesChange(arr)
    dragSrc.current = null
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        Las fotos se comprimen automáticamente (máx. 1600px, JPEG) antes de subirse.
      </p>

      {/* Botones galería + cámara */}
      {uploading ? (
        <div className="flex flex-col items-center gap-2 py-8">
          <Loader2 className="h-8 w-8 text-brand-primary animate-spin" />
          <p className="text-sm text-gray-500">{progress}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            className="flex flex-col items-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-6 hover:border-brand-primary hover:bg-brand-primary/5 transition-colors"
          >
            <ImagePlus className="h-7 w-7 text-gray-400" />
            <span className="text-sm font-medium text-gray-600">Galería</span>
            <span className="text-xs text-gray-400">Selecciona fotos</span>
          </button>
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="flex flex-col items-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-6 hover:border-brand-primary hover:bg-brand-primary/5 transition-colors"
          >
            <Camera className="h-7 w-7 text-gray-400" />
            <span className="text-sm font-medium text-gray-600">Cámara</span>
            <span className="text-xs text-gray-400">Tomar foto</span>
          </button>
        </div>
      )}

      {/* Input galería — múltiples archivos */}
      <input
        ref={galleryRef} type="file" accept="image/*" multiple className="hidden"
        onChange={e => e.target.files && handleFiles(e.target.files)}
      />
      {/* Input cámara — capture activa la cámara trasera y pide permiso */}
      <input
        ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={e => e.target.files && handleFiles(e.target.files)}
      />

      {/* Previews */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {images.map((url, i) => (
            <div
              key={url}
              className="relative group aspect-square cursor-grab active:cursor-grabbing"
              draggable={true}
              onDragStart={() => { dragSrc.current = i }}
              onDragOver={e => e.preventDefault()}
              onDrop={() => handleDrop(i)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-full h-full object-cover rounded-lg pointer-events-none" />
              {/* Drag handle */}
              <div className="absolute top-1 left-1 bg-black/40 text-white rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
                <GripVertical className="h-3 w-3" />
              </div>
              {/* Delete */}
              <button
                type="button" onClick={() => remove(i)}
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

      <div className="flex justify-end pt-1">
        <button type="button" onClick={onDone} disabled={saving}
          className={cn('flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg transition-colors',
            !saving ? 'bg-brand-primary text-white hover:opacity-90' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          )}
        >
          {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando…</> : <><Sparkles className="h-4 w-4" /> Publicar</>}
        </button>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5">{title}</p>
      {children}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────

export default function NuevoUsadoForm() {
  const [step, setStep]         = useState(1)
  const [data, setData]         = useState<FormData>(empty)
  const [propId, setPropId]     = useState<string | null>(null)
  const [saving, setSaving]     = useState(false)
  const [done, setDone]         = useState(false)

  const patch = (k: keyof FormData, v: string | string[]) =>
    setData(prev => ({ ...prev, [k]: v }))

  const save = useCallback(async (payload: Partial<Record<string, unknown>>) => {
    if (propId) {
      await fetch(`/api/admin/usados/${propId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } else {
      const res  = await fetch('/api/admin/usados', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (json.id) setPropId(json.id)
    }
  }, [propId])

  const finishStep1 = async (patch2: Partial<FormData>) => {
    const next = { ...data, ...patch2 }
    setData(next)
    await save({ address: next.address, lat: next.lat, lng: next.lng, region: next.region, commune: next.commune, currentStep: 2 })
    setStep(2)
  }

  const finishStep2 = async () => {
    await save({
      sqmTotal: data.sqmTotal ? parseFloat(data.sqmTotal) : null,
      sqmUsable: data.sqmUsable ? parseFloat(data.sqmUsable) : null,
      sqmTerrace: data.sqmTerrace ? parseFloat(data.sqmTerrace) : null,
      bedrooms: data.bedrooms ? parseInt(data.bedrooms) : null,
      bathrooms: data.bathrooms ? parseInt(data.bathrooms) : null,
      parkingSpots: data.parkingSpots ? parseInt(data.parkingSpots) : null,
      storageRooms: data.storageRooms ? parseInt(data.storageRooms) : null,
      totalFloors: data.totalFloors ? parseInt(data.totalFloors) : null,
      aptNumber: data.aptNumber || null, unitsPerFloor: data.unitsPerFloor ? parseInt(data.unitsPerFloor) : null,
      floorNumber: data.floorNumber ? parseInt(data.floorNumber) : null,
      towerNumber: data.towerNumber || null, propertyType: data.propertyType || null,
      orientations: data.orientations, antiquity: data.antiquity ? parseInt(data.antiquity) : null,
      currentStep: 3,
    })
    setStep(3)
  }

  const finishStep3 = async () => {
    await save({
      amenities: data.amenities, security: data.security, securityType: data.securityType || null,
      services: data.services, spaces: data.spaces, special: data.special, commonSpaces: data.commonSpaces,
      currentStep: 4,
    })
    setStep(4)
  }

  const finishStep4 = async () => {
    await save({
      title: data.title, description: data.description || null, videoUrl: data.videoUrl || null,
      currentStep: 5,
    })
    setStep(5)
  }

  const finishStep5 = async () => {
    await save({
      price: data.price ? parseFloat(data.price) : null,
      currency: data.currency,
      commonExpenses: data.commonExpenses ? parseInt(data.commonExpenses) : null,
      currentStep: 6,
    })
    setStep(6)
  }

  const finishStep6 = async () => {
    setSaving(true)
    await save({ images: data.images, status: 'PENDING', currentStep: 6 })
    setSaving(false)
    setDone(true)
  }

  if (done) return (
    <div className="flex flex-col items-center justify-center py-20 bg-white border border-emerald-200 rounded-xl text-center">
      <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-4" />
      <h3 className="text-lg font-semibold text-gray-800 mb-1">¡Publicación enviada!</h3>
      <p className="text-sm text-gray-500 max-w-xs">Tu departamento fue enviado para revisión. Te avisaremos cuando esté publicado.</p>
    </div>
  )

  return (
    <div className="space-y-4">
      <StepCard number={1} title="Dirección" done={step > 1}>
        {step === 1
          ? <AddressStep data={data} onDone={finishStep1} />
          : <AddressSummary data={data} onEdit={() => setStep(1)} />
        }
      </StepCard>

      {step >= 2 && (
        <StepCard number={2} title="Características del departamento" done={step > 2}>
          {step === 2
            ? <FeaturesStep data={data} onChange={patch} onDone={finishStep2} />
            : <FeaturesSummary data={data} onEdit={() => setStep(2)} />
          }
        </StepCard>
      )}

      {step >= 3 && (
        <StepCard number={3} title="Otras características" done={step > 3}>
          {step === 3
            ? <AmenitiesStep data={data} onChange={patch} onDone={finishStep3} />
            : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">{data.amenities.length + data.services.length + data.spaces.length} características seleccionadas</p>
                <button type="button" onClick={() => setStep(3)} className="text-xs text-brand-primary hover:underline">Editar</button>
              </div>
            )
          }
        </StepCard>
      )}

      {step >= 4 && (
        <StepCard number={4} title="Título y descripción" done={step > 4}>
          {step === 4
            ? <ContentStep data={data} onChange={(k, v) => patch(k, v as string)} onDone={finishStep4} />
            : <ContentSummary data={data} onEdit={() => setStep(4)} />
          }
        </StepCard>
      )}

      {step >= 5 && (
        <StepCard number={5} title="Precio y gastos comunes" done={step > 5}>
          {step === 5
            ? <PriceStep data={data} onChange={(k, v) => patch(k, v as string)} onDone={finishStep5} saving={false} />
            : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-700 font-medium">
                  {data.price} {data.currency}
                  {data.commonExpenses ? ` · GC $${parseInt(data.commonExpenses).toLocaleString('es-CL')}` : ''}
                </p>
                <button type="button" onClick={() => setStep(5)} className="text-xs text-brand-primary hover:underline">Editar</button>
              </div>
            )
          }
        </StepCard>
      )}

      {step >= 6 && (
        <StepCard number={6} title="Fotos">
          <PhotosStep
            images={data.images}
            onImagesChange={urls => patch('images', urls)}
            onDone={finishStep6}
            saving={saving}
          />
        </StepCard>
      )}
    </div>
  )
}
