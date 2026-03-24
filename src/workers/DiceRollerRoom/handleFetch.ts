import type { Broadcaster } from "./Broadcaster";
import type { MessageRepository } from "./MessageRepository";
import type { SessionAttachment } from "./types";

export async function handleFetch(
  request: Request,
  ctx: DurableObjectState,
  messageRepository: MessageRepository,
  broadcaster: Broadcaster,
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

  await broadcaster.sendCatchUp(server, await messageRepository.getRecent());

  // Return the client WebSocket in the response
  // return new Response("splat", { status: 200 });
  return new Response(null, {
    status: 101,
    webSocket: client,
  });
}
