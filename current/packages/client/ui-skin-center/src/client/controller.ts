/**
 * Skin center browser controller: owns the durable settings projection,
 * applies it to the DOM (glass CSS variables on the document root, the
 * background layer on the body), persists user edits through the settings
 * scope, and carries background image uploads over the `/skin-center` RPC
 * channel. DOM is this plugin's collaboration surface: ui-layout's frame
 * styles consume the `--dsw-glass-*` variables, so no cross-plugin value
 * import is needed (client bundle purity gate).
 */

import type { SettingsScope } from '@deepseek-ai/dsh-client-runtime/client'
import type { ConnectionHandle } from '@deepseek-ai/dsh-api-remotes/client'
import {
  DEFAULT_SKIN_CENTER_SETTINGS,
  BACKGROUND_ENABLED_FIELD,
  BACKGROUND_IMAGE_REF_FIELD,
  normalizeSkinCenterSettings,
  type SkinCenterSettings,
} from '../skin-settings.ts'

/** URL prefix of the Host route serving stored background images. */
const IMAGE_URL_PREFIX = '/skin-center-image'

/** RPC channel and endpoints owned by the Host half. */
const SKIN_CENTER_CHANNEL = '/skin-center'

/** Stylesheet painting the background layer under the app. */
const SKIN_BACKGROUND_CSS = `
body[data-dsh-skin-bg] {
  background: transparent;
}
body[data-dsh-skin-bg]::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(255, 255, 255, var(--dsh-skin-bg-scrim, 0.35)) 0%, rgba(255, 255, 255, var(--dsh-skin-bg-scrim, 0.35)) 100%),
    var(--dsh-skin-bg-image);
  background-size: var(--dsh-skin-bg-size, cover), var(--dsh-skin-bg-size, cover);
  background-position: center, center;
  background-repeat: no-repeat, no-repeat;
  filter: blur(var(--dsh-skin-bg-blur, 0px));
}
body[data-ds-dark-theme][data-dsh-skin-bg]::before {
  background-image:
    linear-gradient(rgba(6, 14, 36, var(--dsh-skin-bg-scrim, 0.35)) 0%, rgba(6, 14, 36, var(--dsh-skin-bg-scrim, 0.35)) 100%),
    var(--dsh-skin-bg-image);
}
`

const STYLE_TAG_ID = 'dsh-skin-center/background-styles'

/** Encode one uploaded file as base64 in memory-safe chunks. */
function toBase64(data: ArrayBuffer): string {
  const bytes = new Uint8Array(data)
  let text = ''
  const CHUNK = 0x8000
  for (let offset = 0; offset < bytes.length; offset += CHUNK) {
    text += String.fromCharCode(...bytes.subarray(offset, offset + CHUNK))
  }
  return btoa(text)
}

/** Writable settings fields (every scalar field). */
type SkinCenterField = keyof SkinCenterSettings

/**
 * Projection and write-back owner for the skin center settings. The scope is
 * the durable source of truth: every scope snapshot replaces the local value
 * and repaints; user edits apply optimistically to the DOM and then persist
 * field-by-field through the scope. Slider drags call {@link preview} per
 * pointer move and persist once on release through {@link set}.
 */
export class SkinCenterController {
  private value: SkinCenterSettings = { ...DEFAULT_SKIN_CENTER_SETTINGS }
  private readonly listeners = new Set<() => void>()

  /**
   * @param host - durable settings scope owned by this plugin's client half.
   * @param connection - connection handle carrying the upload RPC channel.
   */
  constructor(
    private readonly host: SettingsScope<SkinCenterSettings>,
    private readonly connection: Pick<ConnectionHandle, 'rpc'>,
  ) {
    this.host.subscribe(() => { this.adopt() })
    this.adopt()
  }

  /** Reads the current normalized settings.
   * @returns the current snapshot (stable reference until the next change). */
  getSnapshot(): SkinCenterSettings {
    return this.value
  }

  /**
   * Observe value replacements.
   * @param listener - invoked after each value change.
   * @returns the disposer removing this listener.
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  /**
   * Apply one field locally and persist it. The local apply is optimistic;
   * a rejected write reloads the durable value through the scope.
   * @param field - settings field name.
   * @param value - scalar value to store.
   */
  set(field: SkinCenterField, value: SkinCenterSettings[SkinCenterField]): void {
    this.value = { ...this.value, [field]: value }
    this.apply()
    this.publish()
    void this.host.set(field, value)
  }

