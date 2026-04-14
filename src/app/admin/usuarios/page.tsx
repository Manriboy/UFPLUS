'use client'
// src/app/admin/usuarios/page.tsx

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  name: string | null
  email: string
  role: 'ADMIN' | 'SUPERADMIN' | 'EDITOR'
  createdAt: string
}

const emptyForm = { name: '', email: '', password: '', role: 'ADMIN' as 'ADMIN' | 'SUPERADMIN' }

export default function UsuariosPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'create' | 'edit' | 'password' | null>(null)
  const [selected, setSelected] = useState<User | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [pwForm, setPwForm] = useState({ password: '', confirm: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (status === 'loading') return
    if (session?.user?.role !== 'SUPERADMIN') router.replace('/admin')
  }, [session, status, router])

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    setLoading(true)
    const res = await fetch('/api/admin/usuarios')
    const data = await res.json()
    setUsers(data.users ?? [])
    setLoading(false)
  }

  function notify(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  function openCreate() {
    setForm(emptyForm)
    setError('')
    setModal('create')
  }

  function openEdit(u: User) {
    setSelected(u)
    setForm({ name: u.name ?? '', email: u.email, password: '', role: u.role === 'EDITOR' ? 'ADMIN' : u.role })
    setError('')
    setModal('edit')
  }

  function openPassword(u: User) {
    setSelected(u)
    setPwForm({ password: '', confirm: '' })
    setError('')
    setModal('password')
  }

  async function handleCreate() {
    setError('')
    if (!form.email || !form.password) { setError('Email y contraseña son requeridos'); return }
    setSaving(true)
    const res = await fetch('/api/admin/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error); return }
    setModal(null)
    notify('Usuario creado')
    loadUsers()
  }

  async function handleEdit() {
    setError('')
    setSaving(true)
    const res = await fetch('/api/admin/usuarios', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selected!.id, name: form.name, email: form.email, role: form.role }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error); return }
    setModal(null)
    notify('Usuario actualizado')
    loadUsers()
  }

  async function handlePassword() {
    setError('')
    if (!pwForm.password) { setError('Ingresa una contraseña'); return }
    if (pwForm.password !== pwForm.confirm) { setError('Las contraseñas no coinciden'); return }
    if (pwForm.password.length < 6) { setError('Mínimo 6 caracteres'); return }
    setSaving(true)
    const res = await fetch('/api/admin/usuarios', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selected!.id, password: pwForm.password }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error); return }
    setModal(null)
    notify('Contraseña actualizada')
  }

  async function handleDelete(u: User) {
    if (!confirm(`¿Eliminar a ${u.email}? Esta acción no se puede deshacer.`)) return
    const res = await fetch(`/api/admin/usuarios?id=${u.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) { alert(data.error); return }
    notify('Usuario eliminado')
    loadUsers()
  }

  if (status === 'loading' || session?.user?.role !== 'SUPERADMIN') return null

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Control de usuarios</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestiona los accesos al panel admin.</p>
        </div>
        <button onClick={openCreate} className="btn-primary text-sm">+ Nuevo usuario</button>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-green-600 text-white text-sm font-medium px-4 py-3 rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400 py-8 text-center">Cargando…</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-left border-b border-gray-100">
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Rol</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-800">{u.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${u.role === 'SUPERADMIN' ? 'bg-brand-primary/10 text-brand-primary' : 'bg-gray-100 text-gray-600'}`}>
                      {u.role === 'SUPERADMIN' ? 'Superadmin' : 'Admin'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => openEdit(u)} className="text-xs text-blue-600 hover:underline">Editar</button>
                    <button onClick={() => openPassword(u)} className="text-xs text-gray-600 hover:underline">Contraseña</button>
                    <button onClick={() => handleDelete(u)} className="text-xs text-red-500 hover:underline">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal crear */}
      {modal === 'create' && (
        <Modal title="Nuevo usuario" onClose={() => setModal(null)}>
          <UserForm form={form} setForm={setForm} error={error} showPassword />
          <ModalFooter onCancel={() => setModal(null)} onConfirm={handleCreate} saving={saving} label="Crear" />
        </Modal>
      )}

      {/* Modal editar */}
      {modal === 'edit' && selected && (
        <Modal title={`Editar: ${selected.email}`} onClose={() => setModal(null)}>
          <UserForm form={form} setForm={setForm} error={error} showPassword={false} />
          <ModalFooter onCancel={() => setModal(null)} onConfirm={handleEdit} saving={saving} label="Guardar" />
        </Modal>
      )}

      {/* Modal contraseña */}
      {modal === 'password' && selected && (
        <Modal title={`Cambiar contraseña: ${selected.email}`} onClose={() => setModal(null)}>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nueva contraseña</label>
              <input type="password" value={pwForm.password} onChange={(e) => setPwForm({ ...pwForm, password: e.target.value })} className="input-field text-sm w-full" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Confirmar contraseña</label>
              <input type="password" value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} className="input-field text-sm w-full" />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
          <ModalFooter onCancel={() => setModal(null)} onConfirm={handlePassword} saving={saving} label="Cambiar contraseña" />
        </Modal>
      )}
    </div>
  )
}

function UserForm({ form, setForm, error, showPassword }: {
  form: typeof emptyForm
  setForm: (f: typeof emptyForm) => void
  error: string
  showPassword: boolean
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-gray-500 mb-1">Nombre</label>
        <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field text-sm w-full" />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Email *</label>
        <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field text-sm w-full" />
      </div>
      {showPassword && (
        <div>
          <label className="block text-xs text-gray-500 mb-1">Contraseña *</label>
          <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input-field text-sm w-full" />
        </div>
      )}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Rol</label>
        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as 'ADMIN' | 'SUPERADMIN' })} className="input-field text-sm w-full">
          <option value="ADMIN">Admin</option>
          <option value="SUPERADMIN">Superadmin</option>
        </select>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function ModalFooter({ onCancel, onConfirm, saving, label }: { onCancel: () => void; onConfirm: () => void; saving: boolean; label: string }) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button onClick={onCancel} className="btn-secondary text-sm">Cancelar</button>
      <button onClick={onConfirm} disabled={saving} className="btn-primary text-sm">{saving ? 'Guardando…' : label}</button>
    </div>
  )
}
