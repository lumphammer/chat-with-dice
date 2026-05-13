const BYTES_PER_KIB = 1024;
const KIB_PER_MIB = 1024;

export const TEXT_PREVIEW_SIZE_LIMIT_BYTES = BYTES_PER_KIB * KIB_PER_MIB;

const MARKDOWN_EXTENSIONS = [".md", ".markdown"] as const;

const TEXT_LIKE_APPLICATION_CONTENT_TYPES = new Set([
  "application/json",
  "application/ld+json",
  "application/toml",
  "application/xml",
  "application/yaml",
  "application/x-yaml",
]);

function normalizeContentType(contentType: string) {
  return contentType.split(";")[0]?.trim().toLowerCase() ?? "";
}

function extensionOf(filename: string) {
  const normalizedFilename = filename.toLowerCase();
  return (
    MARKDOWN_EXTENSIONS.find((extension) =>
      normalizedFilename.endsWith(extension),
    ) ?? null
  );
}

export function isMarkdownPreviewable(filename: string, contentType: string) {
  return (
    normalizeContentType(contentType) === "text/markdown" ||
    extensionOf(filename) !== null
  );
}

export function isTextPreviewable(filename: string, contentType: string) {
  const normalizedContentType = normalizeContentType(contentType);

  return (
    isMarkdownPreviewable(filename, normalizedContentType) ||
    normalizedContentType.startsWith("text/") ||
    TEXT_LIKE_APPLICATION_CONTENT_TYPES.has(normalizedContentType) ||
    normalizedContentType.endsWith("+json") ||
    normalizedContentType.endsWith("+xml") ||
    normalizedContentType.endsWith("+yaml")
  );
}
