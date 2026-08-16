'use client'

import React, { useMemo, useState } from 'react'
import {
  IconDeviceMobile,
  IconEdit,
  IconEye,
  IconFilter,
  IconInfoCircle,
  IconLayoutCards,
  IconLayoutGrid,
  IconPencil,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconSparkles,
  IconTable,
  IconTrash,
} from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  useContentOverrides,
  useCreateContentOverride,
  useDeleteContentOverride,
  useUpdateContentOverride,
} from '@/hooks/use-content'
import type {
  ContentOverride,
  ContentPlatform,
} from '@/lib/services/content.service'
import {
  APP_COMPONENTS,
  ContentComponentDefinition,
  ContentFieldDefinition,
  findComponentByFieldKey,
  findFieldByKey,
} from '@/lib/content-registry'
import { MobileCopyPreview } from '@/components/content/mobile-copy-preview'
import { EditOverrideDialog } from '@/components/content/edit-override-dialog'
import { ComponentCardsView } from '@/components/content/component-cards-view'

type ViewMode = 'studio' | 'cards' | 'table'

export default function ContentPage() {
  const { data: overrides = [], isLoading, refetch } = useContentOverrides()
  const createOverride = useCreateContentOverride()
  const updateOverride = useUpdateContentOverride()
  const deleteOverride = useDeleteContentOverride()

  // UI State
  const [viewMode, setViewMode] = useState<ViewMode>('studio')
  const [selectedComponentId, setSelectedComponentId] = useState<string>('visitor-hero')
  const [activeFieldKey, setActiveFieldKey] = useState<string>('visitor.hero.greeting')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [platformFilter, setPlatformFilter] = useState<string>('all')

  // Edit / Create Dialog State
  const [dialogOpen, setDialogOpen] = useState<boolean>(false)
  const [editingOverride, setEditingOverride] = useState<ContentOverride | null>(null)
  const [dialogTargetFieldKey, setDialogTargetFieldKey] = useState<string>('visitor.hero.greeting')
  const [dialogTargetComponentId, setDialogTargetComponentId] = useState<string>('visitor-hero')

  // Live Draft binding for preview
  const [draftKey, setDraftKey] = useState<string | undefined>(undefined)
  const [draftValue, setDraftValue] = useState<string | undefined>(undefined)

  // Delete Alert State
  const [deletingOverride, setDeletingOverride] = useState<ContentOverride | null>(null)

  // Current active component in studio view
  const currentComponent = useMemo(
    () => APP_COMPONENTS.find((c) => c.id === selectedComponentId) ?? APP_COMPONENTS[0],
    [selectedComponentId]
  )

  // Filtered overrides for table & search
  const filteredOverrides = useMemo(() => {
    return overrides.filter((row) => {
      const matchesSearch =
        !searchQuery ||
        row.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (row.note && row.note.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesPlatform =
        platformFilter === 'all' ||
        (platformFilter === 'general' && row.platform === null) ||
        row.platform === platformFilter

      return matchesSearch && matchesPlatform
    })
  }, [overrides, searchQuery, platformFilter])

  // Open creation modal with preset component/field
  const handleOpenCreate = (compId?: string, fieldKey?: string) => {
    setEditingOverride(null)
    setDialogTargetComponentId(compId ?? selectedComponentId)
    setDialogTargetFieldKey(fieldKey ?? activeFieldKey)
    setDraftKey(undefined)
    setDraftValue(undefined)
    setDialogOpen(true)
  }

  // Open edit modal for an existing override or a specific field
  const handleOpenEdit = (
    fieldKey: string,
    componentId: string,
    existingOverride?: ContentOverride
  ) => {
    setDialogTargetComponentId(componentId)
    setDialogTargetFieldKey(fieldKey)
    setEditingOverride(existingOverride ?? null)
    setDraftKey(fieldKey)
    setDraftValue(existingOverride ? existingOverride.value : undefined)
    setDialogOpen(true)
  }

  // Save handler for dialog
  const handleSaveOverride = async (payload: {
    key: string
    value: string
    platform: ContentPlatform | null
    note: string
    isActive: boolean
  }) => {
    try {
      if (editingOverride) {
        await updateOverride.mutateAsync({
          id: editingOverride._id,
          payload,
        })
      } else {
        await createOverride.mutateAsync(payload)
      }
      setDialogOpen(false)
      setDraftKey(undefined)
      setDraftValue(undefined)
    } catch {
      // Error handled by mutation toast
    }
  }

  // Delete confirmation handler
  const handleDeleteConfirm = async () => {
    if (deletingOverride) {
      try {
        await deleteOverride.mutateAsync(deletingOverride._id)
        setDeletingOverride(null)
        setDialogOpen(false)
      } catch {
        // Error handled by mutation toast
      }
    }
  }

  // When clicking on a field in the mobile phone preview
  const handleSelectFieldFromPreview = (fieldKey: string, componentId: string) => {
    setSelectedComponentId(componentId)
    setActiveFieldKey(fieldKey)
    const existing = overrides.find((o) => o.key === fieldKey)
    handleOpenEdit(fieldKey, componentId, existing)
  }

  const isSaving = createOverride.isPending || updateOverride.isPending

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8 pt-6 max-w-7xl mx-auto">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#b8e925] flex items-center justify-center text-black font-black text-sm">
              <IconSparkles className="w-4 h-4" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              App Copy Studio
            </h1>
          </div>
          <p className="text-xs md:text-sm text-zinc-400 mt-1">
            Visual editor to update and preview mobile app text, CTAs, and WhatsApp prompts in real time.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="border-zinc-800 hover:bg-zinc-900 text-zinc-300 text-xs h-9"
          >
            <IconRefresh className="w-3.5 h-3.5 mr-1.5" />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={() => handleOpenCreate()}
            className="bg-[#b8e925] hover:bg-[#a6d41f] text-black font-semibold text-xs h-9 px-3.5"
          >
            <IconPlus className="w-4 h-4 mr-1" />
            New Override
          </Button>
        </div>
      </div>

      {/* Mode Switcher & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-950/60 p-2.5 rounded-2xl border border-zinc-800/80">
        {/* View Mode Tabs */}
        <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800">
          <Button
            size="sm"
            variant={viewMode === 'studio' ? 'default' : 'ghost'}
            onClick={() => setViewMode('studio')}
            className={`text-xs h-8 px-3 rounded-lg ${
              viewMode === 'studio'
                ? 'bg-[#b8e925] text-black font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <IconDeviceMobile className="w-3.5 h-3.5 mr-1.5" />
            Visual Studio
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'cards' ? 'default' : 'ghost'}
            onClick={() => setViewMode('cards')}
            className={`text-xs h-8 px-3 rounded-lg ${
              viewMode === 'cards'
                ? 'bg-[#b8e925] text-black font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <IconLayoutCards className="w-3.5 h-3.5 mr-1.5" />
            Component Cards
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            onClick={() => setViewMode('table')}
            className={`text-xs h-8 px-3 rounded-lg ${
              viewMode === 'table'
                ? 'bg-[#b8e925] text-black font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <IconTable className="w-3.5 h-3.5 mr-1.5" />
            All Overrides ({overrides.length})
          </Button>
        </div>

        {/* Search & Platform Filter (for Cards & Table view) */}
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <IconSearch className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <Input
              placeholder="Search copy or keys..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 bg-zinc-900 border-zinc-800 text-xs h-8 text-zinc-200 placeholder:text-zinc-500"
            />
          </div>

          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="w-32 bg-zinc-900 border-zinc-800 text-xs h-8">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-950 border-zinc-800 text-xs">
              <SelectItem value="all">All Platforms</SelectItem>
              <SelectItem value="general">General Only</SelectItem>
              <SelectItem value="ios">iOS Only</SelectItem>
              <SelectItem value="android">Android Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. VISUAL STUDIO MODE (SIDE-BY-SIDE INTERACTIVE VISUAL BUILDER) */}
      {/* ========================================================================= */}
      {viewMode === 'studio' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Panel: Component Selector & Interactive Field Configurator (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Component Selector Dropdown / Pills */}
            <Card className="bg-zinc-950/80 border-zinc-800">
              <CardHeader className="pb-3 border-b border-zinc-800/80">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <CardTitle className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                      <IconLayoutGrid className="w-4 h-4 text-[#b8e925]" />
                      Select Mobile Component
                    </CardTitle>
                    <CardDescription className="text-xs text-zinc-400">
                      Choose which screen section to customize or preview.
                    </CardDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-[#b8e925]/30 text-[#b8e925] text-[11px]"
                  >
                    {currentComponent.badge}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-3.5 space-y-3">
                {/* Component Dropdown */}
                <Select
                  value={selectedComponentId}
                  onValueChange={(val) => {
                    setSelectedComponentId(val)
                    const comp = APP_COMPONENTS.find((c) => c.id === val)
                    if (comp && comp.fields.length > 0) {
                      setActiveFieldKey(comp.fields[0].key)
                    }
                  }}
                >
                  <SelectTrigger className="w-full bg-zinc-900 border-zinc-800 text-xs h-10 font-semibold text-zinc-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950 border-zinc-800 text-xs max-h-72">
                    {APP_COMPONENTS.map((comp) => (
                      <SelectItem key={comp.id} value={comp.id} className="py-2 focus:bg-zinc-900">
                        <div className="flex items-center justify-between w-full gap-2">
                          <span className="font-semibold">{comp.name}</span>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {comp.fields.length} fields
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <p className="text-xs text-zinc-400 leading-relaxed bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-800/60">
                  {currentComponent.description}
                </p>
              </CardContent>
            </Card>

            {/* Editable Fields in Current Component */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Editable Fields ({currentComponent.fields.length})
                </h3>
                <span className="text-[11px] text-zinc-500">
                  Click any field to edit & preview
                </span>
              </div>

              {currentComponent.fields.map((field) => {
                const existingOverride = overrides.find((o) => o.key === field.key)
                const hasOverride = !!existingOverride
                const isFieldActive = activeFieldKey === field.key

                return (
                  <div
                    key={field.key}
                    onClick={() => setActiveFieldKey(field.key)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isFieldActive
                        ? 'bg-zinc-900/90 border-[#b8e925] ring-1 ring-[#b8e925]/30 shadow-md'
                        : hasOverride
                        ? 'bg-zinc-900/50 border-[#b8e925]/30 hover:border-[#b8e925]/60'
                        : 'bg-zinc-950/70 border-zinc-800/80 hover:bg-zinc-900/40 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-zinc-100">
                            {field.label}
                          </span>
                          <code className="text-[10px] font-mono text-zinc-400 bg-zinc-950 px-1.5 py-0.2 rounded border border-zinc-800">
                            {field.key}
                          </code>
                          {hasOverride ? (
                            <Badge className="bg-[#b8e925]/20 text-[#b8e925] border-[#b8e925]/30 text-[10px] py-0">
                              {existingOverride.isActive ? 'Live Remote Copy' : 'Disabled'}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] py-0 text-zinc-400 bg-zinc-800/60">
                              Shipped Default
                            </Badge>
                          )}
                          {hasOverride && existingOverride.platform && (
                            <Badge variant="outline" className="text-[10px] py-0 text-amber-400 border-amber-500/30">
                              {existingOverride.platform.toUpperCase()}
                            </Badge>
                          )}
                        </div>

                        {/* Text comparison */}
                        <div className="pt-1 space-y-1 text-xs">
                          {hasOverride ? (
                            <div className="bg-[#b8e925]/10 border border-[#b8e925]/30 p-2 rounded-lg">
                              <span className="text-[9.5px] uppercase font-bold text-[#b8e925] block mb-0.5">
                                Showing in App:
                              </span>
                              <p className="font-mono text-zinc-100 font-medium text-xs">
                                {existingOverride.value === '' ? (
                                  <span className="italic text-zinc-500">(Empty String / Blanked)</span>
                                ) : (
                                  `“${existingOverride.value}”`
                                )}
                              </p>
                            </div>
                          ) : (
                            <div className="bg-zinc-950/80 border border-zinc-800/60 p-2 rounded-lg text-zinc-300">
                              <span className="text-[9.5px] uppercase font-bold text-zinc-500 block mb-0.5">
                                Shipped Default:
                              </span>
                              <p className="font-mono text-xs">
                                &ldquo;{field.defaultValue}&rdquo;
                              </p>
                            </div>
                          )}
                        </div>

                        <p className="text-[11px] text-zinc-400 pt-0.5">
                          {field.description}
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenEdit(field.key, currentComponent.id, existingOverride)
                          }}
                          className={`h-8 text-xs ${
                            hasOverride
                              ? 'bg-[#b8e925] text-black font-semibold hover:bg-[#a6d41f]'
                              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                          }`}
                        >
                          <IconPencil className="w-3.5 h-3.5 mr-1" />
                          {hasOverride ? 'Edit' : 'Override'}
                        </Button>

                        {hasOverride && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeletingOverride(existingOverride)
                            }}
                            className="h-8 w-8 p-0 text-zinc-400 hover:text-red-400"
                            title="Restore default"
                          >
                            <IconTrash className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right Panel: Simulated Live Mobile Phone Preview (5 cols) */}
          <div className="lg:col-span-5 lg:sticky lg:top-6 space-y-3">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <IconDeviceMobile className="w-4 h-4 text-[#b8e925]" />
                <span className="text-xs font-bold text-zinc-200">
                  Live Mobile Simulator
                </span>
              </div>
              <Badge variant="outline" className="text-[10px] text-zinc-400 border-zinc-800">
                Interactive Preview
              </Badge>
            </div>

            <Card className="bg-zinc-950/90 border-zinc-800/80 overflow-hidden shadow-2xl">
              <CardContent className="p-0">
                <MobileCopyPreview
                  overrides={overrides}
                  selectedComponentId={selectedComponentId}
                  activeFieldKey={activeFieldKey}
                  draftKey={draftKey}
                  draftValue={draftValue}
                  onSelectField={handleSelectFieldFromPreview}
                />
              </CardContent>
            </Card>

            <div className="rounded-xl p-3 bg-zinc-900/40 border border-zinc-800/60 text-center text-xs text-zinc-400">
              <IconInfoCircle className="w-3.5 h-3.5 inline mr-1 text-[#b8e925]" />
              Tap any text or button inside the phone frame to edit its wording directly.
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. COMPONENT CARDS VIEW MODE */}
      {/* ========================================================================= */}
      {viewMode === 'cards' && (
        <ComponentCardsView
          overrides={overrides}
          onOpenEdit={handleOpenEdit}
          onOpenDelete={(row) => setDeletingOverride(row)}
          onSelectComponentForPreview={(cId) => {
            setSelectedComponentId(cId)
            setViewMode('studio')
          }}
          selectedComponentId={selectedComponentId}
        />
      )}

      {/* ========================================================================= */}
      {/* 3. TABLE VIEW MODE (ALL OVERRIDES HIGH-DENSITY TABLE) */}
      {/* ========================================================================= */}
      {viewMode === 'table' && (
        <Card className="bg-zinc-950 border-zinc-800">
          <CardHeader className="pb-3 border-b border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-zinc-100">
                  All Active & Inactive Overrides
                </CardTitle>
                <CardDescription className="text-xs text-zinc-400">
                  Complete list of all strings stored in the remote overrides database.
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-xs">
                {filteredOverrides.length} records
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-zinc-500">Loading overrides...</div>
            ) : filteredOverrides.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500">
                No copy overrides match the current filters. The mobile app is currently rendering its shipped binary copy.
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-zinc-900/60">
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableHead className="text-xs text-zinc-400">Key & Component</TableHead>
                    <TableHead className="text-xs text-zinc-400">Remote Copy</TableHead>
                    <TableHead className="text-xs text-zinc-400">Platform</TableHead>
                    <TableHead className="text-xs text-zinc-400">Status</TableHead>
                    <TableHead className="text-xs text-zinc-400 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-zinc-800/60">
                  {filteredOverrides.map((row) => {
                    const comp = findComponentByFieldKey(row.key)
                    const fieldDef = findFieldByKey(row.key)

                    return (
                      <TableRow key={row._id} className="border-zinc-800/60 hover:bg-zinc-900/40">
                        <TableCell className="align-top py-3">
                          <code className="rounded bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 text-xs text-[#b8e925] font-mono">
                            {row.key}
                          </code>
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className="text-[11px] text-zinc-300 font-medium">
                              {comp ? comp.name : 'Custom Key'}
                            </span>
                            {fieldDef && (
                              <span className="text-[10px] text-zinc-500">
                                ({fieldDef.label})
                              </span>
                            )}
                          </div>
                          {row.note && (
                            <p className="text-[10.5px] text-zinc-500 italic mt-0.5">
                              Note: {row.note}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="max-w-md align-top py-3 text-xs text-zinc-200 font-mono">
                          {row.value === '' ? (
                            <span className="text-zinc-500 italic">(Blank / Empty String)</span>
                          ) : (
                            row.value
                          )}
                        </TableCell>
                        <TableCell className="align-top py-3 text-xs text-zinc-400">
                          {row.platform === null ? (
                            <Badge variant="secondary" className="text-[10px] bg-zinc-800 text-zinc-300">
                              All
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/30">
                              {row.platform.toUpperCase()}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="align-top py-3">
                          <Badge
                            variant={row.isActive ? 'default' : 'secondary'}
                            className={
                              row.isActive
                                ? 'bg-[#b8e925]/20 text-[#b8e925] border-[#b8e925]/30 text-[10px]'
                                : 'text-[10px]'
                            }
                          >
                            {row.isActive ? 'Live' : 'Off'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right align-top py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                handleOpenEdit(
                                  row.key,
                                  comp ? comp.id : 'custom',
                                  row
                                )
                              }
                              className="h-7 text-xs text-zinc-300 hover:text-white"
                            >
                              <IconPencil className="w-3.5 h-3.5 mr-1" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeletingOverride(row)}
                              className="h-7 w-7 p-0 text-zinc-400 hover:text-red-400"
                            >
                              <IconTrash className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit / Create Dialog */}
      <EditOverrideDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialComponentId={dialogTargetComponentId}
        initialFieldKey={dialogTargetFieldKey}
        override={editingOverride}
        onSave={handleSaveOverride}
        onDelete={async (id) => {
          if (editingOverride) setDeletingOverride(editingOverride)
        }}
        onDraftChange={(k, v) => {
          setDraftKey(k)
          setDraftValue(v)
        }}
        isSaving={isSaving}
      />

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={!!deletingOverride}
        onOpenChange={(open) => !open && setDeletingOverride(null)}
      >
        <AlertDialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <IconTrash className="w-4 h-4 text-red-400" />
              Restore Shipped Built-In Copy?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-zinc-400">
              Removing the remote override for{' '}
              <code className="text-[#b8e925] font-mono font-semibold">
                {deletingOverride?.key}
              </code>{' '}
              will immediately restore the app&apos;s original built-in default copy. No space will be left blank.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-900 border-zinc-800 text-xs h-8 hover:bg-zinc-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-500 text-white font-semibold text-xs h-8"
            >
              Restore Shipped Default
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
