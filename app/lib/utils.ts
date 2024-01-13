import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Create a `Response` with a 404 status code
 */
export function notFound(message: string) {
  return new Response(message, {
    status: 404,
    statusText: 'Not Found',
  })
}

/**
 * Create a `Response` with a 400 status code
 */
export function badRequest(message: string) {
  return new Response(message, {
    status: 400,
    statusText: 'Bad Request',
  })
}
