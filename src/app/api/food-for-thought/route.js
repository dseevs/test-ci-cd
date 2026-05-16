/**
 * Optional "Food for thought" API — tries Ollama (free, local), falls back to static.
 * Lab flow does not depend on this; safe to disable or comment out.
 */

import {
  getStaticQuestionsForTopic,
  getDisplayNameForTopic,
  VALID_TOPICS,
} from '@/lib/foodForThoughtStatic'

// Prefer IPv4 loopback by default to avoid localhost→IPv6 (::1) resolution issues.
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2'
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS) || 10_000

function buildPrompt(topic, topicDisplayName) {
  const variation = ['conceptual understanding', 'real-world application', 'safety or procedure'][
    Math.floor(Math.random() * 3)
  ]
  return `You are an educational assistant for a chemistry lab (acetic acid experiments).
Topic: "${topicDisplayName}" (key: ${topic}).

Generate exactly 3 short "food for thought" questions for a high-school student who has done or will do this experiment. Requirements:
- Each question 1-2 sentences.
- Encourage thinking, not single-fact recall.
- Focus this set on: ${variation}.

Return ONLY a JSON array of exactly 3 strings. Example: ["question1?", "question2?", "question3?"]
No other text, no markdown, no explanation.`
}

async function fetchOllamaQuestions(topic, topicDisplayName) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS)
  try {
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: buildPrompt(topic, topicDisplayName),
        stream: false,
      }),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (!res.ok) return null
    const data = await res.json()
    const text = data?.response?.trim() || ''
    // Try to parse JSON array from response (model might add extra text)
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      if (Array.isArray(parsed) && parsed.length > 0) {
        const cleaned = parsed.filter((q) => typeof q === 'string').slice(0, 3)
        return cleaned.length === 3 ? cleaned : null
      }
    }
    return null
  } catch {
    clearTimeout(timeoutId)
    return null
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}))
    const topic = body?.topic ?? null
    if (!topic || !VALID_TOPICS.includes(topic)) {
      return Response.json(
        { error: 'Invalid topic', validTopics: VALID_TOPICS },
        { status: 400 }
      )
    }
    const topicDisplayName = getDisplayNameForTopic(topic)
    // Cold-starts (first request after boot/model load) can fail sporadically; retry once.
    const ollamaQuestions =
      (await fetchOllamaQuestions(topic, topicDisplayName)) ||
      (await sleep(250).then(() => fetchOllamaQuestions(topic, topicDisplayName)))
    const questions =
      ollamaQuestions?.length > 0
        ? ollamaQuestions
        : getStaticQuestionsForTopic(topic)
    return Response.json({ questions, source: ollamaQuestions?.length ? 'ollama' : 'static' })
  } catch {
    return Response.json({ questions: [], source: 'static' })
  }
}
