'use client'
// src/components/admin/BroukSearch.tsx

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  Search, RefreshCw, MapPin, Home, AlertCircle,
  ChevronDown, X, Train, Building2, FolderOpen, FileSpreadsheet,
  KeyRound, ClipboardPaste, CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BroukProject } from '@/app/api/admin/brouk/search/route'

// ─── MultiSelect genérico ─────────────────────────────

function MultiSelect({ options, selected, onChange, placeholder }: {
  options: string[]
  selected: string[]
  onChange: (v: string[]) => void
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v])

  const label =
    selected.length === 0 ? placeholder
    : selected.length === 1 ? selected[0]
    : `${selected.length} seleccionadas`

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full input-field flex items-center justify-between text-sm text-left',
          selected.length > 0 ? 'text-gray-900' : 'text-gray-400'
        )}
      >
        <span className="truncate">{label}</span>
        <ChevronDown className={cn('h-4 w-4 text-gray-400 flex-shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-50 border-b border-gray-100"
            >
              Limpiar selección
            </button>
          )}
          {options.map((opt) => (
            <label key={opt} className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
                className="h-4 w-4 rounded border-gray-300 text-brand-primary flex-shrink-0"
              />
              <span className="text-sm text-gray-700">{opt}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Tipos de caché de links ──────────────────────────

type LinkState = {
  loading: boolean
  fetched: boolean
  drive: string | null
  stock: string | null
}

// ─── ProjectCard ─────────────────────────────────────

function BroukCard({ project, links, onOpenDrive, onOpenStock }: {
  project: BroukProject
  links: LinkState
  onOpenDrive: () => void
  onOpenStock: () => void
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      {/* Imagen */}
      <div className="relative h-44 bg-gray-100 flex-shrink-0">
        {project.imagen ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={project.imagen} alt={project.nombre} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Home className="h-10 w-10 text-gray-300" />
          </div>
        )}
        <div className="absolute top-2 left-2 flex gap-1.5 flex-wrap">
          {project.bonoPie === 'Si' && (
            <span className="bg-brand-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
              Bono Pie {project.porcentajeBonoPie}
            </span>
          )}
          {project.tipoEntrega && (
            <span className="bg-white/90 text-gray-700 text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-sm">
              {project.tipoEntrega}
            </span>
          )}
        </div>
      </div>

      {/* Contenido */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-1">{project.nombre}</h3>

        {project.comunas.length > 0 && (
          <div className="flex items-start gap-1 text-xs text-gray-500 mb-1.5">
            <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>{project.comunas.join(', ')}</span>
          </div>
        )}

        {project.estacionesMetro.length > 0 && (
          <div className="flex items-start gap-1 text-xs text-gray-500 mb-2">
            <Train className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span className="truncate">{project.estacionesMetro.join(', ')}</span>
          </div>
        )}

        {project.tipologias.length > 0 && (
          <div className="flex gap-1 flex-wrap mb-3">
            {project.tipologias.map((t) => (
              <span key={t} className="text-[10px] font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {t}
              </span>
            ))}
          </div>
        )}

        {project.inmobiliarias.length > 0 && (
          <p className="text-[11px] text-gray-400 mb-3">
            {project.inmobiliarias.join(' · ')}
          </p>
        )}

        {/* Botones Drive / Stock */}
        <div className="flex gap-2 mt-auto pt-3 border-t border-gray-100">
          <button
            onClick={onOpenDrive}
            disabled={links.loading || (links.fetched && !links.drive)}
            title={links.fetched && !links.drive ? 'Sin carpeta Drive disponible' : 'Abrir carpeta Drive'}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-colors',
              links.fetched && !links.drive
                ? 'border-gray-100 text-gray-300 cursor-not-allowed'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 cursor-pointer'
            )}
          >
            {links.loading
              ? <RefreshCw className="h-3 w-3 animate-spin" />
              : <FolderOpen className="h-3 w-3" />
            }
            Drive
          </button>
          <button
            onClick={onOpenStock}
            disabled={links.loading || (links.fetched && !links.stock)}
            title={links.fetched && !links.stock ? 'Sin archivo Stock disponible' : 'Ver stock'}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-colors',
              links.fetched && !links.stock
                ? 'border-gray-100 text-gray-300 cursor-not-allowed'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 cursor-pointer'
            )}
          >
            {links.loading
              ? <RefreshCw className="h-3 w-3 animate-spin" />
              : <FileSpreadsheet className="h-3 w-3" />
            }
            Ver Stock
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────

const EMPTY_LINK_STATE: LinkState = { loading: false, fetched: false, drive: null, stock: null }

export default function BroukSearch() {
  const [projects, setProjects] = useState<BroukProject[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')
  const [total, setTotal] = useState(0)
  const [tokenExpired, setTokenExpired] = useState(false)
  const [newToken, setNewToken] = useState('')
  const [savingToken, setSavingToken] = useState(false)
  const [tokenSaved, setTokenSaved] = useState(false)

  // Caché de links por project.id
  const [linkCache, setLinkCache] = useState<Record<string, LinkState>>({})

  // Opciones de filtro (dinámicas desde el servidor)
  const [comunasOpts, setComunasOpts] = useState<string[]>([])
  const [tipologiasOpts, setTipologiasOpts] = useState<string[]>([])

  // Filtros
  const [filterComunas, setFilterComunas] = useState<string[]>([])
  const [filterTipologias, setFilterTipologias] = useState<string[]>([])
  const [filterBonoPie, setFilterBonoPie] = useState('')
  const [filterEntrega, setFilterEntrega] = useState('')

  const search = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/brouk/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filter: {
            comunas: filterComunas.length > 0 ? filterComunas : undefined,
            tipologias: filterTipologias.length > 0 ? filterTipologias : undefined,
            bonoPie: filterBonoPie || undefined,
            tipoEntrega: filterEntrega || undefined,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 401 && data.tokenExpired) setTokenExpired(true)
        setError(data.error ?? 'Error al consultar')
        return
      }
      setTokenExpired(false)
      setProjects(data.projects ?? [])
      setTotal(data.total ?? 0)
      if (data.filterOptions) {
        setComunasOpts(data.filterOptions.comunas ?? [])
        setTipologiasOpts(data.filterOptions.tipologias ?? [])
      }
      setSearched(true)
    } catch {
      setError('Error de red')
    } finally {
      setLoading(false)
    }
  }, [filterComunas, filterTipologias, filterBonoPie, filterEntrega])

  const openUrl = useCallback(async (id: string, type: 'drive' | 'stock') => {
    const cached = linkCache[id]

    // Ya tenemos los datos: abrir directamente (síncrono → no bloqueado)
    if (cached?.fetched) {
      const url = type === 'drive' ? cached.drive : cached.stock
      if (url) window.open(url, '_blank', 'noopener,noreferrer')
      return
    }

    // Ya está cargando
    if (cached?.loading) return

    // Abrir ventana ANTES del await para que el navegador no la bloquee
    const newWindow = window.open('', '_blank')

    setLinkCache((prev) => ({ ...prev, [id]: { loading: true, fetched: false, drive: null, stock: null } }))
    try {
      const res = await fetch('/api/admin/brouk/detail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId: id }),
      })
      const data = await res.json()
      const drive: string | null = data.detail?.carpetaDrive ?? null
      const stock: string | null = data.detail?.archivoStock ?? null
      setLinkCache((prev) => ({ ...prev, [id]: { loading: false, fetched: true, drive, stock } }))
      const url = type === 'drive' ? drive : stock
      if (url && newWindow) {
        newWindow.location.href = url
      } else {
        newWindow?.close()
      }
    } catch {
      newWindow?.close()
      setLinkCache((prev) => ({ ...prev, [id]: { loading: false, fetched: true, drive: null, stock: null } }))
    }
  }, [linkCache])

  const handleSaveToken = async () => {
    if (!newToken.trim()) return
    setSavingToken(true)
    try {
      const res = await fetch('/api/admin/brouk/refresh-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: newToken.trim() }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Error al guardar token'); return }
      setTokenSaved(true)
      setTokenExpired(false)
      setNewToken('')
      setError('')
      await search()
    } catch {
      setError('Error de red al guardar token')
    } finally {
      setSavingToken(false)
    }
  }

  // Auto-consulta al entrar a la sección
  useEffect(() => {
    search()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const clearFilters = () => {
    setFilterComunas([])
    setFilterTipologias([])
    setFilterBonoPie('')
    setFilterEntrega('')
  }

  const hasFilters = filterComunas.length > 0 || filterTipologias.length > 0 || filterBonoPie || filterEntrega

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Stock off-line</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Proyectos de Stock off-line{total > 0 && ` · ${total} encontrados`}
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Comunas
              {filterComunas.length > 0 && (
                <button type="button" onClick={() => setFilterComunas([])} className="ml-2 text-red-400 hover:text-red-600">
                  <X className="h-3 w-3 inline" />
                </button>
              )}
            </label>
            <MultiSelect
              options={comunasOpts}
              selected={filterComunas}
              onChange={setFilterComunas}
              placeholder={comunasOpts.length === 0 ? 'Consulta primero' : 'Todas las comunas'}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Tipología
              {filterTipologias.length > 0 && (
                <button type="button" onClick={() => setFilterTipologias([])} className="ml-2 text-red-400 hover:text-red-600">
                  <X className="h-3 w-3 inline" />
                </button>
              )}
            </label>
            <MultiSelect
              options={tipologiasOpts}
              selected={filterTipologias}
              onChange={setFilterTipologias}
              placeholder={tipologiasOpts.length === 0 ? 'Consulta primero' : 'Todas las tipologías'}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Bono Pie</label>
            <select
              value={filterBonoPie}
              onChange={(e) => setFilterBonoPie(e.target.value)}
              className="input-field text-sm"
            >
              <option value="">Todos</option>
              <option value="Si">Con bono pie</option>
              <option value="No">Sin bono pie</option>
              <option value="No Aplica">No aplica</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Tipo de entrega</label>
            <select
              value={filterEntrega}
              onChange={(e) => setFilterEntrega(e.target.value)}
              className="input-field text-sm"
            >
              <option value="">Todos</option>
              <option value="Inmediata">Inmediata</option>
              <option value="Futura">Futura</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-gray-100">
          {hasFilters ? (
            <button type="button" onClick={clearFilters} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
              <X className="h-3 w-3" /> Limpiar filtros
            </button>
          ) : (
            <span className="text-xs text-gray-400">Los filtros de comunas y tipologías se cargan con la primera consulta</span>
          )}
          <button
            onClick={search}
            disabled={loading}
            className={cn('btn-primary flex items-center gap-2 text-sm', loading && 'opacity-50 cursor-not-allowed')}
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {loading ? 'Buscando proyectos…' : 'Consultar'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && !tokenExpired && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Panel renovación de token */}
      {tokenExpired && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-4">
          <div className="flex items-start gap-3">
            <KeyRound className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Token de Stock off-line expirado</p>
              <p className="text-xs text-amber-700 mt-1">
                El acceso a Stock off-line expiró. Para renovarlo:
              </p>
              <ol className="text-xs text-amber-700 mt-2 space-y-1 list-decimal list-inside">
                <li>Entra a <strong>www.ufplus.cl/stock-offline</strong> con tu cuenta Google</li>
                <li>Abre DevTools → Application → Cookies → <code className="bg-amber-100 px-1 rounded">www.ufplus.cl</code></li>
                <li>Copia el valor de la cookie <strong>jwtToken</strong></li>
                <li>Pégalo aquí y guarda</li>
              </ol>
            </div>
          </div>
          <div className="flex gap-2">
            <textarea
              value={newToken}
              onChange={(e) => setNewToken(e.target.value)}
              placeholder="Pega aquí el valor de la cookie jwtToken…"
              rows={3}
              className="flex-1 input-field text-xs font-mono resize-none"
            />
            <button
              onClick={handleSaveToken}
              disabled={savingToken || !newToken.trim()}
              className="flex flex-col items-center justify-center gap-1.5 px-4 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {savingToken
                ? <><RefreshCw className="h-4 w-4 animate-spin" /> Guardando…</>
                : <><ClipboardPaste className="h-4 w-4" /> Guardar y<br/>reintentar</>
              }
            </button>
          </div>
        </div>
      )}

      {/* Token guardado exitosamente */}
      {tokenSaved && !tokenExpired && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          Token actualizado correctamente
        </div>
      )}

      {/* Resultados */}
      {searched && !error && (
        <>
          <p className="text-sm text-gray-500">
            {projects.length === 0
              ? 'Sin proyectos con los filtros aplicados'
              : `${total} proyecto${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}`}
          </p>
          {projects.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((p) => (
                <BroukCard
                  key={p.id}
                  project={p}
                  links={linkCache[p.id] ?? EMPTY_LINK_STATE}
                  onOpenDrive={() => openUrl(p.id, 'drive')}
                  onOpenStock={() => openUrl(p.id, 'stock')}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Estado inicial */}
      {!searched && !loading && (
        <div className="py-24 text-center">
          <Building2 className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Presiona Consultar para ver los proyectos</p>
        </div>
      )}
    </div>
  )
}
