'use client'
// src/components/public/Header.tsx
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, Phone } from 'lucide-react'
import { cn } from '@/lib/utils'

const navLinks = [
  { href: '/', label: 'Inicio' },
  { href: '/proyectos', label: 'Proyectos' },
  { href: '/#servicios', label: 'Servicios' },
  { href: '/#nosotros', label: 'Nosotros' },
  { href: '/#contacto', label: 'Contacto' },
]

export default function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled
          ? 'bg-white shadow-md py-3'
          : 'bg-white/95 backdrop-blur-sm py-4 border-b border-gray-100'
      )}
    >
      <div className="container-section">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex items-center">
              <span className="font-display text-2xl font-bold text-brand-primary tracking-tight">
                UF
              </span>
              <span className="font-display text-2xl font-bold text-brand-secondary tracking-tight">
                Plus
              </span>
            </div>
            <div className="hidden sm:block w-px h-6 bg-gray-200 mx-1" />
            <span className="hidden sm:block text-xs text-brand-secondary font-medium tracking-wider uppercase">
              Inversiones
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'px-4 py-2 text-sm font-medium transition-colors duration-150',
                  pathname === link.href
                    ? 'text-brand-primary'
                    : 'text-brand-secondary hover:text-brand-primary'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* CTA */}
          <div className="hidden lg:flex items-center gap-3">
            <a
              href="tel:+56912345678"
              className="flex items-center gap-2 text-sm text-brand-secondary hover:text-brand-primary transition-colors"
            >
              <Phone className="w-4 h-4" />
              <span>+56 9 1234 5678</span>
            </a>
            <Link href="/#contacto" className="btn-primary text-sm py-2.5 px-5">
              Asesoría gratuita
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden p-2 text-brand-secondary hover:text-brand-primary transition-colors"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="lg:hidden bg-white border-t border-gray-100 shadow-lg">
          <div className="container-section py-4 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'block px-4 py-3 text-sm font-medium transition-colors border-b border-gray-50',
                  pathname === link.href
                    ? 'text-brand-primary bg-red-50'
                    : 'text-brand-secondary hover:text-brand-primary hover:bg-brand-surface'
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-3">
              <Link href="/#contacto" className="btn-primary w-full text-sm text-center block">
                Solicitar asesoría gratuita
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
