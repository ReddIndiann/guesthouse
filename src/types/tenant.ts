import type { PropertySettings } from './index'

export type OrganizationStatus = 'pending_approval' | 'active' | 'suspended' | 'rejected'

export type OrganizationPlan = 'starter' | 'growth' | 'enterprise'

export interface Organization {
  id: string
  name: string
  slug: string
  status: OrganizationStatus
  contactEmail: string
  contactPhone?: string
  ownerUid: string
  ownerName: string
  plan: OrganizationPlan
  createdAt: string
  approvedAt?: string
  approvedBy?: string
  rejectedAt?: string
  rejectionReason?: string
  notes?: string
  propertiesCount?: number
  maxProperties?: number
  imageUrl?: string
  location?: string
  latitude?: number
  longitude?: number
}

export interface PropertyItem {
  id: string
  organizationId: string
  name: string
  code?: string
  address?: string
  phone?: string
  createdAt: string
  settings?: PropertySettings
  roomsCount?: number
  imageUrl?: string
  latitude?: number
  longitude?: number
}

export interface RegisterOrgInput {
  organizationName: string
  ownerName: string
  email: string
  password: string
  phone?: string
  notes?: string
  estimatedProperties?: number
  imageUrl?: string
  location?: string
  latitude?: number
  longitude?: number
}

export interface CreateOrganizationInput {
  name: string
  ownerEmail: string
  ownerName: string
  ownerPassword?: string
  phone?: string
  plan: OrganizationPlan
  notes?: string
  initialPropertyName?: string
  imageUrl?: string
  location?: string
  latitude?: number
  longitude?: number
  accentColor?: string
  colorThemeId?: string
}

export interface CreatePropertyInput {
  name: string
  code?: string
  address?: string
  phone?: string
  imageUrl?: string
  latitude?: number
  longitude?: number
  accentColor?: string
  colorThemeId?: string
}
