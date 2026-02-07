export const Spinner = ({ className = '' }) => {
  return (
    <div
      className={`h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white/80 ${className}`}
      aria-label="Loading"
    />
  )
}
