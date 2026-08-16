'use client'

import React from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  APP_COMPONENTS,
  ContentComponentDefinition,
  ContentFieldDefinition,
} from '@/lib/content-registry'
import {
  IconDeviceMobile,
  IconFlame,
  IconKey,
  IconLayoutGrid,
  IconPlayerPlay,
  IconSparkles,
  IconTag,
  IconUsers,
} from '@tabler/icons-react'

interface ContentComponentPickerProps {
  selectedComponentId: string
  selectedFieldKey: string
  isCustomKey?: boolean
  onSelectComponent: (componentId: string) => void
  onSelectField: (fieldKey: string) => void
  onToggleCustomKey?: (isCustom: boolean) => void
  disabled?: boolean
}

export function ContentComponentPicker({
  selectedComponentId,
  selectedFieldKey,
  isCustomKey = false,
  onSelectComponent,
  onSelectField,
  onToggleCustomKey,
  disabled = false,
}: ContentComponentPickerProps) {
  const currentComponent = APP_COMPONENTS.find(
    (c) => c.id === selectedComponentId
  )

  const handleComponentChange = (compVal: string) => {
    if (compVal === 'custom') {
      onToggleCustomKey?.(true)
      onSelectComponent('custom')
    } else {
      onToggleCustomKey?.(false)
      onSelectComponent(compVal)
      const comp = APP_COMPONENTS.find((c) => c.id === compVal)
      if (comp && comp.fields.length > 0) {
        onSelectField(comp.fields[0].key)
      }
    }
  }

  return (
    <div className="space-y-3">
      {/* 1. Component Dropdown */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <IconLayoutGrid className="w-3.5 h-3.5 text-[#b8e925]" />
            Target Component / Screen
          </span>
          {currentComponent && (
            <Badge
              variant="outline"
              className="text-[10px] py-0 px-1.5 border-[#b8e925]/30 text-[#b8e925]"
            >
              {currentComponent.badge}
            </Badge>
          )}
        </label>

        <Select
          value={isCustomKey ? 'custom' : selectedComponentId}
          onValueChange={handleComponentChange}
          disabled={disabled}
        >
          <SelectTrigger className="w-full bg-zinc-900 border-zinc-800 text-xs h-10">
            <SelectValue placeholder="Select mobile component..." />
          </SelectTrigger>
          <SelectContent className="bg-zinc-950 border-zinc-800 text-xs max-h-72">
            {APP_COMPONENTS.map((comp) => (
              <SelectItem
                key={comp.id}
                value={comp.id}
                className="py-2 focus:bg-zinc-900 focus:text-white"
              >
                <div className="flex items-center justify-between w-full gap-2">
                  <div className="flex flex-col text-left">
                    <span className="font-semibold">{comp.name}</span>
                    <span className="text-[10px] text-zinc-500 truncate max-w-[280px]">
                      {comp.description}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400 font-mono bg-zinc-900 px-1.5 py-0.5 rounded shrink-0">
                    {comp.fields.length} fields
                  </span>
                </div>
              </SelectItem>
            ))}
            <SelectItem
              value="custom"
              className="py-2 border-t border-zinc-800 focus:bg-zinc-900 text-[#b8e925]"
            >
              <div className="flex items-center gap-2">
                <IconKey className="w-3.5 h-3.5" />
                <span className="font-semibold">+ Custom / Raw Dotted Key</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 2. Field Dropdown (when not in custom mode) */}
      {!isCustomKey && currentComponent && (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <IconTag className="w-3.5 h-3.5 text-[#b8e925]" />
              Select Field to Override
            </span>
            <code className="text-[10px] text-zinc-400 font-mono bg-zinc-900 px-1 rounded">
              {selectedFieldKey}
            </code>
          </label>

          <Select
            value={selectedFieldKey}
            onValueChange={onSelectField}
            disabled={disabled}
          >
            <SelectTrigger className="w-full bg-zinc-900 border-zinc-800 text-xs h-10">
              <SelectValue placeholder="Select specific text field..." />
            </SelectTrigger>
            <SelectContent className="bg-zinc-950 border-zinc-800 text-xs">
              {currentComponent.fields.map((field) => (
                <SelectItem
                  key={field.key}
                  value={field.key}
                  className="py-2 focus:bg-zinc-900 focus:text-white"
                >
                  <div className="flex flex-col text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-zinc-200">
                        {field.label}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        ({field.key})
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-400 italic truncate max-w-[320px]">
                      Default: &ldquo;{field.defaultValue}&rdquo;
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )
}
