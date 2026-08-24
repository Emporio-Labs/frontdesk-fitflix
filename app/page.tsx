'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'

export default function Home() {
  const router = useRouter()
  const { isAuthenticated, user } = useAuth()

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login')
      return
    }
    // Land each role directly. Without this, trainers hit /dashboard and are
    // bounced again by middleware — a visible double redirect on PWA cold start.
    router.replace(user?.role === 'trainer' ? '/dashboard/workouts/members' : '/dashboard')
  }, [isAuthenticated, user?.role, router])

  return null
}
