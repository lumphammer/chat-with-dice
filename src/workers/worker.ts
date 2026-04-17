import { auth } from "#/auth";
import handler from "@astrojs/cloudflare/entrypoints/server";

export { DiceRollerRoom } from "./DiceRollerRoom/DiceRollerRoom";

const HTTP_SWITCHING_PROTOCOLS = 101;

const log = console.log.bind(console, "[worker]");

type Responder = () => Response | Promise<Response>;

type Middleware = (
  req: Request,
  next: Responder,
) => Response | Promise<Response>;

function defineMiddleware(cb: Middleware): Middleware {
  return cb;
}

export const addPTerryHeader = defineMiddleware(async (request, next) => {
  const response = await next();
  if (response.status === HTTP_SWITCHING_PROTOCOLS) {
    log("websocket - stepping back");
    return response;
  } else {
    log("setting header for", request.url);
    // clone the response to avoid "TypeError: Can't modify immutable headers"
    const response2 = new Response(response.body, response);
    response2.headers.set("X-Clacks-Overhead", "GNU Terry Pratchett");
    return response2;
  }
});

const checkSysAdminCredentials = defineMiddleware(async (request, next) => {
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
  return new Response(null, {
    status: 404,
    statusText: "Not found",
  });
});

const middlewares = [checkSysAdminCredentials, addPTerryHeader];

export default {
  async fetch(request, env, ctx) {
    const final = middlewares.reduce<Responder>(
      (next, middleware) => () => middleware(request, next),
      () => handler.fetch(request, env, ctx),
    );

    log("running for", request.url);

    return final();

    // const response = await handler.fetch(request, env, ctx);
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
    // return checkSysAdminCredentials(
    //   request,
    //   addPTerryHeader(request, response),
    // );
  },
  async queue(batch, _env) {
    let messages = JSON.stringify(batch.messages);
    console.log(`consumed from our queue: ${messages}`);
  },
} satisfies ExportedHandler<Env>;
