import type { ServerMountedCapability } from "#/capabilities/types";
import type { Broadcaster } from "./Broadcaster";
import type { MessageRepository } from "./MessageRepository";
import type { SessionAttachment } from "./types";
import { log, logError } from "./utils";

const CATCHUP_DELAY_MS = 100;

const MAX_ACTIVE_CONNECTIONS = 100;

export async function handleFetch(
  request: Request,
  ctx: DurableObjectState,
  messageRepository: MessageRepository,
  broadcaster: Broadcaster,
  capabilities: Map<string, ServerMountedCapability>,
) {
  const upgradeHeader = request.headers.get("Upgrade");
  if (upgradeHeader !== "websocket") {
    logError("Expected WebSocket upgrade");
    return new Response("Expected WebSocket upgrade", { status: 426 });
  }

  const currentConnectionCount = broadcaster.currentConnectionCount();
  if (currentConnectionCount >= MAX_ACTIVE_CONNECTIONS) {
    logError("Too many active connections");
    return new Response("Too many active connections", { status: 503 });
  }

  const chatId = URL.parse(request.url)?.searchParams.get("chatId");
  if (!chatId) {
    logError("chatId was falsy");
    return new Response("chatId is required", { status: 400 });
  }

  const userId = URL.parse(request.url)?.searchParams.get("userId") ?? null;

  const displayName = URL.parse(request.url)?.searchParams.get("displayName");
  if (!displayName) {
    logError("displayName was falsy");
    return new Response("displayName is required", { status: 400 });
  }

  const image = URL.parse(request.url)?.searchParams.get("image");
  const loggedIn =
    URL.parse(request.url)?.searchParams.get("loggedIn") === "true";

  log("Accepting WS fetch request, chatId: ", chatId, "userId: ", userId);

  // Create a WebSocket pair (client and server)
  const pair = new WebSocketPair();
  const [client, server] = Object.values(pair);

  // Accept the WebSocket connection using the Hibernation API
  // Unlike server.accept(), this allows the DO to hibernate while
  // keeping the WebSocket connection open
  ctx.acceptWebSocket(server);

  // Make sure the liveness-sweep alarm is running. The alarm handler
  // re-schedules itself while sockets remain connected; we only need to kick
  // things off when the DO has no pending alarm (first client, or after the
  // last client left and the sweep wound itself down). A short initial delay
  // lets the brand-new socket actually send its first ping.
  if ((await ctx.storage.getAlarm()) === null) {
    log("Setting initial alarm for stale sweep");
    await ctx.storage.setAlarm(Date.now() + 1_000);
  }

  const attachment: SessionAttachment = {
    chatId,
    userId: userId ?? undefined,
    loggedIn,
    displayName,
    image: image ?? undefined,
  };
  server.serializeAttachment(attachment);

  // this is lame, but FF dev tools fails to show ws messages sent immediately
  // when the socket is opened
  // https://bugzilla.mozilla.org/show_bug.cgi?id=1719394
  setTimeout(async () => {
    const messages = await messageRepository.getRecent();
    log(`Sending ${messages.length} messages to ${displayName} (${userId})`);
    broadcaster.sendCatchUp(server, messages);
    for (const capability of capabilities.values()) {
      log(
        `Sending "${capability.name}" capability state to ${displayName} (${userId})`,
      );
      broadcaster.sendCapabilityInit(server, capability);
    }
    broadcaster.broadcastUsersOnline();
  }, CATCHUP_DELAY_MS);

  // Return the client WebSocket in the response
  // return new Response("splat", { status: 200 });
  return new Response(null, {
    status: 101,
    webSocket: client,
  });
}
