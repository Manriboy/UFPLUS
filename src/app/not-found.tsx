// src/app/not-found.tsx
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-surface">
      <div className="text-center px-4">
        <h1 className="font-display text-8xl font-bold text-brand-primary mb-4">404</h1>
        <h2 className="font-display text-2xl font-semibold text-brand-text mb-3">
          Página no encontrada
        </h2>
        <p className="text-brand-secondary mb-8 max-w-md">
          La página que buscas no existe o fue movida. Vuelve al inicio para continuar explorando.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-brand-primary text-white font-medium hover:bg-brand-primary-dark transition-colors"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
