"use client";

import { MainPage } from "next-english-node";
import QuizPopupContent from "../../components/QuizPopupContent";
import Proceduretext from "./Proceduretext";
import { useEffect, useMemo, useState } from "react";
import { RestrictedToken, UnrestrictedToken } from "../app.config";
import { useRouter } from "next/navigation";
import useTabProgress from "../useTabProgress";
import { getTranslation } from "@/i18n";
import { useStore } from "@/store/useStore";


export default function Page() {
  const [procedure, setProcedure] = useState(true);
  const router = useRouter();
  const [enableContinue, setEnableContinue] = useState(false);
    const language = useStore((s) => s.language);
  const t = useMemo(() => getTranslation(language), [language]);
  let loggedIn = false;

  useTabProgress("Procedure");

  useEffect(() => {
    if (loggedIn) {
      RestrictedToken.isprocedurevisited = procedure;
      setProcedure(false);

    } else {
      UnrestrictedToken.isprocedurevisited = procedure;
      setProcedure(true);
    }
  }, []);



  const continuebtn = () => {
    UnrestrictedToken.isprocedurevisited = "done";
    router.push("/animation");
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
      M_midcontent_comp={<Proceduretext setProcedure={setProcedure} />}
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
