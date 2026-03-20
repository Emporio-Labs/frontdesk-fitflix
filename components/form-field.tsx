import { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface FormFieldProps {
  label?: string
  error?: string
  required?: boolean
  children?: React.ReactNode
  className?: string
}

export function FormField({ label, error, required, children, className }: FormFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {children}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

export function FormInput({ error, className, ...props }: FormInputProps) {
  return (
    <input
      className={cn(
        'w-full px-3 py-2 border rounded-md text-sm',
        'border-gray-300 dark:border-gray-600',
        'bg-white dark:bg-gray-900',
        'text-gray-900 dark:text-gray-100',
        'placeholder-gray-500 dark:placeholder-gray-400',
        'focus:outline-none focus:ring-2 focus:ring-blue-500',
        error && 'border-red-500 focus:ring-red-500',
        className
      )}
      {...props}
    />
  )
}

interface FormTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
}

export function FormTextarea({ error, className, ...props }: FormTextareaProps) {
  return (
    <textarea
      className={cn(
        'w-full px-3 py-2 border rounded-md text-sm',
        'border-gray-300 dark:border-gray-600',
        'bg-white dark:bg-gray-900',
        'text-gray-900 dark:text-gray-100',
        'placeholder-gray-500 dark:placeholder-gray-400',
        'focus:outline-none focus:ring-2 focus:ring-blue-500',
        'resize-none',
        error && 'border-red-500 focus:ring-red-500',
        className
      )}
      {...props}
    />
  )
}
