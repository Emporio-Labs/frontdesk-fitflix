'use client'

import React, { useEffect, useRef, useState } from 'react'
import {
  IconBuildingStore,
  IconCamera,
  IconCertificate,
  IconCheck,
  IconEye,
  IconEyeOff,
  IconLink,
  IconLoader2,
  IconLock,
  IconMail,
  IconPhone,
  IconQuote,
  IconRefresh,
  IconSparkles,
  IconTag,
  IconTrash,
  IconUpload,
  IconUser,
  IconX,
} from '@tabler/icons-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useTrainerProfile, useUpdateTrainerProfile } from '@/hooks/use-trainers'
import { trainerService } from '@/lib/services/trainer.service'
import { optimizeImageForUpload } from '@/lib/utils/image-compression'
import { toast } from 'sonner'

const POPULAR_SPECIALITIES = [
  'HIIT',
  'Strength Training',
  'Calisthenics',
  'Bodybuilding',
  'Functional Training',
  'Powerlifting',
  'Weight Loss',
  'Mobility & Flexibility',
  'Cardio Conditioning',
]

const POPULAR_CERTIFICATIONS = [
  'NASM-CPT',
  'ACE-CPT',
  'ISSA-CPT',
  'CSCS (NSCA)',
  'CrossFit L1',
  'Precision Nutrition',
  'CPR/AED Certified',
  'ACSM-CPT',
]

