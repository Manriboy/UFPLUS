// src/app/layout.tsx
import type { Metadata } from 'next'
import { DM_Sans } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'UFPlus | Tu socio en inversiones inmobiliarias',
    template: '%s | UFPlus',
  },
  description:
    'UFPlus es tu broker inmobiliario de confianza en Chile. Maximiza tu patrimonio con departamentos de inversión seleccionados por expertos.',
  keywords: ['inversión inmobiliaria', 'departamentos', 'Chile', 'broker inmobiliario', 'plusvalía'],
  openGraph: {
    type: 'website',
    locale: 'es_CL',
    url: 'https://ufplus.cl',
    siteName: 'UFPlus',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={dmSans.variable}>
      <body className="font-sans antialiased bg-white text-brand-text">{children}</body>
    </html>
  )
}