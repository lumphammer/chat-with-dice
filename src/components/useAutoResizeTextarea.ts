import { useLayoutEffect, useRef } from "react";

/**
 * Syncs a textarea's height to its content on every value change. A
 * cross-browser polyfill for `field-sizing: content`, which Firefox doesn't
 * support yet. Any CSS `max-height` on the element still applies — content
 * beyond that will scroll as normal.
 */
export const useAutoResizeTextarea = (value: string) => {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const textarea = ref.current;
    if (!textarea) return;
    // Collapse to auto first so scrollHeight reflects the actual content when
    // it has shrunk, not the previous (larger) layout height.
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [value]);

  return ref;
};
