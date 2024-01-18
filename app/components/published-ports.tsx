import { Link } from '@remix-run/react'
import { ExternalLinkIcon } from 'lucide-react'
import { cn } from '~/lib/utils'
import { buttonVariants } from './ui/button'
import { StackDetails } from '~/lib/stack.server'
import { useGlobalInfo } from '~/lib/hooks/use-global-info'

type PublishedPortsProps = {
  ports: Exclude<StackDetails['services'][string]['ports'], undefined>
  className?: string
}

export function PublishedPorts({ ports, className }: PublishedPortsProps) {
  const {
    request: { protocol, hostname },
  } = useGlobalInfo()

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {ports.map(port => {
        return (
          <Link
            key={port.published}
            to={`${protocol}://${hostname}:${port.published}`}
            target="_blank"
            className={cn(
              buttonVariants({
                variant: 'secondary',
              }),
              'h-max gap-x-0.5 rounded-full px-1.5 py-0.5 text-xs',
            )}
            rel="noreferrer"
          >
            <ExternalLinkIcon className="h-[1em] w-[1em]" />
            <span>
              {port.published} : {port.target}
            </span>
          </Link>
        )
      })}
    </div>
  )
}
