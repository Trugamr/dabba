import { Button } from './ui/button'
import { THEME_FETCHER_KEY, Theme } from '~/lib/theme'
import { useFetcher } from '@remix-run/react'
import { P, match } from 'ts-pattern'
import { LaptopIcon, MoonStarIcon, SunIcon } from 'lucide-react'
import { useGlobalInfo } from '~/lib/hooks/use-global-info'
import { useOptimisticTheme } from '~/lib/hooks/use-theme'

type ThemeSwitcherOptions = {
  className?: string
}

export function ThemeSwitcher({ className }: ThemeSwitcherOptions) {
  const { preferences } = useGlobalInfo()

  const fetcher = useFetcher({
    key: THEME_FETCHER_KEY,
  })

  const optimistic = useOptimisticTheme()

  const next = match(optimistic ?? preferences.theme ?? 'system')
    .with('system', () => 'light' as const)
    .with(P.union(Theme.Light, 'light'), () => 'dark' as const)
    .with(P.union(Theme.Dark, 'dark'), () => 'system' as const)
    .exhaustive()

  return (
    <fetcher.Form className={className} method="POST" action="/api/theme">
      <Button name="theme" value={next} size="icon" variant="ghost">
        {match(next)
          .with('system', () => <LaptopIcon />)
          .with(P.union(Theme.Light, 'light'), () => <SunIcon />)
          .with(P.union(Theme.Dark, 'dark'), () => <MoonStarIcon />)
          .exhaustive()}
      </Button>
    </fetcher.Form>
  )
}
