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
import { addDaysISO, todayISO } from '../../utils/dates'
import { hasRoomConflict } from '../../utils/bookings'
import { formatMoney } from '../../utils/currency'
import {
  calculateBookingTotal,
  formatBookingRateLabel,
  RATE_TYPE_LABELS,
  roomHasAirConditioning,
} from '../../utils/pricing'
import { BookingReceiptDialog } from './BookingReceiptDialog'
import { PropertyTypeIcon } from '../ui/PropertyTypeIcon'

interface WalkInDialogProps {
  open: boolean
  onClose: () => void
  preselectedRoomId?: string
}

type Step = 'room' | 'rate' | 'guest'

export function WalkInDialog({ open, onClose, preselectedRoomId }: WalkInDialogProps) {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const { rooms, settings, bookings, createBooking } = useGuestplace()

  const isAirbnb = settings.propertyType === 'airbnb'
  const isHotel = settings.propertyType === 'hotel'
  const isNightlyModel = isAirbnb || isHotel

  const today = todayISO()
  const nextDay = addDaysISO(today, 1)
  const walkInRooms = rooms.filter((r) => {
    if (r.status === 'maintenance' || r.status === 'occupied' || r.status === 'cleaning') {
      return false
    }
    return !hasRoomConflict(bookings, r.id, today, nextDay, settings.checkInTime, settings.checkOutTime)
  })

  const [step, setStep] = useState<Step>(preselectedRoomId ? 'rate' : 'room')
  const [roomId, setRoomId] = useState(preselectedRoomId ?? '')
  const [rateType, setRateType] = useState<BookingRateType>(isNightlyModel ? 'nightly' : 'two_hours')
  const [hours, setHours] = useState(1)
  const [nights, setNights] = useState(1)
  const [doorCode, setDoorCode] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'momo' | 'card' | 'bank_transfer'>('cash')
  const [momoProvider, setMomoProvider] = useState<'mtn' | 'telecel' | 'at'>('mtn')
  const [paymentReference, setPaymentReference] = useState('')
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

  useEffect(() => {
    if (selectedRoom) {
      setDoorCode(selectedRoom.doorCode || settings.defaultDoorCode || '')
    }
  }, [selectedRoom, settings.defaultDoorCode])

  const slot = useMemo(() => {
    if (!selectedRoom) return null
    if (rateType === 'full_day' || rateType === 'nightly') {
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
      nights,
      cleaningFee: isAirbnb ? settings.airbnbRates?.cleaningFee : undefined,
      propertySettings: settings,
    })
  }, [selectedRoom, slot, settings, rateType, hours, nights, isAirbnb])

  const reset = () => {
    setStep(preselectedRoomId ? 'rate' : 'room')
    setRoomId(preselectedRoomId ?? '')
    setRateType(isNightlyModel ? 'nightly' : 'two_hours')
    setHours(1)
    setNights(1)
    setDoorCode('')
    setName('')
    setPhone('')
    setIdNumber('')
    setPaymentMethod('cash')
    setMomoProvider('mtn')
    setPaymentReference('')
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
        nights: (rateType === 'nightly' || rateType === 'full_day') ? nights : undefined,
        cleaningFee: isAirbnb ? (settings.airbnbRates?.cleaningFee ?? 0) : undefined,
        doorCode: doorCode.trim() || undefined,
        amountPaid: paid,
        paymentMethod,
        momoProvider: paymentMethod === 'momo' ? momoProvider : undefined,
        paymentReference: paymentReference.trim() || undefined,
        walkIn: true,
        guest: {
          name: name.trim(),
          email: '',
          phone: phone.trim(),
          idNumber: idNumber.trim() || undefined,
        },
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
              <p className="text-sm text-[var(--color-muted)]">
                {isAirbnb ? 'Tap an available unit / apartment' : 'Tap an available room'}
              </p>
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
                    {isAirbnb && <span className="block text-[10px] text-[var(--color-muted)] font-normal uppercase">Unit</span>}
                    {room.number}
                  </button>
                ))}
              </div>
              {walkInRooms.length === 0 && (
                <p className="text-sm text-rose-700">
                  {isAirbnb ? 'No units available right now.' : 'No rooms available right now.'}
                </p>
              )}
            </>
          )}

          {step === 'rate' && selectedRoom && (
            <>
              <p className="text-sm text-[var(--color-muted)]">
                {isAirbnb ? `Unit ${selectedRoom.number}` : `Room ${selectedRoom.number}`} · {hasAC ? 'AC' : 'Non-AC'}
              </p>

              {isNightlyModel ? (
                <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-cream)] p-4 text-center space-y-3">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent)]/10 px-3 py-1 text-xs font-semibold text-[var(--color-accent)]">
                    <PropertyTypeIcon type={isAirbnb ? 'airbnb' : 'hotel'} className="w-3.5 h-3.5" />
                    <span>{isAirbnb ? 'Airbnb Nightly Stay' : 'Hotel Nightly Stay'}</span>
                  </div>
                  <div className="flex items-center justify-center gap-4">
                    <button
                      type="button"
                      onClick={() => setNights((n) => Math.max(1, n - 1))}
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-line)] bg-white text-lg font-bold hover:bg-gray-50 active:scale-95 transition"
                    >
                      −
                    </button>
                    <span className="min-w-[6rem] text-center text-lg font-bold text-[var(--color-ink)]">
                      {nights} {nights === 1 ? 'night' : 'nights'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setNights((n) => n + 1)}
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-line)] bg-white text-lg font-bold hover:bg-gray-50 active:scale-95 transition"
                    >
                      +
                    </button>
                  </div>
                  {isAirbnb && settings.airbnbRates?.cleaningFee ? (
                    <div className="text-xs text-[var(--color-muted)] flex justify-between px-3 border-t border-[var(--color-line)] pt-2">
                      <span>Turnover cleaning fee:</span>
                      <span className="font-semibold text-[var(--color-ink)]">
                        {formatMoney(settings.airbnbRates.cleaningFee)}
                      </span>
                    </div>
                  ) : null}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {(['two_hours', 'per_hour', 'full_day'] as BookingRateType[]).map((type) => (
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
                </>
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
                {isAirbnb ? `Unit ${selectedRoom.number}` : `Room ${selectedRoom.number}`} ·{' '}
                {isNightlyModel ? `${nights} ${nights === 1 ? 'night' : 'nights'}` : formatBookingRateLabel(rateType, hours)} ·{' '}
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
                placeholder="Phone (WhatsApp enabled)"
                className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2.5 text-sm"
              />
              <input
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder="Ghana Card / Passport / ID (Optional)"
                className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2.5 text-sm"
              />

              {isAirbnb && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 space-y-1">
                  <label className="text-[11px] font-semibold text-amber-900 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-amber-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 0 1 2 2m4 0a6 6 0 0 1-7.743 5.743L11 17H9v2H7v2H4a1 1 0 0 1-1-1v-2.586a1 1 0 0 1 .293-.707l5.964-5.964A6 6 0 1 1 21 9z" />
                    </svg>
                    <span>Self Check-in Door / Keybox PIN</span>
                  </label>
                  <input
                    value={doorCode}
                    onChange={(e) => setDoorCode(e.target.value)}
                    placeholder="e.g. 4829# or Lockbox 1234"
                    className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-mono text-amber-950 placeholder:text-amber-400 focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[10px] text-amber-700">Included on WhatsApp receipt for keyless check-in</p>
                </div>
              )}

              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                  Payment Method
                </span>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { id: 'cash', label: 'Cash' },
                    { id: 'momo', label: 'MoMo' },
                    { id: 'card', label: 'Card' },
                    { id: 'bank_transfer', label: 'Bank' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={`rounded-lg border px-2 py-2 text-xs font-medium transition ${
                        paymentMethod === m.id
                          ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)] font-semibold'
                          : 'border-[var(--color-line)] bg-white text-[var(--color-ink)]'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {paymentMethod === 'momo' && (
                  <div className="rounded-xl border border-[var(--color-line)] bg-white p-3 space-y-2.5">
                    <div className="flex gap-2">
                      {[
                        { id: 'mtn', label: 'MTN MoMo' },
                        { id: 'telecel', label: 'Telecel Cash' },
                        { id: 'at', label: 'AT Money' },
                      ].map((prov) => (
                        <button
                          key={prov.id}
                          type="button"
                          onClick={() => setMomoProvider(prov.id as any)}
                          className={`flex-1 rounded-md py-1.5 text-xs font-medium border ${
                            momoProvider === prov.id
                              ? 'border-amber-500 bg-amber-50 text-amber-900 font-semibold'
                              : 'border-[var(--color-line)] text-[var(--color-muted)]'
                          }`}
                        >
                          {prov.label}
                        </button>
                      ))}
                    </div>
                    <input
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      placeholder="MoMo Transaction ID / Reference"
                      className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2 text-xs"
                    />
                  </div>
                )}

                {paymentMethod === 'card' && (
                  <input
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="POS Approval / Card Reference (Optional)"
                    className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-xs"
                  />
                )}
              </div>

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
