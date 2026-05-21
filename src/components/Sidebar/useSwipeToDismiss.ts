import { useDrag } from "@use-gesture/react";
import { useCallback, useRef, useState } from "react";
import type { MouseEventHandler } from "react";

type Options = {
  enabled: boolean;
  handleSelector?: string;
  ignoreSelector?: string;
  onDismiss: () => void;
};

const CLAIM_DISTANCE = 12;
const DEFAULT_IGNORE_SELECTOR = [
  "a",
  "button",
  "input",
  "select",
  "textarea",
  "summary",
  "[contenteditable='true']",
  "[draggable='true']",
  "[role='button']",
  "[role='checkbox']",
  "[role='combobox']",
  "[role='menuitem']",
  "[role='option']",
  "[role='radio']",
  "[role='slider']",
  "[role='spinbutton']",
  "[role='switch']",
  "[data-swipe-dismiss-ignore]",
].join(",");
const DISMISS_VELOCITY = 0.6;
const MIN_DISMISS_DISTANCE = 72;
const MAX_DISMISS_DISTANCE = 160;
const DISMISS_DISTANCE_RATIO = 0.35;

/**
 * Chooses a drag distance that feels proportional to the target while keeping
 * the close threshold reachable on small drawers and deliberate on large ones.
 */
function getDismissThreshold(element: HTMLElement) {
  const width = element.getBoundingClientRect().width;
  return Math.min(
    MAX_DISMISS_DISTANCE,
    Math.max(MIN_DISMISS_DISTANCE, width * DISMISS_DISTANCE_RATIO),
  );
}

/**
 * Decides whether a gesture can start from the event target. Explicit handles
 * win; otherwise interactive controls keep ownership of their own gestures.
 */
function shouldIgnoreStart(
  target: EventTarget | null,
  handleSelector: string | undefined,
  ignoreSelector: string,
) {
  if (!(target instanceof Element)) return true;
  if (handleSelector && target.closest(handleSelector)) return false;
  return !!target.closest(ignoreSelector);
}

/**
 * Right-swipe-to-dismiss for a drawer. Wraps @use-gesture/react's drag with
 * our own start-filtering (handle/ignore selectors), a width-proportional
 * dismiss threshold, and click suppression after a successful gesture.
 */
export function useSwipeToDismiss({
  enabled,
  handleSelector,
  ignoreSelector = DEFAULT_IGNORE_SELECTOR,
  onDismiss,
}: Options) {
  const suppressNextClickRef = useRef(false);
  const dismissThresholdRef = useRef(MIN_DISMISS_DISTANCE);
  const [dragDistance, setDragDistance] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const bind = useDrag(
    ({
      cancel,
      canceled,
      currentTarget,
      event,
      first,
      last,
      movement: [movementX],
      velocity: [velocityX],
    }) => {
      const element = currentTarget as HTMLElement;

      if (canceled) {
        setIsDragging(false);
        setDragDistance(0);
        return;
      }

      if (first) {
        if (shouldIgnoreStart(event.target, handleSelector, ignoreSelector)) {
          cancel();
          return;
        }
        dismissThresholdRef.current = getDismissThreshold(element);
        suppressNextClickRef.current = true;
      }

      if (movementX < -CLAIM_DISTANCE) {
        cancel();
        return;
      }

      const distance = Math.max(0, movementX);

      if (last) {
        const shouldDismiss =
          distance >= dismissThresholdRef.current ||
          (velocityX >= DISMISS_VELOCITY && distance >= CLAIM_DISTANCE * 2);
        setIsDragging(false);
        setDragDistance(0);
        if (shouldDismiss) onDismiss();
        return;
      }

      setIsDragging(true);
      setDragDistance(distance);
    },
    {
      axis: "x",
      enabled,
      filterTaps: true,
      threshold: CLAIM_DISTANCE,
    },
  );

  const onClickCapture = useCallback<MouseEventHandler<HTMLElement>>(
    (event) => {
      if (!suppressNextClickRef.current) return;
      suppressNextClickRef.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
    [],
  );

  return {
    dragDistance,
    dragProgress:
      dragDistance === 0
        ? 0
        : Math.min(dragDistance / dismissThresholdRef.current, 1),
    isDragging,
    swipeHandlers: { ...bind(), onClickCapture },
  };
}
