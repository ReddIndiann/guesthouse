import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { subscribeToAllOrganizations, approveOrganization } from '../../lib/tenants'
import type { Organization, OrganizationStatus } from '../../types/tenant'
import { AdminOverviewTab } from './AdminOverviewTab'
import { AdminOrgsTab } from './AdminOrgsTab'
import { AdminPropertiesTab } from './AdminPropertiesTab'
import { AdminUsersTab } from './AdminUsersTab'

type AdminTab = 'overview' | 'orgs' | 'properties' | 'users'

export function AdminPage() {
  const { user, profile, signOut } = useAuth()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<AdminTab>('overview')
  const [orgFilter, setOrgFilter] = useState<OrganizationStatus | 'all'>('all')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const unsub = subscribeToAllOrganizations(
      (data) => {
        setOrganizations(data)
        setLoading(false)
      },
      (err) => {
        console.error('Failed to subscribe to organizations:', err)
        setError(err.message)
        setLoading(false)
      },
    )
    return unsub
  }, [])

  const handleSelectTab = (tab: AdminTab, filter?: string) => {
    setActiveTab(tab)
    if (filter) {
      setOrgFilter(filter as OrganizationStatus | 'all')
    }
    setSidebarOpen(false)
  }

  const handleQuickApprove = async (orgId: string) => {
    if (!user) return
    setProcessingId(orgId)
    try {
      await approveOrganization(orgId, user.uid)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Approval failed')
    } finally {
      setProcessingId(null)
    }
  }

  const pendingCount = organizations.filter((o) => o.status === 'pending_approval').length

  const navItems: { id: AdminTab; label: string; icon: (active: boolean) => React.ReactNode; count?: number }[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: (active) => (
        <svg className={`w-4 h-4 ${active ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)]'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="9" rx="1" />
          <rect x="14" y="3" width="7" height="5" rx="1" />
          <rect x="14" y="12" width="7" height="9" rx="1" />
          <rect x="3" y="16" width="7" height="5" rx="1" />
        </svg>
      ),
    },
    {
      id: 'orgs',
      label: 'Organizations',
      count: pendingCount,
      icon: (active) => (
        <svg className={`w-4 h-4 ${active ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)]'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 21h18M5 21V7l8-4v18M13 7l6 3v11M9 9h1M9 13h1M9 17h1M15 13h1M15 17h1" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      id: 'properties',
      label: 'Branches',
      icon: (active) => (
        <svg className={`w-4 h-4 ${active ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)]'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 21s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 7.2c0 7.3-8 11.8-8 11.8z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      ),
    },
    {
      id: 'users',
      label: 'Staff directory',
      icon: (active) => (
        <svg className={`w-4 h-4 ${active ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)]'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
  ]

  const getTabTitle = () => {
    switch (activeTab) {
      case 'overview':
        return 'Overview'
      case 'orgs':
        return 'Organizations'
      case 'properties':
        return 'Branches'
      case 'users':
        return 'Staff directory'
    }
  }

  const getTabSubtitle = () => {
    switch (activeTab) {
      case 'overview':
        return 'Cross-tenant performance, active branches, and registration requests'
      case 'orgs':
        return 'Manage registered organizations and review waitlist applications'
      case 'properties':
        return 'Directory of all active hotel branches across organizations'
      case 'users':
        return 'Directory of all users, organizational roles, and branch assignments'
    }
  }

  return (
    <div className="min-h-dvh bg-[var(--color-cream)] md:flex">
      {/* Mobile Drawer Backdrop */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[var(--color-line)] bg-white transition-transform duration-200 md:sticky md:top-0 md:h-dvh md:z-auto md:shrink-0 md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* App Title & Identity */}
        <div className="border-b border-[var(--color-line)] px-5 py-5">
          <div className="flex items-center justify-between">
            <p className="text-base font-semibold tracking-tight text-[var(--color-ink)]">
              Guestplace
            </p>
            <span className="rounded-full bg-[var(--color-accent-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-accent)]">
              Platform
            </span>
          </div>
          <p className="mt-1 text-xs text-[var(--color-muted)] truncate">
            {profile?.displayName || 'Administrator'}
          </p>
        </div>

        {/* Navigation List */}
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4" aria-label="Admin Navigation">
          <div className="px-3 py-1 text-[11px] font-medium text-[var(--color-muted)]">
            Administration
          </div>

          {navItems.map((item) => {
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectTab(item.id)}
                className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-[var(--color-accent-soft)] font-medium text-[var(--color-accent)]'
                    : 'text-[var(--color-muted)] hover:bg-white/60 hover:text-[var(--color-ink)]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {item.icon(isActive)}
                  <span className="truncate">{item.label}</span>
                </div>
                {item.count !== undefined && item.count > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.2 text-[11px] font-medium ${
                      isActive
                        ? 'bg-[var(--color-accent)] text-white'
                        : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="space-y-2 border-t border-[var(--color-line)] p-4">
          <Link
            to="/"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-line)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-cream)] transition active:scale-[0.98]"
          >
            <svg className="w-4 h-4 text-[var(--color-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Workspace view
          </Link>
          <button
            type="button"
            onClick={() => signOut()}
            className="w-full rounded-lg px-4 py-2 text-sm text-[var(--color-muted)] hover:bg-[var(--color-cream)] hover:text-[var(--color-ink)] transition"
          >
            Log out
          </button>
        </div>
      </aside>

      {/* Main Content View */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile Header Bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--color-line)] bg-white/90 px-4 py-3 backdrop-blur-md md:hidden">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setSidebarOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-line)] text-[var(--color-ink)]"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              </svg>
            </button>
            <p className="font-semibold text-[var(--color-ink)] text-sm">
              Administration
            </p>
          </div>

          <Link
            to="/"
            className="rounded-lg border border-[var(--color-line)] px-2.5 py-1 text-xs text-[var(--color-ink)] bg-white"
          >
            Exit
          </Link>
        </header>

        {/* Main Content Body */}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {/* Native Page Header */}
          <header className="mb-6 flex flex-col gap-1 sm:mb-8 sm:flex-row sm:items-end sm:justify-between md:mb-10">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-2xl">
                {getTabTitle()}
              </h1>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                {getTabSubtitle()}
              </p>
            </div>
          </header>

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-24">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-line)] border-t-[var(--color-accent)]" />
              <p className="text-sm text-[var(--color-muted)]">Loading platform data…</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl bg-rose-50 p-6 text-sm text-rose-700 border border-rose-100">
              {error}
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <AdminOverviewTab
                  organizations={organizations}
                  onSelectTab={handleSelectTab}
                  onApprove={handleQuickApprove}
                  processingId={processingId}
                />
              )}

              {activeTab === 'orgs' && (
                <AdminOrgsTab
                  organizations={organizations}
                  adminUid={user?.uid ?? ''}
                  initialFilter={orgFilter}
                />
              )}

              {activeTab === 'properties' && (
                <AdminPropertiesTab organizations={organizations} />
              )}

              {activeTab === 'users' && (
                <AdminUsersTab
                  organizations={organizations}
                  adminUid={user?.uid ?? ''}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
