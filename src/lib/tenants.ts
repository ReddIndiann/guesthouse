import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore'
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth'
import { auth, db } from './firebase'
import { seedDefaultRoles, ensureSystemAdminRole } from './accessControl'
import { DEFAULT_PROPERTY_SETTINGS } from '../types'
import type {
  CreateOrganizationInput,
  CreatePropertyInput,
  Organization,
  OrganizationPlan,
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

function cleanUndefined<T extends Record<string, any>>(obj: T): T {
  const result: any = {}
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      result[key] = val
    }
  }
  return result
}

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
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    propertyType: input.propertyType || 'guesthouse',
    unitsRange: input.unitsRange || '',
  }

  await setDoc(orgRef, cleanUndefined(newOrg))
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
/**
 * Approves a pending organization from the waitlist
 * Generates an onboarding invite token if the owner hasn't registered a password yet.
 */
export async function approveOrganization(
  orgId: string,
  approvedByUid: string,
): Promise<{ inviteToken?: string; propertyId: string }> {
  const orgSnap = await getDoc(doc(db, ORGS_COLLECTION, orgId))
  if (!orgSnap.exists()) throw new Error('Organization not found')
  const org = orgSnap.data() as Organization

  const now = new Date().toISOString()
  const propRef = doc(collection(db, PROPERTIES_COLLECTION))
  const initialPropId = propRef.id
  const initialPropName = `${org.name} - Main Branch`

  // 1. Create the default primary property
  await setDoc(propRef, cleanUndefined({
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
      propertyType: org.propertyType || 'guesthouse',
    },
  }))

  // 2. Initialize roles for the new property
  await seedDefaultRoles(initialPropId)
  await ensureSystemAdminRole(initialPropId)

  // 3. Generate onboarding invite token if owner hasn't registered yet
  let inviteToken: string | undefined = undefined
  if (!org.ownerUid) {
    inviteToken =
      org.inviteToken ||
      `inv_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36)}`
  }

  // 4. Activate the organization
  await updateDoc(
    doc(db, ORGS_COLLECTION, orgId),
    cleanUndefined({
      status: 'active',
      approvedAt: now,
      approvedBy: approvedByUid,
      propertiesCount: 1,
      primaryPropertyId: initialPropId,
      inviteToken: inviteToken || null,
    }),
  )

  // 5. Update the owner's staff profile if already set
  if (org.ownerUid) {
    await updateDoc(doc(db, 'staff', org.ownerUid), {
      propertyId: initialPropId,
      accessibleProperties: [initialPropId],
      pendingApproval: false,
    })
  }

  return { inviteToken, propertyId: initialPropId }
}

/**
 * Generate or refresh an onboarding invitation token for an organization
 */
export async function generateOrRefreshInviteToken(orgId: string): Promise<string> {
  const token = `inv_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36)}`
  await updateDoc(doc(db, ORGS_COLLECTION, orgId), {
    inviteToken: token,
  })
  return token
}

/**
 * Super Admin updates an organization's plan and max branch quota
 */
export async function updateOrganizationPlanAndQuota(
  orgId: string,
  plan: OrganizationPlan,
  maxProperties: number,
): Promise<void> {
  await updateDoc(doc(db, ORGS_COLLECTION, orgId), {
    plan,
    maxProperties: Number(maxProperties) || 1,
  })
}

/**
 * Lookup organization and primary branch details via an invite token
 */
export async function getOrganizationByInviteToken(token: string): Promise<{
  org: Organization
  property?: PropertyItem
}> {
  if (!token) throw new Error('Invalid invite link.')
  const q = query(collection(db, ORGS_COLLECTION), where('inviteToken', '==', token))
  const snap = await getDocs(q)
  if (snap.empty) {
    throw new Error('This invitation link is invalid or has expired.')
  }
  const orgDoc = snap.docs[0]
  const org = { id: orgDoc.id, ...orgDoc.data() } as Organization

  let property: PropertyItem | undefined
  if (org.primaryPropertyId) {
    const pSnap = await getDoc(doc(db, PROPERTIES_COLLECTION, org.primaryPropertyId))
    if (pSnap.exists()) {
      property = { id: pSnap.id, ...pSnap.data() } as PropertyItem
    }
  }

  return { org, property }
}

/**
 * prospective owner accepts an onboarding invite:
 * Creates their auth account and staff record, granting primary admin access to their property.
 */
export async function acceptOrganizationInvite(
  token: string,
  password: string,
  ownerName?: string,
): Promise<{ userUid: string; orgId: string }> {
  const { org, property } = await getOrganizationByInviteToken(token)

  if (org.inviteAcceptedAt && org.ownerUid) {
    throw new Error('This workspace invitation has already been accepted. Please sign in directly.')
  }

  const primaryPropId = org.primaryPropertyId || property?.id || ''
  const displayName = (ownerName || org.ownerName || 'Property Admin').trim()
  const email = org.contactEmail.trim().toLowerCase()

  // Sign out any active user first to avoid session conflict
  if (auth.currentUser) {
    await signOut(auth)
  }

  // Create Firebase Auth user
  const userCredential = await createUserWithEmailAndPassword(auth, email, password)
  const user = userCredential.user
  const now = new Date().toISOString()

  // Create staff document
  const staffData = {
    uid: user.uid,
    email: email,
    displayName: displayName,
    propertyId: primaryPropId,
    organizationId: org.id,
    organizationName: org.name,
    assignmentType: 'direct',
    roleId: 'system-admin',
    isSuperAdmin: false,
    userType: 'org_admin',
    accessibleProperties: primaryPropId ? [primaryPropId] : [],
    createdAt: now,
    createdBy: 'invitation_link',
  }

  await setDoc(doc(db, 'staff', user.uid), staffData)

  // Update organization with ownerUid and mark accepted
  await updateDoc(doc(db, ORGS_COLLECTION, org.id), {
    ownerUid: user.uid,
    ownerName: displayName,
    inviteAcceptedAt: now,
  })

  return { userUid: user.uid, orgId: org.id }
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
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
  }

  await setDoc(orgRef, cleanUndefined(newOrg))
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
      propertyType: input.propertyType || 'guesthouse',
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
