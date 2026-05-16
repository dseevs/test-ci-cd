# Guided Tour — Step-by-step integration

Follow each step in order. Copy the code blocks exactly.

Two paths are provided:

- **Path A** — you HAVE a side workspace (right sidebar with tiles)
- **Path B** — you do NOT have a side workspace (full-width main area only)

---

## Step 1 — Install packages

If you already installed these from the header/sidebar docs, skip this.

```bash
npm install lucide-react @radix-ui/react-slot class-variance-authority clsx tailwind-merge
```

You also need a `Button` component. If you don't have one:

```bash
npx shadcn@latest add button
```

---

## Step 2 — Add `data-tour` attributes to your existing components

The tour spotlights elements by finding `data-tour="..."` in the DOM. You must add these attributes to your components.

### Path A — WITH side workspace

Your components should already have (or you add now):

**In `WorkspaceHeader.jsx`:**
- `<header data-tour="header">` — whole header bar
- `<h1 data-tour="header-title">` — title text only
- Tour restart button: `data-tour="watch-tour-again"`
- Collapse toggle: `data-tour="header-tools-toggle"`
- Observations button: `data-tour="observations"`
- Help button: `data-tour="help"`
- Info button: `data-tour="info"`

**In `WorkspaceLayout.js`:**
- `<section data-tour="main-workspace">` — left panel (main scene)
- `<aside data-tour="side-workspace">` — right panel (sidebar)

### Path B — WITHOUT side workspace

Same header attributes as above. Skip `side-workspace`. For your main area:

- `<section data-tour="main-workspace">` — your full-width scene wrapper

---

## Step 3 — Create `src/components/WorkspaceTour.js`

### Step 3A — WITH side workspace (10 steps, includes sidebar + main workspace)

```jsx
"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"

const TOUR_STORAGE_KEY = "olabs_simulation_tour_v3_completed"
const LEGACY_TOUR_KEY = "olabs_simulation_tour_completed"
const HEADER_TOOLS_TARGETS = new Set(["observations", "help", "info"])

const TOUR_STEPS = [
  {
    target: null,
    title: "Welcome to the Online Labs",
    paragraphs: [
      'This is a tour of the simulation. Use "Next" to move forward or "Skip tour".',
      "This tour can be viewed anytime from the tour icon.",
    ],
  },
  {
    target: "header-title",
    title: "The lab header",
    paragraphs: ["This is the title of the experiment."],
  },
  {
    target: "watch-tour-again",
    title: "Watch tour",
    paragraphs: ["This button (map pin icon) restarts the guided tour from the beginning."],
  },
  {
    target: "header-tools-toggle",
    title: "Quick tools",
    paragraphs: ["Tap this to expand Observations, Help, and Lab instructions. Tap again to hide them."],
  },
  {
    target: "observations",
    title: "Observation Table",
    paragraphs: ["Open this panel to work with your observation table."],
  },
  {
    target: "help",
    title: "Help",
    paragraphs: ["Shows help during the simulation."],
  },
  {
    target: "info",
    title: "Lab instructions",
    paragraphs: ["Step-by-step instructions to perform the lab."],
  },
  {
    target: "side-workspace",
    title: "Sidebar",
    placement: "side",
    paragraphs: ["The sidebar shows activity tiles. Click any tile to start that test."],
  },
  {
    target: "main-workspace",
    title: "Simulator",
    placement: "main",
    paragraphs: ["This is the workbench area where you perform the experiment."],
  },
  {
    target: null,
    title: "You are ready",
    paragraphs: ["You're all set! Start performing the simulation. Good luck!"],
  },
]
```

### Step 3B — WITHOUT side workspace (8 steps, no sidebar step)

Replace the `TOUR_STEPS` array above with this one:

