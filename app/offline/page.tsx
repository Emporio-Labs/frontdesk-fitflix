import Image from 'next/image'

// Auth-gated static shell served by the service worker when a navigation
// request fails offline. Kept intentionally self-contained: no client hooks,
// no API calls, no dynamic route data — the page must render before the
// network is back.
export const dynamic = 'force-static'

export const metadata = {
  title: 'Fitflix — Offline',
  description: 'Fitflix is offline. Reconnect to continue.',
}

export default function OfflinePage() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-background px-6 py-10 text-center">
      <Image
        src="/fitflix_logo.png"
        alt="Fitflix"
        width={72}
        height={72}
        className="opacity-80"
        priority
      />
      <div className="space-y-2 max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight">You are offline</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Fitflix needs an internet connection to load this page. Once you are back on
          Wi-Fi or mobile data, tap Try again.
        </p>
      </div>
      {/* Plain anchor + inline styles so no bundled JS is required. Any
          navigation retries the network first. */}
      <a
        href="/dashboard"
        className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow"
      >
        Try again
      </a>
      <p className="text-xs text-muted-foreground">
        Your session and unsaved work are safe on this device.
      </p>
    </div>
  )
}
