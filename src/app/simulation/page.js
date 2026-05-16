"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { MainPage } from "next-english-node";
import { InfoPopup } from "next-english-node";
import Simulatinmidcomp from "./Simulatinmidcomp";
import { RestrictedToken, UnrestrictedToken } from "../app.config";
import ActStartPopupContent from "../../components/ActStartPopupContent";
import QuizPopupContent from "../../components/QuizPopupContent";
import { useRouter } from "next/navigation";
import { useStore } from "../../store/useStore";
import { getTranslation } from "@/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import useTabProgress, { computeProgress, sendCurrentProgress } from "../useTabProgress";

export default function Page() {
    const [simulation, setSimulation] = useState(true);
    const router = useRouter();
    const [enableContinue, setEnableContinue] = useState(false);
    const [showDialog, setShowDialog] = useState(true);
    let loggedIn = false;
    const sessionData = useStore((s) => s.sessionData);
    const activityObservationUnlocked = useStore((s) => s.activityObservationUnlocked);
    const language = useStore((s) => s.language);
    const t = useMemo(() => getTranslation(language), [language]);
    const lastSentCount = useRef(0);

    useTabProgress("Simulation");

    useEffect(() => {
        if (loggedIn) {
            RestrictedToken.issimulationvisited = simulation;
            setSimulation(false);
        } else {
            UnrestrictedToken.issimulationvisited = simulation;
            setSimulation(true);
        }
    }, []);

    const continuebtn = () => {
        router.push("/quiz");
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setEnableContinue(true);
        }, 2000);
        return () => clearTimeout(timer);
    }, []);

    const openDialog = () => setShowDialog(true);
    const closeDialog = (event) => { event.stopPropagation(); setShowDialog(false); };
    const onAgree = () => setShowDialog(false);

    useEffect(() => {
        if (!sessionData) return;

        const completedCount = Object.values(activityObservationUnlocked).filter(Boolean).length;
        if (completedCount === 0 || completedCount === lastSentCount.current) return;
        lastSentCount.current = completedCount;

        const { visitedTabs, maxPercentage } = useStore.getState();
        const computed = computeProgress(visitedTabs, completedCount);
        const newMax = Math.max(maxPercentage, computed);
        useStore.getState().updateMaxPercentage(newMax);

        sendCurrentProgress(sessionData, "Simulation", newMax);
    }, [activityObservationUnlocked, sessionData]);

    return (
        <>
            <MainPage
                H_title={t.workspace_title}
                H_sidebarvisible="visible"
                HQ_quittext={t.homequitpopup_question}
                HQ_yes={t.homequitpopup_yes}
                HQ_cancel={t.homequitpopup_cancel}
                HBM_Intruc_popup_title_string="quiz_instruction"
                Quiz_inst={<QuizPopupContent />}
                M_midheight="90%"
                M_midcontent_comp={<Simulatinmidcomp />}
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
