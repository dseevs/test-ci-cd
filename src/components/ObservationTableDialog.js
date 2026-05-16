"use client"

import { useState, useRef, useCallback, useEffect, useLayoutEffect, useMemo } from "react"
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Download,
  GripHorizontal,
  LineChart,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContentModeless,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useStore } from "@/store/useStore"
import { getTranslation } from "@/i18n"
import { jsPDF } from "jspdf"
import { autoTable } from "jspdf-autotable"

/** R = V / I (Ω); empty or invalid inputs → em dash */
function resistanceFromVI(vStr, iStr) {
  const v = parseFloat(String(vStr ?? "").trim().replace(",", "."))
  const a = parseFloat(String(iStr ?? "").trim().replace(",", "."))
  if (!Number.isFinite(v) || !Number.isFinite(a) || a === 0) return ""
  const r = v / a
  if (!Number.isFinite(r)) return ""
  const rounded = Math.round(r * 10000) / 10000
  return String(rounded)
}

const INITIAL_TABLE = [
  ["S.No.", "V (V)", "I (A)", "R (Ω)"],
  ["1", "", "", ""],
]

const MIN_WIDTH = 360
const MIN_HEIGHT = 300
const DEFAULT_WIDTH = 700
const DEFAULT_HEIGHT = 560

/** Initial canvas logical size; ResizeObserver updates from chart container */
const CHART_MIN_W = 440
const CHART_MIN_H = 340

/** Valid (V, I) pairs from data rows, sorted by voltage for a sensible line */
function getPlottablePoints(tableData) {
  const pts = []
  for (let ri = 1; ri < tableData.length; ri++) {
    const row = tableData[ri]
    if (!row) continue
    const v = parseFloat(String(row[1] ?? "").trim().replace(",", "."))
    const a = parseFloat(String(row[2] ?? "").trim().replace(",", "."))
    if (Number.isFinite(v) && Number.isFinite(a)) pts.push({ v, i: a })
  }
  pts.sort((p, q) => p.v - q.v || p.i - q.i)
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
  const base = alphabet[index % 26]
  const cycle = Math.floor(index / 26)
  return cycle === 0 ? base : `${base}${cycle + 1}`
}

