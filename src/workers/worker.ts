import { auth } from "#/auth/auth.ts";
import { isAdminOrBetter } from "#/utils/roleHelpers.ts";
import handler from "@astrojs/cloudflare/entrypoints/server";

export { ChatRoomDO } from "./ChatRoomDO/ChatRoomDO";
export { UserDataDO } from "./UserDataDO/UserDataDO";

const HTTP_SWITCHING_PROTOCOLS = 101;

/**
 * A function which takes no arguments and returns a Response; this is the type
 * of the core handler, and also the return from the middleware stack.
 */
type Responder = () => Response | Promise<Response>;

/**
 * A middleware function
 */
type Middleware = (
  req: Request,
  next: Responder,
) => Response | Promise<Response>;

/**
 * type helper for creating middleware
 */
function defineMiddleware(cb: Middleware): Middleware {
  return cb;
}

/**
 * Middleware to add the pTerry header
 */
export const addPTerryHeader = () =>
  defineMiddleware(async (_request, next) => {
    const response = await next();
    if (response.status === HTTP_SWITCHING_PROTOCOLS) {
      return response;
    } else {
      // clone the response to avoid "TypeError: Can't modify immutable headers"
      const response2 = new Response(response.body, response);
      response2.headers.set("X-Clacks-Overhead", "GNU Terry Pratchett");
      return response2;
    }
  });

/**
 * Middleware to only allow admins into the admin area
 * See also `assets.run_worker_first` in wrangler.jsonc, where /admin should
 * also be listed, to ensure the worker gets a chance to kick in even for
 * static requests.
 */
const checkAdminCredentials = (get404: () => Promise<Response>) =>
  defineMiddleware(async (request, next) => {
    const url = URL.parse(request.url);
    if (!url || !url.pathname.startsWith("/admin")) {
      return next();
    }
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    if (isAdminOrBetter(session?.user.role)) {
      return next();
    }
    return await get404();
  });

/**
 * conjure up a realistic 404 resopnse
 */
const get404 = async (env: Env) => {
  // if the ASSETS bind is somehow missing, we still try to throw a 404
  if (!env.ASSETS) {
    return new Response("Not found", {
      status: 404,
      statusText: "Not Found",
    });
  }

  // otherwise we use the assets binding to fetch the precompiled 404 page from
  // assets and wrap it in a 404 status code (somehostname is permitted in
  // astro.config.mjs -> vite -> server -> allowedHosts.)
  //
  // NOTE this will not work properly in local dev (there are no static pages,
  // so we get a generic empty 404.)
  const response = await env.ASSETS.fetch("https://somehostname/404");
  const response2 = new Response(response.body, {
    cf: response.cf,
    headers: response.headers,
    status: 404,
    statusText: "Not Found",
  });
  return response2;
};

export default {
  async fetch(request, env, ctx) {
    // astro middleware doesn't run for static assets, even when
    // `assets.run_worker_first` is set in wrangler.jsonc. But we can do
    // middleware-like things here.
    // The astro cloudflare `handler` will deal with static asset requests but
    // bails out early without running middleware.
    //
    // Putting this here means it will run for *anything* where the worker runs,
    // which includes:
    // * server-rendered pages
    // * live endpoints
    // * static assets that are included in `assets.run_worker_first`
    //
    // middlewares are added in order with the actual handler effectively
    // being at the top of the list.
    // In other words, the last item in the list is the first middleware to be
    // called and the last one to return.
    const middlewares = [
      checkAdminCredentials(() => get404(env)),
      addPTerryHeader(),
    ];
    const final = middlewares.reduce<Responder>(
      (next, middleware) => () => middleware(request, next),
      () => handler.fetch(request, env, ctx),
    );

    return final();
  },
  async queue(_batch, _env) {
    // let messages = JSON.stringify(batch.messages);
    // log(`consumed from our queue: ${messages}`);
  },
} satisfies ExportedHandler<Env>;
