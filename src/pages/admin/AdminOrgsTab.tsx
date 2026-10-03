import { useState, useMemo } from 'react'
import type { Organization, OrganizationStatus } from '../../types/tenant'
import {
  activateOrganization,
  approveOrganization,
  rejectOrganization,
  suspendOrganization,
} from '../../lib/tenants'
import { CreateOrgModal } from './CreateOrgModal'

interface AdminOrgsTabProps {
  organizations: Organization[]
  adminUid: string
  initialFilter?: OrganizationStatus | 'all'
}

export function AdminOrgsTab({ organizations, adminUid, initialFilter = 'all' }: AdminOrgsTabProps) {
  const [filter, setFilter] = useState<OrganizationStatus | 'all'>(initialFilter)
  const [search, setSearch] = useState('')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [rejectingOrg, setRejectingOrg] = useState<Organization | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const counts = useMemo(() => {
    return {
      all: organizations.length,
      pending_approval: organizations.filter((o) => o.status === 'pending_approval').length,
      active: organizations.filter((o) => o.status === 'active').length,
      suspended: organizations.filter((o) => o.status === 'suspended').length,
      rejected: organizations.filter((o) => o.status === 'rejected').length,
    }
  }, [organizations])

  const filteredOrgs = useMemo(() => {
    return organizations.filter((org) => {
      if (filter !== 'all' && org.status !== filter) return false
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        org.name.toLowerCase().includes(q) ||
        org.contactEmail.toLowerCase().includes(q) ||
        org.ownerName?.toLowerCase().includes(q) ||
        org.slug?.toLowerCase().includes(q)
      )
    })
  }, [organizations, filter, search])

  const handleApprove = async (orgId: string) => {
    setActionError(null)
    setProcessingId(orgId)
    try {
      await approveOrganization(orgId, adminUid)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to approve organization')
    } finally {
      setProcessingId(null)
    }
  }

  const handleRejectConfirm = async () => {
    if (!rejectingOrg) return
    setActionError(null)
    setProcessingId(rejectingOrg.id)
    try {
      await rejectOrganization(rejectingOrg.id, rejectReason.trim() || undefined)
      setRejectingOrg(null)
      setRejectReason('')
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to reject organization')
    } finally {
      setProcessingId(null)
    }
  }

  const handleSuspend = async (orgId: string) => {
    setActionError(null)
    setProcessingId(orgId)
    try {
      await suspendOrganization(orgId)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to suspend organization')
    } finally {
      setProcessingId(null)
    }
  }

  const handleActivate = async (orgId: string) => {
    setActionError(null)
    setProcessingId(orgId)
    try {
      await activateOrganization(orgId)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to activate organization')
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Search organizations…"
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

        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition shrink-0"
        >
          + New organization
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
            filter === 'all'
              ? 'bg-[var(--color-ink)] text-white'
              : 'bg-white border border-[var(--color-line)] text-[var(--color-muted)] hover:text-[var(--color-ink)]'
          }`}
        >
          All ({counts.all})
        </button>

        <button
          type="button"
          onClick={() => setFilter('pending_approval')}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
            filter === 'pending_approval'
              ? 'bg-amber-800 text-white'
              : 'bg-white border border-[var(--color-line)] text-amber-900 hover:bg-amber-50'
          }`}
        >
          Pending review ({counts.pending_approval})
        </button>

        <button
          type="button"
          onClick={() => setFilter('active')}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
            filter === 'active'
              ? 'bg-[var(--color-accent)] text-white'
              : 'bg-white border border-[var(--color-line)] text-[var(--color-muted)] hover:text-[var(--color-ink)]'
          }`}
        >
          Active ({counts.active})
        </button>

        <button
          type="button"
          onClick={() => setFilter('suspended')}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
            filter === 'suspended'
              ? 'bg-gray-800 text-white'
              : 'bg-white border border-[var(--color-line)] text-[var(--color-muted)] hover:text-[var(--color-ink)]'
          }`}
        >
          Suspended ({counts.suspended})
        </button>

        <button
          type="button"
          onClick={() => setFilter('rejected')}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
            filter === 'rejected'
              ? 'bg-rose-700 text-white'
              : 'bg-white border border-[var(--color-line)] text-[var(--color-muted)] hover:text-[var(--color-ink)]'
          }`}
        >
          Rejected ({counts.rejected})
        </button>
      </div>

      {actionError && (
        <div className="rounded-xl bg-rose-50 p-3.5 text-xs text-rose-700 border border-rose-200">
          {actionError}
        </div>
      )}

      {/* Organizations Directory */}
      {filteredOrgs.length === 0 ? (
        <div className="rounded-2xl border border-[var(--color-line)] bg-white p-12 text-center">
          <p className="text-sm font-medium text-[var(--color-ink)]">No organizations found</p>
          <p className="text-xs text-[var(--color-muted)] mt-1">
            {filter === 'pending_approval'
              ? 'No applications currently awaiting review.'
              : 'Try clearing your search or changing filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrgs.map((org) => {
            const isProcessing = processingId === org.id
            const isPending = org.status === 'pending_approval'
            const isActive = org.status === 'active'
            const isSuspended = org.status === 'suspended'
            const isRejected = org.status === 'rejected'

            return (
              <div
                key={org.id}
                className={`rounded-2xl border bg-white p-5 transition ${
                  isPending
                    ? 'border-amber-300/80 bg-amber-50/20'
                    : 'border-[var(--color-line)]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {/* Organization Photo / Logo */}
                    {org.imageUrl ? (
                      <img
                        src={org.imageUrl}
                        alt={org.name}
                        className="h-14 w-14 rounded-xl object-cover border border-[var(--color-line)] shrink-0 shadow-2xs"
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[var(--color-cream)] border border-[var(--color-line)] text-sm font-semibold text-[var(--color-muted)]">
                        {org.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-[var(--color-ink)]">
                          {org.name}
                        </h3>

                        {isPending && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-900">
                            Awaiting review
                          </span>
                        )}
                        {isActive && (
                          <span className="rounded-full bg-[var(--color-accent-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-accent)]">
                            Active
                          </span>
                        )}
                        {isSuspended && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700">
                            Suspended
                          </span>
                        )}
                        {isRejected && (
                          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700">
                            Rejected
                          </span>
                        )}

                        <span className="rounded bg-[var(--color-cream)] border border-[var(--color-line)] px-2 py-0.5 text-[10px] text-[var(--color-muted)] uppercase tracking-wider">
                          {org.plan}
                        </span>

                        {org.propertyType && (
                          <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-medium text-blue-800 capitalize">
                            {org.propertyType === 'airbnb' ? '🔑 Airbnb / Apt' : org.propertyType === 'hotel' ? '🏨 Hotel' : org.propertyType === 'resort' ? '🌴 Resort' : '🏡 Guest House'}
                          </span>
                        )}

                        {org.unitsRange && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-700">
                            {org.unitsRange}
                          </span>
                        )}
                      </div>

                      {/* Location & GPS */}
                      {(org.location || (org.latitude != null && org.longitude != null)) && (
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-ink)]">
                          {org.location && (
                            <span className="inline-flex items-center gap-1">
                              <svg className="w-3.5 h-3.5 text-[var(--color-accent)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 21s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 7.2c0 7.3-8 11.8-8 11.8z" />
                                <circle cx="12" cy="10" r="3" />
                              </svg>
                              <span>{org.location}</span>
                            </span>
                          )}

                          {org.latitude != null && org.longitude != null && (
                            <a
                              href={`https://www.google.com/maps?q=${org.latitude},${org.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-[var(--color-accent)] hover:underline"
                            >
                              <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="9" />
                                <path strokeLinecap="round" d="M12 3v3m0 12v3M3 12h3m12 0h3" />
                              </svg>
                              <span>{Number(org.latitude).toFixed(4)}, {Number(org.longitude).toFixed(4)} ↗</span>
                            </a>
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--color-muted)]">
                        <span>Contact: {org.ownerName || '—'}</span>
                        <span>Email: {org.contactEmail}</span>
                        {org.contactPhone && <span>Phone: {org.contactPhone}</span>}
                        <span>Branches: {org.propertiesCount || 0}</span>
                        <span>
                          Created: {new Date(org.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                        </span>
                      </div>

                      {org.notes && (
                        <p className="mt-2 text-xs text-[var(--color-muted)] bg-[var(--color-cream)] rounded-lg p-2.5 border border-[var(--color-line)]">
                          <strong className="text-[var(--color-ink)] font-medium">Notes:</strong> {org.notes}
                        </p>
                      )}

                    {org.rejectionReason && (
                      <p className="mt-2 text-xs text-rose-700 bg-rose-50 rounded-lg p-2.5 border border-rose-100">
                        <strong>Reason:</strong> {org.rejectionReason}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-end gap-2 shrink-0">
                    {isPending && (
                      <>
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleApprove(org.id)}
                          className="rounded-lg bg-[var(--color-accent)] px-3.5 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50 transition"
                        >
                          {isProcessing ? 'Approving…' : 'Approve'}
                        </button>
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => setRejectingOrg(org)}
                          className="rounded-lg border border-[var(--color-line)] bg-white px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-50 disabled:opacity-50 transition"
                        >
                          Reject
                        </button>
                      </>
                    )}

                    {isActive && (
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleSuspend(org.id)}
                        className="rounded-lg border border-[var(--color-line)] bg-white px-3 py-1.5 text-xs text-[var(--color-muted)] hover:text-[var(--color-ink)] transition"
                      >
                        {isProcessing ? 'Updating…' : 'Suspend'}
                      </button>
                    )}

                    {isSuspended && (
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleActivate(org.id)}
                        className="rounded-lg bg-[var(--color-accent)] px-3.5 py-1.5 text-xs font-medium text-white hover:opacity-90 transition"
                      >
                        {isProcessing ? 'Updating…' : 'Reactivate'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Reject Modal */}
      {rejectingOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-[var(--color-line)] space-y-4">
            <h3 className="text-base font-semibold text-[var(--color-ink)]">
              Reject application
            </h3>
            <p className="text-xs text-[var(--color-muted)]">
              Provide an optional note explaining the reason for declining {rejectingOrg.name}.
            </p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Incomplete details or does not match criteria…"
              className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-cream)] p-3 text-xs text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)] transition resize-none"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectingOrg(null)}
                className="rounded-lg px-4 py-2 text-xs text-[var(--color-muted)] hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectConfirm}
                className="rounded-lg bg-rose-700 px-4 py-2 text-xs font-medium text-white hover:bg-rose-800 transition"
              >
                Confirm rejection
              </button>
            </div>
          </div>
        </div>
      )}

      <CreateOrgModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        adminUid={adminUid}
      />
    </div>
  )
}