```javascript
const TOUR_STEPS = [
  {
    target: null,
    title: "Welcome to the Online Labs",
    paragraphs: [
      'This is a tour of the simulation. Use "Next" to move forward or "Skip tour".',
      "This tour can be viewed anytime from the tour icon.",
    ],
  },
  {
    target: "header-title",
    title: "The lab header",
    paragraphs: ["This is the title of the experiment."],
  },
  {
    target: "watch-tour-again",
    title: "Watch tour",
    paragraphs: ["This button (map pin icon) restarts the guided tour from the beginning."],
  },
  {
    target: "header-tools-toggle",
    title: "Quick tools",
    paragraphs: ["Tap this to expand Observations, Help, and Lab instructions. Tap again to hide them."],
  },
  {
    target: "observations",
    title: "Observation Table",
    paragraphs: ["Open this panel to work with your observation table."],
  },
  {
    target: "help",
    title: "Help",
    paragraphs: ["Shows help during the simulation."],
  },
  {
    target: "info",
    title: "Lab instructions",
    paragraphs: ["Step-by-step instructions to perform the lab."],
  },
  {
    target: "main-workspace",
    title: "Simulator",
    placement: "main",
    paragraphs: ["This is the workbench area where you perform the experiment."],
  },
  {
    target: null,
    title: "You are ready",
    paragraphs: ["You're all set! Start performing the simulation. Good luck!"],
  },
]
```

### Now paste the rest of the file (same for both paths)

Paste this **below** the `TOUR_STEPS` array (still inside the same file):

