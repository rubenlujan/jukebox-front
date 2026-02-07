import { apiClient } from './apiClient'

function normalizeDeezerSearchResponse(payload) {
  const ok = payload?.Ok ?? payload?.ok
  const message = payload?.Message ?? payload?.message ?? null
  const data = payload?.Data ?? payload?.data ?? null
  const tracks = data?.Tracks ?? data?.tracks ?? []
  return {
    ok: Boolean(ok),
    message,
    data: {
      query: data?.Query ?? data?.query ?? '',
      limit: data?.Limit ?? data?.limit ?? 0,
      tracks: Array.isArray(tracks) ? tracks : [],
    },
  }
}

export const deezerApi = {
  searchTracks: async ({ q, limit = 20 }) => {
    const raw = await apiClient.get('/api/deezer/search', {
      query: { q, limit },
    })
    return normalizeDeezerSearchResponse(raw)
  },
}
