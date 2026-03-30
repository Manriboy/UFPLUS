# UFPlus — Plataforma de Inversión Inmobiliaria

Plataforma web completa para UFPlus, broker inmobiliario en Chile especializado en departamentos de inversión.

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 14 (App Router) |
| Lenguaje | TypeScript |
| Base de datos | PostgreSQL |
| ORM | Prisma |
| Autenticación | NextAuth.js (JWT) |
| Estilos | Tailwind CSS |
| Formularios | React Hook Form + Zod |
| Imágenes | Cloudinary (o fallback local) |
| Deployment | Vercel + Railway/Neon |

---

## Estructura del proyecto

```
ufplus/
├── prisma/
│   ├── schema.prisma          # Modelos de base de datos
│   └── seed.ts                # Datos demo iniciales
├── src/
│   ├── app/
│   │   ├── (public)/          # Sitio público (layout con header/footer)
│   │   │   ├── page.tsx       # Home
│   │   │   └── proyectos/
│   │   │       ├── page.tsx           # Listado de proyectos
│   │   │       ├── ProjectsClient.tsx # Filtros y búsqueda (client)
│   │   │       └── [slug]/page.tsx    # Detalle de proyecto
│   │   ├── admin/             # Panel administrador (protegido)
│   │   │   ├── layout.tsx     # Layout admin con sidebar
│   │   │   ├── page.tsx       # Dashboard
│   │   │   ├── login/page.tsx # Login
│   │   │   ├── proyectos/
│   │   │   │   ├── page.tsx       # Lista admin proyectos
│   │   │   │   ├── nuevo/page.tsx # Crear proyecto
│   │   │   │   └── [id]/page.tsx  # Editar proyecto
│   │   │   └── leads/page.tsx     # Gestión de leads
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/ # NextAuth
│   │   │   ├── admin/
│   │   │   │   ├── projects/       # CRUD proyectos (protegido)
│   │   │   │   ├── upload/         # Upload de imágenes
│   │   │   │   ├── stats/          # Estadísticas dashboard
│   │   │   │   └── leads/          # Leads admin
│   │   │   ├── projects/           # API pública de proyectos
│   │   │   └── leads/              # Submit formulario público
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── not-found.tsx
│   ├── components/
│   │   ├── admin/
│   │   │   ├── AdminSidebar.tsx
│   │   │   ├── AdminHeader.tsx
│   │   │   ├── SessionProvider.tsx
│   │   │   ├── ProjectForm.tsx     # Formulario CRUD completo
│   │   │   ├── ProjectsTable.tsx   # Tabla con acciones rápidas
│   │   │   └── ImageManager.tsx    # Gestor de imágenes drag-and-drop
│   │   ├── public/
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── ProjectCard.tsx
│   │   │   └── ContactForm.tsx
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Badge.tsx
│   │       ├── Input.tsx
│   │       ├── Toast.tsx
│   │       └── ConfirmDialog.tsx
│   ├── lib/
│   │   ├── auth.ts         # Configuración NextAuth
│   │   ├── prisma.ts       # Cliente Prisma singleton
│   │   ├── utils.ts        # Utilidades y helpers
│   │   └── validations.ts  # Schemas Zod
│   └── types/
│       └── index.ts
├── .env.example
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Instalación local

### 1. Requisitos previos

- Node.js 18+
- PostgreSQL 14+ (local o en Railway/Neon)
- Cuenta Cloudinary (opcional, tiene fallback para desarrollo)

### 2. Clonar e instalar

```bash
git clone https://github.com/tu-usuario/ufplus.git
cd ufplus
npm install
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env.local
```

Edita `.env.local` con tus valores:

```env
# PostgreSQL — puedes usar una base local o Neon (gratis)
DATABASE_URL="postgresql://usuario:password@localhost:5432/ufplus"

# NextAuth — genera un secret con: openssl rand -base64 32
NEXTAUTH_SECRET="tu-secret-muy-seguro"
NEXTAUTH_URL="http://localhost:3000"

# Cloudinary (opcional para desarrollo)
CLOUDINARY_CLOUD_NAME="tu-cloud-name"
CLOUDINARY_API_KEY="tu-api-key"
CLOUDINARY_API_SECRET="tu-api-secret"
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="tu-cloud-name"
```

### 4. Configurar la base de datos

```bash
# Crear tablas
npm run db:push

