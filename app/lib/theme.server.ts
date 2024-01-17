import { createCookie } from '@remix-run/node'
import { isTheme, ThemeFormSchema } from '~/lib/theme'
import { addYears } from 'date-fns'
import { z } from 'zod'

const themeCookieName = 'theme'

export async function getTheme(request: Request) {
  const cookieHeader = request.headers.get('Cookie')
  const themeCookie = createCookie(themeCookieName)
  const incomingTheme = await themeCookie.parse(cookieHeader)

  if (isTheme(incomingTheme)) {
    return incomingTheme
  }

  return null
}

export async function getThemeCookie(theme: z.infer<typeof ThemeFormSchema>['theme']) {
  const themeCookie = createCookie(themeCookieName)

  return await themeCookie.serialize(theme === 'system' ? null : theme, {
    path: '/',
    expires: addYears(new Date(), 1),
  })
}
