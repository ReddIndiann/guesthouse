import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from './firebase'
import { seedDefaultRoles, ensureSystemAdminRole } from './accessControl'
import { DEFAULT_PROPERTY_SETTINGS } from '../types'
import type {
  CreateOrganizationInput,
  CreatePropertyInput,
  Organization,
  PropertyItem,
  RegisterOrgInput,
} from '../types/tenant'

const ORGS_COLLECTION = 'organizations'
const PROPERTIES_COLLECTION = 'properties'

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
/**
 * Self-service waitlist / invitation request:
 * Records the prospective organization details for review and invitation.
 * Does NOT create a Firebase Auth user upfront.
 */
export async function registerOrganization(input: RegisterOrgInput): Promise<{ orgId: string }> {
  const orgRef = doc(collection(db, ORGS_COLLECTION))
  const orgId = orgRef.id
  const now = new Date().toISOString()
  const slug = `${slugify(input.organizationName)}-${orgId.slice(0, 5)}`

  const newOrg: Organization = {
    id: orgId,
    name: input.organizationName,
    slug,
    status: 'pending_approval',
    contactEmail: input.email,
    contactPhone: input.phone || '',
    ownerUid: '',
    ownerName: input.ownerName,
    plan: 'starter',
    createdAt: now,
    notes: input.notes || '',
    propertiesCount: 0,
    maxProperties: input.estimatedProperties || 1,
    location: input.location || '',
    imageUrl: input.imageUrl || '',
    latitude: input.latitude,
    longitude: input.longitude,
    propertyType: input.propertyType || 'guesthouse',
    unitsRange: input.unitsRange || '',
  }

  await setDoc(orgRef, newOrg)
  return { orgId }
}

/**
 * Super Admin subscribes to all organizations (with real-time updates)
 */
