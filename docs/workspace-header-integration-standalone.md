# Workspace Header + Observation Table — Step-by-step integration

Follow each step in order. Copy the code blocks exactly.

---

## Step 1 — Install packages

```bash
npm install lucide-react @radix-ui/react-dialog @radix-ui/react-tooltip @radix-ui/react-slot class-variance-authority clsx tailwind-merge jspdf jspdf-autotable
```

---

## Step 2 — Add path alias

In `jsconfig.json` (or `tsconfig.json`):

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

## Step 3 — Create `src/lib/utils.js`

```javascript
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
```

---

## Step 4 — Create `src/components/ui/button.jsx`

```bash
npx shadcn@latest add button
```

---

## Step 5 — Create `src/components/ui/tooltip.jsx`

```jsx
"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import { cn } from "@/lib/utils"

const TooltipProvider = TooltipPrimitive.Provider
const Tooltip = TooltipPrimitive.Root
const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef(
  ({ className, sideOffset = 6, children, ...props }, ref) => (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          "z-[100] max-w-[min(100vw-2rem,20rem)] rounded-md border border-border bg-popover px-3 py-2.5 text-popover-foreground shadow-md outline-none",
          "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className
        )}
        {...props}
      >
        {children}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
)
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
```

---

## Step 6 — Create `src/components/ui/dialog.jsx`

This version includes `DialogContentModeless` (needed by the observation table — no overlay/backdrop, so user can interact with the lab behind it).

```jsx
"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/10 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogContentModeless = React.forwardRef(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContentModeless.displayName = "DialogContentModeless"

const DialogHeader = ({ className, ...props }) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({ className, ...props }) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogContentModeless,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
```

---

## Step 7 — Create `src/components/TouchAwareTooltip.jsx`

```jsx
"use client"

import {
  Children, cloneElement, isValidElement,
  useCallback, useEffect, useRef, useState,
} from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const LONG_PRESS_MS = 550

export function useTouchPrimaryInput() {
  const [touchPrimary, setTouchPrimary] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(hover: none), (pointer: coarse)")
    const update = () => setTouchPrimary(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])
  return touchPrimary
}

function chainHandlers(a, b) {
  return (e) => { a?.(e); b?.(e) }
}

export function TouchAwareTooltip({
  children, tooltip, side = "bottom", align = "center", contentClassName, showTouchFooter = true,
}) {
  const touchPrimary = useTouchPrimaryInput()
  const [open, setOpen] = useState(false)
  const longTimerRef = useRef(null)
  const suppressNextClickRef = useRef(false)

  const clearTimer = useCallback(() => {
    if (longTimerRef.current != null) { clearTimeout(longTimerRef.current); longTimerRef.current = null }
  }, [])

  const onPointerDownTouch = useCallback((e) => {
    if (!touchPrimary || e.pointerType !== "touch") return
    clearTimer()
    longTimerRef.current = window.setTimeout(() => {
      longTimerRef.current = null; setOpen(true); suppressNextClickRef.current = true
      try { navigator.vibrate?.(12) } catch {}
    }, LONG_PRESS_MS)
  }, [touchPrimary, clearTimer])

  const onPointerEndTouch = useCallback((e) => {
    if (!touchPrimary || e.pointerType !== "touch") return; clearTimer()
  }, [touchPrimary, clearTimer])

  const content = (
    <>
      {tooltip}
      {touchPrimary && showTouchFooter ? (
        <p className="mt-2 border-t border-border pt-2 text-[0.65rem] leading-snug text-muted-foreground">
          Touch: hold icon to see this. Tap quickly to use the control.
        </p>
      ) : null}
    </>
  )

  if (!touchPrimary) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side={side} align={align} className={contentClassName}>{content}</TooltipContent>
      </Tooltip>
    )
  }

  let only
  try { only = Children.only(children) } catch { return children }
  if (!isValidElement(only)) {
    return (
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side={side} align={align} className={cn("max-w-xs", contentClassName)}>{content}</TooltipContent>
      </Tooltip>
    )
  }

  const mergedChild = cloneElement(only, {
    onPointerDown: chainHandlers(only.props.onPointerDown, onPointerDownTouch),
    onPointerUp: chainHandlers(only.props.onPointerUp, onPointerEndTouch),
    onPointerCancel: chainHandlers(only.props.onPointerCancel, onPointerEndTouch),
    onClick: (e) => {
      if (suppressNextClickRef.current) { suppressNextClickRef.current = false; e.preventDefault(); e.stopPropagation(); return }
      only.props.onClick?.(e)
    },
  })

  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>{mergedChild}</TooltipTrigger>
      <TooltipContent side={side} align={align} className={cn("max-w-xs", contentClassName)}>{content}</TooltipContent>
    </Tooltip>
  )
}
```

---

## Step 8 — Create `src/components/tour/resetTour.js`

```javascript
export function resetTourForTesting() {
  try {
    localStorage.removeItem("olabs_simulation_tour_v3_completed")
    localStorage.removeItem("olabs_simulation_tour_completed")
  } catch {}
  if (typeof window !== "undefined" && window.dispatchEvent) {
    window.dispatchEvent(new CustomEvent("olabs-restart-tour"))
  }
}
```

---

