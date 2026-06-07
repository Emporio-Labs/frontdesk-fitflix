'use client'

import { useEffect, useState } from 'react'
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
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { IconChevronDown, IconCheck } from '@tabler/icons-react'

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
  const [openMemberPopover, setOpenMemberPopover] = useState(false)

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
              render={({ field }) => {
                const selectedUser = users.find((u) => u._id === field.value)
                return (
                  <FormItem className="flex flex-col">
                    <FormLabel>Member *</FormLabel>
                    <Popover open={openMemberPopover} onOpenChange={setOpenMemberPopover}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              'w-full justify-between font-normal text-left h-10',
                              !field.value && 'text-muted-foreground'
                            )}
                            disabled={!!userId}
                          >
                            <span className="truncate">
                              {selectedUser
                                ? `${selectedUser.username || ''} (${selectedUser.email || ''})`
                                : 'Select member'}
                            </span>
                            <IconChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        <Command
                          filter={(itemValue, search) =>
                            itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
                          }
                        >
                          <CommandInput placeholder="Search member..." />
                          <CommandList>
                            <CommandEmpty>No member found.</CommandEmpty>
                            <CommandGroup>
                              {users.map((u) => {
                                const searchValue = `${u.username || ''} ${u.email || ''}`
                                return (
                                  <CommandItem
                                    key={u._id}
                                    value={searchValue}
                                    onSelect={() => {
                                      field.onChange(u._id)
                                      setOpenMemberPopover(false)
                                    }}
                                  >
                                    <IconCheck
                                      className={cn(
                                        'mr-2 h-4 w-4 shrink-0',
                                        field.value === u._id ? 'opacity-100' : 'opacity-0'
                                      )}
                                    />
                                    <div className="flex flex-col min-w-0">
                                      <span className="truncate">{u.username || ''}</span>
                                      {u.email && (
                                        <span className="truncate text-xs text-muted-foreground">
                                          {u.email}
                                        </span>
                                      )}
                                    </div>
                                  </CommandItem>
                                )
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )
              }}
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
