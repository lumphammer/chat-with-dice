import { logger } from "#/utils/logger.ts";
import { createContext, useContext } from "react";

const ErrorHandlingContext = createContext((reason: Error | string) => {
  logger.error(reason instanceof Error ? reason.message : reason);
});

export const useErrorHandling = () => {
  return useContext(ErrorHandlingContext);
};

export const ErrorHandlingContextProvider = ErrorHandlingContext.Provider;
