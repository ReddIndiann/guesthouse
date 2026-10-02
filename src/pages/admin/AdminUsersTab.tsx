import { useState, useEffect, useMemo, useCallback } from 'react'
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import type { Organization, PropertyItem } from '../../types/tenant'
import type { StaffProfile } from '../../types/auth'
import { AddStaffModal } from './AddStaffModal'

interface AdminUsersTabProps {
  organizations: Organization[]
  adminUid: string
}

export function AdminUsersTab({ organizations, adminUid }: AdminUsersTabProps) {
  const [staffList, setStaffList] = useState<StaffProfile[]>([])
  const [properties, setProperties] = useState<PropertyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'super_admin' | 'org_admin' | 'staff'>('all')
  const [orgFilter, setOrgFilter] = useState<string>('all')
  const [processingUid, setProcessingUid] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [addStaffOpen, setAddStaffOpen] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [staffSnap, propSnap] = await Promise.all([
        getDocs(collection(db, 'staff')),
        getDocs(collection(db, 'properties')),
      ])

      const staffItems: StaffProfile[] = staffSnap.docs.map((d) => {
        const data = d.data()
        const isSuper = Boolean(
          data.isSuperAdmin === true ||
          data.userType === 'super_admin' ||
          data.roleId === 'system-admin' ||
          data.role === 'admin'
        )
        const propId = (data.propertyId as string) ?? ''
        return {
          uid: d.id,
          email: (data.email as string) || '',
          displayName: (data.displayName as string) || (data.email ? data.email.split('@')[0] : 'User'),
          propertyId: propId,
          assignmentType: data.assignmentType || 'direct',
          roleId: data.roleId || data.role,
          groupId: data.groupId,
          createdAt: (data.createdAt as string) || '',
          isSuperAdmin: isSuper,
          organizationId: data.organizationId as string | undefined,
          organizationName: data.organizationName as string | undefined,
          accessibleProperties: Array.isArray(data.accessibleProperties) ? data.accessibleProperties : propId ? [propId] : [],
          userType: (data.userType as 'super_admin' | 'org_admin' | 'staff') || (isSuper ? 'super_admin' : 'staff'),
          pendingApproval: Boolean(data.pendingApproval),
        }
      })

      const propItems: PropertyItem[] = propSnap.docs.map((d) => {
        const data = d.data()
        return {
          id: d.id,
          organizationId: data.organizationId || '',
          name: data.name || data.settings?.name || 'Main Property',
          code: data.code,
          address: data.address,
          phone: data.phone,
          createdAt: data.createdAt || '',
        }
      })

      setStaffList(staffItems)
      setProperties(propItems)
    } catch (err) {
      console.error('Failed to load staff list:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const orgMap = useMemo(() => new Map(organizations.map((o) => [o.id, o.name])), [organizations])
  const propMap = useMemo(() => new Map(properties.map((p) => [p.id, p])), [properties])

  const counts = useMemo(() => {
    return {
      all: staffList.length,
      super_admin: staffList.filter((s) => s.isSuperAdmin).length,
      org_admin: staffList.filter((s) => s.userType === 'org_admin' && !s.isSuperAdmin).length,
      staff: staffList.filter((s) => !s.isSuperAdmin && s.userType !== 'org_admin').length,
    }
  }, [staffList])

  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      if (typeFilter === 'super_admin' && !s.isSuperAdmin) return false
      if (typeFilter === 'org_admin' && (s.isSuperAdmin || s.userType !== 'org_admin')) return false
      if (typeFilter === 'staff' && (s.isSuperAdmin || s.userType === 'org_admin')) return false

      if (orgFilter !== 'all') {
        if (orgFilter === 'none' && s.organizationId) return false
        if (orgFilter !== 'none' && s.organizationId !== orgFilter) return false
      }

      if (!search.trim()) return true
      const q = search.toLowerCase()
      const orgName = (s.organizationId ? orgMap.get(s.organizationId) : '') || s.organizationName || ''
      const prop = propMap.get(s.propertyId)
      const propName = prop?.name || ''
      const propCode = prop?.code || ''

      return (
        s.displayName.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        orgName.toLowerCase().includes(q) ||
        propName.toLowerCase().includes(q) ||
        propCode.toLowerCase().includes(q) ||
        (s.roleId && s.roleId.toLowerCase().includes(q))
      )
    })
  }, [staffList, typeFilter, orgFilter, search, orgMap, propMap])

  const toggleSuperAdmin = async (userUid: string, currentStatus: boolean) => {
    setFeedback(null)
    setProcessingUid(userUid)
    try {
      const nextStatus = !currentStatus
      await updateDoc(doc(db, 'staff', userUid), {
        isSuperAdmin: nextStatus,
        userType: nextStatus ? 'super_admin' : 'staff',
      })

      setStaffList((prev) =>
        prev.map((s) =>
          s.uid === userUid
            ? {
                ...s,
                isSuperAdmin: nextStatus,
                userType: nextStatus ? 'super_admin' : 'staff',
              }
            : s,
        ),
      )
      setFeedback(`User privileges updated.`)
    } catch (err) {
      setFeedback(`Failed to update user: ${err instanceof Error ? err.message : 'Error'}`)
    } finally {
      setProcessingUid(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Search and Org Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Search by name, email, or branch…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3.5 py-2 pl-9 text-sm text-[var(--color-ink)] placeholder-[var(--color-muted)] focus:outline-none focus:border-[var(--color-accent)] transition"
          />
          <svg
            className="absolute left-3 top-2.5 h-4 w-4 text-[var(--color-muted)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--color-muted)] font-medium shrink-0">Organization:</span>
            <select
              value={orgFilter}
              onChange={(e) => setOrgFilter(e.target.value)}
              className="rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-xs font-medium text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)]"
            >
              <option value="all">All organizations</option>
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
              <option value="none">Independent</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setAddStaffOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#345c43] transition shadow-xs shrink-0 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            Add staff
          </button>
        </div>
      </div>

      {/* Role Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
        <button
          type="button"
          onClick={() => setTypeFilter('all')}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
            typeFilter === 'all'
              ? 'bg-[var(--color-ink)] text-white'
              : 'bg-white border border-[var(--color-line)] text-[var(--color-muted)] hover:text-[var(--color-ink)]'
          }`}
        >
          All ({counts.all})
        </button>

        <button
          type="button"
          onClick={() => setTypeFilter('super_admin')}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
            typeFilter === 'super_admin'
              ? 'bg-[var(--color-accent)] text-white'
              : 'bg-white border border-[var(--color-line)] text-[var(--color-muted)] hover:text-[var(--color-ink)]'
          }`}
        >
          Platform admins ({counts.super_admin})
        </button>

        <button
          type="button"
          onClick={() => setTypeFilter('org_admin')}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
            typeFilter === 'org_admin'
              ? 'bg-[var(--color-accent)] text-white'
              : 'bg-white border border-[var(--color-line)] text-[var(--color-muted)] hover:text-[var(--color-ink)]'
          }`}
        >
          Organization admins ({counts.org_admin})
        </button>

        <button
          type="button"
          onClick={() => setTypeFilter('staff')}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
            typeFilter === 'staff'
              ? 'bg-[var(--color-accent)] text-white'
              : 'bg-white border border-[var(--color-line)] text-[var(--color-muted)] hover:text-[var(--color-ink)]'
          }`}
        >
          Property staff ({counts.staff})
        </button>
      </div>

      {feedback && (
        <div className="rounded-xl bg-white border border-[var(--color-line)] p-3 text-xs text-[var(--color-ink)] shadow-xs flex items-center justify-between">
          <span>{feedback}</span>
          <button type="button" onClick={() => setFeedback(null)} className="text-[var(--color-muted)] hover:text-[var(--color-ink)]">✕</button>
        </div>
      )}

      {/* Staff Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-line)] border-t-[var(--color-accent)]" />
          <p className="text-xs text-[var(--color-muted)]">Loading staff directory…</p>
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="rounded-2xl border border-[var(--color-line)] bg-white p-12 text-center">
          <p className="text-sm font-medium text-[var(--color-ink)]">No users found</p>
          <p className="text-xs text-[var(--color-muted)] mt-1">Try modifying your search or filter options</p>
          <button
            type="button"
            onClick={() => setAddStaffOpen(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#345c43] transition shadow-xs cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            Add staff member
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[var(--color-line)] bg-[var(--color-cream)] text-[11px] font-semibold text-[var(--color-muted)]">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Level</th>
                  <th className="py-3 px-4">Organization</th>
                  <th className="py-3 px-4">Assigned branch</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-line)]">
                {filteredStaff.map((member) => {
                  const isProcessing = processingUid === member.uid
                  const orgName = (member.organizationId ? orgMap.get(member.organizationId) : '') || member.organizationName
                  const prop = propMap.get(member.propertyId)
                  const propName = prop?.name || (member.propertyId ? 'Branch Assigned' : 'Unassigned')
                  const propCode = prop?.code

                  return (
                    <tr key={member.uid} className="hover:bg-[var(--color-cream)] transition-colors">
                      {/* User Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-cream)] border border-[var(--color-line)] text-xs font-medium text-[var(--color-ink)]">
                            {member.displayName.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-[var(--color-ink)] truncate">
                              {member.displayName}
                            </p>
                            <p className="text-[11px] text-[var(--color-muted)] truncate">{member.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Platform Level */}
                      <td className="py-3 px-4">
                        {member.isSuperAdmin ? (
                          <span className="rounded-full bg-[var(--color-accent-soft)] px-2.5 py-0.5 text-[10px] font-medium text-[var(--color-accent)]">
                            Super admin
                          </span>
                        ) : member.userType === 'org_admin' ? (
                          <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-[10px] font-medium text-purple-800">
                            Org admin
                          </span>
                        ) : (
                          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-medium text-gray-700">
                            Staff
                          </span>
                        )}
                      </td>

                      {/* Organization Name */}
                      <td className="py-3 px-4">
                        {orgName ? (
                          <span className="font-medium text-[var(--color-ink)]">{orgName}</span>
                        ) : member.isSuperAdmin ? (
                          <span className="text-[11px] text-[var(--color-muted)] italic">
                            Platform-wide
                          </span>
                        ) : (
                          <span className="text-[11px] text-[var(--color-muted)]">
                            Independent
                          </span>
                        )}
                      </td>

                      {/* Assigned Branch */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[var(--color-ink)]">{propName}</span>
                          {propCode && (
                            <span className="rounded bg-[var(--color-cream)] border border-[var(--color-line)] px-1 py-0.2 text-[9px] font-mono text-[var(--color-muted)]">
                              {propCode}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Operational Role */}
                      <td className="py-3 px-4">
                        <span className="text-[var(--color-muted)] capitalize">
                          {member.roleId || 'Staff'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => toggleSuperAdmin(member.uid, member.isSuperAdmin || false)}
                          className="rounded-lg border border-[var(--color-line)] bg-white px-2.5 py-1 text-[11px] text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-cream)] transition"
                        >
                          {isProcessing
                            ? 'Updating…'
                            : member.isSuperAdmin
                              ? 'Remove admin'
                              : 'Grant admin'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      <AddStaffModal
        open={addStaffOpen}
        onClose={() => setAddStaffOpen(false)}
        organizations={organizations}
        properties={properties}
        adminUid={adminUid}
        onCreated={() => {
          loadData()
          setFeedback('Staff member created successfully.')
        }}
      />
    </div>
  )
}
