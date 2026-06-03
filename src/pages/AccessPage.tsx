import { useEffect, useState } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel } from '../components/ui/Panel'
import { useAuth } from '../context/AuthContext'
import { useRbac } from '../context/RbacContext'
import { subscribeToStaff } from '../lib/firestore'
import { countStaffInGroup, countStaffUsingRole } from '../lib/accessControl'
import type {
  AssignmentType,
  CreateGroupInput,
  CreateRoleInput,
  Permission,
  StaffProfile,
} from '../types/auth'
import { PERMISSION_TAB_GROUPS } from '../types/auth'

type AccessTab = 'roles' | 'groups' | 'users'

export function AccessPage() {
  const { can } = useRbac()
  const defaultTab: AccessTab = can('roles.view') ? 'roles' : can('groups.view') ? 'groups' : 'users'
  const [tab, setTab] = useState<AccessTab>(defaultTab)

  const tabs: { id: AccessTab; label: string; show: boolean }[] = [
    { id: 'roles', label: 'Roles', show: can('roles.view') },
    { id: 'groups', label: 'Groups', show: can('groups.view') },
    { id: 'users', label: 'Users', show: can('users.view') },
  ]

  return (
    <div>
      <PageHeader title="Access control" subtitle="Custom roles, groups, and user assignments" />

      <div className="mb-6 flex gap-2 overflow-x-auto scrollbar-none">
        {tabs.filter((t) => t.show).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-[var(--color-accent)] text-white'
                : 'bg-white text-[var(--color-muted)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'roles' && can('roles.view') && <RolesTab />}
      {tab === 'groups' && can('groups.view') && <GroupsTab />}
      {tab === 'users' && can('users.view') && <UsersTab />}
    </div>
  )
}

function RolesTab() {
  const {
    roles,
    groups,
    can,
    createCustomRole,
    updateCustomRole,
    removeCustomRole,
  } = useRbac()
  const { profile } = useAuth()
  const [staff, setStaff] = useState<StaffProfile[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selected, setSelected] = useState<Set<Permission>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!profile?.propertyId) return
    return subscribeToStaff(profile.propertyId, setStaff, () => {})
  }, [profile?.propertyId])

  const togglePermission = (perm: Permission) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(perm)) next.delete(perm)
      else next.add(perm)
      return next
    })
  }

  const toggleTabGroup = (perms: Permission[]) => {
    const allSelected = perms.every((p) => selected.has(p))
    setSelected((prev) => {
      const next = new Set(prev)
      if (allSelected) perms.forEach((p) => next.delete(p))
      else perms.forEach((p) => next.add(p))
      return next
    })
  }

  const startEdit = (roleId: string) => {
    const role = roles.find((r) => r.id === roleId)
    if (!role) return
    setEditingId(roleId)
    setName(role.name)
    setDescription(role.description ?? '')
    setSelected(new Set(role.permissions))
  }

  const resetForm = () => {
    setEditingId(null)
    setName('')
    setDescription('')
    setSelected(new Set())
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    const input: CreateRoleInput = {
      name,
      description,
      permissions: [...selected],
    }
    try {
      if (editingId) {
        await updateCustomRole(editingId, input)
        setSuccess('Role updated')
      } else {
        await createCustomRole(input)
        setSuccess('Role created')
      }
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save role')
    }
  }

  const handleDelete = async (roleId: string) => {
    setError(null)
    try {
      await removeCustomRole(roleId)
      setSuccess('Role deleted')
      if (editingId === roleId) resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete role')
    }
  }

  if (!can('roles.manage')) {
    return (
      <Panel>
        <ul className="divide-y divide-[var(--color-line)]">
          {roles.map((role) => (
            <li key={role.id} className="py-3 first:pt-0 last:pb-0">
              <p className="font-medium">{role.name}</p>
              <p className="text-xs text-[var(--color-muted)]">{role.description}</p>
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                {role.permissions.length} permission{role.permissions.length !== 1 ? 's' : ''}
              </p>
            </li>
          ))}
        </ul>
      </Panel>
    )
  }

  return (
    <div className="space-y-6">
      {error && <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      {success && <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</p>}

      <Panel>
        <h2 className="mb-4 text-sm font-medium">{editingId ? 'Edit role' : 'Create role'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Role name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2.5"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Description</span>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2.5"
              />
            </label>
          </div>

          <div className="space-y-4">
            <p className="text-sm font-medium">Tabs & permissions</p>
            {PERMISSION_TAB_GROUPS.map((group) => {
              const permKeys = group.permissions.map((p) => p.key)
              const allOn = permKeys.every((p) => selected.has(p))
              return (
                <div key={group.tab} className="rounded-xl border border-[var(--color-line)] p-4">
                  <label className="mb-3 flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={allOn}
                      onChange={() => toggleTabGroup(permKeys)}
                      className="rounded"
                    />
                    <span className="text-sm font-semibold">{group.tab} tab</span>
                  </label>
                  <div className="ml-6 space-y-2">
                    {group.permissions.map((perm) => (
                      <label key={perm.key} className="flex cursor-pointer items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selected.has(perm.key)}
                          onChange={() => togglePermission(perm.key)}
                          className="rounded"
                        />
                        {perm.label}
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!name || selected.size === 0}
              className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {editingId ? 'Save role' : 'Create role'}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="rounded-lg px-4 py-2 text-sm text-[var(--color-muted)]">
                Cancel
              </button>
            )}
          </div>
        </form>
      </Panel>

      <Panel className="!p-0">
        <div className="border-b border-[var(--color-line)] px-6 py-4">
          <h2 className="text-sm font-medium">All roles</h2>
        </div>
        <ul className="divide-y divide-[var(--color-line)]">
          {roles.map((role) => (
            <li key={role.id} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">
                  {role.name}
                  {role.isSystem && (
                    <span className="ml-2 text-xs text-[var(--color-muted)]">(system)</span>
                  )}
                </p>
                <p className="text-sm text-[var(--color-muted)]">{role.description}</p>
                <p className="mt-1 text-xs text-[var(--color-muted)]">
                  {countStaffUsingRole(staff, role.id, groups)} user
                  {countStaffUsingRole(staff, role.id, groups) !== 1 ? 's' : ''} ·{' '}
                  {role.permissions.length} permissions
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(role.id)}
                  className="rounded-lg border border-[var(--color-line)] px-3 py-1.5 text-sm"
                >
                  Edit
                </button>
                {!role.isSystem && (
                  <button
                    type="button"
                    onClick={() => handleDelete(role.id)}
                    className="rounded-lg px-3 py-1.5 text-sm text-rose-600"
                  >
                    Delete
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}

function GroupsTab() {
  const { roles, groups, can, createUserGroup, updateUserGroup, removeUserGroup, getRoleName } = useRbac()
  const { profile } = useAuth()
  const [staff, setStaff] = useState<StaffProfile[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [roleId, setRoleId] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!profile?.propertyId) return
    return subscribeToStaff(profile.propertyId, setStaff, () => {})
  }, [profile?.propertyId])

  useEffect(() => {
    if (roles.length && !roleId) setRoleId(roles[0].id)
  }, [roles, roleId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const input: CreateGroupInput = { name, description, roleId }
    try {
      if (editingId) await updateUserGroup(editingId, input)
      else await createUserGroup(input)
      setName('')
      setDescription('')
      setEditingId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save group')
    }
  }

  return (
    <div className="space-y-6">
      {error && <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

      {can('groups.manage') && (
        <Panel>
          <h2 className="mb-4 text-sm font-medium">{editingId ? 'Edit group' : 'Create group'}</h2>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Group name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Front desk"
                className="rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2.5"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Assigned role</span>
              <select
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                className="rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2.5"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
              <span className="font-medium">Description</span>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2.5"
              />
            </label>
            <button type="submit" className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white sm:w-fit">
              {editingId ? 'Save group' : 'Create group'}
            </button>
          </form>
        </Panel>
      )}

      <Panel className="!p-0">
        <ul className="divide-y divide-[var(--color-line)]">
          {groups.map((group) => (
            <li key={group.id} className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">{group.name}</p>
                <p className="text-sm text-[var(--color-muted)]">
                  Role: {getRoleName(group.roleId)} · {countStaffInGroup(staff, group.id)} members
                </p>
              </div>
              {can('groups.manage') && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(group.id)
                      setName(group.name)
                      setDescription(group.description ?? '')
                      setRoleId(group.roleId)
                    }}
                    className="rounded-lg border border-[var(--color-line)] px-3 py-1.5 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => removeUserGroup(group.id)}
                    className="rounded-lg px-3 py-1.5 text-sm text-rose-600"
                  >
                    Delete
                  </button>
                </div>
              )}
            </li>
          ))}
          {groups.length === 0 && (
            <li className="px-6 py-8 text-center text-sm text-[var(--color-muted)]">No groups yet</li>
          )}
        </ul>
      </Panel>
    </div>
  )
}

function UsersTab() {
  const { profile } = useAuth()
  const { roles, groups, can, createStaff, assignStaff, getRoleName, getGroupName } = useRbac()
  const [staff, setStaff] = useState<StaffProfile[]>([])
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [assignmentType, setAssignmentType] = useState<AssignmentType>('direct')
  const [roleId, setRoleId] = useState('')
  const [groupId, setGroupId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!profile?.propertyId) return
    return subscribeToStaff(profile.propertyId, setStaff, (err) => setError(err.message))
  }, [profile?.propertyId])

  useEffect(() => {
    if (roles.length && !roleId) setRoleId(roles.find((r) => !r.isSystem)?.id ?? roles[0].id)
    if (groups.length && !groupId) setGroupId(groups[0].id)
  }, [roles, groups, roleId, groupId])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(null)
    try {
      const name = displayName || email
      await createStaff({
        email,
        password,
        displayName,
        assignment:
          assignmentType === 'direct'
            ? { assignmentType: 'direct', roleId }
            : { assignmentType: 'group', groupId },
      })
      setDisplayName('')
      setEmail('')
      setPassword('')
      setSuccess(`Account created for ${name}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAssignmentChange = async (uid: string, type: AssignmentType, value: string) => {
    setError(null)
    try {
      if (type === 'direct') {
        await assignStaff(uid, { assignmentType: 'direct', roleId: value })
      } else {
        await assignStaff(uid, { assignmentType: 'group', groupId: value })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update assignment')
    }
  }

  return (
    <div className="space-y-6">
      {can('users.create') && (
        <Panel>
          <h2 className="mb-4 text-sm font-medium">Create user</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Full name</span>
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required className="rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2.5" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Email</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2.5" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Temporary password</span>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2.5" />
              </label>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">Assign access via</p>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" checked={assignmentType === 'direct'} onChange={() => setAssignmentType('direct')} />
                  Role (direct)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" checked={assignmentType === 'group'} onChange={() => setAssignmentType('group')} />
                  Group
                </label>
              </div>
              {assignmentType === 'direct' ? (
                <select value={roleId} onChange={(e) => setRoleId(e.target.value)} className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2.5 text-sm sm:max-w-xs">
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              ) : (
                <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2.5 text-sm sm:max-w-xs">
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name} ({getRoleName(g.roleId)})</option>
                  ))}
                </select>
              )}
            </div>

            <button type="submit" disabled={submitting} className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
              {submitting ? 'Creating…' : 'Create user'}
            </button>
          </form>
        </Panel>
      )}

      {error && <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      {success && <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</p>}

      <Panel className="!p-0">
        <div className="border-b border-[var(--color-line)] px-6 py-4">
          <h2 className="text-sm font-medium">Team members</h2>
        </div>
        <ul className="divide-y divide-[var(--color-line)]">
          {staff.map((member) => (
            <li key={member.uid} className="flex flex-col gap-3 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="font-medium">
                  {member.displayName}
                  {member.uid === profile?.uid && <span className="ml-2 text-xs text-[var(--color-muted)]">(you)</span>}
                </p>
                <p className="truncate text-sm text-[var(--color-muted)]">{member.email}</p>
                <p className="mt-1 text-xs text-[var(--color-muted)]">
                  {member.assignmentType === 'group'
                    ? `Group: ${getGroupName(member.groupId)} → ${getRoleName(groups.find((g) => g.id === member.groupId)?.roleId)}`
                    : `Role: ${getRoleName(member.roleId)}`}
                </p>
              </div>
              {can('users.assign') && member.uid !== profile?.uid && (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <select
                    value={member.assignmentType}
                    onChange={(e) => {
                      const type = e.target.value as AssignmentType
                      if (type === 'direct' && roles[0]) {
                        handleAssignmentChange(member.uid, 'direct', member.roleId ?? roles[0].id)
                      } else if (type === 'group' && groups[0]) {
                        handleAssignmentChange(member.uid, 'group', member.groupId ?? groups[0].id)
                      }
                    }}
                    className="rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm"
                  >
                    <option value="direct">Direct role</option>
                    <option value="group">Via group</option>
                  </select>
                  {member.assignmentType === 'direct' ? (
                    <select
                      value={member.roleId ?? ''}
                      onChange={(e) => handleAssignmentChange(member.uid, 'direct', e.target.value)}
                      className="rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm"
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={member.groupId ?? ''}
                      onChange={(e) => handleAssignmentChange(member.uid, 'group', e.target.value)}
                      className="rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm"
                    >
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}
