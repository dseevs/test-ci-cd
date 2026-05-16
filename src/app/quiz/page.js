"use client";

import "../theory/theory.css";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { MainPage, Quizquestions , InfoPopup} from "next-english-node";
import QuizInstructionDialog, {
  hasQuizInstructionsBeenAcknowledged,
  acknowledgeQuizInstructions,
  clearQuizInstructionsAcknowledgement,
} from "@/components/QuizInstructionDialog";
import { RestrictedToken, UnrestrictedToken } from "../app.config";
import { useRouter } from "next/navigation";
import { useStore } from "../../store/useStore";
import { getTranslation } from "@/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import useTabProgress from "../useTabProgress";
import { Button } from "@/components/ui/button";
import QuizPopupContent from "@/components/QuizPopupContent";
import { computeProgress, sendCurrentProgress } from "../useTabProgress";

export default function Page() {
  let loggedIn = false;
  const [enableContinue, setEnableContinue] = useState(false);
  const [quizInstructionsOpen, setQuizInstructionsOpen] = useState(false);
  const [showDialog, setShowDialog] = useState(true);

  const router = useRouter();
  const language = useStore((s) => s.language);
  const t = useMemo(() => getTranslation(language), [language]);
  const openDialog = () => {
    setShowDialog(true);
  };
  const closeDialog = (event) => {
    event.stopPropagation();
    setShowDialog(false);
  };
  const onAgree = () => {
    setShowDialog(false);
  };


const sessionData = useStore((s) => s.sessionData);
const addSimProgress = (percentageToAdd) => {
if (!sessionData) return;
const { visitedTabs, maxPercentage, simStepPercentage } = useStore.getState();
const nextSimStep = simStepPercentage + percentageToAdd;
useStore.getState().updateSimStepPercentage(nextSimStep);
const computed = computeProgress(visitedTabs, nextSimStep);
const newMax = Math.max(maxPercentage, computed);
useStore.getState().updateMaxPercentage(newMax);
const now = Date.now(); 
sendCurrentProgress(sessionData, "Simulation", newMax, now, now);}  // Change "Simulation" to any custom message
  // const handleQuizClose = () => {
  //   addSimProgress(20, "dropped");
  //   router.push("/");
  // };

  useTabProgress("Quiz");

  const data = {
    ok: t.ok,
    questions: t.questions,
    QUESTIONS: t.QUESTIONS,
    questions_marks: t.questions_marks,
    timer: t.timer,
    score: t.score,
    cancel: t.cancel,
    submit: t.submit,
    previous: t.previous,
    next: t.next,
    finish: t.finish,
    hint: t.hint,
    reached_max_attempt: t.reached_max_attempt,
    attempt_next_question: t.attempt_next_question,
    attempt_left_status: t.attempt_left_status,
    not_attempt_status: t.not_attempt_status,
    correct_ans_status: t.correct_ans_status,
    wrong_ans_status: t.wrong_ans_status,
    view_scorecard_question: t.view_scorecard_question,
    yes: t.yes,
    result: t.result,
    you_scored: t.you_scored,
    total_questions: t.total_questions,
    correct_ans_count: t.correct_ans_count,
    wrong_ans_count: t.wrong_ans_count,
    partial_attempt_cout: t.partial_attempt_cout,
    unattempted_count: t.unattempted_count,
    time_taken: t.time_taken,
    minutes: t.minutes,
    minute: t.minute,
    seconds: t.seconds,
    instructions: t.instructions,
  };

  const continuebtn = () => {
    UnrestrictedToken.isprocedurevisited = "done";
    router.push("/");
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setEnableContinue(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  /** Show instructions on first visit per browser tab session; ?instructions=1 forces them again (demo). */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("instructions") === "1") {
      clearQuizInstructionsAcknowledgement();
      setQuizInstructionsOpen(true);
      return;
    }
    if (!hasQuizInstructionsBeenAcknowledged()) {
      setQuizInstructionsOpen(true);
    }
  }, []);

  const handleQuizInstructionsChange = useCallback((open) => {
    setQuizInstructionsOpen(open);
    if (!open) {
      acknowledgeQuizInstructions();
    }
  }, []);
  const handleQuizClose = () => {
    addSimProgress(20, "dropped");
    router.push("/");
  };

  return (
    <div className="theoryContent">
      {/* <MainPage
        M_midheight="90%"
        M_midcontent_comp={<Quizquestions quizJson={t.quiz_questions} />}
        labNo="CDAC-OlabsNxtG-En-19"
        labShortName="AceticAcid"
        Client_details={loggedIn ? RestrictedToken : UnrestrictedToken}
        M_continuebtn={continuebtn}
        M_continueEnabled={enableContinue}
        M_continuebtnname={t.end_activity}
      /> */}
      <MainPage
        midheight="90%"
        M_midcontent_comp={
          <Quizquestions
            questions={t.quiz_questions}
            onClose={handleQuizClose}
            data={data}
            Quiz_inst={<QuizPopupContent />}
            Quiz_inst_title={t.quiz_instructions_title}
          />
        }
        Client_details={loggedIn ? RestrictedToken : UnrestrictedToken}
        M_continuebtn={continuebtn}
        M_continueEnabled={enableContinue}
        // M_continuebtnname="Continue"
        M_continuebtnname={t.end_activity}
        tabname={{theory: t.theory,procedure: t.procedure,animation: t.animation,simulation: t.simulation,quiz: t.quiz,}}

      />

      {/* <QuizInstructionDialog
        open={quizInstructionsOpen}
        onOpenChange={handleQuizInstructionsChange}
        title={t.quiz_instructions_title}
        okLabel={t.infopopup_ok}
      />

      <div className="fixed bottom-20 right-4 z-[60] flex flex-col items-end gap-2 sm:bottom-24">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shadow-md bg-background/95"
          onClick={() => setQuizInstructionsOpen(true)}
        >
          {t.quiz_instructions_title}
        </Button>
        <LanguageSwitcher />
      </div>

      <p className="sr-only" aria-live="polite">
        Demo: append ?instructions=1 to the quiz URL to open instructions again after closing.
      </p> */}
      {showDialog && (
        <InfoPopup
          openDialog={openDialog}
          onAgree={onAgree}
          closeDialog={closeDialog}
          content={<QuizPopupContent />}
          popuptitle={t.quiz_instructions_title}
          ok={t.ok}
          cancel={t.cancel}
        />
      )}
    </div>
  );
}