```jsx
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
    <div className="workspace-tour__tooltip-body">
      {paragraphs.map((p, i) => (
        <p key={i} className="workspace-tour__tooltip-body-para">{p}</p>
      ))}
      {bullets && bullets.length > 0 ? (
        <ul>{bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>
      ) : null}
    </div>
  )
}

function TourTooltipCard({ step, stepIndex, total, isLast, isFirst, style, onSkip, onNext, onBack }) {
  return (
    <div className="workspace-tour__tooltip workspace-tour__tooltip--moving" style={style}>
      <h2 id="workspace-tour-title" className="workspace-tour__tooltip-title">{step.title}</h2>
      <TourStepBody paragraphs={step.paragraphs} bullets={step.bullets} />
      <div className="workspace-tour__tooltip-footer"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
        <Button type="button" variant="ghost" size="sm" onClick={onSkip}>Skip tour</Button>
        <span className="workspace-tour__step-indicator">{stepIndex + 1}/{total}</span>
        <div className="workspace-tour__tooltip-actions">
          {!isFirst ? <Button type="button" variant="outline" size="sm" onClick={onBack}>Back</Button> : null}
          <Button type="button" size="sm" onClick={onNext}>{isLast ? "Finish" : "Next"}</Button>
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
      position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)",
      width: `min(${TOOLTIP_WIDTH}px, calc(100vw - 2rem))`,
      transition: "left 0.25s ease-out, top 0.25s ease-out, transform 0.25s ease-out",
    }
  }

  if (placement === "main") {
    const minSideSpace = TOOLTIP_WIDTH + GAP + TOOLTIP_MIN_EDGE
    const roomOnRight = w - targetRect.right - GAP >= minSideSpace
    const roomOnLeft = targetRect.left - GAP >= minSideSpace
    const workspaceNearlyFullBleed = targetRect.width >= w - TOOLTIP_MIN_EDGE * 3 || (!roomOnRight && !roomOnLeft)
    if (workspaceNearlyFullBleed) {
      return {
        position: "fixed", left: "50%", bottom: "max(24px, env(safe-area-inset-bottom, 0px))",
        transform: "translateX(-50%)", width: `min(${TOOLTIP_WIDTH}px, calc(100vw - 2rem))`,
        maxWidth: "calc(100vw - 2rem)",
        transition: "left 0.25s ease-out, bottom 0.25s ease-out, transform 0.25s ease-out",
      }
    }
    let left = targetRect.right + GAP
    if (left + TOOLTIP_WIDTH > w - TOOLTIP_MIN_EDGE) left = targetRect.left - GAP - TOOLTIP_WIDTH
    let top = targetRect.top + targetRect.height / 2 - EST_HEIGHT / 2
    top = Math.max(TOOLTIP_MIN_EDGE, Math.min(h - EST_HEIGHT - TOOLTIP_MIN_EDGE, top))
    return { position: "fixed", left: `${left}px`, top: `${top}px`, width: `${TOOLTIP_WIDTH}px`, transition: "left 0.25s ease-out, top 0.25s ease-out" }
  }

  if (placement === "side") {
    let left = targetRect.left - GAP - TOOLTIP_WIDTH
    if (left < TOOLTIP_MIN_EDGE) left = targetRect.right + GAP
    let top = targetRect.top + targetRect.height / 2 - EST_HEIGHT / 2
    top = Math.max(TOOLTIP_MIN_EDGE, Math.min(h - EST_HEIGHT - TOOLTIP_MIN_EDGE, top))
    return { position: "fixed", left: `${left}px`, top: `${top}px`, width: `${TOOLTIP_WIDTH}px`, transition: "left 0.25s ease-out, top 0.25s ease-out" }
  }

  if (placement === "corner") {
    let left = targetRect.right + GAP
    if (left + TOOLTIP_WIDTH > w - TOOLTIP_MIN_EDGE) left = Math.max(TOOLTIP_MIN_EDGE, targetRect.left - GAP - TOOLTIP_WIDTH)
    let top = targetRect.bottom + GAP
    if (top + EST_HEIGHT > h - TOOLTIP_MIN_EDGE) top = Math.max(TOOLTIP_MIN_EDGE, targetRect.top - EST_HEIGHT - GAP)
    return { position: "fixed", left: `${left}px`, top: `${top}px`, width: `${TOOLTIP_WIDTH}px`, transition: "left 0.25s ease-out, top 0.25s ease-out" }
  }

  const centerX = targetRect.left + targetRect.width / 2
  let left = centerX - TOOLTIP_WIDTH / 2
  left = Math.max(TOOLTIP_MIN_EDGE, Math.min(w - TOOLTIP_WIDTH - TOOLTIP_MIN_EDGE, left))
  const spaceBelow = h - targetRect.bottom - GAP
  const spaceAbove = targetRect.top - GAP
  const preferBelow = spaceBelow >= 200 || spaceBelow >= spaceAbove
  const top = preferBelow ? targetRect.bottom + GAP : targetRect.top - Math.min(EST_HEIGHT + GAP, targetRect.top - TOOLTIP_MIN_EDGE)
  return { position: "fixed", left: `${left}px`, top: `${Math.max(TOOLTIP_MIN_EDGE, top)}px`, width: `${TOOLTIP_WIDTH}px`, transition: "left 0.25s ease-out, top 0.25s ease-out" }
}

export default function WorkspaceTour() {
  const [active, setActive] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [targetRect, setTargetRect] = useState(null)

  const step = TOUR_STEPS[stepIndex]
  const total = TOUR_STEPS.length

  const completeTour = useCallback(() => {
    try { localStorage.setItem(TOUR_STORAGE_KEY, "true") } catch {}
    setActive(false)
  }, [])

  const goNext = useCallback(() => {
    if (stepIndex >= total - 1) { completeTour(); return }
    setStepIndex((i) => i + 1)
  }, [stepIndex, completeTour, total])

  const goBack = useCallback(() => { setStepIndex((i) => Math.max(0, i - 1)) }, [])

  const updateTargetRect = useCallback(() => {
    const s = TOUR_STEPS[stepIndex]
    if (!s || s.target == null) { setTargetRect(null); return }
    const el = document.querySelector(`[data-tour="${s.target}"]`)
    if (el) setTargetRect(el.getBoundingClientRect())
    else setTargetRect(null)
  }, [stepIndex])

  useEffect(() => {
    if (!active) return
    const t = TOUR_STEPS[stepIndex]?.target
    if (!t || !HEADER_TOOLS_TARGETS.has(t)) return
    window.dispatchEvent(new CustomEvent("olabs-tour-set-header-actions", { detail: { open: true } }))
    const id0 = window.setTimeout(() => updateTargetRect(), 0)
    const id1 = window.setTimeout(() => updateTargetRect(), 80)
    const id2 = window.setTimeout(() => updateTargetRect(), 200)
    return () => { window.clearTimeout(id0); window.clearTimeout(id1); window.clearTimeout(id2) }
  }, [active, stepIndex, updateTargetRect])

  useEffect(() => {
    try { if (localStorage.getItem(TOUR_STORAGE_KEY) === "true") return } catch {}
    const t = setTimeout(() => setActive(true), 600)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const handleRestart = () => {
      try { localStorage.removeItem(TOUR_STORAGE_KEY); localStorage.removeItem(LEGACY_TOUR_KEY) } catch {}
      setStepIndex(0); setTargetRect(null); setActive(true)
    }
    window.restartWorkspaceTour = handleRestart
    const onCustom = () => handleRestart()
    window.addEventListener("olabs-restart-tour", onCustom)
    return () => { delete window.restartWorkspaceTour; window.removeEventListener("olabs-restart-tour", onCustom) }
  }, [])

  useEffect(() => {
    if (!active) return
    updateTargetRect()
    const resize = () => updateTargetRect()
    window.addEventListener("resize", resize)
    window.addEventListener("scroll", updateTargetRect, true)
    return () => { window.removeEventListener("resize", resize); window.removeEventListener("scroll", updateTargetRect, true) }
  }, [active, stepIndex, updateTargetRect])

  const isClient = typeof window !== "undefined"
  const w = isClient ? window.innerWidth : 0
  const h = isClient ? window.innerHeight : 0

  const tooltipStyle = useMemo(() => (step ? computeTooltipStyle(step, targetRect, w, h) : {}), [step, targetRect, w, h])

  if (!active) return null

  const isLast = stepIndex === total - 1
  const isFirst = stepIndex === 0

  const backdropStyle = (top, left, width, height) => ({
    position: "fixed", top, left, width, height, background: "rgba(0, 0, 0, 0.55)", pointerEvents: "auto",
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
        <div className="workspace-tour__spotlight" style={{
          position: "fixed", left: targetRect.left, top: targetRect.top,
          width: Math.max(targetRect.width, 4), height: Math.max(targetRect.height, 4),
          boxShadow: "0 0 0 2px var(--primary)", pointerEvents: "none", borderRadius: "8px",
          transition: "left 0.2s ease, top 0.2s ease, width 0.2s ease, height 0.2s ease",
        }} />
      )}
      <TourTooltipCard step={step} stepIndex={stepIndex} total={total} isLast={isLast} isFirst={isFirst}
        style={tooltipStyle} onSkip={completeTour} onNext={goNext} onBack={goBack} />
    </div>
  )
}
```

