'use client'

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

const CATEGORIES = [
  'All',
  'Strength',
  'Hypertrophy',
  'Weight Loss',
  'Beginner',
  'Cardio',
] as const

export function TemplateCategoryFilter({
  value,
  onValueChange,
}: {
  value: string
  onValueChange: (value: string) => void
}) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => v && onValueChange(v)}
      className="justify-start"
    >
      {CATEGORIES.map((cat) => (
        <ToggleGroupItem
          key={cat}
          value={cat}
          className="text-xs h-8 px-3 rounded-full"
        >
          {cat}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
