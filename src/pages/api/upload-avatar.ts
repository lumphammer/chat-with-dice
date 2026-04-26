import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const prerender = false;

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const MAX_BYTES = 5_242_880; // 5 MB — generous upper bound; client resizes first

const BUCKET_PUBLIC_URL = import.meta.env.DEV
  ? "/api/r2"
  : env.BUCKET_PUBLIC_URL;

const HTTP_OK = 200;
const HTTP_BAD_REQUEST = 400;
const HTTP_UNAUTHORIZED = 401;
const HTTP_INTERNAL_SERVER_ERROR = 500;

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const POST: APIRoute = async (ctx) => {
  const user = ctx.locals.user;
  if (!user) {
    return json({ error: "Unauthorized" }, HTTP_UNAUTHORIZED);
  }

  const bucket = env.ChatWithDiceBucket;
  if (!bucket) {
    return json(
      { error: "Storage not configured" },
      HTTP_INTERNAL_SERVER_ERROR,
    );
  }

  let formData: FormData;
  try {
    formData = await ctx.request.formData();
  } catch {
    return json({ error: "Invalid request body" }, HTTP_BAD_REQUEST);
  }

  const file = formData.get("image");

  if (!(file instanceof File)) {
    return json({ error: "No image provided" }, HTTP_BAD_REQUEST);
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return json(
      { error: "Only JPEG, PNG, and WebP images are allowed" },
      HTTP_BAD_REQUEST,
    );
  }

  if (file.size > MAX_BYTES) {
    return json({ error: "Image must be smaller than 5 MB" }, HTTP_BAD_REQUEST);
  }

  const key = `avatars/${user.id}`;

  await bucket.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  });

  const imageUrl = `${BUCKET_PUBLIC_URL}/${key}?v=${Date.now()}`;

  return json({ imageUrl }, HTTP_OK);
};
