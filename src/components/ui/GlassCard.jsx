export const GlassCard = ({ className = '', children }) => {
  return (
    <div
      className={[
        'rounded-[28px] bg-white/5 backdrop-blur-xl ring-1 ring-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.55)]',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  )
}
