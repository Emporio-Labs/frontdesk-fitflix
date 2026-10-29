'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getDigitalPass, type DigitalPassResponse } from '@/lib/services/event.service'
import { FitflixEventPass } from '@/components/events/fitflix-event-pass'
import { Button } from '@/components/ui/button'
import { IconAlertCircle, IconArrowLeft } from '@tabler/icons-react'

export default function DigitalPassStandalonePage() {
  const params = useParams()
  const ticketId = String(params?.ticketId || '')

  const [passData, setPassData] = useState<DigitalPassResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!ticketId) return
    setLoading(true)
    getDigitalPass(ticketId)
      .then((data) => {
        setPassData(data)
        setError(null)
      })
      .catch((err) => {
        console.error('Failed to load digital pass:', err)
        setError(err.response?.data?.error || 'Digital pass not found')
      })
      .finally(() => setLoading(false))
  }, [ticketId])

  // Request WakeLock so attendee screen stays bright while standing in entrance queue
  useEffect(() => {
    let wakeLockSentinel: any = null
    if ('wakeLock' in navigator) {
      ;(navigator as any).wakeLock
        .request('screen')
        .then((lock: any) => {
          wakeLockSentinel = lock
        })
        .catch(() => {
          // Wake lock rejected or unsupported
        })
    }
    return () => {
      if (wakeLockSentinel) wakeLockSentinel.release()
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <div className="h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-zinc-400 text-sm font-mono">Fetching Digital Pass [{ticketId}]...</p>
      </div>
    )
  }

  if (error || !passData) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 text-center">
        <IconAlertCircle className="h-14 w-14 text-rose-500 mb-3" />
        <h1 className="text-2xl font-bold">Invalid Digital Pass</h1>
        <p className="text-zinc-400 text-sm max-w-sm mt-1 mb-6">
          {error || 'We could not find a confirmed ticket with this ID.'}
        </p>
        <Link href="/admin/events">
          <Button variant="outline" className="border-zinc-800 text-xs gap-1.5">
            <IconArrowLeft className="h-4 w-4" />
            Back to Events
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white py-10 px-4 selection:bg-emerald-500 selection:text-black">
      {/* Top Header */}
      <header className="max-w-md mx-auto mb-6 flex items-center justify-between text-xs text-zinc-400">
        <Link href={`/events/${passData.event.slug}`} className="hover:text-emerald-400 transition-colors flex items-center gap-1">
          <IconArrowLeft className="h-3.5 w-3.5" />
          <span>{passData.event.title}</span>
        </Link>
        <span className="font-mono text-[10px] bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
          ID: {passData.pass.ticketId}
        </span>
      </header>

      {/* Official Fitflix Event Pass Component */}
      <FitflixEventPass passData={passData} showActions={true} />
    </div>
  )
}
