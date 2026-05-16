// ( src/store/useStore.js )
'use client'

import { create } from 'zustand'
import { setCurrentLanguage, getCurrentLanguage } from '@/i18n'

export const SUPPORTED_LANGUAGES = ['en', 'hi', 'mr', 'ml']

// Only 4 experiments: solubility, odour, litmus, NaHCO3
export const EXPERIMENT_TYPES = {
  SOLUBILITY_IN_WATER: 'solubility_in_water',
  ODOUR_TEST: 'odour_test',
  LITMUS_TEST: 'litmus_test',
  BICARBONATE_REACTION: 'bicarbonate_reaction',
}

export const useStore = create((set, get) => ({

// Language state — single source of truth for the whole app
language: getCurrentLanguage(),
setLanguage: (lang) => {
  const validLang = SUPPORTED_LANGUAGES.includes(lang) ? lang : 'en'
  setCurrentLanguage(validLang)
  set({ language: validLang })
},

// Session
sessionData: null,
setSessionData: (data) => set({ sessionData: data }),

// Guided tour state (host-driven when embedded)
guidedTour: null,
tourIndicator: false,
setGuidedTour: (guidedTour) =>
  set({
    guidedTour: guidedTour ?? null,
    tourIndicator: Boolean(guidedTour?.showIndicator ?? (!guidedTour?.completed && guidedTour)),
  }),
setTourIndicator: (value) => set({ tourIndicator: Boolean(value) }),








  workspaceView: 'lab',

  /** Experiment ids the learner has finished (via completion dialog → hub) */
  completedExperimentIds: [],

  /** Tracks which experiments the learner has visited/selected at least once */
  visitedExperiments: [EXPERIMENT_TYPES.SOLUBILITY_IN_WATER],

  /** Set true when the in-scene "i" info control appeared; legacy — prefer activity observation modal */
  experimentInfoSignal: false,

  /** experimentId → true once that activity's simulation has finished and observation was shown */
  activityObservationUnlocked: {},

  activityObservationModalOpen: false,
  /** Which experiment the open modal is showing (may differ from selected while switching) */
  activityObservationModalExperimentId: null,

  // Experiment state
  experimentSelected: EXPERIMENT_TYPES.SOLUBILITY_IN_WATER,
  experimentStep: 0, // Current step in experiment
  reactionComplete: false,
  labPhase: 'idle', // 'idle' | 'pouring' | 'reacting' | 'complete'
  
  // Acetic acid properties
  concentration: 0.1, // Molarity (0.1M = 10% acetic acid)
  phValue: 2.87, // pH of 0.1M acetic acid
  litmusColor: 'blue', // 'blue' or 'red'
  conductivity: 0, // mS/cm
  
  // Reaction state
  gasProduced: false, // CO2 from NaHCO3
  gasVolume: 0, // mL
  bicarbonateAdded: false,
  reactionRate: 0,

  // Solubility: drag acetic acid into water beaker
  acidDroppedInWater: false,

  // Odour test: user "wafts" to smell
  odourObserved: false,
  
  // Physical conditions
  temperature: 25, // Celsius
  chemicalVolume: 50, // mL
  timer: 0, // seconds
  timerRunning: false,
  
  // Observations and results
  observations: [],
  userName: '',
  score: 0,
  
  // Actions
  setWorkspaceView: (value) => set({ workspaceView: value }),

  signalExperimentInfoButtonShown: () => set({ experimentInfoSignal: true }),

  clearExperimentInfoSignal: () => set({ experimentInfoSignal: false }),

  /** Call when an activity finishes — opens the observation popup and unlocks replay for that activity only */
  unlockActivityObservation: (experimentId) =>
    set((s) => ({
      activityObservationUnlocked: { ...s.activityObservationUnlocked, [experimentId]: true },
      activityObservationModalOpen: true,
      activityObservationModalExperimentId: experimentId,
      experimentInfoSignal: true,
    })),

  closeActivityObservationModal: () =>
    set({
      activityObservationModalOpen: false,
      activityObservationModalExperimentId: null,
    }),

  /** Header / FAB: reopen observation for the currently selected experiment if it was completed */
  openActivityObservationForCurrentExperiment: () => {
    const s = get()
    const id = s.experimentSelected
    if (!s.activityObservationUnlocked[id]) return
    set({
      activityObservationModalOpen: true,
      activityObservationModalExperimentId: id,
    })
  },

  markExperimentCompleted: (experimentId) => {
    set((s) => {
      if (s.completedExperimentIds.includes(experimentId)) return {}
      return { completedExperimentIds: [...s.completedExperimentIds, experimentId] }
    })
  },

  enterLabWithExperiment: (value) => {
    get().setExperimentSelected(value)
    set({ workspaceView: 'lab' })
  },

  setExperimentSelected: (value) => {
    const prev = get().visitedExperiments
    const visited = prev.includes(value) ? prev : [...prev, value]
    set({
      experimentSelected: value,
      visitedExperiments: visited,
      experimentStep: 0,
      reactionComplete: false,
      gasProduced: false,
      gasVolume: 0,
      reactionRate: 0,
      acidDroppedInWater: false,
      odourObserved: false,
      experimentInfoSignal: false,
      activityObservationModalOpen: false,
      activityObservationModalExperimentId: null,
      ...(value === EXPERIMENT_TYPES.LITMUS_TEST && { litmusColor: 'blue' }),
    })
  },
  
  setExperimentStep: (value) => set({ experimentStep: value }),
  
  setConcentration: (value) => {
    const newConc = Math.max(0.01, Math.min(1.0, value))
    // pH calculation: pH = -log10(Ka * C)^0.5 for weak acid
    // Ka of acetic acid ≈ 1.8 × 10^-5
    const Ka = 1.8e-5
    const newPH = -Math.log10(Math.sqrt(Ka * newConc))
    set({ 
      concentration: newConc,
      phValue: parseFloat(newPH.toFixed(2)),
      // Conductivity increases with concentration
      conductivity: parseFloat((newConc * 0.391).toFixed(3)),
    })
  },
  
  setLitmusColor: (value) => set({ litmusColor: value }),
  
  setTemperature: (value) => {
    set({ temperature: Math.max(0, Math.min(100, value)) })
  },
  
  setChemicalVolume: (value) => set({ chemicalVolume: Math.max(0, value) }),
  
  setBicarbonateAdded: (value) => set({ bicarbonateAdded: value }),

  setAcidDroppedInWater: (value) => set({ acidDroppedInWater: value }),

  setOdourObserved: (value) => set({ odourObserved: value }),
  
  setPhValue: (value) => set({ phValue: value }),
  
  setReactionComplete: (value) => set({ reactionComplete: value }),
  
  setTimer: (value) => set({ timer: typeof value === 'function' ? value(get().timer) : value }),
  
  setTimerRunning: (value) => set({ timerRunning: value }),
  
  setGasProduced: (value) => set({ gasProduced: value }),
  
  setGasVolume: (value) => set({ gasVolume: Math.max(0, value) }),
  
  setReactionRate: (value) => set({ reactionRate: value }),
  
  setObservations: (value) =>
    set({
      observations: typeof value === 'function' ? value(get().observations) : value,
    }),
  
  setUserName: (value) => set({ userName: value }),
  
  setScore: (value) => set({ score: value }),
  
  setLabPhase: (value) => set({ labPhase: value }),
  
  // Run the currently selected experiment (used after pour/animation)
  runCurrentExperiment: () => {
    const state = get()
    switch (state.experimentSelected) {
      case EXPERIMENT_TYPES.SOLUBILITY_IN_WATER:
        get().runSolubilityTest()
        break
      case EXPERIMENT_TYPES.ODOUR_TEST:
        get().runOdourTest()
        break
      case EXPERIMENT_TYPES.LITMUS_TEST:
        get().runLitmusTest()
        break
      case EXPERIMENT_TYPES.BICARBONATE_REACTION:
        get().runBicarbonateReaction()
        break
      default:
        get().setObservations((prev) => [...prev, 'Please select an experiment first'])
    }
  },

  runSolubilityTest: () => {
    setObservations((prev) => [
      ...prev,
      'Acetic acid is soluble in water.',
      'It mixes completely to form a homogeneous solution (miscible).',
    ])
    set({ reactionComplete: true })
  },

  runOdourTest: () => {
    const state = get()
    if (!state.odourObserved) {
      setObservations((prev) => [
        ...prev,
        'Waft the vapour toward you to observe the odour (do not inhale directly).',
      ])
      return
    }
    setObservations((prev) => [
      ...prev,
      'Odour: Pungent, vinegar-like (characteristic of acetic acid).',
      'Never smell chemicals directly—always waft.',
    ])
    set({ reactionComplete: true })
  },
  
  runLitmusTest: () => {
    const state = get()
    const newColor = state.phValue < 7 ? 'red' : 'blue'
    setLitmusColor(newColor)
    setObservations((prev) => [
      ...prev,
      `Litmus paper turned ${newColor}`,
      `This confirms acetic acid is acidic (pH < 7)`,
    ])
    set({ reactionComplete: true })
  },
  
  runBicarbonateReaction: () => {
    const state = get()
    if (!state.bicarbonateAdded) {
      setObservations((prev) => [
        ...prev,
        'Add sodium bicarbonate to observe reaction',
      ])
      return
    }
    
    // CH3COOH + NaHCO3 → CH3COONa + H2O + CO2
    const co2Volume = Math.min(state.chemicalVolume * 0.5, 25) // Max 25mL CO2
    setGasProduced(true)
    setGasVolume(co2Volume)
    setObservations((prev) => [
      ...prev,
      'Effervescence observed - CO2 gas produced',
      `CO2 volume: ${co2Volume.toFixed(1)} mL`,
      'Reaction: CH₃COOH + NaHCO₃ → CH₃COONa + H₂O + CO₂',
    ])
    set({ reactionComplete: true })
  },
  
  resetExperiment: () => {
    set({
      workspaceView: 'lab',
      completedExperimentIds: [],
      visitedExperiments: [EXPERIMENT_TYPES.SOLUBILITY_IN_WATER],
      experimentInfoSignal: false,
      activityObservationUnlocked: {},
      activityObservationModalOpen: false,
      activityObservationModalExperimentId: null,
      experimentSelected: EXPERIMENT_TYPES.SOLUBILITY_IN_WATER,
      experimentStep: 0,
      reactionComplete: false,
      labPhase: 'idle',
      litmusColor: 'blue',
      gasProduced: false,
      gasVolume: 0,
      bicarbonateAdded: false,
      reactionRate: 0,
      acidDroppedInWater: false,
      odourObserved: false,
      timer: 0,
      timerRunning: false,
      observations: [],
      concentration: 0.1,
      phValue: 2.87,
      conductivity: 0.039,
      temperature: 25,
      chemicalVolume: 50,
    })
  },



  ////
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
//////
  
  // Derived selectors
  getIsAcidic: () => get().phValue < 7,
  getTotalObservations: () => get().observations.length,
  getExperimentStatus: () => {
    const state = get()
    return {
      isComplete: state.reactionComplete,
      step: state.experimentStep,
      canProceed: state.experimentStep < 3,
    }
  },
}))

// Hooks for derived values
export const useIsAcidic = () => useStore((s) => s.phValue < 7)
export const useTotalObservations = () => useStore((s) => s.observations.length)
export const useExperimentStatus = () => useStore((s) => ({
  isComplete: s.reactionComplete,
  step: s.experimentStep,
  canProceed: s.experimentStep < 3,
}))

const ALL_EXPERIMENT_KEYS = Object.values(EXPERIMENT_TYPES)
export const useAllExperimentsVisited = () =>
  useStore((s) => ALL_EXPERIMENT_KEYS.every((k) => s.visitedExperiments.includes(k)))
