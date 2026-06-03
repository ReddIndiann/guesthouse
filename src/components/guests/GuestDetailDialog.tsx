import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { useGuestplace } from '../../context/GuestplaceContext'
import { bookingStatusConfig } from '../../utils/roomStatus'
import { paymentStatusConfig } from '../../utils/bookings'
import { formatDate } from '../../utils/dates'
import { formatMoney } from '../../utils/currency'
import type { Guest } from '../../types'

interface GuestDetailDialogProps {
  guest: Guest | null
  open: boolean
  onClose: () => void
}

export function GuestDetailDialog({ guest, open, onClose }: GuestDetailDialogProps) {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const { getGuestBookings, getRoom } = useGuestplace()

  if (!guest) return null

  const stays = getGuestBookings(guest.id)

  return (
    <Dialog open={open} onClose={onClose} fullScreen={fullScreen} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 600, pb: 0 }}>{guest.name}</DialogTitle>
      <DialogContent className="flex flex-col gap-4 pt-4">
        <dl className="space-y-2 text-sm">
          {guest.phone && (
            <div>
              <dt className="text-[var(--color-muted)]">Phone</dt>
              <dd className="font-medium">{guest.phone}</dd>
            </div>
          )}
          {guest.email && (
            <div>
              <dt className="text-[var(--color-muted)]">Email</dt>
              <dd className="font-medium">{guest.email}</dd>
            </div>
          )}
          {guest.idNumber && (
            <div>
              <dt className="text-[var(--color-muted)]">ID</dt>
              <dd className="font-medium">{guest.idNumber}</dd>
            </div>
          )}
        </dl>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
            Stay history
          </p>
          {stays.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">No stays yet.</p>
          ) : (
            <ul className="divide-y divide-[var(--color-line)] rounded-xl border border-[var(--color-line)]">
              {stays.map((booking) => {
                const room = getRoom(booking.roomId)
                const status = bookingStatusConfig[booking.status]
                const payment = paymentStatusConfig[booking.paymentStatus]
                return (
                  <li key={booking.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">Room {room?.number ?? '—'}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}
                      >
                        {status.label}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${payment.className}`}
                      >
                        {payment.label}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                      {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)}
                    </p>
                    <p className="mt-1 text-sm font-medium">{formatMoney(booking.totalAmount)}</p>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} color="inherit">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}
