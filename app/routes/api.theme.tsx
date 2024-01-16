import { ActionFunctionArgs, json } from '@remix-run/node'
import { preferencesSessionStorage } from '~/lib/preferences.server'
import { ThemeFormSchema } from '~/lib/theme'
import { parse } from '@conform-to/zod'

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData()
  const submission = parse(formData, {
    schema: ThemeFormSchema,
  })

  if (submission.intent !== 'submit') {
    return json({ status: 'idle', submission })
  }

  if (!submission.value) {
    return json({ status: 'error', submission }, { status: 400, statusText: 'Bad Request' })
  }

  const cookieHeader = request.headers.get('Cookie')
  const preferences = await preferencesSessionStorage.getSession(cookieHeader)

  const theme = submission.value.theme

  if (theme === 'system') {
    preferences.set('theme', null)
  } else {
    preferences.set('theme', theme)
  }

  return json(
    { status: 'success', submission },
    {
      headers: {
        'Set-Cookie': await preferencesSessionStorage.commitSession(preferences),
      },
    },
  )
}
