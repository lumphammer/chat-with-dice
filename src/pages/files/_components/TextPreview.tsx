import { formatBytes } from "./formatBytes";
import {
  TEXT_PREVIEW_SIZE_LIMIT_BYTES,
  isMarkdownPreviewable,
} from "./textPreviewTypes";
import quikdown from "quikdown";
import { memo, useEffect, useMemo, useState } from "react";

type TextPreviewProps = {
  contentType: string;
  filename: string;
  sizeBytes: number;
  src: string;
};

type LoadState =
  | { kind: "loading" }
  | { kind: "loaded"; text: string }
  | { kind: "too-large" }
  | { kind: "error"; message: string };

const SKELETON_LINE_COUNT = 12;
const SKELETON_MAX_WIDTH_PERCENT = 95;
const SKELETON_WIDTH_VARIANTS = 5;
const SKELETON_WIDTH_STEP_PERCENT = 8;

function addSafeLinkTargets(html: string): string {
  return html.replace(/<a\b([^>]*?)>/gi, (_match, attrs) => {
    const nextAttrs = /\btarget\s*=/i.test(attrs)
      ? attrs
      : `${attrs} target="_blank"`;
    const attrsWithRel = /\brel\s*=/i.test(nextAttrs)
      ? nextAttrs
      : `${nextAttrs} rel="noopener noreferrer"`;

    return `<a${attrsWithRel}>`;
  });
}

export const TextPreview = memo(
  ({ contentType, filename, sizeBytes, src }: TextPreviewProps) => {
    const [loadState, setLoadState] = useState<LoadState>(() =>
      sizeBytes > TEXT_PREVIEW_SIZE_LIMIT_BYTES
        ? { kind: "too-large" }
        : { kind: "loading" },
    );
    const isMarkdown = isMarkdownPreviewable(filename, contentType);

    useEffect(() => {
      if (sizeBytes > TEXT_PREVIEW_SIZE_LIMIT_BYTES) {
        setLoadState({ kind: "too-large" });
        return;
      }

      const abortController = new AbortController();
      setLoadState({ kind: "loading" });

      void (async () => {
        try {
          const response = await fetch(src, {
            signal: abortController.signal,
          });
          if (!response.ok) {
            throw new Error(`Preview failed with ${response.status}`);
          }

          const text = await response.text();
          setLoadState({ kind: "loaded", text });
        } catch (error) {
          if (abortController.signal.aborted) return;
          setLoadState({
            kind: "error",
            message:
              error instanceof Error ? error.message : "Preview failed to load",
          });
        }
      })();

      return () => abortController.abort();
    }, [sizeBytes, src]);

    const html = useMemo(() => {
      if (!isMarkdown || loadState.kind !== "loaded") return null;
      return addSafeLinkTargets(
        quikdown(loadState.text, { inline_styles: false }),
      );
    }, [isMarkdown, loadState]);

    if (loadState.kind === "too-large") {
      return (
        <div
          className="bg-base-200 flex min-h-0 flex-1 flex-col items-center
            justify-center gap-2 rounded p-8 text-center"
        >
          <p className="font-medium">Preview unavailable</p>
          <p className="text-base-content/60 text-sm">
            Text previews are limited to{" "}
            {formatBytes(TEXT_PREVIEW_SIZE_LIMIT_BYTES)}. This file is{" "}
            {formatBytes(sizeBytes)}.
          </p>
        </div>
      );
    }

    if (loadState.kind === "loading") {
      return (
        <div
          className="bg-base-200 flex min-h-0 flex-1 flex-col gap-3 rounded p-4"
        >
          {Array.from({ length: SKELETON_LINE_COUNT }).map((_, index) => (
            <div
              key={index}
              className="skeleton h-4 rounded"
              style={{
                width: `${
                  SKELETON_MAX_WIDTH_PERCENT -
                  (index % SKELETON_WIDTH_VARIANTS) *
                    SKELETON_WIDTH_STEP_PERCENT
                }%`,
              }}
            />
          ))}
        </div>
      );
    }

    if (loadState.kind === "error") {
      return (
        <div
          className="bg-base-200 flex min-h-0 flex-1 flex-col items-center
            justify-center gap-2 rounded p-8 text-center"
        >
          <p className="font-medium">Preview failed</p>
          <p className="text-base-content/60 text-sm">{loadState.message}</p>
        </div>
      );
    }

    if (html) {
      return (
        <article
          className="prose bg-base-100 min-h-0 max-w-none flex-1 overflow-auto
            rounded p-6"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    }

    return (
      <pre
        className="bg-base-200 min-h-0 flex-1 overflow-auto rounded p-4 text-sm
          whitespace-pre-wrap"
      >
        {loadState.text}
      </pre>
    );
  },
);

TextPreview.displayName = "TextPreview";
