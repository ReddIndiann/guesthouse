import type { CommunicationType, MessageTemplateInput } from '../types'

export function openCommunicationLink(
  type: CommunicationType,
  recipient: string,
  body: string,
  subject?: string,
): void {
  if (type === 'email') {
    const params = new URLSearchParams()
    if (subject) params.set('subject', subject)
    params.set('body', body)
    window.location.href = `mailto:${encodeURIComponent(recipient)}?${params.toString()}`
    return
  }

  const phone = recipient.replace(/\s/g, '')
  const params = new URLSearchParams()
  params.set('body', body)
  window.location.href = `sms:${phone}?${params.toString()}`
}

export function formatCommunicationTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GH', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function applyTemplateVariables(
  text: string,
  vars: {
    propertyName: string
    checkInTime: string
    checkOutTime: string
    guestName?: string
  },
): string {
  return text
    .replaceAll('{propertyName}', vars.propertyName)
    .replaceAll('{checkInTime}', vars.checkInTime)
    .replaceAll('{checkOutTime}', vars.checkOutTime)
    .replaceAll('{guestName}', vars.guestName ?? 'guest')
}

export function getDefaultMessageTemplates(): MessageTemplateInput[] {
  return [
    {
      type: 'email',
      name: 'Booking confirmation',
      subject: 'Your booking at {propertyName}',
      body: 'Dear {guestName},\n\nThank you for booking with {propertyName}. We look forward to welcoming you.\n\nWarm regards,\n{propertyName}',
    },
    {
      type: 'email',
      name: 'Check-in reminder',
      subject: 'Check-in reminder — {propertyName}',
      body: 'Dear {guestName},\n\nReminder: your check-in at {propertyName} is from {checkInTime}.\n\nSee you soon!\n{propertyName}',
    },
    {
      type: 'email',
      name: 'Thank you after stay',
      subject: 'Thank you for staying with us',
      body: 'Dear {guestName},\n\nThank you for staying at {propertyName}. We hope to welcome you again soon.\n\n{propertyName}',
    },
    {
      type: 'sms',
      name: 'Check-in reminder',
      body: 'Hi {guestName}! Reminder: check-in at {propertyName} is from {checkInTime}. See you soon!',
    },
    {
      type: 'sms',
      name: 'Welcome',
      body: 'Welcome to {propertyName}, {guestName}! Check-out is {checkOutTime}. Let us know if you need anything.',
    },
    {
      type: 'sms',
      name: 'Thank you',
      body: 'Thank you for staying at {propertyName}. We hope to see you again!',
    },
  ]
}

export const TEMPLATE_VARIABLE_HINT =
  'Use {propertyName}, {guestName}, {checkInTime}, {checkOutTime} in templates'
