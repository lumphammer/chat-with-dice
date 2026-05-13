import type { LinkPreview } from "#/validators/webSocketMessageSchemas";
import { extractMetadataFromHtml } from "./extractMetadataFromHtml";
import { parsePreviewableUrl } from "./urlSafety";

const FETCH_TIMEOUT_MS = 2_500;
const MAX_REDIRECTS = 3;
const KIBIBYTE_BYTES = 1024;
const MAX_HTML_KIBIBYTES = 768;
const MAX_HTML_BYTES = MAX_HTML_KIBIBYTES * KIBIBYTE_BYTES;
const MAX_TITLE_LENGTH = 160;
const MAX_DESCRIPTION_LENGTH = 300;
const MAX_SITE_NAME_LENGTH = 80;
const REDIRECT_STATUS_MIN = 300;
const REDIRECT_STATUS_MAX = 400;
const HTML_CONTENT_TYPES = ["text/html", "application/xhtml+xml"];

function firstPresent(
  ...values: Array<string | undefined>
): string | undefined {
  return values.find((value) => value !== undefined && value.trim() !== "");
}

function truncate(
  value: string | undefined,
  maxLength: number,
): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength - 1)}...`
    : normalized;
}

function isHtmlResponse(response: Response): boolean {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  return HTML_CONTENT_TYPES.some((htmlType) => contentType.includes(htmlType));
}

async function readCappedText(response: Response): Promise<string> {
  if (!response.body) return "";

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytesRead = 0;

  while (bytesRead < MAX_HTML_BYTES) {
    // Stream reads are inherently sequential; each read advances the cursor.
    // eslint-disable-next-line no-await-in-loop
    const { done, value } = await reader.read();
    if (done || !value) break;

    const remaining = MAX_HTML_BYTES - bytesRead;
    const chunk =
      value.byteLength > remaining ? value.slice(0, remaining) : value;
    chunks.push(chunk);
    bytesRead += chunk.byteLength;

    if (value.byteLength > remaining) {
      // eslint-disable-next-line no-await-in-loop
      await reader.cancel();
      break;
    }
  }

  return new TextDecoder().decode(
    chunks.length === 1 ? chunks[0] : concatChunks(chunks, bytesRead),
  );
}

function concatChunks(chunks: Uint8Array[], totalLength: number): Uint8Array {
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return combined;
}

function resolvePreviewImage(
  pageUrl: URL,
  imageUrl: string | undefined,
): string | undefined {
  if (!imageUrl) return undefined;
  try {
    const parsed = new URL(imageUrl, pageUrl);
    return parsePreviewableUrl(parsed.toString())?.toString();
  } catch {
    return undefined;
  }
}

function buildPreview(
  previewUrl: URL,
  pageUrl: URL,
  htmlMetadata: Awaited<ReturnType<typeof extractMetadataFromHtml>>,
): LinkPreview | null {
  const title = truncate(
    firstPresent(
      htmlMetadata.meta["og:title"],
      htmlMetadata.meta["twitter:title"],
      htmlMetadata.title,
    ),
    MAX_TITLE_LENGTH,
  );
  if (!title) return null;

  const description = truncate(
    firstPresent(
      htmlMetadata.meta["og:description"],
      htmlMetadata.meta["twitter:description"],
      htmlMetadata.meta.description,
    ),
    MAX_DESCRIPTION_LENGTH,
  );
  const imageUrl = resolvePreviewImage(
    pageUrl,
    firstPresent(
      htmlMetadata.meta["og:image"],
      htmlMetadata.meta["twitter:image"],
    ),
  );
  const siteName = truncate(
    firstPresent(htmlMetadata.meta["og:site_name"], pageUrl.hostname),
    MAX_SITE_NAME_LENGTH,
  );

  return {
    url: previewUrl.toString(),
    title,
    ...(description ? { description } : {}),
    ...(imageUrl ? { imageUrl } : {}),
    ...(siteName ? { siteName } : {}),
  };
}

async function fetchWithRedirects(
  url: URL,
): Promise<{ response: Response; finalUrl: URL } | null> {
  let currentUrl = url;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      // Redirects must be followed one at a time so every target is validated.
      // eslint-disable-next-line no-await-in-loop
      const response = await fetch(currentUrl, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          accept: "text/html,application/xhtml+xml",
          "user-agent": "ChatWithDiceLinkPreview/1.0",
        },
      });

      if (
        response.status >= REDIRECT_STATUS_MIN &&
        response.status < REDIRECT_STATUS_MAX
      ) {
        const location = response.headers.get("location");
        if (!location) return null;

        const nextUrl = parsePreviewableUrl(
          new URL(location, currentUrl).toString(),
        );
        if (!nextUrl) return null;
        currentUrl = nextUrl;
        continue;
      }

      return { response, finalUrl: currentUrl };
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  return null;
}

export async function fetchLinkPreview(url: URL): Promise<LinkPreview | null> {
  const result = await fetchWithRedirects(url);
  if (!result || !result.response.ok || !isHtmlResponse(result.response)) {
    return null;
  }

  const html = await readCappedText(result.response);
  if (!html) return null;

  const metadata = await extractMetadataFromHtml(html);
  return buildPreview(url, result.finalUrl, metadata);
}
