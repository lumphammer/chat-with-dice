import { Route, useNavigationContext } from "#/lib/minirouter";
import type { InvertedDraws } from "#/schemas/invertedDraws";
import { DeckCommonBackPicker, type DeckImage } from "../DeckCommonBackPicker";
import { DeckDrawnCardsPicker } from "../DeckDrawnCardsPicker";
import type { DeckCard } from "../DeckIndividualBacksEditor";
import { DeckInvertedPicker } from "../DeckInvertedPicker";
import { DeckSettingsRoot } from "./DeckSettingsRoot";
import { IndividualBacksPanel } from "./IndividualBacksPanel";
import { PanelBody } from "./PanelBody";
import { PanelFrame } from "./PanelFrame";
import {
  commonBack,
  drawnCards,
  individualBacks,
  invertedDraws,
} from "./directions";
import { memo, type KeyboardEvent } from "react";

/**
 * The routed stage of the Deck settings dialog: the root summary panel with its
 * drill-down panels layered over it. Rendered inside the dialog's `<Router>` so
 * it can turn Escape into "go up one panel" until the stack is empty, at which
 * point Escape falls through to close the dialog as usual.
 */
export const DeckSettingsStage = memo(
  ({
    allowFaceDown,
    invertedDrawsValue,
    drawToDiscardPile,
    commonBackId,
    images,
    cards,
    saving,
    onToggleFaceDown,
    onSelectInvertedDraws,
    onSelectDrawToDiscardPile,
    onSelectBack,
    onAssignIndividualBack,
    onRemoveIndividualBack,
    onApplyProposals,
  }: {
    allowFaceDown: boolean;
    invertedDrawsValue: InvertedDraws;
    drawToDiscardPile: boolean;
    commonBackId: string | null;
    images: DeckImage[];
    cards: DeckCard[];
    saving: boolean;
    onToggleFaceDown: (next: boolean) => void;
    onSelectInvertedDraws: (next: InvertedDraws) => void;
    onSelectDrawToDiscardPile: (next: boolean) => void;
    onSelectBack: (backNodeId: string | null) => void;
    onAssignIndividualBack: (frontNodeId: string, backNodeId: string) => void;
    onRemoveIndividualBack: (frontNodeId: string) => void;
    onApplyProposals: (
      pairings: { frontNodeId: string; backNodeId: string }[],
    ) => void;
  }) => {
    const { currentStep, navigate } = useNavigationContext();

    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
      // Below the root, Escape pops one panel instead of closing the dialog;
      // preventDefault stops the dialog's own Escape-to-close from also firing.
      if (e.key === "Escape" && currentStep != null) {
        e.preventDefault();
        e.stopPropagation();
        navigate("here", "up");
      }
    };

    return (
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions
      <div
        className="relative min-h-0 flex-1 overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        <DeckSettingsRoot
          allowFaceDown={allowFaceDown}
          invertedDrawsValue={invertedDrawsValue}
          drawToDiscardPile={drawToDiscardPile}
          commonBackId={commonBackId}
          images={images}
          cards={cards}
          disabled={saving}
          onToggleFaceDown={onToggleFaceDown}
        />
        <Route direction={drawnCards}>
          <PanelFrame slide>
            <PanelBody back>
              <DeckDrawnCardsPicker
                drawToDiscardPile={drawToDiscardPile}
                disabled={saving}
                onChange={onSelectDrawToDiscardPile}
              />
            </PanelBody>
          </PanelFrame>
        </Route>
        <Route direction={invertedDraws}>
          <PanelFrame slide>
            <PanelBody back>
              <DeckInvertedPicker
                invertedDraws={invertedDrawsValue}
                disabled={saving}
                onChange={onSelectInvertedDraws}
              />
            </PanelBody>
          </PanelFrame>
        </Route>
        <Route direction={commonBack}>
          <PanelFrame slide>
            <PanelBody back>
              <DeckCommonBackPicker
                images={images}
                commonBackId={commonBackId}
                disabled={saving}
                onSelect={onSelectBack}
              />
            </PanelBody>
          </PanelFrame>
        </Route>
        <Route direction={individualBacks}>
          <IndividualBacksPanel
            cards={cards}
            disabled={saving}
            onAssign={onAssignIndividualBack}
            onRemove={onRemoveIndividualBack}
            onApplyProposals={onApplyProposals}
          />
        </Route>
      </div>
    );
  },
);

DeckSettingsStage.displayName = "DeckSettingsStage";
