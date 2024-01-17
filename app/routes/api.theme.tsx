import { ActionFunctionArgs, json } from '@remix-run/node'
import { ThemeFormSchema } from '~/lib/theme'
import { parse } from '@conform-to/zod'
import { getThemeCookie } from '~/lib/theme.server'

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

  return json(
    { status: 'success', submission },
    {
      headers: {
        'Set-Cookie': await getThemeCookie(submission.value.theme),
      },
    },
  )
}
