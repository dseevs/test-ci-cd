import React, { useEffect, useRef } from 'react'
import { useStore, EXPERIMENT_TYPES } from '@/store/useStore'
import "./SvgNaHco3.css"
// import "./example.css"

const SvgNaHco3 = () => {
  const svgRef = useRef(null)
  const timelineRef = useRef(null)
  const draggableRef = useRef(null)

  useEffect(() => {
    let isCancelled = false

    const initGsap = async () => {
      if (typeof window === "undefined") return
      const svg = svgRef.current
      if (!svg) return

      try {
        const [gsapModule, draggableModule] = await Promise.all([
          import("gsap"),
          import("gsap/Draggable"),
        ])
        const gsap = gsapModule.gsap || gsapModule.default || gsapModule
        const Draggable = draggableModule.Draggable || draggableModule.default
        if (isCancelled) return

        gsap.registerPlugin(Draggable)

        const select = (selector) => svg.querySelector(selector)

        const flaskAssembly = select("#flask-assembly")
        const flask = select("#flask")
        const tubeMouth = select("#nahco3-mouth")
        const dropZone = select("#drop-zone")
        const nahco3Solution = select("#nahco3-solution")
        const nahco3SolutionGroup = select("#nahco3-solution-group")
        const nahco3FillRect = select("#nahco3-fill-rect")
        const nahco3ClipRect = select("#nahco3-clip-rect")
        const aceticWater = select("#acetic-water")
        const aceticWaterClipRect = select("#acetic-water-clip-rect")
        const pourStream = select("#pour-stream")
        const streamCore = select("#nahco3-stream-core")
        const streamInnerL = select("#nahco3-stream-inner-l")
        const streamInnerR = select("#nahco3-stream-inner-r")
        const streamOuterL = select("#nahco3-stream-outer-l")
        const streamOuterR = select("#nahco3-stream-outer-r")
        const landingGlow = select("#nahco3-landing-glow")
        const microDroplets = select("#nahco3-micro-droplets")
        const splashParticles = select("#nahco3-splash-particles")
        const limeWaterFill = select("#lime-water-fill")
        const bubbles = svg.querySelectorAll(".bubble")
        if (
          !flaskAssembly ||
          !flask ||
          !tubeMouth ||
          !dropZone ||
          !nahco3Solution ||
          !nahco3SolutionGroup ||
          !nahco3FillRect ||
          !nahco3ClipRect ||
          !aceticWater ||
          !aceticWaterClipRect ||
          !pourStream ||
          !limeWaterFill
        ) {
          return
        }

        gsap.set(flaskAssembly, { x: 0, y: 0, rotation: 0 })

        // Only the flask graphic starts the drag; stand and water do not
        const standGroup = flaskAssembly.querySelector(".cls-101")
        if (standGroup) gsap.set(standGroup, { pointerEvents: "none" })
        if (aceticWater) gsap.set(aceticWater, { pointerEvents: "none" })

        // NaHCO3 clip initialised below; acetic water clip uses userSpaceOnUse
        gsap.set(nahco3ClipRect, {
          attr: { x: 0, y: 0, width: 1, height: 1 },
        })
        // Acetic water clip: large rect covering entire liquid in user space
        gsap.set(aceticWaterClipRect, {
          attr: { x: 1380, y: 880, width: 260, height: 160 },
        })

        // NaHCO3 fill mask: rect in user space; initial = existing liquid level (bottom fixed)
        const nahcoBbox = nahco3Solution.getBBox()
        const initialFillRatio = 0.4
        const initialFillHeight = nahcoBbox.height * initialFillRatio
        const initialFillY = nahcoBbox.y + nahcoBbox.height - initialFillHeight
        const finalFillRatio = 0.7
        gsap.set(nahco3FillRect, {
          attr: {
            x: nahcoBbox.x,
            y: initialFillY,
            width: nahcoBbox.width,
            height: initialFillHeight,
          },
        })

        const NAHCO3_STREAM_END_X = 428.12
        const NAHCO3_STREAM_END_Y = 657.17
        const NAHCO3_STREAM_BASE_WIDTH = 8

        const buildNahcoOffsetPath = (offsetPx, wobbleAmp = 0) => {
          const startX = 428.12, startY = 100
          const endX = NAHCO3_STREAM_END_X, endY = NAHCO3_STREAM_END_Y
          const cx = startX + 3, cy = (startY + endY) / 2
          const STEPS = 24
          const points = []
          for (let i = 0; i <= STEPS; i++) {
            const t = i / STEPS
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
        }

        const getStreamPoint = (t) => {
          const startX = 428.12, startY = 100
          const endX = NAHCO3_STREAM_END_X, endY = NAHCO3_STREAM_END_Y
          const cx = startX + 3, cy = (startY + endY) / 2
          const x = (1 - t) ** 2 * startX + 2 * (1 - t) * t * cx + t * t * endX
          const y = (1 - t) ** 2 * startY + 2 * (1 - t) * t * cy + t * t * endY
          return { x, y }
        }

        const setNahcoStreamPaths = () => {
          const W = NAHCO3_STREAM_BASE_WIDTH
          if (streamCore) {
            streamCore.setAttribute('d', buildNahcoOffsetPath(0, 0))
            streamCore.setAttribute('stroke-width', String(W))
          }
          const iOff = 3.5
          if (streamInnerL) {
            streamInnerL.setAttribute('d', buildNahcoOffsetPath(-iOff, 0))
            streamInnerL.setAttribute('stroke-width', String(W * 0.50))
          }
          if (streamInnerR) {
            streamInnerR.setAttribute('d', buildNahcoOffsetPath(iOff, 0))
            streamInnerR.setAttribute('stroke-width', String(W * 0.50))
          }
          const oOff = 6
          if (streamOuterL) {
            streamOuterL.setAttribute('d', buildNahcoOffsetPath(-oOff, 0.8))
            streamOuterL.setAttribute('stroke-width', String(W * 0.22))
          }
          if (streamOuterR) {
            streamOuterR.setAttribute('d', buildNahcoOffsetPath(oOff, 0.8))
            streamOuterR.setAttribute('stroke-width', String(W * 0.22))
          }
          if (landingGlow) {
            landingGlow.setAttribute('cx', String(NAHCO3_STREAM_END_X))
            landingGlow.setAttribute('cy', String(NAHCO3_STREAM_END_Y))
          }
          if (microDroplets) {
            const circles = microDroplets.querySelectorAll('circle')
            circles.forEach((c, i) => {
              const t = 0.2 + Math.random() * 0.6
              const pt = getStreamPoint(t)
              const spread = (Math.random() - 0.5) * 4
              c.setAttribute('cx', String(pt.x + spread))
              c.setAttribute('cy', String(pt.y + spread))
            })
          }
        }

        setNahcoStreamPaths()

        const streamLayers = [streamCore, streamInnerL, streamInnerR, streamOuterL, streamOuterR]
        gsap.set(pourStream, { opacity: 0 })
        streamLayers.forEach(el => {
          if (el) gsap.set(el, { opacity: 0, strokeDasharray: 'none', strokeDashoffset: 0 })
        })
        if (landingGlow) gsap.set(landingGlow, { opacity: 0 })
        if (microDroplets) microDroplets.querySelectorAll('circle').forEach(c => gsap.set(c, { opacity: 0 }))
        if (splashParticles) splashParticles.querySelectorAll('circle').forEach(c => gsap.set(c, { opacity: 0 }))
        gsap.set(bubbles, { opacity: 0, scale: 0 })

        const tl = gsap.timeline({
          paused: true,
          defaults: { ease: "power2.inOut" },
        })
        timelineRef.current = tl

        const pourTl = gsap.timeline()
        const layerConfigs = [
          { el: streamCore, targetOpacity: 0.70, delay: 0 },
          { el: streamInnerL, targetOpacity: 0.40, delay: 0.02 },
          { el: streamInnerR, targetOpacity: 0.40, delay: 0.02 },
          { el: streamOuterL, targetOpacity: 0.15, delay: 0.04 },
          { el: streamOuterR, targetOpacity: 0.15, delay: 0.04 },
        ]
        const fallDur = 0.6

        pourTl.set(pourStream, { opacity: 1 })
        layerConfigs.forEach(({ el }) => {
          if (!el) return
          const len = el.getTotalLength()
          pourTl.set(el, { strokeDasharray: len, strokeDashoffset: len, opacity: 0 }, 0)
        })

        layerConfigs.forEach(({ el, targetOpacity, delay }) => {
          if (!el) return
          pourTl.to(el, { opacity: targetOpacity, duration: 0.1, ease: 'power2.out' }, delay)
          pourTl.to(el, { strokeDashoffset: 0, duration: fallDur, ease: 'power2.in' }, delay)
        })

        if (microDroplets) {
          const drops = microDroplets.querySelectorAll('circle')
          drops.forEach((c, i) => {
            const d = fallDur * 0.35 + i * 0.12
            pourTl.to(c, { opacity: 0.65, duration: 0.15, ease: 'power2.out' }, d)
            pourTl.to(c, { opacity: 0, duration: 0.3, ease: 'power2.in' }, d + 0.3)
          })
        }

        const splashTime = fallDur - 0.05

        if (landingGlow) {
          pourTl.to(landingGlow, { opacity: 0.9, duration: 0.15, ease: 'power2.out' }, splashTime)
          pourTl.to(landingGlow, { opacity: 0, duration: 0.5, ease: 'power2.in' }, splashTime + 0.3)
        }

        if (splashParticles) {
          splashParticles.querySelectorAll('circle').forEach((c) => {
            const angle = parseFloat(c.dataset.angle)
            const dist = parseFloat(c.dataset.dist)
            const targetX = NAHCO3_STREAM_END_X + Math.cos(angle) * dist
            const targetY = NAHCO3_STREAM_END_Y + Math.sin(angle) * dist * 0.45
            pourTl.set(c, { attr: { cx: NAHCO3_STREAM_END_X, cy: NAHCO3_STREAM_END_Y }, opacity: 0 }, 0)
            pourTl.to(c, { opacity: 0.75, duration: 0.08, ease: 'power2.out' }, splashTime)
            pourTl.to(c, { attr: { cx: targetX, cy: targetY }, duration: 0.4, ease: 'power2.out' }, splashTime)
            pourTl.to(c, { opacity: 0, duration: 0.3, ease: 'power2.in' }, splashTime + 0.25)
          })
        }

        tl.to(
          flaskAssembly,
          {
            rotation: -80,
            transformOrigin: "52% 8%",
            duration: 1,
            ease: "power2.inOut",
          }
        )
          .add(pourTl, "<0.1")
          .to(pourStream, { opacity: 0, duration: 0.25 }, "+=1")
          .to(
            aceticWaterClipRect,
            {
              // Drain acetic water: clip rect shrinks upward in world space
              // so liquid appears to pour out as flask tilts
              attr: {
                y: 1040,
                height: 0,
              },
              duration: 0.8,
              ease: "power2.inOut",
            },
            "<"
          )
          .to(
            nahco3FillRect,
            {
              // Level-rise: clip rect top moves up, bottom stays fixed
              attr: {
                y: nahcoBbox.y + nahcoBbox.height * (1 - finalFillRatio),
                height: nahcoBbox.height * finalFillRatio,
              },
              duration: 1.5,
              ease: "power2.out",
            },
            "<"
          )
          .to(flaskAssembly, {
            x: 0,
            y: 0,
            rotation: 0,
            transformOrigin: "52% 8%",
            duration: 0.65,
            ease: "power2.inOut",
          })
          .set(flaskAssembly, { clearProps: "transform" })
          .set(flaskAssembly, { x: 0, y: 0, rotation: 0 })
          .to({}, { duration: 1 })
          .to(bubbles, {
            scale: 1.3,
            opacity: 1,
            duration: 0.6,
            stagger: 0.1,
            ease: "power1.out",
          })
          .to(
            limeWaterFill,
            {
              attr: { fill: "#d4cfc8", opacity: 0.85 },
              duration: 1.4,
              ease: "power2.inOut",
            },
            "-=0.3"
          )
          .call(() => {
            useStore.getState().unlockActivityObservation(EXPERIMENT_TYPES.BICARBONATE_REACTION)
          })

        const getTopCenterSvg = (el) => {
          if (!el || !svg.createSVGPoint) return { x: 0, y: 0 }
          const bbox = el.getBBox()
          const pt = svg.createSVGPoint()
          pt.x = bbox.x + bbox.width / 2
          pt.y = bbox.y
          const ctm = el.getCTM()
          if (!ctm) return { x: pt.x, y: pt.y }
          const global = pt.matrixTransform(ctm)
          return { x: global.x, y: global.y }
        }

        const getGlobalBBox = (el) => {
          if (!el || !svg.createSVGPoint) return { x: 0, y: 0, width: 0, height: 0 }
          const b = el.getBBox()
          const ctm = el.getCTM()
          if (!ctm) return b
          const pts = [
            { x: b.x, y: b.y },
            { x: b.x + b.width, y: b.y },
            { x: b.x + b.width, y: b.y + b.height },
            { x: b.x, y: b.y + b.height },
          ]
          const global = pts.map((p) => {
            const pt = svg.createSVGPoint()
            pt.x = p.x
            pt.y = p.y
            return pt.matrixTransform(ctm)
          })
          const minX = Math.min(...global.map((p) => p.x))
          const maxX = Math.max(...global.map((p) => p.x))
          const minY = Math.min(...global.map((p) => p.y))
          const maxY = Math.max(...global.map((p) => p.y))
          return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
        }

        // Pre-compute the exact SVG-space translation that, combined with
        // the -80° tilt, places the flask mouth at the liquid-flow start.
        //
        // Flask mouth in local space: (1551, 781)
        // Pivot at "52% 8%" of assembly bbox
        // Liquid-flow start: (428.12, 100)
        const assemblyBBox = flaskAssembly.getBBox()
        const pivotX = assemblyBBox.x + 0.52 * assemblyBBox.width
        const pivotY = assemblyBBox.y + 0.08 * assemblyBBox.height
        const mouthLocalX = 1551
        const mouthLocalY = 781
        const flowStartX = 428.12
        const flowStartY = 100
        const tiltAngle = -80 * Math.PI / 180
        const cosA = Math.cos(tiltAngle)
        const sinA = Math.sin(tiltAngle)

        // After rotation around pivot, the mouth lands at:
        // rotatedMouth = pivot + R * (mouth - pivot)
        const relX = mouthLocalX - pivotX
        const relY = mouthLocalY - pivotY
        const rotatedMouthX = pivotX + relX * cosA - relY * sinA
        const rotatedMouthY = pivotY + relX * sinA + relY * cosA

        // Translation needed so rotatedMouth == flowStart
        const snapDx = flowStartX - rotatedMouthX
        const snapDy = flowStartY - rotatedMouthY

        const checkDrop = () => {
          if (!timelineRef.current) return

          const spoutCenter = getTopCenterSvg(flask)
          const zone = getGlobalBBox(dropZone)
          const inZone =
            spoutCenter.x >= zone.x &&
            spoutCenter.x <= zone.x + zone.width &&
            spoutCenter.y >= zone.y &&
            spoutCenter.y <= zone.y + zone.height

          if (
            inZone &&
            !timelineRef.current.isActive() &&
            timelineRef.current.progress() === 0
          ) {
            gsap.to(flaskAssembly, {
              x: snapDx,
              y: snapDy,
              duration: 0.35,
              ease: "power2.out",
              onComplete: () => {
                draggableRef.current?.disable()
                timelineRef.current.play(0)
              },
            })
          }
        }

        const [draggable] = Draggable.create(flaskAssembly, {
          type: "x,y",
          onDragEnd: checkDrop,
          bounds: svg,
        })
        draggableRef.current = draggable
      } catch {
        // GSAP not available or failed to load; skip animations.
      }
    }

    initGsap()

    return () => {
      isCancelled = true
      if (timelineRef.current) {
        timelineRef.current.kill()
        timelineRef.current = null
      }
      if (draggableRef.current) {
        draggableRef.current.kill()
        draggableRef.current = null
      }
    }
  }, [])

  return (
    <div className="lab-svg-viewport w-full h-full min-h-0 min-w-0 relative">
      <svg
        ref={svgRef}
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="xMidYMax meet"
        className="lab-svg-viewport__svg"
      >
  <defs>
 
    <linearGradient id="linear-gradient" x1="957.67" y1="20.12" x2="960.32" y2="835.11" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#6f5c34"/>
      <stop offset="1" stop-color="#9e8f48"/>
    </linearGradient>
    <linearGradient id="linear-gradient-2" x1="1028.92" y1="933.84" x2="1039.89" y2="1013.81" gradientTransform="translate(2081.35) rotate(-180) scale(1 -1)" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#4d4d4d"/>
      <stop offset=".23" stop-color="#595959"/>
      <stop offset=".53" stop-color="#626262"/>
      <stop offset="1" stop-color="#656565"/>
    </linearGradient>
    <linearGradient id="linear-gradient-3" x1="1042.46" y1="962.96" x2="1041.77" y2="1087.43" gradientTransform="translate(2081.35) rotate(-180) scale(1 -1)" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#3d3d3d"/>
      <stop offset=".21" stop-color="#4f4f4f"/>
      <stop offset=".46" stop-color="#5f5f5f"/>
      <stop offset=".66" stop-color="#656565"/>
    </linearGradient>
    <linearGradient id="linear-gradient-4" x1="1043.12" y1="967.06" x2="1042.53" y2="1073.64" xlinkHref="#linear-gradient-3"/>
    <linearGradient id="linear-gradient-5" x1="1040.67" y1="1043.83" x2="1040.67" y2="1016.83" gradientTransform="translate(2081.35) rotate(-180) scale(1 -1)" gradientUnits="userSpaceOnUse">
      <stop offset=".01" stop-color="#282828"/>
      <stop offset=".13" stop-color="#424242"/>
      <stop offset=".35" stop-color="#424242"/>
      <stop offset=".35" stop-color="#404040"/>
      <stop offset=".38" stop-color="#323232"/>
      <stop offset=".41" stop-color="#2a2a2a"/>
      <stop offset=".47" stop-color="#282828"/>
      <stop offset=".54" stop-color="#292929"/>
      <stop offset=".56" stop-color="#303030"/>
      <stop offset=".58" stop-color="#3c3c3c"/>
      <stop offset=".58" stop-color="#424242"/>
      <stop offset=".7" stop-color="#424242"/>
      <stop offset="1" stop-color="#282828"/>
    </linearGradient>
    <radialGradient id="radial-gradient" cx="760.73" cy="1034.61" fx="760.73" fy="1034.61" r="34.44" gradientTransform="translate(2079.21 4.2) rotate(-180) scale(1 -.99)" gradientUnits="userSpaceOnUse">
      <stop offset=".58" stop-color="#707070"/>
      <stop offset=".76" stop-color="#393939"/>
      <stop offset=".91" stop-color="#252525"/>
    </radialGradient>
    <radialGradient id="radial-gradient-2" cx="1325.01" cy="1034.26" fx="1325.01" fy="1034.26" r="30.54" xlinkHref="#radial-gradient"/>
    <linearGradient id="linear-gradient-6" x1="751.81" y1="1030.15" x2="848.62" y2="1030.15" gradientTransform="translate(2081.35) rotate(-180) scale(1 -1)" gradientUnits="userSpaceOnUse">
      <stop offset=".13" stop-color="#707070"/>
      <stop offset=".21" stop-color="#424242"/>
      <stop offset=".23" stop-color="#363636"/>
      <stop offset=".26" stop-color="#292929"/>
      <stop offset=".29" stop-color="#252525"/>
      <stop offset=".68" stop-color="#252525"/>
      <stop offset=".76" stop-color="#393939"/>
      <stop offset=".95" stop-color="#707070"/>
    </linearGradient>
    <linearGradient id="linear-gradient-7" x1="757.91" x2="802.64" xlinkHref="#linear-gradient-6"/>
    <linearGradient id="linear-gradient-8" x1="1323.37" y1="1030.15" x2="1241.67" y2="1030.15" xlinkHref="#linear-gradient-6"/>
    <linearGradient id="linear-gradient-9" x1="1318.59" y1="1030.15" x2="1260.12" y2="1030.15" xlinkHref="#linear-gradient-6"/>
    <filter id="luminosity-noclip" x="797.84" y="1037.24" width="458.58" height="4.04" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse">
      <feFlood flood-color="#fff" result="bg"/>
      <feBlend in="SourceGraphic" in2="bg"/>
    </filter>
    <filter id="luminosity-noclip-2" x="797.84" y="-8732" width="433.9" height="32766" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse">
      <feFlood flood-color="#fff" result="bg"/>
      <feBlend in="SourceGraphic" in2="bg"/>
    </filter>
    <mask id="mask-1" x="797.84" y="-8732" width="433.9" height="32766" maskUnits="userSpaceOnUse"/>
    <linearGradient id="linear-gradient-10" x1="856.95" y1="1039.26" x2="1251.17" y2="1039.26" gradientTransform="translate(2081.35) rotate(-180) scale(1 -1)" gradientUnits="userSpaceOnUse">
      <stop offset=".08" stop-color="#000"/>
      <stop offset=".26" stop-color="#fff"/>
      <stop offset=".47" stop-color="#fff"/>
      <stop offset=".69" stop-color="#fff"/>
      <stop offset=".9" stop-color="#000"/>
    </linearGradient>
    <mask id="mask" x="797.84" y="1037.24" width="458.58" height="4.04" maskUnits="userSpaceOnUse">
      <g className="cls-623">
        <g className="cls-165">
          <path className="cls-63" d="M797.84,1039.27c0,1.12.95,2.02,2.12,2.02h429.65c1.18,0,2.13-.9,2.13-2.02h0c0-1.12-.95-2.03-2.13-2.03h-429.65c-1.17,0-2.12.91-2.12,2.03h0Z"/>
        </g>
      </g>
    </mask>
    <linearGradient id="linear-gradient-11" x1="832.3" y1="1039.26" x2="1227.49" y2="1039.26" gradientTransform="translate(2081.35) rotate(-180) scale(1 -1)" gradientUnits="userSpaceOnUse">
      <stop offset=".08" stop-color="#252525"/>
      <stop offset=".26" stop-color="#424242"/>
      <stop offset=".28" stop-color="#494949"/>
      <stop offset=".34" stop-color="#5e5e5e"/>
      <stop offset=".41" stop-color="#6b6b6b"/>
      <stop offset=".47" stop-color="#707070"/>
      <stop offset=".69" stop-color="#393939"/>
      <stop offset=".9" stop-color="#252525"/>
    </linearGradient>
    <filter id="luminosity-noclip-3" x="714.73" y="1023.51" width="621.28" height="15.57" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse">
      <feFlood flood-color="#fff" result="bg"/>
      <feBlend in="SourceGraphic" in2="bg"/>
    </filter>
    <filter id="luminosity-noclip-4" x="714.73" y="-8732" width="596.61" height="32766" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse">
      <feFlood flood-color="#fff" result="bg"/>
      <feBlend in="SourceGraphic" in2="bg"/>
    </filter>
    <mask id="mask-3" x="714.73" y="-8732" width="596.61" height="32766" maskUnits="userSpaceOnUse"/>
    <linearGradient id="linear-gradient-12" x1="780.12" y1="1031.29" x2="1322.15" y2="1031.29" xlinkHref="#linear-gradient-10"/>
    <mask id="mask-2" x="714.73" y="1023.51" width="621.28" height="15.57" maskUnits="userSpaceOnUse">
      <g className="cls-322">
        <g className="cls-620">
          <path className="cls-51" d="M714.73,1031.29c0,4.31,1.3,7.79,2.9,7.79h590.78c1.62,0,2.93-3.48,2.93-7.79h0c0-4.31-1.31-7.78-2.93-7.78h-590.78c-1.61,0-2.9,3.47-2.9,7.78h0Z"/>
        </g>
      </g>
    </mask>
    <linearGradient id="linear-gradient-13" x1="755.47" y1="1031.29" x2="1298.49" y2="1031.29" xlinkHref="#linear-gradient-11"/>
    <filter id="luminosity-noclip-5" x="714.73" y="1023.49" width="621.28" height="2.37" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse">
      <feFlood flood-color="#fff" result="bg"/>
      <feBlend in="SourceGraphic" in2="bg"/>
    </filter>
    <filter id="luminosity-noclip-6" x="714.73" y="-8732" width="596.61" height="32766" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse">
      <feFlood flood-color="#fff" result="bg"/>
      <feBlend in="SourceGraphic" in2="bg"/>
    </filter>
    <mask id="mask-5" x="714.73" y="-8732" width="596.61" height="32766" maskUnits="userSpaceOnUse"/>
    <linearGradient id="linear-gradient-14" x1="780.12" y1="1024.67" x2="1322.15" y2="1024.67" xlinkHref="#linear-gradient-10"/>
    <mask id="mask-4" x="714.73" y="1023.49" width="621.28" height="2.37" maskUnits="userSpaceOnUse">
      <g className="cls-230">
        <g className="cls-130">
          <path className="cls-86" d="M714.73,1024.66c0,.66,1.3,1.2,2.9,1.2h590.78c1.62,0,2.93-.54,2.93-1.2h0c0-.65-1.31-1.17-2.93-1.17h-590.78c-1.61,0-2.9.52-2.9,1.17h0Z"/>
        </g>
      </g>
    </mask>
    <linearGradient id="linear-gradient-15" x1="755.47" y1="1024.67" x2="1298.49" y2="1024.67" xlinkHref="#linear-gradient-11"/>
    <linearGradient id="linear-gradient-16" x1="-3612.04" y1="-4002.7" x2="-3612.04" y2="-3966.54" gradientTransform="translate(5140.27 -3109.6) rotate(-90)" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#919191"/>
      <stop offset=".22" stop-color="#fff"/>
      <stop offset=".44" stop-color="#919191"/>
      <stop offset=".62" stop-color="#525252"/>
      <stop offset=".87" stop-color="#000"/>
    </linearGradient>
    <linearGradient id="linear-gradient-17" x1="-3625.13" y1="-3989.09" x2="-3615.35" y2="-3989.09" gradientTransform="translate(5140.27 -3109.6) rotate(-90)" gradientUnits="userSpaceOnUse">
      <stop offset=".13" stop-color="#000"/>
      <stop offset=".49" stop-color="#525252"/>
      <stop offset=".75" stop-color="#919191"/>
      <stop offset="1" stop-color="#919191"/>
    </linearGradient>
    <linearGradient id="linear-gradient-18" x1="-3625.5" y1="-3988.88" x2="-3615.66" y2="-3988.88" xlinkHref="#linear-gradient-17"/>
    <linearGradient id="linear-gradient-19" x1="-3626.75" y1="-4004.41" x2="-3626.75" y2="-3968.25" gradientTransform="translate(5140.27 -3109.6) rotate(-90)" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#919191"/>
      <stop offset=".27" stop-color="#fff"/>
      <stop offset=".46" stop-color="#919191"/>
      <stop offset=".63" stop-color="#525252"/>
      <stop offset=".87" stop-color="#000"/>
    </linearGradient>
    <linearGradient id="linear-gradient-20" x1="-3641.66" x2="-3628.01" xlinkHref="#linear-gradient-17"/>
    <linearGradient id="linear-gradient-21" x1="-3640.45" y1="-3988.52" x2="-3628.99" y2="-3988.52" xlinkHref="#linear-gradient-17"/>
    <linearGradient id="linear-gradient-22" x1="-3642.32" y1="-4004.43" x2="-3642.32" y2="-3968.26" gradientTransform="translate(5140.27 -3109.6) rotate(-90)" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#919191"/>
      <stop offset=".24" stop-color="#fff"/>
      <stop offset=".49" stop-color="#919191"/>
      <stop offset=".65" stop-color="#525252"/>
      <stop offset=".87" stop-color="#000"/>
    </linearGradient>
    <linearGradient id="linear-gradient-23" x1="-3857.4" y1="-4006.36" x2="-3857.4" y2="-3965.74" gradientTransform="translate(5140.27 -3109.6) rotate(-90)" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#919191"/>
      <stop offset=".25" stop-color="#fff"/>
      <stop offset=".46" stop-color="#919191"/>
      <stop offset=".63" stop-color="#525252"/>
      <stop offset=".87" stop-color="#000"/>
    </linearGradient>
    <linearGradient id="linear-gradient-24" x1="-4085.55" y1="-4015.85" x2="-4085.55" y2="-3951.22" gradientTransform="translate(5140.27 -3109.6) rotate(-90)" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#919191"/>
      <stop offset=".14" stop-color="#fff"/>
      <stop offset=".36" stop-color="#919191"/>
      <stop offset=".52" stop-color="#525252"/>
      <stop offset=".74" stop-color="#000"/>
    </linearGradient>
    <linearGradient id="linear-gradient-25" x1="920.32" y1="537.3" x2="940.04" y2="537.3" gradientTransform="translate(2081.35) rotate(-180) scale(1 -1)" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#383838"/>
      <stop offset=".14" stop-color="#3f3f3f"/>
      <stop offset=".34" stop-color="#535353"/>
      <stop offset=".58" stop-color="#737373"/>
      <stop offset=".85" stop-color="#a0a0a0"/>
      <stop offset="1" stop-color="#bdbdbd"/>
    </linearGradient>
    <linearGradient id="linear-gradient-26" x1="940.04" y1="534.76" x2="949.91" y2="534.76" xlinkHref="#linear-gradient-25"/>
    <linearGradient id="linear-gradient-27" x1="910.35" y1="534.76" x2="920.32" y2="534.76" xlinkHref="#linear-gradient-25"/>
    <linearGradient id="linear-gradient-28" x1="930.13" y1="524.29" x2="930.13" y2="535.03" gradientTransform="translate(2081.35) rotate(-180) scale(1 -1)" gradientUnits="userSpaceOnUse">
      <stop offset=".38" stop-color="#383838"/>
      <stop offset=".46" stop-color="#3f3f3f"/>
      <stop offset=".59" stop-color="#535353"/>
      <stop offset=".74" stop-color="#737373"/>
      <stop offset=".91" stop-color="#a0a0a0"/>
      <stop offset="1" stop-color="#bdbdbd"/>
    </linearGradient>
    <linearGradient id="linear-gradient-29" x1="914.67" y1="505.29" x2="945.61" y2="505.29" gradientTransform="translate(2081.35) rotate(-180) scale(1 -1)" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#000"/>
      <stop offset=".38" stop-color="#919191"/>
      <stop offset=".67" stop-color="#fff"/>
      <stop offset="1" stop-color="#919191"/>
    </linearGradient>
    <linearGradient id="linear-gradient-30" x1="917.2" y1="504.4" x2="936.29" y2="504.4" gradientTransform="translate(2081.35) rotate(-180) scale(1 -1)" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#bdbdbd"/>
      <stop offset=".09" stop-color="#a0a0a0"/>
      <stop offset=".26" stop-color="#737373"/>
      <stop offset=".41" stop-color="#535353"/>
      <stop offset=".54" stop-color="#3f3f3f"/>
      <stop offset=".62" stop-color="#383838"/>
    </linearGradient>
    <linearGradient id="linear-gradient-31" x1="930.17" y1="474.8" x2="930.17" y2="481.29" xlinkHref="#linear-gradient-28"/>
    <linearGradient id="linear-gradient-32" x1="916.3" y1="349.36" x2="943.97" y2="349.36" xlinkHref="#linear-gradient-29"/>
    <linearGradient id="linear-gradient-33" x1="912.42" y1="216.07" x2="947.85" y2="216.07" gradientTransform="translate(2081.35) rotate(-180) scale(1 -1)" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#000"/>
      <stop offset=".07" stop-color="#080808"/>
      <stop offset=".19" stop-color="#202020"/>
      <stop offset=".33" stop-color="#464646"/>
      <stop offset=".37" stop-color="#545454"/>
      <stop offset=".4" stop-color="#5c5c5c"/>
      <stop offset=".45" stop-color="#727272"/>
      <stop offset=".51" stop-color="#979797"/>
      <stop offset=".57" stop-color="#cacaca"/>
      <stop offset=".63" stop-color="#fff"/>
      <stop offset="1" stop-color="#454545"/>
    </linearGradient>
    <linearGradient id="linear-gradient-34" x1="912.42" y1="198.27" x2="947.85" y2="198.27" gradientTransform="translate(2081.35) rotate(-180) scale(1 -1)" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#000"/>
      <stop offset=".38" stop-color="#919191"/>
      <stop offset=".63" stop-color="#fff"/>
      <stop offset="1" stop-color="#919191"/>
    </linearGradient>
    <linearGradient id="linear-gradient-35" x1="912.42" y1="182.12" x2="947.85" y2="182.12" gradientTransform="translate(2081.35) rotate(-180) scale(1 -1)" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#919191"/>
      <stop offset=".39" stop-color="#919191"/>
      <stop offset="1" stop-color="#000"/>
    </linearGradient>
    <radialGradient id="radial-gradient-3" cx="930.49" cy="166.84" fx="930.49" fy="166.84" r="44.34" gradientTransform="translate(2081.35) rotate(-180) scale(1 -1)" gradientUnits="userSpaceOnUse">
      <stop offset=".03" stop-color="#7d7d7d"/>
      <stop offset=".1" stop-color="#656565"/>
      <stop offset=".21" stop-color="#414141"/>
      <stop offset=".32" stop-color="#242424"/>
      <stop offset=".44" stop-color="#101010"/>
      <stop offset=".55" stop-color="#040404"/>
      <stop offset=".66" stop-color="#000"/>
    </radialGradient>
    <radialGradient id="radial-gradient-4" cx="930.49" cy="169.1" fx="930.49" fy="169.1" r="44.4" xlinkHref="#radial-gradient-3"/>
    <linearGradient id="linear-gradient-36" x1="-3555.99" y1="-6548.44" x2="-3533.97" y2="-6548.44" gradientTransform="translate(-5462.96 -3042.31) rotate(-90) scale(1 -1)" xlinkHref="#linear-gradient-29"/>
    <linearGradient id="linear-gradient-37" x1="-3559.09" y1="-6678.64" x2="-3530.88" y2="-6678.64" gradientTransform="translate(-5462.96 -3042.31) rotate(-90) scale(1 -1)" xlinkHref="#linear-gradient-33"/>
    <linearGradient id="linear-gradient-38" x1="-3559.09" y1="-6692.81" x2="-3530.88" y2="-6692.81" gradientTransform="translate(-5462.96 -3042.31) rotate(-90) scale(1 -1)" xlinkHref="#linear-gradient-34"/>
    <linearGradient id="linear-gradient-39" x1="-3559.09" y1="-6705.66" x2="-3530.88" y2="-6705.66" gradientTransform="translate(-5462.96 -3042.31) rotate(-90) scale(1 -1)" xlinkHref="#linear-gradient-35"/>
    <radialGradient id="radial-gradient-5" cx="-3544.7" cy="-6717.82" fx="-3544.7" fy="-6717.82" r="35.29" gradientTransform="translate(-5462.96 -3042.31) rotate(-90) scale(1 -1)" xlinkHref="#radial-gradient-3"/>
    <radialGradient id="radial-gradient-6" cx="-3544.7" cy="-6716" fx="-3544.7" fy="-6716" r="35.29" gradientTransform="translate(-5462.96 -3042.31) rotate(-90) scale(1 -1)" xlinkHref="#radial-gradient-3"/>
    <linearGradient id="linear-gradient-40" x1="-3555.99" y1="-6548.44" x2="-3533.97" y2="-6548.44" gradientTransform="translate(-5462.96 -3042.31) rotate(-90) scale(1 -1)" xlinkHref="#linear-gradient-29"/>
    <linearGradient id="linear-gradient-41" x1="-3559.09" y1="-6678.64" x2="-3530.88" y2="-6678.64" gradientTransform="translate(-5462.96 -3042.31) rotate(-90) scale(1 -1)" xlinkHref="#linear-gradient-33"/>
    <linearGradient id="linear-gradient-42" x1="-3559.09" y1="-6692.81" x2="-3530.88" y2="-6692.81" gradientTransform="translate(-5462.96 -3042.31) rotate(-90) scale(1 -1)" xlinkHref="#linear-gradient-34"/>
    <linearGradient id="linear-gradient-43" x1="-3559.09" y1="-6705.66" x2="-3530.88" y2="-6705.66" gradientTransform="translate(-5462.96 -3042.31) rotate(-90) scale(1 -1)" xlinkHref="#linear-gradient-35"/>
    <radialGradient id="radial-gradient-7" cx="-3544.7" cy="-6717.82" fx="-3544.7" fy="-6717.82" r="35.29" gradientTransform="translate(-5462.96 -3042.31) rotate(-90) scale(1 -1)" xlinkHref="#radial-gradient-3"/>
    <radialGradient id="radial-gradient-8" cx="-3544.7" cy="-6716" fx="-3544.7" fy="-6716" r="35.29" gradientTransform="translate(-5462.96 -3042.31) rotate(-90) scale(1 -1)" xlinkHref="#radial-gradient-3"/>
    <linearGradient id="linear-gradient-44" x1="-7318.31" y1="502.62" x2="-7331.37" y2="502.62" gradientTransform="translate(-6350.54) rotate(-180) scale(1 -1)" gradientUnits="userSpaceOnUse">
      <stop offset=".16" stop-color="#383838"/>
      <stop offset=".36" stop-color="#737373"/>
      <stop offset=".58" stop-color="#aeaeae"/>
      <stop offset=".77" stop-color="#dadada"/>
      <stop offset=".91" stop-color="#f5f5f5"/>
      <stop offset="1" stop-color="#fff"/>
    </linearGradient>
    <linearGradient id="linear-gradient-45" x1="4899.25" y1="391.22" x2="4971.52" y2="391.22" gradientTransform="translate(-4001.5 110.8)" xlinkHref="#linear-gradient-29"/>
    <linearGradient id="linear-gradient-46" x1="4876.77" y1="391.22" x2="4971.52" y2="391.22" gradientTransform="translate(-4001.5 110.8)" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#000"/>
      <stop offset=".38" stop-color="#919191"/>
      <stop offset=".67" stop-color="#fff"/>
      <stop offset=".71" stop-color="#f6f6f6"/>
      <stop offset=".77" stop-color="#dedede"/>
      <stop offset=".85" stop-color="#b8b8b8"/>
      <stop offset=".94" stop-color="#838383"/>
      <stop offset=".99" stop-color="#626262"/>
    </linearGradient>
    <linearGradient id="linear-gradient-47" x1="2163.21" y1="-6110.17" x2="2099.45" y2="-6034.9" gradientTransform="translate(-1856.96 -5194.05) rotate(132.81)" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#2e2e2e"/>
      <stop offset=".07" stop-color="#545454"/>
      <stop offset=".15" stop-color="#797979"/>
      <stop offset=".22" stop-color="#949494"/>
      <stop offset=".29" stop-color="#a4a4a4"/>
      <stop offset=".34" stop-color="#aaa"/>
      <stop offset=".39" stop-color="#9f9f9f"/>
      <stop offset=".47" stop-color="#828282"/>
      <stop offset=".57" stop-color="#545454"/>
      <stop offset=".64" stop-color="#323232"/>
      <stop offset=".79" stop-color="#191919"/>
      <stop offset=".93" stop-color="#050505"/>
    </linearGradient>
    <linearGradient id="linear-gradient-48" x1="2140.91" y1="-6128.72" x2="2077.66" y2="-6054.05" xlinkHref="#linear-gradient-47"/>
    <linearGradient id="linear-gradient-49" x1="2142.88" y1="-6127.43" x2="2079.01" y2="-6052.04" xlinkHref="#linear-gradient-47"/>
    <linearGradient id="linear-gradient-50" x1="2145.74" y1="-6124.86" x2="2082.27" y2="-6049.93" xlinkHref="#linear-gradient-47"/>
    <linearGradient id="linear-gradient-51" x1="2150.26" y1="-6121.07" x2="2086.73" y2="-6046.06" xlinkHref="#linear-gradient-47"/>
    <linearGradient id="linear-gradient-52" x1="2156.34" y1="-6115.92" x2="2092.9" y2="-6041.03" xlinkHref="#linear-gradient-47"/>
    <linearGradient id="linear-gradient-53" x1="2164.47" y1="-6109.09" x2="2100.74" y2="-6033.86" xlinkHref="#linear-gradient-47"/>
    <linearGradient id="linear-gradient-54" x1="2140.32" y1="-6129.51" x2="2076.62" y2="-6054.31" xlinkHref="#linear-gradient-47"/>
    <linearGradient id="linear-gradient-55" x1="2140.13" y1="-6129.28" x2="2076.84" y2="-6054.56" xlinkHref="#linear-gradient-47"/>
    <linearGradient id="linear-gradient-56" x1="2140.94" y1="-6128.92" x2="2077.28" y2="-6053.77" xlinkHref="#linear-gradient-47"/>
    <linearGradient id="linear-gradient-57" x1="2142.7" y1="-6127.83" x2="2078.7" y2="-6052.27" xlinkHref="#linear-gradient-47"/>
    <linearGradient id="linear-gradient-58" x1="2146.1" y1="-6124.94" x2="2082.13" y2="-6049.42" xlinkHref="#linear-gradient-47"/>
    <linearGradient id="linear-gradient-59" x1="2150.94" y1="-6120.7" x2="2087.09" y2="-6045.32" xlinkHref="#linear-gradient-47"/>
    <linearGradient id="linear-gradient-60" x1="2157.65" y1="-6115.23" x2="2093.67" y2="-6039.69" xlinkHref="#linear-gradient-47"/>
    <linearGradient id="linear-gradient-61" x1="2162.96" y1="-6107.49" x2="2101.15" y2="-6034.53" xlinkHref="#linear-gradient-47"/>
    <linearGradient id="linear-gradient-62" x1="2217.25" y1="-5986.03" x2="2061.03" y2="-6162" gradientTransform="translate(-1856.96 -5194.05) rotate(132.81)" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#2e2e2e"/>
      <stop offset=".28" stop-color="#aaa"/>
      <stop offset=".3" stop-color="#959595"/>
      <stop offset=".34" stop-color="#6a6a6a"/>
      <stop offset=".39" stop-color="#4b4b4b"/>
      <stop offset=".42" stop-color="#383838"/>
      <stop offset=".45" stop-color="#323232"/>
      <stop offset=".71" stop-color="#191919"/>
      <stop offset=".93" stop-color="#050505"/>
    </linearGradient>
    <linearGradient id="linear-gradient-63" x1="675.44" y1="-5986.12" x2="519.24" y2="-6162.08" gradientTransform="translate(-3713.09 -3190.26) rotate(-47.19) scale(1 -1)" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#2e2e2e"/>
      <stop offset=".28" stop-color="#aaa"/>
      <stop offset=".4" stop-color="#727272"/>
      <stop offset=".52" stop-color="#434343"/>
      <stop offset=".58" stop-color="#323232"/>
      <stop offset=".79" stop-color="#191919"/>
      <stop offset=".93" stop-color="#050505"/>
    </linearGradient>
    <linearGradient id="linear-gradient-64" x1="2172.94" y1="-5977.3" x2="2115.08" y2="-6136.01" gradientTransform="translate(-1856.96 -5194.05) rotate(132.81)" xlinkHref="#linear-gradient-63"/>
    <linearGradient id="linear-gradient-65" x1="2163.56" y1="-6001.09" x2="2116.67" y2="-6129.72" gradientTransform="translate(-1856.96 -5194.05) rotate(132.81)" xlinkHref="#linear-gradient-63"/>
    <linearGradient id="linear-gradient-66" x1="2162.28" y1="-5996.09" x2="2113.56" y2="-6129.73" gradientTransform="translate(-1856.96 -5194.05) rotate(132.81)" xlinkHref="#linear-gradient-63"/>
    <linearGradient id="linear-gradient-67" x1="2196.86" y1="-6008.73" x2="2095.48" y2="-6137.94" gradientTransform="translate(-1856.96 -5194.05) rotate(132.81)" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#2e2e2e"/>
      <stop offset=".28" stop-color="#aaa"/>
      <stop offset=".43" stop-color="#6a6a6a"/>
      <stop offset=".58" stop-color="#323232"/>
      <stop offset=".59" stop-color="#353535"/>
      <stop offset=".61" stop-color="#333"/>
      <stop offset=".79" stop-color="#191919"/>
      <stop offset=".93" stop-color="#050505"/>
    </linearGradient>
    <linearGradient id="linear-gradient-68" x1="2142.36" y1="-6066.69" x2="2132.76" y2="-6083.92" gradientTransform="translate(-1856.96 -5194.05) rotate(132.81)" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#2e2e2e"/>
      <stop offset=".2" stop-color="#323232"/>
      <stop offset=".35" stop-color="#252525"/>
      <stop offset=".55" stop-color="#191919"/>
      <stop offset=".94" stop-color="#050505"/>
    </linearGradient>
    <radialGradient id="radial-gradient-9" cx="2136.28" cy="-6077.38" fx="2136.28" fy="-6077.38" r="4.47" gradientTransform="translate(-1856.96 -5194.05) rotate(132.81)" gradientUnits="userSpaceOnUse">
      <stop offset=".08" stop-color="#4f4f4f"/>
      <stop offset=".31" stop-color="#494949"/>
      <stop offset=".59" stop-color="#3b3b3b"/>
      <stop offset=".9" stop-color="#232323"/>
      <stop offset="1" stop-color="#191919"/>
    </radialGradient>
    <linearGradient id="linear-gradient-69" x1="2140.61" y1="-6082.53" x2="2134.97" y2="-6074.8" gradientTransform="translate(-1856.96 -5194.05) rotate(132.81)" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#2e2e2e"/>
      <stop offset=".27" stop-color="#474747"/>
      <stop offset=".64" stop-color="#191919"/>
      <stop offset=".93" stop-color="#050505"/>
    </linearGradient>
    <radialGradient id="radial-gradient-10" cx="2137.22" cy="-6077.35" fx="2137.22" fy="-6077.35" r="4.16" gradientTransform="translate(-1856.96 -5194.05) rotate(132.81)" gradientUnits="userSpaceOnUse">
      <stop offset=".08" stop-color="#4f4f4f"/>
      <stop offset=".27" stop-color="#494949"/>
      <stop offset=".49" stop-color="#3b3b3b"/>
      <stop offset=".74" stop-color="#222"/>
      <stop offset=".99" stop-color="#010101"/>
      <stop offset="1" stop-color="#000"/>
    </radialGradient>
    <radialGradient id="radial-gradient-11" cx="162.51" cy="6983.72" fx="162.51" fy="6983.72" r="4.17" gradientTransform="translate(-3809.21 -4418.16) rotate(-43.89)" xlinkHref="#radial-gradient-10"/>
    <linearGradient id="linear-gradient-70" x1="316.6" y1="936.18" x2="327.57" y2="1016.15" gradientTransform="matrix(1,0,0,1,0,0)" xlinkHref="#linear-gradient-2"/>
    <linearGradient id="linear-gradient-71" x1="330.14" y1="965.29" x2="329.45" y2="1089.77" gradientTransform="matrix(1,0,0,1,0,0)" xlinkHref="#linear-gradient-3"/>
    <linearGradient id="linear-gradient-72" x1="330.8" y1="969.4" x2="330.21" y2="1075.97" gradientTransform="matrix(1,0,0,1,0,0)" xlinkHref="#linear-gradient-3"/>
    <linearGradient id="linear-gradient-73" x1="328.36" y1="1046.16" x2="328.36" y2="1019.17" gradientTransform="matrix(1,0,0,1,0,0)" xlinkHref="#linear-gradient-5"/>
    <radialGradient id="radial-gradient-12" cx="46.71" cy="1036.97" fx="46.71" fy="1036.97" r="34.44" gradientTransform="translate(2.14 4.2)" xlinkHref="#radial-gradient"/>
    <radialGradient id="radial-gradient-13" cx="610.99" cy="1036.61" fx="610.99" fy="1036.61" r="30.54" gradientTransform="translate(2.14 4.2)" xlinkHref="#radial-gradient"/>
    <linearGradient id="linear-gradient-74" x1="39.49" y1="1032.49" x2="136.31" y2="1032.49" gradientTransform="matrix(1,0,0,1,0,0)" xlinkHref="#linear-gradient-6"/>
    <linearGradient id="linear-gradient-75" x1="45.59" y1="1032.49" x2="90.33" y2="1032.49" gradientTransform="matrix(1,0,0,1,0,0)" xlinkHref="#linear-gradient-6"/>
    <linearGradient id="linear-gradient-76" x1="611.05" y1="1032.49" x2="529.35" y2="1032.49" gradientTransform="matrix(1,0,0,1,0,0)" xlinkHref="#linear-gradient-6"/>
    <linearGradient id="linear-gradient-77" x1="606.27" y1="1032.49" x2="547.81" y2="1032.49" gradientTransform="matrix(1,0,0,1,0,0)" xlinkHref="#linear-gradient-6"/>
    <filter id="luminosity-noclip-7" x="112.61" y="1039.58" width="458.58" height="4.04" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse">
      <feFlood flood-color="#fff" result="bg"/>
      <feBlend in="SourceGraphic" in2="bg"/>
    </filter>
    <filter id="luminosity-noclip-8" x="137.29" y="-8732" width="433.9" height="32766" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse">
      <feFlood flood-color="#fff" result="bg"/>
      <feBlend in="SourceGraphic" in2="bg"/>
    </filter>
    <mask id="mask-7" x="137.29" y="-8732" width="433.9" height="32766" maskUnits="userSpaceOnUse"/>
    <linearGradient id="linear-gradient-78" x1="144.64" y1="1041.6" x2="538.85" y2="1041.6" gradientTransform="matrix(1,0,0,1,0,0)" xlinkHref="#linear-gradient-10"/>
    <mask id="mask-6" x="112.61" y="1039.58" width="458.58" height="4.04" maskUnits="userSpaceOnUse">
      <g className="cls-599">
        <g className="cls-209">
          <path className="cls-41" d="M571.19,1041.61c0,1.12-.95,2.02-2.12,2.02H139.42c-1.18,0-2.13-.9-2.13-2.02h0c0-1.12.95-2.03,2.13-2.03h429.65c1.17,0,2.12.91,2.12,2.03h0Z"/>
        </g>
      </g>
    </mask>
    <linearGradient id="linear-gradient-79" x1="119.98" y1="1041.6" x2="515.18" y2="1041.6" gradientTransform="matrix(1,0,0,1,0,0)" xlinkHref="#linear-gradient-11"/>
    <filter id="luminosity-noclip-9" x="33.03" y="1025.85" width="621.28" height="15.57" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse">
      <feFlood flood-color="#fff" result="bg"/>
      <feBlend in="SourceGraphic" in2="bg"/>
    </filter>
    <filter id="luminosity-noclip-10" x="57.7" y="-8732" width="596.61" height="32766" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse">
      <feFlood flood-color="#fff" result="bg"/>
      <feBlend in="SourceGraphic" in2="bg"/>
    </filter>
    <mask id="mask-9" x="57.7" y="-8732" width="596.61" height="32766" maskUnits="userSpaceOnUse"/>
    <linearGradient id="linear-gradient-80" x1="67.81" y1="1033.63" x2="609.84" y2="1033.63" gradientTransform="matrix(1,0,0,1,0,0)" xlinkHref="#linear-gradient-10"/>
    <mask id="mask-8" x="33.03" y="1025.85" width="621.28" height="15.57" maskUnits="userSpaceOnUse">
      <g className="cls-439">
        <g className="cls-328">
          <path className="cls-53" d="M654.31,1033.62c0,4.31-1.3,7.79-2.9,7.79H60.63c-1.62,0-2.93-3.48-2.93-7.79h0c0-4.31,1.31-7.78,2.93-7.78h590.78c1.61,0,2.9,3.47,2.9,7.78h0Z"/>
        </g>
      </g>
    </mask>
    <linearGradient id="linear-gradient-81" x1="43.16" y1="1033.63" x2="586.17" y2="1033.63" gradientTransform="matrix(1,0,0,1,0,0)" xlinkHref="#linear-gradient-11"/>
    <filter id="luminosity-noclip-11" x="33.03" y="1025.83" width="621.28" height="2.37" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse">
      <feFlood flood-color="#fff" result="bg"/>
      <feBlend in="SourceGraphic" in2="bg"/>
    </filter>
    <filter id="luminosity-noclip-12" x="57.7" y="-8732" width="596.61" height="32766" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse">
      <feFlood flood-color="#fff" result="bg"/>
      <feBlend in="SourceGraphic" in2="bg"/>
    </filter>
    <mask id="mask-11" x="57.7" y="-8732" width="596.61" height="32766" maskUnits="userSpaceOnUse"/>
    <linearGradient id="linear-gradient-82" x1="67.81" y1="1027.01" x2="609.84" y2="1027.01" gradientTransform="matrix(1,0,0,1,0,0)" xlinkHref="#linear-gradient-10"/>
    <mask id="mask-10" x="33.03" y="1025.83" width="621.28" height="2.37" maskUnits="userSpaceOnUse">
      <g className="cls-315">
        <g className="cls-498">
          <path className="cls-30" d="M654.31,1027c0,.66-1.3,1.2-2.9,1.2H60.63c-1.62,0-2.93-.54-2.93-1.2h0c0-.65,1.31-1.17,2.93-1.17h590.78c1.61,0,2.9.52,2.9,1.17h0Z"/>
        </g>
      </g>
    </mask>
    <linearGradient id="linear-gradient-83" x1="43.16" y1="1027.01" x2="586.17" y2="1027.01" gradientTransform="matrix(1,0,0,1,0,0)" xlinkHref="#linear-gradient-11"/>
    <linearGradient id="linear-gradient-84" x1="-3614.38" y1="-3290.38" x2="-3614.38" y2="-3254.22" gradientTransform="translate(-3058.93 -3109.6) rotate(-90) scale(1 -1)" xlinkHref="#linear-gradient-16"/>
    <linearGradient id="linear-gradient-85" x1="-3627.47" y1="-3276.78" x2="-3617.69" y2="-3276.78" gradientTransform="translate(-3058.93 -3109.6) rotate(-90) scale(1 -1)" xlinkHref="#linear-gradient-17"/>
    <linearGradient id="linear-gradient-86" x1="-3627.84" y1="-3276.57" x2="-3618" y2="-3276.57" gradientTransform="translate(-3058.93 -3109.6) rotate(-90) scale(1 -1)" xlinkHref="#linear-gradient-17"/>
    <linearGradient id="linear-gradient-87" x1="-3629.08" y1="-3292.09" x2="-3629.08" y2="-3255.93" gradientTransform="translate(-3058.93 -3109.6) rotate(-90) scale(1 -1)" xlinkHref="#linear-gradient-19"/>
    <linearGradient id="linear-gradient-88" x1="-3644" y1="-3276.78" x2="-3630.35" y2="-3276.78" gradientTransform="translate(-3058.93 -3109.6) rotate(-90) scale(1 -1)" xlinkHref="#linear-gradient-17"/>
    <linearGradient id="linear-gradient-89" x1="-3642.79" y1="-3276.2" x2="-3631.33" y2="-3276.2" gradientTransform="translate(-3058.93 -3109.6) rotate(-90) scale(1 -1)" xlinkHref="#linear-gradient-17"/>
    <linearGradient id="linear-gradient-90" x1="-3644.66" y1="-3292.12" x2="-3644.66" y2="-3255.94" gradientTransform="translate(-3058.93 -3109.6) rotate(-90) scale(1 -1)" xlinkHref="#linear-gradient-22"/>
    <linearGradient id="linear-gradient-91" x1="-3859.74" y1="-3294.04" x2="-3859.74" y2="-3253.43" gradientTransform="translate(-3058.93 -3109.6) rotate(-90) scale(1 -1)" xlinkHref="#linear-gradient-23"/>
    <linearGradient id="linear-gradient-92" x1="-4087.89" y1="-3303.54" x2="-4087.89" y2="-3238.91" gradientTransform="translate(-3058.93 -3109.6) rotate(-90) scale(1 -1)" xlinkHref="#linear-gradient-24"/>
    <linearGradient id="linear-gradient-93" x1="208" y1="539.64" x2="227.73" y2="539.64" gradientTransform="matrix(1,0,0,1,0,0)" xlinkHref="#linear-gradient-25"/>
    <linearGradient id="linear-gradient-94" x1="227.73" y1="537.09" x2="237.6" y2="537.09" gradientTransform="matrix(1,0,0,1,0,0)" xlinkHref="#linear-gradient-25"/>
    <linearGradient id="linear-gradient-95" x1="198.04" y1="537.09" x2="208" y2="537.09" gradientTransform="matrix(1,0,0,1,0,0)" xlinkHref="#linear-gradient-25"/>
    <linearGradient id="linear-gradient-96" x1="217.82" y1="526.62" x2="217.82" y2="537.37" gradientTransform="matrix(1,0,0,1,0,0)" xlinkHref="#linear-gradient-28"/>
    <linearGradient id="linear-gradient-97" x1="202.35" y1="507.63" x2="233.29" y2="507.63" gradientTransform="matrix(1,0,0,1,0,0)" xlinkHref="#linear-gradient-29"/>
    <linearGradient id="linear-gradient-98" x1="204.88" y1="506.74" x2="223.97" y2="506.74" gradientTransform="matrix(1,0,0,1,0,0)" xlinkHref="#linear-gradient-30"/>
    <linearGradient id="linear-gradient-99" x1="217.85" y1="477.14" x2="217.85" y2="483.63" gradientTransform="matrix(1,0,0,1,0,0)" xlinkHref="#linear-gradient-28"/>
    <linearGradient id="linear-gradient-100" x1="203.99" y1="351.7" x2="231.65" y2="351.7" gradientTransform="matrix(1,0,0,1,0,0)" xlinkHref="#linear-gradient-29"/>
    <linearGradient id="linear-gradient-101" x1="200.11" y1="218.41" x2="235.53" y2="218.41" gradientTransform="matrix(1,0,0,1,0,0)" xlinkHref="#linear-gradient-33"/>
    <linearGradient id="linear-gradient-102" x1="200.11" y1="200.61" x2="235.53" y2="200.61" gradientTransform="matrix(1,0,0,1,0,0)" xlinkHref="#linear-gradient-34"/>
    <linearGradient id="linear-gradient-103" x1="200.11" y1="184.46" x2="235.53" y2="184.46" gradientTransform="matrix(1,0,0,1,0,0)" xlinkHref="#linear-gradient-35"/>
    <radialGradient id="radial-gradient-14" cx="218.17" cy="169.18" fx="218.17" fy="169.18" r="44.34" gradientTransform="matrix(1,0,0,1,0,0)" xlinkHref="#radial-gradient-3"/>
    <radialGradient id="radial-gradient-15" cx="218.18" cy="171.43" fx="218.18" fy="171.43" r="44.4" gradientTransform="matrix(1,0,0,1,0,0)" xlinkHref="#radial-gradient-3"/>
    <linearGradient id="linear-gradient-104" x1="-3558.33" y1="-7260.76" x2="-3536.31" y2="-7260.76" gradientTransform="translate(7544.3 -3042.31) rotate(-90)" xlinkHref="#linear-gradient-29"/>
    <linearGradient id="linear-gradient-105" x1="-3561.43" y1="-7390.96" x2="-3533.22" y2="-7390.96" gradientTransform="translate(7544.3 -3042.31) rotate(-90)" xlinkHref="#linear-gradient-33"/>
    <linearGradient id="linear-gradient-106" x1="-3561.43" y1="-7405.12" x2="-3533.22" y2="-7405.12" gradientTransform="translate(7544.3 -3042.31) rotate(-90)" xlinkHref="#linear-gradient-34"/>
    <linearGradient id="linear-gradient-107" x1="-3561.43" y1="-7417.98" x2="-3533.22" y2="-7417.98" gradientTransform="translate(7544.3 -3042.31) rotate(-90)" xlinkHref="#linear-gradient-35"/>
    <radialGradient id="radial-gradient-16" cx="-3547.04" cy="-7430.14" fx="-3547.04" fy="-7430.14" r="35.29" gradientTransform="translate(7544.3 -3042.31) rotate(-90)" xlinkHref="#radial-gradient-3"/>
    <radialGradient id="radial-gradient-17" cx="-3547.04" cy="-7428.32" fx="-3547.04" fy="-7428.32" r="35.29" gradientTransform="translate(7544.3 -3042.31) rotate(-90)" xlinkHref="#radial-gradient-3"/>
    <linearGradient id="linear-gradient-108" x1="-3558.33" y1="-7260.76" x2="-3536.31" y2="-7260.76" gradientTransform="translate(7544.3 -3042.31) rotate(-90)" xlinkHref="#linear-gradient-29"/>
    <linearGradient id="linear-gradient-109" x1="-3561.43" y1="-7390.96" x2="-3533.22" y2="-7390.96" gradientTransform="translate(7544.3 -3042.31) rotate(-90)" xlinkHref="#linear-gradient-33"/>
    <linearGradient id="linear-gradient-110" x1="-3561.43" y1="-7405.12" x2="-3533.22" y2="-7405.12" gradientTransform="translate(7544.3 -3042.31) rotate(-90)" xlinkHref="#linear-gradient-34"/>
    <linearGradient id="linear-gradient-111" x1="-3561.43" y1="-7417.98" x2="-3533.22" y2="-7417.98" gradientTransform="translate(7544.3 -3042.31) rotate(-90)" xlinkHref="#linear-gradient-35"/>
    <radialGradient id="radial-gradient-18" cx="-3547.04" cy="-7430.14" fx="-3547.04" fy="-7430.14" r="35.29" gradientTransform="translate(7544.3 -3042.31) rotate(-90)" xlinkHref="#radial-gradient-3"/>
    <radialGradient id="radial-gradient-19" cx="-3547.04" cy="-7428.32" fx="-3547.04" fy="-7428.32" r="35.29" gradientTransform="translate(7544.3 -3042.31) rotate(-90)" xlinkHref="#radial-gradient-3"/>
    <linearGradient id="linear-gradient-112" x1="-8030.63" y1="504.96" x2="-8043.69" y2="504.96" gradientTransform="translate(8431.88)" xlinkHref="#linear-gradient-44"/>
    <linearGradient id="linear-gradient-113" x1="5611.56" y1="393.56" x2="5683.84" y2="393.56" gradientTransform="translate(6082.85 110.8) rotate(-180) scale(1 -1)" xlinkHref="#linear-gradient-29"/>
    <linearGradient id="linear-gradient-114" x1="5589.09" y1="393.56" x2="5683.84" y2="393.56" gradientTransform="translate(6082.85 110.8) rotate(-180) scale(1 -1)" xlinkHref="#linear-gradient-46"/>
    <linearGradient id="linear-gradient-115" x1="1680.85" y1="-6634.37" x2="1617.09" y2="-6559.1" gradientTransform="translate(3938.31 -5194.05) rotate(47.19) scale(1 -1)" xlinkHref="#linear-gradient-47"/>
    <linearGradient id="linear-gradient-116" x1="1658.56" y1="-6652.92" x2="1595.31" y2="-6578.25" gradientTransform="translate(3938.31 -5194.05) rotate(47.19) scale(1 -1)" xlinkHref="#linear-gradient-47"/>
    <linearGradient id="linear-gradient-117" x1="1660.52" y1="-6651.63" x2="1596.65" y2="-6576.24" gradientTransform="translate(3938.31 -5194.05) rotate(47.19) scale(1 -1)" xlinkHref="#linear-gradient-47"/>
    <linearGradient id="linear-gradient-118" x1="1663.38" y1="-6649.06" x2="1599.91" y2="-6574.13" gradientTransform="translate(3938.31 -5194.05) rotate(47.19) scale(1 -1)" xlinkHref="#linear-gradient-47"/>
    <linearGradient id="linear-gradient-119" x1="1667.91" y1="-6645.27" x2="1604.37" y2="-6570.26" gradientTransform="translate(3938.31 -5194.05) rotate(47.19) scale(1 -1)" xlinkHref="#linear-gradient-47"/>
    <linearGradient id="linear-gradient-120" x1="1673.98" y1="-6640.12" x2="1610.55" y2="-6565.23" gradientTransform="translate(3938.31 -5194.05) rotate(47.19) scale(1 -1)" xlinkHref="#linear-gradient-47"/>
    <linearGradient id="linear-gradient-121" x1="1682.11" y1="-6633.29" x2="1618.39" y2="-6558.06" gradientTransform="translate(3938.31 -5194.05) rotate(47.19) scale(1 -1)" xlinkHref="#linear-gradient-47"/>
    <linearGradient id="linear-gradient-122" x1="1657.96" y1="-6653.71" x2="1594.26" y2="-6578.51" gradientTransform="translate(3938.31 -5194.05) rotate(47.19) scale(1 -1)" xlinkHref="#linear-gradient-47"/>
    <linearGradient id="linear-gradient-123" x1="1657.78" y1="-6653.48" x2="1594.49" y2="-6578.76" gradientTransform="translate(3938.31 -5194.05) rotate(47.19) scale(1 -1)" xlinkHref="#linear-gradient-47"/>
    <linearGradient id="linear-gradient-124" x1="1658.58" y1="-6653.13" x2="1594.92" y2="-6577.97" gradientTransform="translate(3938.31 -5194.05) rotate(47.19) scale(1 -1)" xlinkHref="#linear-gradient-47"/>
    <linearGradient id="linear-gradient-125" x1="1660.34" y1="-6652.03" x2="1596.34" y2="-6576.47" gradientTransform="translate(3938.31 -5194.05) rotate(47.19) scale(1 -1)" xlinkHref="#linear-gradient-47"/>
    <linearGradient id="linear-gradient-126" x1="1663.75" y1="-6649.14" x2="1599.78" y2="-6573.62" gradientTransform="translate(3938.31 -5194.05) rotate(47.19) scale(1 -1)" xlinkHref="#linear-gradient-47"/>
    <linearGradient id="linear-gradient-127" x1="1668.58" y1="-6644.9" x2="1604.73" y2="-6569.52" gradientTransform="translate(3938.31 -5194.05) rotate(47.19) scale(1 -1)" xlinkHref="#linear-gradient-47"/>
    <linearGradient id="linear-gradient-128" x1="1675.3" y1="-6639.43" x2="1611.32" y2="-6563.89" gradientTransform="translate(3938.31 -5194.05) rotate(47.19) scale(1 -1)" xlinkHref="#linear-gradient-47"/>
    <linearGradient id="linear-gradient-129" x1="1680.6" y1="-6631.7" x2="1618.8" y2="-6558.73" gradientTransform="translate(3938.31 -5194.05) rotate(47.19) scale(1 -1)" xlinkHref="#linear-gradient-47"/>
    <linearGradient id="linear-gradient-130" x1="1734.9" y1="-6510.23" x2="1578.68" y2="-6686.2" gradientTransform="translate(3938.31 -5194.05) rotate(47.19) scale(1 -1)" xlinkHref="#linear-gradient-62"/>
    <linearGradient id="linear-gradient-131" x1="1157.8" y1="-6510.32" x2="1001.6" y2="-6686.28" gradientTransform="translate(5794.44 -3190.26) rotate(-132.81)" xlinkHref="#linear-gradient-63"/>
    <linearGradient id="linear-gradient-132" x1="1690.58" y1="-6501.5" x2="1632.72" y2="-6660.21" gradientTransform="translate(3938.31 -5194.05) rotate(47.19) scale(1 -1)" xlinkHref="#linear-gradient-63"/>
    <linearGradient id="linear-gradient-133" x1="1681.2" y1="-6525.29" x2="1634.31" y2="-6653.92" gradientTransform="translate(3938.31 -5194.05) rotate(47.19) scale(1 -1)" xlinkHref="#linear-gradient-63"/>
    <linearGradient id="linear-gradient-134" x1="1679.92" y1="-6520.29" x2="1631.2" y2="-6653.93" gradientTransform="translate(3938.31 -5194.05) rotate(47.19) scale(1 -1)" xlinkHref="#linear-gradient-63"/>
    <linearGradient id="linear-gradient-135" x1="1714.5" y1="-6532.93" x2="1613.12" y2="-6662.14" gradientTransform="translate(3938.31 -5194.05) rotate(47.19) scale(1 -1)" xlinkHref="#linear-gradient-67"/>
    <linearGradient id="linear-gradient-136" x1="1660.01" y1="-6590.89" x2="1650.4" y2="-6608.13" gradientTransform="translate(3938.31 -5194.05) rotate(47.19) scale(1 -1)" xlinkHref="#linear-gradient-68"/>
    <radialGradient id="radial-gradient-20" cx="1653.92" cy="-6601.59" fx="1653.92" fy="-6601.59" r="4.47" gradientTransform="translate(3938.31 -5194.05) rotate(47.19) scale(1 -1)" xlinkHref="#radial-gradient-9"/>
    <linearGradient id="linear-gradient-137" x1="1658.25" y1="-6606.73" x2="1652.62" y2="-6599" gradientTransform="translate(3938.31 -5194.05) rotate(47.19) scale(1 -1)" xlinkHref="#linear-gradient-69"/>
    <radialGradient id="radial-gradient-21" cx="1654.87" cy="-6601.55" fx="1654.87" fy="-6601.55" r="4.16" gradientTransform="translate(3938.31 -5194.05) rotate(47.19) scale(1 -1)" xlinkHref="#radial-gradient-10"/>
    <radialGradient id="radial-gradient-22" cx="674.22" cy="7479.29" fx="674.22" fy="7479.29" r="4.17" gradientTransform="translate(5890.56 -4418.16) rotate(-136.11) scale(1 -1)" xlinkHref="#radial-gradient-10"/>
    <image id="image" width="62" height="13" xlinkHref="data:image/png;base64,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"/>
    <image id="image-2" width="62" height="13" xlinkHref="data:image/png;base64,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"/>
    <image id="image-3" width="63" height="13" xlinkHref="data:image/png;base64,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"/>
    <image id="image-4" width="63" height="13" xlinkHref="data:image/png;base64,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"/>

    <clipPath id="clip-nahco3-solution" clipPathUnits="objectBoundingBox">
      <rect id="nahco3-clip-rect" x="0" y="0" width="1" height="1" />
    </clipPath>
    <clipPath id="nahco3-fill-mask" clipPathUnits="userSpaceOnUse">
      <rect id="nahco3-fill-rect" x="406.72" y="720" width="80.16" height="200" />
    </clipPath>
    <clipPath id="clip-acetic-water" clipPathUnits="userSpaceOnUse">
      <rect id="acetic-water-clip-rect" x="1380" y="880" width="260" height="160" />
    </clipPath>
  </defs>
  <g className="cls-377">
    <g id="Layer_1" data-name="Layer 1">
      {/* Background gradient */}
      <rect className="cls-593" x="-3.28" y=".03" width="1924.48" height="820.27"/>
      {/* Floor band (solid black) drawn on top with its own class */}
      <rect className="cls-319-floor" x="-3.28" y="820.3" width="1925.81" height="259.29"/>
      <g>
        <path className="cls-268" d="M471.58,228.17c8.87,9.94,14.25,23.04,14.25,37.4,0,28.91-21.82,52.73-49.88,55.87v425.5h-13.06v-425.55c-27.87-3.33-49.47-27.05-49.47-55.82,0-14.36,5.38-27.46,14.25-37.4h-.46l-18.53-22.29,121.47.56-18.52,21.73h-.05Z"/>
        <g>
          <path className="cls-28" d="M471.58,229.02c8.87,9.94,14.25,23.04,14.25,37.4,0,28.91-21.82,52.73-49.88,55.87v425.5h-13.06v-425.55c-27.87-3.33-49.47-27.05-49.47-55.82,0-14.36,5.38-27.46,14.25-37.4h-.46l-18.53-22.29,121.47.56-18.52,21.73h-.05Z"/>
          <path className="cls-23" d="M476.61,209.44h5.45l-15.02,18.11s11.93,16.64,11.93,21.5l-8.83.29s-1.03-18.55-6.33-20.17,12.81-19.73,12.81-19.73Z"/>
          <path className="cls-23" d="M382.08,291.9l7.07-5.89s6.92,18.99,15.46,21.94c0,0-18.26-6.04-22.23-15.46"/>
        </g>
      </g>
      <path className="cls-21" d="M922.44,356.07c-.95-5.47-5.65-9.62-11.3-9.62h-446.04c-5.67,0-10.38,4.17-11.31,9.66-.12.65-.17,1.32-.17,2v353.79h13.23v-347.61c0-2.44,1.95-4.42,4.35-4.42h433.86c2.4,0,4.35,1.98,4.35,4.42v342.83h13.22v-349.01c0-.7-.06-1.38-.18-2.04Z"/>
      <path className="cls-265" d="M922.44,356.07c-.95-5.47-5.65-9.62-11.3-9.62h-446.04c-5.67,0-10.38,4.17-11.31,9.66-.12.65-.17,1.32-.17,2v353.79h13.23v-347.61c0-2.44,1.95-4.42,4.35-4.42h433.86c2.4,0,4.35,1.98,4.35,4.42v342.83h13.22v-349.01c0-.7-.06-1.38-.18-2.04Z"/>
    </g>
    <g id="Layer_11" data-name="Layer 11">
      <g id="Layer_2" data-name="Layer 2">
        <path id="lime-water-fill" fill="#f0f8ff" opacity="0.22" d="M879.8,657.17h80.16l1.04,261.99s-5.5,33.67-35.73,34.46c-30.22.79-43.09-13.4-43.75-34.15-.66-20.75-1.73-262.3-1.73-262.3Z"/>
      </g>
    </g>
    <g id="Layer_3" data-name="Layer 3">
      <g>
        <g className="cls-281">
          <use transform="translate(858 420)" xlinkHref="#image-4"/>
          <image width="47" height="535" transform="translate(874 431)" xlinkHref="data:image/png;base64,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"/>
          <use transform="translate(920 420)" xlinkHref="#image-2"/>
          <image width="46" height="535" transform="translate(920 431)" xlinkHref="data:image/png;base64,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"/>
        </g>
        <g className="cls-220">
          <use transform="translate(858 420)" xlinkHref="#image-3"/>
          <image width="47" height="535" transform="translate(874 431)" xlinkHref="data:image/png;base64,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"/>
          <use transform="translate(920 420)" xlinkHref="#image"/>
          <image width="46" height="535" transform="translate(920 431)" xlinkHref="data:image/png;base64,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"/>
        </g>
        <g className="cls-244">
          <g id="MeshGrid">
            <g>
              <path className="cls-159" d="M874.36,431.28c.08.15.16.3.22.45-.12,0-.23,0-.34,0-.07-.15-.15-.29-.23-.43.11,0,.23-.01.36-.02Z"/>
              <path className="cls-338" d="M873.68,430.38c.15.15.28.31.41.48.1.14.19.28.27.42-.12,0-.24,0-.36.02-.09-.14-.18-.27-.28-.39-.12-.16-.26-.3-.4-.44.11-.03.23-.06.36-.09Z"/>
              <path className="cls-573" d="M872.56,429.58c.24.12.45.25.65.39.17.12.33.26.47.41-.13.03-.25.06-.36.09-.15-.14-.3-.26-.47-.38-.2-.14-.41-.27-.63-.38.1-.04.21-.08.34-.12Z"/>
              <path className="cls-615" d="M871.38,429.11c.15.04.29.09.43.14.26.1.52.2.75.32-.12.04-.24.08-.34.12-.22-.11-.46-.22-.7-.3-.13-.05-.26-.09-.4-.13.08-.05.17-.1.26-.16Z"/>
              <path className="cls-255" d="M868.94,428.68c.67.06,1.35.15,2,.3.15.04.3.08.44.12-.09.05-.18.1-.26.16-.14-.04-.28-.08-.42-.11-.7-.16-1.42-.23-2.15-.28.13-.06.26-.13.39-.2Z"/>
              <path className="cls-412" d="M865.5,428.44c.47.04.95.08,1.42.11.67.05,1.36.08,2.03.14-.13.07-.26.14-.39.2-.73-.04-1.46-.06-2.17-.11-.52-.03-1.05-.07-1.58-.12.23-.07.45-.14.7-.22Z"/>
              <path className="cls-494" d="M862.83,428.09c.39.07.82.14,1.27.19.45.06.93.11,1.39.15-.24.08-.47.15-.7.22-.53-.04-1.05-.09-1.56-.15-.54-.06-1.06-.13-1.53-.21.31-.08.71-.14,1.13-.21Z"/>
              <path className="cls-454" d="M860.91,427.37c.2.19.5.34.87.46.31.1.66.19,1.05.26-.42.06-.82.13-1.13.21-.47-.08-.9-.17-1.25-.27-.45-.13-.79-.27-.97-.44.41-.09.91-.15,1.42-.22Z"/>
              <path className="cls-625" d="M860.36,426.21c.03.13.07.25.11.36.09.24.18.45.3.63.04.06.09.12.14.17-.51.06-1.01.13-1.42.22-.06-.06-.11-.12-.13-.18-.07-.19-.15-.4-.21-.63-.04-.13-.07-.27-.1-.41.42-.06.87-.11,1.32-.16Z"/>
              <path className="cls-379" d="M860.17,425.52c.04.1.08.21.1.3.02.14.05.27.09.39-.46.05-.9.1-1.32.16-.03-.14-.06-.28-.08-.43-.01-.09-.03-.17-.04-.26.39-.06.82-.12,1.26-.17Z"/>
              <path className="cls-295" d="M859.96,425c.02.07.05.15.08.22.04.1.1.21.14.31-.44.05-.86.1-1.26.17-.01-.09-.02-.17-.03-.26,0-.06,0-.13-.01-.19.35-.09.7-.17,1.08-.24Z"/>
              <path className="cls-182" d="M859.86,424.51c.02.09.05.19.05.28,0,.07.02.14.04.21-.37.07-.72.14-1.08.24,0-.06,0-.12,0-.19,0-.08,0-.17,0-.25.32-.12.64-.21.98-.29Z"/>
              <path className="cls-192" d="M859.82,423.81c.01.13.05.29.02.42-.02.09,0,.18.02.27-.34.08-.66.18-.98.29,0-.08.01-.16.02-.24.02-.12.04-.24.07-.36.26-.16.54-.28.84-.39Z"/>
              <path className="cls-171" d="M859.85,423.28s-.01.09-.03.13c-.05.12-.02.26,0,.4-.31.11-.58.23-.84.39.03-.12.07-.23.11-.34.02-.04.03-.08.05-.11.22-.19.45-.34.72-.47Z"/>
              <path className="cls-171" d="M859.9,423s-.02.1-.03.15c0,.04,0,.09-.02.13-.27.12-.5.28-.72.47.02-.04.04-.07.06-.11.02-.04.05-.08.08-.12.19-.21.39-.38.63-.51Z"/>
              <path className="cls-566" d="M859.96,422.86s-.05.09-.07.14c-.24.14-.43.31-.63.51.03-.04.06-.08.09-.12.18-.22.37-.39.6-.54Z"/>
              <path className="cls-144" d="M875.1,431.24c.07.16.13.32.18.48-.12,0-.23,0-.35,0-.12,0-.24,0-.35,0-.06-.15-.14-.3-.22-.45.12,0,.25,0,.37-.02.12,0,.24-.01.37-.02Z"/>
              <path className="cls-151" d="M874.47,430.2c.14.17.27.36.38.56.09.16.17.32.24.48-.13,0-.25,0-.37.02-.12,0-.25.01-.37.02-.08-.15-.17-.29-.27-.42-.12-.17-.26-.33-.41-.48.13-.03.26-.06.39-.09.13-.03.26-.05.4-.08Z"/>
              <path className="cls-556" d="M873.32,429.33c.26.13.5.27.69.42.16.13.32.28.46.46-.14.03-.28.06-.4.08-.13.03-.26.06-.39.09-.15-.15-.31-.29-.47-.41-.19-.14-.41-.27-.65-.39.12-.04.25-.08.37-.13.12-.04.25-.08.39-.12Z"/>
              <path className="cls-349" d="M871.99,428.79c.16.05.32.11.48.17.3.11.59.24.85.37-.14.04-.27.08-.39.12-.12.05-.25.09-.37.13-.24-.12-.49-.23-.75-.32-.14-.05-.28-.1-.43-.14.09-.05.19-.1.3-.16.1-.05.21-.11.32-.16Z"/>
              <path className="cls-415" d="M869.9,428.3c.54.08,1.08.19,1.6.34.16.05.33.1.49.16-.11.05-.22.1-.32.16-.1.06-.2.11-.3.16-.15-.04-.29-.09-.44-.12-.65-.16-1.33-.25-2-.3.13-.07.28-.14.45-.21.17-.06.34-.12.51-.18Z"/>
              <path className="cls-503" d="M867.18,427.98c.36.04.72.08,1.09.12.55.06,1.1.12,1.64.2-.17.06-.34.11-.51.18-.17.07-.31.14-.45.21-.67-.06-1.36-.09-2.03-.14-.47-.03-.95-.07-1.42-.11.24-.08.51-.16.8-.23.29-.07.58-.15.88-.22Z"/>
              <path className="cls-166" d="M865.17,427.63c.28.07.59.13.93.2.35.07.71.11,1.07.16-.3.07-.59.15-.88.22-.29.08-.55.15-.8.23-.47-.04-.94-.09-1.39-.15-.45-.06-.88-.12-1.27-.19.42-.06.85-.13,1.24-.21.36-.07.72-.16,1.1-.25Z"/>
              <path className="cls-195" d="M863.76,426.93c.18.19.4.33.65.45.22.1.47.18.76.25-.37.09-.74.18-1.1.25-.39.08-.82.15-1.24.21-.39-.07-.75-.16-1.05-.26-.37-.12-.67-.27-.87-.46.51-.06,1.05-.12,1.53-.2.42-.06.87-.15,1.32-.24Z"/>
              <path className="cls-340" d="M863.2,425.93c.03.1.07.2.1.29.12.3.27.53.46.72-.45.09-.9.19-1.32.24-.48.08-1.01.14-1.53.2-.06-.05-.11-.11-.14-.17-.11-.18-.21-.39-.3-.63-.04-.12-.08-.23-.11-.36.46-.05.93-.1,1.42-.14.46-.04.94-.1,1.42-.14Z"/>
              <path className="cls-611" d="M862.93,425.27c.06.11.16.22.19.33.03.12.05.22.09.33-.48.05-.96.1-1.42.14-.49.05-.96.09-1.42.14-.03-.13-.06-.26-.09-.39-.02-.09-.06-.2-.1-.3.44-.05.9-.09,1.36-.13.45-.04.91-.08,1.39-.12Z"/>
              <path className="cls-164" d="M862.52,424.7c.04.08.11.16.16.24.07.11.19.22.25.33-.48.04-.94.08-1.39.12-.46.04-.92.09-1.36.13-.04-.1-.09-.21-.14-.31-.03-.07-.06-.15-.08-.22.37-.07.76-.12,1.2-.17.42-.05.87-.09,1.37-.13Z"/>
              <path className="cls-601" d="M862.32,424.15c.03.11.09.21.1.32.01.08.06.15.1.23-.49.04-.95.08-1.37.13-.43.05-.83.11-1.2.17-.02-.07-.04-.14-.04-.21,0-.09-.03-.19-.05-.28.34-.08.71-.15,1.12-.21.4-.06.84-.1,1.34-.15Z"/>
              <path className="cls-398" d="M862.23,423.36c.02.16.1.32.05.48-.03.1.02.21.04.31-.5.05-.93.1-1.34.15-.41.06-.78.12-1.12.21-.02-.09-.04-.19-.02-.27.02-.14-.01-.29-.02-.42.31-.11.65-.19,1.05-.26.39-.07.83-.13,1.37-.19Z"/>
              <path className="cls-483" d="M862.2,422.75c0,.05,0,.1-.02.15-.05.14.03.29.05.45-.53.06-.98.12-1.37.19-.4.07-.74.16-1.05.26-.01-.13-.04-.28,0-.4.02-.04.02-.09.03-.13.27-.13.58-.22.97-.31.38-.08.82-.15,1.37-.22Z"/>
              <path className="cls-483" d="M862.2,422.42c-.02.06,0,.12,0,.18,0,.05,0,.1,0,.15-.55.07-1,.14-1.37.22-.39.09-.7.18-.97.31,0-.04,0-.09.02-.13,0-.05.01-.1.03-.15.24-.14.53-.25.91-.34.37-.09.83-.16,1.4-.24Z"/>
              <path className="cls-603" d="M862.27,422.26c-.04.05-.05.11-.06.17-.57.07-1.03.15-1.4.24-.38.09-.67.2-.91.34.02-.05.03-.1.07-.14.24-.14.52-.26.9-.36.37-.09.82-.17,1.4-.25Z"/>
              <path className="cls-316" d="M875.52,431.2c.07.17.12.35.16.52-.02,0-.03,0-.05,0-.12,0-.24,0-.36,0-.05-.16-.11-.32-.18-.48.13,0,.25,0,.38-.02.02,0,.03-.01.04-.03Z"/>
              <path className="cls-304" d="M874.96,430.1c.13.18.24.38.34.59.08.17.16.34.22.51-.01.01-.02.02-.04.03-.13,0-.25.01-.38.02-.07-.16-.15-.33-.24-.48-.11-.2-.24-.38-.38-.56.14-.03.28-.06.42-.08.02,0,.04-.01.07-.02Z"/>
              <path className="cls-329" d="M873.8,429.19c.27.14.52.28.71.43.17.14.32.3.45.48-.02,0-.04.01-.07.02-.14.03-.28.05-.42.08-.14-.17-.3-.33-.46-.46-.19-.15-.43-.29-.69-.42.14-.04.28-.08.42-.12.02,0,.04-.01.06-.01Z"/>
              <path className="cls-431" d="M872.4,428.61c.17.06.34.12.51.19.32.12.62.25.9.39-.02,0-.04,0-.06.01-.14.04-.28.08-.42.12-.26-.13-.55-.25-.85-.37-.16-.06-.32-.12-.48-.17.11-.05.23-.1.35-.16.02,0,.03-.01.05-.02Z"/>
              <path className="cls-613" d="M870.55,428.13c.45.08.9.18,1.34.31.17.06.34.12.51.18-.02,0-.03,0-.05.02-.12.05-.24.11-.35.16-.16-.05-.33-.11-.49-.16-.52-.15-1.06-.26-1.6-.34.17-.06.36-.11.55-.17.03,0,.06,0,.09,0Z"/>
              <path className="cls-442" d="M868.26,427.75c.31.06.62.11.93.16.45.07.91.14,1.36.22-.03,0-.07,0-.09,0-.2.06-.38.11-.55.17-.54-.08-1.09-.14-1.64-.2-.36-.04-.73-.07-1.09-.12.3-.07.61-.14.93-.21.04,0,.1-.02.16-.02Z"/>
              <path className="cls-418" d="M866.55,427.38c.24.07.5.13.78.19.31.07.62.13.93.19-.06,0-.11.01-.16.02-.32.07-.63.14-.93.21-.36-.04-.72-.09-1.07-.16-.34-.06-.65-.13-.93-.2.37-.09.75-.18,1.14-.25.05,0,.15,0,.25,0Z"/>
              <path className="cls-402" d="M865.29,426.7c.16.18.37.32.6.43.2.1.43.18.67.25-.1,0-.19,0-.25,0-.39.07-.77.16-1.14.25-.28-.07-.53-.15-.76-.25-.25-.11-.47-.26-.65-.45.45-.09.91-.18,1.35-.22.06,0,.12,0,.17,0Z"/>
              <path className="cls-477" d="M864.83,425.77c.02.09.05.18.08.26.08.28.21.5.38.67-.06,0-.12,0-.17,0-.45.04-.9.13-1.35.22-.19-.19-.33-.42-.46-.72-.04-.09-.07-.18-.1-.29.48-.05.97-.1,1.45-.13.06,0,.12-.02.19-.03Z"/>
              <path className="cls-161" d="M864.64,425.14c.05.11.1.23.13.35.02.1.04.19.06.28-.06.01-.12.02-.19.03-.48.03-.97.08-1.45.13-.03-.1-.06-.21-.09-.33-.03-.11-.12-.22-.19-.33.48-.04.98-.07,1.5-.11.07,0,.14,0,.21-.01Z"/>
              <path className="cls-286" d="M864.39,424.56c.03.08.06.16.09.24.05.11.1.23.15.34-.07,0-.14,0-.21.01-.52.04-1.02.07-1.5.11-.06-.11-.18-.22-.25-.33-.05-.08-.12-.16-.16-.24.5-.04,1.03-.08,1.62-.12.08,0,.17-.01.26-.02Z"/>
              <path className="cls-618" d="M864.29,423.98c0,.11.02.22.04.33.01.08.04.16.06.24-.09,0-.17.01-.26.02-.59.04-1.12.08-1.62.12-.04-.08-.09-.16-.1-.23-.01-.1-.07-.21-.1-.32.5-.05,1.05-.09,1.69-.14.09,0,.18-.01.28-.02Z"/>
              <path className="cls-481" d="M864.42,423.15c-.03.16-.05.33-.1.5-.03.11-.03.22-.03.33-.09,0-.19.01-.28.02-.64.05-1.19.1-1.69.14-.03-.11-.07-.21-.04-.31.04-.16-.03-.32-.05-.48.53-.06,1.15-.12,1.88-.18.1,0,.21-.02.32-.03Z"/>
              <path className="cls-92" d="M864.57,422.51c-.02.05-.03.11-.05.16-.05.15-.07.31-.1.47-.11,0-.22.02-.32.03-.73.06-1.34.12-1.88.18-.02-.16-.09-.31-.05-.45.02-.05.01-.1.02-.15.55-.07,1.21-.13,2.02-.21.12-.01.23-.02.35-.03Z"/>
              <path className="cls-386" d="M864.7,422.17c-.03.06-.06.12-.08.19-.02.05-.04.11-.05.16-.12.01-.24.02-.35.03-.81.07-1.47.14-2.02.21,0-.05,0-.1,0-.15,0-.06,0-.12,0-.18.57-.07,1.27-.14,2.12-.22.12-.01.25-.02.38-.04Z"/>
              <path className="cls-605" d="M864.82,421.98c-.05.06-.08.12-.11.18-.13.01-.26.02-.38.04-.85.08-1.54.15-2.12.22.02-.06.02-.11.06-.17.58-.08,1.29-.15,2.16-.23.12-.01.25-.02.39-.04Z"/>
              <path className="cls-316" d="M875.93,431.19c.06.18.1.36.14.54-.11,0-.22,0-.33,0h-.05c-.04-.17-.1-.35-.16-.52.01-.01.02-.02.04-.03.12,0,.24,0,.36.01Z"/>
              <path className="cls-304" d="M875.43,430.02c.12.19.22.4.3.63.07.18.14.36.19.54-.12,0-.24-.02-.36-.01-.02,0-.03.01-.04.03-.06-.17-.14-.35-.22-.51-.09-.21-.21-.41-.34-.59.02,0,.04-.01.07-.02.13-.02.26-.05.4-.07Z"/>
              <path className="cls-329" d="M874.27,429.07c.28.14.53.29.72.45.17.14.32.31.44.5-.14.02-.27.04-.4.07-.02,0-.04.01-.07.02-.13-.18-.28-.34-.45-.48-.19-.15-.43-.3-.71-.43.02,0,.04,0,.06-.01.13-.04.26-.07.4-.11Z"/>
              <path className="cls-538" d="M872.81,428.45c.18.07.36.13.53.2.33.13.65.27.93.41-.14.04-.28.07-.4.11-.02,0-.04,0-.06.01-.27-.14-.58-.27-.9-.39-.17-.06-.34-.13-.51-.19.02,0,.03,0,.05-.02.11-.05.23-.1.36-.14Z"/>
              <path className="cls-613" d="M871.15,427.97c.38.09.75.18,1.12.29.17.06.35.13.53.19-.13.05-.25.1-.36.14-.02,0-.03.01-.05.02-.17-.06-.34-.12-.51-.18-.44-.13-.89-.23-1.34-.31.03,0,.07,0,.09,0,.17-.05.34-.11.52-.17Z"/>
              <path className="cls-396" d="M869.25,427.53c.26.06.52.13.77.18.38.09.75.16,1.13.25-.17.06-.34.11-.52.17-.03,0-.06,0-.09,0-.45-.08-.91-.15-1.36-.22-.31-.05-.62-.1-.93-.16.06,0,.11-.01.16-.02.28-.06.56-.13.83-.2Z"/>
              <path className="cls-418" d="M867.83,427.14c.21.07.42.13.64.19.26.07.52.14.78.2-.27.07-.55.14-.83.2-.04,0-.1.02-.16.02-.31-.06-.62-.12-.93-.19-.27-.06-.53-.12-.78-.19.1,0,.19,0,.25,0,.35-.06.69-.15,1.03-.23Z"/>
              <path className="cls-290" d="M866.72,426.49c.15.17.32.3.53.41.18.1.37.18.58.25-.34.08-.67.16-1.03.23-.05,0-.15,0-.25,0-.24-.07-.47-.15-.67-.25-.23-.11-.43-.25-.6-.43.06,0,.12,0,.18,0,.41-.05.83-.13,1.26-.21Z"/>
              <path className="cls-371" d="M866.32,425.65c.02.08.04.16.07.23.07.25.19.45.33.61-.42.08-.85.16-1.26.21-.06,0-.12,0-.18,0-.16-.18-.29-.4-.38-.67-.03-.08-.06-.17-.08-.26.06-.01.12-.02.19-.03.43-.04.87-.07,1.3-.1Z"/>
              <path className="cls-512" d="M866.14,425.05c.05.12.1.23.13.35.01.08.03.16.05.24-.43.03-.87.06-1.3.1-.06,0-.12.02-.19.03-.02-.09-.04-.18-.06-.28-.04-.12-.08-.23-.13-.35.07,0,.14,0,.21-.01.43-.03.86-.05,1.29-.08Z"/>
              <path className="cls-619" d="M865.92,424.45c.02.08.05.17.08.25.04.12.09.23.14.35-.43.03-.86.05-1.29.08-.08,0-.15,0-.21.01-.05-.11-.1-.23-.15-.34-.03-.08-.07-.16-.09-.24.09,0,.18-.01.26-.02.42-.03.84-.06,1.26-.09Z"/>
              <path className="cls-92" d="M865.79,423.87c.02.11.07.22.08.33,0,.08.02.17.04.25-.42.03-.84.05-1.26.09-.09,0-.18.01-.26.02-.03-.08-.05-.16-.06-.24-.02-.11-.04-.22-.04-.33.09,0,.19-.01.29-.02.28-.02.57-.04.86-.07.12,0,.23-.02.35-.02Z"/>
              <path className="cls-247" d="M865.92,423.03c-.03.16-.09.33-.15.51-.03.11,0,.22.02.33-.12,0-.24.02-.35.02-.29.02-.58.04-.86.07-.1,0-.19.02-.29.02,0-.11,0-.22.03-.33.05-.17.08-.34.1-.5.11,0,.22-.02.33-.03.27-.02.55-.05.83-.07.11,0,.22-.02.34-.02Z"/>
              <path className="cls-497" d="M866.09,422.38c-.02.05-.03.11-.05.17-.04.16-.08.32-.12.48-.12,0-.23.02-.34.02-.28.02-.56.05-.83.07-.11,0-.23.02-.33.03.03-.16.05-.32.1-.47.02-.06.03-.11.05-.16.12-.01.24-.02.37-.03.39-.03.77-.07,1.15-.1Z"/>
              <path className="cls-589" d="M866.25,422.03c-.04.06-.07.13-.1.19-.02.05-.04.11-.06.16-.38.03-.76.06-1.15.1-.13.01-.25.02-.37.03.02-.05.03-.11.05-.16.02-.06.05-.13.08-.19.13-.01.26-.02.4-.04.39-.04.77-.07,1.15-.1Z"/>
              <path className="cls-135" d="M866.38,421.84c-.05.06-.09.12-.13.19-.38.03-.76.06-1.15.1-.13.01-.27.02-.4.04.03-.06.07-.12.11-.18.13-.01.27-.03.41-.04.39-.04.77-.07,1.16-.1Z"/>
              <path className="cls-573" d="M876.8,431.13c.03.2.06.4.09.59-.17,0-.33,0-.49,0-.11,0-.22,0-.34,0-.04-.17-.08-.35-.14-.54.12,0,.25.02.37.01.18-.01.34-.04.51-.07Z"/>
              <path className="cls-284" d="M876.46,429.84c.1.21.18.44.22.68.05.19.09.4.13.6-.17.03-.33.06-.51.07-.12,0-.25,0-.37-.01-.06-.18-.12-.37-.19-.54-.08-.22-.18-.43-.3-.63.14-.02.28-.04.41-.06.2-.03.41-.07.62-.11Z"/>
              <path className="cls-105" d="M875.32,428.82c.29.15.55.31.73.47.17.16.31.34.41.55-.21.04-.42.08-.62.11-.14.02-.28.04-.41.06-.12-.19-.27-.36-.44-.5-.19-.15-.44-.3-.72-.45.14-.04.28-.07.42-.11.2-.05.41-.1.63-.14Z"/>
              <path className="cls-249" d="M873.79,428.14c.19.08.38.15.56.23.34.15.68.3.97.45-.22.04-.43.09-.63.14-.14.04-.28.07-.42.11-.28-.14-.6-.28-.93-.41-.17-.07-.35-.14-.53-.2.13-.05.26-.09.39-.14.19-.07.39-.12.6-.17Z"/>
              <path className="cls-279" d="M872.48,427.61c.26.1.49.2.75.3.19.08.38.15.57.23-.21.05-.42.11-.6.17-.13.05-.26.09-.39.14-.18-.07-.36-.13-.53-.19-.37-.12-.74-.21-1.12-.29.17-.06.35-.11.53-.17.27-.08.53-.14.79-.19Z"/>
              <path className="cls-196" d="M871.24,427.1c.17.07.32.14.49.21.26.1.49.2.75.3-.26.06-.52.12-.79.19-.19.05-.36.11-.53.17-.38-.09-.75-.16-1.13-.25-.26-.06-.51-.12-.77-.18.27-.07.55-.14.83-.2.41-.09.79-.16,1.16-.23Z"/>
              <path className="cls-152" d="M870.31,426.65c.14.08.29.16.46.23.16.07.31.15.48.22-.37.07-.75.14-1.16.23-.28.06-.56.13-.83.2-.26-.06-.52-.13-.78-.2-.22-.06-.44-.12-.64-.19.34-.08.67-.16,1.01-.22.49-.08.99-.18,1.47-.27Z"/>
              <path className="cls-515" d="M869.59,426.03c.1.13.21.25.34.36.11.1.24.18.38.26-.48.1-.99.2-1.47.27-.34.06-.67.14-1.01.22-.21-.07-.4-.15-.58-.25-.2-.11-.38-.24-.53-.41.42-.08.84-.16,1.23-.2.55-.05,1.11-.16,1.64-.26Z"/>
              <path className="cls-440" d="M869.29,425.42c.02.06.04.11.06.16.07.17.15.31.25.45-.53.1-1.09.21-1.64.26-.39.05-.81.12-1.23.2-.15-.17-.26-.37-.33-.61-.03-.07-.05-.15-.07-.23.43-.03.86-.06,1.27-.09.59-.03,1.16-.09,1.7-.14Z"/>
              <path className="cls-188" d="M869.1,424.9c.03.12.09.23.13.35.02.06.04.12.06.17-.54.05-1.11.1-1.7.14-.41.03-.84.06-1.27.09-.02-.08-.04-.16-.05-.24-.04-.12-.08-.23-.13-.35.43-.03.85-.05,1.26-.07.59-.03,1.16-.06,1.7-.08Z"/>
              <path className="cls-399" d="M868.96,424.3c0,.08.03.17.04.25.02.12.07.23.11.35-.54.03-1.1.05-1.7.08-.42.02-.84.05-1.26.07-.05-.12-.1-.23-.14-.35-.03-.08-.06-.17-.08-.25.42-.03.83-.05,1.25-.07.6-.03,1.2-.06,1.79-.08Z"/>
              <path className="cls-380" d="M868.9,423.72c0,.11.08.22.06.33-.01.08,0,.17,0,.25-.59.03-1.18.05-1.79.08-.42.02-.84.05-1.25.07-.02-.08-.04-.17-.04-.25,0-.11-.06-.22-.08-.33.4-.03.81-.05,1.24-.07.59-.03,1.22-.06,1.87-.08Z"/>
              <path className="cls-129" d="M869.07,422.88c-.08.17-.09.34-.18.51-.05.11,0,.22,0,.33-.65.03-1.27.05-1.87.08-.43.02-.84.05-1.24.07-.02-.11-.05-.22-.02-.33.06-.17.11-.34.15-.51.38-.03.79-.05,1.2-.07.59-.03,1.23-.06,1.95-.08Z"/>
              <path className="cls-23" d="M869.34,422.22c-.04.06-.05.11-.08.17-.09.16-.11.32-.19.49-.72.03-1.36.05-1.95.08-.41.02-.81.04-1.2.07.03-.16.08-.33.12-.48.01-.06.03-.11.05-.17.38-.03.77-.06,1.15-.08.59-.03,1.3-.06,2.1-.09Z"/>
              <path className="cls-90" d="M869.57,421.86c-.06.06-.08.13-.13.19-.04.06-.06.11-.1.17-.81.03-1.51.06-2.1.09-.39.02-.77.05-1.15.08.02-.05.04-.11.06-.16.03-.06.06-.13.1-.19.38-.03.76-.06,1.15-.08.59-.03,1.32-.06,2.17-.1Z"/>
              <path className="cls-215" d="M869.72,421.67c-.06.06-.1.13-.15.19-.85.03-1.58.06-2.17.1-.39.02-.77.05-1.15.08.04-.06.08-.12.13-.19.39-.03.77-.06,1.16-.08.59-.03,1.33-.06,2.18-.1Z"/>
              <path className="cls-2" d="M878.09,431.09c.04.21.08.42.11.62-.28,0-.55,0-.81,0-.17,0-.34,0-.5,0-.02-.19-.05-.39-.09-.59.17-.03.34-.06.52-.06.25,0,.51.01.77.03Z"/>
              <path className="cls-581" d="M877.71,429.78c.11.22.19.45.24.7.06.2.1.41.15.62-.26-.02-.52-.03-.77-.03-.18,0-.35.03-.52.06-.03-.2-.08-.41-.13-.6-.04-.24-.11-.47-.22-.68.21-.04.42-.07.63-.1.22,0,.42.02.62.03Z"/>
              <path className="cls-557" d="M876.55,428.64c.28.18.53.37.73.55.17.18.31.37.42.59-.2-.02-.4-.03-.62-.03-.21.02-.42.06-.63.1-.1-.21-.24-.39-.41-.55-.19-.16-.45-.32-.73-.47.22-.04.44-.08.66-.13.21-.02.39-.04.57-.06Z"/>
              <path className="cls-417" d="M875.1,427.84c.18.09.36.18.53.27.33.17.64.36.92.54-.18.02-.36.04-.57.06-.22.04-.44.08-.66.13-.29-.15-.62-.3-.97-.45-.18-.08-.37-.15-.56-.23.21-.05.44-.1.66-.15.22-.05.42-.1.64-.15Z"/>
              <path className="cls-553" d="M874.04,427.3c.18.1.35.2.51.28.18.08.36.17.54.26-.22.05-.43.11-.64.15-.23.05-.45.1-.66.15-.19-.08-.38-.15-.57-.23-.26-.1-.49-.21-.75-.3.26-.06.52-.11.79-.17.25-.05.51-.1.77-.14Z"/>
              <path className="cls-501" d="M873.19,426.75c.1.07.21.15.33.23.17.11.34.23.52.33-.27.04-.52.09-.77.14-.28.06-.53.11-.79.17-.26-.1-.49-.2-.75-.3-.17-.07-.32-.14-.49-.21.37-.07.72-.13,1.07-.2.3-.05.59-.1.88-.16Z"/>
              <path className="cls-570" d="M872.6,426.27c.09.09.19.18.3.26.09.07.18.14.29.21-.29.05-.58.11-.88.16-.35.07-.7.13-1.07.2-.17-.07-.31-.14-.48-.22-.17-.08-.32-.15-.46-.23.48-.1.94-.19,1.33-.25.31-.04.64-.09.96-.14Z"/>
              <path className="cls-321" d="M872.09,425.66c.08.11.16.22.25.33.08.1.16.19.26.28-.32.05-.65.1-.96.14-.39.06-.85.15-1.33.25-.14-.08-.26-.17-.38-.26-.13-.11-.24-.23-.34-.36.53-.1,1.04-.2,1.48-.24.32-.03.67-.08,1.02-.12Z"/>
              <path className="cls-198" d="M871.79,425.22s.05.07.07.1c.08.11.15.22.23.33-.35.05-.7.1-1.02.12-.44.04-.95.14-1.48.24-.1-.13-.18-.28-.25-.45-.02-.05-.04-.11-.06-.16.54-.05,1.05-.1,1.52-.12.32-.02.65-.04.98-.07Z"/>
              <path className="cls-463" d="M871.65,424.78c0,.11.03.23.07.34.03.03.05.07.07.1-.33.02-.66.05-.98.07-.47.02-.98.07-1.52.12-.02-.06-.04-.11-.06-.17-.03-.12-.1-.23-.13-.35.54-.03,1.06-.05,1.58-.07.32-.02.64-.03.97-.04Z"/>
              <path className="cls-264" d="M871.7,424.19c-.02.08-.03.17-.04.25-.01.11-.02.23,0,.34-.32.01-.65.03-.97.04-.51.02-1.04.05-1.58.07-.03-.12-.09-.23-.11-.35-.01-.08-.04-.17-.04-.25.59-.03,1.17-.05,1.75-.07.33-.01.66-.03.99-.04Z"/>
              <path className="cls-587" d="M871.85,423.62c-.03.11-.06.22-.09.33-.02.08-.04.17-.06.25-.33,0-.66.02-.99.04-.58.02-1.16.05-1.75.07,0-.08-.01-.17,0-.25.02-.11-.06-.22-.06-.33.65-.03,1.32-.05,2.01-.08.31,0,.63-.02.94-.02Z"/>
              <path className="cls-362" d="M872.28,422.78c-.12.17-.22.34-.3.51-.05.11-.09.22-.13.33-.32,0-.63.01-.94.02-.69.03-1.36.05-2.01.08,0-.11-.06-.22,0-.33.09-.17.1-.34.18-.51.72-.03,1.5-.05,2.37-.08.28,0,.56,0,.84-.01Z"/>
              <path className="cls-359" d="M872.81,422.11c-.05.06-.1.12-.15.17-.14.16-.26.33-.38.5-.28,0-.56,0-.84.01-.87.03-1.65.06-2.37.08.08-.17.1-.33.19-.49.03-.06.05-.11.08-.17.81-.03,1.71-.06,2.69-.09.25,0,.51,0,.78-.01Z"/>
              <path className="cls-422" d="M873.15,421.74c-.06.07-.12.13-.19.2-.05.06-.1.11-.15.17-.26,0-.52,0-.78.01-.98.03-1.89.06-2.69.09.04-.06.05-.11.1-.17.05-.07.07-.13.13-.19.85-.03,1.81-.07,2.85-.1.24,0,.48-.01.73-.02Z"/>
              <path className="cls-272" d="M873.34,421.54c-.06.07-.12.13-.19.2-.25,0-.49,0-.73.02-1.04.03-2.01.07-2.85.1.06-.06.09-.13.15-.19.86-.03,1.84-.07,2.91-.1.23,0,.46-.01.7-.02Z"/>
              <path className="cls-358" d="M879.26,431.13c.08.19.14.39.2.58-.14,0-.28,0-.41,0-.28,0-.56,0-.84,0-.03-.2-.07-.42-.11-.62.26.02.53.03.79.04.13,0,.25,0,.38,0Z"/>
              <path className="cls-344" d="M878.66,429.86c.14.22.25.45.35.69.09.19.17.39.25.58-.13,0-.25,0-.38,0-.27,0-.53-.02-.79-.04-.04-.21-.09-.42-.15-.62-.05-.25-.13-.48-.24-.7.2.02.4.04.64.05.11,0,.21.02.32.03Z"/>
              <path className="cls-438" d="M877.47,428.61c.27.21.52.42.73.63.18.18.33.39.47.61-.1-.01-.21-.02-.32-.03-.23-.01-.44-.03-.64-.05-.11-.22-.25-.41-.42-.59-.2-.18-.45-.37-.73-.55.18-.02.38-.03.61-.04.11,0,.21,0,.31.01Z"/>
              <path className="cls-213" d="M876.14,427.69c.16.1.31.2.47.31.3.2.59.41.86.62-.1-.01-.2-.02-.31-.01-.24,0-.43.02-.61.04-.28-.18-.6-.36-.92-.54-.17-.09-.35-.18-.53-.27.22-.05.45-.1.7-.13.12-.02.23-.02.34-.02Z"/>
              <path className="cls-568" d="M875.25,427.13c.15.1.29.2.43.27.15.09.31.19.47.29-.11,0-.22,0-.34.02-.25.03-.48.08-.7.13-.18-.09-.36-.17-.54-.26-.17-.08-.33-.17-.51-.28.27-.04.54-.08.82-.12.13-.02.26-.03.39-.05Z"/>
              <path className="cls-123" d="M874.56,426.58c.08.07.17.15.27.22.14.12.28.23.43.34-.13.01-.26.03-.39.05-.28.04-.55.08-.82.12-.18-.1-.35-.22-.52-.33-.12-.08-.22-.15-.33-.23.29-.05.59-.11.89-.15.15-.02.31-.02.47-.02Z"/>
              <path className="cls-214" d="M874.03,426.12c.08.09.18.17.28.25.07.06.15.13.24.21-.16,0-.32,0-.47.02-.3.04-.6.09-.89.15-.1-.07-.2-.15-.29-.21-.11-.08-.21-.17-.3-.26.32-.05.65-.09.96-.13.16-.01.31-.02.47-.02Z"/>
              <path className="cls-383" d="M873.56,425.56c.07.1.16.2.24.3.07.09.15.18.24.26-.16,0-.31,0-.47.02-.32.03-.64.08-.96.13-.09-.09-.18-.18-.26-.28-.09-.11-.17-.22-.25-.33.35-.05.7-.09,1.02-.11.16,0,.3,0,.45,0Z"/>
              <path className="cls-164" d="M873.26,425.16s.05.06.07.09c.08.1.16.2.23.3-.15,0-.29-.02-.45,0-.32.02-.67.07-1.02.11-.08-.11-.16-.22-.23-.33-.02-.03-.05-.07-.07-.1.33-.02.66-.05.98-.06.16,0,.32,0,.49,0Z"/>
              <path className="cls-164" d="M873.12,424.74c0,.11.02.22.06.33.03.03.06.06.08.09-.17,0-.33,0-.49,0-.32.01-.65.03-.98.06-.02-.03-.05-.07-.07-.1-.04-.11-.06-.23-.07-.34.32-.01.65-.02.97-.03.16,0,.33,0,.5-.01Z"/>
              <path className="cls-93" d="M873.17,424.17c-.01.08-.03.16-.04.24-.01.11-.02.22-.01.33-.17,0-.34,0-.5.01-.32,0-.65.02-.97.03,0-.11,0-.23,0-.34,0-.08.02-.17.04-.25.33,0,.66-.01.99-.02.16,0,.32,0,.48,0Z"/>
              <path className="cls-430" d="M873.27,423.6c-.02.11-.03.22-.05.33-.02.08-.04.16-.05.24-.16,0-.32,0-.48,0-.33,0-.66.01-.99.02.02-.08.04-.17.06-.25.03-.11.06-.22.09-.33.32,0,.63-.01.95-.01.15,0,.31,0,.47,0Z"/>
              <path className="cls-453" d="M873.57,422.77c-.09.17-.17.34-.22.5-.04.11-.05.22-.07.33-.16,0-.32,0-.47,0-.31,0-.63,0-.95.01.03-.11.07-.22.13-.33.08-.17.18-.34.3-.51.28,0,.56,0,.85-.01.14,0,.29,0,.44,0Z"/>
              <path className="cls-125" d="M874.01,422.1c-.04.06-.08.12-.12.18-.11.16-.22.33-.31.5-.15,0-.3,0-.44,0-.28,0-.57,0-.85.01.12-.17.24-.33.38-.5.05-.06.1-.12.15-.17.26,0,.53,0,.79-.01.13,0,.26,0,.4,0Z"/>
              <path className="cls-387" d="M874.28,421.71c-.05.07-.1.14-.15.21-.04.06-.08.12-.13.18-.14,0-.27,0-.4,0-.26,0-.53,0-.79.01.05-.06.1-.11.15-.17.06-.07.12-.13.19-.2.25,0,.5-.01.76-.02.12,0,.25,0,.37,0Z"/>
              <path className="cls-614" d="M874.43,421.51c-.05.07-.1.14-.15.21-.13,0-.25,0-.37,0-.25,0-.51.01-.76.02.06-.07.12-.13.19-.2.24,0,.48-.01.73-.02.12,0,.24,0,.36-.01Z"/>
              <path className="cls-433" d="M880.85,431.22c.12.17.25.33.35.48-.45,0-.89,0-1.32,0-.14,0-.28,0-.42,0-.06-.19-.12-.38-.2-.58.13,0,.25,0,.38,0,.39.01.79.05,1.2.08Z"/>
              <path className="cls-536" d="M879.93,430.05c.17.21.36.44.52.66.13.17.28.34.4.51-.41-.03-.81-.07-1.2-.08-.13,0-.26,0-.38,0-.08-.19-.16-.39-.25-.58-.1-.24-.22-.48-.35-.69.1.01.21.03.32.05.3.03.61.09.95.15Z"/>
              <path className="cls-529" d="M878.61,428.69c.25.24.52.48.75.72.19.21.4.43.57.64-.34-.06-.64-.12-.95-.15-.11-.02-.21-.03-.32-.05-.14-.22-.29-.42-.47-.61-.21-.21-.46-.42-.73-.63.1.01.2.02.31.03.27.02.53.03.83.04Z"/>
              <path className="cls-228" d="M877.47,427.64c.12.11.25.23.38.35.24.23.52.46.76.7-.31-.01-.56-.02-.83-.04-.11,0-.21-.02-.31-.03-.27-.21-.56-.42-.86-.62-.16-.11-.31-.21-.47-.31.11,0,.22,0,.34,0,.28-.01.6-.03.98-.04Z"/>
              <path className="cls-206" d="M876.83,427.02c.1.1.18.2.29.28.11.11.23.22.35.33-.38.01-.7.03-.98.04-.12,0-.23,0-.34,0-.16-.1-.31-.2-.47-.29-.14-.07-.28-.16-.43-.27.13-.01.26-.03.39-.04.33-.02.73-.05,1.18-.07Z"/>
              <path className="cls-201" d="M876.42,426.47c.06.07.11.15.17.22.08.12.14.23.24.34-.46.02-.86.05-1.18.07-.14,0-.26.02-.39.04-.15-.1-.29-.22-.43-.34-.09-.07-.18-.15-.27-.22.16,0,.32,0,.47-.01.4-.03.87-.06,1.39-.09Z"/>
              <path className="cls-283" d="M876.07,426.02c.06.08.12.15.19.23.06.08.1.15.16.22-.52.03-.99.07-1.39.09-.15,0-.31,0-.47.01-.08-.07-.16-.14-.24-.21-.1-.08-.2-.16-.28-.25.16,0,.31,0,.48-.01.45-.03.98-.06,1.56-.09Z"/>
              <path className="cls-371" d="M875.73,425.5c.05.1.11.19.17.28.05.08.11.16.17.24-.58.03-1.11.07-1.56.09-.16,0-.32,0-.48.01-.08-.09-.17-.17-.24-.26-.08-.1-.16-.2-.24-.3.15,0,.3.02.48.02.5-.02,1.07-.04,1.69-.07Z"/>
              <path className="cls-299" d="M875.53,425.12s.03.06.04.09c.05.1.1.19.15.29-.61.02-1.18.05-1.69.07-.18,0-.33,0-.48-.02-.07-.1-.15-.2-.23-.3-.02-.03-.05-.06-.07-.09.17,0,.34,0,.53,0,.54-.01,1.12-.02,1.75-.03Z"/>
              <path className="cls-299" d="M875.42,424.72c.02.11.03.21.07.31.02.03.03.06.05.09-.63.01-1.21.02-1.75.03-.19,0-.36,0-.53,0-.03-.03-.05-.06-.08-.09-.04-.11-.05-.22-.06-.33.17,0,.35,0,.53,0,.53,0,1.13-.01,1.77-.02Z"/>
              <path className="cls-384" d="M875.39,424.17c0,.08,0,.15,0,.23.01.11,0,.21.03.32-.64,0-1.24,0-1.77.02-.18,0-.36,0-.53,0,0-.11,0-.22.01-.33,0-.08.02-.16.04-.24.16,0,.32,0,.49,0,.52,0,1.11,0,1.73,0Z"/>
              <path className="cls-427" d="M875.41,423.62c0,.11-.02.21-.02.32,0,.08-.01.15,0,.23-.62,0-1.21,0-1.73,0-.16,0-.33,0-.49,0,.01-.08.03-.16.05-.24.02-.11.03-.22.05-.33.16,0,.33,0,.49,0,.51,0,1.07,0,1.65.01Z"/>
              <path className="cls-537" d="M875.53,422.79c-.04.17-.07.34-.08.51,0,.11-.03.21-.03.32-.58,0-1.14-.01-1.65-.01-.16,0-.33,0-.49,0,.02-.11.04-.22.07-.33.05-.17.13-.34.22-.5.15,0,.31,0,.47,0,.47,0,.97,0,1.49.01Z"/>
              <path className="cls-211" d="M875.73,422.09c-.02.06-.04.12-.06.18-.05.17-.1.34-.14.51-.52,0-1.02-.01-1.49-.01-.16,0-.31,0-.47,0,.09-.17.2-.33.31-.5.04-.06.08-.12.12-.18.14,0,.27,0,.41,0,.42,0,.86,0,1.31,0Z"/>
              <path className="cls-564" d="M875.87,421.69c-.03.07-.05.15-.08.22-.02.06-.04.12-.06.19-.45,0-.89,0-1.31,0-.14,0-.28,0-.41,0,.04-.06.08-.12.13-.18.05-.07.1-.14.15-.21.13,0,.25,0,.38,0,.39,0,.8-.02,1.21-.02Z"/>
              <path className="cls-530" d="M875.95,421.46c-.03.07-.06.15-.08.22-.41,0-.82.01-1.21.02-.13,0-.26,0-.38,0,.05-.07.1-.14.15-.21.12,0,.24,0,.37-.01.38-.01.76-.02,1.16-.03Z"/>
              <path className="cls-180" d="M882.54,431.28c.13.15.25.29.35.43-.11,0-.22,0-.33,0-.46,0-.91,0-1.36,0-.1-.16-.23-.32-.35-.48.41.03.84.06,1.29.06.13,0,.27,0,.4,0Z"/>
              <path className="cls-475" d="M881.64,430.15c.17.22.35.44.51.65.13.17.26.32.39.47-.13,0-.27.01-.4,0-.45,0-.87-.03-1.29-.06-.12-.17-.27-.33-.4-.51-.15-.22-.34-.45-.52-.66.34.06.71.11,1.14.14.19,0,.38-.02.57-.04Z"/>
              <path className="cls-308" d="M880.61,428.72c.18.25.38.51.55.77.14.22.32.45.48.67-.19.02-.38.03-.57.04-.43-.03-.8-.08-1.14-.14-.17-.21-.38-.44-.57-.64-.23-.24-.5-.48-.75-.72.31.01.66.03,1.14.05.27-.01.56-.02.86-.03Z"/>
              <path className="cls-544" d="M879.88,427.59c.07.12.15.25.22.37.14.25.33.5.51.76-.3,0-.6.01-.86.03-.47-.03-.83-.04-1.14-.05-.25-.24-.53-.47-.76-.7-.13-.12-.26-.24-.38-.35.38-.01.83-.03,1.37-.03.33,0,.67-.02,1.04-.02Z"/>
              <path className="cls-512" d="M879.6,426.93c.02.1.06.21.11.3.04.12.11.23.17.36-.36,0-.71.01-1.04.02-.54,0-.99.02-1.37.03-.12-.11-.24-.23-.35-.33-.11-.08-.2-.18-.29-.28.46-.02.98-.04,1.55-.06.38,0,.79-.02,1.22-.04Z"/>
              <path className="cls-467" d="M879.53,426.39c.01.07.03.14.04.22,0,.11.01.22.04.33-.43.01-.84.03-1.22.04-.57.01-1.09.03-1.55.06-.1-.1-.16-.22-.24-.34-.06-.07-.11-.14-.17-.22.52-.03,1.09-.06,1.69-.07.45,0,.92-.01,1.41-.02Z"/>
              <path className="cls-305" d="M879.42,425.94c.01.08.02.15.04.23.02.07.04.15.06.22-.49,0-.97,0-1.41.02-.6,0-1.17.04-1.69.07-.06-.07-.1-.15-.16-.22-.07-.08-.13-.15-.19-.23.58-.03,1.19-.06,1.82-.07.49,0,1.01-.01,1.54-.01Z"/>
              <path className="cls-451" d="M879.39,425.44c0,.09,0,.18.01.26,0,.08.01.15.02.23-.53,0-1.04,0-1.54.01-.63,0-1.25.03-1.82.07-.06-.08-.12-.16-.17-.24-.06-.09-.12-.18-.17-.28.61-.02,1.27-.05,1.95-.05.55,0,1.13,0,1.72,0Z"/>
              <path className="cls-474" d="M879.36,425.09s.01.06.01.08c.01.09.01.18.02.27-.59,0-1.16,0-1.72,0-.68,0-1.33.03-1.95.05-.05-.1-.1-.19-.15-.29-.01-.03-.03-.06-.04-.09.63-.01,1.3-.02,2.01-.02.59,0,1.19,0,1.82,0Z"/>
              <path className="cls-474" d="M879.26,424.69c.03.1.06.21.08.31,0,.03.01.06.02.08-.62,0-1.23,0-1.82,0-.71,0-1.38.01-2.01.02-.01-.03-.03-.06-.05-.09-.03-.1-.04-.21-.07-.31.64,0,1.31,0,1.99-.01.59,0,1.21,0,1.85-.01Z"/>
              <path className="cls-263" d="M879.13,424.14c.02.08.03.15.05.23.02.11.05.21.08.32-.64,0-1.26,0-1.85.01-.68,0-1.35,0-1.99.01-.02-.11-.02-.21-.03-.32,0-.08,0-.15,0-.23.62,0,1.26,0,1.89,0,.6,0,1.22-.01,1.86-.02Z"/>
              <path className="cls-23" d="M879.04,423.59c.01.11.03.21.05.32.01.08.03.16.05.23-.64,0-1.26,0-1.86.02-.62,0-1.27,0-1.89,0,0-.08,0-.15,0-.23,0-.11.02-.21.02-.32.58,0,1.18,0,1.75,0,.6,0,1.23-.02,1.87-.02Z"/>
              <path className="cls-432" d="M878.99,422.76c0,.17.01.34.02.51,0,.11.02.22.03.32-.64,0-1.27.01-1.87.02-.58,0-1.18,0-1.75,0,0-.11.03-.21.03-.32.01-.17.04-.34.08-.51.52,0,1.05,0,1.56,0,.61-.01,1.25-.02,1.9-.03Z"/>
              <path className="cls-617" d="M878.99,422.04c0,.06,0,.13,0,.19,0,.18,0,.35,0,.53-.66,0-1.29.02-1.9.03-.51,0-1.04,0-1.56,0,.04-.17.09-.34.14-.51.02-.06.04-.12.06-.18.45,0,.91,0,1.37,0,.61-.02,1.25-.03,1.9-.04Z"/>
              <path className="cls-366" d="M879.03,421.61c0,.08-.02.16-.02.23,0,.07-.01.13-.01.19-.65.01-1.28.03-1.9.04-.46.01-.92.01-1.37,0,.02-.06.04-.12.06-.19.03-.07.05-.15.08-.22.41,0,.83-.01,1.26-.02.62-.02,1.25-.03,1.9-.05Z"/>
              <path className="cls-369" d="M879.06,421.38c-.01.08-.03.16-.03.24-.65.02-1.28.03-1.9.05-.43.01-.85.02-1.26.02.03-.07.06-.15.08-.22.39-.01.8-.02,1.21-.03.62-.02,1.25-.03,1.9-.05Z"/>
              <path className="cls-413" d="M883.39,431.22c.07.16.14.33.18.48-.12,0-.24,0-.36,0-.11,0-.22,0-.33,0-.1-.14-.22-.27-.35-.43.13,0,.27-.02.41-.02.15,0,.29-.02.45-.03Z"/>
              <path className="cls-405" d="M882.92,430.04c.07.22.16.44.24.66.07.18.16.35.22.51-.15,0-.3.02-.45.03-.14,0-.27.02-.41.02-.13-.15-.26-.3-.39-.47-.16-.21-.34-.43-.51-.65.19-.02.39-.04.61-.05.23-.02.45-.04.68-.06Z"/>
              <path className="cls-443" d="M882.63,428.68c.06.22.13.43.16.65,0,.02.01.04.01.06,0,.21.06.43.13.65-.23.02-.45.04-.68.06-.21.02-.41.04-.61.05-.17-.22-.34-.45-.48-.67-.17-.26-.36-.52-.55-.77.3,0,.62-.01.94-.02.34,0,.7-.01,1.08-.02Z"/>
              <path className="cls-488" d="M882.37,427.57c.01.13.03.25.05.38.04.25.13.49.2.73-.38,0-.74.01-1.08.02-.32,0-.64.01-.94.02-.18-.25-.36-.5-.51-.76-.07-.13-.16-.25-.22-.37.36,0,.75,0,1.15-.01.43,0,.88,0,1.34,0Z"/>
              <path className="cls-160" d="M882.48,426.89c-.05.1-.1.2-.1.3,0,0,0,0,0,0-.02.12-.02.25,0,.37-.47,0-.92,0-1.34,0-.4,0-.79,0-1.15.01-.07-.12-.13-.24-.17-.36-.05-.1-.08-.2-.11-.3.43-.01.88-.03,1.34-.03.5,0,1.01,0,1.54,0Z"/>
              <path className="cls-381" d="M882.79,426.37c-.03.07-.07.14-.11.21-.07.1-.14.2-.19.31-.53,0-1.04,0-1.54,0-.47,0-.92.02-1.34.03-.02-.1-.03-.21-.04-.33-.01-.07-.03-.14-.04-.22.49,0,1.01,0,1.53,0,.56,0,1.14,0,1.73,0Z"/>
              <path className="cls-282" d="M882.91,425.93c-.03.08-.06.15-.06.22,0,.07-.03.15-.06.22-.59,0-1.17,0-1.73,0-.52,0-1.04,0-1.53,0-.01-.07-.03-.15-.06-.22-.02-.08-.03-.15-.04-.23.53,0,1.08,0,1.64,0,.6,0,1.22,0,1.84,0Z"/>
              <path className="cls-248" d="M883.19,425.44c-.05.09-.11.18-.16.26-.04.08-.09.15-.12.23-.62,0-1.24,0-1.84,0-.57,0-1.11,0-1.64,0-.01-.08-.01-.15-.02-.23-.01-.09,0-.18-.01-.26.59,0,1.19,0,1.81,0,.65,0,1.32,0,1.99,0Z"/>
              <path className="cls-520" d="M883.35,425.08s-.02.06-.02.09c-.03.09-.08.18-.13.27-.67,0-1.34,0-1.99,0-.61,0-1.22,0-1.81,0,0-.09,0-.18-.02-.27,0-.03-.01-.06-.01-.08.62,0,1.26,0,1.9,0,.69,0,1.38,0,2.08,0Z"/>
              <path className="cls-520" d="M883.35,424.69c.01.1.02.21.02.31,0,.03,0,.06-.02.09-.7,0-1.4,0-2.08,0-.64,0-1.28,0-1.9,0,0-.03-.01-.06-.02-.08-.02-.1-.05-.21-.08-.31.64,0,1.29,0,1.95,0,.7,0,1.42,0,2.14,0Z"/>
              <path className="cls-256" d="M883.26,424.14c.01.08.03.16.04.23.01.11.03.21.04.32-.72,0-1.44,0-2.14,0-.66,0-1.31,0-1.95,0-.03-.1-.06-.21-.08-.32-.02-.08-.03-.15-.05-.23.64,0,1.3,0,1.97,0,.71,0,1.44,0,2.17,0Z"/>
              <path className="cls-23" d="M883.2,423.58c0,.11.02.22.03.32,0,.08.02.16.04.24-.73,0-1.45,0-2.17,0-.67,0-1.33,0-1.97,0-.02-.08-.03-.16-.05-.23-.02-.1-.04-.21-.05-.32.64,0,1.3,0,1.98-.01.72,0,1.45,0,2.19,0Z"/>
              <path className="cls-23" d="M883.22,422.72c0,.18,0,.35-.02.53-.01.11-.01.22,0,.33-.74,0-1.47,0-2.19,0-.67,0-1.33,0-1.98.01-.01-.11-.03-.21-.03-.32,0-.17-.01-.34-.02-.51.66,0,1.33-.01,2.01-.02.72,0,1.47-.01,2.22-.02Z"/>
              <path className="cls-341" d="M883.2,421.97c0,.07,0,.14,0,.2,0,.19.01.37.02.55-.75,0-1.5.01-2.22.02-.68,0-1.35.01-2.01.02,0-.17,0-.35,0-.53,0-.06,0-.13,0-.19.65-.01,1.32-.02,2-.03.72-.01,1.46-.02,2.21-.03Z"/>
              <path className="cls-306" d="M883.22,421.52c0,.08-.01.17-.02.25,0,.07,0,.14,0,.2-.75.01-1.49.02-2.21.03-.68.01-1.35.02-2,.03,0-.06,0-.13.01-.19,0-.08.02-.15.02-.23.65-.02,1.31-.03,1.99-.04.72-.02,1.46-.03,2.2-.05Z"/>
              <path className="cls-95" d="M883.25,421.27c-.02.08-.03.17-.03.25-.74.02-1.48.03-2.2.05-.68.01-1.34.03-1.99.04,0-.08.02-.16.03-.24.65-.02,1.31-.03,1.99-.05.72-.02,1.45-.04,2.2-.05Z"/>
              <path className="cls-133" d="M884.37,431.18c0,.18-.02.35-.04.52-.13,0-.26,0-.39,0-.12,0-.24,0-.36,0-.04-.15-.12-.32-.18-.48.15,0,.31-.02.47-.02.18,0,.34-.01.51-.02Z"/>
              <path className="cls-516" d="M884.53,429.95c-.06.22-.08.46-.12.68-.03.18-.04.36-.04.54-.17,0-.33.02-.51.02-.16,0-.32.01-.47.02-.07-.16-.16-.34-.22-.51-.08-.22-.18-.44-.24-.66.23-.02.47-.04.73-.05.29-.01.58-.03.87-.05Z"/>
              <path className="cls-449" d="M885.13,428.63c-.08.21-.17.42-.29.62-.01.02-.02.04-.03.06-.15.21-.23.43-.29.65-.3.02-.59.04-.87.05-.26.01-.5.03-.73.05-.07-.22-.12-.44-.13-.65,0-.02-.01-.04-.01-.06-.03-.22-.1-.43-.16-.65.38,0,.77-.01,1.16-.02.44-.01.88-.02,1.34-.03Z"/>
              <path className="cls-274" d="M885.57,427.55c-.06.13-.1.26-.16.38-.1.23-.18.47-.27.7-.46,0-.91.01-1.34.03-.4.01-.79.02-1.16.02-.07-.24-.16-.48-.2-.73-.02-.13-.04-.26-.05-.38.47,0,.96,0,1.46,0,.56,0,1.13,0,1.73,0Z"/>
              <path className="cls-405" d="M886.06,426.88c-.11.1-.22.19-.29.29t0,0c-.09.12-.15.25-.21.38-.59,0-1.17,0-1.73,0-.51,0-1,0-1.46,0-.01-.13-.01-.25,0-.37,0,0,0,0,0,0,0-.1.05-.2.1-.3.53,0,1.08,0,1.64,0,.62,0,1.27,0,1.94,0Z"/>
              <path className="cls-283" d="M886.62,426.37c-.06.07-.14.14-.21.21-.11.1-.24.2-.35.3-.66,0-1.32,0-1.94,0-.57,0-1.11,0-1.64,0,.05-.1.13-.2.19-.31.04-.07.08-.14.11-.21.59,0,1.2,0,1.81,0,.67,0,1.35,0,2.02,0Z"/>
              <path className="cls-466" d="M886.94,425.93c-.06.08-.13.15-.16.22-.03.07-.09.14-.16.21-.68,0-1.35,0-2.02,0-.61,0-1.22,0-1.81,0,.03-.07.05-.14.06-.22,0-.07.03-.15.06-.22.62,0,1.26,0,1.9,0,.71,0,1.42,0,2.14,0Z"/>
              <path className="cls-227" d="M887.43,425.44c-.09.09-.19.18-.27.26-.07.08-.15.15-.21.23-.71,0-1.43,0-2.14,0-.64,0-1.28,0-1.9,0,.03-.08.08-.15.12-.23.05-.09.11-.17.16-.26.67,0,1.35,0,2.03,0,.74,0,1.48,0,2.21,0Z"/>
              <path className="cls-451" d="M887.71,425.08s-.03.06-.05.09c-.05.09-.15.18-.24.27-.73,0-1.46,0-2.21,0-.68,0-1.36,0-2.03,0,.05-.09.1-.18.13-.27,0-.03.02-.06.02-.09.7,0,1.4,0,2.1,0,.77,0,1.52,0,2.26,0Z"/>
              <path className="cls-451" d="M887.81,424.7c-.01.1-.03.19-.06.29-.01.03-.02.06-.04.09-.74,0-1.5,0-2.26,0-.7,0-1.4,0-2.1,0,0-.03.01-.06.02-.09,0-.1,0-.2-.02-.31.72,0,1.44,0,2.15,0,.78,0,1.56,0,2.31.01Z"/>
              <path className="cls-533" d="M887.85,424.17c0,.07,0,.15-.01.22-.01.11-.02.21-.03.3-.76,0-1.53-.01-2.31-.01-.71,0-1.43,0-2.15,0-.01-.1-.03-.21-.04-.32-.01-.08-.03-.15-.04-.23.73,0,1.47,0,2.2,0,.8,0,1.6.02,2.39.03Z"/>
              <path className="cls-23" d="M887.89,423.59c-.01.12-.02.24-.03.35,0,.08,0,.16-.01.23-.79-.02-1.59-.04-2.39-.03-.73,0-1.47,0-2.2,0-.01-.08-.03-.16-.04-.24-.01-.11-.02-.21-.03-.32.74,0,1.48,0,2.23,0,.82,0,1.65,0,2.46.02Z"/>
              <path className="cls-23" d="M888,422.69c0,.18,0,.36-.05.54-.03.11-.04.23-.06.36-.82-.01-1.64-.02-2.46-.02-.75,0-1.49,0-2.23,0,0-.11,0-.22,0-.33.02-.17.02-.35.02-.53.75,0,1.52-.01,2.28-.02.83,0,1.67,0,2.5-.01Z"/>
              <path className="cls-397" d="M888.01,421.91c0,.07,0,.14,0,.21-.01.19,0,.38,0,.57-.83,0-1.67,0-2.5.01-.76,0-1.52.01-2.28.02,0-.18-.01-.36-.02-.55,0-.07,0-.13,0-.2.75-.01,1.5-.02,2.27-.04.84-.01,1.69-.02,2.54-.02Z"/>
              <path className="cls-327" d="M888.03,421.43c0,.09,0,.18-.01.27,0,.07,0,.15,0,.22-.86,0-1.71.01-2.54.02-.76.01-1.52.02-2.27.04,0-.07,0-.14,0-.2,0-.08,0-.16.02-.25.74-.02,1.5-.03,2.26-.05.84-.02,1.69-.03,2.55-.05Z"/>
              <path className="cls-180" d="M888.07,421.16c-.02.09-.03.18-.04.27-.86.02-1.71.03-2.55.05-.76.02-1.52.03-2.26.05,0-.08.02-.17.03-.25.75-.02,1.5-.04,2.27-.05.84-.02,1.69-.04,2.55-.06Z"/>
              <path className="cls-154" d="M885.29,431.13c-.1.19-.18.38-.26.57-.1,0-.2,0-.3,0-.13,0-.26,0-.4,0,.03-.17.03-.34.04-.52.17,0,.33-.02.51-.03.14,0,.27-.01.41-.02Z"/>
              <path className="cls-552" d="M886.16,429.86c-.2.22-.38.46-.54.69-.13.19-.23.39-.33.58-.14,0-.27.01-.41.02-.18,0-.35.02-.51.03,0-.18.02-.36.04-.54.03-.23.05-.46.12-.68.3-.02.6-.04.91-.05.24-.01.48-.03.73-.04Z"/>
              <path className="cls-458" d="M887.68,428.6c-.26.22-.52.42-.79.62-.28.2-.52.41-.72.64-.25.01-.49.03-.73.04-.31.02-.61.03-.91.05.06-.22.14-.45.29-.65.01-.02.02-.04.03-.06.12-.2.2-.41.29-.62.46,0,.93-.01,1.41-.02.37,0,.75,0,1.13,0Z"/>
              <path className="cls-236" d="M888.85,427.56c-.13.13-.27.26-.41.39-.25.22-.5.44-.76.66-.38,0-.76,0-1.13,0-.48,0-.95,0-1.41.02.09-.23.17-.47.27-.7.06-.13.1-.25.16-.38.59,0,1.2,0,1.82,0,.48,0,.97,0,1.46.01Z"/>
              <path className="cls-134" d="M889.63,426.87c-.12.1-.24.19-.36.29-.15.13-.29.26-.42.4-.5,0-.99,0-1.46-.01-.62,0-1.23,0-1.82,0,.06-.13.12-.25.21-.38t0,0c.07-.1.18-.2.29-.29.66,0,1.34,0,2.01,0,.51,0,1.03,0,1.56,0Z"/>
              <path className="cls-496" d="M890.21,426.37c-.07.07-.16.14-.23.21-.11.1-.24.2-.35.3-.52,0-1.04,0-1.56,0-.67,0-1.34,0-2.01,0,.11-.1.24-.19.35-.3.07-.07.15-.14.21-.21.68,0,1.36,0,2.04,0,.52,0,1.04,0,1.55,0Z"/>
              <path className="cls-1" d="M890.64,425.93c-.07.08-.15.15-.21.22-.06.07-.14.14-.21.21-.51,0-1.03,0-1.55,0-.68,0-1.36,0-2.04,0,.06-.07.13-.14.16-.21.03-.07.1-.15.16-.22.71,0,1.42,0,2.12,0,.53,0,1.06,0,1.58,0Z"/>
              <path className="cls-368" d="M891.12,425.43c-.08.09-.18.18-.25.27-.07.08-.15.15-.23.23-.52,0-1.05,0-1.58,0-.69,0-1.4,0-2.12,0,.06-.08.15-.15.21-.23.08-.09.18-.18.27-.26.73,0,1.44,0,2.13,0,.53,0,1.05,0,1.55,0Z"/>
              <path className="cls-595" d="M891.42,425.07s-.04.06-.06.09c-.07.1-.15.19-.24.28-.5,0-1.02,0-1.55,0-.69,0-1.41,0-2.13,0,.09-.09.18-.18.24-.27.02-.03.03-.06.05-.09.74,0,1.46,0,2.16,0,.53,0,1.05,0,1.55,0Z"/>
              <path className="cls-595" d="M891.63,424.7c-.05.1-.09.17-.15.27-.02.03-.04.06-.06.09-.5,0-1.01,0-1.55,0-.7,0-1.42,0-2.16,0,.01-.03.03-.06.04-.09.03-.1.05-.2.06-.29.76,0,1.5.01,2.22.02.55,0,1.09,0,1.6,0Z"/>
              <path className="cls-437" d="M891.86,424.21c-.03.07-.06.14-.1.21-.05.11-.09.19-.14.28-.52,0-1.05.01-1.6,0-.72,0-1.46,0-2.22-.02.01-.1.02-.2.03-.3,0-.08,0-.15.01-.22.79.02,1.56.04,2.32.05.58,0,1.14,0,1.69-.01Z"/>
              <path className="cls-23" d="M892.08,423.6c-.04.13-.07.28-.12.38-.03.08-.06.15-.09.22-.55.02-1.11.02-1.69.01-.75,0-1.53-.03-2.32-.05,0-.07,0-.15.01-.23.01-.11.02-.22.03-.35.82.01,1.62.02,2.41.02.6,0,1.2,0,1.78-.01Z"/>
              <path className="cls-23" d="M892.35,422.66c-.05.19-.08.36-.16.54-.05.12-.08.27-.12.4-.58.01-1.17.02-1.78.01-.79,0-1.59-.01-2.41-.02.01-.12.02-.24.06-.36.05-.18.05-.36.05-.54.83,0,1.66,0,2.49,0,.63,0,1.25-.01,1.87-.02Z"/>
              <path className="cls-140" d="M892.52,421.86c-.01.08-.03.15-.04.23-.05.2-.08.39-.13.57-.61.01-1.24.02-1.87.02-.82,0-1.65,0-2.49,0,0-.18-.01-.37,0-.57,0-.07,0-.14,0-.21.86,0,1.71,0,2.56-.02.65,0,1.3-.02,1.95-.03Z"/>
              <path className="cls-132" d="M892.6,421.34c-.02.09-.03.19-.04.29-.01.08-.02.16-.04.23-.65.02-1.3.03-1.95.03-.85,0-1.71.01-2.56.02,0-.07,0-.15,0-.22,0-.09,0-.18.01-.27.86-.02,1.72-.03,2.58-.05.66-.01,1.33-.02,1.99-.04Z"/>
              <path className="cls-375" d="M892.65,421.05c-.02.09-.03.19-.05.29-.66.01-1.33.03-1.99.04-.86.02-1.72.03-2.58.05,0-.09.02-.18.04-.27.86-.02,1.72-.04,2.59-.06.66-.01,1.33-.03,2-.04Z"/>
              <path className="cls-401" d="M888.31,431.14c-.1.19-.19.37-.27.56-.91,0-1.81,0-2.71,0-.1,0-.2,0-.31,0,.09-.18.17-.38.26-.57.14,0,.27-.01.42-.01.85,0,1.72.01,2.6.02Z"/>
              <path className="cls-114" d="M889.16,429.89c-.2.22-.37.45-.52.68-.12.19-.23.38-.33.56-.88,0-1.75-.02-2.6-.02-.15,0-.29,0-.42.01.1-.19.2-.39.33-.58.16-.24.34-.47.54-.69.25-.01.5-.02.76-.03.73.01,1.48.04,2.24.06Z"/>
              <path className="cls-447" d="M890.58,428.61c-.24.22-.49.43-.75.64-.25.2-.47.42-.67.64-.76-.02-1.52-.05-2.24-.06-.26,0-.51.02-.76.03.2-.23.44-.44.72-.64.27-.2.53-.41.79-.62.38,0,.78,0,1.18-.01.56.01,1.14.02,1.72.02Z"/>
              <path className="cls-378" d="M891.67,427.56c-.12.13-.25.26-.38.38-.23.23-.48.45-.72.67-.58,0-1.16,0-1.72-.02-.4,0-.79,0-1.18.01.26-.22.51-.44.76-.66.14-.12.27-.25.41-.39.5,0,1.01,0,1.51,0,.43,0,.87,0,1.31,0Z"/>
              <path className="cls-333" d="M892.3,426.86c-.08.1-.17.2-.26.31-.12.14-.25.27-.37.4-.44,0-.88,0-1.31,0-.51,0-1.02,0-1.51,0,.13-.13.27-.27.42-.4.11-.1.24-.19.36-.29.52,0,1.05,0,1.57,0,.37,0,.74,0,1.1-.02Z"/>
              <path className="cls-479" d="M892.73,426.33c-.05.07-.11.14-.17.21-.08.11-.18.21-.26.31-.37,0-.73.02-1.1.02-.53,0-1.05,0-1.57,0,.12-.1.24-.19.35-.3.07-.07.16-.14.23-.21.51,0,1.02,0,1.52,0,.34,0,.67-.02.99-.03Z"/>
              <path className="cls-331" d="M893.04,425.89c-.05.08-.1.15-.15.23-.05.07-.11.14-.16.22-.33.02-.66.03-.99.03-.5,0-1.01,0-1.52,0,.07-.07.15-.14.21-.21.06-.07.14-.15.21-.22.52,0,1.02,0,1.51,0,.31,0,.6-.02.89-.04Z"/>
              <path className="cls-600" d="M893.38,425.39c-.06.09-.12.18-.18.27-.05.08-.11.16-.16.23-.29.02-.59.04-.89.04-.49,0-.99,0-1.51,0,.07-.08.16-.15.23-.23.08-.09.17-.18.25-.27.5,0,.99,0,1.45,0,.28,0,.55-.02.81-.03Z"/>
              <path className="cls-588" d="M893.6,425.04s-.03.06-.05.08c-.05.09-.11.18-.17.27-.26.01-.53.03-.81.03-.47,0-.95,0-1.45,0,.08-.09.17-.18.24-.28.02-.03.04-.06.06-.09.5,0,.97,0,1.43-.01.26,0,.51,0,.75-.02Z"/>
              <path className="cls-607" d="M893.82,424.57c-.06.13-.11.25-.17.38-.02.03-.03.06-.05.08-.24,0-.5.01-.75.02-.45,0-.93,0-1.43.01.02-.03.04-.06.06-.09.06-.1.1-.18.15-.27.52,0,1.01-.02,1.49-.05.25-.01.48-.05.7-.08Z"/>
              <path className="cls-507" d="M894.11,423.95c-.04.08-.08.17-.12.26-.06.12-.12.24-.17.36-.22.04-.45.07-.7.08-.48.02-.97.04-1.49.05.05-.1.09-.18.14-.28.04-.08.07-.14.1-.21.55-.02,1.08-.05,1.59-.1.24-.02.45-.09.65-.15Z"/>
              <path className="cls-352" d="M894.42,423.36c-.06.11-.13.23-.19.35-.04.08-.08.16-.13.25-.2.07-.41.13-.65.15-.51.05-1.04.09-1.59.1.03-.07.06-.14.09-.22.05-.11.08-.26.12-.38.58-.01,1.14-.04,1.68-.07.24-.04.46-.11.66-.17Z"/>
              <path className="cls-104" d="M894.94,422.48c-.11.18-.21.36-.32.53-.07.11-.14.23-.2.34-.2.07-.42.13-.66.17-.54.04-1.11.06-1.68.07.04-.13.07-.28.12-.4.07-.18.11-.36.16-.54.61-.01,1.22-.03,1.81-.05.3-.04.54-.09.79-.14Z"/>
              <path className="cls-524" d="M895.4,421.71c-.04.07-.08.14-.12.21-.12.19-.22.38-.33.56-.24.05-.49.1-.79.14-.59.02-1.19.04-1.81.05.05-.19.07-.37.13-.57.02-.07.03-.15.04-.23.65-.02,1.29-.04,1.92-.07.35-.02.66-.05.96-.09Z"/>
              <path className="cls-519" d="M895.68,421.24c-.05.09-.1.17-.15.26-.04.07-.08.14-.13.21-.3.04-.61.07-.96.09-.63.03-1.27.05-1.92.07.01-.08.02-.16.04-.23.02-.09.02-.19.04-.29.66-.01,1.33-.03,1.98-.05.38-.01.74-.03,1.1-.05Z"/>
              <path className="cls-590" d="M895.84,420.98c-.05.09-.1.17-.16.26-.36.02-.72.04-1.1.05-.65.02-1.32.03-1.98.05.02-.09.03-.19.05-.29.67-.01,1.33-.03,2-.04.4,0,.79-.02,1.19-.03Z"/>
              <path className="cls-428" d="M893.46,431.18c-.02.17-.04.34-.06.51-.87,0-1.76,0-2.65,0-.9,0-1.8,0-2.71,0,.08-.18.17-.37.27-.56.88,0,1.75.02,2.6.02.85,0,1.71.01,2.55.03Z"/>
              <path className="cls-216" d="M893.67,430.01c-.05.21-.09.43-.13.65-.03.17-.05.35-.08.52-.84-.01-1.7-.02-2.55-.03-.85,0-1.73-.01-2.6-.02.1-.19.21-.38.33-.56.15-.23.33-.46.52-.68.76.02,1.52.05,2.26.06.74.02,1.49.04,2.24.06Z"/>
              <path className="cls-252" d="M894.05,428.66c-.07.24-.13.48-.2.72-.07.21-.13.42-.18.64-.74-.02-1.5-.05-2.24-.06-.74-.02-1.5-.04-2.26-.06.2-.22.42-.44.67-.64.25-.21.5-.42.75-.64.58,0,1.17.01,1.74.02.57.01,1.15.02,1.73.03Z"/>
              <path className="cls-276" d="M894.34,427.56c-.04.13-.07.26-.1.38-.07.24-.12.48-.19.72-.57,0-1.15-.01-1.73-.03-.57-.01-1.16-.02-1.74-.02.24-.22.49-.44.72-.67.13-.12.25-.25.38-.38.44,0,.89,0,1.33,0s.89,0,1.34,0Z"/>
              <path className="cls-285" d="M894.53,426.82c-.03.12-.06.24-.08.35-.04.13-.07.26-.11.39-.45,0-.9,0-1.34,0s-.88,0-1.33,0c.12-.13.25-.26.37-.4.08-.1.17-.2.26-.31.37,0,.73-.02,1.1-.02.37,0,.75-.01,1.12-.02Z"/>
              <path className="cls-590" d="M894.67,426.25c-.02.07-.03.15-.05.22-.03.11-.06.23-.09.35-.38,0-.75.01-1.12.02-.37,0-.74.01-1.1.02.08-.1.18-.21.26-.31.06-.07.11-.14.17-.21.33-.02.65-.04.97-.05.19,0,.38-.01.58-.02.13,0,.26,0,.39-.01Z"/>
              <path className="cls-480" d="M894.77,425.8c-.02.08-.04.15-.05.23-.02.07-.03.14-.05.22-.13,0-.26.01-.39.01-.19,0-.39.01-.58.02-.32.01-.64.03-.97.05.05-.07.11-.14.16-.22.05-.07.1-.15.15-.23.29-.02.57-.04.86-.05.17,0,.35-.01.52-.02.12,0,.23,0,.35-.01Z"/>
              <path className="cls-571" d="M894.9,425.32c-.02.08-.05.17-.07.25-.02.07-.04.15-.06.23-.12,0-.23.01-.35.01-.17,0-.35.01-.52.02-.29.01-.57.03-.86.05.05-.08.11-.15.16-.23.06-.09.12-.18.18-.27.26-.01.52-.03.76-.04.25,0,.51-.02.76-.03Z"/>
              <path className="cls-532" d="M894.98,425s0,.05,0,.08c-.02.08-.04.16-.07.25-.25.01-.51.02-.76.03-.24,0-.5.02-.76.04.06-.09.12-.18.17-.27.02-.03.03-.06.05-.08.24,0,.48-.01.7-.02.13,0,.27,0,.4-.01.09,0,.18,0,.28,0Z"/>
              <path className="cls-183" d="M895.09,424.39c-.03.17-.07.35-.1.53,0,.03,0,.05,0,.08-.1,0-.19,0-.28,0-.13,0-.26,0-.4.01-.22,0-.46.01-.7.02.02-.03.03-.06.05-.08.05-.13.11-.25.17-.38.22-.04.43-.08.64-.1.13-.01.25-.03.37-.04.09-.01.17-.02.26-.03Z"/>
              <path className="cls-393" d="M895.32,423.61c-.03.09-.08.21-.11.31-.04.15-.09.31-.12.47-.09.01-.17.02-.26.03-.12.01-.24.03-.37.04-.21.02-.42.06-.64.1.06-.13.11-.24.17-.36.04-.09.08-.17.12-.26.2-.07.39-.14.59-.18.19-.04.41-.1.62-.16Z"/>
              <path className="cls-317" d="M895.65,422.98c-.08.11-.14.23-.2.35-.04.08-.09.18-.13.28-.21.06-.43.12-.62.16-.2.04-.39.11-.59.18.04-.08.08-.17.13-.25.06-.11.12-.24.19-.35.2-.07.4-.14.6-.19.12-.03.24-.07.38-.11.09-.02.17-.05.25-.08Z"/>
              <path className="cls-609" d="M896.44,422.18c-.19.16-.37.33-.53.48-.1.1-.18.2-.26.31-.08.03-.16.05-.25.08-.14.04-.26.08-.38.11-.2.05-.4.12-.6.19.06-.11.13-.23.2-.34.11-.17.21-.35.32-.53.24-.05.48-.1.74-.15.16-.03.3-.06.46-.09.1-.02.2-.04.29-.06Z"/>
              <path className="cls-203" d="M897.3,421.51c-.08.06-.17.11-.25.17-.21.17-.43.33-.62.5-.09.02-.19.04-.29.06-.16.03-.3.06-.46.09-.27.04-.5.1-.74.15.11-.18.22-.37.33-.56.04-.07.08-.14.12-.21.3-.04.6-.08.94-.1.32-.03.64-.06.96-.1Z"/>
              <path className="cls-110" d="M897.88,421.14c-.11.07-.21.13-.32.2-.09.06-.17.11-.26.17-.32.03-.64.07-.96.1-.34.02-.64.06-.94.1.04-.07.08-.14.13-.21.05-.08.1-.17.15-.26.36-.02.72-.04,1.09-.06.37-.02.73-.03,1.1-.05Z"/>
              <path className="cls-562" d="M898.2,420.94c-.11.07-.22.13-.33.2-.37.02-.73.04-1.1.05-.37.01-.73.04-1.09.06.05-.08.1-.17.16-.26.4,0,.79-.02,1.18-.03.39,0,.79-.02,1.18-.02Z"/>
              <path className="cls-288" d="M896.9,431.22c0,.17.02.33.03.49-.33,0-.66,0-.99,0-.83,0-1.68,0-2.55,0,.02-.17.04-.34.06-.51.84.01,1.67.02,2.45.03.34,0,.67,0,.99,0Z"/>
              <path className="cls-240" d="M896.84,430.09c.01.21.03.42.04.63,0,.17.02.34.03.5-.33,0-.66,0-.99,0-.78,0-1.61-.02-2.45-.03.02-.17.05-.35.08-.52.04-.22.08-.43.13-.65.74.02,1.48.05,2.16.07.34,0,.67,0,1.01,0Z"/>
              <path className="cls-462" d="M896.76,428.7c.01.25.03.5.04.75.01.21.03.42.04.64-.33,0-.67,0-1.01,0-.69-.02-1.42-.04-2.16-.07.05-.21.11-.43.18-.64.07-.24.13-.48.2-.72.57,0,1.14.01,1.69.03.34,0,.68,0,1.02,0Z"/>
              <path className="cls-303" d="M896.73,427.56c0,.13,0,.26,0,.39,0,.25.01.5.03.75-.34,0-.68,0-1.02,0-.55-.01-1.12-.02-1.69-.03.07-.24.12-.48.19-.72.04-.13.07-.26.1-.38.45,0,.9,0,1.34,0,.35,0,.7,0,1.05,0Z"/>
              <path className="cls-285" d="M896.66,426.81c.03.12.06.24.07.37,0,.13,0,.25,0,.38-.35,0-.7,0-1.05,0-.44,0-.89,0-1.34,0,.04-.13.07-.26.11-.39.02-.12.05-.24.08-.35.38,0,.75-.01,1.13,0,.33,0,.66,0,1,0Z"/>
              <path className="cls-492" d="M896.55,426.22c.01.08.03.16.04.23,0,.12.04.24.07.36-.34,0-.67,0-1,0-.38,0-.75,0-1.13,0,.03-.12.06-.23.09-.35.02-.07.03-.15.05-.22.32-.01.64-.03.98-.03.29,0,.59,0,.9,0Z"/>
              <path className="cls-176" d="M896.48,425.76c.02.08.03.16.03.23,0,.08.02.15.03.23-.3,0-.6,0-.9,0-.34,0-.66.02-.98.03.02-.07.03-.14.05-.22.02-.08.03-.15.05-.23.29-.02.58-.04.88-.04.27,0,.54,0,.83,0Z"/>
              <path className="cls-571" d="M896.4,425.29c.02.08.04.16.04.24,0,.07.02.15.04.23-.28,0-.56,0-.83,0-.3,0-.59.02-.88.04.02-.08.04-.15.06-.23.02-.08.05-.17.07-.25.25-.01.51-.02.76-.03.23,0,.48,0,.73,0Z"/>
              <path className="cls-597" d="M896.36,424.98s0,.05,0,.07c0,.08.02.15.04.23-.25,0-.5,0-.73,0-.25,0-.51.02-.76.03.02-.08.05-.16.07-.25,0-.03,0-.05,0-.08.22,0,.46-.01.7-.01.21,0,.44,0,.68,0Z"/>
              <path className="cls-550" d="M896.44,424.3c-.03.19-.06.4-.08.61,0,.02,0,.05,0,.07-.24,0-.46,0-.68,0-.24,0-.48,0-.7.01,0-.03,0-.05,0-.08.03-.18.07-.37.1-.53.21-.03.43-.06.66-.08.22,0,.45-.01.69-.01Z"/>
              <path className="cls-203" d="M896.67,423.42c-.04.1-.08.22-.11.34-.05.17-.09.35-.13.55-.24,0-.47,0-.69.01-.23.02-.45.05-.66.08.03-.17.08-.33.12-.47.03-.11.08-.22.11-.31.21-.06.42-.12.59-.14.24-.02.5-.04.76-.05Z"/>
              <path className="cls-508" d="M897.04,422.8c-.1.1-.19.2-.25.34-.04.08-.08.18-.11.28-.26,0-.52.02-.76.05-.17.03-.38.08-.59.14.03-.09.09-.19.13-.28.06-.13.12-.24.2-.35.21-.07.41-.13.6-.17.25-.01.52-.01.79-.02Z"/>
              <path className="cls-411" d="M898.02,422.04c-.24.16-.47.33-.64.48-.12.1-.24.18-.34.28-.27,0-.53,0-.79.02-.19.03-.39.1-.6.17.08-.11.16-.21.26-.31.15-.16.34-.32.53-.48.24-.05.48-.1.75-.14.27,0,.55,0,.83,0Z"/>
              <path className="cls-464" d="M899.12,421.4c-.11.05-.21.1-.31.16-.27.15-.55.32-.79.48-.28,0-.56,0-.83,0-.28.04-.51.09-.75.14.19-.16.4-.33.62-.5.08-.06.16-.11.25-.17.32-.03.64-.06.96-.08.28-.01.57-.03.86-.04Z"/>
              <path className="cls-190" d="M899.85,421.07c-.13.06-.27.12-.4.18-.11.05-.22.1-.33.15-.29,0-.57.02-.86.04-.32.02-.64.04-.96.08.08-.06.17-.11.26-.17.1-.07.21-.14.32-.2.37-.02.73-.03,1.1-.04.29,0,.58-.02.88-.02Z"/>
              <path className="cls-365" d="M900.25,420.89c-.13.06-.27.12-.4.18-.29,0-.59.01-.88.02-.36.01-.73.03-1.1.04.11-.07.22-.13.33-.2.39,0,.78-.02,1.17-.02.29,0,.59-.01.88-.02Z"/>
              <path className="cls-326" d="M900.99,431.25c0,.17,0,.33.01.5-1.03-.02-2.07-.03-3.1-.04-.31,0-.64,0-.96,0-.01-.16-.02-.33-.03-.49.33,0,.65,0,.97,0,1.05,0,2.08.02,3.12.03Z"/>
              <path className="cls-604" d="M901.05,430.12c-.01.21-.03.42-.04.63-.01.17-.02.34-.02.5-1.03-.01-2.07-.02-3.12-.03-.32,0-.64,0-.97,0,0-.17-.02-.33-.03-.5-.01-.21-.03-.42-.04-.63.33,0,.66,0,.99,0,1.07,0,2.15.02,3.23.03Z"/>
              <path className="cls-594" d="M901.11,428.73c-.02.25-.04.5-.04.75,0,.21,0,.42-.01.64-1.08-.01-2.15-.02-3.23-.03-.33,0-.66,0-.99,0-.01-.21-.03-.42-.04-.64-.01-.25-.03-.5-.04-.75.34,0,.67,0,1.01,0,1.12,0,2.23.02,3.34.03Z"/>
              <path className="cls-240" d="M901.26,427.59c-.01.13-.05.26-.06.39-.03.25-.06.49-.09.75-1.11-.01-2.22-.02-3.34-.03-.34,0-.67,0-1.01,0-.01-.25-.02-.5-.03-.75,0-.13,0-.26,0-.39.35,0,.7,0,1.05,0,1.16,0,2.33.01,3.48.02Z"/>
              <path className="cls-285" d="M901.12,426.84c.07.12.18.24.18.36,0,.13-.03.26-.04.39-1.16,0-2.32-.02-3.48-.02-.35,0-.7,0-1.05,0,0-.13,0-.26,0-.38,0-.12-.04-.25-.07-.37.34,0,.68,0,1.01,0,1.13,0,2.29.01,3.45.03Z"/>
              <path className="cls-489" d="M900.72,426.25c.04.08.11.16.14.23.06.12.19.24.26.36-1.17-.01-2.33-.02-3.45-.03-.34,0-.68,0-1.01,0-.03-.12-.07-.24-.07-.36,0-.08-.02-.16-.04-.23.3,0,.61,0,.93,0,1.05,0,2.13.01,3.25.03Z"/>
              <path className="cls-400" d="M900.54,425.79c.04.08.09.16.09.23,0,.07.05.15.09.23-1.11-.01-2.2-.02-3.25-.03-.31,0-.62,0-.93,0-.01-.08-.03-.15-.03-.23,0-.08-.02-.16-.03-.23.28,0,.58,0,.87,0,.99,0,2.06.02,3.18.03Z"/>
              <path className="cls-257" d="M900.19,425.31c.06.08.16.16.2.25.04.07.11.15.15.23-1.12-.02-2.2-.03-3.18-.03-.3,0-.59,0-.87,0-.02-.08-.04-.16-.04-.23,0-.08-.03-.16-.04-.24.25,0,.52,0,.79,0,.91,0,1.93.01,3,.03Z"/>
              <path className="cls-177" d="M900.01,425s.01.05.02.07c.02.08.11.16.16.24-1.08-.01-2.09-.03-3-.03-.27,0-.54,0-.79,0-.02-.08-.04-.15-.04-.23,0-.02,0-.05,0-.07.24,0,.49,0,.75,0,.87,0,1.85,0,2.91.02Z"/>
              <path className="cls-222" d="M900.13,424.36c-.05.18-.12.37-.13.56,0,.02,0,.05,0,.07-1.06,0-2.04-.01-2.91-.02-.26,0-.51,0-.75,0,0-.02,0-.05,0-.07.01-.21.04-.42.08-.61.24,0,.49,0,.76,0,.89,0,1.88.03,2.94.06Z"/>
              <path className="cls-428" d="M900.51,423.52c-.05.1-.11.21-.16.33-.07.16-.16.34-.22.51-1.06-.03-2.05-.06-2.94-.06-.27,0-.52,0-.76,0,.03-.19.08-.38.13-.55.03-.12.07-.23.11-.34.26,0,.54-.01.82-.01.93,0,1.94.05,3.02.12Z"/>
              <path className="cls-478" d="M900.89,422.88c-.09.11-.19.21-.23.35-.04.09-.1.18-.14.29-1.07-.06-2.09-.12-3.02-.12-.28,0-.55,0-.82.01.04-.1.08-.2.11-.28.06-.14.15-.24.25-.34.27,0,.55,0,.83,0,.95,0,1.96.04,3.02.08Z"/>
              <path className="cls-155" d="M901.85,422.07c-.23.18-.49.35-.62.52-.12.1-.25.19-.34.29-1.06-.04-2.07-.08-3.02-.08-.28,0-.56,0-.83,0,.1-.1.22-.18.34-.28.17-.15.4-.31.64-.48.28,0,.57,0,.85,0,.96,0,1.96.02,2.97.03Z"/>
              <path className="cls-500" d="M902.96,421.38c-.1.06-.21.11-.3.17-.26.16-.58.34-.81.52-1.01-.02-2.01-.03-2.97-.03-.29,0-.57,0-.85,0,.24-.16.52-.33.79-.48.1-.05.2-.11.31-.16.29,0,.58-.02.87-.02.97-.01,1.97,0,2.97,0Z"/>
              <path className="cls-258" d="M903.63,421.02c-.11.07-.24.13-.36.2-.1.06-.21.11-.31.17-1-.01-2-.02-2.97,0-.29,0-.58.01-.87.02.11-.05.22-.1.33-.15.13-.06.27-.12.4-.18.29,0,.59-.01.88-.02.97-.02,1.94-.03,2.9-.04Z"/>
              <path className="cls-394" d="M903.96,420.82c-.1.07-.22.13-.33.2-.96,0-1.93.02-2.9.04-.29,0-.59.01-.88.02.13-.06.27-.12.4-.18.29,0,.58-.01.87-.02.96-.02,1.91-.04,2.84-.06Z"/>
              <path className="cls-542" d="M908.52,431.44c0,.17-.03.35-.02.52-1.49-.05-2.98-.1-4.39-.14-1.03-.03-2.07-.05-3.1-.07-.01-.17-.02-.33-.01-.5,1.03.01,2.07.03,3.12.06,1.43.04,2.92.08,4.42.12Z"/>
              <path className="cls-420" d="M908.66,430.26c-.02.22-.07.43-.09.65-.01.17-.05.35-.06.52-1.49-.05-2.99-.09-4.42-.12-1.05-.03-2.08-.05-3.12-.06,0-.17.01-.33.02-.5.01-.21.03-.42.04-.63,1.08.01,2.15.03,3.23.05,1.45.03,2.92.06,4.38.1Z"/>
              <path className="cls-216" d="M908.81,428.84c-.03.26-.09.51-.09.77,0,.22-.04.44-.06.65-1.46-.04-2.93-.07-4.38-.1-1.07-.02-2.15-.04-3.23-.05.01-.21.02-.42.01-.64,0-.25.02-.5.04-.75,1.11.01,2.22.02,3.34.04,1.47.02,2.94.05,4.36.07Z"/>
              <path className="cls-307" d="M909,427.67c-.01.13-.04.27-.05.4-.03.26-.1.51-.13.77-1.43-.03-2.9-.05-4.36-.07-1.12-.01-2.23-.03-3.34-.04.02-.25.06-.5.09-.75.01-.13.05-.26.06-.39,1.16,0,2.31.02,3.45.03,1.47.01,2.91.03,4.29.05Z"/>
              <path className="cls-276" d="M908.93,426.93c.04.11.1.23.11.34,0,.13-.03.27-.04.4-1.38-.02-2.81-.03-4.29-.05-1.14-.01-2.29-.02-3.45-.03.01-.13.04-.26.04-.39,0-.12-.11-.24-.18-.36,1.17.01,2.34.02,3.48.03,1.49.01,2.93.03,4.32.05Z"/>
              <path className="cls-434" d="M908.65,426.36c.02.07.07.15.1.22.05.11.13.23.18.34-1.39-.02-2.84-.03-4.32-.05-1.14-.01-2.31-.02-3.48-.03-.07-.12-.2-.24-.26-.36-.04-.08-.11-.16-.14-.23,1.11.01,2.26.03,3.41.04,1.51.02,3.03.05,4.52.07Z"/>
              <path className="cls-542" d="M908.54,425.92c.02.07.06.15.06.22,0,.07.03.15.05.22-1.48-.02-3.01-.05-4.52-.07-1.16-.02-2.3-.03-3.41-.04-.04-.08-.09-.15-.09-.23,0-.08-.06-.16-.09-.23,1.12.02,2.28.04,3.45.05,1.52.02,3.05.05,4.55.08Z"/>
              <path className="cls-271" d="M908.3,425.44c.04.08.1.17.14.25.03.07.08.15.11.23-1.5-.03-3.03-.05-4.55-.08-1.17-.02-2.33-.04-3.45-.05-.04-.08-.11-.16-.15-.23-.04-.08-.14-.16-.2-.25,1.08.01,2.22.03,3.4.05,1.53.02,3.13.05,4.71.08Z"/>
              <path className="cls-493" d="M908.18,425.11s0,.05.01.08c.02.08.07.17.11.25-1.58-.03-3.17-.06-4.71-.08-1.18-.02-2.32-.04-3.4-.05-.06-.08-.14-.16-.16-.24,0-.02-.02-.05-.02-.07,1.06,0,2.2.02,3.39.04,1.54.02,3.16.05,4.78.07Z"/>
              <path className="cls-493" d="M908.24,424.57c-.03.15-.06.31-.07.47,0,.02,0,.05,0,.08-1.61-.03-3.23-.05-4.78-.07-1.19-.02-2.33-.03-3.39-.04,0-.02-.01-.05,0-.07,0-.19.08-.38.13-.56,1.06.03,2.19.07,3.37.09,1.53.03,3.14.07,4.74.12Z"/>
              <path className="cls-605" d="M908.45,423.82c-.03.1-.06.2-.09.3-.04.14-.09.29-.12.44-1.6-.05-3.22-.09-4.74-.12-1.17-.02-2.31-.06-3.37-.09.05-.18.15-.35.22-.51.05-.11.12-.23.16-.33,1.07.06,2.21.13,3.36.16,1.5.03,3.05.09,4.58.14Z"/>
              <path className="cls-569" d="M908.62,423.13c-.04.13-.08.26-.1.4-.02.1-.05.19-.07.29-1.53-.06-3.09-.11-4.58-.14-1.15-.03-2.28-.09-3.36-.16.05-.1.11-.2.14-.29.05-.14.14-.25.23-.35,1.06.04,2.16.08,3.28.11,1.46.03,2.97.08,4.45.13Z"/>
              <path className="cls-535" d="M909.03,422.18c-.1.19-.21.38-.25.58-.06.12-.12.24-.16.37-1.48-.05-2.99-.1-4.45-.13-1.12-.03-2.22-.07-3.28-.11.09-.11.22-.19.34-.29.13-.16.39-.34.62-.52,1.01.02,2.05.03,3.08.05,1.35.01,2.74.04,4.1.06Z"/>
              <path className="cls-535" d="M909.55,421.4c-.04.07-.1.14-.14.21-.12.19-.27.38-.38.57-1.36-.02-2.76-.04-4.1-.06-1.04-.01-2.07-.03-3.08-.05.23-.18.55-.35.81-.52.09-.06.2-.11.3-.17,1,.01,1.99.02,2.94.02,1.24,0,2.47,0,3.65,0Z"/>
              <path className="cls-535" d="M909.84,420.94c-.04.08-.1.16-.15.25-.04.07-.09.14-.14.21-1.18,0-2.41,0-3.65,0-.95,0-1.94,0-2.94-.02.1-.06.21-.11.31-.17.12-.07.25-.13.36-.2.96,0,1.9-.02,2.81-.03,1.18-.02,2.31-.03,3.4-.04Z"/>
              <path className="cls-134" d="M909.96,420.7c-.03.08-.08.16-.13.25-1.08.01-2.22.03-3.4.04-.91.01-1.85.02-2.81.03.11-.07.23-.13.33-.2.93-.02,1.83-.04,2.71-.05,1.14-.02,2.24-.04,3.29-.06Z"/>
              <path className="cls-395" d="M914.96,431.67c0,.18-.02.36-.02.55-.66-.03-1.34-.06-2.03-.09-1.43-.06-2.93-.12-4.42-.17,0-.17.01-.35.02-.52,1.49.05,2.98.1,4.39.15.71.03,1.39.05,2.05.08Z"/>
              <path className="cls-223" d="M915.05,430.44c0,.23-.03.45-.05.68,0,.18-.03.36-.03.55-.66-.03-1.34-.05-2.05-.08-1.41-.05-2.9-.11-4.39-.15,0-.17.04-.35.06-.52.02-.22.07-.43.09-.65,1.46.04,2.89.08,4.25.12.73.02,1.45.04,2.13.06Z"/>
              <path className="cls-602" d="M915.11,428.97c-.01.27-.04.53-.04.8,0,.23-.02.45-.03.68-.68-.02-1.4-.04-2.13-.06-1.36-.04-2.8-.08-4.25-.12.02-.22.06-.43.06-.65,0-.26.06-.51.09-.77,1.43.03,2.81.06,4.1.08.77.01,1.51.03,2.2.04Z"/>
              <path className="cls-388" d="M915.19,427.75c0,.14-.02.28-.02.42-.01.27-.04.53-.06.8-.69-.01-1.43-.03-2.2-.04-1.29-.03-2.67-.06-4.1-.08.03-.26.1-.51.13-.77.02-.14.04-.27.05-.4,1.38.02,2.69.03,3.92.05.8,0,1.56.02,2.28.03Z"/>
              <path className="cls-169" d="M915.18,427c0,.11.02.22.02.32,0,.14,0,.28-.01.42-.71,0-1.48-.02-2.28-.03-1.23-.02-2.54-.03-3.92-.05.01-.13.03-.27.04-.4,0-.11-.06-.23-.11-.34,1.39.02,2.73.03,3.98.05.79,0,1.55.02,2.27.03Z"/>
              <path className="cls-186" d="M915.12,426.46c0,.07.01.14.02.22,0,.11.03.22.04.32-.71,0-1.47-.02-2.27-.03-1.26-.01-2.59-.03-3.98-.05-.04-.11-.13-.23-.18-.34-.03-.07-.08-.15-.1-.22,1.48.02,2.93.05,4.26.07.77.01,1.51.02,2.21.03Z"/>
              <path className="cls-293" d="M915.1,426.03c0,.07.01.15.01.22s0,.14.01.22c-.7-.01-1.44-.02-2.21-.03-1.34-.02-2.78-.04-4.26-.07-.02-.07-.05-.15-.05-.22,0-.07-.03-.15-.06-.22,1.5.03,2.97.05,4.37.08.76.01,1.49.02,2.19.03Z"/>
              <path className="cls-224" d="M915.05,425.56c0,.08.02.16.03.25,0,.07.02.15.02.22-.7-.01-1.43-.02-2.19-.03-1.4-.02-2.87-.05-4.37-.08-.02-.07-.07-.15-.11-.23-.04-.08-.1-.17-.14-.25,1.58.03,3.14.06,4.61.09.74.01,1.45.03,2.13.04Z"/>
              <path className="cls-94" d="M915.02,425.24s0,.05,0,.08c0,.08.02.16.02.25-.68-.01-1.4-.03-2.13-.04-1.47-.03-3.03-.06-4.61-.09-.04-.08-.09-.17-.11-.25,0-.03-.01-.05-.01-.08,1.61.03,3.22.06,4.74.09.73.01,1.43.03,2.11.04Z"/>
              <path className="cls-94" d="M915.07,424.74c-.02.14-.06.29-.06.43,0,.03,0,.05,0,.08-.68-.01-1.38-.03-2.11-.04-1.52-.03-3.12-.06-4.74-.09,0-.03,0-.05,0-.08,0-.16.04-.31.07-.47,1.6.05,3.19.1,4.67.13.76.01,1.48.02,2.16.03Z"/>
              <path className="cls-288" d="M915.24,424c-.02.1-.06.2-.08.31-.03.14-.08.29-.09.43-.68-.01-1.4-.02-2.16-.03-1.48-.04-3.07-.09-4.67-.13.03-.15.08-.3.12-.44.03-.1.06-.21.09-.3,1.53.06,3.05.12,4.47.16.83,0,1.61.01,2.33.02Z"/>
              <path className="cls-375" d="M915.4,423.29c-.02.14-.06.27-.08.41-.02.1-.05.2-.07.31-.72,0-1.5-.01-2.33-.02-1.42-.05-2.93-.11-4.47-.16.03-.1.06-.2.07-.29.02-.14.06-.27.1-.4,1.48.05,2.94.11,4.29.16.88,0,1.72,0,2.49,0Z"/>
              <path className="cls-455" d="M915.54,422.24c-.03.21-.09.43-.09.64,0,.14-.03.27-.04.41-.77,0-1.61,0-2.49,0-1.35-.05-2.81-.11-4.29-.16.04-.13.1-.25.16-.37.04-.19.15-.38.25-.58,1.36.02,2.68.05,3.88.08.96,0,1.83-.01,2.63-.02Z"/>
              <path className="cls-566" d="M915.75,421.36c-.01.08-.04.15-.05.23-.04.21-.12.43-.16.64-.79,0-1.67.01-2.63.02-1.2-.03-2.52-.06-3.88-.08.1-.19.25-.38.38-.57.04-.07.1-.14.14-.21,1.18,0,2.32,0,3.36,0,1.03-.01,1.98-.03,2.83-.04Z"/>
              <path className="cls-566" d="M915.84,420.86c0,.09-.03.18-.05.27-.01.08-.03.15-.05.23-.85.01-1.81.02-2.83.04-1.05,0-2.18,0-3.36,0,.04-.07.09-.14.14-.21.05-.08.11-.16.15-.25,1.08-.01,2.11-.02,3.08-.03,1.07-.02,2.05-.04,2.93-.05Z"/>
              <path className="cls-455" d="M915.87,420.59c0,.09-.02.18-.03.27-.88.01-1.86.03-2.93.05-.97,0-1.99.02-3.08.03.04-.08.09-.16.13-.25,1.04-.02,2.03-.04,2.95-.06,1.09-.02,2.08-.04,2.96-.06Z"/>
              <path className="cls-242" d="M918.59,431.82c0,.19-.02.37-.02.56-.54-.03-1.12-.05-1.73-.08-.61-.03-1.24-.06-1.9-.08,0-.18.01-.36.02-.55.66.03,1.3.05,1.9.08.61.03,1.19.05,1.73.07Z"/>
              <path className="cls-516" d="M918.68,430.56c0,.23-.04.46-.05.69,0,.19-.03.37-.04.56-.54-.02-1.12-.05-1.73-.07-.61-.03-1.24-.05-1.9-.08,0-.18.03-.36.03-.55.01-.23.04-.45.05-.68.68.02,1.33.04,1.94.06.61.02,1.17.04,1.69.06Z"/>
              <path className="cls-517" d="M918.75,429.05c-.01.27-.04.55-.04.82,0,.23-.02.46-.03.69-.52-.02-1.08-.04-1.69-.06-.61-.02-1.26-.04-1.94-.06,0-.23.03-.45.03-.68,0-.27.02-.53.04-.8.69.01,1.34.03,1.95.04.61.01,1.17.03,1.68.04Z"/>
              <path className="cls-307" d="M918.83,427.8c0,.14-.02.29-.02.43-.01.27-.05.55-.06.82-.51-.01-1.07-.03-1.68-.04-.61-.01-1.26-.03-1.95-.04.01-.27.04-.53.06-.8,0-.14.02-.28.02-.42.71,0,1.38.02,1.99.03.61,0,1.16.02,1.64.02Z"/>
              <path className="cls-169" d="M918.82,427.05c0,.11.02.21.02.32,0,.14,0,.29-.01.43-.49,0-1.04-.02-1.64-.02-.61,0-1.28-.02-1.99-.03,0-.14.01-.28.01-.42,0-.11-.02-.22-.02-.32.71,0,1.38.02,1.99.02.61,0,1.16.01,1.65.02Z"/>
              <path className="cls-566" d="M918.76,426.51c0,.07.01.14.02.21,0,.11.03.21.04.32-.49,0-1.04-.01-1.65-.02-.61,0-1.28-.02-1.99-.02,0-.11-.03-.22-.04-.32,0-.07-.02-.14-.02-.22.7,0,1.35.02,1.96.03.61,0,1.17.02,1.67.03Z"/>
              <path className="cls-221" d="M918.74,426.09c0,.07.01.14.01.21s0,.14.01.21c-.5,0-1.07-.02-1.67-.03-.61,0-1.27-.02-1.96-.03,0-.07-.01-.14-.01-.22s0-.15-.01-.22c.7.01,1.35.02,1.96.03s1.17.02,1.68.03Z"/>
              <path className="cls-162" d="M918.69,425.63c0,.08.02.16.03.24,0,.07.02.14.02.21-.51,0-1.07-.02-1.68-.03s-1.27-.02-1.96-.03c0-.07-.02-.15-.02-.22,0-.08-.02-.16-.03-.25.68.01,1.33.02,1.94.04.61.01,1.18.02,1.7.03Z"/>
              <path className="cls-363" d="M918.66,425.32s0,.05,0,.07c0,.08.02.16.02.24-.52-.01-1.09-.02-1.7-.03-.61-.01-1.26-.02-1.94-.04,0-.08-.02-.16-.02-.25,0-.03,0-.05,0-.08.68.01,1.32.03,1.93.04.61.01,1.18.02,1.71.04Z"/>
              <path className="cls-507" d="M918.72,424.8c-.02.15-.06.29-.06.44,0,.02,0,.05,0,.07-.53-.01-1.1-.02-1.71-.04-.61-.01-1.26-.03-1.93-.04,0-.03,0-.05,0-.08,0-.14.04-.28.06-.43.68.01,1.32.02,1.93.03.61.01,1.19.02,1.72.03Z"/>
              <path className="cls-288" d="M918.9,424.04c-.02.11-.06.21-.08.32-.03.15-.09.3-.1.44-.52,0-1.1-.02-1.72-.03-.61-.01-1.25-.02-1.93-.03.02-.14.07-.29.09-.43.02-.1.06-.2.08-.31.72,0,1.39.01,2.01.02.61,0,1.17.01,1.65.02Z"/>
              <path className="cls-207" d="M919.07,423.3c-.02.14-.06.28-.09.42-.02.11-.06.21-.08.32-.48,0-1.04-.01-1.65-.02-.61,0-1.28-.01-2.01-.02.02-.1.06-.2.07-.31.02-.14.07-.27.08-.41.77,0,1.48,0,2.09,0,.62,0,1.14,0,1.58.01Z"/>
              <path className="cls-350" d="M919.22,422.22c-.03.22-.1.44-.1.66,0,.14-.03.28-.05.42-.43,0-.96,0-1.58-.01-.62,0-1.32,0-2.09,0,.02-.14.04-.27.04-.41,0-.21.06-.43.09-.64.79,0,1.5,0,2.12-.01s1.15,0,1.57,0Z"/>
              <path className="cls-566" d="M919.45,421.32c-.01.08-.04.16-.06.24-.04.22-.13.44-.17.66-.42,0-.95,0-1.57,0s-1.32,0-2.12.01c.03-.21.12-.43.16-.64.01-.08.04-.15.05-.23.85-.01,1.6-.02,2.22-.03.62,0,1.12-.01,1.47-.01Z"/>
              <path className="cls-566" d="M919.55,420.8c0,.09-.04.19-.05.28-.01.08-.04.16-.05.24-.36,0-.85,0-1.47.01-.62,0-1.37.02-2.22.03.01-.08.04-.15.05-.23.01-.09.04-.18.05-.27.88-.01,1.64-.03,2.27-.04.62-.01,1.11-.02,1.44-.02Z"/>
              <path className="cls-455" d="M919.58,420.52c0,.09-.02.19-.03.28-.33,0-.81.01-1.44.02-.62,0-1.39.02-2.27.04,0-.09.03-.18.03-.27.88-.02,1.64-.03,2.26-.04.62-.01,1.11-.02,1.45-.03Z"/>
              <path className="cls-491" d="M920.09,431.88v.57c-.46-.02-.97-.05-1.51-.07,0-.19.01-.37.02-.56.54.02,1.04.04,1.49.06Z"/>
              <path className="cls-350" d="M920.09,430.61v1.27c-.45-.02-.95-.04-1.49-.06,0-.19.03-.37.04-.56.01-.23.04-.46.05-.69.52.02.99.03,1.41.05Z"/>
              <path className="cls-517" d="M920.09,429.08v1.53c-.42-.02-.89-.03-1.41-.05,0-.23.03-.46.03-.69,0-.27.03-.55.04-.82.51.01.96.02,1.34.03Z"/>
              <path className="cls-307" d="M920.09,427.82v1.27c-.38,0-.83-.02-1.34-.03.01-.27.04-.55.06-.82,0-.14.02-.29.02-.43.49,0,.91.01,1.26.02Z"/>
              <path className="cls-169" d="M920.09,427.06v.75c-.35,0-.77-.01-1.26-.02,0-.14.01-.29.01-.43,0-.11-.02-.21-.02-.32.49,0,.91.01,1.27.02Z"/>
              <path className="cls-566" d="M920.09,426.54v.53c-.36,0-.78-.01-1.27-.02,0-.11-.03-.21-.04-.32,0-.07-.02-.14-.02-.21.5,0,.95.01,1.33.02Z"/>
              <path className="cls-278" d="M920.09,426.11v.42c-.38,0-.82-.01-1.33-.02,0-.07-.01-.14-.01-.21s0-.14-.01-.21c.51,0,.96.02,1.35.02Z"/>
              <path className="cls-566" d="M920.09,425.66v.45c-.39,0-.84-.02-1.35-.02,0-.07-.02-.14-.02-.21,0-.08-.02-.16-.03-.24.52.01.99.02,1.4.03Z"/>
              <path className="cls-578" d="M920.09,425.35v.31c-.41,0-.88-.02-1.4-.03,0-.08-.02-.16-.02-.24,0-.02,0-.05,0-.07.53.01,1,.02,1.43.03Z"/>
              <path className="cls-622" d="M920.09,424.83v.52c-.42,0-.9-.02-1.43-.03,0-.02,0-.05,0-.07,0-.15.05-.29.06-.44.52,0,.99.02,1.36.03Z"/>
              <path className="cls-288" d="M920.09,424.06v.76c-.38,0-.84-.02-1.36-.03.02-.15.08-.3.1-.44.02-.11.06-.21.08-.32.48,0,.88.01,1.18.02Z"/>
              <path className="cls-455" d="M920.09,423.32v.75c-.3,0-.7-.01-1.18-.02.02-.11.06-.21.08-.32.02-.14.07-.28.09-.42.43,0,.77.01,1.02.02Z"/>
              <path className="cls-566" d="M920.09,422.23v1.09c-.24,0-.58-.01-1.02-.02.02-.14.05-.28.05-.42,0-.22.07-.44.1-.66.42,0,.71,0,.86,0Z"/>
              <path className="cls-566" d="M920.09,421.32v.91c-.15,0-.45,0-.86,0,.03-.22.13-.44.17-.66.01-.08.04-.16.06-.24.36,0,.57,0,.64,0Z"/>
              <path className="cls-162" d="M920.09,420.79v.53c-.07,0-.29,0-.64,0,.01-.08.04-.16.05-.24.01-.09.04-.19.05-.28.33,0,.51,0,.54,0Z"/>
              <path className="cls-207" d="M920.09,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
            </g>
            <g>
              <path className="cls-158" d="M920.09,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
            </g>
            <g>
              <path className="cls-158" d="M920.09,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
            </g>
          </g>
          <g id="MeshGrid-2" data-name="MeshGrid">
            <g>
              <path className="cls-591" d="M919.24,964.11c.03.35.16.69.18,1.01.43-.02.67-.03.67-.03v-1.12c-.11,0-.4.07-.85.14Z"/>
              <path className="cls-548" d="M918.91,962.2c.02.28.11.56.14.83.03.37.16.72.19,1.07.45-.07.74-.14.85-.14v-1.96c-.29,0-.68.1-1.18.19Z"/>
              <path className="cls-231" d="M918.67,960.68c.02.23.08.45.1.67.02.29.12.58.14.86.49-.09.88-.18,1.18-.19v-1.47c-.41,0-.88.07-1.41.13Z"/>
              <path className="cls-325" d="M918.51,959.52c.01.16.05.32.07.48.02.23.08.45.1.68.54-.06,1-.12,1.41-.13v-1.07c-.48,0-1.01.03-1.58.04Z"/>
              <path className="cls-490" d="M918.38,958.18c.02.28.04.57.06.85.01.16.05.32.07.48.57-.02,1.09-.04,1.58-.04v-1.33c-.51,0-1.09.03-1.7.04Z"/>
              <path className="cls-511" d="M918.19,955.12c.05.74.08,1.48.13,2.22.02.28.04.57.06.85.61-.01,1.19-.03,1.7-.04v-3.2c-.54.01-1.19.1-1.89.17Z"/>
              <path className="cls-29" d="M917.91,949.26c.05,1.21.1,2.43.16,3.65.04.74.07,1.48.12,2.21.7-.08,1.36-.16,1.89-.17v-6.13c-.6.03-1.37.24-2.18.44Z"/>
              <path className="cls-473" d="M917.68,941.17c.03,1.48.05,2.96.11,4.44.04,1.21.07,2.43.12,3.65.81-.2,1.57-.41,2.18-.44v-8.46c-.7.05-1.52.44-2.41.82Z"/>
              <path className="cls-516" d="M917.62,935.21c0,.5,0,1,0,1.5.01,1.49.02,2.97.05,4.45.89-.38,1.71-.76,2.41-.82v-6.21c-.75.07-1.57.57-2.46,1.07Z"/>
              <path className="cls-516" d="M917.63,931.48c0,.77,0,1.51,0,2.22,0,.5,0,1,0,1.5.89-.5,1.72-1,2.46-1.07v-3.42c-.75.07-1.57.42-2.46.76Z"/>
              <path className="cls-566" d="M917.63,927.42v1.65c0,.83,0,1.63,0,2.41.89-.35,1.71-.69,2.46-.76v-3.94c-.74.07-1.56.36-2.45.64Z"/>
              <path className="cls-569" d="M917.63,686.43c0,100.35,0,204.24,0,239.31v1.68c.89-.28,1.71-.57,2.45-.64v-235.14c-.73,1.01-1.55-2.11-2.45-5.22Z"/>
              <path className="cls-217" d="M917.64,448.01c0,2.27,0,4.59,0,7.03,0,6.34,0,14.48,0,25.11,0,34.33,0,119,0,206.29.9,3.11,1.72,6.23,2.45,5.22v-240.53c-.72-.03-1.55-1.58-2.45-3.11Z"/>
              <path className="cls-445" d="M917.64,437.32c0,1.35,0,2.73,0,4.16,0,2.11,0,4.26,0,6.53.9,1.53,1.73,3.08,2.45,3.11v-12.38c-.72-.03-1.55-.73-2.45-1.42Z"/>
              <path className="cls-554" d="M917.64,432.86v.54c0,1.27,0,2.56,0,3.92.9.69,1.73,1.39,2.45,1.42v-5.6c-.72-.03-1.55-.15-2.45-.27Z"/>
              <path className="cls-491" d="M917.64,432.33v.53c.9.12,1.73.24,2.45.27v-.69c-.72-.03-1.55-.07-2.45-.11Z"/>
              <path className="cls-168" d="M916.54,964.21c.08.32.15.63.22.91.28,0,.55.02.8.02.8.01,1.43,0,1.86-.01-.02-.33-.16-.67-.18-1.01-.45.07-1.07.13-1.84.11-.28,0-.56,0-.86-.01Z"/>
              <path className="cls-531" d="M916.1,962.34c.07.29.13.57.2.84.08.36.17.71.24,1.03.3,0,.58,0,.86.01.77.02,1.38-.05,1.84-.11-.03-.35-.16-.71-.19-1.07-.02-.27-.11-.55-.14-.83-.5.09-1.1.17-1.82.15-.34,0-.66-.02-.99-.02Z"/>
              <path className="cls-211" d="M915.73,960.73c.06.24.11.48.17.71.07.31.14.61.21.9.33,0,.65.01.99.02.72.02,1.32-.07,1.82-.15-.02-.28-.11-.57-.14-.86-.02-.22-.08-.44-.1-.67-.54.06-1.14.11-1.83.09-.38-.01-.74-.02-1.11-.04Z"/>
              <path className="cls-539" d="M915.43,959.47c.04.18.08.35.12.52.06.25.12.49.17.73.38.02.74.03,1.11.04.69.02,1.3-.03,1.83-.09-.02-.23-.08-.45-.1-.68-.01-.16-.05-.32-.07-.48-.57.02-1.19.02-1.86,0-.4-.01-.8-.03-1.22-.05Z"/>
              <path className="cls-448" d="M915.1,958.11c.07.28.13.55.2.83.04.18.09.35.13.53.42.02.82.03,1.22.05.67.02,1.29.01,1.86,0-.01-.16-.05-.32-.07-.48-.02-.28-.04-.57-.06-.85-.61.01-1.27.02-1.93,0-.41-.01-.87-.04-1.35-.07Z"/>
              <path className="cls-199" d="M914.42,955.14c.16.72.32,1.42.49,2.15.07.28.13.55.2.83.48.03.93.06,1.35.07.67.02,1.32.02,1.93,0-.02-.28-.04-.57-.06-.85-.05-.74-.09-1.48-.13-2.22-.7.08-1.44.15-2.15.13-.49,0-1.05-.05-1.63-.12Z"/>
              <path className="cls-29" d="M913.24,949.48c.24,1.18.45,2.33.71,3.51.16.72.3,1.42.47,2.14.58.06,1.14.11,1.63.12.7.01,1.45-.06,2.15-.13-.05-.74-.08-1.48-.12-2.21-.07-1.22-.11-2.43-.16-3.65-.81.2-1.67.4-2.49.41-.71.02-1.42-.07-2.19-.19Z"/>
              <path className="cls-495" d="M911.86,941.66c.24,1.45.46,2.86.73,4.31.22,1.19.41,2.33.65,3.51.76.12,1.48.21,2.19.19.81-.01,1.67-.21,2.49-.41-.05-1.21-.08-2.43-.12-3.65-.05-1.48-.07-2.96-.11-4.44-.89.38-1.84.76-2.79.8-1,.06-1.98-.09-3.03-.31Z"/>
              <path className="cls-134" d="M911.06,935.84c.06.5.09.98.16,1.48.21,1.47.4,2.89.64,4.35,1.05.21,2.03.37,3.03.31.95-.04,1.9-.42,2.79-.8-.03-1.48-.04-2.97-.05-4.45,0-.5,0-1,0-1.5-.89.5-1.86,1-2.89,1.06-1.15.08-2.37-.14-3.68-.43Z"/>
              <path className="cls-361" d="M910.78,932.01c.04.77.08,1.63.14,2.35.06.5.08.99.14,1.48,1.31.29,2.52.51,3.68.43,1.03-.06,2-.56,2.89-1.06,0-.5,0-1,0-1.5,0-.71,0-1.45,0-2.22-.89.35-1.86.69-2.9.76-1.21.08-2.53-.05-3.95-.23Z"/>
              <path className="cls-401" d="M910.64,928.48c.01.34.02.72.03,1.03.04.82.06,1.73.1,2.5,1.42.18,2.74.31,3.95.23,1.04-.06,2.01-.41,2.9-.76,0-.77,0-1.58,0-2.41v-1.65c-.89.28-1.86.57-2.91.63-1.25.07-2.61.24-4.08.42Z"/>
              <path className="cls-401" d="M910.05,693.37c.03,69.25.14,136.26.14,171.04s.12,54.74.42,62.95c.01.37.02.78.03,1.12,1.47-.18,2.84-.35,4.08-.42,1.04-.07,2.01-.35,2.91-.63v-1.68c0-35.07,0-138.97,0-239.31-.9-3.11-1.87-6.2-2.91-5.11-1.46-3.01-3.04,4.49-4.68,12.05Z"/>
              <path className="cls-566" d="M909.8,445.36c0,2.21,0,4.53,0,7.08,0,3.05.01,6.58.01,10.63,0,4.56.01,10.04.01,16.58,0,32.76.18,124.95.21,213.72,1.64-7.55,3.21-15.06,4.68-12.05,1.03-1.08,2.01,2.01,2.91,5.11,0-87.28,0-171.96,0-206.29,0-10.63,0-18.77,0-25.11,0-2.44,0-4.76,0-7.03-.9-1.53-1.88-3.03-2.91-2.97-1.57.09-3.24.19-4.93.33Z"/>
              <path className="cls-566" d="M909.78,435.71c0,1.12,0,2.31,0,3.64,0,1.83,0,3.8,0,6.01,1.69-.14,3.36-.24,4.93-.33,1.03-.06,2.01,1.45,2.91,2.97,0-2.27,0-4.42,0-6.53,0-1.43,0-2.81,0-4.16-.9-.69-1.88-1.38-2.91-1.39-1.57-.02-3.25-.12-4.95-.21Z"/>
              <path className="cls-482" d="M909.77,432.36c0,.12,0,.25,0,.37,0,.89,0,1.86,0,2.98,1.7.09,3.38.19,4.95.21,1.03.02,2.01.7,2.91,1.39,0-1.35,0-2.64,0-3.92v-.54c-.9-.12-1.88-.24-2.91-.29-1.57-.07-3.25-.14-4.95-.21Z"/>
              <path className="cls-197" d="M909.77,432v.36c1.7.07,3.38.15,4.95.21,1.03.04,2.01.17,2.91.29v-.53c-.9-.04-1.88-.08-2.91-.13-1.57-.07-3.25-.14-4.95-.2Z"/>
              <path className="cls-225" d="M915.31,964.16c.11.32.21.63.3.9.09,0,.18.01.26.02.31.02.61.03.89.04-.07-.28-.14-.58-.22-.91-.3,0-.61-.02-.95-.03-.1,0-.19,0-.28-.01Z"/>
              <path className="cls-373" d="M914.69,962.27c.1.29.19.58.28.85.12.37.23.71.34,1.04.09,0,.18,0,.28.01.34.02.66.03.95.03-.08-.32-.16-.67-.24-1.03-.06-.27-.13-.55-.2-.84-.33,0-.68-.02-1.08-.04-.11,0-.22-.01-.33-.02Z"/>
              <path className="cls-513" d="M914.16,960.65c.08.24.16.48.24.72.1.31.2.61.3.91.11,0,.21.01.33.02.4.02.75.03,1.08.04-.07-.29-.14-.59-.21-.9-.05-.23-.11-.47-.17-.71-.38-.01-.77-.03-1.21-.06-.12,0-.24-.01-.37-.02Z"/>
              <path className="cls-180" d="M913.73,959.38c.06.18.12.35.18.53.08.25.17.5.25.74.12,0,.24.01.37.02.44.03.83.04,1.21.06-.06-.24-.11-.49-.17-.73-.04-.17-.08-.35-.12-.52-.42-.02-.85-.04-1.31-.07-.13,0-.26-.01-.39-.02Z"/>
              <path className="cls-428" d="M913.25,957.99c.1.28.2.57.3.86.06.18.12.36.18.53.13,0,.26.02.39.02.46.03.89.05,1.31.07-.04-.18-.08-.35-.13-.53-.07-.28-.13-.55-.2-.83-.48-.03-.97-.06-1.44-.09-.13,0-.27-.02-.41-.03Z"/>
              <path className="cls-511" d="M912.16,954.91c.26.74.53,1.48.79,2.22.1.28.2.57.3.85.14,0,.28.02.41.03.48.03.97.06,1.44.09-.07-.28-.13-.55-.2-.83-.17-.72-.32-1.43-.49-2.15-.58-.06-1.19-.14-1.77-.18-.16-.01-.33-.03-.49-.04Z"/>
              <path className="cls-29" d="M910.06,949.05c.43,1.21.87,2.44,1.3,3.65.27.74.53,1.48.79,2.22.17.01.33.03.49.04.58.05,1.18.12,1.77.18-.16-.72-.31-1.42-.47-2.14-.26-1.19-.47-2.33-.71-3.51-.76-.12-1.56-.27-2.43-.37-.24-.03-.49-.05-.75-.06Z"/>
              <path className="cls-336" d="M907.3,940.92c.48,1.5.97,2.99,1.48,4.47.42,1.22.84,2.44,1.28,3.65.25.02.5.04.75.06.87.1,1.67.25,2.43.37-.24-1.18-.43-2.33-.65-3.51-.27-1.44-.49-2.85-.73-4.31-1.05-.21-2.16-.48-3.43-.64-.35-.05-.74-.08-1.13-.1Z"/>
              <path className="cls-200" d="M905.55,934.84c.13.52.27,1.03.41,1.55.42,1.52.87,3.04,1.35,4.54.39.02.78.05,1.13.1,1.26.16,2.38.43,3.43.64-.24-1.45-.43-2.88-.64-4.35-.07-.49-.1-.98-.16-1.48-1.31-.29-2.7-.66-4.21-.87-.42-.06-.85-.11-1.3-.13Z"/>
              <path className="cls-132" d="M904.82,931.45c.1.6.21,1.19.35,1.82.12.52.25,1.04.37,1.56.44.03.87.08,1.3.13,1.51.21,2.91.58,4.21.87-.06-.5-.08-.98-.14-1.48-.07-.72-.1-1.57-.14-2.35-1.42-.18-2.95-.4-4.57-.49-.45-.03-.92-.05-1.39-.07Z"/>
              <path className="cls-489" d="M904.46,929.06c.03.25.06.46.09.66.08.57.17,1.13.27,1.73.47.02.93.04,1.39.07,1.62.09,3.15.31,4.57.49-.04-.77-.06-1.68-.1-2.5-.01-.31-.02-.69-.03-1.03-1.47.18-3.06.37-4.74.49-.47.03-.95.06-1.44.09Z"/>
              <path className="cls-151" d="M903.5,704.06c.03,69.62.07,130.89.07,149.56,0,46.27.16,67.43.81,74.65.03.29.06.54.08.79.49-.02.97-.05,1.44-.09,1.68-.12,3.27-.31,4.74-.49-.01-.34-.02-.75-.03-1.12-.3-8.22-.42-27.82-.42-62.95s-.11-101.79-.14-171.04c-1.64,7.55-3.35,15.16-5.09,12.33-.48-1.04-.97-1.33-1.46-1.64Z"/>
              <path className="cls-258" d="M903.37,443.37c0,1.96,0,4.09.01,6.35,0,2.5,0,5.4,0,8.7,0,37.51.07,149.53.11,245.63.49.31.97.6,1.46,1.64,1.74,2.83,3.45-4.77,5.09-12.33-.04-88.77-.21-180.96-.21-213.72,0-6.55-.01-12.02-.01-16.58,0-4.05,0-7.58-.01-10.63,0-2.55,0-4.88,0-7.08-1.69.14-3.4.33-5.05.59-.46-.98-.92-1.78-1.38-2.59Z"/>
              <path className="cls-489" d="M903.35,434.88c0,.94,0,1.98,0,3.12,0,1.61,0,3.41.01,5.37.45.81.91,1.61,1.38,2.59,1.65-.27,3.36-.45,5.05-.59,0-2.21,0-4.18,0-6.01,0-1.33,0-2.53,0-3.64-1.7-.09-3.42-.15-5.07-.12-.46-.27-.92-.49-1.36-.71Z"/>
              <path className="cls-314" d="M903.35,432.09c0,.1,0,.2,0,.3,0,.72,0,1.56,0,2.5.45.22.9.44,1.36.71,1.65-.04,3.37.03,5.07.12,0-1.12,0-2.09,0-2.98,0-.13,0-.25,0-.37-1.7-.07-3.42-.14-5.07-.18-.46-.02-.91-.06-1.36-.09Z"/>
              <path className="cls-361" d="M903.35,431.8v.29c.45.04.9.07,1.36.09,1.64.05,3.36.11,5.07.18v-.36c-1.7-.06-3.42-.12-5.07-.17-.46-.01-.91-.03-1.36-.04Z"/>
              <path className="cls-461" d="M914.48,964.1c.14.33.27.63.38.91.16.01.32.02.48.03.09,0,.18.01.27.02-.09-.28-.19-.58-.3-.9-.09,0-.18-.01-.29-.02-.19-.01-.37-.03-.54-.04Z"/>
              <path className="cls-373" d="M913.63,962.2c.13.3.26.58.39.86.17.37.32.72.46,1.05.18.01.35.03.54.04.1,0,.19.01.29.02-.11-.32-.22-.67-.34-1.04-.09-.27-.18-.56-.28-.85-.11,0-.22-.01-.33-.02-.25-.02-.49-.03-.73-.05Z"/>
              <path className="cls-291" d="M912.91,960.57c.11.24.21.49.31.72.14.31.27.62.41.91.24.02.48.04.73.05.12,0,.23.01.33.02-.1-.29-.2-.6-.3-.91-.08-.24-.16-.47-.24-.72-.12,0-.25-.01-.37-.02-.29-.02-.58-.04-.87-.06Z"/>
              <path className="cls-234" d="M912.38,959.3c.07.18.14.35.22.53.1.25.21.5.31.74.29.02.58.04.87.06.13,0,.25.02.37.02-.08-.24-.16-.49-.25-.74-.06-.17-.12-.35-.18-.53-.13,0-.26-.02-.4-.02-.31-.02-.63-.04-.95-.06Z"/>
              <path className="cls-576" d="M911.84,957.91c.11.28.22.57.33.85.07.18.14.36.21.53.32.02.64.04.95.06.13,0,.27.02.4.02-.06-.18-.12-.35-.18-.53-.1-.29-.2-.57-.3-.86-.14,0-.28-.02-.42-.03-.32-.02-.66-.04-.99-.06Z"/>
              <path className="cls-191" d="M910.6,954.85c.31.74.61,1.47.9,2.21.11.28.23.57.34.85.33.02.66.04.99.06.14,0,.28.02.42.03-.1-.28-.2-.57-.3-.85-.26-.74-.52-1.49-.79-2.22-.17-.01-.34-.02-.51-.03-.33-.02-.69-.03-1.05-.04Z"/>
              <path className="cls-29" d="M908.12,949.02c.52,1.21,1.03,2.41,1.55,3.62.31.73.62,1.47.93,2.2.36.01.72.02,1.05.04.17,0,.34.02.51.03-.27-.74-.53-1.48-.79-2.22-.44-1.21-.87-2.44-1.3-3.65-.25-.02-.51-.03-.78-.03-.36,0-.76,0-1.16,0Z"/>
              <path className="cls-484" d="M904.87,940.92c.54,1.5,1.13,2.99,1.73,4.47.5,1.22,1.01,2.42,1.52,3.63.4,0,.79,0,1.16,0,.27,0,.53.01.78.03-.43-1.21-.86-2.44-1.28-3.65-.51-1.48-1-2.98-1.48-4.47-.39-.02-.8-.03-1.19-.02-.4,0-.82.01-1.25.02Z"/>
              <path className="cls-141" d="M902.93,934.82c.14.52.29,1.04.44,1.55.45,1.54.95,3.05,1.5,4.55.43-.01.85-.02,1.25-.02.39,0,.8,0,1.19.02-.48-1.5-.92-3.01-1.35-4.54-.14-.51-.28-1.03-.41-1.55-.44-.03-.89-.04-1.36-.03-.42,0-.84.01-1.26.01Z"/>
              <path className="cls-460" d="M902.13,931.45c.12.59.25,1.19.39,1.81.13.53.26,1.05.4,1.57.42,0,.84,0,1.26-.01.46-.01.91,0,1.36.03-.13-.52-.25-1.04-.37-1.56-.14-.63-.25-1.22-.35-1.82-.47-.02-.95-.03-1.43-.02-.42,0-.84.01-1.25.01Z"/>
              <path className="cls-171" d="M901.73,929.05c.03.27.06.48.1.7.09.54.19,1.11.3,1.69.42,0,.84,0,1.25-.01.48,0,.96,0,1.43.02-.1-.6-.19-1.17-.27-1.73-.03-.21-.06-.42-.09-.66-.49.02-.98.04-1.48.04-.41,0-.83-.01-1.25-.05Z"/>
              <path className="cls-481" d="M900.79,690.3c0,61.89.01,120.16.02,153.74,0,1.79,0,3.52,0,5.19,0,20.53.04,36.86.14,49.57.09,12.93.03,22.71.7,29.44.03.31.06.56.09.83.42.03.84.05,1.25.05.5,0,1-.02,1.48-.04-.03-.25-.06-.5-.08-.79-.65-7.22-.81-28.38-.81-74.65,0-18.67-.04-79.94-.07-149.56-.49-.31-.98-.64-1.46-1.78-.41-1.21-.83-6.59-1.25-11.98Z"/>
              <path className="cls-578" d="M900.77,445.71c0,2.04,0,4.15,0,6.32,0,35.71.01,141.16.02,238.26.42,5.39.84,10.76,1.25,11.98.49,1.14.97,1.47,1.46,1.78-.04-96.1-.11-208.13-.11-245.63,0-3.3,0-6.21,0-8.7,0-2.26,0-4.39-.01-6.35-.45-.81-.9-1.61-1.33-2.59-.42-.02-.85,2.46-1.27,4.93Z"/>
              <path className="cls-578" d="M900.77,436.14v3.66c0,1.9,0,3.87,0,5.92.42-2.48.85-4.95,1.27-4.93.43.97.88,1.78,1.33,2.59,0-1.96,0-3.76-.01-5.37,0-1.14,0-2.18,0-3.12-.45-.22-.89-.43-1.31-.7-.42-.01-.85.97-1.27,1.96Z"/>
              <path className="cls-484" d="M900.77,432.21v.47c0,1.12,0,2.27,0,3.46.42-.99.85-1.97,1.27-1.96.43.27.87.49,1.31.7,0-.94,0-1.77,0-2.5,0-.1,0-.2,0-.3-.45-.04-.88-.07-1.31-.09-.42,0-.85.1-1.27.21Z"/>
              <path className="cls-569" d="M900.77,431.74v.47c.42-.11.85-.22,1.27-.21.43.02.87.05,1.31.09v-.29c-.45-.01-.88-.02-1.31-.03-.42,0-.85-.02-1.27-.02Z"/>
              <path className="cls-241" d="M912.93,963.96c.22.33.43.64.59.93.29.03.57.06.84.08.17.01.33.03.5.04-.11-.28-.24-.58-.38-.91-.18-.01-.36-.03-.56-.05-.33-.03-.66-.06-.99-.09Z"/>
              <path className="cls-367" d="M911.65,962.04c.19.3.39.59.57.87.24.37.49.73.71,1.06.33.04.67.07.99.09.2.02.38.03.56.05-.14-.33-.3-.68-.46-1.05-.12-.28-.25-.56-.39-.86-.24-.02-.48-.04-.74-.06-.42-.03-.83-.07-1.24-.11Z"/>
              <path className="cls-96" d="M910.62,960.39c.15.25.29.49.44.73.19.31.4.62.59.92.41.04.82.08,1.24.11.26.02.5.04.74.06-.13-.3-.27-.6-.41-.91-.1-.24-.21-.48-.31-.72-.29-.02-.58-.04-.88-.06-.48-.03-.95-.07-1.41-.11Z"/>
              <path className="cls-325" d="M909.89,959.11c.1.18.19.35.29.53.15.25.29.5.44.75.46.04.93.08,1.41.11.29.02.59.04.88.06-.1-.24-.21-.49-.31-.74-.07-.17-.14-.35-.22-.53-.32-.02-.64-.04-.95-.07-.51-.04-1.03-.07-1.54-.12Z"/>
              <path className="cls-127" d="M909.21,957.74c.13.28.27.56.4.83.09.18.18.36.28.54.51.04,1.02.08,1.54.12.32.02.64.04.95.07-.07-.18-.14-.36-.21-.53-.11-.28-.22-.57-.33-.85-.33-.02-.67-.04-.99-.06-.53-.04-1.08-.07-1.64-.11Z"/>
              <path className="cls-229" d="M907.75,954.74c.35.72.71,1.44,1.06,2.16.13.28.27.55.4.83.55.04,1.11.07,1.64.11.33.02.66.04.99.06-.11-.28-.22-.57-.34-.85-.3-.74-.6-1.48-.9-2.21-.36-.01-.72-.02-1.05-.04-.55-.03-1.17-.04-1.8-.06Z"/>
              <path className="cls-29" d="M904.97,949.02c.56,1.19,1.14,2.38,1.72,3.57.35.72.71,1.44,1.06,2.16.63.01,1.25.03,1.8.06.34.02.69.03,1.05.04-.31-.74-.62-1.47-.93-2.2-.51-1.21-1.03-2.42-1.55-3.62-.4,0-.8,0-1.16,0-.59-.02-1.29,0-1.99,0Z"/>
              <path className="cls-148" d="M901.53,940.96c.56,1.51,1.16,2.99,1.8,4.46.53,1.21,1.07,2.4,1.64,3.6.7-.01,1.4-.03,1.99,0,.37.01.76.01,1.16,0-.52-1.21-1.03-2.42-1.52-3.63-.6-1.48-1.19-2.96-1.73-4.47-.42.01-.85.02-1.26.02-.66,0-1.37.01-2.08.02Z"/>
              <path className="cls-277" d="M899.59,934.77c.14.53.28,1.06.43,1.59.44,1.56.95,3.09,1.51,4.6.71-.01,1.42-.03,2.08-.02.4,0,.83,0,1.26-.02-.54-1.5-1.05-3.01-1.5-4.55-.15-.52-.3-1.03-.44-1.55-.42,0-.84,0-1.27,0-.69,0-1.38-.02-2.07-.04Z"/>
              <path className="cls-385" d="M898.82,931.36c.12.59.24,1.19.38,1.81.12.54.25,1.07.39,1.61.69.02,1.38.04,2.07.04.42,0,.85,0,1.27,0-.14-.52-.28-1.04-.4-1.57-.15-.62-.28-1.22-.39-1.81-.42,0-.84,0-1.26-.01-.68-.01-1.37-.04-2.05-.07Z"/>
              <path className="cls-473" d="M898.37,928.53c.05.41.1.79.15,1.13.09.54.19,1.11.3,1.7.69.03,1.37.06,2.05.07.42,0,.84.01,1.26.01-.12-.59-.22-1.15-.3-1.69-.04-.22-.07-.43-.1-.7-.42-.03-.84-.08-1.27-.14-.69-.1-1.39-.23-2.09-.39Z"/>
              <path className="cls-332" d="M897.43,678.06c0,55.36.02,111.52.05,158.56,0,18.75.05,36,.07,51.17.02,15.65-.35,29.11.69,39.52.04.41.08.81.13,1.22.7.15,1.4.29,2.09.39.43.06.85.11,1.27.14-.03-.27-.06-.52-.09-.83-.67-6.72-.6-16.5-.7-29.44-.1-12.71-.14-29.04-.14-49.57,0-1.67,0-3.4,0-5.19,0-33.57-.02-91.84-.02-153.74-.42-5.39-.85-10.79-1.27-12.06-.69.08-1.39-.01-2.09-.18Z"/>
              <path className="cls-533" d="M897.43,438.07c0,1.65,0,3.31,0,4.97,0,2.52,0,5.04,0,7.56.69.03,1.38.06,2.07.06.42,0,.85-2.47,1.27-4.95,0-2.04,0-4.01,0-5.92v-3.66c-.42.99-.85,1.97-1.27,1.96-.69,0-1.38-.02-2.07-.03Z"/>
              <path className="cls-429" d="M897.43,432.4v5.67c.69.01,1.38.03,2.07.03.42,0,.85-.98,1.27-1.96,0-1.19,0-2.34,0-3.46v-.47c-.42.11-.85.22-1.27.22-.69,0-1.38-.02-2.07-.02Z"/>
              <path className="cls-562" d="M897.43,431.71v.7c.69,0,1.38.01,2.07.02.42,0,.85-.11,1.27-.22v-.47c-.42,0-.85-.01-1.27-.02-.69,0-1.38-.01-2.07-.02Z"/>
              <path className="cls-404" d="M910.66,963.67c.31.34.6.67.86.97.38.06.75.11,1.12.15.3.04.6.07.88.1-.16-.29-.38-.6-.59-.93-.33-.04-.67-.08-1.01-.12-.41-.05-.83-.11-1.26-.18Z"/>
              <path className="cls-409" d="M908.94,961.7c.26.3.52.59.76.88.33.38.65.74.96,1.09.43.07.85.13,1.26.18.34.04.68.08,1.01.12-.22-.33-.47-.69-.71-1.06-.18-.28-.37-.57-.57-.87-.41-.04-.82-.09-1.22-.13-.49-.06-.99-.13-1.49-.2Z"/>
              <path className="cls-262" d="M907.55,960.04c.2.25.41.49.6.73.26.32.53.62.79.93.5.07,1,.14,1.49.2.41.05.81.09,1.22.13-.19-.3-.4-.6-.59-.92-.15-.24-.29-.48-.44-.73-.46-.04-.93-.09-1.39-.14-.56-.06-1.12-.13-1.68-.21Z"/>
              <path className="cls-545" d="M906.53,958.76c.13.18.28.36.41.53.2.25.41.5.61.75.56.08,1.12.15,1.68.21.47.05.93.1,1.39.14-.15-.25-.29-.5-.44-.75-.1-.18-.2-.35-.29-.53-.51-.04-1.02-.09-1.53-.14-.62-.06-1.23-.13-1.83-.21Z"/>
              <path className="cls-590" d="M905.6,957.41c.17.27.35.53.52.8.13.18.27.36.4.54.61.08,1.22.15,1.83.21.51.05,1.02.1,1.53.14-.1-.18-.19-.36-.28-.54-.13-.28-.27-.56-.4-.83-.55-.04-1.11-.08-1.64-.13-.64-.06-1.31-.13-1.97-.2Z"/>
              <path className="cls-336" d="M903.77,954.52c.43.7.87,1.4,1.32,2.09.17.27.34.53.52.8.67.07,1.34.13,1.97.2.53.05,1.08.09,1.64.13-.13-.28-.27-.56-.4-.83-.35-.72-.7-1.44-1.06-2.16-.63-.01-1.25-.03-1.8-.08-.66-.06-1.42-.1-2.18-.14Z"/>
              <path className="cls-29" d="M900.55,948.91c.62,1.18,1.27,2.34,1.95,3.51.41.7.83,1.4,1.26,2.1.76.05,1.52.08,2.18.14.55.05,1.17.07,1.8.08-.35-.72-.71-1.44-1.06-2.16-.58-1.19-1.16-2.37-1.72-3.57-.7.01-1.4.02-1.99-.03-.72-.05-1.57-.06-2.42-.08Z"/>
              <path className="cls-408" d="M896.93,940.84c.56,1.53,1.18,3.02,1.86,4.49.55,1.21,1.14,2.4,1.76,3.58.85.02,1.7.03,2.42.08.6.04,1.3.04,1.99.03-.56-1.19-1.11-2.39-1.64-3.6-.64-1.47-1.25-2.95-1.8-4.46-.71.01-1.43.01-2.09-.02-.8-.04-1.66-.06-2.51-.1Z"/>
              <path className="cls-408" d="M895.02,934.49c.13.55.26,1.11.41,1.65.43,1.61.94,3.17,1.5,4.7.85.04,1.71.06,2.51.1.66.03,1.38.03,2.09.02-.56-1.51-1.07-3.04-1.51-4.6-.15-.53-.29-1.05-.43-1.59-.69-.02-1.38-.05-2.07-.1-.83-.05-1.66-.11-2.49-.19Z"/>
              <path className="cls-519" d="M894.29,931c.12.59.25,1.19.38,1.81.12.56.23,1.13.36,1.68.83.08,1.66.14,2.49.19.69.04,1.38.07,2.07.1-.14-.53-.27-1.07-.39-1.61-.14-.62-.27-1.22-.38-1.81-.69-.03-1.37-.08-2.06-.13-.83-.06-1.65-.14-2.48-.22Z"/>
              <path className="cls-137" d="M893.73,927.43c.07.61.16,1.3.24,1.86.08.55.19,1.13.31,1.72.82.09,1.65.16,2.48.22.69.05,1.37.1,2.06.13-.12-.59-.22-1.16-.3-1.7-.05-.34-.1-.72-.15-1.13-.7-.15-1.41-.32-2.11-.49-.85-.2-1.69-.42-2.53-.61Z"/>
              <path className="cls-411" d="M892.81,676.93c0,55.03.02,110.89.06,157.7.02,18.92.12,36.32.05,51.59-.07,15.58-.44,28.96.59,39.31.06.58.14,1.3.21,1.9.84.19,1.68.41,2.53.61.7.17,1.41.34,2.11.49-.05-.41-.09-.82-.13-1.22-1.04-10.41-.66-23.86-.69-39.52-.02-15.17-.06-32.42-.07-51.17-.03-47.04-.04-103.2-.05-158.56-.7-.17-1.41-.42-2.1-.66-.84-.13-1.68-.31-2.51-.47Z"/>
              <path className="cls-465" d="M892.86,438.02c0,1.65,0,3.29,0,4.94,0,2.51,0,5.02,0,7.52.83.03,1.66.05,2.49.05.69,0,1.38.03,2.07.06,0-2.52,0-5.04,0-7.56,0-1.65,0-3.31,0-4.97-.69-.01-1.38-.03-2.07-.03-.83,0-1.66-.01-2.49-.02Z"/>
              <path className="cls-559" d="M892.87,432.39v.69c0,1.65,0,3.29,0,4.94.83,0,1.66.02,2.49.02.69,0,1.38.02,2.07.03v-5.67c-.69,0-1.38,0-2.07-.01-.83,0-1.66,0-2.49,0Z"/>
              <path className="cls-200" d="M892.87,431.69v.69c.83,0,1.66,0,2.49,0,.69,0,1.38,0,2.07.01v-.7c-.69,0-1.38,0-2.07-.01-.83,0-1.66,0-2.49,0Z"/>
              <path className="cls-414" d="M908.71,963.33c.37.36.73.7,1.06,1.02.19.04.39.07.58.1.4.07.79.13,1.17.19-.26-.3-.55-.63-.86-.97-.43-.07-.86-.14-1.31-.21-.21-.04-.42-.08-.64-.12Z"/>
              <path className="cls-306" d="M906.65,961.31c.31.31.61.61.91.9.4.39.78.76,1.15,1.12.21.04.42.08.64.12.45.08.88.15,1.31.21-.31-.34-.63-.71-.96-1.09-.24-.29-.5-.58-.76-.88-.5-.07-1.02-.16-1.55-.25-.25-.04-.5-.09-.74-.14Z"/>
              <path className="cls-96" d="M905.02,959.63c.24.25.47.5.71.74.31.32.62.64.93.94.24.05.49.1.74.14.53.09,1.04.17,1.55.25-.26-.3-.53-.61-.79-.93-.2-.24-.41-.48-.6-.73-.56-.08-1.13-.17-1.71-.26-.28-.05-.55-.1-.82-.15Z"/>
              <path className="cls-624" d="M903.82,958.32c.16.18.33.36.49.54.24.26.47.51.71.76.27.05.54.1.82.15.58.1,1.15.19,1.71.26-.2-.25-.41-.5-.61-.75-.14-.18-.28-.35-.41-.53-.61-.08-1.22-.17-1.83-.28-.3-.05-.59-.1-.88-.16Z"/>
              <path className="cls-229" d="M902.71,957c.21.26.41.51.62.77.16.18.32.37.49.55.29.06.58.11.88.16.62.1,1.22.19,1.83.28-.13-.18-.27-.36-.4-.54-.18-.27-.35-.53-.52-.8-.67-.07-1.33-.16-1.96-.26-.3-.05-.62-.1-.93-.15Z"/>
              <path className="cls-347" d="M900.58,954.2c.49.68,1,1.36,1.52,2.03.2.26.4.52.61.77.31.05.63.1.93.15.63.11,1.29.19,1.96.26-.17-.27-.35-.53-.52-.8-.45-.7-.89-1.39-1.32-2.09-.76-.05-1.52-.1-2.17-.21-.31-.05-.67-.08-1.02-.11Z"/>
              <path className="cls-14" d="M897.01,948.67c.67,1.18,1.38,2.33,2.14,3.47.46.69.94,1.38,1.43,2.06.36.03.71.06,1.02.11.65.11,1.41.16,2.17.21-.43-.7-.85-1.4-1.26-2.1-.68-1.16-1.33-2.32-1.95-3.51-.85-.02-1.7-.05-2.4-.16-.34-.05-.74-.06-1.15-.08Z"/>
              <path className="cls-140" d="M893.24,940.52c.56,1.57,1.2,3.08,1.9,4.57.58,1.22,1.2,2.41,1.87,3.59.41.02.81.03,1.15.08.7.11,1.55.14,2.4.16-.62-1.18-1.21-2.37-1.76-3.58-.67-1.47-1.3-2.96-1.86-4.49-.85-.04-1.7-.09-2.48-.2-.37-.05-.79-.08-1.21-.12Z"/>
              <path className="cls-578" d="M891.36,934.03c.12.55.26,1.11.4,1.66.42,1.66.91,3.27,1.47,4.83.42.04.84.07,1.21.12.78.11,1.63.16,2.48.2-.56-1.53-1.07-3.09-1.5-4.7-.15-.54-.28-1.1-.41-1.65-.83-.08-1.65-.17-2.47-.27-.39-.05-.79-.11-1.19-.19Z"/>
              <path className="cls-243" d="M890.66,930.56c.12.59.24,1.19.36,1.8.11.56.23,1.12.35,1.67.4.07.8.14,1.19.19.82.11,1.64.2,2.47.27-.13-.55-.25-1.12-.36-1.68-.12-.61-.26-1.22-.38-1.81-.82-.09-1.64-.18-2.46-.29-.39-.05-.78-.1-1.17-.16Z"/>
              <path className="cls-527" d="M890.08,926.78c.08.69.17,1.37.26,2.05.08.56.19,1.13.31,1.72.39.05.78.11,1.17.16.82.11,1.64.2,2.46.29-.12-.59-.23-1.16-.31-1.72-.08-.56-.17-1.26-.24-1.86-.84-.19-1.67-.36-2.48-.48-.39-.05-.78-.11-1.16-.17Z"/>
              <path className="cls-279" d="M889.11,676.47c.03,55.01.07,110.94.13,157.69,0,1.83,0,3.64,0,5.44.04,17.24.12,33.13.06,47.16,0,1.4-.01,2.79-.02,4.15-.07,13.23-.32,24.72.57,33.81.07.69.14,1.37.22,2.06.39.06.77.12,1.16.17.81.11,1.64.28,2.48.48-.07-.61-.15-1.32-.21-1.9-1.03-10.35-.66-23.73-.59-39.31.07-15.27-.03-32.67-.05-51.59-.05-46.81-.06-102.66-.06-157.7-.83-.16-1.66-.32-2.47-.41-.41-.01-.82-.03-1.23-.05Z"/>
              <path className="cls-425" d="M889.08,438c0,1.64,0,3.28,0,4.92,0,2.5,0,5,0,7.5.43,0,.86.01,1.29.01.83,0,1.66.03,2.49.05,0-2.51,0-5.01,0-7.52,0-1.65,0-3.29,0-4.94-.83,0-1.66-.02-2.49-.02-.43,0-.86,0-1.29,0Z"/>
              <path className="cls-330" d="M889.08,432.38v5.61c.43,0,.86,0,1.29,0,.83,0,1.66,0,2.49.02,0-1.65,0-3.29,0-4.94v-.69c-.83,0-1.66,0-2.49,0-.43,0-.86,0-1.29,0Z"/>
              <path className="cls-492" d="M889.08,431.69v.69c.43,0,.86,0,1.29,0,.83,0,1.66,0,2.49,0v-.69c-.83,0-1.66,0-2.49,0-.43,0-.86,0-1.29,0Z"/>
              <path className="cls-275" d="M907.4,963.06c.41.37.8.72,1.18,1.05.21.04.41.09.62.13.2.04.39.08.59.11-.33-.32-.69-.66-1.06-1.02-.21-.04-.42-.09-.64-.13-.23-.05-.45-.09-.68-.14Z"/>
              <path className="cls-372" d="M905.15,960.99c.33.31.66.62.99.92.43.4.86.78,1.27,1.15.23.05.45.1.68.14.22.04.43.09.64.13-.37-.36-.76-.73-1.15-1.12-.3-.29-.6-.59-.91-.9-.24-.05-.49-.1-.74-.15-.26-.05-.52-.11-.77-.17Z"/>
              <path className="cls-205" d="M903.36,959.27c.26.26.52.51.77.76.34.33.68.65,1.01.96.25.06.51.12.77.17.25.05.5.1.74.15-.31-.31-.62-.62-.93-.94-.24-.24-.47-.49-.71-.74-.27-.05-.54-.11-.82-.17-.29-.06-.56-.12-.84-.19Z"/>
              <path className="cls-310" d="M902.05,957.94c.18.18.36.37.54.55.26.26.52.52.78.78.28.07.55.13.84.19.28.06.55.11.82.17-.24-.25-.47-.51-.71-.76-.16-.18-.33-.36-.49-.54-.29-.06-.58-.12-.87-.18-.3-.06-.6-.13-.89-.2Z"/>
              <path className="cls-300" d="M900.83,956.64c.23.25.45.5.68.75.18.19.36.37.53.56.3.07.59.14.89.2.29.06.58.12.87.18-.16-.18-.32-.36-.49-.55-.21-.26-.42-.51-.62-.77-.31-.05-.63-.11-.93-.17-.31-.07-.63-.13-.95-.19Z"/>
              <path className="cls-259" d="M898.5,953.9c.53.67,1.09,1.33,1.66,1.99.22.25.44.5.67.75.32.07.64.13.95.19.3.06.61.12.93.17-.21-.26-.41-.52-.61-.77-.52-.67-1.03-1.35-1.52-2.03-.36-.03-.71-.07-1.02-.14-.32-.07-.69-.11-1.05-.16Z"/>
              <path className="cls-111" d="M894.66,948.42c.71,1.17,1.48,2.33,2.3,3.45.5.68,1.01,1.36,1.55,2.03.36.05.73.09,1.05.16.31.07.67.1,1.02.14-.49-.68-.97-1.37-1.43-2.06-.76-1.14-1.47-2.29-2.14-3.47-.41-.02-.81-.04-1.16-.11-.36-.08-.77-.11-1.19-.13Z"/>
              <path className="cls-203" d="M890.73,940.15c.57,1.6,1.22,3.16,1.96,4.66.6,1.23,1.26,2.44,1.97,3.61.42.03.84.06,1.19.13.34.07.75.1,1.16.11-.67-1.18-1.29-2.37-1.87-3.59-.7-1.48-1.34-3-1.9-4.57-.42-.04-.85-.09-1.23-.18-.4-.09-.84-.14-1.27-.19Z"/>
              <path className="cls-259" d="M888.92,933.57c.11.53.22,1.05.34,1.59.4,1.73.89,3.4,1.46,5,.43.05.87.1,1.27.19.39.09.81.13,1.23.18-.56-1.57-1.05-3.17-1.47-4.83-.14-.54-.28-1.11-.4-1.66-.4-.07-.8-.15-1.2-.22-.41-.08-.83-.16-1.24-.24Z"/>
              <path className="cls-122" d="M888.3,930.2c.1.59.21,1.19.32,1.8.1.52.19,1.04.3,1.57.41.08.82.17,1.24.24.4.07.8.15,1.2.22-.12-.55-.24-1.12-.35-1.67-.11-.61-.24-1.21-.36-1.8-.39-.05-.78-.11-1.16-.17-.4-.06-.8-.12-1.19-.19Z"/>
              <path className="cls-345" d="M887.79,926.69c.07.59.15,1.19.23,1.78.08.56.18,1.14.28,1.73.4.06.79.13,1.19.19.39.06.77.12,1.16.17-.12-.59-.23-1.17-.31-1.72-.1-.68-.18-1.37-.26-2.05-.39-.06-.77-.12-1.15-.18-.39-.05-.77.02-1.14.09Z"/>
              <path className="cls-596" d="M886.65,684.68c.07,64.18.16,125.96.23,161.54,0,3.53.02,6.85.02,9.94.06,17,.07,30.77.11,41.73.04,11.68-.05,20.66.57,27.02.06.6.13,1.19.2,1.78.37-.07.75-.15,1.14-.09.38.06.76.12,1.15.18-.08-.68-.15-1.37-.22-2.06-.89-9.09-.65-20.58-.57-33.81,0-1.36.02-2.75.02-4.15.06-14.02-.02-29.92-.06-47.16,0-1.8,0-3.61,0-5.44-.07-46.75-.11-102.68-.13-157.69-.41-.02-.82-.04-1.22-.06-.43,1.24-.83,4.75-1.24,8.26Z"/>
              <path className="cls-330" d="M886.45,436.69v4.56c0,2.26,0,4.66,0,7.17.44.99.89,1.98,1.34,1.99.43,0,.86,0,1.29.01,0-2.5,0-5,0-7.5,0-1.64,0-3.28,0-4.92-.43,0-.86,0-1.29,0-.45,0-.89-.65-1.34-1.31Z"/>
              <path className="cls-600" d="M886.45,432.19v4.49c.44.65.89,1.31,1.34,1.31.43,0,.86,0,1.29,0v-5.61c-.43,0-.86,0-1.3,0-.45,0-.89-.1-1.34-.19Z"/>
              <path className="cls-217" d="M886.45,431.69v.5c.44.1.89.19,1.34.19.43,0,.86,0,1.3,0v-.69c-.43,0-.86,0-1.3,0-.45,0-.89,0-1.34,0Z"/>
              <path className="cls-406" d="M905.41,962.58c.44.38.87.75,1.27,1.09.43.11.85.21,1.27.3.21.05.42.09.62.14-.38-.33-.77-.68-1.18-1.05-.23-.05-.45-.1-.68-.16-.44-.1-.87-.21-1.3-.32Z"/>
              <path className="cls-175" d="M902.97,960.42c.36.33.72.64,1.07.96.47.42.93.82,1.37,1.2.43.12.86.22,1.3.32.23.05.46.11.68.16-.41-.37-.83-.75-1.27-1.15-.32-.3-.65-.61-.99-.92-.25-.06-.51-.12-.77-.19-.47-.11-.94-.24-1.41-.38Z"/>
              <path className="cls-2" d="M901.05,958.65c.28.26.56.52.83.78.36.34.73.67,1.09,1,.47.13.94.26,1.41.38.26.06.52.13.77.19-.33-.31-.67-.64-1.01-.96-.26-.25-.52-.5-.77-.76-.28-.07-.55-.14-.83-.21-.49-.12-.99-.26-1.48-.41Z"/>
              <path className="cls-261" d="M899.65,957.31c.19.19.38.37.57.55.27.27.55.53.83.79.49.15.99.29,1.48.41.28.07.56.14.83.21-.26-.26-.52-.51-.78-.78-.18-.18-.36-.36-.54-.55-.3-.07-.59-.14-.89-.22-.5-.13-1.01-.27-1.51-.42Z"/>
              <path className="cls-217" d="M898.39,956.03c.23.24.47.48.7.72.19.19.37.37.56.56.5.15,1.01.29,1.51.42.3.08.59.15.89.22-.18-.18-.36-.37-.53-.56-.23-.25-.46-.5-.68-.75-.32-.07-.64-.13-.94-.21-.51-.13-1.01-.26-1.5-.4Z"/>
              <path className="cls-229" d="M896.01,953.38c.54.65,1.1,1.29,1.69,1.93.22.24.45.49.68.73.5.14,1,.27,1.5.4.3.08.62.15.94.21-.23-.25-.45-.5-.67-.75-.57-.66-1.13-1.32-1.66-1.99-.36-.05-.73-.09-1.04-.17-.49-.12-.97-.24-1.45-.36Z"/>
              <path className="cls-584" d="M892.18,948c.7,1.16,1.46,2.29,2.28,3.39.5.67,1.01,1.33,1.56,1.98.48.12.96.23,1.45.36.31.08.68.12,1.04.17-.53-.67-1.05-1.34-1.55-2.03-.82-1.13-1.59-2.28-2.3-3.45-.42-.03-.83-.05-1.17-.13-.44-.1-.87-.2-1.3-.29Z"/>
              <path className="cls-424" d="M888.38,939.79c.54,1.6,1.17,3.15,1.88,4.64.58,1.22,1.23,2.42,1.93,3.58.43.1.86.19,1.3.29.34.07.76.1,1.17.13-.71-1.17-1.37-2.38-1.97-3.61-.73-1.5-1.39-3.05-1.96-4.66-.43-.05-.86-.09-1.24-.16-.38-.07-.74-.14-1.1-.2Z"/>
              <path className="cls-484" d="M886.69,933.22c.1.52.2,1.04.32,1.57.38,1.73.83,3.4,1.37,5,.36.07.73.14,1.1.2.38.07.81.11,1.24.16-.57-1.6-1.06-3.27-1.46-5-.12-.54-.23-1.06-.34-1.59-.41-.08-.82-.16-1.22-.23-.34-.05-.68-.09-1.01-.12Z"/>
              <path className="cls-137" d="M886.15,929.88c.08.6.17,1.2.27,1.8.08.51.18,1.02.27,1.54.34.03.67.07,1.01.12.4.07.81.15,1.22.23-.11-.53-.2-1.05-.3-1.57-.11-.61-.22-1.21-.32-1.8-.4-.06-.79-.13-1.18-.2-.33-.05-.65-.09-.97-.12Z"/>
              <path className="cls-384" d="M885.7,926.33c.07.59.15,1.18.22,1.77.07.59.15,1.17.23,1.78.32.03.64.07.97.12.39.07.79.13,1.18.2-.1-.59-.2-1.16-.28-1.73-.08-.59-.16-1.19-.23-1.78-.37.07-.74.14-1.13.08-.31-.05-.64-.25-.96-.44Z"/>
              <path className="cls-371" d="M884.51,684.45c.08,61.81.16,121.41.23,157.39.01,5.61,0,10.81-.04,15.53-.03,33.84-.34,55.48.81,67.19.06.59.12,1.18.19,1.78.32.19.65.39.96.44.38.06.75-.01,1.13-.08-.07-.59-.14-1.19-.2-1.78-.62-6.35-.54-15.34-.57-27.02-.04-10.96-.06-24.73-.11-41.73,0-3.09-.02-6.41-.02-9.94-.08-35.57-.16-97.36-.23-161.54-.4,3.51-.81,7.02-1.23,8.26-.3-1.61-.61-5.05-.91-8.49Z"/>
              <path className="cls-279" d="M884.28,448.38c0,2.51,0,5.12,0,7.82v.92c0,24.99.11,128.84.23,227.33.31,3.44.62,6.89.91,8.49.42-1.24.82-4.75,1.23-8.26-.11-98.55-.19-202.47-.2-227.51v-.92c0-2.71,0-5.33,0-7.84-.44-.99-.89-1.98-1.33-1.99-.28,0-.56.97-.84,1.95Z"/>
              <path className="cls-519" d="M884.28,436.68c0,1.43,0,2.94,0,4.55,0,2.26,0,4.65,0,7.15.28-.98.56-1.95.84-1.95.44,0,.88.99,1.33,1.99,0-2.51,0-4.91,0-7.17v-4.56c-.44-.65-.89-1.31-1.33-1.31-.28,0-.56.65-.84,1.3Z"/>
              <path className="cls-592" d="M884.28,432.2v.51c0,1.22,0,2.54,0,3.97.28-.65.56-1.3.84-1.3.44,0,.88.65,1.33,1.31v-4.49c-.44-.1-.89-.19-1.33-.19-.28,0-.56.1-.84.19Z"/>
              <path className="cls-526" d="M884.28,431.7v.5c.28-.1.56-.19.84-.19.44,0,.88.09,1.33.19v-.5c-.44,0-.89,0-1.33,0-.28,0-.56,0-.84,0Z"/>
              <path className="cls-233" d="M902.97,961.86c.47.4.91.78,1.33,1.14.37.12.73.22,1.09.33.44.13.87.24,1.3.35-.4-.34-.83-.71-1.27-1.09-.43-.12-.87-.24-1.32-.37-.37-.11-.74-.23-1.12-.35Z"/>
              <path className="cls-557" d="M900.4,959.62c.38.34.76.67,1.13.99.49.43.98.85,1.45,1.25.38.12.75.24,1.12.35.45.13.89.26,1.32.37-.44-.38-.9-.79-1.37-1.2-.35-.31-.71-.63-1.07-.96-.47-.13-.94-.28-1.41-.42-.39-.12-.78-.25-1.17-.38Z"/>
              <path className="cls-376" d="M898.39,957.8c.29.27.58.53.87.79.38.34.76.69,1.15,1.02.39.14.78.26,1.17.38.47.14.94.29,1.41.42-.36-.33-.73-.66-1.09-1-.28-.26-.56-.51-.83-.78-.49-.15-.99-.3-1.47-.45-.4-.13-.8-.26-1.19-.4Z"/>
              <path className="cls-372" d="M896.95,956.44c.19.19.39.37.58.56.28.26.57.53.86.8.4.14.79.27,1.19.4.48.15.97.31,1.47.45-.28-.26-.55-.52-.83-.79-.19-.18-.38-.37-.57-.55-.5-.15-1-.3-1.49-.46-.41-.13-.81-.27-1.21-.41Z"/>
              <path className="cls-194" d="M895.7,955.19c.22.23.45.47.68.69.19.18.38.37.57.56.4.14.8.28,1.21.41.49.16.99.31,1.49.46-.19-.19-.38-.37-.56-.56-.24-.24-.47-.48-.7-.72-.5-.14-.99-.28-1.48-.44-.41-.13-.81-.26-1.21-.4Z"/>
              <path className="cls-269" d="M893.43,952.64c.51.63,1.05,1.24,1.61,1.85.21.23.44.47.66.7.4.13.8.27,1.21.4.49.16.99.3,1.48.44-.23-.24-.46-.48-.68-.73-.59-.63-1.15-1.28-1.69-1.93-.48-.12-.95-.24-1.43-.39-.39-.12-.78-.23-1.16-.35Z"/>
              <path className="cls-448" d="M889.85,947.44c.65,1.13,1.35,2.22,2.12,3.29.47.65.96,1.29,1.47,1.91.38.11.76.23,1.16.35.48.14.95.27,1.43.39-.54-.65-1.06-1.31-1.56-1.98-.82-1.1-1.58-2.24-2.28-3.39-.43-.1-.86-.2-1.29-.3-.35-.09-.7-.17-1.05-.26Z"/>
              <path className="cls-370" d="M886.38,939.45c.49,1.55,1.05,3.06,1.7,4.51.53,1.19,1.12,2.35,1.76,3.48.34.09.69.18,1.05.26.43.1.86.2,1.29.3-.7-1.16-1.34-2.35-1.93-3.58-.71-1.49-1.34-3.04-1.88-4.64-.36-.07-.72-.13-1.09-.18-.3-.04-.61-.1-.91-.16Z"/>
              <path className="cls-232" d="M884.88,933.11c.08.51.17,1.02.28,1.53.33,1.65.74,3.26,1.22,4.81.3.06.6.12.91.16.37.05.73.11,1.09.18-.54-1.6-1-3.27-1.37-5-.11-.53-.22-1.05-.32-1.57-.34-.03-.67-.05-1-.07-.27-.02-.54-.03-.81-.04Z"/>
              <path className="cls-560" d="M884.43,929.74c.06.64.13,1.27.22,1.86.07.5.15,1,.23,1.51.27.01.54.02.81.04.33.02.66.04,1,.07-.1-.52-.19-1.03-.27-1.54-.1-.6-.19-1.2-.27-1.8-.32-.03-.64-.06-.95-.09-.26-.03-.52-.04-.77-.05Z"/>
              <path className="cls-547" d="M884.01,925.77c.07.68.15,1.36.23,2.02.07.65.13,1.3.19,1.95.25.01.51.02.77.05.31.04.63.06.95.09-.08-.6-.15-1.19-.23-1.78-.08-.59-.15-1.18-.22-1.77-.32-.19-.64-.39-.95-.44-.25-.05-.5-.09-.74-.12Z"/>
              <path className="cls-364" d="M882.88,676.54c.04,54.3.09,109.09.14,155.44.04,38.62-1.01,71.18.78,91.74.06.68.13,1.37.2,2.05.24.04.49.07.74.12.3.06.62.25.95.44-.07-.59-.14-1.18-.19-1.78-1.14-11.71-.84-33.35-.81-67.19.03-4.72.05-9.92.04-15.53-.07-35.98-.15-95.58-.23-157.39-.31-3.44-.61-6.88-.9-8.47-.25.57-.49.67-.73.56Z"/>
              <path className="cls-146" d="M882.76,450.38c0,2.49,0,4.99,0,7.48.01,40.93.06,128.89.12,218.68.23.11.47,0,.73-.56.29,1.59.59,5.03.9,8.47-.12-98.49-.22-202.34-.23-227.33v-.92c0-2.7,0-5.31,0-7.82-.28.98-.56,1.96-.83,1.99-.23.02-.46.02-.69.01Z"/>
              <path className="cls-146" d="M882.76,437.99c0,1.64,0,3.28,0,4.91,0,2.49,0,4.99,0,7.48.23,0,.45.01.69-.01.27-.03.55-1.01.83-1.99,0-2.51,0-4.9,0-7.15,0-1.61,0-3.12,0-4.55-.28.65-.56,1.3-.84,1.31-.23,0-.46,0-.68,0Z"/>
              <path className="cls-251" d="M882.76,432.39v.69c0,1.64,0,3.28,0,4.91.23,0,.45,0,.68,0,.28,0,.56-.66.84-1.31,0-1.43,0-2.75,0-3.97v-.51c-.28.1-.56.19-.84.19-.23,0-.46,0-.68,0Z"/>
              <path className="cls-413" d="M882.76,431.7v.69c.23,0,.45,0,.68,0,.28,0,.56-.1.84-.19v-.5c-.28,0-.56,0-.84,0-.23,0-.46,0-.68,0Z"/>
              <path className="cls-143" d="M900.53,960.97c.48.42.95.82,1.38,1.19.43.16.86.32,1.29.47.37.13.74.25,1.1.36-.41-.35-.86-.73-1.33-1.14-.38-.12-.75-.25-1.13-.39-.44-.16-.87-.32-1.31-.5Z"/>
              <path className="cls-582" d="M897.88,958.66c.39.34.78.69,1.15,1.02.5.44,1.01.88,1.49,1.3.44.17.88.34,1.31.5.38.14.75.27,1.13.39-.47-.4-.95-.82-1.45-1.25-.37-.32-.75-.65-1.13-.99-.39-.14-.78-.28-1.17-.42-.45-.17-.9-.35-1.35-.53Z"/>
              <path className="cls-179" d="M895.84,956.82c.29.27.59.54.88.8.38.34.78.7,1.16,1.04.45.19.9.36,1.35.53.39.15.78.29,1.17.42-.38-.34-.77-.68-1.15-1.02-.29-.26-.58-.53-.87-.79-.4-.14-.79-.29-1.19-.44-.45-.17-.91-.36-1.36-.54Z"/>
              <path className="cls-106" d="M894.4,955.48c.19.18.39.37.58.55.28.26.57.53.86.8.45.19.9.37,1.36.54.39.15.79.3,1.19.44-.29-.27-.58-.54-.86-.8-.19-.18-.39-.37-.58-.56-.4-.14-.8-.29-1.19-.43-.46-.17-.91-.35-1.36-.53Z"/>
              <path className="cls-346" d="M893.19,954.29c.21.22.43.43.64.64.18.18.38.36.57.54.45.18.9.36,1.36.53.4.15.79.29,1.19.43-.19-.19-.38-.37-.57-.56-.23-.23-.46-.46-.68-.69-.4-.13-.79-.27-1.18-.41-.45-.16-.89-.32-1.33-.49Z"/>
              <path className="cls-109" d="M891.05,951.89c.48.6.98,1.18,1.51,1.75.2.22.41.44.62.65.44.17.88.33,1.33.49.39.14.78.28,1.18.41-.22-.23-.45-.47-.66-.7-.56-.61-1.09-1.22-1.61-1.85-.38-.11-.75-.23-1.12-.34-.43-.13-.84-.27-1.26-.41Z"/>
              <path className="cls-235" d="M887.68,946.84c.6,1.1,1.27,2.18,2,3.22.44.63.9,1.24,1.38,1.84.41.14.83.27,1.26.41.37.12.74.23,1.12.34-.51-.63-1-1.27-1.47-1.91-.77-1.07-1.47-2.16-2.12-3.29-.34-.09-.68-.18-1.02-.27-.39-.11-.77-.22-1.15-.33Z"/>
              <path className="cls-92" d="M884.48,939.06c.43,1.49.95,2.94,1.55,4.36.49,1.17,1.05,2.31,1.65,3.42.38.11.76.22,1.15.33.34.09.67.18,1.02.27-.65-1.13-1.23-2.28-1.76-3.48-.65-1.45-1.21-2.96-1.7-4.51-.3-.06-.6-.12-.89-.17-.34-.06-.68-.14-1.01-.22Z"/>
              <path className="cls-133" d="M883.19,933.01c.07.49.15.99.24,1.49.28,1.55.63,3.07,1.06,4.56.33.08.67.16,1.01.22.29.05.59.11.89.17-.49-1.55-.89-3.16-1.22-4.81-.1-.51-.19-1.02-.28-1.53-.27-.01-.53-.02-.8-.04-.3-.02-.6-.03-.9-.06Z"/>
              <path className="cls-413" d="M882.82,929.62c.06.69.11,1.35.18,1.92.06.49.12.98.19,1.47.3.02.6.04.9.06.26.01.53.03.8.04-.08-.51-.16-1.01-.23-1.51-.09-.59-.16-1.22-.22-1.86-.25-.01-.51-.02-.76-.05-.29-.03-.57-.05-.86-.07Z"/>
              <path className="cls-163" d="M882.49,925.55c.05.65.11,1.29.17,1.91.06.73.11,1.46.16,2.15.28.02.57.03.86.07.25.03.5.04.76.05-.06-.64-.12-1.3-.19-1.95-.08-.66-.16-1.34-.23-2.02-.24-.04-.48-.07-.72-.1-.27-.04-.54-.08-.8-.11Z"/>
              <path className="cls-423" d="M881.38,675.66c.02,53.9.05,108.76.08,154.89.03,39.14-.54,72.21.87,93.01.05.67.1,1.34.15,1.99.26.03.53.07.8.11.24.04.48.07.72.1-.07-.68-.15-1.37-.2-2.05-1.79-20.56-.74-53.12-.78-91.74-.05-46.35-.1-101.14-.14-155.44-.23-.11-.46-.43-.7-.72-.27-.12-.54-.16-.8-.16Z"/>
              <path className="cls-253" d="M881.31,450.34c0,2.49,0,4.97,0,7.46,0,40.89.03,128.11.07,217.86.26,0,.53.04.8.16.24.29.47.61.7.72-.07-89.79-.11-177.75-.12-218.68,0-2.49,0-4.99,0-7.48-.23,0-.45-.02-.67-.03-.26,0-.52-.01-.77-.02Z"/>
              <path className="cls-184" d="M881.31,437.99c0,1.63,0,3.27,0,4.9,0,2.49,0,4.97,0,7.46.26,0,.51,0,.77.02.22,0,.45.02.67.03,0-2.49,0-4.99,0-7.48,0-1.64,0-3.28,0-4.91-.23,0-.45,0-.68,0-.26,0-.52,0-.77,0Z"/>
              <path className="cls-298" d="M881.31,432.4v5.59c.26,0,.51,0,.77,0,.22,0,.45,0,.68,0,0-1.64,0-3.28,0-4.91v-.69c-.23,0-.45,0-.68,0-.26,0-.52,0-.77,0Z"/>
              <path className="cls-301" d="M881.31,431.71v.69c.25,0,.51,0,.77,0,.22,0,.45,0,.68,0v-.69c-.23,0-.45,0-.68,0-.26,0-.52,0-.77,0Z"/>
              <path className="cls-579" d="M898.02,959.89c.49.43.97.84,1.41,1.22.4.18.79.36,1.18.52.43.18.87.36,1.3.52-.43-.37-.9-.77-1.38-1.19-.44-.17-.88-.36-1.32-.54-.4-.17-.8-.35-1.19-.53Z"/>
              <path className="cls-131" d="M895.35,957.54c.39.35.78.69,1.16,1.03.51.45,1.02.9,1.51,1.32.4.18.79.36,1.19.53.44.19.88.37,1.32.54-.48-.42-.99-.86-1.49-1.3-.37-.33-.76-.67-1.15-1.02-.45-.19-.89-.38-1.33-.57-.4-.18-.8-.36-1.2-.54Z"/>
              <path className="cls-528" d="M893.32,955.71c.29.26.58.53.87.79.38.35.78.7,1.17,1.04.4.18.79.37,1.2.54.44.2.89.39,1.33.57-.39-.34-.78-.7-1.16-1.04-.29-.26-.59-.53-.88-.8-.45-.19-.9-.38-1.34-.57-.4-.18-.8-.36-1.19-.54Z"/>
              <path className="cls-219" d="M891.88,954.39c.19.18.38.36.58.53.28.26.57.52.86.78.39.18.79.36,1.19.54.44.19.89.39,1.34.57-.29-.27-.58-.54-.86-.8-.19-.18-.39-.37-.58-.55-.45-.18-.89-.37-1.33-.56-.4-.17-.79-.35-1.18-.53Z"/>
              <path className="cls-459" d="M890.72,953.28c.2.2.4.39.6.59.18.17.37.35.56.53.39.18.78.35,1.18.53.44.19.88.38,1.33.56-.19-.18-.38-.37-.57-.54-.22-.21-.43-.42-.64-.64-.44-.17-.87-.34-1.3-.52-.39-.16-.78-.33-1.16-.49Z"/>
              <path className="cls-575" d="M888.71,951.01c.45.57.93,1.13,1.43,1.66.19.21.38.4.58.6.38.17.77.33,1.16.49.43.18.86.35,1.3.52-.21-.22-.42-.44-.62-.65-.53-.57-1.03-1.15-1.51-1.75-.41-.14-.83-.28-1.24-.44-.37-.14-.74-.29-1.11-.44Z"/>
              <path className="cls-172" d="M885.55,946.13c.56,1.08,1.18,2.12,1.86,3.12.41.61.84,1.2,1.3,1.77.37.15.74.3,1.11.44.41.16.82.3,1.24.44-.48-.6-.94-1.21-1.38-1.84-.72-1.03-1.39-2.12-2-3.22-.38-.11-.75-.23-1.12-.35-.34-.11-.67-.23-1.01-.36Z"/>
              <path className="cls-180" d="M882.65,938.58c.38,1.44.85,2.85,1.39,4.23.45,1.13.95,2.24,1.51,3.32.33.13.67.25,1.01.36.37.12.75.24,1.12.35-.6-1.1-1.16-2.25-1.65-3.42-.6-1.42-1.11-2.87-1.55-4.36-.33-.08-.66-.16-.98-.23-.29-.06-.58-.15-.86-.24Z"/>
              <path className="cls-126" d="M881.53,932.78c.06.48.12.97.2,1.45.23,1.46.53,2.92.92,4.35.28.09.57.18.86.24.32.07.65.15.98.23-.43-1.49-.79-3.01-1.06-4.56-.09-.5-.17-.99-.24-1.49-.3-.02-.59-.05-.88-.09-.26-.04-.52-.08-.78-.14Z"/>
              <path className="cls-585" d="M881.23,929.42c.05.7.1,1.36.15,1.92.04.48.09.96.15,1.44.25.06.51.1.78.14.29.04.58.07.88.09-.07-.49-.13-.98-.19-1.47-.07-.57-.13-1.23-.18-1.92-.28-.02-.56-.04-.84-.09-.25-.04-.5-.08-.74-.12Z"/>
              <path className="cls-302" d="M880.99,925.33c.04.63.06,1.22.1,1.81.05.8.09,1.58.14,2.29.24.04.49.07.74.12.28.05.56.07.84.09-.06-.69-.11-1.43-.16-2.15-.06-.62-.11-1.26-.17-1.91-.26-.03-.53-.07-.79-.11-.24-.04-.47-.08-.71-.12Z"/>
              <path className="cls-237" d="M879.91,688.36c0,62.56.02,122.31.03,157.82,0,10.39-.01,19.27,0,26.26.02,15.48.33,38.3.96,50.96.03.67.06,1.31.1,1.94.23.04.47.08.71.12.26.04.52.08.79.11-.05-.65-.11-1.32-.15-1.99-1.41-20.8-.85-53.87-.87-93.01-.03-46.13-.06-100.99-.08-154.89-.26,0-.52.03-.78.06-.24,3.26-.47,7.95-.7,12.64Z"/>
              <path className="cls-426" d="M879.87,447.27c0,1.63,0,3.25,0,4.87,0,28.18.02,135.6.03,236.22.23-4.69.46-9.38.7-12.64.26-.03.52-.07.78-.06-.04-89.75-.06-176.97-.07-217.86,0-2.49,0-4.97,0-7.46-.26,0-.51,0-.76,0-.23,0-.45-1.54-.68-3.08Z"/>
              <path className="cls-335" d="M879.87,437.14c0,1.64,0,3.43,0,5.26,0,1.63,0,3.25,0,4.87.22,1.54.45,3.09.68,3.08.25,0,.5,0,.76,0,0-2.49,0-4.97,0-7.46,0-1.63,0-3.27,0-4.9-.25,0-.51,0-.76,0-.23,0-.45-.42-.68-.85Z"/>
              <path className="cls-212" d="M879.87,432.21c0,.17,0,.35,0,.53,0,1.26,0,2.76,0,4.41.22.42.45.85.68.85.25,0,.5,0,.76,0v-5.59c-.26,0-.51,0-.76,0-.23,0-.45-.1-.68-.19Z"/>
              <path className="cls-313" d="M879.87,431.71v.49c.22.1.45.19.68.19.25,0,.5,0,.76,0v-.69c-.26,0-.51,0-.76,0-.23,0-.45,0-.68,0Z"/>
              <path className="cls-372" d="M896.06,958.92c.46.41.89.81,1.32,1.17.29.15.58.3.87.45.4.2.79.39,1.19.57-.44-.38-.92-.8-1.41-1.22-.4-.18-.79-.37-1.18-.57-.26-.13-.52-.26-.78-.4Z"/>
              <path className="cls-282" d="M893.56,956.67c.36.33.73.67,1.09.99.48.43.95.85,1.4,1.26.26.14.52.27.78.4.39.19.79.38,1.18.57-.49-.43-1-.88-1.51-1.32-.38-.33-.77-.68-1.16-1.03-.4-.18-.79-.37-1.17-.56-.21-.1-.41-.21-.62-.31Z"/>
              <path className="cls-149" d="M891.66,954.92c.27.25.53.5.81.75.36.33.73.67,1.09,1,.21.11.41.21.62.31.39.19.78.37,1.17.56-.39-.35-.78-.7-1.17-1.04-.29-.26-.58-.53-.87-.79-.39-.18-.78-.36-1.16-.55-.17-.08-.33-.16-.49-.24Z"/>
              <path className="cls-615" d="M890.33,953.67c.18.17.36.34.54.51.26.24.52.49.79.75.16.08.33.16.49.24.38.18.77.37,1.16.55-.29-.26-.58-.53-.86-.78-.19-.18-.39-.36-.58-.53-.39-.18-.78-.36-1.16-.54-.13-.06-.26-.13-.39-.19Z"/>
              <path className="cls-218" d="M889.21,952.58c.2.2.39.39.6.58.17.16.35.33.52.5.13.06.26.13.39.19.38.18.77.36,1.16.54-.19-.18-.38-.35-.56-.53-.21-.19-.4-.39-.6-.59-.38-.17-.77-.34-1.14-.52-.12-.06-.24-.12-.36-.18Z"/>
              <path className="cls-572" d="M887.22,950.3c.45.58.92,1.13,1.42,1.68.19.21.38.4.58.6.12.06.24.12.36.18.38.18.76.35,1.14.52-.2-.2-.39-.4-.58-.6-.5-.54-.98-1.09-1.43-1.66-.37-.15-.74-.31-1.1-.48-.13-.06-.26-.14-.39-.23Z"/>
              <path className="cls-477" d="M884.11,945.43c.55,1.07,1.16,2.1,1.82,3.1.4.61.83,1.2,1.28,1.77.13.09.26.17.39.23.37.17.73.33,1.1.48-.45-.57-.89-1.16-1.3-1.77-.68-1-1.3-2.04-1.86-3.12-.33-.13-.66-.27-.99-.41-.15-.06-.3-.17-.45-.3Z"/>
              <path className="cls-555" d="M881.3,938.01c.37,1.4.82,2.78,1.34,4.14.43,1.12.93,2.21,1.47,3.28.15.12.3.24.45.3.33.14.66.28.99.41-.56-1.08-1.07-2.18-1.51-3.32-.54-1.38-1.01-2.79-1.39-4.23-.28-.09-.56-.2-.83-.3-.17-.06-.35-.16-.52-.27Z"/>
              <path className="cls-502" d="M880.23,932.36c.06.48.12.96.19,1.43.22,1.41.51,2.82.88,4.22.17.11.34.21.52.27.28.1.55.21.83.3-.38-1.44-.69-2.89-.92-4.35-.08-.49-.14-.97-.2-1.45-.26-.06-.51-.12-.75-.2-.19-.06-.37-.13-.55-.22Z"/>
              <path className="cls-583" d="M879.94,929.07c.05.69.09,1.32.14,1.87.04.47.09.95.15,1.43.18.08.36.16.55.22.25.08.5.15.75.2-.06-.48-.11-.96-.15-1.44-.05-.56-.1-1.22-.15-1.92-.24-.04-.49-.09-.73-.15-.19-.05-.38-.12-.57-.19Z"/>
              <path className="cls-469" d="M879.7,925.01c.03.63.06,1.23.1,1.83.04.79.09,1.55.14,2.23.19.07.38.14.57.19.24.07.48.11.73.15-.05-.7-.09-1.49-.14-2.29-.04-.58-.07-1.18-.1-1.81-.23-.04-.47-.08-.71-.14-.19-.05-.39-.11-.58-.17Z"/>
              <path className="cls-551" d="M878.7,696.65c0,60.02.01,116.84.02,150.77,0,10.65,0,19.64.02,26.55.03,14.68.35,36.84.88,49.11.03.67.06,1.3.09,1.93.19.07.39.13.58.17.24.05.47.1.71.14-.04-.63-.06-1.27-.1-1.94-.64-12.66-.95-35.47-.96-50.96,0-6.99,0-15.86,0-26.26-.01-35.51-.02-95.27-.03-157.82-.23,4.69-.46,9.38-.7,12.63-.18.81-.35-1.76-.51-4.33Z"/>
              <path className="cls-518" d="M878.6,447.21c-.02,1.62-.03,3.25-.04,4.88-.12,19.91.11,74.76.12,139.58,0,33.45,0,69.77.01,104.98.17,2.57.34,5.14.51,4.33.24-3.25.47-7.94.7-12.63-.01-100.62-.03-208.03-.03-236.22,0-1.63,0-3.25,0-4.87-.22-1.54-.45-3.08-.67-3.06-.22.02-.42,1.52-.61,3.01Z"/>
              <path className="cls-342" d="M878.75,437.09c-.03,1.65-.08,3.44-.1,5.25-.02,1.62-.04,3.25-.05,4.88.19-1.5.39-2.99.61-3.01.22-.02.44,1.52.67,3.06,0-1.63,0-3.25,0-4.87,0-1.83,0-3.61,0-5.26-.22-.42-.45-.85-.67-.85-.21,0-.34.39-.46.8Z"/>
              <path className="cls-254" d="M878.65,432.19c.02.17.03.33.04.51.09,1.24.09,2.74.06,4.39.12-.4.25-.8.46-.8.22,0,.44.42.67.85,0-1.64,0-3.14,0-4.41,0-.18,0-.36,0-.53-.22-.1-.45-.19-.66-.19-.21,0-.38.09-.56.18Z"/>
              <path className="cls-470" d="M878.6,431.71c.02.15.04.31.06.47.17-.09.35-.18.56-.18.22,0,.44.1.66.19v-.49c-.22,0-.45,0-.66,0-.21,0-.41,0-.61,0Z"/>
              <path className="cls-446" d="M894.21,957.87c.39.37.76.73,1.13,1.05.39.24.78.47,1.17.69.29.16.58.32.86.48-.42-.37-.86-.76-1.32-1.17-.26-.14-.52-.28-.78-.43-.35-.2-.71-.41-1.06-.62Z"/>
              <path className="cls-369" d="M892.11,955.88c.3.3.61.6.91.87.4.37.8.75,1.19,1.12.35.22.71.42,1.06.62.26.15.52.29.78.43-.46-.41-.92-.84-1.4-1.26-.36-.32-.73-.65-1.09-.99-.21-.11-.41-.21-.62-.33-.28-.15-.56-.31-.83-.47Z"/>
              <path className="cls-431" d="M890.53,954.33c.22.23.44.46.67.67.3.28.61.58.91.88.28.16.55.32.83.47.21.11.41.22.62.33-.36-.33-.73-.67-1.09-1-.27-.25-.54-.5-.81-.75-.16-.08-.32-.16-.49-.25-.22-.11-.44-.23-.65-.34Z"/>
              <path className="cls-246" d="M889.42,953.21c.15.15.3.31.45.46.22.21.44.44.66.67.21.12.43.23.65.34.16.08.32.17.49.25-.27-.25-.53-.5-.79-.75-.18-.17-.36-.34-.54-.51-.13-.06-.26-.13-.39-.19-.18-.09-.35-.18-.53-.27Z"/>
              <path className="cls-292" d="M888.36,952.11c.2.22.41.43.62.65.14.14.29.3.44.45.17.09.35.18.53.27.13.06.26.13.39.19-.18-.17-.35-.34-.52-.5-.2-.2-.4-.39-.6-.58-.12-.06-.24-.13-.36-.19-.16-.09-.33-.18-.49-.28Z"/>
              <path className="cls-218" d="M886.28,949.65c.47.61.96,1.22,1.47,1.81.2.23.4.44.6.66.16.09.33.19.49.28.12.07.24.13.36.19-.2-.2-.39-.39-.58-.6-.5-.54-.97-1.1-1.42-1.68-.13-.09-.26-.19-.39-.26-.18-.11-.36-.25-.54-.39Z"/>
              <path className="cls-436" d="M883.07,944.56c.57,1.09,1.2,2.16,1.89,3.21.42.64.86,1.26,1.33,1.88.18.15.37.29.54.39.13.08.26.17.39.26-.45-.58-.88-1.17-1.28-1.77-.67-1-1.28-2.03-1.82-3.1-.15-.12-.3-.25-.44-.34-.2-.12-.4-.32-.6-.53Z"/>
              <path className="cls-543" d="M880.14,937.12c.39,1.38.85,2.75,1.4,4.11.45,1.12.96,2.23,1.53,3.32.2.21.41.41.6.53.14.09.29.22.44.34-.55-1.07-1.04-2.16-1.47-3.28-.53-1.36-.98-2.74-1.34-4.14-.17-.11-.34-.23-.5-.34-.22-.14-.44-.34-.66-.55Z"/>
              <path className="cls-534" d="M878.99,931.63c.06.46.14.92.21,1.38.24,1.36.55,2.73.93,4.11.22.21.43.41.66.55.16.1.33.23.5.34-.37-1.4-.66-2.81-.88-4.22-.07-.47-.14-.96-.19-1.43-.18-.08-.36-.18-.54-.28-.24-.14-.47-.29-.7-.45Z"/>
              <path className="cls-329" d="M878.65,928.52c.05.63.11,1.23.16,1.75.05.45.11.91.17,1.36.23.16.46.31.7.45.18.1.35.2.54.28-.06-.48-.1-.96-.15-1.43-.05-.54-.1-1.18-.14-1.87-.19-.07-.37-.15-.55-.22-.25-.09-.49-.21-.73-.33Z"/>
              <path className="cls-476" d="M878.36,924.53c.04.67.08,1.33.14,2,.05.68.1,1.36.15,1.99.24.12.49.24.73.33.18.07.37.15.55.22-.05-.69-.09-1.44-.14-2.23-.04-.6-.07-1.2-.1-1.83-.19-.07-.39-.13-.57-.19-.26-.08-.51-.18-.77-.29Z"/>
              <path className="cls-580" d="M877.58,683.62c-.01,51.6-.02,103.61,0,147.55,0,2.42,0,4.82,0,7.19.01,35.31-.12,64.95.68,84.18.03.67.06,1.33.1,2,.25.1.51.21.77.29.19.06.38.13.57.19-.03-.63-.06-1.26-.09-1.93-.53-12.27-.84-34.43-.88-49.11-.02-6.91-.02-15.9-.02-26.55,0-33.93-.01-90.74-.02-150.77-.17-2.57-.33-5.15-.51-4.36-.22-2.99-.42-5.84-.61-8.68Z"/>
              <path className="cls-189" d="M877.46,450.25c0,2.48-.02,4.97-.02,7.45-.07,27.87.17,77.55.16,134.76,0,29.01-.01,59.99-.02,91.16.19,2.84.38,5.69.61,8.68.17-.79.34,1.79.51,4.36,0-35.21,0-71.53-.01-104.98,0-64.82-.25-119.67-.12-139.58.01-1.62.02-3.25.04-4.88-.19,1.5-.39,2.99-.6,3.01-.21.02-.38.03-.54.02Z"/>
              <path className="cls-309" d="M877.56,437.92c0,1.63-.05,3.27-.06,4.88-.01,2.48-.03,4.97-.04,7.44.16,0,.33,0,.54-.02.21-.02.41-1.52.6-3.01.02-1.62.03-3.25.05-4.88.01-1.81.07-3.6.1-5.25-.12.4-.24.8-.45.81-.24,0-.49.02-.75.03Z"/>
              <path className="cls-382" d="M877.33,432.36c.03.22.06.46.08.7.13,1.6.16,3.23.15,4.86.25,0,.51-.02.75-.03.2,0,.32-.41.45-.81.03-1.65.03-3.15-.06-4.39-.01-.18-.03-.35-.04-.51-.17.09-.35.18-.54.18-.27,0-.52,0-.77,0Z"/>
              <path className="cls-523" d="M877.21,431.72c.05.2.09.42.13.64.25,0,.51.01.77,0,.2,0,.37-.09.54-.18-.02-.17-.03-.32-.06-.47-.2,0-.4,0-.6,0-.27,0-.53,0-.79,0Z"/>
              <path className="cls-138" d="M892.43,956.71c.32.32.64.64.96.91.27.19.53.38.8.56.38.26.77.51,1.16.75-.37-.32-.74-.68-1.13-1.05-.36-.22-.71-.44-1.06-.67-.24-.16-.49-.33-.73-.49Z"/>
              <path className="cls-621" d="M890.72,955.03c.24.25.48.5.73.72.33.31.66.64.98.96.24.17.49.33.73.49.35.23.7.45,1.06.67-.39-.37-.78-.76-1.19-1.12-.3-.27-.61-.57-.91-.87-.28-.16-.55-.32-.83-.49-.19-.12-.38-.24-.57-.36Z"/>
              <path className="cls-193" d="M889.44,953.71c.18.2.37.4.55.58.24.24.48.49.72.74.19.12.38.24.57.36.27.17.55.33.83.49-.3-.3-.61-.6-.91-.88-.23-.21-.45-.44-.67-.67-.21-.12-.43-.24-.64-.36-.15-.09-.3-.17-.44-.26Z"/>
              <path className="cls-419" d="M888.54,952.75c.12.13.24.27.36.39.18.18.36.38.54.58.15.09.29.17.44.26.21.12.43.24.64.36-.22-.23-.44-.46-.66-.67-.15-.15-.3-.3-.45-.46-.17-.09-.35-.18-.52-.27-.12-.06-.24-.13-.36-.19Z"/>
              <path className="cls-612" d="M887.53,951.63c.21.25.43.49.65.73.12.12.24.25.36.39.12.06.24.13.36.19.17.09.35.18.52.27-.15-.15-.29-.31-.44-.45-.21-.22-.42-.43-.62-.65-.16-.09-.33-.19-.49-.29-.11-.07-.23-.13-.34-.2Z"/>
              <path className="cls-361" d="M885.38,948.95c.48.65.99,1.3,1.52,1.94.2.24.42.49.63.74.11.07.23.13.34.2.16.1.33.19.49.29-.2-.22-.4-.43-.6-.66-.51-.59-1.01-1.19-1.47-1.81-.18-.15-.36-.3-.54-.41-.12-.08-.25-.18-.37-.28Z"/>
              <path className="cls-468" d="M882.08,943.63c.58,1.12,1.22,2.24,1.93,3.34.43.67.89,1.33,1.37,1.98.12.1.25.2.37.28.17.12.36.27.54.41-.47-.61-.91-1.24-1.33-1.88-.69-1.05-1.32-2.12-1.89-3.21-.2-.21-.4-.42-.59-.56-.13-.1-.27-.24-.4-.37Z"/>
              <path className="cls-113" d="M879.07,936.12c.4,1.36.88,2.74,1.44,4.11.46,1.13.98,2.26,1.56,3.39.13.14.27.28.4.37.19.14.39.35.59.56-.57-1.09-1.08-2.2-1.53-3.32-.55-1.36-1.02-2.74-1.4-4.11-.22-.21-.43-.43-.63-.59-.14-.12-.29-.26-.43-.41Z"/>
              <path className="cls-539" d="M877.85,930.8c.07.43.16.86.24,1.3.26,1.32.58,2.66.98,4.02.14.14.28.29.43.41.21.17.42.38.63.59-.39-1.38-.7-2.75-.93-4.11-.08-.46-.15-.92-.21-1.38-.23-.16-.46-.33-.68-.49-.15-.12-.31-.23-.46-.35Z"/>
              <path className="cls-374" d="M877.46,927.94c.06.55.12,1.08.19,1.58.06.43.13.85.2,1.28.15.11.3.23.46.35.22.17.45.33.68.49-.06-.46-.12-.92-.17-1.36-.06-.52-.11-1.12-.16-1.75-.24-.12-.48-.24-.71-.35-.16-.07-.32-.16-.48-.24Z"/>
              <path className="cls-403" d="M877.12,924.03c.05.72.11,1.46.19,2.21.05.58.1,1.15.16,1.69.16.08.32.17.48.24.23.1.47.23.71.35-.05-.63-.1-1.3-.15-1.99-.06-.67-.1-1.34-.14-2-.25-.1-.5-.21-.74-.3-.17-.06-.34-.13-.5-.2Z"/>
              <path className="cls-354" d="M876.51,674.95c0,55.77,0,112.48.02,159.5,0,2.18,0,4.34,0,6.48,0,33.93-.3,62.36.46,81,.03.67.07,1.37.12,2.09.17.07.34.14.5.2.24.09.49.19.74.3-.04-.67-.07-1.33-.1-2-.81-19.23-.67-48.86-.68-84.18,0-2.37,0-4.77,0-7.19-.02-43.95,0-95.96,0-147.55-.19-2.84-.38-5.66-.58-8.59-.17-.04-.33-.06-.49-.07Z"/>
              <path className="cls-325" d="M876.33,450.17c.02,2.48.05,4.95.06,7.42.12,40.68.13,127.81.13,217.37.16.02.33.03.49.07.21,2.94.39,5.76.58,8.59,0-31.17.02-62.16.02-91.16,0-57.22-.24-106.9-.16-134.76,0-2.48.01-4.97.02-7.45-.16,0-.32-.02-.51-.05-.2-.04-.41-.03-.62-.03Z"/>
              <path className="cls-210" d="M876.45,437.77c0,1.68-.05,3.38-.09,4.97-.05,2.47-.05,4.95-.03,7.42.21,0,.42-.01.62.03.19.03.35.05.51.05,0-2.48.02-4.97.04-7.44,0-1.61.05-3.25.06-4.88-.25,0-.5,0-.72-.03-.18-.03-.29-.07-.4-.12Z"/>
              <path className="cls-93" d="M876.09,432.3c.05.2.08.42.11.65.19,1.5.25,3.15.25,4.83.11.05.22.09.4.12.22.03.46.04.72.03,0-1.63-.02-3.26-.15-4.86-.02-.24-.05-.48-.08-.7-.25,0-.5-.02-.74-.04-.17-.01-.34-.02-.5-.03Z"/>
              <path className="cls-573" d="M875.92,431.72c.06.18.12.37.16.57.17.01.34.02.5.03.25.02.49.03.74.04-.03-.22-.08-.44-.13-.64-.26,0-.51,0-.76,0-.17,0-.35,0-.52,0Z"/>
              <path className="cls-196" d="M890.8,955.51c.26.26.53.51.79.74.33.27.66.53.99.78.26.2.53.4.79.59-.31-.27-.63-.59-.96-.91-.24-.17-.48-.34-.72-.52-.3-.22-.6-.45-.9-.69Z"/>
              <path className="cls-549" d="M889.44,954.15c.19.2.37.39.57.58.26.25.53.52.79.77.3.24.6.46.9.69.24.17.48.35.72.52-.32-.32-.65-.65-.98-.96-.25-.23-.49-.48-.73-.72-.19-.12-.38-.25-.57-.38-.24-.16-.47-.33-.71-.5Z"/>
              <path className="cls-136" d="M888.45,953.09c.14.16.29.32.43.47.19.2.37.39.56.59.23.17.47.34.71.5.19.13.38.25.57.38-.24-.25-.48-.5-.72-.74-.19-.18-.37-.38-.55-.58-.15-.09-.29-.18-.44-.27-.19-.12-.37-.23-.55-.35Z"/>
              <path className="cls-249" d="M887.74,952.3c.09.11.19.22.29.32.14.15.28.31.43.47.18.12.37.24.55.35.15.09.29.18.44.27-.18-.2-.36-.4-.54-.58-.12-.12-.24-.26-.36-.39-.12-.06-.24-.13-.36-.19-.15-.08-.3-.17-.45-.25Z"/>
              <path className="cls-316" d="M886.78,951.19c.22.26.45.54.68.79.09.1.19.21.28.32.15.08.3.17.45.25.12.07.24.13.36.19-.12-.13-.24-.27-.36-.39-.22-.24-.44-.49-.65-.73-.11-.07-.22-.13-.33-.2-.14-.08-.28-.16-.41-.24Z"/>
              <path className="cls-471" d="M884.56,948.34c.49.69,1.01,1.37,1.56,2.05.21.26.43.53.65.8.14.08.28.16.41.24.11.06.22.13.33.2-.21-.25-.43-.5-.63-.74-.53-.64-1.04-1.28-1.52-1.94-.12-.1-.25-.2-.36-.27-.15-.1-.3-.22-.45-.33Z"/>
              <path className="cls-375" d="M881.19,942.82c.59,1.15,1.25,2.3,1.97,3.45.44.69.91,1.39,1.4,2.08.15.11.3.24.45.33.12.08.24.17.36.27-.48-.65-.94-1.32-1.37-1.98-.71-1.1-1.35-2.22-1.93-3.34-.13-.14-.27-.27-.39-.36-.16-.11-.32-.28-.49-.44Z"/>
              <path className="cls-436" d="M878.14,935.28c.41,1.34.9,2.72,1.47,4.1.47,1.14,1,2.29,1.59,3.44.16.16.33.33.49.44.13.09.26.23.39.36-.58-1.12-1.1-2.26-1.56-3.39-.56-1.38-1.04-2.75-1.44-4.11-.14-.14-.28-.29-.42-.39-.17-.14-.35-.3-.52-.45Z"/>
              <path className="cls-112" d="M876.86,930.08c.08.41.17.82.26,1.25.27,1.27.61,2.6,1.02,3.94.17.15.34.32.52.45.14.11.28.25.42.39-.4-1.36-.72-2.71-.98-4.02-.09-.44-.17-.87-.24-1.3-.15-.11-.3-.23-.45-.33-.19-.13-.37-.26-.55-.38Z"/>
              <path className="cls-580" d="M876.43,927.42c.06.48.13.95.21,1.44.07.41.14.81.22,1.22.18.12.36.24.55.38.15.11.3.22.45.33-.07-.43-.14-.85-.2-1.28-.07-.5-.13-1.03-.19-1.58-.16-.08-.31-.16-.47-.23-.19-.09-.38-.19-.57-.28Z"/>
              <path className="cls-444" d="M876.03,923.61c.06.76.13,1.56.23,2.37.05.49.11.96.17,1.44.19.09.38.19.57.28.15.07.31.15.47.23-.06-.55-.11-1.11-.16-1.69-.08-.75-.14-1.49-.19-2.21-.17-.07-.33-.14-.49-.2-.2-.07-.4-.15-.6-.23Z"/>
              <path className="cls-108" d="M875.53,684.61c.06,67.3.12,133.97.15,178.44.02,26.21-.16,46.06.16,55.91.01.77.03,1.61.07,2.49.03.67.07,1.4.13,2.16.2.08.4.16.6.23.16.06.32.13.49.2-.05-.72-.09-1.43-.12-2.09-.76-18.64-.46-47.07-.46-81,0-2.14,0-4.3,0-6.48-.03-47.02-.03-103.73-.02-159.5-.16-.01-.32-.03-.47-.08-.17,3.55-.34,6.64-.51,9.73Z"/>
              <path className="cls-551" d="M875.2,443.51c.01,1.67.04,3.43.05,5.25.08,30.6.19,133.88.28,235.85.17-3.09.34-6.18.51-9.73.15.05.31.06.47.08,0-89.56,0-176.68-.13-217.37,0-2.47-.04-4.95-.06-7.42-.21,0-.42,0-.6-.06-.2-2.21-.37-4.4-.53-6.6Z"/>
              <path className="cls-582" d="M875.37,435.76c-.01,1.02-.08,2.07-.12,3-.06,1.49-.06,3.08-.05,4.75.16,2.19.33,4.38.53,6.6.19.06.39.06.6.06-.02-2.48-.02-4.95.03-7.42.03-1.59.09-3.29.09-4.97-.11-.05-.21-.1-.37-.15-.2-.67-.46-1.27-.71-1.86Z"/>
              <path className="cls-143" d="M875.02,432.29c.06.2.11.4.15.61.18.84.21,1.84.2,2.86.25.59.51,1.18.71,1.86.16.05.26.11.37.15,0-1.68-.06-3.33-.25-4.83-.03-.22-.06-.45-.11-.65-.17-.01-.33-.03-.48-.05-.21.02-.4.03-.58.04Z"/>
              <path className="cls-316" d="M874.82,431.73c.08.18.14.37.2.56.19-.01.38-.02.58-.04.15.02.32.04.48.05-.05-.2-.1-.4-.16-.57-.17,0-.34,0-.5,0-.21,0-.41,0-.61,0Z"/>
              <path className="cls-461" d="M889.92,954.78c.23.22.46.43.7.64.32.28.65.56.98.83-.26-.23-.53-.49-.79-.74-.3-.24-.59-.48-.88-.72Z"/>
              <path className="cls-178" d="M888.75,953.63c.16.17.33.34.5.5.22.22.45.44.68.65.29.24.58.49.88.72-.26-.26-.53-.52-.79-.77-.2-.19-.38-.38-.57-.58-.23-.17-.47-.34-.7-.52Z"/>
              <path className="cls-610" d="M887.9,952.72c.12.13.24.26.36.4.16.17.32.34.49.51.23.18.46.35.7.52-.19-.2-.37-.39-.56-.59-.15-.15-.29-.31-.43-.47-.18-.12-.37-.24-.55-.37Z"/>
              <path className="cls-351" d="M887.3,952.05c.08.09.16.18.24.28.12.13.24.26.36.4.18.13.37.25.55.37-.14-.16-.29-.32-.43-.47-.1-.1-.19-.21-.29-.32-.15-.08-.29-.17-.44-.25Z"/>
              <path className="cls-616" d="M886.37,950.97c.22.27.45.54.68.8.08.09.16.18.24.28.15.09.29.17.44.25-.09-.11-.19-.22-.28-.32-.23-.26-.46-.53-.68-.79-.14-.08-.27-.15-.4-.22Z"/>
              <path className="cls-123" d="M884.13,948.05c.5.71,1.03,1.41,1.59,2.11.21.27.43.54.66.81.13.07.27.15.4.22-.22-.26-.44-.54-.65-.8-.55-.68-1.07-1.36-1.56-2.05-.15-.11-.3-.22-.43-.29Z"/>
              <path className="cls-391" d="M880.72,942.43c.6,1.16,1.26,2.33,1.99,3.49.45.71.92,1.42,1.42,2.12.14.07.28.18.43.29-.49-.69-.96-1.38-1.4-2.08-.73-1.14-1.38-2.3-1.97-3.45-.16-.16-.32-.31-.47-.39Z"/>
              <path className="cls-197" d="M877.64,934.9c.42,1.33.91,2.69,1.48,4.08.47,1.14,1,2.29,1.6,3.45.15.08.31.23.47.39-.59-1.15-1.12-2.3-1.59-3.44-.57-1.38-1.06-2.76-1.47-4.1-.17-.15-.34-.29-.5-.38Z"/>
              <path className="cls-349" d="M876.33,929.78c.08.41.17.83.27,1.25.28,1.25.63,2.55,1.04,3.88.17.08.33.22.5.38-.41-1.34-.75-2.66-1.02-3.94-.09-.43-.18-.84-.26-1.25-.18-.12-.36-.22-.53-.31Z"/>
              <path className="cls-499" d="M875.88,927.17c.07.46.14.92.22,1.39.07.4.15.8.23,1.21.17.09.35.19.53.31-.08-.41-.16-.81-.22-1.22-.08-.48-.15-.95-.21-1.44-.19-.09-.37-.18-.55-.25Z"/>
              <path className="cls-136" d="M875.46,923.4c.06.77.14,1.58.24,2.43.05.44.11.88.18,1.34.18.07.36.16.55.25-.06-.48-.12-.96-.17-1.44-.09-.81-.17-1.62-.23-2.37-.2-.08-.39-.15-.57-.2Z"/>
              <path className="cls-290" d="M875.05,694.38c.12,113.05.23,221.17.23,224.04,0,.81,0,1.77.05,2.82.03.67.07,1.39.13,2.16.18.05.37.12.57.2-.06-.76-.1-1.49-.13-2.16-.04-.88-.05-1.72-.07-2.49-.32-9.85-.14-29.69-.16-55.91-.03-44.47-.09-111.14-.15-178.44-.17,3.09-.33,6.19-.48,9.77Z"/>
              <path className="cls-608" d="M874.7,436.92c0,.87,0,1.9.01,3.09.07,20.54.22,139.98.34,254.37.15-3.57.31-6.67.48-9.77-.1-101.97-.21-205.25-.28-235.85,0-1.83-.03-3.58-.05-5.25-.16-2.19-.32-4.38-.5-6.59Z"/>
              <path className="cls-139" d="M874.68,433.9c0,.31,0,.62,0,.92,0,.52,0,1.22,0,2.09.18,2.21.34,4.4.5,6.59-.01-1.67,0-3.26.05-4.75.04-.93.1-1.97.12-3-.25-.59-.5-1.18-.68-1.86Z"/>
              <path className="cls-372" d="M874.46,432.33c.06.21.11.43.15.66.05.3.07.61.07.92.19.67.43,1.26.68,1.86.01-1.02-.02-2.02-.2-2.86-.04-.21-.09-.42-.15-.61-.19.01-.37.02-.56.04Z"/>
              <path className="cls-159" d="M874.24,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
            </g>
            <g>
              <path className="cls-157" d="M874.24,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M874.24,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M874.24,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M874.24,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M874.24,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M874.24,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M874.24,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M874.24,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M874.24,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M874.24,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M874.24,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M874.24,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M874.24,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M874.24,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M874.24,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M874.24,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
            </g>
            <g>
              <path className="cls-157" d="M874.24,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M874.24,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M874.24,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M874.24,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M874.24,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M874.24,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M874.24,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M874.24,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M874.24,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M874.24,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M874.24,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M874.24,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M874.24,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M874.24,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M874.24,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
            </g>
          </g>
          <g id="MeshGrid-3" data-name="MeshGrid">
            <g>
              <path className="cls-159" d="M965.81,431.28c-.08.15-.16.3-.22.45.12,0,.23,0,.34,0,.07-.15.15-.29.23-.43-.11,0-.23-.01-.36-.02Z"/>
              <path className="cls-338" d="M966.49,430.38c-.15.15-.28.31-.41.48-.1.14-.19.28-.27.42.12,0,.24,0,.36.02.09-.14.18-.27.28-.39.12-.16.26-.3.4-.44-.11-.03-.23-.06-.36-.09Z"/>
              <path className="cls-573" d="M967.61,429.58c-.24.12-.45.25-.65.39-.17.12-.33.26-.47.41.13.03.25.06.36.09.15-.14.3-.26.47-.38.2-.14.41-.27.63-.38-.1-.04-.21-.08-.34-.12Z"/>
              <path className="cls-615" d="M968.79,429.11c-.15.04-.29.09-.43.14-.26.1-.52.2-.75.32.12.04.24.08.34.12.22-.11.46-.22.7-.3.13-.05.26-.09.4-.13-.08-.05-.17-.1-.26-.16Z"/>
              <path className="cls-255" d="M971.23,428.68c-.67.06-1.35.15-2,.3-.15.04-.3.08-.44.12.09.05.18.1.26.16.14-.04.28-.08.42-.11.7-.16,1.42-.23,2.15-.28-.13-.06-.26-.13-.39-.2Z"/>
              <path className="cls-412" d="M974.68,428.44c-.47.04-.95.08-1.42.11-.67.05-1.36.08-2.03.14.13.07.26.14.39.2.73-.04,1.46-.06,2.17-.11.52-.03,1.05-.07,1.58-.12-.23-.07-.45-.14-.7-.22Z"/>
              <path className="cls-494" d="M977.34,428.09c-.39.07-.82.14-1.27.19-.45.06-.93.11-1.39.15.24.08.47.15.7.22.53-.04,1.05-.09,1.56-.15.54-.06,1.06-.13,1.53-.21-.31-.08-.71-.14-1.13-.21Z"/>
              <path className="cls-454" d="M979.26,427.37c-.2.19-.5.34-.87.46-.31.1-.66.19-1.05.26.42.06.82.13,1.13.21.47-.08.9-.17,1.25-.27.45-.13.79-.27.97-.44-.41-.09-.91-.15-1.42-.22Z"/>
              <path className="cls-625" d="M979.81,426.21c-.03.13-.07.25-.11.36-.09.24-.18.45-.3.63-.04.06-.09.12-.14.17.51.06,1.01.13,1.42.22.06-.06.11-.12.13-.18.07-.19.15-.4.21-.63.04-.13.07-.27.11-.41-.42-.06-.87-.11-1.32-.16Z"/>
              <path className="cls-379" d="M980,425.52c-.04.1-.08.21-.1.3-.02.14-.05.27-.09.39.46.05.9.1,1.32.16.03-.14.06-.28.08-.43.01-.09.03-.17.04-.26-.39-.06-.82-.12-1.26-.17Z"/>
              <path className="cls-295" d="M980.22,425c-.02.07-.05.15-.08.22-.04.1-.1.21-.14.31.44.05.86.1,1.26.17.01-.09.02-.17.03-.26,0-.06,0-.13.01-.19-.35-.09-.7-.17-1.08-.24Z"/>
              <path className="cls-182" d="M980.31,424.51c-.02.09-.05.19-.05.28,0,.07-.02.14-.04.21.37.07.72.14,1.08.24,0-.06,0-.12,0-.19,0-.08,0-.17,0-.25-.32-.12-.64-.21-.98-.29Z"/>
              <path className="cls-192" d="M980.36,423.81c-.01.13-.05.29-.02.42.02.09,0,.18-.02.27.34.08.66.18.98.29,0-.08-.01-.16-.02-.24-.02-.12-.04-.24-.07-.36-.26-.16-.54-.28-.84-.39Z"/>
              <path className="cls-171" d="M980.32,423.28s.01.09.03.13c.05.12.02.26,0,.4.31.11.58.23.84.39-.03-.12-.07-.23-.11-.34-.02-.04-.03-.08-.05-.11-.22-.19-.45-.34-.72-.47Z"/>
              <path className="cls-171" d="M980.28,423s.02.1.03.15c0,.04,0,.09.02.13.27.12.5.28.72.47-.02-.04-.04-.07-.06-.11-.02-.04-.05-.08-.08-.12-.19-.21-.39-.38-.63-.51Z"/>
              <path className="cls-566" d="M980.21,422.86s.05.09.07.14c.24.14.43.31.63.51-.03-.04-.06-.08-.09-.12-.18-.22-.37-.39-.6-.54Z"/>
              <path className="cls-144" d="M965.07,431.24c-.07.16-.13.32-.18.48.12,0,.23,0,.35,0,.12,0,.24,0,.35,0,.06-.15.14-.3.22-.45-.12,0-.25,0-.37-.02-.12,0-.24-.01-.37-.02Z"/>
              <path className="cls-151" d="M965.7,430.2c-.14.17-.27.36-.38.56-.09.16-.17.32-.24.48.13,0,.25,0,.37.02.12,0,.25.01.37.02.08-.15.17-.29.27-.42.12-.17.26-.33.41-.48-.13-.03-.26-.06-.39-.09-.13-.03-.26-.05-.4-.08Z"/>
              <path className="cls-556" d="M966.85,429.33c-.26.13-.5.27-.69.42-.16.13-.32.28-.46.46.14.03.28.06.4.08.13.03.26.06.39.09.15-.15.31-.29.47-.41.19-.14.41-.27.65-.39-.12-.04-.25-.08-.37-.13-.12-.04-.25-.08-.39-.12Z"/>
              <path className="cls-349" d="M968.18,428.79c-.16.05-.32.11-.48.17-.3.11-.59.24-.85.37.14.04.27.08.39.12.12.05.25.09.37.13.24-.12.49-.23.75-.32.14-.05.28-.1.43-.14-.09-.05-.19-.1-.3-.16-.1-.05-.21-.11-.32-.16Z"/>
              <path className="cls-415" d="M970.27,428.3c-.54.08-1.08.19-1.6.34-.16.05-.33.1-.49.16.11.05.22.1.32.16.1.06.2.11.3.16.15-.04.29-.09.44-.12.65-.16,1.33-.25,2-.3-.13-.07-.28-.14-.45-.21-.17-.06-.34-.12-.51-.18Z"/>
              <path className="cls-503" d="M973,427.98c-.36.04-.72.08-1.09.12-.55.06-1.1.12-1.64.2.17.06.34.11.51.18.17.07.31.14.45.21.67-.06,1.36-.09,2.03-.14.47-.03.95-.07,1.42-.11-.24-.08-.51-.16-.8-.23-.29-.07-.58-.15-.88-.22Z"/>
              <path className="cls-166" d="M975,427.63c-.28.07-.59.13-.93.2-.35.07-.71.11-1.07.16.3.07.59.15.88.22.29.08.55.15.8.23.47-.04.94-.09,1.39-.15.45-.06.88-.12,1.27-.19-.42-.06-.85-.13-1.24-.21-.36-.07-.72-.16-1.1-.25Z"/>
              <path className="cls-195" d="M976.41,426.93c-.19.19-.4.33-.65.45-.22.1-.47.18-.76.25.37.09.74.18,1.1.25.39.08.82.15,1.24.21.39-.07.75-.16,1.05-.26.37-.12.67-.27.87-.46-.51-.06-1.05-.12-1.53-.2-.42-.06-.87-.15-1.32-.24Z"/>
              <path className="cls-340" d="M976.97,425.93c-.03.1-.07.2-.1.29-.12.3-.27.53-.46.72.45.09.9.19,1.32.24.48.08,1.01.14,1.53.2.06-.05.11-.11.14-.17.11-.18.21-.39.3-.63.04-.12.08-.23.11-.36-.46-.05-.93-.1-1.42-.14-.46-.04-.94-.1-1.42-.14Z"/>
              <path className="cls-611" d="M977.25,425.27c-.06.11-.16.22-.19.33-.03.12-.05.22-.09.33.48.05.96.1,1.42.14.49.05.96.09,1.42.14.03-.13.06-.26.09-.39.02-.09.06-.2.1-.3-.44-.05-.9-.09-1.36-.13-.45-.04-.91-.08-1.39-.12Z"/>
              <path className="cls-164" d="M977.65,424.7c-.04.08-.11.16-.16.24-.07.11-.19.22-.25.33.48.04.94.08,1.39.12.46.04.92.09,1.36.13.04-.1.09-.21.14-.31.03-.07.06-.15.08-.22-.37-.07-.76-.12-1.2-.17-.42-.05-.87-.09-1.37-.13Z"/>
              <path className="cls-601" d="M977.85,424.15c-.03.11-.09.21-.1.32-.01.08-.06.15-.1.23.49.04.95.08,1.37.13.43.05.83.11,1.2.17.02-.07.04-.14.04-.21,0-.09.03-.19.05-.28-.34-.08-.71-.15-1.12-.21-.4-.06-.84-.1-1.34-.15Z"/>
              <path className="cls-398" d="M977.94,423.36c-.02.16-.1.32-.05.48.03.1-.02.21-.04.31.5.05.93.1,1.34.15.41.06.78.12,1.12.21.02-.09.04-.19.02-.27-.02-.14.01-.29.02-.42-.31-.11-.65-.19-1.05-.26-.39-.07-.83-.13-1.37-.19Z"/>
              <path className="cls-483" d="M977.97,422.75c0,.05,0,.1.02.15.05.14-.03.29-.05.45.53.06.98.12,1.37.19.4.07.74.16,1.05.26.01-.13.04-.28,0-.4-.02-.04-.02-.09-.03-.13-.27-.13-.58-.22-.97-.31-.38-.08-.82-.15-1.37-.22Z"/>
              <path className="cls-483" d="M977.97,422.42c.02.06,0,.12,0,.18,0,.05,0,.1,0,.15.55.07,1,.14,1.37.22.39.09.7.18.97.31,0-.04,0-.09-.02-.13,0-.05-.01-.1-.03-.15-.24-.14-.53-.25-.91-.34-.37-.09-.83-.16-1.4-.24Z"/>
              <path className="cls-603" d="M977.9,422.26c.04.05.05.11.06.17.57.07,1.03.15,1.4.24.38.09.67.2.91.34-.02-.05-.03-.1-.07-.14-.24-.14-.52-.26-.9-.36-.37-.09-.82-.17-1.4-.25Z"/>
              <path className="cls-316" d="M964.65,431.2c-.06.17-.12.35-.16.52.02,0,.03,0,.05,0,.12,0,.24,0,.36,0,.05-.16.11-.32.18-.48-.13,0-.25,0-.38-.02-.02,0-.03-.01-.04-.03Z"/>
              <path className="cls-304" d="M965.21,430.1c-.13.18-.24.38-.34.59-.08.17-.16.34-.22.51.01.01.02.02.04.03.13,0,.25.01.38.02.07-.16.15-.33.24-.48.11-.2.24-.38.38-.56-.14-.03-.28-.06-.42-.08-.02,0-.04-.01-.07-.02Z"/>
              <path className="cls-329" d="M966.37,429.19c-.27.14-.52.28-.71.43-.17.14-.32.3-.45.48.02,0,.04.01.07.02.14.03.28.05.42.08.14-.17.3-.33.46-.46.19-.15.43-.29.69-.42-.14-.04-.28-.08-.42-.12-.02,0-.04-.01-.06-.01Z"/>
              <path className="cls-431" d="M967.77,428.61c-.17.06-.34.12-.51.19-.32.12-.62.25-.9.39.02,0,.04,0,.06.01.14.04.28.08.42.12.26-.13.55-.25.85-.37.16-.06.32-.12.48-.17-.11-.05-.23-.1-.35-.16-.02,0-.03-.01-.05-.02Z"/>
              <path className="cls-613" d="M969.63,428.13c-.45.08-.9.18-1.34.31-.17.06-.34.12-.51.18.02,0,.03,0,.05.02.12.05.24.11.35.16.16-.05.33-.11.49-.16.52-.15,1.06-.26,1.6-.34-.17-.06-.36-.11-.55-.17-.03,0-.06,0-.09,0Z"/>
              <path className="cls-442" d="M971.91,427.75c-.31.06-.62.11-.93.16-.45.07-.91.14-1.36.22.03,0,.07,0,.09,0,.2.06.38.11.55.17.54-.08,1.09-.14,1.64-.2.36-.04.73-.07,1.09-.12-.3-.07-.61-.14-.93-.21-.04,0-.1-.02-.16-.02Z"/>
              <path className="cls-418" d="M973.62,427.38c-.24.07-.5.13-.78.19-.31.07-.62.13-.93.19.06,0,.11.01.16.02.32.07.63.14.93.21.36-.04.72-.09,1.07-.16.34-.06.65-.13.93-.2-.37-.09-.75-.18-1.14-.25-.05,0-.15,0-.25,0Z"/>
              <path className="cls-402" d="M974.88,426.7c-.16.18-.37.32-.6.43-.2.1-.43.18-.67.25.1,0,.19,0,.25,0,.39.07.77.16,1.14.25.28-.07.53-.15.76-.25.25-.11.47-.26.65-.45-.45-.09-.91-.18-1.35-.22-.06,0-.12,0-.17,0Z"/>
              <path className="cls-477" d="M975.34,425.77c-.02.09-.05.18-.08.26-.08.28-.21.5-.38.67.06,0,.12,0,.17,0,.45.04.9.13,1.35.22.19-.19.33-.42.46-.72.04-.09.07-.18.1-.29-.48-.05-.97-.1-1.45-.13-.06,0-.12-.02-.19-.03Z"/>
              <path className="cls-161" d="M975.53,425.14c-.05.11-.1.23-.13.35-.02.1-.04.19-.06.28.06.01.12.02.19.03.48.03.97.08,1.45.13.03-.1.06-.21.09-.33.03-.11.12-.22.19-.33-.48-.04-.98-.07-1.5-.11-.07,0-.14,0-.21-.01Z"/>
              <path className="cls-286" d="M975.78,424.56c-.03.08-.06.16-.09.24-.05.11-.1.23-.15.34.07,0,.14,0,.21.01.52.04,1.02.07,1.5.11.06-.11.18-.22.25-.33.05-.08.12-.16.16-.24-.5-.04-1.03-.08-1.62-.12-.08,0-.17-.01-.26-.02Z"/>
              <path className="cls-618" d="M975.88,423.98c0,.11-.02.22-.04.33-.01.08-.04.16-.06.24.09,0,.17.01.26.02.59.04,1.12.08,1.62.12.04-.08.09-.16.1-.23.01-.1.07-.21.1-.32-.5-.05-1.05-.09-1.69-.14-.09,0-.18-.01-.28-.02Z"/>
              <path className="cls-481" d="M975.75,423.15c.03.16.05.33.1.5.03.11.03.22.03.33.09,0,.19.01.28.02.64.05,1.19.1,1.69.14.03-.11.07-.21.04-.31-.04-.16.03-.32.05-.48-.53-.06-1.15-.12-1.88-.18-.1,0-.21-.02-.32-.03Z"/>
              <path className="cls-92" d="M975.6,422.51c.02.05.03.11.05.16.05.15.07.31.1.47.11,0,.22.02.32.03.73.06,1.34.12,1.88.18.02-.16.09-.31.05-.45-.02-.05-.01-.1-.02-.15-.55-.07-1.21-.13-2.02-.21-.12-.01-.23-.02-.35-.03Z"/>
              <path className="cls-386" d="M975.47,422.17c.03.06.06.12.08.19.02.05.04.11.05.16.12.01.24.02.35.03.81.07,1.47.14,2.02.21,0-.05,0-.1,0-.15,0-.06,0-.12,0-.18-.57-.07-1.27-.14-2.12-.22-.12-.01-.25-.02-.38-.04Z"/>
              <path className="cls-605" d="M975.36,421.98c.05.06.08.12.11.18.13.01.26.02.38.04.85.08,1.54.15,2.12.22-.02-.06-.02-.11-.06-.17-.58-.08-1.29-.15-2.16-.23-.13-.01-.25-.02-.39-.04Z"/>
              <path className="cls-316" d="M964.25,431.19c-.06.18-.1.36-.14.54.11,0,.22,0,.33,0h.05c.04-.17.1-.35.16-.52-.01-.01-.02-.02-.04-.03-.12,0-.24,0-.36.01Z"/>
              <path className="cls-304" d="M964.74,430.02c-.12.19-.22.4-.3.63-.07.18-.14.36-.19.54.12,0,.24-.02.36-.01.02,0,.03.01.04.03.07-.17.14-.35.22-.51.09-.21.21-.41.34-.59-.02,0-.04-.01-.07-.02-.13-.02-.26-.05-.4-.07Z"/>
              <path className="cls-329" d="M965.91,429.07c-.28.14-.53.29-.72.45-.17.14-.32.31-.44.5.14.02.27.04.4.07.02,0,.04.01.07.02.13-.18.28-.34.45-.48.19-.15.43-.3.71-.43-.02,0-.04,0-.06-.01-.13-.04-.26-.07-.4-.11Z"/>
              <path className="cls-538" d="M967.37,428.45c-.18.07-.36.13-.53.2-.33.13-.65.27-.93.41.14.04.28.07.4.11.02,0,.04,0,.06.01.27-.14.58-.27.9-.39.17-.06.34-.13.51-.19-.02,0-.03,0-.05-.02-.11-.05-.23-.1-.36-.14Z"/>
              <path className="cls-613" d="M969.02,427.97c-.38.09-.75.18-1.12.29-.17.06-.35.13-.53.19.13.05.25.1.36.14.02,0,.03.01.05.02.17-.06.34-.12.51-.18.44-.13.89-.23,1.34-.31-.03,0-.07,0-.09,0-.17-.05-.34-.11-.52-.17Z"/>
              <path className="cls-396" d="M970.92,427.53c-.26.06-.52.13-.77.18-.38.09-.75.16-1.13.25.17.06.34.11.52.17.03,0,.06,0,.09,0,.45-.08.91-.15,1.36-.22.31-.05.62-.1.93-.16-.06,0-.11-.01-.16-.02-.28-.06-.56-.13-.83-.2Z"/>
              <path className="cls-418" d="M972.35,427.14c-.21.07-.42.13-.64.19-.26.07-.52.14-.78.2.27.07.55.14.83.2.04,0,.1.02.16.02.31-.06.62-.12.93-.19.27-.06.53-.12.78-.19-.1,0-.19,0-.25,0-.35-.06-.69-.15-1.03-.23Z"/>
              <path className="cls-290" d="M973.45,426.49c-.15.17-.32.3-.53.41-.18.1-.37.18-.58.25.34.08.67.16,1.03.23.05,0,.15,0,.25,0,.24-.07.47-.15.67-.25.23-.11.43-.25.6-.43-.06,0-.12,0-.18,0-.41-.05-.83-.13-1.26-.21Z"/>
              <path className="cls-371" d="M973.85,425.65c-.02.08-.04.16-.07.23-.07.25-.19.45-.33.61.42.08.85.16,1.26.21.06,0,.12,0,.18,0,.16-.18.29-.4.38-.67.03-.08.06-.17.08-.26-.06-.01-.12-.02-.19-.03-.43-.04-.87-.07-1.3-.1Z"/>
              <path className="cls-512" d="M974.03,425.05c-.05.12-.1.23-.13.35-.01.08-.03.16-.05.24.43.03.87.06,1.3.1.06,0,.12.02.19.03.02-.09.04-.18.06-.28.04-.12.08-.23.13-.35-.07,0-.14,0-.21-.01-.43-.03-.86-.05-1.29-.08Z"/>
              <path className="cls-619" d="M974.25,424.45c-.02.08-.05.17-.08.25-.04.12-.09.23-.14.35.43.03.86.05,1.29.08.08,0,.15,0,.21.01.05-.11.1-.23.15-.34.03-.08.07-.16.09-.24-.09,0-.18-.01-.26-.02-.42-.03-.84-.06-1.26-.09Z"/>
              <path className="cls-92" d="M974.38,423.87c-.02.11-.07.22-.08.33,0,.08-.02.17-.04.25.42.03.84.05,1.26.09.09,0,.18.01.26.02.03-.08.05-.16.06-.24.02-.11.04-.22.04-.33-.09,0-.19-.01-.29-.02-.28-.02-.57-.04-.86-.07-.12,0-.23-.02-.35-.02Z"/>
              <path className="cls-247" d="M974.25,423.03c.03.16.09.33.15.51.03.11,0,.22-.02.33.12,0,.24.02.35.02.29.02.58.04.86.07.1,0,.19.02.29.02,0-.11,0-.22-.03-.33-.05-.17-.08-.34-.1-.5-.11,0-.22-.02-.33-.03-.27-.02-.55-.05-.83-.07-.11,0-.22-.02-.34-.02Z"/>
              <path className="cls-497" d="M974.08,422.38c.02.05.03.11.05.17.04.16.08.32.12.48.12,0,.23.02.34.02.28.02.56.05.83.07.11,0,.23.02.33.03-.03-.16-.05-.32-.1-.47-.02-.06-.03-.11-.05-.16-.12-.01-.24-.02-.37-.03-.39-.03-.77-.07-1.15-.1Z"/>
              <path className="cls-589" d="M973.92,422.03c.04.06.07.13.1.19.02.05.04.11.06.16.38.03.76.06,1.15.1.13.01.25.02.37.03-.02-.05-.03-.11-.05-.16-.02-.06-.05-.13-.08-.19-.13-.01-.26-.02-.4-.04-.39-.04-.77-.07-1.15-.1Z"/>
              <path className="cls-135" d="M973.79,421.84c.05.06.09.12.13.19.38.03.76.06,1.15.1.13.01.27.02.4.04-.03-.06-.07-.12-.11-.18-.13-.01-.27-.03-.41-.04-.39-.04-.77-.07-1.16-.1Z"/>
              <path className="cls-573" d="M963.37,431.13c-.03.2-.06.4-.09.59.17,0,.33,0,.49,0,.11,0,.22,0,.34,0,.04-.17.08-.35.14-.54-.12,0-.25.02-.37.01-.18-.01-.34-.04-.51-.07Z"/>
              <path className="cls-284" d="M963.71,429.84c-.1.21-.18.44-.22.68-.05.19-.09.4-.13.6.17.03.33.06.51.07.12,0,.25,0,.37-.01.06-.18.12-.37.19-.54.08-.22.18-.43.3-.63-.14-.02-.28-.04-.41-.06-.2-.03-.41-.07-.62-.11Z"/>
              <path className="cls-105" d="M964.86,428.82c-.29.15-.55.31-.73.47-.17.16-.31.34-.41.55.21.04.42.08.62.11.14.02.28.04.41.06.12-.19.27-.36.44-.5.19-.15.44-.3.72-.45-.14-.04-.28-.07-.42-.11-.2-.05-.41-.1-.63-.14Z"/>
              <path className="cls-249" d="M966.38,428.14c-.19.08-.38.15-.56.23-.34.15-.68.3-.97.45.22.04.43.09.63.14.14.04.28.07.42.11.28-.14.6-.28.93-.41.17-.07.35-.14.53-.2-.13-.05-.26-.09-.39-.14-.19-.07-.39-.12-.6-.17Z"/>
              <path className="cls-279" d="M967.7,427.61c-.26.1-.49.2-.75.3-.19.08-.38.15-.57.23.21.05.42.11.6.17.13.05.26.09.39.14.18-.07.36-.13.53-.19.37-.12.74-.21,1.12-.29-.17-.06-.35-.11-.53-.17-.27-.08-.53-.14-.79-.19Z"/>
              <path className="cls-196" d="M968.93,427.1c-.17.07-.32.14-.49.21-.26.1-.49.2-.75.3.26.06.52.12.79.19.19.05.36.11.53.17.38-.09.75-.16,1.13-.25.26-.06.51-.12.77-.18-.27-.07-.55-.14-.83-.2-.41-.09-.79-.16-1.16-.23Z"/>
              <path className="cls-152" d="M969.86,426.65c-.14.08-.29.16-.46.23-.16.07-.31.15-.48.22.37.07.75.14,1.16.23.28.06.56.13.83.2.26-.06.52-.13.78-.2.22-.06.44-.12.64-.19-.34-.08-.67-.16-1.01-.22-.49-.08-.99-.18-1.47-.27Z"/>
              <path className="cls-515" d="M970.58,426.03c-.1.13-.21.25-.34.36-.11.1-.24.18-.38.26.48.1.99.2,1.47.27.34.06.67.14,1.01.22.21-.07.4-.15.58-.25.2-.11.38-.24.53-.41-.42-.08-.84-.16-1.23-.2-.55-.05-1.11-.16-1.64-.26Z"/>
              <path className="cls-440" d="M970.88,425.42c-.02.06-.04.11-.06.16-.07.17-.15.31-.25.45.53.1,1.09.21,1.64.26.39.05.81.12,1.23.2.15-.17.26-.37.33-.61.03-.07.05-.15.07-.23-.43-.03-.86-.06-1.27-.09-.59-.03-1.16-.09-1.7-.14Z"/>
              <path className="cls-188" d="M971.07,424.9c-.03.12-.1.23-.13.35-.02.06-.04.12-.06.17.54.05,1.11.1,1.7.14.41.03.84.06,1.27.09.02-.08.04-.16.05-.24.04-.12.08-.23.13-.35-.43-.03-.85-.05-1.26-.07-.59-.03-1.16-.06-1.7-.08Z"/>
              <path className="cls-399" d="M971.21,424.3c0,.08-.03.17-.04.25-.02.12-.07.23-.11.35.54.03,1.1.05,1.7.08.42.02.84.05,1.26.07.05-.12.1-.23.14-.35.03-.08.06-.17.08-.25-.42-.03-.83-.05-1.25-.07-.6-.03-1.2-.06-1.79-.08Z"/>
              <path className="cls-380" d="M971.27,423.72c0,.11-.08.22-.06.33.01.08,0,.17,0,.25.59.03,1.18.05,1.79.08.42.02.84.05,1.25.07.02-.08.04-.17.04-.25,0-.11.06-.22.08-.33-.4-.03-.81-.05-1.24-.07-.59-.03-1.22-.06-1.87-.08Z"/>
              <path className="cls-129" d="M971.1,422.88c.08.17.09.34.18.51.05.11,0,.22,0,.33.65.03,1.27.05,1.87.08.43.02.84.05,1.24.07.02-.11.05-.22.02-.33-.06-.17-.11-.34-.15-.51-.38-.03-.79-.05-1.2-.07-.59-.03-1.23-.06-1.95-.08Z"/>
              <path className="cls-23" d="M970.83,422.22c.04.06.05.11.08.17.09.16.11.32.19.49.72.03,1.36.05,1.95.08.41.02.81.04,1.2.07-.03-.16-.08-.33-.12-.48-.01-.06-.03-.11-.05-.17-.38-.03-.77-.06-1.15-.08-.59-.03-1.3-.06-2.1-.09Z"/>
              <path className="cls-90" d="M970.6,421.86c.06.06.08.13.13.19.04.06.06.11.1.17.81.03,1.51.06,2.1.09.39.02.77.05,1.15.08-.02-.05-.04-.11-.06-.16-.03-.06-.06-.13-.1-.19-.38-.03-.76-.06-1.15-.08-.59-.03-1.32-.06-2.17-.1Z"/>
              <path className="cls-215" d="M970.45,421.67c.06.06.1.13.15.19.85.03,1.58.06,2.17.1.39.02.77.05,1.15.08-.04-.06-.08-.12-.13-.19-.39-.03-.77-.06-1.16-.08-.59-.03-1.33-.06-2.18-.1Z"/>
              <path className="cls-2" d="M962.08,431.09c-.04.21-.08.42-.11.62.28,0,.55,0,.81,0,.17,0,.34,0,.5,0,.02-.19.05-.39.09-.59-.17-.03-.34-.06-.52-.06-.25,0-.51.01-.77.03Z"/>
              <path className="cls-581" d="M962.47,429.78c-.11.22-.19.45-.24.7-.06.2-.1.41-.15.62.26-.02.52-.03.77-.03.18,0,.35.03.52.06.03-.2.08-.41.13-.6.04-.24.11-.47.22-.68-.21-.04-.42-.07-.63-.1-.22,0-.42.02-.62.03Z"/>
              <path className="cls-557" d="M963.62,428.64c-.28.18-.53.37-.73.55-.17.18-.31.37-.42.59.2-.02.4-.03.62-.03.21.02.42.06.63.1.1-.21.24-.39.41-.55.19-.16.45-.32.73-.47-.22-.04-.44-.08-.66-.13-.21-.02-.39-.04-.57-.06Z"/>
              <path className="cls-417" d="M965.07,427.84c-.18.09-.36.18-.53.27-.33.17-.64.36-.92.54.18.02.36.04.57.06.22.04.44.08.66.13.29-.15.62-.3.97-.45.18-.08.37-.15.56-.23-.21-.05-.44-.1-.66-.15-.22-.05-.42-.1-.64-.15Z"/>
              <path className="cls-553" d="M966.13,427.3c-.18.1-.35.2-.51.28-.18.08-.36.17-.54.26.22.05.43.11.64.15.23.05.45.1.66.15.19-.08.38-.15.57-.23.26-.1.49-.21.75-.3-.26-.06-.52-.11-.79-.17-.25-.05-.51-.1-.77-.14Z"/>
              <path className="cls-501" d="M966.98,426.75c-.1.07-.21.15-.33.23-.17.11-.34.23-.52.33.27.04.52.09.77.14.28.06.53.11.79.17.26-.1.49-.2.75-.3.17-.07.32-.14.49-.21-.37-.07-.72-.13-1.07-.2-.3-.05-.59-.1-.88-.16Z"/>
              <path className="cls-570" d="M967.57,426.27c-.09.09-.19.18-.3.26-.09.07-.18.14-.29.21.29.05.58.11.88.16.35.07.7.13,1.07.2.17-.07.31-.14.48-.22.17-.08.32-.15.46-.23-.48-.1-.94-.19-1.33-.25-.31-.04-.64-.09-.96-.14Z"/>
              <path className="cls-321" d="M968.08,425.66c-.08.11-.16.22-.25.33-.08.1-.16.19-.26.28.32.05.65.1.96.14.39.06.85.15,1.33.25.14-.08.26-.17.38-.26.13-.11.24-.23.34-.36-.53-.1-1.04-.2-1.48-.24-.32-.03-.67-.08-1.02-.12Z"/>
              <path className="cls-198" d="M968.38,425.22s-.05.07-.07.1c-.08.11-.15.22-.23.33.35.05.7.1,1.02.12.44.04.95.14,1.48.24.1-.13.18-.28.25-.45.02-.05.04-.11.06-.16-.54-.05-1.05-.1-1.52-.12-.32-.02-.65-.04-.98-.07Z"/>
              <path className="cls-463" d="M968.52,424.78c0,.11-.03.23-.07.34-.02.03-.05.07-.07.1.33.02.66.05.98.07.47.02.98.07,1.52.12.02-.06.04-.11.06-.17.03-.12.1-.23.13-.35-.54-.03-1.06-.05-1.58-.07-.32-.02-.64-.03-.97-.04Z"/>
              <path className="cls-264" d="M968.47,424.19c.02.08.03.17.04.25.01.11.02.23,0,.34.32.01.65.03.97.04.51.02,1.04.05,1.58.07.03-.12.09-.23.11-.35.01-.08.04-.17.04-.25-.59-.03-1.17-.05-1.75-.07-.33-.01-.66-.03-.99-.04Z"/>
              <path className="cls-587" d="M968.32,423.62c.03.11.06.22.09.33.02.08.04.17.06.25.33,0,.66.02.99.04.58.02,1.16.05,1.75.07,0-.08.01-.17,0-.25-.02-.11.06-.22.06-.33-.65-.03-1.32-.05-2.01-.08-.31,0-.63-.02-.94-.02Z"/>
              <path className="cls-362" d="M967.89,422.78c.12.17.22.34.3.51.05.11.09.22.13.33.32,0,.63.01.94.02.69.03,1.36.05,2.01.08,0-.11.06-.22,0-.33-.09-.17-.1-.34-.18-.51-.72-.03-1.5-.05-2.37-.08-.28,0-.56,0-.84-.01Z"/>
              <path className="cls-359" d="M967.36,422.11c.05.06.1.12.15.17.14.16.26.33.38.5.28,0,.56,0,.84.01.87.03,1.65.06,2.37.08-.08-.17-.1-.33-.19-.49-.03-.06-.05-.11-.08-.17-.81-.03-1.71-.06-2.69-.09-.25,0-.51,0-.78-.01Z"/>
              <path className="cls-422" d="M967.02,421.74c.06.07.12.13.19.2.05.06.1.11.15.17.26,0,.52,0,.78.01.98.03,1.89.06,2.69.09-.04-.06-.05-.11-.1-.17-.05-.07-.07-.13-.13-.19-.85-.03-1.81-.07-2.85-.1-.24,0-.48-.01-.73-.02Z"/>
              <path className="cls-272" d="M966.83,421.54c.06.07.12.13.19.2.25,0,.49,0,.73.02,1.04.03,2.01.07,2.85.1-.06-.06-.09-.13-.15-.19-.86-.03-1.84-.07-2.91-.1-.23,0-.46-.01-.7-.02Z"/>
              <path className="cls-358" d="M960.91,431.13c-.08.19-.14.39-.2.58.14,0,.28,0,.41,0,.28,0,.56,0,.84,0,.03-.2.07-.42.11-.62-.26.02-.53.03-.79.04-.13,0-.25,0-.38,0Z"/>
              <path className="cls-344" d="M961.51,429.86c-.14.22-.25.45-.35.69-.09.19-.17.39-.25.58.13,0,.25,0,.38,0,.27,0,.53-.02.79-.04.04-.21.09-.42.15-.62.05-.25.13-.48.24-.7-.2.02-.4.04-.64.05-.11,0-.21.02-.32.03Z"/>
              <path className="cls-438" d="M962.7,428.61c-.27.21-.52.42-.73.63-.18.18-.33.39-.47.61.1-.01.21-.02.32-.03.23-.01.44-.03.64-.05.11-.22.25-.41.42-.59.2-.18.45-.37.73-.55-.18-.02-.38-.03-.61-.04-.11,0-.21,0-.31.01Z"/>
              <path className="cls-213" d="M964.03,427.69c-.16.1-.31.2-.47.31-.3.2-.59.41-.86.62.1-.01.2-.02.31-.01.24,0,.43.02.61.04.28-.18.6-.36.92-.54.17-.09.35-.18.53-.27-.22-.05-.45-.1-.7-.13-.12-.02-.23-.02-.34-.02Z"/>
              <path className="cls-568" d="M964.92,427.13c-.15.1-.29.2-.43.27-.15.09-.31.19-.47.29.11,0,.22,0,.34.02.25.03.48.08.7.13.18-.09.36-.17.54-.26.17-.08.33-.17.51-.28-.27-.04-.54-.08-.82-.12-.13-.02-.26-.03-.39-.05Z"/>
              <path className="cls-123" d="M965.62,426.58c-.08.07-.17.15-.27.22-.14.12-.28.23-.43.34.13.01.26.03.39.05.28.04.55.08.82.12.18-.1.35-.22.52-.33.12-.08.22-.15.33-.23-.29-.05-.59-.11-.89-.15-.15-.02-.31-.02-.47-.02Z"/>
              <path className="cls-214" d="M966.14,426.12c-.08.09-.18.17-.28.25-.07.06-.15.13-.24.21.16,0,.32,0,.47.02.31.04.6.09.89.15.1-.07.2-.15.29-.21.11-.08.21-.17.3-.26-.32-.05-.65-.09-.96-.13-.16-.01-.31-.02-.47-.02Z"/>
              <path className="cls-383" d="M966.61,425.56c-.07.1-.16.2-.24.3-.07.09-.15.18-.24.26.16,0,.31,0,.47.02.32.03.64.08.96.13.09-.09.18-.18.26-.28.09-.11.17-.22.25-.33-.35-.05-.7-.09-1.02-.11-.16,0-.3,0-.45,0Z"/>
              <path className="cls-164" d="M966.92,425.16s-.05.06-.07.09c-.08.1-.16.2-.23.3.15,0,.29-.02.45,0,.32.02.67.07,1.02.11.08-.11.16-.22.23-.33.02-.03.05-.07.07-.1-.33-.02-.66-.05-.98-.06-.16,0-.32,0-.49,0Z"/>
              <path className="cls-164" d="M967.05,424.74c0,.11-.02.22-.06.33-.03.03-.06.06-.08.09.17,0,.33,0,.49,0,.32.01.65.03.98.06.02-.03.05-.07.07-.1.04-.11.06-.23.07-.34-.32-.01-.65-.02-.97-.03-.16,0-.33,0-.5-.01Z"/>
              <path className="cls-93" d="M967,424.17c.01.08.03.16.04.24.01.11.02.22.01.33.17,0,.34,0,.5.01.32,0,.65.02.97.03,0-.11,0-.23,0-.34,0-.08-.02-.17-.04-.25-.33,0-.66-.01-.99-.02-.16,0-.32,0-.48,0Z"/>
              <path className="cls-430" d="M966.9,423.6c.02.11.03.22.06.33.02.08.04.16.05.24.16,0,.32,0,.48,0,.33,0,.66.01.99.02-.02-.08-.04-.17-.06-.25-.03-.11-.06-.22-.09-.33-.32,0-.63-.01-.95-.01-.15,0-.31,0-.47,0Z"/>
              <path className="cls-453" d="M966.6,422.77c.09.17.17.34.22.5.04.11.05.22.07.33.16,0,.32,0,.47,0,.31,0,.63,0,.95.01-.03-.11-.07-.22-.13-.33-.08-.17-.18-.34-.3-.51-.28,0-.56,0-.85-.01-.14,0-.29,0-.44,0Z"/>
              <path className="cls-125" d="M966.17,422.1c.04.06.08.12.12.18.11.16.22.33.31.5.15,0,.3,0,.44,0,.28,0,.57,0,.85.01-.12-.17-.24-.33-.38-.5-.05-.06-.1-.12-.15-.17-.26,0-.53,0-.79-.01-.13,0-.26,0-.4,0Z"/>
              <path className="cls-387" d="M965.89,421.71c.05.07.1.14.15.21.04.06.08.12.13.18.14,0,.27,0,.4,0,.26,0,.53,0,.79.01-.05-.06-.1-.11-.15-.17-.06-.07-.12-.13-.19-.2-.25,0-.5-.01-.76-.02-.12,0-.25,0-.37,0Z"/>
              <path className="cls-614" d="M965.74,421.51c.05.07.1.14.15.21.13,0,.25,0,.37,0,.25,0,.51.01.76.02-.06-.07-.12-.13-.19-.2-.24,0-.48-.01-.73-.02-.12,0-.24,0-.36-.01Z"/>
              <path className="cls-433" d="M959.33,431.22c-.12.17-.25.33-.35.48.45,0,.89,0,1.32,0,.14,0,.28,0,.42,0,.06-.19.12-.38.2-.58-.13,0-.25,0-.38,0-.39.01-.79.05-1.2.08Z"/>
              <path className="cls-536" d="M960.24,430.05c-.17.21-.36.44-.52.66-.13.17-.28.34-.4.51.41-.03.81-.07,1.2-.08.13,0,.26,0,.38,0,.08-.19.16-.39.25-.58.1-.24.22-.48.35-.69-.1.01-.21.03-.32.05-.3.03-.61.09-.95.15Z"/>
              <path className="cls-529" d="M961.56,428.69c-.25.24-.52.48-.75.72-.19.21-.4.43-.57.64.34-.06.64-.12.95-.15.11-.02.21-.03.32-.05.14-.22.29-.42.47-.61.21-.21.46-.42.73-.63-.1.01-.2.02-.31.03-.27.02-.53.03-.83.04Z"/>
              <path className="cls-228" d="M962.7,427.64c-.12.11-.25.23-.38.35-.24.23-.52.46-.76.7.31-.01.56-.02.83-.04.11,0,.21-.02.31-.03.27-.21.56-.42.86-.62.16-.11.31-.21.47-.31-.11,0-.22,0-.34,0-.28-.01-.6-.03-.98-.04Z"/>
              <path className="cls-206" d="M963.35,427.02c-.1.1-.18.2-.29.28-.11.11-.23.22-.35.33.38.01.7.03.98.04.12,0,.23,0,.34,0,.16-.1.31-.2.47-.29.14-.07.28-.16.43-.27-.13-.01-.26-.03-.39-.04-.33-.02-.73-.05-1.18-.07Z"/>
              <path className="cls-201" d="M963.75,426.47c-.06.07-.1.15-.16.22-.08.12-.14.23-.24.34.46.02.86.05,1.18.07.14,0,.26.02.39.04.15-.1.29-.22.43-.34.09-.07.18-.15.27-.22-.16,0-.32,0-.47-.01-.4-.03-.87-.06-1.39-.09Z"/>
              <path className="cls-283" d="M964.11,426.02c-.06.08-.12.15-.19.23-.06.08-.1.15-.16.22.52.03.99.07,1.39.09.15,0,.31,0,.47.01.08-.07.16-.14.24-.21.1-.08.2-.16.28-.25-.16,0-.31,0-.48-.01-.45-.03-.98-.06-1.56-.09Z"/>
              <path className="cls-371" d="M964.45,425.5c-.05.1-.11.19-.17.28-.05.08-.11.16-.17.24.58.03,1.11.07,1.56.09.16,0,.32,0,.48.01.08-.09.17-.17.24-.26.08-.1.16-.2.24-.3-.15,0-.3.02-.48.02-.5-.02-1.07-.04-1.69-.07Z"/>
              <path className="cls-299" d="M964.64,425.12s-.03.06-.04.09c-.05.1-.1.19-.15.29.61.02,1.18.05,1.69.07.18,0,.33,0,.48-.02.07-.1.15-.2.23-.3.02-.03.05-.06.07-.09-.17,0-.34,0-.53,0-.54-.01-1.12-.02-1.75-.03Z"/>
              <path className="cls-299" d="M964.75,424.72c-.02.11-.03.21-.07.31-.02.03-.03.06-.05.09.63.01,1.21.02,1.75.03.19,0,.36,0,.53,0,.03-.03.05-.06.08-.09.04-.11.05-.22.06-.33-.17,0-.35,0-.53,0-.53,0-1.13-.01-1.77-.02Z"/>
              <path className="cls-384" d="M964.79,424.17c0,.08,0,.15,0,.23-.01.11,0,.21-.03.32.64,0,1.24,0,1.77.02.18,0,.36,0,.53,0,0-.11,0-.22-.01-.33,0-.08-.02-.16-.04-.24-.16,0-.32,0-.49,0-.52,0-1.11,0-1.73,0Z"/>
              <path className="cls-427" d="M964.76,423.62c0,.11.02.21.02.32,0,.08.01.15,0,.23.62,0,1.21,0,1.73,0,.16,0,.33,0,.49,0-.01-.08-.03-.16-.05-.24-.02-.11-.03-.22-.06-.33-.16,0-.32,0-.49,0-.51,0-1.07,0-1.65.01Z"/>
              <path className="cls-537" d="M964.64,422.79c.04.17.07.34.08.51,0,.11.03.21.03.32.58,0,1.14-.01,1.65-.01.16,0,.33,0,.49,0-.02-.11-.04-.22-.07-.33-.05-.17-.13-.34-.22-.5-.15,0-.31,0-.47,0-.47,0-.97,0-1.49.01Z"/>
              <path className="cls-211" d="M964.44,422.09c.02.06.04.12.06.18.05.17.1.34.14.51.52,0,1.02-.01,1.49-.01.16,0,.31,0,.47,0-.09-.17-.2-.33-.31-.5-.04-.06-.08-.12-.12-.18-.14,0-.27,0-.41,0-.42,0-.86,0-1.31,0Z"/>
              <path className="cls-564" d="M964.3,421.69c.03.07.05.15.08.22.02.06.04.12.06.19.45,0,.89,0,1.31,0,.14,0,.28,0,.41,0-.04-.06-.08-.12-.13-.18-.05-.07-.1-.14-.15-.21-.13,0-.25,0-.38,0-.39,0-.8-.02-1.21-.02Z"/>
              <path className="cls-530" d="M964.22,421.46c.03.07.06.15.08.22.41,0,.82.01,1.21.02.13,0,.26,0,.38,0-.05-.07-.1-.14-.15-.21-.12,0-.24,0-.37-.01-.38-.01-.76-.02-1.16-.03Z"/>
              <path className="cls-180" d="M957.64,431.28c-.13.15-.25.29-.35.43.11,0,.22,0,.33,0,.46,0,.91,0,1.36,0,.1-.16.23-.32.35-.48-.41.03-.84.06-1.29.06-.13,0-.27,0-.4,0Z"/>
              <path className="cls-475" d="M958.54,430.15c-.17.22-.35.44-.51.65-.13.17-.26.32-.39.47.13,0,.27.01.4,0,.45,0,.87-.03,1.29-.06.12-.17.27-.33.4-.51.15-.22.34-.45.52-.66-.34.06-.71.11-1.14.14-.19,0-.38-.02-.57-.04Z"/>
              <path className="cls-308" d="M959.56,428.72c-.18.25-.38.51-.54.77-.14.22-.32.45-.48.67.19.02.38.03.57.04.43-.03.8-.08,1.14-.14.17-.21.38-.44.57-.64.23-.24.5-.48.75-.72-.31.01-.66.03-1.14.05-.27-.01-.56-.02-.86-.03Z"/>
              <path className="cls-544" d="M960.29,427.59c-.07.12-.15.25-.22.37-.14.25-.33.5-.51.76.3,0,.6.01.86.03.47-.03.83-.04,1.14-.05.25-.24.53-.47.76-.7.13-.12.26-.24.38-.35-.38-.01-.83-.03-1.37-.03-.33,0-.67-.02-1.04-.02Z"/>
              <path className="cls-512" d="M960.57,426.93c-.02.1-.06.21-.11.3-.04.12-.11.23-.17.36.36,0,.71.01,1.04.02.54,0,.99.02,1.37.03.12-.11.24-.23.35-.33.11-.08.2-.18.29-.28-.46-.02-.98-.04-1.55-.06-.38,0-.79-.02-1.22-.04Z"/>
              <path className="cls-467" d="M960.65,426.39c-.01.07-.03.14-.04.22,0,.11-.01.22-.04.33.43.01.84.03,1.22.04.57.01,1.09.03,1.55.06.1-.1.16-.22.24-.34.06-.07.11-.14.16-.22-.52-.03-1.09-.06-1.69-.07-.45,0-.92-.01-1.41-.02Z"/>
              <path className="cls-305" d="M960.75,425.94c-.01.08-.02.15-.04.23-.02.07-.04.15-.06.22.49,0,.97,0,1.41.02.6,0,1.17.04,1.69.07.06-.07.1-.15.16-.22.07-.08.13-.15.19-.23-.58-.03-1.19-.06-1.82-.07-.49,0-1.01-.01-1.54-.01Z"/>
              <path className="cls-451" d="M960.78,425.44c0,.09,0,.18-.01.26,0,.08-.01.15-.02.23.53,0,1.04,0,1.54.01.63,0,1.25.03,1.82.07.06-.08.12-.16.17-.24.06-.09.12-.18.17-.28-.61-.02-1.27-.05-1.95-.05-.55,0-1.13,0-1.72,0Z"/>
              <path className="cls-474" d="M960.82,425.09s-.01.06-.01.08c-.01.09-.01.18-.02.27.59,0,1.16,0,1.72,0,.68,0,1.33.03,1.95.05.05-.1.1-.19.15-.29.01-.03.03-.06.04-.09-.63-.01-1.3-.02-2.01-.02-.59,0-1.19,0-1.82,0Z"/>
              <path className="cls-474" d="M960.91,424.69c-.03.1-.06.21-.08.31,0,.03-.01.06-.02.08.62,0,1.23,0,1.82,0,.71,0,1.38.01,2.01.02.01-.03.03-.06.05-.09.03-.1.04-.21.07-.31-.64,0-1.31,0-1.99-.01-.59,0-1.21,0-1.85-.01Z"/>
              <path className="cls-263" d="M961.04,424.14c-.02.08-.03.15-.05.23-.02.11-.05.21-.08.32.64,0,1.26,0,1.85.01.68,0,1.35,0,1.99.01.02-.11.02-.21.03-.32,0-.08,0-.15,0-.23-.62,0-1.26,0-1.89,0-.6,0-1.22-.01-1.86-.02Z"/>
              <path className="cls-23" d="M961.14,423.59c-.01.11-.03.21-.05.32-.01.08-.03.16-.04.23.64,0,1.26,0,1.86.02.62,0,1.27,0,1.89,0,0-.08,0-.15,0-.23,0-.11-.02-.21-.02-.32-.58,0-1.18,0-1.75,0-.6,0-1.23-.02-1.87-.02Z"/>
              <path className="cls-432" d="M961.18,422.76c0,.17-.01.34-.02.51,0,.11-.02.22-.03.32.64,0,1.27.01,1.87.02.58,0,1.18,0,1.75,0,0-.11-.03-.21-.03-.32-.01-.17-.04-.34-.08-.51-.52,0-1.05,0-1.56,0-.61-.01-1.25-.02-1.9-.03Z"/>
              <path className="cls-617" d="M961.18,422.04c0,.06,0,.13,0,.19,0,.18,0,.35,0,.53.66,0,1.29.02,1.9.03.51,0,1.04,0,1.56,0-.04-.17-.09-.34-.14-.51-.02-.06-.04-.12-.06-.18-.45,0-.91,0-1.37,0-.61-.02-1.25-.03-1.9-.04Z"/>
              <path className="cls-366" d="M961.14,421.61c0,.08.02.16.02.23,0,.07.01.13.01.19.65.01,1.28.03,1.9.04.46.01.92.01,1.37,0-.02-.06-.04-.12-.06-.19-.03-.07-.05-.15-.08-.22-.41,0-.83-.01-1.26-.02-.62-.02-1.25-.03-1.9-.05Z"/>
              <path className="cls-369" d="M961.11,421.38c.01.08.03.16.03.24.65.02,1.28.03,1.9.05.43.01.85.02,1.26.02-.03-.07-.06-.15-.08-.22-.39-.01-.8-.02-1.21-.03-.62-.02-1.25-.03-1.9-.05Z"/>
              <path className="cls-413" d="M956.78,431.22c-.07.16-.14.33-.18.48.12,0,.24,0,.36,0,.11,0,.22,0,.33,0,.1-.14.22-.27.35-.43-.13,0-.27-.02-.41-.02-.15,0-.29-.02-.45-.03Z"/>
              <path className="cls-405" d="M957.25,430.04c-.07.22-.16.44-.24.66-.07.18-.16.35-.22.51.15,0,.3.02.45.03.14,0,.27.02.41.02.13-.15.26-.3.39-.47.16-.21.34-.43.51-.65-.19-.02-.39-.04-.61-.05-.23-.02-.45-.04-.68-.06Z"/>
              <path className="cls-443" d="M957.55,428.68c-.06.22-.13.43-.16.65,0,.02-.01.04-.01.06,0,.21-.06.43-.13.65.23.02.45.04.68.06.21.02.41.04.61.05.17-.22.34-.45.48-.67.17-.26.36-.52.54-.77-.3,0-.62-.01-.94-.02-.34,0-.7-.01-1.08-.02Z"/>
              <path className="cls-488" d="M957.8,427.57c-.01.13-.03.25-.05.38-.04.25-.13.49-.2.73.38,0,.74.01,1.08.02.32,0,.64.01.94.02.18-.25.36-.5.51-.76.07-.13.16-.25.22-.37-.36,0-.75,0-1.15-.01-.43,0-.88,0-1.34,0Z"/>
              <path className="cls-160" d="M957.69,426.89c.05.1.1.2.1.3h0c.02.12.02.25,0,.37.47,0,.92,0,1.34,0,.4,0,.79,0,1.15.01.07-.12.13-.24.17-.36.05-.1.08-.2.11-.3-.43-.01-.88-.03-1.34-.03-.5,0-1.01,0-1.54,0Z"/>
              <path className="cls-381" d="M957.38,426.37c.03.07.07.14.11.21.07.1.14.2.19.31.53,0,1.04,0,1.54,0,.47,0,.92.02,1.34.03.02-.1.03-.21.04-.33.01-.07.03-.14.04-.22-.49,0-1.01,0-1.53,0-.56,0-1.14,0-1.73,0Z"/>
              <path className="cls-282" d="M957.26,425.93c.03.08.06.15.06.22,0,.07.03.15.06.22.59,0,1.17,0,1.73,0,.52,0,1.04,0,1.53,0,.01-.07.03-.15.06-.22.02-.08.03-.15.04-.23-.53,0-1.08,0-1.64,0-.6,0-1.22,0-1.84,0Z"/>
              <path className="cls-248" d="M956.98,425.44c.05.09.11.18.16.26.04.08.09.15.12.23.62,0,1.24,0,1.84,0,.57,0,1.11,0,1.64,0,.01-.08.01-.15.02-.23.01-.09,0-.18.01-.26-.59,0-1.19,0-1.81,0-.65,0-1.32,0-1.99,0Z"/>
              <path className="cls-520" d="M956.83,425.08s.02.06.02.09c.03.09.08.18.13.27.67,0,1.34,0,1.99,0,.61,0,1.22,0,1.81,0,0-.09,0-.18.02-.27,0-.03.01-.06.01-.08-.62,0-1.26,0-1.9,0-.69,0-1.38,0-2.09,0Z"/>
              <path className="cls-520" d="M956.83,424.69c-.01.1-.02.21-.02.31,0,.03,0,.06.02.09.7,0,1.4,0,2.09,0,.64,0,1.28,0,1.9,0,0-.03.01-.06.02-.08.02-.1.05-.21.08-.31-.64,0-1.29,0-1.95,0-.7,0-1.42,0-2.14,0Z"/>
              <path className="cls-256" d="M956.91,424.14c-.01.08-.03.16-.04.23-.01.11-.03.21-.04.32.72,0,1.44,0,2.14,0,.66,0,1.31,0,1.95,0,.03-.1.06-.21.08-.32.02-.08.03-.15.05-.23-.64,0-1.3,0-1.97,0-.71,0-1.44,0-2.17,0Z"/>
              <path className="cls-23" d="M956.97,423.58c0,.11-.02.22-.03.32,0,.08-.02.16-.04.24.73,0,1.45,0,2.17,0,.67,0,1.33,0,1.97,0,.02-.08.03-.16.04-.23.02-.1.04-.21.05-.32-.64,0-1.3,0-1.98-.01-.72,0-1.45,0-2.19,0Z"/>
              <path className="cls-23" d="M956.95,422.72c0,.18,0,.35.02.53.01.11.01.22,0,.33.74,0,1.47,0,2.19,0,.67,0,1.33,0,1.98.01.01-.11.03-.21.03-.32,0-.17.01-.34.02-.51-.66,0-1.33-.01-2.01-.02-.72,0-1.47-.01-2.22-.02Z"/>
              <path className="cls-341" d="M956.97,421.97c0,.07,0,.14,0,.2,0,.19-.01.37-.02.55.75,0,1.5.01,2.22.02.68,0,1.35.01,2.01.02,0-.17,0-.35,0-.53,0-.06,0-.13,0-.19-.65-.01-1.32-.02-2-.03-.72-.01-1.46-.02-2.21-.03Z"/>
              <path className="cls-306" d="M956.95,421.52c0,.08.01.17.02.25,0,.07,0,.14,0,.2.75.01,1.49.02,2.21.03.68.01,1.35.02,2,.03,0-.06,0-.13-.01-.19,0-.08-.02-.15-.02-.23-.65-.02-1.31-.03-1.99-.04-.72-.02-1.46-.03-2.2-.05Z"/>
              <path className="cls-95" d="M956.92,421.27c.02.08.02.17.03.25.74.02,1.48.03,2.2.05.68.01,1.34.03,1.99.04,0-.08-.02-.16-.03-.24-.65-.02-1.31-.03-1.99-.05-.72-.02-1.45-.04-2.2-.05Z"/>
              <path className="cls-133" d="M955.8,431.18c0,.18.02.35.04.52.13,0,.26,0,.39,0,.12,0,.24,0,.36,0,.04-.15.12-.32.18-.48-.15,0-.31-.02-.47-.02-.18,0-.34-.01-.51-.02Z"/>
              <path className="cls-516" d="M955.64,429.95c.06.22.08.46.12.68.03.18.04.36.04.54.17,0,.33.02.51.02.16,0,.32.01.47.02.07-.16.16-.34.22-.51.09-.22.18-.44.24-.66-.23-.02-.47-.04-.73-.05-.29-.01-.58-.03-.87-.05Z"/>
              <path className="cls-449" d="M955.04,428.63c.08.21.17.42.29.62.01.02.02.04.03.06.15.21.23.43.29.65.3.02.59.04.87.05.26.01.5.03.73.05.07-.22.12-.44.13-.65,0-.02.01-.04.01-.06.03-.22.1-.43.16-.65-.38,0-.77-.01-1.16-.02-.44-.01-.88-.02-1.34-.03Z"/>
              <path className="cls-274" d="M954.61,427.55c.06.13.1.26.16.38.1.23.18.47.27.7.46,0,.91.01,1.34.03.4.01.79.02,1.16.02.07-.24.16-.48.2-.73.02-.13.04-.26.05-.38-.47,0-.96,0-1.46,0-.56,0-1.13,0-1.73,0Z"/>
              <path className="cls-405" d="M954.11,426.88c.11.1.22.19.29.29t0,0c.09.12.15.25.21.38.59,0,1.17,0,1.73,0,.51,0,1,0,1.46,0,.01-.13.01-.25,0-.37h0c0-.1-.05-.2-.1-.3-.53,0-1.08,0-1.64,0-.62,0-1.27,0-1.94,0Z"/>
              <path className="cls-283" d="M953.55,426.37c.06.07.14.14.21.21.11.1.24.2.35.3.66,0,1.32,0,1.94,0,.57,0,1.11,0,1.64,0-.05-.1-.13-.2-.19-.31-.04-.07-.08-.14-.11-.21-.59,0-1.2,0-1.81,0-.67,0-1.35,0-2.02,0Z"/>
              <path className="cls-466" d="M953.23,425.93c.06.08.13.15.16.22.03.07.09.14.16.21.68,0,1.35,0,2.02,0,.61,0,1.22,0,1.81,0-.03-.07-.05-.14-.06-.22,0-.07-.03-.15-.06-.22-.62,0-1.26,0-1.9,0-.71,0-1.42,0-2.14,0Z"/>
              <path className="cls-227" d="M952.74,425.44c.09.09.19.18.27.26.07.08.15.15.21.23.71,0,1.43,0,2.14,0,.64,0,1.28,0,1.9,0-.03-.08-.08-.15-.12-.23-.05-.09-.11-.17-.16-.26-.67,0-1.35,0-2.03,0-.74,0-1.48,0-2.21,0Z"/>
              <path className="cls-451" d="M952.46,425.08s.03.06.05.09c.05.09.15.18.24.27.73,0,1.46,0,2.21,0,.68,0,1.36,0,2.03,0-.05-.09-.11-.18-.13-.27,0-.03-.02-.06-.02-.09-.7,0-1.4,0-2.1,0-.77,0-1.52,0-2.26,0Z"/>
              <path className="cls-451" d="M952.36,424.7c.01.1.03.19.06.29.01.03.02.06.04.09.74,0,1.5,0,2.26,0,.7,0,1.4,0,2.1,0,0-.03-.01-.06-.02-.09,0-.1,0-.2.02-.31-.72,0-1.44,0-2.15,0-.78,0-1.56,0-2.31.01Z"/>
              <path className="cls-533" d="M952.32,424.17c0,.07,0,.15.01.22.01.11.02.21.03.3.76,0,1.53-.01,2.31-.01.71,0,1.44,0,2.15,0,.01-.1.03-.21.04-.32.01-.08.03-.15.04-.23-.73,0-1.47,0-2.2,0-.8,0-1.6.02-2.39.03Z"/>
              <path className="cls-23" d="M952.28,423.59c.01.12.02.24.03.35,0,.08,0,.16.01.23.79-.02,1.59-.04,2.39-.03.73,0,1.47,0,2.2,0,.01-.08.03-.16.04-.24.01-.11.02-.21.03-.32-.74,0-1.48,0-2.23,0-.82,0-1.65,0-2.46.02Z"/>
              <path className="cls-23" d="M952.17,422.69c0,.18,0,.36.05.54.03.11.04.23.06.36.82-.01,1.64-.02,2.46-.02.75,0,1.49,0,2.23,0,0-.11,0-.22,0-.33-.02-.17-.02-.35-.02-.53-.75,0-1.52-.01-2.28-.02-.83,0-1.67,0-2.5-.01Z"/>
              <path className="cls-397" d="M952.16,421.91c0,.07,0,.14,0,.21.01.19,0,.38,0,.57.83,0,1.67,0,2.5.01.76,0,1.52.01,2.28.02,0-.18.01-.36.02-.55,0-.07,0-.13,0-.2-.75-.01-1.5-.02-2.27-.04-.84-.01-1.69-.02-2.54-.02Z"/>
              <path className="cls-327" d="M952.14,421.43c0,.09,0,.18.01.27,0,.07,0,.15,0,.22.86,0,1.71.01,2.54.02.76.01,1.52.02,2.27.04,0-.07,0-.14,0-.2,0-.08,0-.16-.02-.25-.74-.02-1.5-.03-2.26-.05-.84-.02-1.69-.03-2.55-.05Z"/>
              <path className="cls-180" d="M952.11,421.16c.02.09.03.18.04.27.86.02,1.71.03,2.55.05.76.02,1.52.03,2.26.05,0-.08-.02-.17-.03-.25-.75-.02-1.5-.04-2.27-.05-.84-.02-1.69-.04-2.55-.06Z"/>
              <path className="cls-154" d="M954.88,431.13c.1.19.18.38.26.57.1,0,.2,0,.3,0,.13,0,.26,0,.4,0-.03-.17-.03-.34-.04-.52-.17,0-.33-.02-.51-.03-.14,0-.27-.01-.41-.02Z"/>
              <path className="cls-552" d="M954.01,429.86c.2.22.38.46.54.69.13.19.23.39.33.58.14,0,.27.01.41.02.18,0,.35.02.51.03,0-.18-.02-.36-.04-.54-.03-.23-.05-.46-.12-.68-.3-.02-.6-.04-.91-.05-.24-.01-.48-.03-.73-.04Z"/>
              <path className="cls-458" d="M952.49,428.6c.26.22.52.42.79.62.28.2.52.41.72.64.25.01.49.03.73.04.31.02.61.03.91.05-.06-.22-.14-.45-.29-.65-.01-.02-.02-.04-.03-.06-.12-.2-.2-.41-.29-.62-.46,0-.93-.01-1.41-.02-.37,0-.75,0-1.13,0Z"/>
              <path className="cls-236" d="M951.32,427.56c.13.13.27.26.41.39.25.22.5.44.76.66.38,0,.76,0,1.13,0,.48,0,.95,0,1.41.02-.09-.23-.17-.47-.27-.7-.06-.13-.1-.25-.16-.38-.59,0-1.2,0-1.82,0-.48,0-.97,0-1.46.01Z"/>
              <path className="cls-134" d="M950.54,426.87c.12.1.24.19.36.29.15.13.29.26.42.4.5,0,.99,0,1.46-.01.62,0,1.23,0,1.82,0-.06-.13-.12-.25-.21-.38t0,0c-.07-.1-.18-.2-.29-.29-.66,0-1.34,0-2.01,0-.51,0-1.03,0-1.56,0Z"/>
              <path className="cls-496" d="M949.96,426.37c.07.07.16.14.23.21.11.1.24.2.35.3.52,0,1.04,0,1.56,0,.67,0,1.34,0,2.01,0-.11-.1-.24-.19-.35-.3-.07-.07-.15-.14-.21-.21-.68,0-1.36,0-2.04,0-.52,0-1.04,0-1.55,0Z"/>
              <path className="cls-1" d="M949.53,425.93c.07.08.15.15.21.22.06.07.14.14.21.21.51,0,1.03,0,1.55,0,.68,0,1.36,0,2.04,0-.06-.07-.13-.14-.16-.21-.03-.07-.1-.15-.16-.22-.71,0-1.42,0-2.12,0-.53,0-1.06,0-1.58,0Z"/>
              <path className="cls-368" d="M949.06,425.43c.08.09.18.18.25.27.07.08.15.15.23.23.52,0,1.05,0,1.58,0,.69,0,1.4,0,2.12,0-.06-.08-.15-.15-.21-.23-.08-.09-.18-.18-.27-.26-.73,0-1.44,0-2.13,0-.53,0-1.05,0-1.55,0Z"/>
              <path className="cls-595" d="M948.75,425.07s.04.06.06.09c.07.1.15.19.24.28.5,0,1.02,0,1.55,0,.69,0,1.41,0,2.13,0-.09-.09-.18-.18-.24-.27-.02-.03-.03-.06-.05-.09-.74,0-1.46,0-2.16,0-.53,0-1.05,0-1.55,0Z"/>
              <path className="cls-595" d="M948.54,424.7c.05.1.09.17.15.27.02.03.04.06.06.09.5,0,1.01,0,1.55,0,.7,0,1.42,0,2.16,0-.01-.03-.03-.06-.04-.09-.03-.1-.05-.2-.06-.29-.76,0-1.5.01-2.22.02-.55,0-1.09,0-1.6,0Z"/>
              <path className="cls-437" d="M948.31,424.21c.03.07.06.14.1.21.05.11.09.19.14.28.52,0,1.05.01,1.6,0,.72,0,1.46,0,2.22-.02-.01-.1-.02-.2-.03-.3,0-.08,0-.15-.01-.22-.79.02-1.56.04-2.32.05-.58,0-1.14,0-1.69-.01Z"/>
              <path className="cls-23" d="M948.1,423.6c.04.13.07.28.12.38.03.08.06.15.09.22.55.02,1.11.02,1.69.01.75,0,1.53-.03,2.32-.05,0-.07,0-.15-.01-.23-.01-.11-.02-.22-.03-.35-.82.01-1.62.02-2.41.02-.6,0-1.2,0-1.78-.01Z"/>
              <path className="cls-23" d="M947.82,422.66c.05.19.08.36.16.54.05.12.08.27.12.4.58.01,1.17.02,1.78.01.79,0,1.59-.01,2.41-.02-.01-.12-.02-.24-.06-.36-.05-.18-.05-.36-.05-.54-.83,0-1.66,0-2.49,0-.63,0-1.25-.01-1.87-.02Z"/>
              <path className="cls-140" d="M947.65,421.86c.01.08.03.15.04.23.05.2.08.39.13.57.61.01,1.24.02,1.87.02.82,0,1.65,0,2.49,0,0-.18.01-.37,0-.57,0-.07,0-.14,0-.21-.86,0-1.71,0-2.56-.02-.65,0-1.3-.02-1.95-.03Z"/>
              <path className="cls-132" d="M947.57,421.34c.02.09.03.19.04.29.01.08.02.16.04.23.65.02,1.3.03,1.95.03.85,0,1.71.01,2.56.02,0-.07,0-.15,0-.22,0-.09,0-.18-.01-.27-.86-.02-1.72-.03-2.58-.05-.66-.01-1.33-.02-1.99-.04Z"/>
              <path className="cls-375" d="M947.52,421.05c.02.09.03.19.05.29.66.01,1.33.03,1.99.04.86.02,1.72.03,2.58.05,0-.09-.02-.18-.04-.27-.86-.02-1.72-.04-2.59-.06-.66-.01-1.33-.03-2-.04Z"/>
              <path className="cls-401" d="M951.86,431.14c.1.19.19.37.27.56.91,0,1.81,0,2.71,0,.1,0,.2,0,.31,0-.09-.18-.17-.38-.26-.57-.14,0-.27-.01-.42-.01-.85,0-1.72.01-2.6.02Z"/>
              <path className="cls-114" d="M951.01,429.89c.2.22.37.45.52.68.12.19.23.38.33.56.88,0,1.75-.02,2.6-.02.15,0,.29,0,.42.01-.1-.19-.2-.39-.33-.58-.16-.24-.34-.47-.54-.69-.25-.01-.5-.02-.76-.03-.73.01-1.48.04-2.24.06Z"/>
              <path className="cls-447" d="M949.6,428.61c.24.22.49.43.75.64.25.2.47.42.67.64.76-.02,1.52-.05,2.24-.06.26,0,.51.02.76.03-.2-.23-.44-.44-.72-.64-.27-.2-.53-.41-.79-.62-.38,0-.78,0-1.18-.01-.56.01-1.14.02-1.72.02Z"/>
              <path className="cls-378" d="M948.5,427.56c.12.13.25.26.38.38.23.23.48.45.72.67.58,0,1.16,0,1.72-.02.4,0,.79,0,1.18.01-.26-.22-.51-.44-.76-.66-.14-.12-.27-.25-.41-.39-.5,0-1.01,0-1.51,0-.43,0-.87,0-1.31,0Z"/>
              <path className="cls-333" d="M947.87,426.86c.08.1.17.2.26.31.12.14.25.27.37.4.44,0,.88,0,1.31,0,.51,0,1.02,0,1.51,0-.13-.13-.27-.27-.42-.4-.11-.1-.24-.19-.36-.29-.52,0-1.05,0-1.57,0-.37,0-.74,0-1.1-.02Z"/>
              <path className="cls-479" d="M947.44,426.33c.05.07.11.14.17.21.08.11.18.21.26.31.37,0,.73.02,1.1.02.53,0,1.05,0,1.57,0-.12-.1-.24-.19-.35-.3-.07-.07-.16-.14-.23-.21-.51,0-1.02,0-1.52,0-.34,0-.67-.02-.99-.03Z"/>
              <path className="cls-331" d="M947.13,425.89c.05.08.1.15.15.23.05.07.11.14.16.22.33.02.66.03.99.03.5,0,1.01,0,1.52,0-.07-.07-.15-.14-.21-.21-.06-.07-.14-.15-.21-.22-.52,0-1.02,0-1.51,0-.31,0-.6-.02-.89-.04Z"/>
              <path className="cls-600" d="M946.79,425.39c.06.09.12.18.18.27.05.08.11.16.16.23.29.02.59.04.89.04.49,0,.99,0,1.51,0-.07-.08-.16-.15-.23-.23-.08-.09-.17-.18-.25-.27-.5,0-.99,0-1.45,0-.28,0-.55-.02-.81-.03Z"/>
              <path className="cls-588" d="M946.57,425.04s.03.06.05.08c.05.09.11.18.17.27.26.01.53.03.81.03.47,0,.95,0,1.45,0-.08-.09-.17-.18-.24-.28-.02-.03-.04-.06-.06-.09-.5,0-.97,0-1.43-.01-.26,0-.51,0-.75-.02Z"/>
              <path className="cls-607" d="M946.36,424.57c.06.13.11.25.17.38.02.03.03.06.05.08.24,0,.5.01.75.02.45,0,.93,0,1.43.01-.02-.03-.04-.06-.06-.09-.06-.1-.1-.18-.15-.27-.52,0-1.01-.02-1.49-.05-.25-.01-.48-.05-.7-.08Z"/>
              <path className="cls-507" d="M946.06,423.95c.04.08.08.17.12.26.06.12.12.24.17.36.22.04.45.07.7.08.48.02.97.04,1.49.05-.05-.1-.09-.18-.14-.28-.04-.08-.07-.14-.1-.21-.55-.02-1.08-.05-1.59-.1-.24-.02-.45-.09-.65-.15Z"/>
              <path className="cls-352" d="M945.75,423.36c.06.11.13.23.19.35.04.08.08.16.13.25.2.07.41.13.65.15.51.05,1.04.09,1.59.1-.03-.07-.06-.14-.09-.22-.05-.11-.08-.26-.12-.38-.58-.01-1.14-.04-1.68-.07-.24-.04-.46-.11-.66-.17Z"/>
              <path className="cls-104" d="M945.23,422.48c.11.18.21.36.32.53.07.11.14.23.2.34.2.07.42.13.66.17.54.04,1.11.06,1.68.07-.04-.13-.07-.28-.12-.4-.07-.18-.11-.36-.16-.54-.61-.01-1.22-.03-1.81-.05-.3-.04-.54-.09-.79-.14Z"/>
              <path className="cls-524" d="M944.77,421.71c.04.07.08.14.12.21.12.19.22.38.33.56.24.05.49.1.79.14.59.02,1.19.04,1.81.05-.05-.19-.07-.37-.13-.57-.02-.07-.03-.15-.04-.23-.65-.02-1.29-.04-1.92-.07-.35-.02-.66-.05-.96-.09Z"/>
              <path className="cls-519" d="M944.49,421.24c.05.09.1.17.15.26.04.07.08.14.13.21.3.04.61.07.96.09.63.03,1.27.05,1.92.07-.01-.08-.02-.16-.04-.23-.02-.09-.02-.19-.04-.29-.66-.01-1.33-.03-1.98-.05-.38-.01-.74-.03-1.1-.05Z"/>
              <path className="cls-590" d="M944.33,420.98c.05.09.1.17.16.26.36.02.72.04,1.1.05.65.02,1.32.03,1.98.05-.02-.09-.03-.19-.05-.29-.67-.01-1.33-.03-2-.04-.4,0-.79-.02-1.19-.03Z"/>
              <path className="cls-428" d="M946.71,431.18c.02.17.04.34.06.51.87,0,1.76,0,2.65,0,.9,0,1.8,0,2.71,0-.08-.18-.17-.37-.27-.56-.88,0-1.75.02-2.6.02-.85,0-1.71.01-2.55.03Z"/>
              <path className="cls-216" d="M946.51,430.01c.05.21.09.43.13.65.03.17.05.35.08.52.84-.01,1.7-.02,2.55-.03.85,0,1.73-.01,2.6-.02-.1-.19-.21-.38-.33-.56-.15-.23-.33-.46-.52-.68-.76.02-1.52.05-2.26.06-.74.02-1.49.04-2.24.06Z"/>
              <path className="cls-252" d="M946.12,428.66c.07.24.13.48.2.72.07.21.13.42.18.64.74-.02,1.5-.05,2.24-.06.74-.02,1.5-.04,2.26-.06-.2-.22-.42-.44-.67-.64-.25-.21-.5-.42-.75-.64-.58,0-1.17.01-1.74.02-.57.01-1.15.02-1.73.03Z"/>
              <path className="cls-276" d="M945.83,427.56c.04.13.07.26.1.38.07.24.12.48.19.72.57,0,1.15-.01,1.73-.03.57-.01,1.16-.02,1.74-.02-.24-.22-.49-.44-.72-.67-.13-.12-.25-.25-.38-.38-.44,0-.89,0-1.33,0-.44,0-.89,0-1.34,0Z"/>
              <path className="cls-285" d="M945.64,426.82c.03.12.06.24.08.35.04.13.07.26.11.39.45,0,.9,0,1.34,0,.44,0,.88,0,1.33,0-.12-.13-.25-.26-.37-.4-.08-.1-.17-.2-.26-.31-.37,0-.73-.02-1.1-.02-.37,0-.75-.01-1.12-.02Z"/>
              <path className="cls-590" d="M945.5,426.25c.02.07.03.15.05.22.03.11.06.23.09.35.38,0,.75.01,1.12.02.37,0,.74.01,1.1.02-.08-.1-.18-.21-.26-.31-.06-.07-.11-.14-.17-.21-.33-.02-.65-.04-.97-.05-.19,0-.38-.01-.58-.02-.13,0-.26,0-.39-.01Z"/>
              <path className="cls-480" d="M945.4,425.8c.02.08.04.15.05.23.02.07.03.14.05.22.13,0,.26.01.39.01.19,0,.39.01.58.02.32.01.64.03.97.05-.05-.07-.11-.14-.16-.22-.05-.07-.1-.15-.15-.23-.29-.02-.57-.04-.86-.05-.17,0-.35-.01-.52-.02-.12,0-.23,0-.35-.01Z"/>
              <path className="cls-571" d="M945.27,425.32c.02.08.05.17.07.25.02.07.04.15.06.23.12,0,.23.01.35.01.17,0,.35.01.52.02.29.01.57.03.86.05-.05-.08-.11-.15-.16-.23-.06-.09-.12-.18-.18-.27-.26-.01-.52-.03-.76-.04-.25,0-.51-.02-.76-.03Z"/>
              <path className="cls-532" d="M945.19,425s0,.05,0,.08c.02.08.04.16.07.25.25.01.51.02.76.03.24,0,.5.02.76.04-.06-.09-.12-.18-.17-.27-.02-.03-.03-.06-.05-.08-.24,0-.48-.01-.7-.02-.13,0-.27,0-.4-.01-.09,0-.18,0-.28,0Z"/>
              <path className="cls-183" d="M945.09,424.39c.03.17.07.35.1.53,0,.03,0,.05,0,.08.1,0,.19,0,.28,0,.13,0,.26,0,.4.01.22,0,.46.01.7.02-.02-.03-.03-.06-.05-.08-.05-.13-.11-.25-.17-.38-.22-.04-.43-.08-.64-.1-.13-.01-.25-.03-.37-.04-.09-.01-.17-.02-.26-.03Z"/>
              <path className="cls-393" d="M944.85,423.61c.03.09.08.21.11.31.04.15.09.31.12.47.09.01.17.02.26.03.12.01.24.03.37.04.21.02.42.06.64.1-.06-.13-.11-.24-.17-.36-.04-.09-.08-.17-.12-.26-.2-.07-.39-.14-.59-.18-.19-.04-.41-.1-.62-.16Z"/>
              <path className="cls-317" d="M944.53,422.98c.08.11.14.23.2.35.04.08.09.18.13.28.21.06.43.12.62.16.2.04.39.11.59.18-.04-.08-.08-.17-.13-.25-.06-.11-.12-.24-.19-.35-.2-.07-.4-.14-.6-.19-.12-.03-.24-.07-.38-.11-.09-.02-.17-.05-.25-.08Z"/>
              <path className="cls-609" d="M943.73,422.18c.19.16.37.33.53.48.1.1.18.2.26.31.08.03.16.05.25.08.14.04.26.08.38.11.2.05.4.12.6.19-.06-.11-.13-.23-.2-.34-.11-.17-.21-.35-.32-.53-.24-.05-.48-.1-.74-.15-.16-.03-.3-.06-.46-.09-.1-.02-.2-.04-.29-.06Z"/>
              <path className="cls-203" d="M942.87,421.51c.08.06.17.11.25.17.21.17.43.33.62.5.09.02.19.04.29.06.16.03.3.06.46.09.27.04.5.1.74.15-.11-.18-.22-.37-.33-.56-.04-.07-.08-.14-.12-.21-.3-.04-.6-.08-.94-.1-.32-.03-.64-.06-.96-.1Z"/>
              <path className="cls-110" d="M942.3,421.14c.11.07.21.13.32.2.09.06.17.11.26.17.32.03.64.07.96.1.34.02.64.06.94.1-.04-.07-.08-.14-.13-.21-.05-.08-.1-.17-.15-.26-.36-.02-.72-.04-1.09-.06-.37-.02-.73-.03-1.1-.05Z"/>
              <path className="cls-562" d="M941.97,420.94c.11.07.22.13.33.2.37.02.73.04,1.1.05.37.01.73.04,1.09.06-.05-.08-.1-.17-.16-.26-.4,0-.79-.02-1.18-.03-.39,0-.79-.02-1.18-.02Z"/>
              <path className="cls-288" d="M943.27,431.22c0,.17-.02.33-.03.49.33,0,.66,0,.99,0,.83,0,1.68,0,2.55,0-.02-.17-.04-.34-.06-.51-.84.01-1.67.02-2.45.03-.34,0-.67,0-.99,0Z"/>
              <path className="cls-240" d="M943.34,430.09c-.01.21-.03.42-.04.63,0,.17-.02.34-.03.5.33,0,.66,0,.99,0,.78,0,1.61-.02,2.45-.03-.02-.17-.05-.35-.08-.52-.04-.22-.08-.43-.13-.65-.74.02-1.48.05-2.16.07-.34,0-.67,0-1.01,0Z"/>
              <path className="cls-462" d="M943.42,428.7c-.01.25-.03.5-.04.75-.01.21-.03.42-.04.64.33,0,.67,0,1.01,0,.69-.02,1.42-.04,2.16-.07-.05-.21-.11-.43-.18-.64-.07-.24-.13-.48-.2-.72-.57,0-1.14.01-1.69.03-.34,0-.68,0-1.02,0Z"/>
              <path className="cls-303" d="M943.44,427.56c0,.13,0,.26,0,.39,0,.25-.01.5-.03.75.34,0,.68,0,1.02,0,.55-.01,1.12-.02,1.69-.03-.07-.24-.12-.48-.19-.72-.04-.13-.07-.26-.1-.38-.45,0-.9,0-1.34,0-.35,0-.7,0-1.05,0Z"/>
              <path className="cls-285" d="M943.52,426.81c-.03.12-.06.24-.07.37,0,.13,0,.25,0,.38.35,0,.7,0,1.05,0,.44,0,.89,0,1.34,0-.04-.13-.07-.26-.11-.39-.02-.12-.05-.24-.08-.35-.38,0-.75-.01-1.13,0-.33,0-.66,0-1,0Z"/>
              <path className="cls-492" d="M943.63,426.22c-.01.08-.03.16-.04.23,0,.12-.04.24-.07.36.34,0,.67,0,1,0,.38,0,.75,0,1.13,0-.03-.12-.06-.23-.09-.35-.02-.07-.03-.15-.05-.22-.32-.01-.64-.03-.98-.03-.29,0-.59,0-.89,0Z"/>
              <path className="cls-176" d="M943.69,425.76c-.02.08-.03.16-.03.23,0,.08-.02.15-.03.23.3,0,.6,0,.89,0,.34,0,.66.02.98.03-.02-.07-.03-.14-.05-.22-.02-.08-.03-.15-.05-.23-.29-.02-.58-.04-.88-.04-.27,0-.54,0-.83,0Z"/>
              <path className="cls-571" d="M943.78,425.29c-.02.08-.04.16-.04.24,0,.07-.02.15-.04.23.28,0,.56,0,.83,0,.3,0,.59.02.88.04-.02-.08-.04-.15-.06-.23-.02-.08-.05-.17-.07-.25-.25-.01-.51-.02-.76-.03-.23,0-.48,0-.73,0Z"/>
              <path className="cls-597" d="M943.81,424.98s0,.05,0,.07c0,.08-.02.15-.04.23.25,0,.5,0,.73,0,.25,0,.51.02.76.03-.02-.08-.05-.16-.07-.25,0-.03,0-.05,0-.08-.22,0-.46-.01-.7-.01-.21,0-.44,0-.68,0Z"/>
              <path className="cls-550" d="M943.74,424.3c.03.19.06.4.08.61,0,.02,0,.05,0,.07.24,0,.46,0,.68,0,.24,0,.48,0,.7.01,0-.03,0-.05,0-.08-.03-.18-.07-.37-.1-.53-.21-.03-.43-.06-.66-.08-.22,0-.45-.01-.69-.01Z"/>
              <path className="cls-203" d="M943.5,423.42c.04.1.08.22.11.34.05.17.09.35.13.55.24,0,.47,0,.69.01.23.02.45.05.66.08-.03-.17-.08-.33-.12-.47-.03-.11-.08-.22-.11-.31-.21-.06-.42-.12-.59-.14-.24-.02-.5-.04-.76-.05Z"/>
              <path className="cls-508" d="M943.14,422.8c.1.1.19.2.25.34.04.08.08.18.11.28.26,0,.52.02.76.05.17.03.38.08.59.14-.03-.09-.09-.19-.13-.28-.06-.13-.12-.24-.2-.35-.21-.07-.41-.13-.6-.17-.25-.01-.52-.01-.79-.02Z"/>
              <path className="cls-411" d="M942.15,422.04c.24.16.47.33.64.48.12.1.24.18.34.28.27,0,.53,0,.79.02.19.03.39.1.6.17-.08-.11-.16-.21-.26-.31-.15-.16-.34-.32-.53-.48-.24-.05-.48-.1-.75-.14-.27,0-.55,0-.83,0Z"/>
              <path className="cls-464" d="M941.05,421.4c.11.05.21.1.31.16.27.15.55.32.79.48.28,0,.56,0,.83,0,.28.04.51.09.75.14-.19-.16-.4-.33-.62-.5-.08-.06-.16-.11-.25-.17-.32-.03-.64-.06-.96-.08-.28-.01-.57-.03-.86-.04Z"/>
              <path className="cls-190" d="M940.32,421.07c.13.06.27.12.4.18.11.05.22.1.33.15.29,0,.57.02.86.04.32.02.64.04.96.08-.08-.06-.17-.11-.26-.17-.1-.07-.21-.14-.32-.2-.37-.02-.73-.03-1.1-.04-.29,0-.58-.02-.88-.02Z"/>
              <path className="cls-365" d="M939.92,420.89c.13.06.27.12.4.18.29,0,.59.01.88.02.36.01.73.03,1.1.04-.11-.07-.22-.13-.33-.2-.39,0-.78-.02-1.17-.02-.29,0-.59-.01-.88-.02Z"/>
              <path className="cls-326" d="M939.19,431.25c0,.17,0,.33-.01.5,1.03-.02,2.07-.03,3.1-.04.32,0,.64,0,.96,0,.01-.16.02-.33.03-.49-.33,0-.65,0-.97,0-1.05,0-2.08.02-3.12.03Z"/>
              <path className="cls-604" d="M939.12,430.12c.01.21.03.42.04.63.01.17.02.34.02.5,1.03-.01,2.07-.02,3.12-.03.32,0,.64,0,.97,0,0-.17.02-.33.03-.5.01-.21.03-.42.04-.63-.33,0-.66,0-.99,0-1.07,0-2.15.02-3.23.03Z"/>
              <path className="cls-594" d="M939.06,428.73c.02.25.04.5.04.75,0,.21,0,.42.01.64,1.08-.01,2.15-.02,3.23-.03.33,0,.66,0,.99,0,.01-.21.03-.42.04-.64.01-.25.03-.5.04-.75-.34,0-.67,0-1.01,0-1.12,0-2.23.02-3.34.03Z"/>
              <path className="cls-240" d="M938.91,427.59c.01.13.05.26.06.39.03.25.06.49.09.75,1.11-.01,2.22-.02,3.34-.03.34,0,.67,0,1.01,0,.01-.25.02-.5.03-.75,0-.13,0-.26,0-.39-.35,0-.7,0-1.05,0-1.16,0-2.32.01-3.48.02Z"/>
              <path className="cls-285" d="M939.05,426.84c-.07.12-.18.24-.18.36,0,.13.03.26.04.39,1.16,0,2.32-.02,3.48-.02.35,0,.7,0,1.05,0,0-.13,0-.26,0-.38,0-.12.04-.25.07-.37-.34,0-.68,0-1.01,0-1.13,0-2.29.01-3.45.03Z"/>
              <path className="cls-489" d="M939.45,426.25c-.04.08-.11.16-.14.23-.06.12-.19.24-.26.36,1.17-.01,2.33-.02,3.45-.03.34,0,.68,0,1.01,0,.03-.12.07-.24.07-.36,0-.08.02-.16.04-.23-.3,0-.61,0-.93,0-1.05,0-2.13.01-3.25.03Z"/>
              <path className="cls-400" d="M939.63,425.79c-.04.08-.09.16-.09.23,0,.07-.05.15-.09.23,1.11-.01,2.2-.02,3.25-.03.31,0,.62,0,.93,0,.01-.08.03-.15.03-.23,0-.08.02-.16.03-.23-.28,0-.58,0-.87,0-.99,0-2.06.02-3.18.03Z"/>
              <path className="cls-257" d="M939.98,425.31c-.06.08-.16.16-.2.25-.04.07-.11.15-.15.23,1.12-.02,2.2-.03,3.18-.03.3,0,.59,0,.87,0,.02-.08.04-.16.04-.23,0-.08.03-.16.04-.24-.25,0-.52,0-.79,0-.91,0-1.93.01-3,.03Z"/>
              <path className="cls-177" d="M940.16,425s-.01.05-.02.07c-.02.08-.11.16-.16.24,1.08-.01,2.09-.03,3-.03.27,0,.54,0,.79,0,.02-.08.04-.15.04-.23,0-.02,0-.05,0-.07-.24,0-.49,0-.75,0-.87,0-1.85,0-2.91.02Z"/>
              <path className="cls-222" d="M940.04,424.36c.05.18.12.37.13.56,0,.02,0,.05,0,.07,1.06,0,2.04-.01,2.91-.02.26,0,.51,0,.75,0,0-.02,0-.05,0-.07-.01-.21-.04-.42-.08-.61-.24,0-.49,0-.76,0-.89,0-1.88.03-2.94.06Z"/>
              <path className="cls-428" d="M939.66,423.52c.05.1.11.21.16.33.07.16.16.34.22.51,1.06-.03,2.05-.06,2.94-.06.27,0,.52,0,.76,0-.03-.19-.08-.38-.13-.55-.03-.12-.07-.23-.11-.34-.26,0-.54-.01-.82-.01-.93,0-1.94.05-3.02.12Z"/>
              <path className="cls-478" d="M939.29,422.88c.09.11.19.21.23.35.04.09.1.18.14.29,1.07-.06,2.09-.12,3.02-.12.28,0,.55,0,.82.01-.04-.1-.08-.2-.11-.28-.06-.14-.15-.24-.25-.34-.27,0-.55,0-.83,0-.95,0-1.96.04-3.02.08Z"/>
              <path className="cls-155" d="M938.33,422.07c.23.18.49.35.62.52.12.1.25.19.34.29,1.06-.04,2.07-.08,3.02-.08.28,0,.56,0,.83,0-.1-.1-.22-.18-.34-.28-.17-.15-.4-.31-.64-.48-.28,0-.57,0-.85,0-.96,0-1.96.02-2.97.03Z"/>
              <path className="cls-500" d="M937.21,421.38c.1.06.21.11.3.17.26.16.58.34.81.52,1.01-.02,2.01-.03,2.97-.03.29,0,.57,0,.85,0-.24-.16-.52-.33-.79-.48-.1-.05-.2-.11-.31-.16-.29,0-.58-.02-.87-.02-.97-.01-1.97,0-2.97,0Z"/>
              <path className="cls-258" d="M936.54,421.02c.11.07.24.13.36.2.1.06.21.11.31.17,1-.01,2-.02,2.97,0,.29,0,.58.01.87.02-.11-.05-.22-.1-.33-.15-.13-.06-.27-.12-.4-.18-.29,0-.59-.01-.88-.02-.97-.02-1.94-.03-2.9-.04Z"/>
              <path className="cls-394" d="M936.21,420.82c.1.07.22.13.33.2.96,0,1.93.02,2.9.04.29,0,.59.01.88.02-.13-.06-.27-.12-.4-.18-.29,0-.58-.01-.87-.02-.96-.02-1.91-.04-2.84-.06Z"/>
              <path className="cls-542" d="M931.65,431.44c0,.17.03.35.02.52,1.49-.05,2.98-.1,4.39-.14,1.03-.03,2.07-.05,3.1-.07.01-.17.02-.33.01-.5-1.03.01-2.07.03-3.12.06-1.43.04-2.92.08-4.42.12Z"/>
              <path className="cls-420" d="M931.51,430.26c.02.22.07.43.09.65.01.17.05.35.06.52,1.49-.05,2.99-.09,4.42-.12,1.05-.03,2.08-.05,3.12-.06,0-.17-.01-.33-.02-.5-.01-.21-.03-.42-.04-.63-1.08.01-2.15.03-3.23.05-1.45.03-2.92.06-4.38.1Z"/>
              <path className="cls-216" d="M931.36,428.84c.03.26.09.51.09.77,0,.22.04.44.06.65,1.46-.04,2.93-.07,4.38-.1,1.07-.02,2.15-.04,3.23-.05-.01-.21-.02-.42-.01-.64,0-.25-.02-.5-.04-.75-1.11.01-2.22.02-3.34.04-1.47.02-2.94.05-4.36.07Z"/>
              <path className="cls-307" d="M931.18,427.67c.01.13.04.27.05.4.03.26.1.51.13.77,1.43-.03,2.9-.05,4.36-.07,1.12-.01,2.23-.03,3.34-.04-.02-.25-.06-.5-.09-.75-.01-.13-.05-.26-.06-.39-1.16,0-2.31.02-3.45.03-1.47.01-2.91.03-4.29.05Z"/>
              <path className="cls-276" d="M931.24,426.93c-.04.11-.1.23-.11.34,0,.13.03.27.04.4,1.38-.02,2.81-.03,4.29-.05,1.14-.01,2.29-.02,3.45-.03-.01-.13-.04-.26-.04-.39,0-.12.11-.24.18-.36-1.17.01-2.34.02-3.48.03-1.49.01-2.93.03-4.32.05Z"/>
              <path className="cls-434" d="M931.52,426.36c-.02.07-.07.15-.1.22-.05.11-.13.23-.18.34,1.39-.02,2.84-.03,4.32-.05,1.14-.01,2.31-.02,3.48-.03.07-.12.2-.24.26-.36.04-.08.11-.16.14-.23-1.11.01-2.26.03-3.41.04-1.51.02-3.03.05-4.52.07Z"/>
              <path className="cls-542" d="M931.63,425.92c-.02.07-.06.15-.06.22,0,.07-.03.15-.05.22,1.48-.02,3.01-.05,4.52-.07,1.16-.02,2.3-.03,3.41-.04.04-.08.09-.15.09-.23,0-.08.06-.16.09-.23-1.12.02-2.28.04-3.45.05-1.52.02-3.05.05-4.55.08Z"/>
              <path className="cls-271" d="M931.87,425.44c-.04.08-.1.17-.14.25-.03.07-.08.15-.11.23,1.5-.03,3.03-.05,4.55-.08,1.17-.02,2.33-.04,3.45-.05.04-.08.11-.16.15-.23.04-.08.14-.16.2-.25-1.08.01-2.22.03-3.4.05-1.53.02-3.13.05-4.71.08Z"/>
              <path className="cls-493" d="M931.99,425.11s0,.05-.01.08c-.02.08-.07.17-.11.25,1.58-.03,3.17-.06,4.71-.08,1.18-.02,2.32-.04,3.4-.05.06-.08.14-.16.16-.24,0-.02.02-.05.02-.07-1.06,0-2.2.02-3.39.04-1.54.02-3.16.05-4.78.07Z"/>
              <path className="cls-493" d="M931.93,424.57c.03.15.06.31.07.47,0,.02,0,.05,0,.08,1.61-.03,3.23-.05,4.78-.07,1.19-.02,2.33-.03,3.39-.04,0-.02.01-.05,0-.07,0-.19-.08-.38-.13-.56-1.06.03-2.19.07-3.37.09-1.53.03-3.14.07-4.74.12Z"/>
              <path className="cls-605" d="M931.73,423.82c.03.1.06.2.09.3.04.14.09.29.12.44,1.6-.05,3.22-.09,4.74-.12,1.17-.02,2.31-.06,3.37-.09-.05-.18-.15-.35-.22-.51-.05-.11-.12-.23-.16-.33-1.07.06-2.2.13-3.36.16-1.5.03-3.05.09-4.58.14Z"/>
              <path className="cls-569" d="M931.55,423.13c.04.13.08.26.1.4.02.1.05.19.07.29,1.53-.06,3.09-.11,4.58-.14,1.15-.03,2.28-.09,3.36-.16-.05-.1-.11-.2-.14-.29-.05-.14-.14-.25-.23-.35-1.06.04-2.16.08-3.28.11-1.46.03-2.97.08-4.45.13Z"/>
              <path className="cls-535" d="M931.14,422.18c.1.19.21.38.25.58.06.12.12.24.16.37,1.48-.05,2.99-.1,4.45-.13,1.12-.03,2.22-.07,3.28-.11-.09-.11-.22-.19-.34-.29-.13-.16-.39-.34-.62-.52-1.01.02-2.05.03-3.08.05-1.35.01-2.74.04-4.1.06Z"/>
              <path className="cls-535" d="M930.62,421.4c.04.07.1.14.14.21.12.19.27.38.38.57,1.36-.02,2.76-.04,4.1-.06,1.04-.01,2.07-.03,3.08-.05-.23-.18-.55-.35-.81-.52-.09-.06-.2-.11-.3-.17-1,.01-1.99.02-2.94.02-1.24,0-2.47,0-3.65,0Z"/>
              <path className="cls-535" d="M930.34,420.94c.04.08.1.16.15.25.04.07.09.14.14.21,1.18,0,2.41,0,3.65,0,.95,0,1.94,0,2.94-.02-.1-.06-.21-.11-.31-.17-.12-.07-.25-.13-.36-.2-.96,0-1.9-.02-2.81-.03-1.18-.02-2.31-.03-3.4-.04Z"/>
              <path className="cls-134" d="M930.21,420.7c.03.08.08.16.13.25,1.08.01,2.22.03,3.4.04.91.01,1.85.02,2.81.03-.11-.07-.23-.13-.33-.2-.93-.02-1.83-.04-2.71-.05-1.14-.02-2.24-.04-3.29-.06Z"/>
              <path className="cls-395" d="M925.21,431.67c0,.18.02.36.02.55.66-.03,1.34-.06,2.03-.09,1.43-.06,2.93-.12,4.42-.17,0-.17-.01-.35-.02-.52-1.49.05-2.98.1-4.39.15-.71.03-1.39.05-2.05.08Z"/>
              <path className="cls-223" d="M925.13,430.44c0,.23.03.45.05.68,0,.18.03.36.03.55.66-.03,1.34-.05,2.05-.08,1.41-.05,2.9-.11,4.39-.15,0-.17-.04-.35-.06-.52-.02-.22-.07-.43-.09-.65-1.46.04-2.89.08-4.25.12-.73.02-1.45.04-2.13.06Z"/>
              <path className="cls-602" d="M925.06,428.97c.01.27.04.53.04.8,0,.23.02.45.03.68.68-.02,1.4-.04,2.13-.06,1.36-.04,2.8-.08,4.25-.12-.02-.22-.06-.43-.06-.65,0-.26-.06-.51-.09-.77-1.43.03-2.81.06-4.1.08-.77.01-1.51.03-2.2.04Z"/>
              <path className="cls-388" d="M924.98,427.75c0,.14.02.28.02.42.01.27.04.53.06.8.69-.01,1.43-.03,2.2-.04,1.29-.03,2.67-.06,4.1-.08-.03-.26-.1-.51-.13-.77-.02-.14-.04-.27-.05-.4-1.38.02-2.69.03-3.92.05-.8,0-1.56.02-2.28.03Z"/>
              <path className="cls-169" d="M924.99,427c0,.11-.02.22-.02.32,0,.14,0,.28.01.42.71,0,1.48-.02,2.28-.03,1.23-.02,2.54-.03,3.92-.05-.01-.13-.03-.27-.04-.4,0-.11.06-.23.11-.34-1.39.02-2.73.03-3.98.05-.79,0-1.55.02-2.27.03Z"/>
              <path className="cls-186" d="M925.05,426.46c0,.07-.01.14-.02.22,0,.11-.03.22-.04.32.71,0,1.47-.02,2.27-.03,1.26-.01,2.59-.03,3.98-.05.04-.11.13-.23.18-.34.03-.07.08-.15.1-.22-1.48.02-2.93.05-4.26.07-.77.01-1.51.02-2.21.03Z"/>
              <path className="cls-293" d="M925.07,426.03c0,.07-.01.15-.01.22s0,.14-.01.22c.7-.01,1.44-.02,2.21-.03,1.34-.02,2.78-.04,4.26-.07.02-.07.05-.15.05-.22,0-.07.03-.15.06-.22-1.5.03-2.97.05-4.37.08-.76.01-1.49.02-2.19.03Z"/>
              <path className="cls-224" d="M925.13,425.56c0,.08-.02.16-.03.25,0,.07-.02.15-.02.22.7-.01,1.43-.02,2.19-.03,1.4-.02,2.87-.05,4.37-.08.02-.07.07-.15.11-.23.04-.08.1-.17.14-.25-1.58.03-3.14.06-4.61.09-.74.01-1.45.03-2.13.04Z"/>
              <path className="cls-94" d="M925.15,425.24s0,.05,0,.08c0,.08-.02.16-.02.25.68-.01,1.4-.03,2.13-.04,1.47-.03,3.03-.06,4.61-.09.04-.08.09-.17.11-.25,0-.03.01-.05.01-.08-1.61.03-3.22.06-4.74.09-.73.01-1.43.03-2.11.04Z"/>
              <path className="cls-94" d="M925.1,424.74c.02.14.06.29.06.43,0,.03,0,.05,0,.08.68-.01,1.38-.03,2.11-.04,1.52-.03,3.12-.06,4.74-.09,0-.03,0-.05,0-.08,0-.16-.04-.31-.07-.47-1.6.05-3.19.1-4.67.13-.76.01-1.48.02-2.16.03Z"/>
              <path className="cls-288" d="M924.93,424c.02.1.06.2.08.31.03.14.08.29.09.43.68-.01,1.4-.02,2.16-.03,1.48-.04,3.07-.09,4.67-.13-.03-.15-.08-.3-.12-.44-.03-.1-.06-.21-.09-.3-1.53.06-3.05.12-4.47.16-.83,0-1.61.01-2.33.02Z"/>
              <path className="cls-375" d="M924.77,423.29c.02.14.06.27.08.41.02.1.06.2.07.31.72,0,1.5-.01,2.33-.02,1.42-.05,2.93-.11,4.47-.16-.03-.1-.06-.2-.07-.29-.02-.14-.06-.27-.1-.4-1.48.05-2.94.11-4.29.16-.88,0-1.72,0-2.49,0Z"/>
              <path className="cls-455" d="M924.63,422.24c.03.21.09.43.09.64,0,.14.03.27.04.41.77,0,1.61,0,2.49,0,1.35-.05,2.81-.11,4.29-.16-.04-.13-.1-.25-.16-.37-.04-.19-.15-.38-.25-.58-1.36.02-2.68.05-3.88.08-.96,0-1.83-.01-2.63-.02Z"/>
              <path className="cls-566" d="M924.42,421.36c.01.08.04.15.05.23.04.21.12.43.16.64.79,0,1.67.01,2.63.02,1.2-.03,2.52-.06,3.88-.08-.1-.19-.25-.38-.38-.57-.04-.07-.1-.14-.14-.21-1.18,0-2.32,0-3.36,0-1.03-.01-1.98-.03-2.83-.04Z"/>
              <path className="cls-566" d="M924.33,420.86c0,.09.03.18.05.27.01.08.03.15.05.23.85.01,1.81.02,2.83.04,1.05,0,2.18,0,3.36,0-.04-.07-.09-.14-.14-.21-.05-.08-.11-.16-.15-.25-1.08-.01-2.11-.02-3.08-.03-1.07-.02-2.05-.04-2.93-.05Z"/>
              <path className="cls-455" d="M924.3,420.59c0,.09.02.18.03.27.88.01,1.86.03,2.93.05.97,0,1.99.02,3.08.03-.04-.08-.09-.16-.13-.25-1.04-.02-2.03-.04-2.95-.06-1.09-.02-2.08-.04-2.96-.06Z"/>
              <path className="cls-242" d="M921.58,431.82c0,.19.02.37.02.56.54-.03,1.12-.05,1.73-.08.61-.03,1.24-.06,1.9-.08,0-.18-.01-.36-.02-.55-.66.03-1.3.05-1.9.08-.61.03-1.19.05-1.73.07Z"/>
              <path className="cls-516" d="M921.5,430.56c0,.23.04.46.05.69,0,.19.03.37.04.56.54-.02,1.12-.05,1.73-.07.61-.03,1.24-.05,1.9-.08,0-.18-.03-.36-.03-.55-.01-.23-.04-.45-.05-.68-.68.02-1.33.04-1.94.06-.61.02-1.17.04-1.69.06Z"/>
              <path className="cls-517" d="M921.43,429.05c.01.27.04.55.04.82,0,.23.02.46.03.69.52-.02,1.08-.04,1.69-.06.61-.02,1.26-.04,1.94-.06,0-.23-.03-.45-.03-.68,0-.27-.03-.53-.04-.8-.69.01-1.35.03-1.95.04-.61.01-1.17.03-1.68.04Z"/>
              <path className="cls-307" d="M921.35,427.8c0,.14.02.29.02.43.01.27.05.55.06.82.51-.01,1.07-.03,1.68-.04.61-.01,1.26-.03,1.95-.04-.01-.27-.04-.53-.06-.8,0-.14-.02-.28-.02-.42-.71,0-1.38.02-1.99.03-.61,0-1.16.02-1.64.02Z"/>
              <path className="cls-169" d="M921.36,427.05c0,.11-.02.21-.02.32,0,.14,0,.29.01.43.49,0,1.04-.02,1.64-.02.61,0,1.28-.02,1.99-.03,0-.14-.01-.28-.01-.42,0-.11.02-.22.02-.32-.71,0-1.38.02-1.99.02-.61,0-1.16.01-1.65.02Z"/>
              <path className="cls-566" d="M921.41,426.51c0,.07-.01.14-.02.21,0,.11-.03.21-.04.32.49,0,1.04-.01,1.65-.02.61,0,1.28-.02,1.99-.02,0-.11.03-.22.04-.32,0-.07.02-.14.02-.22-.7,0-1.35.02-1.96.03-.61,0-1.17.02-1.67.03Z"/>
              <path className="cls-221" d="M921.44,426.09c0,.07-.01.14-.01.21s0,.14-.01.21c.5,0,1.07-.02,1.67-.03.61,0,1.27-.02,1.96-.03,0-.07.01-.14.01-.22s0-.15.01-.22c-.7.01-1.35.02-1.96.03-.61.01-1.17.02-1.68.03Z"/>
              <path className="cls-162" d="M921.49,425.63c0,.08-.02.16-.03.24,0,.07-.02.14-.02.21.51,0,1.07-.02,1.68-.03.61-.01,1.27-.02,1.96-.03,0-.07.02-.15.02-.22,0-.08.02-.16.03-.25-.68.01-1.33.02-1.94.04-.61.01-1.18.02-1.7.03Z"/>
              <path className="cls-363" d="M921.51,425.32s0,.05,0,.07c0,.08-.02.16-.02.24.52-.01,1.09-.02,1.7-.03.61-.01,1.26-.02,1.94-.04,0-.08.02-.16.02-.25,0-.03,0-.05,0-.08-.68.01-1.32.03-1.93.04-.61.01-1.18.02-1.71.04Z"/>
              <path className="cls-507" d="M921.45,424.8c.02.15.06.29.06.44,0,.02,0,.05,0,.07.53-.01,1.1-.02,1.71-.04.61-.01,1.26-.03,1.93-.04,0-.03,0-.05,0-.08,0-.14-.04-.28-.06-.43-.68.01-1.32.02-1.93.03s-1.19.02-1.72.03Z"/>
              <path className="cls-288" d="M921.27,424.04c.02.11.06.21.08.32.03.15.09.3.1.44.52,0,1.1-.02,1.72-.03s1.25-.02,1.93-.03c-.02-.14-.07-.29-.09-.43-.02-.1-.06-.2-.08-.31-.72,0-1.39.01-2.01.02-.61,0-1.17.01-1.65.02Z"/>
              <path className="cls-207" d="M921.1,423.3c.02.14.06.28.09.42.02.11.06.21.08.32.48,0,1.04-.01,1.65-.02.61,0,1.28-.01,2.01-.02-.02-.1-.06-.2-.07-.31-.02-.14-.07-.27-.08-.41-.77,0-1.48,0-2.09,0-.62,0-1.14,0-1.58.01Z"/>
              <path className="cls-350" d="M920.95,422.22c.03.22.1.44.1.66,0,.14.03.28.05.42.43,0,.96,0,1.58-.01.62,0,1.32,0,2.09,0-.02-.14-.04-.27-.04-.41,0-.21-.06-.43-.09-.64-.79,0-1.5,0-2.12-.01s-1.15,0-1.57,0Z"/>
              <path className="cls-566" d="M920.73,421.32c.01.08.04.16.06.24.04.22.13.44.17.66.42,0,.95,0,1.57,0s1.32,0,2.12.01c-.03-.21-.12-.43-.16-.64-.01-.08-.04-.15-.05-.23-.85-.01-1.6-.02-2.22-.03-.62,0-1.12-.01-1.47-.01Z"/>
              <path className="cls-566" d="M920.63,420.8c0,.09.04.19.05.28.01.08.04.16.05.24.36,0,.85,0,1.47.01.62,0,1.37.02,2.22.03-.01-.08-.04-.15-.05-.23-.01-.09-.04-.18-.05-.27-.88-.01-1.64-.03-2.27-.04-.62-.01-1.11-.02-1.44-.02Z"/>
              <path className="cls-455" d="M920.6,420.52c0,.09.02.19.03.28.33,0,.81.01,1.44.02.62,0,1.39.02,2.27.04,0-.09-.03-.18-.03-.27-.88-.02-1.64-.03-2.26-.04-.62-.01-1.11-.02-1.45-.03Z"/>
              <path className="cls-491" d="M920.09,431.88v.57c.46-.02.97-.05,1.51-.07,0-.19-.01-.37-.02-.56-.54.02-1.04.04-1.49.06Z"/>
              <path className="cls-350" d="M920.09,430.61v1.27c.45-.02.95-.04,1.49-.06,0-.19-.03-.37-.04-.56-.01-.23-.04-.46-.05-.69-.52.02-.99.03-1.41.05Z"/>
              <path className="cls-517" d="M920.09,429.08v1.53c.42-.02.89-.03,1.41-.05,0-.23-.03-.46-.03-.69,0-.27-.03-.55-.04-.82-.51.01-.96.02-1.34.03Z"/>
              <path className="cls-307" d="M920.09,427.82v1.27c.38,0,.83-.02,1.34-.03-.01-.27-.04-.55-.06-.82,0-.14-.02-.29-.02-.43-.49,0-.91.01-1.26.02Z"/>
              <path className="cls-169" d="M920.09,427.06v.75c.35,0,.77-.01,1.26-.02,0-.14-.01-.29-.01-.43,0-.11.01-.21.02-.32-.49,0-.91.01-1.27.02Z"/>
              <path className="cls-566" d="M920.09,426.54v.53c.36,0,.78-.01,1.27-.02,0-.11.03-.21.04-.32,0-.07.02-.14.02-.21-.5,0-.95.01-1.33.02Z"/>
              <path className="cls-278" d="M920.09,426.11v.42c.38,0,.82-.01,1.33-.02,0-.07.01-.14.01-.21s0-.14.01-.21c-.51,0-.96.02-1.35.02Z"/>
              <path className="cls-566" d="M920.09,425.66v.45c.39,0,.84-.02,1.35-.02,0-.07.02-.14.02-.21,0-.08.02-.16.03-.24-.52.01-.99.02-1.4.03Z"/>
              <path className="cls-578" d="M920.09,425.35v.31c.41,0,.88-.02,1.4-.03,0-.08.02-.16.02-.24,0-.02,0-.05,0-.07-.53.01-1,.02-1.43.03Z"/>
              <path className="cls-622" d="M920.09,424.83v.52c.42,0,.9-.02,1.43-.03,0-.02,0-.05,0-.07,0-.15-.05-.29-.06-.44-.52,0-.99.02-1.36.03Z"/>
              <path className="cls-288" d="M920.09,424.06v.76c.38,0,.84-.02,1.36-.03-.02-.15-.08-.3-.1-.44-.02-.11-.06-.21-.08-.32-.48,0-.88.01-1.18.02Z"/>
              <path className="cls-455" d="M920.09,423.32v.75c.3,0,.7-.01,1.18-.02-.02-.11-.06-.21-.08-.32-.02-.14-.07-.28-.09-.42-.43,0-.77.01-1.02.02Z"/>
              <path className="cls-566" d="M920.09,422.23v1.09c.24,0,.58-.01,1.02-.02-.02-.14-.05-.28-.05-.42,0-.22-.07-.44-.1-.66-.42,0-.71,0-.86,0Z"/>
              <path className="cls-566" d="M920.09,421.32v.91c.15,0,.45,0,.86,0-.03-.22-.13-.44-.17-.66-.01-.08-.04-.16-.06-.24-.36,0-.57,0-.64,0Z"/>
              <path className="cls-162" d="M920.09,420.79v.53c.07,0,.29,0,.64,0-.01-.08-.04-.16-.05-.24-.01-.09-.04-.19-.05-.28-.33,0-.52,0-.54,0Z"/>
              <path className="cls-207" d="M920.09,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
            </g>
            <g>
              <path className="cls-158" d="M920.09,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
            </g>
            <g>
              <path className="cls-158" d="M920.09,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M920.09,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
            </g>
          </g>
          <g id="MeshGrid-4" data-name="MeshGrid">
            <g>
              <path className="cls-591" d="M920.94,964.11c-.03.35-.16.69-.18,1.01-.43-.02-.67-.03-.67-.03v-1.12c.11,0,.4.07.85.14Z"/>
              <path className="cls-548" d="M921.26,962.2c-.02.28-.11.56-.14.83-.03.37-.16.72-.19,1.07-.45-.07-.74-.14-.85-.14v-1.96c.29,0,.68.1,1.18.19Z"/>
              <path className="cls-231" d="M921.5,960.68c-.02.23-.08.45-.1.67-.02.29-.12.58-.14.86-.49-.09-.88-.18-1.18-.19v-1.47c.41,0,.88.07,1.41.13Z"/>
              <path className="cls-325" d="M921.67,959.52c-.01.16-.05.32-.07.48-.02.23-.08.45-.1.68-.54-.06-1-.12-1.41-.13v-1.07c.48,0,1.01.03,1.58.04Z"/>
              <path className="cls-490" d="M921.79,958.18c-.02.28-.04.57-.06.85-.01.16-.05.32-.07.48-.57-.02-1.09-.04-1.58-.04v-1.33c.51,0,1.09.03,1.7.04Z"/>
              <path className="cls-511" d="M921.98,955.12c-.05.74-.08,1.48-.13,2.22-.02.28-.04.57-.06.85-.61-.01-1.19-.03-1.7-.04v-3.2c.54.01,1.2.1,1.89.17Z"/>
              <path className="cls-29" d="M922.26,949.26c-.05,1.21-.1,2.43-.16,3.65-.04.74-.07,1.48-.12,2.21-.7-.08-1.36-.16-1.89-.17v-6.13c.6.03,1.37.24,2.18.44Z"/>
              <path className="cls-473" d="M922.49,941.17c-.03,1.48-.05,2.96-.11,4.44-.04,1.21-.07,2.43-.12,3.65-.81-.2-1.57-.41-2.18-.44v-8.46c.7.05,1.52.44,2.41.82Z"/>
              <path className="cls-516" d="M922.55,935.21c0,.5,0,1,0,1.5-.01,1.49-.02,2.97-.05,4.45-.89-.38-1.71-.76-2.41-.82v-6.21c.75.07,1.57.57,2.46,1.07Z"/>
              <path className="cls-516" d="M922.55,931.48c0,.77,0,1.51,0,2.22,0,.5,0,1,0,1.5-.89-.5-1.72-1-2.46-1.07v-3.42c.75.07,1.57.42,2.46.76Z"/>
              <path className="cls-566" d="M922.54,927.42v1.65c0,.83,0,1.63,0,2.41-.89-.35-1.71-.69-2.46-.76v-3.94c.74.07,1.56.36,2.45.64Z"/>
              <path className="cls-569" d="M922.54,686.43c0,100.35,0,204.24,0,239.31v1.68c-.89-.28-1.71-.57-2.45-.64v-235.14c.73,1.01,1.55-2.11,2.45-5.22Z"/>
              <path className="cls-217" d="M922.54,448.01c0,2.27,0,4.59,0,7.03,0,6.34,0,14.48,0,25.11,0,34.33,0,119,0,206.29-.9,3.11-1.72,6.23-2.45,5.22v-240.53c.72-.03,1.55-1.58,2.45-3.11Z"/>
              <path className="cls-445" d="M922.53,437.32c0,1.35,0,2.73,0,4.16,0,2.11,0,4.26,0,6.53-.9,1.53-1.73,3.08-2.45,3.11v-12.38c.72-.03,1.55-.73,2.45-1.42Z"/>
              <path className="cls-554" d="M922.53,432.86v.54c0,1.27,0,2.56,0,3.92-.9.69-1.73,1.39-2.45,1.42v-5.6c.72-.03,1.55-.15,2.45-.27Z"/>
              <path className="cls-491" d="M922.53,432.33v.53c-.9.12-1.73.24-2.45.27v-.69c.72-.03,1.55-.07,2.45-.11Z"/>
              <path className="cls-168" d="M923.63,964.21c-.08.32-.15.63-.22.91-.28,0-.55.02-.8.02-.8.01-1.43,0-1.86-.01.02-.33.16-.67.18-1.01.45.07,1.07.13,1.84.11.28,0,.56,0,.86-.01Z"/>
              <path className="cls-531" d="M924.07,962.34c-.07.29-.13.57-.2.84-.08.36-.17.71-.24,1.03-.3,0-.58,0-.86.01-.77.02-1.38-.05-1.84-.11.03-.35.16-.71.19-1.07.02-.27.11-.55.14-.83.5.09,1.1.17,1.82.15.34,0,.66-.02.99-.02Z"/>
              <path className="cls-211" d="M924.44,960.73c-.06.24-.11.48-.17.71-.07.31-.14.61-.21.9-.33,0-.65.01-.99.02-.72.02-1.32-.07-1.82-.15.02-.28.11-.57.14-.86.02-.22.08-.44.1-.67.54.06,1.14.11,1.83.09.38-.01.74-.02,1.11-.04Z"/>
              <path className="cls-539" d="M924.74,959.47c-.04.18-.08.35-.12.52-.06.25-.12.49-.17.73-.38.02-.74.03-1.11.04-.69.02-1.3-.03-1.83-.09.02-.23.08-.45.1-.68.01-.16.05-.32.07-.48.57.02,1.19.02,1.86,0,.4-.01.8-.03,1.22-.05Z"/>
              <path className="cls-448" d="M925.07,958.11c-.07.28-.13.55-.2.83-.04.18-.09.35-.13.53-.42.02-.82.03-1.22.05-.67.02-1.29.01-1.86,0,.01-.16.05-.32.07-.48.02-.28.04-.57.06-.85.61.01,1.27.02,1.93,0,.41-.01.87-.04,1.35-.07Z"/>
              <path className="cls-199" d="M925.76,955.14c-.16.72-.32,1.42-.49,2.15-.07.28-.13.55-.2.83-.48.03-.93.06-1.35.07-.67.02-1.32.02-1.93,0,.02-.28.04-.57.06-.85.05-.74.09-1.48.13-2.22.7.08,1.44.15,2.15.13.49,0,1.05-.05,1.63-.12Z"/>
              <path className="cls-29" d="M926.93,949.48c-.24,1.18-.45,2.33-.71,3.51-.16.72-.3,1.42-.47,2.14-.58.06-1.14.11-1.63.12-.7.01-1.45-.06-2.15-.13.05-.74.08-1.48.12-2.21.07-1.22.11-2.43.16-3.65.81.2,1.68.4,2.49.41.71.02,1.42-.07,2.19-.19Z"/>
              <path className="cls-495" d="M928.31,941.66c-.24,1.45-.46,2.86-.73,4.31-.22,1.19-.41,2.33-.65,3.51-.76.12-1.48.21-2.19.19-.81-.01-1.67-.21-2.49-.41.05-1.21.08-2.43.12-3.65.05-1.48.07-2.96.11-4.44.89.38,1.84.76,2.79.8,1,.06,1.98-.09,3.03-.31Z"/>
              <path className="cls-134" d="M929.12,935.84c-.06.5-.09.98-.16,1.48-.21,1.47-.4,2.89-.64,4.35-1.05.21-2.03.37-3.03.31-.95-.04-1.9-.42-2.79-.8.03-1.48.04-2.97.05-4.45,0-.5,0-1,0-1.5.89.5,1.86,1,2.89,1.06,1.15.08,2.37-.14,3.68-.43Z"/>
              <path className="cls-361" d="M929.4,932.01c-.04.77-.08,1.63-.14,2.35-.06.5-.08.99-.14,1.48-1.31.29-2.52.51-3.68.43-1.03-.06-2-.56-2.89-1.06,0-.5,0-1,0-1.5,0-.71,0-1.45,0-2.22.89.35,1.86.69,2.9.76,1.21.08,2.53-.05,3.95-.23Z"/>
              <path className="cls-401" d="M929.53,928.48c-.01.34-.02.72-.03,1.03-.04.82-.06,1.73-.1,2.5-1.42.18-2.74.31-3.95.23-1.04-.06-2.01-.41-2.9-.76,0-.77,0-1.58,0-2.41v-1.65c.89.28,1.86.57,2.91.63,1.25.07,2.61.24,4.08.42Z"/>
              <path className="cls-401" d="M930.13,693.37c-.03,69.25-.14,136.26-.14,171.04s-.12,54.74-.42,62.95c-.01.37-.02.78-.03,1.12-1.47-.18-2.84-.35-4.08-.42-1.04-.07-2.01-.35-2.91-.63v-1.68c0-35.07,0-138.97,0-239.31.9-3.11,1.87-6.2,2.91-5.11,1.46-3.01,3.04,4.49,4.68,12.05Z"/>
              <path className="cls-566" d="M930.37,445.36c0,2.21,0,4.53,0,7.08,0,3.05-.01,6.58-.01,10.63,0,4.56-.01,10.04-.01,16.58,0,32.76-.18,124.95-.21,213.72-1.64-7.55-3.21-15.06-4.68-12.05-1.03-1.08-2.01,2.01-2.91,5.11,0-87.28,0-171.96,0-206.29,0-10.63,0-18.77,0-25.11,0-2.44,0-4.76,0-7.03.9-1.53,1.88-3.03,2.91-2.97,1.57.09,3.24.19,4.93.33Z"/>
              <path className="cls-566" d="M930.39,435.71c0,1.12,0,2.31,0,3.64,0,1.83,0,3.8,0,6.01-1.69-.14-3.36-.24-4.93-.33-1.03-.06-2.01,1.45-2.91,2.97,0-2.27,0-4.42,0-6.53,0-1.43,0-2.81,0-4.16.9-.69,1.88-1.38,2.91-1.39,1.57-.02,3.25-.12,4.95-.21Z"/>
              <path className="cls-482" d="M930.4,432.36v.37c0,.89,0,1.86,0,2.98-1.7.09-3.38.19-4.95.21-1.03.02-2.01.7-2.91,1.39,0-1.35,0-2.64,0-3.92v-.54c.9-.12,1.88-.24,2.91-.29,1.57-.07,3.25-.14,4.95-.21Z"/>
              <path className="cls-197" d="M930.4,432c0,.12,0,.24,0,.36-1.7.07-3.38.15-4.95.21-1.03.04-2.01.17-2.91.29v-.53c.9-.04,1.88-.08,2.91-.13,1.57-.07,3.25-.14,4.95-.2Z"/>
              <path className="cls-225" d="M924.86,964.16c-.11.32-.21.63-.3.9-.09,0-.18.01-.26.02-.31.02-.61.03-.89.04.07-.28.14-.58.22-.91.3,0,.61-.02.95-.03.1,0,.19,0,.28-.01Z"/>
              <path className="cls-373" d="M925.48,962.27c-.1.29-.19.58-.28.85-.12.37-.23.71-.34,1.04-.09,0-.18,0-.28.01-.34.02-.66.03-.95.03.08-.32.16-.67.24-1.03.06-.27.13-.55.2-.84.33,0,.68-.02,1.08-.04.11,0,.22-.01.33-.02Z"/>
              <path className="cls-513" d="M926.02,960.65c-.08.24-.16.48-.24.72-.1.31-.2.61-.3.91-.11,0-.21.01-.33.02-.4.02-.75.03-1.08.04.07-.29.14-.59.21-.9.05-.23.11-.47.17-.71.38-.01.77-.03,1.21-.06.12,0,.24-.01.37-.02Z"/>
              <path className="cls-180" d="M926.44,959.38c-.06.18-.12.35-.18.53-.09.25-.17.5-.25.74-.12,0-.24.01-.37.02-.44.03-.83.04-1.21.06.06-.24.11-.49.17-.73.04-.17.08-.35.12-.52.42-.02.85-.04,1.31-.07.13,0,.26-.01.39-.02Z"/>
              <path className="cls-428" d="M926.93,957.99c-.1.28-.2.57-.3.86-.06.18-.12.36-.18.53-.13,0-.26.02-.39.02-.46.03-.89.05-1.31.07.04-.18.08-.35.13-.53.07-.28.13-.55.2-.83.48-.03.97-.06,1.44-.09.13,0,.27-.02.41-.03Z"/>
              <path className="cls-511" d="M928.02,954.91c-.26.74-.53,1.48-.79,2.22-.1.28-.2.57-.3.85-.14,0-.28.02-.41.03-.48.03-.97.06-1.44.09.07-.28.13-.55.2-.83.17-.72.32-1.43.49-2.15.58-.06,1.19-.14,1.77-.18.16-.01.33-.03.49-.04Z"/>
              <path className="cls-29" d="M930.11,949.05c-.43,1.21-.87,2.44-1.3,3.65-.27.74-.53,1.48-.79,2.22-.17.01-.33.03-.49.04-.58.05-1.18.12-1.77.18.16-.72.31-1.42.47-2.14.26-1.19.47-2.33.71-3.51.76-.12,1.56-.27,2.43-.37.24-.03.49-.05.75-.06Z"/>
              <path className="cls-336" d="M932.87,940.92c-.48,1.5-.97,2.99-1.48,4.47-.42,1.22-.84,2.44-1.28,3.65-.25.02-.5.04-.75.06-.87.1-1.67.25-2.43.37.24-1.18.43-2.33.65-3.51.27-1.44.49-2.85.73-4.31,1.05-.21,2.16-.48,3.43-.64.35-.05.74-.08,1.13-.1Z"/>
              <path className="cls-200" d="M934.63,934.84c-.13.52-.27,1.03-.41,1.55-.42,1.52-.87,3.04-1.35,4.54-.39.02-.78.05-1.13.1-1.26.16-2.38.43-3.43.64.24-1.45.43-2.88.64-4.35.07-.49.1-.98.16-1.48,1.31-.29,2.7-.66,4.21-.87.42-.06.85-.11,1.3-.13Z"/>
              <path className="cls-132" d="M935.35,931.45c-.1.6-.21,1.19-.35,1.82-.12.52-.25,1.04-.37,1.56-.44.03-.87.08-1.3.13-1.51.21-2.91.58-4.21.87.06-.5.08-.98.14-1.48.07-.72.1-1.57.14-2.35,1.42-.18,2.95-.4,4.57-.49.45-.03.92-.05,1.39-.07Z"/>
              <path className="cls-489" d="M935.71,929.06c-.03.25-.06.46-.09.66-.08.57-.17,1.13-.27,1.73-.47.02-.93.04-1.39.07-1.62.09-3.15.31-4.57.49.04-.77.06-1.68.1-2.5.01-.31.02-.69.03-1.03,1.47.18,3.06.37,4.74.49.47.03.95.06,1.44.09Z"/>
              <path className="cls-151" d="M936.67,704.06c-.03,69.62-.07,130.89-.07,149.56,0,46.27-.16,67.43-.81,74.65-.03.29-.06.54-.08.79-.49-.02-.97-.05-1.44-.09-1.68-.12-3.27-.31-4.74-.49.01-.34.02-.75.03-1.12.3-8.22.42-27.82.42-62.95s.11-101.79.14-171.04c1.64,7.55,3.35,15.16,5.09,12.33.48-1.04.97-1.33,1.46-1.64Z"/>
              <path className="cls-258" d="M936.8,443.37c0,1.96,0,4.09-.01,6.35,0,2.5,0,5.4,0,8.7,0,37.51-.07,149.53-.11,245.63-.49.31-.97.6-1.46,1.64-1.74,2.83-3.45-4.77-5.09-12.33.04-88.77.21-180.96.21-213.72,0-6.55.01-12.02.01-16.58,0-4.05,0-7.58.01-10.63,0-2.55,0-4.88,0-7.08,1.69.14,3.4.33,5.05.59.46-.98.92-1.78,1.38-2.59Z"/>
              <path className="cls-489" d="M936.82,434.88c0,.94,0,1.98,0,3.12,0,1.61,0,3.41-.01,5.37-.45.81-.91,1.61-1.38,2.59-1.65-.27-3.36-.45-5.05-.59,0-2.21,0-4.18,0-6.01,0-1.33,0-2.53,0-3.64,1.7-.09,3.42-.15,5.07-.12.46-.27.92-.49,1.36-.71Z"/>
              <path className="cls-314" d="M936.82,432.09c0,.1,0,.2,0,.3,0,.72,0,1.56,0,2.5-.45.22-.9.44-1.36.71-1.65-.04-3.37.03-5.07.12,0-1.12,0-2.09,0-2.98v-.37c1.7-.07,3.42-.14,5.07-.18.46-.02.91-.06,1.36-.09Z"/>
              <path className="cls-361" d="M936.82,431.8v.29c-.45.04-.9.07-1.36.09-1.64.05-3.36.11-5.07.18,0-.12,0-.24,0-.36,1.7-.06,3.42-.12,5.07-.17.46-.01.91-.03,1.36-.04Z"/>
              <path className="cls-461" d="M925.69,964.1c-.14.33-.27.63-.38.91-.16.01-.32.02-.48.03-.09,0-.18.01-.27.02.09-.28.19-.58.3-.9.09,0,.18-.01.29-.02.19-.01.37-.03.54-.04Z"/>
              <path className="cls-373" d="M926.54,962.2c-.13.3-.26.58-.39.86-.17.37-.32.72-.46,1.05-.18.01-.35.03-.54.04-.1,0-.19.01-.29.02.11-.32.22-.67.34-1.04.09-.27.18-.56.28-.85.11,0,.22-.01.33-.02.25-.02.49-.03.73-.05Z"/>
              <path className="cls-291" d="M927.26,960.57c-.11.24-.21.49-.31.72-.14.31-.27.62-.41.91-.24.02-.48.04-.73.05-.12,0-.23.01-.33.02.1-.29.2-.6.3-.91.08-.24.16-.47.24-.72.12,0,.25-.01.37-.02.29-.02.58-.04.87-.06Z"/>
              <path className="cls-234" d="M927.79,959.3c-.07.18-.14.35-.22.53-.1.25-.21.5-.31.74-.29.02-.58.04-.87.06-.13,0-.25.02-.37.02.08-.24.16-.49.25-.74.06-.17.12-.35.18-.53.13,0,.26-.02.4-.02.31-.02.63-.04.95-.06Z"/>
              <path className="cls-576" d="M928.34,957.91c-.11.28-.22.57-.33.85-.07.18-.14.36-.21.53-.32.02-.64.04-.95.06-.13,0-.27.02-.4.02.06-.18.12-.35.18-.53.1-.29.2-.57.3-.86.14,0,.28-.02.42-.03.32-.02.66-.04.99-.06Z"/>
              <path className="cls-191" d="M929.57,954.85c-.31.74-.61,1.47-.9,2.21-.11.28-.23.57-.34.85-.33.02-.66.04-.99.06-.14,0-.28.02-.42.03.1-.28.2-.57.3-.85.26-.74.52-1.49.79-2.22.17-.01.34-.02.51-.03.33-.02.69-.03,1.05-.04Z"/>
              <path className="cls-29" d="M932.05,949.02c-.52,1.21-1.03,2.41-1.55,3.62-.31.73-.62,1.47-.93,2.2-.36.01-.72.02-1.05.04-.17,0-.34.02-.51.03.27-.74.53-1.48.79-2.22.44-1.21.87-2.44,1.3-3.65.25-.02.51-.03.78-.03.36,0,.76,0,1.16,0Z"/>
              <path className="cls-484" d="M935.31,940.92c-.54,1.5-1.13,2.99-1.73,4.47-.5,1.22-1.01,2.42-1.52,3.63-.4,0-.79,0-1.16,0-.27,0-.53.01-.78.03.43-1.21.86-2.44,1.28-3.65.51-1.48,1-2.98,1.48-4.47.39-.02.8-.03,1.19-.02.4,0,.82.01,1.25.02Z"/>
              <path className="cls-141" d="M937.24,934.82c-.14.52-.29,1.04-.44,1.55-.45,1.54-.95,3.05-1.5,4.55-.42-.01-.85-.02-1.25-.02-.39,0-.8,0-1.19.02.48-1.5.92-3.01,1.35-4.54.14-.51.28-1.03.41-1.55.44-.03.89-.04,1.36-.03.42,0,.84.01,1.26.01Z"/>
              <path className="cls-460" d="M938.04,931.45c-.12.59-.25,1.19-.39,1.81-.13.53-.26,1.05-.4,1.57-.42,0-.84,0-1.26-.01-.46-.01-.91,0-1.36.03.13-.52.25-1.04.37-1.56.14-.63.25-1.22.35-1.82.47-.02.95-.03,1.43-.02.42,0,.84.01,1.25.01Z"/>
              <path className="cls-171" d="M938.44,929.05c-.03.27-.06.48-.1.7-.09.54-.19,1.11-.3,1.69-.42,0-.84,0-1.25-.01-.48,0-.96,0-1.43.02.1-.6.19-1.17.27-1.73.03-.21.06-.42.09-.66.49.02.98.04,1.48.04.41,0,.83-.01,1.25-.05Z"/>
              <path className="cls-481" d="M939.39,690.3c0,61.89-.01,120.16-.02,153.74,0,1.79,0,3.52,0,5.19,0,20.53-.04,36.86-.14,49.57-.09,12.93-.03,22.71-.7,29.44-.03.31-.06.56-.09.83-.42.03-.84.05-1.25.05-.5,0-1-.02-1.48-.04.03-.25.06-.5.08-.79.65-7.22.81-28.38.81-74.65,0-18.67.04-79.94.07-149.56.49-.31.98-.64,1.46-1.78.41-1.21.83-6.59,1.25-11.98Z"/>
              <path className="cls-578" d="M939.4,445.71c0,2.04,0,4.15,0,6.32,0,35.71-.01,141.16-.02,238.26-.42,5.39-.84,10.76-1.25,11.98-.49,1.14-.97,1.47-1.46,1.78.04-96.1.11-208.13.11-245.63,0-3.3,0-6.21,0-8.7,0-2.26,0-4.39.01-6.35.45-.81.9-1.61,1.33-2.59.42-.02.85,2.46,1.27,4.93Z"/>
              <path className="cls-578" d="M939.4,436.14v3.66c0,1.9,0,3.87,0,5.92-.42-2.48-.85-4.95-1.27-4.93-.43.97-.88,1.78-1.33,2.59,0-1.96,0-3.76.01-5.37,0-1.14,0-2.18,0-3.12.45-.22.89-.43,1.31-.7.42-.01.85.97,1.27,1.96Z"/>
              <path className="cls-484" d="M939.41,432.21v.47c0,1.12,0,2.27,0,3.46-.42-.99-.85-1.97-1.27-1.96-.43.27-.87.49-1.31.7,0-.94,0-1.77,0-2.5,0-.1,0-.2,0-.3.45-.04.88-.07,1.31-.09.42,0,.85.1,1.27.21Z"/>
              <path className="cls-569" d="M939.41,431.74v.47c-.42-.11-.85-.22-1.27-.21-.43.02-.87.05-1.31.09v-.29c.45-.01.88-.02,1.31-.03.42,0,.85-.02,1.27-.02Z"/>
              <path className="cls-241" d="M927.24,963.96c-.22.33-.43.64-.59.93-.29.03-.57.06-.84.08-.17.01-.33.03-.5.04.11-.28.24-.58.38-.91.18-.01.36-.03.56-.05.33-.03.66-.06.99-.09Z"/>
              <path className="cls-367" d="M928.52,962.04c-.19.3-.39.59-.57.87-.24.37-.49.73-.71,1.06-.33.04-.67.07-.99.09-.2.02-.38.03-.56.05.14-.33.3-.68.46-1.05.12-.28.25-.56.39-.86.24-.02.48-.04.74-.06.42-.03.83-.07,1.24-.11Z"/>
              <path className="cls-96" d="M929.55,960.39c-.15.25-.29.49-.44.73-.19.31-.4.62-.59.92-.41.04-.82.08-1.24.11-.26.02-.5.04-.74.06.13-.3.27-.6.41-.91.1-.24.21-.48.31-.72.29-.02.58-.04.88-.06.48-.03.95-.07,1.41-.11Z"/>
              <path className="cls-325" d="M930.28,959.11c-.1.18-.19.35-.29.53-.15.25-.29.5-.44.75-.46.04-.93.08-1.41.11-.29.02-.59.04-.88.06.1-.24.21-.49.31-.74.07-.17.14-.35.22-.53.32-.02.64-.04.95-.07.51-.04,1.03-.07,1.54-.12Z"/>
              <path className="cls-127" d="M930.96,957.74c-.13.28-.27.56-.4.83-.09.18-.18.36-.28.54-.51.04-1.02.08-1.54.12-.32.02-.64.04-.95.07.07-.18.14-.36.21-.53.11-.28.22-.57.33-.85.33-.02.67-.04.99-.06.53-.04,1.08-.07,1.64-.11Z"/>
              <path className="cls-229" d="M932.43,954.74c-.35.72-.71,1.44-1.06,2.16-.13.28-.27.55-.4.83-.55.04-1.11.07-1.64.11-.33.02-.66.04-.99.06.11-.28.22-.57.34-.85.3-.74.6-1.48.9-2.21.36-.01.72-.02,1.05-.04.55-.03,1.17-.04,1.8-.06Z"/>
              <path className="cls-29" d="M935.2,949.02c-.56,1.19-1.14,2.38-1.72,3.57-.35.72-.71,1.44-1.06,2.16-.63.01-1.25.03-1.8.06-.34.02-.69.03-1.05.04.31-.74.62-1.47.93-2.2.51-1.21,1.03-2.42,1.55-3.62.4,0,.79,0,1.16,0,.59-.02,1.29,0,1.99,0Z"/>
              <path className="cls-148" d="M938.64,940.96c-.56,1.51-1.16,2.99-1.8,4.46-.53,1.21-1.07,2.4-1.64,3.6-.7-.01-1.4-.03-1.99,0-.37.01-.76.01-1.16,0,.52-1.21,1.03-2.42,1.52-3.63.6-1.48,1.19-2.96,1.73-4.47.42.01.85.02,1.26.02.66,0,1.37.01,2.08.02Z"/>
              <path className="cls-277" d="M940.58,934.77c-.14.53-.28,1.06-.43,1.59-.44,1.56-.95,3.09-1.51,4.6-.71-.01-1.42-.03-2.08-.02-.4,0-.83,0-1.26-.02.54-1.5,1.05-3.01,1.5-4.55.15-.52.3-1.03.44-1.55.42,0,.84,0,1.27,0,.69,0,1.38-.02,2.07-.04Z"/>
              <path className="cls-385" d="M941.35,931.36c-.12.59-.24,1.19-.38,1.81-.12.54-.25,1.07-.39,1.61-.69.02-1.38.04-2.07.04-.42,0-.85,0-1.27,0,.14-.52.28-1.04.4-1.57.15-.62.28-1.22.39-1.81.42,0,.84,0,1.26-.01.68-.01,1.37-.04,2.05-.07Z"/>
              <path className="cls-473" d="M941.8,928.53c-.05.41-.1.79-.15,1.13-.09.54-.19,1.11-.3,1.7-.69.03-1.37.06-2.05.07-.42,0-.84.01-1.26.01.12-.59.22-1.15.3-1.69.04-.22.07-.43.1-.7.42-.03.84-.08,1.27-.14.69-.1,1.39-.23,2.09-.39Z"/>
              <path className="cls-332" d="M942.74,678.06c0,55.36-.02,111.52-.05,158.56,0,18.75-.05,36-.07,51.17-.02,15.65.35,29.11-.69,39.52-.04.41-.08.81-.13,1.22-.7.15-1.4.29-2.09.39-.43.06-.85.11-1.27.14.03-.27.06-.52.09-.83.67-6.72.6-16.5.7-29.44.1-12.71.14-29.04.14-49.57,0-1.67,0-3.4,0-5.19,0-33.57.01-91.84.02-153.74.42-5.39.85-10.79,1.27-12.06.69.08,1.39-.01,2.09-.18Z"/>
              <path className="cls-323" d="M942.75,450.6c0,2.52,0,5.04,0,7.56,0,41.44,0,129.58,0,219.9-.7.17-1.4.26-2.09.18-.42,1.27-.85,6.67-1.27,12.06,0-97.1.02-202.55.02-238.26,0-2.17,0-4.28,0-6.32.42,2.48.85,4.96,1.27,4.95.69,0,1.38-.04,2.07-.06Z"/>
              <path className="cls-533" d="M942.74,438.07c0,1.65,0,3.31,0,4.97,0,2.52,0,5.04,0,7.56-.69.03-1.38.06-2.07.06-.42,0-.85-2.47-1.27-4.95,0-2.04,0-4.01,0-5.92v-3.66c.42.99.85,1.97,1.27,1.96.69,0,1.38-.02,2.07-.03Z"/>
              <path className="cls-429" d="M942.74,432.4v5.67c-.69.01-1.38.03-2.07.03-.42,0-.85-.98-1.27-1.96,0-1.19,0-2.34,0-3.46v-.47c.42.11.85.22,1.27.22.69,0,1.38-.02,2.07-.02Z"/>
              <path className="cls-562" d="M942.74,431.71v.7c-.69,0-1.38.01-2.07.02-.42,0-.85-.11-1.27-.22v-.47c.42,0,.85-.01,1.27-.02.69,0,1.38-.01,2.07-.02Z"/>
              <path className="cls-404" d="M929.51,963.67c-.31.34-.6.67-.86.97-.38.06-.75.11-1.12.15-.3.04-.6.07-.88.1.16-.29.38-.6.59-.93.33-.04.67-.08,1.01-.12.41-.05.83-.11,1.26-.18Z"/>
              <path className="cls-409" d="M931.23,961.7c-.26.3-.52.59-.76.88-.33.38-.65.74-.96,1.09-.43.07-.85.13-1.26.18-.34.04-.68.08-1.01.12.22-.33.47-.69.71-1.06.18-.28.38-.57.57-.87.41-.04.82-.09,1.22-.13.49-.06.99-.13,1.49-.2Z"/>
              <path className="cls-262" d="M932.62,960.04c-.2.25-.41.49-.61.73-.26.32-.53.62-.79.93-.5.07-1,.14-1.49.2-.41.05-.81.09-1.22.13.19-.3.4-.6.59-.92.15-.24.29-.48.44-.73.46-.04.93-.09,1.39-.14.56-.06,1.12-.13,1.68-.21Z"/>
              <path className="cls-545" d="M933.65,958.76c-.13.18-.28.36-.41.53-.2.25-.41.5-.61.75-.56.08-1.12.15-1.68.21-.47.05-.93.1-1.39.14.15-.25.29-.5.44-.75.1-.18.2-.35.29-.53.51-.04,1.02-.09,1.53-.14.62-.06,1.23-.13,1.83-.21Z"/>
              <path className="cls-590" d="M934.57,957.41c-.17.27-.35.53-.52.8-.13.18-.27.36-.4.54-.61.08-1.22.15-1.83.21-.51.05-1.02.1-1.53.14.1-.18.19-.36.28-.54.13-.28.27-.56.4-.83.55-.04,1.11-.08,1.64-.13.64-.06,1.31-.13,1.97-.2Z"/>
              <path className="cls-336" d="M936.41,954.52c-.43.7-.87,1.4-1.32,2.09-.17.27-.34.53-.52.8-.67.07-1.34.13-1.97.2-.53.05-1.08.09-1.64.13.13-.28.27-.56.4-.83.35-.72.7-1.44,1.06-2.16.63-.01,1.25-.03,1.8-.08.66-.06,1.42-.1,2.18-.14Z"/>
              <path className="cls-29" d="M939.62,948.91c-.62,1.18-1.27,2.34-1.95,3.51-.41.7-.83,1.4-1.26,2.1-.76.05-1.52.08-2.18.14-.55.05-1.17.07-1.8.08.35-.72.71-1.44,1.06-2.16.58-1.19,1.16-2.37,1.72-3.57.7.01,1.4.02,1.99-.03.72-.05,1.57-.06,2.42-.08Z"/>
              <path className="cls-408" d="M943.24,940.84c-.56,1.53-1.18,3.02-1.86,4.49-.55,1.21-1.14,2.4-1.76,3.58-.85.02-1.7.03-2.42.08-.6.04-1.3.04-1.99.03.56-1.19,1.11-2.39,1.64-3.6.64-1.47,1.25-2.95,1.8-4.46.71.01,1.43.01,2.09-.02.8-.04,1.66-.06,2.51-.1Z"/>
              <path className="cls-203" d="M945.15,934.49c-.13.55-.26,1.11-.41,1.65-.43,1.61-.94,3.17-1.5,4.7-.85.04-1.71.06-2.51.1-.66.03-1.38.03-2.09.02.56-1.51,1.07-3.04,1.51-4.6.15-.53.29-1.05.43-1.59.69-.02,1.38-.05,2.07-.1.83-.05,1.66-.11,2.49-.19Z"/>
              <path className="cls-519" d="M945.89,931c-.12.59-.25,1.19-.38,1.81-.12.56-.23,1.13-.36,1.68-.83.08-1.66.14-2.49.19-.69.04-1.38.07-2.07.1.14-.53.27-1.07.39-1.61.14-.62.27-1.22.38-1.81.69-.03,1.37-.08,2.06-.13.83-.06,1.65-.14,2.48-.22Z"/>
              <path className="cls-137" d="M946.44,927.43c-.07.61-.16,1.3-.24,1.86-.08.55-.19,1.13-.31,1.72-.82.09-1.65.16-2.48.22-.69.05-1.37.1-2.06.13.12-.59.22-1.16.3-1.7.05-.34.1-.72.15-1.13.7-.15,1.41-.32,2.11-.49.85-.2,1.69-.42,2.53-.61Z"/>
              <path className="cls-411" d="M947.36,676.93c0,55.03-.02,110.89-.06,157.7-.02,18.92-.12,36.32-.05,51.59.07,15.58.44,28.96-.59,39.31-.06.58-.14,1.3-.21,1.9-.84.19-1.68.41-2.53.61-.7.17-1.41.34-2.11.49.05-.41.09-.82.13-1.22,1.04-10.41.66-23.86.69-39.52.02-15.17.06-32.42.07-51.17.03-47.04.04-103.2.05-158.56.7-.17,1.41-.42,2.1-.66.84-.13,1.68-.31,2.51-.47Z"/>
              <path className="cls-323" d="M947.31,450.48c0,2.51,0,5.02,0,7.52.01,41.21.06,128.84.05,218.93-.83.16-1.68.34-2.51.47-.69.24-1.4.49-2.1.66,0-90.32,0-178.47,0-219.9,0-2.52,0-5.04,0-7.56.69-.03,1.38-.06,2.07-.06.83,0,1.66-.03,2.49-.05Z"/>
              <path className="cls-465" d="M947.31,438.02c0,1.65,0,3.29,0,4.94,0,2.51,0,5.02,0,7.52-.83.03-1.66.05-2.49.05-.69,0-1.38.03-2.07.06,0-2.52,0-5.04,0-7.56,0-1.65,0-3.31,0-4.97.69-.01,1.38-.03,2.07-.03.83,0,1.66-.01,2.49-.02Z"/>
              <path className="cls-559" d="M947.31,432.39v.69c0,1.65,0,3.29,0,4.94-.83,0-1.66.02-2.49.02-.69,0-1.38.02-2.07.03v-5.67c.69,0,1.38,0,2.07-.01.83,0,1.66,0,2.49,0Z"/>
              <path className="cls-200" d="M947.31,431.69v.69c-.83,0-1.66,0-2.49,0-.69,0-1.38,0-2.07.01v-.7c.69,0,1.38,0,2.07-.01.83,0,1.66,0,2.49,0Z"/>
              <path className="cls-414" d="M931.46,963.33c-.37.36-.73.7-1.06,1.02-.19.04-.39.07-.58.1-.4.07-.79.13-1.17.19.26-.3.55-.63.86-.97.43-.07.86-.14,1.31-.21.21-.04.42-.08.64-.12Z"/>
              <path className="cls-306" d="M933.52,961.31c-.31.31-.61.61-.91.9-.4.39-.78.76-1.15,1.12-.21.04-.42.08-.64.12-.45.08-.88.15-1.31.21.31-.34.63-.71.96-1.09.24-.29.5-.58.76-.88.5-.07,1.02-.16,1.55-.25.25-.04.5-.09.74-.14Z"/>
              <path className="cls-96" d="M935.16,959.63c-.24.25-.47.5-.71.74-.31.32-.62.64-.93.94-.24.05-.49.1-.74.14-.53.09-1.04.17-1.55.25.26-.3.53-.61.79-.93.2-.24.41-.48.61-.73.56-.08,1.13-.17,1.71-.26.28-.05.55-.1.82-.15Z"/>
              <path className="cls-624" d="M936.36,958.32c-.16.18-.33.36-.49.54-.24.26-.47.51-.71.76-.27.05-.54.1-.82.15-.58.1-1.15.19-1.71.26.2-.25.41-.5.61-.75.14-.18.28-.35.41-.53.61-.08,1.22-.17,1.83-.28.3-.05.59-.1.88-.16Z"/>
              <path className="cls-229" d="M937.46,957c-.21.26-.41.51-.62.77-.16.18-.32.37-.49.55-.29.06-.58.11-.88.16-.62.1-1.22.19-1.83.28.13-.18.27-.36.4-.54.18-.27.35-.53.52-.8.67-.07,1.33-.16,1.96-.26.3-.05.62-.1.93-.15Z"/>
              <path className="cls-347" d="M939.6,954.2c-.49.68-1,1.36-1.52,2.03-.2.26-.4.52-.61.77-.31.05-.63.1-.93.15-.63.11-1.29.19-1.96.26.17-.27.35-.53.52-.8.45-.7.89-1.39,1.32-2.09.76-.05,1.52-.1,2.17-.21.31-.05.67-.08,1.02-.11Z"/>
              <path className="cls-14" d="M943.17,948.67c-.67,1.18-1.38,2.33-2.14,3.47-.46.69-.94,1.38-1.43,2.06-.36.03-.71.06-1.02.11-.65.11-1.41.16-2.17.21.43-.7.85-1.4,1.26-2.1.68-1.16,1.33-2.32,1.95-3.51.85-.02,1.7-.05,2.4-.16.34-.05.74-.06,1.15-.08Z"/>
              <path className="cls-140" d="M946.94,940.52c-.56,1.57-1.2,3.08-1.9,4.57-.58,1.22-1.2,2.41-1.87,3.59-.41.02-.81.03-1.15.08-.7.11-1.55.14-2.4.16.62-1.18,1.21-2.37,1.76-3.58.67-1.47,1.3-2.96,1.86-4.49.85-.04,1.7-.09,2.48-.2.37-.05.79-.08,1.21-.12Z"/>
              <path className="cls-578" d="M948.81,934.03c-.12.55-.26,1.11-.4,1.66-.42,1.66-.91,3.27-1.47,4.83-.42.04-.84.07-1.21.12-.78.11-1.63.16-2.48.2.56-1.53,1.07-3.09,1.5-4.7.15-.54.28-1.1.41-1.65.83-.08,1.65-.17,2.47-.27.39-.05.79-.11,1.19-.19Z"/>
              <path className="cls-243" d="M949.52,930.56c-.12.59-.24,1.19-.36,1.8-.11.56-.23,1.12-.35,1.67-.4.07-.8.14-1.19.19-.82.11-1.64.2-2.47.27.13-.55.25-1.12.36-1.68.12-.61.26-1.22.38-1.81.82-.09,1.64-.18,2.46-.29.39-.05.78-.1,1.17-.16Z"/>
              <path className="cls-527" d="M950.09,926.78c-.08.69-.17,1.37-.26,2.05-.08.56-.19,1.13-.31,1.72-.39.05-.78.11-1.17.16-.82.11-1.64.2-2.46.29.12-.59.23-1.16.31-1.72.08-.56.17-1.26.24-1.86.84-.19,1.67-.36,2.48-.48.39-.05.78-.11,1.16-.17Z"/>
              <path className="cls-279" d="M951.06,676.47c-.03,55.01-.07,110.94-.13,157.69,0,1.83,0,3.64,0,5.44-.04,17.24-.12,33.13-.06,47.16,0,1.4.01,2.79.02,4.15.07,13.23.32,24.72-.57,33.81-.07.69-.14,1.37-.22,2.06-.39.06-.77.12-1.16.17-.81.11-1.64.28-2.48.48.07-.61.15-1.32.21-1.9,1.03-10.35.66-23.73.59-39.31-.07-15.27.03-32.67.05-51.59.05-46.81.06-102.66.06-157.7.83-.16,1.66-.32,2.47-.41.41-.01.82-.03,1.23-.05Z"/>
              <path className="cls-287" d="M951.09,450.42c0,2.5,0,5,0,7.5,0,41.07,0,128.61-.03,218.56-.41.02-.82.04-1.23.05-.81.09-1.64.24-2.47.41.01-90.09-.04-177.72-.05-218.93,0-2.51,0-5.01,0-7.52.83-.03,1.66-.05,2.49-.05.43,0,.86,0,1.29-.01Z"/>
              <path className="cls-425" d="M951.09,438c0,1.64,0,3.28,0,4.92,0,2.5,0,5,0,7.5-.43,0-.86.01-1.29.01-.83,0-1.66.03-2.49.05,0-2.51,0-5.01,0-7.52,0-1.65,0-3.29,0-4.94.83,0,1.66-.02,2.49-.02.43,0,.86,0,1.29,0Z"/>
              <path className="cls-330" d="M951.09,432.38v5.61c-.43,0-.86,0-1.29,0-.83,0-1.66,0-2.49.02,0-1.65,0-3.29,0-4.94v-.69c.83,0,1.66,0,2.49,0,.43,0,.86,0,1.29,0Z"/>
              <path className="cls-492" d="M951.09,431.69v.69c-.43,0-.86,0-1.29,0-.83,0-1.66,0-2.49,0v-.69c.83,0,1.66,0,2.49,0,.43,0,.86,0,1.29,0Z"/>
              <path className="cls-275" d="M932.78,963.06c-.41.37-.8.72-1.18,1.05-.21.04-.41.09-.62.13-.2.04-.39.08-.59.11.33-.32.69-.66,1.06-1.02.21-.04.42-.09.64-.13.23-.05.45-.09.68-.14Z"/>
              <path className="cls-372" d="M935.03,960.99c-.33.31-.66.62-.99.92-.43.4-.86.78-1.27,1.15-.23.05-.45.1-.68.14-.22.04-.43.09-.64.13.37-.36.76-.73,1.15-1.12.3-.29.6-.59.91-.9.24-.05.49-.1.74-.15.26-.05.52-.11.77-.17Z"/>
              <path className="cls-205" d="M936.81,959.27c-.26.26-.52.51-.77.76-.34.33-.68.65-1.01.96-.25.06-.51.12-.77.17-.25.05-.5.1-.74.15.31-.31.62-.62.93-.94.24-.24.47-.49.71-.74.27-.05.54-.11.82-.17.29-.06.56-.12.84-.19Z"/>
              <path className="cls-310" d="M938.12,957.94c-.18.18-.36.37-.54.55-.26.26-.52.52-.78.78-.28.07-.55.13-.84.19-.28.06-.55.11-.82.17.24-.25.47-.51.71-.76.16-.18.33-.36.49-.54.29-.06.58-.12.87-.18.3-.06.6-.13.89-.2Z"/>
              <path className="cls-300" d="M939.34,956.64c-.23.25-.45.5-.68.75-.18.19-.36.37-.53.56-.3.07-.59.14-.89.2-.29.06-.58.12-.87.18.16-.18.32-.36.49-.55.21-.26.42-.51.62-.77.31-.05.63-.11.93-.17.31-.07.63-.13.95-.19Z"/>
              <path className="cls-259" d="M941.67,953.9c-.53.67-1.09,1.33-1.66,1.99-.22.25-.44.5-.67.75-.32.07-.64.13-.95.19-.3.06-.61.12-.93.17.21-.26.41-.52.61-.77.52-.67,1.03-1.35,1.52-2.03.36-.03.71-.07,1.02-.14.32-.07.69-.11,1.05-.16Z"/>
              <path className="cls-111" d="M945.51,948.42c-.71,1.17-1.48,2.33-2.3,3.45-.5.68-1.01,1.36-1.55,2.03-.36.05-.73.09-1.05.16-.31.07-.67.1-1.02.14.49-.68.97-1.37,1.43-2.06.76-1.14,1.47-2.29,2.14-3.47.41-.02.81-.04,1.16-.11.36-.08.77-.11,1.19-.13Z"/>
              <path className="cls-203" d="M949.45,940.15c-.57,1.6-1.22,3.16-1.96,4.66-.6,1.23-1.26,2.44-1.97,3.61-.42.03-.84.06-1.19.13-.34.07-.75.1-1.16.11.67-1.18,1.29-2.37,1.87-3.59.7-1.48,1.34-3,1.9-4.57.42-.04.85-.09,1.23-.18.4-.09.84-.14,1.27-.19Z"/>
              <path className="cls-259" d="M951.25,933.57c-.11.53-.22,1.05-.34,1.59-.4,1.73-.89,3.4-1.46,5-.43.05-.87.1-1.27.19-.39.09-.81.13-1.23.18.56-1.57,1.05-3.17,1.47-4.83.14-.54.28-1.11.4-1.66.4-.07.8-.15,1.2-.22.41-.08.83-.16,1.24-.24Z"/>
              <path className="cls-122" d="M951.87,930.2c-.1.59-.21,1.19-.32,1.8-.1.52-.19,1.04-.3,1.57-.41.08-.82.17-1.24.24-.4.07-.8.15-1.2.22.12-.55.24-1.12.35-1.67.11-.61.24-1.21.36-1.8.39-.05.78-.11,1.16-.17.4-.06.8-.12,1.19-.19Z"/>
              <path className="cls-345" d="M952.38,926.69c-.07.59-.15,1.19-.23,1.78-.08.56-.18,1.14-.28,1.73-.4.06-.79.13-1.19.19-.39.06-.77.12-1.16.17.12-.59.23-1.17.31-1.72.1-.68.18-1.37.26-2.05.39-.06.77-.12,1.15-.18.39-.05.77.02,1.14.09Z"/>
              <path className="cls-596" d="M953.52,684.68c-.07,64.18-.16,125.96-.23,161.54,0,3.53-.02,6.85-.02,9.94-.06,17-.07,30.77-.11,41.73-.04,11.68.05,20.66-.57,27.02-.06.6-.13,1.19-.2,1.78-.37-.07-.75-.15-1.14-.09-.38.06-.76.12-1.15.18.08-.68.15-1.37.22-2.06.89-9.09.65-20.58.57-33.81,0-1.36-.02-2.75-.02-4.15-.06-14.02.02-29.92.06-47.16,0-1.8,0-3.61,0-5.44.07-46.75.11-102.68.13-157.69.41-.02.82-.04,1.23-.06.43,1.24.83,4.75,1.24,8.26Z"/>
              <path className="cls-607" d="M953.72,448.42c0,2.51,0,5.13,0,7.84v.92c0,25.04-.09,128.96-.2,227.51-.4-3.51-.81-7.03-1.24-8.26-.4.02-.81.04-1.23.06.04-89.95.03-177.49.03-218.56,0-2.5,0-5,0-7.5.43,0,.86-.01,1.29-.01.45,0,.89-.99,1.34-1.99Z"/>
              <path className="cls-330" d="M953.72,436.69v4.56c0,2.26,0,4.66,0,7.17-.44.99-.89,1.98-1.34,1.99-.43,0-.86,0-1.29.01,0-2.5,0-5,0-7.5,0-1.64,0-3.28,0-4.92.43,0,.86,0,1.29,0,.45,0,.89-.65,1.34-1.31Z"/>
              <path className="cls-600" d="M953.72,432.19v4.49c-.44.65-.89,1.31-1.34,1.31-.43,0-.86,0-1.29,0v-5.61c.43,0,.86,0,1.3,0,.45,0,.89-.1,1.34-.19Z"/>
              <path className="cls-217" d="M953.72,431.69v.5c-.44.1-.89.19-1.34.19-.43,0-.86,0-1.3,0v-.69c.43,0,.86,0,1.3,0,.45,0,.89,0,1.34,0Z"/>
              <path className="cls-406" d="M934.76,962.58c-.44.38-.87.75-1.27,1.09-.43.11-.85.21-1.27.3-.21.05-.42.09-.62.14.38-.33.77-.68,1.18-1.05.23-.05.45-.1.68-.16.44-.1.87-.21,1.3-.32Z"/>
              <path className="cls-175" d="M937.2,960.42c-.36.33-.72.64-1.07.96-.47.42-.93.82-1.37,1.2-.43.12-.86.22-1.3.32-.23.05-.46.11-.68.16.41-.37.83-.75,1.27-1.15.32-.3.65-.61.99-.92.25-.06.51-.12.77-.19.47-.11.94-.24,1.41-.38Z"/>
              <path className="cls-2" d="M939.12,958.65c-.28.26-.56.52-.83.78-.36.34-.73.67-1.09,1-.47.13-.94.26-1.41.38-.26.06-.52.13-.77.19.33-.31.67-.64,1.01-.96.26-.25.51-.5.77-.76.28-.07.55-.14.83-.21.49-.12.99-.26,1.48-.41Z"/>
              <path className="cls-261" d="M940.52,957.31c-.19.19-.38.37-.57.55-.27.27-.55.53-.83.79-.49.15-.99.29-1.48.41-.28.07-.56.14-.83.21.26-.26.52-.51.78-.78.18-.18.36-.36.54-.55.3-.07.59-.14.89-.22.5-.13,1.01-.27,1.51-.42Z"/>
              <path className="cls-217" d="M941.79,956.03c-.23.24-.47.48-.7.72-.19.19-.37.37-.56.56-.5.15-1.01.29-1.51.42-.3.08-.59.15-.89.22.18-.18.36-.37.53-.56.23-.25.46-.5.68-.75.32-.07.64-.13.94-.21.51-.13,1.01-.26,1.5-.4Z"/>
              <path className="cls-229" d="M944.16,953.38c-.54.65-1.1,1.29-1.69,1.93-.22.24-.45.49-.68.73-.5.14-1,.27-1.5.4-.3.08-.62.15-.94.21.23-.25.45-.5.67-.75.57-.66,1.13-1.32,1.66-1.99.36-.05.73-.09,1.04-.17.49-.12.97-.24,1.45-.36Z"/>
              <path className="cls-584" d="M947.99,948c-.7,1.16-1.46,2.29-2.28,3.39-.5.67-1.01,1.33-1.55,1.98-.48.12-.96.23-1.45.36-.31.08-.68.12-1.04.17.53-.67,1.05-1.34,1.55-2.03.82-1.13,1.59-2.28,2.3-3.45.42-.03.83-.05,1.17-.13.44-.1.87-.2,1.3-.29Z"/>
              <path className="cls-424" d="M951.79,939.79c-.54,1.6-1.17,3.15-1.88,4.64-.58,1.22-1.22,2.42-1.93,3.58-.43.1-.86.19-1.3.29-.34.07-.76.1-1.17.13.71-1.17,1.37-2.38,1.97-3.61.73-1.5,1.39-3.05,1.96-4.66.43-.05.86-.09,1.24-.16.38-.07.74-.14,1.1-.2Z"/>
              <path className="cls-484" d="M953.48,933.22c-.1.52-.2,1.04-.32,1.57-.38,1.73-.83,3.4-1.37,5-.36.07-.73.14-1.1.2-.38.07-.81.11-1.24.16.57-1.6,1.06-3.27,1.46-5,.12-.54.23-1.06.34-1.59.41-.08.82-.16,1.22-.23.34-.05.68-.09,1.01-.12Z"/>
              <path className="cls-137" d="M954.02,929.88c-.08.6-.17,1.2-.27,1.8-.08.51-.18,1.02-.27,1.54-.34.03-.67.07-1.01.12-.4.07-.81.15-1.22.23.11-.53.2-1.05.3-1.57.11-.61.22-1.21.32-1.8.4-.06.79-.13,1.18-.2.33-.05.65-.09.97-.12Z"/>
              <path className="cls-384" d="M954.47,926.33c-.07.59-.15,1.18-.22,1.77-.07.59-.15,1.17-.23,1.78-.32.03-.64.07-.97.12-.39.07-.79.13-1.18.2.1-.59.2-1.16.28-1.73.08-.59.16-1.19.23-1.78.37.07.74.14,1.13.08.31-.05.64-.25.96-.44Z"/>
              <path className="cls-371" d="M955.66,684.45c-.08,61.81-.16,121.41-.23,157.39-.01,5.61,0,10.81.04,15.53.03,33.84.34,55.48-.81,67.19-.06.59-.12,1.18-.19,1.78-.32.19-.65.39-.96.44-.38.06-.75-.01-1.13-.08.07-.59.14-1.19.2-1.78.62-6.35.54-15.34.57-27.02.04-10.96.06-24.73.11-41.73,0-3.09.02-6.41.02-9.94.08-35.57.16-97.36.23-161.54.4,3.51.81,7.02,1.23,8.26.3-1.61.61-5.05.91-8.49Z"/>
              <path className="cls-279" d="M955.9,448.38c0,2.51,0,5.12,0,7.82v.92c0,24.99-.11,128.84-.23,227.33-.31,3.44-.62,6.89-.91,8.49-.42-1.24-.82-4.75-1.23-8.26.11-98.55.2-202.47.2-227.51v-.92c0-2.71,0-5.33,0-7.84.44-.99.89-1.98,1.33-1.99.28,0,.56.97.84,1.95Z"/>
              <path className="cls-519" d="M955.9,436.68c0,1.43,0,2.94,0,4.55,0,2.26,0,4.65,0,7.15-.28-.98-.56-1.95-.84-1.95-.44,0-.88.99-1.33,1.99,0-2.51,0-4.91,0-7.17v-4.56c.44-.65.89-1.31,1.33-1.31.28,0,.56.65.84,1.3Z"/>
              <path className="cls-592" d="M955.9,432.2v.51c0,1.22,0,2.54,0,3.97-.28-.65-.56-1.3-.84-1.3-.44,0-.88.65-1.33,1.31v-4.49c.44-.1.89-.19,1.33-.19.28,0,.56.1.84.19Z"/>
              <path className="cls-526" d="M955.9,431.7v.5c-.28-.1-.56-.19-.84-.19-.44,0-.88.09-1.33.19v-.5c.44,0,.89,0,1.33,0,.28,0,.56,0,.84,0Z"/>
              <path className="cls-233" d="M937.2,961.86c-.47.4-.91.78-1.33,1.14-.37.12-.73.22-1.09.33-.44.13-.87.24-1.3.35.4-.34.83-.71,1.27-1.09.43-.12.87-.24,1.32-.37.37-.11.74-.23,1.12-.35Z"/>
              <path className="cls-557" d="M939.77,959.62c-.38.34-.76.67-1.13.99-.49.43-.98.85-1.45,1.25-.38.12-.75.24-1.12.35-.45.13-.89.26-1.32.37.44-.38.9-.79,1.37-1.2.35-.31.71-.63,1.07-.96.47-.13.94-.28,1.41-.42.39-.12.78-.25,1.17-.38Z"/>
              <path className="cls-376" d="M941.79,957.8c-.29.27-.58.53-.87.79-.38.34-.76.69-1.15,1.02-.39.14-.78.26-1.17.38-.47.14-.94.29-1.41.42.36-.33.73-.66,1.09-1,.28-.26.56-.51.83-.78.49-.15.99-.3,1.47-.45.4-.13.8-.26,1.19-.4Z"/>
              <path className="cls-372" d="M943.22,956.44c-.19.19-.39.37-.58.56-.28.26-.57.53-.86.8-.4.14-.79.27-1.19.4-.48.15-.97.31-1.47.45.28-.26.55-.52.83-.79.19-.18.38-.37.57-.55.5-.15,1-.3,1.49-.46.41-.13.81-.27,1.21-.41Z"/>
              <path className="cls-194" d="M944.47,955.19c-.22.23-.45.47-.68.69-.19.18-.38.37-.57.56-.4.14-.8.28-1.21.41-.49.16-.99.31-1.49.46.19-.19.38-.37.56-.56.24-.24.47-.48.7-.72.5-.14.99-.28,1.48-.44.41-.13.81-.26,1.21-.4Z"/>
              <path className="cls-269" d="M946.74,952.64c-.51.63-1.05,1.24-1.61,1.85-.21.23-.44.47-.66.7-.4.13-.8.27-1.21.4-.49.16-.99.3-1.48.44.23-.24.46-.48.68-.73.59-.63,1.15-1.28,1.69-1.93.48-.12.95-.24,1.43-.39.39-.12.78-.23,1.16-.35Z"/>
              <path className="cls-448" d="M950.32,947.44c-.65,1.13-1.35,2.22-2.12,3.29-.47.65-.96,1.29-1.47,1.91-.38.11-.76.23-1.16.35-.48.14-.95.27-1.43.39.54-.65,1.06-1.31,1.55-1.98.82-1.1,1.58-2.24,2.28-3.39.43-.1.86-.2,1.29-.3.35-.09.7-.17,1.05-.26Z"/>
              <path className="cls-370" d="M953.79,939.45c-.49,1.55-1.05,3.06-1.7,4.51-.53,1.19-1.12,2.35-1.76,3.48-.34.09-.69.18-1.05.26-.43.1-.86.2-1.29.3.7-1.16,1.34-2.35,1.93-3.58.71-1.49,1.34-3.04,1.88-4.64.36-.07.72-.13,1.09-.18.3-.04.61-.1.91-.16Z"/>
              <path className="cls-232" d="M955.29,933.11c-.08.51-.17,1.02-.28,1.53-.33,1.65-.74,3.26-1.22,4.81-.3.06-.6.12-.91.16-.37.05-.73.11-1.09.18.54-1.6,1-3.27,1.37-5,.11-.53.22-1.05.32-1.57.34-.03.67-.05,1-.07.27-.02.54-.03.81-.04Z"/>
              <path className="cls-560" d="M955.74,929.74c-.06.64-.13,1.27-.22,1.86-.07.5-.15,1-.23,1.51-.27.01-.54.02-.81.04-.33.02-.66.04-1,.07.1-.52.19-1.03.27-1.54.1-.6.19-1.2.27-1.8.32-.03.64-.06.95-.09.26-.03.52-.04.77-.05Z"/>
              <path className="cls-547" d="M956.16,925.77c-.07.68-.15,1.36-.23,2.02-.07.65-.13,1.3-.19,1.95-.25.01-.51.02-.77.05-.31.04-.63.06-.95.09.08-.6.15-1.19.23-1.78.08-.59.15-1.18.22-1.77.32-.19.64-.39.95-.44.25-.05.5-.09.74-.12Z"/>
              <path className="cls-364" d="M957.29,676.54c-.04,54.3-.09,109.09-.14,155.44-.04,38.62,1.01,71.18-.78,91.74-.06.68-.13,1.37-.2,2.05-.24.04-.49.07-.74.12-.3.06-.62.25-.95.44.07-.59.14-1.18.19-1.78,1.14-11.71.84-33.35.81-67.19-.03-4.72-.05-9.92-.04-15.53.07-35.98.15-95.58.23-157.39.31-3.44.61-6.88.9-8.47.25.57.49.67.73.56Z"/>
              <path className="cls-146" d="M957.42,450.38c0,2.49,0,4.99,0,7.48-.01,40.93-.06,128.89-.12,218.68-.23.11-.47,0-.73-.56-.29,1.59-.59,5.03-.9,8.47.12-98.49.22-202.34.23-227.33v-.92c0-2.7,0-5.31,0-7.82.28.98.56,1.96.83,1.99.23.02.46.02.69.01Z"/>
              <path className="cls-146" d="M957.42,437.99c0,1.64,0,3.28,0,4.91,0,2.49,0,4.99,0,7.48-.23,0-.45.01-.69-.01-.27-.03-.55-1.01-.83-1.99,0-2.51,0-4.9,0-7.15,0-1.61,0-3.12,0-4.55.28.65.56,1.3.84,1.31.23,0,.46,0,.68,0Z"/>
              <path className="cls-251" d="M957.42,432.39v.69c0,1.64,0,3.28,0,4.91-.23,0-.45,0-.68,0-.28,0-.56-.66-.84-1.31,0-1.43,0-2.75,0-3.97v-.51c.28.1.56.19.84.19.23,0,.46,0,.68,0Z"/>
              <path className="cls-413" d="M957.42,431.7v.69c-.23,0-.45,0-.68,0-.28,0-.56-.1-.84-.19v-.5c.28,0,.56,0,.84,0,.23,0,.46,0,.68,0Z"/>
              <path className="cls-143" d="M939.64,960.97c-.48.42-.95.82-1.38,1.19-.43.16-.86.32-1.29.47-.37.13-.74.25-1.1.36.41-.35.86-.73,1.33-1.14.38-.12.75-.25,1.13-.39.44-.16.87-.32,1.31-.5Z"/>
              <path className="cls-582" d="M942.29,958.66c-.39.34-.78.69-1.15,1.02-.5.44-1.01.88-1.49,1.3-.44.17-.88.34-1.31.5-.38.14-.75.27-1.13.39.47-.4.95-.82,1.45-1.25.37-.32.75-.65,1.13-.99.39-.14.78-.28,1.17-.42.45-.17.9-.35,1.35-.53Z"/>
              <path className="cls-179" d="M944.33,956.82c-.29.27-.59.54-.88.8-.38.34-.78.7-1.16,1.04-.45.19-.9.36-1.35.53-.39.15-.78.29-1.17.42.38-.34.77-.68,1.15-1.02.29-.26.58-.53.87-.79.4-.14.79-.29,1.19-.44.45-.17.91-.36,1.36-.54Z"/>
              <path className="cls-106" d="M945.78,955.48c-.19.18-.39.37-.58.55-.28.26-.57.53-.86.8-.45.19-.9.37-1.36.54-.39.15-.79.3-1.19.44.29-.27.58-.54.86-.8.19-.18.39-.37.58-.56.4-.14.8-.29,1.19-.43.46-.17.91-.35,1.36-.53Z"/>
              <path className="cls-346" d="M946.99,954.29c-.21.22-.43.43-.64.64-.18.18-.38.36-.57.54-.45.18-.9.36-1.36.53-.4.15-.79.29-1.19.43.19-.19.38-.37.57-.56.23-.23.46-.46.68-.69.4-.13.79-.27,1.18-.41.45-.16.89-.32,1.33-.49Z"/>
              <path className="cls-109" d="M949.12,951.89c-.48.6-.98,1.18-1.51,1.75-.2.22-.41.44-.62.65-.44.17-.88.33-1.33.49-.39.14-.78.28-1.18.41.22-.23.45-.47.66-.7.56-.61,1.09-1.22,1.61-1.85.38-.11.75-.23,1.12-.34.43-.13.84-.27,1.26-.41Z"/>
              <path className="cls-235" d="M952.49,946.84c-.6,1.1-1.27,2.18-2,3.22-.44.63-.9,1.24-1.38,1.84-.41.14-.83.27-1.26.41-.37.12-.74.23-1.12.34.51-.63,1-1.27,1.47-1.91.77-1.07,1.47-2.16,2.12-3.29.34-.09.68-.18,1.02-.27.39-.11.77-.22,1.15-.33Z"/>
              <path className="cls-92" d="M955.69,939.06c-.43,1.49-.95,2.94-1.55,4.36-.49,1.17-1.05,2.31-1.65,3.42-.38.11-.76.22-1.15.33-.34.09-.67.18-1.02.27.65-1.13,1.23-2.28,1.76-3.48.65-1.45,1.21-2.96,1.7-4.51.3-.06.6-.12.89-.17.34-.06.68-.14,1.01-.22Z"/>
              <path className="cls-133" d="M956.99,933.01c-.07.49-.15.99-.24,1.49-.28,1.55-.63,3.07-1.06,4.56-.33.08-.67.16-1.01.22-.29.05-.59.11-.89.17.49-1.55.89-3.16,1.22-4.81.1-.51.19-1.02.28-1.53.27-.01.53-.02.8-.04.3-.02.6-.03.9-.06Z"/>
              <path className="cls-413" d="M957.36,929.62c-.06.69-.11,1.35-.18,1.92-.06.49-.12.98-.19,1.47-.3.02-.6.04-.9.06-.26.01-.53.03-.8.04.08-.51.16-1.01.23-1.51.09-.59.16-1.22.22-1.86.25-.01.51-.02.76-.05.29-.03.57-.05.86-.07Z"/>
              <path className="cls-163" d="M957.69,925.55c-.05.65-.11,1.29-.17,1.91-.06.73-.11,1.46-.16,2.15-.28.02-.57.03-.86.07-.25.03-.5.04-.76.05.06-.64.12-1.3.19-1.95.08-.66.16-1.34.23-2.02.24-.04.48-.07.72-.1.27-.04.54-.08.8-.11Z"/>
              <path className="cls-423" d="M958.79,675.66c-.02,53.9-.05,108.76-.08,154.89-.03,39.14.54,72.21-.87,93.01-.05.67-.1,1.34-.15,1.99-.26.03-.53.07-.8.11-.24.04-.48.07-.72.1.07-.68.15-1.37.2-2.05,1.79-20.56.74-53.12.78-91.74.05-46.35.1-101.14.14-155.44.23-.11.46-.43.7-.72.27-.12.54-.16.8-.16Z"/>
              <path className="cls-253" d="M958.86,450.34c0,2.49,0,4.97,0,7.46,0,40.89-.03,128.11-.07,217.86-.26,0-.53.04-.8.16-.24.29-.47.61-.7.72.07-89.79.11-177.75.12-218.68,0-2.49,0-4.99,0-7.48.23,0,.45-.02.67-.03.26,0,.52-.01.77-.02Z"/>
              <path className="cls-184" d="M958.86,437.99c0,1.63,0,3.27,0,4.9,0,2.49,0,4.97,0,7.46-.26,0-.51,0-.77.02-.22,0-.45.02-.67.03,0-2.49,0-4.99,0-7.48,0-1.64,0-3.28,0-4.91.23,0,.45,0,.68,0,.26,0,.52,0,.77,0Z"/>
              <path className="cls-298" d="M958.86,432.4v5.59c-.26,0-.51,0-.77,0-.22,0-.45,0-.68,0,0-1.64,0-3.28,0-4.91v-.69c.23,0,.45,0,.68,0,.26,0,.52,0,.77,0Z"/>
              <path className="cls-301" d="M958.86,431.71v.69c-.25,0-.51,0-.77,0-.22,0-.45,0-.68,0v-.69c.23,0,.45,0,.68,0,.26,0,.52,0,.77,0Z"/>
              <path className="cls-579" d="M942.15,959.89c-.49.43-.97.84-1.41,1.22-.4.18-.79.36-1.18.52-.43.18-.87.36-1.3.52.43-.37.9-.77,1.38-1.19.44-.17.88-.36,1.32-.54.4-.17.8-.35,1.19-.53Z"/>
              <path className="cls-131" d="M944.82,957.54c-.39.35-.78.69-1.16,1.03-.51.45-1.02.9-1.51,1.32-.4.18-.79.36-1.19.53-.44.19-.88.37-1.32.54.48-.42.99-.86,1.49-1.3.37-.33.76-.67,1.15-1.02.45-.19.89-.38,1.33-.57.4-.18.8-.36,1.2-.54Z"/>
              <path className="cls-528" d="M946.86,955.71c-.29.26-.58.53-.87.79-.38.35-.78.7-1.17,1.04-.4.18-.79.37-1.2.54-.44.2-.89.39-1.33.57.39-.34.78-.7,1.16-1.04.29-.26.59-.53.88-.8.45-.19.9-.38,1.34-.57.4-.18.8-.36,1.19-.54Z"/>
              <path className="cls-219" d="M948.29,954.39c-.19.18-.38.36-.58.53-.28.26-.57.52-.86.78-.39.18-.79.36-1.19.54-.44.19-.89.39-1.34.57.29-.27.58-.54.86-.8.19-.18.39-.37.58-.55.45-.18.89-.37,1.33-.56.4-.17.79-.35,1.18-.53Z"/>
              <path className="cls-459" d="M949.45,953.28c-.2.2-.4.39-.6.59-.18.17-.37.35-.56.53-.39.18-.78.35-1.18.53-.44.19-.88.38-1.33.56.19-.18.38-.37.57-.54.22-.21.43-.42.64-.64.44-.17.87-.34,1.3-.52.39-.16.78-.33,1.16-.49Z"/>
              <path className="cls-575" d="M951.47,951.01c-.45.57-.93,1.13-1.43,1.66-.19.21-.38.4-.58.6-.38.17-.77.33-1.16.49-.43.18-.86.35-1.3.52.21-.22.42-.44.62-.65.53-.57,1.03-1.15,1.51-1.75.41-.14.83-.28,1.24-.44.37-.14.74-.29,1.11-.44Z"/>
              <path className="cls-172" d="M954.62,946.13c-.56,1.08-1.18,2.12-1.86,3.12-.41.61-.84,1.2-1.3,1.77-.37.15-.74.3-1.11.44-.41.16-.82.3-1.24.44.48-.6.94-1.21,1.38-1.84.72-1.03,1.39-2.12,2-3.22.38-.11.75-.23,1.12-.35.34-.11.67-.23,1.01-.36Z"/>
              <path className="cls-180" d="M957.53,938.58c-.38,1.44-.85,2.85-1.39,4.23-.45,1.13-.95,2.24-1.51,3.32-.33.13-.67.25-1.01.36-.37.12-.75.24-1.12.35.6-1.1,1.16-2.25,1.65-3.42.6-1.42,1.11-2.87,1.55-4.36.33-.08.66-.16.98-.23.29-.06.58-.15.86-.24Z"/>
              <path className="cls-126" d="M958.64,932.78c-.06.48-.12.97-.2,1.45-.23,1.46-.53,2.92-.92,4.35-.28.09-.57.18-.86.24-.32.07-.65.15-.98.23.43-1.49.79-3.01,1.06-4.56.09-.5.17-.99.24-1.49.3-.02.59-.05.88-.09.26-.04.52-.08.78-.14Z"/>
              <path className="cls-585" d="M958.94,929.42c-.05.7-.1,1.36-.15,1.92-.04.48-.09.96-.15,1.44-.25.06-.51.1-.78.14-.29.04-.58.07-.88.09.07-.49.13-.98.19-1.47.07-.57.13-1.23.18-1.92.28-.02.56-.04.84-.09.25-.04.5-.08.74-.12Z"/>
              <path className="cls-302" d="M959.18,925.33c-.04.63-.06,1.22-.1,1.81-.05.8-.09,1.58-.14,2.29-.24.04-.49.07-.74.12-.28.05-.56.07-.84.09.06-.69.11-1.43.16-2.15.06-.62.11-1.26.17-1.91.26-.03.53-.07.79-.11.24-.04.47-.08.71-.12Z"/>
              <path className="cls-237" d="M960.27,688.36c0,62.56-.02,122.31-.03,157.82,0,10.39.01,19.27,0,26.26-.02,15.48-.33,38.3-.96,50.96-.03.67-.06,1.31-.1,1.94-.23.04-.47.08-.71.12-.26.04-.52.08-.79.11.05-.65.11-1.32.15-1.99,1.41-20.8.85-53.87.87-93.01.03-46.13.06-100.99.08-154.89.26,0,.52.03.78.06.24,3.26.47,7.95.7,12.64Z"/>
              <path className="cls-426" d="M960.3,447.27c0,1.63,0,3.25,0,4.87,0,28.18-.02,135.6-.03,236.22-.23-4.69-.46-9.38-.7-12.64-.26-.03-.52-.07-.78-.06.04-89.75.06-176.97.07-217.86,0-2.49,0-4.97,0-7.46.26,0,.51,0,.76,0,.23,0,.45-1.54.68-3.08Z"/>
              <path className="cls-335" d="M960.3,437.14c0,1.64,0,3.43,0,5.26,0,1.63,0,3.25,0,4.87-.22,1.54-.45,3.09-.68,3.08-.25,0-.5,0-.76,0,0-2.49,0-4.97,0-7.46,0-1.63,0-3.27,0-4.9.25,0,.51,0,.76,0,.23,0,.45-.42.68-.85Z"/>
              <path className="cls-212" d="M960.3,432.21v.53c0,1.26,0,2.76,0,4.41-.22.42-.45.85-.68.85-.25,0-.5,0-.76,0v-5.59c.26,0,.51,0,.76,0,.23,0,.45-.1.68-.19Z"/>
              <path className="cls-313" d="M960.3,431.71v.49c-.22.1-.45.19-.68.19-.25,0-.5,0-.76,0v-.69c.26,0,.51,0,.76,0,.23,0,.45,0,.68,0Z"/>
              <path className="cls-372" d="M944.12,958.92c-.46.41-.89.81-1.32,1.17-.29.15-.58.3-.87.45-.4.2-.79.39-1.19.57.44-.38.92-.8,1.41-1.22.4-.18.79-.37,1.18-.57.26-.13.52-.26.78-.4Z"/>
              <path className="cls-282" d="M946.61,956.67c-.36.33-.73.67-1.09.99-.48.43-.95.85-1.4,1.26-.26.14-.52.27-.78.4-.39.19-.79.38-1.18.57.49-.43,1-.88,1.51-1.32.38-.33.77-.68,1.16-1.03.4-.18.79-.37,1.17-.56.21-.1.41-.21.62-.31Z"/>
              <path className="cls-149" d="M948.51,954.92c-.27.25-.53.5-.81.75-.36.33-.73.67-1.09,1-.21.11-.41.21-.62.31-.39.19-.78.37-1.17.56.39-.35.78-.7,1.17-1.04.29-.26.58-.53.87-.79.39-.18.78-.36,1.16-.55.17-.08.33-.16.49-.24Z"/>
              <path className="cls-615" d="M949.84,953.67c-.18.17-.36.34-.54.51-.26.24-.52.49-.79.75-.16.08-.33.16-.49.24-.38.18-.77.37-1.16.55.29-.26.58-.53.86-.78.19-.18.39-.36.58-.53.39-.18.78-.36,1.16-.54.13-.06.26-.13.39-.19Z"/>
              <path className="cls-218" d="M950.96,952.58c-.2.2-.39.39-.6.58-.17.16-.35.33-.52.5-.13.06-.26.13-.39.19-.38.18-.77.36-1.16.54.19-.18.38-.35.56-.53.21-.19.4-.39.6-.59.38-.17.77-.34,1.14-.52.12-.06.24-.12.36-.18Z"/>
              <path className="cls-572" d="M952.95,950.3c-.45.58-.92,1.13-1.42,1.68-.19.21-.38.4-.58.6-.12.06-.24.12-.36.18-.38.18-.76.35-1.14.52.2-.2.39-.4.58-.6.5-.54.98-1.09,1.43-1.66.37-.15.74-.31,1.1-.48.13-.06.26-.14.39-.23Z"/>
              <path className="cls-477" d="M956.06,945.43c-.55,1.07-1.16,2.1-1.82,3.1-.4.61-.83,1.2-1.28,1.77-.13.09-.26.17-.39.23-.36.17-.73.33-1.1.48.45-.57.89-1.16,1.3-1.77.68-1,1.3-2.04,1.86-3.12.33-.13.66-.27.99-.41.15-.06.3-.17.45-.3Z"/>
              <path className="cls-555" d="M958.88,938.01c-.37,1.4-.82,2.78-1.34,4.14-.43,1.12-.93,2.21-1.47,3.28-.15.12-.3.24-.45.3-.33.14-.66.28-.99.41.56-1.08,1.07-2.18,1.51-3.32.54-1.38,1.01-2.79,1.39-4.23.28-.09.56-.2.83-.3.17-.06.35-.16.52-.27Z"/>
              <path className="cls-502" d="M959.95,932.36c-.06.48-.12.96-.19,1.43-.22,1.41-.51,2.82-.88,4.22-.17.11-.34.21-.52.27-.28.1-.55.21-.83.3.38-1.44.69-2.89.92-4.35.08-.49.14-.97.2-1.45.26-.06.51-.12.75-.2.19-.06.37-.13.55-.22Z"/>
              <path className="cls-583" d="M960.23,929.07c-.05.69-.09,1.32-.14,1.87-.04.47-.09.95-.15,1.43-.18.08-.36.16-.55.22-.25.08-.5.15-.75.2.06-.48.11-.96.15-1.44.05-.56.1-1.22.15-1.92.24-.04.49-.09.73-.15.19-.05.38-.12.57-.19Z"/>
              <path className="cls-469" d="M960.47,925.01c-.03.63-.06,1.23-.1,1.83-.04.79-.09,1.55-.14,2.23-.19.07-.38.14-.57.19-.24.07-.48.11-.73.15.05-.7.09-1.49.14-2.29.04-.58.07-1.18.1-1.81.23-.04.47-.08.71-.14.19-.05.39-.11.58-.17Z"/>
              <path className="cls-551" d="M961.48,696.65c0,60.02-.01,116.84-.02,150.77,0,10.65,0,19.64-.02,26.55-.03,14.68-.35,36.84-.88,49.11-.03.67-.06,1.3-.09,1.93-.19.07-.39.13-.58.17-.24.05-.47.1-.71.14.04-.63.06-1.27.1-1.94.64-12.66.95-35.47.96-50.96,0-6.99,0-15.86,0-26.26.01-35.51.02-95.27.03-157.82.23,4.69.46,9.38.7,12.63.18.81.35-1.76.51-4.33Z"/>
              <path className="cls-518" d="M961.57,447.21c.02,1.62.03,3.25.04,4.88.12,19.91-.11,74.76-.12,139.58,0,33.45,0,69.77-.01,104.98-.17,2.57-.34,5.14-.51,4.33-.24-3.25-.47-7.94-.7-12.63.01-100.62.03-208.03.03-236.22,0-1.63,0-3.25,0-4.87.22-1.54.45-3.08.67-3.06.22.02.42,1.52.61,3.01Z"/>
              <path className="cls-342" d="M961.42,437.09c.03,1.65.08,3.44.1,5.25.02,1.62.04,3.25.05,4.88-.19-1.5-.39-2.99-.61-3.01-.22-.02-.44,1.52-.67,3.06,0-1.63,0-3.25,0-4.87,0-1.83,0-3.61,0-5.26.22-.42.45-.85.67-.85.21,0,.34.39.46.8Z"/>
              <path className="cls-254" d="M961.52,432.19c-.02.17-.03.33-.04.51-.09,1.24-.09,2.74-.06,4.39-.12-.4-.25-.8-.46-.8-.22,0-.44.42-.67.85,0-1.64,0-3.14,0-4.41v-.53c.22-.1.45-.19.67-.19.21,0,.38.09.56.18Z"/>
              <path className="cls-470" d="M961.58,431.71c-.02.15-.04.31-.06.47-.17-.09-.35-.18-.56-.18-.22,0-.44.1-.67.19v-.49c.22,0,.45,0,.67,0,.21,0,.41,0,.61,0Z"/>
              <path className="cls-446" d="M945.96,957.87c-.39.37-.76.73-1.13,1.05-.39.24-.78.47-1.17.69-.29.16-.58.32-.86.48.42-.37.86-.76,1.32-1.17.26-.14.52-.28.78-.43.35-.2.71-.41,1.06-.62Z"/>
              <path className="cls-369" d="M948.06,955.88c-.3.3-.61.6-.91.87-.4.37-.8.75-1.19,1.12-.35.22-.71.42-1.06.62-.26.15-.52.29-.78.43.46-.41.92-.84,1.4-1.26.36-.32.73-.65,1.09-.99.21-.11.41-.21.62-.33.28-.15.56-.31.83-.47Z"/>
              <path className="cls-431" d="M949.65,954.33c-.22.23-.44.46-.67.67-.3.28-.61.58-.91.88-.28.16-.55.32-.83.47-.21.11-.41.22-.62.33.36-.33.73-.67,1.09-1,.27-.25.54-.5.81-.75.16-.08.32-.16.49-.25.22-.11.44-.23.65-.34Z"/>
              <path className="cls-246" d="M950.76,953.21c-.15.15-.3.31-.45.46-.22.21-.44.44-.66.67-.21.12-.43.23-.65.34-.16.08-.32.17-.49.25.27-.25.53-.5.79-.75.18-.17.36-.34.54-.51.13-.06.26-.13.39-.19.18-.09.35-.18.53-.27Z"/>
              <path className="cls-292" d="M951.82,952.11c-.2.22-.41.43-.62.65-.14.14-.29.3-.44.45-.17.09-.35.18-.53.27-.13.06-.26.13-.39.19.18-.17.35-.34.52-.5.2-.2.4-.39.6-.58.12-.06.24-.13.36-.19.16-.09.33-.18.49-.28Z"/>
              <path className="cls-218" d="M953.89,949.65c-.47.61-.96,1.22-1.47,1.81-.2.23-.4.44-.6.66-.16.09-.33.19-.49.28-.12.07-.24.13-.36.19.2-.2.39-.39.58-.6.5-.54.97-1.1,1.42-1.68.13-.09.26-.19.39-.26.18-.11.36-.25.54-.39Z"/>
              <path className="cls-436" d="M957.1,944.56c-.57,1.09-1.2,2.16-1.89,3.21-.42.64-.86,1.26-1.33,1.88-.18.15-.37.29-.54.39-.13.08-.26.17-.39.26.45-.58.88-1.17,1.28-1.77.67-1,1.28-2.03,1.82-3.1.15-.12.3-.25.44-.34.2-.12.4-.32.6-.53Z"/>
              <path className="cls-543" d="M960.04,937.12c-.39,1.38-.85,2.75-1.4,4.11-.45,1.12-.96,2.23-1.53,3.32-.2.21-.41.41-.6.53-.14.09-.29.22-.44.34.55-1.07,1.04-2.16,1.47-3.28.53-1.36.98-2.74,1.34-4.14.17-.11.34-.23.5-.34.22-.14.44-.34.66-.55Z"/>
              <path className="cls-534" d="M961.19,931.63c-.06.46-.14.92-.21,1.38-.24,1.36-.55,2.73-.93,4.11-.22.21-.43.41-.66.55-.16.1-.33.23-.5.34.37-1.4.66-2.81.88-4.22.07-.47.14-.96.19-1.43.18-.08.36-.18.54-.28.24-.14.47-.29.7-.45Z"/>
              <path className="cls-329" d="M961.52,928.52c-.05.63-.11,1.23-.16,1.75-.05.45-.11.91-.17,1.36-.23.16-.46.31-.7.45-.18.1-.35.2-.54.28.06-.48.1-.96.15-1.43.05-.54.1-1.18.14-1.87.19-.07.37-.15.55-.22.25-.09.49-.21.73-.33Z"/>
              <path className="cls-476" d="M961.81,924.53c-.04.67-.08,1.33-.14,2-.05.68-.1,1.36-.15,1.99-.24.12-.49.24-.73.33-.18.07-.37.15-.55.22.05-.69.09-1.44.14-2.23.04-.6.07-1.2.1-1.83.19-.07.39-.13.57-.19.26-.08.51-.18.77-.29Z"/>
              <path className="cls-580" d="M962.59,683.62c.01,51.6.02,103.61,0,147.55,0,2.42,0,4.82,0,7.19-.01,35.31.12,64.95-.68,84.18-.03.67-.06,1.33-.1,2-.25.1-.51.21-.77.29-.19.06-.38.13-.57.19.03-.63.06-1.26.09-1.93.53-12.27.84-34.43.88-49.11.02-6.91.02-15.9.02-26.55,0-33.93.01-90.74.02-150.77.17-2.57.33-5.15.51-4.36.22-2.99.42-5.84.61-8.68Z"/>
              <path className="cls-189" d="M962.71,450.25c0,2.48.02,4.97.02,7.45.07,27.87-.17,77.55-.16,134.76,0,29.01.01,59.99.02,91.16-.19,2.84-.38,5.69-.61,8.68-.17-.79-.34,1.79-.51,4.36,0-35.21,0-71.53.01-104.98,0-64.82.25-119.67.12-139.58-.01-1.62-.02-3.25-.04-4.88.19,1.5.39,2.99.6,3.01.21.02.38.03.54.02Z"/>
              <path className="cls-309" d="M962.61,437.92c0,1.63.05,3.27.06,4.88.01,2.48.03,4.97.04,7.44-.16,0-.33,0-.54-.02-.21-.02-.41-1.52-.6-3.01-.02-1.62-.03-3.25-.05-4.88-.01-1.81-.07-3.6-.1-5.25.12.4.24.8.45.81.24,0,.49.02.75.03Z"/>
              <path className="cls-382" d="M962.84,432.36c-.03.22-.06.46-.08.7-.13,1.6-.16,3.23-.15,4.86-.25,0-.51-.02-.75-.03-.2,0-.32-.41-.45-.81-.03-1.65-.03-3.15.06-4.39.01-.18.03-.35.04-.51.17.09.35.18.54.18.27,0,.52,0,.77,0Z"/>
              <path className="cls-523" d="M962.97,431.72c-.05.2-.09.42-.13.64-.25,0-.51.01-.77,0-.2,0-.37-.09-.54-.18.02-.17.03-.32.06-.47.2,0,.4,0,.6,0,.27,0,.53,0,.79,0Z"/>
              <path className="cls-138" d="M947.75,956.71c-.32.32-.64.64-.96.91-.27.19-.53.38-.8.56-.38.26-.77.51-1.16.75.37-.32.74-.68,1.13-1.05.36-.22.71-.44,1.06-.67.24-.16.49-.33.73-.49Z"/>
              <path className="cls-621" d="M949.46,955.03c-.24.25-.48.5-.73.72-.33.31-.66.64-.98.96-.24.17-.49.33-.73.49-.35.23-.7.45-1.06.67.39-.37.78-.76,1.19-1.12.3-.27.61-.57.91-.87.28-.16.55-.32.83-.49.19-.12.38-.24.57-.36Z"/>
              <path className="cls-193" d="M950.73,953.71c-.18.2-.37.4-.55.58-.24.24-.48.49-.72.74-.19.12-.38.24-.57.36-.27.17-.55.33-.83.49.3-.3.61-.6.91-.88.23-.21.45-.44.67-.67.21-.12.43-.24.64-.36.15-.09.3-.17.44-.26Z"/>
              <path className="cls-419" d="M951.64,952.75c-.12.13-.24.27-.36.39-.18.18-.36.38-.54.58-.15.09-.29.17-.44.26-.21.12-.43.24-.64.36.22-.23.44-.46.66-.67.15-.15.3-.3.45-.46.17-.09.35-.18.52-.27.12-.06.24-.13.36-.19Z"/>
              <path className="cls-612" d="M952.65,951.63c-.21.25-.43.49-.65.73-.12.12-.24.25-.36.39-.12.06-.24.13-.36.19-.17.09-.35.18-.52.27.15-.15.29-.31.44-.45.21-.22.42-.43.62-.65.16-.09.33-.19.49-.29.11-.07.23-.13.34-.2Z"/>
              <path className="cls-361" d="M954.8,948.95c-.48.65-.99,1.3-1.52,1.94-.2.24-.42.49-.63.74-.11.07-.23.13-.34.2-.16.1-.33.19-.49.29.2-.22.4-.43.6-.66.51-.59,1.01-1.19,1.47-1.81.18-.15.36-.3.54-.41.12-.08.25-.18.37-.28Z"/>
              <path className="cls-468" d="M958.1,943.63c-.58,1.12-1.22,2.24-1.93,3.34-.43.67-.89,1.33-1.37,1.98-.12.1-.25.2-.37.28-.17.12-.36.27-.54.41.47-.61.91-1.24,1.33-1.88.69-1.05,1.32-2.12,1.89-3.21.2-.21.4-.42.59-.56.13-.1.27-.24.4-.37Z"/>
              <path className="cls-113" d="M961.1,936.12c-.4,1.36-.88,2.74-1.44,4.11-.46,1.13-.98,2.26-1.56,3.39-.13.14-.27.28-.4.37-.19.14-.39.35-.59.56.57-1.09,1.08-2.2,1.53-3.32.55-1.36,1.02-2.74,1.4-4.11.22-.21.43-.43.63-.59.14-.12.29-.26.43-.41Z"/>
              <path className="cls-539" d="M962.32,930.8c-.07.43-.16.86-.24,1.3-.26,1.32-.58,2.66-.98,4.02-.14.14-.28.29-.43.41-.21.17-.42.38-.63.59.39-1.38.7-2.75.93-4.11.08-.46.15-.92.21-1.38.23-.16.46-.33.68-.49.15-.12.31-.23.46-.35Z"/>
              <path className="cls-374" d="M962.71,927.94c-.06.55-.12,1.08-.19,1.58-.06.43-.13.85-.2,1.28-.15.11-.3.23-.46.35-.22.17-.45.33-.68.49.06-.46.12-.92.17-1.36.06-.52.11-1.12.16-1.75.24-.12.48-.24.71-.35.16-.07.32-.16.48-.24Z"/>
              <path className="cls-403" d="M963.06,924.03c-.05.72-.11,1.46-.19,2.21-.05.58-.1,1.15-.16,1.69-.16.08-.32.17-.48.24-.23.1-.47.23-.71.35.05-.63.1-1.3.15-1.99.06-.67.1-1.34.14-2,.25-.1.5-.21.74-.3.17-.06.34-.13.5-.2Z"/>
              <path className="cls-354" d="M963.66,674.95c0,55.77,0,112.48-.02,159.5,0,2.18,0,4.34,0,6.48,0,33.93.3,62.36-.46,81-.03.67-.07,1.37-.12,2.09-.17.07-.34.14-.5.2-.24.09-.49.19-.74.3.04-.67.07-1.33.1-2,.81-19.23.67-48.86.68-84.18,0-2.37,0-4.77,0-7.19.02-43.95,0-95.96,0-147.55.19-2.84.38-5.66.58-8.59.17-.04.33-.06.49-.07Z"/>
              <path className="cls-325" d="M963.84,450.17c-.02,2.48-.05,4.95-.06,7.42-.12,40.68-.13,127.81-.12,217.37-.16.02-.33.03-.49.07-.21,2.94-.39,5.76-.58,8.59,0-31.17-.02-62.16-.02-91.16,0-57.22.24-106.9.16-134.76,0-2.48-.01-4.97-.02-7.45.16,0,.32-.02.51-.05.2-.04.41-.03.62-.03Z"/>
              <path className="cls-210" d="M963.72,437.77c0,1.68.05,3.38.09,4.97.05,2.47.05,4.95.03,7.42-.21,0-.42-.01-.62.03-.19.03-.35.05-.51.05,0-2.48-.02-4.97-.04-7.44,0-1.61-.05-3.25-.06-4.88.25,0,.5,0,.72-.03.18-.03.29-.07.4-.12Z"/>
              <path className="cls-93" d="M964.09,432.3c-.05.2-.08.42-.11.65-.19,1.5-.25,3.15-.25,4.83-.11.05-.22.09-.4.12-.22.03-.46.04-.72.03,0-1.63.02-3.26.15-4.86.02-.24.05-.48.08-.7.25,0,.5-.02.74-.04.17-.01.34-.02.5-.03Z"/>
              <path className="cls-573" d="M964.25,431.72c-.06.18-.12.37-.16.57-.17.01-.34.02-.5.03-.25.02-.49.03-.74.04.03-.22.08-.44.13-.64.26,0,.51,0,.76,0,.17,0,.35,0,.52,0Z"/>
              <path className="cls-196" d="M949.37,955.51c-.26.26-.53.51-.79.74-.33.27-.66.53-.99.78-.26.2-.53.4-.79.59.31-.27.63-.59.96-.91.24-.17.48-.34.72-.52.3-.22.6-.45.9-.69Z"/>
              <path className="cls-549" d="M950.73,954.15c-.19.2-.37.39-.57.58-.26.25-.53.52-.79.77-.3.24-.6.46-.9.69-.24.17-.48.35-.72.52.32-.32.65-.65.98-.96.25-.23.49-.48.73-.72.19-.12.38-.25.57-.38.24-.16.47-.33.71-.5Z"/>
              <path className="cls-136" d="M951.73,953.09c-.14.16-.29.32-.43.47-.19.2-.37.39-.56.59-.23.17-.47.34-.71.5-.19.13-.38.25-.57.38.24-.25.48-.5.72-.74.19-.18.37-.38.55-.58.15-.09.29-.18.44-.27.19-.12.37-.23.55-.35Z"/>
              <path className="cls-249" d="M952.44,952.3c-.09.11-.19.22-.29.32-.14.15-.28.31-.43.47-.18.12-.37.24-.55.35-.15.09-.29.18-.44.27.18-.2.36-.4.54-.58.12-.12.24-.26.36-.39.12-.06.24-.13.36-.19.15-.08.3-.17.45-.25Z"/>
              <path className="cls-316" d="M953.4,951.19c-.22.26-.45.54-.68.79-.09.1-.19.21-.28.32-.15.08-.3.17-.45.25-.12.07-.24.13-.36.19.12-.13.24-.27.36-.39.22-.24.44-.49.65-.73.11-.07.22-.13.33-.2.14-.08.28-.16.41-.24Z"/>
              <path className="cls-471" d="M955.61,948.34c-.49.69-1.01,1.37-1.56,2.05-.21.26-.43.53-.65.8-.14.08-.28.16-.41.24-.11.06-.22.13-.33.2.21-.25.43-.5.63-.74.53-.64,1.04-1.28,1.52-1.94.12-.1.25-.2.36-.27.15-.1.3-.22.45-.33Z"/>
              <path className="cls-375" d="M958.98,942.82c-.59,1.15-1.25,2.3-1.97,3.45-.44.69-.91,1.39-1.4,2.08-.15.11-.3.24-.45.33-.12.08-.24.17-.36.27.48-.65.94-1.32,1.37-1.98.71-1.1,1.35-2.22,1.93-3.34.13-.14.27-.27.39-.36.16-.11.32-.28.49-.44Z"/>
              <path className="cls-436" d="M962.03,935.28c-.41,1.34-.9,2.72-1.47,4.1-.47,1.14-1,2.29-1.59,3.44-.16.16-.33.33-.49.44-.13.09-.26.23-.39.36.58-1.12,1.1-2.26,1.56-3.39.56-1.38,1.04-2.75,1.44-4.11.14-.14.28-.29.42-.39.17-.14.35-.3.52-.45Z"/>
              <path className="cls-112" d="M963.31,930.08c-.08.41-.17.82-.26,1.25-.27,1.27-.61,2.6-1.02,3.94-.17.15-.34.32-.52.45-.14.11-.28.25-.42.39.4-1.36.72-2.71.98-4.02.09-.44.17-.87.24-1.3.15-.11.3-.23.45-.33.19-.13.37-.26.55-.38Z"/>
              <path className="cls-580" d="M963.75,927.42c-.06.48-.13.95-.21,1.44-.07.41-.14.81-.22,1.22-.18.12-.36.24-.55.38-.15.11-.3.22-.45.33.07-.43.14-.85.2-1.28.07-.5.13-1.03.19-1.58.16-.08.31-.16.47-.23.19-.09.38-.19.57-.28Z"/>
              <path className="cls-444" d="M964.14,923.61c-.06.76-.13,1.56-.23,2.37-.05.49-.11.96-.17,1.44-.19.09-.38.19-.57.28-.15.07-.31.15-.47.23.06-.55.11-1.11.16-1.69.08-.75.14-1.49.19-2.21.17-.07.33-.14.49-.2.2-.07.4-.15.6-.23Z"/>
              <path className="cls-108" d="M964.65,684.61c-.06,67.3-.12,133.97-.15,178.44-.02,26.21.16,46.06-.16,55.91-.01.77-.03,1.61-.07,2.49-.03.67-.07,1.4-.13,2.16-.2.08-.4.16-.6.23-.16.06-.32.13-.49.2.05-.72.09-1.43.12-2.09.76-18.64.46-47.07.46-81,0-2.14,0-4.3,0-6.48.03-47.02.02-103.73.02-159.5.16-.01.32-.03.47-.08.17,3.55.34,6.64.51,9.73Z"/>
              <path className="cls-551" d="M964.97,443.51c-.01,1.67-.04,3.43-.05,5.25-.08,30.6-.19,133.88-.28,235.85-.17-3.09-.34-6.18-.51-9.73-.15.05-.31.06-.47.08,0-89.56,0-176.68.12-217.37,0-2.47.04-4.95.06-7.42.21,0,.42,0,.6-.06.2-2.21.36-4.4.53-6.6Z"/>
              <path className="cls-582" d="M964.81,435.76c.01,1.02.08,2.07.12,3,.06,1.49.06,3.08.05,4.75-.16,2.19-.33,4.38-.53,6.6-.19.06-.39.06-.6.06.02-2.48.02-4.95-.03-7.42-.03-1.59-.09-3.29-.09-4.97.11-.05.21-.1.37-.15.2-.67.46-1.27.71-1.86Z"/>
              <path className="cls-143" d="M965.15,432.29c-.06.2-.11.4-.15.61-.18.84-.21,1.84-.2,2.86-.25.59-.51,1.18-.71,1.86-.16.05-.26.11-.37.15,0-1.68.06-3.33.25-4.83.03-.22.06-.45.11-.65.17-.01.33-.03.48-.05.21.02.4.03.58.04Z"/>
              <path className="cls-316" d="M965.36,431.73c-.08.18-.14.37-.2.56-.19-.01-.38-.02-.58-.04-.15.02-.32.04-.48.05.05-.2.1-.4.16-.57.17,0,.34,0,.5,0,.21,0,.41,0,.61,0Z"/>
              <path className="cls-461" d="M950.25,954.78c-.23.22-.46.43-.7.64-.32.28-.65.56-.98.83.26-.23.53-.49.79-.74.3-.24.59-.48.88-.72Z"/>
              <path className="cls-178" d="M951.43,953.63c-.16.17-.33.34-.5.5-.22.22-.45.44-.68.65-.29.24-.58.49-.88.72.26-.26.53-.52.79-.77.2-.19.38-.38.57-.58.23-.17.47-.34.7-.52Z"/>
              <path className="cls-610" d="M952.28,952.72c-.12.13-.24.26-.36.4-.16.17-.32.34-.49.51-.23.18-.46.35-.7.52.19-.2.37-.39.56-.59.15-.15.29-.31.43-.47.18-.12.37-.24.55-.37Z"/>
              <path className="cls-351" d="M952.88,952.05c-.08.09-.16.18-.24.28-.12.13-.24.26-.36.4-.18.13-.37.25-.55.37.14-.16.29-.32.43-.47.1-.1.19-.21.29-.32.15-.08.29-.17.44-.25Z"/>
              <path className="cls-616" d="M953.8,950.97c-.22.27-.45.54-.68.8-.08.09-.16.18-.24.28-.15.09-.29.17-.44.25.09-.11.19-.22.28-.32.23-.26.46-.53.68-.79.14-.08.27-.15.4-.22Z"/>
              <path className="cls-123" d="M956.04,948.05c-.5.71-1.03,1.41-1.59,2.11-.21.27-.43.54-.66.81-.13.07-.27.15-.4.22.22-.26.44-.54.65-.8.55-.68,1.07-1.36,1.56-2.05.15-.11.3-.22.43-.29Z"/>
              <path className="cls-391" d="M959.45,942.43c-.6,1.16-1.26,2.33-1.99,3.49-.45.71-.92,1.42-1.42,2.12-.14.07-.28.18-.43.29.49-.69.96-1.38,1.4-2.08.73-1.14,1.38-2.3,1.97-3.45.16-.16.32-.31.47-.39Z"/>
              <path className="cls-197" d="M962.54,934.9c-.42,1.33-.91,2.69-1.48,4.08-.47,1.14-1,2.29-1.6,3.45-.15.08-.31.23-.47.39.59-1.15,1.12-2.3,1.59-3.44.57-1.38,1.06-2.76,1.47-4.1.17-.15.34-.29.5-.38Z"/>
              <path className="cls-349" d="M963.84,929.78c-.08.41-.17.83-.27,1.25-.28,1.25-.63,2.55-1.04,3.88-.17.08-.33.22-.5.38.41-1.34.75-2.66,1.02-3.94.09-.43.18-.84.26-1.25.18-.12.36-.22.53-.31Z"/>
              <path className="cls-499" d="M964.29,927.17c-.07.46-.14.92-.22,1.39-.07.4-.15.8-.23,1.21-.17.09-.35.19-.53.31.08-.41.16-.81.22-1.22.08-.48.15-.95.21-1.44.19-.09.37-.18.55-.25Z"/>
              <path className="cls-136" d="M964.72,923.4c-.06.77-.14,1.58-.24,2.43-.05.44-.11.88-.18,1.34-.18.07-.36.16-.55.25.06-.48.12-.96.17-1.44.09-.81.17-1.62.23-2.37.2-.08.39-.15.57-.2Z"/>
              <path className="cls-290" d="M965.12,694.38c-.12,113.05-.23,221.17-.23,224.04,0,.81,0,1.77-.05,2.82-.03.67-.07,1.39-.13,2.16-.18.05-.37.12-.57.2.06-.76.1-1.49.13-2.16.04-.88.05-1.72.07-2.49.32-9.85.14-29.69.16-55.91.03-44.47.09-111.14.15-178.44.17,3.09.33,6.19.48,9.77Z"/>
              <path className="cls-608" d="M965.48,436.92c0,.87,0,1.9-.01,3.09-.07,20.54-.22,139.98-.34,254.37-.15-3.57-.31-6.67-.48-9.77.1-101.97.21-205.25.28-235.85,0-1.83.03-3.58.05-5.25.16-2.19.32-4.38.5-6.59Z"/>
              <path className="cls-139" d="M965.49,433.9c0,.31,0,.62,0,.92,0,.52,0,1.22,0,2.09-.18,2.21-.34,4.4-.5,6.59.01-1.67,0-3.26-.05-4.75-.04-.93-.1-1.97-.12-3,.25-.59.5-1.18.68-1.86Z"/>
              <path className="cls-372" d="M965.71,432.33c-.06.21-.11.43-.15.66-.05.3-.07.61-.07.92-.19.67-.43,1.26-.68,1.86-.01-1.02.02-2.02.2-2.86.04-.21.09-.42.15-.61.19.01.37.02.56.04Z"/>
              <path className="cls-159" d="M965.94,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
            </g>
            <g>
              <path className="cls-157" d="M965.94,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M965.94,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M965.94,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M965.94,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M965.94,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M965.94,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M965.94,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M965.94,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M965.94,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M965.94,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M965.94,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M965.94,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M965.94,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M965.94,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M965.94,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M965.94,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
            </g>
            <g>
              <path className="cls-157" d="M965.94,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M965.94,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M965.94,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M965.94,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M965.94,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M965.94,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M965.94,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M965.94,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M965.94,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M965.94,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M965.94,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M965.94,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M965.94,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M965.94,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M965.94,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
            </g>
          </g>
        </g>
      </g>
    </g>
    <g id="Layer_4" data-name="Layer 4">
      <g id="nahco3-solution-group" clipPath="url(#nahco3-fill-mask)">
        <path id="nahco3-solution" className="cls-504" d="M406.72,657.17h80.16l1.04,261.99s-5.5,33.67-35.73,34.46c-30.22.79-43.09-13.4-43.75-34.15-.66-20.75-1.73-262.3-1.73-262.3Z"/>
      </g>
    </g>
    <g id="Layer_5" data-name="Layer 5">
      <g>
        <g className="cls-281">
          <use transform="translate(385 420)" xlinkHref="#image-4"/>
          <image width="47" height="535" transform="translate(401 431)" xlinkHref="data:image/png;base64,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"/>
          <use transform="translate(447 420)" xlinkHref="#image-2"/>
          <image width="46" height="535" transform="translate(447 431)" xlinkHref="data:image/png;base64,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"/>
        </g>
        <g className="cls-220">
          <use transform="translate(385 420)" xlinkHref="#image-3"/>
          <image width="47" height="535" transform="translate(401 431)" xlinkHref="data:image/png;base64,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"/>
          <use transform="translate(447 420)" xlinkHref="#image"/>
          <image width="46" height="535" transform="translate(447 431)" xlinkHref="data:image/png;base64,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"/>
        </g>
        <g className="cls-244">
          <g id="MeshGrid-5" data-name="MeshGrid">
            <g>
              <path className="cls-159" d="M401.28,431.28c.08.15.16.3.22.45-.12,0-.23,0-.34,0-.07-.15-.15-.29-.23-.43.11,0,.23-.01.36-.02Z"/>
              <path className="cls-338" d="M400.6,430.38c.15.15.28.31.41.48.1.14.19.28.27.42-.12,0-.24,0-.36.02-.09-.14-.18-.27-.28-.39-.12-.16-.26-.3-.4-.44.11-.03.23-.06.36-.09Z"/>
              <path className="cls-573" d="M399.48,429.58c.24.12.45.25.65.39.17.12.33.26.47.41-.13.03-.25.06-.36.09-.15-.14-.3-.26-.47-.38-.2-.14-.41-.27-.63-.38.1-.04.21-.08.34-.12Z"/>
              <path className="cls-615" d="M398.3,429.11c.15.04.29.09.43.14.26.1.52.2.75.32-.12.04-.24.08-.34.12-.22-.11-.46-.22-.7-.3-.13-.05-.26-.09-.4-.13.08-.05.17-.1.26-.16Z"/>
              <path className="cls-255" d="M395.86,428.68c.67.06,1.35.15,2,.3.15.04.3.08.44.12-.09.05-.18.1-.26.16-.14-.04-.28-.08-.42-.11-.7-.16-1.42-.23-2.15-.28.13-.06.26-.13.39-.2Z"/>
              <path className="cls-412" d="M392.42,428.44c.47.04.95.08,1.42.11.67.05,1.36.08,2.03.14-.13.07-.26.14-.39.2-.73-.04-1.46-.06-2.17-.11-.52-.03-1.05-.07-1.58-.12.23-.07.45-.14.7-.22Z"/>
              <path className="cls-494" d="M389.75,428.09c.39.07.82.14,1.27.19.45.06.93.11,1.39.15-.24.08-.47.15-.7.22-.53-.04-1.05-.09-1.56-.15-.54-.06-1.06-.13-1.53-.21.31-.08.71-.14,1.13-.21Z"/>
              <path className="cls-454" d="M387.83,427.37c.2.19.5.34.87.46.31.1.66.19,1.05.26-.42.06-.82.13-1.13.21-.47-.08-.9-.17-1.25-.27-.45-.13-.79-.27-.97-.44.41-.09.91-.15,1.42-.22Z"/>
              <path className="cls-625" d="M387.28,426.21c.03.13.07.25.11.36.09.24.18.45.3.63.04.06.09.12.14.17-.51.06-1.01.13-1.42.22-.06-.06-.11-.12-.13-.18-.07-.19-.15-.4-.21-.63-.04-.13-.07-.27-.1-.41.42-.06.87-.11,1.32-.16Z"/>
              <path className="cls-379" d="M387.09,425.52c.04.1.08.21.1.3.02.14.05.27.09.39-.46.05-.9.1-1.32.16-.03-.14-.06-.28-.08-.43-.01-.09-.03-.17-.04-.26.39-.06.82-.12,1.26-.17Z"/>
              <path className="cls-295" d="M386.88,425c.02.07.05.15.08.22.04.1.1.21.14.31-.44.05-.86.1-1.26.17-.01-.09-.02-.17-.03-.26,0-.06,0-.13-.01-.19.35-.09.7-.17,1.08-.24Z"/>
              <path className="cls-182" d="M386.78,424.51c.02.09.05.19.05.28,0,.07.02.14.04.21-.37.07-.72.14-1.08.24,0-.06,0-.12,0-.19,0-.08,0-.17,0-.25.32-.12.64-.21.98-.29Z"/>
              <path className="cls-192" d="M386.74,423.81c.01.13.05.29.02.42-.02.09,0,.18.02.27-.34.08-.66.18-.98.29,0-.08.01-.16.02-.24.02-.12.04-.24.07-.36.26-.16.54-.28.84-.39Z"/>
              <path className="cls-171" d="M386.77,423.28s-.01.09-.03.13c-.05.12-.02.26,0,.4-.31.11-.58.23-.84.39.03-.12.07-.23.11-.34.02-.04.03-.08.05-.11.22-.19.45-.34.72-.47Z"/>
              <path className="cls-171" d="M386.82,423s-.02.1-.03.15c0,.04,0,.09-.02.13-.27.12-.5.28-.72.47.02-.04.04-.07.06-.11.02-.04.05-.08.08-.12.19-.21.39-.38.63-.51Z"/>
              <path className="cls-566" d="M386.88,422.86s-.05.09-.07.14c-.24.14-.43.31-.63.51.03-.04.06-.08.09-.12.18-.22.37-.39.6-.54Z"/>
              <path className="cls-144" d="M402.02,431.24c.07.16.13.32.18.48-.12,0-.23,0-.35,0-.12,0-.24,0-.35,0-.06-.15-.14-.3-.22-.45.12,0,.25,0,.37-.02.12,0,.24-.01.37-.02Z"/>
              <path className="cls-151" d="M401.39,430.2c.14.17.27.36.38.56.09.16.17.32.24.48-.13,0-.25,0-.37.02-.12,0-.25.01-.37.02-.08-.15-.17-.29-.27-.42-.12-.17-.26-.33-.41-.48.13-.03.26-.06.39-.09.13-.03.26-.05.4-.08Z"/>
              <path className="cls-556" d="M400.25,429.33c.26.13.5.27.69.42.16.13.32.28.46.46-.14.03-.28.06-.4.08-.13.03-.26.06-.39.09-.15-.15-.31-.29-.47-.41-.19-.14-.41-.27-.65-.39.12-.04.25-.08.37-.13.12-.04.25-.08.39-.12Z"/>
              <path className="cls-349" d="M398.92,428.79c.16.05.32.11.48.17.3.11.59.24.85.37-.14.04-.27.08-.39.12-.12.05-.25.09-.37.13-.24-.12-.49-.23-.75-.32-.14-.05-.28-.1-.43-.14.09-.05.19-.1.3-.16.1-.05.21-.11.32-.16Z"/>
              <path className="cls-415" d="M396.82,428.3c.54.08,1.08.19,1.6.34.16.05.33.1.49.16-.11.05-.22.1-.32.16-.1.06-.2.11-.3.16-.15-.04-.29-.09-.44-.12-.65-.16-1.33-.25-2-.3.13-.07.28-.14.45-.21.17-.06.34-.12.51-.18Z"/>
              <path className="cls-503" d="M394.1,427.98c.36.04.72.08,1.09.12.55.06,1.1.12,1.64.2-.17.06-.34.11-.51.18-.17.07-.31.14-.45.21-.67-.06-1.36-.09-2.03-.14-.47-.03-.95-.07-1.42-.11.24-.08.51-.16.8-.23.29-.07.58-.15.88-.22Z"/>
              <path className="cls-166" d="M392.09,427.63c.28.07.59.13.93.2.35.07.71.11,1.07.16-.3.07-.59.15-.88.22-.29.08-.55.15-.8.23-.47-.04-.94-.09-1.39-.15-.45-.06-.88-.12-1.27-.19.42-.06.85-.13,1.24-.21.36-.07.72-.16,1.1-.25Z"/>
              <path className="cls-195" d="M390.68,426.93c.18.19.4.33.65.45.22.1.47.18.76.25-.37.09-.74.18-1.1.25-.39.08-.82.15-1.24.21-.39-.07-.75-.16-1.05-.26-.37-.12-.67-.27-.87-.46.51-.06,1.05-.12,1.53-.2.42-.06.87-.15,1.32-.24Z"/>
              <path className="cls-340" d="M390.12,425.93c.03.1.07.2.1.29.12.3.27.53.46.72-.45.09-.9.19-1.32.24-.48.08-1.01.14-1.53.2-.06-.05-.11-.11-.14-.17-.11-.18-.21-.39-.3-.63-.04-.12-.08-.23-.11-.36.46-.05.93-.1,1.42-.14.46-.04.94-.1,1.42-.14Z"/>
              <path className="cls-611" d="M389.85,425.27c.06.11.16.22.19.33.03.12.05.22.09.33-.48.05-.96.1-1.42.14-.49.05-.96.09-1.42.14-.03-.13-.06-.26-.09-.39-.02-.09-.06-.2-.1-.3.44-.05.9-.09,1.36-.13.45-.04.91-.08,1.39-.12Z"/>
              <path className="cls-164" d="M389.44,424.7c.04.08.11.16.16.24.07.11.19.22.25.33-.48.04-.94.08-1.39.12-.46.04-.92.09-1.36.13-.04-.1-.09-.21-.14-.31-.03-.07-.06-.15-.08-.22.37-.07.76-.12,1.2-.17.42-.05.87-.09,1.37-.13Z"/>
              <path className="cls-601" d="M389.24,424.15c.03.11.09.21.1.32.01.08.06.15.1.23-.49.04-.95.08-1.37.13-.43.05-.83.11-1.2.17-.02-.07-.04-.14-.04-.21,0-.09-.03-.19-.05-.28.34-.08.71-.15,1.12-.21.4-.06.84-.1,1.34-.15Z"/>
              <path className="cls-398" d="M389.15,423.36c.02.16.1.32.05.48-.03.1.02.21.04.31-.5.05-.93.1-1.34.15-.41.06-.78.12-1.12.21-.02-.09-.04-.19-.02-.27.02-.14-.01-.29-.02-.42.31-.11.65-.19,1.05-.26.39-.07.83-.13,1.37-.19Z"/>
              <path className="cls-483" d="M389.12,422.75c0,.05,0,.1-.02.15-.05.14.03.29.05.45-.53.06-.98.12-1.37.19-.4.07-.74.16-1.05.26-.01-.13-.04-.28,0-.4.02-.04.02-.09.03-.13.27-.13.58-.22.97-.31.38-.08.82-.15,1.37-.22Z"/>
              <path className="cls-483" d="M389.13,422.42c-.02.06,0,.12,0,.18,0,.05,0,.1,0,.15-.55.07-1,.14-1.37.22-.39.09-.7.18-.97.31,0-.04,0-.09.02-.13,0-.05.01-.1.03-.15.24-.14.53-.25.91-.34.37-.09.83-.16,1.4-.24Z"/>
              <path className="cls-603" d="M389.19,422.26c-.04.05-.05.11-.06.17-.57.07-1.03.15-1.4.24-.38.09-.67.2-.91.34.02-.05.03-.1.07-.14.24-.14.52-.26.9-.36.37-.09.82-.17,1.4-.25Z"/>
              <path className="cls-316" d="M402.44,431.2c.07.17.12.35.16.52-.02,0-.03,0-.05,0-.12,0-.24,0-.36,0-.05-.16-.11-.32-.18-.48.13,0,.25,0,.38-.02.02,0,.03-.01.04-.03Z"/>
              <path className="cls-304" d="M401.88,430.1c.13.18.24.38.34.59.08.17.16.34.22.51-.01.01-.02.02-.04.03-.13,0-.25.01-.38.02-.07-.16-.15-.33-.24-.48-.11-.2-.24-.38-.38-.56.14-.03.28-.06.42-.08.02,0,.04-.01.07-.02Z"/>
              <path className="cls-329" d="M400.72,429.19c.27.14.52.28.71.43.17.14.32.3.45.48-.02,0-.04.01-.07.02-.14.03-.28.05-.42.08-.14-.17-.3-.33-.46-.46-.19-.15-.43-.29-.69-.42.14-.04.28-.08.42-.12.02,0,.04-.01.06-.01Z"/>
              <path className="cls-431" d="M399.32,428.61c.17.06.34.12.51.19.32.12.62.25.9.39-.02,0-.04,0-.06.01-.14.04-.28.08-.42.12-.26-.13-.55-.25-.85-.37-.16-.06-.32-.12-.48-.17.11-.05.23-.1.35-.16.02,0,.03-.01.05-.02Z"/>
              <path className="cls-613" d="M397.47,428.13c.45.08.9.18,1.34.31.17.06.34.12.51.18-.02,0-.03,0-.05.02-.12.05-.24.11-.35.16-.16-.05-.33-.11-.49-.16-.52-.15-1.06-.26-1.6-.34.17-.06.36-.11.55-.17.03,0,.06,0,.09,0Z"/>
              <path className="cls-442" d="M395.18,427.75c.31.06.62.11.93.16.45.07.91.14,1.36.22-.03,0-.07,0-.09,0-.2.06-.38.11-.55.17-.54-.08-1.09-.14-1.64-.2-.36-.04-.73-.07-1.09-.12.3-.07.61-.14.93-.21.04,0,.1-.02.16-.02Z"/>
              <path className="cls-418" d="M393.47,427.38c.24.07.5.13.78.19.31.07.62.13.93.19-.06,0-.11.01-.16.02-.32.07-.63.14-.93.21-.36-.04-.72-.09-1.07-.16-.34-.06-.65-.13-.93-.2.37-.09.75-.18,1.14-.25.05,0,.15,0,.25,0Z"/>
              <path className="cls-402" d="M392.21,426.7c.16.18.37.32.6.43.2.1.43.18.67.25-.1,0-.19,0-.25,0-.39.07-.77.16-1.14.25-.28-.07-.53-.15-.76-.25-.25-.11-.47-.26-.65-.45.45-.09.91-.18,1.35-.22.06,0,.12,0,.17,0Z"/>
              <path className="cls-477" d="M391.75,425.77c.02.09.05.18.08.26.08.28.21.5.38.67-.06,0-.12,0-.17,0-.45.04-.9.13-1.35.22-.19-.19-.33-.42-.46-.72-.04-.09-.07-.18-.1-.29.48-.05.97-.1,1.45-.13.06,0,.12-.02.19-.03Z"/>
              <path className="cls-161" d="M391.56,425.14c.05.11.1.23.13.35.02.1.04.19.06.28-.06.01-.12.02-.19.03-.48.03-.97.08-1.45.13-.03-.1-.06-.21-.09-.33-.03-.11-.12-.22-.19-.33.48-.04.98-.07,1.5-.11.07,0,.14,0,.21-.01Z"/>
              <path className="cls-286" d="M391.31,424.56c.03.08.06.16.09.24.05.11.1.23.15.34-.07,0-.14,0-.21.01-.52.04-1.02.07-1.5.11-.06-.11-.18-.22-.25-.33-.05-.08-.12-.16-.16-.24.5-.04,1.03-.08,1.62-.12.08,0,.17-.01.26-.02Z"/>
              <path className="cls-618" d="M391.21,423.98c0,.11.02.22.04.33.01.08.04.16.06.24-.09,0-.17.01-.26.02-.59.04-1.12.08-1.62.12-.04-.08-.09-.16-.1-.23-.01-.1-.07-.21-.1-.32.5-.05,1.05-.09,1.69-.14.09,0,.18-.01.28-.02Z"/>
              <path className="cls-481" d="M391.34,423.15c-.03.16-.05.33-.1.5-.03.11-.03.22-.03.33-.09,0-.19.01-.28.02-.64.05-1.19.1-1.69.14-.03-.11-.07-.21-.04-.31.04-.16-.03-.32-.05-.48.53-.06,1.15-.12,1.88-.18.1,0,.21-.02.32-.03Z"/>
              <path className="cls-92" d="M391.49,422.51c-.02.05-.03.11-.05.16-.05.15-.07.31-.1.47-.11,0-.22.02-.32.03-.73.06-1.34.12-1.88.18-.02-.16-.09-.31-.05-.45.02-.05.01-.1.02-.15.55-.07,1.21-.13,2.02-.21.12-.01.23-.02.35-.03Z"/>
              <path className="cls-386" d="M391.62,422.17c-.03.06-.06.12-.08.19-.02.05-.04.11-.05.16-.12.01-.24.02-.35.03-.81.07-1.47.14-2.02.21,0-.05,0-.1,0-.15,0-.06,0-.12,0-.18.57-.07,1.27-.14,2.12-.22.12-.01.25-.02.38-.04Z"/>
              <path className="cls-605" d="M391.74,421.98c-.05.06-.08.12-.11.18-.13.01-.26.02-.38.04-.85.08-1.54.15-2.12.22.02-.06.02-.11.06-.17.58-.08,1.29-.15,2.16-.23.12-.01.25-.02.39-.04Z"/>
              <path className="cls-316" d="M402.85,431.19c.06.18.1.36.14.54-.11,0-.22,0-.33,0h-.05c-.04-.17-.1-.35-.16-.52.01-.01.02-.02.04-.03.12,0,.24,0,.36.01Z"/>
              <path className="cls-304" d="M402.35,430.02c.12.19.22.4.3.63.07.18.14.36.19.54-.12,0-.24-.02-.36-.01-.02,0-.03.01-.04.03-.06-.17-.14-.35-.22-.51-.09-.21-.21-.41-.34-.59.02,0,.04-.01.07-.02.13-.02.26-.05.4-.07Z"/>
              <path className="cls-329" d="M401.19,429.07c.28.14.53.29.72.45.17.14.32.31.44.5-.14.02-.27.04-.4.07-.02,0-.04.01-.07.02-.13-.18-.28-.34-.45-.48-.19-.15-.43-.3-.71-.43.02,0,.04,0,.06-.01.13-.04.26-.07.4-.11Z"/>
              <path className="cls-538" d="M399.73,428.45c.18.07.36.13.53.2.33.13.65.27.93.41-.14.04-.28.07-.4.11-.02,0-.04,0-.06.01-.27-.14-.58-.27-.9-.39-.17-.06-.34-.13-.51-.19.02,0,.03,0,.05-.02.11-.05.23-.1.36-.14Z"/>
              <path className="cls-613" d="M398.08,427.97c.38.09.75.18,1.12.29.17.06.35.13.53.19-.13.05-.25.1-.36.14-.02,0-.03.01-.05.02-.17-.06-.34-.12-.51-.18-.44-.13-.89-.23-1.34-.31.03,0,.07,0,.09,0,.17-.05.34-.11.52-.17Z"/>
              <path className="cls-396" d="M396.17,427.53c.26.06.52.13.77.18.38.09.75.16,1.13.25-.17.06-.34.11-.52.17-.03,0-.06,0-.09,0-.45-.08-.91-.15-1.36-.22-.31-.05-.62-.1-.93-.16.06,0,.11-.01.16-.02.28-.06.56-.13.83-.2Z"/>
              <path className="cls-418" d="M394.75,427.14c.21.07.42.13.64.19.26.07.52.14.78.2-.27.07-.55.14-.83.2-.04,0-.1.02-.16.02-.31-.06-.62-.12-.93-.19-.27-.06-.53-.12-.78-.19.1,0,.19,0,.25,0,.35-.06.69-.15,1.03-.23Z"/>
              <path className="cls-290" d="M393.64,426.49c.15.17.32.3.53.41.18.1.37.18.58.25-.34.08-.67.16-1.03.23-.05,0-.15,0-.25,0-.24-.07-.47-.15-.67-.25-.23-.11-.43-.25-.6-.43.06,0,.12,0,.18,0,.41-.05.83-.13,1.26-.21Z"/>
              <path className="cls-371" d="M393.24,425.65c.02.08.04.16.07.23.07.25.19.45.33.61-.42.08-.85.16-1.26.21-.06,0-.12,0-.18,0-.16-.18-.29-.4-.38-.67-.03-.08-.06-.17-.08-.26.06-.01.12-.02.19-.03.43-.04.87-.07,1.3-.1Z"/>
              <path className="cls-512" d="M393.06,425.05c.05.12.1.23.13.35.01.08.03.16.05.24-.43.03-.87.06-1.3.1-.06,0-.12.02-.19.03-.02-.09-.04-.18-.06-.28-.04-.12-.08-.23-.13-.35.07,0,.14,0,.21-.01.43-.03.86-.05,1.29-.08Z"/>
              <path className="cls-619" d="M392.84,424.45c.02.08.05.17.08.25.04.12.09.23.14.35-.43.03-.86.05-1.29.08-.08,0-.15,0-.21.01-.05-.11-.1-.23-.15-.34-.03-.08-.07-.16-.09-.24.09,0,.18-.01.26-.02.42-.03.84-.06,1.26-.09Z"/>
              <path className="cls-92" d="M392.71,423.87c.02.11.07.22.08.33,0,.08.02.17.04.25-.42.03-.84.05-1.26.09-.09,0-.18.01-.26.02-.03-.08-.05-.16-.06-.24-.02-.11-.04-.22-.04-.33.09,0,.19-.01.29-.02.28-.02.57-.04.86-.07.12,0,.23-.02.35-.02Z"/>
              <path className="cls-247" d="M392.85,423.03c-.03.16-.09.33-.15.51-.03.11,0,.22.02.33-.12,0-.24.02-.35.02-.29.02-.58.04-.86.07-.1,0-.19.02-.29.02,0-.11,0-.22.03-.33.05-.17.08-.34.1-.5.11,0,.22-.02.33-.03.27-.02.55-.05.83-.07.11,0,.22-.02.34-.02Z"/>
              <path className="cls-497" d="M393.01,422.38c-.02.05-.03.11-.05.17-.04.16-.08.32-.12.48-.12,0-.23.02-.34.02-.28.02-.56.05-.83.07-.11,0-.23.02-.33.03.03-.16.05-.32.1-.47.02-.06.03-.11.05-.16.12-.01.24-.02.37-.03.39-.03.77-.07,1.15-.1Z"/>
              <path className="cls-589" d="M393.17,422.03c-.04.06-.07.13-.1.19-.02.05-.04.11-.06.16-.38.03-.76.06-1.15.1-.13.01-.25.02-.37.03.02-.05.03-.11.05-.16.02-.06.05-.13.08-.19.13-.01.26-.02.4-.04.39-.04.77-.07,1.15-.1Z"/>
              <path className="cls-135" d="M393.3,421.84c-.05.06-.09.12-.13.19-.38.03-.76.06-1.15.1-.13.01-.27.02-.4.04.03-.06.07-.12.11-.18.13-.01.27-.03.41-.04.39-.04.77-.07,1.16-.1Z"/>
              <path className="cls-573" d="M403.72,431.13c.03.2.06.4.09.59-.17,0-.33,0-.49,0-.11,0-.22,0-.34,0-.04-.17-.08-.35-.14-.54.12,0,.25.02.37.01.18-.01.34-.04.51-.07Z"/>
              <path className="cls-284" d="M403.38,429.84c.1.21.18.44.22.68.05.19.09.4.13.6-.17.03-.33.06-.51.07-.12,0-.25,0-.37-.01-.06-.18-.12-.37-.19-.54-.08-.22-.18-.43-.3-.63.14-.02.28-.04.41-.06.2-.03.41-.07.62-.11Z"/>
              <path className="cls-105" d="M402.24,428.82c.29.15.55.31.73.47.17.16.31.34.41.55-.21.04-.42.08-.62.11-.14.02-.28.04-.41.06-.12-.19-.27-.36-.44-.5-.19-.15-.44-.3-.72-.45.14-.04.28-.07.42-.11.2-.05.41-.1.63-.14Z"/>
              <path className="cls-249" d="M400.71,428.14c.19.08.38.15.56.23.34.15.68.3.97.45-.22.04-.43.09-.63.14-.14.04-.28.07-.42.11-.28-.14-.6-.28-.93-.41-.17-.07-.35-.14-.53-.2.13-.05.26-.09.39-.14.19-.07.39-.12.6-.17Z"/>
              <path className="cls-279" d="M399.4,427.61c.26.1.49.2.75.3.19.08.38.15.57.23-.21.05-.42.11-.6.17-.13.05-.26.09-.39.14-.18-.07-.36-.13-.53-.19-.37-.12-.74-.21-1.12-.29.17-.06.35-.11.53-.17.27-.08.53-.14.79-.19Z"/>
              <path className="cls-196" d="M398.16,427.1c.17.07.32.14.49.21.26.1.49.2.75.3-.26.06-.52.12-.79.19-.19.05-.36.11-.53.17-.38-.09-.75-.16-1.13-.25-.26-.06-.51-.12-.77-.18.27-.07.55-.14.83-.2.41-.09.79-.16,1.16-.23Z"/>
              <path className="cls-152" d="M397.23,426.65c.14.08.29.16.46.23.16.07.31.15.48.22-.37.07-.75.14-1.16.23-.28.06-.56.13-.83.2-.26-.06-.52-.13-.78-.2-.22-.06-.44-.12-.64-.19.34-.08.67-.16,1.01-.22.49-.08.99-.18,1.47-.27Z"/>
              <path className="cls-515" d="M396.51,426.03c.1.13.21.25.34.36.11.1.24.18.38.26-.48.1-.99.2-1.47.27-.34.06-.67.14-1.01.22-.21-.07-.4-.15-.58-.25-.2-.11-.38-.24-.53-.41.42-.08.84-.16,1.23-.2.55-.05,1.11-.16,1.64-.26Z"/>
              <path className="cls-440" d="M396.21,425.42c.02.06.04.11.06.16.07.17.15.31.25.45-.53.1-1.09.21-1.64.26-.39.05-.81.12-1.23.2-.15-.17-.26-.37-.33-.61-.03-.07-.05-.15-.07-.23.43-.03.86-.06,1.27-.09.59-.03,1.16-.09,1.7-.14Z"/>
              <path className="cls-188" d="M396.02,424.9c.03.12.09.23.13.35.02.06.04.12.06.17-.54.05-1.11.1-1.7.14-.41.03-.84.06-1.27.09-.02-.08-.04-.16-.05-.24-.04-.12-.08-.23-.13-.35.43-.03.85-.05,1.26-.07.59-.03,1.16-.06,1.7-.08Z"/>
              <path className="cls-399" d="M395.88,424.3c0,.08.03.17.04.25.02.12.07.23.11.35-.54.03-1.1.05-1.7.08-.42.02-.84.05-1.26.07-.05-.12-.1-.23-.14-.35-.03-.08-.06-.17-.08-.25.42-.03.83-.05,1.25-.07.6-.03,1.2-.06,1.79-.08Z"/>
              <path className="cls-380" d="M395.82,423.72c0,.11.08.22.06.33-.01.08,0,.17,0,.25-.59.03-1.18.05-1.79.08-.42.02-.84.05-1.25.07-.02-.08-.04-.17-.04-.25,0-.11-.06-.22-.08-.33.4-.03.81-.05,1.24-.07.59-.03,1.22-.06,1.87-.08Z"/>
              <path className="cls-129" d="M395.99,422.88c-.08.17-.09.34-.18.51-.05.11,0,.22,0,.33-.65.03-1.27.05-1.87.08-.43.02-.84.05-1.24.07-.02-.11-.05-.22-.02-.33.06-.17.11-.34.15-.51.38-.03.79-.05,1.2-.07.59-.03,1.23-.06,1.95-.08Z"/>
              <path className="cls-23" d="M396.26,422.22c-.04.06-.05.11-.08.17-.09.16-.11.32-.19.49-.72.03-1.36.05-1.95.08-.41.02-.81.04-1.2.07.03-.16.08-.33.12-.48.01-.06.03-.11.05-.17.38-.03.77-.06,1.15-.08.59-.03,1.3-.06,2.1-.09Z"/>
              <path className="cls-90" d="M396.49,421.86c-.06.06-.08.13-.13.19-.04.06-.06.11-.1.17-.81.03-1.51.06-2.1.09-.39.02-.77.05-1.15.08.02-.05.04-.11.06-.16.03-.06.06-.13.1-.19.38-.03.76-.06,1.15-.08.59-.03,1.32-.06,2.17-.1Z"/>
              <path className="cls-215" d="M396.64,421.67c-.06.06-.1.13-.15.19-.85.03-1.58.06-2.17.1-.39.02-.77.05-1.15.08.04-.06.08-.12.13-.19.39-.03.77-.06,1.16-.08.59-.03,1.33-.06,2.18-.1Z"/>
              <path className="cls-2" d="M405.01,431.09c.04.21.08.42.11.62-.28,0-.55,0-.81,0-.17,0-.34,0-.5,0-.02-.19-.05-.39-.09-.59.17-.03.34-.06.52-.06.25,0,.51.01.77.03Z"/>
              <path className="cls-581" d="M404.63,429.78c.11.22.19.45.24.7.06.2.1.41.15.62-.26-.02-.52-.03-.77-.03-.18,0-.35.03-.52.06-.03-.2-.08-.41-.13-.6-.04-.24-.11-.47-.22-.68.21-.04.42-.07.63-.1.22,0,.42.02.62.03Z"/>
              <path className="cls-557" d="M403.47,428.64c.28.18.53.37.73.55.17.18.31.37.42.59-.2-.02-.4-.03-.62-.03-.21.02-.42.06-.63.1-.1-.21-.24-.39-.41-.55-.19-.16-.45-.32-.73-.47.22-.04.44-.08.66-.13.21-.02.39-.04.57-.06Z"/>
              <path className="cls-417" d="M402.02,427.84c.18.09.36.18.53.27.33.17.64.36.92.54-.18.02-.36.04-.57.06-.22.04-.44.08-.66.13-.29-.15-.62-.3-.97-.45-.18-.08-.37-.15-.56-.23.21-.05.44-.1.66-.15.22-.05.42-.1.64-.15Z"/>
              <path className="cls-553" d="M400.96,427.3c.18.1.35.2.51.28.18.08.36.17.54.26-.22.05-.43.11-.64.15-.23.05-.45.1-.66.15-.19-.08-.38-.15-.57-.23-.26-.1-.49-.21-.75-.3.26-.06.52-.11.79-.17.25-.05.51-.1.77-.14Z"/>
              <path className="cls-501" d="M400.11,426.75c.1.07.21.15.33.23.17.11.34.23.52.33-.27.04-.52.09-.77.14-.28.06-.53.11-.79.17-.26-.1-.49-.2-.75-.3-.17-.07-.32-.14-.49-.21.37-.07.72-.13,1.07-.2.3-.05.59-.1.88-.16Z"/>
              <path className="cls-570" d="M399.52,426.27c.09.09.19.18.3.26.09.07.18.14.29.21-.29.05-.58.11-.88.16-.35.07-.7.13-1.07.2-.17-.07-.31-.14-.48-.22-.17-.08-.32-.15-.46-.23.48-.1.94-.19,1.33-.25.31-.04.64-.09.96-.14Z"/>
              <path className="cls-321" d="M399.01,425.66c.08.11.16.22.25.33.08.1.16.19.26.28-.32.05-.65.1-.96.14-.39.06-.85.15-1.33.25-.14-.08-.26-.17-.38-.26-.13-.11-.24-.23-.34-.36.53-.1,1.04-.2,1.48-.24.32-.03.67-.08,1.02-.12Z"/>
              <path className="cls-198" d="M398.71,425.22s.05.07.07.1c.08.11.15.22.23.33-.35.05-.7.1-1.02.12-.44.04-.95.14-1.48.24-.1-.13-.18-.28-.25-.45-.02-.05-.04-.11-.06-.16.54-.05,1.05-.1,1.52-.12.32-.02.65-.04.98-.07Z"/>
              <path className="cls-463" d="M398.57,424.78c0,.11.03.23.07.34.03.03.05.07.07.1-.33.02-.66.05-.98.07-.47.02-.98.07-1.52.12-.02-.06-.04-.11-.06-.17-.03-.12-.1-.23-.13-.35.54-.03,1.06-.05,1.58-.07.32-.02.64-.03.97-.04Z"/>
              <path className="cls-264" d="M398.62,424.19c-.02.08-.03.17-.04.25-.01.11-.02.23,0,.34-.32.01-.65.03-.97.04-.51.02-1.04.05-1.58.07-.03-.12-.09-.23-.11-.35-.01-.08-.04-.17-.04-.25.59-.03,1.17-.05,1.75-.07.33-.01.66-.03.99-.04Z"/>
              <path className="cls-587" d="M398.77,423.62c-.03.11-.06.22-.09.33-.02.08-.04.17-.06.25-.33,0-.66.02-.99.04-.58.02-1.16.05-1.75.07,0-.08-.01-.17,0-.25.02-.11-.06-.22-.06-.33.65-.03,1.32-.05,2.01-.08.31,0,.63-.02.94-.02Z"/>
              <path className="cls-362" d="M399.2,422.78c-.12.17-.22.34-.3.51-.05.11-.09.22-.13.33-.32,0-.63.01-.94.02-.69.03-1.36.05-2.01.08,0-.11-.06-.22,0-.33.09-.17.1-.34.18-.51.72-.03,1.5-.05,2.37-.08.28,0,.56,0,.84-.01Z"/>
              <path className="cls-359" d="M399.73,422.11c-.05.06-.1.12-.15.17-.14.16-.26.33-.38.5-.28,0-.56,0-.84.01-.87.03-1.65.06-2.37.08.08-.17.1-.33.19-.49.03-.06.05-.11.08-.17.81-.03,1.71-.06,2.69-.09.25,0,.51,0,.78-.01Z"/>
              <path className="cls-422" d="M400.07,421.74c-.06.07-.12.13-.19.2-.05.06-.1.11-.15.17-.26,0-.52,0-.78.01-.98.03-1.89.06-2.69.09.04-.06.05-.11.1-.17.05-.07.07-.13.13-.19.85-.03,1.81-.07,2.85-.1.24,0,.48-.01.73-.02Z"/>
              <path className="cls-272" d="M400.26,421.54c-.06.07-.12.13-.19.2-.25,0-.49,0-.73.02-1.04.03-2.01.07-2.85.1.06-.06.09-.13.15-.19.86-.03,1.84-.07,2.91-.1.23,0,.46-.01.7-.02Z"/>
              <path className="cls-358" d="M406.19,431.13c.08.19.14.39.2.58-.14,0-.28,0-.41,0-.28,0-.56,0-.84,0-.03-.2-.07-.42-.11-.62.26.02.53.03.79.04.13,0,.25,0,.38,0Z"/>
              <path className="cls-344" d="M405.58,429.86c.14.22.25.45.35.69.09.19.17.39.25.58-.13,0-.25,0-.38,0-.27,0-.53-.02-.79-.04-.04-.21-.09-.42-.15-.62-.05-.25-.13-.48-.24-.7.2.02.4.04.64.05.11,0,.21.02.32.03Z"/>
              <path className="cls-438" d="M404.39,428.61c.27.21.52.42.73.63.18.18.33.39.47.61-.1-.01-.21-.02-.32-.03-.23-.01-.44-.03-.64-.05-.11-.22-.25-.41-.42-.59-.2-.18-.45-.37-.73-.55.18-.02.38-.03.61-.04.11,0,.21,0,.31.01Z"/>
              <path className="cls-213" d="M403.06,427.69c.16.1.31.2.47.31.3.2.59.41.86.62-.1-.01-.2-.02-.31-.01-.24,0-.43.02-.61.04-.28-.18-.6-.36-.92-.54-.17-.09-.35-.18-.53-.27.22-.05.45-.1.7-.13.12-.02.23-.02.34-.02Z"/>
              <path className="cls-568" d="M402.17,427.13c.15.1.29.2.43.27.15.09.31.19.47.29-.11,0-.22,0-.34.02-.25.03-.48.08-.7.13-.18-.09-.36-.17-.54-.26-.17-.08-.33-.17-.51-.28.27-.04.54-.08.82-.12.13-.02.26-.03.39-.05Z"/>
              <path className="cls-123" d="M401.48,426.58c.08.07.17.15.27.22.14.12.28.23.43.34-.13.01-.26.03-.39.05-.28.04-.55.08-.82.12-.18-.1-.35-.22-.52-.33-.12-.08-.22-.15-.33-.23.29-.05.59-.11.89-.15.15-.02.31-.02.47-.02Z"/>
              <path className="cls-214" d="M400.95,426.12c.08.09.18.17.28.25.07.06.15.13.24.21-.16,0-.32,0-.47.02-.3.04-.6.09-.89.15-.1-.07-.2-.15-.29-.21-.11-.08-.21-.17-.3-.26.32-.05.65-.09.96-.13.16-.01.31-.02.47-.02Z"/>
              <path className="cls-383" d="M400.48,425.56c.07.1.16.2.24.3.07.09.15.18.24.26-.16,0-.31,0-.47.02-.32.03-.64.08-.96.13-.09-.09-.18-.18-.26-.28-.09-.11-.17-.22-.25-.33.35-.05.7-.09,1.02-.11.16,0,.3,0,.45,0Z"/>
              <path className="cls-164" d="M400.18,425.16s.05.06.07.09c.08.1.16.2.23.3-.15,0-.29-.02-.45,0-.32.02-.67.07-1.02.11-.08-.11-.16-.22-.23-.33-.02-.03-.05-.07-.07-.1.33-.02.66-.05.98-.06.16,0,.32,0,.49,0Z"/>
              <path className="cls-164" d="M400.04,424.74c0,.11.02.22.06.33.03.03.06.06.08.09-.17,0-.33,0-.49,0-.32.01-.65.03-.98.06-.02-.03-.05-.07-.07-.1-.04-.11-.06-.23-.07-.34.32-.01.65-.02.97-.03.16,0,.33,0,.5-.01Z"/>
              <path className="cls-93" d="M400.09,424.17c-.01.08-.03.16-.04.24-.01.11-.02.22-.01.33-.17,0-.34,0-.5.01-.32,0-.65.02-.97.03,0-.11,0-.23,0-.34,0-.08.02-.17.04-.25.33,0,.66-.01.99-.02.16,0,.32,0,.48,0Z"/>
              <path className="cls-430" d="M400.19,423.6c-.02.11-.03.22-.05.33-.02.08-.04.16-.05.24-.16,0-.32,0-.48,0-.33,0-.66.01-.99.02.02-.08.04-.17.06-.25.03-.11.06-.22.09-.33.32,0,.63-.01.95-.01.15,0,.31,0,.47,0Z"/>
              <path className="cls-453" d="M400.49,422.77c-.09.17-.17.34-.22.5-.04.11-.05.22-.07.33-.16,0-.32,0-.47,0-.31,0-.63,0-.95.01.03-.11.07-.22.13-.33.08-.17.18-.34.3-.51.28,0,.56,0,.85-.01.14,0,.29,0,.44,0Z"/>
              <path className="cls-125" d="M400.93,422.1c-.04.06-.08.12-.12.18-.11.16-.22.33-.31.5-.15,0-.3,0-.44,0-.28,0-.57,0-.85.01.12-.17.24-.33.38-.5.05-.06.1-.12.15-.17.26,0,.53,0,.79-.01.13,0,.26,0,.4,0Z"/>
              <path className="cls-387" d="M401.2,421.71c-.05.07-.1.14-.15.21-.04.06-.08.12-.13.18-.14,0-.27,0-.4,0-.26,0-.53,0-.79.01.05-.06.1-.11.15-.17.06-.07.12-.13.19-.2.25,0,.5-.01.76-.02.12,0,.25,0,.37,0Z"/>
              <path className="cls-614" d="M401.35,421.51c-.05.07-.1.14-.15.21-.13,0-.25,0-.37,0-.25,0-.51.01-.76.02.06-.07.12-.13.19-.2.24,0,.48-.01.73-.02.12,0,.24,0,.36-.01Z"/>
              <path className="cls-433" d="M407.77,431.22c.12.17.25.33.35.48-.45,0-.89,0-1.32,0-.14,0-.28,0-.42,0-.06-.19-.12-.38-.2-.58.13,0,.25,0,.38,0,.39.01.79.05,1.2.08Z"/>
              <path className="cls-536" d="M406.85,430.05c.17.21.36.44.52.66.13.17.28.34.4.51-.41-.03-.81-.07-1.2-.08-.13,0-.26,0-.38,0-.08-.19-.16-.39-.25-.58-.1-.24-.22-.48-.35-.69.1.01.21.03.32.05.3.03.61.09.95.15Z"/>
              <path className="cls-529" d="M405.53,428.69c.25.24.52.48.75.72.19.21.4.43.57.64-.34-.06-.64-.12-.95-.15-.11-.02-.21-.03-.32-.05-.14-.22-.29-.42-.47-.61-.21-.21-.46-.42-.73-.63.1.01.2.02.31.03.27.02.53.03.83.04Z"/>
              <path className="cls-228" d="M404.39,427.64c.12.11.25.23.38.35.24.23.52.46.76.7-.31-.01-.56-.02-.83-.04-.11,0-.21-.02-.31-.03-.27-.21-.56-.42-.86-.62-.16-.11-.31-.21-.47-.31.11,0,.22,0,.34,0,.28-.01.6-.03.98-.04Z"/>
              <path className="cls-206" d="M403.75,427.02c.1.1.18.2.29.28.11.11.23.22.35.33-.38.01-.7.03-.98.04-.12,0-.23,0-.34,0-.16-.1-.31-.2-.47-.29-.14-.07-.28-.16-.43-.27.13-.01.26-.03.39-.04.33-.02.73-.05,1.18-.07Z"/>
              <path className="cls-201" d="M403.34,426.47c.06.07.11.15.17.22.08.12.14.23.24.34-.46.02-.86.05-1.18.07-.14,0-.26.02-.39.04-.15-.1-.29-.22-.43-.34-.09-.07-.18-.15-.27-.22.16,0,.32,0,.47-.01.4-.03.87-.06,1.39-.09Z"/>
              <path className="cls-283" d="M402.99,426.02c.06.08.12.15.19.23.06.08.1.15.16.22-.52.03-.99.07-1.39.09-.15,0-.31,0-.47.01-.08-.07-.16-.14-.24-.21-.1-.08-.2-.16-.28-.25.16,0,.31,0,.48-.01.45-.03.98-.06,1.56-.09Z"/>
              <path className="cls-371" d="M402.65,425.5c.05.1.11.19.17.28.05.08.11.16.17.24-.58.03-1.11.07-1.56.09-.16,0-.32,0-.48.01-.08-.09-.17-.17-.24-.26-.08-.1-.16-.2-.24-.3.15,0,.3.02.48.02.5-.02,1.07-.04,1.69-.07Z"/>
              <path className="cls-299" d="M402.45,425.12s.03.06.04.09c.05.1.1.19.15.29-.61.02-1.18.05-1.69.07-.18,0-.33,0-.48-.02-.07-.1-.15-.2-.23-.3-.02-.03-.05-.06-.07-.09.17,0,.34,0,.53,0,.54-.01,1.12-.02,1.75-.03Z"/>
              <path className="cls-299" d="M402.34,424.72c.02.11.03.21.07.31.02.03.03.06.05.09-.63.01-1.21.02-1.75.03-.19,0-.36,0-.53,0-.03-.03-.05-.06-.08-.09-.04-.11-.05-.22-.06-.33.17,0,.35,0,.53,0,.53,0,1.13-.01,1.77-.02Z"/>
              <path className="cls-384" d="M402.31,424.17c0,.08,0,.15,0,.23.01.11,0,.21.03.32-.64,0-1.24,0-1.77.02-.18,0-.36,0-.53,0,0-.11,0-.22.01-.33,0-.08.02-.16.04-.24.16,0,.32,0,.49,0,.52,0,1.11,0,1.73,0Z"/>
              <path className="cls-427" d="M402.33,423.62c0,.11-.02.21-.02.32,0,.08-.01.15,0,.23-.62,0-1.21,0-1.73,0-.16,0-.33,0-.49,0,.01-.08.03-.16.05-.24.02-.11.03-.22.05-.33.16,0,.33,0,.49,0,.51,0,1.07,0,1.65.01Z"/>
              <path className="cls-537" d="M402.45,422.79c-.04.17-.07.34-.08.51,0,.11-.03.21-.03.32-.58,0-1.14-.01-1.65-.01-.16,0-.33,0-.49,0,.02-.11.04-.22.07-.33.05-.17.13-.34.22-.5.15,0,.31,0,.47,0,.47,0,.97,0,1.49.01Z"/>
              <path className="cls-211" d="M402.65,422.09c-.02.06-.04.12-.06.18-.05.17-.1.34-.14.51-.52,0-1.02-.01-1.49-.01-.16,0-.31,0-.47,0,.09-.17.2-.33.31-.5.04-.06.08-.12.12-.18.14,0,.27,0,.41,0,.42,0,.86,0,1.31,0Z"/>
              <path className="cls-564" d="M402.79,421.69c-.03.07-.05.15-.08.22-.02.06-.04.12-.06.19-.45,0-.89,0-1.31,0-.14,0-.28,0-.41,0,.04-.06.08-.12.13-.18.05-.07.1-.14.15-.21.13,0,.25,0,.38,0,.39,0,.8-.02,1.21-.02Z"/>
              <path className="cls-530" d="M402.87,421.46c-.03.07-.06.15-.08.22-.41,0-.82.01-1.21.02-.13,0-.26,0-.38,0,.05-.07.1-.14.15-.21.12,0,.24,0,.37-.01.38-.01.76-.02,1.16-.03Z"/>
              <path className="cls-180" d="M409.46,431.28c.13.15.25.29.35.43-.11,0-.22,0-.33,0-.46,0-.91,0-1.36,0-.1-.16-.23-.32-.35-.48.41.03.84.06,1.29.06.13,0,.27,0,.4,0Z"/>
              <path className="cls-475" d="M408.56,430.15c.17.22.35.44.51.65.13.17.26.32.39.47-.13,0-.27.01-.4,0-.45,0-.87-.03-1.29-.06-.12-.17-.27-.33-.4-.51-.15-.22-.34-.45-.52-.66.34.06.71.11,1.14.14.19,0,.38-.02.57-.04Z"/>
              <path className="cls-308" d="M407.53,428.72c.18.25.38.51.55.77.14.22.32.45.48.67-.19.02-.38.03-.57.04-.43-.03-.8-.08-1.14-.14-.17-.21-.38-.44-.57-.64-.23-.24-.5-.48-.75-.72.31.01.66.03,1.14.05.27-.01.56-.02.86-.03Z"/>
              <path className="cls-544" d="M406.8,427.59c.07.12.15.25.22.37.14.25.33.5.51.76-.3,0-.6.01-.86.03-.47-.03-.83-.04-1.14-.05-.25-.24-.53-.47-.76-.7-.13-.12-.26-.24-.38-.35.38-.01.83-.03,1.37-.03.33,0,.67-.02,1.04-.02Z"/>
              <path className="cls-512" d="M406.52,426.93c.02.1.06.21.11.3.04.12.11.23.17.36-.36,0-.71.01-1.04.02-.54,0-.99.02-1.37.03-.12-.11-.24-.23-.35-.33-.11-.08-.2-.18-.29-.28.46-.02.98-.04,1.55-.06.38,0,.79-.02,1.22-.04Z"/>
              <path className="cls-467" d="M406.45,426.39c.01.07.03.14.04.22,0,.11.01.22.04.33-.43.01-.84.03-1.22.04-.57.01-1.09.03-1.55.06-.1-.1-.16-.22-.24-.34-.06-.07-.11-.14-.17-.22.52-.03,1.09-.06,1.69-.07.45,0,.92-.01,1.41-.02Z"/>
              <path className="cls-305" d="M406.34,425.94c.01.08.02.15.04.23.02.07.04.15.06.22-.49,0-.97,0-1.41.02-.6,0-1.17.04-1.69.07-.06-.07-.1-.15-.16-.22-.07-.08-.13-.15-.19-.23.58-.03,1.19-.06,1.82-.07.49,0,1.01-.01,1.54-.01Z"/>
              <path className="cls-451" d="M406.31,425.44c0,.09,0,.18.01.26,0,.08.01.15.02.23-.53,0-1.04,0-1.54.01-.63,0-1.25.03-1.82.07-.06-.08-.12-.16-.17-.24-.06-.09-.12-.18-.17-.28.61-.02,1.27-.05,1.95-.05.55,0,1.13,0,1.72,0Z"/>
              <path className="cls-474" d="M406.28,425.09s.01.06.01.08c.01.09.01.18.02.27-.59,0-1.16,0-1.72,0-.68,0-1.33.03-1.95.05-.05-.1-.1-.19-.15-.29-.01-.03-.03-.06-.04-.09.63-.01,1.3-.02,2.01-.02.59,0,1.19,0,1.82,0Z"/>
              <path className="cls-474" d="M406.18,424.69c.03.1.06.21.08.31,0,.03.01.06.02.08-.62,0-1.23,0-1.82,0-.71,0-1.38.01-2.01.02-.01-.03-.03-.06-.05-.09-.03-.1-.04-.21-.07-.31.64,0,1.31,0,1.99-.01.59,0,1.21,0,1.85-.01Z"/>
              <path className="cls-263" d="M406.05,424.14c.02.08.03.15.05.23.02.11.05.21.08.32-.64,0-1.26,0-1.85.01-.68,0-1.35,0-1.99.01-.02-.11-.02-.21-.03-.32,0-.08,0-.15,0-.23.62,0,1.26,0,1.89,0,.6,0,1.22-.01,1.86-.02Z"/>
              <path className="cls-23" d="M405.96,423.59c.01.11.03.21.05.32.01.08.03.16.05.23-.64,0-1.26,0-1.86.02-.62,0-1.27,0-1.89,0,0-.08,0-.15,0-.23,0-.11.02-.21.02-.32.58,0,1.18,0,1.75,0,.6,0,1.23-.02,1.87-.02Z"/>
              <path className="cls-432" d="M405.91,422.76c0,.17.01.34.02.51,0,.11.02.22.03.32-.64,0-1.27.01-1.87.02-.58,0-1.18,0-1.75,0,0-.11.03-.21.03-.32.01-.17.04-.34.08-.51.52,0,1.05,0,1.56,0,.61-.01,1.25-.02,1.9-.03Z"/>
              <path className="cls-617" d="M405.91,422.04c0,.06,0,.13,0,.19,0,.18,0,.35,0,.53-.66,0-1.29.02-1.9.03-.51,0-1.04,0-1.56,0,.04-.17.09-.34.14-.51.02-.06.04-.12.06-.18.45,0,.91,0,1.37,0,.61-.02,1.25-.03,1.9-.04Z"/>
              <path className="cls-366" d="M405.95,421.61c0,.08-.02.16-.02.23,0,.07-.01.13-.01.19-.65.01-1.28.03-1.9.04-.46.01-.92.01-1.37,0,.02-.06.04-.12.06-.19.03-.07.05-.15.08-.22.41,0,.83-.01,1.26-.02.62-.02,1.25-.03,1.9-.05Z"/>
              <path className="cls-369" d="M405.98,421.38c-.01.08-.03.16-.03.24-.65.02-1.28.03-1.9.05-.43.01-.85.02-1.26.02.03-.07.06-.15.08-.22.39-.01.8-.02,1.21-.03.62-.02,1.25-.03,1.9-.05Z"/>
              <path className="cls-413" d="M410.31,431.22c.07.16.14.33.18.48-.12,0-.24,0-.36,0-.11,0-.22,0-.33,0-.1-.14-.22-.27-.35-.43.13,0,.27-.02.41-.02.15,0,.29-.02.45-.03Z"/>
              <path className="cls-405" d="M409.84,430.04c.07.22.16.44.24.66.07.18.16.35.22.51-.15,0-.3.02-.45.03-.14,0-.27.02-.41.02-.13-.15-.26-.3-.39-.47-.16-.21-.34-.43-.51-.65.19-.02.39-.04.61-.05.23-.02.45-.04.68-.06Z"/>
              <path className="cls-443" d="M409.55,428.68c.06.22.13.43.16.65,0,.02.01.04.01.06,0,.21.06.43.13.65-.23.02-.45.04-.68.06-.21.02-.41.04-.61.05-.17-.22-.34-.45-.48-.67-.17-.26-.36-.52-.55-.77.3,0,.62-.01.94-.02.34,0,.7-.01,1.08-.02Z"/>
              <path className="cls-488" d="M409.3,427.57c.01.13.03.25.05.38.04.25.13.49.2.73-.38,0-.74.01-1.08.02-.32,0-.64.01-.94.02-.18-.25-.36-.5-.51-.76-.07-.13-.16-.25-.22-.37.36,0,.75,0,1.15-.01.43,0,.88,0,1.34,0Z"/>
              <path className="cls-160" d="M409.4,426.89c-.05.1-.1.2-.1.3,0,0,0,0,0,0-.02.12-.02.25,0,.37-.47,0-.92,0-1.34,0-.4,0-.79,0-1.15.01-.07-.12-.13-.24-.17-.36-.05-.1-.08-.2-.11-.3.43-.01.88-.03,1.34-.03.5,0,1.01,0,1.54,0Z"/>
              <path className="cls-381" d="M409.71,426.37c-.03.07-.07.14-.11.21-.07.1-.14.2-.19.31-.53,0-1.04,0-1.54,0-.47,0-.92.02-1.34.03-.02-.1-.03-.21-.04-.33-.01-.07-.03-.14-.04-.22.49,0,1.01,0,1.53,0,.56,0,1.14,0,1.73,0Z"/>
              <path className="cls-282" d="M409.83,425.93c-.03.08-.06.15-.06.22,0,.07-.03.15-.06.22-.59,0-1.17,0-1.73,0-.52,0-1.04,0-1.53,0-.01-.07-.03-.15-.06-.22-.02-.08-.03-.15-.04-.23.53,0,1.08,0,1.64,0,.6,0,1.22,0,1.84,0Z"/>
              <path className="cls-248" d="M410.11,425.44c-.05.09-.11.18-.16.26-.04.08-.09.15-.12.23-.62,0-1.24,0-1.84,0-.57,0-1.11,0-1.64,0-.01-.08-.01-.15-.02-.23-.01-.09,0-.18-.01-.26.59,0,1.19,0,1.81,0,.65,0,1.32,0,1.99,0Z"/>
              <path className="cls-520" d="M410.27,425.08s-.02.06-.02.09c-.03.09-.08.18-.13.27-.67,0-1.34,0-1.99,0-.61,0-1.22,0-1.81,0,0-.09,0-.18-.02-.27,0-.03-.01-.06-.01-.08.62,0,1.26,0,1.9,0,.69,0,1.38,0,2.08,0Z"/>
              <path className="cls-520" d="M410.27,424.69c.01.1.02.21.02.31,0,.03,0,.06-.02.09-.7,0-1.4,0-2.08,0-.64,0-1.28,0-1.9,0,0-.03-.01-.06-.02-.08-.02-.1-.05-.21-.08-.31.64,0,1.29,0,1.95,0,.7,0,1.42,0,2.14,0Z"/>
              <path className="cls-256" d="M410.18,424.14c.01.08.03.16.04.23.01.11.03.21.04.32-.72,0-1.44,0-2.14,0-.66,0-1.31,0-1.95,0-.03-.1-.06-.21-.08-.32-.02-.08-.03-.15-.05-.23.64,0,1.3,0,1.97,0,.71,0,1.44,0,2.17,0Z"/>
              <path className="cls-23" d="M410.12,423.58c0,.11.02.22.03.32,0,.08.02.16.04.24-.73,0-1.45,0-2.17,0-.67,0-1.33,0-1.97,0-.02-.08-.03-.16-.05-.23-.02-.1-.04-.21-.05-.32.64,0,1.3,0,1.98-.01.72,0,1.45,0,2.19,0Z"/>
              <path className="cls-23" d="M410.14,422.72c0,.18,0,.35-.02.53-.01.11-.01.22,0,.33-.74,0-1.47,0-2.19,0-.67,0-1.33,0-1.98.01-.01-.11-.03-.21-.03-.32,0-.17-.01-.34-.02-.51.66,0,1.33-.01,2.01-.02.72,0,1.47-.01,2.22-.02Z"/>
              <path className="cls-341" d="M410.12,421.97c0,.07,0,.14,0,.2,0,.19.01.37.02.55-.75,0-1.5.01-2.22.02-.68,0-1.35.01-2.01.02,0-.17,0-.35,0-.53,0-.06,0-.13,0-.19.65-.01,1.32-.02,2-.03.72-.01,1.46-.02,2.21-.03Z"/>
              <path className="cls-306" d="M410.14,421.52c0,.08-.01.17-.02.25,0,.07,0,.14,0,.2-.75.01-1.49.02-2.21.03-.68.01-1.35.02-2,.03,0-.06,0-.13.01-.19,0-.08.02-.15.02-.23.65-.02,1.31-.03,1.99-.04.72-.02,1.46-.03,2.2-.05Z"/>
              <path className="cls-95" d="M410.17,421.27c-.02.08-.03.17-.03.25-.74.02-1.48.03-2.2.05-.68.01-1.34.03-1.99.04,0-.08.02-.16.03-.24.65-.02,1.31-.03,1.99-.05.72-.02,1.45-.04,2.2-.05Z"/>
              <path className="cls-133" d="M411.29,431.18c0,.18-.02.35-.04.52-.13,0-.26,0-.39,0-.12,0-.24,0-.36,0-.04-.15-.12-.32-.18-.48.15,0,.31-.02.47-.02.18,0,.34-.01.51-.02Z"/>
              <path className="cls-516" d="M411.45,429.95c-.06.22-.08.46-.12.68-.03.18-.04.36-.04.54-.17,0-.33.02-.51.02-.16,0-.32.01-.47.02-.07-.16-.16-.34-.22-.51-.08-.22-.18-.44-.24-.66.23-.02.47-.04.73-.05.29-.01.58-.03.87-.05Z"/>
              <path className="cls-449" d="M412.05,428.63c-.08.21-.17.42-.29.62-.01.02-.02.04-.03.06-.15.21-.23.43-.29.65-.3.02-.59.04-.87.05-.26.01-.5.03-.73.05-.07-.22-.12-.44-.13-.65,0-.02-.01-.04-.01-.06-.03-.22-.1-.43-.16-.65.38,0,.77-.01,1.16-.02.44-.01.88-.02,1.34-.03Z"/>
              <path className="cls-274" d="M412.49,427.55c-.06.13-.1.26-.16.38-.1.23-.18.47-.27.7-.46,0-.91.01-1.34.03-.4.01-.79.02-1.16.02-.07-.24-.16-.48-.2-.73-.02-.13-.04-.26-.05-.38.47,0,.96,0,1.46,0,.56,0,1.13,0,1.73,0Z"/>
              <path className="cls-405" d="M412.98,426.88c-.11.1-.22.19-.29.29t0,0c-.09.12-.15.25-.21.38-.59,0-1.17,0-1.73,0-.51,0-1,0-1.46,0-.01-.13-.01-.25,0-.37,0,0,0,0,0,0,0-.1.05-.2.1-.3.53,0,1.08,0,1.64,0,.62,0,1.27,0,1.94,0Z"/>
              <path className="cls-283" d="M413.54,426.37c-.06.07-.14.14-.21.21-.11.1-.24.2-.35.3-.66,0-1.32,0-1.94,0-.57,0-1.11,0-1.64,0,.05-.1.13-.2.19-.31.04-.07.08-.14.11-.21.59,0,1.2,0,1.81,0,.67,0,1.35,0,2.02,0Z"/>
              <path className="cls-466" d="M413.87,425.93c-.06.08-.13.15-.16.22-.03.07-.09.14-.16.21-.68,0-1.35,0-2.02,0-.61,0-1.22,0-1.81,0,.03-.07.05-.14.06-.22,0-.07.03-.15.06-.22.62,0,1.26,0,1.9,0,.71,0,1.42,0,2.14,0Z"/>
              <path className="cls-227" d="M414.35,425.44c-.09.09-.19.18-.27.26-.07.08-.15.15-.21.23-.71,0-1.43,0-2.14,0-.64,0-1.28,0-1.9,0,.03-.08.08-.15.12-.23.05-.09.11-.17.16-.26.67,0,1.35,0,2.03,0,.74,0,1.48,0,2.21,0Z"/>
              <path className="cls-451" d="M414.63,425.08s-.03.06-.05.09c-.05.09-.15.18-.24.27-.73,0-1.46,0-2.21,0-.68,0-1.36,0-2.03,0,.05-.09.1-.18.13-.27,0-.03.02-.06.02-.09.7,0,1.4,0,2.1,0,.77,0,1.52,0,2.26,0Z"/>
              <path className="cls-451" d="M414.73,424.7c-.01.1-.03.19-.06.29-.01.03-.02.06-.04.09-.74,0-1.5,0-2.26,0-.7,0-1.4,0-2.1,0,0-.03.01-.06.02-.09,0-.1,0-.2-.02-.31.72,0,1.44,0,2.15,0,.78,0,1.56,0,2.31.01Z"/>
              <path className="cls-533" d="M414.77,424.17c0,.07,0,.15-.01.22-.01.11-.02.21-.03.3-.76,0-1.53-.01-2.31-.01-.71,0-1.43,0-2.15,0-.01-.1-.03-.21-.04-.32-.01-.08-.03-.15-.04-.23.73,0,1.47,0,2.2,0,.8,0,1.6.02,2.39.03Z"/>
              <path className="cls-23" d="M414.81,423.59c-.01.12-.02.24-.03.35,0,.08,0,.16-.01.23-.79-.02-1.59-.04-2.39-.03-.73,0-1.47,0-2.2,0-.01-.08-.03-.16-.04-.24-.01-.11-.02-.21-.03-.32.74,0,1.48,0,2.23,0,.82,0,1.65,0,2.46.02Z"/>
              <path className="cls-23" d="M414.92,422.69c0,.18,0,.36-.05.54-.03.11-.04.23-.06.36-.82-.01-1.64-.02-2.46-.02-.75,0-1.49,0-2.23,0,0-.11,0-.22,0-.33.02-.17.02-.35.02-.53.75,0,1.52-.01,2.28-.02.83,0,1.67,0,2.5-.01Z"/>
              <path className="cls-397" d="M414.93,421.91c0,.07,0,.14,0,.21-.01.19,0,.38,0,.57-.83,0-1.67,0-2.5.01-.76,0-1.52.01-2.28.02,0-.18-.01-.36-.02-.55,0-.07,0-.13,0-.2.75-.01,1.5-.02,2.27-.04.84-.01,1.69-.02,2.54-.02Z"/>
              <path className="cls-327" d="M414.95,421.43c0,.09,0,.18-.01.27,0,.07,0,.15,0,.22-.86,0-1.71.01-2.54.02-.76.01-1.52.02-2.27.04,0-.07,0-.14,0-.2,0-.08,0-.16.02-.25.74-.02,1.5-.03,2.26-.05.84-.02,1.69-.03,2.55-.05Z"/>
              <path className="cls-180" d="M414.99,421.16c-.02.09-.03.18-.04.27-.86.02-1.71.03-2.55.05-.76.02-1.52.03-2.26.05,0-.08.02-.17.03-.25.75-.02,1.5-.04,2.27-.05.84-.02,1.69-.04,2.55-.06Z"/>
              <path className="cls-154" d="M412.21,431.13c-.1.19-.18.38-.26.57-.1,0-.2,0-.3,0-.13,0-.26,0-.4,0,.03-.17.03-.34.04-.52.17,0,.33-.02.51-.03.14,0,.27-.01.41-.02Z"/>
              <path className="cls-552" d="M413.09,429.86c-.2.22-.38.46-.54.69-.13.19-.23.39-.33.58-.14,0-.27.01-.41.02-.18,0-.35.02-.51.03,0-.18.02-.36.04-.54.03-.23.05-.46.12-.68.3-.02.6-.04.91-.05.24-.01.48-.03.73-.04Z"/>
              <path className="cls-458" d="M414.6,428.6c-.26.22-.52.42-.79.62-.28.2-.52.41-.72.64-.25.01-.49.03-.73.04-.31.02-.61.03-.91.05.06-.22.14-.45.29-.65.01-.02.02-.04.03-.06.12-.2.2-.41.29-.62.46,0,.93-.01,1.41-.02.37,0,.75,0,1.13,0Z"/>
              <path className="cls-236" d="M415.77,427.56c-.13.13-.27.26-.41.39-.25.22-.5.44-.76.66-.38,0-.76,0-1.13,0-.48,0-.95,0-1.41.02.09-.23.17-.47.27-.7.06-.13.1-.25.16-.38.59,0,1.2,0,1.82,0,.48,0,.97,0,1.46.01Z"/>
              <path className="cls-134" d="M416.55,426.87c-.12.1-.24.19-.36.29-.15.13-.29.26-.42.4-.5,0-.99,0-1.46-.01-.62,0-1.23,0-1.82,0,.06-.13.12-.25.21-.38t0,0c.07-.1.18-.2.29-.29.66,0,1.34,0,2.01,0,.51,0,1.03,0,1.56,0Z"/>
              <path className="cls-496" d="M417.13,426.37c-.07.07-.16.14-.23.21-.11.1-.24.2-.35.3-.52,0-1.04,0-1.56,0-.67,0-1.34,0-2.01,0,.11-.1.24-.19.35-.3.07-.07.15-.14.21-.21.68,0,1.36,0,2.04,0,.52,0,1.04,0,1.55,0Z"/>
              <path className="cls-1" d="M417.56,425.93c-.07.08-.15.15-.21.22-.06.07-.14.14-.21.21-.51,0-1.03,0-1.55,0-.68,0-1.36,0-2.04,0,.06-.07.13-.14.16-.21.03-.07.1-.15.16-.22.71,0,1.42,0,2.12,0,.53,0,1.06,0,1.58,0Z"/>
              <path className="cls-368" d="M418.04,425.43c-.08.09-.18.18-.25.27-.07.08-.15.15-.23.23-.52,0-1.05,0-1.58,0-.69,0-1.4,0-2.12,0,.06-.08.15-.15.21-.23.08-.09.18-.18.27-.26.73,0,1.44,0,2.13,0,.53,0,1.05,0,1.55,0Z"/>
              <path className="cls-595" d="M418.34,425.07s-.04.06-.06.09c-.07.1-.15.19-.24.28-.5,0-1.02,0-1.55,0-.69,0-1.41,0-2.13,0,.09-.09.18-.18.24-.27.02-.03.03-.06.05-.09.74,0,1.46,0,2.16,0,.53,0,1.05,0,1.55,0Z"/>
              <path className="cls-595" d="M418.55,424.7c-.05.1-.09.17-.15.27-.02.03-.04.06-.06.09-.5,0-1.01,0-1.55,0-.7,0-1.42,0-2.16,0,.01-.03.03-.06.04-.09.03-.1.05-.2.06-.29.76,0,1.5.01,2.22.02.55,0,1.09,0,1.6,0Z"/>
              <path className="cls-437" d="M418.78,424.21c-.03.07-.06.14-.1.21-.05.11-.09.19-.14.28-.52,0-1.05.01-1.6,0-.72,0-1.46,0-2.22-.02.01-.1.02-.2.03-.3,0-.08,0-.15.01-.22.79.02,1.56.04,2.32.05.58,0,1.14,0,1.69-.01Z"/>
              <path className="cls-23" d="M419,423.6c-.04.13-.07.28-.12.38-.03.08-.06.15-.09.22-.55.02-1.11.02-1.69.01-.75,0-1.53-.03-2.32-.05,0-.07,0-.15.01-.23.01-.11.02-.22.03-.35.82.01,1.62.02,2.41.02.6,0,1.2,0,1.78-.01Z"/>
              <path className="cls-23" d="M419.27,422.66c-.05.19-.08.36-.16.54-.05.12-.08.27-.12.4-.58.01-1.17.02-1.78.01-.79,0-1.59-.01-2.41-.02.01-.12.02-.24.06-.36.05-.18.05-.36.05-.54.83,0,1.66,0,2.49,0,.63,0,1.25-.01,1.87-.02Z"/>
              <path className="cls-140" d="M419.44,421.86c-.01.08-.03.15-.04.23-.05.2-.08.39-.13.57-.61.01-1.24.02-1.87.02-.82,0-1.65,0-2.49,0,0-.18-.01-.37,0-.57,0-.07,0-.14,0-.21.86,0,1.71,0,2.56-.02.65,0,1.3-.02,1.95-.03Z"/>
              <path className="cls-132" d="M419.52,421.34c-.02.09-.03.19-.04.29-.01.08-.02.16-.04.23-.65.02-1.3.03-1.95.03-.85,0-1.71.01-2.56.02,0-.07,0-.15,0-.22,0-.09,0-.18.01-.27.86-.02,1.72-.03,2.58-.05.66-.01,1.33-.02,1.99-.04Z"/>
              <path className="cls-375" d="M419.57,421.05c-.02.09-.03.19-.05.29-.66.01-1.33.03-1.99.04-.86.02-1.72.03-2.58.05,0-.09.02-.18.04-.27.86-.02,1.72-.04,2.59-.06.66-.01,1.33-.03,2-.04Z"/>
              <path className="cls-401" d="M415.23,431.14c-.1.19-.19.37-.27.56-.91,0-1.81,0-2.71,0-.1,0-.2,0-.31,0,.09-.18.17-.38.26-.57.14,0,.27-.01.42-.01.85,0,1.72.01,2.6.02Z"/>
              <path className="cls-114" d="M416.08,429.89c-.2.22-.37.45-.52.68-.12.19-.23.38-.33.56-.88,0-1.75-.02-2.6-.02-.15,0-.29,0-.42.01.1-.19.2-.39.33-.58.16-.24.34-.47.54-.69.25-.01.5-.02.76-.03.73.01,1.48.04,2.24.06Z"/>
              <path className="cls-447" d="M417.5,428.61c-.24.22-.49.43-.75.64-.25.2-.47.42-.67.64-.76-.02-1.52-.05-2.24-.06-.26,0-.51.02-.76.03.2-.23.44-.44.72-.64.27-.2.53-.41.79-.62.38,0,.78,0,1.18-.01.56.01,1.14.02,1.72.02Z"/>
              <path className="cls-378" d="M418.59,427.56c-.12.13-.25.26-.38.38-.23.23-.48.45-.72.67-.58,0-1.16,0-1.72-.02-.4,0-.79,0-1.18.01.26-.22.51-.44.76-.66.14-.12.27-.25.41-.39.5,0,1.01,0,1.51,0,.43,0,.87,0,1.31,0Z"/>
              <path className="cls-333" d="M419.22,426.86c-.08.1-.17.2-.26.31-.12.14-.25.27-.37.4-.44,0-.88,0-1.31,0-.51,0-1.02,0-1.51,0,.13-.13.27-.27.42-.4.11-.1.24-.19.36-.29.52,0,1.05,0,1.57,0,.37,0,.74,0,1.1-.02Z"/>
              <path className="cls-479" d="M419.65,426.33c-.05.07-.11.14-.17.21-.08.11-.18.21-.26.31-.37,0-.73.02-1.1.02-.53,0-1.05,0-1.57,0,.12-.1.24-.19.35-.3.07-.07.16-.14.23-.21.51,0,1.02,0,1.52,0,.34,0,.67-.02.99-.03Z"/>
              <path className="cls-331" d="M419.96,425.89c-.05.08-.1.15-.15.23-.05.07-.11.14-.16.22-.33.02-.66.03-.99.03-.5,0-1.01,0-1.52,0,.07-.07.15-.14.21-.21.06-.07.14-.15.21-.22.52,0,1.02,0,1.51,0,.31,0,.6-.02.89-.04Z"/>
              <path className="cls-600" d="M420.3,425.39c-.06.09-.12.18-.18.27-.05.08-.11.16-.16.23-.29.02-.59.04-.89.04-.49,0-.99,0-1.51,0,.07-.08.16-.15.23-.23.08-.09.17-.18.25-.27.5,0,.99,0,1.45,0,.28,0,.55-.02.81-.03Z"/>
              <path className="cls-588" d="M420.52,425.04s-.03.06-.05.08c-.05.09-.11.18-.17.27-.26.01-.53.03-.81.03-.47,0-.95,0-1.45,0,.08-.09.17-.18.24-.28.02-.03.04-.06.06-.09.5,0,.97,0,1.43-.01.26,0,.51,0,.75-.02Z"/>
              <path className="cls-607" d="M420.74,424.57c-.06.13-.11.25-.17.38-.02.03-.03.06-.05.08-.24,0-.5.01-.75.02-.45,0-.93,0-1.43.01.02-.03.04-.06.06-.09.06-.1.1-.18.15-.27.52,0,1.01-.02,1.49-.05.25-.01.48-.05.7-.08Z"/>
              <path className="cls-507" d="M421.03,423.95c-.04.08-.08.17-.12.26-.06.12-.12.24-.17.36-.22.04-.45.07-.7.08-.48.02-.97.04-1.49.05.05-.1.09-.18.14-.28.04-.08.07-.14.1-.21.55-.02,1.08-.05,1.59-.1.24-.02.45-.09.65-.15Z"/>
              <path className="cls-352" d="M421.34,423.36c-.06.11-.13.23-.19.35-.04.08-.08.16-.13.25-.2.07-.41.13-.65.15-.51.05-1.04.09-1.59.1.03-.07.06-.14.09-.22.05-.11.08-.26.12-.38.58-.01,1.14-.04,1.68-.07.24-.04.46-.11.66-.17Z"/>
              <path className="cls-104" d="M421.86,422.48c-.11.18-.21.36-.32.53-.07.11-.14.23-.2.34-.2.07-.42.13-.66.17-.54.04-1.11.06-1.68.07.04-.13.07-.28.12-.4.07-.18.11-.36.16-.54.61-.01,1.22-.03,1.81-.05.3-.04.54-.09.79-.14Z"/>
              <path className="cls-524" d="M422.32,421.71c-.04.07-.08.14-.12.21-.12.19-.22.38-.33.56-.24.05-.49.1-.79.14-.59.02-1.19.04-1.81.05.05-.19.07-.37.13-.57.02-.07.03-.15.04-.23.65-.02,1.29-.04,1.92-.07.35-.02.66-.05.96-.09Z"/>
              <path className="cls-519" d="M422.6,421.24c-.05.09-.1.17-.15.26-.04.07-.08.14-.13.21-.3.04-.61.07-.96.09-.63.03-1.27.05-1.92.07.01-.08.02-.16.04-.23.02-.09.02-.19.04-.29.66-.01,1.33-.03,1.98-.05.38-.01.74-.03,1.1-.05Z"/>
              <path className="cls-590" d="M422.76,420.98c-.05.09-.1.17-.16.26-.36.02-.72.04-1.1.05-.65.02-1.32.03-1.98.05.02-.09.03-.19.05-.29.67-.01,1.33-.03,2-.04.4,0,.79-.02,1.19-.03Z"/>
              <path className="cls-428" d="M420.38,431.18c-.02.17-.04.34-.06.51-.87,0-1.76,0-2.65,0-.9,0-1.8,0-2.71,0,.08-.18.17-.37.27-.56.88,0,1.75.02,2.6.02.85,0,1.71.01,2.55.03Z"/>
              <path className="cls-216" d="M420.59,430.01c-.05.21-.09.43-.13.65-.03.17-.05.35-.08.52-.84-.01-1.7-.02-2.55-.03-.85,0-1.73-.01-2.6-.02.1-.19.21-.38.33-.56.15-.23.33-.46.52-.68.76.02,1.52.05,2.26.06.74.02,1.49.04,2.24.06Z"/>
              <path className="cls-252" d="M420.97,428.66c-.07.24-.13.48-.2.72-.07.21-.13.42-.18.64-.74-.02-1.5-.05-2.24-.06-.74-.02-1.5-.04-2.26-.06.2-.22.42-.44.67-.64.25-.21.5-.42.75-.64.58,0,1.17.01,1.74.02.57.01,1.15.02,1.73.03Z"/>
              <path className="cls-276" d="M421.26,427.56c-.04.13-.07.26-.1.38-.07.24-.12.48-.19.72-.57,0-1.15-.01-1.73-.03-.57-.01-1.16-.02-1.74-.02.24-.22.49-.44.72-.67.13-.12.25-.25.38-.38.44,0,.89,0,1.33,0s.89,0,1.34,0Z"/>
              <path className="cls-285" d="M421.45,426.82c-.03.12-.06.24-.08.35-.04.13-.07.26-.11.39-.45,0-.9,0-1.34,0s-.88,0-1.33,0c.12-.13.25-.26.37-.4.08-.1.17-.2.26-.31.37,0,.73-.02,1.1-.02.37,0,.75-.01,1.12-.02Z"/>
              <path className="cls-590" d="M421.59,426.25c-.02.07-.03.15-.05.22-.03.11-.06.23-.09.35-.38,0-.75.01-1.12.02-.37,0-.74.01-1.1.02.08-.1.18-.21.26-.31.06-.07.11-.14.17-.21.33-.02.65-.04.97-.05.19,0,.38-.01.58-.02.13,0,.26,0,.39-.01Z"/>
              <path className="cls-480" d="M421.69,425.8c-.02.08-.04.15-.05.23-.02.07-.03.14-.05.22-.13,0-.26.01-.39.01-.19,0-.39.01-.58.02-.32.01-.64.03-.97.05.05-.07.11-.14.16-.22.05-.07.1-.15.15-.23.29-.02.57-.04.86-.05.17,0,.35-.01.52-.02.12,0,.23,0,.35-.01Z"/>
              <path className="cls-571" d="M421.82,425.32c-.02.08-.05.17-.07.25-.02.07-.04.15-.06.23-.12,0-.23.01-.35.01-.17,0-.35.01-.52.02-.29.01-.57.03-.86.05.05-.08.11-.15.16-.23.06-.09.12-.18.18-.27.26-.01.52-.03.76-.04.25,0,.51-.02.76-.03Z"/>
              <path className="cls-532" d="M421.9,425s0,.05,0,.08c-.02.08-.04.16-.07.25-.25.01-.51.02-.76.03-.24,0-.5.02-.76.04.06-.09.12-.18.17-.27.02-.03.03-.06.05-.08.24,0,.48-.01.7-.02.13,0,.27,0,.4-.01.09,0,.18,0,.28,0Z"/>
              <path className="cls-183" d="M422.01,424.39c-.03.17-.07.35-.1.53,0,.03,0,.05,0,.08-.1,0-.19,0-.28,0-.13,0-.26,0-.4.01-.22,0-.46.01-.7.02.02-.03.03-.06.05-.08.05-.13.11-.25.17-.38.22-.04.43-.08.64-.1.13-.01.25-.03.37-.04.09-.01.17-.02.26-.03Z"/>
              <path className="cls-393" d="M422.24,423.61c-.03.09-.08.21-.11.31-.04.15-.09.31-.12.47-.09.01-.17.02-.26.03-.12.01-.24.03-.37.04-.21.02-.42.06-.64.1.06-.13.11-.24.17-.36.04-.09.08-.17.12-.26.2-.07.39-.14.59-.18.19-.04.41-.1.62-.16Z"/>
              <path className="cls-317" d="M422.57,422.98c-.08.11-.14.23-.2.35-.04.08-.09.18-.13.28-.21.06-.43.12-.62.16-.2.04-.39.11-.59.18.04-.08.08-.17.13-.25.06-.11.12-.24.19-.35.2-.07.4-.14.6-.19.12-.03.24-.07.38-.11.09-.02.17-.05.25-.08Z"/>
              <path className="cls-609" d="M423.36,422.18c-.19.16-.37.33-.53.48-.1.1-.18.2-.26.31-.08.03-.16.05-.25.08-.14.04-.26.08-.38.11-.2.05-.4.12-.6.19.06-.11.13-.23.2-.34.11-.17.21-.35.32-.53.24-.05.48-.1.74-.15.16-.03.3-.06.46-.09.1-.02.2-.04.29-.06Z"/>
              <path className="cls-203" d="M424.22,421.51c-.08.06-.17.11-.25.17-.21.17-.43.33-.62.5-.09.02-.19.04-.29.06-.16.03-.3.06-.46.09-.27.04-.5.1-.74.15.11-.18.22-.37.33-.56.04-.07.08-.14.12-.21.3-.04.6-.08.94-.1.32-.03.64-.06.96-.1Z"/>
              <path className="cls-110" d="M424.8,421.14c-.11.07-.21.13-.32.2-.09.06-.17.11-.26.17-.32.03-.64.07-.96.1-.34.02-.64.06-.94.1.04-.07.08-.14.13-.21.05-.08.1-.17.15-.26.36-.02.72-.04,1.09-.06.37-.02.73-.03,1.1-.05Z"/>
              <path className="cls-562" d="M425.12,420.94c-.11.07-.22.13-.33.2-.37.02-.73.04-1.1.05-.37.01-.73.04-1.09.06.05-.08.1-.17.16-.26.4,0,.79-.02,1.18-.03.39,0,.79-.02,1.18-.02Z"/>
              <path className="cls-288" d="M423.82,431.22c0,.17.02.33.03.49-.33,0-.66,0-.99,0-.83,0-1.68,0-2.55,0,.02-.17.04-.34.06-.51.84.01,1.67.02,2.45.03.34,0,.67,0,.99,0Z"/>
              <path className="cls-240" d="M423.76,430.09c.01.21.03.42.04.63,0,.17.02.34.03.5-.33,0-.66,0-.99,0-.78,0-1.61-.02-2.45-.03.02-.17.05-.35.08-.52.04-.22.08-.43.13-.65.74.02,1.48.05,2.16.07.34,0,.67,0,1.01,0Z"/>
              <path className="cls-462" d="M423.68,428.7c.01.25.03.5.04.75.01.21.03.42.04.64-.33,0-.67,0-1.01,0-.69-.02-1.42-.04-2.16-.07.05-.21.11-.43.18-.64.07-.24.13-.48.2-.72.57,0,1.14.01,1.69.03.34,0,.68,0,1.02,0Z"/>
              <path className="cls-303" d="M423.65,427.56c0,.13,0,.26,0,.39,0,.25.01.5.03.75-.34,0-.68,0-1.02,0-.55-.01-1.12-.02-1.69-.03.07-.24.12-.48.19-.72.04-.13.07-.26.1-.38.45,0,.9,0,1.34,0,.35,0,.7,0,1.05,0Z"/>
              <path className="cls-285" d="M423.58,426.81c.03.12.06.24.07.37,0,.13,0,.25,0,.38-.35,0-.7,0-1.05,0-.44,0-.89,0-1.34,0,.04-.13.07-.26.11-.39.02-.12.05-.24.08-.35.38,0,.75-.01,1.13,0,.33,0,.66,0,1,0Z"/>
              <path className="cls-492" d="M423.47,426.22c.01.08.03.16.04.23,0,.12.04.24.07.36-.34,0-.67,0-1,0-.38,0-.75,0-1.13,0,.03-.12.06-.23.09-.35.02-.07.03-.15.05-.22.32-.01.64-.03.98-.03.29,0,.59,0,.9,0Z"/>
              <path className="cls-176" d="M423.4,425.76c.02.08.03.16.03.23,0,.08.02.15.03.23-.3,0-.6,0-.9,0-.34,0-.66.02-.98.03.02-.07.03-.14.05-.22.02-.08.03-.15.05-.23.29-.02.58-.04.88-.04.27,0,.54,0,.83,0Z"/>
              <path className="cls-571" d="M423.32,425.29c.02.08.04.16.04.24,0,.07.02.15.04.23-.28,0-.56,0-.83,0-.3,0-.59.02-.88.04.02-.08.04-.15.06-.23.02-.08.05-.17.07-.25.25-.01.51-.02.76-.03.23,0,.48,0,.73,0Z"/>
              <path className="cls-597" d="M423.28,424.98s0,.05,0,.07c0,.08.02.15.04.23-.25,0-.5,0-.73,0-.25,0-.51.02-.76.03.02-.08.05-.16.07-.25,0-.03,0-.05,0-.08.22,0,.46-.01.7-.01.21,0,.44,0,.68,0Z"/>
              <path className="cls-550" d="M423.36,424.3c-.03.19-.06.4-.08.61,0,.02,0,.05,0,.07-.24,0-.46,0-.68,0-.24,0-.48,0-.7.01,0-.03,0-.05,0-.08.03-.18.07-.37.1-.53.21-.03.43-.06.66-.08.22,0,.45-.01.69-.01Z"/>
              <path className="cls-203" d="M423.59,423.42c-.04.1-.08.22-.11.34-.05.17-.09.35-.13.55-.24,0-.47,0-.69.01-.23.02-.45.05-.66.08.03-.17.08-.33.12-.47.03-.11.08-.22.11-.31.21-.06.42-.12.59-.14.24-.02.5-.04.76-.05Z"/>
              <path className="cls-508" d="M423.96,422.8c-.1.1-.19.2-.25.34-.04.08-.08.18-.11.28-.26,0-.52.02-.76.05-.17.03-.38.08-.59.14.03-.09.09-.19.13-.28.06-.13.12-.24.2-.35.21-.07.41-.13.6-.17.25-.01.52-.01.79-.02Z"/>
              <path className="cls-411" d="M424.94,422.04c-.24.16-.47.33-.64.48-.12.1-.24.18-.34.28-.27,0-.53,0-.79.02-.19.03-.39.1-.6.17.08-.11.16-.21.26-.31.15-.16.34-.32.53-.48.24-.05.48-.1.75-.14.27,0,.55,0,.83,0Z"/>
              <path className="cls-464" d="M426.04,421.4c-.11.05-.21.1-.31.16-.27.15-.55.32-.79.48-.28,0-.56,0-.83,0-.28.04-.51.09-.75.14.19-.16.4-.33.62-.5.08-.06.16-.11.25-.17.32-.03.64-.06.96-.08.28-.01.57-.03.86-.04Z"/>
              <path className="cls-190" d="M426.77,421.07c-.13.06-.27.12-.4.18-.11.05-.22.1-.33.15-.29,0-.57.02-.86.04-.32.02-.64.04-.96.08.08-.06.17-.11.26-.17.1-.07.21-.14.32-.2.37-.02.73-.03,1.1-.04.29,0,.58-.02.88-.02Z"/>
              <path className="cls-365" d="M427.17,420.89c-.13.06-.27.12-.4.18-.29,0-.59.01-.88.02-.36.01-.73.03-1.1.04.11-.07.22-.13.33-.2.39,0,.78-.02,1.17-.02.29,0,.59-.01.88-.02Z"/>
              <path className="cls-326" d="M427.91,431.25c0,.17,0,.33.01.5-1.03-.02-2.07-.03-3.1-.04-.31,0-.64,0-.96,0-.01-.16-.02-.33-.03-.49.33,0,.65,0,.97,0,1.05,0,2.08.02,3.12.03Z"/>
              <path className="cls-604" d="M427.97,430.12c-.01.21-.03.42-.04.63-.01.17-.02.34-.02.5-1.03-.01-2.07-.02-3.12-.03-.32,0-.64,0-.97,0,0-.17-.02-.33-.03-.5-.01-.21-.03-.42-.04-.63.33,0,.66,0,.99,0,1.07,0,2.15.02,3.23.03Z"/>
              <path className="cls-594" d="M428.03,428.73c-.02.25-.04.5-.04.75,0,.21,0,.42-.01.64-1.08-.01-2.15-.02-3.23-.03-.33,0-.66,0-.99,0-.01-.21-.03-.42-.04-.64-.01-.25-.03-.5-.04-.75.34,0,.67,0,1.01,0,1.12,0,2.23.02,3.34.03Z"/>
              <path className="cls-240" d="M428.18,427.59c-.01.13-.05.26-.06.39-.03.25-.06.49-.09.75-1.11-.01-2.22-.02-3.34-.03-.34,0-.67,0-1.01,0-.01-.25-.02-.5-.03-.75,0-.13,0-.26,0-.39.35,0,.7,0,1.05,0,1.16,0,2.33.01,3.48.02Z"/>
              <path className="cls-285" d="M428.04,426.84c.07.12.18.24.18.36,0,.13-.03.26-.04.39-1.16,0-2.32-.02-3.48-.02-.35,0-.7,0-1.05,0,0-.13,0-.26,0-.38,0-.12-.04-.25-.07-.37.34,0,.68,0,1.01,0,1.13,0,2.29.01,3.45.03Z"/>
              <path className="cls-489" d="M427.64,426.25c.04.08.11.16.14.23.06.12.19.24.26.36-1.17-.01-2.33-.02-3.45-.03-.34,0-.68,0-1.01,0-.03-.12-.07-.24-.07-.36,0-.08-.02-.16-.04-.23.3,0,.61,0,.93,0,1.05,0,2.13.01,3.25.03Z"/>
              <path className="cls-400" d="M427.46,425.79c.04.08.09.16.09.23,0,.07.05.15.09.23-1.11-.01-2.2-.02-3.25-.03-.31,0-.62,0-.93,0-.01-.08-.03-.15-.03-.23,0-.08-.02-.16-.03-.23.28,0,.58,0,.87,0,.99,0,2.06.02,3.18.03Z"/>
              <path className="cls-257" d="M427.11,425.31c.06.08.16.16.2.25.04.07.11.15.15.23-1.12-.02-2.2-.03-3.18-.03-.3,0-.59,0-.87,0-.02-.08-.04-.16-.04-.23,0-.08-.03-.16-.04-.24.25,0,.52,0,.79,0,.91,0,1.93.01,3,.03Z"/>
              <path className="cls-177" d="M426.93,425s.01.05.02.07c.02.08.11.16.16.24-1.08-.01-2.09-.03-3-.03-.27,0-.54,0-.79,0-.02-.08-.04-.15-.04-.23,0-.02,0-.05,0-.07.24,0,.49,0,.75,0,.87,0,1.85,0,2.91.02Z"/>
              <path className="cls-222" d="M427.05,424.36c-.05.18-.12.37-.13.56,0,.02,0,.05,0,.07-1.06,0-2.04-.01-2.91-.02-.26,0-.51,0-.75,0,0-.02,0-.05,0-.07.01-.21.04-.42.08-.61.24,0,.49,0,.76,0,.89,0,1.88.03,2.94.06Z"/>
              <path className="cls-428" d="M427.43,423.52c-.05.1-.11.21-.16.33-.07.16-.16.34-.22.51-1.06-.03-2.05-.06-2.94-.06-.27,0-.52,0-.76,0,.03-.19.08-.38.13-.55.03-.12.07-.23.11-.34.26,0,.54-.01.82-.01.93,0,1.94.05,3.02.12Z"/>
              <path className="cls-478" d="M427.81,422.88c-.09.11-.19.21-.23.35-.04.09-.1.18-.14.29-1.07-.06-2.09-.12-3.02-.12-.28,0-.55,0-.82.01.04-.1.08-.2.11-.28.06-.14.15-.24.25-.34.27,0,.55,0,.83,0,.95,0,1.96.04,3.02.08Z"/>
              <path className="cls-155" d="M428.77,422.07c-.23.18-.49.35-.62.52-.12.1-.25.19-.34.29-1.06-.04-2.07-.08-3.02-.08-.28,0-.56,0-.83,0,.1-.1.22-.18.34-.28.17-.15.4-.31.64-.48.28,0,.57,0,.85,0,.96,0,1.96.02,2.97.03Z"/>
              <path className="cls-500" d="M429.88,421.38c-.1.06-.21.11-.3.17-.26.16-.58.34-.81.52-1.01-.02-2.01-.03-2.97-.03-.29,0-.57,0-.85,0,.24-.16.52-.33.79-.48.1-.05.2-.11.31-.16.29,0,.58-.02.87-.02.97-.01,1.97,0,2.97,0Z"/>
              <path className="cls-258" d="M430.55,421.02c-.11.07-.24.13-.36.2-.1.06-.21.11-.31.17-1-.01-2-.02-2.97,0-.29,0-.58.01-.87.02.11-.05.22-.1.33-.15.13-.06.27-.12.4-.18.29,0,.59-.01.88-.02.97-.02,1.94-.03,2.9-.04Z"/>
              <path className="cls-394" d="M430.88,420.82c-.1.07-.22.13-.33.2-.96,0-1.93.02-2.9.04-.29,0-.59.01-.88.02.13-.06.27-.12.4-.18.29,0,.58-.01.87-.02.96-.02,1.91-.04,2.84-.06Z"/>
              <path className="cls-542" d="M435.44,431.44c0,.17-.03.35-.02.52-1.49-.05-2.98-.1-4.39-.14-1.03-.03-2.07-.05-3.1-.07-.01-.17-.02-.33-.01-.5,1.03.01,2.07.03,3.12.06,1.43.04,2.92.08,4.42.12Z"/>
              <path className="cls-420" d="M435.58,430.26c-.02.22-.07.43-.09.65-.01.17-.05.35-.06.52-1.49-.05-2.99-.09-4.42-.12-1.05-.03-2.08-.05-3.12-.06,0-.17.01-.33.02-.5.01-.21.03-.42.04-.63,1.08.01,2.15.03,3.23.05,1.45.03,2.92.06,4.38.1Z"/>
              <path className="cls-216" d="M435.73,428.84c-.03.26-.09.51-.09.77,0,.22-.04.44-.06.65-1.46-.04-2.93-.07-4.38-.1-1.07-.02-2.15-.04-3.23-.05.01-.21.02-.42.01-.64,0-.25.02-.5.04-.75,1.11.01,2.22.02,3.34.04,1.47.02,2.94.05,4.36.07Z"/>
              <path className="cls-307" d="M435.92,427.67c-.01.13-.04.27-.05.4-.03.26-.1.51-.13.77-1.43-.03-2.9-.05-4.36-.07-1.12-.01-2.23-.03-3.34-.04.02-.25.06-.5.09-.75.01-.13.05-.26.06-.39,1.16,0,2.31.02,3.45.03,1.47.01,2.91.03,4.29.05Z"/>
              <path className="cls-276" d="M435.85,426.93c.04.11.1.23.11.34,0,.13-.03.27-.04.4-1.38-.02-2.81-.03-4.29-.05-1.14-.01-2.29-.02-3.45-.03.01-.13.04-.26.04-.39,0-.12-.11-.24-.18-.36,1.17.01,2.34.02,3.48.03,1.49.01,2.93.03,4.32.05Z"/>
              <path className="cls-434" d="M435.57,426.36c.02.07.07.15.1.22.05.11.13.23.18.34-1.39-.02-2.84-.03-4.32-.05-1.14-.01-2.31-.02-3.48-.03-.07-.12-.2-.24-.26-.36-.04-.08-.11-.16-.14-.23,1.11.01,2.26.03,3.41.04,1.51.02,3.03.05,4.52.07Z"/>
              <path className="cls-542" d="M435.46,425.92c.02.07.06.15.06.22,0,.07.03.15.05.22-1.48-.02-3.01-.05-4.52-.07-1.16-.02-2.3-.03-3.41-.04-.04-.08-.09-.15-.09-.23,0-.08-.06-.16-.09-.23,1.12.02,2.28.04,3.45.05,1.52.02,3.05.05,4.55.08Z"/>
              <path className="cls-271" d="M435.22,425.44c.04.08.1.17.14.25.03.07.08.15.11.23-1.5-.03-3.03-.05-4.55-.08-1.17-.02-2.33-.04-3.45-.05-.04-.08-.11-.16-.15-.23-.04-.08-.14-.16-.2-.25,1.08.01,2.22.03,3.4.05,1.53.02,3.13.05,4.71.08Z"/>
              <path className="cls-493" d="M435.1,425.11s0,.05.01.08c.02.08.07.17.11.25-1.58-.03-3.17-.06-4.71-.08-1.18-.02-2.32-.04-3.4-.05-.06-.08-.14-.16-.16-.24,0-.02-.02-.05-.02-.07,1.06,0,2.2.02,3.39.04,1.54.02,3.16.05,4.78.07Z"/>
              <path className="cls-493" d="M435.16,424.57c-.03.15-.06.31-.07.47,0,.02,0,.05,0,.08-1.61-.03-3.23-.05-4.78-.07-1.19-.02-2.33-.03-3.39-.04,0-.02-.01-.05,0-.07,0-.19.08-.38.13-.56,1.06.03,2.19.07,3.37.09,1.53.03,3.14.07,4.74.12Z"/>
              <path className="cls-605" d="M435.37,423.82c-.03.1-.06.2-.09.3-.04.14-.09.29-.12.44-1.6-.05-3.22-.09-4.74-.12-1.17-.02-2.31-.06-3.37-.09.05-.18.15-.35.22-.51.05-.11.12-.23.16-.33,1.07.06,2.21.13,3.36.16,1.5.03,3.05.09,4.58.14Z"/>
              <path className="cls-569" d="M435.54,423.13c-.04.13-.08.26-.1.4-.02.1-.05.19-.07.29-1.53-.06-3.09-.11-4.58-.14-1.15-.03-2.28-.09-3.36-.16.05-.1.11-.2.14-.29.05-.14.14-.25.23-.35,1.06.04,2.16.08,3.28.11,1.46.03,2.97.08,4.45.13Z"/>
              <path className="cls-535" d="M435.95,422.18c-.1.19-.21.38-.25.58-.06.12-.12.24-.16.37-1.48-.05-2.99-.1-4.45-.13-1.12-.03-2.22-.07-3.28-.11.09-.11.22-.19.34-.29.13-.16.39-.34.62-.52,1.01.02,2.05.03,3.08.05,1.35.01,2.74.04,4.1.06Z"/>
              <path className="cls-535" d="M436.47,421.4c-.04.07-.1.14-.14.21-.12.19-.27.38-.38.57-1.36-.02-2.76-.04-4.1-.06-1.04-.01-2.07-.03-3.08-.05.23-.18.55-.35.81-.52.09-.06.2-.11.3-.17,1,.01,1.99.02,2.94.02,1.24,0,2.47,0,3.65,0Z"/>
              <path className="cls-535" d="M436.76,420.94c-.04.08-.1.16-.15.25-.04.07-.09.14-.14.21-1.18,0-2.41,0-3.65,0-.95,0-1.94,0-2.94-.02.1-.06.21-.11.31-.17.12-.07.25-.13.36-.2.96,0,1.9-.02,2.81-.03,1.18-.02,2.31-.03,3.4-.04Z"/>
              <path className="cls-134" d="M436.88,420.7c-.03.08-.08.16-.13.25-1.08.01-2.22.03-3.4.04-.91.01-1.85.02-2.81.03.11-.07.23-.13.33-.2.93-.02,1.83-.04,2.71-.05,1.14-.02,2.24-.04,3.29-.06Z"/>
              <path className="cls-395" d="M441.88,431.67c0,.18-.02.36-.02.55-.66-.03-1.34-.06-2.03-.09-1.43-.06-2.93-.12-4.42-.17,0-.17.01-.35.02-.52,1.49.05,2.98.1,4.39.15.71.03,1.39.05,2.05.08Z"/>
              <path className="cls-223" d="M441.97,430.44c0,.23-.03.45-.05.68,0,.18-.03.36-.03.55-.66-.03-1.34-.05-2.05-.08-1.41-.05-2.9-.11-4.39-.15,0-.17.04-.35.06-.52.02-.22.07-.43.09-.65,1.46.04,2.89.08,4.25.12.73.02,1.45.04,2.13.06Z"/>
              <path className="cls-602" d="M442.03,428.97c-.01.27-.04.53-.04.8,0,.23-.02.45-.03.68-.68-.02-1.4-.04-2.13-.06-1.36-.04-2.8-.08-4.25-.12.02-.22.06-.43.06-.65,0-.26.06-.51.09-.77,1.43.03,2.81.06,4.1.08.77.01,1.51.03,2.2.04Z"/>
              <path className="cls-388" d="M442.11,427.75c0,.14-.02.28-.02.42-.01.27-.04.53-.06.8-.69-.01-1.43-.03-2.2-.04-1.29-.03-2.67-.06-4.1-.08.03-.26.1-.51.13-.77.02-.14.04-.27.05-.4,1.38.02,2.69.03,3.92.05.8,0,1.56.02,2.28.03Z"/>
              <path className="cls-169" d="M442.1,427c0,.11.02.22.02.32,0,.14,0,.28-.01.42-.71,0-1.48-.02-2.28-.03-1.23-.02-2.54-.03-3.92-.05.01-.13.03-.27.04-.4,0-.11-.06-.23-.11-.34,1.39.02,2.73.03,3.98.05.79,0,1.55.02,2.27.03Z"/>
              <path className="cls-186" d="M442.04,426.46c0,.07.01.14.02.22,0,.11.03.22.04.32-.71,0-1.47-.02-2.27-.03-1.26-.01-2.59-.03-3.98-.05-.04-.11-.13-.23-.18-.34-.03-.07-.08-.15-.1-.22,1.48.02,2.93.05,4.26.07.77.01,1.51.02,2.21.03Z"/>
              <path className="cls-293" d="M442.02,426.03c0,.07.01.15.01.22s0,.14.01.22c-.7-.01-1.44-.02-2.21-.03-1.34-.02-2.78-.04-4.26-.07-.02-.07-.05-.15-.05-.22,0-.07-.03-.15-.06-.22,1.5.03,2.97.05,4.37.08.76.01,1.49.02,2.19.03Z"/>
              <path className="cls-224" d="M441.97,425.56c0,.08.02.16.03.25,0,.07.02.15.02.22-.7-.01-1.43-.02-2.19-.03-1.4-.02-2.87-.05-4.37-.08-.02-.07-.07-.15-.11-.23-.04-.08-.1-.17-.14-.25,1.58.03,3.14.06,4.61.09.74.01,1.45.03,2.13.04Z"/>
              <path className="cls-94" d="M441.94,425.24s0,.05,0,.08c0,.08.02.16.02.25-.68-.01-1.4-.03-2.13-.04-1.47-.03-3.03-.06-4.61-.09-.04-.08-.09-.17-.11-.25,0-.03-.01-.05-.01-.08,1.61.03,3.22.06,4.74.09.73.01,1.43.03,2.11.04Z"/>
              <path className="cls-94" d="M441.99,424.74c-.02.14-.06.29-.06.43,0,.03,0,.05,0,.08-.68-.01-1.38-.03-2.11-.04-1.52-.03-3.12-.06-4.74-.09,0-.03,0-.05,0-.08,0-.16.04-.31.07-.47,1.6.05,3.19.1,4.67.13.76.01,1.48.02,2.16.03Z"/>
              <path className="cls-288" d="M442.16,424c-.02.1-.06.2-.08.31-.03.14-.08.29-.09.43-.68-.01-1.4-.02-2.16-.03-1.48-.04-3.07-.09-4.67-.13.03-.15.08-.3.12-.44.03-.1.06-.21.09-.3,1.53.06,3.05.12,4.47.16.83,0,1.61.01,2.33.02Z"/>
              <path className="cls-375" d="M442.32,423.29c-.02.14-.06.27-.08.41-.02.1-.05.2-.07.31-.72,0-1.5-.01-2.33-.02-1.42-.05-2.93-.11-4.47-.16.03-.1.06-.2.07-.29.02-.14.06-.27.1-.4,1.48.05,2.94.11,4.29.16.88,0,1.72,0,2.49,0Z"/>
              <path className="cls-455" d="M442.46,422.24c-.03.21-.09.43-.09.64,0,.14-.03.27-.04.41-.77,0-1.61,0-2.49,0-1.35-.05-2.81-.11-4.29-.16.04-.13.1-.25.16-.37.04-.19.15-.38.25-.58,1.36.02,2.68.05,3.88.08.96,0,1.83-.01,2.63-.02Z"/>
              <path className="cls-566" d="M442.67,421.36c-.01.08-.04.15-.05.23-.04.21-.12.43-.16.64-.79,0-1.67.01-2.63.02-1.2-.03-2.52-.06-3.88-.08.1-.19.25-.38.38-.57.04-.07.1-.14.14-.21,1.18,0,2.32,0,3.36,0,1.03-.01,1.98-.03,2.83-.04Z"/>
              <path className="cls-566" d="M442.76,420.86c0,.09-.03.18-.05.27-.01.08-.03.15-.05.23-.85.01-1.81.02-2.83.04-1.05,0-2.18,0-3.36,0,.04-.07.09-.14.14-.21.05-.08.11-.16.15-.25,1.08-.01,2.11-.02,3.08-.03,1.07-.02,2.05-.04,2.93-.05Z"/>
              <path className="cls-455" d="M442.79,420.59c0,.09-.02.18-.03.27-.88.01-1.86.03-2.93.05-.97,0-1.99.02-3.08.03.04-.08.09-.16.13-.25,1.04-.02,2.03-.04,2.95-.06,1.09-.02,2.08-.04,2.96-.06Z"/>
              <path className="cls-242" d="M445.51,431.82c0,.19-.02.37-.02.56-.54-.03-1.12-.05-1.73-.08-.61-.03-1.24-.06-1.9-.08,0-.18.01-.36.02-.55.66.03,1.3.05,1.9.08.61.03,1.19.05,1.73.07Z"/>
              <path className="cls-516" d="M445.6,430.56c0,.23-.04.46-.05.69,0,.19-.03.37-.04.56-.54-.02-1.12-.05-1.73-.07-.61-.03-1.24-.05-1.9-.08,0-.18.03-.36.03-.55.01-.23.04-.45.05-.68.68.02,1.33.04,1.94.06.61.02,1.17.04,1.69.06Z"/>
              <path className="cls-517" d="M445.67,429.05c-.01.27-.04.55-.04.82,0,.23-.02.46-.03.69-.52-.02-1.08-.04-1.69-.06-.61-.02-1.26-.04-1.94-.06,0-.23.03-.45.03-.68,0-.27.02-.53.04-.8.69.01,1.34.03,1.95.04.61.01,1.17.03,1.68.04Z"/>
              <path className="cls-307" d="M445.75,427.8c0,.14-.02.29-.02.43-.01.27-.05.55-.06.82-.51-.01-1.07-.03-1.68-.04-.61-.01-1.26-.03-1.95-.04.01-.27.04-.53.06-.8,0-.14.02-.28.02-.42.71,0,1.38.02,1.99.03.61,0,1.16.02,1.64.02Z"/>
              <path className="cls-169" d="M445.74,427.05c0,.11.02.21.02.32,0,.14,0,.29-.01.43-.49,0-1.04-.02-1.64-.02-.61,0-1.28-.02-1.99-.03,0-.14.01-.28.01-.42,0-.11-.02-.22-.02-.32.71,0,1.38.02,1.99.02.61,0,1.16.01,1.65.02Z"/>
              <path className="cls-566" d="M445.68,426.51c0,.07.01.14.02.21,0,.11.03.21.04.32-.49,0-1.04-.01-1.65-.02-.61,0-1.28-.02-1.99-.02,0-.11-.03-.22-.04-.32,0-.07-.02-.14-.02-.22.7,0,1.35.02,1.96.03.61,0,1.17.02,1.67.03Z"/>
              <path className="cls-221" d="M445.66,426.09c0,.07.01.14.01.21s0,.14.01.21c-.5,0-1.07-.02-1.67-.03-.61,0-1.27-.02-1.96-.03,0-.07-.01-.14-.01-.22s0-.15-.01-.22c.7.01,1.35.02,1.96.03s1.17.02,1.68.03Z"/>
              <path className="cls-162" d="M445.61,425.63c0,.08.02.16.03.24,0,.07.02.14.02.21-.51,0-1.07-.02-1.68-.03s-1.27-.02-1.96-.03c0-.07-.02-.15-.02-.22,0-.08-.02-.16-.03-.25.68.01,1.33.02,1.94.04.61.01,1.18.02,1.7.03Z"/>
              <path className="cls-363" d="M445.58,425.32s0,.05,0,.07c0,.08.02.16.02.24-.52-.01-1.09-.02-1.7-.03-.61-.01-1.26-.02-1.94-.04,0-.08-.02-.16-.02-.25,0-.03,0-.05,0-.08.68.01,1.32.03,1.93.04.61.01,1.18.02,1.71.04Z"/>
              <path className="cls-507" d="M445.64,424.8c-.02.15-.06.29-.06.44,0,.02,0,.05,0,.07-.53-.01-1.1-.02-1.71-.04-.61-.01-1.26-.03-1.93-.04,0-.03,0-.05,0-.08,0-.14.04-.28.06-.43.68.01,1.32.02,1.93.03.61.01,1.19.02,1.72.03Z"/>
              <path className="cls-288" d="M445.82,424.04c-.02.11-.06.21-.08.32-.03.15-.09.3-.1.44-.52,0-1.1-.02-1.72-.03-.61-.01-1.25-.02-1.93-.03.02-.14.07-.29.09-.43.02-.1.06-.2.08-.31.72,0,1.39.01,2.01.02.61,0,1.17.01,1.65.02Z"/>
              <path className="cls-207" d="M445.99,423.3c-.02.14-.06.28-.09.42-.02.11-.06.21-.08.32-.48,0-1.04-.01-1.65-.02-.61,0-1.28-.01-2.01-.02.02-.1.06-.2.07-.31.02-.14.07-.27.08-.41.77,0,1.48,0,2.09,0,.62,0,1.14,0,1.58.01Z"/>
              <path className="cls-350" d="M446.14,422.22c-.03.22-.1.44-.1.66,0,.14-.03.28-.05.42-.43,0-.96,0-1.58-.01-.62,0-1.32,0-2.09,0,.02-.14.04-.27.04-.41,0-.21.06-.43.09-.64.79,0,1.5,0,2.12-.01s1.15,0,1.57,0Z"/>
              <path className="cls-566" d="M446.37,421.32c-.01.08-.04.16-.06.24-.04.22-.13.44-.17.66-.42,0-.95,0-1.57,0s-1.32,0-2.12.01c.03-.21.12-.43.16-.64.01-.08.04-.15.05-.23.85-.01,1.6-.02,2.22-.03.62,0,1.12-.01,1.47-.01Z"/>
              <path className="cls-566" d="M446.47,420.8c0,.09-.04.19-.05.28-.01.08-.04.16-.05.24-.36,0-.85,0-1.47.01-.62,0-1.37.02-2.22.03.01-.08.04-.15.05-.23.01-.09.04-.18.05-.27.88-.01,1.64-.03,2.27-.04.62-.01,1.11-.02,1.44-.02Z"/>
              <path className="cls-455" d="M446.5,420.52c0,.09-.02.19-.03.28-.33,0-.81.01-1.44.02-.62,0-1.39.02-2.27.04,0-.09.03-.18.03-.27.88-.02,1.64-.03,2.26-.04.62-.01,1.11-.02,1.45-.03Z"/>
              <path className="cls-491" d="M447.01,431.88v.57c-.46-.02-.97-.05-1.51-.07,0-.19.01-.37.02-.56.54.02,1.04.04,1.49.06Z"/>
              <path className="cls-350" d="M447.01,430.61v1.27c-.45-.02-.95-.04-1.49-.06,0-.19.03-.37.04-.56.01-.23.04-.46.05-.69.52.02.99.03,1.41.05Z"/>
              <path className="cls-517" d="M447.01,429.08v1.53c-.42-.02-.89-.03-1.41-.05,0-.23.03-.46.03-.69,0-.27.03-.55.04-.82.51.01.96.02,1.34.03Z"/>
              <path className="cls-307" d="M447.01,427.82v1.27c-.38,0-.83-.02-1.34-.03.01-.27.04-.55.06-.82,0-.14.02-.29.02-.43.49,0,.91.01,1.26.02Z"/>
              <path className="cls-169" d="M447.01,427.06v.75c-.35,0-.77-.01-1.26-.02,0-.14.01-.29.01-.43,0-.11-.02-.21-.02-.32.49,0,.91.01,1.27.02Z"/>
              <path className="cls-566" d="M447.01,426.54v.53c-.36,0-.78-.01-1.27-.02,0-.11-.03-.21-.04-.32,0-.07-.02-.14-.02-.21.5,0,.95.01,1.33.02Z"/>
              <path className="cls-278" d="M447.01,426.11v.42c-.38,0-.82-.01-1.33-.02,0-.07-.01-.14-.01-.21s0-.14-.01-.21c.51,0,.96.02,1.35.02Z"/>
              <path className="cls-566" d="M447.01,425.66v.45c-.39,0-.84-.02-1.35-.02,0-.07-.02-.14-.02-.21,0-.08-.02-.16-.03-.24.52.01.99.02,1.4.03Z"/>
              <path className="cls-578" d="M447.01,425.35v.31c-.41,0-.88-.02-1.4-.03,0-.08-.02-.16-.02-.24,0-.02,0-.05,0-.07.53.01,1,.02,1.43.03Z"/>
              <path className="cls-622" d="M447.01,424.83v.52c-.42,0-.9-.02-1.43-.03,0-.02,0-.05,0-.07,0-.15.05-.29.06-.44.52,0,.99.02,1.36.03Z"/>
              <path className="cls-288" d="M447.01,424.06v.76c-.38,0-.84-.02-1.36-.03.02-.15.08-.3.1-.44.02-.11.06-.21.08-.32.48,0,.88.01,1.18.02Z"/>
              <path className="cls-455" d="M447.01,423.32v.75c-.3,0-.7-.01-1.18-.02.02-.11.06-.21.08-.32.02-.14.07-.28.09-.42.43,0,.77.01,1.02.02Z"/>
              <path className="cls-566" d="M447.01,422.23v1.09c-.24,0-.58-.01-1.02-.02.02-.14.05-.28.05-.42,0-.22.07-.44.1-.66.42,0,.71,0,.86,0Z"/>
              <path className="cls-566" d="M447.01,421.32v.91c-.15,0-.45,0-.86,0,.03-.22.13-.44.17-.66.01-.08.04-.16.06-.24.36,0,.57,0,.64,0Z"/>
              <path className="cls-162" d="M447.01,420.79v.53c-.07,0-.29,0-.64,0,.01-.08.04-.16.05-.24.01-.09.04-.19.05-.28.33,0,.51,0,.54,0Z"/>
              <path className="cls-207" d="M447.01,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
            </g>
            <g>
              <path className="cls-158" d="M447.01,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
            </g>
            <g>
              <path className="cls-158" d="M447.01,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s-.21,0-.54,0c0-.09.03-.19.03-.28.33,0,.51,0,.51,0Z"/>
            </g>
          </g>
          <g id="MeshGrid-6" data-name="MeshGrid">
            <g>
              <path className="cls-591" d="M446.16,964.11c.03.35.16.69.18,1.01.43-.02.67-.03.67-.03v-1.12c-.11,0-.4.07-.85.14Z"/>
              <path className="cls-548" d="M445.83,962.2c.02.28.11.56.14.83.03.37.16.72.19,1.07.45-.07.74-.14.85-.14v-1.96c-.29,0-.68.1-1.18.19Z"/>
              <path className="cls-231" d="M445.59,960.68c.02.23.08.45.1.67.02.29.12.58.14.86.49-.09.88-.18,1.18-.19v-1.47c-.41,0-.88.07-1.41.13Z"/>
              <path className="cls-325" d="M445.43,959.52c.01.16.05.32.07.48.02.23.08.45.1.68.54-.06,1-.12,1.41-.13v-1.07c-.48,0-1.01.03-1.58.04Z"/>
              <path className="cls-490" d="M445.3,958.18c.02.28.04.57.06.85.01.16.05.32.07.48.57-.02,1.09-.04,1.58-.04v-1.33c-.51,0-1.09.03-1.7.04Z"/>
              <path className="cls-511" d="M445.11,955.12c.05.74.08,1.48.13,2.22.02.28.04.57.06.85.61-.01,1.19-.03,1.7-.04v-3.2c-.54.01-1.19.1-1.89.17Z"/>
              <path className="cls-29" d="M444.83,949.26c.05,1.21.1,2.43.16,3.65.04.74.07,1.48.12,2.21.7-.08,1.36-.16,1.89-.17v-6.13c-.6.03-1.37.24-2.18.44Z"/>
              <path className="cls-473" d="M444.6,941.17c.03,1.48.05,2.96.11,4.44.04,1.21.07,2.43.12,3.65.81-.2,1.57-.41,2.18-.44v-8.46c-.7.05-1.52.44-2.41.82Z"/>
              <path className="cls-516" d="M444.54,935.21c0,.5,0,1,0,1.5.01,1.49.02,2.97.05,4.45.89-.38,1.71-.76,2.41-.82v-6.21c-.75.07-1.57.57-2.46,1.07Z"/>
              <path className="cls-516" d="M444.55,931.48c0,.77,0,1.51,0,2.22,0,.5,0,1,0,1.5.89-.5,1.72-1,2.46-1.07v-3.42c-.75.07-1.57.42-2.46.76Z"/>
              <path className="cls-566" d="M444.55,927.42v1.65c0,.83,0,1.63,0,2.41.89-.35,1.71-.69,2.46-.76v-3.94c-.74.07-1.56.36-2.45.64Z"/>
              <path className="cls-569" d="M444.55,686.43c0,100.35,0,204.24,0,239.31v1.68c.89-.28,1.71-.57,2.45-.64v-235.14c-.73,1.01-1.55-2.11-2.45-5.22Z"/>
              <path className="cls-217" d="M444.56,448.01c0,2.27,0,4.59,0,7.03,0,6.34,0,14.48,0,25.11,0,34.33,0,119,0,206.29.9,3.11,1.72,6.23,2.45,5.22v-240.53c-.72-.03-1.55-1.58-2.45-3.11Z"/>
              <path className="cls-445" d="M444.56,437.32c0,1.35,0,2.73,0,4.16,0,2.11,0,4.26,0,6.53.9,1.53,1.73,3.08,2.45,3.11v-12.38c-.72-.03-1.55-.73-2.45-1.42Z"/>
              <path className="cls-554" d="M444.56,432.86v.54c0,1.27,0,2.56,0,3.92.9.69,1.73,1.39,2.45,1.42v-5.6c-.72-.03-1.55-.15-2.45-.27Z"/>
              <path className="cls-491" d="M444.56,432.33v.53c.9.12,1.73.24,2.45.27v-.69c-.72-.03-1.55-.07-2.45-.11Z"/>
              <path className="cls-168" d="M443.46,964.21c.08.32.15.63.22.91.28,0,.55.02.8.02.8.01,1.43,0,1.86-.01-.02-.33-.16-.67-.18-1.01-.45.07-1.07.13-1.84.11-.28,0-.56,0-.86-.01Z"/>
              <path className="cls-531" d="M443.02,962.34c.07.29.13.57.2.84.08.36.17.71.24,1.03.3,0,.58,0,.86.01.77.02,1.38-.05,1.84-.11-.03-.35-.16-.71-.19-1.07-.02-.27-.11-.55-.14-.83-.5.09-1.1.17-1.82.15-.34,0-.66-.02-.99-.02Z"/>
              <path className="cls-211" d="M442.65,960.73c.06.24.11.48.17.71.07.31.14.61.21.9.33,0,.65.01.99.02.72.02,1.32-.07,1.82-.15-.02-.28-.11-.57-.14-.86-.02-.22-.08-.44-.1-.67-.54.06-1.14.11-1.83.09-.38-.01-.74-.02-1.11-.04Z"/>
              <path className="cls-539" d="M442.35,959.47c.04.18.08.35.12.52.06.25.12.49.17.73.38.02.74.03,1.11.04.69.02,1.3-.03,1.83-.09-.02-.23-.08-.45-.1-.68-.01-.16-.05-.32-.07-.48-.57.02-1.19.02-1.86,0-.4-.01-.8-.03-1.22-.05Z"/>
              <path className="cls-448" d="M442.02,958.11c.07.28.13.55.2.83.04.18.09.35.13.53.42.02.82.03,1.22.05.67.02,1.29.01,1.86,0-.01-.16-.05-.32-.07-.48-.02-.28-.04-.57-.06-.85-.61.01-1.27.02-1.93,0-.41-.01-.87-.04-1.35-.07Z"/>
              <path className="cls-199" d="M441.34,955.14c.16.72.32,1.42.49,2.15.07.28.13.55.2.83.48.03.93.06,1.35.07.67.02,1.32.02,1.93,0-.02-.28-.04-.57-.06-.85-.05-.74-.09-1.48-.13-2.22-.7.08-1.44.15-2.15.13-.49,0-1.05-.05-1.63-.12Z"/>
              <path className="cls-29" d="M440.16,949.48c.24,1.18.45,2.33.71,3.51.16.72.3,1.42.47,2.14.58.06,1.14.11,1.63.12.7.01,1.45-.06,2.15-.13-.05-.74-.08-1.48-.12-2.21-.07-1.22-.11-2.43-.16-3.65-.81.2-1.67.4-2.49.41-.71.02-1.42-.07-2.19-.19Z"/>
              <path className="cls-495" d="M438.78,941.66c.24,1.45.46,2.86.73,4.31.22,1.19.41,2.33.65,3.51.76.12,1.48.21,2.19.19.81-.01,1.67-.21,2.49-.41-.05-1.21-.08-2.43-.12-3.65-.05-1.48-.07-2.96-.11-4.44-.89.38-1.84.76-2.79.8-1,.06-1.98-.09-3.03-.31Z"/>
              <path className="cls-134" d="M437.98,935.84c.06.5.09.98.16,1.48.21,1.47.4,2.89.64,4.35,1.05.21,2.03.37,3.03.31.95-.04,1.9-.42,2.79-.8-.03-1.48-.04-2.97-.05-4.45,0-.5,0-1,0-1.5-.89.5-1.86,1-2.89,1.06-1.15.08-2.37-.14-3.68-.43Z"/>
              <path className="cls-361" d="M437.7,932.01c.04.77.08,1.63.14,2.35.06.5.08.99.14,1.48,1.31.29,2.52.51,3.68.43,1.03-.06,2-.56,2.89-1.06,0-.5,0-1,0-1.5,0-.71,0-1.45,0-2.22-.89.35-1.86.69-2.9.76-1.21.08-2.53-.05-3.95-.23Z"/>
              <path className="cls-401" d="M437.56,928.48c.01.34.02.72.03,1.03.04.82.06,1.73.1,2.5,1.42.18,2.74.31,3.95.23,1.04-.06,2.01-.41,2.9-.76,0-.77,0-1.58,0-2.41v-1.65c-.89.28-1.86.57-2.91.63-1.25.07-2.61.24-4.08.42Z"/>
              <path className="cls-401" d="M436.97,693.37c.03,69.25.14,136.26.14,171.04s.12,54.74.42,62.95c.01.37.02.78.03,1.12,1.47-.18,2.84-.35,4.08-.42,1.04-.07,2.01-.35,2.91-.63v-1.68c0-35.07,0-138.97,0-239.31-.9-3.11-1.87-6.2-2.91-5.11-1.46-3.01-3.04,4.49-4.68,12.05Z"/>
              <path className="cls-566" d="M436.72,445.36c0,2.21,0,4.53,0,7.08,0,3.05.01,6.58.01,10.63,0,4.56.01,10.04.01,16.58,0,32.76.18,124.95.21,213.72,1.64-7.55,3.21-15.06,4.68-12.05,1.03-1.08,2.01,2.01,2.91,5.11,0-87.28,0-171.96,0-206.29,0-10.63,0-18.77,0-25.11,0-2.44,0-4.76,0-7.03-.9-1.53-1.88-3.03-2.91-2.97-1.57.09-3.24.19-4.93.33Z"/>
              <path className="cls-566" d="M436.7,435.71c0,1.12,0,2.31,0,3.64,0,1.83,0,3.8,0,6.01,1.69-.14,3.36-.24,4.93-.33,1.03-.06,2.01,1.45,2.91,2.97,0-2.27,0-4.42,0-6.53,0-1.43,0-2.81,0-4.16-.9-.69-1.88-1.38-2.91-1.39-1.57-.02-3.25-.12-4.95-.21Z"/>
              <path className="cls-482" d="M436.69,432.36c0,.12,0,.25,0,.37,0,.89,0,1.86,0,2.98,1.7.09,3.38.19,4.95.21,1.03.02,2.01.7,2.91,1.39,0-1.35,0-2.64,0-3.92v-.54c-.9-.12-1.88-.24-2.91-.29-1.57-.07-3.25-.14-4.95-.21Z"/>
              <path className="cls-197" d="M436.69,432v.36c1.7.07,3.38.15,4.95.21,1.03.04,2.01.17,2.91.29v-.53c-.9-.04-1.88-.08-2.91-.13-1.57-.07-3.25-.14-4.95-.2Z"/>
              <path className="cls-225" d="M442.23,964.16c.11.32.21.63.3.9.09,0,.18.01.26.02.31.02.61.03.89.04-.07-.28-.14-.58-.22-.91-.3,0-.61-.02-.95-.03-.1,0-.19,0-.28-.01Z"/>
              <path className="cls-373" d="M441.61,962.27c.1.29.19.58.28.85.12.37.23.71.34,1.04.09,0,.18,0,.28.01.34.02.66.03.95.03-.08-.32-.16-.67-.24-1.03-.06-.27-.13-.55-.2-.84-.33,0-.68-.02-1.08-.04-.11,0-.22-.01-.33-.02Z"/>
              <path className="cls-513" d="M441.08,960.65c.08.24.16.48.24.72.1.31.2.61.3.91.11,0,.21.01.33.02.4.02.75.03,1.08.04-.07-.29-.14-.59-.21-.9-.05-.23-.11-.47-.17-.71-.38-.01-.77-.03-1.21-.06-.12,0-.24-.01-.37-.02Z"/>
              <path className="cls-180" d="M440.65,959.38c.06.18.12.35.18.53.08.25.17.5.25.74.12,0,.24.01.37.02.44.03.83.04,1.21.06-.06-.24-.11-.49-.17-.73-.04-.17-.08-.35-.12-.52-.42-.02-.85-.04-1.31-.07-.13,0-.26-.01-.39-.02Z"/>
              <path className="cls-428" d="M440.17,957.99c.1.28.2.57.3.86.06.18.12.36.18.53.13,0,.26.02.39.02.46.03.89.05,1.31.07-.04-.18-.08-.35-.13-.53-.07-.28-.13-.55-.2-.83-.48-.03-.97-.06-1.44-.09-.13,0-.27-.02-.41-.03Z"/>
              <path className="cls-511" d="M439.08,954.91c.26.74.53,1.48.79,2.22.1.28.2.57.3.85.14,0,.28.02.41.03.48.03.97.06,1.44.09-.07-.28-.13-.55-.2-.83-.17-.72-.32-1.43-.49-2.15-.58-.06-1.19-.14-1.77-.18-.16-.01-.33-.03-.49-.04Z"/>
              <path className="cls-29" d="M436.98,949.05c.43,1.21.87,2.44,1.3,3.65.27.74.53,1.48.79,2.22.17.01.33.03.49.04.58.05,1.18.12,1.77.18-.16-.72-.31-1.42-.47-2.14-.26-1.19-.47-2.33-.71-3.51-.76-.12-1.56-.27-2.43-.37-.24-.03-.49-.05-.75-.06Z"/>
              <path className="cls-336" d="M434.22,940.92c.48,1.5.97,2.99,1.48,4.47.42,1.22.84,2.44,1.28,3.65.25.02.5.04.75.06.87.1,1.67.25,2.43.37-.24-1.18-.43-2.33-.65-3.51-.27-1.44-.49-2.85-.73-4.31-1.05-.21-2.16-.48-3.43-.64-.35-.05-.74-.08-1.13-.1Z"/>
              <path className="cls-200" d="M432.47,934.84c.13.52.27,1.03.41,1.55.42,1.52.87,3.04,1.35,4.54.39.02.78.05,1.13.1,1.26.16,2.38.43,3.43.64-.24-1.45-.43-2.88-.64-4.35-.07-.49-.1-.98-.16-1.48-1.31-.29-2.7-.66-4.21-.87-.42-.06-.85-.11-1.3-.13Z"/>
              <path className="cls-132" d="M431.74,931.45c.1.6.21,1.19.35,1.82.12.52.25,1.04.37,1.56.44.03.87.08,1.3.13,1.51.21,2.91.58,4.21.87-.06-.5-.08-.98-.14-1.48-.07-.72-.1-1.57-.14-2.35-1.42-.18-2.95-.4-4.57-.49-.45-.03-.92-.05-1.39-.07Z"/>
              <path className="cls-489" d="M431.38,929.06c.03.25.06.46.09.66.08.57.17,1.13.27,1.73.47.02.93.04,1.39.07,1.62.09,3.15.31,4.57.49-.04-.77-.06-1.68-.1-2.5-.01-.31-.02-.69-.03-1.03-1.47.18-3.06.37-4.74.49-.47.03-.95.06-1.44.09Z"/>
              <path className="cls-151" d="M430.42,704.06c.03,69.62.07,130.89.07,149.56,0,46.27.16,67.43.81,74.65.03.29.06.54.08.79.49-.02.97-.05,1.44-.09,1.68-.12,3.27-.31,4.74-.49-.01-.34-.02-.75-.03-1.12-.3-8.22-.42-27.82-.42-62.95s-.11-101.79-.14-171.04c-1.64,7.55-3.35,15.16-5.09,12.33-.48-1.04-.97-1.33-1.46-1.64Z"/>
              <path className="cls-258" d="M430.29,443.37c0,1.96,0,4.09.01,6.35,0,2.5,0,5.4,0,8.7,0,37.51.07,149.53.11,245.63.49.31.97.6,1.46,1.64,1.74,2.83,3.45-4.77,5.09-12.33-.04-88.77-.21-180.96-.21-213.72,0-6.55-.01-12.02-.01-16.58,0-4.05,0-7.58-.01-10.63,0-2.55,0-4.88,0-7.08-1.69.14-3.4.33-5.05.59-.46-.98-.92-1.78-1.38-2.59Z"/>
              <path className="cls-489" d="M430.27,434.88c0,.94,0,1.98,0,3.12,0,1.61,0,3.41.01,5.37.45.81.91,1.61,1.38,2.59,1.65-.27,3.36-.45,5.05-.59,0-2.21,0-4.18,0-6.01,0-1.33,0-2.53,0-3.64-1.7-.09-3.42-.15-5.07-.12-.46-.27-.92-.49-1.36-.71Z"/>
              <path className="cls-314" d="M430.27,432.09c0,.1,0,.2,0,.3,0,.72,0,1.56,0,2.5.45.22.9.44,1.36.71,1.65-.04,3.37.03,5.07.12,0-1.12,0-2.09,0-2.98,0-.13,0-.25,0-.37-1.7-.07-3.42-.14-5.07-.18-.46-.02-.91-.06-1.36-.09Z"/>
              <path className="cls-361" d="M430.27,431.8v.29c.45.04.9.07,1.36.09,1.64.05,3.36.11,5.07.18v-.36c-1.7-.06-3.42-.12-5.07-.17-.46-.01-.91-.03-1.36-.04Z"/>
              <path className="cls-461" d="M441.4,964.1c.14.33.27.63.38.91.16.01.32.02.48.03.09,0,.18.01.27.02-.09-.28-.19-.58-.3-.9-.09,0-.18-.01-.29-.02-.19-.01-.37-.03-.54-.04Z"/>
              <path className="cls-373" d="M440.55,962.2c.13.3.26.58.39.86.17.37.32.72.46,1.05.18.01.35.03.54.04.1,0,.19.01.29.02-.11-.32-.22-.67-.34-1.04-.09-.27-.18-.56-.28-.85-.11,0-.22-.01-.33-.02-.25-.02-.49-.03-.73-.05Z"/>
              <path className="cls-291" d="M439.83,960.57c.11.24.21.49.31.72.14.31.27.62.41.91.24.02.48.04.73.05.12,0,.23.01.33.02-.1-.29-.2-.6-.3-.91-.08-.24-.16-.47-.24-.72-.12,0-.25-.01-.37-.02-.29-.02-.58-.04-.87-.06Z"/>
              <path className="cls-234" d="M439.3,959.3c.07.18.14.35.22.53.1.25.21.5.31.74.29.02.58.04.87.06.13,0,.25.02.37.02-.08-.24-.16-.49-.25-.74-.06-.17-.12-.35-.18-.53-.13,0-.26-.02-.4-.02-.31-.02-.63-.04-.95-.06Z"/>
              <path className="cls-576" d="M438.76,957.91c.11.28.22.57.33.85.07.18.14.36.21.53.32.02.64.04.95.06.13,0,.27.02.4.02-.06-.18-.12-.35-.18-.53-.1-.29-.2-.57-.3-.86-.14,0-.28-.02-.42-.03-.32-.02-.66-.04-.99-.06Z"/>
              <path className="cls-191" d="M437.52,954.85c.31.74.61,1.47.9,2.21.11.28.23.57.34.85.33.02.66.04.99.06.14,0,.28.02.42.03-.1-.28-.2-.57-.3-.85-.26-.74-.52-1.49-.79-2.22-.17-.01-.34-.02-.51-.03-.33-.02-.69-.03-1.05-.04Z"/>
              <path className="cls-29" d="M435.04,949.02c.52,1.21,1.03,2.41,1.55,3.62.31.73.62,1.47.93,2.2.36.01.72.02,1.05.04.17,0,.34.02.51.03-.27-.74-.53-1.48-.79-2.22-.44-1.21-.87-2.44-1.3-3.65-.25-.02-.51-.03-.78-.03-.36,0-.76,0-1.16,0Z"/>
              <path className="cls-484" d="M431.79,940.92c.54,1.5,1.13,2.99,1.73,4.47.5,1.22,1.01,2.42,1.52,3.63.4,0,.79,0,1.16,0,.27,0,.53.01.78.03-.43-1.21-.86-2.44-1.28-3.65-.51-1.48-1-2.98-1.48-4.47-.39-.02-.8-.03-1.19-.02-.4,0-.82.01-1.25.02Z"/>
              <path className="cls-141" d="M429.85,934.82c.14.52.29,1.04.44,1.55.45,1.54.95,3.05,1.5,4.55.43-.01.85-.02,1.25-.02.39,0,.8,0,1.19.02-.48-1.5-.92-3.01-1.35-4.54-.14-.51-.28-1.03-.41-1.55-.44-.03-.89-.04-1.36-.03-.42,0-.84.01-1.26.01Z"/>
              <path className="cls-460" d="M429.05,931.45c.12.59.25,1.19.39,1.81.13.53.26,1.05.4,1.57.42,0,.84,0,1.26-.01.46-.01.91,0,1.36.03-.13-.52-.25-1.04-.37-1.56-.14-.63-.25-1.22-.35-1.82-.47-.02-.95-.03-1.43-.02-.42,0-.84.01-1.25.01Z"/>
              <path className="cls-171" d="M428.65,929.05c.03.27.06.48.1.7.09.54.19,1.11.3,1.69.42,0,.84,0,1.25-.01.48,0,.96,0,1.43.02-.1-.6-.19-1.17-.27-1.73-.03-.21-.06-.42-.09-.66-.49.02-.98.04-1.48.04-.41,0-.83-.01-1.25-.05Z"/>
              <path className="cls-481" d="M427.71,690.3c0,61.89.01,120.16.02,153.74,0,1.79,0,3.52,0,5.19,0,20.53.04,36.86.14,49.57.09,12.93.03,22.71.7,29.44.03.31.06.56.09.83.42.03.84.05,1.25.05.5,0,1-.02,1.48-.04-.03-.25-.06-.5-.08-.79-.65-7.22-.81-28.38-.81-74.65,0-18.67-.04-79.94-.07-149.56-.49-.31-.98-.64-1.46-1.78-.41-1.21-.83-6.59-1.25-11.98Z"/>
              <path className="cls-578" d="M427.69,445.71c0,2.04,0,4.15,0,6.32,0,35.71.01,141.16.02,238.26.42,5.39.84,10.76,1.25,11.98.49,1.14.97,1.47,1.46,1.78-.04-96.1-.11-208.13-.11-245.63,0-3.3,0-6.21,0-8.7,0-2.26,0-4.39-.01-6.35-.45-.81-.9-1.61-1.33-2.59-.42-.02-.85,2.46-1.27,4.93Z"/>
              <path className="cls-578" d="M427.69,436.14v3.66c0,1.9,0,3.87,0,5.92.42-2.48.85-4.95,1.27-4.93.43.97.88,1.78,1.33,2.59,0-1.96,0-3.76-.01-5.37,0-1.14,0-2.18,0-3.12-.45-.22-.89-.43-1.31-.7-.42-.01-.85.97-1.27,1.96Z"/>
              <path className="cls-484" d="M427.69,432.21v.47c0,1.12,0,2.27,0,3.46.42-.99.85-1.97,1.27-1.96.43.27.87.49,1.31.7,0-.94,0-1.77,0-2.5,0-.1,0-.2,0-.3-.45-.04-.88-.07-1.31-.09-.42,0-.85.1-1.27.21Z"/>
              <path className="cls-569" d="M427.69,431.74v.47c.42-.11.85-.22,1.27-.21.43.02.87.05,1.31.09v-.29c-.45-.01-.88-.02-1.31-.03-.42,0-.85-.02-1.27-.02Z"/>
              <path className="cls-241" d="M439.85,963.96c.22.33.43.64.59.93.29.03.57.06.84.08.17.01.33.03.5.04-.11-.28-.24-.58-.38-.91-.18-.01-.36-.03-.56-.05-.33-.03-.66-.06-.99-.09Z"/>
              <path className="cls-367" d="M438.57,962.04c.19.3.39.59.57.87.24.37.49.73.71,1.06.33.04.67.07.99.09.2.02.38.03.56.05-.14-.33-.3-.68-.46-1.05-.12-.28-.25-.56-.39-.86-.24-.02-.48-.04-.74-.06-.42-.03-.83-.07-1.24-.11Z"/>
              <path className="cls-96" d="M437.54,960.39c.15.25.29.49.44.73.19.31.4.62.59.92.41.04.82.08,1.24.11.26.02.5.04.74.06-.13-.3-.27-.6-.41-.91-.1-.24-.21-.48-.31-.72-.29-.02-.58-.04-.88-.06-.48-.03-.95-.07-1.41-.11Z"/>
              <path className="cls-325" d="M436.81,959.11c.1.18.19.35.29.53.15.25.29.5.44.75.46.04.93.08,1.41.11.29.02.59.04.88.06-.1-.24-.21-.49-.31-.74-.07-.17-.14-.35-.22-.53-.32-.02-.64-.04-.95-.07-.51-.04-1.03-.07-1.54-.12Z"/>
              <path className="cls-127" d="M436.13,957.74c.13.28.27.56.4.83.09.18.18.36.28.54.51.04,1.02.08,1.54.12.32.02.64.04.95.07-.07-.18-.14-.36-.21-.53-.11-.28-.22-.57-.33-.85-.33-.02-.67-.04-.99-.06-.53-.04-1.08-.07-1.64-.11Z"/>
              <path className="cls-229" d="M434.67,954.74c.35.72.71,1.44,1.06,2.16.13.28.27.55.4.83.55.04,1.11.07,1.64.11.33.02.66.04.99.06-.11-.28-.22-.57-.34-.85-.3-.74-.6-1.48-.9-2.21-.36-.01-.72-.02-1.05-.04-.55-.03-1.17-.04-1.8-.06Z"/>
              <path className="cls-29" d="M431.89,949.02c.56,1.19,1.14,2.38,1.72,3.57.35.72.71,1.44,1.06,2.16.63.01,1.25.03,1.8.06.34.02.69.03,1.05.04-.31-.74-.62-1.47-.93-2.2-.51-1.21-1.03-2.42-1.55-3.62-.4,0-.8,0-1.16,0-.59-.02-1.29,0-1.99,0Z"/>
              <path className="cls-148" d="M428.45,940.96c.56,1.51,1.16,2.99,1.8,4.46.53,1.21,1.07,2.4,1.64,3.6.7-.01,1.4-.03,1.99,0,.37.01.76.01,1.16,0-.52-1.21-1.03-2.42-1.52-3.63-.6-1.48-1.19-2.96-1.73-4.47-.42.01-.85.02-1.26.02-.66,0-1.37.01-2.08.02Z"/>
              <path className="cls-277" d="M426.51,934.77c.14.53.28,1.06.43,1.59.44,1.56.95,3.09,1.51,4.6.71-.01,1.42-.03,2.08-.02.4,0,.83,0,1.26-.02-.54-1.5-1.05-3.01-1.5-4.55-.15-.52-.3-1.03-.44-1.55-.42,0-.84,0-1.27,0-.69,0-1.38-.02-2.07-.04Z"/>
              <path className="cls-385" d="M425.74,931.36c.12.59.24,1.19.38,1.81.12.54.25,1.07.39,1.61.69.02,1.38.04,2.07.04.42,0,.85,0,1.27,0-.14-.52-.28-1.04-.4-1.57-.15-.62-.28-1.22-.39-1.81-.42,0-.84,0-1.26-.01-.68-.01-1.37-.04-2.05-.07Z"/>
              <path className="cls-473" d="M425.29,928.53c.05.41.1.79.15,1.13.09.54.19,1.11.3,1.7.69.03,1.37.06,2.05.07.42,0,.84.01,1.26.01-.12-.59-.22-1.15-.3-1.69-.04-.22-.07-.43-.1-.7-.42-.03-.84-.08-1.27-.14-.69-.1-1.39-.23-2.09-.39Z"/>
              <path className="cls-332" d="M424.35,678.06c0,55.36.02,111.52.05,158.56,0,18.75.05,36,.07,51.17.02,15.65-.35,29.11.69,39.52.04.41.08.81.13,1.22.7.15,1.4.29,2.09.39.43.06.85.11,1.27.14-.03-.27-.06-.52-.09-.83-.67-6.72-.6-16.5-.7-29.44-.1-12.71-.14-29.04-.14-49.57,0-1.67,0-3.4,0-5.19,0-33.57-.02-91.84-.02-153.74-.42-5.39-.85-10.79-1.27-12.06-.69.08-1.39-.01-2.09-.18Z"/>
              <path className="cls-533" d="M424.35,438.07c0,1.65,0,3.31,0,4.97,0,2.52,0,5.04,0,7.56.69.03,1.38.06,2.07.06.42,0,.85-2.47,1.27-4.95,0-2.04,0-4.01,0-5.92v-3.66c-.42.99-.85,1.97-1.27,1.96-.69,0-1.38-.02-2.07-.03Z"/>
              <path className="cls-429" d="M424.35,432.4v5.67c.69.01,1.38.03,2.07.03.42,0,.85-.98,1.27-1.96,0-1.19,0-2.34,0-3.46v-.47c-.42.11-.85.22-1.27.22-.69,0-1.38-.02-2.07-.02Z"/>
              <path className="cls-562" d="M424.35,431.71v.7c.69,0,1.38.01,2.07.02.42,0,.85-.11,1.27-.22v-.47c-.42,0-.85-.01-1.27-.02-.69,0-1.38-.01-2.07-.02Z"/>
              <path className="cls-404" d="M437.58,963.67c.31.34.6.67.86.97.38.06.75.11,1.12.15.3.04.6.07.88.1-.16-.29-.38-.6-.59-.93-.33-.04-.67-.08-1.01-.12-.41-.05-.83-.11-1.26-.18Z"/>
              <path className="cls-409" d="M435.86,961.7c.26.3.52.59.76.88.33.38.65.74.96,1.09.43.07.85.13,1.26.18.34.04.68.08,1.01.12-.22-.33-.47-.69-.71-1.06-.18-.28-.37-.57-.57-.87-.41-.04-.82-.09-1.22-.13-.49-.06-.99-.13-1.49-.2Z"/>
              <path className="cls-262" d="M434.47,960.04c.2.25.41.49.6.73.26.32.53.62.79.93.5.07,1,.14,1.49.2.41.05.81.09,1.22.13-.19-.3-.4-.6-.59-.92-.15-.24-.29-.48-.44-.73-.46-.04-.93-.09-1.39-.14-.56-.06-1.12-.13-1.68-.21Z"/>
              <path className="cls-545" d="M433.45,958.76c.13.18.28.36.41.53.2.25.41.5.61.75.56.08,1.12.15,1.68.21.47.05.93.1,1.39.14-.15-.25-.29-.5-.44-.75-.1-.18-.2-.35-.29-.53-.51-.04-1.02-.09-1.53-.14-.62-.06-1.23-.13-1.83-.21Z"/>
              <path className="cls-590" d="M432.52,957.41c.17.27.35.53.52.8.13.18.27.36.4.54.61.08,1.22.15,1.83.21.51.05,1.02.1,1.53.14-.1-.18-.19-.36-.28-.54-.13-.28-.27-.56-.4-.83-.55-.04-1.11-.08-1.64-.13-.64-.06-1.31-.13-1.97-.2Z"/>
              <path className="cls-336" d="M430.69,954.52c.43.7.87,1.4,1.32,2.09.17.27.34.53.52.8.67.07,1.34.13,1.97.2.53.05,1.08.09,1.64.13-.13-.28-.27-.56-.4-.83-.35-.72-.7-1.44-1.06-2.16-.63-.01-1.25-.03-1.8-.08-.66-.06-1.42-.1-2.18-.14Z"/>
              <path className="cls-29" d="M427.47,948.91c.62,1.18,1.27,2.34,1.95,3.51.41.7.83,1.4,1.26,2.1.76.05,1.52.08,2.18.14.55.05,1.17.07,1.8.08-.35-.72-.71-1.44-1.06-2.16-.58-1.19-1.16-2.37-1.72-3.57-.7.01-1.4.02-1.99-.03-.72-.05-1.57-.06-2.42-.08Z"/>
              <path className="cls-408" d="M423.85,940.84c.56,1.53,1.18,3.02,1.86,4.49.55,1.21,1.14,2.4,1.76,3.58.85.02,1.7.03,2.42.08.6.04,1.3.04,1.99.03-.56-1.19-1.11-2.39-1.64-3.6-.64-1.47-1.25-2.95-1.8-4.46-.71.01-1.43.01-2.09-.02-.8-.04-1.66-.06-2.51-.1Z"/>
              <path className="cls-408" d="M421.95,934.49c.13.55.26,1.11.41,1.65.43,1.61.94,3.17,1.5,4.7.85.04,1.71.06,2.51.1.66.03,1.38.03,2.09.02-.56-1.51-1.07-3.04-1.51-4.6-.15-.53-.29-1.05-.43-1.59-.69-.02-1.38-.05-2.07-.1-.83-.05-1.66-.11-2.49-.19Z"/>
              <path className="cls-519" d="M421.21,931c.12.59.25,1.19.38,1.81.12.56.23,1.13.36,1.68.83.08,1.66.14,2.49.19.69.04,1.38.07,2.07.1-.14-.53-.27-1.07-.39-1.61-.14-.62-.27-1.22-.38-1.81-.69-.03-1.37-.08-2.06-.13-.83-.06-1.65-.14-2.48-.22Z"/>
              <path className="cls-137" d="M420.65,927.43c.07.61.16,1.3.24,1.86.08.55.19,1.13.31,1.72.82.09,1.65.16,2.48.22.69.05,1.37.1,2.06.13-.12-.59-.22-1.16-.3-1.7-.05-.34-.1-.72-.15-1.13-.7-.15-1.41-.32-2.11-.49-.85-.2-1.69-.42-2.53-.61Z"/>
              <path className="cls-411" d="M419.73,676.93c0,55.03.02,110.89.06,157.7.02,18.92.12,36.32.05,51.59-.07,15.58-.44,28.96.59,39.31.06.58.14,1.3.21,1.9.84.19,1.68.41,2.53.61.7.17,1.41.34,2.11.49-.05-.41-.09-.82-.13-1.22-1.04-10.41-.66-23.86-.69-39.52-.02-15.17-.06-32.42-.07-51.17-.03-47.04-.04-103.2-.05-158.56-.7-.17-1.41-.42-2.1-.66-.84-.13-1.68-.31-2.51-.47Z"/>
              <path className="cls-465" d="M419.79,438.02c0,1.65,0,3.29,0,4.94,0,2.51,0,5.02,0,7.52.83.03,1.66.05,2.49.05.69,0,1.38.03,2.07.06,0-2.52,0-5.04,0-7.56,0-1.65,0-3.31,0-4.97-.69-.01-1.38-.03-2.07-.03-.83,0-1.66-.01-2.49-.02Z"/>
              <path className="cls-559" d="M419.79,432.39v.69c0,1.65,0,3.29,0,4.94.83,0,1.66.02,2.49.02.69,0,1.38.02,2.07.03v-5.67c-.69,0-1.38,0-2.07-.01-.83,0-1.66,0-2.49,0Z"/>
              <path className="cls-200" d="M419.79,431.69v.69c.83,0,1.66,0,2.49,0,.69,0,1.38,0,2.07.01v-.7c-.69,0-1.38,0-2.07-.01-.83,0-1.66,0-2.49,0Z"/>
              <path className="cls-414" d="M435.63,963.33c.37.36.73.7,1.06,1.02.19.04.39.07.58.1.4.07.79.13,1.17.19-.26-.3-.55-.63-.86-.97-.43-.07-.86-.14-1.31-.21-.21-.04-.42-.08-.64-.12Z"/>
              <path className="cls-306" d="M433.57,961.31c.31.31.61.61.91.9.4.39.78.76,1.15,1.12.21.04.42.08.64.12.45.08.88.15,1.31.21-.31-.34-.63-.71-.96-1.09-.24-.29-.5-.58-.76-.88-.5-.07-1.02-.16-1.55-.25-.25-.04-.5-.09-.74-.14Z"/>
              <path className="cls-96" d="M431.94,959.63c.24.25.47.5.71.74.31.32.62.64.93.94.24.05.49.1.74.14.53.09,1.04.17,1.55.25-.26-.3-.53-.61-.79-.93-.2-.24-.41-.48-.6-.73-.56-.08-1.13-.17-1.71-.26-.28-.05-.55-.1-.82-.15Z"/>
              <path className="cls-624" d="M430.74,958.32c.16.18.33.36.49.54.24.26.47.51.71.76.27.05.54.1.82.15.58.1,1.15.19,1.71.26-.2-.25-.41-.5-.61-.75-.14-.18-.28-.35-.41-.53-.61-.08-1.22-.17-1.83-.28-.3-.05-.59-.1-.88-.16Z"/>
              <path className="cls-229" d="M429.63,957c.21.26.41.51.62.77.16.18.32.37.49.55.29.06.58.11.88.16.62.1,1.22.19,1.83.28-.13-.18-.27-.36-.4-.54-.18-.27-.35-.53-.52-.8-.67-.07-1.33-.16-1.96-.26-.3-.05-.62-.1-.93-.15Z"/>
              <path className="cls-347" d="M427.5,954.2c.49.68,1,1.36,1.52,2.03.2.26.4.52.61.77.31.05.63.1.93.15.63.11,1.29.19,1.96.26-.17-.27-.35-.53-.52-.8-.45-.7-.89-1.39-1.32-2.09-.76-.05-1.52-.1-2.17-.21-.31-.05-.67-.08-1.02-.11Z"/>
              <path className="cls-14" d="M423.93,948.67c.67,1.18,1.38,2.33,2.14,3.47.46.69.94,1.38,1.43,2.06.36.03.71.06,1.02.11.65.11,1.41.16,2.17.21-.43-.7-.85-1.4-1.26-2.1-.68-1.16-1.33-2.32-1.95-3.51-.85-.02-1.7-.05-2.4-.16-.34-.05-.74-.06-1.15-.08Z"/>
              <path className="cls-140" d="M420.16,940.52c.56,1.57,1.2,3.08,1.9,4.57.58,1.22,1.2,2.41,1.87,3.59.41.02.81.03,1.15.08.7.11,1.55.14,2.4.16-.62-1.18-1.21-2.37-1.76-3.58-.67-1.47-1.3-2.96-1.86-4.49-.85-.04-1.7-.09-2.48-.2-.37-.05-.79-.08-1.21-.12Z"/>
              <path className="cls-578" d="M418.28,934.03c.12.55.26,1.11.4,1.66.42,1.66.91,3.27,1.47,4.83.42.04.84.07,1.21.12.78.11,1.63.16,2.48.2-.56-1.53-1.07-3.09-1.5-4.7-.15-.54-.28-1.1-.41-1.65-.83-.08-1.65-.17-2.47-.27-.39-.05-.79-.11-1.19-.19Z"/>
              <path className="cls-243" d="M417.58,930.56c.12.59.24,1.19.36,1.8.11.56.23,1.12.35,1.67.4.07.8.14,1.19.19.82.11,1.64.2,2.47.27-.13-.55-.25-1.12-.36-1.68-.12-.61-.26-1.22-.38-1.81-.82-.09-1.64-.18-2.46-.29-.39-.05-.78-.1-1.17-.16Z"/>
              <path className="cls-527" d="M417,926.78c.08.69.17,1.37.26,2.05.08.56.19,1.13.31,1.72.39.05.78.11,1.17.16.82.11,1.64.2,2.46.29-.12-.59-.23-1.16-.31-1.72-.08-.56-.17-1.26-.24-1.86-.84-.19-1.67-.36-2.48-.48-.39-.05-.78-.11-1.16-.17Z"/>
              <path className="cls-279" d="M416.03,676.47c.03,55.01.07,110.94.13,157.69,0,1.83,0,3.64,0,5.44.04,17.24.12,33.13.06,47.16,0,1.4-.01,2.79-.02,4.15-.07,13.23-.32,24.72.57,33.81.07.69.14,1.37.22,2.06.39.06.77.12,1.16.17.81.11,1.64.28,2.48.48-.07-.61-.15-1.32-.21-1.9-1.03-10.35-.66-23.73-.59-39.31.07-15.27-.03-32.67-.05-51.59-.05-46.81-.06-102.66-.06-157.7-.83-.16-1.66-.32-2.47-.41-.41-.01-.82-.03-1.23-.05Z"/>
              <path className="cls-425" d="M416,438c0,1.64,0,3.28,0,4.92,0,2.5,0,5,0,7.5.43,0,.86.01,1.29.01.83,0,1.66.03,2.49.05,0-2.51,0-5.01,0-7.52,0-1.65,0-3.29,0-4.94-.83,0-1.66-.02-2.49-.02-.43,0-.86,0-1.29,0Z"/>
              <path className="cls-330" d="M416,432.38v5.61c.43,0,.86,0,1.29,0,.83,0,1.66,0,2.49.02,0-1.65,0-3.29,0-4.94v-.69c-.83,0-1.66,0-2.49,0-.43,0-.86,0-1.29,0Z"/>
              <path className="cls-492" d="M416,431.69v.69c.43,0,.86,0,1.29,0,.83,0,1.66,0,2.49,0v-.69c-.83,0-1.66,0-2.49,0-.43,0-.86,0-1.29,0Z"/>
              <path className="cls-275" d="M434.32,963.06c.41.37.8.72,1.18,1.05.21.04.41.09.62.13.2.04.39.08.59.11-.33-.32-.69-.66-1.06-1.02-.21-.04-.42-.09-.64-.13-.23-.05-.45-.09-.68-.14Z"/>
              <path className="cls-372" d="M432.07,960.99c.33.31.66.62.99.92.43.4.86.78,1.27,1.15.23.05.45.1.68.14.22.04.43.09.64.13-.37-.36-.76-.73-1.15-1.12-.3-.29-.6-.59-.91-.9-.24-.05-.49-.1-.74-.15-.26-.05-.52-.11-.77-.17Z"/>
              <path className="cls-205" d="M430.28,959.27c.26.26.52.51.77.76.34.33.68.65,1.01.96.25.06.51.12.77.17.25.05.5.1.74.15-.31-.31-.62-.62-.93-.94-.24-.24-.47-.49-.71-.74-.27-.05-.54-.11-.82-.17-.29-.06-.56-.12-.84-.19Z"/>
              <path className="cls-310" d="M428.97,957.94c.18.18.36.37.54.55.26.26.52.52.78.78.28.07.55.13.84.19.28.06.55.11.82.17-.24-.25-.47-.51-.71-.76-.16-.18-.33-.36-.49-.54-.29-.06-.58-.12-.87-.18-.3-.06-.6-.13-.89-.2Z"/>
              <path className="cls-300" d="M427.75,956.64c.23.25.45.5.68.75.18.19.36.37.53.56.3.07.59.14.89.2.29.06.58.12.87.18-.16-.18-.32-.36-.49-.55-.21-.26-.42-.51-.62-.77-.31-.05-.63-.11-.93-.17-.31-.07-.63-.13-.95-.19Z"/>
              <path className="cls-259" d="M425.42,953.9c.53.67,1.09,1.33,1.66,1.99.22.25.44.5.67.75.32.07.64.13.95.19.3.06.61.12.93.17-.21-.26-.41-.52-.61-.77-.52-.67-1.03-1.35-1.52-2.03-.36-.03-.71-.07-1.02-.14-.32-.07-.69-.11-1.05-.16Z"/>
              <path className="cls-111" d="M421.58,948.42c.71,1.17,1.48,2.33,2.3,3.45.5.68,1.01,1.36,1.55,2.03.36.05.73.09,1.05.16.31.07.67.1,1.02.14-.49-.68-.97-1.37-1.43-2.06-.76-1.14-1.47-2.29-2.14-3.47-.41-.02-.81-.04-1.16-.11-.36-.08-.77-.11-1.19-.13Z"/>
              <path className="cls-203" d="M417.65,940.15c.57,1.6,1.22,3.16,1.96,4.66.6,1.23,1.26,2.44,1.97,3.61.42.03.84.06,1.19.13.34.07.75.1,1.16.11-.67-1.18-1.29-2.37-1.87-3.59-.7-1.48-1.34-3-1.9-4.57-.42-.04-.85-.09-1.23-.18-.4-.09-.84-.14-1.27-.19Z"/>
              <path className="cls-259" d="M415.84,933.57c.11.53.22,1.05.34,1.59.4,1.73.89,3.4,1.46,5,.43.05.87.1,1.27.19.39.09.81.13,1.23.18-.56-1.57-1.05-3.17-1.47-4.83-.14-.54-.28-1.11-.4-1.66-.4-.07-.8-.15-1.2-.22-.41-.08-.83-.16-1.24-.24Z"/>
              <path className="cls-122" d="M415.22,930.2c.1.59.21,1.19.32,1.8.1.52.19,1.04.3,1.57.41.08.82.17,1.24.24.4.07.8.15,1.2.22-.12-.55-.24-1.12-.35-1.67-.11-.61-.24-1.21-.36-1.8-.39-.05-.78-.11-1.16-.17-.4-.06-.8-.12-1.19-.19Z"/>
              <path className="cls-345" d="M414.71,926.69c.07.59.15,1.19.23,1.78.08.56.18,1.14.28,1.73.4.06.79.13,1.19.19.39.06.77.12,1.16.17-.12-.59-.23-1.17-.31-1.72-.1-.68-.18-1.37-.26-2.05-.39-.06-.77-.12-1.15-.18-.39-.05-.77.02-1.14.09Z"/>
              <path className="cls-596" d="M413.57,684.68c.07,64.18.16,125.96.23,161.54,0,3.53.02,6.85.02,9.94.06,17,.07,30.77.11,41.73.04,11.68-.05,20.66.57,27.02.06.6.13,1.19.2,1.78.37-.07.75-.15,1.14-.09.38.06.76.12,1.15.18-.08-.68-.15-1.37-.22-2.06-.89-9.09-.65-20.58-.57-33.81,0-1.36.02-2.75.02-4.15.06-14.02-.02-29.92-.06-47.16,0-1.8,0-3.61,0-5.44-.07-46.75-.11-102.68-.13-157.69-.41-.02-.82-.04-1.22-.06-.43,1.24-.83,4.75-1.24,8.26Z"/>
              <path className="cls-330" d="M413.37,436.69v4.56c0,2.26,0,4.66,0,7.17.44.99.89,1.98,1.34,1.99.43,0,.86,0,1.29.01,0-2.5,0-5,0-7.5,0-1.64,0-3.28,0-4.92-.43,0-.86,0-1.29,0-.45,0-.89-.65-1.34-1.31Z"/>
              <path className="cls-600" d="M413.37,432.19v4.49c.44.65.89,1.31,1.34,1.31.43,0,.86,0,1.29,0v-5.61c-.43,0-.86,0-1.3,0-.45,0-.89-.1-1.34-.19Z"/>
              <path className="cls-217" d="M413.37,431.69v.5c.44.1.89.19,1.34.19.43,0,.86,0,1.3,0v-.69c-.43,0-.86,0-1.3,0-.45,0-.89,0-1.34,0Z"/>
              <path className="cls-406" d="M432.33,962.58c.44.38.87.75,1.27,1.09.43.11.85.21,1.27.3.21.05.42.09.62.14-.38-.33-.77-.68-1.18-1.05-.23-.05-.45-.1-.68-.16-.44-.1-.87-.21-1.3-.32Z"/>
              <path className="cls-175" d="M429.89,960.42c.36.33.72.64,1.07.96.47.42.93.82,1.37,1.2.43.12.86.22,1.3.32.23.05.46.11.68.16-.41-.37-.83-.75-1.27-1.15-.32-.3-.65-.61-.99-.92-.25-.06-.51-.12-.77-.19-.47-.11-.94-.24-1.41-.38Z"/>
              <path className="cls-2" d="M427.97,958.65c.28.26.56.52.83.78.36.34.73.67,1.09,1,.47.13.94.26,1.41.38.26.06.52.13.77.19-.33-.31-.67-.64-1.01-.96-.26-.25-.52-.5-.77-.76-.28-.07-.55-.14-.83-.21-.49-.12-.99-.26-1.48-.41Z"/>
              <path className="cls-261" d="M426.57,957.31c.19.19.38.37.57.55.27.27.55.53.83.79.49.15.99.29,1.48.41.28.07.56.14.83.21-.26-.26-.52-.51-.78-.78-.18-.18-.36-.36-.54-.55-.3-.07-.59-.14-.89-.22-.5-.13-1.01-.27-1.51-.42Z"/>
              <path className="cls-217" d="M425.31,956.03c.23.24.47.48.7.72.19.19.37.37.56.56.5.15,1.01.29,1.51.42.3.08.59.15.89.22-.18-.18-.36-.37-.53-.56-.23-.25-.46-.5-.68-.75-.32-.07-.64-.13-.94-.21-.51-.13-1.01-.26-1.5-.4Z"/>
              <path className="cls-229" d="M422.93,953.38c.54.65,1.1,1.29,1.69,1.93.22.24.45.49.68.73.5.14,1,.27,1.5.4.3.08.62.15.94.21-.23-.25-.45-.5-.67-.75-.57-.66-1.13-1.32-1.66-1.99-.36-.05-.73-.09-1.04-.17-.49-.12-.97-.24-1.45-.36Z"/>
              <path className="cls-584" d="M419.1,948c.7,1.16,1.46,2.29,2.28,3.39.5.67,1.01,1.33,1.56,1.98.48.12.96.23,1.45.36.31.08.68.12,1.04.17-.53-.67-1.05-1.34-1.55-2.03-.82-1.13-1.59-2.28-2.3-3.45-.42-.03-.83-.05-1.17-.13-.44-.1-.87-.2-1.3-.29Z"/>
              <path className="cls-424" d="M415.3,939.79c.54,1.6,1.17,3.15,1.88,4.64.58,1.22,1.23,2.42,1.93,3.58.43.1.86.19,1.3.29.34.07.76.1,1.17.13-.71-1.17-1.37-2.38-1.97-3.61-.73-1.5-1.39-3.05-1.96-4.66-.43-.05-.86-.09-1.24-.16-.38-.07-.74-.14-1.1-.2Z"/>
              <path className="cls-484" d="M413.61,933.22c.1.52.2,1.04.32,1.57.38,1.73.83,3.4,1.37,5,.36.07.73.14,1.1.2.38.07.81.11,1.24.16-.57-1.6-1.06-3.27-1.46-5-.12-.54-.23-1.06-.34-1.59-.41-.08-.82-.16-1.22-.23-.34-.05-.68-.09-1.01-.12Z"/>
              <path className="cls-137" d="M413.07,929.88c.08.6.17,1.2.27,1.8.08.51.18,1.02.27,1.54.34.03.67.07,1.01.12.4.07.81.15,1.22.23-.11-.53-.2-1.05-.3-1.57-.11-.61-.22-1.21-.32-1.8-.4-.06-.79-.13-1.18-.2-.33-.05-.65-.09-.97-.12Z"/>
              <path className="cls-384" d="M412.62,926.33c.07.59.15,1.18.22,1.77.07.59.15,1.17.23,1.78.32.03.64.07.97.12.39.07.79.13,1.18.2-.1-.59-.2-1.16-.28-1.73-.08-.59-.16-1.19-.23-1.78-.37.07-.74.14-1.13.08-.31-.05-.64-.25-.96-.44Z"/>
              <path className="cls-371" d="M411.43,684.45c.08,61.81.16,121.41.23,157.39.01,5.61,0,10.81-.04,15.53-.03,33.84-.34,55.48.81,67.19.06.59.12,1.18.19,1.78.32.19.65.39.96.44.38.06.75-.01,1.13-.08-.07-.59-.14-1.19-.2-1.78-.62-6.35-.54-15.34-.57-27.02-.04-10.96-.06-24.73-.11-41.73,0-3.09-.02-6.41-.02-9.94-.08-35.57-.16-97.36-.23-161.54-.4,3.51-.81,7.02-1.23,8.26-.3-1.61-.61-5.05-.91-8.49Z"/>
              <path className="cls-279" d="M411.2,448.38c0,2.51,0,5.12,0,7.82v.92c0,24.99.11,128.84.23,227.33.31,3.44.62,6.89.91,8.49.42-1.24.82-4.75,1.23-8.26-.11-98.55-.19-202.47-.2-227.51v-.92c0-2.71,0-5.33,0-7.84-.44-.99-.89-1.98-1.33-1.99-.28,0-.56.97-.84,1.95Z"/>
              <path className="cls-519" d="M411.2,436.68c0,1.43,0,2.94,0,4.55,0,2.26,0,4.65,0,7.15.28-.98.56-1.95.84-1.95.44,0,.88.99,1.33,1.99,0-2.51,0-4.91,0-7.17v-4.56c-.44-.65-.89-1.31-1.33-1.31-.28,0-.56.65-.84,1.3Z"/>
              <path className="cls-592" d="M411.2,432.2v.51c0,1.22,0,2.54,0,3.97.28-.65.56-1.3.84-1.3.44,0,.88.65,1.33,1.31v-4.49c-.44-.1-.89-.19-1.33-.19-.28,0-.56.1-.84.19Z"/>
              <path className="cls-526" d="M411.2,431.7v.5c.28-.1.56-.19.84-.19.44,0,.88.09,1.33.19v-.5c-.44,0-.89,0-1.33,0-.28,0-.56,0-.84,0Z"/>
              <path className="cls-233" d="M429.89,961.86c.47.4.91.78,1.33,1.14.37.12.73.22,1.09.33.44.13.87.24,1.3.35-.4-.34-.83-.71-1.27-1.09-.43-.12-.87-.24-1.32-.37-.37-.11-.74-.23-1.12-.35Z"/>
              <path className="cls-557" d="M427.32,959.62c.38.34.76.67,1.13.99.49.43.98.85,1.45,1.25.38.12.75.24,1.12.35.45.13.89.26,1.32.37-.44-.38-.9-.79-1.37-1.2-.35-.31-.71-.63-1.07-.96-.47-.13-.94-.28-1.41-.42-.39-.12-.78-.25-1.17-.38Z"/>
              <path className="cls-376" d="M425.31,957.8c.29.27.58.53.87.79.38.34.76.69,1.15,1.02.39.14.78.26,1.17.38.47.14.94.29,1.41.42-.36-.33-.73-.66-1.09-1-.28-.26-.56-.51-.83-.78-.49-.15-.99-.3-1.47-.45-.4-.13-.8-.26-1.19-.4Z"/>
              <path className="cls-372" d="M423.87,956.44c.19.19.39.37.58.56.28.26.57.53.86.8.4.14.79.27,1.19.4.48.15.97.31,1.47.45-.28-.26-.55-.52-.83-.79-.19-.18-.38-.37-.57-.55-.5-.15-1-.3-1.49-.46-.41-.13-.81-.27-1.21-.41Z"/>
              <path className="cls-194" d="M422.62,955.19c.22.23.45.47.68.69.19.18.38.37.57.56.4.14.8.28,1.21.41.49.16.99.31,1.49.46-.19-.19-.38-.37-.56-.56-.24-.24-.47-.48-.7-.72-.5-.14-.99-.28-1.48-.44-.41-.13-.81-.26-1.21-.4Z"/>
              <path className="cls-269" d="M420.35,952.64c.51.63,1.05,1.24,1.61,1.85.21.23.44.47.66.7.4.13.8.27,1.21.4.49.16.99.3,1.48.44-.23-.24-.46-.48-.68-.73-.59-.63-1.15-1.28-1.69-1.93-.48-.12-.95-.24-1.43-.39-.39-.12-.78-.23-1.16-.35Z"/>
              <path className="cls-448" d="M416.77,947.44c.65,1.13,1.35,2.22,2.12,3.29.47.65.96,1.29,1.47,1.91.38.11.76.23,1.16.35.48.14.95.27,1.43.39-.54-.65-1.06-1.31-1.56-1.98-.82-1.1-1.58-2.24-2.28-3.39-.43-.1-.86-.2-1.29-.3-.35-.09-.7-.17-1.05-.26Z"/>
              <path className="cls-370" d="M413.3,939.45c.49,1.55,1.05,3.06,1.7,4.51.53,1.19,1.12,2.35,1.76,3.48.34.09.69.18,1.05.26.43.1.86.2,1.29.3-.7-1.16-1.34-2.35-1.93-3.58-.71-1.49-1.34-3.04-1.88-4.64-.36-.07-.72-.13-1.09-.18-.3-.04-.61-.1-.91-.16Z"/>
              <path className="cls-232" d="M411.8,933.11c.08.51.17,1.02.28,1.53.33,1.65.74,3.26,1.22,4.81.3.06.6.12.91.16.37.05.73.11,1.09.18-.54-1.6-1-3.27-1.37-5-.11-.53-.22-1.05-.32-1.57-.34-.03-.67-.05-1-.07-.27-.02-.54-.03-.81-.04Z"/>
              <path className="cls-560" d="M411.35,929.74c.06.64.13,1.27.22,1.86.07.5.15,1,.23,1.51.27.01.54.02.81.04.33.02.66.04,1,.07-.1-.52-.19-1.03-.27-1.54-.1-.6-.19-1.2-.27-1.8-.32-.03-.64-.06-.95-.09-.26-.03-.52-.04-.77-.05Z"/>
              <path className="cls-547" d="M410.93,925.77c.07.68.15,1.36.23,2.02.07.65.13,1.3.19,1.95.25.01.51.02.77.05.31.04.63.06.95.09-.08-.6-.15-1.19-.23-1.78-.08-.59-.15-1.18-.22-1.77-.32-.19-.64-.39-.95-.44-.25-.05-.5-.09-.74-.12Z"/>
              <path className="cls-364" d="M409.8,676.54c.04,54.3.09,109.09.14,155.44.04,38.62-1.01,71.18.78,91.74.06.68.13,1.37.2,2.05.24.04.49.07.74.12.3.06.62.25.95.44-.07-.59-.14-1.18-.19-1.78-1.14-11.71-.84-33.35-.81-67.19.03-4.72.05-9.92.04-15.53-.07-35.98-.15-95.58-.23-157.39-.31-3.44-.61-6.88-.9-8.47-.25.57-.49.67-.73.56Z"/>
              <path className="cls-146" d="M409.68,450.38c0,2.49,0,4.99,0,7.48.01,40.93.06,128.89.12,218.68.23.11.47,0,.73-.56.29,1.59.59,5.03.9,8.47-.12-98.49-.22-202.34-.23-227.33v-.92c0-2.7,0-5.31,0-7.82-.28.98-.56,1.96-.83,1.99-.23.02-.46.02-.69.01Z"/>
              <path className="cls-146" d="M409.68,437.99c0,1.64,0,3.28,0,4.91,0,2.49,0,4.99,0,7.48.23,0,.45.01.69-.01.27-.03.55-1.01.83-1.99,0-2.51,0-4.9,0-7.15,0-1.61,0-3.12,0-4.55-.28.65-.56,1.3-.84,1.31-.23,0-.46,0-.68,0Z"/>
              <path className="cls-251" d="M409.68,432.39v.69c0,1.64,0,3.28,0,4.91.23,0,.45,0,.68,0,.28,0,.56-.66.84-1.31,0-1.43,0-2.75,0-3.97v-.51c-.28.1-.56.19-.84.19-.23,0-.46,0-.68,0Z"/>
              <path className="cls-413" d="M409.68,431.7v.69c.23,0,.45,0,.68,0,.28,0,.56-.1.84-.19v-.5c-.28,0-.56,0-.84,0-.23,0-.46,0-.68,0Z"/>
              <path className="cls-143" d="M427.45,960.97c.48.42.95.82,1.38,1.19.43.16.86.32,1.29.47.37.13.74.25,1.1.36-.41-.35-.86-.73-1.33-1.14-.38-.12-.75-.25-1.13-.39-.44-.16-.87-.32-1.31-.5Z"/>
              <path className="cls-582" d="M424.8,958.66c.39.34.78.69,1.15,1.02.5.44,1.01.88,1.49,1.3.44.17.88.34,1.31.5.38.14.75.27,1.13.39-.47-.4-.95-.82-1.45-1.25-.37-.32-.75-.65-1.13-.99-.39-.14-.78-.28-1.17-.42-.45-.17-.9-.35-1.35-.53Z"/>
              <path className="cls-179" d="M422.76,956.82c.29.27.59.54.88.8.38.34.78.7,1.16,1.04.45.19.9.36,1.35.53.39.15.78.29,1.17.42-.38-.34-.77-.68-1.15-1.02-.29-.26-.58-.53-.87-.79-.4-.14-.79-.29-1.19-.44-.45-.17-.91-.36-1.36-.54Z"/>
              <path className="cls-106" d="M421.32,955.48c.19.18.39.37.58.55.28.26.57.53.86.8.45.19.9.37,1.36.54.39.15.79.3,1.19.44-.29-.27-.58-.54-.86-.8-.19-.18-.39-.37-.58-.56-.4-.14-.8-.29-1.19-.43-.46-.17-.91-.35-1.36-.53Z"/>
              <path className="cls-346" d="M420.11,954.29c.21.22.43.43.64.64.18.18.38.36.57.54.45.18.9.36,1.36.53.4.15.79.29,1.19.43-.19-.19-.38-.37-.57-.56-.23-.23-.46-.46-.68-.69-.4-.13-.79-.27-1.18-.41-.45-.16-.89-.32-1.33-.49Z"/>
              <path className="cls-109" d="M417.98,951.89c.48.6.98,1.18,1.51,1.75.2.22.41.44.62.65.44.17.88.33,1.33.49.39.14.78.28,1.18.41-.22-.23-.45-.47-.66-.7-.56-.61-1.09-1.22-1.61-1.85-.38-.11-.75-.23-1.12-.34-.43-.13-.84-.27-1.26-.41Z"/>
              <path className="cls-235" d="M414.6,946.84c.6,1.1,1.27,2.18,2,3.22.44.63.9,1.24,1.38,1.84.41.14.83.27,1.26.41.37.12.74.23,1.12.34-.51-.63-1-1.27-1.47-1.91-.77-1.07-1.47-2.16-2.12-3.29-.34-.09-.68-.18-1.02-.27-.39-.11-.77-.22-1.15-.33Z"/>
              <path className="cls-92" d="M411.4,939.06c.43,1.49.95,2.94,1.55,4.36.49,1.17,1.05,2.31,1.65,3.42.38.11.76.22,1.15.33.34.09.67.18,1.02.27-.65-1.13-1.23-2.28-1.76-3.48-.65-1.45-1.21-2.96-1.7-4.51-.3-.06-.6-.12-.89-.17-.34-.06-.68-.14-1.01-.22Z"/>
              <path className="cls-133" d="M410.11,933.01c.07.49.15.99.24,1.49.28,1.55.63,3.07,1.06,4.56.33.08.67.16,1.01.22.29.05.59.11.89.17-.49-1.55-.89-3.16-1.22-4.81-.1-.51-.19-1.02-.28-1.53-.27-.01-.53-.02-.8-.04-.3-.02-.6-.03-.9-.06Z"/>
              <path className="cls-413" d="M409.74,929.62c.06.69.11,1.35.18,1.92.06.49.12.98.19,1.47.3.02.6.04.9.06.26.01.53.03.8.04-.08-.51-.16-1.01-.23-1.51-.09-.59-.16-1.22-.22-1.86-.25-.01-.51-.02-.76-.05-.29-.03-.57-.05-.86-.07Z"/>
              <path className="cls-163" d="M409.41,925.55c.05.65.11,1.29.17,1.91.06.73.11,1.46.16,2.15.28.02.57.03.86.07.25.03.5.04.76.05-.06-.64-.12-1.3-.19-1.95-.08-.66-.16-1.34-.23-2.02-.24-.04-.48-.07-.72-.1-.27-.04-.54-.08-.8-.11Z"/>
              <path className="cls-423" d="M408.3,675.66c.02,53.9.05,108.76.08,154.89.03,39.14-.54,72.21.87,93.01.05.67.1,1.34.15,1.99.26.03.53.07.8.11.24.04.48.07.72.1-.07-.68-.15-1.37-.2-2.05-1.79-20.56-.74-53.12-.78-91.74-.05-46.35-.1-101.14-.14-155.44-.23-.11-.46-.43-.7-.72-.27-.12-.54-.16-.8-.16Z"/>
              <path className="cls-253" d="M408.23,450.34c0,2.49,0,4.97,0,7.46,0,40.89.03,128.11.07,217.86.26,0,.53.04.8.16.24.29.47.61.7.72-.07-89.79-.11-177.75-.12-218.68,0-2.49,0-4.99,0-7.48-.23,0-.45-.02-.67-.03-.26,0-.52-.01-.77-.02Z"/>
              <path className="cls-184" d="M408.23,437.99c0,1.63,0,3.27,0,4.9,0,2.49,0,4.97,0,7.46.26,0,.51,0,.77.02.22,0,.45.02.67.03,0-2.49,0-4.99,0-7.48,0-1.64,0-3.28,0-4.91-.23,0-.45,0-.68,0-.26,0-.52,0-.77,0Z"/>
              <path className="cls-298" d="M408.23,432.4v5.59c.26,0,.51,0,.77,0,.22,0,.45,0,.68,0,0-1.64,0-3.28,0-4.91v-.69c-.23,0-.45,0-.68,0-.26,0-.52,0-.77,0Z"/>
              <path className="cls-301" d="M408.23,431.71v.69c.25,0,.51,0,.77,0,.22,0,.45,0,.68,0v-.69c-.23,0-.45,0-.68,0-.26,0-.52,0-.77,0Z"/>
              <path className="cls-579" d="M424.94,959.89c.49.43.97.84,1.41,1.22.4.18.79.36,1.18.52.43.18.87.36,1.3.52-.43-.37-.9-.77-1.38-1.19-.44-.17-.88-.36-1.32-.54-.4-.17-.8-.35-1.19-.53Z"/>
              <path className="cls-131" d="M422.28,957.54c.39.35.78.69,1.16,1.03.51.45,1.02.9,1.51,1.32.4.18.79.36,1.19.53.44.19.88.37,1.32.54-.48-.42-.99-.86-1.49-1.3-.37-.33-.76-.67-1.15-1.02-.45-.19-.89-.38-1.33-.57-.4-.18-.8-.36-1.2-.54Z"/>
              <path className="cls-528" d="M420.24,955.71c.29.26.58.53.87.79.38.35.78.7,1.17,1.04.4.18.79.37,1.2.54.44.2.89.39,1.33.57-.39-.34-.78-.7-1.16-1.04-.29-.26-.59-.53-.88-.8-.45-.19-.9-.38-1.34-.57-.4-.18-.8-.36-1.19-.54Z"/>
              <path className="cls-219" d="M418.8,954.39c.19.18.38.36.58.53.28.26.57.52.86.78.39.18.79.36,1.19.54.44.19.89.39,1.34.57-.29-.27-.58-.54-.86-.8-.19-.18-.39-.37-.58-.55-.45-.18-.89-.37-1.33-.56-.4-.17-.79-.35-1.18-.53Z"/>
              <path className="cls-459" d="M417.64,953.28c.2.2.4.39.6.59.18.17.37.35.56.53.39.18.78.35,1.18.53.44.19.88.38,1.33.56-.19-.18-.38-.37-.57-.54-.22-.21-.43-.42-.64-.64-.44-.17-.87-.34-1.3-.52-.39-.16-.78-.33-1.16-.49Z"/>
              <path className="cls-575" d="M415.63,951.01c.45.57.93,1.13,1.43,1.66.19.21.38.4.58.6.38.17.77.33,1.16.49.43.18.86.35,1.3.52-.21-.22-.42-.44-.62-.65-.53-.57-1.03-1.15-1.51-1.75-.41-.14-.83-.28-1.24-.44-.37-.14-.74-.29-1.11-.44Z"/>
              <path className="cls-172" d="M412.47,946.13c.56,1.08,1.18,2.12,1.86,3.12.41.61.84,1.2,1.3,1.77.37.15.74.3,1.11.44.41.16.82.3,1.24.44-.48-.6-.94-1.21-1.38-1.84-.72-1.03-1.39-2.12-2-3.22-.38-.11-.75-.23-1.12-.35-.34-.11-.67-.23-1.01-.36Z"/>
              <path className="cls-180" d="M409.57,938.58c.38,1.44.85,2.85,1.39,4.23.45,1.13.95,2.24,1.51,3.32.33.13.67.25,1.01.36.37.12.75.24,1.12.35-.6-1.1-1.16-2.25-1.65-3.42-.6-1.42-1.11-2.87-1.55-4.36-.33-.08-.66-.16-.98-.23-.29-.06-.58-.15-.86-.24Z"/>
              <path className="cls-126" d="M408.45,932.78c.06.48.12.97.2,1.45.23,1.46.53,2.92.92,4.35.28.09.57.18.86.24.32.07.65.15.98.23-.43-1.49-.79-3.01-1.06-4.56-.09-.5-.17-.99-.24-1.49-.3-.02-.59-.05-.88-.09-.26-.04-.52-.08-.78-.14Z"/>
              <path className="cls-585" d="M408.15,929.42c.05.7.1,1.36.15,1.92.04.48.09.96.15,1.44.25.06.51.1.78.14.29.04.58.07.88.09-.07-.49-.13-.98-.19-1.47-.07-.57-.13-1.23-.18-1.92-.28-.02-.56-.04-.84-.09-.25-.04-.5-.08-.74-.12Z"/>
              <path className="cls-302" d="M407.91,925.33c.04.63.06,1.22.1,1.81.05.8.09,1.58.14,2.29.24.04.49.07.74.12.28.05.56.07.84.09-.06-.69-.11-1.43-.16-2.15-.06-.62-.11-1.26-.17-1.91-.26-.03-.53-.07-.79-.11-.24-.04-.47-.08-.71-.12Z"/>
              <path className="cls-237" d="M406.83,688.36c0,62.56.02,122.31.03,157.82,0,10.39-.01,19.27,0,26.26.02,15.48.33,38.3.96,50.96.03.67.06,1.31.1,1.94.23.04.47.08.71.12.26.04.52.08.79.11-.05-.65-.11-1.32-.15-1.99-1.41-20.8-.85-53.87-.87-93.01-.03-46.13-.06-100.99-.08-154.89-.26,0-.52.03-.78.06-.24,3.26-.47,7.95-.7,12.64Z"/>
              <path className="cls-426" d="M406.79,447.27c0,1.63,0,3.25,0,4.87,0,28.18.02,135.6.03,236.22.23-4.69.46-9.38.7-12.64.26-.03.52-.07.78-.06-.04-89.75-.06-176.97-.07-217.86,0-2.49,0-4.97,0-7.46-.26,0-.51,0-.76,0-.23,0-.45-1.54-.68-3.08Z"/>
              <path className="cls-335" d="M406.79,437.14c0,1.64,0,3.43,0,5.26,0,1.63,0,3.25,0,4.87.22,1.54.45,3.09.68,3.08.25,0,.5,0,.76,0,0-2.49,0-4.97,0-7.46,0-1.63,0-3.27,0-4.9-.25,0-.51,0-.76,0-.23,0-.45-.42-.68-.85Z"/>
              <path className="cls-212" d="M406.79,432.21c0,.17,0,.35,0,.53,0,1.26,0,2.76,0,4.41.22.42.45.85.68.85.25,0,.5,0,.76,0v-5.59c-.26,0-.51,0-.76,0-.23,0-.45-.1-.68-.19Z"/>
              <path className="cls-313" d="M406.79,431.71v.49c.22.1.45.19.68.19.25,0,.5,0,.76,0v-.69c-.26,0-.51,0-.76,0-.23,0-.45,0-.68,0Z"/>
              <path className="cls-372" d="M422.98,958.92c.46.41.89.81,1.32,1.17.29.15.58.3.87.45.4.2.79.39,1.19.57-.44-.38-.92-.8-1.41-1.22-.4-.18-.79-.37-1.18-.57-.26-.13-.52-.26-.78-.4Z"/>
              <path className="cls-282" d="M420.48,956.67c.36.33.73.67,1.09.99.48.43.95.85,1.4,1.26.26.14.52.27.78.4.39.19.79.38,1.18.57-.49-.43-1-.88-1.51-1.32-.38-.33-.77-.68-1.16-1.03-.4-.18-.79-.37-1.17-.56-.21-.1-.41-.21-.62-.31Z"/>
              <path className="cls-149" d="M418.58,954.92c.27.25.53.5.81.75.36.33.73.67,1.09,1,.21.11.41.21.62.31.39.19.78.37,1.17.56-.39-.35-.78-.7-1.17-1.04-.29-.26-.58-.53-.87-.79-.39-.18-.78-.36-1.16-.55-.17-.08-.33-.16-.49-.24Z"/>
              <path className="cls-615" d="M417.25,953.67c.18.17.36.34.54.51.26.24.52.49.79.75.16.08.33.16.49.24.38.18.77.37,1.16.55-.29-.26-.58-.53-.86-.78-.19-.18-.39-.36-.58-.53-.39-.18-.78-.36-1.16-.54-.13-.06-.26-.13-.39-.19Z"/>
              <path className="cls-218" d="M416.13,952.58c.2.2.39.39.6.58.17.16.35.33.52.5.13.06.26.13.39.19.38.18.77.36,1.16.54-.19-.18-.38-.35-.56-.53-.21-.19-.4-.39-.6-.59-.38-.17-.77-.34-1.14-.52-.12-.06-.24-.12-.36-.18Z"/>
              <path className="cls-572" d="M414.14,950.3c.45.58.92,1.13,1.42,1.68.19.21.38.4.58.6.12.06.24.12.36.18.38.18.76.35,1.14.52-.2-.2-.39-.4-.58-.6-.5-.54-.98-1.09-1.43-1.66-.37-.15-.74-.31-1.1-.48-.13-.06-.26-.14-.39-.23Z"/>
              <path className="cls-477" d="M411.03,945.43c.55,1.07,1.16,2.1,1.82,3.1.4.61.83,1.2,1.28,1.77.13.09.26.17.39.23.37.17.73.33,1.1.48-.45-.57-.89-1.16-1.3-1.77-.68-1-1.3-2.04-1.86-3.12-.33-.13-.66-.27-.99-.41-.15-.06-.3-.17-.45-.3Z"/>
              <path className="cls-555" d="M408.22,938.01c.37,1.4.82,2.78,1.34,4.14.43,1.12.93,2.21,1.47,3.28.15.12.3.24.45.3.33.14.66.28.99.41-.56-1.08-1.07-2.18-1.51-3.32-.54-1.38-1.01-2.79-1.39-4.23-.28-.09-.56-.2-.83-.3-.17-.06-.35-.16-.52-.27Z"/>
              <path className="cls-502" d="M407.15,932.36c.06.48.12.96.19,1.43.22,1.41.51,2.82.88,4.22.17.11.34.21.52.27.28.1.55.21.83.3-.38-1.44-.69-2.89-.92-4.35-.08-.49-.14-.97-.2-1.45-.26-.06-.51-.12-.75-.2-.19-.06-.37-.13-.55-.22Z"/>
              <path className="cls-583" d="M406.86,929.07c.05.69.09,1.32.14,1.87.04.47.09.95.15,1.43.18.08.36.16.55.22.25.08.5.15.75.2-.06-.48-.11-.96-.15-1.44-.05-.56-.1-1.22-.15-1.92-.24-.04-.49-.09-.73-.15-.19-.05-.38-.12-.57-.19Z"/>
              <path className="cls-469" d="M406.62,925.01c.03.63.06,1.23.1,1.83.04.79.09,1.55.14,2.23.19.07.38.14.57.19.24.07.48.11.73.15-.05-.7-.09-1.49-.14-2.29-.04-.58-.07-1.18-.1-1.81-.23-.04-.47-.08-.71-.14-.19-.05-.39-.11-.58-.17Z"/>
              <path className="cls-551" d="M405.62,696.65c0,60.02.01,116.84.02,150.77,0,10.65,0,19.64.02,26.55.03,14.68.35,36.84.88,49.11.03.67.06,1.3.09,1.93.19.07.39.13.58.17.24.05.47.1.71.14-.04-.63-.06-1.27-.1-1.94-.64-12.66-.95-35.47-.96-50.96,0-6.99,0-15.86,0-26.26-.01-35.51-.02-95.27-.03-157.82-.23,4.69-.46,9.38-.7,12.63-.18.81-.35-1.76-.51-4.33Z"/>
              <path className="cls-518" d="M405.52,447.21c-.02,1.62-.03,3.25-.04,4.88-.12,19.91.11,74.76.12,139.58,0,33.45,0,69.77.01,104.98.17,2.57.34,5.14.51,4.33.24-3.25.47-7.94.7-12.63-.01-100.62-.03-208.03-.03-236.22,0-1.63,0-3.25,0-4.87-.22-1.54-.45-3.08-.67-3.06-.22.02-.42,1.52-.61,3.01Z"/>
              <path className="cls-342" d="M405.67,437.09c-.03,1.65-.08,3.44-.1,5.25-.02,1.62-.04,3.25-.05,4.88.19-1.5.39-2.99.61-3.01.22-.02.44,1.52.67,3.06,0-1.63,0-3.25,0-4.87,0-1.83,0-3.61,0-5.26-.22-.42-.45-.85-.67-.85-.21,0-.34.39-.46.8Z"/>
              <path className="cls-254" d="M405.57,432.19c.02.17.03.33.04.51.09,1.24.09,2.74.06,4.39.12-.4.25-.8.46-.8.22,0,.44.42.67.85,0-1.64,0-3.14,0-4.41,0-.18,0-.36,0-.53-.22-.1-.45-.19-.66-.19-.21,0-.38.09-.56.18Z"/>
              <path className="cls-470" d="M405.52,431.71c.02.15.04.31.06.47.17-.09.35-.18.56-.18.22,0,.44.1.66.19v-.49c-.22,0-.45,0-.66,0-.21,0-.41,0-.61,0Z"/>
              <path className="cls-446" d="M421.13,957.87c.39.37.76.73,1.13,1.05.39.24.78.47,1.17.69.29.16.58.32.86.48-.42-.37-.86-.76-1.32-1.17-.26-.14-.52-.28-.78-.43-.35-.2-.71-.41-1.06-.62Z"/>
              <path className="cls-369" d="M419.03,955.88c.3.3.61.6.91.87.4.37.8.75,1.19,1.12.35.22.71.42,1.06.62.26.15.52.29.78.43-.46-.41-.92-.84-1.4-1.26-.36-.32-.73-.65-1.09-.99-.21-.11-.41-.21-.62-.33-.28-.15-.56-.31-.83-.47Z"/>
              <path className="cls-431" d="M417.45,954.33c.22.23.44.46.67.67.3.28.61.58.91.88.28.16.55.32.83.47.21.11.41.22.62.33-.36-.33-.73-.67-1.09-1-.27-.25-.54-.5-.81-.75-.16-.08-.32-.16-.49-.25-.22-.11-.44-.23-.65-.34Z"/>
              <path className="cls-246" d="M416.34,953.21c.15.15.3.31.45.46.22.21.44.44.66.67.21.12.43.23.65.34.16.08.32.17.49.25-.27-.25-.53-.5-.79-.75-.18-.17-.36-.34-.54-.51-.13-.06-.26-.13-.39-.19-.18-.09-.35-.18-.53-.27Z"/>
              <path className="cls-292" d="M415.28,952.11c.2.22.41.43.62.65.14.14.29.3.44.45.17.09.35.18.53.27.13.06.26.13.39.19-.18-.17-.35-.34-.52-.5-.2-.2-.4-.39-.6-.58-.12-.06-.24-.13-.36-.19-.16-.09-.33-.18-.49-.28Z"/>
              <path className="cls-218" d="M413.2,949.65c.47.61.96,1.22,1.47,1.81.2.23.4.44.6.66.16.09.33.19.49.28.12.07.24.13.36.19-.2-.2-.39-.39-.58-.6-.5-.54-.97-1.1-1.42-1.68-.13-.09-.26-.19-.39-.26-.18-.11-.36-.25-.54-.39Z"/>
              <path className="cls-436" d="M409.99,944.56c.57,1.09,1.2,2.16,1.89,3.21.42.64.86,1.26,1.33,1.88.18.15.37.29.54.39.13.08.26.17.39.26-.45-.58-.88-1.17-1.28-1.77-.67-1-1.28-2.03-1.82-3.1-.15-.12-.3-.25-.44-.34-.2-.12-.4-.32-.6-.53Z"/>
              <path className="cls-543" d="M407.06,937.12c.39,1.38.85,2.75,1.4,4.11.45,1.12.96,2.23,1.53,3.32.2.21.41.41.6.53.14.09.29.22.44.34-.55-1.07-1.04-2.16-1.47-3.28-.53-1.36-.98-2.74-1.34-4.14-.17-.11-.34-.23-.5-.34-.22-.14-.44-.34-.66-.55Z"/>
              <path className="cls-534" d="M405.91,931.63c.06.46.14.92.21,1.38.24,1.36.55,2.73.93,4.11.22.21.43.41.66.55.16.1.33.23.5.34-.37-1.4-.66-2.81-.88-4.22-.07-.47-.14-.96-.19-1.43-.18-.08-.36-.18-.54-.28-.24-.14-.47-.29-.7-.45Z"/>
              <path className="cls-329" d="M405.57,928.52c.05.63.11,1.23.16,1.75.05.45.11.91.17,1.36.23.16.46.31.7.45.18.1.35.2.54.28-.06-.48-.1-.96-.15-1.43-.05-.54-.1-1.18-.14-1.87-.19-.07-.37-.15-.55-.22-.25-.09-.49-.21-.73-.33Z"/>
              <path className="cls-476" d="M405.28,924.53c.04.67.08,1.33.14,2,.05.68.1,1.36.15,1.99.24.12.49.24.73.33.18.07.37.15.55.22-.05-.69-.09-1.44-.14-2.23-.04-.6-.07-1.2-.1-1.83-.19-.07-.39-.13-.57-.19-.26-.08-.51-.18-.77-.29Z"/>
              <path className="cls-580" d="M404.5,683.62c-.01,51.6-.02,103.61,0,147.55,0,2.42,0,4.82,0,7.19.01,35.31-.12,64.95.68,84.18.03.67.06,1.33.1,2,.25.1.51.21.77.29.19.06.38.13.57.19-.03-.63-.06-1.26-.09-1.93-.53-12.27-.84-34.43-.88-49.11-.02-6.91-.02-15.9-.02-26.55,0-33.93-.01-90.74-.02-150.77-.17-2.57-.33-5.15-.51-4.36-.22-2.99-.42-5.84-.61-8.68Z"/>
              <path className="cls-189" d="M404.38,450.25c0,2.48-.02,4.97-.02,7.45-.07,27.87.17,77.55.16,134.76,0,29.01-.01,59.99-.02,91.16.19,2.84.38,5.69.61,8.68.17-.79.34,1.79.51,4.36,0-35.21,0-71.53-.01-104.98,0-64.82-.25-119.67-.12-139.58.01-1.62.02-3.25.04-4.88-.19,1.5-.39,2.99-.6,3.01-.21.02-.38.03-.54.02Z"/>
              <path className="cls-309" d="M404.48,437.92c0,1.63-.05,3.27-.06,4.88-.01,2.48-.03,4.97-.04,7.44.16,0,.33,0,.54-.02.21-.02.41-1.52.6-3.01.02-1.62.03-3.25.05-4.88.01-1.81.07-3.6.1-5.25-.12.4-.24.8-.45.81-.24,0-.49.02-.75.03Z"/>
              <path className="cls-382" d="M404.25,432.36c.03.22.06.46.08.7.13,1.6.16,3.23.15,4.86.25,0,.51-.02.75-.03.2,0,.32-.41.45-.81.03-1.65.03-3.15-.06-4.39-.01-.18-.03-.35-.04-.51-.17.09-.35.18-.54.18-.27,0-.52,0-.77,0Z"/>
              <path className="cls-523" d="M404.13,431.72c.05.2.09.42.13.64.25,0,.51.01.77,0,.2,0,.37-.09.54-.18-.02-.17-.03-.32-.06-.47-.2,0-.4,0-.6,0-.27,0-.53,0-.79,0Z"/>
              <path className="cls-138" d="M419.35,956.71c.32.32.64.64.96.91.27.19.53.38.8.56.38.26.77.51,1.16.75-.37-.32-.74-.68-1.13-1.05-.36-.22-.71-.44-1.06-.67-.24-.16-.49-.33-.73-.49Z"/>
              <path className="cls-621" d="M417.64,955.03c.24.25.48.5.73.72.33.31.66.64.98.96.24.17.49.33.73.49.35.23.7.45,1.06.67-.39-.37-.78-.76-1.19-1.12-.3-.27-.61-.57-.91-.87-.28-.16-.55-.32-.83-.49-.19-.12-.38-.24-.57-.36Z"/>
              <path className="cls-193" d="M416.36,953.71c.18.2.37.4.55.58.24.24.48.49.72.74.19.12.38.24.57.36.27.17.55.33.83.49-.3-.3-.61-.6-.91-.88-.23-.21-.45-.44-.67-.67-.21-.12-.43-.24-.64-.36-.15-.09-.3-.17-.44-.26Z"/>
              <path className="cls-419" d="M415.46,952.75c.12.13.24.27.36.39.18.18.36.38.54.58.15.09.29.17.44.26.21.12.43.24.64.36-.22-.23-.44-.46-.66-.67-.15-.15-.3-.3-.45-.46-.17-.09-.35-.18-.52-.27-.12-.06-.24-.13-.36-.19Z"/>
              <path className="cls-612" d="M414.45,951.63c.21.25.43.49.65.73.12.12.24.25.36.39.12.06.24.13.36.19.17.09.35.18.52.27-.15-.15-.29-.31-.44-.45-.21-.22-.42-.43-.62-.65-.16-.09-.33-.19-.49-.29-.11-.07-.23-.13-.34-.2Z"/>
              <path className="cls-361" d="M412.3,948.95c.48.65.99,1.3,1.52,1.94.2.24.42.49.63.74.11.07.23.13.34.2.16.1.33.19.49.29-.2-.22-.4-.43-.6-.66-.51-.59-1.01-1.19-1.47-1.81-.18-.15-.36-.3-.54-.41-.12-.08-.25-.18-.37-.28Z"/>
              <path className="cls-468" d="M409,943.63c.58,1.12,1.22,2.24,1.93,3.34.43.67.89,1.33,1.37,1.98.12.1.25.2.37.28.17.12.36.27.54.41-.47-.61-.91-1.24-1.33-1.88-.69-1.05-1.32-2.12-1.89-3.21-.2-.21-.4-.42-.59-.56-.13-.1-.27-.24-.4-.37Z"/>
              <path className="cls-113" d="M405.99,936.12c.4,1.36.88,2.74,1.44,4.11.46,1.13.98,2.26,1.56,3.39.13.14.27.28.4.37.19.14.39.35.59.56-.57-1.09-1.08-2.2-1.53-3.32-.55-1.36-1.02-2.74-1.4-4.11-.22-.21-.43-.43-.63-.59-.14-.12-.29-.26-.43-.41Z"/>
              <path className="cls-539" d="M404.77,930.8c.07.43.16.86.24,1.3.26,1.32.58,2.66.98,4.02.14.14.28.29.43.41.21.17.42.38.63.59-.39-1.38-.7-2.75-.93-4.11-.08-.46-.15-.92-.21-1.38-.23-.16-.46-.33-.68-.49-.15-.12-.31-.23-.46-.35Z"/>
              <path className="cls-374" d="M404.38,927.94c.06.55.12,1.08.19,1.58.06.43.13.85.2,1.28.15.11.3.23.46.35.22.17.45.33.68.49-.06-.46-.12-.92-.17-1.36-.06-.52-.11-1.12-.16-1.75-.24-.12-.48-.24-.71-.35-.16-.07-.32-.16-.48-.24Z"/>
              <path className="cls-403" d="M404.04,924.03c.05.72.11,1.46.19,2.21.05.58.1,1.15.16,1.69.16.08.32.17.48.24.23.1.47.23.71.35-.05-.63-.1-1.3-.15-1.99-.06-.67-.1-1.34-.14-2-.25-.1-.5-.21-.74-.3-.17-.06-.34-.13-.5-.2Z"/>
              <path className="cls-354" d="M403.43,674.95c0,55.77,0,112.48.02,159.5,0,2.18,0,4.34,0,6.48,0,33.93-.3,62.36.46,81,.03.67.07,1.37.12,2.09.17.07.34.14.5.2.24.09.49.19.74.3-.04-.67-.07-1.33-.1-2-.81-19.23-.67-48.86-.68-84.18,0-2.37,0-4.77,0-7.19-.02-43.95,0-95.96,0-147.55-.19-2.84-.38-5.66-.58-8.59-.17-.04-.33-.06-.49-.07Z"/>
              <path className="cls-325" d="M403.25,450.17c.02,2.48.05,4.95.06,7.42.12,40.68.13,127.81.13,217.37.16.02.33.03.49.07.21,2.94.39,5.76.58,8.59,0-31.17.02-62.16.02-91.16,0-57.22-.24-106.9-.16-134.76,0-2.48.01-4.97.02-7.45-.16,0-.32-.02-.51-.05-.2-.04-.41-.03-.62-.03Z"/>
              <path className="cls-210" d="M403.37,437.77c0,1.68-.05,3.38-.09,4.97-.05,2.47-.05,4.95-.03,7.42.21,0,.42-.01.62.03.19.03.35.05.51.05,0-2.48.02-4.97.04-7.44,0-1.61.05-3.25.06-4.88-.25,0-.5,0-.72-.03-.18-.03-.29-.07-.4-.12Z"/>
              <path className="cls-93" d="M403.01,432.3c.05.2.08.42.11.65.19,1.5.25,3.15.25,4.83.11.05.22.09.4.12.22.03.46.04.72.03,0-1.63-.02-3.26-.15-4.86-.02-.24-.05-.48-.08-.7-.25,0-.5-.02-.74-.04-.17-.01-.34-.02-.5-.03Z"/>
              <path className="cls-573" d="M402.85,431.72c.06.18.12.37.16.57.17.01.34.02.5.03.25.02.49.03.74.04-.03-.22-.08-.44-.13-.64-.26,0-.51,0-.76,0-.17,0-.35,0-.52,0Z"/>
              <path className="cls-196" d="M417.72,955.51c.26.26.53.51.79.74.33.27.66.53.99.78.26.2.53.4.79.59-.31-.27-.63-.59-.96-.91-.24-.17-.48-.34-.72-.52-.3-.22-.6-.45-.9-.69Z"/>
              <path className="cls-549" d="M416.36,954.15c.19.2.37.39.57.58.26.25.53.52.79.77.3.24.6.46.9.69.24.17.48.35.72.52-.32-.32-.65-.65-.98-.96-.25-.23-.49-.48-.73-.72-.19-.12-.38-.25-.57-.38-.24-.16-.47-.33-.71-.5Z"/>
              <path className="cls-136" d="M415.37,953.09c.14.16.29.32.43.47.19.2.37.39.56.59.23.17.47.34.71.5.19.13.38.25.57.38-.24-.25-.48-.5-.72-.74-.19-.18-.37-.38-.55-.58-.15-.09-.29-.18-.44-.27-.19-.12-.37-.23-.55-.35Z"/>
              <path className="cls-249" d="M414.66,952.3c.09.11.19.22.29.32.14.15.28.31.43.47.18.12.37.24.55.35.15.09.29.18.44.27-.18-.2-.36-.4-.54-.58-.12-.12-.24-.26-.36-.39-.12-.06-.24-.13-.36-.19-.15-.08-.3-.17-.45-.25Z"/>
              <path className="cls-316" d="M413.7,951.19c.22.26.45.54.68.79.09.1.19.21.28.32.15.08.3.17.45.25.12.07.24.13.36.19-.12-.13-.24-.27-.36-.39-.22-.24-.44-.49-.65-.73-.11-.07-.22-.13-.33-.2-.14-.08-.28-.16-.41-.24Z"/>
              <path className="cls-471" d="M411.48,948.34c.49.69,1.01,1.37,1.56,2.05.21.26.43.53.65.8.14.08.28.16.41.24.11.06.22.13.33.2-.21-.25-.43-.5-.63-.74-.53-.64-1.04-1.28-1.52-1.94-.12-.1-.25-.2-.36-.27-.15-.1-.3-.22-.45-.33Z"/>
              <path className="cls-375" d="M408.11,942.82c.59,1.15,1.25,2.3,1.97,3.45.44.69.91,1.39,1.4,2.08.15.11.3.24.45.33.12.08.24.17.36.27-.48-.65-.94-1.32-1.37-1.98-.71-1.1-1.35-2.22-1.93-3.34-.13-.14-.27-.27-.39-.36-.16-.11-.32-.28-.49-.44Z"/>
              <path className="cls-436" d="M405.06,935.28c.41,1.34.9,2.72,1.47,4.1.47,1.14,1,2.29,1.59,3.44.16.16.33.33.49.44.13.09.26.23.39.36-.58-1.12-1.1-2.26-1.56-3.39-.56-1.38-1.04-2.75-1.44-4.11-.14-.14-.28-.29-.42-.39-.17-.14-.35-.3-.52-.45Z"/>
              <path className="cls-112" d="M403.78,930.08c.08.41.17.82.26,1.25.27,1.27.61,2.6,1.02,3.94.17.15.34.32.52.45.14.11.28.25.42.39-.4-1.36-.72-2.71-.98-4.02-.09-.44-.17-.87-.24-1.3-.15-.11-.3-.23-.45-.33-.19-.13-.37-.26-.55-.38Z"/>
              <path className="cls-580" d="M403.35,927.42c.06.48.13.95.21,1.44.07.41.14.81.22,1.22.18.12.36.24.55.38.15.11.3.22.45.33-.07-.43-.14-.85-.2-1.28-.07-.5-.13-1.03-.19-1.58-.16-.08-.31-.16-.47-.23-.19-.09-.38-.19-.57-.28Z"/>
              <path className="cls-444" d="M402.95,923.61c.06.76.13,1.56.23,2.37.05.49.11.96.17,1.44.19.09.38.19.57.28.15.07.31.15.47.23-.06-.55-.11-1.11-.16-1.69-.08-.75-.14-1.49-.19-2.21-.17-.07-.33-.14-.49-.2-.2-.07-.4-.15-.6-.23Z"/>
              <path className="cls-108" d="M402.45,684.61c.06,67.3.12,133.97.15,178.44.02,26.21-.16,46.06.16,55.91.01.77.03,1.61.07,2.49.03.67.07,1.4.13,2.16.2.08.4.16.6.23.16.06.32.13.49.2-.05-.72-.09-1.43-.12-2.09-.76-18.64-.46-47.07-.46-81,0-2.14,0-4.3,0-6.48-.03-47.02-.03-103.73-.02-159.5-.16-.01-.32-.03-.47-.08-.17,3.55-.34,6.64-.51,9.73Z"/>
              <path className="cls-551" d="M402.12,443.51c.01,1.67.04,3.43.05,5.25.08,30.6.19,133.88.28,235.85.17-3.09.34-6.18.51-9.73.15.05.31.06.47.08,0-89.56,0-176.68-.13-217.37,0-2.47-.04-4.95-.06-7.42-.21,0-.42,0-.6-.06-.2-2.21-.37-4.4-.53-6.6Z"/>
              <path className="cls-582" d="M402.29,435.76c-.01,1.02-.08,2.07-.12,3-.06,1.49-.06,3.08-.05,4.75.16,2.19.33,4.38.53,6.6.19.06.39.06.6.06-.02-2.48-.02-4.95.03-7.42.03-1.59.09-3.29.09-4.97-.11-.05-.21-.1-.37-.15-.2-.67-.46-1.27-.71-1.86Z"/>
              <path className="cls-143" d="M401.94,432.29c.06.2.11.4.15.61.18.84.21,1.84.2,2.86.25.59.51,1.18.71,1.86.16.05.26.11.37.15,0-1.68-.06-3.33-.25-4.83-.03-.22-.06-.45-.11-.65-.17-.01-.33-.03-.48-.05-.21.02-.4.03-.58.04Z"/>
              <path className="cls-316" d="M401.74,431.73c.08.18.14.37.2.56.19-.01.38-.02.58-.04.15.02.32.04.48.05-.05-.2-.1-.4-.16-.57-.17,0-.34,0-.5,0-.21,0-.41,0-.61,0Z"/>
              <path className="cls-461" d="M416.84,954.78c.23.22.46.43.7.64.32.28.65.56.98.83-.26-.23-.53-.49-.79-.74-.3-.24-.59-.48-.88-.72Z"/>
              <path className="cls-178" d="M415.67,953.63c.16.17.33.34.5.5.22.22.45.44.68.65.29.24.58.49.88.72-.26-.26-.53-.52-.79-.77-.2-.19-.38-.38-.57-.58-.23-.17-.47-.34-.7-.52Z"/>
              <path className="cls-610" d="M414.82,952.72c.12.13.24.26.36.4.16.17.32.34.49.51.23.18.46.35.7.52-.19-.2-.37-.39-.56-.59-.15-.15-.29-.31-.43-.47-.18-.12-.37-.24-.55-.37Z"/>
              <path className="cls-351" d="M414.22,952.05c.08.09.16.18.24.28.12.13.24.26.36.4.18.13.37.25.55.37-.14-.16-.29-.32-.43-.47-.1-.1-.19-.21-.29-.32-.15-.08-.29-.17-.44-.25Z"/>
              <path className="cls-616" d="M413.29,950.97c.22.27.45.54.68.8.08.09.16.18.24.28.15.09.29.17.44.25-.09-.11-.19-.22-.28-.32-.23-.26-.46-.53-.68-.79-.14-.08-.27-.15-.4-.22Z"/>
              <path className="cls-123" d="M411.05,948.05c.5.71,1.03,1.41,1.59,2.11.21.27.43.54.66.81.13.07.27.15.4.22-.22-.26-.44-.54-.65-.8-.55-.68-1.07-1.36-1.56-2.05-.15-.11-.3-.22-.43-.29Z"/>
              <path className="cls-391" d="M407.64,942.43c.6,1.16,1.26,2.33,1.99,3.49.45.71.92,1.42,1.42,2.12.14.07.28.18.43.29-.49-.69-.96-1.38-1.4-2.08-.73-1.14-1.38-2.3-1.97-3.45-.16-.16-.32-.31-.47-.39Z"/>
              <path className="cls-197" d="M404.56,934.9c.42,1.33.91,2.69,1.48,4.08.47,1.14,1,2.29,1.6,3.45.15.08.31.23.47.39-.59-1.15-1.12-2.3-1.59-3.44-.57-1.38-1.06-2.76-1.47-4.1-.17-.15-.34-.29-.5-.38Z"/>
              <path className="cls-349" d="M403.25,929.78c.08.41.17.83.27,1.25.28,1.25.63,2.55,1.04,3.88.17.08.33.22.5.38-.41-1.34-.75-2.66-1.02-3.94-.09-.43-.18-.84-.26-1.25-.18-.12-.36-.22-.53-.31Z"/>
              <path className="cls-499" d="M402.8,927.17c.07.46.14.92.22,1.39.07.4.15.8.23,1.21.17.09.35.19.53.31-.08-.41-.16-.81-.22-1.22-.08-.48-.15-.95-.21-1.44-.19-.09-.37-.18-.55-.25Z"/>
              <path className="cls-136" d="M402.38,923.4c.06.77.14,1.58.24,2.43.05.44.11.88.18,1.34.18.07.36.16.55.25-.06-.48-.12-.96-.17-1.44-.09-.81-.17-1.62-.23-2.37-.2-.08-.39-.15-.57-.2Z"/>
              <path className="cls-290" d="M401.97,694.38c.12,113.05.23,221.17.23,224.04,0,.81,0,1.77.05,2.82.03.67.07,1.39.13,2.16.18.05.37.12.57.2-.06-.76-.1-1.49-.13-2.16-.04-.88-.05-1.72-.07-2.49-.32-9.85-.14-29.69-.16-55.91-.03-44.47-.09-111.14-.15-178.44-.17,3.09-.33,6.19-.48,9.77Z"/>
              <path className="cls-608" d="M401.62,436.92c0,.87,0,1.9.01,3.09.07,20.54.22,139.98.34,254.37.15-3.57.31-6.67.48-9.77-.1-101.97-.21-205.25-.28-235.85,0-1.83-.03-3.58-.05-5.25-.16-2.19-.32-4.38-.5-6.59Z"/>
              <path className="cls-139" d="M401.6,433.9c0,.31,0,.62,0,.92,0,.52,0,1.22,0,2.09.18,2.21.34,4.4.5,6.59-.01-1.67,0-3.26.05-4.75.04-.93.1-1.97.12-3-.25-.59-.5-1.18-.68-1.86Z"/>
              <path className="cls-372" d="M401.38,432.33c.06.21.11.43.15.66.05.3.07.61.07.92.19.67.43,1.26.68,1.86.01-1.02-.02-2.02-.2-2.86-.04-.21-.09-.42-.15-.61-.19.01-.37.02-.56.04Z"/>
              <path className="cls-159" d="M401.16,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
            </g>
            <g>
              <path className="cls-157" d="M401.16,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M401.16,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M401.16,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M401.16,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M401.16,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M401.16,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M401.16,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M401.16,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M401.16,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M401.16,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M401.16,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M401.16,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M401.16,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M401.16,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M401.16,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M401.16,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
            </g>
            <g>
              <path className="cls-157" d="M401.16,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M401.16,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M401.16,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M401.16,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M401.16,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M401.16,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M401.16,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M401.16,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M401.16,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M401.16,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M401.16,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M401.16,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M401.16,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M401.16,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
              <path className="cls-157" d="M401.16,431.73c.09.19.16.39.23.6.19-.02.37-.03.56-.04-.06-.2-.13-.38-.2-.56-.2,0-.39,0-.58,0Z"/>
            </g>
          </g>
          <g id="MeshGrid-7" data-name="MeshGrid">
            <g>
              <path className="cls-159" d="M492.73,431.28c-.08.15-.16.3-.22.45.12,0,.23,0,.34,0,.07-.15.15-.29.23-.43-.11,0-.23-.01-.36-.02Z"/>
              <path className="cls-338" d="M493.41,430.38c-.15.15-.28.31-.41.48-.1.14-.19.28-.27.42.12,0,.24,0,.36.02.09-.14.18-.27.28-.39.12-.16.26-.3.4-.44-.11-.03-.23-.06-.36-.09Z"/>
              <path className="cls-573" d="M494.53,429.58c-.24.12-.45.25-.65.39-.17.12-.33.26-.47.41.13.03.25.06.36.09.15-.14.3-.26.47-.38.2-.14.41-.27.63-.38-.1-.04-.21-.08-.34-.12Z"/>
              <path className="cls-615" d="M495.71,429.11c-.15.04-.29.09-.43.14-.26.1-.52.2-.75.32.12.04.24.08.34.12.22-.11.46-.22.7-.3.13-.05.26-.09.4-.13-.08-.05-.17-.1-.26-.16Z"/>
              <path className="cls-255" d="M498.15,428.68c-.67.06-1.35.15-2,.3-.15.04-.3.08-.44.12.09.05.18.1.26.16.14-.04.28-.08.42-.11.7-.16,1.42-.23,2.15-.28-.13-.06-.26-.13-.39-.2Z"/>
              <path className="cls-412" d="M501.6,428.44c-.47.04-.95.08-1.42.11-.67.05-1.36.08-2.03.14.13.07.26.14.39.2.73-.04,1.46-.06,2.17-.11.52-.03,1.05-.07,1.58-.12-.23-.07-.45-.14-.7-.22Z"/>
              <path className="cls-494" d="M504.26,428.09c-.39.07-.82.14-1.27.19-.45.06-.93.11-1.39.15.24.08.47.15.7.22.53-.04,1.05-.09,1.56-.15.54-.06,1.06-.13,1.53-.21-.31-.08-.71-.14-1.13-.21Z"/>
              <path className="cls-454" d="M506.18,427.37c-.2.19-.5.34-.87.46-.31.1-.66.19-1.05.26.42.06.82.13,1.13.21.47-.08.9-.17,1.25-.27.45-.13.79-.27.97-.44-.41-.09-.91-.15-1.42-.22Z"/>
              <path className="cls-625" d="M506.73,426.21c-.03.13-.07.25-.11.36-.09.24-.18.45-.3.63-.04.06-.09.12-.14.17.51.06,1.01.13,1.42.22.06-.06.11-.12.13-.18.07-.19.15-.4.21-.63.04-.13.07-.27.11-.41-.42-.06-.87-.11-1.32-.16Z"/>
              <path className="cls-379" d="M506.92,425.52c-.04.1-.08.21-.1.3-.02.14-.05.27-.09.39.46.05.9.1,1.32.16.03-.14.06-.28.08-.43.01-.09.03-.17.04-.26-.39-.06-.82-.12-1.26-.17Z"/>
              <path className="cls-295" d="M507.14,425c-.02.07-.05.15-.08.22-.04.1-.1.21-.14.31.44.05.86.1,1.26.17.01-.09.02-.17.03-.26,0-.06,0-.13.01-.19-.35-.09-.7-.17-1.08-.24Z"/>
              <path className="cls-182" d="M507.23,424.51c-.02.09-.05.19-.05.28,0,.07-.02.14-.04.21.37.07.72.14,1.08.24,0-.06,0-.12,0-.19,0-.08,0-.17,0-.25-.32-.12-.64-.21-.98-.29Z"/>
              <path className="cls-192" d="M507.28,423.81c-.01.13-.05.29-.02.42.02.09,0,.18-.02.27.34.08.66.18.98.29,0-.08-.01-.16-.02-.24-.02-.12-.04-.24-.07-.36-.26-.16-.54-.28-.84-.39Z"/>
              <path className="cls-171" d="M507.24,423.28s.01.09.03.13c.05.12.02.26,0,.4.31.11.58.23.84.39-.03-.12-.07-.23-.11-.34-.02-.04-.03-.08-.05-.11-.22-.19-.45-.34-.72-.47Z"/>
              <path className="cls-171" d="M507.2,423s.02.1.03.15c0,.04,0,.09.02.13.27.12.5.28.72.47-.02-.04-.04-.07-.06-.11-.02-.04-.05-.08-.08-.12-.19-.21-.39-.38-.63-.51Z"/>
              <path className="cls-566" d="M507.13,422.86s.05.09.07.14c.24.14.43.31.63.51-.03-.04-.06-.08-.09-.12-.18-.22-.37-.39-.6-.54Z"/>
              <path className="cls-144" d="M491.99,431.24c-.07.16-.13.32-.18.48.12,0,.23,0,.35,0,.12,0,.24,0,.35,0,.06-.15.14-.3.22-.45-.12,0-.25,0-.37-.02-.12,0-.24-.01-.37-.02Z"/>
              <path className="cls-151" d="M492.62,430.2c-.14.17-.27.36-.38.56-.09.16-.17.32-.24.48.13,0,.25,0,.37.02.12,0,.25.01.37.02.08-.15.17-.29.27-.42.12-.17.26-.33.41-.48-.13-.03-.26-.06-.39-.09-.13-.03-.26-.05-.4-.08Z"/>
              <path className="cls-556" d="M493.77,429.33c-.26.13-.5.27-.69.42-.16.13-.32.28-.46.46.14.03.28.06.4.08.13.03.26.06.39.09.15-.15.31-.29.47-.41.19-.14.41-.27.65-.39-.12-.04-.25-.08-.37-.13-.12-.04-.25-.08-.39-.12Z"/>
              <path className="cls-349" d="M495.1,428.79c-.16.05-.32.11-.48.17-.3.11-.59.24-.85.37.14.04.27.08.39.12.12.05.25.09.37.13.24-.12.49-.23.75-.32.14-.05.28-.1.43-.14-.09-.05-.19-.1-.3-.16-.1-.05-.21-.11-.32-.16Z"/>
              <path className="cls-415" d="M497.19,428.3c-.54.08-1.08.19-1.6.34-.16.05-.33.1-.49.16.11.05.22.1.32.16.1.06.2.11.3.16.15-.04.29-.09.44-.12.65-.16,1.33-.25,2-.3-.13-.07-.28-.14-.45-.21-.17-.06-.34-.12-.51-.18Z"/>
              <path className="cls-503" d="M499.92,427.98c-.36.04-.72.08-1.09.12-.55.06-1.1.12-1.64.2.17.06.34.11.51.18.17.07.31.14.45.21.67-.06,1.36-.09,2.03-.14.47-.03.95-.07,1.42-.11-.24-.08-.51-.16-.8-.23-.29-.07-.58-.15-.88-.22Z"/>
              <path className="cls-166" d="M501.92,427.63c-.28.07-.59.13-.93.2-.35.07-.71.11-1.07.16.3.07.59.15.88.22.29.08.55.15.8.23.47-.04.94-.09,1.39-.15.45-.06.88-.12,1.27-.19-.42-.06-.85-.13-1.24-.21-.36-.07-.72-.16-1.1-.25Z"/>
              <path className="cls-195" d="M503.33,426.93c-.19.19-.4.33-.65.45-.22.1-.47.18-.76.25.37.09.74.18,1.1.25.39.08.82.15,1.24.21.39-.07.75-.16,1.05-.26.37-.12.67-.27.87-.46-.51-.06-1.05-.12-1.53-.2-.42-.06-.87-.15-1.32-.24Z"/>
              <path className="cls-340" d="M503.89,425.93c-.03.1-.07.2-.1.29-.12.3-.27.53-.46.72.45.09.9.19,1.32.24.48.08,1.01.14,1.53.2.06-.05.11-.11.14-.17.11-.18.21-.39.3-.63.04-.12.08-.23.11-.36-.46-.05-.93-.1-1.42-.14-.46-.04-.94-.1-1.42-.14Z"/>
              <path className="cls-611" d="M504.17,425.27c-.06.11-.16.22-.19.33-.03.12-.05.22-.09.33.48.05.96.1,1.42.14.49.05.96.09,1.42.14.03-.13.06-.26.09-.39.02-.09.06-.2.1-.3-.44-.05-.9-.09-1.36-.13-.45-.04-.91-.08-1.39-.12Z"/>
              <path className="cls-164" d="M504.57,424.7c-.04.08-.11.16-.16.24-.07.11-.19.22-.25.33.48.04.94.08,1.39.12.46.04.92.09,1.36.13.04-.1.09-.21.14-.31.03-.07.06-.15.08-.22-.37-.07-.76-.12-1.2-.17-.42-.05-.87-.09-1.37-.13Z"/>
              <path className="cls-601" d="M504.77,424.15c-.03.11-.09.21-.1.32-.01.08-.06.15-.1.23.49.04.95.08,1.37.13.43.05.83.11,1.2.17.02-.07.04-.14.04-.21,0-.09.03-.19.05-.28-.34-.08-.71-.15-1.12-.21-.4-.06-.84-.1-1.34-.15Z"/>
              <path className="cls-398" d="M504.87,423.36c-.02.16-.1.32-.05.48.03.1-.02.21-.04.31.5.05.93.1,1.34.15.41.06.78.12,1.12.21.02-.09.04-.19.02-.27-.02-.14.01-.29.02-.42-.31-.11-.65-.19-1.05-.26-.39-.07-.83-.13-1.37-.19Z"/>
              <path className="cls-483" d="M504.89,422.75c0,.05,0,.1.02.15.05.14-.03.29-.05.45.53.06.98.12,1.37.19.4.07.74.16,1.05.26.01-.13.04-.28,0-.4-.02-.04-.02-.09-.03-.13-.27-.13-.58-.22-.97-.31-.38-.08-.82-.15-1.37-.22Z"/>
              <path className="cls-483" d="M504.89,422.42c.02.06,0,.12,0,.18,0,.05,0,.1,0,.15.55.07,1,.14,1.37.22.39.09.7.18.97.31,0-.04,0-.09-.02-.13,0-.05-.01-.1-.03-.15-.24-.14-.53-.25-.91-.34-.37-.09-.83-.16-1.4-.24Z"/>
              <path className="cls-603" d="M504.82,422.26c.04.05.05.11.06.17.57.07,1.03.15,1.4.24.38.09.67.2.91.34-.02-.05-.03-.1-.07-.14-.24-.14-.52-.26-.9-.36-.37-.09-.82-.17-1.4-.25Z"/>
              <path className="cls-316" d="M491.57,431.2c-.06.17-.12.35-.16.52.02,0,.03,0,.05,0,.12,0,.24,0,.36,0,.05-.16.11-.32.18-.48-.13,0-.25,0-.38-.02-.02,0-.03-.01-.04-.03Z"/>
              <path className="cls-304" d="M492.13,430.1c-.13.18-.24.38-.34.59-.08.17-.16.34-.22.51.01.01.02.02.04.03.13,0,.25.01.38.02.07-.16.15-.33.24-.48.11-.2.24-.38.38-.56-.14-.03-.28-.06-.42-.08-.02,0-.04-.01-.07-.02Z"/>
              <path className="cls-329" d="M493.29,429.19c-.27.14-.52.28-.71.43-.17.14-.32.3-.45.48.02,0,.04.01.07.02.14.03.28.05.42.08.14-.17.3-.33.46-.46.19-.15.43-.29.69-.42-.14-.04-.28-.08-.42-.12-.02,0-.04-.01-.06-.01Z"/>
              <path className="cls-431" d="M494.69,428.61c-.17.06-.34.12-.51.19-.32.12-.62.25-.9.39.02,0,.04,0,.06.01.14.04.28.08.42.12.26-.13.55-.25.85-.37.16-.06.32-.12.48-.17-.11-.05-.23-.1-.35-.16-.02,0-.03-.01-.05-.02Z"/>
              <path className="cls-613" d="M496.55,428.13c-.45.08-.9.18-1.34.31-.17.06-.34.12-.51.18.02,0,.03,0,.05.02.12.05.24.11.35.16.16-.05.33-.11.49-.16.52-.15,1.06-.26,1.6-.34-.17-.06-.36-.11-.55-.17-.03,0-.06,0-.09,0Z"/>
              <path className="cls-442" d="M498.83,427.75c-.31.06-.62.11-.93.16-.45.07-.91.14-1.36.22.03,0,.07,0,.09,0,.2.06.38.11.55.17.54-.08,1.09-.14,1.64-.2.36-.04.73-.07,1.09-.12-.3-.07-.61-.14-.93-.21-.04,0-.1-.02-.16-.02Z"/>
              <path className="cls-418" d="M500.54,427.38c-.24.07-.5.13-.78.19-.31.07-.62.13-.93.19.06,0,.11.01.16.02.32.07.63.14.93.21.36-.04.72-.09,1.07-.16.34-.06.65-.13.93-.2-.37-.09-.75-.18-1.14-.25-.05,0-.15,0-.25,0Z"/>
              <path className="cls-402" d="M501.81,426.7c-.16.18-.37.32-.6.43-.2.1-.43.18-.67.25.1,0,.19,0,.25,0,.39.07.77.16,1.14.25.28-.07.53-.15.76-.25.25-.11.47-.26.65-.45-.45-.09-.91-.18-1.35-.22-.06,0-.12,0-.17,0Z"/>
              <path className="cls-477" d="M502.26,425.77c-.02.09-.05.18-.08.26-.08.28-.21.5-.38.67.06,0,.12,0,.17,0,.45.04.9.13,1.35.22.19-.19.33-.42.46-.72.04-.09.07-.18.1-.29-.48-.05-.97-.1-1.45-.13-.06,0-.12-.02-.19-.03Z"/>
              <path className="cls-161" d="M502.45,425.14c-.05.11-.1.23-.13.35-.02.1-.04.19-.06.28.06.01.12.02.19.03.48.03.97.08,1.45.13.03-.1.06-.21.09-.33.03-.11.12-.22.19-.33-.48-.04-.98-.07-1.5-.11-.07,0-.14,0-.21-.01Z"/>
              <path className="cls-286" d="M502.7,424.56c-.03.08-.06.16-.09.24-.05.11-.1.23-.15.34.07,0,.14,0,.21.01.52.04,1.02.07,1.5.11.06-.11.18-.22.25-.33.05-.08.12-.16.16-.24-.5-.04-1.03-.08-1.62-.12-.08,0-.17-.01-.26-.02Z"/>
              <path className="cls-618" d="M502.8,423.98c0,.11-.02.22-.04.33-.01.08-.04.16-.06.24.09,0,.17.01.26.02.59.04,1.12.08,1.62.12.04-.08.09-.16.1-.23.01-.1.07-.21.1-.32-.5-.05-1.05-.09-1.69-.14-.09,0-.18-.01-.28-.02Z"/>
              <path className="cls-481" d="M502.67,423.15c.03.16.05.33.1.5.03.11.03.22.03.33.09,0,.19.01.28.02.64.05,1.19.1,1.69.14.03-.11.07-.21.04-.31-.04-.16.03-.32.05-.48-.53-.06-1.15-.12-1.88-.18-.1,0-.21-.02-.32-.03Z"/>
              <path className="cls-92" d="M502.52,422.51c.02.05.03.11.05.16.05.15.07.31.1.47.11,0,.22.02.32.03.73.06,1.34.12,1.88.18.02-.16.09-.31.05-.45-.02-.05-.01-.1-.02-.15-.55-.07-1.21-.13-2.02-.21-.12-.01-.23-.02-.35-.03Z"/>
              <path className="cls-386" d="M502.39,422.17c.03.06.06.12.08.19.02.05.04.11.05.16.12.01.24.02.35.03.81.07,1.47.14,2.02.21,0-.05,0-.1,0-.15,0-.06,0-.12,0-.18-.57-.07-1.27-.14-2.12-.22-.12-.01-.25-.02-.38-.04Z"/>
              <path className="cls-605" d="M502.28,421.98c.05.06.08.12.11.18.13.01.26.02.38.04.85.08,1.54.15,2.12.22-.02-.06-.02-.11-.06-.17-.58-.08-1.29-.15-2.16-.23-.13-.01-.25-.02-.39-.04Z"/>
              <path className="cls-316" d="M491.17,431.19c-.06.18-.1.36-.14.54.11,0,.22,0,.33,0h.05c.04-.17.1-.35.16-.52-.01-.01-.02-.02-.04-.03-.12,0-.24,0-.36.01Z"/>
              <path className="cls-304" d="M491.66,430.02c-.12.19-.22.4-.3.63-.07.18-.14.36-.19.54.12,0,.24-.02.36-.01.02,0,.03.01.04.03.07-.17.14-.35.22-.51.09-.21.21-.41.34-.59-.02,0-.04-.01-.07-.02-.13-.02-.26-.05-.4-.07Z"/>
              <path className="cls-329" d="M492.83,429.07c-.28.14-.53.29-.72.45-.17.14-.32.31-.44.5.14.02.27.04.4.07.02,0,.04.01.07.02.13-.18.28-.34.45-.48.19-.15.43-.3.71-.43-.02,0-.04,0-.06-.01-.13-.04-.26-.07-.4-.11Z"/>
              <path className="cls-538" d="M494.29,428.45c-.18.07-.36.13-.53.2-.33.13-.65.27-.93.41.14.04.28.07.4.11.02,0,.04,0,.06.01.27-.14.58-.27.9-.39.17-.06.34-.13.51-.19-.02,0-.03,0-.05-.02-.11-.05-.23-.1-.36-.14Z"/>
              <path className="cls-613" d="M495.94,427.97c-.38.09-.75.18-1.12.29-.17.06-.35.13-.53.19.13.05.25.1.36.14.02,0,.03.01.05.02.17-.06.34-.12.51-.18.44-.13.89-.23,1.34-.31-.03,0-.07,0-.09,0-.17-.05-.34-.11-.52-.17Z"/>
              <path className="cls-396" d="M497.84,427.53c-.26.06-.52.13-.77.18-.38.09-.75.16-1.13.25.17.06.34.11.52.17.03,0,.06,0,.09,0,.45-.08.91-.15,1.36-.22.31-.05.62-.1.93-.16-.06,0-.11-.01-.16-.02-.28-.06-.56-.13-.83-.2Z"/>
              <path className="cls-418" d="M499.27,427.14c-.21.07-.42.13-.64.19-.26.07-.52.14-.78.2.27.07.55.14.83.2.04,0,.1.02.16.02.31-.06.62-.12.93-.19.27-.06.53-.12.78-.19-.1,0-.19,0-.25,0-.35-.06-.69-.15-1.03-.23Z"/>
              <path className="cls-290" d="M500.37,426.49c-.15.17-.32.3-.53.41-.18.1-.37.18-.58.25.34.08.67.16,1.03.23.05,0,.15,0,.25,0,.24-.07.47-.15.67-.25.23-.11.43-.25.6-.43-.06,0-.12,0-.18,0-.41-.05-.83-.13-1.26-.21Z"/>
              <path className="cls-371" d="M500.77,425.65c-.02.08-.04.16-.07.23-.07.25-.19.45-.33.61.42.08.85.16,1.26.21.06,0,.12,0,.18,0,.16-.18.29-.4.38-.67.03-.08.06-.17.08-.26-.06-.01-.12-.02-.19-.03-.43-.04-.87-.07-1.3-.1Z"/>
              <path className="cls-512" d="M500.95,425.05c-.05.12-.1.23-.13.35-.01.08-.03.16-.05.24.43.03.87.06,1.3.1.06,0,.12.02.19.03.02-.09.04-.18.06-.28.04-.12.08-.23.13-.35-.07,0-.14,0-.21-.01-.43-.03-.86-.05-1.29-.08Z"/>
              <path className="cls-619" d="M501.17,424.45c-.02.08-.05.17-.08.25-.04.12-.09.23-.14.35.43.03.86.05,1.29.08.08,0,.15,0,.21.01.05-.11.1-.23.15-.34.03-.08.07-.16.09-.24-.09,0-.18-.01-.26-.02-.42-.03-.84-.06-1.26-.09Z"/>
              <path className="cls-92" d="M501.3,423.87c-.02.11-.07.22-.08.33,0,.08-.02.17-.04.25.42.03.84.05,1.26.09.09,0,.18.01.26.02.03-.08.05-.16.06-.24.02-.11.04-.22.04-.33-.09,0-.19-.01-.29-.02-.28-.02-.57-.04-.86-.07-.12,0-.23-.02-.35-.02Z"/>
              <path className="cls-247" d="M501.17,423.03c.03.16.09.33.15.51.03.11,0,.22-.02.33.12,0,.24.02.35.02.29.02.58.04.86.07.1,0,.19.02.29.02,0-.11,0-.22-.03-.33-.05-.17-.08-.34-.1-.5-.11,0-.22-.02-.33-.03-.27-.02-.55-.05-.83-.07-.11,0-.22-.02-.34-.02Z"/>
              <path className="cls-497" d="M501,422.38c.02.05.03.11.05.17.04.16.08.32.12.48.12,0,.23.02.34.02.28.02.56.05.83.07.11,0,.23.02.33.03-.03-.16-.05-.32-.1-.47-.02-.06-.03-.11-.05-.16-.12-.01-.24-.02-.37-.03-.39-.03-.77-.07-1.15-.1Z"/>
              <path className="cls-589" d="M500.84,422.03c.04.06.07.13.1.19.02.05.04.11.06.16.38.03.76.06,1.15.1.13.01.25.02.37.03-.02-.05-.03-.11-.05-.16-.02-.06-.05-.13-.08-.19-.13-.01-.26-.02-.4-.04-.39-.04-.77-.07-1.15-.1Z"/>
              <path className="cls-135" d="M500.71,421.84c.05.06.09.12.13.19.38.03.76.06,1.15.1.13.01.27.02.4.04-.03-.06-.07-.12-.11-.18-.13-.01-.27-.03-.41-.04-.39-.04-.77-.07-1.16-.1Z"/>
              <path className="cls-573" d="M490.29,431.13c-.03.2-.06.4-.09.59.17,0,.33,0,.49,0,.11,0,.22,0,.34,0,.04-.17.08-.35.14-.54-.12,0-.25.02-.37.01-.18-.01-.34-.04-.51-.07Z"/>
              <path className="cls-284" d="M490.63,429.84c-.1.21-.18.44-.22.68-.05.19-.09.4-.13.6.17.03.33.06.51.07.12,0,.25,0,.37-.01.06-.18.12-.37.19-.54.08-.22.18-.43.3-.63-.14-.02-.28-.04-.41-.06-.2-.03-.41-.07-.62-.11Z"/>
              <path className="cls-105" d="M491.78,428.82c-.29.15-.55.31-.73.47-.17.16-.31.34-.41.55.21.04.42.08.62.11.14.02.28.04.41.06.12-.19.27-.36.44-.5.19-.15.44-.3.72-.45-.14-.04-.28-.07-.42-.11-.2-.05-.41-.1-.63-.14Z"/>
              <path className="cls-249" d="M493.3,428.14c-.19.08-.38.15-.56.23-.34.15-.68.3-.97.45.22.04.43.09.63.14.14.04.28.07.42.11.28-.14.6-.28.93-.41.17-.07.35-.14.53-.2-.13-.05-.26-.09-.39-.14-.19-.07-.39-.12-.6-.17Z"/>
              <path className="cls-279" d="M494.62,427.61c-.26.1-.49.2-.75.3-.19.08-.38.15-.57.23.21.05.42.11.6.17.13.05.26.09.39.14.18-.07.36-.13.53-.19.37-.12.74-.21,1.12-.29-.17-.06-.35-.11-.53-.17-.27-.08-.53-.14-.79-.19Z"/>
              <path className="cls-196" d="M495.85,427.1c-.17.07-.32.14-.49.21-.26.1-.49.2-.75.3.26.06.52.12.79.19.19.05.36.11.53.17.38-.09.75-.16,1.13-.25.26-.06.51-.12.77-.18-.27-.07-.55-.14-.83-.2-.41-.09-.79-.16-1.16-.23Z"/>
              <path className="cls-152" d="M496.78,426.65c-.14.08-.29.16-.46.23-.16.07-.31.15-.48.22.37.07.75.14,1.16.23.28.06.56.13.83.2.26-.06.52-.13.78-.2.22-.06.44-.12.64-.19-.34-.08-.67-.16-1.01-.22-.49-.08-.99-.18-1.47-.27Z"/>
              <path className="cls-515" d="M497.5,426.03c-.1.13-.21.25-.34.36-.11.1-.24.18-.38.26.48.1.99.2,1.47.27.34.06.67.14,1.01.22.21-.07.4-.15.58-.25.2-.11.38-.24.53-.41-.42-.08-.84-.16-1.23-.2-.55-.05-1.11-.16-1.64-.26Z"/>
              <path className="cls-440" d="M497.81,425.42c-.02.06-.04.11-.06.16-.07.17-.15.31-.25.45.53.1,1.09.21,1.64.26.39.05.81.12,1.23.2.15-.17.26-.37.33-.61.03-.07.05-.15.07-.23-.43-.03-.86-.06-1.27-.09-.59-.03-1.16-.09-1.7-.14Z"/>
              <path className="cls-188" d="M497.99,424.9c-.03.12-.1.23-.13.35-.02.06-.04.12-.06.17.54.05,1.11.1,1.7.14.41.03.84.06,1.27.09.02-.08.04-.16.05-.24.04-.12.08-.23.13-.35-.43-.03-.85-.05-1.26-.07-.59-.03-1.16-.06-1.7-.08Z"/>
              <path className="cls-399" d="M498.13,424.3c0,.08-.03.17-.04.25-.02.12-.07.23-.11.35.54.03,1.1.05,1.7.08.42.02.84.05,1.26.07.05-.12.1-.23.14-.35.03-.08.06-.17.08-.25-.42-.03-.83-.05-1.25-.07-.6-.03-1.2-.06-1.79-.08Z"/>
              <path className="cls-380" d="M498.19,423.72c0,.11-.08.22-.06.33.01.08,0,.17,0,.25.59.03,1.18.05,1.79.08.42.02.84.05,1.25.07.02-.08.04-.17.04-.25,0-.11.06-.22.08-.33-.4-.03-.81-.05-1.24-.07-.59-.03-1.22-.06-1.87-.08Z"/>
              <path className="cls-129" d="M498.02,422.88c.08.17.09.34.18.51.05.11,0,.22,0,.33.65.03,1.27.05,1.87.08.43.02.84.05,1.24.07.02-.11.05-.22.02-.33-.06-.17-.11-.34-.15-.51-.38-.03-.79-.05-1.2-.07-.59-.03-1.23-.06-1.95-.08Z"/>
              <path className="cls-23" d="M497.75,422.22c.04.06.05.11.08.17.09.16.11.32.19.49.72.03,1.36.05,1.95.08.41.02.81.04,1.2.07-.03-.16-.08-.33-.12-.48-.01-.06-.03-.11-.05-.17-.38-.03-.77-.06-1.15-.08-.59-.03-1.3-.06-2.1-.09Z"/>
              <path className="cls-90" d="M497.52,421.86c.06.06.08.13.13.19.04.06.06.11.1.17.81.03,1.51.06,2.1.09.39.02.77.05,1.15.08-.02-.05-.04-.11-.06-.16-.03-.06-.06-.13-.1-.19-.38-.03-.76-.06-1.15-.08-.59-.03-1.32-.06-2.17-.1Z"/>
              <path className="cls-215" d="M497.37,421.67c.06.06.1.13.15.19.85.03,1.58.06,2.17.1.39.02.77.05,1.15.08-.04-.06-.08-.12-.13-.19-.39-.03-.77-.06-1.16-.08-.59-.03-1.33-.06-2.18-.1Z"/>
              <path className="cls-2" d="M489,431.09c-.04.21-.08.42-.11.62.28,0,.55,0,.81,0,.17,0,.34,0,.5,0,.02-.19.05-.39.09-.59-.17-.03-.34-.06-.52-.06-.25,0-.51.01-.77.03Z"/>
              <path className="cls-581" d="M489.39,429.78c-.11.22-.19.45-.24.7-.06.2-.1.41-.15.62.26-.02.52-.03.77-.03.18,0,.35.03.52.06.03-.2.08-.41.13-.6.04-.24.11-.47.22-.68-.21-.04-.42-.07-.63-.1-.22,0-.42.02-.62.03Z"/>
              <path className="cls-557" d="M490.54,428.64c-.28.18-.53.37-.73.55-.17.18-.31.37-.42.59.2-.02.4-.03.62-.03.21.02.42.06.63.1.1-.21.24-.39.41-.55.19-.16.45-.32.73-.47-.22-.04-.44-.08-.66-.13-.21-.02-.39-.04-.57-.06Z"/>
              <path className="cls-417" d="M491.99,427.84c-.18.09-.36.18-.53.27-.33.17-.64.36-.92.54.18.02.36.04.57.06.22.04.44.08.66.13.29-.15.62-.3.97-.45.18-.08.37-.15.56-.23-.21-.05-.44-.1-.66-.15-.22-.05-.42-.1-.64-.15Z"/>
              <path className="cls-553" d="M493.05,427.3c-.18.1-.35.2-.51.28-.18.08-.36.17-.54.26.22.05.43.11.64.15.23.05.45.1.66.15.19-.08.38-.15.57-.23.26-.1.49-.21.75-.3-.26-.06-.52-.11-.79-.17-.25-.05-.51-.1-.77-.14Z"/>
              <path className="cls-501" d="M493.9,426.75c-.1.07-.21.15-.33.23-.17.11-.34.23-.52.33.27.04.52.09.77.14.28.06.53.11.79.17.26-.1.49-.2.75-.3.17-.07.32-.14.49-.21-.37-.07-.72-.13-1.07-.2-.3-.05-.59-.1-.88-.16Z"/>
              <path className="cls-570" d="M494.49,426.27c-.09.09-.19.18-.3.26-.09.07-.18.14-.29.21.29.05.58.11.88.16.35.07.7.13,1.07.2.17-.07.31-.14.48-.22.17-.08.32-.15.46-.23-.48-.1-.94-.19-1.33-.25-.31-.04-.64-.09-.96-.14Z"/>
              <path className="cls-321" d="M495,425.66c-.08.11-.16.22-.25.33-.08.1-.16.19-.26.28.32.05.65.1.96.14.39.06.85.15,1.33.25.14-.08.26-.17.38-.26.13-.11.24-.23.34-.36-.53-.1-1.04-.2-1.48-.24-.32-.03-.67-.08-1.02-.12Z"/>
              <path className="cls-198" d="M495.3,425.22s-.05.07-.07.1c-.08.11-.15.22-.23.33.35.05.7.1,1.02.12.44.04.95.14,1.48.24.1-.13.18-.28.25-.45.02-.05.04-.11.06-.16-.54-.05-1.05-.1-1.52-.12-.32-.02-.65-.04-.98-.07Z"/>
              <path className="cls-463" d="M495.44,424.78c0,.11-.03.23-.07.34-.02.03-.05.07-.07.1.33.02.66.05.98.07.47.02.98.07,1.52.12.02-.06.04-.11.06-.17.03-.12.1-.23.13-.35-.54-.03-1.06-.05-1.58-.07-.32-.02-.64-.03-.97-.04Z"/>
              <path className="cls-264" d="M495.39,424.19c.02.08.03.17.04.25.01.11.02.23,0,.34.32.01.65.03.97.04.51.02,1.04.05,1.58.07.03-.12.09-.23.11-.35.01-.08.04-.17.04-.25-.59-.03-1.17-.05-1.75-.07-.33-.01-.66-.03-.99-.04Z"/>
              <path className="cls-587" d="M495.24,423.62c.03.11.06.22.09.33.02.08.04.17.06.25.33,0,.66.02.99.04.58.02,1.16.05,1.75.07,0-.08.01-.17,0-.25-.02-.11.06-.22.06-.33-.65-.03-1.32-.05-2.01-.08-.31,0-.63-.02-.94-.02Z"/>
              <path className="cls-362" d="M494.81,422.78c.12.17.22.34.3.51.05.11.09.22.13.33.32,0,.63.01.94.02.69.03,1.36.05,2.01.08,0-.11.06-.22,0-.33-.09-.17-.1-.34-.18-.51-.72-.03-1.5-.05-2.37-.08-.28,0-.56,0-.84-.01Z"/>
              <path className="cls-359" d="M494.28,422.11c.05.06.1.12.15.17.14.16.26.33.38.5.28,0,.56,0,.84.01.87.03,1.65.06,2.37.08-.08-.17-.1-.33-.19-.49-.03-.06-.05-.11-.08-.17-.81-.03-1.71-.06-2.69-.09-.25,0-.51,0-.78-.01Z"/>
              <path className="cls-422" d="M493.94,421.74c.06.07.12.13.19.2.05.06.1.11.15.17.26,0,.52,0,.78.01.98.03,1.89.06,2.69.09-.04-.06-.05-.11-.1-.17-.05-.07-.07-.13-.13-.19-.85-.03-1.81-.07-2.85-.1-.24,0-.48-.01-.73-.02Z"/>
              <path className="cls-272" d="M493.75,421.54c.06.07.12.13.19.2.25,0,.49,0,.73.02,1.04.03,2.01.07,2.85.1-.06-.06-.09-.13-.15-.19-.86-.03-1.84-.07-2.91-.1-.23,0-.46-.01-.7-.02Z"/>
              <path className="cls-358" d="M487.83,431.13c-.08.19-.14.39-.2.58.14,0,.28,0,.41,0,.28,0,.56,0,.84,0,.03-.2.07-.42.11-.62-.26.02-.53.03-.79.04-.13,0-.25,0-.38,0Z"/>
              <path className="cls-344" d="M488.43,429.86c-.14.22-.25.45-.35.69-.09.19-.17.39-.25.58.13,0,.25,0,.38,0,.27,0,.53-.02.79-.04.04-.21.09-.42.15-.62.05-.25.13-.48.24-.7-.2.02-.4.04-.64.05-.11,0-.21.02-.32.03Z"/>
              <path className="cls-438" d="M489.62,428.61c-.27.21-.52.42-.73.63-.18.18-.33.39-.47.61.1-.01.21-.02.32-.03.23-.01.44-.03.64-.05.11-.22.25-.41.42-.59.2-.18.45-.37.73-.55-.18-.02-.38-.03-.61-.04-.11,0-.21,0-.31.01Z"/>
              <path className="cls-213" d="M490.95,427.69c-.16.1-.31.2-.47.31-.3.2-.59.41-.86.62.1-.01.2-.02.31-.01.24,0,.43.02.61.04.28-.18.6-.36.92-.54.17-.09.35-.18.53-.27-.22-.05-.45-.1-.7-.13-.12-.02-.23-.02-.34-.02Z"/>
              <path className="cls-568" d="M491.84,427.13c-.15.1-.29.2-.43.27-.15.09-.31.19-.47.29.11,0,.22,0,.34.02.25.03.48.08.7.13.18-.09.36-.17.54-.26.17-.08.33-.17.51-.28-.27-.04-.54-.08-.82-.12-.13-.02-.26-.03-.39-.05Z"/>
              <path className="cls-123" d="M492.54,426.58c-.08.07-.17.15-.27.22-.14.12-.28.23-.43.34.13.01.26.03.39.05.28.04.55.08.82.12.18-.1.35-.22.52-.33.12-.08.22-.15.33-.23-.29-.05-.59-.11-.89-.15-.15-.02-.31-.02-.47-.02Z"/>
              <path className="cls-214" d="M493.06,426.12c-.08.09-.18.17-.28.25-.07.06-.15.13-.24.21.16,0,.32,0,.47.02.31.04.6.09.89.15.1-.07.2-.15.29-.21.11-.08.21-.17.3-.26-.32-.05-.65-.09-.96-.13-.16-.01-.31-.02-.47-.02Z"/>
              <path className="cls-383" d="M493.53,425.56c-.07.1-.16.2-.24.3-.07.09-.15.18-.24.26.16,0,.31,0,.47.02.32.03.64.08.96.13.09-.09.18-.18.26-.28.09-.11.17-.22.25-.33-.35-.05-.7-.09-1.02-.11-.16,0-.3,0-.45,0Z"/>
              <path className="cls-164" d="M493.84,425.16s-.05.06-.07.09c-.08.1-.16.2-.23.3.15,0,.29-.02.45,0,.32.02.67.07,1.02.11.08-.11.16-.22.23-.33.02-.03.05-.07.07-.1-.33-.02-.66-.05-.98-.06-.16,0-.32,0-.49,0Z"/>
              <path className="cls-164" d="M493.97,424.74c0,.11-.02.22-.06.33-.03.03-.06.06-.08.09.17,0,.33,0,.49,0,.32.01.65.03.98.06.02-.03.05-.07.07-.1.04-.11.06-.23.07-.34-.32-.01-.65-.02-.97-.03-.16,0-.33,0-.5-.01Z"/>
              <path className="cls-93" d="M493.92,424.17c.01.08.03.16.04.24.01.11.02.22.01.33.17,0,.34,0,.5.01.32,0,.65.02.97.03,0-.11,0-.23,0-.34,0-.08-.02-.17-.04-.25-.33,0-.66-.01-.99-.02-.16,0-.32,0-.48,0Z"/>
              <path className="cls-430" d="M493.82,423.6c.02.11.03.22.06.33.02.08.04.16.05.24.16,0,.32,0,.48,0,.33,0,.66.01.99.02-.02-.08-.04-.17-.06-.25-.03-.11-.06-.22-.09-.33-.32,0-.63-.01-.95-.01-.15,0-.31,0-.47,0Z"/>
              <path className="cls-453" d="M493.52,422.77c.09.17.17.34.22.5.04.11.05.22.07.33.16,0,.32,0,.47,0,.31,0,.63,0,.95.01-.03-.11-.07-.22-.13-.33-.08-.17-.18-.34-.3-.51-.28,0-.56,0-.85-.01-.14,0-.29,0-.44,0Z"/>
              <path className="cls-125" d="M493.09,422.1c.04.06.08.12.12.18.11.16.22.33.31.5.15,0,.3,0,.44,0,.28,0,.57,0,.85.01-.12-.17-.24-.33-.38-.5-.05-.06-.1-.12-.15-.17-.26,0-.53,0-.79-.01-.13,0-.26,0-.4,0Z"/>
              <path className="cls-387" d="M492.81,421.71c.05.07.1.14.15.21.04.06.08.12.13.18.14,0,.27,0,.4,0,.26,0,.53,0,.79.01-.05-.06-.1-.11-.15-.17-.06-.07-.12-.13-.19-.2-.25,0-.5-.01-.76-.02-.12,0-.25,0-.37,0Z"/>
              <path className="cls-614" d="M492.66,421.51c.05.07.1.14.15.21.13,0,.25,0,.37,0,.25,0,.51.01.76.02-.06-.07-.12-.13-.19-.2-.24,0-.48-.01-.73-.02-.12,0-.24,0-.36-.01Z"/>
              <path className="cls-433" d="M486.25,431.22c-.12.17-.25.33-.35.48.45,0,.89,0,1.32,0,.14,0,.28,0,.42,0,.06-.19.12-.38.2-.58-.13,0-.25,0-.38,0-.39.01-.79.05-1.2.08Z"/>
              <path className="cls-536" d="M487.16,430.05c-.17.21-.36.44-.52.66-.13.17-.28.34-.4.51.41-.03.81-.07,1.2-.08.13,0,.26,0,.38,0,.08-.19.16-.39.25-.58.1-.24.22-.48.35-.69-.1.01-.21.03-.32.05-.3.03-.61.09-.95.15Z"/>
              <path className="cls-529" d="M488.48,428.69c-.25.24-.52.48-.75.72-.19.21-.4.43-.57.64.34-.06.64-.12.95-.15.11-.02.21-.03.32-.05.14-.22.29-.42.47-.61.21-.21.46-.42.73-.63-.1.01-.2.02-.31.03-.27.02-.53.03-.83.04Z"/>
              <path className="cls-228" d="M489.63,427.64c-.12.11-.25.23-.38.35-.24.23-.52.46-.76.7.31-.01.56-.02.83-.04.11,0,.21-.02.31-.03.27-.21.56-.42.86-.62.16-.11.31-.21.47-.31-.11,0-.22,0-.34,0-.28-.01-.6-.03-.98-.04Z"/>
              <path className="cls-206" d="M490.27,427.02c-.1.1-.18.2-.29.28-.11.11-.23.22-.35.33.38.01.7.03.98.04.12,0,.23,0,.34,0,.16-.1.31-.2.47-.29.14-.07.28-.16.43-.27-.13-.01-.26-.03-.39-.04-.33-.02-.73-.05-1.18-.07Z"/>
              <path className="cls-201" d="M490.67,426.47c-.06.07-.1.15-.16.22-.08.12-.14.23-.24.34.46.02.86.05,1.18.07.14,0,.26.02.39.04.15-.1.29-.22.43-.34.09-.07.18-.15.27-.22-.16,0-.32,0-.47-.01-.4-.03-.87-.06-1.39-.09Z"/>
              <path className="cls-283" d="M491.03,426.02c-.06.08-.12.15-.19.23-.06.08-.1.15-.16.22.52.03.99.07,1.39.09.15,0,.31,0,.47.01.08-.07.16-.14.24-.21.1-.08.2-.16.28-.25-.16,0-.31,0-.48-.01-.45-.03-.98-.06-1.56-.09Z"/>
              <path className="cls-371" d="M491.37,425.5c-.05.1-.11.19-.17.28-.05.08-.11.16-.17.24.58.03,1.11.07,1.56.09.16,0,.32,0,.48.01.08-.09.17-.17.24-.26.08-.1.16-.2.24-.3-.15,0-.3.02-.48.02-.5-.02-1.07-.04-1.69-.07Z"/>
              <path className="cls-299" d="M491.56,425.12s-.03.06-.04.09c-.05.1-.1.19-.15.29.61.02,1.18.05,1.69.07.18,0,.33,0,.48-.02.07-.1.15-.2.23-.3.02-.03.05-.06.07-.09-.17,0-.34,0-.53,0-.54-.01-1.12-.02-1.75-.03Z"/>
              <path className="cls-299" d="M491.67,424.72c-.02.11-.03.21-.07.31-.02.03-.03.06-.05.09.63.01,1.21.02,1.75.03.19,0,.36,0,.53,0,.03-.03.05-.06.08-.09.04-.11.05-.22.06-.33-.17,0-.35,0-.53,0-.53,0-1.13-.01-1.77-.02Z"/>
              <path className="cls-384" d="M491.71,424.17c0,.08,0,.15,0,.23-.01.11,0,.21-.03.32.64,0,1.24,0,1.77.02.18,0,.36,0,.53,0,0-.11,0-.22-.01-.33,0-.08-.02-.16-.04-.24-.16,0-.32,0-.49,0-.52,0-1.11,0-1.73,0Z"/>
              <path className="cls-427" d="M491.68,423.62c0,.11.02.21.02.32,0,.08.01.15,0,.23.62,0,1.21,0,1.73,0,.16,0,.33,0,.49,0-.01-.08-.03-.16-.05-.24-.02-.11-.03-.22-.06-.33-.16,0-.32,0-.49,0-.51,0-1.07,0-1.65.01Z"/>
              <path className="cls-537" d="M491.56,422.79c.04.17.07.34.08.51,0,.11.03.21.03.32.58,0,1.14-.01,1.65-.01.16,0,.33,0,.49,0-.02-.11-.04-.22-.07-.33-.05-.17-.13-.34-.22-.5-.15,0-.31,0-.47,0-.47,0-.97,0-1.49.01Z"/>
              <path className="cls-211" d="M491.36,422.09c.02.06.04.12.06.18.05.17.1.34.14.51.52,0,1.02-.01,1.49-.01.16,0,.31,0,.47,0-.09-.17-.2-.33-.31-.5-.04-.06-.08-.12-.12-.18-.14,0-.27,0-.41,0-.42,0-.86,0-1.31,0Z"/>
              <path className="cls-564" d="M491.22,421.69c.03.07.05.15.08.22.02.06.04.12.06.19.45,0,.89,0,1.31,0,.14,0,.28,0,.41,0-.04-.06-.08-.12-.13-.18-.05-.07-.1-.14-.15-.21-.13,0-.25,0-.38,0-.39,0-.8-.02-1.21-.02Z"/>
              <path className="cls-530" d="M491.14,421.46c.03.07.06.15.08.22.41,0,.82.01,1.21.02.13,0,.26,0,.38,0-.05-.07-.1-.14-.15-.21-.12,0-.24,0-.37-.01-.38-.01-.76-.02-1.16-.03Z"/>
              <path className="cls-180" d="M484.56,431.28c-.13.15-.25.29-.35.43.11,0,.22,0,.33,0,.46,0,.91,0,1.36,0,.1-.16.23-.32.35-.48-.41.03-.84.06-1.29.06-.13,0-.27,0-.4,0Z"/>
              <path className="cls-475" d="M485.46,430.15c-.17.22-.35.44-.51.65-.13.17-.26.32-.39.47.13,0,.27.01.4,0,.45,0,.87-.03,1.29-.06.12-.17.27-.33.4-.51.15-.22.34-.45.52-.66-.34.06-.71.11-1.14.14-.19,0-.38-.02-.57-.04Z"/>
              <path className="cls-308" d="M486.48,428.72c-.18.25-.38.51-.54.77-.14.22-.32.45-.48.67.19.02.38.03.57.04.43-.03.8-.08,1.14-.14.17-.21.38-.44.57-.64.23-.24.5-.48.75-.72-.31.01-.66.03-1.14.05-.27-.01-.56-.02-.86-.03Z"/>
              <path className="cls-544" d="M487.21,427.59c-.07.12-.15.25-.22.37-.14.25-.33.5-.51.76.3,0,.6.01.86.03.47-.03.83-.04,1.14-.05.25-.24.53-.47.76-.7.13-.12.26-.24.38-.35-.38-.01-.83-.03-1.37-.03-.33,0-.67-.02-1.04-.02Z"/>
              <path className="cls-512" d="M487.49,426.93c-.02.1-.06.21-.11.3-.04.12-.11.23-.17.36.36,0,.71.01,1.04.02.54,0,.99.02,1.37.03.12-.11.24-.23.35-.33.11-.08.2-.18.29-.28-.46-.02-.98-.04-1.55-.06-.38,0-.79-.02-1.22-.04Z"/>
              <path className="cls-467" d="M487.57,426.39c-.01.07-.03.14-.04.22,0,.11-.01.22-.04.33.43.01.84.03,1.22.04.57.01,1.09.03,1.55.06.1-.1.16-.22.24-.34.06-.07.11-.14.16-.22-.52-.03-1.09-.06-1.69-.07-.45,0-.92-.01-1.41-.02Z"/>
              <path className="cls-305" d="M487.67,425.94c-.01.08-.02.15-.04.23-.02.07-.04.15-.06.22.49,0,.97,0,1.41.02.6,0,1.17.04,1.69.07.06-.07.1-.15.16-.22.07-.08.13-.15.19-.23-.58-.03-1.19-.06-1.82-.07-.49,0-1.01-.01-1.54-.01Z"/>
              <path className="cls-451" d="M487.7,425.44c0,.09,0,.18-.01.26,0,.08-.01.15-.02.23.53,0,1.04,0,1.54.01.63,0,1.25.03,1.82.07.06-.08.12-.16.17-.24.06-.09.12-.18.17-.28-.61-.02-1.27-.05-1.95-.05-.55,0-1.13,0-1.72,0Z"/>
              <path className="cls-474" d="M487.74,425.09s-.01.06-.01.08c-.01.09-.01.18-.02.27.59,0,1.16,0,1.72,0,.68,0,1.33.03,1.95.05.05-.1.1-.19.15-.29.01-.03.03-.06.04-.09-.63-.01-1.3-.02-2.01-.02-.59,0-1.19,0-1.82,0Z"/>
              <path className="cls-474" d="M487.83,424.69c-.03.1-.06.21-.08.31,0,.03-.01.06-.02.08.62,0,1.23,0,1.82,0,.71,0,1.38.01,2.01.02.01-.03.03-.06.05-.09.03-.1.04-.21.07-.31-.64,0-1.31,0-1.99-.01-.59,0-1.21,0-1.85-.01Z"/>
              <path className="cls-263" d="M487.96,424.14c-.02.08-.03.15-.05.23-.02.11-.05.21-.08.32.64,0,1.26,0,1.85.01.68,0,1.35,0,1.99.01.02-.11.02-.21.03-.32,0-.08,0-.15,0-.23-.62,0-1.26,0-1.89,0-.6,0-1.22-.01-1.86-.02Z"/>
              <path className="cls-23" d="M488.06,423.59c-.01.11-.03.21-.05.32-.01.08-.03.16-.04.23.64,0,1.26,0,1.86.02.62,0,1.27,0,1.89,0,0-.08,0-.15,0-.23,0-.11-.02-.21-.02-.32-.58,0-1.18,0-1.75,0-.6,0-1.23-.02-1.87-.02Z"/>
              <path className="cls-432" d="M488.1,422.76c0,.17-.01.34-.02.51,0,.11-.02.22-.03.32.64,0,1.27.01,1.87.02.58,0,1.18,0,1.75,0,0-.11-.03-.21-.03-.32-.01-.17-.04-.34-.08-.51-.52,0-1.05,0-1.56,0-.61-.01-1.25-.02-1.9-.03Z"/>
              <path className="cls-617" d="M488.1,422.04c0,.06,0,.13,0,.19,0,.18,0,.35,0,.53.66,0,1.29.02,1.9.03.51,0,1.04,0,1.56,0-.04-.17-.09-.34-.14-.51-.02-.06-.04-.12-.06-.18-.45,0-.91,0-1.37,0-.61-.02-1.25-.03-1.9-.04Z"/>
              <path className="cls-366" d="M488.06,421.61c0,.08.02.16.02.23,0,.07.01.13.01.19.65.01,1.28.03,1.9.04.46.01.92.01,1.37,0-.02-.06-.04-.12-.06-.19-.03-.07-.05-.15-.08-.22-.41,0-.83-.01-1.26-.02-.62-.02-1.25-.03-1.9-.05Z"/>
              <path className="cls-369" d="M488.03,421.38c.01.08.03.16.03.24.65.02,1.28.03,1.9.05.43.01.85.02,1.26.02-.03-.07-.06-.15-.08-.22-.39-.01-.8-.02-1.21-.03-.62-.02-1.25-.03-1.9-.05Z"/>
              <path className="cls-413" d="M483.7,431.22c-.07.16-.14.33-.18.48.12,0,.24,0,.36,0,.11,0,.22,0,.33,0,.1-.14.22-.27.35-.43-.13,0-.27-.02-.41-.02-.15,0-.29-.02-.45-.03Z"/>
              <path className="cls-405" d="M484.17,430.04c-.07.22-.16.44-.24.66-.07.18-.16.35-.22.51.15,0,.3.02.45.03.14,0,.27.02.41.02.13-.15.26-.3.39-.47.16-.21.34-.43.51-.65-.19-.02-.39-.04-.61-.05-.23-.02-.45-.04-.68-.06Z"/>
              <path className="cls-443" d="M484.47,428.68c-.06.22-.13.43-.16.65,0,.02-.01.04-.01.06,0,.21-.06.43-.13.65.23.02.45.04.68.06.21.02.41.04.61.05.17-.22.34-.45.48-.67.17-.26.36-.52.54-.77-.3,0-.62-.01-.94-.02-.34,0-.7-.01-1.08-.02Z"/>
              <path className="cls-488" d="M484.72,427.57c-.01.13-.03.25-.05.38-.04.25-.13.49-.2.73.38,0,.74.01,1.08.02.32,0,.64.01.94.02.18-.25.36-.5.51-.76.07-.13.16-.25.22-.37-.36,0-.75,0-1.15-.01-.43,0-.88,0-1.34,0Z"/>
              <path className="cls-160" d="M484.61,426.89c.05.1.1.2.1.3h0c.02.12.02.25,0,.37.47,0,.92,0,1.34,0,.4,0,.79,0,1.15.01.07-.12.13-.24.17-.36.05-.1.08-.2.11-.3-.43-.01-.88-.03-1.34-.03-.5,0-1.01,0-1.54,0Z"/>
              <path className="cls-381" d="M484.3,426.37c.03.07.07.14.11.21.07.1.14.2.19.31.53,0,1.04,0,1.54,0,.47,0,.92.02,1.34.03.02-.1.03-.21.04-.33.01-.07.03-.14.04-.22-.49,0-1.01,0-1.53,0-.56,0-1.14,0-1.73,0Z"/>
              <path className="cls-282" d="M484.18,425.93c.03.08.06.15.06.22,0,.07.03.15.06.22.59,0,1.17,0,1.73,0,.52,0,1.04,0,1.53,0,.01-.07.03-.15.06-.22.02-.08.03-.15.04-.23-.53,0-1.08,0-1.64,0-.6,0-1.22,0-1.84,0Z"/>
              <path className="cls-248" d="M483.9,425.44c.05.09.11.18.16.26.04.08.09.15.12.23.62,0,1.24,0,1.84,0,.57,0,1.11,0,1.64,0,.01-.08.01-.15.02-.23.01-.09,0-.18.01-.26-.59,0-1.19,0-1.81,0-.65,0-1.32,0-1.99,0Z"/>
              <path className="cls-520" d="M483.75,425.08s.02.06.02.09c.03.09.08.18.13.27.67,0,1.34,0,1.99,0,.61,0,1.22,0,1.81,0,0-.09,0-.18.02-.27,0-.03.01-.06.01-.08-.62,0-1.26,0-1.9,0-.69,0-1.38,0-2.09,0Z"/>
              <path className="cls-520" d="M483.75,424.69c-.01.1-.02.21-.02.31,0,.03,0,.06.02.09.7,0,1.4,0,2.09,0,.64,0,1.28,0,1.9,0,0-.03.01-.06.02-.08.02-.1.05-.21.08-.31-.64,0-1.29,0-1.95,0-.7,0-1.42,0-2.14,0Z"/>
              <path className="cls-256" d="M483.83,424.14c-.01.08-.03.16-.04.23-.01.11-.03.21-.04.32.72,0,1.44,0,2.14,0,.66,0,1.31,0,1.95,0,.03-.1.06-.21.08-.32.02-.08.03-.15.05-.23-.64,0-1.3,0-1.97,0-.71,0-1.44,0-2.17,0Z"/>
              <path className="cls-23" d="M483.89,423.58c0,.11-.02.22-.03.32,0,.08-.02.16-.04.24.73,0,1.45,0,2.17,0,.67,0,1.33,0,1.97,0,.02-.08.03-.16.04-.23.02-.1.04-.21.05-.32-.64,0-1.3,0-1.98-.01-.72,0-1.45,0-2.19,0Z"/>
              <path className="cls-23" d="M483.87,422.72c0,.18,0,.35.02.53.01.11.01.22,0,.33.74,0,1.47,0,2.19,0,.67,0,1.33,0,1.98.01.01-.11.03-.21.03-.32,0-.17.01-.34.02-.51-.66,0-1.33-.01-2.01-.02-.72,0-1.47-.01-2.22-.02Z"/>
              <path className="cls-341" d="M483.89,421.97c0,.07,0,.14,0,.2,0,.19-.01.37-.02.55.75,0,1.5.01,2.22.02.68,0,1.35.01,2.01.02,0-.17,0-.35,0-.53,0-.06,0-.13,0-.19-.65-.01-1.32-.02-2-.03-.72-.01-1.46-.02-2.21-.03Z"/>
              <path className="cls-306" d="M483.87,421.52c0,.08.01.17.02.25,0,.07,0,.14,0,.2.75.01,1.49.02,2.21.03.68.01,1.35.02,2,.03,0-.06,0-.13-.01-.19,0-.08-.02-.15-.02-.23-.65-.02-1.31-.03-1.99-.04-.72-.02-1.46-.03-2.2-.05Z"/>
              <path className="cls-95" d="M483.84,421.27c.02.08.02.17.03.25.74.02,1.48.03,2.2.05.68.01,1.34.03,1.99.04,0-.08-.02-.16-.03-.24-.65-.02-1.31-.03-1.99-.05-.72-.02-1.45-.04-2.2-.05Z"/>
              <path className="cls-133" d="M482.72,431.18c0,.18.02.35.04.52.13,0,.26,0,.39,0,.12,0,.24,0,.36,0,.04-.15.12-.32.18-.48-.15,0-.31-.02-.47-.02-.18,0-.34-.01-.51-.02Z"/>
              <path className="cls-516" d="M482.56,429.95c.06.22.08.46.12.68.03.18.04.36.04.54.17,0,.33.02.51.02.16,0,.32.01.47.02.07-.16.16-.34.22-.51.09-.22.18-.44.24-.66-.23-.02-.47-.04-.73-.05-.29-.01-.58-.03-.87-.05Z"/>
              <path className="cls-449" d="M481.96,428.63c.08.21.17.42.29.62.01.02.02.04.03.06.15.21.23.43.29.65.3.02.59.04.87.05.26.01.5.03.73.05.07-.22.12-.44.13-.65,0-.02.01-.04.01-.06.03-.22.1-.43.16-.65-.38,0-.77-.01-1.16-.02-.44-.01-.88-.02-1.34-.03Z"/>
              <path className="cls-274" d="M481.53,427.55c.06.13.1.26.16.38.1.23.18.47.27.7.46,0,.91.01,1.34.03.4.01.79.02,1.16.02.07-.24.16-.48.2-.73.02-.13.04-.26.05-.38-.47,0-.96,0-1.46,0-.56,0-1.13,0-1.73,0Z"/>
              <path className="cls-405" d="M481.03,426.88c.11.1.22.19.29.29t0,0c.09.12.15.25.21.38.59,0,1.17,0,1.73,0,.51,0,1,0,1.46,0,.01-.13.01-.25,0-.37h0c0-.1-.05-.2-.1-.3-.53,0-1.08,0-1.64,0-.62,0-1.27,0-1.94,0Z"/>
              <path className="cls-283" d="M480.47,426.37c.06.07.14.14.21.21.11.1.24.2.35.3.66,0,1.32,0,1.94,0,.57,0,1.11,0,1.64,0-.05-.1-.13-.2-.19-.31-.04-.07-.08-.14-.11-.21-.59,0-1.2,0-1.81,0-.67,0-1.35,0-2.02,0Z"/>
              <path className="cls-466" d="M480.15,425.93c.06.08.13.15.16.22.03.07.09.14.16.21.68,0,1.35,0,2.02,0,.61,0,1.22,0,1.81,0-.03-.07-.05-.14-.06-.22,0-.07-.03-.15-.06-.22-.62,0-1.26,0-1.9,0-.71,0-1.42,0-2.14,0Z"/>
              <path className="cls-227" d="M479.66,425.44c.09.09.19.18.27.26.07.08.15.15.21.23.71,0,1.43,0,2.14,0,.64,0,1.28,0,1.9,0-.03-.08-.08-.15-.12-.23-.05-.09-.11-.17-.16-.26-.67,0-1.35,0-2.03,0-.74,0-1.48,0-2.21,0Z"/>
              <path className="cls-451" d="M479.38,425.08s.03.06.05.09c.05.09.15.18.24.27.73,0,1.46,0,2.21,0,.68,0,1.36,0,2.03,0-.05-.09-.11-.18-.13-.27,0-.03-.02-.06-.02-.09-.7,0-1.4,0-2.1,0-.77,0-1.52,0-2.26,0Z"/>
              <path className="cls-451" d="M479.28,424.7c.01.1.03.19.06.29.01.03.02.06.04.09.74,0,1.5,0,2.26,0,.7,0,1.4,0,2.1,0,0-.03-.01-.06-.02-.09,0-.1,0-.2.02-.31-.72,0-1.44,0-2.15,0-.78,0-1.56,0-2.31.01Z"/>
              <path className="cls-533" d="M479.24,424.17c0,.07,0,.15.01.22.01.11.02.21.03.3.76,0,1.53-.01,2.31-.01.71,0,1.44,0,2.15,0,.01-.1.03-.21.04-.32.01-.08.03-.15.04-.23-.73,0-1.47,0-2.2,0-.8,0-1.6.02-2.39.03Z"/>
              <path className="cls-23" d="M479.2,423.59c.01.12.02.24.03.35,0,.08,0,.16.01.23.79-.02,1.59-.04,2.39-.03.73,0,1.47,0,2.2,0,.01-.08.03-.16.04-.24.01-.11.02-.21.03-.32-.74,0-1.48,0-2.23,0-.82,0-1.65,0-2.46.02Z"/>
              <path className="cls-23" d="M479.09,422.69c0,.18,0,.36.05.54.03.11.04.23.06.36.82-.01,1.64-.02,2.46-.02.75,0,1.49,0,2.23,0,0-.11,0-.22,0-.33-.02-.17-.02-.35-.02-.53-.75,0-1.52-.01-2.28-.02-.83,0-1.67,0-2.5-.01Z"/>
              <path className="cls-397" d="M479.08,421.91c0,.07,0,.14,0,.21.01.19,0,.38,0,.57.83,0,1.67,0,2.5.01.76,0,1.52.01,2.28.02,0-.18.01-.36.02-.55,0-.07,0-.13,0-.2-.75-.01-1.5-.02-2.27-.04-.84-.01-1.69-.02-2.54-.02Z"/>
              <path className="cls-327" d="M479.06,421.43c0,.09,0,.18.01.27,0,.07,0,.15,0,.22.86,0,1.71.01,2.54.02.76.01,1.52.02,2.27.04,0-.07,0-.14,0-.2,0-.08,0-.16-.02-.25-.74-.02-1.5-.03-2.26-.05-.84-.02-1.69-.03-2.55-.05Z"/>
              <path className="cls-180" d="M479.03,421.16c.02.09.03.18.04.27.86.02,1.71.03,2.55.05.76.02,1.52.03,2.26.05,0-.08-.02-.17-.03-.25-.75-.02-1.5-.04-2.27-.05-.84-.02-1.69-.04-2.55-.06Z"/>
              <path className="cls-154" d="M481.8,431.13c.1.19.18.38.26.57.1,0,.2,0,.3,0,.13,0,.26,0,.4,0-.03-.17-.03-.34-.04-.52-.17,0-.33-.02-.51-.03-.14,0-.27-.01-.41-.02Z"/>
              <path className="cls-552" d="M480.93,429.86c.2.22.38.46.54.69.13.19.23.39.33.58.14,0,.27.01.41.02.18,0,.35.02.51.03,0-.18-.02-.36-.04-.54-.03-.23-.05-.46-.12-.68-.3-.02-.6-.04-.91-.05-.24-.01-.48-.03-.73-.04Z"/>
              <path className="cls-458" d="M479.41,428.6c.26.22.52.42.79.62.28.2.52.41.72.64.25.01.49.03.73.04.31.02.61.03.91.05-.06-.22-.14-.45-.29-.65-.01-.02-.02-.04-.03-.06-.12-.2-.2-.41-.29-.62-.46,0-.93-.01-1.41-.02-.37,0-.75,0-1.13,0Z"/>
              <path className="cls-236" d="M478.24,427.56c.13.13.27.26.41.39.25.22.5.44.76.66.38,0,.76,0,1.13,0,.48,0,.95,0,1.41.02-.09-.23-.17-.47-.27-.7-.06-.13-.1-.25-.16-.38-.59,0-1.2,0-1.82,0-.48,0-.97,0-1.46.01Z"/>
              <path className="cls-134" d="M477.46,426.87c.12.1.24.19.36.29.15.13.29.26.42.4.5,0,.99,0,1.46-.01.62,0,1.23,0,1.82,0-.06-.13-.12-.25-.21-.38t0,0c-.07-.1-.18-.2-.29-.29-.66,0-1.34,0-2.01,0-.51,0-1.03,0-1.56,0Z"/>
              <path className="cls-496" d="M476.88,426.37c.07.07.16.14.23.21.11.1.24.2.35.3.52,0,1.04,0,1.56,0,.67,0,1.34,0,2.01,0-.11-.1-.24-.19-.35-.3-.07-.07-.15-.14-.21-.21-.68,0-1.36,0-2.04,0-.52,0-1.04,0-1.55,0Z"/>
              <path className="cls-1" d="M476.45,425.93c.07.08.15.15.21.22.06.07.14.14.21.21.51,0,1.03,0,1.55,0,.68,0,1.36,0,2.04,0-.06-.07-.13-.14-.16-.21-.03-.07-.1-.15-.16-.22-.71,0-1.42,0-2.12,0-.53,0-1.06,0-1.58,0Z"/>
              <path className="cls-368" d="M475.98,425.43c.08.09.18.18.25.27.07.08.15.15.23.23.52,0,1.05,0,1.58,0,.69,0,1.4,0,2.12,0-.06-.08-.15-.15-.21-.23-.08-.09-.18-.18-.27-.26-.73,0-1.44,0-2.13,0-.53,0-1.05,0-1.55,0Z"/>
              <path className="cls-595" d="M475.67,425.07s.04.06.06.09c.07.1.15.19.24.28.5,0,1.02,0,1.55,0,.69,0,1.41,0,2.13,0-.09-.09-.18-.18-.24-.27-.02-.03-.03-.06-.05-.09-.74,0-1.46,0-2.16,0-.53,0-1.05,0-1.55,0Z"/>
              <path className="cls-595" d="M475.46,424.7c.05.1.09.17.15.27.02.03.04.06.06.09.5,0,1.01,0,1.55,0,.7,0,1.42,0,2.16,0-.01-.03-.03-.06-.04-.09-.03-.1-.05-.2-.06-.29-.76,0-1.5.01-2.22.02-.55,0-1.09,0-1.6,0Z"/>
              <path className="cls-437" d="M475.23,424.21c.03.07.06.14.1.21.05.11.09.19.14.28.52,0,1.05.01,1.6,0,.72,0,1.46,0,2.22-.02-.01-.1-.02-.2-.03-.3,0-.08,0-.15-.01-.22-.79.02-1.56.04-2.32.05-.58,0-1.14,0-1.69-.01Z"/>
              <path className="cls-23" d="M475.02,423.6c.04.13.07.28.12.38.03.08.06.15.09.22.55.02,1.11.02,1.69.01.75,0,1.53-.03,2.32-.05,0-.07,0-.15-.01-.23-.01-.11-.02-.22-.03-.35-.82.01-1.62.02-2.41.02-.6,0-1.2,0-1.78-.01Z"/>
              <path className="cls-23" d="M474.74,422.66c.05.19.08.36.16.54.05.12.08.27.12.4.58.01,1.17.02,1.78.01.79,0,1.59-.01,2.41-.02-.01-.12-.02-.24-.06-.36-.05-.18-.05-.36-.05-.54-.83,0-1.66,0-2.49,0-.63,0-1.25-.01-1.87-.02Z"/>
              <path className="cls-140" d="M474.57,421.86c.01.08.03.15.04.23.05.2.08.39.13.57.61.01,1.24.02,1.87.02.82,0,1.65,0,2.49,0,0-.18.01-.37,0-.57,0-.07,0-.14,0-.21-.86,0-1.71,0-2.56-.02-.65,0-1.3-.02-1.95-.03Z"/>
              <path className="cls-132" d="M474.49,421.34c.02.09.03.19.04.29.01.08.02.16.04.23.65.02,1.3.03,1.95.03.85,0,1.71.01,2.56.02,0-.07,0-.15,0-.22,0-.09,0-.18-.01-.27-.86-.02-1.72-.03-2.58-.05-.66-.01-1.33-.02-1.99-.04Z"/>
              <path className="cls-375" d="M474.44,421.05c.02.09.03.19.05.29.66.01,1.33.03,1.99.04.86.02,1.72.03,2.58.05,0-.09-.02-.18-.04-.27-.86-.02-1.72-.04-2.59-.06-.66-.01-1.33-.03-2-.04Z"/>
              <path className="cls-401" d="M478.78,431.14c.1.19.19.37.27.56.91,0,1.81,0,2.71,0,.1,0,.2,0,.31,0-.09-.18-.17-.38-.26-.57-.14,0-.27-.01-.42-.01-.85,0-1.72.01-2.6.02Z"/>
              <path className="cls-114" d="M477.93,429.89c.2.22.37.45.52.68.12.19.23.38.33.56.88,0,1.75-.02,2.6-.02.15,0,.29,0,.42.01-.1-.19-.2-.39-.33-.58-.16-.24-.34-.47-.54-.69-.25-.01-.5-.02-.76-.03-.73.01-1.48.04-2.24.06Z"/>
              <path className="cls-447" d="M476.52,428.61c.24.22.49.43.75.64.25.2.47.42.67.64.76-.02,1.52-.05,2.24-.06.26,0,.51.02.76.03-.2-.23-.44-.44-.72-.64-.27-.2-.53-.41-.79-.62-.38,0-.78,0-1.18-.01-.56.01-1.14.02-1.72.02Z"/>
              <path className="cls-378" d="M475.42,427.56c.12.13.25.26.38.38.23.23.48.45.72.67.58,0,1.16,0,1.72-.02.4,0,.79,0,1.18.01-.26-.22-.51-.44-.76-.66-.14-.12-.27-.25-.41-.39-.5,0-1.01,0-1.51,0-.43,0-.87,0-1.31,0Z"/>
              <path className="cls-333" d="M474.79,426.86c.08.1.17.2.26.31.12.14.25.27.37.4.44,0,.88,0,1.31,0,.51,0,1.02,0,1.51,0-.13-.13-.27-.27-.42-.4-.11-.1-.24-.19-.36-.29-.52,0-1.05,0-1.57,0-.37,0-.74,0-1.1-.02Z"/>
              <path className="cls-479" d="M474.36,426.33c.05.07.11.14.17.21.08.11.18.21.26.31.37,0,.73.02,1.1.02.53,0,1.05,0,1.57,0-.12-.1-.24-.19-.35-.3-.07-.07-.16-.14-.23-.21-.51,0-1.02,0-1.52,0-.34,0-.67-.02-.99-.03Z"/>
              <path className="cls-331" d="M474.05,425.89c.05.08.1.15.15.23.05.07.11.14.16.22.33.02.66.03.99.03.5,0,1.01,0,1.52,0-.07-.07-.15-.14-.21-.21-.06-.07-.14-.15-.21-.22-.52,0-1.02,0-1.51,0-.31,0-.6-.02-.89-.04Z"/>
              <path className="cls-600" d="M473.71,425.39c.06.09.12.18.18.27.05.08.11.16.16.23.29.02.59.04.89.04.49,0,.99,0,1.51,0-.07-.08-.16-.15-.23-.23-.08-.09-.17-.18-.25-.27-.5,0-.99,0-1.45,0-.28,0-.55-.02-.81-.03Z"/>
              <path className="cls-588" d="M473.49,425.04s.03.06.05.08c.05.09.11.18.17.27.26.01.53.03.81.03.47,0,.95,0,1.45,0-.08-.09-.17-.18-.24-.28-.02-.03-.04-.06-.06-.09-.5,0-.97,0-1.43-.01-.26,0-.51,0-.75-.02Z"/>
              <path className="cls-607" d="M473.28,424.57c.06.13.11.25.17.38.02.03.03.06.05.08.24,0,.5.01.75.02.45,0,.93,0,1.43.01-.02-.03-.04-.06-.06-.09-.06-.1-.1-.18-.15-.27-.52,0-1.01-.02-1.49-.05-.25-.01-.48-.05-.7-.08Z"/>
              <path className="cls-507" d="M472.98,423.95c.04.08.08.17.12.26.06.12.12.24.17.36.22.04.45.07.7.08.48.02.97.04,1.49.05-.05-.1-.09-.18-.14-.28-.04-.08-.07-.14-.1-.21-.55-.02-1.08-.05-1.59-.1-.24-.02-.45-.09-.65-.15Z"/>
              <path className="cls-352" d="M472.67,423.36c.06.11.13.23.19.35.04.08.08.16.13.25.2.07.41.13.65.15.51.05,1.04.09,1.59.1-.03-.07-.06-.14-.09-.22-.05-.11-.08-.26-.12-.38-.58-.01-1.14-.04-1.68-.07-.24-.04-.46-.11-.66-.17Z"/>
              <path className="cls-104" d="M472.15,422.48c.11.18.21.36.32.53.07.11.14.23.2.34.2.07.42.13.66.17.54.04,1.11.06,1.68.07-.04-.13-.07-.28-.12-.4-.07-.18-.11-.36-.16-.54-.61-.01-1.22-.03-1.81-.05-.3-.04-.54-.09-.79-.14Z"/>
              <path className="cls-524" d="M471.69,421.71c.04.07.08.14.12.21.12.19.22.38.33.56.24.05.49.1.79.14.59.02,1.19.04,1.81.05-.05-.19-.07-.37-.13-.57-.02-.07-.03-.15-.04-.23-.65-.02-1.29-.04-1.92-.07-.35-.02-.66-.05-.96-.09Z"/>
              <path className="cls-519" d="M471.41,421.24c.05.09.1.17.15.26.04.07.08.14.13.21.3.04.61.07.96.09.63.03,1.27.05,1.92.07-.01-.08-.02-.16-.04-.23-.02-.09-.02-.19-.04-.29-.66-.01-1.33-.03-1.98-.05-.38-.01-.74-.03-1.1-.05Z"/>
              <path className="cls-590" d="M471.25,420.98c.05.09.1.17.16.26.36.02.72.04,1.1.05.65.02,1.32.03,1.98.05-.02-.09-.03-.19-.05-.29-.67-.01-1.33-.03-2-.04-.4,0-.79-.02-1.19-.03Z"/>
              <path className="cls-428" d="M473.63,431.18c.02.17.04.34.06.51.87,0,1.76,0,2.65,0,.9,0,1.8,0,2.71,0-.08-.18-.17-.37-.27-.56-.88,0-1.75.02-2.6.02-.85,0-1.71.01-2.55.03Z"/>
              <path className="cls-216" d="M473.43,430.01c.05.21.09.43.13.65.03.17.05.35.08.52.84-.01,1.7-.02,2.55-.03.85,0,1.73-.01,2.6-.02-.1-.19-.21-.38-.33-.56-.15-.23-.33-.46-.52-.68-.76.02-1.52.05-2.26.06-.74.02-1.49.04-2.24.06Z"/>
              <path className="cls-252" d="M473.05,428.66c.07.24.13.48.2.72.07.21.13.42.18.64.74-.02,1.5-.05,2.24-.06.74-.02,1.5-.04,2.26-.06-.2-.22-.42-.44-.67-.64-.25-.21-.5-.42-.75-.64-.58,0-1.17.01-1.74.02-.57.01-1.15.02-1.73.03Z"/>
              <path className="cls-276" d="M472.75,427.56c.04.13.07.26.1.38.07.24.12.48.19.72.57,0,1.15-.01,1.73-.03.57-.01,1.16-.02,1.74-.02-.24-.22-.49-.44-.72-.67-.13-.12-.25-.25-.38-.38-.44,0-.89,0-1.33,0-.44,0-.89,0-1.34,0Z"/>
              <path className="cls-285" d="M472.56,426.82c.03.12.06.24.08.35.04.13.07.26.11.39.45,0,.9,0,1.34,0,.44,0,.88,0,1.33,0-.12-.13-.25-.26-.37-.4-.08-.1-.17-.2-.26-.31-.37,0-.73-.02-1.1-.02-.37,0-.75-.01-1.12-.02Z"/>
              <path className="cls-590" d="M472.42,426.25c.02.07.03.15.05.22.03.11.06.23.09.35.38,0,.75.01,1.12.02.37,0,.74.01,1.1.02-.08-.1-.18-.21-.26-.31-.06-.07-.11-.14-.17-.21-.33-.02-.65-.04-.97-.05-.19,0-.38-.01-.58-.02-.13,0-.26,0-.39-.01Z"/>
              <path className="cls-480" d="M472.32,425.8c.02.08.04.15.05.23.02.07.03.14.05.22.13,0,.26.01.39.01.19,0,.39.01.58.02.32.01.64.03.97.05-.05-.07-.11-.14-.16-.22-.05-.07-.1-.15-.15-.23-.29-.02-.57-.04-.86-.05-.17,0-.35-.01-.52-.02-.12,0-.23,0-.35-.01Z"/>
              <path className="cls-571" d="M472.19,425.32c.02.08.05.17.07.25.02.07.04.15.06.23.12,0,.23.01.35.01.17,0,.35.01.52.02.29.01.57.03.86.05-.05-.08-.11-.15-.16-.23-.06-.09-.12-.18-.18-.27-.26-.01-.52-.03-.76-.04-.25,0-.51-.02-.76-.03Z"/>
              <path className="cls-532" d="M472.11,425s0,.05,0,.08c.02.08.04.16.07.25.25.01.51.02.76.03.24,0,.5.02.76.04-.06-.09-.12-.18-.17-.27-.02-.03-.03-.06-.05-.08-.24,0-.48-.01-.7-.02-.13,0-.27,0-.4-.01-.09,0-.18,0-.28,0Z"/>
              <path className="cls-183" d="M472.01,424.39c.03.17.07.35.1.53,0,.03,0,.05,0,.08.1,0,.19,0,.28,0,.13,0,.26,0,.4.01.22,0,.46.01.7.02-.02-.03-.03-.06-.05-.08-.05-.13-.11-.25-.17-.38-.22-.04-.43-.08-.64-.1-.13-.01-.25-.03-.37-.04-.09-.01-.17-.02-.26-.03Z"/>
              <path className="cls-393" d="M471.77,423.61c.03.09.08.21.11.31.04.15.09.31.12.47.09.01.17.02.26.03.12.01.24.03.37.04.21.02.42.06.64.1-.06-.13-.11-.24-.17-.36-.04-.09-.08-.17-.12-.26-.2-.07-.39-.14-.59-.18-.19-.04-.41-.1-.62-.16Z"/>
              <path className="cls-317" d="M471.45,422.98c.08.11.14.23.2.35.04.08.09.18.13.28.21.06.43.12.62.16.2.04.39.11.59.18-.04-.08-.08-.17-.13-.25-.06-.11-.12-.24-.19-.35-.2-.07-.4-.14-.6-.19-.12-.03-.24-.07-.38-.11-.09-.02-.17-.05-.25-.08Z"/>
              <path className="cls-609" d="M470.65,422.18c.19.16.37.33.53.48.1.1.18.2.26.31.08.03.16.05.25.08.14.04.26.08.38.11.2.05.4.12.6.19-.06-.11-.13-.23-.2-.34-.11-.17-.21-.35-.32-.53-.24-.05-.48-.1-.74-.15-.16-.03-.3-.06-.46-.09-.1-.02-.2-.04-.29-.06Z"/>
              <path className="cls-203" d="M469.79,421.51c.08.06.17.11.25.17.21.17.43.33.62.5.09.02.19.04.29.06.16.03.3.06.46.09.27.04.5.1.74.15-.11-.18-.22-.37-.33-.56-.04-.07-.08-.14-.12-.21-.3-.04-.6-.08-.94-.1-.32-.03-.64-.06-.96-.1Z"/>
              <path className="cls-110" d="M469.22,421.14c.11.07.21.13.32.2.09.06.17.11.26.17.32.03.64.07.96.1.34.02.64.06.94.1-.04-.07-.08-.14-.13-.21-.05-.08-.1-.17-.15-.26-.36-.02-.72-.04-1.09-.06-.37-.02-.73-.03-1.1-.05Z"/>
              <path className="cls-562" d="M468.89,420.94c.11.07.22.13.33.2.37.02.73.04,1.1.05.37.01.73.04,1.09.06-.05-.08-.1-.17-.16-.26-.4,0-.79-.02-1.18-.03-.39,0-.79-.02-1.18-.02Z"/>
              <path className="cls-288" d="M470.19,431.22c0,.17-.02.33-.03.49.33,0,.66,0,.99,0,.83,0,1.68,0,2.55,0-.02-.17-.04-.34-.06-.51-.84.01-1.67.02-2.45.03-.34,0-.67,0-.99,0Z"/>
              <path className="cls-240" d="M470.26,430.09c-.01.21-.03.42-.04.63,0,.17-.02.34-.03.5.33,0,.66,0,.99,0,.78,0,1.61-.02,2.45-.03-.02-.17-.05-.35-.08-.52-.04-.22-.08-.43-.13-.65-.74.02-1.48.05-2.16.07-.34,0-.67,0-1.01,0Z"/>
              <path className="cls-462" d="M470.34,428.7c-.01.25-.03.5-.04.75-.01.21-.03.42-.04.64.33,0,.67,0,1.01,0,.69-.02,1.42-.04,2.16-.07-.05-.21-.11-.43-.18-.64-.07-.24-.13-.48-.2-.72-.57,0-1.14.01-1.69.03-.34,0-.68,0-1.02,0Z"/>
              <path className="cls-303" d="M470.37,427.56c0,.13,0,.26,0,.39,0,.25-.01.5-.03.75.34,0,.68,0,1.02,0,.55-.01,1.12-.02,1.69-.03-.07-.24-.12-.48-.19-.72-.04-.13-.07-.26-.1-.38-.45,0-.9,0-1.34,0-.35,0-.7,0-1.05,0Z"/>
              <path className="cls-285" d="M470.44,426.81c-.03.12-.06.24-.07.37,0,.13,0,.25,0,.38.35,0,.7,0,1.05,0,.44,0,.89,0,1.34,0-.04-.13-.07-.26-.11-.39-.02-.12-.05-.24-.08-.35-.38,0-.75-.01-1.13,0-.33,0-.66,0-1,0Z"/>
              <path className="cls-492" d="M470.55,426.22c-.01.08-.03.16-.04.23,0,.12-.04.24-.07.36.34,0,.67,0,1,0,.38,0,.75,0,1.13,0-.03-.12-.06-.23-.09-.35-.02-.07-.03-.15-.05-.22-.32-.01-.64-.03-.98-.03-.29,0-.59,0-.89,0Z"/>
              <path className="cls-176" d="M470.61,425.76c-.02.08-.03.16-.03.23,0,.08-.02.15-.03.23.3,0,.6,0,.89,0,.34,0,.66.02.98.03-.02-.07-.03-.14-.05-.22-.02-.08-.03-.15-.05-.23-.29-.02-.58-.04-.88-.04-.27,0-.54,0-.83,0Z"/>
              <path className="cls-571" d="M470.7,425.29c-.02.08-.04.16-.04.24,0,.07-.02.15-.04.23.28,0,.56,0,.83,0,.3,0,.59.02.88.04-.02-.08-.04-.15-.06-.23-.02-.08-.05-.17-.07-.25-.25-.01-.51-.02-.76-.03-.23,0-.48,0-.73,0Z"/>
              <path className="cls-597" d="M470.73,424.98s0,.05,0,.07c0,.08-.02.15-.04.23.25,0,.5,0,.73,0,.25,0,.51.02.76.03-.02-.08-.05-.16-.07-.25,0-.03,0-.05,0-.08-.22,0-.46-.01-.7-.01-.21,0-.44,0-.68,0Z"/>
              <path className="cls-550" d="M470.66,424.3c.03.19.06.4.08.61,0,.02,0,.05,0,.07.24,0,.46,0,.68,0,.24,0,.48,0,.7.01,0-.03,0-.05,0-.08-.03-.18-.07-.37-.1-.53-.21-.03-.43-.06-.66-.08-.22,0-.45-.01-.69-.01Z"/>
              <path className="cls-203" d="M470.42,423.42c.04.1.08.22.11.34.05.17.09.35.13.55.24,0,.47,0,.69.01.23.02.45.05.66.08-.03-.17-.08-.33-.12-.47-.03-.11-.08-.22-.11-.31-.21-.06-.42-.12-.59-.14-.24-.02-.5-.04-.76-.05Z"/>
              <path className="cls-508" d="M470.06,422.8c.1.1.19.2.25.34.04.08.08.18.11.28.26,0,.52.02.76.05.17.03.38.08.59.14-.03-.09-.09-.19-.13-.28-.06-.13-.12-.24-.2-.35-.21-.07-.41-.13-.6-.17-.25-.01-.52-.01-.79-.02Z"/>
              <path className="cls-411" d="M469.07,422.04c.24.16.47.33.64.48.12.1.24.18.34.28.27,0,.53,0,.79.02.19.03.39.1.6.17-.08-.11-.16-.21-.26-.31-.15-.16-.34-.32-.53-.48-.24-.05-.48-.1-.75-.14-.27,0-.55,0-.83,0Z"/>
              <path className="cls-464" d="M467.97,421.4c.11.05.21.1.31.16.27.15.55.32.79.48.28,0,.56,0,.83,0,.28.04.51.09.75.14-.19-.16-.4-.33-.62-.5-.08-.06-.16-.11-.25-.17-.32-.03-.64-.06-.96-.08-.28-.01-.57-.03-.86-.04Z"/>
              <path className="cls-190" d="M467.24,421.07c.13.06.27.12.4.18.11.05.22.1.33.15.29,0,.57.02.86.04.32.02.64.04.96.08-.08-.06-.17-.11-.26-.17-.1-.07-.21-.14-.32-.2-.37-.02-.73-.03-1.1-.04-.29,0-.58-.02-.88-.02Z"/>
              <path className="cls-365" d="M466.84,420.89c.13.06.27.12.4.18.29,0,.59.01.88.02.36.01.73.03,1.1.04-.11-.07-.22-.13-.33-.2-.39,0-.78-.02-1.17-.02-.29,0-.59-.01-.88-.02Z"/>
              <path className="cls-326" d="M466.11,431.25c0,.17,0,.33-.01.5,1.03-.02,2.07-.03,3.1-.04.32,0,.64,0,.96,0,.01-.16.02-.33.03-.49-.33,0-.65,0-.97,0-1.05,0-2.08.02-3.12.03Z"/>
              <path className="cls-604" d="M466.04,430.12c.01.21.03.42.04.63.01.17.02.34.02.5,1.03-.01,2.07-.02,3.12-.03.32,0,.64,0,.97,0,0-.17.02-.33.03-.5.01-.21.03-.42.04-.63-.33,0-.66,0-.99,0-1.07,0-2.15.02-3.23.03Z"/>
              <path className="cls-594" d="M465.98,428.73c.02.25.04.5.04.75,0,.21,0,.42.01.64,1.08-.01,2.15-.02,3.23-.03.33,0,.66,0,.99,0,.01-.21.03-.42.04-.64.01-.25.03-.5.04-.75-.34,0-.67,0-1.01,0-1.12,0-2.23.02-3.34.03Z"/>
              <path className="cls-240" d="M465.83,427.59c.01.13.05.26.06.39.03.25.06.49.09.75,1.11-.01,2.22-.02,3.34-.03.34,0,.67,0,1.01,0,.01-.25.02-.5.03-.75,0-.13,0-.26,0-.39-.35,0-.7,0-1.05,0-1.16,0-2.32.01-3.48.02Z"/>
              <path className="cls-285" d="M465.97,426.84c-.07.12-.18.24-.18.36,0,.13.03.26.04.39,1.16,0,2.32-.02,3.48-.02.35,0,.7,0,1.05,0,0-.13,0-.26,0-.38,0-.12.04-.25.07-.37-.34,0-.68,0-1.01,0-1.13,0-2.29.01-3.45.03Z"/>
              <path className="cls-489" d="M466.37,426.25c-.04.08-.11.16-.14.23-.06.12-.19.24-.26.36,1.17-.01,2.33-.02,3.45-.03.34,0,.68,0,1.01,0,.03-.12.07-.24.07-.36,0-.08.02-.16.04-.23-.3,0-.61,0-.93,0-1.05,0-2.13.01-3.25.03Z"/>
              <path className="cls-400" d="M466.55,425.79c-.04.08-.09.16-.09.23,0,.07-.05.15-.09.23,1.11-.01,2.2-.02,3.25-.03.31,0,.62,0,.93,0,.01-.08.03-.15.03-.23,0-.08.02-.16.03-.23-.28,0-.58,0-.87,0-.99,0-2.06.02-3.18.03Z"/>
              <path className="cls-257" d="M466.9,425.31c-.06.08-.16.16-.2.25-.04.07-.11.15-.15.23,1.12-.02,2.2-.03,3.18-.03.3,0,.59,0,.87,0,.02-.08.04-.16.04-.23,0-.08.03-.16.04-.24-.25,0-.52,0-.79,0-.91,0-1.93.01-3,.03Z"/>
              <path className="cls-177" d="M467.08,425s-.01.05-.02.07c-.02.08-.11.16-.16.24,1.08-.01,2.09-.03,3-.03.27,0,.54,0,.79,0,.02-.08.04-.15.04-.23,0-.02,0-.05,0-.07-.24,0-.49,0-.75,0-.87,0-1.85,0-2.91.02Z"/>
              <path className="cls-222" d="M466.96,424.36c.05.18.12.37.13.56,0,.02,0,.05,0,.07,1.06,0,2.04-.01,2.91-.02.26,0,.51,0,.75,0,0-.02,0-.05,0-.07-.01-.21-.04-.42-.08-.61-.24,0-.49,0-.76,0-.89,0-1.88.03-2.94.06Z"/>
              <path className="cls-428" d="M466.58,423.52c.05.1.11.21.16.33.07.16.16.34.22.51,1.06-.03,2.05-.06,2.94-.06.27,0,.52,0,.76,0-.03-.19-.08-.38-.13-.55-.03-.12-.07-.23-.11-.34-.26,0-.54-.01-.82-.01-.93,0-1.94.05-3.02.12Z"/>
              <path className="cls-478" d="M466.21,422.88c.09.11.19.21.23.35.04.09.1.18.14.29,1.07-.06,2.09-.12,3.02-.12.28,0,.55,0,.82.01-.04-.1-.08-.2-.11-.28-.06-.14-.15-.24-.25-.34-.27,0-.55,0-.83,0-.95,0-1.96.04-3.02.08Z"/>
              <path className="cls-155" d="M465.25,422.07c.23.18.49.35.62.52.12.1.25.19.34.29,1.06-.04,2.07-.08,3.02-.08.28,0,.56,0,.83,0-.1-.1-.22-.18-.34-.28-.17-.15-.4-.31-.64-.48-.28,0-.57,0-.85,0-.96,0-1.96.02-2.97.03Z"/>
              <path className="cls-500" d="M464.13,421.38c.1.06.21.11.3.17.26.16.58.34.81.52,1.01-.02,2.01-.03,2.97-.03.29,0,.57,0,.85,0-.24-.16-.52-.33-.79-.48-.1-.05-.2-.11-.31-.16-.29,0-.58-.02-.87-.02-.97-.01-1.97,0-2.97,0Z"/>
              <path className="cls-258" d="M463.46,421.02c.11.07.24.13.36.2.1.06.21.11.31.17,1-.01,2-.02,2.97,0,.29,0,.58.01.87.02-.11-.05-.22-.1-.33-.15-.13-.06-.27-.12-.4-.18-.29,0-.59-.01-.88-.02-.97-.02-1.94-.03-2.9-.04Z"/>
              <path className="cls-394" d="M463.13,420.82c.1.07.22.13.33.2.96,0,1.93.02,2.9.04.29,0,.59.01.88.02-.13-.06-.27-.12-.4-.18-.29,0-.58-.01-.87-.02-.96-.02-1.91-.04-2.84-.06Z"/>
              <path className="cls-542" d="M458.57,431.44c0,.17.03.35.02.52,1.49-.05,2.98-.1,4.39-.14,1.03-.03,2.07-.05,3.1-.07.01-.17.02-.33.01-.5-1.03.01-2.07.03-3.12.06-1.43.04-2.92.08-4.42.12Z"/>
              <path className="cls-420" d="M458.43,430.26c.02.22.07.43.09.65.01.17.05.35.06.52,1.49-.05,2.99-.09,4.42-.12,1.05-.03,2.08-.05,3.12-.06,0-.17-.01-.33-.02-.5-.01-.21-.03-.42-.04-.63-1.08.01-2.15.03-3.23.05-1.45.03-2.92.06-4.38.1Z"/>
              <path className="cls-216" d="M458.28,428.84c.03.26.09.51.09.77,0,.22.04.44.06.65,1.46-.04,2.93-.07,4.38-.1,1.07-.02,2.15-.04,3.23-.05-.01-.21-.02-.42-.01-.64,0-.25-.02-.5-.04-.75-1.11.01-2.22.02-3.34.04-1.47.02-2.94.05-4.36.07Z"/>
              <path className="cls-307" d="M458.1,427.67c.01.13.04.27.05.4.03.26.1.51.13.77,1.43-.03,2.9-.05,4.36-.07,1.12-.01,2.23-.03,3.34-.04-.02-.25-.06-.5-.09-.75-.01-.13-.05-.26-.06-.39-1.16,0-2.31.02-3.45.03-1.47.01-2.91.03-4.29.05Z"/>
              <path className="cls-276" d="M458.16,426.93c-.04.11-.1.23-.11.34,0,.13.03.27.04.4,1.38-.02,2.81-.03,4.29-.05,1.14-.01,2.29-.02,3.45-.03-.01-.13-.04-.26-.04-.39,0-.12.11-.24.18-.36-1.17.01-2.34.02-3.48.03-1.49.01-2.93.03-4.32.05Z"/>
              <path className="cls-434" d="M458.44,426.36c-.02.07-.07.15-.1.22-.05.11-.13.23-.18.34,1.39-.02,2.84-.03,4.32-.05,1.14-.01,2.31-.02,3.48-.03.07-.12.2-.24.26-.36.04-.08.11-.16.14-.23-1.11.01-2.26.03-3.41.04-1.51.02-3.03.05-4.52.07Z"/>
              <path className="cls-542" d="M458.55,425.92c-.02.07-.06.15-.06.22,0,.07-.03.15-.05.22,1.48-.02,3.01-.05,4.52-.07,1.16-.02,2.3-.03,3.41-.04.04-.08.09-.15.09-.23,0-.08.06-.16.09-.23-1.12.02-2.28.04-3.45.05-1.52.02-3.05.05-4.55.08Z"/>
              <path className="cls-271" d="M458.79,425.44c-.04.08-.1.17-.14.25-.03.07-.08.15-.11.23,1.5-.03,3.03-.05,4.55-.08,1.17-.02,2.33-.04,3.45-.05.04-.08.11-.16.15-.23.04-.08.14-.16.2-.25-1.08.01-2.22.03-3.4.05-1.53.02-3.13.05-4.71.08Z"/>
              <path className="cls-493" d="M458.92,425.11s0,.05-.01.08c-.02.08-.07.17-.11.25,1.58-.03,3.17-.06,4.71-.08,1.18-.02,2.32-.04,3.4-.05.06-.08.14-.16.16-.24,0-.02.02-.05.02-.07-1.06,0-2.2.02-3.39.04-1.54.02-3.16.05-4.78.07Z"/>
              <path className="cls-493" d="M458.85,424.57c.03.15.06.31.07.47,0,.02,0,.05,0,.08,1.61-.03,3.23-.05,4.78-.07,1.19-.02,2.33-.03,3.39-.04,0-.02.01-.05,0-.07,0-.19-.08-.38-.13-.56-1.06.03-2.19.07-3.37.09-1.53.03-3.14.07-4.74.12Z"/>
              <path className="cls-605" d="M458.65,423.82c.03.1.06.2.09.3.04.14.09.29.12.44,1.6-.05,3.22-.09,4.74-.12,1.17-.02,2.31-.06,3.37-.09-.05-.18-.15-.35-.22-.51-.05-.11-.12-.23-.16-.33-1.07.06-2.2.13-3.36.16-1.5.03-3.05.09-4.58.14Z"/>
              <path className="cls-569" d="M458.47,423.13c.04.13.08.26.1.4.02.1.05.19.07.29,1.53-.06,3.09-.11,4.58-.14,1.15-.03,2.28-.09,3.36-.16-.05-.1-.11-.2-.14-.29-.05-.14-.14-.25-.23-.35-1.06.04-2.16.08-3.28.11-1.46.03-2.97.08-4.45.13Z"/>
              <path className="cls-535" d="M458.06,422.18c.1.19.21.38.25.58.06.12.12.24.16.37,1.48-.05,2.99-.1,4.45-.13,1.12-.03,2.22-.07,3.28-.11-.09-.11-.22-.19-.34-.29-.13-.16-.39-.34-.62-.52-1.01.02-2.05.03-3.08.05-1.35.01-2.74.04-4.1.06Z"/>
              <path className="cls-535" d="M457.54,421.4c.04.07.1.14.14.21.12.19.27.38.38.57,1.36-.02,2.76-.04,4.1-.06,1.04-.01,2.07-.03,3.08-.05-.23-.18-.55-.35-.81-.52-.09-.06-.2-.11-.3-.17-1,.01-1.99.02-2.94.02-1.24,0-2.47,0-3.65,0Z"/>
              <path className="cls-535" d="M457.26,420.94c.04.08.1.16.15.25.04.07.09.14.14.21,1.18,0,2.41,0,3.65,0,.95,0,1.94,0,2.94-.02-.1-.06-.21-.11-.31-.17-.12-.07-.25-.13-.36-.2-.96,0-1.9-.02-2.81-.03-1.18-.02-2.31-.03-3.4-.04Z"/>
              <path className="cls-134" d="M457.13,420.7c.03.08.08.16.13.25,1.08.01,2.22.03,3.4.04.91.01,1.85.02,2.81.03-.11-.07-.23-.13-.33-.2-.93-.02-1.83-.04-2.71-.05-1.14-.02-2.24-.04-3.29-.06Z"/>
              <path className="cls-395" d="M452.13,431.67c0,.18.02.36.02.55.66-.03,1.34-.06,2.03-.09,1.43-.06,2.93-.12,4.42-.17,0-.17-.01-.35-.02-.52-1.49.05-2.98.1-4.39.15-.71.03-1.39.05-2.05.08Z"/>
              <path className="cls-223" d="M452.05,430.44c0,.23.03.45.05.68,0,.18.03.36.03.55.66-.03,1.34-.05,2.05-.08,1.41-.05,2.9-.11,4.39-.15,0-.17-.04-.35-.06-.52-.02-.22-.07-.43-.09-.65-1.46.04-2.89.08-4.25.12-.73.02-1.45.04-2.13.06Z"/>
              <path className="cls-602" d="M451.98,428.97c.01.27.04.53.04.8,0,.23.02.45.03.68.68-.02,1.4-.04,2.13-.06,1.36-.04,2.8-.08,4.25-.12-.02-.22-.06-.43-.06-.65,0-.26-.06-.51-.09-.77-1.43.03-2.81.06-4.1.08-.77.01-1.51.03-2.2.04Z"/>
              <path className="cls-388" d="M451.9,427.75c0,.14.02.28.02.42.01.27.04.53.06.8.69-.01,1.43-.03,2.2-.04,1.29-.03,2.67-.06,4.1-.08-.03-.26-.1-.51-.13-.77-.02-.14-.04-.27-.05-.4-1.38.02-2.69.03-3.92.05-.8,0-1.56.02-2.28.03Z"/>
              <path className="cls-169" d="M451.91,427c0,.11-.02.22-.02.32,0,.14,0,.28.01.42.71,0,1.48-.02,2.28-.03,1.23-.02,2.54-.03,3.92-.05-.01-.13-.03-.27-.04-.4,0-.11.06-.23.11-.34-1.39.02-2.73.03-3.98.05-.79,0-1.55.02-2.27.03Z"/>
              <path className="cls-186" d="M451.97,426.46c0,.07-.01.14-.02.22,0,.11-.03.22-.04.32.71,0,1.47-.02,2.27-.03,1.26-.01,2.59-.03,3.98-.05.04-.11.13-.23.18-.34.03-.07.08-.15.1-.22-1.48.02-2.93.05-4.26.07-.77.01-1.51.02-2.21.03Z"/>
              <path className="cls-293" d="M451.99,426.03c0,.07-.01.15-.01.22s0,.14-.01.22c.7-.01,1.44-.02,2.21-.03,1.34-.02,2.78-.04,4.26-.07.02-.07.05-.15.05-.22,0-.07.03-.15.06-.22-1.5.03-2.97.05-4.37.08-.76.01-1.49.02-2.19.03Z"/>
              <path className="cls-224" d="M452.05,425.56c0,.08-.02.16-.03.25,0,.07-.02.15-.02.22.7-.01,1.43-.02,2.19-.03,1.4-.02,2.87-.05,4.37-.08.02-.07.07-.15.11-.23.04-.08.1-.17.14-.25-1.58.03-3.14.06-4.61.09-.74.01-1.45.03-2.13.04Z"/>
              <path className="cls-94" d="M452.07,425.24s0,.05,0,.08c0,.08-.02.16-.02.25.68-.01,1.4-.03,2.13-.04,1.47-.03,3.03-.06,4.61-.09.04-.08.09-.17.11-.25,0-.03.01-.05.01-.08-1.61.03-3.22.06-4.74.09-.73.01-1.43.03-2.11.04Z"/>
              <path className="cls-94" d="M452.02,424.74c.02.14.06.29.06.43,0,.03,0,.05,0,.08.68-.01,1.38-.03,2.11-.04,1.52-.03,3.12-.06,4.74-.09,0-.03,0-.05,0-.08,0-.16-.04-.31-.07-.47-1.6.05-3.19.1-4.67.13-.76.01-1.48.02-2.16.03Z"/>
              <path className="cls-288" d="M451.85,424c.02.1.06.2.08.31.03.14.08.29.09.43.68-.01,1.4-.02,2.16-.03,1.48-.04,3.07-.09,4.67-.13-.03-.15-.08-.3-.12-.44-.03-.1-.06-.21-.09-.3-1.53.06-3.05.12-4.47.16-.83,0-1.61.01-2.33.02Z"/>
              <path className="cls-375" d="M451.69,423.29c.02.14.06.27.08.41.02.1.06.2.07.31.72,0,1.5-.01,2.33-.02,1.42-.05,2.93-.11,4.47-.16-.03-.1-.06-.2-.07-.29-.02-.14-.06-.27-.1-.4-1.48.05-2.94.11-4.29.16-.88,0-1.72,0-2.49,0Z"/>
              <path className="cls-455" d="M451.55,422.24c.03.21.09.43.09.64,0,.14.03.27.04.41.77,0,1.61,0,2.49,0,1.35-.05,2.81-.11,4.29-.16-.04-.13-.1-.25-.16-.37-.04-.19-.15-.38-.25-.58-1.36.02-2.68.05-3.88.08-.96,0-1.83-.01-2.63-.02Z"/>
              <path className="cls-566" d="M451.34,421.36c.01.08.04.15.05.23.04.21.12.43.16.64.79,0,1.67.01,2.63.02,1.2-.03,2.52-.06,3.88-.08-.1-.19-.25-.38-.38-.57-.04-.07-.1-.14-.14-.21-1.18,0-2.32,0-3.36,0-1.03-.01-1.98-.03-2.83-.04Z"/>
              <path className="cls-566" d="M451.25,420.86c0,.09.03.18.05.27.01.08.03.15.05.23.85.01,1.81.02,2.83.04,1.05,0,2.18,0,3.36,0-.04-.07-.09-.14-.14-.21-.05-.08-.11-.16-.15-.25-1.08-.01-2.11-.02-3.08-.03-1.07-.02-2.05-.04-2.93-.05Z"/>
              <path className="cls-455" d="M451.22,420.59c0,.09.02.18.03.27.88.01,1.86.03,2.93.05.97,0,1.99.02,3.08.03-.04-.08-.09-.16-.13-.25-1.04-.02-2.03-.04-2.95-.06-1.09-.02-2.08-.04-2.96-.06Z"/>
              <path className="cls-242" d="M448.5,431.82c0,.19.02.37.02.56.54-.03,1.12-.05,1.73-.08.61-.03,1.24-.06,1.9-.08,0-.18-.01-.36-.02-.55-.66.03-1.3.05-1.9.08-.61.03-1.19.05-1.73.07Z"/>
              <path className="cls-516" d="M448.42,430.56c0,.23.04.46.05.69,0,.19.03.37.04.56.54-.02,1.12-.05,1.73-.07.61-.03,1.24-.05,1.9-.08,0-.18-.03-.36-.03-.55-.01-.23-.04-.45-.05-.68-.68.02-1.33.04-1.94.06-.61.02-1.17.04-1.69.06Z"/>
              <path className="cls-517" d="M448.35,429.05c.01.27.04.55.04.82,0,.23.02.46.03.69.52-.02,1.08-.04,1.69-.06.61-.02,1.26-.04,1.94-.06,0-.23-.03-.45-.03-.68,0-.27-.03-.53-.04-.8-.69.01-1.35.03-1.95.04-.61.01-1.17.03-1.68.04Z"/>
              <path className="cls-307" d="M448.27,427.8c0,.14.02.29.02.43.01.27.05.55.06.82.51-.01,1.07-.03,1.68-.04.61-.01,1.26-.03,1.95-.04-.01-.27-.04-.53-.06-.8,0-.14-.02-.28-.02-.42-.71,0-1.38.02-1.99.03-.61,0-1.16.02-1.64.02Z"/>
              <path className="cls-169" d="M448.28,427.05c0,.11-.02.21-.02.32,0,.14,0,.29.01.43.49,0,1.04-.02,1.64-.02.61,0,1.28-.02,1.99-.03,0-.14-.01-.28-.01-.42,0-.11.02-.22.02-.32-.71,0-1.38.02-1.99.02-.61,0-1.16.01-1.65.02Z"/>
              <path className="cls-566" d="M448.33,426.51c0,.07-.01.14-.02.21,0,.11-.03.21-.04.32.49,0,1.04-.01,1.65-.02.61,0,1.28-.02,1.99-.02,0-.11.03-.22.04-.32,0-.07.02-.14.02-.22-.7,0-1.35.02-1.96.03-.61,0-1.17.02-1.67.03Z"/>
              <path className="cls-221" d="M448.36,426.09c0,.07-.01.14-.01.21s0,.14-.01.21c.5,0,1.07-.02,1.67-.03.61,0,1.27-.02,1.96-.03,0-.07.01-.14.01-.22s0-.15.01-.22c-.7.01-1.35.02-1.96.03-.61.01-1.17.02-1.68.03Z"/>
              <path className="cls-162" d="M448.41,425.63c0,.08-.02.16-.03.24,0,.07-.02.14-.02.21.51,0,1.07-.02,1.68-.03.61-.01,1.27-.02,1.96-.03,0-.07.02-.15.02-.22,0-.08.02-.16.03-.25-.68.01-1.33.02-1.94.04-.61.01-1.18.02-1.7.03Z"/>
              <path className="cls-363" d="M448.43,425.32s0,.05,0,.07c0,.08-.02.16-.02.24.52-.01,1.09-.02,1.7-.03.61-.01,1.26-.02,1.94-.04,0-.08.02-.16.02-.25,0-.03,0-.05,0-.08-.68.01-1.32.03-1.93.04-.61.01-1.18.02-1.71.04Z"/>
              <path className="cls-507" d="M448.37,424.8c.02.15.06.29.06.44,0,.02,0,.05,0,.07.53-.01,1.1-.02,1.71-.04.61-.01,1.26-.03,1.93-.04,0-.03,0-.05,0-.08,0-.14-.04-.28-.06-.43-.68.01-1.32.02-1.93.03s-1.19.02-1.72.03Z"/>
              <path className="cls-288" d="M448.19,424.04c.02.11.06.21.08.32.03.15.09.3.1.44.52,0,1.1-.02,1.72-.03s1.25-.02,1.93-.03c-.02-.14-.07-.29-.09-.43-.02-.1-.06-.2-.08-.31-.72,0-1.39.01-2.01.02-.61,0-1.17.01-1.65.02Z"/>
              <path className="cls-207" d="M448.02,423.3c.02.14.06.28.09.42.02.11.06.21.08.32.48,0,1.04-.01,1.65-.02.61,0,1.28-.01,2.01-.02-.02-.1-.06-.2-.07-.31-.02-.14-.07-.27-.08-.41-.77,0-1.48,0-2.09,0-.62,0-1.14,0-1.58.01Z"/>
              <path className="cls-350" d="M447.87,422.22c.03.22.1.44.1.66,0,.14.03.28.05.42.43,0,.96,0,1.58-.01.62,0,1.32,0,2.09,0-.02-.14-.04-.27-.04-.41,0-.21-.06-.43-.09-.64-.79,0-1.5,0-2.12-.01s-1.15,0-1.57,0Z"/>
              <path className="cls-566" d="M447.65,421.32c.01.08.04.16.06.24.04.22.13.44.17.66.42,0,.95,0,1.57,0s1.32,0,2.12.01c-.03-.21-.12-.43-.16-.64-.01-.08-.04-.15-.05-.23-.85-.01-1.6-.02-2.22-.03-.62,0-1.12-.01-1.47-.01Z"/>
              <path className="cls-566" d="M447.55,420.8c0,.09.04.19.05.28.01.08.04.16.05.24.36,0,.85,0,1.47.01.62,0,1.37.02,2.22.03-.01-.08-.04-.15-.05-.23-.01-.09-.04-.18-.05-.27-.88-.01-1.64-.03-2.27-.04-.62-.01-1.11-.02-1.44-.02Z"/>
              <path className="cls-455" d="M447.52,420.52c0,.09.02.19.03.28.33,0,.81.01,1.44.02.62,0,1.39.02,2.27.04,0-.09-.03-.18-.03-.27-.88-.02-1.64-.03-2.26-.04-.62-.01-1.11-.02-1.45-.03Z"/>
              <path className="cls-491" d="M447.01,431.88v.57c.46-.02.97-.05,1.51-.07,0-.19-.01-.37-.02-.56-.54.02-1.04.04-1.49.06Z"/>
              <path className="cls-350" d="M447.01,430.61v1.27c.45-.02.95-.04,1.49-.06,0-.19-.03-.37-.04-.56-.01-.23-.04-.46-.05-.69-.52.02-.99.03-1.41.05Z"/>
              <path className="cls-517" d="M447.01,429.08v1.53c.42-.02.89-.03,1.41-.05,0-.23-.03-.46-.03-.69,0-.27-.03-.55-.04-.82-.51.01-.96.02-1.34.03Z"/>
              <path className="cls-307" d="M447.01,427.82v1.27c.38,0,.83-.02,1.34-.03-.01-.27-.04-.55-.06-.82,0-.14-.02-.29-.02-.43-.49,0-.91.01-1.26.02Z"/>
              <path className="cls-169" d="M447.01,427.06v.75c.35,0,.77-.01,1.26-.02,0-.14-.01-.29-.01-.43,0-.11.01-.21.02-.32-.49,0-.91.01-1.27.02Z"/>
              <path className="cls-566" d="M447.01,426.54v.53c.36,0,.78-.01,1.27-.02,0-.11.03-.21.04-.32,0-.07.02-.14.02-.21-.5,0-.95.01-1.33.02Z"/>
              <path className="cls-278" d="M447.01,426.11v.42c.38,0,.82-.01,1.33-.02,0-.07.01-.14.01-.21s0-.14.01-.21c-.51,0-.96.02-1.35.02Z"/>
              <path className="cls-566" d="M447.01,425.66v.45c.39,0,.84-.02,1.35-.02,0-.07.02-.14.02-.21,0-.08.02-.16.03-.24-.52.01-.99.02-1.4.03Z"/>
              <path className="cls-578" d="M447.01,425.35v.31c.41,0,.88-.02,1.4-.03,0-.08.02-.16.02-.24,0-.02,0-.05,0-.07-.53.01-1,.02-1.43.03Z"/>
              <path className="cls-622" d="M447.01,424.83v.52c.42,0,.9-.02,1.43-.03,0-.02,0-.05,0-.07,0-.15-.05-.29-.06-.44-.52,0-.99.02-1.36.03Z"/>
              <path className="cls-288" d="M447.01,424.06v.76c.38,0,.84-.02,1.36-.03-.02-.15-.08-.3-.1-.44-.02-.11-.06-.21-.08-.32-.48,0-.88.01-1.18.02Z"/>
              <path className="cls-455" d="M447.01,423.32v.75c.3,0,.7-.01,1.18-.02-.02-.11-.06-.21-.08-.32-.02-.14-.07-.28-.09-.42-.43,0-.77.01-1.02.02Z"/>
              <path className="cls-566" d="M447.01,422.23v1.09c.24,0,.58-.01,1.02-.02-.02-.14-.05-.28-.05-.42,0-.22-.07-.44-.1-.66-.42,0-.71,0-.86,0Z"/>
              <path className="cls-566" d="M447.01,421.32v.91c.15,0,.45,0,.86,0-.03-.22-.13-.44-.17-.66-.01-.08-.04-.16-.06-.24-.36,0-.57,0-.64,0Z"/>
              <path className="cls-162" d="M447.01,420.79v.53c.07,0,.29,0,.64,0-.01-.08-.04-.16-.05-.24-.01-.09-.04-.19-.05-.28-.33,0-.52,0-.54,0Z"/>
              <path className="cls-207" d="M447.01,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
            </g>
            <g>
              <path className="cls-158" d="M447.01,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
            </g>
            <g>
              <path className="cls-158" d="M447.01,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
              <path className="cls-158" d="M447.01,420.51v.29s.21,0,.54,0c0-.09-.03-.19-.03-.28-.33,0-.51,0-.51,0Z"/>
            </g>
          </g>
          <g id="MeshGrid-8" data-name="MeshGrid">
            <g>
              <path className="cls-591" d="M447.86,964.11c-.03.35-.16.69-.18,1.01-.43-.02-.67-.03-.67-.03v-1.12c.11,0,.4.07.85.14Z"/>
              <path className="cls-548" d="M448.18,962.2c-.02.28-.11.56-.14.83-.03.37-.16.72-.19,1.07-.45-.07-.74-.14-.85-.14v-1.96c.29,0,.68.1,1.18.19Z"/>
              <path className="cls-231" d="M448.42,960.68c-.02.23-.08.45-.1.67-.02.29-.12.58-.14.86-.49-.09-.88-.18-1.18-.19v-1.47c.41,0,.88.07,1.41.13Z"/>
              <path className="cls-325" d="M448.59,959.52c-.01.16-.05.32-.07.48-.02.23-.08.45-.1.68-.54-.06-1-.12-1.41-.13v-1.07c.48,0,1.01.03,1.58.04Z"/>
              <path className="cls-490" d="M448.71,958.18c-.02.28-.04.57-.06.85-.01.16-.05.32-.07.48-.57-.02-1.09-.04-1.58-.04v-1.33c.51,0,1.09.03,1.7.04Z"/>
              <path className="cls-511" d="M448.9,955.12c-.05.74-.08,1.48-.13,2.22-.02.28-.04.57-.06.85-.61-.01-1.19-.03-1.7-.04v-3.2c.54.01,1.2.1,1.89.17Z"/>
              <path className="cls-29" d="M449.18,949.26c-.05,1.21-.1,2.43-.16,3.65-.04.74-.07,1.48-.12,2.21-.7-.08-1.36-.16-1.89-.17v-6.13c.6.03,1.37.24,2.18.44Z"/>
              <path className="cls-473" d="M449.41,941.17c-.03,1.48-.05,2.96-.11,4.44-.04,1.21-.07,2.43-.12,3.65-.81-.2-1.57-.41-2.18-.44v-8.46c.7.05,1.52.44,2.41.82Z"/>
              <path className="cls-516" d="M449.47,935.21c0,.5,0,1,0,1.5-.01,1.49-.02,2.97-.05,4.45-.89-.38-1.71-.76-2.41-.82v-6.21c.75.07,1.57.57,2.46,1.07Z"/>
              <path className="cls-516" d="M449.47,931.48c0,.77,0,1.51,0,2.22,0,.5,0,1,0,1.5-.89-.5-1.72-1-2.46-1.07v-3.42c.75.07,1.57.42,2.46.76Z"/>
              <path className="cls-566" d="M449.46,927.42v1.65c0,.83,0,1.63,0,2.41-.89-.35-1.71-.69-2.46-.76v-3.94c.74.07,1.56.36,2.45.64Z"/>
              <path className="cls-569" d="M449.46,686.43c0,100.35,0,204.24,0,239.31v1.68c-.89-.28-1.71-.57-2.45-.64v-235.14c.73,1.01,1.55-2.11,2.45-5.22Z"/>
              <path className="cls-217" d="M449.46,448.01c0,2.27,0,4.59,0,7.03,0,6.34,0,14.48,0,25.11,0,34.33,0,119,0,206.29-.9,3.11-1.72,6.23-2.45,5.22v-240.53c.72-.03,1.55-1.58,2.45-3.11Z"/>
              <path className="cls-445" d="M449.45,437.32c0,1.35,0,2.73,0,4.16,0,2.11,0,4.26,0,6.53-.9,1.53-1.73,3.08-2.45,3.11v-12.38c.72-.03,1.55-.73,2.45-1.42Z"/>
              <path className="cls-554" d="M449.45,432.86v.54c0,1.27,0,2.56,0,3.92-.9.69-1.73,1.39-2.45,1.42v-5.6c.72-.03,1.55-.15,2.45-.27Z"/>
              <path className="cls-491" d="M449.45,432.33v.53c-.9.12-1.73.24-2.45.27v-.69c.72-.03,1.55-.07,2.45-.11Z"/>
              <path className="cls-168" d="M450.55,964.21c-.08.32-.15.63-.22.91-.28,0-.55.02-.8.02-.8.01-1.43,0-1.86-.01.02-.33.16-.67.18-1.01.45.07,1.07.13,1.84.11.28,0,.56,0,.86-.01Z"/>
              <path className="cls-531" d="M450.99,962.34c-.07.29-.13.57-.2.84-.08.36-.17.71-.24,1.03-.3,0-.58,0-.86.01-.77.02-1.38-.05-1.84-.11.03-.35.16-.71.19-1.07.02-.27.11-.55.14-.83.5.09,1.1.17,1.82.15.34,0,.66-.02.99-.02Z"/>
              <path className="cls-211" d="M451.37,960.73c-.06.24-.11.48-.17.71-.07.31-.14.61-.21.9-.33,0-.65.01-.99.02-.72.02-1.32-.07-1.82-.15.02-.28.11-.57.14-.86.02-.22.08-.44.1-.67.54.06,1.14.11,1.83.09.38-.01.74-.02,1.11-.04Z"/>
              <path className="cls-539" d="M451.66,959.47c-.04.18-.08.35-.12.52-.06.25-.12.49-.17.73-.38.02-.74.03-1.11.04-.69.02-1.3-.03-1.83-.09.02-.23.08-.45.1-.68.01-.16.05-.32.07-.48.57.02,1.19.02,1.86,0,.4-.01.8-.03,1.22-.05Z"/>
              <path className="cls-448" d="M451.99,958.11c-.07.28-.13.55-.2.83-.04.18-.09.35-.13.53-.42.02-.82.03-1.22.05-.67.02-1.29.01-1.86,0,.01-.16.05-.32.07-.48.02-.28.04-.57.06-.85.61.01,1.27.02,1.93,0,.41-.01.87-.04,1.35-.07Z"/>
              <path className="cls-199" d="M452.68,955.14c-.16.72-.32,1.42-.49,2.15-.07.28-.13.55-.2.83-.48.03-.93.06-1.35.07-.67.02-1.32.02-1.93,0,.02-.28.04-.57.06-.85.05-.74.09-1.48.13-2.22.7.08,1.44.15,2.15.13.49,0,1.05-.05,1.63-.12Z"/>
              <path className="cls-29" d="M453.85,949.48c-.24,1.18-.45,2.33-.71,3.51-.16.72-.3,1.42-.47,2.14-.58.06-1.14.11-1.63.12-.7.01-1.45-.06-2.15-.13.05-.74.08-1.48.12-2.21.07-1.22.11-2.43.16-3.65.81.2,1.68.4,2.49.41.71.02,1.42-.07,2.19-.19Z"/>
              <path className="cls-495" d="M455.23,941.66c-.24,1.45-.46,2.86-.73,4.31-.22,1.19-.41,2.33-.65,3.51-.76.12-1.48.21-2.19.19-.81-.01-1.67-.21-2.49-.41.05-1.21.08-2.43.12-3.65.05-1.48.07-2.96.11-4.44.89.38,1.84.76,2.79.8,1,.06,1.98-.09,3.03-.31Z"/>
              <path className="cls-134" d="M456.04,935.84c-.06.5-.09.98-.16,1.48-.21,1.47-.4,2.89-.64,4.35-1.05.21-2.03.37-3.03.31-.95-.04-1.9-.42-2.79-.8.03-1.48.04-2.97.05-4.45,0-.5,0-1,0-1.5.89.5,1.86,1,2.89,1.06,1.15.08,2.37-.14,3.68-.43Z"/>
              <path className="cls-361" d="M456.32,932.01c-.04.77-.08,1.63-.14,2.35-.06.5-.08.99-.14,1.48-1.31.29-2.52.51-3.68.43-1.03-.06-2-.56-2.89-1.06,0-.5,0-1,0-1.5,0-.71,0-1.45,0-2.22.89.35,1.86.69,2.9.76,1.21.08,2.53-.05,3.95-.23Z"/>
              <path className="cls-401" d="M456.45,928.48c-.01.34-.02.72-.03,1.03-.04.82-.06,1.73-.1,2.5-1.42.18-2.74.31-3.95.23-1.04-.06-2.01-.41-2.9-.76,0-.77,0-1.58,0-2.41v-1.65c.89.28,1.86.57,2.91.63,1.25.07,2.61.24,4.08.42Z"/>
              <path className="cls-401" d="M457.05,693.37c-.03,69.25-.14,136.26-.14,171.04s-.12,54.74-.42,62.95c-.01.37-.02.78-.03,1.12-1.47-.18-2.84-.35-4.08-.42-1.04-.07-2.01-.35-2.91-.63v-1.68c0-35.07,0-138.97,0-239.31.9-3.11,1.87-6.2,2.91-5.11,1.46-3.01,3.04,4.49,4.68,12.05Z"/>
              <path className="cls-566" d="M457.29,445.36c0,2.21,0,4.53,0,7.08,0,3.05-.01,6.58-.01,10.63,0,4.56-.01,10.04-.01,16.58,0,32.76-.18,124.95-.21,213.72-1.64-7.55-3.21-15.06-4.68-12.05-1.03-1.08-2.01,2.01-2.91,5.11,0-87.28,0-171.96,0-206.29,0-10.63,0-18.77,0-25.11,0-2.44,0-4.76,0-7.03.9-1.53,1.88-3.03,2.91-2.97,1.57.09,3.24.19,4.93.33Z"/>
              <path className="cls-566" d="M457.31,435.71c0,1.12,0,2.31,0,3.64,0,1.83,0,3.8,0,6.01-1.69-.14-3.36-.24-4.93-.33-1.03-.06-2.01,1.45-2.91,2.97,0-2.27,0-4.42,0-6.53,0-1.43,0-2.81,0-4.16.9-.69,1.88-1.38,2.91-1.39,1.57-.02,3.25-.12,4.95-.21Z"/>
              <path className="cls-482" d="M457.32,432.36v.37c0,.89,0,1.86,0,2.98-1.7.09-3.38.19-4.95.21-1.03.02-2.01.7-2.91,1.39,0-1.35,0-2.64,0-3.92v-.54c.9-.12,1.88-.24,2.91-.29,1.57-.07,3.25-.14,4.95-.21Z"/>
              <path className="cls-197" d="M457.32,432c0,.12,0,.24,0,.36-1.7.07-3.38.15-4.95.21-1.03.04-2.01.17-2.91.29v-.53c.9-.04,1.88-.08,2.91-.13,1.57-.07,3.25-.14,4.95-.2Z"/>
              <path className="cls-225" d="M451.78,964.16c-.11.32-.21.63-.3.9-.09,0-.18.01-.26.02-.31.02-.61.03-.89.04.07-.28.14-.58.22-.91.3,0,.61-.02.95-.03.1,0,.19,0,.28-.01Z"/>
              <path className="cls-373" d="M452.4,962.27c-.1.29-.19.58-.28.85-.12.37-.23.71-.34,1.04-.09,0-.18,0-.28.01-.34.02-.66.03-.95.03.08-.32.16-.67.24-1.03.06-.27.13-.55.2-.84.33,0,.68-.02,1.08-.04.11,0,.22-.01.33-.02Z"/>
              <path className="cls-513" d="M452.94,960.65c-.08.24-.16.48-.24.72-.1.31-.2.61-.3.91-.11,0-.21.01-.33.02-.4.02-.75.03-1.08.04.07-.29.14-.59.21-.9.05-.23.11-.47.17-.71.38-.01.77-.03,1.21-.06.12,0,.24-.01.37-.02Z"/>
              <path className="cls-180" d="M453.36,959.38c-.06.18-.12.35-.18.53-.09.25-.17.5-.25.74-.12,0-.24.01-.37.02-.44.03-.83.04-1.21.06.06-.24.11-.49.17-.73.04-.17.08-.35.12-.52.42-.02.85-.04,1.31-.07.13,0,.26-.01.39-.02Z"/>
              <path className="cls-428" d="M453.85,957.99c-.1.28-.2.57-.3.86-.06.18-.12.36-.18.53-.13,0-.26.02-.39.02-.46.03-.89.05-1.31.07.04-.18.08-.35.13-.53.07-.28.13-.55.2-.83.48-.03.97-.06,1.44-.09.13,0,.27-.02.41-.03Z"/>
              <path className="cls-511" d="M454.94,954.91c-.26.74-.53,1.48-.79,2.22-.1.28-.2.57-.3.85-.14,0-.28.02-.41.03-.48.03-.97.06-1.44.09.07-.28.13-.55.2-.83.17-.72.32-1.43.49-2.15.58-.06,1.19-.14,1.77-.18.16-.01.33-.03.49-.04Z"/>
              <path className="cls-29" d="M457.03,949.05c-.43,1.21-.87,2.44-1.3,3.65-.27.74-.53,1.48-.79,2.22-.17.01-.33.03-.49.04-.58.05-1.18.12-1.77.18.16-.72.31-1.42.47-2.14.26-1.19.47-2.33.71-3.51.76-.12,1.56-.27,2.43-.37.24-.03.49-.05.75-.06Z"/>
              <path className="cls-336" d="M459.79,940.92c-.48,1.5-.97,2.99-1.48,4.47-.42,1.22-.84,2.44-1.28,3.65-.25.02-.5.04-.75.06-.87.1-1.67.25-2.43.37.24-1.18.43-2.33.65-3.51.27-1.44.49-2.85.73-4.31,1.05-.21,2.16-.48,3.43-.64.35-.05.74-.08,1.13-.1Z"/>
              <path className="cls-200" d="M461.55,934.84c-.13.52-.27,1.03-.41,1.55-.42,1.52-.87,3.04-1.35,4.54-.39.02-.78.05-1.13.1-1.26.16-2.38.43-3.43.64.24-1.45.43-2.88.64-4.35.07-.49.1-.98.16-1.48,1.31-.29,2.7-.66,4.21-.87.42-.06.85-.11,1.3-.13Z"/>
              <path className="cls-132" d="M462.27,931.45c-.1.6-.21,1.19-.35,1.82-.12.52-.25,1.04-.37,1.56-.44.03-.87.08-1.3.13-1.51.21-2.91.58-4.21.87.06-.5.08-.98.14-1.48.07-.72.1-1.57.14-2.35,1.42-.18,2.95-.4,4.57-.49.45-.03.92-.05,1.39-.07Z"/>
              <path className="cls-489" d="M462.63,929.06c-.03.25-.06.46-.09.66-.08.57-.17,1.13-.27,1.73-.47.02-.93.04-1.39.07-1.62.09-3.15.31-4.57.49.04-.77.06-1.68.1-2.5.01-.31.02-.69.03-1.03,1.47.18,3.06.37,4.74.49.47.03.95.06,1.44.09Z"/>
              <path className="cls-151" d="M463.59,704.06c-.03,69.62-.07,130.89-.07,149.56,0,46.27-.16,67.43-.81,74.65-.03.29-.06.54-.08.79-.49-.02-.97-.05-1.44-.09-1.68-.12-3.27-.31-4.74-.49.01-.34.02-.75.03-1.12.3-8.22.42-27.82.42-62.95s.11-101.79.14-171.04c1.64,7.55,3.35,15.16,5.09,12.33.48-1.04.97-1.33,1.46-1.64Z"/>
              <path className="cls-258" d="M463.72,443.37c0,1.96,0,4.09-.01,6.35,0,2.5,0,5.4,0,8.7,0,37.51-.07,149.53-.11,245.63-.49.31-.97.6-1.46,1.64-1.74,2.83-3.45-4.77-5.09-12.33.04-88.77.21-180.96.21-213.72,0-6.55.01-12.02.01-16.58,0-4.05,0-7.58.01-10.63,0-2.55,0-4.88,0-7.08,1.69.14,3.4.33,5.05.59.46-.98.92-1.78,1.38-2.59Z"/>
              <path className="cls-489" d="M463.74,434.88c0,.94,0,1.98,0,3.12,0,1.61,0,3.41-.01,5.37-.45.81-.91,1.61-1.38,2.59-1.65-.27-3.36-.45-5.05-.59,0-2.21,0-4.18,0-6.01,0-1.33,0-2.53,0-3.64,1.7-.09,3.42-.15,5.07-.12.46-.27.92-.49,1.36-.71Z"/>
              <path className="cls-314" d="M463.74,432.09c0,.1,0,.2,0,.3,0,.72,0,1.56,0,2.5-.45.22-.9.44-1.36.71-1.65-.04-3.37.03-5.07.12,0-1.12,0-2.09,0-2.98v-.37c1.7-.07,3.42-.14,5.07-.18.46-.02.91-.06,1.36-.09Z"/>
              <path className="cls-361" d="M463.74,431.8v.29c-.45.04-.9.07-1.36.09-1.64.05-3.36.11-5.07.18,0-.12,0-.24,0-.36,1.7-.06,3.42-.12,5.07-.17.46-.01.91-.03,1.36-.04Z"/>
              <path className="cls-461" d="M452.61,964.1c-.14.33-.27.63-.38.91-.16.01-.32.02-.48.03-.09,0-.18.01-.27.02.09-.28.19-.58.3-.9.09,0,.18-.01.29-.02.19-.01.37-.03.54-.04Z"/>
              <path className="cls-373" d="M453.46,962.2c-.13.3-.26.58-.39.86-.17.37-.32.72-.46,1.05-.18.01-.35.03-.54.04-.1,0-.19.01-.29.02.11-.32.22-.67.34-1.04.09-.27.18-.56.28-.85.11,0,.22-.01.33-.02.25-.02.49-.03.73-.05Z"/>
              <path className="cls-291" d="M454.18,960.57c-.11.24-.21.49-.31.72-.14.31-.27.62-.41.91-.24.02-.48.04-.73.05-.12,0-.23.01-.33.02.1-.29.2-.6.3-.91.08-.24.16-.47.24-.72.12,0,.25-.01.37-.02.29-.02.58-.04.87-.06Z"/>
              <path className="cls-234" d="M454.71,959.3c-.07.18-.14.35-.22.53-.1.25-.21.5-.31.74-.29.02-.58.04-.87.06-.13,0-.25.02-.37.02.08-.24.16-.49.25-.74.06-.17.12-.35.18-.53.13,0,.26-.02.4-.02.31-.02.63-.04.95-.06Z"/>
              <path className="cls-576" d="M455.26,957.91c-.11.28-.22.57-.33.85-.07.18-.14.36-.21.53-.32.02-.64.04-.95.06-.13,0-.27.02-.4.02.06-.18.12-.35.18-.53.1-.29.2-.57.3-.86.14,0,.28-.02.42-.03.32-.02.66-.04.99-.06Z"/>
              <path className="cls-191" d="M456.49,954.85c-.31.74-.61,1.47-.9,2.21-.11.28-.23.57-.34.85-.33.02-.66.04-.99.06-.14,0-.28.02-.42.03.1-.28.2-.57.3-.85.26-.74.52-1.49.79-2.22.17-.01.34-.02.51-.03.33-.02.69-.03,1.05-.04Z"/>
              <path className="cls-29" d="M458.97,949.02c-.52,1.21-1.03,2.41-1.55,3.62-.31.73-.62,1.47-.93,2.2-.36.01-.72.02-1.05.04-.17,0-.34.02-.51.03.27-.74.53-1.48.79-2.22.44-1.21.87-2.44,1.3-3.65.25-.02.51-.03.78-.03.36,0,.76,0,1.16,0Z"/>
              <path className="cls-484" d="M462.23,940.92c-.54,1.5-1.13,2.99-1.73,4.47-.5,1.22-1.01,2.42-1.52,3.63-.4,0-.79,0-1.16,0-.27,0-.53.01-.78.03.43-1.21.86-2.44,1.28-3.65.51-1.48,1-2.98,1.48-4.47.39-.02.8-.03,1.19-.02.4,0,.82.01,1.25.02Z"/>
              <path className="cls-141" d="M464.16,934.82c-.14.52-.29,1.04-.44,1.55-.45,1.54-.95,3.05-1.5,4.55-.42-.01-.85-.02-1.25-.02-.39,0-.8,0-1.19.02.48-1.5.92-3.01,1.35-4.54.14-.51.28-1.03.41-1.55.44-.03.89-.04,1.36-.03.42,0,.84.01,1.26.01Z"/>
              <path className="cls-460" d="M464.96,931.45c-.12.59-.25,1.19-.39,1.81-.13.53-.26,1.05-.4,1.57-.42,0-.84,0-1.26-.01-.46-.01-.91,0-1.36.03.13-.52.25-1.04.37-1.56.14-.63.25-1.22.35-1.82.47-.02.95-.03,1.43-.02.42,0,.84.01,1.25.01Z"/>
              <path className="cls-171" d="M465.36,929.05c-.03.27-.06.48-.1.7-.09.54-.19,1.11-.3,1.69-.42,0-.84,0-1.25-.01-.48,0-.96,0-1.43.02.1-.6.19-1.17.27-1.73.03-.21.06-.42.09-.66.49.02.98.04,1.48.04.41,0,.83-.01,1.25-.05Z"/>
              <path className="cls-481" d="M466.31,690.3c0,61.89-.01,120.16-.02,153.74,0,1.79,0,3.52,0,5.19,0,20.53-.04,36.86-.14,49.57-.09,12.93-.03,22.71-.7,29.44-.03.31-.06.56-.09.83-.42.03-.84.05-1.25.05-.5,0-1-.02-1.48-.04.03-.25.06-.5.08-.79.65-7.22.81-28.38.81-74.65,0-18.67.04-79.94.07-149.56.49-.31.98-.64,1.46-1.78.41-1.21.83-6.59,1.25-11.98Z"/>
              <path className="cls-578" d="M466.32,445.71c0,2.04,0,4.15,0,6.32,0,35.71-.01,141.16-.02,238.26-.42,5.39-.84,10.76-1.25,11.98-.49,1.14-.97,1.47-1.46,1.78.04-96.1.11-208.13.11-245.63,0-3.3,0-6.21,0-8.7,0-2.26,0-4.39.01-6.35.45-.81.9-1.61,1.33-2.59.42-.02.85,2.46,1.27,4.93Z"/>
              <path className="cls-578" d="M466.33,436.14v3.66c0,1.9,0,3.87,0,5.92-.42-2.48-.85-4.95-1.27-4.93-.43.97-.88,1.78-1.33,2.59,0-1.96,0-3.76.01-5.37,0-1.14,0-2.18,0-3.12.45-.22.89-.43,1.31-.7.42-.01.85.97,1.27,1.96Z"/>
              <path className="cls-484" d="M466.33,432.21v.47c0,1.12,0,2.27,0,3.46-.42-.99-.85-1.97-1.27-1.96-.43.27-.87.49-1.31.7,0-.94,0-1.77,0-2.5,0-.1,0-.2,0-.3.45-.04.88-.07,1.31-.09.42,0,.85.1,1.27.21Z"/>
              <path className="cls-569" d="M466.33,431.74v.47c-.42-.11-.85-.22-1.27-.21-.43.02-.87.05-1.31.09v-.29c.45-.01.88-.02,1.31-.03.42,0,.85-.02,1.27-.02Z"/>
              <path className="cls-241" d="M454.16,963.96c-.22.33-.43.64-.59.93-.29.03-.57.06-.84.08-.17.01-.33.03-.5.04.11-.28.24-.58.38-.91.18-.01.36-.03.56-.05.33-.03.66-.06.99-.09Z"/>
              <path className="cls-367" d="M455.44,962.04c-.19.3-.39.59-.57.87-.24.37-.49.73-.71,1.06-.33.04-.67.07-.99.09-.2.02-.38.03-.56.05.14-.33.3-.68.46-1.05.12-.28.25-.56.39-.86.24-.02.48-.04.74-.06.42-.03.83-.07,1.24-.11Z"/>
              <path className="cls-96" d="M456.47,960.39c-.15.25-.29.49-.44.73-.19.31-.4.62-.59.92-.41.04-.82.08-1.24.11-.26.02-.5.04-.74.06.13-.3.27-.6.41-.91.1-.24.21-.48.31-.72.29-.02.58-.04.88-.06.48-.03.95-.07,1.41-.11Z"/>
              <path className="cls-325" d="M457.2,959.11c-.1.18-.19.35-.29.53-.15.25-.29.5-.44.75-.46.04-.93.08-1.41.11-.29.02-.59.04-.88.06.1-.24.21-.49.31-.74.07-.17.14-.35.22-.53.32-.02.64-.04.95-.07.51-.04,1.03-.07,1.54-.12Z"/>
              <path className="cls-127" d="M457.88,957.74c-.13.28-.27.56-.4.83-.09.18-.18.36-.28.54-.51.04-1.02.08-1.54.12-.32.02-.64.04-.95.07.07-.18.14-.36.21-.53.11-.28.22-.57.33-.85.33-.02.67-.04.99-.06.53-.04,1.08-.07,1.64-.11Z"/>
              <path className="cls-229" d="M459.35,954.74c-.35.72-.71,1.44-1.06,2.16-.13.28-.27.55-.4.83-.55.04-1.11.07-1.64.11-.33.02-.66.04-.99.06.11-.28.22-.57.34-.85.3-.74.6-1.48.9-2.21.36-.01.72-.02,1.05-.04.55-.03,1.17-.04,1.8-.06Z"/>
              <path className="cls-29" d="M462.12,949.02c-.56,1.19-1.14,2.38-1.72,3.57-.35.72-.71,1.44-1.06,2.16-.63.01-1.25.03-1.8.06-.34.02-.69.03-1.05.04.31-.74.62-1.47.93-2.2.51-1.21,1.03-2.42,1.55-3.62.4,0,.79,0,1.16,0,.59-.02,1.29,0,1.99,0Z"/>
              <path className="cls-148" d="M465.56,940.96c-.56,1.51-1.16,2.99-1.8,4.46-.53,1.21-1.07,2.4-1.64,3.6-.7-.01-1.4-.03-1.99,0-.37.01-.76.01-1.16,0,.52-1.21,1.03-2.42,1.52-3.63.6-1.48,1.19-2.96,1.73-4.47.42.01.85.02,1.26.02.66,0,1.37.01,2.08.02Z"/>
              <path className="cls-277" d="M467.5,934.77c-.14.53-.28,1.06-.43,1.59-.44,1.56-.95,3.09-1.51,4.6-.71-.01-1.42-.03-2.08-.02-.4,0-.83,0-1.26-.02.54-1.5,1.05-3.01,1.5-4.55.15-.52.3-1.03.44-1.55.42,0,.84,0,1.27,0,.69,0,1.38-.02,2.07-.04Z"/>
              <path className="cls-385" d="M468.27,931.36c-.12.59-.24,1.19-.38,1.81-.12.54-.25,1.07-.39,1.61-.69.02-1.38.04-2.07.04-.42,0-.85,0-1.27,0,.14-.52.28-1.04.4-1.57.15-.62.28-1.22.39-1.81.42,0,.84,0,1.26-.01.68-.01,1.37-.04,2.05-.07Z"/>
              <path className="cls-473" d="M468.73,928.53c-.05.41-.1.79-.15,1.13-.09.54-.19,1.11-.3,1.7-.69.03-1.37.06-2.05.07-.42,0-.84.01-1.26.01.12-.59.22-1.15.3-1.69.04-.22.07-.43.1-.7.42-.03.84-.08,1.27-.14.69-.1,1.39-.23,2.09-.39Z"/>
              <path className="cls-332" d="M469.66,678.06c0,55.36-.02,111.52-.05,158.56,0,18.75-.05,36-.07,51.17-.02,15.65.35,29.11-.69,39.52-.04.41-.08.81-.13,1.22-.7.15-1.4.29-2.09.39-.43.06-.85.11-1.27.14.03-.27.06-.52.09-.83.67-6.72.6-16.5.7-29.44.1-12.71.14-29.04.14-49.57,0-1.67,0-3.4,0-5.19,0-33.57.01-91.84.02-153.74.42-5.39.85-10.79,1.27-12.06.69.08,1.39-.01,2.09-.18Z"/>
              <path className="cls-323" d="M469.67,450.6c0,2.52,0,5.04,0,7.56,0,41.44,0,129.58,0,219.9-.7.17-1.4.26-2.09.18-.42,1.27-.85,6.67-1.27,12.06,0-97.1.02-202.55.02-238.26,0-2.17,0-4.28,0-6.32.42,2.48.85,4.96,1.27,4.95.69,0,1.38-.04,2.07-.06Z"/>
              <path className="cls-533" d="M469.66,438.07c0,1.65,0,3.31,0,4.97,0,2.52,0,5.04,0,7.56-.69.03-1.38.06-2.07.06-.42,0-.85-2.47-1.27-4.95,0-2.04,0-4.01,0-5.92v-3.66c.42.99.85,1.97,1.27,1.96.69,0,1.38-.02,2.07-.03Z"/>
              <path className="cls-429" d="M469.66,432.4v5.67c-.69.01-1.38.03-2.07.03-.42,0-.85-.98-1.27-1.96,0-1.19,0-2.34,0-3.46v-.47c.42.11.85.22,1.27.22.69,0,1.38-.02,2.07-.02Z"/>
              <path className="cls-562" d="M469.66,431.71v.7c-.69,0-1.38.01-2.07.02-.42,0-.85-.11-1.27-.22v-.47c.42,0,.85-.01,1.27-.02.69,0,1.38-.01,2.07-.02Z"/>
              <path className="cls-404" d="M456.43,963.67c-.31.34-.6.67-.86.97-.38.06-.75.11-1.12.15-.3.04-.6.07-.88.1.16-.29.38-.6.59-.93.33-.04.67-.08,1.01-.12.41-.05.83-.11,1.26-.18Z"/>
              <path className="cls-409" d="M458.15,961.7c-.26.3-.52.59-.76.88-.33.38-.65.74-.96,1.09-.43.07-.85.13-1.26.18-.34.04-.68.08-1.01.12.22-.33.47-.69.71-1.06.18-.28.38-.57.57-.87.41-.04.82-.09,1.22-.13.49-.06.99-.13,1.49-.2Z"/>
              <path className="cls-262" d="M459.54,960.04c-.2.25-.41.49-.61.73-.26.32-.53.62-.79.93-.5.07-1,.14-1.49.2-.41.05-.81.09-1.22.13.19-.3.4-.6.59-.92.15-.24.29-.48.44-.73.46-.04.93-.09,1.39-.14.56-.06,1.12-.13,1.68-.21Z"/>
              <path className="cls-545" d="M460.57,958.76c-.13.18-.28.36-.41.53-.2.25-.41.5-.61.75-.56.08-1.12.15-1.68.21-.47.05-.93.1-1.39.14.15-.25.29-.5.44-.75.1-.18.2-.35.29-.53.51-.04,1.02-.09,1.53-.14.62-.06,1.23-.13,1.83-.21Z"/>
              <path className="cls-590" d="M461.49,957.41c-.17.27-.35.53-.52.8-.13.18-.27.36-.4.54-.61.08-1.22.15-1.83.21-.51.05-1.02.1-1.53.14.1-.18.19-.36.28-.54.13-.28.27-.56.4-.83.55-.04,1.11-.08,1.64-.13.64-.06,1.31-.13,1.97-.2Z"/>
              <path className="cls-336" d="M463.33,954.52c-.43.7-.87,1.4-1.32,2.09-.17.27-.34.53-.52.8-.67.07-1.34.13-1.97.2-.53.05-1.08.09-1.64.13.13-.28.27-.56.4-.83.35-.72.7-1.44,1.06-2.16.63-.01,1.25-.03,1.8-.08.66-.06,1.42-.1,2.18-.14Z"/>
              <path className="cls-29" d="M466.54,948.91c-.62,1.18-1.27,2.34-1.95,3.51-.41.7-.83,1.4-1.26,2.1-.76.05-1.52.08-2.18.14-.55.05-1.17.07-1.8.08.35-.72.71-1.44,1.06-2.16.58-1.19,1.16-2.37,1.72-3.57.7.01,1.4.02,1.99-.03.72-.05,1.57-.06,2.42-.08Z"/>
              <path className="cls-408" d="M470.16,940.84c-.56,1.53-1.18,3.02-1.86,4.49-.55,1.21-1.14,2.4-1.76,3.58-.85.02-1.7.03-2.42.08-.6.04-1.3.04-1.99.03.56-1.19,1.11-2.39,1.64-3.6.64-1.47,1.25-2.95,1.8-4.46.71.01,1.43.01,2.09-.02.8-.04,1.66-.06,2.51-.1Z"/>
              <path className="cls-203" d="M472.07,934.49c-.13.55-.26,1.11-.41,1.65-.43,1.61-.94,3.17-1.5,4.7-.85.04-1.71.06-2.51.1-.66.03-1.38.03-2.09.02.56-1.51,1.07-3.04,1.51-4.6.15-.53.29-1.05.43-1.59.69-.02,1.38-.05,2.07-.1.83-.05,1.66-.11,2.49-.19Z"/>
              <path className="cls-519" d="M472.81,931c-.12.59-.25,1.19-.38,1.81-.12.56-.23,1.13-.36,1.68-.83.08-1.66.14-2.49.19-.69.04-1.38.07-2.07.1.14-.53.27-1.07.39-1.61.14-.62.27-1.22.38-1.81.69-.03,1.37-.08,2.06-.13.83-.06,1.65-.14,2.48-.22Z"/>
              <path className="cls-137" d="M473.36,927.43c-.07.61-.16,1.3-.24,1.86-.08.55-.19,1.13-.31,1.72-.82.09-1.65.16-2.48.22-.69.05-1.37.1-2.06.13.12-.59.22-1.16.3-1.7.05-.34.1-.72.15-1.13.7-.15,1.41-.32,2.11-.49.85-.2,1.69-.42,2.53-.61Z"/>
              <path className="cls-411" d="M474.28,676.93c0,55.03-.02,110.89-.06,157.7-.02,18.92-.12,36.32-.05,51.59.07,15.58.44,28.96-.59,39.31-.06.58-.14,1.3-.21,1.9-.84.19-1.68.41-2.53.61-.7.17-1.41.34-2.11.49.05-.41.09-.82.13-1.22,1.04-10.41.66-23.86.69-39.52.02-15.17.06-32.42.07-51.17.03-47.04.04-103.2.05-158.56.7-.17,1.41-.42,2.1-.66.84-.13,1.68-.31,2.51-.47Z"/>
              <path className="cls-323" d="M474.23,450.48c0,2.51,0,5.02,0,7.52.01,41.21.06,128.84.05,218.93-.83.16-1.68.34-2.51.47-.69.24-1.4.49-2.1.66,0-90.32,0-178.47,0-219.9,0-2.52,0-5.04,0-7.56.69-.03,1.38-.06,2.07-.06.83,0,1.66-.03,2.49-.05Z"/>
              <path className="cls-465" d="M474.23,438.02c0,1.65,0,3.29,0,4.94,0,2.51,0,5.02,0,7.52-.83.03-1.66.05-2.49.05-.69,0-1.38.03-2.07.06,0-2.52,0-5.04,0-7.56,0-1.65,0-3.31,0-4.97.69-.01,1.38-.03,2.07-.03.83,0,1.66-.01,2.49-.02Z"/>
              <path className="cls-559" d="M474.23,432.39v.69c0,1.65,0,3.29,0,4.94-.83,0-1.66.02-2.49.02-.69,0-1.38.02-2.07.03v-5.67c.69,0,1.38,0,2.07-.01.83,0,1.66,0,2.49,0Z"/>
              <path className="cls-200" d="M474.23,431.69v.69c-.83,0-1.66,0-2.49,0-.69,0-1.38,0-2.07.01v-.7c.69,0,1.38,0,2.07-.01.83,0,1.66,0,2.49,0Z"/>
              <path className="cls-414" d="M458.38,963.33c-.37.36-.73.7-1.06,1.02-.19.04-.39.07-.58.1-.4.07-.79.13-1.17.19.26-.3.55-.63.86-.97.43-.07.86-.14,1.31-.21.21-.04.42-.08.64-.12Z"/>
              <path className="cls-306" d="M460.44,961.31c-.31.31-.61.61-.91.9-.4.39-.78.76-1.15,1.12-.21.04-.42.08-.64.12-.45.08-.88.15-1.31.21.31-.34.63-.71.96-1.09.24-.29.5-.58.76-.88.5-.07,1.02-.16,1.55-.25.25-.04.5-.09.74-.14Z"/>
              <path className="cls-96" d="M462.08,959.63c-.24.25-.47.5-.71.74-.31.32-.62.64-.93.94-.24.05-.49.1-.74.14-.53.09-1.04.17-1.55.25.26-.3.53-.61.79-.93.2-.24.41-.48.61-.73.56-.08,1.13-.17,1.71-.26.28-.05.55-.1.82-.15Z"/>
              <path className="cls-624" d="M463.28,958.32c-.16.18-.33.36-.49.54-.24.26-.47.51-.71.76-.27.05-.54.1-.82.15-.58.1-1.15.19-1.71.26.2-.25.41-.5.61-.75.14-.18.28-.35.41-.53.61-.08,1.22-.17,1.83-.28.3-.05.59-.1.88-.16Z"/>
              <path className="cls-229" d="M464.38,957c-.21.26-.41.51-.62.77-.16.18-.32.37-.49.55-.29.06-.58.11-.88.16-.62.1-1.22.19-1.83.28.13-.18.27-.36.4-.54.18-.27.35-.53.52-.8.67-.07,1.33-.16,1.96-.26.3-.05.62-.1.93-.15Z"/>
              <path className="cls-347" d="M466.52,954.2c-.49.68-1,1.36-1.52,2.03-.2.26-.4.52-.61.77-.31.05-.63.1-.93.15-.63.11-1.29.19-1.96.26.17-.27.35-.53.52-.8.45-.7.89-1.39,1.32-2.09.76-.05,1.52-.1,2.17-.21.31-.05.67-.08,1.02-.11Z"/>
              <path className="cls-14" d="M470.09,948.67c-.67,1.18-1.38,2.33-2.14,3.47-.46.69-.94,1.38-1.43,2.06-.36.03-.71.06-1.02.11-.65.11-1.41.16-2.17.21.43-.7.85-1.4,1.26-2.1.68-1.16,1.33-2.32,1.95-3.51.85-.02,1.7-.05,2.4-.16.34-.05.74-.06,1.15-.08Z"/>
              <path className="cls-140" d="M473.86,940.52c-.56,1.57-1.2,3.08-1.9,4.57-.58,1.22-1.2,2.41-1.87,3.59-.41.02-.81.03-1.15.08-.7.11-1.55.14-2.4.16.62-1.18,1.21-2.37,1.76-3.58.67-1.47,1.3-2.96,1.86-4.49.85-.04,1.7-.09,2.48-.2.37-.05.79-.08,1.21-.12Z"/>
              <path className="cls-578" d="M475.73,934.03c-.12.55-.26,1.11-.4,1.66-.42,1.66-.91,3.27-1.47,4.83-.42.04-.84.07-1.21.12-.78.11-1.63.16-2.48.2.56-1.53,1.07-3.09,1.5-4.7.15-.54.28-1.1.41-1.65.83-.08,1.65-.17,2.47-.27.39-.05.79-.11,1.19-.19Z"/>
              <path className="cls-243" d="M476.44,930.56c-.12.59-.24,1.19-.36,1.8-.11.56-.23,1.12-.35,1.67-.4.07-.8.14-1.19.19-.82.11-1.64.2-2.47.27.13-.55.25-1.12.36-1.68.12-.61.26-1.22.38-1.81.82-.09,1.64-.18,2.46-.29.39-.05.78-.1,1.17-.16Z"/>
              <path className="cls-527" d="M477.01,926.78c-.08.69-.17,1.37-.26,2.05-.08.56-.19,1.13-.31,1.72-.39.05-.78.11-1.17.16-.82.11-1.64.2-2.46.29.12-.59.23-1.16.31-1.72.08-.56.17-1.26.24-1.86.84-.19,1.67-.36,2.48-.48.39-.05.78-.11,1.16-.17Z"/>
              <path className="cls-279" d="M477.98,676.47c-.03,55.01-.07,110.94-.13,157.69,0,1.83,0,3.64,0,5.44-.04,17.24-.12,33.13-.06,47.16,0,1.4.01,2.79.02,4.15.07,13.23.32,24.72-.57,33.81-.07.69-.14,1.37-.22,2.06-.39.06-.77.12-1.16.17-.81.11-1.64.28-2.48.48.07-.61.15-1.32.21-1.9,1.03-10.35.66-23.73.59-39.31-.07-15.27.03-32.67.05-51.59.05-46.81.06-102.66.06-157.7.83-.16,1.66-.32,2.47-.41.41-.01.82-.03,1.23-.05Z"/>
              <path className="cls-287" d="M478.01,450.42c0,2.5,0,5,0,7.5,0,41.07,0,128.61-.03,218.56-.41.02-.82.04-1.23.05-.81.09-1.64.24-2.47.41.01-90.09-.04-177.72-.05-218.93,0-2.51,0-5.01,0-7.52.83-.03,1.66-.05,2.49-.05.43,0,.86,0,1.29-.01Z"/>
              <path className="cls-425" d="M478.01,438c0,1.64,0,3.28,0,4.92,0,2.5,0,5,0,7.5-.43,0-.86.01-1.29.01-.83,0-1.66.03-2.49.05,0-2.51,0-5.01,0-7.52,0-1.65,0-3.29,0-4.94.83,0,1.66-.02,2.49-.02.43,0,.86,0,1.29,0Z"/>
              <path className="cls-330" d="M478.01,432.38v5.61c-.43,0-.86,0-1.29,0-.83,0-1.66,0-2.49.02,0-1.65,0-3.29,0-4.94v-.69c.83,0,1.66,0,2.49,0,.43,0,.86,0,1.29,0Z"/>
              <path className="cls-492" d="M478.01,431.69v.69c-.43,0-.86,0-1.29,0-.83,0-1.66,0-2.49,0v-.69c.83,0,1.66,0,2.49,0,.43,0,.86,0,1.29,0Z"/>
              <path className="cls-275" d="M459.7,963.06c-.41.37-.8.72-1.18,1.05-.21.04-.41.09-.62.13-.2.04-.39.08-.59.11.33-.32.69-.66,1.06-1.02.21-.04.42-.09.64-.13.23-.05.45-.09.68-.14Z"/>
              <path className="cls-372" d="M461.95,960.99c-.33.31-.66.62-.99.92-.43.4-.86.78-1.27,1.15-.23.05-.45.1-.68.14-.22.04-.43.09-.64.13.37-.36.76-.73,1.15-1.12.3-.29.6-.59.91-.9.24-.05.49-.1.74-.15.26-.05.52-.11.77-.17Z"/>
              <path className="cls-205" d="M463.73,959.27c-.26.26-.52.51-.77.76-.34.33-.68.65-1.01.96-.25.06-.51.12-.77.17-.25.05-.5.1-.74.15.31-.31.62-.62.93-.94.24-.24.47-.49.71-.74.27-.05.54-.11.82-.17.29-.06.56-.12.84-.19Z"/>
              <path className="cls-310" d="M465.04,957.94c-.18.18-.36.37-.54.55-.26.26-.52.52-.78.78-.28.07-.55.13-.84.19-.28.06-.55.11-.82.17.24-.25.47-.51.71-.76.16-.18.33-.36.49-.54.29-.06.58-.12.87-.18.3-.06.6-.13.89-.2Z"/>
              <path className="cls-300" d="M466.26,956.64c-.23.25-.45.5-.68.75-.18.19-.36.37-.53.56-.3.07-.59.14-.89.2-.29.06-.58.12-.87.18.16-.18.32-.36.49-.55.21-.26.42-.51.62-.77.31-.05.63-.11.93-.17.31-.07.63-.13.95-.19Z"/>
              <path className="cls-259" d="M468.59,953.9c-.53.67-1.09,1.33-1.66,1.99-.22.25-.44.5-.67.75-.32.07-.64.13-.95.19-.3.06-.61.12-.93.17.21-.26.41-.52.61-.77.52-.67,1.03-1.35,1.52-2.03.36-.03.71-.07,1.02-.14.32-.07.69-.11,1.05-.16Z"/>
              <path className="cls-111" d="M472.43,948.42c-.71,1.17-1.48,2.33-2.3,3.45-.5.68-1.01,1.36-1.55,2.03-.36.05-.73.09-1.05.16-.31.07-.67.1-1.02.14.49-.68.97-1.37,1.43-2.06.76-1.14,1.47-2.29,2.14-3.47.41-.02.81-.04,1.16-.11.36-.08.77-.11,1.19-.13Z"/>
              <path className="cls-203" d="M476.37,940.15c-.57,1.6-1.22,3.16-1.96,4.66-.6,1.23-1.26,2.44-1.97,3.61-.42.03-.84.06-1.19.13-.34.07-.75.1-1.16.11.67-1.18,1.29-2.37,1.87-3.59.7-1.48,1.34-3,1.9-4.57.42-.04.85-.09,1.23-.18.4-.09.84-.14,1.27-.19Z"/>
              <path className="cls-259" d="M478.17,933.57c-.11.53-.22,1.05-.34,1.59-.4,1.73-.89,3.4-1.46,5-.43.05-.87.1-1.27.19-.39.09-.81.13-1.23.18.56-1.57,1.05-3.17,1.47-4.83.14-.54.28-1.11.4-1.66.4-.07.8-.15,1.2-.22.41-.08.83-.16,1.24-.24Z"/>
              <path className="cls-122" d="M478.79,930.2c-.1.59-.21,1.19-.32,1.8-.1.52-.19,1.04-.3,1.57-.41.08-.82.17-1.24.24-.4.07-.8.15-1.2.22.12-.55.24-1.12.35-1.67.11-.61.24-1.21.36-1.8.39-.05.78-.11,1.16-.17.4-.06.8-.12,1.19-.19Z"/>
              <path className="cls-345" d="M479.3,926.69c-.07.59-.15,1.19-.23,1.78-.08.56-.18,1.14-.28,1.73-.4.06-.79.13-1.19.19-.39.06-.77.12-1.16.17.12-.59.23-1.17.31-1.72.1-.68.18-1.37.26-2.05.39-.06.77-.12,1.15-.18.39-.05.77.02,1.14.09Z"/>
              <path className="cls-596" d="M480.44,684.68c-.07,64.18-.16,125.96-.23,161.54,0,3.53-.02,6.85-.02,9.94-.06,17-.07,30.77-.11,41.73-.04,11.68.05,20.66-.57,27.02-.06.6-.13,1.19-.2,1.78-.37-.07-.75-.15-1.14-.09-.38.06-.76.12-1.15.18.08-.68.15-1.37.22-2.06.89-9.09.65-20.58.57-33.81,0-1.36-.02-2.75-.02-4.15-.06-14.02.02-29.92.06-47.16,0-1.8,0-3.61,0-5.44.07-46.75.11-102.68.13-157.69.41-.02.82-.04,1.23-.06.43,1.24.83,4.75,1.24,8.26Z"/>
              <path className="cls-607" d="M480.64,448.42c0,2.51,0,5.13,0,7.84v.92c0,25.04-.09,128.96-.2,227.51-.4-3.51-.81-7.03-1.24-8.26-.4.02-.81.04-1.23.06.04-89.95.03-177.49.03-218.56,0-2.5,0-5,0-7.5.43,0,.86-.01,1.29-.01.45,0,.89-.99,1.34-1.99Z"/>
              <path className="cls-330" d="M480.64,436.69v4.56c0,2.26,0,4.66,0,7.17-.44.99-.89,1.98-1.34,1.99-.43,0-.86,0-1.29.01,0-2.5,0-5,0-7.5,0-1.64,0-3.28,0-4.92.43,0,.86,0,1.29,0,.45,0,.89-.65,1.34-1.31Z"/>
              <path className="cls-600" d="M480.64,432.19v4.49c-.44.65-.89,1.31-1.34,1.31-.43,0-.86,0-1.29,0v-5.61c.43,0,.86,0,1.3,0,.45,0,.89-.1,1.34-.19Z"/>
              <path className="cls-217" d="M480.64,431.69v.5c-.44.1-.89.19-1.34.19-.43,0-.86,0-1.3,0v-.69c.43,0,.86,0,1.3,0,.45,0,.89,0,1.34,0Z"/>
              <path className="cls-406" d="M461.68,962.58c-.44.38-.87.75-1.27,1.09-.43.11-.85.21-1.27.3-.21.05-.42.09-.62.14.38-.33.77-.68,1.18-1.05.23-.05.45-.1.68-.16.44-.1.87-.21,1.3-.32Z"/>
              <path className="cls-175" d="M464.12,960.42c-.36.33-.72.64-1.07.96-.47.42-.93.82-1.37,1.2-.43.12-.86.22-1.3.32-.23.05-.46.11-.68.16.41-.37.83-.75,1.27-1.15.32-.3.65-.61.99-.92.25-.06.51-.12.77-.19.47-.11.94-.24,1.41-.38Z"/>
              <path className="cls-2" d="M466.05,958.65c-.28.26-.56.52-.83.78-.36.34-.73.67-1.09,1-.47.13-.94.26-1.41.38-.26.06-.52.13-.77.19.33-.31.67-.64,1.01-.96.26-.25.51-.5.77-.76.28-.07.55-.14.83-.21.49-.12.99-.26,1.48-.41Z"/>
              <path className="cls-261" d="M467.44,957.31c-.19.19-.38.37-.57.55-.27.27-.55.53-.83.79-.49.15-.99.29-1.48.41-.28.07-.56.14-.83.21.26-.26.52-.51.78-.78.18-.18.36-.36.54-.55.3-.07.59-.14.89-.22.5-.13,1.01-.27,1.51-.42Z"/>
              <path className="cls-217" d="M468.71,956.03c-.23.24-.47.48-.7.72-.19.19-.37.37-.56.56-.5.15-1.01.29-1.51.42-.3.08-.59.15-.89.22.18-.18.36-.37.53-.56.23-.25.46-.5.68-.75.32-.07.64-.13.94-.21.51-.13,1.01-.26,1.5-.4Z"/>
              <path className="cls-229" d="M471.08,953.38c-.54.65-1.1,1.29-1.69,1.93-.22.24-.45.49-.68.73-.5.14-1,.27-1.5.4-.3.08-.62.15-.94.21.23-.25.45-.5.67-.75.57-.66,1.13-1.32,1.66-1.99.36-.05.73-.09,1.04-.17.49-.12.97-.24,1.45-.36Z"/>
              <path className="cls-584" d="M474.91,948c-.7,1.16-1.46,2.29-2.28,3.39-.5.67-1.01,1.33-1.55,1.98-.48.12-.96.23-1.45.36-.31.08-.68.12-1.04.17.53-.67,1.05-1.34,1.55-2.03.82-1.13,1.59-2.28,2.3-3.45.42-.03.83-.05,1.17-.13.44-.1.87-.2,1.3-.29Z"/>
              <path className="cls-424" d="M478.71,939.79c-.54,1.6-1.17,3.15-1.88,4.64-.58,1.22-1.22,2.42-1.93,3.58-.43.1-.86.19-1.3.29-.34.07-.76.1-1.17.13.71-1.17,1.37-2.38,1.97-3.61.73-1.5,1.39-3.05,1.96-4.66.43-.05.86-.09,1.24-.16.38-.07.74-.14,1.1-.2Z"/>
              <path className="cls-484" d="M480.4,933.22c-.1.52-.2,1.04-.32,1.57-.38,1.73-.83,3.4-1.37,5-.36.07-.73.14-1.1.2-.38.07-.81.11-1.24.16.57-1.6,1.06-3.27,1.46-5,.12-.54.23-1.06.34-1.59.41-.08.82-.16,1.22-.23.34-.05.68-.09,1.01-.12Z"/>
              <path className="cls-137" d="M480.94,929.88c-.08.6-.17,1.2-.27,1.8-.08.51-.18,1.02-.27,1.54-.34.03-.67.07-1.01.12-.4.07-.81.15-1.22.23.11-.53.2-1.05.3-1.57.11-.61.22-1.21.32-1.8.4-.06.79-.13,1.18-.2.33-.05.65-.09.97-.12Z"/>
              <path className="cls-384" d="M481.39,926.33c-.07.59-.15,1.18-.22,1.77-.07.59-.15,1.17-.23,1.78-.32.03-.64.07-.97.12-.39.07-.79.13-1.18.2.1-.59.2-1.16.28-1.73.08-.59.16-1.19.23-1.78.37.07.74.14,1.13.08.31-.05.64-.25.96-.44Z"/>
              <path className="cls-371" d="M482.58,684.45c-.08,61.81-.16,121.41-.23,157.39-.01,5.61,0,10.81.04,15.53.03,33.84.34,55.48-.81,67.19-.06.59-.12,1.18-.19,1.78-.32.19-.65.39-.96.44-.38.06-.75-.01-1.13-.08.07-.59.14-1.19.2-1.78.62-6.35.54-15.34.57-27.02.04-10.96.06-24.73.11-41.73,0-3.09.02-6.41.02-9.94.08-35.57.16-97.36.23-161.54.4,3.51.81,7.02,1.23,8.26.3-1.61.61-5.05.91-8.49Z"/>
              <path className="cls-279" d="M482.82,448.38c0,2.51,0,5.12,0,7.82v.92c0,24.99-.11,128.84-.23,227.33-.31,3.44-.62,6.89-.91,8.49-.42-1.24-.82-4.75-1.23-8.26.11-98.55.2-202.47.2-227.51v-.92c0-2.71,0-5.33,0-7.84.44-.99.89-1.98,1.33-1.99.28,0,.56.97.84,1.95Z"/>
              <path className="cls-519" d="M482.82,436.68c0,1.43,0,2.94,0,4.55,0,2.26,0,4.65,0,7.15-.28-.98-.56-1.95-.84-1.95-.44,0-.88.99-1.33,1.99,0-2.51,0-4.91,0-7.17v-4.56c.44-.65.89-1.31,1.33-1.31.28,0,.56.65.84,1.3Z"/>
              <path className="cls-592" d="M482.82,432.2v.51c0,1.22,0,2.54,0,3.97-.28-.65-.56-1.3-.84-1.3-.44,0-.88.65-1.33,1.31v-4.49c.44-.1.89-.19,1.33-.19.28,0,.56.1.84.19Z"/>
              <path className="cls-526" d="M482.82,431.7v.5c-.28-.1-.56-.19-.84-.19-.44,0-.88.09-1.33.19v-.5c.44,0,.89,0,1.33,0,.28,0,.56,0,.84,0Z"/>
              <path className="cls-233" d="M464.12,961.86c-.47.4-.91.78-1.33,1.14-.37.12-.73.22-1.09.33-.44.13-.87.24-1.3.35.4-.34.83-.71,1.27-1.09.43-.12.87-.24,1.32-.37.37-.11.74-.23,1.12-.35Z"/>
              <path className="cls-557" d="M466.69,959.62c-.38.34-.76.67-1.13.99-.49.43-.98.85-1.45,1.25-.38.12-.75.24-1.12.35-.45.13-.89.26-1.32.37.44-.38.9-.79,1.37-1.2.35-.31.71-.63,1.07-.96.47-.13.94-.28,1.41-.42.39-.12.78-.25,1.17-.38Z"/>
              <path className="cls-376" d="M468.71,957.8c-.29.27-.58.53-.87.79-.38.34-.76.69-1.15,1.02-.39.14-.78.26-1.17.38-.47.14-.94.29-1.41.42.36-.33.73-.66,1.09-1,.28-.26.56-.51.83-.78.49-.15.99-.3,1.47-.45.4-.13.8-.26,1.19-.4Z"/>
              <path className="cls-372" d="M470.14,956.44c-.19.19-.39.37-.58.56-.28.26-.57.53-.86.8-.4.14-.79.27-1.19.4-.48.15-.97.31-1.47.45.28-.26.55-.52.83-.79.19-.18.38-.37.57-.55.5-.15,1-.3,1.49-.46.41-.13.81-.27,1.21-.41Z"/>
              <path className="cls-194" d="M471.39,955.19c-.22.23-.45.47-.68.69-.19.18-.38.37-.57.56-.4.14-.8.28-1.21.41-.49.16-.99.31-1.49.46.19-.19.38-.37.56-.56.24-.24.47-.48.7-.72.5-.14.99-.28,1.48-.44.41-.13.81-.26,1.21-.4Z"/>
              <path className="cls-269" d="M473.66,952.64c-.51.63-1.05,1.24-1.61,1.85-.21.23-.44.47-.66.7-.4.13-.8.27-1.21.4-.49.16-.99.3-1.48.44.23-.24.46-.48.68-.73.59-.63,1.15-1.28,1.69-1.93.48-.12.95-.24,1.43-.39.39-.12.78-.23,1.16-.35Z"/>
              <path className="cls-448" d="M477.24,947.44c-.65,1.13-1.35,2.22-2.12,3.29-.47.65-.96,1.29-1.47,1.91-.38.11-.76.23-1.16.35-.48.14-.95.27-1.43.39.54-.65,1.06-1.31,1.55-1.98.82-1.1,1.58-2.24,2.28-3.39.43-.1.86-.2,1.29-.3.35-.09.7-.17,1.05-.26Z"/>
              <path className="cls-370" d="M480.71,939.45c-.49,1.55-1.05,3.06-1.7,4.51-.53,1.19-1.12,2.35-1.76,3.48-.34.09-.69.18-1.05.26-.43.1-.86.2-1.29.3.7-1.16,1.34-2.35,1.93-3.58.71-1.49,1.34-3.04,1.88-4.64.36-.07.72-.13,1.09-.18.3-.04.61-.1.91-.16Z"/>
              <path className="cls-232" d="M482.21,933.11c-.08.51-.17,1.02-.28,1.53-.33,1.65-.74,3.26-1.22,4.81-.3.06-.6.12-.91.16-.37.05-.73.11-1.09.18.54-1.6,1-3.27,1.37-5,.11-.53.22-1.05.32-1.57.34-.03.67-.05,1-.07.27-.02.54-.03.81-.04Z"/>
              <path className="cls-560" d="M482.66,929.74c-.06.64-.13,1.27-.22,1.86-.07.5-.15,1-.23,1.51-.27.01-.54.02-.81.04-.33.02-.66.04-1,.07.1-.52.19-1.03.27-1.54.1-.6.19-1.2.27-1.8.32-.03.64-.06.95-.09.26-.03.52-.04.77-.05Z"/>
              <path className="cls-547" d="M483.08,925.77c-.07.68-.15,1.36-.23,2.02-.07.65-.13,1.3-.19,1.95-.25.01-.51.02-.77.05-.31.04-.63.06-.95.09.08-.6.15-1.19.23-1.78.08-.59.15-1.18.22-1.77.32-.19.64-.39.95-.44.25-.05.5-.09.74-.12Z"/>
              <path className="cls-364" d="M484.21,676.54c-.04,54.3-.09,109.09-.14,155.44-.04,38.62,1.01,71.18-.78,91.74-.06.68-.13,1.37-.2,2.05-.24.04-.49.07-.74.12-.3.06-.62.25-.95.44.07-.59.14-1.18.19-1.78,1.14-11.71.84-33.35.81-67.19-.03-4.72-.05-9.92-.04-15.53.07-35.98.15-95.58.23-157.39.31-3.44.61-6.88.9-8.47.25.57.49.67.73.56Z"/>
              <path className="cls-146" d="M484.34,450.38c0,2.49,0,4.99,0,7.48-.01,40.93-.06,128.89-.12,218.68-.23.11-.47,0-.73-.56-.29,1.59-.59,5.03-.9,8.47.12-98.49.22-202.34.23-227.33v-.92c0-2.7,0-5.31,0-7.82.28.98.56,1.96.83,1.99.23.02.46.02.69.01Z"/>
              <path className="cls-146" d="M484.34,437.99c0,1.64,0,3.28,0,4.91,0,2.49,0,4.99,0,7.48-.23,0-.45.01-.69-.01-.27-.03-.55-1.01-.83-1.99,0-2.51,0-4.9,0-7.15,0-1.61,0-3.12,0-4.55.28.65.56,1.3.84,1.31.23,0,.46,0,.68,0Z"/>
              <path className="cls-251" d="M484.34,432.39v.69c0,1.64,0,3.28,0,4.91-.23,0-.45,0-.68,0-.28,0-.56-.66-.84-1.31,0-1.43,0-2.75,0-3.97v-.51c.28.1.56.19.84.19.23,0,.46,0,.68,0Z"/>
              <path className="cls-413" d="M484.34,431.7v.69c-.23,0-.45,0-.68,0-.28,0-.56-.1-.84-.19v-.5c.28,0,.56,0,.84,0,.23,0,.46,0,.68,0Z"/>
              <path className="cls-143" d="M466.56,960.97c-.48.42-.95.82-1.38,1.19-.43.16-.86.32-1.29.47-.37.13-.74.25-1.1.36.41-.35.86-.73,1.33-1.14.38-.12.75-.25,1.13-.39.44-.16.87-.32,1.31-.5Z"/>
              <path className="cls-582" d="M469.21,958.66c-.39.34-.78.69-1.15,1.02-.5.44-1.01.88-1.49,1.3-.44.17-.88.34-1.31.5-.38.14-.75.27-1.13.39.47-.4.95-.82,1.45-1.25.37-.32.75-.65,1.13-.99.39-.14.78-.28,1.17-.42.45-.17.9-.35,1.35-.53Z"/>
              <path className="cls-179" d="M471.25,956.82c-.29.27-.59.54-.88.8-.38.34-.78.7-1.16,1.04-.45.19-.9.36-1.35.53-.39.15-.78.29-1.17.42.38-.34.77-.68,1.15-1.02.29-.26.58-.53.87-.79.4-.14.79-.29,1.19-.44.45-.17.91-.36,1.36-.54Z"/>
              <path className="cls-106" d="M472.7,955.48c-.19.18-.39.37-.58.55-.28.26-.57.53-.86.8-.45.19-.9.37-1.36.54-.39.15-.79.3-1.19.44.29-.27.58-.54.86-.8.19-.18.39-.37.58-.56.4-.14.8-.29,1.19-.43.46-.17.91-.35,1.36-.53Z"/>
              <path className="cls-346" d="M473.91,954.29c-.21.22-.43.43-.64.64-.18.18-.38.36-.57.54-.45.18-.9.36-1.36.53-.4.15-.79.29-1.19.43.19-.19.38-.37.57-.56.23-.23.46-.46.68-.69.4-.13.79-.27,1.18-.41.45-.16.89-.32,1.33-.49Z"/>
              <path className="cls-109" d="M476.04,951.89c-.48.6-.98,1.18-1.51,1.75-.2.22-.41.44-.62.65-.44.17-.88.33-1.33.49-.39.14-.78.28-1.18.41.22-.23.45-.47.66-.7.56-.61,1.09-1.22,1.61-1.85.38-.11.75-.23,1.12-.34.43-.13.84-.27,1.26-.41Z"/>
              <path className="cls-235" d="M479.41,946.84c-.6,1.1-1.27,2.18-2,3.22-.44.63-.9,1.24-1.38,1.84-.41.14-.83.27-1.26.41-.37.12-.74.23-1.12.34.51-.63,1-1.27,1.47-1.91.77-1.07,1.47-2.16,2.12-3.29.34-.09.68-.18,1.02-.27.39-.11.77-.22,1.15-.33Z"/>
              <path className="cls-92" d="M482.61,939.06c-.43,1.49-.95,2.94-1.55,4.36-.49,1.17-1.05,2.31-1.65,3.42-.38.11-.76.22-1.15.33-.34.09-.67.18-1.02.27.65-1.13,1.23-2.28,1.76-3.48.65-1.45,1.21-2.96,1.7-4.51.3-.06.6-.12.89-.17.34-.06.68-.14,1.01-.22Z"/>
              <path className="cls-133" d="M483.91,933.01c-.07.49-.15.99-.24,1.49-.28,1.55-.63,3.07-1.06,4.56-.33.08-.67.16-1.01.22-.29.05-.59.11-.89.17.49-1.55.89-3.16,1.22-4.81.1-.51.19-1.02.28-1.53.27-.01.53-.02.8-.04.3-.02.6-.03.9-.06Z"/>
              <path className="cls-413" d="M484.28,929.62c-.06.69-.11,1.35-.18,1.92-.06.49-.12.98-.19,1.47-.3.02-.6.04-.9.06-.26.01-.53.03-.8.04.08-.51.16-1.01.23-1.51.09-.59.16-1.22.22-1.86.25-.01.51-.02.76-.05.29-.03.57-.05.86-.07Z"/>
              <path className="cls-163" d="M484.61,925.55c-.05.65-.11,1.29-.17,1.91-.06.73-.11,1.46-.16,2.15-.28.02-.57.03-.86.07-.25.03-.5.04-.76.05.06-.64.12-1.3.19-1.95.08-.66.16-1.34.23-2.02.24-.04.48-.07.72-.1.27-.04.54-.08.8-.11Z"/>
              <path className="cls-423" d="M485.71,675.66c-.02,53.9-.05,108.76-.08,154.89-.03,39.14.54,72.21-.87,93.01-.05.67-.1,1.34-.15,1.99-.26.03-.53.07-.8.11-.24.04-.48.07-.72.1.07-.68.15-1.37.2-2.05,1.79-20.56.74-53.12.78-91.74.05-46.35.1-101.14.14-155.44.23-.11.46-.43.7-.72.27-.12.54-.16.8-.16Z"/>
              <path className="cls-253" d="M485.78,450.34c0,2.49,0,4.97,0,7.46,0,40.89-.03,128.11-.07,217.86-.26,0-.53.04-.8.16-.24.29-.47.61-.7.72.07-89.79.11-177.75.12-218.68,0-2.49,0-4.99,0-7.48.23,0,.45-.02.67-.03.26,0,.52-.01.77-.02Z"/>
              <path className="cls-184" d="M485.78,437.99c0,1.63,0,3.27,0,4.9,0,2.49,0,4.97,0,7.46-.26,0-.51,0-.77.02-.22,0-.45.02-.67.03,0-2.49,0-4.99,0-7.48,0-1.64,0-3.28,0-4.91.23,0,.45,0,.68,0,.26,0,.52,0,.77,0Z"/>
              <path className="cls-298" d="M485.78,432.4v5.59c-.26,0-.51,0-.77,0-.22,0-.45,0-.68,0,0-1.64,0-3.28,0-4.91v-.69c.23,0,.45,0,.68,0,.26,0,.52,0,.77,0Z"/>
              <path className="cls-301" d="M485.78,431.71v.69c-.25,0-.51,0-.77,0-.22,0-.45,0-.68,0v-.69c.23,0,.45,0,.68,0,.26,0,.52,0,.77,0Z"/>
              <path className="cls-579" d="M469.07,959.89c-.49.43-.97.84-1.41,1.22-.4.18-.79.36-1.18.52-.43.18-.87.36-1.3.52.43-.37.9-.77,1.38-1.19.44-.17.88-.36,1.32-.54.4-.17.8-.35,1.19-.53Z"/>
              <path className="cls-131" d="M471.74,957.54c-.39.35-.78.69-1.16,1.03-.51.45-1.02.9-1.51,1.32-.4.18-.79.36-1.19.53-.44.19-.88.37-1.32.54.48-.42.99-.86,1.49-1.3.37-.33.76-.67,1.15-1.02.45-.19.89-.38,1.33-.57.4-.18.8-.36,1.2-.54Z"/>
              <path className="cls-528" d="M473.78,955.71c-.29.26-.58.53-.87.79-.38.35-.78.7-1.17,1.04-.4.18-.79.37-1.2.54-.44.2-.89.39-1.33.57.39-.34.78-.7,1.16-1.04.29-.26.59-.53.88-.8.45-.19.9-.38,1.34-.57.4-.18.8-.36,1.19-.54Z"/>
              <path className="cls-219" d="M475.21,954.39c-.19.18-.38.36-.58.53-.28.26-.57.52-.86.78-.39.18-.79.36-1.19.54-.44.19-.89.39-1.34.57.29-.27.58-.54.86-.8.19-.18.39-.37.58-.55.45-.18.89-.37,1.33-.56.4-.17.79-.35,1.18-.53Z"/>
              <path className="cls-459" d="M476.37,953.28c-.2.2-.4.39-.6.59-.18.17-.37.35-.56.53-.39.18-.78.35-1.18.53-.44.19-.88.38-1.33.56.19-.18.38-.37.57-.54.22-.21.43-.42.64-.64.44-.17.87-.34,1.3-.52.39-.16.78-.33,1.16-.49Z"/>
              <path className="cls-575" d="M478.39,951.01c-.45.57-.93,1.13-1.43,1.66-.19.21-.38.4-.58.6-.38.17-.77.33-1.16.49-.43.18-.86.35-1.3.52.21-.22.42-.44.62-.65.53-.57,1.03-1.15,1.51-1.75.41-.14.83-.28,1.24-.44.37-.14.74-.29,1.11-.44Z"/>
              <path className="cls-172" d="M481.54,946.13c-.56,1.08-1.18,2.12-1.86,3.12-.41.61-.84,1.2-1.3,1.77-.37.15-.74.3-1.11.44-.41.16-.82.3-1.24.44.48-.6.94-1.21,1.38-1.84.72-1.03,1.39-2.12,2-3.22.38-.11.75-.23,1.12-.35.34-.11.67-.23,1.01-.36Z"/>
              <path className="cls-180" d="M484.45,938.58c-.38,1.44-.85,2.85-1.39,4.23-.45,1.13-.95,2.24-1.51,3.32-.33.13-.67.25-1.01.36-.37.12-.75.24-1.12.35.6-1.1,1.16-2.25,1.65-3.42.6-1.42,1.11-2.87,1.55-4.36.33-.08.66-.16.98-.23.29-.06.58-.15.86-.24Z"/>
              <path className="cls-126" d="M485.56,932.78c-.06.48-.12.97-.2,1.45-.23,1.46-.53,2.92-.92,4.35-.28.09-.57.18-.86.24-.32.07-.65.15-.98.23.43-1.49.79-3.01,1.06-4.56.09-.5.17-.99.24-1.49.3-.02.59-.05.88-.09.26-.04.52-.08.78-.14Z"/>
              <path className="cls-585" d="M485.86,929.42c-.05.7-.1,1.36-.15,1.92-.04.48-.09.96-.15,1.44-.25.06-.51.1-.78.14-.29.04-.58.07-.88.09.07-.49.13-.98.19-1.47.07-.57.13-1.23.18-1.92.28-.02.56-.04.84-.09.25-.04.5-.08.74-.12Z"/>
              <path className="cls-302" d="M486.1,925.33c-.04.63-.06,1.22-.1,1.81-.05.8-.09,1.58-.14,2.29-.24.04-.49.07-.74.12-.28.05-.56.07-.84.09.06-.69.11-1.43.16-2.15.06-.62.11-1.26.17-1.91.26-.03.53-.07.79-.11.24-.04.47-.08.71-.12Z"/>
              <path className="cls-237" d="M487.19,688.36c0,62.56-.02,122.31-.03,157.82,0,10.39.01,19.27,0,26.26-.02,15.48-.33,38.3-.96,50.96-.03.67-.06,1.31-.1,1.94-.23.04-.47.08-.71.12-.26.04-.52.08-.79.11.05-.65.11-1.32.15-1.99,1.41-20.8.85-53.87.87-93.01.03-46.13.06-100.99.08-154.89.26,0,.52.03.78.06.24,3.26.47,7.95.7,12.64Z"/>
              <path className="cls-426" d="M487.22,447.27c0,1.63,0,3.25,0,4.87,0,28.18-.02,135.6-.03,236.22-.23-4.69-.46-9.38-.7-12.64-.26-.03-.52-.07-.78-.06.04-89.75.06-176.97.07-217.86,0-2.49,0-4.97,0-7.46.26,0,.51,0,.76,0,.23,0,.45-1.54.68-3.08Z"/>
              <path className="cls-335" d="M487.22,437.14c0,1.64,0,3.43,0,5.26,0,1.63,0,3.25,0,4.87-.22,1.54-.45,3.09-.68,3.08-.25,0-.5,0-.76,0,0-2.49,0-4.97,0-7.46,0-1.63,0-3.27,0-4.9.25,0,.51,0,.76,0,.23,0,.45-.42.68-.85Z"/>
              <path className="cls-212" d="M487.22,432.21v.53c0,1.26,0,2.76,0,4.41-.22.42-.45.85-.68.85-.25,0-.5,0-.76,0v-5.59c.26,0,.51,0,.76,0,.23,0,.45-.1.68-.19Z"/>
              <path className="cls-313" d="M487.22,431.71v.49c-.22.1-.45.19-.68.19-.25,0-.5,0-.76,0v-.69c.26,0,.51,0,.76,0,.23,0,.45,0,.68,0Z"/>
              <path className="cls-372" d="M471.04,958.92c-.46.41-.89.81-1.32,1.17-.29.15-.58.3-.87.45-.4.2-.79.39-1.19.57.44-.38.92-.8,1.41-1.22.4-.18.79-.37,1.18-.57.26-.13.52-.26.78-.4Z"/>
              <path className="cls-282" d="M473.53,956.67c-.36.33-.73.67-1.09.99-.48.43-.95.85-1.4,1.26-.26.14-.52.27-.78.4-.39.19-.79.38-1.18.57.49-.43,1-.88,1.51-1.32.38-.33.77-.68,1.16-1.03.4-.18.79-.37,1.17-.56.21-.1.41-.21.62-.31Z"/>
              <path className="cls-149" d="M475.43,954.92c-.27.25-.53.5-.81.75-.36.33-.73.67-1.09,1-.21.11-.41.21-.62.31-.39.19-.78.37-1.17.56.39-.35.78-.7,1.17-1.04.29-.26.58-.53.87-.79.39-.18.78-.36,1.16-.55.17-.08.33-.16.49-.24Z"/>
              <path className="cls-615" d="M476.76,953.67c-.18.17-.36.34-.54.51-.26.24-.52.49-.79.75-.16.08-.33.16-.49.24-.38.18-.77.37-1.16.55.29-.26.58-.53.86-.78.19-.18.39-.36.58-.53.39-.18.78-.36,1.16-.54.13-.06.26-.13.39-.19Z"/>
              <path className="cls-218" d="M477.88,952.58c-.2.2-.39.39-.6.58-.17.16-.35.33-.52.5-.13.06-.26.13-.39.19-.38.18-.77.36-1.16.54.19-.18.38-.35.56-.53.21-.19.4-.39.6-.59.38-.17.77-.34,1.14-.52.12-.06.24-.12.36-.18Z"/>
              <path className="cls-572" d="M479.88,950.3c-.45.58-.92,1.13-1.42,1.68-.19.21-.38.4-.58.6-.12.06-.24.12-.36.18-.38.18-.76.35-1.14.52.2-.2.39-.4.58-.6.5-.54.98-1.09,1.43-1.66.37-.15.74-.31,1.1-.48.13-.06.26-.14.39-.23Z"/>
              <path className="cls-477" d="M482.98,945.43c-.55,1.07-1.16,2.1-1.82,3.1-.4.61-.83,1.2-1.28,1.77-.13.09-.26.17-.39.23-.36.17-.73.33-1.1.48.45-.57.89-1.16,1.3-1.77.68-1,1.3-2.04,1.86-3.12.33-.13.66-.27.99-.41.15-.06.3-.17.45-.3Z"/>
              <path className="cls-555" d="M485.8,938.01c-.37,1.4-.82,2.78-1.34,4.14-.43,1.12-.93,2.21-1.47,3.28-.15.12-.3.24-.45.3-.33.14-.66.28-.99.41.56-1.08,1.07-2.18,1.51-3.32.54-1.38,1.01-2.79,1.39-4.23.28-.09.56-.2.83-.3.17-.06.35-.16.52-.27Z"/>
              <path className="cls-502" d="M486.87,932.36c-.06.48-.12.96-.19,1.43-.22,1.41-.51,2.82-.88,4.22-.17.11-.34.21-.52.27-.28.1-.55.21-.83.3.38-1.44.69-2.89.92-4.35.08-.49.14-.97.2-1.45.26-.06.51-.12.75-.2.19-.06.37-.13.55-.22Z"/>
              <path className="cls-583" d="M487.15,929.07c-.05.69-.09,1.32-.14,1.87-.04.47-.09.95-.15,1.43-.18.08-.36.16-.55.22-.25.08-.5.15-.75.2.06-.48.11-.96.15-1.44.05-.56.1-1.22.15-1.92.24-.04.49-.09.73-.15.19-.05.38-.12.57-.19Z"/>
              <path className="cls-469" d="M487.39,925.01c-.03.63-.06,1.23-.1,1.83-.04.79-.09,1.55-.14,2.23-.19.07-.38.14-.57.19-.24.07-.48.11-.73.15.05-.7.09-1.49.14-2.29.04-.58.07-1.18.1-1.81.23-.04.47-.08.71-.14.19-.05.39-.11.58-.17Z"/>
              <path className="cls-551" d="M488.4,696.65c0,60.02-.01,116.84-.02,150.77,0,10.65,0,19.64-.02,26.55-.03,14.68-.35,36.84-.88,49.11-.03.67-.06,1.3-.09,1.93-.19.07-.39.13-.58.17-.24.05-.47.1-.71.14.04-.63.06-1.27.1-1.94.64-12.66.95-35.47.96-50.96,0-6.99,0-15.86,0-26.26.01-35.51.02-95.27.03-157.82.23,4.69.46,9.38.7,12.63.18.81.35-1.76.51-4.33Z"/>
              <path className="cls-518" d="M488.49,447.21c.02,1.62.03,3.25.04,4.88.12,19.91-.11,74.76-.12,139.58,0,33.45,0,69.77-.01,104.98-.17,2.57-.34,5.14-.51,4.33-.24-3.25-.47-7.94-.7-12.63.01-100.62.03-208.03.03-236.22,0-1.63,0-3.25,0-4.87.22-1.54.45-3.08.67-3.06.22.02.42,1.52.61,3.01Z"/>
              <path className="cls-342" d="M488.34,437.09c.03,1.65.08,3.44.1,5.25.02,1.62.04,3.25.05,4.88-.19-1.5-.39-2.99-.61-3.01-.22-.02-.44,1.52-.67,3.06,0-1.63,0-3.25,0-4.87,0-1.83,0-3.61,0-5.26.22-.42.45-.85.67-.85.21,0,.34.39.46.8Z"/>
              <path className="cls-254" d="M488.44,432.19c-.02.17-.03.33-.04.51-.09,1.24-.09,2.74-.06,4.39-.12-.4-.25-.8-.46-.8-.22,0-.44.42-.67.85,0-1.64,0-3.14,0-4.41v-.53c.22-.1.45-.19.67-.19.21,0,.38.09.56.18Z"/>
              <path className="cls-470" d="M488.5,431.71c-.02.15-.04.31-.06.47-.17-.09-.35-.18-.56-.18-.22,0-.44.1-.67.19v-.49c.22,0,.45,0,.67,0,.21,0,.41,0,.61,0Z"/>
              <path className="cls-446" d="M472.88,957.87c-.39.37-.76.73-1.13,1.05-.39.24-.78.47-1.17.69-.29.16-.58.32-.86.48.42-.37.86-.76,1.32-1.17.26-.14.52-.28.78-.43.35-.2.71-.41,1.06-.62Z"/>
              <path className="cls-369" d="M474.98,955.88c-.3.3-.61.6-.91.87-.4.37-.8.75-1.19,1.12-.35.22-.71.42-1.06.62-.26.15-.52.29-.78.43.46-.41.92-.84,1.4-1.26.36-.32.73-.65,1.09-.99.21-.11.41-.21.62-.33.28-.15.56-.31.83-.47Z"/>
              <path className="cls-431" d="M476.57,954.33c-.22.23-.44.46-.67.67-.3.28-.61.58-.91.88-.28.16-.55.32-.83.47-.21.11-.41.22-.62.33.36-.33.73-.67,1.09-1,.27-.25.54-.5.81-.75.16-.08.32-.16.49-.25.22-.11.44-.23.65-.34Z"/>
              <path className="cls-246" d="M477.68,953.21c-.15.15-.3.31-.45.46-.22.21-.44.44-.66.67-.21.12-.43.23-.65.34-.16.08-.32.17-.49.25.27-.25.53-.5.79-.75.18-.17.36-.34.54-.51.13-.06.26-.13.39-.19.18-.09.35-.18.53-.27Z"/>
              <path className="cls-292" d="M478.74,952.11c-.2.22-.41.43-.62.65-.14.14-.29.3-.44.45-.17.09-.35.18-.53.27-.13.06-.26.13-.39.19.18-.17.35-.34.52-.5.2-.2.4-.39.6-.58.12-.06.24-.13.36-.19.16-.09.33-.18.49-.28Z"/>
              <path className="cls-218" d="M480.81,949.65c-.47.61-.96,1.22-1.47,1.81-.2.23-.4.44-.6.66-.16.09-.33.19-.49.28-.12.07-.24.13-.36.19.2-.2.39-.39.58-.6.5-.54.97-1.1,1.42-1.68.13-.09.26-.19.39-.26.18-.11.36-.25.54-.39Z"/>
              <path className="cls-436" d="M484.02,944.56c-.57,1.09-1.2,2.16-1.89,3.21-.42.64-.86,1.26-1.33,1.88-.18.15-.37.29-.54.39-.13.08-.26.17-.39.26.45-.58.88-1.17,1.28-1.77.67-1,1.28-2.03,1.82-3.1.15-.12.3-.25.44-.34.2-.12.4-.32.6-.53Z"/>
              <path className="cls-543" d="M486.96,937.12c-.39,1.38-.85,2.75-1.4,4.11-.45,1.12-.96,2.23-1.53,3.32-.2.21-.41.41-.6.53-.14.09-.29.22-.44.34.55-1.07,1.04-2.16,1.47-3.28.53-1.36.98-2.74,1.34-4.14.17-.11.34-.23.5-.34.22-.14.44-.34.66-.55Z"/>
              <path className="cls-534" d="M488.11,931.63c-.06.46-.14.92-.21,1.38-.24,1.36-.55,2.73-.93,4.11-.22.21-.43.41-.66.55-.16.1-.33.23-.5.34.37-1.4.66-2.81.88-4.22.07-.47.14-.96.19-1.43.18-.08.36-.18.54-.28.24-.14.47-.29.7-.45Z"/>
              <path className="cls-329" d="M488.44,928.52c-.05.63-.11,1.23-.16,1.75-.05.45-.11.91-.17,1.36-.23.16-.46.31-.7.45-.18.1-.35.2-.54.28.06-.48.1-.96.15-1.43.05-.54.1-1.18.14-1.87.19-.07.37-.15.55-.22.25-.09.49-.21.73-.33Z"/>
              <path className="cls-476" d="M488.73,924.53c-.04.67-.08,1.33-.14,2-.05.68-.1,1.36-.15,1.99-.24.12-.49.24-.73.33-.18.07-.37.15-.55.22.05-.69.09-1.44.14-2.23.04-.6.07-1.2.1-1.83.19-.07.39-.13.57-.19.26-.08.51-.18.77-.29Z"/>
              <path className="cls-580" d="M489.51,683.62c.01,51.6.02,103.61,0,147.55,0,2.42,0,4.82,0,7.19-.01,35.31.12,64.95-.68,84.18-.03.67-.06,1.33-.1,2-.25.1-.51.21-.77.29-.19.06-.38.13-.57.19.03-.63.06-1.26.09-1.93.53-12.27.84-34.43.88-49.11.02-6.91.02-15.9.02-26.55,0-33.93.01-90.74.02-150.77.17-2.57.33-5.15.51-4.36.22-2.99.42-5.84.61-8.68Z"/>
              <path className="cls-189" d="M489.63,450.25c0,2.48.02,4.97.02,7.45.07,27.87-.17,77.55-.16,134.76,0,29.01.01,59.99.02,91.16-.19,2.84-.38,5.69-.61,8.68-.17-.79-.34,1.79-.51,4.36,0-35.21,0-71.53.01-104.98,0-64.82.25-119.67.12-139.58-.01-1.62-.02-3.25-.04-4.88.19,1.5.39,2.99.6,3.01.21.02.38.03.54.02Z"/>
              <path className="cls-309" d="M489.53,437.92c0,1.63.05,3.27.06,4.88.01,2.48.03,4.97.04,7.44-.16,0-.33,0-.54-.02-.21-.02-.41-1.52-.6-3.01-.02-1.62-.03-3.25-.05-4.88-.01-1.81-.07-3.6-.1-5.25.12.4.24.8.45.81.24,0,.49.02.75.03Z"/>
              <path className="cls-382" d="M489.76,432.36c-.03.22-.06.46-.08.7-.13,1.6-.16,3.23-.15,4.86-.25,0-.51-.02-.75-.03-.2,0-.32-.41-.45-.81-.03-1.65-.03-3.15.06-4.39.01-.18.03-.35.04-.51.17.09.35.18.54.18.27,0,.52,0,.77,0Z"/>
              <path className="cls-523" d="M489.89,431.72c-.05.2-.09.42-.13.64-.25,0-.51.01-.77,0-.2,0-.37-.09-.54-.18.02-.17.03-.32.06-.47.2,0,.4,0,.6,0,.27,0,.53,0,.79,0Z"/>
              <path className="cls-138" d="M474.67,956.71c-.32.32-.64.64-.96.91-.27.19-.53.38-.8.56-.38.26-.77.51-1.16.75.37-.32.74-.68,1.13-1.05.36-.22.71-.44,1.06-.67.24-.16.49-.33.73-.49Z"/>
              <path className="cls-621" d="M476.38,955.03c-.24.25-.48.5-.73.72-.33.31-.66.64-.98.96-.24.17-.49.33-.73.49-.35.23-.7.45-1.06.67.39-.37.78-.76,1.19-1.12.3-.27.61-.57.91-.87.28-.16.55-.32.83-.49.19-.12.38-.24.57-.36Z"/>
              <path className="cls-193" d="M477.65,953.71c-.18.2-.37.4-.55.58-.24.24-.48.49-.72.74-.19.12-.38.24-.57.36-.27.17-.55.33-.83.49.3-.3.61-.6.91-.88.23-.21.45-.44.67-.67.21-.12.43-.24.64-.36.15-.09.3-.17.44-.26Z"/>
              <path className="cls-419" d="M478.56,952.75c-.12.13-.24.27-.36.39-.18.18-.36.38-.54.58-.15.09-.29.17-.44.26-.21.12-.43.24-.64.36.22-.23.44-.46.66-.67.15-.15.3-.3.45-.46.17-.09.35-.18.52-.27.12-.06.24-.13.36-.19Z"/>
              <path className="cls-612" d="M479.57,951.63c-.21.25-.43.49-.65.73-.12.12-.24.25-.36.39-.12.06-.24.13-.36.19-.17.09-.35.18-.52.27.15-.15.29-.31.44-.45.21-.22.42-.43.62-.65.16-.09.33-.19.49-.29.11-.07.23-.13.34-.2Z"/>
              <path className="cls-361" d="M481.72,948.95c-.48.65-.99,1.3-1.52,1.94-.2.24-.42.49-.63.74-.11.07-.23.13-.34.2-.16.1-.33.19-.49.29.2-.22.4-.43.6-.66.51-.59,1.01-1.19,1.47-1.81.18-.15.36-.3.54-.41.12-.08.25-.18.37-.28Z"/>
              <path className="cls-468" d="M485.02,943.63c-.58,1.12-1.22,2.24-1.93,3.34-.43.67-.89,1.33-1.37,1.98-.12.1-.25.2-.37.28-.17.12-.36.27-.54.41.47-.61.91-1.24,1.33-1.88.69-1.05,1.32-2.12,1.89-3.21.2-.21.4-.42.59-.56.13-.1.27-.24.4-.37Z"/>
              <path className="cls-113" d="M488.02,936.12c-.4,1.36-.88,2.74-1.44,4.11-.46,1.13-.98,2.26-1.56,3.39-.13.14-.27.28-.4.37-.19.14-.39.35-.59.56.57-1.09,1.08-2.2,1.53-3.32.55-1.36,1.02-2.74,1.4-4.11.22-.21.43-.43.63-.59.14-.12.29-.26.43-.41Z"/>
              <path className="cls-539" d="M489.24,930.8c-.07.43-.16.86-.24,1.3-.26,1.32-.58,2.66-.98,4.02-.14.14-.28.29-.43.41-.21.17-.42.38-.63.59.39-1.38.7-2.75.93-4.11.08-.46.15-.92.21-1.38.23-.16.46-.33.68-.49.15-.12.31-.23.46-.35Z"/>
              <path className="cls-374" d="M489.63,927.94c-.06.55-.12,1.08-.19,1.58-.06.43-.13.85-.2,1.28-.15.11-.3.23-.46.35-.22.17-.45.33-.68.49.06-.46.12-.92.17-1.36.06-.52.11-1.12.16-1.75.24-.12.48-.24.71-.35.16-.07.32-.16.48-.24Z"/>
              <path className="cls-403" d="M489.98,924.03c-.05.72-.11,1.46-.19,2.21-.05.58-.1,1.15-.16,1.69-.16.08-.32.17-.48.24-.23.1-.47.23-.71.35.05-.63.1-1.3.15-1.99.06-.67.1-1.34.14-2,.25-.1.5-.21.74-.3.17-.06.34-.13.5-.2Z"/>
              <path className="cls-354" d="M490.58,674.95c0,55.77,0,112.48-.02,159.5,0,2.18,0,4.34,0,6.48,0,33.93.3,62.36-.46,81-.03.67-.07,1.37-.12,2.09-.17.07-.34.14-.5.2-.24.09-.49.19-.74.3.04-.67.07-1.33.1-2,.81-19.23.67-48.86.68-84.18,0-2.37,0-4.77,0-7.19.02-43.95,0-95.96,0-147.55.19-2.84.38-5.66.58-8.59.17-.04.33-.06.49-.07Z"/>
              <path className="cls-325" d="M490.76,450.17c-.02,2.48-.05,4.95-.06,7.42-.12,40.68-.13,127.81-.12,217.37-.16.02-.33.03-.49.07-.21,2.94-.39,5.76-.58,8.59,0-31.17-.02-62.16-.02-91.16,0-57.22.24-106.9.16-134.76,0-2.48-.01-4.97-.02-7.45.16,0,.32-.02.51-.05.2-.04.41-.03.62-.03Z"/>
              <path className="cls-210" d="M490.64,437.77c0,1.68.05,3.38.09,4.97.05,2.47.05,4.95.03,7.42-.21,0-.42-.01-.62.03-.19.03-.35.05-.51.05,0-2.48-.02-4.97-.04-7.44,0-1.61-.05-3.25-.06-4.88.25,0,.5,0,.72-.03.18-.03.29-.07.4-.12Z"/>
              <path className="cls-93" d="M491.01,432.3c-.05.2-.08.42-.11.65-.19,1.5-.25,3.15-.25,4.83-.11.05-.22.09-.4.12-.22.03-.46.04-.72.03,0-1.63.02-3.26.15-4.86.02-.24.05-.48.08-.7.25,0,.5-.02.74-.04.17-.01.34-.02.5-.03Z"/>
              <path className="cls-573" d="M491.17,431.72c-.06.18-.12.37-.16.57-.17.01-.34.02-.5.03-.25.02-.49.03-.74.04.03-.22.08-.44.13-.64.26,0,.51,0,.76,0,.17,0,.35,0,.52,0Z"/>
              <path className="cls-196" d="M476.29,955.51c-.26.26-.53.51-.79.74-.33.27-.66.53-.99.78-.26.2-.53.4-.79.59.31-.27.63-.59.96-.91.24-.17.48-.34.72-.52.3-.22.6-.45.9-.69Z"/>
              <path className="cls-549" d="M477.65,954.15c-.19.2-.37.39-.57.58-.26.25-.53.52-.79.77-.3.24-.6.46-.9.69-.24.17-.48.35-.72.52.32-.32.65-.65.98-.96.25-.23.49-.48.73-.72.19-.12.38-.25.57-.38.24-.16.47-.33.71-.5Z"/>
              <path className="cls-136" d="M478.65,953.09c-.14.16-.29.32-.43.47-.19.2-.37.39-.56.59-.23.17-.47.34-.71.5-.19.13-.38.25-.57.38.24-.25.48-.5.72-.74.19-.18.37-.38.55-.58.15-.09.29-.18.44-.27.19-.12.37-.23.55-.35Z"/>
              <path className="cls-249" d="M479.36,952.3c-.09.11-.19.22-.29.32-.14.15-.28.31-.43.47-.18.12-.37.24-.55.35-.15.09-.29.18-.44.27.18-.2.36-.4.54-.58.12-.12.24-.26.36-.39.12-.06.24-.13.36-.19.15-.08.3-.17.45-.25Z"/>
              <path className="cls-316" d="M480.32,951.19c-.22.26-.45.54-.68.79-.09.1-.19.21-.28.32-.15.08-.3.17-.45.25-.12.07-.24.13-.36.19.12-.13.24-.27.36-.39.22-.24.44-.49.65-.73.11-.07.22-.13.33-.2.14-.08.28-.16.41-.24Z"/>
              <path className="cls-471" d="M482.53,948.34c-.49.69-1.01,1.37-1.56,2.05-.21.26-.43.53-.65.8-.14.08-.28.16-.41.24-.11.06-.22.13-.33.2.21-.25.43-.5.63-.74.53-.64,1.04-1.28,1.52-1.94.12-.1.25-.2.36-.27.15-.1.3-.22.45-.33Z"/>
              <path className="cls-375" d="M485.9,942.82c-.59,1.15-1.25,2.3-1.97,3.45-.44.69-.91,1.39-1.4,2.08-.15.11-.3.24-.45.33-.12.08-.24.17-.36.27.48-.65.94-1.32,1.37-1.98.71-1.1,1.35-2.22,1.93-3.34.13-.14.27-.27.39-.36.16-.11.32-.28.49-.44Z"/>
              <path className="cls-436" d="M488.95,935.28c-.41,1.34-.9,2.72-1.47,4.1-.47,1.14-1,2.29-1.59,3.44-.16.16-.33.33-.49.44-.13.09-.26.23-.39.36.58-1.12,1.1-2.26,1.56-3.39.56-1.38,1.04-2.75,1.44-4.11.14-.14.28-.29.42-.39.17-.14.35-.3.52-.45Z"/>
              <path className="cls-112" d="M490.23,930.08c-.08.41-.17.82-.26,1.25-.27,1.27-.61,2.6-1.02,3.94-.17.15-.34.32-.52.45-.14.11-.28.25-.42.39.4-1.36.72-2.71.98-4.02.09-.44.17-.87.24-1.3.15-.11.3-.23.45-.33.19-.13.37-.26.55-.38Z"/>
              <path className="cls-580" d="M490.67,927.42c-.06.48-.13.95-.21,1.44-.07.41-.14.81-.22,1.22-.18.12-.36.24-.55.38-.15.11-.3.22-.45.33.07-.43.14-.85.2-1.28.07-.5.13-1.03.19-1.58.16-.08.31-.16.47-.23.19-.09.38-.19.57-.28Z"/>
              <path className="cls-444" d="M491.06,923.61c-.06.76-.13,1.56-.23,2.37-.05.49-.11.96-.17,1.44-.19.09-.38.19-.57.28-.15.07-.31.15-.47.23.06-.55.11-1.11.16-1.69.08-.75.14-1.49.19-2.21.17-.07.33-.14.49-.2.2-.07.4-.15.6-.23Z"/>
              <path className="cls-108" d="M491.57,684.61c-.06,67.3-.12,133.97-.15,178.44-.02,26.21.16,46.06-.16,55.91-.01.77-.03,1.61-.07,2.49-.03.67-.07,1.4-.13,2.16-.2.08-.4.16-.6.23-.16.06-.32.13-.49.2.05-.72.09-1.43.12-2.09.76-18.64.46-47.07.46-81,0-2.14,0-4.3,0-6.48.03-47.02.02-103.73.02-159.5.16-.01.32-.03.47-.08.17,3.55.34,6.64.51,9.73Z"/>
              <path className="cls-551" d="M491.9,443.51c-.01,1.67-.04,3.43-.05,5.25-.08,30.6-.19,133.88-.28,235.85-.17-3.09-.34-6.18-.51-9.73-.15.05-.31.06-.47.08,0-89.56,0-176.68.12-217.37,0-2.47.04-4.95.06-7.42.21,0,.42,0,.6-.06.2-2.21.36-4.4.53-6.6Z"/>
              <path className="cls-582" d="M491.73,435.76c.01,1.02.08,2.07.12,3,.06,1.49.06,3.08.05,4.75-.16,2.19-.33,4.38-.53,6.6-.19.06-.39.06-.6.06.02-2.48.02-4.95-.03-7.42-.03-1.59-.09-3.29-.09-4.97.11-.05.21-.1.37-.15.2-.67.46-1.27.71-1.86Z"/>
              <path className="cls-143" d="M492.07,432.29c-.06.2-.11.4-.15.61-.18.84-.21,1.84-.2,2.86-.25.59-.51,1.18-.71,1.86-.16.05-.26.11-.37.15,0-1.68.06-3.33.25-4.83.03-.22.06-.45.11-.65.17-.01.33-.03.48-.05.21.02.4.03.58.04Z"/>
              <path className="cls-316" d="M492.28,431.73c-.08.18-.14.37-.2.56-.19-.01-.38-.02-.58-.04-.15.02-.32.04-.48.05.05-.2.1-.4.16-.57.17,0,.34,0,.5,0,.21,0,.41,0,.61,0Z"/>
              <path className="cls-461" d="M477.17,954.78c-.23.22-.46.43-.7.64-.32.28-.65.56-.98.83.26-.23.53-.49.79-.74.3-.24.59-.48.88-.72Z"/>
              <path className="cls-178" d="M478.35,953.63c-.16.17-.33.34-.5.5-.22.22-.45.44-.68.65-.29.24-.58.49-.88.72.26-.26.53-.52.79-.77.2-.19.38-.38.57-.58.23-.17.47-.34.7-.52Z"/>
              <path className="cls-610" d="M479.2,952.72c-.12.13-.24.26-.36.4-.16.17-.32.34-.49.51-.23.18-.46.35-.7.52.19-.2.37-.39.56-.59.15-.15.29-.31.43-.47.18-.12.37-.24.55-.37Z"/>
              <path className="cls-351" d="M479.8,952.05c-.08.09-.16.18-.24.28-.12.13-.24.26-.36.4-.18.13-.37.25-.55.37.14-.16.29-.32.43-.47.1-.1.19-.21.29-.32.15-.08.29-.17.44-.25Z"/>
              <path className="cls-616" d="M480.72,950.97c-.22.27-.45.54-.68.8-.08.09-.16.18-.24.28-.15.09-.29.17-.44.25.09-.11.19-.22.28-.32.23-.26.46-.53.68-.79.14-.08.27-.15.4-.22Z"/>
              <path className="cls-123" d="M482.96,948.05c-.5.71-1.03,1.41-1.59,2.11-.21.27-.43.54-.66.81-.13.07-.27.15-.4.22.22-.26.44-.54.65-.8.55-.68,1.07-1.36,1.56-2.05.15-.11.3-.22.43-.29Z"/>
              <path className="cls-391" d="M486.37,942.43c-.6,1.16-1.26,2.33-1.99,3.49-.45.71-.92,1.42-1.42,2.12-.14.07-.28.18-.43.29.49-.69.96-1.38,1.4-2.08.73-1.14,1.38-2.3,1.97-3.45.16-.16.32-.31.47-.39Z"/>
              <path className="cls-197" d="M489.46,934.9c-.42,1.33-.91,2.69-1.48,4.08-.47,1.14-1,2.29-1.6,3.45-.15.08-.31.23-.47.39.59-1.15,1.12-2.3,1.59-3.44.57-1.38,1.06-2.76,1.47-4.1.17-.15.34-.29.5-.38Z"/>
              <path className="cls-349" d="M490.76,929.78c-.08.41-.17.83-.27,1.25-.28,1.25-.63,2.55-1.04,3.88-.17.08-.33.22-.5.38.41-1.34.75-2.66,1.02-3.94.09-.43.18-.84.26-1.25.18-.12.36-.22.53-.31Z"/>
              <path className="cls-499" d="M491.21,927.17c-.07.46-.14.92-.22,1.39-.07.4-.15.8-.23,1.21-.17.09-.35.19-.53.31.08-.41.16-.81.22-1.22.08-.48.15-.95.21-1.44.19-.09.37-.18.55-.25Z"/>
              <path className="cls-136" d="M491.64,923.4c-.06.77-.14,1.58-.24,2.43-.05.44-.11.88-.18,1.34-.18.07-.36.16-.55.25.06-.48.12-.96.17-1.44.09-.81.17-1.62.23-2.37.2-.08.39-.15.57-.2Z"/>
              <path className="cls-290" d="M492.04,694.38c-.12,113.05-.23,221.17-.23,224.04,0,.81,0,1.77-.05,2.82-.03.67-.07,1.39-.13,2.16-.18.05-.37.12-.57.2.06-.76.1-1.49.13-2.16.04-.88.05-1.72.07-2.49.32-9.85.14-29.69.16-55.91.03-44.47.09-111.14.15-178.44.17,3.09.33,6.19.48,9.77Z"/>
              <path className="cls-608" d="M492.4,436.92c0,.87,0,1.9-.01,3.09-.07,20.54-.22,139.98-.34,254.37-.15-3.57-.31-6.67-.48-9.77.1-101.97.21-205.25.28-235.85,0-1.83.03-3.58.05-5.25.16-2.19.32-4.38.5-6.59Z"/>
              <path className="cls-139" d="M492.41,433.9c0,.31,0,.62,0,.92,0,.52,0,1.22,0,2.09-.18,2.21-.34,4.4-.5,6.59.01-1.67,0-3.26-.05-4.75-.04-.93-.1-1.97-.12-3,.25-.59.5-1.18.68-1.86Z"/>
              <path className="cls-372" d="M492.63,432.33c-.06.21-.11.43-.15.66-.05.3-.07.61-.07.92-.19.67-.43,1.26-.68,1.86-.01-1.02.02-2.02.2-2.86.04-.21.09-.42.15-.61.19.01.37.02.56.04Z"/>
              <path className="cls-159" d="M492.86,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
            </g>
            <g>
              <path className="cls-157" d="M492.86,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M492.86,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M492.86,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M492.86,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M492.86,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M492.86,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M492.86,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M492.86,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M492.86,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M492.86,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M492.86,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M492.86,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M492.86,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M492.86,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M492.86,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M492.86,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
            </g>
            <g>
              <path className="cls-157" d="M492.86,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M492.86,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M492.86,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M492.86,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M492.86,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M492.86,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M492.86,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M492.86,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M492.86,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M492.86,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M492.86,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M492.86,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M492.86,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M492.86,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
              <path className="cls-157" d="M492.86,431.73c-.09.19-.16.39-.23.6-.19-.02-.37-.03-.56-.04.06-.2.13-.38.2-.56.2,0,.39,0,.58,0Z"/>
            </g>
          </g>
        </g>
      </g>
    </g>
    {/* <g id="Layer_6" data-name="Layer 6">
      <g>
        <g>
          <path className="cls-150" d="M736.97,1017.93c0,2.35,5.16,24.87,7.55,24.87h592.34c2.38,0,7.8-21.57,7.8-23.94l-23.13-43.78c-.94-2.42-1.93-4.31-4.31-4.31h-553.83c-2.38,0-2.82,1.89-4.3,4.31l-22.12,42.84Z"/>
          <path className="cls-19" d="M758.43,1011.33c-.59,1.36.21,1.92,2.14,1.92h555.85c2.61.03,4.21-.23,3.5-1.92l-11.22-33.07c-.64-1.85-1.59-1.92-3.5-1.92h-531.23c-2.11.04-2.8.07-3.48,1.92l-12.06,33.07Z"/>
          <path className="cls-46" d="M767.87,1008.35c-.57,1.14.21,1.61,2.13,1.61h535.6c2.6.05,4.17-.19,3.47-1.61l-6.94-28.03c-.63-1.57-1.56-1.62-3.48-1.62h-518.16c-2.09.03-2.76.06-3.47,1.62l-9.14,28.03Z"/>
          <path className="cls-348" d="M740.04,1016.76h601.25c2.38,0,4.33,1.92,4.33,4.27v18.24c0,2.35-1.95,4.27-4.33,4.27h-601.25c-2.4,0-4.31-1.92-4.31-4.27v-18.24c0-2.35,1.91-4.27,4.31-4.27Z"/>
          <path className="cls-40" d="M1314.52,1031.13c-1.89-4.69-4.1-9.62-6.74-14.38h33.51c2.38,0,4.33,1.92,4.33,4.27v18.24c0,2.35-1.95,4.27-4.33,4.27h-22.97c-.91-4.24-2.21-8.42-3.8-12.41Z"/>
          <path className="cls-74" d="M740.04,1016.76h32.95c-2.05,1.59-3.89,3.6-5.38,6.13-3.5,5.97-3.78,14.14-.85,20.66h-26.72c-2.4,0-4.31-1.92-4.31-4.27v-18.24c0-2.35,1.91-4.27,4.31-4.27Z"/>
          <path className="cls-18" d="M736.97,1017.93v.09c.78-.78,1.86-1.26,3.07-1.26h601.25c1.08,0,2.07.41,2.81,1.08l-22.57-42.75c-.94-2.42-1.93-4.31-4.31-4.31h-553.83c-2.38,0-2.82,1.89-4.3,4.31l-22.12,42.84ZM759.72,976.41c.3-.46,1.07-2.5,1.31-2.93,1.01-1.81,2.55-2.35,3.53-2.35l551.68.3c1.26,0,2.96,1.55,3.98,4.15v.06s.06.07.06.07l18.89,40.7-598.62.11c-.05,0,19.17-40.12,19.17-40.12Z"/>
          <path className="cls-18" d="M736.97,1017.93v.09c.78-.78,1.86-1.26,3.07-1.26h601.25c1.08,0,2.07.41,2.81,1.08l-22.57-42.75c-.94-2.42-1.93-4.31-4.31-4.31h-553.83c-2.38,0-2.82,1.89-4.3,4.31l-22.12,42.84ZM759.21,975.82c.27-.47,1.17-2.42,1.42-2.85,1.01-1.83,2.95-1.83,3.94-1.83l552.2.06c1.27,0,2.93,1.32,3.95,3.93l.34.69,20.48,40.81-602.79-.04c-.06,0,20.46-40.77,20.46-40.77Z"/>
          <rect className="cls-9" x="1224.78" y="1016.76" width="106.56" height="26.79"/>
          <rect className="cls-4" x="1275.03" y="1016.76" width="49.24" height="26.79"/>
          <rect className="cls-7" x="752.39" y="1016.76" width="144.34" height="26.79"/>
          <rect className="cls-6" x="758.76" y="1016.76" width="103.29" height="26.79"/>
          <g className="cls-238">
            <path className="cls-119" d="M821.43,1039.27c0,1.12.95,2.02,2.12,2.02h430.73c1.18,0,2.14-.9,2.14-2.02h0c0-1.12-.95-2.03-2.14-2.03h-430.73c-1.17,0-2.12.91-2.12,2.03h0Z"/>
          </g>
          <g className="cls-318">
            <path className="cls-116" d="M738.31,1031.29c0,4.31,1.31,7.79,2.91,7.79h591.86c1.61,0,2.93-3.48,2.93-7.79h0c0-4.31-1.31-7.78-2.93-7.78h-591.86c-1.6,0-2.91,3.47-2.91,7.78h0Z"/>
          </g>
          <g className="cls-546">
            <path className="cls-120" d="M738.31,1024.66c0,.66,1.31,1.2,2.91,1.2h591.86c1.61,0,2.93-.54,2.93-1.2h0c0-.65-1.31-1.17-2.93-1.17h-591.86c-1.6,0-2.91.52-2.91,1.17h0Z"/>
          </g>
        </g>
        <g>
          <g>
            <g>
              <g>
                <path className="cls-574" d="M1141.09,495.65l-4.4,13.97.48.72c5.18-.42,10.3.23,15.45.94,2.03.29,4.12-1.66,6.26-1.64,2.36.02,4.45.79,6.9.39l.11-.04-4.55-14.35c0-1.15-4.53-2.1-10.14-2.1s-10.11.94-10.11,2.1Z"/>
                <path className="cls-457" d="M1151.21,506.79c8.09,0,14.65,1.33,14.65,2.99s-6.56,3.01-14.65,3.01-14.7-1.35-14.7-3.01c0-1.66,6.59-2.99,14.7-2.99Z"/>
                <path className="cls-79" d="M1151.4,507.11c6.7,0,12.12,1.34,12.12,3.03,0,1.65-5.42,3-12.12,3s-12.14-1.36-12.14-3c0-1.68,5.44-3.03,12.14-3.03Z"/>
              </g>
              <g>
                <path className="cls-486" d="M1141.09,510.35l-4.4,13.97.48.73c5.18-.39,10.3.2,15.45.95,2.03.3,4.12-1.65,6.26-1.64,2.36.02,4.45.78,6.9.37l.11-.02-4.55-14.36c0-1.16-4.53-2.1-10.14-2.1s-10.11.94-10.11,2.1Z"/>
                <path className="cls-450" d="M1151.21,521.49c8.09,0,14.65,1.33,14.65,2.99,0,1.66-6.56,3-14.65,3s-14.7-1.34-14.7-3c0-1.67,6.59-2.99,14.7-2.99Z"/>
                <path className="cls-52" d="M1151.75,521.98c6.76,0,12.26,1.11,12.26,2.5s-5.51,2.53-12.26,2.53-12.26-1.13-12.26-2.53c0-1.39,5.5-2.5,12.26-2.5Z"/>
              </g>
              <path className="cls-356" d="M1140.86,525.19l-4.47,13.97,1.74,2.58,19.88.59,8.02-2.78-4.62-14.37c0-1.15-4.6-2.1-10.27-2.1-5.66,0-10.28.94-10.28,2.1Z"/>
              <path className="cls-598" d="M1136.33,539.56v419.48s29.78,0,29.78,0v-419.48s-1.55-3-15.13-3c-8.08,0-14.65,1.35-14.65,3Z"/>
            </g>
            <path className="cls-357" d="M1172.54,990.8s-3.48,3.7-21.87,3.7-21.03-3.7-21.03-3.7v-27.39s4.83-6.01,4.83-6.01h.08c-.08,0,7.26,1.64,16.25,1.64s16.3-1.64,16.3-1.64l5.45,5.89v27.52Z"/>
            <path className="cls-5" d="M1134.54,957.4h-.08s-4.78,5.93-4.78,5.93c0,0,4.18,2.47,21.88,2.47,17.71,0,20.97-2.51,20.97-2.51l-5.45-5.89h0s-7.28,1.64-16.3,1.64-16.33-1.64-16.25-1.64Z"/>
          </g>
          <g className="cls-525">
            <path className="cls-25" d="M1142.5,494.57c-.7.22-1.15.51-1.33.81v12.19c.44-.06.9-.14,1.33-.22v-12.78Z"/>
            <path className="cls-25" d="M1146.27,493.82c.04,3.76.04,8.16.04,13.12,1.54-.1,3.15-.15,4.89-.15h.2s0-13.23,0-13.23h-.2c-1.76,0-3.44.08-4.93.26Z"/>
            <path className="cls-25" d="M1146.31,508.52c0,4.07,0,8.47.03,13.14,1.51-.11,3.16-.17,4.86-.17h.2s0-13.24,0-13.24h-.2c-1.76,0-3.44.1-4.89.26Z"/>
            <path className="cls-25" d="M1142.5,509.28c-.7.25-1.15.54-1.33.83v12.2c.44-.11.9-.15,1.33-.22v-12.81Z"/>
            <path className="cls-25" d="M1146.38,965.82c0,9.43,0,23.87-.04,28.69,1.68-.12,3.39.14,5.06,0v-28.72h-.75c-1.44,0-2.89.02-4.27.03Z"/>
            <path className="cls-25" d="M1141.17,965.45v28.65c.44-.03.9.1,1.33.05v-28.74c-.43,0-.89.02-1.33.03Z"/>
            <path className="cls-25" d="M1142.5,524.06c-.6.19-1.06.42-1.33.66v431.96c.44-.02.9-.03,1.33-.05v-432.57Z"/>
            <path className="cls-25" d="M1146.34,523.32c0,33.13.06,404.34.04,435.71,1.41-.02,4.82,0,5.02,0v-435.94h-.26c-1.74,0-3.38.07-4.8.23Z"/>
          </g>
        </g>
        <g>
          <g>
            <rect className="cls-174" x="1141.3" y="535.14" width="19.73" height="4.33"/>
            <polygon className="cls-273" points="1131.43 534.38 1141.3 539.46 1141.3 535.14 1131.43 530.05 1131.43 534.38"/>
            <polygon className="cls-185" points="1171 534.38 1161.03 539.46 1161.03 535.14 1171 530.05 1171 534.38"/>
          </g>
          <polygon className="cls-107" points="1161.11 524.96 1141.3 524.96 1131.43 530.05 1141.3 535.14 1161.11 535.14 1171 530.05 1161.11 524.96"/>
        </g>
        <path className="cls-15" d="M1148.16,520.22c1.15.59,2.43.9,3.8.9.77,0,1.52,0,2.29-.03v10.53c-1.43.1-2.94.17-4.53.17-.41,0-.83-.02-1.23-.02-.12-.02-.24-.02-.33-.02v-11.54Z"/>
        <g>
          <g>
            <path className="cls-441" d="M1166.68,478.79v10.32s-6.68,2.53-12.64,2.62c-5.93.06-10.61,4.9-10.61,14.39,0,9.5,4.16,15,10.02,15s12.41-.82,13.22-2.21v9.31c0,1.98-6.92,3.58-15.46,3.58-8.55,0-15.48-1.61-15.48-3.58v-49.42h30.94Z"/>
            <g>
              <path className="cls-297" d="M1157.24,502.03c0-4.21-1.55-7.91-3.91-10.27.23-.02.48-.04.71-.04,3.67-.05,7.61-1.01,10.1-1.78v26.95s-.47,1.95-7.94,1.95c-5.89,0-9.44-1.34-11.15-4.29.72.24,1.49.37,2.28.37,5.46,0,9.9-5.8,9.9-12.91Z"/>
              <path className="cls-289" d="M1144.22,512.59c-.01-.09-.04-.19-.06-.28-.47-1.82-.72-3.88-.72-6.19,0-9.11,4.31-13.91,9.89-14.35,2.36,2.36,3.91,6.06,3.91,10.27,0,7.11-4.45,12.91-9.9,12.91-.79,0-1.55-.14-2.28-.37-.29-.48-.55-1.01-.7-1.58-.05-.15-.1-.25-.14-.4Z"/>
              <path d="M1144.36,512.99c-.05-.15-.1-.25-.14-.4-.01-.09-.04-.19-.06-.28-.47-1.82-.72-3.88-.72-6.19,0-7.36,2.82-11.91,6.85-13.61,1.99,2.35,3.23,5.74,3.23,9.52,0,6.29-3.47,11.53-8.04,12.68-.14-.05-.29-.07-.42-.14-.29-.48-.55-1.01-.7-1.58Z"/>
            </g>
            <path className="cls-505" d="M1156.21,518.86c7.46,0,7.94-1.95,7.94-1.95,0,0,2.53.35,2.53,2-.81,1.4-7.35,2.21-13.22,2.21-4.27,0-7.62-2.91-9.1-8.13,1.31,4.06,4.99,5.87,11.86,5.87Z"/>
            <path className="cls-505" d="M1135.74,478.79c0,2,6.93,3.58,15.48,3.58s15.46-1.58,15.46-3.58c0-1.96-6.92-3.58-15.46-3.58s-15.48,1.62-15.48,3.58Z"/>
            <path className="cls-38" d="M1136.57,478.28c0,1.73,6.55,3.08,14.6,3.08s14.6-1.35,14.6-3.08c0-1.68-6.53-3.07-14.6-3.07s-14.6,1.39-14.6,3.07Z"/>
            <g>
              <path className="cls-561" d="M1165.05,218.75v258.25c0,1.66-6.2,2.97-13.83,2.97s-13.84-1.31-13.84-2.97V218.75h27.67Z"/>
              <path className="cls-392" d="M1158.13,210.4h10.79s-3.88,8.35-3.88,8.35c0,1.65-6.2,2.99-13.83,2.99s-13.84-1.34-13.84-2.99l-3.88-8.35h24.63Z"/>
              <path className="cls-337" d="M1133.53,182.33h35.37v27.82c.02.1.03.16.03.25,0,2.09-7.92,3.81-17.71,3.81-9.8,0-17.72-1.72-17.72-3.81,0-.09.02-.15.03-.25v-27.82Z"/>
              <path className="cls-15" d="M1160.34,213.75v-31.42h2.1v31.12s-2.1,7.8-2.1,7.8v257.99c-.65.13-1.35.26-2.07.34V221.39s2.07-7.64,2.07-7.64Z"/>
              <path className="cls-15" d="M1149.65,214.21v-31.88h8.62v31.63s-2.39,7.79-2.39,7.79v258.11h0c-1.27.08-2.63.12-4.04.12-.76,0-1.49,0-2.19-.01V221.74s0-7.53,0-7.53Z"/>
              <path className="cls-22" d="M1133.53,210.15v-27.82h7.73v31.19s2.7,7.77,2.7,7.77v258.26c-3.94-.53-6.58-1.48-6.58-2.55V218.75h0l-3.53-7.6c-.25-.25-.35-.5-.35-.76s.02-.15.03-.25Z"/>
              <path className="cls-296" d="M1133.5,182.12c0,2.12,7.92,3.81,17.72,3.81s17.71-1.69,17.71-3.81c0-2.1-7.92-3.8-17.71-3.8s-17.72,1.7-17.72,3.8Z"/>
              <path className="cls-22" d="M1136.76,181.37c0,1.43,6.43,2.6,14.4,2.6s14.41-1.17,14.41-2.6-6.44-2.58-14.41-2.58-14.4,1.15-14.4,2.58Z"/>
              <path className="cls-312" d="M1136.76,181.67c0,1.45,6.43,2.61,14.4,2.61,7.97,0,14.41-1.16,14.41-2.61,0-1.42-6.44-2.58-14.41-2.58s-14.4,1.17-14.4,2.58Z"/>
              <path className="cls-60" d="M1138.23,182.82c2.34-.85,7.26-1.45,12.93-1.45s10.59.59,12.94,1.45c-2.35.87-7.27,1.46-12.94,1.46s-10.59-.6-12.93-1.46Z"/>
            </g>
          </g>
          <path className="cls-12" d="M1135.72,528.21v-49.27s.01.02.01.02c.28,1.31,3.52,2.41,8.2,2.99h.03v.42s0,18.68,0,18.68c-.35,1.5-.53,3.2-.53,5.06,0,1.98.18,3.78.53,5.4v19.86c-4.91-.62-8.24-1.81-8.24-3.17Z"/>
          <path className="cls-15" d="M1155.73,491.64c-.57.04-1.12.05-1.69.09-1.59.02-3.09.38-4.42,1.08v-10.43h.42c.38,0,.75,0,1.15,0,1.58,0,3.09-.04,4.53-.15h0v9.42Z"/>
          <path className="cls-15" d="M1158.25,481.99s.05,0,.07-.03c.69-.08,1.36-.16,1.98-.27h.04v9.25c-.67.12-1.38.27-2.09.38v-9.34Z"/>
        </g>
        <path className="cls-15" d="M1150.17,520.93c.71-.03,1.4-.09,2.08-.18v10.34h-.07c-.36.07-2.01.3-2.01.3v-10.46Z"/>
        <g>
          <g>
            <path className="cls-510" d="M1213.55,513.68h-253.76c-1.31,0-2.36-4.93-2.36-11.01s1.05-11.01,2.36-11.01h253.76v22.02Z"/>
            <path className="cls-208" d="M1220.2,508.19v8.59s-6.65-3.1-6.65-3.1c-1.31,0-2.38-4.93-2.38-11.01,0-6.08,1.06-11.01,2.38-11.01l6.65-3.09v19.61Z"/>
            <path className="cls-353" d="M1242.54,488.6v28.15h-22.15c-.07.01-.12.03-.19.03-1.67,0-3.04-6.31-3.04-14.1,0-7.79,1.37-14.1,3.04-14.1.07,0,.12.01.19.03h22.15Z"/>
            <path className="cls-15" d="M1217.52,509.93h25.02v1.68h-24.77s-6.21-1.68-6.21-1.68h-253.55c-.09-.51-.2-1.07-.27-1.64h253.71s6.08,1.64,6.08,1.64Z"/>
            <path className="cls-15" d="M1217.16,501.43h25.38v6.86h-25.17s-6.2-1.91-6.2-1.91h-253.65c-.07-1-.1-2.1-.1-3.21,0-.61,0-1.18.01-1.74h253.73s5.99,0,5.99,0Z"/>
            <path className="cls-22" d="M1220.39,488.6h22.15v6.14h-24.83s-6.18,2.15-6.18,2.15h-253.78c.42-3.13,1.19-5.24,2.03-5.24h253.76s6.04-2.81,6.04-2.81c.2-.19.4-.28.61-.28.07,0,.12.01.19.03Z"/>
            <path className="cls-239" d="M1242.71,488.57c-1.69,0-3.04,6.31-3.04,14.1s1.35,14.1,3.04,14.1,3.02-6.31,3.02-14.1c0-7.79-1.35-14.1-3.02-14.1Z"/>
            <path className="cls-22" d="M1243.3,491.17c-1.13,0-2.06,5.12-2.06,11.46,0,6.34.93,11.47,2.06,11.47s2.06-5.12,2.06-11.47c0-6.34-.91-11.46-2.06-11.46Z"/>
            <path className="cls-294" d="M1243.06,491.17c-1.15,0-2.07,5.12-2.07,11.46,0,6.34.92,11.47,2.07,11.47s2.06-5.12,2.06-11.47c0-6.34-.93-11.46-2.06-11.46Z"/>
            <path className="cls-62" d="M1242.16,492.34c.67,1.86,1.15,5.77,1.15,10.29,0,4.51-.47,8.42-1.15,10.3-.69-1.88-1.17-5.78-1.17-10.3,0-4.52.47-8.44,1.17-10.29Z"/>
            <path className="cls-181" d="M1213.55,513.68h-253.76c-1.31,0-2.36-4.93-2.36-11.01s1.05-11.01,2.36-11.01h253.76v22.02Z"/>
            <path className="cls-563" d="M1220.2,508.19v8.59s-6.65-3.1-6.65-3.1c-1.31,0-2.38-4.93-2.38-11.01,0-6.08,1.06-11.01,2.38-11.01l6.65-3.09v19.61Z"/>
            <path className="cls-124" d="M1242.54,488.6v28.15h-22.15c-.07.01-.12.03-.19.03-1.67,0-3.04-6.31-3.04-14.1,0-7.79,1.37-14.1,3.04-14.1.07,0,.12.01.19.03h22.15Z"/>
            <path className="cls-15" d="M1217.52,509.93h25.02v1.68h-24.77s-6.21-1.68-6.21-1.68h-253.55c-.09-.51-.2-1.07-.27-1.64h253.71s6.08,1.64,6.08,1.64Z"/>
            <path className="cls-15" d="M1217.16,501.43h25.38v6.86h-25.17s-6.2-1.91-6.2-1.91h-253.65c-.07-1-.1-2.1-.1-3.21,0-.61,0-1.18.01-1.74h253.73s5.99,0,5.99,0Z"/>
            <path className="cls-22" d="M1220.22,488.51h22.15v6.14h-24.82s-6.19,2.15-6.19,2.15h-253.77c.42-3.13,1.18-5.24,2.03-5.24h253.76s6.04-2.81,6.04-2.81c.21-.19.4-.28.6-.28.08,0,.12.01.19.03Z"/>
            <path className="cls-22" d="M1216.98,488.66h22.15v6.15h-24.82s-6.19,2.15-6.19,2.15h-253.77c.43-3.13,1.19-5.24,2.03-5.24h253.76s6.05-2.8,6.05-2.8c.2-.19.4-.28.61-.28.07,0,.11.01.19.03Z"/>
            <path className="cls-173" d="M1242.71,488.57c-1.69,0-3.04,6.31-3.04,14.1s1.35,14.1,3.04,14.1,3.02-6.31,3.02-14.1c0-7.79-1.35-14.1-3.02-14.1Z"/>
            <path className="cls-22" d="M1243.3,491.17c-1.13,0-2.06,5.12-2.06,11.46,0,6.34.93,11.47,2.06,11.47s2.06-5.12,2.06-11.47c0-6.34-.91-11.46-2.06-11.46Z"/>
            <path className="cls-567" d="M1243.06,491.17c-1.15,0-2.07,5.12-2.07,11.46,0,6.34.92,11.47,2.07,11.47s2.06-5.12,2.06-11.47c0-6.34-.93-11.46-2.06-11.46Z"/>
            <path className="cls-71" d="M1242.16,492.34c.67,1.86,1.15,5.77,1.15,10.29,0,4.51-.47,8.42-1.15,10.3-.69-1.88-1.17-5.78-1.17-10.3,0-4.52.47-8.44,1.17-10.29Z"/>
          </g>
          <rect className="cls-56" x="969.87" y="491.57" width="11.18" height="22.11"/>
          <g>
            <rect className="cls-514" x="897.74" y="487.42" width="72.27" height="29.21"/>
            <rect className="cls-15" x="910.05" y="487.42" width="5.38" height="29.21"/>
            <rect className="cls-15" x="921.68" y="487.42" width="16.28" height="29.21"/>
            <rect className="cls-22" x="952.83" y="487.42" width="17.19" height="29.21"/>
            <rect className="cls-128" x="875.27" y="487.42" width="94.75" height="29.21"/>
            <rect className="cls-15" x="910.05" y="487.42" width="5.38" height="29.21"/>
            <rect className="cls-15" x="921.68" y="487.42" width="16.28" height="29.21"/>
            <rect className="cls-22" x="952.82" y="487.42" width="17.21" height="29.21"/>
          </g>
          <g>
            <path className="cls-270" d="M1126.84,528.15c-14.06-13.02-14.92-35-1.88-49.08,13.04-14.07,35.03-14.91,49.09-1.88,14.08,13.04,14.91,35.02,1.88,49.09-13.04,14.07-35.01,14.92-49.09,1.87Z"/>
            <g>
              <path className="cls-59" d="M1176.19,510.55l8.47-2.02c.06-.31.11-.63.14-.94l-8.82,2.1.21.86Z"/>
              <path className="cls-80" d="M1174.74,517.2l8.04-1.92c.14-.33.29-.67.39-1.01l-8.63,2.07.21.86Z"/>
              <path className="cls-33" d="M1171.77,523.8l7.48-1.78c.26-.38.53-.74.76-1.09l-8.45,2.02.21.85Z"/>
              <path className="cls-66" d="M1166.51,530.18l7.18-1.72c.43-.38.82-.79,1.23-1.19l-8.62,2.07.21.85Z"/>
              <path className="cls-39" d="M1158.3,534.25l.16.85,7.6-1.44c.69-.35,1.38-.69,2.05-1.09l-.04-.2-9.77,1.87Z"/>
              <path className="cls-48" d="M1143.91,536.76c.85.16,1.7.29,2.56.39l11.41-.56c1.32-.28,2.62-.63,3.9-1.07l-17.9.87.03.37Z"/>
              <path className="cls-82" d="M1176.19,503.97l8.95-1.79c-.01-.31.02-.6,0-.9l-9.12,1.82.17.88Z"/>
              <path className="cls-77" d="M1175.37,497.73l9.14-1.59c-.07-.3-.11-.59-.17-.87l-9.11,1.59.14.87Z"/>
              <path className="cls-47" d="M1173.8,492.16l9.24-1.42c-.12-.28-.22-.56-.34-.85l-9.02,1.39.13.87Z"/>
              <path className="cls-50" d="M1171.08,486.3l9.11-1.5c-.17-.27-.34-.53-.53-.82l-8.71,1.45.13.87Z"/>
              <path className="cls-75" d="M1165.76,479.63l9.16-1.53c-.24-.23-.47-.52-.74-.77l-8.57,1.43.15.87Z"/>
              <path className="cls-55" d="M1158.45,474.29l9.53-1.58c-.4-.25-.84-.45-1.27-.69l-8.4,1.39.14.87Z"/>
              <path className="cls-36" d="M1147.68,471.82l12.96-2.31c-.64-.21-1.27-.4-1.92-.56l-11.21,1.98.18.88Z"/>
            </g>
            <path className="cls-84" d="M1170.05,486.43c-2.28-6.6,3.08-9.99,7.29-6.29-.93-1.12-1.88-2.19-2.98-3.21-13.62-12.62-34.94-11.81-47.57,1.83-9.88,10.66-11.51,25.98-5.24,38.22l48.51-30.55Z"/>
            <g>
              <path className="cls-435" d="M1126.38,527.15c-13.55-12.56-14.37-33.75-1.82-47.29,12.56-13.55,33.75-14.36,47.3-1.8,13.56,12.55,14.36,33.73,1.81,47.29-12.56,13.55-33.74,14.36-47.29,1.81Z"/>
              <path className="cls-58" d="M1173.68,525.34c12.55-13.55,11.74-34.74-1.81-47.29-13.55-12.55-34.74-11.74-47.3,1.8-12.54,13.55-11.72,34.74,1.82,47.29,13.55,12.55,34.73,11.74,47.29-1.81ZM1125.06,480.1c12.43-13.42,33.39-14.22,46.8-1.79,13.43,12.44,14.24,33.39,1.81,46.81-12.44,13.43-33.41,14.23-46.84,1.8-13.41-12.43-14.22-33.39-1.78-46.82Z"/>
              <path className="cls-167" d="M1129.46,523.83c-11.73-10.86-12.42-29.18-1.56-40.89,10.85-11.73,29.17-12.44,40.89-1.57,11.73,10.85,12.42,29.18,1.57,40.9-10.87,11.72-29.18,12.42-40.9,1.57Z"/>
              <path className="cls-17" d="M1154.03,481.76c12.27,11.37,13.01,30.53,1.65,42.8-2.73,2.95-5.92,5.2-9.33,6.81,8.69.82,17.62-2.22,24.01-9.11,10.85-11.72,10.16-30.04-1.57-40.9-7.65-7.09-18.1-9.21-27.47-6.6,4.61,1.23,8.98,3.56,12.71,7Z"/>
              <path className="cls-31" d="M1167.84,481.72c11.73,10.86,12.43,29.16,1.57,40.89-3.18,3.43-7.02,5.89-11.15,7.44,4.46-1.5,8.65-4.08,12.1-7.79,10.85-11.72,10.16-30.04-1.57-40.9-8.29-7.68-19.84-9.54-29.76-5.87,9.7-3.21,20.79-1.21,28.81,6.23Z"/>
              <path className="cls-456" d="M1170.36,522.26c.12-.15.21-.29.33-.42-10.89,11.34-28.9,11.93-40.5,1.2-11.59-10.74-12.4-28.76-1.92-40.49-.12.13-.26.24-.38.38-10.86,11.72-10.16,30.03,1.56,40.89,11.72,10.85,30.03,10.16,40.9-1.57Z"/>
              <path className="cls-187" d="M1145.28,506.52c-2.17-2-2.28-5.39-.28-7.54,2-2.17,5.38-2.3,7.54-.3,2.16,2,2.3,5.39.29,7.56-2,2.16-5.39,2.3-7.55.29Z"/>
              <g>
                <path className="cls-170" d="M1146.09,505.94c-1.85-1.71-1.95-4.61-.24-6.45,1.7-1.85,4.59-1.96,6.45-.24,1.83,1.7,1.94,4.59.25,6.43-1.71,1.85-4.6,1.96-6.45.26Z"/>
                <path className="cls-115" d="M1153.64,503.62s-4.17.11-8.75-2.51c0,0,3.89,3.92,8.75,2.51Z"/>
                <path className="cls-100" d="M1149.85,498.56c-3.3-.7-4.13,2.45-4.13,2.45,0,0,4.3,2.32,7.49,2.21,0,0,.54-3.83-3.37-4.66Z"/>
                <path className="cls-97" d="M1148.36,506.72c3.2.8,4.71-2.5,4.71-2.5,0,0-3.94,1.09-7.78-2.34,0,0-.61,3.95,3.07,4.84Z"/>
              </g>
            </g>
          </g>
        </g>
      </g>
      <g>
        <g>
          <path className="cls-142" d="M632.06,1020.27c0,2.35-5.16,24.87-7.55,24.87H32.17c-2.38,0-7.8-21.57-7.8-23.94l23.13-43.78c.94-2.42,1.93-4.31,4.31-4.31h553.83c2.38,0,2.82,1.89,4.3,4.31l22.12,42.84Z"/>
          <path className="cls-16" d="M610.61,1013.67c.59,1.36-.21,1.92-2.14,1.92H52.61c-2.61.03-4.21-.23-3.5-1.92l11.22-33.07c.64-1.85,1.59-1.92,3.5-1.92h531.23c2.11.04,2.8.07,3.48,1.92l12.06,33.07Z"/>
          <path className="cls-70" d="M601.16,1010.68c.57,1.14-.21,1.61-2.13,1.61H63.43c-2.6.05-4.17-.19-3.47-1.61l6.94-28.03c.63-1.57,1.56-1.62,3.48-1.62h518.16c2.09.03,2.76.06,3.47,1.62l9.14,28.03Z"/>
          <path className="cls-324" d="M628.99,1019.09H27.75c-2.38,0-4.33,1.92-4.33,4.27v18.24c0,2.35,1.95,4.27,4.33,4.27h601.25c2.4,0,4.31-1.92,4.31-4.27v-18.24c0-2.35-1.91-4.27-4.31-4.27Z"/>
          <path className="cls-69" d="M54.51,1033.47c1.89-4.69,4.1-9.62,6.74-14.38H27.75c-2.38,0-4.33,1.92-4.33,4.27v18.24c0,2.35,1.95,4.27,4.33,4.27h22.97c.91-4.24,2.21-8.42,3.8-12.41Z"/>
          <path className="cls-45" d="M628.99,1019.09h-32.95c2.05,1.59,3.89,3.6,5.38,6.13,3.5,5.97,3.78,14.14.85,20.66h26.72c2.4,0,4.31-1.92,4.31-4.27v-18.24c0-2.35-1.91-4.27-4.31-4.27Z"/>
          <path className="cls-18" d="M609.94,977.42c-1.47-2.42-1.92-4.31-4.3-4.31H51.81c-2.38,0-3.38,1.89-4.31,4.31l-22.57,42.75c.75-.67,1.73-1.08,2.81-1.08h601.25c1.21,0,2.29.48,3.07,1.26v-.09l-22.12-42.84ZM628.48,1018.87l-598.62-.11,18.89-40.7.05-.07v-.06c1.04-2.6,2.74-4.15,4-4.15l551.68-.3c.99,0,2.52.54,3.53,2.35.24.42,1.01,2.46,1.31,2.93,0,0,19.22,40.12,19.17,40.12Z"/>
          <path className="cls-18" d="M609.94,977.42c-1.47-2.42-1.92-4.31-4.3-4.31H51.81c-2.38,0-3.38,1.89-4.31,4.31l-22.57,42.75c.75-.67,1.73-1.08,2.81-1.08h601.25c1.21,0,2.29.48,3.07,1.26v-.09l-22.12-42.84ZM630.28,1018.92l-602.79.04,20.48-40.81.34-.69c1.01-2.62,2.67-3.93,3.95-3.93l552.2-.06c.99,0,2.94,0,3.94,1.83.25.43,1.14,2.39,1.42,2.85,0,0,20.52,40.77,20.46,40.77Z"/>
          <rect className="cls-13" x="37.69" y="1019.09" width="106.56" height="26.79"/>
          <rect className="cls-11" x="44.76" y="1019.09" width="49.24" height="26.79"/>
          <rect className="cls-8" x="472.3" y="1019.09" width="144.34" height="26.79"/>
          <rect className="cls-10" x="506.98" y="1019.09" width="103.29" height="26.79"/>
          <g className="cls-204">
            <path className="cls-118" d="M547.6,1041.61c0,1.12-.95,2.02-2.12,2.02H114.75c-1.18,0-2.14-.9-2.14-2.02h0c0-1.12.95-2.03,2.14-2.03h430.73c1.17,0,2.12.91,2.12,2.03h0Z"/>
          </g>
          <g className="cls-311">
            <path className="cls-117" d="M630.72,1033.62c0,4.31-1.31,7.79-2.91,7.79H35.95c-1.61,0-2.93-3.48-2.93-7.79h0c0-4.31,1.31-7.78,2.93-7.78h591.86c1.6,0,2.91,3.47,2.91,7.78h0Z"/>
          </g>
          <g className="cls-202">
            <path className="cls-121" d="M630.72,1027c0,.66-1.31,1.2-2.91,1.2H35.95c-1.61,0-2.93-.54-2.93-1.2h0c0-.65,1.31-1.17,2.93-1.17h591.86c1.6,0,2.91.52,2.91,1.17h0Z"/>
          </g>
        </g>
        <g>
          <g>
            <g>
              <g>
                <path className="cls-540" d="M227.94,497.99l4.4,13.97-.48.72c-5.18-.42-10.3.23-15.45.94-2.03.29-4.12-1.66-6.26-1.64-2.36.02-4.45.79-6.9.39l-.11-.04,4.55-14.35c0-1.15,4.53-2.1,10.14-2.1s10.11.94,10.11,2.1Z"/>
                <path className="cls-521" d="M217.83,509.13c-8.09,0-14.65,1.33-14.65,2.99s6.56,3.01,14.65,3.01,14.7-1.35,14.7-3.01-6.59-2.99-14.7-2.99Z"/>
                <path className="cls-61" d="M217.63,509.44c-6.7,0-12.12,1.34-12.12,3.03s5.42,3,12.12,3,12.14-1.36,12.14-3-5.44-3.03-12.14-3.03Z"/>
              </g>
              <g>
                <path className="cls-156" d="M227.94,512.69l4.4,13.97-.48.73c-5.18-.39-10.3.2-15.45.95-2.03.3-4.12-1.65-6.26-1.64-2.36.02-4.45.78-6.9.37l-.11-.02,4.55-14.36c0-1.16,4.53-2.1,10.14-2.1s10.11.94,10.11,2.1Z"/>
                <path className="cls-421" d="M217.83,523.82c-8.09,0-14.65,1.33-14.65,2.99s6.56,3,14.65,3,14.7-1.34,14.7-3-6.59-2.99-14.7-2.99Z"/>
                <path className="cls-87" d="M217.28,524.32c-6.76,0-12.26,1.11-12.26,2.5s5.51,2.53,12.26,2.53,12.26-1.13,12.26-2.53-5.5-2.5-12.26-2.5Z"/>
              </g>
              <path className="cls-390" d="M228.17,527.53l4.47,13.97-1.74,2.58-19.88.59-8.02-2.78,4.62-14.37c0-1.15,4.6-2.1,10.27-2.1s10.28.94,10.28,2.1Z"/>
              <path className="cls-355" d="M232.7,541.9v419.48h-29.78v-419.48s1.55-3,15.13-3c8.08,0,14.65,1.35,14.65,3Z"/>
            </g>
            <path className="cls-389" d="M196.49,993.14s3.48,3.7,21.87,3.7,21.03-3.7,21.03-3.7v-27.39l-4.83-6.01h-.08c.08,0-7.26,1.64-16.25,1.64s-16.3-1.64-16.3-1.64l-5.45,5.89v27.52Z"/>
            <path className="cls-5" d="M234.49,959.73h.08l4.78,5.93s-4.18,2.47-21.88,2.47-20.97-2.51-20.97-2.51l5.45-5.89h0s7.28,1.64,16.3,1.64,16.33-1.64,16.25-1.64Z"/>
          </g>
          <g className="cls-525">
            <path className="cls-25" d="M226.53,496.91c.7.22,1.15.51,1.33.81v12.19c-.44-.06-.9-.14-1.33-.22v-12.78Z"/>
            <path className="cls-25" d="M222.76,496.16c-.04,3.76-.04,8.16-.04,13.12-1.54-.1-3.15-.15-4.89-.15h-.2v-13.23h.2c1.76,0,3.44.08,4.93.26Z"/>
            <path className="cls-25" d="M222.72,510.85c0,4.07,0,8.47-.03,13.14-1.51-.11-3.16-.17-4.86-.17h-.2v-13.24h.2c1.76,0,3.44.1,4.89.26Z"/>
            <path className="cls-25" d="M226.53,511.61c.7.25,1.15.54,1.33.83v12.2c-.44-.11-.9-.15-1.33-.22v-12.81Z"/>
            <path className="cls-25" d="M222.65,968.16c0,9.43,0,23.87.04,28.69-1.68-.12-3.39.14-5.06,0v-28.72h.75c1.44,0,2.89.02,4.27.03Z"/>
            <path className="cls-25" d="M227.86,967.79v28.65c-.44-.03-.9.1-1.33.05v-28.74c.43,0,.89.02,1.33.03Z"/>
            <path className="cls-25" d="M226.53,526.39c.6.19,1.06.42,1.33.66v431.96c-.44-.02-.9-.03-1.33-.05v-432.57Z"/>
            <path className="cls-25" d="M222.69,525.66c0,33.13-.06,404.34-.04,435.71-1.41-.02-4.82,0-5.02,0v-435.94h.26c1.74,0,3.38.07,4.8.23Z"/>
          </g>
        </g>
        <g>
          <g>
            <rect className="cls-145" x="208" y="537.47" width="19.73" height="4.33"/>
            <polygon className="cls-360" points="237.6 536.72 227.73 541.8 227.73 537.47 237.6 532.39 237.6 536.72"/>
            <polygon className="cls-147" points="198.04 536.72 208 541.8 208 537.47 198.04 532.39 198.04 536.72"/>
          </g>
          <polygon className="cls-334" points="207.92 527.3 227.73 527.3 237.6 532.39 227.73 537.47 207.92 537.47 198.04 532.39 207.92 527.3"/>
        </g>
        <path className="cls-15" d="M220.87,522.55c-1.15.59-2.43.9-3.8.9-.77,0-1.52,0-2.29-.03v10.53c1.43.1,2.94.17,4.53.17.41,0,.83-.02,1.23-.02.12-.02.24-.02.33-.02v-11.54Z"/>
        <g>
          <g>
            <path className="cls-280" d="M202.35,481.13v10.32s6.68,2.53,12.64,2.62c5.93.06,10.61,4.9,10.61,14.39s-4.16,15-10.02,15-12.41-.82-13.22-2.21v9.31c0,1.98,6.92,3.58,15.46,3.58s15.48-1.61,15.48-3.58v-49.42h-30.94Z"/>
            <g>
              <path className="cls-522" d="M211.79,504.37c0-4.21,1.55-7.91,3.91-10.27-.23-.02-.48-.04-.71-.04-3.67-.05-7.61-1.01-10.1-1.78v26.95s.47,1.95,7.94,1.95c5.89,0,9.44-1.34,11.15-4.29-.72.24-1.49.37-2.28.37-5.46,0-9.9-5.8-9.9-12.91Z"/>
              <path className="cls-289" d="M224.82,514.93c.01-.09.04-.19.06-.28.47-1.82.72-3.88.72-6.19,0-9.11-4.31-13.91-9.89-14.35-2.36,2.36-3.91,6.06-3.91,10.27,0,7.11,4.45,12.91,9.9,12.91.79,0,1.55-.14,2.28-.37.29-.48.55-1.01.7-1.58.05-.15.1-.25.14-.4Z"/>
              <path d="M224.67,515.33c.05-.15.1-.25.14-.4.01-.09.04-.19.06-.28.47-1.82.72-3.88.72-6.19,0-7.36-2.82-11.91-6.85-13.61-1.99,2.35-3.23,5.74-3.23,9.52,0,6.29,3.47,11.53,8.04,12.68.14-.05.29-.07.42-.14.29-.48.55-1.01.7-1.58Z"/>
            </g>
            <path className="cls-505" d="M212.82,521.2c-7.46,0-7.94-1.95-7.94-1.95,0,0-2.53.35-2.53,2,.81,1.4,7.35,2.21,13.22,2.21,4.27,0,7.62-2.91,9.1-8.13-1.31,4.06-4.99,5.87-11.86,5.87Z"/>
            <path className="cls-505" d="M233.29,481.13c0,2-6.93,3.58-15.48,3.58s-15.46-1.58-15.46-3.58,6.92-3.58,15.46-3.58,15.48,1.62,15.48,3.58Z"/>
            <path className="cls-43" d="M232.46,480.61c0,1.73-6.55,3.08-14.6,3.08s-14.6-1.35-14.6-3.08,6.53-3.07,14.6-3.07,14.6,1.39,14.6,3.07Z"/>
            <g>
              <path className="cls-153" d="M203.99,221.09v258.25c0,1.66,6.2,2.97,13.83,2.97s13.84-1.31,13.84-2.97V221.09h-27.67Z"/>
              <path className="cls-487" d="M210.9,212.74h-10.79l3.88,8.35c0,1.65,6.2,2.99,13.83,2.99s13.84-1.34,13.84-2.99l3.88-8.35h-24.63Z"/>
              <path className="cls-558" d="M235.5,184.67h-35.37v27.82c-.02.1-.03.16-.03.25,0,2.09,7.92,3.81,17.71,3.81s17.72-1.72,17.72-3.81c0-.09-.02-.15-.03-.25v-27.82Z"/>
              <path className="cls-15" d="M208.69,216.09v-31.42h-2.1v31.12l2.1,7.8v257.99c.65.13,1.35.26,2.07.34V223.73l-2.07-7.64Z"/>
              <path className="cls-15" d="M219.38,216.55v-31.88h-8.62v31.63l2.39,7.79v258.11h0c1.27.08,2.63.12,4.04.12.76,0,1.49,0,2.19-.01V216.55Z"/>
              <path className="cls-22" d="M235.5,212.49v-27.82h-7.73v31.19l-2.7,7.77v258.26c3.94-.53,6.58-1.48,6.58-2.55V221.09h0l3.53-7.6c.25-.25.35-.5.35-.76,0-.09-.02-.15-.03-.25Z"/>
              <path className="cls-407" d="M235.53,184.45c0,2.12-7.92,3.81-17.72,3.81s-17.71-1.69-17.71-3.81,7.92-3.8,17.71-3.8,17.72,1.7,17.72,3.8Z"/>
              <path className="cls-22" d="M232.28,183.7c0,1.43-6.43,2.6-14.4,2.6s-14.41-1.17-14.41-2.6,6.44-2.58,14.41-2.58,14.4,1.15,14.4,2.58Z"/>
              <path className="cls-226" d="M232.28,184.01c0,1.45-6.43,2.61-14.4,2.61s-14.41-1.16-14.41-2.61,6.44-2.58,14.41-2.58,14.4,1.17,14.4,2.58Z"/>
              <path className="cls-65" d="M230.8,185.15c-2.34-.85-7.26-1.45-12.93-1.45s-10.59.59-12.94,1.45c2.35.87,7.27,1.46,12.94,1.46s10.59-.6,12.93-1.46Z"/>
            </g>
          </g>
          <path className="cls-12" d="M233.31,530.55v-49.27s-.01.02-.01.02c-.28,1.31-3.52,2.41-8.2,2.99h-.03v19.1c.35,1.5.53,3.2.53,5.06,0,1.98-.18,3.78-.53,5.4v19.86c4.91-.62,8.24-1.81,8.24-3.17Z"/>
          <path className="cls-15" d="M213.3,493.98c.57.04,1.12.05,1.69.09,1.59.02,3.09.38,4.42,1.08v-10.43h-1.57c-1.58,0-3.09-.04-4.53-.15h0v9.42Z"/>
          <path className="cls-15" d="M210.78,484.33s-.05,0-.07-.03c-.69-.08-1.36-.16-1.98-.27h-.04v9.25c.67.12,1.38.27,2.09.38v-9.34Z"/>
        </g>
        <path className="cls-15" d="M218.86,523.26c-.71-.03-1.4-.09-2.08-.18v10.34h.07c.36.07,2.01.3,2.01.3v-10.46Z"/>
        <g>
          <g>
            <path className="cls-472" d="M155.48,516.02h253.76c1.31,0,2.36-4.93,2.36-11.01s-1.05-11.01-2.36-11.01h-253.76v22.02Z"/>
            <path className="cls-506" d="M148.83,510.52v8.59l6.65-3.1c1.31,0,2.38-4.93,2.38-11.01s-1.06-11.01-2.38-11.01l-6.65-3.09v19.61Z"/>
            <path className="cls-452" d="M126.49,490.94v28.15h22.15c.07.01.12.03.19.03,1.67,0,3.04-6.31,3.04-14.1s-1.37-14.1-3.04-14.1c-.07,0-.12.01-.19.03h-22.15Z"/>
            <path className="cls-15" d="M151.51,512.27h-25.02v1.68h24.77l6.21-1.68h253.55c.09-.51.2-1.07.27-1.64h-253.71l-6.08,1.64Z"/>
            <path className="cls-15" d="M151.87,503.77h-25.38v6.86h25.17l6.2-1.91h253.65c.07-1,.1-2.1.1-3.21,0-.61,0-1.18-.01-1.74H151.87Z"/>
            <path className="cls-22" d="M148.64,490.94h-22.15v6.14h24.83l6.18,2.15h253.78c-.42-3.13-1.19-5.24-2.03-5.24h-253.76l-6.04-2.81c-.2-.19-.4-.28-.61-.28-.07,0-.12.01-.19.03Z"/>
            <path className="cls-103" d="M126.32,490.91c1.69,0,3.04,6.31,3.04,14.1s-1.35,14.1-3.04,14.1-3.02-6.31-3.02-14.1,1.35-14.1,3.02-14.1Z"/>
            <path className="cls-22" d="M125.73,493.51c1.13,0,2.06,5.12,2.06,11.46s-.93,11.47-2.06,11.47-2.06-5.12-2.06-11.47.91-11.46,2.06-11.46Z"/>
            <path className="cls-245" d="M125.97,493.51c1.15,0,2.07,5.12,2.07,11.46s-.92,11.47-2.07,11.47-2.06-5.12-2.06-11.47.93-11.46,2.06-11.46Z"/>
            <path className="cls-85" d="M126.88,494.68c-.67,1.86-1.15,5.77-1.15,10.29s.47,8.42,1.15,10.3c.69-1.88,1.17-5.78,1.17-10.3s-.47-8.44-1.17-10.29Z"/>
            <path className="cls-485" d="M155.48,516.02h253.76c1.31,0,2.36-4.93,2.36-11.01s-1.05-11.01-2.36-11.01h-253.76v22.02Z"/>
            <path className="cls-320" d="M148.83,510.52v8.59l6.65-3.1c1.31,0,2.38-4.93,2.38-11.01s-1.06-11.01-2.38-11.01l-6.65-3.09v19.61Z"/>
            <path className="cls-416" d="M126.49,490.94v28.15h22.15c.07.01.12.03.19.03,1.67,0,3.04-6.31,3.04-14.1s-1.37-14.1-3.04-14.1c-.07,0-.12.01-.19.03h-22.15Z"/>
            <path className="cls-15" d="M151.51,512.27h-25.02v1.68h24.77l6.21-1.68h253.55c.09-.51.2-1.07.27-1.64h-253.71l-6.08,1.64Z"/>
            <path className="cls-15" d="M151.87,503.77h-25.38v6.86h25.17l6.2-1.91h253.65c.07-1,.1-2.1.1-3.21,0-.61,0-1.18-.01-1.74H151.87Z"/>
            <path className="cls-22" d="M148.81,490.85h-22.15v6.14h24.82l6.19,2.15h253.77c-.42-3.13-1.18-5.24-2.03-5.24h-253.76l-6.04-2.81c-.21-.19-.4-.28-.6-.28-.08,0-.12.01-.19.03Z"/>
            <path className="cls-22" d="M152.05,490.99h-22.15v6.15h24.82l6.19,2.15h253.77c-.43-3.13-1.19-5.24-2.03-5.24h-253.76l-6.05-2.8c-.2-.19-.4-.28-.61-.28-.07,0-.11.01-.19.03Z"/>
            <path className="cls-577" d="M126.32,490.91c1.69,0,3.04,6.31,3.04,14.1s-1.35,14.1-3.04,14.1-3.02-6.31-3.02-14.1,1.35-14.1,3.02-14.1Z"/>
            <path className="cls-22" d="M125.73,493.51c1.13,0,2.06,5.12,2.06,11.46s-.93,11.47-2.06,11.47-2.06-5.12-2.06-11.47.91-11.46,2.06-11.46Z"/>
            <path className="cls-260" d="M125.97,493.51c1.15,0,2.07,5.12,2.07,11.46s-.92,11.47-2.07,11.47-2.06-5.12-2.06-11.47.93-11.46,2.06-11.46Z"/>
            <path className="cls-32" d="M126.88,494.68c-.67,1.86-1.15,5.77-1.15,10.29s.47,8.42,1.15,10.3c.69-1.88,1.17-5.78,1.17-10.3s-.47-8.44-1.17-10.29Z"/>
          </g>
          <rect className="cls-54" x="387.97" y="493.91" width="11.18" height="22.11"/>
          <g>
            <rect className="cls-250" x="399.01" y="489.76" width="72.27" height="29.21"/>
            <rect className="cls-15" x="453.6" y="489.76" width="5.38" height="29.21"/>
            <rect className="cls-15" x="431.07" y="489.76" width="16.28" height="29.21"/>
            <rect className="cls-22" x="399.01" y="489.76" width="17.19" height="29.21"/>
            <rect className="cls-541" x="399.01" y="489.76" width="94.75" height="29.21"/>
            <rect className="cls-15" x="453.6" y="489.76" width="5.38" height="29.21"/>
            <rect className="cls-15" x="431.07" y="489.76" width="16.28" height="29.21"/>
            <rect className="cls-22" x="399.01" y="489.76" width="17.21" height="29.21"/>
          </g>
          <g>
            <path className="cls-606" d="M242.19,530.49c14.06-13.02,14.92-35,1.88-49.08-13.04-14.07-35.03-14.91-49.09-1.88-14.08,13.04-14.91,35.02-1.88,49.09,13.04,14.07,35.01,14.92,49.09,1.87Z"/>
            <g>
              <path className="cls-49" d="M192.84,512.89l-8.47-2.02c-.06-.31-.11-.63-.14-.94l8.82,2.1-.21.86Z"/>
              <path className="cls-76" d="M194.29,519.54l-8.04-1.92c-.14-.33-.29-.67-.39-1.01l8.63,2.07-.21.86Z"/>
              <path className="cls-78" d="M197.26,526.14l-7.48-1.78c-.26-.38-.53-.74-.76-1.09l8.45,2.02-.21.85Z"/>
              <path className="cls-44" d="M202.52,532.52l-7.18-1.72c-.43-.38-.82-.79-1.23-1.19l8.62,2.07-.21.85Z"/>
              <path className="cls-34" d="M210.73,536.59l-.16.85-7.6-1.44c-.69-.35-1.38-.69-2.05-1.09l.04-.2,9.77,1.87Z"/>
              <path className="cls-35" d="M225.12,539.09c-.85.16-1.7.29-2.56.39l-11.41-.56c-1.32-.28-2.62-.63-3.9-1.07l17.9.87-.03.37Z"/>
              <path className="cls-72" d="M192.84,506.31l-8.95-1.79c.01-.31-.02-.6,0-.9l9.12,1.82-.17.88Z"/>
              <path className="cls-88" d="M193.66,500.07l-9.14-1.59c.07-.3.11-.59.17-.87l9.11,1.59-.14.87Z"/>
              <path className="cls-81" d="M195.23,494.5l-9.24-1.42c.12-.28.22-.56.34-.85l9.02,1.39-.13.87Z"/>
              <path className="cls-83" d="M197.95,488.63l-9.11-1.5c.17-.27.34-.53.53-.82l8.71,1.45-.13.87Z"/>
              <path className="cls-57" d="M203.27,481.96l-9.16-1.53c.24-.23.47-.52.74-.77l8.57,1.43-.15.87Z"/>
              <path className="cls-89" d="M210.59,476.63l-9.53-1.58c.4-.25.84-.45,1.27-.69l8.4,1.39-.14.87Z"/>
              <path className="cls-68" d="M221.35,474.16l-12.96-2.31c.64-.21,1.27-.4,1.92-.56l11.21,1.98-.18.88Z"/>
            </g>
            <path className="cls-64" d="M198.98,488.76c2.28-6.6-3.08-9.99-7.29-6.29.93-1.12,1.88-2.19,2.98-3.21,13.62-12.62,34.94-11.81,47.57,1.83,9.88,10.66,11.51,25.98,5.24,38.22l-48.51-30.55Z"/>
            <g>
              <path className="cls-565" d="M242.65,529.48c13.55-12.56,14.37-33.75,1.82-47.29-12.56-13.55-33.75-14.36-47.3-1.8-13.56,12.55-14.36,33.73-1.81,47.29,12.56,13.55,33.74,14.36,47.29,1.81Z"/>
              <path className="cls-73" d="M242.65,529.48c13.55-12.56,14.37-33.75,1.82-47.29-12.56-13.55-33.75-14.36-47.3-1.8-13.56,12.55-14.36,33.73-1.81,47.29,12.56,13.55,33.74,14.36,47.29,1.81ZM242.19,529.26c-13.43,12.44-34.39,11.63-46.84-1.8-12.43-13.42-11.62-34.38,1.81-46.81,13.41-12.43,34.37-11.63,46.8,1.79,12.45,13.43,11.63,34.39-1.78,46.82Z"/>
              <path className="cls-91" d="M239.57,526.17c11.73-10.86,12.42-29.18,1.56-40.89-10.85-11.73-29.17-12.44-40.89-1.57-11.73,10.85-12.42,29.18-1.57,40.9,10.87,11.72,29.18,12.42,40.9,1.57Z"/>
              <path className="cls-20" d="M215,484.1c-12.27,11.37-13.01,30.53-1.65,42.8,2.73,2.95,5.92,5.2,9.33,6.81-8.69.82-17.62-2.22-24.01-9.11-10.85-11.72-10.16-30.04,1.57-40.9,7.65-7.09,18.1-9.21,27.47-6.6-4.61,1.23-8.98,3.56-12.71,7Z"/>
              <path className="cls-67" d="M201.19,484.06c-11.73,10.86-12.43,29.16-1.57,40.89,3.18,3.43,7.02,5.89,11.15,7.44-4.46-1.5-8.65-4.08-12.1-7.79-10.85-11.72-10.16-30.04,1.57-40.9,8.29-7.68,19.84-9.54,29.76-5.87-9.7-3.21-20.79-1.21-28.81,6.23Z"/>
              <path className="cls-410" d="M198.67,524.6c-.12-.15-.21-.29-.33-.42,10.89,11.34,28.9,11.93,40.5,1.2,11.59-10.74,12.4-28.76,1.92-40.49.12.13.26.24.38.38,10.86,11.72,10.16,30.03-1.56,40.89-11.72,10.85-30.03,10.16-40.9-1.57Z"/>
              <path className="cls-102" d="M223.75,508.86c2.17-2,2.28-5.39.28-7.54-2-2.17-5.38-2.3-7.54-.3-2.16,2-2.3,5.39-.29,7.56,2,2.16,5.39,2.3,7.55.29Z"/>
              <g>
                <path className="cls-339" d="M222.94,508.28c1.85-1.71,1.95-4.61.24-6.45-1.7-1.85-4.59-1.96-6.45-.24-1.83,1.7-1.94,4.59-.25,6.43,1.71,1.85,4.6,1.96,6.45.26Z"/>
                <path className="cls-509" d="M215.39,505.95s4.17.11,8.75-2.51c0,0-3.89,3.92-8.75,2.51Z"/>
                <path className="cls-98" d="M219.18,500.9c3.3-.7,4.13,2.45,4.13,2.45,0,0-4.3,2.32-7.49,2.21,0,0-.54-3.83,3.37-4.66Z"/>
                <path className="cls-99" d="M220.67,509.05c-3.2.8-4.71-2.5-4.71-2.5,0,0,3.94,1.09,7.78-2.34,0,0,.61,3.95-3.07,4.84Z"/>
              </g>
            </g>
          </g>
        </g>
      </g>
    </g> */}
     <g id="Layer_6" data-name="Layer 6">
      <g>
        <g>
          <path class="cls-150" d="M736.97,1017.93c0,2.35,5.16,24.87,7.55,24.87h592.34c2.38,0,7.8-21.57,7.8-23.94l-23.13-43.78c-.94-2.42-1.93-4.31-4.31-4.31h-553.83c-2.38,0-2.82,1.89-4.3,4.31l-22.12,42.84Z"/>
          <path class="cls-19" d="M758.43,1011.33c-.59,1.36.21,1.92,2.14,1.92h555.85c2.61.03,4.21-.23,3.5-1.92l-11.22-33.07c-.64-1.85-1.59-1.92-3.5-1.92h-531.23c-2.11.04-2.8.07-3.48,1.92l-12.06,33.07Z"/>
          <path class="cls-46" d="M767.87,1008.35c-.57,1.14.21,1.61,2.13,1.61h535.6c2.6.05,4.17-.19,3.47-1.61l-6.94-28.03c-.63-1.57-1.56-1.62-3.48-1.62h-518.16c-2.09.03-2.76.06-3.47,1.62l-9.14,28.03Z"/>
          <path class="cls-348" d="M740.04,1016.76h601.25c2.38,0,4.33,1.92,4.33,4.27v18.24c0,2.35-1.95,4.27-4.33,4.27h-601.25c-2.4,0-4.31-1.92-4.31-4.27v-18.24c0-2.35,1.91-4.27,4.31-4.27Z"/>
          <path class="cls-40" d="M1314.52,1031.13c-1.89-4.69-4.1-9.62-6.74-14.38h33.51c2.38,0,4.33,1.92,4.33,4.27v18.24c0,2.35-1.95,4.27-4.33,4.27h-22.97c-.91-4.24-2.21-8.42-3.8-12.41Z"/>
          <path class="cls-74" d="M740.04,1016.76h32.95c-2.05,1.59-3.89,3.6-5.38,6.13-3.5,5.97-3.78,14.14-.85,20.66h-26.72c-2.4,0-4.31-1.92-4.31-4.27v-18.24c0-2.35,1.91-4.27,4.31-4.27Z"/>
          <path class="cls-18" d="M736.97,1017.93v.09c.78-.78,1.86-1.26,3.07-1.26h601.25c1.08,0,2.07.41,2.81,1.08l-22.57-42.75c-.94-2.42-1.93-4.31-4.31-4.31h-553.83c-2.38,0-2.82,1.89-4.3,4.31l-22.12,42.84ZM759.72,976.41c.3-.46,1.07-2.5,1.31-2.93,1.01-1.81,2.55-2.35,3.53-2.35l551.68.3c1.26,0,2.96,1.55,3.98,4.15v.06s.06.07.06.07l18.89,40.7-598.62.11c-.05,0,19.17-40.12,19.17-40.12Z"/>
          <path class="cls-18" d="M736.97,1017.93v.09c.78-.78,1.86-1.26,3.07-1.26h601.25c1.08,0,2.07.41,2.81,1.08l-22.57-42.75c-.94-2.42-1.93-4.31-4.31-4.31h-553.83c-2.38,0-2.82,1.89-4.3,4.31l-22.12,42.84ZM759.21,975.82c.27-.47,1.17-2.42,1.42-2.85,1.01-1.83,2.95-1.83,3.94-1.83l552.2.06c1.27,0,2.93,1.32,3.95,3.93l.34.69,20.48,40.81-602.79-.04c-.06,0,20.46-40.77,20.46-40.77Z"/>
          <rect class="cls-9" x="1224.78" y="1016.76" width="106.56" height="26.79"/>
          <rect class="cls-4" x="1275.03" y="1016.76" width="49.24" height="26.79"/>
          <rect class="cls-7" x="752.39" y="1016.76" width="144.34" height="26.79"/>
          <rect class="cls-6" x="758.76" y="1016.76" width="103.29" height="26.79"/>
          <g class="cls-238">
            <path class="cls-119" d="M821.43,1039.27c0,1.12.95,2.02,2.12,2.02h430.73c1.18,0,2.14-.9,2.14-2.02h0c0-1.12-.95-2.03-2.14-2.03h-430.73c-1.17,0-2.12.91-2.12,2.03h0Z"/>
          </g>
          <g class="cls-318">
            <path class="cls-116" d="M738.31,1031.29c0,4.31,1.31,7.79,2.91,7.79h591.86c1.61,0,2.93-3.48,2.93-7.79h0c0-4.31-1.31-7.78-2.93-7.78h-591.86c-1.6,0-2.91,3.47-2.91,7.78h0Z"/>
          </g>
          <g class="cls-546">
            <path class="cls-120" d="M738.31,1024.66c0,.66,1.31,1.2,2.91,1.2h591.86c1.61,0,2.93-.54,2.93-1.2h0c0-.65-1.31-1.17-2.93-1.17h-591.86c-1.6,0-2.91.52-2.91,1.17h0Z"/>
          </g>
        </g>
        <g>
          <g>
            <g>
              <g>
                <path class="cls-574" d="M1141.09,495.65l-4.4,13.97.48.72c5.18-.42,10.3.23,15.45.94,2.03.29,4.12-1.66,6.26-1.64,2.36.02,4.45.79,6.9.39l.11-.04-4.55-14.35c0-1.15-4.53-2.1-10.14-2.1s-10.11.94-10.11,2.1Z"/>
                <path class="cls-457" d="M1151.21,506.79c8.09,0,14.65,1.33,14.65,2.99s-6.56,3.01-14.65,3.01-14.7-1.35-14.7-3.01c0-1.66,6.59-2.99,14.7-2.99Z"/>
                <path class="cls-79" d="M1151.4,507.11c6.7,0,12.12,1.34,12.12,3.03,0,1.65-5.42,3-12.12,3s-12.14-1.36-12.14-3c0-1.68,5.44-3.03,12.14-3.03Z"/>
              </g>
              <g>
                <path class="cls-486" d="M1141.09,510.35l-4.4,13.97.48.73c5.18-.39,10.3.2,15.45.95,2.03.3,4.12-1.65,6.26-1.64,2.36.02,4.45.78,6.9.37l.11-.02-4.55-14.36c0-1.16-4.53-2.1-10.14-2.1s-10.11.94-10.11,2.1Z"/>
                <path class="cls-450" d="M1151.21,521.49c8.09,0,14.65,1.33,14.65,2.99,0,1.66-6.56,3-14.65,3s-14.7-1.34-14.7-3c0-1.67,6.59-2.99,14.7-2.99Z"/>
                <path class="cls-52" d="M1151.75,521.98c6.76,0,12.26,1.11,12.26,2.5s-5.51,2.53-12.26,2.53-12.26-1.13-12.26-2.53c0-1.39,5.5-2.5,12.26-2.5Z"/>
              </g>
              <path class="cls-356" d="M1140.86,525.19l-4.47,13.97,1.74,2.58,19.88.59,8.02-2.78-4.62-14.37c0-1.15-4.6-2.1-10.27-2.1-5.66,0-10.28.94-10.28,2.1Z"/>
              <path class="cls-598" d="M1136.33,539.56v419.48s29.78,0,29.78,0v-419.48s-1.55-3-15.13-3c-8.08,0-14.65,1.35-14.65,3Z"/>
            </g>
            <path class="cls-357" d="M1172.54,990.8s-3.48,3.7-21.87,3.7-21.03-3.7-21.03-3.7v-27.39s4.83-6.01,4.83-6.01h.08c-.08,0,7.26,1.64,16.25,1.64s16.3-1.64,16.3-1.64l5.45,5.89v27.52Z"/>
            <path class="cls-5" d="M1134.54,957.4h-.08s-4.78,5.93-4.78,5.93c0,0,4.18,2.47,21.88,2.47,17.71,0,20.97-2.51,20.97-2.51l-5.45-5.89h0s-7.28,1.64-16.3,1.64-16.33-1.64-16.25-1.64Z"/>
          </g>
          <g class="cls-525">
            <path class="cls-25" d="M1142.5,494.57c-.7.22-1.15.51-1.33.81v12.19c.44-.06.9-.14,1.33-.22v-12.78Z"/>
            <path class="cls-25" d="M1146.27,493.82c.04,3.76.04,8.16.04,13.12,1.54-.1,3.15-.15,4.89-.15h.2s0-13.23,0-13.23h-.2c-1.76,0-3.44.08-4.93.26Z"/>
            <path class="cls-25" d="M1146.31,508.52c0,4.07,0,8.47.03,13.14,1.51-.11,3.16-.17,4.86-.17h.2s0-13.24,0-13.24h-.2c-1.76,0-3.44.1-4.89.26Z"/>
            <path class="cls-25" d="M1142.5,509.28c-.7.25-1.15.54-1.33.83v12.2c.44-.11.9-.15,1.33-.22v-12.81Z"/>
            <path class="cls-25" d="M1146.38,965.82c0,9.43,0,23.87-.04,28.69,1.68-.12,3.39.14,5.06,0v-28.72h-.75c-1.44,0-2.89.02-4.27.03Z"/>
            <path class="cls-25" d="M1141.17,965.45v28.65c.44-.03.9.1,1.33.05v-28.74c-.43,0-.89.02-1.33.03Z"/>
            <path class="cls-25" d="M1142.5,524.06c-.6.19-1.06.42-1.33.66v431.96c.44-.02.9-.03,1.33-.05v-432.57Z"/>
            <path class="cls-25" d="M1146.34,523.32c0,33.13.06,404.34.04,435.71,1.41-.02,4.82,0,5.02,0v-435.94h-.26c-1.74,0-3.38.07-4.8.23Z"/>
          </g>
        </g>
        <g>
          <g>
            <rect class="cls-174" x="1141.3" y="535.14" width="19.73" height="4.33"/>
            <polygon class="cls-273" points="1131.43 534.38 1141.3 539.46 1141.3 535.14 1131.43 530.05 1131.43 534.38"/>
            <polygon class="cls-185" points="1171 534.38 1161.03 539.46 1161.03 535.14 1171 530.05 1171 534.38"/>
          </g>
          <polygon class="cls-107" points="1161.11 524.96 1141.3 524.96 1131.43 530.05 1141.3 535.14 1161.11 535.14 1171 530.05 1161.11 524.96"/>
        </g>
        <path class="cls-15" d="M1148.16,520.22c1.15.59,2.43.9,3.8.9.77,0,1.52,0,2.29-.03v10.53c-1.43.1-2.94.17-4.53.17-.41,0-.83-.02-1.23-.02-.12-.02-.24-.02-.33-.02v-11.54Z"/>
        <g>
          <g>
            <path class="cls-441" d="M1166.68,478.79v10.32s-6.68,2.53-12.64,2.62c-5.93.06-10.61,4.9-10.61,14.39,0,9.5,4.16,15,10.02,15s12.41-.82,13.22-2.21v9.31c0,1.98-6.92,3.58-15.46,3.58-8.55,0-15.48-1.61-15.48-3.58v-49.42h30.94Z"/>
            <g>
              <path class="cls-297" d="M1157.24,502.03c0-4.21-1.55-7.91-3.91-10.27.23-.02.48-.04.71-.04,3.67-.05,7.61-1.01,10.1-1.78v26.95s-.47,1.95-7.94,1.95c-5.89,0-9.44-1.34-11.15-4.29.72.24,1.49.37,2.28.37,5.46,0,9.9-5.8,9.9-12.91Z"/>
              <path class="cls-289" d="M1144.22,512.59c-.01-.09-.04-.19-.06-.28-.47-1.82-.72-3.88-.72-6.19,0-9.11,4.31-13.91,9.89-14.35,2.36,2.36,3.91,6.06,3.91,10.27,0,7.11-4.45,12.91-9.9,12.91-.79,0-1.55-.14-2.28-.37-.29-.48-.55-1.01-.7-1.58-.05-.15-.1-.25-.14-.4Z"/>
              <path d="M1144.36,512.99c-.05-.15-.1-.25-.14-.4-.01-.09-.04-.19-.06-.28-.47-1.82-.72-3.88-.72-6.19,0-7.36,2.82-11.91,6.85-13.61,1.99,2.35,3.23,5.74,3.23,9.52,0,6.29-3.47,11.53-8.04,12.68-.14-.05-.29-.07-.42-.14-.29-.48-.55-1.01-.7-1.58Z"/>
            </g>
            <path class="cls-505" d="M1156.21,518.86c7.46,0,7.94-1.95,7.94-1.95,0,0,2.53.35,2.53,2-.81,1.4-7.35,2.21-13.22,2.21-4.27,0-7.62-2.91-9.1-8.13,1.31,4.06,4.99,5.87,11.86,5.87Z"/>
            <path class="cls-505" d="M1135.74,478.79c0,2,6.93,3.58,15.48,3.58s15.46-1.58,15.46-3.58c0-1.96-6.92-3.58-15.46-3.58s-15.48,1.62-15.48,3.58Z"/>
            <path class="cls-38" d="M1136.57,478.28c0,1.73,6.55,3.08,14.6,3.08s14.6-1.35,14.6-3.08c0-1.68-6.53-3.07-14.6-3.07s-14.6,1.39-14.6,3.07Z"/>
            <g>
              <path class="cls-561" d="M1165.05,218.75v258.25c0,1.66-6.2,2.97-13.83,2.97s-13.84-1.31-13.84-2.97V218.75h27.67Z"/>
              <path class="cls-392" d="M1158.13,210.4h10.79s-3.88,8.35-3.88,8.35c0,1.65-6.2,2.99-13.83,2.99s-13.84-1.34-13.84-2.99l-3.88-8.35h24.63Z"/>
              <path class="cls-337" d="M1133.53,182.33h35.37v27.82c.02.1.03.16.03.25,0,2.09-7.92,3.81-17.71,3.81-9.8,0-17.72-1.72-17.72-3.81,0-.09.02-.15.03-.25v-27.82Z"/>
              <path class="cls-15" d="M1160.34,213.75v-31.42h2.1v31.12s-2.1,7.8-2.1,7.8v257.99c-.65.13-1.35.26-2.07.34V221.39s2.07-7.64,2.07-7.64Z"/>
              <path class="cls-15" d="M1149.65,214.21v-31.88h8.62v31.63s-2.39,7.79-2.39,7.79v258.11h0c-1.27.08-2.63.12-4.04.12-.76,0-1.49,0-2.19-.01V221.74s0-7.53,0-7.53Z"/>
              <path class="cls-22" d="M1133.53,210.15v-27.82h7.73v31.19s2.7,7.77,2.7,7.77v258.26c-3.94-.53-6.58-1.48-6.58-2.55V218.75h0l-3.53-7.6c-.25-.25-.35-.5-.35-.76s.02-.15.03-.25Z"/>
              <path class="cls-296" d="M1133.5,182.12c0,2.12,7.92,3.81,17.72,3.81s17.71-1.69,17.71-3.81c0-2.1-7.92-3.8-17.71-3.8s-17.72,1.7-17.72,3.8Z"/>
              <path class="cls-22" d="M1136.76,181.37c0,1.43,6.43,2.6,14.4,2.6s14.41-1.17,14.41-2.6-6.44-2.58-14.41-2.58-14.4,1.15-14.4,2.58Z"/>
              <path class="cls-312" d="M1136.76,181.67c0,1.45,6.43,2.61,14.4,2.61,7.97,0,14.41-1.16,14.41-2.61,0-1.42-6.44-2.58-14.41-2.58s-14.4,1.17-14.4,2.58Z"/>
              <path class="cls-60" d="M1138.23,182.82c2.34-.85,7.26-1.45,12.93-1.45s10.59.59,12.94,1.45c-2.35.87-7.27,1.46-12.94,1.46s-10.59-.6-12.93-1.46Z"/>
            </g>
          </g>
          <path class="cls-12" d="M1135.72,528.21v-49.27s.01.02.01.02c.28,1.31,3.52,2.41,8.2,2.99h.03v.42s0,18.68,0,18.68c-.35,1.5-.53,3.2-.53,5.06,0,1.98.18,3.78.53,5.4v19.86c-4.91-.62-8.24-1.81-8.24-3.17Z"/>
          <path class="cls-15" d="M1155.73,491.64c-.57.04-1.12.05-1.69.09-1.59.02-3.09.38-4.42,1.08v-10.43h.42c.38,0,.75,0,1.15,0,1.58,0,3.09-.04,4.53-.15h0v9.42Z"/>
          <path class="cls-15" d="M1158.25,481.99s.05,0,.07-.03c.69-.08,1.36-.16,1.98-.27h.04v9.25c-.67.12-1.38.27-2.09.38v-9.34Z"/>
        </g>
        <path class="cls-15" d="M1150.17,520.93c.71-.03,1.4-.09,2.08-.18v10.34h-.07c-.36.07-2.01.3-2.01.3v-10.46Z"/>
        <g>
          <g>
            <path class="cls-510" d="M1213.55,513.68h-253.76c-1.31,0-2.36-4.93-2.36-11.01s1.05-11.01,2.36-11.01h253.76v22.02Z"/>
            <path class="cls-208" d="M1220.2,508.19v8.59s-6.65-3.1-6.65-3.1c-1.31,0-2.38-4.93-2.38-11.01,0-6.08,1.06-11.01,2.38-11.01l6.65-3.09v19.61Z"/>
            <path class="cls-353" d="M1242.54,488.6v28.15h-22.15c-.07.01-.12.03-.19.03-1.67,0-3.04-6.31-3.04-14.1,0-7.79,1.37-14.1,3.04-14.1.07,0,.12.01.19.03h22.15Z"/>
            <path class="cls-15" d="M1217.52,509.93h25.02v1.68h-24.77s-6.21-1.68-6.21-1.68h-253.55c-.09-.51-.2-1.07-.27-1.64h253.71s6.08,1.64,6.08,1.64Z"/>
            <path class="cls-15" d="M1217.16,501.43h25.38v6.86h-25.17s-6.2-1.91-6.2-1.91h-253.65c-.07-1-.1-2.1-.1-3.21,0-.61,0-1.18.01-1.74h253.73s5.99,0,5.99,0Z"/>
            <path class="cls-22" d="M1220.39,488.6h22.15v6.14h-24.83s-6.18,2.15-6.18,2.15h-253.78c.42-3.13,1.19-5.24,2.03-5.24h253.76s6.04-2.81,6.04-2.81c.2-.19.4-.28.61-.28.07,0,.12.01.19.03Z"/>
            <path class="cls-239" d="M1242.71,488.57c-1.69,0-3.04,6.31-3.04,14.1s1.35,14.1,3.04,14.1,3.02-6.31,3.02-14.1c0-7.79-1.35-14.1-3.02-14.1Z"/>
            <path class="cls-22" d="M1243.3,491.17c-1.13,0-2.06,5.12-2.06,11.46,0,6.34.93,11.47,2.06,11.47s2.06-5.12,2.06-11.47c0-6.34-.91-11.46-2.06-11.46Z"/>
            <path class="cls-294" d="M1243.06,491.17c-1.15,0-2.07,5.12-2.07,11.46,0,6.34.92,11.47,2.07,11.47s2.06-5.12,2.06-11.47c0-6.34-.93-11.46-2.06-11.46Z"/>
            <path class="cls-62" d="M1242.16,492.34c.67,1.86,1.15,5.77,1.15,10.29,0,4.51-.47,8.42-1.15,10.3-.69-1.88-1.17-5.78-1.17-10.3,0-4.52.47-8.44,1.17-10.29Z"/>
            <path class="cls-181" d="M1213.55,513.68h-253.76c-1.31,0-2.36-4.93-2.36-11.01s1.05-11.01,2.36-11.01h253.76v22.02Z"/>
            <path class="cls-563" d="M1220.2,508.19v8.59s-6.65-3.1-6.65-3.1c-1.31,0-2.38-4.93-2.38-11.01,0-6.08,1.06-11.01,2.38-11.01l6.65-3.09v19.61Z"/>
            <path class="cls-124" d="M1242.54,488.6v28.15h-22.15c-.07.01-.12.03-.19.03-1.67,0-3.04-6.31-3.04-14.1,0-7.79,1.37-14.1,3.04-14.1.07,0,.12.01.19.03h22.15Z"/>
            <path class="cls-15" d="M1217.52,509.93h25.02v1.68h-24.77s-6.21-1.68-6.21-1.68h-253.55c-.09-.51-.2-1.07-.27-1.64h253.71s6.08,1.64,6.08,1.64Z"/>
            <path class="cls-15" d="M1217.16,501.43h25.38v6.86h-25.17s-6.2-1.91-6.2-1.91h-253.65c-.07-1-.1-2.1-.1-3.21,0-.61,0-1.18.01-1.74h253.73s5.99,0,5.99,0Z"/>
            <path class="cls-22" d="M1220.22,488.51h22.15v6.14h-24.82s-6.19,2.15-6.19,2.15h-253.77c.42-3.13,1.18-5.24,2.03-5.24h253.76s6.04-2.81,6.04-2.81c.21-.19.4-.28.6-.28.08,0,.12.01.19.03Z"/>
            <path class="cls-22" d="M1216.98,488.66h22.15v6.15h-24.82s-6.19,2.15-6.19,2.15h-253.77c.43-3.13,1.19-5.24,2.03-5.24h253.76s6.05-2.8,6.05-2.8c.2-.19.4-.28.61-.28.07,0,.11.01.19.03Z"/>
            <path class="cls-173" d="M1242.71,488.57c-1.69,0-3.04,6.31-3.04,14.1s1.35,14.1,3.04,14.1,3.02-6.31,3.02-14.1c0-7.79-1.35-14.1-3.02-14.1Z"/>
            <path class="cls-22" d="M1243.3,491.17c-1.13,0-2.06,5.12-2.06,11.46,0,6.34.93,11.47,2.06,11.47s2.06-5.12,2.06-11.47c0-6.34-.91-11.46-2.06-11.46Z"/>
            <path class="cls-567" d="M1243.06,491.17c-1.15,0-2.07,5.12-2.07,11.46,0,6.34.92,11.47,2.07,11.47s2.06-5.12,2.06-11.47c0-6.34-.93-11.46-2.06-11.46Z"/>
            <path class="cls-71" d="M1242.16,492.34c.67,1.86,1.15,5.77,1.15,10.29,0,4.51-.47,8.42-1.15,10.3-.69-1.88-1.17-5.78-1.17-10.3,0-4.52.47-8.44,1.17-10.29Z"/>
          </g>
          <rect class="cls-56" x="969.87" y="491.57" width="11.18" height="22.11"/>
          <g>
            <rect class="cls-514" x="897.74" y="487.42" width="72.27" height="29.21"/>
            <rect class="cls-15" x="910.05" y="487.42" width="5.38" height="29.21"/>
            <rect class="cls-15" x="921.68" y="487.42" width="16.28" height="29.21"/>
            <rect class="cls-22" x="952.83" y="487.42" width="17.19" height="29.21"/>
            <rect class="cls-128" x="875.27" y="487.42" width="94.75" height="29.21"/>
            <rect class="cls-15" x="910.05" y="487.42" width="5.38" height="29.21"/>
            <rect class="cls-15" x="921.68" y="487.42" width="16.28" height="29.21"/>
            <rect class="cls-22" x="952.82" y="487.42" width="17.21" height="29.21"/>
          </g>
          <g>
            <path class="cls-270" d="M1126.84,528.15c-14.06-13.02-14.92-35-1.88-49.08,13.04-14.07,35.03-14.91,49.09-1.88,14.08,13.04,14.91,35.02,1.88,49.09-13.04,14.07-35.01,14.92-49.09,1.87Z"/>
            <g>
              <path class="cls-59" d="M1176.19,510.55l8.47-2.02c.06-.31.11-.63.14-.94l-8.82,2.1.21.86Z"/>
              <path class="cls-80" d="M1174.74,517.2l8.04-1.92c.14-.33.29-.67.39-1.01l-8.63,2.07.21.86Z"/>
              <path class="cls-33" d="M1171.77,523.8l7.48-1.78c.26-.38.53-.74.76-1.09l-8.45,2.02.21.85Z"/>
              <path class="cls-66" d="M1166.51,530.18l7.18-1.72c.43-.38.82-.79,1.23-1.19l-8.62,2.07.21.85Z"/>
              <path class="cls-39" d="M1158.3,534.25l.16.85,7.6-1.44c.69-.35,1.38-.69,2.05-1.09l-.04-.2-9.77,1.87Z"/>
              <path class="cls-48" d="M1143.91,536.76c.85.16,1.7.29,2.56.39l11.41-.56c1.32-.28,2.62-.63,3.9-1.07l-17.9.87.03.37Z"/>
              <path class="cls-82" d="M1176.19,503.97l8.95-1.79c-.01-.31.02-.6,0-.9l-9.12,1.82.17.88Z"/>
              <path class="cls-77" d="M1175.37,497.73l9.14-1.59c-.07-.3-.11-.59-.17-.87l-9.11,1.59.14.87Z"/>
              <path class="cls-47" d="M1173.8,492.16l9.24-1.42c-.12-.28-.22-.56-.34-.85l-9.02,1.39.13.87Z"/>
              <path class="cls-50" d="M1171.08,486.3l9.11-1.5c-.17-.27-.34-.53-.53-.82l-8.71,1.45.13.87Z"/>
              <path class="cls-75" d="M1165.76,479.63l9.16-1.53c-.24-.23-.47-.52-.74-.77l-8.57,1.43.15.87Z"/>
              <path class="cls-55" d="M1158.45,474.29l9.53-1.58c-.4-.25-.84-.45-1.27-.69l-8.4,1.39.14.87Z"/>
              <path class="cls-36" d="M1147.68,471.82l12.96-2.31c-.64-.21-1.27-.4-1.92-.56l-11.21,1.98.18.88Z"/>
            </g>
            <path class="cls-84" d="M1170.05,486.43c-2.28-6.6,3.08-9.99,7.29-6.29-.93-1.12-1.88-2.19-2.98-3.21-13.62-12.62-34.94-11.81-47.57,1.83-9.88,10.66-11.51,25.98-5.24,38.22l48.51-30.55Z"/>
            <g>
              <path class="cls-435" d="M1126.38,527.15c-13.55-12.56-14.37-33.75-1.82-47.29,12.56-13.55,33.75-14.36,47.3-1.8,13.56,12.55,14.36,33.73,1.81,47.29-12.56,13.55-33.74,14.36-47.29,1.81Z"/>
              <path class="cls-58" d="M1173.68,525.34c12.55-13.55,11.74-34.74-1.81-47.29-13.55-12.55-34.74-11.74-47.3,1.8-12.54,13.55-11.72,34.74,1.82,47.29,13.55,12.55,34.73,11.74,47.29-1.81ZM1125.06,480.1c12.43-13.42,33.39-14.22,46.8-1.79,13.43,12.44,14.24,33.39,1.81,46.81-12.44,13.43-33.41,14.23-46.84,1.8-13.41-12.43-14.22-33.39-1.78-46.82Z"/>
              <path class="cls-167" d="M1129.46,523.83c-11.73-10.86-12.42-29.18-1.56-40.89,10.85-11.73,29.17-12.44,40.89-1.57,11.73,10.85,12.42,29.18,1.57,40.9-10.87,11.72-29.18,12.42-40.9,1.57Z"/>
              <path class="cls-17" d="M1154.03,481.76c12.27,11.37,13.01,30.53,1.65,42.8-2.73,2.95-5.92,5.2-9.33,6.81,8.69.82,17.62-2.22,24.01-9.11,10.85-11.72,10.16-30.04-1.57-40.9-7.65-7.09-18.1-9.21-27.47-6.6,4.61,1.23,8.98,3.56,12.71,7Z"/>
              <path class="cls-31" d="M1167.84,481.72c11.73,10.86,12.43,29.16,1.57,40.89-3.18,3.43-7.02,5.89-11.15,7.44,4.46-1.5,8.65-4.08,12.1-7.79,10.85-11.72,10.16-30.04-1.57-40.9-8.29-7.68-19.84-9.54-29.76-5.87,9.7-3.21,20.79-1.21,28.81,6.23Z"/>
              <path class="cls-456" d="M1170.36,522.26c.12-.15.21-.29.33-.42-10.89,11.34-28.9,11.93-40.5,1.2-11.59-10.74-12.4-28.76-1.92-40.49-.12.13-.26.24-.38.38-10.86,11.72-10.16,30.03,1.56,40.89,11.72,10.85,30.03,10.16,40.9-1.57Z"/>
              <path class="cls-187" d="M1145.28,506.52c-2.17-2-2.28-5.39-.28-7.54,2-2.17,5.38-2.3,7.54-.3,2.16,2,2.3,5.39.29,7.56-2,2.16-5.39,2.3-7.55.29Z"/>
              <g>
                <path class="cls-170" d="M1146.09,505.94c-1.85-1.71-1.95-4.61-.24-6.45,1.7-1.85,4.59-1.96,6.45-.24,1.83,1.7,1.94,4.59.25,6.43-1.71,1.85-4.6,1.96-6.45.26Z"/>
                <path class="cls-115" d="M1153.64,503.62s-4.17.11-8.75-2.51c0,0,3.89,3.92,8.75,2.51Z"/>
                <path class="cls-100" d="M1149.85,498.56c-3.3-.7-4.13,2.45-4.13,2.45,0,0,4.3,2.32,7.49,2.21,0,0,.54-3.83-3.37-4.66Z"/>
                <path class="cls-97" d="M1148.36,506.72c3.2.8,4.71-2.5,4.71-2.5,0,0-3.94,1.09-7.78-2.34,0,0-.61,3.95,3.07,4.84Z"/>
              </g>
            </g>
          </g>
        </g>
      </g>
      <g>
        <g>
          <path class="cls-142" d="M632.06,1020.27c0,2.35-5.16,24.87-7.55,24.87H32.17c-2.38,0-7.8-21.57-7.8-23.94l23.13-43.78c.94-2.42,1.93-4.31,4.31-4.31h553.83c2.38,0,2.82,1.89,4.3,4.31l22.12,42.84Z"/>
          <path class="cls-16" d="M610.61,1013.67c.59,1.36-.21,1.92-2.14,1.92H52.61c-2.61.03-4.21-.23-3.5-1.92l11.22-33.07c.64-1.85,1.59-1.92,3.5-1.92h531.23c2.11.04,2.8.07,3.48,1.92l12.06,33.07Z"/>
          <path class="cls-70" d="M601.16,1010.68c.57,1.14-.21,1.61-2.13,1.61H63.43c-2.6.05-4.17-.19-3.47-1.61l6.94-28.03c.63-1.57,1.56-1.62,3.48-1.62h518.16c2.09.03,2.76.06,3.47,1.62l9.14,28.03Z"/>
          <path class="cls-324" d="M628.99,1019.09H27.75c-2.38,0-4.33,1.92-4.33,4.27v18.24c0,2.35,1.95,4.27,4.33,4.27h601.25c2.4,0,4.31-1.92,4.31-4.27v-18.24c0-2.35-1.91-4.27-4.31-4.27Z"/>
          <path class="cls-69" d="M54.51,1033.47c1.89-4.69,4.1-9.62,6.74-14.38H27.75c-2.38,0-4.33,1.92-4.33,4.27v18.24c0,2.35,1.95,4.27,4.33,4.27h22.97c.91-4.24,2.21-8.42,3.8-12.41Z"/>
          <path class="cls-45" d="M628.99,1019.09h-32.95c2.05,1.59,3.89,3.6,5.38,6.13,3.5,5.97,3.78,14.14.85,20.66h26.72c2.4,0,4.31-1.92,4.31-4.27v-18.24c0-2.35-1.91-4.27-4.31-4.27Z"/>
          <path class="cls-18" d="M609.94,977.42c-1.47-2.42-1.92-4.31-4.3-4.31H51.81c-2.38,0-3.38,1.89-4.31,4.31l-22.57,42.75c.75-.67,1.73-1.08,2.81-1.08h601.25c1.21,0,2.29.48,3.07,1.26v-.09l-22.12-42.84ZM628.48,1018.87l-598.62-.11,18.89-40.7.05-.07v-.06c1.04-2.6,2.74-4.15,4-4.15l551.68-.3c.99,0,2.52.54,3.53,2.35.24.42,1.01,2.46,1.31,2.93,0,0,19.22,40.12,19.17,40.12Z"/>
          <path class="cls-18" d="M609.94,977.42c-1.47-2.42-1.92-4.31-4.3-4.31H51.81c-2.38,0-3.38,1.89-4.31,4.31l-22.57,42.75c.75-.67,1.73-1.08,2.81-1.08h601.25c1.21,0,2.29.48,3.07,1.26v-.09l-22.12-42.84ZM630.28,1018.92l-602.79.04,20.48-40.81.34-.69c1.01-2.62,2.67-3.93,3.95-3.93l552.2-.06c.99,0,2.94,0,3.94,1.83.25.43,1.14,2.39,1.42,2.85,0,0,20.52,40.77,20.46,40.77Z"/>
          <rect class="cls-13" x="37.69" y="1019.09" width="106.56" height="26.79"/>
          <rect class="cls-11" x="44.76" y="1019.09" width="49.24" height="26.79"/>
          <rect class="cls-8" x="472.3" y="1019.09" width="144.34" height="26.79"/>
          <rect class="cls-10" x="506.98" y="1019.09" width="103.29" height="26.79"/>
          <g class="cls-204">
            <path class="cls-118" d="M547.6,1041.61c0,1.12-.95,2.02-2.12,2.02H114.75c-1.18,0-2.14-.9-2.14-2.02h0c0-1.12.95-2.03,2.14-2.03h430.73c1.17,0,2.12.91,2.12,2.03h0Z"/>
          </g>
          <g class="cls-311">
            <path class="cls-117" d="M630.72,1033.62c0,4.31-1.31,7.79-2.91,7.79H35.95c-1.61,0-2.93-3.48-2.93-7.79h0c0-4.31,1.31-7.78,2.93-7.78h591.86c1.6,0,2.91,3.47,2.91,7.78h0Z"/>
          </g>
          <g class="cls-202">
            <path class="cls-121" d="M630.72,1027c0,.66-1.31,1.2-2.91,1.2H35.95c-1.61,0-2.93-.54-2.93-1.2h0c0-.65,1.31-1.17,2.93-1.17h591.86c1.6,0,2.91.52,2.91,1.17h0Z"/>
          </g>
        </g>
        <g>
          <g>
            <g>
              <g>
                <path class="cls-540" d="M227.94,497.99l4.4,13.97-.48.72c-5.18-.42-10.3.23-15.45.94-2.03.29-4.12-1.66-6.26-1.64-2.36.02-4.45.79-6.9.39l-.11-.04,4.55-14.35c0-1.15,4.53-2.1,10.14-2.1s10.11.94,10.11,2.1Z"/>
                <path class="cls-521" d="M217.83,509.13c-8.09,0-14.65,1.33-14.65,2.99s6.56,3.01,14.65,3.01,14.7-1.35,14.7-3.01-6.59-2.99-14.7-2.99Z"/>
                <path class="cls-61" d="M217.63,509.44c-6.7,0-12.12,1.34-12.12,3.03s5.42,3,12.12,3,12.14-1.36,12.14-3-5.44-3.03-12.14-3.03Z"/>
              </g>
              <g>
                <path class="cls-156" d="M227.94,512.69l4.4,13.97-.48.73c-5.18-.39-10.3.2-15.45.95-2.03.3-4.12-1.65-6.26-1.64-2.36.02-4.45.78-6.9.37l-.11-.02,4.55-14.36c0-1.16,4.53-2.1,10.14-2.1s10.11.94,10.11,2.1Z"/>
                <path class="cls-421" d="M217.83,523.82c-8.09,0-14.65,1.33-14.65,2.99s6.56,3,14.65,3,14.7-1.34,14.7-3-6.59-2.99-14.7-2.99Z"/>
                <path class="cls-87" d="M217.28,524.32c-6.76,0-12.26,1.11-12.26,2.5s5.51,2.53,12.26,2.53,12.26-1.13,12.26-2.53-5.5-2.5-12.26-2.5Z"/>
              </g>
              <path class="cls-390" d="M228.17,527.53l4.47,13.97-1.74,2.58-19.88.59-8.02-2.78,4.62-14.37c0-1.15,4.6-2.1,10.27-2.1s10.28.94,10.28,2.1Z"/>
              <path class="cls-355" d="M232.7,541.9v419.48h-29.78v-419.48s1.55-3,15.13-3c8.08,0,14.65,1.35,14.65,3Z"/>
            </g>
            <path class="cls-389" d="M196.49,993.14s3.48,3.7,21.87,3.7,21.03-3.7,21.03-3.7v-27.39l-4.83-6.01h-.08c.08,0-7.26,1.64-16.25,1.64s-16.3-1.64-16.3-1.64l-5.45,5.89v27.52Z"/>
            <path class="cls-5" d="M234.49,959.73h.08l4.78,5.93s-4.18,2.47-21.88,2.47-20.97-2.51-20.97-2.51l5.45-5.89h0s7.28,1.64,16.3,1.64,16.33-1.64,16.25-1.64Z"/>
          </g>
          <g class="cls-525">
            <path class="cls-25" d="M226.53,496.91c.7.22,1.15.51,1.33.81v12.19c-.44-.06-.9-.14-1.33-.22v-12.78Z"/>
            <path class="cls-25" d="M222.76,496.16c-.04,3.76-.04,8.16-.04,13.12-1.54-.1-3.15-.15-4.89-.15h-.2v-13.23h.2c1.76,0,3.44.08,4.93.26Z"/>
            <path class="cls-25" d="M222.72,510.85c0,4.07,0,8.47-.03,13.14-1.51-.11-3.16-.17-4.86-.17h-.2v-13.24h.2c1.76,0,3.44.1,4.89.26Z"/>
            <path class="cls-25" d="M226.53,511.61c.7.25,1.15.54,1.33.83v12.2c-.44-.11-.9-.15-1.33-.22v-12.81Z"/>
            <path class="cls-25" d="M222.65,968.16c0,9.43,0,23.87.04,28.69-1.68-.12-3.39.14-5.06,0v-28.72h.75c1.44,0,2.89.02,4.27.03Z"/>
            <path class="cls-25" d="M227.86,967.79v28.65c-.44-.03-.9.1-1.33.05v-28.74c.43,0,.89.02,1.33.03Z"/>
            <path class="cls-25" d="M226.53,526.39c.6.19,1.06.42,1.33.66v431.96c-.44-.02-.9-.03-1.33-.05v-432.57Z"/>
            <path class="cls-25" d="M222.69,525.66c0,33.13-.06,404.34-.04,435.71-1.41-.02-4.82,0-5.02,0v-435.94h.26c1.74,0,3.38.07,4.8.23Z"/>
          </g>
        </g>
        <g>
          <g>
            <rect class="cls-145" x="208" y="537.47" width="19.73" height="4.33"/>
            <polygon class="cls-360" points="237.6 536.72 227.73 541.8 227.73 537.47 237.6 532.39 237.6 536.72"/>
            <polygon class="cls-147" points="198.04 536.72 208 541.8 208 537.47 198.04 532.39 198.04 536.72"/>
          </g>
          <polygon class="cls-334" points="207.92 527.3 227.73 527.3 237.6 532.39 227.73 537.47 207.92 537.47 198.04 532.39 207.92 527.3"/>
        </g>
        <path class="cls-15" d="M220.87,522.55c-1.15.59-2.43.9-3.8.9-.77,0-1.52,0-2.29-.03v10.53c1.43.1,2.94.17,4.53.17.41,0,.83-.02,1.23-.02.12-.02.24-.02.33-.02v-11.54Z"/>
        <g>
          <g>
            <path class="cls-280" d="M202.35,481.13v10.32s6.68,2.53,12.64,2.62c5.93.06,10.61,4.9,10.61,14.39s-4.16,15-10.02,15-12.41-.82-13.22-2.21v9.31c0,1.98,6.92,3.58,15.46,3.58s15.48-1.61,15.48-3.58v-49.42h-30.94Z"/>
            <g>
              <path class="cls-522" d="M211.79,504.37c0-4.21,1.55-7.91,3.91-10.27-.23-.02-.48-.04-.71-.04-3.67-.05-7.61-1.01-10.1-1.78v26.95s.47,1.95,7.94,1.95c5.89,0,9.44-1.34,11.15-4.29-.72.24-1.49.37-2.28.37-5.46,0-9.9-5.8-9.9-12.91Z"/>
              <path class="cls-289" d="M224.82,514.93c.01-.09.04-.19.06-.28.47-1.82.72-3.88.72-6.19,0-9.11-4.31-13.91-9.89-14.35-2.36,2.36-3.91,6.06-3.91,10.27,0,7.11,4.45,12.91,9.9,12.91.79,0,1.55-.14,2.28-.37.29-.48.55-1.01.7-1.58.05-.15.1-.25.14-.4Z"/>
              <path d="M224.67,515.33c.05-.15.1-.25.14-.4.01-.09.04-.19.06-.28.47-1.82.72-3.88.72-6.19,0-7.36-2.82-11.91-6.85-13.61-1.99,2.35-3.23,5.74-3.23,9.52,0,6.29,3.47,11.53,8.04,12.68.14-.05.29-.07.42-.14.29-.48.55-1.01.7-1.58Z"/>
            </g>
            <path class="cls-505" d="M212.82,521.2c-7.46,0-7.94-1.95-7.94-1.95,0,0-2.53.35-2.53,2,.81,1.4,7.35,2.21,13.22,2.21,4.27,0,7.62-2.91,9.1-8.13-1.31,4.06-4.99,5.87-11.86,5.87Z"/>
            <path class="cls-505" d="M233.29,481.13c0,2-6.93,3.58-15.48,3.58s-15.46-1.58-15.46-3.58,6.92-3.58,15.46-3.58,15.48,1.62,15.48,3.58Z"/>
            <path class="cls-43" d="M232.46,480.61c0,1.73-6.55,3.08-14.6,3.08s-14.6-1.35-14.6-3.08,6.53-3.07,14.6-3.07,14.6,1.39,14.6,3.07Z"/>
            <g>
              <path class="cls-153" d="M203.99,221.09v258.25c0,1.66,6.2,2.97,13.83,2.97s13.84-1.31,13.84-2.97V221.09h-27.67Z"/>
              <path class="cls-487" d="M210.9,212.74h-10.79l3.88,8.35c0,1.65,6.2,2.99,13.83,2.99s13.84-1.34,13.84-2.99l3.88-8.35h-24.63Z"/>
              <path class="cls-558" d="M235.5,184.67h-35.37v27.82c-.02.1-.03.16-.03.25,0,2.09,7.92,3.81,17.71,3.81s17.72-1.72,17.72-3.81c0-.09-.02-.15-.03-.25v-27.82Z"/>
              <path class="cls-15" d="M208.69,216.09v-31.42h-2.1v31.12l2.1,7.8v257.99c.65.13,1.35.26,2.07.34V223.73l-2.07-7.64Z"/>
              <path class="cls-15" d="M219.38,216.55v-31.88h-8.62v31.63l2.39,7.79v258.11h0c1.27.08,2.63.12,4.04.12.76,0,1.49,0,2.19-.01V216.55Z"/>
              <path class="cls-22" d="M235.5,212.49v-27.82h-7.73v31.19l-2.7,7.77v258.26c3.94-.53,6.58-1.48,6.58-2.55V221.09h0l3.53-7.6c.25-.25.35-.5.35-.76,0-.09-.02-.15-.03-.25Z"/>
              <path class="cls-407" d="M235.53,184.45c0,2.12-7.92,3.81-17.72,3.81s-17.71-1.69-17.71-3.81,7.92-3.8,17.71-3.8,17.72,1.7,17.72,3.8Z"/>
              <path class="cls-22" d="M232.28,183.7c0,1.43-6.43,2.6-14.4,2.6s-14.41-1.17-14.41-2.6,6.44-2.58,14.41-2.58,14.4,1.15,14.4,2.58Z"/>
              <path class="cls-226" d="M232.28,184.01c0,1.45-6.43,2.61-14.4,2.61s-14.41-1.16-14.41-2.61,6.44-2.58,14.41-2.58,14.4,1.17,14.4,2.58Z"/>
              <path class="cls-65" d="M230.8,185.15c-2.34-.85-7.26-1.45-12.93-1.45s-10.59.59-12.94,1.45c2.35.87,7.27,1.46,12.94,1.46s10.59-.6,12.93-1.46Z"/>
            </g>
          </g>
          <path class="cls-12" d="M233.31,530.55v-49.27s-.01.02-.01.02c-.28,1.31-3.52,2.41-8.2,2.99h-.03v19.1c.35,1.5.53,3.2.53,5.06,0,1.98-.18,3.78-.53,5.4v19.86c4.91-.62,8.24-1.81,8.24-3.17Z"/>
          <path class="cls-15" d="M213.3,493.98c.57.04,1.12.05,1.69.09,1.59.02,3.09.38,4.42,1.08v-10.43h-1.57c-1.58,0-3.09-.04-4.53-.15h0v9.42Z"/>
          <path class="cls-15" d="M210.78,484.33s-.05,0-.07-.03c-.69-.08-1.36-.16-1.98-.27h-.04v9.25c.67.12,1.38.27,2.09.38v-9.34Z"/>
        </g>
        <path class="cls-15" d="M218.86,523.26c-.71-.03-1.4-.09-2.08-.18v10.34h.07c.36.07,2.01.3,2.01.3v-10.46Z"/>
        <g>
          <g>
            <path class="cls-472" d="M155.48,516.02h253.76c1.31,0,2.36-4.93,2.36-11.01s-1.05-11.01-2.36-11.01h-253.76v22.02Z"/>
            <path class="cls-506" d="M148.83,510.52v8.59l6.65-3.1c1.31,0,2.38-4.93,2.38-11.01s-1.06-11.01-2.38-11.01l-6.65-3.09v19.61Z"/>
            <path class="cls-452" d="M126.49,490.94v28.15h22.15c.07.01.12.03.19.03,1.67,0,3.04-6.31,3.04-14.1s-1.37-14.1-3.04-14.1c-.07,0-.12.01-.19.03h-22.15Z"/>
            <path class="cls-15" d="M151.51,512.27h-25.02v1.68h24.77l6.21-1.68h253.55c.09-.51.2-1.07.27-1.64h-253.71l-6.08,1.64Z"/>
            <path class="cls-15" d="M151.87,503.77h-25.38v6.86h25.17l6.2-1.91h253.65c.07-1,.1-2.1.1-3.21,0-.61,0-1.18-.01-1.74H151.87Z"/>
            <path class="cls-22" d="M148.64,490.94h-22.15v6.14h24.83l6.18,2.15h253.78c-.42-3.13-1.19-5.24-2.03-5.24h-253.76l-6.04-2.81c-.2-.19-.4-.28-.61-.28-.07,0-.12.01-.19.03Z"/>
            <path class="cls-103" d="M126.32,490.91c1.69,0,3.04,6.31,3.04,14.1s-1.35,14.1-3.04,14.1-3.02-6.31-3.02-14.1,1.35-14.1,3.02-14.1Z"/>
            <path class="cls-22" d="M125.73,493.51c1.13,0,2.06,5.12,2.06,11.46s-.93,11.47-2.06,11.47-2.06-5.12-2.06-11.47.91-11.46,2.06-11.46Z"/>
            <path class="cls-245" d="M125.97,493.51c1.15,0,2.07,5.12,2.07,11.46s-.92,11.47-2.07,11.47-2.06-5.12-2.06-11.47.93-11.46,2.06-11.46Z"/>
            <path class="cls-85" d="M126.88,494.68c-.67,1.86-1.15,5.77-1.15,10.29s.47,8.42,1.15,10.3c.69-1.88,1.17-5.78,1.17-10.3s-.47-8.44-1.17-10.29Z"/>
            <path class="cls-485" d="M155.48,516.02h253.76c1.31,0,2.36-4.93,2.36-11.01s-1.05-11.01-2.36-11.01h-253.76v22.02Z"/>
            <path class="cls-320" d="M148.83,510.52v8.59l6.65-3.1c1.31,0,2.38-4.93,2.38-11.01s-1.06-11.01-2.38-11.01l-6.65-3.09v19.61Z"/>
            <path class="cls-416" d="M126.49,490.94v28.15h22.15c.07.01.12.03.19.03,1.67,0,3.04-6.31,3.04-14.1s-1.37-14.1-3.04-14.1c-.07,0-.12.01-.19.03h-22.15Z"/>
            <path class="cls-15" d="M151.51,512.27h-25.02v1.68h24.77l6.21-1.68h253.55c.09-.51.2-1.07.27-1.64h-253.71l-6.08,1.64Z"/>
            <path class="cls-15" d="M151.87,503.77h-25.38v6.86h25.17l6.2-1.91h253.65c.07-1,.1-2.1.1-3.21,0-.61,0-1.18-.01-1.74H151.87Z"/>
            <path class="cls-22" d="M148.81,490.85h-22.15v6.14h24.82l6.19,2.15h253.77c-.42-3.13-1.18-5.24-2.03-5.24h-253.76l-6.04-2.81c-.21-.19-.4-.28-.6-.28-.08,0-.12.01-.19.03Z"/>
            <path class="cls-22" d="M152.05,490.99h-22.15v6.15h24.82l6.19,2.15h253.77c-.43-3.13-1.19-5.24-2.03-5.24h-253.76l-6.05-2.8c-.2-.19-.4-.28-.61-.28-.07,0-.11.01-.19.03Z"/>
            <path class="cls-577" d="M126.32,490.91c1.69,0,3.04,6.31,3.04,14.1s-1.35,14.1-3.04,14.1-3.02-6.31-3.02-14.1,1.35-14.1,3.02-14.1Z"/>
            <path class="cls-22" d="M125.73,493.51c1.13,0,2.06,5.12,2.06,11.46s-.93,11.47-2.06,11.47-2.06-5.12-2.06-11.47.91-11.46,2.06-11.46Z"/>
            <path class="cls-260" d="M125.97,493.51c1.15,0,2.07,5.12,2.07,11.46s-.92,11.47-2.07,11.47-2.06-5.12-2.06-11.47.93-11.46,2.06-11.46Z"/>
            <path class="cls-32" d="M126.88,494.68c-.67,1.86-1.15,5.77-1.15,10.29s.47,8.42,1.15,10.3c.69-1.88,1.17-5.78,1.17-10.3s-.47-8.44-1.17-10.29Z"/>
          </g>
          <rect class="cls-54" x="387.97" y="493.91" width="11.18" height="22.11"/>
          <g>
            <rect class="cls-250" x="399.01" y="489.76" width="72.27" height="29.21"/>
            <rect class="cls-15" x="453.6" y="489.76" width="5.38" height="29.21"/>
            <rect class="cls-15" x="431.07" y="489.76" width="16.28" height="29.21"/>
            <rect class="cls-22" x="399.01" y="489.76" width="17.19" height="29.21"/>
            <rect class="cls-541" x="399.01" y="489.76" width="94.75" height="29.21"/>
            <rect class="cls-15" x="453.6" y="489.76" width="5.38" height="29.21"/>
            <rect class="cls-15" x="431.07" y="489.76" width="16.28" height="29.21"/>
            <rect class="cls-22" x="399.01" y="489.76" width="17.21" height="29.21"/>
          </g>
          <g>
            <path class="cls-606" d="M242.19,530.49c14.06-13.02,14.92-35,1.88-49.08-13.04-14.07-35.03-14.91-49.09-1.88-14.08,13.04-14.91,35.02-1.88,49.09,13.04,14.07,35.01,14.92,49.09,1.87Z"/>
            <g>
              <path class="cls-49" d="M192.84,512.89l-8.47-2.02c-.06-.31-.11-.63-.14-.94l8.82,2.1-.21.86Z"/>
              <path class="cls-76" d="M194.29,519.54l-8.04-1.92c-.14-.33-.29-.67-.39-1.01l8.63,2.07-.21.86Z"/>
              <path class="cls-78" d="M197.26,526.14l-7.48-1.78c-.26-.38-.53-.74-.76-1.09l8.45,2.02-.21.85Z"/>
              <path class="cls-44" d="M202.52,532.52l-7.18-1.72c-.43-.38-.82-.79-1.23-1.19l8.62,2.07-.21.85Z"/>
              <path class="cls-34" d="M210.73,536.59l-.16.85-7.6-1.44c-.69-.35-1.38-.69-2.05-1.09l.04-.2,9.77,1.87Z"/>
              <path class="cls-35" d="M225.12,539.09c-.85.16-1.7.29-2.56.39l-11.41-.56c-1.32-.28-2.62-.63-3.9-1.07l17.9.87-.03.37Z"/>
              <path class="cls-72" d="M192.84,506.31l-8.95-1.79c.01-.31-.02-.6,0-.9l9.12,1.82-.17.88Z"/>
              <path class="cls-88" d="M193.66,500.07l-9.14-1.59c.07-.3.11-.59.17-.87l9.11,1.59-.14.87Z"/>
              <path class="cls-81" d="M195.23,494.5l-9.24-1.42c.12-.28.22-.56.34-.85l9.02,1.39-.13.87Z"/>
              <path class="cls-83" d="M197.95,488.63l-9.11-1.5c.17-.27.34-.53.53-.82l8.71,1.45-.13.87Z"/>
              <path class="cls-57" d="M203.27,481.96l-9.16-1.53c.24-.23.47-.52.74-.77l8.57,1.43-.15.87Z"/>
              <path class="cls-89" d="M210.59,476.63l-9.53-1.58c.4-.25.84-.45,1.27-.69l8.4,1.39-.14.87Z"/>
              <path class="cls-68" d="M221.35,474.16l-12.96-2.31c.64-.21,1.27-.4,1.92-.56l11.21,1.98-.18.88Z"/>
            </g>
            <path class="cls-64" d="M198.98,488.76c2.28-6.6-3.08-9.99-7.29-6.29.93-1.12,1.88-2.19,2.98-3.21,13.62-12.62,34.94-11.81,47.57,1.83,9.88,10.66,11.51,25.98,5.24,38.22l-48.51-30.55Z"/>
            <g>
              <path class="cls-565" d="M242.65,529.48c13.55-12.56,14.37-33.75,1.82-47.29-12.56-13.55-33.75-14.36-47.3-1.8-13.56,12.55-14.36,33.73-1.81,47.29,12.56,13.55,33.74,14.36,47.29,1.81Z"/>
              <path class="cls-73" d="M242.65,529.48c13.55-12.56,14.37-33.75,1.82-47.29-12.56-13.55-33.75-14.36-47.3-1.8-13.56,12.55-14.36,33.73-1.81,47.29,12.56,13.55,33.74,14.36,47.29,1.81ZM242.19,529.26c-13.43,12.44-34.39,11.63-46.84-1.8-12.43-13.42-11.62-34.38,1.81-46.81,13.41-12.43,34.37-11.63,46.8,1.79,12.45,13.43,11.63,34.39-1.78,46.82Z"/>
              <path class="cls-91" d="M239.57,526.17c11.73-10.86,12.42-29.18,1.56-40.89-10.85-11.73-29.17-12.44-40.89-1.57-11.73,10.85-12.42,29.18-1.57,40.9,10.87,11.72,29.18,12.42,40.9,1.57Z"/>
              <path class="cls-20" d="M215,484.1c-12.27,11.37-13.01,30.53-1.65,42.8,2.73,2.95,5.92,5.2,9.33,6.81-8.69.82-17.62-2.22-24.01-9.11-10.85-11.72-10.16-30.04,1.57-40.9,7.65-7.09,18.1-9.21,27.47-6.6-4.61,1.23-8.98,3.56-12.71,7Z"/>
              <path class="cls-67" d="M201.19,484.06c-11.73,10.86-12.43,29.16-1.57,40.89,3.18,3.43,7.02,5.89,11.15,7.44-4.46-1.5-8.65-4.08-12.1-7.79-10.85-11.72-10.16-30.04,1.57-40.9,8.29-7.68,19.84-9.54,29.76-5.87-9.7-3.21-20.79-1.21-28.81,6.23Z"/>
              <path class="cls-410" d="M198.67,524.6c-.12-.15-.21-.29-.33-.42,10.89,11.34,28.9,11.93,40.5,1.2,11.59-10.74,12.4-28.76,1.92-40.49.12.13.26.24.38.38,10.86,11.72,10.16,30.03-1.56,40.89-11.72,10.85-30.03,10.16-40.9-1.57Z"/>
              <path class="cls-102" d="M223.75,508.86c2.17-2,2.28-5.39.28-7.54-2-2.17-5.38-2.3-7.54-.3-2.16,2-2.3,5.39-.29,7.56,2,2.16,5.39,2.3,7.55.29Z"/>
              <g>
                <path class="cls-339" d="M222.94,508.28c1.85-1.71,1.95-4.61.24-6.45-1.7-1.85-4.59-1.96-6.45-.24-1.83,1.7-1.94,4.59-.25,6.43,1.71,1.85,4.6,1.96,6.45.26Z"/>
                <path class="cls-509" d="M215.39,505.95s4.17.11,8.75-2.51c0,0-3.89,3.92-8.75,2.51Z"/>
                <path class="cls-98" d="M219.18,500.9c3.3-.7,4.13,2.45,4.13,2.45,0,0-4.3,2.32-7.49,2.21,0,0-.54-3.83,3.37-4.66Z"/>
                <path class="cls-99" d="M220.67,509.05c-3.2.8-4.71-2.5-4.71-2.5,0,0,3.94,1.09,7.78-2.34,0,0,.61,3.95-3.07,4.84Z"/>
              </g>
            </g>
          </g>
        </g>
      </g>
    </g>


    <g id="flask-assembly">
    {/* Invisible hit-area so the entire flask region is draggable */}
    <rect
      className="flask-hit-area"
      x="1460"
      y="775"
      width="185"
      height="270"
      fill="#000"
      opacity="0"
      pointerEvents="all"
      style={{ cursor: "grab" }}
    />
    <g id="Layer_12" data-name="Layer 12">
      <g id="acetic-water-group" clipPath="url(#clip-acetic-water)">
        <path
          id="acetic-water"
          className="acetic-water-liquid"
          d="M1519.76,906.4l62.28-.44,41.3,102.85c2.43,6.06-2.03,12.66-8.56,12.66h-126.95c-6.51,0-10.97-6.56-8.58-12.62l40.51-102.45Z"
        />
      </g>
    </g>
    <g id="Layer_7" data-name="Layer 7">
      <g>
        <g className="cls-101">
          <path className="cls-343" d="M1575.45,884.11v-91.4h-48.43v91.4l-58.72,132.75s-13.69,22.05,22.06,22.05h121.76c36.21,0,22.05-22.05,22.05-22.05l-58.72-132.75Z"/>
        </g>
        <g id="flask">
          <g class="cls-3">
            <g>
              <g>
                <path class="cls-343" d="M1583.02,786.77c0,3.21-2.61,5.82-5.82,5.82h-51.11c-3.21,0-5.82-2.61-5.82-5.82h0c0-3.21,2.6-5.82,5.82-5.82h51.11c3.21,0,5.82,2.6,5.82,5.82h0Z"/>
                <path class="cls-42" d="M1577.2,780.95h-51.11c-3.21,0-5.82,2.6-5.82,5.82s2.6,5.82,5.82,5.82h51.11c3.21,0,5.82-2.61,5.82-5.82s-2.61-5.82-5.82-5.82ZM1558.96,789.98h-32.17c-2.02,0-3.66-1.44-3.66-3.21s1.64-3.2,3.66-3.2h32.17c2.02,0,3.66,1.43,3.66,3.2s-1.64,3.21-3.66,3.21Z"/>
                <path class="cls-586" d="M1532.69,786.34c0,1.05-.85,1.9-1.9,1.9h-3.17c-1.04,0-1.89-.85-1.89-1.9h0c0-1.05.85-1.9,1.89-1.9h3.17c1.05,0,1.9.85,1.9,1.9h0Z"/>
              </g>
              <path class="cls-37" d="M1577.2,780.95h-9.14c2.34.75,4.33,1.92,4.87,4.88.58,3.19-1.46,5.48-4.09,6.75h8.36c3.21,0,5.82-2.61,5.82-5.82s-2.61-5.82-5.82-5.82Z"/>
            </g>
          </g>
          <path class="cls-42" d="M1634.16,1016.86l-58.72-132.75v-91.4h-48.43v91.4l-58.72,132.75s-13.69,22.05,22.06,22.05h121.76c36.21,0,22.05-22.05,22.05-22.05ZM1569.81,1023.47h-80.95c-13.56-1.16-6.97-14.71-6.97-14.71l49.19-124.72v-87.92h5.43l22.08.39v85.99l29.43,126.66c3.1,15.11-18.2,14.33-18.2,14.33Z"/>
          {/* <g>
            <path class="cls-266" d="M1488.86,1023.47h80.95s21.31.77,18.2-14.33l-29.43-126.66v-85.99l-22.08-.39h-5.43v87.92l-49.19,124.72s-6.58,13.55,6.97,14.71Z"/>
            <path class="cls-37" d="M1634.16,1016.86l-58.72-132.75v-91.4h-8.35v89.38s48.42,124.34,49.58,137.89c1.16,13.56-16.66,11.62-16.66,11.62h-121.23c-12.39-1.93-8.14-18.98-8.14-18.98l-.34-.3-2.01,4.54s-13.69,22.05,22.06,22.05h121.76c36.21,0,22.05-22.05,22.05-22.05Z"/>
          </g> */}
          <path class="cls-27" d="M1533.98,798.81v85.8l-45.9,123.17s-3.49,9.88,2.13,11.04h26.53s11.62,0,13.17-9.69c1.12-7.02,15.1-125.11,15.1-125.11v-85.99l-11.04.77Z"/>
        </g>
      </g>
    </g>
    </g>
 


    <g id="Layer_10" data-name="Layer 10">
      <g>
        <g>
          <line className="cls-267" x1="811.1" y1="794.62" x2="855.66" y2="794.62"/>
          <path className="cls-23" d="M865.7,794.62c-4.72,1.75-10.59,4.74-14.22,7.91l2.86-7.91-2.86-7.91c3.63,3.17,9.49,6.16,14.22,7.91Z"/>
        </g>
        <text className="nahco3-label" transform="translate(675.41 802.06)"><tspan x="0" y="0">Lime water</tspan></text>
      </g>
      <g>
        <text className="nahco3-label" transform="translate(1712.26 965.49)"><tspan x="0" y="0">Acetic acid</tspan></text>
        <g>
          <line className="cls-267" x1="1707.91" y1="958.35" x2="1663.35" y2="958.35"/>
          <path className="cls-23" d="M1653.31,958.35c4.72-1.75,10.59-4.74,14.22-7.91l-2.86,7.91,2.86,7.91c-3.63-3.17-9.49-6.16-14.22-7.91Z"/>
        </g>
      </g>
      <g>
        <text className="nahco3-label" transform="translate(562.03 700.46)"><tspan x="0" y="0">NaHCO</tspan></text>
        <text className="nahco3-label" transform="translate(647.97 709.88) scale(.58)"><tspan x="0" y="0">3 </tspan></text>
        <text className="nahco3-label" transform="translate(659.92 700.46)"><tspan x="0" y="0">Solution</tspan></text>
        <g id="nahco3-mouth">
          <line className="cls-267" x1="557.67" y1="693.32" x2="513.12" y2="693.32"/>
          <path className="cls-23" d="M503.08,693.32c4.72-1.75,10.59-4.74,14.22-7.91l-2.86,7.91,2.86,7.91c-3.63-3.17-9.49-6.16-14.22-7.91Z"/>
        </g>
      </g>
    </g>
    <g id="interaction-helpers">
      {/* Visual drop target for the flask spout */}
      <rect
        id="drop-zone"
        x="353.12"
        y="-11.68"
        width="180"
        height="280"
        rx="8"
        ry="8"
        fill="#f97373"
        opacity="0"
        stroke="none"
        stroke-width="0"
        pointerEvents="none"
      />
      <g fill="#e5f0ff">
        <circle className="bubble" cx="430" cy="860" r="3">
          <animate attributeName="cy" values="860;780;720" dur="2.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;0.9;0" dur="2.5s" repeatCount="indefinite" />
        </circle>
        <circle className="bubble" cx="445" cy="840" r="2.5">
          <animate attributeName="cy" values="840;770;700" dur="2.8s" begin="0.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;0.85;0" dur="2.8s" begin="0.4s" repeatCount="indefinite" />
        </circle>
        <circle className="bubble" cx="455" cy="870" r="3.5">
          <animate attributeName="cy" values="870;790;730" dur="3.0s" begin="0.8s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;0.9;0" dur="3.0s" begin="0.8s" repeatCount="indefinite" />
        </circle>
        <circle className="bubble" cx="438" cy="850" r="2">
          <animate attributeName="cy" values="850;760;690" dur="2.3s" begin="1.2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;0.8;0" dur="2.3s" begin="1.2s" repeatCount="indefinite" />
        </circle>
        <circle className="bubble" cx="465" cy="880" r="3">
          <animate attributeName="cy" values="880;800;740" dur="2.6s" begin="1.6s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;0.85;0" dur="2.6s" begin="1.6s" repeatCount="indefinite" />
        </circle>
      </g>
      <g id="pour-stream" opacity="0">
        <defs>
          <linearGradient id="nahco3-stream-core-grad" x1="428" y1="100" x2="428" y2="657" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#daf2fc" stopOpacity="0.42"/>
            <stop offset="0.3" stopColor="#c8ecfa" stopOpacity="0.36"/>
            <stop offset="0.6" stopColor="#b8e6f8" stopOpacity="0.30"/>
            <stop offset="1" stopColor="#d0f0fc" stopOpacity="0.24"/>
          </linearGradient>
          <linearGradient id="nahco3-stream-flank-grad" x1="428" y1="100" x2="428" y2="657" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#e0f4fc" stopOpacity="0.24"/>
            <stop offset="0.5" stopColor="#d0eefa" stopOpacity="0.20"/>
            <stop offset="1" stopColor="#e4f6fd" stopOpacity="0.16"/>
          </linearGradient>
          <linearGradient id="nahco3-stream-outer-grad" x1="428" y1="100" x2="428" y2="657" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#eaf8fd" stopOpacity="0.12"/>
            <stop offset="0.5" stopColor="#e0f4fc" stopOpacity="0.09"/>
            <stop offset="1" stopColor="#eef9fe" stopOpacity="0.07"/>
          </linearGradient>
          <radialGradient id="nahco3-landing-glow-grad" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.35"/>
            <stop offset="0.35" stopColor="#e8f6fc" stopOpacity="0.18"/>
            <stop offset="0.7" stopColor="#d4f0fa" stopOpacity="0.06"/>
            <stop offset="1" stopColor="#d4f0fa" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="nahco3-micro-drop-grad" cx="0.4" cy="0.4" r="0.6">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.50"/>
            <stop offset="0.4" stopColor="#e8f8ff" stopOpacity="0.30"/>
            <stop offset="1" stopColor="#d4f0fa" stopOpacity="0.12"/>
          </radialGradient>
          <radialGradient id="nahco3-splash-drop-grad" cx="0.3" cy="0.3" r="0.7">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.60"/>
            <stop offset="0.5" stopColor="#d4f0fa" stopOpacity="0.35"/>
            <stop offset="1" stopColor="#b8e6f8" stopOpacity="0.10"/>
          </radialGradient>
          <filter id="nahco3-splash-blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.2"/>
          </filter>
        </defs>
        <path id="nahco3-stream-outer-l" d="M 428.12 100 Q 430 380 428.12 657.17" fill="none" stroke="url(#nahco3-stream-outer-grad)" strokeWidth="1.0" strokeLinecap="round" opacity="0"/>
        <path id="nahco3-stream-outer-r" d="M 428.12 100 Q 430 380 428.12 657.17" fill="none" stroke="url(#nahco3-stream-outer-grad)" strokeWidth="1.0" strokeLinecap="round" opacity="0"/>
        <path id="nahco3-stream-inner-l" d="M 428.12 100 Q 430 380 428.12 657.17" fill="none" stroke="url(#nahco3-stream-flank-grad)" strokeWidth="2.5" strokeLinecap="round" opacity="0"/>
        <path id="nahco3-stream-inner-r" d="M 428.12 100 Q 430 380 428.12 657.17" fill="none" stroke="url(#nahco3-stream-flank-grad)" strokeWidth="2.5" strokeLinecap="round" opacity="0"/>
        <path id="nahco3-stream-core" d="M 428.12 100 Q 430 380 428.12 657.17" fill="none" stroke="url(#nahco3-stream-core-grad)" strokeWidth="7" strokeLinecap="round" opacity="0"/>
        <circle id="nahco3-landing-glow" cx="428.12" cy="657.17" r="22" fill="url(#nahco3-landing-glow-grad)" opacity="0"/>
        <g id="nahco3-micro-droplets">
          <circle cx="428" cy="300" r="2.0" fill="url(#nahco3-micro-drop-grad)" opacity="0"/>
          <circle cx="429" cy="400" r="2.5" fill="url(#nahco3-micro-drop-grad)" opacity="0"/>
          <circle cx="427" cy="480" r="1.8" fill="url(#nahco3-micro-drop-grad)" opacity="0"/>
          <circle cx="429" cy="560" r="2.2" fill="url(#nahco3-micro-drop-grad)" opacity="0"/>
        </g>
        <g id="nahco3-splash-particles">
          <circle cx="428.12" cy="657.17" r="3.5" fill="url(#nahco3-splash-drop-grad)" filter="url(#nahco3-splash-blur)" opacity="0" data-angle="0" data-dist="16"/>
          <circle cx="428.12" cy="657.17" r="2.5" fill="url(#nahco3-splash-drop-grad)" filter="url(#nahco3-splash-blur)" opacity="0" data-angle="0.628" data-dist="22"/>
          <circle cx="428.12" cy="657.17" r="1.8" fill="url(#nahco3-splash-drop-grad)" filter="url(#nahco3-splash-blur)" opacity="0" data-angle="1.257" data-dist="16"/>
          <circle cx="428.12" cy="657.17" r="3.5" fill="url(#nahco3-splash-drop-grad)" filter="url(#nahco3-splash-blur)" opacity="0" data-angle="1.885" data-dist="28"/>
          <circle cx="428.12" cy="657.17" r="2.5" fill="url(#nahco3-splash-drop-grad)" filter="url(#nahco3-splash-blur)" opacity="0" data-angle="2.513" data-dist="22"/>
          <circle cx="428.12" cy="657.17" r="1.8" fill="url(#nahco3-splash-drop-grad)" filter="url(#nahco3-splash-blur)" opacity="0" data-angle="3.142" data-dist="16"/>
          <circle cx="428.12" cy="657.17" r="3.5" fill="url(#nahco3-splash-drop-grad)" filter="url(#nahco3-splash-blur)" opacity="0" data-angle="3.770" data-dist="28"/>
          <circle cx="428.12" cy="657.17" r="2.5" fill="url(#nahco3-splash-drop-grad)" filter="url(#nahco3-splash-blur)" opacity="0" data-angle="4.398" data-dist="22"/>
          <circle cx="428.12" cy="657.17" r="1.8" fill="url(#nahco3-splash-drop-grad)" filter="url(#nahco3-splash-blur)" opacity="0" data-angle="5.027" data-dist="16"/>
          <circle cx="428.12" cy="657.17" r="2.5" fill="url(#nahco3-splash-drop-grad)" filter="url(#nahco3-splash-blur)" opacity="0" data-angle="5.655" data-dist="22"/>
        </g>
      </g>
    </g>
  </g>
</svg>
    </div>
  )
}

export default SvgNaHco3
