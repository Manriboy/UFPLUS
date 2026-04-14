'use client'
// src/app/admin/perfil/page.tsx

import { useState } from 'react'
import { useSession } from 'next-auth/react'

export default function PerfilPage() {
  const { data: session } = useSession()
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!form.currentPassword || !form.newPassword) { setError('Completa todos los campos'); return }
    if (form.newPassword !== form.confirm) { setError('Las contraseñas no coinciden'); return }
    if (form.newPassword.length < 6) { setError('Mínimo 6 caracteres'); return }
    setSaving(true)
    const res = await fetch('/api/admin/perfil', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error); return }
    setSuccess('Contraseña actualizada correctamente')
    setForm({ currentPassword: '', newPassword: '', confirm: '' })
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Mi perfil</h1>
        <p className="text-sm text-gray-500 mt-0.5">{session?.user?.email}</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Cambiar contraseña</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Contraseña actual</label>
            <input
              type="password"
              value={form.currentPassword}
              onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
              className="input-field text-sm w-full"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nueva contraseña</label>
            <input
              type="password"
              value={form.newPassword}
              onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
              className="input-field text-sm w-full"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Confirmar nueva contraseña</label>
            <input
              type="password"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              className="input-field text-sm w-full"
              required
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          {success && <p className="text-xs text-green-600">{success}</p>}
          <button type="submit" disabled={saving} className="btn-primary text-sm w-full">
            {saving ? 'Guardando…' : 'Cambiar contraseña'}
          </button>
        </form>
      </div>
    </div>
  )
}
