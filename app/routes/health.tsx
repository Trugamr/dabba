import { getDockerComposeVersion } from '~/lib/docker/compose.server'

export async function loader() {
  try {
    await getDockerComposeVersion()
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Failed to get docker compose version`)

    return new Response('ERROR', {
      status: 500,
      statusText: 'Internal Server Error',
    })
  }

  return new Response('OK', {
    status: 200,
    statusText: 'OK',
  })
}
