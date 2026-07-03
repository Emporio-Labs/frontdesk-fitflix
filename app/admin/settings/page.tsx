'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { IconUser, IconLock, IconLogout, IconInfoCircle } from '@tabler/icons-react'
import { useAuth } from '@/hooks/use-auth'

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  clinic_admin: 'Clinic Admin',
  staff: 'Staff',
  clinician: 'Clinician',
  sales: 'Sales',
}

export default function SettingsPage() {
  const { user, role, logout } = useAuth()

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">Your account and session</p>
      </div>

      {/* Account */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <IconUser className="w-5 h-5" />
            <div>
              <CardTitle>Account</CardTitle>
              <CardDescription>The account you are signed in with</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-[120px_1fr] gap-y-2 text-sm">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium">{user?.name || '—'}</span>
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{user?.email || '—'}</span>
            <span className="text-muted-foreground">Role</span>
            <span>
              <Badge variant="secondary">{ROLE_LABELS[role] ?? role}</Badge>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Session */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <IconLock className="w-5 h-5" />
            <div>
              <CardTitle>Session</CardTitle>
              <CardDescription>Sign out of this device</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={logout} className="text-red-600 hover:text-red-700">
            <IconLogout className="w-4 h-4 mr-2" />
            Sign out
          </Button>
        </CardContent>
      </Card>

      {/* Managed settings notice */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <IconInfoCircle className="w-5 h-5" />
            <div>
              <CardTitle>Clinic &amp; security settings</CardTitle>
              <CardDescription>Managed outside this panel</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Clinic profile, notification preferences, password changes, and two-factor
            authentication are managed by your system administrator. Contact them to update
            these settings — self-service options will appear here once the backend supports
            them.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
