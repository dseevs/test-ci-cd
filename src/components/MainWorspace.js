"use client"

import { useStore, EXPERIMENT_TYPES } from "@/store/useStore"
import { useEffect } from "react"
import SvgComponent from "@/components/SvgComponent"
import SvgNaHco3 from "./SvgNaHco3"
import SvgLitmus from "./SvgLitmus"
import SvgOdour from "./SvgOdour"
import Example from "./example"
import ActivityObservationModal from "@/components/ActivityObservationModal"

const BICARBONATE_POUR_MS = 3200
const LITMUS_DIP_MS = 1500
const REACT_DURATION_MS = 800

export default function MainWorkspace() {
  const labPhase = useStore((s) => s.labPhase)
  const setLabPhase = useStore((s) => s.setLabPhase)
  const runCurrentExperiment = useStore((s) => s.runCurrentExperiment)
  const experimentSelected = useStore((s) => s.experimentSelected)

  const isBicarbonate = experimentSelected === EXPERIMENT_TYPES.BICARBONATE_REACTION
  const isLitmus = experimentSelected === EXPERIMENT_TYPES.LITMUS_TEST
  const isSolubility = experimentSelected === EXPERIMENT_TYPES.SOLUBILITY_IN_WATER
  const runDelayMs = isBicarbonate ? BICARBONATE_POUR_MS : isLitmus ? LITMUS_DIP_MS : 0

  useEffect(() => {
    if (labPhase !== "pouring" || runDelayMs <= 0) return
    if (isSolubility) return
    const t1 = setTimeout(() => {
      runCurrentExperiment()
      setLabPhase("reacting")
    }, runDelayMs)
    const t2 = setTimeout(() => setLabPhase("complete"), runDelayMs + REACT_DURATION_MS)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [labPhase, runCurrentExperiment, setLabPhase, runDelayMs, isSolubility])

  const renderScene = () => {
    switch (experimentSelected) {
      case EXPERIMENT_TYPES.SOLUBILITY_IN_WATER:
        // return <Example/>
        return <SvgComponent/>
      case EXPERIMENT_TYPES.ODOUR_TEST:
        return <SvgOdour />
      case EXPERIMENT_TYPES.LITMUS_TEST:
        return <SvgLitmus />
      case EXPERIMENT_TYPES.BICARBONATE_REACTION:
        return <SvgNaHco3 />
      default:
        // Fallback – show solubility scene if nothing selected
        return <SvgComponent />
    }
  }

  return (
    <div className="main-workspace">
      <div className="main-workspace__scene">
        {renderScene()}
      </div>
      <ActivityObservationModal />
    </div>
  )
}
