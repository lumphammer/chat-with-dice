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

const MAX_BYTES = 104_857_600; // 100 MB

export const POST: APIRoute = async (ctx) => {
  console.log("POST to upload");
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

  const url = new URL(ctx.request.url);
  const filename = url.searchParams.get("filename");
  const contentType =
    url.searchParams.get("contentType") ?? "application/octet-stream";
  const folderId = url.searchParams.get("folderId");

  const MAX_NAME_LENGTH = 128;
  if (!filename || filename.length > MAX_NAME_LENGTH) {
    return jsonResponse(
      { error: "Missing or invalid filename" },
      HTTP_BAD_REQUEST,
    );
  }

  const contentLength = ctx.request.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_BYTES) {
    return jsonResponse(
      { error: "File must be smaller than 100 MB" },
      HTTP_PAYLOAD_TOO_LARGE,
    );
  }

  if (!ctx.request.body) {
    return jsonResponse({ error: "No file body provided" }, HTTP_BAD_REQUEST);
  }

  // phase 1: insert db records with is_ready = 0
  const userDataDO = env.USER_DATA_DO.getByName(user.id);
  const { id, r2Key } = await userDataDO.createFile(
    filename,
    contentType,
    folderId,
  );

  // phase 2: stream to R2
  try {
    const r2Object = await bucket.put(r2Key, ctx.request.body, {
      httpMetadata: { contentType },
    });

    // verify actual size after upload (Content-Length may be absent/spoofed)
    if (r2Object.size > MAX_BYTES) {
      await bucket.delete(r2Key);
      await userDataDO.hardDeleteNode(id);
      return jsonResponse(
        { error: "File must be smaller than 100 MB" },
        HTTP_PAYLOAD_TOO_LARGE,
      );
    }

    // phase 3: mark as ready + update ancestor folder sizes
    userDataDO.markFileReady(id, r2Object.size);
    return jsonResponse(
      {
        id,
        name: filename,
        contentType,
        sizeBytes: r2Object.size,
      },
      HTTP_OK,
    );
  } catch (error) {
    // clean up db records on R2 failure
    await userDataDO.hardDeleteNode(id);
    throw error;
  }
};
