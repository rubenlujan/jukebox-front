function formatMs(ms) {
  const n = Number(ms)
  if (!Number.isFinite(n) || n <= 0) return ''
  const totalSec = Math.floor(n / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export const VinylDeck = ({
  queueLoading,
  queueError,
  nowPlaying,
  upcoming,
  uiMode,
}) => {
  const hideQueuePanelsOnMobile = uiMode === 'deckOnlyOnMobile'

  return (
    <div className="rounded-[26px] bg-white/5 ring-1 ring-white/10 overflow-hidden">
      <div className="p-4">
        {/* Disco */}
        <div className="relative mx-auto aspect-square w-full max-w-[340px] rounded-[24px] bg-gradient-to-b from-white/10 to-black/40 ring-1 ring-white/10 overflow-hidden">
          {/* glare */}
          <div className="pointer-events-none absolute -right-10 top-6 h-12 w-56 rotate-[18deg] bg-white/10 blur-[1px]" />

          {/* vinyl */}
          <div
            className={[
              'absolute inset-6 rounded-full bg-zinc-950 ring-1 ring-white/10 shadow-[inset_0_0_0_2px_rgba(255,255,255,0.04)]',
              nowPlaying || (upcoming && upcoming.length > 0)
                ? 'vinyl-rotate'
                : 'vinyl-paused',
            ].join(' ')}
          >
            {/* grooves */}
            <div className="absolute inset-5 rounded-full border border-white/5" />
            <div className="absolute inset-9 rounded-full border border-white/5" />
            <div className="absolute inset-14 rounded-full border border-white/5" />
            <div className="absolute inset-20 rounded-full border border-white/5" />

            {/* label */}
            <div
              className={[
                'absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-fuchsia-400/70 via-cyan-300/60 to-amber-300/60 ring-1 ring-white/20 transition-all duration-700',
                nowPlaying ? 'shadow-[0_0_40px_rgba(56,189,248,0.45)]' : '',
              ].join(' ')}
            />

            <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/70 ring-1 ring-white/20" />
          </div>
        </div>

        {/* “pantallitas” */}
        <div className="mt-4 hidden md:grid grid-cols-2 gap-3">
          <div className="h-16 rounded-2xl bg-gradient-to-b from-white/10 to-black/30 ring-1 ring-white/10 overflow-hidden">
            <div
              className="h-full w-full opacity-40"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(135deg, rgba(255,255,255,0.25) 0px, rgba(255,255,255,0.25) 6px, rgba(255,255,255,0.08) 6px, rgba(255,255,255,0.08) 12px)',
              }}
            />
          </div>
          <div className="h-16 rounded-2xl bg-gradient-to-b from-white/10 to-black/30 ring-1 ring-white/10 overflow-hidden">
            <div
              className="h-full w-full opacity-40"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(135deg, rgba(255,255,255,0.25) 0px, rgba(255,255,255,0.25) 6px, rgba(255,255,255,0.08) 6px, rgba(255,255,255,0.08) 12px)',
              }}
            />
          </div>
        </div>

        {/* NOW PLAYING (se oculta en mobile cuando uiMode=deckOnlyOnMobile) */}
        <div className={hideQueuePanelsOnMobile ? 'hidden md:block' : ''}>
          <div className="mt-4 rounded-2xl bg-black/25 ring-1 ring-white/10 px-3 py-2">
            <div className="flex items-center gap-2 text-xs text-white/70">
              <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.8)]" />
              <span className="font-semibold tracking-wide">NOW PLAYING:</span>

              {queueLoading ? (
                <span className="text-white/60">cargando…</span>
              ) : nowPlaying ? (
                <span className="truncate text-white/85">
                  {nowPlaying.TrackName} — {nowPlaying.ArtistName}
                </span>
              ) : (
                <span className="text-white/60">—</span>
              )}
            </div>

            {nowPlaying ? (
              <div className="mt-1 text-xs text-white/45">
                {formatMs(nowPlaying.DurationMs)} ·{' '}
                {nowPlaying.TableCode || 'BAR'}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* separador + lista (se ocultan en mobile cuando uiMode=deckOnlyOnMobile) */}
      <div className={hideQueuePanelsOnMobile ? 'hidden md:block' : ''}>
        <div className="h-px w-full bg-white/10" />

        {/* Próximas canciones */}
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-white tracking-wide">
              PRÓXIMAS CANCIONES
            </div>
            <div className="text-xs text-white/50">{upcoming?.length || 0}</div>
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
                  {formatMs(x.DurationMs)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
