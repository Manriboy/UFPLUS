// prisma/seed.ts
import { PrismaClient, DeliveryType, VideoType } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ─── Admin User ───────────────────────────────────────
  const hashedPassword = await bcrypt.hash('admin123', 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@ufplus.cl' },
    update: {},
    create: {
      email: 'admin@ufplus.cl',
      name: 'Administrador UFPlus',
      password: hashedPassword,
      role: 'ADMIN',
    },
  })
  console.log('✅ Admin user created:', admin.email)

  // ─── Projects ─────────────────────────────────────────
  const projects = [
    {
      name: 'Parque Independencia',
      slug: 'parque-independencia',
      internalCode: 'UFP-001',
      isActive: true,
      isFeatured: true,
      sortOrder: 1,
      status: 'PUBLISHED' as const,
      deliveryType: DeliveryType.SOON,
      priceFrom: 2850,
      currency: 'UF',
      shortDescription:
        'Departamentos de inversión en pleno corazón de Independencia, con excelente conectividad y alta plusvalía proyectada.',
      longDescription: `Parque Independencia es un proyecto residencial de alta calidad ubicado estratégicamente en la comuna de Independencia, una de las zonas con mayor crecimiento y plusvalía de Santiago. 

Con diseño contemporáneo y equipamiento premium, este proyecto ofrece una oportunidad única para inversores que buscan maximizar su retorno a través de arriendo o plusvalía a mediano plazo.

La ubicación privilegiada permite acceso inmediato al metro, hospitales, centros comerciales y las principales vías de Santiago. Ideal para profesionales jóvenes y estudiantes universitarios como mercado objetivo de arriendo.`,
      address: 'Av. Independencia 1850',
      commune: 'Independencia',
      city: 'Santiago',
      region: 'Región Metropolitana',
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      videoType: VideoType.YOUTUBE,
      metaTitle: 'Parque Independencia | Departamentos de Inversión - UFPlus',
      metaDescription:
        'Invierte en Parque Independencia, Independencia. Departamentos desde 2.850 UF con alta plusvalía y excelente rentabilidad.',
      ctaText: 'Solicita información del proyecto',
      typologies: [
        { name: 'Studio', usefulArea: 24.5, totalArea: 27.0, priceFrom: 2850, sortOrder: 1 },
        { name: '1D / 1B', usefulArea: 35.8, totalArea: 39.0, priceFrom: 3250, sortOrder: 2 },
        { name: '2D / 1B', usefulArea: 48.2, totalArea: 52.5, priceFrom: 4100, sortOrder: 3 },
        { name: '2D / 2B', usefulArea: 56.0, totalArea: 61.0, priceFrom: 4600, sortOrder: 4 },
      ],
      amenities: [
        'Piscina',
        'Quincho',
        'Gimnasio',
        'Sala de cowork',
        'Lounge',
        'Bicycle parking',
        'Conserjería 24/7',
      ],
      financing: [
        {
          name: 'Crédito Hipotecario',
          description: 'Financiamiento bancario con hasta 90% de financiamiento',
        },
        {
          name: 'Pie en cuotas',
          description: 'Divide el pie en cuotas mensuales durante la construcción',
        },
        {
          name: 'Apoyo al pie',
          description: 'Bono de contribución al pie de entrada',
        },
      ],
      images: [
        {
          url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&q=80',
          isMain: true,
          sortOrder: 1,
          alt: 'Fachada Parque Independencia',
        },
        {
          url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=80',
          isMain: false,
          sortOrder: 2,
          alt: 'Lobby del edificio',
        },
        {
          url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80',
          isMain: false,
          sortOrder: 3,
          alt: 'Departamento tipo',
        },
        {
          url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=80',
          isMain: false,
          sortOrder: 4,
          alt: 'Área de amenities',
        },
      ],
    },
    {
      name: 'Ñuñoa Central',
      slug: 'nunoa-central',
      internalCode: 'UFP-002',
      isActive: true,
      isFeatured: true,
      sortOrder: 2,
      status: 'PUBLISHED' as const,
      deliveryType: DeliveryType.FUTURE,
      priceFrom: 3200,
      currency: 'UF',
      shortDescription:
        'Inversión en la tradicional comuna de Ñuñoa, barrio consolidado con alta demanda de arriendo y proyección de plusvalía sostenida.',
      longDescription: `Ñuñoa Central es un proyecto de departamentos premium ubicado en una de las comunas más demandadas de Santiago. Su entorno de barrio consolidado, con excelente oferta gastronómica, cultural y deportiva, lo convierte en un imán para profesionales y familias jóvenes.

El proyecto ofrece departamentos de diseño contemporáneo con terminaciones de primera calidad, pensados para maximizar la rentabilidad por arriendo en un mercado de alta demanda.

Proyección de rentabilidad estimada: entre 4.5% y 5.5% anual neto, con plusvalía proyectada superior al 20% en 5 años.`,
      address: 'Av. Irarrázaval 2340',
      commune: 'Ñuñoa',
      city: 'Santiago',
      region: 'Región Metropolitana',
      videoUrl: null,
      videoType: null,
      metaTitle: 'Ñuñoa Central | Departamentos de Inversión - UFPlus',
      metaDescription:
        'Invierte en Ñuñoa Central. Departamentos desde 3.200 UF en la comuna más demandada de Santiago con alta rentabilidad.',
      ctaText: 'Agenda tu asesoría hoy',
      typologies: [
        { name: 'Studio', usefulArea: 28.0, totalArea: 31.0, priceFrom: 3200, sortOrder: 1 },
        { name: '1D / 1B', usefulArea: 40.5, totalArea: 44.0, priceFrom: 3780, sortOrder: 2 },
        { name: '2D / 2B', usefulArea: 62.0, totalArea: 67.0, priceFrom: 5200, sortOrder: 3 },
        {
          name: '3D / 2B',
          usefulArea: 78.5,
          totalArea: 84.0,
          priceFrom: 6500,
          observations: 'Con bodega incluida',
          sortOrder: 4,
        },
      ],
      amenities: [
        'Terraza sky',
        'Sala de reuniones',
        'Gimnasio',
        'Sala de juegos',
        'Piscina temperada',
        'Portería 24/7',
      ],
      financing: [
        {
          name: 'Crédito Hipotecario',
          description: 'Financiamiento con los principales bancos del sistema',
        },
        {
          name: 'Pie en cuotas',
          description: 'Divide el pie en 36 cuotas sin interés',
        },
        {
          name: 'Inversión con renta garantizada',
          description: '6 meses de renta garantizada post entrega',
        },
      ],
      images: [
        {
          url: 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=1200&q=80',
          isMain: true,
          sortOrder: 1,
          alt: 'Fachada Ñuñoa Central',
        },
        {
          url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80',
          isMain: false,
          sortOrder: 2,
          alt: 'Living departamento',
        },
        {
          url: 'https://images.unsplash.com/photo-1556912173-46c336c7fd55?w=1200&q=80',
          isMain: false,
          sortOrder: 3,
          alt: 'Cocina equipada',
        },
        {
          url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&q=80',
          isMain: false,
          sortOrder: 4,
          alt: 'Piscina sky',
        },
      ],
    },
    {
      name: 'Vitacura Park View',
      slug: 'vitacura-park-view',
      internalCode: 'UFP-003',
      isActive: true,
      isFeatured: false,
      sortOrder: 3,
      status: 'PUBLISHED' as const,
      deliveryType: DeliveryType.IMMEDIATE,
      priceFrom: 7500,
      currency: 'UF',
      shortDescription:
        'Departamentos de lujo en Vitacura con vistas al parque, para inversores de alto patrimonio que buscan activos premium.',
      longDescription: `Vitacura Park View es el proyecto más exclusivo del portafolio UFPlus. Ubicado en la exclusiva comuna de Vitacura, frente al parque Bicentenario, este desarrollo ofrece departamentos de lujo con terminaciones de clase mundial.

Orientado a inversores de alto patrimonio que buscan diversificar en activos inmobiliarios premium con alta estabilidad de valor y clientela de arriendo selecta.

Entrega inmediata. Unidades limitadas disponibles.`,
      address: 'Av. Bicentenario 3680',
      commune: 'Vitacura',
      city: 'Santiago',
      region: 'Región Metropolitana',
      videoUrl: 'https://vimeo.com/123456789',
      videoType: VideoType.VIMEO,
      metaTitle: 'Vitacura Park View | Departamentos de Lujo - UFPlus',
      metaDescription:
        'Departamentos de lujo en Vitacura con entrega inmediata. Frente al parque Bicentenario. Inversión premium desde 7.500 UF.',
      ctaText: 'Habla con un asesor experto',
      typologies: [
        { name: '2D / 2B', usefulArea: 85.0, totalArea: 92.0, priceFrom: 7500, sortOrder: 1 },
        { name: '3D / 2B', usefulArea: 110.0, totalArea: 119.0, priceFrom: 9800, sortOrder: 2 },
        {
          name: '3D / 3B Penthouse',
          usefulArea: 145.0,
          totalArea: 165.0,
          priceFrom: 14500,
          observations: 'Terraza privada 45m²',
          sortOrder: 3,
        },
      ],
      amenities: [
        'Sala de eventos',
        'Business center',
        'Spa',
        'Piscina climatizada',
        'Sauna',
        'Conserje premium 24/7',
        'Estacionamiento visitantes',
        'Bodega',
      ],
      financing: [
        {
          name: 'Crédito Hipotecario Premium',
          description: 'Condiciones preferenciales con bancos seleccionados',
        },
        {
          name: 'Entrega inmediata',
          description: 'Escrituración y entrega en 30 días',
        },
      ],
      images: [
        {
          url: 'https://images.unsplash.com/photo-1567496898669-ee935f5f647a?w=1200&q=80',
          isMain: true,
          sortOrder: 1,
          alt: 'Vitacura Park View fachada',
        },
        {
          url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80',
          isMain: false,
          sortOrder: 2,
          alt: 'Interior premium',
        },
        {
          url: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=1200&q=80',
          isMain: false,
          sortOrder: 3,
          alt: 'Terraza con vista',
        },
        {
          url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80',
          isMain: false,
          sortOrder: 4,
          alt: 'Área social',
        },
      ],
    },
    {
      name: 'San Miguel Connect',
      slug: 'san-miguel-connect',
      internalCode: 'UFP-004',
      isActive: true,
      isFeatured: false,
      sortOrder: 4,
      status: 'PUBLISHED' as const,
      deliveryType: DeliveryType.SOON,
      priceFrom: 2100,
      currency: 'UF',
      shortDescription:
        'Oportunidad de inversión accesible en San Miguel, con excelente conectividad y alta demanda de arriendo estudiantil y laboral.',
      longDescription: `San Miguel Connect es la apuesta de UFPlus para inversores que buscan alta rentabilidad con menor ticket de entrada. Ubicado en San Miguel, una de las comunas más conectadas de Santiago gracias a su red de metro y avenidas principales.

Diseñado especialmente pensando en el mercado de arriendo de corto y mediano plazo, con unidades compactas y eficientes.

Rentabilidad estimada: 5% a 6.5% anual neta. Ideal para primer departamento de inversión.`,
      address: 'Av. Departamental 450',
      commune: 'San Miguel',
      city: 'Santiago',
      region: 'Región Metropolitana',
      videoUrl: null,
      videoType: null,
      metaTitle: 'San Miguel Connect | Inversión Accesible - UFPlus',
      metaDescription:
        'Primer departamento de inversión desde 2.100 UF en San Miguel. Alta rentabilidad y excelente conectividad.',
      ctaText: 'Comienza tu inversión hoy',
      typologies: [
        { name: 'Studio compacto', usefulArea: 20.0, totalArea: 23.0, priceFrom: 2100, sortOrder: 1 },
        { name: 'Studio estándar', usefulArea: 26.5, totalArea: 29.5, priceFrom: 2480, sortOrder: 2 },
        { name: '1D / 1B', usefulArea: 34.0, totalArea: 38.0, priceFrom: 2950, sortOrder: 3 },
      ],
      amenities: ['Sala multiusos', 'Bicicletero', 'Lavandería común', 'Conserjería'],
      financing: [
        {
          name: 'Crédito Hipotecario',
          description: 'Acceso a financiamiento bancario tradicional',
        },
        {
          name: 'Pie en cuotas',
          description: 'Pie dividido en 24 cuotas',
        },
        {
          name: 'Subsidio habitacional',
          description: 'Compatible con subsidios DS19',
        },
      ],
      images: [
        {
          url: 'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=1200&q=80',
          isMain: true,
          sortOrder: 1,
          alt: 'San Miguel Connect fachada',
        },
        {
          url: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200&q=80',
          isMain: false,
          sortOrder: 2,
          alt: 'Interior departamento',
        },
        {
          url: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200&q=80',
          isMain: false,
          sortOrder: 3,
          alt: 'Cocina eficiente',
        },
      ],
    },
    {
      name: 'Las Condes Alto',
      slug: 'las-condes-alto',
      internalCode: 'UFP-005',
      isActive: false,
      isFeatured: false,
      sortOrder: 5,
      status: 'DRAFT' as const,
      deliveryType: DeliveryType.FUTURE,
      priceFrom: 4800,
      currency: 'UF',
      shortDescription:
        'Próximo lanzamiento en Las Condes. Regístrate para recibir información exclusiva antes del lanzamiento oficial.',
      longDescription: `Las Condes Alto es un proyecto en etapa de pre-lanzamiento. Ubicación premium en la zona financiera de Las Condes, con acceso privilegiado al eje Apoquindo.

Información completa disponible próximamente. Los inversores registrados tendrán acceso prioritario.`,
      address: 'Av. Apoquindo 5800',
      commune: 'Las Condes',
      city: 'Santiago',
      region: 'Región Metropolitana',
      videoUrl: null,
      videoType: null,
      metaTitle: 'Las Condes Alto | Próximo Lanzamiento - UFPlus',
      metaDescription:
        'Próximo proyecto en Las Condes. Regístrate para información exclusiva.',
      ctaText: 'Regístrate para el pre-lanzamiento',
      typologies: [
        { name: '1D / 1B', usefulArea: 42.0, totalArea: 46.0, priceFrom: 4800, sortOrder: 1 },
        { name: '2D / 2B', usefulArea: 65.0, totalArea: 70.0, priceFrom: 6800, sortOrder: 2 },
      ],
      amenities: ['Terraza sky', 'Piscina', 'Gimnasio', 'Business center'],
      financing: [
        {
          name: 'Crédito Hipotecario',
          description: 'Financiamiento bancario',
        },
        {
          name: 'Pie en cuotas',
          description: 'Pie en cuotas durante construcción',
        },
      ],
      images: [
        {
          url: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1200&q=80',
          isMain: true,
          sortOrder: 1,
          alt: 'Las Condes alto',
        },
      ],
    },
  ]

  for (const projectData of projects) {
    const { typologies, amenities, financing, images, ...data } = projectData

    const project = await prisma.project.upsert({
      where: { slug: data.slug },
      update: {},
      create: {
        ...data,
        publishedAt: data.isActive ? new Date() : null,
        typologies: {
          create: typologies,
        },
        amenities: {
          create: amenities.map((name) => ({ name })),
        },
        financingOptions: {
          create: financing,
        },
        images: {
          create: images,
        },
      },
    })
    console.log(`✅ Project created: ${project.name}`)
  }

  // ─── Sample Leads ─────────────────────────────────────
  const firstProject = await prisma.project.findFirst({
    where: { slug: 'parque-independencia' },
  })

  await prisma.lead.createMany({
    data: [
      {
        name: 'María González',
        email: 'maria.gonzalez@gmail.com',
        phone: '+56 9 1234 5678',
        message: 'Me interesa conocer más sobre las tipologías disponibles y los precios.',
        dicomLastYear: 'No',
        projectId: firstProject?.id,
        status: 'NEW',
      },
      {
        name: 'Carlos Rodríguez',
        email: 'carlos.r@empresa.cl',
        phone: '+56 9 8765 4321',
        message: 'Busco departamento para inversión, tengo un pie de 500 UF disponible.',
        dicomLastYear: 'No',
        status: 'CONTACTED',
      },
      {
        name: 'Ana Martínez',
        email: 'ana.martinez@outlook.com',
        phone: '+56 9 5555 1234',
        message: '¿Tienen financiamiento para primera vivienda?',
        dicomLastYear: 'No',
        projectId: firstProject?.id,
        status: 'NEW',
      },
    ],
  })
  console.log('✅ Sample leads created')

  console.log('\n🎉 Seed completed successfully!')
  console.log('─────────────────────────────')
  console.log('Admin login:')
  console.log('  Email: admin@ufplus.cl')
  console.log('  Password: admin123')
  console.log('─────────────────────────────')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })