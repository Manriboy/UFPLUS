// src/components/ui/Toast.tsx
'use client'
import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
}

let toastCount = 0
let setToastsGlobal: ((updater: (toasts: Toast[]) => Toast[]) => void) | null = null

export function toast(message: string, type: ToastType = 'success') {
  if (setToastsGlobal) {
    const id = `toast-${++toastCount}`
    setToastsGlobal((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToastsGlobal?.((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }
}

export function ToastProvider() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    setToastsGlobal = setToasts
    return () => { setToastsGlobal = null }
  }, [])

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const icons = {
    success: <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />,
    error: <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />,
    info: <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0" />,
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'flex items-center gap-3 px-4 py-3 bg-white rounded-lg shadow-xl border pointer-events-auto',
            'animate-slide-in-right max-w-sm w-full',
            t.type === 'success' && 'border-green-200',
            t.type === 'error' && 'border-red-200',
            t.type === 'info' && 'border-blue-200'
          )}
        >
          {icons[t.type]}
          <p className="text-sm text-brand-secondary flex-1">{t.message}</p>
          <button
            onClick={() => remove(t.id)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
