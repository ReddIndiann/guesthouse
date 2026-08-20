import { useMemo, useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { NewBookingDialog } from '../bookings/NewBookingDialog'
import { WalkInDialog } from '../bookings/WalkInDialog'
import { CheckoutFeedbackDialog } from '../suggestions/CheckoutFeedbackDialog'
import { useAuth } from '../../context/AuthContext'
import { useRbac } from '../../context/RbacContext'
import { useGuestplace } from '../../context/GuestplaceContext'
import type { Permission } from '../../types/auth'

const allNavItems: { to: string; label: string; permission: Permission }[] = [
  { to: '/', label: 'Home', permission: 'dashboard.view' },
  { to: '/rooms', label: 'Rooms', permission: 'rooms.view' },
  { to: '/bookings', label: 'Reservations', permission: 'bookings.view' },
  { to: '/guests', label: 'Guests', permission: 'guests.view' },
  { to: '/messages', label: 'Mail & Messages', permission: 'guests.view' },
  { to: '/housekeeping', label: 'Housekeeping', permission: 'housekeeping.view' },
  { to: '/reports', label: 'Reports', permission: 'reports.view' },
  { to: '/settings', label: 'Settings', permission: 'dashboard.view' },
  { to: '/access', label: 'Access', permission: 'roles.view' },
]

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center rounded-lg px-3 py-2.5 text-sm transition-colors ${
    isActive
      ? 'bg-[var(--color-accent-soft)] font-medium text-[var(--color-accent)]'
      : 'text-[var(--color-muted)] hover:bg-white/60 hover:text-[var(--color-ink)]'
  }`

export function AppLayout() {
  const [bookingOpen, setBookingOpen] = useState(false)
  const [walkInOpen, setWalkInOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { profile, signOut } = useAuth()
  const { can, getRoleName, getGroupName, effectiveRoleId } = useRbac()
  const { loading, error, settings, checkoutFeedback, clearCheckoutFeedback } = useGuestplace()
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  const navItems = useMemo(() => {
    const items = allNavItems.filter((item) => can(item.permission))
    if (!items.some((i) => i.to === '/access') && can('users.view')) {
      items.push({ to: '/access', label: 'Access', permission: 'users.view' })
    }
    return items
  }, [can])

  const accessLabel =
    profile?.assignmentType === 'group'
      ? `${getGroupName(profile.groupId)} → ${getRoleName(effectiveRoleId ?? undefined)}`
      : getRoleName(profile?.roleId)

  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div className="min-h-dvh bg-[var(--color-cream)] md:flex">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={closeSidebar}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[var(--color-line)] bg-white transition-transform duration-200 md:static md:z-auto md:shrink-0 md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="border-b border-[var(--color-line)] px-5 py-5">
          <p className="truncate text-lg font-semibold tracking-tight text-[var(--color-ink)]">
            {settings.name || 'Guestplace'}
          </p>
          {profile && (
            <p className="mt-1 truncate text-xs text-[var(--color-muted)]">
              {profile.displayName} · {accessLabel}
            </p>
          )}
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4" aria-label="Main navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={navLinkClass}
              onClick={closeSidebar}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-2 border-t border-[var(--color-line)] p-4">
          {can('bookings.create') && (
            <>
              <button
                type="button"
                onClick={() => {
                  setWalkInOpen(true)
                  closeSidebar()
                }}
                className="w-full rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium text-white active:scale-[0.98]"
              >
                Walk-in
              </button>
              <button
                type="button"
                onClick={() => {
                  setBookingOpen(true)
                  closeSidebar()
                }}
                className="w-full rounded-lg border border-[var(--color-line)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--color-ink)] active:scale-[0.98]"
              >
                + Book ahead
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => signOut()}
            className="w-full rounded-lg px-4 py-2 text-sm text-[var(--color-muted)] hover:bg-[var(--color-cream)] hover:text-[var(--color-ink)]"
          >
            Log out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[var(--color-line)] bg-white/90 px-4 py-3 backdrop-blur-md supports-[backdrop-filter]:bg-white/80 md:hidden">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setSidebarOpen(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--color-line)] text-[var(--color-ink)]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-[var(--color-ink)]">
              {settings.name || 'Guestplace'}
            </p>
          </div>
          {can('bookings.create') && (
            <button
              type="button"
              onClick={() => setWalkInOpen(true)}
              className="shrink-0 rounded-lg bg-[var(--color-accent)] px-3 py-2 text-sm font-medium text-white"
            >
              Walk-in
            </button>
          )}
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-24">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-line)] border-t-[var(--color-accent)]" />
              <p className="text-sm text-[var(--color-muted)]">Loading your guest house…</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl bg-rose-50 p-6 text-sm text-rose-700">{error}</div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>

      {can('bookings.create') && (
        <>
          <WalkInDialog open={walkInOpen} onClose={() => setWalkInOpen(false)} />
          <NewBookingDialog open={bookingOpen} onClose={() => setBookingOpen(false)} />
        </>
      )}

      {profile?.propertyId && (
        <CheckoutFeedbackDialog
          target={checkoutFeedback}
          propertyId={profile.propertyId}
          settings={settings}
          open={!!checkoutFeedback}
          onClose={clearCheckoutFeedback}
        />
      )}
    </div>
  )
}
