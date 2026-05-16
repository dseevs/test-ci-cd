import {
  MESSAGE_SOURCE,
  MESSAGE_TYPES,
  PARENT_ORIGIN,
  PROTOCOL_VERSION,
 } from "./constants";
 
 
 const postToParent = (type, payload = {}) => {
  if (!window.parent) return;
 
 
  window.parent.postMessage(
    {
      source: MESSAGE_SOURCE,
      version: PROTOCOL_VERSION,
      type,
      payload,
      timestamp: Date.now(),
    },
    PARENT_ORIGIN
  );
 };
 
 
 export const sendIframeReady = () => {
  postToParent(MESSAGE_TYPES.IFRAME_READY);
 };
 
 
 export const sendReadyAck = (payload) => {
  postToParent(MESSAGE_TYPES.SIMULATION_READY_ACK, payload);
 };
 
 
 export const sendProgress = ({ session, progress, stepId, timeSpent }) => {
  if (!session?.auth?.isAuthenticated) {
    console.log("Guest mode — skipping backend sync");
    return;
  }
 
 
  postToParent(MESSAGE_TYPES.SIMULATION_PROGRESS, {
    simulationId: session.context.simulationId,
    attemptId: session.context.attemptId,
    mode: session.context.mode,
    userId: session.auth.userId,
    progress,
    stepId,
    timeSpent,
  });
 };

export const sendGuidedTourCompleted = ({ labId, completed = true } = {}) => {
  postToParent(MESSAGE_TYPES.GUIDED_TOUR_COMPLETED, {
    labId,
    completed,
  });
};
 