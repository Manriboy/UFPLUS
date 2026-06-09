'use client'
// src/components/admin/SyncPanel.tsx
import { useState, useCallback } from 'react'
import { RefreshCw, CheckCircle2, XCircle, Zap, Sun, CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'

type SyncStatus = 'idle' | 'running' | 'done' | 'error'
type SyncState = { status: SyncStatus; progress: number; message: string }

const INITIAL: SyncState = { status: 'idle', progress: 0, message: '' }

// ── Definición de fuentes por sección ────────────────────

const DAILY_SOURCES = [
  { key: 'iris-daily',  label: 'AWS',   description: 'Renueva token + precios',   url: '/api/admin/external/sync/iris/daily' },
  { key: 'brouk-daily', label: 'Drive', description: 'Renueva links de imágenes', url: '/api/admin/external/sync/brouk' },
] as const

const WEEKLY_SOURCES = [
  { key: 'iris',  label: 'AWS',   description: 'Proyectos + unidades completo', url: '/api/admin/external/sync/iris' },
  { key: 'brouk', label: 'Drive', description: 'Proyectos completo',            url: '/api/admin/external/sync/brouk' },
] as const

type DailyKey = typeof DAILY_SOURCES[number]['key']
type WeeklyKey = typeof WEEKLY_SOURCES[number]['key']
type AnyKey = DailyKey | WeeklyKey

const SOURCE_COLORS: Record<string, string> = {
  AWS: 'bg-orange-500 text-white',
  Drive: 'bg-blue-600 text-white',
}

// ── Lógica de streaming SSE ───────────────────────────────

function useSyncRunner() {
  const allKeys: AnyKey[] = [
    ...DAILY_SOURCES.map(s => s.key),
    ...WEEKLY_SOURCES.map(s => s.key),
  ]
  const initStates = Object.fromEntries(allKeys.map(k => [k, { ...INITIAL }])) as Record<AnyKey, SyncState>
  const [states, setStates] = useState<Record<AnyKey, SyncState>>(initStates)

  const update = useCallback((key: AnyKey, patch: Partial<SyncState>) => {
    setStates(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }))
  }, [])

  const runSource = useCallback((key: AnyKey, url: string): Promise<void> => {
    return new Promise(resolve => {
      update(key, { status: 'running', progress: 0, message: 'Iniciando...' })
      const es = new EventSource(url)
      es.onmessage = e => {
        try {
          const d = JSON.parse(e.data) as { progress: number; message: string; done?: boolean; error?: boolean }
          if (d.error) { update(key, { status: 'error', progress: 0, message: d.message }); es.close(); resolve(); return }
          if (d.done)  { update(key, { status: 'done', progress: 100, message: d.message }); es.close(); resolve(); return }
          update(key, { progress: Math.max(0, d.progress), message: d.message })
        } catch {}
      }
      es.onerror = () => { update(key, { status: 'error', progress: 0, message: 'Error de conexión' }); es.close(); resolve() }
    })
  }, [update])

  return { states, runSource }
}

// ── Tarjeta individual ────────────────────────────────────

function SyncCard({
  label, description, srcKey, url, running: allRunning, state, onRun,
}: {
  label: string
  description: string
  srcKey: AnyKey
  url: string
  running: boolean
  state: SyncState
  onRun: (key: AnyKey, url: string) => void
}) {
  const running = state.status === 'running'
  const disabled = allRunning
  const showBar = running || state.status === 'done'

  return (
    <div className="border border-gray-100 rounded-lg p-3.5 flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', SOURCE_COLORS[label] ?? 'bg-gray-400 text-white')}>
            {label}
          </span>
          <span className="text-xs text-gray-500">{description}</span>
        </div>
        {state.status === 'done' && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />}
        {state.status === 'error' && <XCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />}
      </div>

      {showBar && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-400">
            <span className="truncate max-w-[80%]">{state.message}</span>
            <span className="tabular-nums">{state.progress}%</span>
          </div>
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-300', state.status === 'done' ? 'bg-green-500' : 'bg-brand-primary')}
              style={{ width: `${state.progress}%` }}
            />
          </div>
        </div>
      )}

      {!showBar && state.status === 'error' && (
        <p className="text-xs text-red-500 truncate">{state.message}</p>
      )}

      {!showBar && state.status === 'idle' && (
        <p className="text-xs text-gray-300">Sin sincronizar</p>
      )}

      <button
        onClick={() => onRun(srcKey, url)}
        disabled={disabled}
        className={cn(
          'flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors mt-auto',
          disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-brand-primary text-white hover:opacity-90'
        )}
      >
        <RefreshCw className={cn('h-3 w-3', running && 'animate-spin')} />
        {running ? 'Sincronizando...' : 'Sincronizar'}
      </button>
    </div>
  )
}

