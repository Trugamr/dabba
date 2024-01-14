import { UseStackLogsOptions, useStackLogs } from '~/lib/hooks/use-stack-logs'
import type { Stack } from '~/lib/stack.server'
import { cn } from '~/lib/utils'

type StackLogs = {
  stack: Pick<Stack, 'name' | 'status'>
  className?: string
} & Pick<UseStackLogsOptions, 'initialLogs'>

export function StackLogs({ stack, className, initialLogs }: StackLogs) {
  const logs = useStackLogs(stack, {
    initialLogs,
  })

  return (
    <div
      className={cn(
        'flex h-80 max-w-2xl flex-col-reverse overflow-y-auto rounded-md border bg-background text-sm',
        className,
      )}
    >
      <pre className="grow p-3">{logs}</pre>
    </div>
  )
}
