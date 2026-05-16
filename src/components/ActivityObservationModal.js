"use client"

import { useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useStore, EXPERIMENT_TYPES } from "@/store/useStore"
import { getTranslation } from "@/i18n"

const OBS_KEYS = {
  [EXPERIMENT_TYPES.SOLUBILITY_IN_WATER]: {
    title: "observation_solubility_title",
    lines: ["observation_solubility_line1"],
  },
  [EXPERIMENT_TYPES.ODOUR_TEST]: {
    title: "observation_odour_title",
    lines: ["observation_odour_line1"],
  },
  [EXPERIMENT_TYPES.LITMUS_TEST]: {
    title: "observation_litmus_title",
    lines: ["observation_litmus_line1"],
  },
  [EXPERIMENT_TYPES.BICARBONATE_REACTION]: {
    title: "observation_bicarbonate_title",
    lines: ["observation_bicarbonate_line1"],
  },
}

export default function ActivityObservationModal() {
  const open = useStore((s) => s.activityObservationModalOpen)
  const experimentId = useStore((s) => s.activityObservationModalExperimentId)
  const close = useStore((s) => s.closeActivityObservationModal)
  const clearSignal = useStore((s) => s.clearExperimentInfoSignal)
  const language = useStore((s) => s.language)
  const t = useMemo(() => getTranslation(language), [language])

  const obsConfig = experimentId ? OBS_KEYS[experimentId] : null

  const handleOpenChange = (next) => {
    if (!next) {
      close()
      clearSignal()
    }
  }

  return (
    <Dialog open={open && !!obsConfig} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader className="text-center">
          <DialogTitle className="text-base font-semibold leading-tight">
            {t.observation_title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t.observation_close_desc}
          </DialogDescription>
        </DialogHeader>
        {obsConfig ? (
          <div className="space-y-2 text-sm text-foreground text-center">
            {obsConfig.lines.map((key, i) => (
              <p key={i}>{t[key]}</p>
            ))}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
