import { useEffect, useState } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel } from '../components/ui/Panel'
import { useRbac } from '../context/RbacContext'
import { useGuestplace } from '../context/GuestplaceContext'
import type { PropertyRates, PropertySettings, RoomRateBand } from '../types'
import { formatMoney } from '../utils/currency'

function RateBandFields({
  title,
  band,
  onChange,
  disabled,
}: {
  title: string
  band: RoomRateBand
  onChange: (band: RoomRateBand) => void
  disabled: boolean
}) {
  const fields: { key: keyof RoomRateBand; label: string }[] = [
    { key: 'fullDay', label: 'Full day' },
    { key: 'perHour', label: 'Per hour' },
    { key: 'twoHours', label: '2 hours' },
  ]

  return (
    <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-cream)] p-4">
      <p className="mb-3 text-sm font-semibold text-[var(--color-ink)]">{title}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {fields.map(({ key, label }) => (
          <label key={key} className="flex flex-col gap-1.5 text-sm">
            <span className="text-[var(--color-muted)]">{label}</span>
            <div className="flex items-center gap-1">
              <span className="text-[var(--color-muted)]">₵</span>
              <input
                type="number"
                min={0}
                value={band[key]}
                disabled={disabled}
                onChange={(e) =>
                  onChange({ ...band, [key]: Math.max(0, Number(e.target.value)) })
                }
                className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 disabled:opacity-60"
              />
            </div>
            <span className="text-xs text-[var(--color-muted)]">{formatMoney(band[key])}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

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

  const updateRates = (rates: PropertyRates) => {
    setForm((f) => ({ ...f, rates }))
  }

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
      <PageHeader title="Settings" subtitle="Your guest house details and room rates" />

      <Panel>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-[var(--color-ink)]">Property</h2>
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

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">WiFi password</span>
              <input
                value={form.wifiPassword ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, wifiPassword: e.target.value }))}
                disabled={!canEdit}
                placeholder="Shown on guest folio links"
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
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-[var(--color-ink)]">Room rates (₵)</h2>
            <p className="text-sm text-[var(--color-muted)]">
              Applied when booking based on whether the room has air conditioning.
            </p>
            <RateBandFields
              title="Air conditioned"
              band={form.rates.ac}
              disabled={!canEdit}
              onChange={(ac) => updateRates({ ...form.rates, ac })}
            />
            <RateBandFields
              title="Non air conditioned"
              band={form.rates.nonAc}
              disabled={!canEdit}
              onChange={(nonAc) => updateRates({ ...form.rates, nonAc })}
            />
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
