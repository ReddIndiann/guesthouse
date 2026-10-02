import { useState, type FormEvent } from 'react'
import { createGlobalStaffUser } from '../../lib/staff'
import type { Organization, PropertyItem } from '../../types/tenant'

interface AddStaffModalProps {
  open: boolean
  onClose: () => void
  organizations: Organization[]
  properties: PropertyItem[]
  adminUid: string
  onCreated: () => void
}

export function AddStaffModal({
  open,
  onClose,
  organizations,
  properties,
  adminUid,
  onCreated,
}: AddStaffModalProps) {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [userType, setUserType] = useState<'staff' | 'org_admin' | 'super_admin'>('staff')
  const [organizationId, setOrganizationId] = useState<string>('')
  const [propertyId, setPropertyId] = useState<string>('')
  const [roleId, setRoleId] = useState<string>('template-receptionist')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  // Filter properties by selected organization
  const availableProperties = organizationId
    ? properties.filter((p) => p.organizationId === organizationId)
    : properties

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return
    setError(null)
    setSubmitting(true)

    if (userType === 'staff' && !propertyId) {
      setError('Please select an assigned branch for this staff member.')
      return
    }

    try {
      const selectedOrg = organizations.find((o) => o.id === organizationId)
      const selectedProp = properties.find((p) => p.id === propertyId)

      await createGlobalStaffUser(
        {
          displayName: displayName.trim() || email.split('@')[0],
          email: email.trim(),
          password,
          organizationId: organizationId || undefined,
          organizationName: selectedOrg?.name || undefined,
          propertyId: propertyId || selectedProp?.id || '',
          roleId,
          isSuperAdmin: userType === 'super_admin',
          userType,
        },
        adminUid,
      )

      onCreated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create staff member')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-[var(--color-line)] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-[var(--color-line)]">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-ink)]">Add staff member</h2>
            <p className="text-xs text-[var(--color-muted)] mt-0.5">
              Create a new account and set their organizational assignment
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--color-muted)] hover:bg-[var(--color-cream)] hover:text-[var(--color-ink)] transition"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">
              Full name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Richmond Asare"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2 text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)] focus:bg-white transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">
                Email address *
              </label>
              <input
                type="email"
                required
                placeholder="staff@guesthouse.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2 text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)] focus:bg-white transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">
                Password *
              </label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2 text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)] focus:bg-white transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">
              Platform account level
            </label>
            <select
              value={userType}
              onChange={(e) => setUserType(e.target.value as 'staff' | 'org_admin' | 'super_admin')}
              className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2 text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)] focus:bg-white transition"
            >
              <option value="staff">Property staff (Receptionist, Manager, Housekeeping)</option>
              <option value="org_admin">Organization admin (Manages organization & all branches)</option>
              <option value="super_admin">Platform super admin (Master oversight)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">
                Organization
              </label>
              <select
                value={organizationId}
                onChange={(e) => {
                  const newOrgId = e.target.value
                  setOrganizationId(newOrgId)
                  const orgProps = newOrgId
                    ? properties.filter((p) => p.organizationId === newOrgId)
                    : properties
                  setPropertyId(orgProps[0]?.id || '')
                }}
                className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2 text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)] focus:bg-white transition"
              >
                <option value="">None / Independent</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">
                Assigned branch {userType === 'staff' && <span className="text-rose-500">*</span>}
              </label>
              <select
                value={propertyId}
                required={userType === 'staff'}
                onChange={(e) => setPropertyId(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2 text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)] focus:bg-white transition"
              >
                <option value="">Select branch</option>
                {availableProperties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.code ? `(${p.code})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">
              Operational role
            </label>
            <select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2 text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)] focus:bg-white transition"
            >
              <option value="template-receptionist">Receptionist (Front desk check-in / out)</option>
              <option value="template-manager">Manager (Rooms, bookings, housekeeping, reports)</option>
              <option value="system-admin">Administrator (Full branch access)</option>
              <option value="template-viewer">Viewer (Read-only)</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--color-line)]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-[var(--color-muted)] hover:bg-[var(--color-cream)] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !email.trim() || !password.trim()}
              className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition"
            >
              {submitting ? 'Creating account…' : 'Create staff account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
