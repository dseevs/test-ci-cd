 "use client";
 
 import { useEffect, useMemo, useRef, useState } from "react";
 
 const CHANNEL_NAME = "olabs_single_tab_guard_v1";
 const STORAGE_KEY = "olabs_single_tab_guard_primary_tab";
 const HEARTBEAT_KEY = "olabs_single_tab_guard_primary_heartbeat";
 
 function randomId() {
   // short id is enough; avoid crypto dependency
   return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
 }
 
 function now() {
   return Date.now();
 }
 
 /**
  * Blocks usage in secondary tabs.
  *
  * Strategy:
  * - Prefer BroadcastChannel for fast cross-tab coordination
  * - Use localStorage + heartbeat as fallback + crash recovery
  */
 export default function SingleTabGuard({
   appName = "This application",
   message = "is already open in another tab. Please use the original tab.",
 }) {
   const tabId = useMemo(() => randomId(), []);
   const [isBlocked, setIsBlocked] = useState(false);
   const [primaryId, setPrimaryId] = useState(null);
   const bcRef = useRef(null);
   const heartbeatTimerRef = useRef(null);
   const confirmTimerRef = useRef(null);
 
   useEffect(() => {
     const hasBC = typeof window !== "undefined" && "BroadcastChannel" in window;
     const bc = hasBC ? new BroadcastChannel(CHANNEL_NAME) : null;
     bcRef.current = bc;
 
     const markPrimary = () => {
       setIsBlocked(false);
       setPrimaryId(tabId);
       try {
         localStorage.setItem(STORAGE_KEY, tabId);
         localStorage.setItem(HEARTBEAT_KEY, String(now()));
       } catch {
         // ignore
       }
 
       if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
       heartbeatTimerRef.current = setInterval(() => {
         try {
           localStorage.setItem(HEARTBEAT_KEY, String(now()));
         } catch {
           // ignore
         }
       }, 1500);
 
       bc?.postMessage({ type: "PRIMARY_ANNOUNCE", tabId });
     };
 
     const blockAsSecondary = (existingPrimaryId) => {
       setPrimaryId(existingPrimaryId ?? null);
       setIsBlocked(true);
     };
 
     const getStoredPrimary = () => {
       try {
         return localStorage.getItem(STORAGE_KEY);
       } catch {
         return null;
       }
     };
 
     const getPrimaryHeartbeatAgeMs = () => {
       try {
         const hb = Number(localStorage.getItem(HEARTBEAT_KEY));
         if (!hb) return Infinity;
         return now() - hb;
       } catch {
         return Infinity;
       }
     };
 
     // 1) Quick check via localStorage (covers no-BC browsers too)
     const storedPrimary = getStoredPrimary();
     if (!storedPrimary) {
       markPrimary();
     } else if (storedPrimary === tabId) {
       markPrimary();
     } else {
       // If the heartbeat is stale, assume the old tab crashed and take over
       const age = getPrimaryHeartbeatAgeMs();
       if (age > 5000) {
         markPrimary();
       } else {
         blockAsSecondary(storedPrimary);
       }
     }
 
     // 2) Coordination via BroadcastChannel (prevents races)
     if (bc) {
       bc.onmessage = (event) => {
         const data = event?.data;
         if (!data || typeof data !== "object") return;
 
         if (data.type === "WHO_IS_PRIMARY") {
           const currentPrimary = getStoredPrimary();
           if (currentPrimary === tabId) {
             bc.postMessage({ type: "PRIMARY_ANNOUNCE", tabId });
           }
         }
 
         if (data.type === "PRIMARY_ANNOUNCE") {
           if (data.tabId && data.tabId !== tabId) {
             // If we thought we were primary, yield to the announced primary unless it is stale
             const age = getPrimaryHeartbeatAgeMs();
             if (age <= 5000 && getStoredPrimary() !== data.tabId) {
               try {
                 localStorage.setItem(STORAGE_KEY, data.tabId);
               } catch {
                 // ignore
               }
             }
             if (data.tabId !== getStoredPrimary()) return;
             if (data.tabId !== tabId) blockAsSecondary(data.tabId);
           }
         }
       };
 
       // Ask existing tabs to announce primary; if someone responds, block this tab.
       bc.postMessage({ type: "WHO_IS_PRIMARY", tabId });
 
       // Small delay: if no one answers and storage is empty/stale, become primary.
       confirmTimerRef.current = setTimeout(() => {
         const currentPrimary = getStoredPrimary();
         if (!currentPrimary || currentPrimary === tabId) {
           markPrimary();
         }
       }, 350);
     }
 
     const onStorage = (e) => {
       if (e.key !== STORAGE_KEY) return;
       const nextPrimary = getStoredPrimary();
       if (!nextPrimary) {
         markPrimary();
         return;
       }
       if (nextPrimary === tabId) {
         setIsBlocked(false);
         setPrimaryId(tabId);
       } else {
         blockAsSecondary(nextPrimary);
       }
     };
 
     window.addEventListener("storage", onStorage);
 
     const onBeforeUnload = () => {
       try {
         const currentPrimary = getStoredPrimary();
         if (currentPrimary === tabId) {
           localStorage.removeItem(STORAGE_KEY);
           localStorage.removeItem(HEARTBEAT_KEY);
           bc?.postMessage({ type: "PRIMARY_RELEASED", tabId });
         }
       } catch {
         // ignore
       }
     };
     window.addEventListener("beforeunload", onBeforeUnload);
 
     return () => {
       window.removeEventListener("storage", onStorage);
       window.removeEventListener("beforeunload", onBeforeUnload);
       if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
       if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
       try {
         bc?.close();
       } catch {
         // ignore
       }
     };
   }, [tabId]);
 
   if (!isBlocked) return null;
 
   return (
     <div
       role="dialog"
       aria-modal="true"
       style={{
         position: "fixed",
         inset: 0,
         zIndex: 99999,
         background: "rgba(0,0,0,0.55)",
         display: "flex",
         alignItems: "center",
         justifyContent: "center",
         padding: "24px",
       }}
     >
       <div
         style={{
           width: "min(560px, 100%)",
           borderRadius: "16px",
           background: "white",
           color: "#111827",
           boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
           padding: "20px 18px",
         }}
       >
         <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "10px" }}>
           Already open
         </div>
         <div style={{ fontSize: "14px", lineHeight: 1.55 }}>
           <strong>{appName}</strong> {message}
         </div>
         <div style={{ marginTop: "12px", fontSize: "12px", color: "#6B7280" }}>
           If you closed the original tab, wait a few seconds and refresh this page.
         </div>
       </div>
     </div>
   );
 }
