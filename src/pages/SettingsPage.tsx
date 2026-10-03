import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel } from '../components/ui/Panel'
import { useRbac } from '../context/RbacContext'
import { useGuestplace } from '../context/GuestplaceContext'
import type { PropertyCategory, PropertyRates, PropertySettings, RoomRateBand } from '../types'
import { DEFAULT_AIRBNB_RATES, DEFAULT_HOTEL_RATES } from '../types'
import { SuggestionQRPanel } from '../components/settings/SuggestionQRPanel'
import { ThemeSelector } from '../components/settings/ThemeSelector'
import { useAuth } from '../context/AuthContext'
import { useTenant } from '../context/TenantContext'
import { formatMoney } from '../utils/currency'
import { applyThemeToDocument } from '../utils/theme'

const CATEGORY_OPTIONS: { id: PropertyCategory; label: string; icon: string; desc: string }[] = [
  { id: 'guesthouse', label: 'Guest House / Lodge', icon: '🏡', desc: 'Hourly walk-ins & daily rates' },
  { id: 'hotel', label: 'Boutique Hotel', icon: '🏨', desc: 'Room tiers & nightly folios' },
  { id: 'airbnb', label: 'Airbnb / Apartments', icon: '🔑', desc: 'Nightly stays, cleaning & self check-in' },
  { id: 'resort', label: 'Resort / Retreat', icon: '🌴', desc: 'Leisure villas & full day rates' },
]

