import { useQuery } from '@tanstack/react-query'
import { trainerService } from '@/lib/services/trainer.service'
import { queryKeys } from '@/lib/query-keys'

export function useMyMembers() {
  return useQuery({
    queryKey: queryKeys.trainers.myMembers(),
    queryFn: async () => {
      const res = await trainerService.getMyMembers()
      return res.members ?? []
    },
  })
}

export function useMyMember(userId: string) {
  return useQuery({
    queryKey: ['trainers', 'me', 'members', userId],
    queryFn: async () => {
      const res = await trainerService.getMyMemberById(userId)
      return res.member
    },
    enabled: !!userId,
  })
}
