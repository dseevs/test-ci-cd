"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { getTranslation } from "@/i18n";
import { useStore } from "@/store/useStore";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import "./procedure.css";
import { getAssetPath } from "@/utils/getAssetPath";

function toSentenceCaseHeading(value) {
  if (typeof value !== "string") return value;
  const s = value.trim();
  if (!s) return s;

  // Only transform Latin headings; leave other scripts as-is.
  if (!/[A-Za-z]/.test(s)) return s;

  return s[0].toUpperCase() + s.slice(1).toLowerCase();
}

const MATERIAL_IMAGES = [
  { id: 1, key: "procedure_material_1", img: getAssetPath("/materials/blue-litmus-paper.svg") },
  { id: 2, key: "procedure_material_2", img: getAssetPath("/materials/double-bored-cork.svg") },
  { id: 3, key: "procedure_material_3", img: getAssetPath("/materials/test-tubes.svg") },
  { id: 4, key: "procedure_material_4", img: getAssetPath("/materials/acetic-acid.svg") },
  { id: 5, key: "procedure_material_5", img: getAssetPath("/materials/stand-with-clamp.svg") },
  { id: 6, key: "procedure_material_6", img: getAssetPath("/materials/delivery-tube.svg") },
  { id: 7, key: "procedure_material_7", img: getAssetPath("/materials/thistle-funnel.svg") },
  { id: 8, key: "procedure_material_8", img: getAssetPath("/materials/sodium-bicarbonate.svg") },
  { id: 9, key: "procedure_material_9", img: getAssetPath("/materials/distilled-water.svg") },
  { id: 10, key: "procedure_material_10", img: getAssetPath("/materials/lime-water.svg") },
  { id: 11, key: "procedure_material_11", img: getAssetPath("/materials/test-tube-rack.svg") },
  { id: 12, key: "procedure_material_12", img: getAssetPath("/materials/boiling-tubes.svg") },
]

const STEP_KEYS = [
  "procedure_step1", "procedure_step2", "procedure_step3", "procedure_step4",
  "procedure_step5", "procedure_step6", "procedure_step7",
]

const PRECAUTION_KEYS = [
  "procedure_precaution1", "procedure_precaution2", "procedure_precaution3",
  "procedure_precaution4", "procedure_precaution5",
]

export default function Proceduretext({ setProcedure }) {
    const router = useRouter();
    const language = useStore((s) => s.language);
    const t = useMemo(() => getTranslation(language), [language]);

    const continuebtn = () => {
        setProcedure(true)
        router.push("/animation");
    }

    return (
  <div className="p-4 scrollbar-primary procedureContent">
         <h4 className="procedureH4 mb-1">{toSentenceCaseHeading(t.procedure_title)}</h4>
      <p className="procedureSubTitle mb-4">{toSentenceCaseHeading(t.procedure_materials_title)}</p>

      <div className="grid grid-cols-3 gap-x-6 gap-y-8 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {MATERIAL_IMAGES.map((item) => (
          <div key={item.id} className="flex flex-col items-center gap-2">
            <div className="h-20 w-20 sm:h-24 sm:w-24 flex items-center justify-center">
              <img
                src={item.img}
                alt={t[item.key]}
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <p className="procedureMaterialLabel text-center font-medium text-gray-700">
              {t[item.key]}
            </p>
          </div>
        ))}
      </div>

      <h5 className="procedureH5 mb-3">{toSentenceCaseHeading(t.procedure_steps_title)}</h5>

      <ol className="procedureList list-decimal pl-5 mb-8">
        {STEP_KEYS.map((key, i) => (
          <li key={i} className="procedureParagraph">{t[key]}</li>
        ))}
      </ol>

      <h5 className="procedureH5 mb-2">{toSentenceCaseHeading(t.procedure_expected_title)}</h5>
      <p className="procedureParagraph mb-6">
        {t.procedure_expected_text}
      </p>

      <h5 className="procedureH5 mb-2">{toSentenceCaseHeading(t.procedure_conclusion_title)}</h5>
      <p className="procedureParagraph mb-6">
        {t.procedure_conclusion_text}
      </p>

      <h5 className="procedureH5 mb-2">{toSentenceCaseHeading(t.procedure_precautions_title)}</h5>
      <ul className="procedureList list-disc pl-5">
        {PRECAUTION_KEYS.map((key, i) => (
          <li key={i} className="procedureParagraph">{t[key]}</li>
        ))}
      </ul>

      {/* <LanguageSwitcher /> */}
  </div>
    )
}
