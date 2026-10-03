import { useState, useMemo } from 'react'
import type { Organization, OrganizationPlan, OrganizationStatus } from '../../types/tenant'
import {
  activateOrganization,
  approveOrganization,
  generateOrRefreshInviteToken,
  rejectOrganization,
  suspendOrganization,
  updateOrganizationPlanAndQuota,
} from '../../lib/tenants'
import { CreateOrgModal } from './CreateOrgModal'

interface AdminOrgsTabProps {
  organizations: Organization[]
  adminUid: string
  initialFilter?: OrganizationStatus | 'all'
}

type PropertyTypeFilter = 'all' | 'hotel' | 'guesthouse' | 'airbnb' | 'resort'

function formatWhatsAppUrl(phone: string | undefined, message: string): string | null {
  if (!phone) return null
  let clean = phone.replace(/[^0-9]/g, '')
  if (!clean) return null
  if (clean.startsWith('0')) {
    clean = '233' + clean.slice(1) // Ghana default
  }
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`
}

export function AdminOrgsTab({ organizations, adminUid, initialFilter = 'all' }: AdminOrgsTabProps) {
  const [filter, setFilter] = useState<OrganizationStatus | 'all'>(initialFilter)
  const [typeFilter, setTypeFilter] = useState<PropertyTypeFilter>('all')
  const [search, setSearch] = useState('')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [rejectingOrg, setRejectingOrg] = useState<Organization | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  // Invite link modal state
  const [inviteModalData, setInviteModalData] = useState<{
    org: Organization
    token: string
    isNewApproval?: boolean
  } | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)

  // Plan & Quota modal state
  const [editingPlanOrg, setEditingPlanOrg] = useState<Organization | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<OrganizationPlan>('starter')
  const [selectedQuota, setSelectedQuota] = useState<number>(1)
  const [savingPlan, setSavingPlan] = useState(false)

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
      if (typeFilter !== 'all' && (org.propertyType || 'guesthouse') !== typeFilter) return false
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        org.name.toLowerCase().includes(q) ||
        org.contactEmail.toLowerCase().includes(q) ||
        org.ownerName?.toLowerCase().includes(q) ||
        org.slug?.toLowerCase().includes(q) ||
        (org.location && org.location.toLowerCase().includes(q))
      )
    })
  }, [organizations, filter, typeFilter, search])

  const handleApprove = async (org: Organization) => {
    setActionError(null)
    setProcessingId(org.id)
    try {
      const res = await approveOrganization(org.id, adminUid)
      if (res?.inviteToken) {
        setInviteModalData({
          org: { ...org, status: 'active', inviteToken: res.inviteToken },
          token: res.inviteToken,
          isNewApproval: true,
        })
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to approve organization')
    } finally {
      setProcessingId(null)
    }
  }

  const handleOpenInviteModal = async (org: Organization) => {
    setActionError(null)
    setProcessingId(org.id)
    try {
      let token = org.inviteToken
      if (!token) {
        token = await generateOrRefreshInviteToken(org.id)
      }
      setInviteModalData({
        org,
        token,
        isNewApproval: false,
      })
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to generate invitation link')
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

  const handleOpenPlanModal = (org: Organization) => {
    setEditingPlanOrg(org)
    setSelectedPlan(org.plan || 'starter')
    setSelectedQuota(org.maxProperties || 1)
  }

  const handleSavePlanAndQuota = async () => {
    if (!editingPlanOrg) return
    setSavingPlan(true)
    try {
      await updateOrganizationPlanAndQuota(editingPlanOrg.id, selectedPlan, selectedQuota)
      setEditingPlanOrg(null)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update plan/quota')
    } finally {
      setSavingPlan(false)
    }
  }

  const handleCopyInviteLink = (url: string) => {
    navigator.clipboard.writeText(url)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Search name, email, owner, location…"
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

      {/* Filter Tabs (Status & Category) */}
      <div className="space-y-2">
        {/* Status Filters */}
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

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-1">
          <span className="text-[11px] text-[var(--color-muted)] font-medium mr-1 shrink-0">
            Property type:
          </span>
          {(
            [
              { id: 'all', label: 'All types' },
              { id: 'hotel', label: '🏨 Hotels' },
              { id: 'guesthouse', label: '🏡 Guest Houses' },
              { id: 'airbnb', label: '🔑 Airbnbs' },
              { id: 'resort', label: '🌴 Resorts' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTypeFilter(t.id)}
              className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                typeFilter === t.id
                  ? 'bg-stone-200 text-stone-900 border border-stone-300'
                  : 'bg-stone-50 text-[var(--color-muted)] border border-transparent hover:bg-stone-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
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
            const isUnclaimed = isActive && (!org.ownerUid || !org.inviteAcceptedAt)

            // Direct Communication URLs
            const whatsAppMessage = isPending
              ? `Hello ${org.ownerName || 'there'}, thank you for registering ${org.name} on Guestplace! We are reviewing your property details and would love to connect about your setup.`
              : isUnclaimed && org.inviteToken
              ? `Hello ${org.ownerName || 'there'}, your Guestplace workspace for ${org.name} has been approved! Please click this link to set your password and access your dashboard: ${window.location.origin}/invite/${org.inviteToken}`
              : `Hello ${org.ownerName || 'there'}, checking in from Guestplace regarding your ${org.name} workspace.`

            const whatsAppUrl = formatWhatsAppUrl(org.contactPhone, whatsAppMessage)
            const emailUrl = `mailto:${org.contactEmail}?subject=${encodeURIComponent(
              `Regarding your ${org.name} workspace on Guestplace`,
            )}`
            const callUrl = org.contactPhone ? `tel:${org.contactPhone}` : null

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

                        {/* Plan & Max Quota Tag with Quick Edit */}
                        <button
                          type="button"
                          onClick={() => handleOpenPlanModal(org)}
                          title="Click to edit subscription plan & branch quota"
                          className="rounded bg-[var(--color-cream)] border border-[var(--color-line)] px-2 py-0.5 text-[10px] text-[var(--color-ink)] uppercase tracking-wider hover:border-[var(--color-accent)] transition font-medium flex items-center gap-1"
                        >
                          <span>{org.plan}</span>
                          <span className="text-[var(--color-muted)]">({org.maxProperties || 1} max)</span>
                          <span className="text-[9px] text-[var(--color-muted)]">✎</span>
                        </button>

                        {org.propertyType && (
                          <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-medium text-blue-800 capitalize">
                            {org.propertyType === 'airbnb'
                              ? '🔑 Airbnb / Apt'
                              : org.propertyType === 'hotel'
                              ? '🏨 Hotel'
                              : org.propertyType === 'resort'
                              ? '🌴 Resort'
                              : '🏡 Guest House'}
                          </span>
                        )}

                        {org.unitsRange && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-700">
                            {org.unitsRange}
                          </span>
                        )}

                        {isUnclaimed && (
                          <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                            ✉ Invite Pending Acceptance
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
                        <span>Contact: <strong className="text-[var(--color-ink)] font-medium">{org.ownerName || '—'}</strong></span>
                        <span>Branches: {org.propertiesCount || 0} / {org.maxProperties || 1}</span>
                        <span>
                          Applied: {new Date(org.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                        </span>
                      </div>

                      {/* 1-Click Communications Toolbar */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {whatsAppUrl && (
                          <a
                            href={whatsAppUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100 transition"
                            title="Chat with owner on WhatsApp"
                          >
                            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.585 1.761.88 2.791.88 3.181 0 5.767-2.586 5.767-5.766.001-3.182-2.585-5.766-5.767-5.766zm3.374 8.213c-.14.394-.712.75-1.002.779-.272.027-.584.041-1.85-.484-1.424-.59-2.336-2.03-2.407-2.124-.07-.094-.576-.767-.576-1.464 0-.697.363-1.04.492-1.182.13-.142.284-.177.378-.177.094 0 .188.001.27.006.086.004.202-.033.315.24.118.283.402.981.437 1.052.035.071.059.153.012.247-.047.094-.071.153-.141.236-.071.082-.15.183-.214.246-.071.07-.145.147-.062.289.083.142.368.608.79 0.984.544.484 1.002.634 1.144.705.141.071.224.059.307-.035.083-.094.354-.413.448-.555.094-.142.189-.118.319-.071.13.047.826.39 0.968.461.141.071.236.106.271.165.035.059.035.342-.105.736z" />
                            </svg>
                            <span>WhatsApp</span>
                          </a>
                        )}

                        {callUrl && (
                          <a
                            href={callUrl}
                            className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-line)] bg-white px-2.5 py-1 text-xs font-medium text-[var(--color-ink)] hover:bg-[var(--color-cream)] transition"
                            title="Call contact number"
                          >
                            <svg className="w-3 h-3 text-[var(--color-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                            </svg>
                            <span>{org.contactPhone}</span>
                          </a>
                        )}

                        <a
                          href={emailUrl}
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-line)] bg-white px-2.5 py-1 text-xs font-medium text-[var(--color-ink)] hover:bg-[var(--color-cream)] transition"
                          title="Send email"
                        >
                          <svg className="w-3 h-3 text-[var(--color-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect width="20" height="16" x="2" y="4" rx="2" />
                            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                          </svg>
                          <span>{org.contactEmail}</span>
                        </a>

                        {/* Invite link action */}
                        {isActive && !org.ownerUid && (
                          <button
                            type="button"
                            onClick={() => handleOpenInviteModal(org)}
                            className="inline-flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100 transition"
                          >
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                            </svg>
                            <span>Invite link</span>
                          </button>
                        )}
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
                          onClick={() => handleApprove(org)}
                          className="rounded-lg bg-[var(--color-accent)] px-3.5 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50 transition"
                        >
                          {isProcessing ? 'Approving…' : 'Approve & invite'}
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

      {/* Invite Modal (Shown right after approval or when clicking Invite Link) */}
      {inviteModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-[var(--color-line)] space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-800 border border-emerald-100 mb-1">
                  {inviteModalData.isNewApproval ? '🎉 Workspace Approved' : '✉ Onboarding Link'}
                </span>
                <h3 className="text-base font-semibold text-[var(--color-ink)]">
                  {inviteModalData.isNewApproval ? 'Ready for Onboarding' : 'Onboarding Invitation Link'}
                </h3>
                <p className="text-xs text-[var(--color-muted)]">
                  Share this invitation link with <strong className="text-[var(--color-ink)]">{inviteModalData.org.ownerName}</strong> to set up their password and access <strong className="text-[var(--color-ink)]">{inviteModalData.org.name}</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInviteModalData(null)}
                className="text-[var(--color-muted)] hover:text-[var(--color-ink)] p-1 text-lg"
              >
                ✕
              </button>
            </div>

            {/* Invite URL Box */}
            <div className="space-y-2">
              <label className="text-[11px] font-medium text-[var(--color-muted)]">
                Direct Setup URL
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-cream)] p-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/invite/${inviteModalData.token}`}
                  className="w-full bg-transparent text-xs font-mono text-[var(--color-ink)] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleCopyInviteLink(`${window.location.origin}/invite/${inviteModalData.token}`)}
                  className="shrink-0 rounded-lg bg-white border border-[var(--color-line)] px-3 py-1.5 text-xs font-medium text-[var(--color-ink)] hover:bg-gray-50 transition"
                >
                  {copiedLink ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Direct Send Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {formatWhatsAppUrl(
                inviteModalData.org.contactPhone,
                `Hello ${inviteModalData.org.ownerName || 'there'}, your Guestplace workspace for ${inviteModalData.org.name} has been approved! Please click this link to complete your setup and access your dashboard: ${window.location.origin}/invite/${inviteModalData.token}`,
              ) && (
                <a
                  href={
                    formatWhatsAppUrl(
                      inviteModalData.org.contactPhone,
                      `Hello ${inviteModalData.org.ownerName || 'there'}, your Guestplace workspace for ${inviteModalData.org.name} has been approved! Please click this link to complete your setup and access your dashboard: ${window.location.origin}/invite/${inviteModalData.token}`,
                    )!
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white p-2.5 text-center text-xs font-medium transition flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.585 1.761.88 2.791.88 3.181 0 5.767-2.586 5.767-5.766.001-3.182-2.585-5.766-5.767-5.766zm3.374 8.213c-.14.394-.712.75-1.002.779-.272.027-.584.041-1.85-.484-1.424-.59-2.336-2.03-2.407-2.124-.07-.094-.576-.767-.576-1.464 0-.697.363-1.04.492-1.182.13-.142.284-.177.378-.177.094 0 .188.001.27.006.086.004.202-.033.315.24.118.283.402.981.437 1.052.035.071.059.153.012.247-.047.094-.071.153-.141.236-.071.082-.15.183-.214.246-.071.07-.145.147-.062.289.083.142.368.608.79 0.984.544.484 1.002.634 1.144.705.141.071.224.059.307-.035.083-.094.354-.413.448-.555.094-.142.189-.118.319-.071.13.047.826.39 0.968.461.141.071.236.106.271.165.035.059.035.342-.105.736z" />
                  </svg>
                  <span>Send via WhatsApp</span>
                </a>
              )}

              <a
                href={`mailto:${inviteModalData.org.contactEmail}?subject=${encodeURIComponent(
                  `Your Guestplace Workspace for ${inviteModalData.org.name} is Ready`,
                )}&body=${encodeURIComponent(
                  `Hello ${inviteModalData.org.ownerName},\n\nWe are pleased to inform you that your workspace for ${inviteModalData.org.name} has been approved.\n\nPlease follow this link to activate your administrator account and get started:\n${window.location.origin}/invite/${inviteModalData.token}\n\nBest regards,\nThe Guestplace Team`,
                )}`}
                className="rounded-xl border border-[var(--color-line)] bg-white hover:bg-gray-50 text-[var(--color-ink)] p-2.5 text-center text-xs font-medium transition flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4 text-[var(--color-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                <span>Send via Email</span>
              </a>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setInviteModalData(null)}
                className="rounded-xl bg-[var(--color-ink)] px-5 py-2 text-xs font-medium text-white hover:opacity-90 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Plan & Quota Management Modal */}
      {editingPlanOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-[var(--color-line)] space-y-4">
            <h3 className="text-base font-semibold text-[var(--color-ink)]">
              Subscription & Quota: {editingPlanOrg.name}
            </h3>
            <p className="text-xs text-[var(--color-muted)]">
              Configure the subscription tier and maximum branch properties allowed for this client.
            </p>

            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-medium text-[var(--color-ink)] mb-1">
                  Subscription Tier
                </label>
                <select
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value as OrganizationPlan)}
                  className="w-full rounded-xl border border-[var(--color-line)] bg-white p-2.5 text-xs text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)]"
                >
                  <option value="starter">Starter (Single property, core PMS)</option>
                  <option value="growth">Growth (Multi-property, advanced folios)</option>
                  <option value="enterprise">Enterprise (Unlimited properties, full audit)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--color-ink)] mb-1">
                  Max Allowed Branches
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={selectedQuota}
                  onChange={(e) => setSelectedQuota(Number(e.target.value))}
                  className="w-full rounded-xl border border-[var(--color-line)] bg-white p-2.5 text-xs text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingPlanOrg(null)}
                className="rounded-lg px-4 py-2 text-xs text-[var(--color-muted)] hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingPlan}
                onClick={handleSavePlanAndQuota}
                className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50 transition"
              >
                {savingPlan ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
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
