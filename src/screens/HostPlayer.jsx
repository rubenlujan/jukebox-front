import { useEffect, useMemo, useRef, useState } from 'react'
import { jukeboxApi } from '../api/jukeboxApi'
import { loadYouTubeIframeAPI, destroyYouTubePlayer } from '../utils/youtube'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { useQueuePoll } from '../hooks/useQueuePoll'

const PLAYER_ELEMENT_ID = 'idol-yt-player'
const DEFAULT_VOLUME = 80

function safeText(v) {
  return v === null || v === undefined ? '' : String(v)
}

export const HostPlayer = () => {
  const playerRef = useRef(null)
  const ytRef = useRef(null)
  const busyNextRef = useRef(false)
  const mountedRef = useRef(false)
  const playerReadyPromiseRef = useRef(null)
  const pendingFallbackIdRef = useRef(null)
  const lastYtErrorRef = useRef(null)
  const fallbackSkipRef = useRef(0)
  const fallbackListIdRef = useRef(null)
  const lastAutoQueueIdRef = useRef(null)

  const [status, setStatus] = useState('init') // init | recovering | playing | idle | fallback | error
  const [nowPlaying, setNowPlaying] = useState(null) // { youtubeVideoId, track }
  const [fallback, setFallback] = useState({
    useFallback: false,
    playlistId: null,
  })
  const [lastError, setLastError] = useState('')
  const [forceFinishCurrent, setForceFinishCurrent] = useState(true)

  // UI listo: conecta aquí /queue luego
  const {
    loading: queueLoading,
    error: queueError,
    items: queueRaw,
  } = useQueuePoll({ intervalMs: 3000 })

  const queueNowPlaying = useMemo(() => {
    const arr = Array.isArray(queueRaw) ? queueRaw : []
    return arr.find((x) => x.Status === 1) || null
  }, [queueRaw])

  const queueItems = useMemo(() => {
    const arr = Array.isArray(queueRaw) ? queueRaw : []
    // Status=1 es Now Playing → NO se lista a la derecha
    return arr
      .filter((x) => x.Status !== 1)
      .sort(
        (a, b) =>
          new Date(a.EnqueuedAtUtc).getTime() -
          new Date(b.EnqueuedAtUtc).getTime(),
      )
  }, [queueRaw])

  // ✅ Si estamos en fallback (playlist default) o idle, y entra una petición,
  // la tomamos automáticamente sin esperar al botón Next.
  useEffect(() => {
    const nextId = queueItems?.[0]?.QueueId ?? null

    // Si no hay cola, resetea para permitir auto-tomar la próxima vez
    if (!nextId) {
      lastAutoQueueIdRef.current = null
      return
    }

    // Solo auto-tomar si estamos en fallback o idle (no interrumpir requests reales)
    if (status !== 'fallback' && status !== 'idle') return

    // Evitar reentradas / loops por el polling
    if (busyNextRef.current) return
    if (lastAutoQueueIdRef.current === nextId) return

    lastAutoQueueIdRef.current = nextId

    // En fallback, sí queremos "salir" del default y brincar al request
    setForceFinishCurrent(true)
    void handleNext({
      reason:
        status === 'fallback'
          ? 'auto_take_from_fallback'
          : 'auto_take_from_idle',
    })
  }, [queueItems, status])

  const title = useMemo(() => {
    // Preferir track del flujo /next (trae info completa)
    const t = nowPlaying?.track
    if (t) {
      const name = t.TrackName || ''
      const artist = t.ArtistName || ''
      return name && artist ? `${name} — ${artist}` : name || artist || ''
    }

    // Si recover dejó track null, usa el item Status=1 de /queue
    if (queueNowPlaying) {
      const name = queueNowPlaying.TrackName || ''
      const artist = queueNowPlaying.ArtistName || ''
      return name && artist ? `${name} — ${artist}` : name || artist || ''
    }

    return ''
  }, [nowPlaying, queueNowPlaying])

  function createPlayer({ videoId = '', listId = null } = {}) {
    const YT = ytRef.current
    if (!YT) throw new Error('YT API no disponible')

    destroyYouTubePlayer(playerRef.current)
    playerRef.current = null

    const mount = document.getElementById(PLAYER_ELEMENT_ID)
    if (mount) mount.innerHTML = ''

    const effectiveVideoId = listId ? 'videoseries' : videoId

    return new Promise((resolve, reject) => {
      const p = new YT.Player(PLAYER_ELEMENT_ID, {
        width: '100%',
        height: '100%',
        videoId: effectiveVideoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          ...(listId
            ? {
                list: listId,
                listType: 'playlist',
              }
            : {}),
        },
        events: {
          onReady: (e) => {
            try {
              e.target.setVolume(DEFAULT_VOLUME)
            } catch {}
            resolve(p)
            try {
              e.target.playVideo()
            } catch {}
          },
          onStateChange: (e) => {
            const s = e?.data
            if (s === 1)
              setStatus((prev) => (prev === 'recovering' ? 'playing' : prev))
            if (s === 0) void handleNext({ reason: 'ended' })
          },
          onError: (e) => {
            const code = e?.data

            if ((code === 101 || code === 150) && status === 'fallback') {
              fallbackSkipRef.current += 1

              if (fallbackSkipRef.current <= 8) {
                setLastError(
                  `YouTube bloqueó embed (code ${code}). Probando siguiente en fallback… (intento ${fallbackSkipRef.current}/8)`,
                )

                try {
                  if (typeof p.nextVideo === 'function') {
                    p.nextVideo()
                    return
                  }
                  if (typeof p.playVideo === 'function') {
                    p.playVideo()
                    return
                  }
                } catch {}
              }

              setLastError(
                `Fallback bloqueado por restricciones de YouTube (code ${code}). Necesitas un playlist "embed-friendly".`,
              )
              return
            }

            setLastError(`YouTube error code: ${code} (embed/restricción).`)
          },
        },
      })

      playerRef.current = p

      setTimeout(() => {
        if (!playerRef.current)
          reject(new Error('No se pudo inicializar el player'))
      }, 12000)
    })
  }

  async function ensurePlayer() {
    if (playerRef.current) return playerRef.current
    const YT = await loadYouTubeIframeAPI()
    ytRef.current = YT
    const p = await createPlayer()
    return p
  }

  async function playVideoId(videoId) {
    const player = await ensurePlayer()
    if (!videoId) return

    setFallback({ useFallback: false, playlistId: null })
    setNowPlaying((prev) => ({
      youtubeVideoId: videoId,
      track: prev?.track ?? null,
    }))
    setStatus('playing')

    try {
      player.loadVideoById(videoId)
    } catch (err) {
      setLastError(err?.message || 'No se pudo reproducir el video.')
      setStatus('error')
    }
  }

  async function playFallbackPlaylist(playlistId) {
    setFallback({ useFallback: true, playlistId })
    setNowPlaying(null)
    setStatus('fallback')
    setLastError('')

    fallbackSkipRef.current = 0
    fallbackListIdRef.current = playlistId ? String(playlistId).trim() : null

    if (!playlistId) return
    const id = String(playlistId).trim()
    if (!id) return

    try {
      await createPlayer({ listId: id })
    } catch (err) {
      setLastError(err?.message || 'No se pudo iniciar fallback por lista.')
    }
  }

  async function handleRecover() {
    setLastError('')
    setStatus('recovering')

    try {
      const res = await jukeboxApi.recover()

      if (!res.ok) {
        setLastError(res.message || 'Recover falló.')
        setStatus('error')
        return
      }

      if (res.hasNowPlaying && res.youtubeVideoId) {
        setNowPlaying({ youtubeVideoId: res.youtubeVideoId, track: null })
        await playVideoId(res.youtubeVideoId)
        return
      }

      await handleNext({ reason: 'recover_no_nowplaying' })
    } catch (err) {
      setLastError(err?.message || 'Error al recuperar estado del host.')
      setStatus('error')
    }
  }

  async function handleNext({ reason }) {
    if (busyNextRef.current) return
    busyNextRef.current = true
    setLastError('')

    try {
      const res = await jukeboxApi.next({
        ForceFinishCurrent: Boolean(forceFinishCurrent),
      })

      if (!res.ok) {
        setLastError(res.message || `Next falló (${safeText(reason)})`)
        setStatus('error')
        return
      }

      if (res.hasQueueItem && res.youtubeVideoId) {
        const t = res.track
          ? {
              TrackName: res.track.TrackName,
              ArtistName: res.track.ArtistName,
              DurationMs: res.track.DurationMs,
              AlbumImageUrl: res.track.AlbumImageUrl,
            }
          : null

        setNowPlaying({ youtubeVideoId: res.youtubeVideoId, track: t })
        await playVideoId(res.youtubeVideoId)
        return
      }

      if (res.useFallback) {
        await playFallbackPlaylist(res.fallbackPlaylistId)
      } else {
        setNowPlaying(null)
        setFallback({ useFallback: false, playlistId: null })
        setStatus('idle')
      }
    } catch (err) {
      setLastError(
        err?.message || `Error al pedir siguiente (${safeText(reason)})`,
      )
      setStatus('error')
    } finally {
      busyNextRef.current = false
      setForceFinishCurrent(false)
    }
  }

  useEffect(() => {
    mountedRef.current = true

    void (async () => {
      try {
        await ensurePlayer()
        await handleRecover()
      } catch (err) {
        setLastError(err?.message || 'Error inicializando YouTube.')
        setStatus('error')
      }
    })()

    return () => {
      mountedRef.current = false
      destroyYouTubePlayer(playerRef.current)
      playerRef.current = null
      playerReadyPromiseRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-32 left-1/2 h-80 w-[900px] -translate-x-1/2 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute -bottom-24 right-[-120px] h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      {/* Header */}
      <div className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto w-full max-w-[1600px] px-4 py-4 md:px-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <img
                  src="https://hrg-it.com/img/logo-backstage.png"
                  alt="Idol Café"
                  className="h-10 w-auto opacity-90"
                  loading="eager"
                  referrerPolicy="no-referrer"
                />
                <div className="min-w-0">
                  <div className="text-lg font-semibold text-white">
                    Idol Café · Rockola
                  </div>

                  {/* Now Playing debajo del logo (compacto) */}
                  <div className="mt-0.5 truncate text-sm text-white/75">
                    <span className="text-white/55">Now Playing:</span>{' '}
                    <span className="font-semibold text-white">
                      {title ||
                        (status === 'idle' ? 'Esperando solicitudes…' : '—')}
                    </span>
                    {status === 'fallback' ? (
                      <span className="ml-2 rounded-full bg-amber-400/10 px-2 py-0.5 text-[11px] text-amber-100 ring-1 ring-amber-300/20">
                        fallback
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            {/* Controles host */}
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={() => handleRecover()}>
                Recover
              </Button>

              <Button
                onClick={() => {
                  setForceFinishCurrent(true)
                  handleNext({ reason: 'manual_next_force' })
                }}
              >
                Next
              </Button>
            </div>
          </div>

          {lastError ? (
            <div className="mt-3 rounded-2xl bg-red-500/10 p-3 ring-1 ring-red-400/20">
              <div className="text-sm font-semibold text-red-50">Error</div>
              <div className="mt-1 text-sm text-red-50/80">{lastError}</div>
            </div>
          ) : null}
        </div>
        <div className="h-px w-full bg-white/10" />
      </div>

      {/* Main: altura fija tipo TV para empatar panel con frame */}
      <div className="mx-auto w-full max-w-[1600px] px-4 py-4 md:px-6">
        {/* En pantallas XL+ fijamos el alto del área principal para que el panel haga scroll interno */}
        <div className="grid grid-cols-1 gap-4 xl:h-[calc(100vh-140px)] xl:grid-cols-[2.25fr_1fr] xl:items-stretch">
          {/* Player frame (más ancho) */}
          <div className="relative overflow-hidden rounded-[2rem] bg-black ring-1 ring-white/10 xl:h-full">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-0 bg-gradient-to-tr from-fuchsia-500/12 via-transparent to-cyan-500/10" />
              <div className="absolute inset-0 ring-1 ring-inset ring-white/10" />
              <div className="absolute -left-24 top-10 h-56 w-56 rounded-full bg-amber-400/10 blur-3xl" />
            </div>

            {/* IMPORTANTE: ahora es flex-col para que el bezel no rompa el alto */}
            <div className="relative z-[1] flex h-full flex-col">
              {/* Zona video (flex-1) */}
              <div className="relative flex-1">
                <div id={PLAYER_ELEMENT_ID} className="absolute inset-0" />

                {status === 'init' || status === 'recovering' ? (
                  <div className="absolute inset-0 grid place-items-center bg-black/40">
                    <div className="flex items-center gap-2 text-white/85">
                      <Spinner />
                      <div className="text-sm">Inicializando…</div>
                    </div>
                  </div>
                ) : null}

                {status === 'idle' ? (
                  <div className="absolute inset-0 grid place-items-center bg-black/55">
                    <div className="rounded-2xl bg-white/5 px-4 py-3 text-center ring-1 ring-white/10">
                      <div className="text-sm font-semibold text-white">
                        Sin cola
                      </div>
                      <div className="mt-1 text-sm text-white/60">
                        Esperando solicitudes…
                      </div>
                    </div>
                  </div>
                ) : null}

                {status === 'fallback' && !fallback.playlistId ? (
                  <div className="absolute inset-0 grid place-items-center bg-black/55">
                    <div className="rounded-2xl bg-white/5 px-4 py-3 text-center ring-1 ring-white/10">
                      <div className="text-sm font-semibold text-white">
                        Fallback activo
                      </div>
                      <div className="mt-1 text-sm text-white/60">
                        Backend indicó fallback, pero no hay PlaylistId
                        configurado.
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Bezel fijo */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="text-xs text-white/40">
                  Idol Café · Host Screen
                </div>
                <div className="text-xs text-white/35">
                  {status === 'playing' ? 'Reproduciendo' : ' '}
                </div>
              </div>
            </div>
          </div>

          {/* Queue panel: misma altura del frame + scroll interno */}
          <div className="rounded-[2rem] bg-white/[0.03] ring-1 ring-white/10 backdrop-blur xl:h-full">
            <div className="flex h-full flex-col p-4">
              {/* Header fijo */}
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold tracking-wide text-white/80">
                  🎶 Canciones pedidas
                </div>
                <div className="text-xs text-white/45">
                  {queueItems.length} en cola
                </div>
              </div>

              {/* Lista scrolleable */}
              <div className="mt-3 flex-1 overflow-y-auto pr-1">
                {queueLoading ? (
                  <div className="rounded-2xl bg-black/20 p-4 text-sm text-white/60 ring-1 ring-white/10">
                    Cargando cola…
                  </div>
                ) : queueError ? (
                  <div className="rounded-2xl bg-red-500/10 p-4 text-sm text-red-50 ring-1 ring-red-400/20">
                    {queueError}
                  </div>
                ) : queueItems.length === 0 ? (
                  <div className="rounded-2xl bg-black/20 p-4 text-sm text-white/60 ring-1 ring-white/10">
                    Aún no hay solicitudes.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {queueItems.map((it, idx) => (
                      <div
                        key={
                          it.id ??
                          it.QueueId ??
                          `${it.youtubeVideoId ?? 'q'}-${idx}`
                        }
                        className="flex items-center gap-3 rounded-2xl bg-black/20 p-3 ring-1 ring-white/10"
                      >
                        <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 text-xs font-semibold text-white/70 ring-1 ring-white/10">
                          {idx + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-white">
                            {it.trackName ?? it.TrackName ?? '—'}
                          </div>
                          <div className="truncate text-xs text-white/60">
                            {it.artistName ?? it.ArtistName ?? ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer fijo (opcional para TV) */}
              <div className="mt-3 flex items-center justify-between text-[11px] text-white/35">
                <span>Tip: la lista hace scroll</span>
                <span className="hidden sm:inline">Backstage</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
