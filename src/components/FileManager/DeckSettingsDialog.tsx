import { Router } from "#/lib/minirouter";
import type { InvertedDraws } from "#/schemas/invertedDraws";
import { logger } from "#/utils/logger.ts";
import type { DeckImage } from "./DeckCommonBackPicker";
import type { DeckCard } from "./DeckIndividualBacksEditor";
import { DeckSettingsStage } from "./deckSettings/DeckSettingsStage";
import { actions } from "astro:actions";
import { Settings2 } from "lucide-react";
import { memo, useId, useRef, useState } from "react";

/**
 * The owner's editor for a Deck's configuration: whether Face Down draws are
 * permitted, how Inverted draws are permitted, and which of the Deck's images is
 * the Common Back. All are Deck configuration, so they travel with the Deck into
 * any Room (ADR-0001).
 *
 * Rendered as a menu item plus its own dialog (mirroring HardDeleteDialog) so it
 * can live inside the folder's actions menu. Each change is saved immediately;
 * an optimistic local update is rolled back if the server rejects it.
 */
export const DeckSettingsDialog = memo(
  ({ nodeId, name }: { nodeId: string; name: string }) => {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const titleId = useId();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [allowFaceDown, setAllowFaceDown] = useState(false);
    const [invertedDraws, setInvertedDraws] = useState<InvertedDraws>("none");
    const [commonBackId, setCommonBackId] = useState<string | null>(null);
    const [images, setImages] = useState<DeckImage[]>([]);
    const [cards, setCards] = useState<DeckCard[]>([]);
    // One mutation at a time. The controls save on change, so without this a
    // rapid toggle could fire a second request that resolves before the first
    // and persist the older choice while the UI shows the newer one. Disabling
    // every control while a save is in flight makes the writes strictly ordered.
    const [saving, setSaving] = useState(false);

    // `showSkeleton` is only for the first open; a reload after a pairing change
    // refreshes the derived Card list in place without flashing the skeleton.
    const load = async (showSkeleton: boolean) => {
      if (showSkeleton) {
        setLoading(true);
      }
      setError(null);
      const result = await actions.files.getDeckSettings({ nodeId });
      setLoading(false);
      if (result.error) {
        setError(result.error.message);
        return;
      }
      setAllowFaceDown(result.data.allowFaceDown);
      setInvertedDraws(result.data.invertedDraws);
      setCommonBackId(result.data.commonBack?.nodeId ?? null);
      setImages(result.data.images);
      setCards(result.data.cards);
    };

    const handleOpen = () => {
      dialogRef.current?.showModal();
      void load(true);
    };

    const handleToggleFaceDown = async (next: boolean) => {
      const previous = allowFaceDown;
      // Clear any error from an earlier failed save so a fresh attempt does not
      // show a stale message while it is in flight.
      setError(null);
      setAllowFaceDown(next);
      setSaving(true);
      const result = await actions.files.setDeckAllowFaceDown({
        nodeId,
        allowFaceDown: next,
      });
      setSaving(false);
      if (result.error) {
        logger.error("Failed to set allowFaceDown", result.error);
        setAllowFaceDown(previous);
        setError(result.error.message);
      }
    };

    const handleSelectInvertedDraws = async (next: InvertedDraws) => {
      const previous = invertedDraws;
      // Clear any error from an earlier failed save so a fresh attempt does not
      // show a stale message while it is in flight.
      setError(null);
      setInvertedDraws(next);
      setSaving(true);
      const result = await actions.files.setDeckInvertedDraws({
        nodeId,
        invertedDraws: next,
      });
      setSaving(false);
      if (result.error) {
        logger.error("Failed to set invertedDraws", result.error);
        setInvertedDraws(previous);
        setError(result.error.message);
      }
    };

    const handleSelectBack = async (backNodeId: string | null) => {
      const previous = commonBackId;
      setError(null);
      setCommonBackId(backNodeId);
      setSaving(true);
      const result = await actions.files.setDeckCommonBack({
        nodeId,
        backNodeId,
      });
      setSaving(false);
      if (result.error) {
        logger.error("Failed to set common back", result.error);
        setCommonBackId(previous);
        setError(result.error.message);
        return;
      }
      // The Common Back image stops being a Card, so the derived Card list
      // shifts: reload it in place so the Individual Backs editor stays in sync.
      await load(false);
    };

    // Pairing changes touch the derived Card list in ways that are awkward to
    // mirror optimistically (an image assigned as a back leaves the Card list and
    // every other Card's choices), so each change saves then reloads the
    // authoritative list. Hand-pairing is click-paced, so the extra read is fine.
    const handleAssignIndividualBack = async (
      frontNodeId: string,
      backNodeId: string | null,
    ) => {
      setError(null);
      setSaving(true);
      const result = await actions.files.setDeckIndividualBack({
        nodeId,
        frontNodeId,
        backNodeId,
      });
      setSaving(false);
      if (result.error) {
        logger.error("Failed to set individual back", result.error);
        setError(result.error.message);
      }
      await load(false);
    };

    // Apply a batch of proposed pairings (from the filename scan) in one go.
    // Each is written through the same server action as a hand pairing, so the
    // store re-validates every one; the proposals are disjoint (no image is used
    // twice), so they stay valid applied in sequence without re-deriving between
    // writes. We stop on the first rejection and reload once at the end.
    const handleApplyProposals = async (
      pairings: { frontNodeId: string; backNodeId: string }[],
    ) => {
      setError(null);
      setSaving(true);
      for (const { frontNodeId, backNodeId } of pairings) {
        // Sequential on purpose: writes stay ordered (as elsewhere in this
        // dialog) and a rejection stops the batch rather than racing the rest.
        // oxlint-disable-next-line no-await-in-loop
        const result = await actions.files.setDeckIndividualBack({
          nodeId,
          frontNodeId,
          backNodeId,
        });
        if (result.error) {
          logger.error("Failed to apply proposed pairing", result.error);
          setError(result.error.message);
          break;
        }
      }
      setSaving(false);
      await load(false);
    };

    return (
      <>
        <button type="button" onClick={handleOpen}>
          <Settings2 size={14} />
          Deck settings
        </button>
        {/* escape the menu's immediate-child styling, as HardDeleteDialog does */}
        <div className="contents">
          <dialog
            ref={dialogRef}
            closedby="any"
            className="modal"
            aria-labelledby={titleId}
          >
            <div
              className="modal-box flex h-[36rem] max-h-[calc(100dvh-5rem)]
                flex-col overflow-hidden"
            >
              <h3 id={titleId} className="text-lg font-bold">
                Deck settings: {name}
              </h3>

              {loading ? (
                <div className="flex flex-col gap-2">
                  <div className="skeleton h-8 w-full rounded-lg" />
                  <div className="skeleton h-24 w-full rounded-lg" />
                </div>
              ) : (
                <Router>
                  <DeckSettingsStage
                    allowFaceDown={allowFaceDown}
                    invertedDrawsValue={invertedDraws}
                    commonBackId={commonBackId}
                    images={images}
                    cards={cards}
                    saving={saving}
                    onToggleFaceDown={(next) => void handleToggleFaceDown(next)}
                    onSelectInvertedDraws={(next) =>
                      void handleSelectInvertedDraws(next)
                    }
                    onSelectBack={(backNodeId) =>
                      void handleSelectBack(backNodeId)
                    }
                    onAssignIndividualBack={(frontNodeId, backNodeId) =>
                      void handleAssignIndividualBack(frontNodeId, backNodeId)
                    }
                    onRemoveIndividualBack={(frontNodeId) =>
                      void handleAssignIndividualBack(frontNodeId, null)
                    }
                    onApplyProposals={(pairings) =>
                      void handleApplyProposals(pairings)
                    }
                  />
                </Router>
              )}

              {error && <p className="text-error">{error}</p>}

              <div className="modal-action">
                <form method="dialog">
                  <button className="btn">Done</button>
                </form>
              </div>
            </div>
            <form method="dialog" className="modal-backdrop">
              <button>close</button>
            </form>
          </dialog>
        </div>
      </>
    );
  },
);

DeckSettingsDialog.displayName = "DeckSettingsDialog";
