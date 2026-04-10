'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { IconArrowLeft, IconEdit, IconMail, IconPhone } from '@tabler/icons-react'
import { useUser } from '@/hooks/use-users'

export default function UserDetailPage() {
  const params = useParams<{ id?: string | string[] }>()
  const idParam = params?.id
  const userId = Array.isArray(idParam) ? idParam[0] : idParam || ''

  const { data: user, isLoading, isError } = useUser(userId)

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/users">
          <Button variant="ghost" size="sm">
            <IconArrowLeft className="w-4 h-4 mr-2" />
            Back to Users
          </Button>
        </Link>
      </div>

      {isLoading && (
        <Card>
          <CardHeader>
            <CardTitle>Loading user...</CardTitle>
          </CardHeader>
        </Card>
      )}

      {isError && (
        <Card>
          <CardHeader>
            <CardTitle>Failed to load user</CardTitle>
            <CardDescription>Please verify API connectivity.</CardDescription>
          </CardHeader>
        </Card>
      )}

      {!isLoading && !user && !isError && (
        <Card>
          <CardHeader>
            <CardTitle>User not found</CardTitle>
          </CardHeader>
        </Card>
      )}

      {user && (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="text-2xl">{user.username}</CardTitle>
                <CardDescription>{user.email}</CardDescription>
              </div>
              <Button>
                <IconEdit className="w-4 h-4 mr-2" />
                Edit User
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <IconMail className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <IconPhone className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium">{user.phone || 'N/A'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Gender</p>
                  <p className="font-medium">{user.gender || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Age</p>
                  <p className="font-medium">{user.age || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Created</p>
                  <p className="font-medium">{user.createdAt}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Updated</p>
                  <p className="font-medium">{user.updatedAt}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Health Goals</CardTitle>
              <CardDescription>User-submitted goals</CardDescription>
            </CardHeader>
            <CardContent>
              {user.healthGoals && user.healthGoals.length ? (
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  {user.healthGoals.map((goal) => (
                    <li key={goal}>{goal}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No goals provided yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Memberships</CardTitle>
              <CardDescription>Connect to memberships API to display data.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">No membership data available.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bookings</CardTitle>
              <CardDescription>Connect to bookings API to display data.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">No booking data available.</p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
