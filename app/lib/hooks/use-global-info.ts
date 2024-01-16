import { invariant } from '@epic-web/invariant'
import { useRouteLoaderData } from '@remix-run/react'
import type { loader as rootLoader } from '~/root'

/**
 * Get global info from the loader in root
 */
export function useGlobalInfo() {
  const data = useRouteLoaderData<typeof rootLoader>('root')
  invariant(data?.info, 'No global info found in root loader')

  return data.info
}
