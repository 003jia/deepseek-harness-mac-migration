/**
 * Skin center settings section: one card per feature. The glass card's
 * sliders preview live on every `input` event and persist once on the
 * release `change` event; the background card uploads the picked file
 * through the controller, then enables the layer. All copy arrives through
 * the bound `t`; nothing is hardcoded.
 */

import { useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SkinCenterController } from './controller.ts'
import type { en } from './locales.ts'
import styles from './SkinCenterSection.module.css'

/** Injected dependencies of {@link SkinCenterSection} (slot `inject`). */
export interface SkinCenterSectionInjected {
  /** Controller owning the projection, DOM application, and writes. */
  controller: SkinCenterController
  /** Section copy. */
  t: (key: keyof typeof en) => string
}

/** Props delivered by the slot outlet: the inject face spread flat. */
export type SkinCenterSectionProps = Partial<SkinCenterSectionInjected>

/** One labeled slider with a live value readout. `input` previews live; the
 * pointer/keyboard release commits the standing value once. */
function SliderRow(props: {
  label: string
  value: number
  min: number
  max: number
  step: number
  suffix: string
  disabled: boolean
  onInput: (value: number) => void
  onCommit: (value: number) => void
}): ReactNode {
  const commit = (event: React.SyntheticEvent<HTMLInputElement>): void => {
    props.onCommit(Number(event.currentTarget.value))
  }
  return (
    <div className={styles['sliderRow']}>
      <label className={styles['sliderLabel']}>{props.label}</label>
      <input
        className={styles['slider']}
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        disabled={props.disabled}
        aria-label={props.label}
        onInput={(event) => { props.onInput(Number(event.currentTarget.value)) }}
        onPointerUp={commit}
        onKeyUp={commit}
      />
      <span className={styles['sliderValue']}>{`${props.value}${props.suffix}`}</span>
    </div>
  )
}

/**
 * Render the Skin center section content column. While the shell has not yet
 * injected the controller and locale bindings, paint a brief diagnostic so
 * a blank panel (which used to look like "nothing happened" when clicked)
 * can never be mistaken for a click that the panel swallowed.
 * @param props - slot-delivered injected dependencies.
 * @returns the section, or a diagnostic placeholder while the inject lands.
 */
export function SkinCenterSection(props: SkinCenterSectionProps): ReactNode {
  const { controller, t } = props
  if (controller !== undefined && t !== undefined) return <Loaded controller={controller} t={t} />
  // The inject face is racing: the section row is on the ledger before its
  // owner-binding has resolved. The locale binding may also be unavailable
  // in narrow compositions. Paint a short label so the panel is never blank.
  return (
    <div className={styles['section']}>
      <h2 className={styles['title']}>{'\u76ae\u80a4\u4e2d\u5fc3'}</h2>
      <p className={styles['intro']}>
        {controller === undefined
          ? '\u8fde\u63a5\u672a\u5c31\u7eea\uff08\u6b63\u5728\u83b7\u53d6\u63a7\u5236\u5668\uff09\u2026'
          : '\u672c\u5730\u5316\u672a\u5c31\u7eea\uff08\u6b63\u5728\u83b7\u53d6\u7ffb\u8bd1\uff09\u2026'}
      </p>
    </div>
  )
}

