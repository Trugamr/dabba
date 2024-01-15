import { execa } from 'execa'

export async function getDockerComposeVersion() {
  const { stdout } = await execa('docker', ['compose', 'version'])
  return stdout
}