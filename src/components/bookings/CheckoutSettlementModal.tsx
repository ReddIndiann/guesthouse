import { useState } from 'react'
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import type { Booking, PaymentMethod, Room } from '../../types'
import { formatMoney } from '../../utils/currency'
import type { SettlementInput } from '../../lib/firestore'

interface CheckoutSettlementModalProps {
  open: boolean
  onClose: () => void
  booking: Booking | null
  room: Room | null
  guestName?: string
  onConfirmCheckout: (settlement?: SettlementInput) => Promise<void>
}

export function CheckoutSettlementModal({
  open,
  onClose,
  booking,
  room,
  guestName,
  onConfirmCheckout,
}: CheckoutSettlementModalProps) {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))

  const totalAmount = booking?.totalAmount ?? 0
  const alreadyPaid = booking?.amountPaid ?? 0
  const balanceDue = Math.max(0, totalAmount - alreadyPaid)

  const [collectAmount, setCollectAmount] = useState<string>(balanceDue > 0 ? String(balanceDue) : '0')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [paymentReference, setPaymentReference] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset state when booking changes
  const [lastBookingId, setLastBookingId] = useState<string | null>(null)
  if (booking && booking.id !== lastBookingId) {
    setLastBookingId(booking.id)
    setCollectAmount(balanceDue > 0 ? String(balanceDue) : '0')
    setPaymentReference('')
    setError(null)
  }

  if (!booking || !room) return null

  const handleSettleAndCheckout = async () => {
    setError(null)
    setSubmitting(true)
    try {
      const amountToCollect = Number(collectAmount) || 0
      if (balanceDue > 0 && amountToCollect <= 0) {
        setError('Please enter the amount collected, or choose Waive Balance')
        setSubmitting(false)
        return
      }

      const settlement: SettlementInput | undefined =
        amountToCollect > 0
          ? {
              amountCollected: amountToCollect,
              paymentMethod,
              paymentReference: paymentReference.trim() || undefined,
            }
          : undefined

      await onConfirmCheckout(settlement)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete checkout')
    } finally {
      setSubmitting(false)
    }
  }

  const handleWaiveAndCheckout = async () => {
    if (
      !window.confirm(
        `Are you sure you want to check out without collecting the outstanding balance of ${formatMoney(balanceDue)}? This will record the stay with an uncollected balance.`,
      )
    ) {
      return
    }

    setError(null)
    setSubmitting(true)
    try {
      await onConfirmCheckout(undefined)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete checkout')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullScreen={fullScreen} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <div>
          <span className="text-base text-[var(--color-ink)]">Check Out & Settlement</span>
          <p className="text-xs font-normal text-[var(--color-muted)] mt-0.5">
            Room {room.number} · {guestName || 'Guest'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-lg transition"
        >
          ✕
        </button>
      </DialogTitle>

      <DialogContent className="space-y-4 pt-2">
        {error && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 border border-rose-200">{error}</p>
        )}

        {/* Bill Summary */}
        <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-cream)] p-3 text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-[var(--color-muted)]">Total Room Charges</span>
            <span className="font-semibold text-[var(--color-ink)]">{formatMoney(totalAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--color-muted)]">Amount Previously Paid</span>
            <span className="font-medium text-emerald-700">
              {alreadyPaid > 0 ? formatMoney(alreadyPaid) : '₵0.00 (Unpaid)'}
            </span>
          </div>
          <div className="flex justify-between border-t border-[var(--color-line)] pt-2 font-semibold">
            <span className={balanceDue > 0 ? 'text-rose-700' : 'text-emerald-800'}>
              {balanceDue > 0 ? 'Outstanding Balance Due' : 'Balance Status'}
            </span>
            <span className={`text-sm ${balanceDue > 0 ? 'text-rose-700 font-bold' : 'text-emerald-800'}`}>
              {balanceDue > 0 ? formatMoney(balanceDue) : 'Fully Settled ✓'}
            </span>
          </div>
        </div>

        {/* Payment Required Warning & Form */}
        {balanceDue > 0 ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <svg className="w-4 h-4 text-amber-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Payment required before guest checkout</span>
              </p>
              <p className="text-[11px] text-amber-800">
                Collect physical cash or Mobile Money now to add it directly to your active shift cash drawer.
              </p>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-medium text-[var(--color-muted)] mb-1.5">
                Payment Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'cash', label: 'Cash Drawer' },
                  { id: 'momo', label: 'MoMo Till' },
                  { id: 'card', label: 'Card / Bank' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                    className={`py-2 px-2 rounded-lg text-xs font-semibold border transition text-center ${
                      paymentMethod === m.id
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-ink)]'
                        : 'border-[var(--color-line)] bg-white text-[var(--color-muted)] hover:bg-gray-50'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount to Collect */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">
                  Amount to Collect (₵) *
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-[var(--color-muted)]">₵</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={collectAmount}
                    onChange={(e) => setCollectAmount(e.target.value)}
                    className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2 text-sm font-bold text-[var(--color-ink)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">
                  Txn / Receipt Ref
                </label>
                <input
                  type="text"
                  placeholder="e.g. MoMo-9481"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-xs"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-xs text-emerald-900 flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>All charges are fully settled. The room will be marked for cleaning immediately upon checkout.</span>
          </div>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 1, flexDirection: 'column', gap: 1 }}>
        {balanceDue > 0 ? (
          <>
            <button
              type="button"
              disabled={submitting}
              onClick={handleSettleAndCheckout}
              className="w-full rounded-lg bg-[var(--color-accent)] py-2.5 text-xs font-semibold text-white shadow-sm hover:opacity-95 transition disabled:opacity-50"
            >
              {submitting ? 'Processing...' : `Collect ₵${collectAmount || '0'} & Check Out`}
            </button>
            <div className="flex w-full justify-between items-center pt-1 text-xs">
              <button
                type="button"
                disabled={submitting}
                onClick={handleWaiveAndCheckout}
                className="text-[var(--color-muted)] hover:text-rose-700 underline text-[11px]"
              >
                Waive balance (Comp / Override)
              </button>
              <button
                type="button"
                onClick={onClose}
                className="text-[var(--color-muted)] hover:text-[var(--color-ink)]"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <div className="flex w-full gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-[var(--color-line)] py-2 text-xs font-semibold text-[var(--color-muted)] hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleSettleAndCheckout}
              className="flex-1 rounded-lg bg-[var(--color-accent)] py-2 text-xs font-semibold text-white shadow-sm hover:opacity-95 transition disabled:opacity-50"
            >
              {submitting ? 'Checking out...' : 'Confirm Check Out'}
            </button>
          </div>
        )}
      </DialogActions>
    </Dialog>
  )
}
