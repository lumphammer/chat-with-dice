import type { InvertedDraws } from "#/schemas/invertedDraws";
import type { DeckImage } from "../DeckCommonBackPicker";
import type { DeckCard } from "../DeckIndividualBacksEditor";
import { PanelBody } from "./PanelBody";
import { PanelFrame } from "./PanelFrame";
import { SettingRow } from "./SettingRow";
import { commonBack, individualBacks, invertedDraws } from "./directions";
import { memo } from "react";

const INVERTED_SUMMARY: Record<InvertedDraws, string> = {
  none: "Never",
  fronts: "Fronts only",
  "fronts-and-backs": "Fronts and backs",
};

/**
 * The root panel of the Deck settings dialog: a summary of every configurable
 * feature. Face-down draws is a plain toggle handled inline; the rest are rows
 * that drill down into their own panels ({@link SettingRow}).
 */
export const DeckSettingsRoot = memo(
  ({
    allowFaceDown,
    invertedDrawsValue,
    commonBackId,
    images,
    cards,
    disabled,
    onToggleFaceDown,
  }: {
    allowFaceDown: boolean;
    invertedDrawsValue: InvertedDraws;
    commonBackId: string | null;
    images: DeckImage[];
    cards: DeckCard[];
    disabled: boolean;
    onToggleFaceDown: (next: boolean) => void;
  }) => {
    const commonBackName =
      commonBackId === null
        ? "Not set"
        : (images.find((image) => image.nodeId === commonBackId)?.name ??
          "Set");

    const withBack = cards.filter(
      (card) => card.individualBack !== null,
    ).length;
    const individualSummary =
      cards.length === 0 ? "No cards yet" : `${withBack}/${cards.length} set`;

    return (
      <PanelFrame>
        <PanelBody>
          {/* Face-down draws: a toggle, so it acts in place rather than drilling
              down. Label wraps the control; the description sits outside the
              label so the accessible name stays at a depth AT and the linter
              recognise (as elsewhere in this dialog). */}
          <div className="flex flex-col gap-1 p-3">
            <label className="flex cursor-pointer items-center gap-3">
              <span className="min-w-0 flex-1 font-medium">
                Face-down draws
              </span>
              <input
                type="checkbox"
                className="toggle shrink-0"
                checked={allowFaceDown}
                disabled={disabled}
                onChange={(e) => onToggleFaceDown(e.currentTarget.checked)}
              />
            </label>
            <span className="text-base-content/60">
              Cards with a back can come up face down at random.
            </span>
          </div>

          <SettingRow
            label="Inverted draws"
            summary={INVERTED_SUMMARY[invertedDrawsValue]}
            to={invertedDraws()}
            disabled={disabled}
          />
          <SettingRow
            label="Common back"
            summary={commonBackName}
            to={commonBack()}
            disabled={disabled}
          />
          <SettingRow
            label="Individual backs"
            summary={individualSummary}
            to={individualBacks()}
            disabled={disabled}
          />
        </PanelBody>
      </PanelFrame>
    );
  },
);

DeckSettingsRoot.displayName = "DeckSettingsRoot";
