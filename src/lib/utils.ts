// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export function formatPrice(price: number, currency = 'UF'): string {
  if (currency === 'UF') {
    return `${price.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} UF`
  }
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(price)
}

export function formatArea(area: number): string {
  return `${area.toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} m²`
}

export const DELIVERY_TYPE_LABELS: Record<string, string> = {
  IMMEDIATE: 'Entrega inmediata',
  SOON: 'Pronta entrega',
  FUTURE: 'Entrega futura',
  IN_CONSTRUCTION: 'En construcción',
}

export const DELIVERY_TYPE_COLORS: Record<string, string> = {
  IMMEDIATE: 'bg-green-100 text-green-800',
  SOON: 'bg-blue-100 text-blue-800',
  FUTURE: 'bg-amber-100 text-amber-800',
  IN_CONSTRUCTION: 'bg-orange-100 text-orange-800',
}

export const LEAD_STATUS_LABELS: Record<string, string> = {
  NEW: 'Nuevo',
  CONTACTED: 'Contactado',
  QUALIFIED: 'Calificado',
  CLOSED: 'Cerrado',
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return text.slice(0, length).trimEnd() + '…'
}

export function getYoutubeEmbedUrl(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?]+)/,
    /youtube\.com\/embed\/([^?]+)/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return `https://www.youtube.com/embed/${match[1]}`
  }
  return null
}

export function getVimeoEmbedUrl(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/)
  if (match) return `https://player.vimeo.com/video/${match[1]}`
  return null
}

export function getEmbedUrl(url: string, type?: string | null): string | null {
  if (!url) return null
  if (type === 'YOUTUBE' || url.includes('youtube') || url.includes('youtu.be')) {
    return getYoutubeEmbedUrl(url)
  }
  if (type === 'VIMEO' || url.includes('vimeo')) {
    return getVimeoEmbedUrl(url)
  }
  return url
}
