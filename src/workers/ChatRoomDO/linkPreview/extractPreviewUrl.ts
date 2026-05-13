import { parsePreviewableUrl } from "./urlSafety";

const URL_PATTERN = /https?:\/\/[^\s<>()\]]+/gi;

function trimTrailingPunctuation(candidate: string): string {
  return candidate.replace(/[.,;:!?]+$/g, "");
}

function isAngleBracketSuppressed(
  chat: string,
  startIndex: number,
  endIndex: number,
): boolean {
  return chat[startIndex - 1] === "<" && chat[endIndex] === ">";
}

export function extractPreviewUrl(chat: string | null): URL | null {
  if (!chat) return null;

  for (const match of chat.matchAll(URL_PATTERN)) {
    const rawCandidate = match[0];
    const startIndex = match.index ?? 0;
    const candidate = trimTrailingPunctuation(rawCandidate);
    const endIndex = startIndex + candidate.length;

    /*
     * Markdown treats <https://example.com> as an autolink. For chat previews,
     * we use that syntax as an escape hatch: the link remains clickable in the
     * rendered markdown, but it deliberately does not generate a preview card.
     */
    if (isAngleBracketSuppressed(chat, startIndex, endIndex)) {
      continue;
    }

    const url = parsePreviewableUrl(candidate);
    if (url) return url;
  }

  return null;
}
