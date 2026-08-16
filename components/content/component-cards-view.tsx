'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  APP_COMPONENTS,
  ContentComponentDefinition,
  ContentFieldDefinition,
} from '@/lib/content-registry'
import type { ContentOverride } from '@/lib/services/content.service'
import {
  IconArrowBackUp,
  IconCheck,
  IconClock,
  IconDeviceMobile,
  IconEdit,
  IconFlame,
  IconLayoutGrid,
  IconPencil,
  IconPlayerPlay,
  IconPlus,
  IconSparkles,
  IconTag,
  IconTrash,
} from '@tabler/icons-react'

interface ComponentCardsViewProps {
  overrides: ContentOverride[]
  onOpenEdit: (fieldKey: string, componentId: string, override?: ContentOverride) => void
  onOpenDelete: (override: ContentOverride) => void
  onSelectComponentForPreview: (componentId: string) => void
  selectedComponentId?: string
}

export function ComponentCardsView({
  overrides,
  onOpenEdit,
  onOpenDelete,
  onSelectComponentForPreview,
  selectedComponentId,
}: ComponentCardsViewProps) {
  // Find custom overrides that don't belong to any known component in the registry
  const customOverrides = overrides.filter(
    (o) => !APP_COMPONENTS.some((c) => c.fields.some((f) => f.key === o.key))
  )

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        {APP_COMPONENTS.map((comp) => {
          const compOverrides = overrides.filter((o) =>
            comp.fields.some((f) => f.key === o.key)
          )
          const isSelected = selectedComponentId === comp.id

          return (
            <Card
              key={comp.id}
              className={`bg-zinc-950/80 border transition-all duration-200 ${
                isSelected
                  ? 'border-[#b8e925] shadow-lg shadow-[#b8e925]/5 ring-1 ring-[#b8e925]/20'
                  : 'border-zinc-800/80 hover:border-zinc-700'
              }`}
            >
              <CardHeader className="pb-3 border-b border-zinc-800/60">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[#b8e925] shrink-0">
                      <IconDeviceMobile className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base font-bold text-zinc-100">
                          {comp.name}
                        </CardTitle>
                        <Badge
                          variant="outline"
                          className="text-[10px] py-0 px-1.5 border-[#b8e925]/30 text-[#b8e925]"
                        >
                          {comp.badge}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs text-zinc-400 mt-0.5">
                        {comp.description}
                      </CardDescription>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSelectComponentForPreview(comp.id)}
                      className={`text-xs h-8 ${
                        isSelected
                          ? 'bg-[#b8e925]/10 text-[#b8e925] border-[#b8e925]/40'
                          : 'border-zinc-800 text-zinc-300'
                      }`}
                    >
                      <IconSparkles className="w-3.5 h-3.5 mr-1" />
                      {isSelected ? 'Focused in Mobile View' : 'Focus Mobile Preview'}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-4 p-4 space-y-3">
                {comp.fields.map((field) => {
                  const fieldOverride = overrides.find((o) => o.key === field.key)
                  const hasOverride = !!fieldOverride

                  return (
                    <div
                      key={field.key}
                      className={`p-3.5 rounded-xl border transition-all ${
                        hasOverride
                          ? 'bg-zinc-900/60 border-[#b8e925]/20 ring-1 ring-[#b8e925]/10'
                          : 'bg-zinc-900/20 border-zinc-800/60 hover:bg-zinc-900/40'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        {/* Field info and copy diff */}
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-zinc-200">
                              {field.label}
                            </span>
                            <code className="text-[10.5px] font-mono text-zinc-400 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">
                              {field.key}
                            </code>
                            {hasOverride ? (
                              <Badge className="bg-[#b8e925]/20 text-[#b8e925] border-[#b8e925]/30 text-[10px] py-0">
                                {fieldOverride.isActive ? 'Remote Override Active' : 'Override Disabled'}
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px] py-0 text-zinc-400 bg-zinc-800/60">
                                Using Shipped Default
                              </Badge>
                            )}
                            {hasOverride && fieldOverride.platform && (
                              <Badge variant="outline" className="text-[10px] py-0 text-amber-400 border-amber-500/30">
                                {fieldOverride.platform.toUpperCase()} only
                              </Badge>
                            )}
                          </div>

                          {/* Text Preview */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 text-xs">
                            <div className="bg-zinc-950/70 p-2 rounded-lg border border-zinc-800/40">
                              <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-0.5">
                                Shipped Built-In Copy
                              </span>
                              <p className="text-zinc-300 font-mono text-[11.5px] line-clamp-2">
                                &ldquo;{field.defaultValue}&rdquo;
                              </p>
                            </div>

                            <div
                              className={`p-2 rounded-lg border ${
                                hasOverride
                                  ? 'bg-[#b8e925]/5 border-[#b8e925]/30'
                                  : 'bg-zinc-950/30 border-zinc-800/20 text-zinc-500'
                              }`}
                            >
                              <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-0.5">
                                Live In App
                              </span>
                              <p
                                className={`font-mono text-[11.5px] line-clamp-2 ${
                                  hasOverride ? 'text-[#b8e925] font-medium' : 'text-zinc-500 italic'
                                }`}
                              >
                                {hasOverride
                                  ? fieldOverride.value === ''
                                    ? '(Empty String / Blanked)'
                                    : `“${fieldOverride.value}”`
                                  : `“${field.defaultValue}” (Default)`}
                              </p>
                            </div>
                          </div>

                          {hasOverride && fieldOverride.note && (
                            <p className="text-[10.5px] text-zinc-400 italic pt-0.5">
                              Note: {fieldOverride.note}
                            </p>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-start">
                          <Button
                            size="sm"
                            variant={hasOverride ? 'outline' : 'ghost'}
                            onClick={() => onOpenEdit(field.key, comp.id, fieldOverride)}
                            className={`h-8 text-xs ${
                              hasOverride
                                ? 'border-[#b8e925]/40 text-[#b8e925] hover:bg-[#b8e925]/10'
                                : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
                            }`}
                          >
                            <IconPencil className="w-3.5 h-3.5 mr-1" />
                            {hasOverride ? 'Edit Override' : 'Customize Field'}
                          </Button>

                          {hasOverride && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onOpenDelete(fieldOverride)}
                              className="h-8 w-8 p-0 text-zinc-400 hover:text-red-400 hover:bg-red-950/30"
                              title="Restore shipped default"
                            >
                              <IconTrash className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )
        })}

        {/* Custom Overrides Card (if any exist) */}
        {customOverrides.length > 0 && (
          <Card className="bg-zinc-950/80 border border-zinc-800">
            <CardHeader className="pb-3 border-b border-zinc-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-400">
                    <IconTag className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-zinc-100">
                      Custom & Additional Keys
                    </CardTitle>
                    <CardDescription className="text-xs text-zinc-400">
                      Overrides for keys not defined in the standard component registry.
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {customOverrides.map((row) => (
                <div
                  key={row._id}
                  className="p-3.5 rounded-xl border bg-zinc-900/40 border-zinc-800 flex items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono font-bold text-[#b8e925] bg-zinc-950 px-1.5 py-0.5 rounded">
                        {row.key}
                      </code>
                      <Badge variant={row.isActive ? 'default' : 'secondary'} className="text-[10px]">
                        {row.isActive ? 'Live' : 'Off'}
                      </Badge>
                      {row.platform && (
                        <Badge variant="outline" className="text-[10px] text-amber-400">
                          {row.platform.toUpperCase()} only
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-zinc-200 font-mono">
                      &ldquo;{row.value}&rdquo;
                    </p>
                    {row.note && (
                      <p className="text-[10.5px] text-zinc-400 italic">
                        Note: {row.note}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onOpenEdit(row.key, 'custom', row)}
                      className="h-8 text-xs text-zinc-300 hover:text-white"
                    >
                      <IconPencil className="w-3.5 h-3.5 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onOpenDelete(row)}
                      className="h-8 w-8 p-0 text-zinc-400 hover:text-red-400"
                    >
                      <IconTrash className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
