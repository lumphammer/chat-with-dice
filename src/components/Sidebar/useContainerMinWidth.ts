import { useLayoutEffect, useState } from "react";
import type { RefObject } from "react";

const DEFAULT_REM_IN_PX = 16;

/**
 * Walks up from an element to find the CSS container that should own
 * container-query-sized behavior for the element.
 */
function findNearestContainer(element: HTMLElement) {
  let current = element.parentElement;

  while (current) {
    const { containerType } = getComputedStyle(current);
    if (containerType !== "normal") return current;
    current = current.parentElement;
  }

  return null;
}

/**
 * Reads the root rem size so JS can compare against the same rem-based
 * breakpoint used by the sidebar's CSS container query.
 */
function getRemInPixels() {
  const fontSize = Number.parseFloat(
    getComputedStyle(document.documentElement).fontSize,
  );
  return Number.isFinite(fontSize) ? fontSize : DEFAULT_REM_IN_PX;
}

/**
 * Tracks whether the nearest CSS container around `ref` is at least
 * `minWidthRem` wide. This keeps JS behavior aligned with container queries
 * instead of guessing from the viewport width.
 */
export function useContainerMinWidth(
  ref: RefObject<HTMLElement | null>,
  minWidthRem: number,
) {
  const [matches, setMatches] = useState(false);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const container = findNearestContainer(element);
    if (!container) {
      if (import.meta.env.DEV) {
        console.warn(
          "useContainerMinWidth: no CSS container ancestor found for",
          element,
          "— hook will always return false",
        );
      }
      return;
    }

    const updateMatches = () => {
      setMatches(container.clientWidth >= minWidthRem * getRemInPixels());
    };

    updateMatches();

    const observer = new ResizeObserver(updateMatches);
    observer.observe(container);

    return () => observer.disconnect();
  }, [minWidthRem, ref]);

  return matches;
}
