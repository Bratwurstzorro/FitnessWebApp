function wait(milliseconds, signal) {
  return new Promise((resolve, reject) => {
    signal?.throwIfAborted()
    const finish = () => {
      signal?.removeEventListener('abort', abort)
      resolve()
    }
    const timer = setTimeout(finish, milliseconds)
    const abort = () => {
      clearTimeout(timer)
      signal.removeEventListener('abort', abort)
      reject(signal.reason)
    }
    signal?.addEventListener('abort', abort, {once: true})
  })
}

// A rejected JWT is checked before PostgREST executes the database operation.
// Retry only this precise rejection; network failures and other errors may
// occur after a write has committed and must not replay that write.
export function createJwtRetryFetch(projectUrl, fetcher = (...args) => globalThis.fetch(...args), pause = wait) {
  const origin = new URL(projectUrl).origin
  return async (input, init) => {
    const request = new Request(input, init)
    const url = new URL(request.url)
    if (url.origin !== origin || !url.pathname.startsWith('/rest/v1/')) {
      return fetcher(request)
    }
    const delays = [1000, 2000]
    for (let attempt = 0; ; attempt++) {
      request.signal.throwIfAborted()
      const response = await fetcher(request.clone())
      if (response.status !== 401 || attempt === delays.length) return response
      let error
      try {
        error = await response.clone().json()
      } catch {
        return response
      }
      if (error.code !== 'PGRST303' || error.message !== 'JWT issued at future') return response
      await pause(delays[attempt], request.signal)
    }
  }
}
