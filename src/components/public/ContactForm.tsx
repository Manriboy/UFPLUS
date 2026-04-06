'use client'

// src/components/public/ContactForm.tsx
import { useMemo } from 'react'
import Script from 'next/script'
import { cn } from '@/lib/utils'

interface ContactFormProps {
  projectId?: string
  projectName?: string
  title?: string
  subtitle?: string
  dark?: boolean
}

export default function ContactForm({
  projectId,
  projectName,
  title = 'Solicita tu asesoría gratuita',
  subtitle = 'Completa el formulario y un asesor te contactará en menos de 24 horas.',
  dark = false,
}: ContactFormProps) {
  const iframeSrc = useMemo(() => {
    const url = new URL('https://api.leadconnectorhq.com/widget/form/V0xbgHkruHaTCU9K6R6t')

    if (projectName) {
      url.searchParams.set('projectName', projectName)
    }

    if (projectId) {
      url.searchParams.set('projectId', projectId)
    }

    // fuerza recarga fresca del iframe para evitar que vuelva con los últimos valores
    url.searchParams.set('_t', Date.now().toString())

    return url.toString()
  }, [projectId, projectName])

  return (
    <div>
      <Script
        src="https://link.msgsndr.com/js/form_embed.js"
        strategy="afterInteractive"
      />

      {(title || subtitle) && (
        <div className="mb-6">
          {title && (
            <h3
              className={cn(
                'font-display text-2xl font-bold mb-2',
                dark ? 'text-white' : 'text-brand-text'
              )}
            >
              {title}
            </h3>
          )}
          {subtitle && (
            <p className={cn('text-sm', dark ? 'text-white/70' : 'text-brand-secondary')}>
              {subtitle}
            </p>
          )}
        </div>
      )}

      {projectName && (
        <div
          className={cn(
            'text-xs px-3 py-2 mb-4',
            dark ? 'bg-white/10 text-white/70' : 'bg-brand-surface text-brand-secondary'
          )}
        >
          Consultando por: <strong>{projectName}</strong>
        </div>
      )}

      <div
        className={cn(
          'w-full overflow-hidden rounded-[3px]',
          dark ? 'bg-white/5' : 'bg-transparent'
        )}
      >
        <iframe
          key={iframeSrc}
          src={iframeSrc}
          style={{ width: '100%', height: '749px', border: 'none', borderRadius: '3px' }}
          id="inline-V0xbgHkruHaTCU9K6R6t"
          data-layout='{"id":"INLINE"}'
          data-trigger-type="alwaysShow"
          data-trigger-value=""
          data-activation-type="alwaysActivated"
          data-activation-value=""
          data-deactivation-type="neverDeactivate"
          data-deactivation-value=""
          data-form-name="Form 0"
          data-height="749"
          data-layout-iframe-id="inline-V0xbgHkruHaTCU9K6R6t"
          data-form-id="V0xbgHkruHaTCU9K6R6t"
          title="Form 0"
        />
      </div>
    </div>
  )
}