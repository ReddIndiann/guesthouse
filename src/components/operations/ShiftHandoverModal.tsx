import { useMemo, useState } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { useOperations } from '../../context/OperationsContext'
import { useGuestplace } from '../../context/GuestplaceContext'
import { formatMoney } from '../../utils/currency'
import { todayISO } from '../../utils/dates'

interface ShiftHandoverModalProps {
  open: boolean
  onClose: () => void
}

export function ShiftHandoverModal({ open, onClose }: ShiftHandoverModalProps) {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const { bookings } = useGuestplace()
  const { shifts, activeShift, startShift, closeShift } = useOperations()

  const [openingFloat, setOpeningFloat] = useState('200')
  const [closingCash, setClosingCash] = useState('')
  const [handoverNotes, setHandoverNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Current active shift or latest shift
  const currentShift = activeShift || shifts.find((s) => s.status === 'active')

  // Calculate collections during this shift
  const shiftMetrics = useMemo(() => {
    if (!currentShift) return { cash: 0, momo: 0, card: 0, total: 0, checkIns: 0 }
    const today = todayISO()
    // Bookings checked in or updated today
    const shiftBookings = bookings.filter((b) => b.checkIn === today || b.status === 'checked_in')
    
    let cash = 0
    let momo = 0
    let card = 0

    shiftBookings.forEach((b) => {
      const amt = b.amountPaid || 0
      if (b.paymentMethod === 'momo') momo += amt
      else if (b.paymentMethod === 'card' || b.paymentMethod === 'bank_transfer') card += amt
      else cash += amt
    })

    return {
      cash,
      momo,
      card,
      total: cash + momo + card,
      checkIns: shiftBookings.length,
    }
  }, [currentShift, bookings])

  const expectedCash = (currentShift?.openingFloat ?? 0) + shiftMetrics.cash
  const countedCash = closingCash !== '' ? Number(closingCash) : null
  const cashDifference = countedCash !== null ? countedCash - expectedCash : null

  const handleStartShift = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await startShift(Number(openingFloat) || 0)
      setSuccessMsg('Shift started successfully!')
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start shift')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCloseShift = async () => {
    if (!currentShift) return
    if (closingCash === '' || Number.isNaN(Number(closingCash))) {
      setError('Please enter the physically counted cash in the drawer')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await closeShift(currentShift.id, {
        closingCash: Number(closingCash),
        expectedCash,
        cashDifference: cashDifference ?? 0,
        totalMomoCollected: shiftMetrics.momo,
        totalCardCollected: shiftMetrics.card,
        totalCheckIns: shiftMetrics.checkIns,
        handoverNotes: handoverNotes.trim() || undefined,
      })
      setSuccessMsg('Shift closed & handover recorded!')
      setTimeout(() => {
        setSuccessMsg(null)
        onClose()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to close shift')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullScreen={fullScreen} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Front Desk Shift & Cash Drawer</span>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">
          ✕
        </button>
      </DialogTitle>

      <DialogContent className="space-y-4 pt-4">
        {error && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        )}
        {successMsg && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{successMsg}</p>
        )}

        {!currentShift ? (
          <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-cream)] p-5 space-y-4">
            <div>
              <h3 className="font-semibold text-[var(--color-ink)]">No Active Shift</h3>
              <p className="text-xs text-[var(--color-muted)] mt-1">
                Start a new front desk shift to track cash drawer collections and reconcile Mobile Money.
              </p>
            </div>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-[var(--color-ink)]">Opening Cash Float (₵)</span>
              <span className="text-xs text-[var(--color-muted)]">Starting cash balance in the drawer for change</span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-[var(--color-muted)]">₵</span>
                <input
                  type="number"
                  min={0}
                  value={openingFloat}
                  onChange={(e) => setOpeningFloat(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2.5 text-sm"
                  placeholder="200"
                />
              </div>
            </label>

            <Button
              variant="contained"
              onClick={handleStartShift}
              disabled={submitting}
              fullWidth
              size="large"
            >
              {submitting ? 'Starting…' : 'Start Front Desk Shift'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Shift banner */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 flex items-center justify-between">
              <div>
                <span className="inline-block rounded-full bg-emerald-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-900">
                  Active Shift
                </span>
                <p className="text-sm font-semibold text-emerald-950 mt-1">
                  {currentShift.staffName}
                </p>
                <p className="text-xs text-emerald-800">
                  Started today at {currentShift.startTime} · Float: {formatMoney(currentShift.openingFloat ?? 0)}
                </p>
              </div>
            </div>

            {/* Shift live revenue breakdown */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-[var(--color-line)] bg-white p-3 text-center">
                <span className="text-[11px] text-[var(--color-muted)]">Cash Collected</span>
                <p className="text-base font-bold text-[var(--color-ink)] mt-0.5">
                  {formatMoney(shiftMetrics.cash)}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--color-line)] bg-white p-3 text-center">
                <span className="text-[11px] text-[var(--color-muted)]">MoMo Collected</span>
                <p className="text-base font-bold text-amber-700 mt-0.5">
                  {formatMoney(shiftMetrics.momo)}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--color-line)] bg-white p-3 text-center">
                <span className="text-[11px] text-[var(--color-muted)]">Card / Bank</span>
                <p className="text-base font-bold text-indigo-700 mt-0.5">
                  {formatMoney(shiftMetrics.card)}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--color-line)] bg-white p-3 text-center">
                <span className="text-[11px] text-[var(--color-muted)]">Total Revenue</span>
                <p className="text-base font-bold text-emerald-700 mt-0.5">
                  {formatMoney(shiftMetrics.total)}
                </p>
              </div>
            </div>

            {/* Cash reconciliation calculation */}
            <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-cream)] p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                Cash Drawer Reconciliation
              </h4>

              <div className="flex justify-between text-sm">
                <span>Opening Float</span>
                <span>{formatMoney(currentShift.openingFloat ?? 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>+ Cash Collected on Shift</span>
                <span>{formatMoney(shiftMetrics.cash)}</span>
              </div>
              <div className="flex justify-between border-t border-[var(--color-line)] pt-2 text-sm font-semibold text-[var(--color-ink)]">
                <span>Expected Physical Cash in Drawer</span>
                <span>{formatMoney(expectedCash)}</span>
              </div>

              <div className="pt-2">
                <label className="flex flex-col gap-1 text-sm font-medium">
                  <span>Counted Cash in Drawer (₵) *</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--color-muted)] font-bold">₵</span>
                    <input
                      type="number"
                      min={0}
                      value={closingCash}
                      onChange={(e) => setClosingCash(e.target.value)}
                      placeholder={String(expectedCash)}
                      className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-sm font-semibold"
                    />
                  </div>
                </label>
              </div>

              {cashDifference !== null && (
                <div
                  className={`rounded-lg p-2.5 text-xs font-semibold flex justify-between ${
                    cashDifference === 0
                      ? 'bg-emerald-100 text-emerald-800'
                      : cashDifference > 0
                        ? 'bg-sky-100 text-sky-800'
                        : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  <span>
                    Variance:{' '}
                    {cashDifference === 0
                      ? 'Balanced (Perfect match)'
                      : cashDifference > 0
                        ? `Over (+${formatMoney(cashDifference)})`
                        : `Short (${formatMoney(cashDifference)})`}
                  </span>
                  <span>{formatMoney(Math.abs(cashDifference))}</span>
                </div>
              )}

              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium text-[var(--color-muted)]">Handover Notes to Next Staff / Manager</span>
                <textarea
                  rows={2}
                  value={handoverNotes}
                  onChange={(e) => setHandoverNotes(e.target.value)}
                  placeholder="e.g. Keys for Room 2 handed over, laundry collected, ₵100 transferred to MoMo till..."
                  className="w-full rounded-lg border border-[var(--color-line)] bg-white p-2.5 text-xs"
                />
              </label>
            </div>
          </div>
        )}
      </DialogContent>

      <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 3 } }}>
        <Button onClick={onClose} color="inherit">
          Close
        </Button>
        {currentShift && (
          <Button
            variant="contained"
            color="primary"
            onClick={handleCloseShift}
            disabled={submitting || closingCash === ''}
          >
            {submitting ? 'Closing…' : 'Close Shift & Handover'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
