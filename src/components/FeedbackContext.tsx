import { logger } from "#/utils/logger.ts";
import { createContext, useContext, useMemo } from "react";

export type FeedbackContextValue = {
  onError: (title: string, details?: string) => void;
  onInfo: (title: string, details?: string) => void;
};

const FeedbackContext = createContext<FeedbackContextValue>({
  onError: (title: string, details?: string) => {
    logger.error(title, details);
  },
  onInfo: (title: string, details?: string) => {
    logger.info(title, details);
  },
});

export const useFeedbackContext = () => {
  const { onError, onInfo } = useContext(FeedbackContext);
  const value = useMemo(
    () => ({
      onError: (title: string | Error, details?: string) => {
        onError(typeof title === "string" ? title : title.message, details);
      },
      onInfo: (title: string | Error, details?: string) => {
        onInfo(typeof title === "string" ? title : title.message, details);
      },
    }),
    [onError, onInfo],
  );
  return value;
};

export const FeedbackContextProvider = FeedbackContext.Provider;
