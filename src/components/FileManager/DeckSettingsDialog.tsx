import { logger } from "#/utils/logger.ts";
import { DeckBackOption } from "./DeckBackOption";
import { actions } from "astro:actions";
import { Settings2 } from "lucide-react";
import { memo, useRef, useState } from "react";

type DeckImage = { nodeId: string; name: string };

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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [allowFaceDown, setAllowFaceDown] = useState(false);
    const [commonBackId, setCommonBackId] = useState<string | null>(null);
    const [images, setImages] = useState<DeckImage[]>([]);

    const load = async () => {
      setLoading(true);
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
    };

    const handleOpen = () => {
      dialogRef.current?.showModal();
      void load();
    };

    const handleToggleFaceDown = async (next: boolean) => {
      const previous = allowFaceDown;
      setAllowFaceDown(next);
      const result = await actions.files.setDeckAllowFaceDown({
        nodeId,
        allowFaceDown: next,
      });
      if (result.error) {
        logger.error("Failed to set allowFaceDown", result.error);
        setAllowFaceDown(previous);
        setError(result.error.message);
      }
    };

    const handleSelectBack = async (backNodeId: string | null) => {
      const previous = commonBackId;
      setCommonBackId(backNodeId);
      const result = await actions.files.setDeckCommonBack({
        nodeId,
        backNodeId,
      });
      if (result.error) {
        logger.error("Failed to set common back", result.error);
        setCommonBackId(previous);
        setError(result.error.message);
      }
    };

    return (
      <>
        <button type="button" onClick={handleOpen}>
          <Settings2 size={14} />
          Deck settings
        </button>
        {/* escape the menu's immediate-child styling, as HardDeleteDialog does */}
        <div className="contents">
          <dialog ref={dialogRef} closedby="any" className="modal">
            <div className="modal-box flex flex-col gap-4">
              <h3 className="text-lg font-bold">Deck settings: {name}</h3>

              {loading ? (
                <div className="flex flex-col gap-2">
                  <div className="skeleton h-8 w-full rounded-lg" />
                  <div className="skeleton h-24 w-full rounded-lg" />
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-1">
                    <label className="flex cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        className="toggle toggle-primary"
                        checked={allowFaceDown}
                        onChange={(e) =>
                          void handleToggleFaceDown(e.currentTarget.checked)
                        }
                      />
                      <span className="font-medium">Allow face-down draws</span>
                    </label>
                    <span className="text-base-content/60">
                      Cards with a back can come up face down at random.
                    </span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="font-medium">Common back</span>
                    <span className="text-base-content/60">
                      The back shown for every card. The chosen image stops
                      being a card in its own right.
                    </span>
                    <div
                      className="mt-2 flex max-h-64 flex-col gap-1
                        overflow-y-auto"
                    >
                      <label
                        className="hover:bg-base-200 flex cursor-pointer
                          items-center gap-3 rounded-lg p-2"
                      >
                        <input
                          type="radio"
                          name="deck-common-back"
                          className="radio radio-primary shrink-0"
                          checked={commonBackId === null}
                          onChange={() => void handleSelectBack(null)}
                        />
                        <span className="min-w-0 flex-1">No common back</span>
                      </label>
                      {images.map((image) => (
                        <DeckBackOption
                          key={image.nodeId}
                          nodeId={image.nodeId}
                          name={image.name}
                          checked={commonBackId === image.nodeId}
                          onSelect={() => void handleSelectBack(image.nodeId)}
                        />
                      ))}
                      {images.length === 0 && (
                        <span className="text-base-content/60 p-2">
                          This deck has no images to use as a back yet.
                        </span>
                      )}
                    </div>
                  </div>
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
