"use client";
import { Launchpage } from "next-english-node";
import { useStore } from "../store/useStore";
import { useMemo } from "react";
import { getTranslation } from "@/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { getAssetPath } from "../utils/getAssetPath";


export default function Page() {
  const language = useStore((s) => s.language);
  const t = useMemo(() => getTranslation(language), [language]);

  const L_startbtnfun = () => {};

  return (
    <>
      <Launchpage
        L_title={t.launchpage_title}
        L_objective={t.launchpage_obj}
        L_act_objective={t.launchpage_obj_text}
        L_learning_outcome={t.launchpage_learning_outcome}
        L_array={[t.launchpage_learning_outcome_line1]}
        L_startbutton={t.launchpage_start}
        labNo="CDAC-OlabsNxtG-En-19"
        labShortName="AceticAcid"
        L_Developby={t.launchpage_developedby}
        L_CDACMum={t.launchpage_cdac}
        L_fundedby={t.launchpage_fundedby}
        L_ministry={t.launchpage_ministry}
        L_govofindia={t.launchpage_govofindia}
        L_bgimg={getAssetPath("/backg1.png")}
        L_startbtnfun={L_startbtnfun}
      />
      <LanguageSwitcher />
    </>
  );
}
