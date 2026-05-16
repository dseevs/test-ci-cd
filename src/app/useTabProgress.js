import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { sendProgress } from '../utils/messaging/sender';
import { ACTIVITY_STATUS } from '../utils/messaging/constants';

const getLocalTime = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now - offset).toISOString().slice(0, 19);
};

const TAB_KEYS = {
  Theory:     { start: 'thStartTime',  end: 'thEndTime',  meta: 'thObsMetadata'  },
  Procedure:  { start: 'proStartTime', end: 'proEndTime', meta: 'proObsMetadata' },
  Animation:  { start: 'aniStartTime', end: 'aniEndTime', meta: 'aniObsMetadata' },
  Simulation: { start: 'simStartTime', end: 'simEndTime', meta: 'obsMetadata'    },
  Quiz:       { start: 'quiStartTime', end: 'quiEndTime', meta: 'quiObsMetadata' },
};

const TAB_CONTRIBUTION = {
  Theory:     0,
  Procedure:  20,
  Animation:  20,
  Quiz:       20,
  Simulation: 20,
};

const PER_EXPERIMENT = 5;

export function computeProgress(visitedTabs, simExperimentsCompleted = 0) {
  let total = 0;
  visitedTabs.forEach((tab) => {
    total += TAB_CONTRIBUTION[tab] ?? 0;
  });
  total += simExperimentsCompleted * PER_EXPERIMENT;
  return Math.min(total, 100);
}

function sendCurrentProgress(sessionData, tabLabel, percentage, startTime, endTime) {
  const keys = TAB_KEYS[tabLabel];
  const timeSpentMs = endTime - startTime;
  const timeSpentSec = Math.round(timeSpentMs / 1000);

  sendProgress({
    session: sessionData,
    progress: {
      text: tabLabel,
      percentage,
      [keys.start]: new Date(startTime).toISOString().slice(0, 19),
      [keys.end]: new Date(endTime).toISOString().slice(0, 19),
      [keys.meta]: JSON.stringify({ answer: `${tabLabel} visited` }),
      completionStatus: percentage >= 100 ? ACTIVITY_STATUS.COMPLETED : ACTIVITY_STATUS.IN_PROGRESS,
    },
    stepId: 'step-1',
    timeSpent: timeSpentSec,
  });
}

const useTabProgress = (tabLabel) => {
  const sessionData = useStore((s) => s.sessionData);
  const markTabVisited = useStore((s) => s.markTabVisited);
  const updateMaxPercentage = useStore((s) => s.updateMaxPercentage);
  const hasSent = useRef(false);
  const entryTimeRef = useRef(null);
  const exitTimerRef = useRef(null);

  useEffect(() => {
    if (!sessionData) return;

    // If Strict Mode remounts, cancel the pending exit send
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }

    if (!hasSent.current) {
      entryTimeRef.current = Date.now();
      hasSent.current = true;
      markTabVisited(tabLabel);

      const { visitedTabs, maxPercentage, activityObservationUnlocked } = useStore.getState();
      const simCompleted = Object.values(activityObservationUnlocked).filter(Boolean).length;
      const computed = computeProgress(visitedTabs, simCompleted);
      const newMax = Math.max(maxPercentage, computed);
      updateMaxPercentage(newMax);

      sendCurrentProgress(sessionData, tabLabel, newMax, entryTimeRef.current, entryTimeRef.current);
    }

    return () => {
      if (!entryTimeRef.current) return;
      const savedEntry = entryTimeRef.current;
      // Defer exit send — Strict Mode remounts synchronously and will cancel this
      exitTimerRef.current = setTimeout(() => {
        const exitTime = Date.now();
        const { maxPercentage: latestMax } = useStore.getState();
        sendCurrentProgress(sessionData, tabLabel, latestMax, savedEntry, exitTime);
        entryTimeRef.current = null;
        exitTimerRef.current = null;
      }, 100);
    };
  }, [sessionData]);

  useEffect(() => {
    if (!sessionData) return;

    const handleUnload = () => {
      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current);
      }
      if (!entryTimeRef.current) return;
      const exitTime = Date.now();
      const { maxPercentage: latestMax } = useStore.getState();
      sendCurrentProgress(sessionData, tabLabel, latestMax, entryTimeRef.current, exitTime);
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [sessionData]);
};

export { sendCurrentProgress };
export default useTabProgress;
