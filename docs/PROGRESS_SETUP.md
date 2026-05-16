# Translation First, Then Progress (Simple Guide)

This guide is written for very easy implementation.
Follow top to bottom.

## 0) What you will do

1. Keep translation ready first.
2. Connect quiz questions to translation.
3. Add progress system.
4. Add event-based progress in simulation (`onClick`, `onDrag`, `onDrop`, etc).

---

## 1) Copy-paste files (full files)

### 1A) Copy-paste `src/utils/messaging/constants.js`

```js
export const MESSAGE_SOURCE = "OLABS_SIMULATION";

export const MESSAGE_TYPES = {
  IFRAME_READY: "IFRAME_READY",
  SIMULATION_INIT: "SIMULATION_INIT",
  SIMULATION_READY_ACK: "SIMULATION_READY_ACK",
  SIMULATION_PROGRESS: "SIMULATION_PROGRESS",
  SIMULATION_SUBMIT: "SIMULATION_SUBMIT",
  LANG_CHANGE: "LANG_CHANGE",

};

export const EXAM_MODE = {
  PRACTICE: "PRACTICE",
  SCORED: "SCORED",
};

export const ACTIVITY_STATUS = {
  STARTED: "STARTED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  EXITED: "EXITED"
};

export const PARENT_ORIGIN = "http://localhost:3000";
export const PROTOCOL_VERSION = "1.0.0";
```

### 1B) Copy-paste `src/utils/messaging/sender.js`

```js
import {
  MESSAGE_SOURCE,
  MESSAGE_TYPES,
  PARENT_ORIGIN,
  PROTOCOL_VERSION,
} from "./constants";

const postToParent = (type, payload = {}) => {
  if (!window.parent) return;

  window.parent.postMessage(
    {
      source: MESSAGE_SOURCE,
      version: PROTOCOL_VERSION,
      type,
      payload,
      timestamp: Date.now(),
    },
    PARENT_ORIGIN
  );
};

export const sendIframeReady = () => {
  postToParent(MESSAGE_TYPES.IFRAME_READY);
};

export const sendReadyAck = (payload) => {
  postToParent(MESSAGE_TYPES.SIMULATION_READY_ACK, payload);
};

export const sendProgress = ({ session, progress, stepId, timeSpent }) => {
  if (!session?.auth?.isAuthenticated) {
    console.log("Guest mode — skipping backend sync");
    return;
  }

  postToParent(MESSAGE_TYPES.SIMULATION_PROGRESS, {
    simulationId: session.context.simulationId,
    attemptId: session.context.attemptId,
    mode: session.context.mode,
    userId: session.auth.userId,
    progress,
    stepId,
    timeSpent,
  });
};
```

### 1C) Copy-paste `src/utils/messaging/receiver.js`

```js
import {
  MESSAGE_SOURCE,
  MESSAGE_TYPES,
  PARENT_ORIGIN,
} from "./constants";
import { sendReadyAck } from "./sender";

export const registerIframeListener = ({ onInit, onLangChange }) => {
  const handler = (event) => {
    if (!event.data || typeof event.data !== "object") return;

    const { source, type, payload } = event.data;
    if (source !== MESSAGE_SOURCE) return;

    switch (type) {
      case MESSAGE_TYPES.SIMULATION_INIT:
        if (!payload?.auth || !payload?.context) return;
        onInit?.(payload);
        onLangChange?.(payload?.context.lang);
        sendReadyAck(payload);
        break;

      case MESSAGE_TYPES.LANG_CHANGE:
        onLangChange?.(payload?.context?.lang);
        break;

      default:
        break;
    }
  };

  window.addEventListener("message", handler);
  return () => window.removeEventListener("message", handler);
};
```

### 1D) Copy-paste `src/app/useTabProgress.js`

