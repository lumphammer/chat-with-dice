// copied from https://github.com/fabiospampinato/tiny-jsonc/blob/bb722089210174ec9cb53afcce15245e7ee21b9a/src/index.ts
export function parseJSONC(text: string): any {
  const stringOrCommentRe = /("(?:\\?[^])*?")|(\/\/.*)|(\/\*[^]*?\*\/)/g;
  const stringOrTrailingCommaRe = /("(?:\\?[^])*?")|(,\s*)(?=]|})/g;
  const stripped = text
    .replace(stringOrCommentRe, "$1")
    .replace(stringOrTrailingCommaRe, "$1");
  return JSON.parse(stripped);
}
