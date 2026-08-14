'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { IconQrcode, IconUserCheck } from '@tabler/icons-react'
import { useQrCheckIn } from '@/hooks/use-gym-visits'

const SCANNER_ELEMENT_ID = 'gym-qr-scanner'
// Debounce so the same frame decoded multiple times in a row doesn't fire
// duplicate check-in requests while the camera is still pointed at it.
const RESCAN_DELAY_MS = 2000

export function QrScannerDialog() {
  const [open, setOpen] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<{ name: string } | null>(null)
  const scannerRef = useRef<import('html5-qrcode').Html5Qrcode | null>(null)
  const pausedRef = useRef(false)
  const qrCheckIn = useQrCheckIn()

  useEffect(() => {
    if (!open) return

    let cancelled = false

    import('html5-qrcode').then(({ Html5Qrcode }) => {
      if (cancelled) return
      const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID)
      scannerRef.current = scanner

      scanner
        .start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            if (pausedRef.current) return
            pausedRef.current = true
            setLastResult(null)
<<<<<<< Updated upstream
            qrCheckIn.mutate(decodedText, {
              onSuccess: (data) => {
=======

            const token = extractQrToken(decodedText)
            if (!token) {
              toast.error('Invalid QR code content')
              setTimeout(() => {
                pausedRef.current = false
              }, RESCAN_DELAY_MS)
              return
            }

            qrCheckIn.mutate(token, {
              onSuccess: (data: any) => {
>>>>>>> Stashed changes
                setLastResult({ name: data.visit.username || 'Member' })
              },
              onSettled: () => {
                setTimeout(() => {
                  pausedRef.current = false
                }, RESCAN_DELAY_MS)
              },
            })
          },
          () => {
            // Per-frame "no QR found" callback — expected on most frames, ignore.
          },
        )
        .catch((err: unknown) => {
          setCameraError(
            err instanceof Error
              ? err.message
              : 'Could not access the camera. Check permissions and try again.',
          )
        })
    })

    return () => {
      cancelled = true
      const scanner = scannerRef.current
      if (scanner) {
        scanner
          .stop()
          .then(() => scanner.clear())
          .catch(() => {})
      }
      scannerRef.current = null
      pausedRef.current = false
      setCameraError(null)
      setLastResult(null)
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <IconQrcode className="w-4 h-4 mr-1" /> Scan QR
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconQrcode className="w-4 h-4" /> Scan member QR
          </DialogTitle>
          <DialogDescription>
            Point the camera at the member&apos;s app to check them in.
          </DialogDescription>
        </DialogHeader>

        <div id={SCANNER_ELEMENT_ID} className="w-full overflow-hidden rounded-md" />

        {cameraError && (
          <p className="text-sm text-destructive">{cameraError}</p>
        )}

        {lastResult && (
          <div className="flex items-center gap-2 rounded-md border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">
            <IconUserCheck className="w-4 h-4" /> Checked in {lastResult.name}
          </div>
        )}

        {qrCheckIn.isPending && (
          <p className="text-sm text-muted-foreground">Checking in…</p>
        )}
      </DialogContent>
    </Dialog>
  )
}
