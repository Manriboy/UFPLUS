'use client'
// src/app/admin/stock/page.tsx

import { useEffect, useState, useCallback } from 'react'
import {
  RefreshCw, Plus, Trash2, Edit2, CheckCircle, XCircle,
  Clock, ChevronDown, ChevronRight, Database, Table2, Plug, ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────

interface Project { id: string; name: string; slug: string }

interface SyncLog {
  id: string; status: 'RUNNING' | 'SUCCESS' | 'ERROR'
  rowsFound: number; rowsInserted: number; rowsUpdated: number; rowsSkipped: number
  errorMessage?: string | null; startedAt: string; finishedAt?: string | null
}

interface StockSource {
  id: string; projectId: string; driveFileId: string
  sheetName?: string | null; fileType: 'GOOGLE_SHEETS' | 'XLSX'
  columnMapper: Record<string, string>; isActive: boolean; lastSyncAt?: string | null
  headerRow: number
  precioEstacFijo?: number | null; precioBodegaFijo?: number | null
  descuentoIndividual: boolean; descuentoValor?: number | null
  bonoPieIndividual: boolean; bonoPieValor?: number | null
  project: Project; syncLogs: SyncLog[]; _count: { units: number }
}

interface Unit {
  id: string; numero: string; piso?: number | null; orientacion?: string | null
  tipologia?: string | null; supInterior?: number | null; supTerraza?: number | null
  supTotal?: number | null; precioUf?: number | null; descuento?: number | null
  bonoPie?: number | null; disponible: boolean
}

// ─── Wizard form state ────────────────────────────────

interface Step1Form {
  projectId: string; driveFileId: string
  fileType: 'GOOGLE_SHEETS' | 'XLSX'; sheetName: string; headerRow: number
}

interface Step2Form {
  columnMapper: Record<string, string>
  isActive: boolean
  precioEstacFijo: string; precioBodegaFijo: string
  descuentoIndividual: boolean; descuentoValor: string
  bonoPieIndividual: boolean; bonoPieValor: string
}

// ─── Mapped fields (excludes estac/bodega/descuento/bonoPie — handled separately) ─

const COLUMN_FIELDS: { key: string; label: string; required?: boolean }[] = [
  { key: 'numero', label: 'N° Depto / Unidad', required: true },
  { key: 'piso', label: 'Piso' },
  { key: 'tipologia', label: 'Tipología' },
  { key: 'orientacion', label: 'Orientación' },
  { key: 'supInterior', label: 'Sup. Interior (m²)' },
  { key: 'supTerraza', label: 'Sup. Terraza (m²)' },
  { key: 'supTotal', label: 'Sup. Total (m²)' },
  { key: 'precioUf', label: 'Precio (UF)' },
  { key: 'disponible', label: 'Disponibilidad' },
]

// ─── Helpers ──────────────────────────────────────────

function fmtDate(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function fmtNum(v?: number | null, decimals = 0) {
  if (v == null) return '—'
  return v.toLocaleString('es-CL', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function StatusBadge({ status }: { status: SyncLog['status'] }) {
  if (status === 'SUCCESS') return <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full"><CheckCircle className="h-3 w-3" /> Éxito</span>
  if (status === 'ERROR') return <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full"><XCircle className="h-3 w-3" /> Error</span>
  return <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-full"><Clock className="h-3 w-3" /> Corriendo</span>
}

// ─── Column Selector ──────────────────────────────────

function ColSelect({ columns, value, onChange, placeholder }: {
  columns: string[]; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="input-field text-sm py-1.5 flex-1"
    >
      <option value="">— {placeholder ?? 'No mapear'} —</option>
      {columns.map((c) => <option key={c} value={c}>{c}</option>)}
    </select>
  )
}

// ─── Wizard Modal ─────────────────────────────────────

function SourceWizard({ projects, initial, onSave, onClose }: {
  projects: Project[]; initial?: StockSource | null
  onSave: (s1: Step1Form, s2: Step2Form) => Promise<void>; onClose: () => void
}) {
  const [step, setStep] = useState<1 | 2>(1)
  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState('')
  const [columns, setColumns] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const [s1, setS1] = useState<Step1Form>({
    projectId: initial?.projectId ?? '',
    driveFileId: initial?.driveFileId ?? '',
    fileType: initial?.fileType ?? 'GOOGLE_SHEETS',
    sheetName: initial?.sheetName ?? '',
    headerRow: initial?.headerRow ?? 1,
  })

  const [s2, setS2] = useState<Step2Form>({
    columnMapper: initial?.columnMapper ?? {},
    isActive: initial?.isActive ?? true,
    precioEstacFijo: initial?.precioEstacFijo != null ? String(initial.precioEstacFijo) : '',
    precioBodegaFijo: initial?.precioBodegaFijo != null ? String(initial.precioBodegaFijo) : '',
    descuentoIndividual: initial?.descuentoIndividual ?? false,
    descuentoValor: initial?.descuentoValor != null ? String(initial.descuentoValor) : '',
    bonoPieIndividual: initial?.bonoPieIndividual ?? false,
    bonoPieValor: initial?.bonoPieValor != null ? String(initial.bonoPieValor) : '',
  })

  async function handleConnect() {
    if (!s1.driveFileId) { setConnectError('Ingresa el ID del archivo'); return }
    setConnecting(true); setConnectError('')
    try {
      const res = await fetch('/api/admin/stock/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driveFileId: s1.driveFileId, fileType: s1.fileType, sheetName: s1.sheetName || null, headerRow: s1.headerRow }),
      })
      const data = await res.json()
      if (!res.ok) { setConnectError(data.error ?? 'Error al conectar'); return }
      setColumns(data.columns ?? [])
      setStep(2)
    } catch { setConnectError('Error de red') }
    finally { setConnecting(false) }
  }

  async function handleSave() {
    setSaving(true)
    try { await onSave(s1, s2) } finally { setSaving(false) }
  }

  const mapper = s2.columnMapper
  const setMapper = (key: string, val: string) =>
    setS2((prev) => ({ ...prev, columnMapper: { ...prev.columnMapper, [key]: val } }))

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-gray-900">
              {initial ? 'Editar fuente de stock' : 'Nueva fuente de stock'}
            </h2>
            <div className="flex items-center gap-1.5 text-xs">
              <span className={cn('px-2 py-0.5 rounded-full font-medium', step === 1 ? 'bg-brand-primary text-white' : 'bg-gray-100 text-gray-500')}>1 Conexión</span>
              <ArrowRight className="h-3 w-3 text-gray-400" />
              <span className={cn('px-2 py-0.5 rounded-full font-medium', step === 2 ? 'bg-brand-primary text-white' : 'bg-gray-100 text-gray-500')}>2 Mapeo</span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Proyecto</label>
                <select required value={s1.projectId} onChange={(e) => setS1({ ...s1, projectId: e.target.value })} className="input-field" disabled={!!initial}>
                  <option value="">Seleccionar proyecto…</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID del archivo en Google Drive</label>
                <input type="text" placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
                  value={s1.driveFileId} onChange={(e) => setS1({ ...s1, driveFileId: e.target.value })}
                  className="input-field font-mono text-sm" />
                <p className="text-xs text-gray-400 mt-1">Extraído de la URL: drive.google.com/…/d/<strong>ID</strong>/…</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de archivo</label>
                  <select value={s1.fileType} onChange={(e) => setS1({ ...s1, fileType: e.target.value as 'GOOGLE_SHEETS' | 'XLSX' })} className="input-field">
                    <option value="GOOGLE_SHEETS">Google Sheets</option>
                    <option value="XLSX">Excel (.xlsx)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de hoja <span className="font-normal text-gray-400">(opcional)</span></label>
                  <input type="text" placeholder="Hoja1" value={s1.sheetName} onChange={(e) => setS1({ ...s1, sheetName: e.target.value })} className="input-field" />
                </div>
              </div>

              <div className="w-40">
                <label className="block text-sm font-medium text-gray-700 mb-1">Fila de encabezados</label>
                <input type="number" min={1} value={s1.headerRow}
                  onChange={(e) => setS1({ ...s1, headerRow: parseInt(e.target.value) || 1 })}
                  className="input-field" />
                <p className="text-xs text-gray-400 mt-1">Fila donde están los títulos de columna</p>
              </div>

              {connectError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{connectError}</p>}
            </div>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Detected columns info */}
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                <p className="text-xs font-semibold text-green-800 mb-1">Columnas detectadas ({columns.length})</p>
                <p className="text-xs text-green-700 leading-relaxed">{columns.join(' · ')}</p>
              </div>

              {/* Standard column mapping */}
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-3">Mapeo de columnas</h3>
                <div className="space-y-2">
                  {COLUMN_FIELDS.map(({ key, label, required }) => (
                    <div key={key} className="flex items-center gap-3">
                      <span className="w-44 shrink-0 text-xs text-gray-600 font-medium">
                        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
                      </span>
                      <ColSelect columns={columns} value={mapper[key] ?? ''} onChange={(v) => setMapper(key, v)} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Descuento */}
              <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-800">Descuento</span>
                  <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                    <span className={cn(!s2.descuentoIndividual && 'text-brand-primary font-semibold')}>Grupal</span>
                    <div className="relative inline-flex">
                      <input type="checkbox" className="sr-only peer" checked={s2.descuentoIndividual}
                        onChange={(e) => setS2({ ...s2, descuentoIndividual: e.target.checked })} />
                      <div className="w-9 h-5 bg-gray-200 peer-checked:bg-brand-primary rounded-full transition-colors cursor-pointer" onClick={() => setS2({ ...s2, descuentoIndividual: !s2.descuentoIndividual })} />
                      <div className={cn('absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform', s2.descuentoIndividual && 'translate-x-4')} />
                    </div>
                    <span className={cn(s2.descuentoIndividual && 'text-brand-primary font-semibold')}>Individual (por columna)</span>
                  </label>
                </div>
                {s2.descuentoIndividual ? (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-44 shrink-0">Columna de descuento</span>
                    <ColSelect columns={columns} value={mapper['descuento'] ?? ''} onChange={(v) => setMapper('descuento', v)} placeholder="No mapear" />
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-44 shrink-0">Valor único (UF)</span>
                    <input type="number" step="0.01" min="0" placeholder="ej: 50"
                      value={s2.descuentoValor} onChange={(e) => setS2({ ...s2, descuentoValor: e.target.value })}
                      className="input-field text-sm py-1.5 flex-1" />
                  </div>
                )}
              </div>

              {/* Bono Pie */}
              <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-800">Bono Pie</span>
                  <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                    <span className={cn(!s2.bonoPieIndividual && 'text-brand-primary font-semibold')}>Grupal</span>
                    <div className="relative inline-flex">
                      <input type="checkbox" className="sr-only peer" checked={s2.bonoPieIndividual}
                        onChange={(e) => setS2({ ...s2, bonoPieIndividual: e.target.checked })} />
                      <div className="w-9 h-5 bg-gray-200 peer-checked:bg-brand-primary rounded-full transition-colors cursor-pointer" onClick={() => setS2({ ...s2, bonoPieIndividual: !s2.bonoPieIndividual })} />
                      <div className={cn('absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform', s2.bonoPieIndividual && 'translate-x-4')} />
                    </div>
                    <span className={cn(s2.bonoPieIndividual && 'text-brand-primary font-semibold')}>Individual (por columna)</span>
                  </label>
                </div>
                {s2.bonoPieIndividual ? (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-44 shrink-0">Columna de bono pie</span>
                    <ColSelect columns={columns} value={mapper['bonoPie'] ?? ''} onChange={(v) => setMapper('bonoPie', v)} placeholder="No mapear" />
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-44 shrink-0">Valor único (UF)</span>
                    <input type="number" step="0.01" min="0" placeholder="ej: 100"
                      value={s2.bonoPieValor} onChange={(e) => setS2({ ...s2, bonoPieValor: e.target.value })}
                      className="input-field text-sm py-1.5 flex-1" />
                  </div>
                )}
              </div>

              {/* Estacionamiento y Bodega */}
              <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-800">Precios fijos</h3>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 w-44 shrink-0">Estacionamiento (UF)</span>
                  <input type="number" step="0.01" min="0" placeholder="ej: 500"
                    value={s2.precioEstacFijo} onChange={(e) => setS2({ ...s2, precioEstacFijo: e.target.value })}
                    className="input-field text-sm py-1.5 flex-1" />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 w-44 shrink-0">Bodega (UF)</span>
                  <input type="number" step="0.01" min="0" placeholder="ej: 150"
                    value={s2.precioBodegaFijo} onChange={(e) => setS2({ ...s2, precioBodegaFijo: e.target.value })}
                    className="input-field text-sm py-1.5 flex-1" />
                </div>
              </div>

              {/* Activo */}
              <div className="flex items-center gap-2">
                <input id="isActive" type="checkbox" checked={s2.isActive} onChange={(e) => setS2({ ...s2, isActive: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-brand-primary" />
                <label htmlFor="isActive" className="text-sm text-gray-700">Activo</label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          <div>
            {step === 2 && (
              <button onClick={() => setStep(1)} className="text-sm text-gray-500 hover:text-gray-700">
                ← Volver
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="btn-secondary text-sm">Cancelar</button>
            {step === 1 ? (
              <button
                onClick={handleConnect}
                disabled={connecting || !s1.driveFileId || !s1.projectId}
                className={cn('btn-primary text-sm flex items-center gap-2', (connecting || !s1.driveFileId || !s1.projectId) && 'opacity-50 cursor-not-allowed')}
              >
                <Plug className="h-4 w-4" />
                {connecting ? 'Conectando…' : 'Conectar'}
              </button>
            ) : (
              <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">
                {saving ? 'Guardando…' : 'Guardar fuente'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Units Table ──────────────────────────────────────

function UnitsTable({ projectId }: { projectId: string }) {
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [filterDisp, setFilterDisp] = useState<'all' | 'true' | 'false'>('all')
  const [filterTipo, setFilterTipo] = useState('')

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ projectId })
    if (filterDisp !== 'all') params.set('disponible', filterDisp)
    fetch(`/api/stock/query?${params}`)
      .then((r) => r.json())
      .then((d) => { setUnits(d.units ?? []); setLoading(false) })
  }, [projectId, filterDisp])

  const filtered = filterTipo
    ? units.filter((u) => u.tipologia?.toLowerCase().includes(filterTipo.toLowerCase()))
    : units

  const tipologias = Array.from(new Set(units.map((u) => u.tipologia).filter((t): t is string => !!t)))

  return (
    <div className="border-t border-gray-100">
      <div className="flex items-center gap-3 px-5 py-3 bg-gray-50 border-b border-gray-100">
        <select value={filterDisp} onChange={(e) => setFilterDisp(e.target.value as 'all' | 'true' | 'false')} className="text-xs border border-gray-200 rounded px-2 py-1.5 bg-white text-gray-700">
          <option value="all">Todas</option>
          <option value="true">Disponibles</option>
          <option value="false">No disponibles</option>
        </select>
        <select value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)} className="text-xs border border-gray-200 rounded px-2 py-1.5 bg-white text-gray-700">
          <option value="">Todas las tipologías</option>
          {tipologias.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} unidades</span>
      </div>
      {loading ? (
        <div className="py-8 text-center text-xs text-gray-400">Cargando…</div>
      ) : filtered.length === 0 ? (
        <div className="py-8 text-center text-xs text-gray-400">Sin unidades con estos filtros.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-left border-b border-gray-100">
                <th className="px-4 py-2.5 font-medium">N° Depto</th>
                <th className="px-4 py-2.5 font-medium">Piso</th>
                <th className="px-4 py-2.5 font-medium">Tipología</th>
                <th className="px-4 py-2.5 font-medium">Orientación</th>
                <th className="px-4 py-2.5 font-medium text-right">Sup. Total m²</th>
                <th className="px-4 py-2.5 font-medium text-right">Precio UF</th>
                <th className="px-4 py-2.5 font-medium text-right">Descuento</th>
                <th className="px-4 py-2.5 font-medium text-right">Bono Pie</th>
                <th className="px-4 py-2.5 font-medium text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((u) => (
                <tr key={u.id} className={cn('hover:bg-gray-50 transition-colors', !u.disponible && 'opacity-50')}>
                  <td className="px-4 py-2 font-mono font-medium text-gray-800">{u.numero}</td>
                  <td className="px-4 py-2 text-gray-600">{u.piso ?? '—'}</td>
                  <td className="px-4 py-2 text-gray-600">{u.tipologia ?? '—'}</td>
                  <td className="px-4 py-2 text-gray-600">{u.orientacion ?? '—'}</td>
                  <td className="px-4 py-2 text-right text-gray-600">{fmtNum(u.supTotal, 1)}</td>
                  <td className="px-4 py-2 text-right font-semibold text-brand-primary">{fmtNum(u.precioUf)} UF</td>
                  <td className="px-4 py-2 text-right text-gray-600">{u.descuento ? `${fmtNum(u.descuento)} UF` : '—'}</td>
                  <td className="px-4 py-2 text-right text-gray-600">{u.bonoPie ? `${fmtNum(u.bonoPie)} UF` : '—'}</td>
                  <td className="px-4 py-2 text-center">
                    {u.disponible
                      ? <span className="inline-block bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Disponible</span>
                      : <span className="inline-block bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full">No disponible</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set())

  function notify(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 5000)
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
        const arr = Array.isArray(d) ? d : (d.projects ?? [])
        setProjects(arr.map((p: Project) => ({ id: p.id, name: p.name, slug: p.slug })))
      })
  }, [loadSources])

  async function handleSave(s1: Step1Form, s2: Step2Form) {
    const isEdit = !!editing
    const url = isEdit ? `/api/admin/stock?id=${editing!.id}` : '/api/admin/stock'
    const payload = {
      projectId: s1.projectId,
      driveFileId: s1.driveFileId,
      fileType: s1.fileType,
      sheetName: s1.sheetName || null,
      headerRow: s1.headerRow,
      columnMapper: s2.columnMapper,
      isActive: s2.isActive,
      precioEstacFijo: s2.precioEstacFijo ? parseFloat(s2.precioEstacFijo) : null,
      precioBodegaFijo: s2.precioBodegaFijo ? parseFloat(s2.precioBodegaFijo) : null,
      descuentoIndividual: s2.descuentoIndividual,
      descuentoValor: !s2.descuentoIndividual && s2.descuentoValor ? parseFloat(s2.descuentoValor) : null,
      bonoPieIndividual: s2.bonoPieIndividual,
      bonoPieValor: !s2.bonoPieIndividual && s2.bonoPieValor ? parseFloat(s2.bonoPieValor) : null,
    }
    const res = await fetch(url, { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (!res.ok) { notify((await res.json()).error ?? 'Error al guardar', false); return }
    notify(isEdit ? 'Fuente actualizada' : 'Fuente creada')
    setShowModal(false); setEditing(null); loadSources()
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`¿Eliminar la fuente de "${name}"? Se borrarán todas sus unidades y logs.`)) return
    const res = await fetch(`/api/admin/stock?id=${id}`, { method: 'DELETE' })
    res.ok ? notify('Fuente eliminada') : notify('Error al eliminar', false)
    loadSources()
  }

  async function handleSync(sourceId: string, projectName: string) {
    setSyncing(sourceId)
    notify(`Sincronizando "${projectName}"…`)
    try {
      const res = await fetch('/api/stock/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stockSourceId: sourceId }) })
      const data = await res.json()
      if (data.ok) {
        const r = data.result
        notify(`Sync completado: ${r.rowsInserted} nuevas, ${r.rowsUpdated} actualizadas, ${r.rowsSkipped} omitidas`)
      } else {
        notify(`Error: ${data.error}`, false)
      }
    } catch { notify('Error de red', false) }
    finally { setSyncing(null); loadSources() }
  }

  function toggle(set: Set<string>, setFn: (s: Set<string>) => void, id: string) {
    const next = new Set(set)
    next.has(id) ? next.delete(id) : next.add(id)
    setFn(next)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Sync de Stock</h1>
          <p className="text-sm text-gray-500 mt-0.5">Conecta proyectos a Google Sheets o Excel para sincronizar unidades.</p>
        </div>
        <button onClick={() => { setEditing(null); setShowModal(true) }} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="h-4 w-4" /> Nueva fuente
        </button>
      </div>

      {toast && (
        <div className={cn('fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white max-w-sm', toast.ok ? 'bg-green-600' : 'bg-red-600')}>
          {toast.msg}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-400 py-12 text-center">Cargando…</div>
      ) : sources.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <Database className="h-8 w-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No hay fuentes configuradas.</p>
          <button onClick={() => { setEditing(null); setShowModal(true) }} className="mt-4 text-sm text-brand-primary hover:underline">Crear primera fuente</button>
        </div>
      ) : (
        <div className="space-y-4">
          {sources.map((source) => {
            const lastLog = source.syncLogs[0]
            const isSyncing = syncing === source.id
            const logsOpen = expandedLogs.has(source.id)
            const unitsOpen = expandedUnits.has(source.id)

            return (
              <div key={source.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center gap-4 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm">{source.project.name}</span>
                      <span className={cn('text-[10px] font-bold uppercase px-1.5 py-0.5 rounded', source.fileType === 'GOOGLE_SHEETS' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700')}>
                        {source.fileType === 'GOOGLE_SHEETS' ? 'Sheets' : 'Excel'}
                      </span>
                      {!source.isActive && <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">Inactivo</span>}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-400 flex-wrap">
                      <span>ID: <code className="font-mono">{source.driveFileId.slice(0, 20)}…</code></span>
                      {source.sheetName && <span>Hoja: {source.sheetName}</span>}
                      <span>Fila enc.: {source.headerRow}</span>
                      <span>{source._count.units} unidades</span>
                      <span>Último sync: {fmtDate(source.lastSyncAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {source._count.units > 0 && (
                      <button onClick={() => toggle(expandedUnits, setExpandedUnits, source.id)}
                        className={cn('flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors', unitsOpen ? 'bg-brand-primary/10 border-brand-primary/20 text-brand-primary' : 'border-gray-200 text-gray-600 hover:bg-gray-50')}>
                        <Table2 className="h-3.5 w-3.5" />
                        {unitsOpen ? 'Ocultar' : 'Ver unidades'}
                      </button>
                    )}
                    {lastLog && (
                      <button onClick={() => toggle(expandedLogs, setExpandedLogs, source.id)} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700">
                        <StatusBadge status={lastLog.status} />
                        {logsOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      </button>
                    )}
                    <button onClick={() => handleSync(source.id, source.project.name)} disabled={isSyncing}
                      className={cn('flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors', isSyncing ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-brand-primary text-white hover:bg-brand-primary/90')}>
                      <RefreshCw className={cn('h-3.5 w-3.5', isSyncing && 'animate-spin')} />
                      {isSyncing ? 'Sincronizando…' : 'Sync'}
                    </button>
                    <button onClick={() => { setEditing(source); setShowModal(true) }} className="p-1.5 text-gray-400 hover:text-brand-primary rounded-lg hover:bg-gray-50">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(source.id, source.project.name)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {logsOpen && lastLog && (
                  <div className="border-t border-gray-100 bg-gray-50 px-5 py-3">
                    <div className="grid grid-cols-4 gap-4 text-xs">
                      <div><span className="text-gray-400">Encontradas</span><div className="font-semibold text-gray-700 mt-0.5">{lastLog.rowsFound}</div></div>
                      <div><span className="text-gray-400">Insertadas</span><div className="font-semibold text-green-700 mt-0.5">{lastLog.rowsInserted}</div></div>
                      <div><span className="text-gray-400">Actualizadas</span><div className="font-semibold text-blue-700 mt-0.5">{lastLog.rowsUpdated}</div></div>
                      <div><span className="text-gray-400">Omitidas</span><div className="font-semibold text-gray-500 mt-0.5">{lastLog.rowsSkipped}</div></div>
                    </div>
                    {lastLog.errorMessage && <p className="mt-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded">{lastLog.errorMessage}</p>}
                    <p className="mt-2 text-[11px] text-gray-400">{fmtDate(lastLog.startedAt)}{lastLog.finishedAt && ` → ${fmtDate(lastLog.finishedAt)}`}</p>
                  </div>
                )}

                {unitsOpen && <UnitsTable projectId={source.projectId} />}
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <SourceWizard
          projects={projects}
          initial={editing}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditing(null) }}
        />
      )}
    </div>
  )
}
