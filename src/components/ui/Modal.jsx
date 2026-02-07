export const Modal = ({ open, title, onClose, children }) => {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal box */}
      <div className="relative z-10 w-[92%] max-w-md animate-[fadeIn_.18s_ease-out]">
        <div className="rounded-3xl bg-zinc-900 ring-1 ring-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
          {title ? (
            <div className="px-5 pt-5 pb-3 text-lg font-semibold text-white">
              {title}
            </div>
          ) : null}

          <div className="px-5 pb-5">{children}</div>
        </div>
      </div>
    </div>
  )
}
