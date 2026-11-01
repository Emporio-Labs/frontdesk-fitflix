'use client'

import { useState, useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  IconQrcode,
  IconCopy,
  IconCheck,
  IconDownload,
  IconExternalLink,
  IconPrinter,
} from '@tabler/icons-react'
import { toast } from 'sonner'
import type { FitflixEvent } from '@/lib/services/event.service'

interface FlyerQrDialogProps {
  event: FitflixEvent | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FlyerQrDialog({ event, open, onOpenChange }: FlyerQrDialogProps) {
  const [copied, setCopied] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const publicUrl = typeof window !== 'undefined' && event?.slug
    ? `${window.location.origin}/events/${event.slug}`
    : `https://fitflix.in/events/${event?.slug || ''}`

  useEffect(() => {
    if (open && publicUrl) {
      QRCode.toDataURL(publicUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('QR generation error:', err))
    }
  }, [open, publicUrl])

  const handleCopy = () => {
    if (!publicUrl) return
    navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    toast.success('Public registration link copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownloadQr = () => {
    if (!qrDataUrl || !event) return
    const link = document.createElement('a')
    link.download = `Fitflix-Flyer-QR-${event.slug}.png`
    link.href = qrDataUrl
    link.click()
    toast.success('High-res QR Code downloaded for physical poster printing!')
  }

  if (!event) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card text-card-foreground border-border rounded-3xl shadow-xl">
        <DialogHeader>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400">
              <IconQrcode className="h-5 w-5" />
            </div>
            <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
              Event Flyer QR & Public Link
            </DialogTitle>
          </div>
          <DialogDescription className="text-muted-foreground text-xs leading-relaxed">
            Share this link online or download the high-resolution QR code to print directly on offline event banners and flyers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center p-5 bg-muted/40 rounded-2xl border border-border">
            <div className="p-3 bg-white rounded-xl shadow-xs border border-border/80">
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDataUrl}
                  alt={`QR code for ${event.title}`}
                  className="w-52 h-52 object-contain"
                />
              ) : (
                <div className="w-52 h-52 flex items-center justify-center text-muted-foreground text-xs">
                  Generating QR...
                </div>
              )}
            </div>
            <div className="mt-3 text-center">
              <span className="text-xs font-bold tracking-wider uppercase text-foreground">
                Scan to Register & Get Pass
              </span>
              <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                fitflix.in/events/{event.slug}
              </p>
            </div>
          </div>

          {/* Copyable Public Link Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Public Landing Page URL</label>
            <div className="flex gap-2 items-center">
              <Input
                readOnly
                value={publicUrl}
                className="bg-muted/50 border-border text-xs font-mono text-foreground focus-visible:ring-emerald-500 rounded-xl h-9"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="shrink-0 rounded-xl h-9 px-3 gap-1.5 border-border hover:bg-muted font-medium text-xs text-foreground shadow-xs"
              >
                {copied ? (
                  <>
                    <IconCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copied</span>
                  </>
                ) : (
                  <>
                    <IconCopy className="h-4 w-4 text-muted-foreground" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={handleDownloadQr}
              className="w-full rounded-xl border-border hover:bg-muted text-foreground text-xs font-medium gap-2 h-10 shadow-xs"
            >
              <IconDownload className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Download Flyer QR
            </Button>
            <Button
              asChild
              className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium gap-2 h-10 shadow-xs"
            >
              <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                <IconExternalLink className="h-4 w-4" />
                Open Public Page
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
