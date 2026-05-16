"use client"

import React, { useEffect, useState, useCallback, useMemo } from "react"
import { useStore, EXPERIMENT_TYPES } from "@/store/useStore"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog"
import { Lightbulb, ChevronLeft, ChevronRight } from "lucide-react"
import { getTranslation } from "@/i18n"

const EXPERIMENT_NAME_KEY = {
  [EXPERIMENT_TYPES.SOLUBILITY_IN_WATER]: "experiment_solubility",
  [EXPERIMENT_TYPES.ODOUR_TEST]: "experiment_odour",
  [EXPERIMENT_TYPES.LITMUS_TEST]: "experiment_litmus",
  [EXPERIMENT_TYPES.BICARBONATE_REACTION]: "experiment_bicarbonate",
}

export default function FoodForThoughtSection() {
  const experimentSelected = useStore((s) => s.experimentSelected)
  const language = useStore((s) => s.language)
  const t = useMemo(() => getTranslation(language), [language])

  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [source, setSource] = useState(null)
  const [popupOpen, setPopupOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  const fetchQuestions = useCallback(async () => {
    if (!experimentSelected) {
      setQuestions([])
      return
    }
    setLoading(true)
    setQuestions([])
    setSource(null)
    try {
      const res = await fetch("/api/food-for-thought", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: experimentSelected }),
      })
      const data = await res.json()
      if (Array.isArray(data?.questions)) {
        setQuestions(data.questions)
        setSource(data.source || null)
      }
    } catch {
      setQuestions([])
    } finally {
      setLoading(false)
    }
  }, [experimentSelected])

  useEffect(() => {
    fetchQuestions()
  }, [fetchQuestions])

  const openPopups = useCallback(() => {
    if (questions.length > 0) {
      setCurrentIndex(0)
      setPopupOpen(true)
    }
  }, [questions.length])

  const goNext = () => {
    if (currentIndex < questions.length - 1) setCurrentIndex((i) => i + 1)
  }

  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1)
  }

  const closePopup = () => setPopupOpen(false)

  if (!experimentSelected) return null

  const nameKey = EXPERIMENT_NAME_KEY[experimentSelected]
  const topicLabel = nameKey ? t[nameKey] : experimentSelected
  const currentQuestion = questions[currentIndex]
  const hasNext = currentIndex < questions.length - 1
  const hasPrev = currentIndex > 0

  return (
    <>
      <div className="side-workspace__section side-workspace__section--thought">
        <h2 className="side-workspace__heading">{t.food_for_thought}</h2>
        <p className="side-workspace__thought-topic">{topicLabel}</p>
        {loading && (
          <p className="side-workspace__thought-loading">{t.food_loading}</p>
        )}
        {!loading && questions.length > 0 && (
          <>
            <Button
              type="button"
              variant="default"
              size="sm"
              className="side-workspace__thought-btn"
              onClick={openPopups}
            >
              <Lightbulb className="h-4 w-4 mr-1.5" />
              {t.food_open_questions} ({questions.length})
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="side-workspace__thought-refresh"
              onClick={fetchQuestions}
            >
              {t.food_new_questions}
            </Button>
            {source && (
              <p className="side-workspace__thought-source">
                {source === "ollama" ? "Generated (Ollama)" : "Static"}
              </p>
            )}
          </>
        )}
        {!loading && questions.length === 0 && (
          <p className="side-workspace__thought-empty">{t.food_no_questions}</p>
        )}
      </div>

      <Dialog open={popupOpen} onOpenChange={setPopupOpen}>
        <DialogContent className="food-for-thought-dialog">
          <DialogHeader>
            <DialogTitle className="food-for-thought-dialog__title">
              {t.food_for_thought}
            </DialogTitle>
            <p className="food-for-thought-dialog__topic">{topicLabel}</p>
            <p className="food-for-thought-dialog__step">
              {t.food_question} {currentIndex + 1} {t.food_of} {questions.length}
            </p>
          </DialogHeader>
          {currentQuestion && (
            <div className="food-for-thought-dialog__body">
              <p className="food-for-thought-dialog__question">{currentQuestion}</p>
            </div>
          )}
          <DialogFooter className="food-for-thought-dialog__footer">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={goPrev}
              disabled={!hasPrev}
            >
              <ChevronLeft className="h-4 w-4 mr-0.5" />
              {t.food_previous}
            </Button>
            {hasNext ? (
              <Button type="button" size="sm" onClick={goNext}>
                {t.food_next}
                <ChevronRight className="h-4 w-4 ml-0.5" />
              </Button>
            ) : (
              <Button type="button" size="sm" onClick={closePopup}>
                {t.food_done}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
