import {
  ALL_PERMISSIONS,
  SYSTEM_ADMIN_ROLE_ID,
  type CreateGroupInput,
  type CreateRoleInput,
  type CustomRole,
  type Permission,
  type StaffAssignment,
  type StaffProfile,
  type UserGroup,
} from '../types/auth'

export function resolveRoleId(
  profile: StaffProfile | null,
  groups: UserGroup[],
): string | null {
  if (!profile) return null
  if (profile.assignmentType === 'group' && profile.groupId) {
    return groups.find((g) => g.id === profile.groupId)?.roleId ?? null
  }
  return profile.roleId ?? null
}

export function resolvePermissions(
  profile: StaffProfile | null,
  roles: CustomRole[],
  groups: UserGroup[],
): Permission[] {
  const roleId = resolveRoleId(profile, groups)
  if (!roleId) return []
  if (roleId === SYSTEM_ADMIN_ROLE_ID) return ALL_PERMISSIONS
  const role = roles.find((r) => r.id === roleId)
  return role?.permissions ?? []
}

export function hasPermission(
  permissions: Permission[],
  permission: Permission,
): boolean {
  return permissions.includes(permission)
}

export function isSystemAdmin(profile: StaffProfile | null): boolean {
  if (!profile) return false
  if (profile.assignmentType === 'direct') {
    return profile.roleId === SYSTEM_ADMIN_ROLE_ID
  }
  return false
}

export function canWriteProperty(permissions: Permission[]): boolean {
  return permissions.some((p) =>
    [
      'rooms.updateStatus',
      'rooms.create',
      'rooms.update',
      'rooms.delete',
      'bookings.create',
      'bookings.checkin',
      'bookings.checkout',
      'bookings.cancel',
      'roles.manage',
      'groups.manage',
      'users.create',
      'users.assign',
    ].includes(p),
  )
}

export function getRoleLabel(
  roleId: string | undefined,
  roles: CustomRole[],
): string {
  if (!roleId) return 'Unassigned'
  return roles.find((r) => r.id === roleId)?.name ?? roleId
}

export function getGroupLabel(
  groupId: string | undefined,
  groups: UserGroup[],
): string {
  if (!groupId) return '—'
  return groups.find((g) => g.id === groupId)?.name ?? groupId
}

export const DEFAULT_ROLE_TEMPLATES: Omit<CustomRole, 'createdAt'>[] = [
  {
    id: SYSTEM_ADMIN_ROLE_ID,
    name: 'Administrator',
    description: 'Full access to everything',
    permissions: ALL_PERMISSIONS,
    isSystem: true,
  },
  {
    id: 'template-manager',
    name: 'Manager',
    description: 'Manage rooms, bookings, and guests',
    permissions: [
      'dashboard.view',
      'rooms.view',
      'rooms.updateStatus',
      'rooms.create',
      'rooms.update',
      'rooms.delete',
      'bookings.view',
      'bookings.create',
      'bookings.checkin',
      'bookings.checkout',
      'bookings.cancel',
      'guests.view',
    ],
  },
  {
    id: 'template-receptionist',
    name: 'Receptionist',
    description: 'Front desk — check-in/out and bookings',
    permissions: [
      'dashboard.view',
      'rooms.view',
      'bookings.view',
      'bookings.create',
      'bookings.checkin',
      'bookings.checkout',
      'guests.view',
    ],
  },
  {
    id: 'template-viewer',
    name: 'Viewer',
    description: 'Read-only access',
    permissions: ['dashboard.view', 'rooms.view', 'bookings.view', 'guests.view'],
  },
]

export type {
  CreateGroupInput,
  CreateRoleInput,
  StaffAssignment,
}