## Step 9 — Create `src/components/ObservationTableDialog.js`

This is the **full** observation table: editable rows, auto-computed column, V-vs-I graph on canvas, PDF download (table + graph), draggable + resizable dialog.

**To adapt for your lab:** change `INITIAL_TABLE` columns, the `updateCell` auto-compute logic, chart drawing function, and PDF title/labels.

```jsx
"use client"

import { useState, useRef, useCallback, useEffect, useLayoutEffect, useMemo } from "react"
import {
  ChevronDown, ChevronRight, Plus, Download, GripHorizontal, LineChart,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContentModeless, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { jsPDF } from "jspdf"
import { autoTable } from "jspdf-autotable"

/* ── EDIT THESE for your lab ── */
const INITIAL_TABLE = [
  ["S.No.", "Column A", "Column B", "Result"],
  ["1", "", "", ""],
]
const PDF_TITLE = "Observation Table"
const PDF_FILENAME = "observations.pdf"

/* ── Auto-compute: override this for your formula ── */
function computeResult(colA, colB) {
  const a = parseFloat(String(colA ?? "").trim().replace(",", "."))
  const b = parseFloat(String(colB ?? "").trim().replace(",", "."))
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return ""
  const r = a / b
  if (!Number.isFinite(r)) return ""
  return String(Math.round(r * 10000) / 10000)
}

const MIN_WIDTH = 360
const MIN_HEIGHT = 300
const DEFAULT_WIDTH = 700
const DEFAULT_HEIGHT = 560
const CHART_MIN_W = 440
const CHART_MIN_H = 340

function getPlottablePoints(tableData) {
  const pts = []
  for (let ri = 1; ri < tableData.length; ri++) {
    const row = tableData[ri]
    if (!row) continue
    const x = parseFloat(String(row[1] ?? "").trim().replace(",", "."))
    const y = parseFloat(String(row[2] ?? "").trim().replace(",", "."))
    if (Number.isFinite(x) && Number.isFinite(y)) pts.push({ x, y })
  }
  pts.sort((p, q) => p.x - q.x || p.y - q.y)
  return pts
}

function niceStep(rawStep) {
  if (!Number.isFinite(rawStep) || rawStep <= 0) return 1
  const exp = Math.floor(Math.log10(rawStep))
  const base = Math.pow(10, exp)
  const fraction = rawStep / base
  let niceFraction = 1
  if (fraction <= 1) niceFraction = 1
  else if (fraction <= 2) niceFraction = 2
  else if (fraction <= 5) niceFraction = 5
  else niceFraction = 10
  return niceFraction * base
}

function buildTicks(min, max, targetCount = 6) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return []
  const span = Math.max(1e-9, max - min)
  const step = niceStep(span / Math.max(2, targetCount - 1))
  const first = Math.ceil(min / step) * step
  const ticks = []
  for (let v = first; v <= max + step * 0.5; v += step) {
    ticks.push(Math.abs(v) < 1e-12 ? 0 : v)
  }
  if (!ticks.length) ticks.push(min, max)
  return ticks
}

function formatTick(value, step) {
  if (!Number.isFinite(value)) return ""
  if (!Number.isFinite(step) || step <= 0) return String(value)
  const decimals = Math.max(0, Math.min(6, -Math.floor(Math.log10(step))))
  return value.toFixed(decimals).replace(/\.?0+$/, "")
}

function pointName(index) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  return alphabet[index % 26] + (index >= 26 ? String(Math.floor(index / 26) + 1) : "")
}

/* ── EDIT THIS to change chart axis labels / drawing ── */
function drawChart(ctx, points, width, height) {
  const pad = { l: 52, r: 20, t: 24, b: 44 }
  const plotW = width - pad.l - pad.r
  const plotH = height - pad.t - pad.b

  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = "hsla(0, 0%, 96%, 0.9)"
  ctx.fillRect(0, 0, width, height)

  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  let xmin = Math.min(0, ...xs), xmax = Math.max(...xs, 0)
  let ymin = Math.min(0, ...ys), ymax = Math.max(...ys, 0)
  const xSpan = xmax - xmin || 1, ySpan = ymax - ymin || 1
  xmin -= xSpan * 0.08; xmax += xSpan * 0.12
  ymin -= ySpan * 0.08; ymax += ySpan * 0.12

  const sx = (v) => pad.l + ((v - xmin) / (xmax - xmin)) * plotW
  const sy = (i) => pad.t + plotH - ((i - ymin) / (ymax - ymin)) * plotH

  const xTicks = buildTicks(xmin, xmax, 7)
  const yTicks = buildTicks(ymin, ymax, 6)
  const xStep = xTicks.length >= 2 ? Math.abs(xTicks[1] - xTicks[0]) : 1
  const yStep = yTicks.length >= 2 ? Math.abs(yTicks[1] - yTicks[0]) : 1

  ctx.strokeStyle = "rgba(0,0,0,0.12)"; ctx.lineWidth = 1
  yTicks.forEach((yv) => { ctx.beginPath(); ctx.moveTo(pad.l, sy(yv)); ctx.lineTo(pad.l + plotW, sy(yv)); ctx.stroke() })
  xTicks.forEach((xv) => { ctx.beginPath(); ctx.moveTo(sx(xv), pad.t); ctx.lineTo(sx(xv), pad.t + plotH); ctx.stroke() })

  ctx.strokeStyle = "#1e293b"; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(pad.l, sy(0)); ctx.lineTo(pad.l + plotW, sy(0))
  ctx.moveTo(sx(0), pad.t); ctx.lineTo(sx(0), pad.t + plotH); ctx.stroke()

  ctx.strokeStyle = "#2563eb"; ctx.lineWidth = 2; ctx.beginPath()
  points.forEach((p, idx) => { const x = sx(p.x), y = sy(p.y); idx === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y) })
  ctx.stroke()

  const pr = Math.min(1.25, Math.max(1, width / 520))
  ctx.fillStyle = "#1d4ed8"
  points.forEach((p) => { ctx.beginPath(); ctx.arc(sx(p.x), sy(p.y), 5 * pr, 0, Math.PI * 2); ctx.fill() })

  ctx.font = `${Math.round(10 * pr)}px system-ui, sans-serif`
  points.forEach((p, idx) => {
    const x = sx(p.x), y = sy(p.y), name = pointName(idx)
    const coordText = `${name}(${p.x}, ${p.y})`
    const tw = ctx.measureText(coordText).width
    const tx = Math.min(pad.l + plotW - tw - 4, x + 8), ty = Math.max(pad.t + 12, y - 8)
    ctx.fillStyle = "rgba(255,255,255,0.95)"; ctx.fillRect(tx - 2, ty - 9, tw + 4, 12)
    ctx.fillStyle = "#0f172a"; ctx.fillText(coordText, tx, ty)
  })

  ctx.fillStyle = "#334155"; ctx.textAlign = "center"
  ctx.font = `${Math.round(11 * pr)}px system-ui, sans-serif`
  ctx.fillText("Column A", pad.l + plotW / 2, height - 10)
  ctx.font = `${Math.round(10 * pr)}px system-ui, sans-serif`
  xTicks.forEach((xv) => ctx.fillText(formatTick(xv, xStep), sx(xv), pad.t + plotH + 14))
  ctx.save(); ctx.translate(18, pad.t + plotH / 2); ctx.rotate(-Math.PI / 2)
  ctx.fillText("Column B", 0, 0); ctx.restore()
  ctx.textAlign = "right"
  yTicks.forEach((yv) => ctx.fillText(formatTick(yv, yStep), pad.l - 6, sy(yv) + 3))
}

function shouldStartDialogDrag(target) {
  if (!(target instanceof Element)) return false
  if (target.closest(".obs-dialog__resize-handle")) return false
  if (target.closest(".obs-dialog__handle")) return true
  if (target.closest("button, a[href], textarea, input, select, summary, label[for]")) return false
  return true
}

export default function ObservationTableDialog({ open, onOpenChange }) {
  const [tableData, setTableData] = useState(INITIAL_TABLE)
  const [graphPoints, setGraphPoints] = useState(null)
  const [tableExpanded, setTableExpanded] = useState(true)
  const [graphExpanded, setGraphExpanded] = useState(true)
  const [graphMessage, setGraphMessage] = useState(null)
  const [chartSize, setChartSize] = useState({ w: CHART_MIN_W, h: CHART_MIN_H })
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [size, setSize] = useState({ w: DEFAULT_WIDTH, h: DEFAULT_HEIGHT })
  const [dialogDragging, setDialogDragging] = useState(false)
  const chartRef = useRef(null)
  const chartContainerRef = useRef(null)
  const isDragging = useRef(false)
  const isResizing = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 })
  const dragRaf = useRef(null)
  const pendingDragPoint = useRef(null)

  const canGenerateGraph = useMemo(() => getPlottablePoints(tableData).length >= 2, [tableData])

  const reindexTable = useCallback((table) => {
    return table.map((row, index) => {
      if (index === 0) return row
      const nextRow = [...row]; nextRow[0] = String(index); return nextRow
    })
  }, [])

  const addRow = useCallback(() => {
    const cols = tableData[0]?.length ?? 1
    setTableData((prev) => reindexTable([...prev, Array(cols).fill("")]))
  }, [tableData, reindexTable])

  const updateCell = useCallback((rowIndex, colIndex, value) => {
    if (rowIndex === 0 || colIndex === 0 || colIndex === 3) return
    setTableData((prev) => {
      const next = prev.map((r) => [...r])
      if (!next[rowIndex]) return next
      next[rowIndex][colIndex] = value
      next[rowIndex][3] = computeResult(next[rowIndex][1], next[rowIndex][2])
      return next
    })
  }, [])

  const downloadPdf = useCallback(() => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const marginX = 14

    doc.setFontSize(12); doc.setFont(undefined, "bold")
    doc.text(PDF_TITLE, marginX, 18)
    doc.setFont(undefined, "normal")

    const head = tableData[0] ? tableData[0].map((c) => c || "") : []
    const body = tableData.slice(1).map((row, index) => {
      const r = [...row]; r[0] = String(index + 1)
      r[3] = computeResult(r[1], r[2]) || "—"
      return r.map((c) => c || "")
    })

    autoTable(doc, {
      head: [head], body, startY: 26,
      styles: { fontSize: 10 }, headStyles: { fillColor: [100, 100, 100] },
    })

    const tableEndY = doc.lastAutoTable?.finalY ?? 70
    doc.setFontSize(12); doc.setFont(undefined, "bold")
    doc.text("Graph", marginX, tableEndY + 10); doc.setFont(undefined, "normal")

    const pointsForPdf = getPlottablePoints(tableData)
    if (pointsForPdf.length >= 2) {
      const graphW = pageWidth - marginX * 2
      const graphH = Math.min(90, Math.max(70, graphW * 0.52))
      const graphY = tableEndY + 16
      if (graphY + graphH > pageHeight - 12) doc.addPage()
      const canvas = document.createElement("canvas"); canvas.width = 1000; canvas.height = 520
      const ctx = canvas.getContext("2d")
      if (ctx) {
        drawChart(ctx, pointsForPdf, canvas.width, canvas.height)
        const finalY = graphY + graphH > pageHeight - 12 ? 22 : graphY
        doc.addImage(canvas.toDataURL("image/png"), "PNG", marginX, finalY, graphW, graphH, undefined, "FAST")
      }
    } else {
      doc.setFontSize(10); doc.setTextColor(90, 90, 90)
      doc.text("Enter at least two valid rows to include graph in PDF.", marginX, tableEndY + 16)
    }

    doc.save(PDF_FILENAME)
  }, [tableData])

  /* ── Drag ── */
  const clampOffset = useCallback((next) => {
    const vw = typeof window !== "undefined" ? window.innerWidth : 0
    const vh = typeof window !== "undefined" ? window.innerHeight : 0
    if (!vw || !vh) return next
    const margin = 12, topReserve = 80
    return {
      x: Math.min(vw / 2 - margin - size.w / 2, Math.max(margin + size.w / 2 - vw / 2, next.x)),
      y: Math.min(vh / 2 - margin - size.h / 2, Math.max(topReserve + size.h / 2 - vh / 2, next.y)),
    }
  }, [size.w, size.h])

  const handleDialogPointerDown = (e) => {
    if (e.button !== 0 || !shouldStartDialogDrag(e.target)) return
    isDragging.current = true; setDialogDragging(true)
    dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y }
    e.currentTarget.setPointerCapture(e.pointerId)
    try { document.documentElement.style.userSelect = "none"; document.documentElement.style.touchAction = "none" } catch {}
  }
  const handleDialogPointerMove = (e) => {
    if (!isDragging.current) return
    pendingDragPoint.current = { x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y }
    if (dragRaf.current) return
    dragRaf.current = requestAnimationFrame(() => {
      dragRaf.current = null; const pt = pendingDragPoint.current; if (!pt) return; setOffset(clampOffset(pt))
    })
  }
  const handleDialogPointerUp = (e) => {
    try { if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId) } catch {}
    isDragging.current = false; setDialogDragging(false); pendingDragPoint.current = null
    if (dragRaf.current) { cancelAnimationFrame(dragRaf.current); dragRaf.current = null }
    try { document.documentElement.style.userSelect = ""; document.documentElement.style.touchAction = "" } catch {}
  }

  /* ── Resize ── */
  const handleResizeDown = (e) => {
    e.stopPropagation(); isResizing.current = true
    resizeStart.current = { x: e.clientX, y: e.clientY, w: size.w, h: size.h }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const handleResizeMove = (e) => {
    if (!isResizing.current) return
    const nextSize = {
      w: Math.max(MIN_WIDTH, Math.min(resizeStart.current.w + e.clientX - resizeStart.current.x, window.innerWidth - 40)),
      h: Math.max(MIN_HEIGHT, Math.min(resizeStart.current.h + e.clientY - resizeStart.current.y, window.innerHeight - 40)),
    }
    setSize(nextSize); setOffset((prev) => clampOffset(prev))
  }
  const handleResizeUp = () => { isResizing.current = false }

  const handleOpenChange = (isOpen) => {
    if (isOpen) { setOffset({ x: 0, y: 0 }); setSize({ w: DEFAULT_WIDTH, h: DEFAULT_HEIGHT }) }
    else { setGraphPoints(null); setTableExpanded(true); setGraphExpanded(true); setGraphMessage(null) }
    onOpenChange(isOpen)
  }

  const handleGenerateGraph = useCallback(() => {
    const pts = getPlottablePoints(tableData)
    if (pts.length < 2) { setGraphMessage("Add at least two rows with valid data to plot."); setGraphPoints(null); return }
    setGraphMessage(null); setGraphPoints(pts); setGraphExpanded(true)
    setSize(prev => ({ ...prev, h: Math.min(Math.max(prev.h, 850), window.innerHeight - 40) }))
  }, [tableData])

  useLayoutEffect(() => {
    if (!open || !graphPoints?.length || !graphExpanded) return
    const el = chartContainerRef.current; if (!el) return
    const measure = () => {
      requestAnimationFrame(() => {
        const box = chartContainerRef.current; if (!box) return
        const cw = Math.floor(box.clientWidth)
        const w = Math.max(CHART_MIN_W, cw > 0 ? cw : CHART_MIN_W)
        const capH = typeof window !== "undefined" ? Math.floor(window.innerHeight * 0.52) : 560
        const h = Math.min(capH, Math.max(CHART_MIN_H, Math.floor(w * 0.46)))
        setChartSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }))
      })
    }
    measure()
    const ro = new ResizeObserver(measure); ro.observe(el)
    return () => ro.disconnect()
  }, [open, graphPoints, graphExpanded])

  useEffect(() => {
    if (!graphPoints?.length || !graphExpanded || !chartRef.current) return
    const canvas = chartRef.current
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
    const { w, h } = chartSize
    canvas.style.width = `${w}px`; canvas.style.height = `${h}px`
    canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr)
    const ctx = canvas.getContext("2d"); if (!ctx) return
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.scale(dpr, dpr)
    drawChart(ctx, graphPoints, w, h)
  }, [graphPoints, graphExpanded, chartSize])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} modal={false}>
      <DialogContentModeless
        className="obs-dialog"
        data-dragging={dialogDragging ? "true" : undefined}
        style={{
          left: `calc(50% + ${offset.x}px)`, top: `calc(50% + ${offset.y}px)`,
          width: `${size.w}px`, height: `${size.h}px`,
        }}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onPointerDown={handleDialogPointerDown}
        onPointerMove={handleDialogPointerMove}
        onPointerUp={handleDialogPointerUp}
        onPointerCancel={handleDialogPointerUp}
      >
        <div className="obs-dialog__handle">
          <GripHorizontal className="obs-dialog__grip" aria-hidden />
          <DialogHeader className="obs-dialog__header">
            <DialogTitle className="obs-dialog__title !text-sm !leading-tight">Observation Table</DialogTitle>
          </DialogHeader>
        </div>

        <div className="obs-dialog__toolbar">
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            <Plus className="h-4 w-4 mr-1" /> Add row
          </Button>
        </div>

        {graphMessage ? <p className="obs-dialog__graph-message" role="status">{graphMessage}</p> : null}

        <div className="obs-dialog__panels">
          <div className="obs-dialog__section" data-collapsed={tableExpanded ? undefined : "true"}>
            <button type="button" className="obs-dialog__section-header" onClick={() => setTableExpanded(v => !v)}>
              {tableExpanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
              <span>Observation Table</span>
            </button>
            {tableExpanded && (
              <div className="obs-dialog__table-wrap">
                <table className="obs-dialog__table">
                  <tbody>
                    {tableData.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, colIndex) => {
                          if (rowIndex === 0) return <th key={colIndex} className="obs-dialog__cell obs-dialog__cell--header" scope="col">{cell}</th>
                          if (colIndex === 0 || colIndex === 3) return <td key={colIndex} className="obs-dialog__cell obs-dialog__cell--sno">{cell || "—"}</td>
                          return (
                            <td key={colIndex} className="obs-dialog__cell">
                              <textarea className="obs-dialog__input" inputMode="decimal" value={cell}
                                onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                                placeholder="..." rows={1} />
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {graphPoints && graphPoints.length >= 2 && (
            <div className="obs-dialog__section" data-collapsed={graphExpanded ? undefined : "true"}>
              <button type="button" className="obs-dialog__section-header" onClick={() => setGraphExpanded(v => !v)}>
                {graphExpanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                <span>Graph</span>
              </button>
              {graphExpanded && (
                <div ref={chartContainerRef} className="obs-dialog__chart-wrap">
                  <canvas ref={chartRef} className="obs-dialog__chart" aria-label="Data graph" />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="obs-dialog__actions">
          <Button type="button" size="sm" variant="default" onClick={handleGenerateGraph} disabled={!canGenerateGraph}>
            <LineChart className="h-4 w-4 mr-1" /> Generate graph
          </Button>
          <Button size="sm" variant="default" onClick={downloadPdf} className="flex items-center gap-1.5">
            <Download className="h-4 w-4" /> Download PDF
          </Button>
        </div>

        <div className="obs-dialog__resize-handle"
          onPointerDown={handleResizeDown} onPointerMove={handleResizeMove} onPointerUp={handleResizeUp} aria-hidden="true" />
      </DialogContentModeless>
    </Dialog>
  )
}
```

