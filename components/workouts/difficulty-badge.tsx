'use client'

import { Badge } from '@/components/ui/badge'
import type { Difficulty } from '@/types/workout'

const DIFFICULTY_CONFIG: Record<Difficulty, { className: string }> = {
  Beginner: { className: 'bg-sky-500/10 text-sky-500 border-sky-500/20' },
  Intermediate: { className: 'bg-violet-500/10 text-violet-500 border-violet-500/20' },
  Advanced: { className: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
}

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const config = DIFFICULTY_CONFIG[difficulty]
  return (
    <Badge variant="outline" className={config.className}>
      {difficulty}
    </Badge>
  )
}
