import { NextRequest, NextResponse } from 'next/server'

/**
 * FX-27.3 — server-side gateway to the analytics service.
 *
 * The analytics service authenticates with a secret key. This file runs ONLY on
 * the server (it is imported by route handlers, never by client code) and reads
 * that key from `ANALYTICS_API_KEY` — note the deliberate absence of a
 * `NEXT_PUBLIC_` prefix, which is what keeps Next.js from ever inlining it into
 * a browser bundle. The key is attached here and never leaves the server; the
 * browser only ever sees the funnel numbers this route returns.
 *
 * The caller's own bearer token is forwarded upstream so the analytics service
 * can scope/refuse by the caller's branch access (FX-27.2). The secret key is a
 * service-to-service credential layered on top of — not a replacement for — the
 * user's auth.
 */

// Server-only. Reading these inside a request handler (not at module scope) lets
// the dev server pick up .env changes without a cold restart.
function readConfig() {
  const rawUrl = String(process.env.ANALYTICS_API_URL ?? '').trim().replace(/\/$/, '')
  const key = String(process.env.ANALYTICS_API_KEY ?? '').trim()
  return { url: rawUrl, key, configured: Boolean(rawUrl && key) }
}

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

function buildTargetUrl(req: NextRequest, baseUrl: string, servicePath: string): string {
  const normalizedPath = servicePath.startsWith('/') ? servicePath : `/${servicePath}`
  const url = new URL(`${baseUrl}${normalizedPath}`)
  const query = req.nextUrl.searchParams.toString()
  if (query) url.search = query
  return url.toString()
}

function buildUpstreamHeaders(req: NextRequest, secret: string): Headers {
  const headers = new Headers()

  // Forward only what the analytics service needs to identify the caller and
  // the branch. Everything else (host, cookies, hop-by-hop) is dropped.
  req.headers.forEach((value, key) => {
    const lower = key.toLowerCase()
    if (lower === 'authorization' || lower === 'x-location-id' || lower === 'accept') {
      headers.set(key, value)
    }
  })

  if (!headers.has('accept')) headers.set('accept', 'application/json')

  // The secret key — added server-side only.
  headers.set('X-Analytics-Key', secret)

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

/**
 * A valid-but-empty payload returned when the analytics service is not
 * configured (e.g. local dev with no key). The page reads `configured: false`
 * and shows an informative empty state instead of an error — consistent with
 * how the rest of the console degrades gracefully against missing backends.
 */
function unconfiguredPayload(req: NextRequest) {
  const params = req.nextUrl.searchParams
  return {
    branchId: params.get('locationId') || null,
    range: { from: params.get('from') || '', to: params.get('to') || '' },
    funnels: [],
    generatedAt: new Date().toISOString(),
    configured: false,
  }
}

export async function proxyAnalyticsRequest(
  req: NextRequest,
  servicePath: string
): Promise<NextResponse> {
  const { url, key, configured } = readConfig()

  if (!configured) {
    return NextResponse.json(unconfiguredPayload(req), { status: 200 })
  }

  try {
    const method = req.method.toUpperCase()
    const includeBody = method !== 'GET' && method !== 'HEAD'
    const rawBody = includeBody ? await req.text() : ''

    const upstream = await fetch(buildTargetUrl(req, url, servicePath), {
      method,
      headers: buildUpstreamHeaders(req, key),
      ...(includeBody && rawBody ? { body: rawBody } : {}),
      cache: 'no-store',
    })

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: copyUpstreamHeaders(upstream),
    })
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to reach the analytics service', error: String(error) },
      { status: 502 }
    )
  }
}
