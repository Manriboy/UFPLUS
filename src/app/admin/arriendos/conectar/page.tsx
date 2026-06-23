'use client'
// src/app/admin/arriendos/conectar/page.tsx
import { useSearchParams } from 'next/navigation'
import { CheckCircle, AlertCircle, ExternalLink, KeyRound } from 'lucide-react'
import { Suspense } from 'react'

const ML_CLIENT_ID  = process.env.NEXT_PUBLIC_ML_CLIENT_ID ?? ''
const REDIRECT_BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
const REDIRECT_URI  = `${REDIRECT_BASE}/api/admin/ml/callback`

function buildAuthUrl() {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id:     ML_CLIENT_ID,
    redirect_uri:  REDIRECT_URI,
  })
  return `https://auth.mercadolibre.cl/authorization?${params}`
}

function ConectarContent() {
  const sp      = useSearchParams()
  const success = sp.get('success') === '1'
  const error   = sp.get('error')

  return (
    <div className="max-w-lg mx-auto py-12 px-6 space-y-6">
      <div className="flex items-center gap-3">
        <KeyRound className="h-6 w-6 text-brand-primary" />
        <h1 className="text-xl font-bold text-brand-text">Conectar cuenta de Mercado Libre</h1>
      </div>

      {success && (
        <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
          <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Cuenta conectada exitosamente</p>
            <p className="mt-0.5 text-green-700">Las búsquedas de arriendos ya están disponibles.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Error al conectar</p>
            <p className="mt-0.5">
              {error === 'denied'  && 'Rechazaste el acceso en Mercado Libre.'}
              {error === 'token'   && 'No se pudo intercambiar el código. Verifica que el Redirect URI esté configurado correctamente en ML.'}
              {error === 'server'  && 'Error interno del servidor.'}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <p className="text-sm text-gray-600">
          Para buscar arriendos en Portal Inmobiliario necesitas autorizar el acceso con tu cuenta de ML. Es un proceso de un solo clic y el acceso se renueva automáticamente.
        </p>

        <div className="text-xs text-gray-500 bg-gray-50 rounded p-3 space-y-1">
          <p className="font-semibold text-gray-700">Antes de continuar, asegúrate de que en tu app de ML developers el Redirect URI incluya:</p>
          <code className="block font-mono text-brand-primary break-all">{REDIRECT_URI}</code>
        </div>

        <a
          href={buildAuthUrl()}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-primary text-white text-sm font-medium hover:bg-brand-primary-dark transition-colors w-full justify-center"
        >
          <ExternalLink className="h-4 w-4" />
          Autorizar con Mercado Libre
        </a>
      </div>
    </div>
  )
}

export default function ConectarPage() {
  return (
    <Suspense>
      <ConectarContent />
    </Suspense>
  )
}
