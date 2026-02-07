import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react'

const ToastCtx = createContext(null)

function toastStyles(type) {
  switch (type) {
    case 'success':
      return 'bg-emerald-500/15 ring-1 ring-emerald-400/25 text-emerald-50'
    case 'error':
      return 'bg-red-500/15 ring-1 ring-red-400/25 text-red-50'
    case 'info':
    default:
      return 'bg-white/10 ring-1 ring-white/15 text-white'
  }
}

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(1)

  const remove = useCallback((id) => {
    setToasts((arr) => arr.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (toast) => {
      const id = idRef.current++
      const t = {
        id,
        type: toast.type || 'info',
        title: toast.title || '',
        message: toast.message || '',
        ttlMs: toast.ttlMs ?? 3500,
      }
      setToasts((arr) => [t, ...arr].slice(0, 3))
      window.setTimeout(() => remove(id), t.ttlMs)
    },
    [remove],
  )

  const api = useMemo(() => ({ push }), [push])

  return (
    <ToastCtx.Provider value={api}>
      {children}

      <div className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center px-3">
        <div className="w-full max-w-md -translate-y-24 space-y-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`pointer-events-auto rounded-2xl px-4 py-3 shadow-lg ${toastStyles(t.type)}`}
            >
              {t.title ? (
                <div className="text-sm font-semibold">{t.title}</div>
              ) : null}
              {t.message ? (
                <div className="mt-0.5 text-sm opacity-90">{t.message}</div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </ToastCtx.Provider>
  )
}

export const useToast = () => {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
