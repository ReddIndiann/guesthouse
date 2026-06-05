export type Permission =
  | 'dashboard.view'
  | 'rooms.view'
  | 'rooms.updateStatus'
  | 'rooms.create'
  | 'rooms.update'
  | 'rooms.delete'
  | 'bookings.view'
  | 'bookings.create'
  | 'bookings.update'
  | 'bookings.checkin'
  | 'bookings.checkout'
  | 'bookings.cancel'
  | 'guests.view'
  | 'housekeeping.view'
  | 'housekeeping.manage'
  | 'reports.view'
  | 'audit.view'
  | 'shifts.manage'
  | 'roles.view'
  | 'roles.manage'
  | 'groups.view'
  | 'groups.manage'
  | 'users.view'
  | 'users.create'
  | 'users.assign'

export const ALL_PERMISSIONS: Permission[] = [
  'dashboard.view',
  'rooms.view',
  'rooms.updateStatus',
  'rooms.create',
  'rooms.update',
  'rooms.delete',
  'bookings.view',
  'bookings.create',
  'bookings.update',
  'bookings.checkin',
  'bookings.checkout',
  'bookings.cancel',
  'guests.view',
  'housekeeping.view',
  'housekeeping.manage',
  'reports.view',
  'audit.view',
  'shifts.manage',
  'roles.view',
  'roles.manage',
  'groups.view',
  'groups.manage',
  'users.view',
  'users.create',
  'users.assign',
]

export const SYSTEM_ADMIN_ROLE_ID = 'system-admin'

export interface PermissionOption {
  key: Permission
  label: string
}

export interface PermissionTabGroup {
  tab: string
  permissions: PermissionOption[]
}

/** Tabs + actions shown when building a custom role */
export const PERMISSION_TAB_GROUPS: PermissionTabGroup[] = [
  {
    tab: 'Home',
    permissions: [{ key: 'dashboard.view', label: 'View dashboard' }],
  },
  {
    tab: 'Rooms',
    permissions: [
      { key: 'rooms.view', label: 'View rooms tab' },
      { key: 'rooms.updateStatus', label: 'Change room status' },
      { key: 'rooms.create', label: 'Add new rooms' },
      { key: 'rooms.update', label: 'Edit room details' },
      { key: 'rooms.delete', label: 'Delete rooms' },
    ],
  },
  {
    tab: 'Bookings',
    permissions: [
      { key: 'bookings.view', label: 'View bookings tab' },
      { key: 'bookings.create', label: 'Create bookings' },
      { key: 'bookings.update', label: 'Amend bookings (extend, change room, charges)' },
      { key: 'bookings.checkin', label: 'Check in guests' },
      { key: 'bookings.checkout', label: 'Check out guests' },
      { key: 'bookings.cancel', label: 'Cancel bookings' },
    ],
  },
  {
    tab: 'Guests',
    permissions: [{ key: 'guests.view', label: 'View guests tab' }],
  },
  {
    tab: 'Housekeeping',
    permissions: [
      { key: 'housekeeping.view', label: 'View housekeeping' },
      { key: 'housekeeping.manage', label: 'Manage tasks & maintenance' },
    ],
  },
  {
    tab: 'Reports',
    permissions: [{ key: 'reports.view', label: 'View revenue analytics & night audits' }],
  },
  {
    tab: 'Audit',
    permissions: [
      { key: 'audit.view', label: 'View activity log' },
      { key: 'shifts.manage', label: 'Manage staff shifts' },
    ],
  },
  {
    tab: 'Access',
    permissions: [
      { key: 'roles.view', label: 'View roles' },
      { key: 'roles.manage', label: 'Create & edit roles' },
      { key: 'groups.view', label: 'View groups' },
      { key: 'groups.manage', label: 'Create & edit groups' },
      { key: 'users.view', label: 'View users' },
      { key: 'users.create', label: 'Create users' },
      { key: 'users.assign', label: 'Assign roles & groups' },
    ],
  },
]

export interface CustomRole {
  id: string
  name: string
  description?: string
  permissions: Permission[]
  isSystem?: boolean
  createdAt: string
}

export interface UserGroup {
  id: string
  name: string
  description?: string
  roleId: string
  createdAt: string
}

export type AssignmentType = 'direct' | 'group'

export interface StaffProfile {
  uid: string
  email: string
  displayName: string
  propertyId: string
  assignmentType: AssignmentType
  roleId?: string
  groupId?: string
  createdAt: string
  createdBy?: string
}

export interface StaffAssignment {
  assignmentType: AssignmentType
  roleId?: string
  groupId?: string
}

export interface CreateStaffInput {
  email: string
  password: string
  displayName: string
  assignment: StaffAssignment
}

export interface CreateRoleInput {
  name: string
  description?: string
  permissions: Permission[]
}

export interface CreateGroupInput {
  name: string
  description?: string
  roleId: string
}
