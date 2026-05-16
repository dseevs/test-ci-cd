# Full Setup Guide — Page by Page

---

## HOW LANGUAGE TRANSLATION WORKS (dead simple)

```
src/i18n/
  ├── index.js          ← The "brain" — picks the right language
  ├── en.js             ← ALL English text (flat key-value)
  ├── hi.js             ← ALL Hindi text   (same keys)
  ├── mr.js             ← ALL Marathi text  (same keys)
  └── ml.js             ← ALL Malayalam text (same keys)
```

**ONE file per language. That's it.**

Every key is a simple `key: "value"` pair. No nesting. No subfolders. No separate files per page.

---

## How to find what you need

| I want to change…             | Open this file   | Look for keys starting with… |
|-------------------------------|------------------|------------------------------|
| Landing page text             | `src/i18n/en.js` | `launchpage_`                |
| Theory text                   | `src/i18n/en.js` | `theory_`                    |
| Procedure text                | `src/i18n/en.js` | `procedure_`                 |
| Animation title               | `src/i18n/en.js` | `animation_`                 |
| Simulation / Workspace UI     | `src/i18n/en.js` | `workspace_`, `sidebar_`     |
| Experiment names              | `src/i18n/en.js` | `experiment_`                |
| Observation popups            | `src/i18n/en.js` | `observation_`               |
| Observation Table dialog      | `src/i18n/en.js` | `obs_`                       |
| Food for Thought              | `src/i18n/en.js` | `food_`                      |
| Quiz instructions             | `src/i18n/en.js` | `quizpopup_`                 |
| Quiz questions                | `src/i18n/en.js` | `quiz_questions` (array)     |
| Common (quit, ok, cancel)     | `src/i18n/en.js` | `homequitpopup_`, `infopopup_` |
| Hindi anything                | `src/i18n/hi.js` | Same keys as en.js           |
| Marathi anything              | `src/i18n/mr.js` | Same keys as en.js           |
| Malayalam anything             | `src/i18n/ml.js` | Same keys as en.js           |

---

## Example: what a translation file looks like

```js
// src/i18n/en.js
const en = {
  // Landing page
  launchpage_title: "Study of Different Properties of Acetic Acid",
  launchpage_obj: "Objective",
  launchpage_start: "Start",

  // Theory
  theory_obj_title: "What Will We Learn?",
  theory_acetic_heading: "So what is acetic acid?",

  // Procedure
  procedure_title: "Let's Test Acetic Acid Step by Step!",
  procedure_material_1: "Blue litmus paper",

  // Simulation
  workspace_title: "Study of Different Properties...",
  experiment_solubility: "Solubility in water",

  // Quiz
  quiz_title: "Acetic Acid — Quiz",
  quizpopup_line1: "Read all the instructions given below.",

  // Quiz questions (array for the Quizquestions component)
  quiz_questions: [ { id: 1, question: "...", optionA: "...", ... } ],
}
export default en
```

---

## How to use in a component

```jsx
"use client"
import { useMemo } from "react"
import { getTranslation } from "@/i18n"
import { useStore } from "@/store/useStore"

export default function MyComponent() {
  const language = useStore((s) => s.language)
  const t = useMemo(() => getTranslation(language), [language])

  return <h1>{t.launchpage_title}</h1>
}
```

That's it. `t.any_key` gives you the translated string for the current language.

---

## index.js — the brain

```js
import en from "./en"
import hi from "./hi"
import mr from "./mr"
import ml from "./ml"

const translations = { en, hi, mr, ml }

export function getTranslation(language) {
  return translations[language] || translations["en"]
}
```

**Exports:**
- `getTranslation(language)` — returns the full flat object for that language
- `getCurrentLanguage()` — reads from localStorage
- `setCurrentLanguage(language)` — writes to localStorage
- `LANGUAGES` — array of `{ key, label }` for the switcher buttons
- `getLabText` — alias for `getTranslation` (backward compat)

---

## LanguageSwitcher component

A floating button bar (EN / HI / MR / ML) that appears on every page:

```jsx
import LanguageSwitcher from "@/components/LanguageSwitcher"

// Drop it anywhere:
<LanguageSwitcher />
```

---

## Page-by-page reference

### Landing page (`src/app/page.js`)

Keys used: `launchpage_title`, `launchpage_obj`, `launchpage_obj_text`, `launchpage_learning_outcome`, `launchpage_learning_outcome_line1`, `launchpage_start`, `launchpage_developedby`, `launchpage_cdac`, `launchpage_fundedby`, `launchpage_ministry`, `launchpage_govofindia`

### Theory (`src/app/theory/Theorytext.jsx`)

