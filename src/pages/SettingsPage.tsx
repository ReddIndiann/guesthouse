import { useEffect, useState } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel } from '../components/ui/Panel'
import { useRbac } from '../context/RbacContext'
import { useGuestplace } from '../context/GuestplaceContext'
import type { PropertySettings } from '../types'

export function SettingsPage() {
  const { can } = useRbac()
  const { settings, updateSettings } = useGuestplace()
  const canEdit = can('rooms.update')

  const [form, setForm] = useState<PropertySettings>(settings)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setForm(settings)
  }, [settings])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canEdit) return
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      await updateSettings(form)
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader title="Settings" subtitle="Your guest house details" />

      <Panel>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Property name</span>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              disabled={!canEdit}
              required
              className="rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2.5 disabled:opacity-60"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Address</span>
            <input
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              disabled={!canEdit}
              placeholder="Street, city"
              className="rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2.5 disabled:opacity-60"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Phone</span>
            <input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              disabled={!canEdit}
              placeholder="+233 ..."
              className="rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2.5 disabled:opacity-60"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Check-in time</span>
              <input
                type="time"
                value={form.checkInTime}
                onChange={(e) => setForm((f) => ({ ...f, checkInTime: e.target.value }))}
                disabled={!canEdit}
                className="rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2.5 disabled:opacity-60"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Check-out time</span>
              <input
                type="time"
                value={form.checkOutTime}
                onChange={(e) => setForm((f) => ({ ...f, checkOutTime: e.target.value }))}
                disabled={!canEdit}
                className="rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2.5 disabled:opacity-60"
              />
            </label>
          </div>

          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
          )}
          {saved && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Settings saved.
            </p>
          )}

          {canEdit ? (
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save settings'}
            </button>
          ) : (
            <p className="text-sm text-[var(--color-muted)]">
              Ask a manager to update property settings.
            </p>
          )}
        </form>
      </Panel>
    </div>
  )
}
