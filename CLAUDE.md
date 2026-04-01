# CLAUDE.md — UFPlus Web

## 1. Project Overview

**UFPlus** es una plataforma de inversión inmobiliaria chilena. Tiene dos partes:
- **Sitio público**: showcase de proyectos de departamentos en Santiago, captura de leads (formulario de contacto con nombre, email, teléfono, renta y estado Dicom).
- **Panel admin**: CRUD completo de proyectos, gestión de imágenes vía Cloudinary, y seguimiento de leads con workflow de estados.

**Stack principal:**
- Next.js 14 (App Router, RSC + Client Components)
- TypeScript + Zod (validaciones)
- Prisma 5 + PostgreSQL
- Tailwind CSS 3 + Radix UI
- NextAuth.js 4 (credentials, JWT)
- Cloudinary (imágenes)
- React Hook Form
- Framer Motion

---

## 2. Architecture

```
src/
├── app/
│   ├── (public)/              # Rutas públicas con layout header+footer
│   │   ├── page.tsx           # Homepage (hero, proyectos, testimonios, contacto)
│   │   └── proyectos/
│   │       ├── page.tsx       # Listado de proyectos
│   │       └── [slug]/page.tsx # Detalle de proyecto
│   ├── admin/                 # Panel admin (protegido por middleware)
│   │   ├── layout.tsx         # Layout con sidebar + header
│   │   ├── page.tsx           # Dashboard con stats
│   │   ├── login/page.tsx     # Login de admin
│   │   ├── proyectos/         # CRUD proyectos
│   │   └── leads/page.tsx     # Gestión de leads
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── projects/          # Endpoints públicos (solo activos)
│       ├── leads/route.ts     # POST público (captura de leads)
│       └── admin/             # Endpoints protegidos (requieren sesión)
│           ├── projects/      # GET/POST/PUT/DELETE/PATCH toggle
│           ├── leads/         # GET con filtros
│           ├── upload/        # POST a Cloudinary
│           └── stats/         # GET métricas dashboard
├── components/
│   ├── ui/                    # Primitivas reutilizables (Button, Input, Badge, Toast, ConfirmDialog)
│   ├── public/                # Header, Footer, ProjectCard, ContactForm
│   └── admin/                 # AdminSidebar, AdminHeader, ProjectForm, ProjectsTable, ImageManager
├── lib/
│   ├── auth.ts                # Config NextAuth (credentials provider, callbacks JWT/session)
│   ├── prisma.ts              # Singleton de Prisma para dev
│   ├── utils.ts               # slugify, formatPrice, formatArea, getEmbedUrl, LABELS, COLOR_MAPS
│   └── validations.ts         # Schemas Zod (project, lead, typology, amenity, financing, login)
└── types/index.ts             # Interfaces TS (ProjectWithRelations, AdminStats, etc.)

prisma/
├── schema.prisma              # Schema completo (User, Project, Typology, Amenity, Financing, Image, Lead)
└── seed.ts                    # Datos de ejemplo + admin por defecto
```

**Modelos clave en Prisma:**
- `Project` → tiene `Typology[]`, `ProjectAmenity[]`, `FinancingOption[]`, `ProjectImage[]`
- `Lead` con estados: `NEW → CONTACTED → QUALIFIED → CLOSED`
- `User` con roles `ADMIN | EDITOR` + tablas de NextAuth
- Todos los dependientes hacen cascade delete con el proyecto

---

## 3. Key Commands

```bash
npm run dev           # Dev server en localhost:3000
npm run build         # prisma generate + next build
npm run start         # Servidor de producción
npm run lint          # ESLint

npm run db:push       # Sincronizar schema a la BD (sin migración)
npm run db:studio     # Prisma Studio (GUI visual de la BD)
npm run db:seed       # Cargar datos de ejemplo (tsx prisma/seed.ts)
npm run db:generate   # Generar cliente Prisma
```

Para migraciones con historial:
```bash
npx prisma migrate dev --name <nombre>
```

---

## 4. Environment & Config

Variables requeridas (ver `.env.example`):

```env
# Base de datos
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/ufplus?schema=public

# NextAuth
NEXTAUTH_SECRET=secreto-seguro
NEXTAUTH_URL=http://localhost:3000

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=ufplus-projects
```

