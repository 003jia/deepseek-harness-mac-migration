// @vitest-environment jsdom
/** Section component: copy renders through t, sliders preview then persist, upload/remove/reset act on the controller. */
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SkinCenterSection } from '../src/client/SkinCenterSection.tsx'
import { SkinCenterController } from '../src/client/controller.ts'
import { zh } from '../src/client/locales.ts'
import { DEFAULT_SKIN_CENTER_SETTINGS, type SkinCenterSettings } from '../src/skin-settings.ts'
import type { SettingsScope } from '@deepseek-ai/dsh-client-runtime/client'

afterEach(cleanup)

function scopeDouble(initial?: Partial<SkinCenterSettings>): SettingsScope<SkinCenterSettings> {
  const value = initial === undefined ? undefined : { ...DEFAULT_SKIN_CENTER_SETTINGS, ...initial }
  return {
    getSnapshot: () => ({
      status: value === undefined ? 'loading' : 'ready',
      value,
      base: undefined,
      user: undefined,
      revision: value === undefined ? undefined : 0,
      writable: true,
      mode: 'host',
    }),
    subscribe: () => () => {},
    load: () => Promise.resolve(),
    set: () => Promise.resolve(),
    unset: () => Promise.resolve(),
  } as unknown as SettingsScope<SkinCenterSettings>
}

const t = (key: keyof typeof zh): string => zh[key]
const REF = 'AAAAAAAAAAAAAAAAAAAAAA.gif'

function uploadResult(result: 'ok' | 'fail') {
  return {
    rpc: {
      call: vi.fn(() => Promise.resolve(
        result === 'ok'
          ? { ok: true as const, value: { ref: REF } }
          : { ok: false as const, error: { code: 'internal' as const, message: 'too large', details: {} } },
      )),
    },
  }
}

