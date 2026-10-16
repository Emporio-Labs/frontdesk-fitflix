import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { dnaService, CreateDNATestPayload } from '@/lib/services/dna.service'

const DNA_KEYS = {
  all: ['dna-tests'] as const,
  list: (params?: { search?: string; status?: string }) => ['dna-tests', params] as const,
}

export function useDnaTests(params?: { search?: string; status?: string }) {
  return useQuery({
    queryKey: DNA_KEYS.list(params),
    queryFn: () => dnaService.getAll(params),
    select: (data) => data.tests,
  })
}

export function useCreateDnaTest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateDNATestPayload | FormData) => dnaService.create(payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: DNA_KEYS.all })
      qc.invalidateQueries({ queryKey: ['users'] })
      qc.invalidateQueries({ queryKey: ['onboarding'] })
      toast.success(data.message || 'DNA test created successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || 'Failed to create DNA test')
    },
  })
}

export function useUpdateDnaTest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateDNATestPayload> | FormData }) =>
      dnaService.update(id, payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: DNA_KEYS.all })
      qc.invalidateQueries({ queryKey: ['users'] })
      qc.invalidateQueries({ queryKey: ['onboarding'] })
      toast.success(data.message || 'DNA test updated successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || 'Failed to update DNA test')
    },
  })
}

export function useDeleteDnaTest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => dnaService.delete(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: DNA_KEYS.all })
      toast.success(data.message || 'DNA test deleted')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || 'Failed to delete DNA test')
    },
  })
}