Keys used: `theory_obj_title`, `theory_obj_intro`, `theory_obj_item1`–`4`, `theory_title`, `theory_acetic_heading`, `theory_image_alt`, `theory_acetic_para1`–`2`, `theory_properties_heading`, `theory_acidic_heading`, `theory_acidic_para`, `theory_reaction_heading`, `theory_reaction_para1`–`2`, `theory_uses_heading`, `theory_use1`–`4`, `theory_learning_title`, `theory_learning_item1`–`4`, `theory_learning_subitem1`–`3`

### Procedure (`src/app/procedure/Proceduretext.jsx`)

Keys used: `procedure_title`, `procedure_materials_title`, `procedure_material_1`–`12`, `procedure_steps_title`, `procedure_step1`–`7`, `procedure_expected_title`, `procedure_expected_text`, `procedure_conclusion_title`, `procedure_conclusion_text`, `procedure_precautions_title`, `procedure_precaution1`–`5`

Material images are defined in the component (they don't change per language).

### Animation (`src/app/animation/page.js`)

Keys used: `animation_title`, `homequitpopup_question`, `homequitpopup_yes`, `homequitpopup_cancel`, `continue_btn`, `startact_infopopup`, `infopopup_ok`, `infopopup_cancel`

### Simulation (`src/app/simulation/page.js`)

Keys used: `workspace_title`, `homequitpopup_question`, `homequitpopup_yes`, `homequitpopup_cancel`, `continue_btn`, `startact_infopopup`, `infopopup_ok`, `infopopup_cancel`

**Sub-components that also read from the same flat `t` object:**

| Component | Keys it uses (prefix) |
|---|---|
| `WorkspaceHeader.js` | `headcomp_title`, `workspace_watch_tour`, `workspace_observation_table`, `workspace_observation`, `workspace_observation_unlock`, `workspace_help`, `workspace_instructions`, `workspace_lab_instructions_title`, `workspace_lab_instructions_desc`, `workspace_lab_step1`–`4`, `close`, `workspace_hide_tools`, `workspace_show_tools`, `workspace_collapse_tools`, `workspace_expand_tools`, `workspace_touch_hint`, `workspace_touch_text`, `workspace_got_it` |
| `SideWorkspace.js` | `sidebar_select_test`, `sidebar_no_experiment`, `sidebar_pour_acid`, `experiment_solubility`, `experiment_odour`, `experiment_litmus`, `experiment_bicarbonate` |
| `ActivityObservationModal.js` | `observation_title`, `observation_close_desc`, `observation_*_title`, `observation_*_line1`, `close` |
| `ObservationTableDialog.js` | `workspace_observation_table`, `obs_add_row`, `obs_generate_graph`, `obs_download`, `obs_graph_title`, `obs_graph_min_rows`, `obs_enter_min_rows` |
| `FoodForThoughtSection.js` | `food_for_thought`, `food_loading`, `food_open_questions`, `food_new_questions`, `food_no_questions`, `food_question`, `food_of`, `food_previous`, `food_next`, `food_done`, `experiment_*` |
| `ActStartPopupContent.jsx` | `actstartpopup_line1`–`4` |

### Quiz (`src/app/quiz/page.js`)

Keys used: `quiz_title`, `homequitpopup_question`, `homequitpopup_yes`, `homequitpopup_cancel`, `end_activity`, `infopopup_ok`, `infopopup_cancel`, `quiz_instructions_title`, `quiz_questions`

| Component | Keys |
|---|---|
| `QuizPopupContent.js` | `quizpopup_line1`–`8` |

---

## Quick Recipe: Change some text

1. Open `src/i18n/en.js`
2. Find the key (use the prefix table above)
3. Change the value
4. Do the same in `hi.js`, `mr.js`, `ml.js`

## Quick Recipe: Add a new language (e.g. Tamil)

1. Copy `src/i18n/en.js` → `src/i18n/ta.js`
2. Translate all values to Tamil
3. In `src/i18n/index.js`, add:
   ```js
   import ta from "./ta"
   const translations = { en, hi, mr, ml, ta }
   ```
4. In `index.js`, add to the `LANGUAGES` array:
   ```js
   { key: "ta", label: "TA" }
   ```
5. Done. The LanguageSwitcher will automatically show the new button.

## Quick Recipe: Add a new key

1. Add the key to `en.js`: `my_new_key: "Hello"`
2. Add same key to `hi.js`, `mr.js`, `ml.js` with translations
3. Use in component: `t.my_new_key`

---

## Store (`src/store/useStore.js`)

The Zustand store manages the current language:

```js
import { setCurrentLanguage, getCurrentLanguage } from '@/i18n'

// In the store:
language: getCurrentLanguage(),
setLanguage: (lang) => {
  setCurrentLanguage(lang)
  set({ language: lang })
}
```

## Layout (`src/app/layout.js`)

The root layout listens for language messages from a parent iframe and syncs the language via the store.
