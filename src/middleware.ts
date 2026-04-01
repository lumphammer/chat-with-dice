import { auth } from "#/auth";
import { magicAnswers } from "./utils/magicAnswers";
import { defineMiddleware, sequence } from "astro:middleware";

const HTTP_SWITCHING_PROTOCOLS = 101;

const log = console.log.bind(console, "[middleware]");

const addPotatoHeader = defineMiddleware(async (context, next) => {
  const response = await next();
  if (response.status === HTTP_SWITCHING_PROTOCOLS) {
    log("websocket - stepping back");
    return response;
  } else {
    log("setting header for", context.request.url);
    // clone the response to avoid "TypeError: Can't modify immutable headers"
    const response2 = new Response(response.body, response);
    response2.headers.set(
      "X-Are-The-Potato-People-Watching",
      magicAnswers[Math.floor(Math.random() * magicAnswers.length)],
    );
    return response2;
  }
});

export const checkSession = defineMiddleware(async (context, next) => {
  const isAuthed = await auth.api.getSession({
    headers: context.request.headers,
  });
  if (isAuthed) {
    context.locals.user = isAuthed.user;
    context.locals.session = isAuthed.session;
  } else {
    context.locals.user = null;
    context.locals.session = null;
  }
  return next();
});

export const onRequest = sequence(addPotatoHeader, checkSession);
