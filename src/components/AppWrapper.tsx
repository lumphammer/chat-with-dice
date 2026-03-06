import { ErrorBoundary } from "./ErrorBoundary";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRef, type PropsWithChildren } from "react";

export const AppWrapper = ({ children }: PropsWithChildren) => {
  const queryClientRef = useRef(new QueryClient());

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClientRef.current}>
        {children}
      </QueryClientProvider>
    </ErrorBoundary>
  );
};
