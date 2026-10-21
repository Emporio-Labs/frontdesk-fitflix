import { useAuth } from '@/hooks/use-auth'
import { useMyMembers } from '@/hooks/use-my-members'
import { useMyNutritionistClients } from '@/hooks/use-nutritionist-clients'
import { canAccessMemberReports, ReportAccessResult } from '@/lib/report-access'

/**
 * Hook to evaluate whether the currently signed-in user can open medical reports
 * for the given member (AC FX-07.3).
 *
 * Automatically fetches the relevant scoped roster based on role:
 * - Nutritionist: fetches `useMyNutritionistClients`
 * - Trainer: fetches `useMyMembers`
 * - Admin/Staff: immediate access
 */
export function useCanAccessMemberReports(targetMember?: any): ReportAccessResult {
  const { user } = useAuth()
  const isNutritionist = user?.role === 'nutritionist'
  const isTrainer = user?.role === 'trainer'

  const { data: myClients = [] } = useMyNutritionistClients()
  const { data: myMembers = [] } = useMyMembers()

  return canAccessMemberReports({
    currentUser: user,
    targetMember,
    myClientsList: isNutritionist ? myClients : [],
    myMembersList: isTrainer ? myMembers : [],
  })
}
