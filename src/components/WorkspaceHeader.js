"use client"

import { useEffect, useState, useMemo } from "react"
import {
  Info,
  HelpCircle,
  ClipboardList,
  Grid3X3,
  ChevronsLeft,
  ChevronsRight,
  MapPinned,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"
import { TooltipProvider } from "@/components/ui/tooltip"
import { TouchAwareTooltip, useTouchPrimaryInput } from "@/components/TouchAwareTooltip"
import ObservationTableDialog from "@/components/ObservationTableDialog"
import { resetTourForTesting } from "@/components/WorkspaceTour"
import { useStore } from "@/store/useStore"
import { getTranslation } from "@/i18n"

const TOUCH_HINT_KEY = "olabs_header_touch_hint_dismissed"

function TooltipBody({ title, children }) {
  return (
    <div className="flex flex-col items-center justify-center text-center">
      <p className="m-0 font-semibold leading-none text-foreground">{title}</p>
      {children ? <p className="m-0 mt-1 text-xs leading-snug text-muted-foreground">{children}</p> : null}
    </div>
  )
}

function TouchHeaderHint({ t }) {
  const touchPrimary = useTouchPrimaryInput()
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(TOUCH_HINT_KEY) === "1")
    } catch {
      setDismissed(false)
    }
  }, [])

  const dismiss = () => {
    try {
      localStorage.setItem(TOUCH_HINT_KEY, "1")
    } catch {
      /* ignore */
    }
    setDismissed(true)
  }

  if (!touchPrimary || dismissed) return null

  return (
    <div className="workspace-header__touch-hint" role="note">
      <span>
        <strong className="text-foreground">{t.workspace_touch_hint}</strong> {t.workspace_touch_text}
      </span>
      <button type="button" className="workspace-header__touch-hint-dismiss" onClick={dismiss}>
        {t.workspace_got_it}
      </button>
    </div>
  )
}

