'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { IconArrowRight, IconLock, IconMaximize } from '@tabler/icons-react'
import type { PhotoPose, ProgressCheckInGroup } from '@/types/progress-photo'

interface CoachPhotoComparisonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  memberName: string
  checkIns: ProgressCheckInGroup[]
  initialDateA?: string
  initialDateB?: string
}

export function CoachPhotoComparisonDialog({
  open,
  onOpenChange,
  memberName,
  checkIns,
  initialDateA,
  initialDateB,
}: CoachPhotoComparisonDialogProps) {
  const [dateA, setDateA] = useState<string>(
    initialDateA || checkIns[checkIns.length - 1]?.date || '',
  )
  const [dateB, setDateB] = useState<string>(
    initialDateB || checkIns[0]?.date || '',
  )
  const [selectedPose, setSelectedPose] = useState<PhotoPose>('front')

  const checkInA = checkIns.find((c) => c.date === dateA) || checkIns[checkIns.length - 1]
  const checkInB = checkIns.find((c) => c.date === dateB) || checkIns[0]

  const photoA = checkInA?.poses[selectedPose]
  const photoB = checkInB?.poses[selectedPose]

  const deltaWeight =
    checkInA?.weightKg && checkInB?.weightKg
      ? (checkInB.weightKg - checkInA.weightKg).toFixed(1)
      : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-6">
        <DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-xl">
                Compare Progress Poses — {memberName}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-1.5 mt-1 text-xs">
                <IconLock className="w-3.5 h-3.5 text-amber-500" />
                <span>Protected member health record. Clinical review only.</span>
              </DialogDescription>
            </div>
            {deltaWeight && (
              <Badge variant="outline" className="text-xs px-2.5 py-1">
                Weight change: {Number(deltaWeight) > 0 ? `+${deltaWeight}` : deltaWeight} kg
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 py-2 border-y my-2">
          {/* Date Pickers */}
          <div className="flex items-center gap-2">
            <div className="w-44">
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                Before Date
              </label>
              <Select value={dateA} onValueChange={setDateA}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select before date" />
                </SelectTrigger>
                <SelectContent>
                  {checkIns.map((c) => (
                    <SelectItem key={`a-${c.date}`} value={c.date} className="text-xs">
                      {c.date} {c.weightKg ? `(${c.weightKg} kg)` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <IconArrowRight className="w-4 h-4 text-muted-foreground mt-4" />

            <div className="w-44">
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                After Date
              </label>
              <Select value={dateB} onValueChange={setDateB}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select after date" />
                </SelectTrigger>
                <SelectContent>
                  {checkIns.map((c) => (
                    <SelectItem key={`b-${c.date}`} value={c.date} className="text-xs">
                      {c.date} {c.weightKg ? `(${c.weightKg} kg)` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Pose Selector */}
          <div className="flex items-center gap-1 bg-muted p-1 rounded-md">
            {(['front', 'side', 'back'] as PhotoPose[]).map((pose) => (
              <Button
                key={pose}
                type="button"
                variant={selectedPose === pose ? 'default' : 'ghost'}
                size="sm"
                className="h-7 text-xs capitalize px-3"
                onPointerDown={(e) => {
                  e.preventDefault()
                  setSelectedPose(pose)
                }}
              >
                {pose}
              </Button>
            ))}
          </div>
        </div>

        {/* Side-by-Side Images */}
        <div className="flex-1 grid grid-cols-2 gap-4 min-h-[380px] overflow-hidden rounded-lg bg-neutral-950 p-3">
          {/* Before Column */}
          <div className="flex flex-col items-center justify-center relative rounded-md overflow-hidden bg-neutral-900 border border-neutral-800">
            {photoA?.url ? (
              <img
                src={photoA.url}
                alt={`Before ${selectedPose}`}
                className="max-h-[360px] w-auto object-contain"
              />
            ) : (
              <p className="text-xs text-neutral-400">No {selectedPose} photo for {dateA}</p>
            )}
            <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded text-[11px] text-white font-medium">
              Before: {dateA} {checkInA?.weightKg ? `• ${checkInA.weightKg} kg` : ''}
            </div>
          </div>

          {/* After Column */}
          <div className="flex flex-col items-center justify-center relative rounded-md overflow-hidden bg-neutral-900 border border-neutral-800">
            {photoB?.url ? (
              <img
                src={photoB.url}
                alt={`After ${selectedPose}`}
                className="max-h-[360px] w-auto object-contain"
              />
            ) : (
              <p className="text-xs text-neutral-400">No {selectedPose} photo for {dateB}</p>
            )}
            <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded text-[11px] text-white font-medium">
              After: {dateB} {checkInB?.weightKg ? `• ${checkInB.weightKg} kg` : ''}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
