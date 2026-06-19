import { FeedbackProvider } from "./FeedbackContext";
import { Toaster, useToaster } from "./Toaster";
import { useCallback, useMemo, type PropsWithChildren } from "react";

export const useFeedbackToasterProvider = () => {
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
  const onWarn = useCallback(
    (title: string, details?: string) => {
      toaster.warning({
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
      onError,
      onWarn,
      onInfo,
      toaster,
      feedbackContextValue: { onError, onInfo, onWarn },
    }),
    [toaster, onError, onInfo, onWarn],
  );
};

export const FeedbackToasterProvider = ({
  children,
  feedbackToasterValue,
}: PropsWithChildren<{
  feedbackToasterValue: ReturnType<typeof useFeedbackToasterProvider>;
}>) => {
  return (
    <>
      <FeedbackProvider value={feedbackToasterValue.feedbackContextValue}>
        {children}
      </FeedbackProvider>
      <Toaster toaster={feedbackToasterValue.toaster} />
    </>
  );
};
