import { useMemo, useState } from 'react'
import { ComposeCommunicationDialog } from '../components/messages/ComposeCommunicationDialog'
import { TemplateFormDialog } from '../components/messages/TemplateFormDialog'
import { Panel } from '../components/ui/Panel'
import { PageHeader } from '../components/ui/PageHeader'
import { useRbac } from '../context/RbacContext'
import { useGuestplace } from '../context/GuestplaceContext'
import { formatCommunicationTime, TEMPLATE_VARIABLE_HINT } from '../utils/communications'
import type { CommunicationType, MessageTemplate } from '../types'

type MessagesTab = 'email' | 'sms' | 'templates'
type TemplateFilter = 'email' | 'sms'

export function MessagesPage() {
  const { can } = useRbac()
  const {
    communications,
    messageTemplates,
    getGuest,
    addMessageTemplate,
    updateMessageTemplate,
    deleteMessageTemplate,
  } = useGuestplace()
  const [tab, setTab] = useState<MessagesTab>('email')
  const [templateFilter, setTemplateFilter] = useState<TemplateFilter>('email')
  const [composeOpen, setComposeOpen] = useState(false)
  const [templateFormOpen, setTemplateFormOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null)

  const canSend = can('bookings.create')

  const filtered = useMemo(
    () => communications.filter((c) => c.type === tab),
    [communications, tab],
  )

  const filteredTemplates = useMemo(
    () => messageTemplates.filter((t) => t.type === templateFilter),
    [messageTemplates, templateFilter],
  )

  const composeType: CommunicationType = tab === 'sms' ? 'sms' : 'email'

  const handleDeleteTemplate = async (template: MessageTemplate) => {
    if (!window.confirm(`Delete template "${template.name}"?`)) return
    await deleteMessageTemplate(template.id)
  }

  return (
    <div>
      <PageHeader
        title="Mail & Messages"
        subtitle="Email, SMS, and reusable templates"
        action={
          tab === 'templates' && canSend ? (
            <button
              type="button"
              onClick={() => {
                setEditingTemplate(null)
                setTemplateFormOpen(true)
              }}
              className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white"
            >
              + New template
            </button>
          ) : tab !== 'templates' && canSend ? (
            <button
              type="button"
              onClick={() => setComposeOpen(true)}
              className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white"
            >
              {tab === 'email' ? '+ Compose email' : '+ New message'}
            </button>
          ) : undefined
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {(
          [
            { id: 'email' as const, label: 'Mail' },
            { id: 'sms' as const, label: 'Messages' },
            { id: 'templates' as const, label: 'Templates' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-[var(--color-accent)] text-white'
                : 'bg-white text-[var(--color-muted)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'templates' ? (
        <>
          <div className="mb-4 flex gap-2">
            {(['email', 'sms'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTemplateFilter(t)}
                className={`rounded-full px-3.5 py-1.5 text-sm ${
                  templateFilter === t
                    ? 'bg-[var(--color-accent-soft)] font-medium text-[var(--color-accent)]'
                    : 'text-[var(--color-muted)]'
                }`}
              >
                {t === 'email' ? 'Email templates' : 'SMS templates'}
              </button>
            ))}
          </div>

          <p className="mb-4 text-xs text-[var(--color-muted)]">{TEMPLATE_VARIABLE_HINT}</p>

          {filteredTemplates.length === 0 ? (
            <Panel className="py-12 text-center">
              <p className="text-lg font-medium text-[var(--color-ink)]">No templates yet</p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--color-muted)]">
                Create reusable email and SMS templates for your team.
              </p>
              {canSend && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingTemplate(null)
                    setTemplateFormOpen(true)
                  }}
                  className="mt-6 rounded-lg bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-white"
                >
                  Create template
                </button>
              )}
            </Panel>
          ) : (
            <div className="space-y-3">
              {filteredTemplates.map((template) => (
                <Panel key={template.id} className="!p-4 sm:!p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-[var(--color-ink)]">{template.name}</p>
                      {template.subject && (
                        <p className="mt-1 text-sm text-[var(--color-muted)]">
                          Subject: {template.subject}
                        </p>
                      )}
                      <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm text-[var(--color-muted)]">
                        {template.body}
                      </p>
                    </div>
                    {canSend && (
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTemplate(template)
                            setTemplateFormOpen(true)
                          }}
                          className="rounded-lg border border-[var(--color-line)] px-3 py-1.5 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTemplate(template)}
                          className="rounded-lg px-3 py-1.5 text-sm text-rose-600"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </Panel>
              ))}
            </div>
          )}

          <TemplateFormDialog
            type={editingTemplate?.type ?? templateFilter}
            open={templateFormOpen}
            onClose={() => {
              setTemplateFormOpen(false)
              setEditingTemplate(null)
            }}
            initial={editingTemplate}
            onSubmit={async (input) => {
              if (editingTemplate) {
                await updateMessageTemplate(editingTemplate.id, input)
              } else {
                await addMessageTemplate(input)
              }
            }}
          />
        </>
      ) : filtered.length === 0 ? (
        <Panel className="py-12 text-center">
          <p className="text-lg font-medium text-[var(--color-ink)]">
            No {tab === 'email' ? 'emails' : 'messages'} yet
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--color-muted)]">
            {canSend
              ? `Compose ${tab === 'email' ? 'an email' : 'a message'} to a guest. It will be logged here and open your ${tab === 'email' ? 'mail' : 'SMS'} app to send.`
              : 'Messages sent by staff will appear here.'}
          </p>
          {canSend && (
            <button
              type="button"
              onClick={() => setComposeOpen(true)}
              className="mt-6 rounded-lg bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-white"
            >
              {tab === 'email' ? 'Compose email' : 'New message'}
            </button>
          )}
        </Panel>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const guest = getGuest(item.guestId)
            return (
              <Panel key={item.id} className="!p-4 sm:!p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-[var(--color-ink)]">{guest?.name ?? 'Guest'}</p>
                      <span className="rounded-full bg-[var(--color-cream)] px-2 py-0.5 text-xs text-[var(--color-muted)]">
                        {item.recipient}
                      </span>
                    </div>
                    {item.subject && (
                      <p className="mt-1 text-sm font-medium text-[var(--color-ink)]">{item.subject}</p>
                    )}
                    <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-[var(--color-muted)]">
                      {item.body}
                    </p>
                  </div>
                  <div className="shrink-0 text-xs text-[var(--color-muted)] sm:text-right">
                    <p>{formatCommunicationTime(item.createdAt)}</p>
                    <p className="mt-1">by {item.createdByName}</p>
                  </div>
                </div>
              </Panel>
            )
          })}
        </div>
      )}

      {tab !== 'templates' && (
        <ComposeCommunicationDialog
          type={composeType}
          open={composeOpen}
          onClose={() => setComposeOpen(false)}
        />
      )}
    </div>
  )
}
