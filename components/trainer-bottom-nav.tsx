'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  IconBarbell,
  IconCalendarEvent,
  IconMenu2,
  IconTemplate,
  IconUsers,
} from '@tabler/icons-react'
import { useSidebar } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

const TABS = [
  { title: 'Today', href: '/admin/personal-training/today', icon: IconCalendarEvent },
  { title: 'Members', href: '/dashboard/workouts/members', icon: IconUsers },
  { title: 'Plans', href: '/dashboard/workouts/plans', icon: IconBarbell },
  { title: 'Templates', href: '/dashboard/workouts/templates', icon: IconTemplate },
]

/**
 * Full-screen editors bring their own back button and action bar, so the tab
 * bar would only cover them: the plan builder (create / edit) and live sessions.
 */
const HIDDEN_ON = [
  /^\/dashboard\/workouts\/create/,
  /^\/dashboard\/workouts\/[0-9a-f]{24}$/i,
  /\/live$/,
  /^\/dashboard\/workouts\/session\//,
]

export function useTrainerBottomNavVisible() {
  const pathname = usePathname() ?? ''
  return !HIDDEN_ON.some((re) => re.test(pathname))
}

/**
 * Phone tab bar for trainers (hidden from md up, where the sidebar is
 * visible). "More" opens the full sidebar sheet.
 */
export function TrainerBottomNav() {
  const pathname = usePathname() ?? ''
  const { setOpenMobile } = useSidebar()

  return (
    <nav
      aria-label="Trainer navigation"
      className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-5 h-16">
        {TABS.map(({ title, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium',
                active ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Icon className="h-5 w-5" stroke={active ? 2.2 : 1.8} />
              {title}
            </Link>
          )
        })}
        <button
          type="button"
          onClick={() => setOpenMobile(true)}
          className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted-foreground"
        >
          <IconMenu2 className="h-5 w-5" stroke={1.8} />
          More
        </button>
      </div>
    </nav>
  )
}
