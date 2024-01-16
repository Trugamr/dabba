import { preferencesSessionStorage } from './preferences.server'
import { isTheme } from './theme'

export async function getTheme(request: Request) {
  const cookieHeader = request.headers.get('Cookie')
  const preferencesSession = await preferencesSessionStorage.getSession(cookieHeader)
  const incomingTheme = preferencesSession.get('theme')

  if (isTheme(incomingTheme)) {
    return incomingTheme
  }

  return null
}
