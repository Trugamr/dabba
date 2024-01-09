import { ActionFunctionArgs, json, type MetaFunction } from '@remix-run/node'
import { Form, useLoaderData } from '@remix-run/react'
import { z } from 'zod'
import { getStackByName, getStacksList, startStack, stopStack } from '~/lib/stack.server'
import { PackageIcon } from 'lucide-react'
import { Table, TableBody, TableCell, TableRow } from '~/components/ui/table'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'

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

  const stack = await getStackByName(values.stack)

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
          <PackageIcon className="h-[1.2em]" />
          <span>dabba</span>
        </h1>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <h2 className="text-3xl font-bold">Stacks</h2>
        <Form className="mt-8 flex gap-x-2">
          <Input placeholder="Search stacks..." />
          <Button>Search</Button>
        </Form>
        <div className="bg-background mt-4 rounded-md border">
          <Table>
            <TableBody>
              {stacks.map(stack => {
                return (
                  <TableRow>
                    <TableCell>
                      <span className="font-medium">{stack.name}</span>
                      <span className="block text-sm text-gray-500">{stack.path}</span>
                    </TableCell>
                    <TableCell>
                      <Form method="POST" className="ml-auto max-w-max">
                        <input type="hidden" name="stack" value={stack.name} />
                        <div className="flex gap-x-2">
                          <Button name="intent" value="start" variant="outline" size="sm">
                            Start
                          </Button>
                          <Button name="intent" value="stop" variant="outline" size="sm">
                            Stop
                          </Button>
                        </div>
                      </Form>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  )
}
