import type { APIRoute } from "astro";
import { db } from "#/db";
import { env } from "cloudflare:workers";

export const prerender = false;

const HTTP_NOT_FOUND = 404;
const HTTP_UNAUTHORIZED = 401;
const HTTP_INTERNAL_SERVER_ERROR = 500;

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const GET: APIRoute = async (ctx) => {
  const user = ctx.locals.user;
  if (!user || user.isAnonymous) {
    return json({ error: "Unauthorized" }, HTTP_UNAUTHORIZED);
  }

  const bucket = env.PrivateBucket;
  if (!bucket) {
    return json(
      { error: "Storage not configured" },
      HTTP_INTERNAL_SERVER_ERROR,
    );
  }

  const { nodeId } = ctx.params;
  if (!nodeId) {
    return json({ error: "Missing node ID" }, HTTP_NOT_FOUND);
  }

  const node = await db.query.nodes.findFirst({
    where: {
      id: nodeId,
      owner_user_id: user.id,
      deleted_time: { isNull: true },
    },
    with: {
      file: true,
    },
  });

  if (!node?.file) {
    return json({ error: "File not found" }, HTTP_NOT_FOUND);
  }

  if (!node.file.is_ready) {
    return json({ error: "File is not ready" }, HTTP_NOT_FOUND);
  }

  const r2Object = await bucket.get(node.file.r2_key);
  if (!r2Object) {
    return json({ error: "File not found in storage" }, HTTP_NOT_FOUND);
  }

  const headers = new Headers();
  r2Object.writeHttpMetadata(headers);
  headers.set("etag", r2Object.httpEtag);
  headers.set("cache-control", "private, max-age=3600, immutable");

  const isImage = node.file.content_type.startsWith("image/");
  headers.set(
    "content-disposition",
    isImage ? "inline" : `attachment; filename="${node.name}"`,
  );

  return new Response(r2Object.body, { headers });
};
