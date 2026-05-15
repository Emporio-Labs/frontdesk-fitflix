'use client'

import * as React from 'react'
import { IconRefresh } from '@tabler/icons-react'
import { Button, type ButtonProps } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type RefreshButtonProps = Omit<ButtonProps, 'onClick' | 'children'> & {
  onClick: () => void | Promise<void>
  loading?: boolean
  children?: React.ReactNode
}

export function RefreshButton({
  onClick,
  loading = false,
  children = 'Refresh',
  className,
  disabled,
  type = 'button',
  ...props
}: RefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const isBusy = loading || isRefreshing

  const handleClick = async () => {
    if (disabled || isBusy) return

    console.debug('RefreshButton: click received', { isBusy, disabled })
    setIsRefreshing(true)
    try {
      const res = await onClick()
      console.debug('RefreshButton: onClick resolved', { res })
      toast.success('Refreshed')
    } catch (err) {
      console.error('RefreshButton: onClick error', err)
      toast.error('Refresh failed')
      throw err
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <Button
      type={type}
      variant="outline"
      className={cn('shrink-0', className)}
      disabled={disabled || isBusy}
      onClick={handleClick}
      aria-busy={isBusy}
      {...props}
    >
      <IconRefresh className={cn('h-4 w-4', isBusy && 'animate-spin')} />
      <span>{children}</span>
    </Button>
  )
}