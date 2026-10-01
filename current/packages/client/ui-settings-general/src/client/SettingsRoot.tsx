/**
 * Settings shell root: the sidebar-foot trigger row plus the centered modal
 * panel (figma 501:29947, 1080x700) with the section nav rail. The shell is
 * a pure composition face — every piece of text (trigger label, panel title,
 * close label, sections) arrives from registrants through slots; accessible
 * names resolve to that content (trigger: its own text; dialog:
 * aria-labelledby the title node; close: visually-hidden slot text). Modal
 * open state and the active section id are component-local viewing state;
 * the onboarding coordinator mounts exactly one ordered registrant while the
 * sessions-derived empty-Hero fact is active. Visible dialog chrome belongs
 * to the step, so a mounted-but-deciding step paints nothing here.
 */
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import clsx from 'clsx'
import {
  IconAgentPresetOutline16, IconCloseOutline16, IconCodeOutline16, IconDataOutline16,
  IconPersonalizationOutline16, IconSettingsOutline16, IconSkillOutline16,
  IconSparkle16, IconUserOutline16, Modal,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { SettingsRootComponentProps, SettingsSectionRow } from './shell-contract.ts'
import css from './SettingsRoot.module.css'

/** Nav glyph by section id; unknown ids fall back to the settings gear. */
function navIcon(id: string) {
  if (id === 'models') return <IconDataOutline16 className={css.navIcon} size={16} />
  if (id === 'agent-presets') return <IconAgentPresetOutline16 className={css.navIcon} size={16} />
  if (id === 'plugins') return <IconPersonalizationOutline16 className={css.navIcon} size={16} />
  if (id === 'skills') return <IconSkillOutline16 className={css.navIcon} size={16} />
  if (id === 'mcp') return <IconCodeOutline16 className={css.navIcon} size={16} />
  if (id === 'subagents') return <IconUserOutline16 className={css.navIcon} size={16} />
  if (id === 'skin-center') return <IconSparkle16 className={css.navIcon} size={16} />
  return <IconSettingsOutline16 className={css.navIcon} size={16} />
}

type PanelProps = {
  rows: readonly SettingsSectionRow[]
  renderSlot: SettingsRootComponentProps['renderSlot']
  activeId: string | undefined
  onSelect: (id: string) => void
  onClose: () => void
}

type NavigationEntry =
  | { kind: 'section'; row: SettingsSectionRow }
  | { kind: 'group'; id: string; label: string; rows: SettingsSectionRow[] }

/**
 * The modal layer: a body-portaled full-viewport mask + centered panel.
 * Close paths: the header button, a mask click, and document-level Escape.
 */
function SettingsPanel({ rows, renderSlot, activeId, onSelect, onClose }: PanelProps) {
  // Entries can unmount underneath the requested id, so the render-time
  // projection falls back to the first row when the id is gone.
  const active = rows.find(r => r.id === activeId)?.id ?? rows[0]?.id
  const titleId = useId()
  const [collapsedGroups, setCollapsedGroups] = useState<ReadonlySet<string>>(() => new Set())
  const navigation: NavigationEntry[] = []
  for (const row of rows) {
    if (row.group === undefined) {
      navigation.push({ kind: 'section', row })
      continue
    }
    let group = navigation.find(item => item.kind === 'group' && item.id === row.group?.id)
    if (group?.kind !== 'group') {
      group = { kind: 'group', id: row.group.id, label: row.group.label, rows: [] }
      navigation.push(group)
    }
    group.rows.push(row)
  }

  // Baseline focus management: entering the dialog lands on the close button.
  const closeButton = useRef<HTMLButtonElement | null>(null)
  useEffect(() => { closeButton.current?.focus() }, [])

  return (
    <Modal open onClose={onClose} title="Settings" labelledBy={titleId} headless className={clsx(css.panel)}>
      <nav className={css.nav}>
        <div className={css.navTitle} id={titleId}>{renderSlot('settings.header', {})}</div>
        <div className={css.navList}>
          {navigation.map(item => item.kind === 'section' ? (
            <button
              key={item.row.id}
              type="button"
              className={clsx(css.navCell, item.row.id === active && css.active)}
              aria-current={item.row.id === active ? 'true' : undefined}
              onClick={() => { onSelect(item.row.id) }}
            >
              {navIcon(item.row.id)}
              <span className={css.navLabel}>{item.row.label}</span>
            </button>
          ) : (
            <div className={css.navGroup} key={item.id}>
              <button
                type="button"
                className={css.navGroupHeading}
                aria-expanded={!collapsedGroups.has(item.id) || item.rows.some(row => row.id === active)}
                onClick={() => {
                  setCollapsedGroups((previous) => {
                    const next = new Set(previous)
                    if (next.has(item.id)) next.delete(item.id)
                    else next.add(item.id)
                    return next
                  })
                }}
              >
                <span className={css.navGroupLabel}>{item.label}</span>
                <span className={clsx(css.navChevron, (collapsedGroups.has(item.id) && !item.rows.some(row => row.id === active)) && css.collapsed)} aria-hidden="true">⌄</span>
              </button>
              {(!collapsedGroups.has(item.id) || item.rows.some(row => row.id === active)) && (
                <div className={css.navGroupItems}>
                  {item.rows.map(row => (
                    <button
                      key={row.id}
                      type="button"
                      className={clsx(css.navCell, css.navChild, row.id === active && css.active)}
                      aria-current={row.id === active ? 'true' : undefined}
                      onClick={() => { onSelect(row.id) }}
                    >
                      {navIcon(row.id)}
                      <span className={css.navLabel}>{row.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </nav>
      <div className={css.content}>
        <div className={css.header}>
          <div className={css.actions}>{renderSlot('settings.action', {})}</div>
          <button ref={closeButton} type="button" className={css.close} onClick={onClose}>
            <IconCloseOutline16 size={14} />
            <span className={css.hiddenLabel}>{renderSlot('settings.close', {})}</span>
          </button>
        </div>
        <div className={css.options}>
          {active !== undefined && renderSlot('settings.section', { close: onClose }, { only: active })}
        </div>
      </div>
    </Modal>
  )
}

/**
 * Render the settings trigger and panel.
 * @param props - composed slot props (contract/slots.ts).
 * @returns the settings shell element tree.
 */
export function SettingsRoot(props: SettingsRootComponentProps) {
  const {
    wide, useSections, useOnboardingSteps, useSessions, renderSlot,
    useNavigation, acknowledgeNavigation,
  } = props
  const [open, setOpen] = useState(false)
  const [activeId, setActiveId] = useState<string | undefined>(undefined)
  const [completedOnboarding, setCompletedOnboarding] = useState<ReadonlySet<string>>(() => new Set())
  const close = useCallback(() => {
    setOpen(false)
    setActiveId(undefined)
  }, [])
  const openSection = useCallback((id: string) => {
    setActiveId(id)
    setOpen(true)
  }, [])

  // The ledger tick keeps the nav rows fresh: registrants re-register with
  // freshly localized text on locale change, and the trigger/header/close
  // seats re-render through their own outlets' subscriptions.
  const rows = useSections(s => s)
  const onboardingSteps = useOnboardingSteps(s => s)
  const onboardingActive = useSessions(state =>
    state.phase === 'ready'
    && (state.current === undefined || state.byId[state.current]?.blank === true))
  const onboardingStep = onboardingActive
    ? onboardingSteps.find(step => !completedOnboarding.has(step.id))
    : undefined
  const navigation = useNavigation(request => request)

  useEffect(() => {
    if (onboardingActive) return
    setCompletedOnboarding(new Set())
  }, [onboardingActive])

  useEffect(() => {
    if (navigation === undefined) return
    setActiveId(navigation.sectionId)
    setOpen(true)
    acknowledgeNavigation(navigation.sequence)
  }, [acknowledgeNavigation, navigation])

  const completeOnboardingStep = useCallback((id: string) => {
    setCompletedOnboarding((previous) => {
      if (previous.has(id)) return previous
      return new Set([...previous, id])
    })
  }, [])

  return (
    <>
      <button
        type="button"
        className={clsx(css.trigger, !wide && css.rail)}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => { setOpen(true) }}
      >
        {renderSlot('settings.trigger', { wide })}
      </button>
      {open && (
        <SettingsPanel
          rows={rows}
          renderSlot={renderSlot}
          activeId={activeId}
          onSelect={setActiveId}
          onClose={close}
        />
      )}
      {/* Dialog chrome and `#root` inert ownership live inside each step's
          visible branch. A step still deciding (private facts loading)
          renders null, so nothing paints or blocks while it decides. */}
      {onboardingStep !== undefined && renderSlot('settings.onboarding', {
        stepId: onboardingStep.id,
        complete: () => { completeOnboardingStep(onboardingStep.id) },
        openSection,
      }, { only: onboardingStep.id })}
    </>
  )
}
