'use client'
// src/components/admin/MobileMenuProvider.tsx
import { createContext, useContext, useState, useCallback } from 'react'

type Ctx = { open: boolean; toggle: () => void; close: () => void }
const MobileMenuCtx = createContext<Ctx>({ open: false, toggle: () => {}, close: () => {} })

export function MobileMenuProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const toggle = useCallback(() => setOpen(v => !v), [])
  const close  = useCallback(() => setOpen(false), [])
  return <MobileMenuCtx.Provider value={{ open, toggle, close }}>{children}</MobileMenuCtx.Provider>
}

export const useMobileMenu = () => useContext(MobileMenuCtx)
