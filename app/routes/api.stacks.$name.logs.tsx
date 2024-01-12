import { invariantResponse } from '@epic-web/invariant'
import { LoaderFunctionArgs, json } from '@remix-run/node'
import { execa } from 'execa'
import { eventStream } from 'remix-utils/sse/server'
import { getStackByName } from '~/lib/stack.server'

export async function loader({ request, params }: LoaderFunctionArgs) {
  invariantResponse(params.name, 'Stack name is required')

  const stack = await getStackByName(params.name)

  const process = execa('docker', ['compose', 'logs', '--tail', '10', '--follow'], {
    cwd: stack.directory,
  })

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