---

## Step 10 — Create `src/components/WorkspaceHeader.jsx`

```jsx
"use client"

import { useEffect, useState } from "react"
import {
  Info, HelpCircle, ClipboardList, ChevronsLeft, ChevronsRight, MapPinned,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger,
} from "@/components/ui/dialog"
import { TooltipProvider } from "@/components/ui/tooltip"
import { TouchAwareTooltip } from "@/components/TouchAwareTooltip"
import ObservationTableDialog from "@/components/ObservationTableDialog"
import { resetTourForTesting } from "@/components/tour/resetTour"

const LAB_STEPS = [
  "Select a test from the sidebar tiles on the right.",
  "Run the simulation and watch the animation in the main workspace.",
  "Open Observations from the header to record results and download PDF.",
  "After visiting all activities, use Restart in the sidebar to return to the start.",
]

const TOUCH_HINT_KEY = "olabs_header_touch_hint_dismissed"

function TooltipBody({ title, children }) {
  return (
    <div className="space-y-1.5 text-left">
      <p className="font-semibold leading-tight text-foreground">{title}</p>
      <p className="text-xs leading-relaxed text-muted-foreground">{children}</p>
    </div>
  )
}

function TouchHeaderHint() {
  const [dismissed, setDismissed] = useState(true)
  useEffect(() => {
    try {
      const mq = window.matchMedia("(hover: none), (pointer: coarse)")
      if (!mq.matches) return
      setDismissed(localStorage.getItem(TOUCH_HINT_KEY) === "1")
    } catch { setDismissed(false) }
  }, [])
  const dismiss = () => { try { localStorage.setItem(TOUCH_HINT_KEY, "1") } catch {}; setDismissed(true) }
  if (dismissed) return null
  return (
    <div className="workspace-header__touch-hint" role="note">
      <span><strong className="text-foreground">Touch:</strong> Press and hold any header icon to see what it does. Tap once to use it.</span>
      <button type="button" className="workspace-header__touch-hint-dismiss" onClick={dismiss}>Got it</button>
    </div>
  )
}

export default function WorkspaceHeader() {
  const [obsDialogOpen, setObsDialogOpen] = useState(false)
  const [infoDialogOpen, setInfoDialogOpen] = useState(false)
  const [headerActionsOpen, setHeaderActionsOpen] = useState(false)

  useEffect(() => {
    const onTourHeader = (e) => { if (typeof e.detail?.open === "boolean") setHeaderActionsOpen(e.detail.open) }
    window.addEventListener("olabs-tour-set-header-actions", onTourHeader)
    return () => window.removeEventListener("olabs-tour-set-header-actions", onTourHeader)
  }, [])

  return (
    <TooltipProvider delayDuration={250} skipDelayDuration={150}>
      <header className="workspace-header" data-tour="header">
        <div className="workspace-header__main">
          <div className="workspace-header__title-wrap">
            <h1 className="workspace-header__title" data-tour="header-title">
              Your Experiment Title Here
            </h1>
          </div>
          <div className="workspace-header__actions">
            <div className="workspace-header__actions-cluster">
              <TouchAwareTooltip tooltip={<TooltipBody title="Watch tour again">Restarts the guided tour.</TooltipBody>} side="bottom" align="end">
                <Button type="button" variant="outline" size="icon" className="workspace-header__icon-action shrink-0"
                  onClick={resetTourForTesting} data-tour="watch-tour-again" aria-label="Watch tour again">
                  <MapPinned className="h-5 w-5" aria-hidden />
                </Button>
              </TouchAwareTooltip>

              <div id="workspace-header-actions"
                className={!headerActionsOpen ? "workspace-header__actions-group workspace-header__actions-group--collapsed" : "workspace-header__actions-group"}
                aria-hidden={!headerActionsOpen}>

                <TouchAwareTooltip tooltip={<TooltipBody title="Observation Table">Open the observation table.</TooltipBody>} side="bottom">
                  <button type="button" className="workspace-header-icon-btn workspace-header__icon-action"
                    onClick={() => setObsDialogOpen(true)} tabIndex={headerActionsOpen ? 0 : -1}
                    data-tour="observations" aria-label="Observation table">
                    <ClipboardList className="workspace-header-icon" aria-hidden />
                  </button>
                </TouchAwareTooltip>

                <TouchAwareTooltip tooltip={<TooltipBody title="Help">Context-sensitive help.</TooltipBody>} side="bottom">
                  <button type="button" className="workspace-header-icon-btn workspace-header__icon-action"
                    tabIndex={headerActionsOpen ? 0 : -1} data-tour="help" aria-label="Help">
                    <HelpCircle className="workspace-header-icon" aria-hidden />
                  </button>
                </TouchAwareTooltip>

                <Dialog open={infoDialogOpen} onOpenChange={setInfoDialogOpen}>
                  <TouchAwareTooltip tooltip={<TooltipBody title="Lab instructions">Step-by-step lab instructions.</TooltipBody>} side="bottom" align="end">
                    <DialogTrigger asChild>
                      <button type="button" className="workspace-header-icon-btn workspace-header__icon-action"
                        tabIndex={headerActionsOpen ? 0 : -1} data-tour="info" aria-label="Lab instructions">
                        <Info className="workspace-header-icon" aria-hidden />
                      </button>
                    </DialogTrigger>
                  </TouchAwareTooltip>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Lab Instructions</DialogTitle>
                      <DialogDescription>Follow the steps for a systematic experiment.</DialogDescription>
                    </DialogHeader>
                    <div className="lab-instructions-steps">
                      {LAB_STEPS.map((step, i) => <p key={i}>{i + 1}. {step}</p>)}
                    </div>
                    <div className="lab-instructions-footer">
                      <Button onClick={() => setInfoDialogOpen(false)}>Close</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <TouchAwareTooltip
                tooltip={<TooltipBody title={headerActionsOpen ? "Hide quick tools" : "Show quick tools"}>
                  {headerActionsOpen ? "Collapse tools." : "Expand tools."}
                </TooltipBody>} side="bottom" align="end">
                <button type="button"
                  className="workspace-header-icon-btn workspace-header__actions-collapse-toggle workspace-header__icon-action"
                  onClick={() => setHeaderActionsOpen((o) => !o)} aria-expanded={headerActionsOpen}
                  aria-controls="workspace-header-actions" data-tour="header-tools-toggle">
                  {headerActionsOpen ? <ChevronsRight className="workspace-header-icon" aria-hidden /> : <ChevronsLeft className="workspace-header-icon" aria-hidden />}
                </button>
              </TouchAwareTooltip>
            </div>
          </div>
        </div>
        <TouchHeaderHint />
      </header>
      <ObservationTableDialog open={obsDialogOpen} onOpenChange={setObsDialogOpen} />
    </TooltipProvider>
  )
}
```

