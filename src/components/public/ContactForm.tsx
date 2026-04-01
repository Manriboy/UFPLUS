'use client'
// src/components/public/ContactForm.tsx
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, Loader2, Send } from 'lucide-react'
import { leadSchema, LeadFormData } from '@/lib/validations'
import { cn } from '@/lib/utils'

interface ContactFormProps {
  projectId?: string
  projectName?: string
  title?: string
  subtitle?: string
  dark?: boolean
}

const INCOME_OPTIONS = [
  'Menos de $1.400.000',
  'Entre $1.400.000 y $1.800.000',
  'Entre $1.800.000 y $2.500.000',
  'Entre $2.500.000 y $3.000.000',
  'Más de $3.000.000',
]

export default function ContactForm({
  projectId,
  projectName,
  title = 'Solicita tu asesoría gratuita',
  subtitle = 'Completa el formulario y un asesor te contactará en menos de 24 horas.',
  dark = false,
}: ContactFormProps) {
  const [isSuccess, setIsSuccess] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: { projectId },
  })

  const onSubmit = async (data: LeadFormData) => {
    setServerError(null)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Error al enviar')
      setIsSuccess(true)
      reset()
    } catch (err: any) {
      setServerError(err.message || 'Error al enviar el formulario.')
    }
  }

  const inputClass = cn(
    'input-field text-sm',
    dark ? 'bg-white/10 border-white/20 text-white placeholder-white/50 focus:ring-white' : ''
  )
  const labelClass = cn(
    'block text-sm font-medium mb-1.5',
    dark ? 'text-white/80' : 'text-brand-secondary'
  )
  const errorClass = 'text-xs text-red-500 mt-1'

  if (isSuccess) {
    return (
      <div className={cn('text-center py-12 px-6', dark ? 'text-white' : 'text-brand-text')}>
        <CheckCircle2 className={cn('w-16 h-16 mx-auto mb-4', dark ? 'text-green-300' : 'text-green-500')} />
        <h3 className="font-display text-2xl font-bold mb-2">¡Mensaje enviado!</h3>
        <p className={cn('text-sm', dark ? 'text-white/70' : 'text-brand-secondary')}>
          Gracias por contactarnos. Un asesor te escribirá pronto.
        </p>
        <button
          onClick={() => setIsSuccess(false)}
          className={cn(
            'mt-6 text-sm underline',
            dark ? 'text-white/70 hover:text-white' : 'text-brand-primary hover:text-brand-primary-dark'
          )}
        >
          Enviar otro mensaje
        </button>
      </div>
    )
  }

  return (
    <div>
      {(title || subtitle) && (
        <div className="mb-6">
          {title && (
            <h3 className={cn('font-display text-2xl font-bold mb-2', dark ? 'text-white' : 'text-brand-text')}>
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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <input type="hidden" {...register('projectId')} />

        {/* Nombre */}
        <div>
          <label className={labelClass}>Nombre completo *</label>
          <input
            {...register('name')}
            placeholder="Ej: María González"
            className={cn(inputClass, errors.name && 'input-error')}
          />
          {errors.name && <p className={errorClass}>{errors.name.message}</p>}
        </div>

        {/* Email + Teléfono */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Email *</label>
            <input
              {...register('email')}
              type="email"
              placeholder="tu@email.com"
              className={cn(inputClass, errors.email && 'input-error')}
            />
            {errors.email && <p className={errorClass}>{errors.email.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Teléfono</label>
            <input
              {...register('phone')}
              type="tel"
              placeholder="+56 9 1234 5678"
              className={cn(inputClass, errors.phone && 'input-error')}
            />
            {errors.phone && <p className={errorClass}>{errors.phone.message}</p>}
          </div>
        </div>

        {/* Selector de ingresos */}
        <div>
          <label className={labelClass}>¿Cuánto ganas mensualmente? *</label>
          <select
            {...register('message')}
            className={cn(
              inputClass,
              'cursor-pointer',
              errors.message && 'input-error'
            )}
            defaultValue=""
          >
            <option value="" disabled>
              Seleccionar rango...
            </option>
            {INCOME_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {errors.message && <p className={errorClass}>{errors.message.message}</p>}
        </div>

        {/* Dicom último año */}
        <div>
          <label className={labelClass}>¿Has estado en Dicom en el último año? *</label>
          <select
            {...register('dicomLastYear')}
            className={cn(
              inputClass,
              'cursor-pointer',
              errors.dicomLastYear && 'input-error'
            )}
            defaultValue=""
          >
            <option value="" disabled>
              Seleccionar opción...
            </option>
            <option value="Sí">Sí</option>
            <option value="No">No</option>
          </select>
          {errors.dicomLastYear && (
            <p className={errorClass}>{errors.dicomLastYear.message}</p>
          )}
        </div>

        {projectName && (
          <div
            className={cn(
              'text-xs px-3 py-2',
              dark ? 'bg-white/10 text-white/70' : 'bg-brand-surface text-brand-secondary'
            )}
          >
            Consultando por: <strong>{projectName}</strong>
          </div>
        )}

        {serverError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm">
            {serverError}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            'w-full btn-primary py-3.5 text-sm',
            isSubmitting && 'opacity-70 cursor-not-allowed'
          )}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Enviando...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" /> Solicitar asesoría gratuita
            </>
          )}
        </button>

        <p className={cn('text-xs text-center', dark ? 'text-white/50' : 'text-gray-400')}>
          Al enviar, aceptas nuestra política de privacidad. Sin spam.
        </p>
      </form>
    </div>
  )
}