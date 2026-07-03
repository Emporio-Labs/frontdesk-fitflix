import { useEffect } from 'react'

// Opens a page's create dialog when visited with ?new=1 — used by the
// dashboard Quick Actions so "Add X" starts the task instead of just
// navigating to the list. Reads window.location directly to avoid the
// Suspense boundary that useSearchParams requires.
export function useOpenNewParam(setOpen: (open: boolean) => void) {
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('new') === '1') {
      setOpen(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
