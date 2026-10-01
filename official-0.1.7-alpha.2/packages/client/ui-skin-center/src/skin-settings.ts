/** Skin center preferences stored in the Host user-settings document. */

import z from '@deepseek-ai/schemastery'

/** Settings namespace owned by the skin center plugin. */
export const SKIN_CENTER_SETTINGS_NAMESPACE = 'skin-center'

/** Field carrying the glass surface opacity (percent). */
export const GLASS_OPACITY_FIELD = 'glassOpacity'

/** Field carrying the glass backdrop blur (px). */
export const GLASS_BLUR_FIELD = 'glassBlur'

/** Field carrying whether the custom background layer paints. */
export const BACKGROUND_ENABLED_FIELD = 'backgroundEnabled'

/** Field carrying the stored background image reference (store file name). */
export const BACKGROUND_IMAGE_REF_FIELD = 'backgroundImageRef'

/** Field carrying the background scrim strength (percent over the image). */
export const BACKGROUND_SCRIM_PERCENT_FIELD = 'backgroundScrimPercent'

/** Field carrying the background blur (px). */
export const BACKGROUND_BLUR_FIELD = 'backgroundBlur'

/** Field carrying the background fill strategy. */
export const BACKGROUND_SIZE_FIELD = 'backgroundSize'

/** Glass fill strategies for the custom background layer. */
export const BACKGROUND_SIZES = ['cover', 'contain'] as const

/**
 * Default glass opacity in percent — equals the `:root` fallback in ui-layout's
 * AppFrame stylesheet, so a page renders identically before the durable
 * section loads and the runtime overwrite at defaults is a no-op.
 */
export const DEFAULT_GLASS_OPACITY = 85

/** Default glass backdrop blur in px (equals ui-layout's CSS fallback). */
export const DEFAULT_GLASS_BLUR = 12

/** Default background-enabled state (off until the user uploads art). */
export const DEFAULT_BACKGROUND_ENABLED = false

/** Default background image ref (empty: no image stored). */
export const DEFAULT_BACKGROUND_IMAGE_REF = ''

/** Default scrim strength over the image in percent. */
export const DEFAULT_BACKGROUND_SCRIM_PERCENT = 35

/** Default background blur in px. */
export const DEFAULT_BACKGROUND_BLUR = 0

/** Default background fill strategy. */
export const DEFAULT_BACKGROUND_SIZE: (typeof BACKGROUND_SIZES)[number] = 'cover'

/** Lowest glass opacity the schema accepts (below this, panels lose contrast). */
export const MIN_GLASS_OPACITY = 20

/** Highest glass blur the schema accepts (px). */
export const MAX_GLASS_BLUR = 40

/** Highest background blur the schema accepts (px). */
export const MAX_BACKGROUND_BLUR = 100

/** Durable skin center section shared by the Host schema and the browser scope. */
export interface SkinCenterSettings {
  /** Glass surface opacity in percent (MIN_GLASS_OPACITY–100). */
  glassOpacity: number
  /** Glass backdrop blur in px (0–MAX_GLASS_BLUR). */
  glassBlur: number
  /** Whether the custom background layer paints. */
  backgroundEnabled: boolean
  /** Stored background image reference; empty means no image saved. */
  backgroundImageRef: string
  /** Scrim strength over the image in percent (0–100). */
  backgroundScrimPercent: number
  /** Background blur in px (0–MAX_BACKGROUND_BLUR). */
  backgroundBlur: number
  /** Background fill strategy. */
  backgroundSize: (typeof BACKGROUND_SIZES)[number]
}

/** Durable skin center schema used by the Host settings form. */
export const SkinCenterSettingsSchema: z<SkinCenterSettings> = z.object({
  [GLASS_OPACITY_FIELD]: z.natural().min(MIN_GLASS_OPACITY).max(100).default(DEFAULT_GLASS_OPACITY),
  [GLASS_BLUR_FIELD]: z.natural().max(MAX_GLASS_BLUR).default(DEFAULT_GLASS_BLUR),
  [BACKGROUND_ENABLED_FIELD]: z.boolean().default(DEFAULT_BACKGROUND_ENABLED),
  [BACKGROUND_IMAGE_REF_FIELD]: z.string().default(DEFAULT_BACKGROUND_IMAGE_REF),
  [BACKGROUND_SCRIM_PERCENT_FIELD]: z.natural().max(100).default(DEFAULT_BACKGROUND_SCRIM_PERCENT),
  [BACKGROUND_BLUR_FIELD]: z.natural().max(MAX_BACKGROUND_BLUR).default(DEFAULT_BACKGROUND_BLUR),
  [BACKGROUND_SIZE_FIELD]: z.union([...BACKGROUND_SIZES]).default(DEFAULT_BACKGROUND_SIZE),
})

/** Defaults applied when the settings document carries no override. */
export const DEFAULT_SKIN_CENTER_SETTINGS: SkinCenterSettings = Object.freeze({
  glassOpacity: DEFAULT_GLASS_OPACITY,
  glassBlur: DEFAULT_GLASS_BLUR,
  backgroundEnabled: DEFAULT_BACKGROUND_ENABLED,
  backgroundImageRef: DEFAULT_BACKGROUND_IMAGE_REF,
  backgroundScrimPercent: DEFAULT_BACKGROUND_SCRIM_PERCENT,
  backgroundBlur: DEFAULT_BACKGROUND_BLUR,
  backgroundSize: DEFAULT_BACKGROUND_SIZE,
})

/**
 * Narrow one wire or registry value to a complete settings section, filling
 * missing or out-of-range fields with defaults. The settings form already
 * validates the schema shape; this clamp covers partially-written user edits
 * of the settings file that land between schema versions.
 * @param value - section value read from the scope snapshot.
 * @returns the complete section (defaults when the value is absent).
 */
export function normalizeSkinCenterSettings(value: Partial<SkinCenterSettings> | undefined): SkinCenterSettings {
  if (value === undefined) return { ...DEFAULT_SKIN_CENTER_SETTINGS }
  const clamp = (raw: number | undefined, min: number, max: number, fallback: number): number =>
    typeof raw === 'number' && Number.isFinite(raw) ? Math.min(max, Math.max(min, Math.round(raw))) : fallback
  return {
    glassOpacity: clamp(value.glassOpacity, MIN_GLASS_OPACITY, 100, DEFAULT_GLASS_OPACITY),
    glassBlur: clamp(value.glassBlur, 0, MAX_GLASS_BLUR, DEFAULT_GLASS_BLUR),
    backgroundEnabled: value.backgroundEnabled === true,
    backgroundImageRef: typeof value.backgroundImageRef === 'string' ? value.backgroundImageRef : '',
    backgroundScrimPercent: clamp(value.backgroundScrimPercent, 0, 100, DEFAULT_BACKGROUND_SCRIM_PERCENT),
    backgroundBlur: clamp(value.backgroundBlur, 0, MAX_BACKGROUND_BLUR, DEFAULT_BACKGROUND_BLUR),
    backgroundSize: value.backgroundSize === 'contain' ? 'contain' : 'cover',
  }
}
