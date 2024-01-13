import { invariantResponse } from '@epic-web/invariant'
import { LoaderFunctionArgs } from '@remix-run/node'
import { eventStream } from 'remix-utils/sse/server'
import { getStackByName, getStackLogsProcess } from '~/lib/stack.server'
import { notFound } from '~/lib/utils'

export async function loader({ request, params }: LoaderFunctionArgs) {
  invariantResponse(params.name, 'Stack name is required')

  const stack = await getStackByName(params.name)
  if (!stack) {
    throw notFound(`Stack "${params.name}" not found`)
  }

  const process = getStackLogsProcess({ directory: stack.directory })

  return eventStream(request.signal, function setup(send) {
    function handler(data: unknown) {
      if (data instanceof Buffer) {
        send({
          data: data.toString('utf-8'),
        })
      }
    }

    process.stdout?.addListener('data', handler)

    return function cleanup() {
      // Kill the process when the client disconnects
      process.kill()
      // Remove the listener
      process.stdout?.removeListener('data', handler)
    }
  })
}
