import { useEffect, useMemo, useState } from 'react'
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
import type { Booking, BookingRateType } from '../../types'
import { defaultWalkInSlot } from '../../utils/datetime'
import { formatMoney } from '../../utils/currency'
import {
  calculateBookingTotal,
  formatBookingRateLabel,
  RATE_TYPE_LABELS,
  roomHasAirConditioning,
} from '../../utils/pricing'
import { BookingReceiptDialog } from './BookingReceiptDialog'

interface WalkInDialogProps {
  open: boolean
  onClose: () => void
  preselectedRoomId?: string
}

type Step = 'room' | 'rate' | 'guest'

const RATE_OPTIONS: BookingRateType[] = ['two_hours', 'per_hour', 'full_day']

export function WalkInDialog({ open, onClose, preselectedRoomId }: WalkInDialogProps) {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const { rooms, settings, bookings, createBooking } = useGuestplace()

  const availableRooms = rooms.filter((r) => r.status === 'available')

  const [step, setStep] = useState<Step>(preselectedRoomId ? 'rate' : 'room')
  const [roomId, setRoomId] = useState(preselectedRoomId ?? '')
  const [rateType, setRateType] = useState<BookingRateType>('two_hours')
  const [hours, setHours] = useState(1)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [amountPaid, setAmountPaid] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [receiptBooking, setReceiptBooking] = useState<Booking | null>(null)
  const [pendingReceiptId, setPendingReceiptId] = useState<string | null>(null)

  useEffect(() => {
    if (!pendingReceiptId) return
    const found = bookings.find((b) => b.id === pendingReceiptId)
    if (found) {
      setReceiptBooking(found)
      setPendingReceiptId(null)
    }
  }, [bookings, pendingReceiptId])

  const selectedRoom = rooms.find((r) => r.id === roomId)
  const hasAC = selectedRoom ? roomHasAirConditioning(selectedRoom) : false
  const slot = useMemo(
    () => (selectedRoom ? defaultWalkInSlot(rateType, settings, rateType === 'per_hour' ? hours : undefined) : null),
    [selectedRoom, rateType, hours, settings],
  )

  const total = useMemo(() => {
    if (!selectedRoom || !slot) return 0
    return calculateBookingTotal(settings.rates, hasAC, rateType, {
      hours: rateType === 'per_hour' ? hours : undefined,
      checkIn: slot.checkIn,
      checkOut: slot.checkOut,
    })
  }, [selectedRoom, slot, settings.rates, hasAC, rateType, hours])

  const reset = () => {
    setStep(preselectedRoomId ? 'rate' : 'room')
    setRoomId(preselectedRoomId ?? '')
    setRateType('two_hours')
    setHours(1)
    setName('')
    setPhone('')
    setAmountPaid('')
    setError(null)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleComplete = async () => {
    if (!roomId || !name.trim() || !slot) return
    const paid = amountPaid === '' ? total : Number(amountPaid)
    if (Number.isNaN(paid) || paid < 0 || paid > total) {
      setError('Invalid payment amount')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const bookingId = await createBooking({
        roomId,
        checkIn: slot.checkIn,
        checkOut: slot.checkOut,
        checkInTime: slot.checkInTime,
        checkOutTime: slot.checkOutTime,
        rateType,
        hours: rateType === 'per_hour' ? hours : undefined,
        amountPaid: paid,
        walkIn: true,
        guest: { name: name.trim(), email: '', phone },
      })

      setPendingReceiptId(bookingId)
      reset()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check in guest')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Dialog open={open} onClose={handleClose} fullScreen={fullScreen} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, pb: 0 }}>Walk-in check-in</DialogTitle>
        <DialogContent className="flex flex-col gap-4 pt-4">
          {step === 'room' && (
            <>
              <p className="text-sm text-[var(--color-muted)]">Tap an available room</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {availableRooms.map((room) => (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => {
                      setRoomId(room.id)
                      setStep('rate')
                    }}
                    className="rounded-xl border-2 border-[var(--color-line)] bg-white py-4 text-xl font-semibold transition-colors hover:border-[var(--color-accent)] active:scale-[0.98]"
                  >
                    {room.number}
                  </button>
                ))}
              </div>
              {availableRooms.length === 0 && (
                <p className="text-sm text-rose-700">No rooms available right now.</p>
              )}
            </>
          )}

          {step === 'rate' && selectedRoom && (
            <>
              <p className="text-sm text-[var(--color-muted)]">
                Room {selectedRoom.number} · {hasAC ? 'AC' : 'Non-AC'}
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {RATE_OPTIONS.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setRateType(type)}
                    className={`rounded-xl border-2 px-3 py-3 text-sm font-medium transition-colors ${
                      rateType === type
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                        : 'border-[var(--color-line)] bg-white'
                    }`}
                  >
                    {RATE_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
              {rateType === 'per_hour' && (
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setHours((h) => Math.max(1, h - 1))}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-line)] text-lg"
                  >
                    −
                  </button>
                  <span className="min-w-[4rem] text-center text-lg font-semibold">{hours}h</span>
                  <button
                    type="button"
                    onClick={() => setHours((h) => Math.min(12, h + 1))}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-line)] text-lg"
                  >
                    +
                  </button>
                </div>
              )}
              {slot && (
                <p className="text-center text-2xl font-semibold text-[var(--color-ink)]">
                  {formatMoney(total)}
                </p>
              )}
              <div className="flex gap-2">
                {!preselectedRoomId && (
                  <Button color="inherit" onClick={() => setStep('room')} fullWidth>
                    Back
                  </Button>
                )}
                <Button variant="contained" onClick={() => setStep('guest')} fullWidth>
                  Continue
                </Button>
              </div>
            </>
          )}

          {step === 'guest' && selectedRoom && slot && (
            <>
              <p className="text-sm text-[var(--color-muted)]">
                Room {selectedRoom.number} · {formatBookingRateLabel(rateType, hours)} ·{' '}
                {formatMoney(total)}
              </p>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Guest name *"
                autoFocus
                className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-3 text-base"
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone (optional)"
                className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2.5 text-sm"
              />
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Amount paid now</span>
                <div className="flex items-center gap-2">
                  <span className="text-[var(--color-muted)]">₵</span>
                  <input
                    type="number"
                    min={0}
                    max={total}
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    placeholder={String(total)}
                    className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2.5"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setAmountPaid(String(total))}
                  className="text-left text-xs font-medium text-[var(--color-accent)]"
                >
                  Pay full amount ({formatMoney(total)})
                </button>
              </label>
              {error && (
                <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
              )}
              <Button color="inherit" onClick={() => setStep('rate')}>
                Back
              </Button>
            </>
          )}
        </DialogContent>

        {step === 'guest' && (
          <DialogActions
            sx={{
              px: { xs: 2, sm: 3 },
              pb: { xs: 2, sm: 3 },
              '& > button': { width: { xs: '100%', sm: 'auto' }, m: '0 !important' },
            }}
          >
            <Button
              variant="contained"
              size="large"
              fullWidth
              disabled={!name.trim() || submitting}
              onClick={handleComplete}
            >
              {submitting ? 'Checking in…' : 'Check in & print receipt'}
            </Button>
          </DialogActions>
        )}
      </Dialog>

      <BookingReceiptDialog
        booking={
          receiptBooking
            ? {
                ...receiptBooking,
                guestId: receiptBooking.guestId || '',
              }
            : null
        }
        open={!!receiptBooking}
        onClose={() => setReceiptBooking(null)}
      />
    </>
  )
}
