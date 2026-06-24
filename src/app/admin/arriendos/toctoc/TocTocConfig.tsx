'use client'
import { useState } from 'react'
import { CheckCircle, AlertCircle, Clock, ExternalLink, KeyRound, Save, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'

interface Props {
  gAuthConnected:  boolean
  accessConnected: boolean
  gAuthExp:        number | null
  accessExp:       number | null
}

function TokenStatus({ connected, exp, label }: { connected: boolean; exp: number | null; label: string }) {
  if (!connected) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600">
        <AlertCircle className="h-4 w-4 flex-shrink-0" />
        <span><span className="font-medium">{label}:</span> no configurado</span>
      </div>
    )
  }
  const now = Date.now() / 1000
  const daysLeft = exp ? Math.floor((exp - now) / 86400) : null
  const expired  = daysLeft !== null && daysLeft < 0
  const warning  = daysLeft !== null && daysLeft >= 0 && daysLeft <= 3

  const expDate  = exp ? new Date(exp * 1000).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : null

  return (
    <div className={`flex items-center gap-2 text-sm ${expired ? 'text-red-600' : warning ? 'text-amber-600' : 'text-green-700'}`}>
      {expired ? <AlertCircle className="h-4 w-4 flex-shrink-0" /> : warning ? <Clock className="h-4 w-4 flex-shrink-0" /> : <CheckCircle className="h-4 w-4 flex-shrink-0" />}
      <span>
        <span className="font-medium">{label}:</span>{' '}
        {expired ? 'expirado' : daysLeft !== null ? `${daysLeft} días restantes` : 'configurado'}
        {expDate && <span className="text-xs opacity-70 ml-1">(vence {expDate})</span>}
      </span>
    </div>
  )
}

export default function TocTocConfig({ gAuthConnected, accessConnected, gAuthExp, accessExp }: Props) {
  const [gAuth,  setGAuth]  = useState('')
  const [access, setAccess] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [error,  setError]  = useState<string | null>(null)
  const [showInstructions, setShowInstructions] = useState(false)

  const bothConnected = gAuthConnected && accessConnected

  async function handleSave() {
    if (!gAuth.trim() && !access.trim()) return
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch('/api/admin/toctoc/configurar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ttJwtGauth: gAuth, ttAccessToken: access }),
      })
      if (!res.ok) throw new Error('Error al guardar')
      setSaved(true)
      setGAuth('')
      setAccess('')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-10 px-6 space-y-6">
      {/* Encabezado */}
      <div className="flex items-center gap-3">
        <KeyRound className="h-6 w-6 text-brand-primary" />
        <div>
          <h1 className="text-xl font-bold text-brand-text">Configurar TocToc</h1>
          <p className="text-sm text-gray-500 mt-0.5">Tokens de acceso para el buscador de arriendos</p>
        </div>
      </div>

      {/* Estado actual */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado actual</p>
        <TokenStatus connected={gAuthConnected}  exp={gAuthExp}  label="tt-jwt-gauth (anual)" />
        <TokenStatus connected={accessConnected} exp={accessExp} label="x-access-token (semanal)" />
        {bothConnected && (
          <div className="pt-2">
            <Link href="/admin/arriendos" className="text-xs text-brand-primary hover:underline inline-flex items-center gap-1">
              Ir al buscador de arriendos <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        )}
      </div>

      {/* Instrucciones colapsables */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setShowInstructions(v => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <span>¿Cómo obtener los tokens?</span>
          {showInstructions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {showInstructions && (
          <div className="px-5 pb-5 space-y-4 text-sm text-gray-600 bg-white border-t border-gray-100">
            <div className="pt-4 space-y-3">
              <p className="font-semibold text-gray-700">Token anual (tt-jwt-gauth) — renovar 1 vez al año</p>
              <ol className="list-decimal list-inside space-y-1.5 text-gray-600">
                <li>Ve a <a href="https://www.toctoc.com" target="_blank" rel="noopener noreferrer" className="text-brand-primary hover:underline">toctoc.com</a> e inicia sesión con tu cuenta</li>
                <li>Abre DevTools: tecla <kbd className="bg-gray-100 border border-gray-200 rounded px-1 text-xs">F12</kbd> o clic derecho → Inspeccionar</li>
                <li>Ve a la pestaña <strong>Application</strong> → <strong>Cookies</strong> → <code className="text-xs bg-gray-100 rounded px-1">www.toctoc.com</code></li>
                <li>Busca la cookie llamada <code className="text-xs bg-brand-primary/10 text-brand-primary rounded px-1.5 py-0.5">tt-jwt-gauth</code></li>
                <li>Copia el valor completo y pégalo abajo</li>
              </ol>
            </div>
            <div className="space-y-3">
              <p className="font-semibold text-gray-700">Token semanal (x-access-token) — renovar cada ~7 días</p>
              <ol className="list-decimal list-inside space-y-1.5 text-gray-600">
                <li>Ve a <a href="https://www.toctoc.com/resultados/lista/arriendo/departamento/?texto=Las+Condes" target="_blank" rel="noopener noreferrer" className="text-brand-primary hover:underline">esta búsqueda en TocToc</a></li>
                <li>Abre DevTools y ve a la pestaña <strong>Network</strong></li>
                <li>Filtra por <code className="text-xs bg-gray-100 rounded px-1">GetProps</code></li>
                <li>Haz clic en la solicitud que aparece y ve a <strong>Request Headers</strong></li>
                <li>Copia el valor de <code className="text-xs bg-brand-primary/10 text-brand-primary rounded px-1.5 py-0.5">x-access-token</code> y pégalo abajo</li>
              </ol>
            </div>
          </div>
        )}
      </div>

      {/* Formulario */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Actualizar tokens</p>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            tt-jwt-gauth <span className="text-xs text-gray-400 font-normal">(token anual — déjalo vacío si no cambia)</span>
          </label>
          <textarea
            value={gAuth}
            onChange={e => setGAuth(e.target.value)}
            rows={3}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            className="input-field w-full text-xs font-mono resize-none"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            x-access-token <span className="text-xs text-gray-400 font-normal">(token semanal)</span>
          </label>
          <textarea
            value={access}
            onChange={e => setAccess(e.target.value)}
            rows={3}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            className="input-field w-full text-xs font-mono resize-none"
          />
        </div>

        {saved && (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
            Tokens guardados. Recarga la página para ver el estado actualizado.
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving || (!gAuth.trim() && !access.trim())}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-primary text-white text-sm font-medium hover:bg-brand-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Guardando...' : 'Guardar tokens'}
        </button>
      </div>
    </div>
  )
}
