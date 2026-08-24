import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/app/context/auth-context'
import { ReactQueryProvider } from '@/app/context/react-query-provider'
import { Toaster } from 'sonner'
import { AuthDiagnostics } from '@/lib/auth-diagnostics'
import { VideoConferenceProvider } from '@/components/video-conference/video-conference-provider'
import { PWARegister } from '@/components/pwa-register'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Fitflix — Admin Panel',
  description: 'Fitflix Operations Dashboard — Internal Admin Control Panel',
  generator: 'fitflix',
  applicationName: 'Fitflix',
  appleWebApp: {
    capable: true,
    title: 'Fitflix',
    statusBarStyle: 'black-translucent',
  },
  other: {
    // Next 15 emits only the modern `mobile-web-app-capable`; iOS below 15.4
    // still needs the legacy name to launch standalone from the home screen.
    'apple-mobile-web-app-capable': 'yes',
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Lets the app paint under the notch/home indicator when installed.
  viewportFit: 'cover',
  themeColor: '#0f172a',
  // Deliberately no maximumScale/userScalable — pinch-zoom must stay available.
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <PWARegister />
        <ReactQueryProvider>
          <AuthProvider>
            <AuthDiagnostics />
            {/* Above the router so a hosted class survives navigation. */}
            <VideoConferenceProvider>{children}</VideoConferenceProvider>
            <Toaster richColors position="top-right" />
          </AuthProvider>
        </ReactQueryProvider>
        <Analytics />
      </body>
    </html>
  )
}

