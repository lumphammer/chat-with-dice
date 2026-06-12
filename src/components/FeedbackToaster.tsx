import { FeedbackContextProvider } from "./FeedbackContext";
import { Toaster, useToaster } from "./Toaster";
import { useCallback, useMemo, type PropsWithChildren } from "react";

export const useFeedbackToasterValue = () => {
  const toaster = useToaster();
  const onError = useCallback(
    (title: string, details?: string) => {
      toaster.error({
        title,
        description: details,
      });
    },
    [toaster],
  );
  const onInfo = useCallback(
    (title: string, details?: string) => {
      toaster.info({
        title,
        description: details,
      });
    },
    [toaster],
  );

  return useMemo(
    () => ({
      toaster,
      feedbackContextValue: { onError, onInfo },
    }),
    [toaster, onError, onInfo],
  );
};

export const FeedbackToasterProvider = ({
  children,
  feedbackToasterValue,
}: PropsWithChildren<{
  feedbackToasterValue: ReturnType<typeof useFeedbackToasterValue>;
}>) => {
  return (
    <FeedbackContextProvider value={feedbackToasterValue.feedbackContextValue}>
      {children}
      <Toaster toaster={feedbackToasterValue.toaster} />
    </FeedbackContextProvider>
  );
};
