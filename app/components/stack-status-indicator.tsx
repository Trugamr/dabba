import { match } from 'ts-pattern'
import type { Stack } from '~/lib/stack.server'
import { cn } from '~/lib/utils'

type StackIndicatorProps = {
  status: Stack['status']
  className?: string
}

export function StackStatusIndicator({ status, className }: StackIndicatorProps) {
  return (
    <span
      className={cn(
        'inline-block h-2.5 w-2.5 shrink-0 rounded-full',
        match(status)
          .with('active', () => 'bg-green-400')
          .with('stopped', () => 'bg-red-400')
          .with('transitioning', () => 'bg-yellow-400')
          .with('inactive', () => 'bg-gray-400')
          .exhaustive(),
        className,
      )}
    />
  )
}
