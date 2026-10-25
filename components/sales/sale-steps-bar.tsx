'use client'

import { IconCheck } from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import type { SaleStep } from './sale-utils'

const STEP_LABELS: Record<SaleStep, string> = {
  1: 'Person',
  2: 'Plan & branch',
  3: 'Invoice',
  4: 'Payment',
  5: 'Member ready',
}

interface Props {
  step: SaleStep
  /** What each finished step settled, e.g. "Ananya R. (lead)". */
  doneLabels: Partial<Record<SaleStep, string>>
  /** Steps the user may jump back to. */
  canGoTo: (step: SaleStep) => boolean
  onGoTo: (step: SaleStep) => void
}

export function SaleStepsBar({ step, doneLabels, canGoTo, onGoTo }: Props) {
  const finished = step === 5
  return (
    <ol className="grid grid-cols-5 gap-2 text-sm" aria-label="Sale progress">
      {([1, 2, 3, 4, 5] as SaleStep[]).map((s) => {
        const done = s < step
        const current = s === step
        const label = done ? doneLabels[s] || STEP_LABELS[s] : STEP_LABELS[s]
        const clickable = done && canGoTo(s)
        const content = (
          <>
            {done ? <IconCheck className="size-4 shrink-0" /> : <span className="shrink-0">{s}</span>}
            <span className="truncate">{label}</span>
          </>
        )
        return (
          <li
            key={s}
            aria-current={current ? 'step' : undefined}
            className={cn(
              'min-w-0 border-t-[3px] pt-2',
              finished ? 'border-green-600 text-green-700 dark:text-green-500' : done || current ? 'border-primary text-primary' : 'border-border text-muted-foreground',
              current && 'font-semibold'
            )}
          >
            {clickable ? (
              <button type="button" onClick={() => onGoTo(s)} className="flex w-full min-w-0 items-center gap-1.5 text-left hover:underline">
                {content}
              </button>
            ) : (
              <span className="flex min-w-0 items-center gap-1.5">{content}</span>
            )}
          </li>
        )
      })}
    </ol>
  )
}
