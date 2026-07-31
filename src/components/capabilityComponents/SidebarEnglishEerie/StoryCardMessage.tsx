import {
  GREY_LADY_COUNT,
  STORY_CARD_LABELS,
  type StoryCard,
  type StoryCardKind,
} from "#/capabilities/englisheerie/common";
import { formatCardsRemaining } from "./formatCardsRemaining";
import {
  GhostIcon,
  HeartCrackIcon,
  SearchIcon,
  TreePineIcon,
  UserRoundIcon,
} from "lucide-react";
import type { ComponentType } from "react";

/**
 * Theme colours only, written out in full: Tailwind ships the classes it can see
 * in the source, so these can't be assembled from pieces.
 */
const STORY_CARD_TONES: Record<StoryCardKind, string> = {
  secondaryCharacterObstructs: "bg-warning/10 border-warning/30 text-warning",
  environmentObstructs: "bg-accent/10 border-accent/30 text-accent",
  secondaryCharacterHarmed: "bg-error/10 border-error/30 text-error",
  clue: "bg-info/10 border-info/30 text-info",
  greyLady: "bg-neutral/10 border-neutral/30 text-neutral",
};

const STORY_CARD_ICONS: Record<
  StoryCardKind,
  ComponentType<{ className?: string }>
> = {
  secondaryCharacterObstructs: UserRoundIcon,
  environmentObstructs: TreePineIcon,
  secondaryCharacterHarmed: HeartCrackIcon,
  clue: SearchIcon,
  greyLady: GhostIcon,
};

interface Props {
  card: StoryCard;
  cardsRemaining: number;
  greyLadyNumber?: number;
}

export const StoryCardMessage = ({
  card,
  cardsRemaining,
  greyLadyNumber,
}: Props) => {
  const Icon = STORY_CARD_ICONS[card.kind];

  return (
    <div className="mt-1 flex flex-col gap-1 py-1">
      <div
        className={`flex items-center gap-2 rounded border p-2 text-sm
          font-semibold ${STORY_CARD_TONES[card.kind]}`}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {/* The bubble right-aligns its own author's messages, which would leave
            a short label (say "Clue") floating away from its icon. */}
        <span className="grow text-left">{STORY_CARD_LABELS[card.kind]}</span>
        {card.difficulty !== undefined && (
          <span className="badge badge-sm">Difficulty {card.difficulty}</span>
        )}
      </div>
      <span className="text-base-content/50 text-xs">
        {greyLadyNumber !== undefined &&
          `Grey Lady ${greyLadyNumber} of ${GREY_LADY_COUNT} · `}
        {cardsRemaining === 0
          ? "the deck is spent"
          : formatCardsRemaining(cardsRemaining)}
      </span>
    </div>
  );
};
