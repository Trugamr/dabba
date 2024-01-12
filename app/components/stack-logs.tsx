import { useEffect, useReducer } from 'react'
import { useEventSource } from '~/lib/hooks/use-event-source'
import { useStackLogs } from '~/lib/hooks/use-stack-logs'
import { StoredStack } from '~/lib/stack.server'
import { cn } from '~/lib/utils'

type StackLogs = {
  stack: Pick<StoredStack, 'name'>
  className?: string
}

export function StackLogs({ stack, className }: StackLogs) {
  const logs = useStackLogs(stack)

  return (
    <div
      className={cn(
        'flex h-96 max-w-2xl flex-col-reverse overflow-y-auto rounded-md border bg-background text-sm',
        className,
      )}
    >
      <pre className="grow p-3">{logs}</pre>
    </div>
  )
}
