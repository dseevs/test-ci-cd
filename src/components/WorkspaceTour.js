"use client"

import "@/app/theory/theory.css"
import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { useStore } from "@/store/useStore"
import { getTranslation } from "@/i18n"
import { sendGuidedTourCompleted } from "@/utils/messaging/sender"

/** v3 tour -- updated for sidebar layout; bump key so returning users see it once */
const TOUR_STORAGE_KEY = "olabs_simulation_tour_v3_completed"
const LEGACY_TOUR_KEY = "olabs_simulation_tour_completed"

/**
 * @typedef {Object} TourStep
 * @property {string | null} target - data-tour id, or null for full-screen intro/outro
 * @property {string} title
 * @property {string[]} paragraphs
 * @property {string[]} [bullets]
 * @property {"default" | "main" | "side" | "corner"} [placement] - tooltip placement hint
 */

/** @type {TourStep[]} */
/** Steps that need the collapsible header strip visible (rect & spotlight) */
const HEADER_TOOLS_TARGETS = new Set(["observations", "activity-observation", "help", "info"])

function buildTourSteps(t) {
  return [
    {
      target: null,
      title: t.tour_welcome_title,
      paragraphs: [t.tour_welcome_p1, t.tour_welcome_p2],
    },
    {
      target: "header-title",
      title: t.tour_header_title,
      paragraphs: [t.tour_header_p1],
    },
    {
      target: "watch-tour-again",
      title: t.tour_watch_title,
      paragraphs: [t.tour_watch_p1],
    },
    {
      target: "header-tools-toggle",
      title: t.tour_quick_tools_title,
      paragraphs: [t.tour_quick_tools_p1],
    },
    {
      target: "observations",
      title: t.tour_observation_table_title,
      paragraphs: [t.tour_observation_table_p1],
    },
    {
      target: "activity-observation",
      title: t.tour_activity_observation_title,
      paragraphs: [t.tour_activity_observation_p1],
    },
    {
      target: "help",
      title: t.tour_help_title,
      paragraphs: [t.tour_help_p1],
    },
    {
      target: "info",
      title: t.tour_lab_instructions_title,
      paragraphs: [t.tour_lab_instructions_p1],
    },
    {
      target: "side-workspace",
      title: t.tour_sidebar_title,
      placement: "side",
      paragraphs: [t.tour_sidebar_p1],
    },
    {
      target: "main-workspace",
      title: t.tour_simulator_title,
      placement: "main",
      paragraphs: [t.tour_simulator_p1],
    },
    {
      target: null,
      title: t.tour_ready_title,
      paragraphs: [t.tour_ready_p1],
    },
  ]
}

/** For testing: call from console \u2014 restartWorkspaceTour() \u2014 to show the tour again without refreshing. */
export function resetTourForTesting() {
  try {
    localStorage.removeItem(TOUR_STORAGE_KEY)
    localStorage.removeItem(LEGACY_TOUR_KEY)
  } catch {}
  if (typeof window !== "undefined" && window.dispatchEvent) {
    window.dispatchEvent(new CustomEvent("olabs-restart-tour"))
  }
}

