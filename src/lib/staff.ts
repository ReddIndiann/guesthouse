import { deleteApp, initializeApp } from 'firebase/app'
import {
  createUserWithEmailAndPassword,
  getAuth,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import type { CreateStaffInput } from '../types/auth'
import { db, firebaseConfig } from './firebase'

export async function createStaffAuthUser(
  input: CreateStaffInput,
  propertyId: string,
  createdBy: string,
): Promise<string> {
  const secondaryApp = initializeApp(firebaseConfig, `staff-${Date.now()}`)
  try {
    const secondaryAuth = getAuth(secondaryApp)
    const credential = await createUserWithEmailAndPassword(
      secondaryAuth,
      input.email,
      input.password,
    )

    const staffData = {
      email: input.email,
      displayName: input.displayName,
      propertyId,
      assignmentType: input.assignment.assignmentType,
      createdAt: new Date().toISOString(),
      createdBy,
      ...(input.assignment.assignmentType === 'direct'
        ? { roleId: input.assignment.roleId }
        : { groupId: input.assignment.groupId }),
    }

    await setDoc(doc(db, 'staff', credential.user.uid), staffData)
    await firebaseSignOut(secondaryAuth)
    return credential.user.uid
  } finally {
    await deleteApp(secondaryApp)
  }
}

export interface CreateGlobalStaffInput {
  displayName: string
  email: string
  password: string
  organizationId?: string
  organizationName?: string
  propertyId: string
  roleId?: string
  isSuperAdmin?: boolean
  userType?: 'super_admin' | 'org_admin' | 'staff'
}

export async function createGlobalStaffUser(
  input: CreateGlobalStaffInput,
  createdByUid: string,
): Promise<string> {
  const secondaryApp = initializeApp(firebaseConfig, `admin-staff-${Date.now()}`)
  try {
    const secondaryAuth = getAuth(secondaryApp)
    const credential = await createUserWithEmailAndPassword(
      secondaryAuth,
      input.email,
      input.password,
    )

    const staffData = {
      uid: credential.user.uid,
      email: input.email,
      displayName: input.displayName,
      propertyId: input.propertyId || '',
      organizationId: input.organizationId || '',
      organizationName: input.organizationName || '',
      assignmentType: 'direct',
      roleId: input.roleId || 'system-admin',
      isSuperAdmin: Boolean(input.isSuperAdmin),
      userType: input.userType || (input.isSuperAdmin ? 'super_admin' : 'staff'),
      accessibleProperties: input.propertyId ? [input.propertyId] : [],
      createdAt: new Date().toISOString(),
      createdBy: createdByUid,
    }

    await setDoc(doc(db, 'staff', credential.user.uid), staffData)
    await firebaseSignOut(secondaryAuth)
    return credential.user.uid
  } finally {
    await deleteApp(secondaryApp)
  }
}
