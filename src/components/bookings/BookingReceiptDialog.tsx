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
import { buildWhatsAppReceiptMessage, openWhatsAppReceipt } from '../../utils/receipt'
import { formatBookingSchedule } from '../../utils/datetime'

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

  const handleWhatsApp = () => {
    const balance = Math.max(0, booking.totalAmount - booking.amountPaid)
    const scheduleStr = formatBookingSchedule(booking)
    const msg = buildWhatsAppReceiptMessage({
      propertyName: settings.name || 'Guestplace',
      propertyPhone: settings.phone,
      guestName: guest?.name || 'Valued Guest',
      roomNumber: room?.number || '—',
      schedule: scheduleStr,
      totalAmount: booking.totalAmount,
      amountPaid: booking.amountPaid,
      balance,
      paymentMethod: booking.paymentMethod,
      paymentReference: booking.paymentReference,
      wifiPassword: settings.wifiPassword,
      doorCode: booking.doorCode || room?.doorCode || settings.defaultDoorCode,
      checkInInstructions: settings.checkInInstructions,
      propertyType: settings.propertyType,
    })
    openWhatsAppReceipt(guest?.phone, msg)
  }

  return (
    <Dialog open={open} onClose={onClose} fullScreen={fullScreen} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 600, pb: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Guest Receipt</span>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 print:hidden text-lg"
        >
          ✕
        </button>
      </DialogTitle>
      <DialogContent className="pt-4 print:p-0">
        <BookingReceipt settings={settings} booking={booking} guest={guest} room={room} />
      </DialogContent>
      <DialogActions
        className="print:hidden"
        sx={{
          px: { xs: 2, sm: 3 },
          pb: { xs: 2, sm: 3 },
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 1,
          '& > button': { width: { xs: '100%', sm: 'auto' }, m: '0 !important' },
        }}
      >
        <Button onClick={onClose} color="inherit">
          Close
        </Button>
        <Button
          onClick={handleWhatsApp}
          variant="outlined"
          sx={{
            borderColor: '#25D366',
            color: '#128C7E',
            '&:hover': { borderColor: '#128C7E', backgroundColor: '#F0FDF4' },
          }}
        >
          WhatsApp Receipt
        </Button>
        <Button variant="contained" onClick={printBookingReceipt}>
          Print
        </Button>
      </DialogActions>
    </Dialog>
  )
}
