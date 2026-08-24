import { ErrorBoundary } from "./ErrorBoundary";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type PropsWithChildren } from "react";

export const AppWrapper = ({ children }: PropsWithChildren) => {
  // Lazy initial state, not a ref: the client is built once, on first render,
  // rather than on every render only to be thrown away — and reading it is a
  // plain state read rather than a ref access during render.
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ErrorBoundary>
  );
};
