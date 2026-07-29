import type { SignalKind } from "#/capabilities/safety/common";
import { PauseIcon, XIcon } from "lucide-react";
import type { ComponentType } from "react";

/**
 * How each kind of Safety Signal presents itself, in one place so the chat-log
 * entry and the room overlay cannot drift apart on wording or severity.
 *
 * Copy note: an X Card asks for no explanation and offers none. Nothing here
 * should invite the raiser to justify themselves, or the table to work out who
 * it was.
 */
export const SIGNAL_PRESENTATION = {
  xcard: {
    label: "X Card",
    Icon: XIcon,
    /** Theme colour role, not a literal colour — themes redefine both. */
    colorClass: "text-error",
    borderClass: "border-error",
    buttonClass: "btn-error",
    overlayTitle: "X Card",
    overlayBody:
      "Stop and change, rewind, or skip the current content. No explanation is required.",
  },
  pause: {
    label: "Pause",
    Icon: PauseIcon,
    colorClass: "text-warning",
    borderClass: "border-warning",
    buttonClass: "btn-warning",
    overlayTitle: "Pause",
    overlayBody: "Pause for a break or check-in before continuing.",
  },
} as const satisfies Record<
  SignalKind,
  {
    label: string;
    Icon: ComponentType<{ className?: string }>;
    colorClass: string;
    borderClass: string;
    buttonClass: string;
    overlayTitle: string;
    overlayBody: string;
  }
>;
