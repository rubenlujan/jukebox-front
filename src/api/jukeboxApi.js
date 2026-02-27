import { apiClient } from './apiClient'

function normalizeRequestResponse(payload) {
  const { ok, message, data } = unwrapEnvelope(payload)

  // En request, los campos deberían venir dentro de Data
  const accepted = data?.Accepted ?? data?.accepted ?? false

  return {
    ok,
    message, // mensaje “global” del envelope (si lo usan)
    accepted: Boolean(accepted),

    queueId: data?.QueueId ?? data?.queueId ?? null,
    youtubeVideoId: data?.YouTubeVideoId ?? data?.youtubeVideoId ?? null,

    matchStatus: data?.MatchStatus ?? data?.matchStatus ?? null,

    // mensaje UX claro puede venir en Data.Message o en Message
    uxMessage: data?.Message ?? data?.message ?? message ?? null,

    // info track (si la mandas en Data)
    track: data ?? null,

    raw: payload,
  }
}

function unwrapEnvelope(payload) {
  // { Ok, Message, Data } (Pascal) o { ok, message, data } (camel)
  const ok = payload?.Ok ?? payload?.ok ?? false
  const message = payload?.Message ?? payload?.message ?? null
  const data = payload?.Data ?? payload?.data ?? null
  return { ok: Boolean(ok), message, data }
}

function normalizeRecoverResponse(payload) {
  const { ok, message, data } = unwrapEnvelope(payload)

  const hasNowPlaying = data?.HasNowPlaying ?? data?.hasNowPlaying ?? false
  const nowPlaying = data?.NowPlaying ?? data?.nowPlaying ?? null

  // Si en el futuro NowPlaying trae más datos, lo soportamos
  const youtubeVideoId =
    nowPlaying?.YouTubeVideoId ?? nowPlaying?.youtubeVideoId ?? null

  return {
    ok,
    message,
    hasNowPlaying: Boolean(hasNowPlaying),
    nowPlaying: nowPlaying || null,
    youtubeVideoId,
    // si luego agregas track fields al recover, lo puedes mapear aquí
    raw: payload,
  }
}

function normalizeNextResponse(payload) {
  const { ok, message, data } = unwrapEnvelope(payload)

  const hasQueueItem = data?.HasQueueItem ?? data?.hasQueueItem ?? false
  const useFallback = data?.UseFallback ?? data?.useFallback ?? false
  const fallbackPlaylistId =
    data?.FallbackPlaylistId ?? data?.fallbackPlaylistId ?? null

  const youtubeVideoId = data?.YouTubeVideoId ?? data?.youtubeVideoId ?? null

  // Track info viene “plano” en Data según tu ejemplo
  const track = {
    TrackName: data?.TrackName ?? null,
    ArtistName: data?.ArtistName ?? null,
    DurationMs: data?.DurationMs ?? null,
    AlbumImageUrl: data?.AlbumImageUrl ?? null,
    TableCode: data?.TableCode ?? null,
    QueueId: data?.QueueId ?? null,
    Status: data?.Status ?? null,
  }

  // Si todos son null, no mandes track
  const hasAnyTrackField = Object.values(track).some(
    (v) => v !== null && v !== undefined,
  )

  return {
    ok,
    message,
    hasQueueItem: Boolean(hasQueueItem),
    youtubeVideoId,
    useFallback: Boolean(useFallback),
    fallbackPlaylistId,
    track: hasAnyTrackField ? track : null,
    raw: payload,
  }
}

export const jukeboxApi = {
  requestTrack: async ({ DeezerTrackId, TableCode, RequestedBy }) => {
    const raw = await apiClient.post('/api/jukebox/request', {
      DeezerTrackId,
      TableCode,
      RequestedBy,
    })
    return normalizeRequestResponse(raw)
  },

  next: async ({ ForceFinishCurrent }) => {
    const raw = await apiClient.post('/api/jukebox/next', {
      ForceFinishCurrent,
    })
    return normalizeNextResponse(raw)
  },

  recover: async () => {
    const raw = await apiClient.post('/api/jukebox/recover', {})
    return normalizeRecoverResponse(raw)
  },

  reorder: async ({ queueId, newPosition }) => {
    const raw = await apiClient.post('/api/jukebox/reorder', {
      QueueId: queueId,
      NewPosition: newPosition,
    })
    return unwrapEnvelope(raw)
  },

  async getQueue() {
    const raw = await apiClient.get('/api/jukebox/queue')

    const ok = raw?.Ok ?? raw?.ok ?? false
    const message = raw?.Message ?? raw?.message ?? null
    const data = raw?.Data ?? raw?.data ?? null

    return {
      ok: Boolean(ok),
      message,
      items: Array.isArray(data) ? data : [],
      raw,
    }
  },
}