---

## Step 4 — Create `src/app/workspace-tour.css`

```css
@reference "./globals.css";

.workspace-tour {
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
}

.workspace-tour__spotlight {
  z-index: 1;
}

.workspace-tour__tooltip {
  z-index: 3;
  pointer-events: auto;
  max-width: min(440px, calc(100vw - 2rem));
  padding: 1rem 1.25rem;
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.workspace-tour__tooltip-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
}

.workspace-tour__tooltip-body {
  font-size: 0.875rem;
  color: var(--muted-foreground);
  line-height: 1.55;
  margin: 0 0 1rem 0;
  max-height: min(42vh, 16rem);
  overflow-y: auto;
  padding-right: 0.25rem;
}

.workspace-tour__tooltip-body-para {
  margin: 0 0 0.65rem 0;
}
.workspace-tour__tooltip-body-para:last-child {
  margin-bottom: 0;
}

.workspace-tour__tooltip-body ul {
  margin: 0.35rem 0 0.65rem 1rem;
  padding: 0;
  list-style: disc;
}
.workspace-tour__tooltip-body li {
  margin-bottom: 0.35rem;
}

.workspace-tour__tooltip-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.workspace-tour__step-indicator {
  font-size: 0.75rem;
  color: var(--muted-foreground);
}

.workspace-tour__tooltip-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
```

If you use **Tailwind v3**, delete the first line `@reference "./globals.css";`.

