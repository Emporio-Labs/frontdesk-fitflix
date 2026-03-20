import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  count?: number
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-gray-200 dark:bg-gray-700 rounded',
        className
      )}
    />
  )
}

export function SkeletonTable() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  )
}
