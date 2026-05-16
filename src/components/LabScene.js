"use client"

import React, { useMemo, useCallback, useEffect, useRef, useState } from "react"
import { useStore, EXPERIMENT_TYPES } from "@/store/useStore"

// Solubility pour animation timing (ms)
const SOLUBILITY_TILT_MS = 700
const SOLUBILITY_POUR_MS = 2000
const SOLUBILITY_RETURN_MS = 800
const SOLUBILITY_TOTAL_MS = SOLUBILITY_TILT_MS + SOLUBILITY_POUR_MS + SOLUBILITY_RETURN_MS

// =============================================================================
// ALIGNMENT: SVG viewBox is 900 x 380. All positions below are in that space.
// The overlay div (lab-solubility-overlay) has position:absolute; inset:0 so it
// covers the same area as the SVG. We position the draggable and drop zone with
// % (left/top/width/height) so they match the SVG: percentage of overlay = same
// percentage of viewBox, so overlay and SVG stay aligned when the container resizes.
// =============================================================================

// Test tube geometry (viewBox 900 x 380)
const VIEWBOX_W = 900
const VIEWBOX_H = 380
const TUBE_WIDTH = 44
const TUBE_HEIGHT = 180
const TUBE_BASE_Y = 260
const TUBE_MOUTH_Y = 80
const TUBE_LEFT_X = 158   // acid tube left edge (SVG path uses this)
const TUBE_CENTER_ACID = 180
const TUBE_CENTER_WATER = 420
const TUBE_LEFT_WATER = 398  // water tube left edge (SVG path uses this)
const WATER_LIQUID_TOP_INITIAL = 140
const ACID_LIQUID_TOP_INITIAL = 155
const WATER_LIQUID_TOP_FINAL = 80
const ACID_LIQUID_TOP_FINAL = 260

// --- DRAGGABLE (acid test tube): overlay must sit exactly on the SVG acid tube ---
// SVG acid tube: x=158..202, y=80..260. So left%=158/900, top%=80/380, w%=44/900, h%=180/380.
const ACID_TUBE_LEFT_PCT = (TUBE_LEFT_X / VIEWBOX_W) * 100
const ACID_TUBE_TOP_PCT = (TUBE_MOUTH_Y / VIEWBOX_H) * 100
const ACID_TUBE_WIDTH_PCT = (TUBE_WIDTH / VIEWBOX_W) * 100
const ACID_TUBE_HEIGHT_PCT = (TUBE_HEIGHT / VIEWBOX_H) * 100

// --- DROP ZONE: above water tube mouth. Centered on water tube, but wider/taller for easy drop ---
// Water tube mouth: x=398..442, y=80. We extend left by EXTRA/2 and add EXTRA to width/height.
const DROP_ZONE_EXTRA_W = 80
const DROP_ZONE_EXTRA_H = 40
const WATER_MOUTH_LEFT_PCT = ((TUBE_LEFT_WATER - DROP_ZONE_EXTRA_W / 2) / VIEWBOX_W) * 100
const WATER_MOUTH_TOP_PCT = (25 / VIEWBOX_H) * 100
const WATER_MOUTH_WIDTH_PCT = ((TUBE_WIDTH + DROP_ZONE_EXTRA_W) / VIEWBOX_W) * 100
const WATER_MOUTH_HEIGHT_PCT = ((55 + DROP_ZONE_EXTRA_H) / VIEWBOX_H) * 100

// Water test tube: center line = midpoint of left wall (398) and right wall (442) = 420.
// Change this to shift where the acid tube aligns when pouring.
const WATER_TUBE_CENTER_X = TUBE_CENTER_WATER  // 420 = center line (imaginary vertical line)

// Water test tube mouth opening — where liquid is received (top of water tube).
const WATER_TUBE_MOUTH_X = WATER_TUBE_CENTER_X
const WATER_TUBE_MOUTH_Y = TUBE_MOUTH_Y  // 80

// Pour pose: acid tube rotates 90° (horizontal), mouth aligned on water tube center line.
// How far above the water tube mouth the acid mouth sits (smaller = closer to water).
const ACID_POUR_MOUTH_Y = 50  // change this to move acid mouth up/down above water tube

