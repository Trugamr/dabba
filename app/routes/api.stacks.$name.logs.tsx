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

  const process = getStackLogsProcess({ directory: stack.directory, path: stack.path })

  // We need to create new AbortController so we can proactively close the connection from the server
  const controller = new AbortController()

  // We need to abort on request abort as well
  request.signal.addEventListener('abort', () => {
    // This will inturn trigger the cleanup function
    controller.abort()
  })

  // Close stream when process exits
  process.on('exit', () => {
    controller.abort()
  })

  return eventStream(controller.signal, function setup(send) {
    function handler(data: unknown) {
      if (data instanceof Buffer) {
        send({
          data: data.toString('utf-8'),
        })
      }
    }

    process.stdout?.addListener('data', handler)

    return function cleanup() {
      // Remove the listener
      process.stdout?.removeListener('data', handler)
      // Kill the process when the client disconnects
      process.kill()
    }
  })
}
