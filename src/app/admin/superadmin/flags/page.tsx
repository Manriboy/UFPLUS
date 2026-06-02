'use client'
// src/app/admin/superadmin/flags/page.tsx
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { NAV_CONFIG, ALL_NAV_KEYS } from '@/lib/admin-nav'
import { Save, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function FlagsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [flags, setFlags] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Redirect if not SUPERADMIN
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role !== 'SUPERADMIN') {
      router.replace('/admin')
    }
  }, [session, status, router])

  // Load flags
  useEffect(() => {
    fetch('/api/admin/superadmin/flags')
      .then(r => r.json())
      .then(({ flags: loaded }: { flags: Record<string, boolean> }) => {
        // Default: all enabled if key not present
        const initial: Record<string, boolean> = {}
        for (const key of ALL_NAV_KEYS) {
          initial[key] = loaded[key] !== false
        }
        setFlags(initial)
      })
      .finally(() => setLoading(false))
  }, [])

  const toggle = (key: string, checked: boolean) => {
    setFlags(prev => {
      const next = { ...prev, [key]: checked }
      // If disabling a parent, also disable all its children
      const item = NAV_CONFIG.find(i => i.key === key)
      if (item?.children && !checked) {
        for (const child of item.children) next[child.key] = false
      }
      // If enabling a child, also enable its parent
      if (checked) {
        const parent = NAV_CONFIG.find(i => i.children?.some(c => c.key === key))
        if (parent) next[parent.key] = true
      }
      return next
    })
    setSaved(false)
  }

  const save = async () => {
    setSaving(true)
    try {
      await fetch('/api/admin/superadmin/flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flags }),
      })
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-gray-400">
        Cargando...
      </div>
    )
  }

  if (session?.user?.role !== 'SUPERADMIN') return null

  return (
    <div className="max-w-xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-brand-primary" />
            <h1 className="text-xl font-bold text-gray-900">Flags de Admin</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Activa o desactiva secciones del panel. Los cambios aplican a todos los usuarios.
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className={cn(
            'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
            saved
              ? 'bg-green-600 text-white'
              : 'bg-brand-primary text-white hover:opacity-90',
            saving && 'opacity-60 cursor-not-allowed'
          )}
        >
          <Save className="h-4 w-4" />
          {saving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar'}
        </button>
      </div>

      {/* Flags list */}
      <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
        {NAV_CONFIG.map(item => (
          <div key={item.key}>
            {/* Parent row */}
            <label className="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="checkbox"
                checked={flags[item.key] !== false}
                onChange={e => toggle(item.key, e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-brand-primary accent-brand-primary cursor-pointer"
              />
              <span className="text-sm font-semibold text-gray-800">{item.label}</span>
              {item.children && (
                <span className="text-xs text-gray-400 ml-auto">
                  {item.children.filter(c => flags[c.key] !== false).length}/{item.children.length} sub-vistas
                </span>
              )}
            </label>

            {/* Children rows */}
            {item.children?.map(child => (
              <label
                key={child.key}
                className="flex items-center gap-3 pl-12 pr-5 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors border-t border-gray-50"
              >
                <input
                  type="checkbox"
                  checked={flags[child.key] !== false}
                  onChange={e => toggle(child.key, e.target.checked)}
                  disabled={flags[item.key] === false}
                  className="h-3.5 w-3.5 rounded border-gray-300 text-brand-primary accent-brand-primary cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                />
                <span className={cn(
                  'text-xs text-gray-600',
                  flags[item.key] === false && 'opacity-40'
                )}>
                  {child.label}
                </span>
              </label>
            ))}
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400">
        * La sección Superadmin siempre es visible para usuarios con rol SUPERADMIN.
      </p>
    </div>
  )
}
