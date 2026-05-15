'use client'

import type { MuscleGroup } from '@/types/workout'
import {
  IconStretching,
  IconWalk,
  IconMountain,
  IconArrowUp,
  IconHandGrab,
  IconYoga,
} from '@tabler/icons-react'

const ICON_MAP: Record<MuscleGroup, React.ElementType> = {
  Chest: IconStretching,
  Back: IconMountain,
  Legs: IconWalk,
  Shoulders: IconArrowUp,
  Arms: IconHandGrab,
  Core: IconYoga,
}

const COLOR_MAP: Record<MuscleGroup, string> = {
  Chest: 'text-rose-500',
  Back: 'text-blue-500',
  Legs: 'text-emerald-500',
  Shoulders: 'text-amber-500',
  Arms: 'text-violet-500',
  Core: 'text-teal-500',
}

export function MuscleGroupIcon({
  group,
  className = 'w-4 h-4',
}: {
  group: MuscleGroup
  className?: string
}) {
  const Icon = ICON_MAP[group] ?? IconStretching
  return <Icon className={`${className} ${COLOR_MAP[group] ?? ''}`} />
}
