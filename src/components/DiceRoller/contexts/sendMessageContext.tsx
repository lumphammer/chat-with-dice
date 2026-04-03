import type { WebSocketClientMessage } from "#/validators/webSocketMessageSchemas";
import { createContext, useContext } from "react";

const sendMessageContext = createContext<
  ((content: WebSocketClientMessage) => void) | null
>(null);

export const SendMessageContextProvider = ({
  children,
  value,
}: {
  children: React.ReactNode;
  value: (content: WebSocketClientMessage) => void;
}) => {
  return (
    <sendMessageContext.Provider value={value}>
      {children}
    </sendMessageContext.Provider>
  );
};

export const useSendMessageContext = () => {
  const context = useContext(sendMessageContext);
  if (context === null) {
    throw new Error(
      "useSendMessageContext must be used within a SendMessageContextProvider",
    );
  }
  return context;
};