export default function WorkspaceHeader() {
  const touchPrimary = useTouchPrimaryInput()
  const [obsDialogOpen, setObsDialogOpen] = useState(false)
  const [infoDialogOpen, setInfoDialogOpen] = useState(false)
  const [headerActionsOpen, setHeaderActionsOpen] = useState(false)
  const [hoverOpen, setHoverOpen] = useState(false)

  const language = useStore((s) => s.language)
  const t = useMemo(() => getTranslation(language), [language])

  const experimentSelected = useStore((s) => s.experimentSelected)
  const activityObservationUnlocked = useStore((s) => s.activityObservationUnlocked)
  const openActivityObservationForCurrentExperiment = useStore(
    (s) => s.openActivityObservationForCurrentExperiment
  )
  const activityObservationReplayEnabled = Boolean(activityObservationUnlocked[experimentSelected])
  const tourIndicator = useStore((s) => s.tourIndicator)

  useEffect(() => {
    const onTourHeader = (e) => {
      if (typeof e.detail?.open === "boolean") setHeaderActionsOpen(e.detail.open)
    }
    window.addEventListener("olabs-tour-set-header-actions", onTourHeader)
    return () => window.removeEventListener("olabs-tour-set-header-actions", onTourHeader)
  }, [])

  const isHeaderActionsOpen = headerActionsOpen || (!touchPrimary && hoverOpen)

  return (
    <TooltipProvider delayDuration={250} skipDelayDuration={150}>
      <header className="workspace-header" data-tour="header">
        <div className="workspace-header__main">
          <div className="workspace-header__title-wrap">
            <h1 className="workspace-header__title theoryH5" data-tour="header-title">
              {t.headcomp_title}
            </h1>
          </div>
          <div className="workspace-header__actions">
            <div
              className="workspace-header__actions-cluster"
              onMouseEnter={() => {
                if (touchPrimary) return
                setHoverOpen(true)
              }}
              onMouseLeave={() => {
                if (touchPrimary) return
                setHoverOpen(false)
              }}
            >
              <TouchAwareTooltip
                tooltip={<TooltipBody title={t.workspace_watch_tour} />}
                side="bottom"
                align="end"
                showTouchFooter={false}
              >
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="workspace-header__icon-action shrink-0"
                  onClick={resetTourForTesting}
                  data-tour="watch-tour-again"
                  aria-label={t.workspace_watch_tour}
                  title={t.workspace_watch_tour}
                >
                  <MapPinned className="h-5 w-5" aria-hidden />
                  {tourIndicator ? (
                    <span
                      aria-hidden
                      style={{
                        position: "absolute",
                        top: 6,
                        right: 6,
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        backgroundColor: "#dc2626",
                        boxShadow: "0 0 0 2px white",
                      }}
                    />
                  ) : null}
                </Button>
              </TouchAwareTooltip>

              <div
                id="workspace-header-actions"
                className={
                  !isHeaderActionsOpen
                    ? "workspace-header__actions-group workspace-header__actions-group--collapsed"
                    : "workspace-header__actions-group"
                }
                aria-hidden={!isHeaderActionsOpen}
              >
                <TouchAwareTooltip
                  tooltip={<TooltipBody title={t.workspace_observation_table} />}
                  side="bottom"
                  showTouchFooter={false}
                >
                  <button
                    type="button"
                    className="workspace-header-icon-btn workspace-header__icon-action"
                    onClick={() => setObsDialogOpen(true)}
                    tabIndex={isHeaderActionsOpen ? 0 : -1}
                    data-tour="observations"
                    aria-label={t.workspace_observation_table}
                    title={t.workspace_observation_table}
                  >
                    <Grid3X3 className="workspace-header-icon" aria-hidden />
                  </button>
                </TouchAwareTooltip>

                <TouchAwareTooltip
                  tooltip={<TooltipBody title={t.workspace_observation} />}
                  side="bottom"
                  showTouchFooter={false}
                >
                  <button
                    type="button"
                    className="workspace-header-icon-btn workspace-header__icon-action"
                    onClick={() => {
                      if (!activityObservationReplayEnabled) return
                      openActivityObservationForCurrentExperiment()
                    }}
                    tabIndex={isHeaderActionsOpen ? 0 : -1}
                    data-tour="activity-observation"
                    aria-label={t.workspace_observation}
                    title={
                      activityObservationReplayEnabled
                        ? t.workspace_observation
                        : t.workspace_observation_unlock
                    }
                    aria-disabled={!activityObservationReplayEnabled}
                    style={{
                      opacity: activityObservationReplayEnabled ? 1 : 0.4,
                      cursor: activityObservationReplayEnabled ? "pointer" : "not-allowed",
                    }}
                  >
                    <ClipboardList className="workspace-header-icon" aria-hidden />
                  </button>
                </TouchAwareTooltip>

                <TouchAwareTooltip
                  tooltip={<TooltipBody title={t.workspace_help} />}
                  side="bottom"
                  showTouchFooter={false}
                >
                  <button
                    type="button"
                    className="workspace-header-icon-btn workspace-header__icon-action"
                    tabIndex={isHeaderActionsOpen ? 0 : -1}
                    data-tour="help"
                    aria-label={t.workspace_help}
                    title={t.workspace_help}
                  >
                    <HelpCircle className="workspace-header-icon" aria-hidden />
                  </button>
                </TouchAwareTooltip>

                <Dialog open={infoDialogOpen} onOpenChange={setInfoDialogOpen}>
                  <TouchAwareTooltip
                    tooltip={<TooltipBody title={t.workspace_instructions} />}
                    side="bottom"
                    align="end"
                    showTouchFooter={false}
                  >
                    <DialogTrigger asChild>
                      <button
                        type="button"
                        className="workspace-header-icon-btn workspace-header__icon-action"
                        tabIndex={isHeaderActionsOpen ? 0 : -1}
                        data-tour="info"
                        aria-label={t.workspace_lab_instructions_title}
                        title={t.workspace_instructions}
                      >
                        <Info className="workspace-header-icon" aria-hidden />
                      </button>
                    </DialogTrigger>
                  </TouchAwareTooltip>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t.workspace_lab_instructions_title}</DialogTitle>
                      <DialogDescription>{t.workspace_lab_instructions_desc}</DialogDescription>
                    </DialogHeader>
                    <div className="lab-instructions-steps">
                      {["workspace_lab_step1", "workspace_lab_step2", "workspace_lab_step3", "workspace_lab_step4"].map((key, i) => (
                        <p key={i}>
                          {i + 1}. {t[key]}
                        </p>
                      ))}
                    </div>
                    <div className="lab-instructions-footer">
                      <Button onClick={() => setInfoDialogOpen(false)}>{t.close}</Button>

                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <TouchAwareTooltip
                tooltip={
                  <TooltipBody title={isHeaderActionsOpen ? t.workspace_hide_tools : t.workspace_show_tools} />
                }
                side="bottom"
                align="end"
                showTouchFooter={false}
              >
                <button
                  type="button"
                  className="workspace-header-icon-btn workspace-header__actions-collapse-toggle workspace-header__icon-action"
                  onClick={() => setHeaderActionsOpen((o) => !o)}
                  aria-expanded={isHeaderActionsOpen}
                  aria-controls="workspace-header-actions"
                  aria-label={isHeaderActionsOpen ? t.workspace_collapse_tools : t.workspace_expand_tools}
                  title={isHeaderActionsOpen ? t.workspace_hide_tools : t.workspace_show_tools}
                  data-tour="header-tools-toggle"
                >
                  {isHeaderActionsOpen ? (
                    <ChevronsRight className="workspace-header-icon" aria-hidden />
                  ) : (
                    <ChevronsLeft className="workspace-header-icon" aria-hidden />
                  )}
                </button>
              </TouchAwareTooltip>
            </div>
          </div>
        </div>
        <TouchHeaderHint t={t} />
      </header>

      <ObservationTableDialog open={obsDialogOpen} onOpenChange={setObsDialogOpen} />
    </TooltipProvider>
  )
}
