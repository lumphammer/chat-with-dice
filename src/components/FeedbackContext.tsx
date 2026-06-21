import { logger } from "#/utils/logger.ts";
import { createContext, useContext, useMemo, type ReactNode } from "react";

type FeedbackContextValue = {
  onError: (title: ReactNode, details?: ReactNode) => void;
  onWarn: (title: ReactNode, details?: ReactNode) => void;
  onInfo: (title: ReactNode, details?: ReactNode) => void;
};

const FeedbackContext = createContext<FeedbackContextValue>({
  onError: (title: ReactNode, details?: ReactNode) => {
    logger.error(title, details);
    alert("Error: " + (typeof title === "string" ? title : "<ReactNode>"));
  },
  onWarn: (title: ReactNode, details?: ReactNode) => {
    logger.warn(title, details);
    alert("Warning: " + (typeof title === "string" ? title : "<ReactNode>"));
  },
  onInfo: (title: ReactNode, details?: ReactNode) => {
    logger.info(title, details);
    alert("Info: " + (typeof title === "string" ? title : "<ReactNode>"));
  },
});

export const useFeedback = () => {
  const { onError, onInfo, onWarn } = useContext(FeedbackContext);
  const value = useMemo(
    () => ({
      onError: (title: string | Error, details?: string) => {
        onError(typeof title === "string" ? title : title.message, details);
      },
      onInfo: (title: string | Error, details?: string) => {
        onInfo(typeof title === "string" ? title : title.message, details);
      },
      onWarn: (title: string | Error, details?: string) => {
        onWarn(typeof title === "string" ? title : title.message, details);
      },
    }),
    [onError, onInfo, onWarn],
  );
  return value;
};

export const FeedbackProvider = FeedbackContext.Provider;
