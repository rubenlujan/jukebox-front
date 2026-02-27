import { API_BASE_URL } from '../config/env'

function buildUrl(path, query) {
  const base = API_BASE_URL.replace(/\/+$/, '')
  const p = String(path || '').startsWith('/') ? path : `/${path || ''}`
  const url = new URL(`${base}${p}`)

  if (query && typeof query === 'object') {
    Object.entries(query).forEach(([k, v]) => {
      if (v === undefined || v === null) return
      url.searchParams.set(k, String(v))
    })
  }

  return url.toString()
}

async function safeReadText(res) {
  try {
    return await res.text()
  } catch {
    return ''
  }
}

function normalizeError({ status, message, details }) {
  const err = new Error(message || 'Request failed')
  err.status = status
  err.details = details
  return err
}

export const apiClient = {
  async get(path, { query, headers } = {}) {
    const url = buildUrl(path, query)
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...(headers || {}),
      },
    })

    const text = await safeReadText(res)
    let json = null
    try {
      json = text ? JSON.parse(text) : null
    } catch {
      // non-json
    }

    if (!res.ok) {
      const msg =
        (json && (json.message || json.error)) || text || `HTTP ${res.status}`
      throw normalizeError({
        status: res.status,
        message: msg,
        details: json || text,
      })
    }

    return json
  },

  async post(path, body, { query, headers } = {}) {
    const url = buildUrl(path, query)
    console.log('[API] POST Request:', { url, body })

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(headers || {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })

    const text = await safeReadText(res)
    let json = null
    try {
      json = text ? JSON.parse(text) : null
    } catch {
      // non-json
    }

    console.log('[API] POST Response:', json || text)

    if (!res.ok) {
      const msg =
        (json && (json.message || json.error)) || text || `HTTP ${res.status}`
      throw normalizeError({
        status: res.status,
        message: msg,
        details: json || text,
      })
    }

    return json
  },
}
