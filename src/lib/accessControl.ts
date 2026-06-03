import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import type {
  CreateGroupInput,
  CreateRoleInput,
  CustomRole,
  StaffAssignment,
  UserGroup,
} from '../types/auth'
import { ALL_PERMISSIONS, SYSTEM_ADMIN_ROLE_ID } from '../types/auth'
import { DEFAULT_ROLE_TEMPLATES } from '../utils/permissions'
import { db } from './firebase'

function rolesCollection(propertyId: string) {
  return collection(db, 'properties', propertyId, 'roles')
}

function groupsCollection(propertyId: string) {
  return collection(db, 'properties', propertyId, 'groups')
}

export async function seedDefaultRoles(propertyId: string): Promise<void> {
  const existing = await getDocs(rolesCollection(propertyId))
  if (!existing.empty) return

  const now = new Date().toISOString()
  for (const template of DEFAULT_ROLE_TEMPLATES) {
    await setDoc(doc(rolesCollection(propertyId), template.id), {
      name: template.name,
      description: template.description ?? '',
      permissions: template.permissions,
      isSystem: template.isSystem ?? false,
      createdAt: now,
    })
  }
}

export async function ensureSystemAdminRole(propertyId: string): Promise<void> {
  const ref = doc(rolesCollection(propertyId), SYSTEM_ADMIN_ROLE_ID)
  const snap = await getDoc(ref)
  if (!snap.exists()) return

  const permissions = snap.data().permissions as string[] | undefined
  if (!permissions || permissions.length < ALL_PERMISSIONS.length) {
    await updateDoc(ref, { permissions: ALL_PERMISSIONS })
  }
}

export function subscribeToRoles(
  propertyId: string,
  onData: (roles: CustomRole[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    rolesCollection(propertyId),
    (snapshot) => {
      const roles = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as CustomRole)
      roles.sort((a, b) => a.name.localeCompare(b.name))
      onData(roles)
    },
    (err) => onError(err),
  )
}

export function subscribeToGroups(
  propertyId: string,
  onData: (groups: UserGroup[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    groupsCollection(propertyId),
    (snapshot) => {
      const groups = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as UserGroup)
      groups.sort((a, b) => a.name.localeCompare(b.name))
      onData(groups)
    },
    (err) => onError(err),
  )
}

export async function createRole(propertyId: string, input: CreateRoleInput): Promise<string> {
  const ref = doc(rolesCollection(propertyId))
  await setDoc(ref, {
    name: input.name,
    description: input.description ?? '',
    permissions: input.permissions,
    isSystem: false,
    createdAt: new Date().toISOString(),
  })
  return ref.id
}

export async function updateRole(
  propertyId: string,
  roleId: string,
  input: Partial<CreateRoleInput>,
): Promise<void> {
  const data: Record<string, unknown> = {}
  if (input.name !== undefined) data.name = input.name
  if (input.description !== undefined) data.description = input.description
  if (input.permissions !== undefined) data.permissions = input.permissions
  await updateDoc(doc(rolesCollection(propertyId), roleId), data)
}

export async function deleteRole(propertyId: string, roleId: string): Promise<void> {
  await deleteDoc(doc(rolesCollection(propertyId), roleId))
}

export async function createGroup(propertyId: string, input: CreateGroupInput): Promise<string> {
  const ref = doc(groupsCollection(propertyId))
  await setDoc(ref, {
    name: input.name,
    description: input.description ?? '',
    roleId: input.roleId,
    createdAt: new Date().toISOString(),
  })
  return ref.id
}

export async function updateGroup(
  propertyId: string,
  groupId: string,
  input: Partial<CreateGroupInput>,
): Promise<void> {
  const data: Record<string, unknown> = {}
  if (input.name !== undefined) data.name = input.name
  if (input.description !== undefined) data.description = input.description
  if (input.roleId !== undefined) data.roleId = input.roleId
  await updateDoc(doc(groupsCollection(propertyId), groupId), data)
}

export async function deleteGroup(propertyId: string, groupId: string): Promise<void> {
  await deleteDoc(doc(groupsCollection(propertyId), groupId))
}

export async function updateStaffAssignment(
  uid: string,
  assignment: StaffAssignment,
): Promise<void> {
  await updateDoc(doc(db, 'staff', uid), {
    assignmentType: assignment.assignmentType,
    roleId:
      assignment.assignmentType === 'direct' ? assignment.roleId : deleteField(),
    groupId:
      assignment.assignmentType === 'group' ? assignment.groupId : deleteField(),
  })
}

export function countStaffUsingRole(staff: { roleId?: string; groupId?: string; assignmentType: string }[], roleId: string, groups: UserGroup[]): number {
  return staff.filter((s) => {
    if (s.assignmentType === 'direct') return s.roleId === roleId
    if (s.groupId) return groups.find((g) => g.id === s.groupId)?.roleId === roleId
    return false
  }).length
}

export function countStaffInGroup(staff: { groupId?: string }[], groupId: string): number {
  return staff.filter((s) => s.groupId === groupId).length
}
