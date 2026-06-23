'use client'
// src/app/admin/arriendos/conectar/ConectarContent.tsx
import { useSearchParams } from 'next/navigation'
import { CheckCircle, AlertCircle, ExternalLink, KeyRound } from 'lucide-react'
import { Suspense } from 'react'

interface Props {
  authUrl: string
  redirectUri: string
}

function Inner({ authUrl, redirectUri }: Props) {
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
              {error === 'denied'      && 'Rechazaste el acceso en Mercado Libre.'}
              {error === 'token'       && 'Error al intercambiar el código con ML.'}
              {error === 'token_fetch' && 'No se pudo conectar con la API de ML para intercambiar el código.'}
              {error === 'db'          && 'Los tokens se obtuvieron pero falló al guardarlos en la base de datos.'}
              {error === 'no_session'  && 'Tu sesión expiró durante la autorización. Inicia sesión y vuelve a intentarlo.'}
              {error === 'server'      && 'Error interno del servidor.'}
            </p>
            {sp.get('detail') && (
              <code className="mt-1 block text-xs bg-red-100 rounded px-2 py-1 break-all">{sp.get('detail')}</code>
            )}
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <p className="text-sm text-gray-600">
          Para buscar arriendos en Portal Inmobiliario necesitas autorizar el acceso con tu cuenta de ML. Es un proceso de un solo clic y el acceso se renueva automáticamente.
        </p>

        <div className="text-xs text-gray-500 bg-gray-50 rounded p-3 space-y-2">
          <p className="font-semibold text-gray-700">El Redirect URI configurado en tu app de ML developers debe ser exactamente:</p>
          <code className="block font-mono text-brand-primary break-all bg-white border border-gray-200 rounded px-2 py-1">{redirectUri}</code>
          <p className="font-semibold text-gray-700 mt-2">URL de autorización:</p>
          <code className="block font-mono text-gray-500 break-all bg-white border border-gray-200 rounded px-2 py-1 text-[10px]">{authUrl}</code>
        </div>

        <a
          href={authUrl}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-primary text-white text-sm font-medium hover:bg-brand-primary-dark transition-colors w-full justify-center"
        >
          <ExternalLink className="h-4 w-4" />
          Autorizar con Mercado Libre
        </a>
      </div>
    </div>
  )
}

export default function ConectarContent(props: Props) {
  return (
    <Suspense>
      <Inner {...props} />
    </Suspense>
  )
}
