import type { ServerMountedCapability } from "#/capabilities/types";
import type { Broadcaster } from "./Broadcaster";
import type { MessageRepository } from "./MessageRepository";
import type { SessionAttachment } from "./types";

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
    return new Response("Expected WebSocket upgrade", { status: 426 });
  }
  const chatId = URL.parse(request.url)?.searchParams.get("chatId");
  if (!chatId) {
    return new Response("chatId is required", { status: 400 });
  }
  // Create a WebSocket pair (client and server)
  const pair = new WebSocketPair();
  const [client, server] = Object.values(pair);

  // Accept the WebSocket connection using the Hibernation API
  // Unlike server.accept(), this allows the DO to hibernate while
  // keeping the WebSocket connection open
  ctx.acceptWebSocket(server);

  const attachment: SessionAttachment = { chatId };
  server.serializeAttachment(attachment);

  // this is lame, but FF dev tools fails to show ws messages sent immediately
  // when the socket is opened
  // https://bugzilla.mozilla.org/show_bug.cgi?id=1719394
  setTimeout(async () => {
    await broadcaster.sendCatchUp(server, await messageRepository.getRecent());
    await Promise.all(
      capabilities.values().map((mountedCap) => {
        return mountedCap.sendInit(server);
      }),
    );
  }, CATCHUP_DELAY_MS);

  // Return the client WebSocket in the response
  // return new Response("splat", { status: 200 });
  return new Response(null, {
    status: 101,
    webSocket: client,
  });
}
