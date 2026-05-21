import { useEffect, useRef } from "react";
import type { RefObject } from "react";

type Options = {
  /**
   * Elements outside the modal region that should be made inert while the
   * modal is open. The caller names them explicitly so the hook never has to
   * guess at the surrounding DOM shape.
   */
  backgroundElementRefs: RefObject<HTMLElement | null>[];
  enabled: boolean;
  initialFocusRef: RefObject<HTMLElement | null>;
  onDismiss: () => void;
  regionRef: RefObject<HTMLElement | null>;
  returnFocusRef: RefObject<HTMLElement | null>;
};

type InertState = {
  ariaHidden: string | null;
  element: HTMLElement;
  inert: boolean;
};

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "summary",
  "[contenteditable='true']",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/**
 * Returns visible, focusable descendants inside a modal region in DOM order.
 * Hidden nodes are excluded so tab wrapping does not jump to inaccessible UI.
 */
function getFocusableElements(region: HTMLElement) {
  return Array.from(region.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (element): element is HTMLElement =>
      element instanceof HTMLElement &&
      !element.closest("[hidden], [aria-hidden='true']") &&
      element.getClientRects().length > 0,
  );
}

/**
 * Moves focus into a newly opened modal region, preferring a caller-provided
 * control and falling back to the first focusable descendant.
 */
function focusInitialElement(
  region: HTMLElement,
  initialFocusElement: HTMLElement | null,
) {
  if (initialFocusElement?.isConnected) {
    initialFocusElement.focus();
    return;
  }

  getFocusableElements(region)[0]?.focus();
}

/**
 * Applies modal behavior to a region while enabled: initial focus, Escape to
 * dismiss, Tab trapping, focus restoration, and inert background siblings.
 */
export function useModalRegion({
  backgroundElementRefs,
  enabled,
  initialFocusRef,
  onDismiss,
  regionRef,
  returnFocusRef,
}: Options) {
  const wasEnabledRef = useRef(false);
  // Hold the latest refs array in a ref so the inert effect can read it
  // lazily without depending on the array's identity (which would otherwise
  // re-run the effect — and toggle inert — on every parent render).
  const backgroundElementRefsRef = useRef(backgroundElementRefs);
  backgroundElementRefsRef.current = backgroundElementRefs;

  useEffect(() => {
    if (!enabled) {
      if (wasEnabledRef.current) {
        wasEnabledRef.current = false;
        const returnFocusElement = returnFocusRef.current;
        returnFocusRef.current = null;
        requestAnimationFrame(() => {
          if (returnFocusElement?.isConnected) returnFocusElement.focus();
        });
      }
      return;
    }

    const region = regionRef.current;
    if (!region) return;

    wasEnabledRef.current = true;
    requestAnimationFrame(() => {
      focusInitialElement(region, initialFocusRef.current);
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onDismiss();
        return;
      }

      if (event.key !== "Tab") return;

      const focusableElements = getFocusableElements(region);
      if (focusableElements.length === 0) {
        event.preventDefault();
        region.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (!activeElement || !region.contains(activeElement)) {
        event.preventDefault();
        firstElement?.focus();
        return;
      }

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
        return;
      }

      if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [enabled, initialFocusRef, onDismiss, regionRef, returnFocusRef]);

  useEffect(() => {
    if (!enabled) return;

    const inertStates: InertState[] = [];

    for (const ref of backgroundElementRefsRef.current) {
      const element = ref.current;
      if (!element) continue;

      inertStates.push({
        ariaHidden: element.getAttribute("aria-hidden"),
        element,
        inert: element.inert,
      });
      element.inert = true;
      element.setAttribute("aria-hidden", "true");
    }

    return () => {
      for (const { ariaHidden, element, inert } of inertStates) {
        element.inert = inert;
        if (ariaHidden === null) {
          element.removeAttribute("aria-hidden");
        } else {
          element.setAttribute("aria-hidden", ariaHidden);
        }
      }
    };
  }, [enabled]);
}
