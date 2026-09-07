'use client'

import { ExpertAvailabilityPanel } from '@/components/expert-availability-panel'

/**
 * Nutritionist availability.
 *
 * This route used to redirect straight to /admin/nutrition. Consultations are
 * booked against `ExpertSchedule` now rather than shared slot inventory, so a
 * nutritionist needs somewhere to say which hours they work, when they are on
 * leave, and whether they take in-person appointments at all. That page is
 * here; the nutrition workspace itself is still at /admin/nutrition.
 */
export default function NutritionistAvailabilityPage() {
  return (
    <div className="flex-1 space-y-6 p-4 pt-4 sm:p-6 sm:pt-5 lg:p-8 lg:pt-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Nutritionist Availability</h1>
        <p className="text-sm text-muted-foreground">
          Working hours, blocked dates and the appointment modes offered. Members
          can only book times that appear here.
        </p>
      </div>

      <ExpertAvailabilityPanel expertType="nutritionist" />
    </div>
  )
}
