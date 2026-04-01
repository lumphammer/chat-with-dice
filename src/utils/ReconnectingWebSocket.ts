function noop() {}

/**
 * Configuration options for the ReconnectingWebSocket class.
 */
type Options = {
  /**
   * Maximum number of reconnection attempts before giving up
   * @default Infinity
   */
  maxRetries: number;
  /**
   * WebSocket subprotocols to use - can be a single protocol string or array of protocols
   * @default []
   */
  protocols: string | string[];
  /**
   * Delay in milliseconds between reconnection attempts
   * @default 1000
   */
  retryDelay: number;
  /**
   * Callback function triggered when a message is received from the WebSocket
   * @default noop
   */
  onmessage: (event: MessageEvent) => void;
  /**
   * Callback function triggered when the WebSocket connection is opened
   * @default noop
   */
  onopen: (event: Event) => void;
  /**
   * Callback function triggered when the WebSocket connection is closed
   * @default noop
   */
  onclose: (event: CloseEvent) => void;
  /**
   * Callback function triggered when a WebSocket error occurs
   * @default noop
   */
  onerror: (event: Event) => void;
  /**
   * Callback function triggered when a reconnection attempt is made
   * @default noop
   */
  onreconnect: (event: Event) => void;
  /**
   * Callback function triggered when the maximum number of retries is reached
   * @default noop
   */
  onmaxretries: (event: Event) => void;
  /**
   * Call/response pair for keepalives
   * @default ["ping", "pong"]
   */
  keepalivePair: [string, string];
  /**
   * Interval in milliseconds for keepalive messages (0=no keepalives)
   * @default 0
   */
  keepaliveInterval: number;
};

const defaultOptions: Options = {
  maxRetries: Infinity,
  protocols: [],
  retryDelay: 1000,
  onmessage: noop,
  onopen: noop,
  onclose: noop,
  onerror: noop,
  onreconnect: noop,
  onmaxretries: noop,
  keepalivePair: ["ping", "pong"],
  keepaliveInterval: 0,
};
function log(...msgs: any[]) {
  const timestampHMSms = new Date().toLocaleTimeString();
  console.log(timestampHMSms, ...msgs);
}

/**
 * ReconnectingWebSocket is a wrapper around the WebSocket API that
 * automatically reconnects when the connection is lost.
 */
export class ReconnectingWebSocket {
  websocket!: WebSocket;
  options: Options;
  url: string;
  retryCount = 0;
  retryTimer?: ReturnType<typeof setTimeout>;
  keepaliveTimer?: ReturnType<typeof setInterval>;

  constructor(url: string, options: Partial<Options> = {}) {
    this.url = url;
    this.options = { ...defaultOptions, ...options };
    this.open();
  }

  open() {
    this.websocket = new WebSocket(this.url, this.options.protocols);
    this.websocket.addEventListener("message", (event) => {
      if (event.data === this.options.keepalivePair[1]) {
        return;
      }
      this.options.onmessage(event);
    });

    if (this.options.keepaliveInterval > 0) {
      this.keepaliveTimer = setInterval(() => {
        this.websocket.send("ping");
      }, this.options.keepaliveInterval);
    }

    this.websocket.addEventListener("open", (event: Event) => {
      log("WebSocket opened", event);
      this.options.onopen(event);
      this.retryCount = 0;
    });

    this.websocket.addEventListener("close", (event) => {
      log("WebSocket closed", event);
      this.options.onclose(event);
      this.reconnect(event);
    });

    this.websocket.addEventListener("error", (event) => {
      log("WebSocket error", event);
      this.options.onerror(event);
      this.reconnect(event);
    });
  }

  reconnect(event: Event) {
    clearInterval(this.keepaliveTimer);
    this.keepaliveTimer = undefined;
    if (this.retryCount < this.options.maxRetries) {
      if (this.retryTimer) {
        return;
      }
      const delay = 2 ** this.retryCount * this.options.retryDelay;
      this.retryCount += 1;

      log("Waiting to try again", delay);
      this.retryTimer = setTimeout(() => {
        this.retryTimer = undefined;
        this.options.onreconnect(event);
        this.open();
      }, delay);
    } else {
      this.options.onmaxretries(event);
    }
  }

  json(data: any) {
    this.send(JSON.stringify(data));
  }

  send(text: string) {
    this.websocket.send(text);
  }

  close(code?: number, reason?: string) {
    clearTimeout(this.retryTimer);
    clearInterval(this.keepaliveTimer);
    this.retryTimer = undefined;
    this.keepaliveTimer = undefined;
    this.websocket.close(code, reason);
  }
}
