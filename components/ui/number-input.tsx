'use client'

import * as React from 'react'

import { Input } from '@/components/ui/input'

type NumberInputProps = Omit<React.ComponentProps<'input'>, 'type' | 'value' | 'onChange' | 'min' | 'max'> & {
  value: number
  onValueChange: (value: number) => void
  min?: number
  max?: number
  /** Whole numbers only (default true). */
  integer?: boolean
  /** Committed when the field is left empty. Defaults to `min`, else 0. */
  emptyValue?: number
}

function parse(raw: string, integer: boolean): number | null {
  if (raw.trim() === '') return null
  const n = Number(raw)
  if (!Number.isFinite(n)) return null
  return integer ? Math.trunc(n) : n
}

function toDraft(value: number) {
  return Number.isFinite(value) ? String(value) : ''
}

/**
 * Numeric input that can be cleared while typing. Keeps its own text draft so
 * deleting the last digit leaves the field empty instead of snapping back to a
 * fallback; the fallback / min / max clamp is applied only on blur.
 *
 * Never write `onChange={(e) => setX(Number(e.target.value) || 1)}` on a
 * controlled number input — use this instead.
 */
const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ value, onValueChange, min, max, integer = true, emptyValue, step, onBlur, ...props }, ref) => {
    const [draft, setDraft] = React.useState(() => toDraft(value))

    // Follow external changes (form reset, programmatic updates) without
    // clobbering an in-progress edit that already represents the same number.
    React.useEffect(() => {
      setDraft((current) => (parse(current, integer) === value ? current : toDraft(value)))
    }, [value, integer])

    const clamp = (n: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n))

    return (
      <Input
        {...props}
        ref={ref}
        type="number"
        inputMode={integer ? 'numeric' : 'decimal'}
        step={step ?? (integer ? 1 : 'any')}
        min={min}
        max={max}
        value={draft}
        onChange={(e) => {
          const raw = e.target.value
          setDraft(raw)
          const n = parse(raw, integer)
          if (n !== null && n === clamp(n) && n !== value) onValueChange(n)
        }}
        onBlur={(e) => {
          const n = parse(draft, integer)
          const next = n === null ? (emptyValue ?? min ?? 0) : clamp(n)
          setDraft(String(next))
          if (next !== value) onValueChange(next)
          onBlur?.(e)
        }}
      />
    )
  },
)
NumberInput.displayName = 'NumberInput'

export { NumberInput }
