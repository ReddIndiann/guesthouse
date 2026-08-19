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
import { hasRoomConflict } from '../../utils/bookings'
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
  
  const nowISO = new Date().toISOString()
  // Ensure we don't allow walk-in if a room is reserved soon.
  // Wait, we need the exact checkIn and checkOut for the selected slot, but since they select the room first,
  // we filter by a rough 'is it available for at least 1 hour?'. 
  // For precise conflict checking, it's safer to allow selecting the room and show conflict at the slot level,
  // or filter out rooms that are reserved today altogether to simplify walk-ins.
  // Walk-ins are usually immediate. So checking if there's any reservation today for that room is a simple fix.
  const walkInRooms = availableRooms.filter((r) => !hasRoomConflict(bookings, r.id, nowISO, nowISO, settings.checkInTime, settings.checkOutTime))

  const [step, setStep] = useState<Step>(preselectedRoomId ? 'rate' : 'room')
  const [roomId, setRoomId] = useState(preselectedRoomId ?? '')
  const [rateType, setRateType] = useState<BookingRateType>('two_hours')
  const [hours, setHours] = useState(1)
  const [nights, setNights] = useState(1)
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
  const slot = useMemo(() => {
    if (!selectedRoom) return null
    if (rateType === 'full_day') {
      const base = defaultWalkInSlot('full_day', settings)
      const d = new Date(base.checkOut)
      d.setDate(d.getDate() + nights - 1)
      return { ...base, checkOut: d.toISOString().split('T')[0] }
    }
    return defaultWalkInSlot(rateType, settings, rateType === 'per_hour' ? hours : undefined)
  }, [selectedRoom, rateType, hours, nights, settings])

  const total = useMemo(() => {
    if (!selectedRoom || !slot) return 0
    return calculateBookingTotal(settings.rates, selectedRoom, rateType, {
      hours: rateType === 'per_hour' ? hours : undefined,
      checkIn: slot.checkIn,
      checkOut: slot.checkOut,
    })
  }, [selectedRoom, slot, settings.rates, rateType, hours])

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
        <div className="flex items-center justify-between pr-4">
          <DialogTitle sx={{ fontWeight: 600, pb: 0 }}>Walk-in check-in</DialogTitle>
          <button type="button" onClick={handleClose} className="mt-4 flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-muted)] hover:bg-[var(--color-line)]">
            ✕
          </button>
        </div>
        <DialogContent className="flex flex-col gap-4 pt-4">
          {step === 'room' && (
            <>
              <p className="text-sm text-[var(--color-muted)]">Tap an available room</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {walkInRooms.map((room) => (
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
              {walkInRooms.length === 0 && (
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
                    onClick={() => setHours((h) => Math.min(3, h + 1))}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-line)] text-lg"
                  >
                    +
                  </button>
                </div>
              )}
              {rateType === 'full_day' && (
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setNights((n) => Math.max(1, n - 1))}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-line)] text-lg"
                  >
                    −
                  </button>
                  <span className="min-w-[6rem] text-center text-lg font-semibold">
                    {nights} {nights === 1 ? 'day' : 'days'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setNights((n) => n + 1)}
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
