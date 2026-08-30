import { microscopeClient } from "#/capabilities/microscope/client";
import type {
  ItemKind,
  Placement,
  Tone,
} from "#/capabilities/microscope/common";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";
import { ItemActionsMenu } from "./ItemActionsMenu";
import { ItemEditDialog, type ItemDraft } from "./ItemEditDialog";
import { buildMoveOptions } from "./moveOptions";
import {
  CARD_STYLES,
  CARD_TEXT_STYLES,
  CHILD_KIND,
  ITEM_KIND_LABELS,
  ToneIcon,
  toneAndKindLabel,
} from "./presentation";
import { nanoid } from "nanoid";
import { memo, useMemo, useState, type ReactNode } from "react";

type DialogState =
  { mode: "edit" } | { mode: "create"; kind: ItemKind; placement: Placement };

const EMPTY_DRAFT: ItemDraft = { tone: "light", text: "", answer: "" };

interface Props {
  kind: ItemKind;
  id: string;
  tone: Tone;
  text: string;
  /** A Scene's answer, once it has one. */
  answer?: string;
  /** A Period at one end of the timeline, or at both when it is the only one. */
  bookends?: ("start" | "end")[];
  /** Drives the wording of the delete confirmation, nothing else. */
  hasChildren?: boolean;
  children?: ReactNode;
}

const BOOKEND_LABELS = { start: "START", end: "END" } as const;

/**
 * One card at any level of the fractal. The three levels differ in wording,
 * in whether they can hold anything, and in the Scene's Answer — not enough
 * between them to be worth three components.
 *
 * Anyone can edit or delete anyone's card. History being un-contradictable is a
 * rule the table keeps, not one the notepad enforces; a shared sheet everybody
 * can write on is what this is standing in for.
 */
export const TimelineItemCard = memo(
  ({
    kind,
    id,
    tone,
    text,
    answer,
    bookends,
    hasChildren,
    children,
  }: Props) => {
    const capInfo = microscopeClient.useMount();
    const [dialog, setDialog] = useState<DialogState | null>(null);
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

    const state = capInfo.initialised ? capInfo.state : null;
    const moveOptions = useMemo(
      () => (state === null ? [] : buildMoveOptions(state, id)),
      [state, id],
    );

    if (!capInfo.initialised) {
      return null;
    }

    const { actions } = capInfo;
    const kindLabel = ITEM_KIND_LABELS[kind];
    const childKind = CHILD_KIND[kind];

    const dialogKind = dialog?.mode === "create" ? dialog.kind : kind;
    const isEditing = dialog?.mode === "edit";

    const handleSave = (draft: ItemDraft) => {
      if (dialog === null) {
        return;
      }
      if (dialog.mode === "edit") {
        actions.editItem({
          id,
          tone: draft.tone,
          text: draft.text,
          // Only a Scene has one, and only a Scene's dialog offers the field.
          answer: kind === "scene" ? draft.answer : undefined,
        });
        return;
      }
      actions.createItem({
        id: nanoid(),
        placement: dialog.placement,
        tone: draft.tone,
        text: draft.text,
      });
    };

    return (
      <article className={`rounded-box ${CARD_STYLES[kind]}`}>
        {/* Everything that isn't the writing gets one row to itself, centred
            on a common line. Sharing a row with the text meant the supertitle,
            the bookend badges and the menu each sat wherever the text pushed
            them, and a card with a badge lined up with nothing. The text is
            better off here too: it now gets the card's full width instead of
            being squeezed past a 36px button. */}
        <div className="flex items-center gap-1.5">
          {/* Icon and words are one unit: both flex children of the centred
              row, so they sit on its line without any nudging. */}
          <ToneIcon tone={tone} className="muted shrink-0" />
          <span className="muted shrink-0 text-xs tracking-wide uppercase">
            {toneAndKindLabel(tone, kind)}
          </span>
          <div className="flex min-w-0 grow flex-wrap items-center gap-1">
            {bookends?.map((bookend) => (
              <span key={bookend} className="badge badge-outline badge-xs">
                {BOOKEND_LABELS[bookend]}
              </span>
            ))}
          </div>
          <ItemActionsMenu
            kind={kind}
            moveOptions={moveOptions}
            onEdit={() => setDialog({ mode: "edit" })}
            onCreateBefore={() =>
              setDialog({
                mode: "create",
                kind,
                placement: { relation: "before", targetId: id },
              })
            }
            onCreateAfter={() =>
              setDialog({
                mode: "create",
                kind,
                placement: { relation: "after", targetId: id },
              })
            }
            onCreateInside={
              childKind === null
                ? undefined
                : () =>
                    setDialog({
                      mode: "create",
                      kind: childKind,
                      placement: { relation: "in", targetId: id },
                    })
            }
            onMove={(placement) => actions.moveItem({ id, placement })}
            onDelete={() => setIsConfirmingDelete(true)}
          />
        </div>

        <p className={`wrap-break-word ${CARD_TEXT_STYLES[kind]}`}>{text}</p>
        {answer !== undefined && answer.length > 0 && (
          <p className="muted mt-1 text-sm wrap-break-word">
            <span className="font-semibold">Answer: </span>
            {answer}
          </p>
        )}

        {children}

        <ItemEditDialog
          open={dialog !== null}
          kind={dialogKind}
          title={
            isEditing
              ? `Edit this ${kindLabel}`
              : `New ${ITEM_KIND_LABELS[dialogKind]}`
          }
          initialValues={
            isEditing ? { tone, text, answer: answer ?? "" } : EMPTY_DRAFT
          }
          // A new Scene has no answer yet — the question is the whole of it
          // until somebody plays it.
          showAnswer={isEditing && kind === "scene"}
          onClose={() => setDialog(null)}
          onSave={handleSave}
        />

        <ConfirmDeleteDialog
          open={isConfirmingDelete}
          title={`Delete this ${kindLabel}?`}
          consequence={
            hasChildren ? "Everything inside it goes too." : undefined
          }
          onClose={() => setIsConfirmingDelete(false)}
          onConfirm={() => actions.deleteItem({ id })}
        />
      </article>
    );
  },
);

TimelineItemCard.displayName = "TimelineItemCard";
