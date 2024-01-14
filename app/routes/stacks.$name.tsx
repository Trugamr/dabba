import { ActionFunctionArgs, json, redirect } from '@remix-run/node'
import { invariantResponse } from '@epic-web/invariant'
import {
  getStackInitialLogs,
  getStackByName,
  startStack,
  stopStack,
  destroyStack,
} from '~/lib/stack.server'
import { Form, useLoaderData } from '@remix-run/react'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import { BombIcon, PlayIcon, SquareIcon, UnplugIcon } from 'lucide-react'
import { z } from 'zod'
import { P, match } from 'ts-pattern'
import { StackStatusIndicator } from '~/components/stack-status-indicator'
import { StackLogs } from '~/components/stack-logs'
import { badRequest, notFound } from '~/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'

const StackFormSchema = z.object({
  stack: z.string(),
  intent: z.enum(['start', 'stop', 'destroy']),
})

export async function loader({ params }: ActionFunctionArgs) {
  invariantResponse(params.name, 'Stack name is required')

  const stack = await getStackByName(params.name)
  if (!stack) {
    throw notFound(`Stack "${params.name}" not found`)
  }

  const initialLogs = await getStackInitialLogs(stack)

  return json({
    stack,
    initialLogs,
  })
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData()
  const values = StackFormSchema.parse(Object.fromEntries(formData))

  // TODO: We could just send the stack path so we can perform operations without lookup
  const stack = await getStackByName(values.stack)
  if (!stack) {
    throw notFound(`Stack "${values.stack}" not found`)
  }

  switch (values.intent) {
    case 'start':
      await startStack(stack)
      break
    case 'stop':
      await stopStack(stack)
      break
    case 'destroy':
      await destroyStack(stack)

      // Redirect if destroying unmanaged stack
      if (!stack.managed) {
        throw redirect('/stacks')
      }

      break
    default:
      throw badRequest(`Invalid intent "${values.intent}"`)
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
          {stack.statuses ? (
            <span>({stack.statuses.reduce((count, status) => status.count, 0)})</span>
          ) : null}
        </h3>
        <p className="space-x-1 leading-tight">
          <StackStatusIndicator status={stack.status} />
          <span>
            {match(stack.status)
              .with('active', () => 'Active')
              .with('stopped', () => 'Stopped')
              .with('transitioning', () => 'Transitioning')
              .with('inactive', () => 'Inactive')
              .exhaustive()}
          </span>
        </p>
        <p className="truncate text-sm text-muted-foreground">{stack.directory}</p>
      </div>
      {!stack.managed ? (
        <Alert className="mt-4 max-w-max text-sm">
          <UnplugIcon className="h-4 w-4" />
          <AlertTitle>Unmanaged</AlertTitle>
          <AlertDescription>
            Stack is not being managed by dabba, some features may be unavailable
          </AlertDescription>
        </Alert>
      ) : null}
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
            .with(P.union('active', 'transitioning'), () => (
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
          {stack.statuses ? (
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
          ) : null}
        </div>
      </Form>

      <div className="mt-6">
        <h3 className="text-xl font-medium">Logs</h3>
        <p className="text-muted-foreground">Output from all services in this stack</p>
        <StackLogs
          // Avoid re-mounting the component when the stack status changes
          // TODO: We should handle status changes in the component itself
          key={`${stack.name}::${JSON.stringify(stack.statuses)}`}
          className="mt-2"
          stack={stack}
          initialLogs={initialLogs}
        />
      </div>
    </section>
  )
}
