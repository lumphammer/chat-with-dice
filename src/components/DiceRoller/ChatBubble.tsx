import { isRollType } from "#/rollTypes/isRollType";
import { rollTypeRegistry } from "#/rollTypes/rollTypeRegistry";
import type { RollerMessage } from "#/validators/rollerMessageType";
import { deriveHueFromUserId } from "../../utils/deriveHueFromUserId";
import { RollResultErrorBoundary } from "../RollResultErrorBoundary";
import { ShowMoreDialog } from "./ShowMoreDialog";
import { TimeDisplay } from "./TimeDisplay";
import { useUserIdentityContext } from "./contexts/userIdentityContext";
import type { UserHueStyle } from "./types";
import quikdown from "quikdown";
import {
  memo,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

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

  let display: ReactNode = null;

  if (
    isRollType(message.rollType) &&
    message.formula !== null &&
    message.results !== null
  ) {
    const Component = rollTypeRegistry[message.rollType].DisplayComponent;
    display = <Component formula={message.formula} result={message.results} />;
  }

  return (
    <article
      data-is-mine={message.chatId === chatId ? "" : undefined}
      className="group mb-2 w-full pb-1
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
        className="w-fit rounded-xl bg-(--user-colour) px-4 pt-1 pb-1 text-base
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
        <RollResultErrorBoundary>{display}</RollResultErrorBoundary>
      </div>
    </article>
  );
});

ChatBubble.displayName = "ChatBubble";
