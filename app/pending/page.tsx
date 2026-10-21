'use client'

// FX-31.4 — a signed-in staff account that has not been given a role yet lands
// here and sees nothing else (no sidebar: this route is outside the /admin and
// /dashboard layout groups, and middleware confines `unassigned` to this page).

import { IconHourglassHigh, IconLogout } from '@tabler/icons-react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function PendingPage() {
  const { logout } = useAuth()

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <IconHourglassHigh className="h-7 w-7 text-primary" />
          </div>
          <div className="space-y-1.5">
            <CardTitle className="text-xl">Waiting for an admin to assign your role</CardTitle>
            <CardDescription>
              Your account is set up, but it hasn&apos;t been given access to a workspace yet.
              An administrator needs to assign your role before you can continue. Please check
              back shortly, or contact your branch admin.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={logout} className="w-full">
            <IconLogout className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