// Translate so acid mouth (after 90° rotate) lands on center line at ACID_POUR_MOUTH_Y.
// Tuned for correct alignment: POUR_TRANSLATE_X = center - 670, POUR_TRANSLATE_Y = pour_y - 110.
const POUR_TRANSLATE_X = WATER_TUBE_CENTER_X - 670
const POUR_TRANSLATE_Y = ACID_POUR_MOUTH_Y - 110

// Acid tube mouth when pouring = on center line, just above water mouth.
const ACID_TUBE_MOUTH_WHEN_POURING_X = WATER_TUBE_CENTER_X
const ACID_TUBE_MOUTH_WHEN_POURING_Y = ACID_POUR_MOUTH_Y

// Droplets: straight down from acid mouth into water tube mouth (same x = center line).
const POUR_DROPLET_START_X = ACID_TUBE_MOUTH_WHEN_POURING_X
const POUR_DROPLET_START_Y = ACID_TUBE_MOUTH_WHEN_POURING_Y
const POUR_DROPLET_END_X = WATER_TUBE_MOUTH_X
const POUR_DROPLET_END_Y = WATER_TUBE_MOUTH_Y
const POUR_DROPLET_DY = POUR_DROPLET_END_Y - POUR_DROPLET_START_Y
const POUR_DROPLET_COUNT = 8

