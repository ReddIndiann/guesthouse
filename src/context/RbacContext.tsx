import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from './AuthContext'
import {
  createGroup,
  createRole,
  deleteGroup,
  deleteRole,
  ensureSystemAdminRole,
  subscribeToGroups,
  subscribeToRoles,
  updateGroup,
  updateRole,
  updateStaffAssignment,
} from '../lib/accessControl'
import { createStaffAuthUser } from '../lib/staff'
import type {
  CreateGroupInput,
  CreateRoleInput,
  CreateStaffInput,
  CustomRole,
  Permission,
  StaffAssignment,
  UserGroup,
} from '../types/auth'
import {
  getGroupLabel,
  getRoleLabel,
  hasPermission,
  isSystemAdmin,
  resolvePermissions,
  resolveRoleId,
} from '../utils/permissions'

interface RbacContextValue {
  roles: CustomRole[]
  groups: UserGroup[]
  permissions: Permission[]
  effectiveRoleId: string | null
  loading: boolean
  can: (permission: Permission) => boolean
  getRoleName: (roleId?: string) => string
  getGroupName: (groupId?: string) => string
  createStaff: (input: CreateStaffInput) => Promise<void>
  assignStaff: (uid: string, assignment: StaffAssignment) => Promise<void>
  createCustomRole: (input: CreateRoleInput) => Promise<void>
  updateCustomRole: (roleId: string, input: Partial<CreateRoleInput>) => Promise<void>
  removeCustomRole: (roleId: string) => Promise<void>
  createUserGroup: (input: CreateGroupInput) => Promise<void>
  updateUserGroup: (groupId: string, input: Partial<CreateGroupInput>) => Promise<void>
  removeUserGroup: (groupId: string) => Promise<void>
}

const RbacContext = createContext<RbacContextValue | null>(null)

export function RbacProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth()
  const [roles, setRoles] = useState<CustomRole[]>([])
  const [groups, setGroups] = useState<UserGroup[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.propertyId) {
      setRoles([])
      setGroups([])
      setLoading(false)
      return
    }

    setLoading(true)
    let ready = 0
    const markReady = () => {
      ready += 1
      if (ready >= 2) setLoading(false)
    }

    ensureSystemAdminRole(profile.propertyId).catch(console.error)

    const unsubRoles = subscribeToRoles(profile.propertyId, (data) => {
      setRoles(data)
      markReady()
    }, console.error)

    const unsubGroups = subscribeToGroups(profile.propertyId, (data) => {
      setGroups(data)
      markReady()
    }, console.error)

    return () => {
      unsubRoles()
      unsubGroups()
    }
  }, [profile?.propertyId])

  const permissions = useMemo(
    () => resolvePermissions(profile, roles, groups),
    [profile, roles, groups],
  )

  const effectiveRoleId = useMemo(
    () => resolveRoleId(profile, groups),
    [profile, groups],
  )

  const can = useCallback(
    (permission: Permission) => hasPermission(permissions, permission),
    [permissions],
  )

  const getRoleName = useCallback(
    (roleId?: string) => getRoleLabel(roleId, roles),
    [roles],
  )

  const getGroupName = useCallback(
    (groupId?: string) => getGroupLabel(groupId, groups),
    [groups],
  )

  const createStaff = useCallback(
    async (input: CreateStaffInput) => {
      if (!user || !profile) throw new Error('Not authenticated')
      if (!can('users.create')) throw new Error('No permission to create users')
      await createStaffAuthUser(input, profile.propertyId, user.uid)
    },
    [user, profile, can],
  )

  const assignStaff = useCallback(
    async (uid: string, assignment: StaffAssignment) => {
      if (!profile) throw new Error('Not authenticated')
      if (!can('users.assign')) throw new Error('No permission to assign users')
      if (uid === user?.uid && !isSystemAdmin(profile)) {
        throw new Error('You cannot change your own assignment')
      }
      if (uid === user?.uid && assignment.assignmentType === 'direct') {
        const newRole = roles.find((r) => r.id === assignment.roleId)
        if (!newRole?.isSystem) {
          throw new Error('You cannot remove your own admin access')
        }
      }
      await updateStaffAssignment(uid, assignment)
    },
    [profile, user, can, roles],
  )

  const createCustomRole = useCallback(
    async (input: CreateRoleInput) => {
      if (!profile) throw new Error('Not authenticated')
      if (!can('roles.manage')) throw new Error('No permission')
      await createRole(profile.propertyId, input)
    },
    [profile, can],
  )

  const updateCustomRole = useCallback(
    async (roleId: string, input: Partial<CreateRoleInput>) => {
      if (!profile) throw new Error('Not authenticated')
      if (!can('roles.manage')) throw new Error('No permission')
      await updateRole(profile.propertyId, roleId, input)
    },
    [profile, can],
  )

  const removeCustomRole = useCallback(
    async (roleId: string) => {
      if (!profile) throw new Error('Not authenticated')
      if (!can('roles.manage')) throw new Error('No permission')
      const role = roles.find((r) => r.id === roleId)
      if (role?.isSystem) throw new Error('System roles cannot be deleted')
      await deleteRole(profile.propertyId, roleId)
    },
    [profile, can, roles],
  )

  const createUserGroup = useCallback(
    async (input: CreateGroupInput) => {
      if (!profile) throw new Error('Not authenticated')
      if (!can('groups.manage')) throw new Error('No permission')
      await createGroup(profile.propertyId, input)
    },
    [profile, can],
  )

  const updateUserGroup = useCallback(
    async (groupId: string, input: Partial<CreateGroupInput>) => {
      if (!profile) throw new Error('Not authenticated')
      if (!can('groups.manage')) throw new Error('No permission')
      await updateGroup(profile.propertyId, groupId, input)
    },
    [profile, can],
  )

  const removeUserGroup = useCallback(
    async (groupId: string) => {
      if (!profile) throw new Error('Not authenticated')
      if (!can('groups.manage')) throw new Error('No permission')
      await deleteGroup(profile.propertyId, groupId)
    },
    [profile, can],
  )

  const value = useMemo(
    () => ({
      roles,
      groups,
      permissions,
      effectiveRoleId,
      loading,
      can,
      getRoleName,
      getGroupName,
      createStaff,
      assignStaff,
      createCustomRole,
      updateCustomRole,
      removeCustomRole,
      createUserGroup,
      updateUserGroup,
      removeUserGroup,
    }),
    [
      roles,
      groups,
      permissions,
      effectiveRoleId,
      loading,
      can,
      getRoleName,
      getGroupName,
      createStaff,
      assignStaff,
      createCustomRole,
      updateCustomRole,
      removeCustomRole,
      createUserGroup,
      updateUserGroup,
      removeUserGroup,
    ],
  )

  return <RbacContext.Provider value={value}>{children}</RbacContext.Provider>
}

export function useRbac() {
  const ctx = useContext(RbacContext)
  if (!ctx) throw new Error('useRbac must be used within RbacProvider')
  return ctx
}

/** @deprecated Use useRbac().can instead */
export function usePermission(permission: Permission): boolean {
  const { can } = useRbac()
  return can(permission)
}
