'use client'
// src/app/admin/usuarios/page.tsx
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Copy, Check, RotateCcw } from 'lucide-react'

interface User {
  id: string
  name: string | null
  email: string
  role: AnyRole
  phone: string | null
  brokerType: string | null
  companyName: string | null
  plainPassword: string | null
  createdAt: string
  updatedAt: string
}

type AnyRole    = 'ADMIN' | 'SUPERADMIN' | 'EDITOR' | 'PROPIETARIO' | 'BROKER'
type BrokerType = 'PARTICULAR' | 'EMPRESA'

const emptyForm = {
  name: '', email: '', password: '', phone: '',
  role: 'ADMIN' as AnyRole,
  brokerType: 'PARTICULAR' as BrokerType,
  companyName: '',
}

const ROLE_LABELS: Record<AnyRole, string> = {
  SUPERADMIN: 'Superadmin', ADMIN: 'Admin', EDITOR: 'Editor',
  BROKER: 'Broker', PROPIETARIO: 'Propietario',
}
const ROLE_COLORS: Record<AnyRole, string> = {
  SUPERADMIN:  'bg-brand-primary/10 text-brand-primary',
  ADMIN:       'bg-gray-100 text-gray-600',
  EDITOR:      'bg-gray-100 text-gray-600',
  BROKER:      'bg-sky-100 text-sky-700',
  PROPIETARIO: 'bg-emerald-100 text-emerald-700',
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ── CopyPassword ─────────────────────────────────────────────────────────────
function CopyPassword({ value }: { value: string | null }) {
  const [visible, setVisible] = useState(false)
  const [copied, setCopied]   = useState(false)

  if (!value) return <span className="text-xs text-gray-300 italic">privada</span>

  async function copy() {
    await navigator.clipboard.writeText(value!)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-1">
      <span className="text-xs font-mono text-gray-700">{visible ? value : '••••••••'}</span>
      <button onClick={() => setVisible(v => !v)} className="text-gray-400 hover:text-gray-600">
        {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      </button>
      <button onClick={copy} className="text-gray-400 hover:text-gray-600">
        {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function UsuariosPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [users, setUsers]     = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState<'create' | 'edit' | 'password' | null>(null)
  const [selected, setSelected] = useState<User | null>(null)
  const [form, setForm]       = useState(emptyForm)
  const [pwForm, setPwForm]   = useState({ password: '', confirm: '' })
  const [showPw, setShowPw]   = useState(false)
  const [showPwConfirm, setShowPwConfirm] = useState(false)
  const [error, setError]     = useState('')
  const [saving, setSaving]   = useState(false)
  const [toast, setToast]     = useState<{ msg: string; type?: 'ok' | 'err' }>({ msg: '' })

  useEffect(() => {
    if (status === 'loading') return
    if (session?.user?.role !== 'SUPERADMIN') router.replace('/admin')
  }, [session, status, router])

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    setLoading(true)
    const res  = await fetch('/api/admin/usuarios')
    const data = await res.json()
    setUsers(data.users ?? [])
    setLoading(false)
  }

  function notify(msg: string, type: 'ok' | 'err' = 'ok') {
    setToast({ msg, type })
    setTimeout(() => setToast({ msg: '' }), 4000)
  }

  function openCreate() { setForm(emptyForm); setError(''); setModal('create') }
  function openEdit(u: User) {
    setSelected(u)
    setForm({ name: u.name ?? '', email: u.email, password: '', phone: u.phone ?? '',
      role: u.role, brokerType: (u.brokerType as BrokerType) ?? 'PARTICULAR', companyName: u.companyName ?? '' })
    setError(''); setModal('edit')
  }
  function openPassword(u: User) {
    setSelected(u); setPwForm({ password: '', confirm: '' })
    setShowPw(false); setShowPwConfirm(false); setError(''); setModal('password')
  }

  async function handleCreate() {
    setError('')
    if (!form.email || !form.password) { setError('Email y contraseña son requeridos'); return }
    if (form.role === 'BROKER' && !form.companyName.trim()) { setError('El nombre del broker es requerido'); return }
    setSaving(true)
    const res  = await fetch('/api/admin/usuarios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error); return }
    setModal(null); notify('Usuario creado'); loadUsers()
  }

  async function handleEdit() {
    setError('')
    if (form.role === 'BROKER' && !form.companyName.trim()) { setError('El nombre del broker es requerido'); return }
    setSaving(true)
    const res  = await fetch('/api/admin/usuarios', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selected!.id, name: form.name, email: form.email, role: form.role,
        phone: form.phone, brokerType: form.brokerType, companyName: form.companyName }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error); return }
    setModal(null); notify('Usuario actualizado'); loadUsers()
  }

  async function handlePassword() {
    setError('')
    if (!pwForm.password) { setError('Ingresa una contraseña'); return }
    if (pwForm.password !== pwForm.confirm) { setError('Las contraseñas no coinciden'); return }
    if (pwForm.password.length < 6) { setError('Mínimo 6 caracteres'); return }
    setSaving(true)
    const res  = await fetch('/api/admin/usuarios', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selected!.id, password: pwForm.password }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error); return }
    setModal(null); notify('Contraseña actualizada'); loadUsers()
  }

  async function handleReset(u: User) {
    if (!confirm(`¿Enviar correo de recuperación a ${u.email}?\nSu sesión se cerrará inmediatamente.`)) return
    const res  = await fetch('/api/admin/usuarios', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: u.id }),
    })
    const data = await res.json().catch(() => ({ error: 'Error inesperado del servidor' }))
    if (!res.ok) { notify(data.error ?? 'Error al enviar correo', 'err'); return }
    notify(`Correo enviado a ${u.email}`)
  }

  async function handleDelete(u: User) {
    if (!confirm(`¿Eliminar a ${u.email}? Esta acción no se puede deshacer.`)) return
    const res  = await fetch(`/api/admin/usuarios?id=${u.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) { notify(data.error, 'err'); return }
    notify('Usuario eliminado'); loadUsers()
  }

  if (status === 'loading' || session?.user?.role !== 'SUPERADMIN') return null

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Control de usuarios</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestiona los accesos al panel admin.</p>
        </div>
        <button onClick={openCreate} className="btn-primary text-sm">+ Nuevo usuario</button>
      </div>

      {toast.msg && (
        <div className={`fixed bottom-6 right-6 z-50 text-white text-sm font-medium px-4 py-3 rounded-lg shadow-lg ${toast.type === 'err' ? 'bg-red-600' : 'bg-green-600'}`}>
          {toast.msg}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400 py-8 text-center">Cargando…</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-left border-b border-gray-100 text-xs">
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Teléfono</th>
                <th className="px-4 py-3 font-medium">Rol</th>
                <th className="px-4 py-3 font-medium">Contraseña</th>
                <th className="px-4 py-3 font-medium">Creado</th>
                <th className="px-4 py-3 font-medium">Actualizado</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-800">
                    <div>{u.name ?? '—'}</div>
                    {u.role === 'BROKER' && u.companyName && (
                      <div className="text-xs text-gray-400">{u.companyName}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{u.email}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{u.phone ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${ROLE_COLORS[u.role] ?? 'bg-gray-100 text-gray-600'}`}>
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3"><CopyPassword value={u.plainPassword} /></td>
                  <td className="px-4 py-3 text-xs text-gray-400">{fmt(u.createdAt)}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{fmt(u.updatedAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(u)} className="text-xs text-blue-600 hover:underline">Editar</button>
                      <button onClick={() => openPassword(u)} className="text-xs text-gray-600 hover:underline">Contraseña</button>
                      {u.id !== session?.user?.id && (
                        <>
                          <button onClick={() => handleReset(u)} title="Recuperar contraseña" className="text-gray-400 hover:text-amber-600">
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(u)} className="text-xs text-red-500 hover:underline">Eliminar</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal === 'create' && (
        <Modal title="Nuevo usuario" onClose={() => setModal(null)}>
          <UserForm form={form} setForm={setForm} error={error} showPassword />
          <ModalFooter onCancel={() => setModal(null)} onConfirm={handleCreate} saving={saving} label="Crear" />
        </Modal>
      )}

      {modal === 'edit' && selected && (
        <Modal title={`Editar: ${selected.email}`} onClose={() => setModal(null)}>
          <UserForm form={form} setForm={setForm} error={error} showPassword={false} />
          <ModalFooter onCancel={() => setModal(null)} onConfirm={handleEdit} saving={saving} label="Guardar" />
        </Modal>
      )}

      {modal === 'password' && selected && (
        <Modal title={`Cambiar contraseña: ${selected.email}`} onClose={() => setModal(null)}>
          <div className="space-y-3">
            <PwInput label="Nueva contraseña"    value={pwForm.password} onChange={v => setPwForm(p => ({ ...p, password: v }))} show={showPw}        onToggle={() => setShowPw(v => !v)} />
            <PwInput label="Confirmar contraseña" value={pwForm.confirm}  onChange={v => setPwForm(p => ({ ...p, confirm: v }))}  show={showPwConfirm} onToggle={() => setShowPwConfirm(v => !v)} />
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
          <ModalFooter onCancel={() => setModal(null)} onConfirm={handlePassword} saving={saving} label="Cambiar contraseña" />
        </Modal>
      )}
    </div>
  )
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function PwInput({ label, value, onChange, show, onToggle }: {
  label: string; value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <div className="relative">
        <input type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)} className="input-field text-sm w-full pr-9" />
        <button type="button" onClick={onToggle} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}