```js
import { useEffect, useRef } from "react";
import { useStore } from "../store/useStore";
import { sendProgress } from "../utils/messaging/sender";
import { ACTIVITY_STATUS } from "../utils/messaging/constants";

const getLocalTime = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now - offset).toISOString().slice(0, 19);
};

const TAB_KEYS = {
  Theory: { start: "thStartTime", end: "thEndTime", meta: "thObsMetadata" },
  Procedure: { start: "proStartTime", end: "proEndTime", meta: "proObsMetadata" },
  Animation: { start: "aniStartTime", end: "aniEndTime", meta: "aniObsMetadata" },
  Simulation: { start: "simStartTime", end: "simEndTime", meta: "obsMetadata" },
  Quiz: { start: "quiStartTime", end: "quiEndTime", meta: "quiObsMetadata" },
};

const TAB_CONTRIBUTION = {
  Theory: 0,
  Procedure: 20,
  Animation: 20,
  Simulation: 20,
  Quiz: 20,
};

export function computeProgress(visitedTabs, extraPercentage = 0) {
  let total = 0;
  visitedTabs.forEach((tab) => {
    total += TAB_CONTRIBUTION[tab] ?? 0;
  });
  total += extraPercentage;
  return Math.min(total, 100);
}

export function sendCurrentProgress(sessionData, tabLabel, percentage) {
  const now = getLocalTime();
  const keys = TAB_KEYS[tabLabel];

  sendProgress({
    session: sessionData,
    progress: {
      text: tabLabel,
      percentage,
      [keys.start]: now,
      [keys.end]: now,
      [keys.meta]: JSON.stringify({ answer: `${tabLabel} visited` }),
      actStatus: percentage >= 100 ? ACTIVITY_STATUS.COMPLETED : ACTIVITY_STATUS.IN_PROGRESS,
    },
    stepId: "step-1",
    timeSpent: 0,
  });
}

const useTabProgress = (tabLabel) => {
  const sessionData = useStore((s) => s.sessionData);
  const markTabVisited = useStore((s) => s.markTabVisited);
  const updateMaxPercentage = useStore((s) => s.updateMaxPercentage);
  const hasSent = useRef(false);

  useEffect(() => {
    if (!sessionData || hasSent.current) return;
    hasSent.current = true;

    markTabVisited(tabLabel);

    const { visitedTabs, maxPercentage, simStepPercentage } = useStore.getState();
    const computed = computeProgress(visitedTabs, simStepPercentage);
    const newMax = Math.max(maxPercentage, computed);
    updateMaxPercentage(newMax);

    sendCurrentProgress(sessionData, tabLabel, newMax);
  }, [sessionData]);
};

export default useTabProgress;
```

---

## 2) Translation first (already done projects can skip)

If translation is already running in your app, skip this section.

If not, make sure these files exist:

- `src/i18n/index.js`
- `src/i18n/en.js`
- `src/i18n/hi.js`
- `src/i18n/mr.js`
- `src/i18n/ml.js`
- `src/i18n/simpleLabText.js`

And make sure `src/i18n/index.js` exports `getTranslation`.

---

## 3) Quiz question JSON -> translation file (very important)

You currently have `src/app/quiz/Questions.json`.
Move questions into translation so each language can have its own questions.

### 3A) In `src/i18n/en.js`, add key:

```js
quiz_questions: [
  // paste full array here from Questions.json
],
```

### 3B) In `src/i18n/hi.js`, `src/i18n/mr.js`, `src/i18n/ml.js` also add:

```js
quiz_questions: [
  // for now you can copy English array first
  // later replace text with real translation
],
```

### 3C) In `src/app/quiz/page.js`, use this:

```js
const language = useStore((s) => s.language);
const t = useMemo(() => getTranslation(language), [language]);
```

And pass questions like this:

```js
<Quizquestions quizJson={t.quiz_questions} />
```

That is all. Now quiz questions come from selected language.

---

## 4) Add in `useStore` (only this block)

In `src/store/useStore.js`, inside `create((set, get) => ({ ... }))`, keep/add:

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

---

## 5) What to add in each page (with clear code snapshots)

### Important: Progress implementation starts from here

If you are asking "where should I start progress work?", use this order:

1. Start at **Section 1D** (`src/app/useTabProgress.js`)
2. Then do **Section 4** (`src/store/useStore.js` additions)
3. Then do this **Section 5** (add hook in all 5 pages + remove old manual progress code)
4. Then do **Section 6** (simulation event-based progress: `onClick`, `onDrag`, etc.)

So yes: this section is the beginning of page-level progress hookup.

Do this in all 5 files:

- `src/app/theory/page.js`
- `src/app/procedure/page.js`
- `src/app/animation/page.js`
- `src/app/simulation/page.js`
- `src/app/quiz/page.js`

### 5A) Add this import at top

```js
import useTabProgress from "../useTabProgress";
```

### 5B) Add this line inside component function

Put this line near top of function, before your `useEffect` blocks.

#### Theory
```js
useTabProgress("Theory");
```

#### Procedure
```js
useTabProgress("Procedure");
```

#### Animation
```js
useTabProgress("Animation");
```

#### Simulation
```js
useTabProgress("Simulation");
```