export default function LabScene({
  experimentSelected,
  labPhase = "idle",
  isPouring,
  phValue = 2.87,
  showBubbles,
  bubbleIntensity = 0,
  litmusColor = "blue",
}) {
  const acidDroppedInWater = useStore((s) => s.acidDroppedInWater)
  const odourObserved = useStore((s) => s.odourObserved)
  const setAcidDroppedInWater = useStore((s) => s.setAcidDroppedInWater)
  const setOdourObserved = useStore((s) => s.setOdourObserved)
  const setLabPhase = useStore((s) => s.setLabPhase)
  const runCurrentExperiment = useStore((s) => s.runCurrentExperiment)
  const setLitmusColor = useStore((s) => s.setLitmusColor)
  const isRunning = labPhase === "pouring" || labPhase === "reacting"

  // Solubility: animation phase and liquid levels (y coordinates, top of liquid)
  const [solubilityPhase, setSolubilityPhase] = useState("idle") // idle | tilting | pouring | returning | done
  const [waterLiquidTop, setWaterLiquidTop] = useState(WATER_LIQUID_TOP_INITIAL)
  const [acidLiquidTop, setAcidLiquidTop] = useState(ACID_LIQUID_TOP_INITIAL)
  const solubilityTimersRef = useRef([])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }, [])

  const handleDropOnWater = useCallback(() => {
    if (experimentSelected !== EXPERIMENT_TYPES.SOLUBILITY_IN_WATER || isRunning) return
    if (acidDroppedInWater) return
    setAcidDroppedInWater(true)
    setLabPhase("pouring")
    setSolubilityPhase("tilting")

    const t1 = setTimeout(() => {
      setSolubilityPhase("pouring")
      const startWater = WATER_LIQUID_TOP_INITIAL
      const endWater = WATER_LIQUID_TOP_FINAL
      const startAcid = ACID_LIQUID_TOP_INITIAL
      const endAcid = ACID_LIQUID_TOP_FINAL
      const startTime = performance.now()
      const animate = (now) => {
        const elapsed = now - startTime
        const t = Math.min(1, elapsed / SOLUBILITY_POUR_MS)
        const ease = t * (2 - t)
        setWaterLiquidTop(startWater + (endWater - startWater) * ease)
        setAcidLiquidTop(startAcid + (endAcid - startAcid) * ease)
        if (t < 1) requestAnimationFrame(animate)
      }
      requestAnimationFrame(animate)
    }, SOLUBILITY_TILT_MS)

    const t2 = setTimeout(() => {
      setSolubilityPhase("returning")
    }, SOLUBILITY_TILT_MS + SOLUBILITY_POUR_MS)

    const t3 = setTimeout(() => {
      setSolubilityPhase("done")
      runCurrentExperiment()
      setLabPhase("complete")
    }, SOLUBILITY_TOTAL_MS)

    solubilityTimersRef.current = [t1, t2, t3]
  }, [experimentSelected, isRunning, acidDroppedInWater, setAcidDroppedInWater, setLabPhase, runCurrentExperiment])

  useEffect(() => {
    return () => {
      solubilityTimersRef.current.forEach(clearTimeout)
    }
  }, [])

  useEffect(() => {
    if (experimentSelected !== EXPERIMENT_TYPES.SOLUBILITY_IN_WATER) {
      setSolubilityPhase("idle")
      setWaterLiquidTop(WATER_LIQUID_TOP_INITIAL)
      setAcidLiquidTop(ACID_LIQUID_TOP_INITIAL)
    } else if (!acidDroppedInWater) {
      setSolubilityPhase("idle")
      setWaterLiquidTop(WATER_LIQUID_TOP_INITIAL)
      setAcidLiquidTop(ACID_LIQUID_TOP_INITIAL)
    }
  }, [experimentSelected, acidDroppedInWater])

  const handleWaftClick = useCallback(() => {
    if (experimentSelected !== EXPERIMENT_TYPES.ODOUR_TEST || isRunning) return
    setOdourObserved(true)
    runCurrentExperiment()
    setLabPhase("complete")
  }, [experimentSelected, isRunning, setOdourObserved, runCurrentExperiment, setLabPhase])

  const bubbles = useMemo(() => {
    const n = Math.max(0, Math.min(28, Math.round(bubbleIntensity * 3)))
    return Array.from({ length: n }, (_, i) => {
      const x = 50 + ((i * 23) % 120)
      const r = 2.5 + ((i * 11) % 5)
      const delayClass = `lab-bubble--d${i % 8}`
      const durClass = `lab-bubble--t${(i % 4) + 1}`
      return { x, r, delayClass, durClass, key: `b-${i}` }
    })
  }, [bubbleIntensity])

  const handleDropOnLitmus = useCallback(() => {
    if (experimentSelected !== EXPERIMENT_TYPES.LITMUS_TEST || labPhase === "complete") return
    setLitmusColor("red")
    runCurrentExperiment()
    setLabPhase("complete")
  }, [experimentSelected, labPhase, runCurrentExperiment, setLabPhase, setLitmusColor])

  const getStatusText = () => {
    if (labPhase === "idle") {
      if (experimentSelected === EXPERIMENT_TYPES.SOLUBILITY_IN_WATER)
        return acidDroppedInWater ? "Acetic acid dissolved in water." : "Drag acetic acid test tube above the water test tube mouth"
      if (experimentSelected === EXPERIMENT_TYPES.ODOUR_TEST)
        return odourObserved ? "Odour observed." : "Click Waft to smell (do not inhale directly)"
      if (experimentSelected === EXPERIMENT_TYPES.LITMUS_TEST)
        return litmusColor === "red" ? "Litmus turned red — acidic." : "Drag the acid dropper onto the litmus paper"
      return "Interact with the lab to run the experiment"
    }
    if (labPhase === "pouring") {
      if (experimentSelected === EXPERIMENT_TYPES.SOLUBILITY_IN_WATER) {
        if (solubilityPhase === "tilting") return "Tilting acid test tube…"
        if (solubilityPhase === "pouring") return "Pouring acid into water…"
        if (solubilityPhase === "returning") return "Returning test tube…"
      }
      if (experimentSelected === EXPERIMENT_TYPES.BICARBONATE_REACTION) return "Adding acetic acid to NaHCO₃…"
      if (experimentSelected === EXPERIMENT_TYPES.LITMUS_TEST) return "Dipping litmus paper…"
      return "Running…"
    }
    if (labPhase === "complete") return "Complete — record observations."
    return ""
  }

  const sceneClass = experimentSelected
    ? `lab-scene--${experimentSelected.replace(/_/g, "-")}`
    : "lab-scene--none"

  return (
    <div
      className={`lab-scene ${isPouring ? "lab-scene--pouring" : ""} ${showBubbles ? "lab-scene--bubbling" : ""} lab-scene--phase-${labPhase} ${sceneClass}`}
      data-experiment={experimentSelected}
    >
      <div className="lab-scene__header">
        <div className="lab-scene__title">
          {experimentSelected === EXPERIMENT_TYPES.SOLUBILITY_IN_WATER && "Solubility in water"}
          {experimentSelected === EXPERIMENT_TYPES.ODOUR_TEST && "Odour test"}
          {experimentSelected === EXPERIMENT_TYPES.LITMUS_TEST && "Effect of litmus test"}
          {experimentSelected === EXPERIMENT_TYPES.BICARBONATE_REACTION && "Reaction with NaHCO₃"}
          {!experimentSelected && "Lab setup"}
        </div>
        <div className="lab-scene__subtitle">{getStatusText()}</div>
      </div>

      <div className="lab-scene__svg-wrap">
      <svg
        className="lab-scene__svg"
        viewBox="0 0 900 380"
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label={`Lab: ${experimentSelected || "no experiment"}`}
      >
        <defs>
          <path id="lab-pour-path" d="M 420 28 Q 465 100 465 195" fill="none" />
          <path id="lab-pour-path-water" d="M 420 28 Q 465 100 465 195" fill="none" />
          {/* Glass: light from top-left, slight curvature */}
          <linearGradient id="lab-glass-fill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="oklch(0.97 0.005 250)" stopOpacity="0.85" />
            <stop offset="35%" stopColor="oklch(0.92 0.01 250)" stopOpacity="0.75" />
            <stop offset="100%" stopColor="oklch(0.82 0.02 250)" stopOpacity="0.7" />
          </linearGradient>
          {/* Glass rim highlight */}
          <linearGradient id="lab-glass-rim" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="white" stopOpacity="0.6" />
            <stop offset="100%" stopColor="white" stopOpacity="0.1" />
          </linearGradient>
          {/* Liquid: body + surface highlight (meniscus effect) */}
          <linearGradient id="lab-liquid-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="oklch(0.82 0.1 75)" stopOpacity="0.98" />
            <stop offset="8%" stopColor="oklch(0.76 0.12 75)" stopOpacity="0.95" />
            <stop offset="100%" stopColor="oklch(0.58 0.14 75)" stopOpacity="0.92" />
          </linearGradient>
          <linearGradient id="lab-water-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="oklch(0.94 0.02 220)" stopOpacity="0.95" />
            <stop offset="100%" stopColor="oklch(0.72 0.04 220)" stopOpacity="0.88" />
          </linearGradient>
          <linearGradient id="lab-liquid-mixed-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="oklch(0.88 0.06 85)" stopOpacity="0.95" />
            <stop offset="100%" stopColor="oklch(0.7 0.1 75)" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="lab-stream-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="oklch(0.82 0.1 75)" stopOpacity="1" />
            <stop offset="100%" stopColor="oklch(0.65 0.15 75)" stopOpacity="0.85" />
          </linearGradient>
          <linearGradient id="lab-stream-gradient-water" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="oklch(0.9 0.03 220)" stopOpacity="1" />
            <stop offset="100%" stopColor="oklch(0.7 0.05 220)" stopOpacity="0.9" />
          </linearGradient>
          {/* Bubbles: spherical highlight */}
          <radialGradient id="lab-bubble-gradient" cx="35%" cy="35%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity="0.95" />
            <stop offset="40%" stopColor="oklch(0.92 0.01 250)" stopOpacity="0.7" />
            <stop offset="100%" stopColor="oklch(0.75 0.02 250)" stopOpacity="0.4" />
          </radialGradient>
          <filter id="lab-glass-shadow" x="-20%" y="-10%" width="140%" height="130%">
            <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="oklch(0.2 0 0)" floodOpacity="0.2" />
          </filter>
          <linearGradient id="lab-bench-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="oklch(0.52 0.04 80)" />
            <stop offset="100%" stopColor="oklch(0.38 0.05 80)" />
          </linearGradient>
          {/* Clip destination beaker liquid so it never overflows */}
          <clipPath id="lab-dest-beaker-clip">
            <rect x="392" y="48" width="156" height="218" rx="6" />
          </clipPath>
          <filter id="lab-bench-soft-shadow" x="-20%" y="0" width="140%" height="120%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="6" result="blur" />
            <feOffset in="blur" dx="0" dy="3" result="offset" />
            <feFlood floodColor="oklch(0.22 0 0)" floodOpacity="0.5" result="color" />
            <feComposite in="color" in2="offset" operator="in" result="shadow" />
            <feMerge><feMergeNode in="shadow" /></feMerge>
          </filter>
        </defs>

        {/* Lab bench: soft shadow below, then surface + front edge */}
        <rect x="0" y="324" width="900" height="30" className="lab-bench-shadow" filter="url(#lab-bench-soft-shadow)" />
        <rect x="0" y="318" width="900" height="64" className="lab-bench" />
        <rect x="0" y="318" width="900" height="4" className="lab-bench-edge" />

        {/* ----------------------------------------------------------------------- */}
        {/* 1. SOLUBILITY IN WATER: Two test tubes — drag acid tube above water mouth */}
        {/* ----------------------------------------------------------------------- */}
        {experimentSelected === EXPERIMENT_TYPES.SOLUBILITY_IN_WATER && (
          <g className="lab-setup lab-setup--solubility">
            {/* Water test tube (fixed) — base y=260, mouth y=80 */}
            <g className="lab-tube lab-tube--water">
              <path
                d={`M ${TUBE_LEFT_WATER} ${TUBE_MOUTH_Y} L ${TUBE_LEFT_WATER} ${TUBE_BASE_Y - 22} Q ${TUBE_LEFT_WATER} ${TUBE_BASE_Y} ${TUBE_CENTER_WATER} ${TUBE_BASE_Y} Q ${TUBE_LEFT_WATER + TUBE_WIDTH} ${TUBE_BASE_Y} ${TUBE_LEFT_WATER + TUBE_WIDTH} ${TUBE_BASE_Y - 22} L ${TUBE_LEFT_WATER + TUBE_WIDTH} ${TUBE_MOUTH_Y} Z`}
                className="lab-tube-body"
                fill="url(#lab-glass-fill)"
                filter="url(#lab-glass-shadow)"
              />
              <path
                d={`M ${TUBE_LEFT_WATER} ${waterLiquidTop} L ${TUBE_LEFT_WATER} ${TUBE_BASE_Y - 22} Q ${TUBE_LEFT_WATER} ${TUBE_BASE_Y} ${TUBE_CENTER_WATER} ${TUBE_BASE_Y} Q ${TUBE_LEFT_WATER + TUBE_WIDTH} ${TUBE_BASE_Y} ${TUBE_LEFT_WATER + TUBE_WIDTH} ${TUBE_BASE_Y - 22} L ${TUBE_LEFT_WATER + TUBE_WIDTH} ${waterLiquidTop} Z`}
                className="lab-tube-liquid lab-tube-liquid--water"
                fill={acidDroppedInWater ? "url(#lab-liquid-mixed-gradient)" : "url(#lab-water-gradient)"}
              />
              <text x={TUBE_CENTER_WATER} y={TUBE_BASE_Y + 22} textAnchor="middle" className="lab-label">
                {acidDroppedInWater ? "H₂O + CH₃COOH" : "H₂O"}
              </text>
            </g>

            {/* Acid test tube: 90° rotation + translate so mouth sits on water tube center line */}
            <g
              className={`lab-tube-acid-group ${solubilityPhase === "tilting" || solubilityPhase === "pouring" ? "lab-tube-acid-group--pouring" : ""} ${solubilityPhase === "returning" ? "lab-tube-acid-group--returning" : ""}`}
              style={{
                transformOrigin: `${TUBE_CENTER_ACID}px ${TUBE_BASE_Y}px`,
                ...((solubilityPhase === "tilting" || solubilityPhase === "pouring") && {
                  transform: `rotate(90deg) translate(${POUR_TRANSLATE_X}px, ${POUR_TRANSLATE_Y}px)`,
                }),
                ...(solubilityPhase === "returning" && { transform: "translate(0, 0) rotate(0deg)" }),
              }}
            >
              <path
                d={`M ${TUBE_LEFT_X} ${TUBE_MOUTH_Y} L ${TUBE_LEFT_X} ${TUBE_BASE_Y - 22} Q ${TUBE_LEFT_X} ${TUBE_BASE_Y} ${TUBE_CENTER_ACID} ${TUBE_BASE_Y} Q ${TUBE_LEFT_X + TUBE_WIDTH} ${TUBE_BASE_Y} ${TUBE_LEFT_X + TUBE_WIDTH} ${TUBE_BASE_Y - 22} L ${TUBE_LEFT_X + TUBE_WIDTH} ${TUBE_MOUTH_Y} Z`}
                className="lab-tube-body"
                fill="url(#lab-glass-fill)"
                filter="url(#lab-glass-shadow)"
              />
              <path
                d={`M ${TUBE_LEFT_X} ${acidLiquidTop} L ${TUBE_LEFT_X} ${TUBE_BASE_Y - 22} Q ${TUBE_LEFT_X} ${TUBE_BASE_Y} ${TUBE_CENTER_ACID} ${TUBE_BASE_Y} Q ${TUBE_LEFT_X + TUBE_WIDTH} ${TUBE_BASE_Y} ${TUBE_LEFT_X + TUBE_WIDTH} ${TUBE_BASE_Y - 22} L ${TUBE_LEFT_X + TUBE_WIDTH} ${acidLiquidTop} Z`}
                className="lab-tube-liquid lab-tube-liquid--acid"
                fill="url(#lab-liquid-gradient)"
              />
              <text x={TUBE_CENTER_ACID} y={TUBE_BASE_Y + 22} textAnchor="middle" className="lab-label">CH₃COOH</text>
            </g>

            {/* Pour animation: droplets fall straight down from acid mouth to water mouth */}
            {solubilityPhase === "pouring" && (
              <g className="lab-solubility-pour-droplets" style={{ ["--pour-droplet-dy"]: `${POUR_DROPLET_DY}px` }}>
                {Array.from({ length: POUR_DROPLET_COUNT }, (_, i) => (
                  <g
                    key={i}
                    className="lab-pour-droplet"
                    style={{
                      animationDelay: `${i * 0.12}s`,
                      transformOrigin: `${POUR_DROPLET_START_X}px ${POUR_DROPLET_START_Y}px`,
                    }}
                  >
                    <circle
                      cx={POUR_DROPLET_START_X}
                      cy={POUR_DROPLET_START_Y}
                      r="5"
                      fill="url(#lab-liquid-gradient)"
                      className="lab-pour-droplet-circle"
                    />
                  </g>
                ))}
              </g>
            )}
          </g>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* 2. ODOUR TEST: Beaker + waft action                                      */}
        {/* ----------------------------------------------------------------------- */}
        {experimentSelected === EXPERIMENT_TYPES.ODOUR_TEST && (
          <g className="lab-setup lab-setup--odour">
            <rect x="320" y="60" width="260" height="220" rx="8" className="lab-glass" fill="url(#lab-glass-fill)" filter="url(#lab-glass-shadow)" />
            <rect x="320" y="58" width="260" height="6" rx="3" className="lab-glass-rim" fill="url(#lab-glass-rim)" />
            <rect x="332" y="140" width="236" height="140" rx="4" className="lab-liquid" fill="url(#lab-liquid-gradient)" />
            <path d="M 332 140 Q 450 136 568 140" fill="none" stroke="oklch(0.88 0.08 75)" strokeWidth="2" strokeOpacity="0.5" className="lab-meniscus" />
            <text x="450" y="300" textAnchor="middle" className="lab-label">CH₃COOH</text>
            {odourObserved && (
              <g className="lab-odour-vapour">
                <path d="M 400 140 Q 420 100 450 80" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="3" strokeOpacity="0.9" strokeDasharray="4 4" />
                <path d="M 450 130 Q 470 90 500 70" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="3" strokeOpacity="0.9" strokeDasharray="4 4" />
                <path d="M 500 140 Q 520 100 550 85" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="3" strokeOpacity="0.9" strokeDasharray="4 4" />
                <text x="620" y="95" textAnchor="middle" className="lab-label lab-label--small">Pungent odour</text>
              </g>
            )}
          </g>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* 3. LITMUS TEST: Beaker + acid dropper (drag) + litmus paper (drop zone)  */}
        {/* ----------------------------------------------------------------------- */}
        {experimentSelected === EXPERIMENT_TYPES.LITMUS_TEST && (
          <g className="lab-setup lab-setup--litmus">
            <rect x="320" y="60" width="260" height="220" rx="8" className="lab-glass" fill="url(#lab-glass-fill)" filter="url(#lab-glass-shadow)" />
            <rect x="320" y="58" width="260" height="6" rx="3" className="lab-glass-rim" fill="url(#lab-glass-rim)" />
            <rect x="332" y="140" width="236" height="140" rx="4" className="lab-liquid" fill="url(#lab-liquid-gradient)" />
            <path d="M 332 140 Q 450 136 568 140" fill="none" stroke="oklch(0.88 0.08 75)" strokeWidth="2" strokeOpacity="0.5" className="lab-meniscus" />
            <text x="450" y="300" textAnchor="middle" className="lab-label">CH₃COOH</text>
            {/* Acid dropper (left) — realistic glass dropper: bulb, stem, tapered tip */}
            <g className="lab-litmus-dropper">
              {/* Rubber bulb (squeezable) — rounded at top */}
              <ellipse cx="125" cy="102" rx="14" ry="12" className="lab-dropper-bulb" fill="url(#lab-liquid-gradient)" />
              {/* Glass stem — narrow cylinder */}
              <rect x="120" y="114" width="10" height="88" rx="1" className="lab-dropper-stem" fill="url(#lab-glass-fill)" stroke="oklch(0.55 0.02 250)" strokeWidth="1" />
              {/* Tapered capillary tip (like real dropper) */}
              <path d="M 121 202 L 129 202 L 126 218 Z" className="lab-dropper-tip" fill="url(#lab-glass-fill)" stroke="oklch(0.45 0.02 250)" strokeWidth="1" />
              <text x="125" y="238" textAnchor="middle" className="lab-label lab-label--small">Acid</text>
            </g>
            {/* Litmus paper — blue strip; red only at the spot where acid is dropped */}
            <g className="lab-litmus-strip-wrap">
              <rect x="556" y="68" width="52" height="184" rx="8" className="lab-strip" fill="url(#lab-glass-fill)" stroke="oklch(0.55 0.02 250)" strokeWidth="1" />
              <rect x="564" y="88" width="36" height="120" rx="6" className="lab-litmus-blue" />
              {litmusColor === "red" && (
                <ellipse cx="582" cy="132" rx="10" ry="14" className="lab-litmus-red-spot" />
              )}
            </g>
            <text x="582" y="268" textAnchor="middle" className="lab-label">Litmus paper</text>
          </g>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* 3. BICARBONATE: Acetic acid pours INTO beaker containing NaHCO₃         */}
        {/* ----------------------------------------------------------------------- */}
        {experimentSelected === EXPERIMENT_TYPES.BICARBONATE_REACTION && (
          <>
            <g className={`lab-beaker lab-beaker--source ${isPouring ? "lab-beaker--tilted" : ""}`}>
              <rect x="100" y="50" width="100" height="200" rx="8" className="lab-glass lab-beaker__body" fill="url(#lab-glass-fill)" filter="url(#lab-glass-shadow)" />
              <rect x="100" y="48" width="100" height="6" rx="3" className="lab-glass-rim" fill="url(#lab-glass-rim)" />
              <rect x="108" y="110" width="84" height="140" rx="4" className="lab-liquid lab-liquid--source" />
              <text x="150" y="275" textAnchor="middle" className="lab-label">CH₃COOH</text>
              <text x="150" y="292" textAnchor="middle" className="lab-label lab-label--small">Acetic acid</text>
            </g>
            <g className={`lab-pour-group ${isPouring ? "lab-pour-group--active" : ""}`}>
              <path d="M 420 28 Q 465 100 465 195" fill="none" stroke="url(#lab-stream-gradient)" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" className="lab-stream lab-stream--path" />
              <path d="M 420 28 Q 465 100 465 195" fill="none" stroke="url(#lab-stream-gradient)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" className="lab-stream lab-stream--inner" />
              <circle r="5" fill="url(#lab-stream-gradient)" className="lab-droplet lab-droplet--1" />
              <circle r="4" fill="url(#lab-stream-gradient)" className="lab-droplet lab-droplet--2" />
              <circle r="5" fill="url(#lab-stream-gradient)" className="lab-droplet lab-droplet--3" />
              <circle r="4" fill="url(#lab-stream-gradient)" className="lab-droplet lab-droplet--4" />
            </g>
            <g className="lab-beaker lab-beaker--dest">
              <rect x="380" y="40" width="180" height="230" rx="8" className="lab-glass lab-beaker__body" fill="url(#lab-glass-fill)" filter="url(#lab-glass-shadow)" />
              <rect x="380" y="38" width="180" height="6" rx="3" className="lab-glass-rim" fill="url(#lab-glass-rim)" />
              <g clipPath="url(#lab-dest-beaker-clip)">
                <rect x="390" y="250" width="160" height="20" rx="4" className={`lab-liquid lab-liquid--dest ${isPouring ? "lab-liquid--dest-filling" : ""}`} />
              </g>
              {showBubbles && bubbles.map((b) => (
                <circle key={b.key} cx={390 + b.x} cy={260} r={b.r} className={`lab-bubble ${b.delayClass} ${b.durClass}`} fill="url(#lab-bubble-gradient)" />
              ))}
              <text x="470" y="278" textAnchor="middle" className="lab-label">NaHCO₃</text>
              <text x="470" y="295" textAnchor="middle" className="lab-label lab-label--small">(sodium bicarbonate)</text>
            </g>
          </>
        )}

        {/* No experiment selected: show placeholder */}
        {/* {!experimentSelected && (
          <g className="lab-setup lab-setup--placeholder">
            <rect x="350" y="120" width="200" height="160" rx="8" className="lab-glass" fill="url(#lab-glass-fill)" filter="url(#lab-glass-shadow)" />
            <text x="450" y="310" textAnchor="middle" className="lab-label">Select an experiment from the menu (☰)</text>
          </g>
        )} */}
      </svg>

      {/* Invisible draggable exactly over acid test tube; invisible drop zone exactly above water tube mouth */}
      {experimentSelected === EXPERIMENT_TYPES.SOLUBILITY_IN_WATER && !acidDroppedInWater && !isRunning && (
        <div className="lab-solubility-overlay" aria-hidden>
          <div
            className="lab-solubility-draggable-tube"
            style={{
              left: `${ACID_TUBE_LEFT_PCT}%`,
              top: `${ACID_TUBE_TOP_PCT}%`,
              width: `${ACID_TUBE_WIDTH_PCT}%`,
              height: `${ACID_TUBE_HEIGHT_PCT}%`,
            }}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", "acetic-acid")
              e.dataTransfer.effectAllowed = "move"
            }}
            title="Drag acid test tube"
          />
          <div
            className="lab-solubility-drop-zone"
            style={{
              left: `${WATER_MOUTH_LEFT_PCT}%`,
              top: `${WATER_MOUTH_TOP_PCT}%`,
              width: `${WATER_MOUTH_WIDTH_PCT}%`,
              height: `${WATER_MOUTH_HEIGHT_PCT}%`,
            }}
            onDragOver={handleDragOver}
            onDrop={(e) => {
              e.preventDefault()
              if (e.dataTransfer.getData("text/plain") === "acetic-acid") handleDropOnWater()
            }}
            title="Drop above water tube"
          />
        </div>
      )}

      {/* Litmus: drag acid dropper onto litmus paper; drop zone receives drop and turns litmus red */}
      {experimentSelected === EXPERIMENT_TYPES.LITMUS_TEST && (litmusColor === "blue" || !litmusColor) && labPhase !== "complete" && (
        <div className="lab-litmus-overlay" aria-hidden>
          {/* Draggable dropper: positioned over SVG dropper with some padding for easier grabbing */}
          <div
            className="lab-litmus-draggable-dropper"
            style={{
              left: `${((111 - 5) / VIEWBOX_W) * 100}%`,
              top: `${((90 - 5) / VIEWBOX_H) * 100}%`,
              width: `${((28 + 10) / VIEWBOX_W) * 100}%`,
              height: `${((148 + 10) / VIEWBOX_H) * 100}%`,
            }}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", "acid-dropper")
              e.dataTransfer.effectAllowed = "move"
              e.dataTransfer.dropEffect = "move"
            }}
            onDragEnd={(e) => {
              // Reset if dropped outside valid zone
              if (e.dataTransfer.dropEffect === "none") {
                // Drag was cancelled or dropped outside
              }
            }}
            title="Drag acid dropper onto the litmus paper"
          />
          {/* Drop zone: over litmus paper (slightly larger for easier drop) */}
          <div
            className="lab-litmus-drop-zone"
            style={{
              left: `${(540 / VIEWBOX_W) * 100}%`,
              top: `${(60 / VIEWBOX_H) * 100}%`,
              width: `${(80 / VIEWBOX_W) * 100}%`,
              height: `${(200 / VIEWBOX_H) * 100}%`,
            }}
            onDragEnter={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            onDragOver={(e) => {
              e.preventDefault()
              e.stopPropagation()
              e.dataTransfer.dropEffect = "move"
            }}
            onDrop={(e) => {
              e.preventDefault()
              e.stopPropagation()
              const data = e.dataTransfer.getData("text/plain")
              if (data === "acid-dropper") {
                handleDropOnLitmus()
              }
            }}
            title="Drop acid dropper here"
          />
        </div>
      )}

      {/* Waft button for odour test */}
      {experimentSelected === EXPERIMENT_TYPES.ODOUR_TEST && !odourObserved && !isRunning && (
        <div className="lab-odour-waft-wrap">
          <button type="button" className="lab-waft-btn" onClick={handleWaftClick}>
            Waft to smell
          </button>
        </div>
      )}
      </div>
    </div>
  )
}