function TourStepBody({ paragraphs, bullets }) {
  return (
    <div className="workspace-tour__tooltip-body theoryContent">
      {paragraphs.map((p, i) => (
        <p key={i} className="workspace-tour__tooltip-body-para">
          {p}
        </p>
      ))}
      {bullets && bullets.length > 0 ? (
        <ul>
          {bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function TourTooltipCard({
  step,
  stepIndex,
  total,
  isLast,
  isFirst,
  style,
  onSkip,
  onNext,
  onBack,
  labels,
}) {
  return (
    <div className="workspace-tour__tooltip workspace-tour__tooltip--moving" style={style}>
      <h2 id="workspace-tour-title" className="workspace-tour__tooltip-title theoryH5">
        {step.title}
      </h2>
      <TourStepBody paragraphs={step.paragraphs} bullets={step.bullets} />
      <div
        className="workspace-tour__tooltip-footer"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}
      >
        <Button type="button" variant="ghost" size="sm" onClick={onSkip}>
          {labels.skip}
        </Button>
        <span className="workspace-tour__step-indicator">
          {stepIndex + 1}/{total}
        </span>
        <div className="workspace-tour__tooltip-actions">
          {!isFirst ? (
            <Button type="button" variant="outline" size="sm" onClick={onBack}>
              {labels.back}
            </Button>
          ) : null}
          <Button type="button" size="sm" onClick={onNext}>
            {isLast ? labels.finish : labels.next}
          </Button>
        </div>
      </div>
    </div>
  )
}

const TOOLTIP_WIDTH = 360
const TOOLTIP_MIN_EDGE = 16
const GAP = 12
const EST_HEIGHT = 260

function computeTooltipStyle(step, targetRect, w, h) {
  const placement = step?.placement ?? "default"

  if (!targetRect) {
    return {
      position: "fixed",
      bottom: "24px",
      left: "50%",
      transform: "translateX(-50%)",
      width: `min(${TOOLTIP_WIDTH}px, calc(100vw - 2rem))`,
      transition: "left 0.25s ease-out, top 0.25s ease-out, transform 0.25s ease-out",
    }
  }

  if (placement === "main") {
    const minSideSpace = TOOLTIP_WIDTH + GAP + TOOLTIP_MIN_EDGE
    const roomOnRight = w - targetRect.right - GAP >= minSideSpace
    const roomOnLeft = targetRect.left - GAP >= minSideSpace
    const workspaceNearlyFullBleed =
      targetRect.width >= w - TOOLTIP_MIN_EDGE * 3 || (!roomOnRight && !roomOnLeft)

    if (workspaceNearlyFullBleed) {
      return {
        position: "fixed",
        left: "50%",
        bottom: "max(24px, env(safe-area-inset-bottom, 0px))",
        transform: "translateX(-50%)",
        width: `min(${TOOLTIP_WIDTH}px, calc(100vw - 2rem))`,
        maxWidth: "calc(100vw - 2rem)",
        transition: "left 0.25s ease-out, bottom 0.25s ease-out, transform 0.25s ease-out",
      }
    }

    let left = targetRect.right + GAP
    if (left + TOOLTIP_WIDTH > w - TOOLTIP_MIN_EDGE) {
      left = targetRect.left - GAP - TOOLTIP_WIDTH
    }
    let top = targetRect.top + targetRect.height / 2 - EST_HEIGHT / 2
    top = Math.max(TOOLTIP_MIN_EDGE, Math.min(h - EST_HEIGHT - TOOLTIP_MIN_EDGE, top))
    return {
      position: "fixed",
      left: `${left}px`,
      top: `${top}px`,
      width: `${TOOLTIP_WIDTH}px`,
      transition: "left 0.25s ease-out, top 0.25s ease-out",
    }
  }

  if (placement === "side") {
    let left = targetRect.left - GAP - TOOLTIP_WIDTH
    if (left < TOOLTIP_MIN_EDGE) {
      left = targetRect.right + GAP
    }
    let top = targetRect.top + targetRect.height / 2 - EST_HEIGHT / 2
    top = Math.max(TOOLTIP_MIN_EDGE, Math.min(h - EST_HEIGHT - TOOLTIP_MIN_EDGE, top))
    return {
      position: "fixed",
      left: `${left}px`,
      top: `${top}px`,
      width: `${TOOLTIP_WIDTH}px`,
      transition: "left 0.25s ease-out, top 0.25s ease-out",
    }
  }

  if (placement === "corner") {
    let left = targetRect.right + GAP
    if (left + TOOLTIP_WIDTH > w - TOOLTIP_MIN_EDGE) {
      left = Math.max(TOOLTIP_MIN_EDGE, targetRect.left - GAP - TOOLTIP_WIDTH)
    }
    let top = targetRect.bottom + GAP
    if (top + EST_HEIGHT > h - TOOLTIP_MIN_EDGE) {
      top = Math.max(TOOLTIP_MIN_EDGE, targetRect.top - EST_HEIGHT - GAP)
    }
    return {
      position: "fixed",
      left: `${left}px`,
      top: `${top}px`,
      width: `${TOOLTIP_WIDTH}px`,
      transition: "left 0.25s ease-out, top 0.25s ease-out",
    }
  }

  const centerX = targetRect.left + targetRect.width / 2
  let left = centerX - TOOLTIP_WIDTH / 2
  left = Math.max(TOOLTIP_MIN_EDGE, Math.min(w - TOOLTIP_WIDTH - TOOLTIP_MIN_EDGE, left))
  const spaceBelow = h - targetRect.bottom - GAP
  const spaceAbove = targetRect.top - GAP
  const preferBelow = spaceBelow >= 200 || spaceBelow >= spaceAbove
  const top = preferBelow ? targetRect.bottom + GAP : targetRect.top - Math.min(EST_HEIGHT + GAP, targetRect.top - TOOLTIP_MIN_EDGE)
  return {
    position: "fixed",
    left: `${left}px`,
    top: `${Math.max(TOOLTIP_MIN_EDGE, top)}px`,
    width: `${TOOLTIP_WIDTH}px`,
    transition: "left 0.25s ease-out, top 0.25s ease-out",
  }
}

export default function WorkspaceTour() {
  const language = useStore((s) => s.language)
  const t = useMemo(() => getTranslation(language), [language])
  const TOUR_STEPS = useMemo(() => buildTourSteps(t), [t])
  const guidedTour = useStore((s) => s.guidedTour)
  const setTourIndicator = useStore((s) => s.setTourIndicator)

  const [active, setActive] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [targetRect, setTargetRect] = useState(null)

  const step = TOUR_STEPS[stepIndex]
  const total = TOUR_STEPS.length

  const completeTour = useCallback(() => {
    // In embedded mode, the host is source of truth.
    if (guidedTour?.labId) {
      sendGuidedTourCompleted({ labId: guidedTour.labId, completed: true })
      setTourIndicator(false)
    } else {
      try {
        localStorage.setItem(TOUR_STORAGE_KEY, "true")
      } catch {}
    }
    setActive(false)
  }, [guidedTour?.labId, setTourIndicator])

  const goNext = useCallback(() => {
    if (stepIndex >= total - 1) {
      completeTour()
      return
    }
    setStepIndex((i) => i + 1)
  }, [stepIndex, completeTour, total])

  const goBack = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1))
  }, [])

  const updateTargetRect = useCallback(() => {
    const s = TOUR_STEPS[stepIndex]
    if (!s || s.target == null) {
      setTargetRect(null)
      return
    }
    const el = document.querySelector(`[data-tour="${s.target}"]`)
    if (el) {
      setTargetRect(el.getBoundingClientRect())
    } else {
      setTargetRect(null)
    }
  }, [stepIndex])

  /** Header tools default collapsed; expand before spotlighting Observations / Help / Info */
  useEffect(() => {
    if (!active) return
    const t = TOUR_STEPS[stepIndex]?.target
    if (!t || !HEADER_TOOLS_TARGETS.has(t)) return

    window.dispatchEvent(
      new CustomEvent("olabs-tour-set-header-actions", { detail: { open: true } })
    )

    const id0 = window.setTimeout(() => updateTargetRect(), 0)
    const id1 = window.setTimeout(() => updateTargetRect(), 80)
    const id2 = window.setTimeout(() => updateTargetRect(), 200)
    return () => {
      window.clearTimeout(id0)
      window.clearTimeout(id1)
      window.clearTimeout(id2)
    }
  }, [active, stepIndex, updateTargetRect])

  useEffect(() => {
    // If host provided guidance, follow it (no localStorage coupling).
    if (guidedTour) {
      if (guidedTour.forceStart || guidedTour.autoStart) {
        const id = setTimeout(() => setActive(true), 300)
        return () => clearTimeout(id)
      }
      return
    }

    // Standalone mode (no host): old localStorage behavior.
    try {
      if (localStorage.getItem(TOUR_STORAGE_KEY) === "true") return
    } catch {}
    const id = setTimeout(() => setActive(true), 600)
    return () => clearTimeout(id)
  }, [guidedTour])

  useEffect(() => {
    const handleRestart = () => {
      try {
        localStorage.removeItem(TOUR_STORAGE_KEY)
        localStorage.removeItem(LEGACY_TOUR_KEY)
      } catch {}
      setStepIndex(0)
      setTargetRect(null)
      setActive(true)
    }
    window.restartWorkspaceTour = handleRestart
    const onCustom = () => handleRestart()
    window.addEventListener("olabs-restart-tour", onCustom)
    return () => {
      delete window.restartWorkspaceTour
      window.removeEventListener("olabs-restart-tour", onCustom)
    }
  }, [])

  useEffect(() => {
    if (!active) return
    updateTargetRect()
    const resize = () => updateTargetRect()
    window.addEventListener("resize", resize)
    window.addEventListener("scroll", updateTargetRect, true)
    return () => {
      window.removeEventListener("resize", resize)
      window.removeEventListener("scroll", updateTargetRect, true)
    }
  }, [active, stepIndex, updateTargetRect])

  const isClient = typeof window !== "undefined"
  const w = isClient ? window.innerWidth : 0
  const h = isClient ? window.innerHeight : 0

  const tooltipStyle = useMemo(
    () => (step ? computeTooltipStyle(step, targetRect, w, h) : {}),
    [step, targetRect, w, h]
  )

  if (!active) return null

  const isLast = stepIndex === total - 1
  const isFirst = stepIndex === 0

  const backdropStyle = (top, left, width, height) => ({
    position: "fixed",
    top,
    left,
    width,
    height,
    background: "rgba(0, 0, 0, 0.55)",
    pointerEvents: "auto",
  })

  return (
    <div className="workspace-tour" role="dialog" aria-modal="true" aria-labelledby="workspace-tour-title">
      {!targetRect && isClient && <div style={backdropStyle(0, 0, w, h)} />}
      {targetRect && isClient && (
        <>
          <div style={backdropStyle(0, 0, w, targetRect.top)} />
          <div style={backdropStyle(targetRect.bottom, 0, w, h - targetRect.bottom)} />
          <div style={backdropStyle(targetRect.top, 0, targetRect.left, targetRect.height)} />
          <div style={backdropStyle(targetRect.top, targetRect.right, w - targetRect.right, targetRect.height)} />
        </>
      )}
      {targetRect && (
        <div
          className="workspace-tour__spotlight"
          style={{
            position: "fixed",
            left: targetRect.left,
            top: targetRect.top,
            width: Math.max(targetRect.width, 4),
            height: Math.max(targetRect.height, 4),
            boxShadow: "0 0 0 2px var(--primary)",
            pointerEvents: "none",
            borderRadius: "8px",
            transition: "left 0.2s ease, top 0.2s ease, width 0.2s ease, height 0.2s ease",
          }}
        />
      )}

      <TourTooltipCard
        step={step}
        stepIndex={stepIndex}
        total={total}
        isLast={isLast}
        isFirst={isFirst}
        style={tooltipStyle}
        onSkip={completeTour}
        onNext={goNext}
        onBack={goBack}
        labels={{
          skip: t.tour_skip,
          back: t.tour_back,
          next: t.tour_next,
          finish: t.tour_finish,
        }}
      />
    </div>
  )
}
