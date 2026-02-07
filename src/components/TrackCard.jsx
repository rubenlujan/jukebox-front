import { formatDuration } from '../utils/format'
import { Button } from './ui/Button'

export const TrackCard = ({ track, onSelect }) => {
  return (
    <div className="grid w-full grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10 overflow-hidden">
      <img
        src={track.AlbumImageUrl}
        alt={`${track.TrackName} cover`}
        className="h-14 w-14 rounded-xl object-cover ring-1 ring-white/10"
        loading="lazy"
      />

      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-white">
          {track.TrackName}
        </div>
        <div className="mt-0.5 truncate text-xs text-white/65">
          {track.ArtistName}
        </div>
        <div className="mt-1 text-xs text-white/45">
          {formatDuration(track.DurationMs)}
        </div>
      </div>

      <Button
        variant="ghost"
        onClick={() => onSelect(track)}
        className="whitespace-nowrap px-3"
      >
        Pedir
      </Button>
    </div>
  )
}
