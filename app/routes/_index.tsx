import { ActionFunctionArgs, json, type MetaFunction } from '@remix-run/node'
import { Form, useLoaderData } from '@remix-run/react'
import { z } from 'zod'
import { getStackByName, getStacksList, startStack, stopStack } from '~/lib/stack.server'

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
    <div className="p-6">
      <h1>dabba</h1>
      <ul className="flex flex-col gap-y-2 border border-black p-4">
        {stacks.map(stack => (
          <li key={stack.name} className="flex flex-col">
            <span>{stack.name}</span>
            <span className="truncate text-sm text-gray-600">{stack.path}</span>
            <Form className="flex gap-x-2" method="POST">
              <input type="hidden" name="stack" value={stack.name} />
              <button name="intent" value="start">
                start
              </button>
              <button name="intent" value="stop">
                stop
              </button>
            </Form>
          </li>
        ))}
      </ul>
    </div>
  )
}