function Loaded({ controller, t }: SkinCenterSectionInjected): ReactNode {
  const settings = useSyncExternalStore(
    listener => controller.subscribe(listener),
    () => controller.getSnapshot(),
  )
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | undefined>(undefined)
  const picker = useRef<HTMLInputElement | null>(null)
  const hasImage = settings.backgroundImageRef !== ''

  const pick = (): void => {
    setUploadError(undefined)
    picker.current?.click()
  }

  const onPicked = (files: FileList | null): void => {
    const file = files?.[0]
    if (file === undefined) return
    setUploading(true)
    void controller.uploadBackground(file).then((failure) => {
      setUploadError(failure === undefined ? undefined : `${t('background.uploadFailed')}: ${failure}`)
    }).finally(() => { setUploading(false) })
  }

  return (
    <div className={styles['section']}>
      <h2 className={styles['title']}>{t('title')}</h2>
      <p className={styles['intro']}>{t('intro')}</p>

      <div className={styles['card']}>
        <h3 className={styles['cardTitle']}>{t('background.title')}</h3>
        <p className={styles['cardIntro']}>{t('background.intro')}</p>
        <div className={styles['toggleRow']}>
          <input
            id="skin-center-background-enable"
            type="checkbox"
            checked={settings.backgroundEnabled}
            disabled={!hasImage || uploading}
            onChange={(event) => { controller.set('backgroundEnabled', event.currentTarget.checked) }}
          />
          <label htmlFor="skin-center-background-enable">{t('background.enable')}</label>
        </div>
        {hasImage
          ? (
            <div
              className={styles['preview']}
              style={{ backgroundImage: `url("/skin-center-image/${encodeURIComponent(settings.backgroundImageRef)}")` }}
            />
          )
          : <div className={`${styles['preview']} ${styles['previewEmpty']}`}>{t('background.noImage')}</div>}
        <div className={styles['actions']}>
          <input
            ref={picker}
            className={styles['hiddenInput']}
            type="file"
            accept="image/gif,image/png,image/jpeg,image/webp,image/avif"
            onChange={(event) => {
              onPicked(event.currentTarget.files)
              // Allow re-picking the same file after a failed upload.
              event.currentTarget.value = ''
            }}
          />
          <Button variant="outline" disabled={uploading} onClick={pick}>
            {uploading ? t('background.uploading') : hasImage ? t('background.replace') : t('background.upload')}
          </Button>
          {hasImage
            ? (
              <Button
                variant="outline"
                disabled={uploading}
                onClick={() => {
                  setUploadError(undefined)
                  void controller.removeBackground()
                }}
              >
                {t('background.remove')}
              </Button>
            )
            : null}
        </div>
        {uploadError === undefined ? null : <p className={styles['error']}>{uploadError}</p>}
        <SliderRow
          label={t('background.scrim')}
          value={settings.backgroundScrimPercent}
          min={0}
          max={100}
          step={1}
          suffix="%"
          disabled={!hasImage || !settings.backgroundEnabled}
          onInput={(value) => { controller.preview('backgroundScrimPercent', value) }}
          onCommit={(value) => { controller.set('backgroundScrimPercent', value) }}
        />
        <SliderRow
          label={t('background.blur')}
          value={settings.backgroundBlur}
          min={0}
          max={100}
          step={1}
          suffix="px"
          disabled={!hasImage || !settings.backgroundEnabled}
          onInput={(value) => { controller.preview('backgroundBlur', value) }}
          onCommit={(value) => { controller.set('backgroundBlur', value) }}
        />
        <div className={styles['sliderRow']}>
          <label className={styles['sliderLabel']} htmlFor="skin-center-background-size">{t('background.size')}</label>
          <select
            id="skin-center-background-size"
            className={styles['sizeSelect']}
            value={settings.backgroundSize}
            disabled={!hasImage || !settings.backgroundEnabled}
            onChange={(event) => {
              controller.set('backgroundSize', event.currentTarget.value === 'contain' ? 'contain' : 'cover')
            }}
          >
            <option value="cover">{t('background.size.cover')}</option>
            <option value="contain">{t('background.size.contain')}</option>
          </select>
        </div>
      </div>

      <div className={styles['card']}>
        <h3 className={styles['cardTitle']}>{t('glass.title')}</h3>
        <p className={styles['cardIntro']}>{t('glass.intro')}</p>
        <SliderRow
          label={t('glass.opacity')}
          value={settings.glassOpacity}
          min={20}
          max={100}
          step={1}
          suffix="%"
          disabled={false}
          onInput={(value) => { controller.preview('glassOpacity', value) }}
          onCommit={(value) => { controller.set('glassOpacity', value) }}
        />
        <SliderRow
          label={t('glass.blur')}
          value={settings.glassBlur}
          min={0}
          max={40}
          step={1}
          suffix="px"
          disabled={false}
          onInput={(value) => { controller.preview('glassBlur', value) }}
          onCommit={(value) => { controller.set('glassBlur', value) }}
        />
        <div className={styles['actions']}>
          <Button variant="outline" onClick={() => { controller.set('glassOpacity', 85); controller.set('glassBlur', 12) }}>
            {t('glass.reset')}
          </Button>
        </div>
      </div>
    </div>
  )
}
