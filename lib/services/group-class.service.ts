// Group Classes Service
// Currently uses localStorage for persistence.
// When the backend API is ready, replace the CRUD functions with apiClient calls.

import { therapyService } from './therapy.service'

const STORAGE_KEY = 'fitflix_group_classes'

export type GroupClassMode = 'online' | 'offline' | 'hybrid'

export interface GroupClass {
  id: string
  name: string
  description: string
  mode: GroupClassMode
  instructor: string
  durationMinutes: number
  creditsRequired: number
  maxParticipants: number
  tags: string[]
  scheduleInfo: string
  isActive: boolean
  slots?: string[]
  createdAt: string
  updatedAt: string
}

export interface CreateGroupClassPayload {
  name: string
  description: string
  mode: GroupClassMode
  instructor: string
  durationMinutes: number
  creditsRequired: number
  maxParticipants: number
  tags: string[]
  scheduleInfo: string
  slots?: string[]
  isActive?: boolean
}

export interface UpdateGroupClassPayload extends Partial<CreateGroupClassPayload> {}

function readAll(): GroupClass[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(classes: GroupClass[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(classes))
}

// generateId is no longer used for new classes as we use the shadow therapy ID.
function generateId(): string {
  return `gc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export const groupClassService = {
  getAll: async (): Promise<{ groupClasses: GroupClass[] }> => {
    await new Promise((r) => setTimeout(r, 50)) // simulate async
    return { groupClasses: readAll() }
  },

  getById: async (id: string): Promise<{ groupClass: GroupClass }> => {
    await new Promise((r) => setTimeout(r, 50))
    const all = readAll()
    const found = all.find((c) => c.id === id)
    if (!found) throw new Error('Group class not found')
    return { groupClass: found }
  },

  create: async (payload: CreateGroupClassPayload): Promise<{ message: string; groupClass: GroupClass }> => {
    // Create shadow therapy in backend to generate a valid ObjectId and sync slots
    const { therapy } = await therapyService.create({
      name: payload.name,
      time: payload.durationMinutes,
      creditCost: payload.creditsRequired,
      description: 'Shadow therapy for Group Class',
      tags: ['__group_class__'],
      slots: payload.slots || [],
    })

    const now = new Date().toISOString()
    const newClass: GroupClass = {
      id: therapy.id || generateId(),
      name: payload.name,
      description: payload.description,
      mode: payload.mode,
      instructor: payload.instructor,
      durationMinutes: payload.durationMinutes,
      creditsRequired: payload.creditsRequired,
      maxParticipants: payload.maxParticipants,
      tags: payload.tags,
      scheduleInfo: payload.scheduleInfo,
      isActive: payload.isActive ?? true,
      slots: payload.slots || [],
      createdAt: now,
      updatedAt: now,
    }
    const all = readAll()
    all.push(newClass)
    writeAll(all)
    return { message: 'Group class created successfully', groupClass: newClass }
  },

  update: async (id: string, payload: UpdateGroupClassPayload): Promise<{ message: string; groupClass: GroupClass }> => {
    const all = readAll()
    const index = all.findIndex((c) => c.id === id)
    if (index === -1) throw new Error('Group class not found')
    
    const updated: GroupClass = {
      ...all[index],
      ...payload,
      id,
      updatedAt: new Date().toISOString(),
    }

    if (!id.startsWith('gc_')) {
      try {
        await therapyService.update(id, {
          name: updated.name,
          time: updated.durationMinutes,
          creditCost: updated.creditsRequired,
          slots: updated.slots || [],
          tags: ['__group_class__'],
        })
      } catch (e) {
        console.warn('Failed to sync shadow therapy', e)
      }
    }

    all[index] = updated
    writeAll(all)
    return { message: 'Group class updated successfully', groupClass: updated }
  },

  delete: async (id: string): Promise<{ message: string }> => {
    if (!id.startsWith('gc_')) {
      try {
        await therapyService.delete(id)
      } catch (e) {
        console.warn('Failed to delete shadow therapy', e)
      }
    }
    const all = readAll()
    const filtered = all.filter((c) => c.id !== id)
    writeAll(filtered)
    return { message: 'Group class deleted successfully' }
  },
}
