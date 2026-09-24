'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

const PULSE_MS = 3200

/**
 * Reads `?highlight=<id>` from the current URL and, if it matches `rowId`,
 * returns a `ref` callback that scrolls the row into view and a class name that
 * pulses a highlight ring for ~3 seconds. Consumed by list pages that are the
 * deep-link target for FX-25 pushes.
 */
export function useHighlightRow<T extends HTMLElement = HTMLElement>(rowId: string | undefined) {
  const params = useSearchParams()
  const highlightId = params?.get('highlight') || null
  const [pulsing, setPulsing] = useState(false)
  const done = useRef(false)

  const shouldHighlight = Boolean(rowId && highlightId && highlightId === rowId)

  const ref = useCallback(
    (node: T | null) => {
      if (!node || !shouldHighlight || done.current) return
      done.current = true
      // Wait a tick so React has flushed the row into the DOM.
      requestAnimationFrame(() => {
        node.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setPulsing(true)
        window.setTimeout(() => setPulsing(false), PULSE_MS)
      })
    },
    [shouldHighlight]
  )

  const className = pulsing
    ? cn('!bg-primary/10 ring-2 ring-primary transition-colors duration-300')
    : ''

  useEffect(() => {
    // Reset once the highlight param changes so a fresh push against the same
    // page can pulse again.
    done.current = false
    setPulsing(false)
  }, [highlightId])

  return { ref, className, shouldHighlight }
}
