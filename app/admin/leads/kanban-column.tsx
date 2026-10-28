'use client'

import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'

interface KanbanColumnProps {
  id: string
  title: string
  hint?: string
  count: number
  accent: string
  /**
   * Still a droppable (so a drop can be explained with a toast), but shown
   * as refusing rather than accepting the card.
   */
  refusesDrop?: boolean
  children: React.ReactNode
}

export default function KanbanColumn({ id, title, hint, count, accent, refusesDrop = false, children }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <section
      ref={setNodeRef}
      aria-label={title}
      className={cn(
        'flex w-[78vw] shrink-0 snap-start flex-col rounded-xl border bg-muted/40 transition-colors sm:w-72 lg:w-auto lg:min-w-0 lg:flex-1',
        isOver && (refusesDrop ? 'ring-2 ring-red-300' : 'bg-primary/5 ring-2 ring-primary/40'),
      )}
    >
      <header className="flex items-center justify-between gap-2 px-3 pb-2 pt-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn('h-2 w-2 shrink-0 rounded-full', accent)} />
          <h3 className="truncate text-sm font-semibold">{title}</h3>
          <span className="rounded-full bg-background px-1.5 text-xs font-medium text-muted-foreground">{count}</span>
        </div>
      </header>
      {hint && <p className="-mt-1 px-3 pb-2 text-[11px] text-muted-foreground">{hint}</p>}
      <div className="flex max-h-[calc(100vh-330px)] min-h-[200px] flex-col gap-2 overflow-y-auto px-2 pb-2">
        {children}
      </div>
    </section>
  )
}
