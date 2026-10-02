import { useState } from 'react'
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
import { useAuth } from '../../context/AuthContext'
import type { ExpenseCategory } from '../../types'
import { todayISO } from '../../utils/dates'

interface LogExpenseModalProps {
  open: boolean
  onClose: () => void
}

const EXPENSE_CATEGORIES: { id: ExpenseCategory; label: string; icon: string }[] = [
  { id: 'generator_fuel', label: 'Generator Diesel / Fuel', icon: '⛽' },
  { id: 'ecg_electricity', label: 'ECG Electricity Prepaid', icon: '⚡' },
  { id: 'water_supply', label: 'Water Tanker / Utility', icon: '💧' },
  { id: 'cleaning_supplies', label: 'Cleaning & Toiletries', icon: '🧹' },
  { id: 'maintenance', label: 'Repairs & Maintenance', icon: '🔧' },
  { id: 'food_beverage', label: 'Food & Beverage Restock', icon: '🥤' },
  { id: 'staff_welfare', label: 'Staff Welfare / Meals', icon: '👥' },
  { id: 'other', label: 'Other General Expense', icon: '📦' },
]

export function LogExpenseModal({ open, onClose }: LogExpenseModalProps) {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const { profile } = useAuth()
  const { addExpense } = useOperations()

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<ExpenseCategory>('generator_fuel')
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'momo' | 'bank'>('cash')
  const [receiptRef, setReceiptRef] = useState('')
  const [date, setDate] = useState(todayISO())
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !amount || Number(amount) <= 0) {
      setError('Please provide a valid description and amount')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await addExpense({
        title: title.trim(),
        category,
        amount: Number(amount),
        paymentMethod,
        receiptRef: receiptRef.trim() || undefined,
        date,
        notes: notes.trim() || undefined,
        recordedBy: profile?.uid || 'staff',
        recordedByName: profile?.displayName || 'Staff',
      })
      setTitle('')
      setAmount('')
      setReceiptRef('')
      setNotes('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record expense')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullScreen={fullScreen} maxWidth="xs" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Record Branch Expense</span>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">
            ✕
          </button>
        </DialogTitle>

        <DialogContent className="space-y-4 pt-4">
          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
          )}

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-[var(--color-ink)]">Expense Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-sm"
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-[var(--color-ink)]">Description / Purpose *</span>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 50L Diesel for Generator"
              className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2 text-sm"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-[var(--color-ink)]">Amount (₵) *</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-[var(--color-muted)]">₵</span>
                <input
                  required
                  type="number"
                  min={1}
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="500.00"
                  className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2 text-sm font-semibold"
                />
              </div>
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-[var(--color-ink)]">Date</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-semibold uppercase text-[var(--color-muted)]">
              Paid From
            </span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'cash', label: 'Cash Drawer' },
                { id: 'momo', label: 'MoMo Till' },
                { id: 'bank', label: 'Bank Account' },
              ].map((pm) => (
                <button
                  key={pm.id}
                  type="button"
                  onClick={() => setPaymentMethod(pm.id as any)}
                  className={`rounded-lg border py-2 text-xs font-medium ${
                    paymentMethod === pm.id
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)] font-semibold'
                      : 'border-[var(--color-line)] bg-white text-[var(--color-ink)]'
                  }`}
                >
                  {pm.label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-[var(--color-ink)]">Receipt / Vendor Invoice No. (Optional)</span>
            <input
              value={receiptRef}
              onChange={(e) => setReceiptRef(e.target.value)}
              placeholder="e.g. GOIL-49102"
              className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-xs"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-[var(--color-ink)]">Notes (Optional)</span>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Bought for evening power outage"
              className="w-full rounded-lg border border-[var(--color-line)] bg-white p-2.5 text-xs"
            />
          </label>
        </DialogContent>

        <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 3 } }}>
          <Button onClick={onClose} color="inherit">
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? 'Recording…' : 'Record Expense'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
