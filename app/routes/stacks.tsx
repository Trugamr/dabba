import { NavLink, Outlet, json, useLoaderData } from '@remix-run/react'
import { buttonVariants } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { getStacks } from '~/lib/stack.server'
import { StackStatusIndicator } from '~/components/stack-status-indicator'

export async function loader() {
  const stacks = await getStacks()

  return json({
    stacks,
  })
}

export default function StacksRoute() {
  const { stacks } = useLoaderData<typeof loader>()

  return (
    <div className="flex h-full">
      <aside className="w-60 shrink-0 border-r bg-background p-4">
        <Input className="mt-2" placeholder="Search stacks" />
        <ul className="mt-4 space-y-2">
          {stacks.map(stack => {
            return (
              <li key={stack.name}>
                <NavLink
                  key={stack.name}
                  to={stack.name}
                  className={({ isActive }) =>
                    buttonVariants({
                      variant: isActive ? 'default' : 'ghost',
                      className: 'flex w-full items-center gap-x-2',
                    })
                  }
                >
                  <StackStatusIndicator status={stack.status} />
                  <span className="w-full truncate" title={stack.name}>
                    {stack.name}
                  </span>
                </NavLink>
              </li>
            )
          })}
        </ul>
      </aside>
      <div className="container min-w-0 grow overflow-y-auto p-6">
        <Outlet />
      </div>
    </div>
  )
}
