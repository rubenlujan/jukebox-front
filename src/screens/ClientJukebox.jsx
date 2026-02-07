// src/screens/ClientJukebox.jsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { deezerApi } from '../api/deezerApi'
import { jukeboxApi } from '../api/jukeboxApi'
import { useDebouncedValue } from '../utils/debounce'
import { clampText, formatDuration } from '../utils/format'
import { TrackCard } from '../components/TrackCard'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { Spinner } from '../components/ui/Spinner'
import { useToast } from '../components/ui/ToastProvider'
import { GlassCard } from '../components/ui/GlassCard'
import { VinylDeck } from '../components/VinylDeck'
import { useQueuePoll } from '../hooks/useQueuePoll'
import rockHand from '../assets/rock-hand.png'

const LIMIT_DEFAULT = 20
const FIXED_TABLE_CODE = 'BAR'
const AUTO_CLOSE_SUCCESS_MS = 3000

function normalizeTracks(payload) {
  const data = payload?.Data ?? payload?.data
  const tracks = data?.Tracks ?? data?.tracks
  return Array.isArray(tracks) ? tracks : []
}

export const ClientJukebox = () => {
  const toast = useToast()

  const [requestedBy, setRequestedBy] = useState('')
  const [q, setQ] = useState('')
  const qDebounced = useDebouncedValue(q, 350)

  const [limit] = useState(LIMIT_DEFAULT)
  const [loading, setLoading] = useState(false)
  const [tracks, setTracks] = useState([])
  const [errorMsg, setErrorMsg] = useState('')

  const [selected, setSelected] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // ✅ Modal states: confirm | success | error
  const [confirmState, setConfirmState] = useState('confirm')
  const [successMsg, setSuccessMsg] = useState('')
  const [modalErrorMsg, setModalErrorMsg] = useState('')

  const canSearch = useMemo(() => qDebounced.trim().length >= 2, [qDebounced])
  const reqIdRef = useRef(0)

  const {
    loading: queueLoading,
    error: queueError,
    items: queueItems,
  } = useQueuePoll({ intervalMs: 3000 })

  const nowPlaying = useMemo(() => {
    return (queueItems || []).find((x) => x.Status === 1) || null
  }, [queueItems])

  const upcoming = useMemo(() => {
    return (queueItems || [])
      .filter((x) => x.Status !== 1)
      .sort((a, b) => (a.QueueId ?? 0) - (b.QueueId ?? 0))
  }, [queueItems])

  // ✅ Auto-close SOLO en success
  useEffect(() => {
    if (!confirmOpen) return
    if (confirmState !== 'success') return

    const t = setTimeout(() => {
      if (submitting) return
      closeConfirm()
    }, AUTO_CLOSE_SUCCESS_MS)

    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmOpen, confirmState])

  useEffect(() => {
    const myReqId = ++reqIdRef.current

    async function run() {
      setErrorMsg('')

      if (!canSearch) {
        setTracks([])
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const res = await deezerApi.searchTracks({
          q: qDebounced.trim(),
          limit,
        })
        const list = normalizeTracks(res)
        if (reqIdRef.current === myReqId) setTracks(list)
      } catch (err) {
        if (reqIdRef.current === myReqId) {
          setTracks([])
          setErrorMsg(err?.message || 'Error al buscar en Deezer.')
        }
      } finally {
        if (reqIdRef.current === myReqId) setLoading(false)
      }
    }

    run()
  }, [qDebounced, limit, canSearch])

  function openConfirm(track) {
    setSelected(track)
    setConfirmState('confirm')
    setSuccessMsg('')
    setModalErrorMsg('')
    setConfirmOpen(true)
  }

  function closeConfirm() {
    if (submitting) return
    setConfirmOpen(false)
    setSelected(null)
    setConfirmState('confirm')
    setSuccessMsg('')
    setModalErrorMsg('')
  }

  async function submitRequest() {
    if (!selected || submitting) return

    setSubmitting(true)
    try {
      const res = await jukeboxApi.requestTrack({
        DeezerTrackId: selected.DeezerTrackId,
        TableCode: FIXED_TABLE_CODE,
        RequestedBy: requestedBy.trim() || undefined,
      })

      // ❌ Error de negocio → mostrar en MODAL (no toast)
      if (!res.ok || !res.accepted) {
        setModalErrorMsg(
          res.uxMessage ||
            res.message ||
            'No se pudo procesar la solicitud. Intenta con otra opción.',
        )
        setConfirmState('error')
        return
      }

      // ✅ Success → modal success
      const msg = res.queueId
        ? `Tu canción está en el número ${res.queueId} de la lista de reproducción.`
        : 'Tu solicitud fue aceptada.'

      setSuccessMsg(msg)
      setConfirmState('success')
    } catch (err) {
      // ❌ Error de red/servidor → mostrar en MODAL (no toast)
      setModalErrorMsg(err?.message || 'No se pudo enviar la solicitud.')
      setConfirmState('error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[860px] -translate-x-1/2 rounded-full bg-fuchsia-600/20 blur-[120px]" />
        <div className="absolute -bottom-40 left-1/3 h-[520px] w-[860px] -translate-x-1/2 rounded-full bg-cyan-500/15 blur-[120px]" />
      </div>

      <div className="relative mx-auto w-full max-w-6xl px-4 py-6">
        <GlassCard className="overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-cyan-900/20 px-5 py-4">
            <div className="flex items-center gap-3">
              <img
                src="https://hrg-it.com/img/logo-backstage.png"
                alt="Idol Café"
                className="h-20 w-20 md:h-12 md:w-12 rounded-full bg-black/40 ring-1 ring-white/20 object-contain p-1"
              />

              <div className="min-w-0">
                <div className="text-xl font-semibold tracking-wide">
                  Rockola Idol Café
                </div>
                <div className="mt-0.5 text-sm text-white/70">
                  Busca tu rola y agrégala a la lista. Que suene el metal. 🤘
                </div>
              </div>
            </div>
          </div>

          <div className="h-px w-full bg-white/10" />

          {/* Body */}
          <div className="p-4 md:p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[420px_1fr] md:items-start">
              {/* VinylDeck solo en md+ */}
              <div className="hidden md:block md:col-start-1 md:row-span-3">
                <VinylDeck
                  queueLoading={queueLoading}
                  queueError={queueError}
                  nowPlaying={nowPlaying}
                  upcoming={upcoming}
                />
              </div>

              {/* Buscar + Tip */}
              <div className="md:col-start-2 md:row-start-1 space-y-4">
                <div className="rounded-[26px] bg-white/5 ring-1 ring-white/10 p-4 md:p-5">
                  <div className="text-sm font-semibold tracking-wide text-white/90">
                    BUSCAR
                  </div>

                  <div className="mt-3 flex flex-col gap-3">
                    <div className="rounded-2xl bg-black/30 ring-1 ring-white/10 px-3 py-2">
                      <Input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Metallica, Pantera, Slipknot…"
                      />
                    </div>

                    <div className="rounded-2xl bg-black/20 ring-1 ring-white/10 px-3 py-2">
                      <Input
                        value={requestedBy}
                        onChange={(e) => setRequestedBy(e.target.value)}
                        placeholder="Tu nombre (opcional)"
                        maxLength={32}
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-[26px] bg-white/5 ring-1 ring-white/10 p-4 md:p-5">
                  <div className="text-sm text-white/75 text-center">
                    Tip: prueba con{' '}
                    <span className="font-semibold text-white">
                      “metallica one”
                    </span>{' '}
                    o{' '}
                    <span className="font-semibold text-white">
                      “pantera walk”
                    </span>
                    .
                  </div>
                  <div className="mt-2 text-xs text-white/50 text-center">
                    El tiempo es aproximado. Depende de la duración de los
                    videos en fila.
                  </div>
                </div>
              </div>

              {/* Resultados */}
              <div className="md:col-start-2 md:row-start-2">
                <div className="rounded-[26px] bg-white/5 ring-1 ring-white/10 p-4 md:p-5">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold tracking-wide text-white/90">
                      RESULTADOS
                    </div>

                    {loading ? (
                      <div className="flex items-center gap-2 text-xs text-white/70">
                        <Spinner />
                        <span>Buscando…</span>
                      </div>
                    ) : null}
                  </div>

                  {errorMsg ? (
                    <div className="mt-3 rounded-2xl bg-red-500/10 p-3 ring-1 ring-red-400/20">
                      <div className="text-sm font-semibold text-red-50">
                        Error
                      </div>
                      <div className="mt-1 text-sm text-red-50/80">
                        {errorMsg}
                      </div>
                    </div>
                  ) : null}

                  {!loading && canSearch && !errorMsg && tracks.length === 0 ? (
                    <div className="mt-3 rounded-2xl bg-black/20 p-3 ring-1 ring-white/10 text-sm text-white/60">
                      Sin resultados. Intenta con otro nombre o solo el artista.
                    </div>
                  ) : null}

                  {!canSearch ? (
                    <div className="mt-3 rounded-2xl bg-black/20 p-3 ring-1 ring-white/10 text-sm text-white/60">
                      Escribe al menos 2 caracteres para ver resultados.
                    </div>
                  ) : null}

                  <div className="mt-4 space-y-3">
                    {tracks.map((t) => (
                      <TrackCard
                        key={t.DeezerTrackId}
                        track={t}
                        onSelect={openConfirm}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Now Playing (solo mobile) */}
              <div className="md:hidden">
                <div className="rounded-[26px] bg-white/5 ring-1 ring-white/10 p-4">
                  <div className="text-sm font-semibold tracking-wide text-white/90">
                    NOW PLAYING
                  </div>

                  {queueLoading ? (
                    <div className="mt-3 flex items-center gap-2 text-xs text-white/70">
                      <Spinner />
                      <span>Cargando…</span>
                    </div>
                  ) : queueError ? (
                    <div className="mt-3 rounded-2xl bg-red-500/10 p-3 ring-1 ring-red-400/20 text-sm text-red-50/80">
                      {queueError}
                    </div>
                  ) : nowPlaying ? (
                    <div className="mt-3 rounded-2xl bg-black/20 p-3 ring-1 ring-white/10">
                      <div className="truncate text-sm font-semibold text-white/90">
                        {nowPlaying.TrackName}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-white/60">
                        {nowPlaying.ArtistName}
                      </div>
                      <div className="mt-1 text-xs text-white/45">
                        {formatDuration(nowPlaying.DurationMs)} ·{' '}
                        {nowPlaying.TableCode || 'BAR'}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 rounded-2xl bg-black/20 p-3 ring-1 ring-white/10 text-sm text-white/55">
                      —
                    </div>
                  )}
                </div>
              </div>

              {/* Lista (solo mobile) */}
              <div className="md:hidden">
                <div className="rounded-[26px] bg-white/5 ring-1 ring-white/10 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-white tracking-wide">
                      PRÓXIMAS CANCIONES
                    </div>
                    <div className="text-xs text-white/50">
                      {upcoming?.length || 0}
                    </div>
                  </div>

                  {queueError ? (
                    <div className="mt-3 rounded-2xl bg-red-500/10 p-3 ring-1 ring-red-400/20 text-sm text-red-50/80">
                      {queueError}
                    </div>
                  ) : null}

                  {!queueLoading &&
                  !queueError &&
                  (!upcoming || upcoming.length === 0) ? (
                    <div className="mt-3 rounded-2xl bg-black/20 p-3 ring-1 ring-white/10 text-sm text-white/55">
                      Aún no hay canciones en cola.
                    </div>
                  ) : null}

                  <div className="mt-3 space-y-2">
                    {(upcoming || []).slice(0, 5).map((x) => (
                      <div
                        key={x.QueueId}
                        className="flex items-center gap-3 rounded-2xl bg-white/5 p-2 ring-1 ring-white/10"
                      >
                        <img
                          src={x.AlbumImageUrl}
                          alt=""
                          className="h-10 w-10 rounded-xl object-cover ring-1 ring-white/10"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-white/90">
                            {x.TrackName}
                          </div>
                          <div className="truncate text-xs text-white/60">
                            {x.ArtistName}
                          </div>
                        </div>
                        <div className="text-xs text-white/45">
                          {formatDuration(x.DurationMs)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Modal: confirm / success / error */}
      <Modal
        open={confirmOpen}
        title="Confirmar petición"
        onClose={closeConfirm}
      >
        {confirmState === 'confirm' && selected ? (
          <div className="space-y-4">
            <div className="flex gap-3">
              <img
                src={selected.AlbumImageUrl}
                alt="cover"
                className="h-16 w-16 rounded-2xl object-cover ring-1 ring-white/10"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-white">
                  {selected.TrackName}
                </div>
                <div className="mt-0.5 truncate text-xs text-white/65">
                  {selected.ArtistName}
                </div>
                <div className="mt-1 text-xs text-white/45">
                  {formatDuration(selected.DurationMs)}
                </div>
              </div>
            </div>

            {requestedBy.trim() ? (
              <div className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
                <div className="text-xs text-white/60">Solicitado por</div>
                <div className="mt-0.5 text-sm font-semibold text-white">
                  {clampText(requestedBy.trim(), 32)}
                </div>
              </div>
            ) : null}

            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={closeConfirm}
                disabled={submitting}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={submitRequest}
                disabled={submitting}
                className="flex-1"
              >
                {submitting ? 'Enviando…' : 'Pedir'}
              </Button>
            </div>

            <div className="text-xs text-white/45">
              Si no hay match, está bloqueada o no hay cupo, verás el mensaje
              del sistema.
            </div>
          </div>
        ) : null}

        {confirmState === 'success' ? (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/90 ring-1 ring-white/30 animate-rock-in">
              <img
                src={rockHand}
                alt="Rock on"
                className="h-14 w-14 object-contain"
              />
            </div>

            <div className="space-y-1 animate-pop-text">
              <div className="text-lg font-semibold text-white">
                ¡Petición enviada!
              </div>
              <div className="text-sm text-white/70">
                {successMsg || 'Tu solicitud fue aceptada.'}
              </div>
            </div>

            <Button onClick={closeConfirm} className="mx-auto">
              Cerrar
            </Button>

            <div className="text-[11px] text-white/45">
              Se cerrará automáticamente…
            </div>
          </div>
        ) : null}

        {confirmState === 'error' ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-red-500/10 p-4 ring-1 ring-red-400/20">
              <div className="text-sm font-semibold text-red-50">
                No se pudo pedir
              </div>
              <div className="mt-1 text-sm text-red-50/80">
                {modalErrorMsg || 'Ocurrió un error. Intenta nuevamente.'}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" onClick={closeConfirm} className="flex-1">
                Cerrar
              </Button>
            </div>

            <div className="text-xs text-white/45">
              Puedes intentar con otra canción si la opción está bloqueada.
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
