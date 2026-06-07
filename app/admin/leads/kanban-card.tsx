'use client'

import { useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Lead, LeadTemperature } from '@/lib/services/lead.service'
import {
  IconBrandWhatsapp,
  IconCheck,
  IconEdit,
  IconGripVertical,
  IconMessage,
  IconPhone,
  IconFileInvoice,
} from '@tabler/icons-react'

interface KanbanCardProps {
  lead: Lead
  onConvert: () => void
  onEdit: () => void
  onCall: () => void
  onWhatsApp: () => void
  onAddNote: () => void
  onInvoice?: () => void
  isPending: boolean
  source: string
  isFollowUpToday: boolean
  leadAgeDays: number
  isDragDisabled?: boolean
}

export default function KanbanCard({
  lead,
  onConvert,
  onEdit,
  onCall,
  onWhatsApp,
  onAddNote,
  onInvoice,
  isPending,
  source,
  isFollowUpToday,
  leadAgeDays,
  isDragDisabled = false,
}: KanbanCardProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: lead.id,
    disabled: isDragDisabled,
  })

  const getSourceAccentColor = (source: string) => {
    const normalized = source.toLowerCase().replace(/\s+/g, '-')
    switch (normalized) {
      case 'website':
        return 'border-l-4 border-l-blue-500 bg-blue-50'
      case 'referral':
        return 'border-l-4 border-l-green-500 bg-green-50'
      case 'social-media':
        return 'border-l-4 border-l-pink-500 bg-pink-50'
      case 'direct':
        return 'border-l-4 border-l-orange-500 bg-orange-50'
      case 'landing-page':
        return 'border-l-4 border-l-purple-500 bg-purple-50'
      default:
        return 'border-l-4 border-l-gray-500 bg-gray-50'
    }
  }

  const getTemperatureColor = (temperature: LeadTemperature) => {
    if (temperature === 'cold') return 'bg-sky-100 text-sky-800'
    if (temperature === 'warm') return 'bg-amber-100 text-amber-800'
    return 'bg-red-100 text-red-800'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800'
      case 'contacted':
        return 'bg-yellow-100 text-yellow-800'
      case 'qualified':
        return 'bg-purple-100 text-purple-800'
      case 'converted':
        return 'bg-green-100 text-green-800'
      case 'lost':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleAction = (actionFn: () => void) => {
    setIsDetailsOpen(false)
    actionFn()
  }

  return (
    <>
      <div
        ref={setNodeRef}
        className={`rounded-md border p-3 space-y-2 transition-all cursor-pointer hover:shadow-md hover:-translate-y-[1px] active:scale-[0.99] ${getSourceAccentColor(
          source
        )} ${isFollowUpToday ? 'ring-2 ring-orange-300' : ''} ${isDragging ? 'opacity-50 ring-2 ring-blue-400' : ''}`}
        onClick={() => setIsDetailsOpen(true)}
      >
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{lead.name}</div>
            <div className="text-xs text-muted-foreground truncate">{lead.phone || 'No phone'}</div>
          </div>
          {!isDragDisabled && (
            <button
              type="button"
              className="p-1 -m-1 text-gray-400 hover:text-gray-600 transition-colors"
              {...listeners}
              {...attributes}
              onClick={(e) => {
                e.stopPropagation()
              }}
            >
              <IconGripVertical className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex gap-1 flex-wrap">
          <Badge className={getTemperatureColor(lead.temperature)} variant="secondary">
            {lead.temperature}
          </Badge>
          <Badge className={getStatusColor(lead.status)} variant="secondary">
            {lead.status}
          </Badge>
          <Badge variant="outline">{lead.source}</Badge>
        </div>
      </div>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="text-lg font-bold flex items-center justify-between gap-4">
              <span className="truncate">{lead.name}</span>
            </DialogTitle>
            <div className="flex gap-1.5 flex-wrap pt-1.5">
              <Badge className={getTemperatureColor(lead.temperature)} variant="secondary">
                {lead.temperature}
              </Badge>
              <Badge className={getStatusColor(lead.status)} variant="secondary">
                {lead.status}
              </Badge>
              <Badge variant="outline">{lead.source}</Badge>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Email</span>
                <span className="text-foreground font-medium block truncate" title={lead.email}>
                  {lead.email || '—'}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Phone</span>
                <span className="text-foreground font-medium block">
                  {lead.phone || '—'}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Assigned Staff</span>
                <span className="text-foreground font-medium block">
                  {lead.assignedStaffName || 'Unassigned'}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Source</span>
                <span className="text-foreground font-medium block">
                  {lead.source || '—'}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Aging</span>
                <span className="text-foreground font-medium block">
                  {leadAgeDays} days
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Total Contacts</span>
                <span className="text-foreground font-medium block">
                  {lead.contactCount || 0} times
                </span>
              </div>
            </div>

            {lead.followUpDate && (
              <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 p-2.5 border border-amber-200/50 flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wider">Scheduled Follow Up</span>
                <span className="text-sm font-medium text-amber-900 dark:text-amber-200">
                  {new Date(lead.followUpDate).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>
            )}

            {lead.interactions.length > 0 && (
              <div className="space-y-2 border-t pt-3">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent Notes</div>
                <div className="rounded-md border bg-muted/30 p-3 space-y-3 max-h-[160px] overflow-y-auto">
                  {lead.interactions.map((item) => (
                    <div key={item.id} className="text-xs space-y-0.5 border-b last:border-0 pb-2 last:pb-0">
                      <p className="text-foreground leading-relaxed">{item.note}</p>
                      {item.createdAt && (
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(item.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-3 border-t flex-wrap">
            <Button
              size="sm"
              variant="outline"
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-100 flex-1 h-9"
              disabled={isPending || !lead.phone}
              onClick={() => handleAction(onCall)}
              title="Call lead"
            >
              <IconPhone className="w-4 h-4 mr-1.5" />
              Call
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 flex-1 h-9"
              disabled={isPending || !lead.phone}
              onClick={() => handleAction(onWhatsApp)}
              title="WhatsApp lead"
            >
              <IconBrandWhatsapp className="w-4 h-4 mr-1.5" />
              WA
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-violet-600 hover:text-violet-700 hover:bg-violet-100 flex-1 h-9"
              disabled={isPending}
              onClick={() => handleAction(onAddNote)}
              title="Add interactions note"
            >
              <IconMessage className="w-4 h-4 mr-1.5" />
              Note
            </Button>
            {lead.status !== 'converted' && onInvoice && (
              <Button
                size="sm"
                variant="outline"
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-100 flex-1 h-9"
                disabled={isPending}
                onClick={() => handleAction(onInvoice)}
                title="Convert & Invoice"
              >
                <IconFileInvoice className="w-4 h-4 mr-1.5" />
                Invoice
              </Button>
            )}
            {lead.status !== 'converted' && (
              <Button
                size="sm"
                variant="outline"
                className="text-green-600 hover:text-green-700 hover:bg-green-100 flex-1 h-9"
                disabled={isPending}
                onClick={() => handleAction(onConvert)}
                title="Convert lead"
              >
                <IconCheck className="w-4 h-4 mr-1.5" />
                Convert
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="text-muted-foreground flex-1 h-9"
              disabled={isPending}
              onClick={() => handleAction(onEdit)}
              title="Edit lead details"
            >
              <IconEdit className="w-4 h-4 mr-1.5" />
              Edit
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
