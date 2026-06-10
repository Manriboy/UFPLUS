'use client'
// src/components/public/StatsSection.tsx
import { useEffect, useState, useRef } from 'react'

const STATS = [
  { target: 150, label: 'Proyectos analizados' },
  { target: 40,  label: 'Inmobiliarias' },
  { target: 30,  label: 'Comunas en todo el país' },
  { target: 100, label: 'Clientes satisfechos' },
]

const DURATION = 10000

function CountUp({ target, active }: { target: number; active: boolean }) {
  const [count, setCount] = useState(0)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)

  useEffect(() => {
    if (!active) return
    startRef.current = null

    const animate = (ts: number) => {
      if (!startRef.current) startRef.current = ts
      const elapsed = ts - startRef.current
      const p = Math.min(elapsed / DURATION, 1)
      const eased = 1 - Math.pow(1 - p, 3) // easeOutCubic
      setCount(Math.round(eased * target))
      if (p < 1) rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [active, target])

  return <span>+{count}</span>
}

export default function StatsSection() {
  const [active, setActive] = useState(false)
  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true)
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={sectionRef}
      className="grid grid-cols-1 sm:grid-cols-4 gap-8 border-t border-white/10 pt-10"
    >
      {STATS.map(stat => (
        <div key={stat.label}>
          <p className="font-sans text-3xl sm:text-4xl font-bold text-white mb-1">
            <CountUp target={stat.target} active={active} />
          </p>
          <p className="text-gray-400 text-sm">{stat.label}</p>
        </div>
      ))}
    </div>
  )
}