---

## Step 11 — Create `src/app/workspace-header.css`

```css
@reference "./globals.css";

.workspace-header {
  @apply flex flex-col border-b border-border relative z-30 min-w-0;
  gap: 0.25rem;
  padding: clamp(0.5rem, 1.5vw, 0.75rem) clamp(0.75rem, 2.5vw, 1rem);
}
.workspace-header__main {
  display: flex; align-items: center; gap: clamp(0.5rem, 2vw, 1.25rem); min-width: 0; width: 100%;
}
.workspace-header__touch-hint {
  @apply flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed border-border/80 bg-muted/40 px-2 py-1.5 text-[0.7rem] leading-snug text-muted-foreground sm:text-xs;
}
.workspace-header__touch-hint-dismiss {
  @apply shrink-0 rounded border border-border bg-background px-2 py-0.5 text-[0.65rem] font-medium text-foreground hover:bg-muted;
}
.workspace-header__title-wrap { @apply min-w-0 flex-1; }
.workspace-header__title {
  @apply font-semibold;
  display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2;
  overflow: hidden; word-break: break-word; line-height: 1.25;
  padding-right: clamp(0.25rem, 1vw, 0.5rem);
  font-size: clamp(1.12rem, 0.5vw + 0.88rem, 1.2rem);
}
@media (min-width: 480px)  { .workspace-header__title { font-size: clamp(1.15rem, 0.55vw + 0.82rem, 1.3rem); } }
@media (min-width: 640px)  { .workspace-header__title { font-size: clamp(1.22rem, 0.62vw + 0.78rem, 1.45rem); } }
@media (min-width: 768px)  { .workspace-header__title { font-size: clamp(1.3rem, 0.72vw + 0.72rem, 1.6rem); } }
@media (min-width: 1024px) { .workspace-header__title { font-size: clamp(1.4rem, 0.9vw + 0.62rem, 1.85rem); } }
@media (min-width: 1280px) { .workspace-header__title { font-size: clamp(1.52rem, 1.05vw + 0.55rem, 2.1rem); } }
@media (min-width: 1920px) { .workspace-header__title { font-size: clamp(1.75rem, 1vw + 0.95rem, 2.5rem); line-height: 1.2; } }
@media (max-width: 360px)  { .workspace-header__title { font-size: clamp(1rem, 2.6vw + 0.62rem, 1.12rem); line-height: 1.2; -webkit-line-clamp: 3; } }

.workspace-header__actions { @apply flex shrink-0 items-center justify-end; }
.workspace-header__actions-cluster {
  display: flex; align-items: center; flex-wrap: nowrap; min-width: 0;
  gap: clamp(0.375rem, 1.75vw, 1rem);
}
.workspace-header__actions-group {
  @apply flex items-center justify-end min-w-0 overflow-hidden;
  gap: clamp(0.5rem, 2vw, 1.5rem);
  transition: max-width 0.35s ease, opacity 0.25s ease, margin 0.25s ease;
  max-width: min(85vw, 36rem);
}
.workspace-header__actions-group--collapsed {
  max-width: 0; opacity: 0; margin-inline: 0; padding-inline: 0; pointer-events: none; gap: 0;
}
.workspace-header__actions-collapse-toggle { @apply shrink-0 rounded-md; }
.workspace-header__icon-action { @apply h-9 w-9 shrink-0; }
.workspace-header__actions-cluster .workspace-header-icon-btn.workspace-header__icon-action {
  @apply box-border flex h-9 w-9 items-center justify-center p-0;
}
.workspace-header-icon-btn { @apply rounded p-1 cursor-pointer hover:bg-muted transition-colors; }
.workspace-header-icon-btn svg, .workspace-header-icon { @apply h-6 w-6; }
.lab-instructions-steps { @apply space-y-3 mt-4 text-sm text-muted-foreground; }
.lab-instructions-footer { @apply flex justify-end mt-6; }

/* Observation Table Dialog */
.obs-dialog {
  @apply max-w-none max-h-[96vh] p-0 gap-0 rounded-xl flex flex-col;
  box-shadow: 0 20px 60px rgba(0,0,0,0.25), 0 8px 24px rgba(0,0,0,0.15);
  min-width: 360px; min-height: 300px;
  cursor: grab; user-select: none; touch-action: none; z-index: 9999;
  overflow-x: hidden; overflow-y: auto;
}
.obs-dialog[data-dragging="true"] { cursor: grabbing; }
.obs-dialog button, .obs-dialog textarea, .obs-dialog input, .obs-dialog select, .obs-dialog summary {
  cursor: auto; touch-action: auto; user-select: text;
}
.obs-dialog canvas { cursor: grab; touch-action: none; user-select: none; }
.obs-dialog[data-dragging="true"] canvas { cursor: grabbing; }
.obs-dialog button { cursor: pointer; user-select: none; }
.obs-dialog__handle {
  @apply flex items-center gap-2 px-3 py-2 border-b border-border shrink-0;
  background: linear-gradient(to bottom, var(--muted), transparent);
}
.obs-dialog__grip { @apply h-4 w-4 text-muted-foreground shrink-0; }
.obs-dialog__header { @apply flex-1 text-left space-y-0 gap-0; }
.obs-dialog__title { @apply text-sm font-semibold leading-tight tracking-tight; }
.obs-dialog__graph-message {
  @apply text-xs text-amber-800 dark:text-amber-200 px-3 py-1.5 bg-amber-500/12 border-b border-border shrink-0;
}
.obs-dialog__panels { @apply flex flex-col min-h-0; flex: 1 1 0; overflow-y: auto; overflow-x: hidden; }
.obs-dialog__section { @apply flex flex-col min-h-0; flex: 1 1 0; transition: flex 0.2s ease; }
.obs-dialog__section[data-collapsed="true"] { flex: 0 0 auto; min-height: 0; }
.obs-dialog__section + .obs-dialog__section { border-top: 1px solid hsl(var(--border)); }
.obs-dialog__section-header {
  @apply flex items-center gap-1.5 px-3 py-2 text-xs font-semibold tracking-tight shrink-0;
  background: hsl(var(--muted) / 0.35); border: none;
  border-bottom: 1px solid hsl(var(--border));
  cursor: pointer; user-select: none; color: inherit; width: 100%; text-align: left;
  transition: background 0.15s;
}
.obs-dialog__section-header:hover { background: hsl(var(--muted) / 0.55); }
.obs-dialog__chart-wrap {
  @apply px-2 py-1 flex flex-col items-stretch justify-center bg-muted/10;
  flex: 1 1 0; min-height: 180px; overflow-x: hidden; overflow-y: auto;
}
.obs-dialog__chart { display: block; @apply rounded-md border border-border bg-background w-full max-w-full mx-auto; }
.obs-dialog__toolbar { @apply flex flex-wrap gap-1.5 px-3 py-2 border-b border-border bg-muted/30 shrink-0; }
.obs-dialog__table-wrap { @apply overflow-auto px-3 py-2; flex: 1 1 0; min-height: 140px; }
.obs-dialog__table { @apply w-full text-sm border-collapse; }
.obs-dialog__cell { @apply p-0 border border-border align-top; }
.obs-dialog__cell--header { @apply bg-muted/50 font-medium text-center align-middle px-2 py-1 text-xs; }
.obs-dialog__cell--sno { @apply text-center align-middle w-14 px-2 py-1.5 text-xs; }
.obs-dialog__input {
  @apply w-full min-w-[4rem] px-2 py-1.5 text-xs border-0 bg-transparent;
  @apply align-top resize-none whitespace-normal break-words;
}
.obs-dialog__input:focus { @apply outline-none bg-muted/30; }
.obs-dialog__input::placeholder { @apply text-muted-foreground/50; }
.obs-dialog__actions { @apply flex flex-wrap gap-2 px-3 py-2 border-t border-border bg-muted/20 shrink-0; }
.obs-dialog__resize-handle {
  position: absolute; right: 0; bottom: 0; width: 20px; height: 20px;
  cursor: nwse-resize; touch-action: none; z-index: 10;
}
.obs-dialog__resize-handle::before {
  content: ""; position: absolute; right: 4px; bottom: 4px; width: 10px; height: 10px;
  border-right: 2px solid var(--muted-foreground); border-bottom: 2px solid var(--muted-foreground);
  opacity: 0.4; transition: opacity 0.15s;
}
.obs-dialog__resize-handle:hover::before { opacity: 0.8; }
```

