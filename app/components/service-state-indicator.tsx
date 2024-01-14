import { match } from 'ts-pattern'
import type { ServiceState } from '~/lib/stack.server'
import { cn } from '~/lib/utils'

type StackIndicatorProps = {
  state: ServiceState | 'inactive'
  className?: string
}

export function ServiceStateIndicator({ state, className }: StackIndicatorProps) {
  return (
    <span
      className={cn(
        'inline-block h-2.5 w-2.5 shrink-0 rounded-full',
        match(state)
          .with('paused', () => 'bg-yellow-400')
          .with('restarting', () => 'bg-yellow-400')
          .with('removing', () => 'bg-yellow-400')
          .with('running', () => 'bg-green-400')
          .with('dead', () => 'bg-red-400')
          .with('created', () => 'bg-yellow-400')
          .with('exited', () => 'bg-red-400')
          .with('inactive', () => 'bg-gray-400')
          .exhaustive(),
        className,
      )}
    />
  )
}
