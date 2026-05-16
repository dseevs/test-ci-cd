import en from "./en"
import hi from "./hi"
import mr from "./mr"
import ml from "./ml"

const translations = { en, hi, mr, ml }
const DEFAULT_LANGUAGE = "en"

export const LAB_LANGUAGE_STORAGE_KEY = "olab_language"

export const LANGUAGES = [
  { key: "en", label: "EN" },
  { key: "hi", label: "HI" },
  { key: "mr", label: "MR" },
  { key: "ml", label: "ML" },
]

export function getCurrentLanguage() {
  let language = DEFAULT_LANGUAGE
  if (typeof window !== "undefined") {
    try {
      const stored = window.localStorage.getItem(LAB_LANGUAGE_STORAGE_KEY)
      if (stored && translations[stored]) language = stored
    } catch {
      /* ignore */
    }
  }
  return language
}

export function setCurrentLanguage(language) {
  const next = translations[language] ? language : DEFAULT_LANGUAGE
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(LAB_LANGUAGE_STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }
}

export function getTranslation(language = getCurrentLanguage()) {
  return translations[language] || translations[DEFAULT_LANGUAGE]
}

export { getTranslation as getLabText }
