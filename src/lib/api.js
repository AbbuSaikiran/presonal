/**
 * api.js — Sybrai API client
 *
 * Thin fetch wrapper that:
 *  - Attaches the JWT from sessionStorage as a Bearer token on every request
 *  - Parses JSON responses and throws readable errors for non-2xx status codes
 *  - Fires a custom `sybrai:unauthorized` DOM event on 401 so the auth hook
 *    can log the user out without any circular imports
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

// ---------------------------------------------------------------------------
// Core fetch wrapper
// ---------------------------------------------------------------------------

function getToken() {
  try {
    const raw = sessionStorage.getItem('sybrai_user')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.token ?? null
  } catch {
    return null
  }
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

async function apiFetch(path, options = {}) {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers ?? {}),
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })

  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent('sybrai:unauthorized'))
    throw new ApiError('Session expired — please log in again.', 401)
  }

  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const body = await res.json()
      detail = body?.detail ?? detail
    } catch { /* ignore */ }
    throw new ApiError(detail, res.status)
  }

  // 204 No Content
  if (res.status === 204) return null

  return res.json()
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/**
 * POST /api/auth/login
 * Returns { access_token, token_type, user }
 */
export async function apiLogin(email, password) {
  return apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

/**
 * POST /api/auth/register
 * Returns { access_token, token_type, user }
 */
export async function apiRegister(payload) {
  return apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * POST /api/auth/forgot-password
 */
export async function apiForgotPassword(email) {
  return apiFetch('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

/**
 * POST /api/auth/reset-password
 */
export async function apiResetPassword(payload) {
  return apiFetch('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * GET /api/auth/me
 * Returns the currently authenticated user object.
 */
export async function apiMe() {
  return apiFetch('/api/auth/me')
}

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------

/**
 * GET /api/alerts
 * @param {Object} params — { page, limit, risk, status, q, sort, dir }
 * Returns AlertListResponse { alerts, total, page, limit, total_pages }
 */
export async function fetchAlerts(params = {}) {
  const qs = new URLSearchParams()
  if (params.page)   qs.set('page',   String(params.page))
  if (params.limit)  qs.set('limit',  String(params.limit))
  if (params.risk && params.risk !== 'ALL')    qs.set('risk',   params.risk)
  if (params.status && params.status !== 'ALL') qs.set('status', params.status)
  if (params.q)      qs.set('q',      params.q)
  if (params.sort)   qs.set('sort',   params.sort)
  if (params.dir)    qs.set('dir',    params.dir)
  const query = qs.toString()
  return apiFetch(`/api/alerts${query ? `?${query}` : ''}`)
}

/**
 * GET /api/alerts/:id
 */
export async function fetchAlertById(id) {
  return apiFetch(`/api/alerts/${id}`)
}

/**
 * PATCH /api/alerts/:id/status
 * @param {string} id
 * @param {string} newStatus
 */
export async function patchAlertStatus(id, newStatus) {
  return apiFetch(`/api/alerts/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: newStatus }),
  })
}

// ---------------------------------------------------------------------------
// AI Anomaly Detection & Explainer
// ---------------------------------------------------------------------------

/**
 * POST /predict (or /api/detection/predict)
 * Scores an incoming event via the Isolation Forest model.
 * @param {Object} eventData
 */
export async function predictEvent(eventData) {
  return apiFetch('/api/detection/predict', {
    method: 'POST',
    body: JSON.stringify(eventData),
  })
}

/**
 * POST /explain (or /api/detection/explain)
 * Generates an incident summary and recommended actions via Claude AI.
 * @param {string|null} alertId
 * @param {Object|null} rawEvent
 */
export async function explainAlert(alertId, rawEvent = null) {
  return apiFetch('/api/detection/explain', {
    method: 'POST',
    body: JSON.stringify({
      alert_id: alertId || undefined,
      event: rawEvent || undefined,
    }),
  })
}

/**
 * GET /api/detection/status
 */
export async function fetchDetectionStatus() {
  return apiFetch('/api/detection/status')
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

/** GET /api/stats */
export async function fetchStats() {
  return apiFetch('/api/stats')
}

/** GET /api/stats/trend */
export async function fetchTrend() {
  return apiFetch('/api/stats/trend')
}

/** GET /api/stats/top-sources */
export async function fetchTopSources() {
  return apiFetch('/api/stats/top-sources')
}

// ---------------------------------------------------------------------------
// Devices
// ---------------------------------------------------------------------------

/** GET /api/devices */
export async function fetchDevices() {
  return apiFetch('/api/devices')
}
