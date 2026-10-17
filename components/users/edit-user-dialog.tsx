'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { IconEdit } from '@tabler/icons-react'
import { User, UpdateUserPayload } from '@/lib/services/user.service'
import { useUpdateUser } from '@/hooks/use-users'

const GENDER_OPTIONS = ['Male', 'Female', 'Other']

interface EditUserDialogProps {
  user: User
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
}

export function EditUserDialog({
  user,
  open: controlledOpen,
  onOpenChange,
  trigger,
}: EditUserDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen

  const handleOpenChange = (nextOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(nextOpen)
    }
    onOpenChange?.(nextOpen)
  }

  const [form, setForm] = useState({
    username: user.username || '',
    phone: user.phone || '',
    age: user.age != null ? String(user.age) : '',
    gender: user.gender || 'Male',
    healthGoalsInput: Array.isArray(user.healthGoals) ? user.healthGoals.join(', ') : '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const updateUser = useUpdateUser()

  useEffect(() => {
    if (open) {
      setForm({
        username: user.username || '',
        phone: user.phone || '',
        age: user.age != null ? String(user.age) : '',
        gender: user.gender || 'Male',
        healthGoalsInput: Array.isArray(user.healthGoals) ? user.healthGoals.join(', ') : '',
      })
      setErrors({})
    }
  }, [open, user])

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!form.username.trim()) {
      errs.username = 'Username is required'
    }

    if (!form.phone.trim()) {
      errs.phone = 'Phone is required'
    } else {
      const cleanPhone = form.phone.replace(/[\s\-()]/g, '')
      const indianPhoneRegex = /^(?:\+91|91|0)?[6-9]\d{9}$/
      if (!indianPhoneRegex.test(cleanPhone)) {
        errs.phone = 'Please enter a valid Indian mobile number (e.g. +91 98765 43210 or 9876543210)'
      }
    }

    const ageNum = Number(form.age)
    if (!form.age || Number.isNaN(ageNum) || ageNum < 1 || ageNum > 130) {
      errs.age = 'Age must be between 1 and 130'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!validate()) return

    const cleanPhone = form.phone.replace(/[\s\-()]/g, '')
    const goals = form.healthGoalsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    const payload: UpdateUserPayload = {
      username: form.username.trim(),
      phone: cleanPhone,
      age: Number(form.age),
      gender: form.gender,
      healthGoals: goals,
    }

    try {
      const userId = user.id || user._id
      await updateUser.mutateAsync({
        id: userId,
        payload,
      })
      handleOpenChange(false)
    } catch (err: any) {
      const details = err?.response?.data?.details
      if (details && typeof details === 'object') {
        const serverErrors: Record<string, string> = {}
        for (const [field, msg] of Object.entries(details)) {
          serverErrors[field] = String(msg)
        }
        setErrors(serverErrors)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button>
            <IconEdit className="w-4 h-4 mr-2" />
            Edit User
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Member</DialogTitle>
          <DialogDescription>
            Update member profile details below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-username">Full Name *</Label>
              <Input
                id="edit-username"
                autoComplete="off"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="John Doe"
              />
              {errors.username && (
                <p className="text-xs text-destructive">{errors.username}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-age">Age *</Label>
              <Input
                id="edit-age"
                type="number"
                min="1"
                max="130"
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
                placeholder="28"
              />
              {errors.age && (
                <p className="text-xs text-destructive">{errors.age}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              type="email"
              disabled
              value={user.email || 'N/A'}
              className="bg-muted text-muted-foreground cursor-not-allowed"
            />
            <p className="text-[11px] text-muted-foreground">
              Email is used for sign-in and cannot be modified directly.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-phone">Phone Number *</Label>
            <Input
              id="edit-phone"
              autoComplete="off"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+91 98765 43210"
            />
            {errors.phone && (
              <p className="text-xs text-destructive">{errors.phone}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-gender">Gender</Label>
            <Select
              value={form.gender}
              onValueChange={(val) => setForm({ ...form, gender: val })}
            >
              <SelectTrigger id="edit-gender">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                {GENDER_OPTIONS.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.gender && (
              <p className="text-xs text-destructive">{errors.gender}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-health-goals">
              Health Goals <span className="text-xs text-muted-foreground font-normal">(comma-separated)</span>
            </Label>
            <Input
              id="edit-health-goals"
              value={form.healthGoalsInput}
              onChange={(e) => setForm({ ...form, healthGoalsInput: e.target.value })}
              placeholder="Build muscle, Improve stamina"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateUser.isPending}>
              {updateUser.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
