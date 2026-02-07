export function formatDuration(ms) {
  const totalSec = Math.max(0, Math.floor((Number(ms) || 0) / 1000))
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function clampText(str, max = 140) {
  const t = String(str || '')
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}
