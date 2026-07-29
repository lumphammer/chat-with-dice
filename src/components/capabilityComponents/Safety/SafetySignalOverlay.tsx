import { safetyClient } from "#/capabilities/safety/client";
import type { SignalKind } from "#/capabilities/safety/common";
import { SIGNAL_PRESENTATION } from "./signalPresentation";
import { memo, useEffect, useId, useRef, useState } from "react";

/**
 * The room-wide interrupt a Safety Signal raises. Mounted for the life of the
 * room via the capability's `RoomOverlayComponent` slot, because an interrupt
 * that only fires when you happen to have the right sidebar tab open is not an
 * interrupt.
 *
 * Driven by `lastSignal` in capability state rather than by the chat log: state
 * arrives whether or not the log is scrolled into view, and a signal id gives a
 * clean "has this changed since I last looked" test that survives reconnects.
 */
export const SafetySignalOverlay = memo(() => {
  const capInfo = safetyClient.useMount();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  const initialised = capInfo.initialised;
  // Read as primitives: `useMount` re-parses state on every render, so the
  // object identity changes constantly and would retrigger the effect below.
  const signalId = capInfo.initialised
    ? (capInfo.state.lastSignal?.id ?? null)
    : null;
  const signalKind = capInfo.initialised
    ? (capInfo.state.lastSignal?.kind ?? null)
    : null;

  /**
   * `undefined` until the first state arrives. That first value — from
   * `capabilityInit` on connect, or after a reload — is adopted silently, so a
   * refresh never replays a signal the participant has already seen. Only a
   * change *after* that opens the overlay.
   */
  const seenSignalIdRef = useRef<string | null | undefined>(undefined);
  const [shownSignal, setShownSignal] = useState<{
    id: string;
    kind: SignalKind;
  } | null>(null);

  useEffect(() => {
    if (!initialised) {
      return;
    }
    if (seenSignalIdRef.current === undefined) {
      seenSignalIdRef.current = signalId;
      return;
    }
    if (signalId === seenSignalIdRef.current) {
      return;
    }
    seenSignalIdRef.current = signalId;
    if (signalId === null || signalKind === null) {
      return;
    }
    setShownSignal({ id: signalId, kind: signalKind });
  }, [initialised, signalId, signalKind]);

  useEffect(() => {
    if (!shownSignal) {
      return;
    }
    // A second signal can land while the first is still up; `showModal` throws
    // on an already-open dialog, so re-use the open one and just swap content.
    if (!dialogRef.current?.open) {
      dialogRef.current?.showModal();
    }
  }, [shownSignal]);

  if (!shownSignal) {
    return null;
  }

  const { Icon, colorClass, buttonClass, overlayTitle, overlayBody } =
    SIGNAL_PRESENTATION[shownSignal.kind];

  return (
    <dialog
      ref={dialogRef}
      className="modal backdrop-blur-sm"
      aria-labelledby={titleId}
      // A Pause is a light interruption and dismisses on any outside gesture.
      // An X Card does not: acknowledging it should be a deliberate act. Escape
      // still closes either — nobody gets trapped in a safety tool.
      closedby={shownSignal.kind === "pause" ? "any" : undefined}
      onClose={() => setShownSignal(null)}
    >
      <div
        className={`modal-box flex flex-col items-center justify-center gap-6
          text-center ${colorClass}`}
      >
        <Icon className="h-32 w-32" />
        <h2 id={titleId} className="heading text-4xl font-bold">
          {overlayTitle}
        </h2>
        <p className="text-base-content max-w-prose text-lg">{overlayBody}</p>
        <button
          type="button"
          className={`btn btn-lg ${buttonClass}`}
          onClick={() => dialogRef.current?.close()}
        >
          Acknowledge
        </button>
      </div>
      {shownSignal.kind === "pause" && (
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      )}
    </dialog>
  );
});

SafetySignalOverlay.displayName = "SafetySignalOverlay";
