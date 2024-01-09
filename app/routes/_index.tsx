import { ActionFunctionArgs, json, type MetaFunction } from '@remix-run/node'
import { Form, useLoaderData } from '@remix-run/react'
import { z } from 'zod'
import { getStacksList, getStoredStackByName, startStack, stopStack } from '~/lib/stack.server'
import { PackageIcon, PackageSearchIcon } from 'lucide-react'
import { Table, TableBody, TableCell, TableRow } from '~/components/ui/table'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { cn } from '~/lib/utils'

const StackFormSchema = z.object({
  stack: z.string(),
  intent: z.enum(['start', 'stop']),
})

export const meta: MetaFunction = () => {
  return [{ title: 'dabba' }]
}

export async function loader() {
  const stacks = await getStacksList()

  return json({
    stacks,
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

export default function IndexRoute() {
  const { stacks } = useLoaderData<typeof loader>()

  return (
    <div className="bg-secondary min-h-screen">
      <header className="bg bg-background px-3 py-4 shadow">
        <h1 className="flex items-center gap-x-1 font-medium">
          <PackageIcon className="h-[1.2em] w-[1.2em]" />
          <span>dabba</span>
        </h1>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <h2 className="text-3xl font-bold">Stacks</h2>
        <Form className="mt-8 flex gap-x-2">
          <Input placeholder="Search stacks..." />
          <Button>Search</Button>
        </Form>
        <div className="bg-background mt-4 flex rounded-md border">
          {stacks.length ? (
            <Table>
              <TableBody>
                {stacks.map(stack => {
                  return (
                    <TableRow>
                      <TableCell>
                        <span className="font-medium">{stack.name}</span>
                        <span className="block text-sm text-gray-500">{stack.directory}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-x-2">
                          <div
                            className={cn(
                              'h-3 w-3 shrink-0 rounded-full',
                              stack.status === 'running' ? 'bg-green-400' : 'bg-rose-400',
                            )}
                          />
                          <div className="flex min-w-24 gap-x-1">
                            {stack.status === 'running' ? (
                              <span>Running</span>
                            ) : (
                              <span>Stopped</span>
                            )}
                            {stack.status === 'running' ? (
                              <span>({stack.services})</span>
                            ) : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Form method="POST" className="ml-auto max-w-max">
                          <input type="hidden" name="stack" value={stack.name} />
                          <div className="flex gap-x-2">
                            {stack.status === 'stopped' ? (
                              <Button
                                name="intent"
                                value="start"
                                variant="outline"
                                size="sm"
                                className="min-w-16"
                              >
                                Start
                              </Button>
                            ) : (
                              <Button
                                name="intent"
                                value="stop"
                                variant="outline"
                                size="sm"
                                className="min-w-16"
                              >
                                Stop
                              </Button>
                            )}
                          </div>
                        </Form>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-foreground/50 mx-auto flex flex-col items-center gap-y-2 p-8">
              <PackageSearchIcon className="h-[2.4em] w-[2.4em]" />
              <span>No stacks found</span>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
