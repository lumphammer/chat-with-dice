import type { APIRoute } from "astro";
import { db } from "#/db";
import { files, nodes } from "#/schemas/chatDB-schema";
import { eq } from "drizzle-orm";
import { env } from "cloudflare:workers";

export const prerender = false;

const MAX_BYTES = 104_857_600; // 100 MB

const HTTP_OK = 200;
const HTTP_BAD_REQUEST = 400;
const HTTP_UNAUTHORIZED = 401;
const HTTP_CONFLICT = 409;
const HTTP_PAYLOAD_TOO_LARGE = 413;
const HTTP_INTERNAL_SERVER_ERROR = 500;

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const POST: APIRoute = async (ctx) => {
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

  const url = new URL(ctx.request.url);
  const filename = url.searchParams.get("filename");
  const contentType = url.searchParams.get("contentType") ?? "application/octet-stream";
  const folderId = url.searchParams.get("folderId");

  const MAX_NAME_LENGTH = 128;
  if (!filename || filename.length > MAX_NAME_LENGTH) {
    return json(
      { error: "Missing or invalid filename" },
      HTTP_BAD_REQUEST,
    );
  }

  const contentLength = ctx.request.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_BYTES) {
    return json(
      { error: "File must be smaller than 100 MB" },
      HTTP_PAYLOAD_TOO_LARGE,
    );
  }

  if (!ctx.request.body) {
    return json({ error: "No file body provided" }, HTTP_BAD_REQUEST);
  }

  const id = crypto.randomUUID();
  const r2Key = `user-files/${user.id}/${id}`;

  // phase 1: insert db records with is_ready = 0
  try {
    await db.batch([
      db.insert(files).values({
        id,
        size_bytes: 0,
        is_ready: 0,
        r2_key: r2Key,
        content_type: contentType,
      }),
      db.insert(nodes).values({
        id,
        name: filename,
        file_id: id,
        owner_user_id: user.id,
        parent_folder_id: folderId,
      }),
    ]);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("UNIQUE constraint failed")
    ) {
      return json(
        { error: "A file with that name already exists in this folder" },
        HTTP_CONFLICT,
      );
    }
    throw error;
  }

  // phase 2: stream to R2
  try {
    const r2Object = await bucket.put(r2Key, ctx.request.body, {
      httpMetadata: { contentType },
    });

    // phase 3: mark as ready
    await db
      .update(files)
      .set({
        is_ready: 1,
        size_bytes: r2Object.size,
      })
      .where(eq(files.id, id));

    return json(
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
    await db.batch([
      db.delete(nodes).where(eq(nodes.id, id)),
      db.delete(files).where(eq(files.id, id)),
    ]);
    throw error;
  }
};
