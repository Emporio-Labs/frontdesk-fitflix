'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  IconVideo,
  IconLoader2,
  IconPlus,
  IconTrash,
  IconDeviceTv,
  IconVolume,
  IconUsers,
} from '@tabler/icons-react'
import {
  useConferenceSettings,
  useUpdateConferenceSettings,
} from '@/hooks/use-conference-settings'
import { toast } from 'sonner'

export function ConferenceSettingsCard() {
  const { data: settings, isLoading, isError } = useConferenceSettings()
  const updateSettings = useUpdateConferenceSettings()

  const [form, setForm] = useState<{
    defaultVideoResolution: '360p' | '540p' | '720p' | '1080p'
    defaultFrameRate: 15 | 30 | 60
    defaultAudioMode: 'mono' | 'stereo'
    maxParticipantsPerSession: number
    layoutTemplates: string[]
  }>({
    defaultVideoResolution: '720p',
    defaultFrameRate: 30,
    defaultAudioMode: 'stereo',
    maxParticipantsPerSession: 50,
    layoutTemplates: ['interactive_class', 'large_event', 'standard_meeting'],
  })

  const [newTemplate, setNewTemplate] = useState('')

  useEffect(() => {
    if (settings) {
      setForm({
        defaultVideoResolution: settings.defaultVideoResolution ?? '720p',
        defaultFrameRate: settings.defaultFrameRate ?? 30,
        defaultAudioMode: settings.defaultAudioMode ?? 'stereo',
        maxParticipantsPerSession: settings.maxParticipantsPerSession ?? 50,
        layoutTemplates: settings.layoutTemplates ?? ['interactive_class', 'large_event', 'standard_meeting'],
      })
    }
  }, [settings])

  const handleAddTemplate = () => {
    const slug = newTemplate.trim().toLowerCase().replace(/\s+/g, '_')
    if (!slug) return
    if (form.layoutTemplates.includes(slug)) {
      toast.error('Template already exists')
      return
    }
    setForm((prev) => ({
      ...prev,
      layoutTemplates: [...prev.layoutTemplates, slug],
    }))
    setNewTemplate('')
  }

  const handleRemoveTemplate = (template: string) => {
    if (form.layoutTemplates.length <= 1) {
      toast.error('At least one layout template is required')
      return
    }
    setForm((prev) => ({
      ...prev,
      layoutTemplates: prev.layoutTemplates.filter((t) => t !== template),
    }))
  }

  const handleSave = async () => {
    if (form.maxParticipantsPerSession < 1 || form.maxParticipantsPerSession > 500) {
      toast.error('Max participants must be between 1 and 500')
      return
    }
    await updateSettings.mutateAsync(form)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <IconVideo className="w-5 h-5 text-purple-600" />
          <div>
            <CardTitle>Session Layout & Conference Defaults</CardTitle>
            <CardDescription>
              Configure default video quality, audio mode, participant limits, and layout templates for online sessions.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {isError && (
          <p className="text-sm text-red-500">
            Failed to load conference settings. You can still set custom options below.
          </p>
        )}

        {/* Video Resolution & Frame Rate */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <IconDeviceTv className="w-4 h-4 text-muted-foreground" />
              Default Video Resolution
            </label>
            <Select
              value={form.defaultVideoResolution}
              onValueChange={(val: any) =>
                setForm((prev) => ({ ...prev, defaultVideoResolution: val }))
              }
              disabled={updateSettings.isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select resolution" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="360p">360p (Low Bandwidth)</SelectItem>
                <SelectItem value="540p">540p (Standard Quality)</SelectItem>
                <SelectItem value="720p">720p HD (Recommended)</SelectItem>
                <SelectItem value="1080p">1080p Full HD</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <IconDeviceTv className="w-4 h-4 text-muted-foreground" />
              Default Frame Rate (FPS)
            </label>
            <Select
              value={String(form.defaultFrameRate)}
              onValueChange={(val) =>
                setForm((prev) => ({ ...prev, defaultFrameRate: Number(val) as any }))
              }
              disabled={updateSettings.isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select FPS" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 FPS (Slides/Low Bandwidth)</SelectItem>
                <SelectItem value="30">30 FPS (Standard Video)</SelectItem>
                <SelectItem value="60">60 FPS (High Motion Fitness)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Audio Mode & Max Participants */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <IconVolume className="w-4 h-4 text-muted-foreground" />
              Standard Audio Mode
            </label>
            <Select
              value={form.defaultAudioMode}
              onValueChange={(val: any) =>
                setForm((prev) => ({ ...prev, defaultAudioMode: val }))
              }
              disabled={updateSettings.isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select audio mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mono">Mono (Speech Optimized)</SelectItem>
                <SelectItem value="stereo">Stereo (Music & High Quality)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <IconUsers className="w-4 h-4 text-muted-foreground" />
              Max Participant Limit
            </label>
            <Input
              type="number"
              min={1}
              max={500}
              value={form.maxParticipantsPerSession}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  maxParticipantsPerSession: Number(e.target.value) || 1,
                }))
              }
              disabled={updateSettings.isPending}
            />
          </div>
        </div>

        {/* Session Layout Templates Manager */}
        <div className="space-y-2 border-t pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Session Layout Templates</p>
              <p className="text-xs text-muted-foreground">
                Available layout categories applied to online group classes (`Class.streamRoomId`).
              </p>
            </div>
            <Badge variant="outline">{form.layoutTemplates.length} templates</Badge>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {form.layoutTemplates.map((template) => (
              <Badge
                key={template}
                className="px-3 py-1 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1.5 hover:bg-purple-100"
              >
                <span>{template}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTemplate(template)}
                  disabled={updateSettings.isPending}
                  className="text-purple-400 hover:text-purple-700 dark:hover:text-purple-100"
                >
                  <IconTrash className="w-3.5 h-3.5" />
                </button>
              </Badge>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-2 max-w-sm">
            <Input
              placeholder="e.g. interactive_class"
              value={newTemplate}
              onChange={(e) => setNewTemplate(e.target.value)}
              disabled={updateSettings.isPending}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddTemplate}
              disabled={updateSettings.isPending || !newTemplate.trim()}
            >
              <IconPlus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-2">
          <Button
            onClick={handleSave}
            disabled={updateSettings.isPending}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {updateSettings.isPending ? (
              <><IconLoader2 className="mr-2 h-4 w-4 animate-spin" /> Saving Defaults...</>
            ) : (
              'Save Conference Defaults'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
