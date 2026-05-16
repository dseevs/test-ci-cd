"use client";

import { MainPage } from "next-english-node";
import { InfoPopup } from "next-english-node";
import Animation from "./Animation";
import { useEffect, useState, useMemo } from "react";
import { RestrictedToken, UnrestrictedToken } from "../app.config";
import { useRouter } from "next/navigation";
import { useStore } from "../../store/useStore";
import { getTranslation } from "@/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ActStartPopupContent from "../../components/ActStartPopupContent";
import QuizPopupContent from "../../components/QuizPopupContent";
import useTabProgress from "../useTabProgress";

export default function Page() {
  const [animation, setAnimation] = useState(true);
  const router = useRouter();
  const [enableContinue, setEnableContinue] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const language = useStore((s) => s.language);
  const t = useMemo(() => getTranslation(language), [language]);
  let loggedIn = false;

  useTabProgress("Animation");

  useEffect(() => {
    if (loggedIn) {
      RestrictedToken.isanimationvisited = animation;
      setAnimation(false);
    } else {
      UnrestrictedToken.isanimationvisited = animation;
      setAnimation(true);
    }
  }, []);

  const continuebtn = () => {
    setAnimation(true);
    UnrestrictedToken.isanimationvisited = "done";
    router.push("/simulation");
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setEnableContinue(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const openDialog = () => setShowDialog(true);
  const closeDialog = (event) => { event.stopPropagation(); setShowDialog(false); };
  const onAgree = () => {};

  return (
    <>
      <MainPage
        H_title={t.animation_title}
        H_sidebarvisible="visible"
        HQ_quittext={t.homequitpopup_question}
        HQ_yes={t.homequitpopup_yes}
        HQ_cancel={t.homequitpopup_cancel}
        HBM_Intruc_popup_title_string="quiz_instruction"
        Quiz_inst={<QuizPopupContent />}
        M_midheight="90%"
        M_midcontent_comp={<Animation setAnimation={setAnimation} />}
        labNo="CDAC-OlabsNxtG-En-19"
        labShortName="AceticAcid"
        Client_details={loggedIn ? RestrictedToken : UnrestrictedToken}
        M_continuebtn={continuebtn}
        M_continueEnabled={enableContinue}
        M_continuebtnname={t.continue_btn}
        tabname={{theory: t.theory,procedure: t.procedure,animation: t.animation,simulation: t.simulation,quiz: t.quiz,}}

      />

      {showDialog && (
        <InfoPopup
          openDialog={openDialog}
          onAgree={onAgree}
          closeDialog={closeDialog}
          content={<ActStartPopupContent />}
          popuptitle={t.startact_infopopup}
          ok={t.infopopup_ok}
          cancel={t.infopopup_cancel}
        />
      )}

      {/* <LanguageSwitcher /> */}
    </>
  );
}
