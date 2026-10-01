/**
 * Host registration for the skin center: the durable settings section, the
 * trusted `/skin-center` RPC channel carrying background image uploads and
 * removals, and the `/skin-center-image` route serving stored images to the
 * browser (CSS `url()` and `<img>` cannot ride the RPC envelope).
 */

import type { Context } from '@deepseek-ai/cordis'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { RpcResult } from '@deepseek-ai/dsh-host-apiproxy/api'
// Type-only: the ctx.webServer Context merge.
import type {} from '@deepseek-ai/dsh-host-webserver'
// Type-only: the ctx.connection Context merge (Host RPC registry).
import type {} from '@deepseek-ai/dsh-client-connection'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
import {
  SKIN_CENTER_SETTINGS_NAMESPACE, SkinCenterSettingsSchema,
} from './skin-settings.ts'
import {
  isBackgroundRef, readBackgroundImage, removeBackgroundImage, saveBackgroundImage,
} from './background-store.ts'

export {
  SKIN_CENTER_SETTINGS_NAMESPACE, type SkinCenterSettings,
} from './skin-settings.ts'

const SKIN_NAMESPACE = settingsNamespace(SKIN_CENTER_SETTINGS_NAMESPACE)

/** Logical RPC channel owned by this plugin (single segment, not `/api`). */
const SKIN_CENTER_CHANNEL = '/skin-center'

/** Physical prefix route serving stored background images. */
const SKIN_CENTER_IMAGE_PATH = '/skin-center-image'

/** Decode one base64 payload field; returns undefined on any malformed input. */
function decodeBase64(value: unknown): Uint8Array | undefined {
  if (typeof value !== 'string' || value.length === 0) return undefined
  try {
    const text = atob(value)
    const bytes = new Uint8Array(text.length)
    for (let index = 0; index < text.length; index += 1) bytes[index] = text.charCodeAt(index)
    return bytes
  } catch {
    return undefined
  }
}

/** Extract the lowercase extension (with dot) from an uploaded file name. */
function extensionOf(name: unknown): string | undefined {
  if (typeof name !== 'string') return undefined
  const dot = name.lastIndexOf('.')
  if (dot <= 0) return undefined
  return name.slice(dot).toLowerCase()
}

/** Interface of the store functions the RPC handler depends on (test seam). */
export interface SkinCenterStoreDeps {
  save?: typeof saveBackgroundImage
  remove?: typeof removeBackgroundImage
}

/**
 * Handle one `/skin-center` RPC endpoint: validate the payload, run the store
 * operation, and fold failures into `bad-request` results the settings page
 * can show. Never throws — transport failures stay the bridge's concern.
 * @param endpoint - channel-relative endpoint name.
 * @param payload - decoded request payload.
 * @param deps - store overrides for tests.
 * @returns the RPC result for the response envelope.
 */
export function handleSkinCenterRpc(
  endpoint: string,
  payload: unknown,
  deps: SkinCenterStoreDeps = {},
): Promise<RpcResult<{ ref?: string; removed?: boolean }>> {
  const bad = (message: string): RpcResult<{ ref?: string; removed?: boolean }> => ({
    ok: false,
    error: { code: 'bad-request', message, details: { issues: [] } },
  })
  const record = (payload: unknown): Record<string, unknown> | undefined =>
    typeof payload === 'object' && payload !== null && !Array.isArray(payload)
      ? payload as Record<string, unknown>
      : undefined
  if (endpoint === 'background/upload') {
    const body = record(payload)
    const name = body?.name
    const extension = extensionOf(name)
    const data = body === undefined ? undefined : decodeBase64(body.dataBase64)
    if (extension === undefined || data === undefined) {
      return Promise.resolve(bad('upload requires a file name with an allowed extension and base64 data'))
    }
    return (deps.save ?? saveBackgroundImage)(data, extension).then(
      ref => ({ ok: true as const, value: { ref } }),
      (error: unknown) => bad(error instanceof Error ? error.message : String(error)),
    )
  }
  if (endpoint === 'background/remove') {
    const body = record(payload)
    const ref = body?.ref
    if (!isBackgroundRef(ref)) return Promise.resolve(bad('remove requires a stored image ref'))
    return (deps.remove ?? removeBackgroundImage)(ref).then(
      removed => ({ ok: true as const, value: { removed } }),
      (error: unknown) => bad(error instanceof Error ? error.message : String(error)),
    )
  }
  return Promise.resolve(bad(`unknown skin-center endpoint ${JSON.stringify(endpoint)}`))
}

/**
 * Serve one stored background image: only GET, only a single valid ref
 * segment after the prefix. The ref is an unguessable capability token, so
 * this route keeps no origin fence — it exposes nothing beyond the art the
 * uploader already placed there.
 * @param req - routed request.
 * @param res - response owning the write.
 * @param deps - read override for tests.
 */
export async function serveBackgroundImage(
  req: IncomingMessage,
  res: ServerResponse,
  deps: { read?: typeof readBackgroundImage } = {},
): Promise<void> {
  const answer = (status: number): void => {
    res.writeHead(status)
    res.end()
  }
  if (req.method !== 'GET') {
    answer(405)
    return
  }
  /* v8 ignore next 2 -- node:http always sets url on server requests. */
  const rawPath = new URL(req.url ?? '/', 'http://x').pathname
  const ref = rawPath.slice(rawPath.indexOf(SKIN_CENTER_IMAGE_PATH) + SKIN_CENTER_IMAGE_PATH.length + 1)
  const image = await (deps.read ?? readBackgroundImage)(ref)
  if (image === undefined) {
    answer(404)
    return
  }
  res.writeHead(200, {
    'content-type': image.mediaType,
    'content-length': image.body.byteLength,
    'cache-control': 'no-store',
  })
  res.end(image.body)
}

/**
 * Register the durable settings section and, when their optional Host
 * services are composed, the upload channel and image route.
 * @param ctx - Host context that may acquire settings, connection, and HTTP services.
 */
export function apply(ctx: Context): void {
  ctx.inject(['settings'], (settingsCtx) => {
    settingsCtx.settings.register(SKIN_NAMESPACE, SkinCenterSettingsSchema)
  })
  ctx.inject(['connection'], (connectionCtx) => {
    connectionCtx.effect(
      () => connectionCtx.connection.rpc.handle(
        SKIN_CENTER_CHANNEL,
        (endpoint, payload) => handleSkinCenterRpc(endpoint, payload),
        { authority: 'trusted-host' },
      ),
      'ui-skin-center: background upload channel',
    )
  })
  ctx.inject(['webServer'], (httpCtx) => {
    httpCtx.effect(
      () => httpCtx.webServer.register({
        kind: 'prefix',
        path: SKIN_CENTER_IMAGE_PATH,
        handler: (req, res) => serveBackgroundImage(req, res),
      }),
      'ui-skin-center: background image route',
    )
  })
}
