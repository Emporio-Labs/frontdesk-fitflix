'use client'

import { useDraggable } from '@dnd-kit/core'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Lead, LeadTemperature } from '@/lib/services/lead.service'
import { IconBrandWhatsapp, IconCheck, IconEdit, IconGripVertical, IconMessage, IconPhone, IconUser } from '@tabler/icons-react'

interface KanbanCardProps {
  lead: Lead
  onConvert: () => void
  onEdit: () => void
  onCall: () => void
  onWhatsApp: () => void
  onAddNote: () => void
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
  isPending,
  source,
  isFollowUpToday,
  leadAgeDays,
  isDragDisabled = false,
}: KanbanCardProps) {
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

  return (
    <div
      ref={setNodeRef}
      className={`rounded-md border p-3 space-y-2 transition-all ${getSourceAccentColor(
        source
      )} ${isFollowUpToday ? 'ring-2 ring-orange-300' : ''} ${isDragging ? 'opacity-50 ring-2 ring-blue-400' : ''}`}
    >
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{lead.name}</div>
          <div className="text-xs text-muted-foreground truncate">{lead.email}</div>
          <div className="text-xs text-muted-foreground truncate">{lead.phone || 'No phone'}</div>
        </div>
        {!isDragDisabled && (
          <button
            type="button"
            className="p-1 -m-1 text-gray-400 hover:text-gray-600"
            {...listeners}
            {...attributes}
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

      <div className="text-xs text-muted-foreground flex items-center gap-1">
        <IconUser className="w-3 h-3" />
        {lead.assignedStaffName || 'Unassigned'}
      </div>

      {lead.followUpDate && (
        <div className="text-xs text-muted-foreground">
          Follow up: {lead.followUpDate}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
        <span>Aging: {leadAgeDays}d</span>
        <span>Contacts: {lead.contactCount || 0}</span>
      </div>

      {lead.interactions.length > 0 && (
        <div className="rounded border bg-white/60 p-2">
          <div className="text-[11px] font-medium text-muted-foreground mb-1">Recent Notes</div>
          <ul className="space-y-1">
            {lead.interactions.slice(0, 2).map((item) => (
              <li key={item.id} className="text-[11px] text-muted-foreground truncate">
                {item.note}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-1 pt-2">
        <Button
          size="sm"
          variant="ghost"
          className="text-blue-600 hover:text-blue-700 hover:bg-blue-100"
          disabled={isPending || !lead.phone}
          onClick={onCall}
        >
          <IconPhone className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100"
          disabled={isPending || !lead.phone}
          onClick={onWhatsApp}
        >
          <IconBrandWhatsapp className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-violet-600 hover:text-violet-700 hover:bg-violet-100"
          disabled={isPending}
          onClick={onAddNote}
        >
          <IconMessage className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-green-600 hover:text-green-700 hover:bg-green-100 flex-1"
          disabled={isPending}
          onClick={onConvert}
        >
          <IconCheck className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="flex-1 text-muted-foreground"
          disabled={isPending}
          onClick={onEdit}
        >
          <IconEdit className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
