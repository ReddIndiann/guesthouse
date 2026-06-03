import { useState } from 'react'
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
  useMediaQuery,
  useTheme,
} from '@mui/material'
import type { Room, RoomInput, RoomStatus } from '../../types'
import { useRbac } from '../../context/RbacContext'
import { useGuestplace } from '../../context/GuestplaceContext'
import { StatusLabel } from '../ui/StatusLabel'
import { formatMoneyPerNight } from '../../utils/currency'
import { RoomFormDialog } from './RoomFormDialog'

interface RoomDetailDialogProps {
  room: Room | null
  guestName?: string
  open: boolean
  onClose: () => void
  onDeleted?: () => void
  onBook?: (roomId: string) => void
}

export function RoomDetailDialog({
  room,
  guestName,
  open,
  onClose,
  onDeleted,
  onBook,
}: RoomDetailDialogProps) {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const { can } = useRbac()
  const { rooms, updateRoomStatus, markRoomReady, getBookingForRoom, checkOut, updateRoom, deleteRoom } =
    useGuestplace()
  const [newStatus, setNewStatus] = useState<RoomStatus>('available')
  const [editOpen, setEditOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  if (!room) return null

  const activeBooking = getBookingForRoom(room.id)
  const showCheckOut = activeBooking?.status === 'checked_in' && can('bookings.checkout')
  const canUpdateStatus = can('rooms.updateStatus')
  const canEdit = can('rooms.update')
  const canDelete = can('rooms.delete')
  const canBook = room.status === 'available' && can('bookings.create')

  const handleStatusUpdate = () => {
    updateRoomStatus(room.id, newStatus)
    onClose()
  }

  const handleCheckOut = () => {
    if (activeBooking) {
      checkOut(activeBooking.id)
      onClose()
    }
  }

  const handleEdit = async (input: RoomInput) => {
    await updateRoom(room.id, input)
  }

  const handleDelete = async () => {
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteRoom(room.id)
      setConfirmDelete(false)
      onClose()
      onDeleted?.()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete room')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Dialog open={open && !editOpen} onClose={onClose} fullScreen={fullScreen} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, fontSize: { xs: '1.125rem', sm: '1.25rem' }, pb: 0 }}>
          Room {room.number}
        </DialogTitle>
        <DialogContent className="flex flex-col gap-5 pt-4">
          <StatusLabel status={room.status} />

          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-[var(--color-muted)]">Type</dt>
              <dd className="mt-0.5 font-medium capitalize">{room.type}</dd>
            </div>
            <div>
              <dt className="text-[var(--color-muted)]">Floor</dt>
              <dd className="mt-0.5 font-medium">{room.floor}</dd>
            </div>
            <div>
              <dt className="text-[var(--color-muted)]">Capacity</dt>
              <dd className="mt-0.5 font-medium">{room.capacity} guests</dd>
            </div>
            <div>
              <dt className="text-[var(--color-muted)]">Rate</dt>
              <dd className="mt-0.5 font-medium">{formatMoneyPerNight(room.pricePerNight)}</dd>
            </div>
          </dl>

          {room.amenities.length > 0 && (
            <p className="text-sm text-[var(--color-muted)]">
              {room.amenities.join(' · ')}
            </p>
          )}

          {guestName && (
            <div className="rounded-xl bg-[var(--color-cream)] px-4 py-3">
              <p className="text-xs text-[var(--color-muted)]">Guest</p>
              <p className="font-medium">{guestName}</p>
            </div>
          )}

          {showCheckOut && (
            <Button variant="contained" onClick={handleCheckOut} fullWidth size="large">
              Check out
            </Button>
          )}

          {canBook && onBook && (
            <Button
              variant="contained"
              onClick={() => {
                onBook(room.id)
                onClose()
              }}
              fullWidth
              size="large"
            >
              Book this room
            </Button>
          )}

          {room.status === 'cleaning' && canUpdateStatus && (
            <Button
              variant="contained"
              onClick={() => {
                markRoomReady(room.id)
                onClose()
              }}
              fullWidth
              size="large"
            >
              Mark ready
            </Button>
          )}

          {canUpdateStatus && room.status !== 'cleaning' && (
            <FormControl fullWidth size="small">
              <InputLabel>Change status</InputLabel>
              <Select
                label="Change status"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as RoomStatus)}
              >
                <MenuItem value="available">Available</MenuItem>
                <MenuItem value="cleaning">Cleaning</MenuItem>
                <MenuItem value="maintenance">Maintenance</MenuItem>
                <MenuItem value="reserved">Reserved</MenuItem>
              </Select>
            </FormControl>
          )}

          {(canEdit || canDelete) && (
            <div className="flex gap-2 border-t border-[var(--color-line)] pt-4">
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  className="flex-1 rounded-lg border border-[var(--color-line)] py-2 text-sm font-medium"
                >
                  Edit details
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex-1 rounded-lg py-2 text-sm font-medium text-rose-600"
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            px: { xs: 2, sm: 3 },
            pb: { xs: 2, sm: 3 },
            pt: 1,
            flexDirection: { xs: 'column-reverse', sm: 'row' },
            gap: 1,
            '& > button': { width: { xs: '100%', sm: 'auto' }, m: '0 !important' },
          }}
        >
          <Button onClick={onClose} color="inherit" size="large">
            Close
          </Button>
          {canUpdateStatus && room.status !== 'cleaning' && (
            <Button variant="contained" onClick={handleStatusUpdate} size="large">
              Save status
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <RoomFormDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSubmit={handleEdit}
        initial={room}
        existingNumbers={rooms.map((r) => r.number)}
      />

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Delete room {room.number}?</DialogTitle>
        <DialogContent>
          <p className="text-sm text-[var(--color-muted)]">
            This permanently removes the room. You cannot delete a room with an active booking.
          </p>
          {deleteError && (
            <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{deleteError}</p>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setConfirmDelete(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete room'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
