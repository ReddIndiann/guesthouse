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
import type { Booking } from '../../types'
import { BookingReceipt, printBookingReceipt } from './BookingReceipt'

interface BookingReceiptDialogProps {
  booking: Booking | null
  open: boolean
  onClose: () => void
}

export function BookingReceiptDialog({ booking, open, onClose }: BookingReceiptDialogProps) {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const { settings, getGuest, getRoom } = useGuestplace()

  if (!booking) return null

  const guest = getGuest(booking.guestId)
  const room = getRoom(booking.roomId)

  return (
    <Dialog open={open} onClose={onClose} fullScreen={fullScreen} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 600, pb: 0 }}>Receipt</DialogTitle>
      <DialogContent className="pt-4 print:p-0">
        <BookingReceipt settings={settings} booking={booking} guest={guest} room={room} />
      </DialogContent>
      <DialogActions
        className="print:hidden"
        sx={{
          px: { xs: 2, sm: 3 },
          pb: { xs: 2, sm: 3 },
          flexDirection: { xs: 'column-reverse', sm: 'row' },
          gap: 1,
          '& > button': { width: { xs: '100%', sm: 'auto' }, m: '0 !important' },
        }}
      >
        <Button onClick={onClose} color="inherit" size="large">
          Close
        </Button>
        <Button variant="contained" onClick={printBookingReceipt} size="large">
          Print
        </Button>
      </DialogActions>
    </Dialog>
  )
}
