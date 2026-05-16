"use client";

import { useMemo } from "react";
import { ListItemText, Typography } from "@mui/material";
import { useStore } from "@/store/useStore";
import { getTranslation } from "@/i18n";

const POPUP_LINE_KEYS = [
    "actstartpopup_line1",
    "actstartpopup_line2",
    "actstartpopup_line3",
    "actstartpopup_line4",
]

export default function ActStartPopupContent() {
    const language = useStore((s) => s.language);
    const t = useMemo(() => getTranslation(language), [language]);

    return (
        <div>
            {POPUP_LINE_KEYS.map((key, i) => (
                <ListItemText key={i} sx={{ display: "list-item" }}>
                    <Typography sx={{ fontSize: "calc(.6rem + .3vw)" }}>
                        {t[key]}
                    </Typography>
                </ListItemText>
            ))}
        </div>
    );
}
