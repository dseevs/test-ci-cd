# What to add in `useStore` (this repo)

**File:** `src/store/useStore.js`  
**Pattern:** everything lives inside `create((set, get) => ({ ... }))` — add sibling keys next to the existing blocks below.

---

## 1. Already there — do not duplicate

**i18n + persistence** (hooks `simpleLabText`; layout / Theory call `setLanguage`):

```js
language: getCurrentLanguage(),
setLanguage: (lang) => {
  const validLang = SUPPORTED_LANGUAGES.includes(lang) ? lang : 'en'
  setCurrentLanguage(validLang)
  set({ language: validLang })
},
```

**Parent iframe session** (`layout.js` → `setSessionData`; `sendProgress` reads `session`):

```js
sessionData: null,
setSessionData: (data) => set({ sessionData: data }),
```

**Experiment enum** — change keys/values when your lab is not acetic-acid; keep one string per activity:

```js
export const EXPERIMENT_TYPES = {
  SOLUBILITY_IN_WATER: 'solubility_in_water',
  ODOUR_TEST: 'odour_test',
  LITMUS_TEST: 'litmus_test',
  BICARBONATE_REACTION: 'bicarbonate_reaction',
}
```

**Simulation UI state** — copy this shape for a new lab: replace names with your steps, meters, and flags; add `setX` for each field you mutate:

```js
experimentSelected: EXPERIMENT_TYPES.SOLUBILITY_IN_WATER,
experimentStep: 0,
reactionComplete: false,
labPhase: 'idle',
// ... your scalars and booleans ...
setExperimentSelected: (value) => { /* see file — resets related fields */ },
setExperimentStep: (value) => set({ experimentStep: value }),
```

**Theory / procedure / tabs progress** (`useTabProgress.js`):

```js
maxPercentage: 0,
visitedTabs: [],
simStepPercentage: 0,
updateMaxPercentage: (percentage) =>
  set((state) => ({
    maxPercentage: Math.max(state.maxPercentage, percentage),
  })),
markTabVisited: (tabLabel) =>
  set((state) => ({
    visitedTabs: state.visitedTabs.includes(tabLabel)
      ? state.visitedTabs
      : [...state.visitedTabs, tabLabel],
  })),
updateSimStepPercentage: (val) =>
  set((state) => ({
    simStepPercentage: Math.max(state.simStepPercentage, val),
  })),
```

**Derived helpers** (optional; use `get()`):

```js
getIsAcidic: () => get().phValue < 7,
```

**Exported selector hooks** (bottom of file — add one per heavily reused slice):

```js
export const useIsAcidic = () => useStore((s) => s.phValue < 7)
```

---

## 2. What you add for a new lab topic

1. **Rename / replace** `EXPERIMENT_TYPES` with your activity ids (strings stable for analytics).

2. **Add state fields** for anything shared across pages or 3D/scene components (default each field).

3. **Add actions** `setFoo` or `incrementBar` that only call `set({ ... })` or `set((state) => ({ ... }))` — never mutate `state` arrays/objects in place.

4. **Reset in one place** — extend `resetExperiment` (or add `resetLab`) to clear every new field you added.

5. **Wire components** with `useStore((s) => s.myField)` and `useStore((s) => s.setMyField)`.

---

## 3. Copy-paste template (drop inside the big object, before the closing `}))`)

```js
// --- your lab: add below ---
myLabScore: 0,
myLabPhase: 'intro',
setMyLabScore: (n) => set({ myLabScore: n }),
setMyLabPhase: (phase) => set({ myLabPhase: phase }),
```

List + immutable append:

```js
myCompletedSteps: [],
addMyCompletedStep: (id) =>
  set((state) => ({
    myCompletedSteps: state.myCompletedSteps.includes(id)
      ? state.myCompletedSteps
      : [...state.myCompletedSteps, id],
  })),
```

---

## 4. Where the store is consumed in this project (so you know what breaks if you rename)

| Consumer | What it uses |
|----------|----------------|
| `src/app/layout.js` | `setSessionData`, `setLanguage`, `sessionData` |
| `src/app/useTabProgress.js` | `updateMaxPercentage`, `markTabVisited`, `visitedTabs`, `maxPercentage`, `simStepPercentage` |
| `src/app/theory/Theorytext.jsx` | `language`, `setLanguage` |
| `src/app/procedure/Proceduretext.jsx` | `language`, `setLanguage` |
| Simulation / lab components under `src/components` | experiment fields, `runCurrentExperiment`, etc. |

Rename `sessionData` or `language` only if you update every import above.

---

## 5. `SUPPORTED_LANGUAGES`

Must match keys under `translations` in `src/i18n/simpleLabText.js`; add a language code in both places.
