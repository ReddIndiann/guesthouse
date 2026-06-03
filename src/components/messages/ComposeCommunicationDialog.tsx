import { useEffect, useMemo, useState } from 'react'
import {
  applyTemplateVariables,
  openCommunicationLink,
} from '../../utils/communications'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { useAuth } from '../../context/AuthContext'
import { useGuestplace } from '../../context/GuestplaceContext'
import type { CommunicationType } from '../../types'

interface ComposeCommunicationDialogProps {
  type: CommunicationType
  open: boolean
  onClose: () => void
}

export function ComposeCommunicationDialog({
  type,
  open,
  onClose,
}: ComposeCommunicationDialogProps) {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const { profile } = useAuth()
  const { guests, settings, messageTemplates, sendCommunication } = useGuestplace()

  const [guestId, setGuestId] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sortedGuests = useMemo(
    () => [...guests].sort((a, b) => a.name.localeCompare(b.name)),
    [guests],
  )

  const templates = useMemo(
    () => messageTemplates.filter((t) => t.type === type),
    [messageTemplates, type],
  )

  const selectedGuest = sortedGuests.find((g) => g.id === guestId)
  const recipient = type === 'email' ? selectedGuest?.email : selectedGuest?.phone

  const fillFromTemplate = (templateId: string, guest?: (typeof sortedGuests)[0]) => {
    const template = templates.find((t) => t.id === templateId)
    if (!template) return
    const vars = {
      propertyName: settings.name,
      checkInTime: settings.checkInTime,
      checkOutTime: settings.checkOutTime,
      guestName: guest?.name,
    }
    if (type === 'email' && template.subject) {
      setSubject(applyTemplateVariables(template.subject, vars))
    }
    setBody(applyTemplateVariables(template.body, vars))
  }

  const applyTemplate = (id: string) => {
    setTemplateId(id)
    fillFromTemplate(id, selectedGuest)
  }

  const handleGuestChange = (id: string) => {
    setGuestId(id)
    const guest = sortedGuests.find((g) => g.id === id)
    if (templateId) fillFromTemplate(templateId, guest)
  }

  useEffect(() => {
    if (!open) return
    setGuestId('')
    setSubject('')
    setBody('')
    setTemplateId('')
    setError(null)
  }, [open, type])

  const handleSend = async () => {
    if (!guestId || !body.trim() || !recipient?.trim()) {
      setError(
        type === 'email'
          ? 'Select a guest with an email address'
          : 'Select a guest with a phone number',
      )
      return
    }
    if (type === 'email' && !subject.trim()) {
      setError('Subject is required')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await sendCommunication({
        type,
        guestId,
        recipient: recipient.trim(),
        subject: type === 'email' ? subject.trim() : undefined,
        body: body.trim(),
        createdBy: profile?.uid ?? '',
        createdByName: profile?.displayName ?? 'Staff',
      })
      openCommunicationLink(type, recipient.trim(), body.trim(), subject.trim() || undefined)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullScreen={fullScreen} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 600, pb: 0 }}>
        {type === 'email' ? 'Compose email' : 'Compose message'}
      </DialogTitle>
      <DialogContent className="flex flex-col gap-4 pt-4">
        <FormControl fullWidth size="small" required>
          <InputLabel>Guest</InputLabel>
          <Select label="Guest" value={guestId} onChange={(e) => handleGuestChange(e.target.value)}>
            {sortedGuests.map((guest) => (
              <MenuItem key={guest.id} value={guest.id}>
                {guest.name}
                {type === 'email'
                  ? guest.email
                    ? ` · ${guest.email}`
                    : ' · no email'
                  : guest.phone
                    ? ` · ${guest.phone}`
                    : ' · no phone'}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth size="small">
          <InputLabel>Template</InputLabel>
          <Select
            label="Template"
            value={templateId}
            onChange={(e) => applyTemplate(e.target.value)}
          >
            <MenuItem value="">None</MenuItem>
            {templates.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                {t.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {type === 'email' && (
          <TextField
            label="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            fullWidth
          />
        )}

        <TextField
          label="Message"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          multiline
          rows={6}
          required
          fullWidth
        />

        {recipient && (
          <p className="text-xs text-[var(--color-muted)]">
            Opens your {type === 'email' ? 'email' : 'messages'} app to send to {recipient}
          </p>
        )}

        {error && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSend} disabled={submitting || sortedGuests.length === 0}>
          {submitting ? 'Saving…' : type === 'email' ? 'Send email' : 'Send message'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
