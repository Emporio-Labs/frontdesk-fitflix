// Form validation schemas using basic TypeScript interfaces
// These define the shape of form data across the app

export interface UserFormData {
  name: string
  email: string
  phone?: string
  role: 'super_admin' | 'clinic_admin' | 'staff' | 'clinician' | 'sales'
  status: 'active' | 'inactive'
}

export interface MembershipFormData {
  type: 'basic' | 'standard' | 'premium'
  userId: string
  startDate: string
  endDate: string
  price: number
  status: 'active' | 'expired' | 'paused'
}

export interface TherapyFormData {
  name: string
  category: string
  description?: string
  duration: number
  price: number
  status: 'active' | 'inactive'
}

export interface BookingFormData {
  therapyId: string
  clinicianId: string
  memberId: string
  date: string
  time: string
  duration: number
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  notes?: string
}

export interface DNAFormData {
  memberId: string
  testDate: string
  status: 'not_started' | 'in_progress' | 'completed'
  results?: string
}

export interface LeadFormData {
  name: string
  email: string
  phone?: string
  source: string
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'
  notes?: string
}

export interface ReportFormData {
  type: 'membership' | 'therapy_progress' | 'dna_analysis' | 'financial'
  startDate: string
  endDate: string
  format: 'pdf' | 'csv' | 'json'
}

// Basic validation functions
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function validatePhoneNumber(phone: string): boolean {
  return /^\d{10,}$/.test(phone.replace(/\D/g, ''))
}

export function validateForm<T extends Record<string, any>>(
  data: T,
  requiredFields: (keyof T)[]
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {}

  requiredFields.forEach(field => {
    if (!data[field] || data[field] === '') {
      errors[field as string] = `${String(field)} is required`
    }
  })

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}
