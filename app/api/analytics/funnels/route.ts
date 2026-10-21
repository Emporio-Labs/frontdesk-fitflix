import { NextRequest } from 'next/server'
import { proxyAnalyticsRequest } from '../proxy'

// Funnels are per-branch and time-boxed, so they must never be cached at the
// edge: a stale response would show one branch's numbers for another.
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  return proxyAnalyticsRequest(req, '/funnels')
}
