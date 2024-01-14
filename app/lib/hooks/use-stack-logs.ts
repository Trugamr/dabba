import { useEffect, useReducer } from 'react'
import type { Stack } from '~/lib/stack.server'

export type UseStackLogsOptions = {
  initialLogs?: string[]
}

const defaultUseStackLogsOptions: UseStackLogsOptions = {}
const defaultInitialLogs: string[] = []

export function useStackLogs(
  stack: Pick<Stack, 'name' | 'status'>,
  { initialLogs = defaultInitialLogs }: UseStackLogsOptions = defaultUseStackLogsOptions,
) {
  const [logs, push] = useReducer((logs: string[], log: MessageEvent) => {
    if (typeof log.data === 'string') {
      return [...logs, `${log.data}\n`]
    }
    return logs
  }, initialLogs)

  useEffect(() => {
    // We don't want to listen for logs if the stack is not running
    if (stack.status !== 'running') {
      return
    }

    // Open a new stream of logs
    const source = new EventSource(`/api/stacks/${stack.name}/logs`)
    source.addEventListener('message', push)

    return () => {
      source.removeEventListener('message', push)
      source.close()
    }
  }, [stack.name, stack.status, push])

  return logs
}