**Archivos de config importantes:**
- `tailwind.config.ts` — colores de marca, animaciones custom
- `next.config.js` — `remotePatterns` para imágenes (Unsplash, Cloudinary, placeholder)
- `middleware.ts` — protege todas las rutas `/admin/*` con sesión válida
- `src/app/globals.css` — component layer de Tailwind (`.btn-primary`, `.input-field`, `.admin-nav-link`, etc.)

---

## 5. Deployment

- **Plataforma:** Vercel (main branch → producción automática)
- **BD:** PostgreSQL externo (Railway o Neon) — `DATABASE_URL` en Vercel env vars
- **Imágenes:** Cloudinary CDN
- **Build command:** `prisma generate && next build` (ya configurado en `package.json`)
- **Preview deployments:** automáticos en cada PR/branch
- **Variables de entorno:** configuradas en Vercel project settings (no en repo)

---

## 6. Coding Conventions

- **Server Components por defecto**: páginas con `async function` que acceden directo a Prisma. Solo usar `'use client'` para formularios, interactividad y hooks.
- **Validación doble**: Zod en cliente (React Hook Form) y en API routes (mismos schemas de `validations.ts`).
- **Naming**: componentes en PascalCase, carpetas en kebab-case, enums en UPPERCASE (`DeliveryType.IMMEDIATE`).
- **Rutas públicas vs admin**: separadas por grupos de rutas `(public)/` y `admin/` con layouts independientes.
- **Slugs, no IDs**: las URLs públicas de proyectos usan slug (`/proyectos/[slug]`); el admin usa ID numérico.
- **Imágenes con orden**: `ProjectImage` tiene `sortOrder` e `isMain`; typologies también tienen `sortOrder`.
- **Idioma**: todo el UI es en español. Variables, funciones y comentarios mezclan español e inglés.
- **Helpers centralizados**: `LABELS` y `COLOR_MAPS` en `utils.ts` para traducir enums a texto/color de badges.
- **Moneda**: UF (Unidad de Fomento chilena) como unidad principal; CLP como alternativa.

---

## 7. Key Files

| Archivo | Por qué importa |
|---|---|
| `prisma/schema.prisma` | Fuente de verdad del modelo de datos |
| `src/lib/validations.ts` | Cambiar un campo requiere actualizar aquí también |
| `src/lib/auth.ts` | Lógica de autenticación, no tocar sin entender NextAuth |
| `middleware.ts` | Controla qué rutas son públicas vs protegidas |
| `tailwind.config.ts` | Colores de marca — cambiar aquí afecta todo el UI |
| `src/app/globals.css` | Clases de componente globales reutilizadas en todo el proyecto |
| `src/components/admin/ProjectForm.tsx` | Formulario más complejo del proyecto (typologies, images, amenities) |
| `src/components/public/ContactForm.tsx` | Captura de leads — cualquier cambio de campo requiere migración + schema |
| `src/lib/utils.ts` | slugify, formatPrice, LABELS — usados en todo el codebase |
| `prisma/seed.ts` | Admin por defecto: `admin@ufplus.cl` / `admin123` |

---

## 8. Known Constraints

- **Prisma en dev**: siempre usar el singleton de `src/lib/prisma.ts`, no instanciar `new PrismaClient()` directamente (causa múltiples conexiones en hot-reload).
- **Agregar campo a Project o Lead**: requiere 4 pasos — (1) `schema.prisma`, (2) migración, (3) `validations.ts`, (4) componente de formulario correspondiente. Olvidar alguno rompe silenciosamente.
- **NextAuth v4**: la app usa v4, no v5 (beta). Las APIs son distintas — no mezclar documentación.
- **Cloudinary Upload Preset**: debe existir el preset `ufplus-projects` configurado como "unsigned" en Cloudinary para que el upload funcione sin backend adicional.
- **`next.config.js` remotePatterns**: si se agregan nuevas fuentes de imagen (otro CDN, otro dominio), hay que añadirlas aquí o Next.js las bloqueará en producción.
- **Middleware JWT**: el token se verifica con `NEXTAUTH_SECRET` — si cambia en producción, todas las sesiones activas se invalidan.
- **`db:push` vs migrate**: `db:push` no genera historial de migraciones. Usar `prisma migrate dev` para cambios en producción.
- **bcryptjs rounds=12**: el seed usa 12 rounds — no bajar esto en producción.