describe('skin center section', () => {
  it('renders a connection diagnostic without the inject face and both cards with it', () => {
    const { container, unmount } = render(<SkinCenterSection />)
    expect(container.textContent).toContain('连接未就绪')
    unmount()
    const controller = new SkinCenterController(scopeDouble(), uploadResult('ok'))
    render(<SkinCenterSection controller={controller} t={t} />)
    expect(screen.getByText(zh['title'])).toBeTruthy()
    expect(screen.getByText(zh['glass.title'])).toBeTruthy()
    expect(screen.getByText(zh['background.title'])).toBeTruthy()
    expect(screen.getByText(zh['background.noImage'])).toBeTruthy()
  })

  it('glass sliders preview on input and persist on change', async () => {
    const controller = new SkinCenterController(scopeDouble(), uploadResult('ok'))
    const preview = vi.spyOn(controller, 'preview')
    const set = vi.spyOn(controller, 'set')
    render(<SkinCenterSection controller={controller} t={t} />)
    const opacity = screen.getByLabelText(zh['glass.opacity']) as HTMLInputElement
    expect(opacity.value).toBe('85')
    await act(async () => {
      fireEvent.input(opacity, { target: { value: '40' } })
    })
    expect(preview).toHaveBeenCalledWith('glassOpacity', 40)
    expect(set).not.toHaveBeenCalled()
    await act(async () => {
      fireEvent.pointerUp(opacity)
    })
    expect(set).toHaveBeenCalledWith('glassOpacity', 40)
    expect(controller.getSnapshot().glassOpacity).toBe(40)

    const blur = screen.getByLabelText(zh['glass.blur']) as HTMLInputElement
    await act(async () => {
      fireEvent.input(blur, { target: { value: '25' } })
      fireEvent.keyUp(blur, { key: 'ArrowRight' })
    })
    expect(controller.getSnapshot().glassBlur).toBe(25)
  })

  it('the upload button opens the file picker', async () => {
    const controller = new SkinCenterController(scopeDouble(), uploadResult('ok'))
    render(<SkinCenterSection controller={controller} t={t} />)
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click')
    await act(async () => {
      fireEvent.click(screen.getByText(zh['background.upload']))
    })
    expect(clickSpy).toHaveBeenCalledOnce()
    clickSpy.mockRestore()
  })

  it('reset returns both glass values to the defaults', async () => {
    const controller = new SkinCenterController(scopeDouble({ glassOpacity: 30, glassBlur: 30 }), uploadResult('ok'))
    render(<SkinCenterSection controller={controller} t={t} />)
    await act(async () => {
      fireEvent.click(screen.getByText(zh['glass.reset']))
    })
    expect(controller.getSnapshot().glassOpacity).toBe(85)
    expect(controller.getSnapshot().glassBlur).toBe(12)
  })

  it('upload button routes the picked file through the controller and reports failures', async () => {
    const controller = new SkinCenterController(scopeDouble(), uploadResult('ok'))
    const upload = vi.spyOn(controller, 'uploadBackground')
    upload.mockImplementation((file: File) => {
      void file
      return Promise.resolve(undefined)
    })
    render(<SkinCenterSection controller={controller} t={t} />)
    const picker = document.querySelector('input[type=file]') as HTMLInputElement
    const file = new File([new Uint8Array([1, 2])], 'dance.gif', { type: 'image/gif' })
    await act(async () => {
      fireEvent.change(picker, { target: { files: [file] } })
    })
    await waitFor(() => { expect(upload).toHaveBeenCalledWith(file) })
    // A cancelled picker (empty selection) never reaches the controller.
    await act(async () => {
      fireEvent.change(picker, { target: { files: [] } })
    })
    expect(upload).toHaveBeenCalledOnce()
    // The input resets so picking the same file again still fires change.
    expect(picker.value).toBe('')

    const failing = new SkinCenterController(scopeDouble(), uploadResult('fail'))
    const failRender = render(<SkinCenterSection controller={failing} t={t} />)
    const failPicker = failRender.container.querySelector('input[type=file]') as HTMLInputElement
    await act(async () => {
      fireEvent.change(failPicker, { target: { files: [new File([new Uint8Array([3])], 'big.gif', { type: 'image/gif' })] } })
    })
    await waitFor(() => { expect(screen.getByText(`${zh['background.uploadFailed']}: too large`)).toBeTruthy() })
  })

  it('with a stored image: preview, enable checkbox, scrim slider, and remove', async () => {
    const controller = new SkinCenterController(
      scopeDouble({ backgroundImageRef: REF, backgroundEnabled: true, backgroundScrimPercent: 50 }),
      uploadResult('ok'),
    )
    const remove = vi.spyOn(controller, 'removeBackground')
    remove.mockImplementation(() => Promise.resolve())
    render(<SkinCenterSection controller={controller} t={t} />)
    const enable = screen.getByLabelText(zh['background.enable']) as HTMLInputElement
    expect(enable.checked).toBe(true)
    await act(async () => {
      fireEvent.click(enable)
    })
    expect(controller.getSnapshot().backgroundEnabled).toBe(false)

    const scrim = screen.getByLabelText(zh['background.scrim']) as HTMLInputElement
    expect(scrim.value).toBe('50')
    await act(async () => {
      fireEvent.input(scrim, { target: { value: '80' } })
      fireEvent.pointerUp(scrim)
    })
    expect(controller.getSnapshot().backgroundScrimPercent).toBe(80)

    const blur = screen.getByLabelText(zh['background.blur']) as HTMLInputElement
    await act(async () => {
      fireEvent.input(blur, { target: { value: '15' } })
      fireEvent.pointerUp(blur)
    })
    expect(controller.getSnapshot().backgroundBlur).toBe(15)

    await act(async () => {
      fireEvent.click(screen.getByText(zh['background.remove']))
    })
    expect(remove).toHaveBeenCalledOnce()
  })

  it('size select writes cover or contain only', async () => {
    const controller = new SkinCenterController(
      scopeDouble({ backgroundImageRef: REF, backgroundEnabled: true }),
      uploadResult('ok'),
    )
    render(<SkinCenterSection controller={controller} t={t} />)
    const size = screen.getByLabelText(zh['background.size']) as HTMLSelectElement
    expect(size.value).toBe('cover')
    await act(async () => {
      fireEvent.change(size, { target: { value: 'contain' } })
    })
    expect(controller.getSnapshot().backgroundSize).toBe('contain')
    await act(async () => {
      fireEvent.change(size, { target: { value: 'cover' } })
    })
    expect(controller.getSnapshot().backgroundSize).toBe('cover')
  })
})
