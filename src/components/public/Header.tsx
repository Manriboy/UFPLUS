'use client'
// src/components/public/Header.tsx
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
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
    const hasBanner = !!document.getElementById('promo-banner')
    const handleScroll = () => setIsScrolled(hasBanner || window.scrollY > 20)
    handleScroll()
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // En páginas distintas a la homepage el fondo es blanco, usar siempre estilo oscuro
  const useDarkStyle = isScrolled || pathname !== '/'

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        useDarkStyle
          ? 'bg-white shadow-md py-3'
          : 'bg-transparent py-4'
      )}
    >
      <div className="container-section">
        <div className="flex items-center justify-between">

          {/* Logo — blanco sobre fondo oscuro, color al hacer scroll */}
          <Link href="/" className="flex items-center self-stretch py-1">
            <Image
              src={useDarkStyle ? '/logos/logo-color.png' : '/logos/logo-blanco.png'}
              alt="UFPlus Gestión Inmobiliaria"
              width={240}
              height={80}
              className="h-full w-auto max-h-14 object-contain transition-all duration-300"
              priority
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'px-4 py-2 text-sm font-medium transition-colors duration-150',
                  useDarkStyle
                    ? pathname === link.href
                      ? 'text-brand-primary'
                      : 'text-brand-secondary hover:text-brand-primary'
                    : pathname === link.href
                    ? 'text-white'
                    : 'text-white/80 hover:text-white'
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
              className={cn(
                'flex items-center gap-2 text-sm transition-colors',
                useDarkStyle
                  ? 'text-brand-secondary hover:text-brand-primary'
                  : 'text-white/80 hover:text-white'
              )}
            >
              <Phone className="w-4 h-4" />
              <span>+56 9 2823 2649</span>
            </a>
            <Link href="/#contacto" className="btn-primary text-sm py-2.5 px-5">
              Asesoría gratuita
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              'lg:hidden p-2 transition-colors',
              useDarkStyle
                ? 'text-brand-secondary hover:text-brand-primary'
                : 'text-white hover:text-white/70'
            )}
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
