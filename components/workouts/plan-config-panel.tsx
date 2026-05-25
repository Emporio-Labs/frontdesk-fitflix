'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { IconUsers } from '@tabler/icons-react'
import { useWorkoutStore } from '@/stores/workout-store'
import { DIFFICULTIES, PLAN_GOALS, SPLIT_TYPES } from '@/types/workout'
import type { Difficulty, PlanGoal, SplitType, PlanStatus } from '@/types/workout'

export function PlanConfigPanel({
  onOpenAssign,
}: {
  onOpenAssign: () => void
}) {
  const { currentPlan, setPlanField, assignedUserIds } = useWorkoutStore()

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="plan-name" className="text-xs">Plan Name</Label>
          <Input
            id="plan-name"
            placeholder="e.g. 12-Week Strength Builder"
            value={currentPlan.name || ''}
            onChange={(e) => setPlanField('name', e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="plan-desc" className="text-xs">Description</Label>
          <Textarea
            id="plan-desc"
            placeholder="Plan overview and goals..."
            value={currentPlan.description || ''}
            onChange={(e) => setPlanField('description', e.target.value)}
            rows={3}
          />
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Difficulty</Label>
            <Select
              value={currentPlan.difficulty}
              onValueChange={(v) => setPlanField('difficulty', v as Difficulty)}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIFFICULTIES.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Duration (weeks)</Label>
            <Input
              type="number"
              min={1}
              max={52}
              value={currentPlan.duration || 4}
              onChange={(e) => setPlanField('duration', Number(e.target.value) || 1)}
              className="h-9 text-xs"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Goal</Label>
          <Select
            value={currentPlan.goal}
            onValueChange={(v) => setPlanField('goal', v as PlanGoal)}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLAN_GOALS.map((g) => (
                <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Split Type</Label>
          <Select
            value={currentPlan.splitType}
            onValueChange={(v) => setPlanField('splitType', v as SplitType)}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SPLIT_TYPES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Status</Label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {currentPlan.status === 'Published' ? 'Active' : 'Draft'}
              </span>
              <Switch
                checked={currentPlan.status === 'Published'}
                onCheckedChange={(checked) =>
                  setPlanField('status', (checked ? 'Published' : 'Draft') as PlanStatus)
                }
                className="scale-90"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs">Save as Template</Label>
            <Switch
              checked={currentPlan.isTemplate || false}
              onCheckedChange={(checked) => setPlanField('isTemplate', checked)}
              className="scale-90"
            />
          </div>
        </div>

        <Separator />

        <Button
          variant="outline"
          className="w-full justify-start text-xs"
          onClick={onOpenAssign}
        >
          <IconUsers className="w-4 h-4 mr-2" />
          Assign Users
          {assignedUserIds.length > 0 && (
            <span className="ml-auto text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
              {assignedUserIds.length}
            </span>
          )}
        </Button>
      </div>
    </ScrollArea>
  )
}
