// src/types/index.ts
import {
  Project,
  ProjectImage,
  Typology,
  ProjectAmenity,
  FinancingOption,
  Lead,
  User,
} from '@prisma/client'

export type ProjectWithRelations = Project & {
  images: ProjectImage[]
  typologies: Typology[]
  amenities: ProjectAmenity[]
  financingOptions: FinancingOption[]
  _count?: {
    leads: number
  }
}

export type ProjectCard = Pick<
  Project,
  | 'id'
  | 'name'
  | 'slug'
  | 'commune'
  | 'city'
  | 'priceFrom'
  | 'currency'
  | 'deliveryType'
  | 'shortDescription'
  | 'isFeatured'
  | 'isActive'
> & {
  images: Pick<ProjectImage, 'url' | 'alt' | 'isMain'>[]
  typologies: Pick<Typology, 'name'>[]
}

export type LeadWithProject = Lead & {
  project: Pick<Project, 'name' | 'slug'> | null
}

export type AdminStats = {
  totalProjects: number
  activeProjects: number
  inactiveProjects: number
  featuredProjects: number
  archivedProjects: number
  totalLeads: number
  newLeads: number
}

export type FilterOptions = {
  commune?: string
  deliveryType?: string
  search?: string
  priceMin?: number
  priceMax?: number
}

export interface NextAuthUser {
  id: string
  email: string
  name?: string | null
  role: string
}

declare module 'next-auth' {
  interface Session {
    user: NextAuthUser
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
  }
}
