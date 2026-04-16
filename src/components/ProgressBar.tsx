'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export default function ProgressBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const barRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const bar = barRef.current
    if (!bar) return

    // Mostrar barra
    bar.style.width = '0%'
    bar.style.opacity = '1'

    // Animación de progreso ficticio
    let width = 0
    const interval = setInterval(() => {
      width = Math.min(width + Math.random() * 20, 85)
      bar.style.width = `${width}%`
    }, 100)

    // Completar y ocultar
    timerRef.current = setTimeout(() => {
      clearInterval(interval)
      bar.style.width = '100%'
      setTimeout(() => {
        bar.style.opacity = '0'
      }, 200)
    }, 400)

    return () => {
      clearInterval(interval)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [pathname, searchParams])

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none">
      <div
        ref={barRef}
        className="h-full transition-all duration-200 ease-out"
        style={{
          width: '0%',
          opacity: 0,
          backgroundColor: '#941914',
        }}
      />
    </div>
  )
}
