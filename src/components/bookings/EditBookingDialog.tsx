import { useState } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Tab,
  Tabs,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { useOperations } from '../../context/OperationsContext'
import { useGuestplace } from '../../context/GuestplaceContext'
import type { Booking } from '../../types'
import { formatMoney } from '../../utils/currency'
import { formatBookingSchedule } from '../../utils/datetime'
import { sumExtraCharges } from '../../utils/bookings'

interface EditBookingDialogProps {
  booking: Booking | null
  open: boolean
  onClose: () => void
}

export function EditBookingDialog({ booking, open, onClose }: EditBookingDialogProps) {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const { rooms, getGuest, getRoom } = useGuestplace()
  const { extendStay, changeRoom, addCharge, getFolioUrl } = useOperations()

  const [tab, setTab] = useState(0)
  const [customHours, setCustomHours] = useState('2')
  const [newRoomId, setNewRoomId] = useState('')
  const [chargeDesc, setChargeDesc] = useState('')
  const [chargeAmount, setChargeAmount] = useState('')
  const [folioUrl, setFolioUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!booking) return null

  const guest = getGuest(booking.guestId)
  const room = getRoom(booking.roomId)
  const availableRooms = rooms.filter(
    (r) => r.status === 'available' && r.id !== booking.roomId,
  )

  const reset = () => {
    setError(null)
    setFolioUrl(null)
    setTab(0)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const run = async (fn: () => Promise<void>) => {
    setLoading(true)
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} fullScreen={fullScreen} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>
        Amend booking — {guest?.name}
        <p className="mt-1 text-sm font-normal text-[var(--color-muted)]">
          Room {room?.number} · {formatBookingSchedule(booking)} · {formatMoney(booking.totalAmount)}
        </p>
      </DialogTitle>
      <DialogContent>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab label="Extend" />
          <Tab label="Change room" />
          <Tab label="Add charge" />
          <Tab label="Folio link" />
        </Tabs>

        {error && (
          <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        )}

        {tab === 0 && (
          <div className="space-y-2">
            <p className="text-sm text-[var(--color-muted)]">Extend the guest's stay with auto price recalc.</p>
            {[
              { option: 'two_hours' as const, label: '+2 hours' },
              { option: 'one_night' as const, label: '+1 night' },
            ].map(({ option, label }) => (
              <button
                key={option}
                type="button"
                disabled={loading}
                onClick={() => run(() => extendStay(booking.id, { option }))}
                className="w-full rounded-lg border border-[var(--color-line)] px-4 py-3 text-left text-sm font-medium hover:bg-[var(--color-cream)] disabled:opacity-50"
              >
                {label}
              </button>
            ))}
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={customHours}
                onChange={(e) => setCustomHours(e.target.value)}
                className="w-20 rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={loading}
                onClick={() =>
                  run(() =>
                    extendStay(booking.id, {
                      option: 'custom_hours',
                      customHours: Number(customHours),
                    }),
                  )
                }
                className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                + Custom hours
              </button>
            </div>
          </div>
        )}

        {tab === 1 && (
          <div className="space-y-3">
            <p className="text-sm text-[var(--color-muted)]">
              Move guest to another available room. Price recalculates for AC/non-AC.
            </p>
            <select
              value={newRoomId}
              onChange={(e) => setNewRoomId(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm"
            >
              <option value="">Select room…</option>
              {availableRooms.map((r) => (
                <option key={r.id} value={r.id}>
                  Room {r.number} · {r.hasAirConditioning ? 'AC' : 'Non-AC'} · Floor {r.floor}
                </option>
              ))}
            </select>
            <Button
              variant="contained"
              disabled={!newRoomId || loading}
              onClick={() => run(() => changeRoom(booking.id, { newRoomId }))}
            >
              Change room
            </Button>
          </div>
        )}

        {tab === 2 && (
          <div className="space-y-3">
            {(booking.extraCharges ?? []).length > 0 && (
              <ul className="rounded-lg bg-[var(--color-cream)] p-3 text-sm">
                {booking.extraCharges!.map((c) => (
                  <li key={c.id} className="flex justify-between py-1">
                    <span>{c.description}</span>
                    <span>{formatMoney(c.amount)}</span>
                  </li>
                ))}
                <li className="mt-1 border-t border-[var(--color-line)] pt-1 font-medium">
                  Extras total: {formatMoney(sumExtraCharges(booking.extraCharges))}
                </li>
              </ul>
            )}
            <input
              placeholder="Description (e.g. Late checkout)"
              value={chargeDesc}
              onChange={(e) => setChargeDesc(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm"
            />
            <input
              type="number"
              min={0}
              placeholder="Amount (₵)"
              value={chargeAmount}
              onChange={(e) => setChargeAmount(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm"
            />
            <Button
              variant="contained"
              disabled={!chargeDesc.trim() || !chargeAmount || loading}
              onClick={() =>
                run(async () => {
                  await addCharge(booking.id, {
                    description: chargeDesc,
                    amount: Number(chargeAmount),
                  })
                  setChargeDesc('')
                  setChargeAmount('')
                })
              }
            >
              Add charge
            </Button>
          </div>
        )}

        {tab === 3 && (
          <div className="space-y-3">
            <p className="text-sm text-[var(--color-muted)]">
              Share a link or QR so the guest can view charges, checkout time, and WiFi password.
            </p>
            {folioUrl ? (
              <div className="rounded-lg bg-[var(--color-cream)] p-3">
                <p className="break-all text-sm font-medium">{folioUrl}</p>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(folioUrl)}
                  className="mt-2 text-sm text-[var(--color-accent)]"
                >
                  Copy link
                </button>
              </div>
            ) : (
              <Button
                variant="outlined"
                disabled={loading}
                onClick={() =>
                  run(async () => {
                    const url = await getFolioUrl(booking.id)
                    setFolioUrl(url)
                  })
                }
              >
                Generate folio link
              </Button>
            )}
          </div>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
