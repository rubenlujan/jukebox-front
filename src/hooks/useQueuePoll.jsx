import { useCallback, useEffect, useRef, useState } from 'react'
import { jukeboxApi } from '../api/jukeboxApi'

export const useQueuePoll = ({ intervalMs = 3000 } = {}) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [items, setItems] = useState([])

  const timerRef = useRef(null)
  const aliveRef = useRef(true)

  const fetchQueue = useCallback(async () => {
    try {
      const res = await jukeboxApi.getQueue()
      if (!aliveRef.current) return

      if (!res.ok) {
        setError(res.message || 'No se pudo cargar la cola.')
        setItems([])
      } else {
        setError('')
        setItems(res.items)
      }
    } catch (e) {
      if (!aliveRef.current) return
      setError(e?.message || 'Error cargando la cola.')
    } finally {
      // eslint-disable-next-line no-unsafe-finally
      if (!aliveRef.current) return
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    aliveRef.current = true

    // primera carga inmediata
    fetchQueue()

    timerRef.current = setInterval(fetchQueue, intervalMs)

    return () => {
      aliveRef.current = false
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [intervalMs, fetchQueue])

  return { loading, error, items, refetch: fetchQueue }
}