#### Quiz
```js
useTabProgress("Quiz");
```

### 5C) Visual placement example (copy style)

This is how your page should look structurally:

```js
import React, { useEffect, useState, useMemo } from "react";
import useTabProgress from "../useTabProgress";

export default function Page() {
  const [enableContinue, setEnableContinue] = useState(false);

  useTabProgress("Quiz"); // <--- add here

  useEffect(() => {
    const timer = setTimeout(() => setEnableContinue(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  return <div>...</div>;
}
```

### 5D) Before/After mini example

#### Before
```js
import { sendProgress } from "../../utils/messaging/sender";

export default function Page() {
  const sessionData = useStore((s) => s.sessionData);

  useEffect(() => {
    // long sendProgress block
  }, [sessionData]);
}
```

#### After
```js
import useTabProgress from "../useTabProgress";

export default function Page() {
  useTabProgress("Theory");
}
```

### 5E) Remove old progress code (if present)

Delete old progress-only code from each page:

- old `sendProgress` import
- old `ACTIVITY_STATUS` import
- old `getLocalTime` function
- old refs like `startTimeRef`, `startTimestampRef`, `hasSentProgress`
- old `useEffect` that manually called `sendProgress`

#### Example: what to delete

```js
// DELETE these imports
import { sendProgress } from "../../utils/messaging/sender";
import { ACTIVITY_STATUS } from "../../utils/messaging/constants";

// DELETE this function
const getLocalTime = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now - offset).toISOString().slice(0, 19);
};

// DELETE these refs
const hasSentProgress = useRef(false);
const startTimeRef = useRef(null);
const startTimestampRef = useRef(null);

// DELETE this old useEffect
useEffect(() => {
  if (!sessionData || hasSentProgress.current) return;
  hasSentProgress.current = true;

  const now = getLocalTime();

  sendProgress({
    session: sessionData,
    progress: {
      text: "Theory",
      percentage: 0,
      thStartTime: now,
      thEndTime: now,
      thObsMetadata: '{"answer":"Theory started"}',
      actStatus: ACTIVITY_STATUS.STARTED,
    },
    stepId: "step-1",
    timeSpent: 0,
  });
}, [sessionData]);
```

#### After delete, keep this simple

```js
import useTabProgress from "../useTabProgress";

export default function Page() {
  useTabProgress("Theory"); // or Procedure / Animation / Simulation / Quiz

  return <div>...</div>;
}
```

---

## 6) Simulation extra progress from events (your main requirement)

This is the key point:

- Do NOT hardcode `PER_EXPERIMENT = 5` for everyone.
- Instead, add progress when your event happens.
- Event can be `onClick`, `onDragEnd`, `onDrop`, `timeline.onComplete`, etc.

You choose how much to add.

Examples:

- one lab only -> add `20`
- four labs -> add `5` + `5` + `5` + `5`
- ten micro steps -> add `2` each time

### Put this helper in your simulation component

```js
import { useStore } from "@/store/useStore";
import { computeProgress, sendCurrentProgress } from "@/app/useTabProgress";

const sessionData = useStore((s) => s.sessionData);

const addSimProgress = (percentageToAdd) => {
  if (!sessionData) return;

  const { visitedTabs, maxPercentage, simStepPercentage } = useStore.getState();

  const nextSimStep = simStepPercentage + percentageToAdd;
  useStore.getState().updateSimStepPercentage(nextSimStep);

  const computed = computeProgress(visitedTabs, nextSimStep);
  const newMax = Math.max(maxPercentage, computed);
  useStore.getState().updateMaxPercentage(newMax);

  sendCurrentProgress(sessionData, "Simulation", newMax);
};
```

### Call this in events

```js
const onLitmusDone = () => addSimProgress(5);
const onOdourDone = () => addSimProgress(5);
const onWaterDone = () => addSimProgress(5);
const onNahco3Done = () => addSimProgress(5);
```

or

```js
const onSingleLabDone = () => addSimProgress(20);
```

---

## 7) Stop duplicate backend calls

Make sure `src/app/layout.js` does not send progress on its own.
Only page hook + simulation event helper should send progress.

---

## 8) Simple final checklist

- Translation keys work (`t.something` values show correctly)
- Quiz uses `t.quiz_questions`
- `useTabProgress` imported in all 5 pages
- `useStore` has 3 fields + 3 functions for progress
- Simulation calls `addSimProgress(...)` on your own events
- Backend receives increasing progress, never going down
