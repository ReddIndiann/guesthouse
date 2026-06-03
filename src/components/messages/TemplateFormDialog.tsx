import { useEffect, useState } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import type { CommunicationType, MessageTemplate, MessageTemplateInput } from '../../types'
import { TEMPLATE_VARIABLE_HINT } from '../../utils/communications'

interface TemplateFormDialogProps {
  type: CommunicationType
  open: boolean
  onClose: () => void
  onSubmit: (input: MessageTemplateInput) => Promise<void>
  initial?: MessageTemplate | null
}

const emptyForm = (type: CommunicationType): MessageTemplateInput => ({
  type,
  name: '',
  subject: type === 'email' ? '' : undefined,
  body: '',
})

export function TemplateFormDialog({
  type,
  open,
  onClose,
  onSubmit,
  initial,
}: TemplateFormDialogProps) {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const isEdit = !!initial

  const [form, setForm] = useState<MessageTemplateInput>(emptyForm(type))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (initial) {
      setForm({
        type: initial.type,
        name: initial.name,
        subject: initial.subject,
        body: initial.body,
      })
    } else {
      setForm(emptyForm(type))
    }
    setError(null)
  }, [open, initial, type])

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError('Template name is required')
      return
    }
    if (!form.body.trim()) {
      setError('Message body is required')
      return
    }
    if (type === 'email' && !form.subject?.trim()) {
      setError('Subject is required for email templates')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({ ...form, type, name: form.name.trim() })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullScreen={fullScreen} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 600, pb: 0 }}>
        {isEdit ? 'Edit template' : 'New template'}
      </DialogTitle>
      <DialogContent className="flex flex-col gap-4 pt-4">
        <TextField
          label="Template name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          required
          fullWidth
        />

        {type === 'email' && (
          <TextField
            label="Subject"
            value={form.subject ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
            required
            fullWidth
          />
        )}

        <TextField
          label="Message"
          value={form.body}
          onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
          multiline
          rows={8}
          required
          fullWidth
          helperText={TEMPLATE_VARIABLE_HINT}
        />

        {error && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create template'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
