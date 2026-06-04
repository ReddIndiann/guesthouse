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
import type { Room, RoomInput, RoomType } from '../../types'
import { ROOM_TYPES } from '../../types'

interface RoomFormDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (input: RoomInput) => Promise<void>
  initial?: Room | null
  existingNumbers?: string[]
}

const emptyForm: RoomInput = {
  number: '',
  floor: 1,
  type: 'double',
  hasAirConditioning: true,
  capacity: 2,
  amenities: [],
}

export function RoomFormDialog({
  open,
  onClose,
  onSubmit,
  initial,
  existingNumbers = [],
}: RoomFormDialogProps) {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const isEdit = !!initial

  const [form, setForm] = useState<RoomInput>(emptyForm)
  const [amenitiesText, setAmenitiesText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (initial) {
      setForm({
        number: initial.number,
        floor: initial.floor,
        type: initial.type,
        hasAirConditioning: initial.hasAirConditioning,
        capacity: initial.capacity,
        amenities: initial.amenities,
      })
      setAmenitiesText(initial.amenities.join(', '))
    } else {
      setForm(emptyForm)
      setAmenitiesText('')
    }
    setError(null)
  }, [open, initial])

  const handleSubmit = async () => {
    setError(null)
    const number = form.number.trim()
    if (!number) {
      setError('Room number is required')
      return
    }
    if (form.capacity < 1) {
      setError('Capacity must be at least 1')
      return
    }

    const duplicate = existingNumbers.some(
      (n) => n.toLowerCase() === number.toLowerCase() && n !== initial?.number,
    )
    if (duplicate) {
      setError(`Room ${number} already exists`)
      return
    }

    const amenities = amenitiesText
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean)

    setSubmitting(true)
    try {
      await onSubmit({ ...form, number, amenities })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save room')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullScreen={fullScreen} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 600, pb: 0 }}>
        {isEdit ? `Edit room ${initial?.number}` : 'Add room'}
      </DialogTitle>
      <DialogContent className="flex flex-col gap-4 pt-4">
        <TextField
          label="Room number"
          value={form.number}
          onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))}
          placeholder="e.g. 101"
          required
          fullWidth
        />
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Floor"
            type="number"
            value={form.floor}
            onChange={(e) => setForm((f) => ({ ...f, floor: Number(e.target.value) }))}
            slotProps={{ htmlInput: { min: 0 } }}
            required
            fullWidth
          />
          <TextField
            label="Capacity"
            type="number"
            value={form.capacity}
            onChange={(e) => setForm((f) => ({ ...f, capacity: Number(e.target.value) }))}
            slotProps={{ htmlInput: { min: 1 } }}
            required
            fullWidth
          />
        </div>
        <FormControl fullWidth size="small">
          <InputLabel>Room type</InputLabel>
          <Select
            label="Room type"
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as RoomType }))}
          >
            {ROOM_TYPES.map((t) => (
              <MenuItem key={t} value={t} className="capitalize">
                {t}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth size="small">
          <InputLabel>Air conditioning</InputLabel>
          <Select
            label="Air conditioning"
            value={form.hasAirConditioning ? 'yes' : 'no'}
            onChange={(e) =>
              setForm((f) => ({ ...f, hasAirConditioning: e.target.value === 'yes' }))
            }
          >
            <MenuItem value="yes">Air conditioned (AC rates)</MenuItem>
            <MenuItem value="no">Non air conditioned</MenuItem>
          </Select>
        </FormControl>
        <TextField
          label="Amenities"
          value={amenitiesText}
          onChange={(e) => setAmenitiesText(e.target.value)}
          placeholder="WiFi, AC, TV"
          helperText="Separate with commas"
          fullWidth
        />
        {error && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
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
        <Button variant="contained" onClick={handleSubmit} disabled={submitting} size="large">
          {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add room'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
