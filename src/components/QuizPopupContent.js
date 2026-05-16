"use client";

import { useMemo } from "react";
import { useStore } from "@/store/useStore";
import { getTranslation } from "@/i18n";
import "@/app/theory/theory.css";

const QUIZ_LINE_KEYS = [
  "quizpopup_line1",
  "quizpopup_line2",
  "quizpopup_line3",
  "quizpopup_line4",
  "quizpopup_line5",
  "quizpopup_line6",
  "quizpopup_line7",
  "quizpopup_line8",
];

export default function QuizPopupContent() {
  const language = useStore((s) => s.language);
  const t = useMemo(() => getTranslation(language), [language]);

  return (
    <div className="theoryContent">
      <ul className="theoryList list-disc pl-5">
        {QUIZ_LINE_KEYS.map((key) => (
          <li key={key}>{t[key]}</li>
        ))}
      </ul>
    </div>
  );
}
