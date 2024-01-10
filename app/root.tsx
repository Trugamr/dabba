import {
  Link,
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from '@remix-run/react'
import { PackageIcon } from 'lucide-react'
import React from 'react'
import '~/globals.css'

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
      <body>
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
      <div className="flex min-h-screen flex-col bg-secondary">
        <header className="bg border-b-2 bg-background p-4">
          <Link to="/" className="flex max-w-max items-center gap-x-1.5 text-lg font-medium">
            <PackageIcon className="h-[1.2em] w-[1.2em]" />
            <h1>dabba</h1>
          </Link>
        </header>
        <div className="h-0 flex-grow">
          <Outlet />
        </div>
      </div>
    </Document>
  )
}
