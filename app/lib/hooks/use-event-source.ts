import { useEffect } from 'react'

type UseEventSourceOptions = {
  init?: EventSourceInit
}

export function useEventSource(
  url: string,
  handler: (event: MessageEvent) => void,
  options?: UseEventSourceOptions,
) {
  useEffect(() => {
    const source = new EventSource(url, options?.init)

    source.addEventListener('message', handler)

    return () => {
      source.removeEventListener('message', handler)
      source.close()
    }
  }, [url, handler, JSON.stringify(options?.init)])
}