---

## Step 5 — Mount the tour in your page

### Path A — WITH side workspace

Your page should already look like this (from the header + sidebar docs). Add `WorkspaceTour` and the CSS import:

```jsx
"use client"

import "../workspace-header.css"
import "../workspace-sidebar.css"
import "../workspace-tour.css"
import WorkspaceHeader from "@/components/WorkspaceHeader"
import WorkspaceLayout from "@/components/WorkspaceLayout"
import WorkspaceTour from "@/components/WorkspaceTour"

export default function SimulationPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh" }}>
      <WorkspaceHeader />
      <WorkspaceLayout />
      <WorkspaceTour />
    </div>
  )
}
```

### Path B — WITHOUT side workspace

Same thing, just no sidebar layout:

```jsx
"use client"

import "../workspace-header.css"
import "../workspace-tour.css"
import WorkspaceHeader from "@/components/WorkspaceHeader"
import WorkspaceTour from "@/components/WorkspaceTour"

export default function SimulationPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh" }}>
      <WorkspaceHeader />
      <main style={{ flex: 1 }} data-tour="main-workspace">
        {/* your full-width scene here */}
      </main>
      <WorkspaceTour />
    </div>
  )
}
```

---

## Step 6 — Connect the header's "Watch tour again" button

If you followed the header doc, your `WorkspaceHeader.jsx` already imports `resetTourForTesting` and the MapPinned button calls it on click.

If you created the bridge file `src/components/tour/resetTour.js`, **replace that file** with an import from the real tour:

In `WorkspaceHeader.jsx`, change:

```javascript
import { resetTourForTesting } from "@/components/tour/resetTour"
```

to:

```javascript
import { resetTourForTesting } from "@/components/WorkspaceTour"
```

Now the header button directly calls the tour's exported reset function.

---

## How to customise

**To change step text:** edit the `TOUR_STEPS` array — change `title`, `paragraphs`, or `bullets` for any step.

**To add a new step:** add an object to `TOUR_STEPS` with a `target` matching a `data-tour="..."` attribute on any element in your page.

**To remove the sidebar step (Path A → Path B):** delete the object with `target: "side-workspace"` from `TOUR_STEPS`.

**To add a sidebar step (Path B → Path A):** add this object before the "main-workspace" step:

```javascript
{
  target: "side-workspace",
  title: "Sidebar",
  placement: "side",
  paragraphs: ["The sidebar shows activity tiles. Click any tile to start that test."],
},
```

And add `data-tour="side-workspace"` to your sidebar `<aside>`.

**To change tooltip placement:** set `placement` to `"default"`, `"main"`, `"side"`, or `"corner"`.

**To change when the tour auto-shows:** edit the `localStorage` key check in the `useEffect` that calls `setActive(true)`.

---

## How the tour works (what it does under the hood)

1. On first visit, tour auto-shows after 600ms (checks `localStorage` key).
2. Each step has a `target` (a `data-tour` value) or `null` (full-screen backdrop).
3. Tour finds the element with `document.querySelector('[data-tour="..."]')` and gets its `getBoundingClientRect()`.
4. Four backdrop divs surround the target (top, bottom, left, right) creating a spotlight effect.
5. A primary-color border ring highlights the target element.
6. The tooltip card positions itself near the target using `computeTooltipStyle()`.
7. For steps targeting collapsed header tools (`observations`, `help`, `info`), the tour dispatches `olabs-tour-set-header-actions` to auto-expand the header strip first.
8. On finish or skip, `localStorage` saves completion so the tour doesn't show again.
9. The header's "Watch tour again" button calls `resetTourForTesting()` which clears `localStorage` and dispatches `olabs-restart-tour` to restart.

---

## Done

You should now see:

- Tour auto-shows on first visit (dark backdrop + spotlight + tooltip card)
- Next / Back / Skip buttons navigate steps
- Steps highlight: title, tour button, tools toggle, observations, help, info, sidebar (if present), main workspace
- "Watch tour again" from the header restarts the tour
- Tour remembers completion in `localStorage`
