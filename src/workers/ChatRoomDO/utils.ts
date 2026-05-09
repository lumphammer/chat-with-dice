export const log = console.log.bind(console, "[ChatRoomDO]");
export const logError = console.error.bind(console, "[ChatRoomDO]");

export const isClosingorClosed = (ws: WebSocket) =>
  ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING;

export const isConnectingOrOpen = (ws: WebSocket) =>
  ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN;

export const describeState = (ws: WebSocket) =>
  ws.readyState === WebSocket.CLOSED
    ? "closed"
    : ws.readyState === WebSocket.CLOSING
      ? "closing"
      : ws.readyState === WebSocket.OPEN
        ? "open"
        : "connecting";
