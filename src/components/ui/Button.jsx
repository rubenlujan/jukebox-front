export const Button = ({
  children,
  onClick,
  type = 'button',
  disabled,
  variant = 'primary',
  className = '',
}) => {
  const base =
    'inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed'

  const styles = {
    primary: 'bg-white text-black hover:bg-zinc-100',
    ghost: 'bg-transparent text-white/90 hover:bg-white/10',
    danger: 'bg-red-500 text-white hover:bg-red-600',
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${styles[variant] || styles.primary} ${className}`}
    >
      {children}
    </button>
  )
}
