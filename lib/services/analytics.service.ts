import axios, { AxiosHeaders } from 'axios'

/**
 * FX-27 — branch analytics (sign-up + booking funnels).
 *
 * The numbers come from a dedicated **analytics service** that authenticates
 * callers with a secret key. That key must never reach the browser (FX-27.3),
 * so this client does NOT talk to the analytics service directly. It calls a
 * same-origin Next.js route (`/api/analytics/*`) which runs on the server,
 * attaches the secret from a server-only env var, and forwards the request.
 *
 * We still send the signed-in user's bearer token on to that route so the
 * analytics service can scope/refuse by the caller's branch access (FX-27.2) —
 * "all branches" stays super-admin-only, enforced there, not in this UI.
 *
 * > ASSUMPTION: the analytics service returns the shape below. The exact field
 * > names are inferred (the service is not in api_docs.md yet) — see
 * > docs/fx-27-branch-analytics.md and BACKEND_REQUIREMENTS.txt. `normalizeFunnels`
 * > is tolerant: an unexpected shape degrades to empty funnels (the page then
 * > shows its EmptyState) rather than throwing.
 */

export type FunnelKey = 'signup' | 'booking'

export interface FunnelStep {
  /** Stable identifier for the stage, e.g. `lead` or `slot_viewed`. */
  key: string
  /** Human label shown on the row, e.g. "Leads" or "Slots viewed". */
  label: string
  /** How many entities reached this stage in the window. */
  count: number
}

export interface Funnel {
  key: FunnelKey | string
  title: string
  steps: FunnelStep[]
}

export interface AnalyticsFunnels {
  /** The branch these numbers are scoped to, or null for "all branches". */
  branchId: string | null
  range: { from: string; to: string }
  funnels: Funnel[]
  generatedAt: string
  /**
   * False when the analytics service has not been configured on the server
   * (no ANALYTICS_API_URL / ANALYTICS_API_KEY). The page uses this to tell
   * "not wired up yet" apart from "no data for this branch".
   */
  configured: boolean
}

export interface GetFunnelsParams {
  /** Effective branch from the location scope; null means "all branches". */
  locationId: string | null
  /** Inclusive date window, `YYYY-MM-DD`. */
  from: string
  to: string
}

// Same-origin instance: these routes are served by THIS Next.js app, not the
// backend API, so no baseURL. We attach the bearer token ourselves (the shared
// apiClient points at the backend and would send the request to the wrong host).
const analyticsHttp = axios.create({
  headers: { 'Content-Type': 'application/json' },
})

analyticsHttp.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const headers = AxiosHeaders.from(config.headers)
    const token = localStorage.getItem('hh_token')
    if (token) headers.set('Authorization', `Bearer ${token}`)
    // Mirror the backend transport convention so the proxy can forward the
    // branch either way (query param is the source of truth; this is belt-and-braces).
    try {
      const loc = localStorage.getItem('hh_selected_location')
      if (loc) headers.set('X-Location-Id', loc)
    } catch {}
    config.headers = headers
  }
  return config
})

function toStep(raw: any, index: number): FunnelStep {
  return {
    key: String(raw?.key ?? raw?.id ?? raw?.stage ?? `step-${index}`),
    label: String(raw?.label ?? raw?.name ?? raw?.key ?? `Step ${index + 1}`),
    count: Number.isFinite(Number(raw?.count)) ? Number(raw.count) : 0,
  }
}

function toFunnel(raw: any, fallbackKey: string, fallbackTitle: string): Funnel {
  const steps = Array.isArray(raw?.steps) ? raw.steps.map(toStep) : []
  return {
    key: String(raw?.key ?? fallbackKey),
    title: String(raw?.title ?? raw?.name ?? fallbackTitle),
    steps,
  }
}

function normalizeFunnels(raw: any, params: GetFunnelsParams): AnalyticsFunnels {
  // The service may return `funnels: [...]` or a keyed object `{ signup, booking }`.
  let funnels: Funnel[] = []
  if (Array.isArray(raw?.funnels)) {
    funnels = raw.funnels.map((f: any, i: number) =>
      toFunnel(f, f?.key ?? `funnel-${i}`, f?.title ?? 'Funnel')
    )
  } else {
    if (raw?.signup) funnels.push(toFunnel(raw.signup, 'signup', 'Sign-up funnel'))
    if (raw?.booking) funnels.push(toFunnel(raw.booking, 'booking', 'Booking funnel'))
  }

  return {
    branchId: raw?.branchId ?? params.locationId ?? null,
    range: {
      from: String(raw?.range?.from ?? params.from),
      to: String(raw?.range?.to ?? params.to),
    },
    funnels,
    generatedAt: String(raw?.generatedAt ?? new Date().toISOString()),
    // The proxy sends `configured: false` when the service env is unset.
    configured: raw?.configured !== false,
  }
}

export const analyticsService = {
  getFunnels: async (params: GetFunnelsParams): Promise<AnalyticsFunnels> => {
    const { data } = await analyticsHttp.get('/api/analytics/funnels', {
      params: {
        ...(params.locationId ? { locationId: params.locationId } : {}),
        from: params.from,
        to: params.to,
      },
    })
    return normalizeFunnels(data, params)
  },
}
