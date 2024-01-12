import { useEffect } from 'react'

export function useEventSource(
  url: string,
  handler: (event: MessageEvent) => void,
  init?: EventSourceInit,
) {
  useEffect(() => {
    const source = new EventSource(url, {
      withCredentials: init?.withCredentials,
    })

    source.addEventListener('message', handler)

    return () => {
      source.removeEventListener('message', handler)
      source.close()
    }
  }, [url, handler, init?.withCredentials])
}
