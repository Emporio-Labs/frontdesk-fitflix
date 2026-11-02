'use client'

import { useState, useRef } from 'react'
import {
  IconPlus,
  IconBuildingStore,
  IconTrash,
  IconShieldCheck,
  IconUpload,
  IconPhoto,
  IconX,
  IconCheck,
  IconLink,
  IconEdit,
} from '@tabler/icons-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  uploadEventImage,
  type Collaborator,
  type Sponsor,
} from '@/lib/services/event.service'

interface CoBrandingManagerProps {
  collaborators: Collaborator[]
  sponsors: Sponsor[]
  onCollaboratorsChange: (collaborators: Collaborator[]) => void
  onSponsorsChange: (sponsors: Sponsor[]) => void
}

export function CoBrandingManager({
  collaborators,
  sponsors,
  onCollaboratorsChange,
  onSponsorsChange,
}: CoBrandingManagerProps) {
  // Collaborator Input state
  const [editingCIndex, setEditingCIndex] = useState<number | null>(null)
  const [cName, setCName] = useState('')
  const [cRole, setCRole] = useState('')
  const [cLogo, setCLogo] = useState('')
  const [cWeb, setCWeb] = useState('')
  const [uploadingCLogo, setUploadingCLogo] = useState(false)
  const [showCManualUrl, setShowCManualUrl] = useState(false)
  const cFileInputRef = useRef<HTMLInputElement>(null)

  // Sponsor Input state
  const [editingSIndex, setEditingSIndex] = useState<number | null>(null)
  const [sName, setSName] = useState('')
  const [sLogo, setSLogo] = useState('')
  const [sTier, setSTier] = useState('')
  const [uploadingSLogo, setUploadingSLogo] = useState(false)
  const [showSManualUrl, setShowSManualUrl] = useState(false)
  const sFileInputRef = useRef<HTMLInputElement>(null)

  // Handle Collaborator Logo File Upload
  const handleCFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploadingCLogo(true)
      const url = await uploadEventImage(file, 'collaborator')
      setCLogo(url)
      toast.success('Partner logo uploaded successfully!')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to upload partner logo'
      toast.error(msg)
    } finally {
      setUploadingCLogo(false)
      if (cFileInputRef.current) cFileInputRef.current.value = ''
    }
  }

  // Handle Sponsor Logo File Upload
  const handleSFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploadingSLogo(true)
      const url = await uploadEventImage(file, 'sponsor')
      setSLogo(url)
      toast.success('Sponsor logo uploaded successfully!')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to upload sponsor logo'
      toast.error(msg)
    } finally {
      setUploadingSLogo(false)
      if (sFileInputRef.current) sFileInputRef.current.value = ''
    }
  }

  const handleAddOrUpdateCollaborator = () => {
    if (!cName.trim()) {
      toast.error('Partner brand name is required')
      return
    }
    if (!cLogo.trim()) {
      toast.error('Please upload or provide a partner logo')
      return
    }

    const partnerData: Collaborator = {
      name: cName.trim(),
      role: cRole.trim() || 'Co-Host',
      logoUrl: cLogo.trim(),
      websiteUrl: cWeb.trim() || undefined,
    }

    if (editingCIndex !== null && collaborators[editingCIndex]) {
      const updated = [...collaborators]
      updated[editingCIndex] = partnerData
      onCollaboratorsChange(updated)
      setEditingCIndex(null)
      toast.success('Partner updated successfully!')
    } else {
      onCollaboratorsChange([...collaborators, partnerData])
      toast.success('Partner added successfully!')
    }

    setCName('')
    setCRole('')
    setCLogo('')
    setCWeb('')
    setShowCManualUrl(false)
  }

  const handleEditCollaborator = (index: number) => {
    const item = collaborators[index]
    if (!item) return
    setEditingCIndex(index)
    setCName(item.name || '')
    setCRole(item.role || '')
    setCLogo(item.logoUrl || '')
    setCWeb(item.websiteUrl || '')
    setShowCManualUrl(false)
  }

  const handleCancelEditCollaborator = () => {
    setEditingCIndex(null)
    setCName('')
    setCRole('')
    setCLogo('')
    setCWeb('')
    setShowCManualUrl(false)
  }

  const handleRemoveCollaborator = (index: number) => {
    const updated = [...collaborators]
    updated.splice(index, 1)
    onCollaboratorsChange(updated)
    if (editingCIndex === index) {
      handleCancelEditCollaborator()
    } else if (editingCIndex !== null && editingCIndex > index) {
      setEditingCIndex(editingCIndex - 1)
    }
  }

  const handleAddOrUpdateSponsor = () => {
    if (!sName.trim()) {
      toast.error('Sponsor name is required')
      return
    }
    if (!sLogo.trim()) {
      toast.error('Please upload or provide a sponsor logo')
      return
    }

    const sponsorData: Sponsor = {
      name: sName.trim(),
      logoUrl: sLogo.trim(),
      tier: sTier.trim() || 'Partner',
    }

    if (editingSIndex !== null && sponsors[editingSIndex]) {
      const updated = [...sponsors]
      updated[editingSIndex] = sponsorData
      onSponsorsChange(updated)
      setEditingSIndex(null)
      toast.success('Sponsor updated successfully!')
    } else {
      onSponsorsChange([...sponsors, sponsorData])
      toast.success('Sponsor added successfully!')
    }

    setSName('')
    setSLogo('')
    setSTier('')
    setShowSManualUrl(false)
  }

  const handleEditSponsor = (index: number) => {
    const item = sponsors[index]
    if (!item) return
    setEditingSIndex(index)
    setSName(item.name || '')
    setSLogo(item.logoUrl || '')
    setSTier(item.tier || '')
    setShowSManualUrl(false)
  }

  const handleCancelEditSponsor = () => {
    setEditingSIndex(null)
    setSName('')
    setSLogo('')
    setSTier('')
    setShowSManualUrl(false)
  }

  const handleRemoveSponsor = (index: number) => {
    const updated = [...sponsors]
    updated.splice(index, 1)
    onSponsorsChange(updated)
    if (editingSIndex === index) {
      handleCancelEditSponsor()
    } else if (editingSIndex !== null && editingSIndex > index) {
      setEditingSIndex(editingSIndex - 1)
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Collaborators / Co-Hosts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <IconBuildingStore className="h-5 w-5 text-blue-500" />
            Co-Hosts & Collaborating Brands ({collaborators.length})
          </CardTitle>
          <CardDescription>
            Display co-branded partnerships at the top of the event pass (e.g. Fitflix × Chapter 5 Coffee / GDG).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-muted/30 p-3.5 rounded-lg border">
            {/* 1. Brand Name */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Partner Brand Name *</Label>
              <Input
                placeholder="e.g. Chapter 5 Speciality Coffee"
                value={cName}
                onChange={(e) => setCName(e.target.value)}
                className="text-xs h-8"
              />
            </div>

            {/* 2. Role / Title */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Role / Title</Label>
              <Input
                placeholder="e.g. Co-Host & Nutrition Partner"
                value={cRole}
                onChange={(e) => setCRole(e.target.value)}
                className="text-xs h-8"
              />
            </div>

            {/* 3. Logo Image File Upload */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Partner Logo *</Label>
                <button
                  type="button"
                  onClick={() => setShowCManualUrl(!showCManualUrl)}
                  className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                >
                  <IconLink className="h-2.5 w-2.5" />
                  {showCManualUrl ? 'File Upload' : 'Paste URL'}
                </button>
              </div>

              <input
                type="file"
                ref={cFileInputRef}
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleCFileChange}
                className="hidden"
              />

              {showCManualUrl ? (
                <Input
                  placeholder="https://.../logo.png"
                  value={cLogo}
                  onChange={(e) => setCLogo(e.target.value)}
                  className="text-xs h-8"
                />
              ) : cLogo ? (
                <div className="flex items-center justify-between border rounded px-2 h-8 bg-background gap-2">
                  <div className="flex items-center gap-1.5 truncate">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={cLogo}
                      alt="Logo preview"
                      className="h-5 w-5 object-contain rounded shrink-0 bg-white p-0.5 border"
                    />
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium truncate flex items-center gap-1">
                      <IconCheck className="h-3 w-3" /> Logo Uploaded
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCLogo('')}
                    className="text-muted-foreground hover:text-destructive shrink-0"
                    title="Remove logo"
                  >
                    <IconX className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => cFileInputRef.current?.click()}
                  disabled={uploadingCLogo}
                  className="h-8 text-xs w-full gap-1.5 border-dashed border-primary/40 hover:border-primary hover:bg-primary/5"
                >
                  <IconUpload className="h-3.5 w-3.5 text-primary" />
                  {uploadingCLogo ? 'Uploading...' : 'Upload Logo File'}
                </Button>
              )}
            </div>

            {/* 4. Website & Add/Save Button */}
            <div className="space-y-1 flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs font-medium">Website (Optional)</Label>
                <Input
                  placeholder="https://..."
                  value={cWeb}
                  onChange={(e) => setCWeb(e.target.value)}
                  className="text-xs h-8"
                />
              </div>
              <div className="flex items-center gap-1.5">
                {editingCIndex !== null && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCancelEditCollaborator}
                    className="h-8 text-xs shrink-0"
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddOrUpdateCollaborator}
                  className="h-8 text-xs shrink-0 gap-1 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                >
                  {editingCIndex !== null ? (
                    <>
                      <IconCheck className="h-3.5 w-3.5" /> Save
                    </>
                  ) : (
                    <>
                      <IconPlus className="h-3.5 w-3.5" /> Add
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Collaborators List */}
          {collaborators.length === 0 ? (
            <div className="border border-dashed rounded-lg p-5 text-center text-xs text-muted-foreground">
              No co-hosts or collaborating brands added yet. Enter partner details above and click + Add to display co-branding on event passes.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {collaborators.map((c, idx) => (
                <div
                  key={idx}
                  className={`border rounded-lg p-3 flex items-center justify-between gap-3 bg-card shadow-sm transition-all ${
                    editingCIndex === idx ? 'ring-2 ring-primary border-primary' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded border bg-white p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={c.logoUrl}
                        alt={c.name}
                        className="max-h-full max-w-full object-contain"
                        onError={(e) => {
                          ;(e.target as HTMLElement).style.display = 'none'
                        }}
                      />
                    </div>
                    <div className="truncate">
                      <h5 className="font-semibold text-sm leading-tight truncate">{c.name}</h5>
                      <span className="text-xs text-muted-foreground block truncate">{c.role}</span>
                      {c.websiteUrl && (
                        <a
                          href={c.websiteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-primary hover:underline truncate block max-w-[200px]"
                        >
                          {c.websiteUrl}
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => handleEditCollaborator(idx)}
                      title="Edit partner"
                    >
                      <IconEdit className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemoveCollaborator(idx)}
                      title="Remove partner"
                    >
                      <IconTrash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Sponsors Strip (Event Pass bottom bar) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <IconShieldCheck className="h-5 w-5 text-amber-500" />
            Sponsors & Partners Strip ({sponsors.length})
          </CardTitle>
          <CardDescription>
            Sponsor logos printed along the bottom bar of official attendee event passes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-muted/30 p-3.5 rounded-lg border">
            {/* 1. Sponsor Name */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Sponsor Name *</Label>
              <Input
                placeholder="e.g. Red Bull / Orkes / Stream"
                value={sName}
                onChange={(e) => setSName(e.target.value)}
                className="text-xs h-8"
              />
            </div>

            {/* 2. Sponsor Logo File Upload */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Sponsor Logo *</Label>
                <button
                  type="button"
                  onClick={() => setShowSManualUrl(!showSManualUrl)}
                  className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                >
                  <IconLink className="h-2.5 w-2.5" />
                  {showSManualUrl ? 'File Upload' : 'Paste URL'}
                </button>
              </div>

              <input
                type="file"
                ref={sFileInputRef}
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleSFileChange}
                className="hidden"
              />

              {showSManualUrl ? (
                <Input
                  placeholder="https://.../sponsor-logo.png"
                  value={sLogo}
                  onChange={(e) => setSLogo(e.target.value)}
                  className="text-xs h-8"
                />
              ) : sLogo ? (
                <div className="flex items-center justify-between border rounded px-2 h-8 bg-background gap-2">
                  <div className="flex items-center gap-1.5 truncate">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={sLogo}
                      alt="Logo preview"
                      className="h-5 w-5 object-contain rounded shrink-0 bg-white p-0.5 border"
                    />
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium truncate flex items-center gap-1">
                      <IconCheck className="h-3 w-3" /> Logo Uploaded
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSLogo('')}
                    className="text-muted-foreground hover:text-destructive shrink-0"
                    title="Remove logo"
                  >
                    <IconX className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => sFileInputRef.current?.click()}
                  disabled={uploadingSLogo}
                  className="h-8 text-xs w-full gap-1.5 border-dashed border-amber-500/40 hover:border-amber-500 hover:bg-amber-500/5"
                >
                  <IconUpload className="h-3.5 w-3.5 text-amber-500" />
                  {uploadingSLogo ? 'Uploading...' : 'Upload Sponsor Logo'}
                </Button>
              )}
            </div>

            {/* 3. Sponsor Tier & Add/Save Button */}
            <div className="space-y-1 flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs font-medium">Sponsor Tier</Label>
                <Input
                  placeholder="e.g. Title / Hydration / Gold"
                  value={sTier}
                  onChange={(e) => setSTier(e.target.value)}
                  className="text-xs h-8"
                />
              </div>
              <div className="flex items-center gap-1.5">
                {editingSIndex !== null && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCancelEditSponsor}
                    className="h-8 text-xs shrink-0"
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddOrUpdateSponsor}
                  className="h-8 text-xs shrink-0 gap-1 bg-amber-600 hover:bg-amber-700 text-white font-medium"
                >
                  {editingSIndex !== null ? (
                    <>
                      <IconCheck className="h-3.5 w-3.5" /> Save
                    </>
                  ) : (
                    <>
                      <IconPlus className="h-3.5 w-3.5" /> Add
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Sponsors Strip Preview */}
          {sponsors.length === 0 ? (
            <div className="border border-dashed rounded-lg p-5 text-center text-xs text-muted-foreground">
              No sponsors configured yet. Add sponsor names and logos above to print them on the attendee pass footer bar.
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Pass Sponsor Strip Preview:</Label>
              <div className="p-3 border rounded-xl bg-card flex flex-wrap items-center gap-3">
                {sponsors.map((s, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-2 border bg-muted/20 px-2.5 py-1.5 rounded-md text-xs group transition-all ${
                      editingSIndex === idx ? 'ring-2 ring-amber-500 border-amber-500' : ''
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={s.logoUrl}
                      alt={s.name}
                      className="h-5 w-auto max-w-[60px] object-contain"
                      onError={(e) => {
                        ;(e.target as HTMLElement).style.display = 'none'
                      }}
                    />
                    <span className="font-medium text-foreground">{s.name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">({s.tier})</span>
                    <button
                      type="button"
                      onClick={() => handleEditSponsor(idx)}
                      className="text-muted-foreground hover:text-foreground ml-1"
                      title="Edit sponsor"
                    >
                      <IconEdit className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveSponsor(idx)}
                      className="text-muted-foreground hover:text-destructive"
                      title="Remove sponsor"
                    >
                      <IconX className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}