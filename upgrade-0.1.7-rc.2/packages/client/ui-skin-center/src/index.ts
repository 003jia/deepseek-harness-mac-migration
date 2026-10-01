/** Durable skin preferences and authenticated background upload routes. @module */
import type { Context } from '@deepseek-ai/cordis'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type {} from '@deepseek-ai/dsh-client-connection'
import type {} from '@deepseek-ai/dsh-host-webserver'
import type {} from '@deepseek-ai/dsh-app-boot'
import { SkinCenterSettingsSchema } from './skin-settings.ts'
import {
  isBackgroundRef, readBackgroundImage, removeBackgroundImage, saveBackgroundImage, MAX_BACKGROUND_BYTES,
} from './background-store.ts'

export { SKIN_CENTER_SETTINGS_NAMESPACE, type SkinCenterSettings } from './skin-settings.ts'

/** Entire settings section remains live while the Host runs. */
export const Config = SkinCenterSettingsSchema.volatile()

const UPLOAD_PATH = '/api/skin-center/uploadBackground'
const REMOVE_PATH = '/api/skin-center/removeBackground'
const IMAGE_PATH = '/skin-center-image'

async function readImage(request: Request): Promise<Uint8Array> {
  const reader = request.body?.getReader()
  if (reader === undefined) throw new Error('background image body is required')
  const parts: Uint8Array[] = []
  let length = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > MAX_BACKGROUND_BYTES) throw new Error('background image exceeds 20 MiB')
      parts.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  if (length === 0) throw new Error('background image is empty')
  const bytes = new Uint8Array(length)
  let offset = 0
  for (const part of parts) { bytes.set(part, offset); offset += part.byteLength }
  return bytes
}

async function upload(request: Request, home: string): Promise<Response> {
  try {
    const name = new URL(request.url).searchParams.get('name') ?? ''
    const extension = name.slice(name.lastIndexOf('.')).toLowerCase()
    const ref = await saveBackgroundImage(await readImage(request), extension, home)
    return Response.json({ ref })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 400 })
  }
}

async function remove(request: Request, home: string): Promise<Response> {
  try {
    const body: unknown = await request.json()
    const ref = typeof body === 'object' && body !== null && 'ref' in body ? body.ref : undefined
    if (!isBackgroundRef(ref)) throw new Error('valid background reference required')
    return Response.json({ removed: await removeBackgroundImage(ref, home) })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 400 })
  }
}

/** Serve an opaque image reference for CSS background display.
 * @param req - incoming image request.
 * @param res - response receiving the stored bytes or an error status.
 * @param home - resolved Harness home holding the image store.
 */
export async function serveBackgroundImage(req: IncomingMessage, res: ServerResponse, home: string): Promise<void> {
  if (req.method !== 'GET') { res.writeHead(405); res.end(); return }
  const rawPath = new URL(req.url ?? '/', 'http://localhost').pathname
  const ref = rawPath.slice(IMAGE_PATH.length + 1)
  const image = await readBackgroundImage(ref, home)
  if (image === undefined) { res.writeHead(404); res.end(); return }
  res.writeHead(200, {
    'content-type': image.mediaType,
    'content-length': image.body.byteLength,
    'cache-control': 'no-store',
  })
  res.end(image.body)
}

/** Mount authenticated upload and removal routes, plus the opaque image route. */
export function apply(ctx: Context): void {
  const home = ctx.dshHomePath?.()
  if (home === undefined) throw new Error('skin-center requires the application home resolver')
  ctx.inject(['connection'], (child) => {
    child.effect(() => child.connection.fetch.register({
      path: UPLOAD_PATH, methods: ['POST'], requestBody: 'streaming', fetch: request => upload(request, home),
    }), 'skin-center upload')
    child.effect(() => child.connection.fetch.register({
      path: REMOVE_PATH, methods: ['POST'], requestBody: 'buffered', fetch: request => remove(request, home),
    }), 'skin-center remove')
  })
  ctx.inject(['webServer'], (child) => {
    child.effect(() => child.webServer.register({
      kind: 'prefix', path: IMAGE_PATH, handler: (req, res) => serveBackgroundImage(req, res, home),
    }), 'skin-center images')
  })
}
