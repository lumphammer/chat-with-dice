import type { ItemKind, Tone } from "#/capabilities/microscope/common";
import { CircleIcon } from "lucide-react";

/**
 * Light and Dark, drawn the way the game draws them: a hollow circle and a
 * filled one. No colour role — a Dark period is not a warning and a Light one
 * is not a success, and borrowing those roles would say something the game
 * doesn't.
 */
export const ToneGlyph = ({
  tone,
  className,
}: {
  tone: Tone;
  className?: string;
}) => (
  <CircleIcon
    className={`${tone === "dark" ? "fill-current" : ""} ${className ?? ""}`}
    size={14}
    aria-hidden="true"
  />
);

export const TONE_LABELS = {
  light: "Light",
  dark: "Dark",
} as const satisfies Record<Tone, string>;

export const ITEM_KIND_LABELS = {
  period: "period",
  event: "event",
  scene: "scene",
} as const satisfies Record<ItemKind, string>;

/** What a level of the fractal contains, for the "new … in this …" wording. */
export const CHILD_KIND: Record<ItemKind, ItemKind | null> = {
  period: "event",
  event: "scene",
  scene: null,
};
