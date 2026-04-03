// src/app/(public)/page.tsx
import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import prisma from '@/lib/prisma'
import ProjectCard from '@/components/public/ProjectCard'
import ContactForm from '@/components/public/ContactForm'
import {
  TrendingUp,
  Shield,
  Users,
  Banknote,
  Search,
  Star,
  ArrowRight,
  CheckCircle,
  Building2,
  Quote,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'UFPLUS | Tu socio de inversiones inmobiliarias en Chile',
  description:
    'Maximiza tu patrimonio con departamentos de inversión seleccionados por expertos. Asesoría personalizada, proyectos de alta plusvalía en Chile.',
}

async function getFeaturedProjects() {
  return prisma.project.findMany({
    where: { isActive: true, isArchived: false, isFeatured: true },
    select: {
      id: true,
      name: true,
      slug: true,
      commune: true,
      city: true,
      priceFrom: true,
      currency: true,
      deliveryType: true,
      shortDescription: true,
      isFeatured: true,
      isActive: true,
      images: { where: { isMain: true }, take: 1, select: { url: true, alt: true } },
      typologies: { select: { name: true }, orderBy: { sortOrder: 'asc' } },
    },
    orderBy: [{ sortOrder: 'asc' }],
    take: 6,
  })
}

async function getAllActiveProjects() {
  return prisma.project.findMany({
    where: { isActive: true, isArchived: false },
    select: { id: true, name: true, slug: true },
  })
}

const benefits = [
  {
    icon: TrendingUp,
    title: 'Alta plusvalía',
    description:
      'Seleccionamos proyectos en zonas con mayor proyección de crecimiento del mercado inmobiliario.',
  },
  {
    icon: Shield,
    title: 'Inversión segura',
    description:
      'Trabajamos solo con desarrolladoras con sólida trayectoria y proyectos con promesa y escritura real.',
  },
  {
    icon: Banknote,
    title: 'Rentabilidad real',
    description:
      'Te mostramos la proyección de renta, plusvalía y retorno neto de cada oportunidad.',
  },
  {
    icon: Users,
    title: 'Acompañamiento experto',
    description:
      'Desde la evaluación hasta la escritura, te acompañamos en cada etapa del proceso.',
  },
  {
    icon: Search,
    title: 'Selección rigurosa',
    description:
      'Analizamos decenas de proyectos para presentarte solo las mejores oportunidades.',
  },
  {
    icon: Building2,
    title: 'Apoyo en financiamiento',
    description:
      'Te orientamos en el mejor esquema de financiamiento según tu perfil y capital disponible.',
  },
]

const services = [
  {
    number: '01',
    title: 'Asesoría de inversión',
    description:
      'Analizamos tu perfil, objetivos y capital para identificar la oportunidad ideal para ti.',
  },
  {
    number: '02',
    title: 'Evaluación de proyectos',
    description:
      'Revisamos ubicación, constructora, precio, renta estimada y plusvalía proyectada.',
  },
  {
    number: '03',
    title: 'Apoyo en financiamiento',
    description:
      'Te orientamos con bancos, subsidios, y estructuras de pie para optimizar tu inversión.',
  },
  {
    number: '04',
    title: 'Acompañamiento total',
    description:
      'Coordinamos promesa, escritura y entrega. Estamos contigo hasta que llaves en mano.',
  },
]

const testimonials = [
  {
    name: 'María José Rodríguez',
    role: 'Inversionista primera vez',
    text: 'Gracias a UFPlus compré mi primer departamento de inversión con total tranquilidad. El proceso fue claro, simple y el equipo siempre estuvo disponible.',
    rating: 5,
  },
  {
    name: 'Carlos Méndez',
    role: 'Empresario',
    text: 'Llevo 3 departamentos con UFPlus. La asesoría es de otro nivel: me presentan proyectos que yo no habría encontrado solo, con análisis de rentabilidad reales.',
    rating: 5,
  },
  {
    name: 'Ana Paula Flores',
    role: 'Profesional independiente',
    text: 'Tenía muchas dudas sobre cómo invertir. El equipo me explicó todo con paciencia y encontramos el proyecto perfecto para mi presupuesto y objetivos.',
    rating: 5,
  },
]

