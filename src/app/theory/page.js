"use client";

import { MainPage } from "next-english-node";
import Theorytext from "./Theorytext";
import QuizPopupContent from "../../components/QuizPopupContent";
import { useEffect, useMemo, useState } from "react";
import { RestrictedToken, UnrestrictedToken } from "../app.config";
import { useRouter } from "next/navigation";
import useTabProgress from "../useTabProgress";
import { getTranslation } from "@/i18n";
import { useStore } from "@/store/useStore";




export default function Page() {
  const [theory, setTheory] = useState(true);
  const router = useRouter();
  const [enableContinue, setEnableContinue] = useState(false);
   const language = useStore((s) => s.language);
  const t = useMemo(() => getTranslation(language), [language]);
  let loggedIn = false;

  useTabProgress("Theory");

  useEffect(() => {
    if (loggedIn) {
      RestrictedToken.istheoryvisited = theory;
      setTheory(false);
    } else {
      UnrestrictedToken.istheoryvisited = theory;
      setTheory(true);
    }
  }, []);

  const continuebtn = () => {
    UnrestrictedToken.istheoryvisited = "done";
    router.push("/procedure");
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setEnableContinue(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <MainPage
      H_title="Conjunction"
      H_sidebarvisible="visible"
      HQ_quittext="Are you sure, you want to quit?"
      HQ_yes="yes"
      HQ_cancel="cancel"
      HBM_Intruc_popup_title_string="quiz_instruction"
      Quiz_inst={<QuizPopupContent />}
      M_midheight="90%"
      M_midcontent_comp={<Theorytext setTheory={setTheory} />}
      labNo="CDAC-OlabsNxtG-En-19"
      labShortName="Conjunction"
      Client_details={loggedIn ? RestrictedToken : UnrestrictedToken}
      M_continuebtn={continuebtn}
      M_continueEnabled={enableContinue}
      M_continuebtnname={t.continue}
      tabname={{theory: t.theory,procedure: t.procedure,animation: t.animation,simulation: t.simulation,quiz: t.quiz,}}
    />
  );
}
