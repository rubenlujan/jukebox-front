export const Input = ({
  value,
  onChange,
  placeholder,
  className = '',
  type = 'text',
  inputMode,
  maxLength,
}) => {
  return (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      type={type}
      inputMode={inputMode}
      maxLength={maxLength}
      className={`w-full rounded-xl bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-white/30 ${className}`}
    />
  )
}
