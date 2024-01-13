import { useReducer } from 'react'
import type { Stack } from '~/lib/stack.server'
import { useEventSource } from '~/lib/hooks/use-event-source'

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

  useEventSource(`/api/stacks/${stack.name}/logs`, push)

  return logs
}
