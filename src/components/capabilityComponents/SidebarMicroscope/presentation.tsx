import type { ItemKind, Tone } from "#/capabilities/microscope/common";
import { CloudIcon, SunIcon } from "lucide-react";

const TONE_ICONS = {
  light: SunIcon,
  dark: CloudIcon,
} as const satisfies Record<Tone, unknown>;

const ICON_SIZE = 14;

/**
 * Light and Dark as weather rather than as ink. The game draws them as a hollow
 * circle and a filled one, which only reads correctly on paper: on a dark theme
 * the *filled* glyph — the Dark one — is drawn in a light colour, so the symbol
 * says the opposite of what it means. A sun and a cloud are pictures of the
 * thing rather than a value on the palette's ramp, so they survive a theme
 * flipping polarity.
 *
 * Still no colour role: a Dark period is not a warning and a Light one is not a
 * success, and borrowing those roles would say something the game doesn't.
 *
 * `aria-hidden`, because every place this appears already says the tone in
 * words beside it.
 */
export const ToneIcon = ({
  tone,
  className,
}: {
  tone: Tone;
  className?: string;
}) => {
  const Icon = TONE_ICONS[tone];
  return <Icon className={className} size={ICON_SIZE} aria-hidden="true" />;
};

export const TONE_LABELS = {
  light: "Light",
  dark: "Dark",
} as const satisfies Record<Tone, string>;

/**
 * A card's supertitle: "Light period", "Dark scene". Says the two things a
 * glyph and an indent could only imply, and the CSS-uppercased rendering
 * leaves the sentence case in the DOM for anyone listening to it rather than
 * looking at it.
 */
export function toneAndKindLabel(tone: Tone, kind: ItemKind): string {
  return `${TONE_LABELS[tone]} ${ITEM_KIND_LABELS[kind]}`;
}

/**
 * The same fact worded to follow "New" in the chat log: "New light period".
 * The tone belongs in the words here as much as on the card — the icon beside
 * it is `aria-hidden`, so without this the log would not say it at all.
 */
export function newItemLabel(tone: Tone, kind: ItemKind): string {
  return `New ${TONE_LABELS[tone].toLowerCase()} ${ITEM_KIND_LABELS[kind]}`;
}

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

/** What a level of the fractal contains, for the "new … in this …" wording. */
export const CHILD_KIND: Record<ItemKind, ItemKind | null> = {
  period: "event",
  event: "scene",
  scene: null,
};