type RateField = keyof RoomRateBand
const rateFields: { field: RateField; label: string }[] = [
  { field: 'oneHour', label: '1 hour' },
  { field: 'twoHours', label: '2 hours' },
  { field: 'threeHours', label: '3 hours' },
  { field: 'fullDay', label: 'Full day' },
]

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
  return (
    <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-cream)] p-4">
      <p className="mb-3 text-sm font-semibold text-[var(--color-ink)]">{title}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {rateFields.map(({ field: key, label }) => (
          <label key={key} className="flex flex-col gap-1.5 text-sm">
            <span className="text-[var(--color-muted)]">{label}</span>
            <div className="flex items-center gap-1">
              <span className="text-[var(--color-muted)]">₵</span>
              <input
                type="number"
                min={0}
                value={band[key] ?? 0}
                disabled={disabled}
                onChange={(e) =>
                  onChange({ ...band, [key]: Math.max(0, Number(e.target.value)) })
                }
                className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 disabled:opacity-60"
              />
            </div>
            <span className="text-xs text-[var(--color-muted)]">{formatMoney(band[key] ?? 0)}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

export function SettingsPage() {
  const { can } = useRbac()
  const { profile } = useAuth()
  const { currentProperty, currentPropertyId, organization, isOrgAdmin, isSuperAdmin } = useTenant()
  const { settings, updateSettings } = useGuestplace()
  const canEdit = can('rooms.update') || isSuperAdmin || isOrgAdmin
  const canChangeModel = isOrgAdmin || isSuperAdmin

  const [form, setForm] = useState<PropertySettings>(settings)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingCategorySwitch, setPendingCategorySwitch] = useState<PropertyCategory | null>(null)

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

  const branchDisplayName = currentProperty?.name || form.name || 'Branch'
  const branchDisplayCode = currentProperty?.code

  return (
    <div>
      <PageHeader
        title="Branch Settings"
        subtitle={`Configure details and rates for ${branchDisplayName}${branchDisplayCode ? ` (${branchDisplayCode})` : ''}`}
      />

      <Panel>
        {/* Branch Context Banner */}
        <div className="mb-6 rounded-xl border border-[var(--color-line)] bg-[var(--color-cream)] p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[var(--color-ink)]">Current Branch:</span>
            <span className="font-medium text-[var(--color-ink)]">{branchDisplayName}</span>
            {branchDisplayCode && (
              <span className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px] border border-[var(--color-line)] text-[var(--color-muted)]">
                {branchDisplayCode}
              </span>
            )}
            {organization?.name && (
              <span className="text-[var(--color-accent)] font-medium">· {organization.name}</span>
            )}
          </div>
          <span className="text-[11px] text-[var(--color-muted)]">
            Rates and settings configured here apply uniquely to this branch.
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Operating Model / Property Category */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[var(--color-ink)] uppercase tracking-wider">
                Operating Model / Category
              </label>
              <span className="text-[11px] text-[var(--color-muted)]">
                {canChangeModel
                  ? 'Click a category to change (Owner only)'
                  : 'Fixed category (Account Owner only)'}
              </span>
            </div>

            {!canChangeModel ? (
              // Read-only locked view for regular staff
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-cream)]">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {CATEGORY_OPTIONS.find((c) => c.id === (form.propertyType || 'guesthouse'))?.icon || '🏡'}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[var(--color-ink)]">
                        {CATEGORY_OPTIONS.find((c) => c.id === (form.propertyType || 'guesthouse'))?.label || 'Guest House / Lodge'}
                      </span>
                      <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.2 text-[10px] font-medium text-emerald-800">
                        Active Model
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-muted)] mt-0.5">
                      {CATEGORY_OPTIONS.find((c) => c.id === (form.propertyType || 'guesthouse'))?.desc}
                    </p>
                  </div>
                </div>
                <span className="text-[11px] text-[var(--color-muted)] hidden sm:inline">
                  🔒 Locked for staff
                </span>
              </div>
            ) : (
              // Editable category selector with confirmation guard for Account Owner / Super Admin
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {CATEGORY_OPTIONS.map((cat) => {
                  const isSelected = (form.propertyType || 'guesthouse') === cat.id
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      disabled={!canEdit}
                      onClick={() => {
                        if (!isSelected) {
                          setPendingCategorySwitch(cat.id)
                        }
                      }}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition ${
                        isSelected
                          ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-ink)] font-semibold shadow-xs'
                          : 'border-[var(--color-line)] bg-white text-[var(--color-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-ink)] cursor-pointer'
                      }`}
                    >
                      <span className="text-xl mb-1">{cat.icon}</span>
                      <span className="text-xs font-medium">{cat.label}</span>
                      <span className="text-[10px] text-[var(--color-muted)] mt-0.5 leading-tight">{cat.desc}</span>
                      {isSelected && (
                        <span className="mt-1 text-[9px] font-semibold text-[var(--color-accent)] uppercase tracking-wider">
                          Active
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="space-y-4 pt-2 border-t border-[var(--color-line)]">
            <h2 className="text-sm font-semibold text-[var(--color-ink)]">Property Profile</h2>
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
                placeholder="Shown on guest folio links & receipts"
                className="rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2.5 disabled:opacity-60"
              />
            </label>

            {form.propertyType === 'airbnb' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="font-medium">Default Door / Keybox PIN</span>
                  <input
                    value={form.defaultDoorCode ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, defaultDoorCode: e.target.value }))}
                    disabled={!canEdit}
                    placeholder="e.g. 4829# or Lockbox 1234"
                    className="rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2.5 disabled:opacity-60"
                  />
                  <span className="text-[11px] text-[var(--color-muted)]">Sent automatically in WhatsApp check-in receipt</span>
                </label>

                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="font-medium">Self Check-in Instructions</span>
                  <input
                    value={form.checkInInstructions ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, checkInInstructions: e.target.value }))}
                    disabled={!canEdit}
                    placeholder="Gate entry, parking bay, elevator info..."
                    className="rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2.5 disabled:opacity-60"
                  />
                  <span className="text-[11px] text-[var(--color-muted)]">Included in self-service guest folio</span>
                </label>
              </div>
            )}

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

          {/* Theme & Brand Color */}
          <div className="pt-2 border-t border-[var(--color-line)]">
            <ThemeSelector
              valueThemeId={form.colorThemeId}
              valueAccentColor={form.accentColor}
              disabled={!canEdit}
              onChange={(colorThemeId, accentColor) => {
                setForm((f) => ({ ...f, colorThemeId, accentColor }))
                applyThemeToDocument(accentColor, colorThemeId)
              }}
            />
          </div>

          {/* Category-Specific Rates Configuration */}
          {form.propertyType === 'airbnb' ? (
            <div className="space-y-4 pt-2 border-t border-[var(--color-line)]">
              <div>
                <h2 className="text-sm font-semibold text-[var(--color-ink)]">Airbnb & Apartment Rates (₵)</h2>
                <p className="text-xs text-[var(--color-muted)] mt-0.5">
                  Standard nightly pricing and turnover cleaning fees applied to short-stay apartments.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="flex flex-col gap-1.5 text-sm rounded-xl border border-[var(--color-line)] bg-[var(--color-cream)] p-4">
                  <span className="font-medium text-[var(--color-ink)]">Nightly rate (₵)</span>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[var(--color-muted)]">₵</span>
                    <input
                      type="number"
                      min={0}
                      value={form.airbnbRates?.nightlyRate ?? DEFAULT_AIRBNB_RATES.nightlyRate}
                      disabled={!canEdit}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          airbnbRates: {
                            ...(f.airbnbRates ?? DEFAULT_AIRBNB_RATES),
                            nightlyRate: Math.max(0, Number(e.target.value)),
                          },
                        }))
                      }
                      className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 disabled:opacity-60"
                    />
                  </div>
                  <span className="text-xs text-[var(--color-muted)] mt-1">Base rate per night</span>
                </label>

                <label className="flex flex-col gap-1.5 text-sm rounded-xl border border-[var(--color-line)] bg-[var(--color-cream)] p-4">
                  <span className="font-medium text-[var(--color-ink)]">Weekend rate (₵)</span>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[var(--color-muted)]">₵</span>
                    <input
                      type="number"
                      min={0}
                      value={form.airbnbRates?.weekendRate ?? DEFAULT_AIRBNB_RATES.weekendRate ?? 750}
                      disabled={!canEdit}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          airbnbRates: {
                            ...(f.airbnbRates ?? DEFAULT_AIRBNB_RATES),
                            weekendRate: Math.max(0, Number(e.target.value)),
                          },
                        }))
                      }
                      className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 disabled:opacity-60"
                    />
                  </div>
                  <span className="text-xs text-[var(--color-muted)] mt-1">Fri – Sun rate</span>
                </label>

                <label className="flex flex-col gap-1.5 text-sm rounded-xl border border-[var(--color-line)] bg-[var(--color-cream)] p-4">
                  <span className="font-medium text-[var(--color-ink)]">Turnover cleaning fee (₵)</span>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[var(--color-muted)]">₵</span>
                    <input
                      type="number"
                      min={0}
                      value={form.airbnbRates?.cleaningFee ?? DEFAULT_AIRBNB_RATES.cleaningFee}
                      disabled={!canEdit}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          airbnbRates: {
                            ...(f.airbnbRates ?? DEFAULT_AIRBNB_RATES),
                            cleaningFee: Math.max(0, Number(e.target.value)),
                          },
                        }))
                      }
                      className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 disabled:opacity-60"
                    />
                  </div>
                  <span className="text-xs text-[var(--color-muted)] mt-1">One-time per stay</span>
                </label>

                <label className="flex flex-col gap-1.5 text-sm rounded-xl border border-[var(--color-line)] bg-[var(--color-cream)] p-4">
                  <span className="font-medium text-[var(--color-ink)]">Security deposit (₵)</span>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[var(--color-muted)]">₵</span>
                    <input
                      type="number"
                      min={0}
                      value={form.airbnbRates?.securityDeposit ?? DEFAULT_AIRBNB_RATES.securityDeposit ?? 200}
                      disabled={!canEdit}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          airbnbRates: {
                            ...(f.airbnbRates ?? DEFAULT_AIRBNB_RATES),
                            securityDeposit: Math.max(0, Number(e.target.value)),
                          },
                        }))
                      }
                      className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 disabled:opacity-60"
                    />
                  </div>
                  <span className="text-xs text-[var(--color-muted)] mt-1">Refundable deposit</span>
                </label>
              </div>
            </div>
          ) : form.propertyType === 'hotel' || form.propertyType === 'resort' ? (
            <div className="space-y-4 pt-2 border-t border-[var(--color-line)]">
              <div>
                <h2 className="text-sm font-semibold text-[var(--color-ink)]">
                  {form.propertyType === 'resort' ? 'Resort Villa & Room Nightly Rates (₵)' : 'Hotel Room Nightly Rates (₵)'}
                </h2>
                <p className="text-xs text-[var(--color-muted)] mt-0.5">
                  {form.propertyType === 'resort'
                    ? 'Category nightly rates applied when booking resort chalets, deluxe rooms, and luxury villas.'
                    : 'Category nightly rates applied when booking hotel rooms and executive suites.'}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="flex flex-col gap-1.5 text-sm rounded-xl border border-[var(--color-line)] bg-[var(--color-cream)] p-4">
                  <span className="font-medium text-[var(--color-ink)]">
                    {form.propertyType === 'resort' ? 'Standard Chalet / Room (₵/night)' : 'Standard Room (₵/night)'}
                  </span>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[var(--color-muted)]">₵</span>
                    <input
                      type="number"
                      min={0}
                      value={form.hotelRates?.standardNightly ?? DEFAULT_HOTEL_RATES.standardNightly}
                      disabled={!canEdit}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          hotelRates: {
                            ...(f.hotelRates ?? DEFAULT_HOTEL_RATES),
                            standardNightly: Math.max(0, Number(e.target.value)),
                          },
                        }))
                      }
                      className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 disabled:opacity-60"
                    />
                  </div>
                  <span className="text-xs text-[var(--color-muted)] mt-1">{formatMoney(form.hotelRates?.standardNightly ?? DEFAULT_HOTEL_RATES.standardNightly)}</span>
                </label>

                <label className="flex flex-col gap-1.5 text-sm rounded-xl border border-[var(--color-line)] bg-[var(--color-cream)] p-4">
                  <span className="font-medium text-[var(--color-ink)]">
                    {form.propertyType === 'resort' ? 'Deluxe Villa / Oceanfront (₵/night)' : 'Deluxe Room (₵/night)'}
                  </span>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[var(--color-muted)]">₵</span>
                    <input
                      type="number"
                      min={0}
                      value={form.hotelRates?.deluxeNightly ?? DEFAULT_HOTEL_RATES.deluxeNightly}
                      disabled={!canEdit}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          hotelRates: {
                            ...(f.hotelRates ?? DEFAULT_HOTEL_RATES),
                            deluxeNightly: Math.max(0, Number(e.target.value)),
                          },
                        }))
                      }
                      className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 disabled:opacity-60"
                    />
                  </div>
                  <span className="text-xs text-[var(--color-muted)] mt-1">{formatMoney(form.hotelRates?.deluxeNightly ?? DEFAULT_HOTEL_RATES.deluxeNightly)}</span>
                </label>

                <label className="flex flex-col gap-1.5 text-sm rounded-xl border border-[var(--color-line)] bg-[var(--color-cream)] p-4">
                  <span className="font-medium text-[var(--color-ink)]">
                    {form.propertyType === 'resort' ? 'Executive Suite / Presidential Villa (₵/night)' : 'Executive Suite (₵/night)'}
                  </span>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[var(--color-muted)]">₵</span>
                    <input
                      type="number"
                      min={0}
                      value={form.hotelRates?.suiteNightly ?? DEFAULT_HOTEL_RATES.suiteNightly}
                      disabled={!canEdit}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          hotelRates: {
                            ...(f.hotelRates ?? DEFAULT_HOTEL_RATES),
                            suiteNightly: Math.max(0, Number(e.target.value)),
                          },
                        }))
                      }
                      className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 disabled:opacity-60"
                    />
                  </div>
                  <span className="text-xs text-[var(--color-muted)] mt-1">{formatMoney(form.hotelRates?.suiteNightly ?? DEFAULT_HOTEL_RATES.suiteNightly)}</span>
                </label>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-2 border-t border-[var(--color-line)]">
              <div>
                <h2 className="text-sm font-semibold text-[var(--color-ink)]">Guest House Hourly & Daily Rates (₵)</h2>
                <p className="text-xs text-[var(--color-muted)] mt-0.5">
                  Applied when booking based on whether the room has air conditioning.
                </p>
              </div>
              <RateBandFields
                title="Air conditioned"
                band={form.rates.ac}
                disabled={!canEdit}
                onChange={(ac) => updateRates({ ...form.rates, ac })}
              />
              <RateBandFields
                title="Air conditioned (King size / Suite)"
                band={form.rates.acKing}
                disabled={!canEdit}
                onChange={(acKing) => updateRates({ ...form.rates, acKing })}
              />
              <RateBandFields
                title="Non air conditioned"
                band={form.rates.nonAc}
                disabled={!canEdit}
                onChange={(nonAc) => updateRates({ ...form.rates, nonAc })}
              />
            </div>
          )}

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
              Ask a manager or administrator of {branchDisplayName} to update property settings.
              {profile?.displayName && ` (Signed in as ${profile.displayName})`}
            </p>
          )}
        </form>
      </Panel>

      {currentPropertyId && (
        <div className="mt-6">
          <SuggestionQRPanel propertyId={currentPropertyId} settings={settings} />
        </div>
      )}

      {/* Confirmation Modal when Account Owner switches Operating Model */}
      {pendingCategorySwitch && (() => {
        const currentCat = CATEGORY_OPTIONS.find((c) => c.id === (form.propertyType || 'guesthouse'))
        const targetCat = CATEGORY_OPTIONS.find((c) => c.id === pendingCategorySwitch)

        return createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-[var(--color-line)] space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 text-lg">
                  ⚠️
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[var(--color-ink)]">
                    Change Operating Model?
                  </h3>
                  <p className="text-xs text-[var(--color-muted)] mt-0.5">
                    This will reconfigure this branch's pricing engine and front-desk workflows.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-cream)] p-3 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--color-muted)]">Current Model:</span>
                  <span className="font-semibold text-[var(--color-ink)] flex items-center gap-1">
                    <span>{currentCat?.icon}</span> {currentCat?.label}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-[var(--color-line)] pt-1.5">
                  <span className="text-[var(--color-muted)]">New Model:</span>
                  <span className="font-semibold text-[var(--color-accent)] flex items-center gap-1">
                    <span>{targetCat?.icon}</span> {targetCat?.label}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-[var(--color-muted)] bg-amber-50/70 border border-amber-200/60 rounded-xl p-3">
                <p className="font-medium text-amber-900">What will change:</p>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-800">
                  <li>Your rates panel will switch to {targetCat?.label} pricing structures.</li>
                  <li>Front-desk Walk-in & Reservation forms will adapt to {targetCat?.label} standards.</li>
                  <li>Digital folio links and WhatsApp receipts will update accordingly.</li>
                </ul>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPendingCategorySwitch(null)}
                  className="rounded-lg px-4 py-2 text-xs text-[var(--color-muted)] hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setForm((f) => ({ ...f, propertyType: pendingCategorySwitch }))
                    setPendingCategorySwitch(null)
                  }}
                  className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-xs font-semibold text-white hover:opacity-90 transition shadow-xs"
                >
                  Confirm & Switch to {targetCat?.label}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      })()}
    </div>
  )
}
