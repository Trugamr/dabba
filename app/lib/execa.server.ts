import { ExecaError } from 'execa'

export function isExecaError(error: unknown): error is ExecaError {
  return typeof (error as ExecaError).exitCode === 'number'
}
