import { englisheerieClient } from "#/capabilities/englisheerie/client";
import {
  GREY_LADY_COUNT,
  STORY_CARD_LABELS,
  type GreyLadyLoss,
  type StoryCard,
  type StoryCardKind,
} from "#/capabilities/englisheerie/common";
import { ObstructionRollControls } from "./ObstructionRollControls";
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
 *
 * Note the `-text` variants rather than the raw fills. A fill colour is chosen
 * to carry white-ish `-content` text *on top of it*, so using it as ink over a
 * 10% tint of itself is the same mistake `.btn-outline` used to make: 2.57:1
 * under plainLight, 4.08 under libris. The `-text` partners are derived per
 * theme to be legible on the page, and all five of these have one.
 */
const STORY_CARD_TONES: Record<StoryCardKind, string> = {
  secondaryCharacterObstructs:
    "bg-warning/10 border-warning/30 text-warning-text",
  environmentObstructs: "bg-accent/10 border-accent/30 text-accent-text",
  secondaryCharacterHarmed: "bg-error/10 border-error/30 text-error-text",
  clue: "bg-info/10 border-info/30 text-info-text",
  greyLady: "bg-neutral/10 border-neutral/30 text-neutral-text",
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
  greyLadyLoss: GreyLadyLoss | null;
  difficultyBonus: number;
  messageId: string;
}

export const StoryCardMessage = ({
  card,
  cardsRemaining,
  greyLadyNumber,
  greyLadyLoss,
  difficultyBonus,
  messageId,
}: Props) => {
  const capInfo = englisheerieClient.useMount();
  const Icon = STORY_CARD_ICONS[card.kind];
  const rolledBy = capInfo.initialised
    ? capInfo.state.obstructionRollers[card.id]
    : undefined;
  const currentObstruction = capInfo.initialised
    ? capInfo.state.lastObstruction
    : null;
  const currentObstructionDifficulty =
    currentObstruction?.cardId === card.id
      ? currentObstruction.difficulty
      : undefined;
  const canSpendResolveForGreyLady =
    greyLadyLoss === "spirit" &&
    capInfo.initialised &&
    capInfo.state.resolve > 0 &&
    capInfo.state.drawn.some((drawn) => drawn.id === card.id);

  return (
    <div className="mt-1 flex flex-col gap-1 py-1 group-data-is-mine:items-end">
      <p className="text-sm">Drew a story card</p>
      <div
        className={`flex items-center gap-2 rounded border p-2 text-sm
          font-semibold ${STORY_CARD_TONES[card.kind]}`}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {/* The bubble right-aligns its own author's messages, which would leave
            a short label (say "Clue") floating away from its icon. */}
        <span className="grow text-left">{STORY_CARD_LABELS[card.kind]}</span>
        {card.difficulty !== undefined && (
          <span className="badge badge-sm">
            Difficulty {card.difficulty + difficultyBonus}
          </span>
        )}
      </div>
      {card.difficulty !== undefined && difficultyBonus > 0 && (
        <DifficultyBreakdown
          difficulty={card.difficulty}
          difficultyBonus={difficultyBonus}
        />
      )}
      <span className="muted text-xs">
        {greyLadyNumber !== undefined &&
          `Grey Lady ${greyLadyNumber} of ${GREY_LADY_COUNT} · `}
        {cardsRemaining === 0
          ? "the deck is spent"
          : formatCardsRemaining(cardsRemaining)}
      </span>
      {greyLadyLoss !== null && (
        <GreyLadyLossRow
          greyLadyLoss={greyLadyLoss}
          onSpendResolve={
            canSpendResolveForGreyLady
              ? () => capInfo.actions.spendResolveForGreyLady({ messageId })
              : undefined
          }
        />
      )}
      {rolledBy !== undefined ? (
        <span className="muted mt-1 text-sm">Rolled by {rolledBy}</span>
      ) : currentObstructionDifficulty !== undefined ? (
        <ObstructionRollControls difficulty={currentObstructionDifficulty} />
      ) : null}
    </div>
  );
};

/**
 * Where an Obstruction's effective difficulty came from. Only worth saying once
 * a Grey Lady has been drawn — before that the printed difficulty is the whole
 * story, and "+ 0 from 0 Grey Ladies drawn" is noise.
 */
const DifficultyBreakdown = ({
  difficulty,
  difficultyBonus,
}: {
  difficulty: number;
  difficultyBonus: number;
}) => (
  <span className="muted text-xs">
    Base {difficulty} + {difficultyBonus} from {difficultyBonus} Grey{" "}
    {difficultyBonus === 1 ? "Lady" : "Ladies"} drawn
  </span>
);

/** What a Grey Lady cost, and the offer to pay in Resolve instead. */
const GreyLadyLossRow = ({
  greyLadyLoss,
  onSpendResolve,
}: {
  greyLadyLoss: GreyLadyLoss;
  /** Absent when the swap is no longer on offer. */
  onSpendResolve?: () => void;
}) => (
  <div className="mt-1 flex items-center gap-2">
    <span className="muted text-sm">
      1 {greyLadyLoss === "spirit" ? "Spirit" : "Resolve"} lost
    </span>
    {onSpendResolve && (
      <button
        type="button"
        className="btn btn-sm btn-outline"
        onClick={onSpendResolve}
      >
        Spend 1 resolve instead.
      </button>
    )}
  </div>
);
