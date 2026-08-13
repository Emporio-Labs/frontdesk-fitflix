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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  IconCalendar,
  IconCheck,
  IconBookmark,
  IconSearch,
  IconLoader2,
  IconDumbbell,
} from '@tabler/icons-react'
import {
  useWorkoutPlans,
  useCreateWorkoutPlan,
  useAssignWorkoutPlan,
} from '@/hooks/use-workout-plans'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'

export function AssignOrCreatePlanModal({
  open,
  onOpenChange,
  userId,
  memberName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  memberName?: string
}) {
  const qc = useQueryClient()
  const todayStr = new Date().toISOString().split('T')[0]
  const [startDate, setStartDate] = useState(todayStr)
  const [activeTab, setActiveTab] = useState<'catalog' | 'custom'>('catalog')
  const [search, setSearch] = useState('')

  // Custom Plan Form State
  const [customName, setCustomName] = useState('')
  const [customGoal, setCustomGoal] = useState('Custom')
  const [customDifficulty, setCustomDifficulty] = useState('Intermediate')
  const [customDuration, setCustomDuration] = useState(4)
  const [customDaysCount, setCustomDaysCount] = useState<number>(7)

  const { data: plansData, isLoading: plansLoading } = useWorkoutPlans({ status: 'Active' })
  const templates = plansData?.plans ?? []

  const createMutation = useCreateWorkoutPlan()
  const assignMutation = useAssignWorkoutPlan()

  const isSubmitting = createMutation.isPending || assignMutation.isPending

  const filteredTemplates = templates.filter((t) => {
    const term = search.toLowerCase()
    return (
      (t.name || '').toLowerCase().includes(term) ||
      (t.goal || '').toLowerCase().includes(term) ||
      (t.difficulty || '').toLowerCase().includes(term)
    )
  })

  // Handle assigning an existing catalog plan
  const handleAssignExisting = async (planId: string) => {
    if (!startDate) {
      toast.error('Please select a start date')
      return
    }
    try {
      await assignMutation.mutateAsync({
        id: planId,
        payload: {
          userIds: [userId],
          startDate: new Date(startDate).toISOString(),
        },
      })
      qc.invalidateQueries({ queryKey: ['user-assignment', userId] })
      toast.success(`Assigned plan to ${memberName || 'member'} starting ${startDate}`)
      onOpenChange(false)
    } catch {
      // toast shown by hook
    }
  }

  // Handle creating a custom plan and assigning it
  const handleCreateAndAssign = async (isTemplate: boolean) => {
    const nameToUse = customName.trim() || `${memberName || 'Member'}'s Workout Program`
    if (!startDate) {
      toast.error('Please select a start date')
      return
    }

    try {
      const numDays = Math.max(1, Math.min(365, Number(customDaysCount) || 7))
      const defaultDays = Array.from({ length: numDays }).map((_, idx) => ({
        dayNumber: idx + 1,
        name: `Day ${idx + 1}`,
        isRestDay: false,
        exercises: [],
      }))

      const createdPlan = await createMutation.mutateAsync({
        name: nameToUse,
        description: `Prescribed workout program for ${memberName || 'member'}`,
        goal: customGoal,
        difficulty: customDifficulty,
        duration: Number(customDuration) || 4,
        status: 'Active',
        isTemplate,
        days: defaultDays,
      })

      const planId = (createdPlan as any)?._id || (createdPlan as any)?.id
      if (planId) {
        await assignMutation.mutateAsync({
          id: planId,
          payload: {
            userIds: [userId],
            startDate: new Date(startDate).toISOString(),
          },
        })
      }

      qc.invalidateQueries({ queryKey: ['user-assignment', userId] })
      toast.success(
        isTemplate
          ? `Saved to templates & assigned to ${memberName || 'member'}!`
          : `Custom plan assigned to ${memberName || 'member'}!`
      )
      onOpenChange(false)
    } catch {
      // toast shown by hook
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <IconDumbbell className="w-5 h-5 text-emerald-600" />
            Assign or Create Workout Plan
          </DialogTitle>
          <DialogDescription>
            Select a start date starting today or in the future to assign a plan to {memberName || 'this member'}.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 flex flex-col gap-6 flex-1 overflow-y-auto">
          {/* Start Date Picker */}
          <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5 mb-1">
                <IconCalendar className="w-4 h-4 text-emerald-600" />
                Program Start Date
              </Label>
              <p className="text-xs text-muted-foreground">
                Day 1 exercises will be scheduled starting on this date.
              </p>
            </div>
            <Input
              type="date"
              min={todayStr}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full sm:w-48 font-medium border-emerald-500/30 focus-visible:ring-emerald-500"
            />
          </div>

          {/* Main Action Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4 bg-muted/60 p-1 rounded-xl">
              <TabsTrigger value="catalog" className="text-xs font-semibold rounded-lg">
                Choose Existing Template
              </TabsTrigger>
              <TabsTrigger value="custom" className="text-xs font-semibold rounded-lg">
                Build Custom Plan
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: CATALOG TEMPLATES */}
            <TabsContent value="catalog" className="space-y-4 m-0">
              <div className="relative">
                <IconSearch className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search templates by name, goal, difficulty..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 text-xs"
                />
              </div>

              <ScrollArea className="h-[280px] pr-3">
                {plansLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full rounded-xl" />
                    ))}
                  </div>
                ) : filteredTemplates.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-xs">
                    No workout templates found. Build a custom plan in the next tab!
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {filteredTemplates.map((t) => (
                      <div
                        key={t._id || t.id}
                        className="flex items-center justify-between p-3.5 rounded-xl border bg-card hover:bg-muted/40 transition-colors"
                      >
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-foreground">{t.name}</h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-[10px] py-0">
                              {t.goal || 'Custom'}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px] py-0">
                              {t.difficulty || 'Intermediate'}
                            </Badge>
                            <span>•</span>
                            <span>{t.duration || 4} Weeks</span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          disabled={isSubmitting}
                          onClick={() => handleAssignExisting(t._id || t.id!)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 text-xs font-semibold"
                        >
                          {assignMutation.isPending ? (
                            <IconLoader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                          ) : (
                            <IconCheck className="w-3.5 h-3.5 mr-1" />
                          )}
                          Assign
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* TAB 2: BUILD CUSTOM PLAN */}
            <TabsContent value="custom" className="space-y-4 m-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-bold">Plan Name</Label>
                  <Input
                    placeholder={`e.g., ${memberName || 'Member'}'s Strength & Power Phase`}
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Goal</Label>
                  <Select value={customGoal} onValueChange={setCustomGoal}>
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue placeholder="Select Goal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Custom">Custom</SelectItem>
                      <SelectItem value="Strength">Strength</SelectItem>
                      <SelectItem value="Hypertrophy">Hypertrophy</SelectItem>
                      <SelectItem value="Fat Loss">Fat Loss</SelectItem>
                      <SelectItem value="Endurance">Endurance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Difficulty</Label>
                  <Select value={customDifficulty} onValueChange={setCustomDifficulty}>
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue placeholder="Select Difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Beginner">Beginner</SelectItem>
                      <SelectItem value="Intermediate">Intermediate</SelectItem>
                      <SelectItem value="Advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Program Duration (Weeks)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={52}
                    value={customDuration}
                    onChange={(e) => setCustomDuration(Number(e.target.value))}
                    className="text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">Total length of the program lifecycle.</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Initial Scheduled Days</Label>
                  <Select
                    value={String(customDaysCount)}
                    onValueChange={(val) => setCustomDaysCount(Number(val))}
                  >
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue placeholder="Select Days" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4">4 Days (4-Day Split)</SelectItem>
                      <SelectItem value="7">7 Days (1 Week Split)</SelectItem>
                      <SelectItem value="14">14 Days (2 Week Schedule)</SelectItem>
                      <SelectItem value="28">28 Days (Full 4-Week Days)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">Days created initially (can add more anytime).</p>
                </div>
              </div>

              <div className="pt-2 border-t flex flex-col sm:flex-row items-center justify-end gap-2">
                <Button
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => handleCreateAndAssign(false)}
                  className="w-full sm:w-auto text-xs font-semibold"
                >
                  {isSubmitting ? (
                    <IconLoader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  ) : (
                    <IconCheck className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                  )}
                  Assign Directly
                </Button>

                <Button
                  disabled={isSubmitting}
                  onClick={() => handleCreateAndAssign(true)}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                >
                  {isSubmitting ? (
                    <IconLoader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  ) : (
                    <IconBookmark className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  Save as Template & Assign
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
