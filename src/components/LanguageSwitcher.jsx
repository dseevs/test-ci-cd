"use client"

import { useStore } from "@/store/useStore"
import { LANGUAGES } from "@/i18n"

/**
 * Floating language-switcher buttons (EN / HI / MR / ML).
 * Drop this component into any page to let users switch language.
 */
export default function LanguageSwitcher() {
  const language = useStore((s) => s.language)
  const setLang = useStore((s) => s.setLanguage)

  return (
    <div className="fixed bottom-4 right-4 z-50 rounded-md border border-border bg-background/95 p-2 shadow-md backdrop-blur">
      <div className="flex items-center gap-1">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.key}
            type="button"
            onClick={() => setLang(lang.key)}
            className={`rounded px-2 py-1 text-xs font-semibold border ${
              language === lang.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-foreground border-border"
            }`}
          >
            {lang.label}
          </button>
        ))}
      </div>
    </div>
  )
}
