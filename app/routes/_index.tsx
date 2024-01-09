import type { MetaFunction } from '@remix-run/node'

export const meta: MetaFunction = () => {
  return [{ title: 'dabba' }]
}

export default function Index() {
  return (
    <div className="p-6">
      <h1>dabba</h1>
    </div>
  )
}
