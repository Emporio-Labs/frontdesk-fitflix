'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { IconLoader2, IconSearch } from '@tabler/icons-react'
import { useUsers } from '@/hooks/use-users'
import { useMyMembers } from '@/hooks/use-my-members'
import { useAuth } from '@/hooks/use-auth'
import { useAssignWorkoutPlan } from '@/hooks/use-workout-plans'
import type { WorkoutPlan } from '@/types/workout'

const todayIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Assign one template to several members at once (from the Templates page).
 * Selection is local state — unlike AssignUsersDialog, it never touches the
 * plan builder's store.
 */
export function AssignTemplateDialog({
  plan,
  onOpenChange,
}: {
  plan: WorkoutPlan | null
  onOpenChange: (open: boolean) => void
}) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [startDate, setStartDate] = useState(todayIso)

  const { user: currentUser } = useAuth()
  const isTrainer = currentUser?.role === 'trainer'
  const { data: allUsers = [], isLoading: allLoading } = useUsers()
  const { data: myMembers = [], isLoading: mineLoading } = useMyMembers()
  const members: any[] = isTrainer ? myMembers : allUsers
  const isLoading = isTrainer ? mineLoading : allLoading

  const assignMutation = useAssignWorkoutPlan()

  const term = search.trim().toLowerCase()
  const filtered = members.filter(
    (u) =>
      !term ||
      (u.username || u.name || '').toLowerCase().includes(term) ||
      (u.email || '').toLowerCase().includes(term) ||
      (u.phone || '').includes(term)
  )

  const close = () => {
    onOpenChange(false)
    setSelected([])
    setSearch('')
    setStartDate(todayIso())
  }

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const handleAssign = async () => {
    if (!plan || selected.length === 0) return
    try {
      await assignMutation.mutateAsync({
        id: plan._id,
        payload: { userIds: selected, startDate: new Date(startDate).toISOString() },
      })
      close()
    } catch {
      // toast shown by the hook
    }
  }

  return (
    <Dialog open={!!plan} onOpenChange={(open) => (open ? onOpenChange(true) : close())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign &ldquo;{plan?.name}&rdquo;</DialogTitle>
          <DialogDescription>
            Each member gets their own copy starting on the date below. A member already on another
            plan is switched to this one.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="template-assign-start" className="text-xs">
            Start date
          </Label>
          <Input
            id="template-assign-start"
            type="date"
            min={todayIso()}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div className="relative">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search members by name, email or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="h-[260px] -mx-2 px-2">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No members found</p>
          ) : (
            <div className="space-y-1">
              {filtered.map((u) => (
                <label
                  key={u._id}
                  className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-muted/50"
                >
                  <Checkbox checked={selected.includes(u._id)} onCheckedChange={() => toggle(u._id)} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{u.username || u.name || 'Unnamed member'}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email || u.phone}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="flex-row items-center justify-between sm:justify-between">
          <span className="text-xs text-muted-foreground">{selected.length} selected</span>
          <Button onClick={handleAssign} disabled={selected.length === 0 || assignMutation.isPending}>
            {assignMutation.isPending && <IconLoader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
