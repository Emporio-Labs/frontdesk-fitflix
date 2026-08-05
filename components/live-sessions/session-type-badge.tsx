import { Badge } from '@/components/ui/badge'
import { IconVideo, IconBroadcast } from '@tabler/icons-react'
import { cn } from '@/lib/utils'

interface SessionTypeBadgeProps {
  sessionType: 'group_class' | 'live_stream' | ''
  className?: string
}

export function SessionTypeBadge({ sessionType, className }: SessionTypeBadgeProps) {
  if (sessionType === 'live_stream') {
    return (
      <Badge className={cn('bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 hover:bg-purple-100', className)}>
        <IconBroadcast className="mr-1 h-3 w-3" />
        Live Streaming
      </Badge>
    )
  }

  return (
    <Badge className={cn('bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 hover:bg-emerald-100', className)}>
      <IconVideo className="mr-1 h-3 w-3" />
      Video Conference
    </Badge>
  )
}
