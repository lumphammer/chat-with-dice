import { auth } from "#/auth";
import handler from "@astrojs/cloudflare/entrypoints/server";

export { ChatRoomDO } from "./ChatRoomDO/ChatRoomDO";

const HTTP_SWITCHING_PROTOCOLS = 101;

/**
 * branded log helper
 */
// const log = console.log.bind(console, "[worker]");

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
 * Middleware to only allow admins into the sysadmin area
 * See also `assets.run_worker_first` in wrangler.jsonc, where /sysadmin should
 * also be listed, to ensure the worker gets a chance to kick in even for
 * static requests.
 */
const checkSysAdminCredentials = (get404: () => Promise<Response>) =>
  defineMiddleware(async (request, next) => {
    const url = URL.parse(request.url);
    if (!url || !url.pathname.startsWith("/sysadmin")) {
      return next();
    }
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    if (session && session.user.role === "admin") {
      return next();
    }
    return get404();
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
  // otherwise we use the assets binding to fetch the 404 page,
  // and set the status to 404.
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
      checkSysAdminCredentials(() => get404(env)),
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
