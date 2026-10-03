import type { Organization } from '../../types/tenant'
import { PropertyTypeIcon, getPropertyTypeLabel } from '../../components/ui/PropertyTypeIcon'

interface AdminOverviewTabProps {
  organizations: Organization[]
  onSelectTab: (tab: 'overview' | 'orgs' | 'properties' | 'users', orgFilter?: string) => void
  onApprove: (orgId: string) => void
  processingId: string | null
}

export function AdminOverviewTab({
  organizations,
  onSelectTab,
  onApprove,
  processingId,
}: AdminOverviewTabProps) {
  const pendingOrgs = organizations.filter((o) => o.status === 'pending_approval')
  const activeOrgs = organizations.filter((o) => o.status === 'active')
  const totalProperties = organizations.reduce((acc, o) => acc + (o.propertiesCount || 0), 0)

  return (
    <div className="space-y-6">
      {/* Pending Waitlist Alert */}
      {pendingOrgs.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--color-ink)]">
                  {pendingOrgs.length} {pendingOrgs.length === 1 ? 'application awaiting review' : 'applications awaiting review'}
                </p>
                <p className="text-xs text-[var(--color-muted)] mt-0.5">
                  New organizations registered through self-service onboarding are pending approval.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onSelectTab('orgs', 'pending_approval')}
              className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-xs font-medium text-white hover:opacity-90 transition shrink-0"
            >
              Review queue ({pendingOrgs.length})
            </button>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[var(--color-line)] bg-white p-5 space-y-1">
          <p className="text-xs text-[var(--color-muted)] font-medium">Total organizations</p>
          <p className="text-2xl font-semibold text-[var(--color-ink)]">{organizations.length}</p>
          <p className="text-[11px] text-[var(--color-muted)]">Registered accounts</p>
        </div>

        <div className="rounded-2xl border border-[var(--color-line)] bg-white p-5 space-y-1">
          <p className="text-xs text-[var(--color-muted)] font-medium">Pending applications</p>
          <p className="text-2xl font-semibold text-[var(--color-ink)]">{pendingOrgs.length}</p>
          <p className="text-[11px] text-[var(--color-muted)]">Awaiting approval</p>
        </div>

        <div className="rounded-2xl border border-[var(--color-line)] bg-white p-5 space-y-1">
          <p className="text-xs text-[var(--color-muted)] font-medium">Active organizations</p>
          <p className="text-2xl font-semibold text-[var(--color-ink)]">{activeOrgs.length}</p>
          <p className="text-[11px] text-[var(--color-muted)]">Currently operating</p>
        </div>

        <div className="rounded-2xl border border-[var(--color-line)] bg-white p-5 space-y-1">
          <p className="text-xs text-[var(--color-muted)] font-medium">Total branches</p>
          <p className="text-2xl font-semibold text-[var(--color-ink)]">{totalProperties}</p>
          <p className="text-[11px] text-[var(--color-muted)]">Across all tenants</p>
        </div>
      </div>

      {/* Recent Applications Panel */}
      <div className="rounded-2xl border border-[var(--color-line)] bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--color-line)] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-ink)]">Recent registrations</h2>
            <p className="text-xs text-[var(--color-muted)] mt-0.5">
              Latest applications received across the platform
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSelectTab('orgs')}
            className="text-xs text-[var(--color-accent)] font-medium hover:underline"
          >
            View all
          </button>
        </div>

        {organizations.length === 0 ? (
          <div className="p-8 text-center text-xs text-[var(--color-muted)]">
            No organizations registered yet.
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-line)]">
            {organizations.slice(0, 5).map((org) => {
              const isPending = org.status === 'pending_approval'
              return (
                <div
                  key={org.id}
                  className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[var(--color-cream)] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {org.imageUrl ? (
                      <img
                        src={org.imageUrl}
                        alt={org.name}
                        className="h-10 w-10 rounded-lg object-cover border border-[var(--color-line)] shrink-0 shadow-2xs"
                      />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-cream)] border border-[var(--color-line)] text-xs font-semibold text-[var(--color-muted)]">
                        {org.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-[var(--color-ink)] truncate">{org.name}</span>
                        <span
                          className={`rounded-full px-2 py-0.2 text-[10px] font-medium capitalize ${
                            isPending
                              ? 'bg-amber-100 text-amber-900'
                              : org.status === 'active'
                                ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                                : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {isPending ? 'Pending review' : org.status}
                        </span>
                        {org.propertyType && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.2 text-[10px] font-medium text-blue-800">
                            <PropertyTypeIcon type={org.propertyType} className="w-3 h-3 text-blue-700" />
                            <span>{getPropertyTypeLabel(org.propertyType)}</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--color-muted)] truncate">
                        {org.ownerName} · {org.contactEmail} {org.location ? `· ${org.location}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isPending ? (
                      <button
                        type="button"
                        disabled={processingId === org.id}
                        onClick={() => onApprove(org.id)}
                        className="rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50 transition"
                      >
                        {processingId === org.id ? 'Approving…' : 'Approve'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSelectTab('orgs')}
                        className="rounded-lg border border-[var(--color-line)] bg-white px-3 py-1.5 text-xs text-[var(--color-ink)] hover:bg-[var(--color-cream)] transition"
                      >
                        Details
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
