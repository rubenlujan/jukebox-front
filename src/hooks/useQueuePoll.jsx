import { useEffect, useRef, useState } from 'react'
import { jukeboxApi } from '../api/jukeboxApi'

export const useQueuePoll = ({ intervalMs = 3000 } = {}) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [items, setItems] = useState([])

  const timerRef = useRef(null)
  const aliveRef = useRef(true)

  useEffect(() => {
    aliveRef.current = true

    async function tick() {
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
    }

    // primera carga inmediata
    tick()

    timerRef.current = setInterval(tick, intervalMs)

    return () => {
      aliveRef.current = false
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [intervalMs])

  return { loading, error, items }
}
