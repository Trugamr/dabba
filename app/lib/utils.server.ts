export function getProtocolFromRequest(request: Request) {
  const forwardedProto = request.headers.get('x-forwarded-proto')
  if (forwardedProto) {
    return forwardedProto
  }
  const url = new URL(request.url)
  // Remove the trailing colon
  return url.protocol.substring(0, url.protocol.length - 1)
}

export function getHostFromRequest(request: Request) {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  if (!host) {
    throw new Error('No host header found')
  }
  return host
}

export function getHostnameFromRequest(request: Request) {
  const host = getHostFromRequest(request)
  return host.split(':')[0]
}
