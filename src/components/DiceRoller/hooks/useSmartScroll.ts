import { useCallback, useLayoutEffect, useRef, useState } from "react";

const SCROLL_THRESHOLD = 100; // pixels from bottom to consider "near bottom"

export function useSmartScroll({
  messages,
  onScroll,
}: {
  messages: unknown[];
  onScroll?: (x: number, y: number) => void;
}) {
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  // Whether the view should stay pinned to the bottom as content changes. This
  // is *intent*, not a position snapshot: it survives content growth and our
  // own programmatic scrolling, and is cleared only when the user themselves
  // scrolls up away from the bottom.
  const stickToBottomRef = useRef(true);
  const lastScrollTopRef = useRef(0);

  // Check if user is near the bottom of the scroll container
  const checkIfNearBottom = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return true;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    return distanceFromBottom <= SCROLL_THRESHOLD;
  }, []);

  // Track scroll position to update the stick-to-bottom intent
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    const scrollTop = container?.scrollTop ?? 0;
    onScroll?.(container?.scrollLeft ?? 0, scrollTop);

    const nearBottom = checkIfNearBottom();
    // Only a genuine upward scroll by the user breaks the pin. Content growing
    // below the viewport leaves scrollTop unchanged, and our own scroll-to-
    // bottom moves it downward, so neither is mistaken for the user leaving.
    const scrolledUp = scrollTop < lastScrollTopRef.current - 1;
    lastScrollTopRef.current = scrollTop;

    if (nearBottom) {
      stickToBottomRef.current = true;
    } else if (scrolledUp) {
      stickToBottomRef.current = false;
    }

    // Clear new messages indicator when user scrolls to bottom
    if (nearBottom && hasNewMessages) {
      setHasNewMessages(false);
    }
  }, [checkIfNearBottom, hasNewMessages, onScroll]);

  // Scroll to bottom and clear indicator
  const scrollToBottom = useCallback(() => {
    stickToBottomRef.current = true;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setHasNewMessages(false);
  }, []);

  // Handle auto-scrolling when messages change
  useLayoutEffect(() => {
    onScroll?.(
      scrollContainerRef.current?.scrollLeft ?? 0,
      scrollContainerRef.current?.scrollTop ?? 0,
    );

    if (stickToBottomRef.current) {
      // User wants to stay at the bottom, auto-scroll to show new messages
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    } else if (messages.length > 0) {
      // User is scrolled up, show new messages indicator
      setHasNewMessages(true);
    }
  }, [messages, onScroll]);

  // Keep pinned to the bottom while content grows after a message renders. A
  // card draw (and other media) shows an image that loads asynchronously, so the
  // message's height jumps *after* the message-change scroll above has already
  // run. Observing the content lets us re-pin once the image expands the bubble,
  // rather than stopping at the pre-load height.
  //
  // We key off the stick-to-bottom intent rather than the live distance from the
  // bottom: while the message-change smooth scroll is still animating, scrollTop
  // lags its target, so a distance measurement could wrongly read as "scrolled
  // up" and skip the re-pin. scrollTo (position-based) rather than
  // bottomRef.scrollIntoView, because asking to scroll the same bottomRef into
  // view again is a no-op while that animation is in flight; scrolling the
  // container to a fresh position retargets it to the real, post-image bottom.
  useLayoutEffect(() => {
    const content = contentRef.current;
    const container = scrollContainerRef.current;
    if (!content || !container) return;

    const observer = new ResizeObserver(() => {
      if (stickToBottomRef.current) {
        container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
      }
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  return {
    scrollContainerRef,
    contentRef,
    handleScroll,
    scrollToBottom,
    hasNewMessages,
    bottomRef,
  };
}
