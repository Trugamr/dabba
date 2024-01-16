import { invariant } from '@epic-web/invariant'
import { THEME_FETCHER_KEY, ThemeFormSchema, isTheme } from '../theme'
import { useGlobalInfo } from './use-global-info'
import { useFetcher } from '@remix-run/react'
import { parse } from '@conform-to/zod'

export function useTheme() {
  const { preferences, hints } = useGlobalInfo()
  invariant(isTheme(hints.theme), "Hints theme isn't a valid theme")

  const optimistic = useOptimisticTheme()
  if (optimistic === 'system') {
    return hints.theme
  }

  const theme = optimistic ?? preferences.theme ?? hints.theme
  invariant(isTheme(theme), "Theme isn't a valid theme")

  return theme
}

export function useOptimisticTheme() {
  const themeFetcher = useFetcher({ key: THEME_FETCHER_KEY })

  if (themeFetcher.formData) {
    const submission = parse(themeFetcher.formData, {
      schema: ThemeFormSchema,
    })

    return submission.value?.theme
  }
}
