/** Schema defaults and the partial-section clamp shared by Host and browser. */
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SKIN_CENTER_SETTINGS,
  normalizeSkinCenterSettings,
} from '../src/skin-settings.ts'

describe('skin center settings', () => {
  it('defaults equal the ui-layout CSS fallbacks', () => {
    expect(DEFAULT_SKIN_CENTER_SETTINGS.glassOpacity).toBe(85)
    expect(DEFAULT_SKIN_CENTER_SETTINGS.glassBlur).toBe(12)
  })

  it('normalize keeps a complete valid section', () => {
    const section = { ...DEFAULT_SKIN_CENTER_SETTINGS, glassOpacity: 60, backgroundSize: 'contain' as const }
    expect(normalizeSkinCenterSettings(section)).toEqual(section)
  })

  it('normalize fills absent fields and clamps out-of-range numbers', () => {
    expect(normalizeSkinCenterSettings(undefined)).toEqual(DEFAULT_SKIN_CENTER_SETTINGS)
    // Hand-edited settings.yaml between schema versions: right types out of
    // range next to wrong types wholesale. The record build keeps the wrong
    // types off the literal's static type (they are wire data, not literals).
    const handEdited: Record<string, unknown> = {
      glassOpacity: 5,
      glassBlur: 999,
      backgroundScrimPercent: -3,
      backgroundBlur: 12.4,
      backgroundSize: 'stretch',
      backgroundImageRef: 7,
      backgroundEnabled: 'yes',
    }
    expect(normalizeSkinCenterSettings(handEdited as never)).toEqual({
      glassOpacity: 20,
      glassBlur: 40,
      backgroundEnabled: false,
      backgroundImageRef: '',
      backgroundScrimPercent: 0,
      backgroundBlur: 12,
      backgroundSize: 'cover',
    })
  })
})
