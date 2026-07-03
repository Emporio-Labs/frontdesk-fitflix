'use client'

import { useMemo, useState } from 'react'
import { IconCheck, IconChevronDown } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export interface MemberOption {
  _id: string
  username: string
  email?: string
}

// Searchable member picker — replaces plain <Select> dropdowns that rendered
// every user in one unsearchable list (Bookings, Appointments, Credits).
export function MemberCombobox({
  members,
  value,
  onChange,
  placeholder = 'Select member',
  disabled = false,
  triggerClassName,
}: {
  members: MemberOption[]
  value: string
  onChange: (memberId: string) => void
  placeholder?: string
  disabled?: boolean
  triggerClassName?: string
}) {
  const [open, setOpen] = useState(false)

  const selected = useMemo(
    () => members.find((m) => m._id === value),
    [members, value]
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('w-full justify-between font-normal', triggerClassName)}
        >
          <span className={cn('truncate', !selected && 'text-muted-foreground')}>
            {selected ? selected.username : placeholder}
          </span>
          <IconChevronDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command
          filter={(itemValue, search) =>
            itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
          }
        >
          <CommandInput placeholder="Search by name or email..." />
          <CommandList>
            <CommandEmpty>No members found.</CommandEmpty>
            <CommandGroup>
              {members.map((member) => (
                <CommandItem
                  key={member._id}
                  value={`${member.username} ${member.email ?? ''}`}
                  onSelect={() => {
                    onChange(member._id === value ? '' : member._id)
                    setOpen(false)
                  }}
                >
                  <IconCheck
                    className={cn(
                      'mr-2 h-4 w-4',
                      member._id === value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm">{member.username}</p>
                    {member.email && (
                      <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
