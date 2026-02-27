import { useMemo, useState } from 'react'
import { jukeboxApi } from '../api/jukeboxApi'
import { useQueuePoll } from '../hooks/useQueuePoll'
import { GlassCard } from '../components/ui/GlassCard'
import { Spinner } from '../components/ui/Spinner'
import { formatDuration } from '../utils/format'

export const Admin = () => {
  const {
    loading,
    error,
    items: queueRaw,
    refetch,
  } = useQueuePoll({ intervalMs: 3000 })

  const [processingId, setProcessingId] = useState(null)
  const [actionError, setActionError] = useState('')

  const nowPlaying = useMemo(() => {
    const arr = Array.isArray(queueRaw) ? queueRaw : []
    return arr.find((x) => x.Status === 1) || null
  }, [queueRaw])

  const queueItems = useMemo(() => {
    const arr = Array.isArray(queueRaw) ? queueRaw : []
    return arr.filter((x) => x.Status !== 1)
  }, [queueRaw])

  const handleMove = async (item, direction) => {
    if (processingId) return

    // IMPORTANTE: QueueId es el ID único (ej. 65), pero para reordenar
    // necesitamos el ÍNDICE actual en la lista visual (ej. posición 1).
    const currentIndex = queueItems.findIndex((x) => x.QueueId === item.QueueId)
    if (currentIndex === -1) return

    // Calculamos el nuevo índice numérico (0, 1, 2...)
    const newPosition = direction === 'up' ? currentIndex - 1 : currentIndex + 1

    // Validación de seguridad para no enviar índices fuera de rango
    if (newPosition < 0 || newPosition >= queueItems.length) return

    setProcessingId(item.QueueId)
    setActionError('')

    try {
      const res = await jukeboxApi.reorder({
        queueId: item.QueueId,
        newPosition: newPosition + 1,
      })

      if (!res.ok) {
        setActionError(res.message || 'No se pudo mover la canción.')
      } else {
        // Refetch inmediato para actualizar la UI
        refetch()
      }
    } catch (err) {
      setActionError(err?.message || 'Error de conexión.')
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Background glow similar a ClientJukebox */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[860px] -translate-x-1/2 rounded-full bg-emerald-600/10 blur-[120px]" />
        <div className="absolute -bottom-40 left-1/3 h-[520px] w-[860px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto w-full max-w-4xl px-4 py-6">
        <GlassCard className="overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-zinc-900/60 via-zinc-800/40 to-zinc-900/60 px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-white/10 ring-1 ring-white/20">
                  ⚙️
                </div>
                <div>
                  <div className="text-lg font-semibold tracking-wide">
                    Admin Panel
                  </div>
                  <div className="text-xs text-white/50">
                    Gestión de la cola de reproducción
                  </div>
                </div>
              </div>
              {loading && <Spinner className="text-white/50" />}
            </div>
          </div>

          <div className="h-px w-full bg-white/10" />

          <div className="p-4 md:p-6 space-y-6">
            {/* Error global de acción */}
            {actionError && (
              <div className="rounded-2xl bg-red-500/10 p-3 text-sm text-red-50 ring-1 ring-red-400/20">
                {actionError}
              </div>
            )}

            {/* Now Playing Section */}
            <div className="space-y-3">
              <div className="text-xs font-bold tracking-wider text-white/40 uppercase">
                Sonando ahora
              </div>
              {nowPlaying ? (
                <div className="flex items-center gap-4 rounded-2xl bg-emerald-500/10 p-4 ring-1 ring-emerald-500/20">
                  <img
                    src={nowPlaying.AlbumImageUrl}
                    alt=""
                    className="h-12 w-12 rounded-lg object-cover shadow-lg"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-white">
                      {nowPlaying.TrackName}
                    </div>
                    <div className="truncate text-sm text-white/60">
                      {nowPlaying.ArtistName}
                    </div>
                  </div>
                  <div className="text-xs font-medium text-emerald-400">
                    PLAYING
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl bg-white/5 p-4 text-sm text-white/40 italic">
                  Nada sonando en este momento.
                </div>
              )}
            </div>

            {/* Queue Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold tracking-wider text-white/40 uppercase">
                  En cola ({queueItems.length})
                </div>
              </div>

              <div className="space-y-2">
                {queueItems.length === 0 ? (
                  <div className="rounded-2xl bg-white/5 p-8 text-center text-sm text-white/40">
                    La cola está vacía.
                  </div>
                ) : (
                  queueItems.map((item, index) => (
                    <div
                      key={item.QueueId}
                      className="group flex items-center gap-3 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10 transition hover:bg-white/10"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black/20 text-xs font-medium text-white/50">
                        {index + 1}
                      </div>
                      <img
                        src={item.AlbumImageUrl}
                        alt=""
                        className="h-10 w-10 rounded-lg object-cover opacity-80"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-white/90">
                          {item.TrackName}
                        </div>
                        <div className="truncate text-xs text-white/50">
                          {item.ArtistName} · {formatDuration(item.DurationMs)}
                        </div>
                        {item.RequestedBy && (
                          <div className="truncate text-[10px] text-indigo-300/70">
                            Pedida por: {item.RequestedBy}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
                          disabled={!!processingId || index === 0}
                          onClick={() => handleMove(item, 'up')}
                          title="Mover arriba"
                        >
                          {processingId === item.QueueId ? (
                            <Spinner className="h-4 w-4" />
                          ) : (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="m18 15-6-6-6 6" />
                            </svg>
                          )}
                        </button>

                        <button
                          type="button"
                          className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
                          disabled={
                            !!processingId || index === queueItems.length - 1
                          }
                          onClick={() => handleMove(item, 'down')}
                          title="Mover abajo"
                        >
                          {processingId === item.QueueId ? (
                            <Spinner className="h-4 w-4" />
                          ) : (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="m6 9 6 6 6-6" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
