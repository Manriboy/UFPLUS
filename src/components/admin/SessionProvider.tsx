'use client'
// src/components/admin/SessionProvider.tsx
import { SessionProvider as NextSessionProvider } from 'next-auth/react'
import { ToastProvider } from '@/components/ui/Toast'

interface Props {
  children: React.ReactNode
  session: any
}

export default function SessionProvider({ children, session }: Props) {
  return (
    <NextSessionProvider session={session}>
      {children}
      <ToastProvider />
    </NextSessionProvider>
  )
}
