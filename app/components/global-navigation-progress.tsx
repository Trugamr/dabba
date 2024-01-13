import { useFetchers, useNavigation } from '@remix-run/react'
import nProgress from 'nprogress'
import { useEffect, useMemo } from 'react'
import { useSpinDelay } from 'spin-delay'

export function GlobalNavigationProgress() {
  const navigation = useNavigation()
  const fetchers = useFetchers()

  const loading = useMemo(() => {
    if (navigation.state === 'idle' && fetchers.every(f => f.state === 'idle')) {
      return false
    }
    return true
  }, [navigation.state, fetchers])

  const delayedLoading = useSpinDelay(loading, {
    delay: 150,
    minDuration: 200,
  })

  useEffect(() => {
    nProgress.configure({ showSpinner: false })

    return () => {
      nProgress.remove()
    }
  }, [])

  useEffect(() => {
    if (delayedLoading) {
      nProgress.start()
    } else {
      nProgress.done()
    }
  }, [delayedLoading])

  return null
}
