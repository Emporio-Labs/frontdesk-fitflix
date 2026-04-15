import { NextRequest, NextResponse } from 'next/server'
import { API_BASE_URL } from '@/lib/api-client'

const HOP_BY_HOP_RESPONSE_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'content-encoding',
])

function buildTargetUrl(req: NextRequest, backendPath: string): string {
  const normalizedPath = backendPath.startsWith('/') ? backendPath : `/${backendPath}`
  const url = new URL(`${API_BASE_URL}${normalizedPath}`)
  const query = req.nextUrl.searchParams.toString()
  if (query) {
    url.search = query
  }
  return url.toString()
}

function buildProxyRequestHeaders(req: NextRequest): Headers {
  const headers = new Headers()

  req.headers.forEach((value, key) => {
    const lower = key.toLowerCase()

    if (lower === 'host' || lower === 'connection' || lower === 'content-length') {
      return
    }

    if (
      lower === 'authorization' ||
      lower === 'cookie' ||
      lower === 'content-type' ||
      lower === 'accept' ||
      lower.startsWith('x-')
    ) {
      headers.set(key, value)
    }
  })

  if (!headers.has('accept')) {
    headers.set('accept', 'application/json')
  }

  return headers
}

function copyUpstreamHeaders(upstream: Response): Headers {
  const headers = new Headers()

  upstream.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_RESPONSE_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value)
    }
  })

  return headers
}

export async function proxyLeadsRequest(req: NextRequest, backendPath: string): Promise<NextResponse> {
  try {
    const method = req.method.toUpperCase()
    const includeBody = method !== 'GET' && method !== 'HEAD'
    const rawBody = includeBody ? await req.text() : ''

    const upstream = await fetch(buildTargetUrl(req, backendPath), {
      method,
      headers: buildProxyRequestHeaders(req),
      ...(includeBody && rawBody ? { body: rawBody } : {}),
      cache: 'no-store',
    })

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: copyUpstreamHeaders(upstream),
    })
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to proxy leads request', error: String(error) },
      { status: 502 }
    )
  }
}