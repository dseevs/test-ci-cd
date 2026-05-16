import React, { useState, useCallback, useRef, useEffect } from 'react'
import { gsap } from 'gsap'
import { useStore, EXPERIMENT_TYPES } from '@/store/useStore'
import styles from './MainLabSvg.css'

// Pour animation: pivot at bottom-center of water-tube group.
const WATER_TUBE_TRANSFORM_ORIGIN = '50% 100%'
const POUR_ROTATION = -90  // 90° tilt (horizontal)
const WATER_TUBE_SHAKE_ROTATION = 0
const WATER_TUBE_SHAKE_X = 0
const WATER_TUBE_SHAKE_DURATION = 0.045
const WATER_TUBE_SHAKE_REPEAT = 0

// Tube geometry: path starts at (1256.89, 607.72), width 69.72, height ~227.85
// IMPORTANT: Based on visual highlight, the ACTUAL MOUTH OPENING is at y=400 (not y=607.72)
// The y=607.72 was the WATER LEVEL inside the tube, NOT the mouth opening
// Mouth opening center at REST: (1291.75, 400) - THIS IS WHERE WATER FLOWS FROM
// Water level starts at: y=700 (below the mouth opening)
// Bottom center: (1291.75, 835.57)
// Transform origin is at bottom center (50% 100%) of the group
const TUBE_INITIAL_BOTTOM_X = 1291.75  // Center X of tube path
const TUBE_INITIAL_BOTTOM_Y = 835.57   // Bottom Y
const TUBE_HEIGHT = 227.85  // Actual height from bottom to top
const TUBE_MOUTH_Y_AT_REST = 410  // ACTUAL Mouth opening Y (shifted slightly down) - water flows from HERE
const WATER_LEVEL_Y_AT_REST = 700  // Water level Y coordinate (below mouth opening)
const MOUTH_TO_WATER_LEVEL_DISTANCE = WATER_LEVEL_Y_AT_REST - TUBE_MOUTH_Y_AT_REST  // distance from mouth to water level

// Pivot: rightwards shift; y raised so tube mouth sits above acetic opening.
const ACETIC_OPENING_X = 734  // Acetic acid tube opening X coordinate
const RIGHTWARD_SHIFT = 250
const ABOVE_ACETIC_Y = 300  // extra upward so mouth is above acetic opening
const POUR_OFFSET_X = (ACETIC_OPENING_X - 1291.75) + RIGHTWARD_SHIFT  // ~ -307.75
// Use ACTUAL mouth opening Y (400) instead of water level Y (607.72)
const POUR_OFFSET_Y = (TUBE_MOUTH_Y_AT_REST - TUBE_INITIAL_BOTTOM_Y) - ABOVE_ACETIC_Y   // (400 - 835.57) - 300 = -735.57

// Flow start coordinates calculated from lines 21-23
// IMPORTANT: Water flows from the ACTUAL MOUTH OPENING (y=400 at rest), NOT from water level (y=620)
// The highlight shows mouth opening at y=400, NOT y=607.72 (which was the water level)
// When tube reaches pour position, calculate mouth opening position from TUBE_MOUTH_Y_AT_REST = 400
// Shift X coordinate 3 points towards negative X axis (left)
const FLOW_START_X = ACETIC_OPENING_X + RIGHTWARD_SHIFT - 3  // 734 + 250 - 3 = 981
// Calculate flow start Y: ACTUAL mouth opening at rest (400) minus ABOVE_ACETIC_Y offset
const FLOW_START_Y = TUBE_MOUTH_Y_AT_REST - ABOVE_ACETIC_Y  // 400 - 300 = 100

// Stream path constants (match setStreamPathD)
const STREAM_END_X = 506
const STREAM_CY = 660
// Shift pouring start point straight down (SVG Y increases downward). Only affects stream/droplet start.
const POUR_START_Y_OFFSET = 100
// Shift pouring start point left (SVG: negative X = left).
const POUR_START_X_OFFSET = -50

// Calculate tube mouth world position based on transform (x, y, rotation in degrees)
// IMPORTANT: This calculates the ACTUAL MOUTH OPENING (y=400 at rest), NOT the water level (y=620)
// The earlier y=607.72 was the WATER LEVEL, NOT the mouth opening
// Water ALWAYS flows from the MOUTH OPENING, regardless of water level
// Transform origin is at bottom center (50% 100%)
function getTubeMouthPosition (x, y, rotation) {
  const R = (rotation * Math.PI) / 180  // Convert to radians
  // Mouth opening is at (0, -MOUTH_TO_BOTTOM_DISTANCE) relative to bottom center (transform origin)
  // At rest: ACTUAL mouth Y = TUBE_MOUTH_Y_AT_REST (shifted slightly down)
  // Distance from bottom to ACTUAL mouth opening
  const MOUTH_TO_BOTTOM_DISTANCE = TUBE_INITIAL_BOTTOM_Y - TUBE_MOUTH_Y_AT_REST
  // After rotation R: GSAP rotation positive = clockwise
  // For rotation R (radians), point (0, -h) rotates to:
  const localMouthX = MOUTH_TO_BOTTOM_DISTANCE * Math.sin(R)  // sin(R) for clockwise rotation
  const localMouthY = -MOUTH_TO_BOTTOM_DISTANCE * Math.cos(R)  // -cos(R) for upward direction
  // World position = initial bottom center + transform offset + rotated mouth offset
  const worldX = TUBE_INITIAL_BOTTOM_X + x + localMouthX
  const worldY = TUBE_INITIAL_BOTTOM_Y + y + localMouthY
  // Returns ACTUAL mouth opening coordinates (y=400 at rest, NOT water level y=620)
  return { x: worldX, y: worldY }
}

// Get point on quadratic Bezier at t in [0,1]: P0=(startX,startY), P1=(cx,cy), P2=(endX,endY)
function getStreamPathPoint (startX, startY, t) {
  const endX = STREAM_END_X
  const endY = 618  // Acetic opening y
  const cx = (startX + endX) / 2
  const cy = (startY + endY) / 2 + 42  // Control point slightly below midpoint for arc
  const x = (1 - t) ** 2 * startX + 2 * (1 - t) * t * cx + t * t * endX
  const y = (1 - t) ** 2 * startY + 2 * (1 - t) * t * cy + t * t * endY
  return { x, y }
}

const MICRO_DROPLET_COUNT = 4

const SVG = () => {
  const [pathAnimating, setPathAnimating] = useState(false)
  const [aceticTouchEnabled, setAceticTouchEnabled] = useState(false)
  const [waterTouchEnabled, setWaterTouchEnabled] = useState(true)
  const [aceticFocusMode, setAceticFocusMode] = useState(false)
  const waterTubeRef = useRef(null)
  const aceticTubeRef = useRef(null)
  const aceticStandRef = useRef(null)
  const waterClipRef = useRef(null)
  const aceticClipRef = useRef(null)
  const pourStreamRef = useRef(null)
  const streamCoreRef = useRef(null)
  const streamInnerL = useRef(null)
  const streamInnerR = useRef(null)
  const streamOuterL = useRef(null)
  const streamOuterR = useRef(null)
  const microDropletsRef = useRef(null)
  const landingGlowRef = useRef(null)
  const splashGroupRef = useRef(null)
  const hasPouredRef = useRef(false)
  const hasAceticFocusedRef = useRef(false)
  const pourTlRef = useRef(null)
  const svgRef = useRef(null)
  const isDraggingWaterRef = useRef(false)
  const dragStartSVGRef = useRef({ x: 0, y: 0 })

  const POUR_STRENGTH = 1.0
  const STREAM_BASE_WIDTH = 3 + (14 - 3) * POUR_STRENGTH

  const buildOffsetPath = useCallback((startX, startY, offsetPx, wobbleAmp = 0) => {
    const endX = STREAM_END_X
    const endY = 618
    const STEPS = 24
    const points = []
    for (let i = 0; i <= STEPS; i++) {
      const t = i / STEPS
      const cx = (startX + endX) / 2
      const cy = (startY + endY) / 2 + 42
      const bx = (1 - t) ** 2 * startX + 2 * (1 - t) * t * cx + t * t * endX
      const by = (1 - t) ** 2 * startY + 2 * (1 - t) * t * cy + t * t * endY
      const dx = 2 * (1 - t) * (cx - startX) + 2 * t * (endX - cx)
      const dy = 2 * (1 - t) * (cy - startY) + 2 * t * (endY - cy)
      const len = Math.sqrt(dx * dx + dy * dy) || 1
      const nx = -dy / len
      const ny = dx / len
      const taper = 1 - t * 0.28
      const wobble = wobbleAmp > 0 ? Math.sin(t * Math.PI * 6) * wobbleAmp : 0
      const totalOffset = (offsetPx + wobble) * taper
      points.push({ x: bx + nx * totalOffset, y: by + ny * totalOffset })
    }
    if (points.length < 2) return ''
    let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x.toFixed(2)} ${points[i].y.toFixed(2)}`
    }
    return d
  }, [])

  const setStreamPathD = useCallback((startX, startY = 618) => {
    const W = STREAM_BASE_WIDTH
    const core = buildOffsetPath(startX, startY, 0, 0)
    if (streamCoreRef.current) {
      streamCoreRef.current.setAttribute('d', core)
      streamCoreRef.current.setAttribute('stroke-width', String(W))
    }
    const iOff = 4.5
    if (streamInnerL.current) {
      streamInnerL.current.setAttribute('d', buildOffsetPath(startX, startY, -iOff, 0))
      streamInnerL.current.setAttribute('stroke-width', String(W * 0.50))
    }
    if (streamInnerR.current) {
      streamInnerR.current.setAttribute('d', buildOffsetPath(startX, startY, iOff, 0))
      streamInnerR.current.setAttribute('stroke-width', String(W * 0.50))
    }
    const oOff = 8
    if (streamOuterL.current) {
      streamOuterL.current.setAttribute('d', buildOffsetPath(startX, startY, -oOff, 0.8))
      streamOuterL.current.setAttribute('stroke-width', String(W * 0.22))
    }
    if (streamOuterR.current) {
      streamOuterR.current.setAttribute('d', buildOffsetPath(startX, startY, oOff, 0.8))
      streamOuterR.current.setAttribute('stroke-width', String(W * 0.22))
    }
    if (landingGlowRef.current) {
      const endX = STREAM_END_X
      landingGlowRef.current.setAttribute('cx', String(endX))
      landingGlowRef.current.setAttribute('cy', '618')
    }
    if (microDropletsRef.current && POUR_STRENGTH > 0.4) {
      const circles = microDropletsRef.current.querySelectorAll('circle')
      circles.forEach((c, i) => {
        const t = 0.2 + Math.random() * 0.6
        const pt = getStreamPathPoint(startX, startY, t)
        const spread = (Math.random() - 0.5) * 4
        c.setAttribute('cx', String(pt.x + spread))
        c.setAttribute('cy', String(pt.y + spread))
      })
    }
  }, [buildOffsetPath])

  const handlePathClick = useCallback(() => {
    setPathAnimating(false)
    requestAnimationFrame(() => setPathAnimating(true))
  }, [])

  const handlePathAnimationEnd = useCallback(() => {
    setPathAnimating(false)
  }, [])

  const handlePathKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handlePathClick()
    }
  }, [handlePathClick])

  const handleWaterTubeClick = useCallback((startX = 0, startY = 0) => {
    const el = waterTubeRef.current
    const waterClip = waterClipRef.current
    const aceticClip = aceticClipRef.current
    const streamEl = pourStreamRef.current
    const alreadyPoured = hasPouredRef.current
    if (!el || pourTlRef.current?.isActive() || !waterTouchEnabled) return
    if (aceticFocusMode) return
    if (alreadyPoured) return

    // Compute move duration proportional to remaining distance from drop position
    const remainX = POUR_OFFSET_X - startX
    const remainY = POUR_OFFSET_Y - startY
    const totalDist = Math.sqrt(POUR_OFFSET_X * POUR_OFFSET_X + POUR_OFFSET_Y * POUR_OFFSET_Y)
    const remainDist = Math.sqrt(remainX * remainX + remainY * remainY)
    const fraction = Math.max(0.15, remainDist / totalDist)
    const moveDuration = 0.85 * fraction
    const fallDur = 0.8
    const fillDur = 1.0
    const pourEndTime = moveDuration + fallDur + fillDur

    pourTlRef.current = gsap.timeline({
      onComplete: () => {
        hasPouredRef.current = true
        setAceticTouchEnabled(true)
        setWaterTouchEnabled(false)
        pourTlRef.current = null
      }
    })

    // Start proxy from the DROPPED position, not origin
    const tubeTransformProxy = { x: startX, y: startY, rotation: 0 }
    const streamStartProxy = { x: 0, y: 0 }

    const initialMouth = getTubeMouthPosition(startX, startY, 0)
    streamStartProxy.x = initialMouth.x + POUR_START_X_OFFSET
    streamStartProxy.y = initialMouth.y + POUR_START_Y_OFFSET

    if (streamEl) {
      setStreamPathD(streamStartProxy.x, streamStartProxy.y)
    }

    // Animate from dropped position → pour position (duration scales with distance)
    pourTlRef.current
      .set(el, { transformOrigin: WATER_TUBE_TRANSFORM_ORIGIN })
      .to(tubeTransformProxy, {
        x: POUR_OFFSET_X,
        y: POUR_OFFSET_Y,
        rotation: POUR_ROTATION,
        duration: moveDuration,
        ease: 'power2.inOut',
        onUpdate: () => {
          gsap.set(el, {
            x: tubeTransformProxy.x,
            y: tubeTransformProxy.y,
            rotation: tubeTransformProxy.rotation
          })
          if (streamEl) {
            const mouth = getTubeMouthPosition(tubeTransformProxy.x, tubeTransformProxy.y, tubeTransformProxy.rotation)
            streamStartProxy.x = mouth.x + POUR_START_X_OFFSET
            streamStartProxy.y = mouth.y + POUR_START_Y_OFFSET
            setStreamPathD(streamStartProxy.x, streamStartProxy.y)
          }
        }
      })
      // Shake slightly while pouring (increase wobble here)
      .to(tubeTransformProxy, {
        x: `+=${WATER_TUBE_SHAKE_X}`,
        rotation: `+=${WATER_TUBE_SHAKE_ROTATION}`,
        duration: WATER_TUBE_SHAKE_DURATION,
        repeat: WATER_TUBE_SHAKE_REPEAT,
        yoyo: true,
        ease: 'sine.inOut',
        onUpdate: () => {
          gsap.set(el, {
            x: tubeTransformProxy.x,
            y: tubeTransformProxy.y,
            rotation: tubeTransformProxy.rotation
          })
          if (streamEl) {
            const mouth = getTubeMouthPosition(tubeTransformProxy.x, tubeTransformProxy.y, tubeTransformProxy.rotation)
            streamStartProxy.x = mouth.x + POUR_START_X_OFFSET
            streamStartProxy.y = mouth.y + POUR_START_Y_OFFSET
            setStreamPathD(streamStartProxy.x, streamStartProxy.y)
          }
        }
      }, moveDuration)
      // Return to rest after pouring — starts exactly when fill completes
      .to(tubeTransformProxy, {
        x: 0,
        y: 0,
        rotation: 0,
        duration: 0.8,
        ease: 'back.out(1.2)',
        onUpdate: () => {
          gsap.set(el, {
            x: tubeTransformProxy.x,
            y: tubeTransformProxy.y,
            rotation: tubeTransformProxy.rotation
          })
        }
      }, pourEndTime)

    if (streamEl) {
      const actualMouthPosition = getTubeMouthPosition(POUR_OFFSET_X, POUR_OFFSET_Y, POUR_ROTATION)
      const landTime = moveDuration + fallDur

      pourTlRef.current.call(() => {
        setStreamPathD(actualMouthPosition.x + POUR_START_X_OFFSET, actualMouthPosition.y + POUR_START_Y_OFFSET)
        streamStartProxy.x = actualMouthPosition.x + POUR_START_X_OFFSET
        streamStartProxy.y = actualMouthPosition.y + POUR_START_Y_OFFSET
      }, null, moveDuration)

      pourTlRef.current.set(streamEl, { opacity: 0 }, 0)

      const layerConfigs = [
        { ref: streamCoreRef, targetOpacity: 0.70, delay: 0 },
        { ref: streamInnerL, targetOpacity: 0.40, delay: 0.02 },
        { ref: streamInnerR, targetOpacity: 0.40, delay: 0.02 },
        { ref: streamOuterL, targetOpacity: 0.15, delay: 0.04 },
        { ref: streamOuterR, targetOpacity: 0.15, delay: 0.04 },
      ]

      layerConfigs.forEach(({ ref }) => {
        if (ref.current) {
          pourTlRef.current.set(ref.current, { opacity: 0, strokeDasharray: 'none', strokeDashoffset: 0 }, 0)
        }
      })
      if (landingGlowRef.current) pourTlRef.current.set(landingGlowRef.current, { opacity: 0 }, 0)
      if (microDropletsRef.current) {
        microDropletsRef.current.querySelectorAll('circle').forEach(c => {
          pourTlRef.current.set(c, { opacity: 0 }, 0)
        })
      }

      pourTlRef.current.to(streamEl, { opacity: 1, duration: 0.06, ease: 'none' }, moveDuration)

      pourTlRef.current.call(() => {
        layerConfigs.forEach(({ ref }) => {
          const el = ref.current
          if (!el) return
          const len = el.getTotalLength()
          gsap.set(el, { strokeDasharray: len, strokeDashoffset: len })
        })
      }, null, moveDuration)

      layerConfigs.forEach(({ ref, targetOpacity, delay }) => {
        const el = ref.current
        if (!el) return
        pourTlRef.current.to(el, { opacity: targetOpacity, duration: 0.1, ease: 'power2.out' }, moveDuration + delay)
        pourTlRef.current.to(el, {
          strokeDashoffset: 0,
          duration: fallDur,
          ease: 'power2.in',
        }, moveDuration + delay)
      })

      const splashTime = landTime - 0.05

      if (landingGlowRef.current) {
        pourTlRef.current.to(landingGlowRef.current, { opacity: 0.9, duration: 0.15, ease: 'power2.out' }, splashTime)
        pourTlRef.current.to(landingGlowRef.current, { opacity: 0, duration: 0.5, ease: 'power2.in' }, splashTime + 0.3)
      }

      if (splashGroupRef.current) {
        const splashCircles = splashGroupRef.current.querySelectorAll('circle')
        splashCircles.forEach((c) => {
          const angle = parseFloat(c.dataset.angle)
          const dist = parseFloat(c.dataset.dist)
          const targetX = STREAM_END_X + Math.cos(angle) * dist
          const targetY = 618 + Math.sin(angle) * dist * 0.45
          pourTlRef.current.set(c, { attr: { cx: STREAM_END_X, cy: 618 }, opacity: 0 }, 0)
          pourTlRef.current.to(c, { opacity: 0.75, duration: 0.08, ease: 'power2.out' }, splashTime)
          pourTlRef.current.to(c, {
            attr: { cx: targetX, cy: targetY },
            duration: 0.4,
            ease: 'power2.out',
          }, splashTime)
          pourTlRef.current.to(c, { opacity: 0, duration: 0.3, ease: 'power2.in' }, splashTime + 0.25)
        })
      }

      if (microDropletsRef.current && POUR_STRENGTH > 0.4) {
        const drops = microDropletsRef.current.querySelectorAll('circle')
        drops.forEach((c, i) => {
          const delay = moveDuration + fallDur * 0.35 + i * 0.12
          pourTlRef.current.to(c, { opacity: 0.65, duration: 0.15, ease: 'power2.out' }, delay)
          pourTlRef.current.to(c, { opacity: 0, duration: 0.3, ease: 'power2.in' }, delay + 0.3)
        })
      }

      if (waterClip) {
        pourTlRef.current.to(waterClip, { attr: { y: 870, height: 0 }, duration: pourEndTime - moveDuration, ease: 'power2.inOut' }, moveDuration)
      }
      if (aceticClip) {
        pourTlRef.current.to(aceticClip, { attr: { y: 560, height: 316 }, duration: fillDur, ease: 'power2.out' }, landTime)
      }

      pourTlRef.current.to(streamEl, { opacity: 0, duration: 0.2, ease: 'power2.in' }, pourEndTime - 0.1)
    }
  }, [aceticFocusMode, waterTouchEnabled, setStreamPathD])

  const handleAceticTubeClick = useCallback(() => {
    const el = aceticTubeRef.current
    if (!el || pourTlRef.current?.isActive() || !aceticTouchEnabled) return

    // Move left test tube (x≈471..541 midpoint ≈ 506) to canvas center (x≈960)
    const moveToCenterX = 454
    const moveToCenterY = -40

    pourTlRef.current = gsap.timeline({
      onComplete: () => {
        pourTlRef.current = null
      }
    })

    if (!hasAceticFocusedRef.current) {
      hasAceticFocusedRef.current = true
      // Hide the stand immediately (no render lag), then keep state as source of truth.
      if (aceticStandRef.current) aceticStandRef.current.style.display = 'none'
      setAceticFocusMode(true)
      pourTlRef.current
        // Shake around the TOP of the acetic tube so top stays fixed and bottom moves.
        .set(el, { transformOrigin: '50% 0%' })
        .to(el, { x: moveToCenterX, y: moveToCenterY, duration: 0.75, ease: 'power2.inOut' })
        .to(el, {
          rotation: 8,
          duration: 0.12,
          repeat: 15,
          yoyo: true,
          ease: 'sine.inOut'
        })
        .set(el, { rotation: 0 })
        .call(() => {
          setAceticTouchEnabled(false)
          useStore.getState().unlockActivityObservation(EXPERIMENT_TYPES.SOLUBILITY_IN_WATER)
        })
      return
    }
  }, [aceticTouchEnabled])

  // --- Drag-and-drop for water tube (replaces click-to-pour) ---
  const screenToSVG = useCallback((clientX, clientY) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return { x: 0, y: 0 }
    const p = pt.matrixTransform(ctm.inverse())
    return { x: p.x, y: p.y }
  }, [])

  const onWaterDragStart = useCallback((e) => {
    if (!waterTouchEnabled || hasPouredRef.current || pourTlRef.current?.isActive() || aceticFocusMode) return
    e.preventDefault()
    isDraggingWaterRef.current = true
    const cx = e.touches ? e.touches[0].clientX : e.clientX
    const cy = e.touches ? e.touches[0].clientY : e.clientY
    dragStartSVGRef.current = screenToSVG(cx, cy)
  }, [waterTouchEnabled, aceticFocusMode, screenToSVG])

  useEffect(() => {
    const onMove = (e) => {
      if (!isDraggingWaterRef.current) return
      e.preventDefault()
      const el = waterTubeRef.current
      if (!el) return
      const cx = e.touches ? e.touches[0].clientX : e.clientX
      const cy = e.touches ? e.touches[0].clientY : e.clientY
      const pt = screenToSVG(cx, cy)
      gsap.set(el, {
        x: pt.x - dragStartSVGRef.current.x,
        y: pt.y - dragStartSVGRef.current.y
      })
    }
    const onEnd = () => {
      if (!isDraggingWaterRef.current) return
      isDraggingWaterRef.current = false
      const el = waterTubeRef.current
      if (!el) return
      const x = parseFloat(gsap.getProperty(el, 'x')) || 0
      const y = parseFloat(gsap.getProperty(el, 'y')) || 0
      const dist = Math.sqrt(x * x + y * y)
      if (dist > 100) {
        // Pour spontaneously from the dropped position
        handleWaterTubeClick(x, y)
      } else {
        gsap.to(el, { x: 0, y: 0, duration: 0.3, ease: 'power2.out' })
      }
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onEnd)
    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend', onEnd)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onEnd)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
    }
  }, [screenToSVG, handleWaterTubeClick])

  return (
    <div className="lab-svg-viewport relative h-full w-full min-h-0 min-w-0">
<svg
  ref={svgRef}
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 1920 1080"
  preserveAspectRatio="xMidYMid meet"
  className="lab-svg-viewport__svg"
>
  <defs>
   
    <linearGradient id="linear-gradient" x1="960.94" y1="20.53" x2="963.59" y2="835.52" gradientUnits="userSpaceOnUse">
      <stop offset="0" stopColor="#6f5c34"/>
      <stop offset="1" stopColor="#9e8f48"/>
    </linearGradient>
    <linearGradient id="linear-gradient-2" x1="630.31" y1="599.87" x2="631.08" y2="687.7" gradientUnits="userSpaceOnUse">
      <stop offset=".03" stopColor="#9c6144"/>
      <stop offset=".46" stopColor="#9c6144"/>
      <stop offset=".53" stopColor="#915a3f"/>
      <stop offset=".65" stopColor="#754833"/>
      <stop offset=".68" stopColor="#6c432f"/>
      <stop offset=".98" stopColor="#653f2c"/>
    </linearGradient>
    <linearGradient id="linear-gradient-3" x1="319.82" y1="644.01" x2="936.93" y2="648.9" gradientUnits="userSpaceOnUse">
      <stop offset=".01" stopColor="#a8694a"/>
      <stop offset=".04" stopColor="#a56748"/>
      <stop offset=".2" stopColor="#9e6245"/>
      <stop offset=".54" stopColor="#9c6144"/>
      <stop offset=".8" stopColor="#9f6345"/>
      <stop offset="1" stopColor="#a8694a"/>
    </linearGradient>
    <linearGradient id="linear-gradient-4" x1="630.31" y1="736.48" x2="631.08" y2="824.31" xlinkHref="#linear-gradient-2"/>
    <linearGradient id="linear-gradient-5" x1="319.82" y1="780.62" x2="936.93" y2="785.5" xlinkHref="#linear-gradient-3"/>
    <linearGradient id="linear-gradient-6" x1="630.61" y1="848.16" x2="630.97" y2="889.97" xlinkHref="#linear-gradient-2"/>
    <linearGradient id="linear-gradient-7" x1="319.83" y1="869.12" x2="936.93" y2="874.01" xlinkHref="#linear-gradient-3"/>
    <linearGradient id="linear-gradient-8" x1="2108.82" y1="650.59" x2="2110" y2="784.56" gradientTransform="translate(1694.6 -1350.48) rotate(90)" xlinkHref="#linear-gradient-2"/>
    <linearGradient id="linear-gradient-9" x1="1968.73" y1="718.02" x2="2248.4" y2="720.24" gradientTransform="translate(1694.6 -1350.48) rotate(90)" xlinkHref="#linear-gradient-3"/>
    <linearGradient id="linear-gradient-10" x1="2108.82" y1="1266.03" x2="2110" y2="1400" gradientTransform="translate(1694.6 -1350.48) rotate(90)" xlinkHref="#linear-gradient-2"/>
    <linearGradient id="linear-gradient-11" x1="1968.73" y1="1333.45" x2="2248.4" y2="1335.67" gradientTransform="translate(1694.6 -1350.48) rotate(90)" xlinkHref="#linear-gradient-3"/>
    <linearGradient id="linear-gradient-12" x1="1416.11" x2="1416.88" xlinkHref="#linear-gradient-2"/>
    <linearGradient id="linear-gradient-13" x1="1105.63" x2="1722.74" xlinkHref="#linear-gradient-3"/>
    <linearGradient id="linear-gradient-14" x1="1416.11" y1="736.48" x2="1416.88" y2="824.31" xlinkHref="#linear-gradient-2"/>
    <linearGradient id="linear-gradient-15" x1="1105.63" y1="780.62" x2="1722.74" y2="785.5" xlinkHref="#linear-gradient-3"/>
    <linearGradient id="linear-gradient-16" x1="1416.41" y1="848.16" x2="1416.78" y2="889.97" xlinkHref="#linear-gradient-2"/>
    <linearGradient id="linear-gradient-17" x1="1105.63" y1="869.12" x2="1722.73" y2="874.01" xlinkHref="#linear-gradient-3"/>
    <linearGradient id="linear-gradient-18" x1="2108.82" y1="-135.21" x2="2110" y2="-1.25" gradientTransform="translate(1694.6 -1350.48) rotate(90)" xlinkHref="#linear-gradient-2"/>
    <linearGradient id="linear-gradient-19" x1="1968.73" y1="-67.78" x2="2248.4" y2="-65.57" gradientTransform="translate(1694.6 -1350.48) rotate(90)" xlinkHref="#linear-gradient-3"/>
    <linearGradient id="linear-gradient-20" x1="2108.82" y1="480.23" x2="2110" y2="614.19" gradientTransform="translate(1694.6 -1350.48) rotate(90)" xlinkHref="#linear-gradient-2"/>
    <linearGradient id="linear-gradient-21" x1="1968.73" y1="547.65" x2="2248.4" y2="549.87" gradientTransform="translate(1694.6 -1350.48) rotate(90)" xlinkHref="#linear-gradient-3"/>
    <clipPath id="water-liquid-clip">
      <rect ref={waterClipRef} id="water-clip-rect" x="1257" y="700" width="70" height="170" />
    </clipPath>
    <clipPath id="acetic-liquid-clip">
      <rect ref={aceticClipRef} id="acetic-clip-rect" x="471" y="700" width="70" height="176" />
    </clipPath>
  </defs>
  <g className="abc-239">
    <g id="Layer_3" data-name="Layer 3">
      <g id="Layer_2" data-name="Layer 2">
        <rect className="abc-193" y="820.71" width="1925.81" height="259.29"/>
        <rect className="abc-429" y=".44" width="1924.48" height="838.82"/>
      </g>
    </g>
    ////water test tube////
    <g
      id="Layer_4"
      data-name="Layer 4"
      ref={aceticTubeRef}
      onClick={handleAceticTubeClick}
      onTouchEnd={(e) => { e.preventDefault(); handleAceticTubeClick() }}
      onMouseDown={(e) => e.preventDefault()}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleAceticTubeClick() } }}
      role="button"
      tabIndex={0}
      style={{
        cursor: aceticTouchEnabled ? 'pointer' : 'default',
        outline: 'none',
        pointerEvents: aceticTouchEnabled ? 'auto' : 'none'
      }}
      aria-label="Touch acetic acid test tube"
    >
      <rect x="450" y="398" width="110" height="480" fill="#000" fillOpacity="0" style={{ pointerEvents: 'all' }} />
      <g>
        <g>
          <g className="abc-107">
            <image width="54" height="12" transform="translate(452 401)" xlinkHref="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADYAAAAMCAYAAAAppE4WAAAACXBIWXMAAAsSAAALEgHS3X78AAAELklEQVRIidWVW4scVRDHf3VuPT072Z1Zc3MjJqKBROIV8hF90YjgXREUv4AgiIIv6lv8AKIkgcQkrKzZ3ezsTE/P9DmnfOjeayJEX8SCQ5+uPlTXv+pf/yM8gX32xZc6q+dMJlMejndx1iIiOGdBQQRijMQm4pyjKHr0yh4+BIKzADhnyaqcGAzw3hFCsR9nMpmwWDSoQs6JlBLQ7gFUH5/Xo+4DjwN4/6NPVUQQYxFjQAxXrlzm0vPPsbn9kF9+u8Hm1jbj6Yxn1s5x9/49Xnv1JUYrK4QQCD7gvcd7jzUWYwxFEcg50++XoEqvKFBVUs4smoad8Zi6nrO5uQlAig3GOmKzOEhPATlI+G/wPdbcV19/oyvDFZxzbG9vM69rHu5Omc/m/LGxyc54lyIUDFdWmO5WTKqKCxee5fVXXubEYImyP8BY14WTY79XNCuqSlkUGCPU8wWTquJ0WbK1tcXueJd6XtMrS2KK+CKgWcmaySmDgCCgYIxBUVRBtY0L2u1BRDDGkFJGvv3ue93aGYMq4+mUGCMCjIYjvHfEmLi/vs7Ggwe8cP48g8ESoVdircEYg4i0XAQQIcVIzrldqizm85amMZJT5tSpk6yOhly8eJHxeIey7FP4QNZMyglByDnvd/dwLFVFu297K+eMdmfEmLb7KeEePNwBwBjBGcu8qWliQ4yRlBOzaka9WBCbyK83b7HULzHGYJ1HhJa+gO7Nw6EfX3rxMrdv36ZXFDhnGA1HGDIAP1+/TtM0XL16lR9++pGcEilnUkotqJRaQCmjKAZIOe8PnEhXgMMc6borAvLJZ59rjJGqmqIo83qOiOxXZ940rVBYR8pKr+dZe3qNwWAZMULTRJqYmFUV9WxBKCwpJzb+3GTtzCmsaaEE77DW0u/3qWczrA+QIyLmKH27rRghJ8UYeWR+RISs+aiPo+dcjJHZrKJpFngjFN4BLTBjLMPhEBFhtPoUPgTu/H6H9Y0N4vo6giHGjBUogmU0XMVaATWcP3cWlY73ClkzJhuq6QTvAj3vANdW2AqaD8CJaWdKO8V9rGgcqYV2wPacx2ECb127piIGRFAF7zzGGs6unePGzVs0zQIAay3GOqbTiumsxokwWh5w6vRJxICRVsoByhBoUmJ1NEKAxaLBB98lBPl4EodksaUioHr0uQ+hLZ6I7F8Te/4ntjfefFv7/ZLB0hLeeu7cu89kd8qiaVDNDJeXOX3mJNY5Sm/JCt45lpeX2+EWaSl2uDtA0k4AUu7usQPR0GOX2PF351y3POPphCIECh/+GTCAd977QMuypAg9bt+9y3RWs6hrYswMl0+wujrC9wr6wdMrAkURcM6hnVwfriq0zTFGqKq67Uar5WjHxWldH1HBwwta5uyxp66q7j79F8D+a3v3w4+17WQGPZr+QdH+d7Ce3P4CL6t2P3Zovx0AAAAASUVORK5CYII="/>
            <image width="41" height="465" transform="translate(466 411)" xlinkHref="data:image/png;base64,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"/>
            <image width="54" height="12" transform="translate(506 401)" xlinkHref="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADYAAAAMCAYAAAAppE4WAAAACXBIWXMAAAsSAAALEgHS3X78AAAEfUlEQVRIie2Vz4sdRRDHP9Xd82bm/di3P7IasokoJngQPPgHmH9CEMkh4EGUgF4Mnrz4Z3jw4DmIIAS9CJ40IpogJojmoEncze6yb9/bffPezHR3eZjZl12Sgzl4s6Cnmame6vpWfatKPvn0MwWAdluIIDwu0j5EBBGDtQZjHCLgnKOTJIg1iEBV1YjA3mgfI4L3YWGl8p66qhjv7+O9xyUO5xyqEFFQRWMkKgx6XfI8I89z3n7r8pPcekzc44COAQC01S+siYA231UDGgOd1JIkCSJClmesra2RZSnLwyGJc1hjEBHmZUmadiirmqKYYYyhLCtqX1PXzarqiqqqGI33uXnzV85ubLCzu83q+jpJkvD1N9/qq6+8zM7eiO9+/JmqKBAg+JoQAu9deUcAnCpYawghIG0mQNodjJg2OwukhBCwzjY6IxjbKOflnOFw2ETMJXSyDGsdy4M+UZVkXjbgu8JwZYUYFWNMG7YmgDF4Ygzs7u5ybuMct365Td7ts7K8TOIS+r0e9ze3mRUzOiJ0h0vkecbq6ip1XXPtiy81eI/88NMttcag2lwixjS7yKPVvhsRTKs/ysLxs0YMPnhCjMxmM4qi4M+/7nHx4mtcu/Y5LnEYY0jTFNtm0lqLdQ70qCIUVSXGSIiRUHvG430ebG6SZRnDpSGn1tbwwYPC31ub9Hs9nHN0s4zBoEc3TXE3bnyPKqg+opyIIHqMfy0oEUERjDULgObIOWMw1i7OJUnCmY0NUmf56vp1ACbjEYfTGRp1cR+Ada5hiBhEDFFDU18hYIyhKGaUVcnhdEYIgXk5A23YlLgEZy15nhGB8cGUaTHDra+tIgiKnmgXimLEnHDgSGJUjBU06omCDKHmqD1EVe7+/hvd/oAYA2limPjIs+unMMC9zYc8s76GNZbtnV2Wl1ZYXl1CxNDNU5wV5mXF3bt/MOhlJFaI0TMvDqnnUzpJB0RQVaoyZbQHvV4fay15N8dlad7yWxaNovFVeFJblIYttKX4CNyR3ggaFARmIVAWBRqVqJG1lWHzjyrPnT2NxMbG2TOn2R+NOBgHdvYmOGtQUUBJk5QXnn8eay3bW1t4XzOfzYkxtH1AkeApfcT7EcPhCpcvvSkOGj43NGsuPZ4laal4fDf2qOBB7En0AhjX2Or3ewjQ60Fd14zGY/Kkw6yqmnuMgsJ4NGI8OWD/wUPyLGVpOACUuiqZVp7bd+5w4fx5QgiNbwLWWWKIiMDVD64+lgJX156yqkg7Hbyv8d7jvafT6SwAHgfbBKGB4Jxr55jF2KahNOCldUBw1hK1Cdyp1VUmkwkCWCOUXplOCyYHBePDAlDKquJwcshLF14EgdrX3Lu/xaU3Xv9X82sBbDSeUBRT8m6XEDwhBEIIDPJuM6ta6jVzqyFt3kkQAR8CIUaQhhbdbk5ZViTO4YxBNVLVEWMMURWNgTRLSULCwbQgqmKMRVWpa49zzfhIOh28DxgnhBD4+KMPnwoUgJvPZ6gqxXR6QjEpDpF2hr1/5d2nNvy//EfyDyVtQVHun8FGAAAAAElFTkSuQmCC"/>
            <image width="41" height="465" transform="translate(506 411)" xlinkHref="data:image/png;base64,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"/>
          </g>
          <g className="abc-411">
            <image width="54" height="12" transform="translate(452 401)" xlinkHref="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADYAAAAMCAYAAAAppE4WAAAACXBIWXMAAAsSAAALEgHS3X78AAAE0UlEQVRIidWVyYtcVRTGf3d6r4ZXXZ2k0zHBIZ1EDRhHcEJwJ27ihIILBUUUUUFRN7px4dKNIoigCP4R7kTBtKIoKAmCA0ZdJMa0na6urvnd4bh41dXGMe70wIELF979vvN953uKc6hnnn9B+v0BJ0+c5KeVFYw2ZJlFKYVCkZKglCL6gHWORqOgKApq9Tp55oBEo9lAIexYWCCv1ajVarRaLTLrWO906Kx18CHgfYn3JSklQgyICCJyLjARQE3PFuD+hx4VrTXaOJSxYA3PPvEoB/fv5dTpFT794hhHPv6MZE5z6NBVHDv6OYfvOszBSy9mvtnCKINGoZWi3Z6j1xtQtBqUpadWr1E0mzSbDZr1GiFFfIiEGIkh8tU3x1nvdOj3e+S1OoNhf4pySkipGWrZRP/7Ur9hNGVnX3n9Ldm7bx/NouC7b79mvbPGDydX+OHEz+w4bw/fnzrDxsBTNOZoNdv8srLCNdddyz23387S+btp5Pk/T1IqRTfflSRorehMAr3+UfqDPq12i8lkQuYyrDWEEAjeY6ytsCtNWZZnsanUTNMWNAZtDCEG1GtvvC0/rayiRDhx6hSj0ZB6rc4FF1xEPc8pvWf5wyOsnlnlhuuuZ+fCAu3tO3HWYqzBTh/enFicWmg8HuF9oN/bYDKeMBoNiSFwxeVXsH//fm69+Xo2QmJbbv9yIEkEEQhJiElIIvRGlT1TErwvQWQqpyCAD4GYEvbE6RVQilpeWaacjDmzuspwMMAHT7fbZTQaUk4mfLB8hPl2G2MsxmUopTDWISmRQonWmpQSKUUkJW49fBuffPQheZ5RFAV7du9BYjX1V998i9FgyHNPP8mLL71M6Uu893jviTEyHo2IMaKg+l5MpBgRQCtFSpVKUrm2cqACpVW1+w8//pRMygkb3XUE6HW7lW1EiMFTek8SRV6r45zFOMONN9zEfHueMkaGozHjsWd9bY3uWpdGM8PHkuPHf+TgJfvInENQ5HlG5jJ27T6PjfU1TNaAOMFozaQsybIMBIzWFeAkpJRwzs3sjIDWerpmQozpLIW1UjOy6sFHHpPuRpdBv0duNrewSjpjLc3WHEYbDh66HOssy8vL+OAJMSJR4X3EGkUzt5x/4V6c02gRohY0GvSWU63NWZifRyuNNZasliMImOre2GwrNKat0AiCQiHIVB2ZKfTb7Nh0pdJbWTKr2+64U7TSKG1IIjSbBcZYLrvyat5//z36gwHGGFxm0drQ7w7obPSxGvYsbmfp4gO4TJMSWGVQGuZbcwzHYw4s7cNYS7/Xo1kUFTylpmlXEVKoGSkEQghbhESIKU53r9JNa42ZtvcBbarzH4j9Xd18y2HZtWsnOxd3kJkGR788xpnTq4zCGInC4sICSweWcFlGZi2ZNbSLgsXFRQQw2mCNwUc/G7UokCiU4xKtYDQaU5YlIXhCCNUuTS2pFMSYsM5hnSMJDAd9jMuwzlF6j4hQz2v8dST9SR159x11930PCkBIYcsHCCEGgo8MekNqc5rMWlrNBtu2bQMgxYRGM5gMq4Wf/Z4EZwxl8MQQ0UAZPJKq/ekOR1itMN6z1u8hSWbxDuBcVnWW0V3rUK83aDTq/06x/0Ld+8BDspm8anM6Uxq+LCsr//9onXv9CqSbnfrrh4CdAAAAAElFTkSuQmCC"/>
            <image width="41" height="465" transform="translate(466 411)" xlinkHref="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACkAAAHRCAYAAAD31pA2AAAACXBIWXMAAAsSAAALEgHS3X78AAAgAElEQVR4nMV9268kSXrXLyJvVeecvk3P7OzOwtozb2tbsvxgIQQCLUgWi4Ql/2G8sCABtrAl22JlGQPG5sWYFRawQiwsCMkWwizTa8/uzPRMd58+l7plxsdD3L6IjMiMrKoefzN9qiojMuKXX3y3uKb4xjd/kQ6HHv0A3N3d42vvv4+f/dmfw0W3gsKAzeYOu7sNvvTlL+Ev/eX38N5XvoLLi0vUdQ0AGAYFAtAPA6SQkEJAQGCz2eDZs2d48fIF/s///mPsdltsdztst1sAwHa3AxGBiCCEABEB5ruUEpWoUFUS/+Lbvy7qqq6x3fVQRBACuFivsV6t0LYtpCRst/d48OQxpJToug7r9Rqr9Qp1XaOqavR9DwKw2x3QdS2gAKUUAOCtt57g+volurbFMPRohgE7IaCIAABSCAzuu8SgesiqAgDUbY2ubfV3WQkIKSFIQUqJy/UaTx4/hFKE1aqCEIS7uy2evPUWLtZrdF2HrluhkhKDUmiaBrKuoKsCmrYGDYS2bfD69TVWqxXeeffLePbhD9A0DZqmBoQEKQUIgcbcJ4TAYS8hK6m5KwUghAZpn0g2Nfp9hbZt8eDyEiQAQKHr9ugHhc1mg0ePHuHq6gFWXYeqqgAhMAwDFAhSSAjT3CBgt9thUApqUHj58gWapoUiwmoYIKSEFBIA3MMBQNu0IADDcEDXdVh1nQdpK2zqGl3doK4rkNDXt9sabVPjnbefoq5qVFWFqq4hpYRSCrKqIGFkC1qeoICua1FXFdqugxASVd0AQ49utYZSCn3dQwhh/kkIIbDZ3KOSFdq2MeWTB6mbQGAHoGkatHUD0QgQKVRSQABo2xar9Qpd10GYfIoIRApKkRYZ8x8A7HZKNxkIb7/9Dj760Z9DSInKNG3b6nJskwLAxfoCQkrs9zvUVYW60cJQEwF1U6PvB0gpdNMbeRBCoKqk0T6lnxpwwi0EYORewxNCfzPNrRRBKcLLVy8hRQVI37SNAUDkG1zL+YCuW2kcViYboSuVQuLeAGuqGqoCSAnNJQG8ePECdVUb4BWkKVA3lQI00xxjBARIKSiltKkBwVgZR/y7feq60q1KRpEBQBJgfmiZ+q/f+x7gWoBQVTrj20+foqoqZ8fsJwAIaWRLCqep6wste0opJwLCPIEHF6PUQAWASlYuf21vbtsGEMBf+fmfd4nCaKoV8EFpzbQGWJAGqkgbdOHy6vqUUtrUOM7pVvFiItJAPWLNSc56KYSzUwCB4GXGKgYADH3PZIlGTCEChmFA0zToVivGJK1YU5y05fIUaW+2T1nVFStUgmBclRCOw5ZVZAAFAM2nGjwHbYKVTZFj4EhIGUj3BAL4znf+ICiZjDJIKb0MOl87wuFoUAO2ux2evPWkBMckaU5CG3IpBJq2hXlsVqrmYt/37kZhAVstsxw196lBoW1bkArFQrC/KXL6wEHuD4O+YhIfPHjgOcKax3LRlGSSyfzzSRbnMAwAgOtXr/DeV95zieQevJwknJbBGWwpvZXWUqBdl8MYPHWaK0opgAhKKR2eEbtX5DmZBmluFPB2zpLTbgEN3F4UwrWu+0v+H+A5ORhjbm+e46RWrvBBJAAdExJBCImvf/3rvGofiHJOsgJi7bYVPXr8GADwzjvv4NXLlzzRQp0kB9aCJBAUxSZDC1C36gAIvL55zcB7Epmmu3l94/Ja2Q1vznubmGqb3xpw7RLCTLvdblSYr2pszCFMAGHl0JQpIKYdTIZcG9aVLjSWSi1bhM8+/4xj4FmCSAbQjaCjHMJL1tQ25kzzy1OcOlJZ13y27yGlDoqDUkTwPdXkgpms9776VV+HQJFMBnbSyr27aH2Wa32d8vbTp+4mUiqoJq4y8L9EXlzIc3MJORNkC7Vu1cZ//NmCwqMAwzsoMtGTVxTbe4SwQUYZ2Xx1WCeFTTkCOkUUALW8DOwiITAtpSSDXzFGexFpvzIVu/qLIag5PvL2Cewkp2whAXre7PnabONwY76cjwmQk341YUMnMGbzLAXKQJqIJy7QGHkeShRVYRx5ykMJiMky4jQZX8q5uaWRCw/3eB1U6Ls5SdtfdmVNYckEFmm9GYftWQbMUB1fiBXHdcRy6A1Yjsl0Mr2GmocnVeYWY1qkOC6wn6vDIrMBZhSQnKA4eiRDlzcuRF8Xo2AihdBxb1SI78sfCZI1azLuS5sfGl1hQON067szrZVjQKK54xv994H1FmeJucZR0inNDSBrw7KimqnP+ewo/QTF8UMf46Zgzc1+Exe8VDNF1/zdRyoOx3VzezN9RwqP+ZOynTGg85igCI3ncBpg+i54mRzZ9HIu2kcJtDuIJNnwSHpohMz/E5XG/W0OYIH3meBkIaUwMvDpZCqwt55mQfox8TGuyTDNZcoJcaaiBMl0nkQ0GDVPOjul03PAOE00vzNBiwqczOPN0tIYPCenIxOULWAmPXaP1pgf012IyQ1Y5VhDlG5uS24OkAU95kaL9zwgS+i4cDVT1jHjk0nKaFspY2z/+mzNDcBNssdAJpt7HD9E6XMZyijLyZGHSKQnLI/7bS91Zjr4FBqDLHxyWaVG0/z8zuK5kInsBYoTh2qzZbr0ZTALPE7uhhkLNC6em6BjZpYSlAaZLHumA2VYF2vzOWDONnfXrbJpPHaMU5ZEOXM0aSddNSJs7lQYcSqkqfuPVpy5kgmE1qzrOZZs8QFIO4tVhKK0hiW3lPS7p3yq8N29LBhu3M8nCHFzZzAeDvtsIoHrDesyZOLJY0bWJC9IcI8R0fXrl4mrERVb8CP63Y4WPOQIT9zfnpqJLa5BUyiTywacvzDKR0EBJzKgk5ftoMKpkXk0311U+VSdk33bAprxTmXdh5nKxskz8fhC7gYgT5FEfW9q7tHTsQP7oykSAJAVx760l5KOlo7Ep/Esyk2TP1m4ZhXnTcaTI5qJESfwvIF4Ml2kUnHg4bPnDNWbiydTNRIgZbS8IZVpIvVUmujjsGABsfqwwf9kBwd4/DhcSDdFcw8zK5M6Aooo0lTBrME0b4+jBMiw+NFKlmzOklyJRyiQ3QTIkE15eUzD8BW/yY4YWze3iAhclPOFEIIVhCU0cotjx1AAN4rCp+9YzmUHcrBrcPm0b7wuNyJRlQ5rnEYOpDRbAFy1USW56zm6vn5VnnmGHEgfoVgbaINX+zXf/7HE07puZTpk6fSjQPLRipyBdleYGKRiSQ2ybFyyBHhohamsLzYt+m754NmCjvI1GPGiyQzN6fkxTe5W7CexwDuE0fTvnHAWRUFlkGc9zmQFLMjlPbXR5OeJHbXRQpExxhJjPs56zkAjsQZjquiJBYqpcP1MBn3cW4wVx1Yk2L8oKXklNpIn0Kj7kJuvmVs5EcOxvx89fnQKPgDRfHclK6SnlY6jczFzdvHSNIIJEG9yYH9pH37SdBtzlOwCL6DxyoF4GYO1THxbS2wbg+8U/p0CVDiswVYOkIebCzBy4pps2vIwOH8fAxnQuWbfnUM6XTaTbnHSLatpjRmlvgntTgcYid7PVFOf0yfCgFR8w0Vm1Z8AoEaTUXEOZvLJNvYZm7tyW/wytKCTMxPYL6aM4sx3StMJbJOGy3cGTjZViJN76Dm3luYYoRRi0QwHEpy8vbsLCvC3pvssea4GWJNUau1kqYTluhUsS+benKEvF4PyQZlcvJvtEU4098TO0RSdvsjTEY1+ZmX6uAAjX0g8grG8tkSegp0JnBYsb5i6PjbZmouZPWZn4WSC8k+e06AZJG9k4TH3djPBRahQCR4vjLRmJ+XjDeajHxNxLUX3H0tyXj5shsLV8M70nK+PM9rZ5KsJaXJ/Rorbjo3HRuieZhfU5ai0KRc3dyL/ER5nJuKg2VyF9XgqWLHPZTJRZjU+q8Dc6aTz6upBKcQkRSAXrrnJXvQqnzVZUw0SychRxnwSX1jbJJpSkcj67mWdhHHu6S0w08XG7TkbT7Ztm4koCypEWrvtQQlZitImFnlO35jKFHukc5n1Ipl0WwFzAW4a3UnElWcepMk7WlFe2TW0XqPNMVzmF/lQrWDXaEy8vvmNbFERxR4kGwUtpwXdh2kbSuzb+UILTUd3xOYb0J6BVZZ/rKhzq/7SnYEj6YR77akmpcXmV/TmKvCVHAvTTie6BXX2XL2JW3ztsYsOjjmJsBb70DxJXuEUXd+8KigupT50ch+iYCUqi2jmSuN2/IwqvnAEY6aXGF0ZH0KztGRNRSBz0JK9x7HAllQxSeWcXGiVzmnQ54f+ynux4W8WmZ9qdcOpZBUtVsqs9Qi7rXNVFGXKVKApMYIxCSvzO3UHm3lYgDGVNbOtYKKQggq5vmSXzS4AHnFy6d6HL0Z7HMi+Pyy6kYJvKbmba+ryJ8jslM+Ul8vD+jP8m/5cEl+mcyYHrKbwpDLxZ+Can4VXpIcEO9eaNOaykkFtYWMulMMzeJ0FG35zHjqXmzw3T1SgM06RRPQXFwWNKQwylm3ALKXxWrVkJeVyqA9F0lLMvY4AXxW9NDIvqTlXLuXTJ5LmatLX2MXZgf28Hs2gJqBru8kplTmywnPiHrG0xtNMnqUklxSYT53nanlZY1rcfUjsN8/KFKXyH0Gh7y4M05fV+4b7OKrPbLuarD4TjUwuDp2mo405V1qZ2APhoM4eyTMPObGtIFXIdEWZIGYRkCk6g++eCDbn4tBCWgByGkzOYpau/ZmiuqlnOl9FWj/GMWV6/KsVygouHp8soTNGZwHNn83Cf81GCuOOxDl2ghasHGD1RiSqfHfl0eMnQWfsFDpSu6ec8cRJnsWlhzcfB3IBisdPnszHojN0/CztCWKyrIDiCVCmSMkI7E3ptabJ5hZS4p13vjS6bt8zQoM1ipkCzoR9EqTbVVfcxYj3mkSh3ZGgZ2cfdrttsnwC9AKRjFi0bkvgUpdVCJIX+fr1dcYvT9MXczyUriqBJ2e+Q43a7/fjLEfS5N4H3lCr+MCtyFamuJ1t6IWgZT9QgCw3JL3dbcYAc52wAkO7RJmC194kimDfMytQoi7hm7CYUrK3VVksQXUTtU51xAjA06dvG24f08tkIOMLo0PX3fXw2ojXsT8/g3YvG2ZJKUhKqCJc+XGgzANkLie1e54Jqf5OGKIFDXz+jli8IoSSl51qT0Q5L9jravK55ml+Z5P7kz57IqkSp3vCgBJ7afOZ7RutRkRcAFj/BsdjnVlhlVlx6vG42qcMC+8CnL2PM5pdTI31TUBzfyMjn8tbQvNrehM/AoM0w9FzyGbmYITQ95K7HtWe8p7uJ2vkc5sgPi+fC8omIouC0C6qr2Ctc3INRqqJcxVq+eMNXmjAF3B39hwMPlmULjxnkgjhsMsc5fNIAEGoP3cmxxzGlBKdqjszM2IZYaBIMVLg5rzmSSCzkpxY5Tk5QHo+vzhrzCkbYOThhI5xnGEph8smm2hOxhIcJSTRHMPf0fikfVN5XLIAb11mMeN1XgkUl1eXR0DjIFM0ESNm07IeZ+IezLh3Q5m+or9TSvuWcxGmJUpfflp9We7CzZXTnmaU75yznzh2nXmR58un5g5Ryt0xvwZjjhKG3ZY2ZWrsC8RLap0enywoYDykErL5xryF9RRKgky+03MSWEjekBOGzHS0vb1kV9qCGTFziMdcJMsZSfHRkHnLMAky63F5lMUuBtKX3Wgb/k6GKae/aYiCbwSMttImGUrhneT+5ko/BWRhjErQU3fj4yQpzBQVqFdbnQoSMS+ziTEkB2z+OSe3EAe0YHPl3JbAGHmai+kr0zQ/sJ8tlmZzAJhdylNozBeWELwbLvaPCYVL0LJTMEpW/TGrG7i6lJcxX33wQXGqKWvZGRPhYvjcmZHzupMmytjD3NETGSqee4gNpagASHbNfaS4d1rIVhRgEID7+7tE4hiQXm1aaobOAHJEOddnAcefySBuOSVAppFQ5KdT5jEJKHFJSLnwVYZLHzTZvR079cACJOvIVxw7jiN991gWR7eYh5k6xbuUCrdOp4z0vGZkGbmw9bKh2qy5ZMqRCjgyZjxV0izNbmQLGZnOnRa5SWEoKcHRCfsWp3LFPv00Kj8YYZK8bcycwXRS+cuWJhJcnMhFcnQjWbjneXFKdmcTLyk4sJCVHm/5ywVGpzZ7tncyonhDeYnYpZV/MRUfMTGXYQz+XOHFbBSUDriKVIP4/W8wVBsXn7Da7su8Cc+UMktH+O6SSOc8IZql6T7OhG/M+2+WodC3z9FJy2WzJufMVDCCkbqetyvc17ulDmWxcJZmB/YDZUiodbCMIYh9w/DuFJrfAVoiW6nZ2Fh2C6jofYu5m/yW0xEUhinhgsaYCynMXRZPum+5iCJ1HyE/bD1da8zQ5drNDXgGQA6csOsg5zgzOmjrSKmeGNnL1zuTN9fJlZOZikwHjdvHXc+XM0fLDtpKlxDDGYnq1Jh/uszwp5g9eanA7ORqouSvNxwFjS0LZ9HUirSMzePzioUjLQWhWtqjzAlskb8pZPDyPWKZwCcILe1n3sUvqjM7qsbF0o8sh6xKc4uif1M1lFHh7MO4UM+5pFFaCGOaZJ05KjRHARdS7W6/lXnPIirv0iYz6S+5M1HtR3FXIqPt5VMkY4ThlZT1PtMaDDeCMV1exu0hL7XLV7bkaXpGDKESUPLCm6f0QpEZoz3W3pRo5Lm/9OmmTVBcVnJLS9zsmsWe63OA5gEvPlctqUcpwST9frtzSESZWxw1ozU96UItby0j4w6WEEvncQpopMfEQKTSC0ucI5U9JHOMZTmRFd8JE7Cg3OM7YiN7FNe8nL85yg+zRIrCK3PvyUmFaIYePXqcvH6MS/fHnhRkzgZe9oFiP30mY+9ASpFaJDi2LwQCmYF+UgxgDPyMSNMmaFkoVJDrNKALPY75sAwOBiTGLPV2clzOEtiToZotaBiGKQVGnEjgb1N9Q82drN/9JAyHg3sEt4Q7Ai+EGN98bpBJhFFSPFDqtfv0YYHsMAvxDCMRS5xvQTwlbVgzO4oXUXEJoxjDfg1CcC+T2+3m/HZyHhnMKUr2CPBIEDnQ6TDKjFOWP0HB4qWUOlul4deJ9WuWvM87W3EeZCzwzgd7LKM7/GXGRWIyfGKzj0B2XRuGWRSenhTvfRivj/wCjq/vD31Qa852k0NoU5hwUEJmkyUeCXKITz0OyqbAPsbuMDmfcwaaXCjC39lQ17VPgL9uuRp7qHON8iZBxs7Mfu/7PtQLDiUlk2QORghyJwo+BqQtIC4jtTc27MdwmfRKdQofbYQ7s5qFXIXC8pgAEv46Z204dM2/h0Uupfyu5EyZqfmFkGMnIkrQxJkDGU7w1ExzW7c5FeEvgT+5K5lrNzs01iWmlMbfeDzF7iAtkxR/DY12vH+RmVB2jcZ7GvOozB/hPjhl99LOnZXugZHnairj+MdimjkHgybQRtrNZdLIxcsXn58ELgsyqjnUVS6jGMsOf6j5CdBy7i7cbRfVTKHsxUy3vB2d2rSQkjIZtGCiYhuhh9dTvwu5NTNUKQeVKIjZFnLaHO+2Mz8SfjvuyJ1q0mW88Lw/HDxORiMjn9MpHq6dx+HMrellFZkN3rFKeZmMmpvGIpBFPfMwdTx0bcz16HuYJxERmT95r7+MOK7xpqEJ0kAo0OxxDmaC4idZQuyW6fWTk1JPnn1jP2q+loGby5WcXw0L0EUcDn0gkyzOcEY+7OLEHqkATQ5kAlWiPMYtayMje+TxETNbLDEOGiZGMWLG1ckX5mbQjiTQVs4PbmFySJS6azll1mCE2s25sttsWL7Up/mVAXiMH59evMS5aCq1WutAsM/RtWKa1oxli+ETFie2j4770fVTaHYNBtfnWJlodJ2jnVrGvQx6cmniXFBAIxbO3XEaTfa7p05mIEFxZnYPRR4nWfipIHkDMoMUG+mRTIZ/zzUImDbmKakf/4zA6F/2pF5rttbrdbJiRZnRuyKQKdAjcMxGjZgVbfmN0nUQs2R399TyBt6qOeUI7Y5nX6DhY1JqKHpn2SRIXk+GlQwPRQ1urhI3UWEZs68hngcZKc2Io0imOwnNGIQY5CJOJpxIgCaQr+Bq5GbiO+JdeYA+RXc2sB4/VcFkE0XfKbrMAEcyOerWErL7G4B8GrOTGSmc0BX+13JgdArQGUzl7NLEUBl4kuVehIn4tF66+U4HyVuMjfpSnClSmPHNcM2f2guxBPpMPJlW1dDbWNAhcGeCksY8VWEByBGnONZkOWEAnDD1/jFObPGCBXWhrcxk8pe5TJ57uWz2abnsjRQlNpT2aZgcZ3GWP0BBZM4/KfgPQTPn5HcGTAHWtFsM6su1a2DfRxPy4UhvwgIsoPmNbJN2OW7/qK8dzZUfu2gk08fxQu+VIMCS0NrwaUZvvVoWQgZUzzM/QudRxjZ7uojlSY6KNlfGA6IhA/VDEFlXaI04jZr7WJo9cyAW+QBqSlSM1ozynkDZpYn5YsmDCS5ljNfpDmem3z2yJVaBQmOdMjFu7OgM/KwTTpAVNx4bt19FxCILSh+DlfKjx9OitWoBvzLN7UYuiCvQmwLpugKeqypejuPMZ9rMJ1OOAJyUyXjyMp7ftt/H+hI4RpYW29llYCd322UpbkLrYRI6lhsgWEIF2woYV5h3DLnINDhKPIfu1HIqnKewoZKaHzBV670Deyb1nl3Te5EZFZu6x8qks7MpzxT+WQ4y7W65EUoMksaTTYGpzAARE+daToHMOLfgQjjKFgkBA9e2bR5grvwE5V/XTuT63ZMrW4ImG5ughCFYAE9TuceJK4ybO3avX5jijID4BB6MeVfI7nPeJg1U5jaYlYJMryj1SILBM97N4MBirxqUs4xmI/NskTntNR7m8uoquDZTzSQVHu2YqiRq7qxfLrg+DzKdOWEG3e/evLcu4GJwg2/rM0RqZVMksYiOzaTzMSFA8H05ExUsBenrzbgzcn8cLF7ZOTg3CxLw7+0OO/ga1HZzzyDpbyO9GAE9DfbMbtiQDn3vrxNjqEUVy+R5ME64xfBPbKfZr/B9EG4AO54dO4EkAGw2m3GKYVPbdmFlbsSC+WmKbmM/sk5rKUg7k9q2bajNATqDgAXJvq8WN29gRVMlFdHsYnjeosRcnxQiXItOZp5QmRylo2cLEE8vlyViLxw1MmcOAvZRkZ1p8JZACIGua11pfnPHMkru7/ZDIxxn2Gh+htU0aCQa4bKbmCaaPpHf9r8kYHZ4JooJtBQa236/x3DoWSeSYIf43EMSsN3tZix72pKmuhMSsO+Q5S7NmxFipmR/OATCygf33dWRiVxmM4mZtQCkfYbkTaxQbcwpGJ52Q9du3sZwValwE1wB5bopdQxQSmkqjl7ag3BDkTPeJELmmB+K4sNej6eR2tlBqVjWRqFEzEmOkwikCNfXrwLgc5Sbr695YqrXELytTQjXrCNORkAUKaSmk4/h7oiTo/fSJnxwKSeJ1Fl8dwCy7w9+xb4DwBC6tDEnRaTlihSUGq9kOQa10+6maSwOBObFcOn58+fjl/O5p+HdV+N91HmmRwKQlrhht3ABM+XmFsRHg1IWoLdCRiYnlnqd5LuZiDm/TMZn8/0PLp+B7CyAAa8UmrqZxpiyXbZm1gojO+myOSARJ11xFORznDTX1OwIb5yaD59GAUZctH0gaTjpZHDE8ZCTlxeXwf2nkAR5O+mNqa8MjpPCuZxQSdg9zDtuthtWjn/QgAHFIGPiHOLNLbhMMs7ZICTi5KpbjVAcq+2zq/5W6xWIKJBJnR6OTjgjFIhBCC6coI/fB5F/gPxIb6R+H3/8iZNJq/WIOckHDZLA5FGrB9i6IM6T2AYCq9UKt3e3TJuR5aT/PebOMRvV/WOFZsr9vL833d2oqYMYkrWvjUEyGKMVVuMMKUMkEwiCQi7WK5ODvcKU4bK3hDvwwo7ZIveSoFEUFHk5EIxfDzEiEAci+EkmikQimjo5giaWgTGUoOgl4zTiZNAf4ooVlHscyiDoTRXnw7U4U8hJ9xiBDc1XfNoL+IJuqPctfGMQIcFJa47c99AzxQCFEMWn1I363YA5sMMqhylf8OjCiAA5G8kMe+B9QgWLqZSbGWPudZM8SoZxmpMUPeGpQUZ65QD/FmJkGViTGu12f6kA2ALgk4dkBqGb8Po99tuhRSBwuU17nZymp0TAu0WT9oMf/N9QM6N7wiDXy2Qgi+QLDIDOcC8AmNumCpi3VXGD7e6Ju7pjTnopCLlYVXVU2jIaySQ/D40Yx2ITNJJJGxCbl/hR8AinUeIcDBE+sQESK05gToHABBHLkFOguZCN1zfK+e6XvsQKZwLOjp7wnIwMuM1txTJVO5lBsUkDGv4MmlvLzpiTqULi/rZ7dsE4mYB6TOMHIKXkAEMzIyITxMF5Tuphl3EzU+Z7ijIjvZw+e/4cm7t7XyClOeEWvXMB5Tay1KgXkBSwY5JW9jSUuDMleKwW9V8sWG8jwWTVkxBi0bIGB3J8STBuGQhc5kAYBjb2SCG7+EhRXVWIm9dBn+Xw6JUKfl7Gv+lCs0QIkSjPVsQVLGx2y0k37TcqoVwOHCfrptGlc7l1b1clpzj7w8FgIP/p5NNWT24o8RyUbG7AMinUtO1uh0AbeOclsJnnpYnF8J5DgJ1O1Aqlp+2s9uocdvZKEOvWWvwnghyfF8S12NQWby31MxQsr4vQw+CiCOBMpsTcolYUik6Bs+KpXZrloO8VBr4lcpUpECd0xAgHc4CMN8y2ds3VYehdxYFoOpnk5idGlgaR9Lx8DGnyEZjhfv36Bk3bsELTnAzsJmWLWzRwteA8c6DvB8c1ynDSOZ1kcwZCkaghTUGAIazLCnywL8Sevu3sIfOkBG9TQaQPMDwT1YDeb+2Jgq9VJaPrGoQiO2YhjKdiQsD74Weg8UmefQ/fG6SIu97z+Sb3sqlYcwN+cP9Yyh9f70jXlhwKiW0h8evcXp6HlzPbr7ygd6vO4OBxpM5lD0LwshqOcCyhFE9GdkZi/FUAAAugSURBVJL7bq7B+51dAsETGSh3nYGdkMpFxjwG7pWIwDkZjD2Cc83VamTZy+hmc48RLeCwW7yUu8dxkWdw1yz3hO+2GTcqBODmPVPu8AidLzgq3LQfC36ddvMmJThl4TEmJyGE8zRL3qAxsR+HHCerugoPf+My6FjIH21as5VSy2RyDJCbFVZZMDgQfGGOxpogy6k0kCWjvEmQDiw8CCA68MA1J3kZHXmcscsRJt5beszECKTbB0YAqsorkNABhm1qjz+USQfYynHUrHMAVUIMkpzc7bbssSwkO68Ip/rOfQactbYyZb7Oqd22YvgW4/0W68MDa888ULBMzKSvVscflDm9sJHJ1uHQu2sgAgmCMnZRECCtxSTrazzHhBB6+c2RvjLg5IVdkhBUwpWC0Kshir6Z1eeGlHTfOzcre6QJ0jdJKQMbTsT6K6w5vSx6rM6PB6LCTdpxNH3ERCBz3ki7ygNbSgFQYTpu/nZzfYF9nASJiBvO0lCcHgLzQL2QVKYViMLOFwc7B3x+E3oQ/YTghe43gOwKaQNYuACTt/FUe0/LQqa5vT0Mup6Mk777YBJYyBSbL3tL+NDjtByN93c7G0d6uoOVEnDScBGkl5hLZkitUoUDpmfRbk1t22JQijFNf1NKYejtC6W4SrOHYsKb3v56HCWb+/rVywBM2Gyek4FLdArkr9k7KzbkcoxBl+7hA4qaFQAgfMzItJvZK+8qfTb3kNossYqXDLP8u3/7u6KS5EIxy5V+tw8q7Psetzd3Hpyp3cmpNUHgnPRo7bC0NNsSllh3PYJBBFlpTg3D4Gas/MqUMShFBCkIgDDxsAia3N2AjEZnAAn2ae2nBIC6knj27IdaOYYB2+0W2+0Wm+0W2/3eReWDUjjse/SHHsPQ49D3IKUB8yVgvEUAoI4We87JpTW5NrasAUCKCl/72rvYbnbYbXfYbrcYhgHDdqttpbm1Pwy4v9viUEu0XQMpBPr+gLqqse5Wjoux4swZawYfyjgGLrG1TiLc3m0h9KYaCCGw2WxQ1TWE1AdM13WH/W6Pe7lBVUtcQkEIgcv1GpvtBvvDHk2to56u0S+DtGPrVVVjt90mQCW46NZ6EGzj1wDQVBWErHHY3YMAXF9f4+rhY8jDAReXF2YZoQ69hmFA3/e4uGgxDAPu7u/1nCQpDEOvB7gIEKLCoT9AwOyZEBII9NuOwxP7jPWJNbc91VzWDeraFyakwG63RbVa4+rqElVVQQgJKSs0dYOqkhiU7vdUVW36RwL9MEAKHfHUjT6veOh7ABJChEONQeTk9pMT9OZUBlIIYNgf0F2snYkZhgEQCgQJKQXatsLV1SV220GPTRqm1FXtdjuJQaEy9o8U6WhdCPQg/YBSQB20SCl7Ij2PuEixmQ4FaxglAPz+v/xtAeoh7GQ5mW6BEKirCnVdGT8scHW1xrrtsF5d4PHjh3jw4AEuLy6xXq3dNisXegk9elzXNZQBoBcwW3ll9sD84IuhLLlQzfaJq7rG5n6Hj374DD/xwQdQg4KoJOqmRV01kFJita5wdXkFUWmfLjQaKEXoug6H/R6klG5ioVnRti2apsHt7R2EEHqWgwh9r0czSCk/D2OdmxAhSKUGkBpwefUQ2/vnePfLX4aEgBQVdrsDbu7u8OjBQ8iqhhp6CClwub5A162gjK18cKWw2+/0q15JYbfZaBu626JtW+x2O9R1BdX3qCuJ3XYwzSmghAApSr4c2pmj3/ud3xLoD6jrGrKSuL+/cwJeVTWqqgJBQAqgaWqoYUDbrlDVNZqmQWv+XV5cYL1ao+tWqNsGVw8f4OrBQ1w9uMJq1YGUgpQCEsC665w4VVKGR9ZL/1rYMDJXA1arNaSU2Gy2Rm70hH3bthACkFWFSgqnCMK0jSItyHx3S7damwf1HqhpW7Rti7vbW1QVoaHKiAwDZv4FbtHSMAyoKolupZvLFqwGBUUK+17LkS1g6A+QUkBIAWmu6R2D/j/bElbuKwNESom26yCEQNu2wd7Guq7R1LW7FoD8V7/9z4UcelxcXKIfBux2O4AUtpstbl/f4n5zz0bEhFvSKKVEZZpMi4Y0sxba4+igpcLFxQUuLi8dkEpKNHWD2gBar1bmgA+gaVr3fTz0Nyg8efIIUkrc399DKQqaYrPf6uYRAsOg0PcHx51A6F2rVahqI9OkF8F33QpXDx5qsI3Wga7rAKH7+JeXl2jbCZDf/s1fFQBwebE2+xeAfhiwub93ttOGdHVdm+UPvj8tpZ2CEs5FarsbViWEwPryCm3XYbVao25qXFxculMfNMguDRIADpstrq6uoNSAV69eYhgG7PcH7HcH7A979H2PpmmMSBzcFJ31NlVV6Zk01kMUEI6jddM4iyGlNPlr96BXV1do2sYtkUiC/K3f/FXx8MEVmrp1HqI/9Pjxjz5G3x8wqAGb3QYCfpWg3mUinH8HfBdBikorGwSkrFyfp64bVHUNKSvN0fUaq/VaP0iVUZygOUjg4YNL7A973Zzmia9fvnbNtdltQETYmZ3LldR+vq41Z+q6Qtu0Rh4VpOFuVTWQdQUhJdYXl5CVNPsitFJ68HIa5K/98j8UT588Qds0uLu7xdD32O81F3e7HfaHPUDAbr8DDQp9P2BQA5RSbjEUkdl1RwoCesWBBkpGZrXcNm2Hqm7QNJ1eVWPAijmQgPbL7737Dvq+x93dLZRSuH51i08+/hSvXr7Aze1r3N/fgaBDMUV6YZMiZQy80jInK1R1Bb6xjXdzhd1doiMP9gAJYz7m5j8SvSK89fBKh1z9Hvv93hVgbeH95h53t3e4vbnFfr/DZrPB/f29+77bb3E47HVkI+BMlZDebFnOSSF16Mfc4mzn99f+ybdEt1pDmsil73e4vr7F69c3uL+/w6B0pL4/HNAfDhhMc1sjrkM0aQb5lQPKybpCKasAnKWiHvo/+8f/QDy87CBJj6Bttvd4+fIGd3e3+Oz5x1r21ICh77HbbHE4HLTc7vc4HPa6D7TfY1CDd7coH6ssPgxgv+tRNxI0DOihN6p99KNP8JV338Ht7TWurh5jUD1Aym0HJNLLHLwyMc4toOKxjm//+q+IT59/ClQEiQG7g+5GfPbiJT788EM8/+RjC0HvqyVy7tP2GlMT9jHg1AMsWsz4h7//r8WfPXsGNfTot6+x397h7v4Onzz/FK9vXuP+7s7NAZnxXWNurNHXwbGV2dEcYzw8cwxIAPhP3/kD8ez/fYh+t8WfPfshbj5/CRDwpz/4U/y3730f//P7/wvX19f6haeKcc4OJxKBBqU/lXLjSoMRCxBBDYMbTTkKJAD8l//4HfH5569Q1w0+/ewzfPzRj7G5v8Of//hDfPrZp9j3e/zJn/wx+n6AUgPU0Os+jLIjwAQ1KNCgoIZej5YoA84A43J83CkaAL77R38oAOCvf+MXaCDCi8+vsdtv8dFHn+Lm7gY/89M/hd/7N7+Ln3j/ffzMT/8UXr16haqu0batk00pJfrdAcNwgBANAAUphBtbsr3eswzH/q2/84tEQseLH3/yMR5cXeH5J5/ggw8+wPXNDZpuhdW6wWazxePHj/D0yROoQaGuazx96ykePrrE8+d64PbiosOh79EfBhz6Hr/yrb9/xjFjAN/4u79EduShkgIvXrzQXXwhMYgKjdRN+P5P/iTu7ndaAQd98MfDBw8BIfDVr76Lj370Kbq2Qde1+I1/+q3zgnRgv/lLRErpYMGMlw69NuT7wwFSVGgvLo2sHvD65jUIwKpZoWkb1E2D9XqN9WqN3/mNX34zIC39jV/4e1SZmJAIqGQFRT1AFfb7A3pSOOx3uLu7wcXFJSpR4TAczOCAhvY//vO/f7MgLf21v/1NEkKPzFVVjWHocXd7i6busD/scL/doq4k1hdXIFLo+96sSVf4/nf/6IsBGdPP/dW/Sf2hR23GM5Ua0A8DLtZ6wGwwDkCA8N+/+x/+QjAupv8PmKn32nRFcWoAAAAASUVORK5CYII="/>
            <image width="54" height="12" transform="translate(506 401)" xlinkHref="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADYAAAAMCAYAAAAppE4WAAAACXBIWXMAAAsSAAALEgHS3X78AAAFA0lEQVRIie2Wy49cRxXGf6de/XJPT/f0uD0miSwswBBZKCCCIMmCfyHsALEAgpQFAhbwDyBYADtAkQggOQiJLAEpyobHgkdkEFGIBMGR4wyTSSLPTM9MT7/urVt1WNz22BaJRBbsONK5dW9dqaq+Ot/3VcnjX/maAih3h/DWIQAiWGMxxuB9wIeANZbh5pBut4u1juOTCbPZlGK55GB/H0WYz+aAAQxFWbBcLJhOp0yOD7HeoaoYIyiKqkJKJIXhYMB6f53BYMD3vvutt1vaXeHu+tI7EJpVV67RyJ1oVck5kTVTpQrvA85aBHDO8aEHPki/v4azFu8sOSmxqpjN5kxnM7qdNnv7Y8502ozHx6uxlIySNLGsSm68us1TP36K+y8/wGs7r/Dus5c4N+zzx6t/0Y995MNcu7HNd37wJGmxqNdTLSnKyM+v/EgAXM6Kc5aqigiCiFml1ChtjSWEAKooShkjIQSMMVhrEaOIhfHhmNHoHME7tjY3bu3N7dgcnL5evHDv2+52ypntN25y/wcu87OfPs2ZMwPWun3Wh+fJvsXu0ZSjWcHZtTUamxtsDDd476X3M5tOefDBj+p8PkdeuLatIQQa3teAjKmpZh3GCCJC8IaWt1gjOCOIgJG3ZoSqEoGDacnh3h6//s3v+NIXPsNjX/461jlarTbd3hohNOh2uzWdrbvNGKCqKlKViFXFYj7l9d0d/vbiiww2hly47wLnt7ZYFAU5Z1765z/odrusr61xptNha7TJ1uYQ+fTnvqg5K5oVAURARBDAGEPWut9Yi1iDMRYFrLU472k0Gnjv8d4TfMAawVpDq9Pm4Uc+wV+vPsdru7vcPDhif+9NDg7GpCqvUNQb57wn54wLDcQ4UqrIKZGrEucsx5MJi/kcYwyj0Yher0fwgeVyQbPVZmNjg9HoHMtyWatIE/KNb35b5XSaGhQi5JwxIjW4nGudraoUY8QYg6wqmlb/y7IkhEBZlrhGh1TOGZ49x872v4ix5OUb29x7fosYS1669goXL17A28DL16/zvvdcYn04wFrHoN+lGTzj8SF/eu73xCKSUmYxn+FszZZGowUiKNDt9dCcGWxsErxnczRCvv/ED1W1rpTqHf4h1JpbUex2K9Qyr7lzq7319NYTy0hcllSpImtm/+iIqipOfSmrYlSQrGQRRBy7O68ynS+ZFwnvDGqU4B3eeT7+0EN02h2e//NVUlVxMjkmxhJrzGrWzDxWWGPZOn8PV558QlxOmapKOGfJWcmayTnXFBTBrKxdpNaWIDjnThcp1qDoaaUBGi1Lo9k8ZUC/36coCnZe38WoUMSCilQ7rwpv7Gxz/cYO86Kg2+nQW+/jnWU+m1OlzLPPPMujn3y0PgIAMUIIgVRVIPCrX/zyPwTv3ry5Txlj7YwxkmKJMYZ2u00VI1WMWGtQrSkoxqxACs1mixACrVaTrBCaocZmBE0ZI4Zmo7niuXDfu+5hMpmwPy5piuekiJxMJuztjVkWBSLKYrnAzRyPXH4YXGJZLHjh+b/z1cc//1+dX6fADo+OODg4oDfoE8uSGOsc9QfEqiKmtMqK/pkuMWfW2m1E5NT2Z4sl1llcdmRVUs40vCOlxMl0hreOnHJtKq0WvbUe46NDZouy1rMqZSzxwdWurLAsl2hKCPCH3z7zjkAByKc++5iWsbzjqrHSiyhmdbt4+spP3vHA/4//UfwbfrBb+FAfdKYAAAAASUVORK5CYII="/>
            <image width="41" height="465" transform="translate(506 411)" xlinkHref="data:image/png;base64,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"/>
          </g>
          <g clipPath="url(#acetic-liquid-clip)">
          <g className="abc-132">
            <g id="MeshGrid">
              <g>
                <path className="abc-53" d="M466.35,411.27c.07.13.14.26.19.39-.1,0-.2,0-.3,0-.06-.13-.13-.26-.2-.38.1,0,.2-.01.31-.02Z"/>
                <path className="abc-207" d="M465.76,410.48c.13.13.25.27.35.42.09.12.17.24.24.37-.11,0-.21,0-.31.02-.07-.12-.16-.23-.24-.34-.11-.14-.23-.26-.35-.38.1-.02.2-.05.31-.08Z"/>
                <path className="abc-410" d="M464.79,409.78c.2.1.39.22.56.34.14.11.28.22.41.35-.11.03-.22.05-.31.08-.13-.12-.26-.23-.41-.33-.17-.12-.35-.23-.55-.33.09-.04.19-.07.29-.11Z"/>
                <path className="abc-449" d="M463.76,409.38c.13.04.25.08.37.12.23.08.45.18.66.28-.11.03-.21.07-.29.11-.19-.1-.4-.19-.61-.26-.11-.04-.23-.08-.35-.11.07-.05.14-.09.23-.14Z"/>
                <path className="abc-144" d="M461.64,409.01c.58.05,1.17.13,1.74.26.13.03.26.07.39.11-.08.05-.16.09-.23.14-.12-.03-.24-.07-.36-.09-.61-.14-1.24-.2-1.87-.24.11-.05.22-.11.34-.17Z"/>
                <path className="abc-270" d="M458.65,408.79c.41.04.83.07,1.23.09.58.04,1.18.07,1.76.12-.12.06-.22.12-.34.17-.63-.04-1.27-.05-1.89-.09-.45-.03-.92-.06-1.38-.1.2-.06.39-.13.61-.19Z"/>
                <path className="abc-348" d="M456.33,408.5c.34.06.71.12,1.1.17.39.05.8.09,1.21.13-.21.07-.41.13-.61.19-.46-.04-.92-.08-1.35-.13-.47-.05-.92-.11-1.33-.18.27-.07.62-.12.98-.18Z"/>
                <path className="abc-308" d="M454.66,407.87c.18.16.43.29.76.4.27.09.58.16.92.23-.36.06-.71.11-.98.18-.41-.07-.78-.15-1.09-.23-.39-.11-.69-.24-.84-.38.36-.08.79-.13,1.24-.19Z"/>
                <path className="abc-458" d="M454.18,406.86c.03.11.06.21.09.31.07.21.16.39.26.55.03.05.07.1.13.15-.45.05-.88.11-1.24.19-.05-.05-.09-.1-.11-.15-.07-.16-.13-.35-.19-.55-.03-.11-.06-.23-.09-.36.37-.05.75-.1,1.15-.14Z"/>
                <path className="abc-241" d="M454.02,406.26c.04.09.07.18.09.26.02.12.05.23.07.34-.4.04-.78.09-1.15.14-.03-.12-.05-.25-.07-.37-.01-.08-.02-.15-.03-.23.34-.05.71-.1,1.09-.14Z"/>
                <path className="abc-174" d="M453.83,405.8c.02.06.05.13.07.19.04.09.08.18.12.27-.38.04-.75.09-1.09.14,0-.08-.02-.15-.02-.23,0-.05,0-.11,0-.16.31-.08.61-.15.93-.21Z"/>
                <path className="abc-72" d="M453.75,405.38c.01.08.04.16.04.24,0,.06.02.12.04.18-.32.06-.63.13-.93.21,0-.05,0-.11,0-.16,0-.07,0-.14,0-.21.28-.1.55-.19.85-.26Z"/>
                <path className="abc-80" d="M453.71,404.77c.01.12.04.25.02.37-.01.08,0,.16.02.24-.3.07-.57.15-.85.26,0-.07.01-.14.02-.21.01-.11.03-.21.06-.31.23-.14.47-.25.73-.34Z"/>
                <path className="abc-62" d="M453.74,404.31s-.01.08-.03.11c-.04.1-.02.23,0,.34-.27.09-.5.2-.73.34.03-.1.06-.2.1-.29.01-.03.03-.07.04-.1.19-.17.39-.3.62-.41Z"/>
                <path className="abc-62" d="M453.77,404.07s-.02.09-.02.13c0,.04,0,.08-.01.11-.24.11-.43.24-.62.41.02-.03.03-.06.05-.09.02-.04.04-.07.07-.11.17-.18.34-.33.54-.45Z"/>
                <path className="abc-404" d="M453.83,403.95s-.04.08-.06.12c-.21.12-.38.27-.54.45.02-.03.05-.07.08-.1.16-.19.32-.34.53-.47Z"/>
                <path className="abc-42" d="M467,411.24c.06.14.11.28.15.42-.1,0-.2,0-.3,0-.1,0-.2,0-.31,0-.05-.13-.12-.26-.19-.39.11,0,.22,0,.32-.02.1,0,.21-.01.32-.01Z"/>
                <path className="abc-47" d="M466.45,410.33c.12.15.24.31.33.48.08.14.15.28.21.42-.11,0-.22,0-.32.01-.11,0-.22.01-.32.02-.07-.13-.15-.25-.24-.37-.11-.15-.23-.29-.35-.42.11-.03.22-.05.34-.08.11-.02.23-.05.35-.07Z"/>
                <path className="abc-398" d="M465.45,409.57c.23.11.43.24.6.37.14.11.28.25.4.4-.12.03-.24.05-.35.07-.11.02-.23.05-.34.08-.13-.13-.27-.25-.41-.35-.17-.12-.36-.24-.56-.34.11-.03.22-.07.32-.11.1-.04.22-.07.34-.11Z"/>
                <path className="abc-216" d="M464.3,409.1c.14.05.28.1.42.15.26.1.51.2.74.32-.12.03-.24.07-.34.11-.11.04-.22.07-.32.11-.2-.1-.42-.2-.66-.28-.12-.04-.25-.09-.37-.12.08-.04.17-.09.26-.14.09-.05.18-.09.28-.14Z"/>
                <path className="abc-273" d="M462.48,408.67c.47.07.94.16,1.39.29.14.04.29.09.43.13-.1.04-.19.09-.28.14-.09.05-.18.09-.26.14-.13-.04-.26-.07-.39-.11-.56-.14-1.15-.21-1.74-.26.12-.06.24-.12.39-.18.15-.06.29-.1.45-.15Z"/>
                <path className="abc-356" d="M460.11,408.4c.31.04.63.07.94.1.48.05.96.1,1.43.17-.15.05-.3.1-.45.15-.15.06-.27.12-.39.18-.58-.05-1.18-.08-1.76-.12-.41-.03-.82-.06-1.23-.09.21-.07.44-.14.69-.2.25-.06.5-.13.76-.19Z"/>
                <path className="abc-59" d="M458.36,408.1c.25.06.51.12.81.17.31.06.62.1.93.14-.26.06-.51.13-.76.19-.26.07-.48.13-.69.2-.41-.04-.82-.08-1.21-.13-.39-.05-.76-.11-1.1-.17.36-.06.74-.11,1.08-.18.31-.06.63-.14.95-.22Z"/>
                <path className="abc-83" d="M457.13,407.49c.16.16.35.29.57.39.2.09.41.16.66.22-.32.08-.64.16-.95.22-.34.07-.71.13-1.08.18-.34-.06-.65-.14-.92-.23-.32-.11-.58-.24-.76-.4.45-.05.91-.11,1.33-.17.37-.05.76-.13,1.15-.21Z"/>
                <path className="abc-208" d="M456.65,406.61c.03.09.06.17.09.25.11.26.24.46.4.63-.39.08-.78.16-1.15.21-.42.07-.88.12-1.33.17-.05-.05-.09-.1-.13-.15-.1-.16-.18-.34-.26-.55-.03-.1-.07-.2-.09-.31.4-.04.81-.09,1.24-.12.4-.04.82-.08,1.23-.13Z"/>
                <path className="abc-444" d="M456.41,406.04c.06.1.14.19.16.29.02.1.05.19.08.28-.42.04-.83.09-1.23.13-.42.04-.84.08-1.24.12-.03-.11-.05-.22-.07-.34-.02-.08-.05-.18-.09-.26.38-.04.78-.08,1.19-.12.39-.04.79-.07,1.21-.1Z"/>
                <path className="abc-58" d="M456.06,405.54c.03.07.09.14.14.21.06.1.16.19.22.29-.42.03-.82.07-1.21.1-.4.04-.8.07-1.19.12-.04-.09-.08-.18-.12-.27-.03-.06-.05-.13-.07-.19.32-.06.66-.11,1.04-.15.36-.04.76-.08,1.19-.11Z"/>
                <path className="abc-435" d="M455.89,405.07c.02.09.07.18.09.27,0,.07.05.13.08.2-.43.03-.82.07-1.19.11-.38.04-.72.09-1.04.15-.02-.06-.03-.13-.04-.18,0-.08-.03-.16-.04-.24.3-.07.62-.13.98-.18.35-.05.73-.09,1.16-.13Z"/>
                <path className="abc-258" d="M455.8,404.38c.02.14.08.28.05.42-.02.09.01.18.04.27-.43.04-.81.08-1.16.13-.36.05-.68.11-.98.18-.01-.08-.03-.16-.02-.24.02-.12-.01-.25-.02-.37.27-.09.56-.17.91-.23.34-.06.72-.11,1.19-.16Z"/>
                <path className="abc-338" d="M455.78,403.85s0,.09-.01.13c-.04.12.02.26.04.39-.46.05-.85.1-1.19.16-.35.06-.64.14-.91.23-.01-.12-.03-.24,0-.34.01-.04.02-.08.03-.11.24-.11.51-.19.85-.27.33-.07.71-.13,1.19-.19Z"/>
                <path className="abc-338" d="M455.78,403.57c-.01.05,0,.1,0,.15,0,.04,0,.09,0,.13-.48.06-.87.12-1.19.19-.34.07-.61.16-.85.27,0-.04,0-.08.01-.11,0-.04,0-.09.02-.13.21-.12.46-.22.79-.3.32-.08.72-.14,1.22-.21Z"/>
                <path className="abc-437" d="M455.84,403.42s-.04.1-.05.15c-.5.06-.9.13-1.22.21-.33.08-.58.18-.79.3.01-.04.03-.08.06-.12.21-.13.46-.23.79-.31.32-.08.71-.15,1.22-.22Z"/>
                <path className="abc-190" d="M467.37,411.2c.06.15.1.3.14.45-.02,0-.03,0-.05,0-.1,0-.21,0-.31,0-.04-.14-.09-.28-.15-.42.11,0,.22,0,.33-.01.02,0,.03-.01.04-.02Z"/>
                <path className="abc-181" d="M466.88,410.24c.11.16.21.33.29.51.07.14.14.3.19.45-.01.01-.02.02-.04.02-.11,0-.22.01-.33.01-.06-.14-.13-.28-.21-.42-.1-.17-.21-.33-.33-.48.12-.03.25-.05.37-.07.02,0,.04,0,.06-.02Z"/>
                <path className="abc-199" d="M465.87,409.45c.24.12.45.24.62.38.15.12.28.26.39.41-.02,0-.04.01-.06.02-.12.02-.25.05-.37.07-.12-.15-.26-.28-.4-.4-.17-.13-.37-.25-.6-.37.12-.03.25-.07.36-.11.02,0,.03,0,.05-.01Z"/>
                <path className="abc-288" d="M464.65,408.95c.15.05.3.11.44.16.28.11.54.22.78.34-.02,0-.03,0-.05.01-.12.04-.24.07-.36.11-.23-.11-.48-.22-.74-.32-.14-.05-.28-.1-.42-.15.1-.05.2-.09.31-.14.02,0,.03-.01.04-.02Z"/>
                <path className="abc-447" d="M463.04,408.53c.39.07.78.15,1.17.27.15.05.3.1.45.15-.01,0-.03,0-.04.02-.11.05-.21.09-.31.14-.14-.05-.28-.09-.43-.13-.45-.13-.92-.22-1.39-.29.15-.05.31-.1.48-.15.02,0,.05,0,.08,0Z"/>
                <path className="abc-297" d="M461.05,408.2c.27.05.54.09.8.14.39.06.79.12,1.18.19-.03,0-.06,0-.08,0-.17.05-.33.1-.48.15-.47-.07-.95-.12-1.43-.17-.32-.03-.63-.06-.94-.1.26-.06.53-.13.81-.18.04,0,.09-.01.13-.02Z"/>
                <path className="abc-275" d="M459.57,407.87c.21.06.44.11.68.16.27.06.54.11.81.16-.05,0-.1.01-.13.02-.28.06-.55.12-.81.18-.31-.04-.62-.08-.93-.14-.3-.05-.57-.11-.81-.17.32-.08.65-.16.99-.21.05,0,.13,0,.21,0Z"/>
                <path className="abc-262" d="M458.46,407.29c.14.16.32.27.52.37.18.09.37.15.58.21-.08,0-.17,0-.21,0-.34.06-.67.14-.99.21-.25-.06-.46-.13-.66-.22-.22-.1-.41-.23-.57-.39.39-.08.79-.16,1.18-.19.05,0,.1,0,.15,0Z"/>
                <path className="abc-332" d="M458.07,406.48c.02.08.04.15.07.23.07.24.18.43.33.59-.05,0-.1,0-.15,0-.39.04-.79.12-1.18.19-.16-.16-.29-.37-.4-.63-.03-.08-.06-.16-.09-.25.42-.04.84-.08,1.26-.11.06,0,.11-.01.16-.02Z"/>
                <path className="abc-55" d="M457.9,405.93c.04.1.08.2.12.3.01.08.03.16.05.24-.05.01-.11.02-.16.02-.42.03-.84.07-1.26.11-.03-.09-.05-.18-.08-.28-.02-.1-.11-.19-.16-.29.42-.03.85-.06,1.31-.1.07,0,.12,0,.18-.01Z"/>
                <path className="abc-167" d="M457.69,405.42c.02.07.05.14.08.21.04.1.09.2.13.3-.06,0-.12,0-.18.01-.45.03-.89.06-1.31.1-.06-.1-.16-.19-.22-.29-.04-.07-.1-.14-.14-.21.43-.03.9-.07,1.41-.11.07,0,.15-.01.22-.02Z"/>
                <path className="abc-452" d="M457.6,404.92c0,.1.02.19.04.29.01.07.03.14.05.21-.08,0-.15.01-.22.02-.51.04-.98.07-1.41.11-.03-.07-.08-.14-.08-.2-.01-.09-.06-.18-.09-.27.43-.04.92-.08,1.47-.13.08,0,.16-.01.24-.02Z"/>
                <path className="abc-336" d="M457.71,404.2c-.02.14-.04.29-.09.44-.03.1-.03.19-.03.29-.08,0-.16.01-.24.02-.55.04-1.04.08-1.47.13-.02-.09-.06-.18-.04-.27.04-.14-.03-.28-.05-.42.46-.05,1-.1,1.63-.16.09,0,.18-.02.28-.02Z"/>
                <path className="abc-7" d="M457.84,403.64s-.03.09-.04.14c-.04.13-.06.27-.08.41-.1,0-.19.02-.28.02-.63.06-1.17.1-1.63.16-.02-.14-.08-.27-.04-.39.01-.04,0-.09.01-.13.48-.06,1.05-.12,1.76-.18.1,0,.2-.02.31-.03Z"/>
                <path className="abc-248" d="M457.96,403.34c-.03.05-.05.11-.07.16-.02.05-.03.09-.05.14-.1,0-.21.02-.31.03-.7.06-1.28.12-1.76.18,0-.04,0-.09,0-.13,0-.05,0-.1,0-.15.5-.06,1.1-.12,1.84-.19.11,0,.22-.02.33-.03Z"/>
                <path className="abc-439" d="M458.05,403.18c-.04.05-.07.11-.1.16-.11.01-.22.02-.33.03-.74.07-1.34.13-1.84.19.01-.05.02-.1.05-.15.51-.07,1.12-.13,1.88-.2.11-.01.22-.02.34-.03Z"/>
                <path className="abc-190" d="M467.72,411.19c.05.16.09.32.12.47-.1,0-.19,0-.29,0h-.05c-.04-.15-.08-.3-.14-.45.01-.01.02-.02.04-.02.1,0,.21,0,.31,0Z"/>
                <path className="abc-181" d="M467.28,410.17c.11.17.19.35.26.54.06.15.12.31.17.47-.11,0-.21-.02-.31,0-.02,0-.03.01-.04.02-.06-.15-.12-.3-.19-.45-.08-.18-.18-.35-.29-.51.02,0,.04-.01.06-.02.11-.02.23-.04.35-.06Z"/>
                <path className="abc-199" d="M466.27,409.34c.25.12.46.25.63.39.15.12.28.27.38.44-.12.02-.24.04-.35.06-.02,0-.04,0-.06.02-.11-.16-.25-.3-.39-.41-.17-.13-.38-.26-.62-.38.02,0,.03,0,.05-.01.11-.03.23-.07.35-.1Z"/>
                <path className="abc-383" d="M465,408.81c.15.06.31.12.46.18.29.11.57.23.81.36-.12.03-.24.06-.35.1-.02,0-.03,0-.05.01-.24-.12-.5-.23-.78-.34-.15-.06-.29-.11-.44-.16.01,0,.03,0,.04-.01.1-.04.2-.08.31-.13Z"/>
                <path className="abc-447" d="M463.57,408.39c.33.08.65.15.97.26.15.05.31.11.46.17-.11.04-.21.08-.31.13-.02,0-.03.01-.04.01-.15-.05-.3-.1-.45-.15-.38-.11-.77-.2-1.17-.27.03,0,.06,0,.08,0,.15-.04.3-.09.45-.14Z"/>
                <path className="abc-256" d="M461.91,408.01c.23.05.45.11.67.16.33.08.65.14.98.22-.15.05-.3.1-.45.14-.02,0-.05,0-.08,0-.39-.07-.79-.13-1.18-.19-.27-.04-.54-.09-.8-.14.05,0,.1-.01.14-.02.25-.05.49-.11.73-.17Z"/>
                <path className="abc-275" d="M460.67,407.67c.18.06.37.11.56.16.23.06.45.12.68.17-.24.06-.48.12-.73.17-.04,0-.09.01-.14.02-.27-.05-.54-.1-.81-.16-.24-.05-.46-.1-.68-.16.08,0,.17,0,.21,0,.31-.05.6-.13.89-.2Z"/>
                <path className="abc-170" d="M459.71,407.1c.13.14.28.26.46.36.16.08.32.15.5.21-.29.07-.59.14-.89.2-.05,0-.13,0-.21,0-.21-.06-.41-.13-.58-.21-.2-.1-.37-.22-.52-.37.05,0,.1,0,.15,0,.35-.04.73-.11,1.09-.18Z"/>
                <path className="abc-233" d="M459.36,406.37c.02.07.04.14.06.2.06.21.16.39.29.53-.37.07-.74.14-1.09.18-.05,0-.1,0-.15,0-.14-.16-.25-.35-.33-.59-.03-.07-.05-.15-.07-.23.05-.01.11-.02.16-.02.38-.03.76-.06,1.13-.08Z"/>
                <path className="abc-361" d="M459.2,405.85c.04.1.08.2.11.31.01.07.03.14.04.21-.38.03-.76.05-1.13.08-.06,0-.11.01-.16.02-.02-.08-.04-.16-.05-.24-.03-.1-.07-.2-.12-.3.06,0,.12,0,.19-.01.37-.02.75-.05,1.12-.07Z"/>
                <path className="abc-453" d="M459.01,405.33c.02.07.04.14.07.22.04.1.08.2.12.3-.37.02-.74.05-1.12.07-.07,0-.13,0-.19.01-.04-.1-.09-.2-.13-.3-.03-.07-.06-.14-.08-.21.08,0,.15-.01.23-.02.37-.03.73-.05,1.1-.07Z"/>
                <path className="abc-7" d="M458.9,404.83c.02.1.06.19.07.29,0,.07.02.14.04.22-.36.02-.73.05-1.1.07-.08,0-.15.01-.23.02-.02-.07-.04-.14-.05-.21-.02-.1-.03-.19-.04-.29.08,0,.17-.01.25-.02.24-.02.49-.04.75-.06.1,0,.2-.01.31-.02Z"/>
                <path className="abc-134" d="M459.02,404.09c-.03.14-.07.29-.13.44-.03.1,0,.19.01.29-.1,0-.21.01-.31.02-.25.02-.5.04-.75.06-.08,0-.17.01-.25.02,0-.1,0-.19.03-.29.05-.15.07-.3.09-.44.1,0,.19-.02.29-.02.23-.02.48-.04.72-.06.1,0,.2-.01.3-.02Z"/>
                <path className="abc-351" d="M459.16,403.53s-.03.1-.04.14c-.04.14-.07.28-.1.42-.1,0-.2.01-.3.02-.24.02-.49.04-.72.06-.1,0-.2.02-.29.02.02-.14.04-.28.08-.41.01-.05.03-.1.04-.14.1,0,.21-.02.32-.03.34-.03.67-.06,1-.08Z"/>
                <path className="abc-425" d="M459.3,403.22c-.03.05-.06.11-.09.17-.02.05-.04.09-.05.14-.33.03-.67.05-1,.08-.11,0-.22.02-.32.03.01-.05.03-.09.05-.14.02-.05.04-.11.07-.16.11-.01.23-.02.35-.03.34-.03.67-.06,1-.09Z"/>
                <path className="abc-34" d="M459.41,403.06c-.04.05-.08.11-.11.16-.33.03-.66.06-1,.09-.12.01-.23.02-.35.03.03-.05.06-.11.1-.16.11-.01.23-.02.35-.03.34-.03.67-.06,1.01-.09Z"/>
                <path className="abc-410" d="M468.48,411.13c.03.17.06.35.08.52-.14,0-.29,0-.43,0-.1,0-.2,0-.29,0-.03-.15-.07-.31-.12-.47.11,0,.22.02.32,0,.15,0,.3-.04.44-.06Z"/>
                <path className="abc-164" d="M468.18,410.02c.09.18.15.38.19.59.04.17.08.35.11.52-.15.03-.29.05-.44.06-.11,0-.21,0-.32,0-.05-.16-.1-.32-.17-.47-.07-.19-.16-.38-.26-.54.12-.02.24-.04.36-.06.17-.03.35-.06.54-.1Z"/>
                <path className="abc-15" d="M467.19,409.13c.25.13.47.27.64.41.15.14.27.3.36.48-.18.03-.36.07-.54.1-.12.02-.24.04-.36.06-.11-.17-.23-.31-.38-.44-.17-.13-.38-.26-.63-.39.12-.03.25-.06.37-.09.17-.05.36-.09.54-.12Z"/>
                <path className="abc-139" d="M465.86,408.54c.16.07.33.13.48.2.3.13.59.26.84.39-.19.04-.37.08-.54.12-.12.03-.25.06-.37.09-.25-.12-.52-.24-.81-.36-.15-.06-.31-.12-.46-.18.11-.04.22-.08.34-.12.16-.06.34-.11.52-.15Z"/>
                <path className="abc-161" d="M464.72,408.07c.23.09.43.17.65.26.16.07.33.13.49.2-.19.05-.36.09-.52.15-.11.04-.23.08-.34.12-.15-.06-.31-.11-.46-.17-.32-.1-.64-.18-.97-.26.15-.05.3-.1.46-.15.24-.07.46-.12.69-.17Z"/>
                <path className="abc-84" d="M463.64,407.63c.14.06.28.12.42.18.22.09.42.18.65.26-.23.05-.45.1-.69.17-.16.05-.31.1-.46.15-.33-.08-.66-.14-.98-.22-.22-.05-.45-.11-.67-.16.24-.06.48-.12.72-.17.36-.07.69-.14,1.01-.2Z"/>
                <path className="abc-48" d="M462.83,407.24c.12.07.25.14.4.2.14.06.27.13.41.19-.32.06-.66.13-1.01.2-.24.05-.48.11-.72.17-.23-.05-.45-.11-.68-.17-.19-.05-.38-.1-.56-.16.29-.07.58-.14.88-.19.42-.07.86-.16,1.28-.24Z"/>
                <path className="abc-363" d="M462.21,406.7c.09.12.18.22.29.31.1.08.21.16.33.23-.42.08-.86.17-1.28.24-.3.05-.59.12-.88.19-.18-.06-.35-.13-.5-.21-.18-.1-.33-.21-.46-.36.37-.07.73-.14,1.07-.18.48-.04.96-.14,1.43-.23Z"/>
                <path className="abc-296" d="M461.94,406.17s.03.09.05.14c.06.15.13.27.22.39-.46.09-.95.18-1.43.23-.34.04-.7.11-1.07.18-.13-.14-.23-.32-.29-.53-.02-.07-.04-.13-.06-.2.38-.03.75-.05,1.11-.08.51-.03,1.01-.08,1.48-.12Z"/>
                <path className="abc-76" d="M461.78,405.72c.03.1.08.2.11.3.02.05.03.1.05.15-.47.04-.97.09-1.48.12-.36.03-.73.05-1.11.08-.02-.07-.03-.14-.04-.21-.03-.1-.07-.2-.11-.31.37-.02.74-.04,1.1-.06.52-.03,1.01-.05,1.48-.07Z"/>
                <path className="abc-259" d="M461.66,405.2c0,.07.02.14.03.22.02.1.06.2.09.3-.47.02-.96.05-1.48.07-.36.02-.73.04-1.1.06-.04-.1-.09-.2-.12-.3-.03-.07-.05-.14-.07-.22.36-.02.72-.04,1.09-.06.52-.03,1.04-.05,1.55-.07Z"/>
                <path className="abc-242" d="M461.6,404.69c0,.1.07.19.05.29-.01.07,0,.14,0,.22-.51.02-1.03.05-1.55.07-.37.02-.73.04-1.09.06-.02-.07-.03-.14-.04-.22,0-.1-.05-.19-.07-.29.35-.02.71-.04,1.08-.06.52-.03,1.06-.05,1.62-.07Z"/>
                <path className="abc-29" d="M461.76,403.96c-.07.15-.08.29-.16.44-.05.1,0,.19,0,.29-.56.02-1.1.05-1.62.07-.37.02-.73.04-1.08.06-.02-.1-.04-.19-.01-.29.05-.15.1-.3.13-.44.33-.02.68-.04,1.04-.06.51-.03,1.07-.05,1.7-.07Z"/>
                <path className="abc-124" d="M461.99,403.39s-.04.1-.07.15c-.08.14-.09.28-.16.43-.62.02-1.19.05-1.7.07-.36.02-.71.04-1.04.06.03-.14.07-.28.1-.42.01-.05.03-.1.04-.14.33-.03.67-.05,1-.07.51-.03,1.13-.05,1.83-.08Z"/>
                <path className="abc-6" d="M462.19,403.07c-.05.06-.07.11-.11.17-.04.05-.05.1-.08.14-.7.03-1.32.05-1.83.08-.34.02-.67.04-1,.07.02-.05.03-.1.05-.14.02-.06.05-.11.09-.17.33-.03.66-.05,1-.07.51-.03,1.15-.05,1.89-.08Z"/>
                <path className="abc-99" d="M462.32,402.91c-.06.05-.09.11-.13.16-.74.03-1.37.06-1.89.08-.34.02-.67.04-1,.07.03-.05.07-.11.11-.16.34-.03.67-.05,1.01-.07.51-.03,1.15-.06,1.9-.08Z"/>
                <path className="abc-2" d="M469.6,411.1c.04.18.07.37.1.54-.24,0-.48,0-.71,0-.15,0-.29,0-.44,0-.02-.16-.05-.34-.08-.52.15-.03.29-.05.45-.05.22,0,.44,0,.67.02Z"/>
                <path className="abc-418" d="M469.27,409.96c.1.19.16.39.21.61.05.17.09.36.13.54-.23-.01-.45-.03-.67-.02-.16,0-.31.03-.45.05-.03-.17-.07-.35-.11-.52-.04-.21-.1-.41-.19-.59.18-.03.37-.06.55-.08.19,0,.36.01.54.03Z"/>
                <path className="abc-399" d="M468.26,408.97c.24.16.46.32.63.48.15.15.27.32.37.51-.17-.01-.34-.03-.54-.03-.18.02-.37.05-.55.08-.09-.18-.21-.34-.36-.48-.16-.14-.39-.28-.64-.41.19-.04.38-.07.58-.11.18-.01.34-.03.5-.05Z"/>
                <path className="abc-274" d="M467,408.27c.16.08.31.15.46.23.28.15.56.31.8.47-.16.02-.32.04-.5.05-.19.04-.39.07-.58.11-.25-.13-.54-.26-.84-.39-.16-.07-.32-.13-.48-.2.19-.05.38-.09.58-.13.19-.04.37-.09.56-.13Z"/>
                <path className="abc-395" d="M466.08,407.81c.16.09.3.17.45.24.16.07.32.15.47.22-.19.04-.37.09-.56.13-.2.04-.39.09-.58.13-.16-.07-.33-.13-.49-.2-.23-.09-.43-.18-.65-.26.23-.05.45-.09.69-.15.22-.04.44-.08.67-.12Z"/>
                <path className="abc-354" d="M465.34,407.32c.09.06.18.13.28.2.15.1.3.2.46.29-.23.04-.46.08-.67.12-.24.05-.47.1-.69.15-.23-.09-.43-.17-.65-.26-.15-.06-.28-.12-.42-.18.32-.06.63-.12.93-.17.26-.04.51-.09.77-.14Z"/>
                <path className="abc-407" d="M464.83,406.91c.08.08.17.16.26.23.08.06.16.12.25.18-.25.05-.51.1-.77.14-.3.06-.61.11-.93.17-.14-.06-.27-.12-.41-.19-.15-.07-.28-.13-.4-.2.42-.08.82-.16,1.16-.21.27-.03.55-.08.84-.12Z"/>
                <path className="abc-194" d="M464.38,406.38c.07.1.14.19.22.29.07.08.14.16.22.24-.28.04-.56.08-.84.12-.34.05-.74.13-1.16.21-.12-.07-.23-.15-.33-.23-.11-.09-.21-.2-.29-.31.46-.09.91-.18,1.29-.21.28-.02.58-.07.88-.11Z"/>
                <path className="abc-86" d="M464.12,406s.04.06.06.09c.07.1.13.19.2.29-.3.04-.61.08-.88.11-.38.03-.83.12-1.29.21-.09-.12-.15-.24-.22-.39-.02-.05-.03-.09-.05-.14.47-.04.92-.09,1.32-.11.28-.02.56-.04.85-.06Z"/>
                <path className="abc-317" d="M464,405.62c0,.1.03.2.06.3.02.03.04.06.06.09-.29.02-.57.04-.85.06-.41.02-.85.06-1.32.11-.02-.05-.03-.1-.05-.15-.03-.1-.08-.2-.11-.3.47-.02.93-.04,1.37-.06.28-.01.56-.03.84-.04Z"/>
                <path className="abc-152" d="M464.04,405.1c-.02.07-.03.14-.04.22-.01.1-.01.2,0,.3-.28.01-.56.02-.84.04-.45.02-.9.04-1.37.06-.03-.1-.08-.2-.09-.3-.01-.07-.03-.14-.03-.22.51-.02,1.02-.04,1.52-.06.28-.01.57-.02.86-.03Z"/>
                <path className="abc-423" d="M464.18,404.6c-.03.1-.06.19-.08.28-.02.07-.04.14-.05.22-.29,0-.58.02-.86.03-.51.02-1.01.04-1.52.06,0-.07-.01-.14,0-.22.02-.1-.05-.19-.05-.29.56-.02,1.15-.05,1.75-.07.27,0,.55-.01.82-.02Z"/>
                <path className="abc-224" d="M464.55,403.88c-.1.15-.19.29-.26.44-.05.1-.08.19-.11.28-.27,0-.55.01-.82.02-.6.02-1.19.05-1.75.07,0-.1-.05-.19,0-.29.07-.15.09-.3.16-.44.62-.02,1.31-.05,2.06-.07.24,0,.49,0,.73,0Z"/>
                <path className="abc-222" d="M465.01,403.3c-.04.05-.09.1-.13.15-.12.14-.23.29-.33.43-.24,0-.49,0-.73,0-.75.03-1.44.05-2.06.07.07-.15.08-.29.16-.43.03-.05.04-.1.07-.15.7-.03,1.49-.05,2.34-.08.22,0,.45,0,.68,0Z"/>
                <path className="abc-278" d="M465.31,402.97c-.05.06-.11.12-.16.18-.05.05-.09.1-.13.15-.23,0-.46,0-.68,0-.85.03-1.64.06-2.34.08.03-.05.05-.1.08-.14.04-.06.06-.11.11-.17.74-.03,1.57-.06,2.48-.09.21,0,.42-.01.64-.01Z"/>
                <path className="abc-155" d="M465.47,402.8c-.05.06-.11.11-.16.17-.22,0-.43,0-.64.01-.91.03-1.74.06-2.48.09.05-.06.08-.11.13-.16.75-.03,1.6-.06,2.54-.09.2,0,.4-.01.61-.02Z"/>
                <path className="abc-221" d="M470.62,411.14c.07.17.12.34.17.5-.12,0-.24,0-.36,0-.25,0-.49,0-.73,0-.03-.18-.06-.36-.1-.54.23.01.46.03.69.03.11,0,.22,0,.33,0Z"/>
                <path className="abc-211" d="M470.1,410.03c.12.19.22.39.31.6.08.17.15.34.22.51-.11,0-.22,0-.33,0-.23,0-.46-.02-.69-.03-.04-.18-.08-.36-.13-.54-.04-.22-.11-.42-.21-.61.17.01.35.03.55.04.1,0,.19.01.28.03Z"/>
                <path className="abc-295" d="M469.06,408.95c.23.18.45.37.63.55.15.16.29.34.4.53-.09-.01-.18-.02-.28-.03-.2-.01-.38-.03-.55-.04-.1-.19-.22-.36-.37-.51-.17-.16-.39-.32-.63-.48.16-.02.33-.03.53-.03.1,0,.18,0,.27.01Z"/>
                <path className="abc-97" d="M467.91,408.14c.14.09.27.18.41.27.26.17.51.35.74.54-.09,0-.17-.01-.27-.01-.21,0-.37.02-.53.03-.24-.16-.52-.32-.8-.47-.15-.08-.31-.16-.46-.23.19-.04.39-.08.61-.11.11-.01.2-.02.3-.02Z"/>
                <path className="abc-405" d="M467.13,407.66c.13.09.25.17.37.23.13.08.27.16.41.25-.1,0-.19,0-.3.02-.22.03-.42.07-.61.11-.16-.08-.31-.15-.47-.22-.15-.07-.29-.15-.45-.24.23-.04.47-.07.71-.1.12-.02.23-.03.34-.04Z"/>
                <path className="abc-25" d="M466.52,407.18c.07.06.15.13.23.19.12.1.25.2.37.29-.11.01-.22.03-.34.04-.24.03-.48.07-.71.1-.16-.09-.31-.19-.46-.29-.1-.07-.19-.13-.28-.2.25-.05.51-.09.78-.13.13-.01.27-.02.41-.02Z"/>
                <path className="abc-98" d="M466.07,406.78c.07.07.16.15.25.22.06.06.13.12.21.18-.14,0-.28,0-.41.02-.27.03-.52.08-.78.13-.09-.06-.17-.13-.25-.18-.1-.07-.18-.15-.26-.23.28-.04.56-.08.84-.11.14-.01.27-.02.41-.02Z"/>
                <path className="abc-245" d="M465.66,406.29c.07.09.14.18.21.26.06.08.13.15.21.23-.14,0-.27,0-.41.02-.27.03-.56.07-.84.11-.08-.08-.15-.16-.22-.24-.08-.09-.15-.19-.22-.29.3-.04.61-.08.88-.1.14,0,.26,0,.39,0Z"/>
                <path className="abc-58" d="M465.39,405.94s.04.05.06.08c.07.09.14.17.2.26-.13,0-.25-.02-.39,0-.28.02-.58.06-.88.1-.07-.1-.14-.19-.2-.29-.02-.03-.04-.06-.06-.09.29-.02.57-.04.85-.05.14,0,.28,0,.42,0Z"/>
                <path className="abc-58" d="M465.27,405.58c0,.1.02.19.05.29.02.02.05.05.07.08-.14,0-.28,0-.42,0-.28.01-.56.03-.85.05-.02-.03-.04-.06-.06-.09-.03-.1-.05-.2-.06-.3.28-.01.56-.02.84-.03.14,0,.28,0,.44,0Z"/>
                <path className="abc-8" d="M465.32,405.08c-.01.07-.03.14-.03.21,0,.1-.02.19-.01.29-.15,0-.3,0-.44,0-.28,0-.56.02-.84.03,0-.1,0-.2,0-.3,0-.07.02-.14.04-.22.29,0,.58-.01.86-.02.14,0,.28,0,.42,0Z"/>
                <path className="abc-287" d="M465.41,404.59c-.02.09-.03.19-.05.28-.01.07-.03.14-.04.21-.14,0-.28,0-.42,0-.28,0-.57,0-.86.02.02-.07.03-.14.05-.22.03-.1.05-.19.08-.28.27,0,.55,0,.82-.01.13,0,.27,0,.41,0Z"/>
                <path className="abc-307" d="M465.67,403.87c-.08.15-.15.29-.19.44-.03.09-.05.19-.06.28-.14,0-.28,0-.41,0-.27,0-.55,0-.82.01.03-.1.07-.19.11-.28.07-.15.16-.3.26-.44.24,0,.49,0,.74-.01.12,0,.25,0,.38,0Z"/>
                <path className="abc-26" d="M466.05,403.28c-.04.05-.07.1-.11.15-.1.14-.19.29-.27.43-.13,0-.26,0-.38,0-.25,0-.49,0-.74.01.1-.15.21-.29.33-.43.04-.05.09-.1.13-.15.23,0,.46,0,.69-.01.11,0,.23,0,.35,0Z"/>
                <path className="abc-249" d="M466.29,402.95c-.04.06-.09.12-.13.18-.04.05-.07.1-.11.15-.12,0-.23,0-.35,0-.23,0-.46,0-.69.01.04-.05.09-.1.13-.15.05-.06.11-.12.16-.18.22,0,.44,0,.66-.02.11,0,.21,0,.32,0Z"/>
                <path className="abc-448" d="M466.41,402.77c-.04.06-.08.12-.13.18-.11,0-.22,0-.32,0-.22,0-.44.01-.66.02.05-.06.11-.11.16-.17.21,0,.42-.01.63-.02.1,0,.21,0,.31,0Z"/>
                <path className="abc-290" d="M472,411.22c.1.15.22.28.31.42-.39,0-.77,0-1.15,0-.12,0-.24,0-.36,0-.05-.16-.11-.33-.17-.5.11,0,.22,0,.33,0,.34.01.68.04,1.04.07Z"/>
                <path className="abc-381" d="M471.2,410.2c.15.19.32.39.45.58.11.15.25.29.35.44-.36-.03-.71-.06-1.04-.07-.11,0-.22,0-.33,0-.07-.17-.14-.34-.22-.51-.09-.21-.19-.41-.31-.6.09.01.18.03.28.04.26.03.53.08.82.13Z"/>
                <path className="abc-374" d="M470.05,409.01c.21.21.45.42.65.63.17.18.35.37.5.56-.29-.05-.56-.1-.82-.13-.1-.01-.19-.03-.28-.04-.12-.19-.25-.37-.4-.53-.18-.18-.4-.37-.63-.55.09,0,.17.02.27.03.23.01.46.02.72.04Z"/>
                <path className="abc-117" d="M469.06,408.1c.1.1.22.2.33.31.21.2.45.4.66.61-.27-.01-.49-.02-.72-.04-.1,0-.18-.02-.27-.03-.23-.18-.49-.36-.74-.54-.14-.09-.27-.18-.41-.27.1,0,.19,0,.3,0,.24-.01.52-.03.85-.04Z"/>
                <path className="abc-92" d="M468.5,407.56c.08.09.16.17.25.24.09.09.2.19.3.29-.33.01-.61.03-.85.04-.11,0-.2,0-.3,0-.14-.09-.27-.17-.41-.25-.12-.06-.24-.14-.37-.23.11-.01.22-.02.34-.03.28-.02.63-.04,1.03-.06Z"/>
                <path className="abc-89" d="M468.15,407.08c.05.06.09.13.14.19.07.1.12.2.21.29-.4.02-.75.04-1.03.06-.12,0-.23.02-.34.03-.13-.09-.25-.19-.37-.29-.08-.06-.16-.13-.23-.19.14,0,.28,0,.41,0,.35-.02.76-.06,1.21-.08Z"/>
                <path className="abc-163" d="M467.84,406.69c.05.07.11.13.17.2.05.07.09.13.14.19-.45.03-.86.06-1.21.08-.13,0-.27,0-.41,0-.07-.06-.14-.12-.21-.18-.09-.07-.17-.14-.25-.22.14,0,.27,0,.42,0,.39-.02.85-.05,1.35-.08Z"/>
                <path className="abc-233" d="M467.54,406.24c.05.08.1.16.15.24.05.07.1.14.15.21-.5.03-.96.06-1.35.08-.14,0-.28,0-.42,0-.07-.07-.14-.15-.21-.23-.07-.09-.14-.17-.21-.26.13,0,.26.02.42.01.44-.01.93-.04,1.47-.06Z"/>
                <path className="abc-176" d="M467.38,405.91s.02.05.04.08c.04.09.09.17.13.25-.53.02-1.03.04-1.47.06-.16,0-.29,0-.42-.01-.07-.09-.13-.18-.2-.26-.02-.03-.04-.06-.06-.08.14,0,.3,0,.46,0,.47-.01.98-.02,1.52-.03Z"/>
                <path className="abc-176" d="M467.28,405.56c.02.09.03.18.06.27.01.03.03.05.04.08-.55,0-1.06.02-1.52.03-.16,0-.31,0-.46,0-.02-.03-.05-.05-.07-.08-.03-.09-.04-.19-.05-.29.15,0,.31,0,.46,0,.46,0,.99-.01,1.54-.01Z"/>
                <path className="abc-246" d="M467.25,405.08c0,.07,0,.13,0,.2,0,.09,0,.18.03.28-.56,0-1.08,0-1.54.01-.16,0-.31,0-.46,0,0-.1,0-.19.01-.29,0-.07.02-.14.03-.21.14,0,.28,0,.42,0,.45,0,.97,0,1.5,0Z"/>
                <path className="abc-283" d="M467.27,404.6c0,.09-.02.18-.02.28,0,.07,0,.13,0,.2-.54,0-1.05,0-1.5,0-.14,0-.28,0-.42,0,.01-.07.03-.14.04-.21.02-.09.03-.19.05-.28.14,0,.28,0,.43,0,.44,0,.93,0,1.43.01Z"/>
                <path className="abc-382" d="M467.37,403.88c-.03.15-.06.3-.07.44,0,.09-.03.19-.03.28-.5,0-.99,0-1.43-.01-.14,0-.29,0-.43,0,.02-.09.03-.19.06-.28.05-.15.12-.29.19-.44.13,0,.27,0,.41,0,.41,0,.85,0,1.3.01Z"/>
                <path className="abc-95" d="M467.54,403.28c-.02.05-.04.11-.05.16-.05.15-.09.3-.12.45-.45,0-.89-.01-1.3-.01-.14,0-.27,0-.41,0,.08-.15.17-.29.27-.43.03-.05.07-.1.11-.15.12,0,.24,0,.36,0,.36,0,.75,0,1.14,0Z"/>
                <path className="abc-403" d="M467.67,402.92c-.02.06-.05.13-.07.19-.02.05-.04.11-.06.16-.39,0-.78,0-1.14,0-.12,0-.24,0-.36,0,.04-.05.07-.1.11-.15.04-.06.09-.12.13-.18.11,0,.22,0,.33,0,.34,0,.69-.01,1.05-.02Z"/>
                <path className="abc-375" d="M467.74,402.73c-.02.06-.05.13-.07.19-.36,0-.71.01-1.05.02-.11,0-.22,0-.33,0,.04-.06.09-.12.13-.18.11,0,.21,0,.32,0,.33,0,.66-.02,1.01-.03Z"/>
                <path className="abc-71" d="M473.47,411.26c.11.13.21.25.3.37-.1,0-.19,0-.29,0-.4,0-.79,0-1.18,0-.09-.14-.2-.27-.31-.42.36.03.73.05,1.12.05.12,0,.23,0,.35,0Z"/>
                <path className="abc-329" d="M472.68,410.29c.14.19.3.39.44.57.11.14.23.28.34.41-.12,0-.23,0-.35,0-.39,0-.76-.03-1.12-.05-.1-.15-.24-.29-.35-.44-.13-.19-.3-.39-.45-.58.29.05.61.1.99.12.17,0,.33-.02.5-.03Z"/>
                <path className="abc-185" d="M471.79,409.04c.16.22.33.44.47.67.12.19.27.39.42.58-.17.01-.33.03-.5.03-.37-.02-.69-.07-.99-.12-.15-.19-.33-.38-.5-.56-.2-.21-.44-.42-.65-.63.27.01.58.03.99.05.23-.01.49-.02.75-.02Z"/>
                <path className="abc-387" d="M471.16,408.05c.06.11.13.21.19.33.13.22.28.44.44.66-.26,0-.52.01-.75.02-.41-.02-.72-.04-.99-.05-.21-.21-.46-.41-.66-.61-.11-.1-.23-.21-.33-.31.33-.01.73-.02,1.2-.03.29,0,.59-.01.9-.02Z"/>
                <path className="abc-361" d="M470.91,407.48c.02.09.05.18.09.26.04.1.09.2.15.31-.32,0-.62,0-.9.02-.47,0-.86.02-1.2.03-.1-.1-.21-.2-.3-.29-.1-.07-.17-.16-.25-.24.4-.02.85-.04,1.35-.05.33,0,.69-.02,1.06-.03Z"/>
                <path className="abc-322" d="M470.85,407.01c.01.06.02.13.03.19,0,.1.01.19.03.28-.37.01-.73.02-1.06.03-.5.01-.95.03-1.35.05-.08-.09-.14-.19-.21-.29-.05-.06-.09-.13-.14-.19.45-.03.95-.05,1.47-.06.39,0,.8-.01,1.23-.01Z"/>
                <path className="abc-182" d="M470.76,406.62c0,.07.02.13.04.2.02.06.04.13.05.19-.43,0-.84,0-1.23.01-.52,0-1.02.03-1.47.06-.05-.06-.09-.13-.14-.19-.06-.07-.11-.13-.17-.2.5-.03,1.04-.05,1.58-.06.43,0,.87,0,1.34-.01Z"/>
                <path className="abc-306" d="M470.73,406.19c0,.08,0,.15.01.23,0,.07.01.13.02.2-.46,0-.91,0-1.34.01-.55,0-1.08.03-1.58.06-.05-.07-.1-.14-.15-.21-.05-.08-.1-.16-.15-.24.53-.02,1.1-.04,1.69-.04.48,0,.98,0,1.49,0Z"/>
                <path className="abc-328" d="M470.7,405.88s0,.05.01.07c.01.08.01.16.02.24-.51,0-1.01,0-1.49,0-.59,0-1.16.02-1.69.04-.05-.08-.09-.17-.13-.25-.01-.03-.02-.06-.04-.08.55,0,1.13-.02,1.75-.02.51,0,1.04,0,1.58,0Z"/>
                <path className="abc-328" d="M470.62,405.54c.02.09.05.18.07.27,0,.02.01.05.02.07-.54,0-1.07,0-1.58,0-.61,0-1.2.01-1.75.02-.01-.03-.03-.05-.04-.08-.03-.09-.04-.18-.06-.27.56,0,1.14,0,1.73-.01.52,0,1.05,0,1.61,0Z"/>
                <path className="abc-151" d="M470.5,405.06c.01.07.03.13.04.2.02.09.05.19.07.28-.55,0-1.09,0-1.61,0-.59,0-1.18,0-1.73.01-.02-.09-.02-.18-.03-.28,0-.07,0-.13,0-.2.54,0,1.1,0,1.64,0,.52,0,1.06-.01,1.62-.01Z"/>
                <path className="abc-124" d="M470.42,404.58c.01.09.03.18.04.28.01.07.02.14.04.2-.56,0-1.1,0-1.62.01-.54,0-1.1,0-1.64,0,0-.07,0-.13,0-.2,0-.09.01-.18.02-.28.5,0,1.02,0,1.53,0,.52,0,1.07-.01,1.62-.02Z"/>
                <path className="abc-289" d="M470.38,403.86c0,.15,0,.3.01.45,0,.09.01.19.03.28-.56,0-1.1.01-1.62.02-.5,0-1.02,0-1.53,0,0-.09.02-.18.03-.28.01-.15.04-.3.07-.44.45,0,.91,0,1.36,0,.53-.01,1.08-.02,1.65-.03Z"/>
                <path className="abc-451" d="M470.38,403.23c0,.06,0,.11,0,.17,0,.16,0,.31,0,.46-.57,0-1.12.02-1.65.03-.45,0-.91,0-1.36,0,.03-.15.08-.3.12-.45.02-.05.03-.11.05-.16.39,0,.79,0,1.19,0,.53-.01,1.08-.02,1.65-.04Z"/>
                <path className="abc-228" d="M470.42,402.86c0,.07-.02.14-.02.2,0,.06,0,.11-.01.17-.57.01-1.12.02-1.65.04-.4,0-.8,0-1.19,0,.02-.05.04-.11.06-.16.02-.06.05-.13.07-.19.36,0,.72-.01,1.1-.02.54-.01,1.09-.03,1.65-.04Z"/>
                <path className="abc-231" d="M470.45,402.66c-.01.07-.02.14-.03.21-.56.01-1.11.03-1.65.04-.37,0-.74.02-1.1.02.02-.06.05-.13.07-.19.34,0,.69-.02,1.05-.03.54-.01,1.09-.03,1.65-.04Z"/>
                <path className="abc-271" d="M474.21,411.22c.06.14.12.29.16.42-.1,0-.21,0-.31,0-.1,0-.19,0-.29,0-.09-.12-.19-.24-.3-.37.12,0,.23-.01.35-.02.13,0,.26-.02.39-.03Z"/>
                <path className="abc-265" d="M473.8,410.19c.06.19.14.39.21.57.06.15.13.3.2.45-.13,0-.26.02-.39.03-.12,0-.24.02-.35.02-.11-.13-.23-.26-.34-.41-.14-.18-.3-.38-.44-.57.17-.01.34-.03.53-.05.2-.01.39-.03.59-.05Z"/>
                <path className="abc-298" d="M473.54,409c.05.19.11.38.14.57,0,.02,0,.04.01.06,0,.18.05.37.11.57-.2.02-.39.03-.59.05-.19.01-.36.03-.53.05-.14-.19-.29-.39-.42-.58-.15-.23-.32-.45-.47-.67.26,0,.54,0,.82-.02.29,0,.61-.01.94-.02Z"/>
                <path className="abc-341" d="M473.33,408.04c0,.11.03.22.05.33.04.22.11.42.17.63-.33,0-.64.01-.94.02-.28,0-.55.01-.82.02-.16-.22-.32-.44-.44-.66-.06-.11-.14-.22-.19-.33.32,0,.65,0,1,0,.37,0,.76,0,1.17,0Z"/>
                <path className="abc-54" d="M473.42,407.45c-.05.09-.08.18-.09.26,0,0,0,0,0,0-.02.11-.01.22,0,.33-.41,0-.8,0-1.17,0-.35,0-.68,0-1,0-.06-.11-.11-.21-.15-.31-.04-.08-.07-.17-.09-.26.37-.01.76-.02,1.17-.03.43,0,.88,0,1.34,0Z"/>
                <path className="abc-243" d="M473.69,407c-.03.06-.06.12-.1.18-.06.09-.12.18-.17.27-.46,0-.9,0-1.34,0-.41,0-.8.01-1.17.03-.02-.09-.03-.19-.03-.28-.01-.06-.02-.12-.03-.19.43,0,.88,0,1.33,0,.49,0,.99,0,1.51,0Z"/>
                <path className="abc-162" d="M473.79,406.61c-.03.07-.05.13-.05.2,0,.06-.02.13-.05.19-.52,0-1.02,0-1.51,0-.46,0-.9,0-1.33,0-.01-.06-.03-.13-.05-.19-.02-.07-.03-.13-.04-.2.46,0,.94,0,1.43,0,.52,0,1.06,0,1.6,0Z"/>
                <path className="abc-138" d="M474.03,406.19c-.04.08-.1.15-.14.23-.04.07-.08.13-.1.2-.54,0-1.08,0-1.6,0-.49,0-.97,0-1.43,0,0-.07-.01-.13-.02-.2,0-.08,0-.15-.01-.23.51,0,1.04,0,1.57,0,.57,0,1.15,0,1.73,0Z"/>
                <path className="abc-368" d="M474.17,405.88s-.01.05-.02.07c-.02.08-.07.16-.11.24-.59,0-1.17,0-1.73,0-.53,0-1.06,0-1.57,0,0-.08,0-.16-.02-.24,0-.02,0-.05-.01-.07.54,0,1.1,0,1.66,0,.6,0,1.2,0,1.81,0Z"/>
                <path className="abc-368" d="M474.17,405.53c0,.09.02.18.01.27,0,.03,0,.05-.01.08-.61,0-1.22,0-1.81,0-.56,0-1.11,0-1.66,0,0-.02,0-.05-.02-.07-.02-.09-.05-.18-.07-.27.55,0,1.12,0,1.69,0,.61,0,1.23,0,1.86,0Z"/>
                <path className="abc-145" d="M474.1,405.06c.01.07.03.14.03.2.01.09.03.18.04.28-.63,0-1.25,0-1.86,0-.57,0-1.14,0-1.69,0-.02-.09-.05-.18-.07-.28-.01-.07-.03-.13-.04-.2.56,0,1.13,0,1.71,0,.62,0,1.25,0,1.88,0Z"/>
                <path className="abc-124" d="M474.04,404.57c0,.09.01.19.02.28,0,.07.02.14.03.21-.63,0-1.27,0-1.88,0-.58,0-1.15,0-1.71,0-.01-.07-.03-.13-.04-.2-.01-.09-.03-.18-.04-.28.56,0,1.13,0,1.72,0,.62,0,1.26,0,1.9,0Z"/>
                <path className="abc-124" d="M474.06,403.82c0,.16,0,.31-.02.46-.01.1,0,.19,0,.29-.64,0-1.28,0-1.9,0-.59,0-1.16,0-1.72,0-.01-.09-.02-.19-.03-.28,0-.15,0-.29-.01-.45.57,0,1.16-.01,1.75-.02.63,0,1.28-.01,1.93-.01Z"/>
                <path className="abc-209" d="M474.04,403.17c0,.06,0,.12,0,.18,0,.16.01.32.02.47-.66,0-1.3,0-1.93.01-.59,0-1.18.01-1.75.02,0-.15,0-.3,0-.46,0-.06,0-.11,0-.17.57-.01,1.15-.02,1.74-.03.63-.01,1.27-.02,1.92-.03Z"/>
                <path className="abc-183" d="M474.06,402.78c0,.07-.01.14-.01.21,0,.06,0,.12,0,.18-.65,0-1.29.02-1.92.03-.59,0-1.17.02-1.74.03,0-.06,0-.11.01-.17,0-.07.01-.13.02-.2.56-.01,1.14-.03,1.73-.04.63-.01,1.27-.03,1.91-.04Z"/>
                <path className="abc-10" d="M474.09,402.56c-.01.07-.02.15-.03.22-.65.01-1.29.03-1.91.04-.59.01-1.17.03-1.73.04,0-.07.02-.14.03-.21.56-.01,1.14-.03,1.73-.05.63-.02,1.26-.03,1.91-.05Z"/>
                <path className="abc-32" d="M475.06,411.18c0,.16-.02.31-.04.45-.11,0-.23,0-.34,0-.1,0-.21,0-.31,0-.04-.13-.1-.27-.16-.42.13,0,.27-.02.41-.02.15,0,.3-.01.44-.02Z"/>
                <path className="abc-364" d="M475.2,410.11c-.05.19-.07.4-.1.59-.02.16-.03.32-.04.47-.14,0-.29.02-.44.02-.14,0-.28.01-.41.02-.06-.14-.14-.3-.2-.45-.07-.19-.15-.38-.21-.57.2-.02.41-.03.64-.04.25-.01.5-.03.76-.04Z"/>
                <path className="abc-304" d="M475.72,408.96c-.07.18-.15.37-.25.54,0,.02-.01.03-.02.05-.13.18-.2.37-.25.57-.26.02-.51.03-.76.04-.23,0-.44.02-.64.04-.06-.19-.1-.38-.11-.57,0-.02,0-.04-.01-.06-.02-.19-.08-.38-.14-.57.33,0,.67-.01,1.01-.02.38,0,.77-.02,1.17-.02Z"/>
                <path className="abc-156" d="M476.1,408.02c-.05.11-.09.22-.14.33-.09.2-.16.41-.24.61-.4,0-.79.01-1.17.02-.35,0-.69.01-1.01.02-.06-.21-.13-.42-.17-.63-.02-.11-.04-.22-.05-.33.41,0,.83,0,1.27,0,.49,0,.99,0,1.5,0Z"/>
                <path className="abc-265" d="M476.53,407.44c-.09.08-.19.17-.25.26t0,0c-.08.11-.13.22-.18.33-.51,0-1.02,0-1.5,0-.44,0-.87,0-1.27,0,0-.11-.01-.22,0-.33,0,0,0,0,0,0,0-.09.04-.18.09-.26.46,0,.94,0,1.43,0,.54,0,1.11,0,1.69,0Z"/>
                <path className="abc-163" d="M477.02,407c-.06.06-.13.12-.18.18-.09.09-.21.17-.3.26-.58,0-1.14,0-1.69,0-.49,0-.97,0-1.43,0,.05-.09.11-.18.17-.27.03-.06.07-.12.1-.18.52,0,1.04,0,1.58,0,.58,0,1.17,0,1.76,0Z"/>
                <path className="abc-320" d="M477.3,406.62c-.06.07-.11.13-.14.19-.03.06-.08.13-.14.19-.59,0-1.17,0-1.76,0-.53,0-1.06,0-1.58,0,.03-.06.05-.13.05-.19,0-.06.03-.13.05-.2.54,0,1.09,0,1.65,0,.61,0,1.24,0,1.86,0Z"/>
                <path className="abc-116" d="M477.72,406.19c-.07.08-.17.15-.23.23-.06.07-.13.13-.19.2-.62,0-1.24,0-1.86,0-.56,0-1.11,0-1.65,0,.03-.07.07-.13.1-.2.04-.08.1-.15.14-.23.59,0,1.18,0,1.77,0,.65,0,1.29,0,1.92,0Z"/>
                <path className="abc-306" d="M477.97,405.87s-.03.05-.04.08c-.05.08-.13.16-.21.24-.63,0-1.27,0-1.92,0-.59,0-1.18,0-1.77,0,.04-.08.09-.16.11-.24,0-.02.02-.05.02-.07.61,0,1.22,0,1.83,0,.67,0,1.33,0,1.97,0Z"/>
                <path className="abc-306" d="M478.05,405.54c-.01.08-.02.17-.05.25,0,.03-.02.05-.03.08-.64,0-1.3,0-1.97,0-.61,0-1.22,0-1.83,0,0-.02.01-.05.01-.08,0-.09,0-.18-.01-.27.63,0,1.25,0,1.87,0,.68,0,1.35,0,2.01.01Z"/>
                <path className="abc-378" d="M478.09,405.09c0,.06,0,.13,0,.19-.01.09-.01.18-.03.26-.66,0-1.33-.01-2.01-.01-.62,0-1.25,0-1.87,0,0-.09-.03-.18-.04-.28,0-.07-.02-.13-.03-.2.63,0,1.27,0,1.91,0,.7,0,1.4.01,2.08.03Z"/>
                <path className="abc-124" d="M478.12,404.58c-.01.11-.01.21-.02.3,0,.07,0,.14,0,.2-.69-.02-1.38-.03-2.08-.03-.64,0-1.28,0-1.91,0-.01-.07-.02-.14-.03-.21,0-.09-.02-.19-.02-.28.64,0,1.29,0,1.94,0,.71,0,1.43,0,2.14.02Z"/>
                <path className="abc-124" d="M478.22,403.8c0,.16,0,.32-.05.47-.03.1-.04.2-.05.31-.71,0-1.43-.02-2.14-.02-.65,0-1.3,0-1.94,0,0-.09,0-.19,0-.29.02-.15.02-.3.02-.46.66,0,1.32,0,1.98-.01.72,0,1.45,0,2.17,0Z"/>
                <path className="abc-257" d="M478.23,403.12c0,.06,0,.12,0,.19-.01.17,0,.33,0,.49-.72,0-1.45,0-2.17,0-.66,0-1.32.01-1.98.01,0-.16-.01-.31-.02-.47,0-.06,0-.12,0-.18.65,0,1.31-.02,1.97-.03.73-.01,1.47-.02,2.21-.02Z"/>
                <path className="abc-198" d="M478.24,402.7c0,.08,0,.16-.01.23,0,.06,0,.13,0,.19-.74,0-1.48,0-2.21.02-.66.01-1.32.02-1.97.03,0-.06,0-.12,0-.18,0-.07,0-.14.01-.21.65-.01,1.3-.03,1.97-.04.73-.02,1.47-.03,2.22-.04Z"/>
                <path className="abc-71" d="M478.27,402.46c-.02.08-.02.15-.03.23-.75.01-1.49.03-2.22.04-.66.01-1.32.03-1.97.04,0-.07.02-.14.03-.22.65-.02,1.31-.03,1.97-.05.73-.02,1.47-.03,2.21-.05Z"/>
                <path className="abc-49" d="M475.86,411.14c-.08.17-.15.33-.23.49-.09,0-.18,0-.27,0-.12,0-.23,0-.34,0,.02-.15.03-.3.04-.45.14,0,.29-.02.45-.02.12,0,.24-.01.35-.02Z"/>
                <path className="abc-394" d="M476.62,410.03c-.18.2-.33.4-.47.6-.12.17-.2.34-.29.5-.12,0-.23.01-.35.02-.16,0-.3.02-.45.02,0-.16.02-.31.04-.47.03-.2.05-.4.1-.59.26-.02.52-.03.79-.05.21-.01.42-.02.63-.03Z"/>
                <path className="abc-312" d="M477.94,408.94c-.23.19-.45.37-.69.54-.25.17-.45.36-.63.55-.21.01-.42.02-.63.03-.27.01-.53.03-.79.05.05-.19.12-.39.25-.57,0-.02.01-.03.02-.05.1-.17.18-.35.25-.54.4,0,.81,0,1.23-.01.32,0,.65,0,.99,0Z"/>
                <path className="abc-126" d="M478.96,408.03c-.12.11-.23.23-.36.34-.22.19-.44.38-.66.57-.33,0-.66,0-.99,0-.42,0-.83,0-1.23.01.08-.2.15-.41.24-.61.05-.11.09-.22.14-.33.51,0,1.04,0,1.58,0,.41,0,.84,0,1.27,0Z"/>
                <path className="abc-33" d="M479.63,407.43c-.1.08-.21.17-.31.25-.13.11-.25.23-.37.34-.43,0-.86,0-1.27,0-.54,0-1.07,0-1.58,0,.05-.11.1-.22.18-.33t0,0c.06-.09.16-.17.25-.26.58,0,1.16,0,1.75,0,.45,0,.9,0,1.35,0Z"/>
                <path className="abc-350" d="M480.14,407c-.06.06-.14.12-.2.18-.1.09-.21.17-.31.26-.45,0-.91,0-1.35,0-.58,0-1.17,0-1.75,0,.09-.08.21-.17.3-.26.06-.06.13-.12.18-.18.59,0,1.18,0,1.77,0,.45,0,.9,0,1.35,0Z"/>
                <path className="abc-1" d="M480.51,406.62c-.06.07-.13.13-.19.19-.05.06-.12.13-.18.19-.45,0-.89,0-1.35,0-.59,0-1.18,0-1.77,0,.06-.06.11-.12.14-.19.03-.06.08-.13.14-.19.62,0,1.24,0,1.84,0,.46,0,.92,0,1.37,0Z"/>
                <path className="abc-230" d="M480.93,406.18c-.07.08-.15.16-.22.23-.06.07-.13.13-.2.2-.45,0-.91,0-1.37,0-.6,0-1.22,0-1.84,0,.06-.07.13-.13.19-.2.07-.08.16-.15.23-.23.63,0,1.25,0,1.86,0,.46,0,.91,0,1.35,0Z"/>
                <path className="abc-431" d="M481.19,405.86s-.04.05-.06.08c-.06.08-.13.16-.21.24-.44,0-.89,0-1.35,0-.6,0-1.22,0-1.86,0,.07-.08.16-.16.21-.24.01-.02.03-.05.04-.08.64,0,1.27,0,1.88,0,.46,0,.91,0,1.35,0Z"/>
                <path className="abc-431" d="M481.38,405.55c-.04.08-.08.15-.13.24-.02.03-.04.05-.05.08-.43,0-.88,0-1.35,0-.6,0-1.23,0-1.88,0,.01-.03.02-.05.03-.08.03-.09.04-.17.05-.25.66,0,1.3.01,1.93.01.48,0,.94,0,1.39,0Z"/>
                <path className="abc-294" d="M481.58,405.12c-.03.06-.05.12-.08.19-.04.09-.08.16-.12.25-.45,0-.91,0-1.39,0-.62,0-1.27,0-1.93-.01.01-.08.02-.17.03-.26,0-.07,0-.13,0-.19.69.02,1.36.03,2.02.04.5,0,1,0,1.47-.01Z"/>
                <path className="abc-124" d="M481.76,404.59c-.03.11-.06.24-.1.33-.03.07-.05.13-.08.19-.48.01-.97.02-1.47.01-.66,0-1.33-.03-2.02-.04,0-.06,0-.13,0-.2.01-.09.01-.2.02-.3.71,0,1.41.02,2.09.02.52,0,1.04,0,1.54-.01Z"/>
                <path className="abc-124" d="M482,403.77c-.04.16-.07.31-.14.47-.04.1-.07.23-.1.34-.5.01-1.02.01-1.54.01-.68,0-1.38-.01-2.09-.02.01-.11.02-.21.05-.31.04-.15.04-.31.05-.47.72,0,1.45,0,2.16,0,.55,0,1.09,0,1.62-.02Z"/>
                <path className="abc-39" d="M482.15,403.08c-.01.07-.02.13-.04.2-.04.18-.07.34-.11.5-.53,0-1.07.01-1.62.02-.72,0-1.44,0-2.16,0,0-.16,0-.32,0-.49,0-.06,0-.12,0-.19.74,0,1.49,0,2.23-.01.57,0,1.13-.02,1.69-.03Z"/>
                <path className="abc-31" d="M482.22,402.62c-.01.08-.02.17-.04.25-.01.07-.02.14-.03.2-.56.01-1.13.02-1.69.03-.74,0-1.49.01-2.23.01,0-.06,0-.13,0-.19,0-.08,0-.15.01-.23.75-.01,1.5-.03,2.24-.04.57-.01,1.15-.02,1.73-.03Z"/>
                <path className="abc-237" d="M482.26,402.37c-.02.08-.03.17-.04.25-.58.01-1.16.02-1.73.03-.75.01-1.5.03-2.24.04,0-.08.02-.16.03-.23.75-.02,1.5-.03,2.25-.05.58-.01,1.16-.03,1.74-.04Z"/>
                <path className="abc-261" d="M478.48,411.14c-.09.16-.16.33-.23.48-.79,0-1.57,0-2.35,0-.09,0-.18,0-.27,0,.08-.16.14-.33.23-.49.12,0,.24,0,.37-.01.74,0,1.5,0,2.26.02Z"/>
                <path className="abc-23" d="M479.23,410.06c-.17.19-.32.39-.45.59-.11.16-.2.33-.29.49-.76,0-1.52-.01-2.26-.02-.13,0-.25,0-.37.01.08-.17.17-.34.29-.5.14-.21.29-.41.47-.6.21-.01.43-.02.66-.03.63.01,1.29.03,1.95.05Z"/>
                <path className="abc-302" d="M480.46,408.95c-.21.19-.43.37-.65.56-.22.17-.41.36-.58.55-.66-.02-1.32-.04-1.95-.05-.22,0-.44.02-.66.03.18-.2.38-.38.63-.55.24-.17.46-.35.69-.54.33,0,.67,0,1.02-.01.49.01.99.01,1.5.02Z"/>
                <path className="abc-240" d="M481.41,408.03c-.11.11-.22.22-.33.33-.2.2-.41.39-.63.58-.51,0-1.01,0-1.5-.02-.35,0-.69,0-1.02.01.23-.19.44-.38.66-.57.12-.11.24-.22.36-.34.43,0,.87,0,1.32,0,.37,0,.75,0,1.14,0Z"/>
                <path className="abc-203" d="M481.96,407.42c-.07.09-.15.18-.22.27-.11.12-.22.23-.32.35-.39,0-.77,0-1.14,0-.44,0-.88,0-1.32,0,.12-.11.24-.23.37-.34.1-.09.21-.17.31-.25.45,0,.91,0,1.37,0,.32,0,.64,0,.96-.01Z"/>
                <path className="abc-334" d="M482.33,406.96c-.05.06-.1.12-.15.18-.07.09-.15.18-.23.27-.32,0-.64.01-.96.01-.46,0-.91,0-1.37,0,.1-.08.21-.17.31-.26.06-.06.14-.12.2-.18.45,0,.89,0,1.32,0,.29,0,.58-.01.86-.03Z"/>
                <path className="abc-201" d="M482.6,406.58c-.04.07-.09.13-.13.2-.04.06-.09.13-.14.19-.28.02-.57.03-.86.03-.44,0-.88,0-1.32,0,.06-.06.13-.12.18-.19.05-.06.12-.13.19-.19.45,0,.89,0,1.31,0,.27,0,.53-.02.78-.03Z"/>
                <path className="abc-434" d="M482.9,406.15c-.05.08-.1.16-.16.23-.05.07-.09.13-.14.2-.25.02-.51.03-.78.03-.42,0-.86,0-1.31,0,.06-.07.14-.13.2-.2.07-.08.15-.16.22-.23.44,0,.86,0,1.26,0,.24,0,.48-.01.7-.03Z"/>
                <path className="abc-424" d="M483.09,405.84s-.03.05-.04.07c-.05.08-.1.16-.15.24-.23.01-.46.02-.7.03-.41,0-.83,0-1.26,0,.07-.08.15-.16.21-.24.02-.03.04-.05.06-.08.43,0,.85,0,1.24-.01.22,0,.44,0,.65-.01Z"/>
                <path className="abc-440" d="M483.28,405.43c-.05.11-.1.22-.15.33-.01.02-.03.05-.04.07-.21,0-.43.01-.65.01-.39,0-.81,0-1.24.01.02-.03.04-.05.05-.08.05-.09.09-.15.13-.24.45,0,.88-.02,1.29-.04.22,0,.41-.04.61-.07Z"/>
                <path className="abc-357" d="M483.53,404.89c-.04.07-.07.15-.11.22-.05.11-.1.21-.15.32-.19.03-.39.06-.61.07-.41.02-.85.03-1.29.04.04-.08.08-.15.12-.25.03-.07.06-.12.08-.19.48-.01.94-.04,1.38-.09.21-.02.39-.07.57-.13Z"/>
                <path className="abc-219" d="M483.8,404.38c-.06.1-.11.2-.16.3-.04.07-.07.14-.11.22-.18.06-.36.11-.57.13-.44.05-.91.07-1.38.09.03-.06.05-.12.08-.19.04-.09.07-.22.1-.33.5-.01.99-.03,1.47-.06.21-.04.4-.09.57-.15Z"/>
                <path className="abc-14" d="M484.26,403.61c-.1.16-.19.31-.28.46-.06.1-.12.2-.17.3-.18.06-.36.11-.57.15-.47.03-.96.05-1.47.06.03-.11.06-.24.1-.34.06-.16.1-.31.14-.47.53,0,1.06-.02,1.57-.04.26-.03.47-.08.68-.12Z"/>
                <path className="abc-370" d="M484.66,402.95c-.04.06-.07.12-.11.18-.1.17-.19.33-.29.49-.21.04-.43.09-.68.12-.51.02-1.04.03-1.57.04.04-.16.06-.32.11-.5.02-.06.03-.13.04-.2.56-.01,1.12-.03,1.67-.06.31-.01.57-.04.84-.08Z"/>
                <path className="abc-367" d="M484.9,402.54c-.05.07-.09.15-.13.22-.04.06-.07.12-.11.18-.26.03-.53.06-.84.08-.55.02-1.11.04-1.67.06.01-.07.02-.14.03-.2.01-.08.02-.17.04-.25.58-.01,1.15-.02,1.72-.04.33,0,.65-.03.96-.04Z"/>
                <path className="abc-426" d="M485.04,402.31c-.05.07-.09.15-.14.22-.31.02-.63.03-.96.04-.57.02-1.14.03-1.72.04.01-.08.03-.17.04-.25.58-.01,1.16-.03,1.74-.04.35,0,.69-.01,1.03-.02Z"/>
                <path className="abc-284" d="M482.96,411.18c-.02.15-.03.3-.05.45-.76,0-1.53,0-2.31,0-.78,0-1.57,0-2.35,0,.07-.16.15-.32.23-.48.76,0,1.52.01,2.26.02.74,0,1.48.01,2.22.02Z"/>
                <path className="abc-100" d="M483.14,410.17c-.05.19-.08.38-.11.56-.03.15-.05.3-.07.45-.73,0-1.48-.02-2.22-.02-.74,0-1.5-.01-2.26-.02.09-.16.18-.33.29-.49.13-.2.28-.4.45-.59.66.02,1.33.04,1.97.05.64.01,1.3.03,1.95.06Z"/>
                <path className="abc-141" d="M483.48,408.99c-.06.21-.11.42-.17.62-.06.18-.11.37-.16.55-.65-.02-1.31-.04-1.95-.06-.64-.01-1.31-.03-1.97-.05.17-.19.36-.38.58-.55.22-.18.44-.37.65-.56.51,0,1.02,0,1.52.02.5.01,1,.02,1.5.02Z"/>
                <path className="abc-158" d="M483.73,408.03c-.03.11-.06.22-.09.33-.06.21-.11.42-.17.63-.5,0-1-.01-1.5-.02-.5-.01-1.01-.02-1.52-.02.21-.19.42-.38.63-.58.11-.11.22-.22.33-.33.39,0,.77,0,1.15,0s.77,0,1.17,0Z"/>
                <path className="abc-166" d="M483.9,407.39c-.02.1-.05.2-.07.31-.03.11-.06.22-.09.34-.39,0-.78,0-1.17,0s-.77,0-1.15,0c.11-.11.22-.23.32-.35.07-.09.15-.18.22-.27.32,0,.64-.02.96-.02.32,0,.65-.01.98-.02Z"/>
                <path className="abc-426" d="M484.02,406.89c-.02.06-.03.13-.05.19-.03.1-.05.2-.08.3-.33,0-.65.01-.98.02-.32,0-.64.01-.96.02.07-.09.15-.18.23-.27.05-.06.1-.12.15-.18.28-.02.57-.03.85-.04.17,0,.33-.01.5-.02.11,0,.23,0,.34-.01Z"/>
                <path className="abc-335" d="M484.11,406.5c-.02.07-.03.13-.05.2-.02.06-.02.13-.04.19-.11,0-.23,0-.34.01-.17,0-.34.01-.5.02-.28.01-.56.03-.85.04.05-.06.09-.12.14-.19.04-.06.09-.13.13-.2.25-.02.5-.04.75-.05.15,0,.3-.01.45-.02.1,0,.2,0,.3-.01Z"/>
                <path className="abc-408" d="M484.22,406.09c-.02.07-.04.14-.06.22-.02.07-.04.13-.05.2-.1,0-.2.01-.3.01-.15,0-.3.01-.45.02-.25.01-.5.03-.75.05.04-.07.09-.13.14-.2.05-.08.11-.15.16-.23.23-.01.45-.03.66-.03.22,0,.44-.02.66-.03Z"/>
                <path className="abc-377" d="M484.29,405.81s0,.04,0,.07c-.02.07-.04.14-.06.21-.22,0-.44.02-.66.03-.21,0-.44.02-.66.03.05-.08.1-.16.15-.24.01-.02.03-.05.04-.07.21,0,.42-.01.61-.02.12,0,.23,0,.35,0,.08,0,.16,0,.24,0Z"/>
                <path className="abc-73" d="M484.38,405.28c-.03.14-.06.3-.09.46,0,.02,0,.04,0,.07-.08,0-.16,0-.24,0-.11,0-.23,0-.35,0-.19,0-.4,0-.61.02.01-.02.03-.05.04-.07.05-.11.1-.22.15-.33.19-.03.37-.07.56-.09.11-.01.22-.03.32-.04.07,0,.15-.02.23-.03Z"/>
                <path className="abc-253" d="M484.59,404.6c-.03.08-.07.18-.1.27-.04.13-.08.27-.11.41-.08.01-.15.02-.23.03-.11.01-.21.03-.32.04-.18.02-.37.05-.56.09.05-.11.1-.21.15-.32.04-.08.07-.15.11-.22.18-.06.34-.12.52-.16.16-.04.35-.09.54-.14Z"/>
                <path className="abc-191" d="M484.87,404.05c-.07.1-.12.2-.17.31-.03.07-.08.16-.11.24-.19.05-.38.11-.54.14-.17.04-.34.1-.52.16.04-.07.07-.14.11-.22.05-.1.11-.2.16-.3.18-.06.34-.12.52-.16.1-.03.21-.06.33-.1.07-.02.15-.04.22-.07Z"/>
                <path className="abc-442" d="M485.56,403.36c-.16.14-.33.28-.46.42-.09.09-.16.17-.23.27-.07.02-.14.04-.22.07-.12.03-.23.07-.33.1-.18.05-.34.11-.52.16.06-.1.11-.2.17-.3.09-.15.18-.3.28-.46.21-.04.41-.09.64-.13.14-.02.26-.05.4-.08.09-.02.17-.03.25-.05Z"/>
                <path className="abc-90" d="M486.31,402.77c-.07.05-.14.1-.21.15-.19.14-.38.29-.54.43-.08.02-.17.03-.25.05-.14.03-.26.06-.4.08-.23.04-.43.08-.64.13.1-.16.19-.32.29-.49.04-.06.07-.12.11-.18.26-.03.53-.07.82-.09.28-.03.56-.06.84-.08Z"/>
                <path className="abc-19" d="M486.81,402.45c-.09.06-.19.12-.28.18-.08.05-.15.1-.22.15-.28.03-.56.06-.84.08-.29.02-.55.05-.82.09.04-.06.07-.12.11-.18.05-.07.09-.15.13-.22.31-.02.62-.04.95-.05.32-.01.64-.03.96-.04Z"/>
                <path className="abc-402" d="M487.09,402.27c-.1.06-.19.12-.29.18-.32.01-.64.03-.96.04-.32.01-.64.03-.95.05.05-.07.09-.15.14-.22.34,0,.69-.01,1.03-.02.34,0,.68-.01,1.02-.02Z"/>
                <path className="abc-169" d="M485.96,411.21c0,.14.02.29.03.43-.28,0-.57,0-.86,0-.72,0-1.46,0-2.22,0,.02-.15.03-.3.05-.45.73,0,1.45.02,2.13.03.29,0,.58,0,.86,0Z"/>
                <path className="abc-128" d="M485.9,410.23c.01.18.02.37.03.55,0,.15.02.29.03.44-.28,0-.57,0-.86,0-.68,0-1.4-.02-2.13-.03.02-.15.04-.3.07-.45.03-.19.07-.38.11-.56.65.02,1.28.04,1.88.06.29,0,.59,0,.88,0Z"/>
                <path className="abc-316" d="M485.83,409.02c0,.22.02.44.04.66.01.18.02.37.03.55-.29,0-.58,0-.88,0-.6-.01-1.23-.04-1.88-.06.05-.19.1-.37.16-.55.06-.21.11-.41.17-.62.5,0,.99.01,1.47.03.3,0,.59,0,.88,0Z"/>
                <path className="abc-180" d="M485.81,408.03c0,.11,0,.22,0,.34,0,.21.01.43.02.65-.29,0-.59,0-.88,0-.48-.01-.97-.02-1.47-.03.06-.21.11-.42.17-.63.03-.11.06-.22.09-.33.39,0,.78,0,1.17,0,.3,0,.61,0,.91,0Z"/>
                <path className="abc-166" d="M485.75,407.38c.03.11.06.21.06.32,0,.11,0,.22,0,.33-.3,0-.61,0-.91,0-.38,0-.77,0-1.17,0,.03-.11.06-.22.09-.34.02-.1.04-.21.07-.31.33,0,.66,0,.98,0,.29,0,.58,0,.87,0Z"/>
                <path className="abc-346" d="M485.65,406.87c.01.07.03.14.03.2,0,.1.04.21.06.31-.29,0-.58,0-.87,0-.33,0-.65,0-.98,0,.02-.1.05-.2.08-.3.02-.06.03-.13.05-.19.28-.01.56-.03.85-.03.26,0,.51,0,.78,0Z"/>
                <path className="abc-65" d="M485.59,406.46c.01.07.03.14.03.2,0,.07.01.13.03.2-.26,0-.52,0-.78,0-.29,0-.57.02-.85.03.02-.06.02-.13.04-.19.01-.07.03-.13.05-.2.25-.01.5-.03.77-.03.23,0,.47,0,.72,0Z"/>
                <path className="abc-408" d="M485.52,406.06c.02.07.04.14.04.21,0,.06.02.13.03.2-.25,0-.49,0-.72,0-.26,0-.52.02-.77.03.02-.07.04-.13.05-.2.02-.07.04-.15.06-.22.22,0,.44-.02.66-.02.2,0,.42,0,.64,0Z"/>
                <path className="abc-433" d="M485.49,405.79s0,.04,0,.06c0,.07.02.13.03.2-.22,0-.43,0-.64,0-.22,0-.44.01-.66.02.02-.07.04-.14.06-.21,0-.02,0-.04,0-.07.2,0,.4,0,.61-.01.19,0,.38,0,.59,0Z"/>
                <path className="abc-392" d="M485.55,405.2c-.03.17-.06.35-.07.53,0,.02,0,.04,0,.06-.21,0-.4,0-.59,0-.21,0-.42,0-.61.01,0-.02,0-.04,0-.07.02-.16.06-.32.09-.46.18-.02.37-.05.57-.07.19,0,.39-.01.6-.01Z"/>
                <path className="abc-90" d="M485.76,404.43c-.03.09-.07.19-.1.29-.04.15-.08.31-.11.47-.21,0-.41,0-.6.01-.2.02-.39.04-.57.07.03-.14.07-.29.11-.41.03-.09.07-.19.1-.27.19-.05.37-.1.51-.12.21-.02.43-.03.66-.04Z"/>
                <path className="abc-358" d="M486.08,403.89c-.09.09-.16.18-.22.3-.03.07-.07.16-.1.25-.23,0-.45.02-.66.04-.15.02-.33.07-.51.12.03-.08.08-.17.11-.24.05-.11.1-.21.17-.31.18-.06.36-.12.52-.15.22,0,.45-.01.69-.01Z"/>
                <path className="abc-269" d="M486.93,403.23c-.21.14-.41.29-.56.41-.11.09-.21.16-.3.25-.24,0-.46,0-.69.01-.16.03-.34.09-.52.15.07-.1.14-.18.23-.27.13-.14.3-.28.46-.42.21-.04.42-.09.66-.12.23,0,.47,0,.72,0Z"/>
                <path className="abc-318" d="M487.89,402.68c-.09.05-.18.09-.27.14-.24.13-.48.28-.69.42-.24,0-.48,0-.72,0-.24.03-.44.08-.66.12.16-.14.35-.29.54-.43.07-.05.14-.1.21-.15.28-.03.56-.05.84-.07.25-.01.49-.02.75-.03Z"/>
                <path className="abc-78" d="M488.52,402.39c-.12.05-.24.1-.35.15-.1.04-.19.09-.28.13-.25,0-.5.02-.75.03-.28.01-.56.04-.84.07.07-.05.15-.1.22-.15.09-.06.18-.12.28-.18.32-.01.64-.03.95-.04.25,0,.51-.01.76-.02Z"/>
                <path className="abc-227" d="M488.87,402.23c-.11.05-.23.1-.35.16-.26,0-.51.01-.76.02-.32,0-.63.02-.95.04.09-.06.19-.12.29-.18.34,0,.68-.01,1.02-.02.26,0,.51-.01.76-.02Z"/>
                <path className="abc-197" d="M489.51,411.24c0,.15,0,.29.01.43-.9-.01-1.8-.03-2.7-.03-.27,0-.55,0-.84,0,0-.14-.02-.28-.03-.43.28,0,.56,0,.84,0,.91,0,1.81.01,2.71.03Z"/>
                <path className="abc-438" d="M489.57,410.26c-.01.18-.03.37-.04.55-.01.15-.02.29-.02.44-.9-.01-1.8-.02-2.71-.03-.28,0-.56,0-.84,0,0-.14-.02-.29-.03-.44-.01-.18-.02-.36-.03-.55.29,0,.58,0,.86,0,.93,0,1.87.01,2.81.02Z"/>
                <path className="abc-430" d="M489.62,409.05c-.02.22-.04.43-.04.65,0,.19,0,.37-.01.55-.94-.01-1.87-.02-2.81-.02-.28,0-.57,0-.86,0-.01-.18-.02-.37-.03-.55-.01-.22-.03-.44-.04-.66.29,0,.59,0,.88,0,.97,0,1.94.01,2.91.02Z"/>
                <path className="abc-128" d="M489.75,408.06c-.01.11-.04.23-.05.34-.03.22-.06.43-.08.65-.97,0-1.93-.02-2.91-.02-.29,0-.59,0-.88,0,0-.22-.02-.43-.02-.65,0-.11,0-.23,0-.34.3,0,.61,0,.91,0,1.01,0,2.02.01,3.03.02Z"/>
                <path className="abc-166" d="M489.63,407.41c.06.1.15.21.16.32,0,.11-.03.22-.04.34-1.01,0-2.02-.02-3.03-.02-.3,0-.61,0-.91,0,0-.11,0-.22,0-.33,0-.11-.03-.21-.06-.32.29,0,.59,0,.88,0,.98,0,1.99.01,3,.02Z"/>
                <path className="abc-342" d="M489.28,406.89c.03.07.09.14.13.2.05.1.16.21.23.31-1.01,0-2.03-.02-3-.02-.29,0-.59,0-.88,0-.03-.11-.06-.21-.06-.31,0-.07-.02-.14-.03-.2.26,0,.53,0,.81,0,.91,0,1.86.01,2.82.02Z"/>
                <path className="abc-260" d="M489.12,406.49c.03.07.08.14.08.2,0,.06.04.13.08.2-.97-.01-1.91-.02-2.82-.02-.27,0-.54,0-.81,0-.01-.07-.03-.13-.03-.2,0-.07-.02-.14-.03-.2.25,0,.5,0,.76,0,.86,0,1.8.01,2.77.03Z"/>
                <path className="abc-146" d="M488.82,406.08c.05.07.13.14.17.21.03.06.1.13.13.2-.97-.01-1.91-.03-2.77-.03-.26,0-.51,0-.76,0-.01-.07-.03-.14-.03-.2,0-.07-.02-.14-.04-.21.22,0,.45,0,.69,0,.79,0,1.67,0,2.61.02Z"/>
                <path className="abc-66" d="M488.66,405.8s.01.04.02.06c.02.07.09.14.14.21-.94-.01-1.82-.02-2.61-.02-.24,0-.47,0-.69,0-.02-.07-.03-.13-.03-.2,0-.02,0-.04,0-.06.21,0,.42,0,.65,0,.75,0,1.61,0,2.53.01Z"/>
                <path className="abc-112" d="M488.77,405.25c-.04.16-.1.32-.11.49,0,.02,0,.04,0,.06-.92,0-1.78-.01-2.53-.01-.23,0-.44,0-.65,0,0-.02,0-.04,0-.06.01-.18.04-.36.07-.53.21,0,.43,0,.66,0,.77,0,1.63.02,2.55.05Z"/>
                <path className="abc-284" d="M489.1,404.52c-.04.09-.1.19-.14.28-.06.14-.14.29-.19.45-.92-.03-1.78-.05-2.55-.05-.23,0-.45,0-.66,0,.03-.17.07-.33.11-.47.03-.1.06-.2.1-.29.23,0,.47-.01.71-.01.81,0,1.69.05,2.63.1Z"/>
                <path className="abc-333" d="M489.42,403.96c-.08.09-.16.18-.2.31-.03.08-.08.16-.13.25-.93-.05-1.82-.1-2.63-.1-.24,0-.48,0-.71.01.03-.09.07-.17.1-.25.05-.12.13-.21.22-.3.24,0,.48,0,.72,0,.82,0,1.7.04,2.62.07Z"/>
                <path className="abc-50" d="M490.26,403.26c-.2.15-.42.31-.54.45-.1.09-.22.16-.3.26-.92-.03-1.8-.07-2.62-.07-.25,0-.49,0-.72,0,.09-.09.19-.16.3-.25.15-.13.34-.27.56-.41.24,0,.49,0,.74,0,.84,0,1.7.01,2.59.03Z"/>
                <path className="abc-353" d="M491.23,402.66c-.09.05-.18.1-.26.15-.23.14-.51.3-.71.45-.88-.01-1.75-.03-2.59-.03-.25,0-.5,0-.74,0,.21-.14.45-.29.69-.42.09-.05.18-.09.27-.14.25,0,.5-.01.76-.02.85-.01,1.72,0,2.58,0Z"/>
                <path className="abc-147" d="M491.81,402.34c-.1.06-.21.11-.31.17-.09.05-.18.1-.27.15-.87,0-1.74-.02-2.58,0-.25,0-.51.01-.76.02.09-.05.19-.09.28-.13.11-.05.23-.1.35-.15.26,0,.51,0,.77-.01.84-.02,1.69-.02,2.52-.03Z"/>
                <path className="abc-254" d="M492.1,402.17c-.08.06-.19.12-.29.17-.83,0-1.68.02-2.52.03-.25,0-.51,0-.77.01.12-.05.23-.1.35-.16.25,0,.51-.01.76-.02.84-.02,1.66-.03,2.47-.05Z"/>
                <path className="abc-385" d="M496.06,411.4c0,.15-.03.3-.02.45-1.3-.05-2.59-.09-3.82-.12-.9-.02-1.8-.04-2.7-.06-.01-.14-.02-.29-.01-.43.9.01,1.8.03,2.71.05,1.24.03,2.54.07,3.84.11Z"/>
                <path className="abc-277" d="M496.19,410.38c-.01.19-.06.38-.08.57-.01.15-.04.3-.05.45-1.3-.04-2.6-.08-3.84-.11-.91-.02-1.81-.04-2.71-.05,0-.15.01-.29.02-.44.01-.18.03-.36.04-.55.94.01,1.87.02,2.81.04,1.26.02,2.54.05,3.81.08Z"/>
                <path className="abc-100" d="M496.32,409.15c-.02.22-.08.45-.08.67,0,.19-.04.38-.05.57-1.27-.03-2.55-.06-3.81-.08-.93-.02-1.87-.03-2.81-.04.01-.18.02-.37.01-.55,0-.22.01-.44.04-.65.97,0,1.93.02,2.91.03,1.27.02,2.55.04,3.8.06Z"/>
                <path className="abc-184" d="M496.48,408.13c0,.12-.03.23-.05.35-.03.22-.09.44-.11.67-1.24-.02-2.52-.05-3.8-.06-.97-.01-1.94-.02-2.91-.03.02-.22.05-.43.08-.65.01-.11.04-.23.05-.34,1.01,0,2.01.02,3,.03,1.28.01,2.53.03,3.73.04Z"/>
                <path className="abc-158" d="M496.42,407.48c.04.1.09.2.09.29,0,.12-.02.23-.03.35-1.2-.01-2.45-.03-3.73-.04-.99,0-1.99-.02-3-.03.01-.11.04-.22.04-.34,0-.1-.09-.21-.16-.32,1.01,0,2.03.02,3.03.03,1.29.01,2.55.03,3.76.04Z"/>
                <path className="abc-291" d="M496.18,406.99c.02.06.06.13.09.19.04.1.12.2.16.3-1.21-.01-2.47-.03-3.76-.04-.99-.01-2.01-.02-3.03-.03-.06-.1-.18-.21-.23-.31-.03-.07-.09-.14-.13-.2.97.01,1.96.02,2.97.04,1.31.02,2.64.04,3.93.06Z"/>
                <path className="abc-385" d="M496.08,406.6c.02.06.05.13.05.2,0,.06.03.13.04.19-1.29-.02-2.62-.04-3.93-.06-1.01-.01-2-.03-2.97-.04-.03-.07-.08-.13-.08-.2,0-.07-.05-.14-.08-.2.97.01,1.99.03,3,.05,1.32.02,2.65.04,3.96.07Z"/>
                <path className="abc-154" d="M495.87,406.19c.03.07.09.15.12.22.03.06.07.13.09.2-1.31-.02-2.64-.05-3.96-.07-1.02-.02-2.03-.03-3-.05-.03-.07-.1-.14-.13-.2-.04-.07-.12-.14-.17-.21.94.01,1.93.03,2.96.04,1.33.02,2.72.04,4.09.07Z"/>
                <path className="abc-347" d="M495.77,405.9s0,.04.01.07c.02.07.06.15.09.22-1.37-.03-2.76-.05-4.09-.07-1.03-.01-2.02-.03-2.96-.04-.05-.07-.12-.14-.14-.21,0-.02-.01-.04-.02-.06.92,0,1.92.02,2.95.03,1.34.02,2.75.04,4.15.07Z"/>
                <path className="abc-347" d="M495.82,405.43c-.02.13-.06.27-.06.4,0,.02,0,.04,0,.07-1.4-.02-2.81-.05-4.15-.07-1.03-.01-2.02-.03-2.95-.03,0-.02,0-.04,0-.06,0-.17.07-.33.11-.49.92.03,1.91.06,2.93.08,1.33.02,2.73.06,4.12.1Z"/>
                <path className="abc-439" d="M496,404.78c-.02.09-.05.18-.08.26-.03.13-.08.26-.1.39-1.39-.04-2.8-.08-4.12-.1-1.02-.02-2.01-.05-2.93-.08.04-.16.13-.31.19-.45.04-.1.1-.2.14-.28.93.05,1.92.11,2.92.14,1.3.03,2.65.08,3.99.12Z"/>
                <path className="abc-406" d="M496.15,404.18c-.03.11-.07.23-.09.35-.02.08-.04.17-.06.25-1.33-.05-2.68-.09-3.99-.12-1-.02-1.98-.08-2.92-.14.04-.09.09-.17.13-.25.04-.12.12-.22.2-.31.92.03,1.88.07,2.85.1,1.27.03,2.58.07,3.87.12Z"/>
                <path className="abc-380" d="M496.51,403.35c-.09.17-.18.33-.22.5-.05.1-.11.21-.14.32-1.29-.05-2.6-.09-3.87-.12-.98-.02-1.93-.06-2.85-.1.08-.09.19-.17.3-.26.11-.14.34-.3.54-.45.88.01,1.78.03,2.68.04,1.17.01,2.39.03,3.57.05Z"/>
                <path className="abc-380" d="M496.96,402.67c-.04.06-.08.12-.12.18-.11.17-.24.33-.33.5-1.18-.02-2.4-.04-3.57-.05-.9,0-1.8-.03-2.68-.04.2-.15.48-.31.71-.45.08-.05.18-.1.26-.15.87,0,1.73.02,2.56.02,1.08,0,2.15,0,3.17,0Z"/>
                <path className="abc-380" d="M497.21,402.28c-.04.07-.09.14-.13.21-.04.06-.08.12-.12.18-1.03,0-2.1,0-3.17,0-.83,0-1.69,0-2.56-.02.09-.05.18-.1.27-.15.1-.06.22-.11.31-.17.83,0,1.66-.01,2.44-.03,1.02-.01,2.01-.03,2.95-.04Z"/>
                <path className="abc-33" d="M497.32,402.06c-.03.07-.07.14-.11.21-.94.01-1.93.02-2.95.04-.79.01-1.61.02-2.44.03.1-.06.2-.11.29-.17.81-.02,1.59-.03,2.36-.05,1-.02,1.95-.04,2.86-.06Z"/>
                <path className="abc-255" d="M501.67,411.6c0,.16-.02.32-.02.47-.57-.02-1.16-.05-1.77-.07-1.25-.05-2.55-.1-3.84-.15,0-.15.01-.3.02-.45,1.3.04,2.59.09,3.82.13.61.02,1.21.05,1.78.07Z"/>
                <path className="abc-113" d="M501.74,410.54c0,.2-.03.39-.04.59,0,.16-.02.32-.03.47-.57-.02-1.17-.05-1.78-.07-1.23-.05-2.52-.09-3.82-.13,0-.15.04-.3.05-.45.02-.19.06-.38.08-.57,1.27.03,2.51.07,3.7.1.64.02,1.26.04,1.85.05Z"/>
                <path className="abc-436" d="M501.8,409.26c-.01.23-.03.46-.03.7,0,.2-.02.39-.03.59-.59-.02-1.22-.04-1.85-.05-1.18-.04-2.43-.07-3.7-.1.01-.19.05-.38.05-.57,0-.23.06-.45.08-.67,1.24.02,2.44.05,3.56.07.67.01,1.31.03,1.91.04Z"/>
                <path className="abc-250" d="M501.87,408.19c0,.12-.01.24-.02.37-.01.23-.04.46-.05.7-.6-.01-1.24-.03-1.91-.04-1.12-.02-2.32-.05-3.56-.07.02-.22.09-.44.11-.67.01-.12.04-.23.05-.35,1.2.01,2.34.03,3.41.04.7,0,1.36.02,1.98.02Z"/>
                <path className="abc-61" d="M501.86,407.55c0,.09.02.19.02.28,0,.12,0,.24-.01.37-.62,0-1.29-.02-1.98-.02-1.07-.01-2.21-.03-3.41-.04,0-.12.03-.23.03-.35,0-.1-.05-.2-.09-.29,1.21.01,2.37.03,3.47.04.69,0,1.35.02,1.97.02Z"/>
                <path className="abc-75" d="M501.81,407.08c0,.06.01.12.02.19,0,.09.03.19.03.28-.62,0-1.28-.01-1.97-.02-1.1-.01-2.26-.03-3.47-.04-.04-.1-.11-.2-.16-.3-.03-.07-.07-.13-.09-.19,1.29.02,2.55.04,3.71.06.67,0,1.32.02,1.92.03Z"/>
                <path className="abc-173" d="M501.78,406.7c0,.06.01.13.01.19s0,.12.01.19c-.61,0-1.25-.02-1.92-.03-1.16-.02-2.42-.04-3.71-.06-.02-.06-.04-.13-.04-.19,0-.06-.03-.13-.05-.2,1.31.02,2.58.05,3.8.07.66.01,1.3.02,1.9.03Z"/>
                <path className="abc-114" d="M501.74,406.3c0,.07.02.14.02.21,0,.06.02.13.02.19-.6,0-1.24-.02-1.9-.03-1.22-.02-2.5-.04-3.8-.07-.02-.06-.06-.13-.09-.2-.03-.07-.09-.15-.12-.22,1.37.03,2.73.05,4.01.07.64.01,1.26.02,1.86.03Z"/>
                <path className="abc-9" d="M501.72,406.02s0,.04,0,.07c0,.07.02.14.02.21-.59-.01-1.21-.02-1.86-.03-1.28-.02-2.64-.05-4.01-.07-.03-.07-.08-.15-.09-.22,0-.02-.01-.04-.01-.07,1.4.02,2.8.05,4.12.08.63.01,1.24.02,1.83.04Z"/>
                <path className="abc-9" d="M501.76,405.58c-.01.12-.05.25-.05.37,0,.02,0,.04,0,.07-.59-.01-1.2-.02-1.83-.04-1.32-.03-2.72-.05-4.12-.08,0-.02,0-.04,0-.07,0-.14.03-.27.06-.4,1.39.04,2.78.08,4.07.12.66,0,1.29.02,1.88.03Z"/>
                <path className="abc-169" d="M501.91,404.94c-.02.09-.05.18-.07.27-.02.12-.07.25-.08.37-.59-.01-1.21-.02-1.88-.03-1.29-.03-2.67-.08-4.07-.12.02-.13.07-.26.1-.39.02-.09.06-.18.08-.26,1.33.05,2.65.1,3.88.14.72,0,1.4,0,2.03.01Z"/>
                <path className="abc-237" d="M502.05,404.31c-.01.12-.05.24-.07.36-.02.09-.05.18-.06.27-.63,0-1.31-.01-2.03-.01-1.23-.04-2.55-.09-3.88-.14.02-.09.05-.17.06-.25.02-.12.05-.24.09-.35,1.29.05,2.56.09,3.73.14.76,0,1.49,0,2.16,0Z"/>
                <path className="abc-309" d="M502.17,403.4c-.03.19-.08.37-.08.56,0,.12-.02.24-.04.36-.67,0-1.4,0-2.16,0-1.18-.04-2.44-.09-3.73-.14.03-.11.09-.22.14-.32.04-.17.13-.33.22-.5,1.18.02,2.33.04,3.37.07.83,0,1.6-.01,2.28-.02Z"/>
                <path className="abc-404" d="M502.35,402.64c-.01.07-.03.13-.05.2-.04.19-.11.37-.14.56-.69,0-1.45,0-2.28.02-1.04-.03-2.19-.05-3.37-.07.09-.17.22-.33.33-.5.04-.06.08-.12.12-.18,1.03,0,2.01,0,2.92,0,.9-.01,1.72-.02,2.47-.03Z"/>
                <path className="abc-404" d="M502.43,402.21c0,.08-.03.16-.04.24,0,.07-.03.13-.04.2-.74,0-1.57.02-2.47.03-.91,0-1.9,0-2.92,0,.04-.06.08-.12.12-.18.04-.07.09-.14.13-.21.94-.01,1.84-.02,2.68-.03.93-.02,1.79-.03,2.55-.04Z"/>
                <path className="abc-309" d="M502.45,401.97c0,.08-.02.16-.02.24-.76.01-1.62.03-2.55.04-.84,0-1.73.02-2.68.03.04-.07.08-.14.11-.21.91-.02,1.77-.03,2.57-.05.95-.02,1.81-.03,2.57-.05Z"/>
                <path className="abc-130" d="M504.82,411.73c0,.16-.02.32-.02.49-.47-.02-.98-.04-1.5-.07-.53-.02-1.08-.05-1.65-.07,0-.16.01-.32.02-.47.57.02,1.13.04,1.66.07.53.02,1.03.04,1.5.06Z"/>
                <path className="abc-364" d="M504.9,410.64c0,.2-.03.4-.04.6,0,.16-.02.32-.03.49-.47-.02-.97-.04-1.5-.06-.53-.02-1.08-.04-1.66-.07,0-.16.02-.32.03-.47.01-.2.03-.39.04-.59.59.02,1.16.04,1.69.05.53.02,1.02.03,1.47.05Z"/>
                <path className="abc-365" d="M504.96,409.33c-.01.24-.03.48-.03.71,0,.2-.02.4-.03.6-.45-.02-.94-.03-1.47-.05-.53-.02-1.1-.04-1.69-.05,0-.2.03-.39.03-.59,0-.23.02-.46.03-.7.6.01,1.17.03,1.7.04.53.01,1.02.02,1.46.03Z"/>
                <path className="abc-184" d="M505.03,408.24c0,.13-.01.25-.02.38-.01.24-.04.48-.05.71-.44-.01-.93-.02-1.46-.03-.53-.01-1.1-.02-1.7-.04.01-.23.04-.46.05-.7,0-.12.02-.24.02-.37.62,0,1.2.02,1.73.02.53,0,1.01.01,1.43.02Z"/>
                <path className="abc-61" d="M505.02,407.58c0,.09.02.18.02.28,0,.13,0,.25-.01.38-.42,0-.9-.01-1.43-.02-.53,0-1.11-.01-1.73-.02,0-.12.01-.24.01-.37,0-.09-.01-.19-.02-.28.62,0,1.2.01,1.73.02.53,0,1.01.01,1.43.02Z"/>
                <path className="abc-404" d="M504.97,407.12c0,.06.01.12.02.18,0,.09.02.18.03.28-.42,0-.9-.01-1.43-.02-.53,0-1.11-.01-1.73-.02,0-.09-.02-.19-.03-.28,0-.06-.01-.12-.02-.19.61,0,1.18.02,1.71.03.53,0,1.02.02,1.46.02Z"/>
                <path className="abc-111" d="M504.95,406.75c0,.06.01.12.01.19s0,.12.01.18c-.44,0-.93-.01-1.46-.02-.53,0-1.1-.02-1.71-.03,0-.06-.01-.12-.01-.19s0-.13-.01-.19c.6,0,1.18.02,1.71.03s1.02.02,1.46.03Z"/>
                <path className="abc-56" d="M504.9,406.36c0,.07.02.14.02.21,0,.06.02.12.02.19-.44,0-.93-.02-1.46-.03s-1.1-.02-1.71-.03c0-.06-.01-.13-.02-.19,0-.07-.02-.14-.02-.21.59.01,1.16.02,1.69.03.53.01,1.02.02,1.48.03Z"/>
                <path className="abc-225" d="M504.88,406.08s0,.04,0,.06c0,.07.01.14.02.21-.45,0-.95-.02-1.48-.03-.53-.01-1.1-.02-1.69-.03,0-.07-.02-.14-.02-.21,0-.02,0-.04,0-.07.59.01,1.15.02,1.68.03.53.01,1.03.02,1.48.03Z"/>
                <path className="abc-357" d="M504.93,405.63c-.01.13-.06.26-.06.38,0,.02,0,.04,0,.06-.46,0-.95-.02-1.48-.03-.53-.01-1.09-.02-1.68-.03,0-.02,0-.04,0-.07,0-.12.03-.25.05-.37.59.01,1.15.02,1.68.03.53,0,1.04.02,1.49.03Z"/>
                <path className="abc-169" d="M505.09,404.97c-.02.09-.05.18-.07.27-.02.13-.07.26-.09.38-.46,0-.96-.02-1.49-.03-.53,0-1.09-.02-1.68-.03.01-.12.06-.25.08-.37.02-.09.05-.18.07-.27.63,0,1.21.01,1.75.02.53,0,1.02.01,1.44.02Z"/>
                <path className="abc-93" d="M505.24,404.33c-.01.12-.05.25-.07.37-.02.09-.05.18-.07.27-.42,0-.9-.01-1.44-.02-.53,0-1.12-.01-1.75-.02.02-.09.05-.18.06-.27.02-.12.06-.24.07-.36.67,0,1.28,0,1.82,0,.54,0,.99,0,1.37.01Z"/>
                <path className="abc-217" d="M505.37,403.39c-.03.19-.09.38-.09.57,0,.12-.03.25-.04.37-.38,0-.84,0-1.37-.01-.54,0-1.15,0-1.82,0,.01-.12.04-.24.04-.36,0-.18.05-.37.08-.56.69,0,1.3,0,1.84,0s1,0,1.36,0Z"/>
                <path className="abc-404" d="M505.56,402.61c-.01.07-.04.14-.05.21-.04.19-.12.38-.14.58-.36,0-.83,0-1.36,0s-1.15,0-1.84,0c.03-.19.1-.37.14-.56.01-.07.04-.13.05-.2.74,0,1.39-.02,1.93-.02.54,0,.97-.01,1.28-.01Z"/>
                <path className="abc-404" d="M505.65,402.15c0,.08-.03.16-.04.25,0,.07-.03.14-.04.21-.31,0-.74,0-1.28.01-.54,0-1.19.01-1.93.02.01-.07.03-.13.04-.2.01-.08.03-.16.04-.24.76-.01,1.43-.02,1.97-.03.54,0,.96-.02,1.25-.02Z"/>
                <path className="abc-309" d="M505.68,401.91c0,.08-.02.16-.03.25-.29,0-.71.01-1.25.02-.54,0-1.21.02-1.97.03,0-.08.02-.16.02-.24.76-.01,1.42-.03,1.97-.04.54-.01.97-.02,1.26-.02Z"/>
                <path className="abc-344" d="M506.12,411.79v.49c-.4-.02-.84-.04-1.32-.06,0-.16.01-.32.02-.49.47.02.91.04,1.3.06Z"/>
                <path className="abc-217" d="M506.12,410.69v1.1c-.39-.02-.83-.04-1.3-.06,0-.16.02-.32.03-.49.01-.2.03-.4.04-.6.45.02.86.03,1.23.04Z"/>
                <path className="abc-365" d="M506.12,409.36v1.33c-.37-.01-.78-.03-1.23-.04,0-.2.03-.4.03-.6,0-.24.02-.48.03-.71.44.01.83.02,1.17.03Z"/>
                <path className="abc-184" d="M506.12,408.26v1.1c-.33,0-.72-.02-1.17-.03.01-.24.04-.48.05-.71,0-.13.02-.25.02-.38.42,0,.79.01,1.1.02Z"/>
                <path className="abc-61" d="M506.12,407.6v.66c-.31,0-.67-.01-1.1-.02,0-.13.01-.25.01-.38,0-.09-.01-.18-.02-.28.42,0,.79.01,1.1.01Z"/>
                <path className="abc-404" d="M506.12,407.14v.46c-.31,0-.68,0-1.1-.01,0-.09-.02-.19-.03-.28,0-.06-.01-.12-.02-.18.44,0,.83.01,1.15.02Z"/>
                <path className="abc-160" d="M506.12,406.77v.37c-.33,0-.72-.01-1.15-.02,0-.06-.01-.12-.01-.18s0-.12-.01-.19c.44,0,.83.02,1.17.02Z"/>
                <path className="abc-404" d="M506.12,406.38v.39c-.34,0-.73-.01-1.17-.02,0-.06-.01-.12-.02-.19,0-.07-.02-.14-.02-.21.45,0,.86.02,1.22.02Z"/>
                <path className="abc-415" d="M506.12,406.11v.27c-.36,0-.77-.02-1.22-.02,0-.07-.02-.14-.02-.21,0-.02,0-.04,0-.06.46,0,.87.02,1.24.03Z"/>
                <path className="abc-456" d="M506.12,405.66v.45c-.37,0-.78-.02-1.24-.03,0-.02,0-.04,0-.06,0-.13.04-.26.06-.38.46,0,.86.02,1.19.02Z"/>
                <path className="abc-169" d="M506.12,404.99v.66c-.33,0-.73-.02-1.19-.02.01-.13.07-.26.09-.38.02-.09.05-.18.07-.27.42,0,.77.01,1.03.02Z"/>
                <path className="abc-309" d="M506.12,404.34v.65c-.26,0-.61-.01-1.03-.02.02-.09.05-.18.07-.27.02-.12.06-.25.07-.37.38,0,.67,0,.89.01Z"/>
                <path className="abc-404" d="M506.12,403.39v.95c-.21,0-.51,0-.89-.01.01-.12.04-.25.04-.37,0-.19.06-.38.09-.57.36,0,.62,0,.75,0Z"/>
                <path className="abc-404" d="M506.12,402.61v.79c-.13,0-.39,0-.75,0,.03-.19.11-.38.14-.58.01-.07.04-.14.05-.21.31,0,.5,0,.56,0Z"/>
                <path className="abc-56" d="M506.12,402.15v.46c-.06,0-.25,0-.56,0,.01-.07.03-.14.04-.21.01-.08.04-.16.04-.25.29,0,.45,0,.47,0Z"/>
                <path className="abc-93" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
              </g>
              <g>
                <path className="abc-52" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
              </g>
              <g>
                <path className="abc-52" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
              </g>
            </g>
            <g id="MeshGrid-2" data-name="MeshGrid">
              <g>
                <path className="abc-427" d="M505.38,874.66c.02.3.14.6.16.88.38-.01.58-.03.58-.03v-.97c-.1,0-.35.06-.74.12Z"/>
                <path className="abc-390" d="M505.1,873c.02.25.1.49.12.73.03.32.14.63.17.93.39-.06.64-.12.74-.12v-1.7c-.25,0-.59.09-1.02.16Z"/>
                <path className="abc-119" d="M504.89,871.67c.02.2.07.39.09.58.02.25.1.5.12.75.43-.08.77-.16,1.02-.16v-1.28c-.36,0-.76.06-1.23.11Z"/>
                <path className="abc-196" d="M504.75,870.66c.01.14.05.28.06.42.02.2.07.4.09.59.47-.05.87-.11,1.23-.11v-.93c-.42,0-.88.02-1.37.04Z"/>
                <path className="abc-343" d="M504.64,869.5c.02.25.03.49.05.74.01.14.05.28.06.42.5-.01.95-.03,1.37-.04v-1.15c-.45,0-.95.02-1.48.03Z"/>
                <path className="abc-360" d="M504.47,866.84c.04.64.07,1.28.12,1.93.02.25.03.49.05.74.53-.01,1.04-.03,1.48-.03v-2.78c-.47.01-1.04.08-1.65.15Z"/>
                <path className="abc-5" d="M504.23,861.74c.05,1.06.08,2.12.14,3.17.04.64.06,1.28.1,1.92.61-.07,1.18-.14,1.65-.15v-5.33c-.53.03-1.19.21-1.89.39Z"/>
                <path className="abc-327" d="M504.03,854.71c.03,1.29.05,2.58.09,3.86.04,1.06.06,2.12.11,3.17.71-.18,1.37-.36,1.89-.39v-7.36c-.61.05-1.32.38-2.09.71Z"/>
                <path className="abc-364" d="M503.98,849.53c0,.44,0,.87,0,1.31.01,1.29.01,2.59.04,3.87.77-.33,1.49-.66,2.09-.71v-5.4c-.65.06-1.36.49-2.14.93Z"/>
                <path className="abc-364" d="M503.98,846.28c0,.67,0,1.32,0,1.93,0,.44,0,.87,0,1.31.78-.44,1.49-.87,2.14-.93v-2.98c-.65.06-1.36.36-2.14.66Z"/>
                <path className="abc-404" d="M503.99,842.75v1.44c0,.72,0,1.42,0,2.09.78-.3,1.49-.6,2.14-.66v-3.42c-.65.06-1.36.31-2.13.56Z"/>
                <path className="abc-406" d="M503.99,633.17c0,87.27,0,177.63,0,208.13v1.46c.78-.25,1.49-.49,2.13-.56v-204.49c-.64.88-1.35-1.83-2.13-4.54Z"/>
                <path
                  className={`abc-108${pathAnimating ? ' path-animated' : ''}`}
                  d="M503.99,425.81c0,1.98,0,3.99,0,6.11,0,5.51,0,12.6,0,21.84,0,29.86,0,103.49,0,179.4.78,2.7,1.5,5.42,2.13,4.54v-209.19c-.63-.03-1.35-1.37-2.13-2.7Z"
                  onClick={handlePathClick}
                  onKeyDown={handlePathKeyDown}
                  onAnimationEnd={handlePathAnimationEnd}
                  style={{ cursor: 'pointer' }}
                  role="button"
                  tabIndex={0}
                  aria-label="Animate"
                />
                <path className="abc-300" d="M503.99,416.52c0,1.18,0,2.37,0,3.62,0,1.83,0,3.71,0,5.68.79,1.33,1.5,2.68,2.13,2.7v-10.77c-.63-.03-1.34-.63-2.13-1.23Z"/>
                <path className="abc-396" d="M503.99,412.64v.47c0,1.11,0,2.23,0,3.41.79.6,1.5,1.2,2.13,1.23v-4.87c-.63-.03-1.34-.13-2.13-.24Z"/>
                <path className="abc-344" d="M503.99,412.18v.46c.79.1,1.5.21,2.13.24v-.6c-.63-.03-1.34-.06-2.13-.1Z"/>
                <path className="abc-60" d="M503.04,874.75c.07.28.13.55.19.79.24,0,.48.01.69.02.69.01,1.24,0,1.62-.01-.02-.29-.14-.58-.16-.88-.39.06-.93.11-1.6.1-.25,0-.49,0-.75-.01Z"/>
                <path className="abc-376" d="M502.66,873.11c.06.25.12.5.17.73.07.32.14.62.21.9.26,0,.5,0,.75.01.67.01,1.2-.04,1.6-.1-.02-.3-.14-.61-.17-.93-.02-.24-.1-.48-.12-.73-.43.08-.95.15-1.58.13-.3,0-.57-.01-.86-.02Z"/>
                <path className="abc-95" d="M502.33,871.72c.05.21.1.42.14.62.06.27.12.53.18.78.29,0,.57.01.86.02.63.02,1.15-.06,1.58-.13-.02-.25-.1-.5-.12-.75-.02-.19-.07-.39-.09-.58-.47.05-.99.1-1.59.08-.33-.01-.64-.02-.97-.03Z"/>
                <path className="abc-384" d="M502.07,870.63c.04.15.07.3.11.45.05.22.1.43.15.64.33.01.64.02.97.03.6.02,1.13-.03,1.59-.08-.02-.2-.07-.39-.09-.59-.01-.14-.04-.28-.06-.42-.5.01-1.03.02-1.62,0-.35-.01-.7-.02-1.06-.04Z"/>
                <path className="abc-303" d="M501.79,869.44c.06.24.12.48.18.72.04.15.07.31.11.46.36.02.71.03,1.06.04.58.02,1.12.01,1.62,0-.01-.14-.05-.28-.06-.42-.02-.25-.03-.49-.05-.74-.53.01-1.1.01-1.68,0-.36-.01-.76-.03-1.17-.06Z"/>
                <path className="abc-87" d="M501.19,866.85c.14.63.27,1.24.42,1.87.06.24.11.48.17.72.41.03.81.05,1.17.06.58.02,1.15.01,1.68,0-.02-.25-.03-.49-.05-.74-.04-.64-.08-1.29-.12-1.93-.61.07-1.25.13-1.87.12-.42,0-.91-.05-1.42-.1Z"/>
                <path className="abc-5" d="M500.17,861.94c.21,1.03.39,2.02.62,3.06.14.62.26,1.23.4,1.86.51.05.99.1,1.42.1.61.01,1.26-.05,1.87-.12-.04-.64-.07-1.28-.1-1.92-.06-1.06-.09-2.12-.14-3.17-.71.18-1.46.35-2.16.36-.61.02-1.24-.06-1.9-.16Z"/>
                <path className="abc-349" d="M498.97,855.14c.21,1.26.4,2.49.63,3.74.19,1.03.36,2.03.57,3.06.66.11,1.29.19,1.9.16.7,0,1.46-.18,2.16-.36-.05-1.06-.07-2.11-.11-3.17-.04-1.29-.06-2.57-.09-3.86-.77.33-1.6.66-2.43.7-.87.05-1.72-.08-2.63-.27Z"/>
                <path className="abc-33" d="M498.27,850.07c.05.43.08.85.14,1.28.18,1.28.35,2.52.56,3.78.91.18,1.77.32,2.63.27.83-.04,1.66-.37,2.43-.7-.03-1.29-.03-2.58-.04-3.87,0-.43,0-.87,0-1.31-.78.44-1.62.87-2.51.92-1,.07-2.06-.12-3.2-.37Z"/>
                <path className="abc-223" d="M498.02,846.74c.04.67.07,1.42.12,2.04.05.44.07.86.12,1.29,1.14.26,2.19.45,3.2.37.9-.05,1.74-.49,2.51-.92,0-.44,0-.87,0-1.31,0-.62,0-1.26,0-1.93-.78.3-1.62.6-2.52.66-1.05.07-2.2-.05-3.44-.2Z"/>
                <path className="abc-261" d="M497.91,843.67c.01.29.02.63.03.9.03.71.05,1.5.09,2.17,1.24.15,2.39.27,3.44.2.9-.06,1.75-.36,2.52-.66,0-.67,0-1.37,0-2.09v-1.44c-.78.25-1.62.49-2.53.55-1.08.06-2.27.21-3.55.37Z"/>
                <path className="abc-261" d="M497.39,639.2c.03,60.23.12,118.51.12,148.75s.1,47.6.37,54.75c.01.32.01.68.03.97,1.28-.16,2.47-.3,3.55-.37.91-.06,1.75-.3,2.53-.55v-1.46c0-30.5,0-120.86,0-208.13-.78-2.7-1.63-5.39-2.53-4.45-1.27-2.62-2.64,3.91-4.07,10.48Z"/>
                <path className="abc-404" d="M497.17,423.52c0,1.92,0,3.94,0,6.16,0,2.65.01,5.72.01,9.24,0,3.97.01,8.73.01,14.42,0,28.49.15,108.66.19,185.86,1.43-6.57,2.8-13.1,4.07-10.48.9-.94,1.75,1.74,2.53,4.45,0-75.91,0-149.55,0-179.4,0-9.24,0-16.33,0-21.84,0-2.12,0-4.14,0-6.11-.79-1.33-1.64-2.64-2.53-2.59-1.36.08-2.82.16-4.29.29Z"/>
                <path className="abc-404" d="M497.16,415.12c0,.97,0,2.01,0,3.17,0,1.59,0,3.31,0,5.22,1.47-.12,2.92-.21,4.29-.29.89-.05,1.75,1.26,2.53,2.59,0-1.98,0-3.85,0-5.68,0-1.25,0-2.44,0-3.62-.78-.6-1.64-1.2-2.53-1.21-1.36-.02-2.82-.11-4.3-.18Z"/>
                <path className="abc-337" d="M497.15,412.21c0,.11,0,.21,0,.32,0,.77,0,1.62,0,2.59,1.48.07,2.94.16,4.3.18.9.01,1.75.61,2.53,1.21,0-1.18,0-2.3,0-3.41v-.47c-.79-.1-1.64-.21-2.53-.25-1.36-.06-2.83-.12-4.31-.19Z"/>
                <path className="abc-85" d="M497.15,411.9v.31c1.48.06,2.94.13,4.31.19.9.04,1.75.14,2.53.25v-.46c-.79-.04-1.64-.07-2.53-.11-1.36-.06-2.83-.12-4.31-.17Z"/>
                <path className="abc-115" d="M501.97,874.7c.09.28.18.55.26.79.08,0,.15,0,.23.01.27.01.53.03.77.03-.06-.24-.12-.51-.19-.79-.26,0-.53-.01-.83-.03-.08,0-.16,0-.24-.01Z"/>
                <path className="abc-235" d="M501.43,873.06c.08.26.16.5.24.74.1.32.2.62.29.9.08,0,.16,0,.24.01.3.02.57.02.83.03-.07-.28-.14-.58-.21-.9-.05-.24-.11-.48-.17-.73-.29,0-.59-.02-.94-.04-.1,0-.19-.01-.28-.02Z"/>
                <path className="abc-362" d="M500.96,871.65c.07.21.14.42.21.62.09.27.18.53.26.79.09,0,.19,0,.28.02.35.02.65.03.94.04-.06-.25-.12-.51-.18-.78-.05-.2-.1-.41-.14-.62-.33-.01-.67-.03-1.05-.05-.11,0-.21-.01-.32-.02Z"/>
                <path className="abc-71" d="M500.59,870.55c.05.15.1.31.16.46.07.22.15.43.22.64.11,0,.21.01.32.02.38.02.72.04,1.05.05-.05-.21-.1-.42-.15-.64-.04-.15-.07-.3-.11-.45-.36-.02-.74-.04-1.14-.06-.11,0-.23-.01-.34-.02Z"/>
                <path className="abc-284" d="M500.17,869.34c.09.25.17.5.26.74.05.16.11.31.16.46.11,0,.23.01.34.02.4.02.78.04,1.14.06-.04-.15-.07-.31-.11-.46-.06-.24-.12-.48-.18-.72-.41-.03-.84-.06-1.26-.08-.12,0-.24-.01-.36-.02Z"/>
                <path className="abc-360" d="M499.23,866.66c.23.64.46,1.29.69,1.93.09.25.17.5.26.74.12,0,.24.02.36.02.42.02.84.05,1.26.08-.06-.24-.11-.48-.17-.72-.15-.63-.28-1.24-.42-1.87-.51-.05-1.03-.12-1.54-.16-.14-.01-.28-.02-.43-.03Z"/>
                <path className="abc-5" d="M497.4,861.56c.38,1.06.75,2.12,1.13,3.17.23.64.46,1.29.69,1.93.14.01.29.02.43.03.5.04,1.03.1,1.54.16-.14-.63-.27-1.24-.4-1.86-.23-1.03-.41-2.03-.62-3.06-.66-.11-1.36-.24-2.12-.32-.21-.02-.43-.04-.65-.06Z"/>
                <path className="abc-206" d="M495.01,854.49c.41,1.3.84,2.6,1.29,3.89.37,1.06.73,2.12,1.11,3.18.22.01.44.03.65.06.76.08,1.46.22,2.12.32-.21-1.03-.38-2.02-.57-3.06-.23-1.26-.42-2.48-.63-3.74-.91-.18-1.88-.42-2.98-.56-.31-.04-.64-.07-.98-.09Z"/>
                <path className="abc-88" d="M493.48,849.2c.11.45.23.9.36,1.35.37,1.32.76,2.64,1.17,3.95.34.02.67.05.98.09,1.1.14,2.07.38,2.98.56-.21-1.26-.37-2.5-.56-3.78-.06-.43-.09-.85-.14-1.28-1.14-.25-2.35-.57-3.66-.76-.37-.05-.74-.09-1.13-.12Z"/>
                <path className="abc-31" d="M492.85,846.26c.09.53.19,1.04.31,1.59.1.45.21.91.32,1.36.38.03.76.07,1.13.12,1.31.18,2.53.5,3.66.76-.05-.43-.07-.86-.12-1.29-.06-.63-.09-1.37-.12-2.04-1.24-.15-2.57-.35-3.97-.42-.39-.02-.8-.05-1.21-.06Z"/>
                <path className="abc-342" d="M492.54,844.17c.02.21.05.4.08.58.07.5.15.98.23,1.51.41.02.81.04,1.21.06,1.41.08,2.74.27,3.97.42-.04-.67-.06-1.46-.09-2.17-.01-.27-.02-.6-.03-.9-1.28.16-2.66.32-4.12.43-.41.03-.83.05-1.25.07Z"/>
                <path className="abc-47" d="M491.7,648.5c.03,60.54.06,113.83.06,130.07,0,40.24.14,58.65.71,64.92.02.25.05.47.07.69.42-.02.84-.05,1.25-.07,1.46-.1,2.84-.27,4.12-.43-.01-.29-.02-.65-.03-.97-.26-7.14-.37-24.19-.37-54.75s-.1-88.52-.12-148.75c-1.43,6.57-2.91,13.18-4.43,10.72-.42-.91-.84-1.16-1.27-1.43Z"/>
                <path className="abc-147" d="M491.58,421.78c0,1.71,0,3.55,0,5.52,0,2.17,0,4.7,0,7.57,0,32.62.06,130.05.1,213.62.42.27.85.52,1.27,1.43,1.51,2.46,3-4.15,4.43-10.72-.03-77.2-.18-157.38-.19-185.86,0-5.69-.01-10.46-.01-14.42,0-3.52,0-6.59-.01-9.24,0-2.21,0-4.24,0-6.16-1.47.12-2.96.28-4.39.52-.4-.85-.8-1.55-1.2-2.25Z"/>
                <path className="abc-342" d="M491.57,414.4c0,.82,0,1.72,0,2.71,0,1.4,0,2.96,0,4.67.39.7.79,1.4,1.2,2.25,1.44-.23,2.92-.39,4.39-.52,0-1.92,0-3.63,0-5.22,0-1.16,0-2.2,0-3.17-1.48-.07-2.97-.13-4.41-.1-.4-.24-.8-.43-1.18-.62Z"/>
                <path className="abc-189" d="M491.57,411.97c0,.09,0,.17,0,.26,0,.63,0,1.35,0,2.17.39.19.78.38,1.18.62,1.43-.03,2.93.03,4.41.1,0-.97,0-1.82,0-2.59,0-.11,0-.22,0-.32-1.48-.06-2.98-.12-4.41-.16-.4-.02-.79-.05-1.18-.08Z"/>
                <path className="abc-223" d="M491.57,411.72v.25c.39.03.78.06,1.18.08,1.43.04,2.93.1,4.41.16v-.31c-1.48-.06-2.98-.11-4.41-.15-.4-.01-.79-.02-1.18-.03Z"/>
                <path className="abc-315" d="M501.25,874.65c.12.28.24.55.33.79.14.01.28.02.42.03.08,0,.16.01.24.01-.08-.24-.17-.5-.26-.79-.08,0-.16,0-.25-.01-.17-.01-.32-.02-.47-.04Z"/>
                <path className="abc-235" d="M500.51,873c.12.26.23.51.34.75.14.32.28.63.4.91.15.01.3.02.47.04.09,0,.17.01.25.01-.09-.28-.19-.58-.29-.9-.08-.24-.16-.49-.24-.74-.09,0-.19-.01-.29-.02-.22-.01-.43-.03-.63-.05Z"/>
                <path className="abc-171" d="M499.88,871.58c.09.21.18.42.27.63.12.27.24.54.35.79.21.02.41.03.63.05.1,0,.2.01.29.02-.08-.26-.17-.52-.26-.79-.07-.2-.14-.41-.21-.62-.11,0-.21-.01-.32-.02-.25-.02-.51-.03-.76-.05Z"/>
                <path className="abc-122" d="M499.42,870.47c.06.15.12.31.19.46.09.22.18.43.27.65.25.02.51.03.76.05.11,0,.22.01.32.02-.07-.21-.14-.43-.22-.64-.05-.15-.1-.3-.16-.46-.11,0-.23-.01-.35-.02-.27-.02-.55-.04-.83-.05Z"/>
                <path className="abc-414" d="M498.95,869.26c.1.25.19.49.29.74.06.16.12.31.18.46.28.02.55.04.83.05.12,0,.23.01.35.02-.05-.15-.11-.31-.16-.46-.09-.25-.17-.5-.26-.74-.12,0-.24-.02-.36-.02-.28-.02-.57-.03-.86-.05Z"/>
                <path className="abc-79" d="M497.87,866.6c.27.64.53,1.28.78,1.92.1.25.2.49.29.74.29.02.58.03.86.05.12,0,.24.02.36.02-.09-.25-.17-.5-.26-.74-.23-.64-.46-1.29-.69-1.93-.14-.01-.29-.02-.44-.03-.29-.02-.6-.02-.91-.03Z"/>
                <path className="abc-5" d="M495.72,861.53c.45,1.05.9,2.1,1.35,3.15.27.64.54,1.28.81,1.91.31,0,.62.02.91.03.15,0,.3.02.44.03-.23-.64-.46-1.29-.69-1.93-.38-1.06-.76-2.12-1.13-3.17-.22-.01-.45-.02-.68-.02-.31,0-.66,0-1,0Z"/>
                <path className="abc-339" d="M492.89,854.49c.47,1.3.98,2.6,1.51,3.88.43,1.06.88,2.11,1.32,3.16.35,0,.69,0,1,0,.23,0,.46,0,.68.02-.38-1.06-.74-2.12-1.11-3.18-.44-1.29-.87-2.59-1.29-3.89-.34-.02-.69-.03-1.03-.02-.35,0-.72.01-1.09.02Z"/>
                <path className="abc-40" d="M491.2,849.18c.12.45.25.9.38,1.35.39,1.34.83,2.65,1.3,3.96.37,0,.74-.02,1.09-.02.34,0,.69,0,1.03.02-.41-1.3-.8-2.62-1.17-3.95-.12-.45-.25-.9-.36-1.35-.38-.03-.78-.04-1.18-.03-.37,0-.73.01-1.1.01Z"/>
                <path className="abc-314" d="M490.51,846.25c.1.51.21,1.03.34,1.57.11.46.23.91.35,1.36.37,0,.73,0,1.1-.01.4,0,.79,0,1.18.03-.11-.45-.22-.9-.32-1.36-.12-.55-.22-1.06-.31-1.59-.41-.02-.83-.02-1.25-.02-.36,0-.73.01-1.09,0Z"/>
                <path className="abc-62" d="M490.16,844.17c.03.23.05.42.09.61.08.47.16.96.26,1.47.36,0,.73,0,1.09,0,.42,0,.84,0,1.25.02-.09-.53-.16-1.01-.23-1.51-.03-.18-.05-.36-.08-.58-.42.02-.85.03-1.29.04-.36,0-.72-.01-1.09-.04Z"/>
                <path className="abc-336" d="M489.34,636.53c0,53.83.01,104.5.02,133.7,0,1.55,0,3.06,0,4.51,0,17.86.03,32.06.12,43.11.08,11.25.02,19.75.61,25.6.03.27.05.49.08.72.37.03.73.04,1.09.04.44,0,.87-.02,1.29-.04-.02-.21-.05-.43-.07-.69-.56-6.28-.71-24.68-.71-64.92,0-16.23-.03-69.52-.06-130.07-.42-.27-.85-.56-1.27-1.55-.36-1.06-.72-5.73-1.09-10.42Z"/>
                <path className="abc-415" d="M489.32,423.82c0,1.78,0,3.61,0,5.5,0,31.06,0,122.77.01,207.21.37,4.69.73,9.36,1.09,10.42.42.99.85,1.28,1.27,1.55-.04-83.58-.1-181-.1-213.62,0-2.87,0-5.4,0-7.57,0-1.97,0-3.82,0-5.52-.39-.7-.78-1.4-1.16-2.25-.37-.02-.74,2.14-1.1,4.29Z"/>
                <path className="abc-415" d="M489.32,415.49v3.18c0,1.65,0,3.37,0,5.15.37-2.15.74-4.31,1.1-4.29.38.85.77,1.55,1.16,2.25,0-1.7,0-3.27,0-4.67,0-.99,0-1.9,0-2.71-.39-.19-.77-.38-1.14-.61-.37,0-.74.85-1.1,1.7Z"/>
                <path className="abc-339" d="M489.32,412.08v.41c0,.97,0,1.98,0,3.01.37-.86.74-1.71,1.1-1.7.37.24.75.42,1.14.61,0-.82,0-1.54,0-2.17,0-.09,0-.18,0-.26-.39-.03-.77-.06-1.14-.08-.37,0-.74.09-1.11.18Z"/>
                <path className="abc-406" d="M489.32,411.67v.41c.37-.1.74-.19,1.11-.18.37.01.75.04,1.14.08v-.25c-.39,0-.77-.02-1.14-.03-.37,0-.74-.01-1.11-.02Z"/>
                <path className="abc-129" d="M499.9,874.53c.19.29.37.56.52.81.25.03.49.05.73.07.15.01.29.02.43.04-.09-.24-.21-.51-.33-.79-.15-.01-.31-.03-.48-.04-.29-.02-.57-.05-.86-.08Z"/>
                <path className="abc-229" d="M498.79,872.85c.17.26.34.51.5.75.21.33.43.63.62.92.29.03.58.06.86.08.18.01.33.03.48.04-.12-.28-.26-.59-.4-.91-.11-.24-.22-.49-.34-.75-.21-.02-.42-.03-.64-.05-.36-.03-.72-.06-1.08-.09Z"/>
                <path className="abc-11" d="M497.89,871.42c.13.21.25.42.38.63.17.27.34.54.51.8.36.04.71.07,1.08.09.22.02.43.03.64.05-.11-.26-.23-.52-.35-.79-.09-.21-.18-.42-.27-.63-.25-.02-.51-.04-.76-.05-.42-.03-.82-.06-1.23-.1Z"/>
                <path className="abc-196" d="M497.26,870.31c.08.15.17.31.26.46.13.22.25.44.38.65.4.04.81.07,1.23.1.26.02.51.04.76.05-.09-.21-.18-.43-.27-.65-.06-.15-.13-.3-.19-.46-.28-.02-.55-.04-.83-.06-.45-.03-.89-.07-1.34-.1Z"/>
                <path className="abc-28" d="M496.66,869.12c.12.24.23.48.35.73.08.16.16.31.24.47.44.04.89.07,1.34.1.28.02.55.04.83.06-.06-.15-.12-.31-.18-.46-.09-.25-.19-.5-.29-.74-.29-.02-.58-.03-.86-.05-.46-.03-.94-.06-1.42-.09Z"/>
                <path className="abc-118" d="M495.39,866.51c.31.63.61,1.25.92,1.88.12.24.23.48.35.72.48.03.96.06,1.42.09.28.02.57.04.86.05-.1-.25-.19-.49-.29-.74-.26-.64-.52-1.28-.78-1.92-.31,0-.62-.02-.92-.04-.48-.03-1.02-.04-1.56-.05Z"/>
                <path className="abc-5" d="M492.97,861.53c.49,1.04.99,2.07,1.49,3.1.31.63.61,1.25.92,1.88.54.01,1.09.02,1.56.05.29.02.6.03.92.04-.27-.64-.54-1.28-.81-1.91-.45-1.05-.9-2.1-1.35-3.15-.35,0-.69,0-1.01,0-.52-.02-1.13,0-1.73,0Z"/>
                <path className="abc-44" d="M489.98,854.52c.49,1.31,1.01,2.6,1.57,3.88.46,1.05.93,2.09,1.42,3.13.61,0,1.22-.02,1.73,0,.32.01.66.01,1.01,0-.45-1.05-.89-2.1-1.32-3.16-.53-1.29-1.03-2.58-1.51-3.88-.37,0-.74.02-1.09.01-.57,0-1.19,0-1.81.02Z"/>
                <path className="abc-159" d="M488.3,849.15c.12.46.24.92.37,1.38.39,1.36.83,2.69,1.31,4,.62,0,1.24-.02,1.81-.02.35,0,.72,0,1.09-.01-.47-1.31-.91-2.62-1.3-3.96-.13-.45-.26-.9-.38-1.35-.37,0-.73,0-1.1,0-.6,0-1.2-.02-1.8-.04Z"/>
                <path className="abc-247" d="M487.63,846.18c.1.51.21,1.04.33,1.57.11.47.22.93.34,1.4.6.02,1.2.03,1.8.04.37,0,.74,0,1.1,0-.12-.45-.24-.9-.35-1.36-.13-.54-.24-1.06-.34-1.57-.36,0-.73,0-1.09-.01-.6-.01-1.19-.03-1.79-.06Z"/>
                <path className="abc-327" d="M487.23,843.71c.04.36.09.68.13.98.07.47.16.97.26,1.48.6.03,1.19.05,1.79.06.37,0,.73.01,1.09.01-.1-.51-.19-1-.26-1.47-.03-.19-.06-.38-.09-.61-.37-.03-.73-.07-1.1-.12-.6-.08-1.21-.2-1.82-.34Z"/>
                <path className="abc-202" d="M486.42,625.88c0,48.14.02,96.99.04,137.9,0,16.3.04,31.31.06,44.5.02,13.61-.31,25.31.6,34.37.04.35.07.71.12,1.07.61.13,1.22.25,1.82.34.37.05.74.09,1.1.12-.03-.23-.05-.45-.08-.72-.58-5.85-.52-14.35-.61-25.6-.09-11.05-.12-25.26-.12-43.11,0-1.45,0-2.96,0-4.51,0-29.2-.01-79.87-.02-133.7-.37-4.69-.74-9.38-1.1-10.48-.6.07-1.21-.01-1.82-.16Z"/>
                <path className="abc-195" d="M486.42,428.07c0,2.19,0,4.38,0,6.57,0,36.04,0,112.69,0,191.25.61.15,1.22.23,1.82.16.37,1.1.74,5.8,1.1,10.48,0-84.44-.01-176.15-.01-207.21,0-1.89,0-3.72,0-5.5-.37,2.15-.74,4.31-1.11,4.3-.6,0-1.2-.03-1.8-.06Z"/>
                <path className="abc-378" d="M486.42,417.17c0,1.44,0,2.88,0,4.32,0,2.19,0,4.38,0,6.57.6.02,1.2.05,1.8.06.37,0,.74-2.15,1.11-4.3,0-1.78,0-3.49,0-5.15v-3.18c-.37.86-.74,1.72-1.11,1.71-.6,0-1.2-.02-1.8-.03Z"/>
                <path className="abc-285" d="M486.42,412.25v4.93c.6.01,1.2.02,1.8.03.37,0,.74-.85,1.11-1.71,0-1.03,0-2.03,0-3.01v-.41c-.37.1-.74.19-1.11.19-.6,0-1.2-.01-1.8-.02Z"/>
                <path className="abc-402" d="M486.42,411.64v.61c.6,0,1.2.01,1.8.02.37,0,.74-.09,1.11-.19v-.41c-.37,0-.74-.01-1.11-.02-.6,0-1.2-.01-1.8-.02Z"/>
                <path className="abc-264" d="M497.93,874.27c.27.3.52.58.75.85.33.05.66.09.97.13.26.03.52.06.77.09-.14-.25-.33-.52-.52-.81-.29-.03-.58-.07-.88-.1-.36-.04-.72-.1-1.09-.15Z"/>
                <path className="abc-268" d="M496.43,872.56c.23.26.45.52.66.76.28.33.57.65.83.95.37.06.74.11,1.09.15.3.04.59.07.88.1-.19-.29-.41-.6-.62-.92-.16-.24-.33-.49-.5-.75-.36-.04-.71-.07-1.06-.12-.43-.05-.86-.11-1.29-.18Z"/>
                <path className="abc-150" d="M495.22,871.12c.17.22.36.43.53.64.23.28.46.54.68.81.44.06.87.12,1.29.18.35.04.71.08,1.06.12-.17-.26-.35-.53-.51-.8-.13-.21-.25-.42-.38-.63-.4-.04-.8-.08-1.21-.12-.49-.05-.97-.11-1.46-.18Z"/>
                <path className="abc-388" d="M494.33,870c.12.16.24.31.36.46.17.22.35.44.53.65.49.07.98.13,1.46.18.41.04.81.08,1.21.12-.13-.21-.25-.43-.38-.65-.09-.15-.17-.31-.26-.46-.44-.04-.89-.08-1.33-.12-.54-.05-1.07-.12-1.6-.19Z"/>
                <path className="abc-426" d="M493.52,868.83c.15.23.3.46.46.7.11.16.23.31.35.47.53.07,1.06.13,1.6.19.44.05.89.09,1.33.12-.08-.15-.17-.31-.24-.47-.12-.24-.23-.48-.35-.73-.48-.03-.96-.07-1.42-.11-.55-.06-1.14-.11-1.72-.17Z"/>
                <path className="abc-206" d="M491.93,866.32c.37.61.76,1.21,1.14,1.82.15.23.3.47.45.7.58.06,1.16.12,1.72.17.46.05.94.08,1.42.11-.12-.24-.23-.48-.35-.72-.31-.63-.61-1.26-.92-1.88-.54-.01-1.09-.03-1.56-.07-.57-.05-1.24-.08-1.9-.12Z"/>
                <path className="abc-5" d="M489.13,861.44c.54,1.03,1.11,2.04,1.7,3.05.36.61.72,1.22,1.1,1.83.66.04,1.32.07,1.9.12.47.04,1.02.06,1.56.07-.31-.63-.62-1.25-.92-1.88-.51-1.03-1.01-2.06-1.49-3.1-.61,0-1.22.01-1.73-.02-.62-.05-1.37-.05-2.1-.07Z"/>
                <path className="abc-267" d="M485.98,854.42c.49,1.33,1.03,2.63,1.62,3.91.48,1.05,1,2.09,1.53,3.11.74.02,1.48.02,2.1.07.52.04,1.13.03,1.73.02-.49-1.04-.97-2.08-1.42-3.13-.56-1.28-1.08-2.57-1.57-3.88-.62,0-1.24.01-1.82-.02-.69-.04-1.44-.05-2.18-.09Z"/>
                <path className="abc-267" d="M484.33,848.9c.11.48.23.97.35,1.44.38,1.4.81,2.75,1.3,4.08.74.03,1.49.05,2.18.09.58.03,1.2.03,1.82.02-.49-1.31-.93-2.64-1.31-4-.13-.46-.26-.92-.37-1.38-.6-.02-1.2-.05-1.8-.08-.72-.04-1.45-.1-2.17-.16Z"/>
                <path className="abc-367" d="M483.68,845.87c.1.51.22,1.04.33,1.57.1.49.2.98.31,1.46.72.07,1.44.12,2.17.16.6.04,1.2.06,1.8.08-.12-.46-.23-.93-.34-1.4-.12-.54-.23-1.06-.33-1.57-.6-.03-1.19-.07-1.79-.11-.72-.06-1.44-.12-2.15-.2Z"/>
                <path className="abc-36" d="M483.2,842.75c.06.53.14,1.13.21,1.62.07.48.17.98.27,1.49.72.07,1.43.14,2.15.2.6.05,1.19.08,1.79.11-.1-.51-.19-1.01-.26-1.48-.04-.3-.09-.62-.13-.98-.61-.13-1.22-.28-1.83-.43-.74-.18-1.47-.36-2.2-.53Z"/>
                <path className="abc-269" d="M482.4,624.9c0,47.86.01,96.44.06,137.15.02,16.45.1,31.59.04,44.86-.06,13.55-.39,25.19.51,34.19.05.51.12,1.13.18,1.65.73.17,1.47.35,2.2.53.61.15,1.22.29,1.83.43-.04-.36-.08-.71-.12-1.07-.9-9.05-.58-20.75-.6-34.37-.02-13.19-.05-28.2-.06-44.5-.02-40.91-.04-89.75-.04-137.9-.61-.15-1.22-.36-1.83-.57-.73-.12-1.46-.27-2.19-.41Z"/>
                <path className="abc-195" d="M482.45,427.97c0,2.18,0,4.36,0,6.54,0,35.84-.05,112.05-.04,190.4.73.14,1.46.29,2.19.41.6.21,1.22.42,1.83.57,0-78.55,0-155.21,0-191.25,0-2.19,0-4.38,0-6.57-.6-.02-1.2-.05-1.8-.05-.72,0-1.45-.02-2.17-.05Z"/>
                <path className="abc-319" d="M482.45,417.13c0,1.43,0,2.86,0,4.3,0,2.18,0,4.36,0,6.54.72.02,1.45.05,2.17.05.6,0,1.2.03,1.8.05,0-2.19,0-4.38,0-6.57,0-1.44,0-2.88,0-4.32-.6-.01-1.2-.02-1.8-.03-.72,0-1.45,0-2.17-.02Z"/>
                <path className="abc-400" d="M482.45,412.23v.6c0,1.43,0,2.86,0,4.3.72,0,1.45.02,2.17.02.6,0,1.2.01,1.8.03v-4.93c-.6,0-1.2,0-1.8-.01-.72,0-1.45,0-2.17,0Z"/>
                <path className="abc-88" d="M482.45,411.63v.6c.72,0,1.45,0,2.17,0,.6,0,1.2,0,1.8.01v-.61c-.6,0-1.2,0-1.8,0-.72,0-1.45,0-2.17,0Z"/>
                <path className="abc-272" d="M496.23,873.98c.32.31.63.61.92.89.17.03.34.06.5.09.35.06.69.11,1.02.16-.23-.27-.48-.55-.75-.85-.37-.06-.75-.12-1.14-.19-.19-.03-.37-.07-.55-.1Z"/>
                <path className="abc-183" d="M494.44,872.23c.27.27.53.53.79.78.35.34.68.66,1,.98.18.04.37.07.55.1.39.07.77.13,1.14.19-.27-.3-.55-.62-.83-.95-.21-.25-.44-.5-.66-.76-.44-.06-.88-.14-1.34-.21-.22-.04-.43-.08-.64-.12Z"/>
                <path className="abc-11" d="M493.02,870.76c.21.22.41.43.62.65.27.28.54.55.81.82.21.04.42.08.64.12.46.08.91.15,1.34.21-.23-.26-.46-.53-.68-.81-.17-.21-.35-.42-.53-.64-.49-.07-.98-.14-1.49-.23-.24-.04-.48-.09-.71-.13Z"/>
                <path className="abc-457" d="M491.97,869.62c.14.16.28.31.43.47.21.22.41.45.62.66.23.05.47.09.71.13.51.09,1,.16,1.49.23-.17-.22-.36-.43-.53-.65-.12-.15-.24-.31-.36-.46-.53-.07-1.06-.15-1.59-.24-.26-.04-.51-.09-.76-.14Z"/>
                <path className="abc-118" d="M491.01,868.48c.18.22.36.45.54.67.14.16.28.32.42.48.25.05.51.09.76.14.54.09,1.06.17,1.59.24-.12-.16-.24-.31-.35-.47-.15-.23-.3-.46-.46-.7-.58-.06-1.16-.14-1.7-.23-.26-.04-.54-.09-.81-.13Z"/>
                <path className="abc-214" d="M489.15,866.04c.43.59.87,1.18,1.32,1.77.17.22.35.45.53.67.27.04.55.09.81.13.55.09,1.13.16,1.7.23-.15-.23-.3-.46-.45-.7-.39-.61-.77-1.21-1.14-1.82-.66-.04-1.32-.09-1.88-.18-.27-.04-.58-.07-.89-.1Z"/>
                <path className="abc-4" d="M486.05,861.23c.58,1.02,1.2,2.02,1.86,3.02.4.6.81,1.2,1.24,1.79.31.03.62.05.89.1.56.09,1.22.14,1.88.18-.37-.61-.74-1.22-1.1-1.83-.59-1.01-1.16-2.02-1.7-3.05-.74-.02-1.47-.05-2.09-.14-.29-.04-.65-.05-1-.07Z"/>
                <path className="abc-39" d="M482.77,854.14c.49,1.36,1.04,2.68,1.65,3.97.5,1.06,1.04,2.1,1.63,3.12.35.01.7.02,1,.07.61.09,1.35.12,2.09.14-.54-1.03-1.05-2.06-1.53-3.11-.59-1.28-1.13-2.58-1.62-3.91-.74-.03-1.48-.08-2.16-.17-.33-.04-.69-.07-1.05-.1Z"/>
                <path className="abc-415" d="M481.14,848.5c.11.48.23.97.35,1.44.36,1.45.79,2.84,1.28,4.2.37.04.73.06,1.05.1.68.09,1.42.14,2.16.17-.49-1.33-.93-2.69-1.3-4.08-.13-.47-.24-.96-.35-1.44-.72-.07-1.44-.15-2.15-.24-.34-.04-.69-.1-1.03-.16Z"/>
                <path className="abc-131" d="M480.53,845.48c.1.51.21,1.04.31,1.57.09.48.2.98.31,1.46.35.06.69.12,1.03.16.71.09,1.43.17,2.15.24-.11-.48-.21-.97-.31-1.46-.11-.53-.22-1.06-.33-1.57-.72-.07-1.43-.16-2.14-.25-.34-.04-.68-.09-1.02-.14Z"/>
                <path className="abc-372" d="M480.03,842.19c.07.6.15,1.19.23,1.78.07.49.17.99.27,1.5.34.05.68.09,1.02.14.71.09,1.42.18,2.14.25-.1-.51-.2-1.01-.27-1.49-.07-.49-.15-1.09-.21-1.62-.73-.17-1.45-.32-2.16-.41-.34-.04-.68-.1-1.01-.15Z"/>
                <path className="abc-161" d="M479.18,624.51c.02,47.84.06,96.48.12,137.14,0,1.59,0,3.16,0,4.73.03,14.99.1,28.82.05,41.01,0,1.22-.01,2.42-.02,3.61-.06,11.51-.28,21.5.5,29.4.06.6.12,1.19.19,1.79.34.05.67.1,1.01.15.71.1,1.43.25,2.16.41-.06-.53-.13-1.15-.18-1.65-.9-9-.57-20.63-.51-34.19.06-13.28-.03-28.41-.04-44.86-.04-40.71-.05-89.28-.06-137.15-.73-.14-1.45-.27-2.15-.35-.35-.01-.71-.03-1.07-.04Z"/>
                <path className="abc-168" d="M479.16,427.91c0,2.17,0,4.35,0,6.52,0,35.72,0,111.85.03,190.08.36.02.71.03,1.07.04.7.08,1.42.21,2.15.35,0-78.35.03-154.55.04-190.4,0-2.18,0-4.36,0-6.54-.72-.02-1.45-.05-2.17-.05-.37,0-.75,0-1.12-.01Z"/>
                <path className="abc-281" d="M479.16,417.11c0,1.43,0,2.85,0,4.28,0,2.17,0,4.35,0,6.52.37,0,.75,0,1.12.01.72,0,1.45.02,2.17.05,0-2.18,0-4.36,0-6.54,0-1.43,0-2.86,0-4.3-.72,0-1.45-.02-2.17-.02-.37,0-.75,0-1.12,0Z"/>
                <path className="abc-200" d="M479.16,412.23v4.88c.38,0,.75,0,1.12,0,.72,0,1.45,0,2.17.02,0-1.43,0-2.86,0-4.3v-.6c-.72,0-1.45,0-2.17,0-.37,0-.75,0-1.12,0Z"/>
                <path className="abc-346" d="M479.16,411.63v.6c.38,0,.75,0,1.12,0,.72,0,1.45,0,2.17,0v-.6c-.72,0-1.45,0-2.17,0-.37,0-.75,0-1.12,0Z"/>
                <path className="abc-157" d="M495.09,873.75c.36.32.7.63,1.03.92.18.04.36.07.54.11.17.03.34.07.51.1-.29-.28-.6-.57-.92-.89-.18-.04-.37-.07-.56-.11-.2-.04-.39-.08-.59-.13Z"/>
                <path className="abc-234" d="M493.13,871.94c.29.27.58.54.86.8.38.35.75.68,1.1,1,.2.04.39.09.59.13.19.04.38.08.56.11-.32-.31-.66-.64-1-.98-.26-.25-.52-.51-.79-.78-.21-.04-.42-.09-.64-.13-.23-.05-.45-.1-.67-.15Z"/>
                <path className="abc-91" d="M491.58,870.45c.22.22.45.44.67.66.29.29.59.56.88.84.22.05.44.1.67.15.22.05.43.09.64.13-.27-.27-.54-.54-.81-.82-.21-.21-.41-.43-.62-.65-.23-.05-.47-.1-.71-.15-.25-.05-.49-.11-.73-.17Z"/>
                <path className="abc-187" d="M490.44,869.3c.16.16.31.32.47.48.22.23.45.45.67.67.24.06.48.11.73.17.24.05.48.1.71.15-.21-.22-.41-.44-.62-.66-.14-.16-.28-.31-.43-.47-.25-.05-.5-.1-.76-.15-.26-.06-.52-.11-.78-.18Z"/>
                <path className="abc-177" d="M489.38,868.16c.2.22.39.43.59.65.15.16.31.32.46.48.26.06.52.12.78.18.25.05.51.11.76.15-.14-.16-.28-.32-.42-.48-.18-.22-.36-.45-.54-.67-.27-.04-.54-.09-.8-.15-.27-.06-.55-.11-.83-.17Z"/>
                <path className="abc-148" d="M487.35,865.78c.46.58.95,1.16,1.45,1.73.19.22.38.44.58.65.28.06.56.11.83.17.26.06.53.1.8.15-.18-.22-.36-.45-.53-.67-.46-.59-.9-1.17-1.32-1.77-.31-.03-.62-.06-.89-.12-.28-.06-.6-.1-.91-.14Z"/>
                <path className="abc-20" d="M484.01,861.02c.62,1.02,1.29,2.02,2,3,.43.59.88,1.18,1.35,1.76.32.04.64.08.91.14.27.06.58.09.89.12-.43-.59-.84-1.19-1.24-1.79-.66-.99-1.28-1.99-1.86-3.02-.35-.01-.71-.04-1-.1-.31-.07-.67-.09-1.04-.12Z"/>
                <path className="abc-90" d="M480.59,853.82c.5,1.4,1.07,2.75,1.7,4.05.52,1.07,1.1,2.12,1.72,3.14.36.02.73.05,1.04.12.3.06.65.08,1,.1-.58-1.02-1.12-2.06-1.63-3.12-.61-1.29-1.16-2.61-1.65-3.97-.37-.04-.74-.08-1.07-.15-.35-.08-.73-.12-1.11-.17Z"/>
                <path className="abc-148" d="M479.02,848.09c.1.46.19.91.3,1.38.35,1.5.77,2.95,1.27,4.35.38.04.76.09,1.11.17.34.07.71.12,1.07.15-.49-1.36-.92-2.76-1.28-4.2-.12-.47-.24-.96-.35-1.44-.35-.06-.7-.13-1.05-.19-.36-.07-.72-.14-1.08-.21Z"/>
                <path className="abc-24" d="M478.48,845.16c.09.51.19,1.03.28,1.56.08.46.16.9.26,1.37.36.07.72.14,1.08.21.35.07.7.13,1.05.19-.11-.48-.21-.97-.31-1.46-.1-.53-.21-1.05-.31-1.57-.34-.05-.67-.1-1.01-.15-.35-.05-.69-.11-1.04-.16Z"/>
                <path className="abc-212" d="M478.03,842.12c.06.52.13,1.03.2,1.55.07.49.15.99.24,1.5.34.06.69.11,1.04.16.34.05.67.1,1.01.15-.1-.51-.2-1.01-.27-1.5-.08-.59-.16-1.19-.23-1.78-.34-.05-.67-.11-1-.16-.34-.05-.67.02-.99.08Z"/>
                <path className="abc-432" d="M477.04,631.65c.06,55.81.14,109.55.2,140.49,0,3.07.01,5.96.02,8.65.05,14.78.06,26.76.1,36.29.03,10.16-.04,17.97.5,23.5.05.52.11,1.03.17,1.55.32-.06.65-.13.99-.08.33.05.66.1,1,.16-.07-.6-.13-1.19-.19-1.79-.78-7.91-.56-17.9-.5-29.4,0-1.19.01-2.39.02-3.61.05-12.2-.02-26.02-.05-41.01,0-1.56,0-3.14,0-4.73-.06-40.66-.09-89.3-.12-137.14-.36-.02-.71-.03-1.07-.05-.37,1.08-.73,4.13-1.08,7.19Z"/>
                <path className="abc-440" d="M476.87,426.17c0,2.18,0,4.46,0,6.82v.8c0,21.78.08,112.15.17,197.86.35-3.06.71-6.11,1.08-7.19.35.02.71.03,1.07.05-.04-78.23-.03-154.36-.03-190.08,0-2.17,0-4.35,0-6.52-.37,0-.75,0-1.12,0-.39,0-.78-.87-1.16-1.73Z"/>
                <path className="abc-200" d="M476.87,415.97v3.96c0,1.97,0,4.05,0,6.24.39.86.77,1.73,1.16,1.73.38,0,.75,0,1.12,0,0-2.17,0-4.35,0-6.52,0-1.43,0-2.85,0-4.28-.38,0-.75,0-1.13,0-.39,0-.78-.57-1.16-1.14Z"/>
                <path className="abc-434" d="M476.87,412.06v3.91c.39.57.77,1.14,1.16,1.14.38,0,.75,0,1.13,0v-4.88c-.38,0-.75,0-1.13,0-.39,0-.78-.08-1.16-.17Z"/>
                <path className="abc-108" d="M476.87,411.63v.43c.39.08.77.17,1.16.17.38,0,.75,0,1.13,0v-.6c-.38,0-.75,0-1.13,0-.39,0-.78,0-1.16,0Z"/>
                <path className="abc-266" d="M493.36,873.33c.38.33.76.65,1.1.95.37.09.74.18,1.1.26.18.04.36.08.54.12-.33-.29-.67-.6-1.03-.92-.2-.04-.39-.09-.59-.14-.38-.09-.75-.18-1.13-.28Z"/>
                <path className="abc-64" d="M491.24,871.45c.31.28.63.56.93.83.41.36.81.71,1.19,1.05.38.1.75.19,1.13.28.2.05.4.09.59.14-.35-.32-.72-.66-1.1-1-.28-.26-.57-.53-.86-.8-.22-.05-.44-.11-.67-.16-.41-.1-.82-.21-1.22-.33Z"/>
                <path className="abc-2" d="M489.56,869.91c.24.23.48.45.72.67.32.29.64.58.95.87.41.12.81.23,1.22.33.23.06.45.11.67.16-.29-.27-.58-.55-.88-.84-.22-.22-.45-.44-.67-.66-.24-.06-.48-.12-.73-.18-.43-.11-.86-.23-1.29-.35Z"/>
                <path className="abc-149" d="M488.35,868.74c.16.16.33.32.49.48.24.23.48.46.72.69.43.13.86.25,1.29.35.25.06.49.12.73.18-.22-.22-.45-.45-.67-.67-.16-.16-.31-.32-.47-.48-.26-.06-.51-.13-.77-.19-.44-.11-.88-.23-1.31-.36Z"/>
                <path className="abc-108" d="M487.25,867.63c.2.21.4.42.61.63.16.16.33.32.49.49.44.13.88.25,1.31.36.26.07.52.13.77.19-.16-.16-.31-.32-.46-.48-.2-.22-.4-.43-.59-.65-.28-.06-.56-.12-.82-.18-.44-.11-.88-.23-1.31-.35Z"/>
                <path className="abc-118" d="M485.19,865.32c.47.56.96,1.13,1.47,1.68.2.21.39.42.59.63.43.12.87.23,1.31.35.26.07.54.13.82.18-.2-.22-.39-.44-.58-.65-.5-.57-.98-1.15-1.45-1.73-.32-.04-.63-.08-.91-.15-.43-.11-.84-.2-1.26-.31Z"/>
                <path className="abc-421" d="M481.85,860.65c.61,1.01,1.27,1.99,1.98,2.95.43.58.88,1.16,1.35,1.72.41.1.83.2,1.26.31.27.07.59.11.91.15-.46-.58-.91-1.17-1.35-1.76-.71-.98-1.38-1.98-2-3-.36-.02-.72-.05-1.02-.11-.38-.09-.76-.17-1.13-.26Z"/>
                <path className="abc-280" d="M478.55,853.5c.47,1.39,1.01,2.74,1.63,4.03.51,1.06,1.07,2.1,1.67,3.11.37.09.75.17,1.13.26.3.06.66.09,1.02.11-.62-1.02-1.19-2.07-1.72-3.14-.64-1.3-1.21-2.66-1.7-4.05-.38-.04-.75-.08-1.08-.14-.33-.06-.64-.12-.96-.18Z"/>
                <path className="abc-339" d="M477.08,847.79c.08.45.18.9.27,1.36.33,1.51.72,2.96,1.2,4.35.32.06.63.12.96.18.33.06.71.1,1.08.14-.5-1.4-.92-2.85-1.27-4.35-.11-.47-.2-.92-.3-1.38-.36-.07-.71-.14-1.06-.2-.3-.05-.59-.08-.88-.11Z"/>
                <path className="abc-36" d="M476.61,844.89c.07.53.14,1.04.23,1.57.07.44.15.89.24,1.34.29.03.59.06.88.11.35.06.7.13,1.06.2-.1-.46-.18-.91-.26-1.37-.1-.53-.19-1.05-.28-1.56-.34-.06-.69-.11-1.03-.17-.28-.05-.56-.08-.84-.1Z"/>
                <path className="abc-246" d="M476.22,841.81c.06.51.13,1.03.19,1.54.07.51.13,1.02.2,1.54.28.03.56.06.84.1.34.06.68.12,1.03.17-.09-.51-.17-1.01-.24-1.5-.07-.52-.14-1.03-.2-1.55-.32.06-.65.12-.98.07-.27-.05-.56-.21-.84-.38Z"/>
                <path className="abc-233" d="M475.18,631.44c.07,53.76.14,105.58.2,136.88,0,4.88,0,9.4-.03,13.5-.03,29.43-.29,48.25.7,58.44.05.52.11,1.03.17,1.54.28.17.56.34.84.38.33.05.66,0,.98-.07-.06-.52-.12-1.03-.17-1.55-.54-5.52-.47-13.34-.5-23.5-.03-9.53-.05-21.51-.1-36.29,0-2.69-.01-5.58-.02-8.65-.07-30.94-.14-84.67-.2-140.49-.35,3.06-.7,6.11-1.07,7.18-.26-1.4-.53-4.39-.79-7.39Z"/>
                <path className="abc-161" d="M474.98,426.14c0,2.18,0,4.45,0,6.8v.8c0,21.73.1,112.05.2,197.71.27,2.99.54,5.99.79,7.39.36-1.07.71-4.13,1.07-7.18-.1-85.71-.17-176.08-.17-197.86v-.8c0-2.35,0-4.63,0-6.82-.39-.86-.77-1.73-1.16-1.73-.24,0-.49.84-.73,1.69Z"/>
                <path className="abc-367" d="M474.98,415.96c0,1.24,0,2.56,0,3.95,0,1.96,0,4.04,0,6.22.24-.85.49-1.7.73-1.69.38,0,.77.86,1.16,1.73,0-2.18,0-4.27,0-6.24v-3.96c-.39-.57-.77-1.14-1.16-1.14-.25,0-.49.56-.73,1.13Z"/>
                <path className="abc-428" d="M474.98,412.07v.45c0,1.06,0,2.21,0,3.45.24-.57.49-1.13.73-1.13.38,0,.77.57,1.16,1.14v-3.91c-.39-.08-.77-.17-1.16-.17-.25,0-.49.08-.73.17Z"/>
                <path className="abc-371" d="M474.98,411.63v.43c.24-.08.49-.17.73-.17.38,0,.77.08,1.16.17v-.43c-.39,0-.77,0-1.16,0-.25,0-.49,0-.73,0Z"/>
                <path className="abc-121" d="M491.24,872.7c.41.35.8.68,1.15.99.32.1.63.2.95.29.38.11.76.21,1.13.31-.35-.3-.72-.62-1.1-.95-.38-.1-.76-.21-1.15-.32-.32-.1-.65-.2-.97-.3Z"/>
                <path className="abc-399" d="M489,870.75c.33.29.66.58.98.86.43.37.85.74,1.26,1.09.33.11.65.21.97.3.39.12.77.22,1.15.32-.38-.33-.79-.68-1.19-1.05-.3-.27-.62-.55-.93-.83-.41-.12-.81-.24-1.22-.37-.34-.1-.68-.22-1.01-.33Z"/>
                <path className="abc-238" d="M487.25,869.17c.25.23.5.46.75.69.33.3.66.6,1,.89.34.12.68.23,1.01.33.41.13.82.25,1.22.37-.31-.28-.63-.57-.95-.87-.24-.22-.48-.45-.72-.67-.43-.13-.86-.26-1.28-.39-.35-.11-.69-.23-1.04-.35Z"/>
                <path className="abc-234" d="M486,867.99c.17.16.34.32.51.48.24.23.49.46.74.7.35.12.69.24,1.04.35.42.13.85.27,1.28.39-.24-.23-.48-.46-.72-.69-.17-.16-.33-.32-.49-.48-.44-.13-.87-.26-1.3-.4-.35-.11-.7-.23-1.05-.35Z"/>
                <path className="abc-82" d="M484.91,866.9c.19.2.39.41.59.6.16.16.33.32.49.48.35.12.7.24,1.05.35.43.14.86.27,1.3.4-.16-.16-.33-.32-.49-.49-.21-.21-.41-.42-.61-.63-.43-.12-.86-.25-1.29-.38-.35-.11-.7-.23-1.05-.34Z"/>
                <path className="abc-153" d="M482.94,864.68c.44.54.91,1.08,1.4,1.61.19.2.38.41.58.61.35.12.7.23,1.05.34.43.14.86.26,1.29.38-.2-.21-.4-.42-.59-.63-.51-.55-1-1.11-1.47-1.68-.41-.1-.83-.21-1.24-.34-.34-.1-.68-.2-1.01-.3Z"/>
                <path className="abc-303" d="M479.82,860.16c.56.98,1.17,1.93,1.84,2.86.41.56.83,1.12,1.28,1.66.33.1.66.2,1.01.3.41.13.83.23,1.24.34-.47-.56-.92-1.14-1.35-1.72-.71-.96-1.37-1.95-1.98-2.95-.37-.09-.75-.17-1.12-.26-.31-.08-.61-.15-.91-.23Z"/>
                <path className="abc-232" d="M476.81,853.21c.42,1.35.91,2.66,1.48,3.93.47,1.04.97,2.04,1.53,3.02.3.08.6.15.91.23.37.09.75.18,1.12.26-.61-1.01-1.17-2.05-1.67-3.11-.62-1.29-1.16-2.64-1.63-4.03-.32-.06-.63-.11-.95-.15-.26-.04-.53-.09-.79-.14Z"/>
                <path className="abc-120" d="M475.51,847.7c.07.44.15.88.24,1.33.29,1.44.64,2.84,1.07,4.19.26.05.52.1.79.14.32.04.63.1.95.15-.47-1.39-.87-2.85-1.2-4.35-.1-.46-.19-.91-.27-1.36-.29-.03-.58-.05-.87-.06-.24-.01-.47-.02-.7-.03Z"/>
                <path className="abc-401" d="M475.11,844.76c.06.56.12,1.11.19,1.62.06.43.13.87.2,1.31.23,0,.47.02.7.03.29.02.58.04.87.06-.08-.45-.16-.9-.24-1.34-.09-.52-.16-1.04-.23-1.57-.28-.03-.55-.05-.83-.08-.23-.03-.45-.04-.67-.05Z"/>
                <path className="abc-389" d="M474.75,841.31c.06.59.13,1.18.2,1.76.06.56.11,1.13.17,1.7.22.01.44.02.67.05.27.03.55.05.83.08-.07-.53-.13-1.03-.2-1.54-.07-.51-.13-1.03-.19-1.54-.28-.17-.56-.34-.82-.39-.22-.04-.44-.08-.65-.11Z"/>
                <path className="abc-226" d="M473.77,624.56c.04,47.23.07,94.87.12,135.18.04,33.59-.88,61.9.68,79.79.05.59.12,1.19.18,1.78.21.03.43.06.65.11.26.05.54.22.82.39-.06-.51-.12-1.03-.17-1.54-.99-10.18-.73-29-.7-58.44.02-4.1.04-8.62.03-13.5-.06-31.29-.13-83.12-.2-136.88-.27-2.99-.53-5.98-.78-7.37-.22.49-.43.58-.63.49Z"/>
                <path className="abc-43" d="M473.66,427.88c0,2.17,0,4.34,0,6.5.01,35.59.05,112.09.11,190.18.2.09.41,0,.63-.49.25,1.38.52,4.37.78,7.37-.1-85.65-.19-175.97-.2-197.71v-.8c0-2.35,0-4.62,0-6.8-.24.85-.49,1.71-.72,1.73-.2.02-.4.02-.6.01Z"/>
                <path className="abc-43" d="M473.66,417.11c0,1.42,0,2.85,0,4.27,0,2.17,0,4.34,0,6.5.2,0,.4,0,.6-.01.24-.02.48-.88.72-1.73,0-2.18,0-4.26,0-6.22,0-1.4,0-2.71,0-3.95-.24.57-.49,1.13-.73,1.14-.2,0-.4,0-.59,0Z"/>
                <path className="abc-140" d="M473.66,412.23v.6c0,1.42,0,2.85,0,4.27.2,0,.4,0,.59,0,.24,0,.48-.57.73-1.14,0-1.24,0-2.39,0-3.45v-.45c-.24.08-.49.17-.73.17-.2,0-.4,0-.59,0Z"/>
                <path className="abc-271" d="M473.66,411.63v.6c.2,0,.4,0,.59,0,.24,0,.48-.08.73-.17v-.43c-.24,0-.49,0-.73,0-.2,0-.4,0-.59,0Z"/>
                <path className="abc-41" d="M489.11,871.93c.42.36.83.71,1.2,1.04.37.14.75.28,1.12.41.32.11.64.22.96.32-.36-.31-.75-.64-1.15-.99-.33-.11-.66-.22-.98-.34-.38-.14-.76-.28-1.14-.43Z"/>
                <path className="abc-419" d="M486.81,869.92c.34.3.68.6,1,.88.44.38.88.76,1.3,1.13.38.15.76.3,1.14.43.33.12.66.23.98.34-.41-.35-.83-.71-1.26-1.09-.32-.28-.65-.57-.98-.86-.34-.12-.68-.24-1.02-.37-.39-.15-.78-.3-1.17-.46Z"/>
                <path className="abc-70" d="M485.04,868.32c.25.23.51.47.76.69.33.3.67.61,1.01.91.39.16.78.32,1.17.46.34.13.68.25,1.02.37-.33-.29-.67-.59-1-.89-.25-.23-.5-.46-.75-.69-.35-.12-.69-.25-1.03-.38-.4-.15-.79-.31-1.18-.47Z"/>
                <path className="abc-16" d="M483.78,867.15c.17.16.34.32.51.48.24.23.5.46.75.69.39.16.78.32,1.18.47.34.13.69.26,1.03.38-.25-.23-.5-.47-.74-.7-.17-.16-.34-.32-.51-.48-.35-.12-.69-.25-1.04-.38-.4-.15-.79-.3-1.18-.46Z"/>
                <path className="abc-213" d="M482.73,866.12c.18.19.37.38.56.56.16.15.33.31.49.47.39.16.78.31,1.18.46.34.13.69.26,1.04.38-.17-.16-.33-.32-.49-.48-.2-.2-.4-.4-.59-.6-.35-.12-.69-.23-1.03-.36-.39-.14-.78-.28-1.16-.43Z"/>
                <path className="abc-18" d="M480.87,864.03c.42.52.85,1.03,1.31,1.52.18.19.36.38.54.57.38.15.77.29,1.16.43.34.12.68.24,1.03.36-.19-.2-.39-.41-.58-.61-.49-.53-.95-1.06-1.4-1.61-.33-.1-.65-.2-.97-.3-.37-.12-.73-.23-1.09-.35Z"/>
                <path className="abc-123" d="M477.94,859.63c.53.96,1.11,1.9,1.74,2.8.38.55.78,1.08,1.2,1.6.36.12.72.24,1.09.35.32.1.64.2.97.3-.44-.54-.87-1.1-1.28-1.66-.67-.93-1.28-1.88-1.84-2.86-.3-.08-.59-.16-.89-.24-.34-.09-.67-.19-1-.29Z"/>
                <path className="abc-7" d="M475.16,852.87c.38,1.3.82,2.56,1.35,3.79.43,1.01.91,2.01,1.44,2.97.33.1.66.19,1,.29.29.08.59.16.89.24-.56-.98-1.07-1.98-1.53-3.02-.57-1.26-1.06-2.58-1.48-3.93-.26-.05-.52-.1-.78-.15-.3-.05-.59-.12-.88-.19Z"/>
                <path className="abc-32" d="M474.03,847.61c.06.43.13.86.2,1.29.24,1.35.55,2.67.92,3.97.29.07.58.14.88.19.26.05.51.1.78.15-.42-1.35-.77-2.75-1.07-4.19-.09-.45-.17-.89-.24-1.33-.23-.01-.46-.02-.69-.03-.26-.01-.53-.03-.78-.05Z"/>
                <path className="abc-271" d="M473.71,844.66c.05.6.1,1.17.16,1.67.05.42.1.85.16,1.28.26.02.52.04.78.05.23.01.46.02.69.03-.07-.44-.14-.88-.2-1.31-.08-.51-.14-1.06-.19-1.62-.22-.01-.44-.02-.66-.05-.25-.03-.5-.04-.75-.06Z"/>
                <path className="abc-57" d="M473.42,841.13c.05.57.1,1.12.14,1.66.05.63.09,1.27.14,1.87.25.02.49.03.75.06.22.03.44.03.66.05-.06-.56-.11-1.13-.17-1.7-.07-.58-.14-1.17-.2-1.76-.21-.03-.42-.06-.62-.09-.24-.04-.47-.07-.7-.1Z"/>
                <path className="abc-279" d="M472.46,623.8c.02,46.88.04,94.58.07,134.7.02,34.04-.47,62.8.76,80.89.04.59.08,1.17.13,1.73.23.03.46.06.7.1.21.03.41.06.62.09-.06-.59-.13-1.19-.18-1.78-1.56-17.88-.64-46.2-.68-79.79-.05-40.31-.09-87.96-.12-135.18-.2-.09-.4-.37-.61-.62-.24-.1-.47-.14-.69-.14Z"/>
                <path className="abc-142" d="M472.4,427.85c0,2.16,0,4.32,0,6.48,0,35.56.03,111.41.06,189.47.23,0,.46.04.69.14.21.25.4.53.61.62-.06-78.09-.09-154.59-.11-190.18,0-2.17,0-4.34,0-6.5-.2,0-.39-.02-.59-.02-.23,0-.45-.01-.67-.01Z"/>
                <path className="abc-74" d="M472.4,417.1c0,1.42,0,2.84,0,4.26,0,2.16,0,4.32,0,6.48.22,0,.45,0,.67.01.2,0,.39.01.59.02,0-2.17,0-4.34,0-6.5,0-1.42,0-2.85,0-4.27-.2,0-.39,0-.59,0-.23,0-.45,0-.67,0Z"/>
                <path className="abc-175" d="M472.4,412.24v4.86c.22,0,.45,0,.67,0,.19,0,.39,0,.59,0,0-1.42,0-2.85,0-4.27v-.6c-.2,0-.39,0-.59,0-.23,0-.45,0-.67,0Z"/>
                <path className="abc-178" d="M472.4,411.64v.6c.22,0,.45,0,.67,0,.19,0,.39,0,.59,0v-.6c-.2,0-.39,0-.59,0-.23,0-.45,0-.67,0Z"/>
                <path className="abc-416" d="M486.93,870.99c.43.37.84.73,1.22,1.06.34.16.69.31,1.03.45.38.16.75.31,1.13.45-.37-.32-.78-.67-1.2-1.04-.38-.15-.76-.31-1.14-.47-.35-.15-.69-.3-1.04-.46Z"/>
                <path className="abc-30" d="M484.61,868.95c.34.3.68.6,1.01.89.44.39.89.78,1.31,1.15.34.16.69.31,1.04.46.38.16.76.32,1.14.47-.42-.36-.86-.75-1.3-1.13-.32-.29-.66-.58-1-.88-.39-.16-.78-.33-1.16-.5-.35-.15-.7-.31-1.04-.47Z"/>
                <path className="abc-373" d="M482.84,867.35c.25.23.51.46.76.69.33.3.68.61,1.01.91.34.16.69.32,1.04.47.38.17.77.34,1.16.5-.34-.3-.68-.61-1.01-.91-.25-.23-.51-.46-.76-.69-.39-.16-.78-.33-1.16-.5-.35-.15-.69-.31-1.04-.47Z"/>
                <path className="abc-110" d="M481.59,866.21c.17.15.33.31.5.46.24.22.49.45.74.68.34.16.69.31,1.04.47.38.17.77.34,1.16.5-.25-.23-.51-.47-.75-.69-.17-.16-.34-.32-.51-.48-.39-.16-.78-.32-1.16-.49-.35-.15-.69-.3-1.03-.46Z"/>
                <path className="abc-313" d="M480.58,865.24c.17.17.34.34.52.51.16.15.32.3.49.46.34.15.68.31,1.03.46.38.16.77.33,1.16.49-.17-.16-.33-.32-.49-.47-.19-.18-.38-.37-.56-.56-.38-.15-.76-.3-1.13-.45-.34-.14-.68-.28-1.01-.43Z"/>
                <path className="abc-413" d="M478.83,863.27c.4.5.81.98,1.24,1.45.17.18.33.35.51.52.33.15.67.29,1.01.43.37.15.75.3,1.13.45-.18-.19-.36-.38-.54-.57-.46-.49-.89-1-1.31-1.52-.36-.12-.72-.25-1.07-.38-.32-.12-.65-.25-.97-.38Z"/>
                <path className="abc-63" d="M476.09,859.02c.49.94,1.03,1.84,1.62,2.71.36.53.73,1.04,1.13,1.54.32.13.64.26.97.38.36.14.71.26,1.07.38-.42-.52-.82-1.05-1.2-1.6-.63-.9-1.21-1.84-1.74-2.8-.33-.1-.65-.2-.98-.3-.29-.09-.59-.2-.88-.31Z"/>
                <path className="abc-71" d="M473.56,852.46c.33,1.25.74,2.48,1.21,3.68.39.99.83,1.95,1.32,2.88.29.11.58.22.88.31.32.1.65.2.98.3-.53-.96-1.01-1.96-1.44-2.97-.52-1.23-.97-2.49-1.35-3.79-.29-.07-.57-.14-.85-.2-.25-.06-.5-.13-.75-.21Z"/>
                <path className="abc-27" d="M472.59,847.41c.05.42.11.84.17,1.26.2,1.27.46,2.54.8,3.78.24.08.49.16.75.21.28.06.56.13.85.2-.38-1.3-.68-2.62-.92-3.97-.08-.43-.14-.87-.2-1.29-.26-.02-.51-.05-.76-.08-.23-.03-.45-.07-.67-.12Z"/>
                <path className="abc-422" d="M472.33,844.49c.04.61.08,1.19.13,1.67.04.42.08.84.13,1.26.22.05.45.09.67.12.25.04.51.06.76.08-.06-.43-.11-.86-.16-1.28-.06-.5-.11-1.07-.16-1.67-.24-.02-.49-.03-.73-.07-.22-.04-.43-.07-.65-.1Z"/>
                <path className="abc-179" d="M472.12,840.93c.03.55.06,1.06.09,1.57.04.7.08,1.38.12,1.99.21.03.43.06.65.1.24.04.48.06.73.07-.05-.6-.09-1.24-.14-1.87-.05-.54-.1-1.09-.14-1.66-.23-.03-.46-.06-.68-.1-.21-.03-.41-.07-.62-.1Z"/>
                <path className="abc-127" d="M471.18,634.84c0,54.4.02,106.37.03,137.25,0,9.04-.01,16.76,0,22.83.01,13.46.28,33.31.84,44.32.03.58.05,1.14.08,1.68.2.04.41.07.62.1.23.04.45.07.68.1-.05-.57-.09-1.15-.13-1.73-1.23-18.09-.74-46.85-.76-80.89-.03-40.12-.05-87.83-.07-134.7-.23,0-.45.03-.68.05-.21,2.83-.41,6.91-.61,10.99Z"/>
                <path className="abc-282" d="M471.15,425.17c0,1.42,0,2.82,0,4.24,0,24.51.02,117.93.03,205.43.2-4.08.4-8.16.61-10.99.23-.03.45-.06.68-.05-.03-78.05-.06-153.91-.06-189.47,0-2.16,0-4.32,0-6.48-.22,0-.44,0-.66,0-.2,0-.4-1.34-.59-2.68Z"/>
                <path className="abc-205" d="M471.15,416.36c0,1.43,0,2.98,0,4.57,0,1.42,0,2.82,0,4.24.19,1.34.39,2.69.59,2.68.22,0,.44,0,.66,0,0-2.16,0-4.32,0-6.48,0-1.42,0-2.84,0-4.26-.22,0-.44,0-.66,0-.2,0-.39-.37-.59-.74Z"/>
                <path className="abc-96" d="M471.15,412.07c0,.15,0,.3,0,.46,0,1.1,0,2.4,0,3.83.19.37.39.74.59.74.22,0,.44,0,.66,0v-4.86c-.22,0-.44,0-.66,0-.2,0-.39-.08-.59-.17Z"/>
                <path className="abc-188" d="M471.15,411.64v.43c.19.08.39.17.59.17.22,0,.44,0,.66,0v-.6c-.22,0-.44,0-.66,0-.2,0-.39,0-.59,0Z"/>
                <path className="abc-234" d="M485.22,870.15c.4.36.78.7,1.15,1.02.25.13.5.26.75.39.34.17.69.34,1.03.5-.38-.33-.8-.69-1.22-1.06-.34-.16-.69-.32-1.03-.49-.22-.11-.45-.23-.68-.35Z"/>
                <path className="abc-162" d="M483.05,868.19c.32.29.64.58.95.86.42.37.83.74,1.22,1.1.23.12.45.24.68.35.34.17.68.33,1.03.49-.43-.37-.87-.76-1.31-1.15-.33-.29-.67-.59-1.01-.89-.34-.16-.68-.32-1.02-.49-.18-.09-.36-.18-.54-.27Z"/>
                <path className="abc-45" d="M481.4,866.67c.23.22.46.44.7.65.31.29.64.58.95.87.18.09.36.18.54.27.34.16.68.33,1.02.49-.34-.3-.68-.61-1.01-.91-.25-.23-.51-.46-.76-.69-.34-.16-.68-.32-1.01-.48-.14-.07-.29-.14-.43-.21Z"/>
                <path className="abc-449" d="M480.25,865.58c.15.15.31.3.47.44.23.21.46.43.69.65.14.07.28.14.43.21.33.16.67.32,1.01.48-.25-.23-.5-.46-.74-.68-.17-.16-.34-.31-.5-.46-.34-.15-.67-.31-1.01-.47-.11-.05-.23-.11-.34-.16Z"/>
                <path className="abc-109" d="M479.27,864.63c.17.17.34.34.52.51.15.14.3.29.45.44.11.06.23.11.34.16.33.16.67.31,1.01.47-.17-.15-.33-.31-.49-.46-.18-.17-.35-.34-.52-.51-.33-.15-.67-.3-.99-.45-.1-.05-.21-.1-.31-.16Z"/>
                <path className="abc-409" d="M477.54,862.65c.39.5.8.99,1.23,1.46.17.18.33.35.5.52.11.05.21.11.31.16.33.16.66.31.99.45-.17-.17-.34-.35-.51-.52-.43-.47-.85-.95-1.24-1.45-.32-.13-.64-.27-.96-.42-.11-.05-.22-.12-.34-.2Z"/>
                <path className="abc-332" d="M474.84,858.41c.48.93,1.01,1.83,1.59,2.7.35.53.72,1.04,1.11,1.54.11.08.23.15.34.2.32.15.64.28.96.42-.4-.5-.77-1.01-1.13-1.54-.59-.87-1.13-1.77-1.62-2.71-.29-.11-.58-.23-.86-.35-.13-.05-.26-.15-.39-.26Z"/>
                <path className="abc-397" d="M472.39,851.96c.32,1.22.71,2.42,1.17,3.6.38.97.81,1.92,1.28,2.85.13.11.26.21.39.26.28.12.57.24.86.35-.49-.94-.93-1.9-1.32-2.88-.47-1.2-.88-2.43-1.21-3.68-.24-.08-.49-.17-.73-.26-.15-.05-.3-.14-.45-.24Z"/>
                <path className="abc-355" d="M471.46,847.05c.05.41.1.83.17,1.25.19,1.22.44,2.45.76,3.67.15.1.3.19.45.24.24.09.48.18.73.26-.33-1.25-.6-2.51-.8-3.78-.07-.42-.12-.84-.17-1.26-.22-.05-.44-.11-.66-.18-.16-.05-.32-.12-.48-.19Z"/>
                <path className="abc-420" d="M471.21,844.19c.04.6.08,1.15.12,1.62.04.41.08.83.13,1.24.16.07.32.14.48.19.21.07.43.13.66.18-.05-.42-.09-.84-.13-1.26-.04-.48-.09-1.06-.13-1.67-.21-.03-.42-.07-.63-.13-.17-.04-.33-.1-.49-.17Z"/>
                <path className="abc-324" d="M471,840.66c.03.55.05,1.07.09,1.59.04.68.08,1.34.12,1.94.16.06.33.12.49.17.21.06.42.1.63.13-.04-.61-.08-1.29-.12-1.99-.03-.51-.06-1.02-.09-1.57-.2-.03-.41-.07-.61-.12-.17-.04-.34-.09-.51-.15Z"/>
                <path className="abc-393" d="M470.13,642.06c0,52.2.01,101.61.02,131.12,0,9.26,0,17.08.02,23.09.03,12.77.31,32.04.76,42.71.03.58.05,1.13.08,1.68.17.06.34.11.51.15.21.05.41.08.61.12-.03-.55-.05-1.1-.08-1.68-.55-11.01-.82-30.85-.84-44.32,0-6.08,0-13.8,0-22.83,0-30.89-.02-82.85-.03-137.25-.2,4.08-.4,8.16-.61,10.98-.15.7-.3-1.53-.45-3.77Z"/>
                <path className="abc-366" d="M470.04,425.13c-.01,1.41-.02,2.83-.03,4.24-.11,17.31.1,65.02.11,121.39,0,29.09,0,60.67.01,91.3.15,2.24.29,4.47.45,3.77.21-2.83.41-6.91.61-10.98-.01-87.5-.03-180.92-.03-205.43,0-1.42,0-2.82,0-4.24-.19-1.34-.39-2.68-.58-2.67-.19.02-.36,1.32-.53,2.62Z"/>
                <path className="abc-210" d="M470.17,416.32c-.03,1.43-.07,2.99-.09,4.57-.02,1.41-.03,2.83-.05,4.24.17-1.3.34-2.6.53-2.62.19-.02.38,1.32.58,2.67,0-1.42,0-2.82,0-4.24,0-1.59,0-3.14,0-4.57-.19-.37-.39-.74-.58-.74-.18,0-.29.34-.4.69Z"/>
                <path className="abc-143" d="M470.09,412.06c.01.14.03.29.04.45.08,1.08.07,2.38.05,3.81.11-.35.21-.7.4-.69.19,0,.38.37.58.74,0-1.43,0-2.73,0-3.83,0-.16,0-.31,0-.46-.19-.08-.39-.17-.58-.17-.18,0-.33.07-.48.15Z"/>
                <path className="abc-325" d="M470.04,411.65c.02.13.03.27.05.41.15-.08.31-.16.48-.15.19,0,.38.08.58.17v-.43c-.19,0-.39,0-.58,0-.18,0-.36,0-.53,0Z"/>
                <path className="abc-301" d="M483.62,869.23c.34.32.66.64.98.92.34.21.68.41,1.02.6.25.14.5.28.75.42-.37-.32-.75-.66-1.15-1.02-.23-.12-.46-.25-.68-.37-.31-.17-.62-.35-.92-.54Z"/>
                <path className="abc-231" d="M481.79,867.5c.27.26.53.52.79.75.35.32.69.65,1.03.97.31.19.62.37.92.54.23.13.45.25.68.37-.4-.36-.8-.73-1.22-1.1-.31-.28-.63-.57-.95-.86-.18-.09-.36-.19-.54-.28-.24-.13-.48-.27-.72-.4Z"/>
                <path className="abc-288" d="M480.41,866.15c.19.2.39.4.59.58.26.24.53.51.79.77.24.14.48.27.72.4.18.1.36.19.54.28-.32-.29-.64-.58-.95-.87-.24-.22-.47-.44-.7-.65-.14-.07-.28-.14-.42-.21-.19-.1-.38-.2-.57-.3Z"/>
                <path className="abc-133" d="M479.45,865.18c.13.13.26.27.39.4.19.18.38.38.57.58.19.1.38.2.57.3.14.07.28.14.42.21-.23-.22-.46-.44-.69-.65-.16-.15-.31-.3-.47-.44-.11-.06-.23-.11-.34-.17-.15-.08-.31-.15-.46-.23Z"/>
                <path className="abc-172" d="M478.53,864.22c.18.19.36.37.54.56.13.12.25.26.38.39.15.08.3.15.46.23.11.06.23.11.34.17-.15-.15-.3-.29-.45-.44-.18-.17-.35-.34-.52-.51-.11-.05-.21-.11-.32-.17-.14-.08-.29-.16-.43-.24Z"/>
                <path className="abc-109" d="M476.73,862.08c.41.53.83,1.06,1.28,1.57.17.2.34.38.52.57.14.08.29.16.43.24.11.06.21.11.32.17-.17-.17-.34-.34-.5-.52-.43-.47-.84-.96-1.23-1.46-.11-.08-.23-.16-.34-.23-.15-.09-.31-.22-.47-.34Z"/>
                <path className="abc-293" d="M473.93,857.65c.49.95,1.04,1.88,1.64,2.79.36.55.75,1.1,1.15,1.63.16.13.32.25.47.34.11.07.23.15.34.23-.39-.5-.76-1.01-1.11-1.54-.58-.87-1.11-1.77-1.59-2.7-.13-.11-.26-.22-.39-.3-.17-.1-.35-.28-.52-.46Z"/>
                <path className="abc-386" d="M471.38,851.19c.34,1.2.74,2.39,1.22,3.58.39.97.84,1.94,1.33,2.89.18.18.35.36.52.46.13.08.25.19.39.3-.48-.93-.9-1.88-1.28-2.85-.46-1.18-.85-2.38-1.17-3.6-.15-.1-.3-.2-.44-.29-.19-.12-.38-.3-.57-.48Z"/>
                <path className="abc-379" d="M470.38,846.41c.06.4.12.8.19,1.2.21,1.18.48,2.38.81,3.58.19.18.38.36.57.48.14.09.29.2.44.29-.32-1.22-.57-2.44-.76-3.67-.06-.41-.12-.83-.17-1.25-.16-.07-.31-.15-.47-.24-.21-.12-.41-.25-.61-.39Z"/>
                <path className="abc-199" d="M470.09,843.71c.04.55.09,1.07.14,1.52.04.39.09.79.15,1.19.2.14.4.27.61.39.15.09.31.17.47.24-.05-.41-.09-.83-.13-1.24-.04-.47-.08-1.03-.12-1.62-.16-.06-.32-.13-.48-.19-.21-.08-.43-.18-.64-.29Z"/>
                <path className="abc-330" d="M469.84,840.24c.03.58.07,1.16.12,1.74.04.59.08,1.18.13,1.73.21.1.42.21.64.29.16.06.32.13.48.19-.04-.6-.08-1.26-.12-1.94-.03-.52-.06-1.04-.09-1.59-.17-.06-.34-.12-.5-.17-.22-.07-.45-.16-.67-.25Z"/>
                <path className="abc-417" d="M469.16,630.72c-.01,44.87-.02,90.11,0,128.33,0,2.11,0,4.19,0,6.25.01,30.71-.11,56.49.59,73.21.02.58.05,1.16.09,1.74.22.09.44.18.67.25.16.05.33.11.5.17-.03-.55-.05-1.1-.08-1.68-.46-10.67-.73-29.94-.76-42.71-.02-6.01-.02-13.83-.02-23.09,0-29.5-.01-78.92-.02-131.12-.15-2.24-.29-4.48-.44-3.79-.19-2.6-.36-5.08-.53-7.55Z"/>
                <path className="abc-77" d="M469.05,427.76c0,2.16-.01,4.32-.02,6.48-.06,24.23.15,67.44.14,117.2,0,25.23-.01,52.17-.02,79.28.17,2.47.33,4.94.53,7.55.15-.69.29,1.55.44,3.79,0-30.62,0-62.21-.01-91.3,0-56.38-.21-104.08-.11-121.39,0-1.41.02-2.83.03-4.24-.17,1.3-.34,2.6-.52,2.62-.18.02-.33.02-.47.02Z"/>
                <path className="abc-186" d="M469.14,417.04c0,1.42-.05,2.84-.05,4.25-.01,2.16-.02,4.32-.03,6.47.14,0,.29,0,.47-.02.19-.02.35-1.32.52-2.62.01-1.41.03-2.83.05-4.24.01-1.58.06-3.13.09-4.57-.11.35-.21.7-.39.7-.21,0-.43.02-.65.02Z"/>
                <path className="abc-244" d="M468.94,412.21c.03.19.05.4.07.61.11,1.39.14,2.81.13,4.22.22,0,.44-.02.65-.02.18,0,.28-.35.39-.7.03-1.43.03-2.74-.05-3.81-.01-.15-.02-.3-.04-.45-.15.08-.3.16-.47.16-.23,0-.46,0-.67,0Z"/>
                <path className="abc-369" d="M468.83,411.65c.04.17.08.37.11.56.22,0,.44.01.67,0,.17,0,.32-.08.47-.16-.01-.14-.03-.28-.05-.41-.18,0-.35,0-.52,0-.23,0-.46,0-.69,0Z"/>
                <path className="abc-37" d="M482.07,868.22c.28.28.56.55.83.79.23.17.46.33.7.48.33.23.67.44,1.01.65-.32-.28-.65-.59-.98-.92-.31-.19-.62-.38-.92-.58-.21-.14-.42-.28-.63-.43Z"/>
                <path className="abc-455" d="M480.58,866.76c.21.22.42.43.63.63.29.27.57.55.85.83.21.15.42.29.63.43.3.2.61.39.92.58-.34-.32-.68-.66-1.03-.97-.26-.24-.53-.5-.79-.75-.24-.14-.48-.28-.72-.43-.17-.1-.33-.21-.5-.31Z"/>
                <path className="abc-81" d="M479.47,865.62c.16.17.32.35.48.5.21.21.42.42.63.64.16.11.33.21.5.31.24.15.48.29.72.43-.27-.26-.53-.52-.79-.77-.2-.19-.39-.39-.59-.58-.19-.1-.37-.21-.56-.31-.13-.07-.26-.15-.39-.23Z"/>
                <path className="abc-276" d="M478.68,864.78c.1.12.21.23.32.34.15.16.31.33.47.5.13.08.26.15.39.23.18.11.37.21.56.31-.19-.2-.38-.4-.57-.58-.13-.13-.26-.26-.39-.4-.15-.08-.3-.16-.45-.24-.1-.06-.21-.11-.31-.17Z"/>
                <path className="abc-445" d="M477.8,863.8c.19.21.38.43.57.64.1.11.21.22.31.34.1.06.21.11.31.17.15.08.3.16.45.24-.13-.13-.26-.27-.38-.39-.18-.19-.36-.37-.54-.56-.14-.08-.29-.17-.43-.25-.1-.06-.2-.12-.29-.17Z"/>
                <path className="abc-223" d="M475.94,861.47c.42.57.86,1.13,1.32,1.68.18.21.36.43.55.64.1.06.2.12.29.17.14.08.28.17.43.25-.18-.19-.35-.38-.52-.57-.45-.51-.87-1.04-1.28-1.57-.16-.13-.32-.26-.47-.36-.11-.07-.21-.16-.32-.24Z"/>
                <path className="abc-323" d="M473.07,856.84c.51.98,1.07,1.95,1.68,2.91.37.58.77,1.16,1.19,1.72.11.09.22.17.32.24.15.1.31.23.47.36-.4-.53-.79-1.08-1.15-1.63-.6-.91-1.15-1.84-1.64-2.79-.18-.18-.35-.36-.51-.49-.11-.08-.23-.21-.35-.32Z"/>
                <path className="abc-22" d="M470.45,850.32c.35,1.18.76,2.38,1.25,3.58.4.98.85,1.97,1.36,2.95.12.12.24.24.35.32.16.12.34.31.51.49-.49-.95-.94-1.91-1.33-2.89-.48-1.19-.88-2.38-1.22-3.58-.19-.18-.37-.37-.55-.52-.13-.1-.25-.23-.37-.35Z"/>
                <path className="abc-384" d="M469.39,845.69c.06.37.14.75.21,1.13.22,1.14.5,2.31.85,3.5.12.13.25.25.37.35.18.15.36.33.55.52-.34-1.2-.61-2.39-.81-3.58-.07-.4-.13-.8-.19-1.2-.2-.14-.4-.28-.59-.43-.13-.1-.27-.2-.4-.3Z"/>
                <path className="abc-236" d="M469.05,843.2c.05.48.1.94.16,1.37.05.37.11.74.17,1.11.13.1.26.2.4.3.19.14.39.29.59.43-.06-.4-.1-.8-.15-1.19-.05-.45-.1-.97-.14-1.52-.21-.1-.42-.21-.62-.3-.14-.06-.28-.14-.42-.21Z"/>
                <path className="abc-263" d="M468.75,839.8c.04.63.1,1.27.16,1.92.04.5.09,1,.14,1.47.14.07.28.14.42.21.2.09.41.2.62.3-.04-.55-.09-1.13-.13-1.73-.05-.59-.09-1.16-.12-1.74-.22-.09-.44-.18-.65-.26-.15-.05-.29-.12-.44-.18Z"/>
                <path className="abc-220" d="M468.22,623.19c0,48.5,0,97.82.02,138.71,0,1.9,0,3.78,0,5.64,0,29.51-.26,54.24.4,70.44.02.58.06,1.19.1,1.82.14.06.29.12.44.18.21.08.43.17.65.26-.03-.58-.06-1.16-.09-1.74-.7-16.72-.58-42.49-.59-73.21,0-2.06,0-4.15,0-6.25-.01-38.22,0-83.45,0-128.33-.17-2.47-.33-4.92-.51-7.47-.14-.04-.29-.05-.43-.06Z"/>
                <path className="abc-196" d="M468.07,427.69c.01,2.15.04,4.31.05,6.46.1,35.38.11,111.15.11,189.04.14.01.29.03.43.06.18,2.55.34,5.01.51,7.47,0-27.11.01-54.06.02-79.28,0-49.76-.21-92.97-.14-117.2,0-2.16.01-4.32.02-6.48-.14,0-.28-.02-.44-.05-.17-.04-.36-.03-.54-.03Z"/>
                <path className="abc-94" d="M468.17,416.91c0,1.46-.05,2.94-.07,4.32-.05,2.15-.04,4.3-.03,6.45.18,0,.37,0,.54.03.16.03.3.04.44.05,0-2.16.02-4.32.03-6.47,0-1.4.05-2.83.05-4.25-.22,0-.43,0-.62-.03-.15-.03-.25-.06-.34-.1Z"/>
                <path className="abc-8" d="M467.86,412.15c.04.17.07.37.09.56.17,1.3.22,2.74.22,4.2.09.04.19.08.34.1.19.03.4.03.62.03,0-1.42-.01-2.83-.13-4.22-.02-.21-.04-.42-.07-.61-.22,0-.43-.02-.65-.03-.14,0-.29-.02-.44-.03Z"/>
                <path className="abc-410" d="M467.72,411.65c.05.15.1.32.14.5.14,0,.29.02.44.03.22.01.43.03.65.03-.03-.19-.07-.39-.11-.56-.23,0-.45,0-.66,0-.15,0-.3,0-.45,0Z"/>
                <path className="abc-84" d="M480.66,867.18c.23.22.46.44.69.65.29.23.57.46.86.68.23.17.46.34.69.51-.27-.24-.55-.51-.83-.79-.21-.15-.42-.3-.63-.45-.26-.19-.52-.39-.78-.6Z"/>
                <path className="abc-391" d="M479.47,866c.16.17.32.34.5.5.23.22.46.45.69.67.26.2.52.4.78.6.21.15.42.3.63.45-.28-.28-.57-.57-.85-.83-.21-.2-.42-.41-.63-.63-.16-.11-.33-.22-.49-.33-.21-.14-.41-.29-.61-.43Z"/>
                <path className="abc-35" d="M478.61,865.08c.12.14.25.28.38.41.17.17.32.34.49.51.2.15.41.29.61.43.16.11.33.22.49.33-.21-.22-.42-.43-.63-.64-.16-.16-.32-.33-.48-.5-.13-.08-.26-.15-.38-.23-.16-.1-.32-.2-.48-.31Z"/>
                <path className="abc-139" d="M477.99,864.39c.08.09.16.19.25.28.12.13.25.27.37.41.16.1.32.21.48.31.13.08.25.16.38.23-.16-.17-.32-.35-.47-.5-.11-.11-.21-.22-.32-.34-.1-.06-.21-.11-.31-.17-.13-.07-.26-.14-.39-.22Z"/>
                <path className="abc-190" d="M477.15,863.42c.19.23.39.47.59.69.08.09.16.18.25.28.13.07.26.14.39.22.1.06.21.11.31.17-.1-.12-.21-.23-.31-.34-.19-.21-.38-.42-.57-.64-.1-.06-.19-.12-.29-.17-.12-.07-.24-.14-.36-.21Z"/>
                <path className="abc-326" d="M475.23,860.95c.43.6.88,1.19,1.36,1.78.18.23.37.46.57.69.12.07.24.14.36.21.1.06.19.11.29.17-.19-.21-.37-.43-.55-.64-.46-.55-.9-1.12-1.32-1.68-.11-.09-.21-.17-.32-.24-.13-.09-.26-.19-.39-.29Z"/>
                <path className="abc-237" d="M472.3,856.14c.51,1,1.08,2,1.71,3,.38.6.79,1.21,1.22,1.8.13.1.26.21.39.29.1.07.21.15.32.24-.42-.57-.81-1.14-1.19-1.72-.62-.96-1.18-1.93-1.68-2.91-.12-.12-.23-.24-.34-.32-.14-.1-.28-.25-.42-.39Z"/>
                <path className="abc-293" d="M469.64,849.58c.36,1.17.78,2.36,1.28,3.57.41.99.87,1.99,1.38,2.99.14.14.29.29.42.39.11.08.23.2.34.32-.51-.98-.96-1.96-1.36-2.95-.49-1.2-.9-2.39-1.25-3.58-.12-.13-.24-.25-.36-.34-.15-.12-.3-.26-.45-.39Z"/>
                <path className="abc-21" d="M468.53,845.07c.07.36.15.72.23,1.09.24,1.11.53,2.26.89,3.43.15.13.3.28.45.39.12.09.24.22.36.34-.35-1.18-.63-2.35-.85-3.5-.07-.39-.15-.76-.21-1.13-.13-.1-.26-.2-.39-.29-.16-.12-.32-.23-.48-.33Z"/>
                <path className="abc-417" d="M468.15,842.75c.06.42.12.83.18,1.25.06.36.12.7.19,1.06.16.1.31.21.48.33.13.09.26.19.39.29-.06-.37-.12-.74-.17-1.11-.06-.44-.11-.9-.16-1.37-.14-.07-.27-.14-.41-.2-.17-.08-.33-.16-.5-.24Z"/>
                <path className="abc-299" d="M467.81,839.43c.05.66.12,1.36.2,2.06.04.42.09.84.15,1.26.16.08.33.17.5.24.13.06.27.13.41.2-.05-.48-.1-.97-.14-1.47-.07-.65-.12-1.3-.16-1.92-.14-.06-.29-.12-.43-.17-.17-.06-.35-.13-.52-.2Z"/>
                <path className="abc-17" d="M467.37,631.58c.06,58.53.1,116.51.13,155.18.01,22.8-.14,40.06.14,48.62.01.67.03,1.4.06,2.17.02.58.06,1.22.11,1.88.17.07.35.14.52.2.14.05.28.11.43.17-.04-.63-.08-1.24-.1-1.82-.66-16.21-.4-40.93-.4-70.44,0-1.86,0-3.74,0-5.64-.02-40.89-.02-90.21-.02-138.71-.14-.01-.28-.03-.41-.07-.15,3.09-.3,5.78-.44,8.47Z"/>
                <path className="abc-393" d="M467.08,421.9c.01,1.45.04,2.98.04,4.57.07,26.61.16,116.43.25,205.11.14-2.69.29-5.38.44-8.47.13.04.27.05.41.07,0-77.89,0-153.66-.11-189.04,0-2.15-.03-4.3-.05-6.46-.18,0-.36,0-.52-.05-.17-1.92-.32-3.83-.46-5.74Z"/>
                <path className="abc-419" d="M467.23,415.16c-.01.89-.07,1.8-.1,2.61-.05,1.3-.05,2.68-.04,4.13.14,1.91.29,3.81.46,5.74.16.05.34.06.52.05-.01-2.15-.02-4.31.03-6.45.03-1.38.08-2.86.07-4.32-.09-.04-.18-.09-.32-.13-.18-.59-.4-1.1-.62-1.62Z"/>
                <path className="abc-41" d="M466.93,412.14c.05.17.09.35.13.53.15.73.19,1.6.17,2.49.22.51.44,1.03.62,1.62.14.05.23.09.32.13,0-1.46-.05-2.9-.22-4.2-.02-.2-.05-.39-.09-.56-.14-.01-.29-.02-.42-.04-.18.02-.35.02-.51.03Z"/>
                <path className="abc-190" d="M466.75,411.65c.07.16.13.32.18.49.16,0,.33-.02.51-.03.13.02.28.03.42.04-.04-.17-.08-.35-.14-.5-.15,0-.29,0-.44,0-.18,0-.36,0-.53,0Z"/>
                <path className="abc-315" d="M479.89,866.55c.2.19.4.37.61.55.28.25.56.49.85.72-.23-.2-.46-.43-.69-.65-.26-.2-.52-.41-.77-.63Z"/>
                <path className="abc-67" d="M478.87,865.54c.14.15.29.29.43.44.19.19.39.38.59.57.25.21.51.42.77.63-.23-.22-.46-.45-.69-.67-.17-.16-.33-.33-.5-.5-.2-.15-.41-.3-.61-.46Z"/>
                <path className="abc-443" d="M478.13,864.75c.1.11.21.23.32.34.14.15.28.3.42.44.2.16.4.31.61.46-.16-.17-.32-.34-.49-.51-.13-.13-.25-.27-.38-.41-.16-.1-.32-.21-.48-.32Z"/>
                <path className="abc-218" d="M477.6,864.17c.07.08.14.16.21.24.1.12.21.23.31.35.16.11.32.22.48.32-.12-.14-.25-.28-.37-.41-.08-.09-.17-.19-.25-.28-.13-.07-.26-.15-.38-.22Z"/>
                <path className="abc-450" d="M476.8,863.23c.19.23.39.47.59.7.07.08.14.16.21.24.13.07.25.15.38.22-.08-.09-.16-.19-.25-.28-.2-.22-.4-.46-.59-.69-.12-.07-.24-.13-.35-.19Z"/>
                <path className="abc-25" d="M474.85,860.69c.43.61.89,1.23,1.38,1.84.19.23.38.47.57.7.12.06.23.13.35.19-.19-.23-.38-.47-.57-.69-.48-.59-.93-1.19-1.36-1.78-.13-.1-.26-.19-.38-.26Z"/>
                <path className="abc-251" d="M471.89,855.8c.52,1.01,1.09,2.02,1.73,3.04.39.62.8,1.23,1.23,1.85.12.06.25.16.38.26-.43-.6-.83-1.2-1.22-1.8-.63-.99-1.2-2-1.71-3-.14-.14-.28-.27-.41-.34Z"/>
                <path className="abc-85" d="M469.2,849.26c.36,1.16.79,2.34,1.29,3.55.41.99.87,1.99,1.39,3,.13.07.27.2.41.34-.51-1-.97-2-1.38-2.99-.5-1.2-.92-2.4-1.28-3.57-.15-.13-.29-.25-.44-.33Z"/>
                <path className="abc-216" d="M468.07,844.8c.07.36.15.72.23,1.08.25,1.09.54,2.22.91,3.37.14.07.29.19.44.33-.36-1.17-.65-2.32-.89-3.43-.08-.37-.16-.73-.23-1.09-.16-.1-.31-.19-.46-.27Z"/>
                <path className="abc-352" d="M467.67,842.53c.06.4.12.8.2,1.21.06.35.13.7.2,1.05.15.08.3.17.46.27-.07-.36-.14-.71-.19-1.06-.07-.42-.13-.83-.18-1.25-.16-.08-.32-.16-.48-.22Z"/>
                <path className="abc-35" d="M467.31,839.26c.05.67.12,1.37.21,2.12.05.38.1.77.16,1.16.15.06.31.14.48.22-.06-.42-.1-.83-.15-1.26-.08-.71-.15-1.41-.2-2.06-.17-.07-.34-.13-.5-.18Z"/>
                <path className="abc-170" d="M466.95,640.08c.11,98.32.2,192.35.2,194.84,0,.7,0,1.54.04,2.46.02.58.06,1.21.11,1.88.16.05.33.11.5.18-.05-.66-.09-1.29-.11-1.88-.03-.77-.05-1.5-.06-2.17-.28-8.56-.12-25.82-.14-48.62-.03-38.68-.07-96.66-.13-155.18-.14,2.69-.29,5.39-.42,8.49Z"/>
                <path className="abc-441" d="M466.65,416.17c0,.75,0,1.65.01,2.69.06,17.86.19,121.74.3,221.22.13-3.11.27-5.8.42-8.49-.08-88.68-.18-178.5-.25-205.11,0-1.59-.03-3.12-.04-4.57-.14-1.91-.28-3.81-.44-5.73Z"/>
                <path className="abc-38" d="M466.64,413.55c0,.27,0,.54,0,.8,0,.46,0,1.06,0,1.82.15,1.92.29,3.83.44,5.73-.01-1.45,0-2.83.04-4.13.03-.81.09-1.72.1-2.61-.22-.51-.43-1.03-.59-1.61Z"/>
                <path className="abc-234" d="M466.44,412.18c.05.18.1.37.13.57.04.26.06.53.06.8.16.59.38,1.1.59,1.61.01-.89-.02-1.76-.17-2.49-.03-.18-.08-.36-.13-.53-.16,0-.32.02-.48.03Z"/>
                <path className="abc-53" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
              </g>
              <g>
                <path className="abc-51" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
              </g>
              <g>
                <path className="abc-51" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
              </g>
            </g>
            <g id="MeshGrid-3" data-name="MeshGrid">
              <g>
                <path className="abc-53" d="M545.89,411.27c-.07.13-.14.26-.19.39.1,0,.2,0,.3,0,.06-.13.13-.26.2-.38-.1,0-.2-.01-.31-.02Z"/>
                <path className="abc-207" d="M546.48,410.48c-.13.13-.25.27-.35.42-.09.12-.17.24-.24.37.11,0,.21,0,.31.02.07-.12.16-.23.24-.34.11-.14.23-.26.35-.38-.1-.02-.2-.05-.31-.08Z"/>
                <path className="abc-410" d="M547.45,409.78c-.2.1-.39.22-.56.34-.14.11-.28.22-.41.35.11.03.22.05.31.08.13-.12.26-.23.41-.33.17-.12.35-.23.55-.33-.09-.04-.19-.07-.29-.11Z"/>
                <path className="abc-449" d="M548.48,409.38c-.13.04-.25.08-.37.12-.23.08-.45.18-.66.28.11.03.21.07.29.11.19-.1.4-.19.61-.26.11-.04.23-.08.35-.11-.07-.05-.14-.09-.23-.14Z"/>
                <path className="abc-144" d="M550.6,409.01c-.58.05-1.17.13-1.74.26-.13.03-.26.07-.39.11.08.05.16.09.23.14.12-.03.24-.07.36-.09.61-.14,1.24-.2,1.87-.24-.11-.05-.22-.11-.34-.17Z"/>
                <path className="abc-270" d="M553.6,408.79c-.41.04-.83.07-1.23.09-.58.04-1.18.07-1.76.12.12.06.22.12.34.17.63-.04,1.27-.05,1.89-.09.45-.03.92-.06,1.38-.1-.2-.06-.39-.13-.61-.19Z"/>
                <path className="abc-348" d="M555.91,408.5c-.34.06-.71.12-1.1.17-.39.05-.8.09-1.21.13.21.07.41.13.61.19.46-.04.92-.08,1.35-.13.47-.05.92-.11,1.33-.18-.27-.07-.62-.12-.98-.18Z"/>
                <path className="abc-308" d="M557.59,407.87c-.18.16-.43.29-.76.4-.27.09-.58.16-.92.23.36.06.71.11.98.18.41-.07.78-.15,1.09-.23.39-.11.69-.24.84-.38-.36-.08-.79-.13-1.24-.19Z"/>
                <path className="abc-458" d="M558.06,406.86c-.03.11-.06.21-.09.31-.07.21-.16.39-.26.55-.03.05-.07.1-.13.15.45.05.88.11,1.24.19.05-.05.09-.1.11-.15.07-.16.13-.35.19-.55.03-.11.06-.23.09-.36-.37-.05-.75-.1-1.15-.14Z"/>
                <path className="abc-241" d="M558.23,406.26c-.04.09-.07.18-.09.26-.02.12-.05.23-.07.34.4.04.78.09,1.15.14.03-.12.05-.25.07-.37.01-.08.02-.15.03-.23-.34-.05-.71-.1-1.09-.14Z"/>
                <path className="abc-174" d="M558.42,405.8c-.02.06-.05.13-.07.19-.04.09-.08.18-.12.27.38.04.75.09,1.09.14,0-.08.02-.15.02-.23,0-.05,0-.11,0-.16-.31-.08-.61-.15-.94-.21Z"/>
                <path className="abc-72" d="M558.5,405.38c-.01.08-.04.16-.04.24,0,.06-.02.12-.04.18.32.06.63.13.94.21,0-.05,0-.11,0-.16,0-.07,0-.14,0-.21-.28-.1-.55-.19-.85-.26Z"/>
                <path className="abc-80" d="M558.54,404.77c-.01.12-.04.25-.02.37.01.08,0,.16-.02.24.3.07.57.15.85.26,0-.07-.01-.14-.02-.21-.01-.11-.03-.21-.06-.31-.23-.14-.47-.25-.73-.34Z"/>
                <path className="abc-62" d="M558.51,404.31s.01.08.03.11c.04.1.02.23,0,.34.27.09.5.2.73.34-.03-.1-.06-.2-.1-.29-.01-.03-.03-.07-.04-.1-.19-.17-.39-.3-.62-.41Z"/>
                <path className="abc-62" d="M558.47,404.07s.02.09.02.13c0,.04,0,.08.01.11.24.11.43.24.62.41-.02-.03-.03-.06-.05-.09-.02-.04-.04-.07-.07-.11-.17-.18-.34-.33-.54-.45Z"/>
                <path className="abc-404" d="M558.41,403.95s.04.08.06.12c.21.12.38.27.54.45-.02-.03-.05-.07-.08-.1-.16-.19-.32-.34-.53-.47Z"/>
                <path className="abc-42" d="M545.25,411.24c-.06.14-.11.28-.15.42.1,0,.2,0,.3,0,.1,0,.2,0,.31,0,.05-.13.12-.26.19-.39-.11,0-.22,0-.32-.02-.1,0-.21-.01-.32-.01Z"/>
                <path className="abc-47" d="M545.79,410.33c-.12.15-.24.31-.33.48-.08.14-.15.28-.21.42.11,0,.22,0,.32.01.11,0,.22.01.32.02.07-.13.15-.25.24-.37.11-.15.23-.29.35-.42-.11-.03-.22-.05-.34-.08-.11-.02-.23-.05-.35-.07Z"/>
                <path className="abc-398" d="M546.79,409.57c-.23.11-.43.24-.6.37-.14.11-.28.25-.4.4.12.03.24.05.35.07.11.02.23.05.34.08.13-.13.27-.25.41-.35.17-.12.36-.24.56-.34-.11-.03-.22-.07-.32-.11-.1-.04-.22-.07-.34-.11Z"/>
                <path className="abc-216" d="M547.95,409.1c-.14.05-.28.1-.42.15-.26.1-.51.2-.74.32.12.03.24.07.34.11.11.04.22.07.32.11.2-.1.42-.2.66-.28.12-.04.25-.09.37-.12-.08-.04-.17-.09-.26-.14-.09-.05-.18-.09-.28-.14Z"/>
                <path className="abc-273" d="M549.77,408.67c-.47.07-.94.16-1.39.29-.14.04-.29.09-.43.13.1.04.19.09.28.14.09.05.18.09.26.14.13-.04.26-.07.39-.11.56-.14,1.15-.21,1.74-.26-.12-.06-.24-.12-.39-.18-.15-.06-.29-.1-.45-.15Z"/>
                <path className="abc-356" d="M552.14,408.4c-.31.04-.63.07-.94.1-.48.05-.96.1-1.43.17.15.05.3.1.45.15.15.06.27.12.39.18.58-.05,1.18-.08,1.76-.12.41-.03.82-.06,1.23-.09-.21-.07-.44-.14-.69-.2-.25-.06-.5-.13-.76-.19Z"/>
                <path className="abc-59" d="M553.88,408.1c-.25.06-.51.12-.81.17-.31.06-.62.1-.93.14.26.06.51.13.76.19.26.07.48.13.69.2.41-.04.82-.08,1.21-.13.39-.05.76-.11,1.1-.17-.36-.06-.74-.11-1.08-.18-.31-.06-.63-.14-.95-.22Z"/>
                <path className="abc-83" d="M555.11,407.49c-.16.16-.35.29-.57.39-.2.09-.41.16-.66.22.32.08.64.16.95.22.34.07.71.13,1.08.18.34-.06.65-.14.92-.23.32-.11.58-.24.76-.4-.45-.05-.91-.11-1.33-.17-.37-.05-.76-.13-1.15-.21Z"/>
                <path className="abc-208" d="M555.6,406.61c-.03.09-.06.17-.09.25-.11.26-.24.46-.4.63.39.08.78.16,1.15.21.42.07.88.12,1.33.17.05-.05.09-.1.13-.15.1-.16.18-.34.26-.55.03-.1.07-.2.09-.31-.4-.04-.81-.09-1.24-.12-.4-.04-.82-.08-1.23-.13Z"/>
                <path className="abc-444" d="M555.83,406.04c-.06.1-.14.19-.16.29-.02.1-.05.19-.08.28.42.04.83.09,1.23.13.42.04.84.08,1.24.12.03-.11.05-.22.07-.34.02-.08.05-.18.09-.26-.38-.04-.78-.08-1.19-.12-.39-.04-.79-.07-1.21-.1Z"/>
                <path className="abc-58" d="M556.19,405.54c-.03.07-.09.14-.14.21-.06.1-.16.19-.22.29.42.03.82.07,1.21.1.4.04.8.07,1.19.12.04-.09.08-.18.12-.27.03-.06.05-.13.07-.19-.32-.06-.66-.11-1.04-.15-.36-.04-.76-.08-1.19-.11Z"/>
                <path className="abc-435" d="M556.36,405.07c-.02.09-.07.18-.09.27,0,.07-.05.13-.08.2.43.03.82.07,1.19.11.38.04.72.09,1.04.15.02-.06.03-.13.04-.18,0-.08.03-.16.04-.24-.3-.07-.62-.13-.98-.18-.35-.05-.73-.09-1.16-.13Z"/>
                <path className="abc-258" d="M556.44,404.38c-.02.14-.08.28-.05.42.02.09-.01.18-.04.27.43.04.81.08,1.16.13.36.05.68.11.98.18.01-.08.03-.16.02-.24-.02-.12.01-.25.02-.37-.27-.09-.56-.17-.91-.23-.34-.06-.72-.11-1.19-.16Z"/>
                <path className="abc-338" d="M556.47,403.85s0,.09.01.13c.04.12-.02.26-.04.39.46.05.85.1,1.19.16.35.06.64.14.91.23.01-.12.03-.24,0-.34-.01-.04-.02-.08-.03-.11-.24-.11-.51-.19-.85-.27-.33-.07-.71-.13-1.19-.19Z"/>
                <path className="abc-338" d="M556.46,403.57c.01.05,0,.1,0,.15,0,.04,0,.09,0,.13.48.06.87.12,1.19.19.34.07.61.16.85.27,0-.04,0-.08-.01-.11,0-.04,0-.09-.02-.13-.21-.12-.46-.22-.79-.3-.32-.08-.72-.14-1.22-.21Z"/>
                <path className="abc-437" d="M556.41,403.42s.04.1.05.15c.5.06.9.13,1.22.21.33.08.58.18.79.3-.01-.04-.03-.08-.06-.12-.21-.13-.46-.23-.79-.31-.32-.08-.71-.15-1.22-.22Z"/>
                <path className="abc-190" d="M544.88,411.2c-.06.15-.1.3-.14.45.02,0,.03,0,.05,0,.1,0,.21,0,.31,0,.04-.14.09-.28.15-.42-.11,0-.22,0-.33-.01-.02,0-.03-.01-.04-.02Z"/>
                <path className="abc-181" d="M545.37,410.24c-.11.16-.21.33-.29.51-.07.14-.14.3-.19.45.01.01.02.02.04.02.11,0,.22.01.33.01.06-.14.13-.28.21-.42.1-.17.21-.33.33-.48-.12-.03-.25-.05-.37-.07-.02,0-.04,0-.06-.02Z"/>
                <path className="abc-199" d="M546.37,409.45c-.24.12-.45.24-.62.38-.15.12-.28.26-.39.41.02,0,.04.01.06.02.12.02.25.05.37.07.12-.15.26-.28.4-.4.17-.13.37-.25.6-.37-.12-.03-.25-.07-.37-.11-.02,0-.03,0-.05-.01Z"/>
                <path className="abc-288" d="M547.6,408.95c-.15.05-.3.11-.44.16-.28.11-.54.22-.78.34.02,0,.03,0,.05.01.12.04.24.07.37.11.23-.11.48-.22.74-.32.14-.05.28-.1.42-.15-.1-.05-.2-.09-.31-.14-.01,0-.03-.01-.04-.02Z"/>
                <path className="abc-447" d="M549.21,408.53c-.39.07-.78.15-1.17.27-.15.05-.3.1-.45.15.01,0,.03,0,.04.02.11.05.21.09.31.14.14-.05.28-.09.43-.13.45-.13.92-.22,1.39-.29-.15-.05-.31-.1-.48-.15-.02,0-.05,0-.08,0Z"/>
                <path className="abc-297" d="M551.19,408.2c-.27.05-.54.09-.81.14-.39.06-.79.12-1.18.19.03,0,.06,0,.08,0,.17.05.33.1.48.15.47-.07.95-.12,1.43-.17.32-.03.63-.06.94-.1-.26-.06-.53-.13-.81-.18-.04,0-.09-.01-.13-.02Z"/>
                <path className="abc-275" d="M552.68,407.87c-.21.06-.44.11-.68.16-.27.06-.54.11-.81.16.05,0,.1.01.13.02.28.06.55.12.81.18.31-.04.62-.08.93-.14.3-.05.57-.11.81-.17-.32-.08-.65-.16-.99-.21-.05,0-.13,0-.21,0Z"/>
                <path className="abc-262" d="M553.78,407.29c-.14.16-.32.27-.52.37-.18.09-.37.15-.58.21.08,0,.17,0,.21,0,.34.06.67.14.99.21.25-.06.46-.13.66-.22.22-.1.41-.23.57-.39-.39-.08-.79-.16-1.18-.19-.05,0-.1,0-.15,0Z"/>
                <path className="abc-332" d="M554.18,406.48c-.02.08-.04.15-.07.23-.07.24-.19.43-.33.59.05,0,.1,0,.15,0,.39.04.79.12,1.18.19.16-.16.29-.37.4-.63.03-.08.06-.16.09-.25-.42-.04-.84-.08-1.26-.11-.06,0-.11-.01-.16-.02Z"/>
                <path className="abc-55" d="M554.34,405.93c-.04.1-.08.2-.12.3-.01.08-.03.16-.05.24.05.01.11.02.16.02.42.03.84.07,1.26.11.03-.09.05-.18.08-.28.02-.1.11-.19.16-.29-.42-.03-.85-.06-1.31-.1-.07,0-.12,0-.18-.01Z"/>
                <path className="abc-167" d="M554.56,405.42c-.02.07-.05.14-.08.21-.04.1-.09.2-.13.3.06,0,.12,0,.18.01.45.03.89.06,1.31.1.06-.1.16-.19.22-.29.04-.07.1-.14.14-.21-.43-.03-.9-.07-1.41-.11-.07,0-.15-.01-.22-.02Z"/>
                <path className="abc-452" d="M554.65,404.92c0,.1-.02.19-.04.29-.01.07-.03.14-.05.21.08,0,.15.01.22.02.51.04.98.07,1.41.11.03-.07.08-.14.08-.2.01-.09.06-.18.09-.27-.43-.04-.92-.08-1.47-.13-.08,0-.16-.01-.24-.02Z"/>
                <path className="abc-336" d="M554.53,404.2c.02.14.04.29.09.44.03.1.03.19.03.29.08,0,.16.01.24.02.55.04,1.04.08,1.47.13.02-.09.06-.18.04-.27-.04-.14.03-.28.05-.42-.46-.05-1-.1-1.63-.16-.09,0-.18-.02-.28-.02Z"/>
                <path className="abc-7" d="M554.4,403.64s.03.09.04.14c.04.13.06.27.08.41.1,0,.19.02.28.02.63.06,1.17.1,1.63.16.02-.14.08-.27.04-.39-.01-.04,0-.09-.01-.13-.48-.06-1.05-.12-1.76-.18-.1,0-.2-.02-.31-.03Z"/>
                <path className="abc-248" d="M554.29,403.34c.03.05.05.11.07.16.02.05.03.09.05.14.1,0,.21.02.31.03.7.06,1.28.12,1.76.18,0-.04,0-.09,0-.13,0-.05,0-.1,0-.15-.5-.06-1.1-.12-1.84-.19-.11,0-.22-.02-.33-.03Z"/>
                <path className="abc-439" d="M554.19,403.18c.04.05.07.11.1.16.11.01.22.02.33.03.74.07,1.34.13,1.84.19-.01-.05-.02-.1-.05-.15-.51-.07-1.12-.13-1.88-.2-.11-.01-.22-.02-.34-.03Z"/>
                <path className="abc-190" d="M544.53,411.19c-.05.16-.09.32-.12.47.1,0,.19,0,.29,0h.05c.04-.15.08-.3.14-.45-.01-.01-.02-.02-.04-.02-.1,0-.21,0-.31,0Z"/>
                <path className="abc-181" d="M544.96,410.17c-.11.17-.19.35-.26.54-.06.15-.12.31-.17.47.11,0,.21-.02.31,0,.02,0,.03.01.04.02.06-.15.12-.3.19-.45.08-.18.18-.35.29-.51-.02,0-.04-.01-.06-.02-.11-.02-.23-.04-.35-.06Z"/>
                <path className="abc-199" d="M545.97,409.34c-.25.12-.46.25-.63.39-.15.12-.28.27-.38.44.12.02.24.04.35.06.02,0,.04,0,.06.02.11-.16.25-.3.39-.41.17-.13.38-.26.62-.38-.02,0-.04,0-.05-.01-.11-.03-.23-.07-.35-.1Z"/>
                <path className="abc-383" d="M547.24,408.81c-.15.06-.31.12-.46.18-.29.11-.57.23-.81.36.12.03.24.06.35.1.02,0,.03,0,.05.01.24-.12.5-.23.78-.34.15-.06.29-.11.44-.16-.01,0-.03,0-.04-.01-.1-.04-.2-.08-.31-.13Z"/>
                <path className="abc-447" d="M548.68,408.39c-.33.08-.65.15-.97.26-.15.05-.31.11-.46.17.11.04.21.08.31.13.02,0,.03.01.04.01.15-.05.3-.1.45-.15.38-.11.77-.2,1.17-.27-.03,0-.06,0-.08,0-.15-.04-.3-.09-.45-.14Z"/>
                <path className="abc-256" d="M550.33,408.01c-.23.05-.45.11-.67.16-.33.08-.65.14-.98.22.15.05.3.1.45.14.02,0,.05,0,.08,0,.39-.07.79-.13,1.18-.19.27-.04.54-.09.81-.14-.05,0-.1-.01-.14-.02-.25-.05-.49-.11-.73-.17Z"/>
                <path className="abc-275" d="M551.57,407.67c-.18.06-.37.11-.56.16-.23.06-.45.12-.68.17.24.06.48.12.73.17.04,0,.09.01.14.02.27-.05.54-.1.81-.16.24-.05.46-.1.68-.16-.08,0-.17,0-.21,0-.31-.05-.6-.13-.89-.2Z"/>
                <path className="abc-170" d="M552.53,407.1c-.13.14-.28.26-.46.36-.16.08-.32.15-.5.21.29.07.59.14.89.2.05,0,.13,0,.21,0,.21-.06.41-.13.58-.21.2-.1.37-.22.52-.37-.05,0-.1,0-.15,0-.35-.04-.73-.11-1.09-.18Z"/>
                <path className="abc-233" d="M552.88,406.37c-.02.07-.04.14-.06.2-.06.21-.16.39-.29.53.37.07.74.14,1.09.18.05,0,.1,0,.15,0,.14-.16.25-.35.33-.59.03-.07.05-.15.07-.23-.05-.01-.11-.02-.16-.02-.38-.03-.76-.06-1.13-.08Z"/>
                <path className="abc-361" d="M553.04,405.85c-.04.1-.08.2-.11.31-.01.07-.03.14-.04.21.38.03.76.05,1.13.08.06,0,.11.01.16.02.02-.08.04-.16.05-.24.03-.1.07-.2.12-.3-.06,0-.12,0-.19-.01-.37-.02-.75-.05-1.12-.07Z"/>
                <path className="abc-453" d="M553.23,405.33c-.02.07-.04.14-.07.22-.04.1-.08.2-.12.3.37.02.75.05,1.12.07.07,0,.13,0,.19.01.04-.1.09-.2.13-.3.03-.07.06-.14.08-.21-.08,0-.15-.01-.23-.02-.37-.03-.73-.05-1.1-.07Z"/>
                <path className="abc-7" d="M553.34,404.83c-.02.1-.06.19-.07.29,0,.07-.02.14-.04.22.36.02.73.05,1.1.07.08,0,.15.01.23.02.02-.07.04-.14.05-.21.02-.1.03-.19.04-.29-.08,0-.17-.01-.25-.02-.24-.02-.49-.04-.75-.06-.1,0-.2-.01-.31-.02Z"/>
                <path className="abc-134" d="M553.22,404.09c.03.14.07.29.13.44.03.1,0,.19-.01.29.1,0,.21.01.31.02.25.02.5.04.75.06.08,0,.17.01.25.02,0-.1,0-.19-.03-.29-.05-.15-.07-.3-.09-.44-.1,0-.19-.02-.29-.02-.23-.02-.48-.04-.72-.06-.1,0-.2-.01-.3-.02Z"/>
                <path className="abc-351" d="M553.08,403.53s.03.1.04.14c.04.14.07.28.1.42.1,0,.2.01.3.02.24.02.49.04.72.06.1,0,.2.02.29.02-.02-.14-.04-.28-.08-.41-.01-.05-.03-.1-.04-.14-.1,0-.21-.02-.32-.03-.34-.03-.67-.06-1-.08Z"/>
                <path className="abc-425" d="M552.94,403.22c.03.05.06.11.09.17.02.05.04.09.05.14.33.03.67.05,1,.08.11,0,.22.02.32.03-.01-.05-.03-.09-.05-.14-.02-.05-.04-.11-.07-.16-.11-.01-.23-.02-.35-.03-.34-.03-.67-.06-1-.09Z"/>
                <path className="abc-34" d="M552.83,403.06c.04.05.08.11.11.16.33.03.66.06,1,.09.12.01.23.02.35.03-.03-.05-.06-.11-.1-.16-.11-.01-.23-.02-.35-.03-.34-.03-.67-.06-1.01-.09Z"/>
                <path className="abc-410" d="M543.76,411.13c-.03.17-.06.35-.08.52.14,0,.29,0,.43,0,.1,0,.2,0,.29,0,.03-.15.07-.31.12-.47-.11,0-.22.02-.32,0-.15,0-.3-.04-.44-.06Z"/>
                <path className="abc-164" d="M544.06,410.02c-.09.18-.15.38-.19.59-.04.17-.08.35-.11.52.15.03.29.05.44.06.11,0,.21,0,.32,0,.05-.16.1-.32.17-.47.07-.19.16-.38.26-.54-.12-.02-.24-.04-.36-.06-.17-.03-.35-.06-.54-.1Z"/>
                <path className="abc-15" d="M545.06,409.13c-.25.13-.47.27-.64.41-.15.14-.27.3-.36.48.18.03.36.07.54.1.12.02.24.04.36.06.11-.17.23-.31.38-.44.17-.13.38-.26.63-.39-.12-.03-.25-.06-.37-.09-.17-.05-.36-.09-.54-.12Z"/>
                <path className="abc-139" d="M546.38,408.54c-.16.07-.33.13-.48.2-.3.13-.59.26-.84.39.19.04.37.08.54.12.12.03.25.06.37.09.25-.12.52-.24.81-.36.15-.06.31-.12.46-.18-.11-.04-.22-.08-.34-.12-.16-.06-.34-.11-.52-.15Z"/>
                <path className="abc-161" d="M547.53,408.07c-.23.09-.43.17-.65.26-.16.07-.33.13-.49.2.19.05.36.09.52.15.11.04.23.08.34.12.15-.06.31-.11.46-.17.32-.1.64-.18.97-.26-.15-.05-.3-.1-.46-.15-.24-.07-.46-.12-.69-.17Z"/>
                <path className="abc-84" d="M548.6,407.63c-.14.06-.28.12-.42.18-.22.09-.42.18-.65.26.23.05.45.1.69.17.16.05.31.1.46.15.33-.08.66-.14.98-.22.22-.05.45-.11.67-.16-.24-.06-.48-.12-.72-.17-.36-.07-.69-.14-1.01-.2Z"/>
                <path className="abc-48" d="M549.41,407.24c-.12.07-.25.14-.4.2-.14.06-.27.13-.41.19.32.06.66.13,1.01.2.24.05.48.11.72.17.23-.05.45-.11.68-.17.19-.05.38-.1.56-.16-.29-.07-.58-.14-.88-.19-.42-.07-.86-.16-1.28-.24Z"/>
                <path className="abc-363" d="M550.03,406.7c-.09.12-.18.22-.29.31-.1.08-.21.16-.33.23.42.08.86.17,1.28.24.3.05.59.12.88.19.18-.06.35-.13.5-.21.18-.1.33-.21.46-.36-.37-.07-.73-.14-1.07-.18-.48-.04-.96-.14-1.43-.23Z"/>
                <path className="abc-296" d="M550.3,406.17s-.03.09-.05.14c-.06.15-.13.27-.22.39.46.09.95.18,1.43.23.34.04.7.11,1.07.18.13-.14.23-.32.29-.53.02-.07.04-.13.06-.2-.38-.03-.75-.05-1.11-.08-.51-.03-1.01-.08-1.48-.12Z"/>
                <path className="abc-76" d="M550.46,405.72c-.03.1-.08.2-.11.3-.02.05-.03.1-.05.15.47.04.97.09,1.48.12.36.03.73.05,1.11.08.02-.07.03-.14.04-.21.03-.1.07-.2.11-.31-.37-.02-.74-.04-1.1-.06-.52-.03-1.01-.05-1.48-.07Z"/>
                <path className="abc-259" d="M550.59,405.2c0,.07-.02.14-.03.22-.02.1-.06.2-.09.3.47.02.96.05,1.48.07.36.02.73.04,1.1.06.04-.1.09-.2.12-.3.03-.07.05-.14.07-.22-.36-.02-.72-.04-1.09-.06-.52-.03-1.04-.05-1.55-.07Z"/>
                <path className="abc-242" d="M550.64,404.69c0,.1-.07.19-.05.29.01.07,0,.14,0,.22.51.02,1.03.05,1.55.07.37.02.73.04,1.09.06.02-.07.03-.14.04-.22,0-.1.05-.19.07-.29-.35-.02-.71-.04-1.08-.06-.52-.03-1.06-.05-1.62-.07Z"/>
                <path className="abc-29" d="M550.49,403.96c.07.15.08.29.16.44.05.1,0,.19,0,.29.56.02,1.11.05,1.62.07.37.02.73.04,1.08.06.02-.1.04-.19.01-.29-.05-.15-.1-.3-.13-.44-.33-.02-.68-.04-1.04-.06-.51-.03-1.07-.05-1.7-.07Z"/>
                <path className="abc-124" d="M550.25,403.39s.04.1.07.15c.08.14.09.28.16.43.62.02,1.19.05,1.7.07.36.02.71.04,1.04.06-.03-.14-.07-.28-.1-.42-.01-.05-.03-.1-.04-.14-.33-.03-.67-.05-1-.07-.51-.03-1.13-.05-1.83-.08Z"/>
                <path className="abc-6" d="M550.06,403.07c.05.06.07.11.11.17.04.05.05.1.08.14.7.03,1.32.05,1.83.08.34.02.67.04,1,.07-.02-.05-.03-.1-.05-.14-.02-.06-.05-.11-.09-.17-.33-.03-.66-.05-1-.07-.51-.03-1.15-.05-1.89-.08Z"/>
                <path className="abc-99" d="M549.92,402.91c.06.05.09.11.13.16.74.03,1.37.06,1.89.08.34.02.67.04,1,.07-.03-.05-.07-.11-.11-.16-.34-.03-.67-.05-1.01-.07-.51-.03-1.15-.06-1.9-.08Z"/>
                <path className="abc-2" d="M542.64,411.1c-.04.18-.07.37-.1.54.24,0,.48,0,.71,0,.15,0,.29,0,.44,0,.02-.16.05-.34.08-.52-.15-.03-.29-.05-.45-.05-.22,0-.44,0-.67.02Z"/>
                <path className="abc-418" d="M542.98,409.96c-.1.19-.16.39-.21.61-.05.17-.09.36-.13.54.23-.01.45-.03.67-.02.16,0,.31.03.45.05.03-.17.07-.35.11-.52.04-.21.1-.41.19-.59-.18-.03-.37-.06-.55-.08-.19,0-.36.01-.54.03Z"/>
                <path className="abc-399" d="M543.98,408.97c-.24.16-.46.32-.63.48-.15.15-.27.32-.37.51.17-.01.34-.03.54-.03.18.02.37.05.55.08.09-.18.21-.34.36-.48.16-.14.39-.28.64-.41-.19-.04-.38-.07-.58-.11-.18-.01-.34-.03-.5-.05Z"/>
                <path className="abc-274" d="M545.25,408.27c-.16.08-.31.15-.46.23-.28.15-.56.31-.8.47.16.02.32.04.5.05.19.04.39.07.58.11.25-.13.54-.26.84-.39.16-.07.32-.13.48-.2-.19-.05-.38-.09-.58-.13-.19-.04-.37-.09-.56-.13Z"/>
                <path className="abc-395" d="M546.16,407.81c-.16.09-.3.17-.45.24-.16.07-.32.15-.47.22.19.04.37.09.56.13.2.04.39.09.58.13.16-.07.33-.13.49-.2.23-.09.43-.18.65-.26-.23-.05-.45-.09-.69-.15-.22-.04-.44-.08-.67-.12Z"/>
                <path className="abc-354" d="M546.9,407.32c-.09.06-.18.13-.28.2-.15.1-.3.2-.46.29.23.04.46.08.67.12.24.05.47.1.69.15.23-.09.43-.17.65-.26.15-.06.28-.12.42-.18-.32-.06-.63-.12-.93-.17-.26-.04-.51-.09-.77-.14Z"/>
                <path className="abc-407" d="M547.42,406.91c-.08.08-.17.16-.26.23-.08.06-.16.12-.25.18.25.05.51.1.77.14.3.06.61.11.93.17.14-.06.27-.12.41-.19.15-.07.28-.13.4-.2-.42-.08-.82-.16-1.16-.21-.27-.03-.55-.08-.84-.12Z"/>
                <path className="abc-194" d="M547.86,406.38c-.07.1-.14.19-.22.29-.07.08-.14.16-.22.24.28.04.56.08.84.12.34.05.74.13,1.16.21.12-.07.23-.15.33-.23.11-.09.21-.2.29-.31-.46-.09-.91-.18-1.29-.21-.28-.02-.58-.07-.88-.11Z"/>
                <path className="abc-86" d="M548.12,406s-.04.06-.06.09c-.07.1-.13.19-.2.29.3.04.61.08.88.11.38.03.83.12,1.29.21.09-.12.15-.24.22-.39.02-.05.03-.09.05-.14-.47-.04-.92-.09-1.32-.11-.28-.02-.56-.04-.85-.06Z"/>
                <path className="abc-317" d="M548.25,405.62c0,.1-.03.2-.06.3-.02.03-.04.06-.06.09.29.02.57.04.85.06.41.02.85.06,1.32.11.02-.05.03-.1.05-.15.03-.1.08-.2.11-.3-.47-.02-.93-.04-1.37-.06-.28-.01-.56-.03-.84-.04Z"/>
                <path className="abc-152" d="M548.2,405.1c.02.07.03.14.04.22.01.1.01.2,0,.3.28.01.56.02.84.04.45.02.9.04,1.37.06.03-.1.08-.2.09-.3.01-.07.03-.14.03-.22-.51-.02-1.02-.04-1.52-.06-.28-.01-.57-.02-.86-.03Z"/>
                <path className="abc-423" d="M548.07,404.6c.03.1.06.19.08.28.02.07.04.14.05.22.29,0,.58.02.86.03.51.02,1.01.04,1.52.06,0-.07.01-.14,0-.22-.02-.1.05-.19.05-.29-.56-.02-1.15-.05-1.75-.07-.27,0-.55-.01-.82-.02Z"/>
                <path className="abc-224" d="M547.7,403.88c.1.15.19.29.26.44.05.1.08.19.11.28.27,0,.55.01.82.02.6.02,1.19.05,1.75.07,0-.1.05-.19,0-.29-.08-.15-.09-.3-.16-.44-.62-.02-1.31-.05-2.06-.07-.24,0-.49,0-.73,0Z"/>
                <path className="abc-222" d="M547.23,403.3c.04.05.09.1.13.15.12.14.23.29.33.43.24,0,.49,0,.73,0,.75.03,1.44.05,2.06.07-.07-.15-.08-.29-.16-.43-.03-.05-.04-.1-.07-.15-.7-.03-1.49-.05-2.34-.08-.22,0-.45,0-.68,0Z"/>
                <path className="abc-278" d="M546.94,402.97c.05.06.11.12.16.18.05.05.09.1.13.15.23,0,.46,0,.68,0,.85.03,1.64.06,2.34.08-.03-.05-.05-.1-.08-.14-.04-.06-.06-.11-.11-.17-.74-.03-1.57-.06-2.48-.09-.21,0-.42-.01-.64-.01Z"/>
                <path className="abc-155" d="M546.78,402.8c.05.06.11.11.16.17.22,0,.43,0,.64.01.91.03,1.74.06,2.48.09-.05-.06-.08-.11-.13-.16-.75-.03-1.6-.06-2.54-.09-.2,0-.4-.01-.61-.02Z"/>
                <path className="abc-221" d="M541.62,411.14c-.07.17-.12.34-.17.5.12,0,.24,0,.36,0,.25,0,.49,0,.73,0,.03-.18.06-.36.1-.54-.23.01-.46.03-.69.03-.11,0-.22,0-.33,0Z"/>
                <path className="abc-211" d="M542.15,410.03c-.12.19-.22.39-.31.6-.08.17-.15.34-.22.51.11,0,.22,0,.33,0,.23,0,.46-.02.69-.03.04-.18.08-.36.13-.54.04-.22.11-.42.21-.61-.17.01-.35.03-.55.04-.1,0-.19.01-.28.03Z"/>
                <path className="abc-295" d="M543.18,408.95c-.23.18-.45.37-.63.55-.15.16-.29.34-.4.53.09-.01.18-.02.28-.03.2-.01.38-.03.55-.04.1-.19.22-.36.37-.51.17-.16.39-.32.63-.48-.16-.02-.33-.03-.53-.03-.1,0-.18,0-.27.01Z"/>
                <path className="abc-97" d="M544.34,408.14c-.14.09-.27.18-.41.27-.26.17-.51.35-.74.54.09,0,.17-.01.27-.01.21,0,.37.02.53.03.24-.16.52-.32.8-.47.15-.08.31-.16.46-.23-.19-.04-.39-.08-.61-.11-.11-.01-.2-.02-.3-.02Z"/>
                <path className="abc-405" d="M545.11,407.66c-.13.09-.25.17-.37.23-.13.08-.27.16-.41.25.1,0,.19,0,.3.02.22.03.42.07.61.11.16-.08.31-.15.47-.22.14-.07.29-.15.45-.24-.23-.04-.47-.07-.71-.1-.12-.02-.23-.03-.34-.04Z"/>
                <path className="abc-25" d="M545.72,407.18c-.07.06-.15.13-.23.19-.12.1-.25.2-.37.29.11.01.22.03.34.04.24.03.48.07.71.1.16-.09.31-.19.46-.29.1-.07.19-.13.28-.2-.25-.05-.51-.09-.78-.13-.13-.01-.27-.02-.41-.02Z"/>
                <path className="abc-98" d="M546.17,406.78c-.07.07-.16.15-.25.22-.06.06-.13.12-.21.18.14,0,.28,0,.41.02.27.03.52.08.78.13.09-.06.17-.13.25-.18.1-.07.18-.15.26-.23-.28-.04-.56-.08-.84-.11-.14-.01-.27-.02-.41-.02Z"/>
                <path className="abc-245" d="M546.59,406.29c-.07.09-.14.18-.21.26-.06.08-.13.15-.21.23.14,0,.27,0,.41.02.27.03.56.07.84.11.08-.08.15-.16.22-.24.08-.09.15-.19.22-.29-.3-.04-.61-.08-.88-.1-.14,0-.26,0-.39,0Z"/>
                <path className="abc-58" d="M546.85,405.94s-.04.05-.06.08c-.07.09-.14.17-.2.26.13,0,.25-.02.39,0,.28.02.58.06.88.1.07-.1.14-.19.2-.29.02-.03.04-.06.06-.09-.29-.02-.57-.04-.85-.05-.14,0-.28,0-.42,0Z"/>
                <path className="abc-58" d="M546.97,405.58c0,.1-.02.19-.05.29-.02.02-.05.05-.07.08.14,0,.28,0,.42,0,.28.01.56.03.85.05.02-.03.04-.06.06-.09.03-.1.05-.2.06-.3-.28-.01-.56-.02-.84-.03-.14,0-.28,0-.44,0Z"/>
                <path className="abc-8" d="M546.93,405.08c.01.07.03.14.03.21,0,.1.02.19.01.29.15,0,.3,0,.44,0,.28,0,.56.02.84.03,0-.1,0-.2,0-.3,0-.07-.02-.14-.04-.22-.29,0-.58-.01-.86-.02-.14,0-.28,0-.42,0Z"/>
                <path className="abc-287" d="M546.83,404.59c.02.09.03.19.05.28.01.07.03.14.04.21.14,0,.28,0,.42,0,.28,0,.57,0,.86.02-.02-.07-.03-.14-.05-.22-.03-.1-.05-.19-.08-.28-.27,0-.55,0-.82-.01-.13,0-.27,0-.41,0Z"/>
                <path className="abc-307" d="M546.57,403.87c.08.15.15.29.19.44.03.09.05.19.06.28.14,0,.28,0,.41,0,.27,0,.55,0,.82.01-.03-.1-.07-.19-.11-.28-.07-.15-.16-.3-.26-.44-.24,0-.49,0-.74-.01-.12,0-.25,0-.38,0Z"/>
                <path className="abc-26" d="M546.2,403.28c.04.05.07.1.11.15.1.14.19.29.27.43.13,0,.26,0,.38,0,.25,0,.49,0,.74.01-.1-.15-.21-.29-.33-.43-.04-.05-.09-.1-.13-.15-.23,0-.46,0-.69-.01-.11,0-.23,0-.35,0Z"/>
                <path className="abc-249" d="M545.96,402.95c.04.06.09.12.13.18.04.05.07.1.11.15.12,0,.23,0,.35,0,.23,0,.46,0,.69.01-.04-.05-.09-.1-.13-.15-.05-.06-.11-.12-.16-.18-.22,0-.44,0-.66-.02-.11,0-.21,0-.32,0Z"/>
                <path className="abc-448" d="M545.83,402.77c.04.06.08.12.13.18.11,0,.22,0,.32,0,.22,0,.44.01.66.02-.05-.06-.11-.11-.16-.17-.21,0-.42-.01-.63-.02-.1,0-.21,0-.31,0Z"/>
                <path className="abc-290" d="M540.25,411.22c-.1.15-.22.28-.31.42.39,0,.77,0,1.15,0,.12,0,.24,0,.36,0,.05-.16.11-.33.17-.5-.11,0-.22,0-.33,0-.34.01-.68.04-1.04.07Z"/>
                <path className="abc-381" d="M541.05,410.2c-.15.19-.32.39-.45.58-.11.15-.25.29-.35.44.36-.03.71-.06,1.04-.07.11,0,.22,0,.33,0,.07-.17.14-.34.22-.51.09-.21.19-.41.31-.6-.09.01-.18.03-.28.04-.26.03-.53.08-.82.13Z"/>
                <path className="abc-374" d="M542.19,409.01c-.21.21-.45.42-.65.63-.17.18-.35.37-.5.56.29-.05.56-.1.82-.13.1-.01.19-.03.28-.04.12-.19.25-.37.4-.53.18-.18.4-.37.63-.55-.09,0-.17.02-.27.03-.23.01-.46.02-.72.04Z"/>
                <path className="abc-117" d="M543.19,408.1c-.1.1-.22.2-.33.31-.21.2-.45.4-.66.61.27-.01.49-.02.72-.04.1,0,.18-.02.27-.03.23-.18.49-.36.74-.54.14-.09.27-.18.41-.27-.1,0-.19,0-.3,0-.24-.01-.52-.03-.85-.04Z"/>
                <path className="abc-92" d="M543.74,407.56c-.08.09-.16.17-.25.24-.09.09-.2.19-.3.29.33.01.61.03.85.04.11,0,.2,0,.3,0,.14-.09.27-.17.41-.25.12-.06.24-.14.37-.23-.11-.01-.22-.02-.34-.03-.28-.02-.63-.04-1.03-.06Z"/>
                <path className="abc-89" d="M544.1,407.08c-.05.06-.09.13-.14.19-.07.1-.12.2-.21.29.4.02.75.04,1.03.06.12,0,.23.02.34.03.13-.09.25-.19.37-.29.08-.06.16-.13.23-.19-.14,0-.28,0-.41,0-.35-.02-.76-.06-1.21-.08Z"/>
                <path className="abc-163" d="M544.4,406.69c-.05.07-.11.13-.17.2-.05.07-.09.13-.14.19.45.03.86.06,1.21.08.13,0,.27,0,.41,0,.07-.06.14-.12.21-.18.09-.07.17-.14.25-.22-.14,0-.27,0-.42,0-.39-.02-.85-.05-1.35-.08Z"/>
                <path className="abc-233" d="M544.7,406.24c-.05.08-.1.16-.15.24-.05.07-.1.14-.15.21.5.03.96.06,1.35.08.14,0,.28,0,.42,0,.07-.07.14-.15.21-.23.07-.09.14-.17.21-.26-.13,0-.26.02-.42.01-.44-.01-.93-.04-1.47-.06Z"/>
                <path className="abc-176" d="M544.87,405.91s-.02.05-.04.08c-.04.09-.09.17-.13.25.53.02,1.03.04,1.47.06.16,0,.29,0,.42-.01.07-.09.13-.18.2-.26.02-.03.04-.06.06-.08-.14,0-.3,0-.46,0-.47-.01-.98-.02-1.52-.03Z"/>
                <path className="abc-176" d="M544.97,405.56c-.02.09-.03.18-.06.27-.01.03-.03.05-.04.08.55,0,1.06.02,1.52.03.16,0,.31,0,.46,0,.02-.03.05-.05.07-.08.03-.09.04-.19.05-.29-.15,0-.31,0-.46,0-.46,0-.99-.01-1.54-.01Z"/>
                <path className="abc-246" d="M545,405.08c0,.07,0,.13,0,.2,0,.09,0,.18-.03.28.56,0,1.08,0,1.54.01.16,0,.31,0,.46,0,0-.1,0-.19-.01-.29,0-.07-.02-.14-.03-.21-.14,0-.28,0-.42,0-.45,0-.97,0-1.51,0Z"/>
                <path className="abc-283" d="M544.97,404.6c0,.09.02.18.02.28,0,.07,0,.13,0,.2.54,0,1.05,0,1.51,0,.14,0,.28,0,.42,0-.01-.07-.03-.14-.04-.21-.02-.09-.03-.19-.05-.28-.14,0-.28,0-.43,0-.44,0-.93,0-1.43.01Z"/>
                <path className="abc-382" d="M544.87,403.88c.03.15.06.3.07.44,0,.09.03.19.03.28.5,0,.99,0,1.43-.01.14,0,.29,0,.43,0-.02-.09-.03-.19-.06-.28-.05-.15-.12-.29-.19-.44-.13,0-.27,0-.41,0-.41,0-.85,0-1.3.01Z"/>
                <path className="abc-95" d="M544.7,403.28c.02.05.04.11.05.16.05.15.09.3.12.45.45,0,.89-.01,1.3-.01.14,0,.27,0,.41,0-.08-.15-.17-.29-.27-.43-.03-.05-.07-.1-.11-.15-.12,0-.24,0-.36,0-.36,0-.75,0-1.14,0Z"/>
                <path className="abc-403" d="M544.57,402.92c.02.06.05.13.07.19.02.05.04.11.06.16.39,0,.78,0,1.14,0,.12,0,.24,0,.36,0-.04-.05-.07-.1-.11-.15-.04-.06-.09-.12-.13-.18-.11,0-.22,0-.33,0-.34,0-.69-.01-1.05-.02Z"/>
                <path className="abc-375" d="M544.5,402.73c.02.06.05.13.07.19.36,0,.71.01,1.05.02.11,0,.22,0,.33,0-.04-.06-.09-.12-.13-.18-.11,0-.21,0-.32,0-.33,0-.66-.02-1.01-.03Z"/>
                <path className="abc-71" d="M538.78,411.26c-.11.13-.21.25-.3.37.1,0,.19,0,.29,0,.4,0,.79,0,1.18,0,.09-.14.2-.27.31-.42-.36.03-.73.05-1.12.05-.12,0-.23,0-.35,0Z"/>
                <path className="abc-329" d="M539.56,410.29c-.14.19-.3.39-.44.57-.11.14-.23.28-.34.41.12,0,.23,0,.35,0,.39,0,.76-.03,1.12-.05.1-.15.24-.29.35-.44.13-.19.3-.39.45-.58-.29.05-.61.1-.99.12-.17,0-.33-.02-.5-.03Z"/>
                <path className="abc-185" d="M540.45,409.04c-.16.22-.33.44-.47.67-.12.19-.27.39-.42.58.17.01.33.03.5.03.37-.02.69-.07.99-.12.15-.19.33-.38.5-.56.2-.21.44-.42.65-.63-.27.01-.58.03-.99.05-.23-.01-.49-.02-.75-.02Z"/>
                <path className="abc-387" d="M541.09,408.05c-.06.11-.13.21-.19.33-.13.22-.28.44-.44.66.26,0,.52.01.75.02.41-.02.72-.04.99-.05.21-.21.46-.41.66-.61.11-.1.23-.21.33-.31-.33-.01-.73-.02-1.2-.03-.29,0-.59-.01-.9-.02Z"/>
                <path className="abc-361" d="M541.33,407.48c-.02.09-.05.18-.09.26-.04.1-.09.2-.15.31.32,0,.62,0,.9.02.47,0,.86.02,1.2.03.1-.1.21-.2.3-.29.1-.07.17-.16.25-.24-.4-.02-.85-.04-1.35-.05-.33,0-.69-.02-1.06-.03Z"/>
                <path className="abc-322" d="M541.4,407.01c-.01.06-.02.13-.03.19,0,.1-.01.19-.03.28.37.01.73.02,1.06.03.5.01.95.03,1.35.05.08-.09.14-.19.21-.29.05-.06.09-.13.14-.19-.45-.03-.95-.05-1.47-.06-.39,0-.8-.01-1.23-.01Z"/>
                <path className="abc-182" d="M541.48,406.62c0,.07-.02.13-.04.2-.02.06-.04.13-.05.19.43,0,.84,0,1.23.01.52,0,1.02.03,1.47.06.05-.06.09-.13.14-.19.06-.07.11-.13.17-.2-.5-.03-1.04-.05-1.58-.06-.43,0-.87,0-1.34-.01Z"/>
                <path className="abc-306" d="M541.51,406.19c0,.08,0,.15-.01.23,0,.07-.01.13-.02.2.46,0,.91,0,1.34.01.55,0,1.08.03,1.58.06.05-.07.1-.14.15-.21.05-.08.1-.16.15-.24-.53-.02-1.1-.04-1.69-.04-.48,0-.98,0-1.49,0Z"/>
                <path className="abc-328" d="M541.54,405.88s0,.05-.01.07c-.01.08-.01.16-.02.24.51,0,1.01,0,1.49,0,.59,0,1.16.02,1.69.04.05-.08.09-.17.13-.25.01-.03.02-.06.04-.08-.55,0-1.13-.02-1.75-.02-.51,0-1.04,0-1.58,0Z"/>
                <path className="abc-328" d="M541.63,405.54c-.02.09-.05.18-.07.27,0,.02-.01.05-.02.07.54,0,1.07,0,1.58,0,.61,0,1.2.01,1.75.02.01-.03.03-.05.04-.08.03-.09.04-.18.06-.27-.56,0-1.14,0-1.73-.01-.52,0-1.05,0-1.61,0Z"/>
                <path className="abc-151" d="M541.74,405.06c-.01.07-.03.13-.04.2-.02.09-.05.19-.07.28.55,0,1.09,0,1.61,0,.59,0,1.18,0,1.73.01.02-.09.02-.18.03-.28,0-.07,0-.13,0-.2-.54,0-1.1,0-1.64,0-.52,0-1.06-.01-1.62-.01Z"/>
                <path className="abc-124" d="M541.82,404.58c-.01.09-.03.18-.04.28-.01.07-.02.14-.04.2.56,0,1.1,0,1.62.01.54,0,1.1,0,1.64,0,0-.07,0-.13,0-.2,0-.09-.01-.18-.02-.28-.5,0-1.02,0-1.53,0-.52,0-1.07-.01-1.62-.02Z"/>
                <path className="abc-289" d="M541.86,403.86c0,.15,0,.3-.01.45,0,.09-.01.19-.03.28.56,0,1.1.01,1.62.02.5,0,1.02,0,1.53,0,0-.09-.02-.18-.03-.28-.01-.15-.04-.3-.07-.44-.45,0-.91,0-1.36,0-.53-.01-1.08-.02-1.65-.03Z"/>
                <path className="abc-451" d="M541.86,403.23c0,.06,0,.11,0,.17,0,.16,0,.31,0,.46.57,0,1.12.02,1.65.03.45,0,.91,0,1.36,0-.03-.15-.08-.3-.12-.45-.02-.05-.03-.11-.05-.16-.39,0-.79,0-1.19,0-.53-.01-1.08-.02-1.65-.04Z"/>
                <path className="abc-228" d="M541.83,402.86c0,.07.02.14.02.2,0,.06,0,.11.01.17.57.01,1.12.02,1.65.04.4,0,.8,0,1.19,0-.02-.05-.04-.11-.06-.16-.02-.06-.05-.13-.07-.19-.36,0-.72-.01-1.1-.02-.54-.01-1.09-.03-1.65-.04Z"/>
                <path className="abc-231" d="M541.8,402.66c.01.07.02.14.03.21.56.01,1.11.03,1.65.04.37,0,.74.02,1.1.02-.02-.06-.05-.13-.07-.19-.34,0-.69-.02-1.05-.03-.54-.01-1.09-.03-1.65-.04Z"/>
                <path className="abc-271" d="M538.04,411.22c-.06.14-.12.29-.16.42.1,0,.21,0,.31,0,.1,0,.19,0,.29,0,.09-.12.19-.24.3-.37-.12,0-.23-.01-.35-.02-.13,0-.26-.02-.39-.03Z"/>
                <path className="abc-265" d="M538.44,410.19c-.06.19-.14.39-.21.57-.06.15-.14.3-.2.45.13,0,.26.02.39.03.12,0,.24.02.35.02.11-.13.23-.26.34-.41.14-.18.3-.38.44-.57-.17-.01-.34-.03-.53-.05-.2-.01-.39-.03-.59-.05Z"/>
                <path className="abc-298" d="M538.7,409c-.05.19-.11.38-.14.57,0,.02,0,.04-.01.06,0,.18-.05.37-.11.57.2.02.39.03.59.05.19.01.36.03.53.05.14-.19.29-.39.42-.58.15-.23.32-.45.47-.67-.26,0-.54,0-.82-.02-.29,0-.61-.01-.94-.02Z"/>
                <path className="abc-341" d="M538.92,408.04c0,.11-.03.22-.05.33-.04.22-.11.42-.17.63.33,0,.64.01.94.02.28,0,.55.01.82.02.16-.22.32-.44.44-.66.06-.11.14-.22.19-.33-.32,0-.65,0-1,0-.37,0-.76,0-1.17,0Z"/>
                <path className="abc-54" d="M538.82,407.45c.05.09.08.18.09.26h0c.02.11.01.22,0,.33.41,0,.8,0,1.17,0,.35,0,.68,0,1,0,.06-.11.11-.21.15-.31.04-.08.07-.17.09-.26-.37-.01-.76-.02-1.17-.03-.43,0-.88,0-1.34,0Z"/>
                <path className="abc-243" d="M538.56,407c.03.06.06.12.1.18.06.09.12.18.17.27.46,0,.9,0,1.34,0,.41,0,.8.01,1.17.03.02-.09.03-.19.03-.28.01-.06.02-.12.03-.19-.43,0-.88,0-1.33,0-.49,0-.99,0-1.51,0Z"/>
                <path className="abc-162" d="M538.45,406.61c.03.07.05.13.05.2,0,.06.02.13.05.19.52,0,1.02,0,1.51,0,.46,0,.9,0,1.33,0,.01-.06.03-.13.05-.19.02-.07.03-.13.04-.2-.46,0-.94,0-1.43,0-.52,0-1.06,0-1.6,0Z"/>
                <path className="abc-138" d="M538.21,406.19c.04.08.1.15.14.23.04.07.08.13.1.2.54,0,1.08,0,1.6,0,.49,0,.97,0,1.43,0,0-.07.01-.13.02-.2,0-.08,0-.15.01-.23-.51,0-1.04,0-1.57,0-.57,0-1.15,0-1.73,0Z"/>
                <path className="abc-368" d="M538.07,405.88s.01.05.02.07c.02.08.07.16.11.24.59,0,1.17,0,1.73,0,.53,0,1.06,0,1.57,0,0-.08,0-.16.02-.24,0-.02,0-.05.01-.07-.54,0-1.1,0-1.66,0-.6,0-1.2,0-1.81,0Z"/>
                <path className="abc-368" d="M538.07,405.53c0,.09-.02.18-.01.27,0,.03,0,.05.01.08.61,0,1.22,0,1.81,0,.56,0,1.11,0,1.66,0,0-.02,0-.05.02-.07.02-.09.05-.18.07-.27-.55,0-1.12,0-1.69,0-.61,0-1.23,0-1.86,0Z"/>
                <path className="abc-145" d="M538.15,405.06c-.01.07-.03.14-.03.2-.01.09-.03.18-.04.28.63,0,1.25,0,1.86,0,.57,0,1.14,0,1.69,0,.02-.09.05-.18.07-.28.01-.07.03-.13.04-.2-.56,0-1.13,0-1.71,0-.62,0-1.25,0-1.88,0Z"/>
                <path className="abc-124" d="M538.2,404.57c0,.09-.01.19-.02.28,0,.07-.02.14-.03.21.63,0,1.27,0,1.88,0,.58,0,1.15,0,1.71,0,.01-.07.03-.13.04-.2.02-.09.03-.18.04-.28-.56,0-1.13,0-1.72,0-.62,0-1.26,0-1.9,0Z"/>
                <path className="abc-124" d="M538.18,403.82c0,.16,0,.31.02.46.01.1,0,.19,0,.29.64,0,1.28,0,1.9,0,.59,0,1.16,0,1.72,0,.01-.09.02-.19.03-.28,0-.15,0-.29.01-.45-.57,0-1.16-.01-1.75-.02-.63,0-1.28-.01-1.93-.01Z"/>
                <path className="abc-209" d="M538.2,403.17c0,.06,0,.12,0,.18,0,.16-.01.32-.02.47.66,0,1.3,0,1.93.01.59,0,1.18.01,1.75.02,0-.15,0-.3,0-.46,0-.06,0-.11,0-.17-.57-.01-1.15-.02-1.74-.03-.63-.01-1.27-.02-1.92-.03Z"/>
                <path className="abc-183" d="M538.18,402.78c0,.07.01.14.01.21,0,.06,0,.12,0,.18.65,0,1.29.02,1.92.03.59,0,1.17.02,1.74.03,0-.06,0-.11-.01-.17,0-.07-.01-.13-.02-.2-.56-.01-1.14-.03-1.73-.04-.63-.01-1.27-.03-1.91-.04Z"/>
                <path className="abc-10" d="M538.15,402.56c.01.07.02.15.03.22.65.01,1.29.03,1.91.04.59.01,1.17.03,1.73.04,0-.07-.02-.14-.03-.21-.56-.01-1.14-.03-1.73-.05-.63-.02-1.26-.03-1.91-.05Z"/>
                <path className="abc-32" d="M537.18,411.18c0,.16.02.31.04.45.11,0,.23,0,.34,0,.1,0,.21,0,.31,0,.04-.13.1-.27.16-.42-.13,0-.27-.02-.41-.02-.15,0-.3-.01-.44-.02Z"/>
                <path className="abc-364" d="M537.04,410.11c.05.19.07.4.1.59.02.16.03.32.04.47.14,0,.29.02.44.02.14,0,.28.01.41.02.06-.14.14-.3.2-.45.07-.19.15-.38.21-.57-.2-.02-.41-.03-.64-.04-.25-.01-.5-.03-.76-.04Z"/>
                <path className="abc-304" d="M536.52,408.96c.07.18.15.37.25.54,0,.02.01.03.02.05.13.18.2.37.25.57.26.02.51.03.76.04.23,0,.44.02.64.04.06-.19.1-.38.11-.57,0-.02,0-.04.01-.06.02-.19.08-.38.14-.57-.33,0-.67-.01-1.01-.02-.38,0-.77-.02-1.17-.02Z"/>
                <path className="abc-156" d="M536.14,408.02c.05.11.09.22.14.33.09.2.16.41.24.61.4,0,.79.01,1.17.02.35,0,.69.01,1.01.02.06-.21.13-.42.17-.63.02-.11.04-.22.05-.33-.41,0-.83,0-1.27,0-.48,0-.99,0-1.5,0Z"/>
                <path className="abc-265" d="M535.71,407.44c.09.08.19.17.25.26t0,0c.08.11.13.22.18.33.51,0,1.02,0,1.5,0,.44,0,.87,0,1.27,0,0-.11.01-.22,0-.33h0c0-.09-.04-.18-.09-.26-.46,0-.94,0-1.43,0-.54,0-1.11,0-1.69,0Z"/>
                <path className="abc-163" d="M535.22,407c.06.06.13.12.18.18.09.09.21.17.3.26.58,0,1.14,0,1.69,0,.49,0,.97,0,1.43,0-.05-.09-.11-.18-.17-.27-.03-.06-.07-.12-.1-.18-.52,0-1.04,0-1.58,0-.58,0-1.17,0-1.76,0Z"/>
                <path className="abc-320" d="M534.94,406.62c.06.07.11.13.14.19.03.06.08.13.14.19.59,0,1.17,0,1.76,0,.53,0,1.06,0,1.58,0-.03-.06-.05-.13-.05-.19,0-.06-.03-.13-.05-.2-.54,0-1.09,0-1.65,0-.61,0-1.24,0-1.86,0Z"/>
                <path className="abc-116" d="M534.52,406.19c.07.08.17.15.23.23.06.07.13.13.19.2.62,0,1.24,0,1.86,0,.56,0,1.11,0,1.65,0-.03-.07-.07-.13-.1-.2-.04-.08-.1-.15-.14-.23-.59,0-1.18,0-1.77,0-.65,0-1.29,0-1.92,0Z"/>
                <path className="abc-306" d="M534.28,405.87s.03.05.04.08c.05.08.13.16.21.24.63,0,1.27,0,1.92,0,.59,0,1.18,0,1.77,0-.05-.08-.09-.16-.11-.24,0-.02-.02-.05-.02-.07-.61,0-1.22,0-1.83,0-.67,0-1.33,0-1.97,0Z"/>
                <path className="abc-306" d="M534.19,405.54c.01.08.02.17.05.25,0,.03.02.05.03.08.64,0,1.3,0,1.97,0,.61,0,1.22,0,1.83,0,0-.02-.01-.05-.01-.08,0-.09,0-.18.01-.27-.63,0-1.25,0-1.87,0-.68,0-1.35,0-2.01.01Z"/>
                <path className="abc-378" d="M534.15,405.09c0,.06,0,.13,0,.19.01.09.01.18.03.26.66,0,1.33-.01,2.01-.01.62,0,1.25,0,1.87,0,0-.09.03-.18.04-.28,0-.07.02-.13.03-.2-.63,0-1.27,0-1.91,0-.7,0-1.4.01-2.08.03Z"/>
                <path className="abc-124" d="M534.12,404.58c.01.11.01.21.02.3,0,.07,0,.14,0,.2.69-.02,1.38-.03,2.08-.03.64,0,1.28,0,1.91,0,.01-.07.02-.14.03-.21,0-.09.02-.19.02-.28-.64,0-1.29,0-1.94,0-.71,0-1.43,0-2.14.02Z"/>
                <path className="abc-124" d="M534.03,403.8c0,.16,0,.32.05.47.03.1.04.2.05.31.71,0,1.43-.02,2.14-.02.65,0,1.3,0,1.94,0,0-.09,0-.19,0-.29-.02-.15-.02-.3-.02-.46-.66,0-1.32,0-1.98-.01-.72,0-1.45,0-2.17,0Z"/>
                <path className="abc-257" d="M534.02,403.12c0,.06,0,.12,0,.19.01.17,0,.33,0,.49.72,0,1.45,0,2.17,0,.66,0,1.32.01,1.98.01,0-.16.01-.31.02-.47,0-.06,0-.12,0-.18-.65,0-1.31-.02-1.97-.03-.73-.01-1.47-.02-2.21-.02Z"/>
                <path className="abc-198" d="M534,402.7c0,.08,0,.16.01.23,0,.06,0,.13,0,.19.74,0,1.48,0,2.21.02.66.01,1.32.02,1.97.03,0-.06,0-.12,0-.18,0-.07,0-.14-.01-.21-.65-.01-1.3-.03-1.97-.04-.73-.02-1.47-.03-2.22-.04Z"/>
                <path className="abc-71" d="M533.97,402.46c.02.08.02.15.03.23.75.01,1.49.03,2.22.04.66.01,1.32.03,1.97.04,0-.07-.02-.14-.03-.22-.65-.02-1.31-.03-1.97-.05-.73-.02-1.47-.03-2.21-.05Z"/>
                <path className="abc-49" d="M536.38,411.14c.08.17.15.33.23.49.09,0,.18,0,.27,0,.12,0,.23,0,.34,0-.02-.15-.03-.3-.04-.45-.14,0-.29-.02-.45-.02-.12,0-.24-.01-.35-.02Z"/>
                <path className="abc-394" d="M535.62,410.03c.18.2.33.4.47.6.12.17.2.34.29.5.12,0,.23.01.35.02.16,0,.3.02.45.02,0-.16-.02-.31-.04-.47-.03-.2-.05-.4-.1-.59-.26-.02-.52-.03-.79-.05-.21-.01-.42-.02-.63-.03Z"/>
                <path className="abc-312" d="M534.31,408.94c.23.19.45.37.69.54.25.17.45.36.63.55.21.01.42.02.63.03.27.01.53.03.79.05-.05-.19-.12-.39-.25-.57,0-.02-.01-.03-.02-.05-.1-.17-.18-.35-.25-.54-.4,0-.81,0-1.23-.01-.32,0-.65,0-.99,0Z"/>
                <path className="abc-126" d="M533.29,408.03c.12.11.23.23.35.34.22.19.44.38.66.57.33,0,.66,0,.99,0,.42,0,.83,0,1.23.01-.08-.2-.15-.41-.24-.61-.05-.11-.09-.22-.14-.33-.51,0-1.04,0-1.58,0-.41,0-.84,0-1.27,0Z"/>
                <path className="abc-33" d="M532.61,407.43c.1.08.21.17.31.25.13.11.25.23.37.34.43,0,.86,0,1.27,0,.54,0,1.07,0,1.58,0-.05-.11-.1-.22-.18-.33t0,0c-.06-.09-.16-.17-.25-.26-.58,0-1.16,0-1.75,0-.45,0-.9,0-1.35,0Z"/>
                <path className="abc-350" d="M532.1,407c.06.06.14.12.2.18.1.09.21.17.31.26.45,0,.91,0,1.35,0,.58,0,1.17,0,1.75,0-.09-.08-.21-.17-.3-.26-.06-.06-.13-.12-.18-.18-.59,0-1.18,0-1.77,0-.45,0-.9,0-1.35,0Z"/>
                <path className="abc-1" d="M531.73,406.62c.06.07.13.13.19.19.05.06.12.13.18.19.45,0,.89,0,1.35,0,.59,0,1.18,0,1.77,0-.06-.06-.11-.12-.14-.19-.03-.06-.08-.13-.14-.19-.62,0-1.24,0-1.84,0-.46,0-.92,0-1.37,0Z"/>
                <path className="abc-230" d="M531.32,406.18c.07.08.15.16.22.23.06.07.13.13.2.2.45,0,.91,0,1.37,0,.6,0,1.22,0,1.84,0-.06-.07-.13-.13-.19-.2-.07-.08-.16-.15-.23-.23-.63,0-1.25,0-1.86,0-.46,0-.91,0-1.35,0Z"/>
                <path className="abc-431" d="M531.05,405.86s.04.05.06.08c.06.08.13.16.21.24.44,0,.89,0,1.35,0,.6,0,1.22,0,1.86,0-.07-.08-.16-.16-.21-.24-.01-.02-.03-.05-.04-.08-.64,0-1.27,0-1.88,0-.46,0-.91,0-1.35,0Z"/>
                <path className="abc-431" d="M530.87,405.55c.04.08.08.15.13.24.02.03.04.05.05.08.43,0,.88,0,1.35,0,.61,0,1.23,0,1.88,0-.01-.03-.02-.05-.03-.08-.03-.09-.04-.17-.05-.25-.66,0-1.3.01-1.93.01-.48,0-.94,0-1.39,0Z"/>
                <path className="abc-294" d="M530.67,405.12c.03.06.05.12.08.19.04.09.08.16.12.25.45,0,.91,0,1.39,0,.63,0,1.27,0,1.93-.01-.01-.08-.02-.17-.03-.26,0-.07,0-.13,0-.19-.69.02-1.36.03-2.02.04-.5,0-1,0-1.47-.01Z"/>
                <path className="abc-124" d="M530.48,404.59c.03.11.06.24.1.33.03.07.05.13.08.19.48.01.97.02,1.47.01.66,0,1.33-.03,2.02-.04,0-.06,0-.13,0-.2-.01-.09-.01-.2-.02-.3-.71,0-1.41.02-2.09.02-.52,0-1.04,0-1.54-.01Z"/>
                <path className="abc-124" d="M530.24,403.77c.04.16.07.31.14.47.04.1.07.23.1.34.5.01,1.02.01,1.54.01.68,0,1.38-.01,2.09-.02-.01-.11-.02-.21-.05-.31-.04-.15-.04-.31-.05-.47-.72,0-1.45,0-2.16,0-.55,0-1.09,0-1.62-.02Z"/>
                <path className="abc-39" d="M530.09,403.08c.01.07.02.13.04.2.04.18.07.34.11.5.53,0,1.07.01,1.62.02.72,0,1.44,0,2.16,0,0-.16,0-.32,0-.49,0-.06,0-.12,0-.19-.74,0-1.49,0-2.23-.01-.57,0-1.13-.02-1.69-.03Z"/>
                <path className="abc-31" d="M530.02,402.62c.01.08.02.17.04.25.01.07.02.14.03.2.56.01,1.13.02,1.69.03.74,0,1.49.01,2.23.01,0-.06,0-.13,0-.19,0-.08,0-.15-.01-.23-.75-.01-1.5-.03-2.24-.04-.57-.01-1.15-.02-1.73-.03Z"/>
                <path className="abc-237" d="M529.98,402.37c.02.08.03.17.04.25.58.01,1.16.02,1.73.03.75.01,1.5.03,2.24.04,0-.08-.02-.16-.03-.23-.75-.02-1.5-.03-2.25-.05-.58-.01-1.16-.03-1.74-.04Z"/>
                <path className="abc-261" d="M533.76,411.14c.09.16.16.33.23.48.79,0,1.57,0,2.35,0,.09,0,.18,0,.27,0-.08-.16-.14-.33-.23-.49-.12,0-.24,0-.37-.01-.74,0-1.5,0-2.26.02Z"/>
                <path className="abc-23" d="M533.01,410.06c.17.19.32.39.45.59.11.16.2.33.29.49.76,0,1.52-.01,2.26-.02.13,0,.25,0,.37.01-.08-.17-.17-.34-.29-.5-.14-.21-.29-.41-.47-.6-.21-.01-.43-.02-.66-.03-.63.01-1.29.03-1.95.05Z"/>
                <path className="abc-302" d="M531.79,408.95c.21.19.43.37.65.56.22.17.41.36.58.55.66-.02,1.32-.04,1.95-.05.22,0,.44.02.66.03-.18-.2-.38-.38-.63-.55-.24-.17-.46-.35-.69-.54-.33,0-.67,0-1.02-.01-.49.01-.99.01-1.5.02Z"/>
                <path className="abc-240" d="M530.83,408.03c.11.11.22.22.33.33.2.2.41.39.63.58.51,0,1.01,0,1.5-.02.35,0,.69,0,1.02.01-.23-.19-.44-.38-.66-.57-.12-.11-.24-.22-.35-.34-.43,0-.87,0-1.32,0-.37,0-.75,0-1.14,0Z"/>
                <path className="abc-203" d="M530.28,407.42c.07.09.15.18.22.27.11.12.22.23.32.35.39,0,.77,0,1.14,0,.44,0,.88,0,1.32,0-.12-.11-.24-.23-.37-.34-.1-.09-.21-.17-.31-.25-.45,0-.91,0-1.37,0-.32,0-.64,0-.96-.01Z"/>
                <path className="abc-334" d="M529.91,406.96c.05.06.1.12.15.18.07.09.15.18.23.27.32,0,.64.01.96.01.46,0,.91,0,1.37,0-.1-.08-.21-.17-.31-.26-.06-.06-.14-.12-.2-.18-.45,0-.89,0-1.32,0-.29,0-.58-.01-.86-.03Z"/>
                <path className="abc-201" d="M529.64,406.58c.04.07.09.13.13.2.04.06.09.13.14.19.28.02.57.03.86.03.44,0,.88,0,1.32,0-.06-.06-.13-.12-.18-.19-.05-.06-.12-.13-.19-.19-.45,0-.89,0-1.31,0-.27,0-.53-.02-.78-.03Z"/>
                <path className="abc-434" d="M529.35,406.15c.05.08.1.16.16.23.05.07.09.13.14.2.25.02.51.03.78.03.42,0,.86,0,1.31,0-.06-.07-.14-.13-.2-.2-.07-.08-.15-.16-.22-.23-.44,0-.86,0-1.26,0-.24,0-.48-.01-.7-.03Z"/>
                <path className="abc-424" d="M529.16,405.84s.03.05.04.07c.05.08.1.16.15.24.23.01.46.02.7.03.41,0,.83,0,1.26,0-.07-.08-.15-.16-.21-.24-.02-.03-.04-.05-.06-.08-.43,0-.85,0-1.24-.01-.22,0-.44,0-.65-.01Z"/>
                <path className="abc-440" d="M528.97,405.43c.05.11.1.22.14.33.01.02.03.05.04.07.21,0,.43.01.65.01.39,0,.81,0,1.24.01-.02-.03-.04-.05-.05-.08-.05-.09-.09-.15-.13-.24-.45,0-.88-.02-1.29-.04-.22,0-.42-.04-.61-.07Z"/>
                <path className="abc-357" d="M528.71,404.89c.04.07.07.15.11.22.05.11.1.21.15.32.19.03.39.06.61.07.41.02.85.03,1.29.04-.04-.08-.08-.15-.12-.25-.03-.07-.06-.12-.08-.19-.48-.01-.94-.04-1.38-.09-.21-.02-.39-.07-.57-.13Z"/>
                <path className="abc-219" d="M528.44,404.38c.06.1.11.2.16.3.04.07.07.14.11.22.18.06.36.11.57.13.44.05.91.07,1.38.09-.03-.06-.05-.12-.08-.19-.04-.09-.07-.22-.1-.33-.5-.01-.99-.03-1.47-.06-.21-.04-.4-.09-.57-.15Z"/>
                <path className="abc-14" d="M527.99,403.61c.1.16.19.31.28.46.06.1.12.2.17.3.18.06.36.11.57.15.47.03.96.05,1.47.06-.03-.11-.06-.24-.1-.34-.06-.16-.1-.31-.14-.47-.53,0-1.06-.02-1.57-.04-.26-.03-.47-.08-.68-.12Z"/>
                <path className="abc-370" d="M527.59,402.95c.04.06.07.12.11.18.1.17.19.33.29.49.21.04.43.09.68.12.51.02,1.04.03,1.57.04-.04-.16-.06-.32-.11-.5-.02-.06-.03-.13-.04-.2-.56-.01-1.12-.03-1.67-.06-.31-.01-.57-.04-.84-.08Z"/>
                <path className="abc-367" d="M527.34,402.54c.05.07.09.15.13.22.04.06.07.12.11.18.26.03.53.06.84.08.55.02,1.11.04,1.67.06-.01-.07-.02-.14-.03-.2-.01-.08-.02-.17-.04-.25-.58-.01-1.15-.02-1.72-.04-.33,0-.65-.03-.96-.04Z"/>
                <path className="abc-426" d="M527.21,402.31c.05.07.09.15.14.22.31.02.63.03.96.04.57.02,1.14.03,1.72.04-.01-.08-.03-.17-.04-.25-.58-.01-1.16-.03-1.74-.04-.35,0-.69-.01-1.03-.02Z"/>
                <path className="abc-284" d="M529.28,411.18c.02.15.03.3.05.45.76,0,1.53,0,2.31,0,.78,0,1.57,0,2.35,0-.07-.16-.15-.32-.23-.48-.76,0-1.52.01-2.26.02-.74,0-1.48.01-2.22.02Z"/>
                <path className="abc-100" d="M529.1,410.17c.05.19.08.38.11.56.03.15.05.3.07.45.73,0,1.48-.02,2.22-.02.74,0,1.5-.01,2.26-.02-.09-.16-.18-.33-.29-.49-.13-.2-.28-.4-.45-.59-.66.02-1.33.04-1.97.05-.64.01-1.3.03-1.95.06Z"/>
                <path className="abc-141" d="M528.77,408.99c.06.21.11.42.17.62.06.18.11.37.16.55.65-.02,1.31-.04,1.95-.06.64-.01,1.31-.03,1.97-.05-.17-.19-.36-.38-.58-.55-.22-.18-.44-.37-.65-.56-.51,0-1.02,0-1.52.02-.5.01-1,.02-1.5.02Z"/>
                <path className="abc-158" d="M528.51,408.03c.03.11.06.22.09.33.06.21.11.42.17.63.5,0,1-.01,1.5-.02.5-.01,1.01-.02,1.52-.02-.21-.19-.42-.38-.63-.58-.11-.11-.22-.22-.33-.33-.39,0-.77,0-1.15,0-.38,0-.77,0-1.17,0Z"/>
                <path className="abc-166" d="M528.35,407.39c.02.1.05.2.07.31.03.11.06.22.09.34.39,0,.78,0,1.17,0,.38,0,.77,0,1.15,0-.11-.11-.22-.23-.32-.35-.07-.09-.15-.18-.22-.27-.32,0-.64-.02-.96-.02-.32,0-.65-.01-.98-.02Z"/>
                <path className="abc-426" d="M528.22,406.89c.02.06.03.13.05.19.03.1.05.2.08.3.33,0,.65.01.98.02.32,0,.64.01.96.02-.07-.09-.15-.18-.23-.27-.05-.06-.1-.12-.15-.18-.28-.02-.57-.03-.85-.04-.17,0-.33-.01-.5-.02-.11,0-.23,0-.34-.01Z"/>
                <path className="abc-335" d="M528.14,406.5c.02.07.03.13.05.2.02.06.02.13.04.19.11,0,.23,0,.34.01.17,0,.34.01.5.02.28.01.56.03.85.04-.05-.06-.09-.12-.14-.19-.04-.06-.09-.13-.13-.2-.25-.02-.5-.04-.75-.05-.15,0-.3-.01-.45-.02-.1,0-.2,0-.3-.01Z"/>
                <path className="abc-408" d="M528.02,406.09c.02.07.04.14.06.22.02.07.04.13.05.2.1,0,.2.01.3.01.15,0,.3.01.45.02.25.01.5.03.75.05-.04-.07-.09-.13-.14-.2-.05-.08-.11-.15-.16-.23-.23-.01-.45-.03-.66-.03-.22,0-.44-.02-.66-.03Z"/>
                <path className="abc-377" d="M527.96,405.81s0,.04,0,.07c.02.07.04.14.06.21.22,0,.44.02.66.03.21,0,.44.02.66.03-.05-.08-.1-.16-.15-.24-.01-.02-.03-.05-.04-.07-.21,0-.42-.01-.61-.02-.12,0-.23,0-.35,0-.08,0-.16,0-.24,0Z"/>
                <path className="abc-73" d="M527.86,405.28c.03.14.06.3.09.46,0,.02,0,.04,0,.07.08,0,.16,0,.24,0,.11,0,.23,0,.35,0,.19,0,.4,0,.61.02-.01-.02-.03-.05-.04-.07-.05-.11-.1-.22-.14-.33-.19-.03-.37-.07-.56-.09-.11-.01-.22-.03-.32-.04-.07,0-.15-.02-.23-.03Z"/>
                <path className="abc-253" d="M527.66,404.6c.03.08.07.18.1.27.04.13.08.27.11.41.08.01.15.02.23.03.11.01.21.03.32.04.18.02.37.05.56.09-.05-.11-.1-.21-.15-.32-.04-.08-.07-.15-.11-.22-.18-.06-.34-.12-.52-.16-.16-.04-.35-.09-.54-.14Z"/>
                <path className="abc-191" d="M527.38,404.05c.07.1.12.2.17.31.03.07.08.16.11.24.19.05.38.11.54.14.17.04.34.1.52.16-.04-.07-.07-.14-.11-.22-.05-.1-.11-.2-.16-.3-.18-.06-.34-.12-.52-.16-.1-.03-.21-.06-.33-.1-.07-.02-.15-.04-.22-.07Z"/>
                <path className="abc-442" d="M526.69,403.36c.16.14.33.28.46.42.09.09.16.17.23.27.07.02.14.04.22.07.12.03.23.07.33.1.18.05.34.11.52.16-.06-.1-.11-.2-.17-.3-.09-.15-.18-.3-.28-.46-.21-.04-.41-.09-.64-.13-.14-.02-.26-.05-.4-.08-.09-.02-.17-.03-.25-.05Z"/>
                <path className="abc-90" d="M525.94,402.77c.07.05.14.1.21.15.19.14.38.29.54.43.08.02.17.03.25.05.14.03.26.06.4.08.23.04.43.08.64.13-.1-.16-.19-.32-.29-.49-.04-.06-.07-.12-.11-.18-.26-.03-.53-.07-.82-.09-.28-.03-.56-.06-.84-.08Z"/>
                <path className="abc-19" d="M525.44,402.45c.09.06.19.12.28.18.08.05.15.1.22.15.28.03.56.06.84.08.29.02.55.05.82.09-.04-.06-.07-.12-.11-.18-.05-.07-.09-.15-.13-.22-.31-.02-.62-.04-.95-.05-.32-.01-.64-.03-.96-.04Z"/>
                <path className="abc-402" d="M525.15,402.27c.1.06.19.12.29.18.32.01.64.03.96.04.32.01.64.03.95.05-.05-.07-.09-.15-.14-.22-.34,0-.69-.01-1.03-.02-.34,0-.68-.01-1.02-.02Z"/>
                <path className="abc-169" d="M526.28,411.21c0,.14-.02.29-.03.43.28,0,.57,0,.86,0,.72,0,1.46,0,2.22,0-.02-.15-.03-.3-.05-.45-.73,0-1.45.02-2.13.03-.29,0-.58,0-.86,0Z"/>
                <path className="abc-128" d="M526.34,410.23c-.01.18-.02.37-.03.55,0,.15-.02.29-.03.44.28,0,.57,0,.86,0,.68,0,1.4-.02,2.13-.03-.02-.15-.04-.3-.07-.45-.03-.19-.07-.38-.11-.56-.65.02-1.28.04-1.88.06-.29,0-.59,0-.88,0Z"/>
                <path className="abc-316" d="M526.41,409.02c0,.22-.02.44-.04.66-.01.18-.02.37-.03.55.29,0,.58,0,.88,0,.6-.01,1.23-.04,1.88-.06-.05-.19-.1-.37-.16-.55-.06-.21-.11-.41-.17-.62-.5,0-.99.01-1.47.03-.3,0-.59,0-.88,0Z"/>
                <path className="abc-180" d="M526.44,408.03c0,.11,0,.22,0,.34,0,.21-.01.43-.02.65.29,0,.59,0,.88,0,.48-.01.97-.02,1.47-.03-.06-.21-.11-.42-.17-.63-.03-.11-.06-.22-.09-.33-.39,0-.78,0-1.17,0-.3,0-.61,0-.91,0Z"/>
                <path className="abc-166" d="M526.5,407.38c-.03.11-.06.21-.06.32,0,.11,0,.22,0,.33.3,0,.61,0,.91,0,.38,0,.77,0,1.17,0-.03-.11-.06-.22-.09-.34-.02-.1-.04-.21-.07-.31-.33,0-.66,0-.98,0-.29,0-.58,0-.87,0Z"/>
                <path className="abc-346" d="M526.59,406.87c-.01.07-.03.14-.03.2,0,.1-.04.21-.06.31.29,0,.58,0,.87,0,.33,0,.65,0,.98,0-.02-.1-.05-.2-.08-.3-.02-.06-.03-.13-.05-.19-.28-.01-.56-.03-.85-.03-.26,0-.51,0-.78,0Z"/>
                <path className="abc-65" d="M526.65,406.46c-.01.07-.03.14-.03.2,0,.07-.01.13-.03.2.26,0,.52,0,.78,0,.29,0,.57.02.85.03-.02-.06-.02-.13-.04-.19-.01-.07-.03-.13-.05-.2-.25-.01-.5-.03-.77-.03-.23,0-.47,0-.72,0Z"/>
                <path className="abc-408" d="M526.72,406.06c-.02.07-.04.14-.04.21,0,.06-.02.13-.03.2.25,0,.49,0,.72,0,.26,0,.52.02.77.03-.02-.07-.04-.13-.05-.2-.02-.07-.04-.15-.06-.22-.22,0-.44-.02-.66-.02-.2,0-.42,0-.64,0Z"/>
                <path className="abc-433" d="M526.76,405.79s0,.04,0,.06c0,.07-.02.13-.03.2.22,0,.43,0,.64,0,.22,0,.44.01.66.02-.02-.07-.04-.14-.06-.21,0-.02,0-.04,0-.07-.2,0-.4,0-.61-.01-.19,0-.38,0-.59,0Z"/>
                <path className="abc-392" d="M526.69,405.2c.03.17.06.35.07.53,0,.02,0,.04,0,.06.21,0,.4,0,.59,0,.21,0,.42,0,.61.01,0-.02,0-.04,0-.07-.02-.16-.06-.32-.09-.46-.18-.02-.37-.05-.57-.07-.19,0-.39-.01-.6-.01Z"/>
                <path className="abc-90" d="M526.48,404.43c.03.09.07.19.1.29.04.15.08.31.11.47.21,0,.41,0,.6.01.2.02.39.04.57.07-.03-.14-.07-.29-.11-.41-.03-.09-.07-.19-.1-.27-.19-.05-.37-.1-.51-.12-.21-.02-.43-.03-.66-.04Z"/>
                <path className="abc-358" d="M526.17,403.89c.09.09.16.18.22.3.03.07.07.16.1.25.23,0,.45.02.66.04.15.02.33.07.51.12-.03-.08-.08-.17-.11-.24-.05-.11-.1-.21-.17-.31-.18-.06-.36-.12-.52-.15-.22,0-.45-.01-.69-.01Z"/>
                <path className="abc-269" d="M525.31,403.23c.21.14.41.29.56.41.11.09.21.16.3.25.24,0,.46,0,.69.01.16.03.34.09.52.15-.07-.1-.14-.18-.23-.27-.13-.14-.3-.28-.46-.42-.21-.04-.42-.09-.66-.12-.23,0-.47,0-.72,0Z"/>
                <path className="abc-318" d="M524.35,402.68c.09.05.18.09.27.14.24.13.48.28.69.42.24,0,.48,0,.72,0,.24.03.44.08.66.12-.16-.14-.35-.29-.54-.43-.07-.05-.14-.1-.21-.15-.28-.03-.56-.05-.84-.07-.25-.01-.49-.02-.75-.03Z"/>
                <path className="abc-78" d="M523.72,402.39c.12.05.24.1.35.15.1.04.19.09.28.13.25,0,.5.02.75.03.28.01.56.04.84.07-.07-.05-.15-.1-.22-.15-.09-.06-.18-.12-.28-.18-.32-.01-.64-.03-.95-.04-.25,0-.51-.01-.76-.02Z"/>
                <path className="abc-227" d="M523.37,402.23c.11.05.23.1.35.16.26,0,.51.01.76.02.32,0,.63.02.95.04-.09-.06-.19-.12-.29-.18-.34,0-.68-.01-1.02-.02-.26,0-.51-.01-.76-.02Z"/>
                <path className="abc-197" d="M522.73,411.24c0,.15,0,.29-.01.43.9-.01,1.8-.03,2.7-.03.27,0,.55,0,.84,0,0-.14.02-.28.03-.43-.28,0-.56,0-.84,0-.91,0-1.81.01-2.71.03Z"/>
                <path className="abc-438" d="M522.67,410.26c.01.18.03.37.04.55.01.15.02.29.02.44.9-.01,1.8-.02,2.71-.03.28,0,.56,0,.84,0,0-.14.02-.29.03-.44,0-.18.02-.36.03-.55-.29,0-.58,0-.86,0-.93,0-1.87.01-2.81.02Z"/>
                <path className="abc-430" d="M522.63,409.05c.02.22.04.43.04.65,0,.19,0,.37.01.55.94-.01,1.87-.02,2.81-.02.28,0,.57,0,.86,0,.01-.18.02-.37.03-.55.01-.22.03-.44.04-.66-.29,0-.59,0-.88,0-.97,0-1.94.01-2.91.02Z"/>
                <path className="abc-128" d="M522.5,408.06c.01.11.04.23.05.34.03.22.06.43.08.65.97,0,1.93-.02,2.91-.02.29,0,.59,0,.88,0,0-.22.02-.43.02-.65,0-.11,0-.23,0-.34-.3,0-.61,0-.91,0-1.01,0-2.02.01-3.03.02Z"/>
                <path className="abc-166" d="M522.61,407.41c-.06.1-.15.21-.16.32,0,.11.03.22.04.34,1.01,0,2.02-.02,3.03-.02.3,0,.61,0,.91,0,0-.11,0-.22,0-.33,0-.11.03-.21.06-.32-.29,0-.59,0-.88,0-.98,0-1.99.01-3,.02Z"/>
                <path className="abc-342" d="M522.96,406.89c-.03.07-.09.14-.13.2-.05.1-.16.21-.23.31,1.01,0,2.03-.02,3-.02.29,0,.59,0,.88,0,.03-.11.06-.21.06-.31,0-.07.02-.14.03-.2-.26,0-.53,0-.81,0-.91,0-1.86.01-2.82.02Z"/>
                <path className="abc-260" d="M523.12,406.49c-.03.07-.08.14-.08.2,0,.06-.04.13-.08.2.97-.01,1.91-.02,2.82-.02.27,0,.54,0,.81,0,.01-.07.03-.13.03-.2,0-.07.02-.14.03-.2-.25,0-.5,0-.76,0-.86,0-1.8.01-2.77.03Z"/>
                <path className="abc-146" d="M523.42,406.08c-.05.07-.13.14-.17.21-.03.06-.1.13-.13.2.97-.01,1.91-.03,2.77-.03.26,0,.51,0,.76,0,.01-.07.03-.14.03-.2,0-.07.02-.14.04-.21-.22,0-.45,0-.69,0-.79,0-1.67,0-2.61.02Z"/>
                <path className="abc-66" d="M523.58,405.8s-.01.04-.02.06c-.02.07-.09.14-.14.21.94-.01,1.82-.02,2.61-.02.24,0,.47,0,.69,0,.02-.07.03-.13.03-.2,0-.02,0-.04,0-.06-.21,0-.42,0-.65,0-.75,0-1.61,0-2.53.01Z"/>
                <path className="abc-112" d="M523.48,405.25c.04.16.1.32.11.49,0,.02,0,.04,0,.06.92,0,1.78-.01,2.53-.01.23,0,.44,0,.65,0,0-.02,0-.04,0-.06-.01-.18-.04-.36-.07-.53-.21,0-.43,0-.66,0-.77,0-1.63.02-2.55.05Z"/>
                <path className="abc-284" d="M523.15,404.52c.04.09.1.19.14.28.06.14.14.29.19.45.92-.03,1.78-.05,2.55-.05.23,0,.45,0,.66,0-.03-.17-.07-.33-.11-.47-.03-.1-.06-.2-.1-.29-.23,0-.47-.01-.71-.01-.81,0-1.69.05-2.63.1Z"/>
                <path className="abc-333" d="M522.82,403.96c.08.09.16.18.2.31.03.08.08.16.13.25.93-.05,1.82-.1,2.63-.1.24,0,.48,0,.71.01-.03-.09-.07-.17-.1-.25-.05-.12-.13-.21-.22-.3-.24,0-.48,0-.72,0-.82,0-1.7.04-2.62.07Z"/>
                <path className="abc-50" d="M521.98,403.26c.2.15.42.31.54.45.1.09.22.16.3.26.92-.03,1.8-.07,2.62-.07.25,0,.49,0,.72,0-.09-.09-.19-.16-.3-.25-.15-.13-.34-.27-.56-.41-.24,0-.49,0-.74,0-.84,0-1.7.01-2.59.03Z"/>
                <path className="abc-353" d="M521.01,402.66c.09.05.18.1.26.15.23.14.51.3.71.45.88-.01,1.75-.03,2.59-.03.25,0,.5,0,.74,0-.21-.14-.45-.29-.69-.42-.09-.05-.18-.09-.27-.14-.25,0-.5-.01-.76-.02-.85-.01-1.72,0-2.58,0Z"/>
                <path className="abc-147" d="M520.43,402.34c.1.06.21.11.31.17.09.05.18.1.27.15.87,0,1.74-.02,2.58,0,.25,0,.51.01.76.02-.09-.05-.19-.09-.28-.13-.11-.05-.23-.1-.35-.15-.26,0-.51,0-.77-.01-.84-.02-1.69-.02-2.52-.03Z"/>
                <path className="abc-254" d="M520.15,402.17c.08.06.19.12.29.17.83,0,1.68.02,2.52.03.25,0,.51,0,.77.01-.12-.05-.23-.1-.35-.16-.25,0-.51-.01-.76-.02-.84-.02-1.66-.03-2.47-.05Z"/>
                <path className="abc-385" d="M516.18,411.4c0,.15.03.3.02.45,1.3-.05,2.59-.09,3.82-.12.9-.02,1.8-.04,2.7-.06.01-.14.02-.29.01-.43-.9.01-1.8.03-2.71.05-1.24.03-2.54.07-3.84.11Z"/>
                <path className="abc-277" d="M516.06,410.38c.01.19.06.38.08.57.01.15.04.3.05.45,1.3-.04,2.6-.08,3.84-.11.91-.02,1.81-.04,2.71-.05,0-.15-.01-.29-.02-.44-.01-.18-.03-.36-.04-.55-.94.01-1.87.02-2.81.04-1.26.02-2.54.05-3.81.08Z"/>
                <path className="abc-100" d="M515.92,409.15c.02.22.08.45.08.67,0,.19.04.38.05.57,1.27-.03,2.55-.06,3.81-.08.93-.02,1.87-.03,2.81-.04-.01-.18-.02-.37-.01-.55,0-.22-.01-.44-.04-.65-.97,0-1.93.02-2.91.03-1.27.02-2.55.04-3.8.06Z"/>
                <path className="abc-184" d="M515.77,408.13c0,.12.03.23.05.35.03.22.09.44.11.67,1.24-.02,2.52-.05,3.8-.06.97-.01,1.94-.02,2.91-.03-.02-.22-.05-.43-.08-.65-.01-.11-.04-.23-.05-.34-1.01,0-2.01.02-3,.03-1.28.01-2.53.03-3.73.04Z"/>
                <path className="abc-158" d="M515.83,407.48c-.04.1-.09.2-.09.29,0,.12.02.23.03.35,1.2-.01,2.45-.03,3.73-.04.99,0,1.99-.02,3-.03-.01-.11-.04-.22-.04-.34,0-.1.09-.21.16-.32-1.01,0-2.03.02-3.03.03-1.29.01-2.55.03-3.76.04Z"/>
                <path className="abc-291" d="M516.07,406.99c-.02.06-.06.13-.09.19-.04.1-.12.2-.16.3,1.21-.01,2.47-.03,3.76-.04.99-.01,2.01-.02,3.03-.03.06-.1.18-.21.23-.31.03-.07.09-.14.13-.2-.97.01-1.96.02-2.97.04-1.31.02-2.64.04-3.93.06Z"/>
                <path className="abc-385" d="M516.16,406.6c-.02.06-.05.13-.05.2,0,.06-.03.13-.04.19,1.29-.02,2.62-.04,3.93-.06,1.01-.01,2-.03,2.97-.04.03-.07.08-.13.08-.2,0-.07.05-.14.08-.2-.97.01-1.99.03-3,.05-1.32.02-2.65.04-3.96.07Z"/>
                <path className="abc-154" d="M516.37,406.19c-.03.07-.09.15-.12.22-.03.06-.07.13-.09.2,1.31-.02,2.64-.05,3.96-.07,1.02-.02,2.03-.03,3-.05.03-.07.1-.14.13-.2.04-.07.12-.14.17-.21-.94.01-1.93.03-2.96.04-1.33.02-2.72.04-4.09.07Z"/>
                <path className="abc-347" d="M516.48,405.9s0,.04-.01.07c-.02.07-.06.15-.09.22,1.37-.03,2.76-.05,4.09-.07,1.03-.01,2.02-.03,2.96-.04.05-.07.12-.14.14-.21,0-.02.01-.04.02-.06-.92,0-1.92.02-2.95.03-1.34.02-2.75.04-4.15.07Z"/>
                <path className="abc-347" d="M516.43,405.43c.02.13.06.27.06.4,0,.02,0,.04,0,.07,1.4-.02,2.81-.05,4.15-.07,1.03-.01,2.02-.03,2.95-.03,0-.02,0-.04,0-.06,0-.17-.07-.33-.11-.49-.92.03-1.91.06-2.93.08-1.33.02-2.73.06-4.12.1Z"/>
                <path className="abc-439" d="M516.24,404.78c.02.09.05.18.08.26.03.13.08.26.1.39,1.39-.04,2.8-.08,4.12-.1,1.02-.02,2.01-.05,2.93-.08-.04-.16-.13-.31-.19-.45-.04-.1-.1-.2-.14-.28-.93.05-1.92.11-2.92.14-1.3.03-2.65.08-3.99.12Z"/>
                <path className="abc-406" d="M516.09,404.18c.03.11.07.23.09.35.02.08.04.17.06.25,1.33-.05,2.68-.09,3.99-.12,1-.02,1.98-.08,2.92-.14-.04-.09-.09-.17-.13-.25-.04-.12-.12-.22-.2-.31-.92.03-1.88.07-2.85.1-1.27.03-2.58.07-3.87.12Z"/>
                <path className="abc-380" d="M515.73,403.35c.09.17.18.33.22.5.05.1.11.21.14.32,1.29-.05,2.6-.09,3.87-.12.98-.02,1.93-.06,2.85-.1-.08-.09-.19-.17-.3-.26-.11-.14-.34-.3-.54-.45-.88.01-1.78.03-2.68.04-1.17.01-2.39.03-3.57.05Z"/>
                <path className="abc-380" d="M515.28,402.67c.04.06.08.12.12.18.11.17.24.33.33.5,1.18-.02,2.4-.04,3.57-.05.9,0,1.8-.03,2.68-.04-.2-.15-.48-.31-.71-.45-.08-.05-.18-.1-.26-.15-.87,0-1.73.02-2.56.02-1.08,0-2.15,0-3.17,0Z"/>
                <path className="abc-380" d="M515.04,402.28c.04.07.09.14.13.21.04.06.08.12.12.18,1.03,0,2.1,0,3.17,0,.83,0,1.69,0,2.56-.02-.09-.05-.18-.1-.27-.15-.1-.06-.22-.11-.31-.17-.83,0-1.66-.01-2.44-.03-1.02-.01-2.01-.03-2.95-.04Z"/>
                <path className="abc-33" d="M514.93,402.06c.03.07.07.14.11.21.94.01,1.93.02,2.95.04.79.01,1.61.02,2.44.03-.1-.06-.2-.11-.29-.17-.81-.02-1.59-.03-2.36-.05-1-.02-1.95-.04-2.86-.06Z"/>
                <path className="abc-255" d="M510.58,411.6c0,.16.02.32.02.47.57-.02,1.16-.05,1.77-.07,1.25-.05,2.55-.1,3.84-.15,0-.15-.01-.3-.02-.45-1.3.04-2.59.09-3.82.13-.61.02-1.21.05-1.78.07Z"/>
                <path className="abc-113" d="M510.51,410.54c0,.2.03.39.04.59,0,.16.02.32.03.47.57-.02,1.17-.05,1.78-.07,1.23-.05,2.52-.09,3.82-.13,0-.15-.04-.3-.05-.45-.02-.19-.06-.38-.08-.57-1.27.03-2.51.07-3.7.1-.64.02-1.26.04-1.85.05Z"/>
                <path className="abc-436" d="M510.45,409.26c.01.23.03.46.03.7,0,.2.02.39.03.59.59-.02,1.22-.04,1.85-.05,1.18-.04,2.43-.07,3.7-.1-.01-.19-.05-.38-.05-.57,0-.23-.06-.45-.08-.67-1.24.02-2.44.05-3.56.07-.67.01-1.31.03-1.91.04Z"/>
                <path className="abc-250" d="M510.38,408.19c0,.12.01.24.02.37.01.23.04.46.05.7.6-.01,1.24-.03,1.91-.04,1.12-.02,2.32-.05,3.56-.07-.02-.22-.09-.44-.11-.67-.01-.12-.04-.23-.05-.35-1.2.01-2.34.03-3.41.04-.7,0-1.36.02-1.98.02Z"/>
                <path className="abc-61" d="M510.39,407.55c0,.09-.02.19-.02.28,0,.12,0,.24.01.37.62,0,1.29-.02,1.98-.02,1.07-.01,2.21-.03,3.41-.04,0-.12-.03-.23-.03-.35,0-.1.05-.2.09-.29-1.21.01-2.37.03-3.47.04-.69,0-1.35.02-1.97.02Z"/>
                <path className="abc-75" d="M510.44,407.08c0,.06-.01.12-.02.19,0,.09-.03.19-.03.28.62,0,1.28-.01,1.97-.02,1.1-.01,2.26-.03,3.47-.04.04-.1.11-.2.16-.3.03-.07.07-.13.09-.19-1.29.02-2.55.04-3.71.06-.67,0-1.32.02-1.92.03Z"/>
                <path className="abc-173" d="M510.46,406.7c0,.06-.01.13-.01.19s0,.12-.01.19c.61,0,1.25-.02,1.92-.03,1.16-.02,2.42-.04,3.71-.06.02-.06.04-.13.04-.19,0-.06.03-.13.05-.2-1.31.02-2.58.05-3.8.07-.66.01-1.3.02-1.9.03Z"/>
                <path className="abc-114" d="M510.5,406.3c0,.07-.02.14-.02.21,0,.06-.02.13-.02.19.6,0,1.24-.02,1.9-.03,1.22-.02,2.5-.04,3.8-.07.02-.06.06-.13.09-.2.03-.07.09-.15.12-.22-1.37.03-2.73.05-4.01.07-.64.01-1.26.02-1.86.03Z"/>
                <path className="abc-9" d="M510.53,406.02s0,.04,0,.07c0,.07-.02.14-.02.21.59-.01,1.21-.02,1.86-.03,1.28-.02,2.64-.05,4.01-.07.03-.07.08-.15.09-.22,0-.02.01-.04.01-.07-1.4.02-2.8.05-4.12.08-.63.01-1.24.02-1.83.04Z"/>
                <path className="abc-9" d="M510.48,405.58c.01.12.05.25.05.37,0,.02,0,.04,0,.07.59-.01,1.2-.02,1.83-.04,1.32-.03,2.72-.05,4.12-.08,0-.02,0-.04,0-.07,0-.14-.03-.27-.06-.4-1.39.04-2.78.08-4.07.12-.66,0-1.29.02-1.88.03Z"/>
                <path className="abc-169" d="M510.33,404.94c.02.09.05.18.07.27.02.12.07.25.08.37.59-.01,1.21-.02,1.88-.03,1.29-.03,2.67-.08,4.07-.12-.02-.13-.07-.26-.1-.39-.02-.09-.06-.18-.08-.26-1.33.05-2.65.1-3.88.14-.72,0-1.4,0-2.03.01Z"/>
                <path className="abc-237" d="M510.2,404.31c.01.12.05.24.07.36.02.09.05.18.07.27.63,0,1.31-.01,2.03-.01,1.23-.04,2.55-.09,3.88-.14-.02-.09-.05-.17-.06-.25-.02-.12-.05-.24-.09-.35-1.29.05-2.56.09-3.73.14-.76,0-1.49,0-2.16,0Z"/>
                <path className="abc-309" d="M510.08,403.4c.03.19.08.37.08.56,0,.12.02.24.04.36.67,0,1.4,0,2.16,0,1.18-.04,2.44-.09,3.73-.14-.03-.11-.09-.22-.14-.32-.04-.17-.13-.33-.22-.5-1.18.02-2.33.04-3.37.07-.83,0-1.6-.01-2.28-.02Z"/>
                <path className="abc-404" d="M509.89,402.64c.01.07.03.13.05.2.04.19.11.37.14.56.69,0,1.45,0,2.28.02,1.04-.03,2.19-.05,3.37-.07-.09-.17-.22-.33-.33-.5-.04-.06-.08-.12-.12-.18-1.03,0-2.01,0-2.92,0-.9-.01-1.72-.02-2.47-.03Z"/>
                <path className="abc-404" d="M509.81,402.21c0,.08.03.16.04.24,0,.07.03.13.04.2.74,0,1.57.02,2.47.03.91,0,1.9,0,2.92,0-.04-.06-.08-.12-.12-.18-.04-.07-.09-.14-.13-.21-.94-.01-1.84-.02-2.68-.03-.93-.02-1.79-.03-2.55-.04Z"/>
                <path className="abc-309" d="M509.79,401.97c0,.08.02.16.02.24.76.01,1.62.03,2.55.04.84,0,1.73.02,2.68.03-.04-.07-.08-.14-.11-.21-.91-.02-1.77-.03-2.57-.05-.95-.02-1.81-.03-2.57-.05Z"/>
                <path className="abc-130" d="M507.42,411.73c0,.16.02.32.02.49.47-.02.98-.04,1.5-.07.53-.02,1.08-.05,1.65-.07,0-.16-.01-.32-.02-.47-.57.02-1.13.04-1.66.07-.53.02-1.03.04-1.5.06Z"/>
                <path className="abc-364" d="M507.35,410.64c0,.2.03.4.04.6,0,.16.02.32.03.49.47-.02.97-.04,1.5-.06.53-.02,1.08-.04,1.66-.07,0-.16-.02-.32-.03-.47-.01-.2-.03-.39-.04-.59-.59.02-1.16.04-1.69.05-.53.02-1.02.03-1.47.05Z"/>
                <path className="abc-365" d="M507.29,409.33c.01.24.03.48.03.71,0,.2.02.4.03.6.45-.02.94-.03,1.47-.05.53-.02,1.1-.04,1.69-.05,0-.2-.03-.39-.03-.59,0-.23-.02-.46-.03-.7-.6.01-1.17.03-1.7.04-.53.01-1.02.02-1.46.03Z"/>
                <path className="abc-184" d="M507.22,408.24c0,.13.01.25.02.38.01.24.04.48.05.71.44-.01.93-.02,1.46-.03.53-.01,1.1-.02,1.7-.04-.01-.23-.04-.46-.05-.7,0-.12-.02-.24-.02-.37-.62,0-1.2.02-1.73.02-.53,0-1.01.01-1.43.02Z"/>
                <path className="abc-61" d="M507.23,407.58c0,.09-.02.18-.02.28,0,.13,0,.25.01.38.42,0,.9-.01,1.43-.02.53,0,1.11-.01,1.73-.02,0-.12-.01-.24-.01-.37,0-.09.01-.19.02-.28-.62,0-1.2.01-1.73.02-.53,0-1.01.01-1.43.02Z"/>
                <path className="abc-404" d="M507.27,407.12c0,.06-.01.12-.02.18,0,.09-.02.18-.03.28.42,0,.9-.01,1.43-.02.53,0,1.11-.01,1.73-.02,0-.09.02-.19.03-.28,0-.06.01-.12.02-.19-.61,0-1.18.02-1.71.03-.53,0-1.02.02-1.46.02Z"/>
                <path className="abc-111" d="M507.3,406.75c0,.06-.01.12-.01.19s0,.12-.01.18c.44,0,.93-.01,1.46-.02.53,0,1.1-.02,1.71-.03,0-.06.01-.12.01-.19s0-.13.01-.19c-.6,0-1.18.02-1.71.03-.53,0-1.02.02-1.46.03Z"/>
                <path className="abc-56" d="M507.34,406.36c0,.07-.02.14-.02.21,0,.06-.02.12-.02.19.44,0,.93-.02,1.46-.03.53,0,1.1-.02,1.71-.03,0-.06.01-.13.02-.19,0-.07.02-.14.02-.21-.59.01-1.16.02-1.69.03-.53.01-1.02.02-1.48.03Z"/>
                <path className="abc-225" d="M507.36,406.08s0,.04,0,.06c0,.07-.01.14-.02.21.45,0,.95-.02,1.48-.03.53-.01,1.1-.02,1.69-.03,0-.07.02-.14.02-.21,0-.02,0-.04,0-.07-.59.01-1.15.02-1.68.03-.53.01-1.03.02-1.48.03Z"/>
                <path className="abc-357" d="M507.31,405.63c.01.13.06.26.06.38,0,.02,0,.04,0,.06.46,0,.95-.02,1.48-.03.53-.01,1.09-.02,1.68-.03,0-.02,0-.04,0-.07,0-.12-.03-.25-.05-.37-.59.01-1.15.02-1.68.03s-1.04.02-1.49.03Z"/>
                <path className="abc-169" d="M507.15,404.97c.02.09.05.18.07.27.02.13.07.26.09.38.46,0,.96-.02,1.49-.03s1.09-.02,1.68-.03c-.01-.12-.06-.25-.08-.37-.02-.09-.05-.18-.07-.27-.63,0-1.21.01-1.75.02-.53,0-1.02.01-1.44.02Z"/>
                <path className="abc-93" d="M507.01,404.33c.01.12.05.25.07.37.02.09.05.18.07.27.42,0,.9-.01,1.44-.02.53,0,1.12-.01,1.75-.02-.02-.09-.05-.18-.07-.27-.02-.12-.06-.24-.07-.36-.67,0-1.28,0-1.82,0-.54,0-.99,0-1.37.01Z"/>
                <path className="abc-217" d="M506.87,403.39c.03.19.09.38.09.57,0,.12.03.25.04.37.38,0,.84,0,1.37-.01.54,0,1.15,0,1.82,0-.01-.12-.04-.24-.04-.36,0-.18-.05-.37-.08-.56-.69,0-1.3,0-1.84,0s-1,0-1.36,0Z"/>
                <path className="abc-404" d="M506.68,402.61c.01.07.04.14.05.21.04.19.12.38.14.58.36,0,.83,0,1.36,0s1.15,0,1.84,0c-.03-.19-.1-.37-.14-.56-.01-.07-.04-.13-.05-.2-.74,0-1.39-.02-1.93-.02-.54,0-.97-.01-1.28-.01Z"/>
                <path className="abc-404" d="M506.59,402.15c0,.08.03.16.04.25,0,.07.03.14.04.21.31,0,.74,0,1.28.01.54,0,1.19.01,1.93.02-.01-.07-.03-.13-.04-.2-.01-.08-.03-.16-.04-.24-.76-.01-1.43-.02-1.97-.03-.54,0-.96-.02-1.25-.02Z"/>
                <path className="abc-309" d="M506.56,401.91c0,.08.02.16.03.25.29,0,.71.01,1.25.02.54,0,1.21.02,1.97.03,0-.08-.02-.16-.02-.24-.76-.01-1.42-.03-1.97-.04-.54-.01-.97-.02-1.26-.02Z"/>
                <path className="abc-344" d="M506.12,411.79v.49c.4-.02.84-.04,1.32-.06,0-.16-.01-.32-.02-.49-.47.02-.91.04-1.3.06Z"/>
                <path className="abc-217" d="M506.12,410.69v1.1c.39-.02.83-.04,1.3-.06,0-.16-.02-.32-.03-.49-.01-.2-.03-.4-.04-.6-.45.02-.86.03-1.23.04Z"/>
                <path className="abc-365" d="M506.12,409.36v1.33c.37-.01.78-.03,1.23-.04,0-.2-.03-.4-.03-.6,0-.24-.02-.48-.03-.71-.44.01-.83.02-1.17.03Z"/>
                <path className="abc-184" d="M506.12,408.26v1.1c.33,0,.72-.02,1.17-.03-.01-.24-.04-.48-.05-.71,0-.13-.02-.25-.02-.38-.42,0-.79.01-1.1.02Z"/>
                <path className="abc-61" d="M506.12,407.6v.66c.31,0,.67-.01,1.1-.02,0-.13-.01-.25-.01-.38,0-.09.01-.18.02-.28-.42,0-.79.01-1.1.01Z"/>
                <path className="abc-404" d="M506.12,407.14v.46c.31,0,.68,0,1.1-.01,0-.09.02-.19.03-.28,0-.06.01-.12.02-.18-.44,0-.83.01-1.15.02Z"/>
                <path className="abc-160" d="M506.12,406.77v.37c.33,0,.72-.01,1.15-.02,0-.06.01-.12.01-.18s0-.12.01-.19c-.44,0-.83.02-1.17.02Z"/>
                <path className="abc-404" d="M506.12,406.38v.39c.34,0,.73-.01,1.17-.02,0-.06.01-.12.02-.19,0-.07.02-.14.02-.21-.45,0-.86.02-1.22.02Z"/>
                <path className="abc-415" d="M506.12,406.11v.27c.36,0,.77-.02,1.22-.02,0-.07.02-.14.02-.21,0-.02,0-.04,0-.06-.46,0-.87.02-1.24.03Z"/>
                <path className="abc-456" d="M506.12,405.66v.45c.37,0,.78-.02,1.24-.03,0-.02,0-.04,0-.06,0-.13-.04-.26-.06-.38-.46,0-.86.02-1.19.02Z"/>
                <path className="abc-169" d="M506.12,404.99v.66c.33,0,.73-.02,1.19-.02-.01-.13-.07-.26-.09-.38-.02-.09-.05-.18-.07-.27-.42,0-.77.01-1.03.02Z"/>
                <path className="abc-309" d="M506.12,404.34v.65c.26,0,.61-.01,1.03-.02-.02-.09-.05-.18-.07-.27-.02-.12-.06-.25-.07-.37-.38,0-.67,0-.89.01Z"/>
                <path className="abc-404" d="M506.12,403.39v.95c.21,0,.51,0,.89-.01-.01-.12-.04-.25-.04-.37,0-.19-.06-.38-.09-.57-.36,0-.62,0-.75,0Z"/>
                <path className="abc-404" d="M506.12,402.61v.79c.13,0,.39,0,.75,0-.03-.19-.11-.38-.14-.58-.01-.07-.04-.14-.05-.21-.31,0-.5,0-.56,0Z"/>
                <path className="abc-56" d="M506.12,402.15v.46c.06,0,.25,0,.56,0-.01-.07-.04-.14-.04-.21-.01-.08-.04-.16-.04-.25-.29,0-.45,0-.47,0Z"/>
                <path className="abc-93" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
              </g>
              <g>
                <path className="abc-52" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
              </g>
              <g>
                <path className="abc-52" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
              </g>
            </g>
            <g id="MeshGrid-4" data-name="MeshGrid">
              <g>
                <path className="abc-427" d="M506.86,874.66c-.02.3-.14.6-.16.88-.38-.01-.58-.03-.58-.03v-.97c.1,0,.35.06.74.12Z"/>
                <path className="abc-390" d="M507.14,873c-.02.25-.1.49-.12.73-.03.32-.14.63-.17.93-.39-.06-.64-.12-.74-.12v-1.7c.25,0,.59.09,1.02.16Z"/>
                <path className="abc-119" d="M507.35,871.67c-.02.2-.07.39-.09.58-.02.25-.1.5-.12.75-.43-.08-.77-.16-1.02-.16v-1.28c.36,0,.76.06,1.23.11Z"/>
                <path className="abc-196" d="M507.5,870.66c-.01.14-.05.28-.06.42-.02.2-.07.4-.09.59-.47-.05-.87-.11-1.23-.11v-.93c.42,0,.88.02,1.37.04Z"/>
                <path className="abc-343" d="M507.6,869.5c-.02.25-.03.49-.05.74-.01.14-.05.28-.06.42-.5-.01-.95-.03-1.37-.04v-1.15c.45,0,.95.02,1.48.03Z"/>
                <path className="abc-360" d="M507.77,866.84c-.04.64-.07,1.28-.12,1.93-.02.25-.03.49-.05.74-.53-.01-1.04-.03-1.48-.03v-2.78c.47.01,1.04.08,1.65.15Z"/>
                <path className="abc-5" d="M508.02,861.74c-.05,1.06-.08,2.12-.14,3.17-.04.64-.06,1.28-.1,1.92-.61-.07-1.18-.14-1.65-.15v-5.33c.53.03,1.19.21,1.89.39Z"/>
                <path className="abc-327" d="M508.22,854.71c-.03,1.29-.05,2.58-.09,3.86-.04,1.06-.06,2.12-.11,3.17-.71-.18-1.37-.36-1.89-.39v-7.36c.61.05,1.32.38,2.09.71Z"/>
                <path className="abc-364" d="M508.26,849.53c0,.44,0,.87,0,1.31-.01,1.29-.01,2.59-.04,3.87-.77-.33-1.49-.66-2.09-.71v-5.4c.65.06,1.36.49,2.14.93Z"/>
                <path className="abc-364" d="M508.26,846.28c0,.67,0,1.32,0,1.93,0,.44,0,.87,0,1.31-.78-.44-1.49-.87-2.14-.93v-2.98c.65.06,1.36.36,2.14.66Z"/>
                <path className="abc-404" d="M508.26,842.75v1.44c0,.72,0,1.42,0,2.09-.78-.3-1.49-.6-2.14-.66v-3.42c.65.06,1.36.31,2.14.56Z"/>
                <path className="abc-406" d="M508.26,633.17c0,87.27,0,177.63,0,208.13v1.46c-.78-.25-1.49-.49-2.14-.56v-204.49c.64.88,1.35-1.83,2.13-4.54Z"/>
                <path className="abc-108" d="M508.25,425.81c0,1.98,0,3.99,0,6.11,0,5.51,0,12.6,0,21.84,0,29.86,0,103.49,0,179.4-.78,2.7-1.5,5.42-2.13,4.54v-209.19c.63-.03,1.35-1.37,2.13-2.7Z"/>
                <path className="abc-300" d="M508.25,416.52c0,1.18,0,2.37,0,3.62,0,1.83,0,3.71,0,5.68-.79,1.33-1.5,2.68-2.13,2.7v-10.77c.63-.03,1.34-.63,2.13-1.23Z"/>
                <path className="abc-396" d="M508.25,412.64v.47c0,1.11,0,2.23,0,3.41-.79.6-1.5,1.2-2.13,1.23v-4.87c.63-.03,1.34-.13,2.13-.24Z"/>
                <path className="abc-344" d="M508.25,412.18v.46c-.79.1-1.5.21-2.13.24v-.6c.63-.03,1.34-.06,2.13-.1Z"/>
                <path className="abc-60" d="M509.21,874.75c-.07.28-.13.55-.19.79-.24,0-.48.01-.69.02-.69.01-1.24,0-1.62-.01.02-.29.13-.58.16-.88.39.06.93.11,1.6.1.25,0,.49,0,.75-.01Z"/>
                <path className="abc-376" d="M509.59,873.11c-.06.25-.12.5-.17.73-.07.32-.14.62-.21.9-.26,0-.5,0-.75.01-.67.01-1.2-.04-1.6-.1.02-.3.14-.61.17-.93.02-.24.1-.48.12-.73.43.08.95.15,1.58.13.3,0,.57-.01.86-.02Z"/>
                <path className="abc-95" d="M509.91,871.72c-.05.21-.1.42-.14.62-.06.27-.12.53-.18.78-.29,0-.57.01-.86.02-.63.02-1.15-.06-1.58-.13.02-.25.1-.5.12-.75.02-.19.07-.39.09-.58.47.05.99.1,1.59.08.33-.01.64-.02.97-.03Z"/>
                <path className="abc-384" d="M510.17,870.63c-.04.15-.07.3-.11.45-.05.22-.1.43-.15.64-.33.01-.64.02-.97.03-.6.02-1.13-.03-1.59-.08.02-.2.07-.39.09-.59.01-.14.05-.28.06-.42.5.01,1.03.02,1.62,0,.35-.01.7-.02,1.06-.04Z"/>
                <path className="abc-303" d="M510.46,869.44c-.06.24-.12.48-.18.72-.04.15-.07.31-.11.46-.36.02-.71.03-1.06.04-.58.02-1.12.01-1.62,0,.01-.14.05-.28.06-.42.02-.25.03-.49.05-.74.53.01,1.1.01,1.68,0,.36-.01.76-.03,1.17-.06Z"/>
                <path className="abc-87" d="M511.05,866.85c-.14.63-.27,1.24-.42,1.87-.06.24-.11.48-.17.72-.41.03-.81.05-1.17.06-.58.02-1.15.01-1.68,0,.02-.25.03-.49.05-.74.04-.64.08-1.29.12-1.93.61.07,1.25.13,1.87.12.42,0,.91-.05,1.42-.1Z"/>
                <path className="abc-5" d="M512.08,861.94c-.21,1.03-.39,2.02-.62,3.06-.14.62-.26,1.23-.4,1.86-.51.05-.99.1-1.42.1-.61.01-1.26-.05-1.87-.12.04-.64.07-1.28.1-1.92.06-1.06.09-2.12.14-3.17.71.18,1.46.35,2.16.36.61.02,1.24-.06,1.9-.16Z"/>
                <path className="abc-349" d="M513.28,855.14c-.21,1.26-.4,2.49-.63,3.74-.19,1.03-.36,2.03-.57,3.06-.66.11-1.29.19-1.9.16-.7,0-1.46-.18-2.16-.36.05-1.06.07-2.11.11-3.17.04-1.29.06-2.57.09-3.86.77.33,1.6.66,2.43.7.87.05,1.72-.08,2.63-.27Z"/>
                <path className="abc-33" d="M513.98,850.07c-.05.43-.08.85-.14,1.28-.18,1.28-.35,2.52-.56,3.78-.91.18-1.77.32-2.63.27-.83-.04-1.66-.37-2.43-.7.03-1.29.03-2.58.04-3.87,0-.43,0-.87,0-1.31.78.44,1.62.87,2.51.92,1,.07,2.06-.12,3.2-.37Z"/>
                <path className="abc-223" d="M514.22,846.74c-.04.67-.07,1.42-.12,2.04-.05.44-.07.86-.12,1.29-1.14.26-2.19.45-3.2.37-.9-.05-1.74-.49-2.51-.92,0-.44,0-.87,0-1.31,0-.62,0-1.26,0-1.93.78.3,1.62.6,2.52.66,1.05.07,2.2-.05,3.44-.2Z"/>
                <path className="abc-261" d="M514.34,843.67c-.01.29-.02.63-.03.9-.03.71-.05,1.5-.09,2.17-1.24.15-2.39.27-3.44.2-.9-.06-1.75-.36-2.52-.66,0-.67,0-1.37,0-2.09v-1.44c.78.25,1.62.49,2.53.55,1.08.06,2.27.21,3.55.37Z"/>
                <path className="abc-261" d="M514.85,639.2c-.03,60.23-.12,118.51-.12,148.75s-.1,47.6-.37,54.75c-.01.32-.01.68-.03.97-1.28-.16-2.47-.3-3.55-.37-.91-.06-1.75-.3-2.53-.55v-1.46c0-30.5,0-120.86,0-208.13.78-2.7,1.63-5.39,2.53-4.45,1.27-2.62,2.64,3.91,4.07,10.48Z"/>
                <path className="abc-404" d="M515.07,423.52c0,1.92,0,3.94,0,6.16,0,2.65-.01,5.72-.01,9.24,0,3.97-.01,8.73-.01,14.42,0,28.49-.15,108.66-.19,185.86-1.43-6.57-2.8-13.1-4.07-10.48-.9-.94-1.75,1.74-2.53,4.45,0-75.91,0-149.55,0-179.4,0-9.24,0-16.33,0-21.84,0-2.12,0-4.14,0-6.11.79-1.33,1.64-2.64,2.53-2.59,1.36.08,2.82.16,4.29.29Z"/>
                <path className="abc-404" d="M515.08,415.12c0,.97,0,2.01,0,3.17,0,1.59,0,3.31,0,5.22-1.47-.12-2.92-.21-4.29-.29-.89-.05-1.75,1.26-2.53,2.59,0-1.98,0-3.85,0-5.68,0-1.25,0-2.44,0-3.62.78-.6,1.64-1.2,2.53-1.21,1.36-.02,2.82-.11,4.3-.18Z"/>
                <path className="abc-337" d="M515.09,412.21v.32c0,.77,0,1.62,0,2.59-1.48.07-2.94.16-4.3.18-.9.01-1.75.61-2.53,1.21,0-1.18,0-2.3,0-3.41v-.47c.79-.1,1.64-.21,2.53-.25,1.36-.06,2.83-.12,4.31-.19Z"/>
                <path className="abc-85" d="M515.09,411.9c0,.1,0,.21,0,.31-1.48.06-2.94.13-4.31.19-.9.04-1.75.14-2.53.25v-.46c.79-.04,1.64-.07,2.53-.11,1.36-.06,2.83-.12,4.31-.17Z"/>
                <path className="abc-115" d="M510.28,874.7c-.09.28-.18.55-.26.79-.08,0-.15,0-.23.01-.27.01-.53.03-.77.03.06-.24.12-.51.19-.79.26,0,.53-.01.83-.03.08,0,.16,0,.24-.01Z"/>
                <path className="abc-235" d="M510.81,873.06c-.08.26-.16.5-.24.74-.1.32-.2.62-.29.9-.08,0-.16,0-.24.01-.3.02-.57.02-.83.03.07-.28.14-.58.21-.9.05-.24.11-.48.17-.73.29,0,.59-.02.94-.04.1,0,.19-.01.28-.02Z"/>
                <path className="abc-362" d="M511.28,871.65c-.07.21-.14.42-.21.62-.09.27-.18.53-.26.79-.09,0-.19,0-.28.02-.35.02-.65.03-.94.04.06-.25.12-.51.18-.78.05-.2.1-.41.14-.62.33-.01.67-.03,1.05-.05.11,0,.21-.01.32-.02Z"/>
                <path className="abc-71" d="M511.65,870.55c-.05.15-.1.31-.16.46-.07.22-.15.43-.22.64-.11,0-.21.01-.32.02-.38.02-.72.04-1.05.05.05-.21.1-.42.15-.64.04-.15.07-.3.11-.45.36-.02.74-.04,1.14-.06.11,0,.23-.01.34-.02Z"/>
                <path className="abc-284" d="M512.07,869.34c-.09.25-.17.5-.26.74-.05.16-.11.31-.16.46-.11,0-.23.01-.34.02-.4.02-.78.04-1.14.06.04-.15.07-.31.11-.46.06-.24.12-.48.18-.72.41-.03.84-.06,1.26-.08.12,0,.24-.01.36-.02Z"/>
                <path className="abc-360" d="M513.02,866.66c-.23.64-.46,1.29-.69,1.93-.09.25-.17.5-.26.74-.12,0-.24.02-.36.02-.42.02-.84.05-1.26.08.06-.24.11-.48.17-.72.15-.63.28-1.24.42-1.87.51-.05,1.03-.12,1.54-.16.14-.01.28-.02.43-.03Z"/>
                <path className="abc-5" d="M514.84,861.56c-.38,1.06-.75,2.12-1.13,3.17-.23.64-.46,1.29-.69,1.93-.14.01-.29.02-.43.03-.5.04-1.03.1-1.54.16.14-.63.27-1.24.4-1.86.23-1.03.41-2.03.62-3.06.66-.11,1.36-.24,2.12-.32.21-.02.43-.04.65-.06Z"/>
                <path className="abc-206" d="M517.24,854.49c-.41,1.3-.84,2.6-1.29,3.89-.37,1.06-.73,2.12-1.11,3.18-.22.01-.44.03-.65.06-.76.08-1.46.22-2.12.32.21-1.03.38-2.02.57-3.06.23-1.26.42-2.48.63-3.74.91-.18,1.88-.42,2.98-.56.31-.04.64-.07.98-.09Z"/>
                <path className="abc-88" d="M518.77,849.2c-.11.45-.23.9-.36,1.35-.37,1.32-.76,2.64-1.17,3.95-.34.02-.67.05-.98.09-1.1.14-2.07.38-2.98.56.21-1.26.37-2.5.56-3.78.06-.43.09-.85.14-1.28,1.14-.25,2.35-.57,3.66-.76.37-.05.74-.09,1.13-.12Z"/>
                <path className="abc-31" d="M519.4,846.26c-.09.53-.19,1.04-.31,1.59-.1.45-.21.91-.32,1.36-.38.03-.76.07-1.13.12-1.31.18-2.53.5-3.66.76.05-.43.07-.86.12-1.29.06-.63.09-1.37.12-2.04,1.24-.15,2.57-.35,3.97-.42.39-.02.8-.05,1.21-.06Z"/>
                <path className="abc-342" d="M519.71,844.17c-.02.21-.05.4-.08.58-.07.5-.15.98-.23,1.51-.41.02-.81.04-1.21.06-1.41.08-2.74.27-3.97.42.04-.67.06-1.46.09-2.17.01-.27.02-.6.03-.9,1.28.16,2.66.32,4.12.43.41.03.83.05,1.25.07Z"/>
                <path className="abc-47" d="M520.55,648.5c-.03,60.54-.06,113.83-.06,130.07,0,40.24-.14,58.65-.71,64.92-.02.25-.05.47-.07.69-.42-.02-.84-.05-1.25-.07-1.46-.1-2.84-.27-4.12-.43.01-.29.02-.65.03-.97.26-7.14.37-24.19.37-54.75s.1-88.52.12-148.75c1.43,6.57,2.91,13.18,4.43,10.72.42-.91.84-1.16,1.27-1.43Z"/>
                <path className="abc-147" d="M520.66,421.78c0,1.71,0,3.55,0,5.52,0,2.17,0,4.7,0,7.57,0,32.62-.06,130.05-.1,213.62-.42.27-.85.52-1.27,1.43-1.51,2.46-3-4.15-4.43-10.72.03-77.2.18-157.38.19-185.86,0-5.69.01-10.46.01-14.42,0-3.52,0-6.59.01-9.24,0-2.21,0-4.24,0-6.16,1.47.12,2.96.28,4.39.52.4-.85.8-1.55,1.2-2.25Z"/>
                <path className="abc-342" d="M520.67,414.4c0,.82,0,1.72,0,2.71,0,1.4,0,2.96,0,4.67-.39.7-.79,1.4-1.2,2.25-1.44-.23-2.92-.39-4.39-.52,0-1.92,0-3.63,0-5.22,0-1.16,0-2.2,0-3.17,1.48-.07,2.97-.13,4.41-.1.4-.24.8-.43,1.18-.62Z"/>
                <path className="abc-189" d="M520.68,411.97c0,.09,0,.17,0,.26,0,.63,0,1.35,0,2.17-.39.19-.78.38-1.18.62-1.43-.03-2.93.03-4.41.1,0-.97,0-1.82,0-2.59v-.32c1.48-.06,2.98-.12,4.41-.16.4-.02.79-.05,1.18-.08Z"/>
                <path className="abc-223" d="M520.68,411.72v.25c-.39.03-.78.06-1.18.08-1.43.04-2.93.1-4.41.16,0-.11,0-.21,0-.31,1.48-.06,2.98-.11,4.41-.15.4-.01.79-.02,1.18-.03Z"/>
                <path className="abc-315" d="M511,874.65c-.12.28-.24.55-.33.79-.14.01-.28.02-.42.03-.08,0-.16.01-.24.01.08-.24.17-.5.26-.79.08,0,.16,0,.25-.01.17-.01.32-.02.47-.04Z"/>
                <path className="abc-235" d="M511.74,873c-.11.26-.23.51-.34.75-.14.32-.28.63-.4.91-.15.01-.3.02-.47.04-.09,0-.17.01-.25.01.09-.28.19-.58.29-.9.08-.24.16-.49.24-.74.09,0,.19-.01.29-.02.22-.01.43-.03.63-.05Z"/>
                <path className="abc-171" d="M512.36,871.58c-.09.21-.18.42-.27.63-.12.27-.24.54-.35.79-.21.02-.41.03-.63.05-.1,0-.2.01-.29.02.08-.26.17-.52.26-.79.07-.2.14-.41.21-.62.11,0,.21-.01.32-.02.25-.02.51-.03.76-.05Z"/>
                <path className="abc-122" d="M512.82,870.47c-.06.15-.12.31-.19.46-.09.22-.18.43-.27.65-.25.02-.51.03-.76.05-.11,0-.22.01-.32.02.07-.21.14-.43.22-.64.05-.15.1-.3.16-.46.11,0,.23-.01.35-.02.27-.02.55-.04.83-.05Z"/>
                <path className="abc-414" d="M513.3,869.26c-.1.25-.19.49-.29.74-.06.16-.12.31-.18.46-.28.02-.55.04-.83.05-.12,0-.23.01-.35.02.05-.15.11-.31.16-.46.09-.25.17-.5.26-.74.12,0,.24-.02.36-.02.28-.02.57-.03.86-.05Z"/>
                <path className="abc-79" d="M514.37,866.6c-.27.64-.53,1.28-.78,1.92-.1.25-.2.49-.29.74-.29.02-.58.03-.86.05-.12,0-.24.02-.36.02.09-.25.17-.5.26-.74.23-.64.46-1.29.69-1.93.14-.01.29-.02.44-.03.29-.02.6-.02.91-.03Z"/>
                <path className="abc-5" d="M516.53,861.53c-.45,1.05-.9,2.1-1.35,3.15-.27.64-.54,1.28-.81,1.91-.31,0-.62.02-.91.03-.15,0-.3.02-.44.03.23-.64.46-1.29.69-1.93.38-1.06.76-2.12,1.13-3.17.22-.01.45-.02.68-.02.31,0,.66,0,1,0Z"/>
                <path className="abc-339" d="M519.36,854.49c-.47,1.3-.98,2.6-1.51,3.88-.43,1.06-.88,2.11-1.32,3.16-.35,0-.69,0-1,0-.23,0-.46,0-.68.02.38-1.06.74-2.12,1.11-3.18.44-1.29.87-2.59,1.29-3.89.34-.02.69-.03,1.03-.02.35,0,.72.01,1.09.02Z"/>
                <path className="abc-40" d="M521.04,849.18c-.12.45-.25.9-.38,1.35-.39,1.34-.83,2.65-1.3,3.96-.37,0-.74-.02-1.09-.02-.34,0-.69,0-1.03.02.41-1.3.8-2.62,1.17-3.95.12-.45.25-.9.36-1.35.38-.03.78-.04,1.18-.03.37,0,.73.01,1.1.01Z"/>
                <path className="abc-314" d="M521.74,846.25c-.1.51-.21,1.03-.34,1.57-.11.46-.23.91-.35,1.36-.37,0-.73,0-1.1-.01-.4,0-.79,0-1.18.03.11-.45.22-.9.32-1.36.12-.55.22-1.06.31-1.59.41-.02.83-.02,1.25-.02.36,0,.73.01,1.09,0Z"/>
                <path className="abc-62" d="M522.08,844.17c-.03.23-.05.42-.09.61-.08.47-.16.96-.26,1.47-.36,0-.73,0-1.09,0-.42,0-.84,0-1.25.02.09-.53.16-1.01.23-1.51.03-.18.05-.36.08-.58.42.02.85.03,1.29.04.36,0,.72-.01,1.09-.04Z"/>
                <path className="abc-336" d="M522.91,636.53c0,53.83-.01,104.5-.02,133.7,0,1.55,0,3.06,0,4.51,0,17.86-.03,32.06-.12,43.11-.08,11.25-.02,19.75-.61,25.6-.03.27-.05.49-.08.72-.37.03-.73.04-1.09.04-.44,0-.87-.02-1.29-.04.02-.21.05-.43.07-.69.56-6.28.71-24.68.71-64.92,0-16.23.03-69.52.06-130.07.42-.27.85-.56,1.27-1.55.36-1.06.72-5.73,1.09-10.42Z"/>
                <path className="abc-415" d="M522.92,423.82c0,1.78,0,3.61,0,5.5,0,31.06,0,122.77-.01,207.21-.37,4.69-.73,9.36-1.09,10.42-.42.99-.85,1.28-1.27,1.55.04-83.58.1-181,.1-213.62,0-2.87,0-5.4,0-7.57,0-1.97,0-3.82,0-5.52.39-.7.78-1.4,1.16-2.25.37-.02.74,2.14,1.1,4.29Z"/>
                <path className="abc-415" d="M522.92,415.49v3.18c0,1.65,0,3.37,0,5.15-.37-2.15-.74-4.31-1.1-4.29-.38.85-.77,1.55-1.16,2.25,0-1.7,0-3.27,0-4.67,0-.99,0-1.9,0-2.71.39-.19.77-.38,1.14-.61.37,0,.74.85,1.1,1.7Z"/>
                <path className="abc-339" d="M522.92,412.08v.41c0,.97,0,1.98,0,3.01-.37-.86-.74-1.71-1.1-1.7-.37.24-.75.42-1.14.61,0-.82,0-1.54,0-2.17,0-.09,0-.18,0-.26.39-.03.77-.06,1.14-.08.37,0,.74.09,1.11.18Z"/>
                <path className="abc-406" d="M522.92,411.67v.41c-.37-.1-.74-.19-1.11-.18-.37.01-.75.04-1.14.08v-.25c.39,0,.77-.02,1.14-.03.37,0,.74-.01,1.11-.02Z"/>
                <path className="abc-129" d="M512.35,874.53c-.19.29-.37.56-.52.81-.25.03-.49.05-.73.07-.15.01-.29.02-.43.04.09-.24.21-.51.33-.79.15-.01.31-.03.48-.04.29-.02.57-.05.86-.08Z"/>
                <path className="abc-229" d="M513.46,872.85c-.17.26-.34.51-.5.75-.21.33-.43.63-.62.92-.29.03-.58.06-.86.08-.18.01-.33.03-.48.04.12-.28.26-.59.4-.91.11-.24.22-.49.34-.75.21-.02.42-.03.64-.05.36-.03.72-.06,1.08-.09Z"/>
                <path className="abc-11" d="M514.35,871.42c-.13.21-.25.42-.38.63-.17.27-.34.54-.51.8-.36.04-.71.07-1.08.09-.22.02-.43.03-.64.05.12-.26.23-.52.35-.79.09-.21.18-.42.27-.63.25-.02.51-.04.76-.05.42-.03.82-.06,1.23-.1Z"/>
                <path className="abc-196" d="M514.99,870.31c-.08.15-.17.31-.26.46-.13.22-.25.44-.38.65-.4.04-.81.07-1.23.1-.26.02-.51.04-.76.05.09-.21.18-.43.27-.65.06-.15.13-.3.19-.46.28-.02.55-.04.83-.06.45-.03.89-.07,1.34-.1Z"/>
                <path className="abc-28" d="M515.58,869.12c-.12.24-.23.48-.35.73-.08.16-.16.31-.24.47-.44.04-.89.07-1.34.1-.28.02-.55.04-.83.06.06-.15.12-.31.18-.46.09-.25.19-.5.29-.74.29-.02.58-.03.86-.05.46-.03.94-.06,1.42-.09Z"/>
                <path className="abc-118" d="M516.85,866.51c-.31.63-.61,1.25-.92,1.88-.12.24-.23.48-.35.72-.48.03-.96.06-1.42.09-.28.02-.57.04-.86.05.1-.25.19-.49.29-.74.26-.64.52-1.28.78-1.92.31,0,.62-.02.92-.04.48-.03,1.02-.04,1.56-.05Z"/>
                <path className="abc-5" d="M519.27,861.53c-.49,1.04-.99,2.07-1.49,3.1-.31.63-.61,1.25-.92,1.88-.54.01-1.09.02-1.56.05-.29.02-.6.03-.92.04.27-.64.54-1.28.81-1.91.45-1.05.9-2.1,1.35-3.15.35,0,.69,0,1.01,0,.52-.02,1.13,0,1.73,0Z"/>
                <path className="abc-44" d="M522.26,854.52c-.48,1.31-1.01,2.6-1.57,3.88-.46,1.05-.93,2.09-1.42,3.13-.61,0-1.22-.02-1.73,0-.32.01-.66.01-1.01,0,.45-1.05.89-2.1,1.32-3.16.53-1.29,1.03-2.58,1.51-3.88.37,0,.74.02,1.09.01.57,0,1.19,0,1.81.02Z"/>
                <path className="abc-159" d="M523.95,849.15c-.12.46-.24.92-.37,1.38-.39,1.36-.83,2.69-1.31,4-.62,0-1.24-.02-1.81-.02-.35,0-.72,0-1.09-.01.47-1.31.91-2.62,1.3-3.96.13-.45.26-.9.38-1.35.37,0,.73,0,1.1,0,.6,0,1.2-.02,1.8-.04Z"/>
                <path className="abc-247" d="M524.62,846.18c-.1.51-.21,1.04-.33,1.57-.11.47-.22.93-.34,1.4-.6.02-1.2.03-1.8.04-.37,0-.74,0-1.1,0,.12-.45.24-.9.35-1.36.13-.54.24-1.06.34-1.57.36,0,.73,0,1.09-.01.6-.01,1.19-.03,1.79-.06Z"/>
                <path className="abc-327" d="M525.01,843.71c-.04.36-.09.68-.13.98-.07.47-.16.97-.26,1.48-.6.03-1.19.05-1.79.06-.37,0-.73.01-1.09.01.1-.51.19-1,.26-1.47.03-.19.06-.38.09-.61.37-.03.73-.07,1.1-.12.6-.08,1.21-.2,1.82-.34Z"/>
                <path className="abc-202" d="M525.83,625.88c0,48.14-.02,96.99-.04,137.9,0,16.3-.04,31.31-.06,44.5-.02,13.61.31,25.31-.6,34.37-.04.35-.07.71-.12,1.07-.61.13-1.22.25-1.82.34-.37.05-.74.09-1.1.12.03-.23.05-.45.08-.72.58-5.85.52-14.35.61-25.6.09-11.05.12-25.26.12-43.11,0-1.45,0-2.96,0-4.51,0-29.2.01-79.87.02-133.7.37-4.69.74-9.38,1.1-10.48.6.07,1.21-.01,1.82-.16Z"/>
                <path className="abc-195" d="M525.83,428.07c0,2.19,0,4.38,0,6.57,0,36.04,0,112.69,0,191.25-.61.15-1.22.23-1.82.16-.37,1.1-.74,5.8-1.1,10.48,0-84.44.01-176.15.01-207.21,0-1.89,0-3.72,0-5.5.37,2.15.74,4.31,1.11,4.3.6,0,1.2-.03,1.8-.06Z"/>
                <path className="abc-378" d="M525.83,417.17c0,1.44,0,2.88,0,4.32,0,2.19,0,4.38,0,6.57-.6.02-1.2.05-1.8.06-.37,0-.74-2.15-1.11-4.3,0-1.78,0-3.49,0-5.15v-3.18c.37.86.74,1.72,1.11,1.71.6,0,1.2-.02,1.8-.03Z"/>
                <path className="abc-285" d="M525.83,412.25v4.93c-.6.01-1.2.02-1.8.03-.37,0-.74-.85-1.11-1.71,0-1.03,0-2.03,0-3.01v-.41c.37.1.74.19,1.11.19.6,0,1.2-.01,1.8-.02Z"/>
                <path className="abc-402" d="M525.83,411.64v.61c-.6,0-1.2.01-1.8.02-.37,0-.74-.09-1.11-.19v-.41c.37,0,.74-.01,1.11-.02.6,0,1.2-.01,1.8-.02Z"/>
                <path className="abc-264" d="M514.32,874.27c-.27.3-.52.58-.75.85-.33.05-.66.09-.97.13-.26.03-.52.06-.77.09.14-.25.33-.52.52-.81.29-.03.58-.07.88-.1.36-.04.72-.1,1.09-.15Z"/>
                <path className="abc-268" d="M515.82,872.56c-.23.26-.45.52-.66.76-.28.33-.57.65-.83.95-.37.06-.74.11-1.09.15-.3.04-.59.07-.88.1.19-.29.41-.6.62-.92.16-.24.33-.49.5-.75.36-.04.71-.07,1.06-.12.43-.05.86-.11,1.29-.18Z"/>
                <path className="abc-150" d="M517.03,871.12c-.17.22-.36.43-.53.64-.23.28-.46.54-.68.81-.44.06-.87.12-1.29.18-.35.04-.71.08-1.06.12.17-.26.35-.53.51-.8.13-.21.25-.42.38-.63.4-.04.8-.08,1.21-.12.49-.05.97-.11,1.46-.18Z"/>
                <path className="abc-388" d="M517.91,870c-.12.16-.24.31-.36.46-.17.22-.35.44-.53.65-.49.07-.98.13-1.46.18-.41.04-.81.08-1.21.12.13-.21.25-.43.38-.65.09-.15.17-.31.26-.46.44-.04.89-.08,1.33-.12.54-.05,1.07-.12,1.6-.19Z"/>
                <path className="abc-426" d="M518.72,868.83c-.15.23-.3.46-.46.7-.11.16-.23.31-.35.47-.53.07-1.06.13-1.6.19-.44.05-.89.09-1.33.12.08-.15.17-.31.24-.47.12-.24.23-.48.35-.73.48-.03.96-.07,1.42-.11.55-.06,1.14-.11,1.72-.17Z"/>
                <path className="abc-206" d="M520.31,866.32c-.37.61-.76,1.21-1.14,1.82-.15.23-.3.47-.45.7-.58.06-1.16.12-1.72.17-.46.05-.94.08-1.42.11.12-.24.23-.48.35-.72.31-.63.61-1.26.92-1.88.54-.01,1.09-.03,1.56-.07.57-.05,1.24-.08,1.9-.12Z"/>
                <path className="abc-5" d="M523.11,861.44c-.54,1.03-1.11,2.04-1.7,3.05-.36.61-.72,1.22-1.1,1.83-.66.04-1.33.07-1.9.12-.47.04-1.02.06-1.56.07.31-.63.62-1.25.92-1.88.51-1.03,1.01-2.06,1.49-3.1.61,0,1.22.01,1.73-.02.62-.05,1.37-.05,2.11-.07Z"/>
                <path className="abc-267" d="M526.26,854.42c-.49,1.33-1.03,2.63-1.62,3.91-.48,1.05-1,2.09-1.53,3.11-.74.02-1.48.02-2.11.07-.52.04-1.13.03-1.73.02.49-1.04.97-2.08,1.42-3.13.56-1.28,1.08-2.57,1.57-3.88.62,0,1.24.01,1.82-.02.69-.04,1.44-.05,2.18-.09Z"/>
                <path className="abc-90" d="M527.92,848.9c-.11.48-.23.97-.35,1.44-.38,1.4-.81,2.75-1.3,4.08-.74.03-1.49.05-2.18.09-.58.03-1.2.03-1.82.02.49-1.31.93-2.64,1.31-4,.13-.46.26-.92.37-1.38.6-.02,1.2-.05,1.8-.08.72-.04,1.45-.1,2.17-.16Z"/>
                <path className="abc-367" d="M528.56,845.87c-.1.51-.22,1.04-.33,1.57-.1.49-.2.98-.31,1.46-.72.07-1.44.12-2.17.16-.6.04-1.2.06-1.8.08.12-.46.23-.93.34-1.4.12-.54.23-1.06.33-1.57.6-.03,1.19-.07,1.79-.11.72-.06,1.44-.12,2.15-.2Z"/>
                <path className="abc-36" d="M529.04,842.75c-.06.53-.14,1.13-.21,1.62-.07.48-.17.98-.27,1.49-.72.07-1.43.14-2.15.2-.6.05-1.19.08-1.79.11.1-.51.19-1.01.26-1.48.04-.3.09-.62.13-.98.61-.13,1.22-.28,1.83-.43.74-.18,1.47-.36,2.2-.53Z"/>
                <path className="abc-269" d="M529.84,624.9c0,47.86-.01,96.44-.06,137.15-.02,16.45-.1,31.59-.04,44.86.06,13.55.39,25.19-.51,34.19-.05.51-.12,1.13-.18,1.65-.73.17-1.47.35-2.2.53-.61.15-1.22.29-1.83.43.04-.36.08-.71.12-1.07.9-9.05.58-20.75.6-34.37.02-13.19.05-28.2.06-44.5.02-40.91.04-89.75.04-137.9.61-.15,1.22-.36,1.83-.57.73-.12,1.46-.27,2.19-.41Z"/>
                <path className="abc-195" d="M529.8,427.97c0,2.18,0,4.36,0,6.54,0,35.84.05,112.05.04,190.4-.73.14-1.46.29-2.19.41-.6.21-1.22.42-1.83.57,0-78.55,0-155.21,0-191.25,0-2.19,0-4.38,0-6.57.6-.02,1.2-.05,1.8-.05.72,0,1.45-.02,2.17-.05Z"/>
                <path className="abc-319" d="M529.8,417.13c0,1.43,0,2.86,0,4.3,0,2.18,0,4.36,0,6.54-.72.02-1.45.05-2.17.05-.6,0-1.2.03-1.8.05,0-2.19,0-4.38,0-6.57,0-1.44,0-2.88,0-4.32.6-.01,1.2-.02,1.8-.03.72,0,1.45,0,2.17-.02Z"/>
                <path className="abc-400" d="M529.8,412.23v.6c0,1.43,0,2.86,0,4.3-.72,0-1.45.02-2.17.02-.6,0-1.2.01-1.8.03v-4.93c.6,0,1.2,0,1.8-.01.72,0,1.45,0,2.17,0Z"/>
                <path className="abc-88" d="M529.8,411.63v.6c-.72,0-1.45,0-2.17,0-.6,0-1.2,0-1.8.01v-.61c.6,0,1.2,0,1.8,0,.72,0,1.45,0,2.17,0Z"/>
                <path className="abc-272" d="M516.01,873.98c-.32.31-.63.61-.92.89-.17.03-.34.06-.5.09-.35.06-.69.11-1.02.16.23-.27.48-.55.75-.85.37-.06.75-.12,1.14-.19.19-.03.37-.07.55-.1Z"/>
                <path className="abc-183" d="M517.8,872.23c-.27.27-.53.53-.79.78-.35.34-.68.66-1,.98-.18.04-.37.07-.55.1-.39.07-.77.13-1.14.19.27-.3.55-.62.83-.95.21-.25.44-.5.66-.76.44-.06.88-.14,1.34-.21.22-.04.43-.08.64-.12Z"/>
                <path className="abc-11" d="M519.23,870.76c-.21.22-.41.43-.62.65-.27.28-.54.55-.81.82-.21.04-.42.08-.64.12-.46.08-.91.15-1.34.21.23-.26.46-.53.68-.81.17-.21.35-.42.53-.64.49-.07.98-.14,1.49-.23.24-.04.48-.09.71-.13Z"/>
                <path className="abc-457" d="M520.27,869.62c-.14.16-.28.31-.43.47-.21.22-.41.45-.62.66-.23.05-.47.09-.71.13-.51.09-1,.16-1.49.23.17-.22.36-.43.53-.65.12-.15.24-.31.36-.46.53-.07,1.06-.15,1.59-.24.26-.04.51-.09.76-.14Z"/>
                <path className="abc-118" d="M521.23,868.48c-.18.22-.36.45-.54.67-.14.16-.28.32-.42.48-.25.05-.51.09-.76.14-.54.09-1.06.17-1.59.24.12-.16.24-.31.35-.47.15-.23.3-.46.46-.7.58-.06,1.16-.14,1.7-.23.26-.04.54-.09.81-.13Z"/>
                <path className="abc-214" d="M523.09,866.04c-.43.59-.87,1.18-1.32,1.77-.17.22-.35.45-.53.67-.27.04-.55.09-.81.13-.55.09-1.13.16-1.7.23.15-.23.3-.46.45-.7.39-.61.77-1.21,1.14-1.82.66-.04,1.32-.09,1.88-.18.27-.04.58-.07.89-.1Z"/>
                <path className="abc-4" d="M526.19,861.23c-.58,1.02-1.2,2.02-1.86,3.02-.4.6-.81,1.2-1.24,1.79-.31.03-.62.05-.89.1-.56.09-1.22.14-1.88.18.37-.61.74-1.22,1.1-1.83.59-1.01,1.16-2.02,1.7-3.05.74-.02,1.47-.05,2.09-.14.29-.04.65-.05,1-.07Z"/>
                <path className="abc-39" d="M529.47,854.14c-.49,1.36-1.04,2.68-1.65,3.97-.5,1.06-1.04,2.1-1.63,3.12-.35.01-.7.02-1,.07-.61.09-1.35.12-2.09.14.54-1.03,1.05-2.06,1.53-3.11.59-1.28,1.13-2.58,1.62-3.91.74-.03,1.48-.08,2.16-.17.33-.04.69-.07,1.05-.1Z"/>
                <path className="abc-415" d="M531.1,848.5c-.11.48-.23.97-.35,1.44-.36,1.45-.79,2.84-1.28,4.2-.37.04-.73.06-1.05.1-.68.09-1.42.14-2.16.17.49-1.33.93-2.69,1.3-4.08.13-.47.24-.96.35-1.44.72-.07,1.44-.15,2.15-.24.34-.04.69-.1,1.03-.16Z"/>
                <path className="abc-131" d="M531.72,845.48c-.1.51-.21,1.04-.31,1.57-.09.48-.2.98-.31,1.46-.35.06-.69.12-1.03.16-.71.09-1.43.17-2.15.24.11-.48.21-.97.31-1.46.11-.53.22-1.06.33-1.57.72-.07,1.43-.16,2.14-.25.34-.04.68-.09,1.02-.14Z"/>
                <path className="abc-372" d="M532.21,842.19c-.07.6-.15,1.19-.23,1.78-.07.49-.17.99-.27,1.5-.34.05-.68.09-1.02.14-.71.09-1.42.18-2.14.25.1-.51.2-1.01.27-1.49.07-.49.15-1.09.21-1.62.73-.17,1.45-.32,2.16-.41.34-.04.68-.1,1.01-.15Z"/>
                <path className="abc-161" d="M533.06,624.51c-.02,47.84-.06,96.48-.12,137.14,0,1.59,0,3.16,0,4.73-.03,14.99-.1,28.82-.05,41.01,0,1.22.01,2.42.02,3.61.06,11.51.28,21.5-.5,29.4-.06.6-.12,1.19-.19,1.79-.34.05-.67.1-1.01.15-.71.1-1.43.25-2.16.41.06-.53.13-1.15.18-1.65.9-9,.57-20.63.51-34.19-.06-13.28.03-28.41.04-44.86.04-40.71.05-89.28.06-137.15.73-.14,1.45-.27,2.15-.35.35-.01.71-.03,1.07-.04Z"/>
                <path className="abc-168" d="M533.09,427.91c0,2.17,0,4.35,0,6.52,0,35.72,0,111.85-.03,190.08-.36.02-.71.03-1.07.04-.7.08-1.42.21-2.15.35,0-78.35-.03-154.55-.04-190.4,0-2.18,0-4.36,0-6.54.72-.02,1.45-.05,2.17-.05.37,0,.75,0,1.12-.01Z"/>
                <path className="abc-281" d="M533.09,417.11c0,1.43,0,2.85,0,4.28,0,2.17,0,4.35,0,6.52-.37,0-.75,0-1.12.01-.72,0-1.45.02-2.17.05,0-2.18,0-4.36,0-6.54,0-1.43,0-2.86,0-4.3.72,0,1.45-.02,2.17-.02.37,0,.75,0,1.12,0Z"/>
                <path className="abc-200" d="M533.09,412.23v4.88c-.38,0-.75,0-1.12,0-.72,0-1.45,0-2.17.02,0-1.43,0-2.86,0-4.3v-.6c.72,0,1.45,0,2.17,0,.37,0,.75,0,1.12,0Z"/>
                <path className="abc-346" d="M533.09,411.63v.6c-.38,0-.75,0-1.12,0-.72,0-1.45,0-2.17,0v-.6c.72,0,1.45,0,2.17,0,.37,0,.75,0,1.12,0Z"/>
                <path className="abc-157" d="M517.16,873.75c-.36.32-.7.63-1.03.92-.18.04-.36.07-.54.11-.17.03-.34.07-.51.1.29-.28.6-.57.92-.89.18-.04.37-.07.56-.11.2-.04.39-.08.59-.13Z"/>
                <path className="abc-234" d="M519.12,871.94c-.29.27-.58.54-.86.8-.38.35-.75.68-1.1,1-.2.04-.39.09-.59.13-.19.04-.38.08-.56.11.32-.31.66-.64,1-.98.26-.25.52-.51.79-.78.21-.04.42-.09.64-.13.23-.05.45-.1.67-.15Z"/>
                <path className="abc-91" d="M520.67,870.45c-.22.22-.45.44-.67.66-.29.29-.59.56-.88.84-.22.05-.44.1-.67.15-.22.05-.43.09-.64.13.27-.27.54-.54.81-.82.21-.21.41-.43.62-.65.23-.05.47-.1.71-.15.25-.05.49-.11.73-.17Z"/>
                <path className="abc-187" d="M521.81,869.3c-.16.16-.31.32-.47.48-.22.23-.45.45-.67.67-.24.06-.48.11-.73.17-.24.05-.48.1-.71.15.21-.22.41-.44.62-.66.14-.16.28-.31.43-.47.25-.05.5-.1.76-.15.26-.06.52-.11.78-.18Z"/>
                <path className="abc-177" d="M522.87,868.16c-.2.22-.39.43-.59.65-.15.16-.31.32-.46.48-.26.06-.52.12-.78.18-.25.05-.51.11-.76.15.14-.16.28-.32.42-.48.18-.22.36-.45.54-.67.27-.04.54-.09.8-.15.27-.06.55-.11.83-.17Z"/>
                <path className="abc-148" d="M524.89,865.78c-.46.58-.95,1.16-1.45,1.73-.19.22-.38.44-.58.65-.28.06-.56.11-.83.17-.26.06-.53.1-.8.15.18-.22.36-.45.53-.67.46-.59.9-1.17,1.32-1.77.31-.03.62-.06.89-.12.28-.06.6-.1.91-.14Z"/>
                <path className="abc-20" d="M528.23,861.02c-.62,1.02-1.29,2.02-2,3-.43.59-.88,1.18-1.35,1.76-.32.04-.64.08-.91.14-.27.06-.58.09-.89.12.43-.59.84-1.19,1.24-1.79.66-.99,1.28-1.99,1.86-3.02.35-.01.71-.04,1-.1.31-.07.67-.09,1.04-.12Z"/>
                <path className="abc-90" d="M531.65,853.82c-.5,1.4-1.07,2.75-1.7,4.05-.52,1.07-1.1,2.12-1.72,3.14-.36.02-.73.05-1.04.12-.3.06-.65.08-1,.1.58-1.02,1.12-2.06,1.63-3.12.61-1.29,1.16-2.61,1.65-3.97.37-.04.74-.08,1.07-.15.35-.08.73-.12,1.11-.17Z"/>
                <path className="abc-148" d="M533.22,848.09c-.1.46-.19.91-.3,1.38-.35,1.5-.77,2.95-1.27,4.35-.38.04-.76.09-1.11.17-.34.07-.71.12-1.07.15.49-1.36.92-2.76,1.28-4.2.12-.47.24-.96.35-1.44.35-.06.7-.13,1.05-.19.36-.07.72-.14,1.08-.21Z"/>
                <path className="abc-24" d="M533.76,845.16c-.09.51-.19,1.03-.28,1.56-.08.46-.16.9-.26,1.37-.36.07-.72.14-1.08.21-.35.07-.7.13-1.05.19.11-.48.21-.97.31-1.46.1-.53.21-1.05.31-1.57.34-.05.67-.1,1.01-.15.35-.05.69-.11,1.04-.16Z"/>
                <path className="abc-212" d="M534.21,842.12c-.06.52-.13,1.03-.2,1.55-.07.49-.15.99-.24,1.5-.34.06-.69.11-1.04.16-.34.05-.67.1-1.01.15.1-.51.2-1.01.27-1.5.08-.59.16-1.19.23-1.78.34-.05.67-.11,1-.16.34-.05.67.02.99.08Z"/>
                <path className="abc-432" d="M535.2,631.65c-.06,55.81-.14,109.55-.2,140.49,0,3.07-.01,5.96-.02,8.65-.05,14.78-.06,26.76-.1,36.29-.03,10.16.04,17.97-.5,23.5-.05.52-.11,1.03-.17,1.55-.32-.06-.65-.13-.99-.08-.33.05-.66.1-1,.16.07-.6.13-1.19.19-1.79.78-7.91.56-17.9.5-29.4,0-1.19-.01-2.39-.02-3.61-.05-12.2.02-26.02.05-41.01,0-1.56,0-3.14,0-4.73.06-40.66.09-89.3.12-137.14.36-.02.71-.03,1.07-.05.37,1.08.73,4.13,1.08,7.19Z"/>
                <path className="abc-440" d="M535.37,426.17c0,2.18,0,4.46,0,6.82v.8c0,21.78-.08,112.15-.17,197.86-.35-3.06-.71-6.11-1.08-7.19-.35.02-.71.03-1.07.05.04-78.23.03-154.36.03-190.08,0-2.17,0-4.35,0-6.52.37,0,.75,0,1.12,0,.39,0,.78-.87,1.16-1.73Z"/>
                <path className="abc-200" d="M535.37,415.97v3.96c0,1.97,0,4.05,0,6.24-.39.86-.77,1.73-1.16,1.73-.38,0-.75,0-1.12,0,0-2.17,0-4.35,0-6.52,0-1.43,0-2.85,0-4.28.38,0,.75,0,1.13,0,.39,0,.78-.57,1.16-1.14Z"/>
                <path className="abc-434" d="M535.37,412.06v3.91c-.39.57-.77,1.14-1.16,1.14-.38,0-.75,0-1.13,0v-4.88c.38,0,.75,0,1.13,0,.39,0,.78-.08,1.16-.17Z"/>
                <path className="abc-108" d="M535.37,411.63v.43c-.39.08-.77.17-1.16.17-.38,0-.75,0-1.13,0v-.6c.38,0,.75,0,1.13,0,.39,0,.78,0,1.16,0Z"/>
                <path className="abc-266" d="M518.88,873.33c-.38.33-.76.65-1.1.95-.37.09-.74.18-1.1.26-.18.04-.36.08-.54.12.33-.29.67-.6,1.03-.92.2-.04.39-.09.59-.14.38-.09.75-.18,1.13-.28Z"/>
                <path className="abc-64" d="M521.01,871.45c-.31.28-.63.56-.93.83-.41.36-.81.71-1.19,1.05-.38.1-.75.19-1.13.28-.2.05-.4.09-.59.14.35-.32.72-.66,1.1-1,.28-.26.57-.53.86-.8.22-.05.44-.11.67-.16.41-.1.82-.21,1.22-.33Z"/>
                <path className="abc-2" d="M522.68,869.91c-.24.23-.48.45-.72.67-.32.29-.64.58-.95.87-.41.12-.81.23-1.22.33-.23.06-.45.11-.67.16.29-.27.58-.55.88-.84.22-.22.45-.44.67-.66.24-.06.48-.12.73-.18.43-.11.86-.23,1.29-.35Z"/>
                <path className="abc-149" d="M523.89,868.74c-.16.16-.33.32-.49.48-.24.23-.48.46-.72.69-.43.13-.86.25-1.29.35-.25.06-.49.12-.73.18.22-.22.45-.45.67-.67.16-.16.31-.32.47-.48.26-.06.51-.13.77-.19.44-.11.88-.23,1.31-.36Z"/>
                <path className="abc-108" d="M524.99,867.63c-.2.21-.4.42-.61.63-.16.16-.33.32-.49.49-.44.13-.88.25-1.31.36-.26.07-.52.13-.77.19.16-.16.31-.32.46-.48.2-.22.4-.43.59-.65.28-.06.56-.12.82-.18.44-.11.88-.23,1.31-.35Z"/>
                <path className="abc-118" d="M527.06,865.32c-.47.56-.96,1.13-1.47,1.68-.2.21-.39.42-.59.63-.43.12-.87.23-1.31.35-.26.07-.54.13-.82.18.2-.22.39-.44.58-.65.5-.57.98-1.15,1.45-1.73.32-.04.63-.08.91-.15.43-.11.84-.2,1.26-.31Z"/>
                <path className="abc-421" d="M530.39,860.65c-.61,1.01-1.27,1.99-1.98,2.95-.43.58-.88,1.16-1.35,1.72-.41.1-.83.2-1.26.31-.27.07-.59.11-.91.15.46-.58.91-1.17,1.35-1.76.71-.98,1.38-1.98,2-3,.36-.02.72-.05,1.02-.11.38-.09.76-.17,1.13-.26Z"/>
                <path className="abc-280" d="M533.7,853.5c-.47,1.39-1.01,2.74-1.63,4.03-.51,1.06-1.07,2.1-1.67,3.11-.37.09-.75.17-1.13.26-.3.06-.66.09-1.02.11.62-1.02,1.19-2.07,1.72-3.14.64-1.3,1.21-2.66,1.7-4.05.38-.04.75-.08,1.08-.14.33-.06.64-.12.96-.18Z"/>
                <path className="abc-339" d="M535.17,847.79c-.08.45-.18.9-.27,1.36-.33,1.51-.72,2.96-1.2,4.35-.32.06-.63.12-.96.18-.33.06-.7.1-1.08.14.5-1.4.92-2.85,1.27-4.35.11-.47.2-.92.3-1.38.36-.07.71-.14,1.06-.2.3-.05.59-.08.88-.11Z"/>
                <path className="abc-36" d="M535.64,844.89c-.07.53-.14,1.04-.23,1.57-.07.44-.15.89-.24,1.34-.29.03-.59.06-.88.11-.35.06-.7.13-1.06.2.1-.46.18-.91.26-1.37.1-.53.19-1.05.28-1.56.34-.06.69-.11,1.03-.17.28-.05.56-.08.84-.1Z"/>
                <path className="abc-246" d="M536.03,841.81c-.06.51-.13,1.03-.19,1.54-.07.51-.13,1.02-.2,1.54-.28.03-.56.06-.84.1-.34.06-.68.12-1.03.17.09-.51.17-1.01.24-1.5.07-.52.14-1.03.2-1.55.32.06.65.12.98.07.27-.05.56-.21.84-.38Z"/>
                <path className="abc-233" d="M537.06,631.44c-.07,53.76-.14,105.58-.2,136.88,0,4.88,0,9.4.03,13.5.03,29.43.29,48.25-.7,58.44-.05.52-.11,1.03-.17,1.54-.28.17-.56.34-.84.38-.33.05-.66,0-.98-.07.06-.52.12-1.03.17-1.55.54-5.52.47-13.34.5-23.5.03-9.53.05-21.51.1-36.29,0-2.69.01-5.58.02-8.65.07-30.94.14-84.67.2-140.49.35,3.06.7,6.11,1.07,7.18.26-1.4.53-4.39.8-7.39Z"/>
                <path className="abc-161" d="M537.26,426.14c0,2.18,0,4.45,0,6.8v.8c0,21.73-.1,112.05-.2,197.71-.27,2.99-.54,5.99-.8,7.39-.36-1.07-.71-4.13-1.07-7.18.1-85.71.17-176.08.17-197.86v-.8c0-2.35,0-4.63,0-6.82.39-.86.77-1.73,1.16-1.73.24,0,.49.84.73,1.69Z"/>
                <path className="abc-367" d="M537.26,415.96c0,1.24,0,2.56,0,3.95,0,1.96,0,4.04,0,6.22-.24-.85-.49-1.7-.73-1.69-.38,0-.77.86-1.16,1.73,0-2.18,0-4.27,0-6.24v-3.96c.39-.57.77-1.14,1.16-1.14.25,0,.49.56.73,1.13Z"/>
                <path className="abc-428" d="M537.26,412.07v.45c0,1.06,0,2.21,0,3.45-.24-.57-.49-1.13-.73-1.13-.38,0-.77.57-1.16,1.14v-3.91c.39-.08.77-.17,1.16-.17.25,0,.49.08.73.17Z"/>
                <path className="abc-371" d="M537.26,411.63v.43c-.24-.08-.49-.17-.73-.17-.38,0-.77.08-1.16.17v-.43c.39,0,.77,0,1.16,0,.25,0,.49,0,.73,0Z"/>
                <path className="abc-121" d="M521,872.7c-.41.35-.8.68-1.15.99-.32.1-.63.2-.95.29-.38.11-.76.21-1.13.31.35-.3.72-.62,1.1-.95.38-.1.76-.21,1.15-.32.32-.1.65-.2.97-.3Z"/>
                <path className="abc-399" d="M523.24,870.75c-.33.29-.66.58-.98.86-.43.37-.85.74-1.26,1.09-.33.11-.65.21-.97.3-.39.12-.77.22-1.15.32.38-.33.79-.68,1.19-1.05.3-.27.62-.55.93-.83.41-.12.81-.24,1.22-.37.34-.1.68-.22,1.01-.33Z"/>
                <path className="abc-238" d="M524.99,869.17c-.25.23-.5.46-.75.69-.33.3-.66.6-1,.89-.34.12-.68.23-1.01.33-.41.13-.82.25-1.22.37.31-.28.63-.57.95-.87.24-.22.48-.45.72-.67.43-.13.86-.26,1.28-.39.35-.11.69-.23,1.04-.35Z"/>
                <path className="abc-234" d="M526.24,867.99c-.17.16-.34.32-.51.48-.24.23-.49.46-.74.7-.35.12-.69.24-1.04.35-.42.13-.85.27-1.28.39.24-.23.48-.46.72-.69.17-.16.33-.32.49-.48.44-.13.87-.26,1.3-.4.35-.11.7-.23,1.05-.35Z"/>
                <path className="abc-82" d="M527.33,866.9c-.19.2-.39.41-.59.6-.16.16-.33.32-.49.48-.35.12-.7.24-1.05.35-.43.14-.86.27-1.3.4.16-.16.33-.32.49-.49.21-.21.41-.42.61-.63.43-.12.86-.25,1.29-.38.35-.11.7-.23,1.05-.34Z"/>
                <path className="abc-153" d="M529.3,864.68c-.44.54-.91,1.08-1.4,1.61-.19.2-.38.41-.58.61-.35.12-.7.23-1.05.34-.43.14-.86.26-1.29.38.2-.21.4-.42.59-.63.51-.55,1-1.11,1.47-1.68.41-.1.83-.21,1.24-.34.34-.1.68-.2,1.01-.3Z"/>
                <path className="abc-303" d="M532.42,860.16c-.56.98-1.17,1.93-1.84,2.86-.41.56-.83,1.12-1.28,1.66-.33.1-.66.2-1.01.3-.41.13-.83.23-1.24.34.47-.56.92-1.14,1.35-1.72.71-.96,1.37-1.95,1.98-2.95.37-.09.75-.17,1.12-.26.31-.08.61-.15.91-.23Z"/>
                <path className="abc-232" d="M535.43,853.21c-.42,1.35-.91,2.66-1.48,3.93-.47,1.04-.97,2.04-1.53,3.02-.3.08-.6.15-.91.23-.37.09-.75.18-1.12.26.61-1.01,1.17-2.05,1.67-3.11.62-1.29,1.16-2.64,1.63-4.03.32-.06.63-.11.95-.15.26-.04.53-.09.79-.14Z"/>
                <path className="abc-120" d="M536.74,847.7c-.07.44-.15.88-.24,1.33-.29,1.44-.64,2.84-1.07,4.19-.26.05-.52.1-.79.14-.32.04-.63.1-.95.15.47-1.39.87-2.85,1.2-4.35.1-.46.19-.91.27-1.36.29-.03.58-.05.87-.06.24-.01.47-.02.7-.03Z"/>
                <path className="abc-401" d="M537.13,844.76c-.06.56-.12,1.11-.19,1.62-.06.43-.13.87-.2,1.31-.23,0-.47.02-.7.03-.29.02-.58.04-.87.06.08-.45.16-.9.24-1.34.09-.52.16-1.04.23-1.57.28-.03.55-.05.83-.08.23-.03.45-.04.67-.05Z"/>
                <path className="abc-389" d="M537.5,841.31c-.06.59-.13,1.18-.2,1.76-.06.56-.11,1.13-.17,1.7-.22.01-.44.02-.67.05-.27.03-.55.05-.83.08.07-.53.13-1.03.2-1.54.07-.51.13-1.03.19-1.54.28-.17.56-.34.82-.39.22-.04.44-.08.65-.11Z"/>
                <path className="abc-226" d="M538.48,624.56c-.04,47.23-.07,94.87-.12,135.18-.04,33.59.88,61.9-.68,79.79-.05.59-.12,1.19-.18,1.78-.21.03-.43.06-.65.11-.26.05-.54.22-.82.39.06-.51.12-1.03.17-1.54.99-10.18.73-29,.7-58.44-.02-4.1-.04-8.62-.03-13.5.06-31.29.13-83.12.2-136.88.27-2.99.53-5.98.78-7.37.22.49.43.58.63.49Z"/>
                <path className="abc-43" d="M538.59,427.88c0,2.17,0,4.34,0,6.5-.01,35.59-.05,112.09-.11,190.18-.2.09-.41,0-.63-.49-.25,1.38-.52,4.37-.78,7.37.1-85.65.19-175.97.2-197.71v-.8c0-2.35,0-4.62,0-6.8.24.85.49,1.71.72,1.73.2.02.4.02.6.01Z"/>
                <path className="abc-43" d="M538.59,417.11c0,1.42,0,2.85,0,4.27,0,2.17,0,4.34,0,6.5-.2,0-.4,0-.6-.01-.24-.02-.48-.88-.72-1.73,0-2.18,0-4.26,0-6.22,0-1.4,0-2.71,0-3.95.24.57.49,1.13.73,1.14.2,0,.4,0,.59,0Z"/>
                <path className="abc-140" d="M538.59,412.23v.6c0,1.42,0,2.85,0,4.27-.2,0-.4,0-.59,0-.24,0-.48-.57-.73-1.14,0-1.24,0-2.39,0-3.45v-.45c.24.08.49.17.73.17.2,0,.4,0,.59,0Z"/>
                <path className="abc-271" d="M538.59,411.63v.6c-.2,0-.4,0-.59,0-.24,0-.48-.08-.73-.17v-.43c.24,0,.49,0,.73,0,.2,0,.4,0,.59,0Z"/>
                <path className="abc-41" d="M523.13,871.93c-.42.36-.83.71-1.2,1.04-.37.14-.75.28-1.12.41-.32.11-.64.22-.96.32.36-.31.75-.64,1.15-.99.33-.11.66-.22.98-.34.38-.14.76-.28,1.14-.43Z"/>
                <path className="abc-419" d="M525.43,869.92c-.34.3-.68.6-1,.88-.44.38-.88.76-1.3,1.13-.38.15-.76.3-1.14.43-.33.12-.66.23-.98.34.41-.35.83-.71,1.26-1.09.32-.28.65-.57.98-.86.34-.12.68-.24,1.02-.37.39-.15.78-.3,1.17-.46Z"/>
                <path className="abc-70" d="M527.21,868.32c-.25.23-.51.47-.76.69-.33.3-.67.61-1.01.91-.39.16-.78.32-1.17.46-.34.13-.68.25-1.02.37.33-.29.67-.59,1-.89.25-.23.5-.46.75-.69.35-.12.69-.25,1.03-.38.4-.15.79-.31,1.18-.47Z"/>
                <path className="abc-16" d="M528.46,867.15c-.17.16-.34.32-.51.48-.24.23-.5.46-.75.69-.39.16-.78.32-1.18.47-.34.13-.69.26-1.03.38.25-.23.5-.47.74-.7.17-.16.34-.32.51-.48.35-.12.69-.25,1.04-.38.4-.15.79-.3,1.18-.46Z"/>
                <path className="abc-213" d="M529.52,866.12c-.18.19-.37.38-.56.56-.16.15-.33.31-.49.47-.39.16-.78.31-1.18.46-.34.13-.69.26-1.04.38.17-.16.33-.32.49-.48.2-.2.4-.4.59-.6.35-.12.69-.23,1.03-.36.39-.14.78-.28,1.16-.43Z"/>
                <path className="abc-18" d="M531.37,864.03c-.42.52-.85,1.03-1.31,1.52-.18.19-.36.38-.54.57-.38.15-.77.29-1.16.43-.34.12-.68.24-1.03.36.19-.2.39-.41.58-.61.49-.53.95-1.06,1.4-1.61.33-.1.65-.2.97-.3.37-.12.73-.23,1.09-.35Z"/>
                <path className="abc-123" d="M534.3,859.63c-.53.96-1.11,1.9-1.74,2.8-.38.55-.78,1.08-1.2,1.6-.36.12-.72.24-1.09.35-.32.1-.64.2-.97.3.44-.54.87-1.1,1.28-1.66.67-.93,1.28-1.88,1.84-2.86.3-.08.59-.16.89-.24.34-.09.67-.19,1-.29Z"/>
                <path className="abc-7" d="M537.08,852.87c-.38,1.3-.82,2.56-1.35,3.79-.43,1.01-.91,2.01-1.44,2.97-.33.1-.66.19-1,.29-.29.08-.59.16-.89.24.56-.98,1.07-1.98,1.53-3.02.57-1.26,1.06-2.58,1.48-3.93.26-.05.52-.1.78-.15.3-.05.59-.12.88-.19Z"/>
                <path className="abc-32" d="M538.21,847.61c-.06.43-.13.86-.2,1.29-.24,1.35-.55,2.67-.92,3.97-.29.07-.58.14-.88.19-.26.05-.51.1-.78.15.42-1.35.77-2.75,1.07-4.19.09-.45.17-.89.24-1.33.23-.01.46-.02.69-.03.26-.01.52-.03.78-.05Z"/>
                <path className="abc-271" d="M538.54,844.66c-.05.6-.1,1.17-.16,1.67-.05.42-.1.85-.16,1.28-.26.02-.52.04-.78.05-.23.01-.46.02-.69.03.07-.44.14-.88.2-1.31.08-.51.14-1.06.19-1.62.22-.01.44-.02.66-.05.25-.03.5-.04.75-.06Z"/>
                <path className="abc-57" d="M538.82,841.13c-.05.57-.1,1.12-.14,1.66-.05.63-.09,1.27-.14,1.87-.25.02-.49.03-.75.06-.22.03-.44.03-.66.05.06-.56.11-1.13.17-1.7.07-.58.14-1.17.2-1.76.21-.03.42-.06.62-.09.24-.04.47-.07.7-.1Z"/>
                <path className="abc-279" d="M539.78,623.8c-.02,46.88-.04,94.58-.07,134.7-.02,34.04.47,62.8-.76,80.89-.04.59-.08,1.17-.13,1.73-.23.03-.46.06-.7.1-.21.03-.41.06-.62.09.06-.59.13-1.19.18-1.78,1.56-17.88.64-46.2.68-79.79.05-40.31.09-87.96.12-135.18.2-.09.4-.37.61-.62.24-.1.47-.14.69-.14Z"/>
                <path className="abc-142" d="M539.84,427.85c0,2.16,0,4.32,0,6.48,0,35.56-.03,111.41-.06,189.47-.23,0-.46.04-.69.14-.21.25-.4.53-.61.62.06-78.09.09-154.59.11-190.18,0-2.17,0-4.34,0-6.5.2,0,.39-.02.59-.02.23,0,.45-.01.67-.01Z"/>
                <path className="abc-74" d="M539.85,417.1c0,1.42,0,2.84,0,4.26,0,2.16,0,4.32,0,6.48-.22,0-.45,0-.67.01-.2,0-.39.01-.59.02,0-2.17,0-4.34,0-6.5,0-1.42,0-2.85,0-4.27.2,0,.39,0,.59,0,.23,0,.45,0,.67,0Z"/>
                <path className="abc-175" d="M539.85,412.24v4.86c-.22,0-.45,0-.67,0-.19,0-.39,0-.59,0,0-1.42,0-2.85,0-4.27v-.6c.2,0,.39,0,.59,0,.23,0,.45,0,.67,0Z"/>
                <path className="abc-178" d="M539.85,411.64v.6c-.22,0-.45,0-.67,0-.19,0-.39,0-.59,0v-.6c.2,0,.39,0,.59,0,.23,0,.45,0,.67,0Z"/>
                <path className="abc-416" d="M525.31,870.99c-.43.37-.84.73-1.22,1.06-.34.16-.69.31-1.03.45-.38.16-.75.31-1.13.45.37-.32.78-.67,1.2-1.04.38-.15.76-.31,1.14-.47.35-.15.69-.3,1.04-.46Z"/>
                <path className="abc-30" d="M527.63,868.95c-.34.3-.68.6-1.01.89-.44.39-.89.78-1.31,1.15-.34.16-.69.31-1.04.46-.38.16-.76.32-1.14.47.42-.36.86-.75,1.3-1.13.32-.29.66-.58,1-.88.39-.16.78-.33,1.16-.5.35-.15.7-.31,1.04-.47Z"/>
                <path className="abc-373" d="M529.4,867.35c-.25.23-.51.46-.76.69-.33.3-.68.61-1.01.91-.34.16-.69.32-1.04.47-.38.17-.77.34-1.16.5.34-.3.68-.61,1.01-.91.25-.23.51-.46.76-.69.39-.16.78-.33,1.16-.5.35-.15.69-.31,1.04-.47Z"/>
                <path className="abc-110" d="M530.65,866.21c-.17.15-.33.31-.5.46-.24.22-.49.45-.74.68-.34.16-.69.31-1.04.47-.38.17-.77.34-1.16.5.25-.23.51-.47.75-.69.17-.16.34-.32.51-.48.39-.16.78-.32,1.16-.49.35-.15.69-.3,1.03-.46Z"/>
                <path className="abc-313" d="M531.66,865.24c-.17.17-.34.34-.52.51-.16.15-.32.3-.49.46-.34.15-.68.31-1.03.46-.38.16-.77.33-1.16.49.17-.16.33-.32.49-.47.19-.18.38-.37.56-.56.38-.15.76-.3,1.13-.45.34-.14.68-.28,1.01-.43Z"/>
                <path className="abc-413" d="M533.41,863.27c-.4.5-.81.98-1.24,1.45-.17.18-.33.35-.51.52-.33.15-.67.29-1.01.43-.37.15-.75.3-1.13.45.18-.19.37-.38.54-.57.46-.49.89-1,1.31-1.52.36-.12.72-.25,1.07-.38.32-.12.65-.25.97-.38Z"/>
                <path className="abc-63" d="M536.16,859.02c-.49.94-1.03,1.84-1.62,2.71-.36.53-.73,1.04-1.13,1.54-.32.13-.64.26-.97.38-.36.14-.71.26-1.07.38.42-.52.82-1.05,1.2-1.6.63-.9,1.21-1.84,1.74-2.8.33-.1.65-.2.98-.3.29-.09.59-.2.88-.31Z"/>
                <path className="abc-71" d="M538.68,852.46c-.33,1.25-.74,2.48-1.21,3.68-.39.99-.83,1.95-1.32,2.88-.29.11-.58.22-.88.31-.32.1-.65.2-.98.3.53-.96,1.01-1.96,1.44-2.97.52-1.23.97-2.49,1.35-3.79.29-.07.57-.14.85-.2.25-.06.5-.13.75-.21Z"/>
                <path className="abc-27" d="M539.65,847.41c-.05.42-.11.84-.17,1.26-.2,1.27-.46,2.54-.8,3.78-.24.08-.49.16-.75.21-.28.06-.56.13-.85.2.38-1.3.68-2.62.92-3.97.08-.43.14-.87.2-1.29.26-.02.51-.05.76-.08.23-.03.45-.07.67-.12Z"/>
                <path className="abc-422" d="M539.91,844.49c-.04.61-.08,1.19-.13,1.67-.04.42-.08.84-.13,1.26-.22.05-.45.09-.67.12-.25.04-.51.06-.76.08.06-.43.11-.86.16-1.28.06-.5.11-1.07.16-1.67.24-.02.49-.03.73-.07.22-.04.43-.07.65-.1Z"/>
                <path className="abc-179" d="M540.12,840.93c-.03.55-.06,1.06-.09,1.57-.04.7-.08,1.38-.12,1.99-.21.03-.43.06-.65.1-.24.04-.48.06-.73.07.05-.6.09-1.24.14-1.87.05-.54.1-1.09.14-1.66.23-.03.46-.06.68-.1.21-.03.41-.07.62-.1Z"/>
                <path className="abc-127" d="M541.07,634.84c0,54.4-.02,106.37-.03,137.25,0,9.04.01,16.76,0,22.83-.01,13.46-.28,33.31-.84,44.32-.03.58-.05,1.14-.08,1.68-.2.04-.41.07-.62.1-.23.04-.45.07-.68.1.05-.57.09-1.15.13-1.73,1.23-18.09.74-46.85.76-80.89.03-40.12.05-87.83.07-134.7.23,0,.45.03.68.05.21,2.83.41,6.91.61,10.99Z"/>
                <path className="abc-282" d="M541.09,425.17c0,1.42,0,2.82,0,4.24,0,24.51-.02,117.93-.03,205.43-.2-4.08-.4-8.16-.61-10.99-.23-.03-.45-.06-.68-.05.03-78.05.06-153.91.06-189.47,0-2.16,0-4.32,0-6.48.22,0,.44,0,.66,0,.2,0,.4-1.34.59-2.68Z"/>
                <path className="abc-205" d="M541.09,416.36c0,1.43,0,2.98,0,4.57,0,1.42,0,2.82,0,4.24-.19,1.34-.39,2.69-.59,2.68-.22,0-.44,0-.66,0,0-2.16,0-4.32,0-6.48,0-1.42,0-2.84,0-4.26.22,0,.44,0,.66,0,.2,0,.39-.37.59-.74Z"/>
                <path className="abc-96" d="M541.09,412.07v.46c0,1.1,0,2.4,0,3.83-.19.37-.39.74-.59.74-.22,0-.44,0-.66,0v-4.86c.22,0,.44,0,.66,0,.2,0,.39-.08.59-.17Z"/>
                <path className="abc-188" d="M541.09,411.64v.43c-.19.08-.39.17-.59.17-.22,0-.44,0-.66,0v-.6c.22,0,.44,0,.66,0,.2,0,.39,0,.59,0Z"/>
                <path className="abc-234" d="M527.02,870.15c-.4.36-.78.7-1.15,1.02-.25.13-.5.26-.75.39-.34.17-.69.34-1.03.5.38-.33.8-.69,1.22-1.06.34-.16.69-.32,1.03-.49.22-.11.45-.23.68-.35Z"/>
                <path className="abc-162" d="M529.19,868.19c-.32.29-.64.58-.95.86-.42.37-.83.74-1.22,1.1-.23.12-.45.24-.68.35-.34.17-.68.33-1.03.49.43-.37.87-.76,1.31-1.15.33-.29.67-.59,1.01-.89.34-.16.68-.32,1.02-.49.18-.09.36-.18.54-.27Z"/>
                <path className="abc-45" d="M530.84,866.67c-.23.22-.46.44-.7.65-.31.29-.64.58-.95.87-.18.09-.36.18-.54.27-.34.16-.68.33-1.02.49.34-.3.68-.61,1.01-.91.25-.23.51-.46.76-.69.34-.16.68-.32,1.01-.48.14-.07.29-.14.43-.21Z"/>
                <path className="abc-449" d="M532,865.58c-.15.15-.31.3-.47.44-.23.21-.46.43-.69.65-.14.07-.28.14-.43.21-.33.16-.67.32-1.01.48.25-.23.5-.46.74-.68.17-.16.34-.31.5-.46.34-.15.67-.31,1.01-.47.11-.05.23-.11.34-.16Z"/>
                <path className="abc-109" d="M532.97,864.63c-.17.17-.34.34-.52.51-.15.14-.3.29-.45.44-.11.06-.23.11-.34.16-.33.16-.67.31-1.01.47.17-.15.33-.31.49-.46.18-.17.35-.34.52-.51.33-.15.67-.3.99-.45.1-.05.21-.1.32-.16Z"/>
                <path className="abc-409" d="M534.71,862.65c-.39.5-.8.99-1.23,1.46-.17.18-.33.35-.5.52-.11.05-.21.11-.32.16-.33.16-.66.31-.99.45.17-.17.34-.35.51-.52.43-.47.85-.95,1.24-1.45.32-.13.64-.27.96-.42.11-.05.22-.12.34-.2Z"/>
                <path className="abc-332" d="M537.41,858.41c-.48.93-1.01,1.83-1.59,2.7-.35.53-.72,1.04-1.11,1.54-.11.08-.23.15-.34.2-.32.15-.64.28-.96.42.4-.5.77-1.01,1.13-1.54.59-.87,1.13-1.77,1.62-2.71.29-.11.58-.23.86-.35.13-.05.26-.15.39-.26Z"/>
                <path className="abc-397" d="M539.86,851.96c-.32,1.22-.71,2.42-1.17,3.6-.38.97-.81,1.92-1.28,2.85-.13.11-.26.21-.39.26-.28.12-.57.24-.86.35.49-.94.93-1.9,1.32-2.88.47-1.2.88-2.43,1.21-3.68.24-.08.49-.17.73-.26.15-.05.3-.14.45-.24Z"/>
                <path className="abc-355" d="M540.79,847.05c-.05.41-.1.83-.17,1.25-.19,1.22-.44,2.45-.76,3.67-.15.1-.3.19-.45.24-.24.09-.48.18-.73.26.33-1.25.6-2.51.8-3.78.07-.42.12-.84.17-1.26.22-.05.44-.11.66-.18.16-.05.32-.12.48-.19Z"/>
                <path className="abc-420" d="M541.04,844.19c-.04.6-.08,1.15-.12,1.62-.04.41-.08.83-.13,1.24-.16.07-.32.14-.48.19-.21.07-.43.13-.66.18.05-.42.09-.84.13-1.26.04-.48.09-1.06.13-1.67.21-.03.42-.07.63-.13.17-.04.33-.1.49-.17Z"/>
                <path className="abc-324" d="M541.24,840.66c-.03.55-.05,1.07-.09,1.59-.04.68-.08,1.34-.12,1.94-.16.06-.33.12-.49.17-.21.06-.42.1-.63.13.04-.61.08-1.29.12-1.99.03-.51.06-1.02.09-1.57.2-.03.41-.07.61-.12.17-.04.34-.09.51-.15Z"/>
                <path className="abc-393" d="M542.12,642.06c0,52.2-.01,101.61-.02,131.12,0,9.26,0,17.08-.02,23.09-.03,12.77-.3,32.04-.76,42.71-.02.58-.05,1.13-.08,1.68-.17.06-.34.11-.51.15-.21.05-.41.08-.61.12.03-.55.05-1.1.08-1.68.55-11.01.82-30.85.84-44.32,0-6.08,0-13.8,0-22.83,0-30.89.02-82.85.03-137.25.2,4.08.4,8.16.61,10.98.15.7.3-1.53.45-3.77Z"/>
                <path className="abc-366" d="M542.2,425.13c.01,1.41.02,2.83.03,4.24.11,17.31-.1,65.02-.11,121.39,0,29.09,0,60.67-.01,91.3-.15,2.24-.29,4.47-.45,3.77-.21-2.83-.41-6.91-.61-10.98.01-87.5.03-180.92.03-205.43,0-1.42,0-2.82,0-4.24.19-1.34.39-2.68.58-2.67.19.02.36,1.32.53,2.62Z"/>
                <path className="abc-210" d="M542.07,416.32c.03,1.43.07,2.99.09,4.57.02,1.41.03,2.83.05,4.24-.17-1.3-.34-2.6-.53-2.62-.19-.02-.38,1.32-.58,2.67,0-1.42,0-2.82,0-4.24,0-1.59,0-3.14,0-4.57.19-.37.39-.74.58-.74.18,0,.29.34.4.69Z"/>
                <path className="abc-143" d="M542.16,412.06c-.01.14-.03.29-.04.45-.08,1.08-.07,2.38-.05,3.81-.11-.35-.21-.7-.4-.69-.19,0-.38.37-.58.74,0-1.43,0-2.73,0-3.83v-.46c.19-.08.39-.17.58-.17.18,0,.33.07.48.15Z"/>
                <path className="abc-325" d="M542.2,411.65c-.02.13-.03.27-.05.41-.15-.08-.31-.16-.48-.15-.19,0-.38.08-.58.17v-.43c.19,0,.39,0,.58,0,.18,0,.36,0,.53,0Z"/>
                <path className="abc-301" d="M528.62,869.23c-.34.32-.66.64-.98.92-.34.21-.68.41-1.02.6-.25.14-.5.28-.75.42.37-.32.75-.66,1.15-1.02.23-.12.46-.25.68-.37.31-.17.62-.35.92-.54Z"/>
                <path className="abc-231" d="M530.45,867.5c-.27.26-.53.52-.79.75-.35.32-.69.65-1.03.97-.31.19-.62.37-.92.54-.23.13-.45.25-.68.37.4-.36.8-.73,1.22-1.1.31-.28.63-.57.95-.86.18-.09.36-.19.54-.28.24-.13.48-.27.72-.4Z"/>
                <path className="abc-288" d="M531.83,866.15c-.19.2-.39.4-.59.58-.26.24-.53.51-.79.77-.24.14-.48.27-.72.4-.18.1-.36.19-.54.28.32-.29.64-.58.95-.87.24-.22.47-.44.7-.65.14-.07.28-.14.42-.21.19-.1.38-.2.57-.3Z"/>
                <path className="abc-133" d="M532.79,865.18c-.13.13-.26.27-.39.4-.19.18-.38.38-.57.58-.19.1-.38.2-.57.3-.14.07-.28.14-.42.21.23-.22.46-.44.69-.65.16-.15.31-.3.47-.44.11-.06.23-.11.34-.17.15-.08.31-.15.46-.23Z"/>
                <path className="abc-172" d="M533.72,864.22c-.18.19-.36.37-.54.56-.13.12-.25.26-.38.39-.15.08-.3.15-.46.23-.11.06-.23.11-.34.17.15-.15.3-.29.45-.44.18-.17.35-.34.52-.51.11-.05.21-.11.32-.17.14-.08.29-.16.43-.24Z"/>
                <path className="abc-109" d="M535.52,862.08c-.41.53-.83,1.06-1.28,1.57-.17.2-.34.38-.52.57-.14.08-.29.16-.43.24-.11.06-.21.11-.32.17.17-.17.34-.34.5-.52.43-.47.84-.96,1.23-1.46.11-.08.23-.16.34-.23.15-.09.31-.22.47-.34Z"/>
                <path className="abc-293" d="M538.32,857.65c-.49.95-1.04,1.88-1.64,2.79-.36.55-.75,1.1-1.15,1.63-.16.13-.32.25-.47.34-.11.07-.23.15-.34.23.39-.5.76-1.01,1.11-1.54.58-.87,1.11-1.77,1.59-2.7.13-.11.26-.22.39-.3.17-.1.35-.28.52-.46Z"/>
                <path className="abc-386" d="M540.87,851.19c-.34,1.2-.74,2.39-1.22,3.58-.39.97-.84,1.94-1.33,2.89-.18.18-.35.36-.52.46-.12.08-.25.19-.39.3.48-.93.9-1.88,1.28-2.85.46-1.18.85-2.38,1.17-3.6.15-.1.3-.2.44-.29.19-.12.38-.3.57-.48Z"/>
                <path className="abc-379" d="M541.87,846.41c-.06.4-.12.8-.19,1.2-.21,1.18-.48,2.38-.81,3.58-.19.18-.38.36-.57.48-.14.09-.29.2-.44.29.32-1.22.57-2.44.76-3.67.06-.41.12-.83.17-1.25.16-.07.31-.15.47-.24.21-.12.41-.25.61-.39Z"/>
                <path className="abc-199" d="M542.16,843.71c-.04.55-.09,1.07-.14,1.52-.04.39-.09.79-.15,1.19-.2.14-.4.27-.61.39-.15.09-.31.17-.47.24.05-.41.09-.83.13-1.24.04-.47.08-1.03.12-1.62.16-.06.32-.13.48-.19.21-.08.43-.18.64-.29Z"/>
                <path className="abc-330" d="M542.41,840.24c-.03.58-.07,1.16-.12,1.74-.04.59-.08,1.18-.13,1.73-.21.1-.42.21-.64.29-.16.06-.32.13-.48.19.04-.6.08-1.26.12-1.94.03-.52.06-1.04.09-1.59.17-.06.34-.12.5-.17.22-.07.45-.16.67-.25Z"/>
                <path className="abc-417" d="M543.09,630.72c.01,44.87.02,90.11,0,128.33,0,2.11,0,4.19,0,6.25-.01,30.71.11,56.49-.59,73.21-.02.58-.05,1.16-.09,1.74-.22.09-.44.18-.67.25-.16.05-.33.11-.5.17.03-.55.05-1.1.08-1.68.46-10.67.73-29.94.76-42.71.02-6.01.02-13.83.02-23.09,0-29.5.01-78.92.02-131.12.15-2.24.29-4.48.44-3.79.19-2.6.36-5.08.53-7.55Z"/>
                <path className="abc-77" d="M543.19,427.76c0,2.16.01,4.32.02,6.48.06,24.23-.15,67.44-.14,117.2,0,25.23.01,52.17.02,79.28-.17,2.47-.33,4.94-.53,7.55-.15-.69-.29,1.55-.44,3.79,0-30.62,0-62.21.01-91.3,0-56.38.21-104.08.11-121.39,0-1.41-.02-2.83-.03-4.24.17,1.3.34,2.6.52,2.62.18.02.33.02.47.02Z"/>
                <path className="abc-186" d="M543.11,417.04c0,1.42.05,2.84.05,4.25.01,2.16.02,4.32.03,6.47-.14,0-.29,0-.47-.02-.19-.02-.35-1.32-.52-2.62-.01-1.41-.03-2.83-.05-4.24-.01-1.58-.06-3.13-.09-4.57.11.35.21.7.39.7.21,0,.43.02.65.02Z"/>
                <path className="abc-244" d="M543.3,412.21c-.03.19-.05.4-.07.61-.11,1.39-.14,2.81-.13,4.22-.22,0-.44-.02-.65-.02-.18,0-.28-.35-.39-.7-.03-1.43-.03-2.74.05-3.81.01-.15.02-.3.04-.45.15.08.3.16.47.16.23,0,.46,0,.67,0Z"/>
                <path className="abc-369" d="M543.41,411.65c-.04.17-.08.37-.11.56-.22,0-.44.01-.67,0-.17,0-.32-.08-.47-.16.01-.14.03-.28.05-.41.18,0,.35,0,.52,0,.23,0,.46,0,.69,0Z"/>
                <path className="abc-37" d="M530.18,868.22c-.28.28-.56.55-.83.79-.23.17-.46.33-.7.48-.33.23-.67.44-1.01.65.32-.28.65-.59.98-.92.31-.19.62-.38.92-.58.21-.14.42-.28.63-.43Z"/>
                <path className="abc-455" d="M531.66,866.76c-.21.22-.42.43-.63.63-.29.27-.57.55-.85.83-.21.15-.42.29-.63.43-.3.2-.61.39-.92.58.34-.32.68-.66,1.03-.97.26-.24.53-.5.79-.75.24-.14.48-.28.72-.43.17-.1.33-.21.5-.31Z"/>
                <path className="abc-81" d="M532.77,865.62c-.16.17-.32.35-.48.5-.21.21-.42.42-.63.64-.16.11-.33.21-.5.31-.24.15-.48.29-.72.43.27-.26.53-.52.79-.77.2-.19.39-.39.59-.58.19-.1.37-.21.56-.31.13-.07.26-.15.39-.23Z"/>
                <path className="abc-276" d="M533.56,864.78c-.1.12-.21.23-.32.34-.15.16-.31.33-.47.5-.13.08-.26.15-.39.23-.18.11-.37.21-.56.31.19-.2.38-.4.57-.58.13-.13.26-.26.39-.4.15-.08.3-.16.45-.24.1-.06.21-.11.31-.17Z"/>
                <path className="abc-445" d="M534.44,863.8c-.19.21-.38.43-.57.64-.1.11-.21.22-.31.34-.1.06-.21.11-.31.17-.15.08-.3.16-.45.24.13-.13.26-.27.38-.39.18-.19.36-.37.54-.56.14-.08.29-.17.43-.25.1-.06.2-.12.29-.17Z"/>
                <path className="abc-223" d="M536.31,861.47c-.42.57-.86,1.13-1.32,1.68-.18.21-.36.43-.55.64-.1.06-.2.12-.29.17-.14.08-.28.17-.43.25.18-.19.35-.38.52-.57.45-.51.87-1.04,1.28-1.57.16-.13.32-.26.47-.36.11-.07.21-.16.32-.24Z"/>
                <path className="abc-323" d="M539.18,856.84c-.51.98-1.07,1.95-1.68,2.91-.37.58-.77,1.16-1.19,1.72-.11.09-.22.17-.32.24-.15.1-.31.23-.47.36.4-.53.79-1.08,1.15-1.63.6-.91,1.15-1.84,1.64-2.79.18-.18.35-.36.51-.49.11-.08.23-.21.35-.32Z"/>
                <path className="abc-22" d="M541.79,850.32c-.35,1.18-.76,2.38-1.25,3.58-.4.98-.85,1.97-1.36,2.95-.12.12-.24.24-.35.32-.16.12-.34.31-.51.49.49-.95.94-1.91,1.33-2.89.48-1.19.88-2.38,1.22-3.58.19-.18.37-.37.55-.52.13-.1.25-.23.37-.35Z"/>
                <path className="abc-384" d="M542.85,845.69c-.06.37-.14.75-.21,1.13-.22,1.14-.5,2.31-.85,3.5-.12.13-.25.25-.37.35-.18.15-.36.33-.55.52.34-1.2.61-2.39.81-3.58.07-.4.13-.8.19-1.2.2-.14.4-.28.59-.43.13-.1.27-.2.4-.3Z"/>
                <path className="abc-236" d="M543.19,843.2c-.05.48-.1.94-.16,1.37-.05.37-.11.74-.17,1.11-.13.1-.26.2-.4.3-.19.14-.39.29-.59.43.06-.4.1-.8.15-1.19.05-.45.1-.97.14-1.52.21-.1.42-.21.62-.3.14-.06.28-.14.42-.21Z"/>
                <path className="abc-263" d="M543.49,839.8c-.04.63-.1,1.27-.16,1.92-.04.5-.09,1-.14,1.47-.14.07-.28.14-.42.21-.2.09-.41.2-.62.3.04-.55.09-1.13.13-1.73.05-.59.09-1.16.12-1.74.22-.09.44-.18.65-.26.15-.05.29-.12.44-.18Z"/>
                <path className="abc-220" d="M544.02,623.19c0,48.5,0,97.82-.02,138.71,0,1.9,0,3.78,0,5.64,0,29.51.26,54.24-.4,70.44-.02.58-.06,1.19-.1,1.82-.14.06-.29.12-.44.18-.21.08-.43.17-.65.26.03-.58.06-1.16.09-1.74.7-16.72.58-42.49.59-73.21,0-2.06,0-4.15,0-6.25.01-38.22,0-83.45,0-128.33.17-2.47.33-4.92.51-7.47.14-.04.29-.05.43-.06Z"/>
                <path className="abc-196" d="M544.18,427.69c-.01,2.15-.04,4.31-.05,6.46-.1,35.38-.11,111.15-.11,189.04-.14.01-.29.03-.43.06-.18,2.55-.34,5.01-.51,7.47,0-27.11-.01-54.06-.02-79.28,0-49.76.21-92.97.14-117.2,0-2.16-.01-4.32-.02-6.48.14,0,.28-.02.44-.05.17-.04.36-.03.54-.03Z"/>
                <path className="abc-94" d="M544.07,416.91c0,1.46.05,2.94.07,4.32.05,2.15.04,4.3.03,6.45-.18,0-.37,0-.54.03-.16.03-.3.04-.44.05,0-2.16-.02-4.32-.03-6.47,0-1.4-.05-2.83-.05-4.25.22,0,.43,0,.62-.03.15-.03.25-.06.34-.1Z"/>
                <path className="abc-8" d="M544.39,412.15c-.04.17-.07.37-.09.56-.17,1.3-.22,2.74-.22,4.2-.09.04-.19.08-.34.1-.19.03-.4.03-.62.03,0-1.42.01-2.83.13-4.22.02-.21.04-.42.07-.61.22,0,.43-.02.65-.03.14,0,.29-.02.44-.03Z"/>
                <path className="abc-410" d="M544.53,411.65c-.05.15-.1.32-.14.5-.14,0-.29.02-.44.03-.22.01-.43.03-.65.03.03-.19.07-.39.11-.56.23,0,.45,0,.66,0,.15,0,.3,0,.45,0Z"/>
                <path className="abc-84" d="M531.59,867.18c-.23.22-.46.44-.69.65-.29.23-.57.46-.86.68-.23.17-.46.34-.69.51.27-.24.55-.51.83-.79.21-.15.42-.3.63-.45.26-.19.52-.39.78-.6Z"/>
                <path className="abc-391" d="M532.77,866c-.16.17-.32.34-.5.5-.23.22-.46.45-.69.67-.26.2-.52.4-.78.6-.21.15-.42.3-.63.45.28-.28.57-.57.85-.83.21-.2.42-.41.63-.63.16-.11.33-.22.49-.33.21-.14.41-.29.61-.43Z"/>
                <path className="abc-35" d="M533.64,865.08c-.12.14-.25.28-.38.41-.17.17-.32.34-.49.51-.2.15-.41.29-.61.43-.16.11-.33.22-.49.33.21-.22.42-.43.63-.64.16-.16.32-.33.48-.5.13-.08.26-.15.38-.23.16-.1.32-.2.48-.31Z"/>
                <path className="abc-139" d="M534.26,864.39c-.08.09-.16.19-.25.28-.12.13-.25.27-.37.41-.16.1-.32.21-.48.31-.13.08-.25.16-.38.23.16-.17.32-.35.47-.5.11-.11.21-.22.32-.34.1-.06.21-.11.31-.17.13-.07.26-.14.39-.22Z"/>
                <path className="abc-190" d="M535.09,863.42c-.19.23-.39.47-.59.69-.08.09-.16.18-.25.28-.13.07-.26.14-.39.22-.1.06-.21.11-.31.17.1-.12.21-.23.31-.34.19-.21.38-.42.57-.64.1-.06.19-.12.29-.17.12-.07.24-.14.36-.21Z"/>
                <path className="abc-326" d="M537.01,860.95c-.43.6-.88,1.19-1.36,1.78-.18.23-.37.46-.57.69-.12.07-.24.14-.36.21-.1.06-.19.11-.29.17.19-.21.37-.43.55-.64.46-.55.9-1.12,1.32-1.68.11-.09.21-.17.32-.24.13-.09.26-.19.39-.29Z"/>
                <path className="abc-237" d="M539.95,856.14c-.51,1-1.08,2-1.72,3-.38.6-.79,1.21-1.22,1.8-.13.1-.26.21-.39.29-.1.07-.21.15-.32.24.42-.57.81-1.14,1.19-1.72.62-.96,1.18-1.93,1.68-2.91.12-.12.23-.24.34-.32.14-.1.28-.25.42-.39Z"/>
                <path className="abc-293" d="M542.6,849.58c-.36,1.17-.78,2.36-1.28,3.57-.41.99-.87,1.99-1.38,2.99-.14.14-.29.29-.42.39-.11.08-.23.2-.34.32.51-.98.96-1.96,1.36-2.95.49-1.2.9-2.39,1.25-3.58.12-.13.24-.25.36-.34.15-.12.3-.26.45-.39Z"/>
                <path className="abc-21" d="M543.72,845.07c-.07.36-.15.72-.23,1.09-.24,1.11-.53,2.26-.89,3.43-.15.13-.3.28-.45.39-.12.09-.24.22-.36.34.35-1.18.63-2.35.85-3.5.07-.39.15-.76.21-1.13.13-.1.26-.2.39-.29.16-.12.32-.23.48-.33Z"/>
                <path className="abc-417" d="M544.09,842.75c-.06.42-.12.83-.18,1.25-.06.36-.12.7-.19,1.06-.16.1-.31.21-.48.33-.13.09-.26.19-.39.29.06-.37.12-.74.17-1.11.06-.44.11-.9.16-1.37.14-.07.27-.14.41-.2.17-.08.33-.16.5-.24Z"/>
                <path className="abc-299" d="M544.44,839.43c-.05.66-.12,1.36-.2,2.06-.04.42-.09.84-.15,1.26-.16.08-.33.17-.5.24-.13.06-.27.13-.41.2.05-.48.1-.97.14-1.47.07-.65.12-1.3.16-1.92.14-.06.29-.12.43-.17.17-.06.35-.13.52-.2Z"/>
                <path className="abc-17" d="M544.87,631.58c-.06,58.53-.1,116.51-.13,155.18-.01,22.8.14,40.06-.14,48.62-.01.67-.03,1.4-.06,2.17-.02.58-.06,1.22-.11,1.88-.17.07-.35.14-.52.2-.14.05-.28.11-.43.17.04-.63.08-1.24.1-1.82.66-16.21.4-40.93.4-70.44,0-1.86,0-3.74,0-5.64.02-40.89.02-90.21.02-138.71.14-.01.28-.03.41-.07.15,3.09.3,5.78.44,8.47Z"/>
                <path className="abc-393" d="M545.16,421.9c-.01,1.45-.04,2.98-.04,4.57-.07,26.61-.16,116.43-.25,205.11-.14-2.69-.29-5.38-.44-8.47-.13.04-.27.05-.41.07,0-77.89,0-153.66.11-189.04,0-2.15.03-4.3.05-6.46.18,0,.36,0,.52-.05.17-1.92.32-3.83.46-5.74Z"/>
                <path className="abc-419" d="M545.01,415.16c.01.89.07,1.8.1,2.61.05,1.3.05,2.68.04,4.13-.14,1.91-.29,3.81-.46,5.74-.16.05-.34.06-.52.05.01-2.15.02-4.31-.03-6.45-.03-1.38-.08-2.86-.07-4.32.09-.04.18-.09.32-.13.18-.59.4-1.1.62-1.62Z"/>
                <path className="abc-41" d="M545.32,412.14c-.05.17-.09.35-.13.53-.15.73-.19,1.6-.17,2.49-.22.51-.44,1.03-.62,1.62-.14.05-.23.09-.32.13,0-1.46.05-2.9.22-4.2.02-.2.05-.39.09-.56.14-.01.29-.02.42-.04.18.02.35.02.51.03Z"/>
                <path className="abc-190" d="M545.49,411.65c-.07.16-.13.32-.18.49-.16,0-.33-.02-.51-.03-.13.02-.28.03-.42.04.04-.17.08-.35.14-.5.15,0,.29,0,.44,0,.18,0,.36,0,.53,0Z"/>
                <path className="abc-315" d="M532.35,866.55c-.2.19-.4.37-.61.55-.28.25-.56.49-.85.72.23-.2.46-.43.69-.65.26-.2.52-.41.77-.63Z"/>
                <path className="abc-67" d="M533.38,865.54c-.14.15-.29.29-.43.44-.19.19-.39.38-.59.57-.25.21-.51.42-.77.63.23-.22.46-.45.69-.67.17-.16.33-.33.5-.5.2-.15.41-.3.61-.46Z"/>
                <path className="abc-443" d="M534.12,864.75c-.1.11-.21.23-.32.34-.14.15-.28.3-.42.44-.2.16-.4.31-.61.46.16-.17.32-.34.49-.51.13-.13.25-.27.38-.41.16-.1.32-.21.48-.32Z"/>
                <path className="abc-218" d="M534.64,864.17c-.07.08-.14.16-.21.24-.1.12-.21.23-.31.35-.16.11-.32.22-.48.32.12-.14.25-.28.37-.41.08-.09.17-.19.25-.28.13-.07.26-.15.38-.22Z"/>
                <path className="abc-450" d="M535.44,863.23c-.19.23-.39.47-.59.7-.07.08-.14.16-.21.24-.13.07-.25.15-.38.22.08-.09.16-.19.25-.28.2-.22.4-.46.59-.69.12-.07.24-.13.35-.19Z"/>
                <path className="abc-25" d="M537.39,860.69c-.43.61-.89,1.23-1.38,1.84-.19.23-.38.47-.57.7-.12.06-.23.13-.35.19.19-.23.38-.47.57-.69.48-.59.93-1.19,1.36-1.78.13-.1.26-.19.38-.26Z"/>
                <path className="abc-251" d="M540.36,855.8c-.52,1.01-1.09,2.02-1.73,3.04-.39.62-.8,1.23-1.23,1.85-.12.06-.25.16-.38.26.43-.6.83-1.2,1.22-1.8.63-.99,1.2-2,1.72-3,.14-.14.28-.27.41-.34Z"/>
                <path className="abc-85" d="M543.04,849.26c-.36,1.16-.79,2.34-1.29,3.55-.41.99-.87,1.99-1.39,3-.13.07-.27.2-.41.34.51-1,.97-2,1.38-2.99.5-1.2.92-2.4,1.28-3.57.15-.13.29-.25.44-.33Z"/>
                <path className="abc-216" d="M544.18,844.8c-.07.36-.15.72-.23,1.08-.25,1.09-.54,2.22-.91,3.37-.14.07-.29.19-.44.33.36-1.17.65-2.32.89-3.43.08-.37.16-.73.23-1.09.16-.1.31-.19.46-.27Z"/>
                <path className="abc-352" d="M544.57,842.53c-.06.4-.12.8-.2,1.21-.06.35-.13.7-.2,1.05-.15.08-.3.17-.46.27.07-.36.14-.71.19-1.06.07-.42.13-.83.18-1.25.16-.08.32-.16.48-.22Z"/>
                <path className="abc-35" d="M544.93,839.26c-.05.67-.12,1.37-.21,2.12-.05.38-.1.77-.16,1.16-.15.06-.31.14-.48.22.06-.42.1-.83.15-1.26.08-.71.15-1.41.2-2.06.17-.07.34-.13.5-.18Z"/>
                <path className="abc-170" d="M545.29,640.08c-.11,98.32-.2,192.35-.2,194.84,0,.7,0,1.54-.04,2.46-.02.58-.06,1.21-.11,1.88-.16.05-.33.11-.5.18.05-.66.09-1.29.11-1.88.03-.77.05-1.5.06-2.17.28-8.56.12-25.82.14-48.62.03-38.68.07-96.66.13-155.18.15,2.69.29,5.39.42,8.49Z"/>
                <path className="abc-441" d="M545.6,416.17c0,.75,0,1.65-.01,2.69-.06,17.86-.19,121.74-.3,221.22-.13-3.11-.27-5.8-.42-8.49.08-88.68.18-178.5.25-205.11,0-1.59.03-3.12.04-4.57.14-1.91.28-3.81.44-5.73Z"/>
                <path className="abc-38" d="M545.61,413.55c0,.27,0,.54,0,.8,0,.46,0,1.06,0,1.82-.15,1.92-.29,3.83-.44,5.73.01-1.45,0-2.83-.04-4.13-.03-.81-.09-1.72-.1-2.61.22-.51.43-1.03.59-1.61Z"/>
                <path className="abc-234" d="M545.8,412.18c-.05.18-.1.37-.13.57-.04.26-.06.53-.06.8-.16.59-.38,1.1-.59,1.61-.01-.89.02-1.76.17-2.49.03-.18.08-.36.13-.53.16,0,.32.02.48.03Z"/>
                <path className="abc-53" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
              </g>
              <g>
                <path className="abc-51" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
              </g>
              <g>
                <path className="abc-51" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
              </g>
            </g>
          </g>
          </g>
        </g>
      </g>
    </g>
    ////water wooden stand///
    {!aceticFocusMode && (
    <g id="Layer_11" data-name="Layer 11" style={{ pointerEvents: 'none' }}>
      <g>
        <g>
          <g>
            <path className="abc-46" d="M325.44,644.1c-.03.38-.07.76-.07,1.14v40.28h611v-40.28c0-.38-.04-.75-.08-1.14H325.44Z"/>
            <path className="abc-192" d="M936.38,685.82H325.38c-.17,0-.3-.13-.3-.3v-40.28c0-.3.02-.61.05-.91l.02-.25c0-.16.14-.28.29-.28h610.86c.15,0,.28.11.29.26.04.37.08.77.08,1.16v40.28c0,.17-.13.3-.29.3ZM325.68,685.23h610.41v-39.99c0-.28-.01-.56-.04-.83H325.72c-.02.28-.04.56-.04.83v39.99Z"/>
          </g>
          <path className="abc-204" d="M325.86,644.1c-.05.38-.08.76-.08,1.14v3.61s0-3.89,3.36-3.89h604.51s2.73.45,2.73,2.52v-2.24c0-.38-.04-.75-.07-1.14H325.86Z"/>
          <g className="abc-135">
            <path className="abc-102" d="M817.91,660.91c-84.15-10.42-68.29,4.73-197.57,6.62-103.86,1.53-243.91-6.12-294.97-9.18v5.75c37.63,1.9,108.59,5.5,158.37,8.16,70.73,3.8,146.22.26,204.89,6.16,65.86,6.62,103.67,4.74,160.97,1.89,0,0,40.54-3.08,86.77-1.38v-7.84c-42.38,4.01-57.02-2.58-118.47-10.19ZM755.64,675.79c-70.73-1.25-62.56-4.24-21.01-10.01,41.55-5.76,86.94,3.85,86.94,3.85,23.53,3.89,4.77,7.41-65.93,6.16Z"/>
            <path className="abc-104" d="M784.22,651.04s36.12,2.7,86.12,10.46c27.13,4.2,47.61,5.55,66.04,2.04v-5.5c-35.77,6.04-103.41-6.16-152.16-6.99Z"/>
            <path className="abc-104" d="M429.69,655.49c-74.21.86,79.13,8.14,184.45,5.64,0,0-110.25-6.48-184.45-5.64Z"/>
            <path className="abc-104" d="M683.23,656.31c-35.38,5.62-70.05,3.02-50.63,4.75,19.42,1.72,50.63-1.73,77.67-6.05,21.69-3.45,63.13-3.87,63.13-3.87-32.6-3.03-54.79-.44-90.16,5.17Z"/>
            <path className="abc-105" d="M478.27,678.87s-90.86-7.33-132.93-4.01c-42.08,3.35,14.02,4.01,73.17,5.67,59.15,1.68,91.47,0,59.76-1.67Z"/>
            <path className="abc-103" d="M761.49,672.91c-37.75-.98-33.36-2.26-11.13-4.53,22.24-2.28,46.39,2.23,46.39,2.23,12.53,1.86,2.49,3.29-35.27,2.3Z"/>
          </g>
          <g className="abc-101">
            <path className="abc-446" d="M664.13,685.52c-42.02-5.05-66.12-4.21-106.6-.17-.61.05-1.16.11-1.76.17h108.35Z"/>
          </g>
          <path className="abc-3" d="M936.38,685.82H325.38c-.17,0-.3-.13-.3-.3v-40.28c0-.3.02-.61.05-.91l.02-.25c0-.16.14-.28.29-.28h610.86c.15,0,.28.11.29.26.04.37.08.77.08,1.16v40.28c0,.17-.13.3-.29.3ZM325.68,685.23h610.41v-39.99c0-.28-.01-.56-.04-.83H325.72c-.02.28-.04.56-.04.83v39.99Z"/>
        </g>
        <g>
          <g>
            <path className="abc-165" d="M325.44,780.71c-.03.37-.07.75-.07,1.13v40.29h611v-40.29c0-.37-.04-.75-.08-1.13H325.44Z"/>
            <path className="abc-192" d="M936.38,822.42H325.38c-.17,0-.3-.13-.3-.3v-40.29c0-.3.03-.61.05-.92l.02-.23c0-.16.14-.28.29-.28h610.86c.15,0,.28.12.29.26.04.35.08.76.08,1.16v40.29c0,.16-.13.3-.29.3ZM325.68,821.83h610.41v-39.99c0-.28-.02-.57-.04-.83H325.72c-.02.28-.04.56-.04.83v39.99Z"/>
          </g>
          <path className="abc-215" d="M325.86,780.71c-.05.37-.08.75-.08,1.13v3.62s0-3.89,3.36-3.89h604.51s2.73.45,2.73,2.52v-2.25c0-.37-.04-.75-.07-1.13H325.86Z"/>
          <g className="abc-135">
            <path className="abc-102" d="M817.91,797.52c-84.15-10.42-68.29,4.72-197.57,6.62-103.86,1.53-243.91-6.12-294.97-9.18v5.75c37.63,1.89,108.59,5.5,158.37,8.16,70.73,3.8,146.22.26,204.89,6.16,65.86,6.62,103.67,4.73,160.97,1.89,0,0,40.54-3.07,86.77-1.37v-7.83c-42.38,4.01-57.02-2.58-118.47-10.19ZM755.64,812.4c-70.73-1.25-62.56-4.24-21.01-10.02,41.55-5.76,86.94,3.85,86.94,3.85,23.53,3.89,4.77,7.42-65.93,6.17Z"/>
            <path className="abc-104" d="M784.22,787.64s36.12,2.7,86.12,10.46c27.13,4.21,47.61,5.55,66.04,2.03v-5.51c-35.77,6.06-103.41-6.15-152.16-6.98Z"/>
            <path className="abc-104" d="M429.69,792.1c-74.21.85,79.13,8.13,184.45,5.63,0,0-110.25-6.48-184.45-5.63Z"/>
            <path className="abc-104" d="M683.23,792.92c-35.38,5.62-70.05,3.01-50.63,4.75,19.42,1.73,50.63-1.73,77.67-6.04,21.69-3.46,63.13-3.87,63.13-3.87-32.6-3.03-54.79-.43-90.16,5.17Z"/>
            <path className="abc-105" d="M478.27,815.47s-90.86-7.33-132.93-4.01c-42.08,3.34,14.02,4.01,73.17,5.67,59.15,1.67,91.47,0,59.76-1.67Z"/>
            <path className="abc-103" d="M761.49,809.51c-37.75-.98-33.36-2.26-11.13-4.53,22.24-2.27,46.39,2.23,46.39,2.23,12.53,1.85,2.49,3.28-35.27,2.3Z"/>
          </g>
          <g className="abc-101">
            <path className="abc-446" d="M664.13,822.13c-42.02-5.06-66.12-4.2-106.6-.17-.61.06-1.16.11-1.76.17h108.35Z"/>
          </g>
          <path className="abc-3" d="M936.38,822.42H325.38c-.17,0-.3-.13-.3-.3v-40.29c0-.3.03-.61.05-.92l.02-.23c0-.16.14-.28.29-.28h610.86c.15,0,.28.12.29.26.04.35.08.76.08,1.16v40.29c0,.16-.13.3-.29.3ZM325.68,821.83h610.41v-39.99c0-.28-.02-.57-.04-.83H325.72c-.02.28-.04.56-.04.83v39.99Z"/>
        </g>
        <g>
          <g>
            <path className="abc-345" d="M325.44,870.62c-.03.16-.07.31-.07.46v16.44h611v-16.44c0-.16-.04-.31-.08-.46H325.44Z"/>
            <path className="abc-192" d="M936.38,887.83H325.38c-.17,0-.3-.13-.3-.3v-16.44c0-.14.03-.28.05-.42l.02-.1c.02-.14.14-.25.29-.25h610.86c.13,0,.25.09.29.22.05.19.08.36.08.54v16.44c0,.17-.13.3-.29.3ZM325.68,887.23h610.41v-16.15c0-.05,0-.11-.01-.17H325.69c-.01.05-.01.11-.01.17v16.15Z"/>
          </g>
          <path className="abc-311" d="M325.86,870.62c-.05.16-.08.31-.08.46v1.47s0-1.59,3.36-1.59h604.51s2.73.19,2.73,1.03v-.92c0-.16-.04-.31-.07-.46H325.86Z"/>
          <g className="abc-135">
            <path className="abc-102" d="M817.91,877.48c-84.15-4.25-68.29,1.94-197.57,2.71-103.86.62-243.91-2.5-294.97-3.75v2.35c37.63.78,108.59,2.24,158.37,3.33,70.73,1.55,146.22.11,204.89,2.51,65.86,2.7,103.67,1.93,160.97.77,0,0,40.54-1.26,86.77-.56v-3.2c-42.38,1.63-57.02-1.06-118.47-4.16ZM755.64,883.55c-70.73-.51-62.56-1.73-21.01-4.09,41.55-2.35,86.94,1.57,86.94,1.57,23.53,1.59,4.77,3.03-65.93,2.52Z"/>
            <path className="abc-104" d="M784.22,873.45s36.12,1.1,86.12,4.27c27.13,1.72,47.61,2.27,66.04.83v-2.25c-35.77,2.47-103.41-2.51-152.16-2.85Z"/>
            <path className="abc-104" d="M429.69,875.27c-74.21.34,79.13,3.32,184.45,2.3,0,0-110.25-2.64-184.45-2.3Z"/>
            <path className="abc-104" d="M683.23,875.6c-35.38,2.29-70.05,1.23-50.63,1.93,19.42.71,50.63-.7,77.67-2.46,21.69-1.41,63.13-1.58,63.13-1.58-32.6-1.23-54.79-.18-90.16,2.11Z"/>
            <path className="abc-105" d="M478.27,884.81s-90.86-3-132.93-1.64c-42.08,1.37,14.02,1.64,73.17,2.32,59.15.68,91.47,0,59.76-.68Z"/>
            <path className="abc-103" d="M761.49,882.37c-37.75-.4-33.36-.92-11.13-1.85,22.24-.93,46.39.91,46.39.91,12.53.76,2.49,1.34-35.27.94Z"/>
          </g>
          <g className="abc-101">
            <path className="abc-446" d="M664.13,887.53c-42.02-2.07-66.12-1.72-106.6-.07-.61.02-1.16.05-1.76.07h108.35Z"/>
          </g>
          <path className="abc-3" d="M936.38,887.83H325.38c-.17,0-.3-.13-.3-.3v-16.44c0-.14.03-.28.05-.42l.02-.1c.02-.14.14-.25.29-.25h610.86c.13,0,.25.09.29.22.05.19.08.36.08.54v16.44c0,.17-.13.3-.29.3ZM325.68,887.23h610.41v-16.15c0-.05,0-.11-.01-.17H325.69c-.01.05-.01.11-.01.17v16.15Z"/>
        </g>
        <g className="abc-106">
          <rect className="abc-3" x="884.47" y="645.08" width="51.34" height="40.69"/>
          <path className="abc-3" d="M382.63,645.08h-57.19s-5.8-5.06-5.8-4.68v45.37h62.99v-40.69Z"/>
          <path className="abc-3" d="M382.63,778.77h-57.19s-5.8-2.15-5.8-1.77v42.47h62.99v-40.7Z"/>
          <rect className="abc-3" x="884.47" y="778.77" width="51.34" height="40.7"/>
          <path className="abc-3" d="M382.63,865.96h-57.19s-5.8.12-5.8.27v17.16h62.99v-17.44Z"/>
          <path className="abc-3" d="M884.47,865.96v17.44h51.34v-17.16c0-.11.11-.19.16-.27h-51.5Z"/>
        </g>
        <g>
          <g>
            <path className="abc-252" d="M979.42,620.82c-.63-.01-1.25-.04-1.88-.04h-67.04v276.87h67.04c.63,0,1.25-.01,1.88-.03v-276.8Z"/>
            <path className="abc-192" d="M977.54,897.95h-67.04c-.16,0-.29-.13-.29-.3v-276.87c0-.16.13-.3.29-.3h67.04c.48,0,.95.01,1.42.03h.47c.16.01.29.15.29.31v276.8c0,.16-.13.29-.29.3-.64.02-1.26.03-1.89.03ZM910.8,897.36h66.74c.53,0,1.06-.01,1.58-.03v-276.22h-.18c-.46-.01-.93-.03-1.4-.03h-66.74v276.28Z"/>
          </g>
          <path className="abc-321" d="M979.42,621c-.63-.02-1.25-.03-1.88-.03h-6.02s6.48,0,6.48,1.53v273.92s-.76,1.24-4.19,1.24h3.73c.63,0,1.25-.02,1.88-.03v-276.62Z"/>
          <g className="abc-135">
            <path className="abc-102" d="M951.46,843.97c17.33-38.13-7.88-30.95-11.04-89.52-2.54-47.06,10.18-110.53,15.29-133.66h-9.57c-3.16,17.06-9.15,49.21-13.58,71.76-6.33,32.05-.44,66.26-10.25,92.84-11.03,29.85-7.89,46.98-3.15,72.95,0,0,5.11,18.37,2.27,39.32h13.04c-6.66-19.2,4.3-25.83,16.96-53.68ZM926.7,815.76c2.09-32.05,7.07-28.35,16.66-9.52,9.6,18.82-6.38,39.39-6.38,39.39-6.48,10.67-12.34,2.16-10.27-29.88Z"/>
            <path className="abc-104" d="M967.88,828.71s-4.47,16.37-17.38,39.02c-7.01,12.3-9.26,21.58-3.4,29.92h9.16c-10.05-16.2,10.26-46.86,11.62-68.95Z"/>
            <path className="abc-104" d="M960.47,668.06c-1.41-33.63-13.52,35.85-9.39,83.58,0,0,10.78-49.95,9.39-83.58Z"/>
            <path className="abc-104" d="M959.1,782.95c-9.35-16.03-5.02-31.74-7.9-22.95-2.87,8.8,2.88,22.95,10.05,35.2,5.75,9.83,6.46,28.61,6.46,28.61,5.03-14.77.71-24.83-8.61-40.86Z"/>
            <path className="abc-105" d="M921.57,690.07s12.2-41.17,6.67-60.24c-5.56-19.06-6.67,6.35-9.44,33.16-2.78,26.8,0,41.45,2.77,27.08Z"/>
            <path className="abc-103" d="M931.49,818.41c1.63-17.11,3.75-15.13,7.54-5.05,3.78,10.08-3.71,21.02-3.71,21.02-3.09,5.67-5.47,1.13-3.82-15.97Z"/>
          </g>
          <g className="abc-101">
            <path className="abc-446" d="M910.5,774.29c8.42-19.04,7.01-29.96.28-48.31-.09-.26-.18-.53-.28-.79v49.1Z"/>
          </g>
          <path className="abc-3" d="M977.54,897.95h-67.04c-.16,0-.29-.13-.29-.3v-276.87c0-.16.13-.3.29-.3h67.04c.48,0,.95.01,1.42.03h.47c.16.01.29.15.29.31v276.8c0,.16-.13.29-.29.3-.64.02-1.26.03-1.89.03ZM910.8,897.36h66.74c.53,0,1.06-.01,1.58-.03v-276.22h-.18c-.46-.01-.93-.03-1.4-.03h-66.74v276.28Z"/>
        </g>
        <g>
          <g>
            <path className="abc-68" d="M363.98,620.82c-.62-.01-1.25-.04-1.88-.04h-67.03v276.87h67.03c.63,0,1.26-.01,1.88-.03v-276.8Z"/>
            <path className="abc-192" d="M362.1,897.95h-67.03c-.17,0-.29-.13-.29-.3v-276.87c0-.16.13-.3.29-.3h67.03c.48,0,.95.01,1.43.03h.46c.16.01.29.15.29.31v276.8c0,.16-.13.29-.29.3-.63.01-1.26.03-1.89.03ZM295.36,897.36h66.73c.53,0,1.06-.01,1.58-.03v-276.22h-.17c-.47-.01-.94-.03-1.42-.03h-66.73v276.28Z"/>
          </g>
          <path className="abc-331" d="M363.98,621c-.62-.02-1.25-.03-1.88-.03h-6.01s6.48,0,6.48,1.53v273.92s-.76,1.24-4.19,1.24h3.73c.63,0,1.26-.02,1.88-.03v-276.62Z"/>
          <g className="abc-135">
            <path className="abc-102" d="M336.02,843.97c17.33-38.13-7.88-30.95-11.04-89.52-2.54-47.06,10.18-110.53,15.29-133.66h-9.57c-3.15,17.06-9.15,49.21-13.57,71.76-6.33,32.05-.44,66.26-10.25,92.84-11.03,29.85-7.89,46.98-3.15,72.95,0,0,5.12,18.37,2.29,39.32h13.03c-6.68-19.2,4.3-25.83,16.96-53.68ZM311.25,815.76c2.09-32.05,7.07-28.35,16.66-9.52,9.6,18.82-6.39,39.39-6.39,39.39-6.47,10.67-12.34,2.16-10.27-29.88Z"/>
            <path className="abc-104" d="M352.45,828.71s-4.49,16.37-17.4,39.02c-7,12.3-9.25,21.58-3.39,29.92h9.16c-10.05-16.2,10.26-46.86,11.63-68.95Z"/>
            <path className="abc-104" d="M345.03,668.06c-1.42-33.63-13.52,35.85-9.38,83.58,0,0,10.78-49.95,9.38-83.58Z"/>
            <path className="abc-104" d="M343.66,782.95c-9.35-16.03-5.02-31.74-7.91-22.95-2.85,8.8,2.89,22.95,10.06,35.2,5.75,9.83,6.46,28.61,6.46,28.61,5.03-14.77.71-24.83-8.61-40.86Z"/>
            <path className="abc-105" d="M306.14,690.07s12.2-41.17,6.67-60.24c-5.57-19.06-6.67,6.35-9.45,33.16-2.78,26.8,0,41.45,2.78,27.08Z"/>
            <path className="abc-103" d="M316.05,818.41c1.63-17.11,3.75-15.13,7.53-5.05,3.79,10.08-3.71,21.02-3.71,21.02-3.08,5.67-5.47,1.13-3.82-15.97Z"/>
          </g>
          <g className="abc-101">
            <path className="abc-446" d="M295.06,774.29c8.42-19.04,7.01-29.96.28-48.31-.1-.26-.19-.53-.28-.79v49.1Z"/>
          </g>
          <path className="abc-3" d="M362.1,897.95h-67.03c-.17,0-.29-.13-.29-.3v-276.87c0-.16.13-.3.29-.3h67.03c.48,0,.95.01,1.43.03h.46c.16.01.29.15.29.31v276.8c0,.16-.13.29-.29.3-.63.01-1.26.03-1.89.03ZM295.36,897.36h66.73c.53,0,1.06-.01,1.58-.03v-276.22h-.17c-.47-.01-.94-.03-1.42-.03h-66.73v276.28Z"/>
        </g>
      </g>
    </g>
    )}
    /////Text area/////
    {!aceticFocusMode && (
    <g id="Layer_5" data-name="Layer 5">
      <g>
        <text className="abc-125" transform="translate(611.98 631.95)"><tspan x="0" y="0">Water</tspan></text>
        <g>
          <line className="abc-286" x1="607.62" y1="624.8" x2="563.07" y2="624.8"/>
          <path className="abc-124" d="M553.03,624.8c4.72-1.75,10.59-4.74,14.22-7.91l-2.86,7.91,2.86,7.91c-3.63-3.17-9.49-6.16-14.22-7.91Z"/>
        </g>
      </g>
      <g>
        <text className="abc-125" transform="translate(1397.79 631.95)"><tspan x="0" y="0">Acetic Acid</tspan></text>
        <g>
          <line className="abc-286" x1="1393.43" y1="624.8" x2="1348.88" y2="624.8"/>
          <path className="abc-124" d="M1338.84,624.8c4.72-1.75,10.59-4.74,14.22-7.91l-2.86,7.91,2.86,7.91c-3.63-3.17-9.49-6.16-14.22-7.91Z"/>
        </g>
      </g>
    </g>
    )}
    ////////Test Tube Acetic Acid///////////////
    {!aceticFocusMode && (
    <g id="Layer_9" data-name="Layer 9">
      <g
        id="water-tube"
        ref={waterTubeRef}
        onMouseDown={onWaterDragStart}
        onTouchStart={onWaterDragStart}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleWaterTubeClick(); } }}
        role="button"
        tabIndex={0}
        style={{
          cursor: waterTouchEnabled ? 'grab' : 'default',
          outline: 'none',
          pointerEvents: waterTouchEnabled ? 'auto' : 'none'
        }}
        aria-label="Drag water test tube to pour"
      >
        <rect x="1236" y="398" width="110" height="480" fill="#000" fillOpacity="0" style={{ pointerEvents: 'all' }} />
        <g>
          <g className="abc-107">
            <image width="54" height="12" transform="translate(1238 401)" xlinkHref="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADYAAAAMCAYAAAAppE4WAAAACXBIWXMAAAsSAAALEgHS3X78AAAEK0lEQVRIidWVW4scVRDHf3Uu3dOzk9mZNZvEjZiIBhKJV8hH9EUjgndFUPwCgiAKvqhv8QOIkgQSk7CyZm+zMz093eec8qF7r4kQfRELDn26+lBd/6p//Y/wBPbZF1/qvFownc7YmezhrEVEcM6CggiEEAhNwDlHnvfoFT18lpE5C4BzlqTKqcEA7x1Zlh/EmU6n1HWDKqQUiTEC7R5A9fF5Peo+9DiA9z/6VEUEMRYxBsRw9eoVLj//HJvbO/zy2002t7aZzOY8s3aeew/u89qrLzFeXibLMjKf4b3He481FmMM1hqMMfT7BajSy3NUlZgSddOwO5lQVQs2NzcBiKHBWEdo6sP0FJDDhP8G32PNffX1N7o8WsY5x/b2NouqYmdvxmK+4I+NTXYne+RZzmh5mdleybQsuXjxWV5/5WVODZYo+gOMdV04OfF7RZOiqhR5jjFCtaiZliVnioKtrS32JntUi4peURBiwOcZmpSkiRQTCAgCCsYYFEUVVNu4oN0eRARjDDEm5Nvvvtet3QmoMpnNCCEgwHg0xntHCJEH6+tsPHzICxcuMBgskfWKg46ISMtFABFiCKSU2qVKvVi0NA2BFBOrq6dZGY+4dOkSk8kuRdEn9xlJEzFFBCGldNDdo7FUFe2+7a+UEtqdEWPa7seIe7izC4AxgjOWRVPRhIYQAjFF5uWcqq4JTeDXW7dZ6hct1ZxHhJa+gO7Pw5EfX37xCnfu3KGX5zhnGI/GGBIAP9+4QdM0XLt2jR9++pEUIzElYowtqBhbQDGhKAaIKR0MnEhXgKMc6borAvLJZ59rCIGynKEoi2qBiBxUZ9E0rVBYR0xKr+dZe3qNwWCIGKFpAk2IzMuSal6T5ZaYIht/brJ2dhVrWiiZd1hr6ff7VPM51meQAiLmOH27rRghRcUYeWR+RISk6biP4+dcCIH5vKRparwRcu+AFpgxltFohIgwXnkKn2Xc/f0u6xsbhPV1BEMICSuQZ5bxaAVrBdRw4fw5VDreKyRNmGQoZ1O8y+h5B7i2wlbQdAhOTDtT2inuY0XjWC20A7bvPAkTeOv6dRUxIIIqeOcx1nBu7Tw3b92maWoArLUY65jNSmbzCifCeDhg9cxpxICRVsoBiiyjiZGV8RgB6rrBZ75LCNLJJI7IYktFQPX48wBCWzwRObgm9v1PbG+8+bb2+wWDpSW89dy9/4Dp3oy6aVBNjIZDzpw9jXWOwluSgneO4XDYDrdIS7Gj3QGidgIQU3ePHYqGnrjETr4757rlmcym5FlG7rN/Bgzgnfc+0KIoyLMed+7dYzavqKuKEBKj4SlWVsb4Xk4/8/TyjDzPcM6hnVwfrSq0zTFGKMuq7Uar5WjHxVlVHVPBowta5uyzpyrL7j79F8D+a3v3w4+17WQCPZ7+YdH+d7Ce3P4CTuZzPyaQ9JkAAAAASUVORK5CYII="/>
            <image width="40" height="465" transform="translate(1252 411)" xlinkHref="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAHRCAYAAAAYFPsIAAAACXBIWXMAAAsSAAALEgHS3X78AAAfO0lEQVR4nN1dW48lyVH+IrPqnNM9szve8ZrFCOMfBxgMtjBY2AgQRizCBoOExN+zeEOWHzy7Ozs93edUZQYPWZe8V2ZdehditdOnbplfRUZERkRein75n//FDw/v0Wvger3i9etv4sNXH+LVixeQjYTqe/Rdhxcv73E+n/DRRx+haSSEkAAAZgBgaM0gIhAM9Uqh73t89tkbvH37JR4fH9B1Cl3fQWsNpTSmAojAzJAEMEwZUkqAgObpejWVsLlfCMKHH36Ac9tCEOFR9Tjf3YFI4P7uHk3TQAoBIZv5IQBaaQOQaDqvlcLlcoe3b9+CGWgaib7v0TQNtL4BMMAAgIjQaw0pCEwEEoSmadBIKaF6BSJAEOHufMalPaFpJJpGAMToOoXz5QzZSLRtOwEhElMFzIAUwkBjBpEB3DYN7u7ucL1eoTVPnJFSYvgxvaRSCkIIAAwiASEEGvO2BCHJnJASl/MJUgpgYDUzoHqF0+kEKeRQCKBZD9d5aGqYa2ya+3w+4+HhAY9PTxBSQgiDSWuNWRiGlgbQyAYghlZ6ECOBBoCRNaVxaltIKSGlQU8ECCVApHG5u0AIASGFAaUZAgKa9QSYQOZ1B3Bv377F6dSChv+YGI1soKDAwsgeDfcDQNd1ICEhZQNBBIAMQCKBthXoux5iaBaMssQMIQhSGGBiaFYpJRgMwQKMUUFmriilDJc14/7uDm/7fmisoZkjdDqdADKtBRiZbcYffa/AANpTi4EdAJsm01qhaRrDqUFWZ46xW8vw3AiQmfF0vUIQQWPW+pHrTjMzwEOLjHIuJMyPtpUAM/qun8zFyHqA8O7dO0vjxHxt/EPk/KbBdGitjYxGeea9GxmGtE0zMUEwGIIIYtCa//n1r0E0gxPC/L3cXaZmjIJzWAhLeXi67t6XJoYBysyjDJqCldL47h98x+HGxDXDU4DMOUHCKpCnMpyKBg7axyU0th6NSjIXbLgJRtAkptnmipjcO5hdeMw8cQGWMS4FaqwBMNoHYNBEV3hpaKK5qf1CkhUMIHwO5sDFLgkDY7Zfv/rvX0UfnrsxzLIXAJ5rYGYopfDixX3mNZYp0HXfRonB/BMRtLZfkRY5KKX0nhmeLFSWCaDWGjCGHefzOXrj7dY54AYUITAL4Pj35cuXAfgqgPaDEWVE8oWjF2ZgDPPy/WC058cqOQgAQg7G13l4ftPQ0vl3eDAH7bW12LmWIfvqBNDYHuBbH388lpIuIdSO4PA0iErbtlVN6pTDGO3gXGuc+/7J5Sbqbjerotm82L2KLaepugWAsMP3SOs+ez32tG1PDYByuXPK4aCGsLsCgMenxzSaCJENMFJeMcCg4HUvGtDUrQG4WKarRIPte8T8ejTrBfHonBlZAXB3uUwPLblPDpeYoazurpYmDo4xiHFXhrKnSsz5MIqIgZtbwTfatUTkaPF8Ml19mjymuT9WAgQiMhip2jsuFNINoOwiPIChOVhbz5bmtZ8x7palNRT88I7JdgQKK6yGOFPYxEst6KBaX3UpZwtkcF+qbfEJoBschZQ6vwxo9GYmqVwH0BSGSBMvuEZpf8t7si70HCndxBtN2JjlmmhlFyrs9xRCLDRlPg5J0fNp8Qou1NjB2L2DHSx4mgB2YtzpV1HlU2pgjbulNWe0eK0QxjrnNUoS62ojmIKOJdnlDJiqYKQpqsWuB5wHskS8GFDkKQB4vd5i962iMJywA6QSz/rors6SPfZ+60IvO3BYhyIqgdTdPj1WoNErHNbCO0aXzPpdTRxxFlaVYv0KXIKNnvUiB6dAr0KJfUilEGOKIxYfTpgZxi5hxyJFOVhr7XO09R32NTO2Yzr6g4fJYMoZSNTHtnb44I6Ji59BwApo0cxshWmbnuU7QxIyMv5R8ByAeYTKOhN5/mA7OIOhBNhjRWFTV5eFtpORTADcIfFj/y0cm4tRkoPjA1ImHJ4CstyF0psD2uwsuI9FemHeO+zckaSIz00oJYYHsNTLjRdVe6WMHIBE6SIpvDFbOzt933rymrgkrbAiHDg2R23oentaXckypV9gAtie2iKvubYzKe+L41TRxHkQsd970DYzk3gf3xc8nU6rq9huBykeIhyam6mnveAk8oNLDymVHy9eUpL8C+RfLjLSVEZTYijT19qymI4U84q5vomfIyhGLIEZodIcn5tX5PiFSirj4IYK7u7vNhW+3hvN1rcP94CiwL2wIq9PS02xylWVnP2WI+VNa4oV7P8uh7T88GJmgahU0Tk82kHTF2vPZ7qONzXO7BvzwnUezTqIK2a/TY8ujri7Fe2XSYzTs4+4u7RLlr+qvIlu12tV0SnKAmTtGrcaeUvN16+liAwmpMo6zdPE2Rhkc+4wgKlqj1KGJVMZ9wf9hzLo0jzcx0paAJc7rh1HJ4rJym4dU0F9se4TwUiTryTz9fXsOzb9ViGPucfWkti7w3fzmTt5M3nhDyth1uWvtc8wxDivSiy3YGl9e2b5nQjs2WxJ2Qvks/yc0WGefxzptiYMdYTSKzOswxqoZS1VbaifJ58wU+jN7FzB0gstiXxkel55T+LH6P61PSK7uJIk/Ybn9xaqRjuZdfT8TLZXWxbWV/qDydl5eSpJi6yk/BTR1S1amcjJ0M5hp+eRFy7bzVEA0F3gN1PAzHExqrWSdvOoTYRmQ32UCd7IxfjKqNhxtHLrxvKMGjblZtJlhtpjZ/rrqPyBxUkVxe5fcZUAxtXeBVQwNWqlBKVXIVSVWR80rUr2rleTonGStcTBj5GOUJK1tHGJURHA2h5vz0aJuvyxFNwWR2sXQ711/Vzp+doCD5BBexhshfx5TVUBsHK8hLcaGEMFE703DXJtpgWA5P5c5VBs88HqexLOXdyfJoBNGx86jmbrdzCMpSmg5bn823BspvJZwJUFbwU7Ztw2To2yFh17/wKzYxUdqljQnbGUYw31Dnce581sXWgwsPC4nmQzmfpWc/C58oSrABb3smsm2trpcjyDR72fs7DQhd269Aj6Ip92zW6VlrmAqj6yjtMzBE07ufy707HrSb4+VA0wGmVszD7kyHEC1y9AtQtxf+4ak9SPI+7fn/gllk+VL05oxk4eGZOspLR81tEEMJhpWVjwFJZ6sueXtVa8n20R/loqBhivKiez2zs7xg4cHHccrUsi7ZgCZiDY4HDp/j1pn/XF2Vu/Nt7Mot8VUEm/UAiwnAupvVOIwrGRZwg701XYV5qmtY722pTJrir3qplrQsr1JqY49RGtgfKXTQ3VoGJUMZDzXJGwS3kO7jLJ46swMzVe2VZv5qtpuHL6/xc0xWilFSq6U8jNEOv9lRoLtM9qiGSOdztt418RhvCmVftRR4v2dg1YHhqMjdkVY4lSPQftCseZRwfSLlocw3iqWPiXo8OjunUtPD+1HWAuHgZwsXZhLirEo//jPYm16fVMS422b+++uKbp/v6FdWYYgBjMzzSYtCskl/IcLOoN/HvWbYWaosVpyn1v7xDg2pO4CTSZovyytfJXSK7QHou43TLjI9E+2PxZv3eNS+u0uGgUbONo50DpCY5eYrRoc6bVWNLdpVhqibEvUIMszplT9m/0jndyt/bp649b9BIAnI8tI8fwFp8uKwADOBd1cwsAN5dwMEUA1rT5uBGifab82RKq42Dl+rs9aHXgXjIO8vS0faepnWcB16XSSyi7jQFrb4nkku3L3ZulKod1YWcd1/M6jMqnRgWcWDrOna2nXe0gW/8u3VVKVbsEpFz/7WngjLOQu3UpGRn60uXLMPIlzZRfFVZR0FEU1+LMyEMtxK2vVLFkqALG8MmPPfhdNNoZJQo/HsDYD9hIG3YuQ9YkHmYHw6XiJeNxxylPpRavpA34A3er66xA3bm4flvoLXTYcOzikyUOJQq2VivfGCyC4PhpKYUVZAz7Mm3eIDGsugrMcyxbA9JD2ClTswSldKxk5TCE1VtkPJyDu7qSFNZeMNJ0zBr3HSnrUdfY6XoqzSxE7ysJhBYqsNbVbeFr9XKNZSV4hmEIu5p0QLS16lVmZmngI+4AMji4ahQ8190dkd0qppLKCzm49HGNaopqRak8hPdtm7NQlgWJUDb6dsibiR77vkhppfFHt2r6xoV/8ZOTgtTjCagYYN/Hd1FZTztr8eoI7jk+QVNUhed/hT3OfCY2nzVF5TK4iLKcU/tNjYoV9MwJrt16krhTdMCeR26Ny5aMUyHdVz+5bMmxiNy7gso96tX1Hmxmkg73M8VUVU28jCtxdSXI7PLdtS9eLB6FlBntrLmyppQyWt5/MEtlNx4b1XHyINGco/n5yu1ghorBLd8XB0j+gxWBi+PGbE9iFnFQa3tVmJ/O+jokjwotbrkuHxCTZIuMaMtudtA9XP6KWpri1vE4dyuLw6rW3mLSviV7In5y1QdU0mX6ylJQ2wrawQ4uAVnhVVsPrA6a4gyKnHSkodCeWreFAD1NLNLeWMm5WisoABiK2YIHOLxFKUNLaXy0OnCv62XXR3UHbcqUglMGMyYEaY860rxpRzWmHCWgluXyGaaIbvCMsHp1bBlVR3UR7Cs4+LzJmeLJZbErpbml9Edu13rUlRTA3mETiJGO34xkI+3jLBwolmUD2rl+LOXNTwFTYeycuC26k20GjsuwnH+4AkyMdt8IYs9Hga2z3/xTB8jiYm5m2V9O3zVuBHFsbsaD4h9VDe+x/cwOH1ApfnMKd8Qp7WVyxMzbdi4LT+wfuadXhSWP3CtpjyXjK1ZQXVS3JFyVl0poOUcdEc6SRVe7r9AuiVlzJiXqv+zQTdcPJlZRroCywisd1uenDVNEY9N55qNDvzqZJiNUrHTE5NknuGTToSJanAWcpZjp8Y5P7WlFwZWpj3QBrtMaWzR2gBYvO64lGQZ36fl6KhsKc+xZohusYNVuu6Wk6y3R7n1oEWDbztui5VyIo2xnMMExu5ad3d+5rm8vCjhobz8QulI5r9SFe1jgPn+TM1FFVoGmQnaLoIocVgAQ0WUbW+KEMipaHcsA9PAxvWgTjnOm9447aW1+cI+IqJBW2UGjPHkdznnkNVQwLaUsdN9+T5yyS8jT1bB/Irzv0DVNnPhddNt2UPZ7Fa5xjwfkLrf30hK3nMrx4sL+d0dz4wCs2WTJ1uS1ZZSQqM0KzM4Uh+ccoeSsR13K5MWojrGwOtFBsYdJckksvwl734zds/plWraDA4cChV2I5vaiAKBSOllhzFEIHfyvxRLyZQiHOax28dFKnARCRJPni/t0dc73TBfDwcIObdWecXESFT3bcOxJInu/GYitwVtLxTKotE7WmGlo/4ZqKsgPFgRPYdS0iKl0afqucxZiccoasqUuOdqZKl55SaFoP1xJ6Xeh+qnyhSXPDxRwMmc8Nq3QjvO80B0vpPzkskQVsVlJMYrG0JUUmZ6XK26u0vWw3IQ6J0LnNdSUlFRcmeew7kEr9t3ywCxNsE0XXHRX/RTRjBu2Hkaa6iZ6RzUmeXc5ZW6PLnjJTaANTUtGI6IFUZAFy73O4mBi2qqxe91b5LdXKq7IYU1Vti6GYyxmLyzaONJUcMWbHkVEVduoZwGmygkVxjPcORnO7UIVuZQFyMFTEVuzYHY2m5kku5Ml5/qxRMyyu0dds9cl2Pl+6KReO83C3DbBcdEfDAUyHzmG5a3fjKSULxuFsHjOQso5Dg2198wmeDWLDSqdhLV3+rQ6ie5+WDe8aa+uLhh7jVRVV+JervRAFRN7ZomK+SLhv+Nlt5vbDrCIA+xWHnQscTdrDVWP1Tk66q8TDG7m0tA4SZntnjOlekYyNaCzhzgmJiik+Za+05PMr2Lhn+8A+C7WOrc2T2XZrTIvK/387oY6rCGjCHkAx3R1VaXW9YG1ohmdXGa3qN3C4VJyX0Ws450SNCsWny4IIvuwedVOpJtWJi5noNP9SS3ts+hqVJSYOG5Emf8EDQNtk7bliRbelTYv1wjNzBqI6WfWNbHfpUTqSHd1dS+wOAs4X1yOq4AQohqQT8Wz36L3BLdtClyitJjl989Hr2eAHtLVBXtFFzS3/ciemrzLsrU4V4/yBwvEyO5JOMG69nSaz2+ggs9XpeuJx3heQLWRVg/Hlva2G/fLXre2Uysd1pY4bKyucg1Piz3qkkvpseMDXP7U8sayVQ77yWHam1lbuG8HN4KMAsyGjzHfL6tIC7RwkwAiX6SyHhoXT9mdF3v5Zx7+i9VY5nsvABy/Tjpr3Mwtu4DbrRuE0/0eSXFtlcqS3d4vCO2GAyILXBbLMxlqH4iT48t0i7LZvq7OWV+cHIL1mlkpZUD6SuK7/jswkGhh3syoACM1qQDKx1TlcuXvdLQ4avssWRxX68yrdoxGO1rM8/k9aOCgO0Rqc87moAEWGhb3ZcasKuN88lclrgY4U6AEoTMYBEfBbwCL2+wWMjhcdMX+l8cTzZ4AN0kEz80cl5wyhCEHEdHQQnI87QHkIX3xVIMlaQw42fLx/PiZOHK+PDooj/9JwxW0PKnC7kXcKyOWGbDV9MwMvdeCF6LZKfBHg0ZOvX//GD6dMO48IN/D1CRXJk7cG+ogp3nT4KZfWwBmd8/z6h49lmwfPLyIrdyTkqwhnltueQbmULGZ7+Irif2/VwEzzjtsBjFocXqgb6x6BhcqiCnBteDMjK7b/rEBb8mQ7w3PdiwYjwuZZj8FQTStTR6f3TQcG4ysesdlhc8wx70+jLK411YBTNQzcxD+nCvb6CFQEvvZ+XA+Xv+lKy/GGI/ePbzH9EVKdps03t5hb+srWjFA84wvf4YuF9NUTSNx84SeHbCuPxi26BDLVJqexRSwH5JGXa1sCS6HV3EwVTgDaJs2uK4jG+Kw9c/Y1WFSkFIKwS8umJNS4nI+z+Ema+e6/8xKTy1J9ducBuYo0JrgmS1U0JPEquIJ2/w0O83sTU0KSyhs+/QwRKKbDW+M6//scgXmEOw7HzUAAZNBnd8/5rokYB3QzNm+eKol+cY+i60VsVZZzao0CM0AnbrZ5dEi/4YXSHFPSrmJlQvDEAYi+6eGv5MjEVwfVd3pY8qIkfeof/vmt06R0VaPcsubgRkJ3EMRWjoumpZidVPBTWmtiPfsiL9xhgKAJ3sIy8IQ86htoEEPkpv/H5kdnAQ4iVTi7VMpisBeBk/OhcZFosoOmpuJCC9fvpwKneQ9AM9TZ+Fj4/lykkdmJD5PxfNmggaMcCvUVb/7WG9nHICTnDlz33OFx3oTD+7G7kQQAKXm4a2HhwfHc55sXW5VgufizHI98H8fQ13gFVjHo6xReHZEF5Q0+5Tem2Qobwdjnoj3I64k/rjTgiWoBmhR2zSJkmY9XdGhFdMEUIzpN9s+2dOQU3ba1+ap+ZayW4lrnqhnlmu43CEA/aBMQdAUWSfH6cuoUZzQmwk4FfosROS5+/nubTc7GDaJ5x5MXcv8N600c1nZ/eRqAIYUeXOylz4mlGSaIu81vReglIQlYQpYWZvTjcLEmBUmEH5Pm4drqYmRpY2dybDGBf52vUHKYDfA6X9fBsOXcKk4qov3E3HS1m4VuVnI43l7c8W1FHcWMLPYpHGHJnQcgdnPCTR4p5HOAGD0huALzD7rXEPtdLOZsbrVAJVSMw5OTdJm12u3eg9HBlbkpJ1auGDLcX/xp80v2yxGVeKIkaboBolsAvBYl2XfZMuj392tpcBY+a3CMHKolLd5p/ebBmA24Bytzm7ZFbMlU86cBLYryPAq6M/rKZMCdjUwKol2T+NdXfIRy9NvXhmTFifJVZNAkceDSOpjHoao2Qt4aYX21JRzPMFO5a7jEJO9WAKzHGCGYlNPnJ7DMzFBduIYM2NXMFef/EiF3X14Xk0M3hL3xolCiwABBgnhdA7h+EikoWNJaYt22Weh73vXBvuYLAypXsMGvGYYNgtwrsV2Tu3BBscJtG9PPLt+G/yCjWINzfO27Ht4wBnKoJ1F2LKuxAE4JS+D3PLs+/nkMdF5HjCptrRXVAlwLNA9jstPEDhFfD/hZGV34GAcifc74inE1SO0j0txShHAqZdIDCG4E5JdRZm5GEZ+xn+1q9swFGZVGT+bTHklyooKahnFN6fj8JR/OAdQIfc8ZBBCFOWlEwCTupl25zyFKJmsuLZbDiLxpmmcaXWjTDLzEBd7gm4pTk4GQ29npZIAwOPjY/R5MhOgvFeKVRTugck8T4Z0cC4BdJyRbMXu9Lz83lneUURJij3qv/vpX5O0eqIxDtFKOyC01rjdbpGKR3OT0HDv3iqPetz2XjNDCELfK2itQSScisbeZOK2nfZKdBL2EnIiKtZisv/yAFAKwm/ffIamkVBKoes69H0//XV9PKMsMQ0OTc0a1SVHVqdZH68/+ga6rgdA6LsOmjWIrZEnIqhe43q9QQgBzeOHeght00xNF98auqwvnl+WQAwwjQDJaKfZBcCoW3fr0KGDbCQECCQNd5WSYGZIMWo049bdIIUcsg/j/ME5ly2EhOqVBSTFO/eVaORgQwJdZ5ZhaGZcbze8sIWdzAxLIoG+VwagFGA28kowzaqGbQ6IBCClkWcMu+B6Wmvqio9tmAYz/XdjQ9cMEDSImqkJxyLapgEJATFwhTXQtA2U0hDTp1dn2VNaD8pBIEgrniEYb9vlpxsaMJitWR8ggJVG07RgNjGJVgpKa1yHgUUpBe4uJ0gpIaXA+XwCQGikBAma+tvRY6EBAQkxm6HY9BIOeyBjAMxFAQA//fFfkmkuawIiDZ38YCLG86dTg3aIL86nM06nE05ti6ZpJpCChGOIhRSQUk7lB+sF4FouuzEm4zRPhBVQfY/P3ryZWS8INHCHQJBNg0ZKyBGQMACEEJDD73lmuymTBOF0OkFKASEFhJRGXEYwE/csow8r/casoVWPy90Ft1uH0+kM1gqyaaB6ja7vcDmfIQSBtQmE2rZ1GNG2rbVqR03xiNIKUkqjYJpBZIx/3+nZ5hGNSjCRs2ztJ3/1IyIYBWhPrRHuwbaRMFzolQJgmlxpBdYap7ZB2zRoGsO1pmmnvyQI7emEtm3Rtq25pzGcNpN2aeplBJFBRPP8iXDRFespsrvduomzfdebprGaUwo5Zx6G9/V9GLNIyz0Wgow8CkJ7aiGlmMEMYjOKixDCBdirHoIAOWreKIM0AhlkZBL22SuZ+lA/p81zLDL+JqJJqQBCM3DV4VwMoGlm4O7ubvBeOjAbeVJ9j67vpxnDJGgSajKaYDWPgO+1jAOKp9N5sgpN00BIARICUgpH6cRouuBR33U4n40cdb1pZq01eqVAMJ6PPaAzAhzh2PybzAphyDDQlGmQsoEgMqCIIGUzaXjTNsOxDAH++Ec/JIBwaltrsQDhdjW+4Hhu1EYnIztwcTQto4iMNprZztEY0WnaFnLgZNO2aAZOTzLvAwQA1XU4n09gZrx/fD/FKI+PT1Ba49Z1EFIMjoCYuBJzRclq9hFc07QgMtxq23aym0ZRxCCfMs5BAPjRD/+MLucz2rbFYPehlHG1RgHu+37oVucmp4mDrqkgIue++ZoYuGVp7SCfSRkcibXGuW3Qqx7jOkQiwtsv3g6NTui6zlSujRMryMgTEQ3u1mxCgDlXQ841A8EG2LQthDRmLAnwB9//Hr148QJEhOvT1fQIw2BO33XoB9fqeruCYVaAadZzh29e0+EYYx6xIkLAaTkY+6F7WFgADUD1Ct989aHR4kE5lNL44osv0XXdBHhaQ8cMrec1dU7KmMjxXGxwcCABtiRnAf7g+39MihkvLmdozehVB6UUemUAa22c1+vtNsUymg0wzQzWPHjhClqpyfj7AdRopnxwi+uLAeDP/+SPqGlNzNF3Cr02c2ceH694fHyczE7X90MwZYCZptaznfTnbflkGXbL5pfN5f/+9/6QXtwNK7yYcL1d0Q2u/8PD+yleZmbj7LKeHF6l1AR8vMdvZhujOTWDLZ7Qcrt1aKUw3BGEp+sTlO7x6oOXkxOitAYxQ8N4TnOIaoetmNkTUHi+OCf2Fz/4U3r38A4gBo0xBQMPD4/4/PMv8PDuPQykkWYujRo8OcyWYxoY9rUAAeBvf/JjevPmDQAN1V3RqRuu3Q1fPr7D+/fv8f7hvZW3cQ3zpBg8L0rVbK0ZsMzTHJuEL1BEf/+Pn/KHH7zEtetwOZ3Rns9gZlzaM+7v73H/8g6n9uS4bDyamMlGAnP0i+m8r0yrh4B+9um/cNM0uN46nJoW57sTbl2H8+mC737n9/Hu4R1ef/R66g5noGRiVriZBCu75NSzfozKAkpCQinjRDzdOnz8+hW+/ckn+M1vfoOPXn8Tv/vJt/D4+DR54wNagExnALtXwezGWfzdRp/+/JeMwev+7PPPcXd3h88/+wy/9+1P8PD4hJcvX0CxAmvg1LZ4/Y1XE+9ObQspTZ/8+HjF/f0dlOrR92ryQXejT//1PxhMU2rk7ZdfAiAo1iDRohGmC/ydb32M660Daw01ZMpevfoQqu/xwQf3+OLtO0gpTTZjT4AT0F/8O4MZJOQQGgDX6xVMJmtFILSXE/rOxEDvH83q77ZpQFKaKLCROLWnYwBOQH/+b6yZZueWBBgK0NK4cUS4dTc8PT7ifDlDkpi8JJr+ewb62T//gkEmzyyFhNYKWptwoe97PN1ukELgfLkArNFpBcFsfMvnAOjT3/zDP3Hf95DC9LSaNZTSuAxhhgaAIVf0taf/Bb9eHdLAbeVXAAAAAElFTkSuQmCC"/>
            <image width="55" height="12" transform="translate(1291 401)" xlinkHref="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADcAAAAMCAYAAADGZiUoAAAACXBIWXMAAAsSAAALEgHS3X78AAAEkklEQVRIie2Vz4okxxHGfxGZ1VXV3TM9M71jC83KSFhCB4GQ/ADeZzAsLEYHgQ7CRmBfLHTSxY+hgw8+L8IgEPLFoJMtEEhisYSR9mDvX+0M09M909VdVZkZPlRN7wzag2TQzQFZSVVkRcYX8UWEvPenPxsA9NtGBOG7Iv1DRBBRnFNUPSLgvWeQZYhTRKBpWkTgeHaCihBC3FhpQqBtGuYnJ4QQ8JnHe48ZJAzMsJRIBlujIWVZUJYlb77x+pPceqL474K6AAKwXr+xKALWfTeLWIoMckeWZYgIRVkwnU4pipydyYTMe5wqIsK6rsnzAXXTUlUrVJW6bmhDS9t2q2kbmqZhNj/h88//ydWDAw6PHrG3v0+WZfz1bx/bL15+icPjGX//9DOaqkKAGFpijPzurd9sXPVm4JwSY0T6jID0O6hon6UNWmKMOO86nQrqOuW6XjOZTDrDPmNQFDjn2dkak8zI1nUXgKEw2d0lJUNV+9B1QUwxkFLk6OiIZw6e4YtbX1IOx+zu7JD5jPFoxN0Hj1hVKwYiDCfblGXB3t4ebdty8y8fWAyBG9d/Jf7VV1/BqWLWXSSq3S7yePXvKoL2+vNsXDyrooQYiCmxWq24d+8+//7PHa5d+yU3b76PzzyqSp7nuD6jzjmc92Dn1WGYGSklYkpMd3fwCrdu3aIoCibbE65Mp4QYUHXcvf+A8WjE4dExw6Jga2vEcDzqAvzJJ//ADMwe009EELvAxR6YiGAI6nQDUs8dVEWd25zLsoynDw7IveOjDz8EYDGfcbZcYck29wE47zumiCKiJItdvcWIqlJVK+qm5my5IsbIul6BdazKfIZ3jrIsSMD8dMmyWnXg9qd7CIJhl1qIYajoJSfOJSVDnWDJLhVojC3nLSOZcfvrfzEcb5FSJM+URUj8dP8KCtx58C0/2Z/i1PHo8Iid7V129rYRUYZljnfCum64ffsbtkYFmRNSCqyrM9r1kkE2ABHMjKbOmR3DaDTGOUc5LDtwRV72fJdN8+j8FZ7ULqVjDn1pPgZ4rlfBooHAKkbqqsKSkSwx3Z10/5jxs6tPIamzcfXppziZzTidRw6PF3inmBhg5FnOc88+i3OORw8fEkLLerUmpdj3BUNioA6JEGZMJru8/tqvBfpumVLqKdddfDFb0tPy4q7uvAmAuMsREEB9Z2s8HiHAaARt2zKbzymzAaum6e5RA4P5bMZ8ccrJvW8pi5ztyRZgtE3Nsgl8+dVXvPD888QYO98EnHekmBCBt//w9hPHg2/bQN005IMBIbSEEAghMBgMNiAvAu4C0cHw3vdzzqGuazJdAKR3QvDOkawL3pW9PRaLBQI4FepgLJcVi9OK+VkFGHXTcLY448UXfg4CbWi5c/chr924/r3n2wbcbL6gqpaUwyExBmKMxBjZKofdLOtp2M21jsDlIEMEQozElEA6igyHJXXdkHmPV8Us0bQJVSWZYSmSFzlZzDhdViQzVB1mRtsGvO9GSzYYEEJEvRBj5I/vvvODgQH49XqFmVEtl5cUi+oM6Wfc79/67f9k/P/yI8p/Ad/XO0neJRDgAAAAAElFTkSuQmCC"/>
            <image width="100" height="300" transform="translate(1252 411)" xlinkHref="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAHRCAYAAAAYFPsIAAAACXBIWXMAAAsSAAALEgHS3X78AAAfO0lEQVR4nN1dW48lyVH+IrPqnNM9szve8ZrFCOMfBxgMtjBY2AgQRizCBoOExN+zeEOWHzy7Ozs93edUZQYPWZe8V2ZdehditdOnbplfRUZERkRein75n//FDw/v0Wvger3i9etv4sNXH+LVixeQjYTqe/Rdhxcv73E+n/DRRx+haSSEkAAAZgBgaM0gIhAM9Uqh73t89tkbvH37JR4fH9B1Cl3fQWsNpTSmAojAzJAEMEwZUkqAgObpejWVsLlfCMKHH36Ac9tCEOFR9Tjf3YFI4P7uHk3TQAoBIZv5IQBaaQOQaDqvlcLlcoe3b9+CGWgaib7v0TQNtL4BMMAAgIjQaw0pCEwEEoSmadBIKaF6BSJAEOHufMalPaFpJJpGAMToOoXz5QzZSLRtOwEhElMFzIAUwkBjBpEB3DYN7u7ucL1eoTVPnJFSYvgxvaRSCkIIAAwiASEEGvO2BCHJnJASl/MJUgpgYDUzoHqF0+kEKeRQCKBZD9d5aGqYa2ya+3w+4+HhAY9PTxBSQgiDSWuNWRiGlgbQyAYghlZ6ECOBBoCRNaVxaltIKSGlQU8ECCVApHG5u0AIASGFAaUZAgKa9QSYQOZ1B3Bv377F6dSChv+YGI1soKDAwsgeDfcDQNd1ICEhZQNBBIAMQCKBthXoux5iaBaMssQMIQhSGGBiaFYpJRgMwQKMUUFmriilDJc14/7uDm/7fmisoZkjdDqdADKtBRiZbcYffa/AANpTi4EdAJsm01qhaRrDqUFWZ46xW8vw3AiQmfF0vUIQQWPW+pHrTjMzwEOLjHIuJMyPtpUAM/qun8zFyHqA8O7dO0vjxHxt/EPk/KbBdGitjYxGeea9GxmGtE0zMUEwGIIIYtCa//n1r0E0gxPC/L3cXaZmjIJzWAhLeXi67t6XJoYBysyjDJqCldL47h98x+HGxDXDU4DMOUHCKpCnMpyKBg7axyU0th6NSjIXbLgJRtAkptnmipjcO5hdeMw8cQGWMS4FaqwBMNoHYNBEV3hpaKK5qf1CkhUMIHwO5sDFLgkDY7Zfv/rvX0UfnrsxzLIXAJ5rYGYopfDixX3mNZYp0HXfRonB/BMRtLZfkRY5KKX0nhmeLFSWCaDWGjCGHefzOXrj7dY54AYUITAL4Pj35cuXAfgqgPaDEWVE8oWjF2ZgDPPy/WC058cqOQgAQg7G13l4ftPQ0vl3eDAH7bW12LmWIfvqBNDYHuBbH388lpIuIdSO4PA0iErbtlVN6pTDGO3gXGuc+/7J5Sbqbjerotm82L2KLaepugWAsMP3SOs+ez32tG1PDYByuXPK4aCGsLsCgMenxzSaCJENMFJeMcCg4HUvGtDUrQG4WKarRIPte8T8ejTrBfHonBlZAXB3uUwPLblPDpeYoazurpYmDo4xiHFXhrKnSsz5MIqIgZtbwTfatUTkaPF8Ml19mjymuT9WAgQiMhip2jsuFNINoOwiPIChOVhbz5bmtZ8x7palNRT88I7JdgQKK6yGOFPYxEst6KBaX3UpZwtkcF+qbfEJoBschZQ6vwxo9GYmqVwH0BSGSBMvuEZpf8t7si70HCndxBtN2JjlmmhlFyrs9xRCLDRlPg5J0fNp8Qou1NjB2L2DHSx4mgB2YtzpV1HlU2pgjbulNWe0eK0QxjrnNUoS62ojmIKOJdnlDJiqYKQpqsWuB5wHskS8GFDkKQB4vd5i962iMJywA6QSz/rors6SPfZ+60IvO3BYhyIqgdTdPj1WoNErHNbCO0aXzPpdTRxxFlaVYv0KXIKNnvUiB6dAr0KJfUilEGOKIxYfTpgZxi5hxyJFOVhr7XO09R32NTO2Yzr6g4fJYMoZSNTHtnb44I6Ji59BwApo0cxshWmbnuU7QxIyMv5R8ByAeYTKOhN5/mA7OIOhBNhjRWFTV5eFtpORTADcIfFj/y0cm4tRkoPjA1ImHJ4CstyF0psD2uwsuI9FemHeO+zckaSIz00oJYYHsNTLjRdVe6WMHIBE6SIpvDFbOzt933rymrgkrbAiHDg2R23oentaXckypV9gAtie2iKvubYzKe+L41TRxHkQsd970DYzk3gf3xc8nU6rq9huBykeIhyam6mnveAk8oNLDymVHy9eUpL8C+RfLjLSVEZTYijT19qymI4U84q5vomfIyhGLIEZodIcn5tX5PiFSirj4IYK7u7vNhW+3hvN1rcP94CiwL2wIq9PS02xylWVnP2WI+VNa4oV7P8uh7T88GJmgahU0Tk82kHTF2vPZ7qONzXO7BvzwnUezTqIK2a/TY8ujri7Fe2XSYzTs4+4u7RLlr+qvIlu12tV0SnKAmTtGrcaeUvN16+liAwmpMo6zdPE2Rhkc+4wgKlqj1KGJVMZ9wf9hzLo0jzcx0paAJc7rh1HJ4rJym4dU0F9se4TwUiTryTz9fXsOzb9ViGPucfWkti7w3fzmTt5M3nhDyth1uWvtc8wxDivSiy3YGl9e2b5nQjs2WxJ2Qvks/yc0WGefxzptiYMdYTSKzOswxqoZS1VbaifJ58wU+jN7FzB0gstiXxkel55T+LH6P61PSK7uJIk/Ybn9xaqRjuZdfT8TLZXWxbWV/qDydl5eSpJi6yk/BTR1S1amcjJ0M5hp+eRFy7bzVEA0F3gN1PAzHExqrWSdvOoTYRmQ32UCd7IxfjKqNhxtHLrxvKMGjblZtJlhtpjZ/rrqPyBxUkVxe5fcZUAxtXeBVQwNWqlBKVXIVSVWR80rUr2rleTonGStcTBj5GOUJK1tHGJURHA2h5vz0aJuvyxFNwWR2sXQ711/Vzp+doCD5BBexhshfx5TVUBsHK8hLcaGEMFE703DXJtpgWA5P5c5VBs88HqexLOXdyfJoBNGx86jmbrdzCMpSmg5bn823BspvJZwJUFbwU7Ztw2To2yFh17/wKzYxUdqljQnbGUYw31Dnce581sXWgwsPC4nmQzmfpWc/C58oSrABb3smsm2trpcjyDR72fs7DQhd269Aj6Ip92zW6VlrmAqj6yjtMzBE07ufy707HrSb4+VA0wGmVszD7kyHEC1y9AtQtxf+4ak9SPI+7fn/gllk+VL05oxk4eGZOspLR81tEEMJhpWVjwFJZ6sueXtVa8n20R/loqBhivKiez2zs7xg4cHHccrUsi7ZgCZiDY4HDp/j1pn/XF2Vu/Nt7Mot8VUEm/UAiwnAupvVOIwrGRZwg701XYV5qmtY722pTJrir3qplrQsr1JqY49RGtgfKXTQ3VoGJUMZDzXJGwS3kO7jLJ46swMzVe2VZv5qtpuHL6/xc0xWilFSq6U8jNEOv9lRoLtM9qiGSOdztt418RhvCmVftRR4v2dg1YHhqMjdkVY4lSPQftCseZRwfSLlocw3iqWPiXo8OjunUtPD+1HWAuHgZwsXZhLirEo//jPYm16fVMS422b+++uKbp/v6FdWYYgBjMzzSYtCskl/IcLOoN/HvWbYWaosVpyn1v7xDg2pO4CTSZovyytfJXSK7QHou43TLjI9E+2PxZv3eNS+u0uGgUbONo50DpCY5eYrRoc6bVWNLdpVhqibEvUIMszplT9m/0jndyt/bp649b9BIAnI8tI8fwFp8uKwADOBd1cwsAN5dwMEUA1rT5uBGifab82RKq42Dl+rs9aHXgXjIO8vS0faepnWcB16XSSyi7jQFrb4nkku3L3ZulKod1YWcd1/M6jMqnRgWcWDrOna2nXe0gW/8u3VVKVbsEpFz/7WngjLOQu3UpGRn60uXLMPIlzZRfFVZR0FEU1+LMyEMtxK2vVLFkqALG8MmPPfhdNNoZJQo/HsDYD9hIG3YuQ9YkHmYHw6XiJeNxxylPpRavpA34A3er66xA3bm4flvoLXTYcOzikyUOJQq2VivfGCyC4PhpKYUVZAz7Mm3eIDGsugrMcyxbA9JD2ClTswSldKxk5TCE1VtkPJyDu7qSFNZeMNJ0zBr3HSnrUdfY6XoqzSxE7ysJhBYqsNbVbeFr9XKNZSV4hmEIu5p0QLS16lVmZmngI+4AMji4ahQ8190dkd0qppLKCzm49HGNaopqRak8hPdtm7NQlgWJUDb6dsibiR77vkhppfFHt2r6xoV/8ZOTgtTjCagYYN/Hd1FZTztr8eoI7jk+QVNUhed/hT3OfCY2nzVF5TK4iLKcU/tNjYoV9MwJrt16krhTdMCeR26Ny5aMUyHdVz+5bMmxiNy7gso96tX1Hmxmkg73M8VUVU28jCtxdSXI7PLdtS9eLB6FlBntrLmyppQyWt5/MEtlNx4b1XHyINGco/n5yu1ghorBLd8XB0j+gxWBi+PGbE9iFnFQa3tVmJ/O+jokjwotbrkuHxCTZIuMaMtudtA9XP6KWpri1vE4dyuLw6rW3mLSviV7In5y1QdU0mX6ylJQ2wrawQ4uAVnhVVsPrA6a4gyKnHSkodCeWreFAD1NLNLeWMm5WisoABiK2YIHOLxFKUNLaXy0OnCv62XXR3UHbcqUglMGMyYEaY860rxpRzWmHCWgluXyGaaIbvCMsHp1bBlVR3UR7Cs4+LzJmeLJZbErpbml9Edu13rUlRTA3mETiJGO34xkI+3jLBwolmUD2rl+LOXNTwFTYeycuC26k20GjsuwnH+4AkyMdt8IYs9Hga2z3/xTB8jiYm5m2V9O3zVuBHFsbsaD4h9VDe+x/cwOH1ApfnMKd8Qp7WVyxMzbdi4LT+wfuadXhSWP3CtpjyXjK1ZQXVS3JFyVl0poOUcdEc6SRVe7r9AuiVlzJiXqv+zQTdcPJlZRroCywisd1uenDVNEY9N55qNDvzqZJiNUrHTE5NknuGTToSJanAWcpZjp8Y5P7WlFwZWpj3QBrtMaWzR2gBYvO64lGQZ36fl6KhsKc+xZohusYNVuu6Wk6y3R7n1oEWDbztui5VyIo2xnMMExu5ad3d+5rm8vCjhobz8QulI5r9SFe1jgPn+TM1FFVoGmQnaLoIocVgAQ0WUbW+KEMipaHcsA9PAxvWgTjnOm9447aW1+cI+IqJBW2UGjPHkdznnkNVQwLaUsdN9+T5yyS8jT1bB/Irzv0DVNnPhddNt2UPZ7Fa5xjwfkLrf30hK3nMrx4sL+d0dz4wCs2WTJ1uS1ZZSQqM0KzM4Uh+ccoeSsR13K5MWojrGwOtFBsYdJckksvwl734zds/plWraDA4cChV2I5vaiAKBSOllhzFEIHfyvxRLyZQiHOax28dFKnARCRJPni/t0dc73TBfDwcIObdWecXESFT3bcOxJInu/GYitwVtLxTKotE7WmGlo/4ZqKsgPFgRPYdS0iKl0afqucxZiccoasqUuOdqZKl55SaFoP1xJ6Xeh+qnyhSXPDxRwMmc8Nq3QjvO80B0vpPzkskQVsVlJMYrG0JUUmZ6XK26u0vWw3IQ6J0LnNdSUlFRcmeew7kEr9t3ywCxNsE0XXHRX/RTRjBu2Hkaa6iZ6RzUmeXc5ZW6PLnjJTaANTUtGI6IFUZAFy73O4mBi2qqxe91b5LdXKq7IYU1Vti6GYyxmLyzaONJUcMWbHkVEVduoZwGmygkVxjPcORnO7UIVuZQFyMFTEVuzYHY2m5kku5Ml5/qxRMyyu0dds9cl2Pl+6KReO83C3DbBcdEfDAUyHzmG5a3fjKSULxuFsHjOQso5Dg2198wmeDWLDSqdhLV3+rQ6ie5+WDe8aa+uLhh7jVRVV+JervRAFRN7ZomK+SLhv+Nlt5vbDrCIA+xWHnQscTdrDVWP1Tk66q8TDG7m0tA4SZntnjOlekYyNaCzhzgmJiik+Za+05PMr2Lhn+8A+C7WOrc2T2XZrTIvK/387oY6rCGjCHkAx3R1VaXW9YG1ohmdXGa3qN3C4VJyX0Ws450SNCsWny4IIvuwedVOpJtWJi5noNP9SS3ts+hqVJSYOG5Emf8EDQNtk7bliRbelTYv1wjNzBqI6WfWNbHfpUTqSHd1dS+wOAs4X1yOq4AQohqQT8Wz36L3BLdtClyitJjl989Hr2eAHtLVBXtFFzS3/ciemrzLsrU4V4/yBwvEyO5JOMG69nSaz2+ggs9XpeuJx3heQLWRVg/Hlva2G/fLXre2Uysd1pY4bKyucg1Piz3qkkvpseMDXP7U8sayVQ77yWHam1lbuG8HN4KMAsyGjzHfL6tIC7RwkwAiX6SyHhoXT9mdF3v5Zx7+i9VY5nsvABy/Tjpr3Mwtu4DbrRuE0/0eSXFtlcqS3d4vCO2GAyILXBbLMxlqH4iT48t0i7LZvq7OWV+cHIL1mlkpZUD6SuK7/jswkGhh3syoACM1qQDKx1TlcuXvdLQ4avssWRxX68yrdoxGO1rM8/k9aOCgO0Rqc87moAEWGhb3ZcasKuN88lclrgY4U6AEoTMYBEfBbwCL2+wWMjhcdMX+l8cTzZ4AN0kEz80cl5wyhCEHEdHQQnI87QHkIX3xVIMlaQw42fLx/PiZOHK+PDooj/9JwxW0PKnC7kXcKyOWGbDV9MwMvdeCF6LZKfBHg0ZOvX//GD6dMO48IN/D1CRXJk7cG+ogp3nT4KZfWwBmd8/z6h49lmwfPLyIrdyTkqwhnltueQbmULGZ7+Irif2/VwEzzjtsBjFocXqgb6x6BhcqiCnBteDMjK7b/rEBb8mQ7w3PdiwYjwuZZj8FQTStTR6f3TQcG4ysesdlhc8wx70+jLK411YBTNQzcxD+nCvb6CFQEvvZ+XA+Xv+lKy/GGI/ePbzH9EVKdps03t5hb+srWjFA84wvf4YuF9NUTSNx84SeHbCuPxi26BDLVJqexRSwH5JGXa1sCS6HV3EwVTgDaJs2uK4jG+Kw9c/Y1WFSkFIKwS8umJNS4nI+z+Ema+e6/8xKTy1J9ducBuYo0JrgmS1U0JPEquIJ2/w0O83sTU0KSyhs+/QwRKKbDW+M6//scgXmEOw7HzUAAZNBnd8/5rokYB3QzNm+eKol+cY+i60VsVZZzao0CM0AnbrZ5dEi/4YXSHFPSrmJlQvDEAYi+6eGv5MjEVwfVd3pY8qIkfeof/vmt06R0VaPcsubgRkJ3EMRWjoumpZidVPBTWmtiPfsiL9xhgKAJ3sIy8IQ86htoEEPkpv/H5kdnAQ4iVTi7VMpisBeBk/OhcZFosoOmpuJCC9fvpwKneQ9AM9TZ+Fj4/lykkdmJD5PxfNmggaMcCvUVb/7WG9nHICTnDlz33OFx3oTD+7G7kQQAKXm4a2HhwfHc55sXW5VgufizHI98H8fQ13gFVjHo6xReHZEF5Q0+5Tem2Qobwdjnoj3I64k/rjTgiWoBmhR2zSJkmY9XdGhFdMEUIzpN9s+2dOQU3ba1+ap+ZayW4lrnqhnlmu43CEA/aBMQdAUWSfH6cuoUZzQmwk4FfosROS5+/nubTc7GDaJ5x5MXcv8N600c1nZ/eRqAIYUeXOylz4mlGSaIu81vReglIQlYQpYWZvTjcLEmBUmEH5Pm4drqYmRpY2dybDGBf52vUHKYDfA6X9fBsOXcKk4qov3E3HS1m4VuVnI43l7c8W1FHcWMLPYpHGHJnQcgdnPCTR4p5HOAGD0huALzD7rXEPtdLOZsbrVAJVSMw5OTdJm12u3eg9HBlbkpJ1auGDLcX/xp80v2yxGVeKIkaboBolsAvBYl2XfZMuj392tpcBY+a3CMHKolLd5p/ebBmA24Bytzm7ZFbMlU86cBLYryPAq6M/rKZMCdjUwKol2T+NdXfIRy9NvXhmTFifJVZNAkceDSOpjHoao2Qt4aYX21JRzPMFO5a7jEJO9WAKzHGCGYlNPnJ7DMzFBduIYM2NXMFef/EiF3X14Xk0M3hL3xolCiwABBgnhdA7h+EikoWNJaYt22Weh73vXBvuYLAypXsMGvGYYNgtwrsV2Tu3BBscJtG9PPLt+G/yCjWINzfO27Ht4wBnKoJ1F2LKuxAE4JS+D3PLs+/nkMdF5HjCptrRXVAlwLNA9jstPEDhFfD/hZGV34GAcifc74inE1SO0j0txShHAqZdIDCG4E5JdRZm5GEZ+xn+1q9swFGZVGT+bTHklyooKahnFN6fj8JR/OAdQIfc8ZBBCFOWlEwCTupl25zyFKJmsuLZbDiLxpmmcaXWjTDLzEBd7gm4pTk4GQ29npZIAwOPjY/R5MhOgvFeKVRTugck8T4Z0cC4BdJyRbMXu9Lz83lneUURJij3qv/vpX5O0eqIxDtFKOyC01rjdbpGKR3OT0HDv3iqPetz2XjNDCELfK2itQSScisbeZOK2nfZKdBL2EnIiKtZisv/yAFAKwm/ffIamkVBKoes69H0//XV9PKMsMQ0OTc0a1SVHVqdZH68/+ga6rgdA6LsOmjWIrZEnIqhe43q9QQgBzeOHeght00xNF98auqwvnl+WQAwwjQDJaKfZBcCoW3fr0KGDbCQECCQNd5WSYGZIMWo049bdIIUcsg/j/ME5ly2EhOqVBSTFO/eVaORgQwJdZ5ZhaGZcbze8sIWdzAxLIoG+VwagFGA28kowzaqGbQ6IBCClkWcMu+B6Wmvqio9tmAYz/XdjQ9cMEDSImqkJxyLapgEJATFwhTXQtA2U0hDTp1dn2VNaD8pBIEgrniEYb9vlpxsaMJitWR8ggJVG07RgNjGJVgpKa1yHgUUpBe4uJ0gpIaXA+XwCQGikBAma+tvRY6EBAQkxm6HY9BIOeyBjAMxFAQA//fFfkmkuawIiDZ38YCLG86dTg3aIL86nM06nE05ti6ZpJpCChGOIhRSQUk7lB+sF4FouuzEm4zRPhBVQfY/P3ryZWS8INHCHQJBNg0ZKyBGQMACEEJDD73lmuymTBOF0OkFKASEFhJRGXEYwE/csow8r/casoVWPy90Ft1uH0+kM1gqyaaB6ja7vcDmfIQSBtQmE2rZ1GNG2rbVqR03xiNIKUkqjYJpBZIx/3+nZ5hGNSjCRs2ztJ3/1IyIYBWhPrRHuwbaRMFzolQJgmlxpBdYap7ZB2zRoGsO1pmmnvyQI7emEtm3Rtq25pzGcNpN2aeplBJFBRPP8iXDRFespsrvduomzfdebprGaUwo5Zx6G9/V9GLNIyz0Wgow8CkJ7aiGlmMEMYjOKixDCBdirHoIAOWreKIM0AhlkZBL22SuZ+lA/p81zLDL+JqJJqQBCM3DV4VwMoGlm4O7ubvBeOjAbeVJ9j67vpxnDJGgSajKaYDWPgO+1jAOKp9N5sgpN00BIARICUgpH6cRouuBR33U4n40cdb1pZq01eqVAMJ6PPaAzAhzh2PybzAphyDDQlGmQsoEgMqCIIGUzaXjTNsOxDAH++Ec/JIBwaltrsQDhdjW+4Hhu1EYnIztwcTQto4iMNprZztEY0WnaFnLgZNO2aAZOTzLvAwQA1XU4n09gZrx/fD/FKI+PT1Ba49Z1EFIMjoCYuBJzRclq9hFc07QgMtxq23aym0ZRxCCfMs5BAPjRD/+MLucz2rbFYPehlHG1RgHu+37oVucmp4mDrqkgIue++ZoYuGVp7SCfSRkcibXGuW3Qqx7jOkQiwtsv3g6NTui6zlSujRMryMgTEQ3u1mxCgDlXQ841A8EG2LQthDRmLAnwB9//Hr148QJEhOvT1fQIw2BO33XoB9fqeruCYVaAadZzh29e0+EYYx6xIkLAaTkY+6F7WFgADUD1Ct989aHR4kE5lNL44osv0XXdBHhaQ8cMrec1dU7KmMjxXGxwcCABtiRnAf7g+39MihkvLmdozehVB6UUemUAa22c1+vtNsUymg0wzQzWPHjhClqpyfj7AdRopnxwi+uLAeDP/+SPqGlNzNF3Cr02c2ceH694fHyczE7X90MwZYCZptaznfTnbflkGXbL5pfN5f/+9/6QXtwNK7yYcL1d0Q2u/8PD+yleZmbj7LKeHF6l1AR8vMdvZhujOTWDLZ7Qcrt1aKUw3BGEp+sTlO7x6oOXkxOitAYxQ8N4TnOIaoetmNkTUHi+OCf2Fz/4U3r38A4gBo0xBQMPD4/4/PMv8PDuPQykkWYujRo8OcyWYxoY9rUAAeBvf/JjevPmDQAN1V3RqRuu3Q1fPr7D+/fv8f7hvZW3cQ3zpBg8L0rVbK0ZsMzTHJuEL1BEf/+Pn/KHH7zEtetwOZ3Rns9gZlzaM+7v73H/8g6n9uS4bDyamMlGAnP0i+m8r0yrh4B+9um/cNM0uN46nJoW57sTbl2H8+mC737n9/Hu4R1ef/R66g5noGRiVriZBCu75NSzfozKAkpCQinjRDzdOnz8+hW+/ckn+M1vfoOPXn8Tv/vJt/D4+DR54wNagExnALtXwezGWfzdRp/+/JeMwev+7PPPcXd3h88/+wy/9+1P8PD4hJcvX0CxAmvg1LZ4/Y1XE+9ObQspTZ/8+HjF/f0dlOrR92ryQXejT//1PxhMU2rk7ZdfAiAo1iDRohGmC/ydb32M660Daw01ZMpevfoQqu/xwQf3+OLtO0gpTTZjT4AT0F/8O4MZJOQQGgDX6xVMJmtFILSXE/rOxEDvH83q77ZpQFKaKLCROLWnYwBOQH/+b6yZZueWBBgK0NK4cUS4dTc8PT7ifDlDkpi8JJr+ewb62T//gkEmzyyFhNYKWptwoe97PN1ukELgfLkArNFpBcFsfMvnAOjT3/zDP3Hf95DC9LSaNZTSuAxhhgaAIVf0taf/Bb9eHdLAbeVXAAAAAElFTkSuQmCC"/>

         
          </g>
          <g className="abc-411">
            <image width="54" height="12" transform="translate(1238 401)" xlinkHref="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADYAAAAMCAYAAAAppE4WAAAACXBIWXMAAAsSAAALEgHS3X78AAAE0UlEQVRIidWVyYtcVRTGf3d6r4ZXXZ2k0zHBIZ1EDRhHcEJwJ27ihIILBUUUUUFRN7px4dKNIoigCP4R7kTBtKIoKAmCA0ZdJMa0na6urvnd4bh41dXGMe70wIELF979vvN953uKc6hnnn9B+v0BJ0+c5KeVFYw2ZJlFKYVCkZKglCL6gHWORqOgKApq9Tp55oBEo9lAIexYWCCv1ajVarRaLTLrWO906Kx18CHgfYn3JSklQgyICCJyLjARQE3PFuD+hx4VrTXaOJSxYA3PPvEoB/fv5dTpFT794hhHPv6MZE5z6NBVHDv6OYfvOszBSy9mvtnCKINGoZWi3Z6j1xtQtBqUpadWr1E0mzSbDZr1GiFFfIiEGIkh8tU3x1nvdOj3e+S1OoNhf4pySkipGWrZRP/7Ur9hNGVnX3n9Ldm7bx/NouC7b79mvbPGDydX+OHEz+w4bw/fnzrDxsBTNOZoNdv8srLCNdddyz23387S+btp5Pk/T1IqRTfflSRorehMAr3+UfqDPq12i8lkQuYyrDWEEAjeY6ytsCtNWZZnsanUTNMWNAZtDCEG1GtvvC0/rayiRDhx6hSj0ZB6rc4FF1xEPc8pvWf5wyOsnlnlhuuuZ+fCAu3tO3HWYqzBTh/enFicWmg8HuF9oN/bYDKeMBoNiSFwxeVXsH//fm69+Xo2QmJbbv9yIEkEEQhJiElIIvRGlT1TErwvQWQqpyCAD4GYEvbE6RVQilpeWaacjDmzuspwMMAHT7fbZTQaUk4mfLB8hPl2G2MsxmUopTDWISmRQonWmpQSKUUkJW49fBuffPQheZ5RFAV7du9BYjX1V998i9FgyHNPP8mLL71M6Uu893jviTEyHo2IMaKg+l5MpBgRQCtFSpVKUrm2cqACpVW1+w8//pRMygkb3XUE6HW7lW1EiMFTek8SRV6r45zFOMONN9zEfHueMkaGozHjsWd9bY3uWpdGM8PHkuPHf+TgJfvInENQ5HlG5jJ27T6PjfU1TNaAOMFozaQsybIMBIzWFeAkpJRwzs3sjIDWerpmQozpLIW1UjOy6sFHHpPuRpdBv0duNrewSjpjLc3WHEYbDh66HOssy8vL+OAJMSJR4X3EGkUzt5x/4V6c02gRohY0GvSWU63NWZifRyuNNZasliMImOre2GwrNKat0AiCQiHIVB2ZKfTb7Nh0pdJbWTKr2+64U7TSKG1IIjSbBcZYLrvyat5//z36gwHGGFxm0drQ7w7obPSxGvYsbmfp4gO4TJMSWGVQGuZbcwzHYw4s7cNYS7/Xo1kUFTylpmlXEVKoGSkEQghbhESIKU53r9JNa42ZtvcBbarzH4j9Xd18y2HZtWsnOxd3kJkGR788xpnTq4zCGInC4sICSweWcFlGZi2ZNbSLgsXFRQQw2mCNwUc/G7UokCiU4xKtYDQaU5YlIXhCCNUuTS2pFMSYsM5hnSMJDAd9jMuwzlF6j4hQz2v8dST9SR159x11930PCkBIYcsHCCEGgo8MekNqc5rMWlrNBtu2bQMgxYRGM5gMq4Wf/Z4EZwxl8MQQ0UAZPJKq/ekOR1itMN6z1u8hSWbxDuBcVnWW0V3rUK83aDTq/06x/0Ld+8BDspm8anM6Uxq+LCsr//9onXv9CqSbnfrrh4CdAAAAAElFTkSuQmCC"/>
            <image width="40" height="465" transform="translate(1252 411)" xlinkHref="data:image/png;base64,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"/>
            <image width="55" height="12" transform="translate(1291 401)" xlinkHref="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADcAAAAMCAYAAADGZiUoAAAACXBIWXMAAAsSAAALEgHS3X78AAAFGUlEQVRIie2WTYwcRxXHf6++5mtndmd21us1IVhxQhYiCwVEECQ5cOeCuSGUC+SQA0o4hBPcACXADVAkAkgOQsIXJIgU5cLHgS8FpChEguDIsVebtRPv7uzu7ExPd1dXVQ49HjvCkQCJG0+qru6qVtX7v/d//yp57IknE0Di3Sbc3gRABK00SimsdVjn0EozXBvS7XbR2nB0PGY6nVDkOft7eySEbJoBClAUZUE+mzGZTBgfHaCtIaWEUkIikVKCEAgJhoMBK/0VBoMB3/vut97LtX8x866vdAtKNR+KNSK5FXFKxBiIKVKFCmsdRmsEMMbw0fs/Qr/fw2iNNZoYEr6qmE4zJtMp3U6b3b0RS502o9HRfK1EJBFSIK9KLl/Z4rkfP8d9Z+/nze03uOvEJieHff740l/TJz/+MS5e3uI7P3iWMJvV/lQ5Ren5+fkfLcCbGBPGaKrKIwgiat6kRqrrH51zkBKJROk9zjmUUmitEZUQDaODEevrJ3HWsLG2eiM+N21tsHg9c/r97xnxECNb165z34fP8rOfXmBpaUCv22dleIpoW+wcTjicFpzo9WisrbI6XOWDmx9iOpnwwAOfSFmW8bUnHxd55eJWcs7RsLYGpVRNO21QShARnFW0rEYrwShBBJTcnh0pJTywPyk52N3l17/5HV/+0hd49PGvoo2h1WrTXe7hXINut1tTW5ubzAGqqiJUAV9VzLIJV3e2+durrzJYHXL6ztOc2thgVhTEGHntn/+g2+2y0uux1Omwsb7GxtqQc5/9jJhvP/VNYkykmBBABEQEAZRSxFSPK60RrVBKkwCtNcZaGo0G1lqstTjr0ErQWtHqtHno4U/jNHz9G0+jlGb37Wvs748IVZwjqYNnrCXGiHENRBlCqIghEKsSYzRH4zGzLOPo6IhsOmHn6jbOOvJ8RrPVpt1q0R+skpc5b17f5erbb9W03DxzN7LYqgaGCDFGlEgNMMa67ubZ8t6jlELmmQ3z+bLM0M4xy0t8FXn+FxcYnjhJnmW0DOR5weY9d+N9yWsX3+DMmQ9gteP1S5e4955NVoYDtDYM+l2azjIaHfCnP/+e5U6TpaZjlk2ZjfcojvdpNFogwvgAZtNDtq+8zmB1DWcta+vrAMj3n/lhSqnOWEq3aIpQ1+Ccbjd7oS79mkc3+htPqy2+9Pi8pAoVMUX2Dg+pqmKhVTElVBIkJqIIIoad7StMspysCFijSCrhrMEay6cefJBOu8PLf3mJUFUcj4/wvkQrNd81kvkKrTQbp+7g/LPPSC0oIVJVAWM0MSZiisQYazqKoOayL1LXmiAYYxaOilYk0iLjAI2WptFsLpjQ7/cpioLtqzuoJBS+oCLUipyEa9tbXLq8TVYUdDsdllf6WKPJphlViLz4wouc+9y5+ngARAnOOUJVgcDzv/zVbQXAvHV9j9L7WjG9J/gSpRTtdpvKeyrv0VqRUk1HUWoOVGg2WzjnaLWaxASu6Wp8SkghokTRbDTnnBfufN8djMdj9kYlTbEcF57j8Zjd3RF5USCSmOUzzNTw8NmHwATyYsYrL/+drzz2xX/7fFuAOzg8ZH9/n+VBH1+WeF+39f4AX1X4EOator/UxcdIr91GRBZHQog1TW9kPMRIwxpCCBxPplhtiCHWQtNqsdxbZnR4wHRW1vWdEqUvsc7Uap0gL3NSCAjwh9++8B8DA5DPP/JoKn15y5VkXj+SUPNbyIXzP/mvFv+//Q/tHTIhZnUGQ81xAAAAAElFTkSuQmCC"/>
            <image width="41" height="465" transform="translate(1291 411)" xlinkHref="data:image/png;base64,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"/>
          </g>
          <g clipPath="url(#water-liquid-clip)">
          <g className="abc-132">
            <g id="MeshGrid-5" data-name="MeshGrid">
              <g>
                <path className="abc-53" d="M1252.16,411.27c.07.13.14.26.19.39-.1,0-.2,0-.3,0-.06-.13-.13-.26-.2-.38.1,0,.2-.01.31-.02Z"/>
                <path className="abc-207" d="M1251.57,410.48c.13.13.25.27.35.42.09.12.17.24.24.37-.11,0-.21,0-.31.02-.07-.12-.16-.23-.24-.34-.11-.14-.23-.26-.35-.38.1-.02.2-.05.31-.08Z"/>
                <path className="abc-410" d="M1250.59,409.78c.2.1.39.22.56.34.14.11.28.22.41.35-.11.03-.22.05-.31.08-.13-.12-.26-.23-.41-.33-.17-.12-.35-.23-.55-.33.09-.04.19-.07.29-.11Z"/>
                <path className="abc-449" d="M1249.57,409.38c.13.04.25.08.37.12.23.08.45.18.66.28-.11.03-.21.07-.29.11-.19-.1-.4-.19-.61-.26-.11-.04-.23-.08-.35-.11.07-.05.14-.09.23-.14Z"/>
                <path className="abc-144" d="M1247.44,409.01c.58.05,1.17.13,1.74.26.13.03.26.07.39.11-.08.05-.16.09-.23.14-.12-.03-.24-.07-.36-.09-.61-.14-1.24-.2-1.87-.24.11-.05.22-.11.34-.17Z"/>
                <path className="abc-270" d="M1244.45,408.79c.41.04.83.07,1.23.09.58.04,1.18.07,1.76.12-.12.06-.22.12-.34.17-.63-.04-1.27-.05-1.89-.09-.45-.03-.92-.06-1.38-.1.2-.06.39-.13.61-.19Z"/>
                <path className="abc-348" d="M1242.13,408.5c.34.06.71.12,1.1.17.39.05.8.09,1.21.13-.21.07-.41.13-.61.19-.46-.04-.92-.08-1.35-.13-.47-.05-.92-.11-1.33-.18.27-.07.62-.12.98-.18Z"/>
                <path className="abc-308" d="M1240.46,407.87c.18.16.43.29.76.4.27.09.58.16.92.23-.36.06-.71.11-.98.18-.41-.07-.78-.15-1.09-.23-.39-.11-.69-.24-.84-.38.36-.08.79-.13,1.24-.19Z"/>
                <path className="abc-458" d="M1239.98,406.86c.03.11.06.21.09.31.07.21.16.39.26.55.03.05.07.1.13.15-.45.05-.88.11-1.24.19-.05-.05-.09-.1-.11-.15-.07-.16-.13-.35-.19-.55-.03-.11-.06-.23-.09-.36.37-.05.75-.1,1.15-.14Z"/>
                <path className="abc-241" d="M1239.82,406.26c.04.09.07.18.09.26.02.12.05.23.07.34-.4.04-.78.09-1.15.14-.03-.12-.05-.25-.07-.37-.01-.08-.02-.15-.03-.23.34-.05.71-.1,1.09-.14Z"/>
                <path className="abc-174" d="M1239.63,405.8c.02.06.05.13.07.19.04.09.08.18.12.27-.38.04-.75.09-1.09.14,0-.08-.02-.15-.02-.23,0-.05,0-.11,0-.16.31-.08.61-.15.93-.21Z"/>
                <path className="abc-72" d="M1239.55,405.38c.01.08.04.16.04.24,0,.06.02.12.04.18-.32.06-.63.13-.93.21,0-.05,0-.11,0-.16,0-.07,0-.14,0-.21.28-.1.55-.19.85-.26Z"/>
                <path className="abc-80" d="M1239.51,404.77c.01.12.04.25.02.37-.01.08,0,.16.02.24-.3.07-.57.15-.85.26,0-.07.01-.14.02-.21.01-.11.03-.21.06-.31.23-.14.47-.25.73-.34Z"/>
                <path className="abc-62" d="M1239.54,404.31s-.01.08-.03.11c-.04.1-.02.23,0,.34-.27.09-.5.2-.73.34.03-.1.06-.2.1-.29.01-.03.03-.07.04-.1.19-.17.39-.3.62-.41Z"/>
                <path className="abc-62" d="M1239.58,404.07s-.02.09-.02.13c0,.04,0,.08-.01.11-.24.11-.43.24-.62.41.02-.03.03-.06.05-.09.02-.04.04-.07.07-.11.17-.18.34-.33.54-.45Z"/>
                <path className="abc-404" d="M1239.64,403.95s-.04.08-.06.12c-.21.12-.38.27-.54.45.02-.03.05-.07.08-.1.16-.19.32-.34.53-.47Z"/>
                <path className="abc-42" d="M1252.8,411.24c.06.14.11.28.15.42-.1,0-.2,0-.3,0-.1,0-.2,0-.31,0-.05-.13-.12-.26-.19-.39.11,0,.22,0,.32-.02.1,0,.21-.01.32-.01Z"/>
                <path className="abc-47" d="M1252.26,410.33c.12.15.24.31.33.48.08.14.15.28.21.42-.11,0-.22,0-.32.01-.11,0-.22.01-.32.02-.07-.13-.15-.25-.24-.37-.11-.15-.23-.29-.35-.42.11-.03.22-.05.34-.08.11-.02.23-.05.35-.07Z"/>
                <path className="abc-398" d="M1251.26,409.57c.23.11.43.24.6.37.14.11.28.25.4.4-.12.03-.24.05-.35.07-.11.02-.23.05-.34.08-.13-.13-.27-.25-.41-.35-.17-.12-.36-.24-.56-.34.11-.03.22-.07.32-.11.1-.04.22-.07.34-.11Z"/>
                <path className="abc-216" d="M1250.1,409.1c.14.05.28.1.42.15.26.1.51.2.74.32-.12.03-.24.07-.34.11-.11.04-.22.07-.32.11-.2-.1-.42-.2-.66-.28-.12-.04-.25-.09-.37-.12.08-.04.17-.09.26-.14.09-.05.18-.09.28-.14Z"/>
                <path className="abc-273" d="M1248.28,408.67c.47.07.94.16,1.39.29.14.04.29.09.43.13-.1.04-.19.09-.28.14-.09.05-.18.09-.26.14-.13-.04-.26-.07-.39-.11-.56-.14-1.15-.21-1.74-.26.12-.06.24-.12.39-.18.15-.06.29-.1.45-.15Z"/>
                <path className="abc-356" d="M1245.91,408.4c.31.04.63.07.94.1.48.05.96.1,1.43.17-.15.05-.3.1-.45.15-.15.06-.27.12-.39.18-.58-.05-1.18-.08-1.76-.12-.41-.03-.82-.06-1.23-.09.21-.07.44-.14.69-.2.25-.06.5-.13.76-.19Z"/>
                <path className="abc-59" d="M1244.16,408.1c.25.06.51.12.81.17.31.06.62.1.93.14-.26.06-.51.13-.76.19-.26.07-.48.13-.69.2-.41-.04-.82-.08-1.21-.13-.39-.05-.76-.11-1.1-.17.36-.06.74-.11,1.08-.18.31-.06.63-.14.95-.22Z"/>
                <path className="abc-83" d="M1242.94,407.49c.16.16.35.29.57.39.2.09.41.16.66.22-.32.08-.64.16-.95.22-.34.07-.71.13-1.08.18-.34-.06-.65-.14-.92-.23-.32-.11-.58-.24-.76-.4.45-.05.91-.11,1.33-.17.37-.05.76-.13,1.15-.21Z"/>
                <path className="abc-208" d="M1242.45,406.61c.03.09.06.17.09.25.11.26.24.46.4.63-.39.08-.78.16-1.15.21-.42.07-.88.12-1.33.17-.05-.05-.09-.1-.13-.15-.1-.16-.18-.34-.26-.55-.03-.1-.07-.2-.09-.31.4-.04.81-.09,1.24-.12.4-.04.82-.08,1.23-.13Z"/>
                <path className="abc-444" d="M1242.21,406.04c.06.1.14.19.16.29.02.1.05.19.08.28-.42.04-.83.09-1.23.13-.42.04-.84.08-1.24.12-.03-.11-.05-.22-.07-.34-.02-.08-.05-.18-.09-.26.38-.04.78-.08,1.19-.12.39-.04.79-.07,1.21-.1Z"/>
                <path className="abc-58" d="M1241.86,405.54c.03.07.09.14.14.21.06.1.16.19.22.29-.42.03-.82.07-1.21.1-.4.04-.8.07-1.19.12-.04-.09-.08-.18-.12-.27-.03-.06-.05-.13-.07-.19.32-.06.66-.11,1.04-.15.36-.04.76-.08,1.19-.11Z"/>
                <path className="abc-435" d="M1241.69,405.07c.02.09.07.18.09.27,0,.07.05.13.08.2-.43.03-.82.07-1.19.11-.38.04-.72.09-1.04.15-.02-.06-.03-.13-.04-.18,0-.08-.03-.16-.04-.24.3-.07.62-.13.98-.18.35-.05.73-.09,1.16-.13Z"/>
                <path className="abc-258" d="M1241.61,404.38c.02.14.08.28.05.42-.02.09.01.18.04.27-.43.04-.81.08-1.16.13-.36.05-.68.11-.98.18-.01-.08-.03-.16-.02-.24.02-.12-.01-.25-.02-.37.27-.09.56-.17.91-.23.34-.06.72-.11,1.19-.16Z"/>
                <path className="abc-338" d="M1241.58,403.85s0,.09-.01.13c-.04.12.02.26.04.39-.46.05-.85.1-1.19.16-.35.06-.64.14-.91.23-.01-.12-.03-.24,0-.34.01-.04.02-.08.03-.11.24-.11.51-.19.85-.27.33-.07.71-.13,1.19-.19Z"/>
                <path className="abc-338" d="M1241.59,403.57c-.01.05,0,.1,0,.15,0,.04,0,.09,0,.13-.48.06-.87.12-1.19.19-.34.07-.61.16-.85.27,0-.04,0-.08.01-.11,0-.04,0-.09.02-.13.21-.12.46-.22.79-.3.32-.08.72-.14,1.22-.21Z"/>
                <path className="abc-437" d="M1241.64,403.42s-.04.1-.05.15c-.5.06-.9.13-1.22.21-.33.08-.58.18-.79.3.01-.04.03-.08.06-.12.21-.13.46-.23.79-.31.32-.08.71-.15,1.22-.22Z"/>
                <path className="abc-190" d="M1253.17,411.2c.06.15.1.3.14.45-.02,0-.03,0-.05,0-.1,0-.21,0-.31,0-.04-.14-.09-.28-.15-.42.11,0,.22,0,.33-.01.02,0,.03-.01.04-.02Z"/>
                <path className="abc-181" d="M1252.68,410.24c.11.16.21.33.29.51.07.14.14.3.19.45-.01.01-.02.02-.04.02-.11,0-.22.01-.33.01-.06-.14-.13-.28-.21-.42-.1-.17-.21-.33-.33-.48.12-.03.25-.05.37-.07.02,0,.04,0,.06-.02Z"/>
                <path className="abc-199" d="M1251.67,409.45c.24.12.45.24.62.38.15.12.28.26.39.41-.02,0-.04.01-.06.02-.12.02-.25.05-.37.07-.12-.15-.26-.28-.4-.4-.17-.13-.37-.25-.6-.37.12-.03.25-.07.36-.11.02,0,.03,0,.05-.01Z"/>
                <path className="abc-288" d="M1250.45,408.95c.15.05.3.11.44.16.28.11.54.22.78.34-.02,0-.03,0-.05.01-.12.04-.24.07-.36.11-.23-.11-.48-.22-.74-.32-.14-.05-.28-.1-.42-.15.1-.05.2-.09.31-.14.02,0,.03-.01.04-.02Z"/>
                <path className="abc-447" d="M1248.84,408.53c.39.07.78.15,1.17.27.15.05.3.1.45.15-.01,0-.03,0-.04.02-.11.05-.21.09-.31.14-.14-.05-.28-.09-.43-.13-.45-.13-.92-.22-1.39-.29.15-.05.31-.1.48-.15.02,0,.05,0,.08,0Z"/>
                <path className="abc-297" d="M1246.85,408.2c.27.05.54.09.8.14.39.06.79.12,1.18.19-.03,0-.06,0-.08,0-.17.05-.33.1-.48.15-.47-.07-.95-.12-1.43-.17-.32-.03-.63-.06-.94-.1.26-.06.53-.13.81-.18.04,0,.09-.01.13-.02Z"/>
                <path className="abc-275" d="M1245.37,407.87c.21.06.44.11.68.16.27.06.54.11.81.16-.05,0-.1.01-.13.02-.28.06-.55.12-.81.18-.31-.04-.62-.08-.93-.14-.3-.05-.57-.11-.81-.17.32-.08.65-.16.99-.21.05,0,.13,0,.21,0Z"/>
                <path className="abc-262" d="M1244.27,407.29c.14.16.32.27.52.37.18.09.37.15.58.21-.08,0-.17,0-.21,0-.34.06-.67.14-.99.21-.25-.06-.46-.13-.66-.22-.22-.1-.41-.23-.57-.39.39-.08.79-.16,1.18-.19.05,0,.1,0,.15,0Z"/>
                <path className="abc-332" d="M1243.87,406.48c.02.08.04.15.07.23.07.24.18.43.33.59-.05,0-.1,0-.15,0-.39.04-.79.12-1.18.19-.16-.16-.29-.37-.4-.63-.03-.08-.06-.16-.09-.25.42-.04.84-.08,1.26-.11.06,0,.11-.01.16-.02Z"/>
                <path className="abc-55" d="M1243.7,405.93c.04.1.08.2.12.3.01.08.03.16.05.24-.05.01-.11.02-.16.02-.42.03-.84.07-1.26.11-.03-.09-.05-.18-.08-.28-.02-.1-.11-.19-.16-.29.42-.03.85-.06,1.31-.1.07,0,.12,0,.18-.01Z"/>
                <path className="abc-167" d="M1243.49,405.42c.02.07.05.14.08.21.04.1.09.2.13.3-.06,0-.12,0-.18.01-.45.03-.89.06-1.31.1-.06-.1-.16-.19-.22-.29-.04-.07-.1-.14-.14-.21.43-.03.9-.07,1.41-.11.07,0,.15-.01.22-.02Z"/>
                <path className="abc-452" d="M1243.4,404.92c0,.1.02.19.04.29.01.07.03.14.05.21-.08,0-.15.01-.22.02-.51.04-.98.07-1.41.11-.03-.07-.08-.14-.08-.2-.01-.09-.06-.18-.09-.27.43-.04.92-.08,1.47-.13.08,0,.16-.01.24-.02Z"/>
                <path className="abc-336" d="M1243.52,404.2c-.02.14-.04.29-.09.44-.03.1-.03.19-.03.29-.08,0-.16.01-.24.02-.55.04-1.04.08-1.47.13-.02-.09-.06-.18-.04-.27.04-.14-.03-.28-.05-.42.46-.05,1-.1,1.63-.16.09,0,.18-.02.28-.02Z"/>
                <path className="abc-7" d="M1243.64,403.64s-.03.09-.04.14c-.04.13-.06.27-.08.41-.1,0-.19.02-.28.02-.63.06-1.17.1-1.63.16-.02-.14-.08-.27-.04-.39.01-.04,0-.09.01-.13.48-.06,1.05-.12,1.76-.18.1,0,.2-.02.31-.03Z"/>
                <path className="abc-248" d="M1243.76,403.34c-.03.05-.05.11-.07.16-.02.05-.03.09-.05.14-.1,0-.21.02-.31.03-.7.06-1.28.12-1.76.18,0-.04,0-.09,0-.13,0-.05,0-.1,0-.15.5-.06,1.1-.12,1.84-.19.11,0,.22-.02.33-.03Z"/>
                <path className="abc-439" d="M1243.86,403.18c-.04.05-.07.11-.1.16-.11.01-.22.02-.33.03-.74.07-1.34.13-1.84.19.01-.05.02-.1.05-.15.51-.07,1.12-.13,1.88-.2.11-.01.22-.02.34-.03Z"/>
                <path className="abc-190" d="M1253.52,411.19c.05.16.09.32.12.47-.1,0-.19,0-.29,0h-.05c-.04-.15-.08-.3-.14-.45.01-.01.02-.02.04-.02.1,0,.21,0,.31,0Z"/>
                <path className="abc-181" d="M1253.09,410.17c.11.17.19.35.26.54.06.15.12.31.17.47-.11,0-.21-.02-.31,0-.02,0-.03.01-.04.02-.06-.15-.12-.3-.19-.45-.08-.18-.18-.35-.29-.51.02,0,.04-.01.06-.02.11-.02.23-.04.35-.06Z"/>
                <path className="abc-199" d="M1252.08,409.34c.25.12.46.25.63.39.15.12.28.27.38.44-.12.02-.24.04-.35.06-.02,0-.04,0-.06.02-.11-.16-.25-.3-.39-.41-.17-.13-.38-.26-.62-.38.02,0,.03,0,.05-.01.11-.03.23-.07.35-.1Z"/>
                <path className="abc-383" d="M1250.81,408.81c.15.06.31.12.46.18.29.11.57.23.81.36-.12.03-.24.06-.35.1-.02,0-.03,0-.05.01-.24-.12-.5-.23-.78-.34-.15-.06-.29-.11-.44-.16.01,0,.03,0,.04-.01.1-.04.2-.08.31-.13Z"/>
                <path className="abc-447" d="M1249.37,408.39c.33.08.65.15.97.26.15.05.31.11.46.17-.11.04-.21.08-.31.13-.02,0-.03.01-.04.01-.15-.05-.3-.1-.45-.15-.38-.11-.77-.2-1.17-.27.03,0,.06,0,.08,0,.15-.04.3-.09.45-.14Z"/>
                <path className="abc-256" d="M1247.71,408.01c.23.05.45.11.67.16.33.08.65.14.98.22-.15.05-.3.1-.45.14-.02,0-.05,0-.08,0-.39-.07-.79-.13-1.18-.19-.27-.04-.54-.09-.8-.14.05,0,.1-.01.14-.02.25-.05.49-.11.73-.17Z"/>
                <path className="abc-275" d="M1246.48,407.67c.18.06.37.11.56.16.23.06.45.12.68.17-.24.06-.48.12-.73.17-.04,0-.09.01-.14.02-.27-.05-.54-.1-.81-.16-.24-.05-.46-.1-.68-.16.08,0,.17,0,.21,0,.31-.05.6-.13.89-.2Z"/>
                <path className="abc-170" d="M1245.51,407.1c.13.14.28.26.46.36.16.08.32.15.5.21-.29.07-.59.14-.89.2-.05,0-.13,0-.21,0-.21-.06-.41-.13-.58-.21-.2-.1-.37-.22-.52-.37.05,0,.1,0,.15,0,.35-.04.73-.11,1.09-.18Z"/>
                <path className="abc-233" d="M1245.17,406.37c.02.07.04.14.06.2.06.21.16.39.29.53-.37.07-.74.14-1.09.18-.05,0-.1,0-.15,0-.14-.16-.25-.35-.33-.59-.03-.07-.05-.15-.07-.23.05-.01.11-.02.16-.02.38-.03.76-.06,1.13-.08Z"/>
                <path className="abc-361" d="M1245.01,405.85c.04.1.08.2.11.31.01.07.03.14.04.21-.38.03-.76.05-1.13.08-.06,0-.11.01-.16.02-.02-.08-.04-.16-.05-.24-.03-.1-.07-.2-.12-.3.06,0,.12,0,.19-.01.37-.02.75-.05,1.12-.07Z"/>
                <path className="abc-453" d="M1244.82,405.33c.02.07.04.14.07.22.04.1.08.2.12.3-.37.02-.74.05-1.12.07-.07,0-.13,0-.19.01-.04-.1-.09-.2-.13-.3-.03-.07-.06-.14-.08-.21.08,0,.15-.01.23-.02.37-.03.73-.05,1.1-.07Z"/>
                <path className="abc-7" d="M1244.71,404.83c.02.1.06.19.07.29,0,.07.02.14.04.22-.36.02-.73.05-1.1.07-.08,0-.15.01-.23.02-.02-.07-.04-.14-.05-.21-.02-.1-.03-.19-.04-.29.08,0,.17-.01.25-.02.24-.02.49-.04.75-.06.1,0,.2-.01.31-.02Z"/>
                <path className="abc-134" d="M1244.82,404.09c-.03.14-.07.29-.13.44-.03.1,0,.19.01.29-.1,0-.21.01-.31.02-.25.02-.5.04-.75.06-.08,0-.17.01-.25.02,0-.1,0-.19.03-.29.05-.15.07-.3.09-.44.1,0,.19-.02.29-.02.23-.02.48-.04.72-.06.1,0,.2-.01.3-.02Z"/>
                <path className="abc-351" d="M1244.96,403.53s-.03.1-.04.14c-.04.14-.07.28-.1.42-.1,0-.2.01-.3.02-.24.02-.49.04-.72.06-.1,0-.2.02-.29.02.02-.14.04-.28.08-.41.01-.05.03-.1.04-.14.1,0,.21-.02.32-.03.34-.03.67-.06,1-.08Z"/>
                <path className="abc-425" d="M1245.1,403.22c-.03.05-.06.11-.09.17-.02.05-.04.09-.05.14-.33.03-.67.05-1,.08-.11,0-.22.02-.32.03.01-.05.03-.09.05-.14.02-.05.04-.11.07-.16.11-.01.23-.02.35-.03.34-.03.67-.06,1-.09Z"/>
                <path className="abc-34" d="M1245.22,403.06c-.04.05-.08.11-.11.16-.33.03-.66.06-1,.09-.12.01-.23.02-.35.03.03-.05.06-.11.1-.16.11-.01.23-.02.35-.03.34-.03.67-.06,1.01-.09Z"/>
                <path className="abc-410" d="M1254.28,411.13c.03.17.06.35.08.52-.14,0-.29,0-.43,0-.1,0-.2,0-.29,0-.03-.15-.07-.31-.12-.47.11,0,.22.02.32,0,.15,0,.3-.04.44-.06Z"/>
                <path className="abc-164" d="M1253.98,410.02c.09.18.15.38.19.59.04.17.08.35.11.52-.15.03-.29.05-.44.06-.11,0-.21,0-.32,0-.05-.16-.1-.32-.17-.47-.07-.19-.16-.38-.26-.54.12-.02.24-.04.36-.06.17-.03.35-.06.54-.1Z"/>
                <path className="abc-15" d="M1252.99,409.13c.25.13.47.27.64.41.15.14.27.3.36.48-.18.03-.36.07-.54.1-.12.02-.24.04-.36.06-.11-.17-.23-.31-.38-.44-.17-.13-.38-.26-.63-.39.12-.03.25-.06.37-.09.17-.05.36-.09.54-.12Z"/>
                <path className="abc-139" d="M1251.67,408.54c.16.07.33.13.48.2.3.13.59.26.84.39-.19.04-.37.08-.54.12-.12.03-.25.06-.37.09-.25-.12-.52-.24-.81-.36-.15-.06-.31-.12-.46-.18.11-.04.22-.08.34-.12.16-.06.34-.11.52-.15Z"/>
                <path className="abc-161" d="M1250.52,408.07c.23.09.43.17.65.26.16.07.33.13.49.2-.19.05-.36.09-.52.15-.11.04-.23.08-.34.12-.15-.06-.31-.11-.46-.17-.32-.1-.64-.18-.97-.26.15-.05.3-.1.46-.15.24-.07.46-.12.69-.17Z"/>
                <path className="abc-84" d="M1249.45,407.63c.14.06.28.12.42.18.22.09.42.18.65.26-.23.05-.45.1-.69.17-.16.05-.31.1-.46.15-.33-.08-.66-.14-.98-.22-.22-.05-.45-.11-.67-.16.24-.06.48-.12.72-.17.36-.07.69-.14,1.01-.2Z"/>
                <path className="abc-48" d="M1248.63,407.24c.12.07.25.14.4.2.14.06.27.13.41.19-.32.06-.66.13-1.01.2-.24.05-.48.11-.72.17-.23-.05-.45-.11-.68-.17-.19-.05-.38-.1-.56-.16.29-.07.58-.14.88-.19.42-.07.86-.16,1.28-.24Z"/>
                <path className="abc-363" d="M1248.01,406.7c.09.12.18.22.29.31.1.08.21.16.33.23-.42.08-.86.17-1.28.24-.3.05-.59.12-.88.19-.18-.06-.35-.13-.5-.21-.18-.1-.33-.21-.46-.36.37-.07.73-.14,1.07-.18.48-.04.96-.14,1.43-.23Z"/>
                <path className="abc-296" d="M1247.75,406.17s.03.09.05.14c.06.15.13.27.22.39-.46.09-.95.18-1.43.23-.34.04-.7.11-1.07.18-.13-.14-.23-.32-.29-.53-.02-.07-.04-.13-.06-.2.38-.03.75-.05,1.11-.08.51-.03,1.01-.08,1.48-.12Z"/>
                <path className="abc-76" d="M1247.59,405.72c.03.1.08.2.11.3.02.05.03.1.05.15-.47.04-.97.09-1.48.12-.36.03-.73.05-1.11.08-.02-.07-.03-.14-.04-.21-.03-.1-.07-.2-.11-.31.37-.02.74-.04,1.1-.06.52-.03,1.01-.05,1.48-.07Z"/>
                <path className="abc-259" d="M1247.46,405.2c0,.07.02.14.03.22.02.1.06.2.09.3-.47.02-.96.05-1.48.07-.36.02-.73.04-1.1.06-.04-.1-.09-.2-.12-.3-.03-.07-.05-.14-.07-.22.36-.02.72-.04,1.09-.06.52-.03,1.04-.05,1.55-.07Z"/>
                <path className="abc-242" d="M1247.41,404.69c0,.1.07.19.05.29-.01.07,0,.14,0,.22-.51.02-1.03.05-1.55.07-.37.02-.73.04-1.09.06-.02-.07-.03-.14-.04-.22,0-.1-.05-.19-.07-.29.35-.02.71-.04,1.08-.06.52-.03,1.06-.05,1.62-.07Z"/>
                <path className="abc-29" d="M1247.56,403.96c-.07.15-.08.29-.16.44-.05.1,0,.19,0,.29-.56.02-1.1.05-1.62.07-.37.02-.73.04-1.08.06-.02-.1-.04-.19-.01-.29.05-.15.1-.3.13-.44.33-.02.68-.04,1.04-.06.51-.03,1.07-.05,1.7-.07Z"/>
                <path className="abc-124" d="M1247.8,403.39s-.04.1-.07.15c-.08.14-.09.28-.16.43-.62.02-1.19.05-1.7.07-.36.02-.71.04-1.04.06.03-.14.07-.28.1-.42.01-.05.03-.1.04-.14.33-.03.67-.05,1-.07.51-.03,1.13-.05,1.83-.08Z"/>
                <path className="abc-6" d="M1247.99,403.07c-.05.06-.07.11-.11.17-.04.05-.05.1-.08.14-.7.03-1.32.05-1.83.08-.34.02-.67.04-1,.07.02-.05.03-.1.05-.14.02-.06.05-.11.09-.17.33-.03.66-.05,1-.07.51-.03,1.15-.05,1.89-.08Z"/>
                <path className="abc-99" d="M1248.12,402.91c-.06.05-.09.11-.13.16-.74.03-1.37.06-1.89.08-.34.02-.67.04-1,.07.03-.05.07-.11.11-.16.34-.03.67-.05,1.01-.07.51-.03,1.15-.06,1.9-.08Z"/>
                <path className="abc-2" d="M1255.4,411.1c.04.18.07.37.1.54-.24,0-.48,0-.71,0-.15,0-.29,0-.44,0-.02-.16-.05-.34-.08-.52.15-.03.29-.05.45-.05.22,0,.44,0,.67.02Z"/>
                <path className="abc-418" d="M1255.07,409.96c.1.19.16.39.21.61.05.17.09.36.13.54-.23-.01-.45-.03-.67-.02-.16,0-.31.03-.45.05-.03-.17-.07-.35-.11-.52-.04-.21-.1-.41-.19-.59.18-.03.37-.06.55-.08.19,0,.36.01.54.03Z"/>
                <path className="abc-399" d="M1254.06,408.97c.24.16.46.32.63.48.15.15.27.32.37.51-.17-.01-.34-.03-.54-.03-.18.02-.37.05-.55.08-.09-.18-.21-.34-.36-.48-.16-.14-.39-.28-.64-.41.19-.04.38-.07.58-.11.18-.01.34-.03.5-.05Z"/>
                <path className="abc-274" d="M1252.8,408.27c.16.08.31.15.46.23.28.15.56.31.8.47-.16.02-.32.04-.5.05-.19.04-.39.07-.58.11-.25-.13-.54-.26-.84-.39-.16-.07-.32-.13-.48-.2.19-.05.38-.09.58-.13.19-.04.37-.09.56-.13Z"/>
                <path className="abc-395" d="M1251.88,407.81c.16.09.3.17.45.24.16.07.32.15.47.22-.19.04-.37.09-.56.13-.2.04-.39.09-.58.13-.16-.07-.33-.13-.49-.2-.23-.09-.43-.18-.65-.26.23-.05.45-.09.69-.15.22-.04.44-.08.67-.12Z"/>
                <path className="abc-354" d="M1251.14,407.32c.09.06.18.13.28.2.15.1.3.2.46.29-.23.04-.46.08-.67.12-.24.05-.47.1-.69.15-.23-.09-.43-.17-.65-.26-.15-.06-.28-.12-.42-.18.32-.06.63-.12.93-.17.26-.04.51-.09.77-.14Z"/>
                <path className="abc-407" d="M1250.63,406.91c.08.08.17.16.26.23.08.06.16.12.25.18-.25.05-.51.1-.77.14-.3.06-.61.11-.93.17-.14-.06-.27-.12-.41-.19-.15-.07-.28-.13-.4-.2.42-.08.82-.16,1.16-.21.27-.03.55-.08.84-.12Z"/>
                <path className="abc-194" d="M1250.19,406.38c.07.1.14.19.22.29.07.08.14.16.22.24-.28.04-.56.08-.84.12-.34.05-.74.13-1.16.21-.12-.07-.23-.15-.33-.23-.11-.09-.21-.2-.29-.31.46-.09.91-.18,1.29-.21.28-.02.58-.07.88-.11Z"/>
                <path className="abc-86" d="M1249.92,406s.04.06.06.09c.07.1.13.19.2.29-.3.04-.61.08-.88.11-.38.03-.83.12-1.29.21-.09-.12-.15-.24-.22-.39-.02-.05-.03-.09-.05-.14.47-.04.92-.09,1.32-.11.28-.02.56-.04.85-.06Z"/>
                <path className="abc-317" d="M1249.8,405.62c0,.1.03.2.06.3.02.03.04.06.06.09-.29.02-.57.04-.85.06-.41.02-.85.06-1.32.11-.02-.05-.03-.1-.05-.15-.03-.1-.08-.2-.11-.3.47-.02.93-.04,1.37-.06.28-.01.56-.03.84-.04Z"/>
                <path className="abc-152" d="M1249.84,405.1c-.02.07-.03.14-.04.22-.01.1-.01.2,0,.3-.28.01-.56.02-.84.04-.45.02-.9.04-1.37.06-.03-.1-.08-.2-.09-.3-.01-.07-.03-.14-.03-.22.51-.02,1.02-.04,1.52-.06.28-.01.57-.02.86-.03Z"/>
                <path className="abc-423" d="M1249.98,404.6c-.03.1-.06.19-.08.28-.02.07-.04.14-.05.22-.29,0-.58.02-.86.03-.51.02-1.01.04-1.52.06,0-.07-.01-.14,0-.22.02-.1-.05-.19-.05-.29.56-.02,1.15-.05,1.75-.07.27,0,.55-.01.82-.02Z"/>
                <path className="abc-224" d="M1250.35,403.88c-.1.15-.19.29-.26.44-.05.1-.08.19-.11.28-.27,0-.55.01-.82.02-.6.02-1.19.05-1.75.07,0-.1-.05-.19,0-.29.07-.15.09-.3.16-.44.62-.02,1.31-.05,2.06-.07.24,0,.49,0,.73,0Z"/>
                <path className="abc-222" d="M1250.81,403.3c-.04.05-.09.1-.13.15-.12.14-.23.29-.33.43-.24,0-.49,0-.73,0-.75.03-1.44.05-2.06.07.07-.15.08-.29.16-.43.03-.05.04-.1.07-.15.7-.03,1.49-.05,2.34-.08.22,0,.45,0,.68,0Z"/>
                <path className="abc-278" d="M1251.11,402.97c-.05.06-.11.12-.16.18-.05.05-.09.1-.13.15-.23,0-.46,0-.68,0-.85.03-1.64.06-2.34.08.03-.05.05-.1.08-.14.04-.06.06-.11.11-.17.74-.03,1.57-.06,2.48-.09.21,0,.42-.01.64-.01Z"/>
                <path className="abc-155" d="M1251.27,402.8c-.05.06-.11.11-.16.17-.22,0-.43,0-.64.01-.91.03-1.74.06-2.48.09.05-.06.08-.11.13-.16.75-.03,1.6-.06,2.54-.09.2,0,.4-.01.61-.02Z"/>
                <path className="abc-221" d="M1256.42,411.14c.07.17.12.34.17.5-.12,0-.24,0-.36,0-.25,0-.49,0-.73,0-.03-.18-.06-.36-.1-.54.23.01.46.03.69.03.11,0,.22,0,.33,0Z"/>
                <path className="abc-211" d="M1255.9,410.03c.12.19.22.39.31.6.08.17.15.34.22.51-.11,0-.22,0-.33,0-.23,0-.46-.02-.69-.03-.04-.18-.08-.36-.13-.54-.04-.22-.11-.42-.21-.61.17.01.35.03.55.04.1,0,.19.01.28.03Z"/>
                <path className="abc-295" d="M1254.86,408.95c.23.18.45.37.63.55.15.16.29.34.4.53-.09-.01-.18-.02-.28-.03-.2-.01-.38-.03-.55-.04-.1-.19-.22-.36-.37-.51-.17-.16-.39-.32-.63-.48.16-.02.33-.03.53-.03.1,0,.18,0,.27.01Z"/>
                <path className="abc-97" d="M1253.71,408.14c.14.09.27.18.41.27.26.17.51.35.74.54-.09,0-.17-.01-.27-.01-.21,0-.37.02-.53.03-.24-.16-.52-.32-.8-.47-.15-.08-.31-.16-.46-.23.19-.04.39-.08.61-.11.11-.01.2-.02.3-.02Z"/>
                <path className="abc-405" d="M1252.93,407.66c.13.09.25.17.37.23.13.08.27.16.41.25-.1,0-.19,0-.3.02-.22.03-.42.07-.61.11-.16-.08-.31-.15-.47-.22-.15-.07-.29-.15-.45-.24.23-.04.47-.07.71-.1.12-.02.23-.03.34-.04Z"/>
                <path className="abc-25" d="M1252.33,407.18c.07.06.15.13.23.19.12.1.25.2.37.29-.11.01-.22.03-.34.04-.24.03-.48.07-.71.1-.16-.09-.31-.19-.46-.29-.1-.07-.19-.13-.28-.2.25-.05.51-.09.78-.13.13-.01.27-.02.41-.02Z"/>
                <path className="abc-98" d="M1251.87,406.78c.07.07.16.15.25.22.06.06.13.12.21.18-.14,0-.28,0-.41.02-.27.03-.52.08-.78.13-.09-.06-.17-.13-.25-.18-.1-.07-.18-.15-.26-.23.28-.04.56-.08.84-.11.14-.01.27-.02.41-.02Z"/>
                <path className="abc-245" d="M1251.46,406.29c.07.09.14.18.21.26.06.08.13.15.21.23-.14,0-.27,0-.41.02-.27.03-.56.07-.84.11-.08-.08-.15-.16-.22-.24-.08-.09-.15-.19-.22-.29.3-.04.61-.08.88-.1.14,0,.26,0,.39,0Z"/>
                <path className="abc-58" d="M1251.2,405.94s.04.05.06.08c.07.09.14.17.2.26-.13,0-.25-.02-.39,0-.28.02-.58.06-.88.1-.07-.1-.14-.19-.2-.29-.02-.03-.04-.06-.06-.09.29-.02.57-.04.85-.05.14,0,.28,0,.42,0Z"/>
                <path className="abc-58" d="M1251.08,405.58c0,.1.02.19.05.29.02.02.05.05.07.08-.14,0-.28,0-.42,0-.28.01-.56.03-.85.05-.02-.03-.04-.06-.06-.09-.03-.1-.05-.2-.06-.3.28-.01.56-.02.84-.03.14,0,.28,0,.44,0Z"/>
                <path className="abc-8" d="M1251.12,405.08c-.01.07-.03.14-.03.21,0,.1-.02.19-.01.29-.15,0-.3,0-.44,0-.28,0-.56.02-.84.03,0-.1,0-.2,0-.3,0-.07.02-.14.04-.22.29,0,.58-.01.86-.02.14,0,.28,0,.42,0Z"/>
                <path className="abc-287" d="M1251.21,404.59c-.02.09-.03.19-.05.28-.01.07-.03.14-.04.21-.14,0-.28,0-.42,0-.28,0-.57,0-.86.02.02-.07.03-.14.05-.22.03-.1.05-.19.08-.28.27,0,.55,0,.82-.01.13,0,.27,0,.41,0Z"/>
                <path className="abc-307" d="M1251.47,403.87c-.08.15-.15.29-.19.44-.03.09-.05.19-.06.28-.14,0-.28,0-.41,0-.27,0-.55,0-.82.01.03-.1.07-.19.11-.28.07-.15.16-.3.26-.44.24,0,.49,0,.74-.01.12,0,.25,0,.38,0Z"/>
                <path className="abc-26" d="M1251.85,403.28c-.04.05-.07.1-.11.15-.1.14-.19.29-.27.43-.13,0-.26,0-.38,0-.25,0-.49,0-.74.01.1-.15.21-.29.33-.43.04-.05.09-.1.13-.15.23,0,.46,0,.69-.01.11,0,.23,0,.35,0Z"/>
                <path className="abc-249" d="M1252.09,402.95c-.04.06-.09.12-.13.18-.04.05-.07.1-.11.15-.12,0-.23,0-.35,0-.23,0-.46,0-.69.01.04-.05.09-.1.13-.15.05-.06.11-.12.16-.18.22,0,.44,0,.66-.02.11,0,.21,0,.32,0Z"/>
                <path className="abc-448" d="M1252.22,402.77c-.04.06-.08.12-.13.18-.11,0-.22,0-.32,0-.22,0-.44.01-.66.02.05-.06.11-.11.16-.17.21,0,.42-.01.63-.02.1,0,.21,0,.31,0Z"/>
                <path className="abc-290" d="M1257.8,411.22c.1.15.22.28.31.42-.39,0-.77,0-1.15,0-.12,0-.24,0-.36,0-.05-.16-.11-.33-.17-.5.11,0,.22,0,.33,0,.34.01.68.04,1.04.07Z"/>
                <path className="abc-381" d="M1257,410.2c.15.19.32.39.45.58.11.15.25.29.35.44-.36-.03-.71-.06-1.04-.07-.11,0-.22,0-.33,0-.07-.17-.14-.34-.22-.51-.09-.21-.19-.41-.31-.6.09.01.18.03.28.04.26.03.53.08.82.13Z"/>
                <path className="abc-374" d="M1255.85,409.01c.21.21.45.42.65.63.17.18.35.37.5.56-.29-.05-.56-.1-.82-.13-.1-.01-.19-.03-.28-.04-.12-.19-.25-.37-.4-.53-.18-.18-.4-.37-.63-.55.09,0,.17.02.27.03.23.01.46.02.72.04Z"/>
                <path className="abc-117" d="M1254.86,408.1c.1.1.22.2.33.31.21.2.45.4.66.61-.27-.01-.49-.02-.72-.04-.1,0-.18-.02-.27-.03-.23-.18-.49-.36-.74-.54-.14-.09-.27-.18-.41-.27.1,0,.19,0,.3,0,.24-.01.52-.03.85-.04Z"/>
                <path className="abc-92" d="M1254.3,407.56c.08.09.16.17.25.24.09.09.2.19.3.29-.33.01-.61.03-.85.04-.11,0-.2,0-.3,0-.14-.09-.27-.17-.41-.25-.12-.06-.24-.14-.37-.23.11-.01.22-.02.34-.03.28-.02.63-.04,1.03-.06Z"/>
                <path className="abc-89" d="M1253.95,407.08c.05.06.09.13.14.19.07.1.12.2.21.29-.4.02-.75.04-1.03.06-.12,0-.23.02-.34.03-.13-.09-.25-.19-.37-.29-.08-.06-.16-.13-.23-.19.14,0,.28,0,.41,0,.35-.02.76-.06,1.21-.08Z"/>
                <path className="abc-163" d="M1253.64,406.69c.05.07.11.13.17.2.05.07.09.13.14.19-.45.03-.86.06-1.21.08-.13,0-.27,0-.41,0-.07-.06-.14-.12-.21-.18-.09-.07-.17-.14-.25-.22.14,0,.27,0,.42,0,.39-.02.85-.05,1.35-.08Z"/>
                <path className="abc-233" d="M1253.35,406.24c.05.08.1.16.15.24.05.07.1.14.15.21-.5.03-.96.06-1.35.08-.14,0-.28,0-.42,0-.07-.07-.14-.15-.21-.23-.07-.09-.14-.17-.21-.26.13,0,.26.02.42.01.44-.01.93-.04,1.47-.06Z"/>
                <path className="abc-176" d="M1253.18,405.91s.02.05.04.08c.04.09.09.17.13.25-.53.02-1.03.04-1.47.06-.16,0-.29,0-.42-.01-.07-.09-.13-.18-.2-.26-.02-.03-.04-.06-.06-.08.14,0,.3,0,.46,0,.47-.01.98-.02,1.52-.03Z"/>
                <path className="abc-176" d="M1253.08,405.56c.02.09.03.18.06.27.01.03.03.05.04.08-.55,0-1.06.02-1.52.03-.16,0-.31,0-.46,0-.02-.03-.05-.05-.07-.08-.03-.09-.04-.19-.05-.29.15,0,.31,0,.46,0,.46,0,.99-.01,1.54-.01Z"/>
                <path className="abc-246" d="M1253.05,405.08c0,.07,0,.13,0,.2,0,.09,0,.18.03.28-.56,0-1.08,0-1.54.01-.16,0-.31,0-.46,0,0-.1,0-.19.01-.29,0-.07.02-.14.03-.21.14,0,.28,0,.42,0,.45,0,.97,0,1.5,0Z"/>
                <path className="abc-283" d="M1253.07,404.6c0,.09-.02.18-.02.28,0,.07,0,.13,0,.2-.54,0-1.05,0-1.5,0-.14,0-.28,0-.42,0,.01-.07.03-.14.04-.21.02-.09.03-.19.05-.28.14,0,.28,0,.43,0,.44,0,.93,0,1.43.01Z"/>
                <path className="abc-382" d="M1253.17,403.88c-.03.15-.06.3-.07.44,0,.09-.03.19-.03.28-.5,0-.99,0-1.43-.01-.14,0-.29,0-.43,0,.02-.09.03-.19.06-.28.05-.15.12-.29.19-.44.13,0,.27,0,.41,0,.41,0,.85,0,1.3.01Z"/>
                <path className="abc-95" d="M1253.35,403.28c-.02.05-.04.11-.05.16-.05.15-.09.3-.12.45-.45,0-.89-.01-1.3-.01-.14,0-.27,0-.41,0,.08-.15.17-.29.27-.43.03-.05.07-.1.11-.15.12,0,.24,0,.36,0,.36,0,.75,0,1.14,0Z"/>
                <path className="abc-403" d="M1253.47,402.92c-.02.06-.05.13-.07.19-.02.05-.04.11-.06.16-.39,0-.78,0-1.14,0-.12,0-.24,0-.36,0,.04-.05.07-.1.11-.15.04-.06.09-.12.13-.18.11,0,.22,0,.33,0,.34,0,.69-.01,1.05-.02Z"/>
                <path className="abc-375" d="M1253.54,402.73c-.02.06-.05.13-.07.19-.36,0-.71.01-1.05.02-.11,0-.22,0-.33,0,.04-.06.09-.12.13-.18.11,0,.21,0,.32,0,.33,0,.66-.02,1.01-.03Z"/>
                <path className="abc-71" d="M1259.27,411.26c.11.13.21.25.3.37-.1,0-.19,0-.29,0-.4,0-.79,0-1.18,0-.09-.14-.2-.27-.31-.42.36.03.73.05,1.12.05.12,0,.23,0,.35,0Z"/>
                <path className="abc-329" d="M1258.49,410.29c.14.19.3.39.44.57.11.14.23.28.34.41-.12,0-.23,0-.35,0-.39,0-.76-.03-1.12-.05-.1-.15-.24-.29-.35-.44-.13-.19-.3-.39-.45-.58.29.05.61.1.99.12.17,0,.33-.02.5-.03Z"/>
                <path className="abc-185" d="M1257.59,409.04c.16.22.33.44.47.67.12.19.27.39.42.58-.17.01-.33.03-.5.03-.37-.02-.69-.07-.99-.12-.15-.19-.33-.38-.5-.56-.2-.21-.44-.42-.65-.63.27.01.58.03.99.05.23-.01.49-.02.75-.02Z"/>
                <path className="abc-387" d="M1256.96,408.05c.06.11.13.21.19.33.13.22.28.44.44.66-.26,0-.52.01-.75.02-.41-.02-.72-.04-.99-.05-.21-.21-.46-.41-.66-.61-.11-.1-.23-.21-.33-.31.33-.01.73-.02,1.2-.03.29,0,.59-.01.9-.02Z"/>
                <path className="abc-361" d="M1256.72,407.48c.02.09.05.18.09.26.04.1.09.2.15.31-.32,0-.62,0-.9.02-.47,0-.86.02-1.2.03-.1-.1-.21-.2-.3-.29-.1-.07-.17-.16-.25-.24.4-.02.85-.04,1.35-.05.33,0,.69-.02,1.06-.03Z"/>
                <path className="abc-322" d="M1256.65,407.01c.01.06.02.13.03.19,0,.1.01.19.03.28-.37.01-.73.02-1.06.03-.5.01-.95.03-1.35.05-.08-.09-.14-.19-.21-.29-.05-.06-.09-.13-.14-.19.45-.03.95-.05,1.47-.06.39,0,.8-.01,1.23-.01Z"/>
                <path className="abc-182" d="M1256.56,406.62c0,.07.02.13.04.2.02.06.04.13.05.19-.43,0-.84,0-1.23.01-.52,0-1.02.03-1.47.06-.05-.06-.09-.13-.14-.19-.06-.07-.11-.13-.17-.2.5-.03,1.04-.05,1.58-.06.43,0,.87,0,1.34-.01Z"/>
                <path className="abc-306" d="M1256.53,406.19c0,.08,0,.15.01.23,0,.07.01.13.02.2-.46,0-.91,0-1.34.01-.55,0-1.08.03-1.58.06-.05-.07-.1-.14-.15-.21-.05-.08-.1-.16-.15-.24.53-.02,1.1-.04,1.69-.04.48,0,.98,0,1.49,0Z"/>
                <path className="abc-328" d="M1256.5,405.88s0,.05.01.07c.01.08.01.16.02.24-.51,0-1.01,0-1.49,0-.59,0-1.16.02-1.69.04-.05-.08-.09-.17-.13-.25-.01-.03-.02-.06-.04-.08.55,0,1.13-.02,1.75-.02.51,0,1.04,0,1.58,0Z"/>
                <path className="abc-328" d="M1256.42,405.54c.02.09.05.18.07.27,0,.02.01.05.02.07-.54,0-1.07,0-1.58,0-.61,0-1.2.01-1.75.02-.01-.03-.03-.05-.04-.08-.03-.09-.04-.18-.06-.27.56,0,1.14,0,1.73-.01.52,0,1.05,0,1.61,0Z"/>
                <path className="abc-151" d="M1256.31,405.06c.01.07.03.13.04.2.02.09.05.19.07.28-.55,0-1.09,0-1.61,0-.59,0-1.18,0-1.73.01-.02-.09-.02-.18-.03-.28,0-.07,0-.13,0-.2.54,0,1.1,0,1.64,0,.52,0,1.06-.01,1.62-.01Z"/>
                <path className="abc-124" d="M1256.22,404.58c.01.09.03.18.04.28.01.07.02.14.04.2-.56,0-1.1,0-1.62.01-.54,0-1.1,0-1.64,0,0-.07,0-.13,0-.2,0-.09.01-.18.02-.28.5,0,1.02,0,1.53,0,.52,0,1.07-.01,1.62-.02Z"/>
                <path className="abc-289" d="M1256.18,403.86c0,.15,0,.3.01.45,0,.09.01.19.03.28-.56,0-1.1.01-1.62.02-.5,0-1.02,0-1.53,0,0-.09.02-.18.03-.28.01-.15.04-.3.07-.44.45,0,.91,0,1.36,0,.53-.01,1.08-.02,1.65-.03Z"/>
                <path className="abc-451" d="M1256.19,403.23c0,.06,0,.11,0,.17,0,.16,0,.31,0,.46-.57,0-1.12.02-1.65.03-.45,0-.91,0-1.36,0,.03-.15.08-.3.12-.45.02-.05.03-.11.05-.16.39,0,.79,0,1.19,0,.53-.01,1.08-.02,1.65-.04Z"/>
                <path className="abc-228" d="M1256.22,402.86c0,.07-.02.14-.02.2,0,.06,0,.11-.01.17-.57.01-1.12.02-1.65.04-.4,0-.8,0-1.19,0,.02-.05.04-.11.06-.16.02-.06.05-.13.07-.19.36,0,.72-.01,1.1-.02.54-.01,1.09-.03,1.65-.04Z"/>
                <path className="abc-231" d="M1256.25,402.66c-.01.07-.02.14-.03.21-.56.01-1.11.03-1.65.04-.37,0-.74.02-1.1.02.02-.06.05-.13.07-.19.34,0,.69-.02,1.05-.03.54-.01,1.09-.03,1.65-.04Z"/>
                <path className="abc-271" d="M1260.01,411.22c.06.14.12.29.16.42-.1,0-.21,0-.31,0-.1,0-.19,0-.29,0-.09-.12-.19-.24-.3-.37.12,0,.23-.01.35-.02.13,0,.26-.02.39-.03Z"/>
                <path className="abc-265" d="M1259.6,410.19c.06.19.14.39.21.57.06.15.13.3.2.45-.13,0-.26.02-.39.03-.12,0-.24.02-.35.02-.11-.13-.23-.26-.34-.41-.14-.18-.3-.38-.44-.57.17-.01.34-.03.53-.05.2-.01.39-.03.59-.05Z"/>
                <path className="abc-298" d="M1259.35,409c.05.19.11.38.14.57,0,.02,0,.04.01.06,0,.18.05.37.11.57-.2.02-.39.03-.59.05-.19.01-.36.03-.53.05-.14-.19-.29-.39-.42-.58-.15-.23-.32-.45-.47-.67.26,0,.54,0,.82-.02.29,0,.61-.01.94-.02Z"/>
                <path className="abc-341" d="M1259.13,408.04c0,.11.03.22.05.33.04.22.11.42.17.63-.33,0-.64.01-.94.02-.28,0-.55.01-.82.02-.16-.22-.32-.44-.44-.66-.06-.11-.14-.22-.19-.33.32,0,.65,0,1,0,.37,0,.76,0,1.17,0Z"/>
                <path className="abc-54" d="M1259.22,407.45c-.05.09-.08.18-.09.26,0,0,0,0,0,0-.02.11-.01.22,0,.33-.41,0-.8,0-1.17,0-.35,0-.68,0-1,0-.06-.11-.11-.21-.15-.31-.04-.08-.07-.17-.09-.26.37-.01.76-.02,1.17-.03.43,0,.88,0,1.34,0Z"/>
                <path className="abc-243" d="M1259.49,407c-.03.06-.06.12-.1.18-.06.09-.12.18-.17.27-.46,0-.9,0-1.34,0-.41,0-.8.01-1.17.03-.02-.09-.03-.19-.03-.28-.01-.06-.02-.12-.03-.19.43,0,.88,0,1.33,0,.49,0,.99,0,1.51,0Z"/>
                <path className="abc-162" d="M1259.59,406.61c-.03.07-.05.13-.05.2,0,.06-.02.13-.05.19-.52,0-1.02,0-1.51,0-.46,0-.9,0-1.33,0-.01-.06-.03-.13-.05-.19-.02-.07-.03-.13-.04-.2.46,0,.94,0,1.43,0,.52,0,1.06,0,1.6,0Z"/>
                <path className="abc-138" d="M1259.84,406.19c-.04.08-.1.15-.14.23-.04.07-.08.13-.1.2-.54,0-1.08,0-1.6,0-.49,0-.97,0-1.43,0,0-.07-.01-.13-.02-.2,0-.08,0-.15-.01-.23.51,0,1.04,0,1.57,0,.57,0,1.15,0,1.73,0Z"/>
                <path className="abc-368" d="M1259.97,405.88s-.01.05-.02.07c-.02.08-.07.16-.11.24-.59,0-1.17,0-1.73,0-.53,0-1.06,0-1.57,0,0-.08,0-.16-.02-.24,0-.02,0-.05-.01-.07.54,0,1.1,0,1.66,0,.6,0,1.2,0,1.81,0Z"/>
                <path className="abc-368" d="M1259.97,405.53c0,.09.02.18.01.27,0,.03,0,.05-.01.08-.61,0-1.22,0-1.81,0-.56,0-1.11,0-1.66,0,0-.02,0-.05-.02-.07-.02-.09-.05-.18-.07-.27.55,0,1.12,0,1.69,0,.61,0,1.23,0,1.86,0Z"/>
                <path className="abc-145" d="M1259.9,405.06c.01.07.03.14.03.2.01.09.03.18.04.28-.63,0-1.25,0-1.86,0-.57,0-1.14,0-1.69,0-.02-.09-.05-.18-.07-.28-.01-.07-.03-.13-.04-.2.56,0,1.13,0,1.71,0,.62,0,1.25,0,1.88,0Z"/>
                <path className="abc-124" d="M1259.85,404.57c0,.09.01.19.02.28,0,.07.02.14.03.21-.63,0-1.27,0-1.88,0-.58,0-1.15,0-1.71,0-.01-.07-.03-.13-.04-.2-.01-.09-.03-.18-.04-.28.56,0,1.13,0,1.72,0,.62,0,1.26,0,1.9,0Z"/>
                <path className="abc-124" d="M1259.87,403.82c0,.16,0,.31-.02.46-.01.1,0,.19,0,.29-.64,0-1.28,0-1.9,0-.59,0-1.16,0-1.72,0-.01-.09-.02-.19-.03-.28,0-.15,0-.29-.01-.45.57,0,1.16-.01,1.75-.02.63,0,1.28-.01,1.93-.01Z"/>
                <path className="abc-209" d="M1259.85,403.17c0,.06,0,.12,0,.18,0,.16.01.32.02.47-.66,0-1.3,0-1.93.01-.59,0-1.18.01-1.75.02,0-.15,0-.3,0-.46,0-.06,0-.11,0-.17.57-.01,1.15-.02,1.74-.03.63-.01,1.27-.02,1.92-.03Z"/>
                <path className="abc-183" d="M1259.86,402.78c0,.07-.01.14-.01.21,0,.06,0,.12,0,.18-.65,0-1.29.02-1.92.03-.59,0-1.17.02-1.74.03,0-.06,0-.11.01-.17,0-.07.01-.13.02-.2.56-.01,1.14-.03,1.73-.04.63-.01,1.27-.03,1.91-.04Z"/>
                <path className="abc-10" d="M1259.89,402.56c-.01.07-.02.15-.03.22-.65.01-1.29.03-1.91.04-.59.01-1.17.03-1.73.04,0-.07.02-.14.03-.21.56-.01,1.14-.03,1.73-.05.63-.02,1.26-.03,1.91-.05Z"/>
                <path className="abc-32" d="M1260.86,411.18c0,.16-.02.31-.04.45-.11,0-.23,0-.34,0-.1,0-.21,0-.31,0-.04-.13-.1-.27-.16-.42.13,0,.27-.02.41-.02.15,0,.3-.01.44-.02Z"/>
                <path className="abc-364" d="M1261,410.11c-.05.19-.07.4-.1.59-.02.16-.03.32-.04.47-.14,0-.29.02-.44.02-.14,0-.28.01-.41.02-.06-.14-.14-.3-.2-.45-.07-.19-.15-.38-.21-.57.2-.02.41-.03.64-.04.25-.01.5-.03.76-.04Z"/>
                <path className="abc-304" d="M1261.53,408.96c-.07.18-.15.37-.25.54,0,.02-.01.03-.02.05-.13.18-.2.37-.25.57-.26.02-.51.03-.76.04-.23,0-.44.02-.64.04-.06-.19-.1-.38-.11-.57,0-.02,0-.04-.01-.06-.02-.19-.08-.38-.14-.57.33,0,.67-.01,1.01-.02.38,0,.77-.02,1.17-.02Z"/>
                <path className="abc-156" d="M1261.9,408.02c-.05.11-.09.22-.14.33-.09.2-.16.41-.24.61-.4,0-.79.01-1.17.02-.35,0-.69.01-1.01.02-.06-.21-.13-.42-.17-.63-.02-.11-.04-.22-.05-.33.41,0,.83,0,1.27,0,.49,0,.99,0,1.5,0Z"/>
                <path className="abc-265" d="M1262.34,407.44c-.09.08-.19.17-.25.26t0,0c-.08.11-.13.22-.18.33-.51,0-1.02,0-1.5,0-.44,0-.87,0-1.27,0,0-.11-.01-.22,0-.33,0,0,0,0,0,0,0-.09.04-.18.09-.26.46,0,.94,0,1.43,0,.54,0,1.11,0,1.69,0Z"/>
                <path className="abc-163" d="M1262.82,407c-.06.06-.13.12-.18.18-.09.09-.21.17-.3.26-.58,0-1.14,0-1.69,0-.49,0-.97,0-1.43,0,.05-.09.11-.18.17-.27.03-.06.07-.12.1-.18.52,0,1.04,0,1.58,0,.58,0,1.17,0,1.76,0Z"/>
                <path className="abc-320" d="M1263.1,406.62c-.06.07-.11.13-.14.19-.03.06-.08.13-.14.19-.59,0-1.17,0-1.76,0-.53,0-1.06,0-1.58,0,.03-.06.05-.13.05-.19,0-.06.03-.13.05-.2.54,0,1.09,0,1.65,0,.61,0,1.24,0,1.86,0Z"/>
                <path className="abc-116" d="M1263.52,406.19c-.07.08-.17.15-.23.23-.06.07-.13.13-.19.2-.62,0-1.24,0-1.86,0-.56,0-1.11,0-1.65,0,.03-.07.07-.13.1-.2.04-.08.1-.15.14-.23.59,0,1.18,0,1.77,0,.65,0,1.29,0,1.92,0Z"/>
                <path className="abc-306" d="M1263.77,405.87s-.03.05-.04.08c-.05.08-.13.16-.21.24-.63,0-1.27,0-1.92,0-.59,0-1.18,0-1.77,0,.04-.08.09-.16.11-.24,0-.02.02-.05.02-.07.61,0,1.22,0,1.83,0,.67,0,1.33,0,1.97,0Z"/>
                <path className="abc-306" d="M1263.86,405.54c-.01.08-.02.17-.05.25,0,.03-.02.05-.03.08-.64,0-1.3,0-1.97,0-.61,0-1.22,0-1.83,0,0-.02.01-.05.01-.08,0-.09,0-.18-.01-.27.63,0,1.25,0,1.87,0,.68,0,1.35,0,2.01.01Z"/>
                <path className="abc-378" d="M1263.89,405.09c0,.06,0,.13,0,.19-.01.09-.01.18-.03.26-.66,0-1.33-.01-2.01-.01-.62,0-1.25,0-1.87,0,0-.09-.03-.18-.04-.28,0-.07-.02-.13-.03-.2.63,0,1.27,0,1.91,0,.7,0,1.4.01,2.08.03Z"/>
                <path className="abc-124" d="M1263.93,404.58c-.01.11-.01.21-.02.3,0,.07,0,.14,0,.2-.69-.02-1.38-.03-2.08-.03-.64,0-1.28,0-1.91,0-.01-.07-.02-.14-.03-.21,0-.09-.02-.19-.02-.28.64,0,1.29,0,1.94,0,.71,0,1.43,0,2.14.02Z"/>
                <path className="abc-124" d="M1264.02,403.8c0,.16,0,.32-.05.47-.03.1-.04.2-.05.31-.71,0-1.43-.02-2.14-.02-.65,0-1.3,0-1.94,0,0-.09,0-.19,0-.29.02-.15.02-.3.02-.46.66,0,1.32,0,1.98-.01.72,0,1.45,0,2.17,0Z"/>
                <path className="abc-257" d="M1264.03,403.12c0,.06,0,.12,0,.19-.01.17,0,.33,0,.49-.72,0-1.45,0-2.17,0-.66,0-1.32.01-1.98.01,0-.16-.01-.31-.02-.47,0-.06,0-.12,0-.18.65,0,1.31-.02,1.97-.03.73-.01,1.47-.02,2.21-.02Z"/>
                <path className="abc-198" d="M1264.05,402.7c0,.08,0,.16-.01.23,0,.06,0,.13,0,.19-.74,0-1.48,0-2.21.02-.66.01-1.32.02-1.97.03,0-.06,0-.12,0-.18,0-.07,0-.14.01-.21.65-.01,1.3-.03,1.97-.04.73-.02,1.47-.03,2.22-.04Z"/>
                <path className="abc-71" d="M1264.08,402.46c-.02.08-.02.15-.03.23-.75.01-1.49.03-2.22.04-.66.01-1.32.03-1.97.04,0-.07.02-.14.03-.22.65-.02,1.31-.03,1.97-.05.73-.02,1.47-.03,2.21-.05Z"/>
                <path className="abc-49" d="M1261.66,411.14c-.08.17-.15.33-.23.49-.09,0-.18,0-.27,0-.12,0-.23,0-.34,0,.02-.15.03-.3.04-.45.14,0,.29-.02.45-.02.12,0,.24-.01.35-.02Z"/>
                <path className="abc-394" d="M1262.42,410.03c-.18.2-.33.4-.47.6-.12.17-.2.34-.29.5-.12,0-.23.01-.35.02-.16,0-.3.02-.45.02,0-.16.02-.31.04-.47.03-.2.05-.4.1-.59.26-.02.52-.03.79-.05.21-.01.42-.02.63-.03Z"/>
                <path className="abc-312" d="M1263.74,408.94c-.23.19-.45.37-.69.54-.25.17-.45.36-.63.55-.21.01-.42.02-.63.03-.27.01-.53.03-.79.05.05-.19.12-.39.25-.57,0-.02.01-.03.02-.05.1-.17.18-.35.25-.54.4,0,.81,0,1.23-.01.32,0,.65,0,.99,0Z"/>
                <path className="abc-126" d="M1264.76,408.03c-.12.11-.23.23-.36.34-.22.19-.44.38-.66.57-.33,0-.66,0-.99,0-.42,0-.83,0-1.23.01.08-.2.15-.41.24-.61.05-.11.09-.22.14-.33.51,0,1.04,0,1.58,0,.41,0,.84,0,1.27,0Z"/>
                <path className="abc-33" d="M1265.44,407.43c-.1.08-.21.17-.31.25-.13.11-.25.23-.37.34-.43,0-.86,0-1.27,0-.54,0-1.07,0-1.58,0,.05-.11.1-.22.18-.33t0,0c.06-.09.16-.17.25-.26.58,0,1.16,0,1.75,0,.45,0,.9,0,1.35,0Z"/>
                <path className="abc-350" d="M1265.94,407c-.06.06-.14.12-.2.18-.1.09-.21.17-.31.26-.45,0-.91,0-1.35,0-.58,0-1.17,0-1.75,0,.09-.08.21-.17.3-.26.06-.06.13-.12.18-.18.59,0,1.18,0,1.77,0,.45,0,.9,0,1.35,0Z"/>
                <path className="abc-1" d="M1266.31,406.62c-.06.07-.13.13-.19.19-.05.06-.12.13-.18.19-.45,0-.89,0-1.35,0-.59,0-1.18,0-1.77,0,.06-.06.11-.12.14-.19.03-.06.08-.13.14-.19.62,0,1.24,0,1.84,0,.46,0,.92,0,1.37,0Z"/>
                <path className="abc-230" d="M1266.73,406.18c-.07.08-.15.16-.22.23-.06.07-.13.13-.2.2-.45,0-.91,0-1.37,0-.6,0-1.22,0-1.84,0,.06-.07.13-.13.19-.2.07-.08.16-.15.23-.23.63,0,1.25,0,1.86,0,.46,0,.91,0,1.35,0Z"/>
                <path className="abc-431" d="M1266.99,405.86s-.04.05-.06.08c-.06.08-.13.16-.21.24-.44,0-.89,0-1.35,0-.6,0-1.22,0-1.86,0,.07-.08.16-.16.21-.24.01-.02.03-.05.04-.08.64,0,1.27,0,1.88,0,.46,0,.91,0,1.35,0Z"/>
                <path className="abc-431" d="M1267.18,405.55c-.04.08-.08.15-.13.24-.02.03-.04.05-.05.08-.43,0-.88,0-1.35,0-.6,0-1.23,0-1.88,0,.01-.03.02-.05.03-.08.03-.09.04-.17.05-.25.66,0,1.3.01,1.93.01.48,0,.94,0,1.39,0Z"/>
                <path className="abc-294" d="M1267.38,405.12c-.03.06-.05.12-.08.19-.04.09-.08.16-.12.25-.45,0-.91,0-1.39,0-.62,0-1.27,0-1.93-.01.01-.08.02-.17.03-.26,0-.07,0-.13,0-.19.69.02,1.36.03,2.02.04.5,0,1,0,1.47-.01Z"/>
                <path className="abc-124" d="M1267.57,404.59c-.03.11-.06.24-.1.33-.03.07-.05.13-.08.19-.48.01-.97.02-1.47.01-.66,0-1.33-.03-2.02-.04,0-.06,0-.13,0-.2.01-.09.01-.2.02-.3.71,0,1.41.02,2.09.02.52,0,1.04,0,1.54-.01Z"/>
                <path className="abc-124" d="M1267.81,403.77c-.04.16-.07.31-.14.47-.04.1-.07.23-.1.34-.5.01-1.02.01-1.54.01-.68,0-1.38-.01-2.09-.02.01-.11.02-.21.05-.31.04-.15.04-.31.05-.47.72,0,1.45,0,2.16,0,.55,0,1.09,0,1.62-.02Z"/>
                <path className="abc-39" d="M1267.95,403.08c-.01.07-.02.13-.04.2-.04.18-.07.34-.11.5-.53,0-1.07.01-1.62.02-.72,0-1.44,0-2.16,0,0-.16,0-.32,0-.49,0-.06,0-.12,0-.19.74,0,1.49,0,2.23-.01.57,0,1.13-.02,1.69-.03Z"/>
                <path className="abc-31" d="M1268.02,402.62c-.01.08-.02.17-.04.25-.01.07-.02.14-.03.2-.56.01-1.13.02-1.69.03-.74,0-1.49.01-2.23.01,0-.06,0-.13,0-.19,0-.08,0-.15.01-.23.75-.01,1.5-.03,2.24-.04.57-.01,1.15-.02,1.73-.03Z"/>
                <path className="abc-237" d="M1268.07,402.37c-.02.08-.03.17-.04.25-.58.01-1.16.02-1.73.03-.75.01-1.5.03-2.24.04,0-.08.02-.16.03-.23.75-.02,1.5-.03,2.25-.05.58-.01,1.16-.03,1.74-.04Z"/>
                <path className="abc-261" d="M1264.29,411.14c-.09.16-.16.33-.23.48-.79,0-1.57,0-2.35,0-.09,0-.18,0-.27,0,.08-.16.14-.33.23-.49.12,0,.24,0,.37-.01.74,0,1.5,0,2.26.02Z"/>
                <path className="abc-23" d="M1265.03,410.06c-.17.19-.32.39-.45.59-.11.16-.2.33-.29.49-.76,0-1.52-.01-2.26-.02-.13,0-.25,0-.37.01.08-.17.17-.34.29-.5.14-.21.29-.41.47-.6.21-.01.43-.02.66-.03.63.01,1.29.03,1.95.05Z"/>
                <path className="abc-302" d="M1266.26,408.95c-.21.19-.43.37-.65.56-.22.17-.41.36-.58.55-.66-.02-1.32-.04-1.95-.05-.22,0-.44.02-.66.03.18-.2.38-.38.63-.55.24-.17.46-.35.69-.54.33,0,.67,0,1.02-.01.49.01.99.01,1.5.02Z"/>
                <path className="abc-240" d="M1267.22,408.03c-.11.11-.22.22-.33.33-.2.2-.41.39-.63.58-.51,0-1.01,0-1.5-.02-.35,0-.69,0-1.02.01.23-.19.44-.38.66-.57.12-.11.24-.22.36-.34.43,0,.87,0,1.32,0,.37,0,.75,0,1.14,0Z"/>
                <path className="abc-203" d="M1267.76,407.42c-.07.09-.15.18-.22.27-.11.12-.22.23-.32.35-.39,0-.77,0-1.14,0-.44,0-.88,0-1.32,0,.12-.11.24-.23.37-.34.1-.09.21-.17.31-.25.45,0,.91,0,1.37,0,.32,0,.64,0,.96-.01Z"/>
                <path className="abc-334" d="M1268.13,406.96c-.05.06-.1.12-.15.18-.07.09-.15.18-.23.27-.32,0-.64.01-.96.01-.46,0-.91,0-1.37,0,.1-.08.21-.17.31-.26.06-.06.14-.12.2-.18.45,0,.89,0,1.32,0,.29,0,.58-.01.86-.03Z"/>
                <path className="abc-201" d="M1268.41,406.58c-.04.07-.09.13-.13.2-.04.06-.09.13-.14.19-.28.02-.57.03-.86.03-.44,0-.88,0-1.32,0,.06-.06.13-.12.18-.19.05-.06.12-.13.19-.19.45,0,.89,0,1.31,0,.27,0,.53-.02.78-.03Z"/>
                <path className="abc-434" d="M1268.7,406.15c-.05.08-.1.16-.16.23-.05.07-.09.13-.14.2-.25.02-.51.03-.78.03-.42,0-.86,0-1.31,0,.06-.07.14-.13.2-.2.07-.08.15-.16.22-.23.44,0,.86,0,1.26,0,.24,0,.48-.01.7-.03Z"/>
                <path className="abc-424" d="M1268.89,405.84s-.03.05-.04.07c-.05.08-.1.16-.15.24-.23.01-.46.02-.7.03-.41,0-.83,0-1.26,0,.07-.08.15-.16.21-.24.02-.03.04-.05.06-.08.43,0,.85,0,1.24-.01.22,0,.44,0,.65-.01Z"/>
                <path className="abc-440" d="M1269.08,405.43c-.05.11-.1.22-.15.33-.01.02-.03.05-.04.07-.21,0-.43.01-.65.01-.39,0-.81,0-1.24.01.02-.03.04-.05.05-.08.05-.09.09-.15.13-.24.45,0,.88-.02,1.29-.04.22,0,.41-.04.61-.07Z"/>
                <path className="abc-357" d="M1269.33,404.89c-.04.07-.07.15-.11.22-.05.11-.1.21-.15.32-.19.03-.39.06-.61.07-.41.02-.85.03-1.29.04.04-.08.08-.15.12-.25.03-.07.06-.12.08-.19.48-.01.94-.04,1.38-.09.21-.02.39-.07.57-.13Z"/>
                <path className="abc-219" d="M1269.6,404.38c-.06.1-.11.2-.16.3-.04.07-.07.14-.11.22-.18.06-.36.11-.57.13-.44.05-.91.07-1.38.09.03-.06.05-.12.08-.19.04-.09.07-.22.1-.33.5-.01.99-.03,1.47-.06.21-.04.4-.09.57-.15Z"/>
                <path className="abc-14" d="M1270.06,403.61c-.1.16-.19.31-.28.46-.06.1-.12.2-.17.3-.18.06-.36.11-.57.15-.47.03-.96.05-1.47.06.03-.11.06-.24.1-.34.06-.16.1-.31.14-.47.53,0,1.06-.02,1.57-.04.26-.03.47-.08.68-.12Z"/>
                <path className="abc-370" d="M1270.46,402.95c-.04.06-.07.12-.11.18-.1.17-.19.33-.29.49-.21.04-.43.09-.68.12-.51.02-1.04.03-1.57.04.04-.16.06-.32.11-.5.02-.06.03-.13.04-.2.56-.01,1.12-.03,1.67-.06.31-.01.57-.04.84-.08Z"/>
                <path className="abc-367" d="M1270.7,402.54c-.05.07-.09.15-.13.22-.04.06-.07.12-.11.18-.26.03-.53.06-.84.08-.55.02-1.11.04-1.67.06.01-.07.02-.14.03-.2.01-.08.02-.17.04-.25.58-.01,1.15-.02,1.72-.04.33,0,.65-.03.96-.04Z"/>
                <path className="abc-426" d="M1270.84,402.31c-.05.07-.09.15-.14.22-.31.02-.63.03-.96.04-.57.02-1.14.03-1.72.04.01-.08.03-.17.04-.25.58-.01,1.16-.03,1.74-.04.35,0,.69-.01,1.03-.02Z"/>
                <path className="abc-284" d="M1268.77,411.18c-.02.15-.03.3-.05.45-.76,0-1.53,0-2.31,0-.78,0-1.57,0-2.35,0,.07-.16.15-.32.23-.48.76,0,1.52.01,2.26.02.74,0,1.48.01,2.22.02Z"/>
                <path className="abc-100" d="M1268.95,410.17c-.05.19-.08.38-.11.56-.03.15-.05.3-.07.45-.73,0-1.48-.02-2.22-.02-.74,0-1.5-.01-2.26-.02.09-.16.18-.33.29-.49.13-.2.28-.4.45-.59.66.02,1.33.04,1.97.05.64.01,1.3.03,1.95.06Z"/>
                <path className="abc-141" d="M1269.28,408.99c-.06.21-.11.42-.17.62-.06.18-.11.37-.16.55-.65-.02-1.31-.04-1.95-.06-.64-.01-1.31-.03-1.97-.05.17-.19.36-.38.58-.55.22-.18.44-.37.65-.56.51,0,1.02,0,1.52.02.5.01,1,.02,1.5.02Z"/>
                <path className="abc-158" d="M1269.54,408.03c-.03.11-.06.22-.09.33-.06.21-.11.42-.17.63-.5,0-1-.01-1.5-.02-.5-.01-1.01-.02-1.52-.02.21-.19.42-.38.63-.58.11-.11.22-.22.33-.33.39,0,.77,0,1.15,0s.77,0,1.17,0Z"/>
                <path className="abc-166" d="M1269.7,407.39c-.02.1-.05.2-.07.31-.03.11-.06.22-.09.34-.39,0-.78,0-1.17,0s-.77,0-1.15,0c.11-.11.22-.23.32-.35.07-.09.15-.18.22-.27.32,0,.64-.02.96-.02.32,0,.65-.01.98-.02Z"/>
                <path className="abc-426" d="M1269.82,406.89c-.02.06-.03.13-.05.19-.03.1-.05.2-.08.3-.33,0-.65.01-.98.02-.32,0-.64.01-.96.02.07-.09.15-.18.23-.27.05-.06.1-.12.15-.18.28-.02.57-.03.85-.04.17,0,.33-.01.5-.02.11,0,.23,0,.34-.01Z"/>
                <path className="abc-335" d="M1269.91,406.5c-.02.07-.03.13-.05.2-.02.06-.02.13-.04.19-.11,0-.23,0-.34.01-.17,0-.34.01-.5.02-.28.01-.56.03-.85.04.05-.06.09-.12.14-.19.04-.06.09-.13.13-.2.25-.02.5-.04.75-.05.15,0,.3-.01.45-.02.1,0,.2,0,.3-.01Z"/>
                <path className="abc-408" d="M1270.02,406.09c-.02.07-.04.14-.06.22-.02.07-.04.13-.05.2-.1,0-.2.01-.3.01-.15,0-.3.01-.45.02-.25.01-.5.03-.75.05.04-.07.09-.13.14-.2.05-.08.11-.15.16-.23.23-.01.45-.03.66-.03.22,0,.44-.02.66-.03Z"/>
                <path className="abc-377" d="M1270.09,405.81s0,.04,0,.07c-.02.07-.04.14-.06.21-.22,0-.44.02-.66.03-.21,0-.44.02-.66.03.05-.08.1-.16.15-.24.01-.02.03-.05.04-.07.21,0,.42-.01.61-.02.12,0,.23,0,.35,0,.08,0,.16,0,.24,0Z"/>
                <path className="abc-73" d="M1270.18,405.28c-.03.14-.06.3-.09.46,0,.02,0,.04,0,.07-.08,0-.16,0-.24,0-.11,0-.23,0-.35,0-.19,0-.4,0-.61.02.01-.02.03-.05.04-.07.05-.11.1-.22.15-.33.19-.03.37-.07.56-.09.11-.01.22-.03.32-.04.07,0,.15-.02.23-.03Z"/>
                <path className="abc-253" d="M1270.39,404.6c-.03.08-.07.18-.1.27-.04.13-.08.27-.11.41-.08.01-.15.02-.23.03-.11.01-.21.03-.32.04-.18.02-.37.05-.56.09.05-.11.1-.21.15-.32.04-.08.07-.15.11-.22.18-.06.34-.12.52-.16.16-.04.35-.09.54-.14Z"/>
                <path className="abc-191" d="M1270.67,404.05c-.07.1-.12.2-.17.31-.03.07-.08.16-.11.24-.19.05-.38.11-.54.14-.17.04-.34.1-.52.16.04-.07.07-.14.11-.22.05-.1.11-.2.16-.3.18-.06.34-.12.52-.16.1-.03.21-.06.33-.1.07-.02.15-.04.22-.07Z"/>
                <path className="abc-442" d="M1271.36,403.36c-.16.14-.33.28-.46.42-.09.09-.16.17-.23.27-.07.02-.14.04-.22.07-.12.03-.23.07-.33.1-.18.05-.34.11-.52.16.06-.1.11-.2.17-.3.09-.15.18-.3.28-.46.21-.04.41-.09.64-.13.14-.02.26-.05.4-.08.09-.02.17-.03.25-.05Z"/>
                <path className="abc-90" d="M1272.11,402.77c-.07.05-.14.1-.21.15-.19.14-.38.29-.54.43-.08.02-.17.03-.25.05-.14.03-.26.06-.4.08-.23.04-.43.08-.64.13.1-.16.19-.32.29-.49.04-.06.07-.12.11-.18.26-.03.53-.07.82-.09.28-.03.56-.06.84-.08Z"/>
                <path className="abc-19" d="M1272.61,402.45c-.09.06-.19.12-.28.18-.08.05-.15.1-.22.15-.28.03-.56.06-.84.08-.29.02-.55.05-.82.09.04-.06.07-.12.11-.18.05-.07.09-.15.13-.22.31-.02.62-.04.95-.05.32-.01.64-.03.96-.04Z"/>
                <path className="abc-402" d="M1272.89,402.27c-.1.06-.19.12-.29.18-.32.01-.64.03-.96.04-.32.01-.64.03-.95.05.05-.07.09-.15.14-.22.34,0,.69-.01,1.03-.02.34,0,.68-.01,1.02-.02Z"/>
                <path className="abc-169" d="M1271.76,411.21c0,.14.02.29.03.43-.28,0-.57,0-.86,0-.72,0-1.46,0-2.22,0,.02-.15.03-.3.05-.45.73,0,1.45.02,2.13.03.29,0,.58,0,.86,0Z"/>
                <path className="abc-128" d="M1271.7,410.23c.01.18.02.37.03.55,0,.15.02.29.03.44-.28,0-.57,0-.86,0-.68,0-1.4-.02-2.13-.03.02-.15.04-.3.07-.45.03-.19.07-.38.11-.56.65.02,1.28.04,1.88.06.29,0,.59,0,.88,0Z"/>
                <path className="abc-316" d="M1271.64,409.02c0,.22.02.44.04.66.01.18.02.37.03.55-.29,0-.58,0-.88,0-.6-.01-1.23-.04-1.88-.06.05-.19.1-.37.16-.55.06-.21.11-.41.17-.62.5,0,.99.01,1.47.03.3,0,.59,0,.88,0Z"/>
                <path className="abc-180" d="M1271.61,408.03c0,.11,0,.22,0,.34,0,.21.01.43.02.65-.29,0-.59,0-.88,0-.48-.01-.97-.02-1.47-.03.06-.21.11-.42.17-.63.03-.11.06-.22.09-.33.39,0,.78,0,1.17,0,.3,0,.61,0,.91,0Z"/>
                <path className="abc-166" d="M1271.55,407.38c.03.11.06.21.06.32,0,.11,0,.22,0,.33-.3,0-.61,0-.91,0-.38,0-.77,0-1.17,0,.03-.11.06-.22.09-.34.02-.1.04-.21.07-.31.33,0,.66,0,.98,0,.29,0,.58,0,.87,0Z"/>
                <path className="abc-346" d="M1271.45,406.87c.01.07.03.14.03.2,0,.1.04.21.06.31-.29,0-.58,0-.87,0-.33,0-.65,0-.98,0,.02-.1.05-.2.08-.3.02-.06.03-.13.05-.19.28-.01.56-.03.85-.03.26,0,.51,0,.78,0Z"/>
                <path className="abc-65" d="M1271.4,406.46c.01.07.03.14.03.2,0,.07.01.13.03.2-.26,0-.52,0-.78,0-.29,0-.57.02-.85.03.02-.06.02-.13.04-.19.01-.07.03-.13.05-.2.25-.01.5-.03.77-.03.23,0,.47,0,.72,0Z"/>
                <path className="abc-408" d="M1271.32,406.06c.02.07.04.14.04.21,0,.06.02.13.03.2-.25,0-.49,0-.72,0-.26,0-.52.02-.77.03.02-.07.04-.13.05-.2.02-.07.04-.15.06-.22.22,0,.44-.02.66-.02.2,0,.42,0,.64,0Z"/>
                <path className="abc-433" d="M1271.29,405.79s0,.04,0,.06c0,.07.02.13.03.2-.22,0-.43,0-.64,0-.22,0-.44.01-.66.02.02-.07.04-.14.06-.21,0-.02,0-.04,0-.07.2,0,.4,0,.61-.01.19,0,.38,0,.59,0Z"/>
                <path className="abc-392" d="M1271.36,405.2c-.03.17-.06.35-.07.53,0,.02,0,.04,0,.06-.21,0-.4,0-.59,0-.21,0-.42,0-.61.01,0-.02,0-.04,0-.07.02-.16.06-.32.09-.46.18-.02.37-.05.57-.07.19,0,.39-.01.6-.01Z"/>
                <path className="abc-90" d="M1271.56,404.43c-.03.09-.07.19-.1.29-.04.15-.08.31-.11.47-.21,0-.41,0-.6.01-.2.02-.39.04-.57.07.03-.14.07-.29.11-.41.03-.09.07-.19.1-.27.19-.05.37-.1.51-.12.21-.02.43-.03.66-.04Z"/>
                <path className="abc-358" d="M1271.88,403.89c-.09.09-.16.18-.22.3-.03.07-.07.16-.1.25-.23,0-.45.02-.66.04-.15.02-.33.07-.51.12.03-.08.08-.17.11-.24.05-.11.1-.21.17-.31.18-.06.36-.12.52-.15.22,0,.45-.01.69-.01Z"/>
                <path className="abc-269" d="M1272.73,403.23c-.21.14-.41.29-.56.41-.11.09-.21.16-.3.25-.24,0-.46,0-.69.01-.16.03-.34.09-.52.15.07-.1.14-.18.23-.27.13-.14.3-.28.46-.42.21-.04.42-.09.66-.12.23,0,.47,0,.72,0Z"/>
                <path className="abc-318" d="M1273.69,402.68c-.09.05-.18.09-.27.14-.24.13-.48.28-.69.42-.24,0-.48,0-.72,0-.24.03-.44.08-.66.12.16-.14.35-.29.54-.43.07-.05.14-.1.21-.15.28-.03.56-.05.84-.07.25-.01.49-.02.75-.03Z"/>
                <path className="abc-78" d="M1274.33,402.39c-.12.05-.24.1-.35.15-.1.04-.19.09-.28.13-.25,0-.5.02-.75.03-.28.01-.56.04-.84.07.07-.05.15-.1.22-.15.09-.06.18-.12.28-.18.32-.01.64-.03.95-.04.25,0,.51-.01.76-.02Z"/>
                <path className="abc-227" d="M1274.67,402.23c-.11.05-.23.1-.35.16-.26,0-.51.01-.76.02-.32,0-.63.02-.95.04.09-.06.19-.12.29-.18.34,0,.68-.01,1.02-.02.26,0,.51-.01.76-.02Z"/>
                <path className="abc-197" d="M1275.31,411.24c0,.15,0,.29.01.43-.9-.01-1.8-.03-2.7-.03-.27,0-.55,0-.84,0,0-.14-.02-.28-.03-.43.28,0,.56,0,.84,0,.91,0,1.81.01,2.71.03Z"/>
                <path className="abc-438" d="M1275.37,410.26c-.01.18-.03.37-.04.55-.01.15-.02.29-.02.44-.9-.01-1.8-.02-2.71-.03-.28,0-.56,0-.84,0,0-.14-.02-.29-.03-.44-.01-.18-.02-.36-.03-.55.29,0,.58,0,.86,0,.93,0,1.87.01,2.81.02Z"/>
                <path className="abc-430" d="M1275.42,409.05c-.02.22-.04.43-.04.65,0,.19,0,.37-.01.55-.94-.01-1.87-.02-2.81-.02-.28,0-.57,0-.86,0-.01-.18-.02-.37-.03-.55-.01-.22-.03-.44-.04-.66.29,0,.59,0,.88,0,.97,0,1.94.01,2.91.02Z"/>
                <path className="abc-128" d="M1275.55,408.06c-.01.11-.04.23-.05.34-.03.22-.06.43-.08.65-.97,0-1.93-.02-2.91-.02-.29,0-.59,0-.88,0,0-.22-.02-.43-.02-.65,0-.11,0-.23,0-.34.3,0,.61,0,.91,0,1.01,0,2.02.01,3.03.02Z"/>
                <path className="abc-166" d="M1275.43,407.41c.06.1.15.21.16.32,0,.11-.03.22-.04.34-1.01,0-2.02-.02-3.03-.02-.3,0-.61,0-.91,0,0-.11,0-.22,0-.33,0-.11-.03-.21-.06-.32.29,0,.59,0,.88,0,.98,0,1.99.01,3,.02Z"/>
                <path className="abc-342" d="M1275.08,406.89c.03.07.09.14.13.2.05.1.16.21.23.31-1.01,0-2.03-.02-3-.02-.29,0-.59,0-.88,0-.03-.11-.06-.21-.06-.31,0-.07-.02-.14-.03-.2.26,0,.53,0,.81,0,.91,0,1.86.01,2.82.02Z"/>
                <path className="abc-260" d="M1274.92,406.49c.03.07.08.14.08.2,0,.06.04.13.08.2-.97-.01-1.91-.02-2.82-.02-.27,0-.54,0-.81,0-.01-.07-.03-.13-.03-.2,0-.07-.02-.14-.03-.2.25,0,.5,0,.76,0,.86,0,1.8.01,2.77.03Z"/>
                <path className="abc-146" d="M1274.62,406.08c.05.07.13.14.17.21.03.06.1.13.13.2-.97-.01-1.91-.03-2.77-.03-.26,0-.51,0-.76,0-.01-.07-.03-.14-.03-.2,0-.07-.02-.14-.04-.21.22,0,.45,0,.69,0,.79,0,1.67,0,2.61.02Z"/>
                <path className="abc-66" d="M1274.47,405.8s.01.04.02.06c.02.07.09.14.14.21-.94-.01-1.82-.02-2.61-.02-.24,0-.47,0-.69,0-.02-.07-.03-.13-.03-.2,0-.02,0-.04,0-.06.21,0,.42,0,.65,0,.75,0,1.61,0,2.53.01Z"/>
                <path className="abc-112" d="M1274.57,405.25c-.04.16-.1.32-.11.49,0,.02,0,.04,0,.06-.92,0-1.78-.01-2.53-.01-.23,0-.44,0-.65,0,0-.02,0-.04,0-.06.01-.18.04-.36.07-.53.21,0,.43,0,.66,0,.77,0,1.63.02,2.55.05Z"/>
                <path className="abc-284" d="M1274.9,404.52c-.04.09-.1.19-.14.28-.06.14-.14.29-.19.45-.92-.03-1.78-.05-2.55-.05-.23,0-.45,0-.66,0,.03-.17.07-.33.11-.47.03-.1.06-.2.1-.29.23,0,.47-.01.71-.01.81,0,1.69.05,2.63.1Z"/>
                <path className="abc-333" d="M1275.23,403.96c-.08.09-.16.18-.2.31-.03.08-.08.16-.13.25-.93-.05-1.82-.1-2.63-.1-.24,0-.48,0-.71.01.03-.09.07-.17.1-.25.05-.12.13-.21.22-.3.24,0,.48,0,.72,0,.82,0,1.7.04,2.62.07Z"/>
                <path className="abc-50" d="M1276.06,403.26c-.2.15-.42.31-.54.45-.1.09-.22.16-.3.26-.92-.03-1.8-.07-2.62-.07-.25,0-.49,0-.72,0,.09-.09.19-.16.3-.25.15-.13.34-.27.56-.41.24,0,.49,0,.74,0,.84,0,1.7.01,2.59.03Z"/>
                <path className="abc-353" d="M1277.03,402.66c-.09.05-.18.1-.26.15-.23.14-.51.3-.71.45-.88-.01-1.75-.03-2.59-.03-.25,0-.5,0-.74,0,.21-.14.45-.29.69-.42.09-.05.18-.09.27-.14.25,0,.5-.01.76-.02.85-.01,1.72,0,2.58,0Z"/>
                <path className="abc-147" d="M1277.61,402.34c-.1.06-.21.11-.31.17-.09.05-.18.1-.27.15-.87,0-1.74-.02-2.58,0-.25,0-.51.01-.76.02.09-.05.19-.09.28-.13.11-.05.23-.1.35-.15.26,0,.51,0,.77-.01.84-.02,1.69-.02,2.52-.03Z"/>
                <path className="abc-254" d="M1277.9,402.17c-.08.06-.19.12-.29.17-.83,0-1.68.02-2.52.03-.25,0-.51,0-.77.01.12-.05.23-.1.35-.16.25,0,.51-.01.76-.02.84-.02,1.66-.03,2.47-.05Z"/>
                <path className="abc-385" d="M1281.86,411.4c0,.15-.03.3-.02.45-1.3-.05-2.59-.09-3.82-.12-.9-.02-1.8-.04-2.7-.06-.01-.14-.02-.29-.01-.43.9.01,1.8.03,2.71.05,1.24.03,2.54.07,3.84.11Z"/>
                <path className="abc-277" d="M1281.99,410.38c-.01.19-.06.38-.08.57-.01.15-.04.3-.05.45-1.3-.04-2.6-.08-3.84-.11-.91-.02-1.81-.04-2.71-.05,0-.15.01-.29.02-.44.01-.18.03-.36.04-.55.94.01,1.87.02,2.81.04,1.26.02,2.54.05,3.81.08Z"/>
                <path className="abc-100" d="M1282.12,409.15c-.02.22-.08.45-.08.67,0,.19-.04.38-.05.57-1.27-.03-2.55-.06-3.81-.08-.93-.02-1.87-.03-2.81-.04.01-.18.02-.37.01-.55,0-.22.01-.44.04-.65.97,0,1.93.02,2.91.03,1.27.02,2.55.04,3.8.06Z"/>
                <path className="abc-184" d="M1282.28,408.13c0,.12-.03.23-.05.35-.03.22-.09.44-.11.67-1.24-.02-2.52-.05-3.8-.06-.97-.01-1.94-.02-2.91-.03.02-.22.05-.43.08-.65.01-.11.04-.23.05-.34,1.01,0,2.01.02,3,.03,1.28.01,2.53.03,3.73.04Z"/>
                <path className="abc-158" d="M1282.22,407.48c.04.1.09.2.09.29,0,.12-.02.23-.03.35-1.2-.01-2.45-.03-3.73-.04-.99,0-1.99-.02-3-.03.01-.11.04-.22.04-.34,0-.1-.09-.21-.16-.32,1.01,0,2.03.02,3.03.03,1.29.01,2.55.03,3.76.04Z"/>
                <path className="abc-291" d="M1281.98,406.99c.02.06.06.13.09.19.04.1.12.2.16.3-1.21-.01-2.47-.03-3.76-.04-.99-.01-2.01-.02-3.03-.03-.06-.1-.18-.21-.23-.31-.03-.07-.09-.14-.13-.2.97.01,1.96.02,2.97.04,1.31.02,2.64.04,3.93.06Z"/>
                <path className="abc-385" d="M1281.89,406.6c.02.06.05.13.05.2,0,.06.03.13.04.19-1.29-.02-2.62-.04-3.93-.06-1.01-.01-2-.03-2.97-.04-.03-.07-.08-.13-.08-.2,0-.07-.05-.14-.08-.2.97.01,1.99.03,3,.05,1.32.02,2.65.04,3.96.07Z"/>
                <path className="abc-154" d="M1281.68,406.19c.03.07.09.15.12.22.03.06.07.13.09.2-1.31-.02-2.64-.05-3.96-.07-1.02-.02-2.03-.03-3-.05-.03-.07-.1-.14-.13-.2-.04-.07-.12-.14-.17-.21.94.01,1.93.03,2.96.04,1.33.02,2.72.04,4.09.07Z"/>
                <path className="abc-347" d="M1281.57,405.9s0,.04.01.07c.02.07.06.15.09.22-1.37-.03-2.76-.05-4.09-.07-1.03-.01-2.02-.03-2.96-.04-.05-.07-.12-.14-.14-.21,0-.02-.01-.04-.02-.06.92,0,1.92.02,2.95.03,1.34.02,2.75.04,4.15.07Z"/>
                <path className="abc-347" d="M1281.62,405.43c-.02.13-.06.27-.06.4,0,.02,0,.04,0,.07-1.4-.02-2.81-.05-4.15-.07-1.03-.01-2.02-.03-2.95-.03,0-.02,0-.04,0-.06,0-.17.07-.33.11-.49.92.03,1.91.06,2.93.08,1.33.02,2.73.06,4.12.1Z"/>
                <path className="abc-439" d="M1281.8,404.78c-.02.09-.05.18-.08.26-.03.13-.08.26-.1.39-1.39-.04-2.8-.08-4.12-.1-1.02-.02-2.01-.05-2.93-.08.04-.16.13-.31.19-.45.04-.1.1-.2.14-.28.93.05,1.92.11,2.92.14,1.3.03,2.65.08,3.99.12Z"/>
                <path className="abc-406" d="M1281.95,404.18c-.03.11-.07.23-.09.35-.02.08-.04.17-.06.25-1.33-.05-2.68-.09-3.99-.12-1-.02-1.98-.08-2.92-.14.04-.09.09-.17.13-.25.04-.12.12-.22.2-.31.92.03,1.88.07,2.85.1,1.27.03,2.58.07,3.87.12Z"/>
                <path className="abc-380" d="M1282.31,403.35c-.09.17-.18.33-.22.5-.05.1-.11.21-.14.32-1.29-.05-2.6-.09-3.87-.12-.98-.02-1.93-.06-2.85-.1.08-.09.19-.17.3-.26.11-.14.34-.3.54-.45.88.01,1.78.03,2.68.04,1.17.01,2.39.03,3.57.05Z"/>
                <path className="abc-380" d="M1282.76,402.67c-.04.06-.08.12-.12.18-.11.17-.24.33-.33.5-1.18-.02-2.4-.04-3.57-.05-.9,0-1.8-.03-2.68-.04.2-.15.48-.31.71-.45.08-.05.18-.1.26-.15.87,0,1.73.02,2.56.02,1.08,0,2.15,0,3.17,0Z"/>
                <path className="abc-380" d="M1283.01,402.28c-.04.07-.09.14-.13.21-.04.06-.08.12-.12.18-1.03,0-2.1,0-3.17,0-.83,0-1.69,0-2.56-.02.09-.05.18-.1.27-.15.1-.06.22-.11.31-.17.83,0,1.66-.01,2.44-.03,1.02-.01,2.01-.03,2.95-.04Z"/>
                <path className="abc-33" d="M1283.12,402.06c-.03.07-.07.14-.11.21-.94.01-1.93.02-2.95.04-.79.01-1.61.02-2.44.03.1-.06.2-.11.29-.17.81-.02,1.59-.03,2.36-.05,1-.02,1.95-.04,2.86-.06Z"/>
                <path className="abc-255" d="M1287.47,411.6c0,.16-.02.32-.02.47-.57-.02-1.16-.05-1.77-.07-1.25-.05-2.55-.1-3.84-.15,0-.15.01-.3.02-.45,1.3.04,2.59.09,3.82.13.61.02,1.21.05,1.78.07Z"/>
                <path className="abc-113" d="M1287.54,410.54c0,.2-.03.39-.04.59,0,.16-.02.32-.03.47-.57-.02-1.17-.05-1.78-.07-1.23-.05-2.52-.09-3.82-.13,0-.15.04-.3.05-.45.02-.19.06-.38.08-.57,1.27.03,2.51.07,3.7.1.64.02,1.26.04,1.85.05Z"/>
                <path className="abc-436" d="M1287.6,409.26c-.01.23-.03.46-.03.7,0,.2-.02.39-.03.59-.59-.02-1.22-.04-1.85-.05-1.18-.04-2.43-.07-3.7-.1.01-.19.05-.38.05-.57,0-.23.06-.45.08-.67,1.24.02,2.44.05,3.56.07.67.01,1.31.03,1.91.04Z"/>
                <path className="abc-250" d="M1287.67,408.19c0,.12-.01.24-.02.37-.01.23-.04.46-.05.7-.6-.01-1.24-.03-1.91-.04-1.12-.02-2.32-.05-3.56-.07.02-.22.09-.44.11-.67.01-.12.04-.23.05-.35,1.2.01,2.34.03,3.41.04.7,0,1.36.02,1.98.02Z"/>
                <path className="abc-61" d="M1287.66,407.55c0,.09.02.19.02.28,0,.12,0,.24-.01.37-.62,0-1.29-.02-1.98-.02-1.07-.01-2.21-.03-3.41-.04,0-.12.03-.23.03-.35,0-.1-.05-.2-.09-.29,1.21.01,2.37.03,3.47.04.69,0,1.35.02,1.97.02Z"/>
                <path className="abc-75" d="M1287.61,407.08c0,.06.01.12.02.19,0,.09.03.19.03.28-.62,0-1.28-.01-1.97-.02-1.1-.01-2.26-.03-3.47-.04-.04-.1-.11-.2-.16-.3-.03-.07-.07-.13-.09-.19,1.29.02,2.55.04,3.71.06.67,0,1.32.02,1.92.03Z"/>
                <path className="abc-173" d="M1287.59,406.7c0,.06.01.13.01.19s0,.12.01.19c-.61,0-1.25-.02-1.92-.03-1.16-.02-2.42-.04-3.71-.06-.02-.06-.04-.13-.04-.19,0-.06-.03-.13-.05-.2,1.31.02,2.58.05,3.8.07.66.01,1.3.02,1.9.03Z"/>
                <path className="abc-114" d="M1287.54,406.3c0,.07.02.14.02.21,0,.06.02.13.02.19-.6,0-1.24-.02-1.9-.03-1.22-.02-2.5-.04-3.8-.07-.02-.06-.06-.13-.09-.2-.03-.07-.09-.15-.12-.22,1.37.03,2.73.05,4.01.07.64.01,1.26.02,1.86.03Z"/>
                <path className="abc-9" d="M1287.52,406.02s0,.04,0,.07c0,.07.02.14.02.21-.59-.01-1.21-.02-1.86-.03-1.28-.02-2.64-.05-4.01-.07-.03-.07-.08-.15-.09-.22,0-.02-.01-.04-.01-.07,1.4.02,2.8.05,4.12.08.63.01,1.24.02,1.83.04Z"/>
                <path className="abc-9" d="M1287.57,405.58c-.01.12-.05.25-.05.37,0,.02,0,.04,0,.07-.59-.01-1.2-.02-1.83-.04-1.32-.03-2.72-.05-4.12-.08,0-.02,0-.04,0-.07,0-.14.03-.27.06-.4,1.39.04,2.78.08,4.07.12.66,0,1.29.02,1.88.03Z"/>
                <path className="abc-169" d="M1287.71,404.94c-.02.09-.05.18-.07.27-.02.12-.07.25-.08.37-.59-.01-1.21-.02-1.88-.03-1.29-.03-2.67-.08-4.07-.12.02-.13.07-.26.1-.39.02-.09.06-.18.08-.26,1.33.05,2.65.1,3.88.14.72,0,1.4,0,2.03.01Z"/>
                <path className="abc-237" d="M1287.85,404.31c-.01.12-.05.24-.07.36-.02.09-.05.18-.06.27-.63,0-1.31-.01-2.03-.01-1.23-.04-2.55-.09-3.88-.14.02-.09.05-.17.06-.25.02-.12.05-.24.09-.35,1.29.05,2.56.09,3.73.14.76,0,1.49,0,2.16,0Z"/>
                <path className="abc-309" d="M1287.97,403.4c-.03.19-.08.37-.08.56,0,.12-.02.24-.04.36-.67,0-1.4,0-2.16,0-1.18-.04-2.44-.09-3.73-.14.03-.11.09-.22.14-.32.04-.17.13-.33.22-.5,1.18.02,2.33.04,3.37.07.83,0,1.6-.01,2.28-.02Z"/>
                <path className="abc-404" d="M1288.15,402.64c-.01.07-.03.13-.05.2-.04.19-.11.37-.14.56-.69,0-1.45,0-2.28.02-1.04-.03-2.19-.05-3.37-.07.09-.17.22-.33.33-.5.04-.06.08-.12.12-.18,1.03,0,2.01,0,2.92,0,.9-.01,1.72-.02,2.47-.03Z"/>
                <path className="abc-404" d="M1288.23,402.21c0,.08-.03.16-.04.24,0,.07-.03.13-.04.2-.74,0-1.57.02-2.47.03-.91,0-1.9,0-2.92,0,.04-.06.08-.12.12-.18.04-.07.09-.14.13-.21.94-.01,1.84-.02,2.68-.03.93-.02,1.79-.03,2.55-.04Z"/>
                <path className="abc-309" d="M1288.26,401.97c0,.08-.02.16-.02.24-.76.01-1.62.03-2.55.04-.84,0-1.73.02-2.68.03.04-.07.08-.14.11-.21.91-.02,1.77-.03,2.57-.05.95-.02,1.81-.03,2.57-.05Z"/>
                <path className="abc-130" d="M1290.63,411.73c0,.16-.02.32-.02.49-.47-.02-.98-.04-1.5-.07-.53-.02-1.08-.05-1.65-.07,0-.16.01-.32.02-.47.57.02,1.13.04,1.66.07.53.02,1.03.04,1.5.06Z"/>
                <path className="abc-364" d="M1290.7,410.64c0,.2-.03.4-.04.6,0,.16-.02.32-.03.49-.47-.02-.97-.04-1.5-.06-.53-.02-1.08-.04-1.66-.07,0-.16.02-.32.03-.47.01-.2.03-.39.04-.59.59.02,1.16.04,1.69.05.53.02,1.02.03,1.47.05Z"/>
                <path className="abc-365" d="M1290.76,409.33c-.01.24-.03.48-.03.71,0,.2-.02.4-.03.6-.45-.02-.94-.03-1.47-.05-.53-.02-1.1-.04-1.69-.05,0-.2.03-.39.03-.59,0-.23.02-.46.03-.7.6.01,1.17.03,1.7.04.53.01,1.02.02,1.46.03Z"/>
                <path className="abc-184" d="M1290.83,408.24c0,.13-.01.25-.02.38-.01.24-.04.48-.05.71-.44-.01-.93-.02-1.46-.03-.53-.01-1.1-.02-1.7-.04.01-.23.04-.46.05-.7,0-.12.02-.24.02-.37.62,0,1.2.02,1.73.02.53,0,1.01.01,1.43.02Z"/>
                <path className="abc-61" d="M1290.82,407.58c0,.09.02.18.02.28,0,.13,0,.25-.01.38-.42,0-.9-.01-1.43-.02-.53,0-1.11-.01-1.73-.02,0-.12.01-.24.01-.37,0-.09-.01-.19-.02-.28.62,0,1.2.01,1.73.02.53,0,1.01.01,1.43.02Z"/>
                <path className="abc-404" d="M1290.77,407.12c0,.06.01.12.02.18,0,.09.02.18.03.28-.42,0-.9-.01-1.43-.02-.53,0-1.11-.01-1.73-.02,0-.09-.02-.19-.03-.28,0-.06-.01-.12-.02-.19.61,0,1.18.02,1.71.03.53,0,1.02.02,1.46.02Z"/>
                <path className="abc-111" d="M1290.75,406.75c0,.06.01.12.01.19s0,.12.01.18c-.44,0-.93-.01-1.46-.02-.53,0-1.1-.02-1.71-.03,0-.06-.01-.12-.01-.19s0-.13-.01-.19c.6,0,1.18.02,1.71.03s1.02.02,1.46.03Z"/>
                <path className="abc-56" d="M1290.71,406.36c0,.07.02.14.02.21,0,.06.02.12.02.19-.44,0-.93-.02-1.46-.03s-1.1-.02-1.71-.03c0-.06-.01-.13-.02-.19,0-.07-.02-.14-.02-.21.59.01,1.16.02,1.69.03.53.01,1.02.02,1.48.03Z"/>
                <path className="abc-225" d="M1290.68,406.08s0,.04,0,.06c0,.07.01.14.02.21-.45,0-.95-.02-1.48-.03-.53-.01-1.1-.02-1.69-.03,0-.07-.02-.14-.02-.21,0-.02,0-.04,0-.07.59.01,1.15.02,1.68.03.53.01,1.03.02,1.48.03Z"/>
                <path className="abc-357" d="M1290.74,405.63c-.01.13-.06.26-.06.38,0,.02,0,.04,0,.06-.46,0-.95-.02-1.48-.03-.53-.01-1.09-.02-1.68-.03,0-.02,0-.04,0-.07,0-.12.03-.25.05-.37.59.01,1.15.02,1.68.03.53,0,1.04.02,1.49.03Z"/>
                <path className="abc-169" d="M1290.9,404.97c-.02.09-.05.18-.07.27-.02.13-.07.26-.09.38-.46,0-.96-.02-1.49-.03-.53,0-1.09-.02-1.68-.03.01-.12.06-.25.08-.37.02-.09.05-.18.07-.27.63,0,1.21.01,1.75.02.53,0,1.02.01,1.44.02Z"/>
                <path className="abc-93" d="M1291.04,404.33c-.01.12-.05.25-.07.37-.02.09-.05.18-.07.27-.42,0-.9-.01-1.44-.02-.53,0-1.12-.01-1.75-.02.02-.09.05-.18.06-.27.02-.12.06-.24.07-.36.67,0,1.28,0,1.82,0,.54,0,.99,0,1.37.01Z"/>
                <path className="abc-217" d="M1291.17,403.39c-.03.19-.09.38-.09.57,0,.12-.03.25-.04.37-.38,0-.84,0-1.37-.01-.54,0-1.15,0-1.82,0,.01-.12.04-.24.04-.36,0-.18.05-.37.08-.56.69,0,1.3,0,1.84,0s1,0,1.36,0Z"/>
                <path className="abc-404" d="M1291.37,402.61c-.01.07-.04.14-.05.21-.04.19-.12.38-.14.58-.36,0-.83,0-1.36,0s-1.15,0-1.84,0c.03-.19.1-.37.14-.56.01-.07.04-.13.05-.2.74,0,1.39-.02,1.93-.02.54,0,.97-.01,1.28-.01Z"/>
                <path className="abc-404" d="M1291.46,402.15c0,.08-.03.16-.04.25,0,.07-.03.14-.04.21-.31,0-.74,0-1.28.01-.54,0-1.19.01-1.93.02.01-.07.03-.13.04-.2.01-.08.03-.16.04-.24.76-.01,1.43-.02,1.97-.03.54,0,.96-.02,1.25-.02Z"/>
                <path className="abc-309" d="M1291.48,401.91c0,.08-.02.16-.03.25-.29,0-.71.01-1.25.02-.54,0-1.21.02-1.97.03,0-.08.02-.16.02-.24.76-.01,1.42-.03,1.97-.04.54-.01.97-.02,1.26-.02Z"/>
                <path className="abc-344" d="M1291.92,411.79v.49c-.4-.02-.84-.04-1.32-.06,0-.16.01-.32.02-.49.47.02.91.04,1.3.06Z"/>
                <path className="abc-217" d="M1291.92,410.69v1.1c-.39-.02-.83-.04-1.3-.06,0-.16.02-.32.03-.49.01-.2.03-.4.04-.6.45.02.86.03,1.23.04Z"/>
                <path className="abc-365" d="M1291.92,409.36v1.33c-.37-.01-.78-.03-1.23-.04,0-.2.03-.4.03-.6,0-.24.02-.48.03-.71.44.01.83.02,1.17.03Z"/>
                <path className="abc-184" d="M1291.92,408.26v1.1c-.33,0-.72-.02-1.17-.03.01-.24.04-.48.05-.71,0-.13.02-.25.02-.38.42,0,.79.01,1.1.02Z"/>
                <path className="abc-61" d="M1291.92,407.6v.66c-.31,0-.67-.01-1.1-.02,0-.13.01-.25.01-.38,0-.09-.01-.18-.02-.28.42,0,.79.01,1.1.01Z"/>
                <path className="abc-404" d="M1291.92,407.14v.46c-.31,0-.68,0-1.1-.01,0-.09-.02-.19-.03-.28,0-.06-.01-.12-.02-.18.44,0,.83.01,1.15.02Z"/>
                <path className="abc-160" d="M1291.92,406.77v.37c-.33,0-.72-.01-1.15-.02,0-.06-.01-.12-.01-.18s0-.12-.01-.19c.44,0,.83.02,1.17.02Z"/>
                <path className="abc-404" d="M1291.92,406.38v.39c-.34,0-.73-.01-1.17-.02,0-.06-.01-.12-.02-.19,0-.07-.02-.14-.02-.21.45,0,.86.02,1.22.02Z"/>
                <path className="abc-415" d="M1291.92,406.11v.27c-.36,0-.77-.02-1.22-.02,0-.07-.02-.14-.02-.21,0-.02,0-.04,0-.06.46,0,.87.02,1.24.03Z"/>
                <path className="abc-456" d="M1291.92,405.66v.45c-.37,0-.78-.02-1.24-.03,0-.02,0-.04,0-.06,0-.13.04-.26.06-.38.46,0,.86.02,1.19.02Z"/>
                <path className="abc-169" d="M1291.92,404.99v.66c-.33,0-.73-.02-1.19-.02.01-.13.07-.26.09-.38.02-.09.05-.18.07-.27.42,0,.77.01,1.03.02Z"/>
                <path className="abc-309" d="M1291.92,404.34v.65c-.26,0-.61-.01-1.03-.02.02-.09.05-.18.07-.27.02-.12.06-.25.07-.37.38,0,.67,0,.89.01Z"/>
                <path className="abc-404" d="M1291.92,403.39v.95c-.21,0-.51,0-.89-.01.01-.12.04-.25.04-.37,0-.19.06-.38.09-.57.36,0,.62,0,.75,0Z"/>
                <path className="abc-404" d="M1291.92,402.61v.79c-.13,0-.39,0-.75,0,.03-.19.11-.38.14-.58.01-.07.04-.14.05-.21.31,0,.5,0,.56,0Z"/>
                <path className="abc-56" d="M1291.92,402.15v.46c-.06,0-.25,0-.56,0,.01-.07.03-.14.04-.21.01-.08.04-.16.04-.25.29,0,.45,0,.47,0Z"/>
                <path className="abc-93" d="M1291.92,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
              </g>
              <g>
                <path className="abc-52" d="M1291.92,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
              </g>
              <g>
                <path className="abc-52" d="M1291.92,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
              </g>
            </g>
            <g id="MeshGrid-6" data-name="MeshGrid">
              <g>
                <path className="abc-427" d="M1291.19,874.66c.02.3.14.6.16.88.38-.01.58-.03.58-.03v-.97c-.1,0-.35.06-.74.12Z"/>
                <path className="abc-390" d="M1290.9,873c.02.25.1.49.12.73.03.32.14.63.17.93.39-.06.64-.12.74-.12v-1.7c-.25,0-.59.09-1.02.16Z"/>
                <path className="abc-119" d="M1290.7,871.67c.02.2.07.39.09.58.02.25.1.5.12.75.43-.08.77-.16,1.02-.16v-1.28c-.36,0-.76.06-1.23.11Z"/>
                <path className="abc-196" d="M1290.55,870.66c.01.14.05.28.06.42.02.2.07.4.09.59.47-.05.87-.11,1.23-.11v-.93c-.42,0-.88.02-1.37.04Z"/>
                <path className="abc-343" d="M1290.44,869.5c.02.25.03.49.05.74.01.14.05.28.06.42.5-.01.95-.03,1.37-.04v-1.15c-.45,0-.95.02-1.48.03Z"/>
                <path className="abc-360" d="M1290.28,866.84c.04.64.07,1.28.12,1.93.02.25.03.49.05.74.53-.01,1.04-.03,1.48-.03v-2.78c-.47.01-1.04.08-1.65.15Z"/>
                <path className="abc-5" d="M1290.03,861.74c.05,1.06.08,2.12.14,3.17.04.64.06,1.28.1,1.92.61-.07,1.18-.14,1.65-.15v-5.33c-.53.03-1.19.21-1.89.39Z"/>
                <path className="abc-327" d="M1289.83,854.71c.03,1.29.05,2.58.09,3.86.04,1.06.06,2.12.11,3.17.71-.18,1.37-.36,1.89-.39v-7.36c-.61.05-1.32.38-2.09.71Z"/>
                <path className="abc-364" d="M1289.78,849.53c0,.44,0,.87,0,1.31.01,1.29.01,2.59.04,3.87.77-.33,1.49-.66,2.09-.71v-5.4c-.65.06-1.36.49-2.14.93Z"/>
                <path className="abc-364" d="M1289.79,846.28c0,.67,0,1.32,0,1.93,0,.44,0,.87,0,1.31.78-.44,1.49-.87,2.14-.93v-2.98c-.65.06-1.36.36-2.14.66Z"/>
                <path className="abc-404" d="M1289.79,842.75v1.44c0,.72,0,1.42,0,2.09.78-.3,1.49-.6,2.14-.66v-3.42c-.65.06-1.36.31-2.13.56Z"/>
                <path className="abc-406" d="M1289.79,633.17c0,87.27,0,177.63,0,208.13v1.46c.78-.25,1.49-.49,2.13-.56v-204.49c-.64.88-1.35-1.83-2.13-4.54Z"/>
                <path className="abc-108" d="M1289.79,425.81c0,1.98,0,3.99,0,6.11,0,5.51,0,12.6,0,21.84,0,29.86,0,103.49,0,179.4.78,2.7,1.5,5.42,2.13,4.54v-209.19c-.63-.03-1.35-1.37-2.13-2.7Z"/>
                <path className="abc-300" d="M1289.8,416.52c0,1.18,0,2.37,0,3.62,0,1.83,0,3.71,0,5.68.79,1.33,1.5,2.68,2.13,2.7v-10.77c-.63-.03-1.34-.63-2.13-1.23Z"/>
                <path className="abc-396" d="M1289.8,412.64v.47c0,1.11,0,2.23,0,3.41.79.6,1.5,1.2,2.13,1.23v-4.87c-.63-.03-1.34-.13-2.13-.24Z"/>
                <path className="abc-344" d="M1289.8,412.18v.46c.79.1,1.5.21,2.13.24v-.6c-.63-.03-1.34-.06-2.13-.1Z"/>
                <path className="abc-60" d="M1288.84,874.75c.07.28.13.55.19.79.24,0,.48.01.69.02.69.01,1.24,0,1.62-.01-.02-.29-.14-.58-.16-.88-.39.06-.93.11-1.6.1-.25,0-.49,0-.75-.01Z"/>
                <path className="abc-376" d="M1288.46,873.11c.06.25.12.5.17.73.07.32.14.62.21.9.26,0,.5,0,.75.01.67.01,1.2-.04,1.6-.1-.02-.3-.14-.61-.17-.93-.02-.24-.1-.48-.12-.73-.43.08-.95.15-1.58.13-.3,0-.57-.01-.86-.02Z"/>
                <path className="abc-95" d="M1288.13,871.72c.05.21.1.42.14.62.06.27.12.53.18.78.29,0,.57.01.86.02.63.02,1.15-.06,1.58-.13-.02-.25-.1-.5-.12-.75-.02-.19-.07-.39-.09-.58-.47.05-.99.1-1.59.08-.33-.01-.64-.02-.97-.03Z"/>
                <path className="abc-384" d="M1287.88,870.63c.04.15.07.3.11.45.05.22.1.43.15.64.33.01.64.02.97.03.6.02,1.13-.03,1.59-.08-.02-.2-.07-.39-.09-.59-.01-.14-.04-.28-.06-.42-.5.01-1.03.02-1.62,0-.35-.01-.7-.02-1.06-.04Z"/>
                <path className="abc-303" d="M1287.59,869.44c.06.24.12.48.18.72.04.15.07.31.11.46.36.02.71.03,1.06.04.58.02,1.12.01,1.62,0-.01-.14-.05-.28-.06-.42-.02-.25-.03-.49-.05-.74-.53.01-1.1.01-1.68,0-.36-.01-.76-.03-1.17-.06Z"/>
                <path className="abc-87" d="M1286.99,866.85c.14.63.27,1.24.42,1.87.06.24.11.48.17.72.41.03.81.05,1.17.06.58.02,1.15.01,1.68,0-.02-.25-.03-.49-.05-.74-.04-.64-.08-1.29-.12-1.93-.61.07-1.25.13-1.87.12-.42,0-.91-.05-1.42-.1Z"/>
                <path className="abc-5" d="M1285.97,861.94c.21,1.03.39,2.02.62,3.06.14.62.26,1.23.4,1.86.51.05.99.1,1.42.1.61.01,1.26-.05,1.87-.12-.04-.64-.07-1.28-.1-1.92-.06-1.06-.09-2.12-.14-3.17-.71.18-1.46.35-2.16.36-.61.02-1.24-.06-1.9-.16Z"/>
                <path className="abc-349" d="M1284.77,855.14c.21,1.26.4,2.49.63,3.74.19,1.03.36,2.03.57,3.06.66.11,1.29.19,1.9.16.7,0,1.46-.18,2.16-.36-.05-1.06-.07-2.11-.11-3.17-.04-1.29-.06-2.57-.09-3.86-.77.33-1.6.66-2.43.7-.87.05-1.72-.08-2.63-.27Z"/>
                <path className="abc-33" d="M1284.07,850.07c.05.43.08.85.14,1.28.18,1.28.35,2.52.56,3.78.91.18,1.77.32,2.63.27.83-.04,1.66-.37,2.43-.7-.03-1.29-.03-2.58-.04-3.87,0-.43,0-.87,0-1.31-.78.44-1.62.87-2.51.92-1,.07-2.06-.12-3.2-.37Z"/>
                <path className="abc-223" d="M1283.83,846.74c.04.67.07,1.42.12,2.04.05.44.07.86.12,1.29,1.14.26,2.19.45,3.2.37.9-.05,1.74-.49,2.51-.92,0-.44,0-.87,0-1.31,0-.62,0-1.26,0-1.93-.78.3-1.62.6-2.52.66-1.05.07-2.2-.05-3.44-.2Z"/>
                <path className="abc-261" d="M1283.71,843.67c.01.29.02.63.03.9.03.71.05,1.5.09,2.17,1.24.15,2.39.27,3.44.2.9-.06,1.75-.36,2.52-.66,0-.67,0-1.37,0-2.09v-1.44c-.78.25-1.62.49-2.53.55-1.08.06-2.27.21-3.55.37Z"/>
                <path className="abc-261" d="M1283.19,639.2c.03,60.23.12,118.51.12,148.75s.1,47.6.37,54.75c.01.32.01.68.03.97,1.28-.16,2.47-.3,3.55-.37.91-.06,1.75-.3,2.53-.55v-1.46c0-30.5,0-120.86,0-208.13-.78-2.7-1.63-5.39-2.53-4.45-1.27-2.62-2.64,3.91-4.07,10.48Z"/>
                <path className="abc-404" d="M1282.98,423.52c0,1.92,0,3.94,0,6.16,0,2.65.01,5.72.01,9.24,0,3.97.01,8.73.01,14.42,0,28.49.15,108.66.19,185.86,1.43-6.57,2.8-13.1,4.07-10.48.9-.94,1.75,1.74,2.53,4.45,0-75.91,0-149.55,0-179.4,0-9.24,0-16.33,0-21.84,0-2.12,0-4.14,0-6.11-.79-1.33-1.64-2.64-2.53-2.59-1.36.08-2.82.16-4.29.29Z"/>
                <path className="abc-404" d="M1282.96,415.12c0,.97,0,2.01,0,3.17,0,1.59,0,3.31,0,5.22,1.47-.12,2.92-.21,4.29-.29.89-.05,1.75,1.26,2.53,2.59,0-1.98,0-3.85,0-5.68,0-1.25,0-2.44,0-3.62-.78-.6-1.64-1.2-2.53-1.21-1.36-.02-2.82-.11-4.3-.18Z"/>
                <path className="abc-337" d="M1282.96,412.21c0,.11,0,.21,0,.32,0,.77,0,1.62,0,2.59,1.48.07,2.94.16,4.3.18.9.01,1.75.61,2.53,1.21,0-1.18,0-2.3,0-3.41v-.47c-.79-.1-1.64-.21-2.53-.25-1.36-.06-2.83-.12-4.31-.19Z"/>
                <path className="abc-85" d="M1282.96,411.9v.31c1.48.06,2.94.13,4.31.19.9.04,1.75.14,2.53.25v-.46c-.79-.04-1.64-.07-2.53-.11-1.36-.06-2.83-.12-4.31-.17Z"/>
                <path className="abc-115" d="M1287.77,874.7c.09.28.18.55.26.79.08,0,.15,0,.23.01.27.01.53.03.77.03-.06-.24-.12-.51-.19-.79-.26,0-.53-.01-.83-.03-.08,0-.16,0-.24-.01Z"/>
                <path className="abc-235" d="M1287.23,873.06c.08.26.16.5.24.74.1.32.2.62.29.9.08,0,.16,0,.24.01.3.02.57.02.83.03-.07-.28-.14-.58-.21-.9-.05-.24-.11-.48-.17-.73-.29,0-.59-.02-.94-.04-.1,0-.19-.01-.28-.02Z"/>
                <path className="abc-362" d="M1286.77,871.65c.07.21.14.42.21.62.09.27.18.53.26.79.09,0,.19,0,.28.02.35.02.65.03.94.04-.06-.25-.12-.51-.18-.78-.05-.2-.1-.41-.14-.62-.33-.01-.67-.03-1.05-.05-.11,0-.21-.01-.32-.02Z"/>
                <path className="abc-71" d="M1286.4,870.55c.05.15.1.31.16.46.07.22.15.43.22.64.11,0,.21.01.32.02.38.02.72.04,1.05.05-.05-.21-.1-.42-.15-.64-.04-.15-.07-.3-.11-.45-.36-.02-.74-.04-1.14-.06-.11,0-.23-.01-.34-.02Z"/>
                <path className="abc-284" d="M1285.98,869.34c.09.25.17.5.26.74.05.16.11.31.16.46.11,0,.23.01.34.02.4.02.78.04,1.14.06-.04-.15-.07-.31-.11-.46-.06-.24-.12-.48-.18-.72-.41-.03-.84-.06-1.26-.08-.12,0-.24-.01-.36-.02Z"/>
                <path className="abc-360" d="M1285.03,866.66c.23.64.46,1.29.69,1.93.09.25.17.5.26.74.12,0,.24.02.36.02.42.02.84.05,1.26.08-.06-.24-.11-.48-.17-.72-.15-.63-.28-1.24-.42-1.87-.51-.05-1.03-.12-1.54-.16-.14-.01-.28-.02-.43-.03Z"/>
                <path className="abc-5" d="M1283.2,861.56c.38,1.06.75,2.12,1.13,3.17.23.64.46,1.29.69,1.93.14.01.29.02.43.03.5.04,1.03.1,1.54.16-.14-.63-.27-1.24-.4-1.86-.23-1.03-.41-2.03-.62-3.06-.66-.11-1.36-.24-2.12-.32-.21-.02-.43-.04-.65-.06Z"/>
                <path className="abc-206" d="M1280.81,854.49c.41,1.3.84,2.6,1.29,3.89.37,1.06.73,2.12,1.11,3.18.22.01.44.03.65.06.76.08,1.46.22,2.12.32-.21-1.03-.38-2.02-.57-3.06-.23-1.26-.42-2.48-.63-3.74-.91-.18-1.88-.42-2.98-.56-.31-.04-.64-.07-.98-.09Z"/>
                <path className="abc-88" d="M1279.28,849.2c.11.45.23.9.36,1.35.37,1.32.76,2.64,1.17,3.95.34.02.67.05.98.09,1.1.14,2.07.38,2.98.56-.21-1.26-.37-2.5-.56-3.78-.06-.43-.09-.85-.14-1.28-1.14-.25-2.35-.57-3.66-.76-.37-.05-.74-.09-1.13-.12Z"/>
                <path className="abc-31" d="M1278.65,846.26c.09.53.19,1.04.31,1.59.1.45.21.91.32,1.36.38.03.76.07,1.13.12,1.31.18,2.53.5,3.66.76-.05-.43-.07-.86-.12-1.29-.06-.63-.09-1.37-.12-2.04-1.24-.15-2.57-.35-3.97-.42-.39-.02-.8-.05-1.21-.06Z"/>
                <path className="abc-342" d="M1278.34,844.17c.02.21.05.4.08.58.07.5.15.98.23,1.51.41.02.81.04,1.21.06,1.41.08,2.74.27,3.97.42-.04-.67-.06-1.46-.09-2.17-.01-.27-.02-.6-.03-.9-1.28.16-2.66.32-4.12.43-.41.03-.83.05-1.25.07Z"/>
                <path className="abc-47" d="M1277.5,648.5c.03,60.54.06,113.83.06,130.07,0,40.24.14,58.65.71,64.92.02.25.05.47.07.69.42-.02.84-.05,1.25-.07,1.46-.1,2.84-.27,4.12-.43-.01-.29-.02-.65-.03-.97-.26-7.14-.37-24.19-.37-54.75s-.1-88.52-.12-148.75c-1.43,6.57-2.91,13.18-4.43,10.72-.42-.91-.84-1.16-1.27-1.43Z"/>
                <path className="abc-147" d="M1277.39,421.78c0,1.71,0,3.55,0,5.52,0,2.17,0,4.7,0,7.57,0,32.62.06,130.05.1,213.62.42.27.85.52,1.27,1.43,1.51,2.46,3-4.15,4.43-10.72-.03-77.2-.18-157.38-.19-185.86,0-5.69-.01-10.46-.01-14.42,0-3.52,0-6.59-.01-9.24,0-2.21,0-4.24,0-6.16-1.47.12-2.96.28-4.39.52-.4-.85-.8-1.55-1.2-2.25Z"/>
                <path className="abc-342" d="M1277.37,414.4c0,.82,0,1.72,0,2.71,0,1.4,0,2.96,0,4.67.39.7.79,1.4,1.2,2.25,1.44-.23,2.92-.39,4.39-.52,0-1.92,0-3.63,0-5.22,0-1.16,0-2.2,0-3.17-1.48-.07-2.97-.13-4.41-.1-.4-.24-.8-.43-1.18-.62Z"/>
                <path className="abc-189" d="M1277.37,411.97c0,.09,0,.17,0,.26,0,.63,0,1.35,0,2.17.39.19.78.38,1.18.62,1.43-.03,2.93.03,4.41.1,0-.97,0-1.82,0-2.59,0-.11,0-.22,0-.32-1.48-.06-2.98-.12-4.41-.16-.4-.02-.79-.05-1.18-.08Z"/>
                <path className="abc-223" d="M1277.37,411.72v.25c.39.03.78.06,1.18.08,1.43.04,2.93.1,4.41.16v-.31c-1.48-.06-2.98-.11-4.41-.15-.4-.01-.79-.02-1.18-.03Z"/>
                <path className="abc-315" d="M1287.05,874.65c.12.28.24.55.33.79.14.01.28.02.42.03.08,0,.16.01.24.01-.08-.24-.17-.5-.26-.79-.08,0-.16,0-.25-.01-.17-.01-.32-.02-.47-.04Z"/>
                <path className="abc-235" d="M1286.31,873c.12.26.23.51.34.75.14.32.28.63.4.91.15.01.3.02.47.04.09,0,.17.01.25.01-.09-.28-.19-.58-.29-.9-.08-.24-.16-.49-.24-.74-.09,0-.19-.01-.29-.02-.22-.01-.43-.03-.63-.05Z"/>
                <path className="abc-171" d="M1285.68,871.58c.09.21.18.42.27.63.12.27.24.54.35.79.21.02.41.03.63.05.1,0,.2.01.29.02-.08-.26-.17-.52-.26-.79-.07-.2-.14-.41-.21-.62-.11,0-.21-.01-.32-.02-.25-.02-.51-.03-.76-.05Z"/>
                <path className="abc-122" d="M1285.22,870.47c.06.15.12.31.19.46.09.22.18.43.27.65.25.02.51.03.76.05.11,0,.22.01.32.02-.07-.21-.14-.43-.22-.64-.05-.15-.1-.3-.16-.46-.11,0-.23-.01-.35-.02-.27-.02-.55-.04-.83-.05Z"/>
                <path className="abc-414" d="M1284.75,869.26c.1.25.19.49.29.74.06.16.12.31.18.46.28.02.55.04.83.05.12,0,.23.01.35.02-.05-.15-.11-.31-.16-.46-.09-.25-.17-.5-.26-.74-.12,0-.24-.02-.36-.02-.28-.02-.57-.03-.86-.05Z"/>
                <path className="abc-79" d="M1283.67,866.6c.27.64.53,1.28.78,1.92.1.25.2.49.29.74.29.02.58.03.86.05.12,0,.24.02.36.02-.09-.25-.17-.5-.26-.74-.23-.64-.46-1.29-.69-1.93-.14-.01-.29-.02-.44-.03-.29-.02-.6-.02-.91-.03Z"/>
                <path className="abc-5" d="M1281.52,861.53c.45,1.05.9,2.1,1.35,3.15.27.64.54,1.28.81,1.91.31,0,.62.02.91.03.15,0,.3.02.44.03-.23-.64-.46-1.29-.69-1.93-.38-1.06-.76-2.12-1.13-3.17-.22-.01-.45-.02-.68-.02-.31,0-.66,0-1,0Z"/>
                <path className="abc-339" d="M1278.69,854.49c.47,1.3.98,2.6,1.51,3.88.43,1.06.88,2.11,1.32,3.16.35,0,.69,0,1,0,.23,0,.46,0,.68.02-.38-1.06-.74-2.12-1.11-3.18-.44-1.29-.87-2.59-1.29-3.89-.34-.02-.69-.03-1.03-.02-.35,0-.72.01-1.09.02Z"/>
                <path className="abc-40" d="M1277,849.18c.12.45.25.9.38,1.35.39,1.34.83,2.65,1.3,3.96.37,0,.74-.02,1.09-.02.34,0,.69,0,1.03.02-.41-1.3-.8-2.62-1.17-3.95-.12-.45-.25-.9-.36-1.35-.38-.03-.78-.04-1.18-.03-.37,0-.73.01-1.1.01Z"/>
                <path className="abc-314" d="M1276.31,846.25c.1.51.21,1.03.34,1.57.11.46.23.91.35,1.36.37,0,.73,0,1.1-.01.4,0,.79,0,1.18.03-.11-.45-.22-.9-.32-1.36-.12-.55-.22-1.06-.31-1.59-.41-.02-.83-.02-1.25-.02-.36,0-.73.01-1.09,0Z"/>
                <path className="abc-62" d="M1275.96,844.17c.03.23.05.42.09.61.08.47.16.96.26,1.47.36,0,.73,0,1.09,0,.42,0,.84,0,1.25.02-.09-.53-.16-1.01-.23-1.51-.03-.18-.05-.36-.08-.58-.42.02-.85.03-1.29.04-.36,0-.72-.01-1.09-.04Z"/>
                <path className="abc-336" d="M1275.14,636.53c0,53.83.01,104.5.02,133.7,0,1.55,0,3.06,0,4.51,0,17.86.03,32.06.12,43.11.08,11.25.02,19.75.61,25.6.03.27.05.49.08.72.37.03.73.04,1.09.04.44,0,.87-.02,1.29-.04-.02-.21-.05-.43-.07-.69-.56-6.28-.71-24.68-.71-64.92,0-16.23-.03-69.52-.06-130.07-.42-.27-.85-.56-1.27-1.55-.36-1.06-.72-5.73-1.09-10.42Z"/>
                <path className="abc-415" d="M1275.12,423.82c0,1.78,0,3.61,0,5.5,0,31.06,0,122.77.01,207.21.37,4.69.73,9.36,1.09,10.42.42.99.85,1.28,1.27,1.55-.04-83.58-.1-181-.1-213.62,0-2.87,0-5.4,0-7.57,0-1.97,0-3.82,0-5.52-.39-.7-.78-1.4-1.16-2.25-.37-.02-.74,2.14-1.1,4.29Z"/>
                <path className="abc-415" d="M1275.12,415.49v3.18c0,1.65,0,3.37,0,5.15.37-2.15.74-4.31,1.1-4.29.38.85.77,1.55,1.16,2.25,0-1.7,0-3.27,0-4.67,0-.99,0-1.9,0-2.71-.39-.19-.77-.38-1.14-.61-.37,0-.74.85-1.1,1.7Z"/>
                <path className="abc-339" d="M1275.12,412.08v.41c0,.97,0,1.98,0,3.01.37-.86.74-1.71,1.1-1.7.37.24.75.42,1.14.61,0-.82,0-1.54,0-2.17,0-.09,0-.18,0-.26-.39-.03-.77-.06-1.14-.08-.37,0-.74.09-1.11.18Z"/>
                <path className="abc-406" d="M1275.12,411.67v.41c.37-.1.74-.19,1.11-.18.37.01.75.04,1.14.08v-.25c-.39,0-.77-.02-1.14-.03-.37,0-.74-.01-1.11-.02Z"/>
                <path className="abc-129" d="M1285.7,874.53c.19.29.37.56.52.81.25.03.49.05.73.07.15.01.29.02.43.04-.09-.24-.21-.51-.33-.79-.15-.01-.31-.03-.48-.04-.29-.02-.57-.05-.86-.08Z"/>
                <path className="abc-229" d="M1284.59,872.85c.17.26.34.51.5.75.21.33.43.63.62.92.29.03.58.06.86.08.18.01.33.03.48.04-.12-.28-.26-.59-.4-.91-.11-.24-.22-.49-.34-.75-.21-.02-.42-.03-.64-.05-.36-.03-.72-.06-1.08-.09Z"/>
                <path className="abc-11" d="M1283.7,871.42c.13.21.25.42.38.63.17.27.34.54.51.8.36.04.71.07,1.08.09.22.02.43.03.64.05-.11-.26-.23-.52-.35-.79-.09-.21-.18-.42-.27-.63-.25-.02-.51-.04-.76-.05-.42-.03-.82-.06-1.23-.1Z"/>
                <path className="abc-196" d="M1283.06,870.31c.08.15.17.31.26.46.13.22.25.44.38.65.4.04.81.07,1.23.1.26.02.51.04.76.05-.09-.21-.18-.43-.27-.65-.06-.15-.13-.3-.19-.46-.28-.02-.55-.04-.83-.06-.45-.03-.89-.07-1.34-.1Z"/>
                <path className="abc-28" d="M1282.47,869.12c.12.24.23.48.35.73.08.16.16.31.24.47.44.04.89.07,1.34.1.28.02.55.04.83.06-.06-.15-.12-.31-.18-.46-.09-.25-.19-.5-.29-.74-.29-.02-.58-.03-.86-.05-.46-.03-.94-.06-1.42-.09Z"/>
                <path className="abc-118" d="M1281.19,866.51c.31.63.61,1.25.92,1.88.12.24.23.48.35.72.48.03.96.06,1.42.09.28.02.57.04.86.05-.1-.25-.19-.49-.29-.74-.26-.64-.52-1.28-.78-1.92-.31,0-.62-.02-.92-.04-.48-.03-1.02-.04-1.56-.05Z"/>
                <path className="abc-5" d="M1278.78,861.53c.49,1.04.99,2.07,1.49,3.1.31.63.61,1.25.92,1.88.54.01,1.09.02,1.56.05.29.02.6.03.92.04-.27-.64-.54-1.28-.81-1.91-.45-1.05-.9-2.1-1.35-3.15-.35,0-.69,0-1.01,0-.52-.02-1.13,0-1.73,0Z"/>
                <path className="abc-44" d="M1275.79,854.52c.49,1.31,1.01,2.6,1.57,3.88.46,1.05.93,2.09,1.42,3.13.61,0,1.22-.02,1.73,0,.32.01.66.01,1.01,0-.45-1.05-.89-2.1-1.32-3.16-.53-1.29-1.03-2.58-1.51-3.88-.37,0-.74.02-1.09.01-.57,0-1.19,0-1.81.02Z"/>
                <path className="abc-159" d="M1274.1,849.15c.12.46.24.92.37,1.38.39,1.36.83,2.69,1.31,4,.62,0,1.24-.02,1.81-.02.35,0,.72,0,1.09-.01-.47-1.31-.91-2.62-1.3-3.96-.13-.45-.26-.9-.38-1.35-.37,0-.73,0-1.1,0-.6,0-1.2-.02-1.8-.04Z"/>
                <path className="abc-247" d="M1273.43,846.18c.1.51.21,1.04.33,1.57.11.47.22.93.34,1.4.6.02,1.2.03,1.8.04.37,0,.74,0,1.1,0-.12-.45-.24-.9-.35-1.36-.13-.54-.24-1.06-.34-1.57-.36,0-.73,0-1.09-.01-.6-.01-1.19-.03-1.79-.06Z"/>
                <path className="abc-327" d="M1273.04,843.71c.04.36.09.68.13.98.07.47.16.97.26,1.48.6.03,1.19.05,1.79.06.37,0,.73.01,1.09.01-.1-.51-.19-1-.26-1.47-.03-.19-.06-.38-.09-.61-.37-.03-.73-.07-1.1-.12-.6-.08-1.21-.2-1.82-.34Z"/>
                <path className="abc-202" d="M1272.22,625.88c0,48.14.02,96.99.04,137.9,0,16.3.04,31.31.06,44.5.02,13.61-.31,25.31.6,34.37.04.35.07.71.12,1.07.61.13,1.22.25,1.82.34.37.05.74.09,1.1.12-.03-.23-.05-.45-.08-.72-.58-5.85-.52-14.35-.61-25.6-.09-11.05-.12-25.26-.12-43.11,0-1.45,0-2.96,0-4.51,0-29.2-.01-79.87-.02-133.7-.37-4.69-.74-9.38-1.1-10.48-.6.07-1.21-.01-1.82-.16Z"/>
                <path className="abc-195" d="M1272.22,428.07c0,2.19,0,4.38,0,6.57,0,36.04,0,112.69,0,191.25.61.15,1.22.23,1.82.16.37,1.1.74,5.8,1.1,10.48,0-84.44-.01-176.15-.01-207.21,0-1.89,0-3.72,0-5.5-.37,2.15-.74,4.31-1.11,4.3-.6,0-1.2-.03-1.8-.06Z"/>
                <path className="abc-378" d="M1272.22,417.17c0,1.44,0,2.88,0,4.32,0,2.19,0,4.38,0,6.57.6.02,1.2.05,1.8.06.37,0,.74-2.15,1.11-4.3,0-1.78,0-3.49,0-5.15v-3.18c-.37.86-.74,1.72-1.11,1.71-.6,0-1.2-.02-1.8-.03Z"/>
                <path className="abc-285" d="M1272.22,412.25v4.93c.6.01,1.2.02,1.8.03.37,0,.74-.85,1.11-1.71,0-1.03,0-2.03,0-3.01v-.41c-.37.1-.74.19-1.11.19-.6,0-1.2-.01-1.8-.02Z"/>
                <path className="abc-402" d="M1272.22,411.64v.61c.6,0,1.2.01,1.8.02.37,0,.74-.09,1.11-.19v-.41c-.37,0-.74-.01-1.11-.02-.6,0-1.2-.01-1.8-.02Z"/>
                <path className="abc-264" d="M1283.73,874.27c.27.3.52.58.75.85.33.05.66.09.97.13.26.03.52.06.77.09-.14-.25-.33-.52-.52-.81-.29-.03-.58-.07-.88-.1-.36-.04-.72-.1-1.09-.15Z"/>
                <path className="abc-268" d="M1282.23,872.56c.23.26.45.52.66.76.28.33.57.65.83.95.37.06.74.11,1.09.15.3.04.59.07.88.1-.19-.29-.41-.6-.62-.92-.16-.24-.33-.49-.5-.75-.36-.04-.71-.07-1.06-.12-.43-.05-.86-.11-1.29-.18Z"/>
                <path className="abc-150" d="M1281.02,871.12c.17.22.36.43.53.64.23.28.46.54.68.81.44.06.87.12,1.29.18.35.04.71.08,1.06.12-.17-.26-.35-.53-.51-.8-.13-.21-.25-.42-.38-.63-.4-.04-.8-.08-1.21-.12-.49-.05-.97-.11-1.46-.18Z"/>
                <path className="abc-388" d="M1280.13,870c.12.16.24.31.36.46.17.22.35.44.53.65.49.07.98.13,1.46.18.41.04.81.08,1.21.12-.13-.21-.25-.43-.38-.65-.09-.15-.17-.31-.26-.46-.44-.04-.89-.08-1.33-.12-.54-.05-1.07-.12-1.6-.19Z"/>
                <path className="abc-426" d="M1279.33,868.83c.15.23.3.46.46.7.11.16.23.31.35.47.53.07,1.06.13,1.6.19.44.05.89.09,1.33.12-.08-.15-.17-.31-.24-.47-.12-.24-.23-.48-.35-.73-.48-.03-.96-.07-1.42-.11-.55-.06-1.14-.11-1.72-.17Z"/>
                <path className="abc-206" d="M1277.73,866.32c.37.61.76,1.21,1.14,1.82.15.23.3.47.45.7.58.06,1.16.12,1.72.17.46.05.94.08,1.42.11-.12-.24-.23-.48-.35-.72-.31-.63-.61-1.26-.92-1.88-.54-.01-1.09-.03-1.56-.07-.57-.05-1.24-.08-1.9-.12Z"/>
                <path className="abc-5" d="M1274.94,861.44c.54,1.03,1.11,2.04,1.7,3.05.36.61.72,1.22,1.1,1.83.66.04,1.32.07,1.9.12.47.04,1.02.06,1.56.07-.31-.63-.62-1.25-.92-1.88-.51-1.03-1.01-2.06-1.49-3.1-.61,0-1.22.01-1.73-.02-.62-.05-1.37-.05-2.1-.07Z"/>
                <path className="abc-267" d="M1271.79,854.42c.49,1.33,1.03,2.63,1.62,3.91.48,1.05,1,2.09,1.53,3.11.74.02,1.48.02,2.1.07.52.04,1.13.03,1.73.02-.49-1.04-.97-2.08-1.42-3.13-.56-1.28-1.08-2.57-1.57-3.88-.62,0-1.24.01-1.82-.02-.69-.04-1.44-.05-2.18-.09Z"/>
                <path className="abc-267" d="M1270.13,848.9c.11.48.23.97.35,1.44.38,1.4.81,2.75,1.3,4.08.74.03,1.49.05,2.18.09.58.03,1.2.03,1.82.02-.49-1.31-.93-2.64-1.31-4-.13-.46-.26-.92-.37-1.38-.6-.02-1.2-.05-1.8-.08-.72-.04-1.45-.1-2.17-.16Z"/>
                <path className="abc-367" d="M1269.49,845.87c.1.51.22,1.04.33,1.57.1.49.2.98.31,1.46.72.07,1.44.12,2.17.16.6.04,1.2.06,1.8.08-.12-.46-.23-.93-.34-1.4-.12-.54-.23-1.06-.33-1.57-.6-.03-1.19-.07-1.79-.11-.72-.06-1.44-.12-2.15-.2Z"/>
                <path className="abc-36" d="M1269,842.75c.06.53.14,1.13.21,1.62.07.48.17.98.27,1.49.72.07,1.43.14,2.15.2.6.05,1.19.08,1.79.11-.1-.51-.19-1.01-.26-1.48-.04-.3-.09-.62-.13-.98-.61-.13-1.22-.28-1.83-.43-.74-.18-1.47-.36-2.2-.53Z"/>
                <path className="abc-269" d="M1268.21,624.9c0,47.86.01,96.44.06,137.15.02,16.45.1,31.59.04,44.86-.06,13.55-.39,25.19.51,34.19.05.51.12,1.13.18,1.65.73.17,1.47.35,2.2.53.61.15,1.22.29,1.83.43-.04-.36-.08-.71-.12-1.07-.9-9.05-.58-20.75-.6-34.37-.02-13.19-.05-28.2-.06-44.5-.02-40.91-.04-89.75-.04-137.9-.61-.15-1.22-.36-1.83-.57-.73-.12-1.46-.27-2.19-.41Z"/>
                <path className="abc-195" d="M1268.25,427.97c0,2.18,0,4.36,0,6.54,0,35.84-.05,112.05-.04,190.4.73.14,1.46.29,2.19.41.6.21,1.22.42,1.83.57,0-78.55,0-155.21,0-191.25,0-2.19,0-4.38,0-6.57-.6-.02-1.2-.05-1.8-.05-.72,0-1.45-.02-2.17-.05Z"/>
                <path className="abc-319" d="M1268.25,417.13c0,1.43,0,2.86,0,4.3,0,2.18,0,4.36,0,6.54.72.02,1.45.05,2.17.05.6,0,1.2.03,1.8.05,0-2.19,0-4.38,0-6.57,0-1.44,0-2.88,0-4.32-.6-.01-1.2-.02-1.8-.03-.72,0-1.45,0-2.17-.02Z"/>
                <path className="abc-400" d="M1268.25,412.23v.6c0,1.43,0,2.86,0,4.3.72,0,1.45.02,2.17.02.6,0,1.2.01,1.8.03v-4.93c-.6,0-1.2,0-1.8-.01-.72,0-1.45,0-2.17,0Z"/>
                <path className="abc-88" d="M1268.25,411.63v.6c.72,0,1.45,0,2.17,0,.6,0,1.2,0,1.8.01v-.61c-.6,0-1.2,0-1.8,0-.72,0-1.45,0-2.17,0Z"/>
                <path className="abc-272" d="M1282.04,873.98c.32.31.63.61.92.89.17.03.34.06.5.09.35.06.69.11,1.02.16-.23-.27-.48-.55-.75-.85-.37-.06-.75-.12-1.14-.19-.19-.03-.37-.07-.55-.1Z"/>
                <path className="abc-183" d="M1280.24,872.23c.27.27.53.53.79.78.35.34.68.66,1,.98.18.04.37.07.55.1.39.07.77.13,1.14.19-.27-.3-.55-.62-.83-.95-.21-.25-.44-.5-.66-.76-.44-.06-.88-.14-1.34-.21-.22-.04-.43-.08-.64-.12Z"/>
                <path className="abc-11" d="M1278.82,870.76c.21.22.41.43.62.65.27.28.54.55.81.82.21.04.42.08.64.12.46.08.91.15,1.34.21-.23-.26-.46-.53-.68-.81-.17-.21-.35-.42-.53-.64-.49-.07-.98-.14-1.49-.23-.24-.04-.48-.09-.71-.13Z"/>
                <path className="abc-457" d="M1277.78,869.62c.14.16.28.31.43.47.21.22.41.45.62.66.23.05.47.09.71.13.51.09,1,.16,1.49.23-.17-.22-.36-.43-.53-.65-.12-.15-.24-.31-.36-.46-.53-.07-1.06-.15-1.59-.24-.26-.04-.51-.09-.76-.14Z"/>
                <path className="abc-118" d="M1276.81,868.48c.18.22.36.45.54.67.14.16.28.32.42.48.25.05.51.09.76.14.54.09,1.06.17,1.59.24-.12-.16-.24-.31-.35-.47-.15-.23-.3-.46-.46-.7-.58-.06-1.16-.14-1.7-.23-.26-.04-.54-.09-.81-.13Z"/>
                <path className="abc-214" d="M1274.96,866.04c.43.59.87,1.18,1.32,1.77.17.22.35.45.53.67.27.04.55.09.81.13.55.09,1.13.16,1.7.23-.15-.23-.3-.46-.45-.7-.39-.61-.77-1.21-1.14-1.82-.66-.04-1.32-.09-1.88-.18-.27-.04-.58-.07-.89-.1Z"/>
                <path className="abc-4" d="M1271.85,861.23c.58,1.02,1.2,2.02,1.86,3.02.4.6.81,1.2,1.24,1.79.31.03.62.05.89.1.56.09,1.22.14,1.88.18-.37-.61-.74-1.22-1.1-1.83-.59-1.01-1.16-2.02-1.7-3.05-.74-.02-1.47-.05-2.09-.14-.29-.04-.65-.05-1-.07Z"/>
                <path className="abc-39" d="M1268.57,854.14c.49,1.36,1.04,2.68,1.65,3.97.5,1.06,1.04,2.1,1.63,3.12.35.01.7.02,1,.07.61.09,1.35.12,2.09.14-.54-1.03-1.05-2.06-1.53-3.11-.59-1.28-1.13-2.58-1.62-3.91-.74-.03-1.48-.08-2.16-.17-.33-.04-.69-.07-1.05-.1Z"/>
                <path className="abc-415" d="M1266.95,848.5c.11.48.23.97.35,1.44.36,1.45.79,2.84,1.28,4.2.37.04.73.06,1.05.1.68.09,1.42.14,2.16.17-.49-1.33-.93-2.69-1.3-4.08-.13-.47-.24-.96-.35-1.44-.72-.07-1.44-.15-2.15-.24-.34-.04-.69-.1-1.03-.16Z"/>
                <path className="abc-131" d="M1266.33,845.48c.1.51.21,1.04.31,1.57.09.48.2.98.31,1.46.35.06.69.12,1.03.16.71.09,1.43.17,2.15.24-.11-.48-.21-.97-.31-1.46-.11-.53-.22-1.06-.33-1.57-.72-.07-1.43-.16-2.14-.25-.34-.04-.68-.09-1.02-.14Z"/>
                <path className="abc-372" d="M1265.83,842.19c.07.6.15,1.19.23,1.78.07.49.17.99.27,1.5.34.05.68.09,1.02.14.71.09,1.42.18,2.14.25-.1-.51-.2-1.01-.27-1.49-.07-.49-.15-1.09-.21-1.62-.73-.17-1.45-.32-2.16-.41-.34-.04-.68-.1-1.01-.15Z"/>
                <path className="abc-161" d="M1264.99,624.51c.02,47.84.06,96.48.12,137.14,0,1.59,0,3.16,0,4.73.03,14.99.1,28.82.05,41.01,0,1.22-.01,2.42-.02,3.61-.06,11.51-.28,21.5.5,29.4.06.6.12,1.19.19,1.79.34.05.67.1,1.01.15.71.1,1.43.25,2.16.41-.06-.53-.13-1.15-.18-1.65-.9-9-.57-20.63-.51-34.19.06-13.28-.03-28.41-.04-44.86-.04-40.71-.05-89.28-.06-137.15-.73-.14-1.45-.27-2.15-.35-.35-.01-.71-.03-1.07-.04Z"/>
                <path className="abc-168" d="M1264.96,427.91c0,2.17,0,4.35,0,6.52,0,35.72,0,111.85.03,190.08.36.02.71.03,1.07.04.7.08,1.42.21,2.15.35,0-78.35.03-154.55.04-190.4,0-2.18,0-4.36,0-6.54-.72-.02-1.45-.05-2.17-.05-.37,0-.75,0-1.12-.01Z"/>
                <path className="abc-281" d="M1264.96,417.11c0,1.43,0,2.85,0,4.28,0,2.17,0,4.35,0,6.52.37,0,.75,0,1.12.01.72,0,1.45.02,2.17.05,0-2.18,0-4.36,0-6.54,0-1.43,0-2.86,0-4.3-.72,0-1.45-.02-2.17-.02-.37,0-.75,0-1.12,0Z"/>
                <path className="abc-200" d="M1264.96,412.23v4.88c.38,0,.75,0,1.12,0,.72,0,1.45,0,2.17.02,0-1.43,0-2.86,0-4.3v-.6c-.72,0-1.45,0-2.17,0-.37,0-.75,0-1.12,0Z"/>
                <path className="abc-346" d="M1264.96,411.63v.6c.38,0,.75,0,1.12,0,.72,0,1.45,0,2.17,0v-.6c-.72,0-1.45,0-2.17,0-.37,0-.75,0-1.12,0Z"/>
                <path className="abc-157" d="M1280.89,873.75c.36.32.7.63,1.03.92.18.04.36.07.54.11.17.03.34.07.51.1-.29-.28-.6-.57-.92-.89-.18-.04-.37-.07-.56-.11-.2-.04-.39-.08-.59-.13Z"/>
                <path className="abc-234" d="M1278.93,871.94c.29.27.58.54.86.8.38.35.75.68,1.1,1,.2.04.39.09.59.13.19.04.38.08.56.11-.32-.31-.66-.64-1-.98-.26-.25-.52-.51-.79-.78-.21-.04-.42-.09-.64-.13-.23-.05-.45-.1-.67-.15Z"/>
                <path className="abc-91" d="M1277.38,870.45c.22.22.45.44.67.66.29.29.59.56.88.84.22.05.44.1.67.15.22.05.43.09.64.13-.27-.27-.54-.54-.81-.82-.21-.21-.41-.43-.62-.65-.23-.05-.47-.1-.71-.15-.25-.05-.49-.11-.73-.17Z"/>
                <path className="abc-187" d="M1276.24,869.3c.16.16.31.32.47.48.22.23.45.45.67.67.24.06.48.11.73.17.24.05.48.1.71.15-.21-.22-.41-.44-.62-.66-.14-.16-.28-.31-.43-.47-.25-.05-.5-.1-.76-.15-.26-.06-.52-.11-.78-.18Z"/>
                <path className="abc-177" d="M1275.18,868.16c.2.22.39.43.59.65.15.16.31.32.46.48.26.06.52.12.78.18.25.05.51.11.76.15-.14-.16-.28-.32-.42-.48-.18-.22-.36-.45-.54-.67-.27-.04-.54-.09-.8-.15-.27-.06-.55-.11-.83-.17Z"/>
                <path className="abc-148" d="M1273.16,865.78c.46.58.95,1.16,1.45,1.73.19.22.38.44.58.65.28.06.56.11.83.17.26.06.53.1.8.15-.18-.22-.36-.45-.53-.67-.46-.59-.9-1.17-1.32-1.77-.31-.03-.62-.06-.89-.12-.28-.06-.6-.1-.91-.14Z"/>
                <path className="abc-20" d="M1269.81,861.02c.62,1.02,1.29,2.02,2,3,.43.59.88,1.18,1.35,1.76.32.04.64.08.91.14.27.06.58.09.89.12-.43-.59-.84-1.19-1.24-1.79-.66-.99-1.28-1.99-1.86-3.02-.35-.01-.71-.04-1-.1-.31-.07-.67-.09-1.04-.12Z"/>
                <path className="abc-90" d="M1266.39,853.82c.5,1.4,1.07,2.75,1.7,4.05.52,1.07,1.1,2.12,1.72,3.14.36.02.73.05,1.04.12.3.06.65.08,1,.1-.58-1.02-1.12-2.06-1.63-3.12-.61-1.29-1.16-2.61-1.65-3.97-.37-.04-.74-.08-1.07-.15-.35-.08-.73-.12-1.11-.17Z"/>
                <path className="abc-148" d="M1264.82,848.09c.1.46.19.91.3,1.38.35,1.5.77,2.95,1.27,4.35.38.04.76.09,1.11.17.34.07.71.12,1.07.15-.49-1.36-.92-2.76-1.28-4.2-.12-.47-.24-.96-.35-1.44-.35-.06-.7-.13-1.05-.19-.36-.07-.72-.14-1.08-.21Z"/>
                <path className="abc-24" d="M1264.28,845.16c.09.51.19,1.03.28,1.56.08.46.16.9.26,1.37.36.07.72.14,1.08.21.35.07.7.13,1.05.19-.11-.48-.21-.97-.31-1.46-.1-.53-.21-1.05-.31-1.57-.34-.05-.67-.1-1.01-.15-.35-.05-.69-.11-1.04-.16Z"/>
                <path className="abc-212" d="M1263.84,842.12c.06.52.13,1.03.2,1.55.07.49.15.99.24,1.5.34.06.69.11,1.04.16.34.05.67.1,1.01.15-.1-.51-.2-1.01-.27-1.5-.08-.59-.16-1.19-.23-1.78-.34-.05-.67-.11-1-.16-.34-.05-.67.02-.99.08Z"/>
                <path className="abc-432" d="M1262.84,631.65c.06,55.81.14,109.55.2,140.49,0,3.07.01,5.96.02,8.65.05,14.78.06,26.76.1,36.29.03,10.16-.04,17.97.5,23.5.05.52.11,1.03.17,1.55.32-.06.65-.13.99-.08.33.05.66.1,1,.16-.07-.6-.13-1.19-.19-1.79-.78-7.91-.56-17.9-.5-29.4,0-1.19.01-2.39.02-3.61.05-12.2-.02-26.02-.05-41.01,0-1.56,0-3.14,0-4.73-.06-40.66-.09-89.3-.12-137.14-.36-.02-.71-.03-1.07-.05-.37,1.08-.73,4.13-1.08,7.19Z"/>
                <path className="abc-440" d="M1262.67,426.17c0,2.18,0,4.46,0,6.82v.8c0,21.78.08,112.15.17,197.86.35-3.06.71-6.11,1.08-7.19.35.02.71.03,1.07.05-.04-78.23-.03-154.36-.03-190.08,0-2.17,0-4.35,0-6.52-.37,0-.75,0-1.12,0-.39,0-.78-.87-1.16-1.73Z"/>
                <path className="abc-200" d="M1262.67,415.97v3.96c0,1.97,0,4.05,0,6.24.39.86.77,1.73,1.16,1.73.38,0,.75,0,1.12,0,0-2.17,0-4.35,0-6.52,0-1.43,0-2.85,0-4.28-.38,0-.75,0-1.13,0-.39,0-.78-.57-1.16-1.14Z"/>
                <path className="abc-434" d="M1262.67,412.06v3.91c.39.57.77,1.14,1.16,1.14.38,0,.75,0,1.13,0v-4.88c-.38,0-.75,0-1.13,0-.39,0-.78-.08-1.16-.17Z"/>
                <path className="abc-108" d="M1262.67,411.63v.43c.39.08.77.17,1.16.17.38,0,.75,0,1.13,0v-.6c-.38,0-.75,0-1.13,0-.39,0-.78,0-1.16,0Z"/>
                <path className="abc-266" d="M1279.16,873.33c.38.33.76.65,1.1.95.37.09.74.18,1.1.26.18.04.36.08.54.12-.33-.29-.67-.6-1.03-.92-.2-.04-.39-.09-.59-.14-.38-.09-.75-.18-1.13-.28Z"/>
                <path className="abc-64" d="M1277.04,871.45c.31.28.63.56.93.83.41.36.81.71,1.19,1.05.38.1.75.19,1.13.28.2.05.4.09.59.14-.35-.32-.72-.66-1.1-1-.28-.26-.57-.53-.86-.8-.22-.05-.44-.11-.67-.16-.41-.1-.82-.21-1.22-.33Z"/>
                <path className="abc-2" d="M1275.37,869.91c.24.23.48.45.72.67.32.29.64.58.95.87.41.12.81.23,1.22.33.23.06.45.11.67.16-.29-.27-.58-.55-.88-.84-.22-.22-.45-.44-.67-.66-.24-.06-.48-.12-.73-.18-.43-.11-.86-.23-1.29-.35Z"/>
                <path className="abc-149" d="M1274.15,868.74c.16.16.33.32.49.48.24.23.48.46.72.69.43.13.86.25,1.29.35.25.06.49.12.73.18-.22-.22-.45-.45-.67-.67-.16-.16-.31-.32-.47-.48-.26-.06-.51-.13-.77-.19-.44-.11-.88-.23-1.31-.36Z"/>
                <path className="abc-108" d="M1273.05,867.63c.2.21.4.42.61.63.16.16.33.32.49.49.44.13.88.25,1.31.36.26.07.52.13.77.19-.16-.16-.31-.32-.46-.48-.2-.22-.4-.43-.59-.65-.28-.06-.56-.12-.82-.18-.44-.11-.88-.23-1.31-.35Z"/>
                <path className="abc-118" d="M1270.99,865.32c.47.56.96,1.13,1.47,1.68.2.21.39.42.59.63.43.12.87.23,1.31.35.26.07.54.13.82.18-.2-.22-.39-.44-.58-.65-.5-.57-.98-1.15-1.45-1.73-.32-.04-.63-.08-.91-.15-.43-.11-.84-.2-1.26-.31Z"/>
                <path className="abc-421" d="M1267.66,860.65c.61,1.01,1.27,1.99,1.98,2.95.43.58.88,1.16,1.35,1.72.41.1.83.2,1.26.31.27.07.59.11.91.15-.46-.58-.91-1.17-1.35-1.76-.71-.98-1.38-1.98-2-3-.36-.02-.72-.05-1.02-.11-.38-.09-.76-.17-1.13-.26Z"/>
                <path className="abc-280" d="M1264.35,853.5c.47,1.39,1.01,2.74,1.63,4.03.51,1.06,1.07,2.1,1.67,3.11.37.09.75.17,1.13.26.3.06.66.09,1.02.11-.62-1.02-1.19-2.07-1.72-3.14-.64-1.3-1.21-2.66-1.7-4.05-.38-.04-.75-.08-1.08-.14-.33-.06-.64-.12-.96-.18Z"/>
                <path className="abc-339" d="M1262.88,847.79c.08.45.18.9.27,1.36.33,1.51.72,2.96,1.2,4.35.32.06.63.12.96.18.33.06.71.1,1.08.14-.5-1.4-.92-2.85-1.27-4.35-.11-.47-.2-.92-.3-1.38-.36-.07-.71-.14-1.06-.2-.3-.05-.59-.08-.88-.11Z"/>
                <path className="abc-36" d="M1262.41,844.89c.07.53.14,1.04.23,1.57.07.44.15.89.24,1.34.29.03.59.06.88.11.35.06.7.13,1.06.2-.1-.46-.18-.91-.26-1.37-.1-.53-.19-1.05-.28-1.56-.34-.06-.69-.11-1.03-.17-.28-.05-.56-.08-.84-.1Z"/>
                <path className="abc-246" d="M1262.02,841.81c.06.51.13,1.03.19,1.54.07.51.13,1.02.2,1.54.28.03.56.06.84.1.34.06.68.12,1.03.17-.09-.51-.17-1.01-.24-1.5-.07-.52-.14-1.03-.2-1.55-.32.06-.65.12-.98.07-.27-.05-.56-.21-.84-.38Z"/>
                <path className="abc-233" d="M1260.98,631.44c.07,53.76.14,105.58.2,136.88,0,4.88,0,9.4-.03,13.5-.03,29.43-.29,48.25.7,58.44.05.52.11,1.03.17,1.54.28.17.56.34.84.38.33.05.66,0,.98-.07-.06-.52-.12-1.03-.17-1.55-.54-5.52-.47-13.34-.5-23.5-.03-9.53-.05-21.51-.1-36.29,0-2.69-.01-5.58-.02-8.65-.07-30.94-.14-84.67-.2-140.49-.35,3.06-.7,6.11-1.07,7.18-.26-1.4-.53-4.39-.79-7.39Z"/>
                <path className="abc-161" d="M1260.78,426.14c0,2.18,0,4.45,0,6.8v.8c0,21.73.1,112.05.2,197.71.27,2.99.54,5.99.79,7.39.36-1.07.71-4.13,1.07-7.18-.1-85.71-.17-176.08-.17-197.86v-.8c0-2.35,0-4.63,0-6.82-.39-.86-.77-1.73-1.16-1.73-.24,0-.49.84-.73,1.69Z"/>
                <path className="abc-367" d="M1260.78,415.96c0,1.24,0,2.56,0,3.95,0,1.96,0,4.04,0,6.22.24-.85.49-1.7.73-1.69.38,0,.77.86,1.16,1.73,0-2.18,0-4.27,0-6.24v-3.96c-.39-.57-.77-1.14-1.16-1.14-.25,0-.49.56-.73,1.13Z"/>
                <path className="abc-428" d="M1260.78,412.07v.45c0,1.06,0,2.21,0,3.45.24-.57.49-1.13.73-1.13.38,0,.77.57,1.16,1.14v-3.91c-.39-.08-.77-.17-1.16-.17-.25,0-.49.08-.73.17Z"/>
                <path className="abc-371" d="M1260.78,411.63v.43c.24-.08.49-.17.73-.17.38,0,.77.08,1.16.17v-.43c-.39,0-.77,0-1.16,0-.25,0-.49,0-.73,0Z"/>
                <path className="abc-121" d="M1277.04,872.7c.41.35.8.68,1.15.99.32.1.63.2.95.29.38.11.76.21,1.13.31-.35-.3-.72-.62-1.1-.95-.38-.1-.76-.21-1.15-.32-.32-.1-.65-.2-.97-.3Z"/>
                <path className="abc-399" d="M1274.8,870.75c.33.29.66.58.98.86.43.37.85.74,1.26,1.09.33.11.65.21.97.3.39.12.77.22,1.15.32-.38-.33-.79-.68-1.19-1.05-.3-.27-.62-.55-.93-.83-.41-.12-.81-.24-1.22-.37-.34-.1-.68-.22-1.01-.33Z"/>
                <path className="abc-238" d="M1273.05,869.17c.25.23.5.46.75.69.33.3.66.6,1,.89.34.12.68.23,1.01.33.41.13.82.25,1.22.37-.31-.28-.63-.57-.95-.87-.24-.22-.48-.45-.72-.67-.43-.13-.86-.26-1.28-.39-.35-.11-.69-.23-1.04-.35Z"/>
                <path className="abc-234" d="M1271.8,867.99c.17.16.34.32.51.48.24.23.49.46.74.7.35.12.69.24,1.04.35.42.13.85.27,1.28.39-.24-.23-.48-.46-.72-.69-.17-.16-.33-.32-.49-.48-.44-.13-.87-.26-1.3-.4-.35-.11-.7-.23-1.05-.35Z"/>
                <path className="abc-82" d="M1270.72,866.9c.19.2.39.41.59.6.16.16.33.32.49.48.35.12.7.24,1.05.35.43.14.86.27,1.3.4-.16-.16-.33-.32-.49-.49-.21-.21-.41-.42-.61-.63-.43-.12-.86-.25-1.29-.38-.35-.11-.7-.23-1.05-.34Z"/>
                <path className="abc-153" d="M1268.74,864.68c.44.54.91,1.08,1.4,1.61.19.2.38.41.58.61.35.12.7.23,1.05.34.43.14.86.26,1.29.38-.2-.21-.4-.42-.59-.63-.51-.55-1-1.11-1.47-1.68-.41-.1-.83-.21-1.24-.34-.34-.1-.68-.2-1.01-.3Z"/>
                <path className="abc-303" d="M1265.63,860.16c.56.98,1.17,1.93,1.84,2.86.41.56.83,1.12,1.28,1.66.33.1.66.2,1.01.3.41.13.83.23,1.24.34-.47-.56-.92-1.14-1.35-1.72-.71-.96-1.37-1.95-1.98-2.95-.37-.09-.75-.17-1.12-.26-.31-.08-.61-.15-.91-.23Z"/>
                <path className="abc-232" d="M1262.61,853.21c.42,1.35.91,2.66,1.48,3.93.47,1.04.97,2.04,1.53,3.02.3.08.6.15.91.23.37.09.75.18,1.12.26-.61-1.01-1.17-2.05-1.67-3.11-.62-1.29-1.16-2.64-1.63-4.03-.32-.06-.63-.11-.95-.15-.26-.04-.53-.09-.79-.14Z"/>
                <path className="abc-120" d="M1261.31,847.7c.07.44.15.88.24,1.33.29,1.44.64,2.84,1.07,4.19.26.05.52.1.79.14.32.04.63.1.95.15-.47-1.39-.87-2.85-1.2-4.35-.1-.46-.19-.91-.27-1.36-.29-.03-.58-.05-.87-.06-.24-.01-.47-.02-.7-.03Z"/>
                <path className="abc-401" d="M1260.91,844.76c.06.56.12,1.11.19,1.62.06.43.13.87.2,1.31.23,0,.47.02.7.03.29.02.58.04.87.06-.08-.45-.16-.9-.24-1.34-.09-.52-.16-1.04-.23-1.57-.28-.03-.55-.05-.83-.08-.23-.03-.45-.04-.67-.05Z"/>
                <path className="abc-389" d="M1260.55,841.31c.06.59.13,1.18.2,1.76.06.56.11,1.13.17,1.7.22.01.44.02.67.05.27.03.55.05.83.08-.07-.53-.13-1.03-.2-1.54-.07-.51-.13-1.03-.19-1.54-.28-.17-.56-.34-.82-.39-.22-.04-.44-.08-.65-.11Z"/>
                <path className="abc-226" d="M1259.57,624.56c.04,47.23.07,94.87.12,135.18.04,33.59-.88,61.9.68,79.79.05.59.12,1.19.18,1.78.21.03.43.06.65.11.26.05.54.22.82.39-.06-.51-.12-1.03-.17-1.54-.99-10.18-.73-29-.7-58.44.02-4.1.04-8.62.03-13.5-.06-31.29-.13-83.12-.2-136.88-.27-2.99-.53-5.98-.78-7.37-.22.49-.43.58-.63.49Z"/>
                <path className="abc-43" d="M1259.46,427.88c0,2.17,0,4.34,0,6.5.01,35.59.05,112.09.11,190.18.2.09.41,0,.63-.49.25,1.38.52,4.37.78,7.37-.1-85.65-.19-175.97-.2-197.71v-.8c0-2.35,0-4.62,0-6.8-.24.85-.49,1.71-.72,1.73-.2.02-.4.02-.6.01Z"/>
                <path className="abc-43" d="M1259.46,417.11c0,1.42,0,2.85,0,4.27,0,2.17,0,4.34,0,6.5.2,0,.4,0,.6-.01.24-.02.48-.88.72-1.73,0-2.18,0-4.26,0-6.22,0-1.4,0-2.71,0-3.95-.24.57-.49,1.13-.73,1.14-.2,0-.4,0-.59,0Z"/>
                <path className="abc-140" d="M1259.46,412.23v.6c0,1.42,0,2.85,0,4.27.2,0,.4,0,.59,0,.24,0,.48-.57.73-1.14,0-1.24,0-2.39,0-3.45v-.45c-.24.08-.49.17-.73.17-.2,0-.4,0-.59,0Z"/>
                <path className="abc-271" d="M1259.46,411.63v.6c.2,0,.4,0,.59,0,.24,0,.48-.08.73-.17v-.43c-.24,0-.49,0-.73,0-.2,0-.4,0-.59,0Z"/>
                <path className="abc-41" d="M1274.92,871.93c.42.36.83.71,1.2,1.04.37.14.75.28,1.12.41.32.11.64.22.96.32-.36-.31-.75-.64-1.15-.99-.33-.11-.66-.22-.98-.34-.38-.14-.76-.28-1.14-.43Z"/>
                <path className="abc-419" d="M1272.62,869.92c.34.3.68.6,1,.88.44.38.88.76,1.3,1.13.38.15.76.3,1.14.43.33.12.66.23.98.34-.41-.35-.83-.71-1.26-1.09-.32-.28-.65-.57-.98-.86-.34-.12-.68-.24-1.02-.37-.39-.15-.78-.3-1.17-.46Z"/>
                <path className="abc-70" d="M1270.84,868.32c.25.23.51.47.76.69.33.3.67.61,1.01.91.39.16.78.32,1.17.46.34.13.68.25,1.02.37-.33-.29-.67-.59-1-.89-.25-.23-.5-.46-.75-.69-.35-.12-.69-.25-1.03-.38-.4-.15-.79-.31-1.18-.47Z"/>
                <path className="abc-16" d="M1269.58,867.15c.17.16.34.32.51.48.24.23.5.46.75.69.39.16.78.32,1.18.47.34.13.69.26,1.03.38-.25-.23-.5-.47-.74-.7-.17-.16-.34-.32-.51-.48-.35-.12-.69-.25-1.04-.38-.4-.15-.79-.3-1.18-.46Z"/>
                <path className="abc-213" d="M1268.53,866.12c.18.19.37.38.56.56.16.15.33.31.49.47.39.16.78.31,1.18.46.34.13.69.26,1.04.38-.17-.16-.33-.32-.49-.48-.2-.2-.4-.4-.59-.6-.35-.12-.69-.23-1.03-.36-.39-.14-.78-.28-1.16-.43Z"/>
                <path className="abc-18" d="M1266.68,864.03c.42.52.85,1.03,1.31,1.52.18.19.36.38.54.57.38.15.77.29,1.16.43.34.12.68.24,1.03.36-.19-.2-.39-.41-.58-.61-.49-.53-.95-1.06-1.4-1.61-.33-.1-.65-.2-.97-.3-.37-.12-.73-.23-1.09-.35Z"/>
                <path className="abc-123" d="M1263.74,859.63c.53.96,1.11,1.9,1.74,2.8.38.55.78,1.08,1.2,1.6.36.12.72.24,1.09.35.32.1.64.2.97.3-.44-.54-.87-1.1-1.28-1.66-.67-.93-1.28-1.88-1.84-2.86-.3-.08-.59-.16-.89-.24-.34-.09-.67-.19-1-.29Z"/>
                <path className="abc-7" d="M1260.96,852.87c.38,1.3.82,2.56,1.35,3.79.43,1.01.91,2.01,1.44,2.97.33.1.66.19,1,.29.29.08.59.16.89.24-.56-.98-1.07-1.98-1.53-3.02-.57-1.26-1.06-2.58-1.48-3.93-.26-.05-.52-.1-.78-.15-.3-.05-.59-.12-.88-.19Z"/>
                <path className="abc-32" d="M1259.83,847.61c.06.43.13.86.2,1.29.24,1.35.55,2.67.92,3.97.29.07.58.14.88.19.26.05.51.1.78.15-.42-1.35-.77-2.75-1.07-4.19-.09-.45-.17-.89-.24-1.33-.23-.01-.46-.02-.69-.03-.26-.01-.53-.03-.78-.05Z"/>
                <path className="abc-271" d="M1259.51,844.66c.05.6.1,1.17.16,1.67.05.42.1.85.16,1.28.26.02.52.04.78.05.23.01.46.02.69.03-.07-.44-.14-.88-.2-1.31-.08-.51-.14-1.06-.19-1.62-.22-.01-.44-.02-.66-.05-.25-.03-.5-.04-.75-.06Z"/>
                <path className="abc-57" d="M1259.22,841.13c.05.57.1,1.12.14,1.66.05.63.09,1.27.14,1.87.25.02.49.03.75.06.22.03.44.03.66.05-.06-.56-.11-1.13-.17-1.7-.07-.58-.14-1.17-.2-1.76-.21-.03-.42-.06-.62-.09-.24-.04-.47-.07-.7-.1Z"/>
                <path className="abc-279" d="M1258.27,623.8c.02,46.88.04,94.58.07,134.7.02,34.04-.47,62.8.76,80.89.04.59.08,1.17.13,1.73.23.03.46.06.7.1.21.03.41.06.62.09-.06-.59-.13-1.19-.18-1.78-1.56-17.88-.64-46.2-.68-79.79-.05-40.31-.09-87.96-.12-135.18-.2-.09-.4-.37-.61-.62-.24-.1-.47-.14-.69-.14Z"/>
                <path className="abc-142" d="M1258.2,427.85c0,2.16,0,4.32,0,6.48,0,35.56.03,111.41.06,189.47.23,0,.46.04.69.14.21.25.4.53.61.62-.06-78.09-.09-154.59-.11-190.18,0-2.17,0-4.34,0-6.5-.2,0-.39-.02-.59-.02-.23,0-.45-.01-.67-.01Z"/>
                <path className="abc-74" d="M1258.2,417.1c0,1.42,0,2.84,0,4.26,0,2.16,0,4.32,0,6.48.22,0,.45,0,.67.01.2,0,.39.01.59.02,0-2.17,0-4.34,0-6.5,0-1.42,0-2.85,0-4.27-.2,0-.39,0-.59,0-.23,0-.45,0-.67,0Z"/>
                <path className="abc-175" d="M1258.2,412.24v4.86c.22,0,.45,0,.67,0,.19,0,.39,0,.59,0,0-1.42,0-2.85,0-4.27v-.6c-.2,0-.39,0-.59,0-.23,0-.45,0-.67,0Z"/>
                <path className="abc-178" d="M1258.2,411.64v.6c.22,0,.45,0,.67,0,.19,0,.39,0,.59,0v-.6c-.2,0-.39,0-.59,0-.23,0-.45,0-.67,0Z"/>
                <path className="abc-416" d="M1272.74,870.99c.43.37.84.73,1.22,1.06.34.16.69.31,1.03.45.38.16.75.31,1.13.45-.37-.32-.78-.67-1.2-1.04-.38-.15-.76-.31-1.14-.47-.35-.15-.69-.3-1.04-.46Z"/>
                <path className="abc-30" d="M1270.42,868.95c.34.3.68.6,1.01.89.44.39.89.78,1.31,1.15.34.16.69.31,1.04.46.38.16.76.32,1.14.47-.42-.36-.86-.75-1.3-1.13-.32-.29-.66-.58-1-.88-.39-.16-.78-.33-1.16-.5-.35-.15-.7-.31-1.04-.47Z"/>
                <path className="abc-373" d="M1268.64,867.35c.25.23.51.46.76.69.33.3.68.61,1.01.91.34.16.69.32,1.04.47.38.17.77.34,1.16.5-.34-.3-.68-.61-1.01-.91-.25-.23-.51-.46-.76-.69-.39-.16-.78-.33-1.16-.5-.35-.15-.69-.31-1.04-.47Z"/>
                <path className="abc-110" d="M1267.4,866.21c.17.15.33.31.5.46.24.22.49.45.74.68.34.16.69.31,1.04.47.38.17.77.34,1.16.5-.25-.23-.51-.47-.75-.69-.17-.16-.34-.32-.51-.48-.39-.16-.78-.32-1.16-.49-.35-.15-.69-.3-1.03-.46Z"/>
                <path className="abc-313" d="M1266.38,865.24c.17.17.34.34.52.51.16.15.32.3.49.46.34.15.68.31,1.03.46.38.16.77.33,1.16.49-.17-.16-.33-.32-.49-.47-.19-.18-.38-.37-.56-.56-.38-.15-.76-.3-1.13-.45-.34-.14-.68-.28-1.01-.43Z"/>
                <path className="abc-413" d="M1264.63,863.27c.4.5.81.98,1.24,1.45.17.18.33.35.51.52.33.15.67.29,1.01.43.37.15.75.3,1.13.45-.18-.19-.36-.38-.54-.57-.46-.49-.89-1-1.31-1.52-.36-.12-.72-.25-1.07-.38-.32-.12-.65-.25-.97-.38Z"/>
                <path className="abc-63" d="M1261.89,859.02c.49.94,1.03,1.84,1.62,2.71.36.53.73,1.04,1.13,1.54.32.13.64.26.97.38.36.14.71.26,1.07.38-.42-.52-.82-1.05-1.2-1.6-.63-.9-1.21-1.84-1.74-2.8-.33-.1-.65-.2-.98-.3-.29-.09-.59-.2-.88-.31Z"/>
                <path className="abc-71" d="M1259.37,852.46c.33,1.25.74,2.48,1.21,3.68.39.99.83,1.95,1.32,2.88.29.11.58.22.88.31.32.1.65.2.98.3-.53-.96-1.01-1.96-1.44-2.97-.52-1.23-.97-2.49-1.35-3.79-.29-.07-.57-.14-.85-.2-.25-.06-.5-.13-.75-.21Z"/>
                <path className="abc-27" d="M1258.4,847.41c.05.42.11.84.17,1.26.2,1.27.46,2.54.8,3.78.24.08.49.16.75.21.28.06.56.13.85.2-.38-1.3-.68-2.62-.92-3.97-.08-.43-.14-.87-.2-1.29-.26-.02-.51-.05-.76-.08-.23-.03-.45-.07-.67-.12Z"/>
                <path className="abc-422" d="M1258.14,844.49c.04.61.08,1.19.13,1.67.04.42.08.84.13,1.26.22.05.45.09.67.12.25.04.51.06.76.08-.06-.43-.11-.86-.16-1.28-.06-.5-.11-1.07-.16-1.67-.24-.02-.49-.03-.73-.07-.22-.04-.43-.07-.65-.1Z"/>
                <path className="abc-179" d="M1257.93,840.93c.03.55.06,1.06.09,1.57.04.7.08,1.38.12,1.99.21.03.43.06.65.1.24.04.48.06.73.07-.05-.6-.09-1.24-.14-1.87-.05-.54-.1-1.09-.14-1.66-.23-.03-.46-.06-.68-.1-.21-.03-.41-.07-.62-.1Z"/>
                <path className="abc-127" d="M1256.98,634.84c0,54.4.02,106.37.03,137.25,0,9.04-.01,16.76,0,22.83.01,13.46.28,33.31.84,44.32.03.58.05,1.14.08,1.68.2.04.41.07.62.1.23.04.45.07.68.1-.05-.57-.09-1.15-.13-1.73-1.23-18.09-.74-46.85-.76-80.89-.03-40.12-.05-87.83-.07-134.7-.23,0-.45.03-.68.05-.21,2.83-.41,6.91-.61,10.99Z"/>
                <path className="abc-282" d="M1256.95,425.17c0,1.42,0,2.82,0,4.24,0,24.51.02,117.93.03,205.43.2-4.08.4-8.16.61-10.99.23-.03.45-.06.68-.05-.03-78.05-.06-153.91-.06-189.47,0-2.16,0-4.32,0-6.48-.22,0-.44,0-.66,0-.2,0-.4-1.34-.59-2.68Z"/>
                <path className="abc-205" d="M1256.95,416.36c0,1.43,0,2.98,0,4.57,0,1.42,0,2.82,0,4.24.19,1.34.39,2.69.59,2.68.22,0,.44,0,.66,0,0-2.16,0-4.32,0-6.48,0-1.42,0-2.84,0-4.26-.22,0-.44,0-.66,0-.2,0-.39-.37-.59-.74Z"/>
                <path className="abc-96" d="M1256.95,412.07c0,.15,0,.3,0,.46,0,1.1,0,2.4,0,3.83.19.37.39.74.59.74.22,0,.44,0,.66,0v-4.86c-.22,0-.44,0-.66,0-.2,0-.39-.08-.59-.17Z"/>
                <path className="abc-188" d="M1256.95,411.64v.43c.19.08.39.17.59.17.22,0,.44,0,.66,0v-.6c-.22,0-.44,0-.66,0-.2,0-.39,0-.59,0Z"/>
                <path className="abc-234" d="M1271.03,870.15c.4.36.78.7,1.15,1.02.25.13.5.26.75.39.34.17.69.34,1.03.5-.38-.33-.8-.69-1.22-1.06-.34-.16-.69-.32-1.03-.49-.22-.11-.45-.23-.68-.35Z"/>
                <path className="abc-162" d="M1268.86,868.19c.32.29.64.58.95.86.42.37.83.74,1.22,1.1.23.12.45.24.68.35.34.17.68.33,1.03.49-.43-.37-.87-.76-1.31-1.15-.33-.29-.67-.59-1.01-.89-.34-.16-.68-.32-1.02-.49-.18-.09-.36-.18-.54-.27Z"/>
                <path className="abc-45" d="M1267.2,866.67c.23.22.46.44.7.65.31.29.64.58.95.87.18.09.36.18.54.27.34.16.68.33,1.02.49-.34-.3-.68-.61-1.01-.91-.25-.23-.51-.46-.76-.69-.34-.16-.68-.32-1.01-.48-.14-.07-.29-.14-.43-.21Z"/>
                <path className="abc-449" d="M1266.05,865.58c.15.15.31.3.47.44.23.21.46.43.69.65.14.07.28.14.43.21.33.16.67.32,1.01.48-.25-.23-.5-.46-.74-.68-.17-.16-.34-.31-.5-.46-.34-.15-.67-.31-1.01-.47-.11-.05-.23-.11-.34-.16Z"/>
                <path className="abc-109" d="M1265.07,864.63c.17.17.34.34.52.51.15.14.3.29.45.44.11.06.23.11.34.16.33.16.67.31,1.01.47-.17-.15-.33-.31-.49-.46-.18-.17-.35-.34-.52-.51-.33-.15-.67-.3-.99-.45-.1-.05-.21-.1-.31-.16Z"/>
                <path className="abc-409" d="M1263.34,862.65c.39.5.8.99,1.23,1.46.17.18.33.35.5.52.11.05.21.11.31.16.33.16.66.31.99.45-.17-.17-.34-.35-.51-.52-.43-.47-.85-.95-1.24-1.45-.32-.13-.64-.27-.96-.42-.11-.05-.22-.12-.34-.2Z"/>
                <path className="abc-332" d="M1260.64,858.41c.48.93,1.01,1.83,1.59,2.7.35.53.72,1.04,1.11,1.54.11.08.23.15.34.2.32.15.64.28.96.42-.4-.5-.77-1.01-1.13-1.54-.59-.87-1.13-1.77-1.62-2.71-.29-.11-.58-.23-.86-.35-.13-.05-.26-.15-.39-.26Z"/>
                <path className="abc-397" d="M1258.19,851.96c.32,1.22.71,2.42,1.17,3.6.38.97.81,1.92,1.28,2.85.13.11.26.21.39.26.28.12.57.24.86.35-.49-.94-.93-1.9-1.32-2.88-.47-1.2-.88-2.43-1.21-3.68-.24-.08-.49-.17-.73-.26-.15-.05-.3-.14-.45-.24Z"/>
                <path className="abc-355" d="M1257.26,847.05c.05.41.1.83.17,1.25.19,1.22.44,2.45.76,3.67.15.1.3.19.45.24.24.09.48.18.73.26-.33-1.25-.6-2.51-.8-3.78-.07-.42-.12-.84-.17-1.26-.22-.05-.44-.11-.66-.18-.16-.05-.32-.12-.48-.19Z"/>
                <path className="abc-420" d="M1257.01,844.19c.04.6.08,1.15.12,1.62.04.41.08.83.13,1.24.16.07.32.14.48.19.21.07.43.13.66.18-.05-.42-.09-.84-.13-1.26-.04-.48-.09-1.06-.13-1.67-.21-.03-.42-.07-.63-.13-.17-.04-.33-.1-.49-.17Z"/>
                <path className="abc-324" d="M1256.81,840.66c.03.55.05,1.07.09,1.59.04.68.08,1.34.12,1.94.16.06.33.12.49.17.21.06.42.1.63.13-.04-.61-.08-1.29-.12-1.99-.03-.51-.06-1.02-.09-1.57-.2-.03-.41-.07-.61-.12-.17-.04-.34-.09-.51-.15Z"/>
                <path className="abc-393" d="M1255.93,642.06c0,52.2.01,101.61.02,131.12,0,9.26,0,17.08.02,23.09.03,12.77.31,32.04.76,42.71.03.58.05,1.13.08,1.68.17.06.34.11.51.15.21.05.41.08.61.12-.03-.55-.05-1.1-.08-1.68-.55-11.01-.82-30.85-.84-44.32,0-6.08,0-13.8,0-22.83,0-30.89-.02-82.85-.03-137.25-.2,4.08-.4,8.16-.61,10.98-.15.7-.3-1.53-.45-3.77Z"/>
                <path className="abc-366" d="M1255.84,425.13c-.01,1.41-.02,2.83-.03,4.24-.11,17.31.1,65.02.11,121.39,0,29.09,0,60.67.01,91.3.15,2.24.29,4.47.45,3.77.21-2.83.41-6.91.61-10.98-.01-87.5-.03-180.92-.03-205.43,0-1.42,0-2.82,0-4.24-.19-1.34-.39-2.68-.58-2.67-.19.02-.36,1.32-.53,2.62Z"/>
                <path className="abc-210" d="M1255.98,416.32c-.03,1.43-.07,2.99-.09,4.57-.02,1.41-.03,2.83-.05,4.24.17-1.3.34-2.6.53-2.62.19-.02.38,1.32.58,2.67,0-1.42,0-2.82,0-4.24,0-1.59,0-3.14,0-4.57-.19-.37-.39-.74-.58-.74-.18,0-.29.34-.4.69Z"/>
                <path className="abc-143" d="M1255.89,412.06c.01.14.03.29.04.45.08,1.08.07,2.38.05,3.81.11-.35.21-.7.4-.69.19,0,.38.37.58.74,0-1.43,0-2.73,0-3.83,0-.16,0-.31,0-.46-.19-.08-.39-.17-.58-.17-.18,0-.33.07-.48.15Z"/>
                <path className="abc-325" d="M1255.84,411.65c.02.13.03.27.05.41.15-.08.31-.16.48-.15.19,0,.38.08.58.17v-.43c-.19,0-.39,0-.58,0-.18,0-.36,0-.53,0Z"/>
                <path className="abc-301" d="M1269.42,869.23c.34.32.66.64.98.92.34.21.68.41,1.02.6.25.14.5.28.75.42-.37-.32-.75-.66-1.15-1.02-.23-.12-.46-.25-.68-.37-.31-.17-.62-.35-.92-.54Z"/>
                <path className="abc-231" d="M1267.6,867.5c.27.26.53.52.79.75.35.32.69.65,1.03.97.31.19.62.37.92.54.23.13.45.25.68.37-.4-.36-.8-.73-1.22-1.1-.31-.28-.63-.57-.95-.86-.18-.09-.36-.19-.54-.28-.24-.13-.48-.27-.72-.4Z"/>
                <path className="abc-288" d="M1266.22,866.15c.19.2.39.4.59.58.26.24.53.51.79.77.24.14.48.27.72.4.18.1.36.19.54.28-.32-.29-.64-.58-.95-.87-.24-.22-.47-.44-.7-.65-.14-.07-.28-.14-.42-.21-.19-.1-.38-.2-.57-.3Z"/>
                <path className="abc-133" d="M1265.25,865.18c.13.13.26.27.39.4.19.18.38.38.57.58.19.1.38.2.57.3.14.07.28.14.42.21-.23-.22-.46-.44-.69-.65-.16-.15-.31-.3-.47-.44-.11-.06-.23-.11-.34-.17-.15-.08-.31-.15-.46-.23Z"/>
                <path className="abc-172" d="M1264.33,864.22c.18.19.36.37.54.56.13.12.25.26.38.39.15.08.3.15.46.23.11.06.23.11.34.17-.15-.15-.3-.29-.45-.44-.18-.17-.35-.34-.52-.51-.11-.05-.21-.11-.32-.17-.14-.08-.29-.16-.43-.24Z"/>
                <path className="abc-109" d="M1262.53,862.08c.41.53.83,1.06,1.28,1.57.17.2.34.38.52.57.14.08.29.16.43.24.11.06.21.11.32.17-.17-.17-.34-.34-.5-.52-.43-.47-.84-.96-1.23-1.46-.11-.08-.23-.16-.34-.23-.15-.09-.31-.22-.47-.34Z"/>
                <path className="abc-293" d="M1259.73,857.65c.49.95,1.04,1.88,1.64,2.79.36.55.75,1.1,1.15,1.63.16.13.32.25.47.34.11.07.23.15.34.23-.39-.5-.76-1.01-1.11-1.54-.58-.87-1.11-1.77-1.59-2.7-.13-.11-.26-.22-.39-.3-.17-.1-.35-.28-.52-.46Z"/>
                <path className="abc-386" d="M1257.18,851.19c.34,1.2.74,2.39,1.22,3.58.39.97.84,1.94,1.33,2.89.18.18.35.36.52.46.13.08.25.19.39.3-.48-.93-.9-1.88-1.28-2.85-.46-1.18-.85-2.38-1.17-3.6-.15-.1-.3-.2-.44-.29-.19-.12-.38-.3-.57-.48Z"/>
                <path className="abc-379" d="M1256.18,846.41c.06.4.12.8.19,1.2.21,1.18.48,2.38.81,3.58.19.18.38.36.57.48.14.09.29.2.44.29-.32-1.22-.57-2.44-.76-3.67-.06-.41-.12-.83-.17-1.25-.16-.07-.31-.15-.47-.24-.21-.12-.41-.25-.61-.39Z"/>
                <path className="abc-199" d="M1255.89,843.71c.04.55.09,1.07.14,1.52.04.39.09.79.15,1.19.2.14.4.27.61.39.15.09.31.17.47.24-.05-.41-.09-.83-.13-1.24-.04-.47-.08-1.03-.12-1.62-.16-.06-.32-.13-.48-.19-.21-.08-.43-.18-.64-.29Z"/>
                <path className="abc-330" d="M1255.64,840.24c.03.58.07,1.16.12,1.74.04.59.08,1.18.13,1.73.21.1.42.21.64.29.16.06.32.13.48.19-.04-.6-.08-1.26-.12-1.94-.03-.52-.06-1.04-.09-1.59-.17-.06-.34-.12-.5-.17-.22-.07-.45-.16-.67-.25Z"/>
                <path className="abc-417" d="M1254.96,630.72c-.01,44.87-.02,90.11,0,128.33,0,2.11,0,4.19,0,6.25.01,30.71-.11,56.49.59,73.21.02.58.05,1.16.09,1.74.22.09.44.18.67.25.16.05.33.11.5.17-.03-.55-.05-1.1-.08-1.68-.46-10.67-.73-29.94-.76-42.71-.02-6.01-.02-13.83-.02-23.09,0-29.5-.01-78.92-.02-131.12-.15-2.24-.29-4.48-.44-3.79-.19-2.6-.36-5.08-.53-7.55Z"/>
                <path className="abc-77" d="M1254.85,427.76c0,2.16-.01,4.32-.02,6.48-.06,24.23.15,67.44.14,117.2,0,25.23-.01,52.17-.02,79.28.17,2.47.33,4.94.53,7.55.15-.69.29,1.55.44,3.79,0-30.62,0-62.21-.01-91.3,0-56.38-.21-104.08-.11-121.39,0-1.41.02-2.83.03-4.24-.17,1.3-.34,2.6-.52,2.62-.18.02-.33.02-.47.02Z"/>
                <path className="abc-186" d="M1254.94,417.04c0,1.42-.05,2.84-.05,4.25-.01,2.16-.02,4.32-.03,6.47.14,0,.29,0,.47-.02.19-.02.35-1.32.52-2.62.01-1.41.03-2.83.05-4.24.01-1.58.06-3.13.09-4.57-.11.35-.21.7-.39.7-.21,0-.43.02-.65.02Z"/>
                <path className="abc-244" d="M1254.74,412.21c.03.19.05.4.07.61.11,1.39.14,2.81.13,4.22.22,0,.44-.02.65-.02.18,0,.28-.35.39-.7.03-1.43.03-2.74-.05-3.81-.01-.15-.02-.3-.04-.45-.15.08-.3.16-.47.16-.23,0-.46,0-.67,0Z"/>
                <path className="abc-369" d="M1254.63,411.65c.04.17.08.37.11.56.22,0,.44.01.67,0,.17,0,.32-.08.47-.16-.01-.14-.03-.28-.05-.41-.18,0-.35,0-.52,0-.23,0-.46,0-.69,0Z"/>
                <path className="abc-37" d="M1267.87,868.22c.28.28.56.55.83.79.23.17.46.33.7.48.33.23.67.44,1.01.65-.32-.28-.65-.59-.98-.92-.31-.19-.62-.38-.92-.58-.21-.14-.42-.28-.63-.43Z"/>
                <path className="abc-455" d="M1266.38,866.76c.21.22.42.43.63.63.29.27.57.55.85.83.21.15.42.29.63.43.3.2.61.39.92.58-.34-.32-.68-.66-1.03-.97-.26-.24-.53-.5-.79-.75-.24-.14-.48-.28-.72-.43-.17-.1-.33-.21-.5-.31Z"/>
                <path className="abc-81" d="M1265.27,865.62c.16.17.32.35.48.5.21.21.42.42.63.64.16.11.33.21.5.31.24.15.48.29.72.43-.27-.26-.53-.52-.79-.77-.2-.19-.39-.39-.59-.58-.19-.1-.37-.21-.56-.31-.13-.07-.26-.15-.39-.23Z"/>
                <path className="abc-276" d="M1264.49,864.78c.1.12.21.23.32.34.15.16.31.33.47.5.13.08.26.15.39.23.18.11.37.21.56.31-.19-.2-.38-.4-.57-.58-.13-.13-.26-.26-.39-.4-.15-.08-.3-.16-.45-.24-.1-.06-.21-.11-.31-.17Z"/>
                <path className="abc-445" d="M1263.61,863.8c.19.21.38.43.57.64.1.11.21.22.31.34.1.06.21.11.31.17.15.08.3.16.45.24-.13-.13-.26-.27-.38-.39-.18-.19-.36-.37-.54-.56-.14-.08-.29-.17-.43-.25-.1-.06-.2-.12-.29-.17Z"/>
                <path className="abc-223" d="M1261.74,861.47c.42.57.86,1.13,1.32,1.68.18.21.36.43.55.64.1.06.2.12.29.17.14.08.28.17.43.25-.18-.19-.35-.38-.52-.57-.45-.51-.87-1.04-1.28-1.57-.16-.13-.32-.26-.47-.36-.11-.07-.21-.16-.32-.24Z"/>
                <path className="abc-323" d="M1258.87,856.84c.51.98,1.07,1.95,1.68,2.91.37.58.77,1.16,1.19,1.72.11.09.22.17.32.24.15.1.31.23.47.36-.4-.53-.79-1.08-1.15-1.63-.6-.91-1.15-1.84-1.64-2.79-.18-.18-.35-.36-.51-.49-.11-.08-.23-.21-.35-.32Z"/>
                <path className="abc-22" d="M1256.26,850.32c.35,1.18.76,2.38,1.25,3.58.4.98.85,1.97,1.36,2.95.12.12.24.24.35.32.16.12.34.31.51.49-.49-.95-.94-1.91-1.33-2.89-.48-1.19-.88-2.38-1.22-3.58-.19-.18-.37-.37-.55-.52-.13-.1-.25-.23-.37-.35Z"/>
                <path className="abc-384" d="M1255.19,845.69c.06.37.14.75.21,1.13.22,1.14.5,2.31.85,3.5.12.13.25.25.37.35.18.15.36.33.55.52-.34-1.2-.61-2.39-.81-3.58-.07-.4-.13-.8-.19-1.2-.2-.14-.4-.28-.59-.43-.13-.1-.27-.2-.4-.3Z"/>
                <path className="abc-236" d="M1254.86,843.2c.05.48.1.94.16,1.37.05.37.11.74.17,1.11.13.1.26.2.4.3.19.14.39.29.59.43-.06-.4-.1-.8-.15-1.19-.05-.45-.1-.97-.14-1.52-.21-.1-.42-.21-.62-.3-.14-.06-.28-.14-.42-.21Z"/>
                <path className="abc-263" d="M1254.55,839.8c.04.63.1,1.27.16,1.92.04.5.09,1,.14,1.47.14.07.28.14.42.21.2.09.41.2.62.3-.04-.55-.09-1.13-.13-1.73-.05-.59-.09-1.16-.12-1.74-.22-.09-.44-.18-.65-.26-.15-.05-.29-.12-.44-.18Z"/>
                <path className="abc-220" d="M1254.03,623.19c0,48.5,0,97.82.02,138.71,0,1.9,0,3.78,0,5.64,0,29.51-.26,54.24.4,70.44.02.58.06,1.19.1,1.82.14.06.29.12.44.18.21.08.43.17.65.26-.03-.58-.06-1.16-.09-1.74-.7-16.72-.58-42.49-.59-73.21,0-2.06,0-4.15,0-6.25-.01-38.22,0-83.45,0-128.33-.17-2.47-.33-4.92-.51-7.47-.14-.04-.29-.05-.43-.06Z"/>
                <path className="abc-196" d="M1253.87,427.69c.01,2.15.04,4.31.05,6.46.1,35.38.11,111.15.11,189.04.14.01.29.03.43.06.18,2.55.34,5.01.51,7.47,0-27.11.01-54.06.02-79.28,0-49.76-.21-92.97-.14-117.2,0-2.16.01-4.32.02-6.48-.14,0-.28-.02-.44-.05-.17-.04-.36-.03-.54-.03Z"/>
                <path className="abc-94" d="M1253.97,416.91c0,1.46-.05,2.94-.07,4.32-.05,2.15-.04,4.3-.03,6.45.18,0,.37,0,.54.03.16.03.3.04.44.05,0-2.16.02-4.32.03-6.47,0-1.4.05-2.83.05-4.25-.22,0-.43,0-.62-.03-.15-.03-.25-.06-.34-.1Z"/>
                <path className="abc-8" d="M1253.66,412.15c.04.17.07.37.09.56.17,1.3.22,2.74.22,4.2.09.04.19.08.34.1.19.03.4.03.62.03,0-1.42-.01-2.83-.13-4.22-.02-.21-.04-.42-.07-.61-.22,0-.43-.02-.65-.03-.14,0-.29-.02-.44-.03Z"/>
                <path className="abc-410" d="M1253.52,411.65c.05.15.1.32.14.5.14,0,.29.02.44.03.22.01.43.03.65.03-.03-.19-.07-.39-.11-.56-.23,0-.45,0-.66,0-.15,0-.3,0-.45,0Z"/>
                <path className="abc-84" d="M1266.46,867.18c.23.22.46.44.69.65.29.23.57.46.86.68.23.17.46.34.69.51-.27-.24-.55-.51-.83-.79-.21-.15-.42-.3-.63-.45-.26-.19-.52-.39-.78-.6Z"/>
                <path className="abc-391" d="M1265.28,866c.16.17.32.34.5.5.23.22.46.45.69.67.26.2.52.4.78.6.21.15.42.3.63.45-.28-.28-.57-.57-.85-.83-.21-.2-.42-.41-.63-.63-.16-.11-.33-.22-.49-.33-.21-.14-.41-.29-.61-.43Z"/>
                <path className="abc-35" d="M1264.41,865.08c.12.14.25.28.38.41.17.17.32.34.49.51.2.15.41.29.61.43.16.11.33.22.49.33-.21-.22-.42-.43-.63-.64-.16-.16-.32-.33-.48-.5-.13-.08-.26-.15-.38-.23-.16-.1-.32-.2-.48-.31Z"/>
                <path className="abc-139" d="M1263.79,864.39c.08.09.16.19.25.28.12.13.25.27.37.41.16.1.32.21.48.31.13.08.25.16.38.23-.16-.17-.32-.35-.47-.5-.11-.11-.21-.22-.32-.34-.1-.06-.21-.11-.31-.17-.13-.07-.26-.14-.39-.22Z"/>
                <path className="abc-190" d="M1262.96,863.42c.19.23.39.47.59.69.08.09.16.18.25.28.13.07.26.14.39.22.1.06.21.11.31.17-.1-.12-.21-.23-.31-.34-.19-.21-.38-.42-.57-.64-.1-.06-.19-.12-.29-.17-.12-.07-.24-.14-.36-.21Z"/>
                <path className="abc-326" d="M1261.03,860.95c.43.6.88,1.19,1.36,1.78.18.23.37.46.57.69.12.07.24.14.36.21.1.06.19.11.29.17-.19-.21-.37-.43-.55-.64-.46-.55-.9-1.12-1.32-1.68-.11-.09-.21-.17-.32-.24-.13-.09-.26-.19-.39-.29Z"/>
                <path className="abc-237" d="M1258.1,856.14c.51,1,1.08,2,1.71,3,.38.6.79,1.21,1.22,1.8.13.1.26.21.39.29.1.07.21.15.32.24-.42-.57-.81-1.14-1.19-1.72-.62-.96-1.18-1.93-1.68-2.91-.12-.12-.23-.24-.34-.32-.14-.1-.28-.25-.42-.39Z"/>
                <path className="abc-293" d="M1255.44,849.58c.36,1.17.78,2.36,1.28,3.57.41.99.87,1.99,1.38,2.99.14.14.29.29.42.39.11.08.23.2.34.32-.51-.98-.96-1.96-1.36-2.95-.49-1.2-.9-2.39-1.25-3.58-.12-.13-.24-.25-.36-.34-.15-.12-.3-.26-.45-.39Z"/>
                <path className="abc-21" d="M1254.33,845.07c.07.36.15.72.23,1.09.24,1.11.53,2.26.89,3.43.15.13.3.28.45.39.12.09.24.22.36.34-.35-1.18-.63-2.35-.85-3.5-.07-.39-.15-.76-.21-1.13-.13-.1-.26-.2-.39-.29-.16-.12-.32-.23-.48-.33Z"/>
                <path className="abc-417" d="M1253.96,842.75c.06.42.12.83.18,1.25.06.36.12.7.19,1.06.16.1.31.21.48.33.13.09.26.19.39.29-.06-.37-.12-.74-.17-1.11-.06-.44-.11-.9-.16-1.37-.14-.07-.27-.14-.41-.2-.17-.08-.33-.16-.5-.24Z"/>
                <path className="abc-299" d="M1253.61,839.43c.05.66.12,1.36.2,2.06.04.42.09.84.15,1.26.16.08.33.17.5.24.13.06.27.13.41.2-.05-.48-.1-.97-.14-1.47-.07-.65-.12-1.3-.16-1.92-.14-.06-.29-.12-.43-.17-.17-.06-.35-.13-.52-.2Z"/>
                <path className="abc-17" d="M1253.17,631.58c.06,58.53.1,116.51.13,155.18.01,22.8-.14,40.06.14,48.62.01.67.03,1.4.06,2.17.02.58.06,1.22.11,1.88.17.07.35.14.52.2.14.05.28.11.43.17-.04-.63-.08-1.24-.1-1.82-.66-16.21-.4-40.93-.4-70.44,0-1.86,0-3.74,0-5.64-.02-40.89-.02-90.21-.02-138.71-.14-.01-.28-.03-.41-.07-.15,3.09-.3,5.78-.44,8.47Z"/>
                <path className="abc-393" d="M1252.89,421.9c.01,1.45.04,2.98.04,4.57.07,26.61.16,116.43.25,205.11.14-2.69.29-5.38.44-8.47.13.04.27.05.41.07,0-77.89,0-153.66-.11-189.04,0-2.15-.03-4.3-.05-6.46-.18,0-.36,0-.52-.05-.17-1.92-.32-3.83-.46-5.74Z"/>
                <path className="abc-419" d="M1253.03,415.16c-.01.89-.07,1.8-.1,2.61-.05,1.3-.05,2.68-.04,4.13.14,1.91.29,3.81.46,5.74.16.05.34.06.52.05-.01-2.15-.02-4.31.03-6.45.03-1.38.08-2.86.07-4.32-.09-.04-.18-.09-.32-.13-.18-.59-.4-1.1-.62-1.62Z"/>
                <path className="abc-41" d="M1252.73,412.14c.05.17.09.35.13.53.15.73.19,1.6.17,2.49.22.51.44,1.03.62,1.62.14.05.23.09.32.13,0-1.46-.05-2.9-.22-4.2-.02-.2-.05-.39-.09-.56-.14-.01-.29-.02-.42-.04-.18.02-.35.02-.51.03Z"/>
                <path className="abc-190" d="M1252.55,411.65c.07.16.13.32.18.49.16,0,.33-.02.51-.03.13.02.28.03.42.04-.04-.17-.08-.35-.14-.5-.15,0-.29,0-.44,0-.18,0-.36,0-.53,0Z"/>
                <path className="abc-315" d="M1265.69,866.55c.2.19.4.37.61.55.28.25.56.49.85.72-.23-.2-.46-.43-.69-.65-.26-.2-.52-.41-.77-.63Z"/>
                <path className="abc-67" d="M1264.67,865.54c.14.15.29.29.43.44.19.19.39.38.59.57.25.21.51.42.77.63-.23-.22-.46-.45-.69-.67-.17-.16-.33-.33-.5-.5-.2-.15-.41-.3-.61-.46Z"/>
                <path className="abc-443" d="M1263.93,864.75c.1.11.21.23.32.34.14.15.28.3.42.44.2.16.4.31.61.46-.16-.17-.32-.34-.49-.51-.13-.13-.25-.27-.38-.41-.16-.1-.32-.21-.48-.32Z"/>
                <path className="abc-218" d="M1263.41,864.17c.07.08.14.16.21.24.1.12.21.23.31.35.16.11.32.22.48.32-.12-.14-.25-.28-.37-.41-.08-.09-.17-.19-.25-.28-.13-.07-.26-.15-.38-.22Z"/>
                <path className="abc-450" d="M1262.6,863.23c.19.23.39.47.59.7.07.08.14.16.21.24.13.07.25.15.38.22-.08-.09-.16-.19-.25-.28-.2-.22-.4-.46-.59-.69-.12-.07-.24-.13-.35-.19Z"/>
                <path className="abc-25" d="M1260.66,860.69c.43.61.89,1.23,1.38,1.84.19.23.38.47.57.7.12.06.23.13.35.19-.19-.23-.38-.47-.57-.69-.48-.59-.93-1.19-1.36-1.78-.13-.1-.26-.19-.38-.26Z"/>
                <path className="abc-251" d="M1257.69,855.8c.52,1.01,1.09,2.02,1.73,3.04.39.62.8,1.23,1.23,1.85.12.06.25.16.38.26-.43-.6-.83-1.2-1.22-1.8-.63-.99-1.2-2-1.71-3-.14-.14-.28-.27-.41-.34Z"/>
                <path className="abc-85" d="M1255.01,849.26c.36,1.16.79,2.34,1.29,3.55.41.99.87,1.99,1.39,3,.13.07.27.2.41.34-.51-1-.97-2-1.38-2.99-.5-1.2-.92-2.4-1.28-3.57-.15-.13-.29-.25-.44-.33Z"/>
                <path className="abc-216" d="M1253.87,844.8c.07.36.15.72.23,1.08.25,1.09.54,2.22.91,3.37.14.07.29.19.44.33-.36-1.17-.65-2.32-.89-3.43-.08-.37-.16-.73-.23-1.09-.16-.1-.31-.19-.46-.27Z"/>
                <path className="abc-352" d="M1253.48,842.53c.06.4.12.8.2,1.21.06.35.13.7.2,1.05.15.08.3.17.46.27-.07-.36-.14-.71-.19-1.06-.07-.42-.13-.83-.18-1.25-.16-.08-.32-.16-.48-.22Z"/>
                <path className="abc-35" d="M1253.11,839.26c.05.67.12,1.37.21,2.12.05.38.1.77.16,1.16.15.06.31.14.48.22-.06-.42-.1-.83-.15-1.26-.08-.71-.15-1.41-.2-2.06-.17-.07-.34-.13-.5-.18Z"/>
                <path className="abc-170" d="M1252.76,640.08c.11,98.32.2,192.35.2,194.84,0,.7,0,1.54.04,2.46.02.58.06,1.21.11,1.88.16.05.33.11.5.18-.05-.66-.09-1.29-.11-1.88-.03-.77-.05-1.5-.06-2.17-.28-8.56-.12-25.82-.14-48.62-.03-38.68-.07-96.66-.13-155.18-.14,2.69-.29,5.39-.42,8.49Z"/>
                <path className="abc-441" d="M1252.45,416.17c0,.75,0,1.65.01,2.69.06,17.86.19,121.74.3,221.22.13-3.11.27-5.8.42-8.49-.08-88.68-.18-178.5-.25-205.11,0-1.59-.03-3.12-.04-4.57-.14-1.91-.28-3.81-.44-5.73Z"/>
                <path className="abc-38" d="M1252.44,413.55c0,.27,0,.54,0,.8,0,.46,0,1.06,0,1.82.15,1.92.29,3.83.44,5.73-.01-1.45,0-2.83.04-4.13.03-.81.09-1.72.1-2.61-.22-.51-.43-1.03-.59-1.61Z"/>
                <path className="abc-234" d="M1252.25,412.18c.05.18.1.37.13.57.04.26.06.53.06.8.16.59.38,1.1.59,1.61.01-.89-.02-1.76-.17-2.49-.03-.18-.08-.36-.13-.53-.16,0-.32.02-.48.03Z"/>
                <path className="abc-53" d="M1252.05,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
              </g>
              <g>
                <path className="abc-51" d="M1252.05,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M1252.05,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M1252.05,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M1252.05,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M1252.05,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M1252.05,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M1252.05,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M1252.05,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M1252.05,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M1252.05,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M1252.05,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M1252.05,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M1252.05,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M1252.05,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M1252.05,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M1252.05,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
              </g>
              <g>
                <path className="abc-51" d="M1252.05,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M1252.05,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M1252.05,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M1252.05,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M1252.05,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M1252.05,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M1252.05,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M1252.05,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M1252.05,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M1252.05,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M1252.05,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M1252.05,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M1252.05,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M1252.05,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                <path className="abc-51" d="M1252.05,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
              </g>
            </g>
            <g id="MeshGrid-7" data-name="MeshGrid">
              <g>
                <path className="abc-53" d="M1331.69,411.27c-.07.13-.14.26-.19.39.1,0,.2,0,.3,0,.06-.13.13-.26.2-.38-.1,0-.2-.01-.31-.02Z"/>
                <path className="abc-207" d="M1332.28,410.48c-.13.13-.25.27-.35.42-.09.12-.17.24-.24.37.11,0,.21,0,.31.02.07-.12.16-.23.24-.34.11-.14.23-.26.35-.38-.1-.02-.2-.05-.31-.08Z"/>
                <path className="abc-410" d="M1333.26,409.78c-.2.1-.39.22-.56.34-.14.11-.28.22-.41.35.11.03.22.05.31.08.13-.12.26-.23.41-.33.17-.12.35-.23.55-.33-.09-.04-.19-.07-.29-.11Z"/>
                <path className="abc-449" d="M1334.28,409.38c-.13.04-.25.08-.37.12-.23.08-.45.18-.66.28.11.03.21.07.29.11.19-.1.4-.19.61-.26.11-.04.23-.08.35-.11-.07-.05-.14-.09-.23-.14Z"/>
                <path className="abc-144" d="M1336.41,409.01c-.58.05-1.17.13-1.74.26-.13.03-.26.07-.39.11.08.05.16.09.23.14.12-.03.24-.07.36-.09.61-.14,1.24-.2,1.87-.24-.11-.05-.22-.11-.34-.17Z"/>
                <path className="abc-270" d="M1339.4,408.79c-.41.04-.83.07-1.23.09-.58.04-1.18.07-1.76.12.12.06.22.12.34.17.63-.04,1.27-.05,1.89-.09.45-.03.92-.06,1.38-.1-.2-.06-.39-.13-.61-.19Z"/>
                <path className="abc-348" d="M1341.72,408.5c-.34.06-.71.12-1.1.17-.39.05-.8.09-1.21.13.21.07.41.13.61.19.46-.04.92-.08,1.35-.13.47-.05.92-.11,1.33-.18-.27-.07-.62-.12-.98-.18Z"/>
                <path className="abc-308" d="M1343.39,407.87c-.18.16-.43.29-.76.4-.27.09-.58.16-.92.23.36.06.71.11.98.18.41-.07.78-.15,1.09-.23.39-.11.69-.24.84-.38-.36-.08-.79-.13-1.24-.19Z"/>
                <path className="abc-458" d="M1343.87,406.86c-.03.11-.06.21-.09.31-.07.21-.16.39-.26.55-.03.05-.07.1-.13.15.45.05.88.11,1.24.19.05-.05.09-.1.11-.15.07-.16.13-.35.19-.55.03-.11.06-.23.09-.36-.37-.05-.75-.1-1.15-.14Z"/>
                <path className="abc-241" d="M1344.03,406.26c-.04.09-.07.18-.09.26-.02.12-.05.23-.07.34.4.04.78.09,1.15.14.03-.12.05-.25.07-.37.01-.08.02-.15.03-.23-.34-.05-.71-.1-1.09-.14Z"/>
                <path className="abc-174" d="M1344.22,405.8c-.02.06-.05.13-.07.19-.04.09-.08.18-.12.27.38.04.75.09,1.09.14,0-.08.02-.15.02-.23,0-.05,0-.11,0-.16-.31-.08-.61-.15-.94-.21Z"/>
                <path className="abc-72" d="M1344.3,405.38c-.01.08-.04.16-.04.24,0,.06-.02.12-.04.18.32.06.63.13.94.21,0-.05,0-.11,0-.16,0-.07,0-.14,0-.21-.28-.1-.55-.19-.85-.26Z"/>
                <path className="abc-80" d="M1344.34,404.77c-.01.12-.04.25-.02.37.01.08,0,.16-.02.24.3.07.57.15.85.26,0-.07-.01-.14-.02-.21-.01-.11-.03-.21-.06-.31-.23-.14-.47-.25-.73-.34Z"/>
                <path className="abc-62" d="M1344.31,404.31s.01.08.03.11c.04.1.02.23,0,.34.27.09.5.2.73.34-.03-.1-.06-.2-.1-.29-.01-.03-.03-.07-.04-.1-.19-.17-.39-.3-.62-.41Z"/>
                <path className="abc-62" d="M1344.27,404.07s.02.09.02.13c0,.04,0,.08.01.11.24.11.43.24.62.41-.02-.03-.03-.06-.05-.09-.02-.04-.04-.07-.07-.11-.17-.18-.34-.33-.54-.45Z"/>
                <path className="abc-404" d="M1344.21,403.95s.04.08.06.12c.21.12.38.27.54.45-.02-.03-.05-.07-.08-.1-.16-.19-.32-.34-.53-.47Z"/>
                <path className="abc-42" d="M1331.05,411.24c-.06.14-.11.28-.15.42.1,0,.2,0,.3,0,.1,0,.2,0,.31,0,.05-.13.12-.26.19-.39-.11,0-.22,0-.32-.02-.1,0-.21-.01-.32-.01Z"/>
                <path className="abc-47" d="M1331.59,410.33c-.12.15-.24.31-.33.48-.08.14-.15.28-.21.42.11,0,.22,0,.32.01.11,0,.22.01.32.02.07-.13.15-.25.24-.37.11-.15.23-.29.35-.42-.11-.03-.22-.05-.34-.08-.11-.02-.23-.05-.35-.07Z"/>
                <path className="abc-398" d="M1332.59,409.57c-.23.11-.43.24-.6.37-.14.11-.28.25-.4.4.12.03.24.05.35.07.11.02.23.05.34.08.13-.13.27-.25.41-.35.17-.12.36-.24.56-.34-.11-.03-.22-.07-.32-.11-.1-.04-.22-.07-.34-.11Z"/>
                <path className="abc-216" d="M1333.75,409.1c-.14.05-.28.1-.42.15-.26.1-.51.2-.74.32.12.03.24.07.34.11.11.04.22.07.32.11.2-.1.42-.2.66-.28.12-.04.25-.09.37-.12-.08-.04-.17-.09-.26-.14-.09-.05-.18-.09-.28-.14Z"/>
                <path className="abc-273" d="M1335.57,408.67c-.47.07-.94.16-1.39.29-.14.04-.29.09-.43.13.1.04.19.09.28.14.09.05.18.09.26.14.13-.04.26-.07.39-.11.56-.14,1.15-.21,1.74-.26-.12-.06-.24-.12-.39-.18-.15-.06-.29-.1-.45-.15Z"/>
                <path className="abc-356" d="M1337.94,408.4c-.31.04-.63.07-.94.1-.48.05-.96.1-1.43.17.15.05.3.1.45.15.15.06.27.12.39.18.58-.05,1.18-.08,1.76-.12.41-.03.82-.06,1.23-.09-.21-.07-.44-.14-.69-.2-.25-.06-.5-.13-.76-.19Z"/>
                <path className="abc-59" d="M1339.69,408.1c-.25.06-.51.12-.81.17-.31.06-.62.1-.93.14.26.06.51.13.76.19.26.07.48.13.69.2.41-.04.82-.08,1.21-.13.39-.05.76-.11,1.1-.17-.36-.06-.74-.11-1.08-.18-.31-.06-.63-.14-.95-.22Z"/>
                <path className="abc-83" d="M1340.91,407.49c-.16.16-.35.29-.57.39-.2.09-.41.16-.66.22.32.08.64.16.95.22.34.07.71.13,1.08.18.34-.06.65-.14.92-.23.32-.11.58-.24.76-.4-.45-.05-.91-.11-1.33-.17-.37-.05-.76-.13-1.15-.21Z"/>
                <path className="abc-208" d="M1341.4,406.61c-.03.09-.06.17-.09.25-.11.26-.24.46-.4.63.39.08.78.16,1.15.21.42.07.88.12,1.33.17.05-.05.09-.1.13-.15.1-.16.18-.34.26-.55.03-.1.07-.2.09-.31-.4-.04-.81-.09-1.24-.12-.4-.04-.82-.08-1.23-.13Z"/>
                <path className="abc-444" d="M1341.64,406.04c-.06.1-.14.19-.16.29-.02.1-.05.19-.08.28.42.04.83.09,1.23.13.42.04.84.08,1.24.12.03-.11.05-.22.07-.34.02-.08.05-.18.09-.26-.38-.04-.78-.08-1.19-.12-.39-.04-.79-.07-1.21-.1Z"/>
                <path className="abc-58" d="M1341.99,405.54c-.03.07-.09.14-.14.21-.06.1-.16.19-.22.29.42.03.82.07,1.21.1.4.04.8.07,1.19.12.04-.09.08-.18.12-.27.03-.06.05-.13.07-.19-.32-.06-.66-.11-1.04-.15-.36-.04-.76-.08-1.19-.11Z"/>
                <path className="abc-435" d="M1342.16,405.07c-.02.09-.07.18-.09.27,0,.07-.05.13-.08.2.43.03.82.07,1.19.11.38.04.72.09,1.04.15.02-.06.03-.13.04-.18,0-.08.03-.16.04-.24-.3-.07-.62-.13-.98-.18-.35-.05-.73-.09-1.16-.13Z"/>
                <path className="abc-258" d="M1342.24,404.38c-.02.14-.08.28-.05.42.02.09-.01.18-.04.27.43.04.81.08,1.16.13.36.05.68.11.98.18.01-.08.03-.16.02-.24-.02-.12.01-.25.02-.37-.27-.09-.56-.17-.91-.23-.34-.06-.72-.11-1.19-.16Z"/>
                <path className="abc-338" d="M1342.27,403.85s0,.09.01.13c.04.12-.02.26-.04.39.46.05.85.1,1.19.16.35.06.64.14.91.23.01-.12.03-.24,0-.34-.01-.04-.02-.08-.03-.11-.24-.11-.51-.19-.85-.27-.33-.07-.71-.13-1.19-.19Z"/>
                <path className="abc-338" d="M1342.26,403.57c.01.05,0,.1,0,.15,0,.04,0,.09,0,.13.48.06.87.12,1.19.19.34.07.61.16.85.27,0-.04,0-.08-.01-.11,0-.04,0-.09-.02-.13-.21-.12-.46-.22-.79-.3-.32-.08-.72-.14-1.22-.21Z"/>
                <path className="abc-437" d="M1342.21,403.42s.04.1.05.15c.5.06.9.13,1.22.21.33.08.58.18.79.3-.01-.04-.03-.08-.06-.12-.21-.13-.46-.23-.79-.31-.32-.08-.71-.15-1.22-.22Z"/>
                <path className="abc-190" d="M1330.68,411.2c-.06.15-.1.3-.14.45.02,0,.03,0,.05,0,.1,0,.21,0,.31,0,.04-.14.09-.28.15-.42-.11,0-.22,0-.33-.01-.02,0-.03-.01-.04-.02Z"/>
                <path className="abc-181" d="M1331.17,410.24c-.11.16-.21.33-.29.51-.07.14-.14.3-.19.45.01.01.02.02.04.02.11,0,.22.01.33.01.06-.14.13-.28.21-.42.1-.17.21-.33.33-.48-.12-.03-.25-.05-.37-.07-.02,0-.04,0-.06-.02Z"/>
                <path className="abc-199" d="M1332.18,409.45c-.24.12-.45.24-.62.38-.15.12-.28.26-.39.41.02,0,.04.01.06.02.12.02.25.05.37.07.12-.15.26-.28.4-.4.17-.13.37-.25.6-.37-.12-.03-.25-.07-.37-.11-.02,0-.03,0-.05-.01Z"/>
                <path className="abc-288" d="M1333.4,408.95c-.15.05-.3.11-.44.16-.28.11-.54.22-.78.34.02,0,.03,0,.05.01.12.04.24.07.37.11.23-.11.48-.22.74-.32.14-.05.28-.1.42-.15-.1-.05-.2-.09-.31-.14-.01,0-.03-.01-.04-.02Z"/>
                <path className="abc-447" d="M1335.01,408.53c-.39.07-.78.15-1.17.27-.15.05-.3.1-.45.15.01,0,.03,0,.04.02.11.05.21.09.31.14.14-.05.28-.09.43-.13.45-.13.92-.22,1.39-.29-.15-.05-.31-.1-.48-.15-.02,0-.05,0-.08,0Z"/>
                <path className="abc-297" d="M1337,408.2c-.27.05-.54.09-.81.14-.39.06-.79.12-1.18.19.03,0,.06,0,.08,0,.17.05.33.1.48.15.47-.07.95-.12,1.43-.17.32-.03.63-.06.94-.1-.26-.06-.53-.13-.81-.18-.04,0-.09-.01-.13-.02Z"/>
                <path className="abc-275" d="M1338.48,407.87c-.21.06-.44.11-.68.16-.27.06-.54.11-.81.16.05,0,.1.01.13.02.28.06.55.12.81.18.31-.04.62-.08.93-.14.3-.05.57-.11.81-.17-.32-.08-.65-.16-.99-.21-.05,0-.13,0-.21,0Z"/>
                <path className="abc-262" d="M1339.58,407.29c-.14.16-.32.27-.52.37-.18.09-.37.15-.58.21.08,0,.17,0,.21,0,.34.06.67.14.99.21.25-.06.46-.13.66-.22.22-.1.41-.23.57-.39-.39-.08-.79-.16-1.18-.19-.05,0-.1,0-.15,0Z"/>
                <path className="abc-332" d="M1339.98,406.48c-.02.08-.04.15-.07.23-.07.24-.19.43-.33.59.05,0,.1,0,.15,0,.39.04.79.12,1.18.19.16-.16.29-.37.4-.63.03-.08.06-.16.09-.25-.42-.04-.84-.08-1.26-.11-.06,0-.11-.01-.16-.02Z"/>
                <path className="abc-55" d="M1340.15,405.93c-.04.1-.08.2-.12.3-.01.08-.03.16-.05.24.05.01.11.02.16.02.42.03.84.07,1.26.11.03-.09.05-.18.08-.28.02-.1.11-.19.16-.29-.42-.03-.85-.06-1.31-.1-.07,0-.12,0-.18-.01Z"/>
                <path className="abc-167" d="M1340.36,405.42c-.02.07-.05.14-.08.21-.04.1-.09.2-.13.3.06,0,.12,0,.18.01.45.03.89.06,1.31.1.06-.1.16-.19.22-.29.04-.07.1-.14.14-.21-.43-.03-.9-.07-1.41-.11-.07,0-.15-.01-.22-.02Z"/>
                <path className="abc-452" d="M1340.45,404.92c0,.1-.02.19-.04.29-.01.07-.03.14-.05.21.08,0,.15.01.22.02.51.04.98.07,1.41.11.03-.07.08-.14.08-.2.01-.09.06-.18.09-.27-.43-.04-.92-.08-1.47-.13-.08,0-.16-.01-.24-.02Z"/>
                <path className="abc-336" d="M1340.33,404.2c.02.14.04.29.09.44.03.1.03.19.03.29.08,0,.16.01.24.02.55.04,1.04.08,1.47.13.02-.09.06-.18.04-.27-.04-.14.03-.28.05-.42-.46-.05-1-.1-1.63-.16-.09,0-.18-.02-.28-.02Z"/>
                <path className="abc-7" d="M1340.21,403.64s.03.09.04.14c.04.13.06.27.08.41.1,0,.19.02.28.02.63.06,1.17.1,1.63.16.02-.14.08-.27.04-.39-.01-.04,0-.09-.01-.13-.48-.06-1.05-.12-1.76-.18-.1,0-.2-.02-.31-.03Z"/>
                <path className="abc-248" d="M1340.09,403.34c.03.05.05.11.07.16.02.05.03.09.05.14.1,0,.21.02.31.03.7.06,1.28.12,1.76.18,0-.04,0-.09,0-.13,0-.05,0-.1,0-.15-.5-.06-1.1-.12-1.84-.19-.11,0-.22-.02-.33-.03Z"/>
                <path className="abc-439" d="M1339.99,403.18c.04.05.07.11.1.16.11.01.22.02.33.03.74.07,1.34.13,1.84.19-.01-.05-.02-.1-.05-.15-.51-.07-1.12-.13-1.88-.2-.11-.01-.22-.02-.34-.03Z"/>
                <path className="abc-190" d="M1330.33,411.19c-.05.16-.09.32-.12.47.1,0,.19,0,.29,0h.05c.04-.15.08-.3.14-.45-.01-.01-.02-.02-.04-.02-.1,0-.21,0-.31,0Z"/>
                <path className="abc-181" d="M1330.76,410.17c-.11.17-.19.35-.26.54-.06.15-.12.31-.17.47.11,0,.21-.02.31,0,.02,0,.03.01.04.02.06-.15.12-.3.19-.45.08-.18.18-.35.29-.51-.02,0-.04-.01-.06-.02-.11-.02-.23-.04-.35-.06Z"/>
                <path className="abc-199" d="M1331.77,409.34c-.25.12-.46.25-.63.39-.15.12-.28.27-.38.44.12.02.24.04.35.06.02,0,.04,0,.06.02.11-.16.25-.3.39-.41.17-.13.38-.26.62-.38-.02,0-.04,0-.05-.01-.11-.03-.23-.07-.35-.1Z"/>
                <path className="abc-383" d="M1333.04,408.81c-.15.06-.31.12-.46.18-.29.11-.57.23-.81.36.12.03.24.06.35.1.02,0,.03,0,.05.01.24-.12.5-.23.78-.34.15-.06.29-.11.44-.16-.01,0-.03,0-.04-.01-.1-.04-.2-.08-.31-.13Z"/>
                <path className="abc-447" d="M1334.48,408.39c-.33.08-.65.15-.97.26-.15.05-.31.11-.46.17.11.04.21.08.31.13.02,0,.03.01.04.01.15-.05.3-.1.45-.15.38-.11.77-.2,1.17-.27-.03,0-.06,0-.08,0-.15-.04-.3-.09-.45-.14Z"/>
                <path className="abc-256" d="M1336.14,408.01c-.23.05-.45.11-.67.16-.33.08-.65.14-.98.22.15.05.3.1.45.14.02,0,.05,0,.08,0,.39-.07.79-.13,1.18-.19.27-.04.54-.09.81-.14-.05,0-.1-.01-.14-.02-.25-.05-.49-.11-.73-.17Z"/>
                <path className="abc-275" d="M1337.37,407.67c-.18.06-.37.11-.56.16-.23.06-.45.12-.68.17.24.06.48.12.73.17.04,0,.09.01.14.02.27-.05.54-.1.81-.16.24-.05.46-.1.68-.16-.08,0-.17,0-.21,0-.31-.05-.6-.13-.89-.2Z"/>
                <path className="abc-170" d="M1338.34,407.1c-.13.14-.28.26-.46.36-.16.08-.32.15-.5.21.29.07.59.14.89.2.05,0,.13,0,.21,0,.21-.06.41-.13.58-.21.2-.1.37-.22.52-.37-.05,0-.1,0-.15,0-.35-.04-.73-.11-1.09-.18Z"/>
                <path className="abc-233" d="M1338.68,406.37c-.02.07-.04.14-.06.2-.06.21-.16.39-.29.53.37.07.74.14,1.09.18.05,0,.1,0,.15,0,.14-.16.25-.35.33-.59.03-.07.05-.15.07-.23-.05-.01-.11-.02-.16-.02-.38-.03-.76-.06-1.13-.08Z"/>
                <path className="abc-361" d="M1338.84,405.85c-.04.1-.08.2-.11.31-.01.07-.03.14-.04.21.38.03.76.05,1.13.08.06,0,.11.01.16.02.02-.08.04-.16.05-.24.03-.1.07-.2.12-.3-.06,0-.12,0-.19-.01-.37-.02-.75-.05-1.12-.07Z"/>
                <path className="abc-453" d="M1339.03,405.33c-.02.07-.04.14-.07.22-.04.1-.08.2-.12.3.37.02.75.05,1.12.07.07,0,.13,0,.19.01.04-.1.09-.2.13-.3.03-.07.06-.14.08-.21-.08,0-.15-.01-.23-.02-.37-.03-.73-.05-1.1-.07Z"/>
                <path className="abc-7" d="M1339.14,404.83c-.02.1-.06.19-.07.29,0,.07-.02.14-.04.22.36.02.73.05,1.1.07.08,0,.15.01.23.02.02-.07.04-.14.05-.21.02-.1.03-.19.04-.29-.08,0-.17-.01-.25-.02-.24-.02-.49-.04-.75-.06-.1,0-.2-.01-.31-.02Z"/>
                <path className="abc-134" d="M1339.03,404.09c.03.14.07.29.13.44.03.1,0,.19-.01.29.1,0,.21.01.31.02.25.02.5.04.75.06.08,0,.17.01.25.02,0-.1,0-.19-.03-.29-.05-.15-.07-.3-.09-.44-.1,0-.19-.02-.29-.02-.23-.02-.48-.04-.72-.06-.1,0-.2-.01-.3-.02Z"/>
                <path className="abc-351" d="M1338.89,403.53s.03.1.04.14c.04.14.07.28.1.42.1,0,.2.01.3.02.24.02.49.04.72.06.1,0,.2.02.29.02-.02-.14-.04-.28-.08-.41-.01-.05-.03-.1-.04-.14-.1,0-.21-.02-.32-.03-.34-.03-.67-.06-1-.08Z"/>
                <path className="abc-425" d="M1338.75,403.22c.03.05.06.11.09.17.02.05.04.09.05.14.33.03.67.05,1,.08.11,0,.22.02.32.03-.01-.05-.03-.09-.05-.14-.02-.05-.04-.11-.07-.16-.11-.01-.23-.02-.35-.03-.34-.03-.67-.06-1-.09Z"/>
                <path className="abc-34" d="M1338.63,403.06c.04.05.08.11.11.16.33.03.66.06,1,.09.12.01.23.02.35.03-.03-.05-.06-.11-.1-.16-.11-.01-.23-.02-.35-.03-.34-.03-.67-.06-1.01-.09Z"/>
                <path className="abc-410" d="M1329.57,411.13c-.03.17-.06.35-.08.52.14,0,.29,0,.43,0,.1,0,.2,0,.29,0,.03-.15.07-.31.12-.47-.11,0-.22.02-.32,0-.15,0-.3-.04-.44-.06Z"/>
                <path className="abc-164" d="M1329.87,410.02c-.09.18-.15.38-.19.59-.04.17-.08.35-.11.52.15.03.29.05.44.06.11,0,.21,0,.32,0,.05-.16.1-.32.17-.47.07-.19.16-.38.26-.54-.12-.02-.24-.04-.36-.06-.17-.03-.35-.06-.54-.1Z"/>
                <path className="abc-15" d="M1330.86,409.13c-.25.13-.47.27-.64.41-.15.14-.27.3-.36.48.18.03.36.07.54.1.12.02.24.04.36.06.11-.17.23-.31.38-.44.17-.13.38-.26.63-.39-.12-.03-.25-.06-.37-.09-.17-.05-.36-.09-.54-.12Z"/>
                <path className="abc-139" d="M1332.18,408.54c-.16.07-.33.13-.48.2-.3.13-.59.26-.84.39.19.04.37.08.54.12.12.03.25.06.37.09.25-.12.52-.24.81-.36.15-.06.31-.12.46-.18-.11-.04-.22-.08-.34-.12-.16-.06-.34-.11-.52-.15Z"/>
                <path className="abc-161" d="M1333.33,408.07c-.23.09-.43.17-.65.26-.16.07-.33.13-.49.2.19.05.36.09.52.15.11.04.23.08.34.12.15-.06.31-.11.46-.17.32-.1.64-.18.97-.26-.15-.05-.3-.1-.46-.15-.24-.07-.46-.12-.69-.17Z"/>
                <path className="abc-84" d="M1334.4,407.63c-.14.06-.28.12-.42.18-.22.09-.42.18-.65.26.23.05.45.1.69.17.16.05.31.1.46.15.33-.08.66-.14.98-.22.22-.05.45-.11.67-.16-.24-.06-.48-.12-.72-.17-.36-.07-.69-.14-1.01-.2Z"/>
                <path className="abc-48" d="M1335.22,407.24c-.12.07-.25.14-.4.2-.14.06-.27.13-.41.19.32.06.66.13,1.01.2.24.05.48.11.72.17.23-.05.45-.11.68-.17.19-.05.38-.1.56-.16-.29-.07-.58-.14-.88-.19-.42-.07-.86-.16-1.28-.24Z"/>
                <path className="abc-363" d="M1335.84,406.7c-.09.12-.18.22-.29.31-.1.08-.21.16-.33.23.42.08.86.17,1.28.24.3.05.59.12.88.19.18-.06.35-.13.5-.21.18-.1.33-.21.46-.36-.37-.07-.73-.14-1.07-.18-.48-.04-.96-.14-1.43-.23Z"/>
                <path className="abc-296" d="M1336.1,406.17s-.03.09-.05.14c-.06.15-.13.27-.22.39.46.09.95.18,1.43.23.34.04.7.11,1.07.18.13-.14.23-.32.29-.53.02-.07.04-.13.06-.2-.38-.03-.75-.05-1.11-.08-.51-.03-1.01-.08-1.48-.12Z"/>
                <path className="abc-76" d="M1336.26,405.72c-.03.1-.08.2-.11.3-.02.05-.03.1-.05.15.47.04.97.09,1.48.12.36.03.73.05,1.11.08.02-.07.03-.14.04-.21.03-.1.07-.2.11-.31-.37-.02-.74-.04-1.1-.06-.52-.03-1.01-.05-1.48-.07Z"/>
                <path className="abc-259" d="M1336.39,405.2c0,.07-.02.14-.03.22-.02.1-.06.2-.09.3.47.02.96.05,1.48.07.36.02.73.04,1.1.06.04-.1.09-.2.12-.3.03-.07.05-.14.07-.22-.36-.02-.72-.04-1.09-.06-.52-.03-1.04-.05-1.55-.07Z"/>
                <path className="abc-242" d="M1336.44,404.69c0,.1-.07.19-.05.29.01.07,0,.14,0,.22.51.02,1.03.05,1.55.07.37.02.73.04,1.09.06.02-.07.03-.14.04-.22,0-.1.05-.19.07-.29-.35-.02-.71-.04-1.08-.06-.52-.03-1.06-.05-1.62-.07Z"/>
                <path className="abc-29" d="M1336.29,403.96c.07.15.08.29.16.44.05.1,0,.19,0,.29.56.02,1.11.05,1.62.07.37.02.73.04,1.08.06.02-.1.04-.19.01-.29-.05-.15-.1-.3-.13-.44-.33-.02-.68-.04-1.04-.06-.51-.03-1.07-.05-1.7-.07Z"/>
                <path className="abc-124" d="M1336.05,403.39s.04.1.07.15c.08.14.09.28.16.43.62.02,1.19.05,1.7.07.36.02.71.04,1.04.06-.03-.14-.07-.28-.1-.42-.01-.05-.03-.1-.04-.14-.33-.03-.67-.05-1-.07-.51-.03-1.13-.05-1.83-.08Z"/>
                <path className="abc-6" d="M1335.86,403.07c.05.06.07.11.11.17.04.05.05.1.08.14.7.03,1.32.05,1.83.08.34.02.67.04,1,.07-.02-.05-.03-.1-.05-.14-.02-.06-.05-.11-.09-.17-.33-.03-.66-.05-1-.07-.51-.03-1.15-.05-1.89-.08Z"/>
                <path className="abc-99" d="M1335.73,402.91c.06.05.09.11.13.16.74.03,1.37.06,1.89.08.34.02.67.04,1,.07-.03-.05-.07-.11-.11-.16-.34-.03-.67-.05-1.01-.07-.51-.03-1.15-.06-1.9-.08Z"/>
                <path className="abc-2" d="M1328.45,411.1c-.04.18-.07.37-.1.54.24,0,.48,0,.71,0,.15,0,.29,0,.44,0,.02-.16.05-.34.08-.52-.15-.03-.29-.05-.45-.05-.22,0-.44,0-.67.02Z"/>
                <path className="abc-418" d="M1328.78,409.96c-.1.19-.16.39-.21.61-.05.17-.09.36-.13.54.23-.01.45-.03.67-.02.16,0,.31.03.45.05.03-.17.07-.35.11-.52.04-.21.1-.41.19-.59-.18-.03-.37-.06-.55-.08-.19,0-.36.01-.54.03Z"/>
                <path className="abc-399" d="M1329.79,408.97c-.24.16-.46.32-.63.48-.15.15-.27.32-.37.51.17-.01.34-.03.54-.03.18.02.37.05.55.08.09-.18.21-.34.36-.48.16-.14.39-.28.64-.41-.19-.04-.38-.07-.58-.11-.18-.01-.34-.03-.5-.05Z"/>
                <path className="abc-274" d="M1331.05,408.27c-.16.08-.31.15-.46.23-.28.15-.56.31-.8.47.16.02.32.04.5.05.19.04.39.07.58.11.25-.13.54-.26.84-.39.16-.07.32-.13.48-.2-.19-.05-.38-.09-.58-.13-.19-.04-.37-.09-.56-.13Z"/>
                <path className="abc-395" d="M1331.97,407.81c-.16.09-.3.17-.45.24-.16.07-.32.15-.47.22.19.04.37.09.56.13.2.04.39.09.58.13.16-.07.33-.13.49-.2.23-.09.43-.18.65-.26-.23-.05-.45-.09-.69-.15-.22-.04-.44-.08-.67-.12Z"/>
                <path className="abc-354" d="M1332.71,407.32c-.09.06-.18.13-.28.2-.15.1-.3.2-.46.29.23.04.46.08.67.12.24.05.47.1.69.15.23-.09.43-.17.65-.26.15-.06.28-.12.42-.18-.32-.06-.63-.12-.93-.17-.26-.04-.51-.09-.77-.14Z"/>
                <path className="abc-407" d="M1333.22,406.91c-.08.08-.17.16-.26.23-.08.06-.16.12-.25.18.25.05.51.1.77.14.3.06.61.11.93.17.14-.06.27-.12.41-.19.15-.07.28-.13.4-.2-.42-.08-.82-.16-1.16-.21-.27-.03-.55-.08-.84-.12Z"/>
                <path className="abc-194" d="M1333.66,406.38c-.07.1-.14.19-.22.29-.07.08-.14.16-.22.24.28.04.56.08.84.12.34.05.74.13,1.16.21.12-.07.23-.15.33-.23.11-.09.21-.2.29-.31-.46-.09-.91-.18-1.29-.21-.28-.02-.58-.07-.88-.11Z"/>
                <path className="abc-86" d="M1333.93,406s-.04.06-.06.09c-.07.1-.13.19-.2.29.3.04.61.08.88.11.38.03.83.12,1.29.21.09-.12.15-.24.22-.39.02-.05.03-.09.05-.14-.47-.04-.92-.09-1.32-.11-.28-.02-.56-.04-.85-.06Z"/>
                <path className="abc-317" d="M1334.05,405.62c0,.1-.03.2-.06.3-.02.03-.04.06-.06.09.29.02.57.04.85.06.41.02.85.06,1.32.11.02-.05.03-.1.05-.15.03-.1.08-.2.11-.3-.47-.02-.93-.04-1.37-.06-.28-.01-.56-.03-.84-.04Z"/>
                <path className="abc-152" d="M1334.01,405.1c.02.07.03.14.04.22.01.1.01.2,0,.3.28.01.56.02.84.04.45.02.9.04,1.37.06.03-.1.08-.2.09-.3.01-.07.03-.14.03-.22-.51-.02-1.02-.04-1.52-.06-.28-.01-.57-.02-.86-.03Z"/>
                <path className="abc-423" d="M1333.87,404.6c.03.1.06.19.08.28.02.07.04.14.05.22.29,0,.58.02.86.03.51.02,1.01.04,1.52.06,0-.07.01-.14,0-.22-.02-.1.05-.19.05-.29-.56-.02-1.15-.05-1.75-.07-.27,0-.55-.01-.82-.02Z"/>
                <path className="abc-224" d="M1333.5,403.88c.1.15.19.29.26.44.05.1.08.19.11.28.27,0,.55.01.82.02.6.02,1.19.05,1.75.07,0-.1.05-.19,0-.29-.08-.15-.09-.3-.16-.44-.62-.02-1.31-.05-2.06-.07-.24,0-.49,0-.73,0Z"/>
                <path className="abc-222" d="M1333.04,403.3c.04.05.09.1.13.15.12.14.23.29.33.43.24,0,.49,0,.73,0,.75.03,1.44.05,2.06.07-.07-.15-.08-.29-.16-.43-.03-.05-.04-.1-.07-.15-.7-.03-1.49-.05-2.34-.08-.22,0-.45,0-.68,0Z"/>
                <path className="abc-278" d="M1332.74,402.97c.05.06.11.12.16.18.05.05.09.1.13.15.23,0,.46,0,.68,0,.85.03,1.64.06,2.34.08-.03-.05-.05-.1-.08-.14-.04-.06-.06-.11-.11-.17-.74-.03-1.57-.06-2.48-.09-.21,0-.42-.01-.64-.01Z"/>
                <path className="abc-155" d="M1332.58,402.8c.05.06.11.11.16.17.22,0,.43,0,.64.01.91.03,1.74.06,2.48.09-.05-.06-.08-.11-.13-.16-.75-.03-1.6-.06-2.54-.09-.2,0-.4-.01-.61-.02Z"/>
                <path className="abc-221" d="M1327.43,411.14c-.07.17-.12.34-.17.5.12,0,.24,0,.36,0,.25,0,.49,0,.73,0,.03-.18.06-.36.1-.54-.23.01-.46.03-.69.03-.11,0-.22,0-.33,0Z"/>
                <path className="abc-211" d="M1327.95,410.03c-.12.19-.22.39-.31.6-.08.17-.15.34-.22.51.11,0,.22,0,.33,0,.23,0,.46-.02.69-.03.04-.18.08-.36.13-.54.04-.22.11-.42.21-.61-.17.01-.35.03-.55.04-.1,0-.19.01-.28.03Z"/>
                <path className="abc-295" d="M1328.99,408.95c-.23.18-.45.37-.63.55-.15.16-.29.34-.4.53.09-.01.18-.02.28-.03.2-.01.38-.03.55-.04.1-.19.22-.36.37-.51.17-.16.39-.32.63-.48-.16-.02-.33-.03-.53-.03-.1,0-.18,0-.27.01Z"/>
                <path className="abc-97" d="M1330.14,408.14c-.14.09-.27.18-.41.27-.26.17-.51.35-.74.54.09,0,.17-.01.27-.01.21,0,.37.02.53.03.24-.16.52-.32.8-.47.15-.08.31-.16.46-.23-.19-.04-.39-.08-.61-.11-.11-.01-.2-.02-.3-.02Z"/>
                <path className="abc-405" d="M1330.92,407.66c-.13.09-.25.17-.37.23-.13.08-.27.16-.41.25.1,0,.19,0,.3.02.22.03.42.07.61.11.16-.08.31-.15.47-.22.14-.07.29-.15.45-.24-.23-.04-.47-.07-.71-.1-.12-.02-.23-.03-.34-.04Z"/>
                <path className="abc-25" d="M1331.52,407.18c-.07.06-.15.13-.23.19-.12.1-.25.2-.37.29.11.01.22.03.34.04.24.03.48.07.71.1.16-.09.31-.19.46-.29.1-.07.19-.13.28-.2-.25-.05-.51-.09-.78-.13-.13-.01-.27-.02-.41-.02Z"/>
                <path className="abc-98" d="M1331.98,406.78c-.07.07-.16.15-.25.22-.06.06-.13.12-.21.18.14,0,.28,0,.41.02.27.03.52.08.78.13.09-.06.17-.13.25-.18.1-.07.18-.15.26-.23-.28-.04-.56-.08-.84-.11-.14-.01-.27-.02-.41-.02Z"/>
                <path className="abc-245" d="M1332.39,406.29c-.07.09-.14.18-.21.26-.06.08-.13.15-.21.23.14,0,.27,0,.41.02.27.03.56.07.84.11.08-.08.15-.16.22-.24.08-.09.15-.19.22-.29-.3-.04-.61-.08-.88-.1-.14,0-.26,0-.39,0Z"/>
                <path className="abc-58" d="M1332.65,405.94s-.04.05-.06.08c-.07.09-.14.17-.2.26.13,0,.25-.02.39,0,.28.02.58.06.88.1.07-.1.14-.19.2-.29.02-.03.04-.06.06-.09-.29-.02-.57-.04-.85-.05-.14,0-.28,0-.42,0Z"/>
                <path className="abc-58" d="M1332.77,405.58c0,.1-.02.19-.05.29-.02.02-.05.05-.07.08.14,0,.28,0,.42,0,.28.01.56.03.85.05.02-.03.04-.06.06-.09.03-.1.05-.2.06-.3-.28-.01-.56-.02-.84-.03-.14,0-.28,0-.44,0Z"/>
                <path className="abc-8" d="M1332.73,405.08c.01.07.03.14.03.21,0,.1.02.19.01.29.15,0,.3,0,.44,0,.28,0,.56.02.84.03,0-.1,0-.2,0-.3,0-.07-.02-.14-.04-.22-.29,0-.58-.01-.86-.02-.14,0-.28,0-.42,0Z"/>
                <path className="abc-287" d="M1332.64,404.59c.02.09.03.19.05.28.01.07.03.14.04.21.14,0,.28,0,.42,0,.28,0,.57,0,.86.02-.02-.07-.03-.14-.05-.22-.03-.1-.05-.19-.08-.28-.27,0-.55,0-.82-.01-.13,0-.27,0-.41,0Z"/>
                <path className="abc-307" d="M1332.38,403.87c.08.15.15.29.19.44.03.09.05.19.06.28.14,0,.28,0,.41,0,.27,0,.55,0,.82.01-.03-.1-.07-.19-.11-.28-.07-.15-.16-.3-.26-.44-.24,0-.49,0-.74-.01-.12,0-.25,0-.38,0Z"/>
                <path className="abc-26" d="M1332,403.28c.04.05.07.1.11.15.1.14.19.29.27.43.13,0,.26,0,.38,0,.25,0,.49,0,.74.01-.1-.15-.21-.29-.33-.43-.04-.05-.09-.1-.13-.15-.23,0-.46,0-.69-.01-.11,0-.23,0-.35,0Z"/>
                <path className="abc-249" d="M1331.76,402.95c.04.06.09.12.13.18.04.05.07.1.11.15.12,0,.23,0,.35,0,.23,0,.46,0,.69.01-.04-.05-.09-.1-.13-.15-.05-.06-.11-.12-.16-.18-.22,0-.44,0-.66-.02-.11,0-.21,0-.32,0Z"/>
                <path className="abc-448" d="M1331.63,402.77c.04.06.08.12.13.18.11,0,.22,0,.32,0,.22,0,.44.01.66.02-.05-.06-.11-.11-.16-.17-.21,0-.42-.01-.63-.02-.1,0-.21,0-.31,0Z"/>
                <path className="abc-290" d="M1326.05,411.22c-.1.15-.22.28-.31.42.39,0,.77,0,1.15,0,.12,0,.24,0,.36,0,.05-.16.11-.33.17-.5-.11,0-.22,0-.33,0-.34.01-.68.04-1.04.07Z"/>
                <path className="abc-381" d="M1326.85,410.2c-.15.19-.32.39-.45.58-.11.15-.25.29-.35.44.36-.03.71-.06,1.04-.07.11,0,.22,0,.33,0,.07-.17.14-.34.22-.51.09-.21.19-.41.31-.6-.09.01-.18.03-.28.04-.26.03-.53.08-.82.13Z"/>
                <path className="abc-374" d="M1328,409.01c-.21.21-.45.42-.65.63-.17.18-.35.37-.5.56.29-.05.56-.1.82-.13.1-.01.19-.03.28-.04.12-.19.25-.37.4-.53.18-.18.4-.37.63-.55-.09,0-.17.02-.27.03-.23.01-.46.02-.72.04Z"/>
                <path className="abc-117" d="M1328.99,408.1c-.1.1-.22.2-.33.31-.21.2-.45.4-.66.61.27-.01.49-.02.72-.04.1,0,.18-.02.27-.03.23-.18.49-.36.74-.54.14-.09.27-.18.41-.27-.1,0-.19,0-.3,0-.24-.01-.52-.03-.85-.04Z"/>
                <path className="abc-92" d="M1329.55,407.56c-.08.09-.16.17-.25.24-.09.09-.2.19-.3.29.33.01.61.03.85.04.11,0,.2,0,.3,0,.14-.09.27-.17.41-.25.12-.06.24-.14.37-.23-.11-.01-.22-.02-.34-.03-.28-.02-.63-.04-1.03-.06Z"/>
                <path className="abc-89" d="M1329.9,407.08c-.05.06-.09.13-.14.19-.07.1-.12.2-.21.29.4.02.75.04,1.03.06.12,0,.23.02.34.03.13-.09.25-.19.37-.29.08-.06.16-.13.23-.19-.14,0-.28,0-.41,0-.35-.02-.76-.06-1.21-.08Z"/>
                <path className="abc-163" d="M1330.21,406.69c-.05.07-.11.13-.17.2-.05.07-.09.13-.14.19.45.03.86.06,1.21.08.13,0,.27,0,.41,0,.07-.06.14-.12.21-.18.09-.07.17-.14.25-.22-.14,0-.27,0-.42,0-.39-.02-.85-.05-1.35-.08Z"/>
                <path className="abc-233" d="M1330.5,406.24c-.05.08-.1.16-.15.24-.05.07-.1.14-.15.21.5.03.96.06,1.35.08.14,0,.28,0,.42,0,.07-.07.14-.15.21-.23.07-.09.14-.17.21-.26-.13,0-.26.02-.42.01-.44-.01-.93-.04-1.47-.06Z"/>
                <path className="abc-176" d="M1330.67,405.91s-.02.05-.04.08c-.04.09-.09.17-.13.25.53.02,1.03.04,1.47.06.16,0,.29,0,.42-.01.07-.09.13-.18.2-.26.02-.03.04-.06.06-.08-.14,0-.3,0-.46,0-.47-.01-.98-.02-1.52-.03Z"/>
                <path className="abc-176" d="M1330.77,405.56c-.02.09-.03.18-.06.27-.01.03-.03.05-.04.08.55,0,1.06.02,1.52.03.16,0,.31,0,.46,0,.02-.03.05-.05.07-.08.03-.09.04-.19.05-.29-.15,0-.31,0-.46,0-.46,0-.99-.01-1.54-.01Z"/>
                <path className="abc-246" d="M1330.8,405.08c0,.07,0,.13,0,.2,0,.09,0,.18-.03.28.56,0,1.08,0,1.54.01.16,0,.31,0,.46,0,0-.1,0-.19-.01-.29,0-.07-.02-.14-.03-.21-.14,0-.28,0-.42,0-.45,0-.97,0-1.51,0Z"/>
                <path className="abc-283" d="M1330.78,404.6c0,.09.02.18.02.28,0,.07,0,.13,0,.2.54,0,1.05,0,1.51,0,.14,0,.28,0,.42,0-.01-.07-.03-.14-.04-.21-.02-.09-.03-.19-.05-.28-.14,0-.28,0-.43,0-.44,0-.93,0-1.43.01Z"/>
                <path className="abc-382" d="M1330.68,403.88c.03.15.06.3.07.44,0,.09.03.19.03.28.5,0,.99,0,1.43-.01.14,0,.29,0,.43,0-.02-.09-.03-.19-.06-.28-.05-.15-.12-.29-.19-.44-.13,0-.27,0-.41,0-.41,0-.85,0-1.3.01Z"/>
                <path className="abc-95" d="M1330.5,403.28c.02.05.04.11.05.16.05.15.09.3.12.45.45,0,.89-.01,1.3-.01.14,0,.27,0,.41,0-.08-.15-.17-.29-.27-.43-.03-.05-.07-.1-.11-.15-.12,0-.24,0-.36,0-.36,0-.75,0-1.14,0Z"/>
                <path className="abc-403" d="M1330.38,402.92c.02.06.05.13.07.19.02.05.04.11.06.16.39,0,.78,0,1.14,0,.12,0,.24,0,.36,0-.04-.05-.07-.1-.11-.15-.04-.06-.09-.12-.13-.18-.11,0-.22,0-.33,0-.34,0-.69-.01-1.05-.02Z"/>
                <path className="abc-375" d="M1330.31,402.73c.02.06.05.13.07.19.36,0,.71.01,1.05.02.11,0,.22,0,.33,0-.04-.06-.09-.12-.13-.18-.11,0-.21,0-.32,0-.33,0-.66-.02-1.01-.03Z"/>
                <path className="abc-71" d="M1324.58,411.26c-.11.13-.21.25-.3.37.1,0,.19,0,.29,0,.4,0,.79,0,1.18,0,.09-.14.2-.27.31-.42-.36.03-.73.05-1.12.05-.12,0-.23,0-.35,0Z"/>
                <path className="abc-329" d="M1325.36,410.29c-.14.19-.3.39-.44.57-.11.14-.23.28-.34.41.12,0,.23,0,.35,0,.39,0,.76-.03,1.12-.05.1-.15.24-.29.35-.44.13-.19.3-.39.45-.58-.29.05-.61.1-.99.12-.17,0-.33-.02-.5-.03Z"/>
                <path className="abc-185" d="M1326.26,409.04c-.16.22-.33.44-.47.67-.12.19-.27.39-.42.58.17.01.33.03.5.03.37-.02.69-.07.99-.12.15-.19.33-.38.5-.56.2-.21.44-.42.65-.63-.27.01-.58.03-.99.05-.23-.01-.49-.02-.75-.02Z"/>
                <path className="abc-387" d="M1326.89,408.05c-.06.11-.13.21-.19.33-.13.22-.28.44-.44.66.26,0,.52.01.75.02.41-.02.72-.04.99-.05.21-.21.46-.41.66-.61.11-.1.23-.21.33-.31-.33-.01-.73-.02-1.2-.03-.29,0-.59-.01-.9-.02Z"/>
                <path className="abc-361" d="M1327.13,407.48c-.02.09-.05.18-.09.26-.04.1-.09.2-.15.31.32,0,.62,0,.9.02.47,0,.86.02,1.2.03.1-.1.21-.2.3-.29.1-.07.17-.16.25-.24-.4-.02-.85-.04-1.35-.05-.33,0-.69-.02-1.06-.03Z"/>
                <path className="abc-322" d="M1327.2,407.01c-.01.06-.02.13-.03.19,0,.1-.01.19-.03.28.37.01.73.02,1.06.03.5.01.95.03,1.35.05.08-.09.14-.19.21-.29.05-.06.09-.13.14-.19-.45-.03-.95-.05-1.47-.06-.39,0-.8-.01-1.23-.01Z"/>
                <path className="abc-182" d="M1327.29,406.62c0,.07-.02.13-.04.2-.02.06-.04.13-.05.19.43,0,.84,0,1.23.01.52,0,1.02.03,1.47.06.05-.06.09-.13.14-.19.06-.07.11-.13.17-.2-.5-.03-1.04-.05-1.58-.06-.43,0-.87,0-1.34-.01Z"/>
                <path className="abc-306" d="M1327.32,406.19c0,.08,0,.15-.01.23,0,.07-.01.13-.02.2.46,0,.91,0,1.34.01.55,0,1.08.03,1.58.06.05-.07.1-.14.15-.21.05-.08.1-.16.15-.24-.53-.02-1.1-.04-1.69-.04-.48,0-.98,0-1.49,0Z"/>
                <path className="abc-328" d="M1327.35,405.88s0,.05-.01.07c-.01.08-.01.16-.02.24.51,0,1.01,0,1.49,0,.59,0,1.16.02,1.69.04.05-.08.09-.17.13-.25.01-.03.02-.06.04-.08-.55,0-1.13-.02-1.75-.02-.51,0-1.04,0-1.58,0Z"/>
                <path className="abc-328" d="M1327.43,405.54c-.02.09-.05.18-.07.27,0,.02-.01.05-.02.07.54,0,1.07,0,1.58,0,.61,0,1.2.01,1.75.02.01-.03.03-.05.04-.08.03-.09.04-.18.06-.27-.56,0-1.14,0-1.73-.01-.52,0-1.05,0-1.61,0Z"/>
                <path className="abc-151" d="M1327.54,405.06c-.01.07-.03.13-.04.2-.02.09-.05.19-.07.28.55,0,1.09,0,1.61,0,.59,0,1.18,0,1.73.01.02-.09.02-.18.03-.28,0-.07,0-.13,0-.2-.54,0-1.1,0-1.64,0-.52,0-1.06-.01-1.62-.01Z"/>
                <path className="abc-124" d="M1327.63,404.58c-.01.09-.03.18-.04.28-.01.07-.02.14-.04.2.56,0,1.1,0,1.62.01.54,0,1.1,0,1.64,0,0-.07,0-.13,0-.2,0-.09-.01-.18-.02-.28-.5,0-1.02,0-1.53,0-.52,0-1.07-.01-1.62-.02Z"/>
                <path className="abc-289" d="M1327.67,403.86c0,.15,0,.3-.01.45,0,.09-.01.19-.03.28.56,0,1.1.01,1.62.02.5,0,1.02,0,1.53,0,0-.09-.02-.18-.03-.28-.01-.15-.04-.3-.07-.44-.45,0-.91,0-1.36,0-.53-.01-1.08-.02-1.65-.03Z"/>
                <path className="abc-451" d="M1327.66,403.23c0,.06,0,.11,0,.17,0,.16,0,.31,0,.46.57,0,1.12.02,1.65.03.45,0,.91,0,1.36,0-.03-.15-.08-.3-.12-.45-.02-.05-.03-.11-.05-.16-.39,0-.79,0-1.19,0-.53-.01-1.08-.02-1.65-.04Z"/>
                <path className="abc-228" d="M1327.63,402.86c0,.07.02.14.02.2,0,.06,0,.11.01.17.57.01,1.12.02,1.65.04.4,0,.8,0,1.19,0-.02-.05-.04-.11-.06-.16-.02-.06-.05-.13-.07-.19-.36,0-.72-.01-1.1-.02-.54-.01-1.09-.03-1.65-.04Z"/>
                <path className="abc-231" d="M1327.6,402.66c.01.07.02.14.03.21.56.01,1.11.03,1.65.04.37,0,.74.02,1.1.02-.02-.06-.05-.13-.07-.19-.34,0-.69-.02-1.05-.03-.54-.01-1.09-.03-1.65-.04Z"/>
                <path className="abc-271" d="M1323.84,411.22c-.06.14-.12.29-.16.42.1,0,.21,0,.31,0,.1,0,.19,0,.29,0,.09-.12.19-.24.3-.37-.12,0-.23-.01-.35-.02-.13,0-.26-.02-.39-.03Z"/>
                <path className="abc-265" d="M1324.25,410.19c-.06.19-.14.39-.21.57-.06.15-.14.3-.2.45.13,0,.26.02.39.03.12,0,.24.02.35.02.11-.13.23-.26.34-.41.14-.18.3-.38.44-.57-.17-.01-.34-.03-.53-.05-.2-.01-.39-.03-.59-.05Z"/>
                <path className="abc-298" d="M1324.5,409c-.05.19-.11.38-.14.57,0,.02,0,.04-.01.06,0,.18-.05.37-.11.57.2.02.39.03.59.05.19.01.36.03.53.05.14-.19.29-.39.42-.58.15-.23.32-.45.47-.67-.26,0-.54,0-.82-.02-.29,0-.61-.01-.94-.02Z"/>
                <path className="abc-341" d="M1324.72,408.04c0,.11-.03.22-.05.33-.04.22-.11.42-.17.63.33,0,.64.01.94.02.28,0,.55.01.82.02.16-.22.32-.44.44-.66.06-.11.14-.22.19-.33-.32,0-.65,0-1,0-.37,0-.76,0-1.17,0Z"/>
                <path className="abc-54" d="M1324.63,407.45c.05.09.08.18.09.26h0c.02.11.01.22,0,.33.41,0,.8,0,1.17,0,.35,0,.68,0,1,0,.06-.11.11-.21.15-.31.04-.08.07-.17.09-.26-.37-.01-.76-.02-1.17-.03-.43,0-.88,0-1.34,0Z"/>
                <path className="abc-243" d="M1324.36,407c.03.06.06.12.1.18.06.09.12.18.17.27.46,0,.9,0,1.34,0,.41,0,.8.01,1.17.03.02-.09.03-.19.03-.28.01-.06.02-.12.03-.19-.43,0-.88,0-1.33,0-.49,0-.99,0-1.51,0Z"/>
                <path className="abc-162" d="M1324.26,406.61c.03.07.05.13.05.2,0,.06.02.13.05.19.52,0,1.02,0,1.51,0,.46,0,.9,0,1.33,0,.01-.06.03-.13.05-.19.02-.07.03-.13.04-.2-.46,0-.94,0-1.43,0-.52,0-1.06,0-1.6,0Z"/>
                <path className="abc-138" d="M1324.01,406.19c.04.08.1.15.14.23.04.07.08.13.1.2.54,0,1.08,0,1.6,0,.49,0,.97,0,1.43,0,0-.07.01-.13.02-.2,0-.08,0-.15.01-.23-.51,0-1.04,0-1.57,0-.57,0-1.15,0-1.73,0Z"/>
                <path className="abc-368" d="M1323.88,405.88s.01.05.02.07c.02.08.07.16.11.24.59,0,1.17,0,1.73,0,.53,0,1.06,0,1.57,0,0-.08,0-.16.02-.24,0-.02,0-.05.01-.07-.54,0-1.1,0-1.66,0-.6,0-1.2,0-1.81,0Z"/>
                <path className="abc-368" d="M1323.88,405.53c0,.09-.02.18-.01.27,0,.03,0,.05.01.08.61,0,1.22,0,1.81,0,.56,0,1.11,0,1.66,0,0-.02,0-.05.02-.07.02-.09.05-.18.07-.27-.55,0-1.12,0-1.69,0-.61,0-1.23,0-1.86,0Z"/>
                <path className="abc-145" d="M1323.95,405.06c-.01.07-.03.14-.03.2-.01.09-.03.18-.04.28.63,0,1.25,0,1.86,0,.57,0,1.14,0,1.69,0,.02-.09.05-.18.07-.28.01-.07.03-.13.04-.2-.56,0-1.13,0-1.71,0-.62,0-1.25,0-1.88,0Z"/>
                <path className="abc-124" d="M1324,404.57c0,.09-.01.19-.02.28,0,.07-.02.14-.03.21.63,0,1.27,0,1.88,0,.58,0,1.15,0,1.71,0,.01-.07.03-.13.04-.2.02-.09.03-.18.04-.28-.56,0-1.13,0-1.72,0-.62,0-1.26,0-1.9,0Z"/>
                <path className="abc-124" d="M1323.98,403.82c0,.16,0,.31.02.46.01.1,0,.19,0,.29.64,0,1.28,0,1.9,0,.59,0,1.16,0,1.72,0,.01-.09.02-.19.03-.28,0-.15,0-.29.01-.45-.57,0-1.16-.01-1.75-.02-.63,0-1.28-.01-1.93-.01Z"/>
                <path className="abc-209" d="M1324,403.17c0,.06,0,.12,0,.18,0,.16-.01.32-.02.47.66,0,1.3,0,1.93.01.59,0,1.18.01,1.75.02,0-.15,0-.3,0-.46,0-.06,0-.11,0-.17-.57-.01-1.15-.02-1.74-.03-.63-.01-1.27-.02-1.92-.03Z"/>
                <path className="abc-183" d="M1323.99,402.78c0,.07.01.14.01.21,0,.06,0,.12,0,.18.65,0,1.29.02,1.92.03.59,0,1.17.02,1.74.03,0-.06,0-.11-.01-.17,0-.07-.01-.13-.02-.2-.56-.01-1.14-.03-1.73-.04-.63-.01-1.27-.03-1.91-.04Z"/>
                <path className="abc-10" d="M1323.96,402.56c.01.07.02.15.03.22.65.01,1.29.03,1.91.04.59.01,1.17.03,1.73.04,0-.07-.02-.14-.03-.21-.56-.01-1.14-.03-1.73-.05-.63-.02-1.26-.03-1.91-.05Z"/>
                <path className="abc-32" d="M1322.99,411.18c0,.16.02.31.04.45.11,0,.23,0,.34,0,.1,0,.21,0,.31,0,.04-.13.1-.27.16-.42-.13,0-.27-.02-.41-.02-.15,0-.3-.01-.44-.02Z"/>
                <path className="abc-364" d="M1322.85,410.11c.05.19.07.4.1.59.02.16.03.32.04.47.14,0,.29.02.44.02.14,0,.28.01.41.02.06-.14.14-.3.2-.45.07-.19.15-.38.21-.57-.2-.02-.41-.03-.64-.04-.25-.01-.5-.03-.76-.04Z"/>
                <path className="abc-304" d="M1322.32,408.96c.07.18.15.37.25.54,0,.02.01.03.02.05.13.18.2.37.25.57.26.02.51.03.76.04.23,0,.44.02.64.04.06-.19.1-.38.11-.57,0-.02,0-.04.01-.06.02-.19.08-.38.14-.57-.33,0-.67-.01-1.01-.02-.38,0-.77-.02-1.17-.02Z"/>
                <path className="abc-156" d="M1321.95,408.02c.05.11.09.22.14.33.09.2.16.41.24.61.4,0,.79.01,1.17.02.35,0,.69.01,1.01.02.06-.21.13-.42.17-.63.02-.11.04-.22.05-.33-.41,0-.83,0-1.27,0-.48,0-.99,0-1.5,0Z"/>
                <path className="abc-265" d="M1321.51,407.44c.09.08.19.17.25.26t0,0c.08.11.13.22.18.33.51,0,1.02,0,1.5,0,.44,0,.87,0,1.27,0,0-.11.01-.22,0-.33h0c0-.09-.04-.18-.09-.26-.46,0-.94,0-1.43,0-.54,0-1.11,0-1.69,0Z"/>
                <path className="abc-163" d="M1321.03,407c.06.06.13.12.18.18.09.09.21.17.3.26.58,0,1.14,0,1.69,0,.49,0,.97,0,1.43,0-.05-.09-.11-.18-.17-.27-.03-.06-.07-.12-.1-.18-.52,0-1.04,0-1.58,0-.58,0-1.17,0-1.76,0Z"/>
                <path className="abc-320" d="M1320.75,406.62c.06.07.11.13.14.19.03.06.08.13.14.19.59,0,1.17,0,1.76,0,.53,0,1.06,0,1.58,0-.03-.06-.05-.13-.05-.19,0-.06-.03-.13-.05-.2-.54,0-1.09,0-1.65,0-.61,0-1.24,0-1.86,0Z"/>
                <path className="abc-116" d="M1320.33,406.19c.07.08.17.15.23.23.06.07.13.13.19.2.62,0,1.24,0,1.86,0,.56,0,1.11,0,1.65,0-.03-.07-.07-.13-.1-.2-.04-.08-.1-.15-.14-.23-.59,0-1.18,0-1.77,0-.65,0-1.29,0-1.92,0Z"/>
                <path className="abc-306" d="M1320.08,405.87s.03.05.04.08c.05.08.13.16.21.24.63,0,1.27,0,1.92,0,.59,0,1.18,0,1.77,0-.05-.08-.09-.16-.11-.24,0-.02-.02-.05-.02-.07-.61,0-1.22,0-1.83,0-.67,0-1.33,0-1.97,0Z"/>
                <path className="abc-306" d="M1319.99,405.54c.01.08.02.17.05.25,0,.03.02.05.03.08.64,0,1.3,0,1.97,0,.61,0,1.22,0,1.83,0,0-.02-.01-.05-.01-.08,0-.09,0-.18.01-.27-.63,0-1.25,0-1.87,0-.68,0-1.35,0-2.01.01Z"/>
                <path className="abc-378" d="M1319.96,405.09c0,.06,0,.13,0,.19.01.09.01.18.03.26.66,0,1.33-.01,2.01-.01.62,0,1.25,0,1.87,0,0-.09.03-.18.04-.28,0-.07.02-.13.03-.2-.63,0-1.27,0-1.91,0-.7,0-1.4.01-2.08.03Z"/>
                <path className="abc-124" d="M1319.92,404.58c.01.11.01.21.02.3,0,.07,0,.14,0,.2.69-.02,1.38-.03,2.08-.03.64,0,1.28,0,1.91,0,.01-.07.02-.14.03-.21,0-.09.02-.19.02-.28-.64,0-1.29,0-1.94,0-.71,0-1.43,0-2.14.02Z"/>
                <path className="abc-124" d="M1319.83,403.8c0,.16,0,.32.05.47.03.1.04.2.05.31.71,0,1.43-.02,2.14-.02.65,0,1.3,0,1.94,0,0-.09,0-.19,0-.29-.02-.15-.02-.3-.02-.46-.66,0-1.32,0-1.98-.01-.72,0-1.45,0-2.17,0Z"/>
                <path className="abc-257" d="M1319.82,403.12c0,.06,0,.12,0,.19.01.17,0,.33,0,.49.72,0,1.45,0,2.17,0,.66,0,1.32.01,1.98.01,0-.16.01-.31.02-.47,0-.06,0-.12,0-.18-.65,0-1.31-.02-1.97-.03-.73-.01-1.47-.02-2.21-.02Z"/>
                <path className="abc-198" d="M1319.8,402.7c0,.08,0,.16.01.23,0,.06,0,.13,0,.19.74,0,1.48,0,2.21.02.66.01,1.32.02,1.97.03,0-.06,0-.12,0-.18,0-.07,0-.14-.01-.21-.65-.01-1.3-.03-1.97-.04-.73-.02-1.47-.03-2.22-.04Z"/>
                <path className="abc-71" d="M1319.77,402.46c.02.08.02.15.03.23.75.01,1.49.03,2.22.04.66.01,1.32.03,1.97.04,0-.07-.02-.14-.03-.22-.65-.02-1.31-.03-1.97-.05-.73-.02-1.47-.03-2.21-.05Z"/>
                <path className="abc-49" d="M1322.19,411.14c.08.17.15.33.23.49.09,0,.18,0,.27,0,.12,0,.23,0,.34,0-.02-.15-.03-.3-.04-.45-.14,0-.29-.02-.45-.02-.12,0-.24-.01-.35-.02Z"/>
                <path className="abc-394" d="M1321.43,410.03c.18.2.33.4.47.6.12.17.2.34.29.5.12,0,.23.01.35.02.16,0,.3.02.45.02,0-.16-.02-.31-.04-.47-.03-.2-.05-.4-.1-.59-.26-.02-.52-.03-.79-.05-.21-.01-.42-.02-.63-.03Z"/>
                <path className="abc-312" d="M1320.11,408.94c.23.19.45.37.69.54.25.17.45.36.63.55.21.01.42.02.63.03.27.01.53.03.79.05-.05-.19-.12-.39-.25-.57,0-.02-.01-.03-.02-.05-.1-.17-.18-.35-.25-.54-.4,0-.81,0-1.23-.01-.32,0-.65,0-.99,0Z"/>
                <path className="abc-126" d="M1319.09,408.03c.12.11.23.23.35.34.22.19.44.38.66.57.33,0,.66,0,.99,0,.42,0,.83,0,1.23.01-.08-.2-.15-.41-.24-.61-.05-.11-.09-.22-.14-.33-.51,0-1.04,0-1.58,0-.41,0-.84,0-1.27,0Z"/>
                <path className="abc-33" d="M1318.41,407.43c.1.08.21.17.31.25.13.11.25.23.37.34.43,0,.86,0,1.27,0,.54,0,1.07,0,1.58,0-.05-.11-.1-.22-.18-.33t0,0c-.06-.09-.16-.17-.25-.26-.58,0-1.16,0-1.75,0-.45,0-.9,0-1.35,0Z"/>
                <path className="abc-350" d="M1317.91,407c.06.06.14.12.2.18.1.09.21.17.31.26.45,0,.91,0,1.35,0,.58,0,1.17,0,1.75,0-.09-.08-.21-.17-.3-.26-.06-.06-.13-.12-.18-.18-.59,0-1.18,0-1.77,0-.45,0-.9,0-1.35,0Z"/>
                <path className="abc-1" d="M1317.54,406.62c.06.07.13.13.19.19.05.06.12.13.18.19.45,0,.89,0,1.35,0,.59,0,1.18,0,1.77,0-.06-.06-.11-.12-.14-.19-.03-.06-.08-.13-.14-.19-.62,0-1.24,0-1.84,0-.46,0-.92,0-1.37,0Z"/>
                <path className="abc-230" d="M1317.12,406.18c.07.08.15.16.22.23.06.07.13.13.2.2.45,0,.91,0,1.37,0,.6,0,1.22,0,1.84,0-.06-.07-.13-.13-.19-.2-.07-.08-.16-.15-.23-.23-.63,0-1.25,0-1.86,0-.46,0-.91,0-1.35,0Z"/>
                <path className="abc-431" d="M1316.86,405.86s.04.05.06.08c.06.08.13.16.21.24.44,0,.89,0,1.35,0,.6,0,1.22,0,1.86,0-.07-.08-.16-.16-.21-.24-.01-.02-.03-.05-.04-.08-.64,0-1.27,0-1.88,0-.46,0-.91,0-1.35,0Z"/>
                <path className="abc-431" d="M1316.67,405.55c.04.08.08.15.13.24.02.03.04.05.05.08.43,0,.88,0,1.35,0,.61,0,1.23,0,1.88,0-.01-.03-.02-.05-.03-.08-.03-.09-.04-.17-.05-.25-.66,0-1.3.01-1.93.01-.48,0-.94,0-1.39,0Z"/>
                <path className="abc-294" d="M1316.47,405.12c.03.06.05.12.08.19.04.09.08.16.12.25.45,0,.91,0,1.39,0,.63,0,1.27,0,1.93-.01-.01-.08-.02-.17-.03-.26,0-.07,0-.13,0-.19-.69.02-1.36.03-2.02.04-.5,0-1,0-1.47-.01Z"/>
                <path className="abc-124" d="M1316.28,404.59c.03.11.06.24.1.33.03.07.05.13.08.19.48.01.97.02,1.47.01.66,0,1.33-.03,2.02-.04,0-.06,0-.13,0-.2-.01-.09-.01-.2-.02-.3-.71,0-1.41.02-2.09.02-.52,0-1.04,0-1.54-.01Z"/>
                <path className="abc-124" d="M1316.04,403.77c.04.16.07.31.14.47.04.1.07.23.1.34.5.01,1.02.01,1.54.01.68,0,1.38-.01,2.09-.02-.01-.11-.02-.21-.05-.31-.04-.15-.04-.31-.05-.47-.72,0-1.45,0-2.16,0-.55,0-1.09,0-1.62-.02Z"/>
                <path className="abc-39" d="M1315.9,403.08c.01.07.02.13.04.2.04.18.07.34.11.5.53,0,1.07.01,1.62.02.72,0,1.44,0,2.16,0,0-.16,0-.32,0-.49,0-.06,0-.12,0-.19-.74,0-1.49,0-2.23-.01-.57,0-1.13-.02-1.69-.03Z"/>
                <path className="abc-31" d="M1315.83,402.62c.01.08.02.17.04.25.01.07.02.14.03.2.56.01,1.13.02,1.69.03.74,0,1.49.01,2.23.01,0-.06,0-.13,0-.19,0-.08,0-.15-.01-.23-.75-.01-1.5-.03-2.24-.04-.57-.01-1.15-.02-1.73-.03Z"/>
                <path className="abc-237" d="M1315.78,402.37c.02.08.03.17.04.25.58.01,1.16.02,1.73.03.75.01,1.5.03,2.24.04,0-.08-.02-.16-.03-.23-.75-.02-1.5-.03-2.25-.05-.58-.01-1.16-.03-1.74-.04Z"/>
                <path className="abc-261" d="M1319.56,411.14c.09.16.16.33.23.48.79,0,1.57,0,2.35,0,.09,0,.18,0,.27,0-.08-.16-.14-.33-.23-.49-.12,0-.24,0-.37-.01-.74,0-1.5,0-2.26.02Z"/>
                <path className="abc-23" d="M1318.82,410.06c.17.19.32.39.45.59.11.16.2.33.29.49.76,0,1.52-.01,2.26-.02.13,0,.25,0,.37.01-.08-.17-.17-.34-.29-.5-.14-.21-.29-.41-.47-.6-.21-.01-.43-.02-.66-.03-.63.01-1.29.03-1.95.05Z"/>
                <path className="abc-302" d="M1317.59,408.95c.21.19.43.37.65.56.22.17.41.36.58.55.66-.02,1.32-.04,1.95-.05.22,0,.44.02.66.03-.18-.2-.38-.38-.63-.55-.24-.17-.46-.35-.69-.54-.33,0-.67,0-1.02-.01-.49.01-.99.01-1.5.02Z"/>
                <path className="abc-240" d="M1316.63,408.03c.11.11.22.22.33.33.2.2.41.39.63.58.51,0,1.01,0,1.5-.02.35,0,.69,0,1.02.01-.23-.19-.44-.38-.66-.57-.12-.11-.24-.22-.35-.34-.43,0-.87,0-1.32,0-.37,0-.75,0-1.14,0Z"/>
                <path className="abc-203" d="M1316.09,407.42c.07.09.15.18.22.27.11.12.22.23.32.35.39,0,.77,0,1.14,0,.44,0,.88,0,1.32,0-.12-.11-.24-.23-.37-.34-.1-.09-.21-.17-.31-.25-.45,0-.91,0-1.37,0-.32,0-.64,0-.96-.01Z"/>
                <path className="abc-334" d="M1315.72,406.96c.05.06.1.12.15.18.07.09.15.18.23.27.32,0,.64.01.96.01.46,0,.91,0,1.37,0-.1-.08-.21-.17-.31-.26-.06-.06-.14-.12-.2-.18-.45,0-.89,0-1.32,0-.29,0-.58-.01-.86-.03Z"/>
                <path className="abc-201" d="M1315.44,406.58c.04.07.09.13.13.2.04.06.09.13.14.19.28.02.57.03.86.03.44,0,.88,0,1.32,0-.06-.06-.13-.12-.18-.19-.05-.06-.12-.13-.19-.19-.45,0-.89,0-1.31,0-.27,0-.53-.02-.78-.03Z"/>
                <path className="abc-434" d="M1315.15,406.15c.05.08.1.16.16.23.05.07.09.13.14.2.25.02.51.03.78.03.42,0,.86,0,1.31,0-.06-.07-.14-.13-.2-.2-.07-.08-.15-.16-.22-.23-.44,0-.86,0-1.26,0-.24,0-.48-.01-.7-.03Z"/>
                <path className="abc-424" d="M1314.96,405.84s.03.05.04.07c.05.08.1.16.15.24.23.01.46.02.7.03.41,0,.83,0,1.26,0-.07-.08-.15-.16-.21-.24-.02-.03-.04-.05-.06-.08-.43,0-.85,0-1.24-.01-.22,0-.44,0-.65-.01Z"/>
                <path className="abc-440" d="M1314.77,405.43c.05.11.1.22.14.33.01.02.03.05.04.07.21,0,.43.01.65.01.39,0,.81,0,1.24.01-.02-.03-.04-.05-.05-.08-.05-.09-.09-.15-.13-.24-.45,0-.88-.02-1.29-.04-.22,0-.42-.04-.61-.07Z"/>
                <path className="abc-357" d="M1314.52,404.89c.04.07.07.15.11.22.05.11.1.21.15.32.19.03.39.06.61.07.41.02.85.03,1.29.04-.04-.08-.08-.15-.12-.25-.03-.07-.06-.12-.08-.19-.48-.01-.94-.04-1.38-.09-.21-.02-.39-.07-.57-.13Z"/>
                <path className="abc-219" d="M1314.25,404.38c.06.1.11.2.16.3.04.07.07.14.11.22.18.06.36.11.57.13.44.05.91.07,1.38.09-.03-.06-.05-.12-.08-.19-.04-.09-.07-.22-.1-.33-.5-.01-.99-.03-1.47-.06-.21-.04-.4-.09-.57-.15Z"/>
                <path className="abc-14" d="M1313.79,403.61c.1.16.19.31.28.46.06.1.12.2.17.3.18.06.36.11.57.15.47.03.96.05,1.47.06-.03-.11-.06-.24-.1-.34-.06-.16-.1-.31-.14-.47-.53,0-1.06-.02-1.57-.04-.26-.03-.47-.08-.68-.12Z"/>
                <path className="abc-370" d="M1313.39,402.95c.04.06.07.12.11.18.1.17.19.33.29.49.21.04.43.09.68.12.51.02,1.04.03,1.57.04-.04-.16-.06-.32-.11-.5-.02-.06-.03-.13-.04-.2-.56-.01-1.12-.03-1.67-.06-.31-.01-.57-.04-.84-.08Z"/>
                <path className="abc-367" d="M1313.15,402.54c.05.07.09.15.13.22.04.06.07.12.11.18.26.03.53.06.84.08.55.02,1.11.04,1.67.06-.01-.07-.02-.14-.03-.2-.01-.08-.02-.17-.04-.25-.58-.01-1.15-.02-1.72-.04-.33,0-.65-.03-.96-.04Z"/>
                <path className="abc-426" d="M1313.01,402.31c.05.07.09.15.14.22.31.02.63.03.96.04.57.02,1.14.03,1.72.04-.01-.08-.03-.17-.04-.25-.58-.01-1.16-.03-1.74-.04-.35,0-.69-.01-1.03-.02Z"/>
                <path className="abc-284" d="M1315.08,411.18c.02.15.03.3.05.45.76,0,1.53,0,2.31,0,.78,0,1.57,0,2.35,0-.07-.16-.15-.32-.23-.48-.76,0-1.52.01-2.26.02-.74,0-1.48.01-2.22.02Z"/>
                <path className="abc-100" d="M1314.9,410.17c.05.19.08.38.11.56.03.15.05.3.07.45.73,0,1.48-.02,2.22-.02.74,0,1.5-.01,2.26-.02-.09-.16-.18-.33-.29-.49-.13-.2-.28-.4-.45-.59-.66.02-1.33.04-1.97.05-.64.01-1.3.03-1.95.06Z"/>
                <path className="abc-141" d="M1314.57,408.99c.06.21.11.42.17.62.06.18.11.37.16.55.65-.02,1.31-.04,1.95-.06.64-.01,1.31-.03,1.97-.05-.17-.19-.36-.38-.58-.55-.22-.18-.44-.37-.65-.56-.51,0-1.02,0-1.52.02-.5.01-1,.02-1.5.02Z"/>
                <path className="abc-158" d="M1314.31,408.03c.03.11.06.22.09.33.06.21.11.42.17.63.5,0,1-.01,1.5-.02.5-.01,1.01-.02,1.52-.02-.21-.19-.42-.38-.63-.58-.11-.11-.22-.22-.33-.33-.39,0-.77,0-1.15,0-.38,0-.77,0-1.17,0Z"/>
                <path className="abc-166" d="M1314.15,407.39c.02.1.05.2.07.31.03.11.06.22.09.34.39,0,.78,0,1.17,0,.38,0,.77,0,1.15,0-.11-.11-.22-.23-.32-.35-.07-.09-.15-.18-.22-.27-.32,0-.64-.02-.96-.02-.32,0-.65-.01-.98-.02Z"/>
                <path className="abc-426" d="M1314.03,406.89c.02.06.03.13.05.19.03.1.05.2.08.3.33,0,.65.01.98.02.32,0,.64.01.96.02-.07-.09-.15-.18-.23-.27-.05-.06-.1-.12-.15-.18-.28-.02-.57-.03-.85-.04-.17,0-.33-.01-.5-.02-.11,0-.23,0-.34-.01Z"/>
                <path className="abc-335" d="M1313.94,406.5c.02.07.03.13.05.2.02.06.02.13.04.19.11,0,.23,0,.34.01.17,0,.34.01.5.02.28.01.56.03.85.04-.05-.06-.09-.12-.14-.19-.04-.06-.09-.13-.13-.2-.25-.02-.5-.04-.75-.05-.15,0-.3-.01-.45-.02-.1,0-.2,0-.3-.01Z"/>
                <path className="abc-408" d="M1313.83,406.09c.02.07.04.14.06.22.02.07.04.13.05.2.1,0,.2.01.3.01.15,0,.3.01.45.02.25.01.5.03.75.05-.04-.07-.09-.13-.14-.2-.05-.08-.11-.15-.16-.23-.23-.01-.45-.03-.66-.03-.22,0-.44-.02-.66-.03Z"/>
                <path className="abc-377" d="M1313.76,405.81s0,.04,0,.07c.02.07.04.14.06.21.22,0,.44.02.66.03.21,0,.44.02.66.03-.05-.08-.1-.16-.15-.24-.01-.02-.03-.05-.04-.07-.21,0-.42-.01-.61-.02-.12,0-.23,0-.35,0-.08,0-.16,0-.24,0Z"/>
                <path className="abc-73" d="M1313.67,405.28c.03.14.06.3.09.46,0,.02,0,.04,0,.07.08,0,.16,0,.24,0,.11,0,.23,0,.35,0,.19,0,.4,0,.61.02-.01-.02-.03-.05-.04-.07-.05-.11-.1-.22-.14-.33-.19-.03-.37-.07-.56-.09-.11-.01-.22-.03-.32-.04-.07,0-.15-.02-.23-.03Z"/>
                <path className="abc-253" d="M1313.46,404.6c.03.08.07.18.1.27.04.13.08.27.11.41.08.01.15.02.23.03.11.01.21.03.32.04.18.02.37.05.56.09-.05-.11-.1-.21-.15-.32-.04-.08-.07-.15-.11-.22-.18-.06-.34-.12-.52-.16-.16-.04-.35-.09-.54-.14Z"/>
                <path className="abc-191" d="M1313.18,404.05c.07.1.12.2.17.31.03.07.08.16.11.24.19.05.38.11.54.14.17.04.34.1.52.16-.04-.07-.07-.14-.11-.22-.05-.1-.11-.2-.16-.3-.18-.06-.34-.12-.52-.16-.1-.03-.21-.06-.33-.1-.07-.02-.15-.04-.22-.07Z"/>
                <path className="abc-442" d="M1312.49,403.36c.16.14.33.28.46.42.09.09.16.17.23.27.07.02.14.04.22.07.12.03.23.07.33.1.18.05.34.11.52.16-.06-.1-.11-.2-.17-.3-.09-.15-.18-.3-.28-.46-.21-.04-.41-.09-.64-.13-.14-.02-.26-.05-.4-.08-.09-.02-.17-.03-.25-.05Z"/>
                <path className="abc-90" d="M1311.74,402.77c.07.05.14.1.21.15.19.14.38.29.54.43.08.02.17.03.25.05.14.03.26.06.4.08.23.04.43.08.64.13-.1-.16-.19-.32-.29-.49-.04-.06-.07-.12-.11-.18-.26-.03-.53-.07-.82-.09-.28-.03-.56-.06-.84-.08Z"/>
                <path className="abc-19" d="M1311.24,402.45c.09.06.19.12.28.18.08.05.15.1.22.15.28.03.56.06.84.08.29.02.55.05.82.09-.04-.06-.07-.12-.11-.18-.05-.07-.09-.15-.13-.22-.31-.02-.62-.04-.95-.05-.32-.01-.64-.03-.96-.04Z"/>
                <path className="abc-402" d="M1310.96,402.27c.1.06.19.12.29.18.32.01.64.03.96.04.32.01.64.03.95.05-.05-.07-.09-.15-.14-.22-.34,0-.69-.01-1.03-.02-.34,0-.68-.01-1.02-.02Z"/>
                <path className="abc-169" d="M1312.09,411.21c0,.14-.02.29-.03.43.28,0,.57,0,.86,0,.72,0,1.46,0,2.22,0-.02-.15-.03-.3-.05-.45-.73,0-1.45.02-2.13.03-.29,0-.58,0-.86,0Z"/>
                <path className="abc-128" d="M1312.15,410.23c-.01.18-.02.37-.03.55,0,.15-.02.29-.03.44.28,0,.57,0,.86,0,.68,0,1.4-.02,2.13-.03-.02-.15-.04-.3-.07-.45-.03-.19-.07-.38-.11-.56-.65.02-1.28.04-1.88.06-.29,0-.59,0-.88,0Z"/>
                <path className="abc-316" d="M1312.21,409.02c0,.22-.02.44-.04.66-.01.18-.02.37-.03.55.29,0,.58,0,.88,0,.6-.01,1.23-.04,1.88-.06-.05-.19-.1-.37-.16-.55-.06-.21-.11-.41-.17-.62-.5,0-.99.01-1.47.03-.3,0-.59,0-.88,0Z"/>
                <path className="abc-180" d="M1312.24,408.03c0,.11,0,.22,0,.34,0,.21-.01.43-.02.65.29,0,.59,0,.88,0,.48-.01.97-.02,1.47-.03-.06-.21-.11-.42-.17-.63-.03-.11-.06-.22-.09-.33-.39,0-.78,0-1.17,0-.3,0-.61,0-.91,0Z"/>
                <path className="abc-166" d="M1312.3,407.38c-.03.11-.06.21-.06.32,0,.11,0,.22,0,.33.3,0,.61,0,.91,0,.38,0,.77,0,1.17,0-.03-.11-.06-.22-.09-.34-.02-.1-.04-.21-.07-.31-.33,0-.66,0-.98,0-.29,0-.58,0-.87,0Z"/>
                <path className="abc-346" d="M1312.4,406.87c-.01.07-.03.14-.03.2,0,.1-.04.21-.06.31.29,0,.58,0,.87,0,.33,0,.65,0,.98,0-.02-.1-.05-.2-.08-.3-.02-.06-.03-.13-.05-.19-.28-.01-.56-.03-.85-.03-.26,0-.51,0-.78,0Z"/>
                <path className="abc-65" d="M1312.45,406.46c-.01.07-.03.14-.03.2,0,.07-.01.13-.03.2.26,0,.52,0,.78,0,.29,0,.57.02.85.03-.02-.06-.02-.13-.04-.19-.01-.07-.03-.13-.05-.2-.25-.01-.5-.03-.77-.03-.23,0-.47,0-.72,0Z"/>
                <path className="abc-408" d="M1312.53,406.06c-.02.07-.04.14-.04.21,0,.06-.02.13-.03.2.25,0,.49,0,.72,0,.26,0,.52.02.77.03-.02-.07-.04-.13-.05-.2-.02-.07-.04-.15-.06-.22-.22,0-.44-.02-.66-.02-.2,0-.42,0-.64,0Z"/>
                <path className="abc-433" d="M1312.56,405.79s0,.04,0,.06c0,.07-.02.13-.03.2.22,0,.43,0,.64,0,.22,0,.44.01.66.02-.02-.07-.04-.14-.06-.21,0-.02,0-.04,0-.07-.2,0-.4,0-.61-.01-.19,0-.38,0-.59,0Z"/>
                <path className="abc-392" d="M1312.49,405.2c.03.17.06.35.07.53,0,.02,0,.04,0,.06.21,0,.4,0,.59,0,.21,0,.42,0,.61.01,0-.02,0-.04,0-.07-.02-.16-.06-.32-.09-.46-.18-.02-.37-.05-.57-.07-.19,0-.39-.01-.6-.01Z"/>
                <path className="abc-90" d="M1312.29,404.43c.03.09.07.19.1.29.04.15.08.31.11.47.21,0,.41,0,.6.01.2.02.39.04.57.07-.03-.14-.07-.29-.11-.41-.03-.09-.07-.19-.1-.27-.19-.05-.37-.1-.51-.12-.21-.02-.43-.03-.66-.04Z"/>
                <path className="abc-358" d="M1311.97,403.89c.09.09.16.18.22.3.03.07.07.16.1.25.23,0,.45.02.66.04.15.02.33.07.51.12-.03-.08-.08-.17-.11-.24-.05-.11-.1-.21-.17-.31-.18-.06-.36-.12-.52-.15-.22,0-.45-.01-.69-.01Z"/>
                <path className="abc-269" d="M1311.12,403.23c.21.14.41.29.56.41.11.09.21.16.3.25.24,0,.46,0,.69.01.16.03.34.09.52.15-.07-.1-.14-.18-.23-.27-.13-.14-.3-.28-.46-.42-.21-.04-.42-.09-.66-.12-.23,0-.47,0-.72,0Z"/>
                <path className="abc-318" d="M1310.16,402.68c.09.05.18.09.27.14.24.13.48.28.69.42.24,0,.48,0,.72,0,.24.03.44.08.66.12-.16-.14-.35-.29-.54-.43-.07-.05-.14-.1-.21-.15-.28-.03-.56-.05-.84-.07-.25-.01-.49-.02-.75-.03Z"/>
                <path className="abc-78" d="M1309.52,402.39c.12.05.24.1.35.15.1.04.19.09.28.13.25,0,.5.02.75.03.28.01.56.04.84.07-.07-.05-.15-.1-.22-.15-.09-.06-.18-.12-.28-.18-.32-.01-.64-.03-.95-.04-.25,0-.51-.01-.76-.02Z"/>
                <path className="abc-227" d="M1309.18,402.23c.11.05.23.1.35.16.26,0,.51.01.76.02.32,0,.63.02.95.04-.09-.06-.19-.12-.29-.18-.34,0-.68-.01-1.02-.02-.26,0-.51-.01-.76-.02Z"/>
                <path className="abc-197" d="M1308.54,411.24c0,.15,0,.29-.01.43.9-.01,1.8-.03,2.7-.03.27,0,.55,0,.84,0,0-.14.02-.28.03-.43-.28,0-.56,0-.84,0-.91,0-1.81.01-2.71.03Z"/>
                <path className="abc-438" d="M1308.48,410.26c.01.18.03.37.04.55.01.15.02.29.02.44.9-.01,1.8-.02,2.71-.03.28,0,.56,0,.84,0,0-.14.02-.29.03-.44,0-.18.02-.36.03-.55-.29,0-.58,0-.86,0-.93,0-1.87.01-2.81.02Z"/>
                <path className="abc-430" d="M1308.43,409.05c.02.22.04.43.04.65,0,.19,0,.37.01.55.94-.01,1.87-.02,2.81-.02.28,0,.57,0,.86,0,.01-.18.02-.37.03-.55.01-.22.03-.44.04-.66-.29,0-.59,0-.88,0-.97,0-1.94.01-2.91.02Z"/>
                <path className="abc-128" d="M1308.3,408.06c.01.11.04.23.05.34.03.22.06.43.08.65.97,0,1.93-.02,2.91-.02.29,0,.59,0,.88,0,0-.22.02-.43.02-.65,0-.11,0-.23,0-.34-.3,0-.61,0-.91,0-1.01,0-2.02.01-3.03.02Z"/>
                <path className="abc-166" d="M1308.42,407.41c-.06.1-.15.21-.16.32,0,.11.03.22.04.34,1.01,0,2.02-.02,3.03-.02.3,0,.61,0,.91,0,0-.11,0-.22,0-.33,0-.11.03-.21.06-.32-.29,0-.59,0-.88,0-.98,0-1.99.01-3,.02Z"/>
                <path className="abc-342" d="M1308.77,406.89c-.03.07-.09.14-.13.2-.05.1-.16.21-.23.31,1.01,0,2.03-.02,3-.02.29,0,.59,0,.88,0,.03-.11.06-.21.06-.31,0-.07.02-.14.03-.2-.26,0-.53,0-.81,0-.91,0-1.86.01-2.82.02Z"/>
                <path className="abc-260" d="M1308.93,406.49c-.03.07-.08.14-.08.2,0,.06-.04.13-.08.2.97-.01,1.91-.02,2.82-.02.27,0,.54,0,.81,0,.01-.07.03-.13.03-.2,0-.07.02-.14.03-.2-.25,0-.5,0-.76,0-.86,0-1.8.01-2.77.03Z"/>
                <path className="abc-146" d="M1309.23,406.08c-.05.07-.13.14-.17.21-.03.06-.1.13-.13.2.97-.01,1.91-.03,2.77-.03.26,0,.51,0,.76,0,.01-.07.03-.14.03-.2,0-.07.02-.14.04-.21-.22,0-.45,0-.69,0-.79,0-1.67,0-2.61.02Z"/>
                <path className="abc-66" d="M1309.38,405.8s-.01.04-.02.06c-.02.07-.09.14-.14.21.94-.01,1.82-.02,2.61-.02.24,0,.47,0,.69,0,.02-.07.03-.13.03-.2,0-.02,0-.04,0-.06-.21,0-.42,0-.65,0-.75,0-1.61,0-2.53.01Z"/>
                <path className="abc-112" d="M1309.28,405.25c.04.16.1.32.11.49,0,.02,0,.04,0,.06.92,0,1.78-.01,2.53-.01.23,0,.44,0,.65,0,0-.02,0-.04,0-.06-.01-.18-.04-.36-.07-.53-.21,0-.43,0-.66,0-.77,0-1.63.02-2.55.05Z"/>
                <path className="abc-284" d="M1308.95,404.52c.04.09.1.19.14.28.06.14.14.29.19.45.92-.03,1.78-.05,2.55-.05.23,0,.45,0,.66,0-.03-.17-.07-.33-.11-.47-.03-.1-.06-.2-.1-.29-.23,0-.47-.01-.71-.01-.81,0-1.69.05-2.63.1Z"/>
                <path className="abc-333" d="M1308.62,403.96c.08.09.16.18.2.31.03.08.08.16.13.25.93-.05,1.82-.1,2.63-.1.24,0,.48,0,.71.01-.03-.09-.07-.17-.1-.25-.05-.12-.13-.21-.22-.3-.24,0-.48,0-.72,0-.82,0-1.7.04-2.62.07Z"/>
                <path className="abc-50" d="M1307.79,403.26c.2.15.42.31.54.45.1.09.22.16.3.26.92-.03,1.8-.07,2.62-.07.25,0,.49,0,.72,0-.09-.09-.19-.16-.3-.25-.15-.13-.34-.27-.56-.41-.24,0-.49,0-.74,0-.84,0-1.7.01-2.59.03Z"/>
                <path className="abc-353" d="M1306.82,402.66c.09.05.18.1.26.15.23.14.51.3.71.45.88-.01,1.75-.03,2.59-.03.25,0,.5,0,.74,0-.21-.14-.45-.29-.69-.42-.09-.05-.18-.09-.27-.14-.25,0-.5-.01-.76-.02-.85-.01-1.72,0-2.58,0Z"/>
                <path className="abc-147" d="M1306.24,402.34c.1.06.21.11.31.17.09.05.18.1.27.15.87,0,1.74-.02,2.58,0,.25,0,.51.01.76.02-.09-.05-.19-.09-.28-.13-.11-.05-.23-.1-.35-.15-.26,0-.51,0-.77-.01-.84-.02-1.69-.02-2.52-.03Z"/>
                <path className="abc-254" d="M1305.95,402.17c.08.06.19.12.29.17.83,0,1.68.02,2.52.03.25,0,.51,0,.77.01-.12-.05-.23-.1-.35-.16-.25,0-.51-.01-.76-.02-.84-.02-1.66-.03-2.47-.05Z"/>
                <path className="abc-385" d="M1301.98,411.4c0,.15.03.3.02.45,1.3-.05,2.59-.09,3.82-.12.9-.02,1.8-.04,2.7-.06.01-.14.02-.29.01-.43-.9.01-1.8.03-2.71.05-1.24.03-2.54.07-3.84.11Z"/>
                <path className="abc-277" d="M1301.86,410.38c.01.19.06.38.08.57.01.15.04.3.05.45,1.3-.04,2.6-.08,3.84-.11.91-.02,1.81-.04,2.71-.05,0-.15-.01-.29-.02-.44-.01-.18-.03-.36-.04-.55-.94.01-1.87.02-2.81.04-1.26.02-2.54.05-3.81.08Z"/>
                <path className="abc-100" d="M1301.73,409.15c.02.22.08.45.08.67,0,.19.04.38.05.57,1.27-.03,2.55-.06,3.81-.08.93-.02,1.87-.03,2.81-.04-.01-.18-.02-.37-.01-.55,0-.22-.01-.44-.04-.65-.97,0-1.93.02-2.91.03-1.27.02-2.55.04-3.8.06Z"/>
                <path className="abc-184" d="M1301.57,408.13c0,.12.03.23.05.35.03.22.09.44.11.67,1.24-.02,2.52-.05,3.8-.06.97-.01,1.94-.02,2.91-.03-.02-.22-.05-.43-.08-.65-.01-.11-.04-.23-.05-.34-1.01,0-2.01.02-3,.03-1.28.01-2.53.03-3.73.04Z"/>
                <path className="abc-158" d="M1301.63,407.48c-.04.1-.09.2-.09.29,0,.12.02.23.03.35,1.2-.01,2.45-.03,3.73-.04.99,0,1.99-.02,3-.03-.01-.11-.04-.22-.04-.34,0-.1.09-.21.16-.32-1.01,0-2.03.02-3.03.03-1.29.01-2.55.03-3.76.04Z"/>
                <path className="abc-291" d="M1301.87,406.99c-.02.06-.06.13-.09.19-.04.1-.12.2-.16.3,1.21-.01,2.47-.03,3.76-.04.99-.01,2.01-.02,3.03-.03.06-.1.18-.21.23-.31.03-.07.09-.14.13-.2-.97.01-1.96.02-2.97.04-1.31.02-2.64.04-3.93.06Z"/>
                <path className="abc-385" d="M1301.96,406.6c-.02.06-.05.13-.05.2,0,.06-.03.13-.04.19,1.29-.02,2.62-.04,3.93-.06,1.01-.01,2-.03,2.97-.04.03-.07.08-.13.08-.2,0-.07.05-.14.08-.2-.97.01-1.99.03-3,.05-1.32.02-2.65.04-3.96.07Z"/>
                <path className="abc-154" d="M1302.17,406.19c-.03.07-.09.15-.12.22-.03.06-.07.13-.09.2,1.31-.02,2.64-.05,3.96-.07,1.02-.02,2.03-.03,3-.05.03-.07.1-.14.13-.2.04-.07.12-.14.17-.21-.94.01-1.93.03-2.96.04-1.33.02-2.72.04-4.09.07Z"/>
                <path className="abc-347" d="M1302.28,405.9s0,.04-.01.07c-.02.07-.06.15-.09.22,1.37-.03,2.76-.05,4.09-.07,1.03-.01,2.02-.03,2.96-.04.05-.07.12-.14.14-.21,0-.02.01-.04.02-.06-.92,0-1.92.02-2.95.03-1.34.02-2.75.04-4.15.07Z"/>
                <path className="abc-347" d="M1302.23,405.43c.02.13.06.27.06.4,0,.02,0,.04,0,.07,1.4-.02,2.81-.05,4.15-.07,1.03-.01,2.02-.03,2.95-.03,0-.02,0-.04,0-.06,0-.17-.07-.33-.11-.49-.92.03-1.91.06-2.93.08-1.33.02-2.73.06-4.12.1Z"/>
                <path className="abc-439" d="M1302.05,404.78c.02.09.05.18.08.26.03.13.08.26.1.39,1.39-.04,2.8-.08,4.12-.1,1.02-.02,2.01-.05,2.93-.08-.04-.16-.13-.31-.19-.45-.04-.1-.1-.2-.14-.28-.93.05-1.92.11-2.92.14-1.3.03-2.65.08-3.99.12Z"/>
                <path className="abc-406" d="M1301.9,404.18c.03.11.07.23.09.35.02.08.04.17.06.25,1.33-.05,2.68-.09,3.99-.12,1-.02,1.98-.08,2.92-.14-.04-.09-.09-.17-.13-.25-.04-.12-.12-.22-.2-.31-.92.03-1.88.07-2.85.1-1.27.03-2.58.07-3.87.12Z"/>
                <path className="abc-380" d="M1301.54,403.35c.09.17.18.33.22.5.05.1.11.21.14.32,1.29-.05,2.6-.09,3.87-.12.98-.02,1.93-.06,2.85-.1-.08-.09-.19-.17-.3-.26-.11-.14-.34-.3-.54-.45-.88.01-1.78.03-2.68.04-1.17.01-2.39.03-3.57.05Z"/>
                <path className="abc-380" d="M1301.09,402.67c.04.06.08.12.12.18.11.17.24.33.33.5,1.18-.02,2.4-.04,3.57-.05.9,0,1.8-.03,2.68-.04-.2-.15-.48-.31-.71-.45-.08-.05-.18-.1-.26-.15-.87,0-1.73.02-2.56.02-1.08,0-2.15,0-3.17,0Z"/>
                <path className="abc-380" d="M1300.84,402.28c.04.07.09.14.13.21.04.06.08.12.12.18,1.03,0,2.1,0,3.17,0,.83,0,1.69,0,2.56-.02-.09-.05-.18-.1-.27-.15-.1-.06-.22-.11-.31-.17-.83,0-1.66-.01-2.44-.03-1.02-.01-2.01-.03-2.95-.04Z"/>
                <path className="abc-33" d="M1300.73,402.06c.03.07.07.14.11.21.94.01,1.93.02,2.95.04.79.01,1.61.02,2.44.03-.1-.06-.2-.11-.29-.17-.81-.02-1.59-.03-2.36-.05-1-.02-1.95-.04-2.86-.06Z"/>
                <path className="abc-255" d="M1296.38,411.6c0,.16.02.32.02.47.57-.02,1.16-.05,1.77-.07,1.25-.05,2.55-.1,3.84-.15,0-.15-.01-.3-.02-.45-1.3.04-2.59.09-3.82.13-.61.02-1.21.05-1.78.07Z"/>
                <path className="abc-113" d="M1296.31,410.54c0,.2.03.39.04.59,0,.16.02.32.03.47.57-.02,1.17-.05,1.78-.07,1.23-.05,2.52-.09,3.82-.13,0-.15-.04-.3-.05-.45-.02-.19-.06-.38-.08-.57-1.27.03-2.51.07-3.7.1-.64.02-1.26.04-1.85.05Z"/>
                <path className="abc-436" d="M1296.25,409.26c.01.23.03.46.03.7,0,.2.02.39.03.59.59-.02,1.22-.04,1.85-.05,1.18-.04,2.43-.07,3.7-.1-.01-.19-.05-.38-.05-.57,0-.23-.06-.45-.08-.67-1.24.02-2.44.05-3.56.07-.67.01-1.31.03-1.91.04Z"/>
                <path className="abc-250" d="M1296.18,408.19c0,.12.01.24.02.37.01.23.04.46.05.7.6-.01,1.24-.03,1.91-.04,1.12-.02,2.32-.05,3.56-.07-.02-.22-.09-.44-.11-.67-.01-.12-.04-.23-.05-.35-1.2.01-2.34.03-3.41.04-.7,0-1.36.02-1.98.02Z"/>
                <path className="abc-61" d="M1296.19,407.55c0,.09-.02.19-.02.28,0,.12,0,.24.01.37.62,0,1.29-.02,1.98-.02,1.07-.01,2.21-.03,3.41-.04,0-.12-.03-.23-.03-.35,0-.1.05-.2.09-.29-1.21.01-2.37.03-3.47.04-.69,0-1.35.02-1.97.02Z"/>
                <path className="abc-75" d="M1296.24,407.08c0,.06-.01.12-.02.19,0,.09-.03.19-.03.28.62,0,1.28-.01,1.97-.02,1.1-.01,2.26-.03,3.47-.04.04-.1.11-.2.16-.3.03-.07.07-.13.09-.19-1.29.02-2.55.04-3.71.06-.67,0-1.32.02-1.92.03Z"/>
                <path className="abc-173" d="M1296.26,406.7c0,.06-.01.13-.01.19s0,.12-.01.19c.61,0,1.25-.02,1.92-.03,1.16-.02,2.42-.04,3.71-.06.02-.06.04-.13.04-.19,0-.06.03-.13.05-.2-1.31.02-2.58.05-3.8.07-.66.01-1.3.02-1.9.03Z"/>
                <path className="abc-114" d="M1296.31,406.3c0,.07-.02.14-.02.21,0,.06-.02.13-.02.19.6,0,1.24-.02,1.9-.03,1.22-.02,2.5-.04,3.8-.07.02-.06.06-.13.09-.2.03-.07.09-.15.12-.22-1.37.03-2.73.05-4.01.07-.64.01-1.26.02-1.86.03Z"/>
                <path className="abc-9" d="M1296.33,406.02s0,.04,0,.07c0,.07-.02.14-.02.21.59-.01,1.21-.02,1.86-.03,1.28-.02,2.64-.05,4.01-.07.03-.07.08-.15.09-.22,0-.02.01-.04.01-.07-1.4.02-2.8.05-4.12.08-.63.01-1.24.02-1.83.04Z"/>
                <path className="abc-9" d="M1296.28,405.58c.01.12.05.25.05.37,0,.02,0,.04,0,.07.59-.01,1.2-.02,1.83-.04,1.32-.03,2.72-.05,4.12-.08,0-.02,0-.04,0-.07,0-.14-.03-.27-.06-.4-1.39.04-2.78.08-4.07.12-.66,0-1.29.02-1.88.03Z"/>
                <path className="abc-169" d="M1296.14,404.94c.02.09.05.18.07.27.02.12.07.25.08.37.59-.01,1.21-.02,1.88-.03,1.29-.03,2.67-.08,4.07-.12-.02-.13-.07-.26-.1-.39-.02-.09-.06-.18-.08-.26-1.33.05-2.65.1-3.88.14-.72,0-1.4,0-2.03.01Z"/>
                <path className="abc-237" d="M1296,404.31c.01.12.05.24.07.36.02.09.05.18.07.27.63,0,1.31-.01,2.03-.01,1.23-.04,2.55-.09,3.88-.14-.02-.09-.05-.17-.06-.25-.02-.12-.05-.24-.09-.35-1.29.05-2.56.09-3.73.14-.76,0-1.49,0-2.16,0Z"/>
                <path className="abc-309" d="M1295.88,403.4c.03.19.08.37.08.56,0,.12.02.24.04.36.67,0,1.4,0,2.16,0,1.18-.04,2.44-.09,3.73-.14-.03-.11-.09-.22-.14-.32-.04-.17-.13-.33-.22-.5-1.18.02-2.33.04-3.37.07-.83,0-1.6-.01-2.28-.02Z"/>
                <path className="abc-404" d="M1295.7,402.64c.01.07.03.13.05.2.04.19.11.37.14.56.69,0,1.45,0,2.28.02,1.04-.03,2.19-.05,3.37-.07-.09-.17-.22-.33-.33-.5-.04-.06-.08-.12-.12-.18-1.03,0-2.01,0-2.92,0-.9-.01-1.72-.02-2.47-.03Z"/>
                <path className="abc-404" d="M1295.62,402.21c0,.08.03.16.04.24,0,.07.03.13.04.2.74,0,1.57.02,2.47.03.91,0,1.9,0,2.92,0-.04-.06-.08-.12-.12-.18-.04-.07-.09-.14-.13-.21-.94-.01-1.84-.02-2.68-.03-.93-.02-1.79-.03-2.55-.04Z"/>
                <path className="abc-309" d="M1295.59,401.97c0,.08.02.16.02.24.76.01,1.62.03,2.55.04.84,0,1.73.02,2.68.03-.04-.07-.08-.14-.11-.21-.91-.02-1.77-.03-2.57-.05-.95-.02-1.81-.03-2.57-.05Z"/>
                <path className="abc-130" d="M1293.22,411.73c0,.16.02.32.02.49.47-.02.98-.04,1.5-.07.53-.02,1.08-.05,1.65-.07,0-.16-.01-.32-.02-.47-.57.02-1.13.04-1.66.07-.53.02-1.03.04-1.5.06Z"/>
                <path className="abc-364" d="M1293.15,410.64c0,.2.03.4.04.6,0,.16.02.32.03.49.47-.02.97-.04,1.5-.06.53-.02,1.08-.04,1.66-.07,0-.16-.02-.32-.03-.47-.01-.2-.03-.39-.04-.59-.59.02-1.16.04-1.69.05-.53.02-1.02.03-1.47.05Z"/>
                <path className="abc-365" d="M1293.09,409.33c.01.24.03.48.03.71,0,.2.02.4.03.6.45-.02.94-.03,1.47-.05.53-.02,1.1-.04,1.69-.05,0-.2-.03-.39-.03-.59,0-.23-.02-.46-.03-.7-.6.01-1.17.03-1.7.04-.53.01-1.02.02-1.46.03Z"/>
                <path className="abc-184" d="M1293.02,408.24c0,.13.01.25.02.38.01.24.04.48.05.71.44-.01.93-.02,1.46-.03.53-.01,1.1-.02,1.7-.04-.01-.23-.04-.46-.05-.7,0-.12-.02-.24-.02-.37-.62,0-1.2.02-1.73.02-.53,0-1.01.01-1.43.02Z"/>
                <path className="abc-61" d="M1293.03,407.58c0,.09-.02.18-.02.28,0,.13,0,.25.01.38.42,0,.9-.01,1.43-.02.53,0,1.11-.01,1.73-.02,0-.12-.01-.24-.01-.37,0-.09.01-.19.02-.28-.62,0-1.2.01-1.73.02-.53,0-1.01.01-1.43.02Z"/>
                <path className="abc-404" d="M1293.08,407.12c0,.06-.01.12-.02.18,0,.09-.02.18-.03.28.42,0,.9-.01,1.43-.02.53,0,1.11-.01,1.73-.02,0-.09.02-.19.03-.28,0-.06.01-.12.02-.19-.61,0-1.18.02-1.71.03-.53,0-1.02.02-1.46.02Z"/>
                <path className="abc-111" d="M1293.1,406.75c0,.06-.01.12-.01.19s0,.12-.01.18c.44,0,.93-.01,1.46-.02.53,0,1.1-.02,1.71-.03,0-.06.01-.12.01-.19s0-.13.01-.19c-.6,0-1.18.02-1.71.03-.53,0-1.02.02-1.46.03Z"/>
                <path className="abc-56" d="M1293.14,406.36c0,.07-.02.14-.02.21,0,.06-.02.12-.02.19.44,0,.93-.02,1.46-.03.53,0,1.1-.02,1.71-.03,0-.06.01-.13.02-.19,0-.07.02-.14.02-.21-.59.01-1.16.02-1.69.03-.53.01-1.02.02-1.48.03Z"/>
                <path className="abc-225" d="M1293.17,406.08s0,.04,0,.06c0,.07-.01.14-.02.21.45,0,.95-.02,1.48-.03.53-.01,1.1-.02,1.69-.03,0-.07.02-.14.02-.21,0-.02,0-.04,0-.07-.59.01-1.15.02-1.68.03-.53.01-1.03.02-1.48.03Z"/>
                <path className="abc-357" d="M1293.11,405.63c.01.13.06.26.06.38,0,.02,0,.04,0,.06.46,0,.95-.02,1.48-.03.53-.01,1.09-.02,1.68-.03,0-.02,0-.04,0-.07,0-.12-.03-.25-.05-.37-.59.01-1.15.02-1.68.03s-1.04.02-1.49.03Z"/>
                <path className="abc-169" d="M1292.95,404.97c.02.09.05.18.07.27.02.13.07.26.09.38.46,0,.96-.02,1.49-.03s1.09-.02,1.68-.03c-.01-.12-.06-.25-.08-.37-.02-.09-.05-.18-.07-.27-.63,0-1.21.01-1.75.02-.53,0-1.02.01-1.44.02Z"/>
                <path className="abc-93" d="M1292.81,404.33c.01.12.05.25.07.37.02.09.05.18.07.27.42,0,.9-.01,1.44-.02.53,0,1.12-.01,1.75-.02-.02-.09-.05-.18-.07-.27-.02-.12-.06-.24-.07-.36-.67,0-1.28,0-1.82,0-.54,0-.99,0-1.37.01Z"/>
                <path className="abc-217" d="M1292.68,403.39c.03.19.09.38.09.57,0,.12.03.25.04.37.38,0,.84,0,1.37-.01.54,0,1.15,0,1.82,0-.01-.12-.04-.24-.04-.36,0-.18-.05-.37-.08-.56-.69,0-1.3,0-1.84,0s-1,0-1.36,0Z"/>
                <path className="abc-404" d="M1292.48,402.61c.01.07.04.14.05.21.04.19.12.38.14.58.36,0,.83,0,1.36,0s1.15,0,1.84,0c-.03-.19-.1-.37-.14-.56-.01-.07-.04-.13-.05-.2-.74,0-1.39-.02-1.93-.02-.54,0-.97-.01-1.28-.01Z"/>
                <path className="abc-404" d="M1292.39,402.15c0,.08.03.16.04.25,0,.07.03.14.04.21.31,0,.74,0,1.28.01.54,0,1.19.01,1.93.02-.01-.07-.03-.13-.04-.2-.01-.08-.03-.16-.04-.24-.76-.01-1.43-.02-1.97-.03-.54,0-.96-.02-1.25-.02Z"/>
                <path className="abc-309" d="M1292.37,401.91c0,.08.02.16.03.25.29,0,.71.01,1.25.02.54,0,1.21.02,1.97.03,0-.08-.02-.16-.02-.24-.76-.01-1.42-.03-1.97-.04-.54-.01-.97-.02-1.26-.02Z"/>
                <path className="abc-344" d="M1291.92,411.79v.49c.4-.02.84-.04,1.32-.06,0-.16-.01-.32-.02-.49-.47.02-.91.04-1.3.06Z"/>
                <path className="abc-217" d="M1291.92,410.69v1.1c.39-.02.83-.04,1.3-.06,0-.16-.02-.32-.03-.49-.01-.2-.03-.4-.04-.6-.45.02-.86.03-1.23.04Z"/>
                <path className="abc-365" d="M1291.92,409.36v1.33c.37-.01.78-.03,1.23-.04,0-.2-.03-.4-.03-.6,0-.24-.02-.48-.03-.71-.44.01-.83.02-1.17.03Z"/>
                <path className="abc-184" d="M1291.92,408.26v1.1c.33,0,.72-.02,1.17-.03-.01-.24-.04-.48-.05-.71,0-.13-.02-.25-.02-.38-.42,0-.79.01-1.1.02Z"/>
                <path className="abc-61" d="M1291.92,407.6v.66c.31,0,.67-.01,1.1-.02,0-.13-.01-.25-.01-.38,0-.09.01-.18.02-.28-.42,0-.79.01-1.1.01Z"/>
                <path className="abc-404" d="M1291.92,407.14v.46c.31,0,.68,0,1.1-.01,0-.09.02-.19.03-.28,0-.06.01-.12.02-.18-.44,0-.83.01-1.15.02Z"/>
                <path className="abc-160" d="M1291.92,406.77v.37c.33,0,.72-.01,1.15-.02,0-.06.01-.12.01-.18s0-.12.01-.19c-.44,0-.83.02-1.17.02Z"/>
                <path className="abc-404" d="M1291.92,406.38v.39c.34,0,.73-.01,1.17-.02,0-.06.01-.12.02-.19,0-.07.02-.14.02-.21-.45,0-.86.02-1.22.02Z"/>
                <path className="abc-415" d="M1291.92,406.11v.27c.36,0,.77-.02,1.22-.02,0-.07.02-.14.02-.21,0-.02,0-.04,0-.06-.46,0-.87.02-1.24.03Z"/>
                <path className="abc-456" d="M1291.92,405.66v.45c.37,0,.78-.02,1.24-.03,0-.02,0-.04,0-.06,0-.13-.04-.26-.06-.38-.46,0-.86.02-1.19.02Z"/>
                <path className="abc-169" d="M1291.92,404.99v.66c.33,0,.73-.02,1.19-.02-.01-.13-.07-.26-.09-.38-.02-.09-.05-.18-.07-.27-.42,0-.77.01-1.03.02Z"/>
                <path className="abc-309" d="M1291.92,404.34v.65c.26,0,.61-.01,1.03-.02-.02-.09-.05-.18-.07-.27-.02-.12-.06-.25-.07-.37-.38,0-.67,0-.89.01Z"/>
                <path className="abc-404" d="M1291.92,403.39v.95c.21,0,.51,0,.89-.01-.01-.12-.04-.25-.04-.37,0-.19-.06-.38-.09-.57-.36,0-.62,0-.75,0Z"/>
                <path className="abc-404" d="M1291.92,402.61v.79c.13,0,.39,0,.75,0-.03-.19-.11-.38-.14-.58-.01-.07-.04-.14-.05-.21-.31,0-.5,0-.56,0Z"/>
                <path className="abc-56" d="M1291.92,402.15v.46c.06,0,.25,0,.56,0-.01-.07-.04-.14-.04-.21-.01-.08-.04-.16-.04-.25-.29,0-.45,0-.47,0Z"/>
                <path className="abc-93" d="M1291.92,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
              </g>
              <g>
                <path className="abc-52" d="M1291.92,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
              </g>
              <g>
                <path className="abc-52" d="M1291.92,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                <path className="abc-52" d="M1291.92,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
              </g>
            </g>
            <g id="MeshGrid-8" data-name="MeshGrid">
              <g>
                <path className="abc-427" d="M1292.66,874.66c-.02.3-.14.6-.16.88-.38-.01-.58-.03-.58-.03v-.97c.1,0,.35.06.74.12Z"/>
                <path className="abc-390" d="M1292.95,873c-.02.25-.1.49-.12.73-.03.32-.14.63-.17.93-.39-.06-.64-.12-.74-.12v-1.7c.25,0,.59.09,1.02.16Z"/>
                <path className="abc-119" d="M1293.15,871.67c-.02.2-.07.39-.09.58-.02.25-.1.5-.12.75-.43-.08-.77-.16-1.02-.16v-1.28c.36,0,.76.06,1.23.11Z"/>
                <path className="abc-196" d="M1293.3,870.66c-.01.14-.05.28-.06.42-.02.2-.07.4-.09.59-.47-.05-.87-.11-1.23-.11v-.93c.42,0,.88.02,1.37.04Z"/>
                <path className="abc-343" d="M1293.41,869.5c-.02.25-.03.49-.05.74-.01.14-.05.28-.06.42-.5-.01-.95-.03-1.37-.04v-1.15c.45,0,.95.02,1.48.03Z"/>
                <path className="abc-360" d="M1293.57,866.84c-.04.64-.07,1.28-.12,1.93-.02.25-.03.49-.05.74-.53-.01-1.04-.03-1.48-.03v-2.78c.47.01,1.04.08,1.65.15Z"/>
                <path className="abc-5" d="M1293.82,861.74c-.05,1.06-.08,2.12-.14,3.17-.04.64-.06,1.28-.1,1.92-.61-.07-1.18-.14-1.65-.15v-5.33c.53.03,1.19.21,1.89.39Z"/>
                <path className="abc-327" d="M1294.02,854.71c-.03,1.29-.05,2.58-.09,3.86-.04,1.06-.06,2.12-.11,3.17-.71-.18-1.37-.36-1.89-.39v-7.36c.61.05,1.32.38,2.09.71Z"/>
                <path className="abc-364" d="M1294.07,849.53c0,.44,0,.87,0,1.31-.01,1.29-.01,2.59-.04,3.87-.77-.33-1.49-.66-2.09-.71v-5.4c.65.06,1.36.49,2.14.93Z"/>
                <path className="abc-364" d="M1294.06,846.28c0,.67,0,1.32,0,1.93,0,.44,0,.87,0,1.31-.78-.44-1.49-.87-2.14-.93v-2.98c.65.06,1.36.36,2.14.66Z"/>
                <path className="abc-404" d="M1294.06,842.75v1.44c0,.72,0,1.42,0,2.09-.78-.3-1.49-.6-2.14-.66v-3.42c.65.06,1.36.31,2.14.56Z"/>
                <path className="abc-406" d="M1294.06,633.17c0,87.27,0,177.63,0,208.13v1.46c-.78-.25-1.49-.49-2.14-.56v-204.49c.64.88,1.35-1.83,2.13-4.54Z"/>
                <path className="abc-108" d="M1294.06,425.81c0,1.98,0,3.99,0,6.11,0,5.51,0,12.6,0,21.84,0,29.86,0,103.49,0,179.4-.78,2.7-1.5,5.42-2.13,4.54v-209.19c.63-.03,1.35-1.37,2.13-2.7Z"/>
                <path className="abc-300" d="M1294.05,416.52c0,1.18,0,2.37,0,3.62,0,1.83,0,3.71,0,5.68-.79,1.33-1.5,2.68-2.13,2.7v-10.77c.63-.03,1.34-.63,2.13-1.23Z"/>
                <path className="abc-396" d="M1294.05,412.64v.47c0,1.11,0,2.23,0,3.41-.79.6-1.5,1.2-2.13,1.23v-4.87c.63-.03,1.34-.13,2.13-.24Z"/>
                <path className="abc-344" d="M1294.05,412.18v.46c-.79.1-1.5.21-2.13.24v-.6c.63-.03,1.34-.06,2.13-.1Z"/>
                <path className="abc-60" d="M1295.01,874.75c-.07.28-.13.55-.19.79-.24,0-.48.01-.69.02-.69.01-1.24,0-1.62-.01.02-.29.13-.58.16-.88.39.06.93.11,1.6.1.25,0,.49,0,.75-.01Z"/>
                <path className="abc-376" d="M1295.39,873.11c-.06.25-.12.5-.17.73-.07.32-.14.62-.21.9-.26,0-.5,0-.75.01-.67.01-1.2-.04-1.6-.1.02-.3.14-.61.17-.93.02-.24.1-.48.12-.73.43.08.95.15,1.58.13.3,0,.57-.01.86-.02Z"/>
                <path className="abc-95" d="M1295.72,871.72c-.05.21-.1.42-.14.62-.06.27-.12.53-.18.78-.29,0-.57.01-.86.02-.63.02-1.15-.06-1.58-.13.02-.25.1-.5.12-.75.02-.19.07-.39.09-.58.47.05.99.1,1.59.08.33-.01.64-.02.97-.03Z"/>
                <path className="abc-384" d="M1295.97,870.63c-.04.15-.07.3-.11.45-.05.22-.1.43-.15.64-.33.01-.64.02-.97.03-.6.02-1.13-.03-1.59-.08.02-.2.07-.39.09-.59.01-.14.05-.28.06-.42.5.01,1.03.02,1.62,0,.35-.01.7-.02,1.06-.04Z"/>
                <path className="abc-303" d="M1296.26,869.44c-.06.24-.12.48-.18.72-.04.15-.07.31-.11.46-.36.02-.71.03-1.06.04-.58.02-1.12.01-1.62,0,.01-.14.05-.28.06-.42.02-.25.03-.49.05-.74.53.01,1.1.01,1.68,0,.36-.01.76-.03,1.17-.06Z"/>
                <path className="abc-87" d="M1296.86,866.85c-.14.63-.27,1.24-.42,1.87-.06.24-.11.48-.17.72-.41.03-.81.05-1.17.06-.58.02-1.15.01-1.68,0,.02-.25.03-.49.05-.74.04-.64.08-1.29.12-1.93.61.07,1.25.13,1.87.12.42,0,.91-.05,1.42-.1Z"/>
                <path className="abc-5" d="M1297.88,861.94c-.21,1.03-.39,2.02-.62,3.06-.14.62-.26,1.23-.4,1.86-.51.05-.99.1-1.42.1-.61.01-1.26-.05-1.87-.12.04-.64.07-1.28.1-1.92.06-1.06.09-2.12.14-3.17.71.18,1.46.35,2.16.36.61.02,1.24-.06,1.9-.16Z"/>
                <path className="abc-349" d="M1299.08,855.14c-.21,1.26-.4,2.49-.63,3.74-.19,1.03-.36,2.03-.57,3.06-.66.11-1.29.19-1.9.16-.7,0-1.46-.18-2.16-.36.05-1.06.07-2.11.11-3.17.04-1.29.06-2.57.09-3.86.77.33,1.6.66,2.43.7.87.05,1.72-.08,2.63-.27Z"/>
                <path className="abc-33" d="M1299.78,850.07c-.05.43-.08.85-.14,1.28-.18,1.28-.35,2.52-.56,3.78-.91.18-1.77.32-2.63.27-.83-.04-1.66-.37-2.43-.7.03-1.29.03-2.58.04-3.87,0-.43,0-.87,0-1.31.78.44,1.62.87,2.51.92,1,.07,2.06-.12,3.2-.37Z"/>
                <path className="abc-223" d="M1300.02,846.74c-.04.67-.07,1.42-.12,2.04-.05.44-.07.86-.12,1.29-1.14.26-2.19.45-3.2.37-.9-.05-1.74-.49-2.51-.92,0-.44,0-.87,0-1.31,0-.62,0-1.26,0-1.93.78.3,1.62.6,2.52.66,1.05.07,2.2-.05,3.44-.2Z"/>
                <path className="abc-261" d="M1300.14,843.67c-.01.29-.02.63-.03.9-.03.71-.05,1.5-.09,2.17-1.24.15-2.39.27-3.44.2-.9-.06-1.75-.36-2.52-.66,0-.67,0-1.37,0-2.09v-1.44c.78.25,1.62.49,2.53.55,1.08.06,2.27.21,3.55.37Z"/>
                <path className="abc-261" d="M1300.66,639.2c-.03,60.23-.12,118.51-.12,148.75s-.1,47.6-.37,54.75c-.01.32-.01.68-.03.97-1.28-.16-2.47-.3-3.55-.37-.91-.06-1.75-.3-2.53-.55v-1.46c0-30.5,0-120.86,0-208.13.78-2.7,1.63-5.39,2.53-4.45,1.27-2.62,2.64,3.91,4.07,10.48Z"/>
                <path className="abc-404" d="M1300.87,423.52c0,1.92,0,3.94,0,6.16,0,2.65-.01,5.72-.01,9.24,0,3.97-.01,8.73-.01,14.42,0,28.49-.15,108.66-.19,185.86-1.43-6.57-2.8-13.1-4.07-10.48-.9-.94-1.75,1.74-2.53,4.45,0-75.91,0-149.55,0-179.4,0-9.24,0-16.33,0-21.84,0-2.12,0-4.14,0-6.11.79-1.33,1.64-2.64,2.53-2.59,1.36.08,2.82.16,4.29.29Z"/>
                <path className="abc-404" d="M1300.89,415.12c0,.97,0,2.01,0,3.17,0,1.59,0,3.31,0,5.22-1.47-.12-2.92-.21-4.29-.29-.89-.05-1.75,1.26-2.53,2.59,0-1.98,0-3.85,0-5.68,0-1.25,0-2.44,0-3.62.78-.6,1.64-1.2,2.53-1.21,1.36-.02,2.82-.11,4.3-.18Z"/>
                <path className="abc-337" d="M1300.89,412.21v.32c0,.77,0,1.62,0,2.59-1.48.07-2.94.16-4.3.18-.9.01-1.75.61-2.53,1.21,0-1.18,0-2.3,0-3.41v-.47c.79-.1,1.64-.21,2.53-.25,1.36-.06,2.83-.12,4.31-.19Z"/>
                <path className="abc-85" d="M1300.89,411.9c0,.1,0,.21,0,.31-1.48.06-2.94.13-4.31.19-.9.04-1.75.14-2.53.25v-.46c.79-.04,1.64-.07,2.53-.11,1.36-.06,2.83-.12,4.31-.17Z"/>
                <path className="abc-115" d="M1296.08,874.7c-.09.28-.18.55-.26.79-.08,0-.15,0-.23.01-.27.01-.53.03-.77.03.06-.24.12-.51.19-.79.26,0,.53-.01.83-.03.08,0,.16,0,.24-.01Z"/>
                <path className="abc-235" d="M1296.62,873.06c-.08.26-.16.5-.24.74-.1.32-.2.62-.29.9-.08,0-.16,0-.24.01-.3.02-.57.02-.83.03.07-.28.14-.58.21-.9.05-.24.11-.48.17-.73.29,0,.59-.02.94-.04.1,0,.19-.01.28-.02Z"/>
                <path className="abc-362" d="M1297.08,871.65c-.07.21-.14.42-.21.62-.09.27-.18.53-.26.79-.09,0-.19,0-.28.02-.35.02-.65.03-.94.04.06-.25.12-.51.18-.78.05-.2.1-.41.14-.62.33-.01.67-.03,1.05-.05.11,0,.21-.01.32-.02Z"/>
                <path className="abc-71" d="M1297.45,870.55c-.05.15-.1.31-.16.46-.07.22-.15.43-.22.64-.11,0-.21.01-.32.02-.38.02-.72.04-1.05.05.05-.21.1-.42.15-.64.04-.15.07-.3.11-.45.36-.02.74-.04,1.14-.06.11,0,.23-.01.34-.02Z"/>
                <path className="abc-284" d="M1297.87,869.34c-.09.25-.17.5-.26.74-.05.16-.11.31-.16.46-.11,0-.23.01-.34.02-.4.02-.78.04-1.14.06.04-.15.07-.31.11-.46.06-.24.12-.48.18-.72.41-.03.84-.06,1.26-.08.12,0,.24-.01.36-.02Z"/>
                <path className="abc-360" d="M1298.82,866.66c-.23.64-.46,1.29-.69,1.93-.09.25-.17.5-.26.74-.12,0-.24.02-.36.02-.42.02-.84.05-1.26.08.06-.24.11-.48.17-.72.15-.63.28-1.24.42-1.87.51-.05,1.03-.12,1.54-.16.14-.01.28-.02.43-.03Z"/>
                <path className="abc-5" d="M1300.65,861.56c-.38,1.06-.75,2.12-1.13,3.17-.23.64-.46,1.29-.69,1.93-.14.01-.29.02-.43.03-.5.04-1.03.1-1.54.16.14-.63.27-1.24.4-1.86.23-1.03.41-2.03.62-3.06.66-.11,1.36-.24,2.12-.32.21-.02.43-.04.65-.06Z"/>
                <path className="abc-206" d="M1303.04,854.49c-.41,1.3-.84,2.6-1.29,3.89-.37,1.06-.73,2.12-1.11,3.18-.22.01-.44.03-.65.06-.76.08-1.46.22-2.12.32.21-1.03.38-2.02.57-3.06.23-1.26.42-2.48.63-3.74.91-.18,1.88-.42,2.98-.56.31-.04.64-.07.98-.09Z"/>
                <path className="abc-88" d="M1304.57,849.2c-.11.45-.23.9-.36,1.35-.37,1.32-.76,2.64-1.17,3.95-.34.02-.67.05-.98.09-1.1.14-2.07.38-2.98.56.21-1.26.37-2.5.56-3.78.06-.43.09-.85.14-1.28,1.14-.25,2.35-.57,3.66-.76.37-.05.74-.09,1.13-.12Z"/>
                <path className="abc-31" d="M1305.2,846.26c-.09.53-.19,1.04-.31,1.59-.1.45-.21.91-.32,1.36-.38.03-.76.07-1.13.12-1.31.18-2.53.5-3.66.76.05-.43.07-.86.12-1.29.06-.63.09-1.37.12-2.04,1.24-.15,2.57-.35,3.97-.42.39-.02.8-.05,1.21-.06Z"/>
                <path className="abc-342" d="M1305.51,844.17c-.02.21-.05.4-.08.58-.07.5-.15.98-.23,1.51-.41.02-.81.04-1.21.06-1.41.08-2.74.27-3.97.42.04-.67.06-1.46.09-2.17.01-.27.02-.6.03-.9,1.28.16,2.66.32,4.12.43.41.03.83.05,1.25.07Z"/>
                <path className="abc-47" d="M1306.35,648.5c-.03,60.54-.06,113.83-.06,130.07,0,40.24-.14,58.65-.71,64.92-.02.25-.05.47-.07.69-.42-.02-.84-.05-1.25-.07-1.46-.1-2.84-.27-4.12-.43.01-.29.02-.65.03-.97.26-7.14.37-24.19.37-54.75s.1-88.52.12-148.75c1.43,6.57,2.91,13.18,4.43,10.72.42-.91.84-1.16,1.27-1.43Z"/>
                <path className="abc-147" d="M1306.46,421.78c0,1.71,0,3.55,0,5.52,0,2.17,0,4.7,0,7.57,0,32.62-.06,130.05-.1,213.62-.42.27-.85.52-1.27,1.43-1.51,2.46-3-4.15-4.43-10.72.03-77.2.18-157.38.19-185.86,0-5.69.01-10.46.01-14.42,0-3.52,0-6.59.01-9.24,0-2.21,0-4.24,0-6.16,1.47.12,2.96.28,4.39.52.4-.85.8-1.55,1.2-2.25Z"/>
                <path className="abc-342" d="M1306.48,414.4c0,.82,0,1.72,0,2.71,0,1.4,0,2.96,0,4.67-.39.7-.79,1.4-1.2,2.25-1.44-.23-2.92-.39-4.39-.52,0-1.92,0-3.63,0-5.22,0-1.16,0-2.2,0-3.17,1.48-.07,2.97-.13,4.41-.1.4-.24.8-.43,1.18-.62Z"/>
                <path className="abc-189" d="M1306.48,411.97c0,.09,0,.17,0,.26,0,.63,0,1.35,0,2.17-.39.19-.78.38-1.18.62-1.43-.03-2.93.03-4.41.1,0-.97,0-1.82,0-2.59v-.32c1.48-.06,2.98-.12,4.41-.16.4-.02.79-.05,1.18-.08Z"/>
                <path className="abc-223" d="M1306.48,411.72v.25c-.39.03-.78.06-1.18.08-1.43.04-2.93.1-4.41.16,0-.11,0-.21,0-.31,1.48-.06,2.98-.11,4.41-.15.4-.01.79-.02,1.18-.03Z"/>
                <path className="abc-315" d="M1296.8,874.65c-.12.28-.24.55-.33.79-.14.01-.28.02-.42.03-.08,0-.16.01-.24.01.08-.24.17-.5.26-.79.08,0,.16,0,.25-.01.17-.01.32-.02.47-.04Z"/>
                <path className="abc-235" d="M1297.54,873c-.11.26-.23.51-.34.75-.14.32-.28.63-.4.91-.15.01-.3.02-.47.04-.09,0-.17.01-.25.01.09-.28.19-.58.29-.9.08-.24.16-.49.24-.74.09,0,.19-.01.29-.02.22-.01.43-.03.63-.05Z"/>
                <path className="abc-171" d="M1298.17,871.58c-.09.21-.18.42-.27.63-.12.27-.24.54-.35.79-.21.02-.41.03-.63.05-.1,0-.2.01-.29.02.08-.26.17-.52.26-.79.07-.2.14-.41.21-.62.11,0,.21-.01.32-.02.25-.02.51-.03.76-.05Z"/>
                <path className="abc-122" d="M1298.63,870.47c-.06.15-.12.31-.19.46-.09.22-.18.43-.27.65-.25.02-.51.03-.76.05-.11,0-.22.01-.32.02.07-.21.14-.43.22-.64.05-.15.1-.3.16-.46.11,0,.23-.01.35-.02.27-.02.55-.04.83-.05Z"/>
                <path className="abc-414" d="M1299.1,869.26c-.1.25-.19.49-.29.74-.06.16-.12.31-.18.46-.28.02-.55.04-.83.05-.12,0-.23.01-.35.02.05-.15.11-.31.16-.46.09-.25.17-.5.26-.74.12,0,.24-.02.36-.02.28-.02.57-.03.86-.05Z"/>
                <path className="abc-79" d="M1300.18,866.6c-.27.64-.53,1.28-.78,1.92-.1.25-.2.49-.29.74-.29.02-.58.03-.86.05-.12,0-.24.02-.36.02.09-.25.17-.5.26-.74.23-.64.46-1.29.69-1.93.14-.01.29-.02.44-.03.29-.02.6-.02.91-.03Z"/>
                <path className="abc-5" d="M1302.33,861.53c-.45,1.05-.9,2.1-1.35,3.15-.27.64-.54,1.28-.81,1.91-.31,0-.62.02-.91.03-.15,0-.3.02-.44.03.23-.64.46-1.29.69-1.93.38-1.06.76-2.12,1.13-3.17.22-.01.45-.02.68-.02.31,0,.66,0,1,0Z"/>
                <path className="abc-339" d="M1305.16,854.49c-.47,1.3-.98,2.6-1.51,3.88-.43,1.06-.88,2.11-1.32,3.16-.35,0-.69,0-1,0-.23,0-.46,0-.68.02.38-1.06.74-2.12,1.11-3.18.44-1.29.87-2.59,1.29-3.89.34-.02.69-.03,1.03-.02.35,0,.72.01,1.09.02Z"/>
                <path className="abc-40" d="M1306.85,849.18c-.12.45-.25.9-.38,1.35-.39,1.34-.83,2.65-1.3,3.96-.37,0-.74-.02-1.09-.02-.34,0-.69,0-1.03.02.41-1.3.8-2.62,1.17-3.95.12-.45.25-.9.36-1.35.38-.03.78-.04,1.18-.03.37,0,.73.01,1.1.01Z"/>
                <path className="abc-314" d="M1307.54,846.25c-.1.51-.21,1.03-.34,1.57-.11.46-.23.91-.35,1.36-.37,0-.73,0-1.1-.01-.4,0-.79,0-1.18.03.11-.45.22-.9.32-1.36.12-.55.22-1.06.31-1.59.41-.02.83-.02,1.25-.02.36,0,.73.01,1.09,0Z"/>
                <path className="abc-62" d="M1307.89,844.17c-.03.23-.05.42-.09.61-.08.47-.16.96-.26,1.47-.36,0-.73,0-1.09,0-.42,0-.84,0-1.25.02.09-.53.16-1.01.23-1.51.03-.18.05-.36.08-.58.42.02.85.03,1.29.04.36,0,.72-.01,1.09-.04Z"/>
                <path className="abc-336" d="M1308.71,636.53c0,53.83-.01,104.5-.02,133.7,0,1.55,0,3.06,0,4.51,0,17.86-.03,32.06-.12,43.11-.08,11.25-.02,19.75-.61,25.6-.03.27-.05.49-.08.72-.37.03-.73.04-1.09.04-.44,0-.87-.02-1.29-.04.02-.21.05-.43.07-.69.56-6.28.71-24.68.71-64.92,0-16.23.03-69.52.06-130.07.42-.27.85-.56,1.27-1.55.36-1.06.72-5.73,1.09-10.42Z"/>
                <path className="abc-415" d="M1308.73,423.82c0,1.78,0,3.61,0,5.5,0,31.06,0,122.77-.01,207.21-.37,4.69-.73,9.36-1.09,10.42-.42.99-.85,1.28-1.27,1.55.04-83.58.1-181,.1-213.62,0-2.87,0-5.4,0-7.57,0-1.97,0-3.82,0-5.52.39-.7.78-1.4,1.16-2.25.37-.02.74,2.14,1.1,4.29Z"/>
                <path className="abc-415" d="M1308.73,415.49v3.18c0,1.65,0,3.37,0,5.15-.37-2.15-.74-4.31-1.1-4.29-.38.85-.77,1.55-1.16,2.25,0-1.7,0-3.27,0-4.67,0-.99,0-1.9,0-2.71.39-.19.77-.38,1.14-.61.37,0,.74.85,1.1,1.7Z"/>
                <path className="abc-339" d="M1308.73,412.08v.41c0,.97,0,1.98,0,3.01-.37-.86-.74-1.71-1.1-1.7-.37.24-.75.42-1.14.61,0-.82,0-1.54,0-2.17,0-.09,0-.18,0-.26.39-.03.77-.06,1.14-.08.37,0,.74.09,1.11.18Z"/>
                <path className="abc-406" d="M1308.73,411.67v.41c-.37-.1-.74-.19-1.11-.18-.37.01-.75.04-1.14.08v-.25c.39,0,.77-.02,1.14-.03.37,0,.74-.01,1.11-.02Z"/>
                <path className="abc-129" d="M1298.15,874.53c-.19.29-.37.56-.52.81-.25.03-.49.05-.73.07-.15.01-.29.02-.43.04.09-.24.21-.51.33-.79.15-.01.31-.03.48-.04.29-.02.57-.05.86-.08Z"/>
                <path className="abc-229" d="M1299.26,872.85c-.17.26-.34.51-.5.75-.21.33-.43.63-.62.92-.29.03-.58.06-.86.08-.18.01-.33.03-.48.04.12-.28.26-.59.4-.91.11-.24.22-.49.34-.75.21-.02.42-.03.64-.05.36-.03.72-.06,1.08-.09Z"/>
                <path className="abc-11" d="M1300.15,871.42c-.13.21-.25.42-.38.63-.17.27-.34.54-.51.8-.36.04-.71.07-1.08.09-.22.02-.43.03-.64.05.12-.26.23-.52.35-.79.09-.21.18-.42.27-.63.25-.02.51-.04.76-.05.42-.03.82-.06,1.23-.1Z"/>
                <path className="abc-196" d="M1300.79,870.31c-.08.15-.17.31-.26.46-.13.22-.25.44-.38.65-.4.04-.81.07-1.23.1-.26.02-.51.04-.76.05.09-.21.18-.43.27-.65.06-.15.13-.3.19-.46.28-.02.55-.04.83-.06.45-.03.89-.07,1.34-.1Z"/>
                <path className="abc-28" d="M1301.38,869.12c-.12.24-.23.48-.35.73-.08.16-.16.31-.24.47-.44.04-.89.07-1.34.1-.28.02-.55.04-.83.06.06-.15.12-.31.18-.46.09-.25.19-.5.29-.74.29-.02.58-.03.86-.05.46-.03.94-.06,1.42-.09Z"/>
                <path className="abc-118" d="M1302.66,866.51c-.31.63-.61,1.25-.92,1.88-.12.24-.23.48-.35.72-.48.03-.96.06-1.42.09-.28.02-.57.04-.86.05.1-.25.19-.49.29-.74.26-.64.52-1.28.78-1.92.31,0,.62-.02.92-.04.48-.03,1.02-.04,1.56-.05Z"/>
                <path className="abc-5" d="M1305.07,861.53c-.49,1.04-.99,2.07-1.49,3.1-.31.63-.61,1.25-.92,1.88-.54.01-1.09.02-1.56.05-.29.02-.6.03-.92.04.27-.64.54-1.28.81-1.91.45-1.05.9-2.1,1.35-3.15.35,0,.69,0,1.01,0,.52-.02,1.13,0,1.73,0Z"/>
                <path className="abc-44" d="M1308.06,854.52c-.48,1.31-1.01,2.6-1.57,3.88-.46,1.05-.93,2.09-1.42,3.13-.61,0-1.22-.02-1.73,0-.32.01-.66.01-1.01,0,.45-1.05.89-2.1,1.32-3.16.53-1.29,1.03-2.58,1.51-3.88.37,0,.74.02,1.09.01.57,0,1.19,0,1.81.02Z"/>
                <path className="abc-159" d="M1309.75,849.15c-.12.46-.24.92-.37,1.38-.39,1.36-.83,2.69-1.31,4-.62,0-1.24-.02-1.81-.02-.35,0-.72,0-1.09-.01.47-1.31.91-2.62,1.3-3.96.13-.45.26-.9.38-1.35.37,0,.73,0,1.1,0,.6,0,1.2-.02,1.8-.04Z"/>
                <path className="abc-247" d="M1310.42,846.18c-.1.51-.21,1.04-.33,1.57-.11.47-.22.93-.34,1.4-.6.02-1.2.03-1.8.04-.37,0-.74,0-1.1,0,.12-.45.24-.9.35-1.36.13-.54.24-1.06.34-1.57.36,0,.73,0,1.09-.01.6-.01,1.19-.03,1.79-.06Z"/>
                <path className="abc-327" d="M1310.81,843.71c-.04.36-.09.68-.13.98-.07.47-.16.97-.26,1.48-.6.03-1.19.05-1.79.06-.37,0-.73.01-1.09.01.1-.51.19-1,.26-1.47.03-.19.06-.38.09-.61.37-.03.73-.07,1.1-.12.6-.08,1.21-.2,1.82-.34Z"/>
                <path className="abc-202" d="M1311.63,625.88c0,48.14-.02,96.99-.04,137.9,0,16.3-.04,31.31-.06,44.5-.02,13.61.31,25.31-.6,34.37-.04.35-.07.71-.12,1.07-.61.13-1.22.25-1.82.34-.37.05-.74.09-1.1.12.03-.23.05-.45.08-.72.58-5.85.52-14.35.61-25.6.09-11.05.12-25.26.12-43.11,0-1.45,0-2.96,0-4.51,0-29.2.01-79.87.02-133.7.37-4.69.74-9.38,1.1-10.48.6.07,1.21-.01,1.82-.16Z"/>
                <path className="abc-195" d="M1311.63,428.07c0,2.19,0,4.38,0,6.57,0,36.04,0,112.69,0,191.25-.61.15-1.22.23-1.82.16-.37,1.1-.74,5.8-1.1,10.48,0-84.44.01-176.15.01-207.21,0-1.89,0-3.72,0-5.5.37,2.15.74,4.31,1.11,4.3.6,0,1.2-.03,1.8-.06Z"/>
                <path className="abc-378" d="M1311.63,417.17c0,1.44,0,2.88,0,4.32,0,2.19,0,4.38,0,6.57-.6.02-1.2.05-1.8.06-.37,0-.74-2.15-1.11-4.3,0-1.78,0-3.49,0-5.15v-3.18c.37.86.74,1.72,1.11,1.71.6,0,1.2-.02,1.8-.03Z"/>
                <path className="abc-285" d="M1311.63,412.25v4.93c-.6.01-1.2.02-1.8.03-.37,0-.74-.85-1.11-1.71,0-1.03,0-2.03,0-3.01v-.41c.37.1.74.19,1.11.19.6,0,1.2-.01,1.8-.02Z"/>
                <path className="abc-402" d="M1311.63,411.64v.61c-.6,0-1.2.01-1.8.02-.37,0-.74-.09-1.11-.19v-.41c.37,0,.74-.01,1.11-.02.6,0,1.2-.01,1.8-.02Z"/>
                <path className="abc-264" d="M1300.12,874.27c-.27.3-.52.58-.75.85-.33.05-.66.09-.97.13-.26.03-.52.06-.77.09.14-.25.33-.52.52-.81.29-.03.58-.07.88-.1.36-.04.72-.1,1.09-.15Z"/>
                <path className="abc-268" d="M1301.62,872.56c-.23.26-.45.52-.66.76-.28.33-.57.65-.83.95-.37.06-.74.11-1.09.15-.3.04-.59.07-.88.1.19-.29.41-.6.62-.92.16-.24.33-.49.5-.75.36-.04.71-.07,1.06-.12.43-.05.86-.11,1.29-.18Z"/>
                <path className="abc-150" d="M1302.83,871.12c-.17.22-.36.43-.53.64-.23.28-.46.54-.68.81-.44.06-.87.12-1.29.18-.35.04-.71.08-1.06.12.17-.26.35-.53.51-.8.13-.21.25-.42.38-.63.4-.04.8-.08,1.21-.12.49-.05.97-.11,1.46-.18Z"/>
                <path className="abc-388" d="M1303.72,870c-.12.16-.24.31-.36.46-.17.22-.35.44-.53.65-.49.07-.98.13-1.46.18-.41.04-.81.08-1.21.12.13-.21.25-.43.38-.65.09-.15.17-.31.26-.46.44-.04.89-.08,1.33-.12.54-.05,1.07-.12,1.6-.19Z"/>
                <path className="abc-426" d="M1304.52,868.83c-.15.23-.3.46-.46.7-.11.16-.23.31-.35.47-.53.07-1.06.13-1.6.19-.44.05-.89.09-1.33.12.08-.15.17-.31.24-.47.12-.24.23-.48.35-.73.48-.03.96-.07,1.42-.11.55-.06,1.14-.11,1.72-.17Z"/>
                <path className="abc-206" d="M1306.12,866.32c-.37.61-.76,1.21-1.14,1.82-.15.23-.3.47-.45.7-.58.06-1.16.12-1.72.17-.46.05-.94.08-1.42.11.12-.24.23-.48.35-.72.31-.63.61-1.26.92-1.88.54-.01,1.09-.03,1.56-.07.57-.05,1.24-.08,1.9-.12Z"/>
                <path className="abc-5" d="M1308.91,861.44c-.54,1.03-1.11,2.04-1.7,3.05-.36.61-.72,1.22-1.1,1.83-.66.04-1.33.07-1.9.12-.47.04-1.02.06-1.56.07.31-.63.62-1.25.92-1.88.51-1.03,1.01-2.06,1.49-3.1.61,0,1.22.01,1.73-.02.62-.05,1.37-.05,2.11-.07Z"/>
                <path className="abc-267" d="M1312.06,854.42c-.49,1.33-1.03,2.63-1.62,3.91-.48,1.05-1,2.09-1.53,3.11-.74.02-1.48.02-2.11.07-.52.04-1.13.03-1.73.02.49-1.04.97-2.08,1.42-3.13.56-1.28,1.08-2.57,1.57-3.88.62,0,1.24.01,1.82-.02.69-.04,1.44-.05,2.18-.09Z"/>
                <path className="abc-90" d="M1313.72,848.9c-.11.48-.23.97-.35,1.44-.38,1.4-.81,2.75-1.3,4.08-.74.03-1.49.05-2.18.09-.58.03-1.2.03-1.82.02.49-1.31.93-2.64,1.31-4,.13-.46.26-.92.37-1.38.6-.02,1.2-.05,1.8-.08.72-.04,1.45-.1,2.17-.16Z"/>
                <path className="abc-367" d="M1314.36,845.87c-.1.51-.22,1.04-.33,1.57-.1.49-.2.98-.31,1.46-.72.07-1.44.12-2.17.16-.6.04-1.2.06-1.8.08.12-.46.23-.93.34-1.4.12-.54.23-1.06.33-1.57.6-.03,1.19-.07,1.79-.11.72-.06,1.44-.12,2.15-.2Z"/>
                <path className="abc-36" d="M1314.85,842.75c-.06.53-.14,1.13-.21,1.62-.07.48-.17.98-.27,1.49-.72.07-1.43.14-2.15.2-.6.05-1.19.08-1.79.11.1-.51.19-1.01.26-1.48.04-.3.09-.62.13-.98.61-.13,1.22-.28,1.83-.43.74-.18,1.47-.36,2.2-.53Z"/>
                <path className="abc-269" d="M1315.64,624.9c0,47.86-.01,96.44-.06,137.15-.02,16.45-.1,31.59-.04,44.86.06,13.55.39,25.19-.51,34.19-.05.51-.12,1.13-.18,1.65-.73.17-1.47.35-2.2.53-.61.15-1.22.29-1.83.43.04-.36.08-.71.12-1.07.9-9.05.58-20.75.6-34.37.02-13.19.05-28.2.06-44.5.02-40.91.04-89.75.04-137.9.61-.15,1.22-.36,1.83-.57.73-.12,1.46-.27,2.19-.41Z"/>
                <path className="abc-195" d="M1315.6,427.97c0,2.18,0,4.36,0,6.54,0,35.84.05,112.05.04,190.4-.73.14-1.46.29-2.19.41-.6.21-1.22.42-1.83.57,0-78.55,0-155.21,0-191.25,0-2.19,0-4.38,0-6.57.6-.02,1.2-.05,1.8-.05.72,0,1.45-.02,2.17-.05Z"/>
                <path className="abc-319" d="M1315.6,417.13c0,1.43,0,2.86,0,4.3,0,2.18,0,4.36,0,6.54-.72.02-1.45.05-2.17.05-.6,0-1.2.03-1.8.05,0-2.19,0-4.38,0-6.57,0-1.44,0-2.88,0-4.32.6-.01,1.2-.02,1.8-.03.72,0,1.45,0,2.17-.02Z"/>
                <path className="abc-400" d="M1315.6,412.23v.6c0,1.43,0,2.86,0,4.3-.72,0-1.45.02-2.17.02-.6,0-1.2.01-1.8.03v-4.93c.6,0,1.2,0,1.8-.01.72,0,1.45,0,2.17,0Z"/>
                <path className="abc-88" d="M1315.6,411.63v.6c-.72,0-1.45,0-2.17,0-.6,0-1.2,0-1.8.01v-.61c.6,0,1.2,0,1.8,0,.72,0,1.45,0,2.17,0Z"/>
                <path className="abc-272" d="M1301.81,873.98c-.32.31-.63.61-.92.89-.17.03-.34.06-.5.09-.35.06-.69.11-1.02.16.23-.27.48-.55.75-.85.37-.06.75-.12,1.14-.19.19-.03.37-.07.55-.1Z"/>
                <path className="abc-183" d="M1303.61,872.23c-.27.27-.53.53-.79.78-.35.34-.68.66-1,.98-.18.04-.37.07-.55.1-.39.07-.77.13-1.14.19.27-.3.55-.62.83-.95.21-.25.44-.5.66-.76.44-.06.88-.14,1.34-.21.22-.04.43-.08.64-.12Z"/>
                <path className="abc-11" d="M1305.03,870.76c-.21.22-.41.43-.62.65-.27.28-.54.55-.81.82-.21.04-.42.08-.64.12-.46.08-.91.15-1.34.21.23-.26.46-.53.68-.81.17-.21.35-.42.53-.64.49-.07.98-.14,1.49-.23.24-.04.48-.09.71-.13Z"/>
                <path className="abc-457" d="M1306.07,869.62c-.14.16-.28.31-.43.47-.21.22-.41.45-.62.66-.23.05-.47.09-.71.13-.51.09-1,.16-1.49.23.17-.22.36-.43.53-.65.12-.15.24-.31.36-.46.53-.07,1.06-.15,1.59-.24.26-.04.51-.09.76-.14Z"/>
                <path className="abc-118" d="M1307.04,868.48c-.18.22-.36.45-.54.67-.14.16-.28.32-.42.48-.25.05-.51.09-.76.14-.54.09-1.06.17-1.59.24.12-.16.24-.31.35-.47.15-.23.3-.46.46-.7.58-.06,1.16-.14,1.7-.23.26-.04.54-.09.81-.13Z"/>
                <path className="abc-214" d="M1308.89,866.04c-.43.59-.87,1.18-1.32,1.77-.17.22-.35.45-.53.67-.27.04-.55.09-.81.13-.55.09-1.13.16-1.7.23.15-.23.3-.46.45-.7.39-.61.77-1.21,1.14-1.82.66-.04,1.32-.09,1.88-.18.27-.04.58-.07.89-.1Z"/>
                <path className="abc-4" d="M1312,861.23c-.58,1.02-1.2,2.02-1.86,3.02-.4.6-.81,1.2-1.24,1.79-.31.03-.62.05-.89.1-.56.09-1.22.14-1.88.18.37-.61.74-1.22,1.1-1.83.59-1.01,1.16-2.02,1.7-3.05.74-.02,1.47-.05,2.09-.14.29-.04.65-.05,1-.07Z"/>
                <path className="abc-39" d="M1315.28,854.14c-.49,1.36-1.04,2.68-1.65,3.97-.5,1.06-1.04,2.1-1.63,3.12-.35.01-.7.02-1,.07-.61.09-1.35.12-2.09.14.54-1.03,1.05-2.06,1.53-3.11.59-1.28,1.13-2.58,1.62-3.91.74-.03,1.48-.08,2.16-.17.33-.04.69-.07,1.05-.1Z"/>
                <path className="abc-415" d="M1316.9,848.5c-.11.48-.23.97-.35,1.44-.36,1.45-.79,2.84-1.28,4.2-.37.04-.73.06-1.05.1-.68.09-1.42.14-2.16.17.49-1.33.93-2.69,1.3-4.08.13-.47.24-.96.35-1.44.72-.07,1.44-.15,2.15-.24.34-.04.69-.1,1.03-.16Z"/>
                <path className="abc-131" d="M1317.52,845.48c-.1.51-.21,1.04-.31,1.57-.09.48-.2.98-.31,1.46-.35.06-.69.12-1.03.16-.71.09-1.43.17-2.15.24.11-.48.21-.97.31-1.46.11-.53.22-1.06.33-1.57.72-.07,1.43-.16,2.14-.25.34-.04.68-.09,1.02-.14Z"/>
                <path className="abc-372" d="M1318.02,842.19c-.07.6-.15,1.19-.23,1.78-.07.49-.17.99-.27,1.5-.34.05-.68.09-1.02.14-.71.09-1.42.18-2.14.25.1-.51.2-1.01.27-1.49.07-.49.15-1.09.21-1.62.73-.17,1.45-.32,2.16-.41.34-.04.68-.1,1.01-.15Z"/>
                <path className="abc-161" d="M1318.86,624.51c-.02,47.84-.06,96.48-.12,137.14,0,1.59,0,3.16,0,4.73-.03,14.99-.1,28.82-.05,41.01,0,1.22.01,2.42.02,3.61.06,11.51.28,21.5-.5,29.4-.06.6-.12,1.19-.19,1.79-.34.05-.67.1-1.01.15-.71.1-1.43.25-2.16.41.06-.53.13-1.15.18-1.65.9-9,.57-20.63.51-34.19-.06-13.28.03-28.41.04-44.86.04-40.71.05-89.28.06-137.15.73-.14,1.45-.27,2.15-.35.35-.01.71-.03,1.07-.04Z"/>
                <path className="abc-168" d="M1318.89,427.91c0,2.17,0,4.35,0,6.52,0,35.72,0,111.85-.03,190.08-.36.02-.71.03-1.07.04-.7.08-1.42.21-2.15.35,0-78.35-.03-154.55-.04-190.4,0-2.18,0-4.36,0-6.54.72-.02,1.45-.05,2.17-.05.37,0,.75,0,1.12-.01Z"/>
                <path className="abc-281" d="M1318.89,417.11c0,1.43,0,2.85,0,4.28,0,2.17,0,4.35,0,6.52-.37,0-.75,0-1.12.01-.72,0-1.45.02-2.17.05,0-2.18,0-4.36,0-6.54,0-1.43,0-2.86,0-4.3.72,0,1.45-.02,2.17-.02.37,0,.75,0,1.12,0Z"/>
                <path className="abc-200" d="M1318.89,412.23v4.88c-.38,0-.75,0-1.12,0-.72,0-1.45,0-2.17.02,0-1.43,0-2.86,0-4.3v-.6c.72,0,1.45,0,2.17,0,.37,0,.75,0,1.12,0Z"/>
                <path className="abc-346" d="M1318.89,411.63v.6c-.38,0-.75,0-1.12,0-.72,0-1.45,0-2.17,0v-.6c.72,0,1.45,0,2.17,0,.37,0,.75,0,1.12,0Z"/>
                <path className="abc-157" d="M1302.96,873.75c-.36.32-.7.63-1.03.92-.18.04-.36.07-.54.11-.17.03-.34.07-.51.1.29-.28.6-.57.92-.89.18-.04.37-.07.56-.11.2-.04.39-.08.59-.13Z"/>
                <path className="abc-234" d="M1304.92,871.94c-.29.27-.58.54-.86.8-.38.35-.75.68-1.1,1-.2.04-.39.09-.59.13-.19.04-.38.08-.56.11.32-.31.66-.64,1-.98.26-.25.52-.51.79-.78.21-.04.42-.09.64-.13.23-.05.45-.1.67-.15Z"/>
                <path className="abc-91" d="M1306.47,870.45c-.22.22-.45.44-.67.66-.29.29-.59.56-.88.84-.22.05-.44.1-.67.15-.22.05-.43.09-.64.13.27-.27.54-.54.81-.82.21-.21.41-.43.62-.65.23-.05.47-.1.71-.15.25-.05.49-.11.73-.17Z"/>
                <path className="abc-187" d="M1307.61,869.3c-.16.16-.31.32-.47.48-.22.23-.45.45-.67.67-.24.06-.48.11-.73.17-.24.05-.48.1-.71.15.21-.22.41-.44.62-.66.14-.16.28-.31.43-.47.25-.05.5-.1.76-.15.26-.06.52-.11.78-.18Z"/>
                <path className="abc-177" d="M1308.67,868.16c-.2.22-.39.43-.59.65-.15.16-.31.32-.46.48-.26.06-.52.12-.78.18-.25.05-.51.11-.76.15.14-.16.28-.32.42-.48.18-.22.36-.45.54-.67.27-.04.54-.09.8-.15.27-.06.55-.11.83-.17Z"/>
                <path className="abc-148" d="M1310.69,865.78c-.46.58-.95,1.16-1.45,1.73-.19.22-.38.44-.58.65-.28.06-.56.11-.83.17-.26.06-.53.1-.8.15.18-.22.36-.45.53-.67.46-.59.9-1.17,1.32-1.77.31-.03.62-.06.89-.12.28-.06.6-.1.91-.14Z"/>
                <path className="abc-20" d="M1314.04,861.02c-.62,1.02-1.29,2.02-2,3-.43.59-.88,1.18-1.35,1.76-.32.04-.64.08-.91.14-.27.06-.58.09-.89.12.43-.59.84-1.19,1.24-1.79.66-.99,1.28-1.99,1.86-3.02.35-.01.71-.04,1-.1.31-.07.67-.09,1.04-.12Z"/>
                <path className="abc-90" d="M1317.46,853.82c-.5,1.4-1.07,2.75-1.7,4.05-.52,1.07-1.1,2.12-1.72,3.14-.36.02-.73.05-1.04.12-.3.06-.65.08-1,.1.58-1.02,1.12-2.06,1.63-3.12.61-1.29,1.16-2.61,1.65-3.97.37-.04.74-.08,1.07-.15.35-.08.73-.12,1.11-.17Z"/>
                <path className="abc-148" d="M1319.03,848.09c-.1.46-.19.91-.3,1.38-.35,1.5-.77,2.95-1.27,4.35-.38.04-.76.09-1.11.17-.34.07-.71.12-1.07.15.49-1.36.92-2.76,1.28-4.2.12-.47.24-.96.35-1.44.35-.06.7-.13,1.05-.19.36-.07.72-.14,1.08-.21Z"/>
                <path className="abc-24" d="M1319.57,845.16c-.09.51-.19,1.03-.28,1.56-.08.46-.16.9-.26,1.37-.36.07-.72.14-1.08.21-.35.07-.7.13-1.05.19.11-.48.21-.97.31-1.46.1-.53.21-1.05.31-1.57.34-.05.67-.1,1.01-.15.35-.05.69-.11,1.04-.16Z"/>
                <path className="abc-212" d="M1320.01,842.12c-.06.52-.13,1.03-.2,1.55-.07.49-.15.99-.24,1.5-.34.06-.69.11-1.04.16-.34.05-.67.1-1.01.15.1-.51.2-1.01.27-1.5.08-.59.16-1.19.23-1.78.34-.05.67-.11,1-.16.34-.05.67.02.99.08Z"/>
                <path className="abc-432" d="M1321,631.65c-.06,55.81-.14,109.55-.2,140.49,0,3.07-.01,5.96-.02,8.65-.05,14.78-.06,26.76-.1,36.29-.03,10.16.04,17.97-.5,23.5-.05.52-.11,1.03-.17,1.55-.32-.06-.65-.13-.99-.08-.33.05-.66.1-1,.16.07-.6.13-1.19.19-1.79.78-7.91.56-17.9.5-29.4,0-1.19-.01-2.39-.02-3.61-.05-12.2.02-26.02.05-41.01,0-1.56,0-3.14,0-4.73.06-40.66.09-89.3.12-137.14.36-.02.71-.03,1.07-.05.37,1.08.73,4.13,1.08,7.19Z"/>
                <path className="abc-440" d="M1321.18,426.17c0,2.18,0,4.46,0,6.82v.8c0,21.78-.08,112.15-.17,197.86-.35-3.06-.71-6.11-1.08-7.19-.35.02-.71.03-1.07.05.04-78.23.03-154.36.03-190.08,0-2.17,0-4.35,0-6.52.37,0,.75,0,1.12,0,.39,0,.78-.87,1.16-1.73Z"/>
                <path className="abc-200" d="M1321.18,415.97v3.96c0,1.97,0,4.05,0,6.24-.39.86-.77,1.73-1.16,1.73-.38,0-.75,0-1.12,0,0-2.17,0-4.35,0-6.52,0-1.43,0-2.85,0-4.28.38,0,.75,0,1.13,0,.39,0,.78-.57,1.16-1.14Z"/>
                <path className="abc-434" d="M1321.18,412.06v3.91c-.39.57-.77,1.14-1.16,1.14-.38,0-.75,0-1.13,0v-4.88c.38,0,.75,0,1.13,0,.39,0,.78-.08,1.16-.17Z"/>
                <path className="abc-108" d="M1321.18,411.63v.43c-.39.08-.77.17-1.16.17-.38,0-.75,0-1.13,0v-.6c.38,0,.75,0,1.13,0,.39,0,.78,0,1.16,0Z"/>
                <path className="abc-266" d="M1304.69,873.33c-.38.33-.76.65-1.1.95-.37.09-.74.18-1.1.26-.18.04-.36.08-.54.12.33-.29.67-.6,1.03-.92.2-.04.39-.09.59-.14.38-.09.75-.18,1.13-.28Z"/>
                <path className="abc-64" d="M1306.81,871.45c-.31.28-.63.56-.93.83-.41.36-.81.71-1.19,1.05-.38.1-.75.19-1.13.28-.2.05-.4.09-.59.14.35-.32.72-.66,1.1-1,.28-.26.57-.53.86-.8.22-.05.44-.11.67-.16.41-.1.82-.21,1.22-.33Z"/>
                <path className="abc-2" d="M1308.48,869.91c-.24.23-.48.45-.72.67-.32.29-.64.58-.95.87-.41.12-.81.23-1.22.33-.23.06-.45.11-.67.16.29-.27.58-.55.88-.84.22-.22.45-.44.67-.66.24-.06.48-.12.73-.18.43-.11.86-.23,1.29-.35Z"/>
                <path className="abc-149" d="M1309.7,868.74c-.16.16-.33.32-.49.48-.24.23-.48.46-.72.69-.43.13-.86.25-1.29.35-.25.06-.49.12-.73.18.22-.22.45-.45.67-.67.16-.16.31-.32.47-.48.26-.06.51-.13.77-.19.44-.11.88-.23,1.31-.36Z"/>
                <path className="abc-108" d="M1310.8,867.63c-.2.21-.4.42-.61.63-.16.16-.33.32-.49.49-.44.13-.88.25-1.31.36-.26.07-.52.13-.77.19.16-.16.31-.32.46-.48.2-.22.4-.43.59-.65.28-.06.56-.12.82-.18.44-.11.88-.23,1.31-.35Z"/>
                <path className="abc-118" d="M1312.86,865.32c-.47.56-.96,1.13-1.47,1.68-.2.21-.39.42-.59.63-.43.12-.87.23-1.31.35-.26.07-.54.13-.82.18.2-.22.39-.44.58-.65.5-.57.98-1.15,1.45-1.73.32-.04.63-.08.91-.15.43-.11.84-.2,1.26-.31Z"/>
                <path className="abc-421" d="M1316.19,860.65c-.61,1.01-1.27,1.99-1.98,2.95-.43.58-.88,1.16-1.35,1.72-.41.1-.83.2-1.26.31-.27.07-.59.11-.91.15.46-.58.91-1.17,1.35-1.76.71-.98,1.38-1.98,2-3,.36-.02.72-.05,1.02-.11.38-.09.76-.17,1.13-.26Z"/>
                <path className="abc-280" d="M1319.5,853.5c-.47,1.39-1.01,2.74-1.63,4.03-.51,1.06-1.07,2.1-1.67,3.11-.37.09-.75.17-1.13.26-.3.06-.66.09-1.02.11.62-1.02,1.19-2.07,1.72-3.14.64-1.3,1.21-2.66,1.7-4.05.38-.04.75-.08,1.08-.14.33-.06.64-.12.96-.18Z"/>
                <path className="abc-339" d="M1320.97,847.79c-.08.45-.18.9-.27,1.36-.33,1.51-.72,2.96-1.2,4.35-.32.06-.63.12-.96.18-.33.06-.7.1-1.08.14.5-1.4.92-2.85,1.27-4.35.11-.47.2-.92.3-1.38.36-.07.71-.14,1.06-.2.3-.05.59-.08.88-.11Z"/>
                <path className="abc-36" d="M1321.44,844.89c-.07.53-.14,1.04-.23,1.57-.07.44-.15.89-.24,1.34-.29.03-.59.06-.88.11-.35.06-.7.13-1.06.2.1-.46.18-.91.26-1.37.1-.53.19-1.05.28-1.56.34-.06.69-.11,1.03-.17.28-.05.56-.08.84-.1Z"/>
                <path className="abc-246" d="M1321.83,841.81c-.06.51-.13,1.03-.19,1.54-.07.51-.13,1.02-.2,1.54-.28.03-.56.06-.84.1-.34.06-.68.12-1.03.17.09-.51.17-1.01.24-1.5.07-.52.14-1.03.2-1.55.32.06.65.12.98.07.27-.05.56-.21.84-.38Z"/>
                <path className="abc-233" d="M1322.87,631.44c-.07,53.76-.14,105.58-.2,136.88,0,4.88,0,9.4.03,13.5.03,29.43.29,48.25-.7,58.44-.05.52-.11,1.03-.17,1.54-.28.17-.56.34-.84.38-.33.05-.66,0-.98-.07.06-.52.12-1.03.17-1.55.54-5.52.47-13.34.5-23.5.03-9.53.05-21.51.1-36.29,0-2.69.01-5.58.02-8.65.07-30.94.14-84.67.2-140.49.35,3.06.7,6.11,1.07,7.18.26-1.4.53-4.39.8-7.39Z"/>
                <path className="abc-161" d="M1323.07,426.14c0,2.18,0,4.45,0,6.8v.8c0,21.73-.1,112.05-.2,197.71-.27,2.99-.54,5.99-.8,7.39-.36-1.07-.71-4.13-1.07-7.18.1-85.71.17-176.08.17-197.86v-.8c0-2.35,0-4.63,0-6.82.39-.86.77-1.73,1.16-1.73.24,0,.49.84.73,1.69Z"/>
                <path className="abc-367" d="M1323.07,415.96c0,1.24,0,2.56,0,3.95,0,1.96,0,4.04,0,6.22-.24-.85-.49-1.7-.73-1.69-.38,0-.77.86-1.16,1.73,0-2.18,0-4.27,0-6.24v-3.96c.39-.57.77-1.14,1.16-1.14.25,0,.49.56.73,1.13Z"/>
                <path className="abc-428" d="M1323.07,412.07v.45c0,1.06,0,2.21,0,3.45-.24-.57-.49-1.13-.73-1.13-.38,0-.77.57-1.16,1.14v-3.91c.39-.08.77-.17,1.16-.17.25,0,.49.08.73.17Z"/>
                <path className="abc-371" d="M1323.07,411.63v.43c-.24-.08-.49-.17-.73-.17-.38,0-.77.08-1.16.17v-.43c.39,0,.77,0,1.16,0,.25,0,.49,0,.73,0Z"/>
                <path className="abc-121" d="M1306.81,872.7c-.41.35-.8.68-1.15.99-.32.1-.63.2-.95.29-.38.11-.76.21-1.13.31.35-.3.72-.62,1.1-.95.38-.1.76-.21,1.15-.32.32-.1.65-.2.97-.3Z"/>
                <path className="abc-399" d="M1309.05,870.75c-.33.29-.66.58-.98.86-.43.37-.85.74-1.26,1.09-.33.11-.65.21-.97.3-.39.12-.77.22-1.15.32.38-.33.79-.68,1.19-1.05.3-.27.62-.55.93-.83.41-.12.81-.24,1.22-.37.34-.1.68-.22,1.01-.33Z"/>
                <path className="abc-238" d="M1310.8,869.17c-.25.23-.5.46-.75.69-.33.3-.66.6-1,.89-.34.12-.68.23-1.01.33-.41.13-.82.25-1.22.37.31-.28.63-.57.95-.87.24-.22.48-.45.72-.67.43-.13.86-.26,1.28-.39.35-.11.69-.23,1.04-.35Z"/>
                <path className="abc-234" d="M1312.05,867.99c-.17.16-.34.32-.51.48-.24.23-.49.46-.74.7-.35.12-.69.24-1.04.35-.42.13-.85.27-1.28.39.24-.23.48-.46.72-.69.17-.16.33-.32.49-.48.44-.13.87-.26,1.3-.4.35-.11.7-.23,1.05-.35Z"/>
                <path className="abc-82" d="M1313.13,866.9c-.19.2-.39.41-.59.6-.16.16-.33.32-.49.48-.35.12-.7.24-1.05.35-.43.14-.86.27-1.3.4.16-.16.33-.32.49-.49.21-.21.41-.42.61-.63.43-.12.86-.25,1.29-.38.35-.11.7-.23,1.05-.34Z"/>
                <path className="abc-153" d="M1315.11,864.68c-.44.54-.91,1.08-1.4,1.61-.19.2-.38.41-.58.61-.35.12-.7.23-1.05.34-.43.14-.86.26-1.29.38.2-.21.4-.42.59-.63.51-.55,1-1.11,1.47-1.68.41-.1.83-.21,1.24-.34.34-.1.68-.2,1.01-.3Z"/>
                <path className="abc-303" d="M1318.22,860.16c-.56.98-1.17,1.93-1.84,2.86-.41.56-.83,1.12-1.28,1.66-.33.1-.66.2-1.01.3-.41.13-.83.23-1.24.34.47-.56.92-1.14,1.35-1.72.71-.96,1.37-1.95,1.98-2.95.37-.09.75-.17,1.12-.26.31-.08.61-.15.91-.23Z"/>
                <path className="abc-232" d="M1321.24,853.21c-.42,1.35-.91,2.66-1.48,3.93-.47,1.04-.97,2.04-1.53,3.02-.3.08-.6.15-.91.23-.37.09-.75.18-1.12.26.61-1.01,1.17-2.05,1.67-3.11.62-1.29,1.16-2.64,1.63-4.03.32-.06.63-.11.95-.15.26-.04.53-.09.79-.14Z"/>
                <path className="abc-120" d="M1322.54,847.7c-.07.44-.15.88-.24,1.33-.29,1.44-.64,2.84-1.07,4.19-.26.05-.52.1-.79.14-.32.04-.63.1-.95.15.47-1.39.87-2.85,1.2-4.35.1-.46.19-.91.27-1.36.29-.03.58-.05.87-.06.24-.01.47-.02.7-.03Z"/>
                <path className="abc-401" d="M1322.94,844.76c-.06.56-.12,1.11-.19,1.62-.06.43-.13.87-.2,1.31-.23,0-.47.02-.7.03-.29.02-.58.04-.87.06.08-.45.16-.9.24-1.34.09-.52.16-1.04.23-1.57.28-.03.55-.05.83-.08.23-.03.45-.04.67-.05Z"/>
                <path className="abc-389" d="M1323.3,841.31c-.06.59-.13,1.18-.2,1.76-.06.56-.11,1.13-.17,1.7-.22.01-.44.02-.67.05-.27.03-.55.05-.83.08.07-.53.13-1.03.2-1.54.07-.51.13-1.03.19-1.54.28-.17.56-.34.82-.39.22-.04.44-.08.65-.11Z"/>
                <path className="abc-226" d="M1324.28,624.56c-.04,47.23-.07,94.87-.12,135.18-.04,33.59.88,61.9-.68,79.79-.05.59-.12,1.19-.18,1.78-.21.03-.43.06-.65.11-.26.05-.54.22-.82.39.06-.51.12-1.03.17-1.54.99-10.18.73-29,.7-58.44-.02-4.1-.04-8.62-.03-13.5.06-31.29.13-83.12.2-136.88.27-2.99.53-5.98.78-7.37.22.49.43.58.63.49Z"/>
                <path className="abc-43" d="M1324.39,427.88c0,2.17,0,4.34,0,6.5-.01,35.59-.05,112.09-.11,190.18-.2.09-.41,0-.63-.49-.25,1.38-.52,4.37-.78,7.37.1-85.65.19-175.97.2-197.71v-.8c0-2.35,0-4.62,0-6.8.24.85.49,1.71.72,1.73.2.02.4.02.6.01Z"/>
                <path className="abc-43" d="M1324.39,417.11c0,1.42,0,2.85,0,4.27,0,2.17,0,4.34,0,6.5-.2,0-.4,0-.6-.01-.24-.02-.48-.88-.72-1.73,0-2.18,0-4.26,0-6.22,0-1.4,0-2.71,0-3.95.24.57.49,1.13.73,1.14.2,0,.4,0,.59,0Z"/>
                <path className="abc-140" d="M1324.39,412.23v.6c0,1.42,0,2.85,0,4.27-.2,0-.4,0-.59,0-.24,0-.48-.57-.73-1.14,0-1.24,0-2.39,0-3.45v-.45c.24.08.49.17.73.17.2,0,.4,0,.59,0Z"/>
                <path className="abc-271" d="M1324.39,411.63v.6c-.2,0-.4,0-.59,0-.24,0-.48-.08-.73-.17v-.43c.24,0,.49,0,.73,0,.2,0,.4,0,.59,0Z"/>
                <path className="abc-41" d="M1308.93,871.93c-.42.36-.83.71-1.2,1.04-.37.14-.75.28-1.12.41-.32.11-.64.22-.96.32.36-.31.75-.64,1.15-.99.33-.11.66-.22.98-.34.38-.14.76-.28,1.14-.43Z"/>
                <path className="abc-419" d="M1311.23,869.92c-.34.3-.68.6-1,.88-.44.38-.88.76-1.3,1.13-.38.15-.76.3-1.14.43-.33.12-.66.23-.98.34.41-.35.83-.71,1.26-1.09.32-.28.65-.57.98-.86.34-.12.68-.24,1.02-.37.39-.15.78-.3,1.17-.46Z"/>
                <path className="abc-70" d="M1313.01,868.32c-.25.23-.51.47-.76.69-.33.3-.67.61-1.01.91-.39.16-.78.32-1.17.46-.34.13-.68.25-1.02.37.33-.29.67-.59,1-.89.25-.23.5-.46.75-.69.35-.12.69-.25,1.03-.38.4-.15.79-.31,1.18-.47Z"/>
                <path className="abc-16" d="M1314.27,867.15c-.17.16-.34.32-.51.48-.24.23-.5.46-.75.69-.39.16-.78.32-1.18.47-.34.13-.69.26-1.03.38.25-.23.5-.47.74-.7.17-.16.34-.32.51-.48.35-.12.69-.25,1.04-.38.4-.15.79-.3,1.18-.46Z"/>
                <path className="abc-213" d="M1315.32,866.12c-.18.19-.37.38-.56.56-.16.15-.33.31-.49.47-.39.16-.78.31-1.18.46-.34.13-.69.26-1.04.38.17-.16.33-.32.49-.48.2-.2.4-.4.59-.6.35-.12.69-.23,1.03-.36.39-.14.78-.28,1.16-.43Z"/>
                <path className="abc-18" d="M1317.17,864.03c-.42.52-.85,1.03-1.31,1.52-.18.19-.36.38-.54.57-.38.15-.77.29-1.16.43-.34.12-.68.24-1.03.36.19-.2.39-.41.58-.61.49-.53.95-1.06,1.4-1.61.33-.1.65-.2.97-.3.37-.12.73-.23,1.09-.35Z"/>
                <path className="abc-123" d="M1320.11,859.63c-.53.96-1.11,1.9-1.74,2.8-.38.55-.78,1.08-1.2,1.6-.36.12-.72.24-1.09.35-.32.1-.64.2-.97.3.44-.54.87-1.1,1.28-1.66.67-.93,1.28-1.88,1.84-2.86.3-.08.59-.16.89-.24.34-.09.67-.19,1-.29Z"/>
                <path className="abc-7" d="M1322.89,852.87c-.38,1.3-.82,2.56-1.35,3.79-.43,1.01-.91,2.01-1.44,2.97-.33.1-.66.19-1,.29-.29.08-.59.16-.89.24.56-.98,1.07-1.98,1.53-3.02.57-1.26,1.06-2.58,1.48-3.93.26-.05.52-.1.78-.15.3-.05.59-.12.88-.19Z"/>
                <path className="abc-32" d="M1324.02,847.61c-.06.43-.13.86-.2,1.29-.24,1.35-.55,2.67-.92,3.97-.29.07-.58.14-.88.19-.26.05-.51.1-.78.15.42-1.35.77-2.75,1.07-4.19.09-.45.17-.89.24-1.33.23-.01.46-.02.69-.03.26-.01.52-.03.78-.05Z"/>
                <path className="abc-271" d="M1324.34,844.66c-.05.6-.1,1.17-.16,1.67-.05.42-.1.85-.16,1.28-.26.02-.52.04-.78.05-.23.01-.46.02-.69.03.07-.44.14-.88.2-1.31.08-.51.14-1.06.19-1.62.22-.01.44-.02.66-.05.25-.03.5-.04.75-.06Z"/>
                <path className="abc-57" d="M1324.63,841.13c-.05.57-.1,1.12-.14,1.66-.05.63-.09,1.27-.14,1.87-.25.02-.49.03-.75.06-.22.03-.44.03-.66.05.06-.56.11-1.13.17-1.7.07-.58.14-1.17.2-1.76.21-.03.42-.06.62-.09.24-.04.47-.07.7-.1Z"/>
                <path className="abc-279" d="M1325.58,623.8c-.02,46.88-.04,94.58-.07,134.7-.02,34.04.47,62.8-.76,80.89-.04.59-.08,1.17-.13,1.73-.23.03-.46.06-.7.1-.21.03-.41.06-.62.09.06-.59.13-1.19.18-1.78,1.56-17.88.64-46.2.68-79.79.05-40.31.09-87.96.12-135.18.2-.09.4-.37.61-.62.24-.1.47-.14.69-.14Z"/>
                <path className="abc-142" d="M1325.65,427.85c0,2.16,0,4.32,0,6.48,0,35.56-.03,111.41-.06,189.47-.23,0-.46.04-.69.14-.21.25-.4.53-.61.62.06-78.09.09-154.59.11-190.18,0-2.17,0-4.34,0-6.5.2,0,.39-.02.59-.02.23,0,.45-.01.67-.01Z"/>
                <path className="abc-74" d="M1325.65,417.1c0,1.42,0,2.84,0,4.26,0,2.16,0,4.32,0,6.48-.22,0-.45,0-.67.01-.2,0-.39.01-.59.02,0-2.17,0-4.34,0-6.5,0-1.42,0-2.85,0-4.27.2,0,.39,0,.59,0,.23,0,.45,0,.67,0Z"/>
                <path className="abc-175" d="M1325.65,412.24v4.86c-.22,0-.45,0-.67,0-.19,0-.39,0-.59,0,0-1.42,0-2.85,0-4.27v-.6c.2,0,.39,0,.59,0,.23,0,.45,0,.67,0Z"/>
                <path className="abc-178" d="M1325.65,411.64v.6c-.22,0-.45,0-.67,0-.19,0-.39,0-.59,0v-.6c.2,0,.39,0,.59,0,.23,0,.45,0,.67,0Z"/>
                <path className="abc-416" d="M1311.11,870.99c-.43.37-.84.73-1.22,1.06-.34.16-.69.31-1.03.45-.38.16-.75.31-1.13.45.37-.32.78-.67,1.2-1.04.38-.15.76-.31,1.14-.47.35-.15.69-.3,1.04-.46Z"/>
                <path className="abc-30" d="M1313.43,868.95c-.34.3-.68.6-1.01.89-.44.39-.89.78-1.31,1.15-.34.16-.69.31-1.04.46-.38.16-.76.32-1.14.47.42-.36.86-.75,1.3-1.13.32-.29.66-.58,1-.88.39-.16.78-.33,1.16-.5.35-.15.7-.31,1.04-.47Z"/>
                <path className="abc-373" d="M1315.21,867.35c-.25.23-.51.46-.76.69-.33.3-.68.61-1.01.91-.34.16-.69.32-1.04.47-.38.17-.77.34-1.16.5.34-.3.68-.61,1.01-.91.25-.23.51-.46.76-.69.39-.16.78-.33,1.16-.5.35-.15.69-.31,1.04-.47Z"/>
                <path className="abc-110" d="M1316.45,866.21c-.17.15-.33.31-.5.46-.24.22-.49.45-.74.68-.34.16-.69.31-1.04.47-.38.17-.77.34-1.16.5.25-.23.51-.47.75-.69.17-.16.34-.32.51-.48.39-.16.78-.32,1.16-.49.35-.15.69-.3,1.03-.46Z"/>
                <path className="abc-313" d="M1317.47,865.24c-.17.17-.34.34-.52.51-.16.15-.32.3-.49.46-.34.15-.68.31-1.03.46-.38.16-.77.33-1.16.49.17-.16.33-.32.49-.47.19-.18.38-.37.56-.56.38-.15.76-.3,1.13-.45.34-.14.68-.28,1.01-.43Z"/>
                <path className="abc-413" d="M1319.22,863.27c-.4.5-.81.98-1.24,1.45-.17.18-.33.35-.51.52-.33.15-.67.29-1.01.43-.37.15-.75.3-1.13.45.18-.19.37-.38.54-.57.46-.49.89-1,1.31-1.52.36-.12.72-.25,1.07-.38.32-.12.65-.25.97-.38Z"/>
                <path className="abc-63" d="M1321.96,859.02c-.49.94-1.03,1.84-1.62,2.71-.36.53-.73,1.04-1.13,1.54-.32.13-.64.26-.97.38-.36.14-.71.26-1.07.38.42-.52.82-1.05,1.2-1.6.63-.9,1.21-1.84,1.74-2.8.33-.1.65-.2.98-.3.29-.09.59-.2.88-.31Z"/>
                <path className="abc-71" d="M1324.48,852.46c-.33,1.25-.74,2.48-1.21,3.68-.39.99-.83,1.95-1.32,2.88-.29.11-.58.22-.88.31-.32.1-.65.2-.98.3.53-.96,1.01-1.96,1.44-2.97.52-1.23.97-2.49,1.35-3.79.29-.07.57-.14.85-.2.25-.06.5-.13.75-.21Z"/>
                <path className="abc-27" d="M1325.45,847.41c-.05.42-.11.84-.17,1.26-.2,1.27-.46,2.54-.8,3.78-.24.08-.49.16-.75.21-.28.06-.56.13-.85.2.38-1.3.68-2.62.92-3.97.08-.43.14-.87.2-1.29.26-.02.51-.05.76-.08.23-.03.45-.07.67-.12Z"/>
                <path className="abc-422" d="M1325.71,844.49c-.04.61-.08,1.19-.13,1.67-.04.42-.08.84-.13,1.26-.22.05-.45.09-.67.12-.25.04-.51.06-.76.08.06-.43.11-.86.16-1.28.06-.5.11-1.07.16-1.67.24-.02.49-.03.73-.07.22-.04.43-.07.65-.1Z"/>
                <path className="abc-179" d="M1325.92,840.93c-.03.55-.06,1.06-.09,1.57-.04.7-.08,1.38-.12,1.99-.21.03-.43.06-.65.1-.24.04-.48.06-.73.07.05-.6.09-1.24.14-1.87.05-.54.1-1.09.14-1.66.23-.03.46-.06.68-.1.21-.03.41-.07.62-.1Z"/>
                <path className="abc-127" d="M1326.87,634.84c0,54.4-.02,106.37-.03,137.25,0,9.04.01,16.76,0,22.83-.01,13.46-.28,33.31-.84,44.32-.03.58-.05,1.14-.08,1.68-.2.04-.41.07-.62.1-.23.04-.45.07-.68.1.05-.57.09-1.15.13-1.73,1.23-18.09.74-46.85.76-80.89.03-40.12.05-87.83.07-134.7.23,0,.45.03.68.05.21,2.83.41,6.91.61,10.99Z"/>
                <path className="abc-282" d="M1326.9,425.17c0,1.42,0,2.82,0,4.24,0,24.51-.02,117.93-.03,205.43-.2-4.08-.4-8.16-.61-10.99-.23-.03-.45-.06-.68-.05.03-78.05.06-153.91.06-189.47,0-2.16,0-4.32,0-6.48.22,0,.44,0,.66,0,.2,0,.4-1.34.59-2.68Z"/>
                <path className="abc-205" d="M1326.9,416.36c0,1.43,0,2.98,0,4.57,0,1.42,0,2.82,0,4.24-.19,1.34-.39,2.69-.59,2.68-.22,0-.44,0-.66,0,0-2.16,0-4.32,0-6.48,0-1.42,0-2.84,0-4.26.22,0,.44,0,.66,0,.2,0,.39-.37.59-.74Z"/>
                <path className="abc-96" d="M1326.9,412.07v.46c0,1.1,0,2.4,0,3.83-.19.37-.39.74-.59.74-.22,0-.44,0-.66,0v-4.86c.22,0,.44,0,.66,0,.2,0,.39-.08.59-.17Z"/>
                <path className="abc-188" d="M1326.9,411.64v.43c-.19.08-.39.17-.59.17-.22,0-.44,0-.66,0v-.6c.22,0,.44,0,.66,0,.2,0,.39,0,.59,0Z"/>
                <path className="abc-234" d="M1312.82,870.15c-.4.36-.78.7-1.15,1.02-.25.13-.5.26-.75.39-.34.17-.69.34-1.03.5.38-.33.8-.69,1.22-1.06.34-.16.69-.32,1.03-.49.22-.11.45-.23.68-.35Z"/>
                <path className="abc-162" d="M1314.99,868.19c-.32.29-.64.58-.95.86-.42.37-.83.74-1.22,1.1-.23.12-.45.24-.68.35-.34.17-.68.33-1.03.49.43-.37.87-.76,1.31-1.15.33-.29.67-.59,1.01-.89.34-.16.68-.32,1.02-.49.18-.09.36-.18.54-.27Z"/>
                <path className="abc-45" d="M1316.65,866.67c-.23.22-.46.44-.7.65-.31.29-.64.58-.95.87-.18.09-.36.18-.54.27-.34.16-.68.33-1.02.49.34-.3.68-.61,1.01-.91.25-.23.51-.46.76-.69.34-.16.68-.32,1.01-.48.14-.07.29-.14.43-.21Z"/>
                <path className="abc-449" d="M1317.8,865.58c-.15.15-.31.3-.47.44-.23.21-.46.43-.69.65-.14.07-.28.14-.43.21-.33.16-.67.32-1.01.48.25-.23.5-.46.74-.68.17-.16.34-.31.5-.46.34-.15.67-.31,1.01-.47.11-.05.23-.11.34-.16Z"/>
                <path className="abc-109" d="M1318.78,864.63c-.17.17-.34.34-.52.51-.15.14-.3.29-.45.44-.11.06-.23.11-.34.16-.33.16-.67.31-1.01.47.17-.15.33-.31.49-.46.18-.17.35-.34.52-.51.33-.15.67-.3.99-.45.1-.05.21-.1.32-.16Z"/>
                <path className="abc-409" d="M1320.51,862.65c-.39.5-.8.99-1.23,1.46-.17.18-.33.35-.5.52-.11.05-.21.11-.32.16-.33.16-.66.31-.99.45.17-.17.34-.35.51-.52.43-.47.85-.95,1.24-1.45.32-.13.64-.27.96-.42.11-.05.22-.12.34-.2Z"/>
                <path className="abc-332" d="M1323.21,858.41c-.48.93-1.01,1.83-1.59,2.7-.35.53-.72,1.04-1.11,1.54-.11.08-.23.15-.34.2-.32.15-.64.28-.96.42.4-.5.77-1.01,1.13-1.54.59-.87,1.13-1.77,1.62-2.71.29-.11.58-.23.86-.35.13-.05.26-.15.39-.26Z"/>
                <path className="abc-397" d="M1325.66,851.96c-.32,1.22-.71,2.42-1.17,3.6-.38.97-.81,1.92-1.28,2.85-.13.11-.26.21-.39.26-.28.12-.57.24-.86.35.49-.94.93-1.9,1.32-2.88.47-1.2.88-2.43,1.21-3.68.24-.08.49-.17.73-.26.15-.05.3-.14.45-.24Z"/>
                <path className="abc-355" d="M1326.59,847.05c-.05.41-.1.83-.17,1.25-.19,1.22-.44,2.45-.76,3.67-.15.1-.3.19-.45.24-.24.09-.48.18-.73.26.33-1.25.6-2.51.8-3.78.07-.42.12-.84.17-1.26.22-.05.44-.11.66-.18.16-.05.32-.12.48-.19Z"/>
                <path className="abc-420" d="M1326.84,844.19c-.04.6-.08,1.15-.12,1.62-.04.41-.08.83-.13,1.24-.16.07-.32.14-.48.19-.21.07-.43.13-.66.18.05-.42.09-.84.13-1.26.04-.48.09-1.06.13-1.67.21-.03.42-.07.63-.13.17-.04.33-.1.49-.17Z"/>
                <path className="abc-324" d="M1327.04,840.66c-.03.55-.05,1.07-.09,1.59-.04.68-.08,1.34-.12,1.94-.16.06-.33.12-.49.17-.21.06-.42.1-.63.13.04-.61.08-1.29.12-1.99.03-.51.06-1.02.09-1.57.2-.03.41-.07.61-.12.17-.04.34-.09.51-.15Z"/>
                <path className="abc-393" d="M1327.92,642.06c0,52.2-.01,101.61-.02,131.12,0,9.26,0,17.08-.02,23.09-.03,12.77-.3,32.04-.76,42.71-.02.58-.05,1.13-.08,1.68-.17.06-.34.11-.51.15-.21.05-.41.08-.61.12.03-.55.05-1.1.08-1.68.55-11.01.82-30.85.84-44.32,0-6.08,0-13.8,0-22.83,0-30.89.02-82.85.03-137.25.2,4.08.4,8.16.61,10.98.15.7.3-1.53.45-3.77Z"/>
                <path className="abc-366" d="M1328.01,425.13c.01,1.41.02,2.83.03,4.24.11,17.31-.1,65.02-.11,121.39,0,29.09,0,60.67-.01,91.3-.15,2.24-.29,4.47-.45,3.77-.21-2.83-.41-6.91-.61-10.98.01-87.5.03-180.92.03-205.43,0-1.42,0-2.82,0-4.24.19-1.34.39-2.68.58-2.67.19.02.36,1.32.53,2.62Z"/>
                <path className="abc-210" d="M1327.87,416.32c.03,1.43.07,2.99.09,4.57.02,1.41.03,2.83.05,4.24-.17-1.3-.34-2.6-.53-2.62-.19-.02-.38,1.32-.58,2.67,0-1.42,0-2.82,0-4.24,0-1.59,0-3.14,0-4.57.19-.37.39-.74.58-.74.18,0,.29.34.4.69Z"/>
                <path className="abc-143" d="M1327.96,412.06c-.01.14-.03.29-.04.45-.08,1.08-.07,2.38-.05,3.81-.11-.35-.21-.7-.4-.69-.19,0-.38.37-.58.74,0-1.43,0-2.73,0-3.83v-.46c.19-.08.39-.17.58-.17.18,0,.33.07.48.15Z"/>
                <path className="abc-325" d="M1328.01,411.65c-.02.13-.03.27-.05.41-.15-.08-.31-.16-.48-.15-.19,0-.38.08-.58.17v-.43c.19,0,.39,0,.58,0,.18,0,.36,0,.53,0Z"/>
                <path className="abc-301" d="M1314.43,869.23c-.34.32-.66.64-.98.92-.34.21-.68.41-1.02.6-.25.14-.5.28-.75.42.37-.32.75-.66,1.15-1.02.23-.12.46-.25.68-.37.31-.17.62-.35.92-.54Z"/>
                <path className="abc-231" d="M1316.25,867.5c-.27.26-.53.52-.79.75-.35.32-.69.65-1.03.97-.31.19-.62.37-.92.54-.23.13-.45.25-.68.37.4-.36.8-.73,1.22-1.1.31-.28.63-.57.95-.86.18-.09.36-.19.54-.28.24-.13.48-.27.72-.4Z"/>
                <path className="abc-288" d="M1317.63,866.15c-.19.2-.39.4-.59.58-.26.24-.53.51-.79.77-.24.14-.48.27-.72.4-.18.1-.36.19-.54.28.32-.29.64-.58.95-.87.24-.22.47-.44.7-.65.14-.07.28-.14.42-.21.19-.1.38-.2.57-.3Z"/>
                <path className="abc-133" d="M1318.6,865.18c-.13.13-.26.27-.39.4-.19.18-.38.38-.57.58-.19.1-.38.2-.57.3-.14.07-.28.14-.42.21.23-.22.46-.44.69-.65.16-.15.31-.3.47-.44.11-.06.23-.11.34-.17.15-.08.31-.15.46-.23Z"/>
                <path className="abc-172" d="M1319.52,864.22c-.18.19-.36.37-.54.56-.13.12-.25.26-.38.39-.15.08-.3.15-.46.23-.11.06-.23.11-.34.17.15-.15.3-.29.45-.44.18-.17.35-.34.52-.51.11-.05.21-.11.32-.17.14-.08.29-.16.43-.24Z"/>
                <path className="abc-109" d="M1321.32,862.08c-.41.53-.83,1.06-1.28,1.57-.17.2-.34.38-.52.57-.14.08-.29.16-.43.24-.11.06-.21.11-.32.17.17-.17.34-.34.5-.52.43-.47.84-.96,1.23-1.46.11-.08.23-.16.34-.23.15-.09.31-.22.47-.34Z"/>
                <path className="abc-293" d="M1324.12,857.65c-.49.95-1.04,1.88-1.64,2.79-.36.55-.75,1.1-1.15,1.63-.16.13-.32.25-.47.34-.11.07-.23.15-.34.23.39-.5.76-1.01,1.11-1.54.58-.87,1.11-1.77,1.59-2.7.13-.11.26-.22.39-.3.17-.1.35-.28.52-.46Z"/>
                <path className="abc-386" d="M1326.67,851.19c-.34,1.2-.74,2.39-1.22,3.58-.39.97-.84,1.94-1.33,2.89-.18.18-.35.36-.52.46-.12.08-.25.19-.39.3.48-.93.9-1.88,1.28-2.85.46-1.18.85-2.38,1.17-3.6.15-.1.3-.2.44-.29.19-.12.38-.3.57-.48Z"/>
                <path className="abc-379" d="M1327.67,846.41c-.06.4-.12.8-.19,1.2-.21,1.18-.48,2.38-.81,3.58-.19.18-.38.36-.57.48-.14.09-.29.2-.44.29.32-1.22.57-2.44.76-3.67.06-.41.12-.83.17-1.25.16-.07.31-.15.47-.24.21-.12.41-.25.61-.39Z"/>
                <path className="abc-199" d="M1327.96,843.71c-.04.55-.09,1.07-.14,1.52-.04.39-.09.79-.15,1.19-.2.14-.4.27-.61.39-.15.09-.31.17-.47.24.05-.41.09-.83.13-1.24.04-.47.08-1.03.12-1.62.16-.06.32-.13.48-.19.21-.08.43-.18.64-.29Z"/>
                <path className="abc-330" d="M1328.21,840.24c-.03.58-.07,1.16-.12,1.74-.04.59-.08,1.18-.13,1.73-.21.1-.42.21-.64.29-.16.06-.32.13-.48.19.04-.6.08-1.26.12-1.94.03-.52.06-1.04.09-1.59.17-.06.34-.12.5-.17.22-.07.45-.16.67-.25Z"/>
                <path className="abc-417" d="M1328.89,630.72c.01,44.87.02,90.11,0,128.33,0,2.11,0,4.19,0,6.25-.01,30.71.11,56.49-.59,73.21-.02.58-.05,1.16-.09,1.74-.22.09-.44.18-.67.25-.16.05-.33.11-.5.17.03-.55.05-1.1.08-1.68.46-10.67.73-29.94.76-42.71.02-6.01.02-13.83.02-23.09,0-29.5.01-78.92.02-131.12.15-2.24.29-4.48.44-3.79.19-2.6.36-5.08.53-7.55Z"/>
                <path className="abc-77" d="M1329,427.76c0,2.16.01,4.32.02,6.48.06,24.23-.15,67.44-.14,117.2,0,25.23.01,52.17.02,79.28-.17,2.47-.33,4.94-.53,7.55-.15-.69-.29,1.55-.44,3.79,0-30.62,0-62.21.01-91.3,0-56.38.21-104.08.11-121.39,0-1.41-.02-2.83-.03-4.24.17,1.3.34,2.6.52,2.62.18.02.33.02.47.02Z"/>
                <path className="abc-186" d="M1328.91,417.04c0,1.42.05,2.84.05,4.25.01,2.16.02,4.32.03,6.47-.14,0-.29,0-.47-.02-.19-.02-.35-1.32-.52-2.62-.01-1.41-.03-2.83-.05-4.24-.01-1.58-.06-3.13-.09-4.57.11.35.21.7.39.7.21,0,.43.02.65.02Z"/>
                <path className="abc-244" d="M1329.11,412.21c-.03.19-.05.4-.07.61-.11,1.39-.14,2.81-.13,4.22-.22,0-.44-.02-.65-.02-.18,0-.28-.35-.39-.7-.03-1.43-.03-2.74.05-3.81.01-.15.02-.3.04-.45.15.08.3.16.47.16.23,0,.46,0,.67,0Z"/>
                <path className="abc-369" d="M1329.22,411.65c-.04.17-.08.37-.11.56-.22,0-.44.01-.67,0-.17,0-.32-.08-.47-.16.01-.14.03-.28.05-.41.18,0,.35,0,.52,0,.23,0,.46,0,.69,0Z"/>
                <path className="abc-37" d="M1315.98,868.22c-.28.28-.56.55-.83.79-.23.17-.46.33-.7.48-.33.23-.67.44-1.01.65.32-.28.65-.59.98-.92.31-.19.62-.38.92-.58.21-.14.42-.28.63-.43Z"/>
                <path className="abc-455" d="M1317.47,866.76c-.21.22-.42.43-.63.63-.29.27-.57.55-.85.83-.21.15-.42.29-.63.43-.3.2-.61.39-.92.58.34-.32.68-.66,1.03-.97.26-.24.53-.5.79-.75.24-.14.48-.28.72-.43.17-.1.33-.21.5-.31Z"/>
                <path className="abc-81" d="M1318.58,865.62c-.16.17-.32.35-.48.5-.21.21-.42.42-.63.64-.16.11-.33.21-.5.31-.24.15-.48.29-.72.43.27-.26.53-.52.79-.77.2-.19.39-.39.59-.58.19-.1.37-.21.56-.31.13-.07.26-.15.39-.23Z"/>
                <path className="abc-276" d="M1319.36,864.78c-.1.12-.21.23-.32.34-.15.16-.31.33-.47.5-.13.08-.26.15-.39.23-.18.11-.37.21-.56.31.19-.2.38-.4.57-.58.13-.13.26-.26.39-.4.15-.08.3-.16.45-.24.1-.06.21-.11.31-.17Z"/>
                <path className="abc-445" d="M1320.24,863.8c-.19.21-.38.43-.57.64-.1.11-.21.22-.31.34-.1.06-.21.11-.31.17-.15.08-.3.16-.45.24.13-.13.26-.27.38-.39.18-.19.36-.37.54-.56.14-.08.29-.17.43-.25.1-.06.2-.12.29-.17Z"/>
                <path className="abc-223" d="M1322.11,861.47c-.42.57-.86,1.13-1.32,1.68-.18.21-.36.43-.55.64-.1.06-.2.12-.29.17-.14.08-.28.17-.43.25.18-.19.35-.38.52-.57.45-.51.87-1.04,1.28-1.57.16-.13.32-.26.47-.36.11-.07.21-.16.32-.24Z"/>
                <path className="abc-323" d="M1324.98,856.84c-.51.98-1.07,1.95-1.68,2.91-.37.58-.77,1.16-1.19,1.72-.11.09-.22.17-.32.24-.15.1-.31.23-.47.36.4-.53.79-1.08,1.15-1.63.6-.91,1.15-1.84,1.64-2.79.18-.18.35-.36.51-.49.11-.08.23-.21.35-.32Z"/>
                <path className="abc-22" d="M1327.59,850.32c-.35,1.18-.76,2.38-1.25,3.58-.4.98-.85,1.97-1.36,2.95-.12.12-.24.24-.35.32-.16.12-.34.31-.51.49.49-.95.94-1.91,1.33-2.89.48-1.19.88-2.38,1.22-3.58.19-.18.37-.37.55-.52.13-.1.25-.23.37-.35Z"/>
                <path className="abc-384" d="M1328.66,845.69c-.06.37-.14.75-.21,1.13-.22,1.14-.5,2.31-.85,3.5-.12.13-.25.25-.37.35-.18.15-.36.33-.55.52.34-1.2.61-2.39.81-3.58.07-.4.13-.8.19-1.2.2-.14.4-.28.59-.43.13-.1.27-.2.4-.3Z"/>
                <path className="abc-236" d="M1328.99,843.2c-.05.48-.1.94-.16,1.37-.05.37-.11.74-.17,1.11-.13.1-.26.2-.4.3-.19.14-.39.29-.59.43.06-.4.1-.8.15-1.19.05-.45.1-.97.14-1.52.21-.1.42-.21.62-.3.14-.06.28-.14.42-.21Z"/>
                <path className="abc-263" d="M1329.3,839.8c-.04.63-.1,1.27-.16,1.92-.04.5-.09,1-.14,1.47-.14.07-.28.14-.42.21-.2.09-.41.2-.62.3.04-.55.09-1.13.13-1.73.05-.59.09-1.16.12-1.74.22-.09.44-.18.65-.26.15-.05.29-.12.44-.18Z"/>
                <path className="abc-220" d="M1329.82,623.19c0,48.5,0,97.82-.02,138.71,0,1.9,0,3.78,0,5.64,0,29.51.26,54.24-.4,70.44-.02.58-.06,1.19-.1,1.82-.14.06-.29.12-.44.18-.21.08-.43.17-.65.26.03-.58.06-1.16.09-1.74.7-16.72.58-42.49.59-73.21,0-2.06,0-4.15,0-6.25.01-38.22,0-83.45,0-128.33.17-2.47.33-4.92.51-7.47.14-.04.29-.05.43-.06Z"/>
                <path className="abc-196" d="M1329.98,427.69c-.01,2.15-.04,4.31-.05,6.46-.1,35.38-.11,111.15-.11,189.04-.14.01-.29.03-.43.06-.18,2.55-.34,5.01-.51,7.47,0-27.11-.01-54.06-.02-79.28,0-49.76.21-92.97.14-117.2,0-2.16-.01-4.32-.02-6.48.14,0,.28-.02.44-.05.17-.04.36-.03.54-.03Z"/>
                <path className="abc-94" d="M1329.88,416.91c0,1.46.05,2.94.07,4.32.05,2.15.04,4.3.03,6.45-.18,0-.37,0-.54.03-.16.03-.3.04-.44.05,0-2.16-.02-4.32-.03-6.47,0-1.4-.05-2.83-.05-4.25.22,0,.43,0,.62-.03.15-.03.25-.06.34-.1Z"/>
                <path className="abc-8" d="M1330.19,412.15c-.04.17-.07.37-.09.56-.17,1.3-.22,2.74-.22,4.2-.09.04-.19.08-.34.1-.19.03-.4.03-.62.03,0-1.42.01-2.83.13-4.22.02-.21.04-.42.07-.61.22,0,.43-.02.65-.03.14,0,.29-.02.44-.03Z"/>
                <path className="abc-410" d="M1330.33,411.65c-.05.15-.1.32-.14.5-.14,0-.29.02-.44.03-.22.01-.43.03-.65.03.03-.19.07-.39.11-.56.23,0,.45,0,.66,0,.15,0,.3,0,.45,0Z"/>
                <path className="abc-84" d="M1317.39,867.18c-.23.22-.46.44-.69.65-.29.23-.57.46-.86.68-.23.17-.46.34-.69.51.27-.24.55-.51.83-.79.21-.15.42-.3.63-.45.26-.19.52-.39.78-.6Z"/>
                <path className="abc-391" d="M1318.57,866c-.16.17-.32.34-.5.5-.23.22-.46.45-.69.67-.26.2-.52.4-.78.6-.21.15-.42.3-.63.45.28-.28.57-.57.85-.83.21-.2.42-.41.63-.63.16-.11.33-.22.49-.33.21-.14.41-.29.61-.43Z"/>
                <path className="abc-35" d="M1319.44,865.08c-.12.14-.25.28-.38.41-.17.17-.32.34-.49.51-.2.15-.41.29-.61.43-.16.11-.33.22-.49.33.21-.22.42-.43.63-.64.16-.16.32-.33.48-.5.13-.08.26-.15.38-.23.16-.1.32-.2.48-.31Z"/>
                <path className="abc-139" d="M1320.06,864.39c-.08.09-.16.19-.25.28-.12.13-.25.27-.37.41-.16.1-.32.21-.48.31-.13.08-.25.16-.38.23.16-.17.32-.35.47-.5.11-.11.21-.22.32-.34.1-.06.21-.11.31-.17.13-.07.26-.14.39-.22Z"/>
                <path className="abc-190" d="M1320.89,863.42c-.19.23-.39.47-.59.69-.08.09-.16.18-.25.28-.13.07-.26.14-.39.22-.1.06-.21.11-.31.17.1-.12.21-.23.31-.34.19-.21.38-.42.57-.64.1-.06.19-.12.29-.17.12-.07.24-.14.36-.21Z"/>
                <path className="abc-326" d="M1322.82,860.95c-.43.6-.88,1.19-1.36,1.78-.18.23-.37.46-.57.69-.12.07-.24.14-.36.21-.1.06-.19.11-.29.17.19-.21.37-.43.55-.64.46-.55.9-1.12,1.32-1.68.11-.09.21-.17.32-.24.13-.09.26-.19.39-.29Z"/>
                <path className="abc-237" d="M1325.75,856.14c-.51,1-1.08,2-1.72,3-.38.6-.79,1.21-1.22,1.8-.13.1-.26.21-.39.29-.1.07-.21.15-.32.24.42-.57.81-1.14,1.19-1.72.62-.96,1.18-1.93,1.68-2.91.12-.12.23-.24.34-.32.14-.1.28-.25.42-.39Z"/>
                <path className="abc-293" d="M1328.41,849.58c-.36,1.17-.78,2.36-1.28,3.57-.41.99-.87,1.99-1.38,2.99-.14.14-.29.29-.42.39-.11.08-.23.2-.34.32.51-.98.96-1.96,1.36-2.95.49-1.2.9-2.39,1.25-3.58.12-.13.24-.25.36-.34.15-.12.3-.26.45-.39Z"/>
                <path className="abc-21" d="M1329.52,845.07c-.07.36-.15.72-.23,1.09-.24,1.11-.53,2.26-.89,3.43-.15.13-.3.28-.45.39-.12.09-.24.22-.36.34.35-1.18.63-2.35.85-3.5.07-.39.15-.76.21-1.13.13-.1.26-.2.39-.29.16-.12.32-.23.48-.33Z"/>
                <path className="abc-417" d="M1329.89,842.75c-.06.42-.12.83-.18,1.25-.06.36-.12.7-.19,1.06-.16.1-.31.21-.48.33-.13.09-.26.19-.39.29.06-.37.12-.74.17-1.11.06-.44.11-.9.16-1.37.14-.07.27-.14.41-.2.17-.08.33-.16.5-.24Z"/>
                <path className="abc-299" d="M1330.24,839.43c-.05.66-.12,1.36-.2,2.06-.04.42-.09.84-.15,1.26-.16.08-.33.17-.5.24-.13.06-.27.13-.41.2.05-.48.1-.97.14-1.47.07-.65.12-1.3.16-1.92.14-.06.29-.12.43-.17.17-.06.35-.13.52-.2Z"/>
                <path className="abc-17" d="M1330.68,631.58c-.06,58.53-.1,116.51-.13,155.18-.01,22.8.14,40.06-.14,48.62-.01.67-.03,1.4-.06,2.17-.02.58-.06,1.22-.11,1.88-.17.07-.35.14-.52.2-.14.05-.28.11-.43.17.04-.63.08-1.24.1-1.82.66-16.21.4-40.93.4-70.44,0-1.86,0-3.74,0-5.64.02-40.89.02-90.21.02-138.71.14-.01.28-.03.41-.07.15,3.09.3,5.78.44,8.47Z"/>
                <path className="abc-393" d="M1330.96,421.9c-.01,1.45-.04,2.98-.04,4.57-.07,26.61-.16,116.43-.25,205.11-.14-2.69-.29-5.38-.44-8.47-.13.04-.27.05-.41.07,0-77.89,0-153.66.11-189.04,0-2.15.03-4.3.05-6.46.18,0,.36,0,.52-.05.17-1.92.32-3.83.46-5.74Z"/>
                <path className="abc-419" d="M1330.82,415.16c.01.89.07,1.8.1,2.61.05,1.3.05,2.68.04,4.13-.14,1.91-.29,3.81-.46,5.74-.16.05-.34.06-.52.05.01-2.15.02-4.31-.03-6.45-.03-1.38-.08-2.86-.07-4.32.09-.04.18-.09.32-.13.18-.59.4-1.1.62-1.62Z"/>
                <path className="abc-41" d="M1331.12,412.14c-.05.17-.09.35-.13.53-.15.73-.19,1.6-.17,2.49-.22.51-.44,1.03-.62,1.62-.14.05-.23.09-.32.13,0-1.46.05-2.9.22-4.2.02-.2.05-.39.09-.56.14-.01.29-.02.42-.04.18.02.35.02.51.03Z"/>
                <path className="abc-190" d="M1331.3,411.65c-.07.16-.13.32-.18.49-.16,0-.33-.02-.51-.03-.13.02-.28.03-.42.04.04-.17.08-.35.14-.5.15,0,.29,0,.44,0,.18,0,.36,0,.53,0Z"/>
                <path className="abc-315" d="M1318.16,866.55c-.2.19-.4.37-.61.55-.28.25-.56.49-.85.72.23-.2.46-.43.69-.65.26-.2.52-.41.77-.63Z"/>
                <path className="abc-67" d="M1319.18,865.54c-.14.15-.29.29-.43.44-.19.19-.39.38-.59.57-.25.21-.51.42-.77.63.23-.22.46-.45.69-.67.17-.16.33-.33.5-.5.2-.15.41-.3.61-.46Z"/>
                <path className="abc-443" d="M1319.92,864.75c-.1.11-.21.23-.32.34-.14.15-.28.3-.42.44-.2.16-.4.31-.61.46.16-.17.32-.34.49-.51.13-.13.25-.27.38-.41.16-.1.32-.21.48-.32Z"/>
                <path className="abc-218" d="M1320.44,864.17c-.07.08-.14.16-.21.24-.1.12-.21.23-.31.35-.16.11-.32.22-.48.32.12-.14.25-.28.37-.41.08-.09.17-.19.25-.28.13-.07.26-.15.38-.22Z"/>
                <path className="abc-450" d="M1321.25,863.23c-.19.23-.39.47-.59.7-.07.08-.14.16-.21.24-.13.07-.25.15-.38.22.08-.09.16-.19.25-.28.2-.22.4-.46.59-.69.12-.07.24-.13.35-.19Z"/>
                <path className="abc-25" d="M1323.19,860.69c-.43.61-.89,1.23-1.38,1.84-.19.23-.38.47-.57.7-.12.06-.23.13-.35.19.19-.23.38-.47.57-.69.48-.59.93-1.19,1.36-1.78.13-.1.26-.19.38-.26Z"/>
                <path className="abc-251" d="M1326.16,855.8c-.52,1.01-1.09,2.02-1.73,3.04-.39.62-.8,1.23-1.23,1.85-.12.06-.25.16-.38.26.43-.6.83-1.2,1.22-1.8.63-.99,1.2-2,1.72-3,.14-.14.28-.27.41-.34Z"/>
                <path className="abc-85" d="M1328.84,849.26c-.36,1.16-.79,2.34-1.29,3.55-.41.99-.87,1.99-1.39,3-.13.07-.27.2-.41.34.51-1,.97-2,1.38-2.99.5-1.2.92-2.4,1.28-3.57.15-.13.29-.25.44-.33Z"/>
                <path className="abc-216" d="M1329.98,844.8c-.07.36-.15.72-.23,1.08-.25,1.09-.54,2.22-.91,3.37-.14.07-.29.19-.44.33.36-1.17.65-2.32.89-3.43.08-.37.16-.73.23-1.09.16-.1.31-.19.46-.27Z"/>
                <path className="abc-352" d="M1330.37,842.53c-.06.4-.12.8-.2,1.21-.06.35-.13.7-.2,1.05-.15.08-.3.17-.46.27.07-.36.14-.71.19-1.06.07-.42.13-.83.18-1.25.16-.08.32-.16.48-.22Z"/>
                <path className="abc-35" d="M1330.74,839.26c-.05.67-.12,1.37-.21,2.12-.05.38-.1.77-.16,1.16-.15.06-.31.14-.48.22.06-.42.1-.83.15-1.26.08-.71.15-1.41.2-2.06.17-.07.34-.13.5-.18Z"/>
                <path className="abc-170" d="M1331.09,640.08c-.11,98.32-.2,192.35-.2,194.84,0,.7,0,1.54-.04,2.46-.02.58-.06,1.21-.11,1.88-.16.05-.33.11-.5.18.05-.66.09-1.29.11-1.88.03-.77.05-1.5.06-2.17.28-8.56.12-25.82.14-48.62.03-38.68.07-96.66.13-155.18.15,2.69.29,5.39.42,8.49Z"/>
                <path className="abc-441" d="M1331.4,416.17c0,.75,0,1.65-.01,2.69-.06,17.86-.19,121.74-.3,221.22-.13-3.11-.27-5.8-.42-8.49.08-88.68.18-178.5.25-205.11,0-1.59.03-3.12.04-4.57.14-1.91.28-3.81.44-5.73Z"/>
                <path className="abc-38" d="M1331.41,413.55c0,.27,0,.54,0,.8,0,.46,0,1.06,0,1.82-.15,1.92-.29,3.83-.44,5.73.01-1.45,0-2.83-.04-4.13-.03-.81-.09-1.72-.1-2.61.22-.51.43-1.03.59-1.61Z"/>
                <path className="abc-234" d="M1331.6,412.18c-.05.18-.1.37-.13.57-.04.26-.06.53-.06.8-.16.59-.38,1.1-.59,1.61-.01-.89.02-1.76.17-2.49.03-.18.08-.36.13-.53.16,0,.32.02.48.03Z"/>
                <path className="abc-53" d="M1331.8,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
              </g>
              <g>
                <path className="abc-51" d="M1331.8,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M1331.8,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M1331.8,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M1331.8,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M1331.8,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M1331.8,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M1331.8,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M1331.8,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M1331.8,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M1331.8,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M1331.8,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M1331.8,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M1331.8,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M1331.8,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M1331.8,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M1331.8,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
              </g>
              <g>
                <path className="abc-51" d="M1331.8,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M1331.8,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M1331.8,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M1331.8,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M1331.8,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M1331.8,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M1331.8,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M1331.8,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M1331.8,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M1331.8,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M1331.8,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M1331.8,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M1331.8,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M1331.8,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                <path className="abc-51" d="M1331.8,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
              </g>
            </g>
          </g>
          </g>
        </g>
      </g>
    </g>
    )}
    <g ref={pourStreamRef} style={{ opacity: 0 }} aria-hidden="true">
      <defs>
        <linearGradient id="pour-stream-core-grad" x1="1290" y1="620" x2="506" y2="620" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#daf2fc" stopOpacity="0.38"/>
          <stop offset="0.3" stopColor="#c8ecfa" stopOpacity="0.32"/>
          <stop offset="0.6" stopColor="#b8e6f8" stopOpacity="0.28"/>
          <stop offset="1" stopColor="#d0f0fc" stopOpacity="0.22"/>
        </linearGradient>
        <linearGradient id="pour-stream-flank-grad" x1="1290" y1="620" x2="506" y2="620" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#e0f4fc" stopOpacity="0.22"/>
          <stop offset="0.5" stopColor="#d0eefa" stopOpacity="0.18"/>
          <stop offset="1" stopColor="#e4f6fd" stopOpacity="0.15"/>
        </linearGradient>
        <linearGradient id="pour-stream-outer-grad" x1="1290" y1="620" x2="506" y2="620" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#eaf8fd" stopOpacity="0.10"/>
          <stop offset="0.5" stopColor="#e0f4fc" stopOpacity="0.08"/>
          <stop offset="1" stopColor="#eef9fe" stopOpacity="0.06"/>
        </linearGradient>
        <radialGradient id="landing-glow-grad" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.35"/>
          <stop offset="0.35" stopColor="#e8f6fc" stopOpacity="0.18"/>
          <stop offset="0.7" stopColor="#d4f0fa" stopOpacity="0.06"/>
          <stop offset="1" stopColor="#d4f0fa" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="micro-drop-grad" cx="0.4" cy="0.4" r="0.6">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.50"/>
          <stop offset="0.4" stopColor="#e8f8ff" stopOpacity="0.30"/>
          <stop offset="1" stopColor="#d4f0fa" stopOpacity="0.12"/>
        </radialGradient>
        <radialGradient id="splash-drop-grad" cx="0.3" cy="0.3" r="0.7">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.60"/>
          <stop offset="0.5" stopColor="#d4f0fa" stopOpacity="0.35"/>
          <stop offset="1" stopColor="#b8e6f8" stopOpacity="0.10"/>
        </radialGradient>
        <filter id="splash-soft-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.2"/>
        </filter>
      </defs>
      {/* Layer 5: outer left flank — faint, sin-wobble */}
      <path
        ref={streamOuterL}
        d="M 1291.75 607.72 Q 898.875 660 506 618"
        fill="none"
        stroke="url(#pour-stream-outer-grad)"
        strokeWidth="0.9"
        strokeLinecap="round"
        opacity="0.18"
      />
      {/* Layer 4: outer right flank — faint, sin-wobble */}
      <path
        ref={streamOuterR}
        d="M 1291.75 607.72 Q 898.875 660 506 618"
        fill="none"
        stroke="url(#pour-stream-outer-grad)"
        strokeWidth="0.9"
        strokeLinecap="round"
        opacity="0.18"
      />
      {/* Layer 3: inner left flank */}
      <path
        ref={streamInnerL}
        d="M 1291.75 607.72 Q 898.875 660 506 618"
        fill="none"
        stroke="url(#pour-stream-flank-grad)"
        strokeWidth="2.25"
        strokeLinecap="round"
        opacity="0.55"
      />
      {/* Layer 2: inner right flank */}
      <path
        ref={streamInnerR}
        d="M 1291.75 607.72 Q 898.875 660 506 618"
        fill="none"
        stroke="url(#pour-stream-flank-grad)"
        strokeWidth="2.25"
        strokeLinecap="round"
        opacity="0.55"
      />
      {/* Layer 1: core — full width, smooth, unbroken */}
      <path
        ref={streamCoreRef}
        d="M 1291.75 607.72 Q 898.875 660 506 618"
        fill="none"
        stroke="url(#pour-stream-core-grad)"
        strokeWidth="5"
        strokeLinecap="round"
        opacity="0.90"
      />
      {/* Landing glow — radial white-blue at impact point */}
      <circle
        ref={landingGlowRef}
        cx={STREAM_END_X}
        cy="618"
        r="28"
        fill="url(#landing-glow-grad)"
        opacity="0"
      />
      {/* Micro-droplets — only when pour strength > 0.4 */}
      <g ref={microDropletsRef}>
        {Array.from({ length: 4 }, (_, i) => (
          <circle
            key={`mdrop-${i}`}
            cx="0" cy="0"
            r={1.8 + Math.random() * 2}
            fill="url(#micro-drop-grad)"
            opacity="0"
          />
        ))}
      </g>
      {/* Splash particles — burst outward when stream lands */}
      <g ref={splashGroupRef}>
        {Array.from({ length: 10 }, (_, i) => {
          const angle = (i / 10) * Math.PI * 2
          return (
            <circle
              key={`splash-${i}`}
              cx={STREAM_END_X}
              cy={618}
              r={i % 3 === 0 ? 3.5 : i % 3 === 1 ? 2.5 : 1.8}
              fill="url(#splash-drop-grad)"
              filter="url(#splash-soft-blur)"
              opacity="0"
              data-angle={angle}
              data-dist={10 + (i % 4) * 6}
            />
          )
        })}
      </g>
    </g>
    /////..Acetic Acid Stand///////
    <g
      id="Layer_10"
      data-name="Layer 10"
      ref={aceticStandRef}
      style={{ display: aceticFocusMode ? 'none' : undefined, pointerEvents: 'none' }}
    >
      <g>
        <g>
          <g>
            <path className="abc-69" d="M1111.25,644.1c-.03.38-.07.76-.07,1.14v40.28h611v-40.28c0-.38-.04-.75-.08-1.14h-610.86Z"/>
            <path className="abc-192" d="M1722.18,685.82h-611c-.17,0-.3-.13-.3-.3v-40.28c0-.3.02-.61.05-.91l.02-.25c0-.16.14-.28.29-.28h610.86c.15,0,.28.11.29.26.04.37.08.77.08,1.16v40.28c0,.17-.13.3-.29.3ZM1111.48,685.23h610.41v-39.99c0-.28-.01-.56-.04-.83h-610.32c-.02.28-.04.56-.04.83v39.99Z"/>
          </g>
          <path className="abc-13" d="M1111.66,644.1c-.05.38-.08.76-.08,1.14v3.61s0-3.89,3.36-3.89h604.51s2.73.45,2.73,2.52v-2.24c0-.38-.04-.75-.07-1.14h-610.46Z"/>
          <g className="abc-135">
            <path className="abc-102" d="M1603.71,660.91c-84.15-10.42-68.29,4.73-197.57,6.62-103.86,1.53-243.91-6.12-294.97-9.18v5.75c37.63,1.9,108.59,5.5,158.37,8.16,70.73,3.8,146.22.26,204.89,6.16,65.86,6.62,103.67,4.74,160.97,1.89,0,0,40.54-3.08,86.77-1.38v-7.84c-42.38,4.01-57.02-2.58-118.47-10.19ZM1541.45,675.79c-70.73-1.25-62.56-4.24-21.01-10.01,41.55-5.76,86.94,3.85,86.94,3.85,23.53,3.89,4.77,7.41-65.93,6.16Z"/>
            <path className="abc-104" d="M1570.03,651.04s36.12,2.7,86.12,10.46c27.13,4.2,47.61,5.55,66.04,2.04v-5.5c-35.77,6.04-103.41-6.16-152.16-6.99Z"/>
            <path className="abc-104" d="M1215.49,655.49c-74.21.86,79.13,8.14,184.45,5.64,0,0-110.25-6.48-184.45-5.64Z"/>
            <path className="abc-104" d="M1469.04,656.31c-35.38,5.62-70.05,3.02-50.63,4.75,19.42,1.72,50.63-1.73,77.67-6.05,21.69-3.45,63.13-3.87,63.13-3.87-32.6-3.03-54.79-.44-90.16,5.17Z"/>
            <path className="abc-105" d="M1264.07,678.87s-90.86-7.33-132.93-4.01c-42.08,3.35,14.02,4.01,73.17,5.67,59.15,1.68,91.47,0,59.76-1.67Z"/>
            <path className="abc-103" d="M1547.29,672.91c-37.75-.98-33.36-2.26-11.13-4.53,22.24-2.28,46.39,2.23,46.39,2.23,12.53,1.86,2.49,3.29-35.27,2.3Z"/>
          </g>
          <g className="abc-101">
            <path className="abc-446" d="M1449.93,685.52c-42.02-5.05-66.12-4.21-106.6-.17-.61.05-1.16.11-1.76.17h108.35Z"/>
          </g>
          <path className="abc-3" d="M1722.18,685.82h-611c-.17,0-.3-.13-.3-.3v-40.28c0-.3.02-.61.05-.91l.02-.25c0-.16.14-.28.29-.28h610.86c.15,0,.28.11.29.26.04.37.08.77.08,1.16v40.28c0,.17-.13.3-.29.3ZM1111.48,685.23h610.41v-39.99c0-.28-.01-.56-.04-.83h-610.32c-.02.28-.04.56-.04.83v39.99Z"/>
        </g>
        <g>
          <g>
            <path className="abc-292" d="M1111.25,780.71c-.03.37-.07.75-.07,1.13v40.29h611v-40.29c0-.37-.04-.75-.08-1.13h-610.86Z"/>
            <path className="abc-192" d="M1722.18,822.42h-611c-.17,0-.3-.13-.3-.3v-40.29c0-.3.03-.61.05-.92l.02-.23c0-.16.14-.28.29-.28h610.86c.15,0,.28.12.29.26.04.35.08.76.08,1.16v40.29c0,.16-.13.3-.29.3ZM1111.48,821.83h610.41v-39.99c0-.28-.02-.57-.04-.83h-610.32c-.02.28-.04.56-.04.83v39.99Z"/>
          </g>
          <path className="abc-12" d="M1111.66,780.71c-.05.37-.08.75-.08,1.13v3.62s0-3.89,3.36-3.89h604.51s2.73.45,2.73,2.52v-2.25c0-.37-.04-.75-.07-1.13h-610.46Z"/>
          <g className="abc-135">
            <path className="abc-102" d="M1603.71,797.52c-84.15-10.42-68.29,4.72-197.57,6.62-103.86,1.53-243.91-6.12-294.97-9.18v5.75c37.63,1.89,108.59,5.5,158.37,8.16,70.73,3.8,146.22.26,204.89,6.16,65.86,6.62,103.67,4.73,160.97,1.89,0,0,40.54-3.07,86.77-1.37v-7.83c-42.38,4.01-57.02-2.58-118.47-10.19ZM1541.45,812.4c-70.73-1.25-62.56-4.24-21.01-10.02,41.55-5.76,86.94,3.85,86.94,3.85,23.53,3.89,4.77,7.42-65.93,6.17Z"/>
            <path className="abc-104" d="M1570.03,787.64s36.12,2.7,86.12,10.46c27.13,4.21,47.61,5.55,66.04,2.03v-5.51c-35.77,6.06-103.41-6.15-152.16-6.98Z"/>
            <path className="abc-104" d="M1215.49,792.1c-74.21.85,79.13,8.13,184.45,5.63,0,0-110.25-6.48-184.45-5.63Z"/>
            <path className="abc-104" d="M1469.04,792.92c-35.38,5.62-70.05,3.01-50.63,4.75,19.42,1.73,50.63-1.73,77.67-6.04,21.69-3.46,63.13-3.87,63.13-3.87-32.6-3.03-54.79-.43-90.16,5.17Z"/>
            <path className="abc-105" d="M1264.07,815.47s-90.86-7.33-132.93-4.01c-42.08,3.34,14.02,4.01,73.17,5.67,59.15,1.67,91.47,0,59.76-1.67Z"/>
            <path className="abc-103" d="M1547.29,809.51c-37.75-.98-33.36-2.26-11.13-4.53,22.24-2.27,46.39,2.23,46.39,2.23,12.53,1.85,2.49,3.28-35.27,2.3Z"/>
          </g>
          <g className="abc-101">
            <path className="abc-446" d="M1449.93,822.13c-42.02-5.06-66.12-4.2-106.6-.17-.61.06-1.16.11-1.76.17h108.35Z"/>
          </g>
          <path className="abc-3" d="M1722.18,822.42h-611c-.17,0-.3-.13-.3-.3v-40.29c0-.3.03-.61.05-.92l.02-.23c0-.16.14-.28.29-.28h610.86c.15,0,.28.12.29.26.04.35.08.76.08,1.16v40.29c0,.16-.13.3-.29.3ZM1111.48,821.83h610.41v-39.99c0-.28-.02-.57-.04-.83h-610.32c-.02.28-.04.56-.04.83v39.99Z"/>
        </g>
        <g>
          <g>
            <path className="abc-412" d="M1111.25,870.62c-.03.16-.07.31-.07.46v16.44h611v-16.44c0-.16-.04-.31-.08-.46h-610.86Z"/>
            <path className="abc-192" d="M1722.18,887.83h-611c-.17,0-.3-.13-.3-.3v-16.44c0-.14.03-.28.05-.42l.02-.1c.02-.14.14-.25.29-.25h610.86c.13,0,.25.09.29.22.05.19.08.36.08.54v16.44c0,.17-.13.3-.29.3ZM1111.48,887.23h610.41v-16.15c0-.05,0-.11-.01-.17h-610.38c-.01.05-.01.11-.01.17v16.15Z"/>
          </g>
          <path className="abc-310" d="M1111.66,870.62c-.05.16-.08.31-.08.46v1.47s0-1.59,3.36-1.59h604.51s2.73.19,2.73,1.03v-.92c0-.16-.04-.31-.07-.46h-610.46Z"/>
          <g className="abc-135">
            <path className="abc-102" d="M1603.71,877.48c-84.15-4.25-68.29,1.94-197.57,2.71-103.86.62-243.91-2.5-294.97-3.75v2.35c37.63.78,108.59,2.24,158.37,3.33,70.73,1.55,146.22.11,204.89,2.51,65.86,2.7,103.67,1.93,160.97.77,0,0,40.54-1.26,86.77-.56v-3.2c-42.38,1.63-57.02-1.06-118.47-4.16ZM1541.45,883.55c-70.73-.51-62.56-1.73-21.01-4.09,41.55-2.35,86.94,1.57,86.94,1.57,23.53,1.59,4.77,3.03-65.93,2.52Z"/>
            <path className="abc-104" d="M1570.03,873.45s36.12,1.1,86.12,4.27c27.13,1.72,47.61,2.27,66.04.83v-2.25c-35.77,2.47-103.41-2.51-152.16-2.85Z"/>
            <path className="abc-104" d="M1215.49,875.27c-74.21.34,79.13,3.32,184.45,2.3,0,0-110.25-2.64-184.45-2.3Z"/>
            <path className="abc-104" d="M1469.04,875.6c-35.38,2.29-70.05,1.23-50.63,1.93,19.42.71,50.63-.7,77.67-2.46,21.69-1.41,63.13-1.58,63.13-1.58-32.6-1.23-54.79-.18-90.16,2.11Z"/>
            <path className="abc-105" d="M1264.07,884.81s-90.86-3-132.93-1.64c-42.08,1.37,14.02,1.64,73.17,2.32,59.15.68,91.47,0,59.76-.68Z"/>
            <path className="abc-103" d="M1547.29,882.37c-37.75-.4-33.36-.92-11.13-1.85,22.24-.93,46.39.91,46.39.91,12.53.76,2.49,1.34-35.27.94Z"/>
          </g>
          <g className="abc-101">
            <path className="abc-446" d="M1449.93,887.53c-42.02-2.07-66.12-1.72-106.6-.07-.61.02-1.16.05-1.76.07h108.35Z"/>
          </g>
          <path className="abc-3" d="M1722.18,887.83h-611c-.17,0-.3-.13-.3-.3v-16.44c0-.14.03-.28.05-.42l.02-.1c.02-.14.14-.25.29-.25h610.86c.13,0,.25.09.29.22.05.19.08.36.08.54v16.44c0,.17-.13.3-.29.3ZM1111.48,887.23h610.41v-16.15c0-.05,0-.11-.01-.17h-610.38c-.01.05-.01.11-.01.17v16.15Z"/>
        </g>
        <g className="abc-106">
          <rect className="abc-3" x="1670.28" y="645.08" width="51.34" height="40.69"/>
          <path className="abc-3" d="M1168.44,645.08h-57.19s-5.8-5.06-5.8-4.68v45.37h62.99v-40.69Z"/>
          <path className="abc-3" d="M1168.44,778.77h-57.19s-5.8-2.15-5.8-1.77v42.47h62.99v-40.7Z"/>
          <rect className="abc-3" x="1670.28" y="778.77" width="51.34" height="40.7"/>
          <path className="abc-3" d="M1168.44,865.96h-57.19s-5.8.12-5.8.27v17.16h62.99v-17.44Z"/>
          <path className="abc-3" d="M1670.28,865.96v17.44h51.34v-17.16c0-.11.11-.19.16-.27h-51.5Z"/>
        </g>
        <g>
          <g>
            <path className="abc-454" d="M1765.22,620.82c-.63-.01-1.25-.04-1.88-.04h-67.04v276.87h67.04c.63,0,1.25-.01,1.88-.03v-276.8Z"/>
            <path className="abc-192" d="M1763.34,897.95h-67.04c-.16,0-.29-.13-.29-.3v-276.87c0-.16.13-.3.29-.3h67.04c.48,0,.95.01,1.42.03h.47c.16.01.29.15.29.31v276.8c0,.16-.13.29-.29.3-.64.02-1.26.03-1.89.03ZM1696.6,897.36h66.74c.53,0,1.06-.01,1.58-.03v-276.22h-.18c-.46-.01-.93-.03-1.4-.03h-66.74v276.28Z"/>
          </g>
          <path className="abc-340" d="M1765.22,621c-.63-.02-1.25-.03-1.88-.03h-6.02s6.48,0,6.48,1.53v273.92s-.76,1.24-4.19,1.24h3.73c.63,0,1.25-.02,1.88-.03v-276.62Z"/>
          <g className="abc-135">
            <path className="abc-102" d="M1737.26,843.97c17.33-38.13-7.88-30.95-11.04-89.52-2.54-47.06,10.18-110.53,15.29-133.66h-9.57c-3.16,17.06-9.15,49.21-13.58,71.76-6.33,32.05-.44,66.26-10.25,92.84-11.03,29.85-7.89,46.98-3.15,72.95,0,0,5.11,18.37,2.27,39.32h13.04c-6.66-19.2,4.3-25.83,16.96-53.68ZM1712.5,815.76c2.09-32.05,7.07-28.35,16.66-9.52,9.6,18.82-6.38,39.39-6.38,39.39-6.48,10.67-12.34,2.16-10.27-29.88Z"/>
            <path className="abc-104" d="M1753.68,828.71s-4.47,16.37-17.38,39.02c-7.01,12.3-9.26,21.58-3.4,29.92h9.16c-10.05-16.2,10.26-46.86,11.62-68.95Z"/>
            <path className="abc-104" d="M1746.27,668.06c-1.41-33.63-13.52,35.85-9.39,83.58,0,0,10.78-49.95,9.39-83.58Z"/>
            <path className="abc-104" d="M1744.9,782.95c-9.35-16.03-5.02-31.74-7.9-22.95-2.87,8.8,2.88,22.95,10.05,35.2,5.75,9.83,6.46,28.61,6.46,28.61,5.03-14.77.71-24.83-8.61-40.86Z"/>
            <path className="abc-105" d="M1707.38,690.07s12.2-41.17,6.67-60.24c-5.56-19.06-6.67,6.35-9.44,33.16-2.78,26.8,0,41.45,2.77,27.08Z"/>
            <path className="abc-103" d="M1717.29,818.41c1.63-17.11,3.75-15.13,7.54-5.05,3.78,10.08-3.71,21.02-3.71,21.02-3.09,5.67-5.47,1.13-3.82-15.97Z"/>
          </g>
          <g className="abc-101">
            <path className="abc-446" d="M1696.3,774.29c8.42-19.04,7.01-29.96.28-48.31-.09-.26-.18-.53-.28-.79v49.1Z"/>
          </g>
          <path className="abc-3" d="M1763.34,897.95h-67.04c-.16,0-.29-.13-.29-.3v-276.87c0-.16.13-.3.29-.3h67.04c.48,0,.95.01,1.42.03h.47c.16.01.29.15.29.31v276.8c0,.16-.13.29-.29.3-.64.02-1.26.03-1.89.03ZM1696.6,897.36h66.74c.53,0,1.06-.01,1.58-.03v-276.22h-.18c-.46-.01-.93-.03-1.4-.03h-66.74v276.28Z"/>
        </g>
        <g>
          <g>
            <path className="abc-305" d="M1149.78,620.82c-.62-.01-1.25-.04-1.88-.04h-67.03v276.87h67.03c.63,0,1.26-.01,1.88-.03v-276.8Z"/>
            <path className="abc-192" d="M1147.9,897.95h-67.03c-.17,0-.29-.13-.29-.3v-276.87c0-.16.13-.3.29-.3h67.03c.48,0,.95.01,1.43.03h.46c.16.01.29.15.29.31v276.8c0,.16-.13.29-.29.3-.63.01-1.26.03-1.89.03ZM1081.17,897.36h66.73c.53,0,1.06-.01,1.58-.03v-276.22h-.17c-.47-.01-.94-.03-1.42-.03h-66.73v276.28Z"/>
          </g>
          <path className="abc-359" d="M1149.78,621c-.62-.02-1.25-.03-1.88-.03h-6.01s6.48,0,6.48,1.53v273.92s-.76,1.24-4.19,1.24h3.73c.63,0,1.26-.02,1.88-.03v-276.62Z"/>
          <g className="abc-135">
            <path className="abc-102" d="M1121.82,843.97c17.33-38.13-7.88-30.95-11.04-89.52-2.54-47.06,10.18-110.53,15.29-133.66h-9.57c-3.15,17.06-9.15,49.21-13.57,71.76-6.33,32.05-.44,66.26-10.25,92.84-11.03,29.85-7.89,46.98-3.15,72.95,0,0,5.12,18.37,2.29,39.32h13.03c-6.68-19.2,4.3-25.83,16.96-53.68ZM1097.05,815.76c2.09-32.05,7.07-28.35,16.66-9.52,9.6,18.82-6.39,39.39-6.39,39.39-6.47,10.67-12.34,2.16-10.27-29.88Z"/>
            <path className="abc-104" d="M1138.25,828.71s-4.49,16.37-17.4,39.02c-7,12.3-9.25,21.58-3.39,29.92h9.16c-10.05-16.2,10.26-46.86,11.63-68.95Z"/>
            <path className="abc-104" d="M1130.83,668.06c-1.42-33.63-13.52,35.85-9.38,83.58,0,0,10.78-49.95,9.38-83.58Z"/>
            <path className="abc-104" d="M1129.47,782.95c-9.35-16.03-5.02-31.74-7.91-22.95-2.85,8.8,2.89,22.95,10.06,35.2,5.75,9.83,6.46,28.61,6.46,28.61,5.03-14.77.71-24.83-8.61-40.86Z"/>
            <path className="abc-105" d="M1091.94,690.07s12.2-41.17,6.67-60.24c-5.57-19.06-6.67,6.35-9.45,33.16-2.78,26.8,0,41.45,2.78,27.08Z"/>
            <path className="abc-103" d="M1101.85,818.41c1.63-17.11,3.75-15.13,7.53-5.05,3.79,10.08-3.71,21.02-3.71,21.02-3.08,5.67-5.47,1.13-3.82-15.97Z"/>
          </g>
          <g className="abc-101">
            <path className="abc-446" d="M1080.87,774.29c8.42-19.04,7.01-29.96.28-48.31-.1-.26-.19-.53-.28-.79v49.1Z"/>
          </g>
          <path className="abc-3" d="M1147.9,897.95h-67.03c-.17,0-.29-.13-.29-.3v-276.87c0-.16.13-.3.29-.3h67.03c.48,0,.95.01,1.43.03h.46c.16.01.29.15.29.31v276.8c0,.16-.13.29-.29.3-.63.01-1.26.03-1.89.03ZM1081.17,897.36h66.73c.53,0,1.06-.01,1.58-.03v-276.22h-.17c-.47-.01-.94-.03-1.42-.03h-66.73v276.28Z"/>
        </g>
      </g>
    </g>
  </g>
  {aceticTouchEnabled && !aceticFocusMode && (
    <rect
      x="450" y="398" width="110" height="480"
      fill="#000" fillOpacity="0"
      style={{ pointerEvents: 'all', cursor: 'pointer' }}
      onClick={handleAceticTubeClick}
      onTouchEnd={(e) => { e.preventDefault(); handleAceticTubeClick() }}
    />
  )}
</svg>

    </div>
  )
}

export default SVG
