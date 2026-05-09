import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const prerender = false;

const HTTP_NOT_FOUND = 404;
const HTTP_BAD_REQUEST = 400;
const HTTP_INTERNAL_SERVER_ERROR = 500;

export const GET: APIRoute = async ({ params }) => {
  if (!import.meta.env.DEV) {
    return new Response("Not Found", { status: HTTP_NOT_FOUND });
  }

  const key = params.key;
  if (!key) {
    return new Response("Bad Request", { status: HTTP_BAD_REQUEST });
  }

  const bucket = env.PUBLIC_R2;
  if (!bucket) {
    return new Response("Storage not configured", {
      status: HTTP_INTERNAL_SERVER_ERROR,
    });
  }

  const object = await bucket.get(key);
  if (!object) {
    return new Response("Not Found", { status: HTTP_NOT_FOUND });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);

  return new Response(object.body, { headers });
};
