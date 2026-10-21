'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { getRoleStartPage } from '@/app/context/auth-context'

export default function Home() {
  const router = useRouter()
  const { isAuthenticated, user } = useAuth()

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login')
      return
    }
    // Land each role directly on their workspace start page.
    router.replace(getRoleStartPage(user?.role))
  }, [isAuthenticated, user?.role, router])

  return null
}
