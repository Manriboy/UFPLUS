'use client'
// src/app/admin/stock/page.tsx
// Stock Sync admin panel: manage StockSources per project and trigger/view syncs.

import { useEffect, useState, useCallback } from 'react'
import {
  RefreshCw,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  Database,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────

interface Project {
  id: string
  name: string
  slug: string
}

interface SyncLog {
  id: string
  status: 'RUNNING' | 'SUCCESS' | 'ERROR'
  rowsFound: number
  rowsInserted: number
  rowsUpdated: number
  rowsSkipped: number
  errorMessage?: string | null
  startedAt: string
  finishedAt?: string | null
}

interface StockSource {
  id: string
  projectId: string
  driveFileId: string
  sheetName?: string | null
  fileType: 'GOOGLE_SHEETS' | 'XLSX'
  columnMapper: Record<string, string>
  isActive: boolean
  lastSyncAt?: string | null
  project: Project
  syncLogs: SyncLog[]
  _count: { units: number }
}

// ─── Constants ────────────────────────────────────────

const NORMALIZED_FIELDS = [
  'numero', 'piso', 'orientacion', 'tipologia',
  'supInterior', 'supTerraza', 'supTotal',
  'precioUf', 'descuento', 'bonoPie',
  'precioEstac', 'precioBodega', 'disponible',
] as const

const FIELD_LABELS: Record<string, string> = {
  numero: 'N° Depto',
  piso: 'Piso',
  orientacion: 'Orientación',
  tipologia: 'Tipología',
  supInterior: 'Sup. Interior',
  supTerraza: 'Sup. Terraza',
  supTotal: 'Sup. Total',
  precioUf: 'Precio UF',
  descuento: 'Descuento',
  bonoPie: 'Bono Pie',
  precioEstac: 'Precio Estac.',
  precioBodega: 'Precio Bodega',
  disponible: 'Disponible',
}

const EMPTY_FORM = {
  projectId: '',
  driveFileId: '',
  sheetName: '',
  fileType: 'GOOGLE_SHEETS' as 'GOOGLE_SHEETS' | 'XLSX',
  isActive: true,
  columnMapper: {} as Record<string, string>,
}

// ─── Helpers ──────────────────────────────────────────

function fmtDate(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-CL', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function StatusBadge({ status }: { status: SyncLog['status'] }) {
  if (status === 'SUCCESS') return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
      <CheckCircle className="h-3 w-3" /> Éxito
    </span>
  )
  if (status === 'ERROR') return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
      <XCircle className="h-3 w-3" /> Error
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-full">
      <Clock className="h-3 w-3" /> Corriendo
    </span>
  )
}

// ─── Column Mapper Editor ─────────────────────────────

function MapperEditor({
  mapper,
  onChange,
}: {
  mapper: Record<string, string>
  onChange: (m: Record<string, string>) => void
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-gray-500 mb-2">
        Para cada campo normalizado, ingresa el nombre exacto de la columna en tu archivo fuente.
      </p>
      {NORMALIZED_FIELDS.map((field) => (
        <div key={field} className="flex items-center gap-2">
          <span className="w-36 shrink-0 text-xs text-gray-600 font-medium">{FIELD_LABELS[field]}</span>
          <input
            type="text"
            placeholder="Nombre columna en Excel / Sheets"
            value={mapper[field] ?? ''}
            onChange={(e) => onChange({ ...mapper, [field]: e.target.value })}
            className="input-field text-xs py-1.5 flex-1"
          />
        </div>
      ))}
    </div>
  )
}

// ─── Source Form Modal ────────────────────────────────

