import {
  type PropsWithChildren,
  createContext,
  memo,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type OpenSharedFolderRequest = {
  ownerUserId: string;
  folderId: string;
  folderName: string;
};

export type SharedFolderOpenRequest = OpenSharedFolderRequest & {
  requestId: number;
};

type RoomUiNavigationContextValue = {
  sharedFolderOpenRequest: SharedFolderOpenRequest | null;
  openSharedFolder: (request: OpenSharedFolderRequest) => void;
};

const RoomUiNavigationContext =
  createContext<RoomUiNavigationContextValue | null>(null);

export const RoomUiNavigationContextProvider = memo(
  ({ children }: PropsWithChildren) => {
    const [sharedFolderOpenRequest, setSharedFolderOpenRequest] =
      useState<SharedFolderOpenRequest | null>(null);

    const openSharedFolder = useCallback((request: OpenSharedFolderRequest) => {
      setSharedFolderOpenRequest((previous) => ({
        ...request,
        requestId: (previous?.requestId ?? 0) + 1,
      }));
    }, []);

    const value = useMemo(
      () => ({ sharedFolderOpenRequest, openSharedFolder }),
      [openSharedFolder, sharedFolderOpenRequest],
    );

    return (
      <RoomUiNavigationContext.Provider value={value}>
        {children}
      </RoomUiNavigationContext.Provider>
    );
  },
);

export const useRoomUiNavigationContext = () => {
  const context = useContext(RoomUiNavigationContext);
  if (!context) {
    throw new Error(
      "useRoomUiNavigationContext must be used within a RoomUiNavigationContextProvider",
    );
  }
  return context;
};
