'use client'

export type BookingSegment = 'all' | 'pending' | 'booked' | 'completed'

interface BookingStatusTabsProps {
  value: BookingSegment
  onChange: (next: BookingSegment) => void
  counts?: Partial<Record<BookingSegment, number>>
}

const SEGMENTS: { key: BookingSegment; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'booked', label: 'Booked' },
  { key: 'completed', label: 'Completed' },
]

export function BookingStatusTabs({
  value,
  onChange,
  counts,
}: BookingStatusTabsProps) {
  return (
    <div className="flex gap-1 rounded-md border p-1">
      {SEGMENTS.map((seg) => {
        const active = value === seg.key
        const count = counts?.[seg.key]
        return (
          <button
            key={seg.key}
            type="button"
            onClick={() => onChange(seg.key)}
            className={`rounded px-3 py-1 text-sm transition-colors ${
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {seg.label}
            {typeof count === 'number' && (
              <span
                className={`ml-1.5 text-xs ${
                  active ? 'opacity-90' : 'opacity-70'
                }`}
              >
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
