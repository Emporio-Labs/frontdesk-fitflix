'use client'

import { useState } from 'react'
import {
  IconPlus,
  IconBuildingStore,
  IconTrash,
  IconSparkles,
  IconWorld,
  IconShieldCheck,
} from '@tabler/icons-react'
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
import type { Collaborator, Sponsor } from '@/lib/services/event.service'

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
  // New Collaborator Input state
  const [cName, setCName] = useState('')
  const [cRole, setCRole] = useState('Co-Host & Nutrition Partner')
  const [cLogo, setCLogo] = useState('')
  const [cWeb, setCWeb] = useState('')

  // New Sponsor Input state
  const [sName, setSName] = useState('')
  const [sLogo, setSLogo] = useState('')
  const [sTier, setSTier] = useState('Partner')

  const handleAddCollaborator = () => {
    if (!cName.trim() || !cLogo.trim()) return
    onCollaboratorsChange([
      ...collaborators,
      {
        name: cName.trim(),
        role: cRole.trim() || 'Co-Host',
        logoUrl: cLogo.trim(),
        websiteUrl: cWeb.trim() || undefined,
      },
    ])
    setCName('')
    setCLogo('')
    setCWeb('')
  }

  const handleRemoveCollaborator = (index: number) => {
    const updated = [...collaborators]
    updated.splice(index, 1)
    onCollaboratorsChange(updated)
  }

  const handleAddSponsor = () => {
    if (!sName.trim() || !sLogo.trim()) return
    onSponsorsChange([
      ...sponsors,
      {
        name: sName.trim(),
        logoUrl: sLogo.trim(),
        tier: sTier.trim() || 'Partner',
      },
    ])
    setSName('')
    setSLogo('')
  }

  const handleRemoveSponsor = (index: number) => {
    const updated = [...sponsors]
    updated.splice(index, 1)
    onSponsorsChange(updated)
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-muted/30 p-3 rounded-lg border">
            <div className="space-y-1">
              <Label className="text-xs">Partner Brand Name *</Label>
              <Input
                placeholder="e.g. Chapter 5 Speciality Coffee"
                value={cName}
                onChange={(e) => setCName(e.target.value)}
                className="text-xs h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Role / Title</Label>
              <Input
                placeholder="e.g. Co-Host & Nutrition Partner"
                value={cRole}
                onChange={(e) => setCRole(e.target.value)}
                className="text-xs h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Logo Image URL *</Label>
              <Input
                placeholder="https://.../logo.png"
                value={cLogo}
                onChange={(e) => setCLogo(e.target.value)}
                className="text-xs h-8"
              />
            </div>
            <div className="space-y-1 flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Website (Optional)</Label>
                <Input
                  placeholder="https://..."
                  value={cWeb}
                  onChange={(e) => setCWeb(e.target.value)}
                  className="text-xs h-8"
                />
              </div>
              <Button
                type="button"
                size="sm"
                onClick={handleAddCollaborator}
                className="h-8 text-xs shrink-0"
              >
                <IconPlus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </div>
          </div>

          {/* Collaborators List */}
          {collaborators.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {collaborators.map((c, idx) => (
                <div
                  key={idx}
                  className="border rounded-lg p-3 flex items-center justify-between gap-3 bg-card shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded border bg-white p-1 flex items-center justify-center shrink-0 overflow-hidden">
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
                    <div>
                      <h5 className="font-semibold text-sm leading-tight">{c.name}</h5>
                      <span className="text-xs text-muted-foreground block">{c.role}</span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveCollaborator(idx)}
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  >
                    <IconTrash className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Sponsors Strip (DevFest style bottom bar) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <IconShieldCheck className="h-5 w-5 text-amber-500" />
            Sponsors & Partners Strip ({sponsors.length})
          </CardTitle>
          <CardDescription>
            Sponsor logos printed along the bottom bar of DevFest-style attendee passes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-muted/30 p-3 rounded-lg border">
            <div className="space-y-1">
              <Label className="text-xs">Sponsor Name *</Label>
              <Input
                placeholder="e.g. Red Bull / Orkes / Stream"
                value={sName}
                onChange={(e) => setSName(e.target.value)}
                className="text-xs h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Logo Image URL *</Label>
              <Input
                placeholder="https://.../sponsor-logo.png"
                value={sLogo}
                onChange={(e) => setSLogo(e.target.value)}
                className="text-xs h-8"
              />
            </div>
            <div className="space-y-1 flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Sponsor Tier</Label>
                <Input
                  placeholder="e.g. Title / Hydration / Gold"
                  value={sTier}
                  onChange={(e) => setSTier(e.target.value)}
                  className="text-xs h-8"
                />
              </div>
              <Button
                type="button"
                size="sm"
                onClick={handleAddSponsor}
                className="h-8 text-xs shrink-0"
              >
                <IconPlus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </div>
          </div>

          {/* Sponsors Strip Preview */}
          {sponsors.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Pass Sponsor Strip Preview:</Label>
              <div className="p-3 border rounded-xl bg-card flex flex-wrap items-center gap-4">
                {sponsors.map((s, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 border bg-muted/20 px-2.5 py-1.5 rounded-md text-xs group"
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
                      onClick={() => handleRemoveSponsor(idx)}
                      className="text-muted-foreground hover:text-destructive ml-1"
                    >
                      ×
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
