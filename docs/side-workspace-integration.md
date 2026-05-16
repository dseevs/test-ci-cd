# Side Workspace — Generic integration (any lab)

Follow each step in order. Replace the example activity names and images with your own.

---

## Step 1 — Install packages

```bash
npm install zustand @radix-ui/react-slot class-variance-authority clsx tailwind-merge
```

You also need a `Button` component. If you don't have one:

```bash
npx shadcn@latest add button
```

---

## Step 2 — Add your activity images to `public/`

Put one image per activity in your project `public/` folder. Example:

```
public/activity1.png
public/activity2.png
public/activity3.png
```

Names are **case-sensitive** on Linux. You will reference these paths in Step 4.

---

## Step 3 — Create `src/store/useStore.js`

Change the keys and labels to match **your** activities. Add or remove entries as needed.

```javascript
'use client'

import { create } from 'zustand'

/**
 * Replace these with YOUR activity keys.
 * Add as many or as few as your lab needs.
 */
export const ACTIVITY_TYPES = {
  ACTIVITY_1: 'activity_1',
  ACTIVITY_2: 'activity_2',
  ACTIVITY_3: 'activity_3',
}

export const useStore = create((set, get) => ({
  activitySelected: ACTIVITY_TYPES.ACTIVITY_1,
  visitedActivities: [ACTIVITY_TYPES.ACTIVITY_1],
  labPhase: 'idle', // 'idle' | 'running' | 'complete'

  setActivitySelected: (value) => {
    const prev = get().visitedActivities
    const visited = prev.includes(value) ? prev : [...prev, value]
    set({
      activitySelected: value,
      visitedActivities: visited,
      labPhase: 'idle',
    })
  },

  setLabPhase: (value) => set({ labPhase: value }),

  resetLab: () => {
    set({
      activitySelected: ACTIVITY_TYPES.ACTIVITY_1,
      visitedActivities: [ACTIVITY_TYPES.ACTIVITY_1],
      labPhase: 'idle',
    })
  },
}))

const ALL_KEYS = Object.values(ACTIVITY_TYPES)
export const useAllActivitiesVisited = () =>
  useStore((s) => ALL_KEYS.every((k) => s.visitedActivities.includes(k)))
```

---

## Step 4 — Create `src/components/SideWorkspace.js`

Change the `tiles` array to match **your** activities, labels, and image paths.

```jsx
"use client"

import React from "react"
import { useStore, ACTIVITY_TYPES } from "@/store/useStore"
import { Button } from "@/components/ui/button"

export default function SideWorkspace() {
  const {
    activitySelected,
    labPhase,
    setActivitySelected,
  } = useStore()

  const isRunning = labPhase === "running"

  /**
   * EDIT THIS: one entry per activity in your lab.
   * key   — must match a value from ACTIVITY_TYPES
   * label — text shown below the image
   * image — path relative to public/
   */
  const tiles = [
    { key: ACTIVITY_TYPES.ACTIVITY_1, label: "Activity 1", image: "/activity1.png" },
    { key: ACTIVITY_TYPES.ACTIVITY_2, label: "Activity 2", image: "/activity2.png" },
    { key: ACTIVITY_TYPES.ACTIVITY_3, label: "Activity 3", image: "/activity3.png" },
  ]

  const selectedName = tiles.find((t) => t.key === activitySelected)?.label ?? "None"

  return (
    <div className="side-workspace">
      <div className="side-workspace__section">
        <h2 className="side-workspace__heading">Select Activity</h2>
        <div className="side-workspace__experiment-grid">
          {tiles.map(({ key, label, image }) => (
            <Button
              key={key}
              variant="ghost"
              size="sm"
              onClick={() => setActivitySelected(key)}
              className={`side-workspace__experiment-btn ${
                activitySelected === key ? "side-workspace__experiment-btn--selected" : ""
              }`}
              disabled={isRunning}
            >
              <span className="side-workspace__experiment-tile-image-wrap">
                <img
                  src={image}
                  alt={label}
                  className="side-workspace__experiment-tile-image"
                />
              </span>
              <span className="side-workspace__experiment-tile-label">{label}</span>
            </Button>
          ))}
        </div>
        <p className="side-workspace__experiment-name">{selectedName}</p>
      </div>
    </div>
  )
}
```

---

## Step 5 — Create `src/components/WorkspaceLayout.js`

This splits the page into left (your scene) and right (sidebar + Restart).

Replace `<MainWorkspace />` with whatever component renders your lab scene.

```jsx
"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useStore, useAllActivitiesVisited } from "@/store/useStore"
import SideWorkspace from "@/components/SideWorkspace"

export default function WorkspaceLayout() {
  const router = useRouter()
  const resetLab = useStore((s) => s.resetLab)
  const allVisited = useAllActivitiesVisited()

  const handleRestart = () => {
    resetLab()
    router.push("/")
  }

  return (
    <main className="workspace-main">
      {/* LEFT — your lab scene goes here */}
      <section className="workspace-canvas-wrap">
        <div className="workspace-canvas-inner">
          {/* Replace this div with your scene component */}
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)" }}>
            Your scene here
          </div>
        </div>
      </section>

      {/* RIGHT — sidebar with tiles + Restart */}
      <aside className="workspace-sidebar">
        <div className="workspace-sidebar__content">
          <SideWorkspace />
        </div>
        <div className="workspace-sidebar__actions">
          <Button
            onClick={handleRestart}
            disabled={!allVisited}
            title={allVisited ? "Restart the lab" : "Visit all activities to enable Restart"}
            className="!rounded-md transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:shadow-md"
          >
            Restart
          </Button>
        </div>
      </aside>
    </main>
  )
}
```

---

## Step 6 — Create `src/app/workspace-sidebar.css`

