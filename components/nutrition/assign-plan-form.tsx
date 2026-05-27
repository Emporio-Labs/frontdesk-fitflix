'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { assignPlanSchema, type AssignPlanFormValues } from '@/lib/types/nutrition'
import { useAssignPlan, useNutritionTemplates } from '@/hooks/use-nutrition'
import { useUsers } from '@/hooks/use-users'

interface AssignPlanFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pre-select a member (e.g. when opened from a member page) */
  userId?: string
}

export function AssignPlanForm({ open, onOpenChange, userId }: AssignPlanFormProps) {
  const { data: users = [] } = useUsers()
  const { data: dietPlans = [] } = useNutritionTemplates()
  const assignPlan = useAssignPlan()

  const form = useForm<AssignPlanFormValues>({
    resolver: zodResolver(assignPlanSchema),
    defaultValues: {
      userId: userId ?? '',
      planId: '',
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        userId: userId ?? '',
        planId: '',
      })
    }
  }, [open, userId, form])

  const onSubmit = async (values: AssignPlanFormValues) => {
    await assignPlan.mutateAsync({
      userId: values.userId,
      planId: values.planId,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Nutrition Plan</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Member *</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={!!userId}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select member" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u._id} value={u._id}>
                          {u.username} ({u.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="planId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Diet Plan *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select diet plan" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {dietPlans.map((p) => (
                        <SelectItem key={p._id} value={p._id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-2 pt-2 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={assignPlan.isPending}>
                {assignPlan.isPending ? 'Assigning…' : 'Assign Plan'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
