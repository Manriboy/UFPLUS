'use client'
// src/app/reset-password/page.tsx
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react'

function ResetForm() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get('token') ?? ''

  const [pw, setPw]         = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw]   = useState(false)
  const showCf = showPw
  const toggleShow = () => setShowPw(v => !v)
  const [error, setError]     = useState('')
  const [saving, setSaving]   = useState(false)
  const [done, setDone]       = useState(false)

  useEffect(() => { if (!token) setError('Enlace inválido o expirado') }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (pw.length < 6)    { setError('Mínimo 6 caracteres'); return }
    if (pw !== confirm)   { setError('Las contraseñas no coinciden'); return }
    setSaving(true)

    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password: pw }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setSaving(false); return }

    // Auto-login con la nueva contraseña
    const login = await signIn('credentials', {
      redirect: false,
      email: data.email,
      password: pw,
    })
    setSaving(false)
    if (login?.ok) { setDone(true); setTimeout(() => router.replace('/admin'), 1500) }
    else           { setError('Contraseña actualizada, pero no se pudo iniciar sesión automáticamente.') }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Nueva contraseña</h1>
          <p className="text-sm text-gray-500 mt-1">Ingresa tu nueva contraseña dos veces para confirmarla.</p>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
            <p className="text-sm text-gray-700 font-medium">¡Contraseña actualizada! Redirigiendo…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nueva contraseña</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={pw}
                  onChange={e => setPw(e.target.value)}
                  className="input-field text-sm w-full pr-9"
                  autoFocus
                />
                <button type="button" onClick={toggleShow}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Confirmar contraseña</label>
              <div className="relative">
                <input
                  type={showCf ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  className="input-field text-sm w-full pr-9"
                />
                <button type="button" onClick={toggleShow}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showCf ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirm && (
                <div className="flex items-center gap-1 mt-1">
                  {pw === confirm
                    ? <><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /><span className="text-xs text-green-600">Las contraseñas coinciden</span></>
                    : <><XCircle className="w-3.5 h-3.5 text-red-400" /><span className="text-xs text-red-500">No coinciden</span></>
                  }
                </div>
              )}
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={saving || !token}
              className="btn-primary w-full text-sm"
            >
              {saving ? 'Guardando…' : 'Confirmar nueva contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  )
}
