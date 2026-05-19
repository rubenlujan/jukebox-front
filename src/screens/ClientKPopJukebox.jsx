// src/screens/ClientKPopJukebox.jsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { deezerApi } from '../api/deezerApi'
import { jukeboxApi } from '../api/jukeboxApi'
import { clampText, formatDuration } from '../utils/format'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { GlassCard } from '../components/ui/GlassCard'
import { useQueuePoll } from '../hooks/useQueuePoll'

const LIMIT_DEFAULT = 20
const FIXED_TABLE_CODE = 'BAR'
const AUTO_CLOSE_SUCCESS_MS = 3000
const MOBILE_INITIAL_RESULTS = 6

function normalizeTracks(payload) {
  const data = payload?.Data ?? payload?.data
  const tracks = data?.Tracks ?? data?.tracks
  return Array.isArray(tracks) ? tracks : []
}

const KPopModal = ({ open, title, onClose, children }) => {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md scale-100 animate-in zoom-in-95 duration-200">
        <div className="overflow-hidden rounded-3xl bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(236,72,153,1)]">
          {title && (
            <div className="bg-pink-500 border-b-4 border-black px-6 py-4">
              <h3 className="text-2xl font-black italic tracking-tighter text-white uppercase transform -skew-x-6 drop-shadow-md">
                {title}
              </h3>
            </div>
          )}
          <div className="p-6 text-black">{children}</div>
        </div>
      </div>
    </div>
  )
}

