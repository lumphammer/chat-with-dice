export const logger = {
  log: console.log.bind(console, "[chat-with-dice]"),
  info: console.info.bind(console, "[chat-with-dice]"),
  warn: console.warn.bind(console, "[chat-with-dice]"),
  error: console.error.bind(console, "[chat-with-dice]"),
  debug: console.debug.bind(console, "[chat-with-dice]"),
};