  /**
   * Apply one field locally without persisting (live slider feedback); the
   * release event follows with a {@link set} that persists the same value.
   * @param field - settings field name.
   * @param value - scalar value to show.
   */
  preview(field: SkinCenterField, value: SkinCenterSettings[SkinCenterField]): void {
    this.value = { ...this.value, [field]: value }
    this.apply()
    this.publish()
  }

  /**
   * Upload one picked image, persist its ref, and enable the background.
   * @param file - the user's picked image file.
   * @returns the failure message, or undefined on success.
   */
  async uploadBackground(file: File): Promise<string | undefined> {
    let dataBase64: string
    try {
      dataBase64 = toBase64(await file.arrayBuffer())
    } catch {
      return 'read failed'
    }
    const result = await this.connection.rpc.call(SKIN_CENTER_CHANNEL, 'background/upload', {
      name: file.name,
      dataBase64,
    })
    if (!result.ok) return result.error.message
    const ref = (result.value as { ref?: string }).ref
    if (typeof ref !== 'string' || ref === '') return 'upload returned no ref'
    this.set(BACKGROUND_IMAGE_REF_FIELD, ref)
    this.set(BACKGROUND_ENABLED_FIELD, true)
    return undefined
  }

  /**
   * Disable the background and delete the stored image behind the current ref.
   */
  async removeBackground(): Promise<void> {
    const previous = this.value.backgroundImageRef
    this.set(BACKGROUND_IMAGE_REF_FIELD, '')
    this.set(BACKGROUND_ENABLED_FIELD, false)
    if (previous !== '') {
      await this.connection.rpc.call(SKIN_CENTER_CHANNEL, 'background/remove', { ref: previous })
    }
  }

  /**
   * Repaint the DOM from the current value: glass variables on the document
   * root (ui-layout's frame styles consume them), background layer on the body.
   */
  apply(): void {
    document.documentElement.style.setProperty('--dsw-glass-opacity', `${this.value.glassOpacity}%`)
    document.documentElement.style.setProperty('--dsw-glass-blur', `${this.value.glassBlur}px`)
    const active = this.value.backgroundEnabled && this.value.backgroundImageRef !== ''
    if (!active) {
      document.body.removeAttribute('data-dsh-skin-bg')
      for (const name of ['--dsh-skin-bg-image', '--dsh-skin-bg-size', '--dsh-skin-bg-scrim', '--dsh-skin-bg-blur']) {
        document.body.style.removeProperty(name)
      }
      return
    }
    document.body.setAttribute('data-dsh-skin-bg', '')
    document.body.style.setProperty(
      '--dsh-skin-bg-image',
      `url("${IMAGE_URL_PREFIX}/${encodeURIComponent(this.value.backgroundImageRef)}")`,
    )
    document.body.style.setProperty('--dsh-skin-bg-size', this.value.backgroundSize)
    document.body.style.setProperty('--dsh-skin-bg-scrim', String(this.value.backgroundScrimPercent / 100))
    document.body.style.setProperty('--dsh-skin-bg-blur', `${this.value.backgroundBlur}px`)
  }

  /** Adopt the scope's durable section as the local value and repaint. */
  private adopt(): void {
    const next = normalizeSkinCenterSettings(this.host.getSnapshot().value)
    if (settingsEqual(this.value, next)) return
    this.value = next
    this.apply()
    this.publish()
  }

  private publish(): void {
    for (const listener of [...this.listeners]) listener()
  }
}

/** Field-by-field equality; the section is a flat scalar record. */
function settingsEqual(left: SkinCenterSettings, right: SkinCenterSettings): boolean {
  return (Object.keys(left) as SkinCenterField[]).every(key => left[key] === right[key])
}

/**
 * Inject the background-layer stylesheet once. Idempotent: repeated calls
 * (HMR reloads of the plugin) reuse the existing tag.
 */
export function ensureSkinStyleTag(): void {
  if (document.getElementById(STYLE_TAG_ID) !== null) return
  const tag = document.createElement('style')
  tag.id = STYLE_TAG_ID
  tag.dataset.plugin = 'dsh-ui-skin-center'
  tag.textContent = SKIN_BACKGROUND_CSS
  document.head.appendChild(tag)
}
