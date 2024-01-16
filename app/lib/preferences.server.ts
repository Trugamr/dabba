import { createCookieSessionStorage } from '@remix-run/node'
import { addYears } from 'date-fns'

export const preferencesSessionStorage = createCookieSessionStorage<{
  theme?: unknown
}>({
  cookie: {
    name: 'preferences',
    path: '/',
    expires: addYears(new Date(), 1),
  },
})
