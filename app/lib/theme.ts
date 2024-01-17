import { z } from 'zod'

export enum Theme {
  Light = 'light',
  Dark = 'dark',
}

const themes = Object.values<Theme>(Theme)

export const THEME_FETCHER_KEY = 'THEME_FETCHER'

export const ThemeFormSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
})

/**
 * Narrow down the type of a string to a Theme
 */
export function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && themes.includes(value as Theme)
}
