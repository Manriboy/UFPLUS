// src/components/public/Footer.tsx
import Link from 'next/link'
import { Phone, Mail, MapPin, Instagram, Linkedin, Facebook } from 'lucide-react'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-[#1A1A1A] text-white">
      {/* Main footer */}
      <div className="container-section py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-1 mb-4">
              <span className="font-display text-2xl font-bold text-brand-primary">UF</span>
              <span className="font-display text-2xl font-bold text-white">Plus</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Tu socio estratégico en inversiones inmobiliarias. Maximizamos tu patrimonio con departamentos de alta plusvalía en Chile.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://instagram.com/ufplus"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-white/10 hover:bg-brand-primary transition-colors duration-200"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://linkedin.com/company/ufplus"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-white/10 hover:bg-brand-primary transition-colors duration-200"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-4 h-4" />
              </a>
              <a
                href="https://facebook.com/ufplus"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-white/10 hover:bg-brand-primary transition-colors duration-200"
                aria-label="Facebook"
              >
                <Facebook className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="font-semibold text-white mb-4 text-sm tracking-wider uppercase">
              Navegación
            </h4>
            <ul className="space-y-3">
              {[
                { href: '/', label: 'Inicio' },
                { href: '/proyectos', label: 'Proyectos' },
                { href: '/#servicios', label: 'Servicios' },
                { href: '/#nosotros', label: 'Nosotros' },
                { href: '/#contacto', label: 'Contacto' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-white text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Projects */}
          <div>
            <h4 className="font-semibold text-white mb-4 text-sm tracking-wider uppercase">
              Proyectos
            </h4>
            <ul className="space-y-3">
              {[
                { href: '/proyectos?deliveryType=IMMEDIATE', label: 'Entrega inmediata' },
                { href: '/proyectos?deliveryType=SOON', label: 'Pronta entrega' },
                { href: '/proyectos?deliveryType=FUTURE', label: 'Entrega futura' },
                { href: '/proyectos', label: 'Ver todos' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-white text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-white mb-4 text-sm tracking-wider uppercase">
              Contacto
            </h4>
            <ul className="space-y-4">
              <li>
                <a
                  href="tel:+56912345678"
                  className="flex items-start gap-3 text-gray-400 hover:text-white text-sm transition-colors"
                >
                  <Phone className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>+56 9 2823 2649</span>
                </a>
              </li>
              <li>
                <a
                  href="mailto:contacto@ufplus.cl"
                  className="flex items-start gap-3 text-gray-400 hover:text-white text-sm transition-colors"
                >
                  <Mail className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>jose@ufplus.cl</span>
                </a>
              </li>
              <li>
                <div className="flex items-start gap-3 text-gray-400 text-sm">
                  <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>La Capitanía 80, Of. 110<br />Las Condes, Santiago</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="container-section py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-gray-500 text-xs">
            © {currentYear} UFPLUS: Inversión, Plusvalía y Soluciones SpA. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <Link href="/privacidad" className="hover:text-gray-300 transition-colors">
              Política de privacidad
            </Link>
            <Link href="/terminos" className="hover:text-gray-300 transition-colors">
              Términos de uso
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
