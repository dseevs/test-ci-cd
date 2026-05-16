# Language Translation System — Complete Implementation Guide

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [File Structure](#file-structure)
4. [How It Works (Step by Step)](#how-it-works-step-by-step)
5. [The Dictionary File — `simpleLabText.js`](#the-dictionary-file--simplelabtextjs)
6. [Zustand Store — Language State](#zustand-store--language-state)
7. [Exported Functions (API) — `simpleLabText.js`](#exported-functions-api--simplelabtextjs)
8. [Backend-Triggered Language Change (postMessage)](#backend-triggered-language-change-postmessage)
9. [How Components Use Translation](#how-components-use-translation)
10. [Language Switcher UI](#language-switcher-ui)
11. [Adding a New Language](#adding-a-new-language)
12. [Adding a New Page / Section](#adding-a-new-page--section)
13. [Design Decisions & Trade-offs](#design-decisions--trade-offs)
14. [Troubleshooting](#troubleshooting)

---

## Overview

This project uses a **custom, lightweight translation system** with **Zustand** for reactive global state. No external i18n libraries like `react-i18next` or `next-intl` are used.

**Two ways to change language:**

| Trigger | How it works |
|---------|-------------|
| **User clicks** a language button on the theory page | Updates Zustand store → all components re-render |
| **Backend sends** a `LANG_CHANGE` postMessage | Parent iframe sends message → receiver catches it → updates Zustand store → all components re-render |

**Supported languages:**

| Code | Language   | Label in UI |
|------|------------|-------------|
| `en` | English    | EN          |
| `hi` | Hindi      | HI          |
| `mr` | Marathi    | MR          |
| `ml` | Malayalam  | ML          |

**Sections with translations:**

| Section Key  | Used On         | Component File                          |
|-------------|-----------------|------------------------------------------|
| `theory`    | Theory page     | `src/app/theory/Theorytext.jsx`          |
| `procedure` | Procedure page  | `src/app/procedure/Proceduretext.jsx`    |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Parent App (Backend / OLabs)                     │
│                                                                     │
│   Sends postMessage:                                                │
│   ┌───────────────────────────────────────────────────────┐        │
│   │ { source: "OLABS_SIMULATION",                         │        │
│   │   type: "LANG_CHANGE",                                │        │
│   │   payload: { context: { lang: "hi" } } }              │        │
│   └────────────────────────┬──────────────────────────────┘        │
│                            │ window.postMessage()                   │
└────────────────────────────┼────────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────────┐
│                    Iframe (Simulation App)                          │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  layout.js  (registers listener on mount)                    │  │
│  │                                                              │  │
│  │  registerIframeListener({                                    │  │
│  │    onInit: (payload) => { setSessionData(payload) },         │  │
│  │    onLangChange: (lang) => { setLanguage(lang) },  ◄─── NEW │  │
│  │  })                                                          │  │
│  └──────────────────┬───────────────────────────────────────────┘  │
│                     │                                              │
│                     ▼                                              │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  receiver.js  (message handler)                              │  │
│  │                                                              │  │
│  │  case MESSAGE_TYPES.SIMULATION_INIT → onInit(payload)        │  │
│  │  case MESSAGE_TYPES.LANG_CHANGE → onLangChange(lang)  ◄ NEW │  │
│  └──────────────────┬───────────────────────────────────────────┘  │
│                     │                                              │
│                     ▼                                              │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Zustand Store  (useStore.js)  ◄── SINGLE SOURCE OF TRUTH   │  │
│  │                                                              │  │
│  │  language: "hi"                                              │  │
│  │  setLanguage(lang) → validates → updates store + localStorage│  │
│  └─────────┬────────────────────────────┬───────────────────────┘  │
│            │                            │                          │
│            ▼                            ▼                          │
│  ┌─────────────────┐         ┌──────────────────────┐             │
│  │ Theorytext.jsx   │         │ Proceduretext.jsx    │             │
│  │                  │         │                      │             │
│  │ subscribes to    │         │ subscribes to        │             │
│  │ store.language   │         │ store.language       │             │
│  │ + language       │         │                      │             │
│  │   switcher UI    │         │ (reactively updates  │             │
│  │                  │         │  when lang changes!) │             │
│  └────────┬─────────┘         └──────────────────────┘             │
│           │                                                        │
│           ▼                                                        │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  simpleLabText.js  (dictionary + helpers)                  │    │
│  │                                                            │    │
│  │  getLabText("theory", "hi") → returns Hindi theory object  │    │
│  │  + persists to localStorage for page reload survival       │    │
│  └────────────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────────┘
```

**Key points:**
- **Zustand store** is the single source of truth for language across the entire app
- Language can be changed from **two sources**: user UI clicks OR backend postMessage
- All components **reactively update** when language changes (no page reload needed)
- Language preference is **also persisted** in `localStorage` so it survives page refreshes
- The `simpleLabText.js` file is a pure dictionary + helper — it has no state of its own

---

## File Structure

```
src/
├── store/
│   └── useStore.js               ← Zustand store (language state lives here)
│
├── i18n/
│   └── simpleLabText.js          ← Dictionary (all translations) + helper functions
│
├── utils/
│   └── messaging/
│       ├── constants.js          ← Message types (includes LANG_CHANGE)
│       ├── receiver.js           ← Listens for postMessage (handles LANG_CHANGE)
│       └── sender.js             ← Sends messages to parent
│
├── app/
│   ├── layout.js                 ← Registers iframe listener, wires onLangChange
│   ├── theory/
│   │   └── Theorytext.jsx        ← Uses store language + has language switcher UI
│   └── procedure/
│       └── Proceduretext.jsx     ← Uses store language (reactively updates)
```

---

## How It Works (Step by Step)

### Flow 1: App Starts Up

1. `layout.js` mounts and calls `registerIframeListener({ onInit, onLangChange })`
2. It also calls `sendIframeReady()` to tell the parent "I'm loaded"
3. The parent responds with `SIMULATION_INIT` containing `payload.context.lang`
4. `receiver.js` catches this, calls `onInit(payload)`
5. `layout.js` reads `payload.context.lang` and calls `setLanguage(lang)` on the store
6. The Zustand store validates the language, updates state, and persists to `localStorage`
7. All subscribed components re-render with the correct language

### Flow 2: Backend Sends a Language Change

1. Parent app sends a postMessage:
   ```javascript
   iframe.contentWindow.postMessage({
     source: "OLABS_SIMULATION",
     type: "LANG_CHANGE",
     payload: { context: { lang: "mr" } }
   }, targetOrigin);
   ```
2. `receiver.js` catches it, matches `MESSAGE_TYPES.LANG_CHANGE`
3. Calls `onLangChange("mr")` which was wired in `layout.js`
4. `layout.js` calls `setLanguage("mr")` on the Zustand store
5. Store validates → updates `language` state → persists to `localStorage`
6. Every component subscribed to `useStore((s) => s.language)` re-renders
7. `Theorytext.jsx` and `Proceduretext.jsx` both show Marathi text instantly

### Flow 3: User Clicks Language Button (Manual)

1. User clicks "HI" button on the theory page
2. `Theorytext.jsx` calls `setLang("hi")` which is `useStore((s) => s.setLanguage)`
3. Store validates → updates state → persists to `localStorage`
4. Theory page re-renders with Hindi text
5. If user navigates to procedure page, it also reads Hindi from the store

### Flow 4: Page Refresh

1. User refreshes the browser
2. Zustand store initializes with `language: getCurrentLanguage()`
3. `getCurrentLanguage()` reads from `localStorage` → returns `"hi"` (or whatever was saved)
4. Components render with the persisted language

---

## The Dictionary File — `simpleLabText.js`

This file contains **all translated text** and **helper functions**. It does NOT hold state.

### 1. Constants

```javascript
export const LAB_LANGUAGE_STORAGE_KEY = "olab_language"   // localStorage key name
const DEFAULT_LANGUAGE = "en"                              // fallback language
```

### 2. The English Base Object (`en`)

```javascript
const en = {
  theory: {
    objectiveTitle: "What Will We Learn?",
    objectiveIntro: "Today we will learn...",
    objectiveItems: ["item1", "item2", ...],
    // ... more keys
  },
  procedure: {
    title: "Let's Test Acetic Acid Step by Step!",
    materialsTitle: "Things We Need:",
    materials: [
      { id: 1, name: "Blue litmus paper", img: "materials/blue-litmus-paper.svg" },
      // ... more materials
    ],
    // ... more keys
  },
}
```

### 3. The Translations Map

Other languages extend the English base using the spread operator (`...`):

```javascript
const translations = {
  en,
  hi: {
    ...en,
    theory: {
      ...en.theory,
      objectiveTitle: "हम क्या सीखेंगे?",
      // ... Hindi overrides
    },
    procedure: {
      ...en.procedure,
      title: "चलो एसीटिक एसिड की जाँच करते हैं...",
      // ... Hindi overrides
    },
  },
  mr: { /* same pattern for Marathi */ },
  ml: { /* same pattern for Malayalam */ },
}
```

**Why the spread (`...`) pattern?**
- If a translation is missing for a key, the English fallback is automatically used
- You only need to override keys that have been translated
- Reduces duplication and makes it easy to add new keys

### 4. Text Structure by Section

#### Theory Section Keys

| Key                | Type       | Description                                      |
|--------------------|-----------|--------------------------------------------------|
| `objectiveTitle`   | `string`  | Heading for the objective section                |
| `objectiveIntro`   | `string`  | Introduction paragraph                           |
| `objectiveItems`   | `array`   | Bullet points listing objectives                 |
| `theoryTitle`      | `string`  | Main theory section heading                      |
| `aceticHeading`    | `string`  | Subheading about acetic acid                     |
| `imageAlt`         | `string`  | Alt text for the theory image                    |
| `aceticPara1`      | `string`  | First paragraph about acetic acid                |
| `aceticPara2`      | `string`  | Second paragraph about acetic acid               |
| `propertiesHeading`| `string`  | Subheading for properties section                |
| `acidicHeading`    | `string`  | Subheading for acidic character                  |
| `acidicPara`       | `string`  | Paragraph about acidic nature                    |
| `reactionHeading`  | `string`  | Subheading for NaHCO₃ reaction                   |
| `reactionPara1`    | `string`  | First paragraph about the reaction               |
| `reactionPara2`    | `string`  | Second paragraph about lime water test           |
| `usesHeading`      | `string`  | Subheading for uses section                      |
| `uses`             | `array`   | Bullet points listing uses                       |
| `learningTitle`    | `string`  | Heading for learning outcomes                    |
| `learningItems`    | `array`   | Main learning outcome items                      |
| `learningSubItems` | `array`   | Nested list items under learningItems[1]         |

#### Procedure Section Keys

| Key                | Type       | Description                                      |
|--------------------|-----------|--------------------------------------------------|
| `title`            | `string`  | Main procedure page title                        |
| `materialsTitle`   | `string`  | Heading for materials list                       |
| `materials`        | `array`   | Array of `{id, name, img}` objects               |
| `stepsTitle`       | `string`  | Heading for steps section                        |
| `steps`            | `array`   | Ordered list of procedure steps                  |
| `expectedTitle`    | `string`  | Heading for expected observations                |
| `expectedText`     | `string`  | Paragraph describing expected results            |
| `conclusionTitle`  | `string`  | Heading for conclusion                           |
| `conclusionText`   | `string`  | Paragraph with conclusion                        |
| `precautionsTitle` | `string`  | Heading for precautions                          |
| `precautions`      | `array`   | Bullet points listing safety rules               |

---

## Zustand Store — Language State

The Zustand store in `src/store/useStore.js` is the **single source of truth** for language.

### State & Actions

```javascript
// State
language: "en"                  // current language code

// Action
setLanguage: (lang) => {
  // 1. Validates against SUPPORTED_LANGUAGES ["en", "hi", "mr", "ml"]
  // 2. Falls back to "en" if invalid
  // 3. Persists to localStorage via setCurrentLanguage()
  // 4. Updates Zustand state → triggers re-renders
}
```

### Exported Constants

```javascript
export const SUPPORTED_LANGUAGES = ['en', 'hi', 'mr', 'ml']
```

### How Components Subscribe

```javascript
// In any component:
import { useStore } from "@/store/useStore";

const language = useStore((s) => s.language);      // reactive — re-renders on change
const setLang  = useStore((s) => s.setLanguage);   // action to change language
```

### Why Zustand?

| Before (localStorage only)              | After (Zustand + localStorage)               |
|-----------------------------------------|----------------------------------------------|
| Each component had its own `useState`    | One global state, all components subscribe   |
| Procedure page only read language on mount | Procedure page updates reactively           |
| Backend couldn't trigger language change | Backend sends `LANG_CHANGE` → instant update |
| No way to sync across components         | All components stay in sync automatically    |

---

## Exported Functions (API) — `simpleLabText.js`

### `getCurrentLanguage()`

```javascript
export function getCurrentLanguage() → string
```

- **Returns:** A language code string like `"en"`, `"hi"`, `"mr"`, or `"ml"`
- **Behavior:**
  1. Reads `localStorage.getItem("olab_language")`
  2. If the stored value is a valid language key → returns it
  3. If not found or invalid → returns `"en"` (default)
  4. If `window` is undefined (SSR) → returns `"en"`
- **Used by:** Zustand store on initialization (to restore persisted language)

### `setCurrentLanguage(language)`

```javascript
export function setCurrentLanguage(language: string) → void
```

- **Parameter:** `language` — a language code string
- **Behavior:**
  1. Validates the language code exists in `translations`
  2. If valid → saves to `localStorage`
  3. If invalid → saves `"en"` instead
- **Used by:** Zustand store's `setLanguage` action (called internally)

### `getLabText(sectionKey, language?)`

```javascript
export function getLabText(sectionKey: string, language?: string) → object
```

- **Parameters:**
  - `sectionKey` — `"theory"` or `"procedure"`
  - `language` — optional, defaults to `getCurrentLanguage()`
- **Returns:** The text object for the given section in the given language
- **Fallback:** If the language doesn't exist, returns the English (`en`) section
- **Used by:** Components via `useMemo` with the store's `language` value

---

## Backend-Triggered Language Change (postMessage)

### Message Format (what the parent sends)

```javascript
// Parent app sends this to the simulation iframe:
iframe.contentWindow.postMessage({
  source: "OLABS_SIMULATION",        // REQUIRED — must match MESSAGE_SOURCE
  type: "LANG_CHANGE",               // REQUIRED — triggers language switch
  payload: {
    context: {
      lang: "hi"                      // REQUIRED — language code (en/hi/mr/ml)
    }
  }
}, "http://10.212.5.225:3000");       // target origin
```

### Message Flow (complete chain)

```
Parent App                           Simulation Iframe
──────────                           ──────────────────
    │                                       │
    │  postMessage({                        │
    │    source: "OLABS_SIMULATION",        │
    │    type: "LANG_CHANGE",               │
    │    payload: {context: {lang:"hi"}}    │
    │  })                                   │
    │ ─────────────────────────────────────►│
    │                                       │
    │                          receiver.js  │
    │                          validates:   │
    │                          - data shape │
    │                          - source     │
    │                          - type match │
    │                                       │
    │                          calls:       │
    │                          onLangChange │
    │                          ("hi")       │
    │                                       │
    │                          layout.js    │
    │                          calls:       │
    │                          setLanguage  │
    │                          ("hi")       │
    │                                       │
    │                          Zustand      │
    │                          store:       │
    │                          validates →  │
    │                          updates      │
    │                          state →      │
    │                          persists to  │
    │                          localStorage │
    │                                       │
    │                          All          │
    │                          subscribed   │
    │                          components   │
    │                          re-render    │
    │                          with Hindi   │
    │                                       │
```

### Constants (in `constants.js`)

```javascript
export const MESSAGE_TYPES = {
  IFRAME_READY: "IFRAME_READY",
  SIMULATION_INIT: "SIMULATION_INIT",
  SIMULATION_READY_ACK: "SIMULATION_READY_ACK",
  SIMULATION_PROGRESS: "SIMULATION_PROGRESS",
  SIMULATION_SUBMIT: "SIMULATION_SUBMIT",
  LANG_CHANGE: "LANG_CHANGE",            // ← NEW
};
```

### Receiver Handler (in `receiver.js`)

```javascript
export const registerIframeListener = ({ onInit, onLangChange }) => {
  const handler = (event) => {
    // ... validation ...

    switch (type) {
      case MESSAGE_TYPES.SIMULATION_INIT:
        // existing init handling
        break;

      case MESSAGE_TYPES.LANG_CHANGE:        // ← NEW
        if (payload?.context?.lang) {
          onLangChange?.(payload.context.lang);
        }
        break;
    }
  };
};
```

### Wiring in `layout.js`

```javascript
const setLanguage = useStore((s) => s.setLanguage);

useEffect(() => {
  const cleanup = registerIframeListener({
    onInit: (payload) => {
      setSessionData(payload);
      if (payload?.context?.lang) {
        setLanguage(payload.context.lang);   // set language from INIT too
      }
    },
    onLangChange: (lang) => {
      setLanguage(lang);                     // ← NEW: handle LANG_CHANGE
    },
  });
  sendIframeReady();
  return cleanup;
}, []);
```

### Language from SIMULATION_INIT

The initial language can also come from the `SIMULATION_INIT` payload:

```javascript
// Parent sends SIMULATION_INIT with lang in context:
{
  source: "OLABS_SIMULATION",
  type: "SIMULATION_INIT",
  payload: {
    auth: { token: "...", userId: "..." },
    context: {
      simulationId: "acetic-acid",
      lang: "mr",                        // ← initial language
      // ... other context
    }
  }
}
```

This means the app starts in the correct language from the very first load.

---

## How Components Use Translation

### Theorytext.jsx (Zustand store + switcher)

```jsx
"use client";

import { getLabText } from "@/i18n/simpleLabText";
import { useStore } from "@/store/useStore";

const LANGUAGES = [
  { key: "en", label: "EN" },
  { key: "hi", label: "HI" },
  { key: "mr", label: "MR" },
  { key: "ml", label: "ML" },
];

export default function Theorytext({ setTheory }) {
    const language = useStore((s) => s.language);       // subscribe to store
    const setLang = useStore((s) => s.setLanguage);     // store action
    const copy = useMemo(() => getLabText("theory", language), [language]);

    return (
        <div>
            <h5>{copy.objectiveTitle}</h5>
            <p>{copy.objectiveIntro}</p>
            {/* ... */}

            {/* Language switcher — also updates store */}
            <div className="fixed bottom-4 right-4">
              {LANGUAGES.map((lang) => (
                <button onClick={() => setLang(lang.key)}>
                  {lang.label}
                </button>
              ))}
            </div>
        </div>
    );
}
```

### Proceduretext.jsx (Zustand store, no switcher)

```jsx
"use client";

import { getLabText } from "@/i18n/simpleLabText";
import { useStore } from "@/store/useStore";

export default function Proceduretext({ setProcedure }) {
    const language = useStore((s) => s.language);       // subscribe to store
    const copy = useMemo(() => getLabText("procedure", language), [language]);

    return (
        <div>
            <h4>{copy.title}</h4>
            {/* ... */}
        </div>
    );
}
```

**Both components now reactively update** when language changes from any source (user click, backend message, or INIT payload).

---

## Language Switcher UI

The language switcher is a **fixed-position button group** in the bottom-right corner of the theory page.

```
┌──────────────────────────────┐
│                              │
│      Theory Page Content     │
│                              │
│                              │
│                              │
│                ┌────────────┐│
│                │ EN HI MR ML ││
│                └────────────┘│
└──────────────────────────────┘
```

- **Position:** `fixed bottom-4 right-4` (always visible, even when scrolling)
- **Style:** Small rounded buttons with border. Active language is highlighted with primary color
- **Behavior:** Clicking a button calls `useStore.setLanguage(lang)` → updates globally

---

## Adding a New Language

### Step 1: Add to `SUPPORTED_LANGUAGES` in `useStore.js`

```javascript
export const SUPPORTED_LANGUAGES = ['en', 'hi', 'mr', 'ml', 'ta']  // ← add 'ta'
```

### Step 2: Add translation to `simpleLabText.js`

```javascript
const translations = {
  en,
  hi: { /* ... */ },
  mr: { /* ... */ },
  ml: { /* ... */ },
  ta: {                           // ← NEW
    ...en,
    theory: {
      ...en.theory,
      objectiveTitle: "நாம் என்ன கற்றுக்கொள்வோம்?",
      // ... Tamil overrides
    },
    procedure: { ...en.procedure, /* Tamil overrides */ },
  },
}
```

### Step 3: Add button in `Theorytext.jsx`

```javascript
const LANGUAGES = [
  { key: "en", label: "EN" },
  { key: "hi", label: "HI" },
  { key: "mr", label: "MR" },
  { key: "ml", label: "ML" },
  { key: "ta", label: "TA" },   // ← Add this
];
```

That's it! The backend can immediately start sending `LANG_CHANGE` with `lang: "ta"`.

---

## Adding a New Page / Section

### Step 1: Add section to English base in `simpleLabText.js`

```javascript
const en = {
  theory: { /* ... */ },
  procedure: { /* ... */ },
  quiz: {                            // ← NEW section
    title: "Quiz Time!",
    instructions: "Answer the questions below:",
  },
}
```

### Step 2: Add translations for each language

```javascript
hi: {
  ...en,
  theory: { /* ... */ },
  procedure: { /* ... */ },
  quiz: {
    ...en.quiz,
    title: "क्विज़ का समय!",
    instructions: "नीचे दिए गए सवालों के जवाब दो:",
  },
},
```

### Step 3: Use in your component

```javascript
import { getLabText } from "@/i18n/simpleLabText";
import { useStore } from "@/store/useStore";

export default function QuizPage() {
  const language = useStore((s) => s.language);
  const copy = useMemo(() => getLabText("quiz", language), [language]);

  return <h1>{copy.title}</h1>;
}
```

---

## Design Decisions & Trade-offs

### Why Zustand for language state?

| Factor               | localStorage only (before)              | Zustand + localStorage (now)            |
|----------------------|----------------------------------------|----------------------------------------|
| **Reactivity**        | Components read on mount only          | All components react instantly          |
| **Backend trigger**   | Not possible                           | postMessage → store → all components   |
| **Cross-component**   | Components out of sync                 | Always in sync via single store        |
| **Persistence**       | Built-in                               | Store calls localStorage internally    |
| **Complexity**        | Simpler                                | Slightly more files, but cleaner flow  |

### Why not use `react-i18next` or `next-intl`?

| Factor           | Custom System                          | Library (e.g. react-i18next)          |
|-----------------|----------------------------------------|---------------------------------------|
| **Bundle size**  | Zero extra i18n dependencies           | Adds ~10-30KB                         |
| **Complexity**   | Simple — dictionary + store + helpers   | Config files, plugins, providers      |
| **Flexibility**  | Full control over postMessage flow     | May not integrate with iframe easily  |
| **Scalability**  | Gets messy with 50+ pages/languages    | Handles large-scale well              |

### Why `useMemo`?

`getLabText()` returns a new object reference each time. `useMemo` ensures the text object is only recalculated when `language` actually changes, avoiding unnecessary re-renders.

---

## Troubleshooting

### Backend sends LANG_CHANGE but nothing happens

1. **Check message format** — must have `source: "OLABS_SIMULATION"` and `type: "LANG_CHANGE"`
2. **Check payload structure** — must be `payload.context.lang` (not `payload.lang`)
3. **Check language code** — must be in `SUPPORTED_LANGUAGES` (`en`, `hi`, `mr`, `ml`)
4. **Open browser console** — look for "Unknown message type" warnings
5. **Check origin** — if origin validation is enabled, parent must match `PARENT_ORIGIN`

### Language doesn't persist after refresh

- Open DevTools → Application → Local Storage → look for `olab_language` key
- Check that `localStorage` is available (not blocked in incognito)

### One component updates but another doesn't

- Make sure both components use `useStore((s) => s.language)` (not local `useState`)
- If a component still uses `useState(getCurrentLanguage())`, it won't reactively update

### New language button appears but shows English text

- Make sure you added the translation entry in `simpleLabText.js`
- Make sure you added the code to `SUPPORTED_LANGUAGES` in `useStore.js`
- Check for typos in the language code (e.g., `"ta"` vs `"TA"`)

### SIMULATION_INIT doesn't set language

- Make sure `payload.context.lang` exists in the INIT payload
- Check that `layout.js` has the `if (payload?.context?.lang)` check in `onInit`

---

## Quick Reference

| What you want to do                        | Where to change                                          |
|--------------------------------------------|----------------------------------------------------------|
| Edit English text                          | `src/i18n/simpleLabText.js` → `en` object                |
| Edit Hindi/Marathi/Malayalam text          | `src/i18n/simpleLabText.js` → `translations.hi/mr/ml`    |
| Add a new language                         | `useStore.js` (SUPPORTED_LANGUAGES) + `simpleLabText.js` (dictionary) + `Theorytext.jsx` (UI button) |
| Add a new page section                     | `simpleLabText.js` (dictionary) + new component          |
| Change localStorage key name              | `simpleLabText.js` → `LAB_LANGUAGE_STORAGE_KEY`          |
| Change default language                     | `simpleLabText.js` → `DEFAULT_LANGUAGE`                  |
| Move language switcher position            | `Theorytext.jsx` → fixed div CSS classes                 |
| Add language switcher to another page      | Import `useStore`, subscribe to `language`, call `setLanguage` |
| Change postMessage format for LANG_CHANGE  | `receiver.js` → `case MESSAGE_TYPES.LANG_CHANGE`        |
| Change parent origin URL                   | `constants.js` → `PARENT_ORIGIN`                        |
| Read current language from any component   | `useStore((s) => s.language)`                            |
| Change language programmatically           | `useStore.getState().setLanguage("hi")`                  |