export const ClientKPopJukebox = () => {
  const [requestedBy, setRequestedBy] = useState('')
  const [q, setQ] = useState('')
  const [submittedQ, setSubmittedQ] = useState('')
  const searchInputRef = useRef(null)

  const [isMobile, setIsMobile] = useState(false)
  const [mobileShowAll, setMobileShowAll] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const apply = () => setIsMobile(mq.matches)
    apply()
    if (mq.addEventListener) mq.addEventListener('change', apply)
    else mq.addListener(apply)
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', apply)
      else mq.removeListener(apply)
    }
  }, [])

  const [limit] = useState(LIMIT_DEFAULT)
  const [loading, setLoading] = useState(false)
  const [tracks, setTracks] = useState([])
  const [errorMsg, setErrorMsg] = useState('')

  const handleSearch = () => {
    const term = (q ?? '').trim()
    setSubmittedQ(term)
    if (searchInputRef.current) searchInputRef.current.blur()
  }

  const handleClear = () => {
    setQ('')
    setSubmittedQ('')
    setTracks([])
    setErrorMsg('')
    setLoading(false)
  }

  useEffect(() => {
    if (!isMobile) return
    setMobileShowAll(false)
  }, [isMobile, submittedQ, tracks])

  const [selected, setSelected] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [confirmState, setConfirmState] = useState('confirm')
  const [successMsg, setSuccessMsg] = useState('')
  const [modalErrorMsg, setModalErrorMsg] = useState('')

  const canSearch = useMemo(() => submittedQ.trim().length >= 2, [submittedQ])
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
    return (queueItems || []).filter((x) => x.Status !== 1)
  }, [queueItems])

  useEffect(() => {
    if (!confirmOpen) return
    if (confirmState !== 'success') return
    const t = setTimeout(() => {
      if (submitting) return
      closeConfirm()
    }, AUTO_CLOSE_SUCCESS_MS)
    return () => clearTimeout(t)
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
          q: submittedQ.trim(),
          limit,
        })

        if (reqIdRef.current === myReqId) {
          const isOk = res?.Ok ?? res?.ok ?? true
          if (!isOk) {
            setTracks([])
            setErrorMsg(
              res?.Message ?? res?.message ?? 'Error al buscar en Deezer.',
            )
          } else {
            const list = normalizeTracks(res)
            setTracks(list)
          }
        }
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
  }, [submittedQ, limit, canSearch])

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
      if (!res.ok || !res.accepted) {
        setModalErrorMsg(
          res.uxMessage ||
            res.message ||
            'No se pudo procesar la solicitud. Intenta con otra opción.',
        )
        setConfirmState('error')
        return
      }
      const msg = res.queueId
        ? `Tu canción está en el número ${res.queueId} de la lista.`
        : 'Tu solicitud fue aceptada.'
      setSuccessMsg(msg)
      setConfirmState('success')
    } catch (err) {
      const errMsg =
        err?.details?.Message ||
        err?.details?.message ||
        err?.message ||
        'No se pudo enviar la solicitud.'
      setModalErrorMsg(errMsg)
      setConfirmState('error')
    } finally {
      setSubmitting(false)
    }
  }

  const hasMoreOnMobile = isMobile && tracks.length > MOBILE_INITIAL_RESULTS
  const visibleTracks = useMemo(() => {
    if (!isMobile) return tracks
    if (mobileShowAll) return tracks
    return tracks.slice(0, MOBILE_INITIAL_RESULTS)
  }, [isMobile, mobileShowAll, tracks])

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 text-slate-900 font-sans selection:bg-pink-200 selection:text-pink-900">
      {/* Background decorative elements */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] h-[70%] w-[70%] rounded-full bg-pink-200/40 blur-[120px] mix-blend-multiply" />
        <div className="absolute top-[40%] -right-[10%] h-[60%] w-[60%] rounded-full bg-purple-200/40 blur-[120px] mix-blend-multiply" />
        <div className="absolute bottom-[-10%] left-[20%] h-[50%] w-[50%] rounded-full bg-indigo-200/40 blur-[100px] mix-blend-multiply" />
      </div>

      <div className="relative mx-auto w-full max-w-5xl px-4 py-8">
        {/* Header Section with distinct styling */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center p-1.5 rounded-full bg-white/60 backdrop-blur-md border border-white/50 mb-4 shadow-sm">
            <img
              src="https://hrg-it.com/img/Idol_Logo_Small.jpg"
              alt="Idol Café"
              className="h-10 w-10 rounded-full object-contain"
            />
            <span className="px-4 font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-300 to-purple-300 tracking-wider">
              IDOL CAFÉ K-POP
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 mb-2 drop-shadow-sm">
            K-POP JUKEBOX
          </h1>
          <p className="text-slate-600 font-medium">
            Busca tu bias y agrégalo a la lista. Stan talent. ✨
          </p>
        </div>

        <GlassCard className="overflow-hidden border-white/50 shadow-xl bg-white/30 backdrop-blur-xl">
          <div className="p-5 md:p-8 space-y-8">
            {/* Search Section */}
            <div className="space-y-4">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-pink-400 to-purple-400 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative flex gap-2 bg-white/80 p-2 rounded-2xl border border-white/50 ring-1 ring-black/5">
                  <input
                    ref={searchInputRef}
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleSearch()
                      }
                    }}
                    placeholder="BTS, Twice, NewJeans, Stray Kids..."
                    className="flex-1 min-w-0 bg-transparent border-none focus:ring-0 placeholder:text-slate-400 text-lg h-12 text-slate-900 outline-none"
                  />
                  {q && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="h-12 px-3 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors font-medium"
                    >
                      Limpiar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSearch}
                    className="shrink-0 h-12 px-6 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold shadow-lg shadow-pink-200 border-none tracking-wide active:scale-95 transition-transform"
                  >
                    BUSCAR
                  </button>
                </div>
              </div>

              {/* Requested By Input */}
              <div className="hidden flex justify-center">
                <input
                  value={requestedBy}
                  onChange={(e) => setRequestedBy(e.target.value)}
                  placeholder="Tu nombre (opcional)"
                  maxLength={32}
                  className="bg-transparent text-center text-sm text-slate-500 placeholder:text-slate-400 focus:outline-none focus:text-pink-600 transition-colors"
                />
              </div>
            </div>

            {/* Results Section */}
            <div>
              <div className="flex items-center justify-between mb-4 px-1">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <span className="text-pink-500">★</span> RESULTADOS
                </h2>
                {loading && (
                  <div className="flex items-center gap-2 text-xs text-pink-600 animate-pulse">
                    <Spinner className="text-pink-500 h-4 w-4" />
                    <span>Buscando...</span>
                  </div>
                )}
              </div>

              <div className="bg-white/40 rounded-3xl p-1 border border-white/50 min-h-[100px]">
                {errorMsg ? (
                  <div className="p-6 text-center text-red-600 bg-red-50 rounded-2xl m-2">
                    {errorMsg}
                  </div>
                ) : !loading && canSearch && tracks.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    Sin resultados. ¡Intenta con otro idol!
                  </div>
                ) : !canSearch ? (
                  <div className="p-8 text-center text-slate-500">
                    Escribe al menos 2 caracteres para buscar.
                  </div>
                ) : (
                  <div className="grid gap-2 p-2">
                    {visibleTracks.map((t) => (
                      <div
                        key={t.DeezerTrackId}
                        className="group relative flex items-center gap-4 p-3 rounded-2xl hover:bg-white/60 transition-all border border-transparent hover:border-pink-200 bg-white/20"
                      >
                        <img
                          src={t.AlbumImageUrl}
                          className="shrink-0 h-16 w-16 rounded-xl object-cover shadow-sm group-hover:scale-105 transition-transform duration-300"
                          alt=""
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-slate-900 truncate text-base group-hover:text-pink-600 transition-colors">
                            {t.TrackName}
                          </div>
                          <div className="text-slate-500 truncate text-sm">
                            {t.ArtistName}
                          </div>
                        </div>
                        <Button
                          onClick={() => openConfirm(t)}
                          className="shrink-0 rounded-full h-16 w-16 p-0 flex items-center justify-center bg-white/40 hover:bg-white/80 text-pink-500 hover:text-pink-600 transition-all border-none ring-1 ring-white/60 shadow-sm"
                        >
                          <img
                            src="https://hrg-it.com/img/kpop.png"
                            alt="Select"
                            className="w-10 h-10 object-contain"
                          />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {hasMoreOnMobile && !mobileShowAll && (
                  <div className="p-2">
                    <button
                      onClick={() => setMobileShowAll(true)}
                      className="w-full py-3 rounded-xl bg-white/50 text-slate-600 text-sm font-medium hover:bg-white/80 transition-colors"
                    >
                      Ver más resultados
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Now Playing & Queue Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Now Playing */}
              <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-3xl p-6 border border-pink-100 relative overflow-hidden shadow-sm">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-24 h-24 text-pink-600"
                  >
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                  </svg>
                </div>
                <h3 className="text-xs font-bold tracking-widest text-pink-400 mb-4 uppercase">
                  Sonando Ahora
                </h3>

                {nowPlaying ? (
                  <div className="relative z-10">
                    <div className="text-2xl font-black text-slate-900 mb-1 leading-tight line-clamp-2">
                      {nowPlaying.TrackName}
                    </div>
                    <div className="text-lg text-slate-600 mb-4">
                      {nowPlaying.ArtistName}
                    </div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-pink-100 text-xs text-pink-600 shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse"></span>
                      Playing
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-400 italic">
                    Esperando el siguiente hit...
                  </div>
                )}
              </div>

              {/* Queue */}
              <div className="bg-white/40 rounded-3xl p-6 border border-white/50 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold tracking-widest text-slate-500 uppercase">
                    Siguiente
                  </h3>
                  <span className="text-xs font-medium bg-white px-2 py-1 rounded-lg text-slate-600 shadow-sm">
                    {upcoming?.length || 0}
                  </span>
                </div>

                <div className="space-y-3">
                  {(!upcoming || upcoming.length === 0) && (
                    <div className="text-sm text-slate-400 text-center py-4">
                      La fila está vacía. ¡Sé el primero!
                    </div>
                  )}
                  {(upcoming || []).slice(0, 4).map((x, i) => (
                    <div key={x.QueueId} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-400 w-4">
                        {i + 1}
                      </span>
                      <img
                        src={x.AlbumImageUrl}
                        className="h-10 w-10 rounded-lg object-cover opacity-90 shadow-sm"
                        alt=""
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-slate-800 truncate">
                          {x.TrackName}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          {x.ArtistName}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Modal */}
      <KPopModal
        open={confirmOpen}
        title="Confirmar Petición"
        onClose={closeConfirm}
      >
        {confirmState === 'confirm' && selected ? (
          <div className="space-y-6">
            <div className="flex flex-col items-center text-center gap-4">
              <img
                src={selected.AlbumImageUrl}
                alt="cover"
                className="h-32 w-32 rounded-xl object-cover border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              />
              <div className="min-w-0 flex-1">
                <div className="text-xl font-black text-black leading-tight uppercase">
                  {selected.TrackName}
                </div>
                <div className="mt-1 text-base font-bold text-pink-600">
                  {selected.ArtistName}
                </div>
              </div>
            </div>

            {requestedBy.trim() && (
              <div className="text-center text-sm font-bold text-black bg-pink-100 border-2 border-black py-2 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                Pidiendo como{' '}
                <span className="text-pink-600">{requestedBy}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={closeConfirm}
                disabled={submitting}
                className="px-4 py-3 rounded-xl hover:bg-gray-100 text-zinc-600 hover:text-black font-bold transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={submitRequest}
                disabled={submitting}
                className="px-4 py-3 rounded-xl bg-black hover:bg-zinc-800 text-white font-bold border-2 border-black shadow-[4px_4px_0px_0px_rgba(236,72,153,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(236,72,153,1)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Enviando...' : 'Pedir Canción'}
              </button>
            </div>
          </div>
        ) : null}

        {confirmState === 'success' ? (
          <div className="space-y-6 text-center py-4">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-pink-100 border-2 border-black animate-bounce-gentle">
              <img
                src="https://hrg-it.com/img/admirador.png"
                alt="K-Pop Love"
                className="h-16 w-16 object-contain drop-shadow-md"
              />
            </div>

            <div className="space-y-2">
              <div className="text-2xl font-black text-black uppercase tracking-tighter">
                ¡Daebak!
              </div>
              <div className="text-sm font-medium text-zinc-600 px-4">
                {successMsg || 'Tu canción ha sido agregada a la fila.'}
              </div>
            </div>

            <button
              type="button"
              onClick={closeConfirm}
              className="mx-auto block px-6 py-3 rounded-xl bg-black hover:bg-zinc-800 text-white font-bold border-2 border-black min-w-[120px] shadow-[4px_4px_0px_0px_rgba(236,72,153,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(236,72,153,1)] transition-all"
            >
              Cerrar
            </button>
          </div>
        ) : null}

        {confirmState === 'error' ? (
          <div className="space-y-4 text-center py-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-red-100 border-2 border-black flex items-center justify-center text-red-600 mb-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
                className="w-8 h-8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                />
              </svg>
            </div>
            <div className="text-lg font-black text-black uppercase">¡Ups!</div>
            <div className="text-sm font-bold text-black bg-red-100 border-2 border-black p-3 rounded-xl">
              {modalErrorMsg || 'Algo salió mal.'}
            </div>
            <button
              type="button"
              onClick={closeConfirm}
              className="px-4 py-2 rounded-xl text-zinc-600 hover:text-black font-bold hover:bg-gray-100 transition-colors"
            >
              Cerrar
            </button>
          </div>
        ) : null}
      </KPopModal>
    </div>
  )
}
