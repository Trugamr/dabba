import { useReducer } from 'react'
import { StoredStack } from '~/lib/stack.server'
import { useEventSource } from '~/lib/hooks/use-event-source'

type UseStackLogsOptions = {
  initialLogs?: string[]
}

const defaultUseStackLogsOptions: UseStackLogsOptions = {}
const defaultInitialLogs: string[] = []

export function useStackLogs(
  stack: Pick<StoredStack, 'name'>,
  { initialLogs = defaultInitialLogs }: UseStackLogsOptions = defaultUseStackLogsOptions,
) {
  const [logs, push] = useReducer((logs: string[], log: MessageEvent) => {
    console.log(log)
    if (typeof log.data === 'string') {
      return [...logs, `${log.data}\n`]
    }
    return logs
  }, initialLogs)

  useEventSource(`/api/stacks/${stack.name}/logs`, push)

  return logs
}
