import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const prerender = false;

const HTTP_NOT_FOUND = 404;
const HTTP_UNAUTHORIZED = 401;
const HTTP_INTERNAL_SERVER_ERROR = 500;
const HTTP_RANGE_NOT_SATISFIABLE = 416;
const HTTP_PARTIAL_CONTENT = 206;

type ByteRange =
  | { kind: "full" }
  | { kind: "partial"; offset: number; length: number; end: number }
  | { kind: "unsatisfiable" };

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function parseRange(rangeHeader: string | null, size: number): ByteRange {
  if (!rangeHeader || !rangeHeader.startsWith("bytes=")) {
    return { kind: "full" };
  }

  const range = rangeHeader.slice("bytes=".length).trim();
  if (!range || range.includes(",")) {
    return { kind: "unsatisfiable" };
  }

  const match = /^(\d*)-(\d*)$/.exec(range);
  if (!match) {
    return { kind: "unsatisfiable" };
  }

  const [, startValue, endValue] = match;
  if (!startValue && !endValue) {
    return { kind: "unsatisfiable" };
  }

  if (size === 0) {
    return { kind: "unsatisfiable" };
  }

  if (!startValue) {
    const suffixLength = Number(endValue);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) {
      return { kind: "unsatisfiable" };
    }

    const length = Math.min(suffixLength, size);
    const offset = size - length;
    return {
      kind: "partial",
      offset,
      length,
      end: size - 1,
    };
  }

  const offset = Number(startValue);
  if (!Number.isSafeInteger(offset) || offset >= size) {
    return { kind: "unsatisfiable" };
  }

  const requestedEnd = endValue ? Number(endValue) : size - 1;
  if (!Number.isSafeInteger(requestedEnd) || requestedEnd < offset) {
    return { kind: "unsatisfiable" };
  }

  const end = Math.min(requestedEnd, size - 1);
  return {
    kind: "partial",
    offset,
    length: end - offset + 1,
    end,
  };
}

export const GET: APIRoute = async (ctx) => {
  const user = ctx.locals.user;
  if (!user || user.isAnonymous) {
    return json({ error: "Unauthorized" }, HTTP_UNAUTHORIZED);
  }

  const bucket = env.PRIVATE_R2;
  if (!bucket) {
    return json(
      { error: "Storage not configured" },
      HTTP_INTERNAL_SERVER_ERROR,
    );
  }

  const { nodeId } = ctx.params;
  if (!nodeId) {
    return json({ error: "Missing node ID parameter" }, HTTP_NOT_FOUND);
  }
  if (!user.userDataDOId) {
    return json(
      { error: "User does not have a durable object id" },
      HTTP_NOT_FOUND,
    );
  }

  // here
  const userDataDO = env.USER_DATA_DO.get(
    env.USER_DATA_DO.idFromString(user.userDataDOId),
  );
  const node = await userDataDO.getFile(nodeId);

  const byteRange = parseRange(
    ctx.request.headers.get("range"),
    node.file.sizeBytes,
  );
  if (byteRange.kind === "unsatisfiable") {
    return new Response(null, {
      status: HTTP_RANGE_NOT_SATISFIABLE,
      headers: {
        "accept-ranges": "bytes",
        "content-range": `bytes */${node.file.sizeBytes}`,
      },
    });
  }

  const r2Object = await bucket.get(
    node.file.r2Key,
    byteRange.kind === "partial"
      ? { range: { offset: byteRange.offset, length: byteRange.length } }
      : undefined,
  );
  if (!r2Object) {
    return json({ error: "File not found in storage" }, HTTP_NOT_FOUND);
  }

  const headers = new Headers();
  r2Object.writeHttpMetadata(headers);
  headers.set("etag", r2Object.httpEtag);
  headers.set("accept-ranges", "bytes");
  headers.set("cache-control", "private, max-age=3600, immutable");

  const isInlinePreviewable =
    node.file.contentType.startsWith("image/") ||
    node.file.contentType.startsWith("audio/") ||
    node.file.contentType.startsWith("video/") ||
    node.file.contentType === "application/pdf";
  headers.set(
    "content-disposition",
    isInlinePreviewable ? "inline" : `attachment; filename="${node.name}"`,
  );

  if (byteRange.kind === "partial") {
    headers.set(
      "content-range",
      `bytes ${byteRange.offset}-${byteRange.end}/${node.file.sizeBytes}`,
    );
    headers.set("content-length", String(byteRange.length));
    return new Response(r2Object.body, {
      status: HTTP_PARTIAL_CONTENT,
      headers,
    });
  }

  headers.set("content-length", String(node.file.sizeBytes));
  return new Response(r2Object.body, { headers });
};