// ── Botón "Sync todo" de sección ──────────────────────────

function SyncAllButton({
  label, icon: Icon, sources, states, running: anyRunning, onRunAll,
}: {
  label: string
  icon: React.ElementType
  sources: readonly { key: AnyKey; url: string }[]
  states: Record<AnyKey, SyncState>
  running: boolean
  onRunAll: () => void
}) {
  const allDone = sources.every(s => states[s.key].status === 'done')
  const hasError = sources.some(s => states[s.key].status === 'error')

  return (
    <button
      onClick={onRunAll}
      disabled={anyRunning}
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors border',
        anyRunning
          ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
          : allDone && !hasError
            ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
            : hasError
              ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
              : 'bg-gray-900 text-white border-gray-900 hover:bg-gray-700'
      )}
    >
      {allDone && !hasError
        ? <CheckCircle2 className="h-3.5 w-3.5" />
        : hasError
          ? <XCircle className="h-3.5 w-3.5" />
          : <Icon className={cn('h-3.5 w-3.5', anyRunning && 'animate-pulse')} />
      }
      {anyRunning ? 'Sincronizando...' : allDone ? 'Completado' : label}
    </button>
  )
}

// ── Componente principal ──────────────────────────────────

export default function SyncPanel() {
  const [open, setOpen] = useState(false)
  const { states, runSource } = useSyncRunner()

  const dailyRunning = DAILY_SOURCES.some(s => states[s.key].status === 'running')
  const weeklyRunning = WEEKLY_SOURCES.some(s => states[s.key].status === 'running')
  const anyRunning = dailyRunning || weeklyRunning

  const runAllDaily = useCallback(async () => {
    await Promise.all(DAILY_SOURCES.map(s => runSource(s.key, s.url)))
  }, [runSource])

  const runAllWeekly = useCallback(async () => {
    for (const s of WEEKLY_SOURCES) await runSource(s.key, s.url)
  }, [runSource])

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Sincronización de fuentes
        </h2>
        <button
          onClick={() => setOpen(v => !v)}
          className={cn(
            'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none',
            open ? 'bg-brand-primary' : 'bg-gray-200'
          )}
          role="switch"
          aria-checked={open}
        >
          <span className={cn(
            'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200',
            open ? 'translate-x-4' : 'translate-x-0'
          )} />
        </button>
      </div>

      {open && (
        <div className="space-y-6">

          {/* ── Sección diaria ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sun className="h-4 w-4 text-amber-500" />
                <div>
                  <p className="text-sm font-semibold text-gray-800">Renovación diaria</p>
                  <p className="text-xs text-gray-400">Tokens y links que expiran — hacer todos los días</p>
                </div>
              </div>
              <SyncAllButton
                label="Renovar todo"
                icon={Sun}
                sources={DAILY_SOURCES}
                states={states}
                running={anyRunning}
                onRunAll={runAllDaily}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DAILY_SOURCES.map(s => (
                <SyncCard
                  key={s.key}
                  label={s.label}
                  description={s.description}
                  srcKey={s.key}
                  url={s.url}
                  running={anyRunning}
                  state={states[s.key]}
                  onRun={runSource}
                />
              ))}
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* ── Sección semanal ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-brand-primary" />
                <div>
                  <p className="text-sm font-semibold text-gray-800">Sincronización semanal</p>
                  <p className="text-xs text-gray-400">Proyectos y unidades nuevas — hacer los lunes</p>
                </div>
              </div>
              <SyncAllButton
                label="Sync completo"
                icon={Zap}
                sources={WEEKLY_SOURCES}
                states={states}
                running={anyRunning}
                onRunAll={runAllWeekly}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {WEEKLY_SOURCES.map(s => (
                <SyncCard
                  key={s.key}
                  label={s.label}
                  description={s.description}
                  srcKey={s.key}
                  url={s.url}
                  running={anyRunning}
                  state={states[s.key]}
                  onRun={runSource}
                />
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
