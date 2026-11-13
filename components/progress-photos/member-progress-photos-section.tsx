'use client'

import { useState } from 'react'
import {
  IconCamera,
  IconGitCompare,
  IconLock,
  IconMaximize,
  IconScale,
} from '@tabler/icons-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { EmptyState } from '@/components/empty-state'
import { Skeleton } from '@/components/skeleton-loader'
import { useMemberProgressPhotos } from '@/hooks/use-progress-photos'
import { CoachPhotoComparisonDialog } from './coach-photo-comparison-dialog'
import type { PhotoPose, ProgressCheckInGroup, ProgressPhoto } from '@/types/progress-photo'

interface MemberProgressPhotosSectionProps {
  userId: string
  memberName: string
}

export function MemberProgressPhotosSection({
  userId,
  memberName,
}: MemberProgressPhotosSectionProps) {
  const { data, isLoading, isError } = useMemberProgressPhotos(userId)
  const [comparisonOpen, setComparisonOpen] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<ProgressPhoto | null>(null)

  const checkIns = data?.checkIns ?? []
  const hasMultipleCheckIns = checkIns.length >= 2

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <IconCamera className="h-4 w-4 text-muted-foreground" />
                <span>Progress Photos (Front / Side / Back)</span>
              </CardTitle>
              <CardDescription className="flex items-center gap-1.5 mt-0.5">
                <IconLock className="w-3.5 h-3.5 text-amber-500" />
                <span>Private health tracking — visible to assigned trainer & nutritionist</span>
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              {checkIns.length > 0 && (
                <Badge variant="outline">
                  {checkIns.length} check-in{checkIns.length === 1 ? '' : 's'}
                </Badge>
              )}
              {hasMultipleCheckIns && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setComparisonOpen(true)}
                  className="h-8 gap-1.5"
                >
                  <IconGitCompare className="w-3.5 h-3.5" />
                  <span>Compare Poses</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-44 w-full rounded-lg" />
              <Skeleton className="h-44 w-full rounded-lg" />
            </div>
          )}

          {isError && (
            <p className="text-sm text-destructive">
              Failed to load progress photos. Please verify your permissions.
            </p>
          )}

          {!isLoading && !isError && checkIns.length === 0 && (
            <EmptyState
              icon={<IconCamera className="h-10 w-10" />}
              title="No progress photos yet"
              description={`${memberName} has not uploaded any 3-pose check-ins yet.`}
            />
          )}

          {!isLoading && !isError && checkIns.length > 0 && (
            <div className="space-y-4">
              {checkIns.map((checkIn) => (
                <div
                  key={checkIn.date}
                  className="rounded-lg border p-4 space-y-3 bg-muted/20"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{checkIn.date}</span>
                      {checkIn.notes && (
                        <span className="text-xs text-muted-foreground italic truncate max-w-xs">
                          "{checkIn.notes}"
                        </span>
                      )}
                    </div>
                    {checkIn.weightKg && (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <IconScale className="w-3 h-3" />
                        <span>{checkIn.weightKg} kg</span>
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {(['front', 'side', 'back'] as PhotoPose[]).map((pose) => {
                      const photo = checkIn.poses[pose]
                      return (
                        <div
                          key={pose}
                          className="relative aspect-[3/4] rounded-md overflow-hidden bg-neutral-900 border border-neutral-800 group"
                        >
                          {photo?.thumbnailUrl ? (
                            <>
                              <img
                                src={photo.thumbnailUrl}
                                alt={`${pose} pose`}
                                className="w-full h-full object-cover cursor-pointer transition-transform duration-200 group-hover:scale-105"
                                onClick={() => setSelectedPhoto(photo)}
                              />
                              <button
                                type="button"
                                className="absolute top-1.5 right-1.5 p-1 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => setSelectedPhoto(photo)}
                                title="Enlarge photo"
                              >
                                <IconMaximize className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[11px] text-neutral-500 capitalize">
                              No {pose}
                            </div>
                          )}
                          <div className="absolute bottom-1.5 left-1.5 bg-black/70 px-1.5 py-0.5 rounded text-[10px] text-white font-medium capitalize">
                            {pose}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comparison Modal */}
      {hasMultipleCheckIns && (
        <CoachPhotoComparisonDialog
          open={comparisonOpen}
          onOpenChange={setComparisonOpen}
          memberName={memberName}
          checkIns={checkIns}
        />
      )}

      {/* Single Photo Viewer Modal */}
      <Dialog open={!!selectedPhoto} onOpenChange={(open) => !open && setSelectedPhoto(null)}>
        <DialogContent className="max-w-2xl bg-neutral-950 p-4 border-neutral-800">
          {selectedPhoto && (
            <div className="flex flex-col items-center">
              <img
                src={selectedPhoto.url}
                alt={`${selectedPhoto.pose} view`}
                className="max-h-[75vh] w-auto object-contain rounded"
              />
              <div className="mt-3 text-center text-xs text-neutral-400">
                <span className="font-semibold text-white capitalize">{selectedPhoto.pose} Pose</span>
                <span> • {new Date(selectedPhoto.recordedDate).toLocaleDateString()}</span>
                {selectedPhoto.weightKg && <span> • {selectedPhoto.weightKg} kg</span>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
