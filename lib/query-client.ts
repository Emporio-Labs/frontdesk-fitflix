import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds — general data
      // IMPORTANT: Sensitive queries (auth status, user profiles, memberships, roles)
      // MUST override with staleTime: 0 at the individual useQuery call level so
      // role/membership changes are never served from a 30s-old cache.
      retry: 1,
      refetchOnWindowFocus: true, // re-fetch on tab focus so stale sessions surface quickly
    },
    mutations: {
      retry: 0,
    },
  },
})
