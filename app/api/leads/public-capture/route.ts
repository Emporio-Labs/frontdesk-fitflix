import { NextRequest } from 'next/server'
import { proxyLeadsRequest } from '../proxy'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: NextRequest) {
  return proxyLeadsRequest(req, '/leads/public-capture')
}