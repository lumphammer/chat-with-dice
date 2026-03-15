import type { RollerMessage } from "#/validators/rollerMessageType";
import { DiceRollResult } from "./DiceRollResult";
import { ShowMoreDialog } from "./ShowMoreDialog";
import { TimeDisplay } from "./TimeDisplay";
import { deriveHueFromUserId } from "./deriveHueFromUserId";
import type { UserHueStyle } from "./types";
import { useUserIdentityContext } from "./userIdentityContext";
import quikdown from "quikdown";
import { memo, useLayoutEffect, useMemo, useRef, useState } from "react";

type ChatBubbleProps = {
  message: RollerMessage;
};

export function addLinkTargets(html: string): string {
  return html.replace(/<a\b([^>]*?)>/gi, (match, attrs) => {
    // If a target is already set, leave it alone
    if (/\btarget\s*=/i.test(attrs)) {
      return match;
    }
    return `<a${attrs} target="_new">`;
  });
}

export const ChatBubble = memo(({ message }: ChatBubbleProps) => {
  const hue = deriveHueFromUserId(message.chatId);
  const textRef = useRef<HTMLParagraphElement>(null);
  // const [showMore, setShowMore] = useState(false);
  const [showShowMore, setShowShowMore] = useState(false);

  const { chatId } = useUserIdentityContext();

  const html = useMemo(() => {
    return addLinkTargets(
      quikdown(message.chat ?? "", { inline_styles: false }),
    );
  }, [message.chat]);

  useLayoutEffect(() => {
    function checkHeight() {
      if (textRef.current) {
        setShowShowMore(
          textRef.current.scrollHeight > textRef.current.clientHeight,
        );
      }
    }
    const resizeObserver = new ResizeObserver(checkHeight);
    if (textRef.current) {
      resizeObserver.observe(textRef.current);
      checkHeight();
      return () => resizeObserver.disconnect();
    }
  }, []);

  return (
    <article
      data-is-mine={message.chatId === chatId ? "" : undefined}
      className="group mb-2 w-full
        [--user-colour:oklch(var(--bubble-light-l)_var(--bubble-light-c)_var(--user-hue))]
        data-is-mine:text-right
        dark:[--user-colour:oklch(var(--bubble-dark-l)_var(--bubble-dark-c)_var(--user-hue))]"
      style={{ "--user-hue": hue } satisfies UserHueStyle as UserHueStyle}
    >
      <header className="text-sm">
        <span className="mr-4">{message.displayName}</span>
        <TimeDisplay timeStamp={message.created_time} />
      </header>
      <div
        className="w-fit rounded-lg bg-(--user-colour) px-4 pt-1 text-base
          group-data-is-mine:ml-auto"
      >
        {message.chat && (
          <>
            <p
              dangerouslySetInnerHTML={{ __html: html }}
              ref={textRef}
              className="prose m-0 line-clamp-3 p-0"
            />
            {showShowMore && <ShowMoreDialog html={html} />}
          </>
        )}
        <DiceRollResult
          formula={message.formula}
          rolls={message.results}
          total={message.total}
        />
      </div>
    </article>
  );
});

ChatBubble.displayName = "ChatBubble";
