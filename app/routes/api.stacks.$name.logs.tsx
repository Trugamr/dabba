import { invariantResponse } from '@epic-web/invariant'
import { LoaderFunctionArgs } from '@remix-run/node'
import { eventStream } from 'remix-utils/sse/server'
import { getStackByName, getStackLogsProcess } from '~/lib/stack.server'

export async function loader({ request, params }: LoaderFunctionArgs) {
  invariantResponse(params.name, 'Stack name is required')

  const stack = await getStackByName(params.name)

  const process = getStackLogsProcess({ directory: stack.directory })

  return eventStream(request.signal, function setup(send) {
    process.stdout?.on('data', data => {
      if (data instanceof Buffer) {
        send({
          data: data.toString('utf-8'),
        })
      }
    })

    return function cleanup() {
      process.disconnect()
    }
  })
}
