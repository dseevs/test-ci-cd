/**
 * BACKWARD COMPAT — observation text now lives in the flat translation files.
 * Use:  import { getTranslation } from "@/i18n"
 *       const t = getTranslation(language)
 *       t.observation_solubility_title / t.observation_solubility_line1  etc.
 */

import { EXPERIMENT_TYPES } from "@/store/useStore"

export const ACTIVITY_OBSERVATION_COPY = {
  [EXPERIMENT_TYPES.SOLUBILITY_IN_WATER]: {
    title: "Observation — Solubility in water",
    lines: ["A homogeneous solution is formed."],
  },
  [EXPERIMENT_TYPES.ODOUR_TEST]: {
    title: "Observation — Odour test",
    lines: ["A pungent smell is produced."],
  },
  [EXPERIMENT_TYPES.LITMUS_TEST]: {
    title: "Observation — Litmus test",
    lines: ["Blue litmus turns red."],
  },
  [EXPERIMENT_TYPES.BICARBONATE_REACTION]: {
    title: "Observation — Reaction with sodium bicarbonate",
    lines: [
      "Acetic acid reacts with sodium bicarbonate to produce CO₂ gas that turns lime water milky.",
    ],
  },
}
