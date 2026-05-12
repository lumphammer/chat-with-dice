import {
  HTTP_BAD_REQUEST,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_OK,
  HTTP_PAYLOAD_TOO_LARGE,
  HTTP_UNAUTHORIZED,
} from "#/constants";
import { jsonResponse } from "#/utils/jsonResponse";
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const prerender = false;

const HTTP_NOT_FOUND = 404;
const MAX_THUMBNAIL_BYTES = 1_048_576; // 1 MB
const THUMBNAIL_CONTENT_TYPE = "image/webp";

function getUserDataDO(user: NonNullable<App.Locals["user"]>) {
  if (!user.userDataDOId) {
    return env.USER_DATA_DO.getByName(user.id);
  }
  return env.USER_DATA_DO.get(env.USER_DATA_DO.idFromString(user.userDataDOId));
}

export const GET: APIRoute = async (ctx) => {
  const user = ctx.locals.user;
  if (!user || user.isAnonymous) {
    return jsonResponse({ error: "Unauthorized" }, HTTP_UNAUTHORIZED);
  }

  const bucket = env.PRIVATE_R2;
  if (!bucket) {
    return jsonResponse(
      { error: "Storage not configured" },
      HTTP_INTERNAL_SERVER_ERROR,
    );
  }

  const { nodeId } = ctx.params;
  if (!nodeId) {
    return jsonResponse({ error: "Missing node ID parameter" }, HTTP_NOT_FOUND);
  }

  const node = await getUserDataDO(user).getFile(nodeId);
  const thumbnailR2Key = node.file.thumbnailR2Key;
  if (!thumbnailR2Key) {
    return jsonResponse({ error: "Thumbnail not found" }, HTTP_NOT_FOUND);
  }

  const thumbnail = await bucket.get(thumbnailR2Key);
  if (!thumbnail) {
    return jsonResponse({ error: "Thumbnail not found" }, HTTP_NOT_FOUND);
  }

  const headers = new Headers();
  thumbnail.writeHttpMetadata(headers);
  headers.set("etag", thumbnail.httpEtag);
  headers.set("cache-control", "private, max-age=3600, immutable");
  headers.set("content-disposition", "inline");
  headers.set("content-length", String(thumbnail.size));

  return new Response(thumbnail.body, { headers });
};

export const POST: APIRoute = async (ctx) => {
  const user = ctx.locals.user;
  if (!user || user.isAnonymous) {
    return jsonResponse({ error: "Unauthorized" }, HTTP_UNAUTHORIZED);
  }

  const bucket = env.PRIVATE_R2;
  if (!bucket) {
    return jsonResponse(
      { error: "Storage not configured" },
      HTTP_INTERNAL_SERVER_ERROR,
    );
  }

  const { nodeId } = ctx.params;
  if (!nodeId) {
    return jsonResponse({ error: "Missing node ID parameter" }, HTTP_NOT_FOUND);
  }

  const contentType =
    ctx.request.headers.get("content-type") ?? "application/octet-stream";
  if (contentType !== THUMBNAIL_CONTENT_TYPE) {
    return jsonResponse(
      { error: "Thumbnail must be image/webp" },
      HTTP_BAD_REQUEST,
    );
  }

  const contentLength = ctx.request.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_THUMBNAIL_BYTES) {
    return jsonResponse(
      { error: "Thumbnail must be smaller than 1 MB" },
      HTTP_PAYLOAD_TOO_LARGE,
    );
  }

  if (!ctx.request.body) {
    return jsonResponse(
      { error: "No thumbnail body provided" },
      HTTP_BAD_REQUEST,
    );
  }

  const userDataDO = getUserDataDO(user);
  const node = await userDataDO.getFile(nodeId);
  if (!node.file.contentType.startsWith("image/")) {
    return jsonResponse(
      { error: "Thumbnails are only supported for image files" },
      HTTP_BAD_REQUEST,
    );
  }

  const thumbnailR2Key = `user-file-thumbnails/${user.id}/${nodeId}.webp`;
  const thumbnail = await bucket.put(thumbnailR2Key, ctx.request.body, {
    httpMetadata: { contentType: THUMBNAIL_CONTENT_TYPE },
  });

  if (thumbnail.size > MAX_THUMBNAIL_BYTES) {
    await bucket.delete(thumbnailR2Key);
    return jsonResponse(
      { error: "Thumbnail must be smaller than 1 MB" },
      HTTP_PAYLOAD_TOO_LARGE,
    );
  }

  await userDataDO.markFileThumbnailReady(
    node.id,
    thumbnailR2Key,
    THUMBNAIL_CONTENT_TYPE,
    thumbnail.size,
  );

  return jsonResponse({ ok: true }, HTTP_OK);
};
