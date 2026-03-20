'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/status-badge'
import { mockUsers, mockMemberships, mockBookings } from '@/lib/mock-data'
import { IconArrowLeft, IconEdit, IconMail, IconPhone } from '@tabler/icons-react'
import Link from 'next/link'

export default function UserDetailPage({ params }: { params: { id: string } }) {
  const user = mockUsers.find(u => u.id === params.id) || mockUsers[0]
  const userMemberships = mockMemberships.filter(m => m.userId === user.id)
  const userBookings = mockBookings.filter(b => b.memberId === user.id)

  const [activeTab, setActiveTab] = useState<'profile' | 'memberships' | 'bookings'>('profile')

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

      {/* Header Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-2xl">{user.name}</CardTitle>
            <CardDescription>{user.role}</CardDescription>
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
              <p className="text-sm text-gray-500">Status</p>
              <StatusBadge status={user.status} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Join Date</p>
              <p className="font-medium">{user.joinDate}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {['profile', 'memberships', 'bookings'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'profile' && (
          <Card>
            <CardHeader>
              <CardTitle>User Profile</CardTitle>
              <CardDescription>Personal and account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Full Name</label>
                  <p className="mt-1">{user.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1">{user.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Phone</label>
                  <p className="mt-1">{user.phone || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Role</label>
                  <p className="mt-1">{user.role}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'memberships' && (
          <Card>
            <CardHeader>
              <CardTitle>Memberships</CardTitle>
              <CardDescription>{userMemberships.length} active memberships</CardDescription>
            </CardHeader>
            <CardContent>
              {userMemberships.length > 0 ? (
                <div className="space-y-4">
                  {userMemberships.map((membership) => (
                    <div
                      key={membership.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{membership.type}</p>
                        <p className="text-sm text-gray-500">
                          {membership.startDate} to {membership.endDate}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="font-medium">${membership.price}</p>
                        <StatusBadge status={membership.status} size="sm" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No memberships found</p>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'bookings' && (
          <Card>
            <CardHeader>
              <CardTitle>Bookings</CardTitle>
              <CardDescription>{userBookings.length} total bookings</CardDescription>
            </CardHeader>
            <CardContent>
              {userBookings.length > 0 ? (
                <div className="space-y-4">
                  {userBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{booking.id}</p>
                        <p className="text-sm text-gray-500">
                          {booking.date} at {booking.time}
                        </p>
                      </div>
                      <StatusBadge status={booking.status} size="sm" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No bookings found</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