function SourceModal({
  projects,
  initial,
  onSave,
  onClose,
}: {
  projects: Project[]
  initial?: StockSource | null
  onSave: (data: typeof EMPTY_FORM) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState<typeof EMPTY_FORM>(
    initial
      ? {
          projectId: initial.projectId,
          driveFileId: initial.driveFileId,
          sheetName: initial.sheetName ?? '',
          fileType: initial.fileType,
          isActive: initial.isActive,
          columnMapper: initial.columnMapper,
        }
      : EMPTY_FORM
  )
  const [saving, setSaving] = useState(false)
  const [showMapper, setShowMapper] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave(form)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {initial ? 'Editar fuente de stock' : 'Nueva fuente de stock'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Project */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Proyecto</label>
            <select
              required
              value={form.projectId}
              onChange={(e) => setForm({ ...form, projectId: e.target.value })}
              className="input-field"
              disabled={!!initial}
            >
              <option value="">Seleccionar proyecto…</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Drive File ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ID del archivo en Google Drive
            </label>
            <input
              required
              type="text"
              placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
              value={form.driveFileId}
              onChange={(e) => setForm({ ...form, driveFileId: e.target.value })}
              className="input-field font-mono text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">
              Extraído de la URL: drive.google.com/…/d/<strong>ID</strong>/…
            </p>
          </div>

          {/* File Type + Sheet Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de archivo</label>
              <select
                value={form.fileType}
                onChange={(e) => setForm({ ...form, fileType: e.target.value as 'GOOGLE_SHEETS' | 'XLSX' })}
                className="input-field"
              >
                <option value="GOOGLE_SHEETS">Google Sheets</option>
                <option value="XLSX">Excel (.xlsx)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre de hoja <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <input
                type="text"
                placeholder="Hoja1"
                value={form.sheetName}
                onChange={(e) => setForm({ ...form, sheetName: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-2">
            <input
              id="isActive"
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-brand-primary"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">Activo (incluir en syncs automáticos)</label>
          </div>

          {/* Column Mapper */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowMapper(!showMapper)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Database className="h-4 w-4 text-gray-400" />
                Mapeo de columnas
              </span>
              {showMapper ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
            {showMapper && (
              <div className="px-4 py-4">
                <MapperEditor
                  mapper={form.columnMapper}
                  onChange={(m) => setForm({ ...form, columnMapper: m })}
                />
              </div>
            )}
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button type="button" onClick={onClose} className="btn-secondary text-sm">Cancelar</button>
          <button
            onClick={handleSubmit as unknown as React.MouseEventHandler}
            disabled={saving}
            className="btn-primary text-sm"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────

export default function StockPage() {
  const [sources, setSources] = useState<StockSource[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<StockSource | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())

  function notify(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  const loadSources = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/stock')
    const data = await res.json()
    setSources(data.sources ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadSources()
    fetch('/api/admin/projects')
      .then((r) => r.json())
      .then((d) => {
        // /api/admin/projects returns a plain array
        const arr = Array.isArray(d) ? d : (d.projects ?? [])
        setProjects(arr.map((p: Project) => ({ id: p.id, name: p.name, slug: p.slug })))
      })
  }, [loadSources])

  async function handleSave(form: typeof EMPTY_FORM) {
    const isEdit = !!editing
    const url = isEdit ? `/api/admin/stock?id=${editing!.id}` : '/api/admin/stock'
    const method = isEdit ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    if (!res.ok) {
      const d = await res.json()
      notify(d.error ?? 'Error al guardar', false)
      return
    }

    notify(isEdit ? 'Fuente actualizada' : 'Fuente creada')
    setShowModal(false)
    setEditing(null)
    loadSources()
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`¿Eliminar la fuente de "${name}"? Se borrarán todas sus unidades y logs.`)) return
    const res = await fetch(`/api/admin/stock?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      notify('Fuente eliminada')
      loadSources()
    } else {
      notify('Error al eliminar', false)
    }
  }

  async function handleSync(sourceId: string, projectName: string) {
    setSyncing(sourceId)
    notify(`Iniciando sync de "${projectName}"…`)
    try {
      const res = await fetch('/api/stock/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockSourceId: sourceId }),
      })
      const data = await res.json()
      if (data.ok) {
        const r = data.result
        notify(`Sync completado: ${r.rowsInserted} nuevas, ${r.rowsUpdated} actualizadas, ${r.rowsSkipped} omitidas`)
      } else {
        notify(`Error: ${data.error}`, false)
      }
    } catch {
      notify('Error de red al hacer sync', false)
    } finally {
      setSyncing(null)
      loadSources()
    }
  }

  function toggleLog(id: string) {
    setExpandedLogs((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Sync de Stock</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Conecta proyectos a archivos Google Sheets o Excel para sincronizar disponibilidad de unidades.
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowModal(true) }}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Plus className="h-4 w-4" /> Nueva fuente
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className={cn(
          'fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white transition-all',
          toast.ok ? 'bg-green-600' : 'bg-red-600'
        )}>
          {toast.msg}
        </div>
      )}

      {/* Sources list */}
      {loading ? (
        <div className="text-sm text-gray-400 py-12 text-center">Cargando…</div>
      ) : sources.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <Database className="h-8 w-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No hay fuentes configuradas.</p>
          <button
            onClick={() => { setEditing(null); setShowModal(true) }}
            className="mt-4 text-sm text-brand-primary hover:underline"
          >
            Crear primera fuente
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {sources.map((source) => {
            const lastLog = source.syncLogs[0]
            const isExpanded = expandedLogs.has(source.id)
            const isSyncing = syncing === source.id

            return (
              <div key={source.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Source header row */}
                <div className="flex items-center gap-4 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm">{source.project.name}</span>
                      <span className={cn(
                        'text-[10px] font-bold uppercase px-1.5 py-0.5 rounded',
                        source.fileType === 'GOOGLE_SHEETS'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                      )}>
                        {source.fileType === 'GOOGLE_SHEETS' ? 'Sheets' : 'Excel'}
                      </span>
                      {!source.isActive && (
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                          Inactivo
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                      <span>
                        ID: <code className="font-mono">{source.driveFileId.slice(0, 20)}…</code>
                      </span>
                      {source.sheetName && <span>Hoja: {source.sheetName}</span>}
                      <span>{source._count.units} unidades</span>
                      <span>Último sync: {fmtDate(source.lastSyncAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {lastLog && (
                      <button
                        onClick={() => toggleLog(source.id)}
                        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700"
                      >
                        <StatusBadge status={lastLog.status} />
                        {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      </button>
                    )}
                    <button
                      onClick={() => handleSync(source.id, source.project.name)}
                      disabled={isSyncing}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                        isSyncing
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-brand-primary text-white hover:bg-brand-primary/90'
                      )}
                    >
                      <RefreshCw className={cn('h-3.5 w-3.5', isSyncing && 'animate-spin')} />
                      {isSyncing ? 'Sincronizando…' : 'Sync'}
                    </button>
                    <button
                      onClick={() => { setEditing(source); setShowModal(true) }}
                      className="p-1.5 text-gray-400 hover:text-brand-primary rounded-lg hover:bg-gray-50"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(source.id, source.project.name)}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded log detail */}
                {isExpanded && lastLog && (
                  <div className="border-t border-gray-100 bg-gray-50 px-5 py-3">
                    <div className="grid grid-cols-4 gap-4 text-xs">
                      <div>
                        <span className="text-gray-400">Encontradas</span>
                        <div className="font-semibold text-gray-700 mt-0.5">{lastLog.rowsFound}</div>
                      </div>
                      <div>
                        <span className="text-gray-400">Insertadas</span>
                        <div className="font-semibold text-green-700 mt-0.5">{lastLog.rowsInserted}</div>
                      </div>
                      <div>
                        <span className="text-gray-400">Actualizadas</span>
                        <div className="font-semibold text-blue-700 mt-0.5">{lastLog.rowsUpdated}</div>
                      </div>
                      <div>
                        <span className="text-gray-400">Omitidas</span>
                        <div className="font-semibold text-gray-500 mt-0.5">{lastLog.rowsSkipped}</div>
                      </div>
                    </div>
                    {lastLog.errorMessage && (
                      <p className="mt-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded">
                        {lastLog.errorMessage}
                      </p>
                    )}
                    <p className="mt-2 text-[11px] text-gray-400">
                      {fmtDate(lastLog.startedAt)}
                      {lastLog.finishedAt && ` → ${fmtDate(lastLog.finishedAt)}`}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <SourceModal
          projects={projects}
          initial={editing}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditing(null) }}
        />
      )}
    </div>
  )
}
