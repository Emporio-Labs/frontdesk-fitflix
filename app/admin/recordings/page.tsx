'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  IconVideo,
  IconSearch,
  IconEye,
  IconEyeOff,
  IconTrash,
  IconPlayerPlay,
  IconRefresh,
  IconDeviceTv,
  IconClock,
  IconUserCheck,
} from '@tabler/icons-react'
import { recordingService, type RecordingItem } from '@/lib/services/recording.service'
import { toast } from 'sonner'

export default function AdminRecordingsPage() {
  const [recordings, setRecordings] = useState<RecordingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'visible' | 'hidden'>('all')

  // Preview dialog state
  const [previewRecording, setPreviewRecording] = useState<RecordingItem | null>(null)

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<RecordingItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Toggle state tracker for optimistic UI
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const fetchRecordings = async () => {
    try {
      setLoading(true)
      const data = await recordingService.getAll()
      setRecordings(data.recordings || [])
    } catch (err) {
      console.error('Failed to load recordings:', err)
      toast.error('Failed to fetch livestream recordings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecordings()
  }, [])

  // FX-23.4: Hide or show recording. A hidden recording disappears from the app.
  const handleToggleVisibility = async (recording: RecordingItem) => {
    const nextHidden = !recording.isHidden
    setUpdatingId(recording._id)

    // Optimistic update
    setRecordings((prev) =>
      prev.map((r) => (r._id === recording._id ? { ...r, isHidden: nextHidden } : r))
    )

    try {
      const res = await recordingService.updateVisibility(recording._id, nextHidden)
      toast.success(
        nextHidden
          ? 'Recording hidden. It will no longer appear in the member app.'
          : 'Recording visible. Members can now view this replay in the app.'
      )
    } catch (err) {
      console.error('Failed to update visibility:', err)
      toast.error('Failed to update recording visibility')
      // Revert optimistic update
      setRecordings((prev) =>
        prev.map((r) => (r._id === recording._id ? { ...r, isHidden: recording.isHidden } : r))
      )
    } finally {
      setUpdatingId(null)
    }
  }

  // FX-23.4: Delete recording (soft delete)
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await recordingService.deleteRecording(deleteTarget._id)
      setRecordings((prev) => prev.filter((r) => r._id !== deleteTarget._id))
      toast.success('Recording deleted successfully and removed from member app')
      setDeleteTarget(null)
    } catch (err) {
      console.error('Failed to delete recording:', err)
      toast.error('Failed to delete recording')
    } finally {
      setIsDeleting(false)
    }
  }

  // Filtered recordings
  const filtered = useMemo(() => {
    return recordings.filter((r) => {
      const matchesSearch =
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.instructorName.toLowerCase().includes(searchQuery.toLowerCase())

      if (!matchesSearch) return false

      if (visibilityFilter === 'visible') return !r.isHidden
      if (visibilityFilter === 'hidden') return r.isHidden
      return true
    })
  }, [recordings, searchQuery, visibilityFilter])

  // Summary statistics
  const stats = useMemo(() => {
    const total = recordings.length
    const visible = recordings.filter((r) => !r.isHidden).length
    const hidden = recordings.filter((r) => r.isHidden).length
    const totalViews = recordings.reduce((acc, r) => acc + (r.viewsCount || 0), 0)
    return { total, visible, hidden, totalViews }
  }, [recordings])

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return '0 min'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60)
      const remainingMins = mins % 60
      return `${hrs}h ${remainingMins}m`
    }
    return secs > 0 ? `${mins}m ${secs}s` : `${mins} min`
  }

  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="flex-1 space-y-6 p-4 pt-4 sm:p-6 sm:pt-5 lg:p-8 lg:pt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-bold tracking-tight">Livestream Recordings & Replays</h2>
            <Badge variant="outline" className="border-primary/40 text-primary">
              Live Streams Only
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Manage recorded online broadcasts. Hide recordings to remove them from the member
            app, or delete outdated sessions.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchRecordings} disabled={loading} className="gap-2">
          <IconRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs uppercase font-medium">Total Recordings</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center justify-between">
              {stats.total}
              <IconVideo className="w-5 h-5 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs uppercase font-medium">Visible in App</CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600 flex items-center justify-between">
              {stats.visible}
              <IconEye className="w-5 h-5 text-emerald-500" />
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs uppercase font-medium">Hidden from App</CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-600 flex items-center justify-between">
              {stats.hidden}
              <IconEyeOff className="w-5 h-5 text-amber-500" />
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs uppercase font-medium">Total Replay Plays</CardDescription>
            <CardTitle className="text-2xl font-bold text-indigo-600 flex items-center justify-between">
              {stats.totalViews}
              <IconDeviceTv className="w-5 h-5 text-indigo-500" />
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card>
        <CardHeader className="p-4 pb-3">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by title or trainer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 self-start sm:self-auto bg-muted/60 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setVisibilityFilter('all')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  visibilityFilter === 'all'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All ({recordings.length})
              </button>
              <button
                type="button"
                onClick={() => setVisibilityFilter('visible')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  visibilityFilter === 'visible'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Visible ({stats.visible})
              </button>
              <button
                type="button"
                onClick={() => setVisibilityFilter('hidden')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  visibilityFilter === 'hidden'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Hidden ({stats.hidden})
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="font-semibold">Livestream Workout</TableHead>
                <TableHead className="font-semibold">Trainer</TableHead>
                <TableHead className="font-semibold">Recorded At</TableHead>
                <TableHead className="font-semibold">Duration</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">In-App Visibility</TableHead>
                <TableHead className="text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <IconRefresh className="w-6 h-6 animate-spin text-primary" />
                      <span>Loading recordings...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <IconVideo className="w-8 h-8 text-muted-foreground/60 mb-1" />
                      <p className="font-medium">No livestream recordings found</p>
                      <p className="text-xs">
                        Recordings are created automatically when trainers go live in online stream classes.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((recording) => (
                  <TableRow key={recording._id} className="hover:bg-muted/40 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                          <IconVideo className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-sm leading-tight">{recording.title}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span>Room: {recording.videoRoomId}</span>
                            <span>•</span>
                            <span>{recording.viewsCount || 0} views</span>
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm">
                        <IconUserCheck className="w-4 h-4 text-muted-foreground" />
                        <span>{recording.instructorName || 'Trainer'}</span>
                      </div>
                    </TableCell>

                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(recording.startedAt)}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1 text-sm font-medium">
                        <IconClock className="w-4 h-4 text-muted-foreground" />
                        {formatDuration(recording.durationSeconds)}
                      </div>
                    </TableCell>

                    <TableCell>
                      {recording.status === 'READY' && (
                        <Badge className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 border-emerald-500/30">
                          READY
                        </Badge>
                      )}
                      {recording.status === 'RECORDING' && (
                        <Badge className="bg-amber-500/10 text-amber-700 animate-pulse border-amber-500/30">
                          RECORDING
                        </Badge>
                      )}
                      {recording.status === 'PROCESSING' && (
                        <Badge className="bg-blue-500/10 text-blue-700 border-blue-500/30">
                          PROCESSING
                        </Badge>
                      )}
                      {recording.status === 'FAILED' && (
                        <Badge variant="destructive">FAILED</Badge>
                      )}
                    </TableCell>

                    {/* FX-23.4: In-app visibility toggle */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={!recording.isHidden}
                          disabled={updatingId === recording._id}
                          onCheckedChange={() => handleToggleVisibility(recording)}
                          aria-label="Toggle in-app visibility"
                        />
                        <span
                          className={`text-xs font-medium ${
                            recording.isHidden ? 'text-amber-600' : 'text-emerald-600'
                          }`}
                        >
                          {recording.isHidden ? 'Hidden' : 'Visible'}
                        </span>
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {recording.fileUrl && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                            onClick={() => setPreviewRecording(recording)}
                            title="Preview Recording"
                          >
                            <IconPlayerPlay className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteTarget(recording)}
                          title="Delete Recording"
                        >
                          <IconTrash className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Video Preview Modal */}
      <Dialog open={!!previewRecording} onOpenChange={(open) => !open && setPreviewRecording(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconPlayerPlay className="w-5 h-5 text-primary" />
              {previewRecording?.title}
            </DialogTitle>
            <DialogDescription>
              Host: {previewRecording?.instructorName} • Duration:{' '}
              {formatDuration(previewRecording?.durationSeconds || 0)}
            </DialogDescription>
          </DialogHeader>
          <div className="aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
            {previewRecording?.fileUrl ? (
              <video
                src={previewRecording.fileUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
              >
                Your browser does not support the video tag.
              </video>
            ) : (
              <p className="text-white text-sm">Video file URL not available</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this livestream recording?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.title}</strong>? This recording will
              be permanently removed from the member app and can no longer be replayed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete Recording'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
