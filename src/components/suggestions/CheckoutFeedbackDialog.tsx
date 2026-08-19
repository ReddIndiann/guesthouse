import { useEffect, useState } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import QRCode from 'react-qr-code'
import { ensureSuggestionToken, suggestionFormUrl } from '../../lib/suggestions'
import type { Booking, Guest, PropertySettings, Room } from '../../types'

export interface CheckoutFeedbackTarget {
  booking: Booking
  guest: Guest
  room: Room
}

interface CheckoutFeedbackDialogProps {
  target: CheckoutFeedbackTarget | null
  propertyId: string
  settings: PropertySettings
  open: boolean
  onClose: () => void
}

export function CheckoutFeedbackDialog({
  target,
  propertyId,
  settings,
  open,
  onClose,
}: CheckoutFeedbackDialogProps) {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const [feedbackUrl, setFeedbackUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !target) {
      setFeedbackUrl(null)
      return
    }
    let cancelled = false
    setLoading(true)
    ensureSuggestionToken(propertyId, settings)
      .then((token) => {
        if (cancelled) return
        setFeedbackUrl(
          suggestionFormUrl(token, {
            name: target.guest.name,
            room: target.room.number,
            bookingId: target.booking.id,
            checkout: true,
          }),
        )
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, target, propertyId, settings])

  if (!target) return null

  const smsBody = feedbackUrl
    ? `Hi ${target.guest.name}, thanks for staying at ${settings.name}! We'd love your feedback: ${feedbackUrl}`
    : ''

  return (
    <Dialog open={open} onClose={onClose} fullScreen={fullScreen} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>
        Checked out — Room {target.room.number}
        <p className="mt-1 text-sm font-normal text-[var(--color-muted)]">
          Share this link so {target.guest.name} can rate their stay and leave a suggestion.
        </p>
      </DialogTitle>
      <DialogContent>
        {loading || !feedbackUrl ? (
          <p className="py-8 text-center text-sm text-[var(--color-muted)]">Preparing feedback link…</p>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-2xl border border-[var(--color-line)] bg-white p-5">
              <p className="mb-3 text-center text-sm font-medium text-[var(--color-ink)]">
                Scan to rate your stay
              </p>
              <QRCode value={feedbackUrl} size={140} />
            </div>
            <div className="w-full rounded-lg bg-[var(--color-cream)] p-3">
              <p className="text-xs text-[var(--color-muted)]">Feedback link</p>
              <p className="mt-1 break-all text-sm font-medium">{feedbackUrl}</p>
            </div>
            <div className="flex w-full flex-wrap gap-2">
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(feedbackUrl)}
                className="flex-1 rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm font-medium"
              >
                Copy link
              </button>
              {target.guest.phone && (
                <a
                  href={`sms:${target.guest.phone}?body=${encodeURIComponent(smsBody)}`}
                  className="flex-1 rounded-lg bg-[var(--color-accent)] px-3 py-2 text-center text-sm font-medium text-white"
                >
                  Send SMS
                </a>
              )}
            </div>
          </div>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Done
        </Button>
      </DialogActions>
    </Dialog>
  )
}
