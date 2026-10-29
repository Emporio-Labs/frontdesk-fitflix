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
      <DialogContent className="max-w-md bg-zinc-950 border-zinc-800 text-white">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <IconQrcode className="h-5 w-5" />
            </div>
            <DialogTitle className="text-lg font-bold">Event Flyer QR & Public Link</DialogTitle>
          </div>
          <DialogDescription className="text-zinc-400 text-sm">
            Share this link online or download the high-resolution QR code to print directly on offline event banners and flyers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-inner border border-zinc-200">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt={`QR code for ${event.title}`}
                className="w-56 h-56 object-contain"
              />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-zinc-400">
                Generating QR...
              </div>
            )}
            <div className="mt-2 text-center">
              <span className="text-xs font-semibold tracking-wider uppercase text-zinc-800">
                Scan to Register & Get Pass
              </span>
              <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                fitflix.in/events/{event.slug}
              </p>
            </div>
          </div>

          {/* Copyable Public Link Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Public Landing Page URL</label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={publicUrl}
                className="bg-zinc-900 border-zinc-800 text-xs font-mono text-zinc-300 focus-visible:ring-emerald-500"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="shrink-0 border-zinc-800 hover:bg-zinc-800 hover:text-white"
              >
                {copied ? (
                  <>
                    <IconCheck className="h-4 w-4 text-emerald-400 mr-1" />
                    Copied
                  </>
                ) : (
                  <>
                    <IconCopy className="h-4 w-4 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleDownloadQr}
              className="w-full border-zinc-800 hover:bg-zinc-800 hover:text-white text-xs gap-1.5"
            >
              <IconDownload className="h-4 w-4 text-emerald-400" />
              Download Flyer QR
            </Button>
            <Button
              asChild
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5"
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
