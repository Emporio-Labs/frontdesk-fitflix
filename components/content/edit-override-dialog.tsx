'use client'

import React, { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  APP_COMPONENTS,
  ContentComponentDefinition,
  ContentFieldDefinition,
  findComponentByFieldKey,
  findFieldByKey,
} from '@/lib/content-registry'
import { ContentComponentPicker } from '@/components/content/content-component-picker'
import type {
  ContentOverride,
  ContentPlatform,
} from '@/lib/services/content.service'
import {
  IconArrowBackUp,
  IconCheck,
  IconCopy,
  IconDeviceFloppy,
  IconInfoCircle,
  IconSparkles,
  IconTrash,
} from '@tabler/icons-react'

const KEY_PATTERN = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/

export interface EditOverrideDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialComponentId?: string
  initialFieldKey?: string
  override?: ContentOverride | null
  onSave: (payload: {
    key: string
    value: string
    platform: ContentPlatform | null
    note: string
    isActive: boolean
  }) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  onDraftChange?: (key: string, value: string) => void
  isSaving?: boolean
}

export function EditOverrideDialog({
  open,
  onOpenChange,
  initialComponentId = 'visitor-hero',
  initialFieldKey = 'visitor.hero.greeting',
  override,
  onSave,
  onDelete,
  onDraftChange,
  isSaving = false,
}: EditOverrideDialogProps) {
  const isEditing = !!override

  const [selectedComponentId, setSelectedComponentId] = useState<string>(
    initialComponentId
  )
  const [selectedFieldKey, setSelectedFieldKey] = useState<string>(
    initialFieldKey
  )
  const [isCustomKey, setIsCustomKey] = useState<boolean>(false)
  const [customKeyInput, setCustomKeyInput] = useState<string>('')
  const [value, setValue] = useState<string>('')
  const [platform, setPlatform] = useState<'all' | ContentPlatform>('all')
  const [note, setNote] = useState<string>('')
  const [isActive, setIsActive] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Sync state when dialog opens or override changes
  useEffect(() => {
    if (open) {
      if (override) {
        const comp = findComponentByFieldKey(override.key)
        if (comp) {
          setSelectedComponentId(comp.id)
          setSelectedFieldKey(override.key)
          setIsCustomKey(false)
        } else {
          setSelectedComponentId('custom')
          setIsCustomKey(true)
          setCustomKeyInput(override.key)
        }
        setValue(override.value)
        setPlatform(override.platform ?? 'all')
        setNote(override.note ?? '')
        setIsActive(override.isActive)
      } else {
        const comp = APP_COMPONENTS.find((c) => c.id === initialComponentId)
        if (comp) {
          setSelectedComponentId(comp.id)
          const targetKey =
            initialFieldKey && comp.fields.some((f) => f.key === initialFieldKey)
              ? initialFieldKey
              : comp.fields[0].key
          setSelectedFieldKey(targetKey)
          setIsCustomKey(false)
          const f = findFieldByKey(targetKey)
          setValue(f?.defaultValue ?? '')
        } else {
          setSelectedComponentId('visitor-hero')
          setSelectedFieldKey('visitor.hero.greeting')
          setIsCustomKey(false)
          setValue(APP_COMPONENTS[0].fields[0].defaultValue)
        }
        setPlatform('all')
        setNote('')
        setIsActive(true)
      }
      setError(null)
    }
  }, [open, override, initialComponentId, initialFieldKey])

  // Current field metadata
  const activeKey = isCustomKey ? customKeyInput : selectedFieldKey
  const currentFieldDef = findFieldByKey(activeKey)

  const handleFieldSelect = (fieldKey: string) => {
    setSelectedFieldKey(fieldKey)
    const f = findFieldByKey(fieldKey)
    if (f && !override) {
      setValue(f.defaultValue)
      onDraftChange?.(fieldKey, f.defaultValue)
    }
  }

  const handleValueChange = (newVal: string) => {
    setValue(newVal)
    onDraftChange?.(activeKey, newVal)
  }

  const handleUseDefault = () => {
    if (currentFieldDef) {
      setValue(currentFieldDef.defaultValue)
      onDraftChange?.(activeKey, currentFieldDef.defaultValue)
    }
  }

  const validate = (): string | null => {
    const key = activeKey.trim()
    if (!key) return 'A key is required'
    if (!KEY_PATTERN.test(key)) {
      return 'Keys must be lowercase dotted segments, e.g. visitor.hero.title'
    }
    if (value.length > 2000) return 'Copy is too long (2000 characters max)'
    return null
  }

  const handleSubmit = async () => {
    const problem = validate()
    if (problem) {
      setError(problem)
      return
    }
    setError(null)

    await onSave({
      key: activeKey.trim(),
      value,
      platform: platform === 'all' ? null : platform,
      note: note.trim(),
      isActive,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto bg-zinc-950 border-zinc-800 text-zinc-100 p-6">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#b8e925]" />
              {isEditing ? 'Edit Component Copy' : 'New Component Copy Override'}
            </DialogTitle>
            {isEditing && (
              <Badge
                variant={isActive ? 'default' : 'secondary'}
                className={
                  isActive
                    ? 'bg-[#b8e925]/20 text-[#b8e925] border-[#b8e925]/30 text-xs'
                    : 'text-xs'
                }
              >
                {isActive ? 'Live' : 'Disabled'}
              </Badge>
            )}
          </div>
          <DialogDescription className="text-xs text-zinc-400">
            {isEditing
              ? 'Update the copy for this component. Changes will sync to the mobile app within one minute.'
              : 'Pick a component and field from the catalog or supply a custom dotted key.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Component & Field Pickers */}
          <ContentComponentPicker
            selectedComponentId={selectedComponentId}
            selectedFieldKey={selectedFieldKey}
            isCustomKey={isCustomKey}
            onSelectComponent={(cId) => {
              setSelectedComponentId(cId)
              const comp = APP_COMPONENTS.find((c) => c.id === cId)
              if (comp && comp.fields.length > 0 && !override) {
                const firstKey = comp.fields[0].key
                setSelectedFieldKey(firstKey)
                setValue(comp.fields[0].defaultValue)
                onDraftChange?.(firstKey, comp.fields[0].defaultValue)
              }
            }}
            onSelectField={handleFieldSelect}
            onToggleCustomKey={(custom) => setIsCustomKey(custom)}
            disabled={isEditing}
          />

          {/* Custom key input if selected */}
          {isCustomKey && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-zinc-300">
                Custom Key (Lowercase dotted format)
              </Label>
              <Input
                placeholder="e.g. visitor.hero.custom_badge"
                value={customKeyInput}
                onChange={(e) => {
                  setCustomKeyInput(e.target.value)
                  onDraftChange?.(e.target.value, value)
                }}
                disabled={isEditing}
                className="bg-zinc-900 border-zinc-800 text-xs"
              />
            </div>
          )}

          {/* Built-in default display reference card */}
          {currentFieldDef && (
            <div className="rounded-xl p-3.5 bg-zinc-900/70 border border-zinc-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-400 flex items-center gap-1.5">
                  <IconInfoCircle className="w-3.5 h-3.5 text-zinc-400" />
                  Shipped Built-in Default
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={handleUseDefault}
                  className="h-6 text-[11px] text-[#b8e925] hover:bg-[#b8e925]/10 px-2"
                >
                  <IconArrowBackUp className="w-3 h-3 mr-1" />
                  Reset to Default Text
                </Button>
              </div>
              <p className="text-xs text-zinc-300 font-mono bg-zinc-950/80 p-2.5 rounded-lg border border-zinc-800/50 break-words leading-relaxed">
                &ldquo;{currentFieldDef.defaultValue}&rdquo;
              </p>
              <p className="text-[10.5px] text-zinc-500">
                {currentFieldDef.description}
              </p>
            </div>
          )}

          {/* New Override Value Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-zinc-200">
                Shows Instead (Remote Override)
              </Label>
              <span className="text-[10px] text-zinc-500 font-mono">
                {value.length} / 2000 chars
              </span>
            </div>
            <Textarea
              rows={3}
              value={value}
              onChange={(e) => handleValueChange(e.target.value)}
              placeholder="Enter new text here..."
              className="bg-zinc-900 border-zinc-800 text-sm focus:border-[#b8e925] text-zinc-100 placeholder:text-zinc-600"
              maxLength={2000}
            />
            <p className="text-[10.5px] text-zinc-500">
              Leaving this empty is supported if you deliberately want to blank out a subtitle or CTA.
            </p>
          </div>

          {/* Platform & Staff Note */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-zinc-300">
                Target Platform
              </Label>
              <Select
                value={platform}
                onValueChange={(v) => setPlatform(v as 'all' | ContentPlatform)}
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-800 text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-zinc-800 text-xs">
                  <SelectItem value="all">All Platforms (iOS & Android)</SelectItem>
                  <SelectItem value="ios">iOS Only</SelectItem>
                  <SelectItem value="android">Android Only</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-zinc-500">
                A platform-specific copy wins over an &ldquo;All&rdquo; copy for that operating system.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-zinc-300">
                Internal Staff Note (Optional)
              </Label>
              <Input
                placeholder="e.g. Diwali Fest Promotion 2026"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                className="bg-zinc-900 border-zinc-800 text-xs h-9"
              />
              <p className="text-[10px] text-zinc-500">
                For team reference only; never sent to the mobile app.
              </p>
            </div>
          </div>

          {/* Active Status Switch */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <div>
              <p className="text-xs font-semibold text-zinc-200">
                Live Status
              </p>
              <p className="text-[10.5px] text-zinc-400">
                Switch off to temporarily disable without deleting the wording.
              </p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
              className="data-[state=checked]:bg-[#b8e925]"
            />
          </div>

          {/* Validation Error */}
          {error && (
            <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-800/60 text-xs text-red-300">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="mt-4 pt-4 border-t border-zinc-800/80 flex items-center justify-between">
          <div>
            {isEditing && onDelete && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => onDelete(override._id)}
                disabled={isSaving}
                className="text-xs h-8"
              >
                <IconTrash className="w-3.5 h-3.5 mr-1" />
                Delete Override
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              className="border-zinc-700 hover:bg-zinc-900 text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSubmit}
              disabled={isSaving}
              className="bg-[#b8e925] hover:bg-[#a6d41f] text-black font-semibold text-xs h-8"
            >
              <IconDeviceFloppy className="w-3.5 h-3.5 mr-1" />
              {isSaving ? 'Saving...' : 'Save & Publish'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
