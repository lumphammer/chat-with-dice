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
  size,
  className,
}: {
  tone: Tone;
  size?: number;
  className?: string;
}) => (
  <CircleIcon
    className={`${tone === "dark" ? "fill-current" : ""} ${className ?? ""}`}
    size={size ?? DEFAULT_GLYPH_SIZE}
    aria-hidden="true"
  />
);

const DEFAULT_GLYPH_SIZE = 14;

export const TONE_LABELS = {
  light: "Light",
  dark: "Dark",
} as const satisfies Record<Tone, string>;

export const ITEM_KIND_LABELS = {
  period: "period",
  event: "event",
  scene: "scene",
} as const satisfies Record<ItemKind, string>;

/**
 * How the three levels tell themselves apart when you are looking at one card
 * rather than at the indentation around it: a Period is filled and heavy, an
 * Event is a plain outline on top of it, a Scene is a dashed one. Weight and
 * fill rather than hue — a level is not a colour, and Tone already owns the
 * only meaning a Microscope card carries.
 */
export const CARD_STYLES = {
  period: "border-2 border-base-content/40 bg-base-200 p-3",
  event: "border border-base-content/30 p-2",
  scene: "border border-dashed border-base-content/25 p-2",
} as const satisfies Record<ItemKind, string>;

/** The same ladder in type: the deeper the level, the quieter the line. */
export const CARD_TEXT_STYLES = {
  period: "text-base font-semibold",
  event: "text-sm font-medium",
  scene: "text-sm",
} as const satisfies Record<ItemKind, string>;

/** In an object literal, where `no-magic-numbers` leaves the sizes alone. */
export const TONE_GLYPH_SIZES = {
  period: 16,
  event: 14,
  scene: 12,
} as const satisfies Record<ItemKind, number>;

/** What a level of the fractal contains, for the "new … in this …" wording. */
export const CHILD_KIND: Record<ItemKind, ItemKind | null> = {
  period: "event",
  event: "scene",
  scene: null,
};
