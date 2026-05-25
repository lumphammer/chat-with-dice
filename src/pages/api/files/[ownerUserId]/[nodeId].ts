import { resolveOwnerUserDataDOForRead } from "#/utils/resolveOwnerUserDataDO";
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const prerender = false;

const HTTP_NOT_FOUND = 404;
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
  const bucket = env.PRIVATE_R2;
  if (!bucket) {
    return json(
      { error: "Storage not configured" },
      HTTP_INTERNAL_SERVER_ERROR,
    );
  }

  const { ownerUserId, nodeId } = ctx.params;
  if (!ownerUserId) {
    return json({ error: "Missing owner user id parameter" }, HTTP_NOT_FOUND);
  }
  if (!nodeId) {
    return json({ error: "Missing node ID parameter" }, HTTP_NOT_FOUND);
  }

  const resolved = await resolveOwnerUserDataDOForRead(
    ctx,
    ownerUserId,
    nodeId,
  );
  if (!resolved.ok) return resolved.response;

  const nodeResult = await resolved.ownerUserDataDO.getFile(nodeId);

  if (nodeResult.result === "not_found" || !nodeResult.data?.file) {
    return json({ error: "File not found" }, HTTP_NOT_FOUND);
  }

  const byteRange = parseRange(
    ctx.request.headers.get("range"),
    nodeResult.data.file.sizeBytes,
  );
  if (byteRange.kind === "unsatisfiable") {
    return new Response(null, {
      status: HTTP_RANGE_NOT_SATISFIABLE,
      headers: {
        "accept-ranges": "bytes",
        "content-range": `bytes */${nodeResult.data.file.sizeBytes}`,
      },
    });
  }

  const r2Object = await bucket.get(
    nodeResult.data.file.r2Key,
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
    nodeResult.data.file.contentType.startsWith("image/") ||
    nodeResult.data.file.contentType.startsWith("audio/") ||
    nodeResult.data.file.contentType.startsWith("video/") ||
    nodeResult.data.file.contentType === "application/pdf";
  headers.set(
    "content-disposition",
    isInlinePreviewable
      ? "inline"
      : `attachment; filename="${nodeResult.data.name}"`,
  );

  if (byteRange.kind === "partial") {
    headers.set(
      "content-range",
      `bytes ${byteRange.offset}-${byteRange.end}/${nodeResult.data.file.sizeBytes}`,
    );
    headers.set("content-length", String(byteRange.length));
    return new Response(r2Object.body, {
      status: HTTP_PARTIAL_CONTENT,
      headers,
    });
  }

  headers.set("content-length", String(nodeResult.data.file.sizeBytes));
  return new Response(r2Object.body, { headers });
};
