'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

import { useSidebar } from '@/components/ui/sidebar'

export function SidebarRouteSync() {
  const pathname = usePathname()
  const { setOpen, setOpenMobile } = useSidebar()

  useEffect(() => {
    setOpen(false)
    setOpenMobile(false)
  }, [pathname, setOpen, setOpenMobile])

  return null
}