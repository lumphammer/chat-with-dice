const HTML_ENTITY_PATTERN = /&(#x[\da-f]+|#\d+|[a-z][\da-z]+);/gi;
const HEX_RADIX = 16;
const DECIMAL_RADIX = 10;

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  hellip: "...",
  laquo: "«",
  ldquo: "“",
  lsquo: "‘",
  lt: "<",
  mdash: "—",
  nbsp: " ",
  ndash: "–",
  quot: '"',
  raquo: "»",
  rdquo: "”",
  rsquo: "’",
};

function decodeNumericEntity(entity: string): string | null {
  const radix = entity.startsWith("#x") ? HEX_RADIX : DECIMAL_RADIX;
  const numberText =
    radix === HEX_RADIX ? entity.slice("#x".length) : entity.slice("#".length);
  const codePoint = Number.parseInt(numberText, radix);

  if (!Number.isInteger(codePoint)) return null;

  try {
    return String.fromCodePoint(codePoint);
  } catch {
    return null;
  }
}

export function decodeHtmlEntities(value: string): string {
  return value.replace(HTML_ENTITY_PATTERN, (match, entity: string) => {
    const normalized = entity.toLowerCase();

    if (normalized.startsWith("#")) {
      return decodeNumericEntity(normalized) ?? match;
    }

    return NAMED_ENTITIES[normalized] ?? match;
  });
}