export default function TrainerProfilePage() {
  const { data: trainer, isLoading, refetch, isRefetching } = useTrainerProfile()
  const updateMutation = useUpdateTrainerProfile()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    trainerName: '',
    phone: '',
    email: '',
    description: '',
    specialitiesInput: '',
    certificationsInput: '',
    imageUrl: '',
    keySentence: '',
    password: '',
    confirmPassword: '',
  })

  const [showPassword, setShowPassword] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [showUrlDialog, setShowUrlDialog] = useState(false)
  const [tempUrlInput, setTempUrlInput] = useState('')

  // Populate form state when trainer data loads
  useEffect(() => {
    if (trainer) {
      setForm({
        trainerName: trainer.trainerName || '',
        phone: trainer.phone || '',
        email: trainer.email || '',
        description: trainer.description || '',
        specialitiesInput: Array.isArray(trainer.specialities) ? trainer.specialities.join(', ') : '',
        certificationsInput: Array.isArray(trainer.certifications) ? trainer.certifications.join(', ') : '',
        imageUrl: trainer.imageUrl || '',
        keySentence: trainer.keySentence || '',
        password: '',
        confirmPassword: '',
      })
      setIsDirty(false)
    }
  }, [trainer])

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setIsDirty(true)
  }

  const handlePhotoUpload = async (file: File | undefined) => {
    if (!file) return

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type.toLowerCase())) {
      toast.error('Only JPG, PNG or WebP images are allowed')
      return
    }

    if (file.size > 30 * 1024 * 1024) {
      toast.error('Image must be 30 MB or smaller')
      return
    }

    setIsUploading(true)
    try {
      const optimized = await optimizeImageForUpload(file)
      const res = await trainerService.uploadImage(optimized)
      setForm((prev) => ({ ...prev, imageUrl: res.imageUrl }))
      await updateMutation.mutateAsync({ imageUrl: res.imageUrl })
      toast.success('Profile photo updated successfully')
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || 'Failed to upload photo')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleApplyUrl = async () => {
    const url = tempUrlInput.trim()
    if (!url) return
    setForm((prev) => ({ ...prev, imageUrl: url }))
    try {
      await updateMutation.mutateAsync({ imageUrl: url })
      toast.success('Profile photo updated successfully')
    } catch {
      toast.error('Failed to update photo URL')
    }
    setShowUrlDialog(false)
    setTempUrlInput('')
  }

  const handleRemovePhoto = async () => {
    setForm((prev) => ({ ...prev, imageUrl: '' }))
    try {
      await updateMutation.mutateAsync({ imageUrl: '' })
      toast.success('Photo removed')
    } catch {
      toast.error('Failed to remove photo')
    }
  }

  const handleAddSpeciality = (item: string) => {
    const current = form.specialitiesInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    if (!current.includes(item)) {
      const next = [...current, item].join(', ')
      handleChange('specialitiesInput', next)
    }
  }

  const handleRemoveSpeciality = (item: string) => {
    const current = form.specialitiesInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const next = current.filter((s) => s.toLowerCase() !== item.toLowerCase()).join(', ')
    handleChange('specialitiesInput', next)
  }

  const handleAddCertification = (item: string) => {
    const current = form.certificationsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    if (!current.includes(item)) {
      const next = [...current, item].join(', ')
      handleChange('certificationsInput', next)
    }
  }

  const handleRemoveCertification = (item: string) => {
    const current = form.certificationsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const next = current.filter((s) => s.toLowerCase() !== item.toLowerCase()).join(', ')
    handleChange('certificationsInput', next)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.trainerName.trim()) {
      toast.error('Name is required')
      return
    }

    if (!form.phone.trim()) {
      toast.error('Phone number is required')
      return
    }

    if (form.password) {
      if (form.password.length < 6) {
        toast.error('New password must be at least 6 characters')
        return
      }
      if (form.password !== form.confirmPassword) {
        toast.error('Passwords do not match')
        return
      }
    }

    const specialities = form.specialitiesInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    const certifications = form.certificationsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    const payload = {
      trainerName: form.trainerName.trim(),
      phone: form.phone.trim(),
      description: form.description.trim(),
      specialities,
      certifications,
      imageUrl: form.imageUrl,
      keySentence: form.keySentence.trim(),
      ...(form.password ? { password: form.password } : {}),
    }

    await updateMutation.mutateAsync(payload)
    setForm((prev) => ({ ...prev, password: '', confirmPassword: '' }))
    setIsDirty(false)
  }

  const handleReset = () => {
    if (trainer) {
      setForm({
        trainerName: trainer.trainerName || '',
        phone: trainer.phone || '',
        email: trainer.email || '',
        description: trainer.description || '',
        specialitiesInput: Array.isArray(trainer.specialities) ? trainer.specialities.join(', ') : '',
        certificationsInput: Array.isArray(trainer.certifications) ? trainer.certifications.join(', ') : '',
        imageUrl: trainer.imageUrl || '',
        keySentence: trainer.keySentence || '',
        password: '',
        confirmPassword: '',
      })
      setIsDirty(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto p-4 md:p-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-6">
              <Skeleton className="h-24 w-24 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  const specialitiesArray = form.specialitiesInput
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const certificationsArray = form.certificationsInput
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const branchName =
    typeof trainer?.locationId === 'object' && trainer?.locationId !== null
      ? (trainer.locationId as any).name || (trainer.locationId as any).code
      : 'Main Branch'

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 md:p-8 pb-16">
      {/* Hidden file input for photo upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handlePhotoUpload(e.target.files?.[0])}
        disabled={isUploading}
      />

      {/* Top Banner / Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trainer Profile</h1>
          <p className="text-sm text-muted-foreground">
            Manage your personal bio, profile image, specialities, certifications, and account security.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
          className="self-start sm:self-auto gap-1.5 text-xs"
        >
          <IconRefresh className={`size-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* ── Polished Hero Profile Card ── */}
      <Card className="overflow-hidden border border-border/80 shadow-xs rounded-xl bg-card">
        {/* Decorative subtle gradient banner strip */}
        <div className="h-24 w-full bg-gradient-to-r from-primary/15 via-primary/5 to-muted relative border-b border-border/40" />

        <CardContent className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 -mt-12">
            {/* Avatar + Main Identity Info */}
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5">
              {/* Circular Avatar with Camera Overlay */}
              <div className="relative group shrink-0">
                <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-full ring-4 ring-background shadow-md overflow-hidden bg-muted flex items-center justify-center relative">
                  <div className="h-full w-full flex items-center justify-center bg-muted text-muted-foreground text-2xl font-bold select-none">
                    {form.trainerName ? form.trainerName.slice(0, 2).toUpperCase() : 'TR'}
                  </div>
                  {form.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={form.imageUrl}
                      alt={form.trainerName || 'Trainer'}
                      className="h-full w-full object-cover absolute inset-0"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none'
                      }}
                    />
                  )}

                  {/* Hover overlay to change image */}
                  <div
                    onClick={() => !isUploading && fileInputRef.current?.click()}
                    className="absolute inset-0 rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 cursor-pointer transition-opacity backdrop-blur-[1px]"
                  >
                    <IconCamera className="size-5" />
                    <span className="text-[10px] font-medium">Change</span>
                  </div>
                </div>

                {/* Camera quick-action badge button */}
                <button
                  type="button"
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="absolute bottom-0 right-0 p-2 rounded-full bg-primary text-primary-foreground shadow-md hover:scale-105 active:scale-95 transition-transform"
                  title="Upload profile photo"
                >
                  {isUploading ? (
                    <IconLoader2 className="size-3.5 animate-spin" />
                  ) : (
                    <IconCamera className="size-3.5" />
                  )}
                </button>
              </div>

              {/* Identity & Metadata Details */}
              <div className="space-y-1.5 text-center sm:text-left pt-2 sm:pt-0">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-2xl font-bold tracking-tight text-foreground">
                    {form.trainerName || 'Coach'}
                  </h2>
                  <Badge variant="secondary" className="font-semibold text-xs gap-1 py-0.5">
                    <IconUser className="size-3" />
                    Trainer
                  </Badge>
                  {branchName && (
                    <Badge variant="outline" className="text-xs font-normal text-muted-foreground gap-1 py-0.5">
                      <IconBuildingStore className="size-3" />
                      {branchName}
                    </Badge>
                  )}
                  {trainer?.isActive !== false ? (
                    <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 text-xs py-0.5 gap-1.5">
                      <span className="size-1.5 rounded-full bg-emerald-500 inline-block" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-amber-600 border-amber-500/30 text-xs py-0.5">
                      Hidden
                    </Badge>
                  )}
                  {trainer?.canAccessLeads && (
                    <Badge variant="outline" className="text-blue-600 border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20 text-xs py-0.5">
                      Leads Access
                    </Badge>
                  )}
                </div>

                {/* Contact Line */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <IconMail className="size-4 text-muted-foreground/80 shrink-0" />
                    <span>{form.email}</span>
                  </span>
                  {form.phone && (
                    <>
                      <span className="text-muted-foreground/40 hidden sm:inline">•</span>
                      <span className="flex items-center gap-1.5">
                        <IconPhone className="size-4 text-muted-foreground/80 shrink-0" />
                        <span>{form.phone}</span>
                      </span>
                    </>
                  )}
                </div>

                {/* Tagline / Key sentence quote */}
                {form.keySentence && (
                  <p className="text-xs sm:text-sm text-muted-foreground italic flex items-center justify-center sm:justify-start gap-1.5 pt-0.5">
                    <IconQuote className="size-3.5 text-primary/60 shrink-0 rotate-180" />
                    <span>&ldquo;{form.keySentence}&rdquo;</span>
                  </p>
                )}
              </div>
            </div>

            {/* Photo Action Controls */}
            <div className="flex flex-wrap items-center justify-center md:justify-end gap-2 shrink-0 pt-2 md:pt-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="h-8 text-xs gap-1.5"
              >
                {isUploading ? (
                  <>
                    <IconLoader2 className="size-3.5 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <IconUpload className="size-3.5" />
                    {form.imageUrl ? 'Change Photo' : 'Upload Photo'}
                  </>
                )}
              </Button>

              {form.imageUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemovePhoto}
                  disabled={isUploading}
                  className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <IconTrash className="size-3.5 mr-1" />
                  Remove
                </Button>
              )}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTempUrlInput(form.imageUrl)
                  setShowUrlDialog(true)
                }}
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
                title="Paste external image link"
              >
                <IconLink className="size-3.5 mr-1" />
                Paste URL
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Form Sections ── */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Details & Contact */}
        <Card className="shadow-xs border border-border/80">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <IconUser className="size-4 text-primary" />
              Basic Details & Contact
            </CardTitle>
            <CardDescription>
              Your official display name and contact number for member sessions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Full Name *</label>
                <Input
                  value={form.trainerName}
                  onChange={(e) => handleChange('trainerName', e.target.value)}
                  placeholder="e.g. Coach John Doe"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Phone Number *</label>
                <Input
                  value={form.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+91 98765 43210"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Login Email</label>
                <Input
                  value={form.email}
                  disabled
                  className="bg-muted text-muted-foreground cursor-not-allowed"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Login email is managed by your FrontDesk administrator.
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Assigned Branch / Location</label>
                <Input
                  value={branchName}
                  disabled
                  className="bg-muted text-muted-foreground cursor-not-allowed"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Location assignment is managed by your FrontDesk administrator.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Public Bio & Specialities */}
        <Card className="shadow-xs border border-border/80">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <IconSparkles className="size-4 text-primary" />
              Public Bio & Specialities
            </CardTitle>
            <CardDescription>
              This information is showcased in the Fitflix mobile app and member directories.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <label className="text-sm font-medium mb-1 block">Key Sentence / Tagline</label>
              <Input
                value={form.keySentence}
                onChange={(e) => handleChange('keySentence', e.target.value)}
                placeholder="e.g. Dedicated to helping you reach your peak performance."
                maxLength={140}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                A short, impactful punchline displayed on your trainer card in the app (max 140 chars).
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Bio / Detailed Description</label>
              <Textarea
                value={form.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Share your coaching philosophy, background, or who you love training..."
                rows={4}
                className="resize-y"
              />
            </div>

            {/* Specialities Block */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <IconTag className="size-4 text-primary/80" />
                  Specialities
                </label>
                <span className="text-xs text-muted-foreground">Comma-separated</span>
              </div>
              <Input
                value={form.specialitiesInput}
                onChange={(e) => handleChange('specialitiesInput', e.target.value)}
                placeholder="HIIT, Strength Training, Calisthenics, Hypertrophy"
              />

              {specialitiesArray.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {specialitiesArray.map((spec) => (
                    <Badge
                      key={spec}
                      variant="secondary"
                      className="cursor-pointer gap-1 px-2.5 py-0.5 text-xs hover:bg-destructive/10 hover:text-destructive transition-colors"
                      onClick={() => handleRemoveSpeciality(spec)}
                      title="Click to remove"
                    >
                      {spec}
                      <span className="text-[10px] ml-0.5">✕</span>
                    </Badge>
                  ))}
                </div>
              )}

              <div className="pt-1">
                <p className="text-[11px] text-muted-foreground mb-1">Quick add suggestions:</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  {POPULAR_SPECIALITIES.filter(
                    (s) => !specialitiesArray.map((x) => x.toLowerCase()).includes(s.toLowerCase())
                  ).map((spec) => (
                    <button
                      key={spec}
                      type="button"
                      onClick={() => handleAddSpeciality(spec)}
                      className="text-[11px] rounded-md border border-dashed px-2 py-0.5 text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
                    >
                      + {spec}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Certifications Block */}
            <div className="space-y-2 pt-2 border-t border-border/50">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <IconCertificate className="size-4 text-primary/80" />
                  Certifications <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
                </label>
                <span className="text-xs text-muted-foreground">Comma-separated</span>
              </div>
              <Input
                value={form.certificationsInput}
                onChange={(e) => handleChange('certificationsInput', e.target.value)}
                placeholder="e.g. NASM-CPT, ACE, CSCS, CrossFit L1"
              />

              {certificationsArray.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {certificationsArray.map((cert) => (
                    <Badge
                      key={cert}
                      variant="outline"
                      className="cursor-pointer gap-1 px-2.5 py-0.5 text-xs border-primary/30 text-primary hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
                      onClick={() => handleRemoveCertification(cert)}
                      title="Click to remove"
                    >
                      {cert}
                      <span className="text-[10px] ml-0.5">✕</span>
                    </Badge>
                  ))}
                </div>
              )}

              <div className="pt-1">
                <p className="text-[11px] text-muted-foreground mb-1">Quick add suggestions:</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  {POPULAR_CERTIFICATIONS.filter(
                    (s) => !certificationsArray.map((x) => x.toLowerCase()).includes(s.toLowerCase())
                  ).map((cert) => (
                    <button
                      key={cert}
                      type="button"
                      onClick={() => handleAddCertification(cert)}
                      className="text-[11px] rounded-md border border-dashed px-2 py-0.5 text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
                    >
                      + {cert}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security & Password */}
        <Card className="shadow-xs border border-border/80">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <IconLock className="size-4 text-primary" />
              Account Security & Password
            </CardTitle>
            <CardDescription>
              Update your account password. Leave blank if you do not wish to change it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">New Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    placeholder="Leave blank to keep current password"
                    className="pr-10"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <IconEyeOff className="size-4" /> : <IconEye className="size-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Minimum 6 characters if updating.
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Confirm New Password</label>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  placeholder="Re-enter new password"
                  autoComplete="new-password"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sticky Save Bar */}
        <div className="flex items-center justify-between rounded-lg border bg-card p-4 shadow-xs sticky bottom-4 z-10 backdrop-blur">
          <p className="text-xs text-muted-foreground">
            {isDirty ? (
              <span className="text-amber-600 font-medium">You have unsaved changes.</span>
            ) : (
              'All profile changes are up to date.'
            )}
          </p>

          <div className="flex items-center gap-2">
            {isDirty && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={updateMutation.isPending}
              >
                Discard
              </Button>
            )}

            <Button
              type="submit"
              size="sm"
              disabled={updateMutation.isPending || (!isDirty && !form.password)}
              className="gap-1.5"
            >
              {updateMutation.isPending ? (
                <>
                  <IconLoader2 className="size-4 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                <>
                  <IconCheck className="size-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </form>

      {/* ── Paste Image URL Modal Dialog ── */}
      <Dialog open={showUrlDialog} onOpenChange={setShowUrlDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Link External Photo URL</DialogTitle>
            <DialogDescription>
              Paste an external image link (e.g. Unsplash or CloudFront URL) to use as your profile photo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Image URL</label>
              <Input
                value={tempUrlInput}
                onChange={(e) => setTempUrlInput(e.target.value)}
                placeholder="https://images.unsplash.com/photo-..."
              />
            </div>

            {tempUrlInput && (
              <div className="flex items-center gap-3 p-2 rounded-lg border bg-muted/40">
                <div className="h-12 w-12 rounded-full overflow-hidden shrink-0 border bg-background">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={tempUrlInput}
                    alt="Preview"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      ;(e.target as HTMLElement).style.display = 'none'
                    }}
                  />
                </div>
                <div className="text-xs text-muted-foreground truncate flex-1">
                  Previewing external image
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowUrlDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleApplyUrl} disabled={!tempUrlInput.trim()}>
              Apply URL
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
