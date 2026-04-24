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

  return {
    scrollContainerRef,
    handleScroll,
    scrollToBottom,
    hasNewMessages,
    bottomRef,
  };
}