If you use **Tailwind v3**, delete the first line `@reference "./globals.css";`.

---

## Step 12 — Import CSS and use in your page

```jsx
"use client"

import "../workspace-header.css"
import WorkspaceHeader from "@/components/WorkspaceHeader"

export default function SimulationPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh" }}>
      <WorkspaceHeader />
      <main style={{ flex: 1 }}>
        {/* your simulator goes here */}
      </main>
    </div>
  )
}
```

---

## How to customise the observation table for your lab

Edit these in `src/components/ObservationTableDialog.js`:

- **`INITIAL_TABLE`** — change column headers and count to match your lab
- **`computeResult(colA, colB)`** — change the formula (currently A/B; replace with your own)
- **`drawChart()`** — change axis labels ("Column A", "Column B") and chart logic
- **`PDF_TITLE`** / **`PDF_FILENAME`** — change PDF heading and download name
- Column 0 is auto-numbered (S.No.), column 3 is auto-computed. Edit `updateCell` if your auto-compute column is different.

---

## Done

You should now see:

- Header with title, tour button, collapse chevron
- Click chevron → Observations, Help, Info icons appear
- Click Observations → **full draggable/resizable dialog** with:
  - Editable table (add rows, type values, auto-computed result column)
  - "Generate graph" button → draws chart on canvas
  - "Download PDF" → exports table + graph as PDF
  - Drag from the grip handle; resize from bottom-right corner
- Click Info → lab instructions dialog with numbered steps
- On touch devices → one-time "hold for tooltip" banner
