import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { useGuestplace } from '../../context/GuestplaceContext'
import type { BookingRateType } from '../../types'
import { addDaysISO, nightsBetween, todayISO } from '../../utils/dates'
import { computeBookingSlot, nowTimeString } from '../../utils/datetime'
import { formatMoney } from '../../utils/currency'
import {
  calculateBookingTotal,
  formatRateSummary,
  RATE_TYPE_LABELS,
  roomHasAirConditioning,
} from '../../utils/pricing'

interface NewBookingDialogProps {
  open: boolean
  onClose: () => void
  preselectedRoomId?: string
}

export function NewBookingDialog({ open, onClose, preselectedRoomId }: NewBookingDialogProps) {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const { rooms, settings, createBooking } = useGuestplace()

  const isAirbnb = settings.propertyType === 'airbnb'
  const isHotel = settings.propertyType === 'hotel'
  const isNightlyModel = isAirbnb || isHotel

  const availableRooms = rooms.filter((r) => r.status !== 'maintenance')

  const [roomId, setRoomId] = useState(preselectedRoomId ?? '')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [rateType, setRateType] = useState<BookingRateType>(isNightlyModel ? 'nightly' : 'full_day')
  const [hours, setHours] = useState(1)
  const [checkIn, setCheckIn] = useState(todayISO())
  const [checkOut, setCheckOut] = useState('')
  const [checkInTime, setCheckInTime] = useState(nowTimeString())
  const [doorCode, setDoorCode] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'momo' | 'card' | 'bank_transfer'>('cash')
  const [momoProvider, setMomoProvider] = useState<'mtn' | 'telecel' | 'at'>('mtn')
  const [paymentReference, setPaymentReference] = useState('')
  const [amountPaid, setAmountPaid] = useState('')
  const [notes, setNotes] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const selectedRoom = rooms.find((r) => r.id === roomId)
  const isShortStay = rateType === 'two_hours' || rateType === 'per_hour'

  useEffect(() => {
    if (open) {
      setRoomId(preselectedRoomId ?? '')
      setRateType(isNightlyModel ? 'nightly' : 'full_day')
    }
  }, [open, preselectedRoomId, isNightlyModel])

  useEffect(() => {
    if (selectedRoom) {
      setDoorCode(selectedRoom.doorCode || settings.defaultDoorCode || '')
    }
  }, [selectedRoom, settings.defaultDoorCode])

  useEffect(() => {
    if (isShortStay) {
      setCheckOut(addDaysISO(checkIn, 1))
    } else if (!checkOut || checkOut <= checkIn) {
      setCheckOut(addDaysISO(checkIn, 1))
    }
  }, [rateType, checkIn, isShortStay, checkOut])

  const nights = useMemo(() => {
    const effectiveCheckOut = isShortStay ? addDaysISO(checkIn, 1) : checkOut || addDaysISO(checkIn, 1)
    return Math.max(1, nightsBetween(checkIn, effectiveCheckOut))
  }, [checkIn, checkOut, isShortStay])

  const estimatedTotal = useMemo(() => {
    if (!selectedRoom) return null
    const effectiveCheckOut = isShortStay ? addDaysISO(checkIn, 1) : checkOut || addDaysISO(checkIn, 1)
    return calculateBookingTotal(settings.rates, selectedRoom, rateType, {
      hours: rateType === 'per_hour' ? hours : undefined,
      checkIn,
      checkOut: effectiveCheckOut,
      nights,
      cleaningFee: isAirbnb ? settings.airbnbRates?.cleaningFee : undefined,
      propertySettings: settings,
    })
  }, [selectedRoom, settings, rateType, hours, checkIn, checkOut, nights, isShortStay, isAirbnb])

  const reset = () => {
    setRoomId(preselectedRoomId ?? '')
    setName('')
    setEmail('')
    setPhone('')
    setIdNumber('')
    setPaymentMethod('cash')
    setMomoProvider('mtn')
    setPaymentReference('')
    setAmountPaid('')
    setRateType(isNightlyModel ? 'nightly' : 'full_day')
    setHours(1)
    setDoorCode('')
    setCheckIn(todayISO())
    setCheckOut('')
    setNotes('')
    setSubmitError(null)
  }

  const handleSubmit = async () => {
    if (!roomId || !name || !checkIn) return
    const effectiveCheckOut = isShortStay ? addDaysISO(checkIn, 1) : checkOut
    if (!effectiveCheckOut || effectiveCheckOut <= checkIn) {
      setSubmitError('Check-out must be after check-in')
      return
    }
    if (rateType === 'per_hour' && hours < 1) {
      setSubmitError('Enter at least 1 hour')
      return
    }

    const paidNum = amountPaid ? Number(amountPaid) : 0
    if (Number.isNaN(paidNum) || paidNum < 0) {
      setSubmitError('Invalid advance payment amount')
      return
    }

    setSubmitting(true)
    setSubmitError(null)
    try {
      const slot = isShortStay
        ? computeBookingSlot(
            rateType,
            checkIn,
            checkInTime,
            settings,
            rateType === 'per_hour' ? hours : undefined,
          )
        : null

      await createBooking({
        roomId,
        checkIn: slot?.checkIn ?? checkIn,
        checkOut: slot?.checkOut ?? effectiveCheckOut,
        checkInTime: slot?.checkInTime ?? settings.checkInTime,
        checkOutTime: slot?.checkOutTime ?? settings.checkOutTime,
        rateType,
        hours: rateType === 'per_hour' ? hours : undefined,
        nights: (rateType === 'nightly' || rateType === 'full_day') ? nights : undefined,
        cleaningFee: isAirbnb ? (settings.airbnbRates?.cleaningFee ?? 0) : undefined,
        doorCode: doorCode.trim() || undefined,
        amountPaid: paidNum,
        paymentMethod: paidNum > 0 ? paymentMethod : undefined,
        momoProvider: paidNum > 0 && paymentMethod === 'momo' ? momoProvider : undefined,
        paymentReference: paymentReference.trim() || undefined,
        notes: notes || undefined,
        guest: {
          name,
          email,
          phone,
          idNumber: idNumber.trim() || undefined,
        },
      })
      reset()
      onClose()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create booking')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullScreen={fullScreen} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 600, pb: 0 }}>
        {isAirbnb ? 'New Apartment / Unit Booking' : isHotel ? 'New Hotel Room Reservation' : 'New booking'}
      </DialogTitle>
      <DialogContent className="flex flex-col gap-4 pt-4">
        <TextField label="Guest name" value={name} onChange={(e) => setName(e.target.value)} required fullWidth />
        <TextField label="Phone (WhatsApp enabled)" value={phone} onChange={(e) => setPhone(e.target.value)} fullWidth />
        <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth />

        <FormControl fullWidth required size="small">
          <InputLabel>{isAirbnb ? 'Unit / Apartment' : 'Room'}</InputLabel>
          <Select label={isAirbnb ? 'Unit / Apartment' : 'Room'} value={roomId} onChange={(e) => setRoomId(e.target.value)}>
            {availableRooms.map((room) => (
              <MenuItem key={room.id} value={room.id}>
                {isAirbnb ? `Unit ${room.number}` : room.number} — {roomHasAirConditioning(room) ? 'AC' : 'Non-AC'} ({room.type})
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {selectedRoom && (
          <p className="rounded-lg bg-[var(--color-cream)] px-3 py-2 text-xs text-[var(--color-muted)]">
            {isAirbnb && settings.airbnbRates?.nightlyRate ? (
              <span>Nightly: {formatMoney(settings.airbnbRates.nightlyRate)} · Cleaning: {formatMoney(settings.airbnbRates.cleaningFee || 0)}</span>
            ) : isHotel && settings.hotelRates?.standardNightly ? (
              <span>Standard: {formatMoney(settings.hotelRates.standardNightly)} · Suite: {formatMoney(settings.hotelRates.suiteNightly)}</span>
            ) : (
              formatRateSummary(settings.rates, selectedRoom)
            )}
          </p>
        )}

        <FormControl fullWidth required size="small">
          <InputLabel>Stay type</InputLabel>
          <Select
            label="Stay type"
            value={rateType}
            onChange={(e) => setRateType(e.target.value as BookingRateType)}
          >
            {(isNightlyModel ? (['nightly', 'full_day'] as BookingRateType[]) : (['full_day', 'two_hours', 'per_hour'] as BookingRateType[])).map((type) => (
              <MenuItem key={type} value={type}>
                {RATE_TYPE_LABELS[type]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {rateType === 'per_hour' && (
          <TextField
            label="Hours"
            type="number"
            value={hours}
            onChange={(e) => setHours(Math.max(1, Number(e.target.value)))}
            slotProps={{ htmlInput: { min: 1 } }}
            required
            fullWidth
          />
        )}

        <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2">
          <TextField
            label={isShortStay ? 'Date' : 'Check-in'}
            type="date"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            required
            fullWidth
          />
          {isShortStay && (
            <TextField
              label="Start time"
              type="time"
              value={checkInTime}
              onChange={(e) => setCheckInTime(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              required
              fullWidth
            />
          )}
        </div>

        {!isShortStay && (
          <TextField
            label="Check-out"
            type="date"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            required
            fullWidth
          />
        )}

        {isAirbnb && (
          <TextField
            label="Self Check-in Door / Keybox PIN"
            value={doorCode}
            onChange={(e) => setDoorCode(e.target.value)}
            placeholder="e.g. 4829# or Lockbox 1234"
            fullWidth
            size="small"
            helperText="Included on guest folio & receipt for keyless check-in"
          />
        )}

        <TextField
          label="Ghana Card / National ID (Optional)"
          value={idNumber}
          onChange={(e) => setIdNumber(e.target.value)}
          fullWidth
          size="small"
        />

        {selectedRoom && (
          <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-cream)] p-3 space-y-3">
            <div className="flex justify-between items-center text-sm font-semibold text-[var(--color-ink)]">
              <span>Estimated Total:</span>
              <span>{formatMoney(estimatedTotal ?? 0)}</span>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-[var(--color-line)]">
              <span className="text-xs font-medium text-[var(--color-muted)]">
                Advance Deposit (Optional)
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-[var(--color-muted)]">₵</span>
                <input
                  type="number"
                  min={0}
                  max={estimatedTotal ?? undefined}
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-1.5 text-sm"
                />
              </div>
            </div>

            {Number(amountPaid) > 0 && (
              <div className="space-y-2 pt-2 border-t border-[var(--color-line)]">
                <span className="text-xs font-semibold uppercase text-[var(--color-muted)]">
                  Payment Method
                </span>
                <div className="grid grid-cols-4 gap-1.5">
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
                      className={`rounded-lg border py-1.5 text-xs font-medium ${
                        paymentMethod === m.id
                          ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                          : 'border-[var(--color-line)] bg-white text-[var(--color-ink)]'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {paymentMethod === 'momo' && (
                  <div className="space-y-2 rounded-lg bg-white p-2 border border-[var(--color-line)]">
                    <div className="flex gap-1.5">
                      {[
                        { id: 'mtn', label: 'MTN' },
                        { id: 'telecel', label: 'Telecel' },
                        { id: 'at', label: 'AT' },
                      ].map((prov) => (
                        <button
                          key={prov.id}
                          type="button"
                          onClick={() => setMomoProvider(prov.id as any)}
                          className={`flex-1 rounded py-1 text-xs font-medium border ${
                            momoProvider === prov.id
                              ? 'border-amber-500 bg-amber-50 text-amber-900'
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
                      placeholder="MoMo Transaction Reference"
                      className="w-full rounded border border-[var(--color-line)] bg-[var(--color-cream)] px-2.5 py-1 text-xs"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <TextField label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} multiline rows={2} fullWidth />
        {submitError && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{submitError}</p>
        )}
      </DialogContent>
      <DialogActions
        sx={{
          px: { xs: 2, sm: 3 },
          pb: { xs: 2, sm: 3 },
          flexDirection: { xs: 'column-reverse', sm: 'row' },
          gap: 1,
          '& > button': { width: { xs: '100%', sm: 'auto' }, m: '0 !important' },
        }}
      >
        <Button onClick={onClose} color="inherit" size="large">
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={
            !roomId ||
            !name ||
            !checkIn ||
            (!isShortStay && !checkOut) ||
            availableRooms.length === 0 ||
            submitting
          }
          size="large"
        >
          {submitting ? 'Booking…' : 'Book'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
