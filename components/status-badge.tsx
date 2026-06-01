import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: string
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  size?: 'sm' | 'md'
}

interface StatusStyle {
  badge: string
  dot: string
}

const statusConfig: Record<string, StatusStyle> = {
  // Active/Completed/Success
  active: {
    badge: 'bg-emerald-50/60 text-emerald-700 border-emerald-200/50 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
    dot: 'bg-emerald-500',
  },
  completed: {
    badge: 'bg-emerald-50/60 text-emerald-700 border-emerald-200/50 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
    dot: 'bg-emerald-500',
  },
  booked: {
    badge: 'bg-emerald-50/60 text-emerald-700 border-emerald-200/50 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
    dot: 'bg-emerald-500',
  },
  on_track: {
    badge: 'bg-emerald-50/60 text-emerald-700 border-emerald-200/50 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
    dot: 'bg-emerald-500',
  },
  converted: {
    badge: 'bg-emerald-50/60 text-emerald-700 border-emerald-200/50 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
    dot: 'bg-emerald-500',
  },

  // Info/Blue statuses
  in_progress: {
    badge: 'bg-blue-50/60 text-blue-700 border-blue-200/50 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
    dot: 'bg-blue-500',
  },
  'in-progress': {
    badge: 'bg-blue-50/60 text-blue-700 border-blue-200/50 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
    dot: 'bg-blue-500',
  },
  confirmed: {
    badge: 'bg-blue-50/60 text-blue-700 border-blue-200/50 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
    dot: 'bg-blue-500',
  },
  new: {
    badge: 'bg-blue-50/60 text-blue-700 border-blue-200/50 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
    dot: 'bg-blue-500',
  },
  assigned: {
    badge: 'bg-blue-50/60 text-blue-700 border-blue-200/50 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
    dot: 'bg-blue-500',
  },

  // Pending/Yellow/Orange
  pending: {
    badge: 'bg-amber-50/60 text-amber-700 border-amber-200/50 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
    dot: 'bg-amber-500',
  },
  paused: {
    badge: 'bg-orange-50/60 text-orange-700 border-orange-200/50 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20',
    dot: 'bg-orange-500',
  },
  behind: {
    badge: 'bg-amber-50/60 text-amber-700 border-amber-200/50 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
    dot: 'bg-amber-500',
  },

  // Red/Danger/Expired/Cancelled
  expired: {
    badge: 'bg-rose-50/60 text-rose-700 border-rose-200/50 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
    dot: 'bg-rose-500',
  },
  cancelled: {
    badge: 'bg-rose-50/60 text-rose-700 border-rose-200/50 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
    dot: 'bg-rose-500',
  },
  lost: {
    badge: 'bg-rose-50/60 text-rose-700 border-rose-200/50 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
    dot: 'bg-rose-500',
  },
  off_track: {
    badge: 'bg-rose-50/60 text-rose-700 border-rose-200/50 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
    dot: 'bg-rose-500',
  },
  skipped: {
    badge: 'bg-rose-50/60 text-rose-700 border-rose-200/50 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
    dot: 'bg-rose-500',
  },

  // Gray/Neutral/Not Started
  not_started: {
    badge: 'bg-slate-50/60 text-slate-700 border-slate-200/60 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20',
    dot: 'bg-slate-400',
  },
  inactive: {
    badge: 'bg-slate-50/60 text-slate-700 border-slate-200/60 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20',
    dot: 'bg-slate-400',
  },

  // Purple/Indigo
  contacted: {
    badge: 'bg-purple-50/60 text-purple-700 border-purple-200/50 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20',
    dot: 'bg-purple-500',
  },
  qualified: {
    badge: 'bg-indigo-50/60 text-indigo-700 border-indigo-200/50 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20',
    dot: 'bg-indigo-500',
  },
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status.toLowerCase()] || statusConfig.pending
  const sizeClass = size === 'sm' ? 'h-6 px-2.5 text-[10px] tracking-wide' : 'h-[30px] px-3.5 text-xs tracking-wide'

  return (
    <span className={cn('inline-flex items-center justify-center gap-1.5 font-semibold rounded-full border transition-colors select-none whitespace-nowrap', sizeClass, config.badge)}>
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', config.dot)} />
      <span>{status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')}</span>
    </span>
  )
}

