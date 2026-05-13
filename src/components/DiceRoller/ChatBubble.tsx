import {
  capabilityRegistry,
  isCapabilityName,
} from "#/capabilities/capabilityRegistry";
import { isRollType } from "#/rollTypes/isRollType";
import { rollTypeRegistry } from "#/rollTypes/rollTypeRegistry";
import { authClient } from "#/utils/auth-client";
import type {
  ChatMessage,
  LinkPreview,
} from "#/validators/webSocketMessageSchemas";
import { deriveHueFromUserId } from "../../utils/deriveHueFromUserId";
import { RollResultErrorBoundary } from "../RollResultErrorBoundary";
import { ShowMoreDialog } from "./ShowMoreDialog";
import { TimeDisplay } from "./TimeDisplay";
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
  message: ChatMessage;
};

export function addLinkTargets(html: string): string {
  return html.replace(/<a\b([^>]*?)>/gi, (_match, attrs) => {
    let nextAttrs = attrs;

    // If a target is already set, leave it alone
    if (!/\btarget\s*=/i.test(nextAttrs)) {
      nextAttrs += ' target="_blank"';
    }

    if (!/\brel\s*=/i.test(nextAttrs)) {
      nextAttrs += ' rel="noopener noreferrer"';
    }

    return `<a${nextAttrs}>`;
  });
}

function LinkPreviewCard({ preview }: { preview: LinkPreview }) {
  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      className="border-base-content/15 bg-base-100 hover:bg-base-200 mt-2 flex
        max-w-md gap-3 rounded-md border p-2 text-left no-underline transition"
    >
      <span className="min-w-0 flex-1">
        {preview.siteName && (
          <span className="block truncate text-xs opacity-70">
            {preview.siteName}
          </span>
        )}
        <span className="line-clamp-2 font-semibold text-current">
          {preview.title}
        </span>
        {preview.description && (
          <span className="mt-1 line-clamp-2 text-sm opacity-80">
            {preview.description}
          </span>
        )}
      </span>
      {preview.imageUrl && (
        <img
          src={preview.imageUrl}
          alt=""
          loading="lazy"
          className="h-16 w-16 shrink-0 rounded object-cover"
        />
      )}
    </a>
  );
}

export const ChatBubble = memo(({ message }: ChatBubbleProps) => {
  const hue = deriveHueFromUserId(message.userId);
  const textRef = useRef<HTMLParagraphElement>(null);
  // const [showMore, setShowMore] = useState(false);
  const [showShowMore, setShowShowMore] = useState(false);
  const { data: sessionData } = authClient.useSession();
  const userId = sessionData?.user.id;

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
    display = (
      <Component
        formula={message.formula}
        result={message.results}
        messageId={message.id}
      />
    );
  } else if (isCapabilityName(message.rollType)) {
    const { ChatDisplayComponent } = capabilityRegistry[message.rollType];
    if (ChatDisplayComponent && message.results !== null) {
      display = (
        <ChatDisplayComponent
          results={message.results}
          messageId={message.id}
        />
      );
    }
  }

  return (
    <article
      data-is-mine={message.userId === userId ? "" : undefined}
      className="group mb-2 w-full pb-1
        [--user-colour:oklch(var(--bubble-light-l)_var(--bubble-light-c)_var(--user-hue))]
        data-is-mine:text-right
        dark:[--user-colour:oklch(var(--bubble-dark-l)_var(--bubble-dark-c)_var(--user-hue))]"
      style={{ "--user-hue": hue } satisfies UserHueStyle as UserHueStyle}
    >
      <header className="text-sm">
        <span className="mr-4">{message.displayName}</span>
        <TimeDisplay timeStamp={message.createdTime} />
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
            {message.linkPreview && (
              <LinkPreviewCard preview={message.linkPreview} />
            )}
          </>
        )}
        <RollResultErrorBoundary>{display}</RollResultErrorBoundary>
      </div>
    </article>
  );
});

ChatBubble.displayName = "ChatBubble";
