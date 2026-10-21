'use client'

import { useDroppable } from '@dnd-kit/core'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface KanbanColumnProps {
  id: string
  title: string
  count: number
  leadColor: string
  headerColor: string
  isDragDisabled?: boolean
  /**
   * Still a droppable (so a drop can be explained with a toast), but shown
   * as refusing rather than accepting the card.
   */
  refusesDrop?: boolean
  className?: string
  children: React.ReactNode
}

export default function KanbanColumn({
  id,
  title,
  count,
  leadColor,
  headerColor,
  isDragDisabled = false,
  refusesDrop = false,
  className = '',
  children,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    disabled: isDragDisabled,
  })

  return (
    <Card
      ref={setNodeRef}
      className={`transition-colors ${
        isOver && !isDragDisabled
          ? refusesDrop
            ? 'ring-2 ring-red-300 bg-red-50/50'
            : 'ring-2 ring-blue-400 bg-blue-50'
          : ''
      } ${className}`}
    >
      <CardHeader>
        <CardTitle className={`text-base ${headerColor}`}>{title}</CardTitle>
        <CardDescription>
          {count} leads
          {refusesDrop && <span className="block text-xs">Moves here when the invoice is paid</span>}
        </CardDescription>
      </CardHeader>
      <CardContent className="min-h-[400px]">
        <div className="space-y-3 max-h-[470px] overflow-y-auto pr-1">
          {children}
        </div>
      </CardContent>
    </Card>
  )
}