export function subscribeToAllOrganizations(
  onData: (orgs: Organization[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(collection(db, ORGS_COLLECTION))
  return onSnapshot(
    q,
    (snap) => {
      const orgs: Organization[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Organization))
      // Sort newest first
      orgs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      onData(orgs)
    },
    (err) => {
      onError?.(err)
    },
  )
}

/**
 * Approves a pending organization from the waitlist
 */
export async function approveOrganization(orgId: string, approvedByUid: string): Promise<void> {
  const orgSnap = await getDoc(doc(db, ORGS_COLLECTION, orgId))
  if (!orgSnap.exists()) throw new Error('Organization not found')
  const org = orgSnap.data() as Organization

  const now = new Date().toISOString()
  const propRef = doc(collection(db, PROPERTIES_COLLECTION))
  const initialPropId = propRef.id
  const initialPropName = `${org.name} - Main Branch`

  // 1. Create the default primary property
  await setDoc(propRef, {
    id: initialPropId,
    organizationId: orgId,
    name: initialPropName,
    code: 'HQ-1',
    address: org.location || '',
    phone: org.contactPhone || '',
    imageUrl: org.imageUrl || '',
    latitude: org.latitude ?? null,
    longitude: org.longitude ?? null,
    createdAt: now,
    settings: {
      ...DEFAULT_PROPERTY_SETTINGS,
      name: initialPropName,
      address: org.location || '',
      phone: org.contactPhone || '',
    },
  })

  // 2. Initialize roles for the new property
  await seedDefaultRoles(initialPropId)
  await ensureSystemAdminRole(initialPropId)

  // 3. Activate the organization
  await updateDoc(doc(db, ORGS_COLLECTION, orgId), {
    status: 'active',
    approvedAt: now,
    approvedBy: approvedByUid,
    propertiesCount: 1,
  })

  // 4. Update the owner's staff profile
  if (org.ownerUid) {
    await updateDoc(doc(db, 'staff', org.ownerUid), {
      propertyId: initialPropId,
      accessibleProperties: [initialPropId],
      pendingApproval: false,
    })
  }
}

/**
 * Rejects a pending organization request
 */
export async function rejectOrganization(orgId: string, reason?: string): Promise<void> {
  const orgSnap = await getDoc(doc(db, ORGS_COLLECTION, orgId))
  if (!orgSnap.exists()) throw new Error('Organization not found')

  const now = new Date().toISOString()
  await updateDoc(doc(db, ORGS_COLLECTION, orgId), {
    status: 'rejected',
    rejectedAt: now,
    rejectionReason: reason || 'Application not accepted at this time.',
  })
}

/**
 * Suspends an active organization
 */
export async function suspendOrganization(orgId: string): Promise<void> {
  await updateDoc(doc(db, ORGS_COLLECTION, orgId), {
    status: 'suspended',
  })
}

/**
 * Reactivates a suspended organization
 */
export async function activateOrganization(orgId: string): Promise<void> {
  await updateDoc(doc(db, ORGS_COLLECTION, orgId), {
    status: 'active',
  })
}

/**
 * Super Admin manually provisions a new organization directly
 */
export async function createOrganizationDirectly(
  input: CreateOrganizationInput,
  adminUid: string,
): Promise<string> {
  const orgRef = doc(collection(db, ORGS_COLLECTION))
  const orgId = orgRef.id
  const now = new Date().toISOString()
  const slug = `${slugify(input.name)}-${orgId.slice(0, 5)}`

  const propRef = doc(collection(db, PROPERTIES_COLLECTION))
  const propId = propRef.id
  const propName = input.initialPropertyName?.trim() || `${input.name} - Branch 1`

  // 1. Create property
  await setDoc(propRef, {
    id: propId,
    organizationId: orgId,
    name: propName,
    code: 'B-1',
    address: input.location || '',
    phone: input.phone || '',
    imageUrl: input.imageUrl || '',
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    createdAt: now,
    settings: {
      ...DEFAULT_PROPERTY_SETTINGS,
      name: propName,
      address: input.location || '',
      phone: input.phone || '',
      accentColor: input.accentColor || '#3d6b4f',
      colorThemeId: input.colorThemeId || 'sage',
    },
  })

  // 2. Initialize roles for property
  await seedDefaultRoles(propId)
  await ensureSystemAdminRole(propId)

  // 3. Create active organization
  const newOrg: Organization = {
    id: orgId,
    name: input.name,
    slug,
    status: 'active',
    contactEmail: input.ownerEmail,
    contactPhone: input.phone || '',
    ownerUid: '', // will be set once the owner logs in or is invited
    ownerName: input.ownerName,
    plan: input.plan,
    createdAt: now,
    approvedAt: now,
    approvedBy: adminUid,
    notes: input.notes || '',
    propertiesCount: 1,
    maxProperties: 5,
    imageUrl: input.imageUrl || '',
    location: input.location || '',
    latitude: input.latitude,
    longitude: input.longitude,
  }

  await setDoc(orgRef, newOrg)
  return orgId
}

/**
 * Subscribes to all properties for an organization
 */
export function subscribeToOrgProperties(
  organizationId: string,
  onData: (properties: PropertyItem[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(collection(db, PROPERTIES_COLLECTION), where('organizationId', '==', organizationId))
  return onSnapshot(
    q,
    (snap) => {
      const items: PropertyItem[] = snap.docs.map((d) => {
        const data = d.data()
        return {
          id: d.id,
          organizationId: data.organizationId || organizationId,
          name: data.name || (data.settings?.name as string) || 'Unnamed Property',
          code: data.code,
          address: data.address || (data.settings?.address as string),
          phone: data.phone || (data.settings?.phone as string),
          imageUrl: data.imageUrl,
          latitude: data.latitude,
          longitude: data.longitude,
          createdAt: data.createdAt || new Date().toISOString(),
          settings: data.settings,
        }
      })
      onData(items)
    },
    (err) => onError?.(err),
  )
}

/**
 * Creates an additional property under an active organization
 */
export async function createOrgProperty(
  organizationId: string,
  input: CreatePropertyInput,
  currentOrgPropertiesCount = 1,
): Promise<string> {
  const propRef = doc(collection(db, PROPERTIES_COLLECTION))
  const propId = propRef.id
  const now = new Date().toISOString()

  await setDoc(propRef, {
    id: propId,
    organizationId,
    name: input.name,
    code: input.code || `B-${currentOrgPropertiesCount + 1}`,
    address: input.address || '',
    phone: input.phone || '',
    imageUrl: input.imageUrl || '',
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    createdAt: now,
    settings: {
      ...DEFAULT_PROPERTY_SETTINGS,
      name: input.name,
      address: input.address || '',
      phone: input.phone || '',
      accentColor: input.accentColor || '#3d6b4f',
      colorThemeId: input.colorThemeId || 'sage',
    },
  })

  await seedDefaultRoles(propId)
  await ensureSystemAdminRole(propId)

  // Increment org properties count
  await updateDoc(doc(db, ORGS_COLLECTION, organizationId), {
    propertiesCount: currentOrgPropertiesCount + 1,
  })

  return propId
}

/**
 * Get organization by ID
 */
export async function getOrganization(orgId: string): Promise<Organization | null> {
  const snap = await getDoc(doc(db, ORGS_COLLECTION, orgId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Organization
}
