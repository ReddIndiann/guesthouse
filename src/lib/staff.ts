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
