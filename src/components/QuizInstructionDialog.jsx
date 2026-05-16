"use client";

import "@/app/theory/theory.css";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import QuizPopupContent from "@/components/QuizPopupContent";

const SESSION_KEY = "olabs_quiz_instructions_ack_v1";

export function hasQuizInstructionsBeenAcknowledged() {
  if (typeof window === "undefined") return true;
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function acknowledgeQuizInstructions() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function clearQuizInstructionsAcknowledgement() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * App-owned quiz instruction modal (replaces next-english-node’s InfoPopup on the Quiz tab).
 */
export default function QuizInstructionDialog({ open, onOpenChange, title, okLabel }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showClose={false}
        style={{
          maxHeight: "90vh",
          overflowY: "auto",
          maxWidth: 900,
          width: "min(900px, calc(100vw - 1rem))",
          gap: 0,
        }}
      >
        <DialogHeader style={{ marginBottom: 2 }}>
          <DialogTitle className="theoryH5">{title}</DialogTitle>
        </DialogHeader>
        <div
          style={{
            marginBottom: 10,
            width: "100%",
            borderTop: "2px solid rgba(0,0,0,0.18)",
          }}
        />
        <div className="theoryContent text-foreground" style={{ marginBottom: 8 }}>
          <QuizPopupContent />
        </div>
        <div
          style={{
            marginBottom: 1,
            width: "100%",
            borderTop: "1px solid rgba(0,0,0,0.18)",
          }}
        />
        <DialogFooter style={{ gap: 8, marginTop: 0, paddingTop: 0 }}>
        <Button
            type="button"
            style={{
              borderRadius: 4,
              border: "1px solid rgba(0,0,0,0.15)",
              marginTop: 0,
            }}
            onClick={() => {
              acknowledgeQuizInstructions();
              onOpenChange(false);
            }}
          >
            {okLabel}
          </Button>
          {/* <Button
            type="button"
            variant="ghost"
            style={{
              borderRadius: 4,
              background: "#dc2626",
              backgroundColor: "#dc2626",
              color: "#ffffff",
              border: "1px solid rgba(0,0,0,0.15)",
            }}
            onClick={() => {
              onOpenChange(false);
            }}
          >
            {"Close"}
          </Button>
          */}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
