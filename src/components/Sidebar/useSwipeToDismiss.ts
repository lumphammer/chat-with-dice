import { useDrag } from "@use-gesture/react";
import { useCallback, useRef, useState } from "react";
import type { MouseEventHandler } from "react";

type Options = {
  enabled: boolean;
  handleSelector?: string;
  ignoreSelector?: string;
  /** Called when the user swipes rightward past threshold. */
  onDismiss?: () => void;
  /** Called when the user swipes leftward past threshold. */
  onReveal?: () => void;
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
 * Horizontal swipe gesture for a drawer. Wraps @use-gesture/react's drag with
 * start-filtering (handle/ignore selectors), a width-proportional threshold,
 * and click suppression after a successful gesture.
 *
 * Rightward swipes call `onDismiss`; leftward swipes call `onReveal`. The
 * caller decides which directions are meaningful at any moment by passing
 * `undefined` for the irrelevant one. `dragDistance` and `dragProgress` only
 * track rightward motion — leftward gestures do not get follow-the-finger
 * feedback in this version.
 */
export function useSwipeToDismiss({
  enabled,
  handleSelector,
  ignoreSelector = DEFAULT_IGNORE_SELECTOR,
  onDismiss,
  onReveal,
}: Options) {
  const suppressNextClickRef = useRef(false);
  const dismissThresholdRef = useRef(MIN_DISMISS_DISTANCE);
  const [dragDistance, setDragDistance] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // After a swipe ends, the browser usually skips the synthesized click
  // (significant touch movement). Without this, the suppress flag would stay
  // set until *some* future click — eating the user's next, unrelated tap.
  // setTimeout(0) defers past the same-task window in which a synthesized
  // click would fire and consume the flag legitimately.
  const clearClickSuppressionSoon = useCallback(() => {
    setTimeout(() => {
      suppressNextClickRef.current = false;
    }, 0);
  }, []);

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
        clearClickSuppressionSoon();
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

      // Only track rightward motion for visual feedback. Leftward gestures
      // (reveal) just commit on release with no follow-the-finger.
      const rightwardDistance = Math.max(0, movementX);

      if (last) {
        const absDistance = Math.abs(movementX);
        const absVelocity = Math.abs(velocityX);
        const threshold = dismissThresholdRef.current;
        const passedThreshold =
          absDistance >= threshold ||
          (absVelocity >= DISMISS_VELOCITY &&
            absDistance >= CLAIM_DISTANCE * 2);
        setIsDragging(false);
        setDragDistance(0);
        if (passedThreshold) {
          if (movementX > 0) onDismiss?.();
          else if (movementX < 0) onReveal?.();
        }
        clearClickSuppressionSoon();
        return;
      }

      setIsDragging(true);
      setDragDistance(rightwardDistance);
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
