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
  const isNearBottomRef = useRef(true);
  // Check if user is near the bottom of the scroll container
  const checkIfNearBottom = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return true;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    return distanceFromBottom <= SCROLL_THRESHOLD;
  }, []);

  // Track scroll position to update isNearBottomRef
  const handleScroll = useCallback(() => {
    onScroll?.(
      scrollContainerRef.current?.scrollLeft ?? 0,
      scrollContainerRef.current?.scrollTop ?? 0,
    );
    const nearBottom = checkIfNearBottom();
    isNearBottomRef.current = nearBottom;

    // Clear new messages indicator when user scrolls to bottom
    if (nearBottom && hasNewMessages) {
      setHasNewMessages(false);
    }
  }, [checkIfNearBottom, hasNewMessages, onScroll]);

  // Scroll to bottom and clear indicator
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setHasNewMessages(false);
  }, []);

  // Handle auto-scrolling when messages change
  useLayoutEffect(() => {
    onScroll?.(
      scrollContainerRef.current?.scrollLeft ?? 0,
      scrollContainerRef.current?.scrollTop ?? 0,
    );

    if (isNearBottomRef.current) {
      // User was near bottom, auto-scroll to show new messages
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
  // We deliberately do NOT read isNearBottomRef here. The growth that triggers
  // this observer also fires a scroll event, and that scroll handler runs first
  // and flips isNearBottomRef to false (the user is now, momentarily, far from
  // the bottom because the content jumped down under them). Instead we decide
  // from geometry: was the user near the bottom *before* this growth? We answer
  // that with the previous scroll height, so a late-loading image re-pins while
  // someone scrolled up reading history is left undisturbed.
  //
  // scrollTo (position-based) rather than bottomRef.scrollIntoView: the
  // message-change effect above may still be running a smooth scroll, and asking
  // to scroll the same bottomRef into view again is a no-op while that animation
  // is in flight. Scrolling the container to a fresh position retargets it.
  useLayoutEffect(() => {
    const content = contentRef.current;
    const container = scrollContainerRef.current;
    if (!content || !container) return;

    let prevScrollHeight = container.scrollHeight;

    const observer = new ResizeObserver(() => {
      const distanceFromBottomBefore =
        prevScrollHeight - container.scrollTop - container.clientHeight;
      prevScrollHeight = container.scrollHeight;

      if (distanceFromBottomBefore <= SCROLL_THRESHOLD) {
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
