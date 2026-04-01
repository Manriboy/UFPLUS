// src/lib/validations.ts
import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

export const typologySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'El nombre es requerido'),
  usefulArea: z.coerce.number().min(0).optional().nullable(),
  totalArea: z.coerce.number().min(0).optional().nullable(),
  priceFrom: z.coerce.number().min(0).optional().nullable(),
  observations: z.string().optional().nullable(),
  sortOrder: z.coerce.number().default(0),
})

export const amenitySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'El nombre es requerido'),
  icon: z.string().optional().nullable(),
})

export const financingSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional().nullable(),
})

export const projectSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  slug: z
    .string()
    .min(1, 'El slug es requerido')
    .regex(/^[a-z0-9-]+$/, 'Slug inválido: solo letras minúsculas, números y guiones'),
  internalCode: z.string().optional().nullable(),
  isActive: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  isArchived: z.boolean().default(false),
  sortOrder: z.coerce.number().default(0),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  deliveryType: z.enum(['IMMEDIATE', 'SOON', 'FUTURE', 'IN_CONSTRUCTION']),
  priceFrom: z.coerce.number().min(0).optional().nullable(),
  currency: z.string().default('UF'),
  shortDescription: z.string().optional().nullable(),
  longDescription: z.string().optional().nullable(),
  ctaText: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  commune: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
  metaTitle: z.string().optional().nullable(),
  metaDescription: z.string().optional().nullable(),
  videoUrl: z.string().url('URL inválida').optional().nullable().or(z.literal('')),
  videoType: z.enum(['YOUTUBE', 'VIMEO', 'OTHER']).optional().nullable(),
  typologies: z.array(typologySchema).default([]),
  amenities: z.array(amenitySchema).default([]),
  financingOptions: z.array(financingSchema).default([]),
})

export type ProjectFormData = z.infer<typeof projectSchema>

export const leadSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z
    .string()
    .optional()
    .nullable()
    .refine(
      (val) => !val || /^[+\d\s-]{8,}$/.test(val),
      'Teléfono inválido'
    ),
  message: z
    .string()
    .min(1, 'Debes seleccionar un rango de ingresos'),
  dicomLastYear: z.enum(['Sí', 'No'], {
    errorMap: () => ({ message: 'Debes seleccionar una opción' }),
  }),
  projectId: z.string().optional().nullable(),
})

export type LeadFormData = z.infer<typeof leadSchema>