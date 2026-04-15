import { NextRequest } from 'next/server'
import { proxyLeadsRequest } from '../../proxy'

type Params = { params: Promise<{ lead_id: string }> }

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: NextRequest, { params }: Params) {
  const { lead_id } = await params
  return proxyLeadsRequest(req, `/leads/${lead_id}/fcm-token`)
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { lead_id } = await params
  return proxyLeadsRequest(req, `/leads/${lead_id}/fcm-token`)
}