export default async function HomePage() {
  const [featuredProjects] = await Promise.all([getFeaturedProjects(), getAllActiveProjects()])

  return (
    <>
      {/* ─── HERO ──────────────────────────────────────────── */}
      <section className="relative min-h-[720px] flex items-center overflow-hidden bg-[#0D0D0D]">
        {/* Background image */}
        <div className="absolute inset-0">
          <Image
            src="/images/santiago-hero.jpg"
            alt="Skyline de Santiago de Chile"
            fill
            className="object-cover opacity-30"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/20" />
        </div>

        {/* Red accent line */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-primary" />

        <div className="container-section relative z-10 pt-28 pb-20">
          <div className="max-w-3xl">
            {/* Eyebrow */}
            <div className="flex items-center gap-3 mb-6 animate-fade-in">
              <div className="w-8 h-px bg-white/50" />
              <span className="text-white text-sm font-medium tracking-widest uppercase">
                Tu socio en Inversiones Inmobiliarias
              </span>
            </div>

            {/* Heading */}
            <h1 className="font-sans text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.05] mb-6 animate-slide-up">
              Maximiza tu patrimonio con
              <span className="block text-brand-primary">inversión inmobiliaria</span>
              inteligente
            </h1>

            <p className="text-gray-300 text-lg sm:text-xl leading-relaxed mb-10 max-w-xl animate-slide-up animate-delay-200">
              En UFPLUS, somos expertos en identificar departamentos que se arrienden siempre.
              Gracias a una gran cantidad de proyectos en cartera, nos preocupamos por ofrecerte
              sólo aquellos proyectos en los que nosotros mismos también invertiríamos.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 animate-slide-up animate-delay-300">
              <Link href="/#contacto" className="btn-primary text-base py-4 px-8">
                Solicitar asesoría gratuita
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/proyectos"
                className="inline-flex items-center gap-2 px-8 py-4 border border-white/30 text-white font-medium hover:bg-white/10 hover:border-white transition-all duration-200"
              >
                Ver proyectos
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── STATS ─────────────────────────────────────────── */}
      <section className="bg-[#0D0D0D] py-10">
        <div className="container-section">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-8 border-t border-white/10 pt-10">
            {[
              { value: '+100', label: 'Proyectos analizados' },
              { value: '+15', label: 'Inmobiliarias' },
              { value: '+30', label: 'Comunas en todo el país' },
              { value: '+150', label: 'Clientes satisfechos' },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="font-sans text-3xl sm:text-4xl font-bold text-white mb-1">
                  {stat.value}
                </p>
                <p className="text-gray-400 text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── BENEFITS ──────────────────────────────────────── */}
      <section className="py-24 bg-white" id="nosotros">
        <div className="container-section">
          <div className="max-w-2xl mb-16">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-px bg-brand-primary" />
              <span className="text-brand-primary text-sm font-medium tracking-widest uppercase">
                Por qué elegirnos
              </span>
            </div>
            <h2 className="section-heading mb-4">
              La forma más inteligente de invertir en bienes raíces
            </h2>
            <p className="section-subheading">
              No vendemos departamentos. Te ayudamos a construir patrimonio con decisiones de
              inversión bien fundamentadas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, i) => {
              const Icon = benefit.icon
              return (
                <div key={i} className="group">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-red-50 flex items-center justify-center group-hover:bg-brand-primary transition-colors duration-300">
                      <Icon className="w-6 h-6 text-brand-primary group-hover:text-white transition-colors duration-300" />
                    </div>
                    <div>
                      <h3 className="font-sans text-lg font-semibold text-brand-text mb-2">
                        {benefit.title}
                      </h3>
                      <p className="text-brand-secondary text-sm leading-relaxed">
                        {benefit.description}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ─── FEATURED PROJECTS ─────────────────────────────── */}
      {featuredProjects.length > 0 && (
        <section className="py-24 bg-brand-surface">
          <div className="container-section">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
              <div className="max-w-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-px bg-brand-primary" />
                  <span className="text-brand-primary text-sm font-medium tracking-widest uppercase">
                    Oportunidades seleccionadas
                  </span>
                </div>
                <h2 className="section-heading">Proyectos destacados</h2>
              </div>
              <Link
                href="/proyectos"
                className="flex items-center gap-2 text-brand-primary font-medium hover:gap-3 transition-all text-sm whitespace-nowrap"
              >
                Ver todos los proyectos <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProjects.map((project) => (
                <ProjectCard key={project.id} project={project as any} featured />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── SERVICES ──────────────────────────────────────── */}
      <section className="py-24 bg-white" id="servicios">
        <div className="container-section">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-px bg-brand-primary" />
                <span className="text-brand-primary text-sm font-medium tracking-widest uppercase">
                  Nuestros servicios
                </span>
              </div>
              <h2 className="section-heading mb-4">
                Cómo te acompañamos en tu inversión
              </h2>
              <p className="section-subheading mb-8">
                Desde la primera consulta hasta la entrega del departamento, estamos contigo en
                cada paso del camino.
              </p>
              <Link href="/#contacto" className="btn-primary">
                Comienza ahora <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="space-y-6">
              {services.map((service, i) => (
                <div
                  key={i}
                  className="flex gap-6 p-6 bg-brand-surface hover:bg-red-50 transition-colors duration-200 group"
                >
                  <div className="flex-shrink-0">
                    <span className="font-sans text-4xl font-bold text-gray-200 group-hover:text-brand-primary/20 transition-colors leading-none">
                      {service.number}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-sans text-lg font-semibold text-brand-text mb-1">
                      {service.title}
                    </h3>
                    <p className="text-brand-secondary text-sm leading-relaxed">
                      {service.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── PROCESS BANNER ─────────────────────────────────── */}
      <section className="py-16 bg-brand-primary">
        <div className="container-section">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 text-white">
            <div className="max-w-xl">
              <h2 className="font-sans text-3xl font-bold mb-2">
                ¿Listo para hacer crecer tu patrimonio?
              </h2>
              <p className="text-white/80">
                Agenda una reunión sin costo y te mostramos las mejores oportunidades según tu
                perfil.
              </p>
            </div>
            <div className="flex gap-4">
              <Link
                href="/#contacto"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-brand-primary font-semibold hover:bg-gray-50 transition-colors"
              >
                Agendar asesoría <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ───────────────────────────────────── */}
      <section className="py-24 bg-[#1A1A1A]">
        <div className="container-section">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-8 h-px bg-white/40" />
              <span className="text-white text-sm font-medium tracking-widest uppercase">
                Testimonios
              </span>
              <div className="w-8 h-px bg-white/40" />
            </div>
            <h2 className="font-sans text-4xl font-bold text-white mb-3">
              Lo que dicen nuestros clientes
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, i) => (
              <div
                key={i}
                className="bg-white/5 p-8 border border-white/10 hover:border-brand-primary/30 transition-colors"
              >
                <Quote className="w-8 h-8 text-brand-primary/40 mb-4" />
                <p className="text-gray-300 text-sm leading-relaxed mb-6 italic">
                  &quot;{testimonial.text}&quot;
                </p>
                <div className="flex items-center gap-1 mb-3">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-amber-400 fill-current" />
                  ))}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{testimonial.name}</p>
                  <p className="text-gray-500 text-xs">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CONTACT FORM ────────────────────────────────────── */}
      <section className="py-24 bg-white" id="contacto">
        <div className="container-section">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* Left */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-px bg-brand-primary" />
                <span className="text-brand-primary text-sm font-medium tracking-widest uppercase">
                  Contacto
                </span>
              </div>
              <h2 className="section-heading mb-4">Agenda tu asesoría gratuita</h2>
              <p className="section-subheading mb-8">
                Cuéntanos tu situación y objetivos. Un asesor especializado te contactará en menos
                de 24 horas para orientarte sin compromiso.
              </p>

              <div className="space-y-4">
                {[
                  'Sin costo ni compromiso',
                  'Análisis personalizado de tu perfil',
                  'Proyectos curados según tus objetivos',
                  'Acompañamiento en todo el proceso',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-brand-primary shrink-0" />
                    <span className="text-brand-secondary">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right */}
            <div className="bg-brand-surface p-8 lg:p-10">
              <ContactForm
                title="Solicita tu asesoría"
                subtitle="Te contactamos en menos de 24 horas."
              />
            </div>
          </div>
        </div>
      </section>
    </>
  )
}