```css
@reference "./globals.css";

/* Layout: left scene + right sidebar */
.workspace-main {
  @apply flex-1 flex flex-row overflow-hidden min-h-0 w-full min-w-0;
}
.workspace-canvas-wrap {
  @apply flex-[7] min-w-0 border-r border-border p-4 flex flex-col;
}
.workspace-canvas-inner {
  @apply flex-1 w-full max-w-full border border-border rounded-md flex flex-col min-h-0 min-w-0 overflow-hidden;
  padding: clamp(0.5rem, 1.2vw, 1rem);
}

/* Right sidebar shell */
.workspace-sidebar {
  @apply flex-[3] min-w-0 flex flex-col border-t lg:border-t-0 lg:border-l border-border;
  min-width: min(100%, 16rem);
}
.workspace-sidebar__content {
  @apply flex-[8] overflow-auto min-h-0;
  padding: clamp(0.75rem, 3vw, 1rem);
}
.workspace-sidebar__actions {
  @apply flex-[2] flex items-center justify-evenly gap-2 border-t border-border shrink-0;
  padding: clamp(0.5rem, 2vw, 0.75rem);
}
.workspace-sidebar__actions button {
  min-height: 2.5rem;
  padding-inline: clamp(0.75rem, 3vw, 1rem);
  font-size: clamp(0.8125rem, 2vw, 0.875rem);
}

/* Side workspace tiles */
.side-workspace {
  @apply flex flex-col gap-4 overflow-auto;
}
.side-workspace__section {
  @apply border border-border rounded-lg;
  padding: clamp(0.75rem, 2.5vw, 1rem);
}
.side-workspace__heading {
  font-size: clamp(0.8125rem, 2vw, 0.875rem);
  @apply font-semibold mb-2;
}

/* Tile grid: 1 col narrow, 2 cols wider */
.side-workspace__experiment-grid {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: clamp(0.5rem, 1.8vw, 0.85rem);
}
@media (min-width: 360px) {
  .side-workspace__experiment-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (min-width: 1024px) {
  .side-workspace__experiment-grid {
    gap: clamp(0.75rem, 1.4vw, 1rem);
  }
}

/* Tile button */
.side-workspace__experiment-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: clamp(6rem, 16vw, 8.5rem);
  width: 100%;
  padding: 0;
  font-size: clamp(0.6875rem, 1.8vw, 0.8125rem);
  line-height: 1.2;
  white-space: normal;
  word-break: break-word;
  text-align: center;
  border-radius: 0;
  overflow: hidden;
  position: relative;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  outline: none !important;
  transition: none !important;
}
.side-workspace__experiment-btn:hover,
.side-workspace__experiment-btn:focus,
.side-workspace__experiment-btn:focus-visible,
.side-workspace__experiment-btn:active,
.side-workspace__experiment-btn[data-state="open"] {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  outline: none !important;
}
.side-workspace__experiment-btn--selected {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  outline: none !important;
}
@media (min-width: 480px) {
  .side-workspace__experiment-btn {
    height: clamp(7rem, 18vw, 9.5rem);
  }
}

/* Tile image */
.side-workspace__experiment-tile-image-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: clamp(5rem, 14vw, 7.5rem);
  overflow: hidden;
  flex-shrink: 0;
}
.side-workspace__experiment-tile-image {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  display: block;
  opacity: 1;
  transition: opacity 0.2s ease;
}

/* HOVER: image dims */
.side-workspace__experiment-btn:hover .side-workspace__experiment-tile-image {
  opacity: 0.5;
}
/* SELECTED: image stays dimmed */
.side-workspace__experiment-btn--selected .side-workspace__experiment-tile-image {
  opacity: 0.5;
}

/* Tile label */
.side-workspace__experiment-tile-label {
  display: block;
  font-size: clamp(0.625rem, 1.6vw, 0.75rem);
  line-height: 1.2;
  text-align: center;
  word-break: break-word;
  padding: 0.25rem 0.375rem;
  position: relative;
  z-index: 2;
}

/* Selected name below tiles */
.side-workspace__experiment-name {
  font-size: clamp(0.6875rem, 1.8vw, 0.75rem);
  @apply text-muted-foreground mt-1.5;
}

/* Action button (if needed for a specific activity) */
.side-workspace__action-wrap {
  @apply shrink-0;
}
.side-workspace__action-btn {
  @apply w-full;
  min-height: 2.75rem;
  padding: 0.5rem 0.75rem;
  font-size: clamp(0.8125rem, 2vw, 0.875rem);
  line-height: 1.3;
  white-space: normal;
  word-break: break-word;
}
```

If you use **Tailwind v3**, delete the first line `@reference "./globals.css";`.

---

## Step 7 — Import CSS and use in your page

```jsx
"use client"

import "../workspace-sidebar.css"
import WorkspaceLayout from "@/components/WorkspaceLayout"

export default function SimulationPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh" }}>
      {/* Add your header here if you have one */}
      <WorkspaceLayout />
    </div>
  )
}
```

---

## How to customise for your lab

**To change activities:** edit two places only:

1. `ACTIVITY_TYPES` in `src/store/useStore.js` — add/remove keys
2. `tiles` array in `src/components/SideWorkspace.js` — add/remove entries with matching key, label, image

**To change Restart behaviour:** edit `resetLab()` in the store — add any extra state fields your lab needs to reset.

**To change when Restart enables:** edit `useAllActivitiesVisited()` in the store — it checks that every key in `ACTIVITY_TYPES` has been visited at least once.

---

## Done

You should now see:

- Left panel: your scene placeholder
- Right panel: activity tiles with images
- Hover a tile → image dims
- Click a tile → stays dimmed, name shows below
- Click every tile at least once → Restart enables
- Click Restart → state resets, navigates to `/`
