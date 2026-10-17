import { apiClient, API_BASE_URL } from '@/lib/api-client'

export interface DNATestMember {
  id?: string
  _id?: string
  username?: string
  email?: string
  phone?: string
}

export interface DNATestItem {
  id: string
  _id: string
  memberId: string
  member?: DNATestMember
  reportName: string
  reportType: string
  testDate: string
  status: 'not-started' | 'in-progress' | 'completed'
  notes: string
  s3Key?: string
  mimeType?: string
  fileSize?: number
  downloadUrl?: string
  createdAt?: string
  uploadedAt?: string
}

export interface CreateDNATestPayload {
  memberId: string
  testDate?: string
  notes?: string
  status?: 'not-started' | 'in-progress' | 'completed'
  reportName?: string
  file?: File | null
}

export function resolveReportUrl(url?: string): string {
  if (!url) return ''
  if (url.startsWith('/uploads')) {
    return `${API_BASE_URL}${url}`
  }
  return url
}

export const dnaService = {
  getAll: async (params?: { search?: string; status?: string }): Promise<{ tests: DNATestItem[] }> => {
    const searchParams = new URLSearchParams()
    if (params?.search) searchParams.set('search', params.search)
    if (params?.status) searchParams.set('status', params.status)

    const query = searchParams.toString() ? `?${searchParams.toString()}` : ''
    const { data } = await apiClient.get(`/dna/tests${query}`)
    const tests = (data?.tests ?? []).map((t: DNATestItem) => ({
      ...t,
      downloadUrl: resolveReportUrl(t.downloadUrl),
    }))
    return { tests }
  },

  create: async (payload: CreateDNATestPayload | FormData): Promise<{ message: string; test: DNATestItem }> => {
    let body: FormData | CreateDNATestPayload = payload
    if (!(payload instanceof FormData)) {
      const formData = new FormData()
      formData.append('memberId', payload.memberId)
      if (payload.testDate) formData.append('testDate', payload.testDate)
      if (payload.notes) formData.append('notes', payload.notes)
      if (payload.status) formData.append('status', payload.status)
      if (payload.reportName) formData.append('reportName', payload.reportName)
      if (payload.file) formData.append('file', payload.file)
      body = formData
    }

    const headers = body instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined
    const { data } = await apiClient.post('/dna/tests', body, { headers })
    return {
      message: data?.message || 'DNA test created successfully',
      test: {
        ...data.test,
        downloadUrl: resolveReportUrl(data.test?.downloadUrl),
      },
    }
  },

  update: async (
    id: string,
    payload: Partial<CreateDNATestPayload> | FormData
  ): Promise<{ message: string; test: DNATestItem }> => {
    let body: FormData | Partial<CreateDNATestPayload> = payload
    if (!(payload instanceof FormData)) {
      const formData = new FormData()
      if (payload.memberId) formData.append('memberId', payload.memberId)
      if (payload.testDate) formData.append('testDate', payload.testDate)
      if (payload.notes !== undefined) formData.append('notes', payload.notes)
      if (payload.status) formData.append('status', payload.status)
      if (payload.reportName) formData.append('reportName', payload.reportName)
      if (payload.file) formData.append('file', payload.file)
      body = formData
    }

    const headers = body instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined
    const { data } = await apiClient.patch(`/dna/tests/${id}`, body, { headers })
    return {
      message: data?.message || 'DNA test updated successfully',
      test: {
        ...data.test,
        downloadUrl: resolveReportUrl(data.test?.downloadUrl),
      },
    }
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const { data } = await apiClient.delete(`/dna/tests/${id}`)
    return data as { message: string }
  },
}
