import { useEffect, useReducer } from 'react'
import type { Stack } from '~/lib/stack.server'

export type UseStackLogsOptions = {
  initialLogs?: string[]
}

const defaultUseStackLogsOptions: UseStackLogsOptions = {}
const defaultInitialLogs: string[] = []

export function useStackLogs(
  stack: Pick<Stack, 'name'>,
  { initialLogs = defaultInitialLogs }: UseStackLogsOptions = defaultUseStackLogsOptions,
) {
  const [logs, push] = useReducer((logs: string[], log: MessageEvent) => {
    if (typeof log.data === 'string') {
      return [...logs, `${log.data}\n`]
    }
    return logs
  }, initialLogs)

  useEffect(() => {
    // Open a new stream of logs
    const source = new EventSource(`/api/stacks/${stack.name}/logs`)

    const handlers = {
      message: push,
      error() {
        source.close()
      },
    } as const

    source.addEventListener('message', handlers.message)
    source.addEventListener('error', handlers.error)

    return () => {
      // Remove event listeners
      source.removeEventListener('message', handlers.message)
      source.removeEventListener('error', handlers.error)
      // Close the stream
      source.close()
    }
  }, [stack.name, push])

  return logs
}
