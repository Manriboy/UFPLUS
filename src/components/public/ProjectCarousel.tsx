'use client'
// src/components/public/ProjectCarousel.tsx
import { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CarouselImage {
  url: string
  alt: string
}

interface Props {
  images: CarouselImage[]
  projectName: string
}

export default function ProjectCarousel({ images, projectName }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0)

  if (images.length === 0) return null

  const prev = () => setCurrentIndex(i => (i - 1 + images.length) % images.length)
  const next = () => setCurrentIndex(i => (i + 1) % images.length)

  return (
    <div className="space-y-4">
      {/* Main viewer */}
      <div className="relative h-72 sm:h-96 overflow-hidden bg-gray-100 group">
        <Image
          src={images[currentIndex].url}
          alt={images[currentIndex].alt || projectName}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 66vw"
          priority={currentIndex === 0}
        />

        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              aria-label="Imagen anterior"
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors opacity-0 group-hover:opacity-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={next}
              aria-label="Imagen siguiente"
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors opacity-0 group-hover:opacity-100"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2.5 py-1 rounded-full">
              {currentIndex + 1} / {images.length}
            </div>
          </>
        )}
      </div>

      {/* Gallery thumbnails — all images */}
      {images.length > 1 && (
        <div>
          <h2 className="font-display text-xl font-semibold text-brand-text mb-4">Galería</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {images.map((img, i) => (
              <button
                key={img.url + i}
                onClick={() => setCurrentIndex(i)}
                className={cn(
                  'relative h-20 sm:h-24 overflow-hidden bg-gray-100 transition-all',
                  i === currentIndex
                    ? 'ring-2 ring-brand-primary opacity-100'
                    : 'opacity-60 hover:opacity-90'
                )}
              >
                <Image
                  src={img.url}
                  alt={img.alt || `${projectName} - imagen ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 33vw, 20vw"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
