"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { useStore } from "../store/useStore";

const INIT_WAIT_MS = 8000;

/** Set `NEXT_PUBLIC_EMBEDDED_SESSION_GUARD=false` in `.env.local` if iframe detection ever blocks real standalone dev. */
const guardEnabled = process.env.NEXT_PUBLIC_EMBEDDED_SESSION_GUARD !== "false";

/**
 * When true, the lab refuses to run as a top-level page (address bar tab). It only runs inside an iframe.
 * Stops “copy iframe src / lab URL → paste in new tab or another browser” at the **client** layer.
 * Not a cryptographic guarantee: a determined user can still use DevTools or proxies; real enforcement needs
 * server-side tokens. This cannot hide the URL from DevTools or the Network panel (browser limitation).
 */
const labEmbedOnly =
  typeof process.env.NEXT_PUBLIC_LAB_EMBED_ONLY !== "undefined" &&
  process.env.NEXT_PUBLIC_LAB_EMBED_ONLY === "true";

function isEmbedded() {
  if (typeof window === "undefined") return false;
  try {
    return window.self !== window.top;
  } catch {
    return false;
  }
}

function embedBypass() {
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).get("embedBypass") === "1";
  } catch {
    return false;
  }
}

function hasValidSession(payload) {
  return Boolean(payload?.auth && payload?.context);
}

const overlayShell = {
  position: "fixed",
  inset: 0,
  zIndex: 100000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
};

const cardStyle = {
  width: "min(520px, 100%)",
  borderRadius: 16,
  background: "var(--background, #fff)",
  color: "var(--foreground, #111)",
  border: "1px solid var(--border, #e5e7eb)",
  boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
  padding: "22px 20px",
};

/**
 * - Standalone tab (not in iframe): show the lab when `NEXT_PUBLIC_LAB_EMBED_ONLY` is off; if embed-only is on,
 *   top-level loads are blocked (portal iframe only).
 * - In iframe: wait for SIMULATION_INIT with auth + context (receiver.js). Until then, show “Connecting…”.
 *   If it never arrives, show error after INIT_WAIT_MS.
 * - Host can block without a full session:
 *   - SIMULATION_INIT with `context.allowLab === false`, or
 *   - postMessage `{ source: "OLABS_SIMULATION", type: "SIMULATION_BLOCKED", payload: { reason?: string } }`
 * - `?embedBypass=1` skips iframe checks (dev).
 * - `NEXT_PUBLIC_EMBEDDED_SESSION_GUARD=false` disables this component entirely.
 * - `NEXT_PUBLIC_LAB_EMBED_ONLY=true` blocks any top-level load unless `?embedBypass=1` (portal iframe only).
 */
export default function EmbeddedSessionGuard({ children }) {
  const sessionData = useStore((s) => s.sessionData);
  /** When embed-only, start in `waiting` so we do not mount the full lab until we know we are in an iframe. */
  const [gate, setGate] = useState(() => (labEmbedOnly ? "waiting" : "standalone"));
  const [hostBlockReason, setHostBlockReason] = useState("");
  /** Why we blocked: host message, init timeout, or top-level when embed-only. */
  const [blockedKind, setBlockedKind] = useState(/** @type {"host"|"init_timeout"|"top_level"|null} */ (null));

  if (!guardEnabled) return children;

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    if (embedBypass()) {
      setBlockedKind(null);
      setGate("standalone");
      return;
    }
    if (labEmbedOnly && !isEmbedded()) {
      setBlockedKind("top_level");
      setGate("blocked");
      return;
    }
    if (!isEmbedded()) {
      setBlockedKind(null);
      setGate("standalone");
      return;
    }
    setBlockedKind(null);
    setGate("waiting");
  }, []);

  useEffect(() => {
    if (hasValidSession(sessionData)) {
      setBlockedKind(null);
      setGate("ready");
    }
  }, [sessionData]);

  useEffect(() => {
    if (gate !== "waiting") return;
    const t = window.setTimeout(() => {
      if (!hasValidSession(useStore.getState().sessionData)) {
        setBlockedKind("init_timeout");
        setGate("blocked");
      }
    }, INIT_WAIT_MS);
    return () => window.clearTimeout(t);
  }, [gate]);

  useEffect(() => {
    const onHostBlock = (e) => {
      const d = e?.detail ?? {};
      const reason =
        typeof d.reason === "string"
          ? d.reason
          : typeof d.message === "string"
            ? d.message
            : typeof d.blockReason === "string"
              ? d.blockReason
              : typeof d.context?.blockReason === "string"
                ? d.context.blockReason
                : "";
      setHostBlockReason(reason);
      setBlockedKind("host");
      setGate("blocked");
    };
    window.addEventListener("olabs-embed-block", onHostBlock);
    return () => window.removeEventListener("olabs-embed-block", onHostBlock);
  }, []);

  if (gate === "standalone" || gate === "ready") return children;

  if (gate === "blocked") {
    const isTopLevelOnly = blockedKind === "top_level";
    const isInitTimeout = blockedKind === "init_timeout";

    const title = isTopLevelOnly
      ? "Open this lab from the portal"
      : "Lab cannot be opened";

    const body =
      isTopLevelOnly ? (
        <p style={{ fontSize: 14, lineHeight: 1.55, margin: 0 }}>
          This address was opened in a full browser tab. For this deployment, the lab only runs inside the
          authorised learning portal (embedded frame). Pasting the link into another tab or browser will not
          start the lab here.
        </p>
      ) : isInitTimeout ? (
        <p style={{ fontSize: 14, lineHeight: 1.55, margin: 0 }}>
          No valid session arrived from the host in time. Open this lab only from the portal page that embeds it.
        </p>
      ) : (
        <p style={{ fontSize: 14, lineHeight: 1.55, margin: 0 }}>
          The learning portal blocked this session, or the session is invalid. Open this lab only from an
          authorised portal page.
        </p>
      );

    const extra =
      blockedKind === "host" && hostBlockReason ? (
        <p style={{ fontSize: 14, lineHeight: 1.55, marginTop: 12, marginBottom: 0 }}>{hostBlockReason}</p>
      ) : null;

    return (
      <div role="alertdialog" aria-modal="true" aria-labelledby="embedded-session-guard-title" style={overlayShell}>
        <div style={{ ...cardStyle, background: "var(--background, #fff)" }}>
          <div id="embedded-session-guard-title" style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>
            {title}
          </div>
          {body}
          {extra}
          <p style={{ fontSize: 12, color: "#6b7280", marginTop: 12, marginBottom: 0 }}>
            Developers: <code>?embedBypass=1</code> on the URL, set{" "}
            <code>NEXT_PUBLIC_EMBEDDED_SESSION_GUARD=false</code> for local dev, or turn off{" "}
            <code>NEXT_PUBLIC_LAB_EMBED_ONLY</code> for standalone builds.
          </p>
          <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 10, marginBottom: 0, lineHeight: 1.45 }}>
            Browsers always reveal document and network URLs in DevTools; that cannot be removed from a web app.
            To restrict access further, use short-lived tokens and validation on your server or portal.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div role="status" aria-live="polite" style={{ ...overlayShell, background: "rgba(0,0,0,0.35)" }}>
      <div style={cardStyle}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Connecting to portal…</div>
        <p style={{ fontSize: 14, lineHeight: 1.5, margin: 0, color: "var(--muted-foreground, #6b7280)" }}>
          Waiting for session from the host application.
        </p>
      </div>
    </div>
  );
}
