import { useMemo, useState } from 'react'
import { GuestDetailDialog } from '../components/guests/GuestDetailDialog'
import { Panel } from '../components/ui/Panel'
import { PageHeader } from '../components/ui/PageHeader'
import { useGuestplace } from '../context/GuestplaceContext'
import type { Guest } from '../types'

export function GuestsPage() {
  const { guests, bookings } = useGuestplace()
  const [query, setQuery] = useState('')
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null)

  const getStayCount = (guestId: string) =>
    bookings.filter((b) => b.guestId === guestId && b.status !== 'cancelled').length

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return guests
    return guests.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.email.toLowerCase().includes(q) ||
        g.phone.toLowerCase().includes(q),
    )
  }, [guests, query])

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => a.name.localeCompare(b.name)),
    [filtered],
  )

  return (
    <div>
      <PageHeader title="Guests" subtitle="People who have stayed with you" />

      <div className="mb-6">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, phone, or email"
          className="w-full rounded-xl border border-[var(--color-line)] bg-white px-4 py-2.5 text-sm shadow-[0_1px_2px_rgba(26,24,20,0.04)]"
        />
      </div>

      {sorted.length === 0 ? (
        <Panel className="py-12 text-center">
          <p className="text-lg font-medium text-[var(--color-ink)]">
            {guests.length === 0 ? 'No guests yet' : 'No matches'}
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--color-muted)]">
            {guests.length === 0
              ? 'Guests are added automatically when you create a booking.'
              : 'Try a different search term.'}
          </p>
        </Panel>
      ) : (
        <Panel className="!p-0">
          <ul className="divide-y divide-[var(--color-line)]">
            {sorted.map((guest) => (
              <li key={guest.id}>
                <button
                  type="button"
                  onClick={() => setSelectedGuest(guest)}
                  className="w-full px-6 py-4 text-left transition-colors hover:bg-[var(--color-cream)]"
                >
                  <p className="font-medium text-[var(--color-ink)]">{guest.name}</p>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">
                    {[guest.phone, guest.email].filter(Boolean).join(' · ') || 'No contact info'}
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">
                    {getStayCount(guest.id)} stay{getStayCount(guest.id) !== 1 ? 's' : ''}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <GuestDetailDialog
        guest={selectedGuest}
        open={!!selectedGuest}
        onClose={() => setSelectedGuest(null)}
      />
    </div>
  )
}
