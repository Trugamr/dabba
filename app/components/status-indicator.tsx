import { match } from 'ts-pattern'
import { cn } from '~/lib/utils'

type StackIndicatorProps = {
  status: 'running' | 'stopped'
  className?: string
}

export function StatusIndicator({ status, className }: StackIndicatorProps) {
  return (
    <span
      className={cn(
        'inline-block h-2.5 w-2.5 shrink-0 rounded-full',
        match(status)
          .with('running', () => 'bg-green-500')
          .with('stopped', () => 'bg-red-500')
          .exhaustive(),
        className,
      )}
    />
  )
}