# Cargar datos demo
npm run db:seed
```

### 5. Correr en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

---

## Acceso al panel admin

Después del seed, el acceso admin es:

```
URL:       http://localhost:3000/admin
Email:     admin@ufplus.cl
Contraseña: admin123
```

> ⚠️ **Importante:** Cambia la contraseña inmediatamente en producción.

---

## Funcionalidades

### Sitio público
- **Home** — Hero, beneficios, proyectos destacados, servicios, testimonios, formulario de contacto
- **Proyectos** (`/proyectos`) — Listado con filtros por tipo de entrega, comuna, precio y búsqueda
- **Detalle de proyecto** (`/proyectos/[slug]`) — Galería, tipologías, amenities, financiamiento, video, formulario
- **SEO** — Metadata dinámica por proyecto, OpenGraph, URLs amigables

### Panel administrador (`/admin`)
- **Dashboard** — Estadísticas en tiempo real, proyectos y leads recientes
- **CRUD de proyectos** — Crear, editar, activar/desactivar, destacar, archivar
- **Gestor de imágenes** — Drag-and-drop, múltiples imágenes, imagen principal
- **Tipologías** — Múltiples tipos con superficie, precio y observaciones
- **Amenities** — Predefinidos o personalizados
- **Financiamiento** — Opciones configurables por proyecto
- **Leads** — Todas las consultas del sitio con filtro por estado

### Modelo de datos
```
User → (autenticación admin)
Project → typologies, amenities, financingOptions, images, leads
Lead → project (opcional)
```

---

## Comandos útiles

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run db:push      # Aplicar schema a la BD
npm run db:seed      # Cargar datos demo
npm run db:studio    # Abrir Prisma Studio (UI de BD)
npm run db:generate  # Regenerar cliente Prisma
npm run lint         # Linter
```

---

## Deploy en producción

### Opción recomendada: Vercel + Neon PostgreSQL

#### 1. Base de datos (Neon — gratis hasta 0.5GB)

1. Crea una cuenta en [neon.tech](https://neon.tech)
2. Crea un nuevo proyecto
3. Copia el `DATABASE_URL` (connection string pooled)

#### 2. Deploy en Vercel

```bash
npm install -g vercel
vercel
```

O conecta directamente desde [vercel.com](https://vercel.com) con tu repositorio de GitHub.

#### 3. Variables de entorno en Vercel

En el dashboard de Vercel → Settings → Environment Variables, agrega:

```
DATABASE_URL        → tu connection string de Neon
NEXTAUTH_SECRET     → openssl rand -base64 32
NEXTAUTH_URL        → https://tu-dominio.com
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
```

#### 4. Correr migraciones y seed en producción

```bash
# Después del primer deploy, en tu terminal local con las env vars de producción:
DATABASE_URL="tu-url-produccion" npm run db:push
DATABASE_URL="tu-url-produccion" npm run db:seed
```

### Alternativa: Railway (base de datos + app en un solo lugar)

1. Crea proyecto en [railway.app](https://railway.app)
2. Agrega servicio PostgreSQL
3. Agrega servicio desde GitHub (selecciona este repo)
4. Configura variables de entorno
5. Railway detecta Next.js automáticamente

---

## Cloudinary — Configuración para imágenes

1. Crea cuenta gratuita en [cloudinary.com](https://cloudinary.com)
2. Ve a **Settings → Upload → Upload presets**
3. Crea un preset llamado `ufplus-projects`
4. Modo: **Unsigned** (para subidas desde el servidor con API key)
5. Carpeta destino: `ufplus`
6. Copia tus credenciales al `.env.local`

> Sin Cloudinary configurado, el sistema funciona en modo desarrollo guardando imágenes como base64 en la BD (no recomendado para producción).

---

## Cambiar la contraseña del admin

Para cambiar la contraseña del administrador, abre Prisma Studio:

```bash
npm run db:studio
```

O ejecuta directamente:

```typescript
// En un script o consola de Prisma
import bcrypt from 'bcryptjs'
const hash = await bcrypt.hash('nueva-contraseña', 12)
// Actualiza el campo password del User con email admin@ufplus.cl
```

---

## Personalización

### Colores
La paleta está definida en `tailwind.config.ts`:
```
brand.primary    → #941914 (rojo corporativo)
brand.secondary  → #4B4B4B (gris oscuro)
brand.surface    → #F6F6F6 (fondo claro)
```

### Fuentes
Definidas en `src/app/layout.tsx`:
- **Playfair Display** → títulos y display (`font-display`)
- **DM Sans** → texto general (`font-sans`)

### Contenido
Todo el contenido estático del sitio (textos, beneficios, servicios, testimonios) está en `src/app/(public)/page.tsx`. Edita directamente los arrays `benefits`, `services` y `testimonials`.

---

## Seguridad

- Rutas `/admin/*` protegidas con NextAuth — redirigen al login si no hay sesión
- Rutas `/api/admin/*` validan sesión en el servidor con `getServerSession`
- Contraseñas hasheadas con bcrypt (12 rounds)
- Validación de inputs con Zod en frontend y backend
- Soft delete para proyectos (archivado, no borrado físico)
- CORS manejado por Next.js

---

## Licencia

Proyecto privado — UFPlus © 2024. Todos los derechos reservados.
