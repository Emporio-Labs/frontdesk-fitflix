import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import {
  alertReportService,
  GetAlertReportParams,
  AlertReportResponse,
} from '@/lib/services/alert-report.service'
import { toast } from 'sonner'

export function useAlertReport(
  params?: GetAlertReportParams,
  options?: { enabled?: boolean }
) {
  const [isExporting, setIsExporting] = useState(false)

  const query = useQuery<AlertReportResponse>({
    queryKey: queryKeys.alertReports.sla(params),
    queryFn: () => alertReportService.getReport(params),
    enabled: options?.enabled !== false,
    staleTime: 30 * 1000,
  })

  const exportCsv = async () => {
    try {
      setIsExporting(true)
      toast.loading('Generating SLA report spreadsheet...', { id: 'export-csv' })
      await alertReportService.downloadCsv(params)
      toast.success('Spreadsheet exported successfully', { id: 'export-csv' })
    } catch (err: any) {
      console.error('Failed to export alert CSV:', err)
      toast.error(err?.response?.data?.error || 'Failed to export spreadsheet', {
        id: 'export-csv',
      })
    } finally {
      setIsExporting(false)
    }
  }

  return {
    ...query,
    report: query.data,
    isExporting,
    exportCsv,
  }
}
