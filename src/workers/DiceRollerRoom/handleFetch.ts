import type { ServerMountedCapability } from "#/capabilities/types";
import type { Broadcaster } from "./Broadcaster";
import type { MessageRepository } from "./MessageRepository";
import type { SessionAttachment } from "./types";
import { log, logError } from "./utils";

const CATCHUP_DELAY_MS = 100;

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
  const chatId = URL.parse(request.url)?.searchParams.get("chatId");
  if (!chatId) {
    logError("chatId was falsy");
    return new Response("chatId is required", { status: 400 });
  }

  const userId = URL.parse(request.url)?.searchParams.get("userId") ?? null;
  if (!userId) {
    logError("userId was falsy");
    return new Response("userId is required", { status: 400 });
  }

  log("Accepting WS fetch request, chatId: ", chatId, "userId: ", userId);

  // Create a WebSocket pair (client and server)
  const pair = new WebSocketPair();
  const [client, server] = Object.values(pair);

  // Accept the WebSocket connection using the Hibernation API
  // Unlike server.accept(), this allows the DO to hibernate while
  // keeping the WebSocket connection open
  ctx.acceptWebSocket(server);

  const attachment: SessionAttachment = { chatId, userId };
  server.serializeAttachment(attachment);

  log("created WS attachment", attachment);
  // this is lame, but FF dev tools fails to show ws messages sent immediately
  // when the socket is opened
  // https://bugzilla.mozilla.org/show_bug.cgi?id=1719394
  setTimeout(async () => {
    const messages = await messageRepository.getRecent();
    log("Sending catchup message count", messages.length);
    broadcaster.sendCatchUp(server, messages);
    for (const capability of capabilities.values()) {
      log("sending init for", capability.name);
      broadcaster.sendCapabilityInit(server, capability);
    }
  }, CATCHUP_DELAY_MS);

  // Return the client WebSocket in the response
  // return new Response("splat", { status: 200 });
  return new Response(null, {
    status: 101,
    webSocket: client,
  });
}
