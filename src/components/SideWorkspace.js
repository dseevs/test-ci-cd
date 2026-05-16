"use client"

import React, { useMemo } from "react"
import { useStore, EXPERIMENT_TYPES } from "@/store/useStore"
import { Button } from "@/components/ui/button"
import { getTranslation } from "@/i18n"
import { getAssetPath } from "@/utils/getAssetPath"

const EXPERIMENT_NAME_KEY = {
  [EXPERIMENT_TYPES.SOLUBILITY_IN_WATER]: "experiment_solubility",
  [EXPERIMENT_TYPES.ODOUR_TEST]: "experiment_odour",
  [EXPERIMENT_TYPES.LITMUS_TEST]: "experiment_litmus",
  [EXPERIMENT_TYPES.BICARBONATE_REACTION]: "experiment_bicarbonate",
}

export default function SideWorkspace() {
  const {
    experimentSelected,
    bicarbonateAdded,
    labPhase,
    setExperimentSelected,
    setLabPhase,
  } = useStore()

  const language = useStore((s) => s.language)
  const t = useMemo(() => getTranslation(language), [language])

  const isRunning = labPhase === "pouring" || labPhase === "reacting"
  const experimentTiles = [
    {
      key: EXPERIMENT_TYPES.SOLUBILITY_IN_WATER,
      label: t.experiment_solubility,
      image: getAssetPath("/SvgComponent.png"),
    },
    {
      key: EXPERIMENT_TYPES.ODOUR_TEST,
      label: t.experiment_odour,
      image: getAssetPath("/Odour.png"),
    },
    {
      key: EXPERIMENT_TYPES.LITMUS_TEST,
      label: t.experiment_litmus,
      image: getAssetPath("/Litmus.png"),
    },
    {
      key: EXPERIMENT_TYPES.BICARBONATE_REACTION,
      label: t.experiment_bicarbonate,
      image: getAssetPath("/Nahco3.png"),
    },
  ]
  const getExperimentName = () => {
    if (!experimentSelected) return t.sidebar_no_experiment
    const nameKey = EXPERIMENT_NAME_KEY[experimentSelected]
    return nameKey ? t[nameKey] : experimentSelected
  }

  const handleStartPour = () => {
    if (experimentSelected === EXPERIMENT_TYPES.BICARBONATE_REACTION && bicarbonateAdded) setLabPhase("pouring")
  }

  return (
    <div className="side-workspace">
      <div className="side-workspace__section">
        <h2 className="side-workspace__heading theoryH6">{t.sidebar_select_test}</h2>
        <div className="side-workspace__experiment-grid">
          {experimentTiles.map(({ key, label, image }) => (
            <Button
              key={key}
              variant="ghost"
              size="sm"
              onClick={() => setExperimentSelected(key)}
              className={`side-workspace__experiment-btn ${
                experimentSelected === key ? "side-workspace__experiment-btn--selected" : ""
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
        <p className="side-workspace__experiment-name">{getExperimentName()}</p>
      </div>

      {experimentSelected === EXPERIMENT_TYPES.BICARBONATE_REACTION && bicarbonateAdded && !isRunning && (
        <div className="side-workspace__action-wrap">
          <Button className="side-workspace__action-btn" onClick={handleStartPour}>
            {t.sidebar_pour_acid}
          </Button>
        </div>
      )}
    </div>
  )
}
