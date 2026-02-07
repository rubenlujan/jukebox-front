let ytApiPromise = null

export function loadYouTubeIframeAPI() {
  if (ytApiPromise) return ytApiPromise

  ytApiPromise = new Promise((resolve, reject) => {
    // Ya está cargado
    if (window.YT && window.YT.Player) {
      resolve(window.YT)
      return
    }

    // Si ya existe el script, solo espera a que YT esté listo
    const existing = document.querySelector('script[data-yt-iframe-api="true"]')
    if (existing) {
      const check = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(check)
          resolve(window.YT)
        }
      }, 50)

      setTimeout(() => {
        clearInterval(check)
        reject(new Error('Timeout esperando YouTube IFrame API'))
      }, 15000)

      return
    }

    // Crear callback global requerido por la API
    const prevCb = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      try {
        if (typeof prevCb === 'function') prevCb()
      } finally {
        resolve(window.YT)
      }
    }

    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    tag.async = true
    tag.setAttribute('data-yt-iframe-api', 'true')
    tag.onerror = () =>
      reject(new Error('No se pudo cargar YouTube IFrame API'))
    document.head.appendChild(tag)

    // fallback por si el callback no se dispara
    const check = setInterval(() => {
      if (window.YT && window.YT.Player) {
        clearInterval(check)
        resolve(window.YT)
      }
    }, 50)

    setTimeout(() => {
      clearInterval(check)
      if (window.YT && window.YT.Player) resolve(window.YT)
      else reject(new Error('Timeout esperando YouTube IFrame API'))
    }, 15000)
  })

  return ytApiPromise
}

export function destroyYouTubePlayer(player) {
  try {
    if (player && typeof player.destroy === 'function') {
      player.destroy()
    }
  } catch {
    // ignore
  }
}
