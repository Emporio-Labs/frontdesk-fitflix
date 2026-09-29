'use client'

import { IconUsers } from '@tabler/icons-react'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/empty-state'

// Placeholder: FX-06 committed this route empty, which broke the build. Middleware,
// the sidebar and the login redirect all land nutritionists here, so it must exist.
// Replace with the real scoped client list (hooks/use-nutritionist-clients.ts).
export default function NutritionistMyClientsPage() {
  return (
    <div className="flex flex-col gap-4 p-4 sm:gap-6 sm:p-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">My Clients</h1>
        <p className="text-sm text-muted-foreground">
          Members assigned to you for nutrition coaching.
        </p>
      </div>
      <Card>
        <CardContent>
          <EmptyState
            icon={<IconUsers className="h-10 w-10" />}
            title="Coming soon"
            description="Your client list is being set up. Please check back shortly."
          />
        </CardContent>
      </Card>
    </div>
  )
}
