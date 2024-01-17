import {
  Link,
  Links,
  LiveReload,
  Meta,
  NavLink,
  Outlet,
  Scripts,
  ScrollRestoration,
} from '@remix-run/react'
import { PackageIcon, RocketIcon } from 'lucide-react'
import React from 'react'
import { buttonVariants } from './components/ui/button'
import { LoaderFunctionArgs, MetaFunction, json } from '@remix-run/node'
import { GlobalNavigationProgress } from './components/global-navigation-progress'
import { useTheme } from './lib/hooks/use-theme'
import { ThemeSwitcher } from './components/theme-switcher'
import { getTheme } from './lib/theme.server'

import 'nprogress/nprogress.css'
import '~/globals.css'
import { ClientHintCheck, getHints } from './components/client-hits-check'

export const meta: MetaFunction = () => {
  return [{ title: 'dabba' }]
}

export async function loader({ request }: LoaderFunctionArgs) {
  return json({
    info: {
      hints: getHints(request),
      preferences: {
        theme: await getTheme(request),
      },
    },
  })
}

type DocumentProps = {
  children?: React.ReactNode
}

function Document({ children }: DocumentProps) {
  const theme = useTheme()

  return (
    <html lang="en" className={theme}>
      <head>
        <ClientHintCheck />
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="bg-secondary">
        {children}
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  )
}

export default function App() {
  return (
    <Document>
      <GlobalNavigationProgress />
      <div className="flex min-h-screen flex-col">
        <header className="flex gap-x-8 border-b bg-background p-4">
          <Link to="/" className="flex items-center gap-x-1.5 text-xl font-medium">
            <PackageIcon className="h-[1.2em] w-[1.2em]" />
            <h1>dabba</h1>
          </Link>
          <nav className="flex grow items-center justify-between gap-x-8">
            <div className="grid grid-flow-col items-center gap-x-4">
              {[
                { to: 'stacks', label: 'Stacks' },
                { to: 'templates', label: 'Templates' },
              ].map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  data-text={label}
                  className={({ isActive }) =>
                    isActive ? 'font-medium' : 'text-foreground/80'
                  }
                >
                  {label}
                </NavLink>
              ))}
            </div>

            <div className="flex items-center gap-x-4">
              <Link
                to="deploy"
                className={buttonVariants({
                  size: 'sm',
                  className: 'gap-x-1',
                })}
              >
                <RocketIcon className="h-[1em] w-[1em]" />
                <span>Deploy</span>
              </Link>
              <ThemeSwitcher />
            </div>
          </nav>
        </header>
        <div className="h-0 grow">
          <Outlet />
        </div>
      </div>
    </Document>
  )
}
