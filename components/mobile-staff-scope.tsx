'use client'

import { useAuth } from '@/hooks/use-auth'
import { TrainerBottomNav, useTrainerBottomNavVisible } from '@/components/trainer-bottom-nav'

/**
 * FX-09 — role-scoped mobile treatment.
 *
 * Trainers and nutritionists work from a phone. The layouts render this inside
 * the flex wrapper so its children get the `data-mobile-cards="tables"` hook
 * defined in `app/globals.css` when (and only when) one of those roles is
 * signed in. Admin roles never get the attribute, so a clinic admin looking
 * at admin pages on a phone still sees the wide-table layout with a
 * horizontal scroll (FX-09.5 is about desktop, but keeping admin phone
 * behaviour unchanged too avoids surprising anyone).
 *
 * Trainers also get a bottom tab bar on phones. `--bottom-nav-h` is set while
 * it shows, so sticky bottom bars can sit above it
 * (`bottom-[var(--bottom-nav-h,0px)]`).
 */
export function MobileStaffScope({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const isStaffPhoneUser = user?.role === 'trainer' || user?.role === 'nutritionist'
  const navVisible = useTrainerBottomNavVisible()
  const showTrainerNav = user?.role === 'trainer' && navVisible

  return (
    <div
      data-mobile-cards={isStaffPhoneUser ? 'tables' : undefined}
      className={showTrainerNav ? 'contents [--bottom-nav-h:4rem] md:[--bottom-nav-h:0px]' : 'contents'}
    >
      {children}
      {showTrainerNav && (
        <>
          {/* Keeps the end of the page clear of the fixed tab bar. */}
          <div aria-hidden className="md:hidden h-16 shrink-0" />
          <TrainerBottomNav />
        </>
      )}
    </div>
  )
}
