import toastStyles from "./toast.module.css";
import { Portal } from "@ark-ui/react/portal";
import {
  Toast,
  Toaster as ArkToaster,
  createToaster,
} from "@ark-ui/react/toast";
import {
  CircleAlertIcon,
  TriangleAlertIcon,
  CircleCheckIcon,
  InfoIcon,
  XIcon,
} from "lucide-react";
import { useMemo } from "react";

export const useToaster = () => {
  const toaster = useMemo(
    () =>
      createToaster({
        placement: "top",
        overlap: true,
        gap: 8,
        removeDelay: 250,
        max: 10,
        duration: Infinity,
      }),
    [],
  );
  return toaster;
};

const iconMap = {
  success: CircleCheckIcon,
  error: CircleAlertIcon,
  warning: TriangleAlertIcon,
  info: InfoIcon,
};

export const Toaster = ({
  toaster,
}: {
  toaster: ReturnType<typeof createToaster>;
}) => {
  return (
    <Portal>
      <ArkToaster toaster={toaster}>
        {(toast) => {
          const ToastIcon = toast.type
            ? iconMap[toast.type as keyof typeof iconMap]
            : undefined;
          return (
            <Toast.Root key={toast.id} className={`${toastStyles.toast}`}>
              {ToastIcon && (
                <div className={`${toastStyles.icon}`}>
                  <ToastIcon className="h-5 w-5" />
                </div>
              )}
              <Toast.Title className={`${toastStyles.title}`}>
                {toast.title}
              </Toast.Title>
              <Toast.Description className={`${toastStyles.details} text-sm`}>
                {toast.description}
              </Toast.Description>

              <Toast.CloseTrigger
                className={`${toastStyles.close} hover:bg-base-300 mt-0.5
                shrink-0 cursor-pointer rounded-md p-0.5 transition-colors`}
              >
                <XIcon className="h-4 w-4" />
              </Toast.CloseTrigger>
            </Toast.Root>
          );
        }}
      </ArkToaster>
    </Portal>
  );
};
