import { ActionFunctionArgs, json } from '@remix-run/node'
import { invariantResponse } from '@epic-web/invariant'
import {
  getStackInitialLogs,
  getStackByName,
  getStoredStackByName,
  startStack,
  stopStack,
  destroyStack,
} from '~/lib/stack.server'
import { Form, useLoaderData } from '@remix-run/react'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import { BombIcon, PlayIcon, SquareIcon } from 'lucide-react'
import { z } from 'zod'
import { P, match } from 'ts-pattern'
import { StatusIndicator } from '~/components/status-indicator'
import { StackLogs } from '~/components/stack-logs'

const StackFormSchema = z.object({
  stack: z.string(),
  intent: z.enum(['start', 'stop', 'destroy']),
})

export async function loader({ params }: ActionFunctionArgs) {
  invariantResponse(params.name, 'Stack name is required')

  const stack = await getStackByName(params.name)
  const initialLogs = await getStackInitialLogs(stack)

  return json({
    stack,
    initialLogs,
  })
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData()
  const values = StackFormSchema.parse(Object.fromEntries(formData))

  const stack = await getStoredStackByName(values.stack)

  switch (values.intent) {
    case 'start':
      await startStack(stack)
      break
    case 'stop':
      await stopStack(stack)
      break
    case 'destroy':
      await destroyStack(stack)
      break
    default:
      throw new Response('Bad request', { status: 400 })
  }

  return json(null)
}

export default function StacksNameRoute() {
  const { stack, initialLogs } = useLoaderData<typeof loader>()

  return (
    <section>
      <div className="space-y-1">
        <h3 className="flex gap-x-1 text-2xl font-medium">
          <span>{stack.name}</span>
          {stack.status === 'running' ? <span>({stack.services})</span> : null}
        </h3>
        <p className="space-x-1 leading-tight">
          <StatusIndicator status={stack.status} />
          <span>
            {match(stack.status)
              .with('running', () => 'Running')
              .with('stopped', () => 'Stopped')
              .with('inactive', () => 'Inactive')
              .exhaustive()}
          </span>
        </p>
        <p className="truncate text-sm text-muted-foreground">{stack.directory}</p>
      </div>
      <Form className="mt-4" method="POST">
        <Input type="hidden" name="stack" value={stack.name} />
        <div className="flex gap-x-2.5">
          {match(stack.status)
            .with(P.union('inactive', 'stopped'), () => (
              <Button className="gap-x-1.5" name="intent" value="start" size="sm">
                <PlayIcon className="h-[0.95em] w-[0.95em] fill-current" />
                <span>Start</span>
              </Button>
            ))
            .with('running', () => (
              <Button
                className="gap-x-1.5"
                name="intent"
                value="stop"
                size="sm"
                variant="destructive"
              >
                <SquareIcon className="h-[0.95em] w-[0.95em] fill-current" />
                <span>Stop</span>
              </Button>
            ))
            .exhaustive()}
          {match(stack.status)
            .with(P.union('running', 'stopped'), () => (
              <Button
                className="gap-x-1.5"
                name="intent"
                value="destroy"
                size="sm"
                variant="destructive"
              >
                <BombIcon className="h-[0.95em] w-[0.95em] fill-current" />
                <span>Destroy</span>
              </Button>
            ))
            .with('inactive', () => null)
            .exhaustive()}
        </div>
      </Form>

      <div className="mt-6">
        <h3 className="text-xl font-medium">Logs</h3>
        <p className="text-muted-foreground">Output from all services in this stack</p>
        <StackLogs
          // Avoid re-mounting the component when the stack status changes
          // TODO: We should handle status changes in the component itself
          key={`${stack.name}::${stack.status}`}
          className="mt-2"
          stack={stack}
          initialLogs={initialLogs}
        />
      </div>
    </section>
  )
}
