"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import Image from "next/image";
import { getTranslation } from "@/i18n";
import { useStore } from "@/store/useStore";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import "./theory.css";
import { getAssetPath } from "@/utils/getAssetPath";
function toSentenceCaseHeading(value) {
  if (typeof value !== "string") return value;
  const s = value.trim();
  if (!s) return s;

  // Only transform Latin headings; leave other scripts as-is.
  if (!/[A-Za-z]/.test(s)) return s;

  return s[0].toUpperCase() + s.slice(1).toLowerCase();
}

export default function Theorytext({ setTheory }) {
    const router = useRouter();
    const language = useStore((s) => s.language);
    const t = useMemo(() => getTranslation(language), [language]);

    const continuebtn = () => {
        localStorage.setItem("theory", "true");
        setTheory(true);
        router.push("/procedure");
    }

    return (
        <div className="p-4 scrollbar-primary theoryContent">

      <h5 className="theoryH5 mb-3">{toSentenceCaseHeading(t.theory_obj_title)}</h5>
      <p className="theoryParagraph mb-4">
        {t.theory_obj_intro}
      </p>
      <ul className="theoryList mb-6 list-disc pl-5">
        <li>{t.theory_obj_item1}</li>
        <li>{t.theory_obj_item2}</li>
        <li>{t.theory_obj_item3}</li>
        <li>{t.theory_obj_item4}</li>
      </ul>

      <h5 className="theoryH5 mb-3">{toSentenceCaseHeading(t.theory_title)}</h5>

      <h6 className="theoryH6 mb-2">{toSentenceCaseHeading(t.theory_acetic_heading)}</h6>
     <div className="h-20 w-20 sm:h-24 sm:w-24 flex items-center justify-center">
  <Image
    src={getAssetPath("/Theory.png")}
    alt={t.theory_image_alt}
    width={200}
    height={200}
    className="object-contain"
  />
</div>
      <p className="theoryParagraph mb-4">
        {t.theory_acetic_para1}
      </p>
      <p className="theoryParagraph mb-6">
        {t.theory_acetic_para2}
      </p>

      <h6 className="theoryH6 mb-2">{toSentenceCaseHeading(t.theory_properties_heading)}</h6>

      <h6 className="theoryH6 mb-2">{toSentenceCaseHeading(t.theory_acidic_heading)}</h6>
      <p className="theoryParagraph mb-4">
        {t.theory_acidic_para}
      </p>

      <h6 className="theoryH6 mb-2">{toSentenceCaseHeading(t.theory_reaction_heading)}</h6>
      <p className="theoryParagraph mb-4">
        {t.theory_reaction_para1}
      </p>
      <p className="theoryParagraph mb-6">
        {t.theory_reaction_para2}
      </p>

      <h6 className="theoryH6 mb-2">{toSentenceCaseHeading(t.theory_uses_heading)}</h6>
      <ul className="theoryList mb-6 list-disc pl-5">
        <li>{t.theory_use1}</li>
        <li>{t.theory_use2}</li>
        <li>{t.theory_use3}</li>
        <li>{t.theory_use4}</li>
      </ul>

      <h5 className="theoryH5 mb-3">{toSentenceCaseHeading(t.theory_learning_title)}</h5>
      <ul className="theoryList list-disc pl-5">
        <li>{t.theory_learning_item1}</li>
        <li>{t.theory_learning_item2}
          <ul className="theoryList mt-1 ml-4 list-disc">
            <li>{t.theory_learning_subitem1}</li>
            <li>{t.theory_learning_subitem2}</li>
            <li>{t.theory_learning_subitem3}</li>
          </ul>
        </li>
        <li>{t.theory_learning_item3}</li>
        <li>{t.theory_learning_item4}</li>
      </ul>

      {/* <LanguageSwitcher /> */}
        </div>
    )
}
