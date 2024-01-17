import { getHintUtils } from '@epic-web/client-hints'
import {
  clientHint as colorSchemeHint,
  subscribeToSchemeChange,
} from '@epic-web/client-hints/color-scheme'
import { clientHint as timeZoneHint } from '@epic-web/client-hints/time-zone'
import { clientHint as reducedMotionHint } from '@epic-web/client-hints/reduced-motion'
import { useRevalidator } from '@remix-run/react'
import { useEffect } from 'react'

const hintsUtils = getHintUtils({
  theme: {
    ...colorSchemeHint,
    cookieName: 'color-scheme',
  },
  timeZone: {
    ...timeZoneHint,
    cookieName: 'time-zone',
  },
  reducedMotion: {
    ...reducedMotionHint,
    cookieName: 'reduced-motion',
  },
})

export const { getHints } = hintsUtils

export function ClientHintCheck() {
  const { revalidate } = useRevalidator()

  useEffect(() => {
    subscribeToSchemeChange(() => {
      revalidate()
    })
  }, [revalidate])

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: hintsUtils.getClientHintCheckScript(),
      }}
    />
  )
}
