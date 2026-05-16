import React, { useEffect, useRef } from 'react'
import { useStore, EXPERIMENT_TYPES } from '@/store/useStore'
import "./SvgLitmus.css"

const SvgLitmus = () => {
  const svgRef = useRef(null)
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

        const dropper = svg.querySelector("#litmus-dropper")
        const dropZoneTestTube = svg.querySelector("#drop-zone-test-tube rect")
        const dropZoneLitmus = svg.querySelector("#drop-zone-litmus rect")
        const droplets = dropper ? dropper.querySelectorAll(".acid-droplet") : []
        const blueLitmusPaper = svg.querySelector("#blue-litmus-paper")
        const redAcidStain = svg.querySelector("#red-acid-stain")

        if (!dropper) return

        let hasPickedAceticAcid = false
        let hasDroppedOnLitmus = false

        // Litmus paper center (average of polygon points)
        const litmusCenterX = (1165.52 + 1522.96 + 1465.71 + 1100.24) / 4
        const litmusCenterY = (897.34 + 897.34 + 944.83 + 944.83) / 4
        const litmusTopY = 897.34

        const [draggable] = Draggable.create(dropper, {
          type: "x,y",
          bounds: svg,
          onDragEnd: function () {
            if (!dropZoneTestTube || !dropZoneLitmus) return

            // Step 1: animated acid pickup from test tube
            if (!hasPickedAceticAcid) {
              if (Draggable.hitTest(this.target, dropZoneTestTube, "50%")) {
                hasPickedAceticAcid = true
                draggable.disable()

                const bulb = svg.querySelector("#dropper-bulb")
                const testTubeCenterX = 506
                const dropperTipX = 795
                const dropperTipY = 866
                const snapX = testTubeCenterX - dropperTipX
                const aboveLiquidY = 580 - dropperTipY
                const submergedY = 645 - dropperTipY

                const pickupTl = gsap.timeline({
                  onComplete: () => {
                    if (!isCancelled && draggable && !hasDroppedOnLitmus) {
                      draggable.enable()
                    }
                  },
                })

                // Dropper moves above the test tube
                pickupTl.to(dropper, {
                  x: snapX,
                  y: aboveLiquidY,
                  duration: 0.6,
                  ease: "power2.inOut",
                })

                // Dropper descends — tip submerges in beaker liquid
                pickupTl.to(dropper, {
                  y: submergedY,
                  duration: 0.7,
                  ease: "power2.in",
                })

                // Bulb squeezes (rubber bulb compresses)
                pickupTl.to(bulb, {
                  scaleX: 0.75,
                  scaleY: 0.6,
                  svgOrigin: "796 552",
                  duration: 0.35,
                  ease: "power2.in",
                })

                // Bulb expands back (suction created)
                pickupTl.to(bulb, {
                  scaleX: 1,
                  scaleY: 1,
                  svgOrigin: "796 552",
                  duration: 0.5,
                  ease: "elastic.out(1, 0.5)",
                })

                // Liquid rises inside dropper tube (clip rect reveals fill from bottom up)
                pickupTl.to("#dropper-liquid-clip-rect", {
                  attr: { y: 711, height: 155 },
                  duration: 1.0,
                  ease: "power1.inOut",
                }, "-=0.3")

                // Beaker liquid level drops simultaneously
                pickupTl.to("#acid-liquid-clip-rect", {
                  y: "+=20",
                  height: "-=20",
                  duration: 1.0,
                  ease: "power1.inOut",
                }, "<")

                // Dropper rises back to its original resting position
                pickupTl.to(dropper, {
                  x: 0,
                  y: 0,
                  duration: 0.8,
                  ease: "power2.inOut",
                }, "+=0.3")
              }
              return
            }

            // Step 2: drop acid onto litmus paper
            if (!hasDroppedOnLitmus) {
              if (Draggable.hitTest(this.target, dropZoneLitmus, "50%")) {
                hasDroppedOnLitmus = true
                draggable.disable()

                // Snap dropper so its tip aligns above center of litmus paper
                const dropperBBox = dropper.getBBox()
                const dropperTipX = 795
                const dropperTipY = 866

                const targetX = litmusCenterX - dropperTipX
                const targetY = litmusTopY - dropperTipY - 30

                const tl = gsap.timeline({
                  onComplete: () => {
                    if (!isCancelled) {
                      useStore.getState().unlockActivityObservation(EXPERIMENT_TYPES.LITMUS_TEST)
                    }
                  },
                })

                // Snap dropper to center above litmus
                tl.to(dropper, {
                  x: targetX,
                  y: targetY,
                  duration: 0.4,
                  ease: "power2.out",
                })

                // Animate droplets one by one falling from tip to litmus surface
                const dropTipY = 0
                const fallDistance = 30 + (litmusTopY - dropperTipY - targetY + dropperTipY - dropperTipY)

                droplets.forEach((drop, i) => {
                  const delay = 0.3 * i

                  tl.set(drop, {
                    opacity: 1,
                    y: 0,
                    scaleX: 1,
                    scaleY: 1,
                    transformOrigin: "50% 50%",
                  }, `droplets+=${delay}`)

                  tl.to(drop, {
                    y: 65,
                    duration: 0.5,
                    ease: "power2.in",
                  }, `droplets+=${delay}`)

                  // Splash on impact
                  tl.to(drop, {
                    scaleY: 0.3,
                    scaleX: 1.8,
                    opacity: 0,
                    duration: 0.2,
                    ease: "power1.out",
                  }, `droplets+=${delay + 0.5}`)
                })

                // Reveal red stain spot where acid drops land (not the whole paper)
                if (redAcidStain) {
                  tl.to(redAcidStain, {
                    opacity: 1,
                    attr: { rx: 18, ry: 6 },
                    duration: 0.4,
                    ease: "power2.out",
                  }, "droplets+=0.5")

                  tl.to(redAcidStain, {
                    attr: { rx: 40, ry: 10 },
                    duration: 0.4,
                    ease: "power1.out",
                  }, "droplets+=1.1")

                  tl.to(redAcidStain, {
                    attr: { rx: 60, ry: 14 },
                    duration: 0.4,
                    ease: "power1.out",
                  }, "droplets+=1.7")
                }

                // Drain acid from dropper (clip rect shrinks back to hide liquid)
                tl.to("#dropper-liquid-clip-rect", {
                  attr: { y: 866, height: 0 },
                  duration: 1.5,
                  ease: "power1.inOut",
                }, "droplets")
              }
            }
          },
        })
        draggableRef.current = draggable
      } catch {
        // GSAP not available or failed to load; skip drag behavior.
      }
    }

    initGsap()

    return () => {
      isCancelled = true
      if (draggableRef.current) {
        draggableRef.current.kill()
        draggableRef.current = null
      }
    }
  }, [])

  return (
    <div className="svg-litmus-container lab-svg-viewport w-full h-full min-h-0 min-w-0 relative">
      <svg
        ref={svgRef}
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="xMidYMid meet"
        className="lab-svg-viewport__svg"
      >
  <defs>
   
    <linearGradient id="linear-gradient" x1="960.94" y1="20.53" x2="963.59" y2="835.52" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#6f5c34"/>
      <stop offset="1" stop-color="#9e8f48"/>
    </linearGradient>
    <linearGradient id="linear-gradient-2" x1="630.31" y1="599.87" x2="631.08" y2="687.7" gradientUnits="userSpaceOnUse">
      <stop offset=".03" stop-color="#9c6144"/>
      <stop offset=".46" stop-color="#9c6144"/>
      <stop offset=".53" stop-color="#915a3f"/>
      <stop offset=".65" stop-color="#754833"/>
      <stop offset=".68" stop-color="#6c432f"/>
      <stop offset=".98" stop-color="#653f2c"/>
    </linearGradient>
    <linearGradient id="linear-gradient-3" x1="319.82" y1="644.01" x2="936.93" y2="648.9" gradientUnits="userSpaceOnUse">
      <stop offset=".01" stop-color="#a8694a"/>
      <stop offset=".04" stop-color="#a56748"/>
      <stop offset=".2" stop-color="#9e6245"/>
      <stop offset=".54" stop-color="#9c6144"/>
      <stop offset=".8" stop-color="#9f6345"/>
      <stop offset="1" stop-color="#a8694a"/>
    </linearGradient>
    <linearGradient id="linear-gradient-4" x1="630.31" y1="736.48" x2="631.08" y2="824.31" xlinkHref="#linear-gradient-2"/>
    <linearGradient id="linear-gradient-5" x1="319.82" y1="780.62" x2="936.93" y2="785.5" xlinkHref="#linear-gradient-3"/>
    <linearGradient id="linear-gradient-6" x1="630.61" y1="848.16" x2="630.97" y2="889.97" xlinkHref="#linear-gradient-2"/>
    <linearGradient id="linear-gradient-7" x1="319.83" y1="869.12" x2="936.93" y2="874.01" xlinkHref="#linear-gradient-3"/>
    <linearGradient id="linear-gradient-8" x1="2108.82" y1="650.59" x2="2110" y2="784.56" gradientTransform="translate(1694.6 -1350.48) rotate(90)" xlinkHref="#linear-gradient-2"/>
    <linearGradient id="linear-gradient-9" x1="1968.73" y1="718.02" x2="2248.4" y2="720.24" gradientTransform="translate(1694.6 -1350.48) rotate(90)" xlinkHref="#linear-gradient-3"/>
    <linearGradient id="linear-gradient-10" x1="2108.82" y1="1266.03" x2="2110" y2="1400" gradientTransform="translate(1694.6 -1350.48) rotate(90)" xlinkHref="#linear-gradient-2"/>
    <linearGradient id="linear-gradient-11" x1="1968.73" y1="1333.45" x2="2248.4" y2="1335.67" gradientTransform="translate(1694.6 -1350.48) rotate(90)" xlinkHref="#linear-gradient-3"/>

    {/* Clip path for acetic acid liquid level animation */}
    <clipPath id="acetic-acid-clip">
      <rect
        id="acid-liquid-clip-rect"
        x="471.08"
        y="607.72"
        width="69.72"
        height="230"
      />
    </clipPath>

    {/* Clip path for dropper liquid rise animation */}
    <clipPath id="dropper-liquid-clip">
      <rect
        id="dropper-liquid-clip-rect"
        x="785"
        y="866"
        width="25"
        height="0"
      />
    </clipPath>

  </defs>
  <g class="pqr-241">
    <g id="Layer_3" data-name="Layer 3">
      <g id="Layer_2" data-name="Layer 2">
        <rect class="pqr-195" y="820.71" width="1925.81" height="259.29"/>
        <rect class="pqr-425" y=".44" width="1924.48" height="838.82"/>
      </g>
    </g>
    <g id="Layer_7" data-name="Layer 7">
      <g id="litmus-dropper" style={{ cursor: 'grab' }}>
        <g class="pqr-437">
          <polygon class="pqr-322" points="795.19 865.61 795.11 865.6 795.04 865.61 795.19 865.61"/>
          <path class="pqr-322" d="M788.4,614.05v210.22s.15,7.24,1.06,11.21c.91,3.97,3.77,27.57,3.77,27.57,0,0,0,2.1.91,2.33l.98.22.98-.22c.91-.23.91-2.33.91-2.33,0,0,2.87-23.59,3.78-27.57.9-3.98,1.06-11.21,1.06-11.21v-210.22h-13.44Z"/>
        </g>
        <path
          id="acid-indicator-line"
          className="dropper-acid-fill"
          d="M788.4,614.05v210.22s.15,7.24,1.06,11.21c.91,3.97,3.77,27.57,3.77,27.57,0,0,0,2.1.91,2.33l.98.22.98-.22c.91-.23.91-2.33.91-2.33,0,0,2.87-23.59,3.78-27.57.9-3.98,1.06-11.21,1.06-11.21v-210.22h-13.44Z"
          clipPath="url(#dropper-liquid-clip)"
        />
        <g id="dropper-bulb">
          <path class="pqr-86" d="M821.78,577.58c4.07-14.54,5.52-39.55.87-59.61-1.71-7.37-4.06-12.78-7.52-16.38-4.15-5.12-11.63-8.19-19.03-8.19s-13.89,3-18.05,7.76c-3.53,4.19-6.81,8.98-8.63,16.82-4.65,20.06-3.2,45.07.87,59.61,4.07,14.54,13.67,23.55,13.38,27.33v6.11s-1.16,5.23,2.33,5.53h20.08c3.49-.29,2.33-5.53,2.33-5.53v-6.11c-.29-3.78,9.3-12.79,13.38-27.33Z"/>
          <path class="pqr-107" d="M821.78,577.58c4.07-14.54,5.52-39.55.87-59.61-1.71-7.37-4.06-12.78-7.52-16.38-4.15-5.12-11.63-8.19-19.03-8.19s-13.89,3-18.05,7.76c-3.53,4.19-6.81,8.98-8.63,16.82-4.65,20.06-3.2,45.07.87,59.61,4.07,14.54,13.67,23.55,13.38,27.33v6.11s-1.16,5.23,2.33,5.53h20.08c3.49-.29,2.33-5.53,2.33-5.53v-6.11c-.29-3.78,9.3-12.79,13.38-27.33ZM797.96,611.06c0,3.19-3.92,3.19-3.92,3.19h-6.25c-1.74-.43-1.89-2.47-1.89-2.47v-5.53c0-1.31,1.74-1.45,1.74-1.45l7.85-.44c2.33.15,2.47,1.74,2.47,1.74v4.94ZM800.57,578.45c-3.07,13.57-8.33,16.09-8.33,16.09-7.58,6.39-15.88-6.01-18.78-15.32-.79-2.54-1.27-5.23-1.66-7.9-1.46-9.8-2.16-19.83-2.07-29.79.14-14.22,2.8-38.13,18.05-41.4,22.59-4.85,15.85,64.75,12.79,78.32Z"/>
          <path class="pqr-88" d="M783.52,503.04s-8.72,6-11.24,27.52c-2.52,21.52,1.36,56.8,14.15,63.01,0,0-7.07-12.65-8.53-30.24-2.32-28.11,2.13-56.22,9.89-62.23,0,0-2.13,0-4.26,1.94Z"/>
        </g>

        {/* Droplets, initially hidden at the dropper tip */}
        <circle className="acid-droplet" cx="795" cy="866" r="4" fill="#f5f5f5" opacity="0" />
        <circle className="acid-droplet" cx="795" cy="866" r="4" fill="#f5f5f5" opacity="0" />
        <circle className="acid-droplet" cx="795" cy="866" r="4" fill="#f5f5f5" opacity="0" />
        <circle className="acid-droplet" cx="795" cy="866" r="4" fill="#f5f5f5" opacity="0" />
        <circle className="acid-droplet" cx="795" cy="866" r="4" fill="#f5f5f5" opacity="0" />
      </g>
    </g>
    <g id="Layer_4" data-name="Layer 4">
      <g>
        <g>
          <path
            id="acetic-acid-liquid"
            class="pqr-139"
            d="M471.08,607.72h69.72l.9,227.85s-4.79,29.28-31.07,29.97c-26.29.69-37.47-11.65-38.05-29.7-.58-18.05-1.5-228.12-1.5-228.12Z"
            clipPath="url(#acetic-acid-clip)"
          />
          <g>
            <g class="pqr-110">
              <image width="55" height="12" transform="translate(452 401)" xlinkHref="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADcAAAAMCAYAAADGZiUoAAAACXBIWXMAAAsSAAALEgHS3X78AAAEYklEQVRIidWV24scRRTGf6cu3TO7k92ZdTeaRExEA4lEo4H4fwj6LAiKID6I4ovPvmhE8I74IP4DgiAKvqhPJn+AKEkgt2Vlk73NzvT0dFfV8aFnd2dzgeQxB4quri6qv3PO930l3Ed89/0POirHDAZDNvvbOGsREZyzoCACIQRCHXDOkectWu0WPsvInAXAOUtS5UCng/eOLMt3zxkMBlRVjSqkFIkxAs0cQPXuuO5c3lt547VXxQF88fW3KiKIsYgxIIZTp05y4qknWdvY5O9/L7K2vkF/OOLxw0e4vnyDF55/lt78PFmWkfkM7z3ee6yxGGPI84yUEjMzbVClleeoKjElqrpmq9+nLMesra0BEEONsY5QV3sQFZA90PfI8Z7hfvzpZ53vzuOcY2Njg3FZsrk9ZDwa89/qGlv9bfIspzs/z3C7YFAUHDv2BGdOP8eBziztmQ7GuslxchsERZOiqrTzHGOEclwxKAoOttusr6+z3d+mHJe02m1CDPg8Q5OSNJFiAgFBQMEYg6KogmpzLuhkDiKCMYYYU4Pml19/0/WtPqjSHw4JISBAr9vDe0cIkeWVFVZv3eLpo0fpdGbJWm2sNRhjEJGGlwAixBBIKTVDlWo8bigbAikmlpYWWeh1OX78OP3+Fu32DLnPSJqIKSIIKaXdLk+fparo5NvOSCmhkz1iTMOCGHnxzGlxtza3ADBGcMYyrkvqUBNCIKbIqBhRVhWhDvxz6TKzM22MMVjnEaGhMqA7+pj6+YlnTnLlyhVaeY5zhl63h6Gp6oXz56nrmrNnz/L7n3+QYiSmRIyxSSzGJqmYUBQDxJR2BSgyKcI0VyZd3qm1KwbbhBAoiiGKMi7HiAhl0VRpXNeICPOzLWJSWrnl8KHDdDpziBHqOlCHyKgoKEcVWW6JKbJ6c43NWzc5tLRIAjLvsEaIMbJ8/RrWZ5ACF87/hUExVnDWwsSAxAgpKsbIHVoSEZKm/Wvcuc+FEBiNCuq6whsh9w4QVBVjLN1uFxGht/AIPsu4eu0qK6urhJUVBEMICSuQZ5ZedwFrBdRw9MhjqEx0oJA0YZKhGA7wLqPlHeCaSltB055WxTQa04kT39VIdHqqk+R2FptE3Vtvvr4v5Y/PndNGR6ax5pgw1pDlORcvXaauKwCstRhrqOuSzVGJE6GuAksHFxEDBrtrBO0so46RhV4XAaqqxjk3AQUJEDsFY+KSIjqhJaC6/zmVxo7ud66Q6W/3HR9+9InOzLTpzM7irefqjWUG20OqukY10Z2b4+Cji1jnaHtLUvDOMTc31whepKHbdJeAqBNTiGlyz+0Zid52yd3+7pybDE9/OCDPMnKf8crLL4njAeKD99+VTz//UmOMOOtJmlAraJ0IMRFipCwrfEtwxtDKM/I8I6aIKhgRQh32g6Uxs1FZNV1pfJ6d/hTj8T53nB7QMKhhkaMsCkrv8T7bLdxDFZ999Y02HU2g++Hv0VJ47523H7rcHij+BylHku2oSVzOAAAAAElFTkSuQmCC"/>
              <image width="41" height="465" transform="translate(466 411)" xlinkHref="data:image/png;base64,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"/>
              <image width="54" height="12" transform="translate(506 401)" xlinkHref="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADYAAAAMCAYAAAAppE4WAAAACXBIWXMAAAsSAAALEgHS3X78AAAEcklEQVRIie2Vz4skVRLHPxHv5a+q7qme6m4FW0FR8bCwB/+AnX9C8OBBEBRlQC+KJy/+GR48eB5EUUQvgifXRXYdFhXROeio3c4MU101XVmVme+98JDZNT2OBz14MyAzyIxHvPhGfCNC3njzLQOAQW1EEO4WGV4igojinKLqEQHvPXmWIU4RgbbtEIGbs2NUhBDixksbAl3bMj8+JoSAzzzee8wgYWCGpUQy2B6PqKqSqqp47pmnfy+su8TfDegMAMAG+8abCFj/3yxiKZIXjizLEBHKqmR3d5eyLNiZTMi8x6kiIqybhqLIadqOul6hqjRNSxc6uq5/2q6lbVtm82O++OJL7j844PqNa0z398myjI8+/sQe/+c/uH5zxqef/4+2rhEgho4YIy9efF4AvBk4p8QYkaESIIMGFR2qs0FKjBHnXW9TQV1vXDdrJpNJnzGfkZclznl2trdIZmTrpgc/Eibnz5OSoapD2voEphhIKXLjxg0eOHiAy///imq0xfmdHTKfsTUe8+PhNVb1ilyE0eQcVVUynU7puo5L77xnMQTkP/+9bE4Vs/4SUe21yO1n+FYRdLCfVuHsWRUlxEBMidVqRV3XfP/DVS5c+BeXLr2NzzyqSlEUuKGSzjmc92CnHWGYGSklYkrELjCfH/PT4SFlWTI5N2Fvd5cQAxj8fHTI1niM955RWbK9PWZUFPjPPvs3ZmB2m3IigtgZ/g2gRARDUKcbgHoanCrq3OZclmXcd3BA4R0ffvABAIv5jJPlCkt98L9NHKKIKMli318xoqrU9YqmbThZrogxsm5WYD2bMp/hnaOqShIwv7VkWa/w+7tTBMGwO8aFYajoBvBZSclQJ1iyOxoyxo7T8ZDMuPLtN4y2tkkpUmTKIiTu3d9DgauHv3DP3hSnjp8Pj9ib7rMzPYeIMqoKvBPWTcuVK9+xPS7JnJBSYF2f0K2X5FkOIpgZbVMwuwnj8RbOOapRhbzz7vvW81s2g6KPVfi9sSg9Wxha8Ta4U7sKFg0EVqs1ItC0HSGF02tusyOdUkQ5ns0oyoLrNxd4p5gYYBRZzkMPPohzjmtHR4TQsV6tSSkOc8AQjCYkVIXJ5DwXn39WPPR87mnWX3q2SjJQ8axWd9rwIO5O9AKo731tbY0RYDyGruuYzedUWc6qbft7tM/pfDZjvrjF8U+/UJUF5ybbgNG1Dcs28NXXX/PoI48QY+xjE3DekWJCBF55+ZW7SuC7LtC0LUWeE0JHCIEQAnmebwCeBdsnoYfgvR/2mENdP1B68DIEIHjnSNYnbm86ZbFYIIBToQnGclmzuFUzP6kBo2lbThYnPPbowyDQhY6rPx7x1JNP/KH9tQE2my+o6yXVaESMgRgjMUa2q1G/qwbq9XurZ1OVZ4hAiJGYEkhPi9GoomlaMu/xqpgl2i6hqiQzLEWKsiCLGbeWNckMVYeZ0XUB7/v1keU5IUTUCzFGXn/t1T8FCsCv1yvMjHq5vMOwqE+QYYe9dPGFP+34b/mL5FdXwTrzBzPdGQAAAABJRU5ErkJggg=="/>
              <image width="40" height="665" transform="translate(506 411)" xlinkHref="data:image/png;base64,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"/>
                        <image width="40" height="465" transform="translate(506 411)" xlinkHref="data:image/png;base64,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"/>

            </g>
            <g class="pqr-408">
              <image width="55" height="12" transform="translate(452 401)" xlinkHref="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADcAAAAMCAYAAADGZiUoAAAACXBIWXMAAAsSAAALEgHS3X78AAAE/klEQVRIidWVTYgkZxnHf+9XVXd198ysO6vZcaM7u4muuAlRMIkIuUkum6goeFBICEJAwRAFUUQPHvVgEGTBEMjFm4eI3jQHdyKJCsough+4xsNu1m1np6enu6u66v14PFT1zCZ+xWMeeKCot6jn+T////N/FW8ivvS1b8p8vuD6teu8Nh5jtCHLLEopFIqUBKUU0QescxTFkOFwSK/fJ88ckCgGBQrh+OYmea9Hr9djNBqRWcf+ZMJkb4IPAe8bvG9IKRFiQEQQkTfTJgKo7vniM99RFuCzTzwpWmu0cShjwRq+/IUnOXf2NDdujvn1765w6eXfkMxNzp+/jyuXf8uFT1zg3HvvZmMwwiiDRqGVYn19jdlswXBU0DSeXr/HcDBgMCgY9HuEFPEhEmIkhsgf/nSV/cmE+XxG3uuzKOddpx0opQ47lxWCN4a6DdVtCO0zF5+T02fOMBgO+cuf/8j+ZI9Xr4959drfOX7HFn+9cYuDhWdYrDEarPOP8ZgP3v8hPvXoo2yfOkmR5/97otIyu6otSdBaMakDs/ll5os5o/URdV2TuQxrDSEEgvcYa9v+laZpmtchallNXQoagzaGEEP7xfd/8Ly8Nt5FiXDtxg2qqqTf63Pnne+mn+c03rPz0iV2b+3y4P0PcGJzk/W3ncBZi7EG2xVfTSt2clouK7wPzGcH1MuaqiqJIXDvPfdy9uxZHn7oAQ5C4lhu/+NQkggiEJIQk5BEmFWtVFMSvG9ApKNVEMCHQEyJ929vKXvt5hiUope38mnqJbd2dykXC3zwTKdTqqqkqWt+sXOJjfV1jLEYl6GUwliHpEQKDVprUkqkFJGUePjCI7zyy5fI84zhcMjWyS0kttP/3rPPUS1Kvvr0F/nWt79L4xu893jviTGyrCpijCho/xcTKUYE0EqRUsuWtApu1ahAaXWoEvW5zz8ldVNzMN1HgNl02h6KEIOn8Z4kirzXxzmLcYYPP/gRNtY3aGKkrJYsl579vT2me1OKQYaPDVev/o1z7zlD5hyCIs8zMpfxjpN3cLC/h8kKiDVGa+qmIcsyEDBat00nIaWEc+5Q2ghorbu1E2JMr2NaK3UI+Btf/4qywTfMZwdU5YLcKIa9DDoHNEXBYLSG0YZz5+/BOsvOzg4v/+oVQoxIVHgfsUYxyC2n3nUa5zRaLB+4731oNOhV6UiShC9LBnmBNZZsOEAQMK2qjc2OjKRLhUYQFApBOpbkkKnVRiiOFKq6mvb5Zy+q29E/8rGPi1YaYw1pVQQwxvLiz19kvlhgjMFlFm0Mfr5kfDDHaqjrmu2778JlmpQ6mQhsjNYol0vu2t7GWMt8NmMwHLYtKtW5oHTGo1e2A0AI4QiUCDHFbhfbc601pkvvA9pojLTo/mWbf/LjF9Qb363ioY9ekFPv3OLE24+TmYLLv79CtSgRaWgaoVx6ymqJixmZtWBhrRiyeXwTAUKIIGCdpa6XoEAUSBSaZYNWUFVLmqYhBE8Iod2tTp5KQYwJ6xzWOZJAuZhjXIZ1jsZ7RIR+3vv34P5bXPrZT9UnP/O4AIQUjjSBEGIg+MhiVtJb02TWMhoUHDt2DIAUExrNoi5bXg6vL8EZQxM8MUQ00ASPpHafpmWF1QrjPXvzGZLk0PoBnMvazDKmexP6/YKi6B+19laKTz/2hKwcWa0m1MHwTYPqNvCFH/3wLYft/4p/AqZFuT6/gkkHAAAAAElFTkSuQmCC"/>
              <image width="54" height="12" transform="translate(506 401)" xlinkHref="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADYAAAAMCAYAAAAppE4WAAAACXBIWXMAAAsSAAALEgHS3X78AAAE/0lEQVRIie2WzYtlRxnGf2993a++3X1v3547PSZhcEBihkGiGNEkC/+FuFNxoUbIQtRF8g+ILtSdSsCoMBHBLFUI2fix8COMYogBM46YSdvpJEx33+6+fb/OqVP1ujh3enowAbNw5wvvqXOqoKqeep/nqSNPfPVJBVDuDuGdQwBEsMZijMH7gA8BayyDzQHdbhdrHccnY6bTCcViwcH+Poowm84AAxiKsmAxnzOZTBgfH2K9Q1UxRlAUVYWUSAqDfp/13jr9fp/vfueb77a1u8Ld9aVnEJplV67RyFm0quScyJqpUoX3AWctAjjn+PCDH6LXW8VZi3eWnJRYVUynMybTKd1Om739ESudNqPR8XIuJaMkTSyqkpuvb/Psj57l8pUHeWPnNd5/7n7OD3r84dqf9eMf/Qg3bm7z7e8/Q5rP6/1UC4oy8rOrPxQAl7PinKWqIoIgYpYpNUpbYwkhgCqKUsZICAFjDNZaxChiYXQ4Yjg8T/COrc2N22dzJzb7p6+XLt77rqedcmb7rVtcfuAKP/3Jc6ys9Fnt9lgfXCD7FrtHE46mBedWV2lsbrAx2OAD93+Q6WTCQw99TGezGfLyjW0NIdDwvgZkTE016zBGEBGCN7S8xRrBGUEEjLwzI1SVCBxMSg739vjVr3/Ll7/4WR7/ylNY52i12nTXVgmhQbfbrels3R3GAFVVkapErCrmswlv7u7w11deob8x4OJ9F7mwtcW8KMg5c/3vr9LtdllfXWWl02FruMnW5gD5zOe/pDkrmhUBREBEEMAYQ9a631iLWIMxFgWstTjvaTQaeO/x3hN8wBrBWkOr0+aRRz/JX669yBu7u9w6OGJ/720ODkakKgOKmHo+Yww5Z1xoIMaRUkVOiVyVOGc5Ho+Zz2YYYxgOh6ytrRF8YLGY02y12djYYDg8z6Jc1CrShHz9G9/SJemWwAREyDljRE4XZQkYIMaIMQZZVjQtx8uyJIRAWZa4RodUzhicO8/O9r+IseQfN7e598IWMZZcv/Ealy5dxNvAq9evc/mBK6wP+ljr6Pe6NINnNDrkjy/+jlhEUsrMZ1OcrdnSaLRABAW6a2tozvQ3NgneszkcIt97+geqWldK9Yx/CLXmlhS70wq1zGvu3G5vP731xDISFyVVqsia2T86oqqKU1/KqhgVJCtZBBHH7s7rTGYLZkXCO4MaJXiHd55PPPwwnXaHl/50jVRVnIyPibHEGrNcNTOLFdZYti7cw9VnnhaXU6aqEs5ZclayZnLONQVFMEtrF6m1JQjOOc7wFkVPKw3QaFkazeYpA3q9HkVRsPPmLkaFIhZUpNp5VXhrZ5t/3txhVhR0Ox3W1nt4Z5lNZ1Qp88LzL/DYpx6rrwBAjBBCIFUVCPzy57/4D8G7t2/tU8ZYO2OMpFhijKHdblPFSBUj1hpUawqKMUuQQrPZIoRAq9UkK4RmqLEZQVPGiKHZaC55Ltz3vnsYj8fsj0qa4jkpIifjMXt7IxZFgYgyX8xxU8ejVx4Bl1gUc15+6W987Ykv/Ff31ymww6MjDg4OWOv3iGVJjHUOe31iVRFTWmZFb6VLzJnVdhsRObX96XyBdRaXHVmVlDMN70gpcTKZ4q0jp1ybSqvF2uoao6NDpvOy1rMqZSzxwdWurLAoF2hKCPD73zz/nkAByKc/97iWsTzzq7HUi+ipYz139cfveeL/x/8o/g16hFr4Dwe31QAAAABJRU5ErkJggg=="/>
              <image width="40" height="465" transform="translate(506 411)" xlinkHref="data:image/png;base64,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"/>
            </g>
            <g class="pqr-135">
              <g id="MeshGrid">
                <g>
                  <path class="pqr-52" d="M466.35,411.27c.07.13.14.26.19.39-.1,0-.2,0-.3,0-.06-.13-.13-.26-.2-.38.1,0,.2-.01.31-.02Z"/>
                  <path class="pqr-209" d="M465.76,410.48c.13.13.25.27.35.42.09.12.17.24.24.37-.11,0-.21,0-.31.02-.07-.12-.16-.23-.24-.34-.11-.14-.23-.26-.35-.38.1-.02.2-.05.31-.08Z"/>
                  <path class="pqr-407" d="M464.79,409.78c.2.1.39.22.56.34.14.11.28.22.41.35-.11.03-.22.05-.31.08-.13-.12-.26-.23-.41-.33-.17-.12-.35-.23-.55-.33.09-.04.19-.07.29-.11Z"/>
                  <path class="pqr-446" d="M463.76,409.38c.13.04.25.08.37.12.23.08.45.18.66.28-.11.03-.21.07-.29.11-.19-.1-.4-.19-.61-.26-.11-.04-.23-.08-.35-.11.07-.05.14-.09.23-.14Z"/>
                  <path class="pqr-146" d="M461.64,409.01c.58.05,1.17.13,1.74.26.13.03.26.07.39.11-.08.05-.16.09-.23.14-.12-.03-.24-.07-.36-.09-.61-.14-1.24-.2-1.87-.24.11-.05.22-.11.34-.17Z"/>
                  <path class="pqr-272" d="M458.65,408.79c.41.04.83.07,1.23.09.58.04,1.18.07,1.76.12-.12.06-.22.12-.34.17-.63-.04-1.27-.05-1.89-.09-.45-.03-.92-.06-1.38-.1.2-.06.39-.13.61-.19Z"/>
                  <path class="pqr-346" d="M456.33,408.5c.34.06.71.12,1.1.17.39.05.8.09,1.21.13-.21.07-.41.13-.61.19-.46-.04-.92-.08-1.35-.13-.47-.05-.92-.11-1.33-.18.27-.07.62-.12.98-.18Z"/>
                  <path class="pqr-307" d="M454.66,407.87c.18.16.43.29.76.4.27.09.58.16.92.23-.36.06-.71.11-.98.18-.41-.07-.78-.15-1.09-.23-.39-.11-.69-.24-.84-.38.36-.08.79-.13,1.24-.19Z"/>
                  <path class="pqr-454" d="M454.18,406.86c.03.11.06.21.09.31.07.21.16.39.26.55.03.05.07.1.13.15-.45.05-.88.11-1.24.19-.05-.05-.09-.1-.11-.15-.07-.16-.13-.35-.19-.55-.03-.11-.06-.23-.09-.36.37-.05.75-.1,1.15-.14Z"/>
                  <path class="pqr-243" d="M454.02,406.26c.04.09.07.18.09.26.02.12.05.23.07.34-.4.04-.78.09-1.15.14-.03-.12-.05-.25-.07-.37-.01-.08-.02-.15-.03-.23.34-.05.71-.1,1.09-.14Z"/>
                  <path class="pqr-176" d="M453.83,405.8c.02.06.05.13.07.19.04.09.08.18.12.27-.38.04-.75.09-1.09.14,0-.08-.02-.15-.02-.23,0-.05,0-.11,0-.16.31-.08.61-.15.93-.21Z"/>
                  <path class="pqr-70" d="M453.75,405.38c.01.08.04.16.04.24,0,.06.02.12.04.18-.32.06-.63.13-.93.21,0-.05,0-.11,0-.16,0-.07,0-.14,0-.21.28-.1.55-.19.85-.26Z"/>
                  <path class="pqr-78" d="M453.71,404.77c.01.12.04.25.02.37-.01.08,0,.16.02.24-.3.07-.57.15-.85.26,0-.07.01-.14.02-.21.01-.11.03-.21.06-.31.23-.14.47-.25.73-.34Z"/>
                  <path class="pqr-61" d="M453.74,404.31s-.01.08-.03.11c-.04.1-.02.23,0,.34-.27.09-.5.2-.73.34.03-.1.06-.2.1-.29.01-.03.03-.07.04-.1.19-.17.39-.3.62-.41Z"/>
                  <path class="pqr-61" d="M453.77,404.07s-.02.09-.02.13c0,.04,0,.08-.01.11-.24.11-.43.24-.62.41.02-.03.03-.06.05-.09.02-.04.04-.07.07-.11.17-.18.34-.33.54-.45Z"/>
                  <path class="pqr-401" d="M453.83,403.95s-.04.08-.06.12c-.21.12-.38.27-.54.45.02-.03.05-.07.08-.1.16-.19.32-.34.53-.47Z"/>
                  <path class="pqr-41" d="M467,411.24c.06.14.11.28.15.42-.1,0-.2,0-.3,0-.1,0-.2,0-.31,0-.05-.13-.12-.26-.19-.39.11,0,.22,0,.32-.02.1,0,.21-.01.32-.01Z"/>
                  <path class="pqr-46" d="M466.45,410.33c.12.15.24.31.33.48.08.14.15.28.21.42-.11,0-.22,0-.32.01-.11,0-.22.01-.32.02-.07-.13-.15-.25-.24-.37-.11-.15-.23-.29-.35-.42.11-.03.22-.05.34-.08.11-.02.23-.05.35-.07Z"/>
                  <path class="pqr-395" d="M465.45,409.57c.23.11.43.24.6.37.14.11.28.25.4.4-.12.03-.24.05-.35.07-.11.02-.23.05-.34.08-.13-.13-.27-.25-.41-.35-.17-.12-.36-.24-.56-.34.11-.03.22-.07.32-.11.1-.04.22-.07.34-.11Z"/>
                  <path class="pqr-218" d="M464.3,409.1c.14.05.28.1.42.15.26.1.51.2.74.32-.12.03-.24.07-.34.11-.11.04-.22.07-.32.11-.2-.1-.42-.2-.66-.28-.12-.04-.25-.09-.37-.12.08-.04.17-.09.26-.14.09-.05.18-.09.28-.14Z"/>
                  <path class="pqr-275" d="M462.48,408.67c.47.07.94.16,1.39.29.14.04.29.09.43.13-.1.04-.19.09-.28.14-.09.05-.18.09-.26.14-.13-.04-.26-.07-.39-.11-.56-.14-1.15-.21-1.74-.26.12-.06.24-.12.39-.18.15-.06.29-.1.45-.15Z"/>
                  <path class="pqr-354" d="M460.11,408.4c.31.04.63.07.94.1.48.05.96.1,1.43.17-.15.05-.3.1-.45.15-.15.06-.27.12-.39.18-.58-.05-1.18-.08-1.76-.12-.41-.03-.82-.06-1.23-.09.21-.07.44-.14.69-.2.25-.06.5-.13.76-.19Z"/>
                  <path class="pqr-58" d="M458.36,408.1c.25.06.51.12.81.17.31.06.62.1.93.14-.26.06-.51.13-.76.19-.26.07-.48.13-.69.2-.41-.04-.82-.08-1.21-.13-.39-.05-.76-.11-1.1-.17.36-.06.74-.11,1.08-.18.31-.06.63-.14.95-.22Z"/>
                  <path class="pqr-81" d="M457.13,407.49c.16.16.35.29.57.39.2.09.41.16.66.22-.32.08-.64.16-.95.22-.34.07-.71.13-1.08.18-.34-.06-.65-.14-.92-.23-.32-.11-.58-.24-.76-.4.45-.05.91-.11,1.33-.17.37-.05.76-.13,1.15-.21Z"/>
                  <path class="pqr-210" d="M456.65,406.61c.03.09.06.17.09.25.11.26.24.46.4.63-.39.08-.78.16-1.15.21-.42.07-.88.12-1.33.17-.05-.05-.09-.1-.13-.15-.1-.16-.18-.34-.26-.55-.03-.1-.07-.2-.09-.31.4-.04.81-.09,1.24-.12.4-.04.82-.08,1.23-.13Z"/>
                  <path class="pqr-441" d="M456.41,406.04c.06.1.14.19.16.29.02.1.05.19.08.28-.42.04-.83.09-1.23.13-.42.04-.84.08-1.24.12-.03-.11-.05-.22-.07-.34-.02-.08-.05-.18-.09-.26.38-.04.78-.08,1.19-.12.39-.04.79-.07,1.21-.1Z"/>
                  <path class="pqr-57" d="M456.06,405.54c.03.07.09.14.14.21.06.1.16.19.22.29-.42.03-.82.07-1.21.1-.4.04-.8.07-1.19.12-.04-.09-.08-.18-.12-.27-.03-.06-.05-.13-.07-.19.32-.06.66-.11,1.04-.15.36-.04.76-.08,1.19-.11Z"/>
                  <path class="pqr-431" d="M455.89,405.07c.02.09.07.18.09.27,0,.07.05.13.08.2-.43.03-.82.07-1.19.11-.38.04-.72.09-1.04.15-.02-.06-.03-.13-.04-.18,0-.08-.03-.16-.04-.24.3-.07.62-.13.98-.18.35-.05.73-.09,1.16-.13Z"/>
                  <path class="pqr-260" d="M455.8,404.38c.02.14.08.28.05.42-.02.09.01.18.04.27-.43.04-.81.08-1.16.13-.36.05-.68.11-.98.18-.01-.08-.03-.16-.02-.24.02-.12-.01-.25-.02-.37.27-.09.56-.17.91-.23.34-.06.72-.11,1.19-.16Z"/>
                  <path class="pqr-337" d="M455.78,403.85s0,.09-.01.13c-.04.12.02.26.04.39-.46.05-.85.1-1.19.16-.35.06-.64.14-.91.23-.01-.12-.03-.24,0-.34.01-.04.02-.08.03-.11.24-.11.51-.19.85-.27.33-.07.71-.13,1.19-.19Z"/>
                  <path class="pqr-337" d="M455.78,403.57c-.01.05,0,.1,0,.15,0,.04,0,.09,0,.13-.48.06-.87.12-1.19.19-.34.07-.61.16-.85.27,0-.04,0-.08.01-.11,0-.04,0-.09.02-.13.21-.12.46-.22.79-.3.32-.08.72-.14,1.22-.21Z"/>
                  <path class="pqr-433" d="M455.84,403.42s-.04.1-.05.15c-.5.06-.9.13-1.22.21-.33.08-.58.18-.79.3.01-.04.03-.08.06-.12.21-.13.46-.23.79-.31.32-.08.71-.15,1.22-.22Z"/>
                  <path class="pqr-192" d="M467.37,411.2c.06.15.1.3.14.45-.02,0-.03,0-.05,0-.1,0-.21,0-.31,0-.04-.14-.09-.28-.15-.42.11,0,.22,0,.33-.01.02,0,.03-.01.04-.02Z"/>
                  <path class="pqr-183" d="M466.88,410.24c.11.16.21.33.29.51.07.14.14.3.19.45-.01.01-.02.02-.04.02-.11,0-.22.01-.33.01-.06-.14-.13-.28-.21-.42-.1-.17-.21-.33-.33-.48.12-.03.25-.05.37-.07.02,0,.04,0,.06-.02Z"/>
                  <path class="pqr-201" d="M465.87,409.45c.24.12.45.24.62.38.15.12.28.26.39.41-.02,0-.04.01-.06.02-.12.02-.25.05-.37.07-.12-.15-.26-.28-.4-.4-.17-.13-.37-.25-.6-.37.12-.03.25-.07.36-.11.02,0,.03,0,.05-.01Z"/>
                  <path class="pqr-289" d="M464.65,408.95c.15.05.3.11.44.16.28.11.54.22.78.34-.02,0-.03,0-.05.01-.12.04-.24.07-.36.11-.23-.11-.48-.22-.74-.32-.14-.05-.28-.1-.42-.15.1-.05.2-.09.31-.14.02,0,.03-.01.04-.02Z"/>
                  <path class="pqr-444" d="M463.04,408.53c.39.07.78.15,1.17.27.15.05.3.1.45.15-.01,0-.03,0-.04.02-.11.05-.21.09-.31.14-.14-.05-.28-.09-.43-.13-.45-.13-.92-.22-1.39-.29.15-.05.31-.1.48-.15.02,0,.05,0,.08,0Z"/>
                  <path class="pqr-297" d="M461.05,408.2c.27.05.54.09.8.14.39.06.79.12,1.18.19-.03,0-.06,0-.08,0-.17.05-.33.1-.48.15-.47-.07-.95-.12-1.43-.17-.32-.03-.63-.06-.94-.1.26-.06.53-.13.81-.18.04,0,.09-.01.13-.02Z"/>
                  <path class="pqr-277" d="M459.57,407.87c.21.06.44.11.68.16.27.06.54.11.81.16-.05,0-.1.01-.13.02-.28.06-.55.12-.81.18-.31-.04-.62-.08-.93-.14-.3-.05-.57-.11-.81-.17.32-.08.65-.16.99-.21.05,0,.13,0,.21,0Z"/>
                  <path class="pqr-264" d="M458.46,407.29c.14.16.32.27.52.37.18.09.37.15.58.21-.08,0-.17,0-.21,0-.34.06-.67.14-.99.21-.25-.06-.46-.13-.66-.22-.22-.1-.41-.23-.57-.39.39-.08.79-.16,1.18-.19.05,0,.1,0,.15,0Z"/>
                  <path class="pqr-331" d="M458.07,406.48c.02.08.04.15.07.23.07.24.18.43.33.59-.05,0-.1,0-.15,0-.39.04-.79.12-1.18.19-.16-.16-.29-.37-.4-.63-.03-.08-.06-.16-.09-.25.42-.04.84-.08,1.26-.11.06,0,.11-.01.16-.02Z"/>
                  <path class="pqr-54" d="M457.9,405.93c.04.1.08.2.12.3.01.08.03.16.05.24-.05.01-.11.02-.16.02-.42.03-.84.07-1.26.11-.03-.09-.05-.18-.08-.28-.02-.1-.11-.19-.16-.29.42-.03.85-.06,1.31-.1.07,0,.12,0,.18-.01Z"/>
                  <path class="pqr-169" d="M457.69,405.42c.02.07.05.14.08.21.04.1.09.2.13.3-.06,0-.12,0-.18.01-.45.03-.89.06-1.31.1-.06-.1-.16-.19-.22-.29-.04-.07-.1-.14-.14-.21.43-.03.9-.07,1.41-.11.07,0,.15-.01.22-.02Z"/>
                  <path class="pqr-449" d="M457.6,404.92c0,.1.02.19.04.29.01.07.03.14.05.21-.08,0-.15.01-.22.02-.51.04-.98.07-1.41.11-.03-.07-.08-.14-.08-.2-.01-.09-.06-.18-.09-.27.43-.04.92-.08,1.47-.13.08,0,.16-.01.24-.02Z"/>
                  <path class="pqr-335" d="M457.71,404.2c-.02.14-.04.29-.09.44-.03.1-.03.19-.03.29-.08,0-.16.01-.24.02-.55.04-1.04.08-1.47.13-.02-.09-.06-.18-.04-.27.04-.14-.03-.28-.05-.42.46-.05,1-.1,1.63-.16.09,0,.18-.02.28-.02Z"/>
                  <path class="pqr-7" d="M457.84,403.64s-.03.09-.04.14c-.04.13-.06.27-.08.41-.1,0-.19.02-.28.02-.63.06-1.17.1-1.63.16-.02-.14-.08-.27-.04-.39.01-.04,0-.09.01-.13.48-.06,1.05-.12,1.76-.18.1,0,.2-.02.31-.03Z"/>
                  <path class="pqr-250" d="M457.96,403.34c-.03.05-.05.11-.07.16-.02.05-.03.09-.05.14-.1,0-.21.02-.31.03-.7.06-1.28.12-1.76.18,0-.04,0-.09,0-.13,0-.05,0-.1,0-.15.5-.06,1.1-.12,1.84-.19.11,0,.22-.02.33-.03Z"/>
                  <path class="pqr-435" d="M458.05,403.18c-.04.05-.07.11-.1.16-.11.01-.22.02-.33.03-.74.07-1.34.13-1.84.19.01-.05.02-.1.05-.15.51-.07,1.12-.13,1.88-.2.11-.01.22-.02.34-.03Z"/>
                  <path class="pqr-192" d="M467.72,411.19c.05.16.09.32.12.47-.1,0-.19,0-.29,0h-.05c-.04-.15-.08-.3-.14-.45.01-.01.02-.02.04-.02.1,0,.21,0,.31,0Z"/>
                  <path class="pqr-183" d="M467.28,410.17c.11.17.19.35.26.54.06.15.12.31.17.47-.11,0-.21-.02-.31,0-.02,0-.03.01-.04.02-.06-.15-.12-.3-.19-.45-.08-.18-.18-.35-.29-.51.02,0,.04-.01.06-.02.11-.02.23-.04.35-.06Z"/>
                  <path class="pqr-201" d="M466.27,409.34c.25.12.46.25.63.39.15.12.28.27.38.44-.12.02-.24.04-.35.06-.02,0-.04,0-.06.02-.11-.16-.25-.3-.39-.41-.17-.13-.38-.26-.62-.38.02,0,.03,0,.05-.01.11-.03.23-.07.35-.1Z"/>
                  <path class="pqr-380" d="M465,408.81c.15.06.31.12.46.18.29.11.57.23.81.36-.12.03-.24.06-.35.1-.02,0-.03,0-.05.01-.24-.12-.5-.23-.78-.34-.15-.06-.29-.11-.44-.16.01,0,.03,0,.04-.01.1-.04.2-.08.31-.13Z"/>
                  <path class="pqr-444" d="M463.57,408.39c.33.08.65.15.97.26.15.05.31.11.46.17-.11.04-.21.08-.31.13-.02,0-.03.01-.04.01-.15-.05-.3-.1-.45-.15-.38-.11-.77-.2-1.17-.27.03,0,.06,0,.08,0,.15-.04.3-.09.45-.14Z"/>
                  <path class="pqr-258" d="M461.91,408.01c.23.05.45.11.67.16.33.08.65.14.98.22-.15.05-.3.1-.45.14-.02,0-.05,0-.08,0-.39-.07-.79-.13-1.18-.19-.27-.04-.54-.09-.8-.14.05,0,.1-.01.14-.02.25-.05.49-.11.73-.17Z"/>
                  <path class="pqr-277" d="M460.67,407.67c.18.06.37.11.56.16.23.06.45.12.68.17-.24.06-.48.12-.73.17-.04,0-.09.01-.14.02-.27-.05-.54-.1-.81-.16-.24-.05-.46-.1-.68-.16.08,0,.17,0,.21,0,.31-.05.6-.13.89-.2Z"/>
                  <path class="pqr-172" d="M459.71,407.1c.13.14.28.26.46.36.16.08.32.15.5.21-.29.07-.59.14-.89.2-.05,0-.13,0-.21,0-.21-.06-.41-.13-.58-.21-.2-.1-.37-.22-.52-.37.05,0,.1,0,.15,0,.35-.04.73-.11,1.09-.18Z"/>
                  <path class="pqr-235" d="M459.36,406.37c.02.07.04.14.06.2.06.21.16.39.29.53-.37.07-.74.14-1.09.18-.05,0-.1,0-.15,0-.14-.16-.25-.35-.33-.59-.03-.07-.05-.15-.07-.23.05-.01.11-.02.16-.02.38-.03.76-.06,1.13-.08Z"/>
                  <path class="pqr-358" d="M459.2,405.85c.04.1.08.2.11.31.01.07.03.14.04.21-.38.03-.76.05-1.13.08-.06,0-.11.01-.16.02-.02-.08-.04-.16-.05-.24-.03-.1-.07-.2-.12-.3.06,0,.12,0,.19-.01.37-.02.75-.05,1.12-.07Z"/>
                  <path class="pqr-450" d="M459.01,405.33c.02.07.04.14.07.22.04.1.08.2.12.3-.37.02-.74.05-1.12.07-.07,0-.13,0-.19.01-.04-.1-.09-.2-.13-.3-.03-.07-.06-.14-.08-.21.08,0,.15-.01.23-.02.37-.03.73-.05,1.1-.07Z"/>
                  <path class="pqr-7" d="M458.9,404.83c.02.1.06.19.07.29,0,.07.02.14.04.22-.36.02-.73.05-1.1.07-.08,0-.15.01-.23.02-.02-.07-.04-.14-.05-.21-.02-.1-.03-.19-.04-.29.08,0,.17-.01.25-.02.24-.02.49-.04.75-.06.1,0,.2-.01.31-.02Z"/>
                  <path class="pqr-137" d="M459.02,404.09c-.03.14-.07.29-.13.44-.03.1,0,.19.01.29-.1,0-.21.01-.31.02-.25.02-.5.04-.75.06-.08,0-.17.01-.25.02,0-.1,0-.19.03-.29.05-.15.07-.3.09-.44.1,0,.19-.02.29-.02.23-.02.48-.04.72-.06.1,0,.2-.01.3-.02Z"/>
                  <path class="pqr-349" d="M459.16,403.53s-.03.1-.04.14c-.04.14-.07.28-.1.42-.1,0-.2.01-.3.02-.24.02-.49.04-.72.06-.1,0-.2.02-.29.02.02-.14.04-.28.08-.41.01-.05.03-.1.04-.14.1,0,.21-.02.32-.03.34-.03.67-.06,1-.08Z"/>
                  <path class="pqr-421" d="M459.3,403.22c-.03.05-.06.11-.09.17-.02.05-.04.09-.05.14-.33.03-.67.05-1,.08-.11,0-.22.02-.32.03.01-.05.03-.09.05-.14.02-.05.04-.11.07-.16.11-.01.23-.02.35-.03.34-.03.67-.06,1-.09Z"/>
                  <path class="pqr-32" d="M459.41,403.06c-.04.05-.08.11-.11.16-.33.03-.66.06-1,.09-.12.01-.23.02-.35.03.03-.05.06-.11.1-.16.11-.01.23-.02.35-.03.34-.03.67-.06,1.01-.09Z"/>
                  <path class="pqr-407" d="M468.48,411.13c.03.17.06.35.08.52-.14,0-.29,0-.43,0-.1,0-.2,0-.29,0-.03-.15-.07-.31-.12-.47.11,0,.22.02.32,0,.15,0,.3-.04.44-.06Z"/>
                  <path class="pqr-166" d="M468.18,410.02c.09.18.15.38.19.59.04.17.08.35.11.52-.15.03-.29.05-.44.06-.11,0-.21,0-.32,0-.05-.16-.1-.32-.17-.47-.07-.19-.16-.38-.26-.54.12-.02.24-.04.36-.06.17-.03.35-.06.54-.1Z"/>
                  <path class="pqr-13" d="M467.19,409.13c.25.13.47.27.64.41.15.14.27.3.36.48-.18.03-.36.07-.54.1-.12.02-.24.04-.36.06-.11-.17-.23-.31-.38-.44-.17-.13-.38-.26-.63-.39.12-.03.25-.06.37-.09.17-.05.36-.09.54-.12Z"/>
                  <path class="pqr-141" d="M465.86,408.54c.16.07.33.13.48.2.3.13.59.26.84.39-.19.04-.37.08-.54.12-.12.03-.25.06-.37.09-.25-.12-.52-.24-.81-.36-.15-.06-.31-.12-.46-.18.11-.04.22-.08.34-.12.16-.06.34-.11.52-.15Z"/>
                  <path class="pqr-163" d="M464.72,408.07c.23.09.43.17.65.26.16.07.33.13.49.2-.19.05-.36.09-.52.15-.11.04-.23.08-.34.12-.15-.06-.31-.11-.46-.17-.32-.1-.64-.18-.97-.26.15-.05.3-.1.46-.15.24-.07.46-.12.69-.17Z"/>
                  <path class="pqr-82" d="M463.64,407.63c.14.06.28.12.42.18.22.09.42.18.65.26-.23.05-.45.1-.69.17-.16.05-.31.1-.46.15-.33-.08-.66-.14-.98-.22-.22-.05-.45-.11-.67-.16.24-.06.48-.12.72-.17.36-.07.69-.14,1.01-.2Z"/>
                  <path class="pqr-47" d="M462.83,407.24c.12.07.25.14.4.2.14.06.27.13.41.19-.32.06-.66.13-1.01.2-.24.05-.48.11-.72.17-.23-.05-.45-.11-.68-.17-.19-.05-.38-.1-.56-.16.29-.07.58-.14.88-.19.42-.07.86-.16,1.28-.24Z"/>
                  <path class="pqr-360" d="M462.21,406.7c.09.12.18.22.29.31.1.08.21.16.33.23-.42.08-.86.17-1.28.24-.3.05-.59.12-.88.19-.18-.06-.35-.13-.5-.21-.18-.1-.33-.21-.46-.36.37-.07.73-.14,1.07-.18.48-.04.96-.14,1.43-.23Z"/>
                  <path class="pqr-296" d="M461.94,406.17s.03.09.05.14c.06.15.13.27.22.39-.46.09-.95.18-1.43.23-.34.04-.7.11-1.07.18-.13-.14-.23-.32-.29-.53-.02-.07-.04-.13-.06-.2.38-.03.75-.05,1.11-.08.51-.03,1.01-.08,1.48-.12Z"/>
                  <path class="pqr-74" d="M461.78,405.72c.03.1.08.2.11.3.02.05.03.1.05.15-.47.04-.97.09-1.48.12-.36.03-.73.05-1.11.08-.02-.07-.03-.14-.04-.21-.03-.1-.07-.2-.11-.31.37-.02.74-.04,1.1-.06.52-.03,1.01-.05,1.48-.07Z"/>
                  <path class="pqr-261" d="M461.66,405.2c0,.07.02.14.03.22.02.1.06.2.09.3-.47.02-.96.05-1.48.07-.36.02-.73.04-1.1.06-.04-.1-.09-.2-.12-.3-.03-.07-.05-.14-.07-.22.36-.02.72-.04,1.09-.06.52-.03,1.04-.05,1.55-.07Z"/>
                  <path class="pqr-244" d="M461.6,404.69c0,.1.07.19.05.29-.01.07,0,.14,0,.22-.51.02-1.03.05-1.55.07-.37.02-.73.04-1.09.06-.02-.07-.03-.14-.04-.22,0-.1-.05-.19-.07-.29.35-.02.71-.04,1.08-.06.52-.03,1.06-.05,1.62-.07Z"/>
                  <path class="pqr-27" d="M461.76,403.96c-.07.15-.08.29-.16.44-.05.1,0,.19,0,.29-.56.02-1.1.05-1.62.07-.37.02-.73.04-1.08.06-.02-.1-.04-.19-.01-.29.05-.15.1-.3.13-.44.33-.02.68-.04,1.04-.06.51-.03,1.07-.05,1.7-.07Z"/>
                  <path class="pqr-127" d="M461.99,403.39s-.04.1-.07.15c-.08.14-.09.28-.16.43-.62.02-1.19.05-1.7.07-.36.02-.71.04-1.04.06.03-.14.07-.28.1-.42.01-.05.03-.1.04-.14.33-.03.67-.05,1-.07.51-.03,1.13-.05,1.83-.08Z"/>
                  <path class="pqr-6" d="M462.19,403.07c-.05.06-.07.11-.11.17-.04.05-.05.1-.08.14-.7.03-1.32.05-1.83.08-.34.02-.67.04-1,.07.02-.05.03-.1.05-.14.02-.06.05-.11.09-.17.33-.03.66-.05,1-.07.51-.03,1.15-.05,1.89-.08Z"/>
                  <path class="pqr-100" d="M462.32,402.91c-.06.05-.09.11-.13.16-.74.03-1.37.06-1.89.08-.34.02-.67.04-1,.07.03-.05.07-.11.11-.16.34-.03.67-.05,1.01-.07.51-.03,1.15-.06,1.9-.08Z"/>
                  <path class="pqr-2" d="M469.6,411.1c.04.18.07.37.1.54-.24,0-.48,0-.71,0-.15,0-.29,0-.44,0-.02-.16-.05-.34-.08-.52.15-.03.29-.05.45-.05.22,0,.44,0,.67.02Z"/>
                  <path class="pqr-414" d="M469.27,409.96c.1.19.16.39.21.61.05.17.09.36.13.54-.23-.01-.45-.03-.67-.02-.16,0-.31.03-.45.05-.03-.17-.07-.35-.11-.52-.04-.21-.1-.41-.19-.59.18-.03.37-.06.55-.08.19,0,.36.01.54.03Z"/>
                  <path class="pqr-396" d="M468.26,408.97c.24.16.46.32.63.48.15.15.27.32.37.51-.17-.01-.34-.03-.54-.03-.18.02-.37.05-.55.08-.09-.18-.21-.34-.36-.48-.16-.14-.39-.28-.64-.41.19-.04.38-.07.58-.11.18-.01.34-.03.5-.05Z"/>
                  <path class="pqr-276" d="M467,408.27c.16.08.31.15.46.23.28.15.56.31.8.47-.16.02-.32.04-.5.05-.19.04-.39.07-.58.11-.25-.13-.54-.26-.84-.39-.16-.07-.32-.13-.48-.2.19-.05.38-.09.58-.13.19-.04.37-.09.56-.13Z"/>
                  <path class="pqr-392" d="M466.08,407.81c.16.09.3.17.45.24.16.07.32.15.47.22-.19.04-.37.09-.56.13-.2.04-.39.09-.58.13-.16-.07-.33-.13-.49-.2-.23-.09-.43-.18-.65-.26.23-.05.45-.09.69-.15.22-.04.44-.08.67-.12Z"/>
                  <path class="pqr-352" d="M465.34,407.32c.09.06.18.13.28.2.15.1.3.2.46.29-.23.04-.46.08-.67.12-.24.05-.47.1-.69.15-.23-.09-.43-.17-.65-.26-.15-.06-.28-.12-.42-.18.32-.06.63-.12.93-.17.26-.04.51-.09.77-.14Z"/>
                  <path class="pqr-404" d="M464.83,406.91c.08.08.17.16.26.23.08.06.16.12.25.18-.25.05-.51.1-.77.14-.3.06-.61.11-.93.17-.14-.06-.27-.12-.41-.19-.15-.07-.28-.13-.4-.2.42-.08.82-.16,1.16-.21.27-.03.55-.08.84-.12Z"/>
                  <path class="pqr-196" d="M464.38,406.38c.07.1.14.19.22.29.07.08.14.16.22.24-.28.04-.56.08-.84.12-.34.05-.74.13-1.16.21-.12-.07-.23-.15-.33-.23-.11-.09-.21-.2-.29-.31.46-.09.91-.18,1.29-.21.28-.02.58-.07.88-.11Z"/>
                  <path class="pqr-84" d="M464.12,406s.04.06.06.09c.07.1.13.19.2.29-.3.04-.61.08-.88.11-.38.03-.83.12-1.29.21-.09-.12-.15-.24-.22-.39-.02-.05-.03-.09-.05-.14.47-.04.92-.09,1.32-.11.28-.02.56-.04.85-.06Z"/>
                  <path class="pqr-315" d="M464,405.62c0,.1.03.2.06.3.02.03.04.06.06.09-.29.02-.57.04-.85.06-.41.02-.85.06-1.32.11-.02-.05-.03-.1-.05-.15-.03-.1-.08-.2-.11-.3.47-.02.93-.04,1.37-.06.28-.01.56-.03.84-.04Z"/>
                  <path class="pqr-154" d="M464.04,405.1c-.02.07-.03.14-.04.22-.01.1-.01.2,0,.3-.28.01-.56.02-.84.04-.45.02-.9.04-1.37.06-.03-.1-.08-.2-.09-.3-.01-.07-.03-.14-.03-.22.51-.02,1.02-.04,1.52-.06.28-.01.57-.02.86-.03Z"/>
                  <path class="pqr-419" d="M464.18,404.6c-.03.1-.06.19-.08.28-.02.07-.04.14-.05.22-.29,0-.58.02-.86.03-.51.02-1.01.04-1.52.06,0-.07-.01-.14,0-.22.02-.1-.05-.19-.05-.29.56-.02,1.15-.05,1.75-.07.27,0,.55-.01.82-.02Z"/>
                  <path class="pqr-226" d="M464.55,403.88c-.1.15-.19.29-.26.44-.05.1-.08.19-.11.28-.27,0-.55.01-.82.02-.6.02-1.19.05-1.75.07,0-.1-.05-.19,0-.29.07-.15.09-.3.16-.44.62-.02,1.31-.05,2.06-.07.24,0,.49,0,.73,0Z"/>
                  <path class="pqr-224" d="M465.01,403.3c-.04.05-.09.1-.13.15-.12.14-.23.29-.33.43-.24,0-.49,0-.73,0-.75.03-1.44.05-2.06.07.07-.15.08-.29.16-.43.03-.05.04-.1.07-.15.7-.03,1.49-.05,2.34-.08.22,0,.45,0,.68,0Z"/>
                  <path class="pqr-280" d="M465.31,402.97c-.05.06-.11.12-.16.18-.05.05-.09.1-.13.15-.23,0-.46,0-.68,0-.85.03-1.64.06-2.34.08.03-.05.05-.1.08-.14.04-.06.06-.11.11-.17.74-.03,1.57-.06,2.48-.09.21,0,.42-.01.64-.01Z"/>
                  <path class="pqr-157" d="M465.47,402.8c-.05.06-.11.11-.16.17-.22,0-.43,0-.64.01-.91.03-1.74.06-2.48.09.05-.06.08-.11.13-.16.75-.03,1.6-.06,2.54-.09.2,0,.4-.01.61-.02Z"/>
                  <path class="pqr-223" d="M470.62,411.14c.07.17.12.34.17.5-.12,0-.24,0-.36,0-.25,0-.49,0-.73,0-.03-.18-.06-.36-.1-.54.23.01.46.03.69.03.11,0,.22,0,.33,0Z"/>
                  <path class="pqr-213" d="M470.1,410.03c.12.19.22.39.31.6.08.17.15.34.22.51-.11,0-.22,0-.33,0-.23,0-.46-.02-.69-.03-.04-.18-.08-.36-.13-.54-.04-.22-.11-.42-.21-.61.17.01.35.03.55.04.1,0,.19.01.28.03Z"/>
                  <path class="pqr-295" d="M469.06,408.95c.23.18.45.37.63.55.15.16.29.34.4.53-.09-.01-.18-.02-.28-.03-.2-.01-.38-.03-.55-.04-.1-.19-.22-.36-.37-.51-.17-.16-.39-.32-.63-.48.16-.02.33-.03.53-.03.1,0,.18,0,.27.01Z"/>
                  <path class="pqr-98" d="M467.91,408.14c.14.09.27.18.41.27.26.17.51.35.74.54-.09,0-.17-.01-.27-.01-.21,0-.37.02-.53.03-.24-.16-.52-.32-.8-.47-.15-.08-.31-.16-.46-.23.19-.04.39-.08.61-.11.11-.01.2-.02.3-.02Z"/>
                  <path class="pqr-402" d="M467.13,407.66c.13.09.25.17.37.23.13.08.27.16.41.25-.1,0-.19,0-.3.02-.22.03-.42.07-.61.11-.16-.08-.31-.15-.47-.22-.15-.07-.29-.15-.45-.24.23-.04.47-.07.71-.1.12-.02.23-.03.34-.04Z"/>
                  <path class="pqr-23" d="M466.52,407.18c.07.06.15.13.23.19.12.1.25.2.37.29-.11.01-.22.03-.34.04-.24.03-.48.07-.71.1-.16-.09-.31-.19-.46-.29-.1-.07-.19-.13-.28-.2.25-.05.51-.09.78-.13.13-.01.27-.02.41-.02Z"/>
                  <path class="pqr-99" d="M466.07,406.78c.07.07.16.15.25.22.06.06.13.12.21.18-.14,0-.28,0-.41.02-.27.03-.52.08-.78.13-.09-.06-.17-.13-.25-.18-.1-.07-.18-.15-.26-.23.28-.04.56-.08.84-.11.14-.01.27-.02.41-.02Z"/>
                  <path class="pqr-247" d="M465.66,406.29c.07.09.14.18.21.26.06.08.13.15.21.23-.14,0-.27,0-.41.02-.27.03-.56.07-.84.11-.08-.08-.15-.16-.22-.24-.08-.09-.15-.19-.22-.29.3-.04.61-.08.88-.1.14,0,.26,0,.39,0Z"/>
                  <path class="pqr-57" d="M465.39,405.94s.04.05.06.08c.07.09.14.17.2.26-.13,0-.25-.02-.39,0-.28.02-.58.06-.88.1-.07-.1-.14-.19-.2-.29-.02-.03-.04-.06-.06-.09.29-.02.57-.04.85-.05.14,0,.28,0,.42,0Z"/>
                  <path class="pqr-57" d="M465.27,405.58c0,.1.02.19.05.29.02.02.05.05.07.08-.14,0-.28,0-.42,0-.28.01-.56.03-.85.05-.02-.03-.04-.06-.06-.09-.03-.1-.05-.2-.06-.3.28-.01.56-.02.84-.03.14,0,.28,0,.44,0Z"/>
                  <path class="pqr-8" d="M465.32,405.08c-.01.07-.03.14-.03.21,0,.1-.02.19-.01.29-.15,0-.3,0-.44,0-.28,0-.56.02-.84.03,0-.1,0-.2,0-.3,0-.07.02-.14.04-.22.29,0,.58-.01.86-.02.14,0,.28,0,.42,0Z"/>
                  <path class="pqr-288" d="M465.41,404.59c-.02.09-.03.19-.05.28-.01.07-.03.14-.04.21-.14,0-.28,0-.42,0-.28,0-.57,0-.86.02.02-.07.03-.14.05-.22.03-.1.05-.19.08-.28.27,0,.55,0,.82-.01.13,0,.27,0,.41,0Z"/>
                  <path class="pqr-306" d="M465.67,403.87c-.08.15-.15.29-.19.44-.03.09-.05.19-.06.28-.14,0-.28,0-.41,0-.27,0-.55,0-.82.01.03-.1.07-.19.11-.28.07-.15.16-.3.26-.44.24,0,.49,0,.74-.01.12,0,.25,0,.38,0Z"/>
                  <path class="pqr-24" d="M466.05,403.28c-.04.05-.07.1-.11.15-.1.14-.19.29-.27.43-.13,0-.26,0-.38,0-.25,0-.49,0-.74.01.1-.15.21-.29.33-.43.04-.05.09-.1.13-.15.23,0,.46,0,.69-.01.11,0,.23,0,.35,0Z"/>
                  <path class="pqr-251" d="M466.29,402.95c-.04.06-.09.12-.13.18-.04.05-.07.1-.11.15-.12,0-.23,0-.35,0-.23,0-.46,0-.69.01.04-.05.09-.1.13-.15.05-.06.11-.12.16-.18.22,0,.44,0,.66-.02.11,0,.21,0,.32,0Z"/>
                  <path class="pqr-445" d="M466.41,402.77c-.04.06-.08.12-.13.18-.11,0-.22,0-.32,0-.22,0-.44.01-.66.02.05-.06.11-.11.16-.17.21,0,.42-.01.63-.02.1,0,.21,0,.31,0Z"/>
                  <path class="pqr-291" d="M472,411.22c.1.15.22.28.31.42-.39,0-.77,0-1.15,0-.12,0-.24,0-.36,0-.05-.16-.11-.33-.17-.5.11,0,.22,0,.33,0,.34.01.68.04,1.04.07Z"/>
                  <path class="pqr-378" d="M471.2,410.2c.15.19.32.39.45.58.11.15.25.29.35.44-.36-.03-.71-.06-1.04-.07-.11,0-.22,0-.33,0-.07-.17-.14-.34-.22-.51-.09-.21-.19-.41-.31-.6.09.01.18.03.28.04.26.03.53.08.82.13Z"/>
                  <path class="pqr-371" d="M470.05,409.01c.21.21.45.42.65.63.17.18.35.37.5.56-.29-.05-.56-.1-.82-.13-.1-.01-.19-.03-.28-.04-.12-.19-.25-.37-.4-.53-.18-.18-.4-.37-.63-.55.09,0,.17.02.27.03.23.01.46.02.72.04Z"/>
                  <path class="pqr-120" d="M469.06,408.1c.1.1.22.2.33.31.21.2.45.4.66.61-.27-.01-.49-.02-.72-.04-.1,0-.18-.02-.27-.03-.23-.18-.49-.36-.74-.54-.14-.09-.27-.18-.41-.27.1,0,.19,0,.3,0,.24-.01.52-.03.85-.04Z"/>
                  <path class="pqr-93" d="M468.5,407.56c.08.09.16.17.25.24.09.09.2.19.3.29-.33.01-.61.03-.85.04-.11,0-.2,0-.3,0-.14-.09-.27-.17-.41-.25-.12-.06-.24-.14-.37-.23.11-.01.22-.02.34-.03.28-.02.63-.04,1.03-.06Z"/>
                  <path class="pqr-90" d="M468.15,407.08c.05.06.09.13.14.19.07.1.12.2.21.29-.4.02-.75.04-1.03.06-.12,0-.23.02-.34.03-.13-.09-.25-.19-.37-.29-.08-.06-.16-.13-.23-.19.14,0,.28,0,.41,0,.35-.02.76-.06,1.21-.08Z"/>
                  <path class="pqr-165" d="M467.84,406.69c.05.07.11.13.17.2.05.07.09.13.14.19-.45.03-.86.06-1.21.08-.13,0-.27,0-.41,0-.07-.06-.14-.12-.21-.18-.09-.07-.17-.14-.25-.22.14,0,.27,0,.42,0,.39-.02.85-.05,1.35-.08Z"/>
                  <path class="pqr-235" d="M467.54,406.24c.05.08.1.16.15.24.05.07.1.14.15.21-.5.03-.96.06-1.35.08-.14,0-.28,0-.42,0-.07-.07-.14-.15-.21-.23-.07-.09-.14-.17-.21-.26.13,0,.26.02.42.01.44-.01.93-.04,1.47-.06Z"/>
                  <path class="pqr-178" d="M467.38,405.91s.02.05.04.08c.04.09.09.17.13.25-.53.02-1.03.04-1.47.06-.16,0-.29,0-.42-.01-.07-.09-.13-.18-.2-.26-.02-.03-.04-.06-.06-.08.14,0,.3,0,.46,0,.47-.01.98-.02,1.52-.03Z"/>
                  <path class="pqr-178" d="M467.28,405.56c.02.09.03.18.06.27.01.03.03.05.04.08-.55,0-1.06.02-1.52.03-.16,0-.31,0-.46,0-.02-.03-.05-.05-.07-.08-.03-.09-.04-.19-.05-.29.15,0,.31,0,.46,0,.46,0,.99-.01,1.54-.01Z"/>
                  <path class="pqr-248" d="M467.25,405.08c0,.07,0,.13,0,.2,0,.09,0,.18.03.28-.56,0-1.08,0-1.54.01-.16,0-.31,0-.46,0,0-.1,0-.19.01-.29,0-.07.02-.14.03-.21.14,0,.28,0,.42,0,.45,0,.97,0,1.5,0Z"/>
                  <path class="pqr-285" d="M467.27,404.6c0,.09-.02.18-.02.28,0,.07,0,.13,0,.2-.54,0-1.05,0-1.5,0-.14,0-.28,0-.42,0,.01-.07.03-.14.04-.21.02-.09.03-.19.05-.28.14,0,.28,0,.43,0,.44,0,.93,0,1.43.01Z"/>
                  <path class="pqr-379" d="M467.37,403.88c-.03.15-.06.3-.07.44,0,.09-.03.19-.03.28-.5,0-.99,0-1.43-.01-.14,0-.29,0-.43,0,.02-.09.03-.19.06-.28.05-.15.12-.29.19-.44.13,0,.27,0,.41,0,.41,0,.85,0,1.3.01Z"/>
                  <path class="pqr-96" d="M467.54,403.28c-.02.05-.04.11-.05.16-.05.15-.09.3-.12.45-.45,0-.89-.01-1.3-.01-.14,0-.27,0-.41,0,.08-.15.17-.29.27-.43.03-.05.07-.1.11-.15.12,0,.24,0,.36,0,.36,0,.75,0,1.14,0Z"/>
                  <path class="pqr-400" d="M467.67,402.92c-.02.06-.05.13-.07.19-.02.05-.04.11-.06.16-.39,0-.78,0-1.14,0-.12,0-.24,0-.36,0,.04-.05.07-.1.11-.15.04-.06.09-.12.13-.18.11,0,.22,0,.33,0,.34,0,.69-.01,1.05-.02Z"/>
                  <path class="pqr-372" d="M467.74,402.73c-.02.06-.05.13-.07.19-.36,0-.71.01-1.05.02-.11,0-.22,0-.33,0,.04-.06.09-.12.13-.18.11,0,.21,0,.32,0,.33,0,.66-.02,1.01-.03Z"/>
                  <path class="pqr-69" d="M473.47,411.26c.11.13.21.25.3.37-.1,0-.19,0-.29,0-.4,0-.79,0-1.18,0-.09-.14-.2-.27-.31-.42.36.03.73.05,1.12.05.12,0,.23,0,.35,0Z"/>
                  <path class="pqr-328" d="M472.68,410.29c.14.19.3.39.44.57.11.14.23.28.34.41-.12,0-.23,0-.35,0-.39,0-.76-.03-1.12-.05-.1-.15-.24-.29-.35-.44-.13-.19-.3-.39-.45-.58.29.05.61.1.99.12.17,0,.33-.02.5-.03Z"/>
                  <path class="pqr-187" d="M471.79,409.04c.16.22.33.44.47.67.12.19.27.39.42.58-.17.01-.33.03-.5.03-.37-.02-.69-.07-.99-.12-.15-.19-.33-.38-.5-.56-.2-.21-.44-.42-.65-.63.27.01.58.03.99.05.23-.01.49-.02.75-.02Z"/>
                  <path class="pqr-384" d="M471.16,408.05c.06.11.13.21.19.33.13.22.28.44.44.66-.26,0-.52.01-.75.02-.41-.02-.72-.04-.99-.05-.21-.21-.46-.41-.66-.61-.11-.1-.23-.21-.33-.31.33-.01.73-.02,1.2-.03.29,0,.59-.01.9-.02Z"/>
                  <path class="pqr-358" d="M470.91,407.48c.02.09.05.18.09.26.04.1.09.2.15.31-.32,0-.62,0-.9.02-.47,0-.86.02-1.2.03-.1-.1-.21-.2-.3-.29-.1-.07-.17-.16-.25-.24.4-.02.85-.04,1.35-.05.33,0,.69-.02,1.06-.03Z"/>
                  <path class="pqr-320" d="M470.85,407.01c.01.06.02.13.03.19,0,.1.01.19.03.28-.37.01-.73.02-1.06.03-.5.01-.95.03-1.35.05-.08-.09-.14-.19-.21-.29-.05-.06-.09-.13-.14-.19.45-.03.95-.05,1.47-.06.39,0,.8-.01,1.23-.01Z"/>
                  <path class="pqr-184" d="M470.76,406.62c0,.07.02.13.04.2.02.06.04.13.05.19-.43,0-.84,0-1.23.01-.52,0-1.02.03-1.47.06-.05-.06-.09-.13-.14-.19-.06-.07-.11-.13-.17-.2.5-.03,1.04-.05,1.58-.06.43,0,.87,0,1.34-.01Z"/>
                  <path class="pqr-305" d="M470.73,406.19c0,.08,0,.15.01.23,0,.07.01.13.02.2-.46,0-.91,0-1.34.01-.55,0-1.08.03-1.58.06-.05-.07-.1-.14-.15-.21-.05-.08-.1-.16-.15-.24.53-.02,1.1-.04,1.69-.04.48,0,.98,0,1.49,0Z"/>
                  <path class="pqr-327" d="M470.7,405.88s0,.05.01.07c.01.08.01.16.02.24-.51,0-1.01,0-1.49,0-.59,0-1.16.02-1.69.04-.05-.08-.09-.17-.13-.25-.01-.03-.02-.06-.04-.08.55,0,1.13-.02,1.75-.02.51,0,1.04,0,1.58,0Z"/>
                  <path class="pqr-327" d="M470.62,405.54c.02.09.05.18.07.27,0,.02.01.05.02.07-.54,0-1.07,0-1.58,0-.61,0-1.2.01-1.75.02-.01-.03-.03-.05-.04-.08-.03-.09-.04-.18-.06-.27.56,0,1.14,0,1.73-.01.52,0,1.05,0,1.61,0Z"/>
                  <path class="pqr-153" d="M470.5,405.06c.01.07.03.13.04.2.02.09.05.19.07.28-.55,0-1.09,0-1.61,0-.59,0-1.18,0-1.73.01-.02-.09-.02-.18-.03-.28,0-.07,0-.13,0-.2.54,0,1.1,0,1.64,0,.52,0,1.06-.01,1.62-.01Z"/>
                  <path class="pqr-127" d="M470.42,404.58c.01.09.03.18.04.28.01.07.02.14.04.2-.56,0-1.1,0-1.62.01-.54,0-1.1,0-1.64,0,0-.07,0-.13,0-.2,0-.09.01-.18.02-.28.5,0,1.02,0,1.53,0,.52,0,1.07-.01,1.62-.02Z"/>
                  <path class="pqr-290" d="M470.38,403.86c0,.15,0,.3.01.45,0,.09.01.19.03.28-.56,0-1.1.01-1.62.02-.5,0-1.02,0-1.53,0,0-.09.02-.18.03-.28.01-.15.04-.3.07-.44.45,0,.91,0,1.36,0,.53-.01,1.08-.02,1.65-.03Z"/>
                  <path class="pqr-448" d="M470.38,403.23c0,.06,0,.11,0,.17,0,.16,0,.31,0,.46-.57,0-1.12.02-1.65.03-.45,0-.91,0-1.36,0,.03-.15.08-.3.12-.45.02-.05.03-.11.05-.16.39,0,.79,0,1.19,0,.53-.01,1.08-.02,1.65-.04Z"/>
                  <path class="pqr-230" d="M470.42,402.86c0,.07-.02.14-.02.2,0,.06,0,.11-.01.17-.57.01-1.12.02-1.65.04-.4,0-.8,0-1.19,0,.02-.05.04-.11.06-.16.02-.06.05-.13.07-.19.36,0,.72-.01,1.1-.02.54-.01,1.09-.03,1.65-.04Z"/>
                  <path class="pqr-233" d="M470.45,402.66c-.01.07-.02.14-.03.21-.56.01-1.11.03-1.65.04-.37,0-.74.02-1.1.02.02-.06.05-.13.07-.19.34,0,.69-.02,1.05-.03.54-.01,1.09-.03,1.65-.04Z"/>
                  <path class="pqr-273" d="M474.21,411.22c.06.14.12.29.16.42-.1,0-.21,0-.31,0-.1,0-.19,0-.29,0-.09-.12-.19-.24-.3-.37.12,0,.23-.01.35-.02.13,0,.26-.02.39-.03Z"/>
                  <path class="pqr-267" d="M473.8,410.19c.06.19.14.39.21.57.06.15.13.3.2.45-.13,0-.26.02-.39.03-.12,0-.24.02-.35.02-.11-.13-.23-.26-.34-.41-.14-.18-.3-.38-.44-.57.17-.01.34-.03.53-.05.2-.01.39-.03.59-.05Z"/>
                  <path class="pqr-298" d="M473.54,409c.05.19.11.38.14.57,0,.02,0,.04.01.06,0,.18.05.37.11.57-.2.02-.39.03-.59.05-.19.01-.36.03-.53.05-.14-.19-.29-.39-.42-.58-.15-.23-.32-.45-.47-.67.26,0,.54,0,.82-.02.29,0,.61-.01.94-.02Z"/>
                  <path class="pqr-339" d="M473.33,408.04c0,.11.03.22.05.33.04.22.11.42.17.63-.33,0-.64.01-.94.02-.28,0-.55.01-.82.02-.16-.22-.32-.44-.44-.66-.06-.11-.14-.22-.19-.33.32,0,.65,0,1,0,.37,0,.76,0,1.17,0Z"/>
                  <path class="pqr-53" d="M473.42,407.45c-.05.09-.08.18-.09.26,0,0,0,0,0,0-.02.11-.01.22,0,.33-.41,0-.8,0-1.17,0-.35,0-.68,0-1,0-.06-.11-.11-.21-.15-.31-.04-.08-.07-.17-.09-.26.37-.01.76-.02,1.17-.03.43,0,.88,0,1.34,0Z"/>
                  <path class="pqr-245" d="M473.69,407c-.03.06-.06.12-.1.18-.06.09-.12.18-.17.27-.46,0-.9,0-1.34,0-.41,0-.8.01-1.17.03-.02-.09-.03-.19-.03-.28-.01-.06-.02-.12-.03-.19.43,0,.88,0,1.33,0,.49,0,.99,0,1.51,0Z"/>
                  <path class="pqr-164" d="M473.79,406.61c-.03.07-.05.13-.05.2,0,.06-.02.13-.05.19-.52,0-1.02,0-1.51,0-.46,0-.9,0-1.33,0-.01-.06-.03-.13-.05-.19-.02-.07-.03-.13-.04-.2.46,0,.94,0,1.43,0,.52,0,1.06,0,1.6,0Z"/>
                  <path class="pqr-140" d="M474.03,406.19c-.04.08-.1.15-.14.23-.04.07-.08.13-.1.2-.54,0-1.08,0-1.6,0-.49,0-.97,0-1.43,0,0-.07-.01-.13-.02-.2,0-.08,0-.15-.01-.23.51,0,1.04,0,1.57,0,.57,0,1.15,0,1.73,0Z"/>
                  <path class="pqr-365" d="M474.17,405.88s-.01.05-.02.07c-.02.08-.07.16-.11.24-.59,0-1.17,0-1.73,0-.53,0-1.06,0-1.57,0,0-.08,0-.16-.02-.24,0-.02,0-.05-.01-.07.54,0,1.1,0,1.66,0,.6,0,1.2,0,1.81,0Z"/>
                  <path class="pqr-365" d="M474.17,405.53c0,.09.02.18.01.27,0,.03,0,.05-.01.08-.61,0-1.22,0-1.81,0-.56,0-1.11,0-1.66,0,0-.02,0-.05-.02-.07-.02-.09-.05-.18-.07-.27.55,0,1.12,0,1.69,0,.61,0,1.23,0,1.86,0Z"/>
                  <path class="pqr-147" d="M474.1,405.06c.01.07.03.14.03.2.01.09.03.18.04.28-.63,0-1.25,0-1.86,0-.57,0-1.14,0-1.69,0-.02-.09-.05-.18-.07-.28-.01-.07-.03-.13-.04-.2.56,0,1.13,0,1.71,0,.62,0,1.25,0,1.88,0Z"/>
                  <path class="pqr-127" d="M474.04,404.57c0,.09.01.19.02.28,0,.07.02.14.03.21-.63,0-1.27,0-1.88,0-.58,0-1.15,0-1.71,0-.01-.07-.03-.13-.04-.2-.01-.09-.03-.18-.04-.28.56,0,1.13,0,1.72,0,.62,0,1.26,0,1.9,0Z"/>
                  <path class="pqr-127" d="M474.06,403.82c0,.16,0,.31-.02.46-.01.1,0,.19,0,.29-.64,0-1.28,0-1.9,0-.59,0-1.16,0-1.72,0-.01-.09-.02-.19-.03-.28,0-.15,0-.29-.01-.45.57,0,1.16-.01,1.75-.02.63,0,1.28-.01,1.93-.01Z"/>
                  <path class="pqr-211" d="M474.04,403.17c0,.06,0,.12,0,.18,0,.16.01.32.02.47-.66,0-1.3,0-1.93.01-.59,0-1.18.01-1.75.02,0-.15,0-.3,0-.46,0-.06,0-.11,0-.17.57-.01,1.15-.02,1.74-.03.63-.01,1.27-.02,1.92-.03Z"/>
                  <path class="pqr-185" d="M474.06,402.78c0,.07-.01.14-.01.21,0,.06,0,.12,0,.18-.65,0-1.29.02-1.92.03-.59,0-1.17.02-1.74.03,0-.06,0-.11.01-.17,0-.07.01-.13.02-.2.56-.01,1.14-.03,1.73-.04.63-.01,1.27-.03,1.91-.04Z"/>
                  <path class="pqr-10" d="M474.09,402.56c-.01.07-.02.15-.03.22-.65.01-1.29.03-1.91.04-.59.01-1.17.03-1.73.04,0-.07.02-.14.03-.21.56-.01,1.14-.03,1.73-.05.63-.02,1.26-.03,1.91-.05Z"/>
                  <path class="pqr-30" d="M475.06,411.18c0,.16-.02.31-.04.45-.11,0-.23,0-.34,0-.1,0-.21,0-.31,0-.04-.13-.1-.27-.16-.42.13,0,.27-.02.41-.02.15,0,.3-.01.44-.02Z"/>
                  <path class="pqr-361" d="M475.2,410.11c-.05.19-.07.4-.1.59-.02.16-.03.32-.04.47-.14,0-.29.02-.44.02-.14,0-.28.01-.41.02-.06-.14-.14-.3-.2-.45-.07-.19-.15-.38-.21-.57.2-.02.41-.03.64-.04.25-.01.5-.03.76-.04Z"/>
                  <path class="pqr-304" d="M475.72,408.96c-.07.18-.15.37-.25.54,0,.02-.01.03-.02.05-.13.18-.2.37-.25.57-.26.02-.51.03-.76.04-.23,0-.44.02-.64.04-.06-.19-.1-.38-.11-.57,0-.02,0-.04-.01-.06-.02-.19-.08-.38-.14-.57.33,0,.67-.01,1.01-.02.38,0,.77-.02,1.17-.02Z"/>
                  <path class="pqr-158" d="M476.1,408.02c-.05.11-.09.22-.14.33-.09.2-.16.41-.24.61-.4,0-.79.01-1.17.02-.35,0-.69.01-1.01.02-.06-.21-.13-.42-.17-.63-.02-.11-.04-.22-.05-.33.41,0,.83,0,1.27,0,.49,0,.99,0,1.5,0Z"/>
                  <path class="pqr-267" d="M476.53,407.44c-.09.08-.19.17-.25.26t0,0c-.08.11-.13.22-.18.33-.51,0-1.02,0-1.5,0-.44,0-.87,0-1.27,0,0-.11-.01-.22,0-.33,0,0,0,0,0,0,0-.09.04-.18.09-.26.46,0,.94,0,1.43,0,.54,0,1.11,0,1.69,0Z"/>
                  <path class="pqr-165" d="M477.02,407c-.06.06-.13.12-.18.18-.09.09-.21.17-.3.26-.58,0-1.14,0-1.69,0-.49,0-.97,0-1.43,0,.05-.09.11-.18.17-.27.03-.06.07-.12.1-.18.52,0,1.04,0,1.58,0,.58,0,1.17,0,1.76,0Z"/>
                  <path class="pqr-318" d="M477.3,406.62c-.06.07-.11.13-.14.19-.03.06-.08.13-.14.19-.59,0-1.17,0-1.76,0-.53,0-1.06,0-1.58,0,.03-.06.05-.13.05-.19,0-.06.03-.13.05-.2.54,0,1.09,0,1.65,0,.61,0,1.24,0,1.86,0Z"/>
                  <path class="pqr-119" d="M477.72,406.19c-.07.08-.17.15-.23.23-.06.07-.13.13-.19.2-.62,0-1.24,0-1.86,0-.56,0-1.11,0-1.65,0,.03-.07.07-.13.1-.2.04-.08.1-.15.14-.23.59,0,1.18,0,1.77,0,.65,0,1.29,0,1.92,0Z"/>
                  <path class="pqr-305" d="M477.97,405.87s-.03.05-.04.08c-.05.08-.13.16-.21.24-.63,0-1.27,0-1.92,0-.59,0-1.18,0-1.77,0,.04-.08.09-.16.11-.24,0-.02.02-.05.02-.07.61,0,1.22,0,1.83,0,.67,0,1.33,0,1.97,0Z"/>
                  <path class="pqr-305" d="M478.05,405.54c-.01.08-.02.17-.05.25,0,.03-.02.05-.03.08-.64,0-1.3,0-1.97,0-.61,0-1.22,0-1.83,0,0-.02.01-.05.01-.08,0-.09,0-.18-.01-.27.63,0,1.25,0,1.87,0,.68,0,1.35,0,2.01.01Z"/>
                  <path class="pqr-375" d="M478.09,405.09c0,.06,0,.13,0,.19-.01.09-.01.18-.03.26-.66,0-1.33-.01-2.01-.01-.62,0-1.25,0-1.87,0,0-.09-.03-.18-.04-.28,0-.07-.02-.13-.03-.2.63,0,1.27,0,1.91,0,.7,0,1.4.01,2.08.03Z"/>
                  <path class="pqr-127" d="M478.12,404.58c-.01.11-.01.21-.02.3,0,.07,0,.14,0,.2-.69-.02-1.38-.03-2.08-.03-.64,0-1.28,0-1.91,0-.01-.07-.02-.14-.03-.21,0-.09-.02-.19-.02-.28.64,0,1.29,0,1.94,0,.71,0,1.43,0,2.14.02Z"/>
                  <path class="pqr-127" d="M478.22,403.8c0,.16,0,.32-.05.47-.03.1-.04.2-.05.31-.71,0-1.43-.02-2.14-.02-.65,0-1.3,0-1.94,0,0-.09,0-.19,0-.29.02-.15.02-.3.02-.46.66,0,1.32,0,1.98-.01.72,0,1.45,0,2.17,0Z"/>
                  <path class="pqr-259" d="M478.23,403.12c0,.06,0,.12,0,.19-.01.17,0,.33,0,.49-.72,0-1.45,0-2.17,0-.66,0-1.32.01-1.98.01,0-.16-.01-.31-.02-.47,0-.06,0-.12,0-.18.65,0,1.31-.02,1.97-.03.73-.01,1.47-.02,2.21-.02Z"/>
                  <path class="pqr-200" d="M478.24,402.7c0,.08,0,.16-.01.23,0,.06,0,.13,0,.19-.74,0-1.48,0-2.21.02-.66.01-1.32.02-1.97.03,0-.06,0-.12,0-.18,0-.07,0-.14.01-.21.65-.01,1.3-.03,1.97-.04.73-.02,1.47-.03,2.22-.04Z"/>
                  <path class="pqr-69" d="M478.27,402.46c-.02.08-.02.15-.03.23-.75.01-1.49.03-2.22.04-.66.01-1.32.03-1.97.04,0-.07.02-.14.03-.22.65-.02,1.31-.03,1.97-.05.73-.02,1.47-.03,2.21-.05Z"/>
                  <path class="pqr-48" d="M475.86,411.14c-.08.17-.15.33-.23.49-.09,0-.18,0-.27,0-.12,0-.23,0-.34,0,.02-.15.03-.3.04-.45.14,0,.29-.02.45-.02.12,0,.24-.01.35-.02Z"/>
                  <path class="pqr-391" d="M476.62,410.03c-.18.2-.33.4-.47.6-.12.17-.2.34-.29.5-.12,0-.23.01-.35.02-.16,0-.3.02-.45.02,0-.16.02-.31.04-.47.03-.2.05-.4.1-.59.26-.02.52-.03.79-.05.21-.01.42-.02.63-.03Z"/>
                  <path class="pqr-310" d="M477.94,408.94c-.23.19-.45.37-.69.54-.25.17-.45.36-.63.55-.21.01-.42.02-.63.03-.27.01-.53.03-.79.05.05-.19.12-.39.25-.57,0-.02.01-.03.02-.05.1-.17.18-.35.25-.54.4,0,.81,0,1.23-.01.32,0,.65,0,.99,0Z"/>
                  <path class="pqr-129" d="M478.96,408.03c-.12.11-.23.23-.36.34-.22.19-.44.38-.66.57-.33,0-.66,0-.99,0-.42,0-.83,0-1.23.01.08-.2.15-.41.24-.61.05-.11.09-.22.14-.33.51,0,1.04,0,1.58,0,.41,0,.84,0,1.27,0Z"/>
                  <path class="pqr-31" d="M479.63,407.43c-.1.08-.21.17-.31.25-.13.11-.25.23-.37.34-.43,0-.86,0-1.27,0-.54,0-1.07,0-1.58,0,.05-.11.1-.22.18-.33t0,0c.06-.09.16-.17.25-.26.58,0,1.16,0,1.75,0,.45,0,.9,0,1.35,0Z"/>
                  <path class="pqr-348" d="M480.14,407c-.06.06-.14.12-.2.18-.1.09-.21.17-.31.26-.45,0-.91,0-1.35,0-.58,0-1.17,0-1.75,0,.09-.08.21-.17.3-.26.06-.06.13-.12.18-.18.59,0,1.18,0,1.77,0,.45,0,.9,0,1.35,0Z"/>
                  <path class="pqr-1" d="M480.51,406.62c-.06.07-.13.13-.19.19-.05.06-.12.13-.18.19-.45,0-.89,0-1.35,0-.59,0-1.18,0-1.77,0,.06-.06.11-.12.14-.19.03-.06.08-.13.14-.19.62,0,1.24,0,1.84,0,.46,0,.92,0,1.37,0Z"/>
                  <path class="pqr-232" d="M480.93,406.18c-.07.08-.15.16-.22.23-.06.07-.13.13-.2.2-.45,0-.91,0-1.37,0-.6,0-1.22,0-1.84,0,.06-.07.13-.13.19-.2.07-.08.16-.15.23-.23.63,0,1.25,0,1.86,0,.46,0,.91,0,1.35,0Z"/>
                  <path class="pqr-427" d="M481.19,405.86s-.04.05-.06.08c-.06.08-.13.16-.21.24-.44,0-.89,0-1.35,0-.6,0-1.22,0-1.86,0,.07-.08.16-.16.21-.24.01-.02.03-.05.04-.08.64,0,1.27,0,1.88,0,.46,0,.91,0,1.35,0Z"/>
                  <path class="pqr-427" d="M481.38,405.55c-.04.08-.08.15-.13.24-.02.03-.04.05-.05.08-.43,0-.88,0-1.35,0-.6,0-1.23,0-1.88,0,.01-.03.02-.05.03-.08.03-.09.04-.17.05-.25.66,0,1.3.01,1.93.01.48,0,.94,0,1.39,0Z"/>
                  <path class="pqr-294" d="M481.58,405.12c-.03.06-.05.12-.08.19-.04.09-.08.16-.12.25-.45,0-.91,0-1.39,0-.62,0-1.27,0-1.93-.01.01-.08.02-.17.03-.26,0-.07,0-.13,0-.19.69.02,1.36.03,2.02.04.5,0,1,0,1.47-.01Z"/>
                  <path class="pqr-127" d="M481.76,404.59c-.03.11-.06.24-.1.33-.03.07-.05.13-.08.19-.48.01-.97.02-1.47.01-.66,0-1.33-.03-2.02-.04,0-.06,0-.13,0-.2.01-.09.01-.2.02-.3.71,0,1.41.02,2.09.02.52,0,1.04,0,1.54-.01Z"/>
                  <path class="pqr-127" d="M482,403.77c-.04.16-.07.31-.14.47-.04.1-.07.23-.1.34-.5.01-1.02.01-1.54.01-.68,0-1.38-.01-2.09-.02.01-.11.02-.21.05-.31.04-.15.04-.31.05-.47.72,0,1.45,0,2.16,0,.55,0,1.09,0,1.62-.02Z"/>
                  <path class="pqr-38" d="M482.15,403.08c-.01.07-.02.13-.04.2-.04.18-.07.34-.11.5-.53,0-1.07.01-1.62.02-.72,0-1.44,0-2.16,0,0-.16,0-.32,0-.49,0-.06,0-.12,0-.19.74,0,1.49,0,2.23-.01.57,0,1.13-.02,1.69-.03Z"/>
                  <path class="pqr-29" d="M482.22,402.62c-.01.08-.02.17-.04.25-.01.07-.02.14-.03.2-.56.01-1.13.02-1.69.03-.74,0-1.49.01-2.23.01,0-.06,0-.13,0-.19,0-.08,0-.15.01-.23.75-.01,1.5-.03,2.24-.04.57-.01,1.15-.02,1.73-.03Z"/>
                  <path class="pqr-239" d="M482.26,402.37c-.02.08-.03.17-.04.25-.58.01-1.16.02-1.73.03-.75.01-1.5.03-2.24.04,0-.08.02-.16.03-.23.75-.02,1.5-.03,2.25-.05.58-.01,1.16-.03,1.74-.04Z"/>
                  <path class="pqr-263" d="M478.48,411.14c-.09.16-.16.33-.23.48-.79,0-1.57,0-2.35,0-.09,0-.18,0-.27,0,.08-.16.14-.33.23-.49.12,0,.24,0,.37-.01.74,0,1.5,0,2.26.02Z"/>
                  <path class="pqr-21" d="M479.23,410.06c-.17.19-.32.39-.45.59-.11.16-.2.33-.29.49-.76,0-1.52-.01-2.26-.02-.13,0-.25,0-.37.01.08-.17.17-.34.29-.5.14-.21.29-.41.47-.6.21-.01.43-.02.66-.03.63.01,1.29.03,1.95.05Z"/>
                  <path class="pqr-302" d="M480.46,408.95c-.21.19-.43.37-.65.56-.22.17-.41.36-.58.55-.66-.02-1.32-.04-1.95-.05-.22,0-.44.02-.66.03.18-.2.38-.38.63-.55.24-.17.46-.35.69-.54.33,0,.67,0,1.02-.01.49.01.99.01,1.5.02Z"/>
                  <path class="pqr-242" d="M481.41,408.03c-.11.11-.22.22-.33.33-.2.2-.41.39-.63.58-.51,0-1.01,0-1.5-.02-.35,0-.69,0-1.02.01.23-.19.44-.38.66-.57.12-.11.24-.22.36-.34.43,0,.87,0,1.32,0,.37,0,.75,0,1.14,0Z"/>
                  <path class="pqr-205" d="M481.96,407.42c-.07.09-.15.18-.22.27-.11.12-.22.23-.32.35-.39,0-.77,0-1.14,0-.44,0-.88,0-1.32,0,.12-.11.24-.23.37-.34.1-.09.21-.17.31-.25.45,0,.91,0,1.37,0,.32,0,.64,0,.96-.01Z"/>
                  <path class="pqr-333" d="M482.33,406.96c-.05.06-.1.12-.15.18-.07.09-.15.18-.23.27-.32,0-.64.01-.96.01-.46,0-.91,0-1.37,0,.1-.08.21-.17.31-.26.06-.06.14-.12.2-.18.45,0,.89,0,1.32,0,.29,0,.58-.01.86-.03Z"/>
                  <path class="pqr-203" d="M482.6,406.58c-.04.07-.09.13-.13.2-.04.06-.09.13-.14.19-.28.02-.57.03-.86.03-.44,0-.88,0-1.32,0,.06-.06.13-.12.18-.19.05-.06.12-.13.19-.19.45,0,.89,0,1.31,0,.27,0,.53-.02.78-.03Z"/>
                  <path class="pqr-430" d="M482.9,406.15c-.05.08-.1.16-.16.23-.05.07-.09.13-.14.2-.25.02-.51.03-.78.03-.42,0-.86,0-1.31,0,.06-.07.14-.13.2-.2.07-.08.15-.16.22-.23.44,0,.86,0,1.26,0,.24,0,.48-.01.7-.03Z"/>
                  <path class="pqr-420" d="M483.09,405.84s-.03.05-.04.07c-.05.08-.1.16-.15.24-.23.01-.46.02-.7.03-.41,0-.83,0-1.26,0,.07-.08.15-.16.21-.24.02-.03.04-.05.06-.08.43,0,.85,0,1.24-.01.22,0,.44,0,.65-.01Z"/>
                  <path class="pqr-436" d="M483.28,405.43c-.05.11-.1.22-.15.33-.01.02-.03.05-.04.07-.21,0-.43.01-.65.01-.39,0-.81,0-1.24.01.02-.03.04-.05.05-.08.05-.09.09-.15.13-.24.45,0,.88-.02,1.29-.04.22,0,.41-.04.61-.07Z"/>
                  <path class="pqr-355" d="M483.53,404.89c-.04.07-.07.15-.11.22-.05.11-.1.21-.15.32-.19.03-.39.06-.61.07-.41.02-.85.03-1.29.04.04-.08.08-.15.12-.25.03-.07.06-.12.08-.19.48-.01.94-.04,1.38-.09.21-.02.39-.07.57-.13Z"/>
                  <path class="pqr-221" d="M483.8,404.38c-.06.1-.11.2-.16.3-.04.07-.07.14-.11.22-.18.06-.36.11-.57.13-.44.05-.91.07-1.38.09.03-.06.05-.12.08-.19.04-.09.07-.22.1-.33.5-.01.99-.03,1.47-.06.21-.04.4-.09.57-.15Z"/>
                  <path class="pqr-12" d="M484.26,403.61c-.1.16-.19.31-.28.46-.06.1-.12.2-.17.3-.18.06-.36.11-.57.15-.47.03-.96.05-1.47.06.03-.11.06-.24.1-.34.06-.16.1-.31.14-.47.53,0,1.06-.02,1.57-.04.26-.03.47-.08.68-.12Z"/>
                  <path class="pqr-367" d="M484.66,402.95c-.04.06-.07.12-.11.18-.1.17-.19.33-.29.49-.21.04-.43.09-.68.12-.51.02-1.04.03-1.57.04.04-.16.06-.32.11-.5.02-.06.03-.13.04-.2.56-.01,1.12-.03,1.67-.06.31-.01.57-.04.84-.08Z"/>
                  <path class="pqr-364" d="M484.9,402.54c-.05.07-.09.15-.13.22-.04.06-.07.12-.11.18-.26.03-.53.06-.84.08-.55.02-1.11.04-1.67.06.01-.07.02-.14.03-.2.01-.08.02-.17.04-.25.58-.01,1.15-.02,1.72-.04.33,0,.65-.03.96-.04Z"/>
                  <path class="pqr-422" d="M485.04,402.31c-.05.07-.09.15-.14.22-.31.02-.63.03-.96.04-.57.02-1.14.03-1.72.04.01-.08.03-.17.04-.25.58-.01,1.16-.03,1.74-.04.35,0,.69-.01,1.03-.02Z"/>
                  <path class="pqr-286" d="M482.96,411.18c-.02.15-.03.3-.05.45-.76,0-1.53,0-2.31,0-.78,0-1.57,0-2.35,0,.07-.16.15-.32.23-.48.76,0,1.52.01,2.26.02.74,0,1.48.01,2.22.02Z"/>
                  <path class="pqr-101" d="M483.14,410.17c-.05.19-.08.38-.11.56-.03.15-.05.3-.07.45-.73,0-1.48-.02-2.22-.02-.74,0-1.5-.01-2.26-.02.09-.16.18-.33.29-.49.13-.2.28-.4.45-.59.66.02,1.33.04,1.97.05.64.01,1.3.03,1.95.06Z"/>
                  <path class="pqr-143" d="M483.48,408.99c-.06.21-.11.42-.17.62-.06.18-.11.37-.16.55-.65-.02-1.31-.04-1.95-.06-.64-.01-1.31-.03-1.97-.05.17-.19.36-.38.58-.55.22-.18.44-.37.65-.56.51,0,1.02,0,1.52.02.5.01,1,.02,1.5.02Z"/>
                  <path class="pqr-160" d="M483.73,408.03c-.03.11-.06.22-.09.33-.06.21-.11.42-.17.63-.5,0-1-.01-1.5-.02-.5-.01-1.01-.02-1.52-.02.21-.19.42-.38.63-.58.11-.11.22-.22.33-.33.39,0,.77,0,1.15,0s.77,0,1.17,0Z"/>
                  <path class="pqr-168" d="M483.9,407.39c-.02.1-.05.2-.07.31-.03.11-.06.22-.09.34-.39,0-.78,0-1.17,0s-.77,0-1.15,0c.11-.11.22-.23.32-.35.07-.09.15-.18.22-.27.32,0,.64-.02.96-.02.32,0,.65-.01.98-.02Z"/>
                  <path class="pqr-422" d="M484.02,406.89c-.02.06-.03.13-.05.19-.03.1-.05.2-.08.3-.33,0-.65.01-.98.02-.32,0-.64.01-.96.02.07-.09.15-.18.23-.27.05-.06.1-.12.15-.18.28-.02.57-.03.85-.04.17,0,.33-.01.5-.02.11,0,.23,0,.34-.01Z"/>
                  <path class="pqr-334" d="M484.11,406.5c-.02.07-.03.13-.05.2-.02.06-.02.13-.04.19-.11,0-.23,0-.34.01-.17,0-.34.01-.5.02-.28.01-.56.03-.85.04.05-.06.09-.12.14-.19.04-.06.09-.13.13-.2.25-.02.5-.04.75-.05.15,0,.3-.01.45-.02.1,0,.2,0,.3-.01Z"/>
                  <path class="pqr-405" d="M484.22,406.09c-.02.07-.04.14-.06.22-.02.07-.04.13-.05.2-.1,0-.2.01-.3.01-.15,0-.3.01-.45.02-.25.01-.5.03-.75.05.04-.07.09-.13.14-.2.05-.08.11-.15.16-.23.23-.01.45-.03.66-.03.22,0,.44-.02.66-.03Z"/>
                  <path class="pqr-374" d="M484.29,405.81s0,.04,0,.07c-.02.07-.04.14-.06.21-.22,0-.44.02-.66.03-.21,0-.44.02-.66.03.05-.08.1-.16.15-.24.01-.02.03-.05.04-.07.21,0,.42-.01.61-.02.12,0,.23,0,.35,0,.08,0,.16,0,.24,0Z"/>
                  <path class="pqr-71" d="M484.38,405.28c-.03.14-.06.3-.09.46,0,.02,0,.04,0,.07-.08,0-.16,0-.24,0-.11,0-.23,0-.35,0-.19,0-.4,0-.61.02.01-.02.03-.05.04-.07.05-.11.1-.22.15-.33.19-.03.37-.07.56-.09.11-.01.22-.03.32-.04.07,0,.15-.02.23-.03Z"/>
                  <path class="pqr-255" d="M484.59,404.6c-.03.08-.07.18-.1.27-.04.13-.08.27-.11.41-.08.01-.15.02-.23.03-.11.01-.21.03-.32.04-.18.02-.37.05-.56.09.05-.11.1-.21.15-.32.04-.08.07-.15.11-.22.18-.06.34-.12.52-.16.16-.04.35-.09.54-.14Z"/>
                  <path class="pqr-193" d="M484.87,404.05c-.07.1-.12.2-.17.31-.03.07-.08.16-.11.24-.19.05-.38.11-.54.14-.17.04-.34.1-.52.16.04-.07.07-.14.11-.22.05-.1.11-.2.16-.3.18-.06.34-.12.52-.16.1-.03.21-.06.33-.1.07-.02.15-.04.22-.07Z"/>
                  <path class="pqr-439" d="M485.56,403.36c-.16.14-.33.28-.46.42-.09.09-.16.17-.23.27-.07.02-.14.04-.22.07-.12.03-.23.07-.33.1-.18.05-.34.11-.52.16.06-.1.11-.2.17-.3.09-.15.18-.3.28-.46.21-.04.41-.09.64-.13.14-.02.26-.05.4-.08.09-.02.17-.03.25-.05Z"/>
                  <path class="pqr-91" d="M486.31,402.77c-.07.05-.14.1-.21.15-.19.14-.38.29-.54.43-.08.02-.17.03-.25.05-.14.03-.26.06-.4.08-.23.04-.43.08-.64.13.1-.16.19-.32.29-.49.04-.06.07-.12.11-.18.26-.03.53-.07.82-.09.28-.03.56-.06.84-.08Z"/>
                  <path class="pqr-17" d="M486.81,402.45c-.09.06-.19.12-.28.18-.08.05-.15.1-.22.15-.28.03-.56.06-.84.08-.29.02-.55.05-.82.09.04-.06.07-.12.11-.18.05-.07.09-.15.13-.22.31-.02.62-.04.95-.05.32-.01.64-.03.96-.04Z"/>
                  <path class="pqr-399" d="M487.09,402.27c-.1.06-.19.12-.29.18-.32.01-.64.03-.96.04-.32.01-.64.03-.95.05.05-.07.09-.15.14-.22.34,0,.69-.01,1.03-.02.34,0,.68-.01,1.02-.02Z"/>
                  <path class="pqr-171" d="M485.96,411.21c0,.14.02.29.03.43-.28,0-.57,0-.86,0-.72,0-1.46,0-2.22,0,.02-.15.03-.3.05-.45.73,0,1.45.02,2.13.03.29,0,.58,0,.86,0Z"/>
                  <path class="pqr-131" d="M485.9,410.23c.01.18.02.37.03.55,0,.15.02.29.03.44-.28,0-.57,0-.86,0-.68,0-1.4-.02-2.13-.03.02-.15.04-.3.07-.45.03-.19.07-.38.11-.56.65.02,1.28.04,1.88.06.29,0,.59,0,.88,0Z"/>
                  <path class="pqr-314" d="M485.83,409.02c0,.22.02.44.04.66.01.18.02.37.03.55-.29,0-.58,0-.88,0-.6-.01-1.23-.04-1.88-.06.05-.19.1-.37.16-.55.06-.21.11-.41.17-.62.5,0,.99.01,1.47.03.3,0,.59,0,.88,0Z"/>
                  <path class="pqr-182" d="M485.81,408.03c0,.11,0,.22,0,.34,0,.21.01.43.02.65-.29,0-.59,0-.88,0-.48-.01-.97-.02-1.47-.03.06-.21.11-.42.17-.63.03-.11.06-.22.09-.33.39,0,.78,0,1.17,0,.3,0,.61,0,.91,0Z"/>
                  <path class="pqr-168" d="M485.75,407.38c.03.11.06.21.06.32,0,.11,0,.22,0,.33-.3,0-.61,0-.91,0-.38,0-.77,0-1.17,0,.03-.11.06-.22.09-.34.02-.1.04-.21.07-.31.33,0,.66,0,.98,0,.29,0,.58,0,.87,0Z"/>
                  <path class="pqr-344" d="M485.65,406.87c.01.07.03.14.03.2,0,.1.04.21.06.31-.29,0-.58,0-.87,0-.33,0-.65,0-.98,0,.02-.1.05-.2.08-.3.02-.06.03-.13.05-.19.28-.01.56-.03.85-.03.26,0,.51,0,.78,0Z"/>
                  <path class="pqr-64" d="M485.59,406.46c.01.07.03.14.03.2,0,.07.01.13.03.2-.26,0-.52,0-.78,0-.29,0-.57.02-.85.03.02-.06.02-.13.04-.19.01-.07.03-.13.05-.2.25-.01.5-.03.77-.03.23,0,.47,0,.72,0Z"/>
                  <path class="pqr-405" d="M485.52,406.06c.02.07.04.14.04.21,0,.06.02.13.03.2-.25,0-.49,0-.72,0-.26,0-.52.02-.77.03.02-.07.04-.13.05-.2.02-.07.04-.15.06-.22.22,0,.44-.02.66-.02.2,0,.42,0,.64,0Z"/>
                  <path class="pqr-429" d="M485.49,405.79s0,.04,0,.06c0,.07.02.13.03.2-.22,0-.43,0-.64,0-.22,0-.44.01-.66.02.02-.07.04-.14.06-.21,0-.02,0-.04,0-.07.2,0,.4,0,.61-.01.19,0,.38,0,.59,0Z"/>
                  <path class="pqr-389" d="M485.55,405.2c-.03.17-.06.35-.07.53,0,.02,0,.04,0,.06-.21,0-.4,0-.59,0-.21,0-.42,0-.61.01,0-.02,0-.04,0-.07.02-.16.06-.32.09-.46.18-.02.37-.05.57-.07.19,0,.39-.01.6-.01Z"/>
                  <path class="pqr-91" d="M485.76,404.43c-.03.09-.07.19-.1.29-.04.15-.08.31-.11.47-.21,0-.41,0-.6.01-.2.02-.39.04-.57.07.03-.14.07-.29.11-.41.03-.09.07-.19.1-.27.19-.05.37-.1.51-.12.21-.02.43-.03.66-.04Z"/>
                  <path class="pqr-356" d="M486.08,403.89c-.09.09-.16.18-.22.3-.03.07-.07.16-.1.25-.23,0-.45.02-.66.04-.15.02-.33.07-.51.12.03-.08.08-.17.11-.24.05-.11.1-.21.17-.31.18-.06.36-.12.52-.15.22,0,.45-.01.69-.01Z"/>
                  <path class="pqr-271" d="M486.93,403.23c-.21.14-.41.29-.56.41-.11.09-.21.16-.3.25-.24,0-.46,0-.69.01-.16.03-.34.09-.52.15.07-.1.14-.18.23-.27.13-.14.3-.28.46-.42.21-.04.42-.09.66-.12.23,0,.47,0,.72,0Z"/>
                  <path class="pqr-316" d="M487.89,402.68c-.09.05-.18.09-.27.14-.24.13-.48.28-.69.42-.24,0-.48,0-.72,0-.24.03-.44.08-.66.12.16-.14.35-.29.54-.43.07-.05.14-.1.21-.15.28-.03.56-.05.84-.07.25-.01.49-.02.75-.03Z"/>
                  <path class="pqr-76" d="M488.52,402.39c-.12.05-.24.1-.35.15-.1.04-.19.09-.28.13-.25,0-.5.02-.75.03-.28.01-.56.04-.84.07.07-.05.15-.1.22-.15.09-.06.18-.12.28-.18.32-.01.64-.03.95-.04.25,0,.51-.01.76-.02Z"/>
                  <path class="pqr-229" d="M488.87,402.23c-.11.05-.23.1-.35.16-.26,0-.51.01-.76.02-.32,0-.63.02-.95.04.09-.06.19-.12.29-.18.34,0,.68-.01,1.02-.02.26,0,.51-.01.76-.02Z"/>
                  <path class="pqr-199" d="M489.51,411.24c0,.15,0,.29.01.43-.9-.01-1.8-.03-2.7-.03-.27,0-.55,0-.84,0,0-.14-.02-.28-.03-.43.28,0,.56,0,.84,0,.91,0,1.81.01,2.71.03Z"/>
                  <path class="pqr-434" d="M489.57,410.26c-.01.18-.03.37-.04.55-.01.15-.02.29-.02.44-.9-.01-1.8-.02-2.71-.03-.28,0-.56,0-.84,0,0-.14-.02-.29-.03-.44-.01-.18-.02-.36-.03-.55.29,0,.58,0,.86,0,.93,0,1.87.01,2.81.02Z"/>
                  <path class="pqr-426" d="M489.62,409.05c-.02.22-.04.43-.04.65,0,.19,0,.37-.01.55-.94-.01-1.87-.02-2.81-.02-.28,0-.57,0-.86,0-.01-.18-.02-.37-.03-.55-.01-.22-.03-.44-.04-.66.29,0,.59,0,.88,0,.97,0,1.94.01,2.91.02Z"/>
                  <path class="pqr-131" d="M489.75,408.06c-.01.11-.04.23-.05.34-.03.22-.06.43-.08.65-.97,0-1.93-.02-2.91-.02-.29,0-.59,0-.88,0,0-.22-.02-.43-.02-.65,0-.11,0-.23,0-.34.3,0,.61,0,.91,0,1.01,0,2.02.01,3.03.02Z"/>
                  <path class="pqr-168" d="M489.63,407.41c.06.1.15.21.16.32,0,.11-.03.22-.04.34-1.01,0-2.02-.02-3.03-.02-.3,0-.61,0-.91,0,0-.11,0-.22,0-.33,0-.11-.03-.21-.06-.32.29,0,.59,0,.88,0,.98,0,1.99.01,3,.02Z"/>
                  <path class="pqr-340" d="M489.28,406.89c.03.07.09.14.13.2.05.1.16.21.23.31-1.01,0-2.03-.02-3-.02-.29,0-.59,0-.88,0-.03-.11-.06-.21-.06-.31,0-.07-.02-.14-.03-.2.26,0,.53,0,.81,0,.91,0,1.86.01,2.82.02Z"/>
                  <path class="pqr-262" d="M489.12,406.49c.03.07.08.14.08.2,0,.06.04.13.08.2-.97-.01-1.91-.02-2.82-.02-.27,0-.54,0-.81,0-.01-.07-.03-.13-.03-.2,0-.07-.02-.14-.03-.2.25,0,.5,0,.76,0,.86,0,1.8.01,2.77.03Z"/>
                  <path class="pqr-148" d="M488.82,406.08c.05.07.13.14.17.21.03.06.1.13.13.2-.97-.01-1.91-.03-2.77-.03-.26,0-.51,0-.76,0-.01-.07-.03-.14-.03-.2,0-.07-.02-.14-.04-.21.22,0,.45,0,.69,0,.79,0,1.67,0,2.61.02Z"/>
                  <path class="pqr-65" d="M488.66,405.8s.01.04.02.06c.02.07.09.14.14.21-.94-.01-1.82-.02-2.61-.02-.24,0-.47,0-.69,0-.02-.07-.03-.13-.03-.2,0-.02,0-.04,0-.06.21,0,.42,0,.65,0,.75,0,1.61,0,2.53.01Z"/>
                  <path class="pqr-115" d="M488.77,405.25c-.04.16-.1.32-.11.49,0,.02,0,.04,0,.06-.92,0-1.78-.01-2.53-.01-.23,0-.44,0-.65,0,0-.02,0-.04,0-.06.01-.18.04-.36.07-.53.21,0,.43,0,.66,0,.77,0,1.63.02,2.55.05Z"/>
                  <path class="pqr-286" d="M489.1,404.52c-.04.09-.1.19-.14.28-.06.14-.14.29-.19.45-.92-.03-1.78-.05-2.55-.05-.23,0-.45,0-.66,0,.03-.17.07-.33.11-.47.03-.1.06-.2.1-.29.23,0,.47-.01.71-.01.81,0,1.69.05,2.63.1Z"/>
                  <path class="pqr-332" d="M489.42,403.96c-.08.09-.16.18-.2.31-.03.08-.08.16-.13.25-.93-.05-1.82-.1-2.63-.1-.24,0-.48,0-.71.01.03-.09.07-.17.1-.25.05-.12.13-.21.22-.3.24,0,.48,0,.72,0,.82,0,1.7.04,2.62.07Z"/>
                  <path class="pqr-49" d="M490.26,403.26c-.2.15-.42.31-.54.45-.1.09-.22.16-.3.26-.92-.03-1.8-.07-2.62-.07-.25,0-.49,0-.72,0,.09-.09.19-.16.3-.25.15-.13.34-.27.56-.41.24,0,.49,0,.74,0,.84,0,1.7.01,2.59.03Z"/>
                  <path class="pqr-351" d="M491.23,402.66c-.09.05-.18.1-.26.15-.23.14-.51.3-.71.45-.88-.01-1.75-.03-2.59-.03-.25,0-.5,0-.74,0,.21-.14.45-.29.69-.42.09-.05.18-.09.27-.14.25,0,.5-.01.76-.02.85-.01,1.72,0,2.58,0Z"/>
                  <path class="pqr-149" d="M491.81,402.34c-.1.06-.21.11-.31.17-.09.05-.18.1-.27.15-.87,0-1.74-.02-2.58,0-.25,0-.51.01-.76.02.09-.05.19-.09.28-.13.11-.05.23-.1.35-.15.26,0,.51,0,.77-.01.84-.02,1.69-.02,2.52-.03Z"/>
                  <path class="pqr-256" d="M492.1,402.17c-.08.06-.19.12-.29.17-.83,0-1.68.02-2.52.03-.25,0-.51,0-.77.01.12-.05.23-.1.35-.16.25,0,.51-.01.76-.02.84-.02,1.66-.03,2.47-.05Z"/>
                  <path class="pqr-382" d="M496.06,411.4c0,.15-.03.3-.02.45-1.3-.05-2.59-.09-3.82-.12-.9-.02-1.8-.04-2.7-.06-.01-.14-.02-.29-.01-.43.9.01,1.8.03,2.71.05,1.24.03,2.54.07,3.84.11Z"/>
                  <path class="pqr-279" d="M496.19,410.38c-.01.19-.06.38-.08.57-.01.15-.04.3-.05.45-1.3-.04-2.6-.08-3.84-.11-.91-.02-1.81-.04-2.71-.05,0-.15.01-.29.02-.44.01-.18.03-.36.04-.55.94.01,1.87.02,2.81.04,1.26.02,2.54.05,3.81.08Z"/>
                  <path class="pqr-101" d="M496.32,409.15c-.02.22-.08.45-.08.67,0,.19-.04.38-.05.57-1.27-.03-2.55-.06-3.81-.08-.93-.02-1.87-.03-2.81-.04.01-.18.02-.37.01-.55,0-.22.01-.44.04-.65.97,0,1.93.02,2.91.03,1.27.02,2.55.04,3.8.06Z"/>
                  <path class="pqr-186" d="M496.48,408.13c0,.12-.03.23-.05.35-.03.22-.09.44-.11.67-1.24-.02-2.52-.05-3.8-.06-.97-.01-1.94-.02-2.91-.03.02-.22.05-.43.08-.65.01-.11.04-.23.05-.34,1.01,0,2.01.02,3,.03,1.28.01,2.53.03,3.73.04Z"/>
                  <path class="pqr-160" d="M496.42,407.48c.04.1.09.2.09.29,0,.12-.02.23-.03.35-1.2-.01-2.45-.03-3.73-.04-.99,0-1.99-.02-3-.03.01-.11.04-.22.04-.34,0-.1-.09-.21-.16-.32,1.01,0,2.03.02,3.03.03,1.29.01,2.55.03,3.76.04Z"/>
                  <path class="pqr-292" d="M496.18,406.99c.02.06.06.13.09.19.04.1.12.2.16.3-1.21-.01-2.47-.03-3.76-.04-.99-.01-2.01-.02-3.03-.03-.06-.1-.18-.21-.23-.31-.03-.07-.09-.14-.13-.2.97.01,1.96.02,2.97.04,1.31.02,2.64.04,3.93.06Z"/>
                  <path class="pqr-382" d="M496.08,406.6c.02.06.05.13.05.2,0,.06.03.13.04.19-1.29-.02-2.62-.04-3.93-.06-1.01-.01-2-.03-2.97-.04-.03-.07-.08-.13-.08-.2,0-.07-.05-.14-.08-.2.97.01,1.99.03,3,.05,1.32.02,2.65.04,3.96.07Z"/>
                  <path class="pqr-156" d="M495.87,406.19c.03.07.09.15.12.22.03.06.07.13.09.2-1.31-.02-2.64-.05-3.96-.07-1.02-.02-2.03-.03-3-.05-.03-.07-.1-.14-.13-.2-.04-.07-.12-.14-.17-.21.94.01,1.93.03,2.96.04,1.33.02,2.72.04,4.09.07Z"/>
                  <path class="pqr-345" d="M495.77,405.9s0,.04.01.07c.02.07.06.15.09.22-1.37-.03-2.76-.05-4.09-.07-1.03-.01-2.02-.03-2.96-.04-.05-.07-.12-.14-.14-.21,0-.02-.01-.04-.02-.06.92,0,1.92.02,2.95.03,1.34.02,2.75.04,4.15.07Z"/>
                  <path class="pqr-345" d="M495.82,405.43c-.02.13-.06.27-.06.4,0,.02,0,.04,0,.07-1.4-.02-2.81-.05-4.15-.07-1.03-.01-2.02-.03-2.95-.03,0-.02,0-.04,0-.06,0-.17.07-.33.11-.49.92.03,1.91.06,2.93.08,1.33.02,2.73.06,4.12.1Z"/>
                  <path class="pqr-435" d="M496,404.78c-.02.09-.05.18-.08.26-.03.13-.08.26-.1.39-1.39-.04-2.8-.08-4.12-.1-1.02-.02-2.01-.05-2.93-.08.04-.16.13-.31.19-.45.04-.1.1-.2.14-.28.93.05,1.92.11,2.92.14,1.3.03,2.65.08,3.99.12Z"/>
                  <path class="pqr-403" d="M496.15,404.18c-.03.11-.07.23-.09.35-.02.08-.04.17-.06.25-1.33-.05-2.68-.09-3.99-.12-1-.02-1.98-.08-2.92-.14.04-.09.09-.17.13-.25.04-.12.12-.22.2-.31.92.03,1.88.07,2.85.1,1.27.03,2.58.07,3.87.12Z"/>
                  <path class="pqr-377" d="M496.51,403.35c-.09.17-.18.33-.22.5-.05.1-.11.21-.14.32-1.29-.05-2.6-.09-3.87-.12-.98-.02-1.93-.06-2.85-.1.08-.09.19-.17.3-.26.11-.14.34-.3.54-.45.88.01,1.78.03,2.68.04,1.17.01,2.39.03,3.57.05Z"/>
                  <path class="pqr-377" d="M496.96,402.67c-.04.06-.08.12-.12.18-.11.17-.24.33-.33.5-1.18-.02-2.4-.04-3.57-.05-.9,0-1.8-.03-2.68-.04.2-.15.48-.31.71-.45.08-.05.18-.1.26-.15.87,0,1.73.02,2.56.02,1.08,0,2.15,0,3.17,0Z"/>
                  <path class="pqr-377" d="M497.21,402.28c-.04.07-.09.14-.13.21-.04.06-.08.12-.12.18-1.03,0-2.1,0-3.17,0-.83,0-1.69,0-2.56-.02.09-.05.18-.1.27-.15.1-.06.22-.11.31-.17.83,0,1.66-.01,2.44-.03,1.02-.01,2.01-.03,2.95-.04Z"/>
                  <path class="pqr-31" d="M497.32,402.06c-.03.07-.07.14-.11.21-.94.01-1.93.02-2.95.04-.79.01-1.61.02-2.44.03.1-.06.2-.11.29-.17.81-.02,1.59-.03,2.36-.05,1-.02,1.95-.04,2.86-.06Z"/>
                  <path class="pqr-257" d="M501.67,411.6c0,.16-.02.32-.02.47-.57-.02-1.16-.05-1.77-.07-1.25-.05-2.55-.1-3.84-.15,0-.15.01-.3.02-.45,1.3.04,2.59.09,3.82.13.61.02,1.21.05,1.78.07Z"/>
                  <path class="pqr-116" d="M501.74,410.54c0,.2-.03.39-.04.59,0,.16-.02.32-.03.47-.57-.02-1.17-.05-1.78-.07-1.23-.05-2.52-.09-3.82-.13,0-.15.04-.3.05-.45.02-.19.06-.38.08-.57,1.27.03,2.51.07,3.7.1.64.02,1.26.04,1.85.05Z"/>
                  <path class="pqr-432" d="M501.8,409.26c-.01.23-.03.46-.03.7,0,.2-.02.39-.03.59-.59-.02-1.22-.04-1.85-.05-1.18-.04-2.43-.07-3.7-.1.01-.19.05-.38.05-.57,0-.23.06-.45.08-.67,1.24.02,2.44.05,3.56.07.67.01,1.31.03,1.91.04Z"/>
                  <path class="pqr-252" d="M501.87,408.19c0,.12-.01.24-.02.37-.01.23-.04.46-.05.7-.6-.01-1.24-.03-1.91-.04-1.12-.02-2.32-.05-3.56-.07.02-.22.09-.44.11-.67.01-.12.04-.23.05-.35,1.2.01,2.34.03,3.41.04.7,0,1.36.02,1.98.02Z"/>
                  <path class="pqr-60" d="M501.86,407.55c0,.09.02.19.02.28,0,.12,0,.24-.01.37-.62,0-1.29-.02-1.98-.02-1.07-.01-2.21-.03-3.41-.04,0-.12.03-.23.03-.35,0-.1-.05-.2-.09-.29,1.21.01,2.37.03,3.47.04.69,0,1.35.02,1.97.02Z"/>
                  <path class="pqr-73" d="M501.81,407.08c0,.06.01.12.02.19,0,.09.03.19.03.28-.62,0-1.28-.01-1.97-.02-1.1-.01-2.26-.03-3.47-.04-.04-.1-.11-.2-.16-.3-.03-.07-.07-.13-.09-.19,1.29.02,2.55.04,3.71.06.67,0,1.32.02,1.92.03Z"/>
                  <path class="pqr-175" d="M501.78,406.7c0,.06.01.13.01.19s0,.12.01.19c-.61,0-1.25-.02-1.92-.03-1.16-.02-2.42-.04-3.71-.06-.02-.06-.04-.13-.04-.19,0-.06-.03-.13-.05-.2,1.31.02,2.58.05,3.8.07.66.01,1.3.02,1.9.03Z"/>
                  <path class="pqr-117" d="M501.74,406.3c0,.07.02.14.02.21,0,.06.02.13.02.19-.6,0-1.24-.02-1.9-.03-1.22-.02-2.5-.04-3.8-.07-.02-.06-.06-.13-.09-.2-.03-.07-.09-.15-.12-.22,1.37.03,2.73.05,4.01.07.64.01,1.26.02,1.86.03Z"/>
                  <path class="pqr-9" d="M501.72,406.02s0,.04,0,.07c0,.07.02.14.02.21-.59-.01-1.21-.02-1.86-.03-1.28-.02-2.64-.05-4.01-.07-.03-.07-.08-.15-.09-.22,0-.02-.01-.04-.01-.07,1.4.02,2.8.05,4.12.08.63.01,1.24.02,1.83.04Z"/>
                  <path class="pqr-9" d="M501.76,405.58c-.01.12-.05.25-.05.37,0,.02,0,.04,0,.07-.59-.01-1.2-.02-1.83-.04-1.32-.03-2.72-.05-4.12-.08,0-.02,0-.04,0-.07,0-.14.03-.27.06-.4,1.39.04,2.78.08,4.07.12.66,0,1.29.02,1.88.03Z"/>
                  <path class="pqr-171" d="M501.91,404.94c-.02.09-.05.18-.07.27-.02.12-.07.25-.08.37-.59-.01-1.21-.02-1.88-.03-1.29-.03-2.67-.08-4.07-.12.02-.13.07-.26.1-.39.02-.09.06-.18.08-.26,1.33.05,2.65.1,3.88.14.72,0,1.4,0,2.03.01Z"/>
                  <path class="pqr-239" d="M502.05,404.31c-.01.12-.05.24-.07.36-.02.09-.05.18-.06.27-.63,0-1.31-.01-2.03-.01-1.23-.04-2.55-.09-3.88-.14.02-.09.05-.17.06-.25.02-.12.05-.24.09-.35,1.29.05,2.56.09,3.73.14.76,0,1.49,0,2.16,0Z"/>
                  <path class="pqr-308" d="M502.17,403.4c-.03.19-.08.37-.08.56,0,.12-.02.24-.04.36-.67,0-1.4,0-2.16,0-1.18-.04-2.44-.09-3.73-.14.03-.11.09-.22.14-.32.04-.17.13-.33.22-.5,1.18.02,2.33.04,3.37.07.83,0,1.6-.01,2.28-.02Z"/>
                  <path class="pqr-401" d="M502.35,402.64c-.01.07-.03.13-.05.2-.04.19-.11.37-.14.56-.69,0-1.45,0-2.28.02-1.04-.03-2.19-.05-3.37-.07.09-.17.22-.33.33-.5.04-.06.08-.12.12-.18,1.03,0,2.01,0,2.92,0,.9-.01,1.72-.02,2.47-.03Z"/>
                  <path class="pqr-401" d="M502.43,402.21c0,.08-.03.16-.04.24,0,.07-.03.13-.04.2-.74,0-1.57.02-2.47.03-.91,0-1.9,0-2.92,0,.04-.06.08-.12.12-.18.04-.07.09-.14.13-.21.94-.01,1.84-.02,2.68-.03.93-.02,1.79-.03,2.55-.04Z"/>
                  <path class="pqr-308" d="M502.45,401.97c0,.08-.02.16-.02.24-.76.01-1.62.03-2.55.04-.84,0-1.73.02-2.68.03.04-.07.08-.14.11-.21.91-.02,1.77-.03,2.57-.05.95-.02,1.81-.03,2.57-.05Z"/>
                  <path class="pqr-133" d="M504.82,411.73c0,.16-.02.32-.02.49-.47-.02-.98-.04-1.5-.07-.53-.02-1.08-.05-1.65-.07,0-.16.01-.32.02-.47.57.02,1.13.04,1.66.07.53.02,1.03.04,1.5.06Z"/>
                  <path class="pqr-361" d="M504.9,410.64c0,.2-.03.4-.04.6,0,.16-.02.32-.03.49-.47-.02-.97-.04-1.5-.06-.53-.02-1.08-.04-1.66-.07,0-.16.02-.32.03-.47.01-.2.03-.39.04-.59.59.02,1.16.04,1.69.05.53.02,1.02.03,1.47.05Z"/>
                  <path class="pqr-362" d="M504.96,409.33c-.01.24-.03.48-.03.71,0,.2-.02.4-.03.6-.45-.02-.94-.03-1.47-.05-.53-.02-1.1-.04-1.69-.05,0-.2.03-.39.03-.59,0-.23.02-.46.03-.7.6.01,1.17.03,1.7.04.53.01,1.02.02,1.46.03Z"/>
                  <path class="pqr-186" d="M505.03,408.24c0,.13-.01.25-.02.38-.01.24-.04.48-.05.71-.44-.01-.93-.02-1.46-.03-.53-.01-1.1-.02-1.7-.04.01-.23.04-.46.05-.7,0-.12.02-.24.02-.37.62,0,1.2.02,1.73.02.53,0,1.01.01,1.43.02Z"/>
                  <path class="pqr-60" d="M505.02,407.58c0,.09.02.18.02.28,0,.13,0,.25-.01.38-.42,0-.9-.01-1.43-.02-.53,0-1.11-.01-1.73-.02,0-.12.01-.24.01-.37,0-.09-.01-.19-.02-.28.62,0,1.2.01,1.73.02.53,0,1.01.01,1.43.02Z"/>
                  <path class="pqr-401" d="M504.97,407.12c0,.06.01.12.02.18,0,.09.02.18.03.28-.42,0-.9-.01-1.43-.02-.53,0-1.11-.01-1.73-.02,0-.09-.02-.19-.03-.28,0-.06-.01-.12-.02-.19.61,0,1.18.02,1.71.03.53,0,1.02.02,1.46.02Z"/>
                  <path class="pqr-114" d="M504.95,406.75c0,.06.01.12.01.19s0,.12.01.18c-.44,0-.93-.01-1.46-.02-.53,0-1.1-.02-1.71-.03,0-.06-.01-.12-.01-.19s0-.13-.01-.19c.6,0,1.18.02,1.71.03s1.02.02,1.46.03Z"/>
                  <path class="pqr-55" d="M504.9,406.36c0,.07.02.14.02.21,0,.06.02.12.02.19-.44,0-.93-.02-1.46-.03s-1.1-.02-1.71-.03c0-.06-.01-.13-.02-.19,0-.07-.02-.14-.02-.21.59.01,1.16.02,1.69.03.53.01,1.02.02,1.48.03Z"/>
                  <path class="pqr-227" d="M504.88,406.08s0,.04,0,.06c0,.07.01.14.02.21-.45,0-.95-.02-1.48-.03-.53-.01-1.1-.02-1.69-.03,0-.07-.02-.14-.02-.21,0-.02,0-.04,0-.07.59.01,1.15.02,1.68.03.53.01,1.03.02,1.48.03Z"/>
                  <path class="pqr-355" d="M504.93,405.63c-.01.13-.06.26-.06.38,0,.02,0,.04,0,.06-.46,0-.95-.02-1.48-.03-.53-.01-1.09-.02-1.68-.03,0-.02,0-.04,0-.07,0-.12.03-.25.05-.37.59.01,1.15.02,1.68.03.53,0,1.04.02,1.49.03Z"/>
                  <path class="pqr-171" d="M505.09,404.97c-.02.09-.05.18-.07.27-.02.13-.07.26-.09.38-.46,0-.96-.02-1.49-.03-.53,0-1.09-.02-1.68-.03.01-.12.06-.25.08-.37.02-.09.05-.18.07-.27.63,0,1.21.01,1.75.02.53,0,1.02.01,1.44.02Z"/>
                  <path class="pqr-94" d="M505.24,404.33c-.01.12-.05.25-.07.37-.02.09-.05.18-.07.27-.42,0-.9-.01-1.44-.02-.53,0-1.12-.01-1.75-.02.02-.09.05-.18.06-.27.02-.12.06-.24.07-.36.67,0,1.28,0,1.82,0,.54,0,.99,0,1.37.01Z"/>
                  <path class="pqr-219" d="M505.37,403.39c-.03.19-.09.38-.09.57,0,.12-.03.25-.04.37-.38,0-.84,0-1.37-.01-.54,0-1.15,0-1.82,0,.01-.12.04-.24.04-.36,0-.18.05-.37.08-.56.69,0,1.3,0,1.84,0s1,0,1.36,0Z"/>
                  <path class="pqr-401" d="M505.56,402.61c-.01.07-.04.14-.05.21-.04.19-.12.38-.14.58-.36,0-.83,0-1.36,0s-1.15,0-1.84,0c.03-.19.1-.37.14-.56.01-.07.04-.13.05-.2.74,0,1.39-.02,1.93-.02.54,0,.97-.01,1.28-.01Z"/>
                  <path class="pqr-401" d="M505.65,402.15c0,.08-.03.16-.04.25,0,.07-.03.14-.04.21-.31,0-.74,0-1.28.01-.54,0-1.19.01-1.93.02.01-.07.03-.13.04-.2.01-.08.03-.16.04-.24.76-.01,1.43-.02,1.97-.03.54,0,.96-.02,1.25-.02Z"/>
                  <path class="pqr-308" d="M505.68,401.91c0,.08-.02.16-.03.25-.29,0-.71.01-1.25.02-.54,0-1.21.02-1.97.03,0-.08.02-.16.02-.24.76-.01,1.42-.03,1.97-.04.54-.01.97-.02,1.26-.02Z"/>
                  <path class="pqr-342" d="M506.12,411.79v.49c-.4-.02-.84-.04-1.32-.06,0-.16.01-.32.02-.49.47.02.91.04,1.3.06Z"/>
                  <path class="pqr-219" d="M506.12,410.69v1.1c-.39-.02-.83-.04-1.3-.06,0-.16.02-.32.03-.49.01-.2.03-.4.04-.6.45.02.86.03,1.23.04Z"/>
                  <path class="pqr-362" d="M506.12,409.36v1.33c-.37-.01-.78-.03-1.23-.04,0-.2.03-.4.03-.6,0-.24.02-.48.03-.71.44.01.83.02,1.17.03Z"/>
                  <path class="pqr-186" d="M506.12,408.26v1.1c-.33,0-.72-.02-1.17-.03.01-.24.04-.48.05-.71,0-.13.02-.25.02-.38.42,0,.79.01,1.1.02Z"/>
                  <path class="pqr-60" d="M506.12,407.6v.66c-.31,0-.67-.01-1.1-.02,0-.13.01-.25.01-.38,0-.09-.01-.18-.02-.28.42,0,.79.01,1.1.01Z"/>
                  <path class="pqr-401" d="M506.12,407.14v.46c-.31,0-.68,0-1.1-.01,0-.09-.02-.19-.03-.28,0-.06-.01-.12-.02-.18.44,0,.83.01,1.15.02Z"/>
                  <path class="pqr-162" d="M506.12,406.77v.37c-.33,0-.72-.01-1.15-.02,0-.06-.01-.12-.01-.18s0-.12-.01-.19c.44,0,.83.02,1.17.02Z"/>
                  <path class="pqr-401" d="M506.12,406.38v.39c-.34,0-.73-.01-1.17-.02,0-.06-.01-.12-.02-.19,0-.07-.02-.14-.02-.21.45,0,.86.02,1.22.02Z"/>
                  <path class="pqr-411" d="M506.12,406.11v.27c-.36,0-.77-.02-1.22-.02,0-.07-.02-.14-.02-.21,0-.02,0-.04,0-.06.46,0,.87.02,1.24.03Z"/>
                  <path class="pqr-452" d="M506.12,405.66v.45c-.37,0-.78-.02-1.24-.03,0-.02,0-.04,0-.06,0-.13.04-.26.06-.38.46,0,.86.02,1.19.02Z"/>
                  <path class="pqr-171" d="M506.12,404.99v.66c-.33,0-.73-.02-1.19-.02.01-.13.07-.26.09-.38.02-.09.05-.18.07-.27.42,0,.77.01,1.03.02Z"/>
                  <path class="pqr-308" d="M506.12,404.34v.65c-.26,0-.61-.01-1.03-.02.02-.09.05-.18.07-.27.02-.12.06-.25.07-.37.38,0,.67,0,.89.01Z"/>
                  <path class="pqr-401" d="M506.12,403.39v.95c-.21,0-.51,0-.89-.01.01-.12.04-.25.04-.37,0-.19.06-.38.09-.57.36,0,.62,0,.75,0Z"/>
                  <path class="pqr-401" d="M506.12,402.61v.79c-.13,0-.39,0-.75,0,.03-.19.11-.38.14-.58.01-.07.04-.14.05-.21.31,0,.5,0,.56,0Z"/>
                  <path class="pqr-55" d="M506.12,402.15v.46c-.06,0-.25,0-.56,0,.01-.07.03-.14.04-.21.01-.08.04-.16.04-.25.29,0,.45,0,.47,0Z"/>
                  <path class="pqr-94" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                </g>
                <g>
                  <path class="pqr-51" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                </g>
                <g>
                  <path class="pqr-51" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s-.18,0-.47,0c0-.08.03-.16.03-.25.29,0,.44,0,.44,0Z"/>
                </g>
              </g>
              <g id="MeshGrid-2" data-name="MeshGrid">
                <g>
                  <path class="pqr-423" d="M505.38,874.66c.02.3.14.6.16.88.38-.01.58-.03.58-.03v-.97c-.1,0-.35.06-.74.12Z"/>
                  <path class="pqr-387" d="M505.1,873c.02.25.1.49.12.73.03.32.14.63.17.93.39-.06.64-.12.74-.12v-1.7c-.25,0-.59.09-1.02.16Z"/>
                  <path class="pqr-122" d="M504.89,871.67c.02.2.07.39.09.58.02.25.1.5.12.75.43-.08.77-.16,1.02-.16v-1.28c-.36,0-.76.06-1.23.11Z"/>
                  <path class="pqr-198" d="M504.75,870.66c.01.14.05.28.06.42.02.2.07.4.09.59.47-.05.87-.11,1.23-.11v-.93c-.42,0-.88.02-1.37.04Z"/>
                  <path class="pqr-341" d="M504.64,869.5c.02.25.03.49.05.74.01.14.05.28.06.42.5-.01.95-.03,1.37-.04v-1.15c-.45,0-.95.02-1.48.03Z"/>
                  <path class="pqr-357" d="M504.47,866.84c.04.64.07,1.28.12,1.93.02.25.03.49.05.74.53-.01,1.04-.03,1.48-.03v-2.78c-.47.01-1.04.08-1.65.15Z"/>
                  <path class="pqr-5" d="M504.23,861.74c.05,1.06.08,2.12.14,3.17.04.64.06,1.28.1,1.92.61-.07,1.18-.14,1.65-.15v-5.33c-.53.03-1.19.21-1.89.39Z"/>
                  <path class="pqr-326" d="M504.03,854.71c.03,1.29.05,2.58.09,3.86.04,1.06.06,2.12.11,3.17.71-.18,1.37-.36,1.89-.39v-7.36c-.61.05-1.32.38-2.09.71Z"/>
                  <path class="pqr-361" d="M503.98,849.53c0,.44,0,.87,0,1.31.01,1.29.01,2.59.04,3.87.77-.33,1.49-.66,2.09-.71v-5.4c-.65.06-1.36.49-2.14.93Z"/>
                  <path class="pqr-361" d="M503.98,846.28c0,.67,0,1.32,0,1.93,0,.44,0,.87,0,1.31.78-.44,1.49-.87,2.14-.93v-2.98c-.65.06-1.36.36-2.14.66Z"/>
                  <path class="pqr-401" d="M503.99,842.75v1.44c0,.72,0,1.42,0,2.09.78-.3,1.49-.6,2.14-.66v-3.42c-.65.06-1.36.31-2.13.56Z"/>
                  <path class="pqr-403" d="M503.99,633.17c0,87.27,0,177.63,0,208.13v1.46c.78-.25,1.49-.49,2.13-.56v-204.49c-.64.88-1.35-1.83-2.13-4.54Z"/>
                  <path class="pqr-111" d="M503.99,425.81c0,1.98,0,3.99,0,6.11,0,5.51,0,12.6,0,21.84,0,29.86,0,103.49,0,179.4.78,2.7,1.5,5.42,2.13,4.54v-209.19c-.63-.03-1.35-1.37-2.13-2.7Z"/>
                  <path class="pqr-300" d="M503.99,416.52c0,1.18,0,2.37,0,3.62,0,1.83,0,3.71,0,5.68.79,1.33,1.5,2.68,2.13,2.7v-10.77c-.63-.03-1.34-.63-2.13-1.23Z"/>
                  <path class="pqr-393" d="M503.99,412.64v.47c0,1.11,0,2.23,0,3.41.79.6,1.5,1.2,2.13,1.23v-4.87c-.63-.03-1.34-.13-2.13-.24Z"/>
                  <path class="pqr-342" d="M503.99,412.18v.46c.79.1,1.5.21,2.13.24v-.6c-.63-.03-1.34-.06-2.13-.1Z"/>
                  <path class="pqr-59" d="M503.04,874.75c.07.28.13.55.19.79.24,0,.48.01.69.02.69.01,1.24,0,1.62-.01-.02-.29-.14-.58-.16-.88-.39.06-.93.11-1.6.1-.25,0-.49,0-.75-.01Z"/>
                  <path class="pqr-373" d="M502.66,873.11c.06.25.12.5.17.73.07.32.14.62.21.9.26,0,.5,0,.75.01.67.01,1.2-.04,1.6-.1-.02-.3-.14-.61-.17-.93-.02-.24-.1-.48-.12-.73-.43.08-.95.15-1.58.13-.3,0-.57-.01-.86-.02Z"/>
                  <path class="pqr-96" d="M502.33,871.72c.05.21.1.42.14.62.06.27.12.53.18.78.29,0,.57.01.86.02.63.02,1.15-.06,1.58-.13-.02-.25-.1-.5-.12-.75-.02-.19-.07-.39-.09-.58-.47.05-.99.1-1.59.08-.33-.01-.64-.02-.97-.03Z"/>
                  <path class="pqr-381" d="M502.07,870.63c.04.15.07.3.11.45.05.22.1.43.15.64.33.01.64.02.97.03.6.02,1.13-.03,1.59-.08-.02-.2-.07-.39-.09-.59-.01-.14-.04-.28-.06-.42-.5.01-1.03.02-1.62,0-.35-.01-.7-.02-1.06-.04Z"/>
                  <path class="pqr-303" d="M501.79,869.44c.06.24.12.48.18.72.04.15.07.31.11.46.36.02.71.03,1.06.04.58.02,1.12.01,1.62,0-.01-.14-.05-.28-.06-.42-.02-.25-.03-.49-.05-.74-.53.01-1.1.01-1.68,0-.36-.01-.76-.03-1.17-.06Z"/>
                  <path class="pqr-85" d="M501.19,866.85c.14.63.27,1.24.42,1.87.06.24.11.48.17.72.41.03.81.05,1.17.06.58.02,1.15.01,1.68,0-.02-.25-.03-.49-.05-.74-.04-.64-.08-1.29-.12-1.93-.61.07-1.25.13-1.87.12-.42,0-.91-.05-1.42-.1Z"/>
                  <path class="pqr-5" d="M500.17,861.94c.21,1.03.39,2.02.62,3.06.14.62.26,1.23.4,1.86.51.05.99.1,1.42.1.61.01,1.26-.05,1.87-.12-.04-.64-.07-1.28-.1-1.92-.06-1.06-.09-2.12-.14-3.17-.71.18-1.46.35-2.16.36-.61.02-1.24-.06-1.9-.16Z"/>
                  <path class="pqr-347" d="M498.97,855.14c.21,1.26.4,2.49.63,3.74.19,1.03.36,2.03.57,3.06.66.11,1.29.19,1.9.16.7,0,1.46-.18,2.16-.36-.05-1.06-.07-2.11-.11-3.17-.04-1.29-.06-2.57-.09-3.86-.77.33-1.6.66-2.43.7-.87.05-1.72-.08-2.63-.27Z"/>
                  <path class="pqr-31" d="M498.27,850.07c.05.43.08.85.14,1.28.18,1.28.35,2.52.56,3.78.91.18,1.77.32,2.63.27.83-.04,1.66-.37,2.43-.7-.03-1.29-.03-2.58-.04-3.87,0-.43,0-.87,0-1.31-.78.44-1.62.87-2.51.92-1,.07-2.06-.12-3.2-.37Z"/>
                  <path class="pqr-225" d="M498.02,846.74c.04.67.07,1.42.12,2.04.05.44.07.86.12,1.29,1.14.26,2.19.45,3.2.37.9-.05,1.74-.49,2.51-.92,0-.44,0-.87,0-1.31,0-.62,0-1.26,0-1.93-.78.3-1.62.6-2.52.66-1.05.07-2.2-.05-3.44-.2Z"/>
                  <path class="pqr-263" d="M497.91,843.67c.01.29.02.63.03.9.03.71.05,1.5.09,2.17,1.24.15,2.39.27,3.44.2.9-.06,1.75-.36,2.52-.66,0-.67,0-1.37,0-2.09v-1.44c-.78.25-1.62.49-2.53.55-1.08.06-2.27.21-3.55.37Z"/>
                  <path class="pqr-263" d="M497.39,639.2c.03,60.23.12,118.51.12,148.75s.1,47.6.37,54.75c.01.32.01.68.03.97,1.28-.16,2.47-.3,3.55-.37.91-.06,1.75-.3,2.53-.55v-1.46c0-30.5,0-120.86,0-208.13-.78-2.7-1.63-5.39-2.53-4.45-1.27-2.62-2.64,3.91-4.07,10.48Z"/>
                  <path class="pqr-401" d="M497.17,423.52c0,1.92,0,3.94,0,6.16,0,2.65.01,5.72.01,9.24,0,3.97.01,8.73.01,14.42,0,28.49.15,108.66.19,185.86,1.43-6.57,2.8-13.1,4.07-10.48.9-.94,1.75,1.74,2.53,4.45,0-75.91,0-149.55,0-179.4,0-9.24,0-16.33,0-21.84,0-2.12,0-4.14,0-6.11-.79-1.33-1.64-2.64-2.53-2.59-1.36.08-2.82.16-4.29.29Z"/>
                  <path class="pqr-401" d="M497.16,415.12c0,.97,0,2.01,0,3.17,0,1.59,0,3.31,0,5.22,1.47-.12,2.92-.21,4.29-.29.89-.05,1.75,1.26,2.53,2.59,0-1.98,0-3.85,0-5.68,0-1.25,0-2.44,0-3.62-.78-.6-1.64-1.2-2.53-1.21-1.36-.02-2.82-.11-4.3-.18Z"/>
                  <path class="pqr-336" d="M497.15,412.21c0,.11,0,.21,0,.32,0,.77,0,1.62,0,2.59,1.48.07,2.94.16,4.3.18.9.01,1.75.61,2.53,1.21,0-1.18,0-2.3,0-3.41v-.47c-.79-.1-1.64-.21-2.53-.25-1.36-.06-2.83-.12-4.31-.19Z"/>
                  <path class="pqr-83" d="M497.15,411.9v.31c1.48.06,2.94.13,4.31.19.9.04,1.75.14,2.53.25v-.46c-.79-.04-1.64-.07-2.53-.11-1.36-.06-2.83-.12-4.31-.17Z"/>
                  <path class="pqr-118" d="M501.97,874.7c.09.28.18.55.26.79.08,0,.15,0,.23.01.27.01.53.03.77.03-.06-.24-.12-.51-.19-.79-.26,0-.53-.01-.83-.03-.08,0-.16,0-.24-.01Z"/>
                  <path class="pqr-237" d="M501.43,873.06c.08.26.16.5.24.74.1.32.2.62.29.9.08,0,.16,0,.24.01.3.02.57.02.83.03-.07-.28-.14-.58-.21-.9-.05-.24-.11-.48-.17-.73-.29,0-.59-.02-.94-.04-.1,0-.19-.01-.28-.02Z"/>
                  <path class="pqr-359" d="M500.96,871.65c.07.21.14.42.21.62.09.27.18.53.26.79.09,0,.19,0,.28.02.35.02.65.03.94.04-.06-.25-.12-.51-.18-.78-.05-.2-.1-.41-.14-.62-.33-.01-.67-.03-1.05-.05-.11,0-.21-.01-.32-.02Z"/>
                  <path class="pqr-69" d="M500.59,870.55c.05.15.1.31.16.46.07.22.15.43.22.64.11,0,.21.01.32.02.38.02.72.04,1.05.05-.05-.21-.1-.42-.15-.64-.04-.15-.07-.3-.11-.45-.36-.02-.74-.04-1.14-.06-.11,0-.23-.01-.34-.02Z"/>
                  <path class="pqr-286" d="M500.17,869.34c.09.25.17.5.26.74.05.16.11.31.16.46.11,0,.23.01.34.02.4.02.78.04,1.14.06-.04-.15-.07-.31-.11-.46-.06-.24-.12-.48-.18-.72-.41-.03-.84-.06-1.26-.08-.12,0-.24-.01-.36-.02Z"/>
                  <path class="pqr-357" d="M499.23,866.66c.23.64.46,1.29.69,1.93.09.25.17.5.26.74.12,0,.24.02.36.02.42.02.84.05,1.26.08-.06-.24-.11-.48-.17-.72-.15-.63-.28-1.24-.42-1.87-.51-.05-1.03-.12-1.54-.16-.14-.01-.28-.02-.43-.03Z"/>
                  <path class="pqr-5" d="M497.4,861.56c.38,1.06.75,2.12,1.13,3.17.23.64.46,1.29.69,1.93.14.01.29.02.43.03.5.04,1.03.1,1.54.16-.14-.63-.27-1.24-.4-1.86-.23-1.03-.41-2.03-.62-3.06-.66-.11-1.36-.24-2.12-.32-.21-.02-.43-.04-.65-.06Z"/>
                  <path class="pqr-208" d="M495.01,854.49c.41,1.3.84,2.6,1.29,3.89.37,1.06.73,2.12,1.11,3.18.22.01.44.03.65.06.76.08,1.46.22,2.12.32-.21-1.03-.38-2.02-.57-3.06-.23-1.26-.42-2.48-.63-3.74-.91-.18-1.88-.42-2.98-.56-.31-.04-.64-.07-.98-.09Z"/>
                  <path class="pqr-89" d="M493.48,849.2c.11.45.23.9.36,1.35.37,1.32.76,2.64,1.17,3.95.34.02.67.05.98.09,1.1.14,2.07.38,2.98.56-.21-1.26-.37-2.5-.56-3.78-.06-.43-.09-.85-.14-1.28-1.14-.25-2.35-.57-3.66-.76-.37-.05-.74-.09-1.13-.12Z"/>
                  <path class="pqr-29" d="M492.85,846.26c.09.53.19,1.04.31,1.59.1.45.21.91.32,1.36.38.03.76.07,1.13.12,1.31.18,2.53.5,3.66.76-.05-.43-.07-.86-.12-1.29-.06-.63-.09-1.37-.12-2.04-1.24-.15-2.57-.35-3.97-.42-.39-.02-.8-.05-1.21-.06Z"/>
                  <path class="pqr-340" d="M492.54,844.17c.02.21.05.4.08.58.07.5.15.98.23,1.51.41.02.81.04,1.21.06,1.41.08,2.74.27,3.97.42-.04-.67-.06-1.46-.09-2.17-.01-.27-.02-.6-.03-.9-1.28.16-2.66.32-4.12.43-.41.03-.83.05-1.25.07Z"/>
                  <path class="pqr-46" d="M491.7,648.5c.03,60.54.06,113.83.06,130.07,0,40.24.14,58.65.71,64.92.02.25.05.47.07.69.42-.02.84-.05,1.25-.07,1.46-.1,2.84-.27,4.12-.43-.01-.29-.02-.65-.03-.97-.26-7.14-.37-24.19-.37-54.75s-.1-88.52-.12-148.75c-1.43,6.57-2.91,13.18-4.43,10.72-.42-.91-.84-1.16-1.27-1.43Z"/>
                  <path class="pqr-149" d="M491.58,421.78c0,1.71,0,3.55,0,5.52,0,2.17,0,4.7,0,7.57,0,32.62.06,130.05.1,213.62.42.27.85.52,1.27,1.43,1.51,2.46,3-4.15,4.43-10.72-.03-77.2-.18-157.38-.19-185.86,0-5.69-.01-10.46-.01-14.42,0-3.52,0-6.59-.01-9.24,0-2.21,0-4.24,0-6.16-1.47.12-2.96.28-4.39.52-.4-.85-.8-1.55-1.2-2.25Z"/>
                  <path class="pqr-340" d="M491.57,414.4c0,.82,0,1.72,0,2.71,0,1.4,0,2.96,0,4.67.39.7.79,1.4,1.2,2.25,1.44-.23,2.92-.39,4.39-.52,0-1.92,0-3.63,0-5.22,0-1.16,0-2.2,0-3.17-1.48-.07-2.97-.13-4.41-.1-.4-.24-.8-.43-1.18-.62Z"/>
                  <path class="pqr-191" d="M491.57,411.97c0,.09,0,.17,0,.26,0,.63,0,1.35,0,2.17.39.19.78.38,1.18.62,1.43-.03,2.93.03,4.41.1,0-.97,0-1.82,0-2.59,0-.11,0-.22,0-.32-1.48-.06-2.98-.12-4.41-.16-.4-.02-.79-.05-1.18-.08Z"/>
                  <path class="pqr-225" d="M491.57,411.72v.25c.39.03.78.06,1.18.08,1.43.04,2.93.1,4.41.16v-.31c-1.48-.06-2.98-.11-4.41-.15-.4-.01-.79-.02-1.18-.03Z"/>
                  <path class="pqr-313" d="M501.25,874.65c.12.28.24.55.33.79.14.01.28.02.42.03.08,0,.16.01.24.01-.08-.24-.17-.5-.26-.79-.08,0-.16,0-.25-.01-.17-.01-.32-.02-.47-.04Z"/>
                  <path class="pqr-237" d="M500.51,873c.12.26.23.51.34.75.14.32.28.63.4.91.15.01.3.02.47.04.09,0,.17.01.25.01-.09-.28-.19-.58-.29-.9-.08-.24-.16-.49-.24-.74-.09,0-.19-.01-.29-.02-.22-.01-.43-.03-.63-.05Z"/>
                  <path class="pqr-173" d="M499.88,871.58c.09.21.18.42.27.63.12.27.24.54.35.79.21.02.41.03.63.05.1,0,.2.01.29.02-.08-.26-.17-.52-.26-.79-.07-.2-.14-.41-.21-.62-.11,0-.21-.01-.32-.02-.25-.02-.51-.03-.76-.05Z"/>
                  <path class="pqr-125" d="M499.42,870.47c.06.15.12.31.19.46.09.22.18.43.27.65.25.02.51.03.76.05.11,0,.22.01.32.02-.07-.21-.14-.43-.22-.64-.05-.15-.1-.3-.16-.46-.11,0-.23-.01-.35-.02-.27-.02-.55-.04-.83-.05Z"/>
                  <path class="pqr-410" d="M498.95,869.26c.1.25.19.49.29.74.06.16.12.31.18.46.28.02.55.04.83.05.12,0,.23.01.35.02-.05-.15-.11-.31-.16-.46-.09-.25-.17-.5-.26-.74-.12,0-.24-.02-.36-.02-.28-.02-.57-.03-.86-.05Z"/>
                  <path class="pqr-77" d="M497.87,866.6c.27.64.53,1.28.78,1.92.1.25.2.49.29.74.29.02.58.03.86.05.12,0,.24.02.36.02-.09-.25-.17-.5-.26-.74-.23-.64-.46-1.29-.69-1.93-.14-.01-.29-.02-.44-.03-.29-.02-.6-.02-.91-.03Z"/>
                  <path class="pqr-5" d="M495.72,861.53c.45,1.05.9,2.1,1.35,3.15.27.64.54,1.28.81,1.91.31,0,.62.02.91.03.15,0,.3.02.44.03-.23-.64-.46-1.29-.69-1.93-.38-1.06-.76-2.12-1.13-3.17-.22-.01-.45-.02-.68-.02-.31,0-.66,0-1,0Z"/>
                  <path class="pqr-338" d="M492.89,854.49c.47,1.3.98,2.6,1.51,3.88.43,1.06.88,2.11,1.32,3.16.35,0,.69,0,1,0,.23,0,.46,0,.68.02-.38-1.06-.74-2.12-1.11-3.18-.44-1.29-.87-2.59-1.29-3.89-.34-.02-.69-.03-1.03-.02-.35,0-.72.01-1.09.02Z"/>
                  <path class="pqr-39" d="M491.2,849.18c.12.45.25.9.38,1.35.39,1.34.83,2.65,1.3,3.96.37,0,.74-.02,1.09-.02.34,0,.69,0,1.03.02-.41-1.3-.8-2.62-1.17-3.95-.12-.45-.25-.9-.36-1.35-.38-.03-.78-.04-1.18-.03-.37,0-.73.01-1.1.01Z"/>
                  <path class="pqr-312" d="M490.51,846.25c.1.51.21,1.03.34,1.57.11.46.23.91.35,1.36.37,0,.73,0,1.1-.01.4,0,.79,0,1.18.03-.11-.45-.22-.9-.32-1.36-.12-.55-.22-1.06-.31-1.59-.41-.02-.83-.02-1.25-.02-.36,0-.73.01-1.09,0Z"/>
                  <path class="pqr-61" d="M490.16,844.17c.03.23.05.42.09.61.08.47.16.96.26,1.47.36,0,.73,0,1.09,0,.42,0,.84,0,1.25.02-.09-.53-.16-1.01-.23-1.51-.03-.18-.05-.36-.08-.58-.42.02-.85.03-1.29.04-.36,0-.72-.01-1.09-.04Z"/>
                  <path class="pqr-335" d="M489.34,636.53c0,53.83.01,104.5.02,133.7,0,1.55,0,3.06,0,4.51,0,17.86.03,32.06.12,43.11.08,11.25.02,19.75.61,25.6.03.27.05.49.08.72.37.03.73.04,1.09.04.44,0,.87-.02,1.29-.04-.02-.21-.05-.43-.07-.69-.56-6.28-.71-24.68-.71-64.92,0-16.23-.03-69.52-.06-130.07-.42-.27-.85-.56-1.27-1.55-.36-1.06-.72-5.73-1.09-10.42Z"/>
                  <path class="pqr-411" d="M489.32,423.82c0,1.78,0,3.61,0,5.5,0,31.06,0,122.77.01,207.21.37,4.69.73,9.36,1.09,10.42.42.99.85,1.28,1.27,1.55-.04-83.58-.1-181-.1-213.62,0-2.87,0-5.4,0-7.57,0-1.97,0-3.82,0-5.52-.39-.7-.78-1.4-1.16-2.25-.37-.02-.74,2.14-1.1,4.29Z"/>
                  <path class="pqr-411" d="M489.32,415.49v3.18c0,1.65,0,3.37,0,5.15.37-2.15.74-4.31,1.1-4.29.38.85.77,1.55,1.16,2.25,0-1.7,0-3.27,0-4.67,0-.99,0-1.9,0-2.71-.39-.19-.77-.38-1.14-.61-.37,0-.74.85-1.1,1.7Z"/>
                  <path class="pqr-338" d="M489.32,412.08v.41c0,.97,0,1.98,0,3.01.37-.86.74-1.71,1.1-1.7.37.24.75.42,1.14.61,0-.82,0-1.54,0-2.17,0-.09,0-.18,0-.26-.39-.03-.77-.06-1.14-.08-.37,0-.74.09-1.11.18Z"/>
                  <path class="pqr-403" d="M489.32,411.67v.41c.37-.1.74-.19,1.11-.18.37.01.75.04,1.14.08v-.25c-.39,0-.77-.02-1.14-.03-.37,0-.74-.01-1.11-.02Z"/>
                  <path class="pqr-132" d="M499.9,874.53c.19.29.37.56.52.81.25.03.49.05.73.07.15.01.29.02.43.04-.09-.24-.21-.51-.33-.79-.15-.01-.31-.03-.48-.04-.29-.02-.57-.05-.86-.08Z"/>
                  <path class="pqr-231" d="M498.79,872.85c.17.26.34.51.5.75.21.33.43.63.62.92.29.03.58.06.86.08.18.01.33.03.48.04-.12-.28-.26-.59-.4-.91-.11-.24-.22-.49-.34-.75-.21-.02-.42-.03-.64-.05-.36-.03-.72-.06-1.08-.09Z"/>
                  <path class="pqr-11" d="M497.89,871.42c.13.21.25.42.38.63.17.27.34.54.51.8.36.04.71.07,1.08.09.22.02.43.03.64.05-.11-.26-.23-.52-.35-.79-.09-.21-.18-.42-.27-.63-.25-.02-.51-.04-.76-.05-.42-.03-.82-.06-1.23-.1Z"/>
                  <path class="pqr-198" d="M497.26,870.31c.08.15.17.31.26.46.13.22.25.44.38.65.4.04.81.07,1.23.1.26.02.51.04.76.05-.09-.21-.18-.43-.27-.65-.06-.15-.13-.3-.19-.46-.28-.02-.55-.04-.83-.06-.45-.03-.89-.07-1.34-.1Z"/>
                  <path class="pqr-26" d="M496.66,869.12c.12.24.23.48.35.73.08.16.16.31.24.47.44.04.89.07,1.34.1.28.02.55.04.83.06-.06-.15-.12-.31-.18-.46-.09-.25-.19-.5-.29-.74-.29-.02-.58-.03-.86-.05-.46-.03-.94-.06-1.42-.09Z"/>
                  <path class="pqr-121" d="M495.39,866.51c.31.63.61,1.25.92,1.88.12.24.23.48.35.72.48.03.96.06,1.42.09.28.02.57.04.86.05-.1-.25-.19-.49-.29-.74-.26-.64-.52-1.28-.78-1.92-.31,0-.62-.02-.92-.04-.48-.03-1.02-.04-1.56-.05Z"/>
                  <path class="pqr-5" d="M492.97,861.53c.49,1.04.99,2.07,1.49,3.1.31.63.61,1.25.92,1.88.54.01,1.09.02,1.56.05.29.02.6.03.92.04-.27-.64-.54-1.28-.81-1.91-.45-1.05-.9-2.1-1.35-3.15-.35,0-.69,0-1.01,0-.52-.02-1.13,0-1.73,0Z"/>
                  <path class="pqr-43" d="M489.98,854.52c.49,1.31,1.01,2.6,1.57,3.88.46,1.05.93,2.09,1.42,3.13.61,0,1.22-.02,1.73,0,.32.01.66.01,1.01,0-.45-1.05-.89-2.1-1.32-3.16-.53-1.29-1.03-2.58-1.51-3.88-.37,0-.74.02-1.09.01-.57,0-1.19,0-1.81.02Z"/>
                  <path class="pqr-161" d="M488.3,849.15c.12.46.24.92.37,1.38.39,1.36.83,2.69,1.31,4,.62,0,1.24-.02,1.81-.02.35,0,.72,0,1.09-.01-.47-1.31-.91-2.62-1.3-3.96-.13-.45-.26-.9-.38-1.35-.37,0-.73,0-1.1,0-.6,0-1.2-.02-1.8-.04Z"/>
                  <path class="pqr-249" d="M487.63,846.18c.1.51.21,1.04.33,1.57.11.47.22.93.34,1.4.6.02,1.2.03,1.8.04.37,0,.74,0,1.1,0-.12-.45-.24-.9-.35-1.36-.13-.54-.24-1.06-.34-1.57-.36,0-.73,0-1.09-.01-.6-.01-1.19-.03-1.79-.06Z"/>
                  <path class="pqr-326" d="M487.23,843.71c.04.36.09.68.13.98.07.47.16.97.26,1.48.6.03,1.19.05,1.79.06.37,0,.73.01,1.09.01-.1-.51-.19-1-.26-1.47-.03-.19-.06-.38-.09-.61-.37-.03-.73-.07-1.1-.12-.6-.08-1.21-.2-1.82-.34Z"/>
                  <path class="pqr-204" d="M486.42,625.88c0,48.14.02,96.99.04,137.9,0,16.3.04,31.31.06,44.5.02,13.61-.31,25.31.6,34.37.04.35.07.71.12,1.07.61.13,1.22.25,1.82.34.37.05.74.09,1.1.12-.03-.23-.05-.45-.08-.72-.58-5.85-.52-14.35-.61-25.6-.09-11.05-.12-25.26-.12-43.11,0-1.45,0-2.96,0-4.51,0-29.2-.01-79.87-.02-133.7-.37-4.69-.74-9.38-1.1-10.48-.6.07-1.21-.01-1.82-.16Z"/>
                  <path class="pqr-197" d="M486.42,428.07c0,2.19,0,4.38,0,6.57,0,36.04,0,112.69,0,191.25.61.15,1.22.23,1.82.16.37,1.1.74,5.8,1.1,10.48,0-84.44-.01-176.15-.01-207.21,0-1.89,0-3.72,0-5.5-.37,2.15-.74,4.31-1.11,4.3-.6,0-1.2-.03-1.8-.06Z"/>
                  <path class="pqr-375" d="M486.42,417.17c0,1.44,0,2.88,0,4.32,0,2.19,0,4.38,0,6.57.6.02,1.2.05,1.8.06.37,0,.74-2.15,1.11-4.3,0-1.78,0-3.49,0-5.15v-3.18c-.37.86-.74,1.72-1.11,1.71-.6,0-1.2-.02-1.8-.03Z"/>
                  <path class="pqr-287" d="M486.42,412.25v4.93c.6.01,1.2.02,1.8.03.37,0,.74-.85,1.11-1.71,0-1.03,0-2.03,0-3.01v-.41c-.37.1-.74.19-1.11.19-.6,0-1.2-.01-1.8-.02Z"/>
                  <path class="pqr-399" d="M486.42,411.64v.61c.6,0,1.2.01,1.8.02.37,0,.74-.09,1.11-.19v-.41c-.37,0-.74-.01-1.11-.02-.6,0-1.2-.01-1.8-.02Z"/>
                  <path class="pqr-266" d="M497.93,874.27c.27.3.52.58.75.85.33.05.66.09.97.13.26.03.52.06.77.09-.14-.25-.33-.52-.52-.81-.29-.03-.58-.07-.88-.1-.36-.04-.72-.1-1.09-.15Z"/>
                  <path class="pqr-270" d="M496.43,872.56c.23.26.45.52.66.76.28.33.57.65.83.95.37.06.74.11,1.09.15.3.04.59.07.88.1-.19-.29-.41-.6-.62-.92-.16-.24-.33-.49-.5-.75-.36-.04-.71-.07-1.06-.12-.43-.05-.86-.11-1.29-.18Z"/>
                  <path class="pqr-152" d="M495.22,871.12c.17.22.36.43.53.64.23.28.46.54.68.81.44.06.87.12,1.29.18.35.04.71.08,1.06.12-.17-.26-.35-.53-.51-.8-.13-.21-.25-.42-.38-.63-.4-.04-.8-.08-1.21-.12-.49-.05-.97-.11-1.46-.18Z"/>
                  <path class="pqr-385" d="M494.33,870c.12.16.24.31.36.46.17.22.35.44.53.65.49.07.98.13,1.46.18.41.04.81.08,1.21.12-.13-.21-.25-.43-.38-.65-.09-.15-.17-.31-.26-.46-.44-.04-.89-.08-1.33-.12-.54-.05-1.07-.12-1.6-.19Z"/>
                  <path class="pqr-422" d="M493.52,868.83c.15.23.3.46.46.7.11.16.23.31.35.47.53.07,1.06.13,1.6.19.44.05.89.09,1.33.12-.08-.15-.17-.31-.24-.47-.12-.24-.23-.48-.35-.73-.48-.03-.96-.07-1.42-.11-.55-.06-1.14-.11-1.72-.17Z"/>
                  <path class="pqr-208" d="M491.93,866.32c.37.61.76,1.21,1.14,1.82.15.23.3.47.45.7.58.06,1.16.12,1.72.17.46.05.94.08,1.42.11-.12-.24-.23-.48-.35-.72-.31-.63-.61-1.26-.92-1.88-.54-.01-1.09-.03-1.56-.07-.57-.05-1.24-.08-1.9-.12Z"/>
                  <path class="pqr-5" d="M489.13,861.44c.54,1.03,1.11,2.04,1.7,3.05.36.61.72,1.22,1.1,1.83.66.04,1.32.07,1.9.12.47.04,1.02.06,1.56.07-.31-.63-.62-1.25-.92-1.88-.51-1.03-1.01-2.06-1.49-3.1-.61,0-1.22.01-1.73-.02-.62-.05-1.37-.05-2.1-.07Z"/>
                  <path class="pqr-269" d="M485.98,854.42c.49,1.33,1.03,2.63,1.62,3.91.48,1.05,1,2.09,1.53,3.11.74.02,1.48.02,2.1.07.52.04,1.13.03,1.73.02-.49-1.04-.97-2.08-1.42-3.13-.56-1.28-1.08-2.57-1.57-3.88-.62,0-1.24.01-1.82-.02-.69-.04-1.44-.05-2.18-.09Z"/>
                  <path class="pqr-269" d="M484.33,848.9c.11.48.23.97.35,1.44.38,1.4.81,2.75,1.3,4.08.74.03,1.49.05,2.18.09.58.03,1.2.03,1.82.02-.49-1.31-.93-2.64-1.31-4-.13-.46-.26-.92-.37-1.38-.6-.02-1.2-.05-1.8-.08-.72-.04-1.45-.1-2.17-.16Z"/>
                  <path class="pqr-364" d="M483.68,845.87c.1.51.22,1.04.33,1.57.1.49.2.98.31,1.46.72.07,1.44.12,2.17.16.6.04,1.2.06,1.8.08-.12-.46-.23-.93-.34-1.4-.12-.54-.23-1.06-.33-1.57-.6-.03-1.19-.07-1.79-.11-.72-.06-1.44-.12-2.15-.2Z"/>
                  <path class="pqr-34" d="M483.2,842.75c.06.53.14,1.13.21,1.62.07.48.17.98.27,1.49.72.07,1.43.14,2.15.2.6.05,1.19.08,1.79.11-.1-.51-.19-1.01-.26-1.48-.04-.3-.09-.62-.13-.98-.61-.13-1.22-.28-1.83-.43-.74-.18-1.47-.36-2.2-.53Z"/>
                  <path class="pqr-271" d="M482.4,624.9c0,47.86.01,96.44.06,137.15.02,16.45.1,31.59.04,44.86-.06,13.55-.39,25.19.51,34.19.05.51.12,1.13.18,1.65.73.17,1.47.35,2.2.53.61.15,1.22.29,1.83.43-.04-.36-.08-.71-.12-1.07-.9-9.05-.58-20.75-.6-34.37-.02-13.19-.05-28.2-.06-44.5-.02-40.91-.04-89.75-.04-137.9-.61-.15-1.22-.36-1.83-.57-.73-.12-1.46-.27-2.19-.41Z"/>
                  <path class="pqr-197" d="M482.45,427.97c0,2.18,0,4.36,0,6.54,0,35.84-.05,112.05-.04,190.4.73.14,1.46.29,2.19.41.6.21,1.22.42,1.83.57,0-78.55,0-155.21,0-191.25,0-2.19,0-4.38,0-6.57-.6-.02-1.2-.05-1.8-.05-.72,0-1.45-.02-2.17-.05Z"/>
                  <path class="pqr-317" d="M482.45,417.13c0,1.43,0,2.86,0,4.3,0,2.18,0,4.36,0,6.54.72.02,1.45.05,2.17.05.6,0,1.2.03,1.8.05,0-2.19,0-4.38,0-6.57,0-1.44,0-2.88,0-4.32-.6-.01-1.2-.02-1.8-.03-.72,0-1.45,0-2.17-.02Z"/>
                  <path class="pqr-397" d="M482.45,412.23v.6c0,1.43,0,2.86,0,4.3.72,0,1.45.02,2.17.02.6,0,1.2.01,1.8.03v-4.93c-.6,0-1.2,0-1.8-.01-.72,0-1.45,0-2.17,0Z"/>
                  <path class="pqr-89" d="M482.45,411.63v.6c.72,0,1.45,0,2.17,0,.6,0,1.2,0,1.8.01v-.61c-.6,0-1.2,0-1.8,0-.72,0-1.45,0-2.17,0Z"/>
                  <path class="pqr-274" d="M496.23,873.98c.32.31.63.61.92.89.17.03.34.06.5.09.35.06.69.11,1.02.16-.23-.27-.48-.55-.75-.85-.37-.06-.75-.12-1.14-.19-.19-.03-.37-.07-.55-.1Z"/>
                  <path class="pqr-185" d="M494.44,872.23c.27.27.53.53.79.78.35.34.68.66,1,.98.18.04.37.07.55.1.39.07.77.13,1.14.19-.27-.3-.55-.62-.83-.95-.21-.25-.44-.5-.66-.76-.44-.06-.88-.14-1.34-.21-.22-.04-.43-.08-.64-.12Z"/>
                  <path class="pqr-11" d="M493.02,870.76c.21.22.41.43.62.65.27.28.54.55.81.82.21.04.42.08.64.12.46.08.91.15,1.34.21-.23-.26-.46-.53-.68-.81-.17-.21-.35-.42-.53-.64-.49-.07-.98-.14-1.49-.23-.24-.04-.48-.09-.71-.13Z"/>
                  <path class="pqr-453" d="M491.97,869.62c.14.16.28.31.43.47.21.22.41.45.62.66.23.05.47.09.71.13.51.09,1,.16,1.49.23-.17-.22-.36-.43-.53-.65-.12-.15-.24-.31-.36-.46-.53-.07-1.06-.15-1.59-.24-.26-.04-.51-.09-.76-.14Z"/>
                  <path class="pqr-121" d="M491.01,868.48c.18.22.36.45.54.67.14.16.28.32.42.48.25.05.51.09.76.14.54.09,1.06.17,1.59.24-.12-.16-.24-.31-.35-.47-.15-.23-.3-.46-.46-.7-.58-.06-1.16-.14-1.7-.23-.26-.04-.54-.09-.81-.13Z"/>
                  <path class="pqr-216" d="M489.15,866.04c.43.59.87,1.18,1.32,1.77.17.22.35.45.53.67.27.04.55.09.81.13.55.09,1.13.16,1.7.23-.15-.23-.3-.46-.45-.7-.39-.61-.77-1.21-1.14-1.82-.66-.04-1.32-.09-1.88-.18-.27-.04-.58-.07-.89-.1Z"/>
                  <path class="pqr-4" d="M486.05,861.23c.58,1.02,1.2,2.02,1.86,3.02.4.6.81,1.2,1.24,1.79.31.03.62.05.89.1.56.09,1.22.14,1.88.18-.37-.61-.74-1.22-1.1-1.83-.59-1.01-1.16-2.02-1.7-3.05-.74-.02-1.47-.05-2.09-.14-.29-.04-.65-.05-1-.07Z"/>
                  <path class="pqr-38" d="M482.77,854.14c.49,1.36,1.04,2.68,1.65,3.97.5,1.06,1.04,2.1,1.63,3.12.35.01.7.02,1,.07.61.09,1.35.12,2.09.14-.54-1.03-1.05-2.06-1.53-3.11-.59-1.28-1.13-2.58-1.62-3.91-.74-.03-1.48-.08-2.16-.17-.33-.04-.69-.07-1.05-.1Z"/>
                  <path class="pqr-411" d="M481.14,848.5c.11.48.23.97.35,1.44.36,1.45.79,2.84,1.28,4.2.37.04.73.06,1.05.1.68.09,1.42.14,2.16.17-.49-1.33-.93-2.69-1.3-4.08-.13-.47-.24-.96-.35-1.44-.72-.07-1.44-.15-2.15-.24-.34-.04-.69-.1-1.03-.16Z"/>
                  <path class="pqr-134" d="M480.53,845.48c.1.51.21,1.04.31,1.57.09.48.2.98.31,1.46.35.06.69.12,1.03.16.71.09,1.43.17,2.15.24-.11-.48-.21-.97-.31-1.46-.11-.53-.22-1.06-.33-1.57-.72-.07-1.43-.16-2.14-.25-.34-.04-.68-.09-1.02-.14Z"/>
                  <path class="pqr-369" d="M480.03,842.19c.07.6.15,1.19.23,1.78.07.49.17.99.27,1.5.34.05.68.09,1.02.14.71.09,1.42.18,2.14.25-.1-.51-.2-1.01-.27-1.49-.07-.49-.15-1.09-.21-1.62-.73-.17-1.45-.32-2.16-.41-.34-.04-.68-.1-1.01-.15Z"/>
                  <path class="pqr-163" d="M479.18,624.51c.02,47.84.06,96.48.12,137.14,0,1.59,0,3.16,0,4.73.03,14.99.1,28.82.05,41.01,0,1.22-.01,2.42-.02,3.61-.06,11.51-.28,21.5.5,29.4.06.6.12,1.19.19,1.79.34.05.67.1,1.01.15.71.1,1.43.25,2.16.41-.06-.53-.13-1.15-.18-1.65-.9-9-.57-20.63-.51-34.19.06-13.28-.03-28.41-.04-44.86-.04-40.71-.05-89.28-.06-137.15-.73-.14-1.45-.27-2.15-.35-.35-.01-.71-.03-1.07-.04Z"/>
                  <path class="pqr-170" d="M479.16,427.91c0,2.17,0,4.35,0,6.52,0,35.72,0,111.85.03,190.08.36.02.71.03,1.07.04.7.08,1.42.21,2.15.35,0-78.35.03-154.55.04-190.4,0-2.18,0-4.36,0-6.54-.72-.02-1.45-.05-2.17-.05-.37,0-.75,0-1.12-.01Z"/>
                  <path class="pqr-283" d="M479.16,417.11c0,1.43,0,2.85,0,4.28,0,2.17,0,4.35,0,6.52.37,0,.75,0,1.12.01.72,0,1.45.02,2.17.05,0-2.18,0-4.36,0-6.54,0-1.43,0-2.86,0-4.3-.72,0-1.45-.02-2.17-.02-.37,0-.75,0-1.12,0Z"/>
                  <path class="pqr-202" d="M479.16,412.23v4.88c.38,0,.75,0,1.12,0,.72,0,1.45,0,2.17.02,0-1.43,0-2.86,0-4.3v-.6c-.72,0-1.45,0-2.17,0-.37,0-.75,0-1.12,0Z"/>
                  <path class="pqr-344" d="M479.16,411.63v.6c.38,0,.75,0,1.12,0,.72,0,1.45,0,2.17,0v-.6c-.72,0-1.45,0-2.17,0-.37,0-.75,0-1.12,0Z"/>
                  <path class="pqr-159" d="M495.09,873.75c.36.32.7.63,1.03.92.18.04.36.07.54.11.17.03.34.07.51.1-.29-.28-.6-.57-.92-.89-.18-.04-.37-.07-.56-.11-.2-.04-.39-.08-.59-.13Z"/>
                  <path class="pqr-236" d="M493.13,871.94c.29.27.58.54.86.8.38.35.75.68,1.1,1,.2.04.39.09.59.13.19.04.38.08.56.11-.32-.31-.66-.64-1-.98-.26-.25-.52-.51-.79-.78-.21-.04-.42-.09-.64-.13-.23-.05-.45-.1-.67-.15Z"/>
                  <path class="pqr-92" d="M491.58,870.45c.22.22.45.44.67.66.29.29.59.56.88.84.22.05.44.1.67.15.22.05.43.09.64.13-.27-.27-.54-.54-.81-.82-.21-.21-.41-.43-.62-.65-.23-.05-.47-.1-.71-.15-.25-.05-.49-.11-.73-.17Z"/>
                  <path class="pqr-189" d="M490.44,869.3c.16.16.31.32.47.48.22.23.45.45.67.67.24.06.48.11.73.17.24.05.48.1.71.15-.21-.22-.41-.44-.62-.66-.14-.16-.28-.31-.43-.47-.25-.05-.5-.1-.76-.15-.26-.06-.52-.11-.78-.18Z"/>
                  <path class="pqr-179" d="M489.38,868.16c.2.22.39.43.59.65.15.16.31.32.46.48.26.06.52.12.78.18.25.05.51.11.76.15-.14-.16-.28-.32-.42-.48-.18-.22-.36-.45-.54-.67-.27-.04-.54-.09-.8-.15-.27-.06-.55-.11-.83-.17Z"/>
                  <path class="pqr-150" d="M487.35,865.78c.46.58.95,1.16,1.45,1.73.19.22.38.44.58.65.28.06.56.11.83.17.26.06.53.1.8.15-.18-.22-.36-.45-.53-.67-.46-.59-.9-1.17-1.32-1.77-.31-.03-.62-.06-.89-.12-.28-.06-.6-.1-.91-.14Z"/>
                  <path class="pqr-18" d="M484.01,861.02c.62,1.02,1.29,2.02,2,3,.43.59.88,1.18,1.35,1.76.32.04.64.08.91.14.27.06.58.09.89.12-.43-.59-.84-1.19-1.24-1.79-.66-.99-1.28-1.99-1.86-3.02-.35-.01-.71-.04-1-.1-.31-.07-.67-.09-1.04-.12Z"/>
                  <path class="pqr-91" d="M480.59,853.82c.5,1.4,1.07,2.75,1.7,4.05.52,1.07,1.1,2.12,1.72,3.14.36.02.73.05,1.04.12.3.06.65.08,1,.1-.58-1.02-1.12-2.06-1.63-3.12-.61-1.29-1.16-2.61-1.65-3.97-.37-.04-.74-.08-1.07-.15-.35-.08-.73-.12-1.11-.17Z"/>
                  <path class="pqr-150" d="M479.02,848.09c.1.46.19.91.3,1.38.35,1.5.77,2.95,1.27,4.35.38.04.76.09,1.11.17.34.07.71.12,1.07.15-.49-1.36-.92-2.76-1.28-4.2-.12-.47-.24-.96-.35-1.44-.35-.06-.7-.13-1.05-.19-.36-.07-.72-.14-1.08-.21Z"/>
                  <path class="pqr-22" d="M478.48,845.16c.09.51.19,1.03.28,1.56.08.46.16.9.26,1.37.36.07.72.14,1.08.21.35.07.7.13,1.05.19-.11-.48-.21-.97-.31-1.46-.1-.53-.21-1.05-.31-1.57-.34-.05-.67-.1-1.01-.15-.35-.05-.69-.11-1.04-.16Z"/>
                  <path class="pqr-214" d="M478.03,842.12c.06.52.13,1.03.2,1.55.07.49.15.99.24,1.5.34.06.69.11,1.04.16.34.05.67.1,1.01.15-.1-.51-.2-1.01-.27-1.5-.08-.59-.16-1.19-.23-1.78-.34-.05-.67-.11-1-.16-.34-.05-.67.02-.99.08Z"/>
                  <path class="pqr-428" d="M477.04,631.65c.06,55.81.14,109.55.2,140.49,0,3.07.01,5.96.02,8.65.05,14.78.06,26.76.1,36.29.03,10.16-.04,17.97.5,23.5.05.52.11,1.03.17,1.55.32-.06.65-.13.99-.08.33.05.66.1,1,.16-.07-.6-.13-1.19-.19-1.79-.78-7.91-.56-17.9-.5-29.4,0-1.19.01-2.39.02-3.61.05-12.2-.02-26.02-.05-41.01,0-1.56,0-3.14,0-4.73-.06-40.66-.09-89.3-.12-137.14-.36-.02-.71-.03-1.07-.05-.37,1.08-.73,4.13-1.08,7.19Z"/>
                  <path class="pqr-436" d="M476.87,426.17c0,2.18,0,4.46,0,6.82v.8c0,21.78.08,112.15.17,197.86.35-3.06.71-6.11,1.08-7.19.35.02.71.03,1.07.05-.04-78.23-.03-154.36-.03-190.08,0-2.17,0-4.35,0-6.52-.37,0-.75,0-1.12,0-.39,0-.78-.87-1.16-1.73Z"/>
                  <path class="pqr-202" d="M476.87,415.97v3.96c0,1.97,0,4.05,0,6.24.39.86.77,1.73,1.16,1.73.38,0,.75,0,1.12,0,0-2.17,0-4.35,0-6.52,0-1.43,0-2.85,0-4.28-.38,0-.75,0-1.13,0-.39,0-.78-.57-1.16-1.14Z"/>
                  <path class="pqr-430" d="M476.87,412.06v3.91c.39.57.77,1.14,1.16,1.14.38,0,.75,0,1.13,0v-4.88c-.38,0-.75,0-1.13,0-.39,0-.78-.08-1.16-.17Z"/>
                  <path class="pqr-111" d="M476.87,411.63v.43c.39.08.77.17,1.16.17.38,0,.75,0,1.13,0v-.6c-.38,0-.75,0-1.13,0-.39,0-.78,0-1.16,0Z"/>
                  <path class="pqr-268" d="M493.36,873.33c.38.33.76.65,1.1.95.37.09.74.18,1.1.26.18.04.36.08.54.12-.33-.29-.67-.6-1.03-.92-.2-.04-.39-.09-.59-.14-.38-.09-.75-.18-1.13-.28Z"/>
                  <path class="pqr-63" d="M491.24,871.45c.31.28.63.56.93.83.41.36.81.71,1.19,1.05.38.1.75.19,1.13.28.2.05.4.09.59.14-.35-.32-.72-.66-1.1-1-.28-.26-.57-.53-.86-.8-.22-.05-.44-.11-.67-.16-.41-.1-.82-.21-1.22-.33Z"/>
                  <path class="pqr-2" d="M489.56,869.91c.24.23.48.45.72.67.32.29.64.58.95.87.41.12.81.23,1.22.33.23.06.45.11.67.16-.29-.27-.58-.55-.88-.84-.22-.22-.45-.44-.67-.66-.24-.06-.48-.12-.73-.18-.43-.11-.86-.23-1.29-.35Z"/>
                  <path class="pqr-151" d="M488.35,868.74c.16.16.33.32.49.48.24.23.48.46.72.69.43.13.86.25,1.29.35.25.06.49.12.73.18-.22-.22-.45-.45-.67-.67-.16-.16-.31-.32-.47-.48-.26-.06-.51-.13-.77-.19-.44-.11-.88-.23-1.31-.36Z"/>
                  <path class="pqr-111" d="M487.25,867.63c.2.21.4.42.61.63.16.16.33.32.49.49.44.13.88.25,1.31.36.26.07.52.13.77.19-.16-.16-.31-.32-.46-.48-.2-.22-.4-.43-.59-.65-.28-.06-.56-.12-.82-.18-.44-.11-.88-.23-1.31-.35Z"/>
                  <path class="pqr-121" d="M485.19,865.32c.47.56.96,1.13,1.47,1.68.2.21.39.42.59.63.43.12.87.23,1.31.35.26.07.54.13.82.18-.2-.22-.39-.44-.58-.65-.5-.57-.98-1.15-1.45-1.73-.32-.04-.63-.08-.91-.15-.43-.11-.84-.2-1.26-.31Z"/>
                  <path class="pqr-417" d="M481.85,860.65c.61,1.01,1.27,1.99,1.98,2.95.43.58.88,1.16,1.35,1.72.41.1.83.2,1.26.31.27.07.59.11.91.15-.46-.58-.91-1.17-1.35-1.76-.71-.98-1.38-1.98-2-3-.36-.02-.72-.05-1.02-.11-.38-.09-.76-.17-1.13-.26Z"/>
                  <path class="pqr-282" d="M478.55,853.5c.47,1.39,1.01,2.74,1.63,4.03.51,1.06,1.07,2.1,1.67,3.11.37.09.75.17,1.13.26.3.06.66.09,1.02.11-.62-1.02-1.19-2.07-1.72-3.14-.64-1.3-1.21-2.66-1.7-4.05-.38-.04-.75-.08-1.08-.14-.33-.06-.64-.12-.96-.18Z"/>
                  <path class="pqr-338" d="M477.08,847.79c.08.45.18.9.27,1.36.33,1.51.72,2.96,1.2,4.35.32.06.63.12.96.18.33.06.71.1,1.08.14-.5-1.4-.92-2.85-1.27-4.35-.11-.47-.2-.92-.3-1.38-.36-.07-.71-.14-1.06-.2-.3-.05-.59-.08-.88-.11Z"/>
                  <path class="pqr-34" d="M476.61,844.89c.07.53.14,1.04.23,1.57.07.44.15.89.24,1.34.29.03.59.06.88.11.35.06.7.13,1.06.2-.1-.46-.18-.91-.26-1.37-.1-.53-.19-1.05-.28-1.56-.34-.06-.69-.11-1.03-.17-.28-.05-.56-.08-.84-.1Z"/>
                  <path class="pqr-248" d="M476.22,841.81c.06.51.13,1.03.19,1.54.07.51.13,1.02.2,1.54.28.03.56.06.84.1.34.06.68.12,1.03.17-.09-.51-.17-1.01-.24-1.5-.07-.52-.14-1.03-.2-1.55-.32.06-.65.12-.98.07-.27-.05-.56-.21-.84-.38Z"/>
                  <path class="pqr-235" d="M475.18,631.44c.07,53.76.14,105.58.2,136.88,0,4.88,0,9.4-.03,13.5-.03,29.43-.29,48.25.7,58.44.05.52.11,1.03.17,1.54.28.17.56.34.84.38.33.05.66,0,.98-.07-.06-.52-.12-1.03-.17-1.55-.54-5.52-.47-13.34-.5-23.5-.03-9.53-.05-21.51-.1-36.29,0-2.69-.01-5.58-.02-8.65-.07-30.94-.14-84.67-.2-140.49-.35,3.06-.7,6.11-1.07,7.18-.26-1.4-.53-4.39-.79-7.39Z"/>
                  <path class="pqr-163" d="M474.98,426.14c0,2.18,0,4.45,0,6.8v.8c0,21.73.1,112.05.2,197.71.27,2.99.54,5.99.79,7.39.36-1.07.71-4.13,1.07-7.18-.1-85.71-.17-176.08-.17-197.86v-.8c0-2.35,0-4.63,0-6.82-.39-.86-.77-1.73-1.16-1.73-.24,0-.49.84-.73,1.69Z"/>
                  <path class="pqr-364" d="M474.98,415.96c0,1.24,0,2.56,0,3.95,0,1.96,0,4.04,0,6.22.24-.85.49-1.7.73-1.69.38,0,.77.86,1.16,1.73,0-2.18,0-4.27,0-6.24v-3.96c-.39-.57-.77-1.14-1.16-1.14-.25,0-.49.56-.73,1.13Z"/>
                  <path class="pqr-424" d="M474.98,412.07v.45c0,1.06,0,2.21,0,3.45.24-.57.49-1.13.73-1.13.38,0,.77.57,1.16,1.14v-3.91c-.39-.08-.77-.17-1.16-.17-.25,0-.49.08-.73.17Z"/>
                  <path class="pqr-368" d="M474.98,411.63v.43c.24-.08.49-.17.73-.17.38,0,.77.08,1.16.17v-.43c-.39,0-.77,0-1.16,0-.25,0-.49,0-.73,0Z"/>
                  <path class="pqr-124" d="M491.24,872.7c.41.35.8.68,1.15.99.32.1.63.2.95.29.38.11.76.21,1.13.31-.35-.3-.72-.62-1.1-.95-.38-.1-.76-.21-1.15-.32-.32-.1-.65-.2-.97-.3Z"/>
                  <path class="pqr-396" d="M489,870.75c.33.29.66.58.98.86.43.37.85.74,1.26,1.09.33.11.65.21.97.3.39.12.77.22,1.15.32-.38-.33-.79-.68-1.19-1.05-.3-.27-.62-.55-.93-.83-.41-.12-.81-.24-1.22-.37-.34-.1-.68-.22-1.01-.33Z"/>
                  <path class="pqr-240" d="M487.25,869.17c.25.23.5.46.75.69.33.3.66.6,1,.89.34.12.68.23,1.01.33.41.13.82.25,1.22.37-.31-.28-.63-.57-.95-.87-.24-.22-.48-.45-.72-.67-.43-.13-.86-.26-1.28-.39-.35-.11-.69-.23-1.04-.35Z"/>
                  <path class="pqr-236" d="M486,867.99c.17.16.34.32.51.48.24.23.49.46.74.7.35.12.69.24,1.04.35.42.13.85.27,1.28.39-.24-.23-.48-.46-.72-.69-.17-.16-.33-.32-.49-.48-.44-.13-.87-.26-1.3-.4-.35-.11-.7-.23-1.05-.35Z"/>
                  <path class="pqr-80" d="M484.91,866.9c.19.2.39.41.59.6.16.16.33.32.49.48.35.12.7.24,1.05.35.43.14.86.27,1.3.4-.16-.16-.33-.32-.49-.49-.21-.21-.41-.42-.61-.63-.43-.12-.86-.25-1.29-.38-.35-.11-.7-.23-1.05-.34Z"/>
                  <path class="pqr-155" d="M482.94,864.68c.44.54.91,1.08,1.4,1.61.19.2.38.41.58.61.35.12.7.23,1.05.34.43.14.86.26,1.29.38-.2-.21-.4-.42-.59-.63-.51-.55-1-1.11-1.47-1.68-.41-.1-.83-.21-1.24-.34-.34-.1-.68-.2-1.01-.3Z"/>
                  <path class="pqr-303" d="M479.82,860.16c.56.98,1.17,1.93,1.84,2.86.41.56.83,1.12,1.28,1.66.33.1.66.2,1.01.3.41.13.83.23,1.24.34-.47-.56-.92-1.14-1.35-1.72-.71-.96-1.37-1.95-1.98-2.95-.37-.09-.75-.17-1.12-.26-.31-.08-.61-.15-.91-.23Z"/>
                  <path class="pqr-234" d="M476.81,853.21c.42,1.35.91,2.66,1.48,3.93.47,1.04.97,2.04,1.53,3.02.3.08.6.15.91.23.37.09.75.18,1.12.26-.61-1.01-1.17-2.05-1.67-3.11-.62-1.29-1.16-2.64-1.63-4.03-.32-.06-.63-.11-.95-.15-.26-.04-.53-.09-.79-.14Z"/>
                  <path class="pqr-123" d="M475.51,847.7c.07.44.15.88.24,1.33.29,1.44.64,2.84,1.07,4.19.26.05.52.1.79.14.32.04.63.1.95.15-.47-1.39-.87-2.85-1.2-4.35-.1-.46-.19-.91-.27-1.36-.29-.03-.58-.05-.87-.06-.24-.01-.47-.02-.7-.03Z"/>
                  <path class="pqr-398" d="M475.11,844.76c.06.56.12,1.11.19,1.62.06.43.13.87.2,1.31.23,0,.47.02.7.03.29.02.58.04.87.06-.08-.45-.16-.9-.24-1.34-.09-.52-.16-1.04-.23-1.57-.28-.03-.55-.05-.83-.08-.23-.03-.45-.04-.67-.05Z"/>
                  <path class="pqr-386" d="M474.75,841.31c.06.59.13,1.18.2,1.76.06.56.11,1.13.17,1.7.22.01.44.02.67.05.27.03.55.05.83.08-.07-.53-.13-1.03-.2-1.54-.07-.51-.13-1.03-.19-1.54-.28-.17-.56-.34-.82-.39-.22-.04-.44-.08-.65-.11Z"/>
                  <path class="pqr-228" d="M473.77,624.56c.04,47.23.07,94.87.12,135.18.04,33.59-.88,61.9.68,79.79.05.59.12,1.19.18,1.78.21.03.43.06.65.11.26.05.54.22.82.39-.06-.51-.12-1.03-.17-1.54-.99-10.18-.73-29-.7-58.44.02-4.1.04-8.62.03-13.5-.06-31.29-.13-83.12-.2-136.88-.27-2.99-.53-5.98-.78-7.37-.22.49-.43.58-.63.49Z"/>
                  <path class="pqr-42" d="M473.66,427.88c0,2.17,0,4.34,0,6.5.01,35.59.05,112.09.11,190.18.2.09.41,0,.63-.49.25,1.38.52,4.37.78,7.37-.1-85.65-.19-175.97-.2-197.71v-.8c0-2.35,0-4.62,0-6.8-.24.85-.49,1.71-.72,1.73-.2.02-.4.02-.6.01Z"/>
                  <path class="pqr-42" d="M473.66,417.11c0,1.42,0,2.85,0,4.27,0,2.17,0,4.34,0,6.5.2,0,.4,0,.6-.01.24-.02.48-.88.72-1.73,0-2.18,0-4.26,0-6.22,0-1.4,0-2.71,0-3.95-.24.57-.49,1.13-.73,1.14-.2,0-.4,0-.59,0Z"/>
                  <path class="pqr-142" d="M473.66,412.23v.6c0,1.42,0,2.85,0,4.27.2,0,.4,0,.59,0,.24,0,.48-.57.73-1.14,0-1.24,0-2.39,0-3.45v-.45c-.24.08-.49.17-.73.17-.2,0-.4,0-.59,0Z"/>
                  <path class="pqr-273" d="M473.66,411.63v.6c.2,0,.4,0,.59,0,.24,0,.48-.08.73-.17v-.43c-.24,0-.49,0-.73,0-.2,0-.4,0-.59,0Z"/>
                  <path class="pqr-40" d="M489.11,871.93c.42.36.83.71,1.2,1.04.37.14.75.28,1.12.41.32.11.64.22.96.32-.36-.31-.75-.64-1.15-.99-.33-.11-.66-.22-.98-.34-.38-.14-.76-.28-1.14-.43Z"/>
                  <path class="pqr-415" d="M486.81,869.92c.34.3.68.6,1,.88.44.38.88.76,1.3,1.13.38.15.76.3,1.14.43.33.12.66.23.98.34-.41-.35-.83-.71-1.26-1.09-.32-.28-.65-.57-.98-.86-.34-.12-.68-.24-1.02-.37-.39-.15-.78-.3-1.17-.46Z"/>
                  <path class="pqr-68" d="M485.04,868.32c.25.23.51.47.76.69.33.3.67.61,1.01.91.39.16.78.32,1.17.46.34.13.68.25,1.02.37-.33-.29-.67-.59-1-.89-.25-.23-.5-.46-.75-.69-.35-.12-.69-.25-1.03-.38-.4-.15-.79-.31-1.18-.47Z"/>
                  <path class="pqr-14" d="M483.78,867.15c.17.16.34.32.51.48.24.23.5.46.75.69.39.16.78.32,1.18.47.34.13.69.26,1.03.38-.25-.23-.5-.47-.74-.7-.17-.16-.34-.32-.51-.48-.35-.12-.69-.25-1.04-.38-.4-.15-.79-.3-1.18-.46Z"/>
                  <path class="pqr-215" d="M482.73,866.12c.18.19.37.38.56.56.16.15.33.31.49.47.39.16.78.31,1.18.46.34.13.69.26,1.04.38-.17-.16-.33-.32-.49-.48-.2-.2-.4-.4-.59-.6-.35-.12-.69-.23-1.03-.36-.39-.14-.78-.28-1.16-.43Z"/>
                  <path class="pqr-16" d="M480.87,864.03c.42.52.85,1.03,1.31,1.52.18.19.36.38.54.57.38.15.77.29,1.16.43.34.12.68.24,1.03.36-.19-.2-.39-.41-.58-.61-.49-.53-.95-1.06-1.4-1.61-.33-.1-.65-.2-.97-.3-.37-.12-.73-.23-1.09-.35Z"/>
                  <path class="pqr-126" d="M477.94,859.63c.53.96,1.11,1.9,1.74,2.8.38.55.78,1.08,1.2,1.6.36.12.72.24,1.09.35.32.1.64.2.97.3-.44-.54-.87-1.1-1.28-1.66-.67-.93-1.28-1.88-1.84-2.86-.3-.08-.59-.16-.89-.24-.34-.09-.67-.19-1-.29Z"/>
                  <path class="pqr-7" d="M475.16,852.87c.38,1.3.82,2.56,1.35,3.79.43,1.01.91,2.01,1.44,2.97.33.1.66.19,1,.29.29.08.59.16.89.24-.56-.98-1.07-1.98-1.53-3.02-.57-1.26-1.06-2.58-1.48-3.93-.26-.05-.52-.1-.78-.15-.3-.05-.59-.12-.88-.19Z"/>
                  <path class="pqr-30" d="M474.03,847.61c.06.43.13.86.2,1.29.24,1.35.55,2.67.92,3.97.29.07.58.14.88.19.26.05.51.1.78.15-.42-1.35-.77-2.75-1.07-4.19-.09-.45-.17-.89-.24-1.33-.23-.01-.46-.02-.69-.03-.26-.01-.53-.03-.78-.05Z"/>
                  <path class="pqr-273" d="M473.71,844.66c.05.6.1,1.17.16,1.67.05.42.1.85.16,1.28.26.02.52.04.78.05.23.01.46.02.69.03-.07-.44-.14-.88-.2-1.31-.08-.51-.14-1.06-.19-1.62-.22-.01-.44-.02-.66-.05-.25-.03-.5-.04-.75-.06Z"/>
                  <path class="pqr-56" d="M473.42,841.13c.05.57.1,1.12.14,1.66.05.63.09,1.27.14,1.87.25.02.49.03.75.06.22.03.44.03.66.05-.06-.56-.11-1.13-.17-1.7-.07-.58-.14-1.17-.2-1.76-.21-.03-.42-.06-.62-.09-.24-.04-.47-.07-.7-.1Z"/>
                  <path class="pqr-281" d="M472.46,623.8c.02,46.88.04,94.58.07,134.7.02,34.04-.47,62.8.76,80.89.04.59.08,1.17.13,1.73.23.03.46.06.7.1.21.03.41.06.62.09-.06-.59-.13-1.19-.18-1.78-1.56-17.88-.64-46.2-.68-79.79-.05-40.31-.09-87.96-.12-135.18-.2-.09-.4-.37-.61-.62-.24-.1-.47-.14-.69-.14Z"/>
                  <path class="pqr-144" d="M472.4,427.85c0,2.16,0,4.32,0,6.48,0,35.56.03,111.41.06,189.47.23,0,.46.04.69.14.21.25.4.53.61.62-.06-78.09-.09-154.59-.11-190.18,0-2.17,0-4.34,0-6.5-.2,0-.39-.02-.59-.02-.23,0-.45-.01-.67-.01Z"/>
                  <path class="pqr-72" d="M472.4,417.1c0,1.42,0,2.84,0,4.26,0,2.16,0,4.32,0,6.48.22,0,.45,0,.67.01.2,0,.39.01.59.02,0-2.17,0-4.34,0-6.5,0-1.42,0-2.85,0-4.27-.2,0-.39,0-.59,0-.23,0-.45,0-.67,0Z"/>
                  <path class="pqr-177" d="M472.4,412.24v4.86c.22,0,.45,0,.67,0,.19,0,.39,0,.59,0,0-1.42,0-2.85,0-4.27v-.6c-.2,0-.39,0-.59,0-.23,0-.45,0-.67,0Z"/>
                  <path class="pqr-180" d="M472.4,411.64v.6c.22,0,.45,0,.67,0,.19,0,.39,0,.59,0v-.6c-.2,0-.39,0-.59,0-.23,0-.45,0-.67,0Z"/>
                  <path class="pqr-412" d="M486.93,870.99c.43.37.84.73,1.22,1.06.34.16.69.31,1.03.45.38.16.75.31,1.13.45-.37-.32-.78-.67-1.2-1.04-.38-.15-.76-.31-1.14-.47-.35-.15-.69-.3-1.04-.46Z"/>
                  <path class="pqr-28" d="M484.61,868.95c.34.3.68.6,1.01.89.44.39.89.78,1.31,1.15.34.16.69.31,1.04.46.38.16.76.32,1.14.47-.42-.36-.86-.75-1.3-1.13-.32-.29-.66-.58-1-.88-.39-.16-.78-.33-1.16-.5-.35-.15-.7-.31-1.04-.47Z"/>
                  <path class="pqr-370" d="M482.84,867.35c.25.23.51.46.76.69.33.3.68.61,1.01.91.34.16.69.32,1.04.47.38.17.77.34,1.16.5-.34-.3-.68-.61-1.01-.91-.25-.23-.51-.46-.76-.69-.39-.16-.78-.33-1.16-.5-.35-.15-.69-.31-1.04-.47Z"/>
                  <path class="pqr-113" d="M481.59,866.21c.17.15.33.31.5.46.24.22.49.45.74.68.34.16.69.31,1.04.47.38.17.77.34,1.16.5-.25-.23-.51-.47-.75-.69-.17-.16-.34-.32-.51-.48-.39-.16-.78-.32-1.16-.49-.35-.15-.69-.3-1.03-.46Z"/>
                  <path class="pqr-311" d="M480.58,865.24c.17.17.34.34.52.51.16.15.32.3.49.46.34.15.68.31,1.03.46.38.16.77.33,1.16.49-.17-.16-.33-.32-.49-.47-.19-.18-.38-.37-.56-.56-.38-.15-.76-.3-1.13-.45-.34-.14-.68-.28-1.01-.43Z"/>
                  <path class="pqr-409" d="M478.83,863.27c.4.5.81.98,1.24,1.45.17.18.33.35.51.52.33.15.67.29,1.01.43.37.15.75.3,1.13.45-.18-.19-.36-.38-.54-.57-.46-.49-.89-1-1.31-1.52-.36-.12-.72-.25-1.07-.38-.32-.12-.65-.25-.97-.38Z"/>
                  <path class="pqr-62" d="M476.09,859.02c.49.94,1.03,1.84,1.62,2.71.36.53.73,1.04,1.13,1.54.32.13.64.26.97.38.36.14.71.26,1.07.38-.42-.52-.82-1.05-1.2-1.6-.63-.9-1.21-1.84-1.74-2.8-.33-.1-.65-.2-.98-.3-.29-.09-.59-.2-.88-.31Z"/>
                  <path class="pqr-69" d="M473.56,852.46c.33,1.25.74,2.48,1.21,3.68.39.99.83,1.95,1.32,2.88.29.11.58.22.88.31.32.1.65.2.98.3-.53-.96-1.01-1.96-1.44-2.97-.52-1.23-.97-2.49-1.35-3.79-.29-.07-.57-.14-.85-.2-.25-.06-.5-.13-.75-.21Z"/>
                  <path class="pqr-25" d="M472.59,847.41c.05.42.11.84.17,1.26.2,1.27.46,2.54.8,3.78.24.08.49.16.75.21.28.06.56.13.85.2-.38-1.3-.68-2.62-.92-3.97-.08-.43-.14-.87-.2-1.29-.26-.02-.51-.05-.76-.08-.23-.03-.45-.07-.67-.12Z"/>
                  <path class="pqr-418" d="M472.33,844.49c.04.61.08,1.19.13,1.67.04.42.08.84.13,1.26.22.05.45.09.67.12.25.04.51.06.76.08-.06-.43-.11-.86-.16-1.28-.06-.5-.11-1.07-.16-1.67-.24-.02-.49-.03-.73-.07-.22-.04-.43-.07-.65-.1Z"/>
                  <path class="pqr-181" d="M472.12,840.93c.03.55.06,1.06.09,1.57.04.7.08,1.38.12,1.99.21.03.43.06.65.1.24.04.48.06.73.07-.05-.6-.09-1.24-.14-1.87-.05-.54-.1-1.09-.14-1.66-.23-.03-.46-.06-.68-.1-.21-.03-.41-.07-.62-.1Z"/>
                  <path class="pqr-130" d="M471.18,634.84c0,54.4.02,106.37.03,137.25,0,9.04-.01,16.76,0,22.83.01,13.46.28,33.31.84,44.32.03.58.05,1.14.08,1.68.2.04.41.07.62.1.23.04.45.07.68.1-.05-.57-.09-1.15-.13-1.73-1.23-18.09-.74-46.85-.76-80.89-.03-40.12-.05-87.83-.07-134.7-.23,0-.45.03-.68.05-.21,2.83-.41,6.91-.61,10.99Z"/>
                  <path class="pqr-284" d="M471.15,425.17c0,1.42,0,2.82,0,4.24,0,24.51.02,117.93.03,205.43.2-4.08.4-8.16.61-10.99.23-.03.45-.06.68-.05-.03-78.05-.06-153.91-.06-189.47,0-2.16,0-4.32,0-6.48-.22,0-.44,0-.66,0-.2,0-.4-1.34-.59-2.68Z"/>
                  <path class="pqr-207" d="M471.15,416.36c0,1.43,0,2.98,0,4.57,0,1.42,0,2.82,0,4.24.19,1.34.39,2.69.59,2.68.22,0,.44,0,.66,0,0-2.16,0-4.32,0-6.48,0-1.42,0-2.84,0-4.26-.22,0-.44,0-.66,0-.2,0-.39-.37-.59-.74Z"/>
                  <path class="pqr-97" d="M471.15,412.07c0,.15,0,.3,0,.46,0,1.1,0,2.4,0,3.83.19.37.39.74.59.74.22,0,.44,0,.66,0v-4.86c-.22,0-.44,0-.66,0-.2,0-.39-.08-.59-.17Z"/>
                  <path class="pqr-190" d="M471.15,411.64v.43c.19.08.39.17.59.17.22,0,.44,0,.66,0v-.6c-.22,0-.44,0-.66,0-.2,0-.39,0-.59,0Z"/>
                  <path class="pqr-236" d="M485.22,870.15c.4.36.78.7,1.15,1.02.25.13.5.26.75.39.34.17.69.34,1.03.5-.38-.33-.8-.69-1.22-1.06-.34-.16-.69-.32-1.03-.49-.22-.11-.45-.23-.68-.35Z"/>
                  <path class="pqr-164" d="M483.05,868.19c.32.29.64.58.95.86.42.37.83.74,1.22,1.1.23.12.45.24.68.35.34.17.68.33,1.03.49-.43-.37-.87-.76-1.31-1.15-.33-.29-.67-.59-1.01-.89-.34-.16-.68-.32-1.02-.49-.18-.09-.36-.18-.54-.27Z"/>
                  <path class="pqr-44" d="M481.4,866.67c.23.22.46.44.7.65.31.29.64.58.95.87.18.09.36.18.54.27.34.16.68.33,1.02.49-.34-.3-.68-.61-1.01-.91-.25-.23-.51-.46-.76-.69-.34-.16-.68-.32-1.01-.48-.14-.07-.29-.14-.43-.21Z"/>
                  <path class="pqr-446" d="M480.25,865.58c.15.15.31.3.47.44.23.21.46.43.69.65.14.07.28.14.43.21.33.16.67.32,1.01.48-.25-.23-.5-.46-.74-.68-.17-.16-.34-.31-.5-.46-.34-.15-.67-.31-1.01-.47-.11-.05-.23-.11-.34-.16Z"/>
                  <path class="pqr-112" d="M479.27,864.63c.17.17.34.34.52.51.15.14.3.29.45.44.11.06.23.11.34.16.33.16.67.31,1.01.47-.17-.15-.33-.31-.49-.46-.18-.17-.35-.34-.52-.51-.33-.15-.67-.3-.99-.45-.1-.05-.21-.1-.31-.16Z"/>
                  <path class="pqr-406" d="M477.54,862.65c.39.5.8.99,1.23,1.46.17.18.33.35.5.52.11.05.21.11.31.16.33.16.66.31.99.45-.17-.17-.34-.35-.51-.52-.43-.47-.85-.95-1.24-1.45-.32-.13-.64-.27-.96-.42-.11-.05-.22-.12-.34-.2Z"/>
                  <path class="pqr-331" d="M474.84,858.41c.48.93,1.01,1.83,1.59,2.7.35.53.72,1.04,1.11,1.54.11.08.23.15.34.2.32.15.64.28.96.42-.4-.5-.77-1.01-1.13-1.54-.59-.87-1.13-1.77-1.62-2.71-.29-.11-.58-.23-.86-.35-.13-.05-.26-.15-.39-.26Z"/>
                  <path class="pqr-394" d="M472.39,851.96c.32,1.22.71,2.42,1.17,3.6.38.97.81,1.92,1.28,2.85.13.11.26.21.39.26.28.12.57.24.86.35-.49-.94-.93-1.9-1.32-2.88-.47-1.2-.88-2.43-1.21-3.68-.24-.08-.49-.17-.73-.26-.15-.05-.3-.14-.45-.24Z"/>
                  <path class="pqr-353" d="M471.46,847.05c.05.41.1.83.17,1.25.19,1.22.44,2.45.76,3.67.15.1.3.19.45.24.24.09.48.18.73.26-.33-1.25-.6-2.51-.8-3.78-.07-.42-.12-.84-.17-1.26-.22-.05-.44-.11-.66-.18-.16-.05-.32-.12-.48-.19Z"/>
                  <path class="pqr-416" d="M471.21,844.19c.04.6.08,1.15.12,1.62.04.41.08.83.13,1.24.16.07.32.14.48.19.21.07.43.13.66.18-.05-.42-.09-.84-.13-1.26-.04-.48-.09-1.06-.13-1.67-.21-.03-.42-.07-.63-.13-.17-.04-.33-.1-.49-.17Z"/>
                  <path class="pqr-323" d="M471,840.66c.03.55.05,1.07.09,1.59.04.68.08,1.34.12,1.94.16.06.33.12.49.17.21.06.42.1.63.13-.04-.61-.08-1.29-.12-1.99-.03-.51-.06-1.02-.09-1.57-.2-.03-.41-.07-.61-.12-.17-.04-.34-.09-.51-.15Z"/>
                  <path class="pqr-390" d="M470.13,642.06c0,52.2.01,101.61.02,131.12,0,9.26,0,17.08.02,23.09.03,12.77.31,32.04.76,42.71.03.58.05,1.13.08,1.68.17.06.34.11.51.15.21.05.41.08.61.12-.03-.55-.05-1.1-.08-1.68-.55-11.01-.82-30.85-.84-44.32,0-6.08,0-13.8,0-22.83,0-30.89-.02-82.85-.03-137.25-.2,4.08-.4,8.16-.61,10.98-.15.7-.3-1.53-.45-3.77Z"/>
                  <path class="pqr-363" d="M470.04,425.13c-.01,1.41-.02,2.83-.03,4.24-.11,17.31.1,65.02.11,121.39,0,29.09,0,60.67.01,91.3.15,2.24.29,4.47.45,3.77.21-2.83.41-6.91.61-10.98-.01-87.5-.03-180.92-.03-205.43,0-1.42,0-2.82,0-4.24-.19-1.34-.39-2.68-.58-2.67-.19.02-.36,1.32-.53,2.62Z"/>
                  <path class="pqr-212" d="M470.17,416.32c-.03,1.43-.07,2.99-.09,4.57-.02,1.41-.03,2.83-.05,4.24.17-1.3.34-2.6.53-2.62.19-.02.38,1.32.58,2.67,0-1.42,0-2.82,0-4.24,0-1.59,0-3.14,0-4.57-.19-.37-.39-.74-.58-.74-.18,0-.29.34-.4.69Z"/>
                  <path class="pqr-145" d="M470.09,412.06c.01.14.03.29.04.45.08,1.08.07,2.38.05,3.81.11-.35.21-.7.4-.69.19,0,.38.37.58.74,0-1.43,0-2.73,0-3.83,0-.16,0-.31,0-.46-.19-.08-.39-.17-.58-.17-.18,0-.33.07-.48.15Z"/>
                  <path class="pqr-324" d="M470.04,411.65c.02.13.03.27.05.41.15-.08.31-.16.48-.15.19,0,.38.08.58.17v-.43c-.19,0-.39,0-.58,0-.18,0-.36,0-.53,0Z"/>
                  <path class="pqr-301" d="M483.62,869.23c.34.32.66.64.98.92.34.21.68.41,1.02.6.25.14.5.28.75.42-.37-.32-.75-.66-1.15-1.02-.23-.12-.46-.25-.68-.37-.31-.17-.62-.35-.92-.54Z"/>
                  <path class="pqr-233" d="M481.79,867.5c.27.26.53.52.79.75.35.32.69.65,1.03.97.31.19.62.37.92.54.23.13.45.25.68.37-.4-.36-.8-.73-1.22-1.1-.31-.28-.63-.57-.95-.86-.18-.09-.36-.19-.54-.28-.24-.13-.48-.27-.72-.4Z"/>
                  <path class="pqr-289" d="M480.41,866.15c.19.2.39.4.59.58.26.24.53.51.79.77.24.14.48.27.72.4.18.1.36.19.54.28-.32-.29-.64-.58-.95-.87-.24-.22-.47-.44-.7-.65-.14-.07-.28-.14-.42-.21-.19-.1-.38-.2-.57-.3Z"/>
                  <path class="pqr-136" d="M479.45,865.18c.13.13.26.27.39.4.19.18.38.38.57.58.19.1.38.2.57.3.14.07.28.14.42.21-.23-.22-.46-.44-.69-.65-.16-.15-.31-.3-.47-.44-.11-.06-.23-.11-.34-.17-.15-.08-.31-.15-.46-.23Z"/>
                  <path class="pqr-174" d="M478.53,864.22c.18.19.36.37.54.56.13.12.25.26.38.39.15.08.3.15.46.23.11.06.23.11.34.17-.15-.15-.3-.29-.45-.44-.18-.17-.35-.34-.52-.51-.11-.05-.21-.11-.32-.17-.14-.08-.29-.16-.43-.24Z"/>
                  <path class="pqr-112" d="M476.73,862.08c.41.53.83,1.06,1.28,1.57.17.2.34.38.52.57.14.08.29.16.43.24.11.06.21.11.32.17-.17-.17-.34-.34-.5-.52-.43-.47-.84-.96-1.23-1.46-.11-.08-.23-.16-.34-.23-.15-.09-.31-.22-.47-.34Z"/>
                  <path class="pqr-293" d="M473.93,857.65c.49.95,1.04,1.88,1.64,2.79.36.55.75,1.1,1.15,1.63.16.13.32.25.47.34.11.07.23.15.34.23-.39-.5-.76-1.01-1.11-1.54-.58-.87-1.11-1.77-1.59-2.7-.13-.11-.26-.22-.39-.3-.17-.1-.35-.28-.52-.46Z"/>
                  <path class="pqr-383" d="M471.38,851.19c.34,1.2.74,2.39,1.22,3.58.39.97.84,1.94,1.33,2.89.18.18.35.36.52.46.13.08.25.19.39.3-.48-.93-.9-1.88-1.28-2.85-.46-1.18-.85-2.38-1.17-3.6-.15-.1-.3-.2-.44-.29-.19-.12-.38-.3-.57-.48Z"/>
                  <path class="pqr-376" d="M470.38,846.41c.06.4.12.8.19,1.2.21,1.18.48,2.38.81,3.58.19.18.38.36.57.48.14.09.29.2.44.29-.32-1.22-.57-2.44-.76-3.67-.06-.41-.12-.83-.17-1.25-.16-.07-.31-.15-.47-.24-.21-.12-.41-.25-.61-.39Z"/>
                  <path class="pqr-201" d="M470.09,843.71c.04.55.09,1.07.14,1.52.04.39.09.79.15,1.19.2.14.4.27.61.39.15.09.31.17.47.24-.05-.41-.09-.83-.13-1.24-.04-.47-.08-1.03-.12-1.62-.16-.06-.32-.13-.48-.19-.21-.08-.43-.18-.64-.29Z"/>
                  <path class="pqr-329" d="M469.84,840.24c.03.58.07,1.16.12,1.74.04.59.08,1.18.13,1.73.21.1.42.21.64.29.16.06.32.13.48.19-.04-.6-.08-1.26-.12-1.94-.03-.52-.06-1.04-.09-1.59-.17-.06-.34-.12-.5-.17-.22-.07-.45-.16-.67-.25Z"/>
                  <path class="pqr-413" d="M469.16,630.72c-.01,44.87-.02,90.11,0,128.33,0,2.11,0,4.19,0,6.25.01,30.71-.11,56.49.59,73.21.02.58.05,1.16.09,1.74.22.09.44.18.67.25.16.05.33.11.5.17-.03-.55-.05-1.1-.08-1.68-.46-10.67-.73-29.94-.76-42.71-.02-6.01-.02-13.83-.02-23.09,0-29.5-.01-78.92-.02-131.12-.15-2.24-.29-4.48-.44-3.79-.19-2.6-.36-5.08-.53-7.55Z"/>
                  <path class="pqr-75" d="M469.05,427.76c0,2.16-.01,4.32-.02,6.48-.06,24.23.15,67.44.14,117.2,0,25.23-.01,52.17-.02,79.28.17,2.47.33,4.94.53,7.55.15-.69.29,1.55.44,3.79,0-30.62,0-62.21-.01-91.3,0-56.38-.21-104.08-.11-121.39,0-1.41.02-2.83.03-4.24-.17,1.3-.34,2.6-.52,2.62-.18.02-.33.02-.47.02Z"/>
                  <path class="pqr-188" d="M469.14,417.04c0,1.42-.05,2.84-.05,4.25-.01,2.16-.02,4.32-.03,6.47.14,0,.29,0,.47-.02.19-.02.35-1.32.52-2.62.01-1.41.03-2.83.05-4.24.01-1.58.06-3.13.09-4.57-.11.35-.21.7-.39.7-.21,0-.43.02-.65.02Z"/>
                  <path class="pqr-246" d="M468.94,412.21c.03.19.05.4.07.61.11,1.39.14,2.81.13,4.22.22,0,.44-.02.65-.02.18,0,.28-.35.39-.7.03-1.43.03-2.74-.05-3.81-.01-.15-.02-.3-.04-.45-.15.08-.3.16-.47.16-.23,0-.46,0-.67,0Z"/>
                  <path class="pqr-366" d="M468.83,411.65c.04.17.08.37.11.56.22,0,.44.01.67,0,.17,0,.32-.08.47-.16-.01-.14-.03-.28-.05-.41-.18,0-.35,0-.52,0-.23,0-.46,0-.69,0Z"/>
                  <path class="pqr-36" d="M482.07,868.22c.28.28.56.55.83.79.23.17.46.33.7.48.33.23.67.44,1.01.65-.32-.28-.65-.59-.98-.92-.31-.19-.62-.38-.92-.58-.21-.14-.42-.28-.63-.43Z"/>
                  <path class="pqr-451" d="M480.58,866.76c.21.22.42.43.63.63.29.27.57.55.85.83.21.15.42.29.63.43.3.2.61.39.92.58-.34-.32-.68-.66-1.03-.97-.26-.24-.53-.5-.79-.75-.24-.14-.48-.28-.72-.43-.17-.1-.33-.21-.5-.31Z"/>
                  <path class="pqr-79" d="M479.47,865.62c.16.17.32.35.48.5.21.21.42.42.63.64.16.11.33.21.5.31.24.15.48.29.72.43-.27-.26-.53-.52-.79-.77-.2-.19-.39-.39-.59-.58-.19-.1-.37-.21-.56-.31-.13-.07-.26-.15-.39-.23Z"/>
                  <path class="pqr-278" d="M478.68,864.78c.1.12.21.23.32.34.15.16.31.33.47.5.13.08.26.15.39.23.18.11.37.21.56.31-.19-.2-.38-.4-.57-.58-.13-.13-.26-.26-.39-.4-.15-.08-.3-.16-.45-.24-.1-.06-.21-.11-.31-.17Z"/>
                  <path class="pqr-442" d="M477.8,863.8c.19.21.38.43.57.64.1.11.21.22.31.34.1.06.21.11.31.17.15.08.3.16.45.24-.13-.13-.26-.27-.38-.39-.18-.19-.36-.37-.54-.56-.14-.08-.29-.17-.43-.25-.1-.06-.2-.12-.29-.17Z"/>
                  <path class="pqr-225" d="M475.94,861.47c.42.57.86,1.13,1.32,1.68.18.21.36.43.55.64.1.06.2.12.29.17.14.08.28.17.43.25-.18-.19-.35-.38-.52-.57-.45-.51-.87-1.04-1.28-1.57-.16-.13-.32-.26-.47-.36-.11-.07-.21-.16-.32-.24Z"/>
                  <path class="pqr-321" d="M473.07,856.84c.51.98,1.07,1.95,1.68,2.91.37.58.77,1.16,1.19,1.72.11.09.22.17.32.24.15.1.31.23.47.36-.4-.53-.79-1.08-1.15-1.63-.6-.91-1.15-1.84-1.64-2.79-.18-.18-.35-.36-.51-.49-.11-.08-.23-.21-.35-.32Z"/>
                  <path class="pqr-20" d="M470.45,850.32c.35,1.18.76,2.38,1.25,3.58.4.98.85,1.97,1.36,2.95.12.12.24.24.35.32.16.12.34.31.51.49-.49-.95-.94-1.91-1.33-2.89-.48-1.19-.88-2.38-1.22-3.58-.19-.18-.37-.37-.55-.52-.13-.1-.25-.23-.37-.35Z"/>
                  <path class="pqr-381" d="M469.39,845.69c.06.37.14.75.21,1.13.22,1.14.5,2.31.85,3.5.12.13.25.25.37.35.18.15.36.33.55.52-.34-1.2-.61-2.39-.81-3.58-.07-.4-.13-.8-.19-1.2-.2-.14-.4-.28-.59-.43-.13-.1-.27-.2-.4-.3Z"/>
                  <path class="pqr-238" d="M469.05,843.2c.05.48.1.94.16,1.37.05.37.11.74.17,1.11.13.1.26.2.4.3.19.14.39.29.59.43-.06-.4-.1-.8-.15-1.19-.05-.45-.1-.97-.14-1.52-.21-.1-.42-.21-.62-.3-.14-.06-.28-.14-.42-.21Z"/>
                  <path class="pqr-265" d="M468.75,839.8c.04.63.1,1.27.16,1.92.04.5.09,1,.14,1.47.14.07.28.14.42.21.2.09.41.2.62.3-.04-.55-.09-1.13-.13-1.73-.05-.59-.09-1.16-.12-1.74-.22-.09-.44-.18-.65-.26-.15-.05-.29-.12-.44-.18Z"/>
                  <path class="pqr-222" d="M468.22,623.19c0,48.5,0,97.82.02,138.71,0,1.9,0,3.78,0,5.64,0,29.51-.26,54.24.4,70.44.02.58.06,1.19.1,1.82.14.06.29.12.44.18.21.08.43.17.65.26-.03-.58-.06-1.16-.09-1.74-.7-16.72-.58-42.49-.59-73.21,0-2.06,0-4.15,0-6.25-.01-38.22,0-83.45,0-128.33-.17-2.47-.33-4.92-.51-7.47-.14-.04-.29-.05-.43-.06Z"/>
                  <path class="pqr-198" d="M468.07,427.69c.01,2.15.04,4.31.05,6.46.1,35.38.11,111.15.11,189.04.14.01.29.03.43.06.18,2.55.34,5.01.51,7.47,0-27.11.01-54.06.02-79.28,0-49.76-.21-92.97-.14-117.2,0-2.16.01-4.32.02-6.48-.14,0-.28-.02-.44-.05-.17-.04-.36-.03-.54-.03Z"/>
                  <path class="pqr-95" d="M468.17,416.91c0,1.46-.05,2.94-.07,4.32-.05,2.15-.04,4.3-.03,6.45.18,0,.37,0,.54.03.16.03.3.04.44.05,0-2.16.02-4.32.03-6.47,0-1.4.05-2.83.05-4.25-.22,0-.43,0-.62-.03-.15-.03-.25-.06-.34-.1Z"/>
                  <path class="pqr-8" d="M467.86,412.15c.04.17.07.37.09.56.17,1.3.22,2.74.22,4.2.09.04.19.08.34.1.19.03.4.03.62.03,0-1.42-.01-2.83-.13-4.22-.02-.21-.04-.42-.07-.61-.22,0-.43-.02-.65-.03-.14,0-.29-.02-.44-.03Z"/>
                  <path class="pqr-407" d="M467.72,411.65c.05.15.1.32.14.5.14,0,.29.02.44.03.22.01.43.03.65.03-.03-.19-.07-.39-.11-.56-.23,0-.45,0-.66,0-.15,0-.3,0-.45,0Z"/>
                  <path class="pqr-82" d="M480.66,867.18c.23.22.46.44.69.65.29.23.57.46.86.68.23.17.46.34.69.51-.27-.24-.55-.51-.83-.79-.21-.15-.42-.3-.63-.45-.26-.19-.52-.39-.78-.6Z"/>
                  <path class="pqr-388" d="M479.47,866c.16.17.32.34.5.5.23.22.46.45.69.67.26.2.52.4.78.6.21.15.42.3.63.45-.28-.28-.57-.57-.85-.83-.21-.2-.42-.41-.63-.63-.16-.11-.33-.22-.49-.33-.21-.14-.41-.29-.61-.43Z"/>
                  <path class="pqr-33" d="M478.61,865.08c.12.14.25.28.38.41.17.17.32.34.49.51.2.15.41.29.61.43.16.11.33.22.49.33-.21-.22-.42-.43-.63-.64-.16-.16-.32-.33-.48-.5-.13-.08-.26-.15-.38-.23-.16-.1-.32-.2-.48-.31Z"/>
                  <path class="pqr-141" d="M477.99,864.39c.08.09.16.19.25.28.12.13.25.27.37.41.16.1.32.21.48.31.13.08.25.16.38.23-.16-.17-.32-.35-.47-.5-.11-.11-.21-.22-.32-.34-.1-.06-.21-.11-.31-.17-.13-.07-.26-.14-.39-.22Z"/>
                  <path class="pqr-192" d="M477.15,863.42c.19.23.39.47.59.69.08.09.16.18.25.28.13.07.26.14.39.22.1.06.21.11.31.17-.1-.12-.21-.23-.31-.34-.19-.21-.38-.42-.57-.64-.1-.06-.19-.12-.29-.17-.12-.07-.24-.14-.36-.21Z"/>
                  <path class="pqr-325" d="M475.23,860.95c.43.6.88,1.19,1.36,1.78.18.23.37.46.57.69.12.07.24.14.36.21.1.06.19.11.29.17-.19-.21-.37-.43-.55-.64-.46-.55-.9-1.12-1.32-1.68-.11-.09-.21-.17-.32-.24-.13-.09-.26-.19-.39-.29Z"/>
                  <path class="pqr-239" d="M472.3,856.14c.51,1,1.08,2,1.71,3,.38.6.79,1.21,1.22,1.8.13.1.26.21.39.29.1.07.21.15.32.24-.42-.57-.81-1.14-1.19-1.72-.62-.96-1.18-1.93-1.68-2.91-.12-.12-.23-.24-.34-.32-.14-.1-.28-.25-.42-.39Z"/>
                  <path class="pqr-293" d="M469.64,849.58c.36,1.17.78,2.36,1.28,3.57.41.99.87,1.99,1.38,2.99.14.14.29.29.42.39.11.08.23.2.34.32-.51-.98-.96-1.96-1.36-2.95-.49-1.2-.9-2.39-1.25-3.58-.12-.13-.24-.25-.36-.34-.15-.12-.3-.26-.45-.39Z"/>
                  <path class="pqr-19" d="M468.53,845.07c.07.36.15.72.23,1.09.24,1.11.53,2.26.89,3.43.15.13.3.28.45.39.12.09.24.22.36.34-.35-1.18-.63-2.35-.85-3.5-.07-.39-.15-.76-.21-1.13-.13-.1-.26-.2-.39-.29-.16-.12-.32-.23-.48-.33Z"/>
                  <path class="pqr-413" d="M468.15,842.75c.06.42.12.83.18,1.25.06.36.12.7.19,1.06.16.1.31.21.48.33.13.09.26.19.39.29-.06-.37-.12-.74-.17-1.11-.06-.44-.11-.9-.16-1.37-.14-.07-.27-.14-.41-.2-.17-.08-.33-.16-.5-.24Z"/>
                  <path class="pqr-299" d="M467.81,839.43c.05.66.12,1.36.2,2.06.04.42.09.84.15,1.26.16.08.33.17.5.24.13.06.27.13.41.2-.05-.48-.1-.97-.14-1.47-.07-.65-.12-1.3-.16-1.92-.14-.06-.29-.12-.43-.17-.17-.06-.35-.13-.52-.2Z"/>
                  <path class="pqr-15" d="M467.37,631.58c.06,58.53.1,116.51.13,155.18.01,22.8-.14,40.06.14,48.62.01.67.03,1.4.06,2.17.02.58.06,1.22.11,1.88.17.07.35.14.52.2.14.05.28.11.43.17-.04-.63-.08-1.24-.1-1.82-.66-16.21-.4-40.93-.4-70.44,0-1.86,0-3.74,0-5.64-.02-40.89-.02-90.21-.02-138.71-.14-.01-.28-.03-.41-.07-.15,3.09-.3,5.78-.44,8.47Z"/>
                  <path class="pqr-390" d="M467.08,421.9c.01,1.45.04,2.98.04,4.57.07,26.61.16,116.43.25,205.11.14-2.69.29-5.38.44-8.47.13.04.27.05.41.07,0-77.89,0-153.66-.11-189.04,0-2.15-.03-4.3-.05-6.46-.18,0-.36,0-.52-.05-.17-1.92-.32-3.83-.46-5.74Z"/>
                  <path class="pqr-415" d="M467.23,415.16c-.01.89-.07,1.8-.1,2.61-.05,1.3-.05,2.68-.04,4.13.14,1.91.29,3.81.46,5.74.16.05.34.06.52.05-.01-2.15-.02-4.31.03-6.45.03-1.38.08-2.86.07-4.32-.09-.04-.18-.09-.32-.13-.18-.59-.4-1.1-.62-1.62Z"/>
                  <path class="pqr-40" d="M466.93,412.14c.05.17.09.35.13.53.15.73.19,1.6.17,2.49.22.51.44,1.03.62,1.62.14.05.23.09.32.13,0-1.46-.05-2.9-.22-4.2-.02-.2-.05-.39-.09-.56-.14-.01-.29-.02-.42-.04-.18.02-.35.02-.51.03Z"/>
                  <path class="pqr-192" d="M466.75,411.65c.07.16.13.32.18.49.16,0,.33-.02.51-.03.13.02.28.03.42.04-.04-.17-.08-.35-.14-.5-.15,0-.29,0-.44,0-.18,0-.36,0-.53,0Z"/>
                  <path class="pqr-313" d="M479.89,866.55c.2.19.4.37.61.55.28.25.56.49.85.72-.23-.2-.46-.43-.69-.65-.26-.2-.52-.41-.77-.63Z"/>
                  <path class="pqr-66" d="M478.87,865.54c.14.15.29.29.43.44.19.19.39.38.59.57.25.21.51.42.77.63-.23-.22-.46-.45-.69-.67-.17-.16-.33-.33-.5-.5-.2-.15-.41-.3-.61-.46Z"/>
                  <path class="pqr-440" d="M478.13,864.75c.1.11.21.23.32.34.14.15.28.3.42.44.2.16.4.31.61.46-.16-.17-.32-.34-.49-.51-.13-.13-.25-.27-.38-.41-.16-.1-.32-.21-.48-.32Z"/>
                  <path class="pqr-220" d="M477.6,864.17c.07.08.14.16.21.24.1.12.21.23.31.35.16.11.32.22.48.32-.12-.14-.25-.28-.37-.41-.08-.09-.17-.19-.25-.28-.13-.07-.26-.15-.38-.22Z"/>
                  <path class="pqr-447" d="M476.8,863.23c.19.23.39.47.59.7.07.08.14.16.21.24.13.07.25.15.38.22-.08-.09-.16-.19-.25-.28-.2-.22-.4-.46-.59-.69-.12-.07-.24-.13-.35-.19Z"/>
                  <path class="pqr-23" d="M474.85,860.69c.43.61.89,1.23,1.38,1.84.19.23.38.47.57.7.12.06.23.13.35.19-.19-.23-.38-.47-.57-.69-.48-.59-.93-1.19-1.36-1.78-.13-.1-.26-.19-.38-.26Z"/>
                  <path class="pqr-253" d="M471.89,855.8c.52,1.01,1.09,2.02,1.73,3.04.39.62.8,1.23,1.23,1.85.12.06.25.16.38.26-.43-.6-.83-1.2-1.22-1.8-.63-.99-1.2-2-1.71-3-.14-.14-.28-.27-.41-.34Z"/>
                  <path class="pqr-83" d="M469.2,849.26c.36,1.16.79,2.34,1.29,3.55.41.99.87,1.99,1.39,3,.13.07.27.2.41.34-.51-1-.97-2-1.38-2.99-.5-1.2-.92-2.4-1.28-3.57-.15-.13-.29-.25-.44-.33Z"/>
                  <path class="pqr-218" d="M468.07,844.8c.07.36.15.72.23,1.08.25,1.09.54,2.22.91,3.37.14.07.29.19.44.33-.36-1.17-.65-2.32-.89-3.43-.08-.37-.16-.73-.23-1.09-.16-.1-.31-.19-.46-.27Z"/>
                  <path class="pqr-350" d="M467.67,842.53c.06.4.12.8.2,1.21.06.35.13.7.2,1.05.15.08.3.17.46.27-.07-.36-.14-.71-.19-1.06-.07-.42-.13-.83-.18-1.25-.16-.08-.32-.16-.48-.22Z"/>
                  <path class="pqr-33" d="M467.31,839.26c.05.67.12,1.37.21,2.12.05.38.1.77.16,1.16.15.06.31.14.48.22-.06-.42-.1-.83-.15-1.26-.08-.71-.15-1.41-.2-2.06-.17-.07-.34-.13-.5-.18Z"/>
                  <path class="pqr-172" d="M466.95,640.08c.11,98.32.2,192.35.2,194.84,0,.7,0,1.54.04,2.46.02.58.06,1.21.11,1.88.16.05.33.11.5.18-.05-.66-.09-1.29-.11-1.88-.03-.77-.05-1.5-.06-2.17-.28-8.56-.12-25.82-.14-48.62-.03-38.68-.07-96.66-.13-155.18-.14,2.69-.29,5.39-.42,8.49Z"/>
                  <path class="pqr-438" d="M466.65,416.17c0,.75,0,1.65.01,2.69.06,17.86.19,121.74.3,221.22.13-3.11.27-5.8.42-8.49-.08-88.68-.18-178.5-.25-205.11,0-1.59-.03-3.12-.04-4.57-.14-1.91-.28-3.81-.44-5.73Z"/>
                  <path class="pqr-37" d="M466.64,413.55c0,.27,0,.54,0,.8,0,.46,0,1.06,0,1.82.15,1.92.29,3.83.44,5.73-.01-1.45,0-2.83.04-4.13.03-.81.09-1.72.1-2.61-.22-.51-.43-1.03-.59-1.61Z"/>
                  <path class="pqr-236" d="M466.44,412.18c.05.18.1.37.13.57.04.26.06.53.06.8.16.59.38,1.1.59,1.61.01-.89-.02-1.76-.17-2.49-.03-.18-.08-.36-.13-.53-.16,0-.32.02-.48.03Z"/>
                  <path class="pqr-52" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                </g>
                <g>
                  <path class="pqr-50" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                  <path class="pqr-50" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                  <path class="pqr-50" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                  <path class="pqr-50" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                  <path class="pqr-50" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                  <path class="pqr-50" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                  <path class="pqr-50" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                  <path class="pqr-50" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                  <path class="pqr-50" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                  <path class="pqr-50" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                  <path class="pqr-50" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                  <path class="pqr-50" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                  <path class="pqr-50" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                  <path class="pqr-50" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                  <path class="pqr-50" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                  <path class="pqr-50" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                </g>
                <g>
                  <path class="pqr-50" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                  <path class="pqr-50" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                  <path class="pqr-50" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                  <path class="pqr-50" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                  <path class="pqr-50" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                  <path class="pqr-50" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                  <path class="pqr-50" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                  <path class="pqr-50" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                  <path class="pqr-50" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                  <path class="pqr-50" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                  <path class="pqr-50" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                  <path class="pqr-50" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                  <path class="pqr-50" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                  <path class="pqr-50" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                  <path class="pqr-50" d="M466.25,411.66c.08.16.14.34.2.52.16-.02.32-.02.48-.03-.05-.17-.11-.33-.18-.49-.17,0-.34,0-.51,0Z"/>
                </g>
              </g>
              <g id="MeshGrid-3" data-name="MeshGrid">
                <g>
                  <path class="pqr-52" d="M545.89,411.27c-.07.13-.14.26-.19.39.1,0,.2,0,.3,0,.06-.13.13-.26.2-.38-.1,0-.2-.01-.31-.02Z"/>
                  <path class="pqr-209" d="M546.48,410.48c-.13.13-.25.27-.35.42-.09.12-.17.24-.24.37.11,0,.21,0,.31.02.07-.12.16-.23.24-.34.11-.14.23-.26.35-.38-.1-.02-.2-.05-.31-.08Z"/>
                  <path class="pqr-407" d="M547.45,409.78c-.2.1-.39.22-.56.34-.14.11-.28.22-.41.35.11.03.22.05.31.08.13-.12.26-.23.41-.33.17-.12.35-.23.55-.33-.09-.04-.19-.07-.29-.11Z"/>
                  <path class="pqr-446" d="M548.48,409.38c-.13.04-.25.08-.37.12-.23.08-.45.18-.66.28.11.03.21.07.29.11.19-.1.4-.19.61-.26.11-.04.23-.08.35-.11-.07-.05-.14-.09-.23-.14Z"/>
                  <path class="pqr-146" d="M550.6,409.01c-.58.05-1.17.13-1.74.26-.13.03-.26.07-.39.11.08.05.16.09.23.14.12-.03.24-.07.36-.09.61-.14,1.24-.2,1.87-.24-.11-.05-.22-.11-.34-.17Z"/>
                  <path class="pqr-272" d="M553.6,408.79c-.41.04-.83.07-1.23.09-.58.04-1.18.07-1.76.12.12.06.22.12.34.17.63-.04,1.27-.05,1.89-.09.45-.03.92-.06,1.38-.1-.2-.06-.39-.13-.61-.19Z"/>
                  <path class="pqr-346" d="M555.91,408.5c-.34.06-.71.12-1.1.17-.39.05-.8.09-1.21.13.21.07.41.13.61.19.46-.04.92-.08,1.35-.13.47-.05.92-.11,1.33-.18-.27-.07-.62-.12-.98-.18Z"/>
                  <path class="pqr-307" d="M557.59,407.87c-.18.16-.43.29-.76.4-.27.09-.58.16-.92.23.36.06.71.11.98.18.41-.07.78-.15,1.09-.23.39-.11.69-.24.84-.38-.36-.08-.79-.13-1.24-.19Z"/>
                  <path class="pqr-454" d="M558.06,406.86c-.03.11-.06.21-.09.31-.07.21-.16.39-.26.55-.03.05-.07.1-.13.15.45.05.88.11,1.24.19.05-.05.09-.1.11-.15.07-.16.13-.35.19-.55.03-.11.06-.23.09-.36-.37-.05-.75-.1-1.15-.14Z"/>
                  <path class="pqr-243" d="M558.23,406.26c-.04.09-.07.18-.09.26-.02.12-.05.23-.07.34.4.04.78.09,1.15.14.03-.12.05-.25.07-.37.01-.08.02-.15.03-.23-.34-.05-.71-.1-1.09-.14Z"/>
                  <path class="pqr-176" d="M558.42,405.8c-.02.06-.05.13-.07.19-.04.09-.08.18-.12.27.38.04.75.09,1.09.14,0-.08.02-.15.02-.23,0-.05,0-.11,0-.16-.31-.08-.61-.15-.94-.21Z"/>
                  <path class="pqr-70" d="M558.5,405.38c-.01.08-.04.16-.04.24,0,.06-.02.12-.04.18.32.06.63.13.94.21,0-.05,0-.11,0-.16,0-.07,0-.14,0-.21-.28-.1-.55-.19-.85-.26Z"/>
                  <path class="pqr-78" d="M558.54,404.77c-.01.12-.04.25-.02.37.01.08,0,.16-.02.24.3.07.57.15.85.26,0-.07-.01-.14-.02-.21-.01-.11-.03-.21-.06-.31-.23-.14-.47-.25-.73-.34Z"/>
                  <path class="pqr-61" d="M558.51,404.31s.01.08.03.11c.04.1.02.23,0,.34.27.09.5.2.73.34-.03-.1-.06-.2-.1-.29-.01-.03-.03-.07-.04-.1-.19-.17-.39-.3-.62-.41Z"/>
                  <path class="pqr-61" d="M558.47,404.07s.02.09.02.13c0,.04,0,.08.01.11.24.11.43.24.62.41-.02-.03-.03-.06-.05-.09-.02-.04-.04-.07-.07-.11-.17-.18-.34-.33-.54-.45Z"/>
                  <path class="pqr-401" d="M558.41,403.95s.04.08.06.12c.21.12.38.27.54.45-.02-.03-.05-.07-.08-.1-.16-.19-.32-.34-.53-.47Z"/>
                  <path class="pqr-41" d="M545.25,411.24c-.06.14-.11.28-.15.42.1,0,.2,0,.3,0,.1,0,.2,0,.31,0,.05-.13.12-.26.19-.39-.11,0-.22,0-.32-.02-.1,0-.21-.01-.32-.01Z"/>
                  <path class="pqr-46" d="M545.79,410.33c-.12.15-.24.31-.33.48-.08.14-.15.28-.21.42.11,0,.22,0,.32.01.11,0,.22.01.32.02.07-.13.15-.25.24-.37.11-.15.23-.29.35-.42-.11-.03-.22-.05-.34-.08-.11-.02-.23-.05-.35-.07Z"/>
                  <path class="pqr-395" d="M546.79,409.57c-.23.11-.43.24-.6.37-.14.11-.28.25-.4.4.12.03.24.05.35.07.11.02.23.05.34.08.13-.13.27-.25.41-.35.17-.12.36-.24.56-.34-.11-.03-.22-.07-.32-.11-.1-.04-.22-.07-.34-.11Z"/>
                  <path class="pqr-218" d="M547.95,409.1c-.14.05-.28.1-.42.15-.26.1-.51.2-.74.32.12.03.24.07.34.11.11.04.22.07.32.11.2-.1.42-.2.66-.28.12-.04.25-.09.37-.12-.08-.04-.17-.09-.26-.14-.09-.05-.18-.09-.28-.14Z"/>
                  <path class="pqr-275" d="M549.77,408.67c-.47.07-.94.16-1.39.29-.14.04-.29.09-.43.13.1.04.19.09.28.14.09.05.18.09.26.14.13-.04.26-.07.39-.11.56-.14,1.15-.21,1.74-.26-.12-.06-.24-.12-.39-.18-.15-.06-.29-.1-.45-.15Z"/>
                  <path class="pqr-354" d="M552.14,408.4c-.31.04-.63.07-.94.1-.48.05-.96.1-1.43.17.15.05.3.1.45.15.15.06.27.12.39.18.58-.05,1.18-.08,1.76-.12.41-.03.82-.06,1.23-.09-.21-.07-.44-.14-.69-.2-.25-.06-.5-.13-.76-.19Z"/>
                  <path class="pqr-58" d="M553.88,408.1c-.25.06-.51.12-.81.17-.31.06-.62.1-.93.14.26.06.51.13.76.19.26.07.48.13.69.2.41-.04.82-.08,1.21-.13.39-.05.76-.11,1.1-.17-.36-.06-.74-.11-1.08-.18-.31-.06-.63-.14-.95-.22Z"/>
                  <path class="pqr-81" d="M555.11,407.49c-.16.16-.35.29-.57.39-.2.09-.41.16-.66.22.32.08.64.16.95.22.34.07.71.13,1.08.18.34-.06.65-.14.92-.23.32-.11.58-.24.76-.4-.45-.05-.91-.11-1.33-.17-.37-.05-.76-.13-1.15-.21Z"/>
                  <path class="pqr-210" d="M555.6,406.61c-.03.09-.06.17-.09.25-.11.26-.24.46-.4.63.39.08.78.16,1.15.21.42.07.88.12,1.33.17.05-.05.09-.1.13-.15.1-.16.18-.34.26-.55.03-.1.07-.2.09-.31-.4-.04-.81-.09-1.24-.12-.4-.04-.82-.08-1.23-.13Z"/>
                  <path class="pqr-441" d="M555.83,406.04c-.06.1-.14.19-.16.29-.02.1-.05.19-.08.28.42.04.83.09,1.23.13.42.04.84.08,1.24.12.03-.11.05-.22.07-.34.02-.08.05-.18.09-.26-.38-.04-.78-.08-1.19-.12-.39-.04-.79-.07-1.21-.1Z"/>
                  <path class="pqr-57" d="M556.19,405.54c-.03.07-.09.14-.14.21-.06.1-.16.19-.22.29.42.03.82.07,1.21.1.4.04.8.07,1.19.12.04-.09.08-.18.12-.27.03-.06.05-.13.07-.19-.32-.06-.66-.11-1.04-.15-.36-.04-.76-.08-1.19-.11Z"/>
                  <path class="pqr-431" d="M556.36,405.07c-.02.09-.07.18-.09.27,0,.07-.05.13-.08.2.43.03.82.07,1.19.11.38.04.72.09,1.04.15.02-.06.03-.13.04-.18,0-.08.03-.16.04-.24-.3-.07-.62-.13-.98-.18-.35-.05-.73-.09-1.16-.13Z"/>
                  <path class="pqr-260" d="M556.44,404.38c-.02.14-.08.28-.05.42.02.09-.01.18-.04.27.43.04.81.08,1.16.13.36.05.68.11.98.18.01-.08.03-.16.02-.24-.02-.12.01-.25.02-.37-.27-.09-.56-.17-.91-.23-.34-.06-.72-.11-1.19-.16Z"/>
                  <path class="pqr-337" d="M556.47,403.85s0,.09.01.13c.04.12-.02.26-.04.39.46.05.85.1,1.19.16.35.06.64.14.91.23.01-.12.03-.24,0-.34-.01-.04-.02-.08-.03-.11-.24-.11-.51-.19-.85-.27-.33-.07-.71-.13-1.19-.19Z"/>
                  <path class="pqr-337" d="M556.46,403.57c.01.05,0,.1,0,.15,0,.04,0,.09,0,.13.48.06.87.12,1.19.19.34.07.61.16.85.27,0-.04,0-.08-.01-.11,0-.04,0-.09-.02-.13-.21-.12-.46-.22-.79-.3-.32-.08-.72-.14-1.22-.21Z"/>
                  <path class="pqr-433" d="M556.41,403.42s.04.1.05.15c.5.06.9.13,1.22.21.33.08.58.18.79.3-.01-.04-.03-.08-.06-.12-.21-.13-.46-.23-.79-.31-.32-.08-.71-.15-1.22-.22Z"/>
                  <path class="pqr-192" d="M544.88,411.2c-.06.15-.1.3-.14.45.02,0,.03,0,.05,0,.1,0,.21,0,.31,0,.04-.14.09-.28.15-.42-.11,0-.22,0-.33-.01-.02,0-.03-.01-.04-.02Z"/>
                  <path class="pqr-183" d="M545.37,410.24c-.11.16-.21.33-.29.51-.07.14-.14.3-.19.45.01.01.02.02.04.02.11,0,.22.01.33.01.06-.14.13-.28.21-.42.1-.17.21-.33.33-.48-.12-.03-.25-.05-.37-.07-.02,0-.04,0-.06-.02Z"/>
                  <path class="pqr-201" d="M546.37,409.45c-.24.12-.45.24-.62.38-.15.12-.28.26-.39.41.02,0,.04.01.06.02.12.02.25.05.37.07.12-.15.26-.28.4-.4.17-.13.37-.25.6-.37-.12-.03-.25-.07-.37-.11-.02,0-.03,0-.05-.01Z"/>
                  <path class="pqr-289" d="M547.6,408.95c-.15.05-.3.11-.44.16-.28.11-.54.22-.78.34.02,0,.03,0,.05.01.12.04.24.07.37.11.23-.11.48-.22.74-.32.14-.05.28-.1.42-.15-.1-.05-.2-.09-.31-.14-.01,0-.03-.01-.04-.02Z"/>
                  <path class="pqr-444" d="M549.21,408.53c-.39.07-.78.15-1.17.27-.15.05-.3.1-.45.15.01,0,.03,0,.04.02.11.05.21.09.31.14.14-.05.28-.09.43-.13.45-.13.92-.22,1.39-.29-.15-.05-.31-.1-.48-.15-.02,0-.05,0-.08,0Z"/>
                  <path class="pqr-297" d="M551.19,408.2c-.27.05-.54.09-.81.14-.39.06-.79.12-1.18.19.03,0,.06,0,.08,0,.17.05.33.1.48.15.47-.07.95-.12,1.43-.17.32-.03.63-.06.94-.1-.26-.06-.53-.13-.81-.18-.04,0-.09-.01-.13-.02Z"/>
                  <path class="pqr-277" d="M552.68,407.87c-.21.06-.44.11-.68.16-.27.06-.54.11-.81.16.05,0,.1.01.13.02.28.06.55.12.81.18.31-.04.62-.08.93-.14.3-.05.57-.11.81-.17-.32-.08-.65-.16-.99-.21-.05,0-.13,0-.21,0Z"/>
                  <path class="pqr-264" d="M553.78,407.29c-.14.16-.32.27-.52.37-.18.09-.37.15-.58.21.08,0,.17,0,.21,0,.34.06.67.14.99.21.25-.06.46-.13.66-.22.22-.1.41-.23.57-.39-.39-.08-.79-.16-1.18-.19-.05,0-.1,0-.15,0Z"/>
                  <path class="pqr-331" d="M554.18,406.48c-.02.08-.04.15-.07.23-.07.24-.19.43-.33.59.05,0,.1,0,.15,0,.39.04.79.12,1.18.19.16-.16.29-.37.4-.63.03-.08.06-.16.09-.25-.42-.04-.84-.08-1.26-.11-.06,0-.11-.01-.16-.02Z"/>
                  <path class="pqr-54" d="M554.34,405.93c-.04.1-.08.2-.12.3-.01.08-.03.16-.05.24.05.01.11.02.16.02.42.03.84.07,1.26.11.03-.09.05-.18.08-.28.02-.1.11-.19.16-.29-.42-.03-.85-.06-1.31-.1-.07,0-.12,0-.18-.01Z"/>
                  <path class="pqr-169" d="M554.56,405.42c-.02.07-.05.14-.08.21-.04.1-.09.2-.13.3.06,0,.12,0,.18.01.45.03.89.06,1.31.1.06-.1.16-.19.22-.29.04-.07.1-.14.14-.21-.43-.03-.9-.07-1.41-.11-.07,0-.15-.01-.22-.02Z"/>
                  <path class="pqr-449" d="M554.65,404.92c0,.1-.02.19-.04.29-.01.07-.03.14-.05.21.08,0,.15.01.22.02.51.04.98.07,1.41.11.03-.07.08-.14.08-.2.01-.09.06-.18.09-.27-.43-.04-.92-.08-1.47-.13-.08,0-.16-.01-.24-.02Z"/>
                  <path class="pqr-335" d="M554.53,404.2c.02.14.04.29.09.44.03.1.03.19.03.29.08,0,.16.01.24.02.55.04,1.04.08,1.47.13.02-.09.06-.18.04-.27-.04-.14.03-.28.05-.42-.46-.05-1-.1-1.63-.16-.09,0-.18-.02-.28-.02Z"/>
                  <path class="pqr-7" d="M554.4,403.64s.03.09.04.14c.04.13.06.27.08.41.1,0,.19.02.28.02.63.06,1.17.1,1.63.16.02-.14.08-.27.04-.39-.01-.04,0-.09-.01-.13-.48-.06-1.05-.12-1.76-.18-.1,0-.2-.02-.31-.03Z"/>
                  <path class="pqr-250" d="M554.29,403.34c.03.05.05.11.07.16.02.05.03.09.05.14.1,0,.21.02.31.03.7.06,1.28.12,1.76.18,0-.04,0-.09,0-.13,0-.05,0-.1,0-.15-.5-.06-1.1-.12-1.84-.19-.11,0-.22-.02-.33-.03Z"/>
                  <path class="pqr-435" d="M554.19,403.18c.04.05.07.11.1.16.11.01.22.02.33.03.74.07,1.34.13,1.84.19-.01-.05-.02-.1-.05-.15-.51-.07-1.12-.13-1.88-.2-.11-.01-.22-.02-.34-.03Z"/>
                  <path class="pqr-192" d="M544.53,411.19c-.05.16-.09.32-.12.47.1,0,.19,0,.29,0h.05c.04-.15.08-.3.14-.45-.01-.01-.02-.02-.04-.02-.1,0-.21,0-.31,0Z"/>
                  <path class="pqr-183" d="M544.96,410.17c-.11.17-.19.35-.26.54-.06.15-.12.31-.17.47.11,0,.21-.02.31,0,.02,0,.03.01.04.02.06-.15.12-.3.19-.45.08-.18.18-.35.29-.51-.02,0-.04-.01-.06-.02-.11-.02-.23-.04-.35-.06Z"/>
                  <path class="pqr-201" d="M545.97,409.34c-.25.12-.46.25-.63.39-.15.12-.28.27-.38.44.12.02.24.04.35.06.02,0,.04,0,.06.02.11-.16.25-.3.39-.41.17-.13.38-.26.62-.38-.02,0-.04,0-.05-.01-.11-.03-.23-.07-.35-.1Z"/>
                  <path class="pqr-380" d="M547.24,408.81c-.15.06-.31.12-.46.18-.29.11-.57.23-.81.36.12.03.24.06.35.1.02,0,.03,0,.05.01.24-.12.5-.23.78-.34.15-.06.29-.11.44-.16-.01,0-.03,0-.04-.01-.1-.04-.2-.08-.31-.13Z"/>
                  <path class="pqr-444" d="M548.68,408.39c-.33.08-.65.15-.97.26-.15.05-.31.11-.46.17.11.04.21.08.31.13.02,0,.03.01.04.01.15-.05.3-.1.45-.15.38-.11.77-.2,1.17-.27-.03,0-.06,0-.08,0-.15-.04-.3-.09-.45-.14Z"/>
                  <path class="pqr-258" d="M550.33,408.01c-.23.05-.45.11-.67.16-.33.08-.65.14-.98.22.15.05.3.1.45.14.02,0,.05,0,.08,0,.39-.07.79-.13,1.18-.19.27-.04.54-.09.81-.14-.05,0-.1-.01-.14-.02-.25-.05-.49-.11-.73-.17Z"/>
                  <path class="pqr-277" d="M551.57,407.67c-.18.06-.37.11-.56.16-.23.06-.45.12-.68.17.24.06.48.12.73.17.04,0,.09.01.14.02.27-.05.54-.1.81-.16.24-.05.46-.1.68-.16-.08,0-.17,0-.21,0-.31-.05-.6-.13-.89-.2Z"/>
                  <path class="pqr-172" d="M552.53,407.1c-.13.14-.28.26-.46.36-.16.08-.32.15-.5.21.29.07.59.14.89.2.05,0,.13,0,.21,0,.21-.06.41-.13.58-.21.2-.1.37-.22.52-.37-.05,0-.1,0-.15,0-.35-.04-.73-.11-1.09-.18Z"/>
                  <path class="pqr-235" d="M552.88,406.37c-.02.07-.04.14-.06.2-.06.21-.16.39-.29.53.37.07.74.14,1.09.18.05,0,.1,0,.15,0,.14-.16.25-.35.33-.59.03-.07.05-.15.07-.23-.05-.01-.11-.02-.16-.02-.38-.03-.76-.06-1.13-.08Z"/>
                  <path class="pqr-358" d="M553.04,405.85c-.04.1-.08.2-.11.31-.01.07-.03.14-.04.21.38.03.76.05,1.13.08.06,0,.11.01.16.02.02-.08.04-.16.05-.24.03-.1.07-.2.12-.3-.06,0-.12,0-.19-.01-.37-.02-.75-.05-1.12-.07Z"/>
                  <path class="pqr-450" d="M553.23,405.33c-.02.07-.04.14-.07.22-.04.1-.08.2-.12.3.37.02.75.05,1.12.07.07,0,.13,0,.19.01.04-.1.09-.2.13-.3.03-.07.06-.14.08-.21-.08,0-.15-.01-.23-.02-.37-.03-.73-.05-1.1-.07Z"/>
                  <path class="pqr-7" d="M553.34,404.83c-.02.1-.06.19-.07.29,0,.07-.02.14-.04.22.36.02.73.05,1.1.07.08,0,.15.01.23.02.02-.07.04-.14.05-.21.02-.1.03-.19.04-.29-.08,0-.17-.01-.25-.02-.24-.02-.49-.04-.75-.06-.1,0-.2-.01-.31-.02Z"/>
                  <path class="pqr-137" d="M553.22,404.09c.03.14.07.29.13.44.03.1,0,.19-.01.29.1,0,.21.01.31.02.25.02.5.04.75.06.08,0,.17.01.25.02,0-.1,0-.19-.03-.29-.05-.15-.07-.3-.09-.44-.1,0-.19-.02-.29-.02-.23-.02-.48-.04-.72-.06-.1,0-.2-.01-.3-.02Z"/>
                  <path class="pqr-349" d="M553.08,403.53s.03.1.04.14c.04.14.07.28.1.42.1,0,.2.01.3.02.24.02.49.04.72.06.1,0,.2.02.29.02-.02-.14-.04-.28-.08-.41-.01-.05-.03-.1-.04-.14-.1,0-.21-.02-.32-.03-.34-.03-.67-.06-1-.08Z"/>
                  <path class="pqr-421" d="M552.94,403.22c.03.05.06.11.09.17.02.05.04.09.05.14.33.03.67.05,1,.08.11,0,.22.02.32.03-.01-.05-.03-.09-.05-.14-.02-.05-.04-.11-.07-.16-.11-.01-.23-.02-.35-.03-.34-.03-.67-.06-1-.09Z"/>
                  <path class="pqr-32" d="M552.83,403.06c.04.05.08.11.11.16.33.03.66.06,1,.09.12.01.23.02.35.03-.03-.05-.06-.11-.1-.16-.11-.01-.23-.02-.35-.03-.34-.03-.67-.06-1.01-.09Z"/>
                  <path class="pqr-407" d="M543.76,411.13c-.03.17-.06.35-.08.52.14,0,.29,0,.43,0,.1,0,.2,0,.29,0,.03-.15.07-.31.12-.47-.11,0-.22.02-.32,0-.15,0-.3-.04-.44-.06Z"/>
                  <path class="pqr-166" d="M544.06,410.02c-.09.18-.15.38-.19.59-.04.17-.08.35-.11.52.15.03.29.05.44.06.11,0,.21,0,.32,0,.05-.16.1-.32.17-.47.07-.19.16-.38.26-.54-.12-.02-.24-.04-.36-.06-.17-.03-.35-.06-.54-.1Z"/>
                  <path class="pqr-13" d="M545.06,409.13c-.25.13-.47.27-.64.41-.15.14-.27.3-.36.48.18.03.36.07.54.1.12.02.24.04.36.06.11-.17.23-.31.38-.44.17-.13.38-.26.63-.39-.12-.03-.25-.06-.37-.09-.17-.05-.36-.09-.54-.12Z"/>
                  <path class="pqr-141" d="M546.38,408.54c-.16.07-.33.13-.48.2-.3.13-.59.26-.84.39.19.04.37.08.54.12.12.03.25.06.37.09.25-.12.52-.24.81-.36.15-.06.31-.12.46-.18-.11-.04-.22-.08-.34-.12-.16-.06-.34-.11-.52-.15Z"/>
                  <path class="pqr-163" d="M547.53,408.07c-.23.09-.43.17-.65.26-.16.07-.33.13-.49.2.19.05.36.09.52.15.11.04.23.08.34.12.15-.06.31-.11.46-.17.32-.1.64-.18.97-.26-.15-.05-.3-.1-.46-.15-.24-.07-.46-.12-.69-.17Z"/>
                  <path class="pqr-82" d="M548.6,407.63c-.14.06-.28.12-.42.18-.22.09-.42.18-.65.26.23.05.45.1.69.17.16.05.31.1.46.15.33-.08.66-.14.98-.22.22-.05.45-.11.67-.16-.24-.06-.48-.12-.72-.17-.36-.07-.69-.14-1.01-.2Z"/>
                  <path class="pqr-47" d="M549.41,407.24c-.12.07-.25.14-.4.2-.14.06-.27.13-.41.19.32.06.66.13,1.01.2.24.05.48.11.72.17.23-.05.45-.11.68-.17.19-.05.38-.1.56-.16-.29-.07-.58-.14-.88-.19-.42-.07-.86-.16-1.28-.24Z"/>
                  <path class="pqr-360" d="M550.03,406.7c-.09.12-.18.22-.29.31-.1.08-.21.16-.33.23.42.08.86.17,1.28.24.3.05.59.12.88.19.18-.06.35-.13.5-.21.18-.1.33-.21.46-.36-.37-.07-.73-.14-1.07-.18-.48-.04-.96-.14-1.43-.23Z"/>
                  <path class="pqr-296" d="M550.3,406.17s-.03.09-.05.14c-.06.15-.13.27-.22.39.46.09.95.18,1.43.23.34.04.7.11,1.07.18.13-.14.23-.32.29-.53.02-.07.04-.13.06-.2-.38-.03-.75-.05-1.11-.08-.51-.03-1.01-.08-1.48-.12Z"/>
                  <path class="pqr-74" d="M550.46,405.72c-.03.1-.08.2-.11.3-.02.05-.03.1-.05.15.47.04.97.09,1.48.12.36.03.73.05,1.11.08.02-.07.03-.14.04-.21.03-.1.07-.2.11-.31-.37-.02-.74-.04-1.1-.06-.52-.03-1.01-.05-1.48-.07Z"/>
                  <path class="pqr-261" d="M550.59,405.2c0,.07-.02.14-.03.22-.02.1-.06.2-.09.3.47.02.96.05,1.48.07.36.02.73.04,1.1.06.04-.1.09-.2.12-.3.03-.07.05-.14.07-.22-.36-.02-.72-.04-1.09-.06-.52-.03-1.04-.05-1.55-.07Z"/>
                  <path class="pqr-244" d="M550.64,404.69c0,.1-.07.19-.05.29.01.07,0,.14,0,.22.51.02,1.03.05,1.55.07.37.02.73.04,1.09.06.02-.07.03-.14.04-.22,0-.1.05-.19.07-.29-.35-.02-.71-.04-1.08-.06-.52-.03-1.06-.05-1.62-.07Z"/>
                  <path class="pqr-27" d="M550.49,403.96c.07.15.08.29.16.44.05.1,0,.19,0,.29.56.02,1.11.05,1.62.07.37.02.73.04,1.08.06.02-.1.04-.19.01-.29-.05-.15-.1-.3-.13-.44-.33-.02-.68-.04-1.04-.06-.51-.03-1.07-.05-1.7-.07Z"/>
                  <path class="pqr-127" d="M550.25,403.39s.04.1.07.15c.08.14.09.28.16.43.62.02,1.19.05,1.7.07.36.02.71.04,1.04.06-.03-.14-.07-.28-.1-.42-.01-.05-.03-.1-.04-.14-.33-.03-.67-.05-1-.07-.51-.03-1.13-.05-1.83-.08Z"/>
                  <path class="pqr-6" d="M550.06,403.07c.05.06.07.11.11.17.04.05.05.1.08.14.7.03,1.32.05,1.83.08.34.02.67.04,1,.07-.02-.05-.03-.1-.05-.14-.02-.06-.05-.11-.09-.17-.33-.03-.66-.05-1-.07-.51-.03-1.15-.05-1.89-.08Z"/>
                  <path class="pqr-100" d="M549.92,402.91c.06.05.09.11.13.16.74.03,1.37.06,1.89.08.34.02.67.04,1,.07-.03-.05-.07-.11-.11-.16-.34-.03-.67-.05-1.01-.07-.51-.03-1.15-.06-1.9-.08Z"/>
                  <path class="pqr-2" d="M542.64,411.1c-.04.18-.07.37-.1.54.24,0,.48,0,.71,0,.15,0,.29,0,.44,0,.02-.16.05-.34.08-.52-.15-.03-.29-.05-.45-.05-.22,0-.44,0-.67.02Z"/>
                  <path class="pqr-414" d="M542.98,409.96c-.1.19-.16.39-.21.61-.05.17-.09.36-.13.54.23-.01.45-.03.67-.02.16,0,.31.03.45.05.03-.17.07-.35.11-.52.04-.21.1-.41.19-.59-.18-.03-.37-.06-.55-.08-.19,0-.36.01-.54.03Z"/>
                  <path class="pqr-396" d="M543.98,408.97c-.24.16-.46.32-.63.48-.15.15-.27.32-.37.51.17-.01.34-.03.54-.03.18.02.37.05.55.08.09-.18.21-.34.36-.48.16-.14.39-.28.64-.41-.19-.04-.38-.07-.58-.11-.18-.01-.34-.03-.5-.05Z"/>
                  <path class="pqr-276" d="M545.25,408.27c-.16.08-.31.15-.46.23-.28.15-.56.31-.8.47.16.02.32.04.5.05.19.04.39.07.58.11.25-.13.54-.26.84-.39.16-.07.32-.13.48-.2-.19-.05-.38-.09-.58-.13-.19-.04-.37-.09-.56-.13Z"/>
                  <path class="pqr-392" d="M546.16,407.81c-.16.09-.3.17-.45.24-.16.07-.32.15-.47.22.19.04.37.09.56.13.2.04.39.09.58.13.16-.07.33-.13.49-.2.23-.09.43-.18.65-.26-.23-.05-.45-.09-.69-.15-.22-.04-.44-.08-.67-.12Z"/>
                  <path class="pqr-352" d="M546.9,407.32c-.09.06-.18.13-.28.2-.15.1-.3.2-.46.29.23.04.46.08.67.12.24.05.47.1.69.15.23-.09.43-.17.65-.26.15-.06.28-.12.42-.18-.32-.06-.63-.12-.93-.17-.26-.04-.51-.09-.77-.14Z"/>
                  <path class="pqr-404" d="M547.42,406.91c-.08.08-.17.16-.26.23-.08.06-.16.12-.25.18.25.05.51.1.77.14.3.06.61.11.93.17.14-.06.27-.12.41-.19.15-.07.28-.13.4-.2-.42-.08-.82-.16-1.16-.21-.27-.03-.55-.08-.84-.12Z"/>
                  <path class="pqr-196" d="M547.86,406.38c-.07.1-.14.19-.22.29-.07.08-.14.16-.22.24.28.04.56.08.84.12.34.05.74.13,1.16.21.12-.07.23-.15.33-.23.11-.09.21-.2.29-.31-.46-.09-.91-.18-1.29-.21-.28-.02-.58-.07-.88-.11Z"/>
                  <path class="pqr-84" d="M548.12,406s-.04.06-.06.09c-.07.1-.13.19-.2.29.3.04.61.08.88.11.38.03.83.12,1.29.21.09-.12.15-.24.22-.39.02-.05.03-.09.05-.14-.47-.04-.92-.09-1.32-.11-.28-.02-.56-.04-.85-.06Z"/>
                  <path class="pqr-315" d="M548.25,405.62c0,.1-.03.2-.06.3-.02.03-.04.06-.06.09.29.02.57.04.85.06.41.02.85.06,1.32.11.02-.05.03-.1.05-.15.03-.1.08-.2.11-.3-.47-.02-.93-.04-1.37-.06-.28-.01-.56-.03-.84-.04Z"/>
                  <path class="pqr-154" d="M548.2,405.1c.02.07.03.14.04.22.01.1.01.2,0,.3.28.01.56.02.84.04.45.02.9.04,1.37.06.03-.1.08-.2.09-.3.01-.07.03-.14.03-.22-.51-.02-1.02-.04-1.52-.06-.28-.01-.57-.02-.86-.03Z"/>
                  <path class="pqr-419" d="M548.07,404.6c.03.1.06.19.08.28.02.07.04.14.05.22.29,0,.58.02.86.03.51.02,1.01.04,1.52.06,0-.07.01-.14,0-.22-.02-.1.05-.19.05-.29-.56-.02-1.15-.05-1.75-.07-.27,0-.55-.01-.82-.02Z"/>
                  <path class="pqr-226" d="M547.7,403.88c.1.15.19.29.26.44.05.1.08.19.11.28.27,0,.55.01.82.02.6.02,1.19.05,1.75.07,0-.1.05-.19,0-.29-.08-.15-.09-.3-.16-.44-.62-.02-1.31-.05-2.06-.07-.24,0-.49,0-.73,0Z"/>
                  <path class="pqr-224" d="M547.23,403.3c.04.05.09.1.13.15.12.14.23.29.33.43.24,0,.49,0,.73,0,.75.03,1.44.05,2.06.07-.07-.15-.08-.29-.16-.43-.03-.05-.04-.1-.07-.15-.7-.03-1.49-.05-2.34-.08-.22,0-.45,0-.68,0Z"/>
                  <path class="pqr-280" d="M546.94,402.97c.05.06.11.12.16.18.05.05.09.1.13.15.23,0,.46,0,.68,0,.85.03,1.64.06,2.34.08-.03-.05-.05-.1-.08-.14-.04-.06-.06-.11-.11-.17-.74-.03-1.57-.06-2.48-.09-.21,0-.42-.01-.64-.01Z"/>
                  <path class="pqr-157" d="M546.78,402.8c.05.06.11.11.16.17.22,0,.43,0,.64.01.91.03,1.74.06,2.48.09-.05-.06-.08-.11-.13-.16-.75-.03-1.6-.06-2.54-.09-.2,0-.4-.01-.61-.02Z"/>
                  <path class="pqr-223" d="M541.62,411.14c-.07.17-.12.34-.17.5.12,0,.24,0,.36,0,.25,0,.49,0,.73,0,.03-.18.06-.36.1-.54-.23.01-.46.03-.69.03-.11,0-.22,0-.33,0Z"/>
                  <path class="pqr-213" d="M542.15,410.03c-.12.19-.22.39-.31.6-.08.17-.15.34-.22.51.11,0,.22,0,.33,0,.23,0,.46-.02.69-.03.04-.18.08-.36.13-.54.04-.22.11-.42.21-.61-.17.01-.35.03-.55.04-.1,0-.19.01-.28.03Z"/>
                  <path class="pqr-295" d="M543.18,408.95c-.23.18-.45.37-.63.55-.15.16-.29.34-.4.53.09-.01.18-.02.28-.03.2-.01.38-.03.55-.04.1-.19.22-.36.37-.51.17-.16.39-.32.63-.48-.16-.02-.33-.03-.53-.03-.1,0-.18,0-.27.01Z"/>
                  <path class="pqr-98" d="M544.34,408.14c-.14.09-.27.18-.41.27-.26.17-.51.35-.74.54.09,0,.17-.01.27-.01.21,0,.37.02.53.03.24-.16.52-.32.8-.47.15-.08.31-.16.46-.23-.19-.04-.39-.08-.61-.11-.11-.01-.2-.02-.3-.02Z"/>
                  <path class="pqr-402" d="M545.11,407.66c-.13.09-.25.17-.37.23-.13.08-.27.16-.41.25.1,0,.19,0,.3.02.22.03.42.07.61.11.16-.08.31-.15.47-.22.14-.07.29-.15.45-.24-.23-.04-.47-.07-.71-.1-.12-.02-.23-.03-.34-.04Z"/>
                  <path class="pqr-23" d="M545.72,407.18c-.07.06-.15.13-.23.19-.12.1-.25.2-.37.29.11.01.22.03.34.04.24.03.48.07.71.1.16-.09.31-.19.46-.29.1-.07.19-.13.28-.2-.25-.05-.51-.09-.78-.13-.13-.01-.27-.02-.41-.02Z"/>
                  <path class="pqr-99" d="M546.17,406.78c-.07.07-.16.15-.25.22-.06.06-.13.12-.21.18.14,0,.28,0,.41.02.27.03.52.08.78.13.09-.06.17-.13.25-.18.1-.07.18-.15.26-.23-.28-.04-.56-.08-.84-.11-.14-.01-.27-.02-.41-.02Z"/>
                  <path class="pqr-247" d="M546.59,406.29c-.07.09-.14.18-.21.26-.06.08-.13.15-.21.23.14,0,.27,0,.41.02.27.03.56.07.84.11.08-.08.15-.16.22-.24.08-.09.15-.19.22-.29-.3-.04-.61-.08-.88-.1-.14,0-.26,0-.39,0Z"/>
                  <path class="pqr-57" d="M546.85,405.94s-.04.05-.06.08c-.07.09-.14.17-.2.26.13,0,.25-.02.39,0,.28.02.58.06.88.1.07-.1.14-.19.2-.29.02-.03.04-.06.06-.09-.29-.02-.57-.04-.85-.05-.14,0-.28,0-.42,0Z"/>
                  <path class="pqr-57" d="M546.97,405.58c0,.1-.02.19-.05.29-.02.02-.05.05-.07.08.14,0,.28,0,.42,0,.28.01.56.03.85.05.02-.03.04-.06.06-.09.03-.1.05-.2.06-.3-.28-.01-.56-.02-.84-.03-.14,0-.28,0-.44,0Z"/>
                  <path class="pqr-8" d="M546.93,405.08c.01.07.03.14.03.21,0,.1.02.19.01.29.15,0,.3,0,.44,0,.28,0,.56.02.84.03,0-.1,0-.2,0-.3,0-.07-.02-.14-.04-.22-.29,0-.58-.01-.86-.02-.14,0-.28,0-.42,0Z"/>
                  <path class="pqr-288" d="M546.83,404.59c.02.09.03.19.05.28.01.07.03.14.04.21.14,0,.28,0,.42,0,.28,0,.57,0,.86.02-.02-.07-.03-.14-.05-.22-.03-.1-.05-.19-.08-.28-.27,0-.55,0-.82-.01-.13,0-.27,0-.41,0Z"/>
                  <path class="pqr-306" d="M546.57,403.87c.08.15.15.29.19.44.03.09.05.19.06.28.14,0,.28,0,.41,0,.27,0,.55,0,.82.01-.03-.1-.07-.19-.11-.28-.07-.15-.16-.3-.26-.44-.24,0-.49,0-.74-.01-.12,0-.25,0-.38,0Z"/>
                  <path class="pqr-24" d="M546.2,403.28c.04.05.07.1.11.15.1.14.19.29.27.43.13,0,.26,0,.38,0,.25,0,.49,0,.74.01-.1-.15-.21-.29-.33-.43-.04-.05-.09-.1-.13-.15-.23,0-.46,0-.69-.01-.11,0-.23,0-.35,0Z"/>
                  <path class="pqr-251" d="M545.96,402.95c.04.06.09.12.13.18.04.05.07.1.11.15.12,0,.23,0,.35,0,.23,0,.46,0,.69.01-.04-.05-.09-.1-.13-.15-.05-.06-.11-.12-.16-.18-.22,0-.44,0-.66-.02-.11,0-.21,0-.32,0Z"/>
                  <path class="pqr-445" d="M545.83,402.77c.04.06.08.12.13.18.11,0,.22,0,.32,0,.22,0,.44.01.66.02-.05-.06-.11-.11-.16-.17-.21,0-.42-.01-.63-.02-.1,0-.21,0-.31,0Z"/>
                  <path class="pqr-291" d="M540.25,411.22c-.1.15-.22.28-.31.42.39,0,.77,0,1.15,0,.12,0,.24,0,.36,0,.05-.16.11-.33.17-.5-.11,0-.22,0-.33,0-.34.01-.68.04-1.04.07Z"/>
                  <path class="pqr-378" d="M541.05,410.2c-.15.19-.32.39-.45.58-.11.15-.25.29-.35.44.36-.03.71-.06,1.04-.07.11,0,.22,0,.33,0,.07-.17.14-.34.22-.51.09-.21.19-.41.31-.6-.09.01-.18.03-.28.04-.26.03-.53.08-.82.13Z"/>
                  <path class="pqr-371" d="M542.19,409.01c-.21.21-.45.42-.65.63-.17.18-.35.37-.5.56.29-.05.56-.1.82-.13.1-.01.19-.03.28-.04.12-.19.25-.37.4-.53.18-.18.4-.37.63-.55-.09,0-.17.02-.27.03-.23.01-.46.02-.72.04Z"/>
                  <path class="pqr-120" d="M543.19,408.1c-.1.1-.22.2-.33.31-.21.2-.45.4-.66.61.27-.01.49-.02.72-.04.1,0,.18-.02.27-.03.23-.18.49-.36.74-.54.14-.09.27-.18.41-.27-.1,0-.19,0-.3,0-.24-.01-.52-.03-.85-.04Z"/>
                  <path class="pqr-93" d="M543.74,407.56c-.08.09-.16.17-.25.24-.09.09-.2.19-.3.29.33.01.61.03.85.04.11,0,.2,0,.3,0,.14-.09.27-.17.41-.25.12-.06.24-.14.37-.23-.11-.01-.22-.02-.34-.03-.28-.02-.63-.04-1.03-.06Z"/>
                  <path class="pqr-90" d="M544.1,407.08c-.05.06-.09.13-.14.19-.07.1-.12.2-.21.29.4.02.75.04,1.03.06.12,0,.23.02.34.03.13-.09.25-.19.37-.29.08-.06.16-.13.23-.19-.14,0-.28,0-.41,0-.35-.02-.76-.06-1.21-.08Z"/>
                  <path class="pqr-165" d="M544.4,406.69c-.05.07-.11.13-.17.2-.05.07-.09.13-.14.19.45.03.86.06,1.21.08.13,0,.27,0,.41,0,.07-.06.14-.12.21-.18.09-.07.17-.14.25-.22-.14,0-.27,0-.42,0-.39-.02-.85-.05-1.35-.08Z"/>
                  <path class="pqr-235" d="M544.7,406.24c-.05.08-.1.16-.15.24-.05.07-.1.14-.15.21.5.03.96.06,1.35.08.14,0,.28,0,.42,0,.07-.07.14-.15.21-.23.07-.09.14-.17.21-.26-.13,0-.26.02-.42.01-.44-.01-.93-.04-1.47-.06Z"/>
                  <path class="pqr-178" d="M544.87,405.91s-.02.05-.04.08c-.04.09-.09.17-.13.25.53.02,1.03.04,1.47.06.16,0,.29,0,.42-.01.07-.09.13-.18.2-.26.02-.03.04-.06.06-.08-.14,0-.3,0-.46,0-.47-.01-.98-.02-1.52-.03Z"/>
                  <path class="pqr-178" d="M544.97,405.56c-.02.09-.03.18-.06.27-.01.03-.03.05-.04.08.55,0,1.06.02,1.52.03.16,0,.31,0,.46,0,.02-.03.05-.05.07-.08.03-.09.04-.19.05-.29-.15,0-.31,0-.46,0-.46,0-.99-.01-1.54-.01Z"/>
                  <path class="pqr-248" d="M545,405.08c0,.07,0,.13,0,.2,0,.09,0,.18-.03.28.56,0,1.08,0,1.54.01.16,0,.31,0,.46,0,0-.1,0-.19-.01-.29,0-.07-.02-.14-.03-.21-.14,0-.28,0-.42,0-.45,0-.97,0-1.51,0Z"/>
                  <path class="pqr-285" d="M544.97,404.6c0,.09.02.18.02.28,0,.07,0,.13,0,.2.54,0,1.05,0,1.51,0,.14,0,.28,0,.42,0-.01-.07-.03-.14-.04-.21-.02-.09-.03-.19-.05-.28-.14,0-.28,0-.43,0-.44,0-.93,0-1.43.01Z"/>
                  <path class="pqr-379" d="M544.87,403.88c.03.15.06.3.07.44,0,.09.03.19.03.28.5,0,.99,0,1.43-.01.14,0,.29,0,.43,0-.02-.09-.03-.19-.06-.28-.05-.15-.12-.29-.19-.44-.13,0-.27,0-.41,0-.41,0-.85,0-1.3.01Z"/>
                  <path class="pqr-96" d="M544.7,403.28c.02.05.04.11.05.16.05.15.09.3.12.45.45,0,.89-.01,1.3-.01.14,0,.27,0,.41,0-.08-.15-.17-.29-.27-.43-.03-.05-.07-.1-.11-.15-.12,0-.24,0-.36,0-.36,0-.75,0-1.14,0Z"/>
                  <path class="pqr-400" d="M544.57,402.92c.02.06.05.13.07.19.02.05.04.11.06.16.39,0,.78,0,1.14,0,.12,0,.24,0,.36,0-.04-.05-.07-.1-.11-.15-.04-.06-.09-.12-.13-.18-.11,0-.22,0-.33,0-.34,0-.69-.01-1.05-.02Z"/>
                  <path class="pqr-372" d="M544.5,402.73c.02.06.05.13.07.19.36,0,.71.01,1.05.02.11,0,.22,0,.33,0-.04-.06-.09-.12-.13-.18-.11,0-.21,0-.32,0-.33,0-.66-.02-1.01-.03Z"/>
                  <path class="pqr-69" d="M538.78,411.26c-.11.13-.21.25-.3.37.1,0,.19,0,.29,0,.4,0,.79,0,1.18,0,.09-.14.2-.27.31-.42-.36.03-.73.05-1.12.05-.12,0-.23,0-.35,0Z"/>
                  <path class="pqr-328" d="M539.56,410.29c-.14.19-.3.39-.44.57-.11.14-.23.28-.34.41.12,0,.23,0,.35,0,.39,0,.76-.03,1.12-.05.1-.15.24-.29.35-.44.13-.19.3-.39.45-.58-.29.05-.61.1-.99.12-.17,0-.33-.02-.5-.03Z"/>
                  <path class="pqr-187" d="M540.45,409.04c-.16.22-.33.44-.47.67-.12.19-.27.39-.42.58.17.01.33.03.5.03.37-.02.69-.07.99-.12.15-.19.33-.38.5-.56.2-.21.44-.42.65-.63-.27.01-.58.03-.99.05-.23-.01-.49-.02-.75-.02Z"/>
                  <path class="pqr-384" d="M541.09,408.05c-.06.11-.13.21-.19.33-.13.22-.28.44-.44.66.26,0,.52.01.75.02.41-.02.72-.04.99-.05.21-.21.46-.41.66-.61.11-.1.23-.21.33-.31-.33-.01-.73-.02-1.2-.03-.29,0-.59-.01-.9-.02Z"/>
                  <path class="pqr-358" d="M541.33,407.48c-.02.09-.05.18-.09.26-.04.1-.09.2-.15.31.32,0,.62,0,.9.02.47,0,.86.02,1.2.03.1-.1.21-.2.3-.29.1-.07.17-.16.25-.24-.4-.02-.85-.04-1.35-.05-.33,0-.69-.02-1.06-.03Z"/>
                  <path class="pqr-320" d="M541.4,407.01c-.01.06-.02.13-.03.19,0,.1-.01.19-.03.28.37.01.73.02,1.06.03.5.01.95.03,1.35.05.08-.09.14-.19.21-.29.05-.06.09-.13.14-.19-.45-.03-.95-.05-1.47-.06-.39,0-.8-.01-1.23-.01Z"/>
                  <path class="pqr-184" d="M541.48,406.62c0,.07-.02.13-.04.2-.02.06-.04.13-.05.19.43,0,.84,0,1.23.01.52,0,1.02.03,1.47.06.05-.06.09-.13.14-.19.06-.07.11-.13.17-.2-.5-.03-1.04-.05-1.58-.06-.43,0-.87,0-1.34-.01Z"/>
                  <path class="pqr-305" d="M541.51,406.19c0,.08,0,.15-.01.23,0,.07-.01.13-.02.2.46,0,.91,0,1.34.01.55,0,1.08.03,1.58.06.05-.07.1-.14.15-.21.05-.08.1-.16.15-.24-.53-.02-1.1-.04-1.69-.04-.48,0-.98,0-1.49,0Z"/>
                  <path class="pqr-327" d="M541.54,405.88s0,.05-.01.07c-.01.08-.01.16-.02.24.51,0,1.01,0,1.49,0,.59,0,1.16.02,1.69.04.05-.08.09-.17.13-.25.01-.03.02-.06.04-.08-.55,0-1.13-.02-1.75-.02-.51,0-1.04,0-1.58,0Z"/>
                  <path class="pqr-327" d="M541.63,405.54c-.02.09-.05.18-.07.27,0,.02-.01.05-.02.07.54,0,1.07,0,1.58,0,.61,0,1.2.01,1.75.02.01-.03.03-.05.04-.08.03-.09.04-.18.06-.27-.56,0-1.14,0-1.73-.01-.52,0-1.05,0-1.61,0Z"/>
                  <path class="pqr-153" d="M541.74,405.06c-.01.07-.03.13-.04.2-.02.09-.05.19-.07.28.55,0,1.09,0,1.61,0,.59,0,1.18,0,1.73.01.02-.09.02-.18.03-.28,0-.07,0-.13,0-.2-.54,0-1.1,0-1.64,0-.52,0-1.06-.01-1.62-.01Z"/>
                  <path class="pqr-127" d="M541.82,404.58c-.01.09-.03.18-.04.28-.01.07-.02.14-.04.2.56,0,1.1,0,1.62.01.54,0,1.1,0,1.64,0,0-.07,0-.13,0-.2,0-.09-.01-.18-.02-.28-.5,0-1.02,0-1.53,0-.52,0-1.07-.01-1.62-.02Z"/>
                  <path class="pqr-290" d="M541.86,403.86c0,.15,0,.3-.01.45,0,.09-.01.19-.03.28.56,0,1.1.01,1.62.02.5,0,1.02,0,1.53,0,0-.09-.02-.18-.03-.28-.01-.15-.04-.3-.07-.44-.45,0-.91,0-1.36,0-.53-.01-1.08-.02-1.65-.03Z"/>
                  <path class="pqr-448" d="M541.86,403.23c0,.06,0,.11,0,.17,0,.16,0,.31,0,.46.57,0,1.12.02,1.65.03.45,0,.91,0,1.36,0-.03-.15-.08-.3-.12-.45-.02-.05-.03-.11-.05-.16-.39,0-.79,0-1.19,0-.53-.01-1.08-.02-1.65-.04Z"/>
                  <path class="pqr-230" d="M541.83,402.86c0,.07.02.14.02.2,0,.06,0,.11.01.17.57.01,1.12.02,1.65.04.4,0,.8,0,1.19,0-.02-.05-.04-.11-.06-.16-.02-.06-.05-.13-.07-.19-.36,0-.72-.01-1.1-.02-.54-.01-1.09-.03-1.65-.04Z"/>
                  <path class="pqr-233" d="M541.8,402.66c.01.07.02.14.03.21.56.01,1.11.03,1.65.04.37,0,.74.02,1.1.02-.02-.06-.05-.13-.07-.19-.34,0-.69-.02-1.05-.03-.54-.01-1.09-.03-1.65-.04Z"/>
                  <path class="pqr-273" d="M538.04,411.22c-.06.14-.12.29-.16.42.1,0,.21,0,.31,0,.1,0,.19,0,.29,0,.09-.12.19-.24.3-.37-.12,0-.23-.01-.35-.02-.13,0-.26-.02-.39-.03Z"/>
                  <path class="pqr-267" d="M538.44,410.19c-.06.19-.14.39-.21.57-.06.15-.14.3-.2.45.13,0,.26.02.39.03.12,0,.24.02.35.02.11-.13.23-.26.34-.41.14-.18.3-.38.44-.57-.17-.01-.34-.03-.53-.05-.2-.01-.39-.03-.59-.05Z"/>
                  <path class="pqr-298" d="M538.7,409c-.05.19-.11.38-.14.57,0,.02,0,.04-.01.06,0,.18-.05.37-.11.57.2.02.39.03.59.05.19.01.36.03.53.05.14-.19.29-.39.42-.58.15-.23.32-.45.47-.67-.26,0-.54,0-.82-.02-.29,0-.61-.01-.94-.02Z"/>
                  <path class="pqr-339" d="M538.92,408.04c0,.11-.03.22-.05.33-.04.22-.11.42-.17.63.33,0,.64.01.94.02.28,0,.55.01.82.02.16-.22.32-.44.44-.66.06-.11.14-.22.19-.33-.32,0-.65,0-1,0-.37,0-.76,0-1.17,0Z"/>
                  <path class="pqr-53" d="M538.82,407.45c.05.09.08.18.09.26h0c.02.11.01.22,0,.33.41,0,.8,0,1.17,0,.35,0,.68,0,1,0,.06-.11.11-.21.15-.31.04-.08.07-.17.09-.26-.37-.01-.76-.02-1.17-.03-.43,0-.88,0-1.34,0Z"/>
                  <path class="pqr-245" d="M538.56,407c.03.06.06.12.1.18.06.09.12.18.17.27.46,0,.9,0,1.34,0,.41,0,.8.01,1.17.03.02-.09.03-.19.03-.28.01-.06.02-.12.03-.19-.43,0-.88,0-1.33,0-.49,0-.99,0-1.51,0Z"/>
                  <path class="pqr-164" d="M538.45,406.61c.03.07.05.13.05.2,0,.06.02.13.05.19.52,0,1.02,0,1.51,0,.46,0,.9,0,1.33,0,.01-.06.03-.13.05-.19.02-.07.03-.13.04-.2-.46,0-.94,0-1.43,0-.52,0-1.06,0-1.6,0Z"/>
                  <path class="pqr-140" d="M538.21,406.19c.04.08.1.15.14.23.04.07.08.13.1.2.54,0,1.08,0,1.6,0,.49,0,.97,0,1.43,0,0-.07.01-.13.02-.2,0-.08,0-.15.01-.23-.51,0-1.04,0-1.57,0-.57,0-1.15,0-1.73,0Z"/>
                  <path class="pqr-365" d="M538.07,405.88s.01.05.02.07c.02.08.07.16.11.24.59,0,1.17,0,1.73,0,.53,0,1.06,0,1.57,0,0-.08,0-.16.02-.24,0-.02,0-.05.01-.07-.54,0-1.1,0-1.66,0-.6,0-1.2,0-1.81,0Z"/>
                  <path class="pqr-365" d="M538.07,405.53c0,.09-.02.18-.01.27,0,.03,0,.05.01.08.61,0,1.22,0,1.81,0,.56,0,1.11,0,1.66,0,0-.02,0-.05.02-.07.02-.09.05-.18.07-.27-.55,0-1.12,0-1.69,0-.61,0-1.23,0-1.86,0Z"/>
                  <path class="pqr-147" d="M538.15,405.06c-.01.07-.03.14-.03.2-.01.09-.03.18-.04.28.63,0,1.25,0,1.86,0,.57,0,1.14,0,1.69,0,.02-.09.05-.18.07-.28.01-.07.03-.13.04-.2-.56,0-1.13,0-1.71,0-.62,0-1.25,0-1.88,0Z"/>
                  <path class="pqr-127" d="M538.2,404.57c0,.09-.01.19-.02.28,0,.07-.02.14-.03.21.63,0,1.27,0,1.88,0,.58,0,1.15,0,1.71,0,.01-.07.03-.13.04-.2.02-.09.03-.18.04-.28-.56,0-1.13,0-1.72,0-.62,0-1.26,0-1.9,0Z"/>
                  <path class="pqr-127" d="M538.18,403.82c0,.16,0,.31.02.46.01.1,0,.19,0,.29.64,0,1.28,0,1.9,0,.59,0,1.16,0,1.72,0,.01-.09.02-.19.03-.28,0-.15,0-.29.01-.45-.57,0-1.16-.01-1.75-.02-.63,0-1.28-.01-1.93-.01Z"/>
                  <path class="pqr-211" d="M538.2,403.17c0,.06,0,.12,0,.18,0,.16-.01.32-.02.47.66,0,1.3,0,1.93.01.59,0,1.18.01,1.75.02,0-.15,0-.3,0-.46,0-.06,0-.11,0-.17-.57-.01-1.15-.02-1.74-.03-.63-.01-1.27-.02-1.92-.03Z"/>
                  <path class="pqr-185" d="M538.18,402.78c0,.07.01.14.01.21,0,.06,0,.12,0,.18.65,0,1.29.02,1.92.03.59,0,1.17.02,1.74.03,0-.06,0-.11-.01-.17,0-.07-.01-.13-.02-.2-.56-.01-1.14-.03-1.73-.04-.63-.01-1.27-.03-1.91-.04Z"/>
                  <path class="pqr-10" d="M538.15,402.56c.01.07.02.15.03.22.65.01,1.29.03,1.91.04.59.01,1.17.03,1.73.04,0-.07-.02-.14-.03-.21-.56-.01-1.14-.03-1.73-.05-.63-.02-1.26-.03-1.91-.05Z"/>
                  <path class="pqr-30" d="M537.18,411.18c0,.16.02.31.04.45.11,0,.23,0,.34,0,.1,0,.21,0,.31,0,.04-.13.1-.27.16-.42-.13,0-.27-.02-.41-.02-.15,0-.3-.01-.44-.02Z"/>
                  <path class="pqr-361" d="M537.04,410.11c.05.19.07.4.1.59.02.16.03.32.04.47.14,0,.29.02.44.02.14,0,.28.01.41.02.06-.14.14-.3.2-.45.07-.19.15-.38.21-.57-.2-.02-.41-.03-.64-.04-.25-.01-.5-.03-.76-.04Z"/>
                  <path class="pqr-304" d="M536.52,408.96c.07.18.15.37.25.54,0,.02.01.03.02.05.13.18.2.37.25.57.26.02.51.03.76.04.23,0,.44.02.64.04.06-.19.1-.38.11-.57,0-.02,0-.04.01-.06.02-.19.08-.38.14-.57-.33,0-.67-.01-1.01-.02-.38,0-.77-.02-1.17-.02Z"/>
                  <path class="pqr-158" d="M536.14,408.02c.05.11.09.22.14.33.09.2.16.41.24.61.4,0,.79.01,1.17.02.35,0,.69.01,1.01.02.06-.21.13-.42.17-.63.02-.11.04-.22.05-.33-.41,0-.83,0-1.27,0-.48,0-.99,0-1.5,0Z"/>
                  <path class="pqr-267" d="M535.71,407.44c.09.08.19.17.25.26t0,0c.08.11.13.22.18.33.51,0,1.02,0,1.5,0,.44,0,.87,0,1.27,0,0-.11.01-.22,0-.33h0c0-.09-.04-.18-.09-.26-.46,0-.94,0-1.43,0-.54,0-1.11,0-1.69,0Z"/>
                  <path class="pqr-165" d="M535.22,407c.06.06.13.12.18.18.09.09.21.17.3.26.58,0,1.14,0,1.69,0,.49,0,.97,0,1.43,0-.05-.09-.11-.18-.17-.27-.03-.06-.07-.12-.1-.18-.52,0-1.04,0-1.58,0-.58,0-1.17,0-1.76,0Z"/>
                  <path class="pqr-318" d="M534.94,406.62c.06.07.11.13.14.19.03.06.08.13.14.19.59,0,1.17,0,1.76,0,.53,0,1.06,0,1.58,0-.03-.06-.05-.13-.05-.19,0-.06-.03-.13-.05-.2-.54,0-1.09,0-1.65,0-.61,0-1.24,0-1.86,0Z"/>
                  <path class="pqr-119" d="M534.52,406.19c.07.08.17.15.23.23.06.07.13.13.19.2.62,0,1.24,0,1.86,0,.56,0,1.11,0,1.65,0-.03-.07-.07-.13-.1-.2-.04-.08-.1-.15-.14-.23-.59,0-1.18,0-1.77,0-.65,0-1.29,0-1.92,0Z"/>
                  <path class="pqr-305" d="M534.28,405.87s.03.05.04.08c.05.08.13.16.21.24.63,0,1.27,0,1.92,0,.59,0,1.18,0,1.77,0-.05-.08-.09-.16-.11-.24,0-.02-.02-.05-.02-.07-.61,0-1.22,0-1.83,0-.67,0-1.33,0-1.97,0Z"/>
                  <path class="pqr-305" d="M534.19,405.54c.01.08.02.17.05.25,0,.03.02.05.03.08.64,0,1.3,0,1.97,0,.61,0,1.22,0,1.83,0,0-.02-.01-.05-.01-.08,0-.09,0-.18.01-.27-.63,0-1.25,0-1.87,0-.68,0-1.35,0-2.01.01Z"/>
                  <path class="pqr-375" d="M534.15,405.09c0,.06,0,.13,0,.19.01.09.01.18.03.26.66,0,1.33-.01,2.01-.01.62,0,1.25,0,1.87,0,0-.09.03-.18.04-.28,0-.07.02-.13.03-.2-.63,0-1.27,0-1.91,0-.7,0-1.4.01-2.08.03Z"/>
                  <path class="pqr-127" d="M534.12,404.58c.01.11.01.21.02.3,0,.07,0,.14,0,.2.69-.02,1.38-.03,2.08-.03.64,0,1.28,0,1.91,0,.01-.07.02-.14.03-.21,0-.09.02-.19.02-.28-.64,0-1.29,0-1.94,0-.71,0-1.43,0-2.14.02Z"/>
                  <path class="pqr-127" d="M534.03,403.8c0,.16,0,.32.05.47.03.1.04.2.05.31.71,0,1.43-.02,2.14-.02.65,0,1.3,0,1.94,0,0-.09,0-.19,0-.29-.02-.15-.02-.3-.02-.46-.66,0-1.32,0-1.98-.01-.72,0-1.45,0-2.17,0Z"/>
                  <path class="pqr-259" d="M534.02,403.12c0,.06,0,.12,0,.19.01.17,0,.33,0,.49.72,0,1.45,0,2.17,0,.66,0,1.32.01,1.98.01,0-.16.01-.31.02-.47,0-.06,0-.12,0-.18-.65,0-1.31-.02-1.97-.03-.73-.01-1.47-.02-2.21-.02Z"/>
                  <path class="pqr-200" d="M534,402.7c0,.08,0,.16.01.23,0,.06,0,.13,0,.19.74,0,1.48,0,2.21.02.66.01,1.32.02,1.97.03,0-.06,0-.12,0-.18,0-.07,0-.14-.01-.21-.65-.01-1.3-.03-1.97-.04-.73-.02-1.47-.03-2.22-.04Z"/>
                  <path class="pqr-69" d="M533.97,402.46c.02.08.02.15.03.23.75.01,1.49.03,2.22.04.66.01,1.32.03,1.97.04,0-.07-.02-.14-.03-.22-.65-.02-1.31-.03-1.97-.05-.73-.02-1.47-.03-2.21-.05Z"/>
                  <path class="pqr-48" d="M536.38,411.14c.08.17.15.33.23.49.09,0,.18,0,.27,0,.12,0,.23,0,.34,0-.02-.15-.03-.3-.04-.45-.14,0-.29-.02-.45-.02-.12,0-.24-.01-.35-.02Z"/>
                  <path class="pqr-391" d="M535.62,410.03c.18.2.33.4.47.6.12.17.2.34.29.5.12,0,.23.01.35.02.16,0,.3.02.45.02,0-.16-.02-.31-.04-.47-.03-.2-.05-.4-.1-.59-.26-.02-.52-.03-.79-.05-.21-.01-.42-.02-.63-.03Z"/>
                  <path class="pqr-310" d="M534.31,408.94c.23.19.45.37.69.54.25.17.45.36.63.55.21.01.42.02.63.03.27.01.53.03.79.05-.05-.19-.12-.39-.25-.57,0-.02-.01-.03-.02-.05-.1-.17-.18-.35-.25-.54-.4,0-.81,0-1.23-.01-.32,0-.65,0-.99,0Z"/>
                  <path class="pqr-129" d="M533.29,408.03c.12.11.23.23.35.34.22.19.44.38.66.57.33,0,.66,0,.99,0,.42,0,.83,0,1.23.01-.08-.2-.15-.41-.24-.61-.05-.11-.09-.22-.14-.33-.51,0-1.04,0-1.58,0-.41,0-.84,0-1.27,0Z"/>
                  <path class="pqr-31" d="M532.61,407.43c.1.08.21.17.31.25.13.11.25.23.37.34.43,0,.86,0,1.27,0,.54,0,1.07,0,1.58,0-.05-.11-.1-.22-.18-.33t0,0c-.06-.09-.16-.17-.25-.26-.58,0-1.16,0-1.75,0-.45,0-.9,0-1.35,0Z"/>
                  <path class="pqr-348" d="M532.1,407c.06.06.14.12.2.18.1.09.21.17.31.26.45,0,.91,0,1.35,0,.58,0,1.17,0,1.75,0-.09-.08-.21-.17-.3-.26-.06-.06-.13-.12-.18-.18-.59,0-1.18,0-1.77,0-.45,0-.9,0-1.35,0Z"/>
                  <path class="pqr-1" d="M531.73,406.62c.06.07.13.13.19.19.05.06.12.13.18.19.45,0,.89,0,1.35,0,.59,0,1.18,0,1.77,0-.06-.06-.11-.12-.14-.19-.03-.06-.08-.13-.14-.19-.62,0-1.24,0-1.84,0-.46,0-.92,0-1.37,0Z"/>
                  <path class="pqr-232" d="M531.32,406.18c.07.08.15.16.22.23.06.07.13.13.2.2.45,0,.91,0,1.37,0,.6,0,1.22,0,1.84,0-.06-.07-.13-.13-.19-.2-.07-.08-.16-.15-.23-.23-.63,0-1.25,0-1.86,0-.46,0-.91,0-1.35,0Z"/>
                  <path class="pqr-427" d="M531.05,405.86s.04.05.06.08c.06.08.13.16.21.24.44,0,.89,0,1.35,0,.6,0,1.22,0,1.86,0-.07-.08-.16-.16-.21-.24-.01-.02-.03-.05-.04-.08-.64,0-1.27,0-1.88,0-.46,0-.91,0-1.35,0Z"/>
                  <path class="pqr-427" d="M530.87,405.55c.04.08.08.15.13.24.02.03.04.05.05.08.43,0,.88,0,1.35,0,.61,0,1.23,0,1.88,0-.01-.03-.02-.05-.03-.08-.03-.09-.04-.17-.05-.25-.66,0-1.3.01-1.93.01-.48,0-.94,0-1.39,0Z"/>
                  <path class="pqr-294" d="M530.67,405.12c.03.06.05.12.08.19.04.09.08.16.12.25.45,0,.91,0,1.39,0,.63,0,1.27,0,1.93-.01-.01-.08-.02-.17-.03-.26,0-.07,0-.13,0-.19-.69.02-1.36.03-2.02.04-.5,0-1,0-1.47-.01Z"/>
                  <path class="pqr-127" d="M530.48,404.59c.03.11.06.24.1.33.03.07.05.13.08.19.48.01.97.02,1.47.01.66,0,1.33-.03,2.02-.04,0-.06,0-.13,0-.2-.01-.09-.01-.2-.02-.3-.71,0-1.41.02-2.09.02-.52,0-1.04,0-1.54-.01Z"/>
                  <path class="pqr-127" d="M530.24,403.77c.04.16.07.31.14.47.04.1.07.23.1.34.5.01,1.02.01,1.54.01.68,0,1.38-.01,2.09-.02-.01-.11-.02-.21-.05-.31-.04-.15-.04-.31-.05-.47-.72,0-1.45,0-2.16,0-.55,0-1.09,0-1.62-.02Z"/>
                  <path class="pqr-38" d="M530.09,403.08c.01.07.02.13.04.2.04.18.07.34.11.5.53,0,1.07.01,1.62.02.72,0,1.44,0,2.16,0,0-.16,0-.32,0-.49,0-.06,0-.12,0-.19-.74,0-1.49,0-2.23-.01-.57,0-1.13-.02-1.69-.03Z"/>
                  <path class="pqr-29" d="M530.02,402.62c.01.08.02.17.04.25.01.07.02.14.03.2.56.01,1.13.02,1.69.03.74,0,1.49.01,2.23.01,0-.06,0-.13,0-.19,0-.08,0-.15-.01-.23-.75-.01-1.5-.03-2.24-.04-.57-.01-1.15-.02-1.73-.03Z"/>
                  <path class="pqr-239" d="M529.98,402.37c.02.08.03.17.04.25.58.01,1.16.02,1.73.03.75.01,1.5.03,2.24.04,0-.08-.02-.16-.03-.23-.75-.02-1.5-.03-2.25-.05-.58-.01-1.16-.03-1.74-.04Z"/>
                  <path class="pqr-263" d="M533.76,411.14c.09.16.16.33.23.48.79,0,1.57,0,2.35,0,.09,0,.18,0,.27,0-.08-.16-.14-.33-.23-.49-.12,0-.24,0-.37-.01-.74,0-1.5,0-2.26.02Z"/>
                  <path class="pqr-21" d="M533.01,410.06c.17.19.32.39.45.59.11.16.2.33.29.49.76,0,1.52-.01,2.26-.02.13,0,.25,0,.37.01-.08-.17-.17-.34-.29-.5-.14-.21-.29-.41-.47-.6-.21-.01-.43-.02-.66-.03-.63.01-1.29.03-1.95.05Z"/>
                  <path class="pqr-302" d="M531.79,408.95c.21.19.43.37.65.56.22.17.41.36.58.55.66-.02,1.32-.04,1.95-.05.22,0,.44.02.66.03-.18-.2-.38-.38-.63-.55-.24-.17-.46-.35-.69-.54-.33,0-.67,0-1.02-.01-.49.01-.99.01-1.5.02Z"/>
                  <path class="pqr-242" d="M530.83,408.03c.11.11.22.22.33.33.2.2.41.39.63.58.51,0,1.01,0,1.5-.02.35,0,.69,0,1.02.01-.23-.19-.44-.38-.66-.57-.12-.11-.24-.22-.35-.34-.43,0-.87,0-1.32,0-.37,0-.75,0-1.14,0Z"/>
                  <path class="pqr-205" d="M530.28,407.42c.07.09.15.18.22.27.11.12.22.23.32.35.39,0,.77,0,1.14,0,.44,0,.88,0,1.32,0-.12-.11-.24-.23-.37-.34-.1-.09-.21-.17-.31-.25-.45,0-.91,0-1.37,0-.32,0-.64,0-.96-.01Z"/>
                  <path class="pqr-333" d="M529.91,406.96c.05.06.1.12.15.18.07.09.15.18.23.27.32,0,.64.01.96.01.46,0,.91,0,1.37,0-.1-.08-.21-.17-.31-.26-.06-.06-.14-.12-.2-.18-.45,0-.89,0-1.32,0-.29,0-.58-.01-.86-.03Z"/>
                  <path class="pqr-203" d="M529.64,406.58c.04.07.09.13.13.2.04.06.09.13.14.19.28.02.57.03.86.03.44,0,.88,0,1.32,0-.06-.06-.13-.12-.18-.19-.05-.06-.12-.13-.19-.19-.45,0-.89,0-1.31,0-.27,0-.53-.02-.78-.03Z"/>
                  <path class="pqr-430" d="M529.35,406.15c.05.08.1.16.16.23.05.07.09.13.14.2.25.02.51.03.78.03.42,0,.86,0,1.31,0-.06-.07-.14-.13-.2-.2-.07-.08-.15-.16-.22-.23-.44,0-.86,0-1.26,0-.24,0-.48-.01-.7-.03Z"/>
                  <path class="pqr-420" d="M529.16,405.84s.03.05.04.07c.05.08.1.16.15.24.23.01.46.02.7.03.41,0,.83,0,1.26,0-.07-.08-.15-.16-.21-.24-.02-.03-.04-.05-.06-.08-.43,0-.85,0-1.24-.01-.22,0-.44,0-.65-.01Z"/>
                  <path class="pqr-436" d="M528.97,405.43c.05.11.1.22.14.33.01.02.03.05.04.07.21,0,.43.01.65.01.39,0,.81,0,1.24.01-.02-.03-.04-.05-.05-.08-.05-.09-.09-.15-.13-.24-.45,0-.88-.02-1.29-.04-.22,0-.42-.04-.61-.07Z"/>
                  <path class="pqr-355" d="M528.71,404.89c.04.07.07.15.11.22.05.11.1.21.15.32.19.03.39.06.61.07.41.02.85.03,1.29.04-.04-.08-.08-.15-.12-.25-.03-.07-.06-.12-.08-.19-.48-.01-.94-.04-1.38-.09-.21-.02-.39-.07-.57-.13Z"/>
                  <path class="pqr-221" d="M528.44,404.38c.06.1.11.2.16.3.04.07.07.14.11.22.18.06.36.11.57.13.44.05.91.07,1.38.09-.03-.06-.05-.12-.08-.19-.04-.09-.07-.22-.1-.33-.5-.01-.99-.03-1.47-.06-.21-.04-.4-.09-.57-.15Z"/>
                  <path class="pqr-12" d="M527.99,403.61c.1.16.19.31.28.46.06.1.12.2.17.3.18.06.36.11.57.15.47.03.96.05,1.47.06-.03-.11-.06-.24-.1-.34-.06-.16-.1-.31-.14-.47-.53,0-1.06-.02-1.57-.04-.26-.03-.47-.08-.68-.12Z"/>
                  <path class="pqr-367" d="M527.59,402.95c.04.06.07.12.11.18.1.17.19.33.29.49.21.04.43.09.68.12.51.02,1.04.03,1.57.04-.04-.16-.06-.32-.11-.5-.02-.06-.03-.13-.04-.2-.56-.01-1.12-.03-1.67-.06-.31-.01-.57-.04-.84-.08Z"/>
                  <path class="pqr-364" d="M527.34,402.54c.05.07.09.15.13.22.04.06.07.12.11.18.26.03.53.06.84.08.55.02,1.11.04,1.67.06-.01-.07-.02-.14-.03-.2-.01-.08-.02-.17-.04-.25-.58-.01-1.15-.02-1.72-.04-.33,0-.65-.03-.96-.04Z"/>
                  <path class="pqr-422" d="M527.21,402.31c.05.07.09.15.14.22.31.02.63.03.96.04.57.02,1.14.03,1.72.04-.01-.08-.03-.17-.04-.25-.58-.01-1.16-.03-1.74-.04-.35,0-.69-.01-1.03-.02Z"/>
                  <path class="pqr-286" d="M529.28,411.18c.02.15.03.3.05.45.76,0,1.53,0,2.31,0,.78,0,1.57,0,2.35,0-.07-.16-.15-.32-.23-.48-.76,0-1.52.01-2.26.02-.74,0-1.48.01-2.22.02Z"/>
                  <path class="pqr-101" d="M529.1,410.17c.05.19.08.38.11.56.03.15.05.3.07.45.73,0,1.48-.02,2.22-.02.74,0,1.5-.01,2.26-.02-.09-.16-.18-.33-.29-.49-.13-.2-.28-.4-.45-.59-.66.02-1.33.04-1.97.05-.64.01-1.3.03-1.95.06Z"/>
                  <path class="pqr-143" d="M528.77,408.99c.06.21.11.42.17.62.06.18.11.37.16.55.65-.02,1.31-.04,1.95-.06.64-.01,1.31-.03,1.97-.05-.17-.19-.36-.38-.58-.55-.22-.18-.44-.37-.65-.56-.51,0-1.02,0-1.52.02-.5.01-1,.02-1.5.02Z"/>
                  <path class="pqr-160" d="M528.51,408.03c.03.11.06.22.09.33.06.21.11.42.17.63.5,0,1-.01,1.5-.02.5-.01,1.01-.02,1.52-.02-.21-.19-.42-.38-.63-.58-.11-.11-.22-.22-.33-.33-.39,0-.77,0-1.15,0-.38,0-.77,0-1.17,0Z"/>
                  <path class="pqr-168" d="M528.35,407.39c.02.1.05.2.07.31.03.11.06.22.09.34.39,0,.78,0,1.17,0,.38,0,.77,0,1.15,0-.11-.11-.22-.23-.32-.35-.07-.09-.15-.18-.22-.27-.32,0-.64-.02-.96-.02-.32,0-.65-.01-.98-.02Z"/>
                  <path class="pqr-422" d="M528.22,406.89c.02.06.03.13.05.19.03.1.05.2.08.3.33,0,.65.01.98.02.32,0,.64.01.96.02-.07-.09-.15-.18-.23-.27-.05-.06-.1-.12-.15-.18-.28-.02-.57-.03-.85-.04-.17,0-.33-.01-.5-.02-.11,0-.23,0-.34-.01Z"/>
                  <path class="pqr-334" d="M528.14,406.5c.02.07.03.13.05.2.02.06.02.13.04.19.11,0,.23,0,.34.01.17,0,.34.01.5.02.28.01.56.03.85.04-.05-.06-.09-.12-.14-.19-.04-.06-.09-.13-.13-.2-.25-.02-.5-.04-.75-.05-.15,0-.3-.01-.45-.02-.1,0-.2,0-.3-.01Z"/>
                  <path class="pqr-405" d="M528.02,406.09c.02.07.04.14.06.22.02.07.04.13.05.2.1,0,.2.01.3.01.15,0,.3.01.45.02.25.01.5.03.75.05-.04-.07-.09-.13-.14-.2-.05-.08-.11-.15-.16-.23-.23-.01-.45-.03-.66-.03-.22,0-.44-.02-.66-.03Z"/>
                  <path class="pqr-374" d="M527.96,405.81s0,.04,0,.07c.02.07.04.14.06.21.22,0,.44.02.66.03.21,0,.44.02.66.03-.05-.08-.1-.16-.15-.24-.01-.02-.03-.05-.04-.07-.21,0-.42-.01-.61-.02-.12,0-.23,0-.35,0-.08,0-.16,0-.24,0Z"/>
                  <path class="pqr-71" d="M527.86,405.28c.03.14.06.3.09.46,0,.02,0,.04,0,.07.08,0,.16,0,.24,0,.11,0,.23,0,.35,0,.19,0,.4,0,.61.02-.01-.02-.03-.05-.04-.07-.05-.11-.1-.22-.14-.33-.19-.03-.37-.07-.56-.09-.11-.01-.22-.03-.32-.04-.07,0-.15-.02-.23-.03Z"/>
                  <path class="pqr-255" d="M527.66,404.6c.03.08.07.18.1.27.04.13.08.27.11.41.08.01.15.02.23.03.11.01.21.03.32.04.18.02.37.05.56.09-.05-.11-.1-.21-.15-.32-.04-.08-.07-.15-.11-.22-.18-.06-.34-.12-.52-.16-.16-.04-.35-.09-.54-.14Z"/>
                  <path class="pqr-193" d="M527.38,404.05c.07.1.12.2.17.31.03.07.08.16.11.24.19.05.38.11.54.14.17.04.34.1.52.16-.04-.07-.07-.14-.11-.22-.05-.1-.11-.2-.16-.3-.18-.06-.34-.12-.52-.16-.1-.03-.21-.06-.33-.1-.07-.02-.15-.04-.22-.07Z"/>
                  <path class="pqr-439" d="M526.69,403.36c.16.14.33.28.46.42.09.09.16.17.23.27.07.02.14.04.22.07.12.03.23.07.33.1.18.05.34.11.52.16-.06-.1-.11-.2-.17-.3-.09-.15-.18-.3-.28-.46-.21-.04-.41-.09-.64-.13-.14-.02-.26-.05-.4-.08-.09-.02-.17-.03-.25-.05Z"/>
                  <path class="pqr-91" d="M525.94,402.77c.07.05.14.1.21.15.19.14.38.29.54.43.08.02.17.03.25.05.14.03.26.06.4.08.23.04.43.08.64.13-.1-.16-.19-.32-.29-.49-.04-.06-.07-.12-.11-.18-.26-.03-.53-.07-.82-.09-.28-.03-.56-.06-.84-.08Z"/>
                  <path class="pqr-17" d="M525.44,402.45c.09.06.19.12.28.18.08.05.15.1.22.15.28.03.56.06.84.08.29.02.55.05.82.09-.04-.06-.07-.12-.11-.18-.05-.07-.09-.15-.13-.22-.31-.02-.62-.04-.95-.05-.32-.01-.64-.03-.96-.04Z"/>
                  <path class="pqr-399" d="M525.15,402.27c.1.06.19.12.29.18.32.01.64.03.96.04.32.01.64.03.95.05-.05-.07-.09-.15-.14-.22-.34,0-.69-.01-1.03-.02-.34,0-.68-.01-1.02-.02Z"/>
                  <path class="pqr-171" d="M526.28,411.21c0,.14-.02.29-.03.43.28,0,.57,0,.86,0,.72,0,1.46,0,2.22,0-.02-.15-.03-.3-.05-.45-.73,0-1.45.02-2.13.03-.29,0-.58,0-.86,0Z"/>
                  <path class="pqr-131" d="M526.34,410.23c-.01.18-.02.37-.03.55,0,.15-.02.29-.03.44.28,0,.57,0,.86,0,.68,0,1.4-.02,2.13-.03-.02-.15-.04-.3-.07-.45-.03-.19-.07-.38-.11-.56-.65.02-1.28.04-1.88.06-.29,0-.59,0-.88,0Z"/>
                  <path class="pqr-314" d="M526.41,409.02c0,.22-.02.44-.04.66-.01.18-.02.37-.03.55.29,0,.58,0,.88,0,.6-.01,1.23-.04,1.88-.06-.05-.19-.1-.37-.16-.55-.06-.21-.11-.41-.17-.62-.5,0-.99.01-1.47.03-.3,0-.59,0-.88,0Z"/>
                  <path class="pqr-182" d="M526.44,408.03c0,.11,0,.22,0,.34,0,.21-.01.43-.02.65.29,0,.59,0,.88,0,.48-.01.97-.02,1.47-.03-.06-.21-.11-.42-.17-.63-.03-.11-.06-.22-.09-.33-.39,0-.78,0-1.17,0-.3,0-.61,0-.91,0Z"/>
                  <path class="pqr-168" d="M526.5,407.38c-.03.11-.06.21-.06.32,0,.11,0,.22,0,.33.3,0,.61,0,.91,0,.38,0,.77,0,1.17,0-.03-.11-.06-.22-.09-.34-.02-.1-.04-.21-.07-.31-.33,0-.66,0-.98,0-.29,0-.58,0-.87,0Z"/>
                  <path class="pqr-344" d="M526.59,406.87c-.01.07-.03.14-.03.2,0,.1-.04.21-.06.31.29,0,.58,0,.87,0,.33,0,.65,0,.98,0-.02-.1-.05-.2-.08-.3-.02-.06-.03-.13-.05-.19-.28-.01-.56-.03-.85-.03-.26,0-.51,0-.78,0Z"/>
                  <path class="pqr-64" d="M526.65,406.46c-.01.07-.03.14-.03.2,0,.07-.01.13-.03.2.26,0,.52,0,.78,0,.29,0,.57.02.85.03-.02-.06-.02-.13-.04-.19-.01-.07-.03-.13-.05-.2-.25-.01-.5-.03-.77-.03-.23,0-.47,0-.72,0Z"/>
                  <path class="pqr-405" d="M526.72,406.06c-.02.07-.04.14-.04.21,0,.06-.02.13-.03.2.25,0,.49,0,.72,0,.26,0,.52.02.77.03-.02-.07-.04-.13-.05-.2-.02-.07-.04-.15-.06-.22-.22,0-.44-.02-.66-.02-.2,0-.42,0-.64,0Z"/>
                  <path class="pqr-429" d="M526.76,405.79s0,.04,0,.06c0,.07-.02.13-.03.2.22,0,.43,0,.64,0,.22,0,.44.01.66.02-.02-.07-.04-.14-.06-.21,0-.02,0-.04,0-.07-.2,0-.4,0-.61-.01-.19,0-.38,0-.59,0Z"/>
                  <path class="pqr-389" d="M526.69,405.2c.03.17.06.35.07.53,0,.02,0,.04,0,.06.21,0,.4,0,.59,0,.21,0,.42,0,.61.01,0-.02,0-.04,0-.07-.02-.16-.06-.32-.09-.46-.18-.02-.37-.05-.57-.07-.19,0-.39-.01-.6-.01Z"/>
                  <path class="pqr-91" d="M526.48,404.43c.03.09.07.19.1.29.04.15.08.31.11.47.21,0,.41,0,.6.01.2.02.39.04.57.07-.03-.14-.07-.29-.11-.41-.03-.09-.07-.19-.1-.27-.19-.05-.37-.1-.51-.12-.21-.02-.43-.03-.66-.04Z"/>
                  <path class="pqr-356" d="M526.17,403.89c.09.09.16.18.22.3.03.07.07.16.1.25.23,0,.45.02.66.04.15.02.33.07.51.12-.03-.08-.08-.17-.11-.24-.05-.11-.1-.21-.17-.31-.18-.06-.36-.12-.52-.15-.22,0-.45-.01-.69-.01Z"/>
                  <path class="pqr-271" d="M525.31,403.23c.21.14.41.29.56.41.11.09.21.16.3.25.24,0,.46,0,.69.01.16.03.34.09.52.15-.07-.1-.14-.18-.23-.27-.13-.14-.3-.28-.46-.42-.21-.04-.42-.09-.66-.12-.23,0-.47,0-.72,0Z"/>
                  <path class="pqr-316" d="M524.35,402.68c.09.05.18.09.27.14.24.13.48.28.69.42.24,0,.48,0,.72,0,.24.03.44.08.66.12-.16-.14-.35-.29-.54-.43-.07-.05-.14-.1-.21-.15-.28-.03-.56-.05-.84-.07-.25-.01-.49-.02-.75-.03Z"/>
                  <path class="pqr-76" d="M523.72,402.39c.12.05.24.1.35.15.1.04.19.09.28.13.25,0,.5.02.75.03.28.01.56.04.84.07-.07-.05-.15-.1-.22-.15-.09-.06-.18-.12-.28-.18-.32-.01-.64-.03-.95-.04-.25,0-.51-.01-.76-.02Z"/>
                  <path class="pqr-229" d="M523.37,402.23c.11.05.23.1.35.16.26,0,.51.01.76.02.32,0,.63.02.95.04-.09-.06-.19-.12-.29-.18-.34,0-.68-.01-1.02-.02-.26,0-.51-.01-.76-.02Z"/>
                  <path class="pqr-199" d="M522.73,411.24c0,.15,0,.29-.01.43.9-.01,1.8-.03,2.7-.03.27,0,.55,0,.84,0,0-.14.02-.28.03-.43-.28,0-.56,0-.84,0-.91,0-1.81.01-2.71.03Z"/>
                  <path class="pqr-434" d="M522.67,410.26c.01.18.03.37.04.55.01.15.02.29.02.44.9-.01,1.8-.02,2.71-.03.28,0,.56,0,.84,0,0-.14.02-.29.03-.44,0-.18.02-.36.03-.55-.29,0-.58,0-.86,0-.93,0-1.87.01-2.81.02Z"/>
                  <path class="pqr-426" d="M522.63,409.05c.02.22.04.43.04.65,0,.19,0,.37.01.55.94-.01,1.87-.02,2.81-.02.28,0,.57,0,.86,0,.01-.18.02-.37.03-.55.01-.22.03-.44.04-.66-.29,0-.59,0-.88,0-.97,0-1.94.01-2.91.02Z"/>
                  <path class="pqr-131" d="M522.5,408.06c.01.11.04.23.05.34.03.22.06.43.08.65.97,0,1.93-.02,2.91-.02.29,0,.59,0,.88,0,0-.22.02-.43.02-.65,0-.11,0-.23,0-.34-.3,0-.61,0-.91,0-1.01,0-2.02.01-3.03.02Z"/>
                  <path class="pqr-168" d="M522.61,407.41c-.06.1-.15.21-.16.32,0,.11.03.22.04.34,1.01,0,2.02-.02,3.03-.02.3,0,.61,0,.91,0,0-.11,0-.22,0-.33,0-.11.03-.21.06-.32-.29,0-.59,0-.88,0-.98,0-1.99.01-3,.02Z"/>
                  <path class="pqr-340" d="M522.96,406.89c-.03.07-.09.14-.13.2-.05.1-.16.21-.23.31,1.01,0,2.03-.02,3-.02.29,0,.59,0,.88,0,.03-.11.06-.21.06-.31,0-.07.02-.14.03-.2-.26,0-.53,0-.81,0-.91,0-1.86.01-2.82.02Z"/>
                  <path class="pqr-262" d="M523.12,406.49c-.03.07-.08.14-.08.2,0,.06-.04.13-.08.2.97-.01,1.91-.02,2.82-.02.27,0,.54,0,.81,0,.01-.07.03-.13.03-.2,0-.07.02-.14.03-.2-.25,0-.5,0-.76,0-.86,0-1.8.01-2.77.03Z"/>
                  <path class="pqr-148" d="M523.42,406.08c-.05.07-.13.14-.17.21-.03.06-.1.13-.13.2.97-.01,1.91-.03,2.77-.03.26,0,.51,0,.76,0,.01-.07.03-.14.03-.2,0-.07.02-.14.04-.21-.22,0-.45,0-.69,0-.79,0-1.67,0-2.61.02Z"/>
                  <path class="pqr-65" d="M523.58,405.8s-.01.04-.02.06c-.02.07-.09.14-.14.21.94-.01,1.82-.02,2.61-.02.24,0,.47,0,.69,0,.02-.07.03-.13.03-.2,0-.02,0-.04,0-.06-.21,0-.42,0-.65,0-.75,0-1.61,0-2.53.01Z"/>
                  <path class="pqr-115" d="M523.48,405.25c.04.16.1.32.11.49,0,.02,0,.04,0,.06.92,0,1.78-.01,2.53-.01.23,0,.44,0,.65,0,0-.02,0-.04,0-.06-.01-.18-.04-.36-.07-.53-.21,0-.43,0-.66,0-.77,0-1.63.02-2.55.05Z"/>
                  <path class="pqr-286" d="M523.15,404.52c.04.09.1.19.14.28.06.14.14.29.19.45.92-.03,1.78-.05,2.55-.05.23,0,.45,0,.66,0-.03-.17-.07-.33-.11-.47-.03-.1-.06-.2-.1-.29-.23,0-.47-.01-.71-.01-.81,0-1.69.05-2.63.1Z"/>
                  <path class="pqr-332" d="M522.82,403.96c.08.09.16.18.2.31.03.08.08.16.13.25.93-.05,1.82-.1,2.63-.1.24,0,.48,0,.71.01-.03-.09-.07-.17-.1-.25-.05-.12-.13-.21-.22-.3-.24,0-.48,0-.72,0-.82,0-1.7.04-2.62.07Z"/>
                  <path class="pqr-49" d="M521.98,403.26c.2.15.42.31.54.45.1.09.22.16.3.26.92-.03,1.8-.07,2.62-.07.25,0,.49,0,.72,0-.09-.09-.19-.16-.3-.25-.15-.13-.34-.27-.56-.41-.24,0-.49,0-.74,0-.84,0-1.7.01-2.59.03Z"/>
                  <path class="pqr-351" d="M521.01,402.66c.09.05.18.1.26.15.23.14.51.3.71.45.88-.01,1.75-.03,2.59-.03.25,0,.5,0,.74,0-.21-.14-.45-.29-.69-.42-.09-.05-.18-.09-.27-.14-.25,0-.5-.01-.76-.02-.85-.01-1.72,0-2.58,0Z"/>
                  <path class="pqr-149" d="M520.43,402.34c.1.06.21.11.31.17.09.05.18.1.27.15.87,0,1.74-.02,2.58,0,.25,0,.51.01.76.02-.09-.05-.19-.09-.28-.13-.11-.05-.23-.1-.35-.15-.26,0-.51,0-.77-.01-.84-.02-1.69-.02-2.52-.03Z"/>
                  <path class="pqr-256" d="M520.15,402.17c.08.06.19.12.29.17.83,0,1.68.02,2.52.03.25,0,.51,0,.77.01-.12-.05-.23-.1-.35-.16-.25,0-.51-.01-.76-.02-.84-.02-1.66-.03-2.47-.05Z"/>
                  <path class="pqr-382" d="M516.18,411.4c0,.15.03.3.02.45,1.3-.05,2.59-.09,3.82-.12.9-.02,1.8-.04,2.7-.06.01-.14.02-.29.01-.43-.9.01-1.8.03-2.71.05-1.24.03-2.54.07-3.84.11Z"/>
                  <path class="pqr-279" d="M516.06,410.38c.01.19.06.38.08.57.01.15.04.3.05.45,1.3-.04,2.6-.08,3.84-.11.91-.02,1.81-.04,2.71-.05,0-.15-.01-.29-.02-.44-.01-.18-.03-.36-.04-.55-.94.01-1.87.02-2.81.04-1.26.02-2.54.05-3.81.08Z"/>
                  <path class="pqr-101" d="M515.92,409.15c.02.22.08.45.08.67,0,.19.04.38.05.57,1.27-.03,2.55-.06,3.81-.08.93-.02,1.87-.03,2.81-.04-.01-.18-.02-.37-.01-.55,0-.22-.01-.44-.04-.65-.97,0-1.93.02-2.91.03-1.27.02-2.55.04-3.8.06Z"/>
                  <path class="pqr-186" d="M515.77,408.13c0,.12.03.23.05.35.03.22.09.44.11.67,1.24-.02,2.52-.05,3.8-.06.97-.01,1.94-.02,2.91-.03-.02-.22-.05-.43-.08-.65-.01-.11-.04-.23-.05-.34-1.01,0-2.01.02-3,.03-1.28.01-2.53.03-3.73.04Z"/>
                  <path class="pqr-160" d="M515.83,407.48c-.04.1-.09.2-.09.29,0,.12.02.23.03.35,1.2-.01,2.45-.03,3.73-.04.99,0,1.99-.02,3-.03-.01-.11-.04-.22-.04-.34,0-.1.09-.21.16-.32-1.01,0-2.03.02-3.03.03-1.29.01-2.55.03-3.76.04Z"/>
                  <path class="pqr-292" d="M516.07,406.99c-.02.06-.06.13-.09.19-.04.1-.12.2-.16.3,1.21-.01,2.47-.03,3.76-.04.99-.01,2.01-.02,3.03-.03.06-.1.18-.21.23-.31.03-.07.09-.14.13-.2-.97.01-1.96.02-2.97.04-1.31.02-2.64.04-3.93.06Z"/>
                  <path class="pqr-382" d="M516.16,406.6c-.02.06-.05.13-.05.2,0,.06-.03.13-.04.19,1.29-.02,2.62-.04,3.93-.06,1.01-.01,2-.03,2.97-.04.03-.07.08-.13.08-.2,0-.07.05-.14.08-.2-.97.01-1.99.03-3,.05-1.32.02-2.65.04-3.96.07Z"/>
                  <path class="pqr-156" d="M516.37,406.19c-.03.07-.09.15-.12.22-.03.06-.07.13-.09.2,1.31-.02,2.64-.05,3.96-.07,1.02-.02,2.03-.03,3-.05.03-.07.1-.14.13-.2.04-.07.12-.14.17-.21-.94.01-1.93.03-2.96.04-1.33.02-2.72.04-4.09.07Z"/>
                  <path class="pqr-345" d="M516.48,405.9s0,.04-.01.07c-.02.07-.06.15-.09.22,1.37-.03,2.76-.05,4.09-.07,1.03-.01,2.02-.03,2.96-.04.05-.07.12-.14.14-.21,0-.02.01-.04.02-.06-.92,0-1.92.02-2.95.03-1.34.02-2.75.04-4.15.07Z"/>
                  <path class="pqr-345" d="M516.43,405.43c.02.13.06.27.06.4,0,.02,0,.04,0,.07,1.4-.02,2.81-.05,4.15-.07,1.03-.01,2.02-.03,2.95-.03,0-.02,0-.04,0-.06,0-.17-.07-.33-.11-.49-.92.03-1.91.06-2.93.08-1.33.02-2.73.06-4.12.1Z"/>
                  <path class="pqr-435" d="M516.24,404.78c.02.09.05.18.08.26.03.13.08.26.1.39,1.39-.04,2.8-.08,4.12-.1,1.02-.02,2.01-.05,2.93-.08-.04-.16-.13-.31-.19-.45-.04-.1-.1-.2-.14-.28-.93.05-1.92.11-2.92.14-1.3.03-2.65.08-3.99.12Z"/>
                  <path class="pqr-403" d="M516.09,404.18c.03.11.07.23.09.35.02.08.04.17.06.25,1.33-.05,2.68-.09,3.99-.12,1-.02,1.98-.08,2.92-.14-.04-.09-.09-.17-.13-.25-.04-.12-.12-.22-.2-.31-.92.03-1.88.07-2.85.1-1.27.03-2.58.07-3.87.12Z"/>
                  <path class="pqr-377" d="M515.73,403.35c.09.17.18.33.22.5.05.1.11.21.14.32,1.29-.05,2.6-.09,3.87-.12.98-.02,1.93-.06,2.85-.1-.08-.09-.19-.17-.3-.26-.11-.14-.34-.3-.54-.45-.88.01-1.78.03-2.68.04-1.17.01-2.39.03-3.57.05Z"/>
                  <path class="pqr-377" d="M515.28,402.67c.04.06.08.12.12.18.11.17.24.33.33.5,1.18-.02,2.4-.04,3.57-.05.9,0,1.8-.03,2.68-.04-.2-.15-.48-.31-.71-.45-.08-.05-.18-.1-.26-.15-.87,0-1.73.02-2.56.02-1.08,0-2.15,0-3.17,0Z"/>
                  <path class="pqr-377" d="M515.04,402.28c.04.07.09.14.13.21.04.06.08.12.12.18,1.03,0,2.1,0,3.17,0,.83,0,1.69,0,2.56-.02-.09-.05-.18-.1-.27-.15-.1-.06-.22-.11-.31-.17-.83,0-1.66-.01-2.44-.03-1.02-.01-2.01-.03-2.95-.04Z"/>
                  <path class="pqr-31" d="M514.93,402.06c.03.07.07.14.11.21.94.01,1.93.02,2.95.04.79.01,1.61.02,2.44.03-.1-.06-.2-.11-.29-.17-.81-.02-1.59-.03-2.36-.05-1-.02-1.95-.04-2.86-.06Z"/>
                  <path class="pqr-257" d="M510.58,411.6c0,.16.02.32.02.47.57-.02,1.16-.05,1.77-.07,1.25-.05,2.55-.1,3.84-.15,0-.15-.01-.3-.02-.45-1.3.04-2.59.09-3.82.13-.61.02-1.21.05-1.78.07Z"/>
                  <path class="pqr-116" d="M510.51,410.54c0,.2.03.39.04.59,0,.16.02.32.03.47.57-.02,1.17-.05,1.78-.07,1.23-.05,2.52-.09,3.82-.13,0-.15-.04-.3-.05-.45-.02-.19-.06-.38-.08-.57-1.27.03-2.51.07-3.7.1-.64.02-1.26.04-1.85.05Z"/>
                  <path class="pqr-432" d="M510.45,409.26c.01.23.03.46.03.7,0,.2.02.39.03.59.59-.02,1.22-.04,1.85-.05,1.18-.04,2.43-.07,3.7-.1-.01-.19-.05-.38-.05-.57,0-.23-.06-.45-.08-.67-1.24.02-2.44.05-3.56.07-.67.01-1.31.03-1.91.04Z"/>
                  <path class="pqr-252" d="M510.38,408.19c0,.12.01.24.02.37.01.23.04.46.05.7.6-.01,1.24-.03,1.91-.04,1.12-.02,2.32-.05,3.56-.07-.02-.22-.09-.44-.11-.67-.01-.12-.04-.23-.05-.35-1.2.01-2.34.03-3.41.04-.7,0-1.36.02-1.98.02Z"/>
                  <path class="pqr-60" d="M510.39,407.55c0,.09-.02.19-.02.28,0,.12,0,.24.01.37.62,0,1.29-.02,1.98-.02,1.07-.01,2.21-.03,3.41-.04,0-.12-.03-.23-.03-.35,0-.1.05-.2.09-.29-1.21.01-2.37.03-3.47.04-.69,0-1.35.02-1.97.02Z"/>
                  <path class="pqr-73" d="M510.44,407.08c0,.06-.01.12-.02.19,0,.09-.03.19-.03.28.62,0,1.28-.01,1.97-.02,1.1-.01,2.26-.03,3.47-.04.04-.1.11-.2.16-.3.03-.07.07-.13.09-.19-1.29.02-2.55.04-3.71.06-.67,0-1.32.02-1.92.03Z"/>
                  <path class="pqr-175" d="M510.46,406.7c0,.06-.01.13-.01.19s0,.12-.01.19c.61,0,1.25-.02,1.92-.03,1.16-.02,2.42-.04,3.71-.06.02-.06.04-.13.04-.19,0-.06.03-.13.05-.2-1.31.02-2.58.05-3.8.07-.66.01-1.3.02-1.9.03Z"/>
                  <path class="pqr-117" d="M510.5,406.3c0,.07-.02.14-.02.21,0,.06-.02.13-.02.19.6,0,1.24-.02,1.9-.03,1.22-.02,2.5-.04,3.8-.07.02-.06.06-.13.09-.2.03-.07.09-.15.12-.22-1.37.03-2.73.05-4.01.07-.64.01-1.26.02-1.86.03Z"/>
                  <path class="pqr-9" d="M510.53,406.02s0,.04,0,.07c0,.07-.02.14-.02.21.59-.01,1.21-.02,1.86-.03,1.28-.02,2.64-.05,4.01-.07.03-.07.08-.15.09-.22,0-.02.01-.04.01-.07-1.4.02-2.8.05-4.12.08-.63.01-1.24.02-1.83.04Z"/>
                  <path class="pqr-9" d="M510.48,405.58c.01.12.05.25.05.37,0,.02,0,.04,0,.07.59-.01,1.2-.02,1.83-.04,1.32-.03,2.72-.05,4.12-.08,0-.02,0-.04,0-.07,0-.14-.03-.27-.06-.4-1.39.04-2.78.08-4.07.12-.66,0-1.29.02-1.88.03Z"/>
                  <path class="pqr-171" d="M510.33,404.94c.02.09.05.18.07.27.02.12.07.25.08.37.59-.01,1.21-.02,1.88-.03,1.29-.03,2.67-.08,4.07-.12-.02-.13-.07-.26-.1-.39-.02-.09-.06-.18-.08-.26-1.33.05-2.65.1-3.88.14-.72,0-1.4,0-2.03.01Z"/>
                  <path class="pqr-239" d="M510.2,404.31c.01.12.05.24.07.36.02.09.05.18.07.27.63,0,1.31-.01,2.03-.01,1.23-.04,2.55-.09,3.88-.14-.02-.09-.05-.17-.06-.25-.02-.12-.05-.24-.09-.35-1.29.05-2.56.09-3.73.14-.76,0-1.49,0-2.16,0Z"/>
                  <path class="pqr-308" d="M510.08,403.4c.03.19.08.37.08.56,0,.12.02.24.04.36.67,0,1.4,0,2.16,0,1.18-.04,2.44-.09,3.73-.14-.03-.11-.09-.22-.14-.32-.04-.17-.13-.33-.22-.5-1.18.02-2.33.04-3.37.07-.83,0-1.6-.01-2.28-.02Z"/>
                  <path class="pqr-401" d="M509.89,402.64c.01.07.03.13.05.2.04.19.11.37.14.56.69,0,1.45,0,2.28.02,1.04-.03,2.19-.05,3.37-.07-.09-.17-.22-.33-.33-.5-.04-.06-.08-.12-.12-.18-1.03,0-2.01,0-2.92,0-.9-.01-1.72-.02-2.47-.03Z"/>
                  <path class="pqr-401" d="M509.81,402.21c0,.08.03.16.04.24,0,.07.03.13.04.2.74,0,1.57.02,2.47.03.91,0,1.9,0,2.92,0-.04-.06-.08-.12-.12-.18-.04-.07-.09-.14-.13-.21-.94-.01-1.84-.02-2.68-.03-.93-.02-1.79-.03-2.55-.04Z"/>
                  <path class="pqr-308" d="M509.79,401.97c0,.08.02.16.02.24.76.01,1.62.03,2.55.04.84,0,1.73.02,2.68.03-.04-.07-.08-.14-.11-.21-.91-.02-1.77-.03-2.57-.05-.95-.02-1.81-.03-2.57-.05Z"/>
                  <path class="pqr-133" d="M507.42,411.73c0,.16.02.32.02.49.47-.02.98-.04,1.5-.07.53-.02,1.08-.05,1.65-.07,0-.16-.01-.32-.02-.47-.57.02-1.13.04-1.66.07-.53.02-1.03.04-1.5.06Z"/>
                  <path class="pqr-361" d="M507.35,410.64c0,.2.03.4.04.6,0,.16.02.32.03.49.47-.02.97-.04,1.5-.06.53-.02,1.08-.04,1.66-.07,0-.16-.02-.32-.03-.47-.01-.2-.03-.39-.04-.59-.59.02-1.16.04-1.69.05-.53.02-1.02.03-1.47.05Z"/>
                  <path class="pqr-362" d="M507.29,409.33c.01.24.03.48.03.71,0,.2.02.4.03.6.45-.02.94-.03,1.47-.05.53-.02,1.1-.04,1.69-.05,0-.2-.03-.39-.03-.59,0-.23-.02-.46-.03-.7-.6.01-1.17.03-1.7.04-.53.01-1.02.02-1.46.03Z"/>
                  <path class="pqr-186" d="M507.22,408.24c0,.13.01.25.02.38.01.24.04.48.05.71.44-.01.93-.02,1.46-.03.53-.01,1.1-.02,1.7-.04-.01-.23-.04-.46-.05-.7,0-.12-.02-.24-.02-.37-.62,0-1.2.02-1.73.02-.53,0-1.01.01-1.43.02Z"/>
                  <path class="pqr-60" d="M507.23,407.58c0,.09-.02.18-.02.28,0,.13,0,.25.01.38.42,0,.9-.01,1.43-.02.53,0,1.11-.01,1.73-.02,0-.12-.01-.24-.01-.37,0-.09.01-.19.02-.28-.62,0-1.2.01-1.73.02-.53,0-1.01.01-1.43.02Z"/>
                  <path class="pqr-401" d="M507.27,407.12c0,.06-.01.12-.02.18,0,.09-.02.18-.03.28.42,0,.9-.01,1.43-.02.53,0,1.11-.01,1.73-.02,0-.09.02-.19.03-.28,0-.06.01-.12.02-.19-.61,0-1.18.02-1.71.03-.53,0-1.02.02-1.46.02Z"/>
                  <path class="pqr-114" d="M507.3,406.75c0,.06-.01.12-.01.19s0,.12-.01.18c.44,0,.93-.01,1.46-.02.53,0,1.1-.02,1.71-.03,0-.06.01-.12.01-.19s0-.13.01-.19c-.6,0-1.18.02-1.71.03-.53,0-1.02.02-1.46.03Z"/>
                  <path class="pqr-55" d="M507.34,406.36c0,.07-.02.14-.02.21,0,.06-.02.12-.02.19.44,0,.93-.02,1.46-.03.53,0,1.1-.02,1.71-.03,0-.06.01-.13.02-.19,0-.07.02-.14.02-.21-.59.01-1.16.02-1.69.03-.53.01-1.02.02-1.48.03Z"/>
                  <path class="pqr-227" d="M507.36,406.08s0,.04,0,.06c0,.07-.01.14-.02.21.45,0,.95-.02,1.48-.03.53-.01,1.1-.02,1.69-.03,0-.07.02-.14.02-.21,0-.02,0-.04,0-.07-.59.01-1.15.02-1.68.03-.53.01-1.03.02-1.48.03Z"/>
                  <path class="pqr-355" d="M507.31,405.63c.01.13.06.26.06.38,0,.02,0,.04,0,.06.46,0,.95-.02,1.48-.03.53-.01,1.09-.02,1.68-.03,0-.02,0-.04,0-.07,0-.12-.03-.25-.05-.37-.59.01-1.15.02-1.68.03s-1.04.02-1.49.03Z"/>
                  <path class="pqr-171" d="M507.15,404.97c.02.09.05.18.07.27.02.13.07.26.09.38.46,0,.96-.02,1.49-.03s1.09-.02,1.68-.03c-.01-.12-.06-.25-.08-.37-.02-.09-.05-.18-.07-.27-.63,0-1.21.01-1.75.02-.53,0-1.02.01-1.44.02Z"/>
                  <path class="pqr-94" d="M507.01,404.33c.01.12.05.25.07.37.02.09.05.18.07.27.42,0,.9-.01,1.44-.02.53,0,1.12-.01,1.75-.02-.02-.09-.05-.18-.07-.27-.02-.12-.06-.24-.07-.36-.67,0-1.28,0-1.82,0-.54,0-.99,0-1.37.01Z"/>
                  <path class="pqr-219" d="M506.87,403.39c.03.19.09.38.09.57,0,.12.03.25.04.37.38,0,.84,0,1.37-.01.54,0,1.15,0,1.82,0-.01-.12-.04-.24-.04-.36,0-.18-.05-.37-.08-.56-.69,0-1.3,0-1.84,0s-1,0-1.36,0Z"/>
                  <path class="pqr-401" d="M506.68,402.61c.01.07.04.14.05.21.04.19.12.38.14.58.36,0,.83,0,1.36,0s1.15,0,1.84,0c-.03-.19-.1-.37-.14-.56-.01-.07-.04-.13-.05-.2-.74,0-1.39-.02-1.93-.02-.54,0-.97-.01-1.28-.01Z"/>
                  <path class="pqr-401" d="M506.59,402.15c0,.08.03.16.04.25,0,.07.03.14.04.21.31,0,.74,0,1.28.01.54,0,1.19.01,1.93.02-.01-.07-.03-.13-.04-.2-.01-.08-.03-.16-.04-.24-.76-.01-1.43-.02-1.97-.03-.54,0-.96-.02-1.25-.02Z"/>
                  <path class="pqr-308" d="M506.56,401.91c0,.08.02.16.03.25.29,0,.71.01,1.25.02.54,0,1.21.02,1.97.03,0-.08-.02-.16-.02-.24-.76-.01-1.42-.03-1.97-.04-.54-.01-.97-.02-1.26-.02Z"/>
                  <path class="pqr-342" d="M506.12,411.79v.49c.4-.02.84-.04,1.32-.06,0-.16-.01-.32-.02-.49-.47.02-.91.04-1.3.06Z"/>
                  <path class="pqr-219" d="M506.12,410.69v1.1c.39-.02.83-.04,1.3-.06,0-.16-.02-.32-.03-.49-.01-.2-.03-.4-.04-.6-.45.02-.86.03-1.23.04Z"/>
                  <path class="pqr-362" d="M506.12,409.36v1.33c.37-.01.78-.03,1.23-.04,0-.2-.03-.4-.03-.6,0-.24-.02-.48-.03-.71-.44.01-.83.02-1.17.03Z"/>
                  <path class="pqr-186" d="M506.12,408.26v1.1c.33,0,.72-.02,1.17-.03-.01-.24-.04-.48-.05-.71,0-.13-.02-.25-.02-.38-.42,0-.79.01-1.1.02Z"/>
                  <path class="pqr-60" d="M506.12,407.6v.66c.31,0,.67-.01,1.1-.02,0-.13-.01-.25-.01-.38,0-.09.01-.18.02-.28-.42,0-.79.01-1.1.01Z"/>
                  <path class="pqr-401" d="M506.12,407.14v.46c.31,0,.68,0,1.1-.01,0-.09.02-.19.03-.28,0-.06.01-.12.02-.18-.44,0-.83.01-1.15.02Z"/>
                  <path class="pqr-162" d="M506.12,406.77v.37c.33,0,.72-.01,1.15-.02,0-.06.01-.12.01-.18s0-.12.01-.19c-.44,0-.83.02-1.17.02Z"/>
                  <path class="pqr-401" d="M506.12,406.38v.39c.34,0,.73-.01,1.17-.02,0-.06.01-.12.02-.19,0-.07.02-.14.02-.21-.45,0-.86.02-1.22.02Z"/>
                  <path class="pqr-411" d="M506.12,406.11v.27c.36,0,.77-.02,1.22-.02,0-.07.02-.14.02-.21,0-.02,0-.04,0-.06-.46,0-.87.02-1.24.03Z"/>
                  <path class="pqr-452" d="M506.12,405.66v.45c.37,0,.78-.02,1.24-.03,0-.02,0-.04,0-.06,0-.13-.04-.26-.06-.38-.46,0-.86.02-1.19.02Z"/>
                  <path class="pqr-171" d="M506.12,404.99v.66c.33,0,.73-.02,1.19-.02-.01-.13-.07-.26-.09-.38-.02-.09-.05-.18-.07-.27-.42,0-.77.01-1.03.02Z"/>
                  <path class="pqr-308" d="M506.12,404.34v.65c.26,0,.61-.01,1.03-.02-.02-.09-.05-.18-.07-.27-.02-.12-.06-.25-.07-.37-.38,0-.67,0-.89.01Z"/>
                  <path class="pqr-401" d="M506.12,403.39v.95c.21,0,.51,0,.89-.01-.01-.12-.04-.25-.04-.37,0-.19-.06-.38-.09-.57-.36,0-.62,0-.75,0Z"/>
                  <path class="pqr-401" d="M506.12,402.61v.79c.13,0,.39,0,.75,0-.03-.19-.11-.38-.14-.58-.01-.07-.04-.14-.05-.21-.31,0-.5,0-.56,0Z"/>
                  <path class="pqr-55" d="M506.12,402.15v.46c.06,0,.25,0,.56,0-.01-.07-.04-.14-.04-.21-.01-.08-.04-.16-.04-.25-.29,0-.45,0-.47,0Z"/>
                  <path class="pqr-94" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                </g>
                <g>
                  <path class="pqr-51" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                </g>
                <g>
                  <path class="pqr-51" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                  <path class="pqr-51" d="M506.12,401.9v.25s.18,0,.47,0c0-.08-.03-.16-.03-.25-.29,0-.44,0-.44,0Z"/>
                </g>
              </g>
              <g id="MeshGrid-4" data-name="MeshGrid">
                <g>
                  <path class="pqr-423" d="M506.86,874.66c-.02.3-.14.6-.16.88-.38-.01-.58-.03-.58-.03v-.97c.1,0,.35.06.74.12Z"/>
                  <path class="pqr-387" d="M507.14,873c-.02.25-.1.49-.12.73-.03.32-.14.63-.17.93-.39-.06-.64-.12-.74-.12v-1.7c.25,0,.59.09,1.02.16Z"/>
                  <path class="pqr-122" d="M507.35,871.67c-.02.2-.07.39-.09.58-.02.25-.1.5-.12.75-.43-.08-.77-.16-1.02-.16v-1.28c.36,0,.76.06,1.23.11Z"/>
                  <path class="pqr-198" d="M507.5,870.66c-.01.14-.05.28-.06.42-.02.2-.07.4-.09.59-.47-.05-.87-.11-1.23-.11v-.93c.42,0,.88.02,1.37.04Z"/>
                  <path class="pqr-341" d="M507.6,869.5c-.02.25-.03.49-.05.74-.01.14-.05.28-.06.42-.5-.01-.95-.03-1.37-.04v-1.15c.45,0,.95.02,1.48.03Z"/>
                  <path class="pqr-357" d="M507.77,866.84c-.04.64-.07,1.28-.12,1.93-.02.25-.03.49-.05.74-.53-.01-1.04-.03-1.48-.03v-2.78c.47.01,1.04.08,1.65.15Z"/>
                  <path class="pqr-5" d="M508.02,861.74c-.05,1.06-.08,2.12-.14,3.17-.04.64-.06,1.28-.1,1.92-.61-.07-1.18-.14-1.65-.15v-5.33c.53.03,1.19.21,1.89.39Z"/>
                  <path class="pqr-326" d="M508.22,854.71c-.03,1.29-.05,2.58-.09,3.86-.04,1.06-.06,2.12-.11,3.17-.71-.18-1.37-.36-1.89-.39v-7.36c.61.05,1.32.38,2.09.71Z"/>
                  <path class="pqr-361" d="M508.26,849.53c0,.44,0,.87,0,1.31-.01,1.29-.01,2.59-.04,3.87-.77-.33-1.49-.66-2.09-.71v-5.4c.65.06,1.36.49,2.14.93Z"/>
                  <path class="pqr-361" d="M508.26,846.28c0,.67,0,1.32,0,1.93,0,.44,0,.87,0,1.31-.78-.44-1.49-.87-2.14-.93v-2.98c.65.06,1.36.36,2.14.66Z"/>
                  <path class="pqr-401" d="M508.26,842.75v1.44c0,.72,0,1.42,0,2.09-.78-.3-1.49-.6-2.14-.66v-3.42c.65.06,1.36.31,2.14.56Z"/>
                  <path class="pqr-403" d="M508.26,633.17c0,87.27,0,177.63,0,208.13v1.46c-.78-.25-1.49-.49-2.14-.56v-204.49c.64.88,1.35-1.83,2.13-4.54Z"/>
                  <path class="pqr-111" d="M508.25,425.81c0,1.98,0,3.99,0,6.11,0,5.51,0,12.6,0,21.84,0,29.86,0,103.49,0,179.4-.78,2.7-1.5,5.42-2.13,4.54v-209.19c.63-.03,1.35-1.37,2.13-2.7Z"/>
                  <path class="pqr-300" d="M508.25,416.52c0,1.18,0,2.37,0,3.62,0,1.83,0,3.71,0,5.68-.79,1.33-1.5,2.68-2.13,2.7v-10.77c.63-.03,1.34-.63,2.13-1.23Z"/>
                  <path class="pqr-393" d="M508.25,412.64v.47c0,1.11,0,2.23,0,3.41-.79.6-1.5,1.2-2.13,1.23v-4.87c.63-.03,1.34-.13,2.13-.24Z"/>
                  <path class="pqr-342" d="M508.25,412.18v.46c-.79.1-1.5.21-2.13.24v-.6c.63-.03,1.34-.06,2.13-.1Z"/>
                  <path class="pqr-59" d="M509.21,874.75c-.07.28-.13.55-.19.79-.24,0-.48.01-.69.02-.69.01-1.24,0-1.62-.01.02-.29.13-.58.16-.88.39.06.93.11,1.6.1.25,0,.49,0,.75-.01Z"/>
                  <path class="pqr-373" d="M509.59,873.11c-.06.25-.12.5-.17.73-.07.32-.14.62-.21.9-.26,0-.5,0-.75.01-.67.01-1.2-.04-1.6-.1.02-.3.14-.61.17-.93.02-.24.1-.48.12-.73.43.08.95.15,1.58.13.3,0,.57-.01.86-.02Z"/>
                  <path class="pqr-96" d="M509.91,871.72c-.05.21-.1.42-.14.62-.06.27-.12.53-.18.78-.29,0-.57.01-.86.02-.63.02-1.15-.06-1.58-.13.02-.25.1-.5.12-.75.02-.19.07-.39.09-.58.47.05.99.1,1.59.08.33-.01.64-.02.97-.03Z"/>
                  <path class="pqr-381" d="M510.17,870.63c-.04.15-.07.3-.11.45-.05.22-.1.43-.15.64-.33.01-.64.02-.97.03-.6.02-1.13-.03-1.59-.08.02-.2.07-.39.09-.59.01-.14.05-.28.06-.42.5.01,1.03.02,1.62,0,.35-.01.7-.02,1.06-.04Z"/>
                  <path class="pqr-303" d="M510.46,869.44c-.06.24-.12.48-.18.72-.04.15-.07.31-.11.46-.36.02-.71.03-1.06.04-.58.02-1.12.01-1.62,0,.01-.14.05-.28.06-.42.02-.25.03-.49.05-.74.53.01,1.1.01,1.68,0,.36-.01.76-.03,1.17-.06Z"/>
                  <path class="pqr-85" d="M511.05,866.85c-.14.63-.27,1.24-.42,1.87-.06.24-.11.48-.17.72-.41.03-.81.05-1.17.06-.58.02-1.15.01-1.68,0,.02-.25.03-.49.05-.74.04-.64.08-1.29.12-1.93.61.07,1.25.13,1.87.12.42,0,.91-.05,1.42-.1Z"/>
                  <path class="pqr-5" d="M512.08,861.94c-.21,1.03-.39,2.02-.62,3.06-.14.62-.26,1.23-.4,1.86-.51.05-.99.1-1.42.1-.61.01-1.26-.05-1.87-.12.04-.64.07-1.28.1-1.92.06-1.06.09-2.12.14-3.17.71.18,1.46.35,2.16.36.61.02,1.24-.06,1.9-.16Z"/>
                  <path class="pqr-347" d="M513.28,855.14c-.21,1.26-.4,2.49-.63,3.74-.19,1.03-.36,2.03-.57,3.06-.66.11-1.29.19-1.9.16-.7,0-1.46-.18-2.16-.36.05-1.06.07-2.11.11-3.17.04-1.29.06-2.57.09-3.86.77.33,1.6.66,2.43.7.87.05,1.72-.08,2.63-.27Z"/>
                  <path class="pqr-31" d="M513.98,850.07c-.05.43-.08.85-.14,1.28-.18,1.28-.35,2.52-.56,3.78-.91.18-1.77.32-2.63.27-.83-.04-1.66-.37-2.43-.7.03-1.29.03-2.58.04-3.87,0-.43,0-.87,0-1.31.78.44,1.62.87,2.51.92,1,.07,2.06-.12,3.2-.37Z"/>
                  <path class="pqr-225" d="M514.22,846.74c-.04.67-.07,1.42-.12,2.04-.05.44-.07.86-.12,1.29-1.14.26-2.19.45-3.2.37-.9-.05-1.74-.49-2.51-.92,0-.44,0-.87,0-1.31,0-.62,0-1.26,0-1.93.78.3,1.62.6,2.52.66,1.05.07,2.2-.05,3.44-.2Z"/>
                  <path class="pqr-263" d="M514.34,843.67c-.01.29-.02.63-.03.9-.03.71-.05,1.5-.09,2.17-1.24.15-2.39.27-3.44.2-.9-.06-1.75-.36-2.52-.66,0-.67,0-1.37,0-2.09v-1.44c.78.25,1.62.49,2.53.55,1.08.06,2.27.21,3.55.37Z"/>
                  <path class="pqr-263" d="M514.85,639.2c-.03,60.23-.12,118.51-.12,148.75s-.1,47.6-.37,54.75c-.01.32-.01.68-.03.97-1.28-.16-2.47-.3-3.55-.37-.91-.06-1.75-.3-2.53-.55v-1.46c0-30.5,0-120.86,0-208.13.78-2.7,1.63-5.39,2.53-4.45,1.27-2.62,2.64,3.91,4.07,10.48Z"/>
                  <path class="pqr-401" d="M515.07,423.52c0,1.92,0,3.94,0,6.16,0,2.65-.01,5.72-.01,9.24,0,3.97-.01,8.73-.01,14.42,0,28.49-.15,108.66-.19,185.86-1.43-6.57-2.8-13.1-4.07-10.48-.9-.94-1.75,1.74-2.53,4.45,0-75.91,0-149.55,0-179.4,0-9.24,0-16.33,0-21.84,0-2.12,0-4.14,0-6.11.79-1.33,1.64-2.64,2.53-2.59,1.36.08,2.82.16,4.29.29Z"/>
                  <path class="pqr-401" d="M515.08,415.12c0,.97,0,2.01,0,3.17,0,1.59,0,3.31,0,5.22-1.47-.12-2.92-.21-4.29-.29-.89-.05-1.75,1.26-2.53,2.59,0-1.98,0-3.85,0-5.68,0-1.25,0-2.44,0-3.62.78-.6,1.64-1.2,2.53-1.21,1.36-.02,2.82-.11,4.3-.18Z"/>
                  <path class="pqr-336" d="M515.09,412.21v.32c0,.77,0,1.62,0,2.59-1.48.07-2.94.16-4.3.18-.9.01-1.75.61-2.53,1.21,0-1.18,0-2.3,0-3.41v-.47c.79-.1,1.64-.21,2.53-.25,1.36-.06,2.83-.12,4.31-.19Z"/>
                  <path class="pqr-83" d="M515.09,411.9c0,.1,0,.21,0,.31-1.48.06-2.94.13-4.31.19-.9.04-1.75.14-2.53.25v-.46c.79-.04,1.64-.07,2.53-.11,1.36-.06,2.83-.12,4.31-.17Z"/>
                  <path class="pqr-118" d="M510.28,874.7c-.09.28-.18.55-.26.79-.08,0-.15,0-.23.01-.27.01-.53.03-.77.03.06-.24.12-.51.19-.79.26,0,.53-.01.83-.03.08,0,.16,0,.24-.01Z"/>
                  <path class="pqr-237" d="M510.81,873.06c-.08.26-.16.5-.24.74-.1.32-.2.62-.29.9-.08,0-.16,0-.24.01-.3.02-.57.02-.83.03.07-.28.14-.58.21-.9.05-.24.11-.48.17-.73.29,0,.59-.02.94-.04.1,0,.19-.01.28-.02Z"/>
                  <path class="pqr-359" d="M511.28,871.65c-.07.21-.14.42-.21.62-.09.27-.18.53-.26.79-.09,0-.19,0-.28.02-.35.02-.65.03-.94.04.06-.25.12-.51.18-.78.05-.2.1-.41.14-.62.33-.01.67-.03,1.05-.05.11,0,.21-.01.32-.02Z"/>
                  <path class="pqr-69" d="M511.65,870.55c-.05.15-.1.31-.16.46-.07.22-.15.43-.22.64-.11,0-.21.01-.32.02-.38.02-.72.04-1.05.05.05-.21.1-.42.15-.64.04-.15.07-.3.11-.45.36-.02.74-.04,1.14-.06.11,0,.23-.01.34-.02Z"/>
                  <path class="pqr-286" d="M512.07,869.34c-.09.25-.17.5-.26.74-.05.16-.11.31-.16.46-.11,0-.23.01-.34.02-.4.02-.78.04-1.14.06.04-.15.07-.31.11-.46.06-.24.12-.48.18-.72.41-.03.84-.06,1.26-.08.12,0,.24-.01.36-.02Z"/>
                  <path class="pqr-357" d="M513.02,866.66c-.23.64-.46,1.29-.69,1.93-.09.25-.17.5-.26.74-.12,0-.24.02-.36.02-.42.02-.84.05-1.26.08.06-.24.11-.48.17-.72.15-.63.28-1.24.42-1.87.51-.05,1.03-.12,1.54-.16.14-.01.28-.02.43-.03Z"/>
                  <path class="pqr-5" d="M514.84,861.56c-.38,1.06-.75,2.12-1.13,3.17-.23.64-.46,1.29-.69,1.93-.14.01-.29.02-.43.03-.5.04-1.03.1-1.54.16.14-.63.27-1.24.4-1.86.23-1.03.41-2.03.62-3.06.66-.11,1.36-.24,2.12-.32.21-.02.43-.04.65-.06Z"/>
                  <path class="pqr-208" d="M517.24,854.49c-.41,1.3-.84,2.6-1.29,3.89-.37,1.06-.73,2.12-1.11,3.18-.22.01-.44.03-.65.06-.76.08-1.46.22-2.12.32.21-1.03.38-2.02.57-3.06.23-1.26.42-2.48.63-3.74.91-.18,1.88-.42,2.98-.56.31-.04.64-.07.98-.09Z"/>
                  <path class="pqr-89" d="M518.77,849.2c-.11.45-.23.9-.36,1.35-.37,1.32-.76,2.64-1.17,3.95-.34.02-.67.05-.98.09-1.1.14-2.07.38-2.98.56.21-1.26.37-2.5.56-3.78.06-.43.09-.85.14-1.28,1.14-.25,2.35-.57,3.66-.76.37-.05.74-.09,1.13-.12Z"/>
                  <path class="pqr-29" d="M519.4,846.26c-.09.53-.19,1.04-.31,1.59-.1.45-.21.91-.32,1.36-.38.03-.76.07-1.13.12-1.31.18-2.53.5-3.66.76.05-.43.07-.86.12-1.29.06-.63.09-1.37.12-2.04,1.24-.15,2.57-.35,3.97-.42.39-.02.8-.05,1.21-.06Z"/>
                  <path class="pqr-340" d="M519.71,844.17c-.02.21-.05.4-.08.58-.07.5-.15.98-.23,1.51-.41.02-.81.04-1.21.06-1.41.08-2.74.27-3.97.42.04-.67.06-1.46.09-2.17.01-.27.02-.6.03-.9,1.28.16,2.66.32,4.12.43.41.03.83.05,1.25.07Z"/>
                  <path class="pqr-46" d="M520.55,648.5c-.03,60.54-.06,113.83-.06,130.07,0,40.24-.14,58.65-.71,64.92-.02.25-.05.47-.07.69-.42-.02-.84-.05-1.25-.07-1.46-.1-2.84-.27-4.12-.43.01-.29.02-.65.03-.97.26-7.14.37-24.19.37-54.75s.1-88.52.12-148.75c1.43,6.57,2.91,13.18,4.43,10.72.42-.91.84-1.16,1.27-1.43Z"/>
                  <path class="pqr-149" d="M520.66,421.78c0,1.71,0,3.55,0,5.52,0,2.17,0,4.7,0,7.57,0,32.62-.06,130.05-.1,213.62-.42.27-.85.52-1.27,1.43-1.51,2.46-3-4.15-4.43-10.72.03-77.2.18-157.38.19-185.86,0-5.69.01-10.46.01-14.42,0-3.52,0-6.59.01-9.24,0-2.21,0-4.24,0-6.16,1.47.12,2.96.28,4.39.52.4-.85.8-1.55,1.2-2.25Z"/>
                  <path class="pqr-340" d="M520.67,414.4c0,.82,0,1.72,0,2.71,0,1.4,0,2.96,0,4.67-.39.7-.79,1.4-1.2,2.25-1.44-.23-2.92-.39-4.39-.52,0-1.92,0-3.63,0-5.22,0-1.16,0-2.2,0-3.17,1.48-.07,2.97-.13,4.41-.1.4-.24.8-.43,1.18-.62Z"/>
                  <path class="pqr-191" d="M520.68,411.97c0,.09,0,.17,0,.26,0,.63,0,1.35,0,2.17-.39.19-.78.38-1.18.62-1.43-.03-2.93.03-4.41.1,0-.97,0-1.82,0-2.59v-.32c1.48-.06,2.98-.12,4.41-.16.4-.02.79-.05,1.18-.08Z"/>
                  <path class="pqr-225" d="M520.68,411.72v.25c-.39.03-.78.06-1.18.08-1.43.04-2.93.1-4.41.16,0-.11,0-.21,0-.31,1.48-.06,2.98-.11,4.41-.15.4-.01.79-.02,1.18-.03Z"/>
                  <path class="pqr-313" d="M511,874.65c-.12.28-.24.55-.33.79-.14.01-.28.02-.42.03-.08,0-.16.01-.24.01.08-.24.17-.5.26-.79.08,0,.16,0,.25-.01.17-.01.32-.02.47-.04Z"/>
                  <path class="pqr-237" d="M511.74,873c-.11.26-.23.51-.34.75-.14.32-.28.63-.4.91-.15.01-.3.02-.47.04-.09,0-.17.01-.25.01.09-.28.19-.58.29-.9.08-.24.16-.49.24-.74.09,0,.19-.01.29-.02.22-.01.43-.03.63-.05Z"/>
                  <path class="pqr-173" d="M512.36,871.58c-.09.21-.18.42-.27.63-.12.27-.24.54-.35.79-.21.02-.41.03-.63.05-.1,0-.2.01-.29.02.08-.26.17-.52.26-.79.07-.2.14-.41.21-.62.11,0,.21-.01.32-.02.25-.02.51-.03.76-.05Z"/>
                  <path class="pqr-125" d="M512.82,870.47c-.06.15-.12.31-.19.46-.09.22-.18.43-.27.65-.25.02-.51.03-.76.05-.11,0-.22.01-.32.02.07-.21.14-.43.22-.64.05-.15.1-.3.16-.46.11,0,.23-.01.35-.02.27-.02.55-.04.83-.05Z"/>
                  <path class="pqr-410" d="M513.3,869.26c-.1.25-.19.49-.29.74-.06.16-.12.31-.18.46-.28.02-.55.04-.83.05-.12,0-.23.01-.35.02.05-.15.11-.31.16-.46.09-.25.17-.5.26-.74.12,0,.24-.02.36-.02.28-.02.57-.03.86-.05Z"/>
                  <path class="pqr-77" d="M514.37,866.6c-.27.64-.53,1.28-.78,1.92-.1.25-.2.49-.29.74-.29.02-.58.03-.86.05-.12,0-.24.02-.36.02.09-.25.17-.5.26-.74.23-.64.46-1.29.69-1.93.14-.01.29-.02.44-.03.29-.02.6-.02.91-.03Z"/>
                  <path class="pqr-5" d="M516.53,861.53c-.45,1.05-.9,2.1-1.35,3.15-.27.64-.54,1.28-.81,1.91-.31,0-.62.02-.91.03-.15,0-.3.02-.44.03.23-.64.46-1.29.69-1.93.38-1.06.76-2.12,1.13-3.17.22-.01.45-.02.68-.02.31,0,.66,0,1,0Z"/>
                  <path class="pqr-338" d="M519.36,854.49c-.47,1.3-.98,2.6-1.51,3.88-.43,1.06-.88,2.11-1.32,3.16-.35,0-.69,0-1,0-.23,0-.46,0-.68.02.38-1.06.74-2.12,1.11-3.18.44-1.29.87-2.59,1.29-3.89.34-.02.69-.03,1.03-.02.35,0,.72.01,1.09.02Z"/>
                  <path class="pqr-39" d="M521.04,849.18c-.12.45-.25.9-.38,1.35-.39,1.34-.83,2.65-1.3,3.96-.37,0-.74-.02-1.09-.02-.34,0-.69,0-1.03.02.41-1.3.8-2.62,1.17-3.95.12-.45.25-.9.36-1.35.38-.03.78-.04,1.18-.03.37,0,.73.01,1.1.01Z"/>
                  <path class="pqr-312" d="M521.74,846.25c-.1.51-.21,1.03-.34,1.57-.11.46-.23.91-.35,1.36-.37,0-.73,0-1.1-.01-.4,0-.79,0-1.18.03.11-.45.22-.9.32-1.36.12-.55.22-1.06.31-1.59.41-.02.83-.02,1.25-.02.36,0,.73.01,1.09,0Z"/>
                  <path class="pqr-61" d="M522.08,844.17c-.03.23-.05.42-.09.61-.08.47-.16.96-.26,1.47-.36,0-.73,0-1.09,0-.42,0-.84,0-1.25.02.09-.53.16-1.01.23-1.51.03-.18.05-.36.08-.58.42.02.85.03,1.29.04.36,0,.72-.01,1.09-.04Z"/>
                  <path class="pqr-335" d="M522.91,636.53c0,53.83-.01,104.5-.02,133.7,0,1.55,0,3.06,0,4.51,0,17.86-.03,32.06-.12,43.11-.08,11.25-.02,19.75-.61,25.6-.03.27-.05.49-.08.72-.37.03-.73.04-1.09.04-.44,0-.87-.02-1.29-.04.02-.21.05-.43.07-.69.56-6.28.71-24.68.71-64.92,0-16.23.03-69.52.06-130.07.42-.27.85-.56,1.27-1.55.36-1.06.72-5.73,1.09-10.42Z"/>
                  <path class="pqr-411" d="M522.92,423.82c0,1.78,0,3.61,0,5.5,0,31.06,0,122.77-.01,207.21-.37,4.69-.73,9.36-1.09,10.42-.42.99-.85,1.28-1.27,1.55.04-83.58.1-181,.1-213.62,0-2.87,0-5.4,0-7.57,0-1.97,0-3.82,0-5.52.39-.7.78-1.4,1.16-2.25.37-.02.74,2.14,1.1,4.29Z"/>
                  <path class="pqr-411" d="M522.92,415.49v3.18c0,1.65,0,3.37,0,5.15-.37-2.15-.74-4.31-1.1-4.29-.38.85-.77,1.55-1.16,2.25,0-1.7,0-3.27,0-4.67,0-.99,0-1.9,0-2.71.39-.19.77-.38,1.14-.61.37,0,.74.85,1.1,1.7Z"/>
                  <path class="pqr-338" d="M522.92,412.08v.41c0,.97,0,1.98,0,3.01-.37-.86-.74-1.71-1.1-1.7-.37.24-.75.42-1.14.61,0-.82,0-1.54,0-2.17,0-.09,0-.18,0-.26.39-.03.77-.06,1.14-.08.37,0,.74.09,1.11.18Z"/>
                  <path class="pqr-403" d="M522.92,411.67v.41c-.37-.1-.74-.19-1.11-.18-.37.01-.75.04-1.14.08v-.25c.39,0,.77-.02,1.14-.03.37,0,.74-.01,1.11-.02Z"/>
                  <path class="pqr-132" d="M512.35,874.53c-.19.29-.37.56-.52.81-.25.03-.49.05-.73.07-.15.01-.29.02-.43.04.09-.24.21-.51.33-.79.15-.01.31-.03.48-.04.29-.02.57-.05.86-.08Z"/>
                  <path class="pqr-231" d="M513.46,872.85c-.17.26-.34.51-.5.75-.21.33-.43.63-.62.92-.29.03-.58.06-.86.08-.18.01-.33.03-.48.04.12-.28.26-.59.4-.91.11-.24.22-.49.34-.75.21-.02.42-.03.64-.05.36-.03.72-.06,1.08-.09Z"/>
                  <path class="pqr-11" d="M514.35,871.42c-.13.21-.25.42-.38.63-.17.27-.34.54-.51.8-.36.04-.71.07-1.08.09-.22.02-.43.03-.64.05.12-.26.23-.52.35-.79.09-.21.18-.42.27-.63.25-.02.51-.04.76-.05.42-.03.82-.06,1.23-.1Z"/>
                  <path class="pqr-198" d="M514.99,870.31c-.08.15-.17.31-.26.46-.13.22-.25.44-.38.65-.4.04-.81.07-1.23.1-.26.02-.51.04-.76.05.09-.21.18-.43.27-.65.06-.15.13-.3.19-.46.28-.02.55-.04.83-.06.45-.03.89-.07,1.34-.1Z"/>
                  <path class="pqr-26" d="M515.58,869.12c-.12.24-.23.48-.35.73-.08.16-.16.31-.24.47-.44.04-.89.07-1.34.1-.28.02-.55.04-.83.06.06-.15.12-.31.18-.46.09-.25.19-.5.29-.74.29-.02.58-.03.86-.05.46-.03.94-.06,1.42-.09Z"/>
                  <path class="pqr-121" d="M516.85,866.51c-.31.63-.61,1.25-.92,1.88-.12.24-.23.48-.35.72-.48.03-.96.06-1.42.09-.28.02-.57.04-.86.05.1-.25.19-.49.29-.74.26-.64.52-1.28.78-1.92.31,0,.62-.02.92-.04.48-.03,1.02-.04,1.56-.05Z"/>
                  <path class="pqr-5" d="M519.27,861.53c-.49,1.04-.99,2.07-1.49,3.1-.31.63-.61,1.25-.92,1.88-.54.01-1.09.02-1.56.05-.29.02-.6.03-.92.04.27-.64.54-1.28.81-1.91.45-1.05.9-2.1,1.35-3.15.35,0,.69,0,1.01,0,.52-.02,1.13,0,1.73,0Z"/>
                  <path class="pqr-43" d="M522.26,854.52c-.48,1.31-1.01,2.6-1.57,3.88-.46,1.05-.93,2.09-1.42,3.13-.61,0-1.22-.02-1.73,0-.32.01-.66.01-1.01,0,.45-1.05.89-2.1,1.32-3.16.53-1.29,1.03-2.58,1.51-3.88.37,0,.74.02,1.09.01.57,0,1.19,0,1.81.02Z"/>
                  <path class="pqr-161" d="M523.95,849.15c-.12.46-.24.92-.37,1.38-.39,1.36-.83,2.69-1.31,4-.62,0-1.24-.02-1.81-.02-.35,0-.72,0-1.09-.01.47-1.31.91-2.62,1.3-3.96.13-.45.26-.9.38-1.35.37,0,.73,0,1.1,0,.6,0,1.2-.02,1.8-.04Z"/>
                  <path class="pqr-249" d="M524.62,846.18c-.1.51-.21,1.04-.33,1.57-.11.47-.22.93-.34,1.4-.6.02-1.2.03-1.8.04-.37,0-.74,0-1.1,0,.12-.45.24-.9.35-1.36.13-.54.24-1.06.34-1.57.36,0,.73,0,1.09-.01.6-.01,1.19-.03,1.79-.06Z"/>
                  <path class="pqr-326" d="M525.01,843.71c-.04.36-.09.68-.13.98-.07.47-.16.97-.26,1.48-.6.03-1.19.05-1.79.06-.37,0-.73.01-1.09.01.1-.51.19-1,.26-1.47.03-.19.06-.38.09-.61.37-.03.73-.07,1.1-.12.6-.08,1.21-.2,1.82-.34Z"/>
                  <path class="pqr-204" d="M525.83,625.88c0,48.14-.02,96.99-.04,137.9,0,16.3-.04,31.31-.06,44.5-.02,13.61.31,25.31-.6,34.37-.04.35-.07.71-.12,1.07-.61.13-1.22.25-1.82.34-.37.05-.74.09-1.1.12.03-.23.05-.45.08-.72.58-5.85.52-14.35.61-25.6.09-11.05.12-25.26.12-43.11,0-1.45,0-2.96,0-4.51,0-29.2.01-79.87.02-133.7.37-4.69.74-9.38,1.1-10.48.6.07,1.21-.01,1.82-.16Z"/>
                  <path class="pqr-197" d="M525.83,428.07c0,2.19,0,4.38,0,6.57,0,36.04,0,112.69,0,191.25-.61.15-1.22.23-1.82.16-.37,1.1-.74,5.8-1.1,10.48,0-84.44.01-176.15.01-207.21,0-1.89,0-3.72,0-5.5.37,2.15.74,4.31,1.11,4.3.6,0,1.2-.03,1.8-.06Z"/>
                  <path class="pqr-375" d="M525.83,417.17c0,1.44,0,2.88,0,4.32,0,2.19,0,4.38,0,6.57-.6.02-1.2.05-1.8.06-.37,0-.74-2.15-1.11-4.3,0-1.78,0-3.49,0-5.15v-3.18c.37.86.74,1.72,1.11,1.71.6,0,1.2-.02,1.8-.03Z"/>
                  <path class="pqr-287" d="M525.83,412.25v4.93c-.6.01-1.2.02-1.8.03-.37,0-.74-.85-1.11-1.71,0-1.03,0-2.03,0-3.01v-.41c.37.1.74.19,1.11.19.6,0,1.2-.01,1.8-.02Z"/>
                  <path class="pqr-399" d="M525.83,411.64v.61c-.6,0-1.2.01-1.8.02-.37,0-.74-.09-1.11-.19v-.41c.37,0,.74-.01,1.11-.02.6,0,1.2-.01,1.8-.02Z"/>
                  <path class="pqr-266" d="M514.32,874.27c-.27.3-.52.58-.75.85-.33.05-.66.09-.97.13-.26.03-.52.06-.77.09.14-.25.33-.52.52-.81.29-.03.58-.07.88-.1.36-.04.72-.1,1.09-.15Z"/>
                  <path class="pqr-270" d="M515.82,872.56c-.23.26-.45.52-.66.76-.28.33-.57.65-.83.95-.37.06-.74.11-1.09.15-.3.04-.59.07-.88.1.19-.29.41-.6.62-.92.16-.24.33-.49.5-.75.36-.04.71-.07,1.06-.12.43-.05.86-.11,1.29-.18Z"/>
                  <path class="pqr-152" d="M517.03,871.12c-.17.22-.36.43-.53.64-.23.28-.46.54-.68.81-.44.06-.87.12-1.29.18-.35.04-.71.08-1.06.12.17-.26.35-.53.51-.8.13-.21.25-.42.38-.63.4-.04.8-.08,1.21-.12.49-.05.97-.11,1.46-.18Z"/>
                  <path class="pqr-385" d="M517.91,870c-.12.16-.24.31-.36.46-.17.22-.35.44-.53.65-.49.07-.98.13-1.46.18-.41.04-.81.08-1.21.12.13-.21.25-.43.38-.65.09-.15.17-.31.26-.46.44-.04.89-.08,1.33-.12.54-.05,1.07-.12,1.6-.19Z"/>
                  <path class="pqr-422" d="M518.72,868.83c-.15.23-.3.46-.46.7-.11.16-.23.31-.35.47-.53.07-1.06.13-1.6.19-.44.05-.89.09-1.33.12.08-.15.17-.31.24-.47.12-.24.23-.48.35-.73.48-.03.96-.07,1.42-.11.55-.06,1.14-.11,1.72-.17Z"/>
                  <path class="pqr-208" d="M520.31,866.32c-.37.61-.76,1.21-1.14,1.82-.15.23-.3.47-.45.7-.58.06-1.16.12-1.72.17-.46.05-.94.08-1.42.11.12-.24.23-.48.35-.72.31-.63.61-1.26.92-1.88.54-.01,1.09-.03,1.56-.07.57-.05,1.24-.08,1.9-.12Z"/>
                  <path class="pqr-5" d="M523.11,861.44c-.54,1.03-1.11,2.04-1.7,3.05-.36.61-.72,1.22-1.1,1.83-.66.04-1.33.07-1.9.12-.47.04-1.02.06-1.56.07.31-.63.62-1.25.92-1.88.51-1.03,1.01-2.06,1.49-3.1.61,0,1.22.01,1.73-.02.62-.05,1.37-.05,2.11-.07Z"/>
                  <path class="pqr-269" d="M526.26,854.42c-.49,1.33-1.03,2.63-1.62,3.91-.48,1.05-1,2.09-1.53,3.11-.74.02-1.48.02-2.11.07-.52.04-1.13.03-1.73.02.49-1.04.97-2.08,1.42-3.13.56-1.28,1.08-2.57,1.57-3.88.62,0,1.24.01,1.82-.02.69-.04,1.44-.05,2.18-.09Z"/>
                  <path class="pqr-91" d="M527.92,848.9c-.11.48-.23.97-.35,1.44-.38,1.4-.81,2.75-1.3,4.08-.74.03-1.49.05-2.18.09-.58.03-1.2.03-1.82.02.49-1.31.93-2.64,1.31-4,.13-.46.26-.92.37-1.38.6-.02,1.2-.05,1.8-.08.72-.04,1.45-.1,2.17-.16Z"/>
                  <path class="pqr-364" d="M528.56,845.87c-.1.51-.22,1.04-.33,1.57-.1.49-.2.98-.31,1.46-.72.07-1.44.12-2.17.16-.6.04-1.2.06-1.8.08.12-.46.23-.93.34-1.4.12-.54.23-1.06.33-1.57.6-.03,1.19-.07,1.79-.11.72-.06,1.44-.12,2.15-.2Z"/>
                  <path class="pqr-34" d="M529.04,842.75c-.06.53-.14,1.13-.21,1.62-.07.48-.17.98-.27,1.49-.72.07-1.43.14-2.15.2-.6.05-1.19.08-1.79.11.1-.51.19-1.01.26-1.48.04-.3.09-.62.13-.98.61-.13,1.22-.28,1.83-.43.74-.18,1.47-.36,2.2-.53Z"/>
                  <path class="pqr-271" d="M529.84,624.9c0,47.86-.01,96.44-.06,137.15-.02,16.45-.1,31.59-.04,44.86.06,13.55.39,25.19-.51,34.19-.05.51-.12,1.13-.18,1.65-.73.17-1.47.35-2.2.53-.61.15-1.22.29-1.83.43.04-.36.08-.71.12-1.07.9-9.05.58-20.75.6-34.37.02-13.19.05-28.2.06-44.5.02-40.91.04-89.75.04-137.9.61-.15,1.22-.36,1.83-.57.73-.12,1.46-.27,2.19-.41Z"/>
                  <path class="pqr-197" d="M529.8,427.97c0,2.18,0,4.36,0,6.54,0,35.84.05,112.05.04,190.4-.73.14-1.46.29-2.19.41-.6.21-1.22.42-1.83.57,0-78.55,0-155.21,0-191.25,0-2.19,0-4.38,0-6.57.6-.02,1.2-.05,1.8-.05.72,0,1.45-.02,2.17-.05Z"/>
                  <path class="pqr-317" d="M529.8,417.13c0,1.43,0,2.86,0,4.3,0,2.18,0,4.36,0,6.54-.72.02-1.45.05-2.17.05-.6,0-1.2.03-1.8.05,0-2.19,0-4.38,0-6.57,0-1.44,0-2.88,0-4.32.6-.01,1.2-.02,1.8-.03.72,0,1.45,0,2.17-.02Z"/>
                  <path class="pqr-397" d="M529.8,412.23v.6c0,1.43,0,2.86,0,4.3-.72,0-1.45.02-2.17.02-.6,0-1.2.01-1.8.03v-4.93c.6,0,1.2,0,1.8-.01.72,0,1.45,0,2.17,0Z"/>
                  <path class="pqr-89" d="M529.8,411.63v.6c-.72,0-1.45,0-2.17,0-.6,0-1.2,0-1.8.01v-.61c.6,0,1.2,0,1.8,0,.72,0,1.45,0,2.17,0Z"/>
                  <path class="pqr-274" d="M516.01,873.98c-.32.31-.63.61-.92.89-.17.03-.34.06-.5.09-.35.06-.69.11-1.02.16.23-.27.48-.55.75-.85.37-.06.75-.12,1.14-.19.19-.03.37-.07.55-.1Z"/>
                  <path class="pqr-185" d="M517.8,872.23c-.27.27-.53.53-.79.78-.35.34-.68.66-1,.98-.18.04-.37.07-.55.1-.39.07-.77.13-1.14.19.27-.3.55-.62.83-.95.21-.25.44-.5.66-.76.44-.06.88-.14,1.34-.21.22-.04.43-.08.64-.12Z"/>
                  <path class="pqr-11" d="M519.23,870.76c-.21.22-.41.43-.62.65-.27.28-.54.55-.81.82-.21.04-.42.08-.64.12-.46.08-.91.15-1.34.21.23-.26.46-.53.68-.81.17-.21.35-.42.53-.64.49-.07.98-.14,1.49-.23.24-.04.48-.09.71-.13Z"/>
                  <path class="pqr-453" d="M520.27,869.62c-.14.16-.28.31-.43.47-.21.22-.41.45-.62.66-.23.05-.47.09-.71.13-.51.09-1,.16-1.49.23.17-.22.36-.43.53-.65.12-.15.24-.31.36-.46.53-.07,1.06-.15,1.59-.24.26-.04.51-.09.76-.14Z"/>
                  <path class="pqr-121" d="M521.23,868.48c-.18.22-.36.45-.54.67-.14.16-.28.32-.42.48-.25.05-.51.09-.76.14-.54.09-1.06.17-1.59.24.12-.16.24-.31.35-.47.15-.23.3-.46.46-.7.58-.06,1.16-.14,1.7-.23.26-.04.54-.09.81-.13Z"/>
                  <path class="pqr-216" d="M523.09,866.04c-.43.59-.87,1.18-1.32,1.77-.17.22-.35.45-.53.67-.27.04-.55.09-.81.13-.55.09-1.13.16-1.7.23.15-.23.3-.46.45-.7.39-.61.77-1.21,1.14-1.82.66-.04,1.32-.09,1.88-.18.27-.04.58-.07.89-.1Z"/>
                  <path class="pqr-4" d="M526.19,861.23c-.58,1.02-1.2,2.02-1.86,3.02-.4.6-.81,1.2-1.24,1.79-.31.03-.62.05-.89.1-.56.09-1.22.14-1.88.18.37-.61.74-1.22,1.1-1.83.59-1.01,1.16-2.02,1.7-3.05.74-.02,1.47-.05,2.09-.14.29-.04.65-.05,1-.07Z"/>
                  <path class="pqr-38" d="M529.47,854.14c-.49,1.36-1.04,2.68-1.65,3.97-.5,1.06-1.04,2.1-1.63,3.12-.35.01-.7.02-1,.07-.61.09-1.35.12-2.09.14.54-1.03,1.05-2.06,1.53-3.11.59-1.28,1.13-2.58,1.62-3.91.74-.03,1.48-.08,2.16-.17.33-.04.69-.07,1.05-.1Z"/>
                  <path class="pqr-411" d="M531.1,848.5c-.11.48-.23.97-.35,1.44-.36,1.45-.79,2.84-1.28,4.2-.37.04-.73.06-1.05.1-.68.09-1.42.14-2.16.17.49-1.33.93-2.69,1.3-4.08.13-.47.24-.96.35-1.44.72-.07,1.44-.15,2.15-.24.34-.04.69-.1,1.03-.16Z"/>
                  <path class="pqr-134" d="M531.72,845.48c-.1.51-.21,1.04-.31,1.57-.09.48-.2.98-.31,1.46-.35.06-.69.12-1.03.16-.71.09-1.43.17-2.15.24.11-.48.21-.97.31-1.46.11-.53.22-1.06.33-1.57.72-.07,1.43-.16,2.14-.25.34-.04.68-.09,1.02-.14Z"/>
                  <path class="pqr-369" d="M532.21,842.19c-.07.6-.15,1.19-.23,1.78-.07.49-.17.99-.27,1.5-.34.05-.68.09-1.02.14-.71.09-1.42.18-2.14.25.1-.51.2-1.01.27-1.49.07-.49.15-1.09.21-1.62.73-.17,1.45-.32,2.16-.41.34-.04.68-.1,1.01-.15Z"/>
                  <path class="pqr-163" d="M533.06,624.51c-.02,47.84-.06,96.48-.12,137.14,0,1.59,0,3.16,0,4.73-.03,14.99-.1,28.82-.05,41.01,0,1.22.01,2.42.02,3.61.06,11.51.28,21.5-.5,29.4-.06.6-.12,1.19-.19,1.79-.34.05-.67.1-1.01.15-.71.1-1.43.25-2.16.41.06-.53.13-1.15.18-1.65.9-9,.57-20.63.51-34.19-.06-13.28.03-28.41.04-44.86.04-40.71.05-89.28.06-137.15.73-.14,1.45-.27,2.15-.35.35-.01.71-.03,1.07-.04Z"/>
                  <path class="pqr-170" d="M533.09,427.91c0,2.17,0,4.35,0,6.52,0,35.72,0,111.85-.03,190.08-.36.02-.71.03-1.07.04-.7.08-1.42.21-2.15.35,0-78.35-.03-154.55-.04-190.4,0-2.18,0-4.36,0-6.54.72-.02,1.45-.05,2.17-.05.37,0,.75,0,1.12-.01Z"/>
                  <path class="pqr-283" d="M533.09,417.11c0,1.43,0,2.85,0,4.28,0,2.17,0,4.35,0,6.52-.37,0-.75,0-1.12.01-.72,0-1.45.02-2.17.05,0-2.18,0-4.36,0-6.54,0-1.43,0-2.86,0-4.3.72,0,1.45-.02,2.17-.02.37,0,.75,0,1.12,0Z"/>
                  <path class="pqr-202" d="M533.09,412.23v4.88c-.38,0-.75,0-1.12,0-.72,0-1.45,0-2.17.02,0-1.43,0-2.86,0-4.3v-.6c.72,0,1.45,0,2.17,0,.37,0,.75,0,1.12,0Z"/>
                  <path class="pqr-344" d="M533.09,411.63v.6c-.38,0-.75,0-1.12,0-.72,0-1.45,0-2.17,0v-.6c.72,0,1.45,0,2.17,0,.37,0,.75,0,1.12,0Z"/>
                  <path class="pqr-159" d="M517.16,873.75c-.36.32-.7.63-1.03.92-.18.04-.36.07-.54.11-.17.03-.34.07-.51.1.29-.28.6-.57.92-.89.18-.04.37-.07.56-.11.2-.04.39-.08.59-.13Z"/>
                  <path class="pqr-236" d="M519.12,871.94c-.29.27-.58.54-.86.8-.38.35-.75.68-1.1,1-.2.04-.39.09-.59.13-.19.04-.38.08-.56.11.32-.31.66-.64,1-.98.26-.25.52-.51.79-.78.21-.04.42-.09.64-.13.23-.05.45-.1.67-.15Z"/>
                  <path class="pqr-92" d="M520.67,870.45c-.22.22-.45.44-.67.66-.29.29-.59.56-.88.84-.22.05-.44.1-.67.15-.22.05-.43.09-.64.13.27-.27.54-.54.81-.82.21-.21.41-.43.62-.65.23-.05.47-.1.71-.15.25-.05.49-.11.73-.17Z"/>
                  <path class="pqr-189" d="M521.81,869.3c-.16.16-.31.32-.47.48-.22.23-.45.45-.67.67-.24.06-.48.11-.73.17-.24.05-.48.1-.71.15.21-.22.41-.44.62-.66.14-.16.28-.31.43-.47.25-.05.5-.1.76-.15.26-.06.52-.11.78-.18Z"/>
                  <path class="pqr-179" d="M522.87,868.16c-.2.22-.39.43-.59.65-.15.16-.31.32-.46.48-.26.06-.52.12-.78.18-.25.05-.51.11-.76.15.14-.16.28-.32.42-.48.18-.22.36-.45.54-.67.27-.04.54-.09.8-.15.27-.06.55-.11.83-.17Z"/>
                  <path class="pqr-150" d="M524.89,865.78c-.46.58-.95,1.16-1.45,1.73-.19.22-.38.44-.58.65-.28.06-.56.11-.83.17-.26.06-.53.1-.8.15.18-.22.36-.45.53-.67.46-.59.9-1.17,1.32-1.77.31-.03.62-.06.89-.12.28-.06.6-.1.91-.14Z"/>
                  <path class="pqr-18" d="M528.23,861.02c-.62,1.02-1.29,2.02-2,3-.43.59-.88,1.18-1.35,1.76-.32.04-.64.08-.91.14-.27.06-.58.09-.89.12.43-.59.84-1.19,1.24-1.79.66-.99,1.28-1.99,1.86-3.02.35-.01.71-.04,1-.1.31-.07.67-.09,1.04-.12Z"/>
                  <path class="pqr-91" d="M531.65,853.82c-.5,1.4-1.07,2.75-1.7,4.05-.52,1.07-1.1,2.12-1.72,3.14-.36.02-.73.05-1.04.12-.3.06-.65.08-1,.1.58-1.02,1.12-2.06,1.63-3.12.61-1.29,1.16-2.61,1.65-3.97.37-.04.74-.08,1.07-.15.35-.08.73-.12,1.11-.17Z"/>
                  <path class="pqr-150" d="M533.22,848.09c-.1.46-.19.91-.3,1.38-.35,1.5-.77,2.95-1.27,4.35-.38.04-.76.09-1.11.17-.34.07-.71.12-1.07.15.49-1.36.92-2.76,1.28-4.2.12-.47.24-.96.35-1.44.35-.06.7-.13,1.05-.19.36-.07.72-.14,1.08-.21Z"/>
                  <path class="pqr-22" d="M533.76,845.16c-.09.51-.19,1.03-.28,1.56-.08.46-.16.9-.26,1.37-.36.07-.72.14-1.08.21-.35.07-.7.13-1.05.19.11-.48.21-.97.31-1.46.1-.53.21-1.05.31-1.57.34-.05.67-.1,1.01-.15.35-.05.69-.11,1.04-.16Z"/>
                  <path class="pqr-214" d="M534.21,842.12c-.06.52-.13,1.03-.2,1.55-.07.49-.15.99-.24,1.5-.34.06-.69.11-1.04.16-.34.05-.67.1-1.01.15.1-.51.2-1.01.27-1.5.08-.59.16-1.19.23-1.78.34-.05.67-.11,1-.16.34-.05.67.02.99.08Z"/>
                  <path class="pqr-428" d="M535.2,631.65c-.06,55.81-.14,109.55-.2,140.49,0,3.07-.01,5.96-.02,8.65-.05,14.78-.06,26.76-.1,36.29-.03,10.16.04,17.97-.5,23.5-.05.52-.11,1.03-.17,1.55-.32-.06-.65-.13-.99-.08-.33.05-.66.1-1,.16.07-.6.13-1.19.19-1.79.78-7.91.56-17.9.5-29.4,0-1.19-.01-2.39-.02-3.61-.05-12.2.02-26.02.05-41.01,0-1.56,0-3.14,0-4.73.06-40.66.09-89.3.12-137.14.36-.02.71-.03,1.07-.05.37,1.08.73,4.13,1.08,7.19Z"/>
                  <path class="pqr-436" d="M535.37,426.17c0,2.18,0,4.46,0,6.82v.8c0,21.78-.08,112.15-.17,197.86-.35-3.06-.71-6.11-1.08-7.19-.35.02-.71.03-1.07.05.04-78.23.03-154.36.03-190.08,0-2.17,0-4.35,0-6.52.37,0,.75,0,1.12,0,.39,0,.78-.87,1.16-1.73Z"/>
                  <path class="pqr-202" d="M535.37,415.97v3.96c0,1.97,0,4.05,0,6.24-.39.86-.77,1.73-1.16,1.73-.38,0-.75,0-1.12,0,0-2.17,0-4.35,0-6.52,0-1.43,0-2.85,0-4.28.38,0,.75,0,1.13,0,.39,0,.78-.57,1.16-1.14Z"/>
                  <path class="pqr-430" d="M535.37,412.06v3.91c-.39.57-.77,1.14-1.16,1.14-.38,0-.75,0-1.13,0v-4.88c.38,0,.75,0,1.13,0,.39,0,.78-.08,1.16-.17Z"/>
                  <path class="pqr-111" d="M535.37,411.63v.43c-.39.08-.77.17-1.16.17-.38,0-.75,0-1.13,0v-.6c.38,0,.75,0,1.13,0,.39,0,.78,0,1.16,0Z"/>
                  <path class="pqr-268" d="M518.88,873.33c-.38.33-.76.65-1.1.95-.37.09-.74.18-1.1.26-.18.04-.36.08-.54.12.33-.29.67-.6,1.03-.92.2-.04.39-.09.59-.14.38-.09.75-.18,1.13-.28Z"/>
                  <path class="pqr-63" d="M521.01,871.45c-.31.28-.63.56-.93.83-.41.36-.81.71-1.19,1.05-.38.1-.75.19-1.13.28-.2.05-.4.09-.59.14.35-.32.72-.66,1.1-1,.28-.26.57-.53.86-.8.22-.05.44-.11.67-.16.41-.1.82-.21,1.22-.33Z"/>
                  <path class="pqr-2" d="M522.68,869.91c-.24.23-.48.45-.72.67-.32.29-.64.58-.95.87-.41.12-.81.23-1.22.33-.23.06-.45.11-.67.16.29-.27.58-.55.88-.84.22-.22.45-.44.67-.66.24-.06.48-.12.73-.18.43-.11.86-.23,1.29-.35Z"/>
                  <path class="pqr-151" d="M523.89,868.74c-.16.16-.33.32-.49.48-.24.23-.48.46-.72.69-.43.13-.86.25-1.29.35-.25.06-.49.12-.73.18.22-.22.45-.45.67-.67.16-.16.31-.32.47-.48.26-.06.51-.13.77-.19.44-.11.88-.23,1.31-.36Z"/>
                  <path class="pqr-111" d="M524.99,867.63c-.2.21-.4.42-.61.63-.16.16-.33.32-.49.49-.44.13-.88.25-1.31.36-.26.07-.52.13-.77.19.16-.16.31-.32.46-.48.2-.22.4-.43.59-.65.28-.06.56-.12.82-.18.44-.11.88-.23,1.31-.35Z"/>
                  <path class="pqr-121" d="M527.06,865.32c-.47.56-.96,1.13-1.47,1.68-.2.21-.39.42-.59.63-.43.12-.87.23-1.31.35-.26.07-.54.13-.82.18.2-.22.39-.44.58-.65.5-.57.98-1.15,1.45-1.73.32-.04.63-.08.91-.15.43-.11.84-.2,1.26-.31Z"/>
                  <path class="pqr-417" d="M530.39,860.65c-.61,1.01-1.27,1.99-1.98,2.95-.43.58-.88,1.16-1.35,1.72-.41.1-.83.2-1.26.31-.27.07-.59.11-.91.15.46-.58.91-1.17,1.35-1.76.71-.98,1.38-1.98,2-3,.36-.02.72-.05,1.02-.11.38-.09.76-.17,1.13-.26Z"/>
                  <path class="pqr-282" d="M533.7,853.5c-.47,1.39-1.01,2.74-1.63,4.03-.51,1.06-1.07,2.1-1.67,3.11-.37.09-.75.17-1.13.26-.3.06-.66.09-1.02.11.62-1.02,1.19-2.07,1.72-3.14.64-1.3,1.21-2.66,1.7-4.05.38-.04.75-.08,1.08-.14.33-.06.64-.12.96-.18Z"/>
                  <path class="pqr-338" d="M535.17,847.79c-.08.45-.18.9-.27,1.36-.33,1.51-.72,2.96-1.2,4.35-.32.06-.63.12-.96.18-.33.06-.7.1-1.08.14.5-1.4.92-2.85,1.27-4.35.11-.47.2-.92.3-1.38.36-.07.71-.14,1.06-.2.3-.05.59-.08.88-.11Z"/>
                  <path class="pqr-34" d="M535.64,844.89c-.07.53-.14,1.04-.23,1.57-.07.44-.15.89-.24,1.34-.29.03-.59.06-.88.11-.35.06-.7.13-1.06.2.1-.46.18-.91.26-1.37.1-.53.19-1.05.28-1.56.34-.06.69-.11,1.03-.17.28-.05.56-.08.84-.1Z"/>
                  <path class="pqr-248" d="M536.03,841.81c-.06.51-.13,1.03-.19,1.54-.07.51-.13,1.02-.2,1.54-.28.03-.56.06-.84.1-.34.06-.68.12-1.03.17.09-.51.17-1.01.24-1.5.07-.52.14-1.03.2-1.55.32.06.65.12.98.07.27-.05.56-.21.84-.38Z"/>
                  <path class="pqr-235" d="M537.06,631.44c-.07,53.76-.14,105.58-.2,136.88,0,4.88,0,9.4.03,13.5.03,29.43.29,48.25-.7,58.44-.05.52-.11,1.03-.17,1.54-.28.17-.56.34-.84.38-.33.05-.66,0-.98-.07.06-.52.12-1.03.17-1.55.54-5.52.47-13.34.5-23.5.03-9.53.05-21.51.1-36.29,0-2.69.01-5.58.02-8.65.07-30.94.14-84.67.2-140.49.35,3.06.7,6.11,1.07,7.18.26-1.4.53-4.39.8-7.39Z"/>
                  <path class="pqr-163" d="M537.26,426.14c0,2.18,0,4.45,0,6.8v.8c0,21.73-.1,112.05-.2,197.71-.27,2.99-.54,5.99-.8,7.39-.36-1.07-.71-4.13-1.07-7.18.1-85.71.17-176.08.17-197.86v-.8c0-2.35,0-4.63,0-6.82.39-.86.77-1.73,1.16-1.73.24,0,.49.84.73,1.69Z"/>
                  <path class="pqr-364" d="M537.26,415.96c0,1.24,0,2.56,0,3.95,0,1.96,0,4.04,0,6.22-.24-.85-.49-1.7-.73-1.69-.38,0-.77.86-1.16,1.73,0-2.18,0-4.27,0-6.24v-3.96c.39-.57.77-1.14,1.16-1.14.25,0,.49.56.73,1.13Z"/>
                  <path class="pqr-424" d="M537.26,412.07v.45c0,1.06,0,2.21,0,3.45-.24-.57-.49-1.13-.73-1.13-.38,0-.77.57-1.16,1.14v-3.91c.39-.08.77-.17,1.16-.17.25,0,.49.08.73.17Z"/>
                  <path class="pqr-368" d="M537.26,411.63v.43c-.24-.08-.49-.17-.73-.17-.38,0-.77.08-1.16.17v-.43c.39,0,.77,0,1.16,0,.25,0,.49,0,.73,0Z"/>
                  <path class="pqr-124" d="M521,872.7c-.41.35-.8.68-1.15.99-.32.1-.63.2-.95.29-.38.11-.76.21-1.13.31.35-.3.72-.62,1.1-.95.38-.1.76-.21,1.15-.32.32-.1.65-.2.97-.3Z"/>
                  <path class="pqr-396" d="M523.24,870.75c-.33.29-.66.58-.98.86-.43.37-.85.74-1.26,1.09-.33.11-.65.21-.97.3-.39.12-.77.22-1.15.32.38-.33.79-.68,1.19-1.05.3-.27.62-.55.93-.83.41-.12.81-.24,1.22-.37.34-.1.68-.22,1.01-.33Z"/>
                  <path class="pqr-240" d="M524.99,869.17c-.25.23-.5.46-.75.69-.33.3-.66.6-1,.89-.34.12-.68.23-1.01.33-.41.13-.82.25-1.22.37.31-.28.63-.57.95-.87.24-.22.48-.45.72-.67.43-.13.86-.26,1.28-.39.35-.11.69-.23,1.04-.35Z"/>
                  <path class="pqr-236" d="M526.24,867.99c-.17.16-.34.32-.51.48-.24.23-.49.46-.74.7-.35.12-.69.24-1.04.35-.42.13-.85.27-1.28.39.24-.23.48-.46.72-.69.17-.16.33-.32.49-.48.44-.13.87-.26,1.3-.4.35-.11.7-.23,1.05-.35Z"/>
                  <path class="pqr-80" d="M527.33,866.9c-.19.2-.39.41-.59.6-.16.16-.33.32-.49.48-.35.12-.7.24-1.05.35-.43.14-.86.27-1.3.4.16-.16.33-.32.49-.49.21-.21.41-.42.61-.63.43-.12.86-.25,1.29-.38.35-.11.7-.23,1.05-.34Z"/>
                  <path class="pqr-155" d="M529.3,864.68c-.44.54-.91,1.08-1.4,1.61-.19.2-.38.41-.58.61-.35.12-.7.23-1.05.34-.43.14-.86.26-1.29.38.2-.21.4-.42.59-.63.51-.55,1-1.11,1.47-1.68.41-.1.83-.21,1.24-.34.34-.1.68-.2,1.01-.3Z"/>
                  <path class="pqr-303" d="M532.42,860.16c-.56.98-1.17,1.93-1.84,2.86-.41.56-.83,1.12-1.28,1.66-.33.1-.66.2-1.01.3-.41.13-.83.23-1.24.34.47-.56.92-1.14,1.35-1.72.71-.96,1.37-1.95,1.98-2.95.37-.09.75-.17,1.12-.26.31-.08.61-.15.91-.23Z"/>
                  <path class="pqr-234" d="M535.43,853.21c-.42,1.35-.91,2.66-1.48,3.93-.47,1.04-.97,2.04-1.53,3.02-.3.08-.6.15-.91.23-.37.09-.75.18-1.12.26.61-1.01,1.17-2.05,1.67-3.11.62-1.29,1.16-2.64,1.63-4.03.32-.06.63-.11.95-.15.26-.04.53-.09.79-.14Z"/>
                  <path class="pqr-123" d="M536.74,847.7c-.07.44-.15.88-.24,1.33-.29,1.44-.64,2.84-1.07,4.19-.26.05-.52.1-.79.14-.32.04-.63.1-.95.15.47-1.39.87-2.85,1.2-4.35.1-.46.19-.91.27-1.36.29-.03.58-.05.87-.06.24-.01.47-.02.7-.03Z"/>
                  <path class="pqr-398" d="M537.13,844.76c-.06.56-.12,1.11-.19,1.62-.06.43-.13.87-.2,1.31-.23,0-.47.02-.7.03-.29.02-.58.04-.87.06.08-.45.16-.9.24-1.34.09-.52.16-1.04.23-1.57.28-.03.55-.05.83-.08.23-.03.45-.04.67-.05Z"/>
                  <path class="pqr-386" d="M537.5,841.31c-.06.59-.13,1.18-.2,1.76-.06.56-.11,1.13-.17,1.7-.22.01-.44.02-.67.05-.27.03-.55.05-.83.08.07-.53.13-1.03.2-1.54.07-.51.13-1.03.19-1.54.28-.17.56-.34.82-.39.22-.04.44-.08.65-.11Z"/>
                  <path class="pqr-228" d="M538.48,624.56c-.04,47.23-.07,94.87-.12,135.18-.04,33.59.88,61.9-.68,79.79-.05.59-.12,1.19-.18,1.78-.21.03-.43.06-.65.11-.26.05-.54.22-.82.39.06-.51.12-1.03.17-1.54.99-10.18.73-29,.7-58.44-.02-4.1-.04-8.62-.03-13.5.06-31.29.13-83.12.2-136.88.27-2.99.53-5.98.78-7.37.22.49.43.58.63.49Z"/>
                  <path class="pqr-42" d="M538.59,427.88c0,2.17,0,4.34,0,6.5-.01,35.59-.05,112.09-.11,190.18-.2.09-.41,0-.63-.49-.25,1.38-.52,4.37-.78,7.37.1-85.65.19-175.97.2-197.71v-.8c0-2.35,0-4.62,0-6.8.24.85.49,1.71.72,1.73.2.02.4.02.6.01Z"/>
                  <path class="pqr-42" d="M538.59,417.11c0,1.42,0,2.85,0,4.27,0,2.17,0,4.34,0,6.5-.2,0-.4,0-.6-.01-.24-.02-.48-.88-.72-1.73,0-2.18,0-4.26,0-6.22,0-1.4,0-2.71,0-3.95.24.57.49,1.13.73,1.14.2,0,.4,0,.59,0Z"/>
                  <path class="pqr-142" d="M538.59,412.23v.6c0,1.42,0,2.85,0,4.27-.2,0-.4,0-.59,0-.24,0-.48-.57-.73-1.14,0-1.24,0-2.39,0-3.45v-.45c.24.08.49.17.73.17.2,0,.4,0,.59,0Z"/>
                  <path class="pqr-273" d="M538.59,411.63v.6c-.2,0-.4,0-.59,0-.24,0-.48-.08-.73-.17v-.43c.24,0,.49,0,.73,0,.2,0,.4,0,.59,0Z"/>
                  <path class="pqr-40" d="M523.13,871.93c-.42.36-.83.71-1.2,1.04-.37.14-.75.28-1.12.41-.32.11-.64.22-.96.32.36-.31.75-.64,1.15-.99.33-.11.66-.22.98-.34.38-.14.76-.28,1.14-.43Z"/>
                  <path class="pqr-415" d="M525.43,869.92c-.34.3-.68.6-1,.88-.44.38-.88.76-1.3,1.13-.38.15-.76.3-1.14.43-.33.12-.66.23-.98.34.41-.35.83-.71,1.26-1.09.32-.28.65-.57.98-.86.34-.12.68-.24,1.02-.37.39-.15.78-.3,1.17-.46Z"/>
                  <path class="pqr-68" d="M527.21,868.32c-.25.23-.51.47-.76.69-.33.3-.67.61-1.01.91-.39.16-.78.32-1.17.46-.34.13-.68.25-1.02.37.33-.29.67-.59,1-.89.25-.23.5-.46.75-.69.35-.12.69-.25,1.03-.38.4-.15.79-.31,1.18-.47Z"/>
                  <path class="pqr-14" d="M528.46,867.15c-.17.16-.34.32-.51.48-.24.23-.5.46-.75.69-.39.16-.78.32-1.18.47-.34.13-.69.26-1.03.38.25-.23.5-.47.74-.7.17-.16.34-.32.51-.48.35-.12.69-.25,1.04-.38.4-.15.79-.3,1.18-.46Z"/>
                  <path class="pqr-215" d="M529.52,866.12c-.18.19-.37.38-.56.56-.16.15-.33.31-.49.47-.39.16-.78.31-1.18.46-.34.13-.69.26-1.04.38.17-.16.33-.32.49-.48.2-.2.4-.4.59-.6.35-.12.69-.23,1.03-.36.39-.14.78-.28,1.16-.43Z"/>
                  <path class="pqr-16" d="M531.37,864.03c-.42.52-.85,1.03-1.31,1.52-.18.19-.36.38-.54.57-.38.15-.77.29-1.16.43-.34.12-.68.24-1.03.36.19-.2.39-.41.58-.61.49-.53.95-1.06,1.4-1.61.33-.1.65-.2.97-.3.37-.12.73-.23,1.09-.35Z"/>
                  <path class="pqr-126" d="M534.3,859.63c-.53.96-1.11,1.9-1.74,2.8-.38.55-.78,1.08-1.2,1.6-.36.12-.72.24-1.09.35-.32.1-.64.2-.97.3.44-.54.87-1.1,1.28-1.66.67-.93,1.28-1.88,1.84-2.86.3-.08.59-.16.89-.24.34-.09.67-.19,1-.29Z"/>
                  <path class="pqr-7" d="M537.08,852.87c-.38,1.3-.82,2.56-1.35,3.79-.43,1.01-.91,2.01-1.44,2.97-.33.1-.66.19-1,.29-.29.08-.59.16-.89.24.56-.98,1.07-1.98,1.53-3.02.57-1.26,1.06-2.58,1.48-3.93.26-.05.52-.1.78-.15.3-.05.59-.12.88-.19Z"/>
                  <path class="pqr-30" d="M538.21,847.61c-.06.43-.13.86-.2,1.29-.24,1.35-.55,2.67-.92,3.97-.29.07-.58.14-.88.19-.26.05-.51.1-.78.15.42-1.35.77-2.75,1.07-4.19.09-.45.17-.89.24-1.33.23-.01.46-.02.69-.03.26-.01.52-.03.78-.05Z"/>
                  <path class="pqr-273" d="M538.54,844.66c-.05.6-.1,1.17-.16,1.67-.05.42-.1.85-.16,1.28-.26.02-.52.04-.78.05-.23.01-.46.02-.69.03.07-.44.14-.88.2-1.31.08-.51.14-1.06.19-1.62.22-.01.44-.02.66-.05.25-.03.5-.04.75-.06Z"/>
                  <path class="pqr-56" d="M538.82,841.13c-.05.57-.1,1.12-.14,1.66-.05.63-.09,1.27-.14,1.87-.25.02-.49.03-.75.06-.22.03-.44.03-.66.05.06-.56.11-1.13.17-1.7.07-.58.14-1.17.2-1.76.21-.03.42-.06.62-.09.24-.04.47-.07.7-.1Z"/>
                  <path class="pqr-281" d="M539.78,623.8c-.02,46.88-.04,94.58-.07,134.7-.02,34.04.47,62.8-.76,80.89-.04.59-.08,1.17-.13,1.73-.23.03-.46.06-.7.1-.21.03-.41.06-.62.09.06-.59.13-1.19.18-1.78,1.56-17.88.64-46.2.68-79.79.05-40.31.09-87.96.12-135.18.2-.09.4-.37.61-.62.24-.1.47-.14.69-.14Z"/>
                  <path class="pqr-144" d="M539.84,427.85c0,2.16,0,4.32,0,6.48,0,35.56-.03,111.41-.06,189.47-.23,0-.46.04-.69.14-.21.25-.4.53-.61.62.06-78.09.09-154.59.11-190.18,0-2.17,0-4.34,0-6.5.2,0,.39-.02.59-.02.23,0,.45-.01.67-.01Z"/>
                  <path class="pqr-72" d="M539.85,417.1c0,1.42,0,2.84,0,4.26,0,2.16,0,4.32,0,6.48-.22,0-.45,0-.67.01-.2,0-.39.01-.59.02,0-2.17,0-4.34,0-6.5,0-1.42,0-2.85,0-4.27.2,0,.39,0,.59,0,.23,0,.45,0,.67,0Z"/>
                  <path class="pqr-177" d="M539.85,412.24v4.86c-.22,0-.45,0-.67,0-.19,0-.39,0-.59,0,0-1.42,0-2.85,0-4.27v-.6c.2,0,.39,0,.59,0,.23,0,.45,0,.67,0Z"/>
                  <path class="pqr-180" d="M539.85,411.64v.6c-.22,0-.45,0-.67,0-.19,0-.39,0-.59,0v-.6c.2,0,.39,0,.59,0,.23,0,.45,0,.67,0Z"/>
                  <path class="pqr-412" d="M525.31,870.99c-.43.37-.84.73-1.22,1.06-.34.16-.69.31-1.03.45-.38.16-.75.31-1.13.45.37-.32.78-.67,1.2-1.04.38-.15.76-.31,1.14-.47.35-.15.69-.3,1.04-.46Z"/>
                  <path class="pqr-28" d="M527.63,868.95c-.34.3-.68.6-1.01.89-.44.39-.89.78-1.31,1.15-.34.16-.69.31-1.04.46-.38.16-.76.32-1.14.47.42-.36.86-.75,1.3-1.13.32-.29.66-.58,1-.88.39-.16.78-.33,1.16-.5.35-.15.7-.31,1.04-.47Z"/>
                  <path class="pqr-370" d="M529.4,867.35c-.25.23-.51.46-.76.69-.33.3-.68.61-1.01.91-.34.16-.69.32-1.04.47-.38.17-.77.34-1.16.5.34-.3.68-.61,1.01-.91.25-.23.51-.46.76-.69.39-.16.78-.33,1.16-.5.35-.15.69-.31,1.04-.47Z"/>
                  <path class="pqr-113" d="M530.65,866.21c-.17.15-.33.31-.5.46-.24.22-.49.45-.74.68-.34.16-.69.31-1.04.47-.38.17-.77.34-1.16.5.25-.23.51-.47.75-.69.17-.16.34-.32.51-.48.39-.16.78-.32,1.16-.49.35-.15.69-.3,1.03-.46Z"/>
                  <path class="pqr-311" d="M531.66,865.24c-.17.17-.34.34-.52.51-.16.15-.32.3-.49.46-.34.15-.68.31-1.03.46-.38.16-.77.33-1.16.49.17-.16.33-.32.49-.47.19-.18.38-.37.56-.56.38-.15.76-.3,1.13-.45.34-.14.68-.28,1.01-.43Z"/>
                  <path class="pqr-409" d="M533.41,863.27c-.4.5-.81.98-1.24,1.45-.17.18-.33.35-.51.52-.33.15-.67.29-1.01.43-.37.15-.75.3-1.13.45.18-.19.37-.38.54-.57.46-.49.89-1,1.31-1.52.36-.12.72-.25,1.07-.38.32-.12.65-.25.97-.38Z"/>
                  <path class="pqr-62" d="M536.16,859.02c-.49.94-1.03,1.84-1.62,2.71-.36.53-.73,1.04-1.13,1.54-.32.13-.64.26-.97.38-.36.14-.71.26-1.07.38.42-.52.82-1.05,1.2-1.6.63-.9,1.21-1.84,1.74-2.8.33-.1.65-.2.98-.3.29-.09.59-.2.88-.31Z"/>
                  <path class="pqr-69" d="M538.68,852.46c-.33,1.25-.74,2.48-1.21,3.68-.39.99-.83,1.95-1.32,2.88-.29.11-.58.22-.88.31-.32.1-.65.2-.98.3.53-.96,1.01-1.96,1.44-2.97.52-1.23.97-2.49,1.35-3.79.29-.07.57-.14.85-.2.25-.06.5-.13.75-.21Z"/>
                  <path class="pqr-25" d="M539.65,847.41c-.05.42-.11.84-.17,1.26-.2,1.27-.46,2.54-.8,3.78-.24.08-.49.16-.75.21-.28.06-.56.13-.85.2.38-1.3.68-2.62.92-3.97.08-.43.14-.87.2-1.29.26-.02.51-.05.76-.08.23-.03.45-.07.67-.12Z"/>
                  <path class="pqr-418" d="M539.91,844.49c-.04.61-.08,1.19-.13,1.67-.04.42-.08.84-.13,1.26-.22.05-.45.09-.67.12-.25.04-.51.06-.76.08.06-.43.11-.86.16-1.28.06-.5.11-1.07.16-1.67.24-.02.49-.03.73-.07.22-.04.43-.07.65-.1Z"/>
                  <path class="pqr-181" d="M540.12,840.93c-.03.55-.06,1.06-.09,1.57-.04.7-.08,1.38-.12,1.99-.21.03-.43.06-.65.1-.24.04-.48.06-.73.07.05-.6.09-1.24.14-1.87.05-.54.1-1.09.14-1.66.23-.03.46-.06.68-.1.21-.03.41-.07.62-.1Z"/>
                  <path class="pqr-130" d="M541.07,634.84c0,54.4-.02,106.37-.03,137.25,0,9.04.01,16.76,0,22.83-.01,13.46-.28,33.31-.84,44.32-.03.58-.05,1.14-.08,1.68-.2.04-.41.07-.62.1-.23.04-.45.07-.68.1.05-.57.09-1.15.13-1.73,1.23-18.09.74-46.85.76-80.89.03-40.12.05-87.83.07-134.7.23,0,.45.03.68.05.21,2.83.41,6.91.61,10.99Z"/>
                  <path class="pqr-284" d="M541.09,425.17c0,1.42,0,2.82,0,4.24,0,24.51-.02,117.93-.03,205.43-.2-4.08-.4-8.16-.61-10.99-.23-.03-.45-.06-.68-.05.03-78.05.06-153.91.06-189.47,0-2.16,0-4.32,0-6.48.22,0,.44,0,.66,0,.2,0,.4-1.34.59-2.68Z"/>
                  <path class="pqr-207" d="M541.09,416.36c0,1.43,0,2.98,0,4.57,0,1.42,0,2.82,0,4.24-.19,1.34-.39,2.69-.59,2.68-.22,0-.44,0-.66,0,0-2.16,0-4.32,0-6.48,0-1.42,0-2.84,0-4.26.22,0,.44,0,.66,0,.2,0,.39-.37.59-.74Z"/>
                  <path class="pqr-97" d="M541.09,412.07v.46c0,1.1,0,2.4,0,3.83-.19.37-.39.74-.59.74-.22,0-.44,0-.66,0v-4.86c.22,0,.44,0,.66,0,.2,0,.39-.08.59-.17Z"/>
                  <path class="pqr-190" d="M541.09,411.64v.43c-.19.08-.39.17-.59.17-.22,0-.44,0-.66,0v-.6c.22,0,.44,0,.66,0,.2,0,.39,0,.59,0Z"/>
                  <path class="pqr-236" d="M527.02,870.15c-.4.36-.78.7-1.15,1.02-.25.13-.5.26-.75.39-.34.17-.69.34-1.03.5.38-.33.8-.69,1.22-1.06.34-.16.69-.32,1.03-.49.22-.11.45-.23.68-.35Z"/>
                  <path class="pqr-164" d="M529.19,868.19c-.32.29-.64.58-.95.86-.42.37-.83.74-1.22,1.1-.23.12-.45.24-.68.35-.34.17-.68.33-1.03.49.43-.37.87-.76,1.31-1.15.33-.29.67-.59,1.01-.89.34-.16.68-.32,1.02-.49.18-.09.36-.18.54-.27Z"/>
                  <path class="pqr-44" d="M530.84,866.67c-.23.22-.46.44-.7.65-.31.29-.64.58-.95.87-.18.09-.36.18-.54.27-.34.16-.68.33-1.02.49.34-.3.68-.61,1.01-.91.25-.23.51-.46.76-.69.34-.16.68-.32,1.01-.48.14-.07.29-.14.43-.21Z"/>
                  <path class="pqr-446" d="M532,865.58c-.15.15-.31.3-.47.44-.23.21-.46.43-.69.65-.14.07-.28.14-.43.21-.33.16-.67.32-1.01.48.25-.23.5-.46.74-.68.17-.16.34-.31.5-.46.34-.15.67-.31,1.01-.47.11-.05.23-.11.34-.16Z"/>
                  <path class="pqr-112" d="M532.97,864.63c-.17.17-.34.34-.52.51-.15.14-.3.29-.45.44-.11.06-.23.11-.34.16-.33.16-.67.31-1.01.47.17-.15.33-.31.49-.46.18-.17.35-.34.52-.51.33-.15.67-.3.99-.45.1-.05.21-.1.32-.16Z"/>
                  <path class="pqr-406" d="M534.71,862.65c-.39.5-.8.99-1.23,1.46-.17.18-.33.35-.5.52-.11.05-.21.11-.32.16-.33.16-.66.31-.99.45.17-.17.34-.35.51-.52.43-.47.85-.95,1.24-1.45.32-.13.64-.27.96-.42.11-.05.22-.12.34-.2Z"/>
                  <path class="pqr-331" d="M537.41,858.41c-.48.93-1.01,1.83-1.59,2.7-.35.53-.72,1.04-1.11,1.54-.11.08-.23.15-.34.2-.32.15-.64.28-.96.42.4-.5.77-1.01,1.13-1.54.59-.87,1.13-1.77,1.62-2.71.29-.11.58-.23.86-.35.13-.05.26-.15.39-.26Z"/>
                  <path class="pqr-394" d="M539.86,851.96c-.32,1.22-.71,2.42-1.17,3.6-.38.97-.81,1.92-1.28,2.85-.13.11-.26.21-.39.26-.28.12-.57.24-.86.35.49-.94.93-1.9,1.32-2.88.47-1.2.88-2.43,1.21-3.68.24-.08.49-.17.73-.26.15-.05.3-.14.45-.24Z"/>
                  <path class="pqr-353" d="M540.79,847.05c-.05.41-.1.83-.17,1.25-.19,1.22-.44,2.45-.76,3.67-.15.1-.3.19-.45.24-.24.09-.48.18-.73.26.33-1.25.6-2.51.8-3.78.07-.42.12-.84.17-1.26.22-.05.44-.11.66-.18.16-.05.32-.12.48-.19Z"/>
                  <path class="pqr-416" d="M541.04,844.19c-.04.6-.08,1.15-.12,1.62-.04.41-.08.83-.13,1.24-.16.07-.32.14-.48.19-.21.07-.43.13-.66.18.05-.42.09-.84.13-1.26.04-.48.09-1.06.13-1.67.21-.03.42-.07.63-.13.17-.04.33-.1.49-.17Z"/>
                  <path class="pqr-323" d="M541.24,840.66c-.03.55-.05,1.07-.09,1.59-.04.68-.08,1.34-.12,1.94-.16.06-.33.12-.49.17-.21.06-.42.1-.63.13.04-.61.08-1.29.12-1.99.03-.51.06-1.02.09-1.57.2-.03.41-.07.61-.12.17-.04.34-.09.51-.15Z"/>
                  <path class="pqr-390" d="M542.12,642.06c0,52.2-.01,101.61-.02,131.12,0,9.26,0,17.08-.02,23.09-.03,12.77-.3,32.04-.76,42.71-.02.58-.05,1.13-.08,1.68-.17.06-.34.11-.51.15-.21.05-.41.08-.61.12.03-.55.05-1.1.08-1.68.55-11.01.82-30.85.84-44.32,0-6.08,0-13.8,0-22.83,0-30.89.02-82.85.03-137.25.2,4.08.4,8.16.61,10.98.15.7.3-1.53.45-3.77Z"/>
                  <path class="pqr-363" d="M542.2,425.13c.01,1.41.02,2.83.03,4.24.11,17.31-.1,65.02-.11,121.39,0,29.09,0,60.67-.01,91.3-.15,2.24-.29,4.47-.45,3.77-.21-2.83-.41-6.91-.61-10.98.01-87.5.03-180.92.03-205.43,0-1.42,0-2.82,0-4.24.19-1.34.39-2.68.58-2.67.19.02.36,1.32.53,2.62Z"/>
                  <path class="pqr-212" d="M542.07,416.32c.03,1.43.07,2.99.09,4.57.02,1.41.03,2.83.05,4.24-.17-1.3-.34-2.6-.53-2.62-.19-.02-.38,1.32-.58,2.67,0-1.42,0-2.82,0-4.24,0-1.59,0-3.14,0-4.57.19-.37.39-.74.58-.74.18,0,.29.34.4.69Z"/>
                  <path class="pqr-145" d="M542.16,412.06c-.01.14-.03.29-.04.45-.08,1.08-.07,2.38-.05,3.81-.11-.35-.21-.7-.4-.69-.19,0-.38.37-.58.74,0-1.43,0-2.73,0-3.83v-.46c.19-.08.39-.17.58-.17.18,0,.33.07.48.15Z"/>
                  <path class="pqr-324" d="M542.2,411.65c-.02.13-.03.27-.05.41-.15-.08-.31-.16-.48-.15-.19,0-.38.08-.58.17v-.43c.19,0,.39,0,.58,0,.18,0,.36,0,.53,0Z"/>
                  <path class="pqr-301" d="M528.62,869.23c-.34.32-.66.64-.98.92-.34.21-.68.41-1.02.6-.25.14-.5.28-.75.42.37-.32.75-.66,1.15-1.02.23-.12.46-.25.68-.37.31-.17.62-.35.92-.54Z"/>
                  <path class="pqr-233" d="M530.45,867.5c-.27.26-.53.52-.79.75-.35.32-.69.65-1.03.97-.31.19-.62.37-.92.54-.23.13-.45.25-.68.37.4-.36.8-.73,1.22-1.1.31-.28.63-.57.95-.86.18-.09.36-.19.54-.28.24-.13.48-.27.72-.4Z"/>
                  <path class="pqr-289" d="M531.83,866.15c-.19.2-.39.4-.59.58-.26.24-.53.51-.79.77-.24.14-.48.27-.72.4-.18.1-.36.19-.54.28.32-.29.64-.58.95-.87.24-.22.47-.44.7-.65.14-.07.28-.14.42-.21.19-.1.38-.2.57-.3Z"/>
                  <path class="pqr-136" d="M532.79,865.18c-.13.13-.26.27-.39.4-.19.18-.38.38-.57.58-.19.1-.38.2-.57.3-.14.07-.28.14-.42.21.23-.22.46-.44.69-.65.16-.15.31-.3.47-.44.11-.06.23-.11.34-.17.15-.08.31-.15.46-.23Z"/>
                  <path class="pqr-174" d="M533.72,864.22c-.18.19-.36.37-.54.56-.13.12-.25.26-.38.39-.15.08-.3.15-.46.23-.11.06-.23.11-.34.17.15-.15.3-.29.45-.44.18-.17.35-.34.52-.51.11-.05.21-.11.32-.17.14-.08.29-.16.43-.24Z"/>
                  <path class="pqr-112" d="M535.52,862.08c-.41.53-.83,1.06-1.28,1.57-.17.2-.34.38-.52.57-.14.08-.29.16-.43.24-.11.06-.21.11-.32.17.17-.17.34-.34.5-.52.43-.47.84-.96,1.23-1.46.11-.08.23-.16.34-.23.15-.09.31-.22.47-.34Z"/>
                  <path class="pqr-293" d="M538.32,857.65c-.49.95-1.04,1.88-1.64,2.79-.36.55-.75,1.1-1.15,1.63-.16.13-.32.25-.47.34-.11.07-.23.15-.34.23.39-.5.76-1.01,1.11-1.54.58-.87,1.11-1.77,1.59-2.7.13-.11.26-.22.39-.3.17-.1.35-.28.52-.46Z"/>
                  <path class="pqr-383" d="M540.87,851.19c-.34,1.2-.74,2.39-1.22,3.58-.39.97-.84,1.94-1.33,2.89-.18.18-.35.36-.52.46-.12.08-.25.19-.39.3.48-.93.9-1.88,1.28-2.85.46-1.18.85-2.38,1.17-3.6.15-.1.3-.2.44-.29.19-.12.38-.3.57-.48Z"/>
                  <path class="pqr-376" d="M541.87,846.41c-.06.4-.12.8-.19,1.2-.21,1.18-.48,2.38-.81,3.58-.19.18-.38.36-.57.48-.14.09-.29.2-.44.29.32-1.22.57-2.44.76-3.67.06-.41.12-.83.17-1.25.16-.07.31-.15.47-.24.21-.12.41-.25.61-.39Z"/>
                  <path class="pqr-201" d="M542.16,843.71c-.04.55-.09,1.07-.14,1.52-.04.39-.09.79-.15,1.19-.2.14-.4.27-.61.39-.15.09-.31.17-.47.24.05-.41.09-.83.13-1.24.04-.47.08-1.03.12-1.62.16-.06.32-.13.48-.19.21-.08.43-.18.64-.29Z"/>
                  <path class="pqr-329" d="M542.41,840.24c-.03.58-.07,1.16-.12,1.74-.04.59-.08,1.18-.13,1.73-.21.1-.42.21-.64.29-.16.06-.32.13-.48.19.04-.6.08-1.26.12-1.94.03-.52.06-1.04.09-1.59.17-.06.34-.12.5-.17.22-.07.45-.16.67-.25Z"/>
                  <path class="pqr-413" d="M543.09,630.72c.01,44.87.02,90.11,0,128.33,0,2.11,0,4.19,0,6.25-.01,30.71.11,56.49-.59,73.21-.02.58-.05,1.16-.09,1.74-.22.09-.44.18-.67.25-.16.05-.33.11-.5.17.03-.55.05-1.1.08-1.68.46-10.67.73-29.94.76-42.71.02-6.01.02-13.83.02-23.09,0-29.5.01-78.92.02-131.12.15-2.24.29-4.48.44-3.79.19-2.6.36-5.08.53-7.55Z"/>
                  <path class="pqr-75" d="M543.19,427.76c0,2.16.01,4.32.02,6.48.06,24.23-.15,67.44-.14,117.2,0,25.23.01,52.17.02,79.28-.17,2.47-.33,4.94-.53,7.55-.15-.69-.29,1.55-.44,3.79,0-30.62,0-62.21.01-91.3,0-56.38.21-104.08.11-121.39,0-1.41-.02-2.83-.03-4.24.17,1.3.34,2.6.52,2.62.18.02.33.02.47.02Z"/>
                  <path class="pqr-188" d="M543.11,417.04c0,1.42.05,2.84.05,4.25.01,2.16.02,4.32.03,6.47-.14,0-.29,0-.47-.02-.19-.02-.35-1.32-.52-2.62-.01-1.41-.03-2.83-.05-4.24-.01-1.58-.06-3.13-.09-4.57.11.35.21.7.39.7.21,0,.43.02.65.02Z"/>
                  <path class="pqr-246" d="M543.3,412.21c-.03.19-.05.4-.07.61-.11,1.39-.14,2.81-.13,4.22-.22,0-.44-.02-.65-.02-.18,0-.28-.35-.39-.7-.03-1.43-.03-2.74.05-3.81.01-.15.02-.3.04-.45.15.08.3.16.47.16.23,0,.46,0,.67,0Z"/>
                  <path class="pqr-366" d="M543.41,411.65c-.04.17-.08.37-.11.56-.22,0-.44.01-.67,0-.17,0-.32-.08-.47-.16.01-.14.03-.28.05-.41.18,0,.35,0,.52,0,.23,0,.46,0,.69,0Z"/>
                  <path class="pqr-36" d="M530.18,868.22c-.28.28-.56.55-.83.79-.23.17-.46.33-.7.48-.33.23-.67.44-1.01.65.32-.28.65-.59.98-.92.31-.19.62-.38.92-.58.21-.14.42-.28.63-.43Z"/>
                  <path class="pqr-451" d="M531.66,866.76c-.21.22-.42.43-.63.63-.29.27-.57.55-.85.83-.21.15-.42.29-.63.43-.3.2-.61.39-.92.58.34-.32.68-.66,1.03-.97.26-.24.53-.5.79-.75.24-.14.48-.28.72-.43.17-.1.33-.21.5-.31Z"/>
                  <path class="pqr-79" d="M532.77,865.62c-.16.17-.32.35-.48.5-.21.21-.42.42-.63.64-.16.11-.33.21-.5.31-.24.15-.48.29-.72.43.27-.26.53-.52.79-.77.2-.19.39-.39.59-.58.19-.1.37-.21.56-.31.13-.07.26-.15.39-.23Z"/>
                  <path class="pqr-278" d="M533.56,864.78c-.1.12-.21.23-.32.34-.15.16-.31.33-.47.5-.13.08-.26.15-.39.23-.18.11-.37.21-.56.31.19-.2.38-.4.57-.58.13-.13.26-.26.39-.4.15-.08.3-.16.45-.24.1-.06.21-.11.31-.17Z"/>
                  <path class="pqr-442" d="M534.44,863.8c-.19.21-.38.43-.57.64-.1.11-.21.22-.31.34-.1.06-.21.11-.31.17-.15.08-.3.16-.45.24.13-.13.26-.27.38-.39.18-.19.36-.37.54-.56.14-.08.29-.17.43-.25.1-.06.2-.12.29-.17Z"/>
                  <path class="pqr-225" d="M536.31,861.47c-.42.57-.86,1.13-1.32,1.68-.18.21-.36.43-.55.64-.1.06-.2.12-.29.17-.14.08-.28.17-.43.25.18-.19.35-.38.52-.57.45-.51.87-1.04,1.28-1.57.16-.13.32-.26.47-.36.11-.07.21-.16.32-.24Z"/>
                  <path class="pqr-321" d="M539.18,856.84c-.51.98-1.07,1.95-1.68,2.91-.37.58-.77,1.16-1.19,1.72-.11.09-.22.17-.32.24-.15.1-.31.23-.47.36.4-.53.79-1.08,1.15-1.63.6-.91,1.15-1.84,1.64-2.79.18-.18.35-.36.51-.49.11-.08.23-.21.35-.32Z"/>
                  <path class="pqr-20" d="M541.79,850.32c-.35,1.18-.76,2.38-1.25,3.58-.4.98-.85,1.97-1.36,2.95-.12.12-.24.24-.35.32-.16.12-.34.31-.51.49.49-.95.94-1.91,1.33-2.89.48-1.19.88-2.38,1.22-3.58.19-.18.37-.37.55-.52.13-.1.25-.23.37-.35Z"/>
                  <path class="pqr-381" d="M542.85,845.69c-.06.37-.14.75-.21,1.13-.22,1.14-.5,2.31-.85,3.5-.12.13-.25.25-.37.35-.18.15-.36.33-.55.52.34-1.2.61-2.39.81-3.58.07-.4.13-.8.19-1.2.2-.14.4-.28.59-.43.13-.1.27-.2.4-.3Z"/>
                  <path class="pqr-238" d="M543.19,843.2c-.05.48-.1.94-.16,1.37-.05.37-.11.74-.17,1.11-.13.1-.26.2-.4.3-.19.14-.39.29-.59.43.06-.4.1-.8.15-1.19.05-.45.1-.97.14-1.52.21-.1.42-.21.62-.3.14-.06.28-.14.42-.21Z"/>
                  <path class="pqr-265" d="M543.49,839.8c-.04.63-.1,1.27-.16,1.92-.04.5-.09,1-.14,1.47-.14.07-.28.14-.42.21-.2.09-.41.2-.62.3.04-.55.09-1.13.13-1.73.05-.59.09-1.16.12-1.74.22-.09.44-.18.65-.26.15-.05.29-.12.44-.18Z"/>
                  <path class="pqr-222" d="M544.02,623.19c0,48.5,0,97.82-.02,138.71,0,1.9,0,3.78,0,5.64,0,29.51.26,54.24-.4,70.44-.02.58-.06,1.19-.1,1.82-.14.06-.29.12-.44.18-.21.08-.43.17-.65.26.03-.58.06-1.16.09-1.74.7-16.72.58-42.49.59-73.21,0-2.06,0-4.15,0-6.25.01-38.22,0-83.45,0-128.33.17-2.47.33-4.92.51-7.47.14-.04.29-.05.43-.06Z"/>
                  <path class="pqr-198" d="M544.18,427.69c-.01,2.15-.04,4.31-.05,6.46-.1,35.38-.11,111.15-.11,189.04-.14.01-.29.03-.43.06-.18,2.55-.34,5.01-.51,7.47,0-27.11-.01-54.06-.02-79.28,0-49.76.21-92.97.14-117.2,0-2.16-.01-4.32-.02-6.48.14,0,.28-.02.44-.05.17-.04.36-.03.54-.03Z"/>
                  <path class="pqr-95" d="M544.07,416.91c0,1.46.05,2.94.07,4.32.05,2.15.04,4.3.03,6.45-.18,0-.37,0-.54.03-.16.03-.3.04-.44.05,0-2.16-.02-4.32-.03-6.47,0-1.4-.05-2.83-.05-4.25.22,0,.43,0,.62-.03.15-.03.25-.06.34-.1Z"/>
                  <path class="pqr-8" d="M544.39,412.15c-.04.17-.07.37-.09.56-.17,1.3-.22,2.74-.22,4.2-.09.04-.19.08-.34.1-.19.03-.4.03-.62.03,0-1.42.01-2.83.13-4.22.02-.21.04-.42.07-.61.22,0,.43-.02.65-.03.14,0,.29-.02.44-.03Z"/>
                  <path class="pqr-407" d="M544.53,411.65c-.05.15-.1.32-.14.5-.14,0-.29.02-.44.03-.22.01-.43.03-.65.03.03-.19.07-.39.11-.56.23,0,.45,0,.66,0,.15,0,.3,0,.45,0Z"/>
                  <path class="pqr-82" d="M531.59,867.18c-.23.22-.46.44-.69.65-.29.23-.57.46-.86.68-.23.17-.46.34-.69.51.27-.24.55-.51.83-.79.21-.15.42-.3.63-.45.26-.19.52-.39.78-.6Z"/>
                  <path class="pqr-388" d="M532.77,866c-.16.17-.32.34-.5.5-.23.22-.46.45-.69.67-.26.2-.52.4-.78.6-.21.15-.42.3-.63.45.28-.28.57-.57.85-.83.21-.2.42-.41.63-.63.16-.11.33-.22.49-.33.21-.14.41-.29.61-.43Z"/>
                  <path class="pqr-33" d="M533.64,865.08c-.12.14-.25.28-.38.41-.17.17-.32.34-.49.51-.2.15-.41.29-.61.43-.16.11-.33.22-.49.33.21-.22.42-.43.63-.64.16-.16.32-.33.48-.5.13-.08.26-.15.38-.23.16-.1.32-.2.48-.31Z"/>
                  <path class="pqr-141" d="M534.26,864.39c-.08.09-.16.19-.25.28-.12.13-.25.27-.37.41-.16.1-.32.21-.48.31-.13.08-.25.16-.38.23.16-.17.32-.35.47-.5.11-.11.21-.22.32-.34.1-.06.21-.11.31-.17.13-.07.26-.14.39-.22Z"/>
                  <path class="pqr-192" d="M535.09,863.42c-.19.23-.39.47-.59.69-.08.09-.16.18-.25.28-.13.07-.26.14-.39.22-.1.06-.21.11-.31.17.1-.12.21-.23.31-.34.19-.21.38-.42.57-.64.1-.06.19-.12.29-.17.12-.07.24-.14.36-.21Z"/>
                  <path class="pqr-325" d="M537.01,860.95c-.43.6-.88,1.19-1.36,1.78-.18.23-.37.46-.57.69-.12.07-.24.14-.36.21-.1.06-.19.11-.29.17.19-.21.37-.43.55-.64.46-.55.9-1.12,1.32-1.68.11-.09.21-.17.32-.24.13-.09.26-.19.39-.29Z"/>
                  <path class="pqr-239" d="M539.95,856.14c-.51,1-1.08,2-1.72,3-.38.6-.79,1.21-1.22,1.8-.13.1-.26.21-.39.29-.1.07-.21.15-.32.24.42-.57.81-1.14,1.19-1.72.62-.96,1.18-1.93,1.68-2.91.12-.12.23-.24.34-.32.14-.1.28-.25.42-.39Z"/>
                  <path class="pqr-293" d="M542.6,849.58c-.36,1.17-.78,2.36-1.28,3.57-.41.99-.87,1.99-1.38,2.99-.14.14-.29.29-.42.39-.11.08-.23.2-.34.32.51-.98.96-1.96,1.36-2.95.49-1.2.9-2.39,1.25-3.58.12-.13.24-.25.36-.34.15-.12.3-.26.45-.39Z"/>
                  <path class="pqr-19" d="M543.72,845.07c-.07.36-.15.72-.23,1.09-.24,1.11-.53,2.26-.89,3.43-.15.13-.3.28-.45.39-.12.09-.24.22-.36.34.35-1.18.63-2.35.85-3.5.07-.39.15-.76.21-1.13.13-.1.26-.2.39-.29.16-.12.32-.23.48-.33Z"/>
                  <path class="pqr-413" d="M544.09,842.75c-.06.42-.12.83-.18,1.25-.06.36-.12.7-.19,1.06-.16.1-.31.21-.48.33-.13.09-.26.19-.39.29.06-.37.12-.74.17-1.11.06-.44.11-.9.16-1.37.14-.07.27-.14.41-.2.17-.08.33-.16.5-.24Z"/>
                  <path class="pqr-299" d="M544.44,839.43c-.05.66-.12,1.36-.2,2.06-.04.42-.09.84-.15,1.26-.16.08-.33.17-.5.24-.13.06-.27.13-.41.2.05-.48.1-.97.14-1.47.07-.65.12-1.3.16-1.92.14-.06.29-.12.43-.17.17-.06.35-.13.52-.2Z"/>
                  <path class="pqr-15" d="M544.87,631.58c-.06,58.53-.1,116.51-.13,155.18-.01,22.8.14,40.06-.14,48.62-.01.67-.03,1.4-.06,2.17-.02.58-.06,1.22-.11,1.88-.17.07-.35.14-.52.2-.14.05-.28.11-.43.17.04-.63.08-1.24.1-1.82.66-16.21.4-40.93.4-70.44,0-1.86,0-3.74,0-5.64.02-40.89.02-90.21.02-138.71.14-.01.28-.03.41-.07.15,3.09.3,5.78.44,8.47Z"/>
                  <path class="pqr-390" d="M545.16,421.9c-.01,1.45-.04,2.98-.04,4.57-.07,26.61-.16,116.43-.25,205.11-.14-2.69-.29-5.38-.44-8.47-.13.04-.27.05-.41.07,0-77.89,0-153.66.11-189.04,0-2.15.03-4.3.05-6.46.18,0,.36,0,.52-.05.17-1.92.32-3.83.46-5.74Z"/>
                  <path class="pqr-415" d="M545.01,415.16c.01.89.07,1.8.1,2.61.05,1.3.05,2.68.04,4.13-.14,1.91-.29,3.81-.46,5.74-.16.05-.34.06-.52.05.01-2.15.02-4.31-.03-6.45-.03-1.38-.08-2.86-.07-4.32.09-.04.18-.09.32-.13.18-.59.4-1.1.62-1.62Z"/>
                  <path class="pqr-40" d="M545.32,412.14c-.05.17-.09.35-.13.53-.15.73-.19,1.6-.17,2.49-.22.51-.44,1.03-.62,1.62-.14.05-.23.09-.32.13,0-1.46.05-2.9.22-4.2.02-.2.05-.39.09-.56.14-.01.29-.02.42-.04.18.02.35.02.51.03Z"/>
                  <path class="pqr-192" d="M545.49,411.65c-.07.16-.13.32-.18.49-.16,0-.33-.02-.51-.03-.13.02-.28.03-.42.04.04-.17.08-.35.14-.5.15,0,.29,0,.44,0,.18,0,.36,0,.53,0Z"/>
                  <path class="pqr-313" d="M532.35,866.55c-.2.19-.4.37-.61.55-.28.25-.56.49-.85.72.23-.2.46-.43.69-.65.26-.2.52-.41.77-.63Z"/>
                  <path class="pqr-66" d="M533.38,865.54c-.14.15-.29.29-.43.44-.19.19-.39.38-.59.57-.25.21-.51.42-.77.63.23-.22.46-.45.69-.67.17-.16.33-.33.5-.5.2-.15.41-.3.61-.46Z"/>
                  <path class="pqr-440" d="M534.12,864.75c-.1.11-.21.23-.32.34-.14.15-.28.3-.42.44-.2.16-.4.31-.61.46.16-.17.32-.34.49-.51.13-.13.25-.27.38-.41.16-.1.32-.21.48-.32Z"/>
                  <path class="pqr-220" d="M534.64,864.17c-.07.08-.14.16-.21.24-.1.12-.21.23-.31.35-.16.11-.32.22-.48.32.12-.14.25-.28.37-.41.08-.09.17-.19.25-.28.13-.07.26-.15.38-.22Z"/>
                  <path class="pqr-447" d="M535.44,863.23c-.19.23-.39.47-.59.7-.07.08-.14.16-.21.24-.13.07-.25.15-.38.22.08-.09.16-.19.25-.28.2-.22.4-.46.59-.69.12-.07.24-.13.35-.19Z"/>
                  <path class="pqr-23" d="M537.39,860.69c-.43.61-.89,1.23-1.38,1.84-.19.23-.38.47-.57.7-.12.06-.23.13-.35.19.19-.23.38-.47.57-.69.48-.59.93-1.19,1.36-1.78.13-.1.26-.19.38-.26Z"/>
                  <path class="pqr-253" d="M540.36,855.8c-.52,1.01-1.09,2.02-1.73,3.04-.39.62-.8,1.23-1.23,1.85-.12.06-.25.16-.38.26.43-.6.83-1.2,1.22-1.8.63-.99,1.2-2,1.72-3,.14-.14.28-.27.41-.34Z"/>
                  <path class="pqr-83" d="M543.04,849.26c-.36,1.16-.79,2.34-1.29,3.55-.41.99-.87,1.99-1.39,3-.13.07-.27.2-.41.34.51-1,.97-2,1.38-2.99.5-1.2.92-2.4,1.28-3.57.15-.13.29-.25.44-.33Z"/>
                  <path class="pqr-218" d="M544.18,844.8c-.07.36-.15.72-.23,1.08-.25,1.09-.54,2.22-.91,3.37-.14.07-.29.19-.44.33.36-1.17.65-2.32.89-3.43.08-.37.16-.73.23-1.09.16-.1.31-.19.46-.27Z"/>
                  <path class="pqr-350" d="M544.57,842.53c-.06.4-.12.8-.2,1.21-.06.35-.13.7-.2,1.05-.15.08-.3.17-.46.27.07-.36.14-.71.19-1.06.07-.42.13-.83.18-1.25.16-.08.32-.16.48-.22Z"/>
                  <path class="pqr-33" d="M544.93,839.26c-.05.67-.12,1.37-.21,2.12-.05.38-.1.77-.16,1.16-.15.06-.31.14-.48.22.06-.42.1-.83.15-1.26.08-.71.15-1.41.2-2.06.17-.07.34-.13.5-.18Z"/>
                  <path class="pqr-172" d="M545.29,640.08c-.11,98.32-.2,192.35-.2,194.84,0,.7,0,1.54-.04,2.46-.02.58-.06,1.21-.11,1.88-.16.05-.33.11-.5.18.05-.66.09-1.29.11-1.88.03-.77.05-1.5.06-2.17.28-8.56.12-25.82.14-48.62.03-38.68.07-96.66.13-155.18.15,2.69.29,5.39.42,8.49Z"/>
                  <path class="pqr-438" d="M545.6,416.17c0,.75,0,1.65-.01,2.69-.06,17.86-.19,121.74-.3,221.22-.13-3.11-.27-5.8-.42-8.49.08-88.68.18-178.5.25-205.11,0-1.59.03-3.12.04-4.57.14-1.91.28-3.81.44-5.73Z"/>
                  <path class="pqr-37" d="M545.61,413.55c0,.27,0,.54,0,.8,0,.46,0,1.06,0,1.82-.15,1.92-.29,3.83-.44,5.73.01-1.45,0-2.83-.04-4.13-.03-.81-.09-1.72-.1-2.61.22-.51.43-1.03.59-1.61Z"/>
                  <path class="pqr-236" d="M545.8,412.18c-.05.18-.1.37-.13.57-.04.26-.06.53-.06.8-.16.59-.38,1.1-.59,1.61-.01-.89.02-1.76.17-2.49.03-.18.08-.36.13-.53.16,0,.32.02.48.03Z"/>
                  <path class="pqr-52" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                </g>
                <g>
                  <path class="pqr-50" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                  <path class="pqr-50" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                  <path class="pqr-50" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                  <path class="pqr-50" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                  <path class="pqr-50" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                  <path class="pqr-50" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                  <path class="pqr-50" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                  <path class="pqr-50" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                  <path class="pqr-50" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                  <path class="pqr-50" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                  <path class="pqr-50" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                  <path class="pqr-50" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                  <path class="pqr-50" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                  <path class="pqr-50" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                  <path class="pqr-50" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                  <path class="pqr-50" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                </g>
                <g>
                  <path class="pqr-50" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                  <path class="pqr-50" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                  <path class="pqr-50" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                  <path class="pqr-50" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                  <path class="pqr-50" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                  <path class="pqr-50" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                  <path class="pqr-50" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                  <path class="pqr-50" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                  <path class="pqr-50" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                  <path class="pqr-50" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                  <path class="pqr-50" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                  <path class="pqr-50" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                  <path class="pqr-50" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                  <path class="pqr-50" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                  <path class="pqr-50" d="M546,411.66c-.08.16-.14.34-.2.52-.16-.02-.32-.02-.48-.03.05-.17.11-.33.18-.49.17,0,.34,0,.51,0Z"/>
                </g>
              </g>
            </g>
          </g>
        </g>
        {/* <g>
          <g>
            <g>
              <path class="pqr-45" d="M325.44,644.1c-.03.38-.07.76-.07,1.14v40.28h611v-40.28c0-.38-.04-.75-.08-1.14H325.44Z"/>
              <path class="pqr-194" d="M936.38,685.82H325.38c-.17,0-.3-.13-.3-.3v-40.28c0-.3.02-.61.05-.91l.02-.25c0-.16.14-.28.29-.28h610.86c.15,0,.28.11.29.26.04.37.08.77.08,1.16v40.28c0,.17-.13.3-.29.3ZM325.68,685.23h610.41v-39.99c0-.28-.01-.56-.04-.83H325.72c-.02.28-.04.56-.04.83v39.99Z"/>
            </g>
            <path class="pqr-206" d="M325.86,644.1c-.05.38-.08.76-.08,1.14v3.61s0-3.89,3.36-3.89h604.51s2.73.45,2.73,2.52v-2.24c0-.38-.04-.75-.07-1.14H325.86Z"/>
            <g class="pqr-138">
              <path class="pqr-103" d="M817.91,660.91c-84.15-10.42-68.29,4.73-197.57,6.62-103.86,1.53-243.91-6.12-294.97-9.18v5.75c37.63,1.9,108.59,5.5,158.37,8.16,70.73,3.8,146.22.26,204.89,6.16,65.86,6.62,103.67,4.74,160.97,1.89,0,0,40.54-3.08,86.77-1.38v-7.84c-42.38,4.01-57.02-2.58-118.47-10.19ZM755.64,675.79c-70.73-1.25-62.56-4.24-21.01-10.01,41.55-5.76,86.94,3.85,86.94,3.85,23.53,3.89,4.77,7.41-65.93,6.16Z"/>
              <path class="pqr-105" d="M784.22,651.04s36.12,2.7,86.12,10.46c27.13,4.2,47.61,5.55,66.04,2.04v-5.5c-35.77,6.04-103.41-6.16-152.16-6.99Z"/>
              <path class="pqr-105" d="M429.69,655.49c-74.21.86,79.13,8.14,184.45,5.64,0,0-110.25-6.48-184.45-5.64Z"/>
              <path class="pqr-105" d="M683.23,656.31c-35.38,5.62-70.05,3.02-50.63,4.75,19.42,1.72,50.63-1.73,77.67-6.05,21.69-3.45,63.13-3.87,63.13-3.87-32.6-3.03-54.79-.44-90.16,5.17Z"/>
              <path class="pqr-108" d="M478.27,678.87s-90.86-7.33-132.93-4.01c-42.08,3.35,14.02,4.01,73.17,5.67,59.15,1.68,91.47,0,59.76-1.67Z"/>
              <path class="pqr-104" d="M761.49,672.91c-37.75-.98-33.36-2.26-11.13-4.53,22.24-2.28,46.39,2.23,46.39,2.23,12.53,1.86,2.49,3.29-35.27,2.3Z"/>
            </g>
            <g class="pqr-102">
              <path class="pqr-443" d="M664.13,685.52c-42.02-5.05-66.12-4.21-106.6-.17-.61.05-1.16.11-1.76.17h108.35Z"/>
            </g>
            <path class="pqr-3" d="M936.38,685.82H325.38c-.17,0-.3-.13-.3-.3v-40.28c0-.3.02-.61.05-.91l.02-.25c0-.16.14-.28.29-.28h610.86c.15,0,.28.11.29.26.04.37.08.77.08,1.16v40.28c0,.17-.13.3-.29.3ZM325.68,685.23h610.41v-39.99c0-.28-.01-.56-.04-.83H325.72c-.02.28-.04.56-.04.83v39.99Z"/>
          </g>
          <g>
            <g>
              <path class="pqr-167" d="M325.44,780.71c-.03.37-.07.75-.07,1.13v40.29h611v-40.29c0-.37-.04-.75-.08-1.13H325.44Z"/>
              <path class="pqr-194" d="M936.38,822.42H325.38c-.17,0-.3-.13-.3-.3v-40.29c0-.3.03-.61.05-.92l.02-.23c0-.16.14-.28.29-.28h610.86c.15,0,.28.12.29.26.04.35.08.76.08,1.16v40.29c0,.16-.13.3-.29.3ZM325.68,821.83h610.41v-39.99c0-.28-.02-.57-.04-.83H325.72c-.02.28-.04.56-.04.83v39.99Z"/>
            </g>
            <path class="pqr-217" d="M325.86,780.71c-.05.37-.08.75-.08,1.13v3.62s0-3.89,3.36-3.89h604.51s2.73.45,2.73,2.52v-2.25c0-.37-.04-.75-.07-1.13H325.86Z"/>
            <g class="pqr-138">
              <path class="pqr-103" d="M817.91,797.52c-84.15-10.42-68.29,4.72-197.57,6.62-103.86,1.53-243.91-6.12-294.97-9.18v5.75c37.63,1.89,108.59,5.5,158.37,8.16,70.73,3.8,146.22.26,204.89,6.16,65.86,6.62,103.67,4.73,160.97,1.89,0,0,40.54-3.07,86.77-1.37v-7.83c-42.38,4.01-57.02-2.58-118.47-10.19ZM755.64,812.4c-70.73-1.25-62.56-4.24-21.01-10.02,41.55-5.76,86.94,3.85,86.94,3.85,23.53,3.89,4.77,7.42-65.93,6.17Z"/>
              <path class="pqr-105" d="M784.22,787.64s36.12,2.7,86.12,10.46c27.13,4.21,47.61,5.55,66.04,2.03v-5.51c-35.77,6.06-103.41-6.15-152.16-6.98Z"/>
              <path class="pqr-105" d="M429.69,792.1c-74.21.85,79.13,8.13,184.45,5.63,0,0-110.25-6.48-184.45-5.63Z"/>
              <path class="pqr-105" d="M683.23,792.92c-35.38,5.62-70.05,3.01-50.63,4.75,19.42,1.73,50.63-1.73,77.67-6.04,21.69-3.46,63.13-3.87,63.13-3.87-32.6-3.03-54.79-.43-90.16,5.17Z"/>
              <path class="pqr-108" d="M478.27,815.47s-90.86-7.33-132.93-4.01c-42.08,3.34,14.02,4.01,73.17,5.67,59.15,1.67,91.47,0,59.76-1.67Z"/>
              <path class="pqr-104" d="M761.49,809.51c-37.75-.98-33.36-2.26-11.13-4.53,22.24-2.27,46.39,2.23,46.39,2.23,12.53,1.85,2.49,3.28-35.27,2.3Z"/>
            </g>
            <g class="pqr-102">
              <path class="pqr-443" d="M664.13,822.13c-42.02-5.06-66.12-4.2-106.6-.17-.61.06-1.16.11-1.76.17h108.35Z"/>
            </g>
            <path class="pqr-3" d="M936.38,822.42H325.38c-.17,0-.3-.13-.3-.3v-40.29c0-.3.03-.61.05-.92l.02-.23c0-.16.14-.28.29-.28h610.86c.15,0,.28.12.29.26.04.35.08.76.08,1.16v40.29c0,.16-.13.3-.29.3ZM325.68,821.83h610.41v-39.99c0-.28-.02-.57-.04-.83H325.72c-.02.28-.04.56-.04.83v39.99Z"/>
          </g>
          <g>
            <g>
              <path class="pqr-343" d="M325.44,870.62c-.03.16-.07.31-.07.46v16.44h611v-16.44c0-.16-.04-.31-.08-.46H325.44Z"/>
              <path class="pqr-194" d="M936.38,887.83H325.38c-.17,0-.3-.13-.3-.3v-16.44c0-.14.03-.28.05-.42l.02-.1c.02-.14.14-.25.29-.25h610.86c.13,0,.25.09.29.22.05.19.08.36.08.54v16.44c0,.17-.13.3-.29.3ZM325.68,887.23h610.41v-16.15c0-.05,0-.11-.01-.17H325.69c-.01.05-.01.11-.01.17v16.15Z"/>
            </g>
            <path class="pqr-309" d="M325.86,870.62c-.05.16-.08.31-.08.46v1.47s0-1.59,3.36-1.59h604.51s2.73.19,2.73,1.03v-.92c0-.16-.04-.31-.07-.46H325.86Z"/>
            <g class="pqr-138">
              <path class="pqr-103" d="M817.91,877.48c-84.15-4.25-68.29,1.94-197.57,2.71-103.86.62-243.91-2.5-294.97-3.75v2.35c37.63.78,108.59,2.24,158.37,3.33,70.73,1.55,146.22.11,204.89,2.51,65.86,2.7,103.67,1.93,160.97.77,0,0,40.54-1.26,86.77-.56v-3.2c-42.38,1.63-57.02-1.06-118.47-4.16ZM755.64,883.55c-70.73-.51-62.56-1.73-21.01-4.09,41.55-2.35,86.94,1.57,86.94,1.57,23.53,1.59,4.77,3.03-65.93,2.52Z"/>
              <path class="pqr-105" d="M784.22,873.45s36.12,1.1,86.12,4.27c27.13,1.72,47.61,2.27,66.04.83v-2.25c-35.77,2.47-103.41-2.51-152.16-2.85Z"/>
              <path class="pqr-105" d="M429.69,875.27c-74.21.34,79.13,3.32,184.45,2.3,0,0-110.25-2.64-184.45-2.3Z"/>
              <path class="pqr-105" d="M683.23,875.6c-35.38,2.29-70.05,1.23-50.63,1.93,19.42.71,50.63-.7,77.67-2.46,21.69-1.41,63.13-1.58,63.13-1.58-32.6-1.23-54.79-.18-90.16,2.11Z"/>
              <path class="pqr-108" d="M478.27,884.81s-90.86-3-132.93-1.64c-42.08,1.37,14.02,1.64,73.17,2.32,59.15.68,91.47,0,59.76-.68Z"/>
              <path class="pqr-104" d="M761.49,882.37c-37.75-.4-33.36-.92-11.13-1.85,22.24-.93,46.39.91,46.39.91,12.53.76,2.49,1.34-35.27.94Z"/>
            </g>
            <g class="pqr-102">
              <path class="pqr-443" d="M664.13,887.53c-42.02-2.07-66.12-1.72-106.6-.07-.61.02-1.16.05-1.76.07h108.35Z"/>
            </g>
            <path class="pqr-3" d="M936.38,887.83H325.38c-.17,0-.3-.13-.3-.3v-16.44c0-.14.03-.28.05-.42l.02-.1c.02-.14.14-.25.29-.25h610.86c.13,0,.25.09.29.22.05.19.08.36.08.54v16.44c0,.17-.13.3-.29.3ZM325.68,887.23h610.41v-16.15c0-.05,0-.11-.01-.17H325.69c-.01.05-.01.11-.01.17v16.15Z"/>
          </g>
          <g class="pqr-109">
            <rect class="pqr-3" x="884.47" y="645.08" width="51.34" height="40.69"/>
            <path class="pqr-3" d="M382.63,645.08h-57.19s-5.8-5.06-5.8-4.68v45.37h62.99v-40.69Z"/>
            <path class="pqr-3" d="M382.63,778.77h-57.19s-5.8-2.15-5.8-1.77v42.47h62.99v-40.7Z"/>
            <rect class="pqr-3" x="884.47" y="778.77" width="51.34" height="40.7"/>
            <path class="pqr-3" d="M382.63,865.96h-57.19s-5.8.12-5.8.27v17.16h62.99v-17.44Z"/>
            <path class="pqr-3" d="M884.47,865.96v17.44h51.34v-17.16c0-.11.11-.19.16-.27h-51.5Z"/>
          </g>
          <g>
            <g>
              <path class="pqr-254" d="M979.42,620.82c-.63-.01-1.25-.04-1.88-.04h-67.04v276.87h67.04c.63,0,1.25-.01,1.88-.03v-276.8Z"/>
              <path class="pqr-194" d="M977.54,897.95h-67.04c-.16,0-.29-.13-.29-.3v-276.87c0-.16.13-.3.29-.3h67.04c.48,0,.95.01,1.42.03h.47c.16.01.29.15.29.31v276.8c0,.16-.13.29-.29.3-.64.02-1.26.03-1.89.03ZM910.8,897.36h66.74c.53,0,1.06-.01,1.58-.03v-276.22h-.18c-.46-.01-.93-.03-1.4-.03h-66.74v276.28Z"/>
            </g>
            <path class="pqr-319" d="M979.42,621c-.63-.02-1.25-.03-1.88-.03h-6.02s6.48,0,6.48,1.53v273.92s-.76,1.24-4.19,1.24h3.73c.63,0,1.25-.02,1.88-.03v-276.62Z"/>
            <g class="pqr-138">
              <path class="pqr-103" d="M951.46,843.97c17.33-38.13-7.88-30.95-11.04-89.52-2.54-47.06,10.18-110.53,15.29-133.66h-9.57c-3.16,17.06-9.15,49.21-13.58,71.76-6.33,32.05-.44,66.26-10.25,92.84-11.03,29.85-7.89,46.98-3.15,72.95,0,0,5.11,18.37,2.27,39.32h13.04c-6.66-19.2,4.3-25.83,16.96-53.68ZM926.7,815.76c2.09-32.05,7.07-28.35,16.66-9.52,9.6,18.82-6.38,39.39-6.38,39.39-6.48,10.67-12.34,2.16-10.27-29.88Z"/>
              <path class="pqr-105" d="M967.88,828.71s-4.47,16.37-17.38,39.02c-7.01,12.3-9.26,21.58-3.4,29.92h9.16c-10.05-16.2,10.26-46.86,11.62-68.95Z"/>
              <path class="pqr-105" d="M960.47,668.06c-1.41-33.63-13.52,35.85-9.39,83.58,0,0,10.78-49.95,9.39-83.58Z"/>
              <path class="pqr-105" d="M959.1,782.95c-9.35-16.03-5.02-31.74-7.9-22.95-2.87,8.8,2.88,22.95,10.05,35.2,5.75,9.83,6.46,28.61,6.46,28.61,5.03-14.77.71-24.83-8.61-40.86Z"/>
              <path class="pqr-108" d="M921.57,690.07s12.2-41.17,6.67-60.24c-5.56-19.06-6.67,6.35-9.44,33.16-2.78,26.8,0,41.45,2.77,27.08Z"/>
              <path class="pqr-104" d="M931.49,818.41c1.63-17.11,3.75-15.13,7.54-5.05,3.78,10.08-3.71,21.02-3.71,21.02-3.09,5.67-5.47,1.13-3.82-15.97Z"/>
            </g>
            <g class="pqr-102">
              <path class="pqr-443" d="M910.5,774.29c8.42-19.04,7.01-29.96.28-48.31-.09-.26-.18-.53-.28-.79v49.1Z"/>
            </g>
            <path class="pqr-3" d="M977.54,897.95h-67.04c-.16,0-.29-.13-.29-.3v-276.87c0-.16.13-.3.29-.3h67.04c.48,0,.95.01,1.42.03h.47c.16.01.29.15.29.31v276.8c0,.16-.13.29-.29.3-.64.02-1.26.03-1.89.03ZM910.8,897.36h66.74c.53,0,1.06-.01,1.58-.03v-276.22h-.18c-.46-.01-.93-.03-1.4-.03h-66.74v276.28Z"/>
          </g>
          <g>
            <g>
              <path class="pqr-67" d="M363.98,620.82c-.62-.01-1.25-.04-1.88-.04h-67.03v276.87h67.03c.63,0,1.26-.01,1.88-.03v-276.8Z"/>
              <path class="pqr-194" d="M362.1,897.95h-67.03c-.17,0-.29-.13-.29-.3v-276.87c0-.16.13-.3.29-.3h67.03c.48,0,.95.01,1.43.03h.46c.16.01.29.15.29.31v276.8c0,.16-.13.29-.29.3-.63.01-1.26.03-1.89.03ZM295.36,897.36h66.73c.53,0,1.06-.01,1.58-.03v-276.22h-.17c-.47-.01-.94-.03-1.42-.03h-66.73v276.28Z"/>
            </g>
            <path class="pqr-330" d="M363.98,621c-.62-.02-1.25-.03-1.88-.03h-6.01s6.48,0,6.48,1.53v273.92s-.76,1.24-4.19,1.24h3.73c.63,0,1.26-.02,1.88-.03v-276.62Z"/>
            <g class="pqr-138">
              <path class="pqr-103" d="M336.02,843.97c17.33-38.13-7.88-30.95-11.04-89.52-2.54-47.06,10.18-110.53,15.29-133.66h-9.57c-3.15,17.06-9.15,49.21-13.57,71.76-6.33,32.05-.44,66.26-10.25,92.84-11.03,29.85-7.89,46.98-3.15,72.95,0,0,5.12,18.37,2.29,39.32h13.03c-6.68-19.2,4.3-25.83,16.96-53.68ZM311.25,815.76c2.09-32.05,7.07-28.35,16.66-9.52,9.6,18.82-6.39,39.39-6.39,39.39-6.47,10.67-12.34,2.16-10.27-29.88Z"/>
              <path class="pqr-105" d="M352.45,828.71s-4.49,16.37-17.4,39.02c-7,12.3-9.25,21.58-3.39,29.92h9.16c-10.05-16.2,10.26-46.86,11.63-68.95Z"/>
              <path class="pqr-105" d="M345.03,668.06c-1.42-33.63-13.52,35.85-9.38,83.58,0,0,10.78-49.95,9.38-83.58Z"/>
              <path class="pqr-105" d="M343.66,782.95c-9.35-16.03-5.02-31.74-7.91-22.95-2.85,8.8,2.89,22.95,10.06,35.2,5.75,9.83,6.46,28.61,6.46,28.61,5.03-14.77.71-24.83-8.61-40.86Z"/>
              <path class="pqr-108" d="M306.14,690.07s12.2-41.17,6.67-60.24c-5.57-19.06-6.67,6.35-9.45,33.16-2.78,26.8,0,41.45,2.78,27.08Z"/>
              <path class="pqr-104" d="M316.05,818.41c1.63-17.11,3.75-15.13,7.53-5.05,3.79,10.08-3.71,21.02-3.71,21.02-3.08,5.67-5.47,1.13-3.82-15.97Z"/>
            </g>
            <g class="pqr-102">
              <path class="pqr-443" d="M295.06,774.29c8.42-19.04,7.01-29.96.28-48.31-.1-.26-.19-.53-.28-.79v49.1Z"/>
            </g>
            <path class="pqr-3" d="M362.1,897.95h-67.03c-.17,0-.29-.13-.29-.3v-276.87c0-.16.13-.3.29-.3h67.03c.48,0,.95.01,1.43.03h.46c.16.01.29.15.29.31v276.8c0,.16-.13.29-.29.3-.63.01-1.26.03-1.89.03ZM295.36,897.36h66.73c.53,0,1.06-.01,1.58-.03v-276.22h-.17c-.47-.01-.94-.03-1.42-.03h-66.73v276.28Z"/>
          </g>
        </g> */}
      </g>
    </g>
    <g id="Layer_5" data-name="Layer 5">
      <g>
        <text class="pqr-128" transform="translate(611.98 631.95)"><tspan x="0" y="0">Acetic acid</tspan></text>
        <g>
          <line class="pqr-87" x1="607.62" y1="624.8" x2="563.07" y2="624.8"/>
          <path class="pqr-127" d="M553.03,624.8c4.72-1.75,10.59-4.74,14.22-7.91l-2.86,7.91,2.86,7.91c-3.63-3.17-9.49-6.16-14.22-7.91Z"/>
        </g>
      </g>
      <g>
        <text class="pqr-128" transform="translate(1636.33 928.78)"><tspan x="0" y="0">Litmus paper</tspan></text>
        <g>
          <line class="pqr-87" x1="1631.97" y1="921.64" x2="1587.42" y2="921.64"/>
          <path class="pqr-127" d="M1577.38,921.64c4.72-1.75,10.59-4.74,14.22-7.91l-2.86,7.91,2.86,7.91c-3.63-3.17-9.49-6.16-14.22-7.91Z"/>
        </g>
      </g>
      <g id="drop-zones">
        <g id="drop-zone-test-tube" opacity="0">
          <rect
            x="430"
            y="-40"
            width="190"
            height="460"
            fill="red"
            fill-opacity="0.25"
            stroke="red"
            stroke-width="3"
            style={{ pointerEvents: "none" }}
          />
          <text
            x="525"
            y="395"
            text-anchor="middle"
            fill="black"
            font-size="24"
          >
            <tspan x="525" y="395">Drop 1</tspan>
          </text>
        </g>
        <g id="drop-zone-litmus" opacity="0">
          <rect
            x="1099"
            y="330"
            width="470"
            height="570"
            fill="red"
            fill-opacity="0.25"
            stroke="red"
            stroke-width="3"
            style={{ pointerEvents: "none" }}
          />
          <text
            x="1215"
            y="620"
            text-anchor="middle"
            fill="black"
            font-size="24"
          >
            <tspan x="1215" y="620">Drop 2</tspan>
          </text>
        </g>
      </g>
    </g>
    <g id="Layer_8" data-name="Layer 8">
      <polygon class="pqr-127" points="1129.39 885.64 1571.99 885.64 1501.1 956.53 1048.56 956.53 1129.39 885.64"/>
    </g>
    <g id="Layer_9" data-name="Layer 9">
      <polygon id="blue-litmus-paper" className="pqr-35" points="1165.52 897.34 1522.96 897.34 1465.71 944.83 1100.24 944.83 1165.52 897.34"/>
      {/* Red stain that appears where acid drops land — hidden initially */}
      <ellipse
        id="red-acid-stain"
        cx="1313"
        cy="918"
        rx="0"
        ry="0"
        fill="#dc2626"
        opacity="0"
      />
    </g>

  </g>
      </svg>

    </div>
  )
}

export default SvgLitmus
