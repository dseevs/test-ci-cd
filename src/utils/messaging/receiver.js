import { MESSAGE_SOURCE, MESSAGE_TYPES } from "./constants";
 import { sendReadyAck } from "./sender";

/** Comma-separated list (e.g. `https://portal.example.com`). If non-empty, only these origins may drive SIMULATION_INIT / LANG_CHANGE / BLOCKED. */
function getAllowedParentOrigins() {
  const raw = process.env.NEXT_PUBLIC_ALLOWED_PARENT_ORIGINS || "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const allowedParentOrigins = getAllowedParentOrigins();
 
 
 export const registerIframeListener = ({ onInit, onLangChange, onBlocked }) => {
  const handler = (event) => {
    if (!event.data || typeof event.data !== "object") return;

    if (allowedParentOrigins.length > 0) {
      const origin = typeof event.origin === "string" ? event.origin : "";
      if (!origin || !allowedParentOrigins.includes(origin)) return;
    }
 
 
    const { source, type, payload } = event.data;
    if (source !== MESSAGE_SOURCE) return;
 
 
    switch (type) {
      case MESSAGE_TYPES.SIMULATION_INIT:
        if (!payload?.auth || !payload?.context) return;
        if (payload.context.allowLab === false) {
          onBlocked?.(payload);
          return;
        }
        onInit?.(payload);
        onLangChange?.(payload?.context.lang);
        sendReadyAck(payload);
    //    guidedTourStart(payload?.context?.guidedTour);
        break;

      case MESSAGE_TYPES.SIMULATION_BLOCKED:
        onBlocked?.(payload ?? {});
        break;
 
 
      case MESSAGE_TYPES.LANG_CHANGE:
        onLangChange?.(payload?.context?.lang);
        break;
 
 
      default:
        break;
    }
  };
 
 
  window.addEventListener("message", handler);
  return () => window.removeEventListener("message", handler);
 };
 