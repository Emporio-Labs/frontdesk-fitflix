import { useQuery } from '@tanstack/react-query'
import { loginActivityService, LoginActivityParams } from '@/lib/services/login-activity.service'
import { queryKeys } from '@/lib/query-keys'

export function useLoginActivity(params: LoginActivityParams, enabled = true) {
  const role = params.role ?? 'staff'
  return useQuery({
    queryKey: queryKeys.loginActivity.list(params.from, params.to, role),
    queryFn: () => loginActivityService.list(params),
    enabled,
  })
}
