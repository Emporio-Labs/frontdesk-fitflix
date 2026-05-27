import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface NutritionistWorkspaceState {
  selectedUserId: string | null
  draftNotes: Record<string, string>
  selectUser: (userId: string | null) => void
  clearUser: () => void
  setDraftNote: (userId: string, note: string) => void
}

export const useNutritionistWorkspace = create<NutritionistWorkspaceState>()(
  persist(
    (set) => ({
      selectedUserId: null,
      draftNotes: {},
      selectUser: (userId) => set({ selectedUserId: userId }),
      clearUser: () => set({ selectedUserId: null }),
      setDraftNote: (userId, note) =>
        set((s) => ({ draftNotes: { ...s.draftNotes, [userId]: note } })),
    }),
    {
      name: 'fitflix-nutritionist-workspace',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? window.sessionStorage : (undefined as any)
      ),
    }
  )
)
