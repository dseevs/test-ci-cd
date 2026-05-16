/**
 * Static "food for thought" questions per experiment topic.
 * Used when Ollama is unavailable or as fallback. Does not affect lab flow.
 * Topic keys must match store EXPERIMENT_TYPES values (no store import here for server-safe API).
 */

const SOLUBILITY = 'solubility_in_water'
const ODOUR = 'odour_test'
const LITMUS = 'litmus_test'
const BICARBONATE = 'bicarbonate_reaction'

const TOPIC_DISPLAY_NAMES = {
  [SOLUBILITY]: 'Solubility in water',
  [ODOUR]: 'Odour test',
  [LITMUS]: 'Effect of litmus test',
  [BICARBONATE]: 'Reaction with NaHCO₃',
}

/** Static questions per topic; 3–4 each so we can pick randomly for variety */
const STATIC_QUESTIONS = {
  [SOLUBILITY]: [
    'Why do we say acetic acid is "miscible" with water rather than just soluble?',
    'How might the solubility change if we used a much longer-chain carboxylic acid?',
    'What role does hydrogen bonding play in acetic acid dissolving in water?',
  ],
  [ODOUR]: [
    'Why is wafting safer than inhaling directly over the beaker?',
    'How might the odour differ for a dilute vs concentrated solution?',
    'What other common household substance has a similar smell and why?',
  ],
  [LITMUS]: [
    'Why does litmus turn red in acids? What is happening at the molecular level?',
    'How would the result change if you used a very dilute acetic acid solution?',
    'What is the difference between a weak acid and a strong acid in terms of pH?',
  ],
  [BICARBONATE]: [
    'What gas is produced and how could you test for it?',
    'Why do we see effervescence when we add sodium bicarbonate to acetic acid?',
    'How might the amount of CO₂ depend on the concentration of acetic acid?',
  ],
}

export function getStaticQuestionsForTopic(topic) {
  const list = STATIC_QUESTIONS[topic]
  if (!list || !Array.isArray(list)) return []
  // Return a shuffled copy so each refresh can show different order
  const shuffled = [...list].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, 3)
}

export function getDisplayNameForTopic(topic) {
  return TOPIC_DISPLAY_NAMES[topic] || topic
}

export const VALID_TOPICS = [SOLUBILITY, ODOUR, LITMUS, BICARBONATE]
