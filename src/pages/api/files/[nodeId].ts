import type { APIRoute } from "astro";
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

  const r2Object = await bucket.get(node.file.r2Key);
  if (!r2Object) {
    return json({ error: "File not found in storage" }, HTTP_NOT_FOUND);
  }

  const headers = new Headers();
  r2Object.writeHttpMetadata(headers);
  headers.set("etag", r2Object.httpEtag);
  headers.set("cache-control", "private, max-age=3600, immutable");

  const isInlinePreviewable =
    node.file.contentType.startsWith("image/") ||
    node.file.contentType === "application/pdf";
  headers.set(
    "content-disposition",
    isInlinePreviewable ? "inline" : `attachment; filename="${node.name}"`,
  );

  return new Response(r2Object.body, { headers });
};
