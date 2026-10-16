'use client'

import React, { useState, useMemo, useRef, useEffect } from 'react'
import { useUsers } from '@/hooks/use-users'
import type { User } from '@/lib/services/user.service'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { IconSearch, IconX, IconUser, IconCheck } from '@tabler/icons-react'

interface MemberSearchSelectProps {
  value: string
  onChange: (memberId: string, member?: User) => void
  placeholder?: string
  className?: string
  required?: boolean
}

export function MemberSearchSelect({
  value,
  onChange,
  placeholder = 'Search member by name, phone or email...',
  className = '',
  required = false,
}: MemberSearchSelectProps) {
  const { data: users = [], isLoading } = useUsers()
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Find currently selected member
  const selectedMember = useMemo(() => {
    if (!value) return null
    return (
      users.find((u) => u.id === value || u._id === value) || null
    )
  }, [users, value])

  // Filter members based on search
  const filteredMembers = useMemo(() => {
    if (!searchTerm.trim()) {
      return users.slice(0, 50)
    }
    const q = searchTerm.toLowerCase().trim()
    return users
      .filter((u) => {
        const name = (u.username || '').toLowerCase()
        const email = (u.email || '').toLowerCase()
        const phone = (u.phone || '').toLowerCase()
        return name.includes(q) || email.includes(q) || phone.includes(q)
      })
      .slice(0, 50)
  }, [users, searchTerm])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (member: User) => {
    const id = member.id || member._id
    onChange(id, member)
    setIsOpen(false)
    setSearchTerm('')
  }

  const handleClear = () => {
    onChange('', undefined)
    setSearchTerm('')
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {selectedMember ? (
        <div className="flex items-center justify-between p-2.5 border rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <IconUser className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate leading-snug">
                {selectedMember.username || 'Unnamed Member'}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                {selectedMember.phone && <span>{selectedMember.phone}</span>}
                {selectedMember.email && <span>• {selectedMember.email}</span>}
              </div>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground shrink-0"
            title="Change member"
          >
            <IconX className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="space-y-1">
          <div className="relative">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setIsOpen(true)
              }}
              onFocus={() => setIsOpen(true)}
              placeholder={placeholder}
              className="pl-9 pr-8"
              required={required && !value}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <IconX className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {isOpen && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover text-popover-foreground border rounded-lg shadow-lg overflow-hidden">
              <ScrollArea className="max-h-60">
                {isLoading ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Loading members...</p>
                ) : filteredMembers.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No matching members found</p>
                ) : (
                  <div className="p-1">
                    {filteredMembers.map((member) => {
                      const id = member.id || member._id
                      const isSelected = id === value
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => handleSelect(member)}
                          className="w-full flex items-center justify-between p-2 rounded-md hover:bg-accent text-left text-sm transition-colors"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="font-medium text-foreground truncate">
                              {member.username || 'Unnamed Member'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {member.phone || member.email}
                            </p>
                          </div>
                          {isSelected && <IconCheck className="w-4 h-4 text-primary shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
