export const log = console.log.bind(console, "[UserDataDO]");
export const logError = console.error.bind(console, "[UserDataDO]");

export function isUniqueConstraintError(error: unknown): error is Error {
  return (
    error instanceof Error && error.message.includes("UNIQUE constraint failed")
  );
}

/** List every object under `prefix`, following R2's truncation cursor. */
export async function listAllR2Objects(
  bucket: R2Bucket,
  prefix: string,
): Promise<{ key: string; size: number }[]> {
  const out: { key: string; size: number }[] = [];
  let cursor: string | undefined;
  for (;;) {
    // each page's cursor depends on the previous response, so this is
    // inherently sequential
    // eslint-disable-next-line no-await-in-loop
    const res = await bucket.list({ prefix, cursor, limit: 1000 });
    for (const o of res.objects) {
      out.push({ key: o.key, size: o.size });
    }
    if (!res.truncated) break;
    cursor = res.cursor;
  }
  return out;
}
