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
  children: React.ReactNode
}

export default function KanbanColumn({
  id,
  title,
  count,
  leadColor,
  headerColor,
  isDragDisabled = false,
  children,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    disabled: isDragDisabled,
  })

  return (
    <Card
      ref={setNodeRef}
      className={`transition-colors ${isOver && !isDragDisabled ? 'ring-2 ring-blue-400 bg-blue-50' : ''}`}
    >
      <CardHeader>
        <CardTitle className={`text-base ${headerColor}`}>{title}</CardTitle>
        <CardDescription>{count} leads</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 min-h-[400px]">{children}</CardContent>
    </Card>
  )
}