function UserForm({ form, setForm, error, showPassword }: {
  form: typeof emptyForm; setForm: (f: typeof emptyForm) => void; error: string; showPassword: boolean
}) {
  const [showPwd, setShowPwd] = useState(false)
  const isBroker = form.role === 'BROKER'

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Nombre</label>
          <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-field text-sm w-full" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Teléfono</label>
          <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+56 9 XXXX XXXX" className="input-field text-sm w-full" />
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Email *</label>
        <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input-field text-sm w-full" />
      </div>
      {showPassword && (
        <div>
          <label className="block text-xs text-gray-500 mb-1">Contraseña *</label>
          <div className="relative">
            <input type={showPwd ? 'text' : 'password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="input-field text-sm w-full pr-9" />
            <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Rol</label>
        <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as AnyRole, brokerType: 'PARTICULAR', companyName: '' })} className="input-field text-sm w-full">
          <optgroup label="Equipo interno">
            <option value="ADMIN">Admin</option>
            <option value="EDITOR">Editor</option>
            <option value="SUPERADMIN">Superadmin</option>
          </optgroup>
          <optgroup label="Plataforma usados">
            <option value="PROPIETARIO">Propietario</option>
            <option value="BROKER">Broker</option>
          </optgroup>
        </select>
      </div>

      {isBroker && (
        <>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Tipo de broker</label>
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg w-fit">
              {(['PARTICULAR', 'EMPRESA'] as BrokerType[]).map(t => (
                <button key={t} type="button" onClick={() => setForm({ ...form, brokerType: t, companyName: '' })}
                  className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${form.brokerType === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  {t === 'PARTICULAR' ? 'Particular' : 'Empresa'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              {form.brokerType === 'EMPRESA' ? 'Nombre de la empresa *' : 'Nombre del broker *'}
            </label>
            <input type="text" value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })}
              placeholder={form.brokerType === 'EMPRESA' ? 'Ej: Inmobiliaria XYZ Ltda.' : 'Ej: Juan Pérez'}
              className="input-field text-sm w-full" />
          </div>
        </>
      )}

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
