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
import { addDaysISO, todayISO } from '../../utils/dates'
import { computeBookingSlot, nowTimeString } from '../../utils/datetime'
import { formatMoney } from '../../utils/currency'
import {
  calculateBookingTotal,
  formatBookingRateLabel,
  formatRateSummary,
  RATE_TYPE_LABELS,
  roomHasAirConditioning,
} from '../../utils/pricing'

interface NewBookingDialogProps {
  open: boolean
  onClose: () => void
  preselectedRoomId?: string
}

const RATE_TYPES: BookingRateType[] = ['full_day', 'two_hours', 'per_hour']

export function NewBookingDialog({ open, onClose, preselectedRoomId }: NewBookingDialogProps) {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const { rooms, settings, createBooking } = useGuestplace()
  const availableRooms = rooms.filter((r) => r.status === 'available')

  const [roomId, setRoomId] = useState(preselectedRoomId ?? '')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [rateType, setRateType] = useState<BookingRateType>('full_day')
  const [hours, setHours] = useState(1)
  const [checkIn, setCheckIn] = useState(todayISO())
  const [checkOut, setCheckOut] = useState('')
  const [checkInTime, setCheckInTime] = useState(nowTimeString())
  const [notes, setNotes] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const selectedRoom = rooms.find((r) => r.id === roomId)
  const isShortStay = rateType === 'two_hours' || rateType === 'per_hour'

  useEffect(() => {
    if (open) setRoomId(preselectedRoomId ?? '')
  }, [open, preselectedRoomId])

  useEffect(() => {
    if (isShortStay) {
      setCheckOut(addDaysISO(checkIn, 1))
    } else if (!checkOut || checkOut <= checkIn) {
      setCheckOut(addDaysISO(checkIn, 1))
    }
  }, [rateType, checkIn, isShortStay, checkOut])

  const estimatedTotal = useMemo(() => {
    if (!selectedRoom) return null
    const hasAC = roomHasAirConditioning(selectedRoom)
    const effectiveCheckOut = isShortStay ? addDaysISO(checkIn, 1) : checkOut || addDaysISO(checkIn, 1)
    return calculateBookingTotal(settings.rates, hasAC, rateType, {
      hours: rateType === 'per_hour' ? hours : undefined,
      checkIn,
      checkOut: effectiveCheckOut,
    })
  }, [selectedRoom, settings.rates, rateType, hours, checkIn, checkOut, isShortStay])

  const reset = () => {
    setRoomId(preselectedRoomId ?? '')
    setName('')
    setEmail('')
    setPhone('')
    setRateType('full_day')
    setHours(1)
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
        notes: notes || undefined,
        guest: { name, email, phone },
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
      <DialogTitle sx={{ fontWeight: 600, pb: 0 }}>New booking</DialogTitle>
      <DialogContent className="flex flex-col gap-4 pt-4">
        <TextField label="Guest name" value={name} onChange={(e) => setName(e.target.value)} required fullWidth />
        <TextField label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} fullWidth />
        <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth />

        <FormControl fullWidth required size="small">
          <InputLabel>Room</InputLabel>
          <Select label="Room" value={roomId} onChange={(e) => setRoomId(e.target.value)}>
            {availableRooms.map((room) => (
              <MenuItem key={room.id} value={room.id}>
                {room.number} — {roomHasAirConditioning(room) ? 'AC' : 'Non-AC'} ({room.type})
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {selectedRoom && (
          <p className="rounded-lg bg-[var(--color-cream)] px-3 py-2 text-xs text-[var(--color-muted)]">
            {formatRateSummary(settings.rates, roomHasAirConditioning(selectedRoom))}
          </p>
        )}

        <FormControl fullWidth required size="small">
          <InputLabel>Stay type</InputLabel>
          <Select
            label="Stay type"
            value={rateType}
            onChange={(e) => setRateType(e.target.value as BookingRateType)}
          >
            {RATE_TYPES.map((type) => (
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

        {estimatedTotal !== null && (
          <p className="text-sm font-medium text-[var(--color-ink)]">
            Total: {formatMoney(estimatedTotal)}
            <span className="ml-2 font-normal text-[var(--color-muted)]">
              ({formatBookingRateLabel(rateType, rateType === 'per_hour' ? hours : undefined)})
            </span>
          </p>
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
