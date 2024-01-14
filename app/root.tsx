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
import { MetaFunction } from '@remix-run/node'
import { GlobalNavigationProgress } from './components/global-navigation-progress'

import 'nprogress/nprogress.css'
import '~/globals.css'

export const meta: MetaFunction = () => {
  return [{ title: 'dabba' }]
}

type DocumentProps = {
  children?: React.ReactNode
}

function Document({ children }: DocumentProps) {
  return (
    <html lang="en">
      <head>
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

const links = [
  {
    to: 'stacks',
    label: 'Stacks',
  },
  {
    to: 'templates',
    label: 'Templates',
  },
]

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
              {links.map(({ to, label }) => (
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
          </nav>
        </header>
        <div className="h-0 flex-grow">
          <Outlet />
        </div>
      </div>
    </Document>
  )
}
