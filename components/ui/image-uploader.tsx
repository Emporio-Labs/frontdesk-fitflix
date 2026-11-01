'use client'

import React, { useRef, useState } from 'react'
import {
  IconCamera,
  IconLink,
  IconLoader2,
  IconTrash,
  IconUpload,
  IconX,
} from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { optimizeImageForUpload } from '@/lib/utils/image-compression'
import { toast } from 'sonner'

export interface ImageUploaderProps {
  value?: string
  onChange: (url: string) => void
  onUpload?: (file: File) => Promise<{ imageUrl: string }>
  label?: string
  fallbackText?: string
  shape?: 'circle' | 'square'
  className?: string
  allowUrlToggle?: boolean
}

export function ImageUploader({
  value = '',
  onChange,
  onUpload,
  label,
  fallbackText = 'TR',
  shape = 'circle',
  className,
  allowUrlToggle = true,
}: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [mode, setMode] = useState<'upload' | 'url'>(
    value && !value.includes('/events/assets/') && !value.includes('/uploads/') ? 'url' : 'upload'
  )
  const [isDragging, setIsDragging] = useState(false)

  const handleFile = async (file: File | undefined) => {
    if (!file) return

    // Client-side validation
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type.toLowerCase())) {
      toast.error('Only JPG, PNG or WebP images are allowed')
      return
    }

    if (file.size > 30 * 1024 * 1024) {
      toast.error('Image must be 30 MB or smaller')
      return
    }

    if (!onUpload) {
      toast.error('No upload handler configured')
      return
    }

    setIsUploading(true)
    try {
      const optimized = await optimizeImageForUpload(file)
      const result = await onUpload(optimized)
      onChange(result.imageUrl)
      toast.success('Image uploaded successfully')
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          'Failed to upload image'
      )
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div className={cn('space-y-2', className)}>
      {(label || allowUrlToggle) && (
        <div className="flex items-center justify-between min-h-[20px]">
          {label ? (
            <label className="text-sm font-medium">{label}</label>
          ) : (
            <span />
          )}
          {allowUrlToggle && (
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
              onClick={() => setMode(mode === 'upload' ? 'url' : 'upload')}
            >
              {mode === 'upload' ? 'Paste URL instead' : 'Upload image file instead'}
            </button>
          )}
        </div>
      )}

      {mode === 'upload' ? (
        <div className="flex items-center gap-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
            disabled={isUploading}
          />

          {/* Avatar Preview / Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={cn(
              'group relative flex cursor-pointer items-center justify-center overflow-hidden border-2 border-dashed transition-all',
              shape === 'circle' ? 'h-20 w-20 rounded-full' : 'h-24 w-24 rounded-lg',
              isDragging
                ? 'border-primary bg-primary/10 scale-105'
                : 'border-muted-foreground/30 hover:border-primary/60 bg-muted/40 hover:bg-muted/70',
              isUploading && 'pointer-events-none opacity-70'
            )}
            title="Click or drag and drop to upload image"
          >
            {value ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={value}
                alt="Preview"
                className={cn(
                  'h-full w-full object-cover',
                  shape === 'circle' ? 'rounded-full' : 'rounded-lg'
                )}
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-2 text-center text-muted-foreground">
                <IconCamera className="size-6 text-muted-foreground/80 group-hover:scale-110 group-hover:text-foreground transition-transform" />
              </div>
            )}

            {/* Hover / Loading Overlay */}
            <div
              className={cn(
                'absolute inset-0 flex items-center justify-center bg-black/50 text-white transition-opacity',
                isUploading
                  ? 'opacity-100'
                  : 'opacity-0 group-hover:opacity-100'
              )}
            >
              {isUploading ? (
                <IconLoader2 className="size-5 animate-spin text-white" />
              ) : (
                <IconUpload className="size-5 text-white" />
              )}
            </div>
          </div>

          {/* Action Buttons & Info */}
          <div className="flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="h-8 gap-1.5 text-xs"
              >
                {isUploading ? (
                  <>
                    <IconLoader2 className="size-3.5 animate-spin" />
                    Uploading...
                  </>
                ) : value ? (
                  <>
                    <IconUpload className="size-3.5" />
                    Replace photo
                  </>
                ) : (
                  <>
                    <IconUpload className="size-3.5" />
                    Upload photo
                  </>
                )}
              </Button>

              {value && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange('')}
                  disabled={isUploading}
                  className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <IconTrash className="size-3.5 mr-1" />
                  Remove
                </Button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Supports high-res JPG, PNG or WebP (up to 30 MB)
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="relative">
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="https://images.unsplash.com/photo-..."
              className="pr-9"
            />
            {value && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <IconX className="size-4" />
              </button>
            )}
          </div>
          {value && (
            <div className="flex items-center gap-3 pt-1">
              <Avatar className="h-10 w-10">
                <AvatarImage src={value} alt="Preview" />
                <AvatarFallback>{fallbackText}</AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground truncate max-w-xs">
                {value}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
