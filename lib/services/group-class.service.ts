// Group Classes Service
// Currently uses localStorage for persistence.
// When the backend API is ready, replace the CRUD functions with apiClient calls.

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
    await new Promise((r) => setTimeout(r, 80))
    const now = new Date().toISOString()
    const newClass: GroupClass = {
      id: generateId(),
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
      createdAt: now,
      updatedAt: now,
    }
    const all = readAll()
    all.push(newClass)
    writeAll(all)
    return { message: 'Group class created successfully', groupClass: newClass }
  },

  update: async (id: string, payload: UpdateGroupClassPayload): Promise<{ message: string; groupClass: GroupClass }> => {
    await new Promise((r) => setTimeout(r, 80))
    const all = readAll()
    const index = all.findIndex((c) => c.id === id)
    if (index === -1) throw new Error('Group class not found')
    const updated: GroupClass = {
      ...all[index],
      ...payload,
      id, // ensure id is not overwritten
      updatedAt: new Date().toISOString(),
    }
    all[index] = updated
    writeAll(all)
    return { message: 'Group class updated successfully', groupClass: updated }
  },

  delete: async (id: string): Promise<{ message: string }> => {
    await new Promise((r) => setTimeout(r, 80))
    const all = readAll()
    const filtered = all.filter((c) => c.id !== id)
    writeAll(filtered)
    return { message: 'Group class deleted successfully' }
  },
}
