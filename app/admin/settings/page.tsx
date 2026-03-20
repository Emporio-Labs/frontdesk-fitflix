'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { IconSettings, IconBell, IconLock, IconPalette } from '@tabler/icons-react'

export default function SettingsPage() {
  const [clinicName, setClinicName] = useState('Healing Heights Clinic')
  const [email, setEmail] = useState('admin@clinic.com')
  const [phone, setPhone] = useState('+1 (555) 123-4567')
  const [address, setAddress] = useState('123 Main St, City, State 12345')
  const [timezone, setTimezone] = useState('UTC-8')

  const [emailNotifications, setEmailNotifications] = useState(true)
  const [bookingNotifications, setBookingNotifications] = useState(true)
  const [reportNotifications, setReportNotifications] = useState(false)

  const [darkMode, setDarkMode] = useState(false)
  const [language, setLanguage] = useState('english')

  const handleSaveClinicInfo = () => {
    alert('Clinic information saved successfully!')
  }

  const handleSaveNotifications = () => {
    alert('Notification preferences saved!')
  }

  const handleSavePreferences = () => {
    alert('Preferences saved!')
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">Manage your clinic and account settings</p>
      </div>

      {/* Clinic Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <IconSettings className="w-5 h-5" />
            <div>
              <CardTitle>Clinic Information</CardTitle>
              <CardDescription>Update your clinic details</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Clinic Name</label>
            <Input
              value={clinicName}
              onChange={(e) => setClinicName(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Phone</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Address</label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Timezone</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="UTC-8">Pacific Time (UTC-8)</option>
              <option value="UTC-6">Central Time (UTC-6)</option>
              <option value="UTC-5">Eastern Time (UTC-5)</option>
              <option value="UTC+0">UTC</option>
            </select>
          </div>
          <Button onClick={handleSaveClinicInfo}>Save Changes</Button>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <IconBell className="w-5 h-5" />
            <div>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Manage notification preferences</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Email Notifications</p>
              <p className="text-sm text-gray-500">Receive email updates about system events</p>
            </div>
            <input
              type="checkbox"
              checked={emailNotifications}
              onChange={(e) => setEmailNotifications(e.target.checked)}
              className="w-5 h-5 cursor-pointer"
            />
          </div>
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Booking Notifications</p>
                <p className="text-sm text-gray-500">Get notified when new bookings are made</p>
              </div>
              <input
                type="checkbox"
                checked={bookingNotifications}
                onChange={(e) => setBookingNotifications(e.target.checked)}
                className="w-5 h-5 cursor-pointer"
              />
            </div>
          </div>
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Report Notifications</p>
                <p className="text-sm text-gray-500">Receive notifications for completed reports</p>
              </div>
              <input
                type="checkbox"
                checked={reportNotifications}
                onChange={(e) => setReportNotifications(e.target.checked)}
                className="w-5 h-5 cursor-pointer"
              />
            </div>
          </div>
          <Button onClick={handleSaveNotifications} className="mt-4">
            Save Notification Settings
          </Button>
        </CardContent>
      </Card>

      {/* Display Preferences */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <IconPalette className="w-5 h-5" />
            <div>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>Customize your app experience</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Dark Mode</p>
              <p className="text-sm text-gray-500">Use dark theme for the interface</p>
            </div>
            <input
              type="checkbox"
              checked={darkMode}
              onChange={(e) => setDarkMode(e.target.checked)}
              className="w-5 h-5 cursor-pointer"
            />
          </div>
          <div className="border-t pt-4">
            <label className="text-sm font-medium">Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="english">English</option>
              <option value="spanish">Spanish</option>
              <option value="french">French</option>
              <option value="german">German</option>
            </select>
          </div>
          <Button onClick={handleSavePreferences} className="mt-4">
            Save Preferences
          </Button>
        </CardContent>
      </Card>

      {/* Account Security */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <IconLock className="w-5 h-5" />
            <div>
              <CardTitle>Account Security</CardTitle>
              <CardDescription>Manage your account security</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" className="w-full">
            Change Password
          </Button>
          <Button variant="outline" className="w-full">
            Enable Two-Factor Authentication
          </Button>
          <Button variant="outline" className="w-full text-red-600 hover:text-red-700">
            Sign Out of All Devices
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