/** Draw V (x) vs I (y) — Ohm’s law: for a fixed resistor, I = V/R → straight line through origin */
function drawVIChart(ctx, points, width, height) {
  const pad = { l: 52, r: 20, t: 24, b: 44 }
  const plotW = width - pad.l - pad.r
  const plotH = height - pad.t - pad.b

  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = "hsla(0, 0%, 96%, 0.9)"
  ctx.fillRect(0, 0, width, height)

  const vs = points.map((p) => p.v)
  const is = points.map((p) => p.i)
  let vmin = Math.min(0, ...vs)
  let vmax = Math.max(...vs, 0)
  let imin = Math.min(0, ...is)
  let imax = Math.max(...is, 0)
  const vSpan = vmax - vmin || 1
  const iSpan = imax - imin || 1
  vmin -= vSpan * 0.08
  vmax += vSpan * 0.12
  imin -= iSpan * 0.08
  imax += iSpan * 0.12

  const sx = (v) => pad.l + ((v - vmin) / (vmax - vmin)) * plotW
  const sy = (i) => pad.t + plotH - ((i - imin) / (imax - imin)) * plotH

  const xTicks = buildTicks(vmin, vmax, 7)
  const yTicks = buildTicks(imin, imax, 6)
  const xStep = xTicks.length >= 2 ? Math.abs(xTicks[1] - xTicks[0]) : (vmax - vmin) / 6
  const yStep = yTicks.length >= 2 ? Math.abs(yTicks[1] - yTicks[0]) : (imax - imin) / 5

  ctx.strokeStyle = "rgba(0,0,0,0.12)"
  ctx.lineWidth = 1
  yTicks.forEach((yv) => {
    const y = sy(yv)
    ctx.beginPath()
    ctx.moveTo(pad.l, y)
    ctx.lineTo(pad.l + plotW, y)
    ctx.stroke()
  })
  xTicks.forEach((xv) => {
    const x = sx(xv)
    ctx.beginPath()
    ctx.moveTo(x, pad.t)
    ctx.lineTo(x, pad.t + plotH)
    ctx.stroke()
  })

  ctx.strokeStyle = "#1e293b"
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(pad.l, sy(0))
  ctx.lineTo(pad.l + plotW, sy(0))
  ctx.moveTo(sx(0), pad.t)
  ctx.lineTo(sx(0), pad.t + plotH)
  ctx.stroke()

  ctx.strokeStyle = "#2563eb"
  ctx.lineWidth = 2
  ctx.beginPath()
  points.forEach((p, idx) => {
    const x = sx(p.v)
    const y = sy(p.i)
    if (idx === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.stroke()

  const pr = Math.min(1.25, Math.max(1, width / 520))
  const ptR = 5 * pr

  ctx.fillStyle = "#1d4ed8"
  points.forEach((p) => {
    ctx.beginPath()
    ctx.arc(sx(p.v), sy(p.i), ptR, 0, Math.PI * 2)
    ctx.fill()
  })
  // Point identifiers and coordinates (A, B, C...) for easier reporting.
  ctx.font = `${Math.round(10 * pr)}px system-ui, sans-serif`
  points.forEach((p, idx) => {
    const x = sx(p.v)
    const y = sy(p.i)
    const name = pointName(idx)
    const coordText = `${name}(${p.v}, ${p.i})`
    ctx.fillStyle = "rgba(255,255,255,0.95)"
    const tw = ctx.measureText(coordText).width
    const tx = Math.min(pad.l + plotW - tw - 4, x + 8)
    const ty = Math.max(pad.t + 12, y - 8)
    ctx.fillRect(tx - 2, ty - 9, tw + 4, 12)
    ctx.fillStyle = "#0f172a"
    ctx.fillText(coordText, tx, ty)
  })

  ctx.fillStyle = "#334155"
  ctx.font = `${Math.round(11 * pr)}px system-ui, sans-serif`
  ctx.textAlign = "center"
  ctx.fillText("V (V)", pad.l + plotW / 2, height - 10)
  ctx.font = `${Math.round(10 * pr)}px system-ui, sans-serif`
  xTicks.forEach((xv) => {
    const x = sx(xv)
    ctx.fillText(formatTick(xv, xStep), x, pad.t + plotH + 14)
  })

  ctx.save()
  ctx.translate(18, pad.t + plotH / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.fillText("I (A)", 0, 0)
  ctx.restore()
  ctx.textAlign = "right"
  yTicks.forEach((yv) => {
    const y = sy(yv)
    ctx.fillText(formatTick(yv, yStep), pad.l - 6, y + 3)
  })

  ctx.textAlign = "left"
  ctx.fillStyle = "#64748b"
  ctx.font = `${Math.round(10 * pr)}px system-ui, sans-serif`
  ctx.fillText("I = V/R · ohmic line", pad.l, 12 + Math.round(2 * pr))
}

function shouldStartDialogDrag(target) {
  if (!(target instanceof Element)) return false
  if (target.closest(".obs-dialog__resize-handle")) return false
  // Prefer the handle as the intentional drag affordance
  if (target.closest(".obs-dialog__handle")) return true
  if (
    target.closest(
      "button, a[href], textarea, input, select, summary, label[for]"
    )
  ) {
    return false
  }
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

  const observations = useStore((s) => s.observations)
  const reactionComplete = useStore((s) => s.reactionComplete)
  const setScore = useStore((s) => s.setScore)
  const userName = useStore((s) => s.userName)
  const language = useStore((s) => s.language)
  const t = useMemo(() => getTranslation(language), [language])
  const canGenerateGraph = useMemo(() => getPlottablePoints(tableData).length >= 2, [tableData])

  const reindexTable = useCallback((table) => {
    return table.map((row, index) => {
      if (index === 0) return row
      const nextRow = [...row]
      nextRow[0] = String(index)
      return nextRow
    })
  }, [])

  const addRow = useCallback(() => {
    const cols = tableData[0]?.length ?? 1
    setTableData((prev) => {
      const next = [...prev, Array(cols).fill("")]
      return reindexTable(next)
    })
  }, [tableData, reindexTable])

  const updateCell = useCallback((rowIndex, colIndex, value) => {
    if (rowIndex === 0 || colIndex === 0 || colIndex === 3) return
    setTableData((prev) => {
      const next = prev.map((r) => [...r])
      if (!next[rowIndex]) return next
      next[rowIndex] = [...next[rowIndex]]
      next[rowIndex][colIndex] = value
      const v = next[rowIndex][1]
      const i = next[rowIndex][2]
      next[rowIndex][3] = resistanceFromVI(v, i)
      return next
    })
  }, [])

  const downloadPdf = useCallback(() => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const marginX = 14
    const topY = 18
    const lineGap = 6

    const experimentTitle = "Study of Different Properties of Acetic Acid"
    const nameText = (userName || "").trim() || "____________________"
    const classText = "____________________"
    const divisionText = "____________________"
    const subjectText = "Science"

    doc.setTextColor(0, 0, 0)
    doc.setFontSize(12)
    doc.setFont(undefined, "bold")
    doc.text(experimentTitle, marginX, topY)
    doc.setFont(undefined, "normal")
    doc.setFontSize(10)

    const metaY = topY + 10
    doc.text(`Name: ${nameText}`, marginX, metaY)
    doc.text(`Class: ${classText}`, marginX, metaY + lineGap)
    doc.text(`Division: ${divisionText}`, marginX, metaY + lineGap * 2)
    doc.text(`Subject: ${subjectText}`, pageWidth - marginX, metaY, { align: "right" })

    const tableTitleY = metaY + lineGap * 3 + 6
    doc.setFontSize(12)
    doc.setFont(undefined, "bold")
    doc.text("Observation Table", marginX, tableTitleY)
    doc.setFont(undefined, "normal")

    const head = tableData[0] ? tableData[0].map((c) => c || "") : []
    const body = tableData.slice(1).map((row, index) => {
      const nextRow = [...row]
      nextRow[0] = String(index + 1)
      const r = resistanceFromVI(nextRow[1], nextRow[2])
      nextRow[3] = r !== "" ? r : "—"
      return nextRow.map((c) => c || "")
    })

    autoTable(doc, {
      head: [head],
      body,
      startY: tableTitleY + 6,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [100, 100, 100] },
    })

    const tableEndY = doc.lastAutoTable?.finalY ?? 70
    const graphTitleY = tableEndY + 10
    doc.setFontSize(12)
    doc.setFont(undefined, "bold")
    doc.text("Graph", marginX, graphTitleY)
    doc.setFont(undefined, "normal")

    const pointsForPdf = getPlottablePoints(tableData)
    if (pointsForPdf.length >= 2) {
      const graphW = pageWidth - marginX * 2
      const graphH = Math.min(90, Math.max(70, graphW * 0.52))
      const graphY = graphTitleY + 6

      if (graphY + graphH > pageHeight - 12) {
        doc.addPage()
        doc.setFontSize(12)
        doc.setFont(undefined, "bold")
        doc.text("Graph", marginX, 16)
        doc.setFont(undefined, "normal")
      }

      const canvas = document.createElement("canvas")
      canvas.width = 1000
      canvas.height = 520
      const ctx = canvas.getContext("2d")
      if (ctx) {
        drawVIChart(ctx, pointsForPdf, canvas.width, canvas.height)
        const imageData = canvas.toDataURL("image/png")
        const finalY = graphY + graphH > pageHeight - 12 ? 22 : graphY
        doc.addImage(imageData, "PNG", marginX, finalY, graphW, graphH, undefined, "FAST")
      } else {
        const fallbackY = graphY + 6
        doc.setFontSize(10)
        doc.setTextColor(90, 90, 90)
        doc.text("Unable to render graph image.", marginX, fallbackY)
        doc.setTextColor(0, 0, 0)
      }
    } else {
      doc.setFontSize(10)
      doc.setTextColor(90, 90, 90)
      doc.text("Enter at least two valid V and I rows to include graph in PDF.", marginX, graphTitleY + 6)
      doc.setTextColor(0, 0, 0)
    }

    doc.save("ohms-law-observations.pdf")
  }, [tableData, userName])

  /* ── Drag entire dialog (exclude controls); not header-only ── */
  const handleDialogPointerDown = (e) => {
    if (e.button !== 0 || !shouldStartDialogDrag(e.target)) return
    isDragging.current = true
    setDialogDragging(true)
    dragStart.current = {
      x: e.clientX - offset.x,
      y: e.clientY - offset.y,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    // Avoid accidental selection/scroll while dragging
    try {
      document.documentElement.style.userSelect = "none"
      document.documentElement.style.touchAction = "none"
    } catch {
      /* ignore */
    }
  }

  const handleDialogPointerMove = (e) => {
    if (!isDragging.current) return
    pendingDragPoint.current = {
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    }
    if (dragRaf.current) return
    dragRaf.current = requestAnimationFrame(() => {
      dragRaf.current = null
      const pt = pendingDragPoint.current
      if (!pt) return
      setOffset(clampOffset(pt))
    })
  }

  const handleDialogPointerUp = (e) => {
    try {
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }
    } catch {
      /* ignore */
    }
    isDragging.current = false
    setDialogDragging(false)
    pendingDragPoint.current = null
    if (dragRaf.current) {
      cancelAnimationFrame(dragRaf.current)
      dragRaf.current = null
    }
    try {
      document.documentElement.style.userSelect = ""
      document.documentElement.style.touchAction = ""
    } catch {
      /* ignore */
    }
  }

  /* ── Resize handlers ── */
  const handleResizeDown = (e) => {
    e.stopPropagation()
    isResizing.current = true
    resizeStart.current = {
      x: e.clientX,
      y: e.clientY,
      w: size.w,
      h: size.h,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handleResizeMove = (e) => {
    if (!isResizing.current) return
    const dw = e.clientX - resizeStart.current.x
    const dh = e.clientY - resizeStart.current.y
    const nextSize = {
      w: Math.max(MIN_WIDTH, Math.min(resizeStart.current.w + dw, window.innerWidth - 40)),
      h: Math.max(MIN_HEIGHT, Math.min(resizeStart.current.h + dh, window.innerHeight - 40)),
    }
    setSize(nextSize)
    // Keep the dialog on-screen while resizing
    setOffset((prev) => clampOffset(prev))
  }

  const handleResizeUp = () => {
    isResizing.current = false
  }

  const handleOpenChange = (isOpen) => {
    if (isOpen) {
      setOffset({ x: 0, y: 0 })
      setSize({ w: DEFAULT_WIDTH, h: DEFAULT_HEIGHT })
    } else {
      setGraphPoints(null)
      setTableExpanded(true)
      setGraphExpanded(true)
      setGraphMessage(null)
      setChartSize({ w: CHART_MIN_W, h: CHART_MIN_H })
    }
    onOpenChange(isOpen)
  }

  const handleGenerateGraph = useCallback(() => {
    const pts = getPlottablePoints(tableData)
    if (pts.length < 2) {
      setGraphMessage(t.obs_graph_min_rows)
      setGraphPoints(null)
      return
    }
    setGraphMessage(null)
    setGraphPoints(pts)
    setGraphExpanded(true)
    setSize(prev => ({
      ...prev,
      h: Math.min(Math.max(prev.h, 850), window.innerHeight - 40),
    }))
  }, [tableData])

  useLayoutEffect(() => {
    if (!open || !graphPoints?.length || !graphExpanded) return
    const el = chartContainerRef.current
    if (!el) return
    const measure = () => {
      requestAnimationFrame(() => {
        const box = chartContainerRef.current
        if (!box) return
        const cw = Math.floor(box.clientWidth)
        const w = Math.max(CHART_MIN_W, cw > 0 ? cw : CHART_MIN_W)
        const capH =
          typeof window !== "undefined" ? Math.floor(window.innerHeight * 0.52) : 560
        const h = Math.min(
          capH,
          Math.max(CHART_MIN_H, Math.floor(w * 0.46))
        )
        setChartSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }))
      })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [open, graphPoints, graphExpanded])

  useEffect(() => {
    if (!graphPoints?.length || !graphExpanded || !chartRef.current) return
    const canvas = chartRef.current
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
    const { w, h } = chartSize
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    canvas.width = Math.floor(w * dpr)
    canvas.height = Math.floor(h * dpr)
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(dpr, dpr)
    drawVIChart(ctx, graphPoints, w, h)
  }, [graphPoints, graphExpanded, chartSize])

  const clampOffset = useCallback(
    (next) => {
      const vw = typeof window !== "undefined" ? window.innerWidth : 0
      const vh = typeof window !== "undefined" ? window.innerHeight : 0
      if (!vw || !vh) return next

      const margin = 12
      // Keep at least 80px of the header visible from the top so the handle
      // never hides behind the workspace title bar (~60px).
      const topReserve = 80

      const minX = margin + size.w / 2 - vw / 2
      const maxX = vw / 2 - margin - size.w / 2
      const minY = topReserve + size.h / 2 - vh / 2
      const maxY = vh / 2 - margin - size.h / 2

      return {
        x: Math.min(maxX, Math.max(minX, next.x)),
        y: Math.min(maxY, Math.max(minY, next.y)),
      }
    },
    [size.w, size.h]
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} modal={false}>
      <DialogContentModeless
        className="obs-dialog"
        data-dragging={dialogDragging ? "true" : undefined}
        style={{
          left: `calc(50% + ${offset.x}px)`,
          top: `calc(50% + ${offset.y}px)`,
          width: `${size.w}px`,
          height: `${size.h}px`,
        }}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onPointerDown={handleDialogPointerDown}
        onPointerMove={handleDialogPointerMove}
        onPointerUp={handleDialogPointerUp}
        onPointerCancel={handleDialogPointerUp}
      >
        {/* ── Title strip (visual only; drag from anywhere on the dialog) ── */}
        <div className="obs-dialog__handle">
          <GripHorizontal className="obs-dialog__grip" aria-hidden />
          <DialogHeader className="obs-dialog__header">
            <DialogTitle className="obs-dialog__title !text-sm !leading-tight">
              {t.workspace_observation_table}
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* ── Toolbar ── */}
        <div className="obs-dialog__toolbar">
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            <Plus className="h-4 w-4 mr-1" />
            {t.obs_add_row}
          </Button>
        </div>

        {graphMessage ? (
          <p className="obs-dialog__graph-message" role="status">
            {graphMessage}
          </p>
        ) : null}

        {/* ── Collapsible content panels ── */}
        <div className="obs-dialog__panels">
          {/* ── Table section ── */}
          <div className="obs-dialog__section" data-collapsed={tableExpanded ? undefined : "true"}>
            <button
              type="button"
              className="obs-dialog__section-header"
              onClick={() => setTableExpanded(v => !v)}
            >
              {tableExpanded
                ? <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
              <span>{t.workspace_observation_table}</span>
            </button>
            {tableExpanded && (
              <div id="obs-dialog-readings" className="obs-dialog__table-wrap">
                <table className="obs-dialog__table">
                  <tbody>
                    {tableData.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, colIndex) => {
                          const isHeader = rowIndex === 0
                          const isSerialCol = colIndex === 0 || colIndex === 3

                          if (isHeader) {
                            return (
                              <th
                                key={colIndex}
                                className="obs-dialog__cell obs-dialog__cell--header"
                                scope="col"
                              >
                                {cell}
                              </th>
                            )
                          }

                          if (isSerialCol) {
                            return (
                              <td key={colIndex} className="obs-dialog__cell obs-dialog__cell--sno">
                                {cell !== "" ? cell : "—"}
                              </td>
                            )
                          }

                          return (
                            <td key={colIndex} className="obs-dialog__cell">
                              <textarea
                                className="obs-dialog__input"
                                inputMode="decimal"
                                value={cell}
                                onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                                placeholder={colIndex === 1 ? "e.g. 3.0" : "e.g. 0.5"}
                                rows={1}
                              />
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

          {/* ── Graph section (only when data exists) ── */}
          {graphPoints && graphPoints.length >= 2 && (
            <div className="obs-dialog__section" data-collapsed={graphExpanded ? undefined : "true"}>
              <button
                type="button"
                className="obs-dialog__section-header"
                onClick={() => setGraphExpanded(v => !v)}
              >
                {graphExpanded
                  ? <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                  : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                <span>{t.obs_graph_title}</span>
              </button>
              {graphExpanded && (
                <div ref={chartContainerRef} className="obs-dialog__chart-wrap">
                  <canvas ref={chartRef} className="obs-dialog__chart" aria-label="V versus I graph" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer actions ── */}
        <div className="obs-dialog__actions">
          <Button
            type="button"
            size="sm"
            variant="default"
            onClick={handleGenerateGraph}
            disabled={!canGenerateGraph}
            title={!canGenerateGraph ? t.obs_enter_min_rows : undefined}
          >
            <LineChart className="h-4 w-4 mr-1" />
            {t.obs_generate_graph}
          </Button>
          <Button
            size="sm"
            variant="default"
            onClick={downloadPdf}
            className="flex items-center gap-1.5"
          >
            <Download className="h-4 w-4" />
            {t.obs_download}
          </Button>
        </div>

        {/* ── Resize handle (bottom-right corner) ── */}
        <div
          className="obs-dialog__resize-handle"
          onPointerDown={handleResizeDown}
          onPointerMove={handleResizeMove}
          onPointerUp={handleResizeUp}
          aria-hidden="true"
        />
      </DialogContentModeless>
    </Dialog>
  )
}
