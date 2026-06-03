import { useEffect, useState } from 'react'
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
import { todayISO } from '../../utils/dates'
import { formatMoney } from '../../utils/currency'

interface NewBookingDialogProps {
  open: boolean
  onClose: () => void
  preselectedRoomId?: string
}

export function NewBookingDialog({ open, onClose, preselectedRoomId }: NewBookingDialogProps) {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const { rooms, createBooking } = useGuestplace()
  const availableRooms = rooms.filter((r) => r.status === 'available')

  const [roomId, setRoomId] = useState(preselectedRoomId ?? '')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [checkIn, setCheckIn] = useState(todayISO())
  const [checkOut, setCheckOut] = useState('')
  const [notes, setNotes] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) setRoomId(preselectedRoomId ?? '')
  }, [open, preselectedRoomId])

  const reset = () => {
    setRoomId(preselectedRoomId ?? '')
    setName('')
    setEmail('')
    setPhone('')
    setCheckIn(todayISO())
    setCheckOut('')
    setNotes('')
    setSubmitError(null)
  }

  const handleSubmit = async () => {
    if (!roomId || !name || !checkIn || !checkOut) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      await createBooking({
        roomId,
        checkIn,
        checkOut,
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
                {room.number} — {room.type} ({formatMoney(room.pricePerNight)})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2">
          <TextField
            label="Check-in"
            type="date"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            required
            fullWidth
          />
          <TextField
            label="Check-out"
            type="date"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            required
            fullWidth
          />
        </div>
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
          disabled={!roomId || !name || !checkIn || !checkOut || availableRooms.length === 0 || submitting}
          size="large"
        >
          {submitting ? 'Booking…' : 'Book'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
