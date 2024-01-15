import { ActionFunctionArgs, json, redirect } from '@remix-run/node'
import { invariantResponse } from '@epic-web/invariant'
import {
  getStackInitialLogs,
  getStackByName,
  startStack,
  stopStack,
  destroyStack,
  getStackDetails,
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
import { ServiceStateIndicator } from '~/components/service-state-indicator'

const StackFormSchema = z.object({
  stack: z.string(),
  intent: z.enum(['start', 'stop', 'destroy']),
})

export async function loader({ params }: ActionFunctionArgs) {
  invariantResponse(params.name, 'Stack name is required')

  // TODO: Optimize by preventing stacks summaries call
  const stack = await getStackByName(params.name)
  if (!stack) {
    throw notFound(`Stack "${params.name}" not found`)
  }

  // const details = await getStackDetails(stack)
  let details: Awaited<ReturnType<typeof getStackDetails>> | null = null
  try {
    details = await getStackDetails(stack)
  } catch (error) {
    // TODO: Add debug log
    // eslint-disable-next-line no-console
    console.error(`Failed to get details for stack "${stack.name}"`)
  }

  // TODO: Consider deferring this to the client
  let logs: Awaited<ReturnType<typeof getStackInitialLogs>> | null = null
  try {
    logs = await getStackInitialLogs(stack)
  } catch (error) {
    // TODO: Add debug log
    // eslint-disable-next-line no-console
    console.error(`Failed to get initial logs for stack "${stack.name}"`)
  }

  return json({
    stack,
    details,
    logs,
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
      if (stack.control === 'none') {
        throw redirect('/stacks')
      }

      break
    default:
      throw badRequest(`Invalid intent "${values.intent}"`)
  }

  return json(null)
}

export default function StacksNameRoute() {
  const { stack, details, logs } = useLoaderData<typeof loader>()

  return (
    <div>
      <div className="space-y-1">
        <h3 className="flex gap-x-1 text-2xl font-medium">
          <span>{stack.name}</span>
          {stack.statuses ? (
            <span>({stack.statuses.reduce((count, status) => count + status.count, 0)})</span>
          ) : null}
        </h3>
        <p className="space-x-1 leading-tight">
          <StackStatusIndicator status={stack.status} />
          <span className="capitalize">{stack.status}</span>
        </p>
        <p className="truncate text-sm text-muted-foreground">{stack.directory}</p>
      </div>
      {match(stack.control)
        .with('full', 'partial', () => null)
        .with('none', () => (
          <Alert className="mt-4 max-w-max text-sm">
            <UnplugIcon className="h-4 w-4" />
            <AlertTitle>Unmanaged</AlertTitle>
            <AlertDescription>
              Stack is not being managed by dabba, some features may be unavailable
            </AlertDescription>
          </Alert>
        ))
        .exhaustive()}
      {details ? (
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
      ) : null}

      {details?.services ? (
        <section className="mt-6">
          <h3 className="text-xl font-medium">Services</h3>
          <p className="text-muted-foreground">Details about services in this stack</p>
          <ul className="mt-2 flex max-w-96 flex-col gap-y-2">
            {Object.entries(details.services).map(([name, service]) => {
              const state = service.info?.state ?? 'inactive'

              return (
                <li key={name} className="flex flex-col rounded-md border bg-background p-3">
                  <h4 className="text-lg font-medium">{service.info?.name ?? name}</h4>
                  <p className="truncate text-sm text-muted-foreground" title={service.image}>
                    {service.image}
                  </p>
                  <div className="mt-1.5 text-sm">
                    <ServiceStateIndicator state={state} />
                    <span className="ml-1 capitalize">{state}</span>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      {logs ? (
        <section className="mt-6">
          <h3 className="text-xl font-medium">Logs</h3>
          <p className="text-muted-foreground">Output from all services in this stack</p>
          <StackLogs
            // Avoid re-mounting the component when the stack status changes
            // TODO: We should handle status changes in the component itself
            key={`${stack.name}::${JSON.stringify(stack.statuses)}`}
            className="mt-2 h-80 max-w-2xl"
            stack={stack}
            initialLogs={logs}
          />
        </section>
      ) : null}
    </div>
  )
}
