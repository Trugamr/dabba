import { ActionFunctionArgs, json } from '@remix-run/node'
import { invariantResponse } from '@epic-web/invariant'
import {
  getStackInitialLogs,
  getStackByName,
  getStoredStackByName,
  startStack,
  stopStack,
} from '~/lib/stack.server'
import { Form, useLoaderData } from '@remix-run/react'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import { PlayIcon, SquareIcon } from 'lucide-react'
import { z } from 'zod'
import { match } from 'ts-pattern'
import { StatusIndicator } from '~/components/status-indicator'
import { StackLogs } from '~/components/stack-logs'

const StackFormSchema = z.object({
  stack: z.string(),
  intent: z.enum(['start', 'stop']),
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
        <h3 className="flex gap-x-1 text-xl font-medium">
          <span>{stack.name}</span>
          {stack.status === 'running' ? <span>({stack.services})</span> : null}
        </h3>
        <p className="space-x-1 text-sm leading-tight">
          <StatusIndicator status={stack.status} />
          <span>
            {match(stack.status)
              .with('running', () => 'Running')
              .with('stopped', () => 'Stopped')
              .exhaustive()}
          </span>
        </p>
        <p className="truncate text-sm text-foreground/60">{stack.directory}</p>
      </div>
      <Form className="mt-4" method="POST">
        <Input type="hidden" name="stack" value={stack.name} />
        <div>
          {stack.status === 'stopped' ? (
            <Button className="gap-x-1.5" name="intent" value="start" size="sm">
              <PlayIcon className="h-[0.95em] w-[0.95em] fill-current" />
              <span>Start</span>
            </Button>
          ) : (
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
          )}
        </div>
      </Form>

      {match(stack.status)
        .with('running', () => (
          <StackLogs
            key={stack.name}
            className="mt-4"
            stack={stack}
            initialLogs={initialLogs}
          />
        ))
        .with('stopped', () => null)
        .exhaustive()}
    </section>
  )
}
