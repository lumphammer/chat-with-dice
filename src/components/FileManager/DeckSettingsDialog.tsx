import { logger } from "#/utils/logger.ts";
import { DeckCommonBackPicker, type DeckImage } from "./DeckCommonBackPicker";
import { DeckFaceDownToggle } from "./DeckFaceDownToggle";
import {
  DeckIndividualBacksEditor,
  type DeckCard,
} from "./DeckIndividualBacksEditor";
import { actions } from "astro:actions";
import { Settings2 } from "lucide-react";
import { memo, useId, useRef, useState } from "react";

/**
 * The owner's editor for a Deck's configuration: whether Face Down draws are
 * permitted, and which of the Deck's images is the Common Back. Both are Deck
 * configuration, so they travel with the Deck into any Room (ADR-0001).
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
            <div className="modal-box flex flex-col gap-4">
              <h3 id={titleId} className="text-lg font-bold">
                Deck settings: {name}
              </h3>

              {loading ? (
                <div className="flex flex-col gap-2">
                  <div className="skeleton h-8 w-full rounded-lg" />
                  <div className="skeleton h-24 w-full rounded-lg" />
                </div>
              ) : (
                <>
                  <DeckFaceDownToggle
                    allowFaceDown={allowFaceDown}
                    disabled={saving}
                    onChange={(next) => void handleToggleFaceDown(next)}
                  />
                  <DeckCommonBackPicker
                    images={images}
                    commonBackId={commonBackId}
                    disabled={saving}
                    onSelect={(backNodeId) => void handleSelectBack(backNodeId)}
                  />
                  <DeckIndividualBacksEditor
                    cards={cards}
                    disabled={saving}
                    onAssign={(frontNodeId, backNodeId) =>
                      void handleAssignIndividualBack(frontNodeId, backNodeId)
                    }
                    onRemove={(frontNodeId) =>
                      void handleAssignIndividualBack(frontNodeId, null)
                    }
                  />
                </>
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
